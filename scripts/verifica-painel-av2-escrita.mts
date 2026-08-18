/**
 * AV2 — a decisão humana passa a ser gravada TAMBÉM no modelo AV.
 *
 * A gravação legada continua acontecendo exatamente como antes: é ela que a
 * ponte da fábrica transporta, e é a única fonte de um relatório que nunca
 * passou pela coleta nova. O registro durável é um segundo efeito, e este
 * script trava as três coisas que importam nele:
 *
 *  • aplicar / editar / dispensar chamam a RPC com os parâmetros certos;
 *  • gerar / desfazer / reverter_dispensa NÃO chamam;
 *  • documento sem impressão digital factual não vira erro para o revisor.
 */
import assert from 'node:assert/strict';
import handlerSecao from '../api/painel-analises-secao.ts';
import handlerIntroducao from '../api/painel-analise-introducao.ts';
import { secoesEditoriaisObrigatorias } from '../api/_painel-estado-editorial.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const ID = '44444444-4444-4444-8444-444444444444';
const SUGESTAO_ID = '55555555-5555-4555-8555-555555555555';
const CHECKSUM = 'abc123def456abc123def456abc123de';
const FACTUAL = '0123456789abcdef0123456789abcdef';
const EMAIL = 'pessoa.autorizada@exemplo.com';
const TEXTO = 'O investimento subiu e o custo por resultado caiu no período medido.';

const SECAO = secoesEditoriaisObrigatorias(karyneMontada202607)[1].secao;
assert.ok(SECAO.startsWith('bloco:'), 'o teste precisa de uma seção de bloco real do relatório');

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = EMAIL;

const usuario = {
  id: 'usuario-exemplo',
  email: EMAIL,
  app_metadata: { provider: 'google', providers: ['google'] },
};

