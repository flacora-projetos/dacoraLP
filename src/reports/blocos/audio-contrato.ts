const MIME_POR_EXTENSAO = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
} as const;

export type MimeAudioSuportado = (typeof MIME_POR_EXTENSAO)[keyof typeof MIME_POR_EXTENSAO];

export interface AudioDisponivelValido {
  id: string;
  estado: 'disponivel';
  src: string;
  mimeType: MimeAudioSuportado;
  duracaoSegundos?: number;
}

export function audioDisponivelTemContratoValido(
  audio: unknown,
  origemPermitida: 'storage' | 'navegador',
): audio is AudioDisponivelValido {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio)) return false;

  const candidato = audio as Record<string, unknown>;
  if (
    candidato.estado !== 'disponivel'
    || typeof candidato.id !== 'string'
    || candidato.id.trim().length === 0
    || typeof candidato.src !== 'string'
    || typeof candidato.mimeType !== 'string'
  ) {
    return false;
  }

  if (
    candidato.duracaoSegundos !== undefined
    && (!Number.isFinite(candidato.duracaoSegundos) || Number(candidato.duracaoSegundos) <= 0)
  ) {
    return false;
  }

  const extensao = extrairExtensao(candidato.src, origemPermitida);
  return extensao !== null
    && MIME_POR_EXTENSAO[extensao as keyof typeof MIME_POR_EXTENSAO] === candidato.mimeType;
}

function extrairExtensao(src: string, origemPermitida: 'storage' | 'navegador') {
  let caminho: string;
  if (origemPermitida === 'storage') {
    if (!src.startsWith('storage://relatorios-audios/')) return null;
    caminho = src.slice('storage://relatorios-audios/'.length);
  } else {
    try {
      const url = new URL(src);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      caminho = url.pathname;
    } catch {
      return null;
    }
  }

  const extensao = caminho.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extensao && extensao in MIME_POR_EXTENSAO ? extensao : null;
}
