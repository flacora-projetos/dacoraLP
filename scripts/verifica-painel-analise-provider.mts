import assert from 'node:assert/strict';
import { gerarAnaliseAssistida } from '../api/_painel-analise-provider.ts';

process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
process.env.MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER = 'flash,pro,sonnet';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY = 'segredo-deepseek-que-nao-pode-vazar';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_FLASH_MODEL = 'deepseek-v4-flash';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro';
process.env.ANTHROPIC_API_KEY = 'segredo-sonnet-que-nao-pode-vazar';
process.env.ANTHROPIC_MODEL_RA2 = 'claude-sonnet-5';

const contextoSensivel = `cliente-governado-${'contexto-grande '.repeat(12_000)}`;
const pedido = {
  operacao: 'introducao' as const,
  system: 'Responda com uma sugestao completa.',
  conteudo: contextoSensivel,
  interpretar: (texto: string) => texto.startsWith('COMPLETA:') ? texto : null,
};

function deepseek(texto = 'COMPLETA: DeepSeek encerrou a sugestao.', finishReason = 'stop') {
  return new Response(JSON.stringify({
    choices: [{ finish_reason: finishReason, message: { content: texto, reasoning_content: 'raciocinio que nunca deve sair do provider' } }],
    usage: { prompt_tokens: 1200, completion_tokens: 320, total_tokens: 1520, prompt_cache_hit_tokens: 100, completion_tokens_details: { reasoning_tokens: 90 }, cost: 0.000123 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function sonnet(texto = 'COMPLETA: Sonnet encerrou o fallback.', stopReason = 'end_turn') {
  return new Response(JSON.stringify({
    content: [{ type: 'text', text: texto }], stop_reason: stopReason,
    usage: { input_tokens: 800, output_tokens: 200, cache_read_input_tokens: 50 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

{
  const chamadas: Array<{ url: string; corpo: any }> = [];
  const eventos: Array<Record<string, unknown>> = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any, init?: RequestInit) => {
      chamadas.push({ url: String(entrada), corpo: JSON.parse(String(init?.body)) });
      return deepseek();
    }) as typeof fetch,
    telemetria: (evento) => eventos.push(evento),
  });
  assert.equal(resposta.ok, true);
  assert.equal(resposta.ok && resposta.provider, 'deepseek');
  assert.equal(resposta.ok && resposta.modeloAuditavel, 'automatico/deepseek/deepseek-v4-flash');
  assert.equal(chamadas.length, 1, 'Flash completo nao chama Pro nem Sonnet');
  assert.equal(chamadas[0].corpo.model, 'deepseek-v4-flash');
  assert.equal(chamadas[0].corpo.max_tokens, 16_384, 'o teto governado tem folga real sobre 1.600/4.000');
  assert.deepEqual(chamadas[0].corpo.thinking, { type: 'disabled' }, 'redação editorial não deve pagar latência de thinking por padrão');
  assert.equal('reasoning_effort' in chamadas[0].corpo, false, 'reasoning_effort não é enviado quando thinking está desabilitado');
  assert.equal(chamadas[0].corpo.messages[1].content.length, contextoSensivel.length, 'contexto grande chega inteiro ao provider');
  const log = JSON.stringify(eventos);
  assert.doesNotMatch(log, /cliente-governado|contexto-grande|raciocinio que nunca|segredo-deepseek|segredo-sonnet/);
  assert.match(log, /providerFinal.*deepseek/);
  assert.match(log, /deepseek-v4-flash/);
  assert.match(log, /"custoUsd":0.000123/);
}

{
  const chamadas: any[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (_entrada: any, init?: RequestInit) => {
      chamadas.push(JSON.parse(String(init?.body)));
      return chamadas.length === 1 ? deepseek('PARCIAL', 'length') : deepseek('COMPLETA: condensada e encerrada.');
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modelo, 'deepseek-v4-flash');
  assert.equal(chamadas.length, 2, 'length permite uma unica segunda tentativa do mesmo modelo');
  assert.match(chamadas[1].messages[0].content, /tentativa anterior/);
}

for (const [nome, primeira] of [
  ['http', () => new Response('{}', { status: 503 })],
  ['vazia', () => deepseek('', 'stop')],
  ['finish_reason', () => deepseek('texto bloqueado', 'content_filter')],
] as const) {
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (_entrada: any, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      return modelos.length === 1 ? primeira() : deepseek();
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modelo, 'deepseek-v4-pro', `${nome}: Pro precisa concluir o fallback 1`);
  assert.deepEqual(modelos, ['deepseek-v4-flash', 'deepseek-v4-pro']);
}

{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any, init?: RequestInit) => {
      if (String(entrada).includes('anthropic')) { modelos.push('sonnet'); return sonnet(); }
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      return new Response('{}', { status: 503 });
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.provider, 'sonnet', 'falha de Flash e Pro leva ao fallback 2');
  assert.deepEqual(modelos, ['deepseek-v4-flash', 'deepseek-v4-pro', 'sonnet']);
}

{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    timeoutMs: 5,
    fetch: (async (_entrada: any, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      if (modelos.length > 1) return deepseek();
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')), { once: true });
      });
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modelo, 'deepseek-v4-pro', 'timeout tecnico do Flash aciona Pro');
}

{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any, init?: RequestInit) => {
      if (String(entrada).includes('anthropic')) { modelos.push('sonnet'); return sonnet(); }
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      return deepseek('PARCIAL', 'length');
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.provider, 'sonnet');
  assert.deepEqual(modelos, ['deepseek-v4-flash', 'deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4-pro', 'sonnet'], 'cada DeepSeek tenta no maximo uma condensacao; nao ha loop');
}

{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (_entrada: any, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      return modelos.length === 1 ? deepseek('resposta estruturalmente incompleta') : deepseek();
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modelo, 'deepseek-v4-pro', 'saida incompleta do Flash nao e aceita nem persistivel');
}

{
  process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'sonnet';
  const urls: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any) => { urls.push(String(entrada)); return sonnet(); }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.provider, 'sonnet');
  assert.equal(urls.length, 1);
  assert.doesNotMatch(urls[0], /deepseek/, 'rollback operacional nao tenta DeepSeek');
  process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
}

{
  process.env.MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER = 'pro,sonnet';
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (_entrada: any, init?: RequestInit) => { const corpo = JSON.parse(String(init?.body)); modelos.push(corpo.model); return deepseek(); }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modelo, 'deepseek-v4-pro');
  assert.deepEqual(modelos, ['deepseek-v4-pro'], 'ordem pode ser revertida por env sem condicao por cliente');
  process.env.MONTHLY_REPORT_ANALYSIS_PROVIDER_ORDER = 'flash,pro,sonnet';
}

{
  const eventos: Array<Record<string, unknown>> = [];
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any, init?: RequestInit) => {
      if (String(entrada).includes('anthropic')) { modelos.push('sonnet'); return new Response('{}', { status: 529 }); }
      const corpo = JSON.parse(String(init?.body));
      modelos.push(corpo.model);
      return new Response('{}', { status: 500 });
    }) as typeof fetch,
    telemetria: (evento) => eventos.push(evento),
  });
  assert.equal(resposta.ok, false);
  assert.deepEqual(modelos, ['deepseek-v4-flash', 'deepseek-v4-pro', 'sonnet'], 'falha tripla termina sem nova tentativa');
  assert.match(JSON.stringify(eventos), /falha_cadeia/);
}


