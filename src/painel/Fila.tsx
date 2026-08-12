/**
 * A fila do mês — a tela principal do painel (fase P1).
 *
 * **Só leitura.** Não existe aqui nenhum botão de aprovar, recusar ou enviar, e
 * a ausência é a decisão, não um esquecimento: aprovar sem o relatório na tela
 * é exatamente o que este painel existe para impedir, e um botão na lista
 * convida a isso. A aprovação acontece na tela de revisão, na P2/P3.
 *
 * O que a fila entrega é **triagem**: qual destes relatórios eu preciso olhar
 * com cuidado, e qual eu despacho em trinta segundos. Por isso a ordem não é
 * alfabética — quem tem sinal de atenção sobe, quem já foi enviado desce, e o
 * alfabeto é só o desempate para a lista não dançar entre carregamentos.
 *
 * Quem calcula tudo isso é o servidor (`api/_painel-fila-dados.ts`). Esta tela
 * não soma, não compara e não decide o que é sinal: ela apresenta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { usarPainelAuth } from './AuthContext';
import { formatarCompetencia, formatarNumero } from '../reports/format';
import VisaoGeral, {
  type CampoDeFiltro,
  type DadosDaVisaoGeral,
  type Filtros,
} from './VisaoGeral';

/* ------------------------------------------------------------------ */
/* O que o servidor devolve                                            */
/* ------------------------------------------------------------------ */

type EstadoNaTela =
  | 'gerado'
  | 'recusado'
  | 'liberado'
  | 'enviado'
  | 'substituido'
  | 'desconhecido';

type EstadoDaNotificacaoInterna =
  | 'pendente'
  | 'reservado'
  | 'enviando'
  | 'enviado'
  | 'incerto'
  | 'falhou';

interface Sinal {
  tipo: string;
  texto: string;
  detalhe: string;
  alvo: string;
  peso: number;
}

interface NumeroDaFila {
  rotulo: string;
  fonte: string;
  valor: number;
  unidade: string;
}

interface ItemDaFila {
  id: string;
  clienteSlug: string;
  clienteNome: string;
  carteira: 'DACORA' | 'ALLGROTECH' | 'NAO_IDENTIFICADA';
  produto: 'mensal_externo_cliente' | 'mensal_interno_allgrotech' | 'NAO_IDENTIFICADO';
  /** `small_cap`, `ecommerce`, `servicos_leads` — ou `null` se o snapshot não declara. */
  formato: string | null;
  competencia: string;
  versao: number;
  estado: EstadoNaTela;
  geradoEm: string | null;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
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
  enviadoEm: string | null;
  enviadoPara: string | null;
  investimento: number | null;
  investimentoPorPlataforma: NumeroDaFila[];
  resultados: NumeroDaFila[];
  sinais: Sinal[];
}

interface RespostaFila {
  competencia: string | null;
  competencias: string[];
  itens: ItemDaFila[];
  /**
   * O resumo da operação, calculado no mesmo pedido.
   *
   * Opcional no tipo de propósito: as regressões que desenham a tabela montam
   * respostas sem ele, e uma resposta antiga em cache também não o tem. A aba
   * de visão geral some quando ele falta, em vez de a tela quebrar.
   */
  visaoGeral?: DadosDaVisaoGeral;
}

/* ------------------------------------------------------------------ */
/* Abas e filtros                                                      */
/* ------------------------------------------------------------------ */

type Aba = 'visao-geral' | 'fila';

/**
 * Aplica os filtros escolhidos.
 *
 * Os nomes das chaves são os mesmos que a visão geral usa nas fatias, e não
 * por acaso: é o que faz clicar num número levar exatamente àquele conjunto,
 * sem tradução no meio para alguém errar depois.
 *
 * `sinal` é o único que não compara igualdade: um relatório entra se **tem**
 * aquele tipo de sinal, entre os vários que pode ter.
 */
