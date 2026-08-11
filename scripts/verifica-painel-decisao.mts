/**
 * Regressão da P3 — aprovar e recusar.
 *
 * O que ela prova, em quatro blocos:
 *
 *  1. **quem não passa na porta não escreve nada** — sem sessão, com e-mail
 *     fora da lista, por outro provedor ou por método errado, o banco não é
 *     tocado nenhuma vez;
 *  2. **o checksum é carimbado a partir da COLUNA**, nunca recalculado do
 *     `conteudo` — e a divergência entre a tela e o banco vira recusa em
 *     português, com `gravado: false`;
 *  3. **motivo obrigatório na recusa**, aparado e com piso, recusado antes de
 *     qualquer chamada;
 *  4. **nada é dado por gravado sem read-back**: se a leitura de volta não
 *     bater coluna a coluna, a resposta é falha, não sucesso.
 *
 * E, no fim, que o estado `recusado` aparece na fila e na visão geral — porque
 * um estado que existe numa tela e some na outra é pior que estado nenhum.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import handler from '../api/painel-decisao.ts';
import {
  conferirLeituraDeVolta,
  ecoDaDecisao,
  lerPedido,
  traduzirRecusaDoBanco,
  MINIMO_DO_MOTIVO,
  MAXIMO_DO_MOTIVO,
} from '../api/_painel-decisao-regras.ts';
import { montarFila, montarItem, ordenarPorAtencao } from '../api/_painel-fila-dados.ts';
import { montarVisaoGeral } from '../api/_painel-visao-geral-dados.ts';
import { montarRelatorioParaRevisao } from '../api/painel-relatorio.ts';
import { FilaApresentada } from '../src/painel/Fila.tsx';
import { RevisaoMoldura } from '../src/painel/RevisaoMoldura.tsx';
import DecisaoDaRevisao, {
  ecoDaDecisao as ecoDaTela,
  textoDaNotificacaoInterna,
  textoDoJaDecidido,
} from '../src/painel/DecisaoDaRevisao.tsx';

const ID = '22222222-2222-4222-8222-222222222222';
const CHECKSUM = 'abc123def456abc123def456abc123de';
const MOTIVO = 'O investimento do Google não bateu com a planilha; conferir antes de mandar.';

{
  const inicio = readFileSync(new URL('../src/painel/PainelInicio.tsx', import.meta.url), 'utf8');
  assert.ok(
    !inicio.includes("chave: 'P4'"),
    'uma fase publicada não pode continuar listada como algo que ainda não existe',
  );
  assert.ok(inicio.includes("chave: 'P5'"), 'o próximo gate real precisa continuar explícito');
}

/* ------------------------------------------------------------------ */
/* 1. A leitura do pedido — tudo que morre antes do banco               */
/* ------------------------------------------------------------------ */

{
  const bom = lerPedido({ id: ID, decisao: 'aprovar', checksum: CHECKSUM });
  assert.equal(bom.ok, true);
  assert.equal(bom.ok && bom.pedido.motivo, '', 'aprovação não carrega motivo');

  const recusa = lerPedido({ id: ID, decisao: 'recusar', checksum: CHECKSUM, motivo: `  ${MOTIVO}  ` });
  assert.equal(recusa.ok, true);
  assert.equal(recusa.ok && recusa.pedido.motivo, MOTIVO, 'o motivo é aparado antes de gravar');

  for (const [entrada, erroEsperado] of [
    [null, 'pedido_invalido'],
    [{ decisao: 'aprovar', checksum: CHECKSUM }, 'relatorio_invalido'],
    [{ id: 'nao-e-uuid', decisao: 'aprovar', checksum: CHECKSUM }, 'relatorio_invalido'],
    [{ id: ID, decisao: 'apagar', checksum: CHECKSUM }, 'decisao_desconhecida'],
    [{ id: ID, decisao: 'aprovar' }, 'checksum_ausente'],
    [{ id: ID, decisao: 'aprovar', checksum: '   ' }, 'checksum_ausente'],
    [{ id: ID, decisao: 'recusar', checksum: CHECKSUM }, 'motivo_obrigatorio'],
    [{ id: ID, decisao: 'recusar', checksum: CHECKSUM, motivo: '   ok   ' }, 'motivo_obrigatorio'],
    [
      { id: ID, decisao: 'recusar', checksum: CHECKSUM, motivo: 'x'.repeat(MAXIMO_DO_MOTIVO + 1) },
      'motivo_longo',
    ],
    [{ id: ID, decisao: 'aprovar', checksum: CHECKSUM, motivo: MOTIVO }, 'motivo_nao_se_aplica'],
  ] as Array<[unknown, string]>) {
    const saida = lerPedido(entrada);
    assert.equal(saida.ok, false, `deveria recusar: ${JSON.stringify(entrada)}`);
    assert.equal(saida.ok === false && saida.erro, erroEsperado);
    assert.ok(
      saida.ok === false && saida.mensagem.length > 20,
      'toda recusa precisa dizer, em português, o que fazer',
    );
  }

  // O piso do motivo é o mesmo aqui e no banco. Se um dia divergirem, quem
  // manda é o banco — mas divergir em silêncio é o que este teste impede.
  const noLimite = lerPedido({
    id: ID,
    decisao: 'recusar',
    checksum: CHECKSUM,
    motivo: 'x'.repeat(MINIMO_DO_MOTIVO),
  });
  assert.equal(noLimite.ok, true);

  // Quem decidiu NUNCA vem do navegador.
  const comIdentidadeForjada: any = lerPedido({
    id: ID,
    decisao: 'aprovar',
    checksum: CHECKSUM,
    quem: 'invasor@exemplo.com',
    aprovadoPor: 'invasor@exemplo.com',
  });
  assert.equal(comIdentidadeForjada.ok, true);
  assert.equal(
    JSON.stringify(comIdentidadeForjada.pedido).includes('invasor'),
    false,
    'identidade enviada pelo navegador não pode entrar no pedido',
  );
}

