/**
 * ICH Agropastoril — julho de 2026. Fixture da W0.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │                                                                      │
 * │  Este repositório é PÚBLICO. Nenhum valor real de cliente, nenhum     │
 * │  identificador de conta de plataforma e nenhuma miniatura de anúncio  │
 * │  entram aqui. Os números foram construídos para serem internamente    │
 * │  coerentes — as contas fecham entre si — e para exercitar os casos    │
 * │  difíceis do formato, não para descrever a operação real.            │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Por que o ICH primeiro, entre os seis relatórios inventariados: ele é o
 * único que fecha **100% em dado que o conector já entrega hoje** (37 de 37
 * itens) e o arranjo dele é o padrão da carteira Allgrotech. Ou seja, é o
 * caminho que não espera ninguém — nem o agente do conector, nem uma decisão
 * pendente — e ao mesmo tempo é o formato que atende a maior fatia dos
 * clientes.
 *
 * A montagem abaixo é a do catálogo, transcrita:
 *
 *     B3  evolução mensal, em tabela
 *     B1  faixa da conta
 *     B2  tabela de campanhas
 *     B6  investimento por região
 *     B1  faixa da campanha de tráfego
 *     B4  criativos da campanha de tráfego
 *     B1  faixa da campanha de mensagens
 *     B4  criativos da campanha de mensagens
 *     B7  glossário, no rodapé
 *
 * TRÊS COISAS QUE ESTE RELATÓRIO FAZ DIFERENTE DO ORIGINAL, DE PROPÓSITO.
 * A fidelidade combinada é de informação, não de pixel, e ela para onde
 * começam as regras da casa:
 *
 *  1. **Custo por mensagem.** No original, a faixa presa à campanha de
 *     mensagens divide o investimento da CONTA INTEIRA pelas mensagens
 *     DAQUELA campanha — o cliente lê um custo quase duas vezes maior que o
 *     real. Aqui todo número de uma faixa de campanha é daquela campanha, e o
 *     escopo aparece impresso acima dos números. Isso é pergunta aberta para a
 *     Fernanda: pode ser intencional, e nesse caso o rótulo precisa dizer.
 *
 *  2. **Mês sem veiculação.** Fevereiro não teve campanha no ar. Ele aparece
 *     dito com todas as letras, e não como uma linha de zeros.
 *
 *  3. **Região não determinada.** A Meta devolve uma categoria `Unknown` na
 *     quebra por região. Ela é valor real da plataforma — "não soubemos dizer
 *     de onde veio esse gasto" — e não ausência de coleta. Vai para a tela
 *     traduzida, com a explicação junto, em vez de sumir ou virar zero.
 */

