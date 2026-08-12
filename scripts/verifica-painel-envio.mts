/** Regressão P5B: contrato seguro, idempotência e diálogo sem efeito real. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import handler from '../api/painel-envio.ts';
import {
  conferirSolicitacaoComReadBack,
  lerPedidoDeEnvio,
  montarEstadoSeguroDoEnvio,
  traduzirErroDaFabrica,
  type LinhaDoPortalP5,
} from '../api/_painel-envio-regras.ts';
import EnvioDaRevisao, {
  textoDoEstadoDoEnvio,
  type EstadoSeguroDoEnvioP5,
} from '../src/painel/EnvioDaRevisao.tsx';

const ID = '55555555-5555-4555-8555-555555555555';
const ENVIO_ID = '66666666-6666-4666-8666-666666666666';
const CHECKSUM = 'checksum-p5-aprovado';
const QUEM = 'operadora.autorizada@exemplo.com';
const NOME = 'Cliente Exemplo × Dácora';
const REFERENCIA = 'agenda.client_recipients.cliente_exemplo';
const ID_BRUTO = '120000000000000000@g.us';

function linha(parcial: Partial<LinhaDoPortalP5> = {}): LinhaDoPortalP5 {
  return {
    relatorio_id: ID,
    cliente_nome: 'Cliente Exemplo',
    competencia: '2026-07',
    relatorio_versao: 3,
    checksum: CHECKSUM,
    relatorio_estado: 'liberado',
    aprovado_por: 'aprovadora@exemplo.com',
    aprovado_em: '2026-08-11T14:00:00Z',
    aprovado_checksum: CHECKSUM,
    enviado_em: null,
    ja_enviado: false,
    destino_referencia: REFERENCIA,
    destinatario_nome: NOME,
    destinatario_habilitado: true,
    destinatario_sincronizado_em: '2026-08-11T16:31:52.000Z',
    envio_id: null,
    envio_estado: null,
    solicitado_por: null,
    solicitado_em: null,
    confirmado_em: null,
    erro_codigo: null,
    pode_solicitar_envio: true,
    ...parcial,
  };
}

function linhaComIntencao(
  estado: LinhaDoPortalP5['envio_estado'] = 'pendente',
  parcial: Partial<LinhaDoPortalP5> = {},
): LinhaDoPortalP5 {
  const confirmado = estado === 'confirmado';
  return linha({
    envio_id: ENVIO_ID,
    envio_estado: estado,
    solicitado_por: QUEM,
    solicitado_em: '2026-08-11T15:00:00Z',
    confirmado_em: confirmado ? '2026-08-11T15:05:00Z' : null,
    enviado_em: confirmado ? '2026-08-11T15:05:00Z' : null,
    ja_enviado: confirmado,
    pode_solicitar_envio: false,
    ...parcial,
  });
}

/* Pedido estreito: identidade forjada é ignorada. */
{
  const leitura = lerPedidoDeEnvio({
    id: ID,
    checksum: CHECKSUM,
    solicitadoPor: 'invasor@exemplo.com',
    destinatario: ID_BRUTO,
  });
  assert.equal(leitura.ok, true);
  assert.deepEqual(leitura.ok && leitura.pedido, { id: ID, checksumVisto: CHECKSUM });
  for (const entrada of [null, {}, { id: 'torto', checksum: CHECKSUM }, { id: ID }]) {
    assert.equal(lerPedidoDeEnvio(entrada).ok, false);
  }
}

