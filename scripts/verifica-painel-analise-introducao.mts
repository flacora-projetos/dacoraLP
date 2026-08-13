import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-analise-introducao.ts';
import {
  chamarAnaliseIntroducao,
  contextoDoSnapshot,
  extrairTextoAplicavel,
  lerPedidoEditorial,
} from '../api/_painel-analise-introducao.ts';
import { AnaliseIntroducao, type AcaoDaIntroducao } from '../src/painel/AnaliseIntroducao.tsx';

const ID = '33333333-3333-4333-8333-333333333333';
const OUTRO_ID = '44444444-4444-4444-8444-444444444444';
const SUGESTAO_ID = '55555555-5555-4555-8555-555555555555';
const CHECKSUM = 'checksum-ra2-testado';
const fetchOriginal = globalThis.fetch;

const usuarioAutorizado = {
  id: 'usuario-teste', email: 'revisor@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
};

function linha(extra: Record<string, unknown> = {}) {
  return {
    id: ID, cliente_slug: 'karyne', competencia: '2026-07', versao: 1,
    estado: 'gerado', checksum: CHECKSUM, substituido_por: null, revogado_em: null,
    conteudo: {
      identidade: { clienteNome: 'Cliente Governado', tipoRelatorio: 'mensal', caminhoLocal: 'C:/segredo/nunca-envie' },
      leitura: {
        resumoExecutivo: [{ texto: 'Foram 16 leads com investimento de R$ 1.200,00.' }],
        destaques: [{ texto: 'A mudança de medição tornou o critério de lead mais restrito.', sustentadaPor: ['meta_resultado'] }],
        atencao: [{ texto: 'O custo aumentou no mesmo período.', sustentadaPor: ['meta_resultado'] }],
        proximosPassos: [],
      },
      montagem: [{ id: 'campanhas', titulo: 'Campanhas', apoio: 'Entrega do mês', pergunta: 'Houve interrupção de veiculação?' }],
      analysisContext: {
        versao: 'analysis_context_v1', competencia: '2026-07',
        fatos: [
          { id: 'meta_resultado', rotulo: 'Leads', unidade: 'inteiro', atual: 16, base: 12, variacao: 0.333333 },
          { id: 'meta_investimento', rotulo: 'Investimento', unidade: 'brl', atual: 1200, base: 1000, variacao: 0.2 },
        ],
        relacoes: [{ tipo: 'investimento_resultado', plataforma: 'meta', sustentadaPor: ['meta_resultado', 'meta_investimento'], texto: 'Os dois movimentos ocorreram na mesma comparação.' }],
        limitacoes: [],
      },
      caminhoLocal: 'C:/segredo/fora-do-contexto',
    },
    ...extra,
  };
}

const contexto = contextoDoSnapshot(linha() as any);
assert.ok(contexto);
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '{"texto":"Saída estrita."}' }]), 'Saída estrita.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '```json\n{"texto":"Saída cercada."}\n```' }]), 'Saída cercada.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: 'Saída textual direta.' }]), 'Saída textual direta.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: 'Primeiro parágrafo.' }, { type: 'tool_use', text: 'Ignorado.' }, { type: 'text', text: 'Segundo parágrafo.' }]), 'Primeiro parágrafo.\n\nSegundo parágrafo.', 'todos os blocos textuais úteis precisam chegar à revisão');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '**Leitura** com {chaves} e `markdown`.' }]), '**Leitura** com {chaves} e `markdown`.', 'markdown e chaves não tornam texto útil inválido');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '```json\n{"texto":"JSON truncado"\n```' }]), '```json\n{"texto":"JSON truncado"\n```', 'JSON imperfeito continua disponível para revisão humana');
assert.match(JSON.stringify(contexto.leituraDoRelatorio), /critério de lead mais restrito/);
assert.equal(lerPedidoEditorial({ id: ID, checksum: CHECKSUM, acao: 'gerar', cliente_slug: 'outro', analysis_context: { inventado: true } }).ok, true);
assert.equal(lerPedidoEditorial({ id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: SUGESTAO_ID, texto: 'Texto editorial '.repeat(300) }).ok, true, 'edição acima de 3.500 caracteres não pode ser descartada');

