import assert from 'node:assert/strict';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

function valorNumero(valor: { estado: string; numero?: number } | undefined, contexto: string) {
  assert.ok(valor, `${contexto}: valor ausente`);
  assert.equal(valor.estado, 'ok', `${contexto}: deveria estar medido`);
  assert.equal(typeof valor.numero, 'number', `${contexto}: numero ausente`);
  return valor.numero;
}

const meta = karyneMontada202607.dados.faixas.faixa_meta;
const metaResultado = meta.metricas.find((m) => m.id === 'meta_resultado');
const metaCusto = meta.metricas.find((m) => m.id === 'meta_custo_resultado');
assert.ok(metaResultado, 'Karyne/Meta: meta_resultado precisa existir');
assert.equal(metaResultado.rotulo, 'Leads');
assert.equal(valorNumero(metaResultado.valor, 'Karyne/Meta julho'), 22);
assert.equal(meta.metricas.some((m) => m.id === 'meta_mensagens'), false, 'mensagens nao pode voltar a ser o KPI primario de julho');
assert.ok(metaCusto, 'Karyne/Meta: custo por resultado precisa existir');
assert.equal(metaCusto.rotulo, 'Custo por lead');
assert.equal(valorNumero(metaCusto.valor, 'Karyne/Meta CPL julho'), 39.27);
assert.equal(valorNumero(metaCusto.comparativo?.valorBase, 'Karyne/Meta CPL base junho'), 10.73, 'CPL de junho usa o resultado governado total do mês');
assert.equal(metaResultado.comparativo?.valorBase.estado, 'ok');
assert.equal(valorNumero(metaResultado.comparativo?.valorBase, 'Karyne/Meta base junho'), 85, 'comparacao mensal preserva o resultado governado total de junho');

const google = karyneMontada202607.dados.faixas.faixa_google;
const googleResultado = google.metricas.find((m) => m.id === 'google_conversoes');
const googleCusto = google.metricas.find((m) => m.id === 'google_custo_conversao');
assert.ok(googleResultado, 'Karyne/Google: resultado precisa existir');
assert.equal(googleResultado.rotulo, 'Leads');
assert.equal(valorNumero(googleResultado.valor, 'Karyne/Google julho'), 16);
assert.ok(googleCusto, 'Karyne/Google: custo por resultado precisa existir');
assert.equal(googleCusto.rotulo, 'Custo por lead');
assert.equal(valorNumero(googleCusto.valor, 'Karyne/Google CPL julho'), 62.56);
assert.equal(valorNumero(googleCusto.comparativo?.valorBase, 'Karyne/Google CPL base junho'), 20.08, 'CPL de junho usa o resultado governado total do mês');
assert.equal(googleResultado.comparativo?.valorBase.estado, 'ok');
assert.equal(valorNumero(googleResultado.comparativo?.valorBase, 'Karyne/Google base junho'), 36, 'comparacao mensal preserva o resultado governado total de junho');

const evolucaoMeta = karyneMontada202607.dados.evolucoesMensais.evolucao_meta_2026;
const serieMeta = evolucaoMeta.meses.map((m) => valorNumero(m.valores.resultado, `Meta ${m.competencia}`));
assert.deepEqual(serieMeta, [108, 138, 164, 237, 248, 85, 22]);
assert.match(evolucaoMeta.meses[0].observacao ?? '', /conversas iniciadas/i, 'antes de 22/06 o historico deve preservar conversas');
assert.match(evolucaoMeta.meses[5].observacao ?? '', /80 conversas iniciadas.*5 leads/i, 'junho Meta deve respeitar as duas vigencias');
assert.match(evolucaoMeta.meses[6].observacao ?? '', /leads da landing page/i, 'julho Meta deve usar a definicao nova');

const evolucaoGoogle = karyneMontada202607.dados.evolucoesMensais.evolucao_google_2026;
const serieGoogle = evolucaoGoogle.meses.map((m) => valorNumero(m.valores.conversoes, `Google ${m.competencia}`));
assert.deepEqual(serieGoogle, [30, 33, 35, 39, 28, 36, 16]);
assert.match(evolucaoGoogle.meses[0].observacao ?? '', /Contato WhatsApp/i, 'historico Google antigo deve preservar a acao antiga');
assert.match(evolucaoGoogle.meses[5].observacao ?? '', /30 Contato WhatsApp.*6 Whatsapp LP de Leads/i, 'junho Google deve respeitar as duas vigencias');
assert.match(evolucaoGoogle.meses[6].observacao ?? '', /Whatsapp LP de Leads/i, 'julho Google deve usar a acao nova');

const ranking = karyneMontada202607.dados.rankingsCriativos.ranking_meta;
assert.equal(ranking.ordenadoPor, 'leads');
assert.ok(ranking.criativos.every((c) => c.numeros[0]?.rotulo === 'Leads'));
assert.equal(
  ranking.criativos.reduce((total, c) => total + valorNumero(c.numeros[0]?.valor, `criativo ${c.id}`), 0),
  22,
  'ranking da demonstracao deve fechar nos 22 leads do Meta em julho',
);

const leitura = JSON.stringify(karyneMontada202607.leitura);
assert.match(leitura, /22 leads/);
assert.match(leitura, /16 leads/);
assert.doesNotMatch(leitura, /74 conversas iniciadas/i);
assert.doesNotMatch(leitura, /21 convers[oõ]es/i);
assert.match(leitura, /comparação com junho exige contexto/i);
assert.match(leitura, /leads mais quentes/i);

console.log('OK - Karyne usa conversao governada por vigencia: historico preservado, junho misto, julho 22/16 e comparacao contextualizada sem regra especial.');