export function aplicarFiltros(itens: ItemDaFila[], filtros: Filtros): ItemDaFila[] {
  return itens.filter((item) => {
    if (filtros.carteira && item.carteira !== filtros.carteira) return false;
    if (filtros.produto && item.produto !== filtros.produto) return false;
    if (filtros.formato && (item.formato ?? 'NAO_DECLARADO') !== filtros.formato) return false;
    if (filtros.estado && item.estado !== filtros.estado) return false;
    if (filtros.sinal && !item.sinais.some((sinal) => sinal.tipo === filtros.sinal)) return false;
    return true;
  });
}

/** Como cada filtro ativo aparece escrito na tela. */
const ROTULO_DO_FILTRO: Record<CampoDeFiltro, string> = {
  carteira: 'Carteira',
  produto: 'Finalidade',
  formato: 'Formato',
  estado: 'Estado',
  sinal: 'Sinal',
};

/**
 * O texto do valor filtrado sai da PRÓPRIA visão geral, e não de um segundo
 * dicionário aqui.
 *
 * Dois dicionários para os mesmos rótulos é como a tela passaria a chamar a
 * mesma coisa por dois nomes conforme o lugar — e ninguém percebe até um
 * cliente perguntar.
 */
function rotuloDoValor(
  campo: CampoDeFiltro,
  valor: string,
  visaoGeral: DadosDaVisaoGeral | undefined,
): string {
  const fatias = visaoGeral
    ? {
        carteira: visaoGeral.cobertura.porCarteira,
        produto: visaoGeral.cobertura.porProduto,
        formato: visaoGeral.cobertura.porFormato,
        estado: visaoGeral.fila.porEstado,
        sinal: visaoGeral.qualidade.porTipo,
      }[campo]
    : [];
  return fatias.find((fatia) => fatia.chave === valor)?.rotulo ?? valor;
}

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

/** Aceita tanto `2026-08-05T23:41:24Z` quanto `2026-08-05 23:41:24+00`. */
function diaEMes(iso: string | null): string {
  if (!iso) return '';
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes ? `${dia}/${mes}` : '';
}

function primeiroNome(nome: string | null): string {
  if (!nome) return '';
  const limpo = nome.includes('@') ? nome.split('@')[0] : nome;
  return limpo.split(/[\s.]+/)[0];
}

/**
 * O estado, sempre com FORMA e TEXTO — nunca só cor.
 *
 * Vale para daltonismo, para impressão e para quem lê a tela num celular ao
 * sol. A forma é um losango, um círculo vazado, um círculo cheio ou um traço;
 * o texto diz a mesma coisa por extenso, com quem aprovou e quando.
 */
function textoDoEstado(item: ItemDaFila): string {
  switch (item.estado) {
    case 'gerado':
      return 'aguardando revisão';
    case 'liberado': {
      const quem = primeiroNome(item.aprovadoPor);
      const quando = diaEMes(item.aprovadoEm);
      if (quem && quando) return `aprovado por ${quem} · ${quando}`;
      if (quem) return `aprovado por ${quem}`;
      return 'aprovado';
    }
    case 'recusado': {
      const quem = primeiroNome(item.recusadoPor ?? null);
      const quando = diaEMes(item.recusadoEm ?? null);
      const decisao = quem && quando
        ? `recusado por ${quem} · ${quando}`
        : quem
          ? `recusado por ${quem}`
          : 'recusado';
      if (item.correcao?.estado === 'aguardando_nova_versao') {
        return `aguardando nova versão · ${decisao}`;
      }
      if (item.correcao?.estado === 'nova_versao_gerada') {
        return `nova versão gerada · ${decisao}`;
      }
      return decisao;
    }
    case 'enviado': {
      const quando = diaEMes(item.enviadoEm);
      return quando ? `enviado · ${quando}` : 'enviado';
    }
    case 'substituido':
      return 'substituído por uma versão nova';
    default:
      return 'estado desconhecido';
  }
}

