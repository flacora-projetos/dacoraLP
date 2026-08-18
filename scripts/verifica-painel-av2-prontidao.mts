/**
 * AV2 — a prontidão editorial passa a enxergar o modelo AV.
 *
 * O cenário que este script existe para travar é o de DEPOIS da ponte: a
 * cadência apagou a linha física antiga, o trabalho humano foi transportado
 * para `relatorio_revisoes_editoriais` (identidade lógica) e as tabelas
 * legadas ficaram vazias para a linha nova. Sem a consulta nova, a tela
 * voltaria a pedir revisão de seções já revisadas.
 *
 * As funções vêm da porta de produção (`api/_painel-estado-editorial.ts`),
 * como no `verifica-painel-ra4.mts`: o que este script exercita precisa ser
 * literalmente o que a função serverless executa.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handlerDecisao from '../api/painel-decisao.ts';
import {
  estadoEditorialComRevisaoViva,
  resumoEditorialDaRevisao,
  secoesEditoriaisObrigatorias,
  type RevisaoEditorialVigente,
  type SugestaoEditorialPersistida,
} from '../api/_painel-estado-editorial.ts';
import * as autoridadeDeOrigem from '../src/painel/estadoEditorial.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const ID = '33333333-3333-4333-8333-333333333333';
const CHECKSUM = 'abc123def456abc123def456abc123de';
const FACTUAL = '0123456789abcdef0123456789abcdef';
const FACTUAL_NOVO = 'fedcba9876543210fedcba9876543210';
const EMAIL = 'pessoa.autorizada@exemplo.com';
const CLIENTE = 'cliente_exemplo';
const COMPETENCIA = '2026-07';
const VERSAO = 3;

/* Mesma trava de resolução de módulo do `verifica-painel-ra4.mts`: import
   relativo de valor sem extensão explícita passa aqui e quebra no deploy. O
   módulo novo entra na cadeia e precisa obedecer à mesma regra. */
{
  const raiz = new URL('..', import.meta.url);
  const naCadeia = [
    'api/_painel-estado-editorial.ts',
    'api/_painel-revisao-viva.ts',
    'src/painel/estadoEditorial.ts',
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

/* Autoridade única: continua existindo UMA implementação da regra. */
assert.equal(
  estadoEditorialComRevisaoViva,
  autoridadeDeOrigem.estadoEditorialComRevisaoViva,
  'a regra que cruza legado e modelo AV não pode ter duas implementações',
);

const obrigatorias = secoesEditoriaisObrigatorias(karyneMontada202607);
const SECAO = obrigatorias[1].secao;

function revisaoViva(parcial: Partial<RevisaoEditorialVigente> = {}): RevisaoEditorialVigente {
  return {
    secao: SECAO,
    estado: 'atual',
    tipoDecisao: 'analise',
    checksumFactual: FACTUAL,
    ...parcial,
  };
}

/* ---------------------------------------------------------------- */
/* 1. Seção sem revisão AV nenhuma continua se comportando como antes */
/* ---------------------------------------------------------------- */
{
  const legado: SugestaoEditorialPersistida[] = [{ secao: SECAO, estado: 'aplicada' }];
  assert.equal(
    estadoEditorialComRevisaoViva(legado, false, undefined),
    'pronta',
    'sem revisão AV, o caminho legado decide sozinho',
  );
  assert.equal(estadoEditorialComRevisaoViva([], false, undefined), 'nao_iniciada');
  assert.equal(estadoEditorialComRevisaoViva([], true, undefined), 'revisada_sem_analise');
  assert.equal(
    estadoEditorialComRevisaoViva([{ secao: SECAO, estado: 'pronta' }], false, undefined),
    'sugerida',
    'sugestão só gerada continua bloqueando quando não há revisão durável',
  );
  /* E a regra herdada da RA4.2 continua de pé: gerar de novo depois de aplicar
     não desfaz a decisão humana. */
  assert.equal(
    estadoEditorialComRevisaoViva(
      [{ secao: SECAO, estado: 'pronta', geradoEm: '2026-08-18T10:05:00Z' },
       { secao: SECAO, estado: 'aplicada', geradoEm: '2026-08-18T10:00:00Z' }],
      false,
      undefined,
    ),
    'pronta',
  );
}

/* ---------------------------------------------------------------- */
/* 2. Depois da ponte: legado VAZIO + revisão AV `atual` = pronta     */
/* ---------------------------------------------------------------- */
{
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva()),
    'pronta',
    'depois da ponte o legado está vazio e a prontidão precisa vir do modelo AV',
  );
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva({ tipoDecisao: 'sem_analise' })),
    'revisada_sem_analise',
    '"revisada sem análise" transportada continua contando como revisão',
  );
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva({ estado: 'final' })),
    'pronta',
    'revisão de mês fechado (`final`) também é revisão feita',
  );

  const revisoes = obrigatorias.map((secao) => revisaoViva({ secao: secao.secao }));
  const resumo = resumoEditorialDaRevisao(karyneMontada202607, [], [], revisoes, FACTUAL);
  assert.equal(resumo.podeAprovar, true, 'todas as seções revisadas no modelo AV liberam a aprovação');
  assert.equal(resumo.prontas, resumo.totalObrigatorias);
}