/* ------------------------------------------------------------------ */
/* 2. A tradução da recusa do banco                                    */
/* ------------------------------------------------------------------ */

{
  const divergente = traduzirRecusaDoBanco(
    '{"code":"P0001","message":"checksum_divergente","details":null}',
  );
  assert.equal(divergente.erro, 'checksum_divergente');
  assert.equal(divergente.status, 409);
  assert.match(divergente.mensagem, /mudou desde que você o abriu/);
  assert.ok(!/P0001/.test(divergente.mensagem), 'a tela não mostra código do Postgres');

  assert.equal(traduzirRecusaDoBanco('ja_decidido_liberado').status, 409);
  assert.equal(traduzirRecusaDoBanco('versao_fora_de_circulacao').status, 409);

  const desconhecido = traduzirRecusaDoBanco('violates check constraint "algo_novo"');
  assert.equal(desconhecido.erro, 'decisao_recusada_pelo_banco');
  assert.equal(desconhecido.status, 502);
  assert.match(desconhecido.mensagem, /nada foi gravado/i);
}

/* ------------------------------------------------------------------ */
/* 3. O read-back — coluna com coluna, nunca recalculando o conteúdo    */
/* ------------------------------------------------------------------ */

{
  const pedidoAprovar = { id: ID, decisao: 'aprovar' as const, checksumVisto: CHECKSUM, motivo: '' };
  const quem = 'pessoa.autorizada@exemplo.com';

  const aprovada = {
    estado: 'liberado',
    checksum: CHECKSUM,
    aprovado_por: quem,
    aprovado_em: '2026-08-11T12:00:00Z',
    aprovado_checksum: CHECKSUM,
    recusado_por: null,
    recusado_em: null,
    recusa_motivo: null,
  };
  assert.equal(conferirLeituraDeVolta(aprovada, pedidoAprovar, quem).ok, true);

  for (const [quebrada, pedaco] of [
    [{ ...aprovada, estado: 'gerado' }, /não ficou liberado/],
    [{ ...aprovada, aprovado_por: 'outra@exemplo.com' }, /não é quem decidiu/],
    [{ ...aprovada, aprovado_em: null }, /data da aprovação/],
    [{ ...aprovada, aprovado_checksum: 'outro-checksum' }, /não ficou amarrado/],
    [{ ...aprovada, checksum: 'mudou-no-banco' }, /não é o que estava na tela/],
  ] as Array<[any, RegExp]>) {
    const saida = conferirLeituraDeVolta(quebrada, pedidoAprovar, quem);
    assert.equal(saida.ok, false);
    assert.match(saida.ok === false ? saida.motivo : '', pedaco);
  }
  assert.equal(conferirLeituraDeVolta(null, pedidoAprovar, quem).ok, false);

  const pedidoRecusar = { id: ID, decisao: 'recusar' as const, checksumVisto: CHECKSUM, motivo: MOTIVO };
  const recusada = {
    estado: 'recusado',
    checksum: CHECKSUM,
    aprovado_por: null,
    aprovado_em: null,
    aprovado_checksum: null,
    recusado_por: quem,
    recusado_em: '2026-08-11T12:00:00Z',
    recusa_motivo: MOTIVO,
    correcao_ordem_id: 'ordem-1',
    correcao_estado: 'aguardando_nova_versao' as const,
    correcao_solicitado_em: '2026-08-11T12:00:00Z',
    notificacao_interna_id: 'notificacao-1',
    notificacao_interna_estado: 'pendente' as const,
    notificacao_destino_referencia: 'dacora_semanais.recipients',
  };
  assert.equal(conferirLeituraDeVolta(recusada, pedidoRecusar, quem).ok, true);
  assert.equal(
    conferirLeituraDeVolta({ ...recusada, recusa_motivo: 'outro texto' }, pedidoRecusar, quem).ok,
    false,
  );
  for (const quebrada of [
    { ...recusada, correcao_ordem_id: null },
    { ...recusada, correcao_estado: 'nova_versao_gerada' as const },
    { ...recusada, notificacao_interna_id: null },
    { ...recusada, notificacao_destino_referencia: 'id-inventado' },
  ]) {
    assert.equal(conferirLeituraDeVolta(quebrada, pedidoRecusar, quem).ok, false);
  }
  assert.equal(
    conferirLeituraDeVolta(
      { ...recusada, aprovado_checksum: CHECKSUM, aprovado_em: '2026-08-11T12:00:00Z' },
      pedidoRecusar,
      quem,
    ).ok,
    false,
    'uma linha recusada não pode carregar carimbo de aprovação',
  );
}

/* ------------------------------------------------------------------ */
/* 4. O endpoint inteiro, com o Supabase dublado                       */
/* ------------------------------------------------------------------ */

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'chave-publica-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-servico-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'pessoa.autorizada@exemplo.com, outra.autorizada@exemplo.com';