/**
 * O motivo da recusa não pode ficar só no banco.
 *
 * Ele é a única coisa que o "não" produz, e é o que diz a quem for regerar o
 * relatório o que precisa mudar. Na fila ele viaja no `title` da célula de
 * estado — a linha continua curta, e a explicação está a um passo de distância
 * em vez de exigir abrir o relatório.
 */
function detalheDoEstado(item: ItemDaFila): string | undefined {
  if (item.estado !== 'recusado') return undefined;
  const motivo = (item.recusaMotivo ?? '').trim();
  const partes = [
    motivo ? `Motivo registrado: ${motivo}` : 'Recusado sem motivo legível no registro.',
  ];
  if (item.correcao?.estado === 'aguardando_nova_versao') {
    partes.push('Ordem de correção pendente: a fábrica precisa gerar uma versão nova.');
  } else if (item.correcao?.estado === 'nova_versao_gerada') {
    partes.push(`Ordem de correção atendida pela versão ${item.correcao.novaVersao ?? 'nova'}.`);
  }
  const estadoDoAviso = item.notificacaoInterna?.estado;
  if (estadoDoAviso === 'pendente') {
    partes.push('Aviso interno pendente na fila de saída; o painel não enviou WhatsApp.');
  } else if (estadoDoAviso === 'reservado' || estadoDoAviso === 'enviando') {
    partes.push('Aviso interno em processamento; a tentativa não é repetida automaticamente.');
  } else if (estadoDoAviso === 'enviado') {
    partes.push('Aviso interno enviado ao grupo canônico e confirmado pelo recibo do gateway.');
  } else if (estadoDoAviso === 'incerto') {
    partes.push('Aviso interno com confirmação incerta; exige conferência manual e não será repetido automaticamente.');
  } else if (estadoDoAviso === 'falhou') {
    partes.push('Aviso interno falhou antes do transporte; exige revisão manual.');
  }
  return partes.join(' ');
}

/**
 * Contagem de resultado — e o caso do Google, que apareceu no primeiro dado
 * real e não é defeito de ninguém.
 *
 * O Google Ads atribui conversões **fracionadas**: com atribuição orientada a
 * dados, uma venda tocada por três anúncios vira pedaços de crédito, e a conta
 * do mês fecha em `60,089809`. O relatório do cliente mostra isso com as casas,
 * e está certo — é o número da plataforma.
 *
 * Na fila, porém, o número existe para dizer em três segundos se o relatório
 * faz sentido, e ali `16,00 leads` ao lado de `22 leads` faz o leitor parar
 * para entender uma diferença que não existe. A regra é a mais conservadora
 * possível: **as casas decimais só aparecem quando elas existem**. `16,00` vira
 * `16`; `60,089809` continua `60,09`. Nenhum número é alterado nem arredondado
 * para caber — só param de ser escritos zeros que não informam nada.
 *
 * Isto vive aqui e **não** em `src/reports/format.ts` de propósito: aquele
 * arquivo formata o relatório que vai ao cliente, que já está fechado e
 * aprovado. Mudá-lo para arrumar a fila mexeria numa página que ninguém pediu
 * para mexer.
 */
function formatarContagem(valor: number, unidade: string): string {
  if (unidade === 'decimal' && Number.isInteger(valor)) {
    return formatarNumero(valor, 'inteiro' as any);
  }
  return formatarNumero(valor, unidade as any);
}

function textoDoInvestimento(item: ItemDaFila): string {
  // Ausência não vira zero: sem nenhum investimento apurado, a célula escreve
  // um traço. Um "R$ 0,00" aqui diria que o cliente não gastou nada no mês.
  if (item.investimento === null) return '—';
  return formatarNumero(item.investimento, 'brl' as any);
}

