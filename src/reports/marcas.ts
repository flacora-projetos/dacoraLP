/**
 * De quem é o relatório — nome, assinatura e cores. Um lugar só, lido pela
 * página e pelo PDF.
 *
 * ---------------------------------------------------------------------------
 * QUEM DECIDE A MARCA É A CARTEIRA, NUNCA O NOME DO CLIENTE (29/09/2026)
 *
 * Decisão do PO em 29/09/2026: *"os clientes allgrotech devem ter a ID visual
 * e logo da Allgrotech nos mensais"*. Ela SUBSTITUI a de 04/08/2026 ("nenhum
 * relatório leva identidade visual da Allgrotech"). A nova está em
 * `cerebro/decisoes/2026-09-29-marca-allgrotech-nos-mensais.md` no repositório
 * da fábrica; a antiga, em `docs/HANDOFF_RELATORIOS_WEB_2026-08-04.md` (item 1).
 *
 * A carteira já viaja dentro de todo snapshot (`identidade.carteira`), gravada
 * pela fábrica a partir do cadastro. Resolver por ela tem duas consequências
 * de propósito:
 *
 * 1. cliente novo da Allgrotech sai com a marca certa sem ninguém lembrar de
 *    nada — é o dado que decide, não uma lista;
 * 2. vale RETROATIVAMENTE para os links já entregues, porque marca é
 *    desenho do portal, montado na hora, e não número do snapshot.
 *
 * `identidade.marca`, quando presente, ainda ganha: é o parâmetro explícito
 * do contrato do snapshot. Hoje nenhuma montagem o preenche.
 * ---------------------------------------------------------------------------
 */
import type { Identidade, Marca } from './snapshot';

export interface CoresDaMarca {
  /** Cor dominante: capa, cabeçalho de tabela, títulos. */
  primaria: string;
  /** Segunda cor, para destaque de dado e barras. */
  destaque: string;
  /** Terceira cor, só em detalhe (fio, marcador, mês corrente). */
  acento: string;
  /** Fundo quente de caixas e da metade clara da capa. */
  papel: string;
  /** Fundo de cartão, mais claro que o papel. */
  cartao: string;
  tinta: string;
  cinza: string;
  suave: string;
  filete: string;
  /** Texto sobre a cor primária. */
  sobrePrimaria: string;
  /** Texto secundário sobre a cor primária. */
  sobrePrimariaSuave: string;
}

export interface MarcaResolvida extends Marca {
  cores: CoresDaMarca;
  /** Endereço público do logo horizontal para a página web, quando a marca tem logo em imagem. */
  logoWeb?: string;
  /** Prefixo do nome do arquivo PDF, sem acento. */
  prefixoArquivo: string;
}

export const MARCA_DACORA: MarcaResolvida = {
  id: 'dacora',
  nome: 'Dácora',
  assinatura: 'Dácora Performance Digital',
  prefixoArquivo: 'Dacora',
  cores: {
    primaria: '#014029',
    destaque: '#02593A',
    acento: '#7FB89A',
    papel: '#F2EFEB',
    cartao: '#F8F6F3',
    tinta: '#0D1F18',
    cinza: '#4A5E55',
    suave: '#8A9E95',
    filete: '#DDD9D3',
    sobrePrimaria: '#F2EFEB',
    sobrePrimariaSuave: '#B9CCC2',
  },
};

/** Cores medidas no arquivo oficial do logo (LOGO_ALLGROTECH.pdf, Drive da Allgrotech, 02/09/2026). */
export const MARCA_ALLGROTECH: MarcaResolvida = {
  id: 'allgrotech',
  nome: 'Allgrotech',
  assinatura: 'Allgrotech | Marketing Agro',
  prefixoArquivo: 'Allgrotech',
  logoWeb: '/marcas/allgrotech-horizontal.png',
  cores: {
    primaria: '#112D1D',
    destaque: '#1D9323',
    acento: '#7EC535',
    papel: '#F1F5EE',
    cartao: '#F7F9F5',
    tinta: '#112D1D',
    cinza: '#4B5B51',
    suave: '#8C9A90',
    filete: '#DCE3D8',
    sobrePrimaria: '#FFFFFF',
    sobrePrimariaSuave: '#A9C4AF',
  },
};

const POR_ID: Record<string, MarcaResolvida> = {
  dacora: MARCA_DACORA,
  allgrotech: MARCA_ALLGROTECH,
};

/** Carteira (como a fábrica grava em `identidade.carteira`) → marca. */
const POR_CARTEIRA: Record<string, MarcaResolvida> = {
  ALLGROTECH: MARCA_ALLGROTECH,
};

export function marcaDoRelatorio(identidade: Pick<Identidade, 'marca' | 'carteira'>): MarcaResolvida {
  const explicita = identidade.marca?.id ? POR_ID[identidade.marca.id] : undefined;
  if (explicita) return explicita;
  const carteira = typeof identidade.carteira === 'string' ? identidade.carteira.trim().toUpperCase() : '';
  return POR_CARTEIRA[carteira] ?? MARCA_DACORA;
}
