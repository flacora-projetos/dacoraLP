/**
 * Detalhe do MENSAL INTERNO ALLGROTECH (A3) — leitura do núcleo factual.
 *
 * Insumo para a parceira Allgrotech, não documento de cliente: densidade
 * maior que o relatório externo é esperada (campanha, conjunto, recorte e
 * criativo aparecem sem serem simplificados para leigo).
 *
 * Tela SOMENTE LEITURA, de propósito e por construção: não importa nada de
 * `DecisaoDaRevisao.tsx`, `RevisaoMoldura.tsx` ou `api/painel-decisao.ts`, e
 * não existe nenhum botão de aprovar, recusar ou enviar aqui — este produto
 * ainda não tem A4 (notas humanas), A5 (PDF/link externo) nem A6 (envio).
 *
 * O visual reusa os tokens e as classes já aprovadas do painel (`dcp-*`,
 * ver `painel.css`) — não é uma direção nova. As classes próprias desta tela
 * levam o prefixo `dcp-interno__`, para nunca colidir com nada do fluxo de
 * decisão/envio que outra frente mexe em paralelo.
 *
 * Duas regras da casa que este componente segue à risca, porque o núcleo
 * factual já chega assim do backend (`gerarSnapshotMensalInternoAllgrotech`,
 * no `OpenClaw-Dacora`):
 *
 *  • **ausência não vira zero.** Todo campo é um `Valor`/`fatoLista` com
 *    `estado` (`ok` | `ausente` | `falha` | `nao_aplicavel`); cada estado tem
 *    apresentação própria, nunca um traço genérico escondendo qual dos
 *    quatro é.
 *  • **nada aqui é nota humana.** `notasHumanas` está fora de escopo da A2/A3
 *    (`estado: 'fora_do_escopo_a2'`) e esta tela não tenta preenchê-la.
 */
import { Link } from 'react-router-dom';
import { formatarCompetencia } from '../reports/format';

/* ------------------------------------------------------------------ */
/* Formas do núcleo factual (schema 2026-08-interno-allgrotech-factual-v1) */
/* ------------------------------------------------------------------ */

type ValorFactual =
  | { estado: 'ok'; numero: number }
  | { estado: 'ausente' | 'falha' | 'nao_aplicavel'; motivo: string };

type FatoLista =
  | { estado: 'ok'; valores: string[] }
  | { estado: 'ausente'; motivo: string };

interface CriterioFactual {
  estado: 'ok' | 'ausente';
  motivo?: string;
  eventos?: string[];
  rotulo?: string;
  rotuloCusto?: string;
  origem?: string;
  governadaPorCadastro?: boolean;
  vigencia?: Array<{ eventos: string[]; campanhas: string[]; inicio: string | null; fim: string | null }>;
}

interface ResultadoFactual {
  id: string;
  rotulo: string;
  valor: ValorFactual;
  custo: ValorFactual;
  criterio: CriterioFactual;
}

interface MiniaturaFactual {
  src: string;
  alt: string;
}

interface ItemCriativoFactual {
  posicao: number;
  id: string;
  nome: string;
  miniatura: MiniaturaFactual | null;
  motivoSemMiniatura?: string;
  numeros: Array<{ rotulo: string; valor: ValorFactual; unidade: string }>;
}

interface RankingFactual {
  id: string;
  escopo: { tipo: string; rotulo: string };
  criterio: string;
  itens: ItemCriativoFactual[];
}

type CriativosFactual =
  | { estado: 'ok'; rankings: RankingFactual[] }
  | { estado: 'ausente'; motivo: string };

interface CampanhaRecorte {
  id: string;
  nome: string;
  objetivo: FatoLista;
  destino: FatoLista;
  investimento: ValorFactual;
}

type RecorteCampanhas =
  | { estado: 'ok'; itens: CampanhaRecorte[] }
  | { estado: 'ausente' | 'falha' | 'nao_aplicavel'; motivo: string };

interface ItemRegiao {
  id: string;
  rotulo: string;
  valor: ValorFactual;
  parteDoTotal?: ValorFactual;
}

type RecorteRegioes =
  | {
      estado: 'ok';
      pergunta?: string;
      rotuloDimensao?: string;
      definicoes?: string[];
      itens: ItemRegiao[];
      total?: { rotulo: string; valor: ValorFactual };
    }
  | { estado: 'ausente' | 'falha' | 'nao_aplicavel'; motivo: string };

