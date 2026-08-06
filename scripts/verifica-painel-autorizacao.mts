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

console.log('OK — 21 asserções de autorização passaram');
