/*
 * PWI1 — casca e protótipo local do Data Hub.
 *
 * Trava as regras de produto da tela antes de existir backend por trás dela:
 * catálogo é controlado, combinação impossível é recusada com motivo, consulta
 * grande avisa em vez de bloquear, e a lista vazia explica a causa.
 *
 * Nenhum nome, ID ou número real de cliente entra neste arquivo.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { act, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { JSDOM } from 'jsdom';
import { CriadorDeExtracao, ListaDeExtracoes } from '../src/pages/data-hub-extracoes.tsx';
import { validarAceiteExecucao } from '../src/pages/data-hub-execucao.ts';
import {
  BREAKDOWNS,
  CAMPOS,
  CATALOGO_PADRAO,
  CONTAS,
  RASCUNHO_INICIAL,
  normalizarCatalogo,
  avisoDeVolume,
  impedimentos,
  filtrarCampos,
  aplicarPreset,
  campoDisponivelNaCombinacao,
  nivelResolvidoDoRascunho,
  preservarGraoLegadoNosCampos,
  selectedFieldsDoRascunho,
  sanearCamposDoCatalogo,
  naturezaDosCamposEscolhidos,
  type Rascunho,
} from '../src/pages/data-hub-catalogo.ts';

const base: Rascunho = { ...RASCUNHO_INICIAL, contaId: CONTAS[0].id };
assert.deepEqual(filtrarCampos([
  { id: 'reach', nome: 'Alcance', natureza: 'nao-aditiva', descricao: 'Pessoas únicas' },
  { id: 'spend', nome: 'Investimento', natureza: 'aditiva', descricao: 'Valor gasto' },
], 'unicas').map((campo) => campo.id), ['reach'], 'busca deve considerar descrição e ignorar acentos');

{
  const hash = 'a'.repeat(64);
  const requestId = '5ad667de-d988-5d2d-8e60-f953ea1521a4';
  assert.deepEqual(validarAceiteExecucao(202, { data: { status: 'accepted', occurrenceId: hash,
    exportKey: hash, workUnits: 2 }, requestId }), { occurrenceId: hash, requestId });
  for (const [status, body] of [[200, { data: { status: 'accepted' } }], [202, {}],
    [202, { data: { status: 'accepted', occurrenceId: 'curta', exportKey: hash, workUnits: 2 }, requestId }],
    [202, { data: { status: 'accepted', occurrenceId: hash, exportKey: hash, workUnits: 2 }, requestId: hash }]]) {
    assert.throws(() => validarAceiteExecucao(status as number, body), /não confirmou/);
  }
}

/* A PWI2 recebe o envelope efetivo do BFF e preserva IDs e compatibilidades. */
{
  const real = normalizarCatalogo({ data: {
    accounts: [{ id: 'acct-from-backend', name: 'Conta autorizada', isQueryable: true }, { id: 'acct-unknown', name: 'Conta sem sondagem', isQueryable: null }],
    fields: [{ key: 'spend', classification: 'additive', description: 'Valor investido', example: 'R$ 120,00' }, { key: 'reach', classification: 'non_additive' },
      { key: 'conversions', label: 'Conversões', classification: 'attribution_sensitive', aggregation: 'attribution_sensitive', availability: {
        combinations: [{ entityLevels: ['campaign'], breakdownSelections: [[]] },
          { entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['age', 'gender']] }],
      } },
      { key: 'instagram_profile_visits', label: 'Visitas ao perfil do Instagram', aggregation: 'attribution_sensitive', availability: {
        combinations: [{ entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['age', 'gender']] }],
      } }],
    creativeFields: [{ key: 'thumbnail_url', name: 'Miniatura', description: 'URL da imagem de prévia' }],
    breakdowns: ['age', 'gender'], granularities: ['day', 'week', 'month', 'all_days', 'custom'],
    templates: [
      { key: 'meta_campaign_daily', entityLevels: ['account', 'campaign'], breakdownSelections: [[]],
        fields: ['spend', 'conversions', 'instagram_profile_visits'], creativeFields: [] },
      { key: 'meta_adset_ad_daily', entityLevels: ['adset', 'ad'], breakdownSelections: [[]], fields: ['spend', 'reach'], creativeFields: [] },
      { key: 'meta_creative_performance', entityLevels: ['ad'], breakdownSelections: [[]], fields: ['spend'], creativeFields: ['thumbnail_url'] },
      { key: 'meta_demographics', entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['age', 'gender']] },
    ],
  } });
  assert.equal(real.contas[0].id, 'acct-from-backend');
  assert.equal(real.contas[0].disponivel, true);
  assert.equal(real.contas[1].disponivel, null, 'null não pode virar true nem zero');
  assert.equal(real.campos[0].natureza, 'aditiva');
  assert.equal(real.campos[1].natureza, 'nao-aditiva');
  assert.equal(real.campos[2].natureza, 'sensivel-atribuicao', 'atribuição sensível não pode virar aditiva');
  assert.equal(real.campos[3].natureza, 'sensivel-atribuicao', 'aggregation também preserva a natureza quando classification faltar');
  assert.equal(real.campos[2].nome, 'Conversões');
  assert.equal(real.campos[3].nome, 'Visitas ao perfil do Instagram');
  assert.equal(campoDisponivelNaCombinacao(real.campos[2], { ...base, nivel: 'campanha', breakdownId: 'nenhum' }, real), true);
  assert.equal(campoDisponivelNaCombinacao(real.campos[3], { ...base, nivel: 'campanha', breakdownId: 'nenhum' }, real), false);
  assert.equal(campoDisponivelNaCombinacao(real.campos[3], { ...base, nivel: 'campanha', breakdownId: 'age+gender' }, real), true);
  assert.ok(impedimentos({ ...base, campos: ['instagram_profile_visits'], nivel: 'campanha', breakdownId: 'nenhum' }, real)
    .some((item) => item.campo === 'campos' && /Visitas ao perfil do Instagram/.test(item.mensagem)));
  assert.equal(campoDisponivelNaCombinacao(real.campos[0], { ...base, nivel: 'conta' }, real), true, 'catálogo 1.2 sem availability continua compatível');
  assert.deepEqual(aplicarPreset({ ...base, nivel: 'campanha', breakdownId: 'nenhum' }, 'meta_campaign_daily', real).campos,
    ['spend', 'conversions'], 'preset 1.3 não deve selecionar uma métrica incompatível e se autobloquear');
  assert.equal(real.campos[0].descricao, 'Valor investido');
  assert.equal(real.campos[0].exemplo, 'R$ 120,00');
  assert.equal(real.creativeFields?.[0].id, 'thumbnail_url');
  assert.deepEqual(real.niveis.map(({ id }) => id), ['conta', 'campanha', 'conjunto', 'anuncio']);
  assert.deepEqual(real.breakdowns.find(({ id }) => id === 'age+gender')?.valores, ['age', 'gender']);
  assert.deepEqual(real.templates[0].niveisCompativeis, ['conta', 'campanha']);
  assert.deepEqual(real.templates[1].campos, ['spend', 'reach']);
  const preset = aplicarPreset({ ...base, nivel: 'anuncio' }, 'meta_creative_performance', real);
  assert.deepEqual(preset.campos, ['spend']);
  assert.deepEqual(preset.creativeFields, ['thumbnail_url']);
  const legado = sanearCamposDoCatalogo({ ...preset, campos: ['spend', 'campo_antigo'], creativeFields: ['thumbnail_url', 'url_antiga'] }, real);
  assert.deepEqual(legado.rascunho.campos, ['spend']);
  assert.deepEqual(legado.rascunho.creativeFields, ['thumbnail_url']);
  assert.deepEqual(legado.removidos, ['campo_antigo', 'url_antiga']);
  assert.deepEqual(real.granularidades.map(({ id }) => id), ['diaria', 'semanal', 'mensal', 'periodo-inteiro', 'personalizada']);
  assert.equal(real.periodos.length, 4, 'períodos são contrato do produto quando o provedor não os publica');
}

