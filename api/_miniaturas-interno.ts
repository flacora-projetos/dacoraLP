/**
 * Resolve miniaturas privadas do NÚCLEO FACTUAL interno Allgrotech (A3).
 *
 * Espelha `_miniaturas-relatorio.ts` (mensal externo), mas anda por outra
 * forma de snapshot: aqui os criativos vivem em
 * `nucleoFactual.contextoFactual.plataformas[].criativos.rankings[].itens[]`,
 * não em `dados.rankingsCriativos`. Escrito à parte de propósito — o
 * resolvedor do externo é lido pelo fluxo de decisão/envio, e este arquivo
 * não deve ter nada em comum com aquele risco de colisão.
 *
 * A validação do caminho usa o SLUG REAL do cliente
 * (`nucleoFactual.identidade.clienteSlug`), nunca a chave de armazenamento da
 * tabela (`vetsell__interno_allgrotech`): a miniatura foi gravada pela mesma
 * fábrica do mensal externo, sob o slug real — ver
 * `docs/HANDOFF_PILOTOS_MENSAL_INTERNO_ALLGROTECH_2026-08-12.md` no
 * `OpenClaw-Dacora`.
 */
import { criarAssinadorStoragePrivado } from './_storage-privado.js';

const BUCKET = 'relatorios-miniaturas';
const PREFIXO = `storage://${BUCKET}/`;
const VALIDADE_SEGUNDOS = 60 * 60;

interface MiniaturaDoNucleo {
  src: string;
  alt: string;
}

interface ItemCriativo {
  miniatura?: MiniaturaDoNucleo | null;
  motivoSemMiniatura?: string;
}

interface Assinatura {
  path?: string | null;
  signedUrl?: string | null;
  error?: string | null;
}

type Assinar = (caminhos: string[]) => Promise<Assinatura[]>;

interface Opcoes {
  urlSupabase?: string;
  chaveDeServico?: string;
  assinar?: Assinar;
}

export async function resolverMiniaturasPrivadasInterno(
  nucleoFactual: any,
  opcoes: Opcoes = {},
) {
  const copia = structuredClone(nucleoFactual);
  const clienteSlugReal = String(copia?.identidade?.clienteSlug || '');
  const itens = listarItensCriativos(copia);
  const prefixoEsperado = clienteSlugReal ? `${clienteSlugReal}/` : null;
  const porCaminho = new Map<string, ItemCriativo[]>();

  for (const item of itens) {
    const src = item.miniatura?.src;
    if (!src?.startsWith(PREFIXO)) continue;
    const caminho = src.slice(PREFIXO.length);
    if (!prefixoEsperado || !caminhoValido(caminho, prefixoEsperado)) {
      marcarIndisponivel(item, 'A miniatura guardada não pertence a este relatório.');
      continue;
    }
    const referencias = porCaminho.get(caminho) ?? [];
    referencias.push(item);
    porCaminho.set(caminho, referencias);
  }

  const caminhos = [...porCaminho.keys()];
  if (caminhos.length === 0) return copia;

  try {
    const assinar = opcoes.assinar ?? criarAssinador(opcoes);
    const assinaturas = await assinar(caminhos);
    const porResultado = new Map(
      assinaturas.map((assinatura, indice) => [assinatura.path ?? caminhos[indice], assinatura]),
    );

    for (const caminho of caminhos) {
      const assinatura = porResultado.get(caminho);
      const url = assinatura?.signedUrl;
      if (!url || assinatura?.error) {
        for (const item of porCaminho.get(caminho) ?? []) {
          marcarIndisponivel(item, 'A miniatura privada não pôde ser aberta nesta revisão.');
        }
        continue;
      }
      for (const item of porCaminho.get(caminho) ?? []) {
        if (item.miniatura) item.miniatura.src = url;
        delete item.motivoSemMiniatura;
      }
    }
  } catch (erro) {
    console.error(
      '[miniaturas-interno] Falha ao assinar imagens privadas:',
      erro instanceof Error ? erro.message : erro,
    );
    for (const referencias of porCaminho.values()) {
      for (const item of referencias) {
        marcarIndisponivel(item, 'As miniaturas privadas estão temporariamente indisponíveis.');
      }
    }
  }

  return copia;
}

function criarAssinador({ urlSupabase, chaveDeServico }: Opcoes): Assinar {
  return criarAssinadorStoragePrivado({
    bucket: BUCKET,
    urlSupabase,
    chaveDeServico,
    validadeSegundos: VALIDADE_SEGUNDOS,
  });
}

function listarItensCriativos(nucleoFactual: any): ItemCriativo[] {
  const plataformas = Array.isArray(nucleoFactual?.contextoFactual?.plataformas)
    ? nucleoFactual.contextoFactual.plataformas
    : [];
  const itens: ItemCriativo[] = [];
  for (const plataforma of plataformas) {
    const criativos = plataforma?.criativos;
    if (criativos?.estado !== 'ok' || !Array.isArray(criativos.rankings)) continue;
    for (const ranking of criativos.rankings) {
      if (!Array.isArray(ranking?.itens)) continue;
      for (const item of ranking.itens) itens.push(item);
    }
  }
  return itens;
}

/**
 * Caminho `<slugReal>/<competencia>/<rankingId>/<hash>.<ext>` — mesma forma
 * do mensal externo (§`_miniaturas-relatorio.ts`), só que o primeiro
 * segmento precisa bater com o slug real recebido, não com um prefixo fixo de
 * competência/cliente combinados de fora.
 */
function caminhoValido(caminho: string, prefixoEsperado: string) {
  if (!caminho.startsWith(prefixoEsperado) || caminho.includes('\\')) return false;
  const segmentos = caminho.split('/');
  return segmentos.length === 4
    && segmentos.every(segmento => segmento.length > 0 && segmento !== '.' && segmento !== '..')
    && /^[a-zA-Z0-9_-]+$/.test(segmentos[0])
    && /^\d{4}-\d{2}$/.test(segmentos[1])
    && /^[a-zA-Z0-9_-]+$/.test(segmentos[2])
    && /^[a-f0-9]{20}\.(?:jpg|png|webp|gif)$/.test(segmentos[3]);
}

function marcarIndisponivel(item: ItemCriativo, motivo: string) {
  item.miniatura = null;
  item.motivoSemMiniatura = motivo;
}
