import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Request, Response as ExpressResponse } from 'express';
import { atenderPainelSessao } from '../api/painel-sessao.ts';

process.env.SUPABASE_URL = 'https://teste.invalid';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-servico-de-teste';
process.env.PROPOSTAS_EQUIPE_EMAILS = 'equipe1@exemplo.test,equipe2@exemplo.test';

const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261119233000_portal_propostas.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261120020000_portal_propostas_valor.sql', import.meta.url), 'utf8'));
  for (const papel of ['anon', 'authenticated']) {
    await db.exec(`set role ${papel}`);
    await assert.rejects(db.query('select * from public.portal_propostas'), /permission denied/);
    await assert.rejects(db.query('select * from public.portal_propostas_historico'), /permission denied/);
    await assert.rejects(db.query("select public.portal_propostas_mudar_situacao('alfa', 0, 'fechada', 'alterado')"), /permission denied/);
    await assert.rejects(db.query("select public.portal_propostas_atualizar('alfa', 0, 'fechada', 100, 'alterado')"), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  const id = '3c978d4a-64c4-4163-8ef1-5fbf7cbe93a6';
  const token = (email: string, method = 'oauth', provider = 'google', providers = [provider]) => {
    const claims = Buffer.from(JSON.stringify({ sub: id, user: email, provider, providers, amr: [{ method }] })).toString('base64url');
    return `header.${claims}.assinatura-local`;
  };

  let dadosAcessados = 0;
  const buscar: typeof fetch = async (url, opts) => {
    const alvo = new URL(String(url));
    assert.equal(alvo.origin, 'https://teste.invalid');
    const bearer = new Headers(opts?.headers).get('authorization')?.split(' ')[1];
    if (alvo.pathname === '/auth/v1/user') {
      if (!bearer?.endsWith('.assinatura-local')) return new Response(null, { status: 401 });
      const claims = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString());
      return Response.json({ id, email: claims.user, app_metadata: { provider: claims.provider, providers: claims.providers } });
    }
    assert.equal(bearer, 'chave-servico-de-teste');
    dadosAcessados++;
    if (alvo.pathname === '/rest/v1/rpc/portal_propostas_atualizar') {
      const b = JSON.parse(String(opts?.body));
      const res = await db.query<{ resultado: string }>(
        'select public.portal_propostas_atualizar($1, $2, $3, $4, $5) as resultado',
        [b.proposta_slug, b.proposta_revisao, b.nova_situacao, b.novo_valor, b.autor_validado],
      );
      return Response.json(res.rows[0].resultado);
    }
    if (alvo.pathname === '/rest/v1/portal_propostas_historico') {
      const slug = alvo.searchParams.get('slug')?.slice(3);
      const res = await db.query('select situacao, valor_centavos, autor, criado_em from public.portal_propostas_historico where slug = $1 order by revisao desc', [slug]);
      return Response.json(res.rows);
    }
    assert.equal(alvo.pathname, '/rest/v1/portal_propostas');
    if (opts?.method === 'POST') {
      const b = JSON.parse(String(opts.body));
      const res = await db.query(
        'insert into public.portal_propostas (slug, cliente, titulo, valor_centavos) values ($1, $2, $3, $4) returning *',
        [b.slug, b.cliente, b.titulo, b.valor_centavos],
      );
      return Response.json(res.rows, { status: 201 });
    }
    return Response.json((await db.query('select slug, cliente, titulo, valor_centavos, situacao, revisao from public.portal_propostas')).rows);
  };

  async function pedir(acesso?: string, corpo?: object, slug?: string) {
    const saida = { status: 0, corpo: null as any, headers: {} as Record<string,string> };
    const res = {
      setHeader(nome: string, valor: string) { saida.headers[nome] = valor; },
      status(codigo: number) { saida.status = codigo; return this; },
      json(json: unknown) { saida.corpo = json; return this; },
    };
    await atenderPainelSessao({
      method: corpo ? 'POST' : 'GET', query: { modo: 'painel-propostas', slug }, body: corpo,
      headers: acesso ? { authorization: `Bearer ${acesso}` } : {},
    } as unknown as Request, res as unknown as ExpressResponse, { painelPropostasFetch: buscar });
    return saida;
  }

  const primeiro = token('equipe1@exemplo.test');
  const segundo = token('equipe2@exemplo.test');
  const cadastro = { acao: 'cadastrar', slug: 'alfa', cliente: 'Teste', titulo: 'Proposta interna', valor_centavos: null };
  const fechamento = { acao: 'atualizar', slug: 'alfa', revisao: 0, situacao: 'fechada', valor_centavos: 240000, autor: 'falso@exemplo.test' };
  assert.equal((await pedir()).status, 401);
  assert.equal((await pedir('token-invalido')).status, 401);
  assert.equal((await pedir(token('outro@exemplo.test'), cadastro)).status, 403);
  assert.equal((await pedir(token('equipe1@exemplo.test', 'password'))).status, 403);
  assert.equal((await pedir(token('equipe2@exemplo.test', 'oauth', 'github'))).status, 403);
  assert.equal((await pedir(token('equipe2@exemplo.test', 'oauth', 'google', ['google', 'github']))).status, 403);
  assert.equal(dadosAcessados, 0);

  const criada = await pedir(primeiro, cadastro);
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.proposta.situacao, 'sem-situacao');
  assert.equal(criada.corpo.proposta.valor_centavos, null);
  assert.match(criada.headers['Cache-Control'], /no-store/);
  assert.equal((await pedir(segundo)).corpo.propostas.length, 1);
  assert.equal((await pedir(primeiro, { ...fechamento, situacao: ['fechada'] })).status, 400);
  assert.equal((await pedir(primeiro, { ...fechamento, valor_centavos: -1 })).status, 400);
  assert.equal((await pedir(primeiro, { ...fechamento, valor_centavos: 12.5 })).status, 400);
  assert.equal((await pedir(primeiro, { ...fechamento, valor_centavos: undefined })).status, 400);
  assert.equal((await pedir(primeiro, { ...fechamento, acao: 'situacao' })).status, 400);
  assert.equal((await pedir(primeiro, fechamento)).status, 200);
  assert.equal((await pedir(primeiro, fechamento)).status, 200);
  assert.equal((await pedir(segundo, { ...fechamento, situacao: 'sem-acordo' })).status, 409);
  assert.equal((await pedir(segundo)).corpo.propostas[0].situacao, 'fechada');
  assert.equal((await pedir(segundo)).corpo.propostas[0].valor_centavos, 240000);
  // Só o valor muda, e volta para "a definir": cada mudança fica no histórico com quem fez.
  assert.equal((await pedir(segundo, { ...fechamento, revisao: 1, valor_centavos: 99000 })).status, 200);
  assert.equal((await pedir(primeiro, { ...fechamento, revisao: 2, valor_centavos: null })).status, 200);
  assert.equal((await pedir(primeiro)).corpo.propostas[0].valor_centavos, null);
  const registros = (await pedir(segundo, undefined, 'alfa')).corpo.historico;
  assert.equal(registros.length, 3);
  assert.deepEqual(registros.map((r: any) => [r.valor_centavos, r.autor]), [
    [null, 'equipe1@exemplo.test'], [99000, 'equipe2@exemplo.test'], [240000, 'equipe1@exemplo.test'],
  ]);
  assert.equal(registros[2].situacao, 'fechada');
  console.log('Painel de propostas: restrição Google, isolamento, persistência, valor editável, autoria e concorrência — ok');
} finally {
  await db.close();
}
