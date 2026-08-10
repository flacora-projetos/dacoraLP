/**
 * A fila do mês — a parte que pensa, sem rede e sem banco.
 *
 * Vive em `api/` com prefixo `_` porque a Vercel ignora arquivos iniciados por
 * underscore ao transformar `api/` em funções: é módulo compartilhado do
 * servidor, não rota. **Nada disto pode ser importado por `src/`** — não por
 * segredo, mas porque a decisão de o que é sinal de atenção precisa acontecer
 * onde acontece a leitura do banco, e não em duas versões que divergem.
 *
 * ---------------------------------------------------------------------------
 * A PERGUNTA QUE ESTE ARQUIVO RESPONDE
 *
 * "Quais destes 46 relatórios eu preciso olhar com cuidado, e quais eu posso
 * despachar em trinta segundos?"
 *
 * É a resposta a essa pergunta que transforma uma tarde de trabalho em vinte
 * minutos — e é ela que evita a alternativa que o painel existe para impedir,
 * que é aprovar tudo no olho porque são muitos.
 * ---------------------------------------------------------------------------
 *
 * Duas regras da casa valem aqui como valem no relatório:
 *
 *  • **ausência não vira zero.** Investimento que não veio não entra na soma e
 *    vira sinal de atenção; ele não é somado como se fosse zero, o que faria a
 *    fila mostrar um mês menor do que foi;
 *  • **causa não é inventada.** Um sinal diz o que foi medido ("investimento
 *    +38% contra junho"), nunca por que aconteceu.
 */

// A extensão `.js` é OBRIGATÓRIA nos imports relativos de `api/` — ver o
// comentário em `painel-fila.ts`.
import { separarPorVersaoCorrente } from './_painel-versao-corrente.js';

/* ------------------------------------------------------------------ */
/* O que chega do banco                                                */
/* ------------------------------------------------------------------ */

export interface LinhaDoBanco {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  estado: string;
  gerado_em: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  enviado_em: string | null;
  enviado_para: string | null;
  substituido_por: string | null;
  /** O snapshot, sem o bloco `publicacao` — ver o carregador. */
  conteudo: any;
}

/* ------------------------------------------------------------------ */
/* O que sai para a tela                                               */
/* ------------------------------------------------------------------ */

/**
 * O estado como a pessoa entende, e não como a coluna guarda.
 *
 * `enviado` **não é** um valor da coluna `estado`: ele é derivado de
 * `enviado_em` não ser nulo, exatamente como o handoff previu (§5.5). Derivar
 * em vez de criar um estado novo na tela mantém tela e banco de acordo — o
 * banco continua tendo três estados, e é ele quem manda.
 *
 * `recusado` ainda não existe: depende da migração da P3.
 */
export type EstadoNaTela = 'gerado' | 'liberado' | 'enviado' | 'substituido' | 'desconhecido';

export type TipoSinal =
  | 'classificacao_ausente'
  | 'secoes_indisponiveis'
  | 'variacao_forte'
  | 'sem_resultado'
  | 'valor_ausente'
  | 'falha_de_fonte';

export interface Sinal {
  tipo: TipoSinal;
  /** Curto, para caber na linha. Ex.: "2 seções indisponíveis". */
  texto: string;
  /** A frase inteira, para o `title` e para leitor de tela. */
  detalhe: string;
  /** Id da seção do relatório que explica este sinal. */
  alvo: string;
  peso: number;
}

export interface NumeroDaFila {
  rotulo: string;
  /** Plataforma por extenso: "Meta Ads". */
  fonte: string;
  valor: number;
  unidade: string;
}

export interface ItemDaFila {
  id: string;
  clienteSlug: string;
  clienteNome: string;
  carteira: 'DACORA' | 'ALLGROTECH' | 'NAO_IDENTIFICADA';
  produto: 'mensal_externo_cliente' | 'mensal_interno_allgrotech' | 'NAO_IDENTIFICADO';
  /**
   * O tipo do relatório como o snapshot declara (`small_cap`, `ecommerce`,
   * `servicos_leads`), ou `null` quando não declara.
   *
   * **String livre de propósito, e não uma união fechada dos três de hoje.**
   * Um formato novo saindo da fábrica cairia, numa união fechada, no mesmo
   * balde de "não declarado" — e o painel diria que falta classificação num
   * relatório que se classificou muito bem. É a diferença entre "encontrou e
   * não diz nada" e "diz que não", que já custou caro neste projeto.
   */
  formato: string | null;
  competencia: string;
  versao: number;
  estado: EstadoNaTela;
  geradoEm: string | null;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  enviadoEm: string | null;
  enviadoPara: string | null;
  /** Soma dos investimentos das plataformas. `null` quando nenhum veio. */
  investimento: number | null;
  investimentoPorPlataforma: NumeroDaFila[];
  resultados: NumeroDaFila[];
  sinais: Sinal[];
  /** Quanto este relatório pede atenção. Só para ordenar; não vai para a tela. */
  atencao: number;
}

