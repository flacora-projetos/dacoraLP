import {
  montarEstadoSeguroDoEnvio,
  type EstadoDoEnvioP5,
  type LinhaDoPortalP5,
} from './_painel-envio-regras.js';

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ESTADOS_DA_NOTIFICACAO = new Set([
  'pendente',
  'reservado',
  'enviando',
  'enviado',
  'incerto',
  'falhou',
]);

export interface LinhaDoHistoricoP4 {
  id: string;
  cliente_slug: string;
  competencia: string;
  versao: number;
  estado: string;
  gerado_em: string;
  checksum: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  aprovado_checksum: string | null;
  recusado_por: string | null;
  recusado_em: string | null;
  recusa_motivo: string | null;
  correcao_ordem_id: string | null;
  correcao_estado: string | null;
  correcao_solicitado_em: string | null;
  correcao_nova_versao_relatorio_id: string | null;
  correcao_nova_versao: number | null;
  notificacao_interna_id: string | null;
  notificacao_interna_estado: string | null;
  enviado_em: string | null;
  substituido_por: string | null;
  revogado_em: string | null;
}

export type DecisaoDoHistorico =
  | { tipo: 'aprovado'; por: string; em: string }
  | { tipo: 'recusado'; por: string; em: string; motivo: string }
  | { tipo: 'registro_incompleto' }
  | null;

export type CorrecaoDoHistorico =
  | {
      estado: 'aguardando_nova_versao' | 'nova_versao_gerada';
      solicitadaEm: string;
      novaVersao: { relatorioId: string; versao: number } | null;
    }
  | { estado: 'registro_incompleto' }
  | null;

export type NotificacaoInternaDoHistorico =
  | { estado: 'pendente' | 'reservado' | 'enviando' | 'enviado' | 'incerto' | 'falhou' }
  | { estado: 'registro_incompleto' }
  | null;

export type EnvioDoHistorico =
  | {
      estado: EstadoDoEnvioP5;
      destinatarioNome: string;
      solicitadoPor: string;
      solicitadoEm: string;
      reciboConfirmadoEm: string | null;
      enviadoEm: string | null;
    }
  | { estado: 'registro_incompleto' }
  | null;

export interface VersaoDoHistorico {
  relatorioId: string;
  competencia: string;
  versao: number;
  estado: string;
  geradoEm: string;
  checksumCurto: string;
  posicao: 'mais_recente' | 'anterior' | 'substituida';
  substituidaPor: { relatorioId: string; versao: number | null } | null;
  substituicaoIncompleta: boolean;
  revogadoEm: string | null;
  decisao: DecisaoDoHistorico;
  correcao: CorrecaoDoHistorico;
  notificacaoInterna: NotificacaoInternaDoHistorico;
  envio: EnvioDoHistorico;
}

