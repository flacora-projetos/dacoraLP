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

/**
 * A recusa por CAUSAS ESTRUTURADAS (catálogo `2026-09-01.v1`, 01/09/2026).
 *
 * ⚠️ Este bloco existe porque o teste ficou para trás quando a recusa mudou.
 * Até 04/09 ele ainda mandava só `motivo`, o servidor respondia — corretamente
 * — "escolha de 1 a 5 causas", e a trava inteira ficava vermelha. Teste
 * vermelho não protege nada: de 01/09 até aqui, quebrar a aprovação ou a
 * recusa de verdade não teria acusado, porque ninguém investiga um teste que
 * "já falhava antes".
 */
const CATALOGO = '2026-09-01.v1';
/**
 * O que o banco devolve como causas gravadas. Normalmente é o espelho do que
 * foi confirmado; os testes de divergência trocam isto para provar que o
 * read-back reprova em vez de dar a recusa por boa.
 */
let causasDoReadBack = () => CAUSAS.map((causa, indice) => ({
  ordinal: indice + 1,
  catalog_version: CATALOGO,
  cause_id: causa.causeId,
  parameters: causa.parameters,
  verification_status: 'pending',
})) as any[];

/** O motivo, o roteamento e a versão do catálogo que o banco devolve. */
let motivoDoReadBack = () => MOTIVO;
let catalogoDoReadBack = () => CATALOGO;
let roteamentoDoReadBack = () => 'automatic';

/** Os dois endpoints de decisão, como `api/painel-decisao.ts` os chama. */
const RPC_RECUSA = '/rpc/decidir_relatorio_com_causas_v1';
const RPC_APROVACAO = '/rpc/aprovar_e_fechar_relatorio_editorial';
const CAUSAS = [{
  causeId: 'metrica_obrigatoria_ausente',
  parameters: { section_id: 'bloco:numeros-meta', platform: 'meta', metric_id: 'compras' },
}];

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
    recusa_motivo: motivoDoReadBack(),
    correcao_ordem_id: 'ordem-1',
    correcao_estado: 'aguardando_nova_versao',
    correcao_solicitado_em: '2026-08-13T23:00:00Z',
    notificacao_interna_id: 'notificacao-1',
    notificacao_interna_estado: 'pendente',
    notificacao_destino_referencia: 'dacora_semanais.recipients',
    /* O read-back da recusa confere as causas estruturadas uma a uma: ordinal,
       versão do catálogo, id, parâmetros e estado da verificação. A fixture
       precisa devolver exatamente o que foi confirmado, senão o handler
       reprova — e reprovar aqui é o comportamento certo dele. */
    correcao_catalog_version: catalogoDoReadBack(),
    correcao_routing_mode: roteamentoDoReadBack(),
    correcao_causas: causasDoReadBack(),
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
      checksum_factual_editorial: 'f'.repeat(32),
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
  if (url.includes('/rpc/decidir_relatorio') || url.includes('/rpc/aprovar_e_fechar_relatorio_editorial')) {
    return new Response(JSON.stringify([{ relatorio_id: ID, ja_estava_assim: false }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/painel_relatorios_com_correcao')) {
    /* Qual linha o read-back devolve sai do ENDPOINT chamado, não de um campo
       do corpo. A recusa por causas estruturadas (01/09) deixou de mandar
       `p_decisao`, então o fake antigo lia `undefined` e devolvia sempre a
       linha aprovada — o read-back do handler reprovava com razão, e o teste
       culpava a recusa. Endpoint é o que de fato distingue as duas decisões. */
    const recusou = [...chamadas].reverse().some((item) => item.url.includes(RPC_RECUSA));
    return new Response(JSON.stringify([recusou ? linhaRecusada() : linhaAprovada()]), { status: 200, headers: { 'content-type': 'application/json' } });
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
  assert.equal(chamadas.some((item) => item.url.includes(RPC_RECUSA) || item.url.includes(RPC_APROVACAO)), false, 'payload forjado não pode chegar à decisão');
}

{
  sugestoesDoBanco = todasProntas;
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'aprovar' });
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.gravado, true);
  assert.equal(chamadas.filter((item) => item.url.includes('/rpc/aprovar_e_fechar_relatorio_editorial')).length, 1);
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
  const saida = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO, causas: CAUSAS,
  });
  assert.equal(saida.status, 200, 'recusa não depende de análises prontas');
  assert.equal(chamadas.some((item) => item.url.includes('/rest/v1/relatorio_analise_sugestoes?')), false, 'recusa não precisa do preflight editorial');

  /* As causas precisam CHEGAR à RPC, não só existir no pedido. É a mesma
     família do defeito de 01/09, em que o modal montava tudo e a montagem do
     `fetch` repassava só o motivo: defeito de fiação é invisível para quem
     confere apenas o código de saída. */
  const rpc = chamadas.find((item) => item.url.includes(RPC_RECUSA));
  assert.equal(rpc?.corpo?.p_catalog_version, CATALOGO, 'a versão do catálogo precisa chegar ao banco');
  assert.deepEqual(
    rpc?.corpo?.p_causas,
    [{ cause_id: 'metrica_obrigatoria_ausente', parameters: CAUSAS[0].parameters }],
    'as causas precisam chegar ao banco no formato da RPC',
  );
  assert.equal(rpc?.corpo?.p_motivo, MOTIVO, 'o motivo continua viajando como auditoria humana');
}

