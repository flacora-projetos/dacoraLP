import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarCompetencia } from '../reports/format';
import type {
  HistoricoSeguroDoCliente,
  VersaoDoHistorico,
} from '../../api/_painel-historico-dados';

export type ResultadoDoHistorico =
  | { ok: true; historico: HistoricoSeguroDoCliente }
  | { ok: false; mensagem: string };

function dataHora(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? ''
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

function posicaoDaVersao(versao: VersaoDoHistorico): string {
  if (versao.posicao === 'substituida') {
    return versao.substituidaPor?.versao
      ? `Substituída pela versão ${versao.substituidaPor.versao}`
      : 'Substituída por outra versão persistida';
  }
  if (versao.posicao === 'mais_recente') return 'Versão mais recente desta competência';
  return 'Versão anterior, sem substituição registrada';
}

function EventoDaDecisao({ versao }: { versao: VersaoDoHistorico }) {
  const decisao = versao.decisao;
  if (!decisao) return <li>Nenhuma aprovação ou recusa registrada.</li>;
  if (decisao.tipo === 'registro_incompleto') {
    return <li className="dcp-historico__alerta">Registro P3 incompleto; nenhuma decisão é afirmada.</li>;
  }
  if (decisao.tipo === 'aprovado') {
    return <li>Aprovado por {decisao.por}{dataHora(decisao.em) ? ` em ${dataHora(decisao.em)}` : ''}.</li>;
  }
  return (
    <li>
      Recusado por {decisao.por}{dataHora(decisao.em) ? ` em ${dataHora(decisao.em)}` : ''}.
      <span className="dcp-historico__motivo">Motivo: {decisao.motivo}</span>
    </li>
  );
}

function EventoDaCorrecao({ versao }: { versao: VersaoDoHistorico }) {
  if (!versao.correcao) return null;
  if (versao.correcao.estado === 'registro_incompleto') {
    return <li className="dcp-historico__alerta">Ordem P4 incompleta; nenhuma correção é presumida.</li>;
  }
  if (versao.correcao.estado === 'aguardando_nova_versao') {
    return <li>Ordem de correção aguardando nova versão desde {dataHora(versao.correcao.solicitadaEm)}.</li>;
  }
  return (
    <li>
      Ordem de correção atendida pela versão {versao.correcao.novaVersao?.versao}.
      {versao.correcao.novaVersao && (
        <Link to={`/painel-de-relatorios?relatorio=${encodeURIComponent(versao.correcao.novaVersao.relatorioId)}`}>
          Abrir a nova versão
        </Link>
      )}
    </li>
  );
}

function EventoDaNotificacao({ versao }: { versao: VersaoDoHistorico }) {
  if (!versao.notificacaoInterna) return null;
  if (versao.notificacaoInterna.estado === 'registro_incompleto') {
    return <li className="dcp-historico__alerta">Aviso interno P4 com registro incompleto.</li>;
  }
  return <li>Aviso interno à fábrica: {versao.notificacaoInterna.estado}. Não é envio ao cliente.</li>;
}

function EventoDoEnvio({ versao }: { versao: VersaoDoHistorico }) {
  const envio = versao.envio;
  if (!envio) return <li>Nenhuma intenção ou entrega ao cliente registrada.</li>;
  if (envio.estado === 'registro_incompleto') {
    return <li className="dcp-historico__alerta">Registro P5/W3 incompleto; esta versão não é tratada como enviada.</li>;
  }
  if (envio.estado === 'confirmado') {
    return (
      <li>
        Enviado para {envio.destinatarioNome}, com recibo confirmado em {dataHora(envio.reciboConfirmadoEm)}
        {dataHora(envio.enviadoEm) ? ` e envelope registrado em ${dataHora(envio.enviadoEm)}` : ''}.
      </li>
    );
  }
  if (envio.estado === 'incerto') {
    return <li className="dcp-historico__alerta">Entrega incerta para {envio.destinatarioNome}; não tratar como enviado nem repetir automaticamente.</li>;
  }
  const rotulo = {
    pendente: 'Solicitação pendente',
    reservado: 'Solicitação reservada pela fábrica',
    enviando: 'Transporte em andamento',
    falhou: 'Solicitação falhou antes do transporte',
  }[envio.estado];
  return <li>{rotulo} para {envio.destinatarioNome}, solicitada por {envio.solicitadoPor} em {dataHora(envio.solicitadoEm)}.</li>;
}

function CartaoDaVersao({ versao, atual }: { versao: VersaoDoHistorico; atual: boolean }) {
  return (
    <article className="dcp-historico__versao" aria-current={atual ? 'true' : undefined}>
      <header className="dcp-historico__versao-cabecalho">
        <div>
          <h4>Versão {versao.versao}</h4>
          <p>{posicaoDaVersao(versao)}</p>
        </div>
        <Link to={`/painel-de-relatorios?relatorio=${encodeURIComponent(versao.relatorioId)}`}>
          {atual ? 'Versão aberta' : 'Abrir versão'}
        </Link>
      </header>
      <p className="dcp-historico__identidade">
        Gerada {dataHora(versao.geradoEm)} · estado {versao.estado} · checksum {versao.checksumCurto}…
      </p>
      <ul className="dcp-historico__eventos">
        <EventoDaDecisao versao={versao} />
        <EventoDaCorrecao versao={versao} />
        <EventoDaNotificacao versao={versao} />
        <EventoDoEnvio versao={versao} />
        {versao.revogadoEm && <li>Versão revogada em {dataHora(versao.revogadoEm)}.</li>}
        {versao.substituicaoIncompleta && (
          <li className="dcp-historico__alerta">Há marca de substituição sem vínculo válido; a versão não é chamada de substituída.</li>
        )}
      </ul>
    </article>
  );
}

export default function HistoricoDoCliente({
  relatorioIdAtual,
  aoCarregar,
}: {
  relatorioIdAtual: string;
  aoCarregar: () => Promise<ResultadoDoHistorico>;
}) {
  const [estado, setEstado] = useState<'fechado' | 'carregando' | 'pronto' | 'erro'>('fechado');
  const [historico, setHistorico] = useState<HistoricoSeguroDoCliente | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (estado === 'carregando' || estado === 'pronto') return;
    setEstado('carregando');
    setErro(null);
    const resultado = await aoCarregar();
    if (resultado.ok === false) {
      setErro(resultado.mensagem);
      setEstado('erro');
      return;
    }
    setHistorico(resultado.historico);
    setEstado('pronto');
  }

  return (
    <details
      className="dcp-historico"
      onToggle={(evento) => {
        if (evento.currentTarget.open) void carregar();
      }}
    >
      <summary>
        <span>Histórico do cliente</span>
        <small>Versões, decisões, correções e entregas persistidas</small>
      </summary>
      <div className="dcp-historico__conteudo" aria-live="polite">
        {estado === 'carregando' && <p>Carregando eventos duráveis…</p>}
        {estado === 'erro' && (
          <div role="alert">
            <p>{erro}</p>
            <button type="button" className="dcp-botao dcp-botao--discreto" onClick={() => void carregar()}>
              Tentar novamente
            </button>
          </div>
        )}
        {estado === 'pronto' && historico && (
          <div className="dcp-historico__competencias">
            {historico.competencias.map((grupo) => (
              <section key={grupo.competencia} aria-labelledby={`historico-${grupo.competencia}`}>
                <h3 id={`historico-${grupo.competencia}`}>{formatarCompetencia(grupo.competencia)}</h3>
                <div className="dcp-historico__lista">
                  {grupo.versoes.map((versao) => (
                    <div key={versao.relatorioId}>
                      <CartaoDaVersao
                        versao={versao}
                        atual={versao.relatorioId === relatorioIdAtual}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
