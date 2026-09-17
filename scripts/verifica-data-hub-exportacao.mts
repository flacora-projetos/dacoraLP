import assert from 'node:assert/strict';

Object.assign(process.env, {
  DATA_HUB_GCP_PROJECT_NUMBER: '123456789',
  DATA_HUB_WIF_POOL: 'vercel-portal',
  DATA_HUB_WIF_PROVIDER: 'vercel-preview',
  DATA_HUB_SERVICE_ACCOUNT: 'portal@dacora-data-hub.iam.gserviceaccount.com',
  DATA_HUB_CLOUD_RUN_AUDIENCE: 'https://dacora-data-hub.example.run.app',
  DATA_HUB_SPIKE_ENDPOINT: 'https://dacora-data-hub.example.run.app/internal/v1/portal/pwi0',
});

const { atenderDataHub } = await import('../api/_data-hub.ts');

/**
 * A entrega do resultado V2 na planilha. Dois pontos que nao podem regredir:
 * o ownerId e imposto pela sessao, e a tabela da tela nunca e enviada.
 */
const ator = { id: '9d97d3f1-25cb-4bfd-91e8-37d336cfa74b', email: 'contato@nandacora.com.br' };

function requisicao(url: string, method: string, body: unknown = {}) {
  return { url, method, body, query: {} } as any;
}

function resposta() {
  const estado: any = { status: 0, corpo: null, headers: {} };
  const res: any = {
    setHeader(chave: string, valor: string) { estado.headers[chave] = valor; },
    status(codigo: number) { estado.status = codigo; return res; },
    json(corpo: unknown) { estado.corpo = corpo; return res; },
  };
  return { res, estado };
}

async function chamar(url: string, method: string, body: unknown = {}) {
  const enviados: any[] = [];
  const { res, estado } = resposta();
  await atenderDataHub(requisicao(url, method, body), res, ator, {
    executar: async (requisicaoDataHub: any) => {
      enviados.push(requisicaoDataHub);
      return { status: 202, corpo: { status: 'enqueued', exportKey: 'chave' },
        audit: { requestId: 'request-id-123456', actorEmail: ator.email } };
    },
  });
  return { estado, enviados };
}

// 1. A rota existe e chega ao endpoint certo do Data Hub.
{
  const snapshot = { schemaVersion: '1.0.0', ownerId: 'portal-user:forjado', queryRunId: 'qv2_abc' };
  const { estado, enviados } = await chamar('/api/data-hub/query-v2/export', 'POST', { snapshot });
  assert.equal(estado.status, 202);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].endpoint, /\/internal\/v1\/portal\/query-v2\/export$/);
  assert.equal(enviados[0].method, 'POST');

  // 2. O ownerId do navegador e descartado e substituido pelo ator da sessao.
  assert.equal(enviados[0].body.snapshot.ownerId, `portal-user:${ator.id}`);
  assert.notEqual(enviados[0].body.snapshot.ownerId, 'portal-user:forjado');

  // 3. Só a referencia da consulta viaja; a tabela renderizada nunca e enviada.
  assert.equal(enviados[0].body.snapshot.queryRunId, 'qv2_abc');
  assert.equal('rows' in enviados[0].body.snapshot, false);
  assert.equal('columns' in enviados[0].body.snapshot, false);
}

// 4. Corpo sem snapshot falha fechado, sem chamar o Data Hub.
{
  const { estado, enviados } = await chamar('/api/data-hub/query-v2/export', 'POST', { queryRunId: 'qv2_abc' });
  assert.equal(estado.status, 400);
  assert.equal(enviados.length, 0);
}

// 5. Metodo errado nao vira exportacao.
{
  const { estado, enviados } = await chamar('/api/data-hub/query-v2/export', 'GET');
  assert.notEqual(estado.status, 202);
  assert.equal(enviados.length, 0);
}

// 6. A criacao de aba tem rota propria e repassa o corpo intacto.
{
  const corpo = { spreadsheetId: 'planilha', title: 'Mensal', startCell: 'B3' };
  const { estado, enviados } = await chamar('/api/data-hub/google/spreadsheets/sheets', 'POST', corpo);
  assert.equal(estado.status, 202);
  assert.match(enviados[0].endpoint, /\/google\/spreadsheets\/sheets$/);
  assert.deepEqual(enviados[0].body, corpo);
}

console.log('verifica:data-hub-exportacao OK');
