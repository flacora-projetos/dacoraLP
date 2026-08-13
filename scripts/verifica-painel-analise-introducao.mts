import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-analise-introducao.ts';
import {
  chamarSonnetIntroducao,
  contextoDoSnapshot,
  extrairTextoAplicavel,
  lerPedidoEditorial,
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
assert.equal(extrairTextoAplicavel([{ type: 'text', text: 'Aqui está a resposta:\n{"texto":"Saída com preâmbulo."}' }]), 'Saída com preâmbulo.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '{"analise":"Saída em chave alternativa."}' }]), 'Saída em chave alternativa.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: 'Saída textual direta.' }]), 'Saída textual direta.');
assert.equal(extrairTextoAplicavel([{ type: 'text', text: '{"texto":"JSON truncado"' }]), '', 'estrutura JSON malformada continua recusada');
assert.match(JSON.stringify(contexto.leituraDoRelatorio), /critério de lead mais restrito/);
assert.equal(lerPedidoEditorial({ id: ID, checksum: CHECKSUM, acao: 'gerar', cliente_slug: 'outro', analysis_context: { inventado: true } }).ok, true);

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
process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
process.env.ANTHROPIC_MODEL_RA2 = 'claude-sonnet-5';

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
  assert.match(contextoEnviado, /critério de lead mais restrito/, 'o Sonnet precisa receber o que já está escrito nas demais leituras do relatório');
  assert.doesNotMatch(contextoEnviado, /outro-cliente|999999|caminhoLocal|segredo/i, 'browser e paths locais não entram no prompt');
  const rpc = chamadas.find((item) => item.url.includes('/rpc/'))!;
  assert.equal((rpc.corpo as any).p_por, 'revisor@exemplo.com');
  assert.equal((rpc.corpo as any).p_relatorio_id, ID);
  assert.ok((rpc.corpo as any).p_contexto_hash, 'a sugestão precisa ficar vinculada ao contexto relido');
}

{
  linhaDoBanco = linhaLegada;
  saidaSonnet = '```json\n{"texto":"Meta Ads registrou investimento de R$ 863,91 e 22 leads."}\n```';
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'gerar' });
  assert.equal(resposta.status, 200, 'relatório real anterior à RA1 com JSON cercado precisa chegar ao Sonnet');
  const modelo = chamadas.find((item) => item.url.includes('/v1/messages'))!;
  assert.match(JSON.stringify((modelo.corpo as any).messages[0].content), /863\.91|863,91/);
  assert.match(JSON.stringify((modelo.corpo as any).messages[0].content), /Campanha principal|pausada/, 'o Sonnet precisa receber as tabelas que o relatório apresenta');
  linhaDoBanco = linha();
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
  const resposta = await chamar(usuarioAutorizado, { id: ID, checksum: CHECKSUM, acao: 'editar', sugestaoId: SUGESTAO_ID, texto: 'A conta registrou 17 leads.' });
  assert.equal(resposta.status, 200, 'edição humana não pode ser bloqueada por regex numérica');
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
console.log('OK — RA2: auth, contexto editorial completo, saída livre do Sonnet, ações, auditoria e caneta restrita à revisão.');