/* Criativos deixam de pedir nível manual: a própria seleção deduz grão Anúncio. */
{
  const catalogoCriativo = normalizarCatalogo({ data: { accounts: [], fields: [{ key: 'spend' }],
    creativeFields: [{ key: 'thumbnail_url' }], granularities: ['day'], templates: [
      { key: 'meta_creative_performance', entityLevels: ['ad'], breakdownSelections: [[]], fields: ['spend'], creativeFields: ['thumbnail_url'] },
    ] } });
  assert.equal(impedimentos({ ...base, creativeFields: ['thumbnail_url'], nivel: 'campanha' }, catalogoCriativo)
    .some((item) => item.campo === 'criativos'), false);
}

/* O contrato field-centric precisa bater com todos os breakdowns que o Hub publica. */
{
  const catalogoContrato = normalizarCatalogo({ data: {
    accounts: [{ id: 'acct', name: 'Conta', isQueryable: true }],
    fields: [{ key: 'spend' }],
    creativeFields: [{ key: 'thumbnail_url' }],
    granularities: ['day'],
    templates: [
      { key: 'meta_demographics', entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['age', 'gender']] },
      { key: 'meta_geography', entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['country'], ['region']] },
      { key: 'meta_placement_device', entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['publisher_platform', 'platform_position'], ['device_platform']] },
      { key: 'meta_creative_performance', entityLevels: ['ad'], breakdownSelections: [[], ['video_asset']], fields: ['spend'], creativeFields: ['thumbnail_url'] },
    ],
  } });
  const casos = [
    { breakdownId: 'age+gender', campos: ['spend'], creativeFields: [], nivel: 'campanha', esperados: ['spend', 'age', 'gender'] },
    { breakdownId: 'country', campos: ['spend'], creativeFields: [], nivel: 'campanha', esperados: ['spend', 'country'] },
    { breakdownId: 'region', campos: ['spend'], creativeFields: [], nivel: 'campanha', esperados: ['spend', 'region'] },
    { breakdownId: 'publisher_platform+platform_position', campos: ['spend'], creativeFields: [], nivel: 'campanha', esperados: ['spend', 'publisher_platform', 'platform_position'] },
    { breakdownId: 'device_platform', campos: ['spend'], creativeFields: [], nivel: 'campanha', esperados: ['spend', 'device_platform'] },
    { breakdownId: 'video_asset', campos: ['spend'], creativeFields: ['thumbnail_url'], nivel: 'anuncio', esperados: ['spend', 'video_asset', 'creative.thumbnail_url'] },
  ] as const;
  for (const caso of casos) {
    const rascunho = { ...base, contaId: 'acct', templateId: '', breakdownId: caso.breakdownId,
      campos: [...caso.campos], creativeFields: [...caso.creativeFields], nivel: 'anuncio' as const };
    assert.deepEqual(selectedFieldsDoRascunho(rascunho, catalogoContrato), caso.esperados);
    assert.equal(nivelResolvidoDoRascunho(rascunho, catalogoContrato), caso.nivel,
      `grão deve ser consequência dos campos em ${caso.breakdownId}`);
  }
  assert.equal(nivelResolvidoDoRascunho({ ...base, nivel: 'anuncio', campos: ['date', 'account_id', 'spend'] }, catalogoContrato), 'conta',
    'nivel legado oculto não pode forçar o grão de uma definição field-centric');
  assert.deepEqual(preservarGraoLegadoNosCampos(['spend', 'clicks'], 'anuncio'), ['ad_id', 'spend', 'clicks'],
    'ao migrar uma extração legada, o grão precisa virar campo explícito antes de remover entityLevel');
}