const linhaLegada = linha({
  conteudo: {
    ...linha().conteudo,
    analysisContext: undefined,
    dados: { faixas: {
      faixa_meta: { id: 'faixa_meta', metricas: [
        { id: 'meta_investimento', rotulo: 'Investimento', unidade: 'brl', valor: { estado: 'ok', numero: 863.91 }, comparativo: { permitido: true, competenciaBase: '2026-06', valorBase: { estado: 'ok', numero: 1200.58 }, variacao: -0.280423 } },
        { id: 'meta_resultado', rotulo: 'Leads', unidade: 'inteiro', valor: { estado: 'ok', numero: 22 }, comparativo: { permitido: true, competenciaBase: '2026-06', valorBase: { estado: 'ok', numero: 85 }, variacao: -0.741176 } },
        { id: 'meta_cpm', rotulo: 'CPM', unidade: 'brl', valor: { estado: 'ok', numero: 31.41 }, comparativo: { permitido: true, competenciaBase: '2026-06', valorBase: { estado: 'ok', numero: 15.46 }, variacao: 1.031695 } },
      ] },
      faixa_google: { id: 'faixa_google', metricas: [
        { id: 'google_investimento', rotulo: 'Investimento', unidade: 'brl', valor: { estado: 'ok', numero: 1000.98 }, comparativo: { permitido: true, competenciaBase: '2026-06', valorBase: { estado: 'ok', numero: 722.77 }, variacao: 0.384922 } },
        { id: 'google_conversoes', rotulo: 'Leads', unidade: 'decimal', valor: { estado: 'ok', numero: 16 }, comparativo: { permitido: true, competenciaBase: '2026-06', valorBase: { estado: 'ok', numero: 36 }, variacao: -0.555556 } },
      ] },
    }, tabelas: { campanhas: { linhas: [{ nome: 'Campanha principal', status: 'pausada' }] } }, evolucoesMensais: {}, quebras: {}, series: {} },
  },
});
const contextoLegado = contextoDoSnapshot(linhaLegada as any);
assert.ok(contextoLegado, 'snapshot anterior à RA1 precisa projetar contexto sem alterar o documento');
assert.ok(contextoLegado.fatos.some((fato: any) => fato.id === 'meta_resultado' && fato.atual === 22));
assert.ok(contextoLegado.relacoes.some((relacao: any) => relacao.tipo === 'investimento_resultado' && relacao.plataforma === 'meta'));

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
process.env.ANTHROPIC_MODEL_RA2 = 'claude-sonnet-5';

let chamadas: Array<{ url: string; corpo: unknown }> = [];
let linhaDoBanco: any = linha();
let saidaSonnet: string | string[] = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
let stopReason = 'stop';
let stopReasonSonnet = 'end_turn';
let stopSequence: string | null = null;
let respostaRpcDublada: { status: number; corpo: unknown } | null = null;
let sugestaoAtualDaRpc: { id: string; estado: string; texto: string; checksum: string } | null = null;

