import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-analises-secao.ts';
import { lerPedidoAnaliseSecao } from '../api/_painel-analises-secao.ts';
import { validarSugestao } from '../api/_painel-contexto-sugerido.ts';
import { ContextoAutomatico } from '../src/painel/ContextoAutomatico.tsx';
import { AnalisesSecaoProvider, type AcaoAnalisesUI } from '../src/painel/AnalisesSecao.tsx';
import { acrescentarContexto, textoDosItens, type ContextoSugerido } from '../src/painel/contextoSugerido.ts';

const ID = '33333333-3333-4333-8333-333333333333';
const CHECKSUM = 'checksum-sintetico';
const usuario = { id: 'usuario-teste', email: 'revisor@exemplo.com', app_metadata: { provider: 'google', providers: ['google'] } };
const itens = [
  { id: 'registro-a', tipo: 'decisao' as const, data: '2026-07-04', fonte: 'decisao sintética', texto: 'Aprovada campanha de teste.', peso: 9 },
  { id: 'registro-b', tipo: 'relato' as const, data: '2026-07-12', fonte: 'relato sintético', texto: 'Equipe relatou troca da página.', peso: 5 },
  { id: 'registro-c', tipo: 'mudanca' as const, data: '2026-07-20', fonte: 'plataforma sintética', texto: 'A plataforma registrou alteração.', peso: 3 },
];
const sugestao: ContextoSugerido = {
  versao: 1, clienteSlug: 'cliente-sintetico', competencia: '2026-07', desde: '2026-07-01', ate: '2026-07-31',
  geradoEm: new Date().toISOString(), itens, avisos: [], total: 3, omitidos: 0,
};
async function aguardarCondicao(condicao: () => boolean, descricao: string) {
  const limite = Date.now() + 2_000;
  while (!condicao() && Date.now() < limite) await new Promise(resolve => setTimeout(resolve, 5));
  assert.ok(condicao(), `tempo excedido aguardando ${descricao}`);
}
const relatorio: any = {
  id: ID, cliente_slug: 'cliente-sintetico', competencia: '2026-07', versao: 1, estado: 'gerado', checksum: CHECKSUM,
  substituido_por: null, revogado_em: null, conteudo: {
    identidade: { clienteNome: 'Cliente sintético', tipoRelatorio: 'mensal', periodo: { inicio: '2026-07-01', fim: '2026-07-31' } },
    leitura: { resumoExecutivo: [], destaques: [], atencao: [], proximosPassos: [] },
    analysisContext: { versao: 'analysis_context_v1', competencia: '2026-07', fatos: [], relacoes: [], limitacoes: [] },
    fontes: [], publicacao: {}, montagem: [{ id: 'indicadores', bloco: 'B1', titulo: 'Indicadores', faixa: 'faixa_meta', mostrarVariacao: true }],
    dados: { faixas: { faixa_meta: { id: 'faixa_meta', metricas: [{ id: 'leads', rotulo: 'Leads', unidade: 'inteiro', valor: { estado: 'ok', numero: 2 } }] } }, tabelas: {}, evolucoesMensais: {}, rankingsCriativos: {}, quebras: {}, series: {}, comentarios: {}, audios: {} },
  },
};

assert.equal(validarSugestao(sugestao, relatorio), sugestao);
for (const campo of [
  { ...sugestao, clienteSlug: 'outro-cliente' },
  { ...sugestao, competencia: '2026-08' },
  { ...sugestao, desde: '2026-07-02' },
  { ...sugestao, ate: '2026-08-01' },
  { ...sugestao, itens: [{ ...itens[0], data: '2026-06-30' }, ...itens.slice(1)] },
]) assert.equal(validarSugestao(campo, relatorio), null, 'slug, competência, janela e datas fora do período invalidam o snapshot');

assert.equal(lerPedidoAnaliseSecao({ id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['a', 'a'] }).ok, false);
assert.equal(lerPedidoAnaliseSecao({ id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: [] }).ok, false);
assert.equal(lerPedidoAnaliseSecao({ id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['a', 'b'] }).ok, true);
assert.equal(acrescentarContexto(' Contexto já revisado. ', textoDosItens([itens[0]])).startsWith('Contexto já revisado.'), true);

