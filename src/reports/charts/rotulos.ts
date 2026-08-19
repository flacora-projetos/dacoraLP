/**
 * O PLANO DE ROTULAGEM das barras horizontais — separado do desenho de
 * propósito, para poder ser provado sem navegador.
 *
 * O BUG QUE ISTO CORRIGE, apontado pelo Flávio em 2026-08-19: numa conta que
 * mede mais de uma conversão o rótulo do mês vira
 * "Maio · resultados diferentes: Conversas iniciadas + Visitas ao perfil", e ele
 * era desenhado a partir da esquerda enquanto o valor era desenhado a partir da
 * direita, os dois na MESMA linha de SVG. Texto em SVG não quebra, não corta e
 * não empurra nada: os dois simplesmente se sobrepõem, e o print mostra
 * "R$ 31,92" impresso por cima de "Visitas ao perfil". Ninguém perde o número —
 * perdem-se os dois ao mesmo tempo, que é pior.
 *
 * Medido em 2026-08-19 nos relatórios REAIS de agosto: **16 clientes** publicam
 * um rótulo desses, o mais longo com 84 caracteres (Make Plant, "resultados
 * diferentes: Conversas iniciadas + Leads de formulário + Visitas ao perfil").
 *
 * ⚠️ **Empilhar não basta, e essa é a parte que a primeira correção errou.** A
 * versão anterior quebrou o rótulo em duas linhas e deixou a ÚLTIMA delas na
 * mesma altura do valor — o defeito voltou uma linha abaixo, e só apareceu na
 * conferência com o relatório real do Make Plant. Por isso o cálculo das linhas
 * e o das posições vivem na MESMA função: eram dois lugares, e um discordou do
 * outro.
 *
 * Medir texto de verdade exigiria DOM (canvas ou getComputedTextLength), que não
 * existe na pré-renderização e mudaria o layout depois da primeira pintura. A
 * estimativa por caractere é conservadora de propósito: prefere abrir duas
 * linhas onde caberia uma a deixar duas frases colidindo.
 */

/** Pior caso medido na Red Hat Display, com canvas, em rótulos reais da carteira. */
export const LARGURA_POR_CARACTERE = 0.56;
/** O respiro mínimo entre o fim do rótulo e o começo do valor, lado a lado. */
export const RESPIRO_ENTRE_ROTULO_E_VALOR = 20;
/** A altura de uma linha de texto do rótulo, em px. */
export const ALTURA_DA_LINHA = 17;
/**
 * Duas linhas foram medidas contra o caso real: dois painéis lado a lado num
 * relatório de 1.280 px dão ~380 px a cada gráfico, e o rótulo mais longo da
 * carteira precisa de duas. Uma terceira linha por barra empurraria o bloco para
 * uma altura em que o gráfico deixa de ser lido de relance, que é a única coisa
 * que ele faz melhor que a tabela ao lado.
 */
export const MAXIMO_DE_LINHAS_DO_ROTULO = 2;

export function larguraEstimada(texto: string, tamanhoFonte: number, espacamento = 0) {
  return texto.length * tamanhoFonte * (LARGURA_POR_CARACTERE + espacamento);
}

/**
 * O rótulo comprido quebrado em palavras, até um teto de linhas.
 *
 * Estourando o teto, a última linha termina em reticências — e o texto íntegro
 * continua na versão em tabela que a moldura já entrega ao leitor de tela e à
 * impressão. Reticências é perda declarada; frase escrita por cima de outra é
 * perda silenciosa das duas.
 */
