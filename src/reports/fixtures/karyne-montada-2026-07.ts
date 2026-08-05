/**
 * Karyne Magalhães — julho de 2026. Fixture da W0, montada pelo CATÁLOGO.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │  Este repositório é PÚBLICO. Os valores fecham entre si e exercitam   │
 * │  os casos difíceis do formato; não descrevem a operação real.        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Quarto relatório montado pelo catálogo, e o primeiro **com duas
 * plataformas**. Ele existe para exercitar três coisas que os três anteriores
 * não exercitaram:
 *
 *  1. **B3 como gráfico**, e não como tabela. É o mesmo bloco e o mesmo dado —
 *     só muda o parâmetro `apresentacao`. Ver a decisão do eixo duplo abaixo;
 *  2. **B5 com dado de verdade.** O bloco passou meses declarado e sem
 *     renderizador porque a série diária de Google não existia; ela passou a
 *     existir em 2026-08-04 e o bloco foi construído no mesmo dia;
 *  3. **duas plataformas na mesma montagem**, com o escopo de cada seção
 *     impresso — para nenhum número de Meta ser lido como se fosse de Google.
 *
 * ---
 *
 * A DECISÃO DO EIXO DUPLO, que é o que este relatório tem de mais importante.
 *
 * O relatório de origem da Karyne apresenta a evolução mensal em **barra +
 * linha com dois eixos Y**: o investimento numa escala, o resultado na outra.
 * Nós não reproduzimos isso, e a recusa não é de gosto.
 *
 * Com dois eixos, quem monta o gráfico escolhe — de propósito ou sem querer —
 * onde as duas curvas se cruzam, porque cada escala pode ser cortada num ponto
 * diferente. Quem lê enxerga "o resultado acompanha o investimento" ou "o
 * resultado descolou do investimento" a partir de um cruzamento que é artefato
 * da escala, não medição. Isso é exatamente a **causa inventada** que as regras
 * da casa proíbem — só que desenhada em vez de escrita, o que a torna mais
 * difícil de perceber e mais fácil de acreditar.
 *
 * No lugar vão dois painéis lado a lado, um por métrica, com os mesmos meses.
 * Toda leitura que a Fernanda faz hoje continua possível: cada métrica mês a
 * mês, o mês de pico, a tendência do ano e o total do período. O que deixa de
 * existir é a sugestão de relação entre as duas.
 *
 * ---
 *
 * AS TRÊS TABELAS DE GOOGLE, montadas em 2026-08-05.
 *
 * A página de Google da Karyne tem três tabelas abaixo do nível de campanha:
 * grupo de anúncios, palavra-chave e termo de pesquisa. A tabela por grupo é o
 * **corpo** daquela página. As três passaram meses declaradas como indisponíveis
 * — primeiro porque a integração devolvia Google só em nível de campanha,
 * depois, por um dia, porque a montagem ainda não existia aqui.
 *
 * **O que elas exercitam, e é a razão de esta ter sido a primeira carteira a
 * recebê-las: nem toda tabela fecha com o total, e a diferença entre as que
 * fecham e as que não fecham não pode ficar por conta do leitor.**
 *
 *  • **grupo de anúncios fecha ao centavo** — investimento, cliques e conversões
 *    batem exatamente com a faixa de indicadores acima;
 *  • **palavra-chave e termo de pesquisa não fecham, por natureza.** Parte do
 *    investimento o Google não atribui a palavra nenhuma; Display, Vídeo,
 *    Performance Max, Shopping e Demand Gen não têm palavra-chave; e o termo
 *    pesquisado poucas vezes é omitido por privacidade. A leitura honesta é
 *    "as palavras-chave somam X dos Y da conta" — apresentar X como total é
 *    erro, e é o erro que a `cobertura` do bloco existe para impedir.
 *
 * A `cobertura` é a capacidade nova que esta montagem pediu ao catálogo, e ela
 * aparece **acima** da tabela de propósito: quem lê números lê as notas depois,
 * se ler. Um aviso embaixo chegaria tarde, com a coluna já somada.
 *
 * O lead da Karyne é `messaging_conversation_started_7d`, definido por gente
 * no cadastro. **Não** é o `instagram_profile_visits` que o conector escolhe
 * sozinho quando ninguém diz qual evento conta.
 */

