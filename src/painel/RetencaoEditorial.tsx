import { useEffect, useId, useRef, useState } from 'react';
import PortalDoDialogo from './PortalDoDialogo';

export const CONFIRMACAO_DESCARTE = 'DESCARTAR HISTORICO';

export interface EstadoRetencaoEditorial {
  fechado: true;
  politica: 'arquivar' | 'descartar_historico';
  fechadoPor: string;
  fechadoEm: string;
  historicoDescartadoPor: string | null;
  historicoDescartadoEm: string | null;
  historicoDescartadoQuantidade: number | null;
}

export type ResultadoRetencaoEditorial =
  | { ok: true; estado: EstadoRetencaoEditorial }
  | { ok: false; mensagem: string };

function dataHora(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? ''
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

function DialogoDescarte({
  descartando,
  erro,
  aoCancelar,
  aoConfirmar,
}: {
  descartando: boolean;
  erro: string | null;
  aoCancelar: () => void;
  aoConfirmar: () => Promise<void>;
}) {
  const id = useId();
  const [confirmacao, setConfirmacao] = useState('');
  const campo = useRef<HTMLInputElement | null>(null);
  const confere = confirmacao.trim() === CONFIRMACAO_DESCARTE;

  useEffect(() => campo.current?.focus(), []);

  return (
    <PortalDoDialogo>
      <div className="dcp-modal" role="presentation">
        <div className="dcp-modal__caixa" role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`}>
          <p className="dcp-eyebrow">Retenção interna</p>
          <h2 id={`${id}-titulo`} className="dcp-modal__titulo">Descartar versões históricas das análises?</h2>
          <p className="dcp-modal__apoio">
            Esta ação remove somente revisões marcadas como históricas. A análise final, o fechamento,
            a aprovação, os recibos de envio e a auditoria mínima permanecem. Não há restauração pelo painel.
          </p>
          <label className="dcp-modal__rotulo" htmlFor={`${id}-confirmacao`}>
            Para confirmar, digite <strong>{CONFIRMACAO_DESCARTE}</strong>
          </label>
          <input
            ref={campo}
            id={`${id}-confirmacao`}
            className="dcp-modal__campo"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            disabled={descartando}
            autoComplete="off"
          />
          {erro && <p className="dcp-decisao__resultado dcp-decisao__resultado--falha" role="alert">{erro}</p>}
          <div className="dcp-modal__acoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--sinal"
              disabled={!confere || descartando}
              onClick={() => void aoConfirmar()}
            >
              {descartando ? 'Descartando…' : 'Descartar histórico'}
            </button>
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              disabled={descartando}
              onClick={aoCancelar}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </PortalDoDialogo>
  );
}

export default function RetencaoEditorial({
  aoCarregar,
  aoDescartar,
}: {
  aoCarregar: () => Promise<ResultadoRetencaoEditorial>;
  aoDescartar: (confirmacao: string) => Promise<ResultadoRetencaoEditorial>;
}) {
  const [estado, setEstado] = useState<EstadoRetencaoEditorial | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [dialogo, setDialogo] = useState(false);
  const [descartando, setDescartando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    void aoCarregar().then((resultado) => {
      if (cancelado) return;
      setCarregando(false);
      if (resultado.ok === false) setErro(resultado.mensagem);
      else setEstado(resultado.estado);
    });
    return () => { cancelado = true; };
  }, [aoCarregar]);

  async function descartar() {
    setDescartando(true);
    setErro(null);
    try {
      const resultado = await aoDescartar(CONFIRMACAO_DESCARTE);
      if (resultado.ok === false) {
        setErro(resultado.mensagem);
      } else {
        setEstado(resultado.estado);
        setDialogo(false);
      }
    } finally {
      setDescartando(false);
    }
  }

  if (carregando) return <p className="dcp-envio__estado">Conferindo retenção editorial…</p>;
  if (!estado) return <p className="dcp-decisao__resultado dcp-decisao__resultado--falha" role="alert">{erro ?? 'Retenção indisponível.'}</p>;

  const fechadoEm = dataHora(estado.fechadoEm);
  const descartadoEm = dataHora(estado.historicoDescartadoEm);

  return (
    <div className="dcp-envio dcp-retencao-editorial">
      <p className="dcp-envio__rotulo">Retenção interna</p>
      {estado.politica === 'arquivar' ? (
        <>
          <p className="dcp-envio__estado" role="status">
            Histórico arquivado por padrão após o fechamento final{fechadoEm ? ` em ${fechadoEm}` : ''}.
            Ele continua disponível somente na bancada interna.
          </p>
          <details>
            <summary>Gerenciar retenção</summary>
            <p className="dcp-modal__apoio">
              Se houver necessidade de minimização, o descarte é uma decisão separada e auditada.
            </p>
            <button type="button" className="dcp-botao dcp-botao--sinal" onClick={() => setDialogo(true)}>
              Descartar histórico arquivado
            </button>
          </details>
        </>
      ) : (
        <p className="dcp-envio__estado" role="status">
          Histórico descartado{descartadoEm ? ` em ${descartadoEm}` : ''} por {estado.historicoDescartadoPor ?? 'revisor autorizado'}.
          {' '}{estado.historicoDescartadoQuantidade ?? 0} revisão(ões) histórica(s) removida(s); análise final e auditoria mínima preservadas.
        </p>
      )}
      {dialogo && (
        <DialogoDescarte
          descartando={descartando}
          erro={erro}
          aoCancelar={() => { setDialogo(false); setErro(null); }}
          aoConfirmar={descartar}
        />
      )}
    </div>
  );
}
