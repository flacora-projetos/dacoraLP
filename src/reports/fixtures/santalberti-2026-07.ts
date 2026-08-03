/**
 * Fixture da fase W0 — Sant'Alberti, competência 2026-07 (julho fechado).
 * Segundo modelo de relatório: E-COMMERCE.
 *
 * ATENÇÃO: todos os números aqui são INVENTADOS. Nenhum dado real de cliente
 * entra neste repositório, que é público. O que é real é a ESTRUTURA: a
 * Sant'Alberti é loja, atendida diretamente pela Dácora, e é a única cliente
 * da carteira com Meta Ads, Google Ads, Pinterest Ads, GA4 e loja conectada
 * ao mesmo tempo — por isso ela exercita o modelo inteiro. Conta, token e
 * checksum são fictícios.
 *
 * O que esta fixture exercita de propósito:
 *
 *   • receita que a mídia atribui  ≠  faturamento que a loja registrou,
 *     com a divergência mostrada na seção 03 em vez de escondida;
 *   • campanha de venda separada de tráfego e de mensagem, em tabelas com
 *     totais diferentes;
 *   • Pinterest como canal de verdade, e não como nota de rodapé;
 *   • métrica ausente ......... alcance no Google Ads e no Pinterest
 *                              (nenhuma das duas plataformas devolve o dado);
 *   • fonte que falhou ........ base de clientes da loja, erro 502;
 *   • lacuna em série ......... 09/07 do Pinterest, preservada como `null`;
 *   • relatório ainda não liberado, para ver o estado "gerado" na capa.
 *
 * COERÊNCIA ARITMÉTICA (conferida e mantida assim de propósito)
 *
 *   Investimento por canal        Meta 24.180,00 · Google 11.640,00 · Pinterest 3.420,00
 *   Investimento total            39.240,00
 *   Em campanhas de venda         21.580,00 + 10.840,00 + 3.080,00 = 35.500,00
 *   Fora de campanhas de venda     2.600,00 +    800,00 +   340,00 =  3.740,00
 *   35.500,00 + 3.740,00 = 39.240,00
 *
 *   Receita atribuída             146.214,00 + 87.954,00 + 12.312,00 = 246.480,00
 *   Compras atribuídas                   435 +       257 +        36 =         728
 *   ROAS sobre venda              246.480,00 ÷ 35.500,00 = 6,94
 *
 *   Loja                          199.120,00 ÷ 608 pedidos = 327,50 de ticket médio
 *   Divergência de receita        246.480,00 − 199.120,00 = 47.360,00 (23,8%)
 *   Divergência de contagem              728 − 608 = 120 (19,7%)
 *
 *   A soma das campanhas bate com o total de cada canal em investimento,
 *   compras, receita atribuída, impressões e cliques. Cada ROAS e cada custo
 *   por compra é o quociente arredondado dos dois valores exibidos ao lado.
 *   As séries diárias somam exatamente o total do período, com a única
 *   exceção declarada: o Pinterest, por causa da lacuna de 09/07.
 */

import {
  VERSAO_SCHEMA,
  type CompetenciaDisponivel,
  type Snapshot,
} from '../snapshot';

const META_CONTA = 'act_•••••••••4406';
const GOOGLE_CONTA = '•••-•••-2018';
const PINTEREST_CONTA = '•••••••4173';
const GA4_CONTA = 'propriedade 2•••••631';
const LOJA_CONTA = 'loja •••••••.nuvemshop.com.br';

const JANELA_META = '7 dias após o clique e 1 dia após a visualização';
const JANELA_GOOGLE = '30 dias após o clique, modelo orientado por dados';
const JANELA_PINTEREST = '30 dias após o clique e 1 dia após a visualização';