const html = renderToStaticMarkup(createElement(ContextoAutomatico, { sugestao: null, aviso: 'O histórico ainda não está disponível para esta versão. O contexto manual continua disponível.', ocupada: false, aoUsar() {}, async aoOrganizar() { return ''; } }));
assert.match(html, /histórico ainda não está disponível/);
assert.match(html, /contexto manual continua disponível/);

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-sintetica';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-sintetica';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'revisor@exemplo.com';
process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
process.env.MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER = 'flash';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY = 'chave-sintetica';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MODEL = 'modelo-sintetico';

let chamadas: Array<{ url: string; body: any }> = [];
let sugestaoBanco: ContextoSugerido | any = sugestao;
let checksumAtual = CHECKSUM;
let trocarChecksumNoProvider = false;
let saidaModelo = JSON.stringify({ ordem: ['registro-b', 'registro-a', 'registro-c'], texto: 'Fato inventado pelo modelo.' });
function dublar(auth: any | null) {
  chamadas = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.includes('/auth/v1/user')) return auth ? new Response(JSON.stringify(auth), { status: 200 }) : new Response('{}', { status: 401 });
    chamadas.push({ url, body });
    if (url.includes('/rest/v1/relatorios')) return new Response(JSON.stringify([{ ...relatorio, checksum: checksumAtual }]), { status: 200 });
    if (url.includes('/rest/v1/relatorio_contextos_sugeridos')) return new Response(JSON.stringify(sugestaoBanco ? [{ sugestao: sugestaoBanco }] : []), { status: 200 });
    if (url.includes('/rest/v1/relatorio_contextos_mes')) return new Response(JSON.stringify([]), { status: 200 });
    if (url.includes('/rest/v1/relatorio_analise_sugestoes')) return new Response(JSON.stringify([]), { status: 200 });
    if (url.includes('/rest/v1/relatorio_secoes_dispensadas')) return new Response(JSON.stringify([]), { status: 200 });
    if (url.includes('api.deepseek.com')) {
      if (trocarChecksumNoProvider) checksumAtual = 'checksum-trocado-durante-a-organizacao';
      return new Response(JSON.stringify({ choices: [{ message: { content: saidaModelo }, finish_reason: 'stop' }] }), { status: 200 });
    }
    if (url.includes('/rpc/')) return new Response(JSON.stringify([]), { status: 200 });
    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;
}
async function chamar(auth: any | null, body: any, method = 'POST') {
  dublar(auth);
  const result: any = { status: 0, body: null };
  const req: any = { method, headers: { authorization: auth ? 'Bearer teste' : undefined }, body, query: body };
  const res: any = { setHeader() {}, status(status: number) { result.status = status; return res; }, json(value: any) { result.body = value; return res; } };
  await handler(req, res);
  return result;
}

const semAuth = await chamar(null, { id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['registro-a'] });
assert.equal(semAuth.status, 401);
assert.equal(chamadas.length, 0, 'sem autorização não consulta histórico nem chama provider');

const get = await chamar(usuario, { id: ID, checksum: CHECKSUM }, 'GET');
assert.equal(get.status, 200);
assert.deepEqual(get.body.contextoSugerido.itens.map((i: any) => i.id), ['registro-a', 'registro-b', 'registro-c']);
assert.equal(chamadas.some(c => c.url.includes('api.deepseek.com') || c.url.includes('/rpc/')), false, 'GET apenas lê sugestão privada');
assert.ok(chamadas.some(c => c.url.includes('/rest/v1/relatorio_contextos_sugeridos')));

const salvamentoExplicito = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'salvar_contexto', contexto: 'Contexto revisado manualmente.' });
assert.equal(salvamentoExplicito.status, 200);
assert.ok(chamadas.some(c => c.url.includes('/rpc/salvar_contexto_mes_relatorio')), 'persistência só ocorre pela ação explícita salvar_contexto');
assert.equal(chamadas.some(c => c.url.includes('api.deepseek.com')), false, 'salvar contexto não chama IA');

