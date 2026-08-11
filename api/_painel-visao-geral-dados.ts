/**
 * A visão geral da operação — a parte que conta, sem rede e sem banco.
 *
 * Vive em `api/` com prefixo `_` porque a Vercel ignora arquivos iniciados por
 * underscore ao transformar `api/` em funções: é módulo compartilhado do
 * servidor, não rota.
 *
 * ---------------------------------------------------------------------------
 * A PERGUNTA QUE ESTE ARQUIVO RESPONDE
 *
 * A fila responde "qual destes relatórios eu preciso olhar com cuidado?".
 * Esta responde a outra, que a fila nunca respondeu: **"como vai a produção
 * dos relatórios deste mês?"** — quantos existem, onde a fila parou, o que tem
 * problema, quanto foi refeito e se o mês fechou no prazo.
 *
 * O objeto medido é **a operação dos relatórios**, nunca a performance das
 * campanhas dos clientes. Por isso aqui não se soma investimento, resultado,
 * lead nem receita: leads de clientes diferentes têm definições diferentes, e
 * empilhá-los produziria um número grande e sem significado nenhum.
 * ---------------------------------------------------------------------------
 *
 * As regras da casa que valem aqui:
 *
 *  • **ausência não vira zero.** Competência cujo prazo ainda não venceu não
 *    reporta "0 atrasados": reporta que o prazo está em aberto;
 *  • **causa não é inventada.** Cada número diz o que foi contado, nunca por
 *    que aconteceu;
 *  • **não se deduz classificação pelo nome do cliente.** Carteira, finalidade
 *    e formato vêm do snapshot ou não vêm.
 */
import { montarItem, type ItemDaFila, type LinhaDoBanco } from './_painel-fila-dados.js';
import { separarPorVersaoCorrente } from './_painel-versao-corrente.js';

/* ------------------------------------------------------------------ */
/* O que sai para a tela                                               */
/* ------------------------------------------------------------------ */

export interface Fatia {
  /** Chave estável, usada como filtro na fila. */
  chave: string;
  /** Como a pessoa lê. */
  rotulo: string;
  quantidade: number;
}

export type SituacaoDoPrazo = 'em_aberto' | 'vencido';

export interface PrazoDaCompetencia {
  /** O dia combinado com o PO: 5 do mês seguinte ao da competência. */
  diaCombinado: number;
  /** A data-limite desta competência, em `AAAA-MM-DD`. */
  dataLimite: string;
  situacao: SituacaoDoPrazo;
  /** Relatórios com liberação registrada até a data-limite. */
  liberadosNoPrazo: number;
  /**
   * Liberados, mas depois da data. `null` enquanto o prazo não venceu — antes
   * do limite não existe atraso, e um zero ali pareceria boa notícia.
   */
  liberadosComAtraso: number | null;
  /** Sem nenhuma liberação registrada até agora. */
  naoLiberados: number;
}

export interface VisaoGeral {
  competencia: string;
  /** Relatórios correntes: a maior versão de cada cliente nesta competência. */
  totalCorrentes: number;
  cobertura: {
    porCarteira: Fatia[];
    porProduto: Fatia[];
    porFormato: Fatia[];
  };
  fila: {
    porEstado: Fatia[];
  };
  qualidade: {
    comSinal: number;
    semSinal: number;
    /** Quantos RELATÓRIOS têm cada tipo de sinal, não quantos sinais existem. */
    porTipo: Fatia[];
  };
  retrabalho: {
    /** Correntes que já não são a versão 1. */
    relatoriosRefeitos: number;
    /** Versões superadas que continuam no banco para auditoria. */
    versoesAnteriores: number;
    /** O caso extremo do mês, para dar escala ao número acima. */
    maisRefeito: { clienteNome: string; versao: number } | null;
  };
  prazo: PrazoDaCompetencia;
}

/* ------------------------------------------------------------------ */
/* Nomes                                                               */
/* ------------------------------------------------------------------ */

const ROTULO_CARTEIRA: Record<string, string> = {
  DACORA: 'Dácora',
  ALLGROTECH: 'Allgrotech',
  NAO_IDENTIFICADA: 'Sem carteira no snapshot',
};

const ROTULO_PRODUTO: Record<string, string> = {
  mensal_externo_cliente: 'Mensal externo do cliente',
  mensal_interno_allgrotech: 'Mensal interno Allgrotech',
  NAO_IDENTIFICADO: 'Sem finalidade no snapshot',
};

/**
 * Os três formatos que existem hoje. O mapa traduz os conhecidos; um formato
 * novo aparece com a própria chave, em vez de sumir num balde de "outros".
 */
const ROTULO_FORMATO: Record<string, string> = {
  small_cap: 'Enxuto',
  ecommerce: 'E-commerce',
  servicos_leads: 'Geração de leads',
};

