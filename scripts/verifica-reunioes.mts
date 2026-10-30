import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { atenderPainelSessao } from '../api/painel-sessao.ts';

const db = new PGlite();
const equipeId = randomUUID(),
  fernandaId = randomUUID(),
  clienteId = randomUUID();
const usuarios = {
  equipe: { id: equipeId, email: 'equipe@example.com', nome: 'Equipe' },
  fernanda: { id: fernandaId, email: 'fernanda@example.com', nome: 'Fernanda' },
  cliente: { id: clienteId, email: 'cliente@example.com', nome: 'Cliente convidado' },
};
const ambienteAnterior = { ...process.env };
const fetchOriginal = globalThis.fetch;
Object.assign(process.env, {
  SUPABASE_URL: 'https://teste.invalid',
  SUPABASE_ANON_KEY: 'publica-teste',
  SUPABASE_SERVICE_ROLE_KEY: 'servidor-teste',
  PAINEL_EMAILS_AUTORIZADOS: 'equipe@example.com,fernanda@example.com',
});
const tabelas = [
  'portal_reunioes',
  'portal_reunioes_convites',
  'portal_reunioes_notas',
  'portal_reunioes_transcricoes',
];
function nome(n: string) {
  assert.match(n, /^[a-z_]+$/);
  return `"${n}"`;
}
let leituras = 0;
const buscar: typeof fetch = async (entrada, init) => {
  const url = new URL(String(entrada));
  const headers = new Headers(init?.headers);
  if (url.pathname === '/auth/v1/user') {
    const token = headers.get('Authorization')?.replace('Bearer ', '');
    const u = usuarios[token as keyof typeof usuarios];
    return u
      ? Response.json({
          id: u.id,
          email: u.email,
          app_metadata: { provider: 'google' },
          user_metadata: { full_name: u.nome },
        })
      : new Response('{}', { status: 401 });
  }
  assert.equal(headers.get('apikey'), 'servidor-teste');
  const tabela = url.pathname.split('/').pop()!;
  assert.ok(tabelas.includes(tabela));
  leituras++;
  const parametros: unknown[] = [];
  const parametro = (v: unknown) => {
    parametros.push(v);
    return `$${parametros.length}`;
  };
  const campos = (url.searchParams.get('select') || '*')
    .split(',')
    .map((c) => (c === '*' ? '*' : nome(c)))
    .join(',');
  const filtros: string[] = [];
  for (const [chave, valor] of url.searchParams) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(chave)) continue;
    if (valor.startsWith('eq.')) filtros.push(`${nome(chave)} = ${parametro(valor.slice(3))}`);
    else if (valor.startsWith('gt.')) filtros.push(`${nome(chave)} > ${parametro(valor.slice(3))}`);
    else if (valor.startsWith('in.('))
      filtros.push(
        `${nome(chave)} in (${valor
          .slice(4, -1)
          .split(',')
          .map((v) => parametro(v))
          .join(',')})`,
      );
    else throw new Error(`Filtro não suportado no teste: ${valor}`);
  }
  let sql: string;
  if (init?.method === 'POST') {
    const corpo = JSON.parse(String(init.body));
    const colunas = Object.keys(corpo);
    sql = `insert into ${nome(tabela)} (${colunas.map(nome).join(',')}) values (${colunas.map((c) => parametro(typeof corpo[c] === 'object' ? JSON.stringify(corpo[c]) : corpo[c])).join(',')})`;
    if (headers.get('Prefer')?.includes('resolution=merge-duplicates'))
      sql += ` on conflict (${url.searchParams.get('on_conflict')!.split(',').map(nome).join(',')}) do update set ${colunas
        .filter((c) => !['reuniao_id', 'email'].includes(c))
        .map((c) => `${nome(c)} = excluded.${nome(c)}`)
        .join(',')}`;
    if (headers.get('Prefer')?.includes('resolution=ignore-duplicates'))
      sql += ' on conflict do nothing';
    sql += ` returning ${campos}`;
  } else {
    sql = `select ${campos} from ${nome(tabela)}${filtros.length ? ` where ${filtros.join(' and ')}` : ''}`;
    if (url.searchParams.has('order'))
      sql += ` order by ${url.searchParams
        .get('order')!
        .split(',')
        .map((v) => {
          const [campo, direcao] = v.split('.');
          assert.ok(['asc', 'desc'].includes(direcao));
          return `${nome(campo)} ${direcao}`;
        })
        .join(',')}`;
    if (url.searchParams.has('limit'))
      sql += ` limit ${parametro(Number(url.searchParams.get('limit')))}`;
  }
  const resultado = await db.query(sql, parametros);
  return headers.get('Prefer')?.includes('return=minimal') && init?.method === 'POST'
    ? new Response(null, { status: 201 })
    : Response.json(resultado.rows);
};
async function chamar(
  token: string | null,
  acao: string,
  slug?: string,
  corpo?: unknown,
  metodo?: string,
) {
  let status = 200,
    dados: any;
  const cabecalhos: Record<string, string> = {};
  const req: any = {
    method: metodo ?? (corpo === undefined ? 'GET' : 'POST'),
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query: { modo: 'reunioes', acao, ...(slug ? { slug } : {}) },
    body: corpo,
  };
  const res: any = {
    setHeader(n: string, v: string) {
      cabecalhos[n] = v;
    },
    status(s: number) {
      status = s;
      return res;
    },
    json(c: unknown) {
      dados = c;
      return res;
    },
  };
  await atenderPainelSessao(req, res, {
    reunioes: { fetch: buscar, agora: () => new Date('2026-10-29T13:00:00Z') },
  });
  return { status, dados, cabecalhos };
}
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(
    await fs.readFile(
      new URL('../supabase/migrations/20261029131920_portal_reunioes.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(
    await fs.readFile(
      new URL('../supabase/migrations/20261030170000_portal_reunioes_transcricoes.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec('set role service_role;');
  assert.equal((await chamar(null, 'listar')).status, 401);
  assert.equal((await chamar('invalido', 'listar')).status, 401);
  assert.equal(leituras, 0, 'Não pode consultar dados sem validar a identidade.');
  assert.equal((await chamar('cliente', 'sessao')).status, 403);
  assert.equal((await chamar('cliente', 'listar', undefined, undefined, 'DELETE')).status, 405);
  const conteudo = {
    secoes: [{ id: 'inicio', titulo: 'Abertura', texto: 'Pauta compartilhada' }],
    duvidas: [],
  };
  const reuniao = {
    slug: 'teste-vetsell',
    titulo: 'Reunião de teste',
    cliente: 'Empresa de teste',
    data: '2026-10-29',
    compartilhado: conteudo,
    interno: {
      secoes: [{ id: 'interno', titulo: 'Negociação', texto: 'SEGREDO_NEGOCIACAO' }],
      duvidas: [{ pergunta: 'Objeção interna', resposta: 'ESTRATEGIA_PRIVADA' }],
    },
  };
  assert.equal((await chamar('cliente', 'criar', undefined, reuniao)).status, 403);
  assert.equal(
    (await chamar('equipe', 'criar', undefined, { ...reuniao, data: '2026-99-99' })).status,
    400,
  );
  assert.equal((await chamar('equipe', 'criar', undefined, reuniao)).status, 201);
  assert.equal(
    (await chamar('equipe', 'criar', undefined, { ...reuniao, slug: 'outra-reuniao' })).status,
    201,
  );
  assert.equal((await chamar('cliente', 'abrir', reuniao.slug)).status, 404);
  assert.equal(
    (
      await chamar('equipe', 'convidar', reuniao.slug, {
        email: 'cliente@example.com',
        ativo: true,
        expira_em: '2026-11-28T13:00:00Z',
      })
    ).status,
    200,
  );
  assert.equal((await chamar('cliente', 'sessao')).status, 200);
  globalThis.fetch = buscar;
  let statusPainel = 200;
  const respostaPainel: any = {
    setHeader() {},
    status(s: number) {
      statusPainel = s;
      return respostaPainel;
    },
    json() {
      return respostaPainel;
    },
  };
  await atenderPainelSessao(
    { method: 'GET', headers: { authorization: 'Bearer cliente' }, query: {} } as any,
    respostaPainel,
  );
  assert.equal(statusPainel, 403, 'Convite de reunião não autoriza o painel de relatórios.');
  globalThis.fetch = fetchOriginal;
  const lista = await chamar('cliente', 'listar');
  assert.equal(lista.dados.reunioes.length, 1);
  assert.equal(lista.dados.reunioes[0].slug, reuniao.slug);
  assert.ok(!JSON.stringify(lista.dados).includes('SEGREDO'));
  assert.equal((await chamar('cliente', 'abrir', 'outra-reuniao')).status, 404);
  const notaId = randomUUID();
  const nota = {
    id: notaId,
    secao: 'inicio',
    visibilidade: 'compartilhado',
    tipo: 'anotacao',
    texto: '<script>alert("teste")</script>',
    autor_id: equipeId,
    autor_nome: 'Fingindo ser equipe',
  };
  const resultados = await Promise.all([
    chamar('cliente', 'anotar', reuniao.slug, nota),
    chamar('fernanda', 'anotar', reuniao.slug, {
      ...nota,
      id: randomUUID(),
      texto: 'Outro registro simultâneo',
    }),
  ]);
  assert.deepEqual(
    resultados.map((r) => r.status),
    [201, 201],
  );
  assert.equal(
    (await chamar('cliente', 'anotar', reuniao.slug, nota)).status,
    201,
    'Repetir após falha de rede não duplica.',
  );
  assert.equal(
    (
      await chamar('cliente', 'anotar', reuniao.slug, {
        ...nota,
        texto: 'Troca indevida do mesmo registro',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await chamar('cliente', 'anotar', reuniao.slug, {
        ...nota,
        id: randomUUID(),
        visibilidade: 'interno',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await chamar('equipe', 'anotar', reuniao.slug, {
        ...nota,
        id: randomUUID(),
        visibilidade: 'interno',
        texto: 'NOTA_PRIVADA',
      })
    ).status,
    201,
  );
  const convidado = await chamar('cliente', 'abrir', reuniao.slug);
  assert.equal(convidado.dados.notas.length, 2);
  assert.equal(
    convidado.dados.notas.find((n: any) => n.id === notaId).autor_nome,
    'Cliente convidado',
    'O autor deve vir da sessão.',
  );
  assert.equal(convidado.dados.reuniao.interno, undefined);
  assert.equal(convidado.dados.tem_transcricao, undefined);
  assert.equal(
    (await chamar('cliente', 'transcricao', reuniao.slug)).status,
    403,
    'Convidado não recebe transcrição nem pedindo direto.',
  );
  const semTranscricao = await chamar('equipe', 'abrir', reuniao.slug);
  assert.equal(semTranscricao.dados.tem_transcricao, false);
  assert.equal((await chamar('equipe', 'transcricao', reuniao.slug)).dados.transcricao, null);
  await db.query(
    `insert into portal_reunioes_transcricoes (reuniao_id, texto, fonte_url, lida_em)
     values ($1, 'TRANSCRICAO_PRIVADA', 'https://docs.google.com/document/d/teste/edit', now())`,
    [semTranscricao.dados.reuniao.id],
  );
  const comTranscricao = await chamar('equipe', 'abrir', reuniao.slug);
  assert.equal(comTranscricao.dados.tem_transcricao, true);
  assert.ok(!JSON.stringify(comTranscricao.dados).includes('TRANSCRICAO_PRIVADA'), 'O texto longo não viaja na atualização periódica.');
  assert.equal((await chamar('equipe', 'transcricao', reuniao.slug)).dados.transcricao.texto, 'TRANSCRICAO_PRIVADA');
  assert.ok(!JSON.stringify((await chamar('cliente', 'abrir', reuniao.slug)).dados).includes('TRANSCRICAO_PRIVADA'));
  assert.equal((await chamar('cliente', 'transcricao', reuniao.slug)).status, 403);
  assert.equal(convidado.dados.convites, undefined);
  assert.ok(
    !/SEGREDO_NEGOCIACAO|ESTRATEGIA_PRIVADA|NOTA_PRIVADA|Fingindo ser equipe/.test(
      JSON.stringify(convidado.dados),
    ),
  );
  assert.match(convidado.cabecalhos['Cache-Control'], /no-store/);
  const equipe = await chamar('fernanda', 'abrir', reuniao.slug);
  assert.equal(equipe.dados.notas.length, 3);
  assert.equal(equipe.dados.reuniao.interno.secoes[0].texto, 'SEGREDO_NEGOCIACAO');
  assert.equal(
    (
      await chamar('cliente', 'convidar', reuniao.slug, {
        email: 'intruso@example.com',
        ativo: true,
        expira_em: '2026-11-28T13:00:00Z',
      })
    ).status,
    403,
  );
  await chamar('equipe', 'convidar', reuniao.slug, {
    email: 'cliente@example.com',
    ativo: false,
    expira_em: '2026-11-28T13:00:00Z',
  });
  assert.equal((await chamar('cliente', 'abrir', reuniao.slug)).status, 404);
  assert.equal(
    (await chamar('cliente', 'anotar', reuniao.slug, { ...nota, id: randomUUID() })).status,
    404,
  );
  await db.exec("update portal_reunioes_convites set ativo = true, expira_em = '2026-10-28';");
  assert.equal(
    (await chamar('cliente', 'sessao')).status,
    403,
    'Convite vencido não libera sessão.',
  );
  assert.equal((await chamar('cliente', 'abrir', reuniao.slug)).status, 404);
  await db.exec('reset role;');
  for (const role of ['anon', 'authenticated']) {
    for (const tabela of tabelas) {
      const privilegios = await db.query<{ pode: boolean }>(
        'select has_table_privilege($1,$2,$3) as pode',
        [role, tabela, 'SELECT,INSERT,UPDATE,DELETE'],
      );
      assert.equal(privilegios.rows[0].pode, false);
    }
  }
  // Mesmo uma concessão futura acidental continua bloqueada pelas políticas vazias.
  await db.exec('grant select on portal_reunioes to authenticated; set role authenticated;');
  assert.equal((await db.query('select * from portal_reunioes')).rows.length, 0);
  console.log(
    'reuniões: fluxo completo local com PostgreSQL, isolamento de convidados, autoria, concorrência, repetição, revogação, vencimento e bloqueio de acesso direto — ok',
  );
} finally {
  await db.close();
  globalThis.fetch = fetchOriginal;
  for (const chave of [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PAINEL_EMAILS_AUTORIZADOS',
  ]) {
    if (ambienteAnterior[chave] === undefined) delete process.env[chave];
    else process.env[chave] = ambienteAnterior[chave];
  }
}
