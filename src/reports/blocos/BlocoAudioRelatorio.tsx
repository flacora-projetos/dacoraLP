import { useRef, useState } from 'react';

import type { AudioRelatorio } from './tipos';
import { audioDisponivelTemContratoValido } from './audio-contrato';

function formatarDuracao(segundos: number | undefined) {
  if (!Number.isFinite(segundos) || segundos === undefined || segundos < 0) return null;
  const totalInteiro = Math.round(segundos);
  const minutosInteiros = Math.floor(totalInteiro / 60);
  const segundosInteiros = totalInteiro % 60;
  return `${minutosInteiros}:${String(segundosInteiros).padStart(2, '0')}`;
}

export default function BlocoAudioRelatorio({ audio }: { audio: AudioRelatorio }) {
  const player = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);

  const alternarReproducao = async () => {
    if (!player.current) return;
    if (!player.current.paused) {
      player.current.pause();
      return;
    }
    await player.current.play().catch(() => setTocando(false));
  };

  if (!audioDisponivelTemContratoValido(audio, 'navegador')) {
    const motivo = audio?.estado === 'indisponivel' && typeof audio.motivo === 'string' && audio.motivo.trim()
      ? audio.motivo
      : 'A leitura em áudio desta versão não está disponível.';
    return (
      <div className="dc-audio dc-audio--indisponivel" role="status">
        <p className="dc-audio__rotulo">Leitura em áudio indisponível</p>
        <p className="dc-audio__motivo">{motivo}</p>
        <p className="dc-audio__complemento">
          O relatório escrito continua completo nesta página.
        </p>
      </div>
    );
  }

  const duracao = formatarDuracao(audio.duracaoSegundos);

  return (
    <div className="dc-audio" data-estado="disponivel">
      <div className="dc-audio__cabecalho">
        <span className="dc-audio__marca" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        <div>
          <p className="dc-audio__rotulo">Leitura em áudio</p>
          <p className="dc-audio__descricao">
            Uma versão falada do conteúdo deste relatório.
            {duracao ? ` Duração: ${duracao}.` : ''}
          </p>
        </div>
      </div>

      <button
        className="dc-audio__acao"
        type="button"
        onClick={alternarReproducao}
        aria-controls={`audio-${audio.id}`}
        aria-pressed={tocando}
      >
        <span aria-hidden="true">{tocando ? 'Ⅱ' : '▶'}</span>
        {tocando ? 'Pausar versão falada' : 'Ouvir a versão falada'}
      </button>

      <audio
        id={`audio-${audio.id}`}
        ref={player}
        className="dc-audio__player"
        controls
        preload="metadata"
        aria-label="Ouvir a leitura deste relatório"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
      >
        <source src={audio.src} type={audio.mimeType} />
        Seu navegador não consegue reproduzir este áudio. O conteúdo completo permanece escrito
        nesta página.
      </audio>

      <p className="dc-audio__complemento">
        O áudio é complementar. O texto desta página continua sendo a versão conferível do
        relatório.
      </p>
    </div>
  );
}
