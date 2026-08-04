/**
 * O CATÁLOGO DE BLOCOS — contrato.
 *
 * Um relatório de cliente é **uma lista de blocos, na ordem, com parâmetros**.
 * Não é um arquivo escrito à mão por cliente, e não é um `if` por nome.
 *
 * Isso não foi deduzido: veio da leitura dos seis relatórios que a Fernanda
 * entrega e valida hoje. Onze blocos cobrem os seis inteiros, e seis desses
 * blocos aparecem em quatro ou mais deles. A prova mais forte é a Aviarte:
 * quatro das nove páginas dela são o mesmo trio de blocos com escopo
 * diferente. Ver `docs/CATALOGO_BLOCOS_RELATORIOS_2026-08-04.md` no repositório
 * da fábrica.
 *
 * Consequência prática, e é a razão de este arquivo existir: **consertar um
 * bloco conserta a carteira inteira**; escrever uma página por cliente
 * obrigaria a consertar 46 vezes e a descobrir 46 vezes que se esqueceu uma.
 *
 * ---
 *
 * Divisão de responsabilidade, que vale para todo bloco daqui para baixo:
 *
 *  • a MONTAGEM diz quais blocos, em que ordem, com quais parâmetros de
 *    apresentação. Vem do cadastro do cliente, na fábrica.
 *  • os DADOS vêm do snapshot, indexados por id. Nenhum bloco calcula,
 *    soma ou infere: a página só apresenta o que já foi apurado.
 *  • as REGRAS DA CASA vivem no componente do bloco e não são parâmetro.
 *    Ausência não vira zero, valor travado não entra em comparação, e causa
 *    não é inventada — nem para "ficar igual ao relatório de origem".
 */

import type {
  Metrica,
  PlataformaId,
  SituacaoCampanha,
  SnapshotBase,
  Unidade,
  Valor,
} from '../snapshot';

/* ------------------------------------------------------------------ */
/* Escopo                                                              */
/* ------------------------------------------------------------------ */

/**
 * A que recorte um bloco se refere.
 *
 * Existe por causa de um defeito real encontrado no relatório do ICH: numa
 * faixa de indicadores presa a UMA campanha, o "Custo por Mensagem" usava o
 * investimento da **conta inteira** no numerador e as mensagens **daquela
 * campanha** no denominador. O cliente lia R$ 31,56 onde o número honesto era
 * R$ 16,00 — quase o dobro, sem nada parecer errado na tela.
 *
 * Aqui o escopo é declarado e **aparece impresso**. Se o bloco é de uma
 * campanha, todo número dele é daquela campanha, e o leitor consegue conferir
 * isso sem confiar na nossa palavra.
 */
export interface Escopo {
  tipo: 'conta' | 'plataforma' | 'campanha' | 'grupo' | 'ano';
  /** Como aparece na tela. Ex.: "conta inteira", "campanha MENSAGENS". */
  rotulo: string;
  /**
   * Presente quando o escopo é um agrupamento que **não existe em API
   * nenhuma** — "Público Frio", "Descoberta e Remarketing", "Outros". São
   * convenção interna, resolvida por id de campanha vindo do cadastro, nunca
   * adivinhada pelo nome. Cliente sem mapa não ganha agrupamento inventado.
   */
  campanhasDoGrupo?: string[];
}

/* ------------------------------------------------------------------ */
/* B1 — Faixa de indicadores                                           */
/* ------------------------------------------------------------------ */

export interface FaixaIndicadores {
  id: string;
  escopo: Escopo;
  /** De 3 a 8. Cada um já traz valor, origem, fórmula e comparativo. */
  metricas: Metrica[];
}

/* ------------------------------------------------------------------ */
/* B2 — Tabela de entidades com métricas                               */
/* ------------------------------------------------------------------ */

export type DimensaoEntidade =
  | 'campanha'
  | 'grupo_de_anuncios'
  | 'palavra_chave'
  | 'termo_de_pesquisa'
  | 'produto'
  | 'canal_ga4';

export interface ColunaTabela {
  id: string;
  rotulo: string;
  unidade: Unidade;
  sufixo?: string;
  /** Sai da grade no celular e volta na linha de detalhe. */
  secundaria?: boolean;
}

export interface LinhaTabela {
  id: string;
  nome: string;
  plataforma: PlataformaId;
  situacao?: SituacaoCampanha;
  etiqueta?: string;
  /** Um valor por coluna, incluindo a principal. */
  valores: Record<string, Valor>;
}

export interface TabelaEntidades {
  id: string;
  dimensao: DimensaoEntidade;
  /** Cabeçalho da primeira coluna. */
  rotuloDimensao: string;
  escopo: Escopo;
  /** Id da coluna que ganha barra embutida e ordena a tabela. */
  colunaPrincipal: string;
  colunas: ColunaTabela[];
  linhas: LinhaTabela[];
  total: { rotulo: string; valores: Record<string, Valor | null> };
  /**
   * A fórmula de cada coluna calculada, em português. **Obrigatória para o
   * CPC**, que é a armadilha mais cara do catálogo: na carteira ele significa
   * "investimento ÷ cliques no link" em quatro clientes e "investimento ÷
   * cliques totais" na Aviarte, com 54% de diferença entre as duas e nenhum
   * sinal na tela. São grandezas diferentes com o mesmo nome; escrever a
   * fórmula é o que impede a confusão.
   */
  definicoes: string[];
}

