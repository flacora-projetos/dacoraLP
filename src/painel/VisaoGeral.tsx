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

export interface CorrecoesDoMes {
  recusas: number;
  relatoriosRecusados: number;
  porMotivo: Fatia[];
  partesMaisCitadas: Fatia[];
  desfecho: {
    automatica: number;
    porUmaPessoa: number;
    emAberto: number;
    parada: number;
    automacaoTentouAntes: number;
  };
}

export interface EnviosDoMes {
  confirmados: number;
  emAndamento: number;
  incertos: number;
  falharam: number;
}

export interface DadosDaVisaoGeral {
  competencia: string;
  totalCorrentes: number;
  /** Respostas anteriores a 08/10/2026 não trazem os campos opcionais abaixo. */
  arquivados?: number;
  cobertura: { porCarteira: Fatia[]; porProduto: Fatia[]; porFormato: Fatia[] };
  fila: { porEstado: Fatia[] };
  qualidade: { comSinal: number; semSinal: number; porTipo: Fatia[] };
  retrabalho: {
    relatoriosCorrigidos: number;
    versoesPorRecusa: number;
    versoesSemRecusa: number;
    maisCorrigido: { clienteNome: string; correcoes: number } | null;
  };
  prazo: PrazoDaCompetencia;
  correcoes?: CorrecoesDoMes | null;
  horasAteAprovar?: number | null;
  aprovadosMedidos?: number;
  envios?: EnviosDoMes | null;
  prazoDeOutrosMeses?: Array<{ competencia: string; prazo: PrazoDaCompetencia }> | null;
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

/**
 * Uma distribuição que NÃO filtra a fila — motivos de recusa e partes do
 * relatório não são colunas da fila, e um número que parece clicável e não faz
 * nada é pior do que um número parado.
 */
function ListaDeContagem({ fatias, total }: { fatias: Fatia[]; total: number }) {
  return (
    <ul className="dcp-distribuicao__lista">
      {fatias.map((fatia) => (
        <li key={fatia.chave} className="dcp-fatia dcp-fatia--estatica">
          <span className="dcp-fatia__rotulo">{fatia.rotulo}</span>
          <span className="dcp-fatia__numero">{fatia.quantidade}</span>
          <span className="dcp-fatia__trilho" aria-hidden="true">
            <span
              className="dcp-fatia__barra"
              style={{ width: total > 0 ? `${Math.min(100, (fatia.quantidade / total) * 100)}%` : '0%' }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "5 h", "1,5 dia", "12 dias" — a escala que a pessoa lê sem fazer conta. */
export function duracaoPorExtenso(horas: number): string {
  if (horas < 1) return 'menos de 1 hora';
  if (horas < 48) return `${Math.round(horas)} ${Math.round(horas) === 1 ? 'hora' : 'horas'}`;
  const dias = Math.round((horas / 24) * 10) / 10;
  return `${String(dias).replace('.', ',')} dias`;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/**
 * As recusas do mês: quantas, por quê, em que parte e como terminaram.
 *
 * O motivo é o que a pessoa MARCOU ao recusar, nunca uma leitura do texto
 * livre. As recusas de antes de 08/10/2026 aparecem como "lista antiga":
 * reclassificá-las por texto seria o painel inventando motivo.
 */
function CorrecoesEErros({ correcoes }: { correcoes: CorrecoesDoMes | null | undefined }) {
  if (correcoes === undefined) return null;
  if (correcoes === null) {
    return (
      <section className="dcp-distribuicao dcp-distribuicao--larga">
        <h3 className="dcp-distribuicao__titulo">Correções e erros</h3>
        <p className="dcp-distribuicao__explicacao">
          Não deu para ler as recusas agora. Isso não quer dizer que não houve nenhuma — atualize a
          página em instantes.
        </p>
      </section>
    );
  }
  if (correcoes.recusas === 0) {
    return (
      <section className="dcp-distribuicao dcp-distribuicao--larga">
        <h3 className="dcp-distribuicao__titulo">Correções e erros</h3>
        <p className="dcp-distribuicao__explicacao">Nenhum relatório foi recusado neste mês.</p>
      </section>
    );
  }

  const { desfecho } = correcoes;
  const linhasDoDesfecho = [
    desfecho.automatica > 0 ? `${desfecho.automatica} corrigida${desfecho.automatica === 1 ? '' : 's'} pela automação` : null,
    desfecho.porUmaPessoa > 0
      ? `${desfecho.porUmaPessoa} corrigida${desfecho.porUmaPessoa === 1 ? '' : 's'} por uma pessoa` +
        (desfecho.automacaoTentouAntes > 0 ? ` (a automação tentou ${desfecho.automacaoTentouAntes} antes e não conseguiu)` : '')
      : null,
    desfecho.emAberto > 0 ? `${desfecho.emAberto} esperando a versão nova` : null,
    desfecho.parada > 0 ? `${desfecho.parada} parada${desfecho.parada === 1 ? '' : 's'} com erro, precisando de alguém` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="dcp-distribuicao dcp-distribuicao--larga">
      <h3 className="dcp-distribuicao__titulo">Correções e erros</h3>
      <p className="dcp-distribuicao__explicacao">
        <strong>{plural(correcoes.recusas, 'recusa', 'recusas')}</strong> em{' '}
        {plural(correcoes.relatoriosRecusados, 'relatório', 'relatórios')}. Uma recusa com dois motivos
        conta nos dois.
      </p>
      <div className="dcp-correcoes">
        <div>
          <h4 className="dcp-correcoes__subtitulo">Por motivo</h4>
          <ListaDeContagem fatias={correcoes.porMotivo} total={correcoes.recusas} />
        </div>
        {correcoes.partesMaisCitadas.length > 0 && (
          <div>
            <h4 className="dcp-correcoes__subtitulo">Partes mais citadas</h4>
            <ListaDeContagem fatias={correcoes.partesMaisCitadas} total={correcoes.recusas} />
          </div>
        )}
      </div>
      {linhasDoDesfecho.length > 0 && (
        <p className="dcp-retrabalho__extremo">Como terminaram: {linhasDoDesfecho.join(' · ')}.</p>
      )}
    </section>
  );
}

/** Os envios do mês, separando o que pode ter chegado do que certamente não chegou. */
function Envios({ envios }: { envios: EnviosDoMes | null | undefined }) {
  if (envios === undefined) return null;
  return (
    <section className="dcp-distribuicao">
      <h3 className="dcp-distribuicao__titulo">Envios</h3>
      {envios === null ? (
        <p className="dcp-distribuicao__explicacao">Não deu para ler os envios agora.</p>
      ) : (
        <ul className="dcp-retrabalho">
          <li>
            <strong>{envios.confirmados}</strong> {envios.confirmados === 1 ? 'entregue e confirmado' : 'entregues e confirmados'}
          </li>
          {envios.emAndamento > 0 && (
            <li>
              <strong>{envios.emAndamento}</strong> em andamento
            </li>
          )}
          {envios.incertos > 0 && (
            <li>
              <strong>{envios.incertos}</strong> sem confirmação — pode ter chegado; conferir no grupo antes de
              repetir
            </li>
          )}
          {envios.falharam > 0 && (
            <li>
              <strong>{envios.falharam}</strong> {envios.falharam === 1 ? 'falhou' : 'falharam'} antes de sair
            </li>
          )}
          {envios.emAndamento + envios.incertos + envios.falharam === 0 && (
            <li className="dcp-retrabalho__extremo">Nenhum envio com problema neste mês.</li>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * O prazo dos meses anteriores, lado a lado com o deste — a pergunta "está
 * melhorando?" não se responde com um mês só.
 */
function PrazoMesAMes({
  atual,
  competencia,
  anteriores,
}: {
  atual: PrazoDaCompetencia;
  competencia: string;
  anteriores: Array<{ competencia: string; prazo: PrazoDaCompetencia }> | null | undefined;
}) {
  if (!anteriores || anteriores.length === 0) return null;
  const meses = [...anteriores, { competencia, prazo: atual }];
  return (
    <section className="dcp-distribuicao">
      <h3 className="dcp-distribuicao__titulo">Prazo mês a mês</h3>
      <p className="dcp-distribuicao__explicacao">
        Liberados até o dia {atual.diaCombinado} do mês seguinte. Arquivados ficam fora da conta.
      </p>
      <ul className="dcp-retrabalho">
        {meses.map(({ competencia: mes, prazo }) => {
          const total = prazo.liberadosNoPrazo + (prazo.liberadosComAtraso ?? 0) + prazo.naoLiberados;
          const resto =
            prazo.situacao === 'em_aberto'
              ? 'prazo ainda não venceu'
              : [
                  prazo.liberadosComAtraso ? `${prazo.liberadosComAtraso} depois` : null,
                  prazo.naoLiberados ? `${prazo.naoLiberados} não liberados` : null,
                ].filter(Boolean).join(' · ') || 'todos no prazo';
          return (
            <li key={mes}>
              {formatarCompetencia(mes)}: <strong>{prazo.liberadosNoPrazo}</strong> de {total} no prazo · {resto}
            </li>
          );
        })}
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
          apoio={
            dados.arquivados
              ? `A versão mais recente de cada cliente. Fora ${plural(dados.arquivados, 'arquivado', 'arquivados')}, que não vão sair.`
              : 'A versão mais recente de cada cliente.'
          }
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
        {dados.horasAteAprovar !== undefined && (
          <Indicador
            valor={dados.horasAteAprovar === null ? '—' : duracaoPorExtenso(dados.horasAteAprovar)}
            rotulo="Da versão pronta até a aprovação"
            apoio={
              dados.horasAteAprovar === null
                ? 'Nenhum relatório aprovado ainda neste mês.'
                : `Mediana de ${plural(dados.aprovadosMedidos ?? 0, 'relatório', 'relatórios')}. Da aprovação ao envio leva minutos; o prazo se perde aqui.`
            }
          />
        )}
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
            Só conta como retrabalho a versão nova que nasceu de uma recusa. O fechamento do mês (no dia 1
            todo relatório é refeito com os dados finais) e as regras novas aparecem à parte, porque não são
            erro de ninguém.
          </p>
          <ul className="dcp-retrabalho">
            <li>
              <strong>{dados.retrabalho.relatoriosCorrigidos}</strong>{' '}
              {dados.retrabalho.relatoriosCorrigidos === 1 ? 'relatório corrigido' : 'relatórios corrigidos'}
              {' '}por recusa, em {plural(dados.retrabalho.versoesPorRecusa, 'versão nova', 'versões novas')}
            </li>
            <li>
              <strong>{dados.retrabalho.versoesSemRecusa}</strong>{' '}
              {dados.retrabalho.versoesSemRecusa === 1 ? 'versão nova' : 'versões novas'} sem recusa (fechamento
              do mês ou regra nova)
            </li>
            {dados.retrabalho.maisCorrigido && (
              <li className="dcp-retrabalho__extremo">
                O mais corrigido foi <strong>{dados.retrabalho.maisCorrigido.clienteNome}</strong>, com{' '}
                {plural(dados.retrabalho.maisCorrigido.correcoes, 'correção', 'correções')}.
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="dcp-visao__blocos">
        <CorrecoesEErros correcoes={dados.correcoes} />
        <Envios envios={dados.envios} />
        <PrazoMesAMes atual={dados.prazo} competencia={dados.competencia} anteriores={dados.prazoDeOutrosMeses} />
      </div>

      <p className="dcp-visao__rodape">
        Números apurados dos relatórios já gravados. Abrir esta tela não consulta Meta, Google, GA4,
        Pinterest ou loja, e não recalcula relatório fechado.
      </p>
    </div>
  );
}