function detalheDoInvestimento(item: ItemDaFila): string {
  if (item.investimentoPorPlataforma.length === 0) {
    return 'Nenhum investimento apurado neste relatório.';
  }
  return item.investimentoPorPlataforma
    .map((parte) => `${parte.fonte}: ${formatarNumero(parte.valor, parte.unidade as any)}`)
    .join(' · ');
}

/** "Meta Ads" → "Meta". Na fila o espaço é curto e o "Ads" não desambigua nada. */
function nomeCurto(fonte: string): string {
  return fonte.replace(/\s+Ads$/i, '');
}

/**
 * O resultado do mês — e a razão de ele NÃO ser somado entre plataformas.
 *
 * Investimento soma porque dinheiro gasto no Meta e no Google é dinheiro
 * gasto, sem sobreposição possível. **Resultado não soma:** a mesma venda
 * pode ser atribuída pelo Meta e pelo Google ao mesmo tempo, e um total de
 * "218 compras" afirmaria um número que ninguém apurou. Então a fila mostra
 * lado a lado, dizendo de onde vem cada um.
 *
 * O rótulo aparece uma vez só quando é o mesmo nas duas ("Meta 158 · Google
 * 60,09 compras"), porque repeti-lo alonga a célula sem informar nada.
 */
function textoDoResultado(item: ItemDaFila): string {
  if (item.resultados.length === 0) return '—';

  if (item.resultados.length === 1) {
    const [r] = item.resultados;
    return `${formatarContagem(r.valor, r.unidade)} ${r.rotulo.toLowerCase()}`;
  }

  const rotulos = new Set(item.resultados.map((r) => r.rotulo.toLowerCase()));
  const numeros = item.resultados
    .map((r) => {
      const valor = formatarContagem(r.valor, r.unidade);
      return rotulos.size === 1
        ? `${nomeCurto(r.fonte)} ${valor}`
        : `${nomeCurto(r.fonte)} ${valor} ${r.rotulo.toLowerCase()}`;
    })
    .join(' · ');

  return rotulos.size === 1 ? `${numeros} ${[...rotulos][0]}` : numeros;
}

function detalheDoResultado(item: ItemDaFila): string {
  if (item.resultados.length === 0) {
    return 'Este relatório não publica número de resultado em nenhuma plataforma.';
  }
  const partes = item.resultados.map(
    (r) => `${r.fonte}: ${formatarContagem(r.valor, r.unidade)} ${r.rotulo.toLowerCase()}`,
  );
  // Quando algum número é fracionado, o detalhe diz por quê — senão a pessoa
  // fica achando que a plataforma contou errado.
  const temFracionado = item.resultados.some((r) => !Number.isInteger(r.valor));
  if (temFracionado) {
    partes.push('valor com casas decimais: a plataforma divide o crédito da conversão entre anúncios');
  }
  return partes.join(' · ');
}

