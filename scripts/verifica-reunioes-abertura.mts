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
  if (url.searchParams.get('acao') === 'visao') {
    assert.ok(atual.equipe, 'Convidado não pode pedir a visão geral.');
    return Response.json({ visao: { conteudo: { versao: 1, executivo: 'EXECUTIVO_TESTE', itens: [
      { id: 'a'.repeat(24), secao: 'decisao', tipo: 'decisao', texto: 'DECISAO_TESTE', trecho: 'trecho da decisão', fonte: 'transcricao' },
      { id: 'b'.repeat(24), secao: 'risco', tipo: 'ia', texto: 'RISCO_IA_TESTE', trecho: 'trecho do risco', fonte: 'transcricao' },
    ] }, fontes: { transcricao: true, slack: null }, conta: 'contato', gerada_em: '2026-10-30T12:00:00Z', transcricao_lida_em: '2026-10-30T11:00:00Z' }, correcoes: [] });
  }
  assert.equal(url.searchParams.get('acao'), 'abrir');
  consultas++;
  const slug = url.searchParams.get('slug');
  return Response.json({
    reuniao: {
      id: slug, slug, titulo: slug === 'teste-v' ? 'Parceiro >< Cliente | Assunto de teste' : 'Reunião de teste', cliente: 'Cliente de teste', data: '2026-10-29',
      compartilhado, ...(atual.equipe ? { interno: internas } : {}),
    },
    notas: slug === 'teste-v' ? [{ id: 'n1', secao: 'geral', tipo: 'decisao', texto: 'NOTA_TESTE', visibilidade: 'interno', autor_nome: 'Pessoa de teste', criado_em: '2026-10-30T12:00:00Z' }] : [],
    ...(atual.equipe ? { tem_transcricao: slug === 'teste-a', tem_visao: slug === 'teste-v' } : {}),
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
  assert.equal(document.querySelector('h1')?.textContent, 'Reunião de teste', 'Título sem barra fica inteiro.');
  assert.ok(!document.querySelector('.dcr-cabeca__sub'), 'Sem barra, não há subtítulo.');
  assert.ok(!document.querySelector('.dcr-cabeca__placar'), 'Sem visão geral, não há placar no topo.');
  assert.ok(!document.querySelector('.dcr-registrar'), 'Fora da visão geral, o registro fica ao lado, sem botão.');
  assert.ok(document.querySelector('#dcr-gaveta.dcr-lado .dcr-notas'), 'Registro da conversa ao lado do roteiro.');

  assert.equal(pedidosTranscricao, 0, 'A transcrição só é buscada quando a aba abre.');
  await clicar('Transcrição');
  assert.ok(document.body.textContent?.includes('Trecho sobre prazo'), 'A aba mostra o texto.');
  assert.ok(document.body.textContent?.includes('não conferido com o áudio'));
  assert.equal(pedidosTranscricao, 1);

  await clicar('Visão do cliente');
  assert.ok(![...document.querySelectorAll('nav[aria-label="Área da reunião"] button')].some((b) => b.textContent?.includes('Transcrição')), 'Na visão do cliente a aba some.');
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
  await clicar('Transcrição');
  assert.ok(document.body.textContent?.includes('Sem transcrição registrada'), 'Sem transcrição é explícito.');
  assert.equal(pedidosTranscricao, 1, 'Reunião sem transcrição não busca o texto.');
  await clicar('Conduzir reunião');

  await act(async () => { await router.navigate('/reunioes/teste-v'); });
  await assentar();
  assert.ok(document.body.textContent?.includes('EXECUTIVO_TESTE'), 'Reunião com visão geral abre nela para a equipe.');
  assert.equal(botao('Visão geral').getAttribute('aria-current'), 'page');
  assert.equal(document.querySelector('h1')?.textContent, 'Assunto de teste', 'Título da agenda: o assunto vira título.');
  assert.equal(document.querySelector('.dcr-cabeca__sub')?.textContent, 'Parceiro >< Cliente');
  assert.ok(!document.querySelector('.dcr-selo'), 'Abas sem selo repetido.');
  await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
  const placar = [...document.querySelectorAll('.dcr-cabeca__placar a')].map((a) => a.textContent);
  assert.deepEqual(placar, ['1decisões explícitas', '0próximos passos', '0em aberto', '1riscos e oportunidades'], 'Placar no topo com a contagem da visão.');
  assert.ok(document.querySelector('.dcr-cabeca__placar a.dcr-zero'), 'Zero aparece apagado.');
  const registrar = botao('Registrar ponto');
  assert.ok(registrar.textContent?.includes('1'), 'O botão mostra quantos registros existem.');
  const gaveta = document.getElementById('dcr-gaveta')!;
  assert.ok(gaveta.classList.contains('dcr-gaveta') && !gaveta.classList.contains('dcr-aberta'), 'Na visão geral, o registro começa fechado na gaveta.');
  assert.ok(gaveta.textContent?.includes('NOTA_TESTE'), 'Os registros continuam lá dentro.');
  await act(async () => { registrar.click(); });
  assert.ok(gaveta.classList.contains('dcr-aberta'), 'Registrar ponto abre a gaveta.');
  assert.equal(registrar.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement?.textContent?.trim(), 'Fechar ✕', 'Foco vai para o fechar.');
  await act(async () => { document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' })); });
  assert.ok(!gaveta.classList.contains('dcr-aberta'), 'Esc fecha a gaveta.');
  assert.equal(document.activeElement, registrar, 'Foco volta para o botão.');
  const mensal = document.querySelector('.dcr-visao__mensal')?.textContent ?? '';
  assert.ok(mensal.includes('DECISAO_TESTE') && !mensal.includes('RISCO_IA_TESTE'), 'Leitura da IA não aparece como sugestão do mensal.');
  await clicar('Visão do cliente');
  assert.ok(!document.body.textContent?.includes('EXECUTIVO_TESTE'), 'Na visão do cliente a visão geral some.');
  assert.ok(!document.querySelector('.dcr-cabeca__placar'), 'Na visão do cliente o placar some.');
  assert.ok(document.querySelector('#dcr-gaveta.dcr-lado'), 'Fora da visão geral, o registro volta para o lado.');
  await clicar('Roteiro da equipe');
  await clicar('Conduzir reunião');

  atual = { ...pessoa, equipe: false };
  await act(async () => { trocarPessoa(atual); });
  await assentar();
  assert.ok(!document.body.textContent?.includes('CONTEUDO_PRIVADO_TESTE'), 'Rebaixamento de acesso remove o roteiro mesmo com detalhe antigo em memória.');
  assert.ok(!document.body.textContent?.includes('Roteiro da equipe'));
  assert.ok(!document.querySelector('.dcr-cabeca__placar'), 'Convidado não vê o placar da visão geral.');
  assert.ok(document.querySelector('.dcr-comandos')?.textContent?.includes('Copiar link'), 'Convidado ainda copia o link.');
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
