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
import { rotuloDaCausaGravada } from '../src/painel/causasRecusa.js';

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

/* ------------------------------------------------------------------ */
/* O que chega do banco além da fila                                   */
/* ------------------------------------------------------------------ */

/** Uma recusa do mês, com as causas estruturadas que ela registrou. */
export interface OrdemDoMes {
  id: string;
  cliente_slug: string;
  relatorio_versao: number;
  estado: string;
  catalog_version: string | null;
  solicitado_em: string;
  fechada_manualmente_em: string | null;
  falha_automatica_codigo: string | null;
  causas: Array<{ cause_id: string; catalog_version: string | null; parameters: any }>;
}

/** Um pedido de envio do mês. */
export interface EnvioDoMes {
  relatorio_id: string;
  estado: string;
}

/** O mínimo de cada versão de outro mês para medir o prazo dele. */
export interface LinhaDoPrazo {
  cliente_slug: string;
  competencia: string;
  versao: number;
  aprovado_em: string | null;
  revogado_em: string | null;
}

/** Leituras além da fila. `null` = não deu para ler; ausência não vira zero. */
export interface Extras {
  ordens?: OrdemDoMes[] | null;
  envios?: EnvioDoMes[] | null;
  prazoDeOutrosMeses?: LinhaDoPrazo[] | null;
}

/* ------------------------------------------------------------------ */
/* O que sai para a tela                                               */
/* ------------------------------------------------------------------ */

export interface Correcoes {
  /** Quantas vezes alguém disse "não" neste mês. */
  recusas: number;
  /** Quantos relatórios diferentes levaram pelo menos um "não". */
  relatoriosRecusados: number;
  /** Uma fatia por motivo marcado. Uma recusa com dois motivos conta nos dois. */
  porMotivo: Fatia[];
  /** As partes do relatório que mais apareceram nas recusas. */
  partesMaisCitadas: Fatia[];
  desfecho: {
    /** Versão nova gerada pela correção automática, sem ninguém fechar à mão. */
    automatica: number;
    /** Fechada por uma pessoa, com a declaração do que foi corrigido. */
    porUmaPessoa: number;
    /** Esperando nova versão ou em processamento agora. */
    emAberto: number;
    /** A correção parou com erro e ninguém fechou ainda. */
    parada: number;
    /** Das fechadas por uma pessoa, quantas a automação tentou antes e não conseguiu. */
    automacaoTentouAntes: number;
  };
}

export interface EnviosDoMes {
  confirmados: number;
  emAndamento: number;
  /** Pode ter chegado ou não — nunca se repete sozinho. */
  incertos: number;
  falharam: number;
}

export interface PrazoDeOutroMes {
  competencia: string;
  prazo: PrazoDaCompetencia;
}

export interface VisaoGeral {
  competencia: string;
  /**
   * Relatórios correntes que contam: a maior versão de cada cliente nesta
   * competência, sem os arquivados.
   */
  totalCorrentes: number;
  /** Correntes arquivados — decisão de que não saem. Ficam fora de todo o resto. */
  arquivados: number;
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
    /** Relatórios que tiveram pelo menos uma versão nova por causa de uma recusa. */
    relatoriosCorrigidos: number;
    /** Versões que nasceram para atender uma recusa. */
    versoesPorRecusa: number;
    /**
     * Versões novas SEM recusa: o fechamento do mês (o dia 1 refaz todos com os
     * dados finais) e as regerações por regra nova. Não é erro de ninguém, e
     * por isso não se soma ao número acima — até 08/10/2026 somava, e setembro
     * aparecia com 34 "refeitos" quando só 6 tinham sido corrigidos.
     */
    versoesSemRecusa: number;
    /** O caso extremo do mês: quem mais precisou de correção. */
    maisCorrigido: { clienteNome: string; correcoes: number } | null;
  };
  prazo: PrazoDaCompetencia;
  /** `null` quando as recusas não puderam ser lidas. */
  correcoes: Correcoes | null;
  /** Mediana, em horas, entre a versão ficar pronta e ser aprovada. `null` sem aprovação. */
  horasAteAprovar: number | null;
  /** Quantos relatórios entraram na mediana acima. */
  aprovadosMedidos: number;
  envios: EnviosDoMes | null;
  /** O cartão de prazo dos meses anteriores, do mais antigo ao mais novo. */
  prazoDeOutrosMeses: PrazoDeOutroMes[] | null;
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
  arquivado: 'Arquivado (não vai sair)',
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
const ORDEM_ESTADO = ['gerado', 'recusado', 'liberado', 'enviado', 'substituido', 'arquivado', 'desconhecido'];
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

