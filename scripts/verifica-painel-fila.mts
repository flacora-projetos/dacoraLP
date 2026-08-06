/**
 * Regressão da fila do painel — `npm run verifica:fila`.
 *
 * Mesmo motivo do `verifica-painel-autorizacao.mts`: subir a página prova que a
 * tabela aparece, não prova que a ORDEM está certa. E a ordem é a entrega
 * inteira desta fase — é ela que transforma 46 relatórios em vinte minutos de
 * trabalho em vez de uma tarde. Uma mudança inocente na função de ordenação não
 * quebra nada visível: a fila continua bonita, só passa a esconder o relatório
 * que precisava de atenção no meio dos 46.
 *
 * Duas metades:
 *
 *  1. a lógica pura (`montarFila`) contra relatórios de mentira, montados aqui;
 *  2. o endpoint inteiro, com o Supabase trocado por dublê — provando as
 *     recusas e, principalmente, que **quem não passa na porta não chega perto
 *     do banco**.
 *
 * Os relatórios de mentira deste arquivo são inventados de ponta a ponta.
 * Nenhum número, nome ou ID real de cliente entra aqui: este repositório é
 * público.
 */
import assert from 'node:assert/strict';

/** O `Intl` separa moeda com espaco nao-quebravel (U+00A0). Escrito como escape
 *  porque um U+00A0 literal no codigo-fonte e invisivel para quem editar depois. */
const normalizarEspacos = (texto: string) => texto.replace(/\u00a0/g, ' ');
import { montarFila, montarItem, type LinhaDoBanco } from '../api/_painel-fila-dados.ts';

/* ------------------------------------------------------------------ */
/* Montadores de relatório de mentira                                  */
/* ------------------------------------------------------------------ */

interface OpcoesDeFaixa {
  plataforma: string;
  /** `null` para "não veio" — é o caso que não pode virar zero. */
  investimento: number | null;
  resultado?: number | null;
  variacaoInvestimento?: number;
  comparativoPermitido?: boolean;
  /** Um bloco que não é a plataforma inteira: grupo de campanha, por exemplo. */
  escopo?: string;
}

function faixa(o: OpcoesDeFaixa) {
  const metricas: any[] = [
    {
      id: `${o.plataforma}_investimento`,
      rotulo: 'Investimento',
      unidade: 'brl',
      glossarioId: 'investimento',
      origem: { tipo: 'coletado', fontes: [o.plataforma] },
      valor:
        o.investimento === null
          ? { estado: 'ausente', motivo: 'a plataforma não devolveu o valor' }
          : { estado: 'ok', numero: o.investimento },
      ...(o.variacaoInvestimento !== undefined
        ? {
            comparativo: {
              permitido: o.comparativoPermitido ?? true,
              variacao: o.variacaoInvestimento,
              competenciaBase: '2026-06',
            },
          }
        : {}),
    },
  ];

  if (o.resultado !== undefined && o.resultado !== null) {
    metricas.push({
      id: `${o.plataforma}_resultado`,
      rotulo: 'Leads',
      unidade: 'inteiro',
      glossarioId: 'conversoes',
      origem: { tipo: 'coletado', fontes: [o.plataforma] },
      valor: { estado: 'ok', numero: o.resultado },
    });
  }

  return {
    id: `faixa_${o.escopo ?? o.plataforma}`,
    escopo: { tipo: o.escopo ? 'grupo_de_campanha' : 'plataforma', rotulo: 'x' },
    metricas,
  };
}

let contador = 0;
function linha(parcial: {
  slug: string;
  nome?: string;
  estado?: string;
  enviadoEm?: string | null;
  faixas?: any[];
  montagem?: any[];
  fontes?: any[];
}): LinhaDoBanco {
  contador += 1;
  return {
    id: `id-${contador}`,
    cliente_slug: parcial.slug,
    competencia: '2026-07',
    versao: 1,
    estado: parcial.estado ?? 'gerado',
    gerado_em: '2026-08-01T10:00:00Z',
    aprovado_por: null,
    aprovado_em: null,
    enviado_em: parcial.enviadoEm ?? null,
    enviado_para: null,
    substituido_por: null,
    conteudo: {
      identidade: { clienteNome: parcial.nome ?? parcial.slug, clienteSlug: parcial.slug },
      fontes: parcial.fontes ?? [],
      montagem: parcial.montagem ?? [],
      dados: {
        faixas: Object.fromEntries((parcial.faixas ?? []).map((f) => [f.id, f])),
      },
    },
  };
}