function dublar(usuario: unknown | null) {
  chamadas = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    const corpo = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.includes('/auth/v1/user')) return usuario
      ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 401 });
    chamadas.push({ url, corpo });
    if (url.includes('api.deepseek.com')) return new Response(JSON.stringify({ choices: [{ message: { content: saidaSonnet }, finish_reason: stopReason }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/v1/messages')) return new Response(JSON.stringify({ content: (Array.isArray(saidaSonnet) ? saidaSonnet : [saidaSonnet]).map((text) => ({ type: 'text', text })), stop_reason: stopReasonSonnet, stop_sequence: stopSequence }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rest/v1/relatorios')) return new Response(JSON.stringify([linhaDoBanco]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('relatorio_analise_sugestoes')) return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/registrar_sugestao_analise_introducao') && respostaRpcDublada) return new Response(JSON.stringify(respostaRpcDublada.corpo), { status: respostaRpcDublada.status, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/registrar_sugestao_analise_introducao')) {
      const pedidoRpc = corpo as any;
      if (pedidoRpc.p_acao === 'gerar') {
        sugestaoAtualDaRpc = { id: SUGESTAO_ID, estado: 'pronta', texto: pedidoRpc.p_texto_sugerido, checksum: pedidoRpc.p_checksum_visto };
      } else if (!sugestaoAtualDaRpc || pedidoRpc.p_sugestao_id !== sugestaoAtualDaRpc.id || pedidoRpc.p_checksum_visto !== sugestaoAtualDaRpc.checksum) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
      } else {
        sugestaoAtualDaRpc = {
          ...sugestaoAtualDaRpc,
          estado: pedidoRpc.p_acao === 'desfazer' ? 'desfeita' : pedidoRpc.p_acao === 'editar' ? 'editada' : 'aplicada',
          texto: pedidoRpc.p_texto_editado ?? sugestaoAtualDaRpc.texto,
        };
      }
      return new Response(JSON.stringify([{
        sugestao_id: sugestaoAtualDaRpc.id, estado: sugestaoAtualDaRpc.estado,
        texto_atual: sugestaoAtualDaRpc.texto, relatorio_checksum: sugestaoAtualDaRpc.checksum,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;
}

async function chamar(usuario: unknown | null, corpo?: unknown, metodo = 'POST') {
  dublar(usuario);
  const capturado: any = { status: 0, corpo: null, cabecalhos: {} };
  const req: any = { method: metodo, headers: { authorization: usuario ? 'Bearer token-de-teste' : undefined }, body: corpo, query: metodo === 'GET' ? corpo : undefined };
  const res: any = {
    setHeader(nome: string, valor: string) { capturado.cabecalhos[nome.toLowerCase()] = valor; return res; },
    status(status: number) { capturado.status = status; return res; },
    json(saida: any) { capturado.corpo = saida; return res; },
  };
  await handler(req, res);
  return capturado;
}

{
  const resposta = await chamar(null, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 401);
  assert.equal(chamadas.length, 0, 'sem sessão não lê relatório, chama modelo ou escreve auditoria');
}

{
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar', cliente_slug: 'outro-cliente', analysis_context: { fatos: [{ atual: 999999 }] } });
  assert.equal(resposta.status, 200);
  const modelo = chamadas.find((item) => item.url.includes('api.deepseek.com'));
  assert.ok(modelo, 'geração precisa tentar DeepSeek primeiro, somente no servidor');
  const contextoEnviado = JSON.stringify((modelo!.corpo as any).messages[1].content);
  assert.match(contextoEnviado, /Cliente Governado/);
  assert.match(contextoEnviado, /16/);
  assert.match(contextoEnviado, /critério de lead mais restrito/, 'o provider precisa receber o que já está escrito nas demais leituras do relatório');
  assert.doesNotMatch(contextoEnviado, /outro-cliente|999999|caminhoLocal|segredo/i, 'browser e paths locais não entram no prompt');
  const rpc = chamadas.find((item) => item.url.includes('/rpc/'))!;
  assert.equal((rpc.corpo as any).p_por, 'revisor@exemplo.com');
  assert.equal((rpc.corpo as any).p_relatorio_id, ID);
  assert.ok((rpc.corpo as any).p_contexto_hash, 'a sugestão precisa ficar vinculada ao contexto relido');
  assert.equal((rpc.corpo as any).p_modelo, 'automatico/deepseek/deepseek-v4-flash', 'a auditoria registra modo, provider e modelo reais');
}

{
  linhaDoBanco = linhaLegada;
  saidaSonnet = '```json\n{"texto":"Meta Ads registrou investimento de R$ 863,91 e 22 leads."}\n```';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'relatório real anterior à RA1 com JSON cercado precisa chegar ao provider');
  const modelo = chamadas.find((item) => item.url.includes('api.deepseek.com'))!;
  assert.match(JSON.stringify((modelo.corpo as any).messages[1].content), /863\.91|863,91/);
  assert.match(JSON.stringify((modelo.corpo as any).messages[1].content), /Campanha principal|pausada/, 'o provider precisa receber as tabelas que o relatório apresenta');
  assert.match(String((modelo.corpo as any).messages[0].content), /Responda em texto puro/);
  assert.match(String((modelo.corpo as any).messages[0].content), /dois ou três achados mais importantes/);
  assert.match(String((modelo.corpo as any).messages[0].content), /Não detalhe cada métrica ou tabela/);
  assert.doesNotMatch(String((modelo.corpo as any).messages[0].content), /objeto JSON/);
  assert.doesNotMatch(String((modelo.corpo as any).messages[0].content), /3\.500|3500/);
  assert.equal((modelo.corpo as any).max_tokens, 16_384, 'DeepSeek recebe folga real para encerrar sem corte');
  linhaDoBanco = linha();
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
}

{
  saidaSonnet = 'Esta introdução cabe no novo orçamento e termina de forma completa.';
  stopReason = 'stop';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'finish_reason stop aceita a resposta completa');
  assert.match(resposta.corpo.sugestao.texto, /completa\.$/);
}

{
  saidaSonnet = 'Texto interrompido no meio da frase';
  stopReason = 'length';
  stopReasonSonnet = 'max_tokens';
  stopSequence = null;
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 502, 'truncamento duplo não pode exibir sugestão pronta');
  assert.equal(resposta.corpo.erro, 'analise_indisponivel');
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/')), false, 'texto truncado não pode persistir na auditoria');
  assert.equal(chamadas.filter((item) => item.url.includes('api.deepseek.com')).length, 4, 'Flash e Pro fazem no máximo uma condensação cada, sem loop');
  stopReason = 'stop';
  stopReasonSonnet = 'end_turn';
}

{
  saidaSonnet = ['Primeiro bloco da análise.', 'Segundo bloco que completa a proposta.'];
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'múltiplos blocos de texto do provider precisam ser aceitos');
  assert.equal(resposta.corpo.sugestao.texto, 'Primeiro bloco da análise.\n\nSegundo bloco que completa a proposta.');
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
}

