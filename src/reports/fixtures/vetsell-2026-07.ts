/**
 * VetSell — julho de 2026. Fixture da W0.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │                                                                      │
 * │  Este repositório é PÚBLICO. Os valores foram construídos para serem  │
 * │  internamente coerentes — a soma das campanhas dá o total da conta, a │
 * │  soma dos criativos dá o total do grupo, e cada custo unitário é a    │
 * │  divisão exata dos dois números mostrados ao lado — e para exercitar  │
 * │  os casos difíceis do formato. Não descrevem a operação real.         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Segundo relatório montado pelo catálogo, e o primeiro a **reusar** as peças
 * em vez de estreá-las. Como o ICH, não depende de nada do conector: o
 * inventário fechou 31 de 33 itens, e os dois que faltam são justamente os que
 * nenhuma API tem.
 *
 * O que a VetSell exercita que o ICH não exercitou:
 *
 *  • **B4 com dois números por cartão** — resultado e custo por resultado.
 *  • **B4 com escopo de grupo.** "PEC. CORTE" e "OUTROS" não existem em API
 *    nenhuma: são convenção de quem monta o relatório. Aqui o grupo é
 *    declarado por **id de campanha**, e os ids aparecem impressos na
 *    etiqueta de escopo. Isso é o oposto de adivinhar pelo nome da campanha —
 *    que é como se faz hoje e é o que quebra quando alguém renomeia algo.
 *  • **B4 com situação do anúncio, traduzida e datada.**
 *  • **B8, comentário humano.** É o bloco que estreia aqui, e o único do
 *    relatório que pode dizer por quê.
 *  • **B6 sobre dia da semana** em vez de região — a mesma peça, outra
 *    dimensão, nenhum código novo.
 *
 * DUAS COISAS QUE ESTE RELATÓRIO FAZ DIFERENTE DO ORIGINAL:
 *
 *  1. **A situação do anúncio vem traduzida e com data.** O original imprime
 *     `ADSET_PAUSED` em inglês e sem data — e como é o status de hoje, um
 *     anúncio que rodou julho inteiro apareceria como pausado num relatório
 *     sobre julho.
 *  2. **O agrupamento é declarado, não deduzido.** No original ele existe só
 *     na cabeça de quem monta a página.
 *
 * E UMA DIVERGÊNCIA REAL QUE FICA REGISTRADA, NÃO ESCONDIDA. No cliente de
 * verdade, o relatório do Looker imprime consistentemente **menos** mensagens
 * do que a API devolve — dois a menos, em vários meses e campanhas, nunca a
 * mais. A hipótese mais óbvia (totais diferentes quando o dado é segmentado
 * por dia) foi testada e **refutada**: a soma dia a dia bate com o total. A
 * causa continua desconhecida, e resolve-se abrindo o Gerenciador de Anúncios
 * da conta — dez minutos de quem opera, e impossível por dedução. A regra vale
 * aqui como valeu no Pinterest: **publicamos o número da API e declaramos a
 * fonte; não ajustamos o número para bater com o relatório antigo.**
 */