const autorizada = {
  id: 'usuario-exemplo',
  email: 'pessoa.autorizada@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Pessoa Exemplo' },
};
const segundaAutorizada = {
  id: 'usuario-dois',
  email: 'outra.autorizada@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Outra Pessoa' },
};
const foraDaLista = {
  id: 'usuario-tres',
  email: 'terceiro@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
};
const semGoogle = {
  id: 'usuario-quatro',
  email: 'pessoa.autorizada@exemplo.com',
  app_metadata: { provider: 'email', providers: ['email'] },
};

const fetchOriginal = globalThis.fetch;

interface Cenario {
  /** Erro que a função do banco devolve, se houver. */
  erroDoBanco?: string;
  /** A linha que a leitura de volta encontra. */
  linhaLida?: any;
  /** `ja_estava_assim` do retorno da função. */
  repetida?: boolean;
}

let chamadasAoBanco: Array<{ url: string; corpo: any }> = [];

function dublar(usuario: unknown | null, cenario: Cenario = {}) {
  chamadasAoBanco = [];
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) {
      return usuario
        ? new Response(JSON.stringify(usuario), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response('{}', { status: 401 });
    }

    const corpo = init?.body ? JSON.parse(String(init.body)) : null;
    chamadasAoBanco.push({ url, corpo });

    if (url.includes('/rpc/decidir_relatorio')) {
      if (cenario.erroDoBanco) {
        return new Response(
          JSON.stringify({ code: 'P0001', message: cenario.erroDoBanco }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify([{ relatorio_id: ID, ja_estava_assim: cenario.repetida ?? false }]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(cenario.linhaLida ? [cenario.linhaLida] : []), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

async function chamar({
  usuario,
  corpo,
  metodo = 'POST',
  cenario = {},
}: {
  usuario: unknown | null;
  corpo?: unknown;
  metodo?: string;
  cenario?: Cenario;
}) {
  dublar(usuario, cenario);
  const capturado: any = { status: 0, corpo: null, cabecalhos: {} };
  const req: any = {
    method: metodo,
    headers: { authorization: usuario ? 'Bearer token-de-teste' : undefined },
    body: corpo,
  };
  const res: any = {
    setHeader(nome: string, valor: string) {
      capturado.cabecalhos[nome.toLowerCase()] = valor;
      return res;
    },
    status(status: number) {
      capturado.status = status;
      return res;
    },
    json(saida: any) {
      capturado.corpo = saida;
      return res;
    },
  };
  await handler(req, res);
  return capturado;
}

function linhaGravada(quem: string, extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    cliente_slug: 'cliente_exemplo',
    competencia: '2026-07',
    versao: 3,
    estado: 'liberado',
    checksum: CHECKSUM,
    aprovado_por: quem,
    aprovado_em: '2026-08-11T12:00:00Z',
    aprovado_checksum: CHECKSUM,
    recusado_por: null,
    recusado_em: null,
    recusa_motivo: null,
    enviado_em: null,
    substituido_por: null,
    revogado_em: null,
    ...extra,
  };
}

const pedidoAprovar = { id: ID, decisao: 'aprovar', checksum: CHECKSUM };

/* --- A porta ---------------------------------------------------------- */
{
  const semSessao = await chamar({ usuario: null, corpo: pedidoAprovar });
  assert.equal(semSessao.status, 401);
  assert.equal(chamadasAoBanco.length, 0, 'sem sessão não pode escrever nem ler');

  const naoAutorizada = await chamar({ usuario: foraDaLista, corpo: pedidoAprovar });
  assert.equal(naoAutorizada.status, 403);
  assert.equal(chamadasAoBanco.length, 0, 'e-mail fora da lista não chega ao banco');
  assert.equal(naoAutorizada.corpo.email, 'terceiro@exemplo.com', 'a tela precisa dizer quem tentou');

  const outroProvedor = await chamar({ usuario: semGoogle, corpo: pedidoAprovar });
  assert.equal(outroProvedor.status, 403);
  assert.equal(chamadasAoBanco.length, 0);

  const metodoErrado = await chamar({ usuario: autorizada, corpo: pedidoAprovar, metodo: 'GET' });
  assert.equal(metodoErrado.status, 405);
  assert.equal(chamadasAoBanco.length, 0, 'método errado não pode nem conferir sessão contra o banco');
}

/* --- Pedido torto morre antes do banco -------------------------------- */
for (const corpoTorto of [
  { id: ID, decisao: 'recusar', checksum: CHECKSUM },
  { id: ID, decisao: 'recusar', checksum: CHECKSUM, motivo: 'curto' },
  { id: 'nao-e-uuid', decisao: 'aprovar', checksum: CHECKSUM },
  { id: ID, decisao: 'aprovar' },
  { id: ID, decisao: 'excluir', checksum: CHECKSUM },
]) {
  const saida = await chamar({ usuario: autorizada, corpo: corpoTorto });
  assert.equal(saida.status, 400, `deveria recusar ${JSON.stringify(corpoTorto)}`);
  assert.equal(
    chamadasAoBanco.filter((c) => c.url.includes('relatorios')).length,
    0,
    'pedido inválido não pode tocar a tabela',
  );
}

/* --- Aprovação: o caminho feliz --------------------------------------- */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: { ...pedidoAprovar, quem: 'invasor@exemplo.com' },
    cenario: { linhaLida: linhaGravada('pessoa.autorizada@exemplo.com') },
  });

  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.gravado, true);
  assert.equal(saida.corpo.jaEstavaAssim, false);
  assert.match(saida.cabecalhos['cache-control'], /no-store/);

  const rpc = chamadasAoBanco.find((c) => c.url.includes('/rpc/decidir_relatorio'));
  assert.ok(rpc, 'a decisão precisa passar pela função do banco');
  assert.equal(rpc.corpo.p_quem, 'pessoa.autorizada@exemplo.com', 'quem decidiu vem da SESSÃO');
  assert.notEqual(rpc.corpo.p_quem, 'invasor@exemplo.com');
  assert.equal(rpc.corpo.p_checksum_visto, CHECKSUM, 'o checksum da tela viaja como guarda');
  assert.equal(rpc.corpo.p_motivo, null, 'aprovação não leva motivo ao banco');

  // O endpoint faz UMA escrita e UMA leitura de volta. Nunca um UPDATE solto:
  // a única chamada com corpo é a função do banco, e a tabela só é tocada por
  // um `select` depois.
  const escritas = chamadasAoBanco.filter((c) => c.corpo);
  assert.equal(escritas.length, 1, 'a escrita acontece numa chamada só, dentro da transação');
  assert.ok(escritas[0].url.includes('/rpc/decidir_relatorio'));
  const leituras = chamadasAoBanco.filter((c) => !c.corpo);
  assert.equal(leituras.length, 1, 'uma leitura de volta, e só');
  assert.ok(
    leituras[0].url.includes('/rest/v1/painel_relatorios_com_correcao?id=eq.') &&
      !leituras[0].url.includes('token'),
    'o read-back lê a linha por id, sem pedir a credencial pública',
  );

  assert.equal(saida.corpo.relatorio.estado, 'liberado');
  assert.equal(saida.corpo.relatorio.checksum, CHECKSUM);
  assert.ok(!JSON.stringify(saida.corpo).includes('token'), 'a resposta não carrega credencial');
  assert.match(saida.corpo.eco, /Aprovar: cliente_exemplo · 2026-07 · versão 3/);
}

/* --- Duas pessoas diferentes gravam aprovadores diferentes ------------ */
{
  const primeira = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: { linhaLida: linhaGravada('pessoa.autorizada@exemplo.com') },
  });
  const primeiroQuem = chamadasAoBanco.find((c) => c.url.includes('/rpc/'))!.corpo.p_quem;

  const segunda = await chamar({
    usuario: segundaAutorizada,
    corpo: pedidoAprovar,
    cenario: { linhaLida: linhaGravada('outra.autorizada@exemplo.com') },
  });
  const segundoQuem = chamadasAoBanco.find((c) => c.url.includes('/rpc/'))!.corpo.p_quem;

  assert.equal(primeira.corpo.gravado, true);
  assert.equal(segunda.corpo.gravado, true);
  assert.notEqual(primeiroQuem, segundoQuem, 'sessões diferentes gravam aprovadores diferentes');
  assert.equal(segunda.corpo.relatorio.aprovadoPor, 'outra.autorizada@exemplo.com');
}

