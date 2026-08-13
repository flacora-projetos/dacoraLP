import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisContextV1 } from '../reports/snapshot';
import type { SnapshotMontado } from '../reports/blocos/tipos';
import { formatarCompetencia } from '../reports/format';
import DecisaoDaRevisao, {
  type EstadoDaNotificacaoInterna,
  type PedidoDeDecisao,
  type ResultadoDaDecisao,
} from './DecisaoDaRevisao';
import EnvioDaRevisao, { type ResultadoDoEnvioP5 } from './EnvioDaRevisao';
import { useLinkDeVoltaParaFila } from './linkDeVolta';

interface SinalDaRevisao {
  tipo: string;
  texto: string;
  detalhe: string;
  alvo: string;
  peso: number;
}

export interface RelatorioDaRevisao {
  id: string;
  clienteNome: string;
  competencia: string;
  versao: number;
  estado: string;
  sinais: SinalDaRevisao[];
  conteudoCarregado: true;
  snapshot: SnapshotMontado;
  /**
   * A impressão digital do documento, vinda da COLUNA persistida — nunca
   * recalculada do `conteudo`, porque o `jsonb` reordena as chaves e o digest
   * muda (§9.6 do registro do painel). É ela que a decisão carimba.
   *
   * Opcional no tipo porque respostas montadas por regressão de fases
   * anteriores não a têm; sem ela, a decisão simplesmente não é oferecida.
   */
  checksum?: string;
  podeDecidir?: boolean;
  aprovadoPor?: string | null;
  aprovadoEm?: string | null;
  recusadoPor?: string | null;
  recusadoEm?: string | null;
  recusaMotivo?: string | null;
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
}

