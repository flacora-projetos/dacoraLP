import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-analises-secao.ts';
import {
  ANALISES_SECAO_PROMPT_VERSAO,
  contextoParaAnalises,
  extrairAnalisesDoSonnet,
  lerPedidoAnaliseSecao,
} from '../api/_painel-analises-secao.ts';
import { espacosAnaliticosDoSnapshot } from '../src/reports/blocos/analise.ts';
import { AnaliseDaSecao, AnalisesSecaoProvider, sugestaoDaSecaoEstaFechada, type AcaoAnalisesUI } from '../src/painel/AnalisesSecao.tsx';
import { paragrafosDaAnaliseEditorial } from '../src/painel/analiseEditorial.ts';

const ID = '33333333-3333-4333-8333-333333333333';
const SUGESTAO_ID = '55555555-5555-4555-8555-555555555555';
const CHECKSUM = 'checksum-ra3-testado';
const fetchOriginal = globalThis.fetch;
const usuario = { id: 'usuario-teste', email: 'revisor@exemplo.com', app_metadata: { provider: 'google', providers: ['google'] } };

function linha() {
  return {
    id: ID, cliente_slug: 'cliente-governado', competencia: '2026-07', versao: 1,
    estado: 'gerado', checksum: CHECKSUM, substituido_por: null, revogado_em: null,
    conteudo: {
      identidade: { clienteNome: 'Cliente Governado', tipoRelatorio: 'mensal' },
      leitura: {
        resumoExecutivo: [{ texto: 'O mês terminou com 16 leads.' }],
        destaques: [{ texto: 'A campanha principal concentrou a entrega.' }],
        atencao: [], proximosPassos: [],
      },
      analysisContext: {
        versao: 'analysis_context_v1', competencia: '2026-07',
        fatos: [{ id: 'meta_resultado', plataforma: 'meta', tipo: 'resultado', rotulo: 'Leads', unidade: 'inteiro', atual: 16 }],
        relacoes: [], limitacoes: [],
      },
      fontes: [], publicacao: {},
      montagem: [
        { id: 'indicadores', bloco: 'B1', titulo: 'Indicadores', faixa: 'faixa_meta', mostrarVariacao: true },
        { id: 'campanhas', bloco: 'B2', titulo: 'Campanhas', tabela: 'campanhas', pergunta: 'Onde houve concentração?' },
        { id: 'glossario', bloco: 'B7', titulo: 'Glossário', posicao: 'fim', metricas: [] },
        { id: 'comentario', bloco: 'B8', titulo: 'Comentário', comentario: 'comentario' },
        { id: 'audio', bloco: 'AUDIO', titulo: 'Áudio', audio: 'audio' },
        { id: 'sem-dado', bloco: 'B5', titulo: 'Série ausente', serie: 'inexistente' },
        { id: 'indisponivel', bloco: 'B6', titulo: 'Quebra indisponível', quebra: 'regiao', indisponivel: { motivo: 'Ainda não coletado.' } },
      ],
      dados: {
        faixas: { faixa_meta: { id: 'faixa_meta', metricas: [{ id: 'meta_resultado', rotulo: 'Leads', unidade: 'inteiro', valor: { estado: 'ok', numero: 16 }, miniaturaUrl: 'https://segredo.exemplo/imagem' }] } },
        tabelas: { campanhas: { id: 'campanhas', colunas: [], linhas: [{ id: 'principal', nome: 'Campanha principal', resultados: 12 }] } },
        evolucoesMensais: {}, rankingsCriativos: {}, quebras: { regiao: { itens: [] } }, series: {}, comentarios: {}, audios: {},
      },
    },
  };
}

const espacos = espacosAnaliticosDoSnapshot(linha().conteudo as any);
assert.deepEqual(espacos.map((item) => item.secao), ['bloco:indicadores', 'bloco:campanhas']);
assert.doesNotMatch(JSON.stringify(espacos), /segredo\.exemplo|miniaturaUrl/i, 'URLs e caminhos não chegam ao modelo');
assert.ok(espacos.every((item) => item.objetivo && item.fonte), 'cada caneta nasce de uma função analítica do catálogo');

const contexto = contextoParaAnalises(linha() as any, 'Houve promoção e mudança da página de destino.');
assert.ok(contexto);
assert.equal(contexto!.contextoDoMes, 'Houve promoção e mudança da página de destino.');
assert.equal(contexto!.secoesAlvo.length, 2);
const local = contextoParaAnalises(linha() as any, 'Contexto interno.', 'bloco:campanhas');
assert.deepEqual(local!.secoesAlvo.map((item) => item.secao), ['bloco:campanhas']);
assert.equal(local!.espacosDoRelatorio.length, 2, 'a caneta local continua lendo o relatório e os demais espaços');

