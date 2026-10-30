/**
 * Recusa de consulta, do Data Hub ate a tela, pelo caminho real do portal:
 * o corpo abaixo e o que o Data Hub devolve em src/http-service.js.
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { executarRequisicaoDataHub } from '../api/_data-hub-spike.ts';

Object.assign(process.env, {
  DATA_HUB_GCP_PROJECT_NUMBER: '123456789',
  DATA_HUB_WIF_POOL: 'vercel-portal',
  DATA_HUB_WIF_PROVIDER: 'vercel-preview',
  DATA_HUB_SERVICE_ACCOUNT: 'portal@dacora-data-hub.iam.gserviceaccount.com',
  DATA_HUB_CLOUD_RUN_AUDIENCE: 'https://dacora-data-hub.example.run.app',
  DATA_HUB_SPIKE_ENDPOINT: 'https://dacora-data-hub.example.run.app/internal/v1/portal/pwi0',
});

async function passarPeloPortal(status: number, corpo: unknown) {
  const resposta = await executarRequisicaoDataHub(
    { endpoint: 'https://dacora-data-hub.example.run.app/internal/v1/portal/query-v2', method: 'POST', body: {} },
    { id: '9d97d3f1-25cb-4bfd-91e8-37d336cfa74b', email: 'contato@nandacora.com.br' },
    {
      obterOidcVercel: async () => 'oidc',
      trocarPorAccessToken: async () => 'access',
      requestId: () => 'request-id-123456',
      fetch: (async (input: unknown) => String(input).includes('iamcredentials')
        ? new Response(JSON.stringify({ token: 'id' }), { status: 200 })
        : new Response(JSON.stringify(corpo), { status })) as typeof fetch,
    },
  );
  return resposta;
}

const recusa = await passarPeloPortal(400, {
  error: 'META_QUERY_V2_FIELD_NOT_PROMOTED',
  message: 'Campo V2 sem evidência executável para a conta: spend',
  details: { fields: ['spend'], outro: 'nao passa' },
});
assert.equal(recusa.status, 400);
assert.equal((recusa.corpo as any).erro, 'META_QUERY_V2_FIELD_NOT_PROMOTED');
assert.equal((recusa.corpo as any).mensagem, 'Campo V2 sem evidência executável para a conta: spend');
assert.deepEqual((recusa.corpo as any).details, { fields: ['spend'] });

// Fora da recusa sobre a consulta, nada do que veio do Data Hub atravessa.
for (const [status, corpo] of [
  [400, { error: 'invalid_request' }],
  [400, { error: 'OUTRO_CODIGO', message: 'detalhe interno', details: { fields: ['x'] } }],
  [502, { error: 'META_QUERY_V2_FIELD_NOT_PROMOTED', message: 'detalhe interno', details: { fields: ['x'] } }],
] as const) {
  const generica = await passarPeloPortal(status, corpo);
  assert.doesNotMatch(JSON.stringify(generica.corpo), /detalhe interno|fields/);
}

const dom = new JSDOM('<!doctype html><div id="raiz"></div>', { url: 'https://www.dacora.com.br/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ConsultaQueryV2, erroDaConsulta } = await import('../src/pages/data-hub-query-v2.tsx');

async function aguardar(condicao: () => boolean, descricao: string) {
  const limite = Date.now() + 2_000;
  while (!condicao() && Date.now() < limite) await new Promise((r) => setTimeout(r, 5));
  assert.ok(condicao(), `tempo excedido aguardando ${descricao}`);
}
function preencher(el: any, valor: string) {
  const proto = el.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new dom.window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

const raiz = document.getElementById('raiz')!;
createRoot(raiz).render(createElement(ConsultaQueryV2, {
  catalogo: {
    contas: [{ id: 'act_1', nome: 'Conta', disponivel: true }],
    queryEngineV2: {
      fields: [{ id: 'spend', nome: 'Investimento' }, { id: 'ad_name', nome: 'Nome do anúncio' }, { id: 'insights.quality_ranking', nome: 'Qualidade' }],
      executableFieldKeys: ['spend', 'ad_name', 'insights.quality_ranking'],
      discoverableFieldKeys: [],
    },
  } as any,
  aoExecutar: async () => { throw erroDaConsulta(recusa.corpo); },
}));
await aguardar(() => !!raiz.querySelector('select'), 'a tela');
preencher(raiz.querySelector('select'), 'act_1');
const datas = raiz.querySelectorAll('input[type="date"]');
preencher(datas[0], '2026-10-01');
preencher(datas[1], '2026-10-07');
const botaoConsultar = () => [...raiz.querySelectorAll('button')].find((b) => /consult/i.test(b.textContent ?? '') && !/planilha/i.test(b.textContent ?? '')) as any;
await aguardar(() => botaoConsultar() && !botaoConsultar().disabled, 'o botão de consultar');
botaoConsultar().click();
await aguardar(() => !!raiz.querySelector('[role="alert"]'), 'o aviso de recusa');
const aviso = raiz.querySelector('[role="alert"]')!.textContent ?? '';
assert.match(aviso, /Investimento/);
assert.doesNotMatch(aviso, /Campo V2|executável|spend/);
const tirar = [...raiz.querySelectorAll('[role="alert"] button')].find((b) => /Tirar 1/.test(b.textContent ?? '')) as any;
assert.ok(tirar, 'falta a saida para tirar o campo');
tirar.click();
await aguardar(() => !raiz.querySelector('[role="alert"]'), 'o aviso sair');
assert.ok(![...raiz.querySelectorAll('.dch-query-v2__chip-nome')].some((n) => n.textContent === 'Investimento'), 'o campo recusado deveria sair');

console.log('OK — recusa do Data Hub chega à tela com os campos e a saída');
process.exit(0);