const stale = await chamar(usuario, { id: ID, checksum: 'checksum-antigo', acao: 'organizar_contexto', itensIds: ['registro-a'] });
assert.equal(stale.status, 409, 'checksum divergente bloqueia organizar antes do provider');
assert.equal(chamadas.some(c => c.url.includes('api.deepseek.com')), false);

const inexistente = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['registro-novo'] });
assert.equal(inexistente.status, 409, 'somente IDs existentes na sugestão podem ser organizados');
assert.equal(chamadas.some(c => c.url.includes('api.deepseek.com')), false);

const organizado = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['registro-a', 'registro-b', 'registro-c'] });
assert.equal(organizado.status, 200);
assert.match(organizado.body.contextoOrganizado, /Equipe relatou troca da página/);
assert.ok(organizado.body.contextoOrganizado.indexOf('Equipe relatou') < organizado.body.contextoOrganizado.indexOf('Aprovada campanha'));
assert.doesNotMatch(organizado.body.contextoOrganizado, /Fato inventado pelo modelo/);
assert.equal(chamadas.some(c => c.url.includes('/rpc/')), false, 'organizar só retorna prévia; não salva contexto');

for (const ordem of [['registro-a', 'registro-b'], ['registro-a', 'registro-a', 'registro-c'], ['registro-a', 'registro-b', 'novo-id']]) {
  saidaModelo = JSON.stringify({ ordem });
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['registro-a', 'registro-b', 'registro-c'] });
  assert.equal(resposta.status, 502, 'modelo com corte, repetição ou ID novo é rejeitado');
  assert.equal(chamadas.some(c => c.url.includes('/rpc/')), false);
}

trocarChecksumNoProvider = true;
saidaModelo = JSON.stringify({ ordem: ['registro-a', 'registro-b', 'registro-c'] });
const trocaDurante = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'organizar_contexto', itensIds: ['registro-a', 'registro-b', 'registro-c'] });
assert.equal(trocaDurante.status, 409, 'checksum alterado durante a chamada ao modelo invalida a prévia');
assert.equal(chamadas.filter(c => c.url.includes('/rest/v1/relatorios')).length, 2, 'o endpoint reconfirma a versão após o provider');
checksumAtual = CHECKSUM;
trocarChecksumNoProvider = false;

{
  const { createRequire } = await import('node:module');
  const { JSDOM } = createRequire(import.meta.url)('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true });
  for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent'])
    Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true, writable: true });
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const usos: string[] = [];
  flushSync(() => root.render(createElement(ContextoAutomatico, {
    sugestao, ocupada: false,
    aoUsar: (texto: string) => { usos.push(acrescentarContexto('Contexto manual já salvo.', texto)); },
    aoOrganizar: async (ids: string[]) => { assert.deepEqual(ids, ['registro-b', 'registro-c']); return textoDosItens([itens[2], itens[1]]); },
  })));
  const caixa = dom.window.document.querySelector('input[type=checkbox]') as HTMLInputElement;
  flushSync(() => caixa.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.equal((dom.window.document.querySelectorAll('input[type=checkbox]')[0] as HTMLInputElement).checked, false, 'é possível retirar registro da seleção');
  assert.equal(dom.window.document.querySelectorAll('input[type=checkbox]').length, 3, 'retirar não apaga o registro da fonte');
  const organizarBtn = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('Organizar com IA')) as HTMLButtonElement;
  flushSync(() => organizarBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  await aguardarCondicao(() => /Prévia organizada · ainda não salva/.test(dom.window.document.body.textContent ?? ''), 'prévia organizada no DOM');
  assert.match(dom.window.document.body.textContent ?? '', /Prévia organizada · ainda não salva/);
  assert.equal(usos.length, 0);
  const acrescentar = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('Acrescentar ao contexto')) as HTMLButtonElement;
  flushSync(() => acrescentar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.equal(usos.length, 1);
  assert.match(usos[0], /^Contexto manual já salvo\./, 'o helper acrescenta a sugestão sem apagar o contexto existente');
  flushSync(() => root.unmount());
  dom.window.close();
}

