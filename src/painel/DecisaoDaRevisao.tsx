/**
 * P3 — o verbo do painel, dentro da tela de revisão.
 *
 * ---------------------------------------------------------------------------
 * DUAS REGRAS DE DESENHO QUE MANDAM AQUI
 *
 * 1. **Não existe aprovar sem o relatório na tela.** Este componente só é
 *    montado pela moldura da revisão, e a moldura só monta quando o documento
 *    carregou. Um botão de aprovar na fila é o que este painel existe para
 *    impedir, e a ausência dele lá é decisão, não esquecimento.
 *
 * 2. **Confirmação sobre eco literal.** Nenhum clique grava direto: o painel
 *    escreve, em português, exatamente o que vai ser registrado — cliente,
 *    competência, versão, impressão digital, quem assina e, na recusa, o motivo
 *    inteiro — e só grava depois que a pessoa confirma AQUELE texto. É a mesma
 *    disciplina da edição governada de cadastro no `OpenClaw-Dacora`: o
 *    mal-entendido aparece antes da escrita, em vez de virar silêncio.
 *
 * O eco é montado **em código**, dos campos que já vieram do servidor. Ele não
 * interpreta, não resume e não julga o relatório.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useId, useRef, useState } from 'react';
import { formatarCompetencia } from '../reports/format';
import PortalDoDialogo from './PortalDoDialogo';
import type { EstadoEditorialRA4, ResumoEditorialRA4 } from './estadoEditorial';

/** A mesma régua do servidor e do banco. Ver `api/_painel-decisao-regras.ts`. */
export const MINIMO_DO_MOTIVO = 10;
export const MAXIMO_DO_MOTIVO = 600;

export type Decisao = 'aprovar' | 'recusar';

export type EstadoDaNotificacaoInterna =
  | 'pendente'
  | 'reservado'
  | 'enviando'
  | 'enviado'
  | 'incerto'
  | 'falhou';

export interface PedidoDeDecisao {
  decisao: Decisao;
  motivo?: string;
}

export interface ResultadoDaDecisao {
  ok: boolean;
  /** Já em português, vindo do servidor. */
  mensagem: string;
}

