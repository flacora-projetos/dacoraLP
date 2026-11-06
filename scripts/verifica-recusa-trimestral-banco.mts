import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import handler from '../api/painel-decisao.ts';

const pastaMigrations = process.argv[2];
assert.ok(pastaMigrations, 'Informe a pasta db/migrations da candidata da fábrica.');
const db = new PGlite();
const fetchOriginal = globalThis.fetch;
const ambienteOriginal = { ...process.env };
const checksum = 'a'.repeat(32);
const quem = 'revisora@example.com';
const automatica = {
  causeId: 'metrica_obrigatoria_ausente',
  parameters: { section_id: 'bloco:meta', platform: 'meta', metric_id: 'meta_cpm' },
};
const manual = {
  causeId: 'texto_ou_grafia',
  parameters: { section_ids: ['bloco:meta'], description: 'Corrigir a grafia na análise.' },
};

try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const arquivos = (await fs.readdir(pastaMigrations)).filter(f => f.endsWith('.sql')).sort();
  assert.ok(arquivos.includes('20261106160000_trimestral_recusa_manual.sql'));
  for (const arquivo of arquivos) {
    await db.exec(await fs.readFile(path.join(pastaMigrations, arquivo), 'utf8'));
  }

  Object.assign(process.env, {
    SUPABASE_URL: 'https://teste.invalid',
    SUPABASE_ANON_KEY: 'publica-teste',
    SUPABASE_SERVICE_ROLE_KEY: 'servico-teste',
    PAINEL_EMAILS_AUTORIZADOS: quem,
  });

  async function recusar({
    slug, causas = [automatica], falhaConsulta,
  }: {
    slug: string;
    causas?: Array<typeof automatica | typeof manual>;
    falhaConsulta?: 'http' | 'rede';
  }) {
    const id = randomUUID();
    await db.query(`insert into public.relatorios
      (id, cliente_slug, competencia, token, conteudo, checksum)
      values ($1, $2, '2026-09', $3, $4, $5)`, [
      id, slug, randomUUID().repeat(2),
      JSON.stringify({ montagem: [{ bloco: 'B2', id: 'meta' }], dados: {} }), checksum,
    ]);
    const antes = await db.query('select * from public.relatorios where id = $1', [id]);
    let consultasExtras = 0;
    let decisoes = 0;
    globalThis.fetch = (async (entrada, init) => {
      const url = new URL(String(entrada));
      assert.equal(url.origin, 'https://teste.invalid');
      if (url.pathname === '/auth/v1/user') {
        return Response.json({ email: quem, app_metadata: { provider: 'google' } });
      }
      if (url.pathname === '/rest/v1/relatorios') {
        consultasExtras++;
        if (falhaConsulta === 'rede') throw new TypeError('Rede indisponível somente na consulta extra');
        if (falhaConsulta === 'http') return new Response('{}', { status: 503 });
        return Response.json([{ cliente_slug: slug }]);
      }
      if (url.pathname === '/rest/v1/rpc/decidir_relatorio_com_causas_v1') {
        decisoes++;
        const corpo = JSON.parse(String(init?.body));
        try {
          await db.exec('set role service_role');
          const resultado = await db.query(`select * from public.decidir_relatorio_com_causas_v1(
            $1::uuid, $2::text, $3::text, $4::text, $5::text, $6::jsonb)`, [
            corpo.p_relatorio_id, corpo.p_checksum_visto, corpo.p_quem,
            corpo.p_motivo, corpo.p_catalog_version, JSON.stringify(corpo.p_causas),
          ]);
          return Response.json(resultado.rows);
        } catch (erro: any) {
          return Response.json({ code: erro.code, message: erro.message }, { status: 400 });
        } finally {
          await db.exec('reset role');
        }
      }
      assert.equal(url.pathname, '/rest/v1/painel_relatorios_com_correcao');
      const resultado = await db.query(
        'select * from public.painel_relatorios_com_correcao where id = $1', [id]);
      return Response.json(resultado.rows);
    }) as typeof fetch;

    const resposta = {
      statusCode: 0,
      corpo: null as any,
      setHeader() {},
      status(codigo: number) { this.statusCode = codigo; return this; },
      json(corpo: any) { this.corpo = corpo; return this; },
    };
    await handler({
      method: 'POST', headers: { authorization: 'Bearer teste' },
      body: { id, decisao: 'recusar', checksum, motivo: 'Conferir os números desta seção.',
        catalogVersion: '2026-10-08.v2', causas },
    } as any, resposta as any);
    const estado = await db.query<{
      estado: string;
      recusado_por: string | null;
      ordens: number;
      notificacoes: number;
    }>(`select r.estado, r.recusado_por,
      (select count(*)::int from public.relatorio_ordens_correcao o where o.relatorio_id = r.id) as ordens,
      (select count(*)::int from public.relatorio_notificacoes_internas n
       join public.relatorio_ordens_correcao o on o.id = n.ordem_correcao_id
       where o.relatorio_id = r.id) as notificacoes
      from public.relatorios r where r.id = $1`, [id]);
    assert.equal(consultasExtras, 0, 'a recusa não depende da consulta extra');
    assert.equal(decisoes, 1);
    const depois = await db.query('select * from public.relatorios where id = $1', [id]);
    return { ...resposta, estado: estado.rows[0], antes: antes.rows[0], depois: depois.rows[0] };
  }

  for (const [indice, falhaConsulta] of ([undefined, 'http', 'rede'] as const).entries()) {
    const resposta = await recusar({ slug: `mensal_${indice}`, falhaConsulta });
    assert.equal(resposta.statusCode, 200, JSON.stringify(resposta.corpo));
    assert.equal(resposta.corpo.gravado, true);
    assert.deepEqual(resposta.estado, { estado: 'recusado', recusado_por: quem, ordens: 1, notificacoes: 1 });
  }

  const bloqueada = await recusar({ slug: 'cliente__trimestral' });
  assert.equal(bloqueada.statusCode, 409, JSON.stringify(bloqueada.corpo));
  assert.equal(bloqueada.corpo.erro, 'recusa_trimestral_somente_manual');
  assert.equal(bloqueada.corpo.gravado, false);
  assert.deepEqual(bloqueada.estado, { estado: 'gerado', recusado_por: null, ordens: 0, notificacoes: 0 });
  assert.deepEqual(bloqueada.depois, bloqueada.antes, 'a falha desfaz a decisão inteira');

  for (const [indice, causas] of [[manual], [automatica, manual]].entries()) {
    const resposta = await recusar({ slug: `manual_${indice}__trimestral`, causas });
    assert.equal(resposta.statusCode, 200, JSON.stringify(resposta.corpo));
    assert.equal(resposta.corpo.gravado, true);
    assert.equal(resposta.estado.ordens, 1);
    for (const modoInvalido of [null, 'automatic']) {
      await assert.rejects(db.query(`update public.relatorio_ordens_correcao
        set routing_mode = $1 where relatorio_id = $2`, [
        modoInvalido, resposta.corpo.relatorio.id,
      ]), /recusa_trimestral_somente_manual/);
    }
    await assert.rejects(db.query(`update public.relatorio_ordens_correcao
      set cliente_slug = 'cliente_forjado', routing_mode = 'automatic' where relatorio_id = $1`, [
      resposta.corpo.relatorio.id,
    ]), /relatorio_ordens_correcao_referencia_exata/);
  }

  const sufixoDistinto = await recusar({ slug: 'cliente__trimestral_extra' });
  assert.equal(sufixoDistinto.statusCode, 200, JSON.stringify(sufixoDistinto.corpo));
  console.log('OK — endpoint e SQL reais em memória: mensal sem consulta extra, trimestral manual, bloqueio automático e rollback integral.');
} finally {
  globalThis.fetch = fetchOriginal;
  process.env = ambienteOriginal;
  await db.close();
}
