/** P6: histórico read-only, durável, carregado sob demanda e sem segredos. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import handler from '../api/painel-historico.ts';
import {
  montarHistoricoSeguro,
  type HistoricoSeguroDoCliente,
  type LinhaDoHistoricoP4,
} from '../api/_painel-historico-dados.ts';
import type { LinhaDoPortalP5 } from '../api/_painel-envio-regras.ts';
import HistoricoDoCliente from '../src/painel/HistoricoDoCliente.tsx';
import { RevisaoMoldura } from '../src/painel/RevisaoMoldura.tsx';

const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';
const ID_3 = '33333333-3333-4333-8333-333333333333';
const ID_ANTIGO = '44444444-4444-4444-8444-444444444444';
const ID_ORDEM = '55555555-5555-4555-8555-555555555555';
const ID_NOTIFICACAO = '66666666-6666-4666-8666-666666666666';
const ID_ENVIO_2 = '77777777-7777-4777-8777-777777777777';
const ID_ENVIO_3 = '88888888-8888-4888-8888-888888888888';
const ID_FORA = '99999999-9999-4999-8999-999999999999';
const CLIENTE_SLUG = 'cliente_resolvido_no_servidor';
const CLIENTE_NOME = 'Cliente Resolvido';
const REFERENCIA_INTERNA = 'grupo-interno-ultrassecreto';

function linhaP4(sobrescrever: Partial<LinhaDoHistoricoP4> = {}): LinhaDoHistoricoP4 {
  return {
    id: ID_1,
    cliente_slug: CLIENTE_SLUG,
    competencia: '2026-07',
    versao: 1,
    estado: 'gerado',
    gerado_em: '2026-08-01T10:00:00Z',
    checksum: 'checksum-v1-persistido',
    aprovado_por: null,
    aprovado_em: null,
    aprovado_checksum: null,
    recusado_por: null,
    recusado_em: null,
    recusa_motivo: null,
    correcao_ordem_id: null,
    correcao_estado: null,
    correcao_solicitado_em: null,
    correcao_nova_versao_relatorio_id: null,
    correcao_nova_versao: null,
    notificacao_interna_id: null,
    notificacao_interna_estado: null,
    enviado_em: null,
    substituido_por: null,
    revogado_em: null,
    ...sobrescrever,
  };
}

const linhasP4: LinhaDoHistoricoP4[] = [
  linhaP4({
    aprovado_por: 'po@exemplo.com',
    aprovado_em: '2026-08-01T11:00:00Z',
    aprovado_checksum: 'checksum-v1-persistido',
  }),
  linhaP4({
    id: ID_2,
    versao: 2,
    checksum: 'checksum-v2-persistido',
    gerado_em: '2026-08-02T10:00:00Z',
    estado: 'recusado',
    recusado_por: 'po@exemplo.com',
    recusado_em: '2026-08-02T11:00:00Z',
    recusa_motivo: 'Corrigir a leitura do resultado.',
    correcao_ordem_id: ID_ORDEM,
    correcao_estado: 'nova_versao_gerada',
    correcao_solicitado_em: '2026-08-02T11:01:00Z',
    correcao_nova_versao_relatorio_id: ID_3,
    correcao_nova_versao: 3,
    notificacao_interna_id: ID_NOTIFICACAO,
    notificacao_interna_estado: 'enviado',
    substituido_por: ID_3,
  }),
  linhaP4({
    id: ID_3,
    versao: 3,
    checksum: 'checksum-v3-persistido',
    gerado_em: '2026-08-03T10:00:00Z',
    estado: 'enviado',
    enviado_em: '2026-08-03T12:05:00Z',
  }),
  linhaP4({
    id: ID_ANTIGO,
    competencia: '2026-06',
    checksum: 'checksum-junho-persistido',
    gerado_em: '2026-07-01T10:00:00Z',
  }),
];

function linhaP5(
  relatorio: LinhaDoHistoricoP4,
  sobrescrever: Partial<LinhaDoPortalP5> = {},
): LinhaDoPortalP5 {
  return {
    relatorio_id: relatorio.id,
    cliente_nome: CLIENTE_NOME,
    competencia: relatorio.competencia,
    relatorio_versao: relatorio.versao,
    checksum: relatorio.checksum,
    relatorio_estado: relatorio.estado,
    aprovado_por: relatorio.aprovado_por,
    aprovado_em: relatorio.aprovado_em,
    aprovado_checksum: relatorio.aprovado_checksum,
    enviado_em: null,
    ja_enviado: false,
    destino_referencia: REFERENCIA_INTERNA,
    destinatario_nome: 'Grupo Canônico do Cliente',
    destinatario_habilitado: true,
    destinatario_sincronizado_em: '2026-08-03T09:00:00Z',
    envio_id: null,
    envio_estado: null,
    solicitado_por: null,
    solicitado_em: null,
    confirmado_em: null,
    erro_codigo: null,
    pode_solicitar_envio: false,
    ...sobrescrever,
  };
}

const linhasP5: LinhaDoPortalP5[] = [
  linhaP5(linhasP4[1], {
    envio_id: ID_ENVIO_2,
    envio_estado: 'incerto',
    solicitado_por: 'po@exemplo.com',
    solicitado_em: '2026-08-02T12:00:00Z',
    erro_codigo: 'confirmacao_ausente',
  }),
  linhaP5(linhasP4[2], {
    envio_id: ID_ENVIO_3,
    envio_estado: 'confirmado',
    solicitado_por: 'po@exemplo.com',
    solicitado_em: '2026-08-03T12:00:00Z',
    confirmado_em: '2026-08-03T12:05:10Z',
    enviado_em: '2026-08-03T12:05:00Z',
    ja_enviado: true,
  }),
];

const montagem = montarHistoricoSeguro(CLIENTE_SLUG, CLIENTE_NOME, linhasP4, linhasP5);
assert.equal(montagem.ok, true);
const historico = (montagem as { ok: true; historico: HistoricoSeguroDoCliente }).historico;
assert.deepEqual(historico.competencias.map(item => item.competencia), ['2026-07', '2026-06']);
assert.deepEqual(historico.competencias[0].versoes.map(item => item.versao), [3, 2, 1]);

const [v3, v2, v1] = historico.competencias[0].versoes;
assert.equal(v1.posicao, 'anterior', 'versão anterior sem vínculo não pode ser chamada de substituída');
assert.equal(v1.decisao?.tipo, 'aprovado');
assert.equal(v2.posicao, 'substituida');
assert.equal(v2.substituidaPor?.relatorioId, ID_3);
assert.equal(v2.decisao?.tipo, 'recusado');
assert.equal(v2.correcao?.estado, 'nova_versao_gerada');
assert.equal(v2.notificacaoInterna?.estado, 'enviado');
assert.equal(v2.envio?.estado, 'incerto');
assert.equal(v2.envio?.enviadoEm, null, 'incerto nunca pode sair como enviado');
assert.equal(v3.posicao, 'mais_recente');
assert.equal(v3.envio?.estado, 'confirmado');
assert.equal(v3.envio?.reciboConfirmadoEm, '2026-08-03T12:05:10Z');
assert.equal(v3.envio?.enviadoEm, '2026-08-03T12:05:00Z');

{
  const semEnvelope = linhasP5.map(item => item.relatorio_id === ID_3 ? { ...item, enviado_em: null } : item);
  const reprovada = montarHistoricoSeguro(CLIENTE_SLUG, CLIENTE_NOME, linhasP4, semEnvelope);
  assert.equal(reprovada.ok, true);
  const envio = (reprovada as any).historico.competencias[0].versoes[0].envio;
  assert.equal(envio.estado, 'registro_incompleto', 'confirmado sem envelope não é enviado');
}
{
  const semIntencao = linhaP5(linhasP4[0], {
    ja_enviado: true,
    enviado_em: '2026-08-01T12:00:00Z',
  });
  const reprovada = montarHistoricoSeguro(CLIENTE_SLUG, CLIENTE_NOME, linhasP4, [...linhasP5, semIntencao]);
  assert.equal(reprovada.ok, true);
  const envio = (reprovada as any).historico.competencias[0].versoes[2].envio;
  assert.equal(envio.estado, 'registro_incompleto', 'envelope sem intenção/recibo não pode desaparecer nem virar enviado');
}
{
  const comVinculoInexistente = linhasP4.map(item => item.id === ID_1 ? { ...item, substituido_por: ID_FORA } : item);
  const segura = montarHistoricoSeguro(CLIENTE_SLUG, CLIENTE_NOME, comVinculoInexistente, linhasP5);
  assert.equal(segura.ok, true);
  const primeira = (segura as any).historico.competencias[0].versoes[2];
  assert.equal(primeira.posicao, 'anterior');
  assert.equal(primeira.substituicaoIncompleta, true);
}
{
  const p5Divergente = linhasP5.map(item => item.relatorio_id === ID_3 ? { ...item, checksum: 'outro' } : item);
  assert.equal(montarHistoricoSeguro(CLIENTE_SLUG, CLIENTE_NOME, linhasP4, p5Divergente).ok, false);
}

const serializado = JSON.stringify(historico);
for (const segredo of [
  'conteudo', 'token', 'service_role', 'destino_referencia', 'envio_id',
  REFERENCIA_INTERNA, ID_ENVIO_2, ID_ENVIO_3, ID_NOTIFICACAO, ID_ORDEM,
]) {
  assert.equal(serializado.includes(segredo), false, `a resposta não pode expor ${segredo}`);
}

const fetchOriginal = globalThis.fetch;
const ambiente = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAINEL_EMAILS_AUTORIZADOS: process.env.PAINEL_EMAILS_AUTORIZADOS,
};
process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = 'po@exemplo.com';

const usuario = {
  id: 'usuario-autorizado',
  email: 'po@exemplo.com',
  app_metadata: { provider: 'google', providers: ['google'] },
};

function respostaMock() {
  return {
    statusCode: 0,
    corpo: null as any,
    cabecalhos: {} as Record<string, string>,
    setHeader(nome: string, valor: string) { this.cabecalhos[nome.toLowerCase()] = valor; return this; },
    status(codigo: number) { this.statusCode = codigo; return this; },
    json(corpo: any) { this.corpo = corpo; return this; },
  };
}

async function chamarEndpoint({ autorizado = true, id = ID_3, metodo = 'GET' } = {}) {
  const consultas: string[] = [];
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) {
      return autorizado
        ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } })
        : new Response('{}', { status: 401 });
    }
    consultas.push(url);
    if (url.includes('relatorio_id=eq.')) {
      return new Response(JSON.stringify([{ relatorio_id: ID_3, cliente_slug: CLIENTE_SLUG, cliente_nome: CLIENTE_NOME }]), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/painel_relatorios_com_correcao')) {
      return new Response(JSON.stringify(linhasP4), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(linhasP5), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  const res = respostaMock();
  await handler({
    method: metodo,
    headers: { authorization: autorizado ? 'Bearer sessao' : undefined },
    query: { id, cliente_slug: 'cliente_injetado_pelo_navegador' },
  } as any, res as any);
  return { res, consultas };
}

try {
  {
    const { res, consultas } = await chamarEndpoint({ autorizado: false });
    assert.equal(res.statusCode, 401);
    assert.equal(consultas.length, 0, 'auth falha antes de qualquer leitura de cliente');
    assert.equal(res.corpo.historico, undefined);
  }
  {
    const { res, consultas } = await chamarEndpoint({ id: 'uuid-invalido' });
    assert.equal(res.statusCode, 400);
    assert.equal(consultas.length, 0, 'UUID inválido falha antes das views protegidas');
  }
  {
    const { res, consultas } = await chamarEndpoint({ metodo: 'POST' });
    assert.equal(res.statusCode, 405);
    assert.equal(consultas.length, 0);
  }
  {
    const { res, consultas } = await chamarEndpoint();
    assert.equal(res.statusCode, 200);
    assert.equal(consultas.length, 3);
    assert.ok(consultas[0].includes(`relatorio_id=eq.${ID_3}`), 'o servidor resolve o cliente pelo relatório');
    assert.ok(
      consultas.slice(1).every(url => url.includes(`cliente_slug=eq.${CLIENTE_SLUG}`)),
      'as versões usam somente o cliente resolvido no backend',
    );
    assert.ok(consultas.every(url => !url.includes('cliente_injetado_pelo_navegador')));
    assert.match(res.cabecalhos['cache-control'], /no-store/);
    assert.equal(JSON.stringify(res.corpo).includes(REFERENCIA_INTERNA), false);
    assert.equal(JSON.stringify(res.corpo).includes('service-role-de-teste'), false);
  }
} finally {
  globalThis.fetch = fetchOriginal;
  for (const [chave, valor] of Object.entries(ambiente)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
}

{
  const html = renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(
      RevisaoMoldura,
      {
        relatorio: {
          id: ID_1,
          clienteNome: CLIENTE_NOME,
          competencia: '2026-07',
          versao: 1,
          estado: 'liberado',
          sinais: [],
          conteudoCarregado: true,
          snapshot: {} as any,
          checksum: 'checksum-v1-persistido',
          ehVersaoCorrente: false,
          podeDecidir: false,
        },
        quem: 'po@exemplo.com',
        aoDecidir: async () => ({ ok: true, mensagem: 'não deveria decidir' }),
        aoCarregarEnvio: async () => ({ ok: false, mensagem: 'não deveria carregar envio' }),
        aoSolicitarEnvio: async () => ({ ok: false, mensagem: 'não deveria enviar' }),
      },
      createElement('div', null, 'Snapshot histórico'),
    ),
  ));
  assert.match(html, /versão histórica/i);
  assert.doesNotMatch(html, /<button/, 'versão histórica não mostra controle de decisão ou envio');
  assert.doesNotMatch(html, /Carregando destino canônico/);
}

/* Smoke DOM local: fechado não lê; aberto monta grupos e links exatos. */
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', {
    url: `https://exemplo.invalido/painel-de-relatorios?relatorio=${ID_3}`,
    pretendToBeVisual: true,
  });
  for (const nome of [
    'window', 'document', 'navigator', 'HTMLElement', 'HTMLDetailsElement', 'Element', 'Node',
    'Event', 'MouseEvent', 'MutationObserver', 'getComputedStyle',
    'requestAnimationFrame', 'cancelAnimationFrame',
  ]) {
    Object.defineProperty(globalThis, nome, {
      value: (dom.window as any)[nome], configurable: true, writable: true,
    });
  }
  const { flushSync } = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const elemento = dom.window.document.getElementById('raiz')!;
  const raiz = createRoot(elemento);
  let carregamentos = 0;
  const aoCarregar = async () => {
    carregamentos += 1;
    return { ok: true as const, historico };
  };

  flushSync(() => raiz.render(createElement(
    MemoryRouter,
    null,
    createElement(HistoricoDoCliente, { relatorioIdAtual: ID_3, aoCarregar }),
  )));
  assert.equal(carregamentos, 0, 'histórico fechado não consulta o servidor');
  const detalhes = elemento.querySelector('details') as HTMLDetailsElement;
  detalhes.open = true;
  flushSync(() => detalhes.dispatchEvent(new dom.window.Event('toggle')));
  const limite = Date.now() + 1_000;
  while (!(elemento.textContent ?? '').includes('Versão 3') && Date.now() < limite) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(carregamentos, 1);
  const texto = elemento.textContent ?? '';
  assert.match(texto, /Versão anterior, sem substituição registrada/);
  assert.match(texto, /Substituída pela versão 3/);
  assert.match(texto, /Aviso interno à fábrica: enviado\. Não é envio ao cliente\./);
  assert.match(texto, /Entrega incerta[\s\S]*não tratar como enviado/);
  assert.match(texto, /Enviado para Grupo Canônico do Cliente, com recibo confirmado/);
  assert.ok(elemento.querySelector(`a[href="/painel-de-relatorios?relatorio=${ID_1}"]`));
  assert.ok(elemento.querySelector(`a[href="/painel-de-relatorios?relatorio=${ID_2}"]`));
  assert.equal([...elemento.querySelectorAll('button')].some(botao => /aprovar|recusar|enviar/i.test(botao.textContent ?? '')), false);

  flushSync(() => detalhes.dispatchEvent(new dom.window.Event('toggle')));
  assert.equal(carregamentos, 1, 'reabrir conteúdo já carregado não duplica a leitura');
  flushSync(() => raiz.unmount());
  dom.window.close();
}

console.log('OK — P6: histórico server-side, eventos duráveis, controles históricos e smoke DOM validados');
