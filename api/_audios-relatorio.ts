import { createClient } from '@supabase/supabase-js';
import {
  audioDisponivelTemContratoValido,
  type AudioDisponivelValido,
} from '../src/reports/blocos/audio-contrato.js';

const BUCKET = 'relatorios-audios';
const PREFIXO = `storage://${BUCKET}/`;
const VALIDADE_SEGUNDOS = 60 * 60;

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
  identidadeEsperada: { clienteSlug: string; competencia: string; versao: number },
  opcoes: Opcoes = {},
) {
  const copia = structuredClone(snapshot);
  const audios = sanitizarEAcharDisponiveis(copia);
  if (!versaoValida(identidadeEsperada.versao)) {
    for (const audio of audios) marcarIndisponivel(audio, 'A versão desta leitura em áudio é inválida.');
    return copia;
  }
  const prefixoEsperado = [
    identidadeEsperada.clienteSlug,
    identidadeEsperada.competencia,
    `v${identidadeEsperada.versao}`,
    '',
  ].join('/');
  const porCaminho = new Map<string, AudioDisponivelValido[]>();

  for (const audio of audios) {
    if (!audio.src.startsWith(PREFIXO)) {
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
        delete (audio as any).motivo;
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

function sanitizarEAcharDisponiveis(snapshot: any): AudioDisponivelValido[] {
  const dados = snapshot?.dados;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return [];
  const audios = dados.audios;
  if (audios === undefined) return [];
  if (!audios || typeof audios !== 'object' || Array.isArray(audios)) {
    dados.audios = {};
    return [];
  }

  const disponiveis: AudioDisponivelValido[] = [];
  for (const [id, audio] of Object.entries(audios)) {
    if (audioDisponivelTemContratoValido(audio, 'storage') && audio.id === id) {
      disponiveis.push(audio);
      continue;
    }

    const motivo = audio && typeof audio === 'object'
      && (audio as any).estado === 'indisponivel'
      && typeof (audio as any).motivo === 'string'
      && (audio as any).motivo.trim()
      ? (audio as any).motivo
      : 'A leitura em áudio desta versão não está disponível.';
    audios[id] = { id, estado: 'indisponivel', motivo };
  }
  return disponiveis;
}

function caminhoValido(caminho: string, prefixoEsperado: string) {
  if (!caminho.startsWith(prefixoEsperado) || caminho.includes('\\')) return false;
  const segmentos = caminho.split('/');
  return segmentos.length === 4
    && segmentos.every(segmento => segmento.length > 0 && segmento !== '.' && segmento !== '..')
    && /^[a-zA-Z0-9_-]+$/.test(segmentos[0])
    && /^\d{4}-\d{2}$/.test(segmentos[1])
    && /^v[1-9]\d*$/.test(segmentos[2])
    && /^[a-f0-9]{20,64}\.(?:mp3|ogg|m4a|wav|webm)$/.test(segmentos[3]);
}

function marcarIndisponivel(audio: AudioDisponivelValido, motivo: string) {
  (audio as any).estado = 'indisponivel';
  (audio as any).motivo = motivo;
  delete (audio as any).src;
  delete (audio as any).mimeType;
  delete (audio as any).duracaoSegundos;
}

function versaoValida(versao: number) {
  return Number.isSafeInteger(versao) && versao > 0;
}