/* A projeção segura não deixa identificadores internos atravessarem. */
{
  const montagem = montarEstadoSeguroDoEnvio(linha({
    // Campo extra simula algo que a view poderia ganhar; a projeção continua estreita.
    destinatario: ID_BRUTO,
    chave_idempotencia: 'segredo-interno',
    token: 'token-publico',
  } as any));
  assert.equal(montagem.ok, true);
  const json = JSON.stringify(montagem);
  for (const proibido of [ID_BRUTO, REFERENCIA, 'segredo-interno', 'token-publico', 'envio_id']) {
    assert.equal(json.includes(proibido), false, `a resposta não pode conter ${proibido}`);
  }
  assert.equal(montagem.ok && montagem.estado.destinatarioNome, NOME);
  assert.equal(montagem.ok && montagem.estado.podeSolicitarEnvio, true);

  const ausente = montarEstadoSeguroDoEnvio(linha({
    destino_referencia: null,
    destinatario_nome: null,
    destinatario_habilitado: null,
    pode_solicitar_envio: false,
  }));
  assert.equal(ausente.ok && ausente.estado.indisponibilidade, 'destinatario_ausente');

  const naoSincronizado = montarEstadoSeguroDoEnvio(linha({
    destinatario_sincronizado_em: null,
    pode_solicitar_envio: false,
  }));
  assert.equal(
    naoSincronizado.ok && naoSincronizado.estado.indisponibilidade,
    'destinatario_ausente',
  );

  for (const estado of ['pendente', 'reservado', 'enviando', 'confirmado', 'incerto', 'falhou'] as const) {
    const resultado = montarEstadoSeguroDoEnvio(linhaComIntencao(estado));
    assert.equal(resultado.ok, true, `o estado ${estado} precisa ser reconhecido`);
    assert.equal(resultado.ok && resultado.estado.envio?.estado, estado);
  }

  assert.equal(
    montarEstadoSeguroDoEnvio(linhaComIntencao('confirmado', { confirmado_em: null })).ok,
    false,
    'confirmado sem horário nunca pode virar enviado',
  );
  assert.equal(
    montarEstadoSeguroDoEnvio(linhaComIntencao('pendente', { enviado_em: '2026-08-11T15:05:00Z', ja_enviado: true })).ok,
    false,
    'envelope enviado sem recibo confirmado precisa reprovar',
  );
}

/* Erros do banco chegam em português e não como Postgres cru. */
{
  for (const codigo of [
    'checksum_divergente',
    'relatorio_nao_liberado',
    'versao_fora_de_circulacao',
    'relatorio_ja_enviado',
    'destinatario_canonico_indisponivel',
    'intencao_envio_conflitante',
  ]) {
    const traducao = traduzirErroDaFabrica(`{"message":"${codigo}"}`);
    assert.equal(traducao.erro, codigo);
    assert.equal(traducao.status, 409);
    assert.ok(traducao.mensagem.length > 25);
  }
}

const retornoRpc = {
  envio_id: ENVIO_ID,
  relatorio_id: ID,
  estado: 'pendente',
  destinatario_nome: NOME,
  destino_referencia: REFERENCIA,
  solicitado_por: QUEM,
  solicitado_em: '2026-08-11T15:00:00Z',
  ja_existia: false,
};

{
  const ok = conferirSolicitacaoComReadBack(
    retornoRpc,
    linhaComIntencao(),
    { id: ID, checksumVisto: CHECKSUM },
    QUEM,
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.jaExistia, false);
  assert.equal(
    conferirSolicitacaoComReadBack(
      { ...retornoRpc, ja_existia: true },
      linhaComIntencao(),
      { id: ID, checksumVisto: CHECKSUM },
      'outra.autorizada@exemplo.com',
    ).ok,
    true,
    'retry por outra sessão preserva a intenção original em vez de reatribuir',
  );
  assert.equal(
    conferirSolicitacaoComReadBack(
      retornoRpc,
      linhaComIntencao('pendente', { destino_referencia: 'outra.referencia' }),
      { id: ID, checksumVisto: CHECKSUM },
      QUEM,
    ).ok,
    false,
    'destino divergente no read-back não pode virar sucesso',
  );
}

function respostaHttp(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resMock() {
  const saida = {
    statusCode: 200,
    corpo: null as any,
    headers: {} as Record<string, string>,
    setHeader(nome: string, valor: string) { this.headers[nome] = valor; },
    status(codigo: number) { this.statusCode = codigo; return this; },
    json(corpo: any) { this.corpo = corpo; return this; },
  };
  return saida;
}

const ambiente = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAINEL_EMAILS_AUTORIZADOS: process.env.PAINEL_EMAILS_AUTORIZADOS,
};
const fetchOriginal = globalThis.fetch;
process.env.SUPABASE_URL = 'https://projeto.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = QUEM;

const usuario = {
  email: QUEM,
  app_metadata: { provider: 'google', providers: ['google'] },
  identities: [{ provider: 'google' }],
};

