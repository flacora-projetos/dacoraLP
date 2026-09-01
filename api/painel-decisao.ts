/**
 * `POST /api/painel-decisao` — o verbo do painel: aprovar ou recusar.
 *
 * É a primeira função deste painel que ESCREVE. Todas as outras leem, e é por
 * isso que aqui a disciplina aparece duas vezes:
 *
 *  • **confere sessão e e-mail por conta própria**, sem confiar em ter sido
 *    chamada pela tela certa — a tela esconder um botão é conforto, não
 *    segurança (§5.5 do registro do painel);
 *  • **quem decidiu vem da SESSÃO, nunca do corpo do pedido.** Se viesse do
 *    navegador, bastaria trocar um campo para a auditoria registrar que outra
 *    pessoa aprovou. A auditoria existe justamente para não guardar ficção.
 *
 * ---------------------------------------------------------------------------
 * A ESCRITA INTEIRA ACONTECE NO BANCO, EM UMA CHAMADA SÓ
 *
 * Este arquivo não faz `UPDATE`. Ele chama `public.decidir_relatorio`, que
 * trava a linha, confere estado e checksum, carimba e devolve o resultado numa
 * transação. Fazer os passos daqui abriria a janela em que o estado já mudou e
 * o carimbo ainda não — e essa janela é exatamente onde nasce um relatório
 * "liberado" sem GO amarrado ao documento.
 *
 * Depois da escrita, a linha é **lida de volta** e conferida coluna a coluna.
 * O read-back nunca recalcula o checksum a partir do `conteudo`: o `jsonb`
 * reordena as chaves e o digest muda, o que reprovaria toda aprovação (§9.6).
 * ---------------------------------------------------------------------------
 */
import type { Request, Response } from 'express';
// A extensão `.js` é OBRIGATÓRIA nos imports relativos de `api/` — a Vercel
// compila cada arquivo para um módulo ESM separado e o Node não completa
// extensão sozinho. Sem ela, todo pedido responde 500 só depois de publicado.
import { conferirAcesso } from './_painel-autorizacao.js';
import {
  conferirLeituraDeVolta,
  ecoDaDecisao,
  lerPedido,
  traduzirRecusaDoBanco,
  type LinhaDecidida,
} from './_painel-decisao-regras.js';
import { conferirEstadoEditorial } from './_painel-estado-editorial.js';

/** O mínimo para montar o eco e registrar a auditoria. `token` fica de fora. */
const COLUNAS_DA_LEITURA = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'checksum',
  'aprovado_por',
  'aprovado_em',
  'aprovado_checksum',
  'recusado_por',
  'recusado_em',
  'recusa_motivo',
  'correcao_ordem_id',
  'correcao_estado',
  'correcao_solicitado_em',
  'correcao_escopo_secoes',
  'correcao_catalog_version',
  'correcao_routing_mode',
  'correcao_causas',
  'notificacao_interna_id',
  'notificacao_interna_estado',
  'notificacao_destino_referencia',
  'enviado_em',
  'substituido_por',
  'revogado_em',
].join(',');

interface LinhaLida extends LinhaDecidida {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
}

interface LinhaParaEstadoEditorial {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  checksum: string;
  /** Nulo em documento anterior à AV1. Nulo é "não medido", nunca "igual". */
  checksum_factual_editorial: string | null;
  estado: string;
  substituido_por: string | null;
  revogado_em: string | null;
  conteudo: any;
}

const COLUNAS_PRE_APROVACAO =
  'id,cliente_slug,competencia,versao,checksum,checksum_factual_editorial,estado,substituido_por,revogado_em,conteudo';