/* Sem conta escolhida não se monta consulta, e a mensagem diz o que fazer. */
{
  const problemas = impedimentos({ ...base, contaId: '' });
  assert.equal(problemas.length, 1);
  assert.equal(problemas[0].campo, 'conta');
  assert.match(problemas[0].mensagem, /Escolha a conta/i, 'o impedimento precisa dizer a ação, não só o defeito');
}

/* Nenhum campo escolhido é impedimento, não uma consulta vazia silenciosa. */
{
  const problemas = impedimentos({ ...base, campos: [] });
  assert.ok(problemas.some((item) => item.campo === 'campos'), 'consulta sem campo precisa ser recusada');
}

/* Breakdown incompatível com o grão deduzido recusa e nomeia os grãos que servem. */
{
  const problemas = impedimentos({ ...base, campos: ['date', 'account_id', 'spend'], nivel: 'conta', breakdownId: 'demografico' });
  const breakdown = problemas.find((item) => item.campo === 'breakdown');
  assert.ok(breakdown, 'breakdown demográfico não existe no grão conta');
  assert.match(breakdown.mensagem, /Campanha/i, 'a recusa precisa dizer quais grãos servem');
  const valido = impedimentos({ ...base, campos: ['date', 'campaign_name', 'spend'], breakdownId: 'demografico' });
  assert.equal(valido.length, 0, 'no grão campanha a mesma combinação é válida');
}