{
  saidaSonnet = '**Leitura** com {chaves} e cerca Markdown.\n\n```json\n{"texto":"incompleto"\n```';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'texto útil com markdown, chaves ou JSON imperfeito precisa chegar à revisão');
  assert.match(resposta.corpo.sugestao.texto, /\*\*Leitura\*\* com \{chaves\}/);
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
}

{
  saidaSonnet = 'Texto editorial acima do antigo teto. '.repeat(120);
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'resposta normal acima de 3.500 caracteres não pode ser descartada');
  assert.ok(resposta.corpo.sugestao.texto.length > 3500);
  saidaSonnet = '   ';
  const vazia = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(vazia.status, 502, 'resposta realmente vazia em ambos os providers continua inválida');
  assert.equal(vazia.corpo.erro, 'analise_indisponivel');
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
}

{
  saidaSonnet = '{"texto":"A conta registrou 17 leads."}';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'a proposta do Sonnet precisa chegar à revisão humana sem regex numérica');
  assert.equal(resposta.corpo.sugestao.texto, 'A conta registrou 17 leads.');
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/')), true);
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
}

{
  const gerada = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(gerada.status, 200, 'a geração precisa registrar a sugestão antes da edição');
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: gerada.corpo.sugestao.id, texto: 'A conta registrou 17 leads.' });
  assert.equal(resposta.status, 200, 'gerar e editar em seguida precisam usar a mesma sugestão e persistir');
  const rpc = chamadas.find((item) => item.url.includes('/rpc/'))!;
  assert.equal((rpc.corpo as any).p_sugestao_id, gerada.corpo.sugestao.id);
  assert.equal((rpc.corpo as any).p_checksum_visto, CHECKSUM, 'a edição preserva o checksum da geração');
  assert.equal((rpc.corpo as any).p_texto_editado, 'A conta registrou 17 leads.');
}