/* --- O documento mudou desde o GO ------------------------------------- */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: { erroDoBanco: 'checksum_divergente' },
  });
  assert.equal(saida.status, 409);
  assert.equal(saida.corpo.gravado, false);
  assert.match(saida.corpo.mensagem, /mudou desde que você o abriu/);
  assert.equal(
    chamadasAoBanco.filter((c) => c.url.includes('select=')).length,
    0,
    'decisão recusada não lê a linha de volta — não há o que conferir',
  );
}

/* --- Já decidido ------------------------------------------------------ */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: { erroDoBanco: 'ja_decidido_liberado' },
  });
  assert.equal(saida.status, 409);
  assert.equal(saida.corpo.gravado, false);
  assert.match(saida.corpo.mensagem, /já foi aprovado/);
}

/* --- Repetir a mesma decisão não duplica nem quebra -------------------- */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: { repetida: true, linhaLida: linhaGravada('pessoa.autorizada@exemplo.com') },
  });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.gravado, true);
  assert.equal(saida.corpo.jaEstavaAssim, true);
}

/* --- Read-back que não bate NÃO vira sucesso -------------------------- */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: {
      linhaLida: linhaGravada('pessoa.autorizada@exemplo.com', { aprovado_checksum: 'outro' }),
    },
  });
  assert.equal(saida.status, 502);
  assert.equal(saida.corpo.gravado, false);
  assert.equal(saida.corpo.erro, 'read_back_reprovado');
  assert.match(saida.corpo.mensagem, /nada aqui deve ser tratado como registrado/);
}
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: pedidoAprovar,
    cenario: { linhaLida: undefined },
  });
  assert.equal(saida.status, 502);
  assert.equal(saida.corpo.gravado, false);
}

