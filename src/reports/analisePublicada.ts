/**
 * A análise humana APROVADA que vai ao cliente.
 *
 * Até 04/09/2026 ela não ia. A análise por seção nascia na RA3 como camada de
 * revisão — o espaço só era injetado no documento enquanto quem olhava podia
 * decidir —, e a introdução revisada era substituída apenas na memória do
 * navegador de quem revisava. O efeito, medido em 15 relatórios de agosto: 74
 * análises escritas, zero publicadas. **Quem revisava aprovava uma coisa e o
 * cliente recebia outra.**
 *
 * Decisão do PO em 04/09/2026: *"todas as aprovadas devem ir pro cliente, foi
 * pra isso que fizemos isso, é por isso que elas são editáveis, justamente pra
 * não ir merda de IA sem revisão."*
 *
 * ⚠️ Este módulo existe para haver **uma** regra, e não duas. A prévia da
 * revisão e a página do cliente precisam quebrar o texto e substituir a
 * introdução exatamente do mesmo jeito; duas cópias divergiriam na primeira
 * correção, e a que ficasse para trás faria o revisor aprovar de novo um
 * documento diferente do entregue — que é o defeito que este módulo corrige.
 */

import type { SnapshotMontado } from './blocos/tipos';

export interface AnalisePublicada {
  /** `introducao` ou `bloco:<id>`. */
  secao: string;
  texto: string;
}

/**
 * Parágrafos de um texto de análise, separados por linha em branco.
 *
 * Texto sem linha em branco vira um parágrafo só — nunca lista vazia, porque
 * análise aprovada que some da página é exatamente o defeito de origem.
 */
export function paragrafosDaAnalise(texto: string): string[] {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean);
  return paragrafos.length > 0 ? paragrafos : [texto];
}

/** Forma que o resumo executivo do snapshot espera. */
export function afirmacoesDaIntroducao(texto: string) {
  return paragrafosDaAnalise(texto).map((paragrafo) => ({
    texto: paragrafo,
    sustentadaPor: [] as string[],
  }));
}

/**
 * O snapshot com a introdução aprovada NO LUGAR da leitura automática.
 *
 * ⚠️ Substitui, não acrescenta. A introdução aprovada foi escrita para ocupar
 * aquele espaço: publicar as duas deixaria o cliente com duas aberturas
 * seguidas dizendo a mesma coisa com números iguais e conclusões diferentes.
 * É também o que a prévia da revisão sempre fez — manter a mesma escolha é o
 * que faz a tela e a entrega concordarem.
 *
 * Sem introdução aprovada, devolve o snapshot recebido inalterado.
 */
export function aplicarIntroducaoAprovada(
  snapshot: SnapshotMontado,
  texto: string | null | undefined,
): SnapshotMontado {
  if (typeof texto !== 'string' || texto.trim() === '') return snapshot;
  return {
    ...snapshot,
    leitura: {
      ...snapshot.leitura,
      resumoExecutivo: afirmacoesDaIntroducao(texto),
    },
  };
}

/** O texto da introdução dentro de uma lista de análises publicadas. */
export function introducaoDasAnalises(analises: AnalisePublicada[]): string | null {
  const introducao = analises.find((analise) => analise.secao === 'introducao');
  return introducao?.texto ?? null;
}