const SEM_FORMATO = 'NAO_DECLARADO';

const ROTULO_ESTADO: Record<string, string> = {
  gerado: 'Esperando revisão',
  recusado: 'Recusado, esperando nova versão',
  liberado: 'Liberado',
  enviado: 'Enviado',
  substituido: 'Substituído',
  desconhecido: 'Estado desconhecido',
};

const ROTULO_SINAL: Record<string, string> = {
  falha_de_fonte: 'Coleta com falha',
  classificacao_ausente: 'Sem carteira/finalidade',
  valor_ausente: 'Investimento ausente',
  sem_resultado: 'Sem resultado publicado',
  secoes_indisponiveis: 'Seções indisponíveis',
  variacao_forte: 'Variação forte',
};

/**
 * A ordem em que as fatias aparecem na tela.
 *
 * Fixa de propósito: derivar a ordem da quantidade faria os cartões trocarem
 * de lugar de um mês para o outro, e quem lê todo mês passa a procurar onde
 * está cada coisa em vez de ler o número.
 */
const ORDEM_CARTEIRA = ['DACORA', 'ALLGROTECH', 'NAO_IDENTIFICADA'];
const ORDEM_PRODUTO = ['mensal_externo_cliente', 'mensal_interno_allgrotech', 'NAO_IDENTIFICADO'];
const ORDEM_FORMATO = ['small_cap', 'ecommerce', 'servicos_leads'];
const ORDEM_ESTADO = ['gerado', 'recusado', 'liberado', 'enviado', 'substituido', 'desconhecido'];
const ORDEM_SINAL = [
  'falha_de_fonte',
  'classificacao_ausente',
  'valor_ausente',
  'sem_resultado',
  'secoes_indisponiveis',
  'variacao_forte',
];

/* ------------------------------------------------------------------ */
/* Contagem                                                            */
/* ------------------------------------------------------------------ */

/**
 * Conta ocorrências e devolve fatias na ordem canônica.
 *
 * Chave que aparece no dado mas não está na ordem canônica entra no fim, com o
 * rótulo que houver — é assim que um formato novo aparece em vez de sumir.
 * Chave da ordem canônica que não apareceu **não vira linha de zero**: um
 * cartão dizendo "Allgrotech: 0" onde a carteira simplesmente não tem
 * relatório neste mês é ruído, não informação.
 */
function contar(
  chaves: string[],
  ordemCanonica: string[],
  rotulos: Record<string, string>,
): Fatia[] {
  const contagem = new Map<string, number>();
  for (const chave of chaves) {
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }

  const conhecidas = ordemCanonica.filter((chave) => contagem.has(chave));
  const inesperadas = [...contagem.keys()]
    .filter((chave) => !ordemCanonica.includes(chave))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return [...conhecidas, ...inesperadas].map((chave) => ({
    chave,
    rotulo: rotulos[chave] ?? chave,
    quantidade: contagem.get(chave) ?? 0,
  }));
}

/* ------------------------------------------------------------------ */
/* O prazo                                                             */
/* ------------------------------------------------------------------ */

/** O dia do mês seguinte em que a competência deveria estar produzida. */
export const DIA_COMBINADO_DO_PRAZO = 5;

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** `2026-07` + dia 5 → `2026-08-05`. Dezembro vira janeiro do ano seguinte. */
export function dataLimiteDaCompetencia(competencia: string, dia: number): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const anoDoLimite = mes === 12 ? ano + 1 : ano;
  return `${anoDoLimite}-${doisDigitos(proximoMes)}-${doisDigitos(dia)}`;
}

/**
 * Mede o prazo da competência.
 *
 * ---------------------------------------------------------------------------
 * O QUE O DIA 5 MEDE, DECIDIDO PELO PO EM 2026-08-10
 *
 * **É prazo de LIBERAÇÃO, não de geração.** Gerar o relatório é trabalho
 * interno; o marco que importa é o documento estar liberado. Um mês com 34
 * relatórios gerados e nenhum liberado não cumpriu o prazo, e o painel tem de
 * dizer isso.
 *
 * Duas decisões que mudam o número:
 *
 * 1. **Conta a PRIMEIRA liberação de cada relatório**, não a da versão
 *    corrente. Se medisse a corrente, uma correção liberada depois faria um
 *    mês pontual parecer atrasado — o painel passaria a punir o ato de
 *    consertar. O retrabalho já é medido no cartão próprio, que é onde essa
 *    informação pertence.
 *
 * 2. **Nunca liberado não é o mesmo que liberado com atraso.** Os dois
 *    perderam o prazo, mas um está pronto e chegou tarde e o outro ainda não
 *    saiu. Juntar os dois num número só esconderia qual dos dois problemas o
 *    mês teve.
 *
 * A data comparada é a que está gravada (UTC). Uma liberação na virada do dia
 * 5 para o 6 pode cair de um lado ou do outro conforme o fuso; na granularidade
 * de dia isso é aceitável, e fica registrado aqui em vez de virar surpresa.
 * ---------------------------------------------------------------------------
 */