interface PlataformaFactual {
  plataforma: 'meta';
  objetivo: FatoLista;
  destino: FatoLista;
  investimento: ValorFactual;
  resultados: ResultadoFactual[];
  criativos: CriativosFactual;
  recortes: { campanhas?: RecorteCampanhas; regioes?: RecorteRegioes };
}

interface NucleoFactual {
  schemaVersion: string;
  identidade: {
    relatorioId: string;
    clienteSlug: string;
    clienteNome: string;
    carteira: string;
    produto: string;
    competencia: string;
    periodo: { inicio: string; fim: string };
    fusoHorario: string;
  };
  configuracao: {
    contratoId: string;
    instrumentacao: string[];
    recortes: string[];
    limiteCriativos: number;
  };
  origem: { relatorioId: string; produto: string; versaoSchema: string; checksum: string };
  contextoFactual: { plataformas: PlataformaFactual[] };
}

export interface DetalheInternoResposta {
  id: string;
  competencia: string;
  versao: number;
  estado: string;
  geradoEm: string | null;
  checksum: string;
  ehVersaoCorrente: boolean;
  conteudoCarregado: true;
  nucleoFactual: NucleoFactual;
  notasHumanas: { estado: string } | null;
  rastreabilidade: { snapshotBaseVersao: number; fontes: unknown[] } | null;
}

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const ROTULO_PLATAFORMA: Record<string, string> = { meta: 'Meta Ads' };

