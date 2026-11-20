import type { Request, Response } from 'express';
import {
  emailAutorizado, entrouPeloGoogle, extrairTokenBearer, lerListaAutorizada,
  normalizarEmail, type UsuarioSupabase,
} from './_painel-autorizacao.js';
import { situacoesPropostas } from '../src/propostas/tipos.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAMPOS = 'slug,cliente,titulo,valor_centavos,situacao,revisao';

class FalhaPainelPropostas extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

function slugValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length <= 100 && SLUG.test(valor);
}

function textoValido(valor: unknown, maximo: number): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= maximo;
}

function valorValido(valor: unknown): valor is number | null {
  return valor === null || (Number.isInteger(valor) && (valor as number) >= 0 && (valor as number) <= 2147483647);
}

function sessaoOAuth(token: string, id: string | null | undefined): boolean {
  // As declarações deste token só são lidas depois da validação em /auth/v1/user.
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return !!id && claims.sub === id && !claims.client_id && Array.isArray(claims.amr) &&
      claims.amr.some((metodo: { method?: string } | null) => metodo?.method === 'oauth');
  } catch {
    return false;
  }
}

export async function atenderPainelPropostas(req: Request, res: Response, buscar: typeof fetch = fetch) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      throw new FalhaPainelPropostas(405, 'Método não permitido.');
    }

    const token = extrairTokenBearer(req.headers.authorization);
    if (!token) throw new FalhaPainelPropostas(401, 'Entre com sua conta Google.');
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const chavePublica = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const equipe = lerListaAutorizada(process.env.PROPOSTAS_EQUIPE_EMAILS);
    if (!url || !chavePublica || !equipe.length) {
      throw new FalhaPainelPropostas(503, 'O painel de propostas ainda não está configurado.');
    }
    const auth = await buscar(`${url}/auth/v1/user`, {
      headers: { apikey: chavePublica, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (auth.status === 401 || auth.status === 403) {
      throw new FalhaPainelPropostas(401, 'Sua sessão expirou. Entre novamente.');
    }
    if (!auth.ok) throw new Error('Autenticação indisponível');
    const usuario = (await auth.json()) as UsuarioSupabase;
    const provedores = [
      usuario.app_metadata?.provider,
      ...(usuario.app_metadata?.providers ?? []),
      ...(usuario.identities ?? []).map(identidade => identidade.provider),
    ].filter(Boolean);
    if (typeof usuario.email !== 'string' || !emailAutorizado(usuario.email, equipe) ||
      !entrouPeloGoogle(usuario) || provedores.some(provedor => provedor !== 'google' && provedor !== 'email') ||
      !sessaoOAuth(token, usuario.id)) {
      throw new FalhaPainelPropostas(403, 'Esta conta Google não tem acesso ao painel de propostas.');
    }
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!chave) throw new Error('Banco indisponível');

    function banco(caminho: string, parametros: Record<string, string> = {}, corpo?: unknown) {
      const query = new URLSearchParams(parametros);
      return buscar(`${url}/rest/v1/${caminho}?${query}`, {
        method: corpo === undefined ? 'GET' : 'POST',
        headers: {
          apikey: chave!,
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(10000),
      });
    }

    if (req.method === 'GET') {
      const slug = req.query.slug;
      if (slug !== undefined) {
        if (!slugValido(slug)) throw new FalhaPainelPropostas(400, 'Endereço inválido.');
        const resposta = await banco('portal_propostas_historico', {
          slug: `eq.${slug}`, select: 'situacao,valor_centavos,autor,criado_em', order: 'revisao.desc',
        });
        if (!resposta.ok) throw new Error('Histórico indisponível');
        return res.status(200).json({ historico: await resposta.json() });
      }
      const resposta = await banco('portal_propostas', { select: CAMPOS, order: 'cadastrado_em.desc,slug.asc' });
      if (!resposta.ok) throw new Error('Lista indisponível');
      return res.status(200).json({ propostas: await resposta.json() });
    }

    const corpo = req.body;
    if (!corpo || !slugValido(corpo.slug)) throw new FalhaPainelPropostas(400, 'Endereço inválido.');
    if (corpo.acao === 'cadastrar') {
      const { cliente, titulo, valor_centavos } = corpo;
      if (!textoValido(cliente, 120) || !textoValido(titulo, 180) || !valorValido(valor_centavos)) {
        throw new FalhaPainelPropostas(400, 'Confira o cliente, o título e o valor da proposta.');
      }
      const resposta = await banco('portal_propostas', { select: CAMPOS }, {
        slug: corpo.slug, cliente: cliente.trim(), titulo: titulo.trim(), valor_centavos,
      });
      if (resposta.status === 409) throw new FalhaPainelPropostas(409, 'Este link já está no painel.');
      if (!resposta.ok) throw new Error('Cadastro indisponível');
      const [proposta] = await resposta.json();
      return res.status(201).json({ proposta });
    }

    if (corpo.acao !== 'atualizar' || typeof corpo.situacao !== 'string' || !Object.hasOwn(situacoesPropostas, corpo.situacao) ||
      !Number.isInteger(corpo.revisao) || corpo.revisao < 0 || corpo.revisao >= 2147483647 || !valorValido(corpo.valor_centavos)) {
      throw new FalhaPainelPropostas(400, 'Confira a situação e o valor da proposta.');
    }
    const resposta = await banco('rpc/portal_propostas_atualizar', {}, {
      proposta_slug: corpo.slug, proposta_revisao: corpo.revisao, nova_situacao: corpo.situacao,
      novo_valor: corpo.valor_centavos, autor_validado: normalizarEmail(usuario.email),
    });
    if (!resposta.ok) throw new Error('Alteração indisponível');
    switch (await resposta.json()) {
      case 'salva': return res.status(200).json({ salva: true });
      case 'ausente': throw new FalhaPainelPropostas(404, 'Proposta não encontrada no painel.');
      case 'conflito': throw new FalhaPainelPropostas(409, 'A proposta mudou desde que você a abriu. Confira a situação e o valor atuais.');
      default: throw new Error('Alteração sem confirmação');
    }
  } catch (erro) {
    if (erro instanceof FalhaPainelPropostas) return res.status(erro.status).json({ mensagem: erro.message });
    return res.status(503).json({ mensagem: 'O painel de propostas está indisponível. Tente novamente.' });
  }
}