{
  respostaRpcDublada = { status: 200, corpo: [] };
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: SUGESTAO_ID, texto: 'Edição concorrente.' });
  assert.equal(resposta.status, 409, 'retorno vazio da RPC representa revisão concorrente, não falha do servidor');
  assert.equal(resposta.corpo.erro, 'revisao_desatualizada');
  respostaRpcDublada = null;
}

{
  respostaRpcDublada = { status: 400, corpo: { code: '42702', message: 'column reference "relatorio_checksum" is ambiguous' } };
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: SUGESTAO_ID, texto: 'Edição que encontra defeito SQL.' });
  assert.equal(resposta.status, 502, 'erro SQL não pode ser falsamente apresentado como concorrência');
  assert.equal(resposta.corpo.erro, 'auditoria_falhou');
  respostaRpcDublada = null;
}

{
  respostaRpcDublada = { status: 400, corpo: { code: 'P0001', message: 'checksum_divergente' } };
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: SUGESTAO_ID, texto: 'Edição após mudança de checksum.' });
  assert.equal(resposta.status, 409, 'condição explícita de checksum continua uma concorrência legítima');
  assert.equal(resposta.corpo.erro, 'revisao_desatualizada');
  respostaRpcDublada = null;
}

{
  linhaDoBanco = linha({ checksum: 'checksum-novo' });
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 409);
  assert.equal(chamadas.some((item) => item.url.includes('/v1/messages') || item.url.includes('/rpc/')), false, 'checksum obsoleto não chama modelo nem grava');
  linhaDoBanco = linha();
}

for (const acao of ['aplicar', 'editar', 'desfazer'] as const) {
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao, sugestaoId: SUGESTAO_ID, ...(acao === 'editar' ? { texto: 'A conta registrou 16 leads e R$ 1.200,00 investidos.' } : {}) });
  assert.equal(resposta.status, 200, `${acao} precisa registrar a ação editorial`);
  const rpc = chamadas.find((item) => item.url.includes('/rpc/'))!;
  assert.equal((rpc.corpo as any).p_acao, acao);
  assert.equal(chamadas.some((item) => item.url.includes('/v1/messages')), false, `${acao} não chama o modelo de novo`);
}

{
  const htmlAutenticado = renderToStaticMarkup(createElement(AnaliseIntroducao, { original: 'Original', podeRevisar: true, aoAcionar: async () => null, aoMudarTexto: () => undefined }));
  const htmlNaoDecidivel = renderToStaticMarkup(createElement(AnaliseIntroducao, { original: 'Original', podeRevisar: false, aoAcionar: async () => null, aoMudarTexto: () => undefined }));
  assert.match(htmlAutenticado, /Melhorar análise/);
  assert.doesNotMatch(htmlNaoDecidivel, /Melhorar análise/, 'a caneta não aparece fora da revisão decidível');
}

