/**
 * Dr. Flávio Zenun — julho de 2026. Fixture da W0.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │  Este repositório é PÚBLICO. Os valores fecham entre si e exercitam   │
 * │  os casos difíceis do formato; não descrevem a operação real.        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Terceiro relatório montado pelo catálogo, e o mais importante dos três para
 * quem for decidir o que fazer a seguir — porque é o primeiro que **não fecha**.
 *
 * O relatório do Zenun é o mais simples da carteira (só Google, nenhum texto
 * humano) e serve **três clientes**: ele, a Dra. Maria Nazaré e o Dr. Danilo
 * de Sá. Mesmo assim, três seções dele saem declaradas em vez de preenchidas.
 *
 * **Atualizado em 2026-08-05 — o motivo mudou para duas das três, e o texto
 * antigo aqui afirmava coisa que deixou de ser verdade.** O conector passou a
 * devolver os níveis abaixo de campanha (grupo de anúncios, palavra-chave e
 * termo de pesquisa) e a série diária, medidos contra a API real. Palavras-chave
 * e conversões por dia esperam agora a **montagem daqui**, não a integração. Só
 * a separação das conversões por tipo de ação continua faltando na fonte.
 *
 * Duas coisas que não mudaram e que a tela precisa continuar dizendo: a soma da
 * tabela de palavra-chave **não fecha** com o total da conta — parte do
 * investimento o Google não atribui a palavra nenhuma, e os canais sem busca não
 * têm palavra-chave —, e o nível que fecha ao centavo é o de grupo de anúncios.
 *
 * A escolha aqui foi **mostrar os buracos como buracos**. Não é o caminho mais
 * bonito; é o único que não produz uma tela que nunca se preenche sozinha. Se
 * as seções que faltam fossem apagadas da montagem, ninguém sentiria falta
 * delas — nem a Fernanda, nem nós daqui a três meses.
 *
 * DUAS DECISÕES DO FLÁVIO REGISTRADAS AQUI:
 *
 *  1. **Sem pizza.** O relatório de origem mostra "Tipo de Conversão" num
 *     gráfico de pizza de duas fatias. Ele fica fora do catálogo fechado de
 *     três tipos de gráfico, e a decisão foi substituí-lo por uma comparação
 *     entre categorias — que é o que o B6 já faz, entrega a mesma informação e
 *     é mais legível no celular. (Está declarado assim e indisponível por
 *     falta de dado, não por falta de gráfico.)
 *  2. **Os relatórios de origem mostram QUAIS dados apresentamos, não são
 *     gabarito de layout.** Por isso a página abaixo não tenta imitar a
 *     disposição do Looker; ela garante que toda leitura possível lá continue
 *     possível aqui.
 *
 * UMA COISA QUE ESTE RELATÓRIO FAZ E OS OUTROS DOIS NÃO FAZEM: um número
 * **derivado com trava**. Ver `impressaoPrimeiroLugar`, abaixo.
 */

import type { CompetenciaDisponivel, Valor } from '../snapshot';
import type {
  EvolucaoMensal,
  FaixaIndicadores,
  SnapshotMontado,
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

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
 * "Aparições no primeiro lugar" não sai do conector: falta o campo
 * `absolute_top_impression_percentage`. Ele **pode** ser derivado, porque as
 * duas famílias de métrica de posição do Google têm o mesmo denominador dentro
 * de si, então a razão entre "primeiro lugar" e "topo" é a mesma nas duas:
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
        'derivado das parcelas de posição da plataforma, enquanto o campo direto não é devolvido',
      ),
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: false,
        motivo:
          'é um número derivado enquanto a plataforma não devolve o campo direto, e comparar duas derivações acumularia o erro das duas.',
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
      situacao: 'parcial',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:02:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'A separação das conversões por tipo de ação continua não sendo devolvida pela nossa integração. A seção aparece no relatório dizendo isso.',
        'A série de conversões por dia e os números por palavra-chave passaram a ser devolvidos pela nossa integração. As duas seções ainda não foram montadas aqui, e aparecem no relatório dizendo isso.',
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
      indisponivel: {
        motivo:
          'Ainda não conseguimos separar as conversões por tipo de contato nesta fonte. O total do mês está correto e aparece na seção anterior — o que falta é a divisão entre conversa e ligação.',
        oQueTemos: ['O total de conversões do mês, e a comparação dele com o mês anterior.'],
        dependeDe:
          'Depende de uma alteração na nossa integração com a plataforma, já solicitada e em fila.',
      },
    },
    {
      bloco: 'B5',
      id: 'conversoes-por-dia',
      titulo: 'Como as conversões se distribuíram no mês',
      apoio: 'Dia a dia, para mostrar concentração e vazios ao longo do período.',
      serie: 'conversoes_dia',
      indisponivel: {
        motivo:
          'Esta seção ainda não foi montada. A fonte passou a devolver o dia a dia — o relatório da Karyne já mostra essa distribuição —, e o que falta agora é construirmos a seção aqui.',
        oQueTemos: ['O total do mês e a evolução mês a mês, que está mais abaixo.'],
        dependeDe: 'Depende só de montarmos a seção. A fonte já devolve o dia a dia.',
      },
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
      indisponivel: {
        motivo:
          'Esta seção ainda não foi montada. O resultado de cada palavra-chave passou a chegar da fonte, e o que falta agora é construirmos a tabela aqui.',
        oQueTemos: [
          'A lista das palavras-chave ativas e o tipo de correspondência de cada uma.',
          'O investimento e as conversões do conjunto, que estão na primeira seção. Eles vão continuar sendo maiores do que a soma desta tabela: parte do investimento o Google não atribui a palavra-chave nenhuma, e as campanhas que não são de busca não têm palavra-chave.',
        ],
        dependeDe: 'Depende só de montarmos a tabela. A fonte já devolve este nível.',
      },
    },
  ],

  dados: {
    faixas: { faixa_conta: faixaConta, faixa_ano: faixaAno },
    tabelas: {},
    evolucoesMensais: { evolucao_2026: evolucaoMensal },
    rankingsCriativos: {},
    quebras: {},
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
          'Três seções deste relatório estão incompletas, e cada uma diz no próprio lugar o que falta: duas esperam apenas ser montadas, e a separação das conversões por tipo de contato continua dependendo da nossa integração com a plataforma.',
        sustentadaPor: ['tipo-de-conversao', 'conversoes-por-dia', 'palavras-chave'],
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
          '"Aparições no primeiro lugar" é um número derivado enquanto a plataforma não devolve o campo direto. Ele não entra em comparação com meses anteriores.',
        sustentadaPor: ['aparicoes_primeiro'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'Nenhuma das três seções incompletas afeta os números que já estão neste relatório. Duas delas esperam só a montagem; a separação das conversões por tipo de contato segue na fila da integração.',
        sustentadaPor: ['tipo-de-conversao', 'conversoes-por-dia', 'palavras-chave'],
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
