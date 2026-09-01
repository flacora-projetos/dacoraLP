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
import DialogoRecusaCausas from './DialogoRecusaCausas';
import type { EstadoEditorialRA4, ResumoEditorialRA4 } from './estadoEditorial';
import {
  CATALOGO_CAUSAS_RECUSA,
  resumoHumanoDasCausas,
  type CausaRecusa,
} from './causasRecusa';

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
  escopoSecoes?: string[];
  catalogVersion?: string;
  causas?: CausaRecusa[];
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
    estado: 'aguardando_nova_versao' | 'em_processamento' | 'nova_versao_gerada' | 'falhou';
    solicitadoEm: string;
    iniciadoEm?: string | null;
    erroCodigo?: string | null;
    novaVersaoRelatorioId: string | null;
    novaVersao: number | null;
    ehNovaVersao?: boolean;
  } | null;
  notificacaoInterna?: {
    id: string;
    estado: EstadoDaNotificacaoInterna;
    destinoReferencia: string;
  } | null;
  revisaoEditorial?: ResumoEditorialRA4;
  secoesRecusaveis?: Array<{ secao: string; titulo: string }>;
  metricasRecusaveis?: Array<{ id: string; rotulo: string; plataforma: string }>;
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
    if (relatorio.correcao?.estado === 'em_processamento') {
      return `${base} A fábrica está processando a ordem de correção; esta versão continua recusada.`;
    }
    if (relatorio.correcao?.estado === 'falhou') {
      return `${base} A correção parou antes de gerar uma versão nova${relatorio.correcao.erroCodigo ? ` (${relatorio.correcao.erroCodigo})` : ''}; exige revisão humana.`;
    }
    if (relatorio.correcao?.estado === 'nova_versao_gerada') {
      return `${base} A ordem de correção foi atendida pela versão ${relatorio.correcao.novaVersao ?? 'nova'}.`;
    }
    return `${base} A correção é gerar uma versão nova na fábrica.`;
  }
  if (relatorio.estado === 'gerado' && relatorio.correcao?.ehNovaVersao && relatorio.correcao.estado === 'nova_versao_gerada') {
    return `Esta versão foi gerada para atender uma recusa anterior e voltou para revisão humana. Ela não foi aprovada, fechada nem enviada automaticamente.`;
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
 * O diálogo de recusa por TEXTO LIVRE foi removido em 01/09/2026, junto com o
 * estado `motivo`/`escopoSecoes` que só ele usava.
 *
 * Ele não foi deixado desconectado de propósito: um diálogo que grava recusa
 * sem `cause_id` continua a um `import` de distância de voltar ao ar, e a
 * recusa que ele produz é exatamente a que o worker novo tem de recusar como
 * `legacy_unstructured`. Quem recusa agora passa por `DialogoRecusaCausas`.
 */

/* ------------------------------------------------------------------ */
/* A decisão                                                           */
/* ------------------------------------------------------------------ */

export default function DecisaoDaRevisao({
  relatorio,
  quem,
  aoDecidir,
  aoRegistrarObservacao,
}: {
  relatorio: RelatorioDecidivel;
  /** O e-mail da sessão. Aparece no eco; quem grava usa o do servidor. */
  quem: string;
  aoDecidir: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
  aoRegistrarObservacao?: (secao: string, texto: string) => Promise<ResultadoDaDecisao>;
}) {
  const [confirmando, setConfirmando] = useState<Decisao | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDaDecisao | null>(null);
  const [secaoDaObservacao, setSecaoDaObservacao] = useState('relatorio_inteiro');
  const [textoDaObservacao, setTextoDaObservacao] = useState('');
  const botaoAprovar = useRef<HTMLButtonElement | null>(null);
  const botaoRecusar = useRef<HTMLButtonElement | null>(null);
  const idBloqueio = useId();

  const jaDecidido = textoDoJaDecidido(relatorio);
  const rotuloDoObjeto = `${relatorio.clienteNome}, ${formatarCompetencia(relatorio.competencia)}`;
  const podeAprovarEditorialmente = relatorio.revisaoEditorial?.podeAprovar === true;

  function fecharDialogo() {
    setConfirmando(null);
    botaoRecusar.current?.focus();
  }

  async function registrar(decisao: Decisao, causas: CausaRecusa[] = []) {
    setRegistrando(true);
    setResultado(null);
    try {
      const saida = await aoDecidir(
        decisao === 'recusar'
          ? {
              decisao,
              motivo: resumoHumanoDasCausas(causas),
              catalogVersion: CATALOGO_CAUSAS_RECUSA,
              causas,
            }
          : { decisao },
      );
      setResultado(saida);
      if (saida.ok) setConfirmando(null);
    } finally {
      setRegistrando(false);
    }
  }

  async function registrarObservacao() {
    if (!aoRegistrarObservacao || !textoDaObservacao.trim()) return;
    const titulo = relatorio.secoesRecusaveis?.find((item) => item.secao === secaoDaObservacao)?.titulo ?? 'Relatório inteiro';
    const eco = `Vou registrar uma OBSERVAÇÃO PÚBLICA em “${titulo}” para ${relatorio.clienteNome}: “${textoDaObservacao.trim()}”. Ela só poderá aparecer depois da aprovação e do fechamento editorial AV4 desta mesma versão. Nada foi gravado ainda.`;
    if (!window.confirm(eco)) return;
    setRegistrando(true);
    setResultado(null);
    try {
      const saida = await aoRegistrarObservacao(secaoDaObservacao, textoDaObservacao.trim());
      setResultado(saida);
      if (saida.ok) setTextoDaObservacao('');
    } finally { setRegistrando(false); }
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
      {aoRegistrarObservacao && (
        <section className="dcp-decisao__observacao-publica">
          <h2>Observação pública</h2>
          <p>Este texto não é contexto interno nem análise; só sai na página/PDF após aprovação e fechamento AV4 desta versão.</p>
          <select value={secaoDaObservacao} onChange={(evento) => setSecaoDaObservacao(evento.target.value)} disabled={registrando}>
            <option value="relatorio_inteiro">Relatório inteiro</option>
            <option value="introducao">Introdução</option>
            {relatorio.secoesRecusaveis?.filter((item) => item.secao.startsWith('bloco:')).map((item) => <option key={item.secao} value={item.secao}>{item.titulo}</option>)}
          </select>
          <textarea className="dcp-modal__campo" value={textoDaObservacao} onChange={(evento) => setTextoDaObservacao(evento.target.value)} maxLength={2500} rows={3} disabled={registrando} />
          <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => void registrarObservacao()} disabled={registrando || !textoDaObservacao.trim()}>{registrando ? 'Registrando…' : 'Confirmar observação pública'}</button>
        </section>
      )}

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
        <DialogoRecusaCausas
          relatorio={relatorio}
          quem={quem}
          aoConfirmar={(causas) => void registrar('recusar', causas)}
          aoCancelar={fecharDialogo}
          registrando={registrando}
        />
      )}
    </div>
  );
}
