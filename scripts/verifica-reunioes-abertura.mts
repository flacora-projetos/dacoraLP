import assert from 'node:assert/strict';
import { createElement, useState } from 'react';
import { createRequire } from 'node:module';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import AreaReunioes from '../src/reunioes/AreaReunioes.tsx';
import type { IdentidadeReunioes } from '../src/reunioes/tipos';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as typeof import('jsdom');
const dom = new JSDOM('<div id="montagem"></div>', { url: 'https://exemplo.test/reunioes/teste-a' });
for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true });
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const raiz = createRoot(document.getElementById('montagem')!);
const originalFetch = globalThis.fetch;
const pessoa: IdentidadeReunioes = { id: 'equipe', nome: 'Pessoa de teste', email: 'equipe@example.test', equipe: true };
let atual = { ...pessoa };
let trocarPessoa: (pessoa: IdentidadeReunioes) => void;
let trocarToken: (token: string) => void;
let consultas = 0;
let pedidosTranscricao = 0;
const internas = { secoes: [{ id: 'resumo', titulo: 'Resumo interno', texto: 'CONTEUDO_PRIVADO_TESTE' }], duvidas: [] };
const compartilhado = { secoes: [], duvidas: [] };
globalThis.fetch = (async (entrada, init) => {
  assert.equal(init?.method, 'GET', 'O smoke de abertura não pode gravar dados.');
  const url = new URL(String(entrada), 'https://exemplo.test');
  if (url.searchParams.get('acao') === 'transcricao') {
    assert.ok(atual.equipe, 'Convidado não pode pedir transcrição.');
    pedidosTranscricao++;
    return Response.json({ transcricao: { texto: 'Trecho sobre orçamento\nTrecho sobre prazo', fonte_url: 'https://docs.google.com/document/d/teste/edit', lida_em: '2026-10-30T12:00:00Z' } });
  }
  assert.equal(url.searchParams.get('acao'), 'abrir');
  consultas++;
  const slug = url.searchParams.get('slug');
  return Response.json({
    reuniao: {
      id: slug, slug, titulo: 'Reunião de teste', cliente: 'Cliente de teste', data: '2026-10-29',
      compartilhado, ...(atual.equipe ? { interno: internas } : {}),
    },
    notas: [],
    ...(atual.equipe ? { tem_transcricao: slug === 'teste-a' } : {}),
  });
}) as typeof fetch;

function Bancada() {
  const [usuario, setUsuario] = useState(atual);
  const [token, setToken] = useState('token-teste');
  trocarPessoa = setUsuario;
  trocarToken = setToken;
  return createElement(AreaReunioes, { usuario, token, aoSair: async () => {} });
}
const router = createMemoryRouter([{ path: '/reunioes/:slug', element: createElement(Bancada) }], { initialEntries: ['/reunioes/teste-a'] });
async function assentar() {
  for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}
function botao(texto: string) {
  const b = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(texto));
  assert.ok(b, 'Botão ausente: ' + texto);
  return b;
}
async function clicar(texto: string) {
  await act(async () => { botao(texto).click(); });
  await assentar();
}
try {
  await act(async () => { raiz.render(createElement(RouterProvider, { router })); });
  await assentar();
  assert.ok(document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'), 'Equipe abre direto no resumo.');
  assert.equal(botao('Roteiro da equipe').getAttribute('aria-pressed'), 'true');

  assert.equal(pedidosTranscricao, 0, 'A transcrição só é buscada quando a aba abre.');
  await clicar('🔒 Transcrição');
  assert.ok(document.body.textContent?.includes('Trecho sobre prazo'), 'A aba mostra o texto.');
  assert.ok(document.body.textContent?.includes('não conferido com o áudio'));
  assert.equal(pedidosTranscricao, 1);

  await clicar('Visão do cliente');
  assert.ok(!document.body.textContent?.includes('🔒 Transcrição'), 'Na visão do cliente a aba some.');
  assert.ok(!document.body.textContent?.includes('Trecho sobre prazo'));
  assert.ok(document.body.textContent?.includes('Pauta ainda não compartilhada'));
  assert.ok(!document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'));
  assert.ok(document.body.textContent?.includes('Consulte o Roteiro da equipe'));

  await act(async () => { trocarToken('token-renovado'); });
  await assentar();
  assert.equal(botao('Visão do cliente').getAttribute('aria-pressed'), 'true', 'Renovar token preserva escolha.');

  await act(async () => { await router.navigate('/reunioes/teste-b'); });
  await assentar();
  assert.equal(botao('Roteiro da equipe').getAttribute('aria-pressed'), 'true', 'Outro encontro volta ao padrão da equipe.');
  assert.ok(document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'));
  await clicar('🔒 Transcrição');
  assert.ok(document.body.textContent?.includes('Sem transcrição registrada'), 'Sem transcrição é explícito.');
  assert.equal(pedidosTranscricao, 1, 'Reunião sem transcrição não busca o texto.');
  await clicar('Conduzir reunião');

  atual = { ...pessoa, equipe: false };
  await act(async () => { trocarPessoa(atual); });
  await assentar();
  assert.ok(!document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'), 'Rebaixamento de acesso remove o roteiro mesmo com detalhe antigo em memória.');
  assert.ok(!document.body.textContent?.includes('Roteiro da equipe'));
  assert.ok(document.body.textContent?.includes('A equipe ainda está preparando'));

  await act(async () => { await router.navigate('/reunioes/teste-c'); });
  await assentar();
  assert.ok(!document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'), 'Convidado novo também abre somente a visão compartilhada.');
  assert.ok(consultas >= 3);
  console.log('reuniões: abertura da equipe, visão vazia explícita, renovação, navegação e convidado — ok');
} finally {
  await act(async () => { raiz.unmount(); });
  router.dispose();
  dom.window.close();
  globalThis.fetch = originalFetch;
}
