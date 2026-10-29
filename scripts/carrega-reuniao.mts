import fs from 'node:fs/promises';
import process from 'node:process';
import assert from 'node:assert/strict';
import { atenderReunioes } from '../api/_reunioes.ts';

// Usa o mesmo validador da rota; credenciais e conteúdos ficam fora do Git.
const [arquivo, autor, aplicar] = process.argv.slice(2);
if (!arquivo || !autor || !/^[\da-f-]{36}$/i.test(autor))
  throw new Error('Uso: tsx scripts/carrega-reuniao.mts <conteudo.json> <UUID autor> [--aplicar]');
const dados = JSON.parse(await fs.readFile(arquivo, 'utf8'));
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
let payload: any = null;
let status = 200;
let resposta: any;
const req: any = {
  method: 'POST',
  headers: { authorization: 'Bearer validacao-local' },
  query: { acao: 'criar' },
  body: dados,
};
const res: any = {
  setHeader() {},
  status(s: number) {
    status = s;
    return res;
  },
  json(corpo: any) {
    resposta = corpo;
    return res;
  },
};
await atenderReunioes(req, res, {
  fetch: (async () =>
    new Response(
      JSON.stringify({
        id: autor,
        email: process.env.PAINEL_EMAILS_AUTORIZADOS?.split(/[,;\n]/)[0]?.trim(),
        app_metadata: { provider: 'google' },
      }),
    )) as typeof fetch,
  banco: async (_tabela, _consulta, _metodo, corpo) => {
    payload = corpo;
    return [{ ...(corpo as object), id: 'validacao' }] as any;
  },
});
if (status !== 201 || !payload) throw new Error(resposta?.mensagem || 'Roteiro inválido.');
if (aplicar !== '--aplicar') {
  console.log(
    `Validado: ${dados.titulo}. ${dados.interno.secoes.length} etapas internas; ${dados.interno.duvidas.length} respostas; ${dados.compartilhado.secoes.length} etapas compartilhadas. Nenhuma gravação.`,
  );
} else {
  if (!url || !chave) throw new Error('Falta a configuração do banco no servidor.');
  const r = await fetch(`${url}/rest/v1/portal_reunioes?select=id,slug`, {
    method: 'POST',
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok)
    throw new Error(`Gravação recusada (${r.status}). Nenhum roteiro existente foi sobrescrito.`);
  const [salvo] = await r.json();
  const leitura = await fetch(
    `${url}/rest/v1/portal_reunioes?id=eq.${salvo.id}&select=slug,compartilhado,interno`,
    { headers: { apikey: chave, Authorization: `Bearer ${chave}` } },
  );
  if (!leitura.ok)
    throw new Error('Gravou, mas falta confirmar a leitura. Não repita a importação.');
  const [confirmado] = await leitura.json();
  assert.deepEqual(confirmado.interno, dados.interno);
  assert.deepEqual(confirmado.compartilhado, dados.compartilhado);
  console.log(`Reunião gravada e relida: /reunioes/${confirmado.slug}`);
}