/** Uma linha de qualquer forma que tenha o que o prazo precisa. */
type LinhaComLiberacao = Pick<LinhaDoPrazo, 'cliente_slug' | 'competencia' | 'aprovado_em'>;

/**
 * Quando cada relatório foi liberado pela primeira vez — `null` se nunca foi.
 *
 * Percorre TODAS as versões, e não só a corrente: a liberação pode ter
 * acontecido numa versão que depois foi substituída, e aquela liberação
 * aconteceu de verdade.
 *
 * `fora` são os relatórios arquivados: a decisão de que não saem tira o
 * documento da conta do prazo. Sem isso, um cliente pausado aparecia como
 * "ainda não liberado" para sempre.
 */
function primeiraLiberacaoPorRelatorio(
  linhas: LinhaComLiberacao[],
  fora: Set<string> = new Set(),
): Array<string | null> {
  const porChave = new Map<string, string | null>();

  for (const linha of linhas) {
    const chave = `${linha.cliente_slug} ${linha.competencia}`;
    if (fora.has(chave)) continue;
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

type LinhaComArquivo = Pick<LinhaDoPrazo, 'cliente_slug' | 'competencia' | 'versao' | 'revogado_em'>;

/** Os relatórios cuja versão CORRENTE está arquivada. */
function chavesArquivadas(linhas: LinhaComArquivo[]): Set<string> {
  const corrente = new Map<string, { versao: number; arquivada: boolean }>();
  for (const linha of linhas) {
    const chave = `${linha.cliente_slug} ${linha.competencia}`;
    const atual = corrente.get(chave);
    if (!atual || linha.versao > atual.versao) {
      corrente.set(chave, { versao: linha.versao, arquivada: Boolean(linha.revogado_em) });
    }
  }
  return new Set([...corrente].filter(([, valor]) => valor.arquivada).map(([chave]) => chave));
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/**
 * Horas entre a versão ficar pronta e ser aprovada, na mediana.
 *
 * Mede a PRIMEIRA aprovação de cada relatório contra o momento em que aquela
 * mesma versão foi gerada. Da aprovação ao envio leva minutos; é aqui que o
 * prazo se perde, e é isto que o cartão do prazo sozinho não mostra.
 */
function horasAteAprovar(linhas: LinhaDoBanco[], fora: Set<string>): { horas: number | null; medidos: number } {
  const primeira = new Map<string, LinhaDoBanco>();
  for (const linha of linhas) {
    if (!linha.aprovado_em || !linha.gerado_em) continue;
    const chave = `${linha.cliente_slug} ${linha.competencia}`;
    if (fora.has(chave)) continue;
    const atual = primeira.get(chave);
    if (!atual || String(linha.aprovado_em) < String(atual.aprovado_em)) primeira.set(chave, linha);
  }
  const horas = [...primeira.values()]
    .map((linha) => (Date.parse(String(linha.aprovado_em)) - Date.parse(String(linha.gerado_em))) / 3_600_000)
    .filter((valor) => Number.isFinite(valor) && valor >= 0);
  const valor = mediana(horas);
  return { horas: valor === null ? null : Math.round(valor * 10) / 10, medidos: horas.length };
}

/** As partes de um relatório citadas numa causa, no formato da recusa. */
function partesDaCausa(parametros: any): string[] {
  const partes: string[] = [];
  if (typeof parametros?.section_id === 'string') partes.push(parametros.section_id);
  for (const secao of Array.isArray(parametros?.section_ids) ? parametros.section_ids : []) {
    if (typeof secao === 'string') partes.push(secao);
  }
  for (const bloco of Array.isArray(parametros?.block_ids) ? parametros.block_ids : []) {
    if (typeof bloco === 'string') partes.push(`bloco:${bloco}`);
  }
  return [...new Set(partes)];
}

const ROTULO_DE_PARTE_FIXA: Record<string, string> = {
  introducao: 'Introdução',
  relatorio_inteiro: 'O relatório inteiro',
};

/**
 * As recusas do mês, contadas pelo que foi REGISTRADO.
 *
 * O motivo é a causa estruturada que a pessoa marcou — nunca o texto livre. A
 * parte do relatório é o título que estava na versão recusada, que é o que
 * estava na tela de quem recusou; a chave é o id da parte, estável entre
 * clientes.
 */
function montarCorrecoes(ordens: OrdemDoMes[], linhas: LinhaDoBanco[]): Correcoes {
  const titulos = new Map<string, string>();
  const tituloDa = (clienteSlug: string, versao: number, parte: string): string => {
    if (ROTULO_DE_PARTE_FIXA[parte]) return ROTULO_DE_PARTE_FIXA[parte];
    const id = parte.startsWith('bloco:') ? parte.slice('bloco:'.length) : parte;
    const linha = linhas.find((l) => l.cliente_slug === clienteSlug && l.versao === versao);
    const bloco = (linha?.conteudo?.montagem ?? []).find((b: any) => b?.id === id);
    return typeof bloco?.titulo === 'string' && bloco.titulo.trim() ? bloco.titulo.trim() : id;
  };

  const motivos: string[] = [];
  const rotulosMotivo: Record<string, string> = {};
  const partes: string[] = [];

  for (const ordem of ordens) {
    const causas = ordem.causas ?? [];
    for (const causa of causas) {
      const catalogo = causa.catalog_version ?? ordem.catalog_version;
      const chave = `${catalogo ?? 'sem_catalogo'}:${causa.cause_id}`;
      motivos.push(chave);
      rotulosMotivo[chave] = rotuloDaCausaGravada(causa.cause_id, catalogo);
      for (const parte of partesDaCausa(causa.parameters)) {
        partes.push(parte);
        if (!titulos.has(parte)) titulos.set(parte, tituloDa(ordem.cliente_slug, ordem.relatorio_versao, parte));
      }
    }
    if (causas.length === 0) {
      // Recusa de antes das causas estruturadas: ela existe e conta, mas não
      // tem motivo classificado — e não é o painel que vai inventar um.
      motivos.push('sem_causa');
      rotulosMotivo.sem_causa = 'Sem motivo classificado (recusa antiga)';
    }
  }

  const porQuantidade = (a: Fatia, b: Fatia) =>
    b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo, 'pt-BR');

  const fechadas = ordens.filter((o) => o.estado === 'nova_versao_gerada');
  return {
    recusas: ordens.length,
    relatoriosRecusados: new Set(ordens.map((o) => o.cliente_slug)).size,
    porMotivo: contar(motivos, [], rotulosMotivo).sort(porQuantidade),
    partesMaisCitadas: contar(partes, [], Object.fromEntries(titulos)).sort(porQuantidade).slice(0, 6),
    desfecho: {
      automatica: fechadas.filter((o) => !o.fechada_manualmente_em).length,
      porUmaPessoa: fechadas.filter((o) => o.fechada_manualmente_em).length,
      emAberto: ordens.filter((o) => o.estado === 'aguardando_nova_versao' || o.estado === 'em_processamento').length,
      parada: ordens.filter((o) => o.estado === 'falhou').length,
      automacaoTentouAntes: fechadas.filter((o) => o.fechada_manualmente_em && o.falha_automatica_codigo).length,
    },
  };
}

function montarEnvios(envios: EnvioDoMes[]): EnviosDoMes {
  return {
    confirmados: envios.filter((e) => e.estado === 'confirmado').length,
    emAndamento: envios.filter((e) => ['pendente', 'reservado', 'enviando'].includes(e.estado)).length,
    incertos: envios.filter((e) => e.estado === 'incerto').length,
    falharam: envios.filter((e) => e.estado === 'falhou').length,
  };
}

/** Quantos meses anteriores entram no comparativo do prazo. */
export const MESES_NO_COMPARATIVO_DO_PRAZO = 3;

function montarPrazoDeOutrosMeses(linhas: LinhaDoPrazo[], competencia: string, hojeISO: string): PrazoDeOutroMes[] {
  const competencias = [...new Set(linhas.map((l) => l.competencia))]
    .filter((c) => c < competencia)
    .sort()
    .slice(-MESES_NO_COMPARATIVO_DO_PRAZO);
  return competencias.map((mes) => {
    const doMes = linhas.filter((l) => l.competencia === mes);
    return {
      competencia: mes,
      prazo: medirPrazo(primeiraLiberacaoPorRelatorio(doMes, chavesArquivadas(doMes)), mes, hojeISO),
    };
  });
}

export function montarVisaoGeral(
  linhas: LinhaDoBanco[],
  competencia: string,
  hojeISO: string,
  extras: Extras = {},
): VisaoGeral {
  const { correntes } = separarPorVersaoCorrente(linhas);
  const todosOsItens: ItemDaFila[] = correntes.map(montarItem);
  /* Arquivado sai de tudo — cobertura, sinais, prazo — e aparece só na própria
     fatia de "onde a fila parou". Contá-lo como "esperando" ou "com sinal" é
     cobrar trabalho de um documento que foi decidido que não sai. */
  const itens = todosOsItens.filter((item) => item.estado !== 'arquivado');
  const fora = chavesArquivadas(
    linhas.map((l) => ({
      cliente_slug: l.cliente_slug,
      competencia: l.competencia,
      versao: l.versao,
      revogado_em: l.revogado_em ?? null,
    })),
  );

  /* Quantos relatórios têm cada tipo de sinal. Um relatório com duas seções
     indisponíveis conta UMA vez em "seções indisponíveis": a pergunta é
     quantos documentos pedem atenção, não quantos avisos existem. */
  const tiposPorRelatorio = itens.flatMap((item) => [
    ...new Set(item.sinais.map((sinal) => sinal.tipo)),
  ]);

  const comSinal = itens.filter((item) => item.sinais.length > 0).length;

  /* Retrabalho: a versão nascida de uma recusa é marcada pelo próprio banco
     (`correcao_eh_nova_versao`). Versão nova sem essa marca é o fechamento do
     mês ou regra nova, e não é contada como correção. */
  const porRecusa = linhas.filter((linha) => linha.correcao_eh_nova_versao === true);
  const correcoesPorCliente = new Map<string, number>();
  for (const linha of porRecusa) {
    correcoesPorCliente.set(linha.cliente_slug, (correcoesPorCliente.get(linha.cliente_slug) ?? 0) + 1);
  }
  const maisCorrigido = [...correcoesPorCliente].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const nomeDoCliente = (slug: string) =>
    todosOsItens.find((item) => item.clienteSlug === slug)?.clienteNome ?? slug;

  const aprovacao = horasAteAprovar(linhas, fora);

  return {
    competencia,
    totalCorrentes: itens.length,
    arquivados: todosOsItens.length - itens.length,
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
        todosOsItens.map((item) => item.estado),
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
      relatoriosCorrigidos: correcoesPorCliente.size,
      versoesPorRecusa: porRecusa.length,
      versoesSemRecusa: linhas.filter((l) => l.versao > 1 && l.correcao_eh_nova_versao !== true).length,
      maisCorrigido: maisCorrigido
        ? { clienteNome: nomeDoCliente(maisCorrigido[0]), correcoes: maisCorrigido[1] }
        : null,
    },
    prazo: medirPrazo(primeiraLiberacaoPorRelatorio(linhas, fora), competencia, hojeISO),
    correcoes: extras.ordens ? montarCorrecoes(extras.ordens, linhas) : null,
    horasAteAprovar: aprovacao.horas,
    aprovadosMedidos: aprovacao.medidos,
    envios: extras.envios ? montarEnvios(extras.envios) : null,
    prazoDeOutrosMeses: extras.prazoDeOutrosMeses
      ? montarPrazoDeOutrosMeses(extras.prazoDeOutrosMeses, competencia, hojeISO)
      : null,
  };
}
