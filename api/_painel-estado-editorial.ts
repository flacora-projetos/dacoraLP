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
  type RevisaoEditorialVigente,
  type SugestaoEditorialPersistida,
} from '../src/painel/estadoEditorial.js';

export {
  estadoEditorialDaSugestao,
  estadoEditorialDaSecao,
  estadoEditorialComRevisaoViva,
  estadoEditorialEstaPronto,
  secoesEditoriaisObrigatorias,
  resumoEditorialDaRevisao,
  resumoEditorialIndisponivel,
} from '../src/painel/estadoEditorial.js';
export type {
  EstadoEditorialRA4,
  ResumoEditorialRA4,
  RevisaoEditorialVigente,
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

const ESTADOS_VIGENTES_AV = "('atual','revisao_necessaria','final')";

/**
 * A identidade LÓGICA de um documento em revisão.
 *
 * `relatorioId`/`checksum` endereçam a linha física — é por eles que as tabelas
 * legadas são filtradas. `clienteSlug`/`competencia`/`versao` endereçam a
 * identidade que sobrevive à troca dessa linha, que é como o modelo AV guarda
 * a revisão humana. Prontidão precisa das duas, porque as duas fontes coexistem
 * até toda competência ter passado pela ponte pelo menos uma vez.
 */
export interface IdentidadeParaProntidao {
  relatorioId: string;
  checksum: string;
  clienteSlug: string;
  competencia: string;
  versao: number;
  /**
   * `relatorios.checksum_factual_editorial`. Nulo em documento legado, que
   * nunca passou pela coleta nova — e nulo significa **não medido**, nunca
   * "os fatos são iguais".
   */
  checksumFactual?: string | null;
}

/**
 * As revisões editoriais duráveis vigentes desta identidade lógica.
 *
 * ⚠️ Mesma disciplina de `lerDispensasVigentes`: falha de leitura **não** vira
 * lista vazia. Lista vazia aqui significaria "nenhuma seção foi invalidada" —
 * exatamente a afirmação que não podemos fazer quando a consulta falhou, e a
 * única que destravaria uma aprovação que precisa continuar travada. O erro
 * sobe e a prontidão fica indisponível.
 */
export async function lerRevisoesEditoriaisVigentes(
  identidade: Pick<IdentidadeParaProntidao, 'clienteSlug' | 'competencia' | 'versao'>,
  config: ConfiguracaoEditorial,
): Promise<RevisaoEditorialVigente[]> {
  const url = `${config.urlSupabase}/rest/v1/relatorio_revisoes_editoriais`
    + `?cliente_slug=eq.${encodeURIComponent(identidade.clienteSlug)}`
    + `&competencia=eq.${encodeURIComponent(identidade.competencia)}`
    + `&relatorio_versao=eq.${encodeURIComponent(String(identidade.versao))}`
    + `&estado=in.${encodeURIComponent(ESTADOS_VIGENTES_AV)}`
    + '&select=secao,estado,tipo_decisao,checksum_factual';
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_revisoes_editoriais_http_${resposta.status}`);
  const linhas = await resposta.json() as Array<Record<string, unknown>>;
  return linhas
    .filter((linha) =>
      typeof linha.secao === 'string'
      && (linha.estado === 'atual' || linha.estado === 'revisao_necessaria' || linha.estado === 'final')
      && (linha.tipo_decisao === 'analise' || linha.tipo_decisao === 'sem_analise'))
    .map((linha) => ({
      secao: String(linha.secao),
      estado: linha.estado as RevisaoEditorialVigente['estado'],
      tipoDecisao: linha.tipo_decisao as RevisaoEditorialVigente['tipoDecisao'],
      checksumFactual: typeof linha.checksum_factual === 'string' ? linha.checksum_factual : null,
    }));
}

export async function conferirEstadoEditorial(
  identidade: IdentidadeParaProntidao,
  snapshot: SnapshotMontado,
  config: ConfiguracaoEditorial,
): Promise<ResumoEditorialRA4> {
  const [sugestoes, dispensas, revisoesVivas] = await Promise.all([
    lerSugestoesEditoriais(identidade.relatorioId, identidade.checksum, config),
    lerDispensasVigentes(identidade.relatorioId, identidade.checksum, config),
    lerRevisoesEditoriaisVigentes(identidade, config),
  ]);
  return resumoEditorialDaRevisao(
    snapshot,
    sugestoes,
    dispensas.map((item) => item.secao),
    revisoesVivas,
    identidade.checksumFactual ?? null,
  );
}
