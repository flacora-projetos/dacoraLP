/**
 * Aviarte — julho de 2026. Fixture da W0, montada pelo CATÁLOGO.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TODOS OS NÚMEROS DESTE ARQUIVO SÃO INVENTADOS.                      │
 * │  Este repositório é PÚBLICO: nenhum identificador de conta real,     │
 * │  nenhum nome de conta real e nenhum valor real entram aqui. Os        │
 * │  números fecham entre si — a soma das campanhas dá o total da conta,  │
 * │  a soma dos anúncios dá o total do grupo, e cada custo unitário é a   │
 * │  divisão exata dos dois números mostrados ao lado — e exercitam os    │
 * │  casos difíceis do formato. Não descrevem a operação da cliente.     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Quinto relatório montado pelo catálogo, e o que mais depende dele.
 *
 * O relatório de origem tem nove páginas, e **quatro delas são o mesmo trio de
 * blocos** — números da campanha, anúncios da campanha, comentário da equipe —
 * mudando só de qual campanha se fala. Escrever isso como quatro trechos de
 * página seria escrever o mesmo código quatro vezes e ter quatro lugares para
 * corrigir. Aqui é `CAMPANHAS_EM_DESTAQUE`, uma lista, percorrida uma vez.
 *
 * Se um dia alguém precisar acrescentar uma quinta campanha em destaque, o
 * trabalho é acrescentar um item na lista. Se precisar de um `if`, algo saiu do
 * lugar.
 *
 * ---
 *
 * AS CINCO ARMADILHAS DESTA CLIENTE, E ONDE CADA UMA ESTÁ RESOLVIDA
 *
 * 1. **O CPC daqui é a exceção da carteira.** Em quatro clientes o CPC impresso
 *    é investimento ÷ cliques NO LINK, confirmado em vinte conferências. Nesta
 *    cliente é ÷ cliques TOTAIS. Com a outra definição, o CPC do mês sairia
 *    R$ 0,60 em vez de R$ 0,40 — 50% de diferença, e nada na tela avisaria.
 *    São grandezas diferentes com o mesmo nome. Por isso a fórmula vai impressa
 *    junto do número e junto da tabela, e a definição é dado do cliente, nunca
 *    constante no código nem escolha do renderizador.
 *
 * 2. **"Não se aplica" imprime traço, e é diferente de ausência.** A campanha
 *    de mensagem não tem compra atribuída e as campanhas de venda não têm o
 *    evento de conversa. Nos dois casos é `nao_aplicavel`: a pergunta não se
 *    faz. Um `0` ali diria "tentamos e não veio", que é outra afirmação — e
 *    falsa. Ausência de verdade também aparece nesta página, na tabela do
 *    Google, e as duas coisas ficam distinguíveis lado a lado.
 *
 * 3. **"Público frio" não existe em API nenhuma.** Ele reúne três campanhas e é
 *    convenção de quem monta o relatório. Aqui o grupo é declarado por
 *    identificador de campanha, e os identificadores aparecem impressos na
 *    etiqueta de escopo. Renomear uma campanha não pode mudar o que o relatório
 *    afirma. Enquanto o campo não existir no cadastro da fábrica, cliente sem
 *    mapa recebe ranking único — nunca um agrupamento adivinhado pelo nome.
 *
 * 4. **O confronto mídia × loja não entra aqui, e o relatório não comenta isso.**
 *    Decisão do Flávio em 2026-08-05, corrigindo a primeira versão desta
 *    fixture: a cliente **não tem mecanismo para registrar** as vendas que
 *    fecham na conversa de WhatsApp, e por isso o relatório **reporta o que
 *    temos e segue** — conversas iniciadas e custo por conversa, que é o
 *    resultado que a plataforma entrega para campanha de mensagem.
 *
 *    A primeira versão escrevia, em três lugares diferentes e num comentário
 *    assinado, que não sabíamos medir aquela parte. **Isso foi removido.** A
 *    regra continua valendo — não se inventa causa, e por isso o relatório
 *    também não afirma que a diferença entre receita atribuída e faturamento é
 *    sobreposição de atribuição —, mas *não afirmar* é diferente de *ficar
 *    repetindo que não dá*. Cliente não precisa ler três vezes o que a agência
 *    não consegue medir; ele precisa ler o que a campanha entregou.
 *
 *    Quando existir um jeito de registrar essas vendas, o confronto entra.
 *
 * 5. **Miniatura de criativo é baixada e guardada por nós.** Os endereços que a
 *    Meta devolve são links assinados que expiram: guardar o link faz o
 *    relatório de julho, aberto em outubro, mostrar quadrados vazios sem erro
 *    nenhum. Nesta demonstração nenhuma imagem é carregada, e o motivo aparece
 *    embaixo de cada ranking.
 *
 * ---
 *
 * O QUE ESTA PÁGINA **NÃO** CONSEGUE MOSTRAR, E POR QUÊ
 *
 * Quatro seções saem declarando o que falta, em vez de sumirem ou de serem
 * preenchidas com número que ninguém mediu:
 *
 *  • **o perfil do Instagram** — no relatório de origem essa página é uma
 *    captura de tela do painel do Instagram, colada à mão todo mês. Três das
 *    quatro medidas não saem da nossa integração hoje;
 *  • **termos de pesquisa, palavras-chave e produtos do PMax** — a integração
 *    devolve Google só em nível de campanha. É o mesmo pedido, já em fila, que
 *    segura três seções do relatório da Karyne.
 *
 * O relatório de origem também tem, dentro de cada cartão do Instagram, um
 * mini-gráfico do dia a dia. Esse seria o **único parâmetro novo** que esta
 * cliente pediria ao catálogo, e ele **não foi construído**: o dado que o
 * alimentaria não existe. Escrever um parâmetro que ninguém consegue exercitar
 * com dado nenhum entrega falsa sensação de pronto e quebra calado depois — é o
 * mesmo raciocínio que segurou o B5 por meses e se pagou no dia em que o dado
 * chegou.
 */

import type { CompetenciaDisponivel, Valor } from '../snapshot';
import type {
  BlocoConfigurado,
  ComentarioHumano,
  Criativo,
  Escopo,
  FaixaIndicadores,
  RankingCriativos,
  SnapshotMontado,
  TabelaEntidades,
} from '../blocos/tipos';

/* ------------------------------------------------------------------ */
/* Atalhos                                                             */
/* ------------------------------------------------------------------ */

const ok = (numero: number): Valor => ({ estado: 'ok', numero });

const naoSeAplica = (motivo: string): Valor => ({ estado: 'nao_aplicavel', motivo });

const naoVeio = (motivo: string): Valor => ({ estado: 'ausente', motivo });

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

