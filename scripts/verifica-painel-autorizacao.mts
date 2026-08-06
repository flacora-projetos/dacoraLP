/**
 * Regressão da autorização do painel — `npm run verifica:painel`.
 *
 * Por que existe, sendo que o projeto não tem suíte de testes: no painel esta é
 * a única peça que decide quem entra, e é a única que dá para provar sem uma
 * conta Google de verdade na mão. Subir a página prova que a tela aparece; não
 * prova que um e-mail com maiúscula, com espaço em volta ou separado por
 * ponto-e-vírgula continua sendo lido como o mesmo e-mail — e é aí que uma
 * mudança inocente arromba a porta ou tranca o Flávio do lado de fora.
 */
import assert from 'node:assert/strict';
import { lerListaAutorizada, emailAutorizado, extrairTokenBearer, entrouPeloGoogle } from '../api/_painel-autorizacao.ts';

const lista = lerListaAutorizada(' Contato@NandaCora.com.br , flacora@gmail.com ');
assert.deepEqual(lista, ['contato@nandacora.com.br', 'flacora@gmail.com']);

assert.equal(emailAutorizado('CONTATO@nandacora.com.br', lista), true);
assert.equal(emailAutorizado(' flacora@gmail.com ', lista), true);
assert.equal(emailAutorizado('outra.pessoa@gmail.com', lista), false);
assert.equal(emailAutorizado('', lista), false);
assert.equal(emailAutorizado('flacora@gmail.com', lerListaAutorizada(undefined)), false);
assert.equal(emailAutorizado('flacora@gmail.com', lerListaAutorizada('')), false);
assert.deepEqual(lerListaAutorizada('a@b.com\nc@d.com;e@f.com'), ['a@b.com','c@d.com','e@f.com']);

assert.equal(extrairTokenBearer('Bearer abc.def'), 'abc.def');
assert.equal(extrairTokenBearer('bearer  abc'), 'abc');
assert.equal(extrairTokenBearer('Basic abc'), null);
assert.equal(extrairTokenBearer('Bearer   '), null);
assert.equal(extrairTokenBearer(undefined), null);
assert.equal(extrairTokenBearer(['Bearer xyz']), 'xyz');

assert.equal(entrouPeloGoogle({ app_metadata: { provider: 'google' } }), true);
assert.equal(entrouPeloGoogle({ app_metadata: { provider: 'email', providers: ['email','google'] } }), true);
assert.equal(entrouPeloGoogle({ identities: [{ provider: 'google' }] }), true);
assert.equal(entrouPeloGoogle({ app_metadata: { provider: 'email' }, identities: [{ provider: 'email' }] }), false);
assert.equal(entrouPeloGoogle({}), false);

// =====================================================================
// O endpoint inteiro, com o Supabase trocado por um dublê.
//
// Isto é o mais perto que dá para chegar do critério da P0 — "os dois
// e-mails entram; um terceiro autentica e é barrado" — sem ter as três
// contas Google na mão. O que se troca é APENAS a resposta do Supabase;
// o handler que decide é o de verdade, com o mesmo caminho de código que
// roda em produção.
//
// O que este dublê NÃO prova, e por isso continua na lista de pendências
// do PAINEL_PROGRESSO.md: que o provedor Google está ligado no projeto,
// que a URL de retorno está autorizada, e que o token que chega aqui é
// mesmo válido. Isso só o primeiro login de verdade responde.
// =====================================================================

import handler from '../api/painel-sessao.ts';

const fetchOriginal = globalThis.fetch;