/* --- Recusa com motivo ------------------------------------------------ */
{
  const saida = await chamar({
    usuario: autorizada,
    corpo: { id: ID, decisao: 'recusar', checksum: CHECKSUM, motivo: `  ${MOTIVO}  ` },
    cenario: {
      linhaLida: linhaGravada('pessoa.autorizada@exemplo.com', {
        estado: 'recusado',
        aprovado_por: null,
        aprovado_em: null,
        aprovado_checksum: null,
        recusado_por: 'pessoa.autorizada@exemplo.com',
        recusado_em: '2026-08-11T13:00:00Z',
        recusa_motivo: MOTIVO,
        correcao_ordem_id: 'ordem-1',
        correcao_estado: 'aguardando_nova_versao',
        correcao_solicitado_em: '2026-08-11T13:00:00Z',
        notificacao_interna_id: 'notificacao-1',
        notificacao_interna_estado: 'pendente',
        notificacao_destino_referencia: 'dacora_semanais.recipients',
      }),
    },
  });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.gravado, true);
  assert.equal(saida.corpo.relatorio.estado, 'recusado');
  assert.equal(saida.corpo.relatorio.recusaMotivo, MOTIVO);

  const rpc = chamadasAoBanco.find((c) => c.url.includes('/rpc/'))!;
  assert.equal(rpc.corpo.p_decisao, 'recusar');
  assert.equal(rpc.corpo.p_motivo, MOTIVO, 'o motivo chega aparado ao banco');
}

/* --- Sem chave de serviço, falha alto — nunca cai para a chave pública -- */
{
  const guardada = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const saida = await chamar({ usuario: autorizada, corpo: pedidoAprovar });
  assert.equal(saida.status, 500);
  assert.equal(saida.corpo.erro, 'sem_chave_de_servico');
  assert.equal(chamadasAoBanco.length, 0);
  process.env.SUPABASE_SERVICE_ROLE_KEY = guardada;
}

globalThis.fetch = fetchOriginal;

/* ------------------------------------------------------------------ */
/* 5. O eco — o texto sobre o qual o humano confirma                    */
/* ------------------------------------------------------------------ */

{
  const doServidor = ecoDaDecisao({
    decisao: 'recusar',
    clienteNome: 'Cliente Exemplo',
    competencia: '2026-07',
    versao: 3,
    checksum: CHECKSUM,
    quem: 'pessoa.autorizada@exemplo.com',
    motivo: MOTIVO,
  });
  assert.match(doServidor, /Recusar: Cliente Exemplo · 2026-07 · versão 3/);
  assert.ok(doServidor.includes(MOTIVO), 'o eco da recusa repete o motivo inteiro');
  assert.ok(doServidor.includes(CHECKSUM.slice(0, 12)), 'a impressão digital aparece no eco');

  const relatorio = {
    clienteNome: 'Cliente Exemplo',
    competencia: '2026-07',
    versao: 3,
    checksum: CHECKSUM,
    estado: 'gerado',
    podeDecidir: true,
    aprovadoPor: null,
    aprovadoEm: null,
    recusadoPor: null,
    recusadoEm: null,
    recusaMotivo: null,
  };

  const daTela = ecoDaTela(relatorio, 'aprovar', 'pessoa.autorizada@exemplo.com', '');
  assert.match(daTela, /Nada foi gravado ainda/, 'o eco precisa dizer que ainda não gravou');
  assert.match(daTela, /julho de 2026/, 'a competência aparece por extenso para quem lê');
  assert.ok(daTela.includes(CHECKSUM.slice(0, 12)));

  assert.equal(textoDoJaDecidido(relatorio), null, 'gerado não tem decisão a relatar');
  const jaAprovado = textoDoJaDecidido({
    ...relatorio,
    estado: 'liberado',
    podeDecidir: false,
    aprovadoPor: 'fernanda@exemplo.com',
    aprovadoEm: '2026-08-11T12:00:00Z',
  });
  assert.match(String(jaAprovado), /Aprovado por fernanda@exemplo\.com em 11\/08/);
  const jaRecusado = textoDoJaDecidido({
    ...relatorio,
    estado: 'recusado',
    podeDecidir: false,
    recusadoPor: 'fernanda@exemplo.com',
    recusadoEm: '2026-08-11T13:00:00Z',
    recusaMotivo: MOTIVO,
  });
  assert.ok(String(jaRecusado).includes(MOTIVO), 'o motivo precisa sobreviver para quem regerar');
  assert.match(String(jaRecusado), /versão nova na fábrica/);

  const jaRecusadoComOrdem = textoDoJaDecidido({
    ...relatorio,
    estado: 'recusado',
    podeDecidir: false,
    recusadoPor: 'fernanda@exemplo.com',
    recusadoEm: '2026-08-11T13:00:00Z',
    recusaMotivo: MOTIVO,
    correcao: {
      id: 'ordem-1',
      estado: 'aguardando_nova_versao',
      solicitadoEm: '2026-08-11T13:00:00Z',
      novaVersaoRelatorioId: null,
      novaVersao: null,
    },
    notificacaoInterna: {
      id: 'notificacao-1',
      estado: 'pendente',
      destinoReferencia: 'dacora_semanais.recipients',
    },
  });
  assert.match(String(jaRecusadoComOrdem), /Ordem de correção: aguardando uma versão nova/);
  assert.match(String(jaRecusadoComOrdem), /painel não enviou WhatsApp/);

  const textosPorEstado = {
    pendente: /pendente na fila/,
    reservado: /em processamento/,
    enviando: /em processamento/,
    enviado: /confirmado pelo recibo/,
    incerto: /confirmação incerta/,
    falhou: /falhou antes do transporte/,
  } as const;
  for (const [estado, trecho] of Object.entries(textosPorEstado)) {
    assert.match(
      textoDaNotificacaoInterna(estado as keyof typeof textosPorEstado),
      trecho,
      `o estado ${estado} precisa ter uma explicação operacional real`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 6. A tela de decisão                                                */
/* ------------------------------------------------------------------ */

function desenharDecisao(relatorio: any, comCanal: boolean) {
  return renderToStaticMarkup(
    createElement(DecisaoDaRevisao, {
      relatorio,
      quem: 'pessoa.autorizada@exemplo.com',
      aoDecidir: comCanal ? (async () => ({ ok: true, mensagem: 'ok' })) : (async () => ({ ok: true, mensagem: 'ok' })),
    }),
  );
}

const decidivel = {
  clienteNome: 'Cliente Exemplo',
  competencia: '2026-07',
  versao: 3,
  checksum: CHECKSUM,
  estado: 'gerado',
  podeDecidir: true,
  aprovadoPor: null,
  aprovadoEm: null,
  recusadoPor: null,
  recusadoEm: null,
  recusaMotivo: null,
};

{
  const html = desenharDecisao(decidivel, true);
  assert.ok(html.includes('Aprovar relatório') && html.includes('Recusar com motivo'));
  assert.equal(
    (html.match(/ disabled=""/g) ?? []).length,
    0,
    'com decisão possível, os dois botões ficam habilitados',
  );
  // Rótulo que diz o OBJETO: "Aprovar" sozinho não diz nada num leitor de tela.
  assert.match(html, /aria-label="Aprovar o relatório de Cliente Exemplo, julho de 2026"/);
  assert.match(html, /aria-label="Recusar com motivo o relatório de Cliente Exemplo, julho de 2026"/);
  // Nenhum diálogo aberto sozinho, e nenhum eco antes de alguém pedir.
  assert.ok(!html.includes('role="dialog"'), 'o diálogo da recusa não abre sozinho');
  assert.ok(!html.includes('dcp-decisao__eco'), 'o eco só aparece depois do primeiro clique');
}

{
  const html = desenharDecisao(
    {
      ...decidivel,
      estado: 'liberado',
      podeDecidir: false,
      aprovadoPor: 'fernanda@exemplo.com',
      aprovadoEm: '2026-08-11T12:00:00Z',
    },
    true,
  );
  assert.equal(
    (html.match(/ disabled=""/g) ?? []).length,
    2,
    'relatório já decidido não oferece decisão',
  );
  assert.match(html, /Aprovado por fernanda@exemplo\.com/);
}

{
  const html = desenharDecisao(
    { ...decidivel, estado: 'substituido', podeDecidir: false },
    true,
  );
  assert.match(html, /substituída por uma mais nova/);
}

/* A moldura sem canal de decisão continua desabilitada — é o que a P2 prova. */
{
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        RevisaoMoldura,
        {
          relatorio: {
            id: ID,
            clienteNome: 'Cliente Exemplo',
            competencia: '2026-07',
            versao: 3,
            estado: 'gerado',
            sinais: [],
            conteudoCarregado: true,
            snapshot: {} as any,
            checksum: CHECKSUM,
            podeDecidir: true,
          } as any,
          quem: 'pessoa.autorizada@exemplo.com',
        },
        createElement('div', null, 'documento'),
      ),
    ),
  );
  assert.equal(
    (html.match(/ disabled=""/g) ?? []).length,
    2,
    'sem canal de decisão, botão habilitado seria mentira',
  );
  assert.match(html, /Decisão indisponível nesta tela/);
}