/* ================================================================== */
/* 1. Os números da linha                                              */
/* ================================================================== */

/* Soma das plataformas, e só das plataformas. -------------------------
   Este é o caso que já existe de verdade na carteira: além da faixa do
   Meta inteiro, um cliente tem faixas por grupo de campanha, TODAS com
   uma métrica chamada "Investimento". Somar as duas mostraria o dobro do
   mês na fila, e nada pareceria errado. */
{
  const item = montarItem(
    linha({
      slug: 'a',
      faixas: [
        faixa({ plataforma: 'meta', investimento: 1000, resultado: 20 }),
        faixa({ plataforma: 'meta', investimento: 400, escopo: 'grupo_frio' }),
        faixa({ plataforma: 'meta', investimento: 600, escopo: 'grupo_remarketing' }),
      ],
    }),
  );
  assert.equal(item.investimento, 1000, 'grupo de campanha não pode entrar na soma do mês');
  assert.equal(item.investimentoPorPlataforma.length, 1);
}

/* Duas plataformas somam. --------------------------------------------- */
{
  const item = montarItem(
    linha({
      slug: 'b',
      faixas: [
        faixa({ plataforma: 'meta', investimento: 1000, resultado: 20 }),
        faixa({ plataforma: 'google', investimento: 500, resultado: 8 }),
      ],
    }),
  );
  assert.equal(item.investimento, 1500);
  assert.equal(item.resultados.length, 2);
}

/* AUSÊNCIA NÃO VIRA ZERO. --------------------------------------------
   Sem nenhum investimento apurado o campo é `null`, e a tela escreve um
   traço. Um zero aqui afirmaria que o cliente não gastou nada no mês —
   que é uma frase sobre o negócio dele, dita por engano. */
{
  const item = montarItem(
    linha({ slug: 'c', faixas: [faixa({ plataforma: 'meta', investimento: null, resultado: 3 })] }),
  );
  assert.equal(item.investimento, null, 'investimento ausente virou zero');
  assert.ok(item.sinais.some((s) => s.tipo === 'valor_ausente'));
}

/* Mas o que veio de uma plataforma não some porque a outra falhou. ----- */
{
  const item = montarItem(
    linha({
      slug: 'd',
      faixas: [
        faixa({ plataforma: 'meta', investimento: 700, resultado: 5 }),
        faixa({ plataforma: 'google', investimento: null, resultado: 2 }),
      ],
    }),
  );
  assert.equal(item.investimento, 700);
}

/* ================================================================== */
/* 2. Os sinais de atenção                                             */
/* ================================================================== */

/* Seção que o próprio relatório declara indisponível. ------------------ */
{
  const item = montarItem(
    linha({
      slug: 'e',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1 })],
      montagem: [
        { titulo: 'Palavras-chave', indisponivel: { motivo: 'a conta não tem rede de pesquisa' } },
        { titulo: 'Criativos', indisponivel: { motivo: 'sem miniatura nesta coleta' } },
        { titulo: 'Visão geral' },
      ],
    }),
  );
  const sinal = item.sinais.find((s) => s.tipo === 'secoes_indisponiveis');
  assert.ok(sinal, 'não sinalizou seção indisponível');
  assert.equal(sinal!.texto, '2 seções indisponíveis', 'a etiqueta precisa ser CONTÁVEL');
  assert.ok(sinal!.detalhe.includes('Palavras-chave'));
}

/* Uma só: singular, porque "1 seções indisponíveis" é o tipo de detalhe
   que faz uma ferramenta parecer inacabada. */
{
  const item = montarItem(
    linha({
      slug: 'f',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1 })],
      montagem: [{ titulo: 'Criativos', indisponivel: { motivo: 'x' } }],
    }),
  );
  assert.equal(item.sinais.find((s) => s.tipo === 'secoes_indisponiveis')!.texto, '1 seção indisponível');
}

