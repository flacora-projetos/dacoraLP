import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-historico-analises.ts';
import { HistoricoAnalises, type HistoricoEditorialInterno } from '../src/painel/HistoricoAnalises.tsx';
import { AnalisesSecaoProvider, HistoricoDaSecao } from '../src/painel/AnalisesSecao.tsx';

const ID = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'revisor@example.com';
const CLIENTE = 'cliente_exemplo';
const COMPETENCIA = '2026-08';
const VERSAO = 4;
const FACTUAL_A = 'a'.repeat(32);
const FACTUAL_B = 'b'.repeat(32);
const fetchOriginal = globalThis.fetch;
const envOriginal = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anon: process.env.SUPABASE_ANON_KEY,
  emails: process.env.PAINEL_EMAILS_AUTORIZADOS,
};
process.env.SUPABASE_URL = 'https://projeto.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = EMAIL;

function resposta() {
  let status = 200;
  let body: any;
  return {
    setHeader() {},
    status(valor: number) { status = valor; return this; },
    json(valor: any) { body = valor; return this; },
    ler() { return { status, body }; },
  } as any;
}

const revisoes = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    secao: 'introducao',
    checksum_factual: FACTUAL_B,
    tipo_decisao: 'analise',
    texto: 'Leitura atual para o snapshot B.',
    estado: 'atual',
    revisada_por: EMAIL,
    revisada_em: '2026-08-18T13:00:00-03:00',
    coletado_em_referencia: '2026-08-18T07:12:00-03:00',
    invalidada_em: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    secao: 'introducao',
    checksum_factual: FACTUAL_A,
    tipo_decisao: 'analise',
    texto: 'Leitura histórica para o snapshot A.',
    estado: 'historica',
    revisada_por: 'outra-pessoa@example.com',
    revisada_em: '2026-08-17T14:00:00-03:00',
    coletado_em_referencia: '2026-08-17T07:05:00-03:00',
    invalidada_em: '2026-08-18T07:13:00-03:00',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    secao: 'bloco:meta',
    checksum_factual: FACTUAL_A,
    tipo_decisao: 'sem_analise',
    texto: null,
    estado: 'historica',
    revisada_por: EMAIL,
    revisada_em: '2026-08-17T13:30:00-03:00',
    coletado_em_referencia: null,
    invalidada_em: null,
  },
];

async function chamar({ fallbackSemColuna = false, email = EMAIL } = {}) {
  const chamadas: string[] = [];
  let tentouCampoAV3 = false;
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    chamadas.push(url);
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'usuario', email, app_metadata: { provider: 'google' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/rest/v1/relatorios?')) {
      return new Response(JSON.stringify([{ cliente_slug: CLIENTE, competencia: COMPETENCIA, versao: VERSAO }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/rest/v1/relatorio_revisoes_editoriais?')) {
      if (url.includes('coletado_em_referencia')) {
        tentouCampoAV3 = true;
        if (fallbackSemColuna) return new Response(JSON.stringify({ message: 'column does not exist' }), { status: 400 });
      }
      const linhas = fallbackSemColuna
        ? revisoes.map(({ coletado_em_referencia: _omitida, ...resto }) => resto)
        : revisoes;
      return new Response(JSON.stringify(linhas), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`URL não dublada: ${url}`);
  }) as typeof fetch;

  const res = resposta();
  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer token-de-teste' },
    query: { id: ID },
  } as any, res);
  return { ...res.ler(), chamadas, tentouCampoAV3 };
}