const textoLongo = `A seção registrou 17 leads. ${'Leitura editorial sem teto artificial. '.repeat(180)}`;
assert.deepEqual(extrairAnalisesDoSonnet([{ type: 'text', text: JSON.stringify({ analises: [
  { secao: 'bloco:indicadores', texto: textoLongo },
  { secao: 'bloco:campanhas', texto: 'A campanha principal concentrou 75% dos resultados; vale conferir se essa concentração permaneceu eficiente.' },
] }) }], espacos)?.[0].texto, textoLongo.trim(), 'texto longo e número divergente não sofrem veto lexical');
assert.equal(extrairAnalisesDoSonnet([{ type: 'text', text: '{"analises":[{"secao":"bloco:indicadores","texto":"Só uma"}]}' }], espacos), null, 'lote incompleto não pode persistir parcialmente');
assert.equal(extrairAnalisesDoSonnet([{ type: 'text', text: '{"analises":[{"secao":"bloco:glossario","texto":"Extra"}]}' }], [espacos[0]]), null, 'o modelo não cria caneta fora do catálogo');
assert.equal(lerPedidoAnaliseSecao({ id: ID, checksum: CHECKSUM, acao: 'editar', secao: 'bloco:indicadores', sugestaoId: SUGESTAO_ID, texto: textoLongo }).ok, true);
assert.deepEqual(paragrafosDaAnaliseEditorial('Primeiro achado; Segundo achado; Terceiro achado'), ['Primeiro achado.', 'Segundo achado.', 'Terceiro achado.'], 'cadeia legada por ponto e vírgula ganha leitura em blocos sem alterar o texto persistido');
assert.deepEqual(paragrafosDaAnaliseEditorial('Primeiro parágrafo.\n\nSegundo parágrafo.'), ['Primeiro parágrafo.', 'Segundo parágrafo.'], 'parágrafos explícitos do modelo são preservados');

