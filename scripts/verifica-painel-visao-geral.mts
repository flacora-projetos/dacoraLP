/**
 * Regressão da visão geral do painel — `npm run verifica:visao-geral`.
 *
 * A visão geral responde "como vai a produção dos relatórios deste mês?". Cada
 * número dela é uma contagem, e contagem errada não quebra tela nenhuma: o
 * cartão continua bonito e passa a mentir. Por isso as provas aqui são de
 * aritmética e de fronteira, não de aparência.
 *
 * O que este arquivo trava, em ordem de quanto custaria descobrir tarde:
 *
 *  1. **fila e visão geral nunca discordam do total** — as duas leem a mesma
 *     regra de versão corrente, e é isso que este teste amarra;
 *  2. **sintético e legado não contaminam a carteira** — o gate que o handoff
 *     pediu por escrito;
 *  3. **o prazo mede a PRIMEIRA versão** — medir a corrente faria toda
 *     correção parecer atraso;
 *  4. **prazo em aberto não vira zero atrasados**;
 *  5. **ausência não vira linha de zero** e formato novo não vira "não
 *     declarado";
 *  6. **o endpoint só lê** — nenhuma escrita no Supabase.
 *
 * Os relatórios deste arquivo são inventados de ponta a ponta. Nenhum número,
 * nome ou ID real de cliente entra aqui: este repositório é público.
 */
import assert from 'node:assert/strict';
import { montarFila, type LinhaDoBanco } from '../api/_painel-fila-dados.ts';
import {
  dataLimiteDaCompetencia,
  medirPrazo,
  montarVisaoGeral,
  type OrdemDoMes,
} from '../api/_painel-visao-geral-dados.ts';
import { separarPorVersaoCorrente } from '../api/_painel-versao-corrente.ts';

/* ------------------------------------------------------------------ */
/* Montador de relatório de mentira                                    */
/* ------------------------------------------------------------------ */

let contador = 0;

function linha(parcial: {
  slug: string;
  nome?: string;
  versao?: number;
  competencia?: string;
  geradoEm?: string;
  estado?: string;
  enviadoEm?: string | null;
  aprovadoEm?: string | null;
  carteira?: 'DACORA' | 'ALLGROTECH' | null;
  produto?: 'mensal_externo_cliente' | 'mensal_interno_allgrotech' | null;
  formato?: string | null;
  montagem?: any[];
  fontes?: any[];
  /** Versão nascida de uma recusa — a marca que o banco grava. */
  porRecusa?: boolean;
  revogadoEm?: string | null;
}): LinhaDoBanco {
  contador += 1;
  return {
    id: `id-${contador}`,
    cliente_slug: parcial.slug,
    competencia: parcial.competencia ?? '2026-07',
    versao: parcial.versao ?? 1,
    estado: parcial.estado ?? 'gerado',
    gerado_em: parcial.geradoEm ?? '2026-08-03T10:00:00Z',
    aprovado_por: parcial.aprovadoEm ? 'Fulano de Tal' : null,
    aprovado_em: parcial.aprovadoEm ?? null,
    enviado_em: parcial.enviadoEm ?? null,
    enviado_para: null,
    substituido_por: null,
    correcao_eh_nova_versao: parcial.porRecusa ?? false,
    revogado_em: parcial.revogadoEm ?? null,
    revogado_por: parcial.revogadoEm ? 'Fulano de Tal' : null,
    revogado_motivo: parcial.revogadoEm ? 'Cliente pausado, não vai sair.' : null,
    conteudo: {
      identidade: {
        clienteNome: parcial.nome ?? parcial.slug,
        clienteSlug: parcial.slug,
        carteira: parcial.carteira === undefined ? 'DACORA' : parcial.carteira,
        produto: parcial.produto === undefined ? 'mensal_externo_cliente' : parcial.produto,
        ...(parcial.formato === undefined
          ? { tipoRelatorio: 'small_cap' }
          : parcial.formato === null
            ? {}
            : { tipoRelatorio: parcial.formato }),
      },
      fontes: parcial.fontes ?? [],
      montagem: parcial.montagem ?? [],
      dados: { faixas: {} },
    },
  };
}

/** Um relatório sem nenhum sinal: classificado, sem fonte com falha, sem faixa. */
const HOJE_DEPOIS_DO_PRAZO = '2026-08-20T09:00:00Z';
const HOJE_ANTES_DO_PRAZO = '2026-08-02T09:00:00Z';

const visao = (linhas: LinhaDoBanco[], hoje = HOJE_DEPOIS_DO_PRAZO, competencia = '2026-07') =>
  montarVisaoGeral(linhas, competencia, hoje);

const fatia = (fatias: { chave: string; quantidade: number }[], chave: string) =>
  fatias.find((f) => f.chave === chave)?.quantidade ?? null;

/* ================================================================== */
/* 1. Fila e visão geral contam a mesma coisa                          */
/* ================================================================== */

