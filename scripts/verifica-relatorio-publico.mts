import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/relatorio-publico.ts';
import { criarAssinadorStoragePrivado } from '../api/_storage-privado.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const TOKEN = 'A'.repeat(43);
const checksum = 'checksum-aprovado';
const linha: any = {
  id: '11111111-1111-4111-8111-111111111111',
  cliente_slug: 'cliente_exemplo',
  competencia: '2026-07',
  versao: 1,
  estado: 'liberado',
  gerado_em: '2026-08-01T10:00:00Z',
  checksum,
  checksum_factual_editorial: 'checksum-factual-final',
  aprovado_por: 'Flávio Corá',
  aprovado_em: '2026-08-09T10:00:00Z',
  aprovado_checksum: checksum,
  enviado_em: null,
  enviado_para: null,
  substituido_por: null,
  revogado_em: null,
  conteudo: structuredClone(karyneMontada202607),
};
linha.conteudo.identidade.clienteSlug = linha.cliente_slug;
linha.conteudo.identidade.competencia = linha.competencia;
linha.conteudo.dados.audios = {};

const fechamento = {
  relatorio_id: linha.id,
  cliente_slug: linha.cliente_slug,
  competencia: linha.competencia,
  relatorio_versao: linha.versao,
  checksum_documento: linha.checksum,
  checksum_factual: linha.checksum_factual_editorial,
  aprovado_checksum: linha.aprovado_checksum,
};

const fetchOriginal = globalThis.fetch;
const envOriginal = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.SUPABASE_URL = 'https://projeto.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';

function resposta() {
  let status = 200;
  const headers = new Map<string, string>();
  let body: any;
  return {
    setHeader(nome: string, valor: string) { headers.set(nome.toLowerCase(), valor); },
    status(valor: number) { status = valor; return this; },
    json(valor: any) { body = valor; return this; },
    ler() { return { status, headers, body }; },
  } as any;
}

async function chamar(token: string, linhas: any[], fechamentos: any[], metodo = 'GET', sufixo = '', observacoes: any[] = [], analises: any[] = []) {
  const urlsConsultadas: string[] = [];
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    urlsConsultadas.push(url);
    /* Cada leitura tem o próprio corpo. Um fake que devolvesse `linhas` para
       tudo faria a rota receber relatório onde espera análise — foi o que
       aconteceu quando a leitura das análises aprovadas entrou, em 04/09. */
    /* ⚠️ A primeira consulta é a do TOKEN e pede só o dono do link (cliente e
       competência). A segunda é a que traz a versão corrente inteira. Devolver
       `linhas` para as duas escondia a diferença — e é justamente a diferença
       que esta rota passou a ter em 08/09. */
    const corpo = url.includes('/relatorio_fechamentos_editoriais?') ? fechamentos
      : url.includes('/relatorio_observacoes_publicas_liberadas?') ? observacoes
      : url.includes('/relatorio_analises_publicadas?') ? analises
      : url.includes('select=cliente_slug,competencia')
        ? linhas.slice(0, 1).map((item: any) => ({ cliente_slug: item.cliente_slug, competencia: item.competencia }))
        : linhas;
    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  const res = resposta();
  await handler({
    method: metodo,
    url: `/api/relatorio-publico?token=${encodeURIComponent(token)}${sufixo}`,
  } as any, res);
  return { ...res.ler(), urlsConsultadas };
}