try {
  /* Método e porta de acesso morrem antes da fábrica. */
  for (const req of [
    { method: 'DELETE', headers: {}, query: {} },
    { method: 'GET', headers: {}, query: { id: ID } },
  ]) {
    let chamadas = 0;
    globalThis.fetch = async () => { chamadas += 1; throw new Error('não deveria chamar'); };
    const res = resMock();
    await handler(req as any, res as any);
    assert.equal(res.statusCode, req.method === 'DELETE' ? 405 : 401);
    assert.equal(chamadas, 0);
  }

  /* GET autorizado: sessão primeiro, view depois, resposta sanitizada. */
  {
    const urls: string[] = [];
    globalThis.fetch = async (entrada) => {
      const url = String(entrada);
      urls.push(url);
      if (url.endsWith('/auth/v1/user')) return respostaHttp(usuario);
      assert.match(url, /relatorio_p5_portal\?relatorio_id=eq\./);
      return respostaHttp([linha({ destinatario: ID_BRUTO, token: 'nao-vaza' } as any)]);
    };
    const res = resMock();
    await handler({ method: 'GET', headers: { authorization: 'Bearer sessao' }, query: { id: ID } } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.equal(urls.length, 2);
    const json = JSON.stringify(res.corpo);
    assert.ok(json.includes(NOME));
    for (const proibido of [ID_BRUTO, REFERENCIA, 'nao-vaza', 'destino_referencia']) {
      assert.equal(json.includes(proibido), false);
    }
  }

  /* POST: solicitante vem da sessão, retry é idempotente e há read-back. */
  for (const jaExistia of [false, true]) {
    const corpos: any[] = [];
    globalThis.fetch = async (entrada, init) => {
      const url = String(entrada);
      if (url.endsWith('/auth/v1/user')) return respostaHttp(usuario);
      if (url.includes('/rpc/relatorio_p5_solicitar_envio')) {
        corpos.push(JSON.parse(String(init?.body)));
        return respostaHttp([{ ...retornoRpc, ja_existia: jaExistia }]);
      }
      return respostaHttp([linhaComIntencao()]);
    };
    const res = resMock();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer sessao' },
      body: { id: ID, checksum: CHECKSUM, p_solicitado_por: 'invasor@exemplo.com', destinatario: ID_BRUTO },
    } as any, res as any);
    assert.equal(res.statusCode, 200);
    assert.equal(res.corpo.solicitado, true);
    assert.equal(res.corpo.jaExistia, jaExistia);
    assert.deepEqual(corpos, [{
      p_relatorio_id: ID,
      p_checksum_visto: CHECKSUM,
      p_solicitado_por: QUEM,
    }]);
    assert.equal(JSON.stringify(res.corpo).includes(REFERENCIA), false);
    assert.equal(JSON.stringify(res.corpo).includes(ENVIO_ID), false);
  }

  /* Recusa de produto não ganha read-back nem sucesso falso. */
  {
    let chamadasDaView = 0;
    globalThis.fetch = async (entrada) => {
      const url = String(entrada);
      if (url.endsWith('/auth/v1/user')) return respostaHttp(usuario);
      if (url.includes('/rpc/')) return respostaHttp({ message: 'checksum_divergente' }, 400);
      chamadasDaView += 1;
      return respostaHttp([]);
    };
    const res = resMock();
    await handler({
      method: 'POST', headers: { authorization: 'Bearer sessao' }, body: { id: ID, checksum: CHECKSUM },
    } as any, res as any);
    assert.equal(res.statusCode, 409);
    assert.equal(res.corpo.solicitado, false);
    assert.equal(res.corpo.erro, 'checksum_divergente');
    assert.equal(chamadasDaView, 0);
  }

  /* Confirmação divergente falha fechado. */
  {
    globalThis.fetch = async (entrada) => {
      const url = String(entrada);
      if (url.endsWith('/auth/v1/user')) return respostaHttp(usuario);
      return respostaHttp([linhaComIntencao('confirmado', { confirmado_em: null })]);
    };
    const res = resMock();
    await handler({ method: 'GET', headers: { authorization: 'Bearer sessao' }, query: { id: ID } } as any, res as any);
    assert.equal(res.statusCode, 502);
    assert.match(res.corpo.mensagem, /Nada deve ser tratado como enviado/);
  }
} finally {
  globalThis.fetch = fetchOriginal;
  for (const [chave, valor] of Object.entries(ambiente)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
}

/* DOM: destino antes do botão, “Agora não” sem RPC e clique duplo guardado. */
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="raiz"><div class="dc-painel"><div class="dcp-portal"></div><div id="montagem"></div></div></div></body></html>',
    {
      url: 'https://exemplo.invalido/painel-de-relatorios?relatorio=teste',
      pretendToBeVisual: true,
    },
  );
  for (const nome of [
    'window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event',
    'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'getComputedStyle',
    'requestAnimationFrame', 'cancelAnimationFrame',
  ]) {
    Object.defineProperty(globalThis, nome, {
      value: (dom.window as any)[nome], configurable: true, writable: true,
    });
  }
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const elemento = dom.window.document.getElementById('raiz')!;
  const montagem = dom.window.document.getElementById('montagem')!;
  const raiz = createRoot(montagem);
  const seguro = montarEstadoSeguroDoEnvio(linha());
  assert.equal(seguro.ok, true);
  const estadoDisponivel = (seguro as { ok: true; estado: EstadoSeguroDoEnvioP5 }).estado;
  let solicitacoes = 0;
  const aoCarregar = async () => ({ ok: true as const, estado: estadoDisponivel });
  const aoSolicitar = async () => {
    solicitacoes += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const montado = montarEstadoSeguroDoEnvio(linhaComIntencao());
    assert.equal(montado.ok, true);
    return { ok: true as const, estado: (montado as any).estado };
  };

  flushSync(() => raiz.render(createElement(EnvioDaRevisao, { aoCarregar, aoSolicitar })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(elemento.querySelector('[role="dialog"]'));
  assert.ok(
    elemento.querySelector('.dcp-portal > .dcp-modal [role="dialog"]'),
    'o diálogo precisa sair da faixa lateral e permanecer dentro de .dc-painel',
  );
  assert.ok((elemento.textContent ?? '').includes(NOME), 'o nome canônico aparece antes das ações');
  assert.equal((elemento.textContent ?? '').includes(ID_BRUTO), false);

  function botao(texto: string) {
    const achado = [...elemento.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
    assert.ok(achado, `faltou o botão ${texto}`);
    return achado as HTMLButtonElement;
  }
  function clicar(alvo: HTMLButtonElement) {
    flushSync(() => alvo.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  }
  async function aguardarTexto(padrao: RegExp) {
    const limite = Date.now() + 1_000;
    while (!padrao.test(elemento.textContent ?? '') && Date.now() < limite) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  clicar(botao('Agora não'));
  assert.equal(solicitacoes, 0, 'Agora não não chama RPC');
  assert.equal(elemento.querySelector('[role="dialog"]'), null);
  assert.match(elemento.textContent ?? '', /Reabra a revisão/);

  flushSync(() => raiz.unmount());
  const raizDois = createRoot(elemento);
  flushSync(() => raizDois.render(createElement(EnvioDaRevisao, { aoCarregar, aoSolicitar })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const enviar = botao('Enviar');
  clicar(enviar);
  clicar(enviar);
  await aguardarTexto(/Envio solicitado/);
  assert.equal(solicitacoes, 1, 'clique duplo local gera no máximo uma chamada; o banco segue sendo a garantia final');
  assert.match(elemento.textContent ?? '', /Envio solicitado/);

  assert.match(
    textoDoEstadoDoEnvio((montarEstadoSeguroDoEnvio(linhaComIntencao('confirmado')) as any).estado),
    /recibo confirmado/,
  );
  assert.doesNotMatch(
    textoDoEstadoDoEnvio((montarEstadoSeguroDoEnvio(linhaComIntencao('pendente')) as any).estado),
    /^Enviado/,
  );

  flushSync(() => raizDois.unmount());
  dom.window.close();
}

console.log(
  'OK — P5B: destino canônico antes da ação, Agora não sem RPC, sessão como solicitante, ' +
  'retry idempotente, estados duráveis e enviado somente com recibo confirmado',
);
