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

export type PlataformaId = 'meta' | 'google' | 'ga4' | 'instagram' | 'ecommerce';

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
  situacao: SituacaoFonte;
  metricas: Metrica[];
}

export type SituacaoCampanha = 'ativa' | 'pausada' | 'encerrada';

export interface Campanha {
  id: string;
  nome: string;
  plataforma: PlataformaId;
  objetivo: string;
  situacao: SituacaoCampanha;
  investimento: Valor;
  leads: Valor;
  custoPorLead: Valor;
  impressoes: Valor;
  cliques: Valor;
  ctr: Valor;
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