export function medirPrazo(
  liberacoes: Array<string | null>,
  competencia: string,
  hojeISO: string,
  dia: number = DIA_COMBINADO_DO_PRAZO,
): PrazoDaCompetencia {
  const dataLimite = dataLimiteDaCompetencia(competencia, dia);
  const vencido = hojeISO.slice(0, 10) > dataLimite;

  const naoLiberados = liberacoes.filter((quando) => !quando).length;
  const liberadosNoPrazo = liberacoes.filter(
    (quando) => quando && String(quando).slice(0, 10) <= dataLimite,
  ).length;

  if (!vencido) {
    return {
      diaCombinado: dia,
      dataLimite,
      situacao: 'em_aberto',
      liberadosNoPrazo,
      liberadosComAtraso: null,
      naoLiberados,
    };
  }

  return {
    diaCombinado: dia,
    dataLimite,
    situacao: 'vencido',
    liberadosNoPrazo,
    liberadosComAtraso: liberacoes.length - naoLiberados - liberadosNoPrazo,
    naoLiberados,
  };
}

/* ------------------------------------------------------------------ */
/* A visão geral                                                       */
/* ------------------------------------------------------------------ */

/**
 * Quando cada relatório foi liberado pela primeira vez — `null` se nunca foi.
 *
 * Percorre TODAS as versões, e não só a corrente: a liberação pode ter
 * acontecido numa versão que depois foi substituída, e aquela liberação
 * aconteceu de verdade.
 */
function primeiraLiberacaoPorRelatorio(linhas: LinhaDoBanco[]): Array<string | null> {
  const porChave = new Map<string, string | null>();

  for (const linha of linhas) {
    const chave = `${linha.cliente_slug} ${linha.competencia}`;
    const anterior = porChave.get(chave);
    const atual = linha.aprovado_em;

    if (!porChave.has(chave)) {
      porChave.set(chave, atual);
      continue;
    }
    if (!atual) continue;
    if (!anterior || String(atual) < String(anterior)) porChave.set(chave, atual);
  }

  return [...porChave.values()];
}

export function montarVisaoGeral(
  linhas: LinhaDoBanco[],
  competencia: string,
  hojeISO: string,
): VisaoGeral {
  const { correntes, anteriores } = separarPorVersaoCorrente(linhas);
  const itens: ItemDaFila[] = correntes.map(montarItem);

  /* Quantos relatórios têm cada tipo de sinal. Um relatório com duas seções
     indisponíveis conta UMA vez em "seções indisponíveis": a pergunta é
     quantos documentos pedem atenção, não quantos avisos existem. */
  const tiposPorRelatorio = itens.flatMap((item) => [
    ...new Set(item.sinais.map((sinal) => sinal.tipo)),
  ]);

  const comSinal = itens.filter((item) => item.sinais.length > 0).length;

  const maisRefeito = itens.reduce<ItemDaFila | null>(
    (maior, item) => (!maior || item.versao > maior.versao ? item : maior),
    null,
  );

  return {
    competencia,
    totalCorrentes: itens.length,
    cobertura: {
      porCarteira: contar(
        itens.map((item) => item.carteira),
        ORDEM_CARTEIRA,
        ROTULO_CARTEIRA,
      ),
      porProduto: contar(
        itens.map((item) => item.produto),
        ORDEM_PRODUTO,
        ROTULO_PRODUTO,
      ),
      porFormato: contar(
        itens.map((item) => item.formato ?? SEM_FORMATO),
        [...ORDEM_FORMATO, SEM_FORMATO],
        { ...ROTULO_FORMATO, [SEM_FORMATO]: 'Sem formato no snapshot' },
      ),
    },
    fila: {
      porEstado: contar(
        itens.map((item) => item.estado),
        ORDEM_ESTADO,
        ROTULO_ESTADO,
      ),
    },
    qualidade: {
      comSinal,
      semSinal: itens.length - comSinal,
      porTipo: contar(tiposPorRelatorio, ORDEM_SINAL, ROTULO_SINAL),
    },
    retrabalho: {
      relatoriosRefeitos: itens.filter((item) => item.versao > 1).length,
      versoesAnteriores: anteriores.length,
      maisRefeito:
        maisRefeito && maisRefeito.versao > 1
          ? { clienteNome: maisRefeito.clienteNome, versao: maisRefeito.versao }
          : null,
    },
    prazo: medirPrazo(primeiraLiberacaoPorRelatorio(linhas), competencia, hojeISO),
  };
}
