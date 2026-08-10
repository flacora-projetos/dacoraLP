/**
 * A visão geral da operação — os cartões (fase D2).
 *
 * **Só leitura, como toda esta superfície.** Ela não aprova, não envia e não
 * recalcula nada: abre-se a tela e nenhuma API de plataforma é consultada. Os
 * números vêm dos snapshots já gravados, pelo mesmo pedido que monta a fila.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTA TELA É, E O QUE ELA NÃO É
 *
 * Ela mede **a operação dos relatórios**: quantos existem, onde a fila parou,
 * o que pede atenção, quanto foi refeito e se o mês fechou no prazo.
 *
 * Ela **não** soma performance de clientes diferentes. Não há aqui total de
 * investimento da carteira, de leads nem de receita — leads de clientes
 * diferentes têm definições diferentes, e empilhá-los daria um número grande
 * sem significado nenhum. Quem quiser esse tipo de leitura está procurando
 * outro produto.
 *
 * Todo número que representa uma fatia é **clicável e leva à fila já
 * filtrada**. Essa é a regra que impede a visão geral de virar uma segunda
 * lista paralela: ela resume, a fila continua sendo a mesa de trabalho.
 * ---------------------------------------------------------------------------
 */
import { formatarCompetencia } from '../reports/format';

/* ------------------------------------------------------------------ */
/* O que o servidor devolve                                            */
/* ------------------------------------------------------------------ */

export interface Fatia {
  chave: string;
  rotulo: string;
  quantidade: number;
}

export interface PrazoDaCompetencia {
  diaCombinado: number;
  dataLimite: string;
  situacao: 'em_aberto' | 'vencido';
  liberadosNoPrazo: number;
  liberadosComAtraso: number | null;
  naoLiberados: number;
}

export interface DadosDaVisaoGeral {
  competencia: string;
  totalCorrentes: number;
  cobertura: { porCarteira: Fatia[]; porProduto: Fatia[]; porFormato: Fatia[] };
  fila: { porEstado: Fatia[] };
  qualidade: { comSinal: number; semSinal: number; porTipo: Fatia[] };
  retrabalho: {
    relatoriosRefeitos: number;
    versoesAnteriores: number;
    maisRefeito: { clienteNome: string; versao: number } | null;
  };
  prazo: PrazoDaCompetencia;
}

/** As dimensões pelas quais a fila pode ser filtrada. */
export type CampoDeFiltro = 'carteira' | 'produto' | 'formato' | 'estado' | 'sinal';

export type Filtros = Partial<Record<CampoDeFiltro, string>>;

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function dataPorExtenso(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return dia && mes ? `${dia}/${mes}` : iso;
}

/**
 * Um número grande com o que ele significa embaixo.
 *
 * O rótulo vem SEMPRE, e por extenso. Um painel de números soltos obriga quem
 * lê a lembrar o que cada um era — e quem não lembra inventa.
 */
function Indicador({
  valor,
  rotulo,
  apoio,
  tom,
}: {
  valor: string;
  rotulo: string;
  apoio?: string;
  tom?: 'atencao';
}) {
  return (
    <div className={`dcp-indicador${tom ? ` dcp-indicador--${tom}` : ''}`}>
      <span className="dcp-indicador__valor">{valor}</span>
      <span className="dcp-indicador__rotulo">{rotulo}</span>
      {apoio && <span className="dcp-indicador__apoio">{apoio}</span>}
    </div>
  );
}

/**
 * Uma distribuição: as fatias de uma dimensão, cada uma clicável.
 *
 * A barra é proporcional ao total, e vem acompanhada do número — a barra
 * sozinha exigiria que a pessoa estimasse a olho o que já está escrito ao
 * lado.
 */
