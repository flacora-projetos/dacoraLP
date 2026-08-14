import type { SnapshotMontado } from '../src/reports/blocos/tipos.js';
import {
  resumoEditorialDaRevisao,
  type ResumoEditorialRA4,
  type SugestaoEditorialPersistida,
} from '../src/painel/estadoEditorial.js';

export interface ConfiguracaoEditorial {
  urlSupabase: string;
  chaveDeServico: string;
}

function headers(config: ConfiguracaoEditorial) {
  return { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` };
}

export async function lerSugestoesEditoriais(
  relatorioId: string,
  checksum: string,
  config: ConfiguracaoEditorial,
): Promise<SugestaoEditorialPersistida[]> {
  const url = `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${relatorioId}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&order=gerado_em.desc&select=secao,estado,gerado_em`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_estado_editorial_http_${resposta.status}`);
  return (await resposta.json() as Array<{ secao?: unknown; estado?: unknown; gerado_em?: unknown }>)
    .filter((linha) => typeof linha.secao === 'string' && typeof linha.estado === 'string')
    .map((linha) => ({
      secao: String(linha.secao),
      estado: String(linha.estado),
      geradoEm: typeof linha.gerado_em === 'string' ? linha.gerado_em : null,
    }));
}

export async function conferirEstadoEditorial(
  relatorioId: string,
  checksum: string,
  snapshot: SnapshotMontado,
  config: ConfiguracaoEditorial,
): Promise<ResumoEditorialRA4> {
  const sugestoes = await lerSugestoesEditoriais(relatorioId, checksum, config);
  return resumoEditorialDaRevisao(snapshot, sugestoes);
}
