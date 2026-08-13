import { createHash } from 'node:crypto';
import { contextoDoSnapshot, type LinhaAnalise } from './_painel-analise-introducao.js';
import { espacosAnaliticosDoSnapshot, type EspacoAnalitico } from '../src/reports/blocos/analise.js';

export const ANALISES_SECAO_PROMPT_VERSAO = 'ra3_secoes_v1_contexto_mes';
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECAO_VALIDA = /^bloco:[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const ACOES = new Set(['salvar_contexto', 'gerar_todas', 'gerar_secao', 'aplicar', 'editar', 'desfazer']);

export type AcaoAnaliseSecao = 'salvar_contexto' | 'gerar_todas' | 'gerar_secao' | 'aplicar' | 'editar' | 'desfazer';
export interface PedidoAnaliseSecao {
  id: string;
  checksum: string;
  acao: AcaoAnaliseSecao;
  secao?: string;
  sugestaoId?: string;
  texto?: string;
  contexto?: string;
}

export function lerPedidoAnaliseSecao(bruto: unknown):
  | { ok: true; pedido: PedidoAnaliseSecao }
  | { ok: false; erro: string; mensagem: string } {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação das análises está incompleta.' };
  }
  const valor = bruto as Record<string, unknown>;
  const id = typeof valor.id === 'string' ? valor.id.trim() : '';
  const checksum = typeof valor.checksum === 'string' ? valor.checksum.trim() : '';
  const acao = typeof valor.acao === 'string' ? valor.acao.trim() : '';
  const secao = typeof valor.secao === 'string' ? valor.secao.trim() : undefined;
  const sugestaoId = typeof valor.sugestaoId === 'string' ? valor.sugestaoId.trim() : undefined;
  const texto = typeof valor.texto === 'string' ? valor.texto.trim() : undefined;
  const contexto = typeof valor.contexto === 'string' ? valor.contexto.trim() : undefined;
  if (!UUID_VALIDO.test(id) || !checksum || checksum.length > 200 || !ACOES.has(acao)) {
    return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação das análises não é válida.' };
  }
  if (['gerar_secao', 'aplicar', 'editar', 'desfazer'].includes(acao) && !SECAO_VALIDA.test(secao ?? '')) {
    return { ok: false, erro: 'secao_invalida', mensagem: 'Esta seção não tem uma função analítica cadastrada.' };
  }
  if (['aplicar', 'editar', 'desfazer'].includes(acao) && !UUID_VALIDO.test(sugestaoId ?? '')) {
    return { ok: false, erro: 'sugestao_invalida', mensagem: 'A sugestão não está vinculada a esta revisão.' };
  }
  if (acao === 'editar' && !texto) {
    return { ok: false, erro: 'texto_invalido', mensagem: 'A edição da análise não pode ficar vazia.' };
  }
  return {
    ok: true,
    pedido: { id, checksum, acao: acao as AcaoAnaliseSecao, secao, sugestaoId, texto, contexto },
  };
}

export function contextoParaAnalises(linha: LinhaAnalise, contextoMes: string, secao?: string) {
  const base = contextoDoSnapshot(linha);
  if (!base) return null;
  const espacos = espacosAnaliticosDoSnapshot(linha.conteudo);
  const alvos = secao ? espacos.filter((espaco) => espaco.secao === secao) : espacos;
  if (alvos.length === 0) return null;
  return {
    versao: 'ra3_analysis_context_v1',
    identidade: base.identidade,
    introducaoAtual: base.introducaoAtual,
    leituraDoRelatorio: base.leituraDoRelatorio,
    fatos: base.fatos,
    relacoes: base.relacoes,
    limitacoes: base.limitacoes,
    contextoDoMes: contextoMes,
    espacosDoRelatorio: espacos,
    secoesAlvo: alvos.map(({ secao: chave, titulo, objetivo }) => ({ secao: chave, titulo, objetivo })),
  };
}

export function hashDoContextoAnalitico(contexto: unknown): string {
  return createHash('sha256').update(JSON.stringify(contexto)).digest('hex');
}

