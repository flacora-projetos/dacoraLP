/**
 * A regra de prontidão editorial da RA4 — **autoridade única**.
 *
 * A tela, a função serverless (`api/_painel-estado-editorial.ts`) e as
 * regressões importam daqui. Não criar uma segunda implementação: esta é a
 * regra que decide se uma aprovação pode acontecer, e duas cópias significam
 * que a testada e a que decide podem divergir sem ninguém perceber.
 *
 * ⚠️ As importações abaixo levam `.js` de propósito. O runtime ESM da função
 * serverless resolve por extensão explícita; sem ela, o módulo quebra no
 * deploy — foi o que motivou a duplicação temporária de 2026-08-14.
 */
import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise.js';
import type { SnapshotMontado } from '../reports/blocos/tipos.js';

export type EstadoEditorialRA4 =
  | 'nao_iniciada'
  | 'sugerida'
  | 'editada'
  | 'pronta'
  | 'revisada_sem_analise'
  | 'inconclusiva'
  | 'revisao_necessaria'
  | 'falhou';

export interface SugestaoEditorialPersistida {
  secao: string;
  estado: string;
  geradoEm?: string | null;
}

/**
 * Uma revisão editorial durável do modelo AV (`relatorio_revisoes_editoriais`),
 * lida por identidade LÓGICA — cliente + competência + versão —, não pelo
 * `relatorio_id` físico.
 *
 * É essa distinção que a AV2 existe para resolver: a cadência diária apaga e
 * recria a linha física de `relatorios`, levando junto (em cascata) tudo que
 * as tabelas legadas prendiam àquele id. O trabalho humano é transportado para
 * cá antes disso, e passa a viver amarrado à identidade lógica.
 *
 * `historica` nunca chega aqui: a leitura filtra os três estados que
 * representam o presente da seção.
 */
export interface RevisaoEditorialVigente {
  secao: string;
  /** `atual` e `final` valem como revisão feita; `revisao_necessaria`, não. */
  estado: 'atual' | 'revisao_necessaria' | 'final';
  tipoDecisao: 'analise' | 'sem_analise';
  /** Impressão digital dos fatos sobre os quais esta decisão foi tomada. */
  checksumFactual?: string | null;
}

export interface SecaoEditorialRA4 {
  secao: string;
  titulo: string;
  estado: EstadoEditorialRA4;
  prontaParaAprovacao: boolean;
}

export interface ResumoEditorialRA4 {
  disponivel: boolean;
  podeAprovar: boolean;
  totalObrigatorias: number;
  prontas: number;
  pendentes: SecaoEditorialRA4[];
  secoes: SecaoEditorialRA4[];
  mensagem?: string;
}

const ESTADOS_PRONTOS = new Set<EstadoEditorialRA4>([
  'editada',
  'pronta',
  'revisada_sem_analise',
  'inconclusiva',
]);

/**
 * Uma decisão humana já tomada sobre a seção. É o que a prontidão persegue —
 * não a sugestão mais nova.
 */
const ESTADOS_DECIDIDOS = new Set<EstadoEditorialRA4>(['editada', 'pronta', 'inconclusiva']);

export function estadoEditorialDaSugestao(estado: string | null | undefined): EstadoEditorialRA4 {
  switch ((estado ?? '').trim()) {
    case 'pronta':
      return 'sugerida';
    case 'aplicada':
      return 'pronta';
    case 'editada':
      return 'editada';
    case 'inconclusiva':
      return 'inconclusiva';
    case 'falhou':
      return 'falhou';
    case 'desfeita':
    case '':
      return 'nao_iniciada';
    default:
      return 'falhou';
  }
}

export function estadoEditorialEstaPronto(estado: EstadoEditorialRA4): boolean {
  return ESTADOS_PRONTOS.has(estado);
}

export function secoesEditoriaisObrigatorias(snapshot: SnapshotMontado): Array<{ secao: string; titulo: string }> {
  return [
    { secao: 'introducao', titulo: 'Introdução' },
    ...espacosAnaliticosDoSnapshot(snapshot).map((espaco) => ({ secao: espaco.secao, titulo: espaco.titulo })),
  ];
}

/**
 * O estado editorial de UMA seção, a partir de todas as sugestões daquele
 * checksum e da dispensa registrada, se houver.
 *
 * ⚠️ A autoridade é a **decisão humana**, não a sugestão cronologicamente mais
 * nova. Gerar de novo depois de aplicar não desfaz o que a pessoa aplicou —
 * antes desta regra, a segunda geração ficava em `pronta`, era a mais recente,
 * e bloqueava a aprovação de uma seção que já tinha sido resolvida.
 *
 * Estado que não sabemos interpretar continua falhando fechado, e ganha de
 * qualquer decisão: se existe uma linha ilegível na seção, não dá para afirmar
 * que a revisão está completa.
 */
export function estadoEditorialDaSecao(
  sugestoesDaSecao: SugestaoEditorialPersistida[],
  dispensada = false,
): EstadoEditorialRA4 {
  const estados = sugestoesDaSecao.map((sugestao) => estadoEditorialDaSugestao(sugestao.estado));
  if (estados.includes('falhou')) return 'falhou';
  const decidido = estados.find((estado) => ESTADOS_DECIDIDOS.has(estado));
  if (decidido) return decidido;
  if (dispensada) return 'revisada_sem_analise';
  if (estados.includes('sugerida')) return 'sugerida';
  return 'nao_iniciada';
}