/** Momento único da leitura de situação dos anúncios. */
const LIDO_EM = '2026-08-01';

const SEM_MINIATURA =
  'Miniatura não incluída nesta demonstração. No relatório real a imagem é baixada na geração e guardada por nós, porque o endereço que a plataforma devolve expira.';

/**
 * A fórmula do CPC desta cliente, escrita uma vez e repetida onde o número
 * aparece. Ela é **dado do cliente**, não constante do código: nos outros
 * quatro relatórios da carteira o CPC é sobre cliques no link.
 */
const FORMULA_CPC = 'investimento ÷ cliques totais';

const NOTA_CPC =
  'CPC nesta cliente é o investimento dividido por TODOS os cliques, inclusive os que não levam ao destino do anúncio. Contando só os cliques no link, o CPC do mês seria R$ 0,60 em vez de R$ 0,40 — são duas grandezas diferentes com o mesmo nome, e é por isso que a fórmula fica escrita.';

const NOTA_CONVERSAS =
  '"Conversas iniciadas" é o que o glossário chama de mensagens iniciadas: a conversa nova que começa a partir do anúncio.';

/* ------------------------------------------------------------------ */
/* B1 — os números do Meta                                             */
/* ------------------------------------------------------------------ */

/**
 * Seis indicadores, e o sexto é o que exige cuidado. O ROAS é calculado sobre
 * os R$ 13.189,00 aplicados em campanhas de VENDA, não sobre os R$ 14.768,00 da
 * conta: a campanha de mensagem não tem receita atribuída, e incluí-la no
 * denominador faria o retorno parecer menor do que foi. Como o número do
 * investimento total aparece no mesmo bloco, a fórmula precisa dizer sobre o
 * que a conta foi feita — senão o leitor multiplica os dois números errados.
 */
