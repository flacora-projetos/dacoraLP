import type { CampoQueryV2 } from './data-hub-catalogo';

export type GrupoCampoV2 = 'performance' | 'actions' | 'dimensions' | 'creatives';

export const GRUPOS_CAMPO_V2: readonly { id: GrupoCampoV2; nome: string; apoio: string }[] = [
  { id: 'performance', nome: 'Métricas de performance', apoio: 'Resultados, entrega, custo e taxas.' },
  { id: 'actions', nome: 'Ações e conversões', apoio: 'Eventos com quantidade, valor e custo quando publicados.' },
  { id: 'dimensions', nome: 'Dimensões e estrutura', apoio: 'Identidade, tempo, breakdowns e contexto da entrega.' },
  { id: 'creatives', nome: 'Criativos', apoio: 'Campos do anúncio e enriquecimento criativo.' },
];

export type EntradaCampoV2 =
  | { readonly tipo: 'field'; readonly chave: string; readonly campo: CampoQueryV2; readonly grupo: GrupoCampoV2 }
  | { readonly tipo: 'action'; readonly chave: string; readonly label: string; readonly sourceActionType: string; readonly campos: readonly CampoQueryV2[]; readonly grupo: 'actions' };

const ACTION_PROJECTIONS = new Set(['count', 'value', 'cost']);

export function normalizarTermoCampoV2(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function grupoDoCampoV2(field: CampoQueryV2): GrupoCampoV2 {
  const category = normalizarTermoCampoV2(field.categoria ?? '');
  const family = normalizarTermoCampoV2(field.family ?? '');
  const source = normalizarTermoCampoV2(field.source ?? '');

  if (field.sourceActionType || family === 'action' || category.includes('action') || category.includes('conversion')) return 'actions';
  if (category.includes('creative') || source.includes('creative')) return 'creatives';
  if (category.includes('metric') || category === 'derived' || category === 'passthrough') return 'performance';
  if (category.includes('dimension') || category.includes('structure') || category === 'identity' || category === 'breakdown') return 'dimensions';
  return field.valueType === 'number' ? 'performance' : 'dimensions';
}

function labelGrupoAcao(fields: readonly CampoQueryV2[], sourceActionType: string) {
  const preferred = [...fields].sort((left, right) => {
    const order = ['count', 'value', 'cost'];
    return order.indexOf(left.sourceProjection ?? '') - order.indexOf(right.sourceProjection ?? '');
  });
  for (const field of preferred) {
    if (field.sourceProjection === 'count' && /^action\s+/i.test(field.nome)) return field.nome.replace(/^action\s+/i, '').trim();
    if (field.sourceProjection === 'value' && /^action value\s+/i.test(field.nome)) return field.nome.replace(/^action value\s+/i, '').trim();
    if (field.sourceProjection === 'cost' && /^cost per action\s+/i.test(field.nome)) return field.nome.replace(/^cost per action\s+/i, '').trim();
  }
  return sourceActionType;
}

export function construirEntradasCampoV2(fields: readonly CampoQueryV2[]): readonly EntradaCampoV2[] {
  const actionGroups = new Map<string, CampoQueryV2[]>();
  const standalone: EntradaCampoV2[] = [];

  for (const field of fields) {
    const canGroup = typeof field.sourceActionType === 'string' && field.sourceActionType !== ''
      && typeof field.sourceProjection === 'string' && ACTION_PROJECTIONS.has(field.sourceProjection);
    if (canGroup && field.sourceActionType) {
      const current = actionGroups.get(field.sourceActionType) ?? [];
      current.push(field);
      actionGroups.set(field.sourceActionType, current);
      continue;
    }
    standalone.push({ tipo: 'field', chave: field.id, campo: field, grupo: grupoDoCampoV2(field) });
  }

  const grouped = [...actionGroups.entries()].map(([sourceActionType, actionFields]): EntradaCampoV2 => ({
    tipo: 'action',
    chave: `action:${sourceActionType}`,
    label: labelGrupoAcao(actionFields, sourceActionType),
    sourceActionType,
    campos: [...actionFields].sort((left, right) => ['count', 'value', 'cost'].indexOf(left.sourceProjection ?? '') - ['count', 'value', 'cost'].indexOf(right.sourceProjection ?? '')),
    grupo: 'actions',
  }));

  return [...standalone, ...grouped].sort((left, right) => {
    const labelLeft = left.tipo === 'action' ? left.label : left.campo.nome;
    const labelRight = right.tipo === 'action' ? right.label : right.campo.nome;
    return labelLeft.localeCompare(labelRight, 'pt-BR', { sensitivity: 'base' }) || left.chave.localeCompare(right.chave);
  });
}

function scoreText(value: string, term: string) {
  const normalized = normalizarTermoCampoV2(value);
  if (!normalized) return Number.POSITIVE_INFINITY;
  if (normalized === term) return 0;
  if (normalized.startsWith(term)) return 1;
  const words = normalized.split(/[^a-z0-9]+/u).filter(Boolean);
  if (words.some((word) => word.startsWith(term))) return 2;
  if (normalized.includes(term)) return 3;
  return Number.POSITIVE_INFINITY;
}

function searchableParts(entry: EntradaCampoV2) {
  if (entry.tipo === 'field') {
    return [entry.campo.nome, entry.campo.id, entry.campo.categoria ?? ''];
  }
  return [
    entry.label,
    entry.sourceActionType,
    ...entry.campos.flatMap((field) => [field.nome, field.id, field.categoria ?? '']),
  ];
}

export function scoreEntradaCampoV2(entry: EntradaCampoV2, query: string) {
  const terms = normalizarTermoCampoV2(query).split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return 0;
  const parts = searchableParts(entry);
  let total = 0;
  for (const term of terms) {
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < parts.length; index += 1) {
      const score = scoreText(parts[index], term);
      if (Number.isFinite(score)) best = Math.min(best, score * 10 + Math.min(index, 8));
    }
    if (!Number.isFinite(best)) return Number.POSITIVE_INFINITY;
    total += best;
  }
  return total;
}

export function buscarEntradasCampoV2(entries: readonly EntradaCampoV2[], query: string, grupo: GrupoCampoV2 | null) {
  const hasQuery = normalizarTermoCampoV2(query) !== '';
  return entries
    .filter((entry) => hasQuery || grupo == null || entry.grupo === grupo)
    .map((entry, index) => ({ entry, index, score: hasQuery ? scoreEntradaCampoV2(entry, query) : 0 }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ entry }) => entry);
}
