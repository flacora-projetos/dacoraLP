/**
 * Contrato do snapshot mensal — Dácora Reports (fase W0).
 *
 * Este arquivo é o contrato. A fixture o preenche à mão hoje; o coletor do
 * repositório OpenClaw-Dacora vai preenchê-lo na W1. A página web nunca
 * calcula, nunca soma e nunca infere: ela apenas apresenta o que está aqui.
 *
 * Três regras que o formato precisa sustentar sozinho:
 *
 *  1. Ausência, falha e zero são estados diferentes. Por isso todo número é
 *     um `Valor` discriminado, e não `number | null`.
 *  2. Todo número carrega sua origem (coletado ou calculado, de qual fonte).
 *  3. Lacuna em série é preservada como `null`; nada é interpolado.
 *
 * Versão do schema: ver `VERSAO_SCHEMA`.
 */

export const VERSAO_SCHEMA = '2026-08-w0';

/* ------------------------------------------------------------------ */
/* Identidade                                                          */
/* ------------------------------------------------------------------ */

/**
 * O tipo do relatório é o que decide o formato da página. É o equivalente,
 * aqui, ao `client_report_formats` do repositório da fábrica: o layout muda
 * por TIPO, nunca por nome de cliente. Cliente novo de e-commerce recebe
 * `ecommerce` no snapshot e ganha o modelo inteiro sem uma linha de código.
 */
export type TipoRelatorio = 'servicos_leads' | 'ecommerce';

export interface Periodo {
  /** ISO 8601, primeiro dia do período (inclusivo). */
  inicio: string;
  /** ISO 8601, último dia do período (inclusivo). */
  fim: string;
}

export interface Identidade {
  /** Identificador interno do relatório. Não é o token público da URL. */
  relatorioId: string;
  /** Slug canônico do cliente em config/clients.json (fábrica). */
  clienteSlug: string;
  /** Nome exibido, como o cliente se reconhece. */
  clienteNome: string;
  /** Competência no formato AAAA-MM. */
  competencia: string;
  periodo: Periodo;
  fusoHorario: string;
  tipoRelatorio: TipoRelatorio;
  versaoSchema: string;
}

/* ------------------------------------------------------------------ */
/* Fontes                                                              */
/* ------------------------------------------------------------------ */

export type PlataformaId =
  | 'meta'
  | 'google'
  | 'pinterest'
  | 'ga4'
  | 'instagram'
  | 'ecommerce';

/**
 * `sucesso`        — tudo que se esperava veio.
 * `parcial`        — a fonte respondeu, mas faltou alguma métrica.
 * `indisponivel`   — a fonte não respondeu nesta coleta.
 * `nao_configurada`— o cliente não tem essa fonte. Não é falha.
 * `erro`           — a fonte respondeu com erro identificado.
 */
export type SituacaoFonte =
  | 'sucesso'
  | 'parcial'
  | 'indisponivel'
  | 'nao_configurada'
  | 'erro';

export type PapelFonte = 'midia' | 'medicao' | 'organico' | 'loja';

export interface Fonte {
  plataforma: PlataformaId;
  rotulo: string;
  papel: PapelFonte;
  situacao: SituacaoFonte;
  /** Conta consultada, já mascarada para exibição. `null` quando não há. */
  conta: string | null;
  /** Momento da coleta, ISO 8601 com fuso. */
  coletadoEm: string | null;
  janela: Periodo | null;
  /** Observações de qualidade, em português, prontas para exibir. */
  observacoes: string[];
}

/* ------------------------------------------------------------------ */
/* Valores e métricas                                                  */
/* ------------------------------------------------------------------ */

export type Unidade =
  | 'brl'
  | 'inteiro'
  | 'percentual'
  | 'brl_por_unidade'
  | 'decimal';

/**
 * O ponto central do contrato. Um valor nunca é só um número:
 * ele é um número **ou** a explicação de por que não existe.
 */
export type Valor =
  | { estado: 'ok'; numero: number }
  | { estado: 'ausente'; motivo: string }
  | { estado: 'falha'; motivo: string };

export interface Origem {
  tipo: 'coletado' | 'calculado';
  fontes: PlataformaId[];
  /** Fórmula em português, quando calculado. Ex.: "investimento ÷ leads". */
  formula?: string;
}