/**
 * O estado editorial de UMA seção cruzando as DUAS fontes: as tabelas legadas
 * presas ao `relatorio_id` físico e a revisão durável do modelo AV.
 *
 * A ordem de precedência não é simétrica, e cada degrau existe por um motivo
 * concreto:
 *
 * 1. **`revisao_necessaria` do modelo AV vence sempre.** Fato novo invalidou
 *    aquela análise; a fonte legada estar vazia (que é o normal depois da
 *    ponte) não pode ressuscitar a seção. Este é o degrau que fecha o item
 *    "aprovação continua fail-closed" da AV2.
 * 2. **Checksum factual divergente conta como `revisao_necessaria`.** A
 *    invalidação é chamada pela fábrica a cada coleta, mas entre o INSERT da
 *    linha nova e essa chamada existe uma janela de rede. Se a decisão foi
 *    tomada sobre outros fatos, ela não descreve este documento — e afirmar o
 *    contrário seria exatamente o erro que a impressão digital existe para
 *    impedir. Só vale quando os dois lados declaram a impressão digital;
 *    ausente é ausente, e relatório legado a tem nula para sempre.
 * 3. **`falhou` do legado continua ganhando de tudo abaixo dele.** Linha que
 *    não sabemos ler impede afirmar revisão completa — regra herdada da RA4.2,
 *    preservada de propósito.
 * 4. **A prontidão vinda do AV só se aplica quando o legado não a contradiz
 *    com uma decisão explícita.** "Desfazer" é o caso real: o humano derruba a
 *    análise aplicada, o legado volta para `nao_iniciada` COM linha registrada,
 *    e o modelo AV — que não tem como representar um desfazer — continuaria
 *    dizendo `atual`. Sem este degrau, desfazer viraria fail-open. Uma sugestão
 *    apenas gerada (`sugerida`) NÃO conta como contradição: seria o mesmo bug
 *    que a RA4.2 corrigiu, agora pela porta dos fundos.
 */
export function estadoEditorialComRevisaoViva(
  sugestoesDaSecao: SugestaoEditorialPersistida[],
  dispensada: boolean,
  revisaoViva?: RevisaoEditorialVigente,
  checksumFactualVigente?: string | null,
): EstadoEditorialRA4 {
  if (revisaoViva?.estado === 'revisao_necessaria') return 'revisao_necessaria';

  const legado = estadoEditorialDaSecao(sugestoesDaSecao, dispensada);
  const revisada = revisaoViva?.estado === 'atual' || revisaoViva?.estado === 'final';
  if (revisada && checksumFactualVigente && revisaoViva?.checksumFactual
      && revisaoViva.checksumFactual !== checksumFactualVigente) {
    return 'revisao_necessaria';
  }
  if (legado === 'falhou') return 'falhou';
  if (!revisada) return legado;
  if (estadoEditorialEstaPronto(legado)) return legado;
  /* Decisão explícita de desfazer: existe linha legada e ela resolve para
     "não iniciada". Sem linha nenhuma, `nao_iniciada` é só silêncio — que é o
     estado normal de toda seção depois da ponte. */
  if (legado === 'nao_iniciada' && sugestoesDaSecao.length > 0) return legado;
  return revisaoViva?.tipoDecisao === 'sem_analise' ? 'revisada_sem_analise' : 'pronta';
}

export function resumoEditorialDaRevisao(
  snapshot: SnapshotMontado,
  sugestoes: SugestaoEditorialPersistida[],
  secoesDispensadas: readonly string[] = [],
  revisoesVivas: readonly RevisaoEditorialVigente[] = [],
  checksumFactualVigente: string | null = null,
): ResumoEditorialRA4 {
  const porSecao = new Map<string, SugestaoEditorialPersistida[]>();
  for (const sugestao of sugestoes) {
    const lista = porSecao.get(sugestao.secao);
    if (lista) lista.push(sugestao);
    else porSecao.set(sugestao.secao, [sugestao]);
  }
  const dispensadas = new Set(secoesDispensadas);
  const vivasPorSecao = new Map(revisoesVivas.map((revisao) => [revisao.secao, revisao]));

  const secoes = secoesEditoriaisObrigatorias(snapshot).map(({ secao, titulo }) => {
    const estado = estadoEditorialComRevisaoViva(
      porSecao.get(secao) ?? [],
      dispensadas.has(secao),
      vivasPorSecao.get(secao),
      checksumFactualVigente,
    );
    return { secao, titulo, estado, prontaParaAprovacao: estadoEditorialEstaPronto(estado) };
  });
  const pendentes = secoes.filter((secao) => !secao.prontaParaAprovacao);
  return {
    disponivel: true,
    podeAprovar: pendentes.length === 0,
    totalObrigatorias: secoes.length,
    prontas: secoes.length - pendentes.length,
    pendentes,
    secoes,
  };
}

export function resumoEditorialIndisponivel(mensagem = 'Não foi possível conferir o estado das análises.'): ResumoEditorialRA4 {
  return {
    disponivel: false,
    podeAprovar: false,
    totalObrigatorias: 0,
    prontas: 0,
    pendentes: [],
    secoes: [],
    mensagem,
  };
}
