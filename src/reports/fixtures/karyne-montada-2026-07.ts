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
 * O QUE ESTE RELATÓRIO **NÃO** CONSEGUE MOSTRAR, e por quê.
 *
 * A página de Google da Karyne tem, no relatório de origem, três tabelas
 * abaixo do nível de campanha: grupo de anúncios, termo de pesquisa e
 * palavra-chave. A tabela por grupo é o **corpo** daquela página.
 *
 * **Atualizado em 2026-08-05. O texto que estava aqui — "nossa integração
 * devolve Google só em nível de campanha", conferido por chamada real em
 * 2026-08-04 — deixou de valer, e ficou falso na tela do cliente por um dia.**
 * O conector passou a aceitar os três níveis (`ad_group`, `keyword`,
 * `search_term`), medidos contra a API real. O que segura estas três seções
 * agora é a **montagem daqui**, não a fonte.
 *
 * Duas coisas continuam verdadeiras e a tela precisa dizê-las quando as tabelas
 * forem montadas:
 *
 *  • **grupo de anúncios fecha com a conta ao centavo; palavra-chave e termo de
 *    pesquisa não fecham, por natureza.** Parte do investimento o Google não
 *    atribui a palavra nenhuma, e Display, Vídeo, Performance Max, Shopping e
 *    Demand Gen não têm palavra-chave. A leitura honesta é "as palavras-chave
 *    somam X dos Y da conta" — apresentar X como total é erro;
 *  • **campanha Performance Max não devolve o termo de pesquisa cru**, e vem
 *    declarada à parte na resposta.
 *
 * Os três blocos continuam aparecendo declarando o que falta, como no Zenun. No
 * dia em que forem montados, some-se a declaração e eles se preenchem.
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
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

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
/* O snapshot                                                          */
/* ------------------------------------------------------------------ */

const FALTA_MONTAR =
  'Depende só de montarmos a seção: a nossa integração com o Google passou a devolver os níveis abaixo de campanha, e a tabela ainda não foi construída aqui.';

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
      situacao: 'parcial',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:02:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'As tabelas por grupo de anúncios, por termo de pesquisa e por palavra-chave ainda não foram montadas neste relatório. A nossa integração passou a devolver os três níveis, e as três seções aparecem dizendo que falta montá-las.',
        'O total da conta e a distribuição das conversões por dia estão completos.',
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
      indisponivel: {
        motivo:
          'Esta seção ainda não foi montada. Os números por grupo de anúncios passaram a chegar da fonte — e este é o único nível abaixo de campanha cuja soma fecha com o total da conta —, e o que falta agora é construirmos a tabela aqui.',
        oQueTemos: [
          'O investimento, os cliques, o CTR e as conversões da conta inteira, na seção acima.',
          'A distribuição das conversões dia a dia, na seção abaixo.',
        ],
        dependeDe: FALTA_MONTAR,
      },
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
      indisponivel: {
        motivo:
          'Esta seção ainda não foi montada. Os termos de pesquisa passaram a chegar da fonte com o número de cada um, e o que falta agora é construirmos a tabela aqui.',
        oQueTemos: [
          'O investimento e as conversões da conta inteira, na seção de Google acima. Eles vão continuar sendo maiores do que a soma desta tabela: o Google omite o termo pesquisado poucas vezes, e campanha de Performance Max não devolve o termo que a pessoa digitou.',
        ],
        dependeDe: FALTA_MONTAR,
      },
    },
    {
      bloco: 'B2',
      id: 'palavras-chave',
      titulo: 'Palavras-chave do período',
      apoio: 'Quanto cada palavra comprada consumiu.',
      tabela: 'palavras_chave',
      pergunta: 'Quais palavras-chave consumiram o investimento do mês?',
      indisponivel: {
        motivo:
          'Esta seção ainda não foi montada. O resultado de cada palavra-chave passou a chegar da fonte, e o que falta agora é construirmos a tabela aqui.',
        oQueTemos: [
          'A lista das palavras-chave ativas e o tipo de correspondência de cada uma.',
          'O investimento e as conversões da conta inteira, na seção de Google acima. Eles vão continuar sendo maiores do que a soma desta tabela: parte do investimento o Google não atribui a palavra-chave nenhuma, e as campanhas que não são de busca não têm palavra-chave.',
        ],
        dependeDe: FALTA_MONTAR,
      },
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
    tabelas: {},
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
          'Três seções da parte de Google ainda não foram montadas, e cada uma diz o que falta no próprio lugar. Nenhuma delas depende mais da nossa integração: os três níveis já são devolvidos por ela.',
        sustentadaPor: ['grupos-de-anuncios', 'termos-de-pesquisa', 'palavras-chave'],
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
          'As três seções incompletas dependem de serem montadas aqui — a alteração na integração com o Google já saiu. Nenhuma delas afeta os números que já estão neste relatório.',
        sustentadaPor: ['grupos-de-anuncios', 'termos-de-pesquisa', 'palavras-chave'],
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
