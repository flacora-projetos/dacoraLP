/**
 * Dr. Flávio Zenun — julho de 2026. Fixture da W0.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │  Este repositório é PÚBLICO. Os valores fecham entre si e exercitam   │
 * │  os casos difíceis do formato; não descrevem a operação real.        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Terceiro relatório montado pelo catálogo. Ele é o mais simples da carteira
 * (só Google, nenhum texto humano) e serve **três clientes**: ele, a Dra. Maria
 * Nazaré e o Dr. Danilo de Sá.
 *
 * **Ele foi, por um tempo, o relatório que não fechava** — três das suas seções
 * saíam declarando o que faltava em vez de mostrar números, e essa era a lição
 * que ele carregava: mostrar os buracos como buracos, porque seção apagada não
 * faz falta a ninguém e nunca volta.
 *
 * **As três foram montadas em 2026-08-05** e a lição se pagou exatamente como
 * previsto: elas estavam visíveis, com o que faltava escrito no próprio lugar,
 * então no dia em que o dado chegou não foi preciso lembrar de nada. A `divisão
 * por tipo de contato`, a `série diária` e a `tabela de palavras-chave` passaram
 * a ser devolvidas pela integração, medidas contra a API real nesta mesma conta.
 *
 * O que continua verdadeiro e a tela continua dizendo: a soma da tabela de
 * palavra-chave **não fecha** com o total da conta — parte do investimento o
 * Google não atribui a palavra nenhuma, e os canais sem busca não têm
 * palavra-chave. Ela soma R$ 812,45 dos R$ 1.284,90, e a `cobertura` do bloco
 * imprime os dois números lado a lado antes da tabela. O nível que fecha ao
 * centavo é o de grupo de anúncios, que este cliente não usa.
 *
 * DUAS DECISÕES DO FLÁVIO REGISTRADAS AQUI:
 *
 *  1. **Sem pizza.** O relatório de origem mostra "Tipo de Conversão" num
 *     gráfico de pizza de duas fatias. Ele fica fora do catálogo fechado de
 *     três tipos de gráfico, e a decisão foi substituí-lo por uma comparação
 *     entre categorias — que é o que o B6 já faz, entrega a mesma informação e
 *     é mais legível no celular. (Está declarado assim e indisponível porque a
 *     seção não foi montada, não por falta de gráfico — e, desde 05/08/2026,
 *     não por falta de dado.)
 *  2. **Os relatórios de origem mostram QUAIS dados apresentamos, não são
 *     gabarito de layout.** Por isso a página abaixo não tenta imitar a
 *     disposição do Looker; ela garante que toda leitura possível lá continue
 *     possível aqui.
 *
 * UMA COISA QUE ESTE RELATÓRIO FAZ E OS OUTROS DOIS NÃO FAZEM: um número
 * **derivado com trava**. Ver `impressaoPrimeiroLugar`, abaixo.
 */

