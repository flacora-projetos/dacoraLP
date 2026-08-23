import { randomUUID } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';
import { IdentityPoolClient } from 'google-auth-library';

const JSON_HEADERS = { 'content-type': 'application/json' };

type FetchLike = typeof fetch;

interface ConfiguracaoDataHub {
  providerAudience: string;
  serviceAccount: string;
  cloudRunAudience: string;
  endpoint: string;
}

export interface DependenciasDataHub {
  obterOidcVercel?: () => Promise<string>;
  trocarPorAccessToken?: (oidc: string, config: ConfiguracaoDataHub) => Promise<string>;
  fetch?: FetchLike;
  requestId?: () => string;
}

export interface RequisicaoDataHub {
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

function urlHttps(nome: string, valor: string | undefined): string {
  if (!valor) throw new Error(`${nome}_ausente`);
  const url = new URL(valor);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`${nome}_invalido`);
  return url.toString().replace(/\/$/, '');
}

export function configuracaoDataHub(): ConfiguracaoDataHub {
  const projectNumber = process.env.DATA_HUB_GCP_PROJECT_NUMBER?.trim();
  const pool = process.env.DATA_HUB_WIF_POOL?.trim();
  const provider = process.env.DATA_HUB_WIF_PROVIDER?.trim();
  const serviceAccount = process.env.DATA_HUB_SERVICE_ACCOUNT?.trim();
  if (!/^\d+$/.test(projectNumber ?? '')) throw new Error('DATA_HUB_GCP_PROJECT_NUMBER_invalido');
  if (!/^[a-z0-9-]{4,32}$/.test(pool ?? '')) throw new Error('DATA_HUB_WIF_POOL_invalido');
  if (!/^[a-z0-9-]{4,32}$/.test(provider ?? '')) throw new Error('DATA_HUB_WIF_PROVIDER_invalido');
  if (!/^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/.test(serviceAccount ?? '')) throw new Error('DATA_HUB_SERVICE_ACCOUNT_invalido');
  const cloudRunAudience = urlHttps('DATA_HUB_CLOUD_RUN_AUDIENCE', process.env.DATA_HUB_CLOUD_RUN_AUDIENCE);
  const endpoint = urlHttps('DATA_HUB_SPIKE_ENDPOINT', process.env.DATA_HUB_SPIKE_ENDPOINT);
  if (!endpoint.endsWith('/internal/v1/portal/pwi0')) throw new Error('DATA_HUB_SPIKE_ENDPOINT_invalido');
  return {
    providerAudience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    serviceAccount: serviceAccount!,
    cloudRunAudience,
    endpoint,
  };
}

async function accessTokenGoogle(oidc: string, config: ConfiguracaoDataHub): Promise<string> {
  const client = new IdentityPoolClient({
    audience: config.providerAudience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    subject_token_supplier: { getSubjectToken: async () => oidc },
  });
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('sts_sem_access_token');
  return token.token;
}

function respostaSegura(status: number, corpo: unknown, requestId: string) {
  if (status >= 200 && status < 300) return { status, corpo };
  const codigo = (corpo as any)?.error?.code;
  return {
    status: status >= 400 && status < 500 ? status : 502,
    corpo: {
      erro: typeof codigo === 'string' ? codigo : 'data_hub_indisponivel',
      mensagem: 'Não foi possível validar o canal com o Data Hub.',
      requestId,
    },
  };
}

export async function executarSpikeDataHub(
  ator: { email: string },
  dependencias: DependenciasDataHub = {},
) {
  const config = configuracaoDataHub();
  return executarRequisicaoDataHub({ endpoint: config.endpoint, method: 'POST', body: { schemaVersion: '1.0.0' } }, ator, dependencias);
}

/** Canal único portal → WIF → ID token → Cloud Run. Os modos de produto
 * reutilizam esta cadeia sem receber credenciais nem identidade do browser. */
export async function executarRequisicaoDataHub(
  requisicao: RequisicaoDataHub,
  ator: { email: string },
  dependencias: DependenciasDataHub = {},
) {
  const config = configuracaoDataHub();
  const endpoint = urlHttps('DATA_HUB_ENDPOINT', requisicao.endpoint);
  if (!endpoint.startsWith(`${config.cloudRunAudience}/internal/v1/portal/`)) throw new Error('DATA_HUB_ENDPOINT_invalido');
  const requestId = (dependencias.requestId ?? randomUUID)();
  const obterOidc = dependencias.obterOidcVercel ?? getVercelOidcToken;
  const trocar = dependencias.trocarPorAccessToken ?? accessTokenGoogle;
  const chamar = dependencias.fetch ?? fetch;
  const oidc = await obterOidc();
  const accessToken = await trocar(oidc, config);
  const iam = await chamar(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccount)}:generateIdToken`,
    {
      method: 'POST',
      headers: { ...JSON_HEADERS, authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ audience: config.cloudRunAudience, includeEmail: true }),
    },
  );
  if (!iam.ok) throw new Error(`iam_generate_id_token_${iam.status}`);
  const idToken = (await iam.json() as { token?: unknown }).token;
  if (typeof idToken !== 'string' || !idToken) throw new Error('iam_sem_id_token');
  const backend = await chamar(endpoint, {
    method: requisicao.method,
    headers: { ...JSON_HEADERS, authorization: `Bearer ${idToken}`, 'x-request-id': requestId },
    ...(requisicao.method === 'GET' ? {} : { body: JSON.stringify(requisicao.body ?? {}) }),
  });
  let corpo: unknown = null;
  try { corpo = await backend.json(); } catch { corpo = null; }
  const resultado = respostaSegura(backend.status, corpo, requestId);
  return { ...resultado, audit: { requestId, actorEmail: ator.email } };
}
