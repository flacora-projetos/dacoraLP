import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import handler from '../api/painel-decisao.ts';
import handlerReabrir from '../api/painel-reabrir-edicao.ts';
/**
 * As funções vêm da porta de produção (`api/_painel-estado-editorial.ts`), não
 * do módulo de origem: o que este script exercita precisa ser literalmente o
 * que a função serverless executa. A igualdade de referência logo abaixo prova
 * que continua existindo uma implementação só.
 */
import {
  estadoEditorialDaSugestao,
  resumoEditorialDaRevisao,
  secoesEditoriaisObrigatorias,
  estadoEditorialDaSecao,
  type SugestaoEditorialPersistida,
} from '../api/_painel-estado-editorial.ts';
import * as autoridadeDeOrigem from '../src/painel/estadoEditorial.ts';
import DecisaoDaRevisao from '../src/painel/DecisaoDaRevisao.tsx';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const ID = '22222222-2222-4222-8222-222222222222';
const CHECKSUM = 'abc123def456abc123def456abc123de';
const EMAIL = 'pessoa.autorizada@exemplo.com';
const MOTIVO = 'A seção de Meta precisa ser revista antes de gerar uma nova versão.';

/* A cadeia de importação da função serverless precisa carregar extensão
   explícita em todo import relativo de valor. Sem isso o módulo resolve no
   `tsx` e no Vite, passa em tudo aqui, e só quebra no deploy — que foi
   exatamente o que levou alguém a duplicar a regra em vez de corrigir o
   caminho. Import só de tipo é apagado na compilação e fica de fora. */
{
  const raiz = new URL('..', import.meta.url);
  const naCadeia = [
    'api/_painel-estado-editorial.ts',
    'src/painel/estadoEditorial.ts',
    'src/reports/blocos/analise.ts',
  ];
  for (const arquivo of naCadeia) {
    const fonte = readFileSync(new URL(arquivo, raiz), 'utf8');
    for (const linha of fonte.split('\n')) {
      if (/^\s*import\s+type\b/.test(linha)) continue;
      const especificador = /\bfrom\s+'(\.[^']*)'/.exec(linha)?.[1];
      if (!especificador) continue;
      assert.match(
        especificador,
        /\.(js|mjs|cjs|json)$/,
        `${arquivo}: o import relativo '${especificador}' precisa de extensão explícita para sobreviver ao runtime da função serverless`,
      );
    }
  }
}

/* Autoridade única: a função que a API executa e a função do módulo de origem
   precisam ser o MESMO objeto. Se alguém reintroduzir uma cópia dentro de
   `api/`, a igualdade de referência quebra aqui, antes do deploy. */
assert.equal(
  resumoEditorialDaRevisao,
  autoridadeDeOrigem.resumoEditorialDaRevisao,
  'a API precisa usar a mesma função de prontidão editorial da origem, não uma cópia',
);
assert.equal(
  secoesEditoriaisObrigatorias,
  autoridadeDeOrigem.secoesEditoriaisObrigatorias,
  'a lista de seções obrigatórias não pode ter duas implementações',
);
assert.equal(
  estadoEditorialDaSecao,
  autoridadeDeOrigem.estadoEditorialDaSecao,
  'a resolução de estado por seção não pode ter duas implementações',
);
assert.equal(
  estadoEditorialDaSugestao,
  autoridadeDeOrigem.estadoEditorialDaSugestao,
  'o mapeamento de estados não pode ter duas implementações',
);

assert.equal(estadoEditorialDaSugestao(undefined), 'nao_iniciada');
assert.equal(estadoEditorialDaSugestao('pronta'), 'sugerida');
assert.equal(estadoEditorialDaSugestao('aplicada'), 'pronta');
assert.equal(estadoEditorialDaSugestao('editada'), 'editada');
assert.equal(estadoEditorialDaSugestao('desfeita'), 'nao_iniciada');
assert.equal(estadoEditorialDaSugestao('inconclusiva'), 'inconclusiva');
assert.equal(estadoEditorialDaSugestao('falhou'), 'falhou');
assert.equal(estadoEditorialDaSugestao('estado-desconhecido'), 'falhou', 'estado desconhecido precisa falhar fechado');

const obrigatorias = secoesEditoriaisObrigatorias(karyneMontada202607);
assert.ok(obrigatorias.length > 1, 'a RA4 deve exigir introdução e os blocos analíticos reais');
assert.equal(obrigatorias[0].secao, 'introducao');
assert.ok(obrigatorias.every((secao) => secao.secao === 'introducao' || secao.secao.startsWith('bloco:')));