/* Plataforma sem evento de resultado definido no cadastro. ------------- */
{
  const item = montarItem(
    linha({ slug: 'g', faixas: [faixa({ plataforma: 'google', investimento: 300 })] }),
  );
  assert.ok(item.sinais.some((s) => s.tipo === 'sem_resultado'));
  assert.equal(item.resultados.length, 0);
}

/* Variação forte: acima do corte sinaliza, abaixo não. ----------------- */
{
  const forte = montarItem(
    linha({
      slug: 'h',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1, variacaoInvestimento: 0.47 })],
    }),
  );
  assert.ok(forte.sinais.some((s) => s.tipo === 'variacao_forte' && s.texto.includes('+47%')));

  const fraca = montarItem(
    linha({
      slug: 'i',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1, variacaoInvestimento: 0.11 })],
    }),
  );
  assert.ok(!fraca.sinais.some((s) => s.tipo === 'variacao_forte'));

  const queda = montarItem(
    linha({
      slug: 'j',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1, variacaoInvestimento: -0.4 })],
    }),
  );
  assert.ok(queda.sinais.some((s) => s.texto.includes('−40%')), 'queda precisa aparecer como queda');
}

/* COMPARAÇÃO PROIBIDA CONTINUA PROIBIDA NA FILA. ----------------------
   Quando o relatório diz que aquela comparação não pode ser feita — mês
   incompleto, valor travado numa faixa pela API —, a fila não a faz por
   fora. Seria refazer, num lugar sem contexto, exatamente o erro que o
   relatório evita. */
{
  const item = montarItem(
    linha({
      slug: 'k',
      faixas: [
        faixa({
          plataforma: 'meta',
          investimento: 100,
          resultado: 1,
          variacaoInvestimento: 0.9,
          comparativoPermitido: false,
        }),
      ],
    }),
  );
  assert.ok(!item.sinais.some((s) => s.tipo === 'variacao_forte'), 'comparou o que era proibido comparar');
}

/* Coleta que falhou vira sinal; plataforma que o cliente não tem, não. -
   O cliente não usar Pinterest não é falha de coleta, e tratar como
   sinal encheria a fila de ruído que ninguém pode resolver — o jeito
   mais fácil de fazer todo mundo parar de ler os sinais. */
{
  const item = montarItem(
    linha({
      slug: 'l',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1 })],
      fontes: [
        { plataforma: 'google', rotulo: 'Google Ads', situacao: 'erro' },
        { plataforma: 'pinterest', rotulo: 'Pinterest', situacao: 'nao_configurada' },
        { plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'ok' },
      ],
    }),
  );
  const falhas = item.sinais.filter((s) => s.tipo === 'falha_de_fonte');
  assert.equal(falhas.length, 1, 'só a coleta com erro devia sinalizar');
  assert.ok(falhas[0].texto.includes('Google Ads'));
}

/* Relatório limpo não inventa sinal. ---------------------------------- */
{
  const item = montarItem(
    linha({
      slug: 'm',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1, variacaoInvestimento: 0.05 })],
      fontes: [{ plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'ok' }],
    }),
  );
  assert.deepEqual(item.sinais, [], 'relatório sem problema não pode ganhar sinal');
  assert.equal(item.atencao, 0);
}

/* ================================================================== */
/* 3. A ORDEM — a entrega desta fase                                   */
/* ================================================================== */