function TabelaDeRelatorios({
  titulo,
  itens,
  competencia,
}: {
  key?: string;
  titulo: string;
  itens: ItemDaFila[];
  competencia: string;
}) {
  const idTitulo = `grupo-${titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <section className="dcp-fila__grupo" aria-labelledby={idTitulo}>
      <div className="dcp-fila__grupo-cabecalho">
        <h2 id={idTitulo} className="dcp-fila__grupo-titulo">
          {titulo}
        </h2>
        <span className="dcp-fila__grupo-contagem">{itens.length}</span>
      </div>
      <div className="dcp-fila__rolagem">
        <table className="dcp-tabela">
          <caption className="dcp-sr">
            {titulo}, {formatarCompetencia(competencia)}, em ordem de atenção
          </caption>
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col" className="dcp-tabela__secundaria">Estado</th>
              <th scope="col" className="dcp-tabela__numero dcp-tabela__secundaria">Investimento</th>
              <th scope="col" className="dcp-tabela__secundaria">Resultado</th>
              <th scope="col">Sinais de atenção</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="dcp-tabela__cliente">
                  <Link
                    to={
                      item.produto === 'mensal_interno_allgrotech'
                        ? `/painel-de-relatorios/interno/${encodeURIComponent(item.id)}`
                        : `?relatorio=${encodeURIComponent(item.id)}`
                    }
                    className="dcp-tabela__abrir"
                    aria-label={`Abrir o relatório de ${item.clienteNome}, ${formatarCompetencia(item.competencia)}`}
                  >
                    {item.clienteNome}
                  </Link>
                  {item.versao > 1 && <span className="dcp-tabela__versao">versão {item.versao}</span>}
                  <span className="dcp-tabela__movel">
                    <span className={`dcp-estado dcp-estado--${item.estado}`} title={detalheDoEstado(item)}>
                      <span className="dcp-estado__forma" aria-hidden="true" />
                      {textoDoEstado(item)}
                    </span>
                    <span className="dcp-tabela__movel-numeros">
                      {textoDoInvestimento(item)} · {textoDoResultado(item)}
                    </span>
                  </span>
                </th>
                <td className="dcp-tabela__secundaria">
                  <span className={`dcp-estado dcp-estado--${item.estado}`} title={detalheDoEstado(item)}>
                    <span className="dcp-estado__forma" aria-hidden="true" />
                    {textoDoEstado(item)}
                  </span>
                </td>
                <td className="dcp-tabela__numero dcp-tabela__secundaria" title={detalheDoInvestimento(item)}>
                  {textoDoInvestimento(item)}
                </td>
                <td className="dcp-tabela__secundaria" title={detalheDoResultado(item)}>
                  {textoDoResultado(item)}
                </td>
                <td>
                  {item.sinais.length === 0 ? (
                    <span className="dcp-tabela__sem-sinal">sem sinal</span>
                  ) : (
                    <span className="dcp-etiquetas">
                      {item.sinais.map((sinal, indice) => (
                        <span
                          key={`${sinal.tipo}-${indice}`}
                          className={`dcp-etiqueta dcp-etiqueta--${sinal.tipo}`}
                          title={sinal.detalhe}
                        >
                          {sinal.texto}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Esqueleto                                                           */
/* ------------------------------------------------------------------ */

/**
 * Esqueleto com a altura das linhas reais, e não um `spinner` no meio da tela.
 * O salto de layout quando o conteúdo chega é o que faz uma ferramenta parecer
 * amadora — e aqui o conteúdo é uma tabela, cuja altura a gente já conhece.
 */
function EsqueletoDaFila() {
  return (
    <div className="dcp-fila__esqueleto" aria-busy="true" aria-live="polite">
      <span className="dcp-sr">Carregando a fila do mês</span>
      {Array.from({ length: 6 }).map((_, indice) => (
        <div className="dcp-fila__esqueleto-linha" key={indice}>
          <span className="dcp-espera__barra" style={{ width: '22%' }} />
          <span className="dcp-espera__barra" style={{ width: '18%' }} />
          <span className="dcp-espera__barra" style={{ width: '12%' }} />
          <span className="dcp-espera__barra" style={{ width: '16%' }} />
          <span className="dcp-espera__barra" style={{ width: '24%' }} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A tela                                                              */
/* ------------------------------------------------------------------ */

/**
 * `Fila` busca; `FilaApresentada` desenha. A separação não é gosto: é o que
 * permite provar a tabela sem uma conta Google na mão.
 *
 * O que decide se esta fase está boa é a ORDEM e a leitura de cada linha, e
 * nada disso aparece num teste da função que soma. Enquanto a tabela vivia
 * grudada no `useEffect` que a carrega, a única forma de olhar para ela era
 * entrar no painel — o que exige as contas do Flávio ou da Fernanda, que quem
 * escreve o código não tem e não deve ter. Com a apresentação exportada, a
 * regressão renderiza a tabela com relatórios de mentira e confere o que saiu.
 */
export function FilaApresentada({
  dados,
  aoTrocarCompetencia,
}: {
  dados: RespostaFila;
  aoTrocarCompetencia?: (competencia: string) => void;
}) {
  return <CorpoDaFila dados={dados} aoTrocarCompetencia={aoTrocarCompetencia} />;
}

export default function Fila() {
  const { sessao } = usarPainelAuth();
  return <FilaComSessao sessao={sessao} />;
}

export function FilaComSessao({ sessao }: { sessao: Session | null }) {
  const [dados, setDados] = useState<RespostaFila | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<{ codigo: string; mensagem: string } | null>(null);
  const [competenciaPedida, setCompetenciaPedida] = useState<string | null>(null);
  const sessaoAtualRef = useRef(sessao);
  sessaoAtualRef.current = sessao;
  const usuarioId = sessao?.user?.id ?? null;

  const buscar = useCallback(
    async (competencia: string | null) => {
      const sessaoAtual = sessaoAtualRef.current;
      if (!usuarioId || !sessaoAtual) return;
      setCarregando(true);
      setErro(null);
      try {
        const endereco = competencia
          ? `/api/painel-fila?competencia=${encodeURIComponent(competencia)}`
          : '/api/painel-fila';
        const resposta = await fetch(endereco, {
          headers: { Authorization: `Bearer ${sessaoAtual.access_token}` },
        });

        let corpo: any = null;
        try {
          corpo = await resposta.json();
        } catch {
          corpo = null;
        }

        if (!resposta.ok) {
          setErro({
            codigo: String(corpo?.erro ?? `http_${resposta.status}`),
            mensagem: String(corpo?.mensagem ?? 'Não foi possível carregar a fila agora.'),
          });
          setDados(null);
          return;
        }

        setDados(corpo as RespostaFila);
      } catch {
        setErro({
          codigo: 'sem_rede',
          mensagem: 'Não foi possível falar com o servidor para carregar a fila.',
        });
        setDados(null);
      } finally {
        setCarregando(false);
      }
    },
    // O objeto Session muda quando a aba volta ao foco, mesmo que a pessoa e o
    // token sejam os mesmos. A identidade estável aqui é o usuário; o ref deixa
    // a próxima ação usar um token renovado sem refazer a fila por conta própria.
    [usuarioId],
  );

  useEffect(() => {
    void buscar(competenciaPedida);
  }, [buscar, competenciaPedida]);

  if (carregando) {
    return (
      <section className="dcp-fila">
        <h1 className="dcp-fila__titulo">Fila do mês</h1>
        <EsqueletoDaFila />
      </section>
    );
  }

  if (erro) {
    return (
      <section className="dcp-fila">
        <h1 className="dcp-fila__titulo">Fila do mês</h1>
        <div className="dcp-secao">
          <p className="dcp-erro">{erro.mensagem}</p>
          {erro.codigo === 'sem_chave_de_servico' && (
            <p className="dcp-secao__apoio">
              É configuração, não defeito. Falta cadastrar no servidor a chave secreta do banco
              (<strong>Supabase → Dácora Reports → Project Settings → API → a chave <code>service_role</code></strong>).
              Ela vai no <code>.env.local</code> desta pasta, para rodar na sua máquina, e nas variáveis de
              ambiente do projeto na Vercel, para a prévia — nos dois com o nome{' '}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>, e <strong>nunca</strong> com <code>VITE_</code> na
              frente.
            </p>
          )}
          <div className="dcp-acoes">
            <button
              type="button"
              className="dcp-botao dcp-botao--discreto"
              onClick={() => void buscar(competenciaPedida)}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <CorpoDaFila
      dados={dados ?? { competencia: null, competencias: [], itens: [] }}
      aoTrocarCompetencia={setCompetenciaPedida}
    />
  );
}

function CorpoDaFila({
  dados,
  aoTrocarCompetencia,
}: {
  dados: RespostaFila;
  aoTrocarCompetencia?: (competencia: string) => void;
}) {
  const competencias = dados?.competencias ?? [];
  const competencia = dados?.competencia ?? null;
  const itens = dados?.itens ?? [];
  const visaoGeral = dados?.visaoGeral;

  /* Os dois estados de navegação ficam ANTES do primeiro `return`, porque
     hook não pode ser chamado depois de uma saída antecipada. */
  const [aba, setAba] = useState<Aba>(visaoGeral ? 'visao-geral' : 'fila');
  const [filtros, setFiltros] = useState<Filtros>({});

  /**
   * Clicar num número da visão geral SUBSTITUI os filtros, não acumula.
   *
   * Se acumulasse, o número clicado e a quantidade de linhas que aparecem na
   * fila passariam a discordar — a pessoa clicaria em "19 Allgrotech" e veria
   * 4 linhas, porque um filtro de estado continuava ligado de antes. O painel
   * estaria mentindo sem errar uma conta sequer.
   */
  const filtrarEIrParaFila = (novos: Filtros) => {
    setFiltros(novos);
    setAba('fila');
  };

  /* Nenhum relatório em lugar nenhum. Não é erro, e não pode virar tabela
     vazia: quem vê uma tabela sem linhas procura defeito onde não há. */
  if (!competencia) {
    return (
      <section className="dcp-fila">
        <h1 className="dcp-fila__titulo">Fila do mês</h1>
        <div className="dcp-secao">
          <h2 className="dcp-secao__titulo">Ainda não há nenhum relatório no banco</h2>
          <p className="dcp-secao__apoio">
            Isto não é falha: a tabela está vazia porque nenhum relatório foi carregado ainda. São
            dois passos, nesta ordem — gerar o relatório do mês na fábrica e mandá-lo para cá com o
            carregador. O passo a passo está no registro do painel, na seção do carregador.
          </p>
        </div>
      </section>
    );
  }

  const visiveis = aplicarFiltros(itens, filtros);
  const filtrando = Object.keys(filtros).length > 0;

  const esperando = visiveis.filter((i) => i.estado === 'gerado').length;
  const recusados = visiveis.filter((i) => i.estado === 'recusado').length;
  const comSinal = visiveis.filter((i) => i.sinais.length > 0).length;
  const grupos = [
    {
      chave: 'externos-dacora',
      titulo: 'Mensais externos · Carteira Dácora',
      itens: visiveis.filter((item) => item.produto === 'mensal_externo_cliente' && item.carteira === 'DACORA'),
    },
    {
      chave: 'externos-allgrotech',
      titulo: 'Mensais externos · Carteira Allgrotech',
      itens: visiveis.filter((item) => item.produto === 'mensal_externo_cliente' && item.carteira === 'ALLGROTECH'),
    },
    {
      chave: 'internos-allgrotech',
      titulo: 'Mensais internos · Allgrotech',
      itens: visiveis.filter((item) => item.produto === 'mensal_interno_allgrotech'),
    },
    {
      chave: 'nao-identificados',
      titulo: 'Classificação pendente no snapshot',
      itens: visiveis.filter(
        (item) => item.produto === 'NAO_IDENTIFICADO' || item.carteira === 'NAO_IDENTIFICADA',
      ),
    },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <section className="dcp-fila">
      <div className="dcp-fila__cabecalho">
        <h1 className="dcp-fila__titulo">
          {aba === 'visao-geral' ? 'Visão geral de ' : 'Fila de '}
          {formatarCompetencia(competencia)}
        </h1>

        {competencias.length > 1 && (
          <label className="dcp-fila__mes">
            <span className="dcp-sr">Competência</span>
            <select
              value={competencia}
              onChange={(evento) => aoTrocarCompetencia?.(evento.target.value)}
            >
              {competencias.map((mes) => (
                <option key={mes} value={mes}>
                  {formatarCompetencia(mes)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* As abas só aparecem quando há visão geral para mostrar. Uma aba que
          abre vazia é pior que aba nenhuma. */}
      {visaoGeral && (
        <div className="dcp-abas" role="tablist" aria-label="Como ver os relatórios do mês">
          {(
            [
              ['visao-geral', 'Visão geral'],
              ['fila', 'Fila'],
            ] as Array<[Aba, string]>
          ).map(([chave, texto]) => (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={aba === chave}
              className={`dcp-abas__item${aba === chave ? ' dcp-abas__item--ativa' : ''}`}
              onClick={() => setAba(chave)}
            >
              {texto}
            </button>
          ))}
        </div>
      )}

      {aba === 'visao-geral' && visaoGeral ? (
        <VisaoGeral dados={visaoGeral} aoFiltrar={filtrarEIrParaFila} />
      ) : (
        <>
          {filtrando && (
            <div className="dcp-filtros">
              <span className="dcp-filtros__rotulo">Filtrando por</span>
              {(Object.keys(filtros) as CampoDeFiltro[]).map((campo) => (
                <button
                  key={campo}
                  type="button"
                  className="dcp-filtros__chip"
                  onClick={() => {
                    const resto = { ...filtros };
                    delete resto[campo];
                    setFiltros(resto);
                  }}
                  title="Remover este filtro"
                >
                  {ROTULO_DO_FILTRO[campo]}: {rotuloDoValor(campo, filtros[campo] as string, visaoGeral)}
                  <span aria-hidden="true"> ×</span>
                  <span className="dcp-sr">— remover</span>
                </button>
              ))}
              <button
                type="button"
                className="dcp-botao dcp-botao--discreto"
                onClick={() => setFiltros({})}
              >
                Limpar
              </button>
            </div>
          )}

          <p className="dcp-fila__resumo">
            {filtrando
              ? `${visiveis.length} de ${itens.length} ${itens.length === 1 ? 'relatório' : 'relatórios'}`
              : `${visiveis.length} ${visiveis.length === 1 ? 'relatório' : 'relatórios'}`}{' '}
            · {esperando} esperando revisão
            {recusados > 0 && ` · ${recusados} ${recusados === 1 ? 'recusado' : 'recusados'}`} ·{' '}
            {comSinal} com sinal de atenção
            <span className="dcp-fila__ordem"> — em ordem de atenção, não alfabética</span>
          </p>

          {filtrando && visiveis.length === 0 && (
            <div className="dcp-secao">
              <h2 className="dcp-secao__titulo">Nenhum relatório com esse filtro</h2>
              <p className="dcp-secao__apoio">
                Os {itens.length} relatórios do mês continuam lá — é o filtro que não encontrou
                nenhum. Remova um dos filtros acima para voltar a vê-los.
              </p>
            </div>
          )}

          {itens.length === 0 ? (
            <div className="dcp-secao">
              <h2 className="dcp-secao__titulo">
                Nenhum relatório gerado em {formatarCompetencia(competencia)}
              </h2>
              <p className="dcp-secao__apoio">
                Este mês existe no banco, mas sem nenhum relatório dentro. A geração ainda não rodou
                para esta competência, ou rodou e não foi carregada.
              </p>
            </div>
          ) : (
            <div className="dcp-fila__grupos">
              {grupos.map((grupo) => (
                <TabelaDeRelatorios
                  key={grupo.chave}
                  titulo={grupo.titulo}
                  itens={grupo.itens}
                  competencia={competencia}
                />
              ))}
            </div>
          )}
        </>
      )}

      <p className="dcp-fila__rodape">
        Esta tela é só leitura. Aprovar e recusar acontecem na tela de revisão, com o relatório
        aberto — não existe caminho para aprovar sem ver o que vai para o cliente.
      </p>
    </section>
  );
}