const todasProntas: SugestaoEditorialPersistida[] = obrigatorias.map((secao, indice) => ({
  secao: secao.secao,
  estado: indice % 2 === 0 ? 'aplicada' : 'editada',
}));
const resumoPronto = resumoEditorialDaRevisao(karyneMontada202607, todasProntas);
assert.equal(resumoPronto.podeAprovar, true);
assert.equal(resumoPronto.prontas, resumoPronto.totalObrigatorias);

const comSugestaoNaoRevisada = [...todasProntas];
comSugestaoNaoRevisada[0] = { secao: 'introducao', estado: 'pronta' };
const resumoPendente = resumoEditorialDaRevisao(karyneMontada202607, comSugestaoNaoRevisada);
assert.equal(resumoPendente.podeAprovar, false);
assert.equal(resumoPendente.pendentes[0].secao, 'introducao');
assert.equal(resumoPendente.pendentes[0].estado, 'sugerida');

/* Achado 5 — gerar de novo não pode apagar a decisão humana anterior.
   Cenário real: gera A, gera B, humano aplica A. B continua sendo a linha mais
   nova e continua em `pronta`. A seção está resolvida e precisa contar como
   resolvida. A ordem aqui é `gerado_em desc`, como vem do banco. */
{
  const secao = obrigatorias[1].secao;
  const comSegundaGeracaoNaoRevista: SugestaoEditorialPersistida[] = [
    { secao, estado: 'pronta', geradoEm: '2026-08-14T10:05:00Z' },
    { secao, estado: 'aplicada', geradoEm: '2026-08-14T10:00:00Z' },
  ];
  assert.equal(
    estadoEditorialDaSecao(comSegundaGeracaoNaoRevista),
    'pronta',
    'uma sugestão nova não revista não pode anular a que o humano aplicou',
  );

  const resumo = resumoEditorialDaRevisao(karyneMontada202607, [
    ...todasProntas.filter((item) => item.secao !== secao),
    ...comSegundaGeracaoNaoRevista,
  ]);
  assert.equal(resumo.podeAprovar, true, 'a aprovação não pode travar por causa de uma segunda geração');

  /* Mas estado ilegível continua falhando fechado, inclusive por cima de uma
     decisão válida: não dá para afirmar revisão completa sobre linha que não
     sabemos ler. */
  assert.equal(
    estadoEditorialDaSecao([
      { secao, estado: 'estado-que-ninguem-conhece' },
      { secao, estado: 'aplicada' },
    ]),
    'falhou',
  );
}

/* Achado 1 — "revisada sem análise" é decisão humana e conta como revisão.
   Não é `desfeita`: desfazer continua devolvendo a seção para não iniciada. */
{
  const secao = obrigatorias[2].secao;
  assert.equal(estadoEditorialDaSecao([], true), 'revisada_sem_analise');
  assert.equal(estadoEditorialDaSecao([{ secao, estado: 'desfeita' }], false), 'nao_iniciada');
  assert.equal(
    estadoEditorialDaSecao([{ secao, estado: 'desfeita' }], true),
    'revisada_sem_analise',
    'dispensar depois de desfazer é uma decisão nova, não um resíduo',
  );
  assert.equal(
    estadoEditorialDaSecao([{ secao, estado: 'pronta' }], true),
    'revisada_sem_analise',
    'a decisão de não publicar ganha de uma sugestão só gerada',
  );

  const semSugestaoNenhuma = todasProntas.filter((item) => item.secao !== secao);
  assert.equal(
    resumoEditorialDaRevisao(karyneMontada202607, semSugestaoNenhuma).podeAprovar,
    false,
    'seção sem decisão nenhuma continua bloqueando',
  );
  const comDispensa = resumoEditorialDaRevisao(karyneMontada202607, semSugestaoNenhuma, [secao]);
  assert.equal(comDispensa.podeAprovar, true, 'dispensa registrada libera a aprovação');
  assert.equal(comDispensa.secoes.find((item) => item.secao === secao)?.estado, 'revisada_sem_analise');
}

function relatorioDaTela(revisaoEditorial: typeof resumoPronto) {
  return {
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
    revisaoEditorial,
  };
}

