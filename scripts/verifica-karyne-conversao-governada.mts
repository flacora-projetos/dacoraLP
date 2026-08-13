import assert from 'node:assert/strict';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';
import { termosDoGlossario } from '../src/reports/glossario.ts';

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
assert.equal(valorNumero(metaCusto.comparativo?.valorBase, 'Karyne/Meta CPL base junho'), 14.12, 'CPL de junho usa o investimento e o resultado governado do mês');
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

/* ------------------------------------------------------------------ */
/* Fechamento entre blocos                                             */
/* ------------------------------------------------------------------ */

/**
 * A trava acima olhava um bloco de cada vez, e por isso não viu o defeito que
 * a correção de 12/08 deixou para trás: a faixa passou a 16 leads enquanto a
 * tabela de grupos e a série diária continuaram somando 21, cada uma AFIRMANDO
 * por escrito que fechava com a faixa. Bloco certo sozinho não basta — o que o
 * cliente lê é a página inteira, e é o cruzamento que precisa ser provado.
 */

const centavos = (numero: number) => Math.round(numero * 100);
const doisDecimais = (numero: number) => Math.round(numero * 100) / 100;

function somaDeLinhas(linhas: Array<{ valores: Record<string, any> }>, coluna: string) {
  return linhas.reduce((total, linha) => {
    const valor = linha.valores[coluna];
    return valor?.estado === 'ok' ? total + valor.numero : total;
  }, 0);
}

const metaInvestimento = meta.metricas.find((m) => m.id === 'meta_investimento');
const googleInvestimento = google.metricas.find((m) => m.id === 'google_investimento');
const googleCliques = google.metricas.find((m) => m.id === 'google_cliques');

// 1. A tabela de grupos declara que fecha com a conta. Então tem que fechar.
const grupos = karyneMontada202607.dados.tabelas.grupos_de_anuncios;
assert.match(
  grupos.definicoes?.join(' ') ?? '',
  /fecha com o total da conta/i,
  'a tabela de grupos deve continuar declarando que fecha com a conta',
);
for (const [coluna, metrica, contexto] of [
  ['custo', googleInvestimento, 'investimento'],
  ['cliques', googleCliques, 'cliques'],
  ['conversoes', googleResultado, 'resultado'],
] as const) {
  const somaLinhas = somaDeLinhas(grupos.linhas, coluna);
  const total = valorNumero(grupos.total?.valores?.[coluna], `grupos/total ${contexto}`);
  const naFaixa = valorNumero(metrica?.valor, `faixa google ${contexto}`);
  assert.equal(centavos(somaLinhas), centavos(total), `grupos: a soma das linhas de ${contexto} nao fecha com o total da tabela`);
  assert.equal(centavos(total), centavos(naFaixa), `grupos: o total de ${contexto} nao fecha com a faixa do Google`);
}
assert.equal(
  valorNumero(grupos.total?.valores?.custo_conversao, 'grupos/total custo por lead'),
  valorNumero(googleCusto?.valor, 'faixa google custo por lead'),
  'grupos: o custo por resultado do total precisa ser o mesmo da faixa',
);
for (const linha of grupos.linhas) {
  const resultado = linha.valores.conversoes;
  const custo = linha.valores.custo;
  const custoPorResultado = linha.valores.custo_conversao;
  if (resultado?.estado !== 'ok' || custo?.estado !== 'ok' || resultado.numero === 0) continue;
  assert.equal(
    valorNumero(custoPorResultado, `grupos/${linha.id} custo por resultado`),
    doisDecimais(custo.numero / resultado.numero),
    `grupos/${linha.id}: custo por resultado precisa ser investimento ÷ resultado`,
  );
}

// 2. A série diária afirma na tela de quanto é a soma dela. A frase é conferida.
const serie = karyneMontada202607.dados.series.conversoes_dia;
const somaDaSerie = serie.pontos.reduce(
  (total, ponto) => total + (typeof ponto.valores.conversoes === 'number' ? ponto.valores.conversoes : 0),
  0,
);
assert.equal(
  somaDaSerie,
  valorNumero(googleResultado?.valor, 'faixa google resultado'),
  'a soma dos dias precisa ser o mesmo resultado do Google mostrado na faixa',
);
assert.match(
  serie.observacoes?.join(' ') ?? '',
  new RegExp(`A soma dos dias é ${somaDaSerie}\\b`),
  'a observação da série precisa dizer a soma que a série realmente tem',
);

