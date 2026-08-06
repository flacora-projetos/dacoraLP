/**
 * `GET /api/painel-sessao` — a única resposta para "quem é você, e você pode?".
 *
 * A tela do painel pergunta a este endereço, mandando o token da sessão do
 * Supabase. Ele confere o token com o próprio Supabase, confere o e-mail contra
 * a lista do servidor, e devolve sim ou não.
 *
 * Três coisas que não podem mudar aqui:
 *
 * 1. **A lista de e-mails nunca sai daqui.** Nem na resposta de sucesso, nem na
 *    de recusa, nem em log. A recusa devolve o e-mail de QUEM tentou — que a
 *    pessoa já sabe qual é — e mais nada.
 * 2. **A tela esconder o botão é conforto, não segurança.** Toda função de
 *    servidor que vier depois (a fila, a aprovação, o envio) repete esta
 *    conferência por conta própria, sem confiar em ter sido chamada pela tela
 *    certa.
 * 3. **Falta de configuração falha fechado.** Sem URL, sem chave ou com a lista
 *    vazia, ninguém entra — e a resposta diz o que falta configurar, porque o
 *    contrário disso é alguém passar uma tarde procurando um erro de código
 *    que era uma variável de ambiente em branco.
 */
import type { Request, Response } from 'express';
import {
  emailAutorizado,
  entrouPeloGoogle,
  extrairTokenBearer,
  lerListaAutorizada,
  type UsuarioSupabase,
  // A extensão `.js` é OBRIGATÓRIA aqui, e a falta dela derrubou a função
  // inteira na primeira prévia publicada: a Vercel compila cada arquivo de
  // `api/` para ESM sem juntar os módulos vizinhos, e o Node em ESM não
  // completa extensão sozinho — o import extensionless virava
  // `ERR_MODULE_NOT_FOUND` e todo pedido respondia 500. Localmente nada
  // aparecia, porque o `tsx` e o `esbuild` completam a extensão por conta.
  // O TypeScript resolve `.js` para o arquivo `.ts` ao lado, então isto
  // compila e continua sendo o mesmo módulo compartilhado.
} from './_painel-autorizacao.js';

export default async function handler(req: Request, res: Response) {
  // Resposta de autorização nunca pode ser guardada por cache intermediário.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  // O prefixo `VITE_` é aceito como alternativa porque a URL e a chave pública
  // do Supabase são as MESMAS no navegador e aqui — deixar o Flávio cadastrar
  // duas vezes o mesmo valor na Vercel só cria chance de divergirem. Isso vale
  // para estas duas e para mais nenhuma: a lista de e-mails e, no futuro, a
  // chave de serviço, não têm variante `VITE_` e nunca podem ter.
  const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chavePublica = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const listaAutorizada = lerListaAutorizada(process.env.PAINEL_EMAILS_AUTORIZADOS);

  if (!urlSupabase || !chavePublica) {
    console.error('[painel-sessao] Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY no ambiente.');
    return res.status(500).json({
      erro: 'nao_configurado',
      mensagem: 'O painel ainda não foi configurado no servidor (endereço e chave pública do banco).',
    });
  }

  if (listaAutorizada.length === 0) {
    console.error('[painel-sessao] PAINEL_EMAILS_AUTORIZADOS está vazia — ninguém entra.');
    return res.status(500).json({
      erro: 'lista_vazia',
      mensagem: 'A lista de pessoas autorizadas ainda não foi cadastrada no servidor.',
    });
  }

  const token = extrairTokenBearer(req.headers['authorization']);
  if (!token) {
    return res.status(401).json({ erro: 'sem_sessao', mensagem: 'Não há sessão nesta requisição.' });
  }

  let usuario: UsuarioSupabase;
  try {
    const resposta = await fetch(`${urlSupabase}/auth/v1/user`, {
      headers: {
        apikey: chavePublica,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resposta.ok) {
      // Sem `resposta.body` no log: a mensagem de erro do GoTrue pode ecoar o
      // token, e ele é credencial.
      console.warn(`[painel-sessao] Sessão recusada pelo Supabase (HTTP ${resposta.status}).`);
      return res.status(401).json({
        erro: 'sessao_invalida',
        mensagem: 'Sua sessão expirou ou não é válida. Entre de novo.',
      });
    }

    usuario = (await resposta.json()) as UsuarioSupabase;
  } catch (err) {
    console.error('[painel-sessao] Falha ao falar com o Supabase:', err instanceof Error ? err.message : err);
    return res.status(502).json({
      erro: 'verificacao_indisponivel',
      mensagem: 'Não foi possível verificar sua sessão agora. Tente de novo em instantes.',
    });
  }

  const email = typeof usuario?.email === 'string' ? usuario.email : '';
  if (!email) {
    return res.status(401).json({
      erro: 'sessao_sem_email',
      mensagem: 'Sua conta entrou sem endereço de e-mail, e o painel autoriza por e-mail.',
    });
  }

  if (!entrouPeloGoogle(usuario)) {
    return res.status(403).json({
      autorizado: false,
      email,
      erro: 'provedor_nao_permitido',
      mensagem: 'O painel só aceita entrada pela conta Google.',
    });
  }

  if (!emailAutorizado(email, listaAutorizada)) {
    // Log sem a lista: só quem tentou. Serve para o Flávio saber que alguém
    // bateu na porta, sem publicar quem tem a chave.
    console.warn(`[painel-sessao] Acesso negado para ${email}.`);
    return res.status(403).json({
      autorizado: false,
      email,
      erro: 'email_nao_autorizado',
      mensagem: 'Este e-mail não tem acesso ao painel.',
    });
  }

  const metadados = usuario.user_metadata ?? {};
  const nome =
    (typeof metadados.full_name === 'string' && metadados.full_name) ||
    (typeof metadados.name === 'string' && metadados.name) ||
    null;

  return res.status(200).json({ autorizado: true, email, nome });
}