/* ---------------------------------------------------------------- */
/* 3. `revisao_necessaria` NUNCA fica pronta — nem contra o legado    */
/* ---------------------------------------------------------------- */
{
  const legadoAplicado: SugestaoEditorialPersistida[] = [{ secao: SECAO, estado: 'aplicada' }];
  assert.equal(
    estadoEditorialComRevisaoViva(legadoAplicado, false, revisaoViva({ estado: 'revisao_necessaria' })),
    'revisao_necessaria',
    'fato novo invalidou a análise: nem uma sugestão aplicada no legado pode ressuscitá-la',
  );
  assert.equal(
    estadoEditorialComRevisaoViva(legadoAplicado, true, revisaoViva({ estado: 'revisao_necessaria' })),
    'revisao_necessaria',
    'nem a dispensa registrada no legado pode ressuscitá-la',
  );
  assert.equal(
    autoridadeDeOrigem.estadoEditorialEstaPronto('revisao_necessaria'),
    false,
    '`revisao_necessaria` não pode entrar na lista de estados prontos',
  );

  const revisoes = obrigatorias.map((secao, indice) => revisaoViva({
    secao: secao.secao,
    estado: indice === 1 ? 'revisao_necessaria' : 'atual',
  }));
  const todasAplicadasNoLegado: SugestaoEditorialPersistida[] = obrigatorias.map((secao) => ({
    secao: secao.secao,
    estado: 'aplicada',
  }));
  const resumo = resumoEditorialDaRevisao(karyneMontada202607, todasAplicadasNoLegado, [], revisoes, FACTUAL);
  assert.equal(resumo.podeAprovar, false, 'uma seção invalidada trava a aprovação inteira');
  assert.equal(resumo.pendentes.length, 1);
  assert.equal(resumo.pendentes[0].secao, SECAO);
  assert.equal(resumo.pendentes[0].estado, 'revisao_necessaria');
}

/* ---------------------------------------------------------------- */
/* 4. Impressão digital divergente conta como revisão necessária     */
/* ---------------------------------------------------------------- */
{
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva(), FACTUAL_NOVO),
    'revisao_necessaria',
    'decisão tomada sobre outros fatos não descreve este documento',
  );
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva(), FACTUAL),
    'pronta',
    'impressão digital igual mantém a revisão válida',
  );
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva({ checksumFactual: null }), FACTUAL),
    'pronta',
    'ausência de impressão digital não é divergência — ausente é ausente',
  );
  assert.equal(
    estadoEditorialComRevisaoViva([], false, revisaoViva(), null),
    'pronta',
    'documento sem impressão digital medida não pode inventar divergência',
  );
}

