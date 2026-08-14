/**
 * Leitura do estado editorial persistido (RA4).
 *
 * ⚠️ Este arquivo NÃO reimplementa a regra de prontidão editorial. A regra que
 * decide se uma aprovação pode acontecer tem **uma autoridade só**, em
 * `src/painel/estadoEditorial.ts`; aqui ela é importada e reexportada, para que
 * a API, a tela e as regressões exercitem literalmente a mesma função.
 *
 * A duplicação que existiu entre 2026-08-14 e a RA4.2 nasceu de um erro de
 * resolução de módulo, não de incompatibilidade com a função serverless:
 * `src/painel/estadoEditorial.ts` importava `../reports/blocos/analise` sem
 * extensão, e o runtime ESM da função resolve por extensão explícita. A prova
 * de que o padrão sempre funcionou está em `api/painel-analises-secao.ts`, que
 * importa `../src/reports/blocos/analise.js` e roda em produção desde a RA3.
 */
import type { SnapshotMontado } from '../src/reports/blocos/tipos.js';
import {
  resumoEditorialDaRevisao,
  type ResumoEditorialRA4,
  type SugestaoEditorialPersistida,
} from '../src/painel/estadoEditorial.js';

export {
  estadoEditorialDaSugestao,
  estadoEditorialDaSecao,
  estadoEditorialEstaPronto,
  secoesEditoriaisObrigatorias,
  resumoEditorialDaRevisao,
  resumoEditorialIndisponivel,
} from '../src/painel/estadoEditorial.js';
export type {
  EstadoEditorialRA4,
  ResumoEditorialRA4,
  SecaoEditorialRA4,
  SugestaoEditorialPersistida,
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
  const url = `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${encodeURIComponent(relatorioId)}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&order=gerado_em.desc&select=secao,estado,gerado_em`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_estado_editorial_http_${resposta.status}`);
  return (await resposta.json() as Array<Record<string, unknown>>)
    .filter((linha) => typeof linha.secao === 'string' && typeof linha.estado === 'string')
    .map((linha) => ({
      secao: String(linha.secao),
      estado: String(linha.estado),
      geradoEm: typeof linha.gerado_em === 'string' ? linha.gerado_em : null,
    }));
}

export interface DispensaVigente {
  secao: string;
  por: string | null;
  em: string | null;
}

/**
 * As seções que um humano marcou como "revisada sem análise" nesta versão.
 *
 * ⚠️ Falha de leitura aqui **não** vira lista vazia. Lista vazia significaria
 * "ninguém dispensou nada" e travaria aprovações legítimas; pior, o inverso
 * também vale — tratar erro como ausência é o caminho pelo qual ausência vira
 * zero. O erro sobe e a prontidão fica indisponível, que é o estado honesto.
 */
export async function lerDispensasVigentes(
  relatorioId: string,
  checksum: string,
  config: ConfiguracaoEditorial,
): Promise<DispensaVigente[]> {
  const url = `${config.urlSupabase}/rest/v1/relatorio_secoes_dispensadas?relatorio_id=eq.${encodeURIComponent(relatorioId)}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&revogada_em=is.null&select=secao,dispensada_por,dispensada_em`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_dispensas_http_${resposta.status}`);
  return (await resposta.json() as Array<Record<string, unknown>>)
    .filter((linha) => typeof linha.secao === 'string')
    .map((linha) => ({
      secao: String(linha.secao),
      por: typeof linha.dispensada_por === 'string' ? linha.dispensada_por : null,
      em: typeof linha.dispensada_em === 'string' ? linha.dispensada_em : null,
    }));
}

export async function conferirEstadoEditorial(
  relatorioId: string,
  checksum: string,
  snapshot: SnapshotMontado,
  config: ConfiguracaoEditorial,
): Promise<ResumoEditorialRA4> {
  const [sugestoes, dispensas] = await Promise.all([
    lerSugestoesEditoriais(relatorioId, checksum, config),
    lerDispensasVigentes(relatorioId, checksum, config),
  ]);
  return resumoEditorialDaRevisao(snapshot, sugestoes, dispensas.map((item) => item.secao));
}
