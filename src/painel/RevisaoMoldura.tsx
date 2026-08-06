import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SnapshotMontado } from '../reports/blocos/tipos';
import { formatarCompetencia } from '../reports/format';

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

function FaixaDeRevisao({ relatorio }: { relatorio: RelatorioDaRevisao }) {
  const competencia = formatarCompetencia(relatorio.competencia);
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
      <div className="dcp-revisao__decisoes" aria-describedby="dcp-revisao-bloqueio">
        <button type="button" className="dcp-botao dcp-botao--primario" disabled>
          Aprovar relatório
        </button>
        <button type="button" className="dcp-botao dcp-botao--sinal" disabled>
          Recusar com motivo
        </button>
      </div>
      <p id="dcp-revisao-bloqueio" className="dcp-revisao__bloqueio">
        Decisão ainda desabilitada. A próxima etapa registra o GO ou a recusa com auditoria.
      </p>
    </aside>
  );
}

export function RevisaoMoldura({
  relatorio,
  children,
}: {
  relatorio: RelatorioDaRevisao | null;
  children?: ReactNode;
}) {
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
      <nav className="dcp-revisao__navegacao" aria-label="Navegação da revisão">
        <Link to="/painel-de-relatorios">← Voltar para a fila</Link>
      </nav>
      <div className="dcp-revisao__grade">
        <FaixaDeRevisao relatorio={relatorio} />
        <article className="dcp-revisao__documento" aria-label={`Relatório de ${relatorio.clienteNome}`}>
          {children}
        </article>
      </div>
    </section>
  );
}
