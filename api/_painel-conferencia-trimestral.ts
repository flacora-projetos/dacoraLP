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

export async function conferirAnalisesTrimestrais(
  identidade: Pick<IdentidadeConferencia, 'id' | 'checksum'>,
  config: { urlSupabase: string; chaveDeServico: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; motivo?: string }> {
  const lista = SECOES_EDITORIAIS_TRIMESTRAIS.map(s => s.secao).join(',');
  const resposta = await fetchImpl(
    `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${encodeURIComponent(identidade.id)}&relatorio_checksum=eq.${encodeURIComponent(identidade.checksum)}&secao=in.(${lista})&estado=in.(aplicada,editada)&select=secao,estado,texto_atual`,
    { headers: { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` } },
  );
  if (!resposta.ok) return { ok: false, motivo: 'As análises trimestrais não puderam ser conferidas.' };
  const rows = await resposta.json() as Array<{ secao?: string; texto_atual?: string }>;
  for (const item of SECOES_EDITORIAIS_TRIMESTRAIS) {
    const textos = rows?.filter(r => r.secao === item.secao && typeof r.texto_atual === 'string'
      && r.texto_atual.trim().length >= 12) ?? [];
    if (!textos.length) return { ok: false, motivo: item.titulo + ' ainda não foi revisado e aplicado.' };
    if (item.secao === 'bloco:recomendacoes-trimestral') {
      const texto = textos.at(-1)!.texto_atual!.trim();
      const quantas = texto.split(/\n+/).filter(Boolean).length;
      if (quantas > 3) return { ok: false, motivo: 'O trimestral admite no máximo três recomendações.' };
    }
  }
  return { ok: true };
}
