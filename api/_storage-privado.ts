interface AssinaturaStorage {
  path?: string | null;
  signedUrl?: string | null;
  error?: string | null;
}

interface RespostaStorage {
  path?: string | null;
  signedURL?: string | null;
  error?: string | null;
}

/** Assina no servidor sem carregar o cliente de autenticação no caminho público. */
export function criarAssinadorStoragePrivado({
  bucket,
  urlSupabase,
  chaveDeServico,
  validadeSegundos,
  fetchImpl = fetch,
}: {
  bucket: string;
  urlSupabase?: string;
  chaveDeServico?: string;
  validadeSegundos: number;
  fetchImpl?: typeof fetch;
}): (caminhos: string[]) => Promise<AssinaturaStorage[]> {
  if (!urlSupabase || !chaveDeServico) {
    throw new Error('faltam URL ou service role para assinar o armazenamento privado');
  }
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket)) {
    throw new Error('bucket privado inválido');
  }
  const endpoint = new URL(`/storage/v1/object/sign/${bucket}`, urlSupabase).toString();

  return async caminhos => {
    const resposta = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        apikey: chaveDeServico,
        Authorization: `Bearer ${chaveDeServico}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: validadeSegundos, paths: caminhos }),
    });
    if (!resposta.ok) throw new Error(`Storage respondeu HTTP ${resposta.status}.`);
    const itens = await resposta.json() as RespostaStorage[];
    if (!Array.isArray(itens) || itens.length !== caminhos.length) {
      throw new Error('Storage devolveu quantidade inesperada de assinaturas.');
    }
    return itens.map((item, indice) => ({
      path: item.path ?? caminhos[indice],
      error: item.error ?? null,
      signedUrl: normalizarUrlAssinada(item.signedURL, urlSupabase, bucket),
    }));
  };
}

function normalizarUrlAssinada(valor: string | null | undefined, urlSupabase: string, bucket: string) {
  if (!valor) return null;
  const prefixo = `/object/sign/${bucket}/`;
  if (!valor.startsWith(prefixo)) return null;
  return new URL(`/storage/v1${valor}`, urlSupabase).toString();
}