/* O motivo de a regra de versão corrente ter virado módulo próprio. Se alguém
   mudar a regra num lado só, este teste cai — que é exatamente o defeito que
   não apareceria em nenhum dos dois testes isolados. */
{
  const linhas = [
    linha({ slug: 'um', versao: 1 }),
    linha({ slug: 'um', versao: 2 }),
    linha({ slug: 'um', versao: 3 }),
    linha({ slug: 'dois', versao: 1 }),
  ];

  assert.equal(montarFila(linhas).length, 2, 'a fila deve consolidar por cliente');
  assert.equal(visao(linhas).totalCorrentes, 2, 'a visão geral deve contar o mesmo que a fila');
  assert.equal(
    visao(linhas).totalCorrentes,
    montarFila(linhas).length,
    'fila e visão geral discordaram sobre quantos relatórios existem',
  );
}

/* Empate de versão é desempatado pela data, e não pela ordem do banco. */
{
  const linhas = [
    { ...linha({ slug: 'x', versao: 2, geradoEm: '2026-08-01T00:00:00Z' }) },
    { ...linha({ slug: 'x', versao: 2, geradoEm: '2026-08-04T00:00:00Z' }) },
  ];
  const { correntes } = separarPorVersaoCorrente(linhas);
  assert.equal(correntes.length, 1);
  assert.equal(correntes[0].gerado_em, '2026-08-04T00:00:00Z', 'o desempate por data falhou');
  assert.equal(
    separarPorVersaoCorrente([...linhas].reverse()).correntes[0].gerado_em,
    '2026-08-04T00:00:00Z',
    'o resultado dependeu da ordem em que as linhas chegaram',
  );
}

/* ================================================================== */
/* 2. Sintético e legado não contaminam a carteira                     */
/* ================================================================== */

/* O gate explícito do handoff. O smoke de áudio não tem carteira nem
   finalidade; ele precisa aparecer como classificação pendente e ficar FORA
   das contagens de Dácora e Allgrotech — sem que ninguém escreva o slug dele
   em lugar nenhum do código. */
{
  const v = visao([
    linha({ slug: 'cliente-a', carteira: 'DACORA' }),
    linha({ slug: 'cliente-b', carteira: 'ALLGROTECH' }),
    linha({ slug: 'smoke-sintetico', carteira: null, produto: null, formato: null }),
  ]);

  assert.equal(v.totalCorrentes, 3);
  assert.equal(fatia(v.cobertura.porCarteira, 'DACORA'), 1);
  assert.equal(fatia(v.cobertura.porCarteira, 'ALLGROTECH'), 1);
  assert.equal(
    fatia(v.cobertura.porCarteira, 'NAO_IDENTIFICADA'),
    1,
    'o snapshot sem carteira precisa aparecer como classificação pendente',
  );
  assert.equal(
    fatia(v.cobertura.porProduto, 'NAO_IDENTIFICADO'),
    1,
    'o snapshot sem finalidade precisa aparecer como classificação pendente',
  );
  assert.equal(
    fatia(v.cobertura.porFormato, 'NAO_DECLARADO'),
    1,
    'o snapshot sem formato precisa aparecer declarado, não somado a um formato real',
  );

  // E ele carrega o sinal de qualidade correspondente.
  assert.equal(fatia(v.qualidade.porTipo, 'classificacao_ausente'), 1);
}

/* ================================================================== */
/* 3. Formato novo aparece; fatia vazia não vira linha de zero         */
/* ================================================================== */

/* "Encontrou e não diz nada" é diferente de "diz que não". Um formato que a
   fábrica passe a emitir amanhã tem de aparecer com o próprio nome, e não cair
   no balde de não declarado — senão o painel acusaria falta de classificação
   num relatório que se classificou muito bem. */
{
  const v = visao([
    linha({ slug: 'a', formato: 'small_cap' }),
    linha({ slug: 'b', formato: 'formato_que_ainda_nao_existe' }),
  ]);

  assert.equal(fatia(v.cobertura.porFormato, 'formato_que_ainda_nao_existe'), 1);
  assert.equal(
    fatia(v.cobertura.porFormato, 'NAO_DECLARADO'),
    null,
    'formato novo foi tratado como ausência de formato',
  );
  assert.equal(
    fatia(v.cobertura.porFormato, 'ecommerce'),
    null,
    'formato sem nenhum relatório no mês não pode virar uma linha de zero',
  );
  assert.equal(
    fatia(v.cobertura.porCarteira, 'ALLGROTECH'),
    null,
    'carteira sem relatório no mês não pode virar uma linha de zero',
  );
}

/* ================================================================== */
/* 4. A fila por estado                                                */
/* ================================================================== */