/* ---------------------------------------------------------------- */
/* 5. Desfazer no legado derruba a prontidão vinda do modelo AV      */
/* ---------------------------------------------------------------- */
{
  assert.equal(
    estadoEditorialComRevisaoViva([{ secao: SECAO, estado: 'desfeita' }], false, revisaoViva()),
    'nao_iniciada',
    'desfazer é decisão explícita e o modelo AV não tem como representá-la — sem isto, desfazer viraria fail-open',
  );
  /* Mas uma sugestão apenas GERADA não é decisão, e não pode derrubar a
     revisão durável: seria o bug da RA4.2 voltando pela porta dos fundos. */
  assert.equal(
    estadoEditorialComRevisaoViva([{ secao: SECAO, estado: 'pronta' }], false, revisaoViva()),
    'pronta',
    'gerar de novo depois da ponte não pode travar uma seção já revisada',
  );
  /* Linha ilegível continua falhando fechado, inclusive por cima do AV. */
  assert.equal(
    estadoEditorialComRevisaoViva([{ secao: SECAO, estado: 'estado-que-ninguem-conhece' }], false, revisaoViva()),
    'falhou',
  );
}

/* ---------------------------------------------------------------- */
/* 6. Ponta a ponta pelo portão que decide (`api/painel-decisao`)     */
/* ---------------------------------------------------------------- */
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
let sugestoesDoBanco: SugestaoEditorialPersistida[] = [];
let dispensasDoBanco: string[] = [];
let revisoesDoBanco: RevisaoEditorialVigente[] = [];
let derrubarLeituraDasRevisoes = false;
let chamadas: Array<{ url: string; corpo: any }> = [];

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
      cliente_slug: CLIENTE,
      competencia: COMPETENCIA,
      versao: VERSAO,
      checksum: CHECKSUM,
      checksum_factual_editorial: FACTUAL,
      estado: 'gerado',
      substituido_por: null,
      revogado_em: null,
      conteudo: karyneMontada202607,
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_analise_sugestoes?')) {
    return new Response(JSON.stringify(sugestoesDoBanco.map((item, indice) => ({
      secao: item.secao,
      estado: item.estado,
      gerado_em: `2026-08-18T22:${String(59 - indice).padStart(2, '0')}:00Z`,
    }))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_secoes_dispensadas?')) {
    return new Response(JSON.stringify(dispensasDoBanco.map((secao) => ({
      secao,
      dispensada_por: EMAIL,
      dispensada_em: '2026-08-18T09:00:00Z',
    }))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/relatorio_revisoes_editoriais?')) {
    if (derrubarLeituraDasRevisoes) return new Response('erro interno', { status: 500 });
    return new Response(JSON.stringify(revisoesDoBanco.map((item) => ({
      secao: item.secao,
      estado: item.estado,
      tipo_decisao: item.tipoDecisao,
      checksum_factual: item.checksumFactual ?? null,
    }))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rpc/decidir_relatorio') || url.includes('/rpc/aprovar_e_fechar_relatorio_editorial')) {
    return new Response(JSON.stringify([{ relatorio_id: ID, ja_estava_assim: false }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/rest/v1/painel_relatorios_com_correcao')) {
    return new Response(JSON.stringify([{
      id: ID,
      cliente_slug: CLIENTE,
      competencia: COMPETENCIA,
      versao: VERSAO,
      estado: 'liberado',
      checksum: CHECKSUM,
      aprovado_por: EMAIL,
      aprovado_em: '2026-08-18T23:00:00Z',
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
    }]), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`URL não dublada: ${url}`);
}) as typeof fetch;

async function aprovar() {
  chamadas = [];
  const capturado: any = { status: 0, corpo: null };
  const req: any = {
    method: 'POST',
    headers: { authorization: 'Bearer token-de-teste' },
    body: { id: ID, checksum: CHECKSUM, decisao: 'aprovar' },
  };
  const res: any = {
    setHeader() { return res; },
    status(status: number) { capturado.status = status; return res; },
    json(saida: any) { capturado.corpo = saida; return res; },
  };
  await handlerDecisao(req, res);
  return capturado;
}

/* 6.1 — pós-ponte: legado vazio, tudo revisado no modelo AV. Aprova. */
{
  sugestoesDoBanco = [];
  dispensasDoBanco = [];
  revisoesDoBanco = obrigatorias.map((secao) => revisaoViva({ secao: secao.secao }));
  const saida = await aprovar();
  assert.equal(saida.status, 200, 'com o legado vazio e o modelo AV completo, a aprovação precisa passar');
  assert.equal(saida.corpo.gravado, true);
  const consulta = chamadas.find((item) => item.url.includes('/rest/v1/relatorio_revisoes_editoriais?'));
  assert.ok(consulta, 'a prontidão precisa consultar o modelo AV');
  assert.match(consulta!.url, /cliente_slug=eq\.cliente_exemplo/, 'a consulta é por identidade lógica, não por relatorio_id');
  assert.match(consulta!.url, /competencia=eq\.2026-07/);
  assert.match(consulta!.url, /relatorio_versao=eq\.3/);
  assert.doesNotMatch(consulta!.url, /relatorio_id/, 'o modelo AV não é filtrado pela linha física');
  assert.match(decodeURIComponent(consulta!.url), /estado=in\.\('atual','revisao_necessaria','final'\)/);
}

/* 6.2 — uma seção invalidada por fato novo trava a aprovação, mesmo com o
   legado dizendo que está tudo aplicado. */
{
  sugestoesDoBanco = obrigatorias.map((secao) => ({ secao: secao.secao, estado: 'aplicada' }));
  revisoesDoBanco = obrigatorias.map((secao, indice) => revisaoViva({
    secao: secao.secao,
    estado: indice === 0 ? 'revisao_necessaria' : 'atual',
  }));
  const saida = await aprovar();
  assert.equal(saida.status, 409, 'seção invalidada precisa travar a aprovação');
  assert.equal(saida.corpo.erro, 'analises_pendentes');
  assert.equal(saida.corpo.gravado, false);
  assert.equal(
    chamadas.some((item) => item.url.includes('/rpc/decidir_relatorio') || item.url.includes('/rpc/aprovar_e_fechar_relatorio_editorial')),
    false,
    'nada pode ser gravado quando há análise em revisão necessária',
  );
}

/* 6.3 — falha ao ler o modelo AV deixa a prontidão INDISPONÍVEL. Nunca vira
   lista vazia, que aqui significaria "nenhuma seção foi invalidada". */
{
  sugestoesDoBanco = obrigatorias.map((secao) => ({ secao: secao.secao, estado: 'aplicada' }));
  revisoesDoBanco = [];
  derrubarLeituraDasRevisoes = true;
  const saida = await aprovar();
  assert.equal(saida.status, 502, 'leitura indisponível precisa falhar fechado');
  assert.equal(saida.corpo.gravado, false);
  assert.equal(chamadas.some((item) => item.url.includes('/rpc/decidir_relatorio') || item.url.includes('/rpc/aprovar_e_fechar_relatorio_editorial')), false);
  derrubarLeituraDasRevisoes = false;
}

/* 6.4 — relatório que nunca passou pela ponte continua funcionando igual:
   modelo AV vazio, legado manda. */
{
  sugestoesDoBanco = obrigatorias.map((secao) => ({ secao: secao.secao, estado: 'aplicada' }));
  revisoesDoBanco = [];
  const saida = await aprovar();
  assert.equal(saida.status, 200, 'documento pré-ponte não pode regredir');
  assert.equal(saida.corpo.gravado, true);
}

globalThis.fetch = fetchOriginal;

console.log('verifica-painel-av2-prontidao: ok');