/* Granularidade maior que o período é impossível, não "quase certo". */
{
  const problemas = impedimentos({ ...base, periodoId: 'ultimos-7', granularidade: 'mensal' });
  assert.ok(problemas.some((item) => item.campo === 'granularidade'));
  assert.equal(impedimentos({ ...base, periodoId: 'ultimos-90', granularidade: 'mensal' }).length, 0);
}

/* Volume alto avisa e recomenda; nunca bloqueia. A decisão é do usuário. */
{
  const pesado = avisoDeVolume({ ...base, campos: [...base.campos, 'ad_id'], breakdownId: 'demografico', periodoId: 'ultimos-90', granularidade: 'diaria' });
  assert.ok(pesado, 'combinação pesada precisa avisar');
  assert.match(pesado, /dividir|incremental/i, 'o aviso precisa recomendar uma saída');
  assert.equal(impedimentos({ ...base, campos: [...base.campos, 'ad_id'], breakdownId: 'demografico', periodoId: 'ultimos-90', granularidade: 'diaria' }).length, 0, 'aviso não pode virar bloqueio');
  assert.equal(avisoDeVolume(base), null, 'consulta pequena não avisa à toa');
}

/* Natureza dos campos sobrevive até a revisão: alcance e CTR não se somam. */
{
  const escolhidos = naturezaDosCamposEscolhidos({ ...base, campos: ['spend', 'reach', 'ctr'] });
  assert.deepEqual(escolhidos.map((campo) => campo.natureza), ['aditiva', 'nao-aditiva', 'calculada']);
  assert.ok(CAMPOS.every((campo) => ['aditiva', 'calculada', 'nao-aditiva'].includes(campo.natureza)));
  assert.ok(BREAKDOWNS.some((item) => item.id === 'nenhum'), '"sem breakdown" precisa ser uma opção explícita');
}

const pagina = fs.readFileSync(new URL('../src/pages/DataHub.tsx', import.meta.url), 'utf8');
const componentes = fs.readFileSync(new URL('../src/pages/data-hub-extracoes.tsx', import.meta.url), 'utf8');

/* Navegação entre as duas seções privadas, com a atual marcada por aria-current. */
assert.match(pagina, /to="\/painel-de-relatorios"/, 'falta a navegação para Relatórios');
assert.match(pagina, /aria-current="page"/, 'a seção atual precisa ser anunciada ao leitor de tela');

/* Estado vazio explica a causa em vez de mostrar tabela sem linha. */
assert.match(componentes, /Nenhuma extração ainda/, 'falta o estado vazio da lista');
assert.match(componentes, /dcp-secao__apoio/, 'o estado vazio precisa do texto de apoio que explica a causa');

/* Esteira de etapas com etapa corrente anunciada. */
assert.match(componentes, /aria-current=\{indice === etapa \? 'step' : undefined\}/, 'a etapa corrente precisa ser anunciada');
assert.match(componentes, /aria-label="Etapas da criação"/);

/* Impedimento e aviso mudam sozinhos: quem usa leitor de tela precisa ouvir. */
assert.match(componentes, /aria-live="polite"/, 'o resumo precisa anunciar mudanças de validação');

/* A tela precisa dizer que nada é salvo no servidor nesta fase. */
assert.match(componentes, /configuração será salva no Data Hub/);
assert.match(componentes, /if \(salvando\) return/);
assert.match(componentes, /Salvando…/);
assert.match(componentes, /selectedFieldsDoRascunho\(rascunho, catalogo\)/);
assert.match(componentes, /delete definicaoBase\.entityLevel/);
assert.match(componentes, /delete definicaoBase\.fields/);
assert.match(componentes, /selectedFields,/);
assert.doesNotMatch(componentes, /htmlFor="nivel"/);
assert.doesNotMatch(componentes, /id="nivel"/);

