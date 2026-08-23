/*
 * Tipos e normalização do catálogo do Data Hub.
 *
 * O catálogo efetivo vem do BFF. As opções abaixo são somente fixture local
 * para regras puras e renderização sem sessão; não são usadas após o load.
 *
 * A normalização abaixo traduz o contrato público sem fabricar capacidades.
 */

export const CATALOGO_E_DEMONSTRATIVO = false;

export type NivelEntidade = 'conta' | 'campanha' | 'conjunto' | 'anuncio';

export type Conta = {
  readonly id: string;
  readonly nome: string;
  readonly disponivel?: boolean | null;
};

export type Campo = {
  readonly id: string;
  readonly nome: string;
  /*
   * Classificação que o HANDOFF do Data Hub exige carregar até o fim: somar
   * alcance de dois dias não dá o alcance do período, e CTR não se soma nunca.
   * A tela precisa dizer isso antes de o número existir, não depois.
   */
  readonly natureza: 'aditiva' | 'calculada' | 'nao-aditiva';
};

export type Breakdown = {
  readonly id: string;
  readonly nome: string;
  readonly niveisCompativeis: readonly NivelEntidade[];
  readonly valores?: readonly string[];
};

export type Granularidade = 'diaria' | 'semanal' | 'mensal' | 'periodo-inteiro' | 'personalizada';

export type Periodo = {
  readonly id: string;
  readonly nome: string;
  readonly dias: number;
};

export const CONTAS: readonly Conta[] = [
  { id: 'demo-001', nome: 'Conta de demonstração — Serviços' },
  { id: 'demo-002', nome: 'Conta de demonstração — Varejo' },
  { id: 'demo-003', nome: 'Conta de demonstração — Saúde' },
];

export const NIVEIS: readonly { id: NivelEntidade; nome: string }[] = [
  { id: 'conta', nome: 'Conta' },
  { id: 'campanha', nome: 'Campanha' },
  { id: 'conjunto', nome: 'Conjunto' },
  { id: 'anuncio', nome: 'Anúncio' },
];

export const CAMPOS: readonly Campo[] = [
  { id: 'spend', nome: 'Investimento', natureza: 'aditiva' },
  { id: 'impressions', nome: 'Impressões', natureza: 'aditiva' },
  { id: 'clicks', nome: 'Cliques', natureza: 'aditiva' },
  { id: 'reach', nome: 'Alcance', natureza: 'nao-aditiva' },
  { id: 'frequency', nome: 'Frequência', natureza: 'nao-aditiva' },
  { id: 'ctr', nome: 'CTR', natureza: 'calculada' },
  { id: 'cpc', nome: 'CPC', natureza: 'calculada' },
  { id: 'cpm', nome: 'CPM', natureza: 'calculada' },
];

export const BREAKDOWNS: readonly Breakdown[] = [
  { id: 'nenhum', nome: 'Sem breakdown', niveisCompativeis: ['conta', 'campanha', 'conjunto', 'anuncio'] },
  { id: 'demografico', nome: 'Idade e gênero', niveisCompativeis: ['campanha', 'conjunto', 'anuncio'] },
  { id: 'geografico', nome: 'Região', niveisCompativeis: ['campanha', 'conjunto', 'anuncio'] },
  { id: 'posicionamento', nome: 'Posicionamento e dispositivo', niveisCompativeis: ['conjunto', 'anuncio'] },
];

export const PERIODOS: readonly Periodo[] = [
  { id: 'ultimos-7', nome: 'Últimos 7 dias', dias: 7 },
  { id: 'ultimos-14', nome: 'Últimos 14 dias', dias: 14 },
  { id: 'ultimos-30', nome: 'Últimos 30 dias', dias: 30 },
  { id: 'ultimos-90', nome: 'Últimos 90 dias', dias: 90 },
];

export const GRANULARIDADES: readonly { id: Granularidade; nome: string; dias: number }[] = [
  { id: 'diaria', nome: 'Diária', dias: 1 },
  { id: 'semanal', nome: 'Semanal', dias: 7 },
  { id: 'mensal', nome: 'Mensal', dias: 30 },
];

export type Rascunho = {
  contaId: string;
  templateId: string;
  nivel: NivelEntidade;
  campos: readonly string[];
  breakdownId: string;
  periodoId: string;
  granularidade: Granularidade;
  granularidadeDias: number;
};

export type Template = {
  readonly id: string;
  readonly nome: string;
  readonly niveisCompativeis: readonly NivelEntidade[];
  readonly breakdownsCompativeis: readonly string[];
};
export type Catalogo = {
  readonly contas: readonly Conta[];
  readonly niveis: readonly { id: NivelEntidade; nome: string }[];
  readonly campos: readonly Campo[];
  readonly breakdowns: readonly Breakdown[];
  readonly periodos: readonly Periodo[];
  readonly granularidades: readonly { id: Granularidade; nome: string; dias: number }[];
  readonly templates: readonly Template[];
};

export const CATALOGO_PADRAO: Catalogo = {
  contas: CONTAS,
  niveis: NIVEIS,
  campos: CAMPOS,
  breakdowns: BREAKDOWNS,
  periodos: PERIODOS,
  granularidades: GRANULARIDADES,
  templates: [],
};

