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

export interface ConfiguracaoEditorial {
  urlSupabase: string;
  chaveDeServico: string;
}

const ESTADOS_PRONTOS = new Set<EstadoEditorialRA4>(['editada', 'pronta', 'inconclusiva']);
const BLOCOS_ANALITICOS = new Set(['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);

function headers(config: ConfiguracaoEditorial) {
  return { apikey: config.chaveDeServico, Authorization: `Bearer ${config.chaveDeServico}` };
}

function estadoEditorialDaSugestao(estado: string | null | undefined): EstadoEditorialRA4 {
  switch ((estado ?? '').trim()) {
    case 'pronta': return 'sugerida';
    case 'aplicada': return 'pronta';
    case 'editada': return 'editada';
    case 'inconclusiva': return 'inconclusiva';
    case 'falhou': return 'falhou';
    case 'desfeita':
    case '': return 'nao_iniciada';
    default: return 'falhou';
  }
}

function estadoEditorialEstaPronto(estado: EstadoEditorialRA4): boolean {
  return ESTADOS_PRONTOS.has(estado);
}

function existeFonteDoBloco(config: any, dados: any): boolean {
  if (!config || config.indisponivel || !BLOCOS_ANALITICOS.has(config.bloco)) return false;
  switch (config.bloco) {
    case 'B1': return Boolean(dados?.faixas?.[config.faixa]);
    case 'B2': return Boolean(dados?.tabelas?.[config.tabela]);
    case 'B3': return Boolean(dados?.evolucoesMensais?.[config.evolucao]);
    case 'B4': return Boolean(dados?.rankingsCriativos?.[config.ranking]);
    case 'B5': return Boolean(dados?.series?.[config.serie]);
    case 'B6': return Boolean(dados?.quebras?.[config.quebra]);
    default: return false;
  }
}

function secoesEditoriaisObrigatorias(snapshot: any): Array<{ secao: string; titulo: string }> {
  const montagem = Array.isArray(snapshot?.montagem) ? snapshot.montagem : [];
  const dados = snapshot?.dados ?? {};
  return [
    { secao: 'introducao', titulo: 'Introdução' },
    ...montagem
      .filter((config: any) => existeFonteDoBloco(config, dados))
      .map((config: any) => ({ secao: `bloco:${config.id}`, titulo: String(config.titulo ?? config.id) })),
  ];
}

function resumoEditorialDaRevisao(snapshot: any, sugestoes: SugestaoEditorialPersistida[]): ResumoEditorialRA4 {
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
  return { disponivel: false, podeAprovar: false, totalObrigatorias: 0, prontas: 0, pendentes: [], secoes: [], mensagem };
}

export async function lerSugestoesEditoriais(
  relatorioId: string,
  checksum: string,
  config: ConfiguracaoEditorial,
): Promise<SugestaoEditorialPersistida[]> {
  const url = `${config.urlSupabase}/rest/v1/relatorio_analise_sugestoes?relatorio_id=eq.${relatorioId}&relatorio_checksum=eq.${encodeURIComponent(checksum)}&order=gerado_em.desc&select=secao,estado,gerado_em`;
  const resposta = await fetch(url, { headers: headers(config) });
  if (!resposta.ok) throw new Error(`leitura_estado_editorial_http_${resposta.status}`);
  return (await resposta.json() as Array<{ secao?: unknown; estado?: unknown; gerado_em?: unknown }>)
    .filter((linha) => typeof linha.secao === 'string' && typeof linha.estado === 'string')
    .map((linha) => ({ secao: String(linha.secao), estado: String(linha.estado), geradoEm: typeof linha.gerado_em === 'string' ? linha.gerado_em : null }));
}

export async function conferirEstadoEditorial(
  relatorioId: string,
  checksum: string,
  snapshot: any,
  config: ConfiguracaoEditorial,
): Promise<ResumoEditorialRA4> {
  const sugestoes = await lerSugestoesEditoriais(relatorioId, checksum, config);
  return resumoEditorialDaRevisao(snapshot, sugestoes);
}
