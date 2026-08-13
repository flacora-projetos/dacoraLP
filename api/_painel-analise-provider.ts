export type ProvedorAnalise = 'deepseek' | 'sonnet';

type UsoModelo = {
  entrada?: number;
  saida?: number;
  total?: number;
  cacheEntrada?: number;
  raciocinio?: number;
};

type FalhaProvider = {
  motivo: string;
  finishReason?: string;
  statusHttp?: number;
};

type RespostaProvider =
  | { ok: true; provider: ProvedorAnalise; modelo: string; texto: string; finishReason: string; uso?: UsoModelo }
  | { ok: false; provider: ProvedorAnalise; modelo: string; falha: FalhaProvider; uso?: UsoModelo };

export type PedidoAnaliseAssistida<T> = {
  operacao: 'introducao' | 'secoes';
  system: string;
  conteudo: string;
  interpretar: (texto: string) => T | null;
};

export type ResultadoAnaliseAssistida<T> =
  | { ok: true; provider: ProvedorAnalise; modelo: string; modeloAuditavel: string; resultado: T; finishReason: string; uso?: UsoModelo }
  | { ok: false; status: number; erro: string; mensagem: string };

type Dependencias = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  agora?: () => number;
  telemetria?: (evento: Record<string, unknown>) => void;
};

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const SONNET_URL = 'https://api.anthropic.com/v1/messages';
const DEEPSEEK_MAX_TOKENS_PADRAO = 16_384;
const SONNET_MAX_TOKENS_PADRAO = 4_000;
const TIMEOUT_MS_PADRAO = 50_000;

function inteiroDoEnv(nome: string, padrao: number, minimo: number, maximo: number): number {
  const valor = Number(process.env[nome]);
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : padrao;
}

function provedorPrimario(): ProvedorAnalise {
  return String(process.env.MONTHLY_REPORT_ANALYSIS_PRIMARY_PROVIDER ?? 'deepseek').trim().toLowerCase() === 'sonnet'
    ? 'sonnet'
    : 'deepseek';
}

function modeloSonnet(operacao: PedidoAnaliseAssistida<unknown>['operacao']): string {
  return String(
    operacao === 'secoes'
      ? process.env.ANTHROPIC_MODEL_RA3 ?? process.env.ANTHROPIC_MODEL_RA2 ?? ''
      : process.env.ANTHROPIC_MODEL_RA2 ?? '',
  ).trim();
}

function usoDeepSeek(bruto: any): UsoModelo | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const uso: UsoModelo = {};
  if (Number.isFinite(bruto.prompt_tokens)) uso.entrada = bruto.prompt_tokens;
  if (Number.isFinite(bruto.completion_tokens)) uso.saida = bruto.completion_tokens;
  if (Number.isFinite(bruto.total_tokens)) uso.total = bruto.total_tokens;
  if (Number.isFinite(bruto.prompt_cache_hit_tokens)) uso.cacheEntrada = bruto.prompt_cache_hit_tokens;
  if (Number.isFinite(bruto.completion_tokens_details?.reasoning_tokens)) uso.raciocinio = bruto.completion_tokens_details.reasoning_tokens;
  return Object.keys(uso).length > 0 ? uso : undefined;
}

function usoSonnet(bruto: any): UsoModelo | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const uso: UsoModelo = {};
  if (Number.isFinite(bruto.input_tokens)) uso.entrada = bruto.input_tokens;
  if (Number.isFinite(bruto.output_tokens)) uso.saida = bruto.output_tokens;
  if (Number.isFinite(uso.entrada) && Number.isFinite(uso.saida)) uso.total = uso.entrada! + uso.saida!;
  if (Number.isFinite(bruto.cache_read_input_tokens)) uso.cacheEntrada = bruto.cache_read_input_tokens;
  return Object.keys(uso).length > 0 ? uso : undefined;
}

