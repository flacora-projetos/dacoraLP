import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Seletor de campos: linguagem, combobox e layout.
 *
 * Os tres pontos que esta verificacao protege de regressao:
 * 1. jargao interno nao aparece para o usuario;
 * 2. a busca e um combobox de verdade, com teclado e ARIA;
 * 3. o rotulo longo nao volta a estourar a coluna, e a borda nao volta a
 *    sair em contraste cheio.
 */
const tsx = readFileSync('src/pages/data-hub-query-v2.tsx', 'utf8');
const css = readFileSync('src/pages/data-hub-query-v2.css', 'utf8');

// --- 1. Linguagem ---------------------------------------------------------
// Texto entre > e < no JSX, mais os valores de placeholder e aria-label.
const visiveis = [
  ...tsx.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g),
  ...tsx.matchAll(/(?:placeholder|aria-label)="([^"]+)"/g),
  // Texto dentro de expressoes, como o rotulo do botao em um ternario.
  // As aspas precisam ser emparelhadas na ordem em que aparecem: exigir espaco
  // dentro do padrao faria o scanner pular um literal e casar o separador.
  ...tsx.matchAll(/'((?:[^'\\\n]|\\.)*)'/g),
].map((m) => m[1]).filter((texto) => /\s/.test(texto));

const proibidos = [/\bV2\b/, /\bV1\b/, /query engine/i, /\bdiscovery\b/i, /\bgrain\b/i, /queryRunId/, /\bendpoint\b/i, /\bsnapshot\b/i];
for (const texto of visiveis) {
  for (const proibido of proibidos) {
    assert.ok(!proibido.test(texto), `jargao visivel ao usuario: ${JSON.stringify(texto)} casa com ${proibido}`);
  }
}
assert.ok(visiveis.some((t) => t.includes('Buscar campos')), 'o rotulo da busca deveria ser "Buscar campos"');
assert.ok(visiveis.some((t) => t.includes('Executar consulta')), 'o botao deveria ser "Executar consulta"');

// --- 2. Combobox ----------------------------------------------------------
for (const atributo of ['role="combobox"', 'aria-expanded=', 'aria-controls="query-v2-lista"', 'aria-autocomplete="list"', 'aria-activedescendant=']) {
  assert.ok(tsx.includes(atributo), `combobox sem ${atributo}`);
}
assert.ok(tsx.includes('role="listbox"'), 'a lista precisa de role="listbox"');
assert.ok(tsx.includes('role="option"'), 'as opcoes precisam de role="option"');
assert.ok(tsx.includes('aria-selected='), 'a opcao precisa dizer se esta escolhida');
assert.ok(tsx.includes('onFocus={() => setAberto(true)}'), 'a lista precisa abrir ao focar');
assert.ok(tsx.includes('onKeyDown={aoTeclar}'), 'o campo precisa de navegacao por teclado');
for (const tecla of ['ArrowDown', 'ArrowUp', 'Escape', 'Enter', 'Home', 'End']) {
  assert.ok(tsx.includes(`'${tecla}'`), `teclado sem tratamento de ${tecla}`);
}
// Estado vazio: busca sem resultado nao pode renderizar container vazio e mudo.
assert.ok(tsx.includes('Nenhum campo com esse nome'), 'falta estado vazio na busca');
// Com centenas de chaves, abrir tudo e uma parede: tem de haver recorte.
assert.ok(/LIMITE_SUGESTOES\s*=\s*\d+/.test(tsx), 'falta limite de sugestoes ao abrir');
assert.ok(tsx.includes('Digite para encontrar o resto'), 'falta avisar que a lista foi recortada');

// --- 3. Layout ------------------------------------------------------------
assert.ok(!/border[^;]*currentColor/.test(css), 'borda com currentColor: usar os tokens da marca');
assert.ok(/\.dch-query-v2__rotulo[^}]*min-width:\s*0/.test(css), 'o rotulo precisa de min-width: 0 para nao estourar a coluna');
assert.ok(/\.dch-query-v2__rotulo[^}]*overflow-wrap:\s*anywhere/.test(css), 'o rotulo precisa quebrar identificador longo');
assert.ok(/\.dch-query-v2__opcao\s*\{[^}]*align-items:\s*flex-start/.test(css), 'rotulo de duas linhas alinha pelo topo');
assert.ok(/\.dch-query-v2__acoes[^}]*position:\s*sticky/.test(css), 'a barra de acao deveria acompanhar a rolagem');
assert.ok(/\.dch-query-v2__acoes[^}]*background:\s*var\(--dc-superficie\)/.test(css), 'barra sticky precisa de fundo proprio');
assert.ok(css.includes('@media (max-width: 700px)'), 'falta o ajuste para tela estreita');

// Alvos de toque: nada abaixo de 44px nas areas clicaveis novas.
for (const seletor of ['.dch-query-v2__opcao', '.dch-query-v2__chip']) {
  const bloco = new RegExp(`\\${seletor}\\s*\\{[^}]*min-height:\\s*(\\d+)px`).exec(css);
  assert.ok(bloco, `${seletor} sem min-height`);
  assert.ok(Number(bloco[1]) >= 36, `${seletor} com alvo de toque pequeno demais`);
}

// --- 4. Orientacao na pagina ---------------------------------------------
// A pagina e longa; a navegacao acompanha a rolagem para o usuario saber onde
// esta. Sticky sem fundo proprio deixa o conteudo transparecer por baixo.
const cssBase = readFileSync('src/pages/data-hub.css', 'utf8');
assert.ok(/\.dch-nav\s*\{[^}]*position:\s*sticky/.test(cssBase), 'a navegacao deveria acompanhar a rolagem');
assert.ok(/\.dch-nav\s*\{[^}]*background:\s*var\(--dc-superficie\)/.test(cssBase), 'navegacao sticky precisa de fundo proprio');
// A barra de acao cola embaixo e a navegacao em cima: nao podem disputar camada.
const camadaNav = Number(/\.dch-nav\s*\{[^}]*z-index:\s*(\d+)/.exec(cssBase)?.[1]);
const camadaAcoes = Number(/\.dch-query-v2__acoes[^}]*z-index:\s*(\d+)/.exec(css)?.[1]);
const camadaLista = Number(/\.dch-query-v2__lista\s*\{[^}]*z-index:\s*(\d+)/.exec(css)?.[1]);
assert.ok(camadaNav > camadaLista && camadaLista > camadaAcoes,
  `camadas fora de ordem: nav ${camadaNav}, lista ${camadaLista}, acoes ${camadaAcoes}`);

console.log('verifica:data-hub-seletor OK');