/* Prova negativa: recusa SEM causa estruturada não passa e não toca o banco.
   O texto livre voltou a ser auditoria; ele não dirige mais nada sozinho. */
{
  sugestoesDoBanco = comSugestaoNaoRevisada;
  const saida = await chamar({ id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO });
  assert.equal(saida.status, 400, 'recusa sem causa estruturada precisa ser rejeitada');
  assert.equal(saida.corpo.erro, 'causas_estruturadas_invalidas');
  assert.equal(
    chamadas.some((item) => item.url.includes(RPC_RECUSA)),
    false,
    'pedido sem causa nunca pode chegar à decisão no banco',
  );
}

/* O READ-BACK PRECISA REPROVAR CAUSA DIVERGENTE.
   Sem estas provas, apagar a conferência das causas no handler passa despercebido:
   a fixture devolve sempre o espelho do que foi pedido, e um espelho nunca
   diverge de si mesmo. Cada caso troca UMA coisa no que o banco devolve. */
{
  const original = causasDoReadBack;
  const divergencias: Array<[string, () => any[]]> = [
    ['parâmetros diferentes', () => [{ ordinal: 1, catalog_version: CATALOGO, cause_id: CAUSAS[0].causeId, parameters: { section_id: 'bloco:outro', platform: 'meta', metric_id: 'compras' }, verification_status: 'pending' }]],
    ['outra causa gravada', () => [{ ordinal: 1, catalog_version: CATALOGO, cause_id: 'outra_causa', parameters: CAUSAS[0].parameters, verification_status: 'pending' }]],
    ['ordem trocada', () => [{ ordinal: 2, catalog_version: CATALOGO, cause_id: CAUSAS[0].causeId, parameters: CAUSAS[0].parameters, verification_status: 'pending' }]],
    ['já verificada', () => [{ ordinal: 1, catalog_version: CATALOGO, cause_id: CAUSAS[0].causeId, parameters: CAUSAS[0].parameters, verification_status: 'verified' }]],
    ['lista vazia', () => []],
    /* Uma causa A MAIS. O laço só percorre o que foi pedido, então sem a
       conferência de tamanho esta passaria: é a prova de que a contagem é
       verificada, e não só o conteúdo item a item. */
    ['causa a mais no banco', () => [
      { ordinal: 1, catalog_version: CATALOGO, cause_id: CAUSAS[0].causeId, parameters: CAUSAS[0].parameters, verification_status: 'pending' },
      { ordinal: 2, catalog_version: CATALOGO, cause_id: 'outra_causa', parameters: { description: 'causa que ninguem pediu' }, verification_status: 'pending' },
    ]],
  ];
  for (const [rotulo, forjada] of divergencias) {
    sugestoesDoBanco = comSugestaoNaoRevisada;
    causasDoReadBack = forjada;
    const saida = await chamar({
      id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
      catalogVersion: CATALOGO, causas: CAUSAS,
    });
    assert.equal(saida.status, 502, `read-back precisa reprovar: ${rotulo}`);
    assert.equal(saida.corpo.gravado, false, `recusa com ${rotulo} não pode ser dada por boa`);
  }
  causasDoReadBack = original;
}