/* ------------------------------------------------------------------ */
/* Nomes                                                               */
/* ------------------------------------------------------------------ */

const NOME_DA_PLATAFORMA: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  pinterest: 'Pinterest',
  ga4: 'GA4',
  instagram: 'Instagram',
  ecommerce: 'Loja',
  crm: 'Página',
};

function nomeDaPlataforma(id: string | undefined): string {
  if (!id) return 'plataforma não identificada';
  return NOME_DA_PLATAFORMA[id] ?? id;
}

/* ------------------------------------------------------------------ */
/* Leitura do snapshot                                                 */
/* ------------------------------------------------------------------ */

function numeroSeOk(valor: any): number | null {
  return valor && valor.estado === 'ok' && typeof valor.numero === 'number' ? valor.numero : null;
}

/**
 * Só as faixas de PLATAFORMA entram na conta do mês.
 *
 * Isto não é detalhe: a Aviarte tem, além da faixa do Meta inteiro, quatro
 * faixas de grupos de campanha (público frio, remarketing, mensagens, tráfego)
 * — todas com uma métrica chamada "Investimento". Somar todas daria o
 * investimento do Meta **duas vezes**, e o número apareceria na fila sem nada
 * parecer errado. O escopo declarado é o que separa o total das partes.
 */
function faixasDePlataforma(conteudo: any): any[] {
  const faixas = conteudo?.dados?.faixas;
  if (!faixas || typeof faixas !== 'object') return [];
  return Object.values(faixas).filter((faixa: any) => faixa?.escopo?.tipo === 'plataforma');
}

function plataformaDaFaixa(faixa: any): string | undefined {
  for (const metrica of faixa?.metricas ?? []) {
    const fonte = metrica?.origem?.fontes?.[0];
    if (typeof fonte === 'string') return fonte;
  }
  return undefined;
}

function metricasDeResultado(faixa: any): any[] {
  return (faixa?.metricas ?? []).filter((metrica: any) => {
    const id = typeof metrica?.id === 'string' ? metrica.id : '';
    return /(?:_resultado(?:_grupo_\d+)?|_conversoes)$/.test(id);
  });
}

/* ------------------------------------------------------------------ */
/* Os sinais                                                           */
/* ------------------------------------------------------------------ */

/**
 * O corte de variação forte. ±30% é o que o handoff fixou (§5.1) — não é uma
 * medida estatística, é o ponto a partir do qual vale a pena olhar antes de
 * mandar para o cliente.
 */
const CORTE_DE_VARIACAO = 0.3;

const PESO: Record<TipoSinal, number> = {
  falha_de_fonte: 50,
  classificacao_ausente: 45,
  valor_ausente: 40,
  sem_resultado: 30,
  secoes_indisponiveis: 20,
  variacao_forte: 12,
};

function porcentagem(variacao: number): string {
  const sinal = variacao > 0 ? '+' : '−';
  return `${sinal}${Math.abs(Math.round(variacao * 100))}%`;
}

