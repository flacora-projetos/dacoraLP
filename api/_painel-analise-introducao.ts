import { createHash } from 'node:crypto';

export const ANALISE_PROMPT_VERSAO = 'ra2_introducao_v2_revisao_livre';
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACOES = new Set(['gerar', 'aplicar', 'editar', 'desfazer']);
const LIMIAR_RELEVANTE = 0.05;

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
  if (acao === 'editar' && !texto) return { ok: false, erro: 'texto_invalido', mensagem: 'A edição da sugestão não pode ficar vazia.' };
  return { ok: true, pedido: { id, checksum, acao: acao as AcaoEditorial, sugestaoId, texto } };
}

export function introducaoDoSnapshot(linha: LinhaAnalise): string | null {
  const itens = linha.conteudo?.leitura?.resumoExecutivo;
  if (!Array.isArray(itens) || itens.length === 0) return null;
  const textos = itens.map((item: any) => typeof item?.texto === 'string' ? item.texto.trim() : '').filter(Boolean);
  return textos.length > 0 ? textos.join('\n\n') : null;
}

function numeroFactual(valor: any): number | null {
  return valor?.estado === 'ok' && typeof valor.numero === 'number' && Number.isFinite(valor.numero)
    ? valor.numero
    : null;
}

function semanticaDaMetrica(id: string): string | null {
  if (id.includes('investimento')) return 'investimento';
  if (id.includes('impressoes')) return 'impressoes';
  if (id.includes('cliques')) return 'cliques';
  if (id.includes('cpm')) return 'cpm';
  if (id.includes('ctr')) return 'ctr';
  if (id.includes('cpc')) return 'cpc';
  if (id.includes('custo') && (id.includes('resultado') || id.includes('conversao'))) return 'custo_por_resultado';
  if (id.includes('taxa') && id.includes('conversao')) return 'taxa_de_conversao';
  if (id.includes('resultado') || id.includes('conversoes')) return 'resultado';
  return null;
}

function variacaoRelevante(variacao: unknown): variacao is number {
  return typeof variacao === 'number' && Number.isFinite(variacao) && Math.abs(variacao) >= LIMIAR_RELEVANTE;
}

function direcao(variacao: number): string {
  return variacao > 0 ? 'subiu' : 'caiu';
}

function percentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor);
}

function agruparPor<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  return itens.reduce((grupos, item) => {
    const valor = chave(item);
    const grupo = grupos.get(valor) ?? [];
    grupo.push(item);
    grupos.set(valor, grupo);
    return grupos;
  }, new Map<string, T[]>());
}

/** Compatibilidade para snapshots anteriores à RA1, sem alterar o documento imutável. */
function projetarContextoLegado(linha: LinhaAnalise) {
  const faixas = linha.conteudo?.dados?.faixas;
  if (!faixas || typeof faixas !== 'object' || Array.isArray(faixas)) return null;

  const fatos: any[] = [];
  const limitacoes: Array<{ id: string; motivo: string }> = [];
  for (const faixa of Object.values(faixas) as any[]) {
    const plataforma = typeof faixa?.id === 'string' ? faixa.id.replace(/^faixa_/, '') : 'desconhecida';
    if (!Array.isArray(faixa?.metricas)) continue;
    for (const metrica of faixa.metricas) {
      const id = typeof metrica?.id === 'string' ? metrica.id : '';
      const rotulo = typeof metrica?.rotulo === 'string' ? metrica.rotulo : '';
      const unidade = typeof metrica?.unidade === 'string' ? metrica.unidade : '';
      const atual = numeroFactual(metrica?.valor);
      const base = numeroFactual(metrica?.comparativo?.valorBase);
      const permitido = metrica?.comparativo?.permitido === true && base !== null;
      const tipo = semanticaDaMetrica(id);
      if (!id || !rotulo || !unidade || atual === null || !tipo) continue;
      fatos.push({
        id, plataforma, tipo, rotulo, unidade, atual,
        ...(permitido ? {
          competenciaBase: metrica.comparativo.competenciaBase,
          base,
          variacao: metrica.comparativo.variacao,
        } : {}),
      });
      if (!permitido) limitacoes.push({ id, motivo: 'comparacao_indisponivel' });
    }
  }
  if (fatos.length === 0) return null;

  const relacoes: any[] = [];
  for (const plataforma of [...new Set(fatos.map((fato) => fato.plataforma))]) {
    const daPlataforma = fatos.filter((fato) => fato.plataforma === plataforma);
    const porTipo = agruparPor(daPlataforma, (fato) => fato.tipo);
    for (const fato of daPlataforma.filter((item) => variacaoRelevante(item.variacao))) {
      relacoes.push({ tipo: fato.tipo, plataforma, sustentadaPor: [fato.id], texto: `${fato.rotulo} ${direcao(fato.variacao)} ${percentual(Math.abs(fato.variacao))} na comparação disponível.` });
    }
    for (const investimento of porTipo.get('investimento') ?? []) for (const resultado of porTipo.get('resultado') ?? []) {
      if (!variacaoRelevante(investimento.variacao) || !variacaoRelevante(resultado.variacao)) continue;
      relacoes.push({ tipo: 'investimento_resultado', plataforma, sustentadaPor: [investimento.id, resultado.id], texto: `Investimento ${direcao(investimento.variacao)} e ${resultado.rotulo.toLowerCase()} ${direcao(resultado.variacao)} na mesma comparação.` });
    }
    for (const cpm of porTipo.get('cpm') ?? []) for (const impressoes of porTipo.get('impressoes') ?? []) {
      if (!variacaoRelevante(cpm.variacao) || !variacaoRelevante(impressoes.variacao)) continue;
      relacoes.push({ tipo: 'cpm_entrega', plataforma, sustentadaPor: [cpm.id, impressoes.id], texto: `CPM ${direcao(cpm.variacao)} enquanto as impressões ${direcao(impressoes.variacao)}.` });
    }
    for (const ctr of porTipo.get('ctr') ?? []) for (const cpc of porTipo.get('cpc') ?? []) {
      if (!variacaoRelevante(ctr.variacao) || !variacaoRelevante(cpc.variacao)) continue;
      relacoes.push({ tipo: 'ctr_cpc', plataforma, sustentadaPor: [ctr.id, cpc.id], texto: `CTR ${direcao(ctr.variacao)} enquanto o CPC ${direcao(cpc.variacao)}.` });
    }
  }

  return { versao: 'analysis_context_v1', competencia: linha.competencia, fatos, relacoes, limitacoes };
}

