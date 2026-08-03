/**
 * Fixture da fase W0 — Karyne Magalhães, competência 2026-07 (julho fechado).
 *
 * ATENÇÃO: todos os números aqui são INVENTADOS. Servem para provar o formato
 * do snapshot e o desenho da página. Nenhum dado real de cliente entra neste
 * repositório. O nome exibido é o do piloto combinado com o PO; conta, token e
 * checksum são fictícios.
 *
 * A fixture existe para exercitar de propósito os três estados que a revisão
 * precisa julgar:
 *
 *   • métrica presente e normal ......... quase tudo
 *   • métrica ausente ................... alcance no Google Ads
 *                                         (a plataforma não devolve esse dado)
 *   • fonte indisponível ................ GA4 falhou na coleta — aparece como
 *                                         falha explícita e não contamina
 *                                         Meta nem Google
 *
 * e mais uma armadilha real: a série diária do Google tem uma lacuna (14/07).
 * A lacuna é preservada como `null`; a soma da série é menor que o total do
 * período, e isso é dito na página em vez de escondido.
 *
 * Coerência aritmética (conferida à mão e mantida assim de propósito):
 *   Meta   6.482,37 / 144 leads → 45,02 por lead
 *   Google 3.117,90 /  51 leads → 61,14 por lead
 *   Total  9.600,27 / 195 leads → 49,23 por lead
 *   A soma das campanhas bate com o total de cada plataforma, em
 *   investimento, leads, impressões e cliques.
 */

import {
  VERSAO_SCHEMA,
  type CompetenciaDisponivel,
  type Snapshot,
} from '../snapshot';

const META_CONTA = 'act_•••••••••4821';
const GOOGLE_CONTA = '•••-•••-4907';

