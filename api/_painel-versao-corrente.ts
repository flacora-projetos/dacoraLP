/**
 * Qual versão de cada relatório é a que vale — a fonte única.
 *
 * Vive em `api/` com prefixo `_` porque a Vercel ignora arquivos iniciados por
 * underscore ao transformar `api/` em funções: é módulo compartilhado do
 * servidor, não rota.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO VIROU UM ARQUIVO PRÓPRIO
 *
 * A regra já existia, escrita dentro de `montarFila`. Enquanto a fila era a
 * única leitora, isso bastava. A visão geral precisa da MESMA regra e ainda de
 * uma coisa a mais — as versões que ficaram para trás, que são a medida de
 * retrabalho —, e uma segunda cópia da regra é a forma mais barata de fazer a
 * fila e o resumo discordarem sobre quantos relatórios existem no mês.
 *
 * Duas telas que respondem "quantos relatórios existem?" com números
 * diferentes destroem a confiança nas duas, e o defeito não apareceria em
 * teste nenhum: cada lado passaria sozinho.
 * ---------------------------------------------------------------------------
 */

/**
 * O mínimo que a regra precisa saber de uma linha.
 *
 * Deliberadamente estrutural, e não `LinhaDoBanco`: se este módulo importasse
 * o tipo da fila e a fila importasse esta função, os dois arquivos ficariam em
 * ciclo. Declarar só os campos usados também documenta que a regra de versão
 * não depende de conteúdo, estado nem carteira.
 */
export interface LinhaVersionada {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  gerado_em: string | null;
}

export interface SeparacaoPorVersao<T extends LinhaVersionada> {
  /** A maior versão de cada `cliente_slug + competencia`. */
  correntes: T[];
  /**
   * Tudo que foi superado por uma versão maior. Não entra em contagem de
   * cobertura — entra em retrabalho, que é outra pergunta.
   */
  anteriores: T[];
}

/** A chave de identidade de um relatório, independente de versão. */
export function chaveDoRelatorio(linha: LinhaVersionada): string {
  return `${linha.cliente_slug} ${linha.competencia}`;
}

/**
 * Separa as linhas em corrente e histórico.
 *
 * O desempate por `gerado_em` quando a versão empata não é preciosismo: sem
 * ele a resposta dependeria da ordem em que o banco devolveu as linhas — que é
 * estável até o dia em que não é.
 */
export function separarPorVersaoCorrente<T extends LinhaVersionada>(
  linhas: T[],
): SeparacaoPorVersao<T> {
  const correntePorChave = new Map<string, T>();

  for (const linha of linhas) {
    const chave = chaveDoRelatorio(linha);
    const atual = correntePorChave.get(chave);
    if (
      !atual ||
      linha.versao > atual.versao ||
      (linha.versao === atual.versao && String(linha.gerado_em) > String(atual.gerado_em))
    ) {
      correntePorChave.set(chave, linha);
    }
  }

  const correntes = [...correntePorChave.values()];
  const correntesPorId = new Set(correntes.map((linha) => linha.id));
  const anteriores = linhas.filter((linha) => !correntesPorId.has(linha.id));

  return { correntes, anteriores };
}
