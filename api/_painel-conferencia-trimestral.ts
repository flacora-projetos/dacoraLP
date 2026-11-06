/**
 * A conferência factual do trimestre é exclusivamente interna ao revisor.
 * Reusa o JSON privado relatorio_contextos_sugeridos (RLS: service_role).
 * NUNCA deve ser importada pela rota pública ou pelo PDF.
 */
import { SECOES_EDITORIAIS_TRIMESTRAIS } from '../src/reports/produto.js';

export interface IdentidadeConferencia {
  id: string;
  checksum: string;
  competencia: string;
}

export interface ConferenciaTrimestral {
  disponivel: true;
  checksum: string;
  registradoEm: string | null;
  divergencias: Array<{ tipo: string; competencia?: string; mensagem: string; diferenca?: number | null }>;
}

export function validarConferenciaTrimestral(
  sugestao: any,
  identidade: IdentidadeConferencia,
  atualizadoEm: string | null = null,
): ConferenciaTrimestral | null {
  if (!sugestao || sugestao.versao !== 1 || sugestao.tipo !== 'conferencia_trimestral'
    || sugestao.relatorioId !== identidade.id || sugestao.checksum !== identidade.checksum
    || sugestao.competencia !== identidade.competencia || !Array.isArray(sugestao.divergencias)
    || sugestao.divergencias.length > 500) return null;
  if (!sugestao.divergencias.every((d: any) => d && typeof d.tipo === 'string'
    && typeof d.mensagem === 'string' && d.mensagem.length < 4000
    && (d.competencia === undefined || typeof d.competencia === 'string')
    && (d.diferenca === undefined || d.diferenca === null || Number.isFinite(d.diferenca)))) return null;
  return { disponivel: true, checksum: identidade.checksum, registradoEm: atualizadoEm,
    divergencias: sugestao.divergencias };
}

export async function lerConferenciaTrimestral(
  identidade: IdentidadeConferencia,
  config: { urlSupabase: string; chaveDeServico: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ConferenciaTrimestral | null> {
  const resposta = await fetchImpl(
    `${config.urlSupabase}/rest/v1/relatorio_contextos_sugeridos?relatorio_id=eq.${encodeURIComponent(identidade.id)}&relatorio_checksum=eq.${encodeURIComponent(identidade.checksum)}&select=sugestao,atualizado_em&limit=1`,
    { headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` } },
  );
  if (!resposta.ok) throw new Error('conferencia_trimestral_leitura_falhou');
  const rows = await resposta.json() as Array<{ sugestao: unknown; atualizado_em: string | null }>;
  return validarConferenciaTrimestral(rows?.[0]?.sugestao, identidade, rows?.[0]?.atualizado_em);
}

export interface IdentidadeAnalises {
  id: string;
  checksum: string;
  clienteSlug: string;
  competencia: string;
  versao: number;
  checksumFactual: string | null;
}

/**
 * As duas seções obrigatórias precisam existir nos DOIS registros.
 *
 * A tabela de sugestões diz que uma pessoa decidiu. Quem publica é a revisão
 * durável, lida com os mesmos filtros da view pública: se o registro durável
 * falhou, o painel segue dizendo "aplicada", e o mensal é socorrido pela ponte
 * da coleta seguinte. O trimestral não tem coleta seguinte: aprovaria um
 * documento sem aprendizados nem recomendações.
 */
export async function conferirAnalisesTrimestrais(
  identidade: IdentidadeAnalises,
  config: { urlSupabase: string; chaveDeServico: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; motivo?: string }> {
  if (!identidade.checksumFactual) return { ok: false, motivo: 'Esta versão ainda não tem a impressão factual exigida.' };
  const cabecalhos = { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` };
  const lista = encodeURIComponent(`(${SECOES_EDITORIAIS_TRIMESTRAIS.map(s => `"${s.secao}"`).join(',')})`);
  const [sugestoes, revisoes] = await Promise.all([
    fetchImpl(
      `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${encodeURIComponent(identidade.id)}&relatorio_checksum=eq.${encodeURIComponent(identidade.checksum)}&secao=in.${lista}&estado=in.(aplicada,editada)&select=secao`,
      { headers: cabecalhos },
    ),
    fetchImpl(
      `${config.urlSupabase}/rest/v1/relatorio_revisoes_editoriais?cliente_slug=eq.${encodeURIComponent(identidade.clienteSlug)}&competencia=eq.${encodeURIComponent(identidade.competencia)}&relatorio_versao=eq.${encodeURIComponent(String(identidade.versao))}&secao=in.${lista}&estado=eq.atual&tipo_decisao=eq.analise&invalidada_em=is.null&origem_relatorio_id=eq.${encodeURIComponent(identidade.id)}&checksum_documento=eq.${encodeURIComponent(identidade.checksum)}&checksum_factual=eq.${encodeURIComponent(identidade.checksumFactual)}&select=secao,texto`,
      { headers: cabecalhos },
    ),
  ]);
  if (!sugestoes.ok || !revisoes.ok) return { ok: false, motivo: 'As análises trimestrais não puderam ser conferidas.' };
  const decididas = await sugestoes.json() as Array<{ secao?: string }>;
  const duraveis = await revisoes.json() as Array<{ secao?: string; texto?: string | null }>;
  for (const item of SECOES_EDITORIAIS_TRIMESTRAIS) {
    if (!decididas?.some(r => r.secao === item.secao)) {
      return { ok: false, motivo: item.titulo + ' ainda não foi revisado e aplicado.' };
    }
    const texto = duraveis?.find(r => r.secao === item.secao)?.texto?.trim() ?? '';
    if (texto.length < 12) {
      return { ok: false, motivo: item.titulo + ' não ficou registrado para publicação. Aplique a análise de novo.' };
    }
    if (item.secao === 'bloco:recomendacoes-trimestral'
      && texto.split(/\n+/).filter(l => l.trim()).length > 3) {
      return { ok: false, motivo: 'O trimestral admite no máximo três recomendações, uma por linha.' };
    }
  }
  return { ok: true };
}