export const karyne202607: Snapshot = {
  identidade: {
    relatorioId: 'rel_demo_karyne_2026_07',
    clienteSlug: 'karyne-magalhaes',
    clienteNome: 'Karyne Magalhães',
    competencia: '2026-07',
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    fusoHorario: 'America/Sao_Paulo',
    tipoRelatorio: 'servicos_leads',
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
      coletadoEm: '2026-08-04T08:37:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Conversões de julho podem ser reajustadas pela Meta por alguns dias após o fechamento. Este relatório congela o que foi coletado em 04/08.',
      ],
    },
    {
      plataforma: 'google',
      rotulo: 'Google Ads',
      papel: 'midia',
      situacao: 'parcial',
      conta: GOOGLE_CONTA,
      coletadoEm: '2026-08-04T08:38:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'Alcance não foi coletado: o Google Ads não devolve esse dado para campanhas de Pesquisa e Performance Max.',
        'A série diária ficou sem o dia 14/07. O total do período vem do agregado da plataforma e é maior que a soma da série diária.',
      ],
    },
    {
      plataforma: 'ga4',
      rotulo: 'Google Analytics 4',
      papel: 'medicao',
      situacao: 'erro',
      conta: 'propriedade 4•••••129',
      coletadoEm: '2026-08-04T08:39:00-03:00',
      janela: { inicio: '2026-07-01', fim: '2026-07-31' },
      observacoes: [
        'A propriedade respondeu com erro de permissão (403) nas três tentativas. Nenhuma métrica de site entra nesta edição.',
        'Sessões, origem do tráfego e conversões do site voltam assim que o acesso for restabelecido.',
      ],
    },
    {
      plataforma: 'instagram',
      rotulo: 'Instagram (perfil)',
      papel: 'organico',
      situacao: 'nao_configurada',
      conta: null,
      coletadoEm: null,
      janela: null,
      observacoes: [
        'O acompanhamento de perfil não faz parte do contrato desta cliente. Não é falha de coleta.',
      ],
    },
  ],

  /* --------------------------------------------------------------- */

  indicadores: [
    {
      id: 'leads_total',
      rotulo: 'Leads gerados',
      descricao: 'Contatos registrados como conversão de lead em Meta e Google.',
      unidade: 'inteiro',
      valor: { estado: 'ok', numero: 195 },
      origem: { tipo: 'calculado', fontes: ['meta', 'google'], formula: 'leads Meta + leads Google' },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 171 },
        variacao: 0.1404,
      },
    },
    {
      id: 'investimento_total',
      rotulo: 'Investimento em mídia',
      descricao: 'Valor bruto gasto nas plataformas no período.',
      unidade: 'brl',
      valor: { estado: 'ok', numero: 9600.27 },
      origem: { tipo: 'calculado', fontes: ['meta', 'google'], formula: 'investimento Meta + investimento Google' },
      direcaoFavoravel: 'neutra',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 9412.8 },
        variacao: 0.0199,
      },
    },
    {
      id: 'cpl_total',
      rotulo: 'Custo por lead',
      descricao: 'Quanto custou, em média, cada contato gerado.',
      unidade: 'brl_por_unidade',
      sufixo: '/lead',
      valor: { estado: 'ok', numero: 49.23 },
      origem: {
        tipo: 'calculado',
        fontes: ['meta', 'google'],
        formula: 'investimento total ÷ leads',
      },
      direcaoFavoravel: 'baixa',
      comparativo: {
        permitido: true,
        competenciaBase: '2026-06',
        valorBase: { estado: 'ok', numero: 55.05 },
        variacao: -0.1056,
      },
    },
    {
      id: 'sessoes_site',
      rotulo: 'Sessões no site',
      descricao: 'Visitas registradas pelo Google Analytics 4.',
      unidade: 'inteiro',
      valor: {
        estado: 'falha',
        motivo: 'O Google Analytics 4 não respondeu na coleta (erro de permissão).',
      },
      origem: { tipo: 'coletado', fontes: ['ga4'] },
      direcaoFavoravel: 'alta',
      comparativo: {
        permitido: false,
        motivo: 'Sem valor coletado no mês, não há o que comparar.',
      },
    },
    {
      id: 'alcance_meta',
      rotulo: 'Alcance na Meta',
      descricao: 'Pessoas diferentes que viram os anúncios no Facebook e Instagram.',
      unidade: 'inteiro',
      valor: { estado: 'ok', numero: 128417 },
      origem: { tipo: 'coletado', fontes: ['meta'] },
      direcaoFavoravel: 'neutra',
      comparativo: {
        permitido: false,
        motivo: 'Junho não teve alcance coletado nesta conta, então a comparação não foi calculada.',
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
      metricas: [
        {
          id: 'meta_investimento',
          rotulo: 'Investimento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 6482.37 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_leads',
          rotulo: 'Leads',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 144 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'meta_cpl',
          rotulo: 'Custo por lead',
          unidade: 'brl_por_unidade',
          sufixo: '/lead',
          valor: { estado: 'ok', numero: 45.02 },
          origem: { tipo: 'calculado', fontes: ['meta'], formula: 'investimento ÷ leads' },
          direcaoFavoravel: 'baixa',
        },
        {
          id: 'meta_alcance',
          rotulo: 'Alcance',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 128417 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_impressoes',
          rotulo: 'Impressões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 412883 },
          origem: { tipo: 'coletado', fontes: ['meta'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'meta_ctr',
          rotulo: 'Taxa de cliques',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.0233 },
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
      metricas: [
        {
          id: 'google_investimento',
          rotulo: 'Investimento',
          unidade: 'brl',
          valor: { estado: 'ok', numero: 3117.9 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_leads',
          rotulo: 'Leads',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 51 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'alta',
        },
        {
          id: 'google_cpl',
          rotulo: 'Custo por lead',
          unidade: 'brl_por_unidade',
          sufixo: '/lead',
          valor: { estado: 'ok', numero: 61.14 },
          origem: { tipo: 'calculado', fontes: ['google'], formula: 'investimento ÷ leads' },
          direcaoFavoravel: 'baixa',
        },
        {
          id: 'google_alcance',
          rotulo: 'Alcance',
          unidade: 'inteiro',
          valor: {
            estado: 'ausente',
            motivo:
              'O Google Ads não devolve alcance para campanhas de Pesquisa e Performance Max. Use impressões para dimensionar a exposição.',
          },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_impressoes',
          rotulo: 'Impressões',
          unidade: 'inteiro',
          valor: { estado: 'ok', numero: 41207 },
          origem: { tipo: 'coletado', fontes: ['google'] },
          direcaoFavoravel: 'neutra',
        },
        {
          id: 'google_ctr',
          rotulo: 'Taxa de cliques',
          unidade: 'percentual',
          valor: { estado: 'ok', numero: 0.0756 },
          origem: { tipo: 'calculado', fontes: ['google'], formula: 'cliques ÷ impressões' },
          direcaoFavoravel: 'alta',
        },
      ],
    },
  ],

  /* --------------------------------------------------------------- */

  campanhas: [
    {
      id: 'cmp_meta_frio',
      nome: '[Leads] Consultoria — público frio',
      plataforma: 'meta',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 2914.6 },
      leads: { estado: 'ok', numero: 61 },
      custoPorLead: { estado: 'ok', numero: 47.78 },
      impressoes: { estado: 'ok', numero: 198442 },
      cliques: { estado: 'ok', numero: 4011 },
      ctr: { estado: 'ok', numero: 0.0202 },
    },
    {
      id: 'cmp_meta_remarketing',
      nome: '[Leads] Remarketing 30 dias',
      plataforma: 'meta',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 1208.45 },
      leads: { estado: 'ok', numero: 44 },
      custoPorLead: { estado: 'ok', numero: 27.46 },
      impressoes: { estado: 'ok', numero: 46310 },
      cliques: { estado: 'ok', numero: 2284 },
      ctr: { estado: 'ok', numero: 0.0493 },
    },
    {
      id: 'cmp_meta_lookalike',
      nome: '[Leads] Semelhante 1% — base de clientes',
      plataforma: 'meta',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 1641.32 },
      leads: { estado: 'ok', numero: 33 },
      custoPorLead: { estado: 'ok', numero: 49.74 },
      impressoes: { estado: 'ok', numero: 92775 },
      cliques: { estado: 'ok', numero: 2402 },
      ctr: { estado: 'ok', numero: 0.0259 },
    },
    {
      id: 'cmp_meta_institucional',
      nome: '[Reconhecimento] Institucional julho',
      plataforma: 'meta',
      objetivo: 'Reconhecimento',
      natureza: 'reconhecimento',
      resultado: 'leads',
      situacao: 'pausada',
      investimento: { estado: 'ok', numero: 718.0 },
      leads: { estado: 'ok', numero: 6 },
      custoPorLead: { estado: 'ok', numero: 119.67 },
      impressoes: { estado: 'ok', numero: 75356 },
      cliques: { estado: 'ok', numero: 944 },
      ctr: { estado: 'ok', numero: 0.0125 },
    },
    {
      id: 'cmp_google_marca',
      nome: '[Pesquisa] Marca',
      plataforma: 'google',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 612.4 },
      leads: { estado: 'ok', numero: 19 },
      custoPorLead: { estado: 'ok', numero: 32.23 },
      impressoes: { estado: 'ok', numero: 5612 },
      cliques: { estado: 'ok', numero: 1203 },
      ctr: { estado: 'ok', numero: 0.2144 },
    },
    {
      id: 'cmp_google_generico',
      nome: '[Pesquisa] Serviço — termos gerais',
      plataforma: 'google',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 1883.15 },
      leads: { estado: 'ok', numero: 24 },
      custoPorLead: { estado: 'ok', numero: 78.46 },
      impressoes: { estado: 'ok', numero: 26884 },
      cliques: { estado: 'ok', numero: 1402 },
      ctr: { estado: 'ok', numero: 0.0521 },
    },
    {
      id: 'cmp_google_pmax',
      nome: '[Performance Max] Captação',
      plataforma: 'google',
      objetivo: 'Cadastro',
      natureza: 'cadastro',
      resultado: 'leads',
      situacao: 'ativa',
      investimento: { estado: 'ok', numero: 622.35 },
      leads: { estado: 'ok', numero: 8 },
      custoPorLead: { estado: 'ok', numero: 77.79 },
      impressoes: { estado: 'ok', numero: 8711 },
      cliques: { estado: 'ok', numero: 509 },
      ctr: { estado: 'ok', numero: 0.0584 },
    },
  ],

  /* --------------------------------------------------------------- */

  series: {
    leads_dia: {
      id: 'leads_dia',
      pergunta: 'Como os leads se distribuíram ao longo de julho?',
      granularidade: 'dia',
      unidade: 'inteiro',
      chaves: [
        { id: 'meta', rotulo: 'Meta Ads', plataforma: 'meta' },
        { id: 'google', rotulo: 'Google Ads', plataforma: 'google' },
      ],
      observacoes: [
        '14/07 não tem dado do Google: a coleta diária falhou naquele dia e a lacuna foi preservada.',
      ],
      pontos: [
        { data: '2026-07-01', valores: { meta: 4, google: 1 } },
        { data: '2026-07-02', valores: { meta: 5, google: 1 } },
        { data: '2026-07-03', valores: { meta: 4, google: 1 } },
        { data: '2026-07-04', valores: { meta: 3, google: 1 } },
        { data: '2026-07-05', valores: { meta: 2, google: 1 } },
        { data: '2026-07-06', valores: { meta: 5, google: 2 } },
        { data: '2026-07-07', valores: { meta: 5, google: 1 } },
        { data: '2026-07-08', valores: { meta: 4, google: 1 } },
        { data: '2026-07-09', valores: { meta: 5, google: 2 } },
        { data: '2026-07-10', valores: { meta: 5, google: 2 } },
        { data: '2026-07-11', valores: { meta: 3, google: 1 } },
        { data: '2026-07-12', valores: { meta: 2, google: 1 } },
        { data: '2026-07-13', valores: { meta: 5, google: 2 } },
        { data: '2026-07-14', valores: { meta: 5, google: null } },
        { data: '2026-07-15', valores: { meta: 5, google: 2 } },
        { data: '2026-07-16', valores: { meta: 5, google: 2 } },
        { data: '2026-07-17', valores: { meta: 5, google: 2 } },
        { data: '2026-07-18', valores: { meta: 4, google: 1 } },
        { data: '2026-07-19', valores: { meta: 3, google: 1 } },
        { data: '2026-07-20', valores: { meta: 6, google: 2 } },
        { data: '2026-07-21', valores: { meta: 5, google: 2 } },
        { data: '2026-07-22', valores: { meta: 5, google: 2 } },
        { data: '2026-07-23', valores: { meta: 6, google: 2 } },
        { data: '2026-07-24', valores: { meta: 6, google: 2 } },
        { data: '2026-07-25', valores: { meta: 4, google: 1 } },
        { data: '2026-07-26', valores: { meta: 3, google: 1 } },
        { data: '2026-07-27', valores: { meta: 6, google: 2 } },
        { data: '2026-07-28', valores: { meta: 6, google: 2 } },
        { data: '2026-07-29', valores: { meta: 6, google: 2 } },
        { data: '2026-07-30', valores: { meta: 6, google: 2 } },
        { data: '2026-07-31', valores: { meta: 6, google: 2 } },
      ],
    },

    investimento_dia: {
      id: 'investimento_dia',
      pergunta: 'Como o investimento foi distribuído ao longo de julho?',
      granularidade: 'dia',
      unidade: 'brl',
      chaves: [
        { id: 'meta', rotulo: 'Meta Ads', plataforma: 'meta' },
        { id: 'google', rotulo: 'Google Ads', plataforma: 'google' },
      ],
      observacoes: [
        '14/07 não tem dado do Google: a coleta diária falhou naquele dia e a lacuna foi preservada.',
      ],
      pontos: [
        { data: '2026-07-01', valores: { meta: 178.69, google: 82.76 } },
        { data: '2026-07-02', valores: { meta: 204.45, google: 94.69 } },
        { data: '2026-07-03', valores: { meta: 191.75, google: 88.8 } },
        { data: '2026-07-04', valores: { meta: 132.86, google: 61.53 } },
        { data: '2026-07-05', valores: { meta: 101.82, google: 37.72 } },
        { data: '2026-07-06', valores: { meta: 220.33, google: 102.04 } },
        { data: '2026-07-07', valores: { meta: 206.79, google: 95.77 } },
        { data: '2026-07-08', valores: { meta: 197.0, google: 91.23 } },
        { data: '2026-07-09', valores: { meta: 225.1, google: 104.25 } },
        { data: '2026-07-10', valores: { meta: 210.83, google: 97.64 } },
        { data: '2026-07-11', valores: { meta: 145.9, google: 67.57 } },
        { data: '2026-07-12', valores: { meta: 111.68, google: 41.37 } },
        { data: '2026-07-13', valores: { meta: 241.36, google: 111.78 } },
        { data: '2026-07-14', valores: { meta: 226.27, google: null } },
        { data: '2026-07-15', valores: { meta: 215.3, google: 99.71 } },
        { data: '2026-07-16', valores: { meta: 245.74, google: 113.81 } },
        { data: '2026-07-17', valores: { meta: 229.92, google: 106.48 } },
        { data: '2026-07-18', valores: { meta: 158.93, google: 73.6 } },
        { data: '2026-07-19', valores: { meta: 121.53, google: 45.02 } },
        { data: '2026-07-20', valores: { meta: 262.39, google: 121.52 } },
        { data: '2026-07-21', valores: { meta: 245.74, google: 113.81 } },
        { data: '2026-07-22', valores: { meta: 233.61, google: 108.19 } },
        { data: '2026-07-23', valores: { meta: 266.38, google: 123.36 } },
        { data: '2026-07-24', valores: { meta: 249.0, google: 115.32 } },
        { data: '2026-07-25', valores: { meta: 171.97, google: 79.64 } },
        { data: '2026-07-26', valores: { meta: 131.38, google: 48.68 } },
        { data: '2026-07-27', valores: { meta: 283.42, google: 131.26 } },
        { data: '2026-07-28', valores: { meta: 265.21, google: 122.82 } },
        { data: '2026-07-29', valores: { meta: 251.91, google: 116.67 } },
        { data: '2026-07-30', valores: { meta: 287.02, google: 132.92 } },
        { data: '2026-07-31', valores: { meta: 268.09, google: 124.16 } },
      ],
    },
  },

  /* --------------------------------------------------------------- */

  leitura: {
    resumoExecutivo: [
      {
        texto:
          'Julho fechou com 195 leads, 14,0% acima de junho, com investimento praticamente estável: 2,0% a mais que no mês anterior.',
        sustentadaPor: ['leads_total', 'investimento_total'],
      },
      {
        texto:
          'O custo por lead caiu de R$ 55,05 para R$ 49,23 — uma redução de 10,6% no mês.',
        sustentadaPor: ['cpl_total'],
      },
      {
        texto:
          'A Meta respondeu por 73,8% dos leads e 67,5% do investimento; o Google Ads, pelo restante.',
        sustentadaPor: ['meta_leads', 'google_leads', 'meta_investimento', 'google_investimento'],
      },
      {
        texto:
          'As sessões do site não entram nesta edição: a propriedade do Google Analytics 4 não respondeu na coleta.',
        sustentadaPor: ['sessoes_site'],
      },
    ],
    destaques: [
      {
        texto:
          'Remarketing 30 dias entregou 44 leads a R$ 27,46 cada — o menor custo por lead do período.',
        sustentadaPor: ['cmp_meta_remarketing'],
      },
      {
        texto:
          'Na busca, a campanha de marca trouxe 19 leads a R$ 32,23, com taxa de cliques de 21,4%.',
        sustentadaPor: ['cmp_google_marca'],
      },
      {
        texto:
          'A segunda quinzena concentrou 57,6% dos leads do mês na série diária.',
        sustentadaPor: ['leads_dia'],
      },
    ],
    atencao: [
      {
        texto:
          'A campanha [Reconhecimento] Institucional julho custou R$ 119,67 por lead, o maior valor do período, e está pausada.',
        sustentadaPor: ['cmp_meta_institucional'],
      },
      {
        texto:
          'Alcance não é comparável entre os dois canais: o Google Ads não devolve esse dado para Pesquisa e Performance Max.',
        sustentadaPor: ['google_alcance', 'alcance_meta'],
      },
      {
        texto:
          'A série diária do Google está sem o dia 14/07. O total do período vem do agregado da plataforma e é maior que a soma da série.',
        sustentadaPor: ['leads_dia', 'google_leads'],
      },
    ],
    proximosPassos: [
      {
        texto:
          'Decidir na reunião do mês se a campanha institucional volta com outro formato ou é encerrada.',
        sustentadaPor: ['cmp_meta_institucional'],
      },
      {
        texto:
          'Restabelecer o acesso à propriedade do Google Analytics 4 antes do fechamento de agosto, para o relatório voltar a mostrar o comportamento no site.',
        sustentadaPor: ['sessoes_site'],
      },
      {
        texto:
          'Avaliar deslocamento de verba entre público frio (R$ 47,78 por lead) e remarketing (R$ 27,46 por lead).',
        sustentadaPor: ['cmp_meta_frio', 'cmp_meta_remarketing'],
      },
    ],
  },

  /* --------------------------------------------------------------- */

  publicacao: {
    estado: 'liberado',
    versao: 1,
    checksum: 'sha256:4b91e7c0d2a8',
    geradoEm: '2026-08-04T08:41:00-03:00',
    aprovadoPor: 'Fernanda Corá',
    aprovadoEm: '2026-08-04T09:12:00-03:00',
    enviadoEm: null,
    substituiVersao: null,
  },
};

/**
 * Competências do portal. Só a de julho existe nesta demonstração; junho fica
 * listada e indisponível de propósito, para a Fernanda ver como o seletor se
 * comporta quando um mês ainda não foi publicado.
 */
export const competenciasKaryne: CompetenciaDisponivel[] = [
  { competencia: '2026-07', rotulo: 'Julho de 2026', publicada: true },
  { competencia: '2026-06', rotulo: 'Junho de 2026', publicada: false },
];