/* ------------------------------------------------------------------ */
/* B3 — Evolução mensal do ano corrente                                */
/* ------------------------------------------------------------------ */

export interface LinhaMes {
  /** AAAA-MM. */
  competencia: string;
  valores: Record<string, Valor>;
  /**
   * Por que aquele mês está diferente dos outros — na prática, "sem
   * veiculação". Fica ao lado do nome do mês, e não numa nota de rodapé: "não
   * anunciamos em fevereiro" e "anunciamos e não deu nada" são leituras
   * opostas, e quem vê uma linha de traços precisa saber qual das duas é sem
   * ter de procurar.
   */
  observacao?: string;
}

export interface EvolucaoMensal {
  id: string;
  plataforma: PlataformaId;
  colunas: ColunaTabela[];
  /** Do primeiro mês fechado do ano até o anterior ao relatório. */
  meses: LinhaMes[];
  /**
   * O total é do PERÍODO INTEIRO, nunca a média das linhas. Conferido na
   * VetSell: o CPC total é o investimento acumulado dividido pelos cliques
   * acumulados, e a média dos sete CPCs mensais dá outro número.
   */
  total: { rotulo: string; valores: Record<string, Valor | null> };
  definicoes: string[];
}

/* ------------------------------------------------------------------ */
/* B4 — Ranking de criativos                                           */
/* ------------------------------------------------------------------ */

export interface Miniatura {
  /**
   * Caminho da imagem **guardada por nós**, nunca o endereço devolvido pela
   * Meta: aquele é link assinado que expira, e um relatório de julho aberto em
   * outubro mostraria quadrados vazios sem erro nenhum. A imagem é baixada na
   * geração do snapshot e servida atrás do mesmo token do relatório, para a
   * miniatura de um cliente nunca ser alcançável por quem tem o link de outro.
   */
  src: string;
  alt: string;
}

/**
 * A situação do anúncio, quando a montagem pede para mostrá-la.
 *
 * Ela vem com data obrigatória por um motivo concreto. O relatório de origem da
 * VetSell imprime `ADSET_PAUSED` e `CAMPAIGN_PAUSED` — status cru da API, em
 * inglês — e o status é o de **hoje**, não o do período. Um anúncio que rodou
 * julho inteiro e foi pausado em agosto aparece como "pausado" num relatório
 * sobre julho, e o cliente conclui que ele não rodou.
 *
 * Aqui o status é traduzido e **datado**: "Pausado · situação em 01/08/2026".
 * Sem a data ele mentiria sobre o período; com ela, é informação útil.
 */
export interface SituacaoCriativo {
  situacao: SituacaoCampanha;
  /** ISO 8601 do momento em que a situação foi lida. */
  lidaEm: string;
}

export interface Criativo {
  id: string;
  nome: string;
  /** `null` quando a imagem não foi guardada. O motivo é impresso. */
  miniatura: Miniatura | null;
  motivoSemMiniatura?: string;
  /** Um ou dois números por cartão: resultado e, às vezes, custo. */
  numeros: { rotulo: string; valor: Valor; unidade: Unidade }[];
  /** Só quando a montagem pede. Ausente = não mostrar situação. */
  situacao?: SituacaoCriativo;
}

export interface RankingCriativos {
  id: string;
  escopo: Escopo;
  /** Rótulo da métrica que ordena, escrito na tela. */
  ordenadoPor: string;
  criativos: Criativo[];
}

/* ------------------------------------------------------------------ */
/* B6 — Quebra por dimensão não temporal                               */
/* ------------------------------------------------------------------ */

export interface ItemQuebra {
  id: string;
  rotulo: string;
  valor: Valor;
  /**
   * Ressalva daquela categoria. É onde mora a explicação do `Unknown` que a
   * Meta devolve na quebra por região: ele é **valor real da plataforma**, e
   * quer dizer "a Meta não determinou a região deste gasto". Tratá-lo como
   * falha e escondê-lo seria tão errado quanto tratá-lo como zero.
   */
  nota?: string;
}

export interface QuebraPorDimensao {
  id: string;
  plataforma: PlataformaId;
  escopo: Escopo;
  /** Pergunta que a quebra responde. Vira o título do gráfico. */
  pergunta: string;
  unidade: Unidade;
  unidadeTexto: string;
  itens: ItemQuebra[];
}

/* ------------------------------------------------------------------ */
/* B7 — Glossário de métricas                                          */
/* ------------------------------------------------------------------ */

