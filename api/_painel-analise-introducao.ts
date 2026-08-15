import { createHash } from 'node:crypto';
import { gerarAnaliseAssistida, type ModoAnalise } from './_painel-analise-provider.js';

export const ANALISE_PROMPT_VERSAO = 'ra2_introducao_v4_janela_declarada';
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACOES = new Set(['gerar', 'aplicar', 'editar', 'desfazer']);
const MODOS_ANALISE = new Set<ModoAnalise>(['automatico', 'deepseek_flash', 'deepseek_pro', 'sonnet']);
const LIMIAR_RELEVANTE = 0.05;

export type AcaoEditorial = 'gerar' | 'aplicar' | 'editar' | 'desfazer';
export interface PedidoEditorial { id: string; checksum: string; acao: AcaoEditorial; sugestaoId?: string; texto?: string; modo?: ModoAnalise; }
export interface LinhaAnalise { id: string; cliente_slug: string; competencia: string; versao: number; estado: string; checksum: string; substituido_por?: string | null; revogado_em?: string | null; conteudo: any; }

export function lerPedidoEditorial(bruto: unknown): { ok: true; pedido: PedidoEditorial } | { ok: false; erro: string; mensagem: string } {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação da análise está incompleta.' };
  const valor = bruto as Record<string, unknown>;
  const id = typeof valor.id === 'string' ? valor.id.trim() : '';
  const checksum = typeof valor.checksum === 'string' ? valor.checksum.trim() : '';
  const acao = typeof valor.acao === 'string' ? valor.acao.trim() : '';
  const sugestaoId = typeof valor.sugestaoId === 'string' ? valor.sugestaoId.trim() : undefined;
  const texto = typeof valor.texto === 'string' ? valor.texto.trim() : undefined;
  const modoBruto = typeof valor.modo === 'string' ? valor.modo.trim() : undefined;
  if (!UUID_VALIDO.test(id) || !checksum || checksum.length > 200 || !ACOES.has(acao)) return { ok: false, erro: 'pedido_invalido', mensagem: 'A solicitação da análise não é válida.' };
  if (acao !== 'gerar' && !UUID_VALIDO.test(sugestaoId ?? '')) return { ok: false, erro: 'sugestao_invalida', mensagem: 'A sugestão não está vinculada a esta revisão.' };
  if (acao === 'editar' && !texto) return { ok: false, erro: 'texto_invalido', mensagem: 'A edição da sugestão não pode ficar vazia.' };
  if (modoBruto && !MODOS_ANALISE.has(modoBruto as ModoAnalise)) return { ok: false, erro: 'modo_invalido', mensagem: 'O modo de analise selecionado nao e valido.' };
  const modo = acao === 'gerar' ? (modoBruto as ModoAnalise | undefined) ?? 'automatico' : undefined;
  return { ok: true, pedido: { id, checksum, acao: acao as AcaoEditorial, sugestaoId, texto, modo } };
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

/**
 * A JANELA REAL DO DOCUMENTO, EM PORTUGUÊS, DENTRO DO CONTEXTO DA IA.
 *
 * O modelo recebia só `competencia: '2026-08'` e escrevia como se o mês
 * estivesse fechado — inclusive num rascunho gerado no dia 15, cobrindo
 * catorze dias. A página nunca errou: ela imprime `identidade.periodo`. Quem
 * não recebia o período era a IA, e o número que ela via ("investimento de
 * R$ 176,80") é metade de um mês, não um mês.
 *
 * As datas são FATO do documento, e a frase é derivada delas — não da
 * intenção de quem gerou. `emAndamento`/`temDiaFechado` só viajam quando o
 * snapshot os declara: documento anterior à cadência não os tem, e assumir
 * `false` seria afirmar "mês fechado" sobre algo que ninguém escreveu.
 *
 * ⚠️ Sem período declarado a frase diz isso e MANDA NÃO PRESUMIR mês inteiro.
 * Ausência aqui não pode virar "cobre tudo", que é a leitura confortável e
 * errada.
 */
function ultimoDiaDaCompetencia(competencia: string): string | null {
  const casa = /^(\d{4})-(\d{2})$/.exec(competencia ?? '');
  if (!casa) return null;
  const ano = Number(casa[1]);
  const mes = Number(casa[2]);
  if (mes < 1 || mes > 12) return null;
  const ultimo = new Date(Date.UTC(ano, mes, 0));
  return ultimo.toISOString().slice(0, 10);
}

function diaValido(valor: unknown): string | null {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
    ? valor
    : null;
}

function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function descreverJanelaDoRelatorio(identidade: any, competencia: string) {
  const periodo = identidade?.periodo;
  const inicio = diaValido(periodo?.inicio);
  const fim = diaValido(periodo?.fim);
  const declarados = {
    ...(typeof identidade?.emAndamento === 'boolean' ? { emAndamento: identidade.emAndamento } : {}),
    ...(typeof identidade?.temDiaFechado === 'boolean' ? { temDiaFechado: identidade.temDiaFechado } : {}),
  };

  if (!inicio || !fim) {
    return {
      declarada: false,
      ...declarados,
      texto:
        'O período coberto por este relatório não está declarado no documento. Não presuma que ele cobre o mês inteiro ' +
        'e não escreva nada que dependa de o mês estar fechado.',
    };
  }

  const dias = Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1;
  const ultimoDia = ultimoDiaDaCompetencia(competencia);
  const parcial = declarados.emAndamento === true || (ultimoDia !== null && fim < ultimoDia);
  const intervalo = `${formatarDia(inicio)} a ${formatarDia(fim)}`;

  return {
    declarada: true,
    inicio,
    fim,
    dias,
    parcial,
    ...declarados,
    texto: parcial
      ? `ATENÇÃO: este relatório é PARCIAL. Ele cobre ${intervalo}, ou seja ${dias} ${dias === 1 ? 'dia' : 'dias'} do mês, ` +
        'e não o mês inteiro — o mês ainda está em andamento e os números vão crescer até o fechamento. ' +
        'Todo número aqui é o acumulado até essa data. Não escreva "no mês", "o mês fechou", "no fim do mês" ' +
        'nem projete o resultado final; fale do período medido. A comparação, quando existir, já é contra o ' +
        'mesmo intervalo de dias do mês anterior, e não contra o mês anterior inteiro.'
      : `Este relatório cobre ${intervalo}, o mês fechado (${dias} dias).`,
  };
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
    identidade: {
      clienteNome: identidade.clienteNome,
      competencia: linha.competencia,
      tipoRelatorio: typeof identidade.tipoRelatorio === 'string' ? identidade.tipoRelatorio : null,
      janela: descreverJanelaDoRelatorio(identidade, linha.competencia),
    },
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
      funis: dados.funis ?? {},
      series: dados.series ?? {},
    } : {},
    resumoDoMes: contexto.resumoDoMes && typeof contexto.resumoDoMes === 'object'
      ? contexto.resumoDoMes
      : null,
    funilEcommerce: contexto.funilEcommerce && typeof contexto.funilEcommerce === 'object'
      ? contexto.funilEcommerce
      : null,
    funilLeadsMensagens: contexto.funilLeadsMensagens && typeof contexto.funilLeadsMensagens === 'object'
      ? contexto.funilLeadsMensagens
      : null,
    funilInstagram: contexto.funilInstagram && typeof contexto.funilInstagram === 'object'
      ? contexto.funilInstagram
      : null,
    fatos: contexto.fatos,
    relacoes: Array.isArray(contexto.relacoes) ? contexto.relacoes : [],
    limitacoes: Array.isArray(contexto.limitacoes) ? contexto.limitacoes : [],
  };
}