/* A revisão só oferece decisão quando o checksum da coluna chegou. */
{
  const semChecksum = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        RevisaoMoldura,
        {
          relatorio: {
            id: ID,
            clienteNome: 'Cliente Exemplo',
            competencia: '2026-07',
            versao: 3,
            estado: 'gerado',
            sinais: [],
            conteudoCarregado: true,
            snapshot: {} as any,
            podeDecidir: true,
          } as any,
          quem: 'pessoa.autorizada@exemplo.com',
          aoDecidir: async () => ({ ok: true, mensagem: 'ok' }),
        },
        createElement('div', null, 'documento'),
      ),
    ),
  );
  assert.equal(
    (semChecksum.match(/ disabled=""/g) ?? []).length,
    2,
    'sem a impressão digital do documento não existe decisão a carimbar',
  );
}

/* ------------------------------------------------------------------ */
/* 7. O estado `recusado` na fila e na visão geral                      */
/* ------------------------------------------------------------------ */

function linhaDaFila(sufixo: string, extra: Record<string, unknown>) {
  return {
    id: `id-${sufixo}`,
    cliente_slug: `cliente_${sufixo}`,
    competencia: '2026-07',
    versao: 1,
    estado: 'gerado',
    gerado_em: '2026-08-01T10:00:00Z',
    aprovado_por: null,
    aprovado_em: null,
    recusado_por: null,
    recusado_em: null,
    recusa_motivo: null,
    enviado_em: null,
    enviado_para: null,
    substituido_por: null,
    conteudo: {
      identidade: {
        clienteNome: `Cliente ${sufixo}`,
        carteira: 'DACORA',
        produto: 'mensal_externo_cliente',
        tipoRelatorio: 'small_cap',
      },
      montagem: [],
      fontes: [],
      dados: { faixas: {} },
    },
    ...extra,
  };
}

