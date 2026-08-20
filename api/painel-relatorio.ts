/**
 * `GET /api/painel-relatorio?id=<uuid>` — o documento completo para revisão.
 *
 * O snapshot sai apenas depois de sessão + e-mail passarem no servidor. A
 * coluna `token` não é consultada: a P2 abre o relatório dentro da bancada e
 * não precisa da credencial pública do cliente.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';
import { montarItem, type LinhaDoBanco } from './_painel-fila-dados.js';
import { resolverMiniaturasPrivadas } from './_miniaturas-relatorio.js';
import { resolverAudiosPrivados } from './_audios-relatorio.js';
import { conferirEstadoEditorial, resumoEditorialIndisponivel } from './_painel-estado-editorial.js';
import { compararSecoesRecusadas } from './_painel-diff-secoes.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COLUNAS = [
  'id',
  'cliente_slug',
  'competencia',
  'versao',
  'estado',
  'gerado_em',
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
  'correcao_iniciado_em',
  'correcao_erro_codigo',
  'correcao_nova_versao_relatorio_id',
  'correcao_nova_versao',
  'correcao_eh_nova_versao',
  'correcao_escopo_secoes',
  'notificacao_interna_id',
  'notificacao_interna_estado',
  'notificacao_destino_referencia',
  'enviado_em',
  'enviado_para',
  'substituido_por',
  'revogado_em',
  'conteudo',
].join(',');

interface LinhaDoRelatorio extends LinhaDoBanco {
  checksum: string;
  aprovado_checksum: string | null;
  revogado_em?: string | null;
}

async function diffDaRecusa(linha: LinhaDoRelatorio, config: { urlSupabase: string; chaveDeServico: string }) {
  if (!linha.correcao_eh_nova_versao || !linha.correcao_ordem_id) return null;
  try {
    const cabecalhos = { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` };
    const ordemResposta = await fetch(`${config.urlSupabase}/rest/v1/relatorio_ordens_correcao?id=eq.${encodeURIComponent(linha.correcao_ordem_id)}&select=relatorio_id,escopo_secoes&limit=1`, { headers: cabecalhos });
    if (!ordemResposta.ok) return { disponivel: false as const };
    const [ordem] = await ordemResposta.json() as Array<{ relatorio_id?: string; escopo_secoes?: string[] }>;
    if (!ordem?.relatorio_id || !Array.isArray(ordem.escopo_secoes)) return { disponivel: false as const };
    const anteriorResposta = await fetch(`${config.urlSupabase}/rest/v1/relatorios?id=eq.${encodeURIComponent(ordem.relatorio_id)}&select=conteudo&limit=1`, { headers: cabecalhos });
    if (!anteriorResposta.ok) return { disponivel: false as const };
    const [anterior] = await anteriorResposta.json() as Array<{ conteudo?: unknown }>;
    const secoes = ordem.escopo_secoes[0] === 'relatorio_inteiro'
      ? ['introducao', ...(Array.isArray((linha.conteudo as any)?.montagem) ? (linha.conteudo as any).montagem.map((bloco: any) => `bloco:${bloco.id}`) : [])]
      : ordem.escopo_secoes;
    const secoesComparadas = compararSecoesRecusadas(anterior?.conteudo, linha.conteudo, secoes);
    return secoesComparadas ? { disponivel: true as const, secoes: secoesComparadas } : { disponivel: false as const };
  } catch { return { disponivel: false as const }; }
}

export function montarRelatorioParaRevisao(linha: LinhaDoRelatorio) {
  if (!linha.conteudo || typeof linha.conteudo !== 'object') return null;
  if (!linha.gerado_em || !linha.checksum) return null;
  if (!Number.isSafeInteger(linha.versao) || linha.versao < 1) return null;
  const identidade = (linha.conteudo as any).identidade;
  const montagem = (linha.conteudo as any).montagem;
  if (!identidade || !Array.isArray(montagem)) return null;

  const item = montarItem(linha);
  return {
    id: linha.id,
    clienteNome: item.clienteNome,
    competencia: linha.competencia,
    versao: linha.versao,
    estado: item.estado,
    sinais: item.sinais,
    /**
     * O checksum vem da COLUNA persistida e viaja até a tela, porque é ele que
     * a decisão devolve como "o documento que eu li".
     *
     * ⚠️ Nunca recalculado a partir do `conteudo`: o `jsonb` reordena as chaves
     * do objeto, o digest muda, e a comparação reprovaria toda aprovação, para
     * sempre. §9.6 do registro do painel guarda o caso real.
     */
    checksum: linha.checksum,
    /**
     * Se esta versão ainda comporta decisão. Quem manda continua sendo o banco
     * — isto é o que permite à tela explicar o motivo em vez de oferecer um
     * botão que vai falhar.
     */
    podeDecidir:
      linha.estado === 'gerado' && !linha.substituido_por && !linha.revogado_em,
    aprovadoPor: linha.aprovado_por,
    aprovadoEm: linha.aprovado_em,
    recusadoPor: item.recusadoPor,
    recusadoEm: item.recusadoEm,
    recusaMotivo: item.recusaMotivo,
    correcao: item.correcao,
    notificacaoInterna: item.notificacaoInterna,
    conteudoCarregado: true as const,
    snapshot: {
      ...linha.conteudo,
      publicacao: {
        estado: linha.estado,
        versao: linha.versao,
        checksum: linha.checksum,
        geradoEm: linha.gerado_em,
        aprovadoPor: linha.aprovado_por,
        aprovadoEm: linha.aprovado_em,
        enviadoEm: linha.enviado_em,
        substituiVersao: null,
      },
    },
  };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!UUID_VALIDO.test(id)) {
    return res.status(400).json({
      erro: 'relatorio_invalido',
      mensagem: 'O endereço desta revisão está incompleto. Volte para a fila e abra o relatório de novo.',
    });
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    console.error('[painel-relatorio] Falta SUPABASE_SERVICE_ROLE_KEY (ou a URL) no ambiente.');
    return res.status(500).json({
      erro: 'sem_chave_de_servico',
      mensagem: 'O servidor do painel ainda não consegue ler este relatório.',
    });
  }

  try {
    const resposta = await fetch(
      `${urlSupabase}/rest/v1/painel_relatorios_com_correcao?id=eq.${id}&select=${COLUNAS}&limit=1`,
      {
        headers: {
          apikey: chaveDeServico,
          Authorization: `Bearer ${chaveDeServico}`,
        },
      },
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} — ${await resposta.text()}`);

    const [linha] = (await resposta.json()) as LinhaDoRelatorio[];
    if (!linha) {
      return res.status(404).json({
        erro: 'relatorio_nao_encontrado',
        mensagem: 'Este relatório não está mais disponível. Volte para a fila e escolha outra versão.',
      });
    }

    const relatorioBase = montarRelatorioParaRevisao(linha);
    if (!relatorioBase) {
      return res.status(422).json({
        erro: 'conteudo_incompleto',
        mensagem: 'O relatório existe, mas o conteúdo não chegou inteiro. Ele não pode ser revisado.',
      });
    }

    let revisaoEditorial;
    try {
      revisaoEditorial = await conferirEstadoEditorial(
        {
          relatorioId: linha.id,
          checksum: linha.checksum,
          clienteSlug: linha.cliente_slug,
          competencia: linha.competencia,
          versao: linha.versao,
          /* A view `painel_relatorios_com_correcao` não expõe
             `checksum_factual_editorial` — ela é anterior à AV1, e ampliá-la
             seria migration, fora do escopo desta fase. Sem esse campo, a
             conferência extra de impressão digital divergente não roda AQUI;
             ela roda no portão que decide, `painel-decisao.ts`, que lê
             `relatorios` direto. A consequência está registrada no handoff:
             nesta janela rara a tela pode mostrar "pronta" e a aprovação ainda
             assim recusar — desconfortável, nunca permissivo. */
          checksumFactual: null,
        },
        relatorioBase.snapshot,
        { urlSupabase, chaveDeServico },
      );
    } catch (erro) {
      console.warn(
        '[painel-relatorio] Estado editorial indisponível:',
        erro instanceof Error ? erro.message : erro,
      );
      revisaoEditorial = resumoEditorialIndisponivel(
        'Não foi possível conferir as análises agora. A aprovação fica protegida até a revisão ser recarregada.',
      );
    }

    const relatorio = { ...relatorioBase, revisaoEditorial, diffDaRecusa: await diffDaRecusa(linha, { urlSupabase, chaveDeServico }) };
    relatorio.snapshot = await resolverMiniaturasPrivadas(
      relatorio.snapshot,
      { clienteSlug: linha.cliente_slug, competencia: linha.competencia },
      { urlSupabase, chaveDeServico },
    );
    relatorio.snapshot = await resolverAudiosPrivados(
      relatorio.snapshot,
      {
        clienteSlug: linha.cliente_slug,
        competencia: linha.competencia,
        versao: linha.versao,
      },
      { urlSupabase, chaveDeServico },
    );

    return res.status(200).json({ relatorio });
  } catch (erro) {
    console.error(
      '[painel-relatorio] Falha ao ler o relatório:',
      erro instanceof Error ? erro.message : erro,
    );
    return res.status(502).json({
      erro: 'leitura_indisponivel',
      mensagem: 'Não foi possível carregar este relatório agora. Tente novamente em instantes.',
    });
  }
}