{
  const limpo = faixa({ plataforma: 'meta', investimento: 100, resultado: 1 });
  const fila = montarFila([
    linha({ slug: 'zulu', nome: 'Zulu', faixas: [limpo] }),
    linha({
      slug: 'alfa',
      nome: 'Alfa',
      faixas: [faixa({ plataforma: 'meta', investimento: null, resultado: 1 })],
    }),
    linha({ slug: 'bravo', nome: 'Bravo', faixas: [limpo], enviadoEm: '2026-08-04T10:00:00Z' }),
    linha({
      slug: 'charlie',
      nome: 'Charlie',
      faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 1, variacaoInvestimento: 0.5 })],
    }),
    linha({ slug: 'alvo', nome: 'Alvo', faixas: [limpo] }),
  ]);

  const ordem = fila.map((i) => i.clienteNome);

  // 1º: quem tem o sinal mais pesado (investimento ausente).
  assert.equal(ordem[0], 'Alfa');
  // 2º: quem tem sinal mais leve (variação forte).
  assert.equal(ordem[1], 'Charlie');
  // Depois os limpos, em alfabética — o alfabeto é DESEMPATE, e serve só
  // para a lista não dançar entre dois carregamentos.
  assert.deepEqual(ordem.slice(2, 4), ['Alvo', 'Zulu']);
  // Por último o já enviado: ele não pede nada de ninguém, por mais
  // sinais que carregue.
  assert.equal(ordem[4], 'Bravo');
  assert.equal(fila.find((i) => i.clienteNome === 'Bravo')!.estado, 'enviado');
}

/* `enviado` é DERIVADO de `enviado_em`, não é valor da coluna `estado`.
   Derivar em vez de inventar um estado na tela é o que mantém tela e
   banco de acordo: o banco continua com três estados, e é ele quem manda. */
{
  const [item] = montarFila([
    linha({ slug: 'n', estado: 'liberado', enviadoEm: '2026-08-04T10:00:00Z', faixas: [] }),
  ]);
  assert.equal(item.estado, 'enviado');
}
{
  const [item] = montarFila([linha({ slug: 'o', estado: 'liberado', faixas: [] })]);
  assert.equal(item.estado, 'liberado');
}
{
  const [item] = montarFila([linha({ slug: 'p', estado: 'coisa_nova', faixas: [] })]);
  assert.equal(item.estado, 'desconhecido', 'estado que o banco ganhar depois não pode virar tela em branco');
}

/* Relatório vazio não derruba a fila. --------------------------------- */
{
  const [item] = montarFila([{ ...linha({ slug: 'q' }), conteudo: null } as LinhaDoBanco]);
  assert.equal(item.clienteNome, 'q');
  assert.equal(item.investimento, null);
}

/* ================================================================== */
/* 4. O endpoint inteiro                                               */
/* ================================================================== */

import handler from '../api/painel-fila.ts';

const fetchOriginal = globalThis.fetch;

interface Chamada {
  url: string;
  cabecalhos: Record<string, string>;
}

let chamadasAoBanco: Chamada[] = [];