function respostaFalsaDoSupabase(usuario: unknown | null) {
  globalThis.fetch = (async () => {
    if (!usuario) return new Response('{}', { status: 401 });
    return new Response(JSON.stringify(usuario), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

interface RespostaCapturada {
  status: number;
  corpo: any;
  cabecalhos: Record<string, string>;
}

async function chamar(
  cabecalhoAutorizacao: string | undefined,
  usuarioDoSupabase: unknown | null,
  metodo = 'GET',
): Promise<RespostaCapturada> {
  respostaFalsaDoSupabase(usuarioDoSupabase);

  const capturado: RespostaCapturada = { status: 0, corpo: null, cabecalhos: {} };
  const req: any = { method: metodo, headers: { authorization: cabecalhoAutorizacao } };
  const res: any = {
    setHeader(nome: string, valor: string) {
      capturado.cabecalhos[nome.toLowerCase()] = valor;
      return res;
    },
    status(codigo: number) {
      capturado.status = codigo;
      return res;
    },
    json(corpo: any) {
      capturado.corpo = corpo;
      return res;
    },
  };

  await handler(req, res);
  return capturado;
}

const googlada = (email: string) => ({
  email,
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Fulano de Tal' },
});

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-mentira';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'contato@nandacora.com.br,flacora@gmail.com';

// Os dois autorizados entram — inclusive com maiúscula, que é como um
// endereço costuma ser digitado por gente.
for (const email of ['contato@nandacora.com.br', 'flacora@gmail.com', 'Flacora@Gmail.com']) {
  const r = await chamar('Bearer token-valido', googlada(email));
  assert.equal(r.status, 200, `esperava 200 para ${email}`);
  assert.equal(r.corpo.autorizado, true);
  assert.equal(r.corpo.nome, 'Fulano de Tal');
}

// O terceiro autentica e é barrado — com o e-mail dele de volta, para a
// tela conseguir dizer quem entrou, e SEM a lista de quem pode.
{
  const r = await chamar('Bearer token-valido', googlada('estranho@exemplo.com'));
  assert.equal(r.status, 403);
  assert.equal(r.corpo.autorizado, false);
  assert.equal(r.corpo.email, 'estranho@exemplo.com');
  assert.equal(r.corpo.erro, 'email_nao_autorizado');
  const serializado = JSON.stringify(r.corpo);
  assert.ok(!serializado.includes('nandacora'), 'a lista de autorizados vazou na resposta');
  assert.ok(!serializado.includes('flacora'), 'a lista de autorizados vazou na resposta');
}

// E-mail autorizado, mas entrando por outro provedor: barrado.
{
  const r = await chamar('Bearer token-valido', {
    email: 'flacora@gmail.com',
    app_metadata: { provider: 'email', providers: ['email'] },
  });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.erro, 'provedor_nao_permitido');
}

// Sem sessão, sessão recusada pelo Supabase e método errado.
assert.equal((await chamar(undefined, null)).status, 401);
assert.equal((await chamar('Bearer token-podre', null)).status, 401);
assert.equal((await chamar('Bearer token-valido', googlada('flacora@gmail.com'), 'DELETE')).status, 405);

// Resposta de autorização nunca pode ser guardada em cache.
{
  const r = await chamar('Bearer token-valido', googlada('flacora@gmail.com'));
  assert.match(r.cabecalhos['cache-control'] ?? '', /no-store/);
}

// Falha fechado: lista vazia tranca todo mundo, inclusive quem podia.
{
  process.env.PAINEL_EMAILS_AUTORIZADOS = '';
  const r = await chamar('Bearer token-valido', googlada('flacora@gmail.com'));
  assert.equal(r.status, 500);
  assert.equal(r.corpo.erro, 'lista_vazia');
  process.env.PAINEL_EMAILS_AUTORIZADOS = 'contato@nandacora.com.br,flacora@gmail.com';
}

// Falha fechado também sem a conexão com o banco.
{
  const url = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  const r = await chamar('Bearer token-valido', googlada('flacora@gmail.com'));
  assert.equal(r.status, 500);
  assert.equal(r.corpo.erro, 'nao_configurado');
  process.env.SUPABASE_URL = url;
}

globalThis.fetch = fetchOriginal;

console.log('OK — autorização do painel: 21 asserções puras + o endpoint inteiro nos 3 caminhos de e-mail');