try {
  // Isolamento e ordem são decididos no servidor a partir do relatório aberto.
  {
    const saida = await chamar();
    assert.equal(saida.status, 200);
    assert.equal(saida.body.historico.total, 3);
    assert.equal(saida.body.historico.revisoes[0].texto, revisoes[0].texto);
    assert.equal(saida.body.historico.revisoes[0].revisadaPor, EMAIL);
    assert.equal(saida.body.historico.revisoes[0].coletadoEmReferencia, revisoes[0].coletado_em_referencia);
    const consulta = saida.chamadas.find((url) => url.includes('/relatorio_revisoes_editoriais?'))!;
    assert.match(consulta, new RegExp(`cliente_slug=eq\\.${CLIENTE}`));
    assert.match(consulta, new RegExp(`competencia=eq\\.${COMPETENCIA}`));
    assert.match(consulta, new RegExp(`relatorio_versao=eq\\.${VERSAO}`));
    assert.match(consulta, /order=revisada_em\.desc,id\.desc/);
    assert.doesNotMatch(consulta, /relatorio_id=/, 'histórico usa a identidade lógica, não a linha física');
  }

  // Antes da migration remota, ausência da coluna permanece ausência; não vira
  // horário da revisão nem data atual.
  {
    const saida = await chamar({ fallbackSemColuna: true });
    assert.equal(saida.status, 200);
    assert.equal(saida.tentouCampoAV3, true);
    assert.equal(saida.body.historico.revisoes[0].coletadoEmReferencia, null);
    assert.notEqual(saida.body.historico.revisoes[0].revisadaEm, null);
  }

  // Allow-list é aplicada antes da leitura das revisões.
  {
    const saida = await chamar({ email: 'nao-autorizado@example.com' });
    assert.equal(saida.status, 403);
    assert.equal(saida.chamadas.some((url) => url.includes('/relatorio_revisoes_editoriais?')), false);
  }

  // UI: recolhida por padrão, auditável, agrupada por seção e sem inventar
  // coleta para a linha legada.
  {
    const historico: HistoricoEditorialInterno = {
      disponivel: true,
      total: 3,
      revisoes: revisoes.map((linha) => ({
        chave: linha.id,
        secao: linha.secao,
        checksumFactual: linha.checksum_factual,
        tipoDecisao: linha.tipo_decisao as 'analise' | 'sem_analise',
        texto: linha.texto,
        estado: linha.estado as 'atual' | 'historica',
        revisadaPor: linha.revisada_por,
        revisadaEm: linha.revisada_em,
        coletadoEmReferencia: linha.coletado_em_referencia,
        invalidadaEm: linha.invalidada_em,
      })),
    };
    const html = renderToStaticMarkup(createElement(HistoricoAnalises, {
      historico,
      secoes: [{ secao: 'introducao', titulo: 'Introdução' }, { secao: 'bloco:meta', titulo: 'Meta Ads' }],
    }));
    assert.match(html, /<details class="dcp-historico-analises">/);
    assert.doesNotMatch(html, /<details[^>]* open/, 'o histórico nasce recolhido');
    assert.match(html, /Somente interno/);
    assert.match(html, /Introdução/);
    assert.match(html, /Meta Ads/);
    assert.ok(html.indexOf('Leitura atual para o snapshot B.') < html.indexOf('Leitura histórica para o snapshot A.'), 'a ordem recebida do banco é preservada');
    assert.match(html, /revisor@example\.com/);
    assert.match(html, /dados coletados em[\s\S]*18\/08\/2026 às 07h12/i);
    assert.match(html, /Coleta de referência indisponível nesta versão legada/);
    assert.match(html, /Revisada sem análise/);
  }

  // Superfícies externas não importam nem consultam a timeline AV3.
  for (const caminho of ['../api/relatorio-publico.ts', '../api/painel-envio.ts']) {
    const fonte = readFileSync(new URL(caminho, import.meta.url), 'utf8');
    assert.doesNotMatch(fonte, /painel-historico-analises|coletado_em_referencia|relatorio_revisoes_editoriais/i, `${caminho} não pode carregar histórico`);
  }

  // A prontidão continua usando só estados vigentes e portanto versões
  // históricas não destravam nem travam aprovação.
  const prontidao = readFileSync(new URL('../api/_painel-estado-editorial.ts', import.meta.url), 'utf8');
  assert.match(prontidao, /ESTADOS_VIGENTES_AV = "\('atual','revisao_necessaria','final'\)"/);
  assert.doesNotMatch(prontidao, /ESTADOS_VIGENTES_AV[^\n]*historica/);

  /* ------------------------------------------------------------------
   * AV3 (2026-08-20) — o histórico também vive AO LADO da seção.
   *
   * Na faixa de revisão ele já existia, mas abaixo de 1200px a faixa vira
   * gaveta de rodapé e o bloco nasce recolhido lá dentro: o PO não o
   * encontrou duas vezes seguidas. O contador por seção põe a linha do
   * tempo onde a análise é escrita.
   * ---------------------------------------------------------------- */
  {
    const historicoUI: HistoricoEditorialInterno = {
      disponivel: true,
      total: revisoes.length,
      revisoes: revisoes.map((linha) => ({
        chave: linha.id,
        secao: linha.secao,
        checksumFactual: linha.checksum_factual,
        tipoDecisao: linha.tipo_decisao as 'analise' | 'sem_analise',
        texto: linha.texto,
        estado: linha.estado as 'atual' | 'historica',
        revisadaPor: linha.revisada_por,
        revisadaEm: linha.revisada_em,
        coletadoEmReferencia: linha.coletado_em_referencia,
        invalidadaEm: linha.invalidada_em,
      })),
    };
    const comHistorico = renderToStaticMarkup(createElement(
      AnalisesSecaoProvider,
      { podeRevisar: true, espacos: [], historico: historicoUI, aoAcionar: (async () => ({})) as any },
      createElement(HistoricoDaSecao, { secao: 'introducao', titulo: 'Introdução' }),
    ));
    assert.match(comHistorico, /versões no histórico/, 'a seção precisa anunciar quantas versões guarda');
    assert.match(comHistorico, /Somente interno/, 'o bloco inline precisa repetir que nada disso vai ao cliente');
    assert.match(comHistorico, /Leitura histórica para o snapshot A\./, 'o texto preservado precisa estar acessível na própria seção');

    // Seção sem versão preservada não declara ausência de passado: some.
    const semHistorico = renderToStaticMarkup(createElement(
      AnalisesSecaoProvider,
      { podeRevisar: true, espacos: [], historico: historicoUI, aoAcionar: (async () => ({})) as any },
      createElement(HistoricoDaSecao, { secao: 'bloco:secao-que-nunca-teve-analise', titulo: 'Outra' }),
    ));
    assert.doesNotMatch(semHistorico, /no histórico/, 'seção nova não pode ganhar um bloco vazio');
  }

  /* ⚠️ Contrato AV, item (4): o histórico nunca aparece em rota pública, PDF,
     mensagem de envio ou versão final. `.dcp-historico-secao` e
     `.dcp-analise-dispensa` nascem FORA de `.dcp-analise-secao__controles`
     quando a seção é a introdução — sem estarem na regra de impressão, o
     texto integral das análises internas entraria no PDF do cliente. */
  {
    const reportCss = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
    /* Ler a LISTA DE SELETORES, nunca o trecho inteiro: o comentário acima da
       regra cita os mesmos nomes, e uma busca por substring passaria verde com
       a regra vazia — foi o que aconteceu na primeira versão desta trava. */
    const marca = reportCss.indexOf('não pertence ao PDF do cliente');
    assert.ok(marca > 0, 'a regra de impressão da revisão precisa existir');
    const fimDoComentario = reportCss.indexOf('*/', marca) + 2;
    const abreChave = reportCss.indexOf('{', fimDoComentario);
    const seletores = reportCss.slice(fimDoComentario, abreChave);
    const corpo = reportCss.slice(abreChave, reportCss.indexOf('}', abreChave));
    for (const seletor of ['.dcp-historico-secao', '.dcp-analise-dispensa', '.dcp-revisao__faixa']) {
      assert.ok(seletores.includes(seletor), `${seletor} precisa sumir na impressão`);
    }
    assert.match(corpo, /display:\s*none\s*!important/);
  }

  /* Contraste: a linha de "revisada sem análise" cai no cartão verde-escuro
     quando a seção é a introdução. Cinza de fundo claro fixo some ali — foi
     o defeito relatado no relatório real do Hannover Fondue. */
  {
    const painelCss = readFileSync(new URL('../src/painel/painel.css', import.meta.url), 'utf8');
    const regra = painelCss.slice(painelCss.indexOf('.dcp-analise-dispensa {'));
    const corpo = regra.slice(0, regra.indexOf('}'));
    assert.doesNotMatch(corpo, /color:\s*var\(--dc-cinza\)/, 'não fixar cinza de fundo claro: a introdução tem fundo escuro');
    assert.match(corpo, /color:\s*inherit/, 'a linha precisa herdar a tinta de onde foi renderizada');
  }

  console.log('verifica-painel-av3-historico: ok');
} finally {
  globalThis.fetch = fetchOriginal;
  if (envOriginal.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = envOriginal.url;
  if (envOriginal.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = envOriginal.key;
  if (envOriginal.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = envOriginal.anon;
  if (envOriginal.emails === undefined) delete process.env.PAINEL_EMAILS_AUTORIZADOS; else process.env.PAINEL_EMAILS_AUTORIZADOS = envOriginal.emails;
}