function dublarSupabase(usuario: unknown | null, linhasDoBanco: any[] = []) {
  chamadasAoBanco = [];
  globalThis.fetch = (async (entrada: any, opcoes: any) => {
    const url = String(entrada);

    // A conferência de sessão.
    if (url.includes('/auth/v1/user')) {
      if (!usuario) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(usuario), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // A leitura da tabela.
    chamadasAoBanco.push({ url, cabecalhos: opcoes?.headers ?? {} });
    const corpo = url.includes('select=competencia&')
      ? linhasDoBanco.map((l) => ({ competencia: l.competencia }))
      : linhasDoBanco;
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

async function chamarFila(
  cabecalhoAutorizacao: string | undefined,
  usuario: unknown | null,
  linhasDoBanco: any[] = [],
  extras: { metodo?: string; competencia?: string } = {},
) {
  dublarSupabase(usuario, linhasDoBanco);
  const capturado: any = { status: 0, corpo: null, cabecalhos: {} };
  const req: any = {
    method: extras.metodo ?? 'GET',
    headers: { authorization: cabecalhoAutorizacao },
    query: extras.competencia ? { competencia: extras.competencia } : {},
  };
  const res: any = {
    setHeader(n: string, v: string) {
      capturado.cabecalhos[n.toLowerCase()] = v;
      return res;
    },
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

const googlada = (email: string) => ({
  email,
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Fulano de Tal' },
});

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-mentira';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-servico-de-mentira';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'contato@nandacora.com.br,flacora@gmail.com';

const duasLinhas = [
  linha({ slug: 'um', nome: 'Um', faixas: [faixa({ plataforma: 'meta', investimento: 100, resultado: 2 })] }),
  linha({ slug: 'dois', nome: 'Dois', faixas: [faixa({ plataforma: 'meta', investimento: null, resultado: 2 })] }),
];

/* QUEM NÃO PASSA NA PORTA NÃO CHEGA PERTO DO BANCO. -------------------
   Não basta a resposta ser 401/403: a leitura da tabela não pode nem ter
   sido tentada. É a diferença entre "não te mostrei" e "não busquei". */
{
  const r = await chamarFila(undefined, null, duasLinhas);
  assert.equal(r.status, 401);
  assert.equal(chamadasAoBanco.length, 0, 'leu a tabela sem sessão nenhuma');
  assert.equal(r.corpo.itens, undefined);
}
{
  const r = await chamarFila('Bearer t', googlada('estranho@exemplo.com'), duasLinhas);
  assert.equal(r.status, 403);
  assert.equal(chamadasAoBanco.length, 0, 'leu a tabela para um e-mail não autorizado');
  assert.equal(r.corpo.itens, undefined);
  assert.ok(!JSON.stringify(r.corpo).includes('nandacora'), 'a lista de autorizados vazou');
}
{
  const r = await chamarFila('Bearer t', {
    email: 'flacora@gmail.com',
    app_metadata: { provider: 'email', providers: ['email'] },
  }, duasLinhas);
  assert.equal(r.status, 403);
  assert.equal(chamadasAoBanco.length, 0);
}

/* Autorizado: a fila sai montada e ordenada. --------------------------- */
{
  const r = await chamarFila('Bearer t', googlada('flacora@gmail.com'), duasLinhas);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.competencia, '2026-07');
  assert.deepEqual(r.corpo.competencias, ['2026-07']);
  assert.equal(r.corpo.itens.length, 2);
  assert.equal(r.corpo.itens[0].clienteNome, 'Dois', 'o que tem sinal precisa vir primeiro');

  /* A COLUNA `token` NUNCA É PEDIDA. Ela é a credencial de acesso do
     relatório do cliente; o que não sai daqui não vaza em log, em cache
     nem numa aba aberta por engano. */
  for (const chamada of chamadasAoBanco) {
    assert.ok(!/[?&]select=[^&]*token/.test(chamada.url), `a consulta pediu o token: ${chamada.url}`);
  }

  /* E a chave de serviço é a que fala com o banco — nunca a pública. */
  assert.equal((chamadasAoBanco[0].cabecalhos as any).apikey, 'chave-de-servico-de-mentira');

  assert.match(r.cabecalhos['cache-control'] ?? '', /no-store/);
}

/* Banco vazio: resposta honesta, não erro. ----------------------------- */
{
  const r = await chamarFila('Bearer t', googlada('flacora@gmail.com'), []);
  assert.equal(r.status, 200);
  assert.equal(r.corpo.competencia, null);
  assert.deepEqual(r.corpo.itens, []);
}

/* Competência torta é recusada antes de virar consulta. ---------------- */
{
  const r = await chamarFila('Bearer t', googlada('flacora@gmail.com'), duasLinhas, {
    competencia: '2026-13',
  });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro, 'competencia_invalida');
}
{
  const r = await chamarFila('Bearer t', googlada('flacora@gmail.com'), duasLinhas, {
    competencia: "2026-07' or '1'='1",
  });
  assert.equal(r.status, 400, 'texto arbitrário não pode entrar na consulta');
}

/* Método errado. ------------------------------------------------------- */
assert.equal(
  (await chamarFila('Bearer t', googlada('flacora@gmail.com'), duasLinhas, { metodo: 'POST' })).status,
  405,
);

/* SEM A CHAVE DE SERVIÇO, FALHA ALTO — nunca cai para a chave pública.
   Com a pública a tabela lê ZERO (a RLS está ligada sem política, de
   propósito), e a fila apareceria VAZIA em vez de quebrada. "Não tem
   relatório nenhum" é uma resposta plausível: ninguém iria procurar
   defeito, e o mês passaria em branco. */
{
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await chamarFila('Bearer t', googlada('flacora@gmail.com'), duasLinhas);
  assert.equal(r.status, 500);
  assert.equal(r.corpo.erro, 'sem_chave_de_servico');
  assert.equal(chamadasAoBanco.length, 0);
  process.env.SUPABASE_SERVICE_ROLE_KEY = chave;
}

globalThis.fetch = fetchOriginal;

/* ================================================================== */
/* 5. A TABELA DESENHADA                                               */
/*                                                                     */
/* O que decide se esta fase presta é a leitura de cada linha, e isso  */
/* não aparece em teste de função que soma. Como a apresentação está   */
/* separada da busca, dá para desenhar a tabela aqui e conferir o que  */
/* saiu — sem navegador e sem uma conta Google, que quem escreve o     */
/* código não tem e não deve ter.                                      */
/* ================================================================== */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilaApresentada } from '../src/painel/Fila.tsx';

function desenhar(dados: any): string {
  return renderToStaticMarkup(createElement(FilaApresentada, { dados }));
}

/* A tabela com conteúdo. ---------------------------------------------- */
{
  const itens = montarFila([
    linha({
      slug: 'atrasado',
      nome: 'Cliente Com Problema',
      faixas: [faixa({ plataforma: 'meta', investimento: null, resultado: 4 })],
      montagem: [{ titulo: 'Criativos', indisponivel: { motivo: 'sem miniatura' } }],
    }),
    linha({
      slug: 'tranquilo',
      nome: 'Cliente Tranquilo',
      faixas: [faixa({ plataforma: 'meta', investimento: 2500.5, resultado: 30 })],
      fontes: [{ plataforma: 'meta', rotulo: 'Meta Ads', situacao: 'ok' }],
    }),
  ]);
  const html = desenhar({ competencia: '2026-07', competencias: ['2026-07', '2026-06'], itens });

  // Tabela de VERDADE, com cabeçalho associado — não `div` fingindo de tabela.
  assert.ok(html.includes('<table'), 'a fila precisa ser uma tabela de verdade');
  assert.ok(html.includes('scope="col"') && html.includes('scope="row"'), 'faltou associar cabeçalho');
  assert.ok(html.includes('<caption'), 'a tabela precisa de legenda para leitor de tela');

  // O mês por extenso, em português.
  assert.ok(html.includes('julho de 2026'), 'a competência precisa aparecer por extenso');

  // ESTADO COM FORMA E TEXTO, nunca só cor.
  assert.ok(html.includes('dcp-estado__forma'), 'faltou a forma do estado');
  assert.ok(html.includes('aguardando revisão'), 'faltou o texto do estado');

  // Etiqueta CONTÁVEL, não um "⚠" sem legenda.
  assert.ok(html.includes('1 seção indisponível'), 'a etiqueta precisa dizer QUANTAS');

  // Ausência escrita como traço, e não como R$ 0,00 — que seria uma frase
  // sobre o negócio do cliente, dita por engano.
  assert.ok(html.includes('—'), 'investimento ausente precisa virar traço');
  assert.ok(!/R\$\s*0,00/.test(html), 'ausência virou zero na tela');

  // O dinheiro em pt-BR. O `Intl` separa com espaço não-quebrável (U+00A0),
  // então a comparação normaliza o espaço antes de olhar.
  assert.ok(
    normalizarEspacos(html).includes('R$ 2.500,50'),
    'moeda fora do padrão pt-BR',
  );

  // O seletor de mês só aparece quando há mais de um mês.
  assert.ok(html.includes('<select'), 'com dois meses no banco, faltou o seletor');

  // A ordem no HTML é a ordem da fila: quem tem sinal vem primeiro.
  assert.ok(
    html.indexOf('Cliente Com Problema') < html.indexOf('Cliente Tranquilo'),
    'a ordem da tela não é a ordem da fila',
  );

  // O resumo conta o que interessa antes de a pessoa ler linha por linha.
  assert.ok(html.includes('2 relatórios'), 'faltou o resumo com a contagem');
  assert.ok(html.includes('em ordem de atenção'), 'a fila precisa avisar que não é alfabética');

  // Só leitura: nenhum verbo de decisão nesta tela.
  for (const proibido of ['Aprovar', 'Recusar', 'Enviar']) {
    assert.ok(!html.includes(`>${proibido}<`), `a fila não pode ter botão "${proibido}" — isso é a P3/P5`);
  }
}

/* Um mês só: sem seletor, que seria um controle com uma opção. -------- */
{
  const html = desenhar({ competencia: '2026-07', competencias: ['2026-07'], itens: [] });
  assert.ok(!html.includes('<select'), 'com um mês só, o seletor é ruído');
}

/* MÊS VAZIO EXPLICA, EM VEZ DE MOSTRAR TABELA VAZIA. ------------------
   Quem vê uma tabela sem linhas procura defeito onde não há. */
{
  const html = desenhar({ competencia: '2026-07', competencias: ['2026-07'], itens: [] });
  assert.ok(!html.includes('<table'), 'mês vazio não pode mostrar tabela vazia');
  assert.ok(html.includes('Nenhum relatório gerado em julho de 2026'));
}

/* Banco inteiro vazio: outra explicação, porque é outro problema. ----- */
{
  const html = desenhar({ competencia: null, competencias: [], itens: [] });
  assert.ok(html.includes('Ainda não há nenhum relatório no banco'));
  assert.ok(!html.includes('<table'));
}

/* A conversão fracionada do Google. -----------------------------------
   O Google divide o crédito de uma conversão entre anúncios, e a conta
   do mês fecha quebrada. `16,00` vira `16` porque as casas não existem;
   `60,09` continua `60,09` porque existem. Nenhum número é arredondado
   para caber. */
{
  function comResultado(valor: number, unidade: string) {
    const l = linha({ slug: 'x', nome: 'X', faixas: [] });
    (l.conteudo as any).dados.faixas = {
      f: {
        id: 'f',
        escopo: { tipo: 'plataforma' },
        metricas: [
          {
            id: 'google_investimento',
            rotulo: 'Investimento',
            unidade: 'brl',
            glossarioId: 'investimento',
            origem: { fontes: ['google'] },
            valor: { estado: 'ok', numero: 10 },
          },
          {
            id: 'google_resultado',
            rotulo: 'Leads',
            unidade,
            glossarioId: 'conversoes',
            origem: { fontes: ['google'] },
            valor: { estado: 'ok', numero: valor },
          },
        ],
      },
    };
    return desenhar({ competencia: '2026-07', competencias: ['2026-07'], itens: montarFila([l]) });
  }

  assert.ok(comResultado(16, 'decimal').includes('16 leads'), 'zeros que não informam continuaram na tela');
  assert.ok(!comResultado(16, 'decimal').includes('16,00 leads'));

  const fracionado = comResultado(60.089809, 'decimal');
  assert.ok(fracionado.includes('60,09 leads'), 'a casa decimal que existe sumiu');
  assert.ok(
    fracionado.includes('divide o crédito da conversão'),
    'número quebrado precisa dizer por que é quebrado',
  );
}

/* RESULTADO NÃO SOMA ENTRE PLATAFORMAS, E DIZ DE ONDE VEM. -------------
   A mesma venda pode ser atribuída pelo Meta e pelo Google ao mesmo
   tempo; um total afirmaria um número que ninguém apurou. E `22 leads ·
   16 leads`, sem dizer de onde, não serve para triagem nenhuma. */
{
  const html = desenhar({
    competencia: '2026-07',
    competencias: ['2026-07'],
    itens: montarFila([
      linha({
        slug: 'duas',
        nome: 'Duas Plataformas',
        faixas: [
          faixa({ plataforma: 'meta', investimento: 100, resultado: 22 }),
          faixa({ plataforma: 'google', investimento: 50, resultado: 16 }),
        ],
      }),
    ]),
  });
  assert.ok(html.includes('Meta 22 · Google 16 leads'), 'o resultado precisa dizer de qual plataforma');
  assert.ok(!html.includes('38 leads'), 'somou resultado de duas plataformas');
  // O investimento, esse sim, soma: dinheiro gasto não se sobrepõe.
  assert.ok(normalizarEspacos(html).includes('R$ 150,00'));
}

console.log(
  'OK — fila do painel: números, sinais, ordem, o endpoint nos caminhos de recusa, e a tabela desenhada',
);
