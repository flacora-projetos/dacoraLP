import assert from 'node:assert/strict';
import { gerarAnaliseAssistida } from '../api/_painel-analise-provider.ts';

process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY = 'segredo-deepseek-que-nao-pode-vazar';
process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MODEL = 'deepseek-v4-pro';
process.env.ANTHROPIC_API_KEY = 'segredo-sonnet-que-nao-pode-vazar';
process.env.ANTHROPIC_MODEL_RA2 = 'claude-sonnet-5';

const contextoSensivel = `cliente-governado-${'contexto-grande '.repeat(12_000)}`;
const pedido = {
  operacao: 'introducao' as const,
  system: 'Responda com uma sugestão completa.',
  conteudo: contextoSensivel,
  interpretar: (texto: string) => texto.startsWith('COMPLETA:') ? texto : null,
};

function deepseek(texto = 'COMPLETA: DeepSeek encerrou a sugestão.', finishReason = 'stop') {
  return new Response(JSON.stringify({
    choices: [{ finish_reason: finishReason, message: { content: texto, reasoning_content: 'raciocínio que nunca deve sair do provider' } }],
    usage: { prompt_tokens: 1200, completion_tokens: 320, total_tokens: 1520, prompt_cache_hit_tokens: 100, completion_tokens_details: { reasoning_tokens: 90 } },
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
  assert.equal(resposta.ok && resposta.modeloAuditavel, 'deepseek/deepseek-v4-pro');
  assert.equal(chamadas.length, 1, 'DeepSeek completo não chama Sonnet');
  assert.equal(chamadas[0].corpo.max_tokens, 16_384, 'o teto governado tem folga real sobre 1.600/4.000');
  assert.deepEqual(chamadas[0].corpo.thinking, { type: 'enabled' });
  assert.equal(chamadas[0].corpo.reasoning_effort, 'high');
  assert.equal(chamadas[0].corpo.messages[1].content.length, contextoSensivel.length, 'contexto grande chega inteiro ao provider');
  const log = JSON.stringify(eventos);
  assert.doesNotMatch(log, /cliente-governado|contexto-grande|raciocínio que nunca|segredo-deepseek|segredo-sonnet/);
  assert.match(log, /providerFinal.*deepseek/);
  assert.match(log, /"entrada":1200/);
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
  assert.equal(resposta.ok, true);
  assert.equal(resposta.ok && resposta.provider, 'deepseek');
  assert.equal(chamadas.length, 2, 'length permite uma única segunda tentativa DeepSeek');
  assert.match(chamadas[1].messages[0].content, /tentativa anterior alcançou o limite/);
}

for (const [nome, primeira] of [
  ['http', () => new Response('{}', { status: 503 })],
  ['vazia', () => deepseek('', 'stop')],
  ['finish_reason', () => deepseek('texto bloqueado', 'content_filter')],
] as const) {
  const urls: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async (entrada: any) => {
      urls.push(String(entrada));
      return urls.length === 1 ? primeira() : sonnet();
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok, true, `${nome}: fallback precisa concluir`);
  assert.equal(resposta.ok && resposta.provider, 'sonnet');
  assert.match(urls[0], /deepseek/);
  assert.match(urls[1], /anthropic/);
}

{
  const urls: string[] = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    timeoutMs: 5,
    fetch: (async (entrada: any, init?: RequestInit) => {
      urls.push(String(entrada));
      if (urls.length > 1) return sonnet();
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')), { once: true });
      });
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok, true);
  assert.equal(resposta.ok && resposta.provider, 'sonnet', 'timeout técnico aciona Sonnet');
}

{
  let chamada = 0;
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async () => {
      chamada += 1;
      if (chamada <= 2) return deepseek('PARCIAL', 'length');
      return sonnet();
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(chamada, 3, 'não existe loop: DeepSeek original + condensação + Sonnet');
  assert.equal(resposta.ok && resposta.provider, 'sonnet');
}

{
  let chamada = 0;
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async () => {
      chamada += 1;
      return chamada === 1 ? deepseek('resposta estruturalmente incompleta') : sonnet();
    }) as typeof fetch,
    telemetria() {},
  });
  assert.equal(resposta.ok && resposta.provider, 'sonnet', 'saída incompleta não é aceita nem persistível');
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
  assert.doesNotMatch(urls[0], /deepseek/, 'rollback operacional não tenta DeepSeek');
  process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER = 'deepseek';
}

{
  let chamada = 0;
  const eventos: Array<Record<string, unknown>> = [];
  const resposta = await gerarAnaliseAssistida(pedido, {
    fetch: (async () => { chamada += 1; return chamada === 1 ? new Response('{}', { status: 500 }) : new Response('{}', { status: 529 }); }) as typeof fetch,
    telemetria: (evento) => eventos.push(evento),
  });
  assert.equal(resposta.ok, false);
  assert.equal(chamada, 2, 'falha dupla termina sem nova tentativa');
  assert.match(JSON.stringify(eventos), /falha_dupla/);
}

console.log('OK — provider mensal: DeepSeek primário, condensação limitada, fallback Sonnet, rollback, falha dupla e telemetria segura.');