let checksumFactualDoBanco: string | null = FACTUAL;
/** Quando ligado, a RPC do modelo AV recusa como o Postgres recusaria. */
let recusaDaRevisaoViva: { status: number; mensagem: string } | null = null;
let chamadas: Array<{ url: string; corpo: any }> = [];

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
  const url = String(entrada);
  const corpo = init?.body ? JSON.parse(String(init.body)) : null;
  if (url.includes('/auth/v1/user')) {
    return new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  chamadas.push({ url, corpo });
  if (url.includes('/rest/v1/relatorios?')) {
    return new Response(JSON.stringify([{
      id: ID,
      cliente_slug: 'cliente_exemplo',
      competencia: '2026-07',
      versao: 3,
      estado: 'gerado',
      checksum: CHECKSUM,
      checksum_factual_editorial: checksumFactualDoBanco,
      substituido_por: null,
      revogado_em: null,
      conteudo: karyneMontada202607,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_contextos_mes?')) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/registrar_sugestoes_analise_secoes')) {
    return new Response(JSON.stringify([{
      sugestao_id: SUGESTAO_ID,
      secao: corpo?.p_secao,
      estado: corpo?.p_acao === 'editar' ? 'editada' : corpo?.p_acao === 'desfazer' ? 'desfeita' : 'aplicada',
      texto_atual: corpo?.p_texto_editado ?? TEXTO,
      relatorio_checksum: CHECKSUM,
      modelo: null,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/registrar_sugestao_analise_introducao')) {
    return new Response(JSON.stringify([{
      sugestao_id: SUGESTAO_ID,
      estado: corpo?.p_acao === 'editar' ? 'editada' : corpo?.p_acao === 'desfazer' ? 'desfeita' : 'aplicada',
      texto_atual: corpo?.p_texto_editado ?? TEXTO,
      relatorio_checksum: CHECKSUM,
      modelo: null,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/registrar_dispensa_secao')) {
    return new Response(JSON.stringify([{
      secao_decidida: corpo?.p_secao,
      dispensa_ativa: corpo?.p_dispensar === true,
      decidida_por: EMAIL,
      decidida_em: '2026-08-18T12:00:00Z',
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/salvar_contexto_mes_relatorio')) {
    return new Response(JSON.stringify([{
      contexto: corpo?.p_contexto ?? '',
      atualizado_por: EMAIL,
      atualizado_em: '2026-08-18T12:30:00Z',
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/salvar_contexto_editorial_relatorio')) {
    if (recusaDaRevisaoViva) {
      return new Response(
        JSON.stringify({ message: recusaDaRevisaoViva.mensagem, code: 'P0001' }),
        { status: recusaDaRevisaoViva.status, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify([{
      contexto_salvo: corpo?.p_contexto ?? '',
      atualizado_por_saida: EMAIL,
      atualizado_em_saida: '2026-08-18T12:30:00Z',
      checksum_factual_referencia_saida: FACTUAL,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/registrar_revisao_editorial_atual')) {
    if (recusaDaRevisaoViva) {
      return new Response(
        JSON.stringify({ message: recusaDaRevisaoViva.mensagem, code: 'P0001' }),
        { status: recusaDaRevisaoViva.status, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify([{
      revisao_id: '66666666-6666-4666-8666-666666666666',
      estado_editorial: 'atual',
      checksum_factual_referencia: FACTUAL,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`URL não dublada: ${url}`);
}) as typeof fetch;

async function chamar(handler: any, corpo: unknown) {
  chamadas = [];
  const capturado: any = { status: 0, corpo: null };
  const req: any = { method: 'POST', headers: { authorization: 'Bearer token-de-teste' }, body: corpo };
  const res: any = {
    setHeader() { return res; },
    status(status: number) { capturado.status = status; return res; },
    json(saida: any) { capturado.corpo = saida; return res; },
  };
  await handler(req, res);
  return capturado;
}

function revisaoViva() {
  return chamadas.find((item) => item.url.includes('/rpc/registrar_revisao_editorial_atual'))?.corpo ?? null;
}

function contextoVivo() {
  return chamadas.find((item) => item.url.includes('/rpc/salvar_contexto_editorial_relatorio'))?.corpo ?? null;
}

/* ---------------------------------------------------------------- */
/* 1. Aplicar uma análise de seção grava revisão durável             */
/* ---------------------------------------------------------------- */
{
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', secao: SECAO, sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
  const rpc = revisaoViva();
  assert.ok(rpc, 'aplicar precisa registrar a revisão durável');
  assert.equal(rpc.p_relatorio_id, ID);
  assert.equal(rpc.p_checksum_documento_visto, CHECKSUM);
  assert.equal(rpc.p_checksum_factual_visto, FACTUAL);
  assert.equal(rpc.p_secao, SECAO);
  assert.equal(rpc.p_tipo_decisao, 'analise');
  assert.equal(rpc.p_texto, TEXTO, 'o texto registrado é o que a RPC legada devolveu, não o que a tela mandou');
  assert.equal(rpc.p_por, EMAIL, 'o autor vem da sessão, nunca do navegador');
  assert.equal(rpc.p_origem_sugestao_id, SUGESTAO_ID);
}

/* ---------------------------------------------------------------- */
/* 2. Editar grava o texto editado                                   */
/* ---------------------------------------------------------------- */
{
  const editado = 'Texto reescrito pela pessoa que revisou.';
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'editar', secao: SECAO, sugestaoId: SUGESTAO_ID, texto: editado });
  assert.equal(saida.status, 200);
  const rpc = revisaoViva();
  assert.equal(rpc?.p_tipo_decisao, 'analise');
  assert.equal(rpc?.p_texto, editado);
}

/* ---------------------------------------------------------------- */
/* 3. Dispensar grava "revisada sem análise", sem texto              */
/* ---------------------------------------------------------------- */
{
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'dispensar', secao: SECAO });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.dispensa.ativa, true);
  const rpc = revisaoViva();
  assert.equal(rpc?.p_tipo_decisao, 'sem_analise');
  assert.equal(rpc?.p_texto, null, 'decisão de não publicar texto não pode carregar texto');
  assert.equal(rpc?.p_secao, SECAO);
}

/* A introdução é seção obrigatória e usa o mesmo caminho. */
{
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'dispensar', secao: 'introducao' });
  assert.equal(saida.status, 200);
  assert.equal(revisaoViva()?.p_secao, 'introducao');
}

/* ---------------------------------------------------------------- */
/* 4. Contexto do mês também ganha identidade lógica durável          */
/* ---------------------------------------------------------------- */
{
  const contexto = 'Houve mudança de página no meio do período.';
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'salvar_contexto', contexto });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.contexto.texto, contexto);
  const rpc = contextoVivo();
  assert.ok(rpc, 'salvar contexto precisa escrever também no modelo AV');
  assert.equal(rpc.p_relatorio_id, ID);
  assert.equal(rpc.p_checksum_documento_visto, CHECKSUM);
  assert.equal(rpc.p_checksum_factual_visto, FACTUAL);
  assert.equal(rpc.p_contexto, contexto);
  assert.equal(rpc.p_por, EMAIL);
}

/* ---------------------------------------------------------------- */
/* 5. Desfazer e reverter_dispensa NÃO gravam no modelo AV           */
/* ---------------------------------------------------------------- */
{
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'desfazer', secao: SECAO, sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
  assert.equal(
    revisaoViva(),
    null,
    'desfazer não tem estado anterior para restaurar no modelo AV — inventar um seria pior que não gravar',
  );
}
{
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'reverter_dispensa', secao: SECAO });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.dispensa.ativa, false);
  assert.equal(revisaoViva(), null, 'reverter dispensa não é decisão nova no modelo AV');
}

/* ---------------------------------------------------------------- */
/* 6. Introdução: aplicar grava; desfazer não                        */
/* ---------------------------------------------------------------- */
{
  const saida = await chamar(handlerIntroducao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
  const rpc = revisaoViva();
  assert.equal(rpc?.p_secao, 'introducao');
  assert.equal(rpc?.p_tipo_decisao, 'analise');
  assert.equal(rpc?.p_texto, TEXTO);
  assert.equal(rpc?.p_por, EMAIL);
}
{
  const saida = await chamar(handlerIntroducao, { id: ID, checksum: CHECKSUM, acao: 'desfazer', sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
  assert.equal(revisaoViva(), null);
}

/* ---------------------------------------------------------------- */
/* 7. Documento sem impressão digital: nem tenta, e nada quebra      */
/* ---------------------------------------------------------------- */
{
  checksumFactualDoBanco = null;
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', secao: SECAO, sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200, 'relatório legado não pode falhar por causa do registro durável');
  assert.equal(saida.corpo.sugestao.estado, 'aplicada', 'a gravação legada continua sendo a resposta ao revisor');
  assert.equal(
    revisaoViva(),
    null,
    'sem impressão digital a RPC recusaria — não perguntar sabendo a resposta',
  );
  checksumFactualDoBanco = FACTUAL;
}

/* ---------------------------------------------------------------- */
/* 8. Recusa da RPC durável é absorvida: o revisor não repete uma    */
/*    ação que já teve efeito no registro legado                     */
/* ---------------------------------------------------------------- */
{
  recusaDaRevisaoViva = { status: 400, mensagem: 'checksum_factual_indisponivel' };
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', secao: SECAO, sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.sugestao.estado, 'aplicada');
  assert.ok(revisaoViva(), 'a tentativa aconteceu');
}
{
  recusaDaRevisaoViva = { status: 500, mensagem: 'erro_desconhecido_do_banco' };
  const saida = await chamar(handlerSecao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', secao: SECAO, sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200, 'falha do registro durável não pode virar erro para quem revisou');
  assert.equal(saida.corpo.sugestao.estado, 'aplicada');
}
{
  recusaDaRevisaoViva = null;
  const saida = await chamar(handlerIntroducao, { id: ID, checksum: CHECKSUM, acao: 'aplicar', sugestaoId: SUGESTAO_ID });
  assert.equal(saida.status, 200);
}

globalThis.fetch = fetchOriginal;

console.log('verifica-painel-av2-escrita: ok');
