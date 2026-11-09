import assert from 'node:assert/strict';
import { atenderPropostas, resumirSenha } from '../api/_propostas.ts';

const SEGREDO = 'CONTEUDO-SECRETO-DA-PROPOSTA';
const acessos = {
  alfa: { ...(await resumirSenha('senha-de-teste-alfa')), logins: ['alfa', 'pessoa@exemplo.com'] },
  beta: await resumirSenha('senha-de-teste-beta'),
};
const dependencias = {
  chaveDeServico: 'chave-de-teste',
  baixarAcesso: async (alvo: string) => acessos[alvo as keyof typeof acessos] ?? null,
  baixarPagina: async (alvo: string) => `${SEGREDO}-${alvo}`,
};

async function pedir(metodo: string, slug: string, opcoes: { login?: string; senha?: string; cookie?: string; extra?: object } = {}) {
  const saida = { status: 0, corpo: '', cabecalhos: {} as Record<string, string> };
  const res: any = {
    setHeader: (nome: string, valor: string) => { saida.cabecalhos[nome.toLowerCase()] = valor; },
    status: (codigo: number) => { saida.status = codigo; return res; },
    send: (corpo: string) => { saida.corpo = corpo; return res; },
  };
  const req: any = { method: metodo, query: { slug }, headers: { cookie: opcoes.cookie }, body: opcoes.senha === undefined ? undefined : { login: opcoes.login ?? slug, senha: opcoes.senha } };
  await atenderPropostas(req, res, { ...dependencias, ...opcoes.extra });
  return saida;
}

const cookieDe = (r: { cabecalhos: Record<string, string> }) => r.cabecalhos['set-cookie'].split(';')[0];

const semCookie = await pedir('GET', 'alfa');
assert.equal(semCookie.status, 200);
assert.ok(!semCookie.corpo.includes(SEGREDO), 'sem senha não mostra a proposta');
assert.match(semCookie.corpo, /type="password"/);
assert.equal(semCookie.cabecalhos['x-robots-tag'], 'noindex, nofollow, noarchive');

const errada = await pedir('POST', 'alfa', { senha: 'errada' });
assert.equal(errada.status, 401);
assert.ok(!errada.corpo.includes(SEGREDO));

const inexistente = await pedir('POST', 'nao-existe', { senha: 'errada' });
assert.equal(inexistente.status, 401, 'endereço inexistente responde como senha errada');

const outra = await pedir('POST', 'alfa', { senha: 'senha-de-teste-beta' });
assert.equal(outra.status, 401, 'senha de uma proposta não abre outra');

const certa = await pedir('POST', 'alfa', { senha: 'senha-de-teste-alfa' });
assert.equal(certa.status, 303);
assert.equal(certa.cabecalhos.location, '/propostas/alfa');
assert.match(certa.cabecalhos['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
assert.match(certa.cabecalhos['set-cookie'], /Path=\/propostas\/alfa/);

assert.equal((await pedir('POST', 'alfa', { login: 'intruso', senha: 'senha-de-teste-alfa' })).status, 401, 'login fora da lista não entra');
assert.equal((await pedir('POST', 'alfa', { login: ' Pessoa@Exemplo.com ', senha: 'senha-de-teste-alfa' })).status, 303, 'e-mail da lista entra');
assert.equal((await pedir('POST', 'beta', { login: 'beta', senha: 'senha-de-teste-beta' })).status, 303, 'sem lista, vale o endereço');

const aberta = await pedir('GET', 'alfa', { cookie: cookieDe(certa) });
assert.equal(aberta.status, 200);
assert.ok(aberta.corpo.includes(`${SEGREDO}-alfa`));

const outroCookie = cookieDe(certa).replace('proposta_alfa', 'proposta_beta');
assert.ok(!(await pedir('GET', 'beta', { cookie: outroCookie })).corpo.includes(SEGREDO), 'cookie de uma não abre outra');

const adulterado = cookieDe(certa).slice(0, -1) + (cookieDe(certa).endsWith('0') ? '1' : '0');
assert.ok(!(await pedir('GET', 'alfa', { cookie: adulterado })).corpo.includes(SEGREDO), 'cookie adulterado não abre');

const depois = await pedir('GET', 'alfa', { cookie: cookieDe(certa), extra: { agora: () => new Date(Date.now() + 31 * 86400000) } });
assert.ok(!depois.corpo.includes(SEGREDO), 'acesso expira');

const novaSenha = await pedir('GET', 'alfa', { cookie: cookieDe(certa), extra: { baixarAcesso: async () => acessos.beta } });
assert.ok(!novaSenha.corpo.includes(SEGREDO), 'trocar a senha derruba acessos antigos');

const semChave = await pedir('GET', 'alfa', { extra: { chaveDeServico: '' } });
assert.ok(!semChave.corpo.includes(SEGREDO), 'sem configuração falha fechado');

const falha = await pedir('GET', 'alfa', { extra: { baixarAcesso: async () => { throw new Error('fora do ar'); } } });
assert.equal(falha.status, 503);

assert.equal((await pedir('PUT', 'alfa')).status, 405);
console.log('Propostas: todas as verificações passaram.');
