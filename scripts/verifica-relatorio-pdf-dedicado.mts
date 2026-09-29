/**
 * O PDF do relatório mensal: um gerador só, no servidor, com a marca certa.
 *
 * Contrato (29/09/2026):
 *  1. O link do cliente monta UM botão, que baixa de `/api/relatorio-pdf` — não
 *     gera no navegador e não oferece a impressão da página.
 *  2. A marca sai da CARTEIRA: ALLGROTECH → Allgrotech; sem carteira → Dácora;
 *     marca explícita no snapshot ganha.
 *  3. O arquivo é gerado de verdade aqui (fixture), em A4 paisagem, com mais de
 *     uma folha e numeração "Página X de Y".
 *  4. As três armadilhas do motor que custaram o dia 29/09 ficam fechadas por
 *     código: nada de `minHeight`, nada de `fixed` fora do cabeçalho/rodapé, e
 *     nada de texto dentro de `<Svg>`. A varredura tira os comentários antes,
 *     porque o comentário que documenta a regra também contém a palavra.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RelatorioPublicoApresentado } from '../src/pages/RelatorioPublico.tsx';
import { nomeDoArquivoPdf } from '../src/reports/pdf/nomeDoArquivo.ts';
import { marcaDoRelatorio } from '../src/reports/marcas.ts';
import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const analisesPublicadas = [
  { secao: 'introducao', texto: 'Introdução aprovada para o cliente.' },
  { secao: 'bloco:numeros-meta', texto: 'Análise aprovada da seção.' },
];
const observacoesPublicas = [
  { secao: 'relatorio_inteiro', texto: 'Observação pública do fechamento.' },
];

/* ---- 1) a página ---- */
const html = renderToStaticMarkup(createElement(RelatorioPublicoApresentado, {
  token: 'x'.repeat(40),
  relatorio: {
    clienteNome: karyneMontada202607.identidade.clienteNome,
    competencia: karyneMontada202607.identidade.competencia,
    versao: karyneMontada202607.publicacao.versao,
    conteudoCarregado: true,
    snapshot: karyneMontada202607,
    analisesPublicadas,
    observacoesPublicas,
  },
}));

assert.match(html, /class="dc-topo__pdf"/, 'o link do cliente precisa montar o botão do PDF');
assert.equal((html.match(/>Exportar PDF</g) ?? []).length, 1, 'um botão só');
assert.match(html, /Introdução aprovada para o cliente/, 'a página continua usando a introdução aprovada');
assert.match(html, /Análise aprovada da seção/, 'a página continua usando a análise aprovada por seção');
assert.match(html, /Observação pública do fechamento/, 'a página continua usando a observação pública');

const semComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const fonteBotao = semComentarios(readFileSync(new URL('../src/reports/pdf/BotaoPdfRelatorio.tsx', import.meta.url), 'utf8'));
assert.match(fonteBotao, /\/api\/relatorio-pdf\?token=/, 'o botão baixa o arquivo do servidor');
assert.doesNotMatch(fonteBotao, /@react-pdf/, 'o navegador não gera PDF — o gerador é um só, no servidor');
assert.doesNotMatch(fonteBotao, /window\.print|Usar impressão/, 'a impressão da página não é plano B de PDF');

const esqueleto = semComentarios(readFileSync(new URL('../src/reports/Esqueleto.tsx', import.meta.url), 'utf8'));
assert.doesNotMatch(esqueleto, /window\.print/, 'nenhuma tela oferece a impressão da página como PDF');

const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
assert.match(css, /@media print[\s\S]*?\.dc-topo__pdf,[\s\S]*?display:\s*none/, 'o controle continua fora da impressão da tela');

/* ---- 2) a marca ---- */
const id = karyneMontada202607.identidade;
assert.equal(marcaDoRelatorio({ ...id, carteira: undefined }).id, 'dacora', 'sem carteira é Dácora');
assert.equal(marcaDoRelatorio({ ...id, carteira: 'DACORA' }).id, 'dacora');
assert.equal(marcaDoRelatorio({ ...id, carteira: 'ALLGROTECH' }).id, 'allgrotech', 'carteira Allgrotech sai com a marca Allgrotech');
assert.equal(marcaDoRelatorio({ ...id, carteira: 'allgrotech ' }).id, 'allgrotech', 'grafia da carteira não pode derrubar a marca');
assert.equal(
  marcaDoRelatorio({ ...id, carteira: 'ALLGROTECH', marca: { id: 'dacora', nome: 'Dácora', assinatura: 'Dácora Performance Digital' } }).id,
  'dacora',
  'marca explícita no snapshot ganha da carteira',
);
assert.equal(nomeDoArquivoPdf(karyneMontada202607), 'Dacora-Karyne-Magalhaes-2026-07-v1.pdf', 'nome estável, sem acento');
assert.equal(
  nomeDoArquivoPdf({ ...karyneMontada202607, identidade: { ...id, carteira: 'ALLGROTECH' } }),
  'Allgrotech-Karyne-Magalhaes-2026-07-v1.pdf',
  'o arquivo de cliente Allgrotech abre com o nome da Allgrotech',
);

/* ---- 3) o arquivo ---- */
for (const carteira of ['DACORA', 'ALLGROTECH']) {
  const snapshot = { ...karyneMontada202607, identidade: { ...id, carteira } };
  const pdf = await gerarPdfDoRelatorio({ snapshot, analisesPublicadas, observacoesPublicas, imagens: new Map() });
  const bruto = pdf.toString('latin1');
  assert.ok(bruto.startsWith('%PDF-'), `${carteira}: o servidor devolve um PDF`);
  const paginas = (bruto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  assert.ok(paginas >= 3, `${carteira}: capa + conteúdo em mais de uma folha (saíram ${paginas})`);
  assert.match(bruto, /\/MediaBox\s*\[0 0 841\.89\d* 595\.28\d*\]/, `${carteira}: A4 paisagem, nunca Carta`);
}

/* ---- 4) as armadilhas do motor ---- */
for (const arquivo of ['../src/reports/pdf/RelatorioPdf.tsx', '../src/reports/pdf/graficosPdf.tsx']) {
  const codigo = semComentarios(readFileSync(new URL(arquivo, import.meta.url), 'utf8'));
  assert.ok(codigo.length > 2000, `${arquivo}: a leitura veio vazia — tudo abaixo passaria por vacuidade`);
  assert.doesNotMatch(codigo, /minHeight/, `${arquivo}: minHeight explode quando o motor move a peça de folha`);
  assert.doesNotMatch(codigo, /SvgText|Text as Svg/, `${arquivo}: texto dentro de <Svg> corrompe a medição do que vem depois`);
}
const documento = semComentarios(readFileSync(new URL('../src/reports/pdf/RelatorioPdf.tsx', import.meta.url), 'utf8'));
assert.equal((documento.match(/\bfixed\b/g) ?? []).length, 3, 'só cabeçalho, fio e rodapé são fixos — cabeçalho de tabela repetido falhou duas vezes');
const pagina = documento.slice(documento.indexOf('pagina: {'), documento.indexOf('cabecalho: {'));
assert.ok(pagina.length > 50, 'a fatia do estilo da folha veio vazia');
assert.doesNotMatch(pagina, /lineHeight/, 'entrelinha na folha é herdada e remultiplicada a cada folha nova');

console.log('verifica-relatorio-pdf-dedicado: ok');
