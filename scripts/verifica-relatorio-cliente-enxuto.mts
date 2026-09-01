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

/**
 * Um bloco `@media print { … }` inteiro, até a chave que fecha na coluna zero.
 *
 * ⚠️ `[\r\n]+` e não `\n`: este repositório grava CSS com CRLF, e casar só
 * `\n` é frágil o bastante para o bloco inteiro sumir da varredura — e uma
 * varredura vazia faz TODA asserção de ausência passar por vacuidade. É
 * exatamente por isso que existe a prova negativa no fim deste arquivo.
 */
const RE_BLOCO_PRINT = /@media print\s*\{([\s\S]*?)[\r\n]+\}/g;

/**
 * As regras de impressão, já separadas em seletores e corpo.
 *
 * ⚠️ Os comentários saem ANTES do parse. Sem isso, o texto do comentário que
 * documenta uma regra entra na captura do seletor dela, e a busca por
 * `.dc-grafico__area` falha mesmo com a regra presente — ou, pior, passa por
 * casar com o nome citado dentro do comentário. Este repositório já tinha
 * registrado essa armadilha em outra trava; aqui ela custou uma rodada.
 */
function regrasDeImpressao(css: string) {
  const blocos = [...css.matchAll(RE_BLOCO_PRINT)].map((m) => m[1]);
  assert.ok(blocos.length > 0, 'a varredura não achou bloco @media print — vazia, toda asserção de ausência passa por vacuidade');
  return blocos.flatMap((bloco) =>
    [...bloco.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^{}]*)\}/g)]
      .map(([, sel, corpo]) => ({
        seletores: sel.split(',').map((s) => s.trim()).filter(Boolean),
        corpo,
      })));
}

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

/* ------------------------------------------------------------------ */
/* 8) O PDF precisa refletir o relatório                                */
/*                                                                      */
/* O PO imprimiu e recebeu um documento "incompleto e estranho": os      */
/* cinco `<details>` de dados dos gráficos nascem FECHADOS e a regra de  */
/* impressão escondia `details` fechado, então cada seção de gráfico     */
/* saía sem número nenhum — ao lado de um SVG do Recharts medido em      */
/* 110px, que não se remede na repaginação.                             */
/* ------------------------------------------------------------------ */
{
  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  const regras = regrasDeImpressao(css);

  const regraDe = (seletor: string) => regras.find((r) => r.seletores.includes(seletor));

  /* O gráfico sai do papel. */
  const area = regraDe('.dc-grafico__area');
  assert.ok(area && /display:\s*none/.test(area.corpo), 'o SVG do gráfico não pode ir ao papel: ele não se remede na repaginação');

  /* A tabela dele entra, aberta. Forçar no FILHO é o que funciona num
     `<details>` fechado — o navegador esconde o conteúdo por dentro. */
  const tabela = regraDe('.dc-grafico__dados > .dc-grafico__dados-rolagem');
  assert.ok(tabela && /display:\s*block/.test(tabela.corpo), 'a tabela de dados do gráfico precisa aparecer no papel, mesmo com o details fechado');
  const sumario = regraDe('.dc-grafico__dados > summary');
  assert.ok(sumario && /display:\s*none/.test(sumario.corpo), 'o "ver os números em tabela" não faz sentido impresso');

  /* Prova negativa: a regra que causava o defeito não pode voltar. */
  const escondeFechado = regras.some((r) =>
    r.seletores.some((sel) => sel.includes('.dc-grafico__dados') && sel.includes(':not([open])'))
    && /display:\s*none/.test(r.corpo));
  assert.equal(escondeFechado, false, 'esconder o details fechado é exatamente o que tirava os números do PDF');

  /* Rolagem lateral não existe no papel — o excedente é cortado em silêncio. */
  for (const seletor of ['.dc-grafico__dados-rolagem', '.dc-campanhas']) {
    const r = regras.find((x) => x.seletores.includes(seletor));
    assert.ok(r && /overflow:\s*visible/.test(r.corpo), `${seletor} precisa abrir no papel, senão a tabela sai cortada na largura`);
  }
}

/* ---- 9) o papel tem margem declarada ---- */
{
  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  assert.match(css, /@page\s*\{[^}]*margin:/, 'sem @page cada navegador imprime com uma margem diferente');
}

/* ------------------------------------------------------------------ */
/* 10) Quebra de página — o PDF não pode sair com folha em branco       */
/*                                                                      */
/* O PO imprimiu e recebeu "muitas páginas em branco, quebras mal       */
/* feitas". A causa foi `break-inside: avoid` em `.dc-secao`: medido na */
/* largura real de A4, 5 das 11 seções deste relatório passam de uma    */
/* folha, e "não me quebre" num bloco que não cabe só escolhe um lugar  */
/* pior para a quebra — cobrando uma página em branco pela escolha.     */
/* ------------------------------------------------------------------ */
{
  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  const regras = regrasDeImpressao(css);
  const corpoDe = (seletor: string) => regras.filter((r) => r.seletores.includes(seletor)).map((r) => r.corpo).join(' ');

  /* Bloco de tamanho aberto NUNCA leva "não me quebre". */
  for (const grande of ['.dc-secao', '.dc-grafico']) {
    assert.doesNotMatch(
      corpoDe(grande),
      /break-inside:\s*avoid/,
      `${grande} pode passar de uma folha; "break-inside: avoid" aqui produz página em branco`,
    );
    assert.match(corpoDe(grande), /break-inside:\s*auto/, `${grande} precisa poder quebrar`);
  }

  /* Peça pequena continua inteira — senão a correção vira o defeito oposto. */
  for (const pequena of ['.dc-kpi', '.dc-fonte', '.dc-analise-editorial', 'tr']) {
    assert.match(corpoDe(pequena), /break-inside:\s*avoid/, `${pequena} cabe numa folha e não pode ser partida`);
  }

  /* Título não fica sozinho no pé da folha. */
  assert.match(corpoDe('.dc-secao__titulo'), /break-after:\s*avoid/, 'título solto no fim da página é a outra metade de uma quebra mal feita');

  /* Tabela que atravessa a folha repete o cabeçalho — e para isso o `th`
     não pode continuar grudado. */
  assert.match(corpoDe('thead'), /display:\s*table-header-group/, 'tabela longa precisa repetir o cabeçalho em cada folha');
  assert.match(corpoDe('th'), /position:\s*static/, 'th sticky atrapalha a repetição do cabeçalho no papel');

  /* Altura mínima de viewport rende folha em branco no fim. */
  assert.match(corpoDe('.dc-report'), /min-height:\s*0/, 'altura mínima medida na janela não existe no papel');

  /* Linha órfã. */
  assert.match(corpoDe('p'), /orphans|widows/, 'parágrafo precisa de orphans/widows para não deixar linha solta');
}

console.log('verifica-relatorio-cliente-enxuto: ok');