async function conferirProntidaoEditorialParaAprovacao(
  pedido: { id: string; checksumVisto: string },
  config: { urlSupabase: string; chaveDeServico: string },
) {
  const resposta = await fetch(
    `${config.urlSupabase}/rest/v1/relatorios?id=eq.${pedido.id}&select=${COLUNAS_PRE_APROVACAO}&limit=1`,
    { headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` } },
  );
  if (!resposta.ok) throw new Error(`leitura_pre_aprovacao_http_${resposta.status}`);
  const [linha] = (await resposta.json()) as LinhaParaEstadoEditorial[];
  if (!linha) return { ok: false as const, status: 404, erro: 'relatorio_nao_encontrado', mensagem: 'Este relatório não está mais disponível. Volte para a fila.' };
  if (linha.checksum !== pedido.checksumVisto) return { ok: false as const, status: 409, erro: 'checksum_divergente', mensagem: 'Este relatório mudou desde que você o abriu. Recarregue a revisão antes de aprovar.' };
  if (linha.estado !== 'gerado' || linha.substituido_por || linha.revogado_em) return { ok: false as const, status: 409, erro: 'versao_fora_de_revisao', mensagem: 'Esta versão não está mais aberta para revisão.' };
  if (!linha.conteudo || typeof linha.conteudo !== 'object' || !Array.isArray(linha.conteudo.montagem)) {
    return { ok: false as const, status: 422, erro: 'conteudo_incompleto', mensagem: 'O conteúdo desta versão está incompleto e não pode ser aprovado.' };
  }
  const resumo = await conferirEstadoEditorial(
    {
      relatorioId: linha.id,
      checksum: linha.checksum,
      clienteSlug: linha.cliente_slug,
      competencia: linha.competencia,
      versao: linha.versao,
      checksumFactual: linha.checksum_factual_editorial,
    },
    linha.conteudo,
    config,
  );
  if (!resumo.podeAprovar) {
    const titulos = resumo.pendentes.slice(0, 4).map((secao) => secao.titulo);
    const complemento = resumo.pendentes.length > 4 ? ` e mais ${resumo.pendentes.length - 4}` : '';
    return {
      ok: false as const,
      status: 409,
      erro: 'analises_pendentes',
      mensagem: `Ainda há ${resumo.pendentes.length} análise(s) obrigatória(s) para revisar: ${titulos.join(', ')}${complemento}. Revise ou aplique essas análises antes da aprovação.`,
      resumo,
    };
  }
  if (!linha.checksum_factual_editorial) {
    return {
      ok: false as const,
      status: 409,
      erro: 'checksum_factual_indisponivel',
      mensagem: 'Esta versão ainda não possui a impressão factual exigida para o fechamento final. Atualize os dados antes de aprovar.',
      resumo,
    };
  }
  return { ok: true as const, resumo, checksumFactual: linha.checksum_factual_editorial };
}

function corpoDoPedido(req: Request): unknown {
  const bruto = (req as any).body;
  if (typeof bruto === 'string') {
    try {
      return JSON.parse(bruto);
    } catch {
      return null;
    }
  }
  return bruto ?? null;
}

export default async function handler(req: Request, res: Response) {
  // Decisão de cliente nunca fica em cache intermediário.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) {
    // A recusa sai ANTES de qualquer contato com o banco: quem não passa daqui
    // não escreve, não lê e nem sabe que o relatório existe.
    return res.status(acesso.status).json(acesso.corpo);
  }

  const leitura = lerPedido(corpoDoPedido(req));
  if (leitura.ok === false) {
    return res.status(400).json({ erro: leitura.erro, mensagem: leitura.mensagem });
  }
  const pedido = leitura.pedido;

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    // Nunca cair para a chave pública: ela não escreve nada e a tela mostraria
    // uma falha genérica onde o problema é configuração.
    console.error('[painel-decisao] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor do painel ainda não consegue registrar decisões.',
    });
  }

  const cabecalhos = {
    apikey: chaveDeServico,
    Authorization: `Bearer ${chaveDeServico}`,
    'Content-Type': 'application/json',
  };

  const quem = acesso.email;

  try {
    let checksumFactualParaFechamento: string | null = null;
    if (pedido.decisao === 'aprovar') {
      const prontidao = await conferirProntidaoEditorialParaAprovacao(pedido, {
        urlSupabase,
        chaveDeServico,
      });
      if (prontidao.ok === false) {
        return res.status(prontidao.status).json({
          erro: prontidao.erro,
          mensagem: prontidao.mensagem,
          gravado: false,
          revisaoEditorial: 'resumo' in prontidao ? prontidao.resumo : undefined,
        });
      }
      checksumFactualParaFechamento = prontidao.checksumFactual;
    }

    /* 1. Decisão final. Aprovar também fecha editorialmente, dentro da MESMA
       transação do banco; a recusa escopada preserva o circuito P3/P4. ------- */
    const endpointDaDecisao = pedido.decisao === 'aprovar'
      ? 'aprovar_e_fechar_relatorio_editorial'
      : 'decidir_relatorio_com_causas_v1';
    const corpoDaDecisao = pedido.decisao === 'aprovar'
      ? {
          p_relatorio_id: pedido.id,
          p_checksum_documento_visto: pedido.checksumVisto,
          p_checksum_factual_visto: checksumFactualParaFechamento,
          p_quem: quem,
        }
      : {
          p_relatorio_id: pedido.id,
          p_checksum_visto: pedido.checksumVisto,
          p_quem: quem,
          p_motivo: pedido.motivo,
          p_catalog_version: pedido.catalogVersion,
          p_causas: pedido.causas?.map((causa) => ({
            cause_id: causa.causeId,
            parameters: causa.parameters,
          })),
        };
    const respostaDecisao = await fetch(`${urlSupabase}/rest/v1/rpc/${endpointDaDecisao}`, {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify(corpoDaDecisao),
    });

    if (!respostaDecisao.ok) {
      const textoDoErro = await respostaDecisao.text();
      const traduzida = traduzirRecusaDoBanco(textoDoErro);
      // O texto cru vai só para o log do servidor: ele pode conter detalhe de
      // linha, e a tela não precisa dele para explicar o que aconteceu.
      console.warn(
        `[painel-decisao] ${pedido.decisao} recusada para ${pedido.id} (${traduzida.erro}).`,
      );
      return res.status(traduzida.status).json({
        erro: traduzida.erro,
        mensagem: traduzida.mensagem,
        gravado: false,
      });
    }

    const retorno = (await respostaDecisao.json()) as Array<{ ja_estava_assim?: boolean }>;
    const jaEstavaAssim = Array.isArray(retorno) ? Boolean(retorno[0]?.ja_estava_assim) : false;

    /* 2. Read-back — a decisão vale quando o banco a confirma. -------------- */
    const respostaLeitura = await fetch(
      `${urlSupabase}/rest/v1/painel_relatorios_com_correcao?id=eq.${pedido.id}&select=${COLUNAS_DA_LEITURA}&limit=1`,
      { headers: cabecalhos },
    );
    if (!respostaLeitura.ok) {
      throw new Error(`leitura de volta: HTTP ${respostaLeitura.status}`);
    }
    const [linha] = (await respostaLeitura.json()) as LinhaLida[];

    const conferencia = conferirLeituraDeVolta(linha, pedido, quem);
    if (conferencia.ok === false) {
      console.error(
        `[painel-decisao] Read-back reprovou ${pedido.id}: ${conferencia.motivo}.`,
      );
      return res.status(502).json({
        erro: 'read_back_reprovado',
        mensagem:
          'A decisão foi enviada, mas a conferência de volta não bateu: ' +
          `${conferencia.motivo}. Recarregue a revisão antes de tentar de novo — ` +
          'nada aqui deve ser tratado como registrado.',
        gravado: false,
      });
    }

    /* 3. Auditoria. --------------------------------------------------------- */
    const eco = ecoDaDecisao({
      decisao: pedido.decisao,
      clienteNome: linha.cliente_slug,
      competencia: linha.competencia,
      versao: linha.versao,
      checksum: linha.checksum,
      quem,
      motivo: pedido.motivo,
      escopoSecoes: pedido.escopoSecoes,
    });
    // Sem token, sem conteúdo e sem o motivo inteiro: o log diz o que foi
    // decidido e por quem, não republica o documento.
    console.log(
      `[painel-decisao] ${pedido.decisao} · ${linha.cliente_slug} ${linha.competencia} v${linha.versao} · ` +
        `por ${quem} · ${jaEstavaAssim ? 'repetição da mesma decisão' : 'gravada'}`,
    );

    return res.status(200).json({
      gravado: true,
      jaEstavaAssim,
      eco,
      relatorio: {
        id: linha.id,
        estado: linha.estado,
        checksum: linha.checksum,
        aprovadoPor: linha.aprovado_por,
        aprovadoEm: linha.aprovado_em,
        recusadoPor: linha.recusado_por,
        recusadoEm: linha.recusado_em,
        recusaMotivo: linha.recusa_motivo,
        correcao: linha.correcao_ordem_id
          ? {
              id: linha.correcao_ordem_id,
              estado: linha.correcao_estado,
              solicitadoEm: linha.correcao_solicitado_em,
              escopoSecoes: linha.correcao_escopo_secoes ?? ['relatorio_inteiro'],
            }
          : null,
        notificacaoInterna: linha.notificacao_interna_id
          ? {
              id: linha.notificacao_interna_id,
              estado: linha.notificacao_interna_estado,
              destinoReferencia: linha.notificacao_destino_referencia,
            }
          : null,
      },
    });
  } catch (erro) {
    console.error(
      '[painel-decisao] Falha ao registrar a decisão:',
      erro instanceof Error ? erro.message : erro,
    );
    return res.status(502).json({
      erro: 'decisao_indisponivel',
      mensagem:
        'Não foi possível registrar a decisão agora. Recarregue a revisão para ver o estado atual ' +
        'antes de tentar de novo.',
      gravado: false,
    });
  }
}
