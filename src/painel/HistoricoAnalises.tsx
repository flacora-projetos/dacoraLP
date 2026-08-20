import { formatarCarimbo } from '../reports/format';
import { paragrafosDaAnaliseEditorial } from './analiseEditorial';

export interface RevisaoDoHistorico {
  chave: string;
  secao: string;
  checksumFactual: string;
  tipoDecisao: 'analise' | 'sem_analise';
  texto: string | null;
  estado: 'atual' | 'revisao_necessaria' | 'historica' | 'final';
  revisadaPor: string;
  revisadaEm: string;
  coletadoEmReferencia: string | null;
  invalidadaEm: string | null;
}

export interface HistoricoEditorialInterno {
  disponivel: boolean;
  total: number;
  revisoes: RevisaoDoHistorico[];
  mensagem?: string;
}

const ROTULO_ESTADO: Record<RevisaoDoHistorico['estado'], string> = {
  atual: 'Atual',
  revisao_necessaria: 'Revisão necessária',
  historica: 'Histórica',
  final: 'Final',
};

function referenciaDoSnapshot(checksum: string) {
  return checksum.length > 10 ? `${checksum.slice(0, 10)}…` : checksum;
}

/**
 * Uma versão preservada, do jeito que ela é mostrada em QUALQUER lugar do
 * painel. Exportada porque o histórico aparece em dois pontos — a faixa de
 * revisão (relatório inteiro) e a própria seção — e duas cópias divergiriam
 * no primeiro campo novo, com uma delas escondendo dado do revisor.
 */
export function VersaoDaAnalise({ revisao }: { revisao: RevisaoDoHistorico; key?: string }) {
  const revisadaEm = formatarCarimbo(revisao.revisadaEm);
  const coletadoEm = revisao.coletadoEmReferencia ? formatarCarimbo(revisao.coletadoEmReferencia) : '';
  const invalidadaEm = revisao.invalidadaEm ? formatarCarimbo(revisao.invalidadaEm) : '';
  return (
    <li className="dcp-historico-analises__versao">
      <div className="dcp-historico-analises__meta">
        <span className={`dcp-historico-analises__estado dcp-historico-analises__estado--${revisao.estado}`}>
          {ROTULO_ESTADO[revisao.estado]}
        </span>
        <span>Revisada por {revisao.revisadaPor}{revisadaEm ? ` em ${revisadaEm}` : ''}</span>
      </div>
      <p className="dcp-historico-analises__snapshot">
        {coletadoEm
          ? <>Dados coletados em <strong>{coletadoEm}</strong>.</>
          : <strong>Coleta de referência indisponível nesta versão legada.</strong>}
        {' '}Snapshot factual <code title={revisao.checksumFactual}>{referenciaDoSnapshot(revisao.checksumFactual)}</code>.
      </p>
      {revisao.estado === 'revisao_necessaria' && invalidadaEm && (
        <p className="dcp-historico-analises__mudanca">Os fatos mudaram; revisão necessária desde {invalidadaEm}.</p>
      )}
      {revisao.tipoDecisao === 'sem_analise' ? (
        <p className="dcp-historico-analises__sem-analise">Revisada sem análise. Nenhum texto analítico foi aprovado para esta seção.</p>
      ) : (
        <div className="dcp-historico-analises__texto">
          {paragrafosDaAnaliseEditorial(revisao.texto ?? '').map((paragrafo, indice) => (
            <p key={`${revisao.chave}-${indice}`}>{paragrafo}</p>
          ))}
        </div>
      )}
    </li>
  );
}

export function HistoricoAnalises({
  historico,
  secoes,
}: {
  historico?: HistoricoEditorialInterno | null;
  secoes?: Array<{ secao: string; titulo: string }>;
}) {
  const titulos = new Map((secoes ?? []).map((item) => [item.secao, item.titulo]));
  const grupos = new Map<string, RevisaoDoHistorico[]>();
  for (const revisao of historico?.revisoes ?? []) {
    const grupo = grupos.get(revisao.secao);
    if (grupo) grupo.push(revisao);
    else grupos.set(revisao.secao, [revisao]);
  }

  return (
    <details className="dcp-historico-analises">
      <summary>
        <span>
          <strong>Histórico das análises</strong>
          <small>Somente interno · nunca entra no relatório público, PDF ou envio</small>
        </span>
        {historico?.disponivel && <b>{historico.total}</b>}
      </summary>
      {!historico ? (
        <p className="dcp-historico-analises__estado-carregamento">Carregando histórico…</p>
      ) : !historico.disponivel ? (
        <p className="dcp-historico-analises__erro">{historico.mensagem ?? 'O histórico está indisponível agora.'}</p>
      ) : historico.total === 0 ? (
        <p className="dcp-historico-analises__vazio">Ainda não há versões de análise preservadas para esta competência.</p>
      ) : (
        <div className="dcp-historico-analises__grupos">
          {[...grupos.entries()].map(([secao, revisoes]) => (
            <section key={secao} className="dcp-historico-analises__grupo" aria-label={`Histórico de ${titulos.get(secao) ?? secao}`}>
              <h4>{titulos.get(secao) ?? (secao === 'introducao' ? 'Introdução' : secao)}</h4>
              <ol>
                {revisoes.map((revisao) => <VersaoDaAnalise key={revisao.chave} revisao={revisao} />)}
              </ol>
            </section>
          ))}
        </div>
      )}
    </details>
  );
}