import type { CompetenciaDisponivel, Serie, Valor } from '../snapshot';
import type {
  EvolucaoMensal,
  FaixaIndicadores,
  QuebraPorDimensao,
  SnapshotMontado,
  TabelaEntidades,
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

const naoSeAplica = (motivo: string): Valor => ({ estado: 'nao_aplicavel', motivo });

const doGoogle = () => ({ tipo: 'coletado' as const, fontes: ['google' as const] });

const calculado = (formula: string) => ({
  tipo: 'calculado' as const,
  fontes: ['google' as const],
  formula,
});

const comparativoJunho = (valorBase: number, variacao: number) => ({
  permitido: true,
  competenciaBase: '2026-06',
  valorBase: ok(valorBase),
  variacao,
});

/* ------------------------------------------------------------------ */
/* O número derivado, e a trava que ele carrega                        */
/* ------------------------------------------------------------------ */

/**
 * "Aparições no primeiro lugar" foi derivado aqui porque o campo
 * `absolute_top_impression_percentage` não saía do conector.
 *
 * **Isso mudou em 2026-08-05, e este comentário substitui o que dizia o
 * contrário.** O campo passou a ser devolvido e foi medido nesta conta, com o
 * valor batendo o critério de pronto do pedido e vindo `null` nas campanhas
 * pausadas, removidas e de Vídeo. **A ponte abaixo deixou de ser necessária.**
 *
 * Ela continua no arquivo por ser a única demonstração da regra da trava em toda
 * a carteira, e trocá-la pelo campo direto é decisão de produto, não conserto de
 * texto. Duas coisas para quem for fazer a troca:
 *
 *  • o campo certo é o **`absoluteTopImpressionPercentage`** — família
 *    *porcentagem*, denominador = impressões **obtidas**. **Não** é o
 *    `searchAbsoluteTopImpressionShare`, que é família *parcela*, denominador =
 *    impressões **elegíveis**. Os nomes são quase iguais, os números são
 *    diferentes, e essa confusão já custou uma correção neste projeto;
 *  • a regra da trava continua valendo para as **parcelas**, que seguem vindo
 *    travadas nos extremos em duas contas da carteira. O que sai de cena é
 *    precisar derivar o primeiro lugar a partir delas.
 *
 * O raciocínio original, preservado porque a regra continua valendo: as duas
 * famílias de métrica de posição do Google têm o mesmo denominador dentro de si,
 * então a razão entre "primeiro lugar" e "topo" é a mesma nas duas:
 *
 *     parcela_primeiro ÷ parcela_topo  =  aparições_primeiro ÷ aparições_topo
 *
 * A derivação é legítima e foi conferida contra o relatório real, ao segundo
 * decimal. **Mas ela quebra exatamente onde mais dói.**
 *
 * O Google trava os extremos das parcelas: devolve `0.9001` para "acima de 90%"
 * e `0.0999` para "abaixo de 10%". Isso é **faixa, não medição**. Dividir por
 * uma sentinela produz um número plausível e falso — que é a definição do erro
 * que este projeto inteiro existe para impedir. E não é hipótese: em dois
 * clientes da carteira essa parcela volta travada.
 *
 * Por isso a derivação só vale quando nenhuma das duas parcelas é sentinela
 * nem está ausente. Falhando a trava, o número sai como indisponível — nunca
 * como estimativa silenciosa.
 */
const SENTINELAS_GOOGLE = [0.9001, 0.0999];

function derivarPrimeiroLugar(
  aparicoesTopo: number,
  parcelaTopo: number | null,
  parcelaPrimeiro: number | null,
): Valor {
  const travada = (v: number | null) => v === null || SENTINELAS_GOOGLE.includes(v);

  if (travada(parcelaTopo) || travada(parcelaPrimeiro) || !parcelaTopo) {
    return {
      estado: 'ausente',
      motivo:
        'Este número é derivado de duas parcelas da plataforma, e neste período pelo menos uma delas veio como faixa ("acima de 90%" ou "abaixo de 10%") em vez de valor medido. Derivar a partir de uma faixa daria um número plausível e errado, então ele não é apresentado.',
    };
  }

  const razao = (parcelaPrimeiro as number) / parcelaTopo;
  return ok(Number((aparicoesTopo * razao).toFixed(4)));
}

/* ------------------------------------------------------------------ */
/* B1 — indicadores do mês, com explicação sob cada número             */
/* ------------------------------------------------------------------ */

const faixaConta: FaixaIndicadores = {
  id: 'faixa_conta',
  escopo: { tipo: 'conta', rotulo: 'toda a conta do Google Ads' },
  metricas: [
    {
      id: 'custo',
      rotulo: 'Investimento',
      glossarioId: 'investimento',
      unidade: 'brl',
      valor: ok(1284.9),
      origem: doGoogle(),
      direcaoFavoravel: 'neutra',
      comparativo: comparativoJunho(1146.2, 0.121),
    },
    {
      id: 'impressoes',
      rotulo: 'Impressões',
      glossarioId: 'impressoes',
      unidade: 'inteiro',
      valor: ok(14380),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(12905, 0.1143),
    },
    {
      id: 'cliques',
      rotulo: 'Cliques',
      glossarioId: 'cliques',
      unidade: 'inteiro',
      valor: ok(386),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(342, 0.1287),
    },
    {
      id: 'cpc_medio',
      rotulo: 'CPC médio',
      glossarioId: 'cpc_medio',
      unidade: 'brl',
      valor: ok(3.33),
      origem: doGoogle(),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(3.35, -0.0066),
    },
    {
      id: 'conversoes',
      rotulo: 'Conversões',
      glossarioId: 'conversoes',
      unidade: 'inteiro',
      valor: ok(21),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(17, 0.2353),
    },
    {
      id: 'custo_conversao',
      rotulo: 'Custo por conversão',
      glossarioId: 'custo_por_conversao',
      unidade: 'brl',
      valor: ok(61.19),
      origem: calculado('investimento ÷ conversões'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(67.42, -0.0924),
    },
    {
      id: 'aparicoes_topo',
      rotulo: 'Aparições no topo',
      glossarioId: 'impressao_topo',
      unidade: 'percentual',
      valor: ok(0.7118),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(0.6842, 0.0403),
    },
    {
      id: 'aparicoes_primeiro',
      rotulo: 'Aparições no primeiro lugar',
      glossarioId: 'impressao_primeiro_lugar',
      unidade: 'percentual',
      /**
       * Derivado, com a trava aplicada. Neste período as duas parcelas são
       * medição de verdade, então o número sai: 0,7118 × (0,2841 ÷ 0,3120).
       */
      valor: derivarPrimeiroLugar(0.7118, 0.312, 0.2841),
      origem: calculado(
        'derivado das duas parcelas de posição da plataforma, e apresentado só quando as duas são medição, nunca quando vêm como faixa',
      ),
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: false,
        motivo:
          'é um número derivado de outras duas medições, e comparar duas derivações acumularia o erro das duas.',
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B3 — evolução mensal                                                */
/* ------------------------------------------------------------------ */

const COLUNAS_MES = [
  { id: 'custo', rotulo: 'Investimento', unidade: 'brl' as const },
  { id: 'conversoes', rotulo: 'Conversões', unidade: 'inteiro' as const },
  { id: 'custo_conversao', rotulo: 'Custo por conversão', unidade: 'brl' as const },
  { id: 'cpc_medio', rotulo: 'CPC médio', unidade: 'brl' as const, secundaria: true },
];

const mes = (
  competencia: string,
  custo: number,
  conversoes: number,
  custoConv: number,
  cpc: number,
) => ({
  competencia,
  valores: {
    custo: ok(custo),
    conversoes: ok(conversoes),
    custo_conversao: ok(custoConv),
    cpc_medio: ok(cpc),
  },
});

const evolucaoMensal: EvolucaoMensal = {
  id: 'evolucao_2026',
  plataforma: 'google',
  colunas: COLUNAS_MES,
  meses: [
    mes('2026-01', 986.4, 13, 75.88, 2.94),
    mes('2026-02', 1024.7, 15, 68.31, 3.02),
    mes('2026-03', 1108.35, 14, 79.17, 3.18),
    mes('2026-04', 1195.6, 19, 62.93, 3.24),
    mes('2026-05', 1162.85, 16, 72.68, 3.29),
    mes('2026-06', 1146.2, 17, 67.42, 3.35),
    mes('2026-07', 1284.9, 21, 61.19, 3.33),
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: {
      custo: ok(7909.0),
      conversoes: ok(115),
      custo_conversao: ok(68.77),
      cpc_medio: ok(3.2),
    },
  },
  definicoes: [
    'O total é do período inteiro, não a média das linhas: o custo por conversão é o investimento acumulado dividido pelas conversões acumuladas, e o CPC médio é o investimento acumulado dividido pelos cliques acumulados.',
    'Cada mês foi coletado na própria janela fechada.',
  ],
};

/* ------------------------------------------------------------------ */
/* B1 — acumulado do ano                                               */
/* ------------------------------------------------------------------ */

const faixaAno: FaixaIndicadores = {
  id: 'faixa_ano',
  escopo: { tipo: 'ano', rotulo: 'todo o ano de 2026 até julho' },
  metricas: [
    {
      id: 'ano_custo',
      rotulo: 'Investimento',
      unidade: 'brl',
      valor: ok(7909.0),
      origem: doGoogle(),
      direcaoFavoravel: 'neutra',
    },
    {
      id: 'ano_conversoes',
      rotulo: 'Conversões',
      unidade: 'inteiro',
      valor: ok(115),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
    },
    {
      id: 'ano_custo_conversao',
      rotulo: 'Custo por conversão',
      unidade: 'brl',
      valor: ok(68.77),
      origem: calculado('investimento do ano ÷ conversões do ano'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'ano_cpc',
      rotulo: 'CPC médio',
      unidade: 'brl',
      valor: ok(3.2),
      origem: calculado('investimento do ano ÷ cliques do ano'),
      direcaoFavoravel: 'baixa',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B6 — por onde as pessoas entraram em contato                        */
/* ------------------------------------------------------------------ */

/**
 * É o gráfico de pizza do relatório de origem, e ele **não** virou pizza — o
 * catálogo tem três tipos de gráfico e a pizza não é um deles. Decisão do
 * Flávio: comparação entre categorias entrega a mesma informação e é mais
 * legível no celular.
 *
 * As duas categorias somam exatamente as 21 conversões da primeira seção. Isso
 * não é coincidência nem escolha de arredondamento: se um dia a soma da quebra
 * não bater com o total, a quebra está errada ou incompleta, e a tela tem que
 * dizer — não ajustar.
 */
const quebraTipoDeConversao: QuebraPorDimensao = {
  id: 'tipo_de_conversao',
  plataforma: 'google',
  escopo: { tipo: 'conta', rotulo: 'toda a conta do Google Ads' },
  pergunta: 'Por onde as pessoas entraram em contato?',
  unidade: 'inteiro',
  unidadeTexto: 'Conversões registradas no período, por tipo de contato',
  itens: [
    { id: 'whatsapp', rotulo: 'Conversa no WhatsApp', valor: ok(14) },
    { id: 'ligacao', rotulo: 'Ligação recebida', valor: ok(7) },
  ],
};

/* ------------------------------------------------------------------ */
/* B5 — as conversões dia a dia                                        */
/* ------------------------------------------------------------------ */

/**
 * Os dias 24 e 25 são lacuna, não zero. A distinção é a razão de este bloco
 * existir: "não anunciamos" e "anunciamos e ninguém respondeu" são leituras
 * opostas, e uma linha de zeros conta a segunda história para os dois casos.
 */
const conversoesPorDia: Serie = {
  id: 'conversoes_dia',
  pergunta: 'Como as conversões se distribuíram ao longo de julho?',
  granularidade: 'dia',
  unidade: 'inteiro',
  unidadeTexto: 'Conversões registradas pelo Google Ads, por dia',
  chaves: [{ id: 'conversoes', rotulo: 'Conversões', plataforma: 'google' }],
  pontos: [
    { data: '2026-07-01', valores: { conversoes: 0 } },
    { data: '2026-07-02', valores: { conversoes: 1 } },
    { data: '2026-07-03', valores: { conversoes: 0 } },
    { data: '2026-07-04', valores: { conversoes: 1 } },
    { data: '2026-07-05', valores: { conversoes: 0 } },
    { data: '2026-07-06', valores: { conversoes: 0 } },
    { data: '2026-07-07', valores: { conversoes: 1 } },
    { data: '2026-07-08', valores: { conversoes: 2 } },
    { data: '2026-07-09', valores: { conversoes: 0 } },
    { data: '2026-07-10', valores: { conversoes: 1 } },
    { data: '2026-07-11', valores: { conversoes: 0 } },
    { data: '2026-07-12', valores: { conversoes: 0 } },
    { data: '2026-07-13', valores: { conversoes: 1 } },
    { data: '2026-07-14', valores: { conversoes: 3 } },
    { data: '2026-07-15', valores: { conversoes: 1 } },
    { data: '2026-07-16', valores: { conversoes: 0 } },
    { data: '2026-07-17', valores: { conversoes: 1 } },
    { data: '2026-07-18', valores: { conversoes: 0 } },
    { data: '2026-07-19', valores: { conversoes: 1 } },
    { data: '2026-07-20', valores: { conversoes: 0 } },
    { data: '2026-07-21', valores: { conversoes: 2 } },
    { data: '2026-07-22', valores: { conversoes: 0 } },
    { data: '2026-07-23', valores: { conversoes: 1 } },
    /* Dois dias sem veiculação: a linha se interrompe, e não desce a zero. */
    { data: '2026-07-24', valores: { conversoes: null } },
    { data: '2026-07-25', valores: { conversoes: null } },
    { data: '2026-07-26', valores: { conversoes: 1 } },
    { data: '2026-07-27', valores: { conversoes: 1 } },
    { data: '2026-07-28', valores: { conversoes: 0 } },
    { data: '2026-07-29', valores: { conversoes: 2 } },
    { data: '2026-07-30', valores: { conversoes: 1 } },
    { data: '2026-07-31', valores: { conversoes: 0 } },
  ],
  observacoes: [
    'Os dias 24 e 25 aparecem como interrupção da linha, e não como zero: não houve veiculação neles. Um dia que veiculou e não converteu aparece como zero, apoiado na base do gráfico.',
    'A soma dos dias é 21, o mesmo total de conversões da primeira seção.',
  ],
};

/* ------------------------------------------------------------------ */
/* B2 — as palavras-chave, que não fecham com a conta                  */
/* ------------------------------------------------------------------ */

/**
 * Soma R$ 812,45 dos R$ 1.284,90 investidos. **Apresentar os R$ 812,45 como
 * total seria erro**, e é por isso que a tabela carrega `cobertura`: o aviso
 * fica acima dela, com os dois números lado a lado e o motivo da diferença.
 */
const tabelaPalavrasChave: TabelaEntidades = {
  id: 'palavras_chave',
  dimensao: 'palavra_chave',
  rotuloDimensao: 'Palavra-chave',
  escopo: { tipo: 'conta', rotulo: 'toda a conta do Google Ads' },
  cobertura: {
    universo: 'toda a conta do Google Ads',
    colunaId: 'custo',
    totalDoUniverso: ok(1284.9),
    motivos: [
      'Parte do investimento da busca o Google não atribui a nenhuma palavra-chave comprada.',
      'Campanhas que não são de rede de pesquisa não têm palavra-chave, por definição.',
    ],
  },
  colunaPrincipal: 'custo',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cliques', rotulo: 'Cliques', unidade: 'inteiro' },
    { id: 'cpc_medio', rotulo: 'CPC médio', unidade: 'brl', secundaria: true },
    { id: 'conversoes', rotulo: 'Conversões', unidade: 'inteiro' },
    {
      id: 'custo_conversao',
      rotulo: 'Custo por conversão',
      unidade: 'brl',
      secundaria: true,
    },
  ],
  linhas: [
    {
      id: 'kw_consulta_particular',
      nome: 'consulta particular',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: {
        custo: ok(268.4),
        cliques: ok(79),
        cpc_medio: ok(3.4),
        conversoes: ok(6),
        custo_conversao: ok(44.73),
      },
    },
    {
      id: 'kw_agendar_consulta',
      nome: 'agendar consulta médica',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: {
        custo: ok(196.15),
        cliques: ok(58),
        cpc_medio: ok(3.38),
        conversoes: ok(4),
        custo_conversao: ok(49.04),
      },
    },
    {
      id: 'kw_clinica_perto',
      nome: 'clínica perto de mim',
      plataforma: 'google',
      etiqueta: 'Correspondência ampla',
      valores: {
        custo: ok(154.7),
        cliques: ok(51),
        cpc_medio: ok(3.03),
        conversoes: ok(3),
        custo_conversao: ok(51.57),
      },
    },
    {
      id: 'kw_atendimento_domingo',
      nome: 'atendimento no fim de semana',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: {
        custo: ok(112.85),
        cliques: ok(34),
        cpc_medio: ok(3.32),
        conversoes: ok(2),
        custo_conversao: ok(56.43),
      },
    },
    {
      id: 'kw_valor_consulta',
      nome: 'valor da consulta',
      plataforma: 'google',
      etiqueta: 'Correspondência exata',
      valores: {
        custo: ok(80.35),
        cliques: ok(26),
        cpc_medio: ok(3.09),
        conversoes: ok(1),
        custo_conversao: ok(80.35),
      },
    },
    /**
     * Palavra ativa que consumiu investimento e não trouxe nada. Conversões `0`
     * é medição — ela rodou e não converteu —, mas custo por conversão não é
     * "zero reais por conversão": é divisão por zero, e imprimir `R$ 0,00` ali
     * diria que essa palavra é a mais barata da tabela.
     */
    {
      id: 'kw_medico_urgencia',
      nome: 'médico urgência',
      plataforma: 'google',
      etiqueta: 'Correspondência ampla',
      valores: {
        custo: ok(0),
        cliques: ok(0),
        cpc_medio: naoSeAplica('Sem clique no período: o CPC seria uma divisão por zero.'),
        conversoes: ok(0),
        custo_conversao: naoSeAplica('Sem conversão no período: a divisão não existe.'),
      },
    },
  ],
  total: {
    rotulo: 'Soma das palavras-chave listadas',
    valores: {
      custo: ok(812.45),
      cliques: ok(248),
      cpc_medio: ok(3.28),
      conversoes: ok(16),
      custo_conversao: ok(50.78),
    },
  },
  definicoes: [
    'CPC médio: investimento ÷ cliques.',
    'Custo por conversão: investimento ÷ conversões.',
    'A correspondência ao lado de cada palavra diz o quanto o Google pode se afastar do que foi comprado: exata mostra o anúncio só para aquela busca; frase e ampla aceitam variações.',
    'A soma desta tabela é menor que o investimento do mês de propósito — o motivo está no aviso acima dela.',
  ],
};

/* ------------------------------------------------------------------ */
/* O snapshot                                                          */
/* ------------------------------------------------------------------ */

export const zenun202607: SnapshotMontado = {
  identidade: {
    relatorioId: 'demo-zenun-2026-07',
    clienteSlug: 'flavio_zenun',
    clienteNome: 'Dr. Flávio Zenun',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'servicos_leads',
    versaoSchema: '2026-08-w0',
  },

  fontes: [
    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      /* Era `parcial` com as três seções por montar. Virou `sucesso` no mesmo
         commit que as montou — situação de fonte e conteúdo das seções mudam
         juntos, senão a tela do cliente afirma falta que não existe mais. */
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:02:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'A tabela de palavras-chave soma menos que o investimento do mês, e isso não é falha de coleta: parte do investimento o Google não atribui a nenhuma palavra comprada. A diferença está dimensionada acima da tabela.',
        '"Aparições no primeiro lugar" é derivado de outras duas medições, e só é apresentado quando nenhuma delas vem como faixa.',
      ],
    },
  ],

  montagem: [
    {
      bloco: 'B1',
      id: 'numeros-do-mes',
      titulo: 'Os números de julho',
      apoio:
        'Cada indicador traz a explicação do que ele mede logo abaixo do número, e a comparação com junho ao lado.',
      faixa: 'faixa_conta',
      mostrarVariacao: true,
      descricaoSobNumero: true,
    },
    {
      bloco: 'B6',
      id: 'tipo-de-conversao',
      titulo: 'Por onde as pessoas entraram em contato',
      apoio: 'A separação entre conversa no WhatsApp e ligação recebida.',
      quebra: 'tipo_de_conversao',
    },
    {
      bloco: 'B5',
      id: 'conversoes-por-dia',
      titulo: 'Como as conversões se distribuíram no mês',
      apoio: 'Dia a dia, para mostrar concentração e vazios ao longo do período.',
      serie: 'conversoes_dia',
    },
    {
      bloco: 'B3',
      id: 'evolucao-mensal',
      titulo: 'O ano até aqui, mês a mês',
      apoio:
        'Cada mês foi coletado na própria janela fechada. O total é do período inteiro, não a média dos meses.',
      evolucao: 'evolucao_2026',
      apresentacao: 'tabela',
    },
    {
      bloco: 'B1',
      id: 'numeros-do-ano',
      titulo: 'O acumulado de 2026',
      apoio:
        'Sem comparação porque não há período anterior equivalente: é o ano corrente somado até aqui.',
      faixa: 'faixa_ano',
      mostrarVariacao: false,
    },
    {
      bloco: 'B2',
      id: 'palavras-chave',
      titulo: 'Palavras-chave do período',
      apoio: 'Quanto cada termo comprado na busca consumiu e o que ele trouxe.',
      tabela: 'palavras_chave',
      pergunta: 'Quais palavras-chave trouxeram os resultados do mês?',
    },
  ],

  dados: {
    faixas: { faixa_conta: faixaConta, faixa_ano: faixaAno },
    tabelas: { palavras_chave: tabelaPalavrasChave },
    evolucoesMensais: { evolucao_2026: evolucaoMensal },
    rankingsCriativos: {},
    quebras: { tipo_de_conversao: quebraTipoDeConversao },
    series: { conversoes_dia: conversoesPorDia },
  },

  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho teve R$ 1.284,90 investidos e 21 conversões, contra R$ 1.146,20 e 17 em junho. O custo por conversão caiu de R$ 67,42 para R$ 61,19.',
        sustentadaPor: ['custo', 'conversoes', 'custo_conversao'],
      },
      {
        texto:
          'No ano, são R$ 7.909,00 investidos e 115 conversões, a um custo médio de R$ 68,77 por conversão.',
        sustentadaPor: ['ano_custo', 'ano_conversoes', 'ano_custo_conversao'],
      },
      {
        texto:
          'Das 21 conversões do mês, 14 vieram por conversa no WhatsApp e 7 por ligação. O dia de maior volume foi 14 de julho, com 3; houve dois dias sem veiculação no mês.',
        sustentadaPor: ['tipo_de_conversao', 'conversoes_dia'],
      },
    ],
    destaques: [
      {
        texto:
          'Julho teve o menor custo por conversão do ano: R$ 61,19, contra R$ 68,77 de média do período.',
        sustentadaPor: ['custo_conversao', 'ano_custo_conversao'],
      },
      {
        texto:
          'Os anúncios apareceram acima dos resultados da busca em 71,2% das vezes, ante 68,4% em junho.',
        sustentadaPor: ['aparicoes_topo'],
      },
    ],
    atencao: [
      {
        texto:
          'O CPC médio subiu de R$ 2,94 em janeiro para R$ 3,33 em julho. Este relatório mede a alta; não mede a causa dela.',
        sustentadaPor: ['evolucao_2026'],
      },
      {
        texto:
          '"Aparições no primeiro lugar" ainda é apresentado aqui como número derivado de outras duas medições, e por isso não entra em comparação com meses anteriores. A plataforma passou a devolver o campo direto, e trocar um pelo outro depende de nós.',
        sustentadaPor: ['aparicoes_primeiro'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'A palavra "médico urgência" está ativa e não teve nenhum clique em julho. Ela aparece na tabela com investimento zero e sem CPC nem custo por conversão, porque sem clique esses dois não existem — é diferente de terem sido zero.',
        sustentadaPor: ['palavras_chave'],
      },
      {
        texto:
          'As palavras-chave listadas respondem por R$ 812,45 dos R$ 1.284,90 do mês. O restante o Google não atribui a nenhuma palavra comprada, e isso é da natureza da fonte — não há o que corrigir nem o que perseguir.',
        sustentadaPor: ['palavras_chave'],
      },
    ],
  },

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'demo-zenun-0001',
    geradoEm: '2026-08-01T07:10:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

export const competenciasZenun: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
];