import type { CompetenciaDisponivel, Serie, Valor } from '../snapshot';
import type {
  EvolucaoMensal,
  FaixaIndicadores,
  RankingCriativos,
  SnapshotMontado,
  TabelaEntidades,
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

const naoSeAplica = (motivo: string): Valor => ({ estado: 'nao_aplicavel', motivo });

const daMeta = () => ({ tipo: 'coletado' as const, fontes: ['meta' as const] });
const doGoogle = () => ({ tipo: 'coletado' as const, fontes: ['google' as const] });

const calculadoMeta = (formula: string) => ({
  tipo: 'calculado' as const,
  fontes: ['meta' as const],
  formula,
});

const calculadoGoogle = (formula: string) => ({
  tipo: 'calculado' as const,
  fontes: ['google' as const],
  formula,
});

const contraJunho = (valorBase: number, variacao: number) => ({
  permitido: true,
  competenciaBase: '2026-06',
  valorBase: ok(valorBase),
  variacao,
});

/* ------------------------------------------------------------------ */
/* B1 — os números de Meta                                             */
/* ------------------------------------------------------------------ */

const faixaMeta: FaixaIndicadores = {
  id: 'faixa_meta',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Meta Ads' },
  metricas: [
    {
      id: 'meta_investimento',
      rotulo: 'Investimento',
      glossarioId: 'investimento',
      unidade: 'brl',
      valor: ok(863.91),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
      comparativo: contraJunho(792.4, 0.0903),
    },
    {
      id: 'meta_cpm',
      rotulo: 'CPM',
      glossarioId: 'cpm',
      unidade: 'brl',
      valor: ok(14.82),
      origem: daMeta(),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(13.94, 0.0631),
    },
    {
      id: 'meta_cpc',
      rotulo: 'CPC',
      glossarioId: 'cpc',
      unidade: 'brl',
      /**
       * R$ 1,39 = 863,91 ÷ 621 cliques NO LINK.
       *
       * A armadilha mais cara do catálogo inteiro. O campo `cpc` que o conector
       * devolve usa cliques TOTAIS e daria R$ 1,00 — 39% menor, sem nada
       * parecer errado na tela. São grandezas diferentes com o mesmo nome, e a
       * conferência em vinte medições independentes mostrou que o número que a
       * agência entrega é o do clique no link, em quatro clientes da carteira.
       * Por isso a fórmula é impressa na tela e não fica só neste comentário.
       */
      valor: ok(1.39),
      origem: calculadoMeta('investimento ÷ cliques no link'),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(1.46, -0.0479),
    },
    {
      id: 'meta_mensagens',
      rotulo: 'Mensagens iniciadas',
      glossarioId: 'mensagens',
      unidade: 'inteiro',
      valor: ok(74),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(63, 0.1746),
    },
    {
      id: 'meta_custo_mensagem',
      rotulo: 'Custo por mensagem',
      glossarioId: 'custo_por_mensagem',
      unidade: 'brl',
      valor: ok(11.67),
      origem: calculadoMeta('investimento ÷ mensagens iniciadas, ambos da conta inteira'),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(12.58, -0.0723),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B1 — os números de Google                                           */
/* ------------------------------------------------------------------ */

const faixaGoogle: FaixaIndicadores = {
  id: 'faixa_google',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Google Ads' },
  metricas: [
    {
      id: 'google_investimento',
      rotulo: 'Investimento',
      glossarioId: 'investimento',
      unidade: 'brl',
      valor: ok(1000.98),
      origem: doGoogle(),
      direcaoFavoravel: 'neutra',
      comparativo: contraJunho(948.15, 0.0557),
    },
    {
      id: 'google_cliques',
      rotulo: 'Cliques',
      glossarioId: 'cliques',
      unidade: 'inteiro',
      valor: ok(501),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(462, 0.0844),
    },
    {
      id: 'google_ctr',
      rotulo: 'CTR',
      glossarioId: 'ctr',
      unidade: 'percentual',
      valor: ok(0.089),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(0.0842, 0.057),
    },
    {
      id: 'google_conversoes',
      rotulo: 'Conversões',
      glossarioId: 'conversoes',
      unidade: 'inteiro',
      valor: ok(21),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(18, 0.1667),
    },
    {
      id: 'google_custo_conversao',
      rotulo: 'Custo por conversão',
      glossarioId: 'custo_por_conversao',
      unidade: 'brl',
      valor: ok(47.67),
      origem: calculadoGoogle('investimento ÷ conversões'),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(52.68, -0.0951),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B3 — evolução mensal, uma por plataforma                            */
/* ------------------------------------------------------------------ */

/**
 * Duas métricas por plataforma, que é o que o relatório de origem mostra no
 * gráfico de eixo duplo. Aqui elas viram um painel cada.
 *
 * Março tem observação e valores ausentes na Meta: **não houve veiculação**.
 * Isso é diferente de "veiculou e não deu resultado", e a distinção aparece na
 * tela — o painel escreve a observação ao lado do mês em vez de desenhar uma
 * barra de tamanho zero, que seria lida como resultado nulo.
 */
const evolucaoMeta: EvolucaoMensal = {
  id: 'evolucao_meta_2026',
  plataforma: 'meta',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'mensagens', rotulo: 'Mensagens iniciadas', unidade: 'inteiro' },
  ],
  meses: [
    { competencia: '2026-01', valores: { custo: ok(612.3), mensagens: ok(44) } },
    { competencia: '2026-02', valores: { custo: ok(658.75), mensagens: ok(49) } },
    {
      competencia: '2026-03',
      valores: {
        custo: { estado: 'nao_aplicavel', motivo: 'sem veiculação no mês' },
        mensagens: { estado: 'nao_aplicavel', motivo: 'sem veiculação no mês' },
      },
      observacao: 'sem veiculação',
    },
    { competencia: '2026-04', valores: { custo: ok(724.1), mensagens: ok(56) } },
    { competencia: '2026-05', valores: { custo: ok(768.45), mensagens: ok(58) } },
    { competencia: '2026-06', valores: { custo: ok(792.4), mensagens: ok(63) } },
    { competencia: '2026-07', valores: { custo: ok(863.91), mensagens: ok(74) } },
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: { custo: ok(4419.91), mensagens: ok(344) },
  },
  definicoes: [
    'O total é do período inteiro, e março não entra nele porque não houve veiculação — não é um mês de resultado zero.',
    'Cada mês foi coletado na própria janela fechada.',
  ],
};

const evolucaoGoogle: EvolucaoMensal = {
  id: 'evolucao_google_2026',
  plataforma: 'google',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'conversoes', rotulo: 'Conversões', unidade: 'inteiro' },
  ],
  meses: [
    { competencia: '2026-01', valores: { custo: ok(742.6), conversoes: ok(12) } },
    { competencia: '2026-02', valores: { custo: ok(806.35), conversoes: ok(14) } },
    { competencia: '2026-03', valores: { custo: ok(838.9), conversoes: ok(13) } },
    { competencia: '2026-04', valores: { custo: ok(901.25), conversoes: ok(16) } },
    { competencia: '2026-05', valores: { custo: ok(922.7), conversoes: ok(15) } },
    { competencia: '2026-06', valores: { custo: ok(948.15), conversoes: ok(18) } },
    { competencia: '2026-07', valores: { custo: ok(1000.98), conversoes: ok(21) } },
  ],
  total: {
    rotulo: 'Total do ano até aqui',
    valores: { custo: ok(6160.93), conversoes: ok(109) },
  },
  definicoes: ['Cada mês foi coletado na própria janela fechada.'],
};

/* ------------------------------------------------------------------ */
/* B4 — ranking de criativos da Meta                                   */
/* ------------------------------------------------------------------ */

/**
 * Um número por cartão, que é o formato da Karyne — diferente da VetSell e da
 * Aviarte, que mostram resultado e custo por resultado. Isso é parâmetro de
 * montagem, não bloco diferente.
 *
 * O terceiro criativo não tem miniatura guardada, e o motivo é impresso. Vale
 * repetir por que a imagem é guardada por nós: o endereço que a Meta devolve é
 * link assinado que expira, e um relatório de julho aberto em outubro mostraria
 * quadrados vazios sem erro nenhum.
 */
const rankingMeta: RankingCriativos = {
  id: 'ranking_meta',
  escopo: { tipo: 'plataforma', rotulo: 'campanhas de mensagem do Meta Ads' },
  ordenadoPor: 'mensagens iniciadas',
  criativos: [
    {
      id: 'cr_01',
      nome: 'Carrossel — Antes e depois',
      miniatura: null,
      motivoSemMiniatura: 'a imagem deste anúncio não foi guardada nesta demonstração',
      numeros: [{ rotulo: 'Mensagens', valor: ok(31), unidade: 'inteiro' }],
      situacao: { situacao: 'ativa', lidaEm: '2026-08-01T07:05:00-03:00' },
    },
    {
      id: 'cr_02',
      nome: 'Vídeo — Depoimento da paciente',
      miniatura: null,
      motivoSemMiniatura: 'a imagem deste anúncio não foi guardada nesta demonstração',
      numeros: [{ rotulo: 'Mensagens', valor: ok(24), unidade: 'inteiro' }],
      situacao: { situacao: 'ativa', lidaEm: '2026-08-01T07:05:00-03:00' },
    },
    {
      id: 'cr_03',
      nome: 'Estático — Agenda de agosto',
      miniatura: null,
      motivoSemMiniatura: 'este anúncio foi encerrado antes da geração do relatório',
      numeros: [{ rotulo: 'Mensagens', valor: ok(19), unidade: 'inteiro' }],
      /**
       * Situação datada, e a data importa: este anúncio rodou julho inteiro e
       * foi pausado em agosto. Sem a data, "Pausado" num relatório sobre julho
       * faria o cliente concluir que ele não rodou.
       */
      situacao: { situacao: 'pausada', lidaEm: '2026-08-01T07:05:00-03:00' },
    },
    {
      id: 'cr_04',
      nome: 'Estático — Localização do consultório',
      miniatura: null,
      motivoSemMiniatura: 'a imagem deste anúncio não foi guardada nesta demonstração',
      numeros: [
        {
          rotulo: 'Mensagens',
          /**
           * Criativo que rodou e não trouxe mensagem: zero é medição de
           * verdade aqui, e é diferente de ausência. Ele aparece com o zero, e
           * não sumindo da lista.
           */
          valor: ok(0),
          unidade: 'inteiro',
        },
      ],
      situacao: { situacao: 'ativa', lidaEm: '2026-08-01T07:05:00-03:00' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B5 — conversões por dia, no Google                                  */
/* ------------------------------------------------------------------ */

/**
 * A série que destravou o B5.
 *
 * Estrutura fiel ao que o conector passou a devolver: uma linha por dia do
 * período, com um marcador de veiculação por dia. Dia sem veiculação vira
 * `null` — lacuna preservada — e o gráfico interrompe a linha nele em vez de
 * atravessar por cima. Dia que veiculou e não converteu é zero de verdade e
 * desenha ponto na base. As duas coisas parecem iguais num gráfico descuidado
 * e são leituras opostas.
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
    { data: '2026-07-03', valores: { conversoes: 1 } },
    { data: '2026-07-04', valores: { conversoes: 0 } },
    { data: '2026-07-05', valores: { conversoes: 0 } },
    { data: '2026-07-06', valores: { conversoes: 1 } },
    { data: '2026-07-07', valores: { conversoes: 0 } },
    { data: '2026-07-08', valores: { conversoes: 0 } },
    { data: '2026-07-09', valores: { conversoes: 1 } },
    { data: '2026-07-10', valores: { conversoes: 1 } },
    { data: '2026-07-11', valores: { conversoes: 2 } },
    { data: '2026-07-12', valores: { conversoes: 1 } },
    { data: '2026-07-13', valores: { conversoes: 2 } },
    { data: '2026-07-14', valores: { conversoes: 1 } },
    { data: '2026-07-15', valores: { conversoes: 1 } },
    { data: '2026-07-16', valores: { conversoes: 0 } },
    { data: '2026-07-17', valores: { conversoes: 1 } },
    { data: '2026-07-18', valores: { conversoes: 1 } },
    /* Dois dias sem veiculação: lacuna, não zero. */
    { data: '2026-07-19', valores: { conversoes: null } },
    { data: '2026-07-20', valores: { conversoes: null } },
    { data: '2026-07-21', valores: { conversoes: 1 } },
    { data: '2026-07-22', valores: { conversoes: 0 } },
    { data: '2026-07-23', valores: { conversoes: 0 } },
    { data: '2026-07-24', valores: { conversoes: 0 } },
    { data: '2026-07-25', valores: { conversoes: 0 } },
    { data: '2026-07-26', valores: { conversoes: 1 } },
    { data: '2026-07-27', valores: { conversoes: 2 } },
    { data: '2026-07-28', valores: { conversoes: 0 } },
    { data: '2026-07-29', valores: { conversoes: 2 } },
    { data: '2026-07-30', valores: { conversoes: 0 } },
    { data: '2026-07-31', valores: { conversoes: 1 } },
  ],
  observacoes: [
    'Os dias 19 e 20 aparecem como interrupção da linha, e não como zero: não houve veiculação neles. Um dia que veiculou e não converteu aparece como zero, apoiado na base do gráfico.',
    'A soma dos dias é 21, o mesmo total de conversões da seção do Google acima.',
  ],
};

/* ------------------------------------------------------------------ */
/* B2 — as três tabelas abaixo de campanha, no Google                  */
/* ------------------------------------------------------------------ */

/**
 * As três juntas são o corpo da página de Google, e existem para exercitar a
 * diferença que mais engana neste relatório: **uma delas fecha com a conta e as
 * outras duas não fecham, por natureza.**
 *
 * A soma dos grupos bate exatamente com os R$ 1.000,98, os 501 cliques e as 21
 * conversões da faixa acima — nas quatro métricas, sem arredondamento. Já as
 * palavras-chave somam R$ 604,22 e os termos, R$ 318,45. Nenhum dos dois é o
 * gasto do mês, e é por isso que os dois levam `cobertura` e o de grupos não.
 */

const CPC_FORMULA = 'CPC: investimento ÷ cliques.';
const CUSTO_CONVERSAO_FORMULA = 'Custo por conversão: investimento ÷ conversões.';

/**
 * Fecha ao centavo com a conta. O último grupo é o caso que a fonte devolve e
 * que quase todo relatório imprime errado: **grupo pausado que não veiculou no
 * período.** Investimento, cliques e conversões são `0` — a linha existiu e não
 * acumulou nada, o que é medição. Mas CTR e CPC não são zero: sem impressão,
 * eles são divisão por zero, uma pergunta que não se faz. Imprimir `0,00` ali
 * afirmaria "seu anúncio apareceu e ninguém clicou", que é o oposto do que
 * aconteceu.
 */
const tabelaGrupos: TabelaEntidades = {
  id: 'grupos_de_anuncios',
  dimensao: 'grupo_de_anuncios',
  rotuloDimensao: 'Grupo de anúncios',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Google Ads' },
  colunaPrincipal: 'custo',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cliques', rotulo: 'Cliques', unidade: 'inteiro' },
    { id: 'ctr', rotulo: 'CTR', unidade: 'percentual', secundaria: true },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
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
      id: 'grupo_tratamento',
      nome: 'Halitose — Tratamento',
      plataforma: 'google',
      situacao: 'ativa',
      valores: {
        custo: ok(412.6),
        cliques: ok(198),
        ctr: ok(0.0941),
        cpc: ok(2.08),
        conversoes: ok(9),
        custo_conversao: ok(45.84),
      },
    },
    {
      id: 'grupo_causas',
      nome: 'Halitose — Causas',
      plataforma: 'google',
      situacao: 'ativa',
      valores: {
        custo: ok(246.15),
        cliques: ok(131),
        ctr: ok(0.0869),
        cpc: ok(1.88),
        conversoes: ok(5),
        custo_conversao: ok(49.23),
      },
    },
    {
      id: 'grupo_sintomas',
      nome: 'Mau hálito — Sintomas',
      plataforma: 'google',
      situacao: 'ativa',
      valores: {
        custo: ok(188.44),
        cliques: ok(96),
        ctr: ok(0.0786),
        cpc: ok(1.96),
        conversoes: ok(4),
        custo_conversao: ok(47.11),
      },
    },
    {
      id: 'grupo_dentista',
      nome: 'Halitose — Dentista',
      plataforma: 'google',
      situacao: 'ativa',
      valores: {
        custo: ok(153.79),
        cliques: ok(76),
        ctr: ok(0.0936),
        cpc: ok(2.02),
        conversoes: ok(3),
        custo_conversao: ok(51.26),
      },
    },
    {
      id: 'grupo_institucional',
      nome: 'Halitose — Institucional',
      plataforma: 'google',
      situacao: 'pausada',
      etiqueta: 'Sem veiculação em julho',
      valores: {
        custo: ok(0),
        cliques: ok(0),
        ctr: naoSeAplica('Sem impressão no período: o CTR seria uma divisão por zero.'),
        cpc: naoSeAplica('Sem clique no período: o CPC seria uma divisão por zero.'),
        conversoes: ok(0),
        custo_conversao: naoSeAplica('Sem conversão e sem investimento no período.'),
      },
    },
  ],
  total: {
    rotulo: 'Total da conta',
    valores: {
      custo: ok(1000.98),
      cliques: ok(501),
      ctr: ok(0.0888),
      cpc: ok(2.0),
      conversoes: ok(21),
      custo_conversao: ok(47.67),
    },
  },
  definicoes: [
    CPC_FORMULA,
    CUSTO_CONVERSAO_FORMULA,
    'CTR: cliques ÷ impressões.',
    'Este é o único nível abaixo de campanha cuja soma fecha com o total da conta: investimento, cliques e conversões batem exatamente com a seção anterior.',
  ],
};

/**
 * Não fecha, e a `cobertura` diz de quanto é a diferença antes de a tabela ser
 * lida. A regra que ela protege: **apresentar os R$ 604,22 como total seria
 * erro** — o gasto do mês é R$ 1.000,98, e o resto foi para lugares que não têm
 * palavra-chave.
 */
const tabelaPalavrasChave: TabelaEntidades = {
  id: 'palavras_chave',
  dimensao: 'palavra_chave',
  rotuloDimensao: 'Palavra-chave',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Google Ads' },
  cobertura: {
    universo: 'toda a conta do Google Ads',
    colunaId: 'custo',
    totalDoUniverso: ok(1000.98),
    motivos: [
      'Parte do investimento da busca o Google não atribui a nenhuma palavra-chave comprada.',
      'Campanhas que não são de rede de pesquisa — vídeo, display e Performance Max — não têm palavra-chave, por definição.',
    ],
  },
  colunaPrincipal: 'custo',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cliques', rotulo: 'Cliques', unidade: 'inteiro' },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
    { id: 'conversoes', rotulo: 'Conversões', unidade: 'inteiro' },
  ],
  linhas: [
    {
      id: 'kw_tratamento',
      nome: 'tratamento halitose',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: { custo: ok(182.4), cliques: ok(84), cpc: ok(2.17), conversoes: ok(5) },
    },
    {
      id: 'kw_mau_halito',
      nome: 'mau hálito o que fazer',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: { custo: ok(141.88), cliques: ok(71), cpc: ok(2.0), conversoes: ok(4) },
    },
    {
      id: 'kw_cura',
      nome: 'halitose tem cura',
      plataforma: 'google',
      etiqueta: 'Correspondência exata',
      valores: { custo: ok(118.6), cliques: ok(62), cpc: ok(1.91), conversoes: ok(3) },
    },
    {
      id: 'kw_dentista',
      nome: 'dentista halitose',
      plataforma: 'google',
      etiqueta: 'Correspondência de frase',
      valores: { custo: ok(84.15), cliques: ok(41), cpc: ok(2.05), conversoes: ok(2) },
    },
    {
      id: 'kw_porque',
      nome: 'por que meu hálito é ruim',
      plataforma: 'google',
      etiqueta: 'Correspondência ampla',
      valores: { custo: ok(51.77), cliques: ok(27), cpc: ok(1.92), conversoes: ok(1) },
    },
    {
      id: 'kw_manha',
      nome: 'hálito ruim de manhã',
      plataforma: 'google',
      etiqueta: 'Correspondência ampla',
      valores: { custo: ok(25.42), cliques: ok(14), cpc: ok(1.82), conversoes: ok(0) },
    },
  ],
  total: {
    rotulo: 'Soma das palavras-chave listadas',
    valores: {
      custo: ok(604.22),
      cliques: ok(299),
      cpc: ok(2.02),
      conversoes: ok(15),
    },
  },
  definicoes: [
    CPC_FORMULA,
    'A correspondência ao lado de cada palavra diz o quanto o Google pode se afastar do que foi comprado: exata mostra o anúncio só para aquela busca; frase e ampla aceitam variações, e a ampla é a mais larga das três.',
    'A soma desta tabela é menor que o investimento do mês de propósito — o motivo está no aviso acima dela.',
  ],
};

/**
 * A que menos cobre das três, e por um motivo diferente do das palavras-chave:
 * aqui o Google **omite** o termo que foi pesquisado poucas vezes, para não
 * identificar quem pesquisou. Não é lacuna de coleta e não tem conserto do
 * nosso lado — tem que ser dito.
 */
const tabelaTermos: TabelaEntidades = {
  id: 'termos_de_pesquisa',
  dimensao: 'termo_de_pesquisa',
  rotuloDimensao: 'Termo pesquisado',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Google Ads' },
  cobertura: {
    universo: 'toda a conta do Google Ads',
    colunaId: 'custo',
    totalDoUniverso: ok(1000.98),
    motivos: [
      'O Google não informa o termo pesquisado quando ele apareceu poucas vezes no período — é uma proteção de privacidade de quem pesquisou, e vale para toda conta.',
      'Campanhas de Performance Max não devolvem o termo digitado, apenas categorias agrupadas.',
      'Parte do investimento vai para redes que não são de pesquisa, onde não existe termo digitado.',
    ],
  },
  colunaPrincipal: 'custo',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cliques', rotulo: 'Cliques', unidade: 'inteiro' },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
    { id: 'conversoes', rotulo: 'Conversões', unidade: 'inteiro' },
  ],
  linhas: [
    {
      id: 'termo_como_tratar',
      nome: 'como tratar halitose',
      plataforma: 'google',
      etiqueta: 'Já adicionada como palavra-chave',
      valores: { custo: ok(78.2), cliques: ok(36), cpc: ok(2.17), conversoes: ok(2) },
    },
    {
      id: 'termo_causas',
      nome: 'mau hálito causas',
      plataforma: 'google',
      valores: { custo: ok(64.55), cliques: ok(31), cpc: ok(2.08), conversoes: ok(1) },
    },
    {
      id: 'termo_cura_mesmo',
      nome: 'halitose tem cura mesmo',
      plataforma: 'google',
      valores: { custo: ok(52.9), cliques: ok(26), cpc: ok(2.03), conversoes: ok(1) },
    },
    {
      id: 'termo_especialista',
      nome: 'dentista especialista em mau hálito',
      plataforma: 'google',
      valores: { custo: ok(47.3), cliques: ok(22), cpc: ok(2.15), conversoes: ok(1) },
    },
    {
      id: 'termo_escovando',
      nome: 'hálito ruim mesmo escovando',
      plataforma: 'google',
      valores: { custo: ok(41.15), cliques: ok(19), cpc: ok(2.17), conversoes: ok(0) },
    },
    {
      id: 'termo_preco',
      nome: 'tratamento para mau hálito preço',
      plataforma: 'google',
      valores: { custo: ok(34.35), cliques: ok(16), cpc: ok(2.15), conversoes: ok(0) },
    },
  ],
  total: {
    rotulo: 'Soma dos termos listados',
    valores: {
      custo: ok(318.45),
      cliques: ok(150),
      cpc: ok(2.12),
      conversoes: ok(5),
    },
  },
  definicoes: [
    CPC_FORMULA,
    'Termo pesquisado é o que a pessoa digitou; palavra-chave é o que foi comprado. Os dois raramente são iguais, e é por isso que as duas tabelas existem.',
    'A soma desta tabela é menor que o investimento do mês de propósito — os motivos estão no aviso acima dela.',
  ],
};

/* ------------------------------------------------------------------ */
/* O snapshot                                                          */
/* ------------------------------------------------------------------ */

export const karyneMontada202607: SnapshotMontado = {
  identidade: {
    relatorioId: 'demo-karyne-2026-07',
    clienteSlug: 'karyne_magalhaes',
    clienteNome: 'Karyne Magalhães',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'servicos_leads',
    versaoSchema: '2026-08-w0',
  },

  fontes: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:02:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'O resultado desta conta é conversa iniciada por mensagem. É o evento que representa o lead desta cliente, definido no cadastro dela — não é escolha automática da plataforma.',
        'O CPC apresentado é o investimento dividido pelos cliques no link, que é a definição usada nos relatórios desta carteira. O campo equivalente da plataforma usa cliques totais e daria um número menor.',
      ],
    },
    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      /**
       * Era `parcial` enquanto as três tabelas estavam por montar. Virou
       * `sucesso` no mesmo commit que as montou — e esta linha existe porque
       * este arquivo já registrou o erro contrário: um texto de "não temos"
       * que ficou na tela do cliente depois de o dado passar a existir.
       * **Situação de fonte e conteúdo das seções mudam juntos, sempre.**
       */
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:02:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'As tabelas de palavra-chave e de termo de pesquisa somam menos que o investimento do mês, e isso não é falha de coleta: parte do investimento o Google não atribui a palavra nenhuma, e o termo pesquisado poucas vezes é omitido por privacidade. Cada uma das duas diz de quanto é a diferença logo acima da tabela.',
        'A tabela por grupo de anúncios fecha exatamente com o total da conta, nas três métricas.',
      ],
    },
  ],

  montagem: [
    {
      bloco: 'B3',
      id: 'evolucao-meta',
      titulo: 'Meta Ads — o ano até aqui',
      apoio:
        'Investimento e mensagens, mês a mês. Cada métrica tem o painel dela, com escala própria: sobrepor as duas num gráfico só faria parecer que uma explica a outra.',
      evolucao: 'evolucao_meta_2026',
      apresentacao: 'grafico',
    },
    {
      bloco: 'B1',
      id: 'numeros-meta',
      titulo: 'Meta Ads em julho',
      apoio: 'Todos os números desta seção são da conta inteira do Meta Ads.',
      faixa: 'faixa_meta',
      mostrarVariacao: true,
    },
    {
      bloco: 'B4',
      id: 'criativos-meta',
      titulo: 'Os anúncios que mais trouxeram mensagens',
      apoio: 'Ordenados por mensagens iniciadas no período.',
      ranking: 'ranking_meta',
    },
    {
      bloco: 'B3',
      id: 'evolucao-google',
      titulo: 'Google Ads — o ano até aqui',
      apoio: 'Investimento e conversões, mês a mês, cada um no painel dele.',
      evolucao: 'evolucao_google_2026',
      apresentacao: 'grafico',
    },
    {
      bloco: 'B1',
      id: 'numeros-google',
      titulo: 'Google Ads em julho',
      apoio: 'Todos os números desta seção são da conta inteira do Google Ads.',
      faixa: 'faixa_google',
      mostrarVariacao: true,
    },
    {
      bloco: 'B2',
      id: 'grupos-de-anuncios',
      titulo: 'Resultado por grupo de anúncios',
      apoio: 'Onde o investimento da busca foi parar, grupo a grupo.',
      tabela: 'grupos_de_anuncios',
      pergunta: 'Quais grupos de anúncios trouxeram os resultados do mês?',
    },
    {
      bloco: 'B5',
      id: 'conversoes-por-dia',
      titulo: 'Como as conversões se distribuíram no mês',
      apoio:
        'Dia a dia, para mostrar concentração e vazios. Dia sem veiculação interrompe a linha; dia que veiculou e não converteu aparece como zero.',
      serie: 'conversoes_dia',
    },
    {
      bloco: 'B2',
      id: 'termos-de-pesquisa',
      titulo: 'O que as pessoas digitaram para chegar',
      apoio: 'Os termos realmente pesquisados, que não são as palavras compradas.',
      tabela: 'termos_de_pesquisa',
      pergunta: 'Que buscas levaram aos anúncios?',
    },
    {
      bloco: 'B2',
      id: 'palavras-chave',
      titulo: 'Palavras-chave do período',
      apoio: 'Quanto cada palavra comprada consumiu.',
      tabela: 'palavras_chave',
      pergunta: 'Quais palavras-chave consumiram o investimento do mês?',
    },
    {
      bloco: 'B7',
      id: 'glossario',
      titulo: 'O que cada número quer dizer',
      posicao: 'rodape',
      metricas: [
        'investimento',
        'cpm',
        'cpc',
        'mensagens',
        'custo_por_mensagem',
        'cliques',
        'ctr',
        'conversoes',
        'custo_por_conversao',
      ],
    },
  ],

  dados: {
    faixas: { faixa_meta: faixaMeta, faixa_google: faixaGoogle },
    tabelas: {
      grupos_de_anuncios: tabelaGrupos,
      palavras_chave: tabelaPalavrasChave,
      termos_de_pesquisa: tabelaTermos,
    },
    evolucoesMensais: {
      evolucao_meta_2026: evolucaoMeta,
      evolucao_google_2026: evolucaoGoogle,
    },
    rankingsCriativos: { ranking_meta: rankingMeta },
    quebras: {},
    series: { conversoes_dia: conversoesPorDia },
  },

  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho somou R$ 1.864,89 investidos nas duas plataformas: R$ 863,91 no Meta, que trouxe 74 conversas iniciadas, e R$ 1.000,98 no Google, que registrou 21 conversões.',
        sustentadaPor: ['meta_investimento', 'meta_mensagens', 'google_investimento', 'google_conversoes'],
      },
      {
        texto:
          'O custo por mensagem do Meta caiu de R$ 12,58 para R$ 11,67, e o custo por conversão do Google caiu de R$ 52,68 para R$ 47,67.',
        sustentadaPor: ['meta_custo_mensagem', 'google_custo_conversao'],
      },
      {
        texto:
          'A parte de Google abre em três tabelas: por grupo de anúncios, por palavra-chave comprada e por termo realmente pesquisado. A dos grupos soma exatamente o investimento do mês; as outras duas somam menos, e cada uma explica por quê logo acima da tabela.',
        sustentadaPor: ['grupos_de_anuncios', 'palavras_chave', 'termos_de_pesquisa'],
      },
    ],
    destaques: [
      {
        texto:
          'Julho foi o mês de maior volume do ano nas duas plataformas: 74 mensagens no Meta e 21 conversões no Google.',
        sustentadaPor: ['evolucao_meta_2026', 'evolucao_google_2026'],
      },
      {
        texto:
          'Os dois custos por resultado caíram em relação a junho, enquanto o investimento subiu nas duas contas.',
        sustentadaPor: ['meta_custo_mensagem', 'google_custo_conversao'],
      },
    ],
    atencao: [
      {
        texto:
          'O CPM do Meta subiu de R$ 13,94 para R$ 14,82. Este relatório mede a alta; não mede a causa dela.',
        sustentadaPor: ['meta_cpm'],
      },
      {
        texto:
          'Março não tem barra no gráfico do Meta porque não houve veiculação no mês — não é um mês de resultado zero, e ele não entra no total do ano.',
        sustentadaPor: ['evolucao_meta_2026'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'O termo “como tratar halitose” já foi comprado como palavra-chave e aparece marcado assim na tabela de termos. Os outros cinco ainda não foram, e são candidatos naturais a virar palavra-chave — este relatório mostra quais são; a decisão de comprar é da operação.',
        sustentadaPor: ['termos_de_pesquisa'],
      },
      {
        texto:
          'O grupo “Halitose — Institucional” está pausado e não veiculou em julho. Ele aparece na tabela com investimento zero e sem CTR nem CPC, porque sem impressão esses dois não existem — é diferente de terem sido zero.',
        sustentadaPor: ['grupos_de_anuncios'],
      },
    ],
  },

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'demo-karyne-0001',
    geradoEm: '2026-08-01T07:10:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

export const competenciasKaryneMontada: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
];
