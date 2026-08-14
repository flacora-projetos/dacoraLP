import { espacosAnaliticosDoSnapshot } from '../reports/blocos/analise';
import type { SnapshotMontado } from '../reports/blocos/tipos';

export type EstadoEditorialRA4 =
  | 'nao_iniciada'
  | 'sugerida'
  | 'editada'
  | 'pronta'
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

const ESTADOS_PRONTOS = new Set<EstadoEditorialRA4>(['editada', 'pronta', 'inconclusiva']);

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

export function resumoEditorialDaRevisao(
  snapshot: SnapshotMontado,
  sugestoes: SugestaoEditorialPersistida[],
): ResumoEditorialRA4 {
  const maisRecentePorSecao = new Map<string, SugestaoEditorialPersistida>();
  for (const sugestao of sugestoes) {
    if (!maisRecentePorSecao.has(sugestao.secao)) maisRecentePorSecao.set(sugestao.secao, sugestao);
  }

  const secoes = secoesEditoriaisObrigatorias(snapshot).map(({ secao, titulo }) => {
    const estado = estadoEditorialDaSugestao(maisRecentePorSecao.get(secao)?.estado);
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