import type { CompetenciaDisponivel, Valor } from '../snapshot';
import type {
  ComentarioHumano,
  Criativo,
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

const daMeta = () => ({ tipo: 'coletado' as const, fontes: ['meta' as const] });

const calculado = (formula: string) => ({
  tipo: 'calculado' as const,
  fontes: ['meta' as const],
  formula,
});

/** Momento único da leitura de situação dos anúncios. */
const LIDO_EM = '2026-08-01';

/* ------------------------------------------------------------------ */
/* B3 — evolução mensal                                                */
/* ------------------------------------------------------------------ */

const COLUNAS_MES = [
  { id: 'investimento', rotulo: 'Investimento', unidade: 'brl' as const },
  { id: 'cpm', rotulo: 'CPM', unidade: 'brl' as const, secundaria: true },
  { id: 'cpc', rotulo: 'CPC', unidade: 'brl' as const, secundaria: true },
  { id: 'mensagens', rotulo: 'Mensagens', unidade: 'inteiro' as const },
  { id: 'custo_msg', rotulo: 'Custo por mensagem', unidade: 'brl' as const },
];

const mes = (
  competencia: string,
  investimento: number,
  cpm: number,
  cpc: number,
  mensagens: number,
  custo: number,
) => ({
  competencia,
  valores: {
    investimento: ok(investimento),
    cpm: ok(cpm),
    cpc: ok(cpc),
    mensagens: ok(mensagens),
    custo_msg: ok(custo),
  },
});

const evolucaoMensal: EvolucaoMensal = {
  id: 'evolucao_2026',
  plataforma: 'meta',
  colunas: COLUNAS_MES,
  meses: [
    mes('2026-01', 8940.5, 6.61, 0.91, 702, 12.74),
    mes('2026-02', 7815.2, 7.05, 0.95, 614, 12.73),
    mes('2026-03', 6290.75, 7.84, 1.06, 471, 13.36),
    mes('2026-04', 5104.4, 8.36, 1.22, 352, 14.5),
    mes('2026-05', 6870.9, 9.95, 1.9, 402, 17.09),
    mes('2026-06', 7284.6, 11.92, 2.61, 361, 20.18),
    mes('2026-07', 8113.25, 12.31, 2.53, 408, 19.89),
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: {
      investimento: ok(50419.6),
      cpm: ok(8.64),
      cpc: ok(1.33),
      mensagens: ok(3310),
      custo_msg: ok(15.23),
    },
  },
  definicoes: [
    'O total é do período inteiro, não a média das linhas: CPM, CPC e custo por mensagem são o investimento acumulado dividido pelas impressões, pelos cliques e pelas mensagens acumuladas. A média simples dos sete CPCs mensais daria R$ 1,60 — os meses do começo do ano, com muito mais cliques, pesariam o mesmo que os do fim.',
    'Todos os meses foram coletados um a um, cada um na própria janela fechada.',
  ],
};

/* ------------------------------------------------------------------ */
/* B1 — faixas de indicadores                                          */
/* ------------------------------------------------------------------ */

const faixaAno: FaixaIndicadores = {
  id: 'faixa_ano',
  escopo: { tipo: 'ano', rotulo: 'todo o ano de 2026 até julho' },
  metricas: [
    {
      id: 'ano_investimento',
      rotulo: 'Investimento',
      unidade: 'brl',
      valor: ok(50419.6),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
    },
    {
      id: 'ano_cpm',
      rotulo: 'CPM',
      unidade: 'brl',
      valor: ok(8.64),
      origem: calculado('investimento do ano ÷ impressões do ano × 1.000'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'ano_cpc',
      rotulo: 'CPC',
      unidade: 'brl',
      valor: ok(1.33),
      origem: calculado('investimento do ano ÷ cliques no link do ano'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: 'ano_mensagens',
      rotulo: 'Mensagens iniciadas',
      unidade: 'inteiro',
      valor: ok(3310),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
    },
    {
      id: 'ano_custo_msg',
      rotulo: 'Custo por mensagem',
      unidade: 'brl',
      valor: ok(15.23),
      origem: calculado('investimento do ano ÷ mensagens do ano'),
      direcaoFavoravel: 'baixa',
    },
  ],
};

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
      valor: ok(8113.25),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
      comparativo: comparativoJunho(7284.6, 0.1138),
    },
    {
      id: 'conta_cpm',
      rotulo: 'CPM',
      unidade: 'brl',
      valor: ok(12.31),
      origem: calculado('investimento ÷ impressões × 1.000'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(11.92, 0.0326),
    },
    {
      id: 'conta_cpc',
      rotulo: 'CPC',
      unidade: 'brl',
      valor: ok(2.53),
      origem: calculado('investimento ÷ cliques no link'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(2.61, -0.0287),
    },
    {
      id: 'conta_mensagens',
      rotulo: 'Mensagens iniciadas',
      unidade: 'inteiro',
      valor: ok(408),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: comparativoJunho(361, 0.1302),
    },
    {
      id: 'conta_custo_msg',
      rotulo: 'Custo por mensagem',
      unidade: 'brl',
      valor: ok(19.89),
      origem: calculado('investimento ÷ mensagens'),
      direcaoFavoravel: 'baixa',
      comparativo: comparativoJunho(20.18, -0.0145),
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
    { id: 'custo_msg', rotulo: 'Custo por mensagem', unidade: 'brl' },
  ],
  linhas: [
    {
      id: 'camp_pec_corte',
      nome: 'MENSAGENS (WhatsApp) — PEC. CORTE',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Mensagem',
      valores: {
        investimento: ok(7412.3),
        cpm: ok(12.26),
        cpc: ok(2.61),
        mensagens: ok(388),
        custo_msg: ok(19.1),
      },
    },
    {
      id: 'camp_trafego',
      nome: 'TRÁFEGO (WhatsApp)',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Tráfego',
      valores: {
        investimento: ok(496.8),
        cpm: ok(11.5),
        cpc: ok(1.56),
        mensagens: ok(12),
        custo_msg: ok(41.4),
      },
    },
    {
      id: 'camp_pec_leite',
      nome: 'MENSAGENS (WhatsApp) — PEC. LEITE',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Mensagem',
      valores: {
        investimento: ok(204.15),
        cpm: ok(18.07),
        cpc: ok(4.34),
        mensagens: ok(8),
        custo_msg: ok(25.52),
      },
    },
  ],
  total: {
    rotulo: 'Total da conta',
    valores: {
      investimento: ok(8113.25),
      cpm: ok(12.31),
      cpc: ok(2.53),
      mensagens: ok(408),
      custo_msg: ok(19.89),
    },
  },
  definicoes: [
    'CPC neste cliente é o investimento dividido pelos cliques no link — os que levam ao destino do anúncio. Com todos os cliques, o CPC total sairia bem menor, e seria outra grandeza com o mesmo nome.',
    'CPM é o investimento dividido pelas impressões, multiplicado por mil.',
    'CPM, CPC e custo por mensagem do total são da conta inteira: cada um é o total de cima dividido pelo total de baixo, nunca a média das três linhas.',
  ],
};

/* ------------------------------------------------------------------ */
/* B6 — mensagens por dia da semana                                    */
/* ------------------------------------------------------------------ */

/**
 * Derivada da série diária no nosso código: a Meta devolve dia a dia, e o
 * agrupamento por dia da semana é conta nossa. Por isso ela existe mesmo sem
 * nenhum recurso novo do conector.
 */
const quebraDiaDaSemana: QuebraPorDimensao = {
  id: 'dia_da_semana',
  plataforma: 'meta',
  escopo: { tipo: 'conta', rotulo: 'toda a conta de anúncios' },
  pergunta: 'Em que dia da semana as conversas começam?',
  unidade: 'inteiro',
  unidadeTexto: 'Mensagens iniciadas no período',
  itens: [
    { id: 'dom', rotulo: 'Domingo', valor: ok(41) },
    { id: 'seg', rotulo: 'Segunda', valor: ok(48) },
    { id: 'ter', rotulo: 'Terça', valor: ok(54) },
    { id: 'qua', rotulo: 'Quarta', valor: ok(87) },
    { id: 'qui', rotulo: 'Quinta', valor: ok(71) },
    { id: 'sex', rotulo: 'Sexta', valor: ok(52) },
    { id: 'sab', rotulo: 'Sábado', valor: ok(55) },
  ],
};

/* ------------------------------------------------------------------ */
/* B4 — rankings de criativos, por grupo                               */
/* ------------------------------------------------------------------ */

const SEM_MINIATURA =
  'Miniatura não incluída nesta demonstração. No relatório real ela é baixada e guardada por nós.';

const criativo = (
  id: string,
  nome: string,
  mensagens: number,
  custo: number,
  situacao: 'ativa' | 'pausada',
): Criativo => ({
  id,
  nome,
  miniatura: null,
  motivoSemMiniatura: SEM_MINIATURA,
  numeros: [
    { rotulo: 'Mensagens iniciadas', valor: ok(mensagens), unidade: 'inteiro' },
    { rotulo: 'Custo por mensagem', valor: ok(custo), unidade: 'brl' },
  ],
  situacao: { situacao, lidaEm: LIDO_EM },
});

/**
 * O agrupamento é declarado por **id de campanha**, vindo do cadastro do
 * cliente. Não se deduz do nome: renomear uma campanha não pode mudar o que o
 * relatório afirma. Enquanto o campo de cadastro não existir na fábrica, um
 * cliente sem mapa recebe ranking único, sem grupos — e não um agrupamento
 * adivinhado.
 */
const rankingPecCorte: RankingCriativos = {
  id: 'criativos_pec_corte',
  escopo: {
    tipo: 'grupo',
    rotulo: 'grupo PEC. CORTE',
    campanhasDoGrupo: ['camp_pec_corte'],
  },
  ordenadoPor: 'mensagens iniciadas',
  criativos: [
    criativo('vc1', 'VS_PEC_CORTE_VIDEO_MANEJO_02', 132, 17.84, 'ativa'),
    criativo('vc2', 'VS_PEC_CORTE_ESTATICO_PESAGEM_01', 98, 19.26, 'ativa'),
    criativo('vc3', 'VS_PEC_CORTE_CARROSSEL_NUTRICAO_03', 74, 20.15, 'ativa'),
    criativo('vc4', 'VS_PEC_CORTE_VIDEO_DEPOIMENTO_04', 51, 22.9, 'ativa'),
    criativo('vc5', 'VS_PEC_CORTE_ESTATICO_PROMO_05', 33, 15.48, 'pausada'),
  ],
};

const rankingOutros: RankingCriativos = {
  id: 'criativos_outros',
  escopo: {
    tipo: 'grupo',
    rotulo: 'grupo OUTROS',
    campanhasDoGrupo: ['camp_trafego', 'camp_pec_leite'],
  },
  ordenadoPor: 'mensagens iniciadas',
  criativos: [
    criativo('vo1', 'VS_TRAFEGO_ESTATICO_INSTITUCIONAL_01', 7, 43.2, 'ativa'),
    criativo('vo2', 'VS_PEC_LEITE_ESTATICO_ORDENHA_01', 5, 24.63, 'ativa'),
    criativo('vo3', 'VS_TRAFEGO_VIDEO_MARCA_02', 5, 38.88, 'pausada'),
    criativo('vo4', 'VS_PEC_LEITE_CARROSSEL_LEITE_02', 3, 27.0, 'ativa'),
  ],
};

/* ------------------------------------------------------------------ */
/* B8 — comentário humano                                              */
/* ------------------------------------------------------------------ */

/**
 * O texto abaixo é inventado, mas o TIPO de conteúdo é o real: decisão
 * tomada, motivo e retorno do time do cliente. Repare no que ele faz e a
 * leitura automática não pode fazer — ele explica **por que** o custo por
 * mensagem subiu, e essa explicação não sai de nenhum número.
 */
const comentarioJulho: ComentarioHumano = {
  id: 'leitura_julho',
  paragrafos: [
    'Em 12/06 tiramos o Facebook das campanhas e ficamos só no Instagram, depois de o comercial de vocês avisar que boa parte das conversas vindas de lá não era de produtor rural. O volume de mensagens caiu no primeiro mês, como esperávamos, e voltou a subir em julho.',
    'O custo por mensagem está mais alto que no começo do ano porque a disputa por espaço encareceu — o CPM saiu de R$ 6,61 em janeiro para R$ 12,31 em julho. A leitura da equipe é que as conversas de agora chegam mais qualificadas, mas isso é percepção de quem atende, não medição deste relatório.',
  ],
  autor: 'Equipe Allgrotech',
  escritoEm: '2026-08-01',
};

/* ------------------------------------------------------------------ */
/* O snapshot                                                          */
/* ------------------------------------------------------------------ */

export const vetsell202607: SnapshotMontado = {
  identidade: {
    relatorioId: 'demo-vetsell-2026-07',
    clienteSlug: 'vetsell',
    clienteNome: 'VetSell',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'servicos_leads',
    marca: {
      id: 'allgrotech',
      nome: 'Allgrotech',
      assinatura: 'Allgrotech — operação conduzida em parceria com a Dácora',
    },
    versaoSchema: '2026-08-w0',
  },

  fontes: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:05:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Os sete meses da evolução foram coletados um a um, cada mês na própria janela fechada.',
        'A quebra por dia da semana é calculada por nós a partir da série diária que a plataforma devolve.',
        'A situação de cada anúncio foi lida em 01/08/2026 e é a de hoje, não a do período do relatório.',
      ],
    },
  ],

  montagem: [
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
      bloco: 'B8',
      id: 'leitura',
      titulo: 'Leitura da equipe',
      apoio:
        'Escrito por gente e assinado. É a única parte do relatório que explica causa — todo o resto descreve o que foi medido.',
      comentario: 'leitura_julho',
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
      pergunta: 'Quanto cada campanha consumiu e quantas conversas ela iniciou?',
      participacaoRotulo: 'Participação no investimento',
    },
    {
      bloco: 'B6',
      id: 'dia-da-semana',
      titulo: 'Em que dia as conversas começam',
      apoio:
        'Calculado por nós a partir do dia a dia do mês. Serve para decidir quando reforçar o atendimento, não para julgar campanha.',
      quebra: 'dia_da_semana',
    },
    {
      bloco: 'B4',
      id: 'criativos-pec-corte',
      titulo: 'PEC. CORTE — anúncios que mais iniciaram conversa',
      apoio: 'Cada cartão traz o resultado e o custo dele. Anúncio sem resultado aparece com traço.',
      ranking: 'criativos_pec_corte',
    },
    {
      bloco: 'B4',
      id: 'criativos-outros',
      titulo: 'Demais campanhas — anúncios que mais iniciaram conversa',
      apoio: 'Cada cartão traz o resultado e o custo dele. Anúncio sem resultado aparece com traço.',
      ranking: 'criativos_outros',
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
      ],
    },
  ],

  dados: {
    faixas: { faixa_ano: faixaAno, faixa_conta: faixaConta },
    tabelas: { campanhas_meta: tabelaCampanhas },
    evolucoesMensais: { evolucao_2026: evolucaoMensal },
    rankingsCriativos: {
      criativos_pec_corte: rankingPecCorte,
      criativos_outros: rankingOutros,
    },
    quebras: { dia_da_semana: quebraDiaDaSemana },
    comentarios: { leitura_julho: comentarioJulho },
  },

  /**
   * A leitura automática descreve; ela não explica. A frase sobre o CPM ter
   * subido diz que subiu e quanto — quem diz **por que** é o comentário
   * humano, na seção própria, assinado.
   */
  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho teve R$ 8.113,25 investidos e 408 conversas iniciadas, 11,4% e 13,0% acima de junho. O custo por conversa ficou em R$ 19,89, ante R$ 20,18 no mês anterior.',
        sustentadaPor: ['conta_investimento', 'conta_mensagens', 'conta_custo_msg'],
      },
      {
        texto:
          'A campanha PEC. CORTE respondeu por R$ 7.412,30 do investimento e por 388 das 408 conversas.',
        sustentadaPor: ['campanhas_meta'],
      },
      {
        texto:
          'No ano, são R$ 50.419,60 investidos e 3.310 conversas, a um custo médio de R$ 15,23 por conversa.',
        sustentadaPor: ['ano_investimento', 'ano_mensagens', 'ano_custo_msg'],
      },
    ],
    destaques: [
      {
        texto:
          'Quarta-feira concentrou 87 das 408 conversas do mês, mais que o dobro de domingo, que teve 41.',
        sustentadaPor: ['dia_da_semana'],
      },
      {
        texto:
          'O anúncio VS_PEC_CORTE_VIDEO_MANEJO_02 iniciou 132 conversas a R$ 17,84 cada, abaixo do custo médio da conta.',
        sustentadaPor: ['criativos_pec_corte', 'conta_custo_msg'],
      },
    ],
    atencao: [
      {
        texto:
          'O CPM subiu de R$ 6,61 em janeiro para R$ 12,31 em julho, e o custo por conversa acompanhou: de R$ 12,74 para R$ 19,89. Este relatório mede a alta; não mede a causa dela.',
        sustentadaPor: ['evolucao_2026'],
      },
      {
        texto:
          'A campanha de TRÁFEGO custou R$ 41,40 por conversa, mais que o dobro da PEC. CORTE. São objetivos diferentes e os dois números não medem a mesma coisa.',
        sustentadaPor: ['campanhas_meta'],
      },
      {
        texto:
          'Dois anúncios aparecem como pausados. A situação foi lida em 01/08/2026 e não diz que eles ficaram parados durante julho.',
        sustentadaPor: ['criativos_pec_corte', 'criativos_outros'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'Confirmar com quem atende se as conversas de quarta e quinta encontram o time disponível: os dois dias somam 158 das 408 do mês.',
        sustentadaPor: ['dia_da_semana'],
      },
    ],
  },

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'demo-vetsell-0001',
    geradoEm: '2026-08-01T07:15:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

export const competenciasVetsell: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
  { competencia: '2026-05', rotulo: 'Maio de 2026', publicada: false },
];
