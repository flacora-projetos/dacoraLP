/**
 * OS NÚMEROS DA CAPA DO PDF — "O mês em números" (07/10/2026).
 *
 * Até esta data a capa pegava a PRIMEIRA faixa de indicadores da montagem e
 * mostrava as quatro primeiras métricas. No relatório de geração de leads a
 * montagem se organiza por plataforma e o Meta vem antes, então a capa da
 * Karyne (setembro/2026) dizia "O mês em números" e mostrava só o Meta —
 * R$ 886,23 e 24 leads — com R$ 1.055,07 e 38 leads do Google fora da capa.
 * Ninguém decidiu isso: foi efeito de "pegar a primeira faixa". Pedido do PO
 * em 07/10/2026: a capa soma as plataformas.
 *
 * ⚠️ EXCEÇÃO DECLARADA à regra "toda matemática vem pronta do snapshot".
 * O snapshot não grava total entre plataformas, e o PO pediu a correção SEM
 * regerar relatório (regerar recoleta das APIs e muda dados). As únicas contas
 * daqui são SOMAS de números que já estão impressos nas páginas de cada
 * plataforma, e a variação dessa soma contra a soma das bases do mesmo mês.
 *
 * O que soma e o que não soma — a régua da casa, não preferência:
 *  - INVESTIMENTO soma sempre (cada real só foi gasto uma vez).
 *  - RESULTADO soma só no relatório de geração de leads e só quando TODAS as
 *    plataformas chamam o resultado pelo MESMO nome (Leads + Leads). Nome
 *    diferente é coisa diferente: "Conversões" do Google pode incluir visita
 *    de página, e somar com lead do Meta inventa lead.
 *  - VENDA nunca soma (relatório de e-commerce): cada plataforma reivindica a
 *    mesma compra, e a soma inventa faturamento — mesma régua da receita.
 *    Ali a capa mostra o resultado de cada plataforma lado a lado.
 *  - Custo por resultado NÃO vai para a capa como soma: o do Meta é apurado só
 *    nas campanhas mapeadas para a conversão, então "investimento total ÷
 *    resultado total" sairia MAIOR que o custo de cada plataforma, e a capa
 *    contradiria as páginas de dentro.
 *  - Cliente com uma plataforma só: nada muda, a capa continua sendo a
 *    primeira faixa.
 */
import type { Comparativo, Metrica, PlataformaId, Unidade, Valor } from '../snapshot';
import type { SnapshotMontado } from '../blocos/tipos';
import { formatarNumero } from '../format.js';

/** Métrica da capa, com a linha que diz de onde a soma veio. */
export interface DestaqueDaCapa extends Metrica {
  /** ["Meta Ads R$ 886,23", "Google Ads R$ 1.055,07"] — só nos números somados. */
  detalhe?: string[];
}

/** As métricas que identificam cada plataforma de mídia na faixa dela. */
const PLATAFORMAS_DE_MIDIA: Array<{ plataforma: PlataformaId; investimento: string; resultado: string }> = [
  { plataforma: 'meta', investimento: 'meta_investimento', resultado: 'meta_resultado' },
  { plataforma: 'google', investimento: 'google_investimento', resultado: 'google_conversoes' },
  { plataforma: 'pinterest', investimento: 'pinterest_investimento', resultado: 'pinterest_resultado' },
];

interface Midia {
  plataforma: PlataformaId;
  rotulo: string;
  investimento: Metrica;
  /** O resultado único da plataforma, quando ela tem um. */
  resultado?: Metrica;
  /**
   * Conta mista do Meta: um resultado por conversão contratada
   * (`meta_resultado_grupo_N`) e nenhum total — ver `montagem.js` da fábrica.
   */
  resultadosPorConversao: Metrica[];
}

/**
 * Relatórios cujo resultado é contato (lead, conversa), e não venda. O small
 * cap é o formato enxuto do de leads e grava `small_cap` na identidade.
 */
const TIPOS_QUE_SOMAM_RESULTADO = new Set(['servicos_leads', 'small_cap']);

const ok = (valor: Valor | undefined): valor is { estado: 'ok'; numero: number } =>
  valor?.estado === 'ok' && Number.isFinite(valor.numero);

const arredondar = (numero: number, casas: number) => Math.round(numero * 10 ** casas) / 10 ** casas;

const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('pt-BR');

function primeiraFaixa(snapshot: SnapshotMontado): Metrica[] {
  const primeira = snapshot.montagem.find((config) => config.bloco === 'B1' && !config.indisponivel);
  if (!primeira || primeira.bloco !== 'B1') return [];
  return (snapshot.dados.faixas[primeira.faixa]?.metricas ?? []).slice(0, 4);
}

/** As plataformas de mídia publicadas, na ordem em que a montagem as mostra. */
function midiasPublicadas(snapshot: SnapshotMontado): Midia[] {
  const midias: Midia[] = [];
  for (const config of snapshot.montagem) {
    if (config.bloco !== 'B1' || config.indisponivel) continue;
    const metricas = snapshot.dados.faixas[config.faixa]?.metricas ?? [];
    for (const def of PLATAFORMAS_DE_MIDIA) {
      if (midias.some((midia) => midia.plataforma === def.plataforma)) continue;
      const investimento = metricas.find((metrica) => metrica.id === def.investimento);
      // "Não se aplica" é plataforma sem campanha no mês (Google da Daniela
      // Moraes em setembro/2026): ela não conta como segunda plataforma.
      if (!investimento || investimento.valor.estado === 'nao_aplicavel') continue;
      const rotulo = snapshot.fontes.find((fonte) => fonte.plataforma === def.plataforma)?.rotulo ?? def.plataforma;
      midias.push({
        plataforma: def.plataforma,
        rotulo,
        investimento,
        resultado: metricas.find((metrica) => metrica.id === def.resultado),
        resultadosPorConversao: metricas.filter((metrica) => metrica.id.startsWith(`${def.resultado}_grupo_`)),
      });
    }
  }
  return midias;
}

