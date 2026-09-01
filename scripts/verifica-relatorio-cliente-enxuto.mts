/**
 * O documento do cliente, tal como ele sai hoje.
 *
 * Duas provas, uma decisão de produto e um botão:
 *
 *  1. **`Oportunidades e próximos passos` e `Qualidade e origem dos dados` não
 *     são publicadas** — decisão do PO em 2026-09-01, para os relatórios
 *     poderem ir aos clientes este mês.
 *  2. **Os dados das duas continuam no snapshot.** A decisão é sobre publicar,
 *     não sobre coletar; quem "resolver" isso apagando `leitura.destaques` ou
 *     `fontes` quebra auditoria e contexto analítico.
 *  3. **O botão "Exportar PDF" existe** — a capacidade sempre existiu (o PDF é
 *     a impressão desta página), mas só quem conhecia Ctrl+P a alcançava.
 *  4. **O botão não sai dentro do próprio PDF.**
 *
 * A numeração das seções é posicional, então tem de continuar sem buraco.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RelatorioMontado from '../src/reports/RelatorioMontado.tsx';
import { SECOES_SUSPENSAS_PARA_O_CLIENTE } from '../src/reports/Esqueleto.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const snapshot = karyneMontada202607 as any;

/* A fixture precisa MESMO ter o dado das duas seções, senão a prova de que
   elas não são publicadas passaria por ausência de conteúdo — o teste diria
   "não apareceu" sobre algo que nunca teve o que aparecer. */
assert.ok(Array.isArray(snapshot.fontes) && snapshot.fontes.length > 0, 'a fixture precisa ter fontes');
assert.ok(
  (snapshot.leitura.destaques?.length ?? 0) + (snapshot.leitura.proximosPassos?.length ?? 0) > 0,
  'a fixture precisa ter destaques ou próximos passos',
);

const html = renderToStaticMarkup(createElement(RelatorioMontado, {
  snapshot,
  proposta: 'B',
  competencias: [{ competencia: snapshot.identidade.competencia, rotulo: 'julho de 2026', publicada: true }],
} as any));

/* ---- 1) as duas seções não são publicadas ---- */
assert.equal(SECOES_SUSPENSAS_PARA_O_CLIENTE, true, 'a decisão do PO de 2026-09-01 continua valendo');
assert.doesNotMatch(html, /Oportunidades e próximos passos/, 'a seção de oportunidades não vai ao cliente');
assert.doesNotMatch(html, /Qualidade e origem dos dados/, 'a seção de qualidade das fontes não vai ao cliente');
assert.doesNotMatch(html, /id="proximos-passos"/, 'nem a âncora da seção de oportunidades');
assert.doesNotMatch(html, /id="qualidade"/, 'nem a âncora da seção de qualidade');

/* ---- 2) o que continua sendo publicado ---- */
assert.match(html, /Resumo do mês/, 'o resumo do mês continua — é onde vive a análise editorial da introdução');
assert.match(html, /dc-rodape/, 'o rodapé de procedência continua');

/* ---- 3) o dado NÃO foi apagado do snapshot ---- */
assert.ok(snapshot.fontes.length > 0, 'as fontes continuam gravadas para auditoria');
assert.ok(snapshot.leitura.destaques !== undefined, 'a leitura continua gravada');

/* ---- 4) numeração sem buraco ---- */
const indices = [...html.matchAll(/class="dc-secao__indice"[^>]*>(\d{2})</g)].map((m) => Number(m[1]));
if (indices.length > 0) {
  assert.deepEqual(
    indices,
    indices.map((_, i) => i + 1),
    'a numeração das seções é posicional e não pode ficar com buraco depois da remoção',
  );
}

/* ---- 5) o botão de PDF existe ---- */
assert.match(html, /Exportar PDF/, 'o botão de exportar PDF precisa existir na página');
assert.match(html, /dc-topo__imprimir/, 'e carregar a classe que a regra de impressão esconde');

/* ---- 6) o botão não sai dentro do PDF ---- */
{
  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  /* Só os seletores entre o fim do comentário e a chave. Uma asserção que
     varresse o arquivo inteiro seria satisfeita pelo comentário que documenta
     a própria regra — já aconteceu neste repositório. */
  const blocos = [...css.matchAll(/@media print\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const escondeOBotao = blocos.some((bloco) =>
    [...bloco.matchAll(/([^{}]*)\{([^{}]*)\}/g)].some(([, seletores, corpo]) =>
      seletores.split(',').map((s) => s.trim()).includes('.dc-topo__imprimir')
      && /display:\s*none/.test(corpo)));
  assert.ok(escondeOBotao, 'o botão "Exportar PDF" precisa sumir na impressão, senão sai desenhado no PDF do cliente');
}

/* ---- 7) prova negativa: a busca acima realmente enxerga um seletor ---- */
{
  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  const blocos = [...css.matchAll(/@media print\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const achaInexistente = blocos.some((bloco) =>
    [...bloco.matchAll(/([^{}]*)\{([^{}]*)\}/g)].some(([, seletores]) =>
      seletores.split(',').map((s) => s.trim()).includes('.dc-classe-que-nao-existe')));
  assert.equal(achaInexistente, false, 'a varredura não pode dar positivo para qualquer coisa');
}

console.log('verifica-relatorio-cliente-enxuto: ok');