try {
  {
    let endpoint = '';
    const assinar = criarAssinadorStoragePrivado({
      bucket: 'relatorios-audios',
      urlSupabase: 'https://projeto.supabase.co',
      chaveDeServico: 'segredo-de-teste',
      validadeSegundos: 3600,
      fetchImpl: (async (entrada: any, init?: RequestInit) => {
        endpoint = String(entrada);
        const pedido = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(pedido.paths.map((path: string) => ({
          path,
          error: null,
          signedURL: `/object/sign/relatorios-audios/${path}?token=teste`,
        }))), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    });
    const [assinatura] = await assinar(['cliente/2026-07/v1/audio.ogg']);
    assert.equal(endpoint, 'https://projeto.supabase.co/storage/v1/object/sign/relatorios-audios');
    assert.equal(assinatura.signedUrl, 'https://projeto.supabase.co/storage/v1/object/sign/relatorios-audios/cliente/2026-07/v1/audio.ogg?token=teste');
  }

  const ok = await chamar(TOKEN, [linha], [fechamento]);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.relatorio.snapshot.publicacao.checksum, checksum);
  assert.equal(ok.body.relatorio.id, undefined, 'UUID interno não precisa sair na rota externa');
  assert.equal(ok.body.relatorio.sinais, undefined, 'sinais da bancada não pertencem ao cliente');
  assert.ok(ok.urlsConsultadas[0].includes(`token=eq.${TOKEN}`), 'a primeira consulta é a do token');
  assert.ok(ok.urlsConsultadas[0].includes('select=cliente_slug,competencia'), 'a consulta do token só precisa saber de quem é o link');
  /* ⚠️ A versão servida é procurada por CLIENTE + COMPETÊNCIA, e o desempate é
     pela maior versão. Sem isso, o link entregue continuaria preso à versão em
     que nasceu, e duas liberadas conviveriam com dois links vivos. */
  assert.ok(ok.urlsConsultadas[1].includes(`cliente_slug=eq.${linha.cliente_slug}`));
  assert.ok(ok.urlsConsultadas[1].includes(`competencia=eq.${linha.competencia}`));
  assert.ok(ok.urlsConsultadas[1].includes('order=versao.desc'));
  assert.ok(ok.urlsConsultadas[1].includes('estado=eq.liberado'));
  assert.ok(!ok.urlsConsultadas[1].includes('token=eq.'), 'a versão corrente não é procurada pelo token');
  assert.ok(ok.urlsConsultadas[2].includes('/relatorio_fechamentos_editoriais?'));
  assert.ok(ok.urlsConsultadas[2].includes(`relatorio_id=eq.${linha.id}`), 'o recibo conferido é o da versão SERVIDA');
  assert.ok(ok.urlsConsultadas.some((url) => url.includes('/relatorio_observacoes_publicas_liberadas?')));
  assert.ok(!JSON.stringify(ok.body).includes(TOKEN), 'a credencial nunca pode voltar no JSON');
  assert.ok(!JSON.stringify(ok.body).includes('historico'), 'histórico interno não pode entrar na rota pública');
  assert.equal(ok.headers.get('cache-control')?.includes('no-store'), true);
  assert.equal(ok.headers.get('referrer-policy'), 'no-referrer');

  for (const mutacao of [
    { estado: 'gerado' },
    { revogado_em: '2026-08-09T11:00:00Z' },
    { substituido_por: '22222222-2222-4222-8222-222222222222' },
    { aprovado_checksum: 'outro-checksum' },
    { aprovado_por: null },
  ]) {
    const recusado = await chamar(TOKEN, [{ ...linha, ...mutacao }], [fechamento]);
    assert.equal(recusado.status, 404, `precisava recusar ${JSON.stringify(mutacao)}`);
  }

  for (const mutacao of [
    { checksum_documento: 'checksum-de-outro-documento' },
    { checksum_factual: 'checksum-factual-antigo' },
    { aprovado_checksum: 'checksum-de-outra-aprovacao' },
    { relatorio_versao: 2 },
    { cliente_slug: 'outro-cliente' },
  ]) {
    const recusado = await chamar(TOKEN, [linha], [{ ...fechamento, ...mutacao }]);
    assert.equal(recusado.status, 404, `precisava recusar recibo divergente ${JSON.stringify(mutacao)}`);
  }

  /* ------------------------------------------------------------------ */
  /* O link entregue abre a versão corrente — decisão do PO em 08/09/2026 */
  /* ------------------------------------------------------------------ */

  {
    /**
     * O caso real: o token está numa versão que já foi superada, e o link no
     * grupo do cliente precisa abrir o documento certo — sem trocar o link.
     */
    const v4: any = {
      ...structuredClone(linha),
      id: '44444444-4444-4444-8444-444444444444',
      versao: 4,
      checksum: 'checksum-da-v4',
      aprovado_checksum: 'checksum-da-v4',
    };
    v4.conteudo.publicacao.checksum = 'checksum-da-v4';
    const fechamentoV4 = {
      ...fechamento,
      relatorio_id: v4.id,
      relatorio_versao: 4,
      checksum_documento: v4.checksum,
      aprovado_checksum: v4.aprovado_checksum,
    };
    /* O fake devolve a lista na ordem que o PostgREST devolveria com
       `order=versao.desc`: a corrente primeiro. */
    const corrente = await chamar(TOKEN, [v4], [fechamentoV4]);
    assert.equal(corrente.status, 200, 'o link antigo precisa abrir a versão corrente');
    assert.equal(corrente.body.relatorio.versao, 4);
    assert.equal(corrente.body.relatorio.snapshot.publicacao.checksum, 'checksum-da-v4');
  }

  {
    /**
     * ⚠️ PROVA NEGATIVA: o link de um cliente nunca pode abrir o relatório de
     * outro. O cliente e a competência saem da linha DO PRÓPRIO TOKEN, e a
     * conferência final recusa mesmo que alguém afrouxe o filtro um dia.
     */
    const deOutro = { ...linha, cliente_slug: 'outra_empresa' };
    const vazado = await chamar(TOKEN, [deOutro], [{ ...fechamento, cliente_slug: 'outra_empresa' }]);
    /* A linha do token diria "outra_empresa" e a servida também, então o caso
       que interessa é o inverso: token de um dono, versão de outro. */
    /**
     * ⚠️ O RECIBO PRECISA SER COERENTE COM A LINHA DE OUTRO CLIENTE, senão
     * quem recusa é a conferência do fechamento e esta prova não testa nada.
     * A primeira versão deste teste passava verde com a conferência de dono
     * REMOVIDA — a mutação mostrou, e o cenário foi refeito.
     */
    const fechamentoDoOutro = { ...fechamento, cliente_slug: 'outra_empresa' };
    globalThis.fetch = (async (entrada: any) => {
      const url = String(entrada);
      const corpo = url.includes('select=cliente_slug,competencia')
        ? [{ cliente_slug: 'cliente_exemplo', competencia: '2026-07' }]
        : url.includes('/relatorio_fechamentos_editoriais?') ? [fechamentoDoOutro]
        : url.includes('/relatorio_observacoes_publicas_liberadas?') ? []
        : url.includes('/relatorio_analises_publicadas?') ? []
        : [deOutro];
      return new Response(JSON.stringify(corpo), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const res = resposta();
    await handler({ method: 'GET', url: `/api/relatorio-publico?token=${TOKEN}` } as any, res);
    assert.equal(res.ler().status, 404, 'versão de outro cliente nunca pode ser servida por este token');
    assert.equal(vazado.status, 200, 'o cenário de controle precisa mesmo passar, senão a prova acima é vazia');
  }

  const invalido = await chamar('curto', [linha], [fechamento]);
  assert.equal(invalido.status, 404);
  assert.equal(invalido.urlsConsultadas.length, 0, 'token inválido não pode consultar o banco');

  const semDono = await chamar(TOKEN, [], [fechamento]);
  assert.equal(semDono.status, 404, 'token que não existe em linha nenhuma falha fechado');

  const duplicado = await chamar(TOKEN, [linha], [fechamento], 'GET', `&token=${TOKEN}`);
  assert.equal(duplicado.status, 404, 'dois tokens na URL precisam falhar fechado');
  assert.equal(duplicado.urlsConsultadas.length, 0, 'token ambiguo nao pode consultar o banco');

  const metodo = await chamar(TOKEN, [linha], [fechamento], 'POST');
  assert.equal(metodo.status, 405);

  const pagina = readFileSync(new URL('../src/pages/RelatorioPublico.tsx', import.meta.url), 'utf8');
  assert.ok(pagina.includes('<RelatorioMontado'));
  assert.ok(!pagina.includes('<RevisaoMoldura'));
  assert.ok(!pagina.includes('Aprovar relatório'));
  assert.ok(!pagina.includes('Recusar com motivo'));

  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  assert.match(css, /\.dcp-historico-secao\s*\{\s*display: none !important;/);

  console.log('verifica-relatorio-publico: OK');
} finally {
  globalThis.fetch = fetchOriginal;
  if (envOriginal.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = envOriginal.url;
  if (envOriginal.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = envOriginal.key;
}
