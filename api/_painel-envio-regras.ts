/**
 * P5 — contrato puro entre a API do portal e a fábrica de envios.
 *
 * A view e a RPC devolvem mais campos do que o navegador precisa. Este módulo
 * valida o read-back e monta uma resposta estreita: nome canônico e estado
 * durável entram; id bruto do grupo, referência interna, token e chave de
 * idempotência nunca atravessam a fronteira server-side.
 */

export type EstadoDoEnvioP5 =
  | 'pendente'
  | 'reservado'
  | 'enviando'
  | 'confirmado'
  | 'incerto'
  | 'falhou';

const ESTADOS_DO_ENVIO = new Set<EstadoDoEnvioP5>([
  'pendente',
  'reservado',
  'enviando',
  'confirmado',
  'incerto',
  'falhou',
]);

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LinhaDoPortalP5 {
  relatorio_id: string;
  cliente_nome: string;
  competencia: string;
  relatorio_versao: number;
  checksum: string;
  relatorio_estado: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aprovado_checksum: string | null;
  enviado_em: string | null;
  ja_enviado: boolean;
  destino_referencia: string | null;
  destinatario_nome: string | null;
  destinatario_habilitado: boolean | null;
  destinatario_sincronizado: boolean | null;
  envio_id: string | null;
  envio_estado: string | null;
  solicitado_por: string | null;
  solicitado_em: string | null;
  confirmado_em: string | null;
  erro_codigo: string | null;
  pode_solicitar_envio: boolean;
}

export interface EstadoSeguroDoEnvioP5 {
  relatorioId: string;
  clienteNome: string;
  competencia: string;
  versao: number;
  checksum: string;
  destinatarioNome: string | null;
  podeSolicitarEnvio: boolean;
  indisponibilidade:
    | 'destinatario_ausente'
    | 'aprovacao_invalida'
    | 'fora_de_circulacao'
    | null;
  envio: {
    estado: EstadoDoEnvioP5;
    solicitadoPor: string;
    solicitadoEm: string;
    confirmadoEm: string | null;
    erroCodigo: string | null;
  } | null;
}

export type ResultadoDaMontagemP5 =
  | { ok: true; estado: EstadoSeguroDoEnvioP5 }
  | { ok: false; motivo: string };

export interface PedidoDeEnvioP5 {
  id: string;
  checksumVisto: string;
}

export type LeituraDoPedidoP5 =
  | { ok: true; pedido: PedidoDeEnvioP5 }
  | { ok: false; erro: string; mensagem: string };