function lista<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }

function nivelDaApi(value: unknown): NivelEntidade | null {
  const id = typeof value === 'string' ? value : (value as any)?.id;
  return id === 'account' ? 'conta' : id === 'campaign' ? 'campanha' : id === 'adset' ? 'conjunto' : id === 'ad' ? 'anuncio' : null;
}

const NOMES: Record<string, string> = {
  spend: 'Investimento', impressions: 'Impressões', clicks: 'Cliques', reach: 'Alcance', frequency: 'Frequência',
  ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', campaign: 'Campanha', adset: 'Conjunto', ad: 'Anúncio', account: 'Conta',
  day: 'Diária', week: 'Semanal', month: 'Mensal', all_days: 'Período inteiro', custom: 'Personalizada', age: 'Idade', gender: 'Gênero', region: 'Região',
  publisher_platform: 'Plataforma', platform_position: 'Posicionamento', impression_device: 'Dispositivo',
};

/** Converte somente o envelope público do backend em opções de tela. */
export function normalizarCatalogo(payload: unknown): Catalogo {
  const raw: any = (payload as any)?.data ?? (payload as any)?.catalog ?? payload ?? {};
  const campos = lista<any>(raw.fields ?? raw.campos).map((item) => ({
    id: String(item.id ?? item.key ?? ''), nome: String(item.name ?? item.nome ?? item.label ?? NOMES[item.key] ?? item.id ?? item.key ?? ''),
    natureza: item.natureza ?? (item.classification === 'non_additive' ? 'nao-aditiva' : item.classification === 'calculated' ? 'calculada' : 'aditiva'),
  })).filter((item) => item.id && item.nome) as Campo[];
  const templates = lista<any>(raw.templates).map((item) => {
    const niveisCompativeis = lista<any>(item.entityLevels).map(nivelDaApi).filter(Boolean) as NivelEntidade[];
    const breakdownsCompativeis = lista<any[]>(item.breakdownSelections).map((selection) => selection.join('+'));
    return { id: String(item.id ?? item.key ?? item), nome: String(item.name ?? item.nome ?? item.id ?? item.key ?? item), niveisCompativeis, breakdownsCompativeis };
  }).filter((item) => item.id && item.nome) as Template[];
  const selecoes = new Map<string, Set<NivelEntidade>>();
  for (const template of templates) for (const selection of template.breakdownsCompativeis) {
    const niveis = selecoes.get(selection) ?? new Set<NivelEntidade>();
    template.niveisCompativeis.forEach((nivel) => niveis.add(nivel)); selecoes.set(selection, niveis);
  }
  const breakdowns: Breakdown[] = [{ id: 'nenhum', nome: 'Sem breakdown', valores: [], niveisCompativeis: ['conta', 'campanha', 'conjunto', 'anuncio'] }];
  for (const [id, niveis] of selecoes) if (id) breakdowns.push({ id, valores: id.split('+'), nome: id.split('+').map((value) => NOMES[value] ?? value).join(' e '), niveisCompativeis: [...niveis] });
  const contas = lista<any>(raw.accounts ?? raw.contas).map((item) => ({ id: String(item.id ?? item.accountId ?? ''), nome: String(item.name ?? item.nome ?? item.id ?? ''), disponivel: typeof item.isQueryable === 'boolean' ? item.isQueryable : null })).filter((item) => item.id && item.nome);
  const niveisPublicados = raw.entityLevels ?? raw.niveis ?? [...new Set(templates.flatMap((item) => item.niveisCompativeis.map((nivel) => nivel === 'conta' ? 'account' : nivel === 'campanha' ? 'campaign' : nivel === 'conjunto' ? 'adset' : 'ad')))];
  const niveis = lista<any>(niveisPublicados).map((item) => {
    const id = typeof item === 'string' ? item : item.id;
    const nivel = nivelDaApi(id); return { id: nivel as NivelEntidade, nome: NOMES[id] ?? (typeof item === 'string' ? item : item.name ?? id) };
  }).filter((item) => ['conta', 'campanha', 'conjunto', 'anuncio'].includes(item.id));
  const granularidades = lista<any>(raw.granularities ?? raw.granularidade).map((item) => {
    const id = typeof item === 'string' ? item : item.id;
    return { id: (id === 'day' ? 'diaria' : id === 'week' ? 'semanal' : id === 'month' ? 'mensal' : id === 'all_days' ? 'periodo-inteiro' : id === 'custom' ? 'personalizada' : id) as Granularidade, nome: NOMES[id] ?? (typeof item === 'string' ? id : item.name ?? id), dias: id === 'day' ? 1 : id === 'week' ? 7 : id === 'custom' ? 14 : id === 'all_days' ? 0 : 30 };
  }).filter((item) => ['diaria', 'semanal', 'mensal', 'periodo-inteiro', 'personalizada'].includes(item.id));
  const periodosRemotos = lista<any>(raw.periods ?? raw.periodos).map((item) => ({ id: String(item.id ?? item.key ?? ''), nome: String(item.name ?? item.nome ?? item.id ?? ''), dias: Number(item.days ?? item.dias ?? 0) })).filter((item) => item.id && item.nome && item.dias > 0);
  const periodos = periodosRemotos.length ? periodosRemotos : [...PERIODOS];
  return { contas, niveis, campos, breakdowns, periodos, granularidades, templates };
}

