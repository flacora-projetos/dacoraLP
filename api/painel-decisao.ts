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
  checksum: string;
  estado: string;
  substituido_por: string | null;
  revogado_em: string | null;
  conteudo: any;
}

async function conferirProntidaoEditorialParaAprovacao(
  pedido: { id: string; checksumVisto: string },
  config: { urlSupabase: string; chaveDeServico: string },
) {
  const resposta = await fetch(
    `${config.urlSupabase}/rest/v1/relatorios?id=eq.${pedido.id}&select=id,checksum,estado,substituido_por,revogado_em,conteudo&limit=1`,
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
    linha.id,
    linha.checksum,
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
  return { ok: true as const, resumo };
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
    }

    /* 1. A decisão, numa transação do banco. ------------------------------- */
    const respostaDecisao = await fetch(`${urlSupabase}/rest/v1/rpc/decidir_relatorio`, {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({
        p_relatorio_id: pedido.id,
        p_decisao: pedido.decisao,
        p_checksum_visto: pedido.checksumVisto,
        p_quem: quem,
        p_motivo: pedido.decisao === 'recusar' ? pedido.motivo : null,
      }),
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