export const santalberti202607: Snapshot = {
  identidade: {
    relatorioId: 'rel_demo_santalberti_2026_07',
    clienteSlug: 'santalberti',
    clienteNome: "Sant'Alberti",
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'ecommerce',
    versaoSchema: VERSAO_SCHEMA,
  },

  /* --------------------------------------------------------------- */

  fontes: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      conta: META_CONTA,
      coletadoEm: '2026-08-04T08:31:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        `Compras e receita são atribuídas pela própria Meta, na janela de ${JANELA_META}.`,
        'Conversões de julho podem ser reajustadas pela Meta por alguns dias após o fechamento. Este relatório congela o que foi coletado em 04/08.',
      ],
    },
    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      situacao: 'parcial',
      conta: GOOGLE_CONTA,
      coletadoEm: '2026-08-04T08:33:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        `Compras e receita são atribuídas pelo próprio Google Ads, na janela de ${JANELA_GOOGLE}.`,
        'Alcance não foi coletado: o Google Ads não devolve esse dado para Shopping, Pesquisa e Performance Max.',
      ],
    },
    {
      plataforma: 'pinterest',
      rotulo: 'Pinterest Ads',
      papel: 'midia',
      situacao: 'parcial',
      conta: PINTEREST_CONTA,
      coletadoEm: '2026-08-04T08:35:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        `Checkouts e receita são atribuídos pelo próprio Pinterest, na janela de ${JANELA_PINTEREST}.`,
        'Alcance não existe nesta integração: o conector do Pinterest não expõe a métrica. Não é falha de coleta, e não deve ser lido como zero.',
        'A série diária ficou sem o dia 09/07. Os totais do período vêm do agregado da plataforma e são maiores que a soma da série.',
      ],
    },
    {
      plataforma: 'ga4',
      rotulo: 'Google Analytics 4',
      papel: 'medicao',
      situacao: 'sucesso',
      conta: GA4_CONTA,
      coletadoEm: '2026-08-04T08:36:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'O GA4 é fonte de medição do site. Ele não traz gasto de mídia nem orçamento, e os números dele não substituem os das plataformas de anúncio.',
        'A medição de receita do comércio eletrônico não está configurada nesta propriedade: o GA4 conta a sessão com compra, mas não o valor dela.',
      ],
    },
    {
      plataforma: 'ecommerce',
      rotulo: "Loja Sant'Alberti (Nuvemshop)",
      papel: 'loja',
      situacao: 'parcial',
      conta: LOJA_CONTA,
      coletadoEm: '2026-08-04T08:37:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Faturamento e pedidos consideram somente pedidos pagos, pela data do pagamento, de qualquer origem — inclusive vendas que não passaram por anúncio.',
        'A base de clientes respondeu com erro 502 nas três tentativas. Nenhum número de clientes novos entra nesta edição.',
      ],
    },
  ],

  /* --------------------------------------------------------------- */

  indicadores: [
    {
      id: 'faturamento_loja',
      rotulo: 'Faturamento da loja',
      descricao: 'Pedidos pagos registrados pela Nuvemshop no período, de qualquer origem.',
      unidade: 'brl',
      valor: { estado: 'ok', numero: 199120.0 },
      origem: { tipo: 'coletado', fontes: ['ecommerce'] },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 172480.0 },
        variacao: 0.1545,
      },
    },
    {
      id: 'receita_atribuida_midia',
      rotulo: 'Receita atribuída pela mídia',
      descricao:
        'Soma do que Meta, Google e Pinterest atribuem a si. Não é faturamento e não pode ser somada a ele.',
      unidade: 'brl',
      valor: { estado: 'ok', numero: 246480.0 },
      origem: {
        tipo: 'calculado',
        fontes: ['meta', 'google', 'pinterest'],
        formula: 'receita atribuída pela Meta + pelo Google + pelo Pinterest',
      },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: false,
        motivo:
          'Junho não teve Pinterest ativo, então o mês de base não cobre as mesmas plataformas e a comparação não foi calculada.',
      },
    },
    {
      id: 'investimento_midia',
      rotulo: 'Investimento em mídia',
      descricao: 'Valor bruto gasto em Meta, Google e Pinterest no período.',
      unidade: 'brl',
      valor: { estado: 'ok', numero: 39240.0 },
      origem: {
        tipo: 'calculado',
        fontes: ['meta', 'google', 'pinterest'],
        formula: 'investimento Meta + Google + Pinterest',
      },
      direcaoFavoravel: 'neutra',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 36100.0 },
        variacao: 0.087,
      },
    },
    {
      id: 'roas_venda',
      rotulo: 'ROAS em campanhas de venda',
      descricao:
        'Receita atribuída ÷ R$ 35.500,00 investidos em campanhas de venda. Os R$ 3.740,00 aplicados em tráfego e mensagem ficam fora desta conta.',
      unidade: 'decimal',
      sufixo: '× o investido',
      valor: { estado: 'ok', numero: 6.94 },
      origem: {
        tipo: 'calculado',
        fontes: ['meta', 'google', 'pinterest'],
        formula: 'receita atribuída ÷ investimento em campanhas de venda',
      },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: false,
        motivo:
          'A base de junho não separava campanha de venda de campanha de tráfego, então o ROAS dos dois meses não é calculado sobre a mesma coisa.',
      },
    },
    {
      id: 'ticket_medio',
      rotulo: 'Ticket médio da loja',
      descricao: 'Faturamento de pedidos pagos ÷ número de pedidos pagos.',
      unidade: 'brl',
      valor: { estado: 'ok', numero: 327.5 },
      origem: {
        tipo: 'calculado',
        fontes: ['ecommerce'],
        formula: 'faturamento ÷ pedidos pagos',
      },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 312.1 },
        variacao: 0.0493,
      },
    },
  ],

  /* --------------------------------------------------------------- */

  canais: [
    {
      plataforma: 'meta',
      rotulo: 'Meta Ads',
      papel: 'midia',
      situacao: 'sucesso',
      nota: `Compras e receita atribuídas pela própria Meta, na janela de ${JANELA_META}.`,
      metricas: [
        {
          id: 'meta_investimento',
          rotulo: 'Investimento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 24180.0 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_investimento_venda',
          rotulo: 'Em campanhas de venda',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 21580.0 },
          origem: {
            tipo: 'calculado',
            fontes: ['meta'],
            formula: 'soma do investimento das campanhas de venda',
          },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_receita_atribuida',
          rotulo: 'Receita atribuída',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 146214.0 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'meta_compras',
          rotulo: 'Compras atribuídas',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 435 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'meta_roas',
          rotulo: 'ROAS em venda',
          unidade: 'decimal',
          sufixo: '×',
          valor: { estado: 'ok', numero: 6.78 },
          origem: {
            tipo: 'calculado',
            fontes: ['meta'],
            formula: 'receita atribuída ÷ investimento em campanhas de venda',
          },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'meta_custo_compra',
          rotulo: 'Custo por compra',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 49.61 },
          origem: {
            tipo: 'calculado',
            fontes: ['meta'],
            formula: 'investimento em venda ÷ compras atribuídas',
          },
          direcaoFavoravel: 'baixa',
        },
        {
          id: 'meta_alcance',
          rotulo: 'Alcance',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 1284900 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_impressoes',
          rotulo: 'Impressões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 2368770 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_ctr',
          rotulo: 'Taxa de cliques',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.0203 },
          origem: { tipo: 'calculado', fontes: ['meta'], formula: 'cliques ÷ impressões' },
          direcaoFavoravel: 'alta',
        },
      ],
    },

    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      situacao: 'parcial',
      nota: `Compras e receita atribuídas pelo próprio Google Ads, na janela de ${JANELA_GOOGLE}.`,
      metricas: [
        {
          id: 'google_investimento',
          rotulo: 'Investimento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 11640.0 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_investimento_venda',
          rotulo: 'Em campanhas de venda',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 10840.0 },
          origem: {
            tipo: 'calculado',
            fontes: ['google'],
            formula: 'soma do investimento das campanhas de venda',
          },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_receita_atribuida',
          rotulo: 'Receita atribuída',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 87954.0 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'google_compras',
          rotulo: 'Compras atribuídas',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 257 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'google_roas',
          rotulo: 'ROAS em venda',
          unidade: 'decimal',
          sufixo: '×',
          valor: { estado: 'ok', numero: 8.11 },
          origem: {
            tipo: 'calculado',
            fontes: ['google'],
            formula: 'receita atribuída ÷ investimento em campanhas de venda',
          },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'google_custo_compra',
          rotulo: 'Custo por compra',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 42.18 },
          origem: {
            tipo: 'calculado',
            fontes: ['google'],
            formula: 'investimento em venda ÷ compras atribuídas',
          },
          direcaoFavoravel: 'baixa',
        },
        {
          id: 'google_alcance',
          rotulo: 'Alcance',
          unidade: 'inteiro',
          valor: {
            estado: 'ausente',
            motivo:
              'O Google Ads não devolve alcance para Shopping, Pesquisa e Performance Max. Use impressões para dimensionar a exposição.',
          },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_impressoes',
          rotulo: 'Impressões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 1613710 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_ctr',
          rotulo: 'Taxa de cliques',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.013 },
          origem: { tipo: 'calculado', fontes: ['google'], formula: 'cliques ÷ impressões' },
          direcaoFavoravel: 'alta',
        },
      ],
    },

    {
      plataforma: 'pinterest',
      rotulo: 'Pinterest Ads',
      papel: 'midia',
      situacao: 'parcial',
      nota: `Checkouts e receita atribuídos pelo próprio Pinterest, na janela de ${JANELA_PINTEREST}.`,
      metricas: [
        {
          id: 'pinterest_investimento',
          rotulo: 'Investimento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 3420.0 },
          origem: { tipo: 'coletado', fontes: ['pinterest'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'pinterest_investimento_venda',
          rotulo: 'Em campanhas de venda',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 3080.0 },
          origem: {
            tipo: 'calculado',
            fontes: ['pinterest'],
            formula: 'soma do investimento das campanhas de venda',
          },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'pinterest_receita_atribuida',
          rotulo: 'Receita atribuída',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 12312.0 },
          origem: { tipo: 'coletado', fontes: ['pinterest'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'pinterest_compras',
          rotulo: 'Compras atribuídas',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 36 },
          origem: { tipo: 'coletado', fontes: ['pinterest'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'pinterest_roas',
          rotulo: 'ROAS em venda',
          unidade: 'decimal',
          sufixo: '×',
          valor: { estado: 'ok', numero: 4.0 },
          origem: {
            tipo: 'calculado',
            fontes: ['pinterest'],
            formula: 'receita atribuída ÷ investimento em campanhas de venda',
          },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'pinterest_custo_compra',
          rotulo: 'Custo por compra',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 85.56 },
          origem: {
            tipo: 'calculado',
            fontes: ['pinterest'],
            formula: 'investimento em venda ÷ compras atribuídas',
          },
          direcaoFavoravel: 'baixa',
        },
        {
          id: 'pinterest_alcance',
          rotulo: 'Alcance',
          unidade: 'inteiro',
          valor: {
            estado: 'ausente',
            motivo:
              'O conector do Pinterest não expõe alcance. A métrica não existe nesta integração — não é zero e não é falha de coleta.',
          },
          origem: { tipo: 'coletado', fontes: ['pinterest'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'pinterest_impressoes',
          rotulo: 'Impressões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 863200 },
          origem: { tipo: 'coletado', fontes: ['pinterest'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'pinterest_ctr',
          rotulo: 'Taxa de cliques',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.0088 },
          origem: { tipo: 'calculado', fontes: ['pinterest'], formula: 'cliques ÷ impressões' },
          direcaoFavoravel: 'alta',
        },
      ],
    },

    {
      plataforma: 'ecommerce',
      rotulo: "Loja Sant'Alberti",
      papel: 'loja',
      situacao: 'parcial',
      nota: 'Pedidos pagos no período, de qualquer origem — inclusive vendas que não passaram por anúncio. Este é o único faturamento do relatório.',
      metricas: [
        {
          id: 'ecommerce_faturamento',
          rotulo: 'Faturamento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 199120.0 },
          origem: { tipo: 'coletado', fontes: ['ecommerce'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ecommerce_pedidos',
          rotulo: 'Pedidos pagos',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 608 },
          origem: { tipo: 'coletado', fontes: ['ecommerce'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ecommerce_ticket',
          rotulo: 'Ticket médio',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 327.5 },
          origem: {
            tipo: 'calculado',
            fontes: ['ecommerce'],
            formula: 'faturamento ÷ pedidos pagos',
          },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ecommerce_pecas',
          rotulo: 'Peças vendidas',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 1118 },
          origem: { tipo: 'coletado', fontes: ['ecommerce'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ecommerce_itens_pedido',
          rotulo: 'Peças por pedido',
          unidade: 'decimal',
          valor: { estado: 'ok', numero: 1.84 },
          origem: {
            tipo: 'calculado',
            fontes: ['ecommerce'],
            formula: 'peças vendidas ÷ pedidos pagos',
          },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ecommerce_novos_clientes',
          rotulo: 'Clientes novos',
          unidade: 'inteiro',
          valor: {
            estado: 'falha',
            motivo:
              'A base de clientes da loja respondeu com erro 502 nas três tentativas. O número não foi coletado nesta edição.',
          },
          origem: { tipo: 'coletado', fontes: ['ecommerce'] },
          direcaoFavoravel: 'alta',
        },
      ],
    },

    {
      plataforma: 'ga4',
      rotulo: 'Google Analytics 4',
      papel: 'medicao',
      situacao: 'sucesso',
      nota: 'Medição do site. O GA4 não traz gasto de mídia nem orçamento, e os números dele não substituem os das plataformas de anúncio.',
      metricas: [
        {
          id: 'ga4_sessoes',
          rotulo: 'Sessões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 84312 },
          origem: { tipo: 'coletado', fontes: ['ga4'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ga4_usuarios',
          rotulo: 'Usuários',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 61208 },
          origem: { tipo: 'coletado', fontes: ['ga4'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ga4_sessoes_compra',
          rotulo: 'Sessões com compra',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 624 },
          origem: { tipo: 'coletado', fontes: ['ga4'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'ga4_taxa_conversao',
          rotulo: 'Taxa de conversão',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.0074 },
          origem: {
            tipo: 'calculado',
            fontes: ['ga4'],
            formula: 'sessões com compra ÷ sessões',
          },
          direcaoFavoravel: 'alta',
        },
      ],
    },
  ],

  /* --------------------------------------------------------------- */
  /* Campanhas                                                        */
  /* --------------------------------------------------------------- */

  campanhas: [
    /* ---- Meta: venda ---- */
    {
      id: 'cmp_meta_catalogo_rmk',
      nome: '[Vendas] Catálogo — remarketing 14 dias',
      plataforma: 'meta',
      objetivo: 'Vendas do catálogo',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 6240.0 },
      compras: { estado: 'ok', numero: 189 },
      receitaAtribuida: { estado: 'ok', numero: 66150.0 },
      roas: { estado: 'ok', numero: 10.6 },
      custoPorCompra: { estado: 'ok', numero: 33.02 },
      impressoes: { estado: 'ok', numero: 412660 },
      cliques: { estado: 'ok', numero: 11348 },
      ctr: { estado: 'ok', numero: 0.0275 },
      janelaAtribuicao: JANELA_META,
    },
    {
      id: 'cmp_meta_advantage',
      nome: '[Vendas] Advantage+ Shopping',
      plataforma: 'meta',
      objetivo: 'Vendas',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 9860.0 },
      compras: { estado: 'ok', numero: 168 },
      receitaAtribuida: { estado: 'ok', numero: 55104.0 },
      roas: { estado: 'ok', numero: 5.59 },
      custoPorCompra: { estado: 'ok', numero: 58.69 },
      impressoes: { estado: 'ok', numero: 986240 },
      cliques: { estado: 'ok', numero: 18739 },
      ctr: { estado: 'ok', numero: 0.019 },
      janelaAtribuicao: JANELA_META,
    },
    {
      id: 'cmp_meta_inverno_frio',
      nome: '[Vendas] Coleção Inverno — público frio',
      plataforma: 'meta',
      objetivo: 'Vendas',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 5480.0 },
      compras: { estado: 'ok', numero: 78 },
      receitaAtribuida: { estado: 'ok', numero: 24960.0 },
      roas: { estado: 'ok', numero: 4.55 },
      custoPorCompra: { estado: 'ok', numero: 70.26 },
      impressoes: { estado: 'ok', numero: 604910 },
      cliques: { estado: 'ok', numero: 9078 },
      ctr: { estado: 'ok', numero: 0.015 },
      janelaAtribuicao: JANELA_META,
    },

    /* ---- Google: venda ---- */
    {
      id: 'cmp_google_shopping',
      nome: '[Shopping] Catálogo completo',
      plataforma: 'google',
      objetivo: 'Vendas',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 6420.0 },
      compras: { estado: 'ok', numero: 152 },
      receitaAtribuida: { estado: 'ok', numero: 51984.0 },
      roas: { estado: 'ok', numero: 8.1 },
      custoPorCompra: { estado: 'ok', numero: 42.24 },
      impressoes: { estado: 'ok', numero: 214880 },
      cliques: { estado: 'ok', numero: 8595 },
      ctr: { estado: 'ok', numero: 0.04 },
      janelaAtribuicao: JANELA_GOOGLE,
    },
    {
      id: 'cmp_google_pmax',
      nome: '[Performance Max] Loja',
      plataforma: 'google',
      objetivo: 'Vendas',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 3180.0 },
      compras: { estado: 'ok', numero: 61 },
      receitaAtribuida: { estado: 'ok', numero: 20130.0 },
      roas: { estado: 'ok', numero: 6.33 },
      custoPorCompra: { estado: 'ok', numero: 52.13 },
      impressoes: { estado: 'ok', numero: 96410 },
      cliques: { estado: 'ok', numero: 3181 },
      ctr: { estado: 'ok', numero: 0.033 },
      janelaAtribuicao: JANELA_GOOGLE,
    },
    {
      id: 'cmp_google_marca',
      nome: '[Pesquisa] Marca',
      plataforma: 'google',
      objetivo: 'Vendas',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 1240.0 },
      compras: { estado: 'ok', numero: 44 },
      receitaAtribuida: { estado: 'ok', numero: 15840.0 },
      roas: { estado: 'ok', numero: 12.77 },
      custoPorCompra: { estado: 'ok', numero: 28.18 },
      impressoes: { estado: 'ok', numero: 18420 },
      cliques: { estado: 'ok', numero: 4052 },
      ctr: { estado: 'ok', numero: 0.22 },
      janelaAtribuicao: JANELA_GOOGLE,
    },

    /* ---- Pinterest: venda ---- */
    {
      id: 'cmp_pinterest_catalogo',
      nome: '[Vendas] Pins de produto — catálogo',
      plataforma: 'pinterest',
      objetivo: 'Conversões',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 2280.0 },
      compras: { estado: 'ok', numero: 26 },
      receitaAtribuida: { estado: 'ok', numero: 9048.0 },
      roas: { estado: 'ok', numero: 3.97 },
      custoPorCompra: { estado: 'ok', numero: 87.69 },
      impressoes: { estado: 'ok', numero: 486200 },
      cliques: { estado: 'ok', numero: 4862 },
      ctr: { estado: 'ok', numero: 0.01 },
      janelaAtribuicao: JANELA_PINTEREST,
    },
    {
      id: 'cmp_pinterest_inverno',
      nome: '[Vendas] Coleção Inverno',
      plataforma: 'pinterest',
      objetivo: 'Conversões',
      natureza: 'venda',
      resultado: 'venda',
      situacao: 'pausada',
      investimento: { estado: 'ok', numero: 800.0 },
      compras: { estado: 'ok', numero: 10 },
      receitaAtribuida: { estado: 'ok', numero: 3264.0 },
      roas: { estado: 'ok', numero: 4.08 },
      custoPorCompra: { estado: 'ok', numero: 80.0 },
      impressoes: { estado: 'ok', numero: 162400 },
      cliques: { estado: 'ok', numero: 1462 },
      ctr: { estado: 'ok', numero: 0.009 },
      janelaAtribuicao: JANELA_PINTEREST,
    },

    /* ---- Campanhas que não foram compradas para vender ---- */
    {
      id: 'cmp_meta_trafego_blog',
      nome: '[Tráfego] Blog e lançamentos',
      plataforma: 'meta',
      objetivo: 'Tráfego para o site',
      natureza: 'trafego',
      resultado: 'sem_venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 1800.0 },
      impressoes: { estado: 'ok', numero: 268420 },
      cliques: { estado: 'ok', numero: 6710 },
      ctr: { estado: 'ok', numero: 0.025 },
      motivo:
        'Campanha otimizada para cliques no site, não para compra. A Meta não atribui receita a ela, e somá-la às campanhas de venda inflaria o ROAS.',
    },
    {
      id: 'cmp_meta_mensagem_wpp',
      nome: '[Mensagem] Atendimento no WhatsApp',
      plataforma: 'meta',
      objetivo: 'Conversas iniciadas',
      natureza: 'mensagem',
      resultado: 'sem_venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 800.0 },
      impressoes: { estado: 'ok', numero: 96540 },
      cliques: { estado: 'ok', numero: 2318 },
      ctr: { estado: 'ok', numero: 0.024 },
      motivo:
        'O resultado desta campanha é a conversa iniciada. A venda que sai dela acontece no atendimento e não é registrada pela Meta.',
      resultadoProprio: {
        rotulo: 'Conversas iniciadas',
        valor: { estado: 'ok', numero: 214 },
        unidade: 'inteiro',
        custoRotulo: 'Custo por conversa',
        custo: { estado: 'ok', numero: 3.74 },
      },
    },
    {
      id: 'cmp_google_display_rmk',
      nome: '[Display] Remarketing dinâmico',
      plataforma: 'google',
      objetivo: 'Alcance de quem visitou',
      natureza: 'trafego',
      resultado: 'sem_venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 800.0 },
      impressoes: { estado: 'ok', numero: 1284000 },
      cliques: { estado: 'ok', numero: 5136 },
      ctr: { estado: 'ok', numero: 0.004 },
      motivo:
        'Campanha de apoio, sem meta de conversão própria. O Google Ads não atribui compra a ela nesta conta.',
    },
    {
      id: 'cmp_pinterest_consideracao',
      nome: '[Consideração] Alcance da marca',
      plataforma: 'pinterest',
      objetivo: 'Consideração',
      natureza: 'trafego',
      resultado: 'sem_venda',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 340.0 },
      impressoes: { estado: 'ok', numero: 214600 },
      cliques: { estado: 'ok', numero: 1288 },
      ctr: { estado: 'ok', numero: 0.006 },
      motivo:
        'Objetivo de consideração. O Pinterest não devolve checkout atribuído para esse objetivo.',
    },
  ],

  /* --------------------------------------------------------------- */
  /* A divergência entre mídia e loja                                  */
  /* --------------------------------------------------------------- */

  confrontoReceita: {
    midia: {
      rotulo: 'Receita atribuída pelas plataformas de mídia',
      descricao:
        'Soma de Meta Ads, Google Ads e Pinterest Ads. Cada plataforma conta a venda que passou por um anúncio dela, dentro da própria janela de atribuição.',
      receita: { estado: 'ok', numero: 246480.0 },
      pedidos: { estado: 'ok', numero: 728 },
      pedidosRotulo: 'compras atribuídas',
    },
    loja: {
      rotulo: 'Faturamento registrado pela loja',
      descricao:
        'Nuvemshop, pedidos pagos no período. Inclui vendas que não vieram de anúncio e não separa por canal.',
      receita: { estado: 'ok', numero: 199120.0 },
      pedidos: { estado: 'ok', numero: 608 },
      pedidosRotulo: 'pedidos pagos',
    },
    diferenca: {
      receita: { estado: 'ok', numero: 47360.0 },
      receitaPercentual: { estado: 'ok', numero: 0.2378 },
      pedidos: { estado: 'ok', numero: 120 },
      pedidosPercentual: { estado: 'ok', numero: 0.1974 },
      base: 'acima do faturamento da loja',
    },
    explicacao: [
      'As plataformas de mídia atribuem a si R$ 47.360,00 a mais do que a loja registrou de faturamento — 23,8% acima. Em contagem, são 728 compras atribuídas contra 608 pedidos pagos: 120 a mais, 19,7%.',
      'A diferença é esperada e não indica erro em nenhum dos dois lados. Cada plataforma conta a venda que passou por um anúncio dela, dentro da própria janela, e uma mesma compra pode ser contada por mais de uma plataforma. A loja conta o pedido uma vez só, tenha ele vindo de anúncio ou não.',
      'Este relatório não tem como repartir essa sobreposição, e nenhum dos dois números foi ajustado para caber no outro. Use o faturamento da loja para saber quanto a loja vendeu no mês. Use a receita atribuída para comparar campanhas entre si, sempre dentro da mesma plataforma.',
    ],
    fontes: [
      {
        id: 'fv_meta',
        rotulo: 'Meta Ads',
        papel: 'midia',
        oQueConta: 'Compras que a Meta atribui aos anúncios dela',
        janela: JANELA_META,
        receita: { estado: 'ok', numero: 146214.0 },
        pedidos: { estado: 'ok', numero: 435 },
      },
      {
        id: 'fv_google',
        rotulo: 'Google Ads',
        papel: 'midia',
        oQueConta: 'Conversões de compra que o Google Ads atribui aos anúncios dele',
        janela: JANELA_GOOGLE,
        receita: { estado: 'ok', numero: 87954.0 },
        pedidos: { estado: 'ok', numero: 257 },
      },
      {
        id: 'fv_pinterest',
        rotulo: 'Pinterest Ads',
        papel: 'midia',
        oQueConta: 'Checkouts que o Pinterest atribui aos anúncios dele',
        janela: JANELA_PINTEREST,
        receita: { estado: 'ok', numero: 12312.0 },
        pedidos: { estado: 'ok', numero: 36 },
      },
      {
        id: 'fv_soma',
        rotulo: 'Soma das plataformas de mídia',
        papel: 'midia',
        soma: true,
        oQueConta: 'A soma das três linhas acima',
        janela: 'Janelas diferentes entre si; somar não desfaz a sobreposição',
        receita: { estado: 'ok', numero: 246480.0 },
        pedidos: { estado: 'ok', numero: 728 },
      },
      {
        id: 'fv_loja',
        rotulo: "Loja Sant'Alberti",
        papel: 'loja',
        oQueConta: 'Pedidos pagos no período, de qualquer origem',
        janela: '01/07 a 31/07, pela data do pagamento',
        receita: { estado: 'ok', numero: 199120.0 },
        pedidos: { estado: 'ok', numero: 608 },
      },
      {
        id: 'fv_ga4',
        rotulo: 'Google Analytics 4',
        papel: 'medicao',
        oQueConta: 'Sessões que terminaram em compra no site',
        janela: '01/07 a 31/07, por último clique não direto',
        receita: {
          estado: 'ausente',
          motivo: 'A medição de receita do comércio eletrônico não está configurada.',
        },
        pedidos: { estado: 'ok', numero: 624 },
        observacao: 'Medição do site. Nunca traz gasto de mídia nem orçamento.',
      },
    ],
  },

  /* --------------------------------------------------------------- */
  /* Séries diárias                                                    */
  /* --------------------------------------------------------------- */

  series: {
    faturamento_dia: {
      id: 'faturamento_dia',
      pergunta: 'Como o faturamento da loja se distribuiu ao longo de julho?',
      granularidade: 'dia',
      unidade: 'brl',
      unidadeTexto: 'Reais faturados pela loja, por dia',
      chaves: [{ id: 'ecommerce', rotulo: 'Faturamento da loja', plataforma: 'ecommerce' }],
      observacoes: [
        'Somente pedidos pagos, pela data do pagamento. A soma dos 31 dias é igual ao total do período.',
      ],
      pontos: [
        { data: '2026-07-01', valores: { ecommerce: 5098.03 } },
        { data: '2026-07-02', valores: { ecommerce: 5128.62 } },
        { data: '2026-07-03', valores: { ecommerce: 5159.21 } },
        { data: '2026-07-04', valores: { ecommerce: 6954.32 } },
        { data: '2026-07-05', valores: { ecommerce: 6995.31 } },
        { data: '2026-07-06', valores: { ecommerce: 5566.03 } },
        { data: '2026-07-07', valores: { ecommerce: 5281.56 } },
        { data: '2026-07-08', valores: { ecommerce: 5312.15 } },
        { data: '2026-07-09', valores: { ecommerce: 5342.73 } },
        { data: '2026-07-10', valores: { ecommerce: 5373.32 } },
        { data: '2026-07-11', valores: { ecommerce: 7241.24 } },
        { data: '2026-07-12', valores: { ecommerce: 7282.23 } },
        { data: '2026-07-13', valores: { ecommerce: 5792.99 } },
        { data: '2026-07-14', valores: { ecommerce: 5495.68 } },
        { data: '2026-07-15', valores: { ecommerce: 5526.26 } },
        { data: '2026-07-16', valores: { ecommerce: 5556.85 } },
        { data: '2026-07-17', valores: { ecommerce: 8381.16 } },
        { data: '2026-07-18', valores: { ecommerce: 12195.62 } },
        { data: '2026-07-19', valores: { ecommerce: 10596.8 } },
        { data: '2026-07-20', valores: { ecommerce: 6019.96 } },
        { data: '2026-07-21', valores: { ecommerce: 5709.79 } },
        { data: '2026-07-22', valores: { ecommerce: 5740.38 } },
        { data: '2026-07-23', valores: { ecommerce: 5770.97 } },
        { data: '2026-07-24', valores: { ecommerce: 5801.56 } },
        { data: '2026-07-25', valores: { ecommerce: 7815.08 } },
        { data: '2026-07-26', valores: { ecommerce: 7856.06 } },
        { data: '2026-07-27', valores: { ecommerce: 6246.92 } },
        { data: '2026-07-28', valores: { ecommerce: 5923.91 } },
        { data: '2026-07-29', valores: { ecommerce: 5954.5 } },
        { data: '2026-07-30', valores: { ecommerce: 5985.09 } },
        { data: '2026-07-31', valores: { ecommerce: 6015.67 } },
      ],
    },

    receita_atribuida_dia: {
      id: 'receita_atribuida_dia',
      pergunta: 'Quanta receita cada plataforma atribuiu a si, dia a dia?',
      granularidade: 'dia',
      unidade: 'brl',
      unidadeTexto: 'Reais atribuídos pelas plataformas, por dia',
      chaves: [
        { id: 'meta', rotulo: 'Atribuída pela Meta', plataforma: 'meta' },
        { id: 'google', rotulo: 'Atribuída pelo Google', plataforma: 'google' },
        { id: 'pinterest', rotulo: 'Atribuída pelo Pinterest', plataforma: 'pinterest' },
      ],
      observacoes: [
        'Esta série não é faturamento e não pode ser somada com o da loja. Cada linha é o que aquela plataforma reivindica para si.',
        '09/07 não tem dado do Pinterest: a coleta diária falhou naquele dia e a lacuna foi preservada.',
      ],
      pontos: [
        { data: '2026-07-01', valores: { meta: 3762.15, google: 2437.1, pinterest: 315.45 } },
        { data: '2026-07-02', valores: { meta: 3784.72, google: 2451.72, pinterest: 317.35 } },
        { data: '2026-07-03', valores: { meta: 3807.29, google: 2466.35, pinterest: 319.24 } },
        { data: '2026-07-04', valores: { meta: 4978.83, google: 2778.69, pinterest: 465.64 } },
        { data: '2026-07-05', valores: { meta: 5008.17, google: 2795.06, pinterest: 468.39 } },
        { data: '2026-07-06', valores: { meta: 4107.51, google: 2660.83, pinterest: 344.41 } },
        { data: '2026-07-07', valores: { meta: 3897.58, google: 2524.84, pinterest: 326.81 } },
        { data: '2026-07-08', valores: { meta: 3920.16, google: 2539.46, pinterest: 328.7 } },
        { data: '2026-07-09', valores: { meta: 3942.73, google: 2554.08, pinterest: null } },
        { data: '2026-07-10', valores: { meta: 3965.3, google: 2568.7, pinterest: 332.49 } },
        { data: '2026-07-11', valores: { meta: 5184.24, google: 2893.33, pinterest: 484.85 } },
        { data: '2026-07-12', valores: { meta: 5213.58, google: 2909.7, pinterest: 487.6 } },
        { data: '2026-07-13', valores: { meta: 4275.0, google: 2769.33, pinterest: 358.46 } },
        { data: '2026-07-14', valores: { meta: 4055.59, google: 2627.19, pinterest: 340.06 } },
        { data: '2026-07-15', valores: { meta: 4078.17, google: 2641.82, pinterest: 341.95 } },
        { data: '2026-07-16', valores: { meta: 4100.74, google: 2656.44, pinterest: 343.85 } },
        { data: '2026-07-17', valores: { meta: 6391.14, google: 3472.38, pinterest: 432.17 } },
        { data: '2026-07-18', valores: { meta: 9162.41, google: 4030.68, pinterest: 655.28 } },
        { data: '2026-07-19', valores: { meta: 7694.98, google: 3629.21, pinterest: 608.17 } },
        { data: '2026-07-20', valores: { meta: 4442.49, google: 2877.83, pinterest: 372.5 } },
        { data: '2026-07-21', valores: { meta: 4213.61, google: 2729.55, pinterest: 353.31 } },
        { data: '2026-07-22', valores: { meta: 4236.18, google: 2744.18, pinterest: 355.2 } },
        { data: '2026-07-23', valores: { meta: 4258.75, google: 2758.8, pinterest: 357.09 } },
        { data: '2026-07-24', valores: { meta: 4281.32, google: 2773.42, pinterest: 358.99 } },
        { data: '2026-07-25', valores: { meta: 5595.07, google: 3122.61, pinterest: 523.28 } },
        { data: '2026-07-26', valores: { meta: 5624.41, google: 3138.99, pinterest: 526.02 } },
        { data: '2026-07-27', valores: { meta: 4609.98, google: 2986.33, pinterest: 386.55 } },
        { data: '2026-07-28', valores: { meta: 4371.62, google: 2831.91, pinterest: 366.56 } },
        { data: '2026-07-29', valores: { meta: 4394.19, google: 2846.53, pinterest: 368.45 } },
        { data: '2026-07-30', valores: { meta: 4416.76, google: 2861.16, pinterest: 370.34 } },
        { data: '2026-07-31', valores: { meta: 4439.33, google: 2875.78, pinterest: 372.24 } },
      ],
    },

    investimento_dia: {
      id: 'investimento_dia',
      pergunta: 'Como o investimento em mídia foi distribuído ao longo de julho?',
      granularidade: 'dia',
      unidade: 'brl',
      unidadeTexto: 'Reais investidos, por dia',
      chaves: [
        { id: 'meta', rotulo: 'Meta Ads', plataforma: 'meta' },
        { id: 'google', rotulo: 'Google Ads', plataforma: 'google' },
        { id: 'pinterest', rotulo: 'Pinterest Ads', plataforma: 'pinterest' },
      ],
      observacoes: [
        'Valor bruto por plataforma. O Google Analytics 4 não aparece aqui: ele mede o site e nunca registra gasto de mídia.',
        '09/07 não tem dado do Pinterest: a coleta diária falhou naquele dia e a lacuna foi preservada.',
      ],
      pontos: [
        { data: '2026-07-01', valores: { meta: 668.81, google: 331.3, pinterest: 94.69 } },
        { data: '2026-07-02', valores: { meta: 672.82, google: 333.29, pinterest: 95.26 } },
        { data: '2026-07-03', valores: { meta: 676.84, google: 335.28, pinterest: 95.82 } },
        { data: '2026-07-04', valores: { meta: 748.94, google: 354.13, pinterest: 110.85 } },
        { data: '2026-07-05', valores: { meta: 753.35, google: 356.21, pinterest: 111.5 } },
        { data: '2026-07-06', valores: { meta: 730.21, google: 361.71, pinterest: 103.38 } },
        { data: '2026-07-07', valores: { meta: 692.89, google: 343.23, pinterest: 98.1 } },
        { data: '2026-07-08', valores: { meta: 696.9, google: 345.22, pinterest: 98.67 } },
        { data: '2026-07-09', valores: { meta: 700.92, google: 347.2, pinterest: null } },
        { data: '2026-07-10', valores: { meta: 704.93, google: 349.19, pinterest: 99.8 } },
        { data: '2026-07-11', valores: { meta: 779.83, google: 368.74, pinterest: 115.42 } },
        { data: '2026-07-12', valores: { meta: 784.25, google: 370.83, pinterest: 116.08 } },
        { data: '2026-07-13', valores: { meta: 759.98, google: 376.46, pinterest: 107.6 } },
        { data: '2026-07-14', valores: { meta: 720.98, google: 357.14, pinterest: 102.07 } },
        { data: '2026-07-15', valores: { meta: 724.99, google: 359.13, pinterest: 102.64 } },
        { data: '2026-07-16', valores: { meta: 729.01, google: 361.12, pinterest: 103.21 } },
        { data: '2026-07-17', valores: { meta: 989.57, google: 435.73, pinterest: 124.53 } },
        { data: '2026-07-18', valores: { meta: 1135.03, google: 467.69, pinterest: 150.0 } },
        { data: '2026-07-19', valores: { meta: 1059.69, google: 443.25, pinterest: 142.37 } },
        { data: '2026-07-20', valores: { meta: 789.76, google: 391.21, pinterest: 111.81 } },
        { data: '2026-07-21', valores: { meta: 749.07, google: 371.06, pinterest: 106.05 } },
        { data: '2026-07-22', valores: { meta: 753.08, google: 373.04, pinterest: 106.62 } },
        { data: '2026-07-23', valores: { meta: 757.1, google: 375.03, pinterest: 107.19 } },
        { data: '2026-07-24', valores: { meta: 761.11, google: 377.02, pinterest: 107.76 } },
        { data: '2026-07-25', valores: { meta: 841.63, google: 397.96, pinterest: 124.57 } },
        { data: '2026-07-26', valores: { meta: 846.05, google: 400.05, pinterest: 125.23 } },
        { data: '2026-07-27', valores: { meta: 819.54, google: 405.96, pinterest: 116.03 } },
        { data: '2026-07-28', valores: { meta: 777.16, google: 384.97, pinterest: 110.03 } },
        { data: '2026-07-29', valores: { meta: 781.17, google: 386.96, pinterest: 110.6 } },
        { data: '2026-07-30', valores: { meta: 785.19, google: 388.95, pinterest: 111.16 } },
        { data: '2026-07-31', valores: { meta: 789.2, google: 390.94, pinterest: 111.73 } },
      ],
    },
  },

  /* --------------------------------------------------------------- */

  leitura: {
    resumoExecutivo: [
      {
        texto:
          'A loja faturou R$ 199.120,00 em julho, 15,5% acima de junho, com R$ 39.240,00 investidos em mídia — 8,7% a mais que no mês anterior.',
        sustentadaPor: ['faturamento_loja', 'investimento_midia'],
      },
      {
        texto:
          'As plataformas de mídia atribuem a si R$ 246.480,00 de receita. Esse número não é o faturamento da loja e não pode ser somado a ele; a diferença entre os dois está aberta na seção seguinte.',
        sustentadaPor: ['receita_atribuida_midia', 'faturamento_loja'],
      },
      {
        texto:
          'Sobre os R$ 35.500,00 aplicados em campanhas de venda, o ROAS declarado pelas plataformas foi de 6,94×. Os R$ 3.740,00 de tráfego e mensagem ficam fora dessa conta.',
        sustentadaPor: ['roas_venda'],
      },
      {
        texto:
          'O ticket médio da loja foi de R$ 327,50 em 608 pedidos pagos, 4,9% acima de junho.',
        sustentadaPor: ['ticket_medio', 'ecommerce_pedidos'],
      },
    ],
    destaques: [
      {
        texto:
          '[Vendas] Catálogo — remarketing 14 dias teve o maior ROAS declarado do mês: 10,60× sobre R$ 6.240,00 investidos, com 189 compras atribuídas.',
        sustentadaPor: ['cmp_meta_catalogo_rmk'],
      },
      {
        texto:
          'No primeiro mês completo de veiculação, o Pinterest atribui R$ 12.312,00 a si com R$ 3.080,00 em campanhas de venda — ROAS de 4,00×.',
        sustentadaPor: ['pinterest_receita_atribuida', 'pinterest_roas'],
      },
      {
        texto:
          'Os dias 17, 18 e 19 de julho concentraram R$ 31.173,58 de faturamento da loja, o pico do mês na série diária.',
        sustentadaPor: ['faturamento_dia'],
      },
    ],
    atencao: [
      {
        texto:
          'As plataformas atribuem 120 compras a mais do que a loja registrou de pedidos pagos. É o comportamento normal da atribuição, não um erro de coleta — mas impede tratar receita atribuída como faturamento.',
        sustentadaPor: ['receita_atribuida_midia', 'ecommerce_pedidos'],
      },
      {
        texto:
          'Alcance não existe neste relatório nem para o Google Ads nem para o Pinterest: nenhuma das duas plataformas devolve o dado. Só a Meta tem alcance, e ele não é comparável com os outros canais.',
        sustentadaPor: ['google_alcance', 'pinterest_alcance', 'meta_alcance'],
      },
      {
        texto:
          'A base de clientes da loja não foi coletada: o endpoint respondeu com erro nas três tentativas. Nenhum número de cliente novo entra nesta edição.',
        sustentadaPor: ['ecommerce_novos_clientes'],
      },
      {
        texto:
          'A série diária do Pinterest está sem o dia 09/07. Os totais do período vêm do agregado da plataforma e são maiores que a soma da série.',
        sustentadaPor: ['receita_atribuida_dia', 'investimento_dia'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'Restabelecer a coleta da base de clientes da loja antes do fechamento de agosto, para o relatório voltar a separar cliente novo de cliente recorrente.',
        sustentadaPor: ['ecommerce_novos_clientes'],
      },
      {
        texto:
          'Decidir se [Vendas] Coleção Inverno — público frio segue em agosto: é a campanha de venda com o menor ROAS declarado da Meta (4,55×) e o maior custo por compra do canal (R$ 70,26).',
        sustentadaPor: ['cmp_meta_inverno_frio'],
      },
      {
        texto:
          'Avaliar aumento de verba no Pinterest: o canal fechou julho com R$ 3.080,00 em campanhas de venda, 8,7% do investimento em venda do mês.',
        sustentadaPor: ['pinterest_investimento_venda', 'roas_venda'],
      },
    ],
  },

  /* --------------------------------------------------------------- */

  publicacao: {
    estado: 'gerado',
    versao: 1,
    checksum: 'sha256:a7f2c9e14b60',
    geradoEm: '2026-08-04T08:44:00-03:00',
    aprovadoPor: null,
    aprovadoEm: null,
    enviadoEm: null,
    substituiVersao: null,
  },
};

/**
 * Competências do portal. Só julho existe nesta demonstração; junho fica
 * listada e indisponível de propósito, para mostrar como o seletor se comporta
 * quando um mês ainda não foi publicado.
 */
export const competenciasSantalberti: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
];