{
  const html = renderToStaticMarkup(createElement(DecisaoDaRevisao, {
    relatorio: relatorioDaTela(resumoPendente),
    quem: EMAIL,
    aoDecidir: async () => ({ ok: true, mensagem: 'não chamado' }),
  }));
  assert.match(html, /Análises para aprovação/);
  assert.match(html, /Introdução: sugestão aguardando revisão/);
  assert.match(html, /A recusa continua disponível/);
  const aprovar = html.match(/<button[^>]*aria-label="Aprovar o relatório[^>]*>/)?.[0] ?? '';
  const recusar = html.match(/<button[^>]*aria-label="Recusar com motivo[^>]*>/)?.[0] ?? '';
  assert.match(aprovar, /disabled=""/, 'a UI precisa bloquear aprovação quando há pendência');
  assert.doesNotMatch(recusar, /disabled=""/, 'recusa precisa continuar disponível');
}
{
  const html = renderToStaticMarkup(createElement(DecisaoDaRevisao, {
    relatorio: relatorioDaTela(resumoPronto),
    quem: EMAIL,
    aoDecidir: async () => ({ ok: true, mensagem: 'não chamado' }),
  }));
  assert.match(html, /Análises prontas/);
  const aprovar = html.match(/<button[^>]*aria-label="Aprovar o relatório[^>]*>/)?.[0] ?? '';
  assert.doesNotMatch(aprovar, /disabled=""/);
}

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
process.env.PAINEL_EMAILS_AUTORIZADOS = EMAIL;

const usuario = {
  id: 'usuario-exemplo',
  email: EMAIL,
  app_metadata: { provider: 'google', providers: ['google'] },
};
const fetchOriginal = globalThis.fetch;
let sugestoesDoBanco = comSugestaoNaoRevisada;
let dispensasDoBanco: string[] = [];
let chamadas: Array<{ url: string; corpo: any }> = [];

function linhaAprovada() {
  return {
    id: ID,
    cliente_slug: 'cliente_exemplo',
    competencia: '2026-07',
    versao: 3,
    estado: 'liberado',
    checksum: CHECKSUM,
    aprovado_por: EMAIL,
    aprovado_em: '2026-08-13T23:00:00Z',
    aprovado_checksum: CHECKSUM,
    recusado_por: null,
    recusado_em: null,
    recusa_motivo: null,
    correcao_ordem_id: null,
    correcao_estado: null,
    correcao_solicitado_em: null,
    notificacao_interna_id: null,
    notificacao_interna_estado: null,
    notificacao_destino_referencia: null,
    enviado_em: null,
    substituido_por: null,
    revogado_em: null,
  };
}

function linhaRecusada() {
  return {
    ...linhaAprovada(),
    estado: 'recusado',
    aprovado_por: null,
    aprovado_em: null,
    aprovado_checksum: null,
    recusado_por: EMAIL,
    recusado_em: '2026-08-13T23:00:00Z',
    recusa_motivo: MOTIVO,
    correcao_ordem_id: 'ordem-1',
    correcao_estado: 'aguardando_nova_versao',
    correcao_solicitado_em: '2026-08-13T23:00:00Z',
    notificacao_interna_id: 'notificacao-1',
    notificacao_interna_estado: 'pendente',
    notificacao_destino_referencia: 'dacora_semanais.recipients',
  };
}

globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
  const url = String(entrada);
  const corpo = init?.body ? JSON.parse(String(init.body)) : null;
  if (!url.includes('/auth/v1/user')) chamadas.push({ url, corpo });
  if (url.includes('/auth/v1/user')) return new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.includes('/rest/v1/relatorios?')) {
    return new Response(JSON.stringify([{
      id: ID,
      cliente_slug: 'cliente_exemplo',
      competencia: '2026-07',
      versao: 3,
      checksum: CHECKSUM,
      checksum_factual_editorial: null,
      estado: 'gerado',
      substituido_por: null,
      revogado_em: null,
      conteudo: karyneMontada202607,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_revisoes_editoriais?')) {
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_analise_sugestoes?')) {
    return new Response(JSON.stringify(sugestoesDoBanco.map((item, indice) => ({
      secao: item.secao,
      estado: item.estado,
      gerado_em: `2026-08-13T22:${String(59 - indice).padStart(2, '0')}:00Z`,
    }))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_secoes_dispensadas?')) {
    return new Response(JSON.stringify(dispensasDoBanco.map((secao) => ({
      secao,
      dispensada_por: EMAIL,
      dispensada_em: '2026-08-14T09:00:00Z',
    }))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/decidir_relatorio')) {
    return new Response(JSON.stringify([{ relatorio_id: ID, ja_estava_assim: false }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/painel_relatorios_com_correcao')) {
    const decisao = [...chamadas].reverse().find((item) => item.url.includes('/rpc/decidir_relatorio'))?.corpo?.p_decisao;
    return new Response(JSON.stringify([decisao === 'recusar' ? linhaRecusada() : linhaAprovada()]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`URL não dublada: ${url}`);
}) as typeof fetch;

async function chamar(corpo: unknown) {
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

{
  sugestoesDoBanco = comSugestaoNaoRevisada;
  const saida = await chamar({
    id: ID,
    checksum: CHECKSUM,
    decisao: 'aprovar',
    revisaoEditorial: { podeAprovar: true, prontas: 999 },
  });
  assert.equal(saida.status, 409);
  assert.equal(saida.corpo.erro, 'analises_pendentes');
  assert.equal(saida.corpo.gravado, false);
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/decidir_relatorio')), false, 'payload forjado não pode chegar à decisão');
}

{
  sugestoesDoBanco = todasProntas;
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'aprovar' });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.gravado, true);
  assert.equal(chamadas.filter((item) => item.url.includes('/rpc/decidir_relatorio')).length, 1);
}

/* A dispensa é lida no servidor, não vem da tela: a mesma pendência que
   bloqueia sem dispensa passa a liberar com a dispensa gravada no banco. */
{
  sugestoesDoBanco = comSugestaoNaoRevisada;
  dispensasDoBanco = ['introducao'];
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'aprovar' });
  assert.equal(saida.status, 200, 'seção revisada sem análise conta como revisada');
  assert.equal(saida.corpo.gravado, true);
  dispensasDoBanco = [];
}

/* Falha ao ler as dispensas não pode virar "ninguém dispensou nada": isso
   travaria aprovação legítima e é o caminho pelo qual ausência vira zero. */
{
  sugestoesDoBanco = todasProntas;
  const fetchAnterior = globalThis.fetch;
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    if (String(entrada).includes('/rest/v1/relatorio_secoes_dispensadas?')) {
      return new Response('erro interno', { status: 500 });
    }
    return fetchAnterior(entrada, init);
  }) as typeof fetch;
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'aprovar' });
  assert.equal(saida.status, 502, 'leitura indisponível precisa falhar fechado, não liberar nem inventar lista vazia');
  assert.equal(saida.corpo.gravado, false);
  globalThis.fetch = fetchAnterior;
}

{
  sugestoesDoBanco = comSugestaoNaoRevisada;
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO });
  assert.equal(saida.status, 200, 'recusa não depende de análises prontas');
  assert.equal(chamadas.some((item) => item.url.includes('/rest/v1/relatorio_analise_sugestoes?')), false, 'recusa não precisa do preflight editorial');
}

async function chamarReabrir(corpo: unknown) {
  chamadas = [];
  const capturado: any = { status: 0, corpo: null };
  const req: any = { method: 'POST', headers: { authorization: 'Bearer token-de-teste' }, body: corpo };
  const res: any = {
    setHeader() { return res; },
    status(status: number) { capturado.status = status; return res; },
    json(saida: any) { capturado.corpo = saida; return res; },
  };
  await handlerReabrir(req, res);
  return capturado;
}

{
  globalThis.fetch = (async (entrada: any, init?: RequestInit) => {
    const url = String(entrada);
    const corpo = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/reabrir_relatorio_para_edicao')) {
      chamadas.push({ url, corpo });
      return new Response(JSON.stringify([{
        relatorio_id: ID,
        estado: 'gerado',
        checksum: CHECKSUM,
        reaberto_por: EMAIL,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`URL não dublada na reabertura: ${url}`);
  }) as typeof fetch;
  const saida = await chamarReabrir({ id: ID, checksum: CHECKSUM, reabertoPor: 'pessoa-forjada@exemplo.com' });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.reaberto, true);
  const rpc = chamadas.find((item) => item.url.includes('/rpc/reabrir_relatorio_para_edicao'));
  assert.equal(rpc?.corpo?.p_por, EMAIL, 'a identidade da reabertura vem da sessão, não do navegador');
  assert.equal(rpc?.corpo?.p_checksum_visto, CHECKSUM);
}

{
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/reabrir_relatorio_para_edicao')) {
      return new Response('envio_ja_solicitado', { status: 400 });
    }
    throw new Error(`URL não dublada na trava de reabertura: ${url}`);
  }) as typeof fetch;
  const saida = await chamarReabrir({ id: ID, checksum: CHECKSUM });
  assert.equal(saida.status, 409);
  assert.equal(saida.corpo.erro, 'envio_ja_solicitado');
  assert.equal(saida.corpo.reaberto, false);
}

globalThis.fetch = fetchOriginal;

console.log('verifica-painel-ra4: ok');