/* O diagnóstico PWI0 continua separado; PWI2 usa o BFF agregado para catálogo/CRUD. */
const fetches = pagina.match(/fetch\(/g) ?? [];
assert.ok(fetches.length >= 2, 'PWI2 precisa consultar o catálogo e as extrações');
assert.match(pagina, /fetch\('\/api\/data-hub-spike'/);
assert.match(pagina, /fetch\(`\/api\/data-hub\$\{path\}`/);
assert.match(pagina, /Conectar Google Drive/);
assert.match(pagina, /\/google\/status/);
assert.match(pagina, /\/google\/callback/);
assert.match(componentes, /\['Origem', 'Campos', 'Período', 'Destino', 'Revisão'\]/);
assert.match(componentes, /Criar e usar/);
assert.match(componentes, /Escolher no Google Drive/);
assert.match(componentes, /destination: destino/);
assert.match(componentes, /disabled=\{problemas\.length > 0 \|\| !destino \|\| salvando\}/);
assert.match(componentes, /Executar agora/);
assert.match(componentes, /aria-live="polite"/);
assert.doesNotMatch(componentes, />[^<]*exportKey[^<]*</, 'a UI não pode expor exportKey técnica');
assert.match(
  componentes,
  /setErroDestino\(null\);\s*if \(modo === 'criar'\) setDestino\(null\);\s*try \{/,
  'create invalida o destino, mas edit preserva o atual até confirmar o candidato',
);
assert.match(componentes, /Buscar campos/);
assert.match(componentes, /Sua seleção/);
assert.match(componentes, /Remover \$\{campo\.nome\}/);
assert.match(componentes, /selectedFields,/);
assert.match(componentes, /const definicaoBase = \{ \.\.\.\(definicaoInicial \?\? \{\}\) \}/, 'edição deve preservar propriedades fora do formulário');
assert.doesNotMatch(componentes, /entityIds: \[\][\s\S]*filters: \[\]/, 'edição não pode zerar filtros e IDs silenciosamente');
assert.match(componentes, /Completar configuração/);
assert.match(pagina, /method: atual \? 'PATCH' : 'POST'/);
assert.match(pagina, /revision: atual\.revision/);
assert.match(pagina, /preservarGraoLegadoNosCampos\(campos, nivelLegado\)/,
  'edição legada precisa materializar o grão como campo antes de remover entityLevel');

const picker = fs.readFileSync(new URL('../src/pages/data-hub-google-picker.ts', import.meta.url), 'utf8');
assert.match(picker, /application\/vnd\.google-apps\.spreadsheet/, 'Picker precisa aceitar somente Google Sheets');
assert.match(picker, /VITE_DATA_HUB_GOOGLE_PICKER_API_KEY/);
assert.match(picker, /VITE_DATA_HUB_GOOGLE_PICKER_APP_ID/);

const catalogo = fs.readFileSync(new URL('../src/pages/data-hub-catalogo.ts', import.meta.url), 'utf8');
assert.doesNotMatch(catalogo, /act_\d|\b\d{10,}\b/, 'nenhum ID de conta real pode entrar no catálogo fonte');

const estilo = fs.readFileSync(new URL('../src/pages/data-hub.css', import.meta.url), 'utf8');
/* Alvo de toque e colapso em telas estreitas são requisito, não enfeite. */
assert.match(estilo, /\.dch-esteira__item \{[^}]*min-height: 44px/, 'etapa precisa de alvo de toque de 44px');
assert.match(estilo, /\.dch-opcao \{[^}]*min-height: 44px/, 'opção de campo precisa de alvo de toque de 44px');
assert.match(estilo, /@media \(max-width: 900px\)[\s\S]*grid-template-columns: 1fr/, 'o criador precisa colapsar em uma coluna');

/* ---- HTML de verdade, não só a fonte ---- */

function html(no: unknown) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, no as never));
}

/* Lista vazia: explica a causa e oferece a saída, sem tabela sem linhas. */
{
  const marcado = html(createElement(ListaDeExtracoes, { extracoes: [], aoCriar: () => {} }));
  assert.match(marcado, /Nenhuma extração ainda/);
  assert.match(marcado, /Criar extração/);
  assert.doesNotMatch(marcado, /<table/, 'estado vazio não pode renderizar tabela');
}

/* Lista com rascunho local avisa que nada está salvo no servidor. */
{
  const marcado = html(
    createElement(ListaDeExtracoes, {
      extracoes: [{ id: 'local-1', nome: 'Conta de demonstração — Serviços', resumo: '3 campos' }],
      aoCriar: () => {},
    }),
  );
  assert.match(marcado, /Extrações salvas permanecem disponíveis neste Data Hub/i, 'a lista precisa indicar persistência no Data Hub');
}

/* Dois eventos antes do rerender representam uma ação: a trava vive no handler, não só no disabled visual. */
{
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://portal.example.test/data-hub' });
  const previousWindow = globalThis.window; const previousDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  let chamadas = 0; let liberar!: () => void;
  const pendente = new Promise<void>((resolve) => { liberar = resolve; });
  const definition = { destination: { provider: 'google_sheets', spreadsheetId: '1234567890abcdefghijklmnop',
    spreadsheetName: 'Relatório', sheetId: 0, sheetTitle: 'Fonte', startCell: 'A1', writeMode: 'replace' } };
  const root = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => root.render(createElement(ListaDeExtracoes, {
    extracoes: [{ id: 'extract-click', nome: 'Fonte', resumo: '1 campo', definition }], aoCriar: () => {}, googlePronto: true,
    aoExecutar: async () => { chamadas += 1; await pendente; },
  })));
  const botao = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === 'Executar agora') as HTMLButtonElement;
  await act(async () => { botao.click(); botao.click(); await Promise.resolve(); });
  assert.equal(chamadas, 1, 'double-click não pode disparar duas execuções');
  liberar(); await act(async () => { await pendente; });
  await act(async () => root.unmount());
  Object.assign(globalThis, { window: previousWindow, document: previousDocument });
}