async function comTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function chamarDeepSeek(
  pedido: PedidoAnaliseAssistida<unknown>,
  condensar: boolean,
  deps: Required<Pick<Dependencias, 'fetch' | 'timeoutMs'>>,
): Promise<RespostaProvider> {
  const apiKey = String(process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_API_KEY ?? '').trim();
  const modelo = String(process.env.MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MODEL ?? '').trim();
  if (!apiKey || !modelo) return { ok: false, provider: 'deepseek', modelo: modelo || 'nao_configurado', falha: { motivo: 'configuracao_indisponivel' } };

  const maxTokens = inteiroDoEnv('MONTHLY_REPORT_ANALYSIS_DEEPSEEK_MAX_TOKENS', DEEPSEEK_MAX_TOKENS_PADRAO, 4_096, 65_536);
  const system = condensar
    ? `${pedido.system}\n\nA tentativa anterior alcançou o limite de saída. Refaça desde o início de forma mais condensada, preserve todos os itens obrigatórios e encerre a resposta completa.`
    : pedido.system;
  try {
    const resposta = await comTimeout(deps.fetch, DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelo,
        max_tokens: maxTokens,
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
        messages: [{ role: 'system', content: system }, { role: 'user', content: pedido.conteudo }],
      }),
    }, deps.timeoutMs);
    if (!resposta.ok) return { ok: false, provider: 'deepseek', modelo, falha: { motivo: 'http', statusHttp: resposta.status } };
    const corpo = await resposta.json() as any;
    const escolha = Array.isArray(corpo?.choices) ? corpo.choices[0] : null;
    const finishReason = typeof escolha?.finish_reason === 'string' ? escolha.finish_reason : 'desconhecido';
    const texto = typeof escolha?.message?.content === 'string' ? escolha.message.content.trim() : '';
    const uso = usoDeepSeek(corpo?.usage);
    if (finishReason !== 'stop') return { ok: false, provider: 'deepseek', modelo, falha: { motivo: 'finish_reason', finishReason }, uso };
    if (!texto) return { ok: false, provider: 'deepseek', modelo, falha: { motivo: 'resposta_vazia', finishReason }, uso };
    return { ok: true, provider: 'deepseek', modelo, texto, finishReason, uso };
  } catch (erro) {
    return { ok: false, provider: 'deepseek', modelo, falha: { motivo: erro instanceof Error && erro.name === 'AbortError' ? 'timeout' : 'rede_ou_resposta_invalida' } };
  }
}

async function chamarSonnet(
  pedido: PedidoAnaliseAssistida<unknown>,
  deps: Required<Pick<Dependencias, 'fetch' | 'timeoutMs'>>,
): Promise<RespostaProvider> {
  const apiKey = String(process.env.ANTHROPIC_API_KEY ?? '').trim();
  const modelo = modeloSonnet(pedido.operacao);
  if (!apiKey || !/^claude-sonnet-/i.test(modelo)) return { ok: false, provider: 'sonnet', modelo: modelo || 'nao_configurado', falha: { motivo: 'configuracao_indisponivel' } };
  const maxTokens = inteiroDoEnv('MONTHLY_REPORT_ANALYSIS_SONNET_MAX_TOKENS', SONNET_MAX_TOKENS_PADRAO, 1_600, 16_384);
  try {
    const resposta = await comTimeout(deps.fetch, SONNET_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelo, max_tokens: maxTokens, system: pedido.system, messages: [{ role: 'user', content: pedido.conteudo }] }),
    }, deps.timeoutMs);
    if (!resposta.ok) return { ok: false, provider: 'sonnet', modelo, falha: { motivo: 'http', statusHttp: resposta.status } };
    const corpo = await resposta.json() as any;
    const finishReason = typeof corpo?.stop_reason === 'string' ? corpo.stop_reason : 'desconhecido';
    const uso = usoSonnet(corpo?.usage);
    if (finishReason !== 'end_turn') return { ok: false, provider: 'sonnet', modelo, falha: { motivo: 'finish_reason', finishReason }, uso };
    const texto = (Array.isArray(corpo?.content) ? corpo.content : [])
      .filter((bloco: any) => bloco?.type === 'text' && typeof bloco.text === 'string')
      .map((bloco: any) => bloco.text.trim())
      .filter(Boolean)
      .join('\n\n');
    if (!texto) return { ok: false, provider: 'sonnet', modelo, falha: { motivo: 'resposta_vazia', finishReason }, uso };
    return { ok: true, provider: 'sonnet', modelo, texto, finishReason, uso };
  } catch (erro) {
    return { ok: false, provider: 'sonnet', modelo, falha: { motivo: erro instanceof Error && erro.name === 'AbortError' ? 'timeout' : 'rede_ou_resposta_invalida' } };
  }
}