export interface RelatorioDecidivel {
  clienteNome: string;
  competencia: string;
  versao: number;
  checksum: string;
  estado: string;
  podeDecidir: boolean;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  recusadoPor: string | null;
  recusadoEm: string | null;
  recusaMotivo: string | null;
  correcao?: {
    id: string;
    estado: 'aguardando_nova_versao' | 'nova_versao_gerada';
    solicitadoEm: string;
    novaVersaoRelatorioId: string | null;
    novaVersao: number | null;
  } | null;
  notificacaoInterna?: {
    id: string;
    estado: EstadoDaNotificacaoInterna;
    destinoReferencia: string;
  } | null;
  revisaoEditorial?: ResumoEditorialRA4;
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

function diaEMes(iso: string | null): string {
  if (!iso) return '';
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes ? `${dia}/${mes}` : '';
}

const ROTULOS_ESTADO_EDITORIAL: Record<EstadoEditorialRA4, string> = {
  nao_iniciada: 'não iniciada',
  sugerida: 'sugestão aguardando revisão',
  editada: 'editada',
  pronta: 'pronta',
  revisada_sem_analise: 'revisada sem análise',
  inconclusiva: 'inconclusiva revisada',
  /* Havia análise revisada, e uma coleta nova mudou os fatos embaixo dela. O
     texto não foi apagado — ele espera alguém reler contra os números novos. */
  revisao_necessaria: 'dados atualizados — reveja a análise',
  falhou: 'falhou',
};

function EstadoEditorialDaAprovacao({ resumo }: { resumo?: ResumoEditorialRA4 }) {
  if (!resumo?.disponivel) {
    return (
      <div className="dcp-estado-editorial dcp-estado-editorial--atencao" role="status">
        <strong>Análises para aprovação</strong>
        <p>{resumo?.mensagem ?? 'O estado das análises ainda não foi conferido. Recarregue a revisão antes de aprovar.'}</p>
      </div>
    );
  }
  if (resumo.podeAprovar) {
    return (
      <div className="dcp-estado-editorial dcp-estado-editorial--pronto" role="status">
        <strong>Análises prontas</strong>
        <p>{resumo.prontas}/{resumo.totalObrigatorias} análises obrigatórias foram revisadas.</p>
      </div>
    );
  }
  return (
    <div className="dcp-estado-editorial dcp-estado-editorial--atencao" role="status">
      <strong>Análises para aprovação · {resumo.prontas}/{resumo.totalObrigatorias} prontas</strong>
      <ul>
        {resumo.pendentes.slice(0, 4).map((secao) => (
          <li key={secao.secao}>{secao.titulo}: {ROTULOS_ESTADO_EDITORIAL[secao.estado]}</li>
        ))}
      </ul>
      {resumo.pendentes.length > 4 && <p>Há mais {resumo.pendentes.length - 4} seção(ões) pendente(s).</p>}
      <p>Revise ou aplique as análises pendentes antes de aprovar. A recusa continua disponível.</p>
    </div>
  );
}

export function textoDaNotificacaoInterna(estado: EstadoDaNotificacaoInterna): string {
  if (estado === 'pendente') {
    return 'O aviso interno está pendente na fila de saída; o painel não enviou WhatsApp.';
  }
  if (estado === 'reservado' || estado === 'enviando') {
    return 'O aviso interno está em processamento; uma tentativa em curso não é repetida automaticamente.';
  }
  if (estado === 'enviado') {
    return 'O aviso interno foi enviado ao grupo canônico e confirmado pelo recibo do gateway.';
  }
  if (estado === 'incerto') {
    return 'O aviso interno ficou com confirmação incerta; exige conferência manual e não será repetido automaticamente.';
  }
  return 'O aviso interno falhou antes do transporte; exige revisão manual.';
}

/**
 * O eco: o que vai ser gravado, em uma frase.
 *
 * A impressão digital aparece cortada em doze caracteres de propósito — ela
 * está ali para a pessoa reconhecer que é o mesmo documento entre a tela e o
 * registro, não para ninguém conferir hash na mão.
 */
export function ecoDaDecisao(
  relatorio: RelatorioDecidivel,
  decisao: Decisao,
  quem: string,
  motivo: string,
): string {
  const cabeca =
    `${relatorio.clienteNome} · ${formatarCompetencia(relatorio.competencia)} · ` +
    `versão ${relatorio.versao} · impressão digital ${relatorio.checksum.slice(0, 12)}…`;

  if (decisao === 'aprovar') {
    return (
      `Vou registrar a APROVAÇÃO FINAL de ${cabeca}, assinada por ${quem}, e fechar esta versão ` +
      'sobre o snapshot factual atual. O histórico interno fica arquivado por padrão; o envio ao cliente ' +
      'continua sendo uma ação separada. Nada foi gravado ainda.'
    );
  }
  const texto = motivo.trim();
  return (
    `Vou registrar a RECUSA de ${cabeca}, assinada por ${quem}, com o motivo: ` +
    `“${texto || '…'}”. Nada foi gravado ainda.`
  );
}

/**
 * O que já está decidido, escrito por extenso.
 *
 * Estado sem explicação leva a próxima pessoa a procurar o botão que sumiu.
 */
export function textoDoJaDecidido(relatorio: RelatorioDecidivel): string | null {
  if (relatorio.estado === 'liberado' || relatorio.estado === 'enviado') {
    const quando = diaEMes(relatorio.aprovadoEm);
    const quem = relatorio.aprovadoPor ?? 'alguém autorizado';
    const base = `Aprovado por ${quem}${quando ? ` em ${quando}` : ''}, com a impressão digital carimbada.`;
    return relatorio.estado === 'enviado'
      ? `${base} Este relatório já foi entregue ao cliente.`
      : base;
  }
  if (relatorio.estado === 'recusado') {
    const quando = diaEMes(relatorio.recusadoEm);
    const quem = relatorio.recusadoPor ?? 'alguém autorizado';
    const base = (
      `Recusado por ${quem}${quando ? ` em ${quando}` : ''}. Motivo registrado: ` +
      `“${relatorio.recusaMotivo ?? 'sem motivo legível'}”.`
    );
    if (relatorio.correcao?.estado === 'aguardando_nova_versao') {
      const aviso = relatorio.notificacaoInterna
        ? ` ${textoDaNotificacaoInterna(relatorio.notificacaoInterna.estado)}`
        : '';
      return `${base} Ordem de correção: aguardando uma versão nova da fábrica.${aviso}`;
    }
    if (relatorio.correcao?.estado === 'nova_versao_gerada') {
      return `${base} A ordem de correção foi atendida pela versão ${relatorio.correcao.novaVersao ?? 'nova'}.`;
    }
    return `${base} A correção é gerar uma versão nova na fábrica.`;
  }
  if (relatorio.estado === 'substituido') {
    return 'Esta versão foi substituída por uma mais nova. A decisão acontece na versão corrente, que está na fila.';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* O diálogo da recusa                                                 */
/* ------------------------------------------------------------------ */

/**
 * A recusa abre diálogo próprio porque ela **exige texto**, e um campo aberto
 * ao lado do botão de aprovar convida ao clique errado.
 *
 * Foco preso dentro, `Esc` fecha e o foco volta para o botão que abriu — sem
 * isso, quem navega por teclado sai do diálogo para o relatório de 17 seções e
 * não acha o caminho de volta.
 */
function DialogoDeRecusa({
  relatorio,
  quem,
  motivo,
  aoEscrever,
  aoConfirmar,
  aoCancelar,
  registrando,
}: {
  relatorio: RelatorioDecidivel;
  quem: string;
  motivo: string;
  aoEscrever: (valor: string) => void;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  registrando: boolean;
}) {
  const idBase = useId();
  const caixa = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLTextAreaElement | null>(null);
  const suficiente = motivo.trim().length >= MINIMO_DO_MOTIVO;
  const excedeu = motivo.trim().length > MAXIMO_DO_MOTIVO;

  useEffect(() => {
    campo.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        aoCancelar();
        return;
      }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const focaveis = caixa.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, a[href]',
      );
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
  }, [aoCancelar]);

  return (
    <PortalDoDialogo>
      <div className="dcp-modal" role="presentation">
        <div
          className="dcp-modal__caixa"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${idBase}-titulo`}
          ref={caixa}
        >
          <h2 id={`${idBase}-titulo`} className="dcp-modal__titulo">
            Recusar o relatório de {relatorio.clienteNome}, {formatarCompetencia(relatorio.competencia)}
          </h2>
          <p className="dcp-modal__apoio">
            O motivo é obrigatório: ele é o que chega a quem vai regerar o relatório. Escreva o que
            precisa mudar, não uma nota interna.
          </p>
          <label className="dcp-modal__rotulo" htmlFor={`${idBase}-motivo`}>
            Motivo da recusa
          </label>
          <textarea
            id={`${idBase}-motivo`}
            ref={campo}
            className="dcp-modal__campo"
            rows={4}
            value={motivo}
            maxLength={MAXIMO_DO_MOTIVO + 1}
            onChange={(evento) => aoEscrever(evento.target.value)}
            aria-describedby={`${idBase}-contagem ${idBase}-eco`}
            disabled={registrando}
          />
          <p id={`${idBase}-contagem`} className="dcp-modal__contagem" aria-live="polite">
            {excedeu
              ? `Passou de ${MAXIMO_DO_MOTIVO} caracteres. Resuma o que precisa mudar.`
              : suficiente
                ? `${motivo.trim().length} caracteres.`
                : `Faltam ${MINIMO_DO_MOTIVO - motivo.trim().length} caracteres para o motivo valer.`}
          </p>
          <p id={`${idBase}-eco`} className="dcp-decisao__eco">
            {ecoDaDecisao(relatorio, 'recusar', quem, motivo)}
          </p>
          <div className="dcp-modal__acoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--sinal"
              onClick={aoConfirmar}
              disabled={!suficiente || excedeu || registrando}
              aria-label={`Registrar a recusa do relatório de ${relatorio.clienteNome}, ${formatarCompetencia(relatorio.competencia)}`}
            >
              {registrando ? 'Registrando…' : 'Registrar recusa'}
            </button>
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              onClick={aoCancelar}
              disabled={registrando}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </PortalDoDialogo>
  );
}

/* ------------------------------------------------------------------ */
/* A decisão                                                           */
/* ------------------------------------------------------------------ */

export default function DecisaoDaRevisao({
  relatorio,
  quem,
  aoDecidir,
}: {
  relatorio: RelatorioDecidivel;
  /** O e-mail da sessão. Aparece no eco; quem grava usa o do servidor. */
  quem: string;
  aoDecidir: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
}) {
  const [confirmando, setConfirmando] = useState<Decisao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDaDecisao | null>(null);
  const botaoAprovar = useRef<HTMLButtonElement | null>(null);
  const botaoRecusar = useRef<HTMLButtonElement | null>(null);
  const idBloqueio = useId();

  const jaDecidido = textoDoJaDecidido(relatorio);
  const rotuloDoObjeto = `${relatorio.clienteNome}, ${formatarCompetencia(relatorio.competencia)}`;
  const podeAprovarEditorialmente = relatorio.revisaoEditorial?.podeAprovar === true;

  function fecharDialogo() {
    setConfirmando(null);
    setMotivo('');
    botaoRecusar.current?.focus();
  }

  async function registrar(decisao: Decisao) {
    setRegistrando(true);
    setResultado(null);
    try {
      const saida = await aoDecidir(
        decisao === 'recusar' ? { decisao, motivo: motivo.trim() } : { decisao },
      );
      setResultado(saida);
      if (saida.ok) {
        setConfirmando(null);
        setMotivo('');
      }
    } finally {
      setRegistrando(false);
    }
  }

  /* Já decidido, substituído ou revogado: nada a fazer aqui, e a tela diz o
     quê e por quê em vez de mostrar botão que vai falhar. */
  if (!relatorio.podeDecidir) {
    return (
      <div className="dcp-decisao">
        <div className="dcp-revisao__decisoes">
          <button type="button" className="dcp-botao dcp-botao--primario" disabled>
            Aprovar relatório
          </button>
          <button type="button" className="dcp-botao dcp-botao--sinal" disabled>
            Recusar com motivo
          </button>
        </div>
        <p className="dcp-revisao__bloqueio">
          {jaDecidido ?? 'Esta versão não está esperando revisão. Volte para a fila e veja o estado atual.'}
        </p>
      </div>
    );
  }

  return (
    <div className="dcp-decisao">
      {resultado && (
        <p
          className={`dcp-decisao__resultado${resultado.ok ? '' : ' dcp-decisao__resultado--falha'}`}
          role={resultado.ok ? 'status' : 'alert'}
        >
          {resultado.mensagem}
        </p>
      )}

      <EstadoEditorialDaAprovacao resumo={relatorio.revisaoEditorial} />

      {confirmando === 'aprovar' ? (
        <div className="dcp-decisao__confirmacao">
          <p className="dcp-decisao__eco">{ecoDaDecisao(relatorio, 'aprovar', quem, '')}</p>
          <div className="dcp-revisao__decisoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--primario"
              onClick={() => void registrar('aprovar')}
              disabled={registrando}
              aria-label={`Confirmar a aprovação final e o fechamento do relatório de ${rotuloDoObjeto}`}
            >
              {registrando ? 'Registrando…' : 'Confirmar aprovação final'}
            </button>
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              onClick={() => {
                setConfirmando(null);
                botaoAprovar.current?.focus();
              }}
              disabled={registrando}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="dcp-revisao__decisoes">
          <button
            type="button"
            ref={botaoAprovar}
            className="dcp-botao dcp-botao--primario"
            onClick={() => {
              setResultado(null);
              setConfirmando('aprovar');
            }}
            disabled={!podeAprovarEditorialmente}
            aria-describedby={idBloqueio}
            aria-label={`Aprovar o relatório de ${rotuloDoObjeto}`}
          >
            Aprovar relatório
          </button>
          <button
            type="button"
            ref={botaoRecusar}
            className="dcp-botao dcp-botao--sinal"
            onClick={() => {
              setResultado(null);
              setConfirmando('recusar');
            }}
            aria-label={`Recusar com motivo o relatório de ${rotuloDoObjeto}`}
          >
            Recusar com motivo
          </button>
        </div>
      )}

      <p id={idBloqueio} className="dcp-revisao__bloqueio">
        A aprovação final carimba este documento e o snapshot factual atual, fecha editorialmente a
        versão e arquiva o histórico interno por padrão. O envio ao cliente continua separado e só
        aparece depois do read-back confirmar o fechamento.
      </p>

      {confirmando === 'recusar' && (
        <DialogoDeRecusa
          relatorio={relatorio}
          quem={quem}
          motivo={motivo}
          aoEscrever={setMotivo}
          aoConfirmar={() => void registrar('recusar')}
          aoCancelar={fecharDialogo}
          registrando={registrando}
        />
      )}
    </div>
  );
}