export function extrairAnalisesDoSonnet(
  blocos: Array<{ type?: string; text?: string }> | undefined,
  alvos: EspacoAnalitico[],
): Array<{ secao: string; texto: string }> | null {
  const bruto = (blocos ?? [])
    .filter((bloco) => bloco?.type === 'text' && typeof bloco.text === 'string')
    .map((bloco) => bloco.text!.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!bruto) return null;
  let analisado: unknown;
  try { analisado = JSON.parse(bruto); } catch { return null; }
  const itens = Array.isArray(analisado)
    ? analisado
    : analisado && typeof analisado === 'object' && Array.isArray((analisado as any).analises)
      ? (analisado as any).analises
      : null;
  if (!itens) return null;
  const esperadas = new Set(alvos.map((alvo) => alvo.secao));
  const vistas = new Set<string>();
  const analises: Array<{ secao: string; texto: string }> = [];
  for (const item of itens) {
    const secao = typeof item?.secao === 'string' ? item.secao.trim() : '';
    const texto = typeof item?.texto === 'string' ? item.texto.trim() : '';
    if (!esperadas.has(secao) || vistas.has(secao) || !texto) return null;
    vistas.add(secao);
    analises.push({ secao, texto });
  }
  return vistas.size === esperadas.size ? analises : null;
}

export async function chamarSonnetAnalises(
  contexto: NonNullable<ReturnType<typeof contextoParaAnalises>>,
) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY ?? '').trim();
  const modelo = String(process.env.ANTHROPIC_MODEL_RA3 ?? process.env.ANTHROPIC_MODEL_RA2 ?? '').trim();
  if (!apiKey || !modelo || !/^claude-sonnet-/i.test(modelo)) {
    return { ok: false as const, status: 503, erro: 'sonnet_indisponivel', mensagem: 'As análises assistidas ainda não estão configuradas com o Sonnet da revisão.' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 4000,
        system: 'Você é um analista de performance revisando as seções de um relatório mensal em português do Brasil. Leia o relatório inteiro, o contexto interno do mês e todos os espaços analíticos antes de escrever. Para cada seção-alvo, produza uma análise editorial breve e útil: investigue evidências e contexto para explicar o que importa, sem apenas narrar subida ou queda e sem repetir a tabela. Não invente causalidade; quando houver somente uma hipótese plausível, identifique-a como hipótese. Mantenha as análises coerentes entre si e com a introdução. Responda somente com JSON válido no formato {"analises":[{"secao":"bloco:id","texto":"análise"}]}, com exatamente uma entrada para cada seção-alvo. O texto não tem limite artificial de caracteres e não deve ser rejeitado por mencionar números.',
        messages: [{ role: 'user', content: JSON.stringify(contexto) }],
      }),
      signal: controller.signal,
    });
    if (!resposta.ok) return { ok: false as const, status: 502, erro: 'sonnet_falhou', mensagem: 'Não foi possível gerar as análises agora.' };
    const corpo = await resposta.json() as { content?: Array<{ type?: string; text?: string }>; stop_reason?: unknown; stop_sequence?: unknown };
    const stopReason = typeof corpo.stop_reason === 'string' ? corpo.stop_reason : 'desconhecido';
    if (stopReason !== 'end_turn') {
      console.warn(`[painel-analises-secao] provider_stop_reason=${stopReason}`);
      return { ok: false as const, status: 502, erro: stopReason === 'max_tokens' ? 'saida_truncada' : 'saida_incompleta', mensagem: 'O modelo não encerrou todas as análises. Nenhum texto foi salvo; tente novamente.' };
    }
    const alvos = contexto.secoesAlvo.map((alvo) => contexto.espacosDoRelatorio.find((item) => item.secao === alvo.secao)!).filter(Boolean);
    const analises = extrairAnalisesDoSonnet(corpo.content, alvos);
    if (!analises) return { ok: false as const, status: 422, erro: 'saida_invalida', mensagem: 'O modelo não retornou todas as análises esperadas. Nenhum texto foi salvo.' };
    return { ok: true as const, modelo, analises };
  } catch (erro) {
    return { ok: false as const, status: 502, erro: 'sonnet_indisponivel', mensagem: erro instanceof Error && erro.name === 'AbortError' ? 'A geração demorou demais. Nenhum texto foi salvo; tente novamente.' : 'Não foi possível gerar as análises agora.' };
  } finally {
    clearTimeout(timeout);
  }
}