export function quebrarRotulo(
  texto: string,
  largura: number,
  tamanhoFonte: number,
  espacamento = 0,
  maximoDeLinhas = MAXIMO_DE_LINHAS_DO_ROTULO,
): string[] {
  const porCaractere = tamanhoFonte * (LARGURA_POR_CARACTERE + espacamento);
  const cabem = Math.floor(largura / porCaractere);
  if (largura <= 0 || cabem <= 1 || maximoDeLinhas < 1) return [texto];
  if (texto.length <= cabem) return [texto];

  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (candidata.length <= cabem) {
      atual = candidata;
      continue;
    }
    if (atual) linhas.push(atual);
    // Palavra sozinha maior que a linha entra assim mesmo, e o corte final
    // resolve: quebrar dentro dela produziria pedaços sem significado.
    atual = palavra;
    if (linhas.length >= maximoDeLinhas) break;
  }
  if (linhas.length < maximoDeLinhas && atual) linhas.push(atual);

  const escrito = linhas.join(' ');
  if (escrito.length < texto.length) {
    const ultima = linhas[linhas.length - 1] ?? '';
    const teto = Math.max(cabem - 1, 1);
    linhas[linhas.length - 1] =
      ultima.length >= teto ? `${ultima.slice(0, teto).trimEnd()}…` : `${ultima}…`;
  }
  return linhas.slice(0, maximoDeLinhas);
}

export interface ItemDeRotulo {
  rotulo: string;
  /** Já formatado — o valor ou a palavra de ausência. */
  valor: string;
}

export interface PlanoDeRotulo {
  linhas: string[];
  /** Deslocamento da PRIMEIRA linha do rótulo em relação à linha do valor. */
  deslocamentoDoRotulo: number;
}

export interface PlanoDeRotulagem {
  /** Rótulo em cima, valor embaixo — em vez de lado a lado. */
  empilhado: boolean;
  /** Quantas linhas o rótulo mais comprido ocupa. */
  linhasDoRotulo: number;
  /** O espaço vertical extra que cada barra precisa reservar. */
  alturaExtra: number;
  itens: PlanoDeRotulo[];
}

/**
 * Uma decisão para o gráfico INTEIRO, nunca linha a linha: com metade dos meses
 * numa disposição e metade noutra, o olho lê a diferença como se ela dissesse
 * alguma coisa sobre o dado.
 */
export function planejarRotulagem({
  itens,
  larguraPlot,
  tamanhoRotulo,
  tamanhoValor,
  espacamento = 0,
}: {
  itens: ItemDeRotulo[];
  larguraPlot: number;
  tamanhoRotulo: number;
  tamanhoValor: number;
  espacamento?: number;
}): PlanoDeRotulagem {
  const semEspaco = larguraPlot <= 0 || itens.length === 0;

  const empilhado =
    !semEspaco &&
    itens.some(
      (item) =>
        larguraEstimada(item.rotulo, tamanhoRotulo, espacamento) +
          larguraEstimada(item.valor, tamanhoValor) +
          RESPIRO_ENTRE_ROTULO_E_VALOR >
        larguraPlot,
    );

  const espacoDoRotulo = (item: ItemDeRotulo) =>
    empilhado
      ? larguraPlot
      : larguraPlot - larguraEstimada(item.valor, tamanhoValor) - RESPIRO_ENTRE_ROTULO_E_VALOR;

  const quebras = itens.map((item) =>
    quebrarRotulo(
      item.rotulo,
      espacoDoRotulo(item),
      tamanhoRotulo,
      espacamento,
      empilhado ? MAXIMO_DE_LINHAS_DO_ROTULO : 1,
    ),
  );

  const linhasDoRotulo = empilhado ? Math.max(...quebras.map((l) => l.length), 1) : 1;
  const alturaExtra = empilhado ? linhasDoRotulo * ALTURA_DA_LINHA : 0;

  return {
    empilhado,
    linhasDoRotulo,
    alturaExtra,
    itens: quebras.map((linhas) => ({
      linhas,
      /**
       * A ÚLTIMA linha do rótulo fica UMA LINHA ACIMA do valor, e as anteriores
       * sobem a partir dela. Lado a lado, os dois dividem a mesma linha, que é
       * o caso em que eles cabem.
       */
      deslocamentoDoRotulo: empilhado ? -linhas.length * ALTURA_DA_LINHA : 0,
    })),
  };
}
