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
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CriadorDeExtracao, ListaDeExtracoes } from '../src/pages/data-hub-extracoes.tsx';
import {
  BREAKDOWNS,
  CAMPOS,
  CONTAS,
  RASCUNHO_INICIAL,
  normalizarCatalogo,
  avisoDeVolume,
  impedimentos,
  naturezaDosCamposEscolhidos,
  type Rascunho,
} from '../src/pages/data-hub-catalogo.ts';

const base: Rascunho = { ...RASCUNHO_INICIAL, contaId: CONTAS[0].id };

/* A PWI2 recebe o envelope efetivo do BFF e preserva IDs e compatibilidades. */
{
  const real = normalizarCatalogo({ data: {
    accounts: [{ id: 'acct-from-backend', name: 'Conta autorizada', isQueryable: true }, { id: 'acct-unknown', name: 'Conta sem sondagem', isQueryable: null }],
    fields: [{ key: 'spend', classification: 'additive' }, { key: 'reach', classification: 'non_additive' }],
    breakdowns: ['age', 'gender'], granularities: ['day', 'week', 'month', 'all_days', 'custom'],
    templates: [
      { key: 'meta_campaign_daily', entityLevels: ['account', 'campaign'], breakdownSelections: [[]] },
      { key: 'meta_adset_ad_daily', entityLevels: ['adset', 'ad'], breakdownSelections: [[]] },
      { key: 'meta_demographics', entityLevels: ['campaign', 'adset', 'ad'], breakdownSelections: [['age', 'gender']] },
    ],
  } });
  assert.equal(real.contas[0].id, 'acct-from-backend');
  assert.equal(real.contas[0].disponivel, true);
  assert.equal(real.contas[1].disponivel, null, 'null não pode virar true nem zero');
  assert.equal(real.campos[0].natureza, 'aditiva');
  assert.equal(real.campos[1].natureza, 'nao-aditiva');
  assert.deepEqual(real.niveis.map(({ id }) => id), ['conta', 'campanha', 'conjunto', 'anuncio']);
  assert.deepEqual(real.breakdowns.find(({ id }) => id === 'age+gender')?.valores, ['age', 'gender']);
  assert.deepEqual(real.templates[0].niveisCompativeis, ['conta', 'campanha']);
  assert.deepEqual(real.granularidades.map(({ id }) => id), ['diaria', 'semanal', 'mensal', 'periodo-inteiro', 'personalizada']);
  assert.equal(real.periodos.length, 4, 'períodos são contrato do produto quando o provedor não os publica');
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

/* Breakdown incompatível com o nível recusa e nomeia os níveis que servem.
 * Trocar o nível sozinho seria fallback silencioso: proibido. */
{
  const problemas = impedimentos({ ...base, nivel: 'conta', breakdownId: 'demografico' });
  const breakdown = problemas.find((item) => item.campo === 'breakdown');
  assert.ok(breakdown, 'breakdown demográfico não existe no nível conta');
  assert.match(breakdown.mensagem, /Campanha/i, 'a recusa precisa dizer quais níveis servem');
  const valido = impedimentos({ ...base, nivel: 'campanha', breakdownId: 'demografico' });
  assert.equal(valido.length, 0, 'no nível campanha a mesma combinação é válida');
}

/* Granularidade maior que o período é impossível, não "quase certo". */
{
  const problemas = impedimentos({ ...base, periodoId: 'ultimos-7', granularidade: 'mensal' });
  assert.ok(problemas.some((item) => item.campo === 'granularidade'));
  assert.equal(impedimentos({ ...base, periodoId: 'ultimos-90', granularidade: 'mensal' }).length, 0);
}

/* Volume alto avisa e recomenda; nunca bloqueia. A decisão é do usuário. */
{
  const pesado = avisoDeVolume({ ...base, nivel: 'anuncio', breakdownId: 'demografico', periodoId: 'ultimos-90', granularidade: 'diaria' });
  assert.ok(pesado, 'combinação pesada precisa avisar');
  assert.match(pesado, /dividir|incremental/i, 'o aviso precisa recomendar uma saída');
  assert.equal(impedimentos({ ...base, nivel: 'anuncio', breakdownId: 'demografico', periodoId: 'ultimos-90', granularidade: 'diaria' }).length, 0, 'aviso não pode virar bloqueio');
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
assert.match(componentes, /rascunho\.nivel === 'conta' \? 'account'/);

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