/**
 * A variação da soma: só existe quando TODAS as partes têm base comparável no
 * MESMO mês. Uma parte sem base tornaria a soma da base menor que a real e a
 * variação, falsa — nesse caso a capa não mostra variação nenhuma.
 */
function comparativoDaSoma(metricas: Metrica[], total: number, casas: number): Comparativo | undefined {
  const comparativos = metricas.map((metrica) => metrica.comparativo);
  if (comparativos.some((comp) => !comp?.permitido || !ok(comp.valorBase) || !comp.competenciaBase)) return undefined;
  const competenciaBase = comparativos[0]!.competenciaBase;
  if (comparativos.some((comp) => comp!.competenciaBase !== competenciaBase)) return undefined;
  const base = arredondar(
    comparativos.reduce((soma, comp) => soma + (comp!.valorBase as { numero: number }).numero, 0),
    casas,
  );
  if (base <= 0) return undefined;
  return {
    permitido: true,
    competenciaBase,
    valorBase: { estado: 'ok', numero: base },
    variacao: (total - base) / base,
  };
}

/**
 * O Google entrega conversão como decimal (atribuição fracionada), e 38 leads
 * não se escrevem "38,00". Só vira inteiro quando o número e a base são
 * inteiros; 108,05 compras continua 108,05.
 */
function unidadeLegivel(metrica: Metrica): Unidade {
  if (metrica.unidade !== 'decimal') return metrica.unidade;
  const inteiros = [metrica.valor, metrica.comparativo?.valorBase]
    .filter((valor): valor is Valor => Boolean(valor))
    .every((valor) => !ok(valor) || Number.isInteger(valor.numero));
  return inteiros ? 'inteiro' : 'decimal';
}

function detalheDe(midias: Midia[], escolher: (midia: Midia) => Metrica): string[] {
  return midias.map((midia) => {
    const metrica = escolher(midia);
    return `${midia.rotulo} ${formatarNumero((metrica.valor as { numero: number }).numero, unidadeLegivel(metrica))}`;
  });
}

function somar(midias: Midia[], escolher: (midia: Midia) => Metrica, id: string, rotulo: string): DestaqueDaCapa {
  const metricas = midias.map(escolher);
  const brl = metricas.every((metrica) => metrica.unidade === 'brl');
  const casas = brl ? 2 : 6;
  const bruto = arredondar(metricas.reduce((soma, metrica) => soma + (metrica.valor as { numero: number }).numero, 0), casas);
  const unidade: Unidade = brl ? 'brl' : Number.isInteger(bruto) ? 'inteiro' : 'decimal';
  return {
    id,
    rotulo,
    unidade,
    valor: { estado: 'ok', numero: bruto },
    origem: {
      tipo: 'calculado',
      fontes: midias.map((midia) => midia.plataforma),
      formula: `soma de ${midias.map((midia) => midia.rotulo).join(' e ')}`,
    },
    direcaoFavoravel: metricas[0].direcaoFavoravel,
    comparativo: comparativoDaSoma(metricas, bruto, casas),
    detalhe: detalheDe(midias, escolher),
  };
}

/** A métrica de uma plataforma só, com o nome da plataforma no rótulo. */
function daPlataforma(metrica: Metrica, midia: Midia): DestaqueDaCapa {
  return { ...metrica, unidade: unidadeLegivel(metrica), rotulo: `${metrica.rotulo} · ${midia.rotulo}` };
}

export function destaquesDaCapa(snapshot: SnapshotMontado): DestaqueDaCapa[] {
  const midias = midiasPublicadas(snapshot);
  if (midias.length < 2) return primeiraFaixa(snapshot);

  // Investimento que não veio não vira zero: sem todas as partes, não há soma,
  // e a capa mostra cada plataforma com o próprio número ou o próprio motivo.
  if (!midias.every((midia) => ok(midia.investimento.valor))) {
    return midias.slice(0, 4).map((midia) => daPlataforma(midia.investimento, midia));
  }

  const destaques: DestaqueDaCapa[] = [
    somar(midias, (midia) => midia.investimento, 'capa_investimento_total', 'Investimento'),
  ];

  const resultados = midias.map((midia) => midia.resultado);
  const mesmoNome = resultados.every(
    (resultado) => resultado && normalizar(resultado.rotulo) === normalizar(resultados[0]!.rotulo),
  );
  const somaResultado =
    TIPOS_QUE_SOMAM_RESULTADO.has(String(snapshot.identidade.tipoRelatorio)) &&
    mesmoNome &&
    resultados.every((resultado) => ok(resultado?.valor));

  if (somaResultado) {
    destaques.push(somar(midias, (midia) => midia.resultado!, 'capa_resultado_total', resultados[0]!.rotulo));
    return destaques;
  }

  // Uma de cada plataforma por vez: na conta mista o Meta tem três ou mais
  // resultados, e em ordem simples eles ocupavam a capa inteira e o Google
  // sumia dela de novo — o mesmo defeito que esta capa existe para corrigir.
  const filas = midias.map((midia) => ({
    midia,
    resultados: midia.resultado ? [midia.resultado] : [...midia.resultadosPorConversao],
  }));
  while (destaques.length < 4 && filas.some((fila) => fila.resultados.length > 0)) {
    for (const fila of filas) {
      const resultado = fila.resultados.shift();
      if (resultado && destaques.length < 4) destaques.push(daPlataforma(resultado, fila.midia));
    }
  }
  return destaques;
}
