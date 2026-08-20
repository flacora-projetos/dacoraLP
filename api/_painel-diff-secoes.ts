/** Diff interno, puramente estrutural. Nunca chama modelo nem serializa texto
 * para a superfície pública. Se o snapshot não declara uma seção, a resposta
 * é indisponível em vez de adivinhar. */
export interface DiferencaDeSecao {
  secao: string;
  titulo: string;
  estado: 'alterada' | 'inalterada' | 'nao_comparavel';
}

function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (!valor || typeof valor !== 'object') return JSON.stringify(valor);
  const objeto = valor as Record<string, unknown>;
  return `{${Object.keys(objeto).sort().map((chave) => `${JSON.stringify(chave)}:${canonico(objeto[chave])}`).join(',')}}`;
}

function bloco(snapshot: any, secao: string) {
  if (secao === 'introducao') return snapshot?.leitura?.resumoExecutivo === undefined ? undefined : snapshot.leitura.resumoExecutivo;
  if (!secao.startsWith('bloco:') || !Array.isArray(snapshot?.montagem)) return undefined;
  return snapshot.montagem.find((item: any) => `bloco:${item?.id}` === secao);
}

function referencias(valor: unknown, vistas = new Set<string>()): Set<string> {
  if (typeof valor === 'string') vistas.add(valor);
  else if (Array.isArray(valor)) valor.forEach((item) => referencias(item, vistas));
  else if (valor && typeof valor === 'object') Object.values(valor as Record<string, unknown>).forEach((item) => referencias(item, vistas));
  return vistas;
}

function projecao(snapshot: any, secao: string) {
  const configuracao = bloco(snapshot, secao);
  if (configuracao === undefined) return undefined;
  if (secao === 'introducao') return { configuracao };
  const chaves = referencias(configuracao);
  const dados: Record<string, unknown> = {};
  for (const [grupo, valores] of Object.entries(snapshot?.dados ?? {})) {
    if (!valores || typeof valores !== 'object') continue;
    const encontrados = Object.fromEntries(Object.entries(valores as Record<string, unknown>).filter(([chave]) => chaves.has(chave)));
    if (Object.keys(encontrados).length > 0) dados[grupo] = encontrados;
  }
  /* Sem referência declarada, não sabemos quais fatos pertencem a este bloco. */
  return Object.keys(dados).length > 0 ? { configuracao, dados } : null;
}

export function compararSecoesRecusadas(anterior: unknown, atual: unknown, secoes: string[]): DiferencaDeSecao[] | null {
  if (!anterior || !atual || !Array.isArray(secoes) || secoes.length === 0) return null;
  return secoes.map((secao) => {
    const antes = projecao(anterior, secao);
    const depois = projecao(atual, secao);
    const titulo = secao === 'introducao' ? 'Introdução' : String((bloco(atual, secao) as any)?.titulo ?? (bloco(anterior, secao) as any)?.titulo ?? secao);
    if (antes === undefined || depois === undefined || antes === null || depois === null) return { secao, titulo, estado: 'nao_comparavel' };
    return { secao, titulo, estado: canonico(antes) === canonico(depois) ? 'inalterada' : 'alterada' };
  });
}
