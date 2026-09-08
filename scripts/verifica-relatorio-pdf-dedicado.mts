import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RelatorioPublicoApresentado } from '../src/pages/RelatorioPublico.tsx';
import { nomeDoArquivoPdf } from '../src/reports/pdf/BotaoPdfRelatorio.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const analisesPublicadas = [
  { secao: 'introducao', texto: 'Introdução aprovada para o cliente.' },
  { secao: 'bloco:numeros-meta', texto: 'Análise aprovada da seção.' },
];
const observacoesPublicas = [
  { secao: 'relatorio_inteiro', texto: 'Observação pública do fechamento.' },
];

const html = renderToStaticMarkup(createElement(RelatorioPublicoApresentado, {
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

assert.match(html, /class="dc-topo__pdf"/, 'o relatório do link precisa montar o gerador dedicado no lugar do fallback');
assert.match(html, />Exportar PDF</, 'o mesmo botão visível continua no cabeçalho');
assert.equal((html.match(/>Exportar PDF</g) ?? []).length, 1, 'o link público não pode montar o botão antigo junto do novo');
assert.match(html, /Introdução aprovada para o cliente/, 'a página continua usando a introdução aprovada');
assert.match(html, /Análise aprovada da seção/, 'a página continua usando a análise aprovada por seção');
assert.match(html, /Observação pública do fechamento/, 'a página continua usando a observação pública');

assert.equal(
  nomeDoArquivoPdf(karyneMontada202607),
  'Dacora-Karyne-Magalhaes-2026-07-v1.pdf',
  'o download precisa ter nome estável, sem acentos ou identificadores internos',
);

const fonteBotao = readFileSync(new URL('../src/reports/pdf/BotaoPdfRelatorio.tsx', import.meta.url), 'utf8');
assert.match(fonteBotao, /import\('@react-pdf\/renderer'\)/, 'a biblioteca pesada precisa carregar somente no clique');
assert.match(fonteBotao, /snapshot, analisesPublicadas, observacoesPublicas/, 'o PDF recebe as três camadas da mesma resposta pública');
assert.match(fonteBotao, /Usar impressão/, 'uma falha do motor dedicado precisa conservar a impressão como fallback explícito');

const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
assert.match(css, /@media print[\s\S]*?\.dc-topo__pdf,[\s\S]*?display:\s*none/, 'o controle inteiro precisa ficar fora da impressão');

console.log('verifica-relatorio-pdf-dedicado: ok');
