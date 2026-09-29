/* ⚠️ Imports relativos com `.js`: este módulo roda numa função da Vercel, que compila arquivo por arquivo e não completa extensão (ver api/painel-sessao.ts). */
/**
 * Monta o arquivo PDF do relatório. Roda no servidor (`api/_relatorio-pdf.ts` (endereço `/api/relatorio-pdf`))
 * e nos scripts de conferência — nunca no navegador.
 *
 * Três coisas que só o servidor faz bem, e por isso moram aqui:
 * 1. fontes e logos embutidos, sem depender de baixar nada;
 * 2. miniaturas baixadas ANTES de desenhar, com o formato conferido pelos
 *    primeiros bytes — o PDF só aceita JPEG e PNG, e já houve miniatura
 *    gravada com extensão .png e outro formato dentro, que quebrava o desenho;
 * 3. duas passadas: a primeira descobre em que página cada seção caiu, a
 *    segunda escreve esses números no sumário da capa. O sumário tem tamanho
 *    fixo nas duas passadas, então a paginação da segunda é a mesma.
 */
import { renderToBuffer } from '@react-pdf/renderer';

import type { AnalisePublicada } from '../analisePublicada';
import type { SnapshotMontado } from '../blocos/tipos';
import { marcaDoRelatorio } from '../marcas.js';
import RelatorioPdf, { registrarFontesDoRelatorioPdf, type ImagensDoPdf, type LogosDaMarca } from './RelatorioPdf.js';
import {
  FONTE_400,
  FONTE_500,
  FONTE_700,
  FONTE_900,
  LOGO_ALLGROTECH,
  LOGO_ALLGROTECH_CLARO,
  SIMBOLO_ALLGROTECH,
} from './recursos-embutidos.js';

const LOGOS: Record<string, LogosDaMarca | undefined> = {
  allgrotech: { claro: LOGO_ALLGROTECH, escuro: LOGO_ALLGROTECH_CLARO, simbolo: SIMBOLO_ALLGROTECH },
};

const ESPERA_POR_IMAGEM_MS = 8_000;

function formatoPelosBytes(dados: Buffer): 'jpg' | 'png' | null {
  if (dados.length > 3 && dados[0] === 0xff && dados[1] === 0xd8 && dados[2] === 0xff) return 'jpg';
  if (dados.length > 8 && dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}

function enderecosDasMiniaturas(snapshot: SnapshotMontado): string[] {
  const enderecos = new Set<string>();
  for (const ranking of Object.values(snapshot.dados.rankingsCriativos ?? {})) {
    for (const criativo of ranking.criativos) {
      const src = criativo.miniatura?.src;
      if (src && /^https?:/.test(src)) enderecos.add(src);
    }
  }
  return [...enderecos];
}

/**
 * Baixa as miniaturas. Falha de uma não derruba o documento: o cartão
 * daquele criativo sai com o aviso de imagem indisponível.
 */
export async function baixarMiniaturas(snapshot: SnapshotMontado, buscar: typeof fetch = fetch): Promise<ImagensDoPdf> {
  const imagens: ImagensDoPdf = new Map();
  await Promise.all(enderecosDasMiniaturas(snapshot).map(async (endereco) => {
    try {
      const resposta = await buscar(endereco, { signal: AbortSignal.timeout(ESPERA_POR_IMAGEM_MS) });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const dados = Buffer.from(await resposta.arrayBuffer());
      const formato = formatoPelosBytes(dados);
      imagens.set(endereco, formato ? { data: dados, format: formato } : null);
    } catch {
      imagens.set(endereco, null);
    }
  }));
  return imagens;
}

export function registrarFontesEmbutidas() {
  registrarFontesDoRelatorioPdf({ regular: FONTE_400, medium: FONTE_500, bold: FONTE_700, black: FONTE_900 });
}

export interface EntradaDoPdf {
  snapshot: SnapshotMontado;
  analisesPublicadas?: AnalisePublicada[];
  observacoesPublicas?: Array<{ secao: string; texto: string }>;
  /** Injetável para teste; por padrão baixa de verdade. */
  imagens?: ImagensDoPdf;
}

export async function gerarPdfDoRelatorio(entrada: EntradaDoPdf): Promise<Buffer> {
  registrarFontesEmbutidas();
  const imagens = entrada.imagens ?? await baixarMiniaturas(entrada.snapshot);
  const logos = LOGOS[marcaDoRelatorio(entrada.snapshot.identidade).id];
  const base = {
    snapshot: entrada.snapshot,
    analisesPublicadas: entrada.analisesPublicadas ?? [],
    observacoesPublicas: entrada.observacoesPublicas ?? [],
    imagens,
    logos,
  };

  const paginas: Record<string, number> = {};
  await renderToBuffer(RelatorioPdf({
    ...base,
    /* A última chamada vale: o motor pode medir a seção numa folha e depois
       empurrá-la para a seguinte, e só a posição final é a verdadeira. */
    aoPaginarSecao: (id, pagina) => {
      paginas[id] = pagina;
    },
  }));
  return renderToBuffer(RelatorioPdf({ ...base, paginasDasSecoes: paginas }));
}
