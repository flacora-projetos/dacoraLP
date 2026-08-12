/** P5 — coordena a intenção de envio depois do GO; o transporte continua na fábrica. */
import { useEffect, useId, useRef, useState } from 'react';
import { formatarCompetencia } from '../reports/format';
import PortalDoDialogo from './PortalDoDialogo';

export type EstadoDoEnvioP5 =
  | 'pendente'
  | 'reservado'
  | 'enviando'
  | 'confirmado'
  | 'incerto'
  | 'falhou';

export interface EstadoSeguroDoEnvioP5 {
  relatorioId: string;
  clienteNome: string;
  competencia: string;
  versao: number;
  checksum: string;
  destinatarioNome: string | null;
  podeSolicitarEnvio: boolean;
  indisponibilidade:
    | 'destinatario_ausente'
    | 'aprovacao_invalida'
    | 'fora_de_circulacao'
    | null;
  envio: {
    estado: EstadoDoEnvioP5;
    solicitadoPor: string;
    solicitadoEm: string;
    confirmadoEm: string | null;
    erroCodigo: string | null;
  } | null;
}

export type ResultadoDoEnvioP5 =
  | { ok: true; estado: EstadoSeguroDoEnvioP5; mensagem?: string }
  | { ok: false; mensagem: string };

function dataHora(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? ''
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

export function textoDoEstadoDoEnvio(estado: EstadoSeguroDoEnvioP5): string {
  const nome = estado.destinatarioNome ?? 'destinatário canônico';
  if (!estado.envio) {
    if (estado.indisponibilidade === 'destinatario_ausente') {
      return 'Destino canônico indisponível. A fábrica precisa sincronizar e habilitar o recipient antes de qualquer solicitação.';
    }
    if (estado.indisponibilidade === 'aprovacao_invalida') {
      return 'A aprovação não está válida para esta versão; nenhum envio pode ser solicitado.';
    }
    if (estado.indisponibilidade === 'fora_de_circulacao') {
      return 'Esta versão não está disponível para envio. Volte para a fila e confira a versão corrente.';
    }
    return `O relatório está liberado para solicitar envio a ${nome}.`;
  }

  const quando = dataHora(estado.envio.confirmadoEm ?? estado.envio.solicitadoEm);
  switch (estado.envio.estado) {
    case 'pendente':
      return `Envio solicitado para ${nome}${quando ? ` em ${quando}` : ''}. A fábrica ainda não iniciou o transporte.`;
    case 'reservado':
      return `A fábrica reservou esta solicitação para ${nome}. Ela não será duplicada.`;
    case 'enviando':
      return `O transporte para ${nome} está em andamento. Não tente novamente.`;
    case 'confirmado':
      return `Enviado para ${nome}${quando ? ` em ${quando}` : ''}, com recibo confirmado pela fábrica.`;
    case 'incerto':
      return `A entrega para ${nome} ficou com confirmação incerta. Exige conferência manual e não será repetida automaticamente.`;
    case 'falhou':
      return `A solicitação para ${nome} falhou antes do transporte. Exige revisão manual; o painel não tenta novamente.`;
  }
}

function DialogoDeEnvio({
  estado,
  solicitando,
  erro,
  aoEnviar,
  aoAdiar,
}: {
  estado: EstadoSeguroDoEnvioP5;
  solicitando: boolean;
  erro: string | null;
  aoEnviar: () => void;
  aoAdiar: () => void;
}) {
  const id = useId();
  const caixa = useRef<HTMLDivElement | null>(null);
  const botaoEnviar = useRef<HTMLButtonElement | null>(null);

  useEffect(() => botaoEnviar.current?.focus(), []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !solicitando) {
        evento.preventDefault();
        aoAdiar();
        return;
      }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const focaveis = caixa.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoAdiar, solicitando]);

  return (
    <PortalDoDialogo>
      <div className="dcp-modal" role="presentation">
        <div
          className="dcp-modal__caixa"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-titulo`}
          aria-describedby={`${id}-destino`}
          ref={caixa}
        >
          <p className="dcp-eyebrow">Envio ao cliente</p>
          <h2 id={`${id}-titulo`} className="dcp-modal__titulo">
            Enviar o relatório de {estado.clienteNome}, {formatarCompetencia(estado.competencia)}?
          </h2>
          <p id={`${id}-destino`} className="dcp-envio__destino">
            Destino canônico confirmado pela fábrica:
            <strong>{estado.destinatarioNome}</strong>
          </p>
          <p className="dcp-modal__apoio">
            O painel solicitará uma única intenção. A mensagem só será tratada como enviada quando o
            recibo durável voltar da fábrica.
          </p>
          {erro && <p className="dcp-decisao__resultado dcp-decisao__resultado--falha" role="alert">{erro}</p>}
          <div className="dcp-modal__acoes">
            <button
              ref={botaoEnviar}
              type="button"
              className="dcp-botao dcp-botao--primario"
              onClick={aoEnviar}
              disabled={solicitando}
              aria-label={`Enviar o relatório de ${estado.clienteNome} para ${estado.destinatarioNome}`}
            >
              {solicitando ? 'Solicitando…' : 'Enviar'}
            </button>
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              onClick={aoAdiar}
              disabled={solicitando}
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </PortalDoDialogo>
  );
}

export default function EnvioDaRevisao({
  aoCarregar,
  aoSolicitar,
}: {
  aoCarregar: () => Promise<ResultadoDoEnvioP5>;
  aoSolicitar: () => Promise<ResultadoDoEnvioP5>;
}) {
  const [estado, setEstado] = useState<EstadoSeguroDoEnvioP5 | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [adiado, setAdiado] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const solicitacaoEmCurso = useRef(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    void aoCarregar().then((resultado) => {
      if (cancelado) return;
      setCarregando(false);
      if (resultado.ok === false) {
        setErro(resultado.mensagem);
        return;
      }
      setEstado(resultado.estado);
      setDialogoAberto(resultado.estado.podeSolicitarEnvio);
    });
    return () => {
      cancelado = true;
    };
  }, [aoCarregar]);

  async function solicitar() {
    if (solicitacaoEmCurso.current) return;
    solicitacaoEmCurso.current = true;
    setSolicitando(true);
    setErro(null);
    try {
      const resultado = await aoSolicitar();
      if (resultado.ok === false) {
        setErro(resultado.mensagem);
        return;
      }
      setEstado(resultado.estado);
      setDialogoAberto(false);
    } finally {
      solicitacaoEmCurso.current = false;
      setSolicitando(false);
    }
  }

  if (carregando) {
    return <p className="dcp-envio__estado" aria-live="polite">Carregando destino canônico…</p>;
  }
  if (erro && !estado) {
    return <p className="dcp-decisao__resultado dcp-decisao__resultado--falha" role="alert">{erro}</p>;
  }
  if (!estado) return null;

  return (
    <div className="dcp-envio">
      <p className="dcp-envio__rotulo">Envio ao cliente</p>
      <p className="dcp-envio__estado" role={estado.envio?.estado === 'incerto' ? 'alert' : 'status'}>
        {adiado
          ? 'Envio adiado. Reabra a revisão quando quiser solicitar.'
          : textoDoEstadoDoEnvio(estado)}
      </p>
      {dialogoAberto && estado.destinatarioNome && (
        <DialogoDeEnvio
          estado={estado}
          solicitando={solicitando}
          erro={erro}
          aoEnviar={() => void solicitar()}
          aoAdiar={() => {
            setDialogoAberto(false);
            setAdiado(true);
            setErro(null);
          }}
        />
      )}
    </div>
  );
}
