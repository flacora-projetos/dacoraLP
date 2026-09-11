import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizarCatalogo } from '../src/pages/data-hub-catalogo.ts';
import { ConsultaQueryV2 } from '../src/pages/data-hub-query-v2.tsx';
import {
  buscarEntradasCampoV2,
  construirEntradasCampoV2,
  grupoDoCampoV2,
} from '../src/pages/data-hub-field-picker-v2.ts';

const actionFields = [
  { key: 'action.video_view.count', label: 'Action Video View', category: 'actions_conversions', family: 'action', source: 'meta_insights_actions', sourceActionType: 'video_view', sourceProjection: 'count', valueType: 'number' },
  { key: 'action.video_view.value', label: 'Action Value Video View', category: 'actions_conversions', family: 'action', source: 'meta_insights_action_values', sourceActionType: 'video_view', sourceProjection: 'value', valueType: 'number' },
  { key: 'action.video_view.cost', label: 'Cost Per Action Video View', category: 'actions_conversions', family: 'action', source: 'meta_insights_cost_per_action_type', sourceActionType: 'video_view', sourceProjection: 'cost', valueType: 'number' },
] as const;

const catalogo = normalizarCatalogo({
  data: {
    accounts: [{ id: 'account-demo', name: 'Conta demonstração', isQueryable: true }],
    fields: [],
    granularities: ['day'],
    templates: [],
    queryEngineV2: {
      schemaVersion: '2.0.0-spike.2',
      executableFieldKeys: ['ad_name', 'insights.quality_ranking', 'spend'],
      discoverableFieldKeys: ['action.video_view.count', 'action.video_view.value', 'action.video_view.cost', 'insights.outbound_clicks'],
      fields: [
        { key: 'ad_name', label: 'Nome do anúncio', category: 'dimension', valueType: 'string' },
        { key: 'insights.quality_ranking', label: 'Quality Ranking', category: 'dimensions_structure', valueType: 'string' },
        { key: 'spend', label: 'Investimento', category: 'metric', valueType: 'number' },
        { key: 'insights.outbound_clicks', label: 'Outbound Clicks', category: 'metrics', valueType: 'number' },
        { key: 'creative.title', label: 'Título do criativo', category: 'creative', source: 'meta_creative_structure', valueType: 'string' },
        ...actionFields,
      ],
    },
  },
});

const video = catalogo.queryEngineV2?.fields.find(({ id }) => id === 'action.video_view.count');
assert.ok(video, 'fixture Action precisa sobreviver à normalização do catálogo');
assert.equal(video.sourceActionType, 'video_view', 'Portal precisa preservar sourceActionType publicado pelo Hub');
assert.equal(video.sourceProjection, 'count', 'Portal precisa preservar sourceProjection publicado pelo Hub');
assert.equal(video.family, 'action');
assert.equal(video.source, 'meta_insights_actions');

const fields = catalogo.queryEngineV2?.fields ?? [];
assert.equal(grupoDoCampoV2(fields.find(({ id }) => id === 'spend')!), 'performance');
assert.equal(grupoDoCampoV2(fields.find(({ id }) => id === 'ad_name')!), 'dimensions');
assert.equal(grupoDoCampoV2(fields.find(({ id }) => id === 'creative.title')!), 'creatives');
assert.equal(grupoDoCampoV2(video), 'actions');
assert.equal(
  grupoDoCampoV2({ id: 'actions', nome: 'actions', categoria: 'action_collection', valueType: 'json' }),
  'actions',
  'campo canônico de actions deve entrar no grupo humano sem depender de sourceActionType',
);

const entries = construirEntradasCampoV2(fields);
const groupedVideo = entries.find((entry) => entry.tipo === 'action' && entry.sourceActionType === 'video_view');
assert.ok(groupedVideo && groupedVideo.tipo === 'action', 'Actions com metadata real precisam virar grupo conceitual');
assert.equal(groupedVideo.label, 'Video View');
assert.deepEqual(groupedVideo.campos.map(({ sourceProjection }) => sourceProjection), ['count', 'value', 'cost']);
assert.equal(groupedVideo.campos.length, 3, 'grupo conceitual não pode inventar projeção fora do catálogo');
const canonicalActionEntry = construirEntradasCampoV2([
  { id: 'actions', nome: 'actions', categoria: 'action_collection', valueType: 'json' },
])[0];
assert.equal(canonicalActionEntry.tipo, 'field', 'Action canônico sem metadata não pode ser agrupado artificialmente');
assert.equal(canonicalActionEntry.grupo, 'actions');