const faixaMeta: FaixaIndicadores = {
  id: 'faixa_meta',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Meta Ads' },
  metricas: [
    {
      id: 'meta_investimento',
      rotulo: 'Investimento',
      glossarioId: 'investimento',
      unidade: 'brl',
      valor: ok(14768.0),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
      comparativo: contraJunho(13290.0, 0.1112),
    },
    {
      id: 'meta_cpm',
      rotulo: 'CPM',
      glossarioId: 'cpm',
      unidade: 'brl',
      valor: ok(12.08),
      origem: calculadoMeta('investimento ÷ impressões × 1.000'),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(11.42, 0.0578),
    },
    {
      id: 'meta_cpc',
      rotulo: 'CPC',
      glossarioId: 'cpc',
      unidade: 'brl',
      valor: ok(0.4),
      origem: calculadoMeta(`${FORMULA_CPC} (36.761 cliques); com os 24.500 cliques no link daria R$ 0,60`),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(0.43, -0.0698),
    },
    {
      id: 'meta_conversas',
      rotulo: 'Conversas iniciadas',
      glossarioId: 'mensagens',
      unidade: 'inteiro',
      valor: ok(412),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(368, 0.1196),
    },
    {
      id: 'meta_compras',
      rotulo: 'Compras atribuídas',
      glossarioId: 'compras',
      unidade: 'inteiro',
      valor: ok(268),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(231, 0.1602),
    },
    {
      id: 'meta_roas',
      rotulo: 'ROAS em campanhas de venda',
      glossarioId: 'roas',
      unidade: 'decimal',
      sufixo: '×',
      valor: ok(6.18),
      origem: calculadoMeta(
        'receita atribuída de R$ 81.503,84 ÷ R$ 13.189,00 investidos em campanhas de venda; a campanha de mensagem fica fora desta conta',
      ),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(5.84, 0.0582),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B2 — tabela de campanhas do Meta                                    */
/* ------------------------------------------------------------------ */

/**
 * Duas colunas de resultado convivendo — `Conversas` e `Compras` — porque as
 * campanhas desta conta foram compradas para coisas diferentes. Cada linha
 * responde a coluna que faz sentido nela e imprime traço na outra. Isso é
 * `nao_aplicavel`, não ausência: a coleta trouxe tudo que existia.
 */
const tabelaMeta: TabelaEntidades = {
  id: 'campanhas_meta',
  dimensao: 'campanha',
  rotuloDimensao: 'Campanha',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Meta Ads' },
  colunaPrincipal: 'investimento',
  colunas: [
    { id: 'investimento', rotulo: 'Investimento', unidade: 'brl' },
    { id: 'cpm', rotulo: 'CPM', unidade: 'brl', secundaria: true },
    { id: 'cpc', rotulo: 'CPC', unidade: 'brl', secundaria: true },
    { id: 'conversas', rotulo: 'Conversas', unidade: 'inteiro' },
    { id: 'compras', rotulo: 'Compras', unidade: 'inteiro' },
    /**
     * ROAS sai da grade no celular e volta na linha de detalhe. São sete
     * colunas — a tabela mais larga da carteira — e sem isso o leitor de
     * telefone precisaria arrastar a tabela de lado para chegar ao resultado
     * de cada campanha. Na tela grande nada muda.
     */
    { id: 'roas', rotulo: 'ROAS', unidade: 'decimal', sufixo: '×', secundaria: true },
  ],
  linhas: [
    {
      id: 'camp_frio_video',
      nome: '[VENDAS] Público frio — Vídeo institucional',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Venda',
      valores: {
        investimento: ok(3960.0),
        cpm: ok(10.0),
        cpc: ok(0.33),
        conversas: naoSeAplica('Campanha de venda: ela não tem o evento de conversa iniciada.'),
        compras: ok(78),
        roas: ok(5.52),
      },
    },
    {
      id: 'camp_frio_carrossel',
      nome: '[VENDAS] Público frio — Carrossel da linha',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Venda',
      valores: {
        investimento: ok(2876.0),
        cpm: ok(10.73),
        cpc: ok(0.35),
        conversas: naoSeAplica('Campanha de venda: ela não tem o evento de conversa iniciada.'),
        compras: ok(54),
        roas: ok(5.38),
      },
    },
    {
      id: 'camp_frio_estatico',
      nome: '[VENDAS] Público frio — Estático de oferta',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Venda',
      valores: {
        investimento: ok(1812.0),
        cpm: ok(11.92),
        cpc: ok(0.42),
        conversas: naoSeAplica('Campanha de venda: ela não tem o evento de conversa iniciada.'),
        compras: ok(29),
        roas: ok(4.69),
      },
    },
    {
      id: 'camp_remarketing',
      nome: '[VENDAS] Remarketing 14 dias',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Venda',
      valores: {
        investimento: ok(2438.0),
        cpm: ok(19.98),
        cpc: ok(0.4),
        conversas: naoSeAplica('Campanha de venda: ela não tem o evento de conversa iniciada.'),
        compras: ok(71),
        roas: ok(9.75),
      },
    },
    {
      id: 'camp_catalogo',
      nome: '[VENDAS] Catálogo — linha completa',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Venda',
      valores: {
        investimento: ok(2103.0),
        cpm: ok(11.55),
        cpc: ok(0.5),
        conversas: naoSeAplica('Campanha de venda: ela não tem o evento de conversa iniciada.'),
        compras: ok(36),
        roas: ok(5.66),
      },
    },
    {
      id: 'camp_mensagens',
      nome: '[MENSAGENS] WhatsApp — atendimento',
      plataforma: 'meta',
      situacao: 'ativa',
      etiqueta: 'Mensagem',
      valores: {
        investimento: ok(1579.0),
        cpm: ok(15.33),
        cpc: ok(0.73),
        conversas: ok(412),
        /**
         * Traço, e não zero. Conferido: esta campanha não tem nenhuma compra
         * atribuída, e não porque tenha falhado — ela não foi comprada para
         * vender e a plataforma não atribui compra a ela.
         */
        compras: naoSeAplica('Campanha de mensagem: a plataforma não atribui compra a ela.'),
        roas: naoSeAplica('Sem compra atribuída, não há retorno a calcular.'),
      },
    },
  ],
  total: {
    rotulo: 'Total da conta',
    valores: {
      investimento: ok(14768.0),
      cpm: ok(12.08),
      cpc: ok(0.4),
      conversas: ok(412),
      compras: ok(268),
      /**
       * Sem total de ROAS, de propósito. O retorno do mês existe (6,18×), mas
       * ele é sobre os R$ 13.189,00 de campanhas de venda — e a célula ficaria
       * na mesma linha dos R$ 14.768,00 da conta inteira, convidando a
       * multiplicar os dois números errados. A célula sai vazia e a nota
       * embaixo diz onde o número está.
       */
      roas: null,
    },
  },
  definicoes: [
    NOTA_CPC,
    'CPM é o investimento dividido pelas impressões, multiplicado por mil.',
    NOTA_CONVERSAS,
    'O traço em Conversas, Compras e ROAS quer dizer que a pergunta não se faz naquela campanha — campanha de venda não tem evento de conversa, campanha de mensagem não recebe compra atribuída. É diferente de um número que não veio na coleta.',
    'A linha de total não traz ROAS: ele é calculado sobre os R$ 13.189,00 aplicados em campanhas de venda, e não sobre os R$ 14.768,00 da conta, que incluem a campanha de mensagem. O número está na faixa de indicadores do Meta, com a fórmula ao lado.',
    'CPM e CPC do total são da conta inteira: cada um é o total de cima dividido pelo total de baixo, nunca a média das seis linhas.',
  ],
};

/* ------------------------------------------------------------------ */
/* As campanhas em destaque — a lista que vira quatro seções           */
/* ------------------------------------------------------------------ */

/**
 * O coração desta montagem.
 *
 * Cada item vira, na ordem, um B1 com os números daquele recorte, um B4 com os
 * anúncios daquele recorte e — quando alguém escreveu — um B8 com a leitura da
 * equipe. O comentário é opcional de verdade: o item do catálogo não tem, e a
 * seção some antes da numeração, sem deixar título órfão.
 */
interface CampanhaEmDestaque {
  /** Prefixo dos ids de seção. */
  id: string;
  /** Como o recorte é chamado nos títulos. Escrito, não recortado de outro título. */
  nome: string;
  tituloNumeros: string;
  apoioNumeros: string;
  tituloCriativos: string;
  apoioCriativos: string;
  faixa: FaixaIndicadores;
  ranking: RankingCriativos;
  comentario?: ComentarioHumano;
}

/** Cinco números por faixa de destaque, como no relatório de origem. */
const faixaDeDestaque = (
  id: string,
  escopo: Escopo,
  investimento: number,
  cpm: number,
  cpc: number,
  resultado: { id: string; rotulo: string; glossarioId: string; valor: number },
  custo: { id: string; rotulo: string; glossarioId: string; valor: number; formula: string },
): FaixaIndicadores => ({
  id,
  escopo,
  metricas: [
    {
      id: `${id}_investimento`,
      rotulo: 'Investimento',
      glossarioId: 'investimento',
      unidade: 'brl',
      valor: ok(investimento),
      origem: daMeta(),
      direcaoFavoravel: 'neutra',
    },
    {
      id: `${id}_cpm`,
      rotulo: 'CPM',
      glossarioId: 'cpm',
      unidade: 'brl',
      valor: ok(cpm),
      origem: calculadoMeta('investimento deste recorte ÷ impressões deste recorte × 1.000'),
      direcaoFavoravel: 'baixa',
    },
    {
      id: `${id}_cpc`,
      rotulo: 'CPC',
      glossarioId: 'cpc',
      unidade: 'brl',
      valor: ok(cpc),
      origem: calculadoMeta(`${FORMULA_CPC}, ambos deste recorte`),
      direcaoFavoravel: 'baixa',
    },
    {
      id: resultado.id,
      rotulo: resultado.rotulo,
      glossarioId: resultado.glossarioId,
      unidade: 'inteiro',
      valor: ok(resultado.valor),
      origem: daMeta(),
      direcaoFavoravel: 'alta',
    },
    {
      id: custo.id,
      rotulo: custo.rotulo,
      glossarioId: custo.glossarioId,
      unidade: 'brl',
      valor: ok(custo.valor),
      origem: calculadoMeta(custo.formula),
      direcaoFavoravel: 'baixa',
    },
  ],
});

/** Dois números por cartão: o resultado e o custo dele. */
const criativo = (
  id: string,
  nome: string,
  resultado: { rotulo: string; valor: number },
  custo: { rotulo: string; valor: number },
  situacao: 'ativa' | 'pausada',
): Criativo => ({
  id,
  nome,
  miniatura: null,
  motivoSemMiniatura: SEM_MINIATURA,
  numeros: [
    { rotulo: resultado.rotulo, valor: ok(resultado.valor), unidade: 'inteiro' },
    { rotulo: custo.rotulo, valor: ok(custo.valor), unidade: 'brl' },
  ],
  situacao: { situacao, lidaEm: LIDO_EM },
});

/**
 * O escopo do grupo é declarado por identificador de campanha, e os
 * identificadores aparecem impressos na etiqueta. "Público frio" não existe em
 * API nenhuma: é convenção de quem monta o relatório. Enquanto o campo não
 * existir no cadastro da fábrica, quem não tem mapa recebe ranking único — e
 * nunca um agrupamento adivinhado pelo nome da campanha, que quebra em silêncio
 * no dia em que alguém renomear alguma coisa.
 */
const ESCOPO_PUBLICO_FRIO: Escopo = {
  tipo: 'grupo',
  rotulo: 'grupo PÚBLICO FRIO',
  campanhasDoGrupo: ['camp_frio_video', 'camp_frio_carrossel', 'camp_frio_estatico'],
};

const CAMPANHAS_EM_DESTAQUE: CampanhaEmDestaque[] = [
  {
    id: 'publico-frio',
    nome: 'Público frio',
    tituloNumeros: 'Público frio — os números',
    apoioNumeros:
      'Três campanhas de prospecção somadas. Todos os valores desta seção são só delas, inclusive os que são conta de divisão.',
    tituloCriativos: 'Público frio — anúncios que mais venderam',
    apoioCriativos: 'Cada cartão traz as compras atribuídas ao anúncio e o custo de cada uma.',
    faixa: faixaDeDestaque(
      'frio',
      ESCOPO_PUBLICO_FRIO,
      8648.0,
      10.6,
      0.36,
      { id: 'frio_compras', rotulo: 'Compras atribuídas', glossarioId: 'compras', valor: 161 },
      {
        id: 'frio_custo_compra',
        rotulo: 'Custo por compra',
        glossarioId: 'custo_por_compra',
        valor: 53.71,
        formula: 'investimento do grupo ÷ compras atribuídas ao grupo',
      },
    ),
    ranking: {
      id: 'criativos_frio',
      escopo: ESCOPO_PUBLICO_FRIO,
      ordenadoPor: 'compras atribuídas',
      criativos: [
        criativo(
          'af1',
          'AVI_FRIO_VIDEO_INSTITUCIONAL_01',
          { rotulo: 'Compras atribuídas', valor: 52 },
          { rotulo: 'Custo por compra', valor: 48.0 },
          'ativa',
        ),
        criativo(
          'af2',
          'AVI_FRIO_CARROSSEL_LINHA_02',
          { rotulo: 'Compras atribuídas', valor: 41 },
          { rotulo: 'Custo por compra', valor: 52.0 },
          'ativa',
        ),
        criativo(
          'af3',
          'AVI_FRIO_ESTATICO_OFERTA_03',
          { rotulo: 'Compras atribuídas', valor: 30 },
          { rotulo: 'Custo por compra', valor: 56.0 },
          'ativa',
        ),
        criativo(
          'af4',
          'AVI_FRIO_VIDEO_BASTIDORES_04',
          { rotulo: 'Compras atribuídas', valor: 23 },
          { rotulo: 'Custo por compra', valor: 60.0 },
          'ativa',
        ),
        criativo(
          'af5',
          'AVI_FRIO_ESTATICO_LANCAMENTO_05',
          { rotulo: 'Compras atribuídas', valor: 15 },
          { rotulo: 'Custo por compra', valor: 64.0 },
          'pausada',
        ),
      ],
    },
    comentario: {
      id: 'leitura_frio',
      paragrafos: [
        'Em 08/07 subimos o vídeo institucional novo e pausamos o estático de lançamento, que vinha desde maio com o custo por compra subindo mês a mês. A troca era prevista no plano do trimestre e não foi reação a este mês.',
        'O carrossel da linha continua sendo o anúncio que mais aguenta frequência sem cansar: é o que roda há mais tempo sem queda de resultado. Isso é observação de quem acompanha a conta, não medição deste relatório.',
      ],
      autor: 'Equipe Dácora',
      escritoEm: '2026-08-01',
    },
  },
  {
    id: 'remarketing',
    nome: 'Remarketing 14 dias',
    tituloNumeros: 'Remarketing 14 dias — os números',
    apoioNumeros:
      'Uma campanha só. Todos os valores desta seção são dela, inclusive os que são conta de divisão.',
    tituloCriativos: 'Remarketing 14 dias — anúncios que mais venderam',
    apoioCriativos: 'Cada cartão traz as compras atribuídas ao anúncio e o custo de cada uma.',
    faixa: faixaDeDestaque(
      'remarketing',
      { tipo: 'campanha', rotulo: 'campanha [VENDAS] Remarketing 14 dias' },
      2438.0,
      19.98,
      0.4,
      {
        id: 'remarketing_compras',
        rotulo: 'Compras atribuídas',
        glossarioId: 'compras',
        valor: 71,
      },
      {
        id: 'remarketing_custo_compra',
        rotulo: 'Custo por compra',
        glossarioId: 'custo_por_compra',
        valor: 34.34,
        formula: 'investimento da campanha ÷ compras atribuídas à campanha',
      },
    ),
    ranking: {
      id: 'criativos_remarketing',
      escopo: { tipo: 'campanha', rotulo: 'campanha [VENDAS] Remarketing 14 dias' },
      ordenadoPor: 'compras atribuídas',
      criativos: [
        criativo(
          'ar1',
          'AVI_RMK_CARROSSEL_VISITOU_01',
          { rotulo: 'Compras atribuídas', valor: 26 },
          { rotulo: 'Custo por compra', valor: 32.0 },
          'ativa',
        ),
        criativo(
          'ar2',
          'AVI_RMK_ESTATICO_CARRINHO_02',
          { rotulo: 'Compras atribuídas', valor: 19 },
          { rotulo: 'Custo por compra', valor: 34.0 },
          'ativa',
        ),
        criativo(
          'ar3',
          'AVI_RMK_VIDEO_PROVA_SOCIAL_03',
          { rotulo: 'Compras atribuídas', valor: 14 },
          { rotulo: 'Custo por compra', valor: 36.0 },
          'ativa',
        ),
        criativo(
          'ar4',
          'AVI_RMK_ESTATICO_FRETE_04',
          { rotulo: 'Compras atribuídas', valor: 12 },
          { rotulo: 'Custo por compra', valor: 38.0 },
          'ativa',
        ),
      ],
    },
    comentario: {
      id: 'leitura_remarketing',
      paragrafos: [
        'Fechamos a janela de remarketing de 30 para 14 dias em 01/07, a pedido de vocês, para não continuar impactando quem já tinha comprado. O público ficou menor e o CPM subiu, como esperávamos ao concentrar entrega em menos gente.',
      ],
      autor: 'Equipe Dácora',
      escritoEm: '2026-08-01',
    },
  },
  {
    id: 'catalogo',
    nome: 'Catálogo',
    tituloNumeros: 'Catálogo — os números',
    apoioNumeros:
      'Uma campanha só. Todos os valores desta seção são dela, inclusive os que são conta de divisão.',
    tituloCriativos: 'Catálogo — anúncios que mais venderam',
    apoioCriativos: 'Cada cartão traz as compras atribuídas ao anúncio e o custo de cada uma.',
    faixa: faixaDeDestaque(
      'catalogo',
      { tipo: 'campanha', rotulo: 'campanha [VENDAS] Catálogo — linha completa' },
      2103.0,
      11.55,
      0.5,
      { id: 'catalogo_compras', rotulo: 'Compras atribuídas', glossarioId: 'compras', valor: 36 },
      {
        id: 'catalogo_custo_compra',
        rotulo: 'Custo por compra',
        glossarioId: 'custo_por_compra',
        valor: 58.42,
        formula: 'investimento da campanha ÷ compras atribuídas à campanha',
      },
    ),
    ranking: {
      id: 'criativos_catalogo',
      escopo: { tipo: 'campanha', rotulo: 'campanha [VENDAS] Catálogo — linha completa' },
      ordenadoPor: 'compras atribuídas',
      criativos: [
        criativo(
          'ak1',
          'AVI_CAT_CONJUNTO_DESTAQUE_01',
          { rotulo: 'Compras atribuídas', valor: 13 },
          { rotulo: 'Custo por compra', valor: 55.0 },
          'ativa',
        ),
        criativo(
          'ak2',
          'AVI_CAT_CONJUNTO_MAIS_VENDIDOS_02',
          { rotulo: 'Compras atribuídas', valor: 10 },
          { rotulo: 'Custo por compra', valor: 58.0 },
          'ativa',
        ),
        criativo(
          'ak3',
          'AVI_CAT_CONJUNTO_NOVIDADES_03',
          { rotulo: 'Compras atribuídas', valor: 8 },
          { rotulo: 'Custo por compra', valor: 61.0 },
          'ativa',
        ),
        criativo(
          'ak4',
          'AVI_CAT_CONJUNTO_PONTA_ESTOQUE_04',
          { rotulo: 'Compras atribuídas', valor: 5 },
          { rotulo: 'Custo por compra', valor: 64.0 },
          'ativa',
        ),
      ],
    },
    /**
     * Sem comentário humano, e isso é o comportamento certo — não um esquecimento.
     * Metade dos seis relatórios validados não tem nenhum texto humano e mesmo
     * assim é entregue. A seção some antes da numeração, sem deixar buraco.
     */
  },
  {
    id: 'mensagens',
    nome: 'WhatsApp',
    tituloNumeros: 'WhatsApp — os números',
    apoioNumeros:
      'Uma campanha só. Todos os valores desta seção são dela, inclusive os que são conta de divisão.',
    tituloCriativos: 'WhatsApp — anúncios que mais iniciaram conversa',
    apoioCriativos: 'Cada cartão traz as conversas iniciadas pelo anúncio e o custo de cada uma.',
    faixa: faixaDeDestaque(
      'mensagens',
      { tipo: 'campanha', rotulo: 'campanha [MENSAGENS] WhatsApp — atendimento' },
      1579.0,
      15.33,
      0.73,
      {
        id: 'mensagens_conversas',
        rotulo: 'Conversas iniciadas',
        glossarioId: 'mensagens',
        valor: 412,
      },
      {
        id: 'mensagens_custo_conversa',
        rotulo: 'Custo por conversa',
        glossarioId: 'custo_por_mensagem',
        valor: 3.83,
        formula: 'investimento da campanha ÷ conversas iniciadas na campanha',
      },
    ),
    ranking: {
      id: 'criativos_mensagens',
      escopo: { tipo: 'campanha', rotulo: 'campanha [MENSAGENS] WhatsApp — atendimento' },
      ordenadoPor: 'conversas iniciadas',
      criativos: [
        criativo(
          'am1',
          'AVI_WPP_ESTATICO_ATENDIMENTO_01',
          { rotulo: 'Conversas iniciadas', valor: 148 },
          { rotulo: 'Custo por conversa', valor: 3.6 },
          'ativa',
        ),
        criativo(
          'am2',
          'AVI_WPP_VIDEO_DUVIDAS_02',
          { rotulo: 'Conversas iniciadas', valor: 112 },
          { rotulo: 'Custo por conversa', valor: 3.8 },
          'ativa',
        ),
        criativo(
          'am3',
          'AVI_WPP_CARROSSEL_LINHA_03',
          { rotulo: 'Conversas iniciadas', valor: 89 },
          { rotulo: 'Custo por conversa', valor: 4.0 },
          'ativa',
        ),
        criativo(
          'am4',
          'AVI_WPP_ESTATICO_HORARIO_04',
          { rotulo: 'Conversas iniciadas', valor: 63 },
          { rotulo: 'Custo por conversa', valor: 4.2 },
          'pausada',
        ),
      ],
    },
    comentario: {
      id: 'leitura_mensagens',
      paragrafos: [
        'A campanha de mensagens entregou 412 conversas iniciadas no mês, a R$ 3,83 cada — o menor custo por conversa do ano. O anúncio de catálogo é o que mais puxou volume.',
      ],
      autor: 'Equipe Dácora',
      escritoEm: '2026-08-01',
    },
  },
];

/* ------------------------------------------------------------------ */
/* B1 — os números do Google                                           */
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
      valor: ok(6418.0),
      origem: doGoogle(),
      direcaoFavoravel: 'neutra',
      comparativo: contraJunho(5980.0, 0.0732),
    },
    {
      id: 'google_impressoes',
      rotulo: 'Impressões',
      glossarioId: 'impressoes',
      unidade: 'inteiro',
      valor: ok(232000),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(214700, 0.0806),
    },
    {
      id: 'google_cliques',
      rotulo: 'Cliques',
      glossarioId: 'cliques',
      unidade: 'inteiro',
      valor: ok(9070),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(8240, 0.1007),
    },
    {
      id: 'google_ctr',
      rotulo: 'CTR',
      glossarioId: 'ctr',
      unidade: 'percentual',
      valor: ok(0.0391),
      origem: calculadoGoogle('cliques ÷ impressões'),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(0.0384, 0.0182),
    },
    {
      id: 'google_cpc_medio',
      rotulo: 'CPC médio',
      glossarioId: 'cpc_medio',
      unidade: 'brl',
      /**
       * Aqui o CPC é o da própria plataforma, sobre os cliques que ela conta —
       * não a fórmula do Meta desta cliente. Dois números com o mesmo nome em
       * duas seções da mesma página: por isso o rótulo é "CPC médio" e a origem
       * diz de quem é a conta.
       */
      valor: ok(0.71),
      origem: doGoogle(),
      direcaoFavoravel: 'baixa',
      comparativo: contraJunho(0.73, -0.0274),
    },
    {
      id: 'google_compras',
      rotulo: 'Compras atribuídas',
      glossarioId: 'compras',
      unidade: 'inteiro',
      valor: ok(98),
      origem: doGoogle(),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(84, 0.1667),
    },
    {
      id: 'google_roas',
      rotulo: 'ROAS',
      glossarioId: 'roas',
      unidade: 'decimal',
      sufixo: '×',
      valor: ok(5.42),
      origem: calculadoGoogle(
        'receita atribuída de R$ 34.777,36 ÷ R$ 6.418,00 investidos; nesta conta todas as campanhas são de venda',
      ),
      direcaoFavoravel: 'alta',
      comparativo: contraJunho(5.08, 0.0669),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* B2 — tabela de campanhas do Google                                  */
/* ------------------------------------------------------------------ */

/**
 * A coluna de aparições no topo é onde ausência e "não se aplica" aparecem lado
 * a lado, e a diferença entre as duas é a informação:
 *
 *  • em Performance Max e Display o número **não existe** — a métrica é da rede
 *    de pesquisa, e sabemos disso pelo tipo da campanha, não por adivinhação;
 *  • na campanha pequena o número **existe e não veio**: abaixo de um certo
 *    volume a plataforma não informa a posição das aparições.
 *
 * Imprimir `0` em qualquer um dos dois casos faria o relatório afirmar "você
 * nunca apareceu no topo" onde a verdade é "não se pergunta" ou "não sabemos".
 * São três coisas diferentes.
 */
const tabelaGoogle: TabelaEntidades = {
  id: 'campanhas_google',
  dimensao: 'campanha',
  rotuloDimensao: 'Campanha',
  escopo: { tipo: 'plataforma', rotulo: 'toda a conta do Google Ads' },
  colunaPrincipal: 'custo',
  colunas: [
    { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    /** Sai da grade no celular e volta na linha de detalhe, com o motivo. */
    { id: 'topo', rotulo: 'Aparições no topo', unidade: 'percentual', secundaria: true },
    { id: 'ctr', rotulo: 'CTR', unidade: 'percentual', secundaria: true },
    { id: 'cpc', rotulo: 'CPC médio', unidade: 'brl', secundaria: true },
    { id: 'compras', rotulo: 'Compras', unidade: 'inteiro' },
    { id: 'roas', rotulo: 'ROAS', unidade: 'decimal', sufixo: '×' },
  ],
  linhas: [
    {
      id: 'g_pesquisa_marca',
      nome: 'Pesquisa — Marca',
      plataforma: 'google',
      situacao: 'ativa',
      etiqueta: 'Pesquisa',
      valores: {
        custo: ok(1284.0),
        topo: ok(0.7412),
        ctr: ok(0.1189),
        cpc: ok(0.6),
        compras: ok(38),
        roas: ok(8.6),
      },
    },
    {
      id: 'g_pesquisa_generico',
      nome: 'Pesquisa — Termos genéricos',
      plataforma: 'google',
      situacao: 'ativa',
      etiqueta: 'Pesquisa',
      valores: {
        custo: ok(2012.0),
        topo: ok(0.3186),
        ctr: ok(0.0402),
        cpc: ok(0.8),
        compras: ok(21),
        roas: ok(3.15),
      },
    },
    {
      id: 'g_pmax',
      nome: 'Performance Max — Linha completa',
      plataforma: 'google',
      situacao: 'ativa',
      etiqueta: 'Performance Max',
      valores: {
        custo: ok(2568.0),
        topo: naoSeAplica(
          'Aparições no topo é uma medida da rede de pesquisa. Performance Max distribui o anúncio por várias redes e a plataforma não reporta posição para ela.',
        ),
        ctr: ok(0.0594),
        cpc: ok(0.8),
        compras: ok(31),
        roas: ok(5.2),
      },
    },
    {
      id: 'g_display_remarketing',
      nome: 'Display — Remarketing',
      plataforma: 'google',
      situacao: 'ativa',
      etiqueta: 'Display',
      valores: {
        custo: ok(426.0),
        topo: naoSeAplica(
          'Aparições no topo é uma medida da rede de pesquisa, e esta campanha não é de pesquisa.',
        ),
        ctr: ok(0.0111),
        cpc: ok(0.4),
        compras: ok(6),
        roas: ok(8.26),
      },
    },
    {
      id: 'g_pesquisa_local',
      nome: 'Pesquisa — Retirada na loja',
      plataforma: 'google',
      situacao: 'ativa',
      etiqueta: 'Pesquisa',
      valores: {
        custo: ok(128.0),
        topo: naoVeio(
          'A plataforma não devolveu este número para esta campanha no período: abaixo de um certo volume de aparições ela não informa a posição.',
        ),
        ctr: ok(0.0842),
        cpc: ok(0.8),
        compras: ok(2),
        roas: ok(4.1),
      },
    },
  ],
  total: {
    rotulo: 'Total da conta',
    valores: {
      custo: ok(6418.0),
      /**
       * Sem total. Aparições no topo é uma proporção de cada campanha, e a
       * média de proporções calculadas sobre denominadores diferentes não é a
       * proporção do conjunto. Além disso, três das cinco linhas não têm o
       * número — por motivos diferentes entre si.
       */
      topo: null,
      ctr: ok(0.0391),
      cpc: ok(0.71),
      compras: ok(98),
      roas: ok(5.42),
    },
  },
  definicoes: [
    'Aparições no topo diz, de cada cem vezes em que o anúncio apareceu, em quantas ele saiu acima dos resultados normais da busca. A coluna não tem total: é uma proporção por campanha, e média de proporções não é a proporção do conjunto.',
    'Onde a coluna de topo não traz número, o motivo muda de linha para linha, e a tela distingue os dois: em Performance Max e Display sai traço, porque a medida não existe fora da rede de pesquisa; na campanha de retirada na loja sai "indisponível", porque ela existe e não veio — o volume ficou abaixo do que a plataforma informa. Nenhum dos dois é zero.',
    'O CPC desta seção é o CPC médio calculado pela própria plataforma, sobre os cliques que ela conta. Não é a mesma conta do CPC da seção do Meta, que nesta cliente é feita sobre todos os cliques.',
    'CTR e CPC do total são da conta inteira: cliques totais sobre impressões totais e investimento total sobre cliques totais, nunca a média das cinco linhas.',
  ],
};

/* ------------------------------------------------------------------ */
/* A montagem                                                          */
/* ------------------------------------------------------------------ */

const DEPENDE_DO_NIVEL =
  'Depende de uma alteração na nossa integração com o Google, já solicitada e em fila: hoje ela nos devolve os números por campanha, e não abaixo disso.';

/**
 * Aqui é onde o laço acontece. Quatro seções do relatório de origem viram um
 * `flatMap` sobre a lista de campanhas em destaque — e acrescentar a quinta é
 * acrescentar um item na lista, não escrever uma página.
 */
const blocosDosDestaques: BlocoConfigurado[] = CAMPANHAS_EM_DESTAQUE.flatMap((destaque) => {
  const blocos: BlocoConfigurado[] = [
    {
      bloco: 'B1',
      id: `${destaque.id}-numeros`,
      titulo: destaque.tituloNumeros,
      apoio: destaque.apoioNumeros,
      faixa: destaque.faixa.id,
      /** Comparação com o mês anterior fica na faixa da conta: campanha entra, sai e muda de verba. */
      mostrarVariacao: false,
    },
    {
      bloco: 'B4',
      id: `${destaque.id}-criativos`,
      titulo: destaque.tituloCriativos,
      apoio: destaque.apoioCriativos,
      ranking: destaque.ranking.id,
    },
  ];

  if (destaque.comentario) {
    blocos.push({
      bloco: 'B8',
      id: `${destaque.id}-leitura`,
      titulo: `${destaque.nome} — leitura da equipe`,
      apoio:
        'Escrito por gente e assinado. É a única parte do relatório que explica causa — todo o resto descreve o que foi medido.',
      comentario: destaque.comentario.id,
    });
  }

  return blocos;
});

const chavear = <T extends { id: string }>(itens: T[]): Record<string, T> =>
  Object.fromEntries(itens.map((item) => [item.id, item]));

export const aviarte202607: SnapshotMontado = {
  identidade: {
    relatorioId: 'demo-aviarte-2026-07',
    clienteSlug: 'aviarte',
    clienteNome: 'Aviarte',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'ecommerce',
    versaoSchema: '2026-08-w0',
  },

  fontes: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:04:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'O CPC apresentado nesta conta é o investimento dividido por TODOS os cliques. É a definição usada no relatório desta cliente, e ela é diferente da dos outros clientes da carteira, que contam só os cliques no link. A fórmula está impressa junto de cada número.',
        'Compras e receita são as que a própria plataforma atribui a si, na janela declarada por ela. Duas plataformas podem reivindicar a mesma venda.',
        'As campanhas de mensagem são medidas por conversas iniciadas e custo por conversa, que é o resultado que a plataforma entrega para esse objetivo.',
        'O agrupamento "Público frio" é definido no cadastro da cliente, por identificador de campanha. Ele não existe na plataforma.',
        'A situação de cada anúncio foi lida em 01/08/2026 e é a de hoje, não a do período do relatório.',
      ],
    },
    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      situacao: 'parcial',
      conta: 'conta de demonstração',
      coletadoEm: '2026-08-01T07:04:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Os números por termo de pesquisa, por palavra-chave e por produto do Performance Max não são devolvidos pela nossa integração hoje. As três seções aparecem no relatório dizendo isso.',
        'A coluna de aparições no topo vem vazia em três campanhas, por dois motivos diferentes: em Performance Max e Display a medida não existe; na campanha de menor volume ela existe e não veio. Nenhum dos dois casos vira zero.',
        'O total da conta e a tabela por campanha estão completos.',
      ],
    },
    {
      plataforma: 'instagram',
      rotulo: 'Instagram — perfil',
      papel: 'organico',
      situacao: 'parcial',
      conta: 'perfil de demonstração',
      coletadoEm: '2026-08-01T07:04:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Das quatro medidas do perfil que o relatório mostra, só o alcance volta de forma estável hoje. Pedir as outras três na mesma chamada derruba a resposta inteira, inclusive a que funcionaria.',
        'No relatório de origem esta página é uma captura de tela do painel do Instagram, colada à mão todo mês. Substituí-la por dado conectado depende do item já solicitado à integração.',
        'Os resultados de anúncio que passaram pelo Instagram estão nas seções do Meta e são coisa diferente do desempenho do perfil.',
      ],
    },
  ],

  montagem: [
    {
      bloco: 'B1',
      id: 'numeros-meta',
      titulo: 'Meta Ads em julho',
      apoio:
        'Todos os números desta seção são da conta inteira do Meta Ads, com a comparação contra junho ao lado. Alta não é boa automaticamente: depende do indicador.',
      faixa: 'faixa_meta',
      mostrarVariacao: true,
    },
    {
      bloco: 'B2',
      id: 'campanhas-meta',
      titulo: 'Campanhas do Meta no mês',
      apoio:
        'Ordenadas por investimento. As campanhas desta conta foram compradas para coisas diferentes, então cada linha responde a coluna que faz sentido nela. No celular, toque no + para ver todas as colunas.',
      tabela: 'campanhas_meta',
      pergunta: 'Quanto cada campanha consumiu e o que ela entregou?',
      participacaoRotulo: 'Participação no investimento',
    },

    /* Quatro seções do relatório de origem, saídas de uma lista. */
    ...blocosDosDestaques,

    {
      bloco: 'B1',
      id: 'instagram-organico',
      titulo: 'O perfil do Instagram em julho',
      apoio: 'Seguidores, alcance, visitas ao perfil e visualizações, mês a mês.',
      faixa: 'faixa_instagram',
      mostrarVariacao: true,
      indisponivel: {
        motivo:
          'Ainda não conseguimos trazer os números do perfil do Instagram de forma confiável. Das quatro medidas desta seção, só uma volta de forma estável hoje, e uma seção com um número de quatro diria menos do que parece dizer. Preenchê-la com o que temos e completar o resto no olho seria pior: o cliente não teria como saber quais números foram medidos.',
        oQueTemos: [
          'O alcance do perfil dia a dia, que é a única das quatro medidas que a fonte devolve de forma estável.',
          'Todo o resultado dos anúncios que passaram pelo Instagram, nas seções do Meta acima — que é coisa diferente do desempenho do perfil.',
        ],
        dependeDe:
          'Depende de uma alteração na nossa integração com o Instagram, já solicitada e em fila. Enquanto isso, esses números continuam sendo lidos à mão no painel da plataforma.',
      },
    },
    {
      bloco: 'B1',
      id: 'numeros-google',
      titulo: 'Google Ads em julho',
      apoio:
        'Todos os números desta seção são da conta inteira do Google Ads, com a comparação contra junho ao lado.',
      faixa: 'faixa_google',
      mostrarVariacao: true,
    },
    {
      bloco: 'B2',
      id: 'campanhas-google',
      titulo: 'Campanhas do Google no mês',
      apoio:
        'Ordenadas por investimento. Campanhas de redes diferentes convivem aqui, e nem toda medida existe em todas elas.',
      tabela: 'campanhas_google',
      pergunta: 'Quanto cada campanha do Google consumiu e o que ela entregou?',
      participacaoRotulo: 'Participação no investimento',
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
          'Ainda não conseguimos trazer os termos de pesquisa com o número de cada um nesta fonte.',
        oQueTemos: [
          'O investimento, os cliques e as compras da conta inteira, na seção de Google acima.',
          'O resultado de cada campanha, na tabela acima.',
        ],
        dependeDe: DEPENDE_DO_NIVEL,
      },
    },
    {
      bloco: 'B2',
      id: 'palavras-chave',
      titulo: 'Palavras-chave do período',
      apoio: 'Quanto cada palavra comprada consumiu e o que ela trouxe.',
      tabela: 'palavras_chave',
      pergunta: 'Quais palavras-chave consumiram o investimento do mês?',
      indisponivel: {
        motivo:
          'Ainda não conseguimos separar o resultado por palavra-chave nesta fonte. Dividir o total da campanha entre as palavras seria inventar a distribuição.',
        oQueTemos: [
          'A lista das palavras-chave ativas e o tipo de correspondência de cada uma.',
          'O investimento e as compras de cada campanha de pesquisa, na tabela acima.',
        ],
        dependeDe: DEPENDE_DO_NIVEL,
      },
    },
    {
      bloco: 'B2',
      id: 'produtos-pmax',
      titulo: 'Produtos anunciados no Performance Max',
      apoio: 'Quanto cada produto do catálogo consumiu e o que ele trouxe.',
      tabela: 'produtos_pmax',
      pergunta: 'Quais produtos do catálogo consumiram o investimento do mês?',
      indisponivel: {
        motivo:
          'Ainda não conseguimos separar o resultado por produto do catálogo nesta fonte. Hoje enxergamos a campanha inteira, e não os produtos dentro dela.',
        oQueTemos: [
          'O investimento, o CTR, o CPC médio e as compras da campanha de Performance Max, na tabela acima.',
        ],
        dependeDe: DEPENDE_DO_NIVEL,
      },
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
        'cpc_medio',
        'ctr',
        'mensagens',
        'custo_por_mensagem',
        'compras',
        'custo_por_compra',
        'receita_atribuida',
        'roas',
        'impressao_topo',
      ],
    },
  ],

  dados: {
    faixas: {
      faixa_meta: faixaMeta,
      faixa_google: faixaGoogle,
      ...chavear(CAMPANHAS_EM_DESTAQUE.map((destaque) => destaque.faixa)),
    },
    tabelas: {
      campanhas_meta: tabelaMeta,
      campanhas_google: tabelaGoogle,
    },
    evolucoesMensais: {},
    rankingsCriativos: chavear(CAMPANHAS_EM_DESTAQUE.map((destaque) => destaque.ranking)),
    quebras: {},
    comentarios: chavear(
      CAMPANHAS_EM_DESTAQUE.flatMap((destaque) => (destaque.comentario ? [destaque.comentario] : [])),
    ),
  },

  /**
   * Nenhuma frase aqui explica causa. Todas descrevem o que foi medido e
   * apontam para números que estão na página. Quem explica por quê é o
   * comentário humano, nas seções próprias, assinado.
   */
  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho somou R$ 21.186,00 investidos nas duas plataformas: R$ 14.768,00 no Meta e R$ 6.418,00 no Google.',
        sustentadaPor: ['meta_investimento', 'google_investimento'],
      },
      {
        texto:
          'As plataformas atribuem a si 366 compras no período — 268 no Meta e 98 no Google — e R$ 116.281,20 de receita. Cada uma conta o resultado dela, e as duas podem estar reivindicando a mesma venda, então esse total não é o faturamento da loja.',
        sustentadaPor: ['meta_compras', 'google_compras', 'meta_roas', 'google_roas'],
      },
      {
        texto:
          'A campanha de WhatsApp iniciou 412 conversas a R$ 3,83 cada, o menor custo por conversa do ano.',
        sustentadaPor: ['meta_conversas', 'mensagens_custo_conversa'],
      },
      {
        texto:
          'Quatro seções deste relatório aparecem dizendo o que falta — o perfil do Instagram e as três aberturas abaixo do nível de campanha no Google. Nenhuma delas afeta os números acima.',
        sustentadaPor: ['instagram-organico', 'termos-de-pesquisa', 'palavras-chave', 'produtos-pmax'],
      },
    ],
    destaques: [
      {
        texto:
          'O remarketing de 14 dias teve o maior retorno atribuído do mês: 9,75× sobre R$ 2.438,00 investidos, com 71 compras a R$ 34,34 cada.',
        sustentadaPor: ['remarketing_compras', 'remarketing_custo_compra', 'campanhas_meta'],
      },
      {
        texto:
          'O anúncio AVI_FRIO_VIDEO_INSTITUCIONAL_01 sozinho respondeu por 52 das 161 compras do público frio, a R$ 48,00 cada — abaixo do custo médio do grupo, que foi R$ 53,71.',
        sustentadaPor: ['criativos_frio', 'frio_custo_compra'],
      },
      {
        texto:
          'No Google, a campanha de marca aparece no topo da busca em 74,12% das vezes em que é exibida, e devolve 8,60× o investido.',
        sustentadaPor: ['campanhas_google'],
      },
    ],
    atencao: [
      {
        texto:
          'O CPC desta conta é calculado sobre TODOS os cliques. Contando só os cliques que levam ao destino, o mesmo mês daria R$ 0,60 em vez de R$ 0,40 — são duas grandezas com o mesmo nome, e a fórmula está impressa junto de cada número.',
        sustentadaPor: ['meta_cpc', 'campanhas_meta'],
      },
      {
        texto:
          'A campanha de mensagem aparece com traço em Compras e ROAS. Ela não recebeu compra atribuída porque não foi comprada para vender, e não porque algo tenha falhado na coleta.',
        sustentadaPor: ['campanhas_meta'],
      },
      {
        texto:
          'Três campanhas do Google estão sem o número de aparições no topo, por dois motivos diferentes: em duas a medida não existe, e em uma ela existe e não veio. Nenhuma das três é zero.',
        sustentadaPor: ['campanhas_google'],
      },
      {
        texto:
          'O CPM do Meta subiu de R$ 11,42 para R$ 12,08. Este relatório mede a alta; não mede a causa dela.',
        sustentadaPor: ['meta_cpm'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'As três seções de Google que estão incompletas dependem da mesma alteração na integração, já solicitada. A do Instagram depende de outra, também em fila.',
        sustentadaPor: ['termos-de-pesquisa', 'palavras-chave', 'produtos-pmax', 'instagram-organico'],
      },
    ],
  },

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'demo-aviarte-0001',
    geradoEm: '2026-08-01T07:16:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

export const competenciasAviarte: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
  { competencia: '2026-05', rotulo: 'Maio de 2026', publicada: false },
];