const linhas = [
  linhaDaFila('gerado', {}),
  linhaDaFila('recusado', {
    estado: 'recusado',
    recusado_por: 'fernanda@exemplo.com',
    recusado_em: '2026-08-11T13:00:00Z',
    recusa_motivo: MOTIVO,
    correcao_ordem_id: 'ordem-fila',
    correcao_estado: 'aguardando_nova_versao',
    correcao_solicitado_em: '2026-08-11T13:00:00Z',
    notificacao_interna_id: 'notificacao-fila',
    notificacao_interna_estado: 'pendente',
    notificacao_destino_referencia: 'dacora_semanais.recipients',
  }),
  linhaDaFila('liberado', {
    estado: 'liberado',
    aprovado_por: 'fernanda@exemplo.com',
    aprovado_em: '2026-08-11T12:00:00Z',
  }),
  linhaDaFila('enviado', {
    estado: 'liberado',
    aprovado_por: 'fernanda@exemplo.com',
    aprovado_em: '2026-08-02T12:00:00Z',
    enviado_em: '2026-08-02T13:00:00Z',
  }),
];

{
  const item = montarItem(linhas[1] as any);
  assert.equal(item.estado, 'recusado');
  assert.equal(item.recusadoPor, 'fernanda@exemplo.com');
  assert.equal(item.recusaMotivo, MOTIVO);

  for (const estado of ['pendente', 'reservado', 'enviando', 'enviado', 'incerto', 'falhou'] as const) {
    const itemComEstado = montarItem({
      ...linhas[1],
      notificacao_interna_estado: estado,
    } as any);
    assert.equal(itemComEstado.notificacaoInterna?.estado, estado);
  }

  // Um relatório recusado é trabalho aberto: fica logo depois do que espera
  // revisão, e nunca no fim, junto do que já foi resolvido.
  const ordenada = ordenarPorAtencao(linhas.map((l) => montarItem(l as any)));
  assert.deepEqual(
    ordenada.map((i) => i.estado),
    ['gerado', 'recusado', 'liberado', 'enviado'],
  );
}

{
  const visao = montarVisaoGeral(linhas as any, '2026-07', '2026-08-20T00:00:00Z');
  const fatiaRecusado = visao.fila.porEstado.find((f) => f.chave === 'recusado');
  assert.ok(fatiaRecusado, 'o estado recusado precisa existir na visão geral');
  assert.equal(fatiaRecusado.quantidade, 1);
  assert.equal(fatiaRecusado.rotulo, 'Recusado, esperando nova versão');

  const ordem = visao.fila.porEstado.map((f) => f.chave);
  assert.ok(
    ordem.indexOf('recusado') < ordem.indexOf('liberado'),
    'a ordem das fatias acompanha a ordem da fila',
  );

  // As fatias fecham com o total: o estado novo não pode ficar de fora da conta.
  const somaDosEstados = visao.fila.porEstado.reduce((soma, f) => soma + f.quantidade, 0);
  assert.equal(somaDosEstados, visao.totalCorrentes);

  // Recusado nunca foi liberado, então o prazo o conta como não liberado.
  assert.equal(visao.prazo.naoLiberados, 2, 'gerado e recusado não têm liberação registrada');
  assert.equal(visao.prazo.liberadosNoPrazo + (visao.prazo.liberadosComAtraso ?? 0), 2);
}

{
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(FilaApresentada, {
        dados: {
          competencia: '2026-07',
          competencias: ['2026-07'],
          itens: montarFila(linhas as any),
        },
      }),
    ),
  );
  assert.ok(html.includes('dcp-estado--recusado'), 'a forma própria do recusado precisa aparecer');
  assert.match(html, /recusado por fernanda · 11\/08/);
  assert.ok(html.includes(MOTIVO), 'o motivo viaja no detalhe da célula, para quem for regerar');
  assert.match(html, /aguardando nova versão · recusado por fernanda/);
  assert.match(html, /Aviso interno pendente na fila de saída; o painel não enviou WhatsApp/);
  assert.match(html, /1 recusado/, 'o resumo do mês conta os recusados separadamente');
  assert.ok(
    !html.includes('Aprovar relatório') && !html.includes('Recusar com motivo'),
    'a fila continua sem botão de decisão — decidir exige o documento na tela',
  );
}

/* ------------------------------------------------------------------ */
/* 8. O contrato da revisão carrega o checksum da COLUNA                */
/* ------------------------------------------------------------------ */

{
  const linha: any = {
    ...linhaDaFila('revisao', {}),
    checksum: CHECKSUM,
    aprovado_checksum: null,
    revogado_em: null,
  };
  linha.conteudo.montagem = [];

  const relatorio: any = montarRelatorioParaRevisao(linha);
  assert.ok(relatorio);
  assert.equal(relatorio.checksum, CHECKSUM, 'o checksum vem da coluna persistida');
  assert.equal(relatorio.podeDecidir, true);

  assert.equal(
    montarRelatorioParaRevisao({ ...linha, substituido_por: 'outro-id' } as any)!.podeDecidir,
    false,
    'versão substituída não é decidível',
  );
  assert.equal(
    montarRelatorioParaRevisao({ ...linha, revogado_em: '2026-08-10T00:00:00Z' } as any)!.podeDecidir,
    false,
    'versão revogada não é decidível',
  );
  assert.equal(
    montarRelatorioParaRevisao({ ...linha, estado: 'liberado' } as any)!.podeDecidir,
    false,
    'relatório já liberado não é decidível de novo',
  );
}

/* ------------------------------------------------------------------ */
/* 9. O fluxo na tela, num DOM de verdade                               */
/* ------------------------------------------------------------------ */