/* Completar destino numa edição não apaga filtros, IDs, agenda ou período absoluto. */
{
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://portal.example.test/data-hub' });
  const previousWindow = globalThis.window; const previousDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const destination = { provider: 'google_sheets' as const, spreadsheetId: '1234567890abcdefghijklmnop',
    spreadsheetName: 'Relatório', sheetId: 0, sheetTitle: 'Fonte', startCell: 'A1' as const, writeMode: 'replace' as const };
  const periodContract = { version: '1.0.0', executionFrequency: { unit: 'day', value: 1 }, timezone: 'UTC',
    runAtLocal: '08:00', dataPeriod: { type: 'absolute', start: '2026-08-01', end: '2026-08-02' }, outputGranularity: 'day' };
  const original = { schemaVersion: '1.2.0', entityIds: ['ad-1'], filters: [{ field: 'status', value: 'ACTIVE' }],
    sort: { field: 'spend' }, attributionRequested: ['7d_click'], requestFingerprint: 'preservar', periodContract, destination };
  let salva: any = null;
  const root = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => root.render(createElement(CriadorDeExtracao, { modo: 'editar', catalogo: CATALOGO_PADRAO,
    rascunhoInicial: base, destinoInicial: destination, definicaoInicial: original, aoCancelar: () => {},
    aoConcluir: (extracao) => { salva = extracao.definition; } })));
  for (let passo = 0; passo < 4; passo += 1) {
    const avancar = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === 'Avançar') as HTMLButtonElement;
    await act(async () => avancar.click());
  }
  const salvar = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === 'Salvar alterações') as HTMLButtonElement;
  await act(async () => salvar.click());
  assert.deepEqual(salva.entityIds, original.entityIds);
  assert.deepEqual(salva.filters, original.filters);
  assert.deepEqual(salva.sort, original.sort);
  assert.deepEqual(salva.attributionRequested, original.attributionRequested);
  assert.equal(salva.requestFingerprint, 'preservar');
  assert.deepEqual(salva.periodContract, periodContract);
  await act(async () => root.unmount());
  Object.assign(globalThis, { window: previousWindow, document: previousDocument });
}

