import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/relatorio-publico.ts';
import { criarAssinadorStoragePrivado } from '../api/_storage-privado.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const TOKEN = 'A'.repeat(43);
const checksum = 'checksum-aprovado';
const linha: any = {
  id: '11111111-1111-4111-8111-111111111111',
  cliente_slug: 'cliente_exemplo',
  competencia: '2026-07',
  versao: 1,
  estado: 'liberado',
  gerado_em: '2026-08-01T10:00:00Z',
  checksum,
  aprovado_por: 'Flávio Corá',
  aprovado_em: '2026-08-09T10:00:00Z',
  aprovado_checksum: checksum,
  enviado_em: null,
  enviado_para: null,
  substituido_por: null,
  revogado_em: null,
  conteudo: structuredClone(karyneMontada202607),
};
linha.conteudo.identidade.clienteSlug = linha.cliente_slug;
linha.conteudo.identidade.competencia = linha.competencia;
linha.conteudo.dados.audios = {};

const fetchOriginal = globalThis.fetch;
const envOriginal = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
process.env.SUPABASE_URL = 'https://projeto.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';

function resposta() {
  let status = 200;
  const headers = new Map<string, string>();
  let body: any;
  return {
    setHeader(nome: string, valor: string) { headers.set(nome.toLowerCase(), valor); },
    status(valor: number) { status = valor; return this; },
    json(valor: any) { body = valor; return this; },
    ler() { return { status, headers, body }; },
  } as any;
}

async function chamar(token: string, linhas: any[], metodo = 'GET', sufixo = '') {
  let urlConsultada = '';
  globalThis.fetch = (async (entrada: any) => {
    urlConsultada = String(entrada);
    return new Response(JSON.stringify(linhas), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  const res = resposta();
  await handler({
    method: metodo,
    url: `/api/relatorio-publico?token=${encodeURIComponent(token)}${sufixo}`,
  } as any, res);
  return { ...res.ler(), urlConsultada };
}

try {
  {
    let endpoint = '';
    const assinar = criarAssinadorStoragePrivado({
      bucket: 'relatorios-audios',
      urlSupabase: 'https://projeto.supabase.co',
      chaveDeServico: 'segredo-de-teste',
      validadeSegundos: 3600,
      fetchImpl: (async (entrada: any, init?: RequestInit) => {
        endpoint = String(entrada);
        const pedido = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(pedido.paths.map((path: string) => ({
          path,
          error: null,
          signedURL: `/object/sign/relatorios-audios/${path}?token=teste`,
        }))), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    });
    const [assinatura] = await assinar(['cliente/2026-07/v1/audio.ogg']);
    assert.equal(endpoint, 'https://projeto.supabase.co/storage/v1/object/sign/relatorios-audios');
    assert.equal(assinatura.signedUrl, 'https://projeto.supabase.co/storage/v1/object/sign/relatorios-audios/cliente/2026-07/v1/audio.ogg?token=teste');
  }

  const ok = await chamar(TOKEN, [linha]);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.relatorio.snapshot.publicacao.checksum, checksum);
  assert.equal(ok.body.relatorio.id, undefined, 'UUID interno não precisa sair na rota externa');
  assert.equal(ok.body.relatorio.sinais, undefined, 'sinais da bancada não pertencem ao cliente');
  assert.ok(ok.urlConsultada.includes(`token=eq.${TOKEN}`));
  assert.ok(ok.urlConsultada.includes('estado=eq.liberado'));
  assert.ok(!JSON.stringify(ok.body).includes(TOKEN), 'a credencial nunca pode voltar no JSON');
  assert.equal(ok.headers.get('cache-control')?.includes('no-store'), true);
  assert.equal(ok.headers.get('referrer-policy'), 'no-referrer');

  for (const mutacao of [
    { estado: 'gerado' },
    { revogado_em: '2026-08-09T11:00:00Z' },
    { substituido_por: '22222222-2222-4222-8222-222222222222' },
    { aprovado_checksum: 'outro-checksum' },
    { aprovado_por: null },
  ]) {
    const recusado = await chamar(TOKEN, [{ ...linha, ...mutacao }]);
    assert.equal(recusado.status, 404, `precisava recusar ${JSON.stringify(mutacao)}`);
  }

  const invalido = await chamar('curto', [linha]);
  assert.equal(invalido.status, 404);
  assert.equal(invalido.urlConsultada, '', 'token inválido não pode consultar o banco');

  const duplicado = await chamar(TOKEN, [linha], 'GET', `&token=${TOKEN}`);
  assert.equal(duplicado.status, 404, 'dois tokens na URL precisam falhar fechado');
  assert.equal(duplicado.urlConsultada, '', 'token ambiguo nao pode consultar o banco');

  const metodo = await chamar(TOKEN, [linha], 'POST');
  assert.equal(metodo.status, 405);

  const pagina = readFileSync(new URL('../src/pages/RelatorioPublico.tsx', import.meta.url), 'utf8');
  assert.ok(pagina.includes('<RelatorioMontado'));
  assert.ok(!pagina.includes('<RevisaoMoldura'));
  assert.ok(!pagina.includes('Aprovar relatório'));
  assert.ok(!pagina.includes('Recusar com motivo'));

  console.log('verifica-relatorio-publico: OK');
} finally {
  globalThis.fetch = fetchOriginal;
  if (envOriginal.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = envOriginal.url;
  if (envOriginal.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = envOriginal.key;
}
