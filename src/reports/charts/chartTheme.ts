/**
 * ARQUIVO ÚNICO DE TEMA DOS GRÁFICOS.
 *
 * Cor, espessura, grade, tipografia de eixo, altura, margem e formato de
 * número saem daqui e de mais nenhum lugar. Nenhum componente de gráfico
 * escreve um hexadecimal, um `px` ou um `toFixed` no próprio arquivo.
 *
 * É o que garante que o quinto gráfico se pareça com o primeiro.
 *
 * As duas propostas visuais compartilham o mesmo esqueleto e a mesma paleta:
 * o que muda é grade, espessura, preenchimento e marcador — declarado aqui em
 * um único lugar, e não espalhado em `if` dentro dos gráficos.
 *
 * Catálogo fechado de gráficos (decisão do plano, seção 7):
 *   1. evolução no tempo ......... EvolucaoNoTempo.tsx
 *   2. comparação entre canais ... ComparacaoEntreCanais.tsx
 *   3. tabela de campanhas ....... TabelaDeCampanhas.tsx
 * Nada além disso sem decisão do PO.
 */

import type { PlataformaId, Unidade } from '../snapshot';
import { formatarEixo, formatarNumero } from '../format';

export type PropostaId = 'A' | 'B';

/**
 * Paleta do relatório, derivada dos tokens da marca em src/index.css.
 * Nenhuma cor de plataforma (azul Meta, azul/verde/amarelo Google) entra aqui:
 * a linguagem é a da Dácora, e a distinção entre canais é feita por
 * luminosidade + traço + textura, não só por matiz.
 */
export const PALETA = {
  verde: '#014029', // dacora-primary
  verdeMedio: '#02593A', // dacora-medium
  tinta: '#0D1F18', // dacora-dark
  cinza: '#4A5E55', // dacora-gray
  sage: '#8A9E95', // dacora-sage
  /**
   * Degrau intermediário da MESMA rampa verde-cinza da marca, entre `cinza` e
   * `sage`. Entrou para o Pinterest ter identidade própria num gráfico com
   * Meta e Google sem estrear um matiz novo. Contraste de 4,0:1 sobre branco,
   * acima do mínimo de 3:1 exigido para elemento gráfico.
   */
  sageEscuro: '#6E837A',
  papel: '#F2EFEB', // dacora-offwhite
  superficie: '#FFFFFF',
  /** Único acento fora dos tokens: sinal de atenção. Nunca é série de gráfico. */
  sinal: '#9C4B2F',
} as const;

export interface EstiloSerie {
  id: PlataformaId;
  cor: string;
  /** Padrão de traço do SVG. `undefined` = linha cheia. */
  tracejado?: string;
  /** Id do padrão de textura usado no preenchimento de barra. */
  textura: 'solido' | 'hachura';
}

export interface ChartTheme {
  proposta: PropostaId;

  /** Tipografia de eixo e rótulo dentro do SVG. */
  fonte: string;
  tamanhoEixo: number;
  espacamentoEixo: number;
  corEixo: string;
  corEixoForte: string;

  /** Grade. */
  corGrade: string;
  gradeTracejada: string | undefined;
  gradeVertical: boolean;

  /** Linhas e áreas. */
  espessuraLinha: number;
  opacidadeArea: number;
  raioPontoAtivo: number;
  /** A cada quantos pontos marcar um ponto fixo. 0 = nenhum. */
  marcarACada: number;

  /** Barras. */
  raioBarra: number;
  espessuraBarra: number;
  espacoEntreBarras: number;

  /** Alturas responsivas (px). */
  altura: { celular: number; desktop: number };
  margem: { top: number; right: number; bottom: number; left: number };

  series: Record<PlataformaId, EstiloSerie>;

  /** Formatação — os gráficos não formatam número por conta própria. */
  eixo: (valor: number, unidade: Unidade) => string;
  completo: (valor: number, unidade: Unidade) => string;
}

const SERIES: Record<PlataformaId, EstiloSerie> = {
  meta: { id: 'meta', cor: PALETA.verde, textura: 'solido' },
  google: { id: 'google', cor: PALETA.cinza, tracejado: '6 4', textura: 'hachura' },
  pinterest: { id: 'pinterest', cor: PALETA.sageEscuro, tracejado: '3 3', textura: 'hachura' },
  ga4: { id: 'ga4', cor: PALETA.sage, tracejado: '2 4', textura: 'hachura' },
  instagram: { id: 'instagram', cor: PALETA.verdeMedio, tracejado: '10 4', textura: 'hachura' },
  ecommerce: { id: 'ecommerce', cor: PALETA.tinta, textura: 'solido' },
};

const BASE: Omit<ChartTheme, 'proposta'> = {
  fonte: "'Red Hat Display', ui-sans-serif, system-ui, sans-serif",
  tamanhoEixo: 11,
  espacamentoEixo: 0,
  corEixo: PALETA.cinza,
  corEixoForte: PALETA.tinta,

  corGrade: 'rgba(13, 31, 24, 0.10)',
  gradeTracejada: undefined,
  gradeVertical: false,

  espessuraLinha: 2,
  opacidadeArea: 0,
  raioPontoAtivo: 4,
  marcarACada: 0,

  raioBarra: 3,
  espessuraBarra: 18,
  espacoEntreBarras: 10,

  altura: { celular: 240, desktop: 300 },
  margem: { top: 12, right: 8, bottom: 4, left: 0 },

  series: SERIES,

  eixo: formatarEixo,
  completo: formatarNumero,
};

/**
 * Único ponto onde as duas propostas divergem no gráfico.
 * Proposta A é editorial: grade tracejada quase invisível, traço mais grosso,
 * leve preenchimento sob a linha — parece impresso.
 * Proposta B é analítica: grade contínua fina, traço mais leve, marcadores
 * semanais, sem preenchimento — parece instrumento de medida.
 */
export function criarChartTheme(proposta: PropostaId): ChartTheme {
  if (proposta === 'A') {
    return {
      ...BASE,
      proposta,
      corGrade: 'rgba(13, 31, 24, 0.09)',
      gradeTracejada: '2 6',
      espessuraLinha: 2.25,
      opacidadeArea: 0.1,
      raioBarra: 2,
      espessuraBarra: 20,
      tamanhoEixo: 11,
      espacamentoEixo: 0.02,
    };
  }
  return {
    ...BASE,
    proposta,
    corGrade: 'rgba(13, 31, 24, 0.08)',
    gradeTracejada: undefined,
    espessuraLinha: 1.75,
    opacidadeArea: 0,
    marcarACada: 7,
    raioBarra: 6,
    espessuraBarra: 16,
    tamanhoEixo: 11.5,
    espacamentoEixo: 0.06,
    altura: { celular: 250, desktop: 320 },
  };
}

/** Id do padrão SVG de textura, por plataforma. */
export function idTextura(proposta: PropostaId, plataforma: PlataformaId): string {
  return `dc-hachura-${proposta}-${plataforma}`;
}

/** Preenchimento de barra: cor sólida ou textura hachurada. */
export function preenchimentoBarra(theme: ChartTheme, plataforma: PlataformaId): string {
  const estilo = theme.series[plataforma];
  return estilo.textura === 'hachura'
    ? `url(#${idTextura(theme.proposta, plataforma)})`
    : estilo.cor;
}