export interface HistoricoSeguroDoCliente {
  clienteNome: string;
  competencias: Array<{
    competencia: string;
    versoes: VersaoDoHistorico[];
  }>;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function temAlgum(...valores: unknown[]): boolean {
  return valores.some((valor) => texto(valor));
}

function montarDecisao(linha: LinhaDoHistoricoP4): DecisaoDoHistorico {
  const temAprovacao = temAlgum(linha.aprovado_por, linha.aprovado_em, linha.aprovado_checksum);
  const temRecusa = temAlgum(linha.recusado_por, linha.recusado_em, linha.recusa_motivo);
  if (temAprovacao && temRecusa) return { tipo: 'registro_incompleto' };
  if (temAprovacao) {
    if (
      texto(linha.aprovado_por) &&
      texto(linha.aprovado_em) &&
      texto(linha.aprovado_checksum) === texto(linha.checksum)
    ) {
      return { tipo: 'aprovado', por: texto(linha.aprovado_por), em: texto(linha.aprovado_em) };
    }
    return { tipo: 'registro_incompleto' };
  }
  if (temRecusa) {
    if (texto(linha.recusado_por) && texto(linha.recusado_em) && texto(linha.recusa_motivo)) {
      return {
        tipo: 'recusado',
        por: texto(linha.recusado_por),
        em: texto(linha.recusado_em),
        motivo: texto(linha.recusa_motivo),
      };
    }
    return { tipo: 'registro_incompleto' };
  }
  return null;
}

function montarCorrecao(linha: LinhaDoHistoricoP4): CorrecaoDoHistorico {
  const temOrdem = temAlgum(
    linha.correcao_ordem_id,
    linha.correcao_estado,
    linha.correcao_solicitado_em,
    linha.correcao_nova_versao_relatorio_id,
  ) || linha.correcao_nova_versao !== null;
  if (!temOrdem) return null;
  if (
    !UUID_VALIDO.test(texto(linha.correcao_ordem_id)) ||
    !['aguardando_nova_versao', 'nova_versao_gerada'].includes(texto(linha.correcao_estado)) ||
    !texto(linha.correcao_solicitado_em)
  ) return { estado: 'registro_incompleto' };

  if (linha.correcao_estado === 'aguardando_nova_versao') {
    if (linha.correcao_nova_versao_relatorio_id || linha.correcao_nova_versao !== null) {
      return { estado: 'registro_incompleto' };
    }
    return {
      estado: 'aguardando_nova_versao',
      solicitadaEm: texto(linha.correcao_solicitado_em),
      novaVersao: null,
    };
  }

  if (
    !UUID_VALIDO.test(texto(linha.correcao_nova_versao_relatorio_id)) ||
    !Number.isSafeInteger(linha.correcao_nova_versao) ||
    Number(linha.correcao_nova_versao) < 1
  ) return { estado: 'registro_incompleto' };

  return {
    estado: 'nova_versao_gerada',
    solicitadaEm: texto(linha.correcao_solicitado_em),
    novaVersao: {
      relatorioId: texto(linha.correcao_nova_versao_relatorio_id),
      versao: Number(linha.correcao_nova_versao),
    },
  };
}

function montarNotificacaoInterna(linha: LinhaDoHistoricoP4): NotificacaoInternaDoHistorico {
  const temNotificacao = temAlgum(linha.notificacao_interna_id, linha.notificacao_interna_estado);
  if (!temNotificacao) return null;
  if (
    !UUID_VALIDO.test(texto(linha.notificacao_interna_id)) ||
    !ESTADOS_DA_NOTIFICACAO.has(texto(linha.notificacao_interna_estado))
  ) return { estado: 'registro_incompleto' };
  return { estado: texto(linha.notificacao_interna_estado) as Exclude<NotificacaoInternaDoHistorico, null>['estado'] };
}

function montarEnvio(linha: LinhaDoPortalP5 | undefined): EnvioDoHistorico {
  if (!linha) return null;
  const montagem = montarEstadoSeguroDoEnvio(linha);
  if (montagem.ok === false) {
    return { estado: 'registro_incompleto' };
  }
  if (!montagem.estado.envio) return null;
  if (!montagem.estado.destinatarioNome) return { estado: 'registro_incompleto' };
  const envio = montagem.estado.envio;
  return {
    estado: envio.estado,
    destinatarioNome: montagem.estado.destinatarioNome,
    solicitadoPor: envio.solicitadoPor,
    solicitadoEm: envio.solicitadoEm,
    reciboConfirmadoEm: envio.confirmadoEm,
    enviadoEm: envio.estado === 'confirmado' ? texto(linha.enviado_em) || null : null,
  };
}

export function montarHistoricoSeguro(
  clienteSlug: string,
  clienteNome: string,
  linhasP4: LinhaDoHistoricoP4[],
  linhasP5: LinhaDoPortalP5[],
): { ok: true; historico: HistoricoSeguroDoCliente } | { ok: false; motivo: string } {
  if (!texto(clienteSlug) || !texto(clienteNome)) {
    return { ok: false, motivo: 'o cliente resolvido pelo relatório está incompleto' };
  }
  if (!Array.isArray(linhasP4) || linhasP4.length === 0) {
    return { ok: false, motivo: 'nenhuma versão persistida foi encontrada para o cliente' };
  }

  const porId = new Map<string, LinhaDoHistoricoP4>();
  const maiorVersaoPorCompetencia = new Map<string, number>();
  for (const linha of linhasP4) {
    if (
      !UUID_VALIDO.test(texto(linha.id)) ||
      texto(linha.cliente_slug) !== texto(clienteSlug) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(texto(linha.competencia)) ||
      !Number.isSafeInteger(linha.versao) ||
      linha.versao < 1 ||
      !texto(linha.estado) ||
      !texto(linha.gerado_em) ||
      !texto(linha.checksum)
    ) return { ok: false, motivo: 'uma versão voltou sem identidade durável completa' };
    if (porId.has(linha.id)) return { ok: false, motivo: 'uma versão apareceu duplicada no histórico' };
    porId.set(linha.id, linha);
    maiorVersaoPorCompetencia.set(
      linha.competencia,
      Math.max(maiorVersaoPorCompetencia.get(linha.competencia) ?? 0, linha.versao),
    );
  }

  const p5PorId = new Map<string, LinhaDoPortalP5>();
  for (const linha of linhasP5) {
    const correspondente = porId.get(texto(linha.relatorio_id));
    if (
      !correspondente ||
      texto(linha.cliente_nome) !== texto(clienteNome) ||
      texto(linha.competencia) !== correspondente.competencia ||
      linha.relatorio_versao !== correspondente.versao ||
      texto(linha.checksum) !== correspondente.checksum
    ) {
      return { ok: false, motivo: 'o contrato P5 divergiu da versão persistida no histórico' };
    }
    if (p5PorId.has(linha.relatorio_id)) {
      return { ok: false, motivo: 'o contrato de envio devolveu duas intenções para a mesma versão' };
    }
    p5PorId.set(linha.relatorio_id, linha);
  }

  const versoes = linhasP4.map<VersaoDoHistorico>((linha) => {
    const substituidaPorId = texto(linha.substituido_por);
    const destinoDaSubstituicao = UUID_VALIDO.test(substituidaPorId)
      ? porId.get(substituidaPorId)
      : undefined;
    const substituicaoConfirmada = Boolean(
      destinoDaSubstituicao &&
      destinoDaSubstituicao.competencia === linha.competencia &&
      destinoDaSubstituicao.versao > linha.versao,
    );
    const ehMaisRecente = linha.versao === maiorVersaoPorCompetencia.get(linha.competencia);
    let correcao = montarCorrecao(linha);
    if (correcao?.estado === 'nova_versao_gerada') {
      const destino = porId.get(correcao.novaVersao?.relatorioId ?? '');
      if (
        !destino ||
        destino.competencia !== linha.competencia ||
        destino.versao !== correcao.novaVersao?.versao
      ) correcao = { estado: 'registro_incompleto' };
    }

    return {
      relatorioId: linha.id,
      competencia: linha.competencia,
      versao: linha.versao,
      estado: linha.estado,
      geradoEm: linha.gerado_em,
      checksumCurto: linha.checksum.slice(0, 12),
      posicao: substituicaoConfirmada ? 'substituida' : ehMaisRecente ? 'mais_recente' : 'anterior',
      substituidaPor: substituicaoConfirmada
        ? { relatorioId: substituidaPorId, versao: destinoDaSubstituicao?.versao ?? null }
        : null,
      substituicaoIncompleta: Boolean(linha.substituido_por && !substituicaoConfirmada),
      revogadoEm: texto(linha.revogado_em) || null,
      decisao: montarDecisao(linha),
      correcao,
      notificacaoInterna: montarNotificacaoInterna(linha),
      envio: montarEnvio(p5PorId.get(linha.id)),
    };
  });

  versoes.sort((a, b) =>
    b.competencia.localeCompare(a.competencia) ||
    b.versao - a.versao ||
    a.relatorioId.localeCompare(b.relatorioId),
  );

  const competencias = new Map<string, VersaoDoHistorico[]>();
  for (const versao of versoes) {
    const grupo = competencias.get(versao.competencia) ?? [];
    grupo.push(versao);
    competencias.set(versao.competencia, grupo);
  }

  return {
    ok: true,
    historico: {
      clienteNome: texto(clienteNome),
      competencias: Array.from(competencias, ([competencia, itens]) => ({
        competencia,
        versoes: itens,
      })),
    },
  };
}
