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
  id?: string | null;
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

/* ------------------------------------------------------------------ */
/* A conferência inteira, para TODA função de servidor repetir          */
/* ------------------------------------------------------------------ */

export type ResultadoAcesso =
  | { ok: true; id: string | null; email: string; nome: string | null }
  | { ok: false; status: number; corpo: Record<string, unknown> };

/**
 * "Quem é você, e você pode?" — a pergunta inteira, num lugar só.
 *
 * Existe como função compartilhada por um motivo que a §5.5 do registro já
 * antecipava: **toda função de servidor confere sessão e e-mail por conta
 * própria**, sem confiar em ter sido chamada pela tela certa. Quando isso é
 * copiado e colado em cada endpoint, a quinta cópia acaba conferindo menos que
 * a primeira — e é sempre a que devolve dado de cliente.
 *
 * Falha fechado em tudo: sem configuração, sem lista, sem token, sem e-mail,
 * sem Google ou fora da lista, ninguém entra.
 */
export async function conferirAcesso(cabecalhoAutorizacao: unknown): Promise<ResultadoAcesso> {
  // O prefixo `VITE_` é aceito como alternativa porque a URL e a chave pública
  // são as MESMAS no navegador e aqui — cadastrar duas vezes o mesmo valor na
  // Vercel só cria chance de divergirem. Vale para estas duas e para mais
  // nenhuma: a lista de e-mails e a chave de serviço não têm variante `VITE_`
  // e nunca podem ter.
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chavePublica = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const listaAutorizada = lerListaAutorizada(process.env.PAINEL_EMAILS_AUTORIZADOS);

  if (!urlSupabase || !chavePublica) {
    console.error('[painel] Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY no ambiente.');
    return {
      ok: false,
      status: 500,
      corpo: {
        erro: 'nao_configurado',
        mensagem: 'O painel ainda não foi configurado no servidor (endereço e chave pública do banco).',
      },
    };
  }

  if (listaAutorizada.length === 0) {
    console.error('[painel] PAINEL_EMAILS_AUTORIZADOS está vazia — ninguém entra.');
    return {
      ok: false,
      status: 500,
      corpo: {
        erro: 'lista_vazia',
        mensagem: 'A lista de pessoas autorizadas ainda não foi cadastrada no servidor.',
      },
    };
  }

  const token = extrairTokenBearer(cabecalhoAutorizacao);
  if (!token) {
    return {
      ok: false,
      status: 401,
      corpo: { erro: 'sem_sessao', mensagem: 'Não há sessão nesta requisição.' },
    };
  }

  let usuario: UsuarioSupabase;
  try {
    const resposta = await fetch(`${urlSupabase}/auth/v1/user`, {
      headers: { apikey: chavePublica, Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) {
      // Sem `resposta.body` no log: a mensagem de erro do GoTrue pode ecoar o
      // token, e ele é credencial.
      console.warn(`[painel] Sessão recusada pelo Supabase (HTTP ${resposta.status}).`);
      return {
        ok: false,
        status: 401,
        corpo: {
          erro: 'sessao_invalida',
          mensagem: 'Sua sessão expirou ou não é válida. Entre de novo.',
        },
      };
    }

    usuario = (await resposta.json()) as UsuarioSupabase;
  } catch (err) {
    console.error('[painel] Falha ao falar com o Supabase:', err instanceof Error ? err.message : err);
    return {
      ok: false,
      status: 502,
      corpo: {
        erro: 'verificacao_indisponivel',
        mensagem: 'Não foi possível verificar sua sessão agora. Tente de novo em instantes.',
      },
    };
  }

  const email = typeof usuario?.email === 'string' ? usuario.email : '';
  const id = typeof usuario?.id === 'string' && usuario.id.trim() ? usuario.id.trim() : null;
  if (!email) {
    return {
      ok: false,
      status: 401,
      corpo: {
        erro: 'sessao_sem_email',
        mensagem: 'Sua conta entrou sem endereço de e-mail, e o painel autoriza por e-mail.',
      },
    };
  }

  if (!entrouPeloGoogle(usuario)) {
    return {
      ok: false,
      status: 403,
      corpo: {
        autorizado: false,
        email,
        erro: 'provedor_nao_permitido',
        mensagem: 'O painel só aceita entrada pela conta Google.',
      },
    };
  }

  if (!emailAutorizado(email, listaAutorizada)) {
    // Log sem a lista: só quem tentou. Serve para o Flávio saber que alguém
    // bateu na porta, sem publicar quem tem a chave.
    console.warn(`[painel] Acesso negado para ${email}.`);
    return {
      ok: false,
      status: 403,
      corpo: {
        autorizado: false,
        email,
        erro: 'email_nao_autorizado',
        mensagem: 'Este e-mail não tem acesso ao painel.',
      },
    };
  }

  const metadados = usuario.user_metadata ?? {};
  const nome =
    (typeof metadados.full_name === 'string' && metadados.full_name) ||
    (typeof metadados.name === 'string' && metadados.name) ||
    null;

  return { ok: true, id, email, nome };
}
