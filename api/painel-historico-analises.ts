/**
 * `GET /api/painel-historico-analises?id=<uuid>` — linha do tempo editorial AV3.
 *
 * Exclusivamente interna: repete sessão + allow-list antes de qualquer leitura
 * e resolve cliente/competência/versão a partir do `id` do relatório no banco.
 * O navegador nunca escolhe a identidade que será consultada.
 */
import type { Request, Response } from 'express';
import { conferirAcesso } from './_painel-autorizacao.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface IdentidadeDoRelatorio {
  cliente_slug: string;
  competencia: string;
  versao: number;
}

export interface RevisaoHistoricaSegura {
  chave: string;
  secao: string;
  checksumFactual: string;
  tipoDecisao: 'analise' | 'sem_analise';
  texto: string | null;
  estado: 'atual' | 'revisao_necessaria' | 'historica' | 'final';
  revisadaPor: string;
  revisadaEm: string;
  coletadoEmReferencia: string | null;
  invalidadaEm: string | null;
}

function headers(chaveDeServico: string) {
  return { apikey: chaveDeServico, Authorization: `Bearer ${chaveDeServico}` };
}

function linhaSegura(linha: Record<string, unknown>): RevisaoHistoricaSegura | null {
  const estado = linha.estado;
  const tipo = linha.tipo_decisao;
  if (
    typeof linha.id !== 'string'
    || typeof linha.secao !== 'string'
    || typeof linha.checksum_factual !== 'string'
    || !['atual', 'revisao_necessaria', 'historica', 'final'].includes(String(estado))
    || !['analise', 'sem_analise'].includes(String(tipo))
    || typeof linha.revisada_por !== 'string'
    || typeof linha.revisada_em !== 'string'
  ) return null;

  const texto = typeof linha.texto === 'string' ? linha.texto : null;
  if (tipo === 'analise' && !texto?.trim()) return null;
  if (tipo === 'sem_analise' && texto !== null) return null;

  return {
    chave: linha.id,
    secao: linha.secao,
    checksumFactual: linha.checksum_factual,
    tipoDecisao: tipo as RevisaoHistoricaSegura['tipoDecisao'],
    texto,
    estado: estado as RevisaoHistoricaSegura['estado'],
    revisadaPor: linha.revisada_por,
    revisadaEm: linha.revisada_em,
    coletadoEmReferencia: typeof linha.coletado_em_referencia === 'string'
      ? linha.coletado_em_referencia
      : null,
    invalidadaEm: typeof linha.invalidada_em === 'string' ? linha.invalidada_em : null,
  };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method !== 'GET') return res.status(405).json({ erro: 'metodo_nao_permitido' });

  const acesso = await conferirAcesso(req.headers['authorization']);
  if (acesso.ok === false) return res.status(acesso.status).json(acesso.corpo);

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!UUID_VALIDO.test(id)) {
    return res.status(400).json({ erro: 'relatorio_invalido', mensagem: 'O endereço desta revisão está incompleto.' });
  }

  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !chaveDeServico) {
    return res.status(500).json({ erro: 'sem_chave_de_servico', mensagem: 'O histórico interno está indisponível.' });
  }

  try {
    const respostaIdentidade = await fetch(
      `${urlSupabase}/rest/v1/relatorios?id=eq.${encodeURIComponent(id)}&select=cliente_slug,competencia,versao&limit=1`,
      { headers: headers(chaveDeServico) },
    );
    if (!respostaIdentidade.ok) throw new Error(`identidade_http_${respostaIdentidade.status}`);
    const [identidade] = await respostaIdentidade.json() as IdentidadeDoRelatorio[];
    if (!identidade) return res.status(404).json({ erro: 'relatorio_nao_encontrado' });

    const base = `${urlSupabase}/rest/v1/relatorio_revisoes_editoriais`
      + `?cliente_slug=eq.${encodeURIComponent(identidade.cliente_slug)}`
      + `&competencia=eq.${encodeURIComponent(identidade.competencia)}`
      + `&relatorio_versao=eq.${encodeURIComponent(String(identidade.versao))}`
      + '&order=revisada_em.desc,id.desc';
    const camposAV3 = 'id,secao,checksum_factual,tipo_decisao,texto,estado,revisada_por,revisada_em,coletado_em_referencia,invalidada_em';
    let respostaHistorico = await fetch(`${base}&select=${camposAV3}`, { headers: headers(chaveDeServico) });

    // Compatibilidade segura entre merge e migration remota: sem a coluna AV3
    // a timeline continua disponível, mas o carimbo aparece explicitamente
    // como indisponível. Nunca cai em `revisada_em` nem no relógio atual.
    if (respostaHistorico.status === 400) {
      const camposLegado = 'id,secao,checksum_factual,tipo_decisao,texto,estado,revisada_por,revisada_em,invalidada_em';
      respostaHistorico = await fetch(`${base}&select=${camposLegado}`, { headers: headers(chaveDeServico) });
    }
    if (!respostaHistorico.ok) throw new Error(`historico_http_${respostaHistorico.status}`);

    const linhas = await respostaHistorico.json() as Array<Record<string, unknown>>;
    const revisoes = linhas.map(linhaSegura).filter((item): item is RevisaoHistoricaSegura => Boolean(item));
    return res.status(200).json({
      historico: {
        disponivel: true,
        total: revisoes.length,
        revisoes,
      },
    });
  } catch (erro) {
    console.error('[painel-historico-analises] Falha na leitura interna:', erro instanceof Error ? erro.message : erro);
    return res.status(502).json({
      erro: 'historico_indisponivel',
      mensagem: 'O relatório continua disponível, mas o histórico das análises não pôde ser carregado agora.',
    });
  }
}