export interface Comparativo {
  permitido: boolean;
  /** Obrigatório quando `permitido` é false. */
  motivo?: string;
  competenciaBase?: string;
  valorBase?: Valor;
  /** Variação em pontos percentuais decimais (0.14 = +14%). */
  variacao?: number | null;
}

/** Para saber se uma variação é boa ou ruim sem chutar pela cor. */
export type DirecaoFavoravel = 'alta' | 'baixa' | 'neutra';

export interface Metrica {
  id: string;
  rotulo: string;
  /** Uma linha explicando o que a métrica mede. */
  descricao?: string;
  unidade: Unidade;
  /** Sufixo curto exibido junto do número. Ex.: "/lead". */
  sufixo?: string;
  valor: Valor;
  origem: Origem;
  direcaoFavoravel: DirecaoFavoravel;
  comparativo?: Comparativo;
}

/* ------------------------------------------------------------------ */
/* Séries                                                              */
/* ------------------------------------------------------------------ */

export interface ChaveSerie {
  id: string;
  rotulo: string;
  plataforma: PlataformaId;
}

export interface PontoSerie {
  /** ISO 8601 (dia ou primeiro dia da semana). */
  data: string;
  /** `null` é lacuna preservada — nunca zero, nunca interpolação. */
  valores: Record<string, number | null>;
}

export interface Serie {
  id: string;
  /** O título do gráfico é a pergunta que ele responde. */
  pergunta: string;
  granularidade: 'dia' | 'semana' | 'campanha';
  unidade: Unidade;
  /**
   * O que está sendo medido, em uma linha curta. É onde a receita declara a
   * fonte: "Reais atribuídos pelas plataformas, por dia" não é a mesma coisa
   * que "Reais faturados pela loja, por dia". Quando ausente, a página cai
   * num texto genérico derivado da unidade.
   */
  unidadeTexto?: string;
  chaves: ChaveSerie[];
  pontos: PontoSerie[];
  observacoes: string[];
}

/* ------------------------------------------------------------------ */
/* Canais e campanhas                                                  */
/* ------------------------------------------------------------------ */

export interface Canal {
  plataforma: PlataformaId;
  rotulo: string;
  /**
   * O papel separa quem investe (`midia`) de quem só mede (`medicao`) e de
   * quem registra a venda (`loja`). A página usa isto para nunca colocar GA4
   * num gráfico de investimento e nunca somar loja com mídia.
   */
  papel: PapelFonte;
  situacao: SituacaoFonte;
  metricas: Metrica[];
  /** Uma linha de contexto do canal, quando o número sozinho engana. */
  nota?: string;
}

export type SituacaoCampanha = 'ativa' | 'pausada' | 'encerrada';

/**
 * A natureza é o que a campanha foi comprada para fazer. Ela existe para
 * impedir a soma errada: campanha de venda, de tráfego e de mensagem não vão
 * para o mesmo total, porque o resultado delas não é a mesma coisa.
 */
export type NaturezaCampanha =
  | 'venda'
  | 'cadastro'
  | 'trafego'
  | 'mensagem'
  | 'reconhecimento';

interface CampanhaBase {
  id: string;
  nome: string;
  plataforma: PlataformaId;
  objetivo: string;
  natureza: NaturezaCampanha;
  situacao: SituacaoCampanha;
  investimento: Valor;
  impressoes: Valor;
  cliques: Valor;
  ctr: Valor;
}

export interface CampanhaLeads extends CampanhaBase {
  resultado: 'leads';
  leads: Valor;
  custoPorLead: Valor;
}

export interface CampanhaVenda extends CampanhaBase {
  resultado: 'venda';
  compras: Valor;
  /**
   * Receita que ESTA plataforma atribui a si. Nunca é faturamento, nunca pode
   * ser somada com o que a loja registrou, e o rótulo na tela é obrigado a
   * dizer quem atribuiu.
   */
  receitaAtribuida: Valor;
  /** Receita atribuída ÷ investimento desta campanha. */
  roas: Valor;
  custoPorCompra: Valor;
  /** Janela de atribuição declarada pela plataforma, em português. */
  janelaAtribuicao: string;
}