const html = renderToStaticMarkup(createElement(AnalisesSecaoProvider, {
  podeRevisar: true,
  espacos: espacos.map(({ secao, blocoId, titulo, objetivo }) => ({ secao, blocoId, titulo, objetivo })),
  aoAcionar: async () => ({}),
  children: createElement('div', null,
    createElement(AnaliseDaSecao, { secao: 'bloco:indicadores' }),
    createElement(AnaliseDaSecao, { secao: 'bloco:glossario' }),
  ),
}));
assert.match(html, /Gerar análises do relatório/, 'a geração global continua disponível para preencher as análises das seções');
assert.match(html, /A introdução continua no botão “Melhorar análise”/, 'a UX diferencia a geração das seções da revisão da introdução');
assert.match(html, /Contexto do mês/);
assert.match(html, /independentemente do modelo selecionado/i);
assert.doesNotMatch(html, /\bSonnet\b/, 'o contexto não pode prometer um provider fixo quando o modelo é selecionável');
assert.equal((html.match(/aria-label="Refinar análise de/g) ?? []).length, 1, 'bloco sem função analítica não recebe caneta');
assert.equal(sugestaoDaSecaoEstaFechada(undefined), false);
assert.equal(sugestaoDaSecaoEstaFechada({ id: SUGESTAO_ID, secao: 'bloco:indicadores', estado: 'pronta', texto: 'Proposta', checksum: CHECKSUM }), false);
assert.equal(sugestaoDaSecaoEstaFechada({ id: SUGESTAO_ID, secao: 'bloco:indicadores', estado: 'aplicada', texto: 'Aplicada', checksum: CHECKSUM }), true);
assert.equal(sugestaoDaSecaoEstaFechada({ id: SUGESTAO_ID, secao: 'bloco:indicadores', estado: 'editada', texto: 'Editada', checksum: CHECKSUM }), true);
assert.equal(sugestaoDaSecaoEstaFechada({ id: SUGESTAO_ID, secao: 'bloco:indicadores', estado: 'desfeita', texto: 'Desfeita', checksum: CHECKSUM }), true);

const css = readFileSync(new URL('../src/painel/painel.css', import.meta.url), 'utf8');
const cssRelatorio = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
assert.match(cssRelatorio, /@media print[\s\S]*\.dcp-analises-relatorio[\s\S]*display:\s*none !important/);
assert.match(css, /\.dc-analise-editorial p \+ p\s*\{[\s\S]*margin-top:/, 'análises aplicadas precisam ter ritmo entre parágrafos');
const rotaPublica = readFileSync(new URL('../api/relatorio-publico.ts', import.meta.url), 'utf8');
assert.doesNotMatch(rotaPublica, /relatorio_contextos_mes|painel-analises-secao|contextoDoMes/, 'contexto interno não entra na rota pública');

{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="montagem"></div></body></html>', { pretendToBeVisual: true });
  for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) {
    Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true, writable: true });
  }
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const recebidas: Array<{ acao: AcaoAnalisesUI; contexto?: string }> = [];
  let salvo = 'Promoção válida até o fim de julho.';
  const montagem = dom.window.document.getElementById('montagem')!;
  const raiz = createRoot(montagem);
  flushSync(() => raiz.render(createElement(AnalisesSecaoProvider, {
    podeRevisar: true,
    espacos: [],
    aoAcionar: async (acao: AcaoAnalisesUI, dados?: { contexto?: string }) => {
      recebidas.push({ acao, contexto: dados?.contexto });
      if (acao === 'carregar') return { contexto: { texto: salvo } };
      if (acao === 'salvar_contexto') { salvo = dados?.contexto ?? ''; return { contexto: { texto: salvo } }; }
      return {};
    },
    children: createElement('div'),
  })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(montagem.textContent ?? '', /Promoção válida até o fim de julho/);
  const editar = [...montagem.querySelectorAll('button')].find((botao) => botao.textContent?.includes('Editar contexto')) as HTMLButtonElement;
  assert.ok(editar, 'contexto salvo precisa oferecer edição explícita');
  flushSync(() => editar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  let campo = montagem.querySelector('#dcp-contexto-mes') as HTMLTextAreaElement;
  assert.equal(campo.value, 'Promoção válida até o fim de julho.');
  flushSync(() => {
    (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any).set.call(campo, 'Promoção encerrada em 20/07.');
    campo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const cancelar = [...montagem.querySelectorAll('button')].find((botao) => botao.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
  flushSync(() => cancelar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.match(montagem.textContent ?? '', /Promoção válida até o fim de julho/, 'cancelar restaura o contexto persistido');
  const editarNovamente = [...montagem.querySelectorAll('button')].find((botao) => botao.textContent?.includes('Editar contexto')) as HTMLButtonElement;
  flushSync(() => editarNovamente.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  campo = montagem.querySelector('#dcp-contexto-mes') as HTMLTextAreaElement;
  flushSync(() => {
    (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any).set.call(campo, 'Promoção encerrada em 20/07.');
    campo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const salvar = [...montagem.querySelectorAll('button')].find((botao) => botao.textContent?.trim() === 'Salvar contexto') as HTMLButtonElement;
  flushSync(() => salvar.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(recebidas.at(-1), { acao: 'salvar_contexto', contexto: 'Promoção encerrada em 20/07.' });
  assert.match(montagem.textContent ?? '', /Promoção encerrada em 20\/07/);
  assert.match(montagem.textContent ?? '', /Editar contexto/, 'depois de salvar, o estado volta a oferecer edição');
  flushSync(() => raiz.unmount());
  dom.window.close();
}

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'revisor@exemplo.com';
process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY = 'chave-deepseek-de-teste';
process.env.MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER = 'flash,pro,sonnet';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MODEL = 'deepseek-v4-flash';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro';
process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
process.env.ANTHROPIC_MODEL_RA3 = 'claude-sonnet-5';

let chamadas: Array<{ url: string; corpo: any }> = [];
let saidaModelo: any = { analises: [
  { secao: 'bloco:indicadores', texto: 'Os 16 leads concentram a leitura do mês.' },
  { secao: 'bloco:campanhas', texto: 'A campanha principal concentrou a entrega.' },
] };

function dublar(usuarioAtual: unknown | null) {
  chamadas = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    const corpo = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.includes('/auth/v1/user')) return usuarioAtual
      ? new Response(JSON.stringify(usuarioAtual), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 401 });
    chamadas.push({ url, corpo });
    if (url.includes('/rest/v1/relatorios')) return new Response(JSON.stringify([linha()]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rest/v1/relatorio_contextos_mes')) return new Response(JSON.stringify([{ contexto: 'Houve promoção e mudança da página de destino.', atualizado_por: 'revisor@exemplo.com', atualizado_em: '2026-08-13T12:00:00Z' }]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rest/v1/relatorio_analise_sugestoes')) return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('api.deepseek.com')) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(saidaModelo) }, finish_reason: 'stop' }], usage: { prompt_tokens: 500, completion_tokens: 250, total_tokens: 750 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/v1/messages')) return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(saidaModelo) }], stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/salvar_contexto_mes_relatorio')) return new Response(JSON.stringify([{ contexto: corpo.p_contexto, atualizado_por: corpo.p_por, atualizado_em: '2026-08-13T12:01:00Z' }]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/registrar_sugestoes_analise_secoes')) {
      const itens = corpo.p_analises ?? [{ secao: corpo.p_secao, textoSugerido: 'Texto atual.' }];
      return new Response(JSON.stringify(itens.map((item: any, indice: number) => ({ sugestao_id: SUGESTAO_ID, secao: item.secao, estado: corpo.p_acao === 'gerar' ? 'pronta' : corpo.p_acao === 'editar' ? 'editada' : corpo.p_acao === 'desfazer' ? 'desfeita' : 'aplicada', texto_atual: corpo.p_texto_editado ?? item.textoSugerido, relatorio_checksum: CHECKSUM, indice }))), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;
}

async function chamar(usuarioAtual: unknown | null, corpo?: any, metodo = 'POST') {
  dublar(usuarioAtual);
  const capturado: any = { status: 0, corpo: null };
  const req: any = { method: metodo, headers: { authorization: usuarioAtual ? 'Bearer token' : undefined }, body: corpo, query: metodo === 'GET' ? corpo : undefined };
  const res: any = { setHeader() { return res; }, status(status: number) { capturado.status = status; return res; }, json(saida: any) { capturado.corpo = saida; return res; } };
  await handler(req, res);
  return capturado;
}

assert.equal((await chamar(null, { id: ID, checksum: CHECKSUM, acao: 'gerar_todas' })).status, 401);
assert.equal(chamadas.length, 0, 'sem sessão não lê contexto, chama modelo ou persiste');

{
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'gerar_todas', contexto: 'forjado no browser' });
  assert.equal(resposta.status, 200);
  assert.equal(resposta.corpo.sugestoes.length, 2);
  const modelo = chamadas.find((item) => item.url.includes('api.deepseek.com'))!;
  const prompt = JSON.stringify(modelo.corpo.messages[1].content);
  assert.match(prompt, /Houve promoção e mudança da página/);
  assert.doesNotMatch(prompt, /forjado no browser|segredo\.exemplo/);
  assert.match(modelo.corpo.messages[0].content, /coerentes entre si e com a introdução/);
  assert.match(modelo.corpo.messages[0].content, /uma ou duas frases curtas/);
  assert.match(modelo.corpo.messages[0].content, /não encadeie observações por ponto e vírgula/);
  assert.match(modelo.corpo.messages[0].content, /Não existe limite artificial de caracteres/);
  const rpc = chamadas.find((item) => item.url.includes('/rpc/registrar_sugestoes'))!;
  assert.equal(rpc.corpo.p_prompt_versao, ANALISES_SECAO_PROMPT_VERSAO);
  assert.equal(rpc.corpo.p_modelo, 'automatico/deepseek/deepseek-v4-flash');
  assert.equal(rpc.corpo.p_analises.length, 2, 'o lote inteiro persiste por uma única RPC transacional');
  assert.equal(rpc.corpo.p_por, 'revisor@exemplo.com');
}

{
  saidaModelo = { analises: [{ secao: 'bloco:campanhas', texto: textoLongo }] };
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'gerar_secao', secao: 'bloco:campanhas' });
  assert.equal(resposta.status, 200);
  const modelo = chamadas.find((item) => item.url.includes('api.deepseek.com'))!;
  assert.match(JSON.stringify(modelo.corpo.messages[1].content), /bloco:indicadores/, 'a caneta local usa o mesmo contexto global');
  assert.equal(chamadas.find((item) => item.url.includes('/rpc/registrar_sugestoes'))!.corpo.p_analises[0].textoSugerido, textoLongo.trim());
}

{
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'gerar_secao', secao: 'bloco:glossario' });
  assert.equal(resposta.status, 422);
  assert.equal(chamadas.some((item) => item.url.includes('api.deepseek.com') || item.url.includes('/v1/messages') || item.url.includes('/rpc/')), false);
}

{
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'salvar_contexto', contexto: 'Mudança de página confirmada internamente.' });
  assert.equal(resposta.status, 200);
  const rpc = chamadas.find((item) => item.url.includes('/rpc/salvar_contexto'))!;
  assert.equal(rpc.corpo.p_por, 'revisor@exemplo.com');
  assert.equal(rpc.corpo.p_contexto, 'Mudança de página confirmada internamente.');
  assert.equal(chamadas.some((item) => item.url.includes('api.deepseek.com') || item.url.includes('/v1/messages')), false);
}

{
  saidaModelo = { analises: [{ secao: 'bloco:indicadores', texto: 'Lote incompleto.' }] };
  const resposta = await chamar(usuario, { id: ID, checksum: CHECKSUM, acao: 'gerar_todas' });
  assert.equal(resposta.status, 502, 'lote incompleto nos dois providers falha sem persistência parcial');
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/registrar_sugestoes')), false, 'saída contraditória/incompleta não persiste parcialmente');
}

globalThis.fetch = fetchOriginal;
console.log('OK — RA3: catálogo, lote coerente, caneta local, contexto privado, auth, impressão e ausência pública.');