/* `enviado` é derivado de `enviado_em`, não é valor da coluna `estado`. Um
   relatório liberado E entregue conta como enviado, que é onde a fila
   realmente parou. */
{
  const v = visao([
    linha({ slug: 'a', estado: 'gerado' }),
    linha({ slug: 'b', estado: 'liberado' }),
    linha({ slug: 'c', estado: 'liberado', enviadoEm: '2026-08-10T02:23:00Z' }),
  ]);

  assert.equal(fatia(v.fila.porEstado, 'gerado'), 1);
  assert.equal(fatia(v.fila.porEstado, 'liberado'), 1);
  assert.equal(
    fatia(v.fila.porEstado, 'enviado'),
    1,
    'liberado com carimbo de entrega precisa contar como enviado',
  );
}

/* ================================================================== */
/* 5. Qualidade conta relatórios, não avisos                           */
/* ================================================================== */

/* Um relatório com três seções indisponíveis é UM relatório pedindo atenção.
   Contar avisos faria a soma passar do total de relatórios e a tela afirmaria
   que há mais problemas do que documentos. */
{
  const comDuasFontesRuins = linha({
    slug: 'a',
    fontes: [
      { plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'parcial' },
      { plataforma: 'google', rotulo: 'Google Ads', situacao: 'erro' },
    ],
  });
  const v = visao([comDuasFontesRuins, linha({ slug: 'b' })]);

  assert.equal(
    fatia(v.qualidade.porTipo, 'falha_de_fonte'),
    1,
    'o mesmo relatório foi contado duas vezes pelo mesmo tipo de sinal',
  );
  assert.equal(v.qualidade.comSinal, 1);
  assert.equal(v.qualidade.semSinal, 1);
  assert.equal(v.qualidade.comSinal + v.qualidade.semSinal, v.totalCorrentes);
}

/* ================================================================== */
/* 6. Retrabalho                                                       */
/* ================================================================== */

/* O DEFEITO DE 08/10/2026: setembro aparecia com 34 "refeitos" quando só 6
   tinham sido corrigidos. O dia 1 refaz todo relatório com os dados finais, e
   isso NÃO é retrabalho. Só a versão que o banco marca como nascida de uma
   recusa conta. Os números são diferentes de propósito (1 por recusa, 2 sem),
   para a asserção não passar trocando um pelo outro. */
{
  const v = visao([
    linha({ slug: 'corrigido', nome: 'Cliente Corrigido', versao: 1 }),
    linha({ slug: 'corrigido', nome: 'Cliente Corrigido', versao: 2 }),
    linha({ slug: 'corrigido', nome: 'Cliente Corrigido', versao: 3, porRecusa: true }),
    linha({ slug: 'fechamento', versao: 1 }),
    linha({ slug: 'fechamento', versao: 2 }),
    linha({ slug: 'primeira', versao: 1 }),
  ]);

  assert.equal(v.totalCorrentes, 3);
  assert.equal(v.retrabalho.relatoriosCorrigidos, 1, 'só um cliente teve versão nascida de recusa');
  assert.equal(v.retrabalho.versoesPorRecusa, 1);
  assert.equal(v.retrabalho.versoesSemRecusa, 2, 'fechamento do mês e regra nova contam à parte');
  assert.deepEqual(v.retrabalho.maisCorrigido, { clienteNome: 'Cliente Corrigido', correcoes: 1 });
}

/* Mês com fechamento mas sem recusa nenhuma não inventa um campeão. */
{
  const v = visao([linha({ slug: 'a' }), linha({ slug: 'a', versao: 2 }), linha({ slug: 'b' })]);
  assert.equal(v.retrabalho.relatoriosCorrigidos, 0);
  assert.equal(v.retrabalho.versoesPorRecusa, 0);
  assert.equal(v.retrabalho.versoesSemRecusa, 1);
  assert.equal(v.retrabalho.maisCorrigido, null);
}

/* ================================================================== */
/* 7. O prazo                                                          */
/* ================================================================== */

/* A data-limite é o dia 5 do mês SEGUINTE ao da competência. */
assert.equal(dataLimiteDaCompetencia('2026-07', 5), '2026-08-05');
assert.equal(dataLimiteDaCompetencia('2026-01', 5), '2026-02-05');
assert.equal(
  dataLimiteDaCompetencia('2026-12', 5),
  '2027-01-05',
  'dezembro precisa virar janeiro do ano seguinte',
);

/* O DIA 5 É PRAZO DE LIBERAÇÃO, NÃO DE GERAÇÃO (decisão do PO em 2026-08-10).
   Gerado dentro do mês mas nunca liberado NÃO cumpriu o prazo — e este é o
   caso real de julho/2026, com relatórios gerados e nada liberado. */
{
  const v = visao([linha({ slug: 'a', geradoEm: '2026-08-02T10:00:00Z', aprovadoEm: null })]);
  assert.equal(v.prazo.situacao, 'vencido');
  assert.equal(
    v.prazo.liberadosNoPrazo,
    0,
    'gerar não pode contar como liberar — o prazo é de liberação',
  );
  assert.equal(v.prazo.naoLiberados, 1);
  assert.equal(v.prazo.liberadosComAtraso, 0);
}

