/**
 * Cliente Supabase do painel — criado sob demanda, nunca no carregamento do
 * módulo.
 *
 * A forma veio do `src/lib/supabase.ts` da SmartBio, com uma diferença
 * deliberada: lá o módulo lança erro na importação se faltar variável de
 * ambiente. Aqui isso derrubaria a pré-renderização do site inteiro (o
 * `scripts/prerender.mjs` importa a árvore de rotas em build-time), e o site
 * institucional não pode cair porque uma variável do painel não foi cadastrada.
 *
 * Então o erro continua alto — mas acontece quando alguém abre o painel, e vira
 * uma frase em português na tela em vez de uma página branca.
 *
 * O projeto do Supabase aqui é o `Dácora Reports`, e NÃO o da SmartBio. São
 * bases de usuários separadas, com URL de retorno separada.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class PainelNaoConfigurado extends Error {
  constructor(public readonly faltando: string[]) {
    super(`Faltam variáveis de ambiente do painel: ${faltando.join(', ')}`);
    this.name = 'PainelNaoConfigurado';
  }
}

let cliente: SupabaseClient | null = null;

export function obterSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const faltando: string[] = [];
  if (!url) faltando.push('VITE_SUPABASE_URL');
  if (!chavePublica) faltando.push('VITE_SUPABASE_ANON_KEY');
  if (faltando.length > 0) throw new PainelNaoConfigurado(faltando);

  cliente = createClient(url, chavePublica, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // O retorno do Google traz o token no fragmento (#) da URL; é o próprio
      // gotrue-js que o recolhe e limpa o endereço.
      detectSessionInUrl: true,
    },
  });

  return cliente;
}
