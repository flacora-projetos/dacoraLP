import { createHash } from 'node:crypto';

export const ANALISE_PROMPT_VERSAO = 'ra2_introducao_v1';
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACOES = new Set(['gerar', 'aplicar', 'editar', 'desfazer']);
const NUMERO_NO_TEXTO = /(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?%?/g;

export type AcaoEditorial = 'gerar' | 'aplicar' | 'editar' | 'desfazer';
export interface PedidoEditorial { id: string; checksum: string; acao: AcaoEditorial; sugestaoId?: string; texto?: string; }
export interface LinhaAnalise { id: string; cliente_slug: string; competencia: string; versao: number; estado: string; checksum: string; substituido_por?: string | null; revogado_em?: string | null; conteudo: any; }

export function lerPedidoEditorial(bruto: unknown): { ok: true; pedido: PedidoEditorial } | { ok: false; erro: string; mensagem: string } {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação da análise está incompleta.' };
  const valor = bruto as Record<string, unknown>;
  const id = typeof valor.id === 'string' ? valor.id.trim() : '';
  const checksum = typeof valor.checksum === 'string' ? valor.checksum.trim() : '';
  const acao = typeof valor.acao === 'string' ? valor.acao.trim() : '';
  const sugestaoId = typeof valor.sugestaoId === 'string' ? valor.sugestaoId.trim() : undefined;
  const texto = typeof valor.texto === 'string' ? valor.texto.trim() : undefined;
  if (!UUID_VALIDO.test(id) || !checksum || checksum.length > 200 || !ACOES.has(acao)) return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação da análise não é válida.' };
  if (acao !== 'gerar' && !UUID_VALIDO.test(sugestaoId ?? '')) return { ok: false, erro: 'sugestao_invalida', mensagem: 'A sugestão não está vinculada a esta revisão.' };
  if (acao === 'editar' && (!texto || texto.length > 3500)) return { ok: false, erro: 'texto_invalido', mensagem: 'A edição da sugestão precisa ter até 3.500 caracteres.' };
  return { ok: true, pedido: { id, checksum, acao: acao as AcaoEditorial, sugestaoId, texto } };
}

export function introducaoDoSnapshot(linha: LinhaAnalise): string | null {
  const itens = linha.conteudo?.leitura?.resumoExecutivo;
  if (!Array.isArray(itens) || itens.length === 0) return null;
  const textos = itens.map((item: any) => typeof item?.texto === 'string' ? item.texto.trim() : '').filter(Boolean);
  return textos.length > 0 ? textos.join('\n\n') : null;
}

export function contextoDoSnapshot(linha: LinhaAnalise) {
  const contexto = linha.conteudo?.analysisContext;
  if (!contexto || contexto.versao !== 'analysis_context_v1' || !Array.isArray(contexto.fatos)) return null;
  const original = introducaoDoSnapshot(linha);
  if (!original) return null;
  const identidade = linha.conteudo?.identidade;
  if (!identidade || typeof identidade.clienteNome !== 'string') return null;
  return { versao: contexto.versao, identidade: { clienteNome: identidade.clienteNome, competencia: linha.competencia, tipoRelatorio: typeof identidade.tipoRelatorio === 'string' ? identidade.tipoRelatorio : null }, introducaoAtual: original, fatos: contexto.fatos, relacoes: Array.isArray(contexto.relacoes) ? contexto.relacoes : [], limitacoes: Array.isArray(contexto.limitacoes) ? contexto.limitacoes : [] };
}

export function hashDoContexto(contexto: unknown): string { return createHash('sha256').update(JSON.stringify(contexto)).digest('hex'); }

function numeroNormalizado(valor: string): number | null {
  const limpo = valor.replace(/R\$\s*/g, '').replace(/%/g, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

export function validarNumerosDaSugestao(texto: string, contexto: ReturnType<typeof contextoDoSnapshot>) {
  if (!contexto) return { ok: false as const, mensagem: 'O contexto factual desta versão não está disponível.' };
  const permitidos = new Set<number>();
  for (const trecho of contexto.identidade.competencia.match(/\d+/g) ?? []) permitidos.add(Number(trecho));
  for (const fato of contexto.fatos) {
    for (const valor of [fato?.atual, fato?.base]) if (typeof valor === 'number' && Number.isFinite(valor)) permitidos.add(Number(valor.toFixed(6)));
    if (typeof fato?.variacao === 'number' && Number.isFinite(fato.variacao)) { permitidos.add(Number(fato.variacao.toFixed(6))); permitidos.add(Number((fato.variacao * 100).toFixed(6))); }
  }
  const incompatíveis = (texto.match(NUMERO_NO_TEXTO) ?? []).filter((bruto) => {
    const valor = numeroNormalizado(bruto); return valor === null || !permitidos.has(Number(valor.toFixed(6)));
  });
  return incompatíveis.length === 0 ? { ok: true as const } : { ok: false as const, mensagem: 'A sugestão trouxe número sem correspondência no contexto factual.' };
}

export function validarLinhaParaAnalise(linha: LinhaAnalise | undefined, checksum: string) {
  if (!linha) return { ok: false as const, status: 404, erro: 'relatorio_nao_encontrado', mensagem: 'Este relatório não está disponível.' };
  if (linha.checksum !== checksum) return { ok: false as const, status: 409, erro: 'checksum_obsoleto', mensagem: 'Este relatório mudou desde que foi aberto. Reabra a revisão.' };
  if (linha.estado !== 'gerado' || linha.substituido_por || linha.revogado_em) return { ok: false as const, status: 409, erro: 'versao_fora_de_revisao', mensagem: 'Esta versão não aceita mais revisão assistida.' };
  return { ok: true as const };
}

export async function chamarSonnetIntroducao(contexto: NonNullable<ReturnType<typeof contextoDoSnapshot>>) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY ?? '').trim();
  const modelo = String(process.env.ANTHROPIC_MODEL_RA2 ?? '').trim();
  if (!apiKey || !modelo || !/^claude-sonnet-/i.test(modelo)) return { ok: false as const, status: 503, erro: 'sonnet_indisponivel', mensagem: 'A análise assistida ainda não está configurada com o Sonnet da revisão.' };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const resposta = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: modelo, max_tokens: 700, system: 'Você revisa somente a introdução de relatórios mensais em português do Brasil. Use exclusivamente os fatos e relações recebidos. Não invente causa, número, recomendação, cliente ou dado. Responda JSON estrito: {"texto":"..."}.', messages: [{ role: 'user', content: JSON.stringify(contexto) }] }), signal: controller.signal });
    if (!resposta.ok) return { ok: false as const, status: 502, erro: 'sonnet_falhou', mensagem: 'Não foi possível gerar a sugestão agora.' };
    const corpo = await resposta.json() as { content?: Array<{ type?: string; text?: string }> };
    const bruto = corpo.content?.find((item) => item.type === 'text')?.text?.trim() ?? '';
    let texto = ''; try { texto = String(JSON.parse(bruto)?.texto ?? '').trim(); } catch { /* resposta inválida abaixo */ }
    if (!texto || texto.length > 3500) return { ok: false as const, status: 422, erro: 'saida_invalida', mensagem: 'O modelo respondeu em formato não aplicável.' };
    const validacao = validarNumerosDaSugestao(texto, contexto);
    if (!validacao.ok) return { ok: false as const, status: 422, erro: 'saida_numerica_invalida', mensagem: validacao.mensagem };
    return { ok: true as const, modelo, texto };
  } catch (erro) {
    return { ok: false as const, status: 502, erro: 'sonnet_indisponivel', mensagem: erro instanceof Error && erro.name === 'AbortError' ? 'A análise demorou demais. Tente novamente.' : 'Não foi possível gerar a sugestão agora.' };
  } finally { clearTimeout(timeout); }
}