/* A etapa de campos explica atribuição sensível e a incompatibilidade vigente. */
{
  const catalogoSensivel = normalizarCatalogo({ data: { accounts: [{ id: 'acct', name: 'Conta' }],
    fields: [{ key: 'instagram_profile_visits', label: 'Visitas ao perfil do Instagram', classification: 'attribution_sensitive',
      availability: { combinations: [{ entityLevels: ['campaign'], breakdownSelections: [['age', 'gender']] }] } }],
    granularities: ['day'], templates: [{ key: 'meta_campaign_daily', entityLevels: ['campaign'], breakdownSelections: [[]],
      fields: ['instagram_profile_visits'], creativeFields: [] }] } });
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://portal.example.test/data-hub' });
  const previousWindow = globalThis.window; const previousDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => root.render(createElement(CriadorDeExtracao, { catalogo: catalogoSensivel,
    rascunhoInicial: { ...base, contaId: 'acct', campos: ['instagram_profile_visits'] }, aoCancelar: () => {}, aoConcluir: () => {} })));
  const avancar = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === 'Avançar') as HTMLButtonElement;
  await act(async () => avancar.click());
  assert.match(dom.window.document.body.textContent ?? '', /Depende da janela e do momento de atribuição da Meta/);
  assert.match(dom.window.document.body.textContent ?? '', /Indisponível na seleção e breakdown atuais/);
  assert.match(dom.window.document.body.textContent ?? '', /Ajuste os campos\/dimensões ou breakdown, ou remova a métrica/);
  await act(async () => root.unmount());
  Object.assign(globalThis, { window: previousWindow, document: previousDocument });
}

/* Execução manual só fica disponível com destino replace confirmado e Google pronto. */
{
  const definition = { destination: { provider: 'google_sheets', spreadsheetId: '1234567890abcdefghijklmnop',
    spreadsheetName: 'Relatório', sheetId: 0, sheetTitle: 'Fonte', startCell: 'A1', writeMode: 'replace' } };
  const pronto = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-1', nome: 'Fonte', resumo: '1 campo', definition }],
    aoCriar: () => {}, googlePronto: true, execucoes: { 'extract-1': { tipo: 'aceito' } }, aoExecutar: () => {} }));
  assert.match(pronto, /<button[^>]*disabled=""[^>]*>Execução aceita<\/button>/);
  assert.match(pronto, /Execução aceita\. A planilha será atualizada em segundo plano/);
  const executando = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-1', nome: 'Fonte', resumo: '1 campo', definition }],
    aoCriar: () => {}, googlePronto: true, execucoes: { 'extract-1': { tipo: 'executando' } } }));
  assert.match(executando, /Executando…/);
  assert.match(executando, /Preparando a atualização da planilha…/);
  const erro = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-1', nome: 'Fonte', resumo: '1 campo', definition }],
    aoCriar: () => {}, googlePronto: true, execucoes: { 'extract-1': { tipo: 'erro', mensagem: 'Falha segura.' } } }));
  assert.match(erro, /role="alert">Falha segura\./);
  assert.match(erro, /aria-live="polite"/);

  const inicial = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-1', nome: 'Fonte', resumo: '1 campo', definition }],
    aoCriar: () => {}, googlePronto: true, execucoes: { 'extract-1': { tipo: 'inicial' } }, aoExecutar: () => {} }));
  assert.doesNotMatch(inicial.match(/<button[^>]*>Executar agora<\/button>/)?.[0] ?? '', /disabled/);

  const append = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-2', nome: 'Append', resumo: '1 campo',
    definition: { destination: { ...definition.destination, writeMode: 'append' } } }], aoCriar: () => {}, googlePronto: true }));
  assert.match(append, /disabled/);
  assert.match(append, /modo acrescentar ainda não está disponível/i);

  const desconectado = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'extract-3', nome: 'Sem Google', resumo: '1 campo', definition }],
    aoCriar: () => {}, googlePronto: false }));
  assert.match(desconectado, /disabled/);
  assert.match(desconectado, /Conecte sua conta Google/i);

  const legado = html(createElement(ListaDeExtracoes, { extracoes: [{ id: 'legacy', nome: 'Legada', resumo: 'sem destino', definition: {} }],
    aoCriar: () => {}, googlePronto: true }));
  assert.match(legado, /Completar configuração/);
  assert.match(legado, /disabled/);
}

/* O criador abre na primeira etapa, com a conta ainda por escolher: o resumo
 * já mostra o impedimento em vez de fingir que está tudo certo. */
{
  const marcado = html(createElement(CriadorDeExtracao, { aoCancelar: () => {}, aoConcluir: () => {} }));
  assert.match(marcado, /aria-current="step"/, 'a etapa corrente precisa vir marcada no HTML');
  assert.match(marcado, /Escolha a conta de origem/, 'o impedimento precisa aparecer no resumo desde o início');
  assert.doesNotMatch(marcado, /Combinação válida/, 'sem conta escolhida a combinação não pode ser dada como válida');
  assert.match(marcado, /aria-live="polite"/);
  assert.match(marcado, /<label[^>]*for="conta"|for="conta"/, 'todo controle precisa de label real');
}

