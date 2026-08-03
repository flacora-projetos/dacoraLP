/**
 * Formatação pt-BR do relatório. Tudo que vira texto de número passa por aqui,
 * para o eixo do gráfico, o card e a tabela nunca escreverem o mesmo valor de
 * dois jeitos diferentes.
 */

import type { Unidade, Valor } from './snapshot';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlSemCentavos = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentual = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const percentual1 = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatarNumero(valor: number, unidade: Unidade): string {
  switch (unidade) {
    case 'brl':
    case 'brl_por_unidade':
      return brl.format(valor);
    case 'percentual':
      return percentual.format(valor);
    case 'decimal':
      return decimal.format(valor);
    case 'inteiro':
    default:
      return inteiro.format(valor);
  }
}

/** Versão curta para eixo de gráfico, onde espaço é escasso. */
export function formatarEixo(valor: number, unidade: Unidade): string {
  if (unidade === 'brl' || unidade === 'brl_por_unidade') {
    if (Math.abs(valor) >= 1000) {
      return `R$ ${inteiro.format(Math.round(valor / 1000))} mil`;
    }
    return brlSemCentavos.format(valor);
  }
  if (unidade === 'percentual') return percentual1.format(valor);
  if (Math.abs(valor) >= 10000) {
    return `${decimal.format(valor / 1000).replace(',00', '')} mil`;
  }
  return inteiro.format(valor);
}

/** Variação com sinal explícito. 0.1404 → "+14,0%". */
export function formatarVariacao(variacao: number): string {
  const sinal = variacao > 0 ? '+' : variacao < 0 ? '−' : '';
  return `${sinal}${percentual1.format(Math.abs(variacao))}`;
}

/** Participação, sempre com uma casa. 0.7385 → "73,8%". */
export function formatarParticipacao(fracao: number): string {
  return percentual1.format(fracao);
}

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "2026-07" → "julho de 2026". */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const indice = Number(mes) - 1;
  if (!MESES[indice]) return competencia;
  return `${MESES[indice]} de ${ano}`;
}

/**
 * Formata data ISO sem passar por fuso: '2026-07-01' → '01/07'.
 * `new Date('2026-07-01')` é interpretado como UTC e volta 30/06 no Brasil —
 * essa armadilha já custou um relatório errado neste projeto.
 */
export function formatarDiaMes(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

export function formatarDataExtenso(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`;
}

/** '2026-08-04T09:12:00-03:00' → '04/08/2026 às 09h12'. */
export function formatarCarimbo(iso: string): string {
  const [data, resto] = iso.split('T');
  const [ano, mes, dia] = data.split('-');
  const hora = resto?.slice(0, 5).replace(':', 'h');
  return hora ? `${dia}/${mes}/${ano} às ${hora}` : `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(inicio: string, fim: string): string {
  return `${formatarDiaMes(inicio)} a ${formatarDiaMes(fim)}`;
}

/* ------------------------------------------------------------------ */
/* Valores em três estados                                             */
/* ------------------------------------------------------------------ */

export const ROTULO_AUSENTE = 'indisponível';
export const ROTULO_FALHA = 'falha na coleta';

/** Texto do valor, já resolvendo os três estados. Nunca devolve "0" por falta. */
export function textoValor(valor: Valor, unidade: Unidade, sufixo?: string): string {
  if (valor.estado === 'ok') {
    return formatarNumero(valor.numero, unidade) + (sufixo ?? '');
  }
  return valor.estado === 'ausente' ? ROTULO_AUSENTE : ROTULO_FALHA;
}

/**
 * Percentual com UMA casa, resolvendo os três estados.
 *
 * Existe porque `formatarNumero(..., 'percentual')` aceita até duas casas, e
 * o mesmo percentual acabava saindo "23,78%" no número grande e "23,8%" no
 * texto ao lado dele. Dois arredondamentos do mesmo valor na mesma tela fazem
 * o leitor duvidar do relatório inteiro — com razão.
 */
export function textoPercentual1(valor: Valor): string {
  if (valor.estado === 'ok') return formatarParticipacao(valor.numero);
  return valor.estado === 'ausente' ? ROTULO_AUSENTE : ROTULO_FALHA;
}

export function ehOk(valor: Valor): valor is { estado: 'ok'; numero: number } {
  return valor.estado === 'ok';
}

/** Número quando existe, `null` quando não. Usado só onde `null` é tratado. */
export function numeroOuNulo(valor: Valor): number | null {
  return valor.estado === 'ok' ? valor.numero : null;
}