/**
 * O glossário **não entra no snapshot**. O texto de cada métrica é escrito
 * uma vez em código, em `src/reports/glossario.ts`, e vale para todo cliente.
 * Hoje a mesma explicação de CPM aparece em quatro relatórios com redação
 * ligeiramente diferente; isso deixa de acontecer por construção.
 *
 * A montagem só diz QUAIS métricas explicar e ONDE o glossário fica.
 */
export type PosicaoGlossario = 'rodape' | 'sob_o_numero';

/* ------------------------------------------------------------------ */
/* B8 — Comentário humano ("Leitura")                                  */
/* ------------------------------------------------------------------ */

/**
 * Um parágrafo escrito por gente: causa, estratégia executada, contexto de
 * projeto. É a única parte do relatório que pode dizer **por quê**, porque é a
 * única em que alguém assume a autoria da afirmação.
 *
 * O exemplo real da VetSell mostra bem o que só cabe aqui: *"retiramos o
 * Facebook das campanhas a partir do feedback de que estavam chegando muitos
 * leads desqualificados"*. Tem decisão tomada, motivo e retorno do time
 * comercial do cliente. Nenhuma API tem isso, e nenhuma leitura automática
 * poderia inventar.
 *
 * Três regras, e as três existem para o leitor nunca confundir apuração com
 * opinião:
 *
 *  • é **assinado** — nome e data de quem escreveu;
 *  • é **visualmente distinto** do texto gerado em código;
 *  • quando ninguém escreve, some sem deixar buraco. Metade dos seis
 *    relatórios validados não tem nenhum comentário humano e mesmo assim é
 *    entregue ao cliente — o campo é opcional de verdade, não "opcional mas
 *    todo mundo preenche".
 */
export interface ComentarioHumano {
  id: string;
  paragrafos: string[];
  autor: string;
  /** ISO 8601. */
  escritoEm: string;
}

/* ------------------------------------------------------------------ */
/* A montagem                                                          */
/* ------------------------------------------------------------------ */

interface BlocoBase {
  /** Único dentro da montagem. Vira o id da seção e o alvo de âncora. */
  id: string;
  titulo: string;
  apoio?: string;
}

export interface BlocoB1 extends BlocoBase {
  bloco: 'B1';
  /** Id em `dados.faixas`. */
  faixa: string;
  /** A página 1 do ICH e a de evolução do Zenun não mostram variação. */
  mostrarVariacao: boolean;
  /** Uma frase explicando cada métrica sob o número. Só o Zenun usa. */
  descricaoSobNumero?: boolean;
}

export interface BlocoB2 extends BlocoBase {
  bloco: 'B2';
  /** Id em `dados.tabelas`. */
  tabela: string;
  pergunta: string;
  participacaoRotulo?: string;
}

export interface BlocoB3 extends BlocoBase {
  bloco: 'B3';
  /** Id em `dados.evolucoesMensais`. */
  evolucao: string;
  /** Tabela em VetSell, ICH e Zenun; gráfico combinado na Karyne. */
  apresentacao: 'tabela';
}

export interface BlocoB4 extends BlocoBase {
  bloco: 'B4';
  /** Id em `dados.rankingsCriativos`. */
  ranking: string;
}

export interface BlocoB6 extends BlocoBase {
  bloco: 'B6';
  /** Id em `dados.quebras`. */
  quebra: string;
}

export interface BlocoB7 extends BlocoBase {
  bloco: 'B7';
  posicao: PosicaoGlossario;
  /** Ids de métrica resolvidos contra `src/reports/glossario.ts`. */
  metricas: string[];
}

export interface BlocoB8 extends BlocoBase {
  bloco: 'B8';
  /** Id em `dados.comentarios`. Ausente no snapshot = seção não aparece. */
  comentario: string;
}

export type BlocoConfigurado =
  | BlocoB1
  | BlocoB2
  | BlocoB3
  | BlocoB4
  | BlocoB6
  | BlocoB7
  | BlocoB8;

export type BlocoId = BlocoConfigurado['bloco'];

/* ------------------------------------------------------------------ */
/* Os dados que os blocos leem                                         */
/* ------------------------------------------------------------------ */

export interface DadosDeBloco {
  faixas: Record<string, FaixaIndicadores>;
  tabelas: Record<string, TabelaEntidades>;
  evolucoesMensais: Record<string, EvolucaoMensal>;
  rankingsCriativos: Record<string, RankingCriativos>;
  quebras: Record<string, QuebraPorDimensao>;
  /** Ausente quando ninguém escreveu nada naquele mês. Não é falha. */
  comentarios?: Record<string, ComentarioHumano>;
}

/**
 * O snapshot de um relatório montado por blocos.
 *
 * `montagem` e `dados` são separados de propósito: a montagem é decisão de
 * produto (o que o cliente vê), os dados são resultado de coleta. Trocar a
 * ordem de duas seções não deveria exigir recoletar nada, e recoletar não
 * deveria mexer no formato.
 */
export type SnapshotMontado = SnapshotBase & {
  montagem: BlocoConfigurado[];
  dados: DadosDeBloco;
};
