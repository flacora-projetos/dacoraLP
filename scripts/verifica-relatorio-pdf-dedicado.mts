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
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RelatorioPublicoApresentado } from '../src/pages/RelatorioPublico.tsx';
import { nomeDoArquivoPdf } from '../src/reports/pdf/nomeDoArquivo.ts';
import { marcaDoRelatorio } from '../src/reports/marcas.ts';
import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';
import { destaquesDaCapa } from '../src/reports/pdf/capa.ts';

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
assert.equal(
  nomeDoArquivoPdf({ ...karyneMontada202607, identidade: { ...id, clienteNome: 'AllgroTech', carteira: 'ALLGROTECH' } }),
  'Allgrotech-2026-07-v1.pdf',
  'o relatório da própria agência não repete o nome dela',
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

/* ---- 5) o limite de funções da Vercel ---- */
const funcoes = readdirSync(new URL('../api/', import.meta.url)).filter((nome) => /\.ts$/.test(nome) && !nome.startsWith('_'));
assert.ok(funcoes.length <= 12, `o plano Hobby aceita 12 funções e há ${funcoes.length}: a publicação falha inteira (exceeded_serverless_functions_per_deployment)`);
const rotas = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
assert.match(rotas, /"src":\s*"\/api\/relatorio-pdf",\s*"dest":\s*"\/api\/relatorio-publico\?formato=pdf"/, 'o endereço do PDF é encaminhado para a função do relatório público');
assert.ok(rotas.indexOf('/api/relatorio-pdf') < rotas.indexOf('"/api/(.*)"'), 'o encaminhamento do PDF vem antes da regra genérica de /api');
const configuracao = JSON.parse(rotas);
assert.match(
  String(configuracao.functions?.['api/relatorio-publico.ts']?.includeFiles ?? ''),
  /node_modules\/pdfkit\/js\/.*standard-fonts/,
  'as fontes-padrão do pdfkit precisam ir junto da função, senão ela cai inteira na Vercel',
);

/* ---- 6) o pacote que a função usa é o código-fonte de hoje ---- */
{
  const { empacotar, DESTINO } = await import('./empacotar-pdf.mjs');
  const versionado = readFileSync(DESTINO, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(versionado, await empacotar(), 'api/_pdf-empacotado.js está velho: rode `node scripts/empacotar-pdf.mjs` e versione o resultado');
  const funcao = semComentarios(readFileSync(new URL('../api/_relatorio-pdf.ts', import.meta.url), 'utf8'));
  assert.match(funcao, /from '\.\/_pdf-empacotado\.js'/, 'a função usa o gerador empacotado, nunca o .tsx direto (a Vercel não compila .tsx)');
}

/* ---- 7) a capa soma as plataformas (07/10/2026) ---- */
{
  // Até 07/10 a capa era a primeira faixa: "O mês em números" com o Meta só.
  const k = karyneMontada202607;
  const trocar = (faixa: string, id: string, muda: (m: any) => any) => ({
    ...k,
    dados: {
      ...k.dados,
      faixas: {
        ...k.dados.faixas,
        [faixa]: { ...k.dados.faixas[faixa], metricas: k.dados.faixas[faixa].metricas.map((m: any) => (m.id === id ? muda(m) : m)) },
      },
    },
  });
  const numero = (d: any) => (d.valor.estado === 'ok' ? d.valor.numero : d.valor.estado);

  const leads = destaquesDaCapa(k);
  assert.deepEqual(leads.map((d) => d.rotulo), ['Investimento', 'Leads'], 'leads: investimento total + leads totais');
  assert.equal(numero(leads[0]), 1864.89, 'investimento = Meta 863,91 + Google 1.000,98');
  assert.equal(numero(leads[1]), 38, 'leads = Meta 22 + Google 16');
  assert.deepEqual(leads[0].detalhe?.map((linha) => linha.replace(/\s/g, ' ')), ['Meta Ads R$ 863,91', 'Google Ads R$ 1.000,98'], 'a capa diz de onde a soma veio');
  assert.equal(leads[1].comparativo?.valorBase?.estado === 'ok' && leads[1].comparativo.valorBase.numero, 121, 'a base também é a soma: 85 + 36');
  assert.ok(Math.abs((leads[0].comparativo?.variacao ?? 0) - (1864.89 / 1923.35 - 1)) < 1e-9, 'variação da soma contra a soma das bases');

  const nomesDiferentes = destaquesDaCapa(trocar('faixa_google', 'google_conversoes', (m) => ({ ...m, rotulo: 'Conversões' })));
  assert.deepEqual(nomesDiferentes.map((d) => d.rotulo), ['Investimento', 'Leads · Meta Ads', 'Conversões · Google Ads'], 'nome diferente não soma');

  const venda = destaquesDaCapa({ ...k, identidade: { ...k.identidade, tipoRelatorio: 'ecommerce' } });
  assert.deepEqual(venda.map((d) => d.rotulo), ['Investimento', 'Leads · Meta Ads', 'Leads · Google Ads'], 'e-commerce nunca soma resultado');

  const semBase = destaquesDaCapa(trocar('faixa_google', 'google_investimento', (m) => ({ ...m, comparativo: { permitido: false, motivo: 'x' } })));
  assert.equal(semBase[0].comparativo, undefined, 'parte sem base: a soma não inventa variação');
  const outroMes = destaquesDaCapa(trocar('faixa_google', 'google_investimento', (m) => ({ ...m, comparativo: { ...m.comparativo, competenciaBase: '2026-05' } })));
  assert.equal(outroMes[0].comparativo, undefined, 'bases de meses diferentes não se somam');
  const fracionado = destaquesDaCapa(trocar('faixa_google', 'google_conversoes', (m) => ({ ...m, rotulo: 'Compras', unidade: 'decimal', valor: { estado: 'ok', numero: 16.5 } })));
  assert.equal(fracionado[2].unidade, 'decimal', '16,5 compras continua decimal');

  const googleParado = trocar('faixa_google', 'google_investimento', (m) => ({ ...m, valor: { estado: 'nao_aplicavel', motivo: 'sem campanha' } }));
  assert.deepEqual(destaquesDaCapa(googleParado).map((d) => d.id), ['meta_investimento', 'meta_cpm', 'meta_cpc', 'meta_resultado'], 'plataforma sem campanha não conta: volta a ser a primeira faixa');

  const faltou = destaquesDaCapa(trocar('faixa_google', 'google_investimento', (m) => ({ ...m, valor: { estado: 'ausente', motivo: 'não veio' } })));
  assert.deepEqual(faltou.map((d) => d.rotulo), ['Investimento · Meta Ads', 'Investimento · Google Ads'], 'investimento que não veio não vira zero numa soma');

  const mista = trocar('faixa_meta', 'meta_resultado', (m) => ({ ...m, id: 'meta_resultado_grupo_1' }));
  mista.dados.faixas.faixa_meta.metricas.push({ ...mista.dados.faixas.faixa_meta.metricas.find((m: any) => m.id === 'meta_resultado_grupo_1'), id: 'meta_resultado_grupo_2', rotulo: 'Conversas' });
  mista.dados.faixas.faixa_meta.metricas.push({ ...mista.dados.faixas.faixa_meta.metricas.find((m: any) => m.id === 'meta_resultado_grupo_1'), id: 'meta_resultado_grupo_3', rotulo: 'Visitas' });
  assert.deepEqual(
    destaquesDaCapa(mista).map((d) => d.rotulo),
    ['Investimento', 'Leads · Meta Ads', 'Leads · Google Ads', 'Conversas · Meta Ads'],
    'conta mista do Meta não empurra o Google para fora da capa',
  );

  const decimal = destaquesDaCapa(trocar('faixa_google', 'google_conversoes', (m) => ({ ...m, rotulo: 'Compras', unidade: 'decimal' })));
  assert.equal(decimal[2].unidade, 'inteiro', '16 compras não se escrevem "16,00"');

  const umaSo = { ...k, montagem: k.montagem.filter((m: any) => m.bloco !== 'B1' || m.faixa !== 'faixa_google') };
  assert.deepEqual(destaquesDaCapa(umaSo).map((d) => d.id), ['meta_investimento', 'meta_cpm', 'meta_cpc', 'meta_resultado'], 'uma plataforma só: a capa não muda');
}

console.log('verifica-relatorio-pdf-dedicado: ok');