import type { CompetenciaDisponivel, Valor } from '../snapshot';
import type {
  EvolucaoMensal,
  FaixaIndicadores,
  QuebraPorDimensao,
  RankingCriativos,
  SnapshotMontado,
  TabelaEntidades,
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */
/* Atalhos                                                             */
/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

const naoSeAplica = (motivo: string): Valor => ({ estado: 'nao_aplicavel', motivo });

const semVeiculacao = naoSeAplica('Não houve veiculação neste mês.');

/** Só Meta neste cliente: `origem` fica curta e sempre igual. */
const daMeta = (formula?: string) => ({
  tipo: 'coletado' as const,
  fontes: ['meta' as const],
  ...(formula ? { formula } : {}),
});

const calculado = (formula: string) => ({
  tipo: 'calculado' as const,
  fontes: ['meta' as const],
  formula,
});

/* ------------------------------------------------------------------ */
/* B3 — evolução mensal                                                */
/* ------------------------------------------------------------------ */

/**
 * Sete meses fechados, uma coleta por mês. Não existe pedido "mês a mês" numa
 * chamada só: o conector devolve incremento diário, e agregar 213 linhas por
 * mês estouraria o teto da ferramenta. Uma chamada por mês fechado é o
 * caminho, e o resultado é gravado no snapshot uma vez — nunca recalculado
 * quando a página é reaberta.
 */
const evolucaoMensal: EvolucaoMensal = {
  id: 'evolucao_2026',
  plataforma: 'meta',
  colunas: [
    { id: 'investimento', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'impressoes', rotulo: 'Impressões', unidade: 'inteiro' },
    { id: 'cpm', rotulo: 'CPM', unidade: 'brl', secundaria: true },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
    { id: 'mensagens', rotulo: 'Mensagens', unidade: 'inteiro' },
    { id: 'visitas_perfil', rotulo: 'Visitas ao perfil', unidade: 'inteiro' },
  ],
  meses: [
    {
      competencia: '2026-01',
      valores: {
        investimento: ok(968.4),
        impressoes: ok(84120),
        cpm: ok(11.51),
        cpc: ok(0.4),
        mensagens: ok(24),
        visitas_perfil: ok(1980),
      },
    },
    {
      competencia: '2026-02',
      observacao: 'sem veiculação',
      valores: {
        investimento: semVeiculacao,
        impressoes: semVeiculacao,
        cpm: semVeiculacao,
        cpc: semVeiculacao,
        mensagens: semVeiculacao,
        visitas_perfil: semVeiculacao,
      },
    },
    {
      competencia: '2026-03',
      valores: {
        investimento: ok(1042.7),
        impressoes: ok(89340),
        cpm: ok(11.67),
        cpc: ok(0.88),
        mensagens: ok(27),
        visitas_perfil: ok(2115),
      },
    },
    {
      competencia: '2026-04',
      valores: {
        investimento: ok(1115.3),
        impressoes: ok(94180),
        cpm: ok(11.84),
        cpc: ok(0.43),
        mensagens: ok(29),
        visitas_perfil: ok(2240),
      },
    },
    {
      competencia: '2026-05',
      valores: {
        investimento: ok(1098.6),
        impressoes: ok(92470),
        cpm: ok(11.88),
        cpc: ok(0.43),
        mensagens: ok(26),
        visitas_perfil: ok(2188),
      },
    },
    {
      competencia: '2026-06',
      valores: {
        investimento: ok(1184.2),
        impressoes: ok(98030),
        cpm: ok(12.08),
        cpc: ok(0.44),
        mensagens: ok(31),
        visitas_perfil: ok(2402),
      },
    },
    {
      competencia: '2026-07',
      valores: {
        investimento: ok(1358.5),
        impressoes: ok(119660),
        cpm: ok(11.35),
        cpc: ok(0.39),
        mensagens: ok(38),
        visitas_perfil: ok(2959),
      },
    },
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: {
      investimento: ok(6767.7),
      impressoes: ok(577800),
      cpm: ok(11.71),
      cpc: ok(0.45),
      mensagens: ok(175),
      visitas_perfil: ok(13884),
    },
  },
  definicoes: [
    'O total é do período inteiro, não a média das linhas: CPM e CPC são o investimento acumulado dividido pelas impressões e pelos cliques acumulados. A média simples dos CPCs mensais daria R$ 0,50, e seria outro número — o mês de março, com poucos cliques e CPC alto, pesaria tanto quanto julho, que teve seis vezes mais cliques.',
    'Fevereiro não teve veiculação. As células dele aparecem com traço porque não houve o que medir, e isso é diferente de ter medido zero.',
  ],
};

/* ------------------------------------------------------------------ */
/* B1 — faixas de indicadores                                          */
/* ------------------------------------------------------------------ */

const comparativoJunho = (valorBase: number, variacao: number) => ({
  permitido: true,
  competenciaBase: '2026-06',
  valorBase: ok(valorBase),
  variacao,
});

const faixaConta: FaixaIndicadores = {
  id: 'faixa_conta',
  escopo: { tipo: 'conta', rotulo: 'toda a conta de anúncios' },
  metricas: [
    {
      id: 'conta_investimento',
      rotulo: 'Investimento',
      unidade: 'brl',
      valor: ok(1358.5),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
      comparativo: comparativoJunho(1184.2, 0.1472),
    },
    {
      id: 'conta_cpm',
      rotulo: 'CPM',
      unidade: 'brl',
      valor: ok(11.35),
      origem: calculado('investimento ÷ impressões × 1.000'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(12.08, -0.0602),
    },
    {
      id: 'conta_cpc',
      rotulo: 'CPC',
      unidade: 'brl',
      valor: ok(0.39),
      origem: calculado('investimento ÷ cliques no link'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(0.44, -0.105),
    },
    {
      id: 'conta_mensagens',
      rotulo: 'Mensagens iniciadas',
      unidade: 'inteiro',
      valor: ok(38),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(31, 0.2258),
    },
    {
      id: 'conta_visitas',
      rotulo: 'Visitas ao perfil',
      unidade: 'inteiro',
      valor: ok(2959),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(2402, 0.2319),
    },
  ],
};

const faixaTrafego: FaixaIndicadores = {
  id: 'faixa_trafego',
  escopo: { tipo: 'campanha', rotulo: 'campanha TRÁFEGO — INSTITUCIONAL' },
  metricas: [
    {
      id: 'trafego_investimento',
      rotulo: 'Investimento',
      unidade: 'brl',
      valor: ok(742.6),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
    },
    {
      id: 'trafego_cpm',
      rotulo: 'CPM',
      unidade: 'brl',
      valor: ok(9.47),
      origem: calculado('investimento da campanha ÷ impressões da campanha × 1.000'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'trafego_cpc',
      rotulo: 'CPC',
      unidade: 'brl',
      valor: ok(0.23),
      origem: calculado('investimento da campanha ÷ cliques no link da campanha'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'trafego_visitas',
      rotulo: 'Visitas ao perfil',
      unidade: 'inteiro',
      valor: ok(2847),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
    },
    {
      id: 'trafego_custo_visita',
      rotulo: 'Custo por visita ao perfil',
      unidade: 'brl',
      valor: ok(0.26),
      origem: calculado('investimento da campanha ÷ visitas ao perfil da campanha'),
      direcaoFavoravel: 'baixa',
    },
  ],
};

/**
 * A faixa que o relatório de origem erra.
 *
 * Lá, o custo por mensagem sai de R$ 1.358,50 ÷ 38 = R$ 35,75, misturando o
 * investimento da conta com as mensagens de uma campanha. Aqui sai de
 * R$ 615,90 ÷ 38 = R$ 16,21, e a fórmula está impressa embaixo do número.
 */
const faixaMensagens: FaixaIndicadores = {
  id: 'faixa_mensagens',
  escopo: { tipo: 'campanha', rotulo: 'campanha MENSAGENS — WHATSAPP' },
  metricas: [
    {
      id: 'mensagens_investimento',
      rotulo: 'Investimento',
      unidade: 'brl',
      valor: ok(615.9),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
    },
    {
      id: 'mensagens_cpm',
      rotulo: 'CPM',
      unidade: 'brl',
      valor: ok(14.93),
      origem: calculado('investimento da campanha ÷ impressões da campanha × 1.000'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'mensagens_cpc',
      rotulo: 'CPC',
      unidade: 'brl',
      valor: ok(2.3),
      origem: calculado('investimento da campanha ÷ cliques no link da campanha'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'mensagens_mensagens',
      rotulo: 'Mensagens iniciadas',
      unidade: 'inteiro',
      valor: ok(38),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
    },
    {
      id: 'mensagens_custo',
      rotulo: 'Custo por mensagem',
      unidade: 'brl',
      valor: ok(16.21),
      origem: calculado('investimento da campanha ÷ mensagens da campanha'),
      direcaoFavoravel: 'baixa',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B2 — tabela de campanhas                                            */
/* ------------------------------------------------------------------ */

const tabelaCampanhas: TabelaEntidades = {
  id: 'campanhas_meta',
  dimensao: 'campanha',
  rotuloDimensao: 'Campanha',
  escopo: { tipo: 'conta', rotulo: 'toda a conta de anúncios' },
  colunaPrincipal: 'investimento',
  colunas: [
    { id: 'investimento', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cpm', rotulo: 'CPM', unidade: 'brl', secundaria: true },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
    { id: 'mensagens', rotulo: 'Mensagens', unidade: 'inteiro' },
  ],
  linhas: [
    {
      id: 'camp_trafego',
      nome: 'TRÁFEGO — INSTITUCIONAL',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Tráfego',
      valores: {
        investimento: ok(742.6),
        cpm: ok(9.47),
        cpc: ok(0.23),
        /**
         * Traço, e não zero: esta campanha não foi comprada para gerar
         * conversa e não tem o evento. Zero aqui diria "tentamos e não veio",
         * que é uma afirmação diferente e falsa.
         */
        mensagens: naoSeAplica('Campanha de tráfego: o evento de mensagem não existe nela.'),
      },
    },
    {
      id: 'camp_mensagens',
      nome: 'MENSAGENS — WHATSAPP',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Mensagem',
      valores: {
        investimento: ok(615.9),
        cpm: ok(14.93),
        cpc: ok(2.3),
        mensagens: ok(38),
      },
    },
  ],
  total: {
    rotulo: 'Total da conta',
    valores: {
      investimento: ok(1358.5),
      cpm: ok(11.35),
      cpc: ok(0.39),
      mensagens: ok(38),
    },
  },
  definicoes: [
    'CPC neste cliente é o investimento dividido pelos cliques no link — os que levam ao destino do anúncio. Há clientes na carteira em que o CPC é calculado sobre todos os cliques, inclusive os que não saem do anúncio; são grandezas diferentes com o mesmo nome, e por isso a fórmula fica escrita.',
    'CPM é o investimento dividido pelas impressões, multiplicado por mil.',
    'O CPM e o CPC do total são da conta inteira: investimento total sobre impressões totais e sobre cliques totais. Não são a média das duas linhas.',
  ],
};

/* ------------------------------------------------------------------ */
/* B6 — investimento por região                                        */
/* ------------------------------------------------------------------ */

const quebraRegiao: QuebraPorDimensao = {
  id: 'regiao',
  plataforma: 'meta',
  escopo: { tipo: 'conta', rotulo: 'toda a conta de anúncios' },
  pergunta: 'Onde o investimento foi aplicado?',
  unidade: 'brl',
  unidadeTexto: 'Reais investidos no período',
  rotuloDimensao: 'Região',
  itens: [
    { id: 'mg', rotulo: 'Minas Gerais', valor: ok(612.4) },
    { id: 'go', rotulo: 'Goiás', valor: ok(498.15) },
    { id: 'mt', rotulo: 'Mato Grosso', valor: ok(214.8) },
    { id: 'ba', rotulo: 'Bahia', valor: ok(33.08) },
    {
      id: 'indeterminada',
      rotulo: 'Região não determinada',
      valor: ok(0.07),
      nota: 'É a própria Meta dizendo que não conseguiu identificar de onde veio esta parte do gasto. O valor continua no relatório e aparece como não determinado em vez de ser omitido.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B4 — rankings de criativos                                          */
/* ------------------------------------------------------------------ */

/**
 * Nesta demonstração nenhuma miniatura é carregada, e o motivo aparece dentro
 * do cartão. No relatório de verdade a imagem é baixada na geração do snapshot
 * e guardada por nós: o endereço que a Meta devolve é link assinado que
 * expira, e um relatório de julho aberto em outubro mostraria quadrados
 * vazios sem erro nenhum.
 */
const SEM_MINIATURA =
  'Miniatura não incluída nesta demonstração. No relatório real ela é baixada e guardada por nós.';

const criativosTrafego: RankingCriativos = {
  id: 'criativos_trafego',
  escopo: { tipo: 'campanha', rotulo: 'campanha TRÁFEGO — INSTITUCIONAL' },
  ordenadoPor: 'visitas ao perfil',
  criativos: [
    { id: 'ct1', nome: 'INST_CARROSSEL_PASTAGEM_01', valor: 1104 },
    { id: 'ct2', nome: 'INST_VIDEO_COLHEITA_03', valor: 812 },
    { id: 'ct3', nome: 'INST_ESTATICO_REBANHO_02', valor: 497 },
    { id: 'ct4', nome: 'INST_VIDEO_DEPOIMENTO_01', valor: 268 },
    { id: 'ct5', nome: 'INST_ESTATICO_MAQUINARIO_04', valor: 166 },
  ].map(({ id, nome, valor }) => ({
    id,
    nome,
    miniatura: null,
    motivoSemMiniatura: SEM_MINIATURA,
    numeros: [{ rotulo: 'Visitas ao perfil', valor: ok(valor), unidade: 'inteiro' as const }],
  })),
};

const criativosMensagens: RankingCriativos = {
  id: 'criativos_mensagens',
  escopo: { tipo: 'campanha', rotulo: 'campanha MENSAGENS — WHATSAPP' },
  ordenadoPor: 'mensagens iniciadas',
  criativos: [
    { id: 'cm1', nome: 'WPP_ESTATICO_CONSULTORIA_02', valor: 14 },
    { id: 'cm2', nome: 'WPP_VIDEO_VISITA_TECNICA_01', valor: 11 },
    { id: 'cm3', nome: 'WPP_CARROSSEL_SERVICOS_03', valor: 7 },
    { id: 'cm4', nome: 'WPP_ESTATICO_ORCAMENTO_01', valor: 4 },
    { id: 'cm5', nome: 'WPP_ESTATICO_CONTATO_05', valor: 2 },
  ].map(({ id, nome, valor }) => ({
    id,
    nome,
    miniatura: null,
    motivoSemMiniatura: SEM_MINIATURA,
    numeros: [{ rotulo: 'Mensagens iniciadas', valor: ok(valor), unidade: 'inteiro' as const }],
  })),
};

/* ------------------------------------------------------------------ */
/* O snapshot                                                          */
/* ------------------------------------------------------------------ */

export const ich202607: SnapshotMontado = {
  identidade: {
    relatorioId: 'demo-ich-2026-07',
    clienteSlug: 'ich_agropastoril',
    clienteNome: 'ICH Agropastoril',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'servicos_leads',
    // Sem `marca`: cai na Dácora. Decisão do Flávio em 2026-08-04 — nenhum
    // relatório leva identidade visual da Allgrotech, inclusive os clientes
    // daquela carteira.
    versaoSchema: '2026-08-w0',
  },

  fontes: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:12:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Os sete meses da evolução foram coletados um a um, cada mês na própria janela fechada.',
        'A quebra por região traz uma categoria de região não determinada; ela é valor da plataforma, não falha de coleta.',
      ],
    },
  ],

  montagem: [
    {
      bloco: 'B3',
      id: 'evolucao-mensal',
      titulo: 'O ano até aqui, mês a mês',
      apoio:
        'Cada mês foi coletado na própria janela fechada. Mês sem veiculação aparece dito, nunca como zero.',
      evolucao: 'evolucao_2026',
      apresentacao: 'tabela',
    },
    {
      bloco: 'B1',
      id: 'numeros-do-mes',
      titulo: 'Os números de julho',
      apoio:
        'Comparação com junho em todos os indicadores, sempre com o valor de junho ao lado. Alta não é boa automaticamente: depende do indicador.',
      faixa: 'faixa_conta',
      mostrarVariacao: true,
    },
    {
      bloco: 'B2',
      id: 'campanhas',
      titulo: 'Campanhas do mês',
      apoio:
        'Ordenadas por investimento. No celular, toque no + para ver todas as colunas de uma campanha.',
      tabela: 'campanhas_meta',
      pergunta: 'Quanto cada campanha consumiu e o que ela entregou?',
      participacaoRotulo: 'Participação no investimento',
    },
    {
      bloco: 'B6',
      id: 'regiao',
      titulo: 'Para onde o investimento foi',
      apoio: 'Distribuição do gasto do mês pela região que a plataforma atribuiu a cada exibição.',
      quebra: 'regiao',
    },
    {
      bloco: 'B1',
      id: 'trafego-numeros',
      titulo: 'Campanha de tráfego — os números',
      apoio:
        'Todos os valores desta seção são apenas desta campanha, inclusive os que são conta de divisão.',
      faixa: 'faixa_trafego',
      mostrarVariacao: false,
    },
    {
      bloco: 'B4',
      id: 'trafego-criativos',
      titulo: 'Campanha de tráfego — anúncios que mais levaram ao perfil',
      apoio: 'Anúncio sem resultado no período aparece com traço, não com zero.',
      ranking: 'criativos_trafego',
    },
    {
      bloco: 'B1',
      id: 'mensagens-numeros',
      titulo: 'Campanha de mensagens — os números',
      apoio:
        'Todos os valores desta seção são apenas desta campanha, inclusive os que são conta de divisão.',
      faixa: 'faixa_mensagens',
      mostrarVariacao: false,
    },
    {
      bloco: 'B4',
      id: 'mensagens-criativos',
      titulo: 'Campanha de mensagens — anúncios que mais iniciaram conversa',
      apoio: 'Anúncio sem resultado no período aparece com traço, não com zero.',
      ranking: 'criativos_mensagens',
    },
    {
      bloco: 'B7',
      id: 'glossario',
      titulo: 'O que cada termo quer dizer',
      apoio: 'Escrito uma vez e igual em todos os relatórios da carteira.',
      posicao: 'rodape',
      metricas: [
        'investimento',
        'impressoes',
        'cpm',
        'cliques',
        'cpc',
        'mensagens',
        'custo_por_mensagem',
        'visitas_perfil',
        'custo_por_visita',
        'regiao',
      ],
    },
  ],

  dados: {
    faixas: {
      faixa_conta: faixaConta,
      faixa_trafego: faixaTrafego,
      faixa_mensagens: faixaMensagens,
    },
    tabelas: { campanhas_meta: tabelaCampanhas },
    evolucoesMensais: { evolucao_2026: evolucaoMensal },
    rankingsCriativos: {
      criativos_trafego: criativosTrafego,
      criativos_mensagens: criativosMensagens,
    },
    quebras: { regiao: quebraRegiao },
  },

  /**
   * Nenhuma frase aqui explica CAUSA. Todas descrevem o que foi medido e
   * apontam para números que estão na página. O relatório de origem do ICH não
   * tem texto humano nenhum — metade dos seis relatórios validados não tem — e
   * mesmo assim é entregue ao cliente. A leitura automática existe para a
   * página não ficar muda; o comentário humano continua opcional.
   */
  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho teve R$ 1.358,50 investidos, 14,7% acima de junho, divididos entre duas campanhas: tráfego para o perfil e mensagens no WhatsApp.',
        sustentadaPor: ['conta_investimento', 'campanhas_meta'],
      },
      {
        texto:
          'As 38 conversas iniciadas são 7 a mais que em junho, e as 2.959 visitas ao perfil são 23,2% acima. O CPC caiu de R$ 0,44 para R$ 0,39.',
        sustentadaPor: ['conta_mensagens', 'conta_visitas', 'conta_cpc'],
      },
      {
        texto:
          'Minas Gerais e Goiás concentraram R$ 1.110,55 dos R$ 1.358,50 investidos. R$ 0,07 ficaram sem região identificada pela plataforma.',
        sustentadaPor: ['regiao'],
      },
    ],
    destaques: [
      {
        texto:
          'O custo por conversa iniciada foi de R$ 16,21, calculado sobre o investimento da própria campanha de mensagens.',
        sustentadaPor: ['mensagens_custo'],
      },
      {
        texto:
          'Cinco anúncios responderam pelas 2.847 visitas ao perfil da campanha de tráfego, e o primeiro sozinho por 1.104 delas.',
        sustentadaPor: ['criativos_trafego'],
      },
    ],
    atencao: [
      {
        texto:
          'O CPC da campanha de mensagens (R$ 2,30) é dez vezes o da campanha de tráfego (R$ 0,23). São públicos e objetivos diferentes, e este relatório não mede a causa da diferença.',
        sustentadaPor: ['mensagens_cpc', 'trafego_cpc'],
      },
      {
        texto:
          'Fevereiro não teve veiculação e por isso não entra em nenhuma média deste relatório.',
        sustentadaPor: ['evolucao_2026'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'Confirmar com a operação se o custo por mensagem deve ser lido sobre o investimento da campanha (R$ 16,21) ou sobre o investimento total da conta (R$ 35,75). Os dois números existem e respondem a perguntas diferentes.',
        sustentadaPor: ['mensagens_custo', 'conta_investimento'],
      },
    ],
  },

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'demo-ich-0001',
    geradoEm: '2026-08-01T07:20:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

export const competenciasIch: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
  { competencia: '2026-05', rotulo: 'Maio de 2026', publicada: false },
];