export function contextoDaIntroducaoComMes(contexto: NonNullable<ReturnType<typeof contextoDoSnapshot>>, contextoMes: string) {
  return { ...contexto, contextoDoMes: contextoMes.trim() };
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

export async function chamarAnaliseIntroducao(contexto: NonNullable<ReturnType<typeof contextoDoSnapshot>> & { contextoDoMes?: string }, modo: ModoAnalise = 'automatico') {
  const resposta = await gerarAnaliseAssistida({
    operacao: 'introducao',
    modo,
    system: 'Você é um analista de performance revisando a introdução de um relatório mensal em português do Brasil. Antes de qualquer coisa, leia "identidade.janela": ela diz o período exato que este documento cobre e se ele é parcial. Quando for parcial, o mês NÃO fechou — escreva sobre o período medido, nunca sobre "o mês", e não projete o resultado final. Leia a introdução atual, os fatos, as relações, o contexto interno do mês e as demais leituras já presentes no relatório. Produza um resumo básico, sucinto e direto ao ponto para o cliente. Selecione apenas os dois ou três achados mais importantes; use o contexto do mês quando ele ajudar a explicar ou qualificar um achado e não o ignore quando for material. Investigue somente relações ou hipóteses úteis para entendê-los e, quando algo for hipótese, escreva como possibilidade, não como fato confirmado. Não detalhe cada métrica ou tabela, não faça lista e evite encadear ideias por ponto e vírgula. Prefira frases curtas e poucos parágrafos completos. Responda em texto puro, pronto para comparação e revisão humana. Não use JSON nem explique o formato da resposta.',
    conteudo: JSON.stringify(contexto),
    interpretar: (texto) => extrairTextoAplicavel([{ type: 'text', text: texto }]) || null,
  });
  if (resposta.ok === false) return resposta;
  return { ok: true as const, modelo: resposta.modeloAuditavel, texto: resposta.resultado, provider: resposta.provider, finishReason: resposta.finishReason, uso: resposta.uso };
}