function ListaDeSinais({ sinais }: { sinais: SinalDaRevisao[] }) {
  if (sinais.length === 0) {
    return <p className="dcp-revisao__sem-sinal">Nenhum sinal de atenção.</p>;
  }
  return (
    <ul className="dcp-revisao__sinais">
      {sinais.map((sinal, indice) => (
        <li key={`${sinal.tipo}-${sinal.alvo}-${indice}`}>
          <a href={`#${encodeURIComponent(sinal.alvo)}`}>
            <span>{sinal.texto}</span>
            <small>{sinal.detalhe}</small>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ContextoDaAnalise({ contexto }: { contexto?: AnalysisContextV1 }) {
  if (!contexto || contexto.versao !== 'analysis_context_v1') return null;
  return (
    <details className="dcp-contexto-analise">
      <summary>O que a análise recebeu</summary>
      <p>Contexto factual {contexto.versao}; não é texto para o cliente nem uma explicação causal.</p>
      {contexto.relacoes.length > 0 ? (
        <ul>
          {contexto.relacoes.map((relacao) => <li key={`${relacao.tipo}-${relacao.plataforma}-${relacao.texto}`}>{relacao.texto}</li>)}
        </ul>
      ) : (
        <p>Não há relações comparáveis nesta versão.</p>
      )}
      {contexto.limitacoes.length > 0 && (
        <p>Limitações: {contexto.limitacoes.map(item => item.id).join(', ')} sem comparação liberada.</p>
      )}
    </details>
  );
}

/**
 * Sem canal de decisão, os botões existem desabilitados.
 *
 * Isto não é sobra da P2: é o que a moldura mostra quando ela é montada só
 * para apresentar o documento — numa regressão que desenha a tela, por
 * exemplo. **Botão habilitado sem para onde gravar é pior que botão
 * desabilitado**, porque quem clica acredita ter decidido.
 */
function DecisaoDesabilitada() {
  return (
    <>
      <div className="dcp-revisao__decisoes" aria-describedby="dcp-revisao-bloqueio">
        <button type="button" className="dcp-botao dcp-botao--primario" disabled>
          Aprovar relatório
        </button>
        <button type="button" className="dcp-botao dcp-botao--sinal" disabled>
          Recusar com motivo
        </button>
      </div>
      <p id="dcp-revisao-bloqueio" className="dcp-revisao__bloqueio">
        Decisão indisponível nesta tela. Abra a revisão pelo painel para aprovar ou recusar com
        motivo.
      </p>
    </>
  );
}

function FaixaDeRevisao({
  relatorio,
  quem,
  aoDecidir,
  aoCarregarEnvio,
  aoSolicitarEnvio,
}: {
  relatorio: RelatorioDaRevisao;
  quem?: string;
  aoDecidir?: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
  aoCarregarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoSolicitarEnvio?: () => Promise<ResultadoDoEnvioP5>;
}) {
  const competencia = formatarCompetencia(relatorio.competencia);
  const podeOferecerDecisao = Boolean(aoDecidir && relatorio.checksum);
  const podeMontarEnvio = Boolean(
    relatorio.checksum &&
    (relatorio.estado === 'liberado' || relatorio.estado === 'enviado') &&
    aoCarregarEnvio &&
    aoSolicitarEnvio,
  );

  return (
    <aside className="dcp-revisao__faixa" aria-label="Faixa de revisão do relatório">
      <div className="dcp-revisao__faixa-cabecalho">
        <p className="dcp-eyebrow">Revisão</p>
        <p className="dcp-revisao__faixa-titulo">{relatorio.clienteNome}</p>
        <p className="dcp-revisao__faixa-meta">{competencia} · versão {relatorio.versao}</p>
      </div>
      <div className="dcp-revisao__sinais-desktop">
        <p className="dcp-revisao__rotulo">
          {relatorio.sinais.length === 1 ? '1 sinal para conferir' : `${relatorio.sinais.length} sinais para conferir`}
        </p>
        <ListaDeSinais sinais={relatorio.sinais} />
      </div>
      <details className="dcp-revisao__sinais-movel">
        <summary>
          {relatorio.sinais.length === 0
            ? 'Sem sinais de atenção'
            : `${relatorio.sinais.length} ${relatorio.sinais.length === 1 ? 'sinal' : 'sinais'} para conferir`}
        </summary>
        <ListaDeSinais sinais={relatorio.sinais} />
      </details>
      <ContextoDaAnalise contexto={relatorio.snapshot.analysisContext} />
      {podeOferecerDecisao ? (
        <DecisaoDaRevisao
          relatorio={{
            clienteNome: relatorio.clienteNome,
            competencia: relatorio.competencia,
            versao: relatorio.versao,
            checksum: relatorio.checksum as string,
            estado: relatorio.estado,
            podeDecidir: relatorio.podeDecidir === true,
            aprovadoPor: relatorio.aprovadoPor ?? null,
            aprovadoEm: relatorio.aprovadoEm ?? null,
            recusadoPor: relatorio.recusadoPor ?? null,
            recusadoEm: relatorio.recusadoEm ?? null,
            recusaMotivo: relatorio.recusaMotivo ?? null,
            correcao: relatorio.correcao ?? null,
            notificacaoInterna: relatorio.notificacaoInterna ?? null,
          }}
          quem={quem ?? 'você'}
          aoDecidir={aoDecidir as (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>}
        />
      ) : (
        <DecisaoDesabilitada />
      )}
      {podeMontarEnvio && (
        <EnvioDaRevisao
          aoCarregar={aoCarregarEnvio as () => Promise<ResultadoDoEnvioP5>}
          aoSolicitar={aoSolicitarEnvio as () => Promise<ResultadoDoEnvioP5>}
        />
      )}
    </aside>
  );
}

export function RevisaoMoldura({
  relatorio,
  children,
  quem,
  aoDecidir,
  aoCarregarEnvio,
  aoSolicitarEnvio,
}: {
  relatorio: RelatorioDaRevisao | null;
  children?: ReactNode;
  quem?: string;
  aoDecidir?: (pedido: PedidoDeDecisao) => Promise<ResultadoDaDecisao>;
  aoCarregarEnvio?: () => Promise<ResultadoDoEnvioP5>;
  aoSolicitarEnvio?: () => Promise<ResultadoDoEnvioP5>;
}) {
  const linkDeVolta = useLinkDeVoltaParaFila();

  if (!relatorio?.conteudoCarregado || !relatorio.snapshot || !children) {
    return (
      <section className="dcp-secao" role="alert">
        <h1 className="dcp-secao__titulo">O conteúdo do relatório não foi carregado</h1>
        <p className="dcp-secao__apoio">
          Volte para a fila e abra a revisão novamente. Nenhuma decisão está disponível sem o documento.
        </p>
      </section>
    );
  }
  return (
    <section className="dcp-revisao">
      <nav
        className="dcp-revisao__navegacao dcp-revisao__navegacao--flutuante"
        aria-label="Navegação da revisão"
      >
        <Link to={linkDeVolta}>← Voltar para a fila</Link>
      </nav>
      <div className="dcp-revisao__grade">
        <FaixaDeRevisao
          relatorio={relatorio}
          quem={quem}
          aoDecidir={aoDecidir}
          aoCarregarEnvio={aoCarregarEnvio}
          aoSolicitarEnvio={aoSolicitarEnvio}
        />
        <article className="dcp-revisao__documento" aria-label={`Relatório de ${relatorio.clienteNome}`}>
          {children}
        </article>
      </div>
    </section>
  );
}