{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="montagem"></div></body></html>', {
    url: 'https://exemplo.invalido/painel-de-relatorios', pretendToBeVisual: true,
  });
  for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true, writable: true });
  }
  let rolouParaEdicao = 0;
  (dom.window.HTMLElement.prototype as any).scrollIntoView = () => { rolouParaEdicao += 1; };
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const recebidas: Array<{ acao: AcaoDaIntroducao; texto?: string }> = [];
  const textosAplicados: Array<string | null> = [];
  const sugestaoInicial = { id: SUGESTAO_ID, estado: 'pronta', texto: 'Resumo inicial completo.', checksum: CHECKSUM };
  let deveFalharAoSalvar = false;
  const montagem = dom.window.document.getElementById('montagem')!;
  const raiz = createRoot(montagem);
  flushSync(() => {
    raiz.render(createElement(AnaliseIntroducao, {
      original: 'Introdução original preservada.', podeRevisar: true,
      aoMudarTexto: (texto) => textosAplicados.push(texto),
      aoAcionar: async (acao, _sugestao, texto) => {
        recebidas.push({ acao, texto });
        if (acao === 'carregar') return sugestaoInicial;
        if (acao === 'editar' && deveFalharAoSalvar) throw new Error('A edição não pôde ser salva.');
        return { ...sugestaoInicial, estado: acao === 'editar' ? 'editada' : 'pronta', texto: texto ?? sugestaoInicial.texto };
      },
    }));
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  function botaoPor(texto: string): HTMLButtonElement {
    const achado = [...montagem.querySelectorAll('button')].find((botao) => (botao.textContent ?? '').trim() === texto);
    assert.ok(achado, `não encontrei o botão "${texto}"`);
    return achado as HTMLButtonElement;
  }
  function clicar(botao: HTMLButtonElement) {
    flushSync(() => botao.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  }
  function escrever(campo: HTMLTextAreaElement, texto: string) {
    flushSync(() => {
      (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any).set.call(campo, texto);
      campo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  }

  clicar(botaoPor('Editar'));
  let campo = montagem.querySelector('textarea') as HTMLTextAreaElement;
  assert.ok(campo, 'editar precisa abrir o campo');
  assert.equal(dom.window.document.activeElement, campo, 'o campo recebe foco ao entrar em edição');
  assert.ok(rolouParaEdicao > 0, 'o campo é rolado para uma área visível de edição');
  assert.equal(campo.rows, 12, 'o campo começa com altura útil para revisar um resumo');
  assert.match(readFileSync(new URL('../src/painel/painel.css', import.meta.url), 'utf8'), /min-height:\s*clamp\(14rem, 48vh, 28rem\)/, 'a altura da edição precisa responder ao viewport');

  const textoNovo = '  Texto novo enviado exatamente como foi digitado.  ';
  escrever(campo, textoNovo);
  clicar(botaoPor('Salvar edição'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(recebidas.at(-1), { acao: 'editar', texto: textoNovo }, 'salvar envia exatamente o texto novo ao handler');
  assert.equal(textosAplicados.at(-1), textoNovo, 'a edição persistida atualiza a revisão');

  clicar(botaoPor('Editar'));
  campo = montagem.querySelector('textarea') as HTMLTextAreaElement;
  escrever(campo, '   ');
  const antesDoVazio = recebidas.length;
  clicar(botaoPor('Salvar edição'));
  assert.equal(recebidas.length, antesDoVazio, 'texto vazio não chama o handler nem persiste');
  assert.match(montagem.querySelector('[role="alert"]')?.textContent ?? '', /Escreva uma sugestão antes de salvar/);
  assert.equal(campo.value, '   ', 'a validação não perde o rascunho');

  escrever(campo, 'Rascunho a cancelar.');
  const antesDoCancelar = recebidas.length;
  clicar(botaoPor('Cancelar'));
  assert.equal(recebidas.length, antesDoCancelar, 'cancelar não persiste nada');
  assert.match(montagem.textContent ?? '', /Texto novo enviado exatamente como foi digitado/, 'cancelar restaura a sugestão já salva');

  clicar(botaoPor('Editar'));
  campo = montagem.querySelector('textarea') as HTMLTextAreaElement;
  const textoComErro = 'Rascunho que deve permanecer após falha de salvamento.';
  escrever(campo, textoComErro);
  deveFalharAoSalvar = true;
  clicar(botaoPor('Salvar edição'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(montagem.querySelector('[role="alert"]')?.textContent ?? '', /A edição não pôde ser salva/);
  assert.equal((montagem.querySelector('textarea') as HTMLTextAreaElement).value, textoComErro, 'erro de salvar não perde o texto digitado');
  assert.deepEqual(recebidas.at(-1), { acao: 'editar', texto: textoComErro });

  flushSync(() => raiz.unmount());
  dom.window.close();
}

delete process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const indisponivel = await chamarAnaliseIntroducao(contexto!);
assert.equal(indisponivel.ok, false);
assert.equal(indisponivel.ok === false && indisponivel.erro, 'analise_indisponivel', 'sem segredo de nenhum provider a rota falha fechada');
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY = 'chave-deepseek-de-teste';
process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
globalThis.fetch = fetchOriginal;
console.log('OK — introdução: auth, contexto completo, DeepSeek primário, auditoria do provider, ações e caneta restrita à revisão.');
