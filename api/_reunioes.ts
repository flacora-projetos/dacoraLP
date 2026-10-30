import type { Request, Response } from 'express';
import {
  emailAutorizado,
  entrouPeloGoogle,
  extrairTokenBearer,
  lerListaAutorizada,
  normalizarEmail,
  type UsuarioSupabase,
} from './_painel-autorizacao.js';
import type { ConteudoReuniao, IdentidadeReunioes } from '../src/reunioes/tipos.js';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const RESUMO = 'id,slug,titulo,cliente,data';
class FalhaReunioes extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}
type Banco = <T = any>(
  tabela: string,
  consulta: Record<string, string>,
  metodo?: string,
  corpo?: unknown,
  preferencia?: string,
) => Promise<T>;
export interface DependenciasReunioes {
  fetch?: typeof fetch;
  banco?: Banco;
  agora?: () => Date;
}
function exigir(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new FalhaReunioes(400, mensagem);
}
function texto(valor: unknown, limite: number) {
  return typeof valor === 'string' ? valor.trim().slice(0, limite) : '';
}
function conteudo(valor: unknown): ConteudoReuniao {
  const c = valor as ConteudoReuniao;
  exigir(
    c &&
      Array.isArray(c.secoes) &&
      c.secoes.length <= 30 &&
      Array.isArray(c.duvidas) &&
      c.duvidas.length <= 100,
    'O roteiro precisa ter seções e perguntas válidas.',
  );
  const ids = new Set<string>();
  for (const s of c.secoes) {
    exigir(
      typeof s.id === 'string' && /^[a-z0-9-]{1,70}$/.test(s.id) && !ids.has(s.id),
      'As seções precisam de identificadores distintos.',
    );
    exigir(
      typeof s.titulo === 'string' &&
        s.titulo.trim().length > 0 &&
        s.titulo.length <= 180 &&
        typeof s.texto === 'string' &&
        s.texto.length <= 20000,
      'Uma seção excedeu o tamanho permitido.',
    );
    ids.add(s.id);
  }
  for (const d of c.duvidas)
    exigir(
      typeof d.pergunta === 'string' &&
        d.pergunta.length <= 500 &&
        typeof d.resposta === 'string' &&
        d.resposta.length <= 6000,
      'Uma pergunta excedeu o tamanho permitido.',
    );
  exigir(JSON.stringify(c).length <= 180000, 'O roteiro é muito longo.');
  // A projeção impede que campos extras enviados pelo navegador sejam publicados.
  return {
    secoes: c.secoes.map(({ id, titulo, texto }) => ({ id, titulo, texto })),
    duvidas: c.duvidas.map(({ pergunta, resposta }) => ({ pergunta, resposta })),
  };
}
function bancoRest(buscar: typeof fetch): Banco {
  return async (tabela, consulta, metodo = 'GET', corpo, preferencia = 'return=representation') => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !chave)
      throw new FalhaReunioes(503, 'A área de reuniões ainda não está disponível.');
    const resposta = await buscar(`${url}/rest/v1/${tabela}?${new URLSearchParams(consulta)}`, {
      method: metodo,
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
        Prefer: preferencia,
      },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok)
      throw new FalhaReunioes(
        503,
        'Não foi possível consultar ou salvar a reunião agora. Tente novamente.',
      );
    if (resposta.status === 204 || (metodo !== 'GET' && preferencia.includes('return=minimal')))
      return null;
    return resposta.json();
  };
}
async function identidade(req: Request, buscar: typeof fetch): Promise<IdentidadeReunioes> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const equipe = lerListaAutorizada(process.env.PAINEL_EMAILS_AUTORIZADOS);
  if (!url || !chave || !equipe.length)
    throw new FalhaReunioes(503, 'A área de reuniões ainda não está configurada.');
  const token = extrairTokenBearer(req.headers.authorization);
  if (!token) throw new FalhaReunioes(401, 'Entre com a conta Google que recebeu o convite.');
  const resposta = await buscar(`${url}/auth/v1/user`, {
    headers: { apikey: chave, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!resposta.ok) throw new FalhaReunioes(401, 'Sua sessão expirou. Entre novamente.');
  const u = (await resposta.json()) as UsuarioSupabase;
  if (!u.id || !UUID.test(u.id) || !u.email || !entrouPeloGoogle(u))
    throw new FalhaReunioes(403, 'Use uma conta Google para acessar suas reuniões.');
  return {
    id: u.id,
    email: normalizarEmail(u.email),
    equipe: emailAutorizado(u.email, equipe),
    nome:
      texto(u.user_metadata?.full_name ?? u.user_metadata?.name, 160) || normalizarEmail(u.email),
  };
}

export async function atenderReunioes(
  req: Request,
  res: Response,
  deps: DependenciasReunioes = {},
) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ mensagem: 'Método não permitido.' });
  try {
    const buscar = deps.fetch ?? fetch;
    const usuario = await identidade(req, buscar);
    const banco = deps.banco ?? bancoRest(buscar);
    const agora = (deps.agora ?? (() => new Date()))().toISOString();
    const acao = typeof req.query?.acao === 'string' ? req.query.acao : 'listar';
    const corpo = req.body ?? {};
    const conviteValido = {
      email: `eq.${usuario.email}`,
      ativo: 'eq.true',
      expira_em: `gt.${agora}`,
    };
    if (req.method === 'GET' && acao === 'sessao') {
      if (!usuario.equipe) {
        const convites = await banco<any[]>('portal_reunioes_convites', {
          ...conviteValido,
          select: 'reuniao_id',
          limit: '1',
        });
        if (!convites.length)
          throw new FalhaReunioes(
            403,
            'Este e-mail ainda não tem um convite ativo. Peça à Dácora para conferir seu acesso.',
          );
      }
      return res.json({ usuario });
    }
    if (req.method === 'GET' && acao === 'listar') {
      let filtro: Record<string, string> = {};
      if (!usuario.equipe) {
        const convites = await banco<any[]>('portal_reunioes_convites', {
          ...conviteValido,
          select: 'reuniao_id',
        });
        const ids = convites
          .map((c) => c.reuniao_id)
          .filter((id) => typeof id === 'string' && UUID.test(id));
        if (!ids.length) return res.json({ reunioes: [] });
        filtro = { id: `in.(${ids.join(',')})` };
      }
      const reunioes = await banco('portal_reunioes', {
        ...filtro,
        select: RESUMO,
        order: 'data.desc,criado_em.desc',
        limit: '200',
      });
      return res.json({ reunioes });
    }
    if (req.method === 'POST' && acao === 'criar') {
      if (!usuario.equipe) throw new FalhaReunioes(403, 'Só a equipe Dácora pode criar reuniões.');
      exigir(
        typeof corpo.slug === 'string' && SLUG.test(corpo.slug) && corpo.slug.length <= 120,
        'Escolha um endereço com letras minúsculas, números e hífens.',
      );
      exigir(
        texto(corpo.titulo, 180) && texto(corpo.cliente, 140),
        'Preencha o título e o cliente.',
      );
      const data =
        typeof corpo.data === 'string' ? new Date(`${corpo.data}T12:00:00Z`) : new Date(NaN);
      exigir(
        typeof corpo.data === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(corpo.data) &&
          Number.isFinite(data.getTime()) &&
          data.toISOString().startsWith(corpo.data),
        'Escolha uma data válida.',
      );
      const [reuniao] = await banco<any[]>('portal_reunioes', { select: RESUMO }, 'POST', {
        slug: corpo.slug,
        titulo: texto(corpo.titulo, 180),
        cliente: texto(corpo.cliente, 140),
        data: corpo.data,
        compartilhado: conteudo(corpo.compartilhado),
        interno: conteudo(corpo.interno),
        criado_por: usuario.id,
      });
      return res.status(201).json({ reuniao });
    }
    const slug = typeof req.query?.slug === 'string' ? req.query.slug : '';
    exigir(SLUG.test(slug) && slug.length <= 120, 'Escolha uma reunião válida.');
    const [resumo] = await banco<any[]>('portal_reunioes', {
      slug: `eq.${slug}`,
      select: RESUMO,
      limit: '1',
    });
    if (!resumo) throw new FalhaReunioes(404, 'Esta reunião não está disponível para sua conta.');
    if (!usuario.equipe) {
      const convites = await banco<any[]>('portal_reunioes_convites', {
        ...conviteValido,
        reuniao_id: `eq.${resumo.id}`,
        select: 'reuniao_id',
        limit: '1',
      });
      if (!convites.length)
        throw new FalhaReunioes(404, 'Esta reunião não está disponível para sua conta.');
    }
    if (req.method === 'GET' && acao === 'abrir') {
      // O conteúdo interno nem é selecionado para convidados, em vez de ser só escondido na tela.
      const [reuniao] = await banco<any[]>('portal_reunioes', {
        id: `eq.${resumo.id}`,
        select: `${RESUMO},compartilhado${usuario.equipe ? ',interno' : ''}`,
      });
      const notas = await banco('portal_reunioes_notas', {
        reuniao_id: `eq.${resumo.id}`,
        ...(!usuario.equipe ? { visibilidade: 'eq.compartilhado' } : {}),
        select: 'id,reuniao_id,secao,visibilidade,tipo,texto,autor_nome,criado_em',
        order: 'criado_em.asc,id.asc',
      });
      const convites = usuario.equipe
        ? await banco('portal_reunioes_convites', {
            reuniao_id: `eq.${resumo.id}`,
            select: 'email,expira_em,ativo',
            order: 'email.asc',
          })
        : undefined;
      return res.json({ reuniao, notas, ...(convites ? { convites } : {}) });
    }
    if (req.method === 'POST' && acao === 'anotar') {
      exigir(
        typeof corpo.id === 'string' && UUID.test(corpo.id),
        'A anotação precisa de um identificador válido.',
      );
      exigir(
        typeof corpo.texto === 'string' && corpo.texto.trim() && corpo.texto.length <= 5000,
        'Escreva uma anotação de até 5.000 caracteres.',
      );
      exigir(
        ['interno', 'compartilhado'].includes(corpo.visibilidade) &&
          ['anotacao', 'decisao', 'acao'].includes(corpo.tipo),
        'Escolha o tipo e quem pode ver.',
      );
      if (!usuario.equipe && corpo.visibilidade !== 'compartilhado')
        throw new FalhaReunioes(403, 'Convidados podem registrar anotações compartilhadas.');
      exigir(
        typeof corpo.secao === 'string' && /^[a-z0-9-]{1,70}$/.test(corpo.secao),
        'Escolha uma seção válida.',
      );
      await banco(
        'portal_reunioes_notas',
        {},
        'POST',
        {
          id: corpo.id,
          reuniao_id: resumo.id,
          secao: corpo.secao,
          visibilidade: corpo.visibilidade,
          tipo: corpo.tipo,
          texto: corpo.texto.trim(),
          autor_id: usuario.id,
          autor_nome: usuario.nome,
        },
        'resolution=ignore-duplicates,return=minimal',
      );
      const [gravado] = await banco<any[]>('portal_reunioes_notas', {
        id: `eq.${corpo.id}`,
        reuniao_id: `eq.${resumo.id}`,
        select: 'autor_id,texto,tipo,secao,visibilidade',
        limit: '1',
      });
      if (
        !gravado ||
        gravado.autor_id !== usuario.id ||
        gravado.texto !== corpo.texto.trim() ||
        gravado.tipo !== corpo.tipo ||
        gravado.secao !== corpo.secao ||
        gravado.visibilidade !== corpo.visibilidade
      )
        throw new FalhaReunioes(
          409,
          'Este registro já foi usado. Atualize o texto e tente novamente.',
        );
      return res.status(201).json({ salvo: true, id: corpo.id });
    }
    if (req.method === 'POST' && acao === 'convidar') {
      if (!usuario.equipe)
        throw new FalhaReunioes(403, 'Só a equipe Dácora pode gerenciar convidados.');
      const email = typeof corpo.email === 'string' ? normalizarEmail(corpo.email) : '';
      exigir(email.length <= 254 && EMAIL.test(email), 'Informe um e-mail válido.');
      exigir(typeof corpo.ativo === 'boolean', 'Informe se o convite está ativo.');
      const expira =
        typeof corpo.expira_em === 'string' ? new Date(corpo.expira_em) : new Date(NaN);
      exigir(
        Number.isFinite(expira.getTime()) &&
          expira.toISOString() > agora &&
          expira.getTime() <= new Date(agora).getTime() + 366 * 86400000,
        'O convite deve vencer entre amanhã e um ano.',
      );
      await banco(
        'portal_reunioes_convites',
        { on_conflict: 'reuniao_id,email' },
        'POST',
        {
          reuniao_id: resumo.id,
          email,
          ativo: corpo.ativo,
          expira_em: expira.toISOString(),
          criado_por: usuario.id,
        },
        'resolution=merge-duplicates,return=minimal',
      );
      return res.json({ salvo: true });
    }
    throw new FalhaReunioes(400, 'Ação não reconhecida.');
  } catch (erro) {
    const falha =
      erro instanceof FalhaReunioes
        ? erro
        : new FalhaReunioes(
            503,
            'Não foi possível concluir agora. Tente novamente; seu texto continua na tela.',
          );
    return res.status(falha.status).json({ mensagem: falha.message });
  }
}
