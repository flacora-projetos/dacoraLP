/**
 * A decisão do painel — a parte que pensa, sem rede e sem banco.
 *
 * Vive em `api/` com prefixo `_` porque a Vercel ignora arquivos iniciados por
 * underscore ao transformar `api/` em funções: é módulo compartilhado do
 * servidor, não rota. **Nada disto pode ser importado por `src/`** — a tela
 * pode até esconder um botão, mas quem decide se a decisão vale é o servidor,
 * e uma segunda cópia da regra no navegador é uma cópia para divergir.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTE ARQUIVO GARANTE, E O QUE ELE DELIBERADAMENTE NÃO GARANTE
 *
 * **Garante:** que o pedido é entendível — decisão conhecida, relatório
 * identificado, checksum presente e motivo escrito quando a decisão é recusar.
 * Tudo isso é recusado ANTES de qualquer chamada ao banco, porque pedido torto
 * não deve nem chegar perto de uma linha de cliente.
 *
 * **Não garante** o estado do relatório, a unicidade da decisão nem o carimbo
 * do checksum. Isso é do banco (`public.decidir_relatorio` e as restrições da
 * tabela), e reimplementar aqui criaria uma segunda fonte de verdade para
 * divergir da primeira — exatamente o que o carregador já evita ao não
 * reconferir formato de competência nem tamanho de token.
 * ---------------------------------------------------------------------------
 */

export type Decisao = 'aprovar' | 'recusar';

/**
 * O piso do motivo da recusa.
 *
 * Dez caracteres não medem qualidade de texto e não tentam: eles separam um
 * motivo de um "ok" digitado para o botão liberar. A régua é a mesma no banco
 * (`length(btrim(recusa_motivo)) >= 10`), de propósito — se um dia divergirem,
 * quem manda é o banco, e a tela mostra a recusa dele.
 */
export const MINIMO_DO_MOTIVO = 10;

/** Teto para o texto não virar um documento dentro de uma coluna de auditoria. */
export const MAXIMO_DO_MOTIVO = 600;

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PedidoDeDecisao {
  id: string;
  decisao: Decisao;
  /** O checksum que estava na tela de quem decidiu. */
  checksumVisto: string;
  /** Já aparado. Vazio quando a decisão é aprovar. */
  motivo: string;
}

export type LeituraDoPedido =
  | { ok: true; pedido: PedidoDeDecisao }
  | { ok: false; erro: string; mensagem: string };

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Lê o corpo do pedido.
 *
 * Repare no que ele **ignora**: quem decidiu. Esse campo nunca vem do
 * navegador. Ele é resolvido pela sessão, no servidor — senão bastaria trocar
 * um valor no pedido para assinar a aprovação com o nome de outra pessoa, e a
 * auditoria passaria a registrar ficção com aparência de fato.
 */
export function lerPedido(corpo: unknown): LeituraDoPedido {
  if (!corpo || typeof corpo !== 'object') {
    return {
      ok: false,
      erro: 'pedido_invalido',
      mensagem: 'O pedido chegou vazio. Volte para a revisão e tente de novo.',
    };
  }

  const bruto = corpo as Record<string, unknown>;
  const id = texto(bruto.id);
  if (!UUID_VALIDO.test(id)) {
    return {
      ok: false,
      erro: 'relatorio_invalido',
      mensagem: 'Não deu para saber de qual relatório é esta decisão. Volte para a fila e abra de novo.',
    };
  }

  const decisao = texto(bruto.decisao);
  if (decisao !== 'aprovar' && decisao !== 'recusar') {
    return {
      ok: false,
      erro: 'decisao_desconhecida',
      mensagem: 'Só existem duas decisões neste painel: aprovar ou recusar com motivo.',
    };
  }

  const checksumVisto = texto(bruto.checksum);
  if (!checksumVisto) {
    return {
      ok: false,
      erro: 'checksum_ausente',
      mensagem:
        'Esta decisão chegou sem a impressão digital do documento, e sem ela não há como garantir ' +
        'que o relatório aprovado é o que estava na tela. Recarregue a revisão.',
    };
  }

  const motivo = texto(bruto.motivo);

  if (decisao === 'recusar') {
    if (motivo.length < MINIMO_DO_MOTIVO) {
      return {
        ok: false,
        erro: 'motivo_obrigatorio',
        mensagem:
          'A recusa precisa de um motivo escrito. Ele é o que chega a quem vai regerar o relatório — ' +
          'sem ele, o "não" morre aqui dentro.',
      };
    }
    if (motivo.length > MAXIMO_DO_MOTIVO) {
      return {
        ok: false,
        erro: 'motivo_longo',
        mensagem: `O motivo passou de ${MAXIMO_DO_MOTIVO} caracteres. Resuma o que precisa mudar.`,
      };
    }
  }

  if (decisao === 'aprovar' && motivo) {
    return {
      ok: false,
      erro: 'motivo_nao_se_aplica',
      mensagem: 'Aprovação não leva motivo. Se há uma ressalva a registrar, a decisão é recusar.',
    };
  }

  return { ok: true, pedido: { id, decisao, checksumVisto, motivo: decisao === 'recusar' ? motivo : '' } };
}