export function contextoDoSnapshot(linha: LinhaAnalise) {
  const embutido = linha.conteudo?.analysisContext;
  const contexto = embutido?.versao === 'analysis_context_v1' && Array.isArray(embutido.fatos)
    ? embutido
    : projetarContextoLegado(linha);
  if (!contexto || contexto.versao !== 'analysis_context_v1' || !Array.isArray(contexto.fatos)) return null;
  const original = introducaoDoSnapshot(linha);
  if (!original) return null;
  const identidade = linha.conteudo?.identidade;
  if (!identidade || typeof identidade.clienteNome !== 'string') return null;
  const leitura = linha.conteudo?.leitura;
  const montagem = linha.conteudo?.montagem;
  const dados = linha.conteudo?.dados;
  return {
    versao: contexto.versao,
    identidade: { clienteNome: identidade.clienteNome, competencia: linha.competencia, tipoRelatorio: typeof identidade.tipoRelatorio === 'string' ? identidade.tipoRelatorio : null },
    introducaoAtual: original,
    leituraDoRelatorio: leitura && typeof leitura === 'object' ? {
      destaques: Array.isArray(leitura.destaques) ? leitura.destaques : [],
      atencao: Array.isArray(leitura.atencao) ? leitura.atencao : [],
      proximosPassos: Array.isArray(leitura.proximosPassos) ? leitura.proximosPassos : [],
    } : { destaques: [], atencao: [], proximosPassos: [] },
    secoesDoRelatorio: Array.isArray(montagem) ? montagem.map((secao: any) => ({
      id: typeof secao?.id === 'string' ? secao.id : null,
      titulo: typeof secao?.titulo === 'string' ? secao.titulo : null,
      apoio: typeof secao?.apoio === 'string' ? secao.apoio : null,
      pergunta: typeof secao?.pergunta === 'string' ? secao.pergunta : null,
    })) : [],
    dadosDoRelatorio: dados && typeof dados === 'object' ? {
      faixas: dados.faixas ?? {},
      tabelas: dados.tabelas ?? {},
      evolucoesMensais: dados.evolucoesMensais ?? {},
      quebras: dados.quebras ?? {},
      series: dados.series ?? {},
    } : {},
    fatos: contexto.fatos,
    relacoes: Array.isArray(contexto.relacoes) ? contexto.relacoes : [],
    limitacoes: Array.isArray(contexto.limitacoes) ? contexto.limitacoes : [],
  };
}

export function hashDoContexto(contexto: unknown): string { return createHash('sha256').update(JSON.stringify(contexto)).digest('hex'); }

export function extrairTextoAplicavel(blocos: Array<{ type?: string; text?: string }> | undefined): string {
  const candidatos = (blocos ?? [])
    .filter((bloco) => bloco?.type === 'text' && typeof bloco.text === 'string')
    .map((bloco) => bloco.text!.trim())
    .filter(Boolean);

  return candidatos.map((candidato) => {
    const semCerca = candidato
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const parsed = JSON.parse(semCerca);
      if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.texto === 'string' && parsed.texto.trim()) return parsed.texto.trim();
    } catch {
      // A resposta pode ser texto útil sem JSON válido; preserve-a para revisão humana.
    }
    return candidato;
  }).join('\n\n').trim();
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
    const resposta = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: modelo, max_tokens: 900, system: 'Você é um analista de performance revisando a introdução de um relatório mensal em português do Brasil. Leia a introdução atual, os fatos, as relações e as demais leituras já presentes no relatório. Produza uma introdução realmente útil ao cliente: conecte investimento, entrega, resultados e custos; investigue explicações e hipóteses sugeridas pelo material; quando algo for hipótese, escreva como possibilidade, não como fato confirmado. Não se limite a repetir que um indicador subiu ou caiu. Responda em texto puro, pronto para comparação e revisão humana. Não use JSON nem explique o formato da resposta.', messages: [{ role: 'user', content: JSON.stringify(contexto) }] }), signal: controller.signal });
    if (!resposta.ok) return { ok: false as const, status: 502, erro: 'sonnet_falhou', mensagem: 'Não foi possível gerar a sugestão agora.' };
    const corpo = await resposta.json() as { content?: Array<{ type?: string; text?: string }> };
    const texto = extrairTextoAplicavel(corpo.content);
    if (!texto) return { ok: false as const, status: 422, erro: 'saida_invalida', mensagem: 'O modelo não retornou texto para revisão.' };
    return { ok: true as const, modelo, texto };
  } catch (erro) {
    return { ok: false as const, status: 502, erro: 'sonnet_indisponivel', mensagem: erro instanceof Error && erro.name === 'AbortError' ? 'A análise demorou demais. Tente novamente.' : 'Não foi possível gerar a sugestão agora.' };
  } finally { clearTimeout(timeout); }
}
