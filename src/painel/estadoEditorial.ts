/**
 * A regra de prontidão editorial da RA4 — **autoridade única**.
 *
 * A tela, a função serverless (`api/_painel-estado-editorial.ts`) e as
 * regressões importam daqui. Não criar uma segunda implementação: esta é a
 * regra que decide se uma aprovação pode acontecer, e duas cópias significam
 * que a testada e a que decide podem divergir sem ninguém perceber.
 *
 * ⚠️ As importações abaixo levam `.js` de propósito. O runtime ESM da função
 * serverless resolve por extensão explícita; sem ela, o módulo quebra no
 * deploy — foi o que motivou a duplicação temporária de 2026-08-14.
 */
import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise.js';
import type { SnapshotMontado } from '../reports/blocos/tipos.js';

export type EstadoEditorialRA4 =
  | 'nao_iniciada'
  | 'sugerida'
  | 'editada'
  | 'pronta'
  | 'revisada_sem_analise'
  | 'inconclusiva'
  | 'falhou';

export interface SugestaoEditorialPersistida {
  secao: string;
  estado: string;
  geradoEm?: string | null;
}

export interface SecaoEditorialRA4 {
  secao: string;
  titulo: string;
  estado: EstadoEditorialRA4;
  prontaParaAprovacao: boolean;
}

export interface ResumoEditorialRA4 {
  disponivel: boolean;
  podeAprovar: boolean;
  totalObrigatorias: number;
  prontas: number;
  pendentes: SecaoEditorialRA4[];
  secoes: SecaoEditorialRA4[];
  mensagem?: string;
}

const ESTADOS_PRONTOS = new Set<EstadoEditorialRA4>([
  'editada',
  'pronta',
  'revisada_sem_analise',
  'inconclusiva',
]);

/**
 * Uma decisão humana já tomada sobre a seção. É o que a prontidão persegue —
 * não a sugestão mais nova.
 */
const ESTADOS_DECIDIDOS = new Set<EstadoEditorialRA4>(['editada', 'pronta', 'inconclusiva']);

export function estadoEditorialDaSugestao(estado: string | null | undefined): EstadoEditorialRA4 {
  switch ((estado ?? '').trim()) {
    case 'pronta':
      return 'sugerida';
    case 'aplicada':
      return 'pronta';
    case 'editada':
      return 'editada';
    case 'inconclusiva':
      return 'inconclusiva';
    case 'falhou':
      return 'falhou';
    case 'desfeita':
    case '':
      return 'nao_iniciada';
    default:
      return 'falhou';
  }
}

export function estadoEditorialEstaPronto(estado: EstadoEditorialRA4): boolean {
  return ESTADOS_PRONTOS.has(estado);
}

export function secoesEditoriaisObrigatorias(snapshot: SnapshotMontado): Array<{ secao: string; titulo: string }> {
  return [
    { secao: 'introducao', titulo: 'Introdução' },
    ...espacosAnaliticosDoSnapshot(snapshot).map((espaco) => ({ secao: espaco.secao, titulo: espaco.titulo })),
  ];
}

/**
 * O estado editorial de UMA seção, a partir de todas as sugestões daquele
 * checksum e da dispensa registrada, se houver.
 *
 * ⚠️ A autoridade é a **decisão humana**, não a sugestão cronologicamente mais
 * nova. Gerar de novo depois de aplicar não desfaz o que a pessoa aplicou —
 * antes desta regra, a segunda geração ficava em `pronta`, era a mais recente,
 * e bloqueava a aprovação de uma seção que já tinha sido resolvida.
 *
 * Estado que não sabemos interpretar continua falhando fechado, e ganha de
 * qualquer decisão: se existe uma linha ilegível na seção, não dá para afirmar
 * que a revisão está completa.
 */
export function estadoEditorialDaSecao(
  sugestoesDaSecao: SugestaoEditorialPersistida[],
  dispensada = false,
): EstadoEditorialRA4 {
  const estados = sugestoesDaSecao.map((sugestao) => estadoEditorialDaSugestao(sugestao.estado));
  if (estados.includes('falhou')) return 'falhou';
  const decidido = estados.find((estado) => ESTADOS_DECIDIDOS.has(estado));
  if (decidido) return decidido;
  if (dispensada) return 'revisada_sem_analise';
  if (estados.includes('sugerida')) return 'sugerida';
  return 'nao_iniciada';
}

export function resumoEditorialDaRevisao(
  snapshot: SnapshotMontado,
  sugestoes: SugestaoEditorialPersistida[],
  secoesDispensadas: readonly string[] = [],
): ResumoEditorialRA4 {
  const porSecao = new Map<string, SugestaoEditorialPersistida[]>();
  for (const sugestao of sugestoes) {
    const lista = porSecao.get(sugestao.secao);
    if (lista) lista.push(sugestao);
    else porSecao.set(sugestao.secao, [sugestao]);
  }
  const dispensadas = new Set(secoesDispensadas);

  const secoes = secoesEditoriaisObrigatorias(snapshot).map(({ secao, titulo }) => {
    const estado = estadoEditorialDaSecao(porSecao.get(secao) ?? [], dispensadas.has(secao));
    return { secao, titulo, estado, prontaParaAprovacao: estadoEditorialEstaPronto(estado) };
  });
  const pendentes = secoes.filter((secao) => !secao.prontaParaAprovacao);
  return {
    disponivel: true,
    podeAprovar: pendentes.length === 0,
    totalObrigatorias: secoes.length,
    prontas: secoes.length - pendentes.length,
    pendentes,
    secoes,
  };
}

export function resumoEditorialIndisponivel(mensagem = 'Não foi possível conferir o estado das análises.'): ResumoEditorialRA4 {
  return {
    disponivel: false,
    podeAprovar: false,
    totalObrigatorias: 0,
    prontas: 0,
    pendentes: [],
    secoes: [],
    mensagem,
  };
}