/* ------------------------------------------------------------------ */
/* Traduzir a recusa do banco                                          */
/* ------------------------------------------------------------------ */

/**
 * O banco recusa em código; a tela precisa de português.
 *
 * O handoff é explícito: *"mostra a regra em português ('este relatório mudou
 * depois do GO; é preciso aprovar de novo'), não o erro do Postgres"*. Sem esta
 * tradução, a pessoa que revisa lê uma violação de restrição e conclui que o
 * painel quebrou — quando o painel acabou de fazer exatamente o trabalho dele.
 */
const MOTIVOS_DO_BANCO: Record<string, { status: number; mensagem: string }> = {
  relatorio_nao_encontrado: {
    status: 404,
    mensagem: 'Este relatório não está mais no banco. Volte para a fila e abra a versão atual.',
  },
  checksum_divergente: {
    status: 409,
    mensagem:
      'Este relatório mudou desde que você o abriu — existe uma versão mais nova. Nada foi gravado. ' +
      'Volte para a fila, abra a versão atual e decida sobre ela.',
  },
  versao_fora_de_circulacao: {
    status: 409,
    mensagem:
      'Esta versão foi substituída ou revogada e não pode mais ser decidida. A versão que vale está na fila.',
  },
  ja_decidido_liberado: {
    status: 409,
    mensagem:
      'Este relatório já foi aprovado, e uma aprovação não é desfeita pelo painel. ' +
      'Se ele precisa mudar, o caminho é gerar uma versão nova na fábrica.',
  },
  ja_decidido_recusado: {
    status: 409,
    mensagem:
      'Este relatório já foi recusado, com motivo registrado. Quem for corrigir gera uma versão nova ' +
      'na fábrica; a decisão não é revertida por aqui.',
  },
  estado_nao_decidivel: {
    status: 409,
    mensagem: 'Esta versão não está mais esperando revisão. Volte para a fila e veja o estado atual.',
  },
  decisao_nao_aplicada: {
    status: 409,
    mensagem:
      'Alguém decidiu sobre este relatório no mesmo instante que você. Nada foi gravado duas vezes — ' +
      'recarregue a revisão para ver o que ficou registrado.',
  },
  motivo_obrigatorio: {
    status: 400,
    mensagem: 'A recusa precisa de um motivo escrito, e ele não chegou.',
  },
  motivo_nao_se_aplica: {
    status: 400,
    mensagem: 'Aprovação não leva motivo.',
  },
  decisao_desconhecida: {
    status: 400,
    mensagem: 'Só existem duas decisões neste painel: aprovar ou recusar com motivo.',
  },
  decisor_ausente: {
    status: 500,
    mensagem: 'O servidor não conseguiu identificar quem está decidindo. Entre de novo no painel.',
  },
};

export interface RecusaTraduzida {
  status: number;
  erro: string;
  mensagem: string;
}

/**
 * Casa a mensagem do Postgres com um dos motivos conhecidos.
 *
 * Procura o código como palavra dentro do texto porque o PostgREST devolve a
 * exceção embrulhada (`P0001` + `"message"`), e nós levantamos o código puro.
 * O que não casa vira uma recusa honesta: **não existe caminho em que uma falha
 * desconhecida seja apresentada como sucesso**.
 */
export function traduzirRecusaDoBanco(textoDoErro: string): RecusaTraduzida {
  for (const [codigo, traducao] of Object.entries(MOTIVOS_DO_BANCO)) {
    if (new RegExp(`\\b${codigo}\\b`).test(textoDoErro)) {
      return { status: traducao.status, erro: codigo, mensagem: traducao.mensagem };
    }
  }
  return {
    status: 502,
    erro: 'decisao_recusada_pelo_banco',
    mensagem:
      'O banco recusou esta decisão e nada foi gravado. Recarregue a revisão; se continuar, ' +
      'registre o horário para quem for investigar.',
  };
}

/* ------------------------------------------------------------------ */
/* Read-back                                                           */
/* ------------------------------------------------------------------ */