function formatarNumeroFactual(numero: number, unidade?: string) {
  if (unidade === 'brl' || unidade === 'brl_por_unidade') return dinheiro.format(numero);
  if (unidade === 'percentual') return `${(numero * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return inteiro.format(numero);
}

function ValorTag({ valor, unidade }: { valor: ValorFactual; unidade?: string }) {
  if (valor.estado === 'ok') {
    return <span className="dcp-interno__valor dcp-interno__valor--ok">{formatarNumeroFactual(valor.numero, unidade)}</span>;
  }
  const rotuloEstado = valor.estado === 'ausente' ? 'Ausente' : valor.estado === 'falha' ? 'Falha' : 'Não se aplica';
  return (
    <span className={`dcp-interno__valor dcp-interno__valor--${valor.estado}`} title={valor.motivo}>
      {rotuloEstado}
    </span>
  );
}

function FatoListaTag({ fato }: { fato: FatoLista }) {
  if (fato.estado === 'ok') {
    return (
      <span className="dcp-interno__fatos">
        {fato.valores.map((item) => (
          <span key={item} className="dcp-interno__fato">
            {item}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="dcp-interno__valor dcp-interno__valor--ausente" title={fato.motivo}>
      Ausente
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Seções                                                               */
/* ------------------------------------------------------------------ */

function SecaoResultados({ resultados }: { resultados: ResultadoFactual[] }) {
  return (
    <div className="dcp-interno__bloco">
      <h3 className="dcp-interno__subtitulo">Resultado por conversão contratada</h3>
      <div className="dcp-fila__rolagem">
        <table className="dcp-tabela">
          <thead>
            <tr>
              <th scope="col">Conversão</th>
              <th scope="col" className="dcp-tabela__numero">Resultado</th>
              <th scope="col" className="dcp-tabela__numero">Custo</th>
              <th scope="col">Critério</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((resultado) => (
              <tr key={resultado.id}>
                <th scope="row">{resultado.rotulo}</th>
                <td className="dcp-tabela__numero"><ValorTag valor={resultado.valor} /></td>
                <td className="dcp-tabela__numero"><ValorTag valor={resultado.custo} unidade="brl" /></td>
                <td>
                  {resultado.criterio.estado === 'ok' ? (
                    <span title={resultado.criterio.eventos?.join(', ')}>
                      {resultado.criterio.origem ?? 'cadastro'}
                      {resultado.criterio.governadaPorCadastro ? ' · governada pelo cadastro' : ''}
                    </span>
                  ) : (
                    <span className="dcp-interno__valor dcp-interno__valor--ausente" title={resultado.criterio.motivo}>
                      Sem evento governado
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecaoCampanhas({ recorte }: { recorte?: RecorteCampanhas }) {
  if (!recorte) return null;
  if (recorte.estado !== 'ok') {
    return (
      <div className="dcp-interno__bloco">
        <h3 className="dcp-interno__subtitulo">Campanhas</h3>
        <p className="dcp-interno__indisponivel">{recorte.motivo}</p>
      </div>
    );
  }
  return (
    <div className="dcp-interno__bloco">
      <h3 className="dcp-interno__subtitulo">Campanhas ({recorte.itens.length})</h3>
      <div className="dcp-fila__rolagem">
        <table className="dcp-tabela">
          <thead>
            <tr>
              <th scope="col">Campanha</th>
              <th scope="col">Objetivo</th>
              <th scope="col">Destino</th>
              <th scope="col" className="dcp-tabela__numero">Investimento</th>
            </tr>
          </thead>
          <tbody>
            {recorte.itens.map((campanha) => (
              <tr key={campanha.id}>
                <th scope="row">{campanha.nome}</th>
                <td><FatoListaTag fato={campanha.objetivo} /></td>
                <td><FatoListaTag fato={campanha.destino} /></td>
                <td className="dcp-tabela__numero"><ValorTag valor={campanha.investimento} unidade="brl" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecaoRegioes({ recorte }: { recorte?: RecorteRegioes }) {
  if (!recorte) return null;
  if (recorte.estado !== 'ok') {
    return (
      <div className="dcp-interno__bloco">
        <h3 className="dcp-interno__subtitulo">Região</h3>
        <p className="dcp-interno__indisponivel">{recorte.motivo}</p>
      </div>
    );
  }
  return (
    <div className="dcp-interno__bloco">
      <h3 className="dcp-interno__subtitulo">{recorte.rotuloDimensao ?? 'Região'}</h3>
      <div className="dcp-fila__rolagem">
        <table className="dcp-tabela">
          <thead>
            <tr>
              <th scope="col">{recorte.rotuloDimensao ?? 'Região'}</th>
              <th scope="col" className="dcp-tabela__numero">Investimento</th>
              <th scope="col" className="dcp-tabela__numero">Parte do total</th>
            </tr>
          </thead>
          <tbody>
            {recorte.itens.map((item) => (
              <tr key={item.id}>
                <th scope="row">{item.rotulo}</th>
                <td className="dcp-tabela__numero"><ValorTag valor={item.valor} unidade="brl" /></td>
                <td className="dcp-tabela__numero">
                  {item.parteDoTotal ? <ValorTag valor={item.parteDoTotal} unidade="percentual" /> : '—'}
                </td>
              </tr>
            ))}
            {recorte.total && (
              <tr>
                <th scope="row">{recorte.total.rotulo}</th>
                <td className="dcp-tabela__numero"><ValorTag valor={recorte.total.valor} unidade="brl" /></td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {recorte.definicoes && recorte.definicoes.length > 0 && (
        <ul className="dcp-interno__definicoes">
          {recorte.definicoes.map((definicao) => (
            <li key={definicao}>{definicao}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SecaoCriativos({ criativos }: { criativos: CriativosFactual }) {
  if (criativos.estado !== 'ok') {
    return (
      <div className="dcp-interno__bloco">
        <h3 className="dcp-interno__subtitulo">Criativos</h3>
        <p className="dcp-interno__indisponivel">{criativos.motivo}</p>
      </div>
    );
  }
  return (
    <div className="dcp-interno__bloco">
      {criativos.rankings.map((ranking) => (
        <div key={ranking.id} className="dcp-interno__ranking">
          <h3 className="dcp-interno__subtitulo">
            Criativos — {ranking.escopo.rotulo} <span className="dcp-interno__criterio">· ordenado por {ranking.criterio}</span>
          </h3>
          <div className="dcp-interno__cartoes">
            {ranking.itens.map((item) => (
              <article key={item.id} className="dcp-interno__cartao">
                <div className="dcp-interno__miniatura">
                  {item.miniatura ? (
                    <img src={item.miniatura.src} alt={item.miniatura.alt} loading="lazy" />
                  ) : (
                    <span className="dcp-interno__sem-miniatura" title={item.motivoSemMiniatura}>
                      Sem miniatura
                    </span>
                  )}
                </div>
                <p className="dcp-interno__cartao-posicao">#{item.posicao}</p>
                <p className="dcp-interno__cartao-nome" title={item.nome}>{item.nome}</p>
                <ul className="dcp-interno__cartao-numeros">
                  {item.numeros.map((numero) => (
                    <li key={numero.rotulo}>
                      <span>{numero.rotulo}</span>
                      <ValorTag valor={numero.valor} unidade={numero.unidade} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecaoPlataforma({ plataforma }: { plataforma: PlataformaFactual }) {
  return (
    <section className="dcp-secao dcp-interno__plataforma" aria-label={ROTULO_PLATAFORMA[plataforma.plataforma] ?? plataforma.plataforma}>
      <header className="dcp-interno__cabecalho-plataforma">
        <h2 className="dcp-secao__titulo">{ROTULO_PLATAFORMA[plataforma.plataforma] ?? plataforma.plataforma}</h2>
        <dl className="dcp-interno__resumo">
          <div>
            <dt>Objetivo oficial</dt>
            <dd><FatoListaTag fato={plataforma.objetivo} /></dd>
          </div>
          <div>
            <dt>Destino oficial</dt>
            <dd><FatoListaTag fato={plataforma.destino} /></dd>
          </div>
          <div>
            <dt>Investimento</dt>
            <dd><ValorTag valor={plataforma.investimento} unidade="brl" /></dd>
          </div>
        </dl>
      </header>

      <SecaoResultados resultados={plataforma.resultados} />
      <SecaoCampanhas recorte={plataforma.recortes.campanhas} />
      <SecaoRegioes recorte={plataforma.recortes.regioes} />
      <SecaoCriativos criativos={plataforma.criativos} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Componente exportado                                                */
/* ------------------------------------------------------------------ */

export default function DetalheInterno({ detalhe }: { detalhe: DetalheInternoResposta }) {
  const { nucleoFactual } = detalhe;
  const { identidade, configuracao, origem } = nucleoFactual;

  return (
    <section className="dcp-revisao">
      <nav className="dcp-revisao__navegacao" aria-label="Navegação">
        <Link to="/painel-de-relatorios">← Voltar para a fila</Link>
      </nav>

      <article className="dcp-secao dcp-interno__capa" aria-label={`Mensal interno Allgrotech de ${identidade.clienteNome}`}>
        <p className="dcp-eyebrow">Mensal interno Allgrotech · insumo Allgrotech, não documento de cliente</p>
        <h1 className="dcp-interno__titulo">{identidade.clienteNome}</h1>
        <p className="dcp-secao__apoio">
          {formatarCompetencia(identidade.competencia)} · versão {detalhe.versao}
          {!detalhe.ehVersaoCorrente && ' · substituída/revogada'}
        </p>
        <dl className="dcp-interno__meta">
          <div>
            <dt>Contrato factual</dt>
            <dd>{configuracao.contratoId}</dd>
          </div>
          <div>
            <dt>Instrumentação</dt>
            <dd>{configuracao.instrumentacao.join(', ')}</dd>
          </div>
          <div>
            <dt>Recortes configurados</dt>
            <dd>{configuracao.recortes.length > 0 ? configuracao.recortes.join(', ') : 'nenhum'}</dd>
          </div>
          <div>
            <dt>Origem</dt>
            <dd title={origem.checksum}>{origem.produto} · checksum {origem.checksum.slice(0, 8)}…</dd>
          </div>
          <div>
            <dt>Gerado em</dt>
            <dd>{detalhe.geradoEm ? dataHora.format(new Date(detalhe.geradoEm)) : '—'}</dd>
          </div>
        </dl>
        <p className="dcp-interno__notas-humanas">
          Notas humanas: fora do escopo desta fase (A4). Esta tela mostra somente fato medido.
        </p>
      </article>

      {nucleoFactual.contextoFactual.plataformas.map((plataforma) => (
        // A `key` vai no elemento intrínseco, não no componente: neste
        // projeto (React 19 + tipos do repositório), passar `key` direto a um
        // componente próprio falha o `tsc --noEmit` em vários arquivos já
        // existentes — mesma causa, não reintroduzida aqui de propósito.
        <div key={plataforma.plataforma}>
          <SecaoPlataforma plataforma={plataforma} />
        </div>
      ))}
    </section>
  );
}
