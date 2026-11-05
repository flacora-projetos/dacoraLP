/**
 * Identidade de período, única para página, PDF e bancada.
 * O mês final no banco não transforma trimestral em relatório de setembro.
 */
import { formatarCompetencia } from './format.js';

export const PRODUTO_TRIMESTRAL = 'trimestral_externo_cliente';
export const SUFIXO_TRIMESTRAL = '__trimestral';
export const SECOES_EDITORIAIS_TRIMESTRAIS = [
  { secao: 'bloco:aprendizados-trimestral', blocoId: 'aprendizados-trimestral', titulo: 'Aprendizados do trimestre',
    objetivo: 'Explique o que mudou durante os três meses com evidências verificáveis, sem atribuir causas não demonstradas.' },
  { secao: 'bloco:recomendacoes-trimestral', blocoId: 'recomendacoes-trimestral', titulo: 'Recomendações para o próximo trimestre',
    objetivo: 'Escreva no máximo três decisões concretas apoiadas em números auditados, sem prometer resultados.' },
] as const;

export interface IdentidadePeriodo {
  produto?: string;
  competencia: string;
  rotuloPeriodo?: string;
}

export function ehTrimestral(id: Pick<IdentidadePeriodo, 'produto'> | null | undefined): boolean {
  return id?.produto === PRODUTO_TRIMESTRAL;
}

export function rotuloDoPeriodo(id: IdentidadePeriodo, curto = false): string {
  if (ehTrimestral(id)) {
    const competencia = id.competencia;
    const m = /^(\d{4})-(\d{2})$/.exec(competencia);
    if (!m || ![3, 6, 9, 12].includes(Number(m[2]))) return id.rotuloPeriodo || 'trimestre não identificado';
    const numero = Number(m[2]) / 3;
    const curtoOficial = numero + 'º trimestre de ' + m[1];
    return curto ? curtoOficial : (id.rotuloPeriodo || curtoOficial);
  }
  if (id.produto === 'anual_externo_cliente' && id.rotuloPeriodo) return id.rotuloPeriodo;
  return formatarCompetencia(id.competencia);
}

export function nomeDoProduto(id: IdentidadePeriodo): string {
  if (ehTrimestral(id)) return 'Relatório trimestral de performance';
  if (id.produto === 'anual_externo_cliente') return 'Relatório anual de performance';
  return 'Relatório mensal de performance';
}

export function rotuloDoResumo(id: IdentidadePeriodo): string {
  if (ehTrimestral(id)) return 'Resumo do trimestre';
  if (id.produto === 'anual_externo_cliente') return 'Resumo do ano';
  return 'Resumo do mês';
}

export function rotuloDosNumeros(id: IdentidadePeriodo): string {
  if (ehTrimestral(id)) return 'O trimestre em números';
  if (id.produto === 'anual_externo_cliente') return 'O ano em números';
  return 'O mês em números';
}

/**
 * A apresentação do trimestre arredonda a fração percentual até a terceira
 * casa (4,45% -> 4,5%), que o formatter atual do mensal imprime com 1 casa.
 * Os valores originais no documento fechado NUNCA são alterados.
 */
export function snapshotParaExibicao<T extends { identidade: IdentidadePeriodo; dados?: any }>(snapshot: T): T {
  if (!ehTrimestral(snapshot.identidade)) return snapshot;
  const copia = structuredClone(snapshot);
  const arredondar = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000;
  const visitar = (no: any): void => {
    if (!no || typeof no !== 'object') return;
    if (Array.isArray(no)) { no.forEach(visitar); return; }
    if (no.unidade === 'percentual' && no.valor?.estado === 'ok')
      no.valor.numero = arredondar(no.valor.numero);
    if (Array.isArray(no.colunas)) {
      const percentuais = no.colunas.filter((c: any) => c.unidade === 'percentual').map((c: any) => c.id);
      for (const id of percentuais) {
        for (const linha of [...(no.linhas ?? []), ...(no.meses ?? []), ...(no.total ? [no.total] : [])]) {
          if (linha?.valores?.[id]?.estado === 'ok')
            linha.valores[id].numero = arredondar(linha.valores[id].numero);
        }
      }
    }
    if (Array.isArray(no.transicoes))
      for (const t of no.transicoes) {
        if (typeof t.taxa === 'number') t.taxa = arredondar(t.taxa);
        if (typeof t.perda === 'number') t.perda = arredondar(t.perda);
      }
    for (const value of Object.values(no)) visitar(value);
  };
  visitar(copia.dados);
  return copia;
}

/** Defesa de última milha. Usada ANTES das URLs de miniatura e da geração de PDF. */
export function snapshotSemOrigemPrivada<T extends { identidade: IdentidadePeriodo; dados?: any }>(snapshot: T): T {
  if (!ehTrimestral(snapshot.identidade)) return snapshot;
  const { conferencia: _conferencia, ...semConferencia } = snapshot as any;
  const dados = semConferencia.dados || {};
  const { origensMensais: _origensMensais, ...dadosPublicos } = dados;
  return { ...semConferencia, dados: dadosPublicos } as T;
}
