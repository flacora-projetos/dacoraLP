/**
 * Regressão do refoco de aba — `npm run verifica:refoco`.
 *
 * O Supabase relê a sessão do armazenamento quando a janela volta ao foco.
 * Embora usuário e token sejam os mesmos, o objeto em memória é novo. A fila
 * não pode interpretar essa troca de identidade do objeto como troca de conta:
 * isso refaz a consulta, mostra o esqueleto e perde a posição da leitura.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.on('uncaughtException', (erro) => {
  console.error(erro);
  process.exit(1);
});
process.on('unhandledRejection', (erro) => {
  console.error(erro);
  process.exit(1);
});

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as typeof import('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', {
  url: 'https://exemplo.invalido/painel-de-relatorios',
  pretendToBeVisual: true,
});

for (const nome of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'CustomEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]) {
  Object.defineProperty(globalThis, nome, {
    value: (dom.window as any)[nome],
    configurable: true,
    writable: true,
  });
}

const chamadas: Array<{ url: string; token: string | null }> = [];
const RESPOSTA = {
  competencia: '2026-07',
  competencias: ['2026-07', '2026-06'],
  itens: [
    {
      id: 'um',
      clienteSlug: 'cliente-de-mentira',
      clienteNome: 'Cliente De Mentira',
      competencia: '2026-07',
      versao: 1,
      estado: 'gerado',
      geradoEm: '2026-08-01T10:00:00Z',
      aprovadoPor: null,
      aprovadoEm: null,
      enviadoEm: null,
      enviadoPara: null,
      investimento: 1234.5,
      investimentoPorPlataforma: [
        { rotulo: 'Investimento', fonte: 'Meta Ads', valor: 1234.5, unidade: 'brl' },
      ],
      resultados: [{ rotulo: 'Leads', fonte: 'Meta Ads', valor: 12, unidade: 'inteiro' }],
      sinais: [],
    },
  ],
};

globalThis.fetch = (async (entrada: any, opcoes: any) => {
  const url = String(entrada);
  const autorizacao = new Headers(opcoes?.headers ?? {}).get('authorization');
  chamadas.push({
    url,
    token: autorizacao ? autorizacao.replace(/^Bearer\s+/i, '') : null,
  });
  return new Response(JSON.stringify(RESPOSTA), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}) as typeof fetch;

function sessao(token = 'token-a', usuarioId = 'usuario-1') {
  return {
    access_token: token,
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: usuarioId,
      email: 'quem-revisa@exemplo.invalido',
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Quem Revisa' },
    },
  } as any;
}

const { createElement } = await import('react');
const { flushSync } = await import('react-dom');
const { createRoot } = await import('react-dom/client');
const { FilaComSessao } = await import('../src/painel/Fila.tsx');

const elemento = dom.window.document.getElementById('raiz')!;
const raiz = createRoot(elemento);

async function renderizar(proximaSessao: any) {
  flushSync(() => {
    raiz.render(createElement(FilaComSessao, { sessao: proximaSessao }));
  });
  for (let tentativa = 0; tentativa < 20 && !elemento.querySelector('table'); tentativa += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

await renderizar(sessao());
const tabelaInicial = elemento.querySelector('table');
assert.ok(tabelaInicial, 'a fila inicial não chegou a aparecer');
assert.equal(chamadas.length, 1, 'a fila inicial deveria ser buscada uma vez');
assert.equal(chamadas[0]?.token, 'token-a');

// Refoco: novo objeto, mesmos dados. A tabela e a consulta precisam sobreviver.
await renderizar(sessao());
assert.equal(elemento.querySelector('table'), tabelaInicial, 'o refoco remontou a tabela');
assert.equal(chamadas.length, 1, 'o refoco consultou a fila de novo');
assert.equal(elemento.querySelector('.dcp-fila__esqueleto'), null, 'o refoco mostrou o esqueleto');

// Refresh real do token também é silencioso; a próxima ação usa o token novo.
await renderizar(sessao('token-b'));
assert.equal(elemento.querySelector('table'), tabelaInicial, 'o refresh do token remontou a tabela');
assert.equal(chamadas.length, 1, 'o refresh do token consultou a fila de novo');

const seletor = elemento.querySelector('select') as HTMLSelectElement | null;
assert.ok(seletor, 'a troca manual de competência não ficou disponível no teste');
flushSync(() => {
  seletor.value = '2026-06';
  seletor.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
});
for (let tentativa = 0; tentativa < 20 && chamadas.length < 2; tentativa += 1) {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
assert.equal(chamadas.length, 2, 'trocar a competência deveria consultar a fila');
assert.equal(chamadas[1]?.token, 'token-b', 'a ação seguinte usou o token antigo');

// Uma pessoa diferente é mudança real e precisa provocar nova consulta.
await renderizar(sessao('token-c', 'usuario-2'));
assert.equal(chamadas.length, 3, 'trocar de usuário não consultou a fila novamente');
assert.equal(chamadas[2]?.token, 'token-c');

flushSync(() => {
  raiz.unmount();
});
dom.window.close();

console.log(
  'OK — refoco e refresh preservam a fila; troca de mês e de usuário usam a sessão atual',
);