/* ---- Correções de acessibilidade da auditoria ---- */

/* Defeito: trocar de vista (lista <-> criador) desmonta quem tinha o foco. O
 * título da vista que acabou de aparecer precisa aceitar foco programático
 * (tabindex="-1") para o código poder movê-lo para lá. */
{
  const marcadoLista = html(createElement(ListaDeExtracoes, { extracoes: [], aoCriar: () => {} }));
  assert.match(
    marcadoLista,
    /<h1 id="lista-titulo" tabindex="-1">/,
    'o título da lista precisa aceitar foco programático (tabindex=-1) para a troca de vista poder movê-lo para lá',
  );

  const marcadoCriador = html(createElement(CriadorDeExtracao, { aoCancelar: () => {}, aoConcluir: () => {} }));
  assert.match(
    marcadoCriador,
    /<h1 id="criador-titulo" tabindex="-1">/,
    'o título do criador precisa aceitar foco programático (tabindex=-1) para a troca de vista poder movê-lo para lá',
  );
}

/* Risco: trocar de etapa na esteira (ou Voltar/Avançar) troca todo o conteúdo
 * do formulário sem anunciar nada. O <h2> da etapa precisa aceitar foco
 * programático pelo mesmo motivo do <h1> acima. */
{
  const marcado = html(createElement(CriadorDeExtracao, { aoCancelar: () => {}, aoConcluir: () => {} }));
  assert.match(
    marcado,
    /<h2 tabindex="-1">Origem dos dados<\/h2>/,
    'o título da etapa corrente precisa aceitar foco programático (tabindex=-1)',
  );
}

/* Risco: o aviso de rascunho local só nascia quando a lista tinha itens, e
 * vários leitores de tela não anunciam um nó role=status recém-inserido — só
 * vigiam containers já presentes. O container precisa existir mesmo vazio. */
{
  const marcado = html(createElement(ListaDeExtracoes, { extracoes: [], aoCriar: () => {} }));
  assert.match(
    marcado,
    /<div class="dch-aviso-local" role="status"><\/div>/,
    'o container de status do aviso de rascunho local precisa estar montado mesmo com a lista vazia',
  );
}

/* Risco: os impedimentos só apareciam no resumo lateral, longe dos <select>.
 * Cada controle precisa se anunciar inválido e apontar, via aria-describedby,
 * para um id que exista de verdade no HTML — não basta o atributo existir. */
{
  const semConta = html(createElement(CriadorDeExtracao, { aoCancelar: () => {}, aoConcluir: () => {} }));
  const selectConta = semConta.match(/<select id="conta"[^>]*>/);
  assert.ok(selectConta, 'o select de conta precisa existir na etapa inicial');
  assert.match(
    selectConta[0],
    /aria-invalid="true"/,
    'sem conta escolhida o select de conta precisa se anunciar inválido',
  );
  const describedBy = selectConta[0].match(/aria-describedby="([^"]+)"/);
  assert.ok(describedBy, 'o select de conta precisa apontar, via aria-describedby, para a mensagem do impedimento');
  assert.match(
    semConta,
    new RegExp(`id="${describedBy[1]}"`),
    'o id referenciado por aria-describedby precisa existir de verdade no HTML renderizado, não só o atributo',
  );

  const comExtracaoValida = html(
    createElement(CriadorDeExtracao, { aoCancelar: () => {}, aoConcluir: () => {}, rascunhoInicial: base }),
  );
  const selectContaValido = comExtracaoValida.match(/<select id="conta"[^>]*>/);
  assert.ok(selectContaValido, 'o select de conta precisa existir com a extração válida também');
  assert.doesNotMatch(
    selectContaValido[0],
    /aria-invalid="true"/,
    'com a extração válida o select de conta não pode se anunciar inválido',
  );
}

console.log('OK — PWI1 local: catálogo controlado, recusa com motivo, aviso sem bloqueio, lista vazia explicada, casca sem backend remoto e correções de acessibilidade da auditoria');