{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida({ ...pedido, modo: 'deepseek_flash' }, {
    fetch: (async (_entrada: any, init?: RequestInit) => { modelos.push(JSON.parse(String(init?.body)).model); return new Response('{}', { status: 500 }); }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok, false);
  assert.deepEqual(modelos, ['deepseek-v4-flash'], 'modo manual Flash nao usa Pro nem Sonnet como fallback');
}

{
  const modelos: string[] = [];
  const resposta = await gerarAnaliseAssistida({ ...pedido, modo: 'deepseek_pro' }, {
    fetch: (async (_entrada: any, init?: RequestInit) => { modelos.push(JSON.parse(String(init?.body)).model); return deepseek(); }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modeloAuditavel, 'deepseek_pro/deepseek/deepseek-v4-pro');
  assert.deepEqual(modelos, ['deepseek-v4-pro'], 'modo manual Pro chama somente o Pro');
}

{
  const urls: string[] = [];
  const resposta = await gerarAnaliseAssistida({ ...pedido, modo: 'sonnet' }, {
    fetch: (async (entrada: any) => { urls.push(String(entrada)); return sonnet(); }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.modeloAuditavel, 'sonnet/sonnet/claude-sonnet-5');
  assert.equal(urls.length, 1);
  assert.match(urls[0], /anthropic/, 'modo manual Sonnet nao tenta DeepSeek');
}

console.log('OK - provider mensal: Flash primario, Pro fallback 1, Sonnet fallback 2, condensacao limitada, rollback e telemetria segura.');