export const RASCUNHO_INICIAL: Rascunho = {
  contaId: '',
  templateId: '',
  nivel: 'campanha',
  campos: ['spend', 'impressions', 'clicks'],
  breakdownId: 'nenhum',
  periodoId: 'ultimos-7',
  granularidade: 'diaria',
  granularidadeDias: 14,
};

export type Impedimento = { readonly campo: string; readonly mensagem: string };

/*
 * Combinação incompatível falha com mensagem clara e acionável. Nunca há
 * fallback silencioso para uma opção "parecida": trocar a escolha do usuário
 * sem avisar produz número que ninguém consegue explicar depois.
 */
export function impedimentos(rascunho: Rascunho, catalogo: Catalogo = CATALOGO_PADRAO): readonly Impedimento[] {
  const lista: Impedimento[] = [];

  if (!rascunho.contaId) {
    lista.push({ campo: 'conta', mensagem: 'Escolha a conta de origem.' });
  }

  const template = catalogo.templates.find((item) => item.id === rascunho.templateId);
  if (catalogo.templates.length && !template) lista.push({ campo: 'template', mensagem: 'Escolha um modelo de extração.' });
  if (template && !template.niveisCompativeis.includes(rascunho.nivel)) lista.push({ campo: 'template', mensagem: 'O modelo escolhido não atende a este nível.' });
  if (template && rascunho.breakdownId !== 'nenhum' && !template.breakdownsCompativeis.includes(rascunho.breakdownId)) lista.push({ campo: 'breakdown', mensagem: 'O breakdown escolhido não é aceito por este modelo.' });

  if (rascunho.campos.length === 0) {
    lista.push({ campo: 'campos', mensagem: 'Escolha ao menos um campo para trazer.' });
  }

  const breakdown = catalogo.breakdowns.find((item) => item.id === rascunho.breakdownId);
  if (breakdown && !breakdown.niveisCompativeis.includes(rascunho.nivel)) {
    const nomeNivel = catalogo.niveis.find((item) => item.id === rascunho.nivel)?.nome ?? rascunho.nivel;
    const compativeis = breakdown.niveisCompativeis
      .map((nivel) => catalogo.niveis.find((item) => item.id === nivel)?.nome ?? nivel)
      .join(', ');
    lista.push({
      campo: 'breakdown',
      mensagem: `${breakdown.nome} não existe no nível ${nomeNivel}. Use ${compativeis}, ou volte para "Sem breakdown".`,
    });
  }

  const periodo = catalogo.periodos.find((item) => item.id === rascunho.periodoId);
  const granularidade = catalogo.granularidades.find((item) => item.id === rascunho.granularidade);
  const diasDoBalde = rascunho.granularidade === 'personalizada' ? rascunho.granularidadeDias : granularidade?.dias ?? 0;
  if (rascunho.granularidade === 'personalizada' && (!Number.isInteger(rascunho.granularidadeDias) || rascunho.granularidadeDias < 1 || rascunho.granularidadeDias > 90)) {
    lista.push({ campo: 'granularidade', mensagem: 'Escolha um intervalo personalizado entre 1 e 90 dias.' });
  } else if (periodo && granularidade && diasDoBalde > periodo.dias) {
    lista.push({
      campo: 'granularidade',
      mensagem: `Granularidade ${granularidade.nome.toLowerCase()} não cabe em ${periodo.nome.toLowerCase()}. Amplie o período ou use uma granularidade menor.`,
    });
  }

  return lista;
}

/*
 * Aviso é diferente de impedimento: a consulta é possível, mas grande. O
 * usuário decide, com a recomendação à vista. Bloquear aqui seria decidir por ele.
 */
export function avisoDeVolume(rascunho: Rascunho, catalogo: Catalogo = CATALOGO_PADRAO): string | null {
  const periodo = catalogo.periodos.find((item) => item.id === rascunho.periodoId);
  if (!periodo) return null;
  const detalhaPorDia = rascunho.granularidade === 'diaria';
  const temBreakdown = rascunho.breakdownId !== 'nenhum';
  const nivelFino = rascunho.nivel === 'anuncio' || rascunho.nivel === 'conjunto';
  if (periodo.dias >= 90 && detalhaPorDia && temBreakdown && nivelFino) {
    return 'Esta combinação gera muitas linhas: 90 dias, detalhe diário, breakdown e nível fino ao mesmo tempo. Considere dividir em períodos menores ou agendar uma atualização incremental.';
  }
  return null;
}

export function naturezaDosCamposEscolhidos(rascunho: Rascunho, catalogo: Catalogo = CATALOGO_PADRAO): readonly Campo[] {
  return catalogo.campos.filter((campo) => rascunho.campos.includes(campo.id));
}
