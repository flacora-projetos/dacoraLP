import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-analise-introducao.ts';
import {
  chamarSonnetIntroducao,
  contextoDoSnapshot,
  lerPedidoEditorial,
  validarNumerosDaSugestao,
} from '../api/_painel-analise-introducao.ts';
import { AnaliseIntroducao } from '../src/painel/AnaliseIntroducao.tsx';

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
      leitura: { resumoExecutivo: [{ texto: 'Foram 16 leads com investimento de R$ 1.200,00.' }] },
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
assert.equal(validarNumerosDaSugestao('A conta registrou 16 leads e R$ 1.200,00.', contexto).ok, true);
assert.equal(validarNumerosDaSugestao('Em julho de 2026, a conta registrou 16 leads.', contexto).ok, true);
assert.equal(validarNumerosDaSugestao('A conta registrou 17 leads.', contexto).ok, false, 'número novo nunca fica aplicável');
{
  const percentual = contextoDoSnapshot(linha({
    conteudo: {
      ...linha().conteudo,
      analysisContext: {
        ...linha().conteudo.analysisContext,
        fatos: [{ id: 'meta_ctr', rotulo: 'CTR', unidade: 'percentual', atual: 0.025, base: 0.02, variacao: 0.333333 }],
      },
    },
  }) as any);
  assert.ok(percentual);
  assert.equal(validarNumerosDaSugestao('O CTR foi de 2,5%.', percentual).ok, true);
  assert.equal(validarNumerosDaSugestao('A base do CTR foi 2,0%.', percentual).ok, true);
  assert.equal(validarNumerosDaSugestao('O CTR subiu 33,3%.', percentual).ok, true);
  assert.equal(validarNumerosDaSugestao('O CTR foi de 7,7%.', percentual).ok, false, 'percentual alheio continua bloqueado');
}
assert.equal(lerPedidoEditorial({ id: ID, checksum: CHECKSUM, acao: 'gerar', cliente_slug: 'outro', analysis_context: { inventado: true } }).ok, true);

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'revisor@exemplo.com';
process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
process.env.ANTHROPIC_MODEL_RA2 = 'claude-sonnet-4-20250514';

let chamadas: Array<{ url: string; corpo: unknown }> = [];
let linhaDoBanco: any = linha();
let saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';

function dublar(usuario: unknown | null) {
  chamadas = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    const corpo = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.includes('/auth/v1/user')) return usuario
      ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 401 });
    chamadas.push({ url, corpo });
    if (url.includes('/v1/messages')) return new Response(JSON.stringify({ content: [{ type: 'text', text: saidaSonnet }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rest/v1/relatorios')) return new Response(JSON.stringify([linhaDoBanco]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('relatorio_analise_sugestoes')) return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/registrar_sugestao_analise_introducao')) return new Response(JSON.stringify([{
      sugestao_id: SUGESTAO_ID, estado: (corpo as any).p_acao === 'desfazer' ? 'desfeita' : (corpo as any).p_acao === 'editar' ? 'editada' : (corpo as any).p_acao === 'aplicar' ? 'aplicada' : 'pronta',
      texto_atual: (corpo as any).p_texto_editado ?? (corpo as any).p_texto_sugerido ?? 'A conta registrou 16 leads com investimento de R$ 1.200,00.', relatorio_checksum: CHECKSUM,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
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
  const modelo = chamadas.find((item) => item.url.includes('/v1/messages'));
  assert.ok(modelo, 'geração precisa chegar apenas ao Sonnet server-side');
  const contextoEnviado = JSON.stringify((modelo!.corpo as any).messages[0].content);
  assert.match(contextoEnviado, /Cliente Governado/);
  assert.match(contextoEnviado, /16/);
  assert.doesNotMatch(contextoEnviado, /outro-cliente|999999|caminhoLocal|segredo/i, 'browser e paths locais não entram no prompt');
  const rpc = chamadas.find((item) => item.url.includes('/rpc/'))!;
  assert.equal((rpc.corpo as any).p_por, 'revisor@exemplo.com');
  assert.equal((rpc.corpo as any).p_relatorio_id, ID);
  assert.ok((rpc.corpo as any).p_contexto_hash, 'a sugestão precisa ficar vinculada ao contexto relido');
}

{
  saidaSonnet = '{"texto":"A conta registrou 17 leads."}';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 422);
  assert.equal(resposta.corpo.erro, 'saida_numerica_invalida');
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/')), false, 'saída numérica inválida nunca é aplicável nem auditada como geração');
  saidaSonnet = '{"texto":"A conta registrou 16 leads com investimento de R$ 1.200,00."}';
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

delete process.env.ANTHROPIC_API_KEY;
const indisponivel = await chamarSonnetIntroducao(contexto!);
assert.equal(indisponivel.ok, false);
assert.equal(indisponivel.ok === false && indisponivel.erro, 'sonnet_indisponivel', 'sem segredo/modelo a rota falha fechada');
process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
globalThis.fetch = fetchOriginal;
console.log('OK — RA2: auth, isolamento client→backend, checksum, números, ações, auditoria e caneta restrita à revisão.');
