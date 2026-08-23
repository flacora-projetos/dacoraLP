import assert from 'node:assert/strict';
import fs from 'node:fs';
import { executarSpikeDataHub } from '../api/_data-hub-spike.ts';
import { atenderPainelSessao } from '../api/painel-sessao.ts';

Object.assign(process.env, {
  DATA_HUB_GCP_PROJECT_NUMBER: '123456789',
  DATA_HUB_WIF_POOL: 'vercel-portal',
  DATA_HUB_WIF_PROVIDER: 'vercel-preview',
  DATA_HUB_SERVICE_ACCOUNT: 'portal@dacora-data-hub.iam.gserviceaccount.com',
  DATA_HUB_CLOUD_RUN_AUDIENCE: 'https://dacora-data-hub.example.run.app',
  DATA_HUB_SPIKE_ENDPOINT: 'https://dacora-data-hub.example.run.app/internal/v1/portal/pwi0',
});

const chamadas: Array<{ url: string; init?: RequestInit }> = [];
const fetchFake: typeof fetch = async (input, init) => {
  const url = String(input);
  chamadas.push({ url, init });
  if (url.includes('iamcredentials.googleapis.com')) return new Response(JSON.stringify({ token: 'id-token-curto' }), { status: 200 });
  return new Response(JSON.stringify({ status: 'accepted', state: 'validated', requestId: 'request-id-123456' }), { status: 200 });
};

const resultado = await executarSpikeDataHub(
  { email: 'contato@nandacora.com.br' },
  {
    obterOidcVercel: async () => 'oidc-vercel-curto',
    trocarPorAccessToken: async (oidc, config) => {
      assert.equal(oidc, 'oidc-vercel-curto');
      assert.match(config.providerAudience, /projects\/123456789\/locations\/global\/workloadIdentityPools\/vercel-portal\/providers\/vercel-preview$/);
      return 'access-token-curto';
    },
    fetch: fetchFake,
    requestId: () => 'request-id-123456',
  },
);

assert.equal(resultado.status, 200);
assert.equal(chamadas.length, 2);
assert.match(chamadas[0].url, /projects\/-\/serviceAccounts\/portal%40dacora-data-hub\.iam\.gserviceaccount\.com:generateIdToken$/);
assert.deepEqual(JSON.parse(String(chamadas[0].init?.body)), {
  audience: 'https://dacora-data-hub.example.run.app',
  includeEmail: true,
});
assert.equal((chamadas[1].init?.headers as Record<string, string>).authorization, 'Bearer id-token-curto');
assert.equal((chamadas[1].init?.headers as Record<string, string>)['x-request-id'], 'request-id-123456');
assert.deepEqual(JSON.parse(String(chamadas[1].init?.body)), { schemaVersion: '1.0.0' });
assert.doesNotMatch(JSON.stringify(resultado.corpo), /token|contato@/i);

function respostaCapturada() {
  const captura = { status: 0, corpo: null as any, headers: {} as Record<string, string> };
  const res: any = {
    setHeader(nome: string, valor: string) { captura.headers[nome.toLowerCase()] = valor; return res; },
    status(status: number) { captura.status = status; return res; },
    json(corpo: any) { captura.corpo = corpo; return res; },
  };
  return { captura, res };
}

process.env.SUPABASE_URL = 'https://supabase.example.test';
process.env.SUPABASE_ANON_KEY = 'anon-publica-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'contato@nandacora.com.br';

let chamadasSpike = 0;
const spikeFake: typeof executarSpikeDataHub = async () => {
  chamadasSpike += 1;
  return { status: 200, corpo: { status: 'accepted', requestId: 'server-generated-id' }, audit: { requestId: 'server-generated-id', actorEmail: 'contato@nandacora.com.br' } };
};

const fetchOriginal = globalThis.fetch;
globalThis.fetch = async () => new Response('{}', { status: 401 });
{
  const { captura, res } = respostaCapturada();
  await atenderPainelSessao({ method: 'POST', query: { modo: 'data-hub-spike' }, headers: {}, body: {} } as any, res, { spike: spikeFake });
  assert.equal(captura.status, 401);
  assert.equal(chamadasSpike, 0, 'sem sessão não pode obter token nem chamar o Data Hub');
}

globalThis.fetch = async () => new Response(JSON.stringify({
  email: 'contato@nandacora.com.br',
  app_metadata: { provider: 'google' },
}), { status: 200, headers: { 'content-type': 'application/json' } });
{
  const { captura, res } = respostaCapturada();
  await atenderPainelSessao({ method: 'POST', query: { modo: 'data-hub-spike' }, headers: { authorization: 'Bearer sessao' }, body: { requestId: 'forjado-no-browser' } } as any, res, { spike: spikeFake });
  assert.equal(captura.status, 400);
  assert.equal(chamadasSpike, 0, 'payload forjado deve parar antes do canal WIF');
}
{
  const { captura, res } = respostaCapturada();
  await atenderPainelSessao({ method: 'POST', query: { modo: 'data-hub-spike' }, headers: { authorization: 'Bearer sessao' }, body: {} } as any, res, { spike: spikeFake });
  assert.equal(captura.status, 200);
  assert.equal(chamadasSpike, 1);
  assert.doesNotMatch(JSON.stringify(captura.corpo), /contato@|token/i);
}
globalThis.fetch = fetchOriginal;

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const pagina = fs.readFileSync(new URL('../src/pages/DataHub.tsx', import.meta.url), 'utf8');
assert.match(app, /path="\/data-hub"/);
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/DataHub'\)\)/);
assert.match(pagina, /<PainelAuthProvider>[\s\S]*<Portao>[\s\S]*<DataHubInicio \/>/);
assert.match(pagina, /fetch\('\/api\/data-hub-spike'/);
assert.match(pagina, /Authorization: `Bearer \$\{sessao\.access_token\}`/);
assert.match(pagina, /body: '\{\}'/);
assert.doesNotMatch(pagina, /body:[^\n]*(requestId|actor|audience)/);

console.log('OK — PWI0 local: sessão antes do downstream, WIF injetável, IAM ID token, audiência exata e envelope sanitizado');