/**
 * O HTML estático prova o que está desenhado; ele não prova o que acontece
 * quando alguém clica. E é no clique que mora a parte que importa desta fase:
 * **nada é enviado antes da confirmação sobre o eco**, e a recusa sem motivo é
 * impossível de disparar.
 */
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom') as typeof import('jsdom');

  const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', {
    url: 'https://exemplo.invalido/painel-de-relatorios',
    pretendToBeVisual: true,
  });

  for (const nome of [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Element',
    'Node',
    'Event',
    'KeyboardEvent',
    'MouseEvent',
    'CustomEvent',
    'MutationObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ]) {
    Object.defineProperty(globalThis, nome, {
      value: (dom.window as any)[nome],
      configurable: true,
      writable: true,
    });
  }

  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');

  const enviados: any[] = [];
  const elemento = dom.window.document.getElementById('raiz')!;
  const raiz = createRoot(elemento);

  flushSync(() => {
    raiz.render(
      createElement(DecisaoDaRevisao, {
        relatorio: decidivel,
        quem: 'pessoa.autorizada@exemplo.com',
        aoDecidir: async (pedido: any) => {
          enviados.push(pedido);
          return { ok: true, mensagem: 'Decisão registrada.' };
        },
      }),
    );
  });

  function botaoPor(texto: string): HTMLButtonElement {
    const achado = [...elemento.querySelectorAll('button')].find(
      (b) => (b.textContent ?? '').trim() === texto,
    );
    assert.ok(achado, `não encontrei o botão "${texto}"`);
    return achado as HTMLButtonElement;
  }

  function clicar(botao: HTMLButtonElement) {
    flushSync(() => {
      botao.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  }

  /* --- Aprovar: um clique NÃO grava; ele mostra o eco. ----------------- */
  clicar(botaoPor('Aprovar relatório'));
  assert.equal(enviados.length, 0, 'o primeiro clique não pode gravar nada');
  const eco = elemento.querySelector('.dcp-decisao__eco');
  assert.ok(eco, 'o eco precisa aparecer antes da confirmação');
  assert.match(eco.textContent ?? '', /Nada foi gravado ainda/);
  assert.ok((eco.textContent ?? '').includes(CHECKSUM.slice(0, 12)));

  clicar(botaoPor('Cancelar'));
  assert.equal(enviados.length, 0, 'cancelar não pode gravar');
  assert.equal(elemento.querySelector('.dcp-decisao__eco'), null, 'cancelar fecha o eco');

  clicar(botaoPor('Aprovar relatório'));
  clicar(botaoPor('Confirmar aprovação'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(enviados, [{ decisao: 'aprovar' }], 'a aprovação sai sem motivo');

  /* --- Recusar: diálogo, motivo obrigatório, Esc. ---------------------- */
  enviados.length = 0;
  clicar(botaoPor('Recusar com motivo'));
  const dialogo = elemento.querySelector('[role="dialog"]');
  assert.ok(dialogo, 'a recusa precisa abrir diálogo próprio');
  assert.equal(dialogo.getAttribute('aria-modal'), 'true');

  const registrar = botaoPor('Registrar recusa');
  assert.equal(registrar.disabled, true, 'sem motivo, registrar precisa estar impossível');
  clicar(registrar);
  assert.equal(enviados.length, 0, 'clicar no botão desabilitado não pode gravar');

  const campo = elemento.querySelector('textarea') as HTMLTextAreaElement;
  assert.ok(campo, 'faltou o campo do motivo');

  // Texto curto continua barrado — e o contador diz quanto falta.
  flushSync(() => {
    (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any)
      .set.call(campo, 'curto');
    campo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(botaoPor('Registrar recusa').disabled, true, 'motivo curto não vale');
  assert.match(elemento.textContent ?? '', /Faltam \d+ caracteres/);

  flushSync(() => {
    (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any)
      .set.call(campo, `  ${MOTIVO}  `);
    campo.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  const registrarValido = botaoPor('Registrar recusa');
  assert.equal(registrarValido.disabled, false, 'com motivo, registrar precisa liberar');
  // O eco do diálogo repete o motivo inteiro, que é sobre o que se confirma.
  assert.ok(
    (elemento.querySelector('.dcp-decisao__eco')?.textContent ?? '').includes(MOTIVO),
    'o eco da recusa precisa mostrar o motivo escrito',
  );

  // `Esc` fecha sem gravar.
  flushSync(() => {
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  });
  assert.equal(elemento.querySelector('[role="dialog"]'), null, 'Esc precisa fechar o diálogo');
  assert.equal(enviados.length, 0, 'fechar com Esc não grava');

  // Reabrir e registrar de verdade: o motivo chega aparado.
  clicar(botaoPor('Recusar com motivo'));
  const campoDois = elemento.querySelector('textarea') as HTMLTextAreaElement;
  flushSync(() => {
    (Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value') as any)
      .set.call(campoDois, `  ${MOTIVO}  `);
    campoDois.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  clicar(botaoPor('Registrar recusa'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(enviados, [{ decisao: 'recusar', motivo: MOTIVO }]);

  flushSync(() => raiz.unmount());
  dom.window.close();
}

console.log(
  'OK — decisão do painel: porta fechada, checksum carimbado da coluna, motivo obrigatório, ' +
    'read-back conferido, o eco confirmado antes de gravar e o estado recusado presente ' +
    'na fila e na visão geral',
);