// 3. Tabela parcial nunca pode passar o total da conta em nenhuma coluna.
for (const parcial of [
  karyneMontada202607.dados.tabelas.palavras_chave,
  karyneMontada202607.dados.tabelas.termos_de_pesquisa,
]) {
  assert.ok(parcial.cobertura, `${parcial.id}: tabela que não fecha precisa declarar cobertura`);
  const custoParcial = valorNumero(parcial.total?.valores?.custo, `${parcial.id} custo`);
  const resultadoParcial = valorNumero(parcial.total?.valores?.conversoes, `${parcial.id} resultado`);
  assert.ok(
    centavos(custoParcial) <= centavos(valorNumero(googleInvestimento?.valor, 'faixa google investimento')),
    `${parcial.id}: a soma parcial de investimento nao pode passar a conta inteira`,
  );
  assert.ok(
    resultadoParcial <= valorNumero(googleResultado?.valor, 'faixa google resultado'),
    `${parcial.id}: a soma parcial de resultado nao pode passar a conta inteira`,
  );
}

// 4. A base de comparação de junho é a MESMA em toda a página.
const junhoMeta = evolucaoMeta.meses.find((m) => m.competencia === '2026-06');
const junhoGoogle = evolucaoGoogle.meses.find((m) => m.competencia === '2026-06');
const custoJunhoMeta = valorNumero(junhoMeta?.valores.custo, 'junho Meta custo');
const custoJunhoGoogle = valorNumero(junhoGoogle?.valores.custo, 'junho Google custo');
const resultadoJunhoMeta = valorNumero(junhoMeta?.valores.resultado, 'junho Meta resultado');
const resultadoJunhoGoogle = valorNumero(junhoGoogle?.valores.conversoes, 'junho Google resultado');

assert.equal(
  valorNumero(metaInvestimento?.comparativo?.valorBase, 'base junho investimento Meta'),
  custoJunhoMeta,
  'o investimento de junho da faixa Meta precisa ser o mesmo da evolução do ano',
);
assert.equal(
  valorNumero(googleInvestimento?.comparativo?.valorBase, 'base junho investimento Google'),
  custoJunhoGoogle,
  'o investimento de junho da faixa Google precisa ser o mesmo da evolução do ano',
);
assert.equal(
  valorNumero(metaCusto?.comparativo?.valorBase, 'base junho CPL Meta'),
  doisDecimais(custoJunhoMeta / resultadoJunhoMeta),
  'o custo por lead de junho no Meta precisa sair do investimento e do resultado de junho',
);
assert.equal(
  valorNumero(googleCusto?.comparativo?.valorBase, 'base junho CPL Google'),
  doisDecimais(custoJunhoGoogle / resultadoJunhoGoogle),
  'o custo por lead de junho no Google precisa sair do investimento e do resultado de junho',
);

// 5. Toda variação impressa tem que sair do próprio par valor/base.
for (const faixa of [meta, google]) {
  for (const metrica of faixa.metricas) {
    const comparativo = metrica.comparativo;
    if (!comparativo?.permitido || comparativo.valorBase?.estado !== 'ok') continue;
    const base = comparativo.valorBase.numero;
    if (base === 0) continue;
    const atual = valorNumero(metrica.valor, `${metrica.id} valor`);
    // Cada métrica arredonda a variação na casa que ela mesma publica; a
    // conferência usa essa casa, senão a trava reprovaria o arredondamento.
    const casas = (String(comparativo.variacao).split('.')[1] ?? '').length;
    assert.equal(
      comparativo.variacao,
      Number((atual / base - 1).toFixed(Math.max(casas, 1))),
      `${metrica.id}: a variação impressa não sai de ${atual} contra ${base}`,
    );
  }
}

// 6. O glossário nunca explica a mesma coisa duas vezes — nem por montagem
//    repetida, nem por descuido do catálogo.
const b7 = karyneMontada202607.montagem.find((secao: any) => secao.bloco === 'B7');
assert.ok(b7, 'a Karyne precisa continuar com o glossário no rodapé');
const idsDoGlossario = (b7 as any).metricas as string[];
assert.deepEqual(
  idsDoGlossario,
  [...new Set(idsDoGlossario)],
  'a montagem do glossário não pode repetir o mesmo termo',
);
assert.deepEqual(
  termosDoGlossario(['cpm', 'cpm', 'cpc']).map((t) => t.id),
  ['cpm', 'cpc'],
  'o catálogo do glossário precisa deduplicar mesmo se a montagem repetir',
);

console.log('OK - Karyne usa conversao governada por vigencia: historico preservado, junho misto, julho 22/16 e comparacao contextualizada sem regra especial.');
console.log('OK - fechamento entre blocos: grupos, serie diaria e faixa batem; parciais declaram cobertura; junho e a mesma base em toda a pagina.');