/* A DECISÃO QUE MAIS MUDA O NÚMERO: conta a PRIMEIRA liberação, não a da
   versão corrente. O relatório foi liberado no dia 4, dentro do prazo, e uma
   correção posterior gerou a v2. Se o prazo olhasse a corrente, a correção
   transformaria um mês pontual num mês atrasado — e o painel passaria a punir
   o ato de consertar, que o cartão de retrabalho já mede à parte. */
{
  const linhas = [
    linha({ slug: 'a', versao: 1, aprovadoEm: '2026-08-04T10:00:00Z' }),
    linha({ slug: 'a', versao: 2, aprovadoEm: '2026-08-09T10:00:00Z' }),
  ];
  const v = visao(linhas);
  assert.equal(v.prazo.liberadosNoPrazo, 1, 'a liberação posterior fez o mês parecer atrasado');
  assert.equal(v.prazo.liberadosComAtraso, 0);
  assert.equal(v.prazo.naoLiberados, 0);
}

/* Liberado, mas depois da data: conta como atraso, e é dito separado de
   "ainda não liberado" — são problemas diferentes. */
{
  const v = visao([
    linha({ slug: 'a', aprovadoEm: '2026-08-09T10:00:00Z' }),
    linha({ slug: 'b', aprovadoEm: null }),
    linha({ slug: 'c', aprovadoEm: '2026-08-03T10:00:00Z' }),
  ]);
  assert.equal(v.prazo.liberadosNoPrazo, 1);
  assert.equal(v.prazo.liberadosComAtraso, 1);
  assert.equal(v.prazo.naoLiberados, 1);
  assert.equal(
    v.prazo.liberadosNoPrazo + (v.prazo.liberadosComAtraso ?? 0) + v.prazo.naoLiberados,
    v.totalCorrentes,
    'as três parcelas do prazo precisam fechar com o total de relatórios',
  );
}

/* Antes da data-limite não existe atrasado: existe prazo em aberto. */
{
  const v = visao(
    [
      linha({ slug: 'a', aprovadoEm: '2026-08-01T10:00:00Z' }),
      linha({ slug: 'b', aprovadoEm: null }),
    ],
    HOJE_ANTES_DO_PRAZO,
  );
  assert.equal(v.prazo.situacao, 'em_aberto');
  assert.equal(v.prazo.liberadosNoPrazo, 1);
  assert.equal(v.prazo.naoLiberados, 1);
  assert.equal(
    v.prazo.liberadosComAtraso,
    null,
    'prazo em aberto não pode publicar contagem de atraso',
  );
  assert.equal(v.prazo.dataLimite, '2026-08-05');
}

/* O próprio dia 5 conta como dentro do prazo, e o dia 6 não. */
{
  const dentro = medirPrazo(['2026-08-05T23:00:00Z'], '2026-07', HOJE_DEPOIS_DO_PRAZO);
  assert.equal(dentro.liberadosNoPrazo, 1, 'o próprio dia combinado precisa contar como dentro');
  assert.equal(dentro.liberadosComAtraso, 0);

  const fora = medirPrazo(['2026-08-06T00:30:00Z'], '2026-07', HOJE_DEPOIS_DO_PRAZO);
  assert.equal(fora.liberadosNoPrazo, 0);
  assert.equal(fora.liberadosComAtraso, 1);
}

/* Uma liberação numa versão que depois foi substituída continua valendo: ela
   aconteceu de verdade, e por isso o cálculo varre TODAS as versões. */
{
  const v = visao([
    linha({ slug: 'a', versao: 1, aprovadoEm: '2026-08-03T10:00:00Z' }),
    linha({ slug: 'a', versao: 2, aprovadoEm: null }),
  ]);
  assert.equal(
    v.prazo.liberadosNoPrazo,
    1,
    'a liberação da versão anterior foi esquecida porque a corrente não tem carimbo',
  );
  assert.equal(v.prazo.naoLiberados, 0);
}

/* ================================================================== */
/* 8. A função é pura                                                  */
/* ================================================================== */

/* Ela recebe "agora" de fora justamente para o teste poder fixar o tempo. Se
   alguém trocar por `new Date()` lá dentro, o prazo passa a depender do dia em
   que a suíte roda — e quebra sozinho num sábado qualquer. */
{
  const linhas = [linha({ slug: 'a' })];
  assert.deepEqual(visao(linhas), visao(linhas), 'a agregação não é determinística');
}

/* ================================================================== */
/* 9. O endpoint: devolve a visão geral e NÃO escreve                  */
/* ================================================================== */

import handler from '../api/painel-fila.ts';

const fetchOriginal = globalThis.fetch;
let metodosUsados: string[] = [];