function eventoDaTentativa(
  resposta: RespostaProvider,
  pedido: PedidoAnaliseAssistida<unknown>,
  tentativa: number,
  latenciaMs: number,
  fallbackMotivo?: string,
) {
  if (resposta.ok === false) {
    return {
      evento: 'monthly_report_analysis_provider_attempt',
      operacao: pedido.operacao,
      tentativa,
      providerTentado: resposta.provider,
      modelo: resposta.modelo,
      finishReason: resposta.falha.finishReason ?? null,
      latenciaMs,
      uso: resposta.uso ?? null,
      resultado: 'falha',
      motivo: resposta.falha.motivo,
      statusHttp: resposta.falha.statusHttp ?? null,
      fallbackMotivo: fallbackMotivo ?? null,
    };
  }
  return {
    evento: 'monthly_report_analysis_provider_attempt',
    operacao: pedido.operacao,
    tentativa,
    providerTentado: resposta.provider,
    modelo: resposta.modelo,
    finishReason: resposta.finishReason,
    latenciaMs,
    uso: resposta.uso ?? null,
    resultado: 'completo',
    motivo: null,
    statusHttp: null,
    fallbackMotivo: fallbackMotivo ?? null,
  };
}

export async function gerarAnaliseAssistida<T>(
  pedido: PedidoAnaliseAssistida<T>,
  dependencias: Dependencias = {},
): Promise<ResultadoAnaliseAssistida<T>> {
  const fetchFn = dependencias.fetch ?? fetch;
  const timeoutMs = dependencias.timeoutMs ?? inteiroDoEnv('MONTHLY_REPORT_ANALYSIS_PROVIDER_TIMEOUT_MS', TIMEOUT_MS_PADRAO, 5_000, 90_000);
  const agora = dependencias.agora ?? Date.now;
  const telemetria = dependencias.telemetria ?? ((evento: Record<string, unknown>) => console.info(JSON.stringify(evento)));
  const deps = { fetch: fetchFn, timeoutMs };
  const primario = provedorPrimario();
  const ordem: ProvedorAnalise[] = primario === 'deepseek' ? ['deepseek', 'sonnet'] : ['sonnet'];
  let tentativa = 0;
  let motivoFallback: string | undefined;

  for (const provider of ordem) {
    const maxTentativas = provider === 'deepseek' ? 2 : 1;
    for (let indice = 0; indice < maxTentativas; indice += 1) {
      tentativa += 1;
      const inicio = agora();
      const resposta = provider === 'deepseek'
        ? await chamarDeepSeek(pedido, indice === 1, deps)
        : await chamarSonnet(pedido, deps);
      const latenciaMs = Math.max(0, agora() - inicio);
      telemetria(eventoDaTentativa(resposta, pedido, tentativa, latenciaMs, motivoFallback));

      if (resposta.ok === true) {
        const resultado = pedido.interpretar(resposta.texto);
        if (resultado !== null) {
          telemetria({
            evento: 'monthly_report_analysis_provider_final',
            operacao: pedido.operacao,
            providerFinal: resposta.provider,
            modelo: resposta.modelo,
            finishReason: resposta.finishReason,
            latenciaMs,
            uso: resposta.uso ?? null,
            fallbackMotivo: motivoFallback ?? null,
          });
          return { ok: true, provider: resposta.provider, modelo: resposta.modelo, modeloAuditavel: `${resposta.provider}/${resposta.modelo}`, resultado, finishReason: resposta.finishReason, uso: resposta.uso };
        }
        motivoFallback = `${provider}:resposta_incompleta`;
        telemetria({ evento: 'monthly_report_analysis_provider_validation', operacao: pedido.operacao, providerTentado: provider, modelo: resposta.modelo, resultado: 'incompleto', fallbackMotivo: motivoFallback });
        break;
      }

      const falha = resposta.falha;
      motivoFallback = `${provider}:${falha.motivo}${falha.finishReason ? `:${falha.finishReason}` : ''}`;
      const deveCondensar = provider === 'deepseek' && indice === 0 && falha.motivo === 'finish_reason' && falha.finishReason === 'length';
      if (!deveCondensar) break;
    }
  }

  telemetria({ evento: 'monthly_report_analysis_provider_final', operacao: pedido.operacao, providerFinal: null, resultado: 'falha_dupla', fallbackMotivo: motivoFallback ?? null });
  return {
    ok: false,
    status: 502,
    erro: 'analise_indisponivel',
    mensagem: 'Nenhum provedor encerrou uma sugestão completa. Nenhum texto foi salvo; tente novamente.',
  };
}