export interface LinhaDecidida {
  estado: string;
  checksum: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aprovado_checksum: string | null;
  recusado_por: string | null;
  recusado_em: string | null;
  recusa_motivo: string | null;
  correcao_ordem_id?: string | null;
  correcao_estado?: 'aguardando_nova_versao' | 'nova_versao_gerada' | null;
  correcao_solicitado_em?: string | null;
  notificacao_interna_id?: string | null;
  notificacao_interna_estado?: 'pendente' | null;
  notificacao_destino_referencia?: string | null;
}

/**
 * Confere, lendo a linha de volta, que ficou gravado o que foi pedido.
 *
 * ⚠️ Compara **coluna com coluna** (`aprovado_checksum` com `checksum`) e o
 * checksum visto com a coluna `checksum`. Em nenhum momento recalcula o
 * checksum a partir do `conteudo` lido do banco: o `jsonb` reordena as chaves,
 * o digest muda, e um read-back assim reprovaria toda aprovação — para sempre e
 * sem ninguém entender por quê. §9.6 do registro do painel guarda o caso real.
 */
export function conferirLeituraDeVolta(
  linha: LinhaDecidida | null | undefined,
  pedido: PedidoDeDecisao,
  quem: string,
): { ok: true } | { ok: false; motivo: string } {
  if (!linha) return { ok: false, motivo: 'a linha não voltou do banco' };

  if (linha.checksum !== pedido.checksumVisto) {
    return { ok: false, motivo: 'o documento gravado não é o que estava na tela' };
  }

  if (pedido.decisao === 'aprovar') {
    if (linha.estado !== 'liberado') return { ok: false, motivo: 'o estado não ficou liberado' };
    if (linha.aprovado_por !== quem) return { ok: false, motivo: 'o aprovador registrado não é quem decidiu' };
    if (!linha.aprovado_em) return { ok: false, motivo: 'a data da aprovação não foi registrada' };
    if (linha.aprovado_checksum !== linha.checksum) {
      return { ok: false, motivo: 'o GO não ficou amarrado ao documento aprovado' };
    }
    return { ok: true };
  }

  if (linha.estado !== 'recusado') return { ok: false, motivo: 'o estado não ficou recusado' };
  if (linha.recusado_por !== quem) return { ok: false, motivo: 'quem recusou não foi registrado' };
  if (!linha.recusado_em) return { ok: false, motivo: 'a data da recusa não foi registrada' };
  if ((linha.recusa_motivo ?? '').trim() !== pedido.motivo) {
    return { ok: false, motivo: 'o motivo gravado não é o que foi escrito' };
  }
  if (linha.aprovado_em || linha.aprovado_checksum) {
    return { ok: false, motivo: 'a linha recusada carrega carimbo de aprovação' };
  }
  if (!linha.correcao_ordem_id || !linha.correcao_solicitado_em) {
    return { ok: false, motivo: 'a ordem de correção não foi registrada' };
  }
  if (linha.correcao_estado !== 'aguardando_nova_versao') {
    return { ok: false, motivo: 'a ordem de correção não ficou aguardando nova versão' };
  }
  if (!linha.notificacao_interna_id || linha.notificacao_interna_estado !== 'pendente') {
    return { ok: false, motivo: 'o aviso interno não ficou pendente na fila de saída' };
  }
  if (linha.notificacao_destino_referencia !== 'dacora_semanais.recipients') {
    return { ok: false, motivo: 'o aviso interno não aponta para o destinatário canônico' };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* O eco                                                               */
/* ------------------------------------------------------------------ */

/**
 * O texto literal do que vai ser gravado, montado EM CÓDIGO.
 *
 * É a mesma disciplina da edição governada de cadastro no `OpenClaw-Dacora`: o
 * humano confirma sobre um eco do que o sistema entendeu, não sobre a própria
 * intenção. Aqui ele serve duas vezes — aparece na tela antes do clique e volta
 * na resposta, para o registro dizer exatamente o que foi carimbado.
 */
export function ecoDaDecisao(entrada: {
  decisao: Decisao;
  clienteNome: string;
  competencia: string;
  versao: number;
  checksum: string;
  quem: string;
  motivo?: string;
}): string {
  const impressao = entrada.checksum.slice(0, 12);
  const cabeca =
    `${entrada.clienteNome} · ${entrada.competencia} · versão ${entrada.versao} · ` +
    `impressão digital ${impressao}…`;

  if (entrada.decisao === 'aprovar') {
    return `Aprovar: ${cabeca}. Fica registrado como aprovado por ${entrada.quem}.`;
  }
  return (
    `Recusar: ${cabeca}. Fica registrado como recusado por ${entrada.quem}, ` +
    `com o motivo: "${(entrada.motivo ?? '').trim()}". ` +
    'Uma ordem de correção aguarda nova versão; o aviso interno fica pendente na fila de saída.'
  );
}