function dublarSupabase(usuario: unknown | null, linhasDoBanco: any[]) {
  metodosUsados = [];
  globalThis.fetch = (async (entrada: any, opcoes: any) => {
    const url = String(entrada);
    metodosUsados.push((opcoes?.method ?? 'GET').toUpperCase());

    if (url.includes('/auth/v1/user')) {
      if (!usuario) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(usuario), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Recusas, causas e envios têm tabela própria; devolver as linhas de
    // relatório para elas faria o teste contar relatório como recusa.
    const corpo = url.includes('select=competencia&')
      ? linhasDoBanco.map((l) => ({ competencia: l.competencia }))
      : /relatorio_(ordens_correcao|ordem_causas|envios)\?/.test(url)
        ? []
        : linhasDoBanco;
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

async function chamar(linhasDoBanco: any[]) {
  dublarSupabase(
    { email: 'contato@nandacora.com.br', app_metadata: { provider: 'google', providers: ['google'] } },
    linhasDoBanco,
  );
  const capturado: any = { status: 0, corpo: null };
  const req: any = { method: 'GET', headers: { authorization: 'Bearer x' }, query: {} };
  const res: any = {
    setHeader: () => res,
    status(c: number) {
      capturado.status = c;
      return res;
    },
    json(c: any) {
      capturado.corpo = c;
      return res;
    },
  };
  await handler(req, res);
  return capturado;
}

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-mentira';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-servico-de-mentira';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'contato@nandacora.com.br,flacora@gmail.com';

{
  const resposta = await chamar([
    linha({ slug: 'a', versao: 1 }),
    linha({ slug: 'a', versao: 2 }),
    linha({ slug: 'b', carteira: 'ALLGROTECH' }),
  ]);

  assert.equal(resposta.status, 200);
  assert.ok(resposta.corpo.visaoGeral, 'o endpoint precisa devolver a visão geral');
  assert.equal(resposta.corpo.visaoGeral.totalCorrentes, 2);
  assert.equal(
    resposta.corpo.visaoGeral.totalCorrentes,
    resposta.corpo.itens.length,
    'a visão geral e a fila da MESMA resposta discordaram',
  );
  assert.equal(resposta.corpo.visaoGeral.retrabalho.versoesSemRecusa, 1);
  assert.equal(resposta.corpo.visaoGeral.correcoes?.recusas, 0, 'as recusas lidas precisam chegar à visão geral');
  assert.deepEqual(resposta.corpo.visaoGeral.envios, { confirmados: 0, emAndamento: 0, incertos: 0, falharam: 0 });

  /* O gate do handoff: zero escrita no Supabase. */
  assert.ok(metodosUsados.length > 0, 'nenhuma chamada foi feita — o teste não provou nada');
  assert.deepEqual(
    [...new Set(metodosUsados)],
    ['GET'],
    `o endpoint fez chamada que não é de leitura: ${metodosUsados.join(', ')}`,
  );
}

globalThis.fetch = fetchOriginal;

/* ================================================================== */
/* 10. A tela desenhada                                                */
/* ================================================================== */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { FilaApresentada, aplicarFiltros } from '../src/painel/Fila.tsx';
// O tipo do campo de filtro mora em `VisaoGeral.tsx`, que é quem define as
// dimensões. Ele é usado na varredura da seção 11; sem este import o `tsx`
// roda igual (tipo é apagado em tempo de execução) e só o `lint` acusa — foi
// exatamente assim que o erro passou despercebido na primeira entrega.
import type { CampoDeFiltro } from '../src/painel/VisaoGeral.tsx';

function desenhar(dados: any): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(FilaApresentada, { dados })),
  );
}

const linhasDeExemplo = [
  linha({ slug: 'a', nome: 'Cliente A', versao: 1 }),
  linha({ slug: 'a', nome: 'Cliente A', versao: 2 }),
  linha({ slug: 'b', nome: 'Cliente B', carteira: 'ALLGROTECH', formato: 'ecommerce' }),
];

/* Com visão geral: as abas existem e ela é a primeira coisa que se vê. */
{
  const html = desenhar({
    competencia: '2026-07',
    competencias: ['2026-07'],
    itens: montarFila(linhasDeExemplo),
    visaoGeral: visao(linhasDeExemplo),
  });

  assert.ok(html.includes('Visão geral'), 'a aba de visão geral não apareceu');
  assert.ok(html.includes('Relatórios no mês'), 'o indicador do total não apareceu');
  assert.ok(html.includes('Por carteira'), 'a distribuição por carteira não apareceu');
  assert.ok(html.includes('Retrabalho'), 'o bloco de retrabalho não apareceu');
  assert.ok(html.includes('Allgrotech'), 'a fatia da carteira não apareceu');

  /* A frase que separa este painel de um BI: ele mede a operação, não soma a
     performance de clientes diferentes. Se alguém apagar essa promessa da
     tela, este teste cai junto. */
  assert.ok(
    html.includes('não soma investimento nem resultado'),
    'a tela deixou de dizer que não soma performance entre clientes',
  );

  /* A promessa de que abrir a tela não vai buscar dado em plataforma nenhuma. */
  assert.ok(
    html.includes('não recalcula relatório fechado'),
    'a tela deixou de declarar que não recalcula',
  );

  /* Nenhuma decisão mora aqui: continua valendo para a superfície inteira. */
  for (const proibido of ['Aprovar', 'Recusar', 'Enviar']) {
    assert.ok(
      !html.includes(`>${proibido}<`),
      `a visão geral não pode ter botão de ${proibido.toLowerCase()}`,
    );
  }
}

/* Sem visão geral — resposta antiga, ou uma regressão que monta só a fila — a
   tela continua funcionando, sem abas e sem buraco. É o que impede o campo
   novo de derrubar quem já estava com a página aberta. */
{
  const html = desenhar({
    competencia: '2026-07',
    competencias: ['2026-07'],
    itens: montarFila(linhasDeExemplo),
  });

  assert.ok(html.includes('Fila de'), 'sem visão geral a fila precisa aparecer normalmente');
  assert.ok(!html.includes('role="tablist"'), 'aba não pode aparecer sem visão geral para mostrar');
  assert.ok(html.includes('Cliente A'), 'a tabela sumiu');
}

/* O cartão do prazo fala de LIBERAÇÃO, e a data-limite aparece escrita. */
{
  const html = desenhar({
    competencia: '2026-07',
    competencias: ['2026-07'],
    itens: montarFila(linhasDeExemplo),
    visaoGeral: visao(linhasDeExemplo, HOJE_ANTES_DO_PRAZO),
  });

  assert.ok(html.includes('05/08'), 'a data-limite precisa aparecer');
  assert.ok(html.includes('Liberados'), 'o cartão precisa dizer que mede liberação');
  assert.ok(
    html.includes('ainda não venceu'),
    'com o prazo em aberto, a tela precisa explicar por que não há atraso a contar',
  );
  assert.ok(
    !html.includes('liberados depois da data'),
    'não pode haver contagem de atraso antes de o prazo vencer',
  );
}

/* Com o prazo vencido e nada liberado — o caso real de julho/2026 — a tela
   diz os dois números sem transformar "não liberado" em "no prazo". */
{
  const html = desenhar({
    competencia: '2026-07',
    competencias: ['2026-07'],
    itens: montarFila(linhasDeExemplo),
    visaoGeral: visao(linhasDeExemplo, HOJE_DEPOIS_DO_PRAZO),
  });

  assert.ok(html.includes('Liberados até'), 'o rótulo do prazo vencido não apareceu');
  assert.ok(
    html.includes('ainda não foram liberados') || html.includes('ainda não foi liberado'),
    'a tela precisa dizer quantos continuam sem liberação',
  );
}

/* ================================================================== */
/* 11. O número do cartão bate com as linhas que ele abre              */
/* ================================================================== */

/* A promessa central da tela: clicar em "19 Allgrotech" mostra 19 linhas.
 *
 * Ela se quebra de dois jeitos, e nenhum dos dois erra uma conta sozinha:
 * a agregação e o filtro passando a discordar sobre o que é cada fatia, ou o
 * clique somando um filtro novo em cima de um antigo. Nos dois casos o painel
 * mentiria com números individualmente corretos — que é a pior forma.
 *
 * Este teste varre TODAS as fatias de TODAS as dimensões e exige a igualdade.
 */
{
  const linhasVariadas = [
    linha({ slug: 'a', carteira: 'DACORA', formato: 'small_cap' }),
    linha({ slug: 'b', carteira: 'DACORA', formato: 'ecommerce', estado: 'liberado' }),
    linha({ slug: 'c', carteira: 'ALLGROTECH', formato: 'servicos_leads' }),
    linha({ slug: 'd', carteira: 'ALLGROTECH', formato: 'small_cap', enviadoEm: '2026-08-09T10:00:00Z' }),
    linha({ slug: 'e', carteira: null, produto: null, formato: null }),
    linha({
      slug: 'f',
      carteira: 'ALLGROTECH',
      fontes: [{ plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'erro' }],
    }),
  ];

  const itens = montarFila(linhasVariadas);
  const v = visao(linhasVariadas);

  const dimensoes: Array<[CampoDeFiltro, { chave: string; quantidade: number }[]]> = [
    ['carteira', v.cobertura.porCarteira],
    ['produto', v.cobertura.porProduto],
    ['formato', v.cobertura.porFormato],
    ['estado', v.fila.porEstado],
    ['sinal', v.qualidade.porTipo],
  ];

  for (const [campo, fatias] of dimensoes) {
    assert.ok(fatias.length > 0, `a dimensão ${campo} não produziu nenhuma fatia para testar`);
    for (const f of fatias) {
      const linhasNaFila = aplicarFiltros(itens, { [campo]: f.chave }).length;
      assert.equal(
        linhasNaFila,
        f.quantidade,
        `o cartão diz ${f.quantidade} em ${campo}=${f.chave}, mas a fila filtrada mostra ${linhasNaFila}`,
      );
    }
  }

  /* Filtros combinados continuam sendo interseção, sem surpresa: da Allgrotech,
     `d` e `f` são enxutos; `c` é geração de leads e fica de fora. */
  assert.equal(aplicarFiltros(itens, { carteira: 'ALLGROTECH', formato: 'small_cap' }).length, 2);
  assert.equal(
    aplicarFiltros(itens, { carteira: 'DACORA', formato: 'small_cap' }).length,
    1,
    'a interseção precisa cruzar as duas dimensões, não ignorar uma',
  );
  assert.equal(aplicarFiltros(itens, {}).length, itens.length, 'sem filtro nada pode ser escondido');
}

/* ================================================================== */
/* 12. Arquivado: a decisão de que o documento não sai (08/10/2026)    */
/* ================================================================== */

/* O caso real: Dr. Danilo (o Google dele foi para o mensal da Clínica) ficava
   "esperando revisão" e "não liberado" para sempre, e a Otimiza (pausada)
   liberada sem envio. Arquivado sai do total, dos sinais e do prazo, e aparece
   só na própria fatia de "onde a fila parou". */
{
  const linhas = [
    linha({ slug: 'ativo', estado: 'liberado', aprovadoEm: '2026-08-04T10:00:00Z' }),
    linha({
      slug: 'arquivado',
      revogadoEm: '2026-08-10T10:00:00Z',
      fontes: [{ plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'erro' }],
    }),
  ];
  const v = visao(linhas);
  assert.equal(v.totalCorrentes, 1, 'arquivado não pode contar como relatório do mês');
  assert.equal(v.arquivados, 1);
  assert.equal(fatia(v.fila.porEstado, 'arquivado'), 1, 'o arquivado precisa aparecer na própria fatia');
  assert.equal(fatia(v.fila.porEstado, 'gerado'), null, 'arquivado não pode aparecer como esperando revisão');
  assert.equal(v.qualidade.comSinal, 0, 'o sinal do arquivado não pede atenção de ninguém');
  assert.equal(v.prazo.naoLiberados, 0, 'arquivado não pode ficar "não liberado" para sempre');
  assert.equal(v.prazo.liberadosNoPrazo, 1);

  /* A prova positiva: SEM o arquivamento, o mesmo documento conta. */
  const semArquivo = visao([linhas[0], linha({ slug: 'arquivado' })]);
  assert.equal(semArquivo.totalCorrentes, 2);
  assert.equal(semArquivo.prazo.naoLiberados, 1);

  /* E o filtro da fila bate com o cartão mesmo com o arquivado presente. */
  const itens = montarFila(linhas);
  assert.equal(itens.length, 2, 'a fila continua mostrando o arquivado, no fim');
  assert.equal(itens[itens.length - 1].estado, 'arquivado');
  assert.equal(aplicarFiltros(itens, { carteira: 'DACORA' }).length, fatia(v.cobertura.porCarteira, 'DACORA'));
  assert.equal(aplicarFiltros(itens, { estado: 'arquivado' }).length, 1);
}

/* ================================================================== */
/* 13. Correções e erros                                               */
/* ================================================================== */

{
  const montagem = [{ id: 'evolucao-meta', bloco: 'B3', titulo: 'Evolução do ano no Meta' }];
  const linhas = [
    linha({ slug: 'x', versao: 1, montagem }),
    linha({ slug: 'x', versao: 2, porRecusa: true, montagem }),
    linha({ slug: 'y', versao: 1, montagem }),
  ];
  const ordem = (parcial: Partial<OrdemDoMes>): OrdemDoMes => ({
    id: `o-${Math.random()}`,
    cliente_slug: 'x',
    relatorio_versao: 1,
    estado: 'nova_versao_gerada',
    catalog_version: '2026-10-08.v2',
    solicitado_em: '2026-08-02T10:00:00Z',
    fechada_manualmente_em: '2026-08-03T10:00:00Z',
    falha_automatica_codigo: null,
    causas: [],
    ...parcial,
  });
  const ordens: OrdemDoMes[] = [
    ordem({
      catalog_version: '2026-09-01.v1',
      causas: [{ cause_id: 'outra_causa', catalog_version: '2026-09-01.v1', parameters: { description: 'x', section_ids: ['bloco:evolucao-meta'] } }],
      falha_automatica_codigo: 'report_correction_agent_nao_integrou',
    }),
    ordem({
      cliente_slug: 'y',
      causas: [
        { cause_id: 'retirar_secao', catalog_version: '2026-10-08.v2', parameters: { description: 'x', section_ids: ['bloco:evolucao-meta'] } },
        { cause_id: 'outra_causa', catalog_version: '2026-10-08.v2', parameters: { description: 'x' } },
      ],
      estado: 'aguardando_nova_versao',
      fechada_manualmente_em: null,
    }),
    ordem({ cliente_slug: 'y', causas: [], estado: 'falhou', fechada_manualmente_em: null }),
  ];
  const v = montarVisaoGeral(linhas, '2026-07', HOJE_DEPOIS_DO_PRAZO, { ordens, envios: [], prazoDeOutrosMeses: [] });
  const c = v.correcoes!;
  assert.equal(c.recusas, 3);
  assert.equal(c.relatoriosRecusados, 2);

  const motivos = Object.fromEntries(c.porMotivo.map((f) => [f.rotulo, f.quantidade]));
  /* "Outra coisa" da lista antiga e da nova NÃO se somam: a antiga engolia o
     que hoje tem nome. */
  assert.equal(motivos['Outra coisa (lista antiga, antes de 08/10)'], 1);
  assert.equal(motivos['Outra coisa'], 1);
  assert.equal(motivos['Retirar uma parte'], 1);
  assert.equal(motivos['Sem motivo classificado (recusa antiga)'], 1, 'recusa sem causa conta, sem motivo inventado');

  assert.deepEqual(
    c.partesMaisCitadas.map((f) => [f.rotulo, f.quantidade]),
    [['Evolução do ano no Meta', 2]],
    'a parte vem com o título que estava na versão recusada',
  );
  assert.deepEqual(c.desfecho, { automatica: 0, porUmaPessoa: 1, emAberto: 1, parada: 1, automacaoTentouAntes: 1 });

  /* Ausência não vira zero: recusas que não puderam ser lidas são `null`. */
  assert.equal(montarVisaoGeral(linhas, '2026-07', HOJE_DEPOIS_DO_PRAZO, { ordens: null }).correcoes, null);
}

/* Tempo até aprovar: mediana de 10 h e 30 h é 20 h, medido na PRIMEIRA
   aprovação contra a geração daquela mesma versão. */
{
  const v = visao([
    linha({ slug: 'a', geradoEm: '2026-08-01T00:00:00Z', aprovadoEm: '2026-08-01T10:00:00Z' }),
    linha({ slug: 'b', geradoEm: '2026-08-01T00:00:00Z', aprovadoEm: '2026-08-02T06:00:00Z' }),
    linha({ slug: 'c' }),
  ]);
  assert.equal(v.horasAteAprovar, 20);
  assert.equal(v.aprovadosMedidos, 2);
  assert.equal(visao([linha({ slug: 'z' })]).horasAteAprovar, null, 'sem aprovação não existe tempo, nem zero');
}

/* Envios: "sem confirmação" é dito separado de "falhou". */
{
  const v = montarVisaoGeral([linha({ slug: 'a' })], '2026-07', HOJE_DEPOIS_DO_PRAZO, {
    envios: [
      { relatorio_id: '1', estado: 'confirmado' },
      { relatorio_id: '2', estado: 'confirmado' },
      { relatorio_id: '3', estado: 'incerto' },
      { relatorio_id: '4', estado: 'falhou' },
      { relatorio_id: '5', estado: 'pendente' },
    ],
  });
  assert.deepEqual(v.envios, { confirmados: 2, emAndamento: 1, incertos: 1, falharam: 1 });
}

/* Prazo mês a mês: só meses ANTERIORES, no máximo três, arquivado fora. */
{
  const v = montarVisaoGeral([linha({ slug: 'a' })], '2026-07', HOJE_DEPOIS_DO_PRAZO, {
    prazoDeOutrosMeses: [
      { cliente_slug: 'a', competencia: '2026-03', versao: 1, aprovado_em: '2026-04-02T10:00:00Z', revogado_em: null },
      { cliente_slug: 'a', competencia: '2026-04', versao: 1, aprovado_em: '2026-05-02T10:00:00Z', revogado_em: null },
      { cliente_slug: 'a', competencia: '2026-05', versao: 1, aprovado_em: '2026-06-09T10:00:00Z', revogado_em: null },
      { cliente_slug: 'b', competencia: '2026-06', versao: 1, aprovado_em: null, revogado_em: '2026-07-08T10:00:00Z' },
      { cliente_slug: 'a', competencia: '2026-06', versao: 1, aprovado_em: '2026-07-04T10:00:00Z', revogado_em: null },
      { cliente_slug: 'a', competencia: '2026-08', versao: 1, aprovado_em: null, revogado_em: null },
    ],
  });
  const meses = v.prazoDeOutrosMeses!;
  assert.deepEqual(meses.map((m) => m.competencia), ['2026-04', '2026-05', '2026-06']);
  assert.equal(meses[1].prazo.liberadosComAtraso, 1);
  assert.equal(meses[2].prazo.naoLiberados, 0, 'o arquivado de junho não pode virar "não liberado"');
  assert.equal(meses[2].prazo.liberadosNoPrazo, 1);
}

console.log(
  'OK — visão geral: cobertura, fila, qualidade, retrabalho, prazo, pureza, zero escrita no banco, a tela desenhada e o cartão batendo com a fila filtrada',
);