function Distribuicao({
  titulo,
  explicacao,
  campo,
  fatias,
  total,
  aoFiltrar,
}: {
  titulo: string;
  explicacao?: string;
  campo: CampoDeFiltro;
  fatias: Fatia[];
  total: number;
  aoFiltrar: (filtros: Filtros) => void;
}) {
  if (fatias.length === 0) return null;

  return (
    <section className="dcp-distribuicao">
      <h3 className="dcp-distribuicao__titulo">{titulo}</h3>
      {explicacao && <p className="dcp-distribuicao__explicacao">{explicacao}</p>}
      <ul className="dcp-distribuicao__lista">
        {fatias.map((fatia) => (
          <li key={fatia.chave}>
            <button
              type="button"
              className="dcp-fatia"
              onClick={() => aoFiltrar({ [campo]: fatia.chave })}
              title={`Ver na fila: ${fatia.rotulo}`}
            >
              <span className="dcp-fatia__rotulo">{fatia.rotulo}</span>
              <span className="dcp-fatia__numero">{fatia.quantidade}</span>
              <span className="dcp-fatia__trilho" aria-hidden="true">
                <span
                  className="dcp-fatia__barra"
                  style={{ width: total > 0 ? `${(fatia.quantidade / total) * 100}%` : '0%' }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* O prazo                                                             */
/* ------------------------------------------------------------------ */

/**
 * O prazo combinado com o PO: **dia 5 do mês seguinte é o limite de
 * LIBERAÇÃO.**
 *
 * Não é prazo de geração. Gerar é trabalho interno; o marco combinado é o
 * relatório estar liberado. Um mês com tudo gerado e nada liberado não cumpriu
 * o prazo, e este cartão diz isso.
 *
 * Duas coisas que ele escreve na tela em vez de esconder:
 *
 *  1. **conta a primeira liberação de cada relatório.** Uma correção liberada
 *     depois não transforma um mês pontual em mês atrasado — o retrabalho tem
 *     cartão próprio;
 *  2. **"ainda não liberado" é dito separado de "liberado com atraso".** Os
 *     dois perderam a data, mas são problemas diferentes, e juntá-los num
 *     número só esconderia qual deles o mês teve.
 */
function Prazo({ prazo }: { prazo: PrazoDaCompetencia }) {
  const limite = dataPorExtenso(prazo.dataLimite);

  if (prazo.situacao === 'em_aberto') {
    return (
      <Indicador
        valor={`${prazo.liberadosNoPrazo}`}
        rotulo={`Liberados · prazo até ${limite}`}
        apoio={
          prazo.naoLiberados > 0
            ? `${prazo.naoLiberados} ainda não ${prazo.naoLiberados === 1 ? 'foi liberado' : 'foram liberados'}. O prazo ainda não venceu, então não há atraso a contar.`
            : 'Todos já foram liberados, e o prazo ainda nem venceu.'
        }
      />
    );
  }

  const atrasados = prazo.liberadosComAtraso ?? 0;
  const partes = [
    atrasados > 0
      ? `${atrasados} ${atrasados === 1 ? 'liberado depois' : 'liberados depois'} da data`
      : null,
    prazo.naoLiberados > 0
      ? `${prazo.naoLiberados} ainda ${prazo.naoLiberados === 1 ? 'não foi liberado' : 'não foram liberados'}`
      : null,
  ].filter(Boolean);

  return (
    <Indicador
      valor={`${prazo.liberadosNoPrazo}`}
      rotulo={`Liberados até ${limite}`}
      apoio={
        partes.length > 0
          ? `${partes.join(' · ')}.`
          : 'Todos foram liberados dentro da data combinada.'
      }
      tom={partes.length > 0 ? 'atencao' : undefined}
    />
  );
}

/* ------------------------------------------------------------------ */
/* A tela                                                              */
/* ------------------------------------------------------------------ */

export default function VisaoGeral({
  dados,
  aoFiltrar,
}: {
  dados: DadosDaVisaoGeral;
  aoFiltrar: (filtros: Filtros) => void;
}) {
  const total = dados.totalCorrentes;
  const esperando = dados.fila.porEstado.find((f) => f.chave === 'gerado')?.quantidade ?? 0;

  return (
    <div className="dcp-visao">
      <p className="dcp-visao__intro">
        Como foi a produção dos relatórios de {formatarCompetencia(dados.competencia)}. Cada número
        abre a fila já filtrada. Esta tela mede a operação — ela não soma investimento nem resultado
        entre clientes, porque cada cliente mede coisas diferentes.
      </p>

      <div className="dcp-visao__indicadores">
        <Indicador
          valor={`${total}`}
          rotulo={total === 1 ? 'Relatório no mês' : 'Relatórios no mês'}
          apoio="A versão mais recente de cada cliente."
        />
        <Indicador
          valor={`${esperando}`}
          rotulo="Esperando revisão"
          apoio={esperando === 0 ? 'Nada parado nesta etapa.' : undefined}
        />
        <Indicador
          valor={`${dados.qualidade.comSinal}`}
          rotulo="Com sinal de atenção"
          apoio={`${dados.qualidade.semSinal} sem nenhum sinal.`}
          tom={dados.qualidade.comSinal > 0 ? 'atencao' : undefined}
        />
        <Prazo prazo={dados.prazo} />
      </div>

      <div className="dcp-visao__blocos">
        <Distribuicao
          titulo="Por carteira"
          campo="carteira"
          fatias={dados.cobertura.porCarteira}
          total={total}
          aoFiltrar={aoFiltrar}
        />
        <Distribuicao
          titulo="Por finalidade"
          campo="produto"
          fatias={dados.cobertura.porProduto}
          total={total}
          aoFiltrar={aoFiltrar}
        />
        <Distribuicao
          titulo="Por formato"
          campo="formato"
          fatias={dados.cobertura.porFormato}
          total={total}
          aoFiltrar={aoFiltrar}
        />
        <Distribuicao
          titulo="Onde a fila parou"
          campo="estado"
          fatias={dados.fila.porEstado}
          total={total}
          aoFiltrar={aoFiltrar}
        />
        <Distribuicao
          titulo="O que pede atenção"
          explicacao="Quantos relatórios têm cada tipo de sinal. Um relatório com três seções indisponíveis conta uma vez."
          campo="sinal"
          fatias={dados.qualidade.porTipo}
          total={total}
          aoFiltrar={aoFiltrar}
        />

        <section className="dcp-distribuicao">
          <h3 className="dcp-distribuicao__titulo">Retrabalho</h3>
          <p className="dcp-distribuicao__explicacao">
            Relatórios que precisaram de uma versão nova depois de gerados. As versões anteriores
            continuam no banco para auditoria.
          </p>
          <ul className="dcp-retrabalho">
            <li>
              <strong>{dados.retrabalho.relatoriosRefeitos}</strong>{' '}
              {dados.retrabalho.relatoriosRefeitos === 1 ? 'relatório refeito' : 'relatórios refeitos'}
            </li>
            <li>
              <strong>{dados.retrabalho.versoesAnteriores}</strong>{' '}
              {dados.retrabalho.versoesAnteriores === 1
                ? 'versão anterior guardada'
                : 'versões anteriores guardadas'}
            </li>
            {dados.retrabalho.maisRefeito && (
              <li className="dcp-retrabalho__extremo">
                O mais refeito foi <strong>{dados.retrabalho.maisRefeito.clienteNome}</strong>, na
                versão {dados.retrabalho.maisRefeito.versao}.
              </li>
            )}
          </ul>
        </section>
      </div>

      <p className="dcp-visao__rodape">
        Números apurados dos relatórios já gravados. Abrir esta tela não consulta Meta, Google, GA4,
        Pinterest ou loja, e não recalcula relatório fechado.
      </p>
    </div>
  );
}