{
  const { createRequire } = await import('node:module');
  const { JSDOM } = createRequire(import.meta.url)('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true });
  for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent'])
    Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true, writable: true });
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const recebidas: Array<{ acao: AcaoAnalisesUI; contexto?: string; itensIds?: string[] }> = [];
  let contextoSalvo = 'Contexto manual previamente revisado.';
  const aoAcionar = async (acao: AcaoAnalisesUI, dados?: { contexto?: string; itensIds?: string[] }) => {
    recebidas.push({ acao, contexto: dados?.contexto, itensIds: dados?.itensIds });
    if (acao === 'carregar') return { contexto: { texto: contextoSalvo }, contextoSugerido: sugestao };
    if (acao === 'organizar_contexto') return { contextoOrganizado: textoDosItens([itens[1], itens[0], itens[2]]) };
    if (acao === 'salvar_contexto') { contextoSalvo = dados?.contexto ?? ''; return { contexto: { texto: contextoSalvo } }; }
    return {};
  };
  const root = createRoot(dom.window.document.getElementById('root')!);
  flushSync(() => root.render(createElement(AnalisesSecaoProvider, { podeRevisar: true, espacos: [], aoAcionar, children: createElement('div') })));
  await aguardarCondicao(() => recebidas.some(r => r.acao === 'carregar') && Boolean(dom.window.document.querySelector('#dcp-contexto-mes')), 'contexto manual carregado pelo provider');
  await aguardarCondicao(() => Boolean(dom.window.document.querySelector('.dcp-contexto-automatico input[type=checkbox]')), `itens sugeridos carregados pelo provider (${(recebidas.map(r => r.acao)).join(', ')})`);
  assert.deepEqual(recebidas.map(r => r.acao), ['carregar']);
  const checks = [...dom.window.document.querySelectorAll('.dcp-contexto-automatico input[type=checkbox]')] as HTMLInputElement[];
  flushSync(() => checks[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.equal(checks[0].checked, false, 'o checkbox real foi retirado antes de acrescentar');
  const acrescentar = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.includes('Acrescentar ao contexto')) as HTMLButtonElement;
  flushSync(() => acrescentar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  const textarea = dom.window.document.querySelector('#dcp-contexto-mes') as HTMLTextAreaElement;
  assert.ok(textarea.value.startsWith('Contexto manual previamente revisado.\n\n'), 'o texto da área continua preservado antes do acréscimo');
  assert.doesNotMatch(textarea.value, /Aprovada campanha de teste/, 'item retirado não entra no texto acrescentado');
  assert.match(textarea.value, /Equipe relatou troca da página/);
  assert.match(textarea.value, /A plataforma registrou alteração/);
  assert.deepEqual(recebidas.map(r => r.acao), ['carregar'], 'acrescentar não salva nem gera análises');
  const salvar = [...dom.window.document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Salvar contexto') as HTMLButtonElement;
  flushSync(() => salvar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  await aguardarCondicao(() => recebidas.some(r => r.acao === 'salvar_contexto') && dom.window.document.body.textContent?.includes('Contexto interno salvo.'), 'confirmação do salvamento explícito');
  assert.deepEqual(recebidas.map(r => r.acao), ['carregar', 'salvar_contexto'], 'somente clique explícito persiste o rascunho');
  assert.equal(recebidas.at(-1)?.contexto, textarea.value);
  flushSync(() => root.unmount());
  dom.window.close();
}

console.log('OK — contexto sugerido: validação, leitura privada, autorização, permutação estrita, sem gravação e checksum concorrente.');
// React DOM mantém um MessagePort de scheduler referenciado em Node mesmo após
// desmontar as raízes e fechar as janelas jsdom; todas as asserções já terminaram.
process.exit(0);
