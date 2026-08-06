/**
 * Autorização do painel de relatórios — a parte pura.
 *
 * Vive em `api/` com prefixo `_` de propósito: a Vercel ignora arquivos
 * iniciados por underscore ao transformar `api/` em funções, então este é um
 * módulo compartilhado do SERVIDOR, e não uma rota. É importante que ele nunca
 * seja importado por nada dentro de `src/` — o que entra em `src/` vai para o
 * pacote do navegador, e a lista de quem pode entrar no painel não pode ir
 * junto (ver §9.1 do handoff).
 *
 * Autenticar (é você mesmo?) e autorizar (você pode?) são coisas diferentes.
 * Quem autentica é o Google, pelo Supabase. Quem autoriza é este arquivo.
 */

/**
 * Não normalizamos ponto do Gmail (`fl.avio@` = `flavio@` para o Google) nem
 * sufixo `+alguma-coisa`. O e-mail que chega aqui é o que o Google devolveu
 * para a conta, que já é a forma canônica dela — inventar normalização própria
 * só criaria uma segunda regra para divergir da primeira.
 */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

/**
 * Lê `PAINEL_EMAILS_AUTORIZADOS`. Aceita vírgula, ponto-e-vírgula ou quebra de
 * linha como separador porque a caixa de texto da Vercel convida aos três, e
 * um separador errado aqui não deve virar "ninguém entra e ninguém entende".
 */
export function lerListaAutorizada(bruto: string | undefined | null): string[] {
  if (!bruto) return [];
  return bruto
    .split(/[,;\n]/)
    .map(normalizarEmail)
    .filter((email) => email.length > 0);
}

export function emailAutorizado(email: string, lista: string[]): boolean {
  const alvo = normalizarEmail(email);
  if (!alvo) return false;
  return lista.includes(alvo);
}

/** O cabeçalho `Authorization: Bearer <token>`, sem confiar no formato. */
export function extrairTokenBearer(cabecalho: unknown): string | null {
  const valor = Array.isArray(cabecalho) ? cabecalho[0] : cabecalho;
  if (typeof valor !== 'string') return null;
  const casamento = /^Bearer\s+(.+)$/i.exec(valor.trim());
  if (!casamento) return null;
  const token = casamento[1].trim();
  return token.length > 0 ? token : null;
}

export interface UsuarioSupabase {
  email?: string | null;
  app_metadata?: { provider?: string | null; providers?: string[] | null } | null;
  identities?: Array<{ provider?: string | null }> | null;
  user_metadata?: Record<string, unknown> | null;
}

/**
 * O painel é login Google, e essa não é só uma preferência de tela.
 *
 * Se o projeto do Supabase tiver (ou vier a ter) cadastro por e-mail e senha
 * com confirmação desligada, alguém poderia registrar um dos dois endereços
 * autorizados e entrar sem nunca ter passado pelo Google. Conferir o provedor
 * fecha isso por dois reais, aqui, em vez de depender de uma configuração de
 * outro painel continuar como está.
 */
export function entrouPeloGoogle(usuario: UsuarioSupabase): boolean {
  if (usuario.app_metadata?.provider === 'google') return true;
  if (usuario.app_metadata?.providers?.includes('google')) return true;
  return Boolean(usuario.identities?.some((identidade) => identidade?.provider === 'google'));
}
