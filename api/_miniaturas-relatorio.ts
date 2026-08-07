import { createClient } from '@supabase/supabase-js';

const BUCKET = 'relatorios-miniaturas';
const PREFIXO = `storage://${BUCKET}/`;
const VALIDADE_SEGUNDOS = 60 * 60;

interface MiniaturaDoSnapshot {
  src: string;
  alt: string;
}

interface CriativoDoSnapshot {
  miniatura: MiniaturaDoSnapshot | null;
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

/**
 * Troca somente no envelope enviado ao navegador o caminho privado e estável
 * por uma URL temporária. O conteúdo persistido e o checksum permanecem
 * imutáveis; a service role nunca sai do servidor.
 */
export async function resolverMiniaturasPrivadas(
  snapshot: any,
  identidadeEsperada: { clienteSlug: string; competencia: string },
  opcoes: Opcoes = {},
) {
  const copia = structuredClone(snapshot);
  const criativos = listarCriativos(copia);
  const prefixoEsperado = `${identidadeEsperada.clienteSlug}/${identidadeEsperada.competencia}/`;
  const porCaminho = new Map<string, CriativoDoSnapshot[]>();

  for (const criativo of criativos) {
    const src = criativo.miniatura?.src;
    if (!src?.startsWith(PREFIXO)) continue;
    const caminho = src.slice(PREFIXO.length);
    if (!caminhoValido(caminho, prefixoEsperado)) {
      marcarIndisponivel(criativo, 'A miniatura guardada não pertence a este relatório.');
      continue;
    }
    const referencias = porCaminho.get(caminho) ?? [];
    referencias.push(criativo);
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
        for (const criativo of porCaminho.get(caminho) ?? []) {
          marcarIndisponivel(criativo, 'A miniatura privada não pôde ser aberta nesta revisão.');
        }
        continue;
      }
      for (const criativo of porCaminho.get(caminho) ?? []) {
        if (criativo.miniatura) criativo.miniatura.src = url;
        delete criativo.motivoSemMiniatura;
      }
    }
  } catch (erro) {
    console.error(
      '[miniaturas-relatorio] Falha ao assinar imagens privadas:',
      erro instanceof Error ? erro.message : erro,
    );
    for (const criativo of porCaminho.values()) {
      for (const referencia of criativo) {
        marcarIndisponivel(referencia, 'As miniaturas privadas estão temporariamente indisponíveis.');
      }
    }
  }

  return copia;
}

function criarAssinador({ urlSupabase, chaveDeServico }: Opcoes): Assinar {
  if (!urlSupabase || !chaveDeServico) {
    throw new Error('faltam URL ou service role para assinar as miniaturas');
  }
  const supabase = createClient(urlSupabase, chaveDeServico, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return async caminhos => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(caminhos, VALIDADE_SEGUNDOS);
    if (error) throw error;
    return data ?? [];
  };
}

function listarCriativos(snapshot: any): CriativoDoSnapshot[] {
  const rankings = snapshot?.dados?.rankingsCriativos;
  if (!rankings || typeof rankings !== 'object') return [];
  return Object.values(rankings).flatMap((ranking: any) =>
    Array.isArray(ranking?.criativos) ? ranking.criativos : [],
  );
}

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

function marcarIndisponivel(criativo: CriativoDoSnapshot, motivo: string) {
  criativo.miniatura = null;
  criativo.motivoSemMiniatura = motivo;
}
