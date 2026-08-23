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
  CATALOGO_E_DEMONSTRATIVO,
  CONTAS,
  RASCUNHO_INICIAL,
  avisoDeVolume,
  impedimentos,
  naturezaDosCamposEscolhidos,
  type Rascunho,
} from '../src/pages/data-hub-catalogo.ts';

const base: Rascunho = { ...RASCUNHO_INICIAL, contaId: CONTAS[0].id };

/* O catálogo desta fase é declaradamente de demonstração. Se alguém ligar o
 * catálogo real sem remover a marca, a tela continuaria mentindo ao usuário. */
{
  assert.equal(CATALOGO_E_DEMONSTRATIVO, true, 'o catálogo da PWI1 precisa se declarar demonstrativo');
  for (const conta of CONTAS) {
    assert.match(conta.nome, /demonstração/i, 'conta de catálogo precisa se identificar como demonstração');
  }
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
assert.match(componentes, /Nada é salvo no servidor nesta fase/);

/* A PWI1 não pode ligar a tela em backend remoto: o único fetch continua sendo
 * o diagnóstico de canal da PWI0, com corpo vazio. */
const fetches = pagina.match(/fetch\(/g) ?? [];
assert.equal(fetches.length, 1, 'a PWI1 não pode acrescentar chamada de rede');
assert.match(pagina, /fetch\('\/api\/data-hub-spike'/);

const catalogo = fs.readFileSync(new URL('../src/pages/data-hub-catalogo.ts', import.meta.url), 'utf8');
assert.doesNotMatch(catalogo, /act_\d|\b\d{10,}\b/, 'nenhum ID de conta real pode entrar no catálogo');

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
  assert.match(marcado, /somem ao recarregar/i, 'a lista precisa avisar que o rascunho é local');
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

console.log('OK — PWI1 local: catálogo controlado, recusa com motivo, aviso sem bloqueio, lista vazia explicada e casca sem backend remoto');
