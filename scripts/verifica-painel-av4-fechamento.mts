import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/painel-retencao-editorial.ts';
import { traduzirErroDaFabrica } from '../api/_painel-envio-regras.ts';

const ID = '22222222-2222-4222-8222-222222222222';
const FECHAMENTO = '33333333-3333-4333-8333-333333333333';
const EMAIL = 'pessoa.autorizada@exemplo.com';

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = EMAIL;

const decisao = readFileSync(new URL('../api/painel-decisao.ts', import.meta.url), 'utf8');
const retencaoUi = readFileSync(new URL('../src/painel/RetencaoEditorial.tsx', import.meta.url), 'utf8');
const moldura = readFileSync(new URL('../src/painel/RevisaoMoldura.tsx', import.meta.url), 'utf8');

assert.match(decisao, /aprovar_e_fechar_relatorio_editorial/,
  'aprovação do portal precisa usar o RPC transacional AV4');
assert.match(decisao, /p_checksum_factual_visto:\s*checksumFactualParaFechamento/,
  'snapshot factual conferido no servidor precisa acompanhar o fechamento');
assert.match(retencaoUi, /DESCARTAR HISTORICO/,
  'descarte precisa de confirmação literal explícita');
assert.match(retencaoUi, /A análise final, o fechamento,[\s\S]*recibos de envio[\s\S]*auditoria mínima permanecem/i,
  'UI precisa explicar o que é preservado antes do descarte');
assert.match(moldura, /<RetencaoEditorial/,
  'relatório fechado precisa expor a política de retenção na bancada interna');

const traducao = traduzirErroDaFabrica('fechamento_editorial_pendente');
assert.equal(traducao.status, 409);
assert.match(traducao.mensagem, /fechamento editorial final/i);

const fetchOriginal = globalThis.fetch;
let chamadas: Array<{ url: string; corpo: any }> = [];
let descartado = false;

globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
  const url = String(entrada);
  if (url.includes('/auth/v1/user')) {
    return new Response(JSON.stringify({
      id: 'usuario-av4',
      email: EMAIL,
      app_metadata: { provider: 'google', providers: ['google'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const corpo = init?.body ? JSON.parse(String(init.body)) : null;
  chamadas.push({ url, corpo });
  if (url.includes('/rest/v1/relatorio_fechamentos_editoriais?')) {
    return new Response(JSON.stringify([{
      id: FECHAMENTO,
      relatorio_id: ID,
      politica_retencao: descartado ? 'descartar_historico' : 'arquivar',
      fechado_por: EMAIL,
      fechado_em: '2026-08-18T20:00:00Z',
      historico_descartado_por: descartado ? EMAIL : null,
      historico_descartado_em: descartado ? '2026-08-18T20:05:00Z' : null,
      historico_descartado_quantidade: descartado ? 3 : null,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/descartar_historico_editorial')) {
    assert.equal(corpo.p_fechamento_id, FECHAMENTO);
    assert.equal(corpo.p_por, EMAIL, 'ator vem da sessão, não do corpo do navegador');
    assert.equal(corpo.p_confirmacao, 'DESCARTAR HISTORICO');
    descartado = true;
    return new Response(JSON.stringify([{ fechamento_id: FECHAMENTO }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  throw new Error(`rota inesperada: ${url}`);
}) as typeof fetch;

function respostaFake() {
  const estado: { status: number; corpo: any; headers: Record<string, string> } = { status: 200, corpo: null, headers: {} };
  const res: any = {
    setHeader(nome: string, valor: string) { estado.headers[nome.toLowerCase()] = valor; },
    status(codigo: number) { estado.status = codigo; return res; },
    json(corpo: any) { estado.corpo = corpo; return res; },
  };
  return { res, estado };
}

async function chamar(method: 'GET' | 'POST', body?: any) {
  const { res, estado } = respostaFake();
  const req: any = {
    method,
    headers: { authorization: 'Bearer sessao-de-teste' },
    query: method === 'GET' ? { id: ID } : {},
    body,
  };
  await handler(req, res);
  return estado;
}

try {
  const leitura = await chamar('GET');
  assert.equal(leitura.status, 200);
  assert.equal(leitura.corpo.retencao.politica, 'arquivar');
  assert.equal('id' in leitura.corpo.retencao, false, 'id interno do fechamento não sai para o navegador');

  chamadas = [];
  const confirmacaoErrada = await chamar('POST', {
    id: ID,
    acao: 'descartar_historico',
    confirmacao: 'descartar',
    por: 'forjado@exemplo.com',
  });
  assert.equal(confirmacaoErrada.status, 400);
  assert.equal(chamadas.filter((c) => c.url.includes('/rpc/')).length, 0,
    'confirmação errada não pode chamar a RPC destrutiva');

  chamadas = [];
  const descarte = await chamar('POST', {
    id: ID,
    acao: 'descartar_historico',
    confirmacao: 'DESCARTAR HISTORICO',
    por: 'forjado@exemplo.com',
  });
  assert.equal(descarte.status, 200);
  assert.equal(descarte.corpo.retencao.politica, 'descartar_historico');
  assert.equal(descarte.corpo.retencao.historicoDescartadoQuantidade, 3);
  assert.equal(chamadas.filter((c) => c.url.includes('/rpc/descartar_historico_editorial')).length, 1);
  assert.equal(chamadas.filter((c) => c.url.includes('/relatorio_fechamentos_editoriais?')).length, 2,
    'POST faz leitura anterior e read-back posterior');
} finally {
  globalThis.fetch = fetchOriginal;
}

console.log('OK — AV4 portal: aprovação fecha atomicamente, envio exige fechamento e retenção arquiva por padrão com descarte separado, confirmado e auditado');