export interface RetornoDaSolicitacaoP5 {
  envio_id: string;
  relatorio_id: string;
  estado: string;
  destinatario_nome: string;
  destino_referencia: string;
  solicitado_por: string;
  solicitado_em: string;
  ja_existia: boolean;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function estadoConhecido(valor: unknown): valor is EstadoDoEnvioP5 {
  return typeof valor === 'string' && ESTADOS_DO_ENVIO.has(valor as EstadoDoEnvioP5);
}

export function lerPedidoDeEnvio(corpo: unknown): LeituraDoPedidoP5 {
  if (!corpo || typeof corpo !== 'object') {
    return {
      ok: false,
      erro: 'pedido_invalido',
      mensagem: 'O pedido de envio chegou vazio. Reabra a revisão e tente novamente.',
    };
  }

  const bruto = corpo as Record<string, unknown>;
  const id = texto(bruto.id);
  if (!UUID_VALIDO.test(id)) {
    return {
      ok: false,
      erro: 'relatorio_invalido',
      mensagem: 'Não foi possível identificar o relatório. Volte para a fila e abra a revisão de novo.',
    };
  }

  const checksumVisto = texto(bruto.checksum);
  if (!checksumVisto) {
    return {
      ok: false,
      erro: 'checksum_ausente',
      mensagem:
        'A solicitação chegou sem a impressão digital exibida na revisão. Recarregue o relatório antes de enviar.',
    };
  }

  return { ok: true, pedido: { id, checksumVisto } };
}

export function montarEstadoSeguroDoEnvio(linha: LinhaDoPortalP5): ResultadoDaMontagemP5 {
  if (!UUID_VALIDO.test(texto(linha?.relatorio_id))) {
    return { ok: false, motivo: 'o relatório voltou sem identificador válido' };
  }
  if (!texto(linha.cliente_nome) || !texto(linha.competencia) || !texto(linha.checksum)) {
    return { ok: false, motivo: 'o contrato voltou sem cliente, competência ou checksum' };
  }
  if (!Number.isSafeInteger(linha.relatorio_versao) || linha.relatorio_versao < 1) {
    return { ok: false, motivo: 'a versão do relatório é inválida' };
  }

  const destinatarioNome = texto(linha.destinatario_nome) || null;
  const temDestino = Boolean(
    destinatarioNome &&
    texto(linha.destino_referencia) &&
    linha.destinatario_habilitado === true &&
    linha.destinatario_sincronizado === true
  );
  const temIntencao = Boolean(linha.envio_id || linha.envio_estado);

  let envio: EstadoSeguroDoEnvioP5['envio'] = null;
  if (temIntencao) {
    if (!UUID_VALIDO.test(texto(linha.envio_id)) || !estadoConhecido(linha.envio_estado)) {
      return { ok: false, motivo: 'a intenção voltou sem id ou estado durável válido' };
    }
    const solicitadoPor = texto(linha.solicitado_por);
    const solicitadoEm = texto(linha.solicitado_em);
    if (!solicitadoPor || !solicitadoEm || !destinatarioNome) {
      return { ok: false, motivo: 'a intenção voltou sem solicitante, horário ou destinatário' };
    }

    const confirmadoEm = texto(linha.confirmado_em) || null;
    if (linha.envio_estado === 'confirmado') {
      if (!confirmadoEm || linha.ja_enviado !== true || !texto(linha.enviado_em)) {
        return { ok: false, motivo: 'a confirmação não bate com o recibo e o envelope do relatório' };
      }
    } else if (confirmadoEm || linha.ja_enviado === true || texto(linha.enviado_em)) {
      return { ok: false, motivo: 'o envelope afirma envio sem confirmação durável completa' };
    }

    envio = {
      estado: linha.envio_estado,
      solicitadoPor,
      solicitadoEm,
      confirmadoEm,
      erroCodigo: texto(linha.erro_codigo) || null,
    };
  } else if (linha.ja_enviado === true || texto(linha.enviado_em)) {
    return { ok: false, motivo: 'o relatório tem marca de envio sem intenção e recibo legíveis' };
  }

  const podeSolicitarEnvio = linha.pode_solicitar_envio === true;
  if (podeSolicitarEnvio && (!temDestino || envio)) {
    return { ok: false, motivo: 'a view ofereceu envio sem destino habilitado ou com intenção existente' };
  }

  let indisponibilidade: EstadoSeguroDoEnvioP5['indisponibilidade'] = null;
  if (!envio && !podeSolicitarEnvio) {
    if (!temDestino) indisponibilidade = 'destinatario_ausente';
    else if (
      linha.relatorio_estado !== 'liberado' ||
      !linha.aprovado_por ||
      !linha.aprovado_em ||
      linha.aprovado_checksum !== linha.checksum
    ) indisponibilidade = 'aprovacao_invalida';
    else indisponibilidade = 'fora_de_circulacao';
  }

  return {
    ok: true,
    estado: {
      relatorioId: linha.relatorio_id,
      clienteNome: linha.cliente_nome,
      competencia: linha.competencia,
      versao: linha.relatorio_versao,
      checksum: linha.checksum,
      destinatarioNome,
      podeSolicitarEnvio,
      indisponibilidade,
      envio,
    },
  };
}

export function conferirSolicitacaoComReadBack(
  retorno: RetornoDaSolicitacaoP5 | null | undefined,
  linha: LinhaDoPortalP5 | null | undefined,
  pedido: PedidoDeEnvioP5,
  quem: string,
): { ok: true; jaExistia: boolean } | { ok: false; motivo: string } {
  if (!retorno || !linha) return { ok: false, motivo: 'a solicitação ou a leitura de volta não retornou' };
  if (!UUID_VALIDO.test(texto(retorno.envio_id))) return { ok: false, motivo: 'a intenção não voltou com id válido' };
  if (retorno.relatorio_id !== pedido.id || linha.relatorio_id !== pedido.id) {
    return { ok: false, motivo: 'a intenção voltou ligada a outro relatório' };
  }
  if (linha.checksum !== pedido.checksumVisto) {
    return { ok: false, motivo: 'o documento lido de volta não é o que estava na tela' };
  }
  if (linha.envio_id !== retorno.envio_id) {
    return { ok: false, motivo: 'a intenção lida de volta não é a que a RPC devolveu' };
  }
  if (!estadoConhecido(retorno.estado) || !estadoConhecido(linha.envio_estado)) {
    return { ok: false, motivo: 'o estado durável do envio é desconhecido' };
  }
  if (
    texto(retorno.destinatario_nome) !== texto(linha.destinatario_nome) ||
    texto(retorno.destino_referencia) !== texto(linha.destino_referencia)
  ) {
    return { ok: false, motivo: 'o destinatário mudou entre a solicitação e a leitura de volta' };
  }
  if (typeof retorno.ja_existia !== 'boolean') {
    return { ok: false, motivo: 'a RPC não informou se a intenção já existia' };
  }
  if (!retorno.ja_existia && texto(retorno.solicitado_por).toLowerCase() !== quem.toLowerCase()) {
    return { ok: false, motivo: 'a nova intenção não foi atribuída a quem solicitou' };
  }
  if (
    texto(retorno.solicitado_por) !== texto(linha.solicitado_por) ||
    texto(retorno.solicitado_em) !== texto(linha.solicitado_em)
  ) {
    return { ok: false, motivo: 'solicitante ou horário divergiram no read-back' };
  }
  return { ok: true, jaExistia: retorno.ja_existia };
}

const ERROS_DA_FABRICA: Record<string, { status: number; mensagem: string }> = {
  relatorio_nao_encontrado: {
    status: 404,
    mensagem: 'Este relatório não está mais disponível. Volte para a fila e abra a versão atual.',
  },
  checksum_divergente: {
    status: 409,
    mensagem: 'O documento mudou desde que foi aberto. Nada foi solicitado; recarregue a revisão.',
  },
  relatorio_nao_liberado: {
    status: 409,
    mensagem: 'A aprovação não vale para esta versão. Nada foi solicitado.',
  },
  versao_fora_de_circulacao: {
    status: 409,
    mensagem: 'Esta versão foi revogada ou substituída. Abra a versão corrente pela fila.',
  },
  relatorio_ja_enviado: {
    status: 409,
    mensagem: 'Este relatório já possui entrega confirmada. O reenvio foi bloqueado.',
  },
  destinatario_canonico_indisponivel: {
    status: 409,
    mensagem: 'Não existe destinatário canônico sincronizado e habilitado para este cliente.',
  },
  intencao_envio_conflitante: {
    status: 409,
    mensagem: 'Já existe uma intenção ligada a outro snapshot ou destinatário. Nada foi alterado.',
  },
  solicitante_ausente: {
    status: 500,
    mensagem: 'O servidor não conseguiu identificar quem solicitou o envio. Entre novamente.',
  },
};

export function traduzirErroDaFabrica(textoDoErro: string): {
  status: number;
  erro: string;
  mensagem: string;
} {
  for (const [codigo, traducao] of Object.entries(ERROS_DA_FABRICA)) {
    if (new RegExp(`\\b${codigo}\\b`).test(textoDoErro)) {
      return { erro: codigo, ...traducao };
    }
  }
  return {
    status: 502,
    erro: 'solicitacao_recusada_pela_fabrica',
    mensagem: 'A fábrica recusou a solicitação. Recarregue a revisão antes de tentar novamente.',
  };
}