/* O motivo gravado precisa ser o que foi escrito. Ele deixou de dirigir o
   roteamento, mas continua sendo a auditoria humana da recusa — banco que
   grava outro texto é divergência, não detalhe. */
{
  const original = motivoDoReadBack;
  sugestoesDoBanco = comSugestaoNaoRevisada;
  motivoDoReadBack = () => 'um motivo que ninguém escreveu';
  const saida = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO, causas: CAUSAS,
  });
  assert.equal(saida.status, 502, 'motivo gravado diferente do escrito precisa reprovar');
  assert.equal(saida.corpo.gravado, false);
  motivoDoReadBack = original;
}

/* O ROTEAMENTO precisa corresponder às causas. Causa manual torna a ordem
   inteira manual; banco que devolver `automatic` mandaria a ordem para a
   fábrica automática, que é justamente o que o catálogo existe para impedir. */
{
  const original = roteamentoDoReadBack;
  const originalCausas = causasDoReadBack;
  const causaManual = [{ causeId: 'outra_causa', parameters: { description: 'a apresentacao ficou confusa' } }];

  sugestoesDoBanco = comSugestaoNaoRevisada;
  roteamentoDoReadBack = () => 'automatic';
  causasDoReadBack = () => [{ ordinal: 1, catalog_version: CATALOGO, cause_id: 'outra_causa', parameters: causaManual[0].parameters, verification_status: 'pending' }];
  const errada = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO, causas: causaManual,
  });
  assert.equal(errada.status, 502, 'causa manual roteada como automática precisa reprovar');
  assert.equal(errada.corpo.gravado, false);

  /* E o caminho bom da causa manual continua passando — senão a prova acima
     estaria apenas medindo que causa manual nunca funciona. */
  sugestoesDoBanco = comSugestaoNaoRevisada;
  roteamentoDoReadBack = () => 'manual';
  const certa = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO, causas: causaManual,
  });
  assert.equal(certa.status, 200, 'causa manual roteada como manual é aceita');

  roteamentoDoReadBack = original;
  causasDoReadBack = originalCausas;
}

/* A VERSÃO DO CATÁLOGO gravada precisa ser a confirmada. Ordem gravada sob
   outra versão seria interpretada por outro conjunto de regras adiante. */
{
  const original = catalogoDoReadBack;
  sugestoesDoBanco = comSugestaoNaoRevisada;
  catalogoDoReadBack = () => '2026-01-01.v0';
  const saida = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO, causas: CAUSAS,
  });
  assert.equal(saida.status, 502, 'catálogo gravado diferente do confirmado precisa reprovar');
  assert.equal(saida.corpo.gravado, false);
  catalogoDoReadBack = original;
}

/* E causa fora do catálogo também não passa — o catálogo é fechado. */
{
  sugestoesDoBanco = comSugestaoNaoRevisada;
  const saida = await chamar({
    id: ID, checksum: CHECKSUM, decisao: 'recusar', motivo: MOTIVO,
    catalogVersion: CATALOGO,
    causas: [{ causeId: 'analise_interpretativa_incorreta', parameters: { description: 'a leitura ficou errada' } }],
  });
  assert.equal(saida.status, 400, 'causa fora do catálogo é recusada');
  assert.equal(
    chamadas.some((item) => item.url.includes(RPC_RECUSA)),
    false,
    'causa desconhecida nunca chega ao banco',
  );
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

{
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify(usuario), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/rpc/reabrir_relatorio_para_edicao')) return new Response('erro_sql_desconhecido', { status: 400 });
    throw new Error(`URL não dublada no erro SQL desconhecido: ${url}`);
  }) as typeof fetch;
  const saida = await chamarReabrir({ id: ID, checksum: CHECKSUM });
  assert.equal(saida.status, 502, 'erro SQL sem contrato conhecido não pode parecer conflito recuperável');
  assert.equal(saida.corpo.erro, 'reabertura_recusada');
  assert.equal(saida.corpo.reaberto, false);
}

globalThis.fetch = fetchOriginal;

console.log('verifica-painel-ra4: ok');