function sinaisDoRelatorio(conteudo: any): Sinal[] {
  const sinais: Sinal[] = [];
  const identidade = conteudo?.identidade ?? {};

  if (
    !['DACORA', 'ALLGROTECH'].includes(identidade.carteira) ||
    !['mensal_externo_cliente', 'mensal_interno_allgrotech'].includes(identidade.produto)
  ) {
    sinais.push({
      tipo: 'classificacao_ausente',
      texto: 'sem carteira/finalidade',
      detalhe:
        'Este snapshot é anterior ao contrato que declara carteira e finalidade. Gere uma nova versão na fábrica; ' +
        'o painel não classifica cliente pelo nome.',
      alvo: 'qualidade',
      peso: PESO.classificacao_ausente,
    });
  }

  const secaoDaFaixa = (faixa: any): string =>
    (conteudo?.montagem ?? []).find(
      (bloco: any) => bloco?.bloco === 'B1' && bloco?.faixa === faixa?.id,
    )?.id ?? 'resumo';

  /* Seções que o próprio relatório declara que não consegue preencher. ------ */
  const indisponiveis = (conteudo?.montagem ?? []).filter((bloco: any) => bloco?.indisponivel);
  if (indisponiveis.length > 0) {
    const quantas = indisponiveis.length;
    sinais.push({
      tipo: 'secoes_indisponiveis',
      texto: `${quantas} ${quantas === 1 ? 'seção indisponível' : 'seções indisponíveis'}`,
      detalhe:
        `${quantas === 1 ? 'Uma seção sai' : `${quantas} seções saem`} dizendo o que falta, em vez de ` +
        `sumir ou ser preenchida com estimativa: ` +
        indisponiveis
          .map((bloco: any) => `"${bloco.titulo}" — ${bloco.indisponivel?.motivo ?? 'sem motivo declarado'}`)
          .join(' · '),
      alvo: indisponiveis[0]?.id ?? 'qualidade',
      peso: PESO.secoes_indisponiveis + (quantas - 1) * 5,
    });
  }

  /* Coleta que não veio inteira. -------------------------------------------- */
  for (const fonte of conteudo?.fontes ?? []) {
    // `nao_configurada` fica de fora de propósito: o cliente não ter Pinterest
    // não é falha de coleta, e tratar como sinal encheria a fila de ruído que
    // ninguém pode resolver.
    if (!['parcial', 'indisponivel', 'erro'].includes(fonte?.situacao)) continue;
    const comoFalhou =
      fonte.situacao === 'parcial'
        ? 'respondeu, mas faltou métrica'
        : fonte.situacao === 'indisponivel'
          ? 'não respondeu nesta coleta'
          : 'respondeu com erro';
    sinais.push({
      tipo: 'falha_de_fonte',
      texto: `${fonte.rotulo ?? nomeDaPlataforma(fonte.plataforma)}: coleta ${fonte.situacao}`,
      detalhe: `${fonte.rotulo ?? nomeDaPlataforma(fonte.plataforma)} ${comoFalhou}.`,
      alvo: 'qualidade',
      peso: PESO.falha_de_fonte,
    });
  }

  for (const faixa of faixasDePlataforma(conteudo)) {
    const plataforma = nomeDaPlataforma(plataformaDaFaixa(faixa));

    /* Investimento que não veio. ------------------------------------------- */
    const investimento = (faixa.metricas ?? []).find((m: any) => m?.glossarioId === 'investimento');
    if (investimento && numeroSeOk(investimento.valor) === null) {
      sinais.push({
        tipo: 'valor_ausente',
        texto: `${plataforma} sem investimento`,
        detalhe:
          `O investimento do ${plataforma} não veio nesta coleta e por isso não entra na soma do mês. ` +
          `Motivo registrado: ${investimento.valor?.motivo ?? 'não informado'}.`,
        alvo: secaoDaFaixa(faixa),
        peso: PESO.valor_ausente,
      });
    }

    /* Plataforma que não publica número de resultado. ---------------------- */
    const resultados = metricasDeResultado(faixa);
    if (resultados.length === 0) {
      sinais.push({
        tipo: 'sem_resultado',
        texto: `${plataforma} sem resultado`,
        detalhe:
          `Os dados atuais deste relatório não permitiram publicar resultado para o ${plataforma}. ` +
          'Confira a observação da fonte no relatório; o painel não presume que falta cadastro nem escolhe outro evento.',
        alvo: secaoDaFaixa(faixa),
        peso: PESO.sem_resultado,
      });
    }

    /* Variação forte contra o mês anterior. -------------------------------- */
    for (const metrica of [investimento, ...resultados]) {
      const comparativo = metrica?.comparativo;
      // `permitido: false` é respeitado: quando o relatório diz que aquela
      // comparação não pode ser feita (mês incompleto, valor travado em faixa),
      // a fila não a faz por fora. Seria o mesmo erro que o relatório evita.
      if (!comparativo?.permitido || typeof comparativo.variacao !== 'number') continue;
      if (Math.abs(comparativo.variacao) < CORTE_DE_VARIACAO) continue;
      sinais.push({
        tipo: 'variacao_forte',
        texto: `${metrica.rotulo} ${porcentagem(comparativo.variacao)}`,
        detalhe:
          `${plataforma}: ${metrica.rotulo} variou ${porcentagem(comparativo.variacao)} contra ` +
          `${comparativo.competenciaBase ?? 'o mês anterior'}.`,
        alvo: secaoDaFaixa(faixa),
        peso: PESO.variacao_forte,
      });
    }
  }

  return sinais;
}

/* ------------------------------------------------------------------ */
/* Uma linha da fila                                                   */
/* ------------------------------------------------------------------ */

function estadoNaTela(linha: LinhaDoBanco): EstadoNaTela {
  if (linha.estado === 'substituido') return 'substituido';
  if (linha.enviado_em) return 'enviado';
  if (linha.estado === 'liberado') return 'liberado';
  if (linha.estado === 'gerado') return 'gerado';
  return 'desconhecido';
}

