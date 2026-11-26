/**
 * Contador de visitas e estatísticas de uso (26/11/2026).
 * Prova: banco fechado para o navegador, área de login nunca grava anônimo, link
 * do relatório nunca é guardado, prévia da equipe não vira "o cliente abriu",
 * visita junta aberturas próximas e a retenção conta quem voltou.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Request, Response as ExpressResponse } from 'express';
import { atenderVisita, atenderEstatisticas, caminhoSeguro, ORIGEM_DO_FLUXO } from '../api/_visitas.ts';
import { resumirVisitas, visitasDe, segundaDaSemana, type LinhaVisita } from '../api/_visitas-resumo.ts';
import { atenderPropostas, resumirSenha } from '../api/_propostas.ts';

process.env.SUPABASE_URL = 'https://dacora.invalid';
process.env.SUPABASE_ANON_KEY = 'publica';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'servico';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'fernanda@exemplo.test,flavio@exemplo.test';
process.env.FLUXO_SUPABASE_URL = 'https://fluxo.invalid';
process.env.FLUXO_SUPABASE_ANON_KEY = 'publica-fluxo';

// 1. Banco: navegador não lê nem grava; área fora da lista é recusada pelo próprio banco.
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(await readFile(new URL('../supabase/migrations/20261126200000_portal_visitas.sql', import.meta.url), 'utf8'));
for (const papel of ['anon', 'authenticated']) {
  await db.exec(`set role ${papel}`);
  await assert.rejects(db.query('select * from public.portal_visitas'), /permission denied/);
  await assert.rejects(db.query("insert into public.portal_visitas (area) values ('reunioes')"), /permission denied/);
  await db.exec('reset role');
}
await db.exec('set role service_role');
await db.query("insert into public.portal_visitas (area, email, equipe) values ('reunioes', 'fernanda@exemplo.test', true)");
await assert.rejects(db.query("insert into public.portal_visitas (area) values ('outra-coisa')"), /check/);
await assert.rejects(db.query("delete from public.portal_visitas"), /permission denied/);
await db.exec('reset role');

// 2. Pedido do navegador, com banco e login simulados.
type Gravada = Record<string, unknown>;
function ambiente() {
  const gravadas: Gravada[] = [];
  const consultas: string[] = [];
  const buscar: typeof fetch = async (url, opts) => {
    const alvo = new URL(String(url));
    consultas.push(alvo.origin + alvo.pathname);
    const bearer = new Headers(opts?.headers).get('authorization')?.split(' ')[1] ?? '';
    if (alvo.pathname === '/auth/v1/user') {
      // token "fluxo:<email>" só vale no Fluxo; "google:<email>" só no site
      const [onde, email] = bearer.split(':');
      const esperado = alvo.origin === 'https://fluxo.invalid' ? 'fluxo' : 'google';
      if (onde !== esperado) return new Response(null, { status: 401 });
      return Response.json({ id: 'u1', email, app_metadata: { provider: onde === 'google' ? 'google' : 'email' } });
    }
    if (alvo.pathname === '/rest/v1/relatorios') {
      const token = alvo.searchParams.get('token');
      return Response.json(token === 'eq.TOKENVALIDO1234567890' ? [{ cliente_slug: 'aviarte', competencia: '2026-10-01' }] : []);
    }
    if (alvo.pathname === '/rest/v1/portal_visitas' && opts?.method === 'POST') {
      gravadas.push(JSON.parse(String(opts.body)));
      return new Response(null, { status: 201 });
    }
    return new Response(null, { status: 404 });
  };
  return { gravadas, consultas, buscar };
}
function pedido(corpo: unknown, cabecalhos: Record<string, string> = {}, metodo = 'POST') {
  return { method: metodo, headers: cabecalhos, body: corpo, query: {} } as unknown as Request;
}
function resposta() {
  const r = { statusCode: 0, corpo: undefined as unknown, cabecalhos: {} as Record<string, string> };
  const res = {
    status(c: number) { r.statusCode = c; return res; },
    json(c: unknown) { r.corpo = c; return res; },
    send(c: unknown) { r.corpo = c; return res; },
    end() { return res; },
    setHeader(n: string, v: string) { r.cabecalhos[n.toLowerCase()] = v; },
  };
  return { r, res: res as unknown as ExpressResponse };
}

{
  // Área de login sem sessão: recusa e não grava.
  const a = ambiente(); const { r, res } = resposta();
  await atenderVisita(pedido({ area: 'reunioes', caminho: '/reunioes' }), res, { buscar: a.buscar });
  assert.equal(r.statusCode, 401);
  assert.equal(a.gravadas.length, 0);
}
{
  // Sessão do Fluxo não serve para o site.
  const a = ambiente(); const { r, res } = resposta();
  await atenderVisita(pedido({ area: 'reunioes' }, { authorization: 'Bearer fluxo:fernanda@exemplo.test' }), res, { buscar: a.buscar });
  assert.equal(r.statusCode, 401);
  assert.equal(a.gravadas.length, 0);
}
{
  // Sessão válida: grava pessoa, equipe e caminho sem consulta.
  const a = ambiente(); const { r, res } = resposta();
  await atenderVisita(
    pedido({ area: 'reunioes', caminho: '/reunioes/aviarte-2026-11-20?x=1#a', visitante: 'abcdef12-3456' }, { authorization: 'Bearer google:Fernanda@Exemplo.test' }),
    res, { buscar: a.buscar },
  );
  assert.equal(r.statusCode, 200);
  assert.deepEqual(a.gravadas, [{ area: 'reunioes', caminho: '/reunioes/aviarte-2026-11-20', email: 'fernanda@exemplo.test', equipe: true, visitante: 'abcdef12-3456', relatorio: null }]);
}
{
  // Painel da Black não pode ser anunciado pelo navegador (é contado pelo servidor).
  const a = ambiente(); const { r, res } = resposta();
  await atenderVisita(pedido({ area: 'painel-black' }, { authorization: 'Bearer google:fernanda@exemplo.test' }), res, { buscar: a.buscar });
  assert.equal(r.statusCode, 400);
  assert.equal(a.gravadas.length, 0);
}
{
  // Relatório: link inexistente não grava; link válido grava cliente/mês e NUNCA o link.
  const a = ambiente();
  const x = resposta();
  await atenderVisita(pedido({ area: 'relatorio-cliente', relatorio: 'TOKENFALSO1234567890' }), x.res, { buscar: a.buscar });
  assert.equal(x.r.statusCode, 404);
  assert.equal(a.gravadas.length, 0);
  const y = resposta();
  await atenderVisita(pedido({ area: 'relatorio-cliente', relatorio: 'TOKENVALIDO1234567890', caminho: '/relatorios/TOKENVALIDO1234567890', visitante: 'cliente-123456' }), y.res, { buscar: a.buscar });
  assert.equal(y.r.statusCode, 200);
  assert.deepEqual(a.gravadas[0], { area: 'relatorio-cliente', caminho: null, email: null, equipe: false, visitante: 'cliente-123456', relatorio: 'aviarte/2026-10' });
  assert.ok(!JSON.stringify(a.gravadas).includes('TOKENVALIDO'), 'o link do relatório não pode ser gravado');
  // Navegador marcado como da equipe: a prévia fica separada.
  const z = resposta();
  await atenderVisita(pedido({ area: 'relatorio-cliente', relatorio: 'TOKENVALIDO1234567890', equipe_neste_navegador: true }), z.res, { buscar: a.buscar });
  assert.equal(a.gravadas[1].equipe, true);
}
{
  // Fluxo: só da origem do Fluxo, conferido no banco do Fluxo, e corpo em texto simples.
  const a = ambiente();
  const errado = resposta();
  await atenderVisita(pedido(JSON.stringify({ area: 'fluxo' }), { authorization: 'Bearer fluxo:cliente@exemplo.test' }), errado.res, { buscar: a.buscar });
  assert.equal(errado.r.statusCode, 403);
  const outraArea = resposta();
  await atenderVisita(pedido(JSON.stringify({ area: 'reunioes' }), { origin: ORIGEM_DO_FLUXO, authorization: 'Bearer google:fernanda@exemplo.test' }), outraArea.res, { buscar: a.buscar });
  assert.equal(outraArea.r.statusCode, 403);
  const certo = resposta();
  await atenderVisita(pedido(JSON.stringify({ area: 'fluxo', caminho: '/leads' }), { origin: ORIGEM_DO_FLUXO, authorization: 'Bearer fluxo:cliente@exemplo.test' }), certo.res, { buscar: a.buscar });
  assert.equal(certo.r.statusCode, 200);
  assert.equal(certo.r.cabecalhos['access-control-allow-origin'], ORIGEM_DO_FLUXO);
  assert.deepEqual(a.gravadas, [{ area: 'fluxo', caminho: '/leads', email: 'cliente@exemplo.test', equipe: false, visitante: null, relatorio: null }]);
  assert.ok(a.consultas.includes('https://fluxo.invalid/auth/v1/user'));
}
{
  // Pré-consulta do navegador do Fluxo.
  const { r, res } = resposta();
  await atenderVisita(pedido(undefined, { origin: ORIGEM_DO_FLUXO }, 'OPTIONS'), res);
  assert.equal(r.statusCode, 204);
}
{
  // Estatísticas só para a equipe.
  const a = ambiente(); const { r, res } = resposta();
  await atenderEstatisticas(pedido(undefined, {}, 'GET'), res, { buscar: a.buscar });
  assert.equal(r.statusCode, 401);
}
assert.equal(caminhoSeguro('relatorio-cliente', '/relatorios/abc'), null);
assert.equal(caminhoSeguro('reunioes', 'https://outro.site/x'), null);

// 3. Painel da Black: contado quando a página é entregue; outra proposta não.
{
  const acesso = await resumirSenha('senha-teste');
  const gravadas: unknown[] = [];
  const deps = (endereco: string) => ({
    baixarAcesso: async () => acesso,
    baixarPagina: async () => `<html>${endereco}</html>`,
    chaveDeServico: 'servico',
    gravarVisita: async (v: unknown) => { gravadas.push(v); },
  });
  for (const endereco of ['painel-black-santalberti', 'hannover']) {
    const login = resposta();
    await atenderPropostas({ method: 'POST', query: { slug: endereco }, headers: {}, body: { senha: 'senha-teste', login: endereco } } as unknown as Request, login.res, deps(endereco));
    const cookie = login.r.cabecalhos['set-cookie'].split(';')[0];
    const abre = resposta();
    await atenderPropostas({ method: 'GET', query: { slug: endereco }, headers: { cookie } } as unknown as Request, abre.res, deps(endereco));
    assert.equal(abre.r.statusCode, 200);
  }
  assert.equal(gravadas.length, 1);
  assert.equal((gravadas[0] as { area: string }).area, 'painel-black');
  // Falha no contador não derruba a página.
  const login = resposta();
  const quebrado = { ...deps('painel-black-santalberti'), gravarVisita: async () => { throw new Error('banco fora'); } };
  await atenderPropostas({ method: 'POST', query: { slug: 'painel-black-santalberti' }, headers: {}, body: { senha: 'senha-teste', login: 'painel-black-santalberti' } } as unknown as Request, login.res, quebrado);
  const abre = resposta();
  await atenderPropostas({ method: 'GET', query: { slug: 'painel-black-santalberti' }, headers: { cookie: login.r.cabecalhos['set-cookie'].split(';')[0] } } as unknown as Request, abre.res, quebrado);
  assert.equal(abre.r.statusCode, 200);
}

// 4. Resumo.
const agora = new Date('2026-11-26T15:00:00-03:00'); // quinta
const l = (criado_em: string, area: string, quem: Partial<LinhaVisita> = {}): LinhaVisita => ({
  criado_em: new Date(criado_em).toISOString(), area, caminho: null, email: null, equipe: false, visitante: null, relatorio: null, ...quem,
});
const fe = { email: 'fernanda@exemplo.test', equipe: true };
const fl = { email: 'flavio@exemplo.test', equipe: true };
const linhas: LinhaVisita[] = [
  // Fernanda: semana passada e esta; duas aberturas a 10 min viram uma visita, a 40 min viram duas.
  l('2026-11-18T10:00:00-03:00', 'reunioes', fe),
  l('2026-11-25T10:00:00-03:00', 'reunioes', fe),
  l('2026-11-25T10:10:00-03:00', 'reunioes', fe),
  l('2026-11-25T10:50:00-03:00', 'reunioes', fe),
  // Flávio: só semana passada.
  l('2026-11-19T09:00:00-03:00', 'reunioes', fl),
  // Relatório: cliente abriu 3x em 2 navegadores; equipe abriu 2x.
  l('2026-11-20T08:00:00-03:00', 'relatorio-cliente', { visitante: 'cli-aaaaaaaa', relatorio: 'aviarte/2026-10' }),
  l('2026-11-22T08:00:00-03:00', 'relatorio-cliente', { visitante: 'cli-aaaaaaaa', relatorio: 'aviarte/2026-10' }),
  l('2026-11-23T08:00:00-03:00', 'relatorio-cliente', { visitante: 'cli-bbbbbbbb', relatorio: 'aviarte/2026-10' }),
  l('2026-11-19T08:00:00-03:00', 'relatorio-cliente', { ...fe, relatorio: 'aviarte/2026-10' }),
  l('2026-11-19T08:05:00-03:00', 'relatorio-cliente', { ...fe, relatorio: 'vetsell/2026-10' }),
];
assert.equal(segundaDaSemana(agora), '2026-11-23');
assert.equal(visitasDe(linhas.filter((x) => x.area === 'reunioes')).length, 4);
const resumo = resumirVisitas(linhas, agora);
const reunioes = resumo.areas.find((a) => a.area === 'reunioes')!;
assert.deepEqual(reunioes.retencao, { semanaAnterior: 2, voltaram: 1 });
assert.equal(reunioes.visitas7, 2);
assert.equal(reunioes.visitas30, 4);
assert.equal(reunioes.pessoas30, 2);
const fernanda = reunioes.pessoas.find((p) => p.pessoa === 'fernanda@exemplo.test')!;
assert.deepEqual([fernanda.visitas30, fernanda.diasAtivos30, fernanda.semanasAtivas4], [3, 2, 2]);
const flavio = reunioes.pessoas.find((p) => p.pessoa === 'flavio@exemplo.test')!;
assert.deepEqual([flavio.visitas30, flavio.diasAtivos30, flavio.semanasAtivas4], [1, 1, 1]);
const aviarte = resumo.relatorios.find((r) => r.relatorio === 'aviarte/2026-10')!;
assert.deepEqual(
  [aviarte.aberturasCliente, aviarte.visitantesCliente, aviarte.aberturasEquipe],
  [3, 2, 1],
);
const vetsell = resumo.relatorios.find((r) => r.relatorio === 'vetsell/2026-10')!;
assert.deepEqual([vetsell.aberturasCliente, vetsell.primeiraCliente, vetsell.aberturasEquipe], [0, null, 1]);
// Uso do relatório olha só o cliente.
assert.equal(resumo.areas.find((a) => a.area === 'relatorio-cliente')!.pessoas30, 2);

console.log('verifica-visitas: ok');