const rankingEntries = construirEntradasCampoV2([
  { id: 'spending_limit', nome: 'Spending Limit', categoria: 'metrics', valueType: 'number' },
  { id: 'total_spend', nome: 'Total Spend', categoria: 'metrics', valueType: 'number' },
  { id: 'overspend_warning', nome: 'Overspend Warning', categoria: 'metrics', valueType: 'number' },
]);
assert.deepEqual(
  buscarEntradasCampoV2(rankingEntries, 'sp', null).map((entry) => entry.chave),
  ['spending_limit', 'total_spend', 'overspend_warning'],
  'ranking deve priorizar starts-with, depois início de palavra e só então substring',
);
assert.deepEqual(
  buscarEntradasCampoV2(entries, 'video_view', null).map((entry) => entry.chave),
  ['action:video_view'],
  'busca precisa considerar o ID técnico/sourceActionType',
);
assert.ok(buscarEntradasCampoV2(entries, 'metrics', null).length >= 1, 'busca precisa considerar categoria publicada');

const html = renderToStaticMarkup(createElement(ConsultaQueryV2, { catalogo, aoExecutar: async () => ({
  queryRunId: 'demo',
  result: { columns: [], rows: [], resolvedGrain: 'ad', sourceComplete: true, pagingComplete: true },
}) }));
assert.match(html, /placeholder="Busque uma métrica ou campo…"/);
assert.match(html, /role="combobox"/);
assert.match(html, /aria-autocomplete="list"/);
assert.match(html, /Discovery por consulta/);
assert.match(html, />0\/3</, 'limite de discovery precisa estar visível antes de qualquer erro');
assert.match(html, /Métricas de performance/);
assert.match(html, /Ações e conversões/);
assert.match(html, /Dimensões e estrutura/);
assert.match(html, /Criativos/);
assert.match(html, /Campos selecionados/);
assert.match(html, /Pronto/);
assert.doesNotMatch(html, /<fieldset[^>]*dch-query-v2__campos/, 'grade antiga de checkboxes não pode voltar');
assert.doesNotMatch(html, /Action Video View/, 'catálogo inteiro não deve ser renderizado quando o picker está fechado');

const source = fs.readFileSync(new URL('../src/pages/data-hub-query-v2.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/pages/data-hub.css', import.meta.url), 'utf8');
assert.match(source, /RESULTADO_LIMITE = 16/, 'resultados precisam de recorte explícito');
assert.match(source, /SELECAO_POR_PAGINA = 8/, 'seleção precisa evitar centenas de chips\/linhas simultâneas');
assert.match(source, /dch-field-picker__selected-order/, 'ordem de selectedFields precisa ficar visível na seleção');
assert.match(source, /role="listbox"/);
assert.match(source, /role="option"/);
assert.match(source, /aria-activedescendant/);
assert.match(source, /ArrowDown/);
assert.match(source, /ArrowUp/);
assert.match(source, /event\.key === 'Enter'/);
assert.match(source, /event\.key === 'Escape'/);
assert.match(source, /Remover \$\{campo\?\.nome \?\? id\}/, 'remoção precisa ter nome acessível');
assert.match(source, /selectedFields: readonly string\[\]/, 'contrato enviado ao backend continua selectedFields ordenado');
assert.match(css, /\.dch-field-picker__search-shell--open \{ position: fixed/, 'mobile precisa abrir o picker como sheet amplo');
assert.match(css, /:focus-visible/, 'controles customizados precisam de foco visível');
assert.match(css, /overscroll-behavior: contain/, 'sheet\/listbox precisa conter overscroll');

console.log('Field Picker V2: OK — search-first, ranking, grupos por metadata, Actions agrupadas, recorte, seleção e acessibilidade estrutural');