/** Campanha que não foi comprada para vender: tráfego, mensagem, alcance. */
export interface CampanhaSemVenda extends CampanhaBase {
  resultado: 'sem_venda';
  /** Por que não há receita atribuída a ela. Aparece na tela. */
  motivo: string;
  /** O resultado próprio da natureza dela, quando existe. */
  resultadoProprio?: {
    rotulo: string;
    valor: Valor;
    unidade: Unidade;
    custoRotulo?: string;
    custo?: Valor;
  };
}

export type Campanha = CampanhaLeads | CampanhaVenda | CampanhaSemVenda;

/* ------------------------------------------------------------------ */
/* Confronto entre o que a mídia atribui e o que a loja registrou      */
/* ------------------------------------------------------------------ */

/**
 * Só o relatório de e-commerce usa este bloco.
 *
 * Ele existe porque a soma do que as plataformas atribuem quase nunca é igual
 * ao faturamento da loja, e as duas formas erradas de lidar com isso são
 * esconder a diferença ou eleger um dos números como "o verdadeiro". Aqui os
 * dois aparecem inteiros, com o que cada um conta e em que janela, e a
 * diferença é apresentada como diferença — sem causa inventada.
 */
export interface FonteDeVenda {
  id: string;
  rotulo: string;
  papel: PapelFonte;
  /** O que essa fonte conta, em português. */
  oQueConta: string;
  /** Janela declarada por ela. */
  janela: string;
  receita: Valor;
  pedidos: Valor;
  /** `true` para a linha de soma das plataformas de mídia. */
  soma?: boolean;
  observacao?: string;
}

export interface LadoDoConfronto {
  rotulo: string;
  descricao: string;
  receita: Valor;
  pedidos: Valor;
  /** Rótulo da contagem: "compras atribuídas" x "pedidos pagos". */
  pedidosRotulo: string;
}

export interface ConfrontoReceita {
  midia: LadoDoConfronto;
  loja: LadoDoConfronto;
  diferenca: {
    receita: Valor;
    receitaPercentual: Valor;
    pedidos: Valor;
    pedidosPercentual: Valor;
    /** Sobre o que o percentual foi calculado. */
    base: string;
  };
  /**
   * Texto montado pelo gerador a partir dos números já apurados — o mesmo
   * padrão da "Leitura do período". Nunca escrito por modelo, nunca com causa
   * que ninguém mediu.
   */
  explicacao: string[];
  fontes: FonteDeVenda[];
}

/* ------------------------------------------------------------------ */
/* Leitura do mês                                                      */
/* ------------------------------------------------------------------ */

/**
 * Cada afirmação material aponta para os ids que a sustentam. Se um dia a
 * leitura for escrita por agente, a checagem "isso está sustentado?" continua
 * possível sem ler o texto.
 */
export interface Afirmacao {
  texto: string;
  sustentadaPor: string[];
}

export interface Leitura {
  resumoExecutivo: Afirmacao[];
  destaques: Afirmacao[];
  atencao: Afirmacao[];
  proximosPassos: Afirmacao[];
}

/* ------------------------------------------------------------------ */
/* Publicação                                                          */
/* ------------------------------------------------------------------ */

export type EstadoPublicacao = 'gerado' | 'liberado' | 'substituido';

export interface Publicacao {
  estado: EstadoPublicacao;
  versao: number;
  /** Checksum do conteúdo. A aprovação carimba esta versão. */
  checksum: string;
  geradoEm: string;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  enviadoEm: string | null;
  substituiVersao: number | null;
}

/* ------------------------------------------------------------------ */
/* Raiz                                                                */
/* ------------------------------------------------------------------ */

export interface Snapshot {
  identidade: Identidade;
  fontes: Fonte[];
  /** De 3 a 5. São os indicadores que abrem o relatório. */
  indicadores: Metrica[];
  canais: Canal[];
  campanhas: Campanha[];
  /** Indexadas por id para a página escolher sem varrer array. */
  series: Record<string, Serie>;
  /** Presente só quando há loja e mídia contando venda ao mesmo tempo. */
  confrontoReceita?: ConfrontoReceita;
  leitura: Leitura;
  publicacao: Publicacao;
}

/** Competência disponível no portal. Não faz parte do snapshot. */
export interface CompetenciaDisponivel {
  competencia: string;
  rotulo: string;
  /** Só competência publicada é navegável. */
  publicada: boolean;
  href?: string;
}