/**
 * A ordem da fila, que é a entrega principal desta fase.
 *
 * Duas camadas, e a ordem entre elas importa:
 *
 *  1. **o que ainda espera decisão vem primeiro.** Um relatório já enviado não
 *     pede nada de ninguém, por mais sinais que tenha;
 *  2. **dentro de cada faixa, o mais pesado primeiro.** Quem tem coleta com
 *     falha aparece antes de quem tem só uma variação forte, e quem não tem
 *     sinal nenhum desce — que é o que faz o relatório limpo levar trinta
 *     segundos.
 *
 * Alfabético não aparece em lugar nenhum como critério principal: ele é só o
 * desempate, para a lista não dançar entre dois carregamentos.
 */
const FAIXA_POR_ESTADO: Record<EstadoNaTela, number> = {
  gerado: 0,
  desconhecido: 1,
  liberado: 2,
  enviado: 3,
  substituido: 4,
};

export function montarItem(linha: LinhaDoBanco): ItemDaFila {
  const conteudo = linha.conteudo ?? {};
  const identidade = conteudo.identidade ?? {};

  const investimentoPorPlataforma: NumeroDaFila[] = [];
  const resultados: NumeroDaFila[] = [];

  for (const faixa of faixasDePlataforma(conteudo)) {
    const fonte = nomeDaPlataforma(plataformaDaFaixa(faixa));

    const investimento = (faixa.metricas ?? []).find((m: any) => m?.glossarioId === 'investimento');
    const valorInvestido = numeroSeOk(investimento?.valor);
    if (valorInvestido !== null) {
      investimentoPorPlataforma.push({
        rotulo: investimento.rotulo ?? 'Investimento',
        fonte,
        valor: valorInvestido,
        unidade: investimento.unidade ?? 'brl',
      });
    }

    for (const resultado of metricasDeResultado(faixa)) {
      const valorResultado = numeroSeOk(resultado?.valor);
      if (valorResultado !== null) {
        resultados.push({
          rotulo: resultado.rotulo ?? 'Resultado',
          fonte,
          valor: valorResultado,
          unidade: resultado.unidade ?? 'inteiro',
        });
      }
    }
  }

  const sinais = sinaisDoRelatorio(conteudo);
  const estado = estadoNaTela(linha);

  return {
    id: linha.id,
    clienteSlug: linha.cliente_slug,
    clienteNome: identidade.clienteNome || linha.cliente_slug,
    carteira: ['DACORA', 'ALLGROTECH'].includes(identidade.carteira)
      ? identidade.carteira
      : 'NAO_IDENTIFICADA',
    produto: ['mensal_externo_cliente', 'mensal_interno_allgrotech'].includes(identidade.produto)
      ? identidade.produto
      : 'NAO_IDENTIFICADO',
    formato:
      typeof identidade.tipoRelatorio === 'string' && identidade.tipoRelatorio.trim() !== ''
        ? identidade.tipoRelatorio
        : null,
    competencia: linha.competencia,
    versao: linha.versao,
    estado,
    geradoEm: linha.gerado_em,
    aprovadoPor: linha.aprovado_por,
    aprovadoEm: linha.aprovado_em,
    enviadoEm: linha.enviado_em,
    enviadoPara: linha.enviado_para,
    // Ausência não vira zero: sem nenhum investimento apurado o campo é `null`,
    // e a tela escreve "—". Zero aqui diria que o cliente não gastou nada.
    investimento:
      investimentoPorPlataforma.length > 0
        ? investimentoPorPlataforma.reduce((soma, item) => soma + item.valor, 0)
        : null,
    investimentoPorPlataforma,
    resultados,
    sinais,
    atencao: sinais.reduce((soma, sinal) => soma + sinal.peso, 0),
  };
}

export function ordenarPorAtencao(itens: ItemDaFila[]): ItemDaFila[] {
  return [...itens].sort((a, b) => {
    const faixa = FAIXA_POR_ESTADO[a.estado] - FAIXA_POR_ESTADO[b.estado];
    if (faixa !== 0) return faixa;
    if (b.atencao !== a.atencao) return b.atencao - a.atencao;
    return a.clienteNome.localeCompare(b.clienteNome, 'pt-BR');
  });
}

export function montarFila(linhas: LinhaDoBanco[]): ItemDaFila[] {
  // A tabela é versionada para preservar auditoria, mas a FILA responde "qual
  // documento precisa de decisão agora?". Mostrar v1, v2 e v3 como três
  // trabalhos diferentes faz uma correção parecer três clientes pendentes.
  // A versão mais alta é a corrente; as anteriores continuam no banco e
  // alimentam a medida de retrabalho da visão geral.
  //
  // A regra de "qual é a corrente" mora em `_painel-versao-corrente.ts` desde
  // que a visão geral passou a precisar dela: duas cópias da mesma regra são
  // como a fila e o resumo passariam a discordar sobre quantos relatórios
  // existem no mês, cada um passando no próprio teste.
  const { correntes } = separarPorVersaoCorrente(linhas);
  return ordenarPorAtencao(correntes.map(montarItem));
}
