import { createClient } from '@supabase/supabase-js';

const BUCKET = 'relatorios-audios';
const PREFIXO = `storage://${BUCKET}/`;
const VALIDADE_SEGUNDOS = 60 * 60;

interface AudioDisponivelDoSnapshot {
  id: string;
  estado: 'disponivel';
  src: string;
  mimeType?: string;
  duracaoSegundos?: number;
  motivo?: string;
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
 * Resolve a referência privada somente na cópia enviada ao navegador. O
 * snapshot e seu checksum continuam apontando para um objeto estável no
 * Storage; a URL temporária nunca é persistida.
 */
export async function resolverAudiosPrivados(
  snapshot: any,
  identidadeEsperada: { clienteSlug: string; competencia: string; relatorioId: string },
  opcoes: Opcoes = {},
) {
  const copia = structuredClone(snapshot);
  const audios = listarAudios(copia);
  const prefixoEsperado = [
    identidadeEsperada.clienteSlug,
    identidadeEsperada.competencia,
    identidadeEsperada.relatorioId,
    '',
  ].join('/');
  const porCaminho = new Map<string, AudioDisponivelDoSnapshot[]>();

  for (const audio of audios) {
    if (typeof audio.src !== 'string' || !audio.src.startsWith(PREFIXO)) {
      marcarIndisponivel(audio, 'A leitura em áudio não está guardada no armazenamento privado deste relatório.');
      continue;
    }

    const caminho = audio.src.slice(PREFIXO.length);
    if (!caminhoValido(caminho, prefixoEsperado)) {
      marcarIndisponivel(audio, 'A leitura em áudio guardada não pertence a este relatório.');
      continue;
    }

    const referencias = porCaminho.get(caminho) ?? [];
    referencias.push(audio);
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
      if (!assinatura?.signedUrl || assinatura.error) {
        for (const audio of porCaminho.get(caminho) ?? []) {
          marcarIndisponivel(audio, 'A leitura em áudio privada não pôde ser aberta agora.');
        }
        continue;
      }

      for (const audio of porCaminho.get(caminho) ?? []) {
        audio.src = assinatura.signedUrl;
        delete audio.motivo;
      }
    }
  } catch (erro) {
    console.error(
      '[audios-relatorio] Falha ao assinar áudio privado:',
      erro instanceof Error ? erro.message : erro,
    );
    for (const referencias of porCaminho.values()) {
      for (const audio of referencias) {
        marcarIndisponivel(audio, 'A leitura em áudio está temporariamente indisponível.');
      }
    }
  }

  return copia;
}

function criarAssinador({ urlSupabase, chaveDeServico }: Opcoes): Assinar {
  if (!urlSupabase || !chaveDeServico) {
    throw new Error('faltam URL ou service role para assinar o áudio');
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

function listarAudios(snapshot: any): AudioDisponivelDoSnapshot[] {
  const audios = snapshot?.dados?.audios;
  if (!audios || typeof audios !== 'object') return [];
  return Object.values(audios).filter(
    (audio: any): audio is AudioDisponivelDoSnapshot => audio?.estado === 'disponivel',
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
    && /^[a-f0-9]{20,64}\.(?:mp3|ogg|m4a|wav|webm)$/.test(segmentos[3]);
}

function marcarIndisponivel(audio: AudioDisponivelDoSnapshot, motivo: string) {
  (audio as any).estado = 'indisponivel';
  (audio as any).motivo = motivo;
  delete (audio as any).src;
  delete (audio as any).mimeType;
  delete (audio as any).duracaoSegundos;
}
