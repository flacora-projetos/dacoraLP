/**
 * A ANÁLISE APROVADA CHEGA AO CLIENTE.
 *
 * Origem: em 04/09/2026 a Fernanda aprovou o mensal da Aphase e o cliente
 * recebeu a página sem uma linha das análises dela. Medido no banco naquele
 * dia: 15 relatórios enviados, 74 análises humanas escritas, **zero
 * publicadas**. A análise por seção só era injetada no documento enquanto quem
 * olhava podia decidir, e a introdução revisada era substituída apenas na
 * memória do navegador de quem revisava — então o revisor aprovava um
 * documento e o cliente recebia outro.
 *
 * Decisão do PO no mesmo dia: todas as análises aprovadas vão ao cliente.
 *
 * As provas aqui são as quatro que, faltando qualquer uma, o defeito volta sem
 * quebrar nada visível:
 *
 *  1. a rota pública PEDE a view amarrada ao fechamento e devolve o resultado;
 *  2. a introdução aprovada SUBSTITUI a leitura automática, não convive com ela;
 *  3. a análise de seção aparece no corpo da seção;
 *  4. prova negativa — sem análise aprovada, o documento sai exatamente como
 *     saía antes, com a leitura automática intacta.
 *
 * E uma quinta, que é a que impede a divergência voltar: a prévia de quem
 * revisa e a página do cliente usam a MESMA função de substituição.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RelatorioMontado from '../src/reports/RelatorioMontado.tsx';
import {
  aplicarIntroducaoAprovada,
  introducaoDasAnalises,
  paragrafosDaAnalise,
} from '../src/reports/analisePublicada.ts';
import { afirmacoesDaIntroducaoRevisada } from '../src/painel/revisaoAnalise.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const snapshot = karyneMontada202607 as any;
const competencias = [{ competencia: snapshot.identidade.competencia, rotulo: 'Julho', publicada: true }];

function render(analisesPublicadas: Array<{ secao: string; texto: string }>) {
  return renderToStaticMarkup(
    createElement(RelatorioMontado as any, { snapshot, competencias, proposta: 'B', analisesPublicadas }),
  );
}

const INTRO_APROVADA = 'Agosto virou o jogo no Meta Ads.\n\nO custo por lead caiu pela metade.';
const primeiroBloco = snapshot.montagem.find((config: any) => !config.indisponivel);
assert.ok(primeiroBloco, 'a fixture precisa ter ao menos um bloco disponível');
const ANALISE_SECAO = 'A concentração num único criativo é o risco a acompanhar no próximo mês.';

/* 1 — a rota pública pede a view certa e entrega o campo. -------------------- */
{
  const fonte = readFileSync(new URL('../api/relatorio-publico.ts', import.meta.url), 'utf8');
  const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(
    semComentarios,
    /relatorio_analises_publicadas\?relatorio_id=eq\./,
    'a rota pública precisa consultar a view relatorio_analises_publicadas',
  );
  assert.match(semComentarios, /relatorio_checksum=eq\./, 'a consulta precisa amarrar o checksum do documento');
  assert.match(semComentarios, /analisesPublicadas,/, 'a resposta precisa devolver analisesPublicadas');
  /* Prova negativa da limpeza acima: se o strip de comentários apagasse tudo,
     as três asserções passariam por vacuidade. */
  assert.ok(semComentarios.includes('export default async function handler'), 'a limpeza de comentários comeu o código');
}

/* 2 — a introdução aprovada entra NO LUGAR da automática. ------------------- */
{
  const introducaoAutomatica = snapshot.leitura.resumoExecutivo[0]?.texto;
  assert.ok(introducaoAutomatica, 'a fixture precisa ter leitura automática para a prova fazer sentido');

  const html = render([{ secao: 'introducao', texto: INTRO_APROVADA }]);
  assert.ok(html.includes('Agosto virou o jogo no Meta Ads.'), 'a introdução aprovada precisa aparecer');
  assert.ok(html.includes('O custo por lead caiu pela metade.'), 'cada parágrafo da introdução precisa aparecer');
  assert.ok(
    !html.includes(introducaoAutomatica),
    'a leitura automática precisa SAIR quando existe introdução aprovada — as duas juntas dão ao cliente duas aberturas contraditórias',
  );
}

/* 3 — a análise de seção aparece no corpo da seção. ------------------------- */
{
  const html = render([{ secao: `bloco:${primeiroBloco.id}`, texto: ANALISE_SECAO }]);
  assert.ok(html.includes(ANALISE_SECAO), 'a análise da seção precisa aparecer no documento');
  assert.match(html, /class="dc-analise-publicada"/, 'a análise precisa sair na casca estilizada');

  const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
  assert.match(css, /^\.dc-analise-publicada \{/m, 'a classe precisa ter estilo, senão sai como texto solto');
}

/* 4 — prova negativa: sem análise aprovada, nada muda. ---------------------- */
{
  const introducaoAutomatica = snapshot.leitura.resumoExecutivo[0]?.texto;
  const html = render([]);
  assert.ok(html.includes(introducaoAutomatica), 'sem análise aprovada a leitura automática continua sendo a abertura');
  assert.ok(!html.includes('dc-analise-publicada'), 'sem análise aprovada nenhuma casca de análise é emitida');
  assert.ok(!html.includes(ANALISE_SECAO) && !html.includes('Agosto virou o jogo'), 'nada de análise deve vazar');
}

/* 5 — fonte única: a prévia da revisão usa a MESMA regra da página. --------- */
{
  assert.deepEqual(
    afirmacoesDaIntroducaoRevisada(INTRO_APROVADA),
    aplicarIntroducaoAprovada(snapshot, INTRO_APROVADA).leitura.resumoExecutivo,
    'a prévia de quem revisa e a página do cliente precisam quebrar a introdução do mesmo jeito',
  );
  assert.equal(
    aplicarIntroducaoAprovada(snapshot, '   ').leitura.resumoExecutivo,
    snapshot.leitura.resumoExecutivo,
    'texto em branco não substitui a leitura automática',
  );
  assert.deepEqual(paragrafosDaAnalise('uma linha só'), ['uma linha só'], 'texto sem parágrafo nunca vira lista vazia');
  assert.equal(introducaoDasAnalises([{ secao: 'bloco:x', texto: 'y' }]), null, 'só a seção introducao vira abertura');
}

/* 6 — integração: a rota pública entrega a análise ao navegador do cliente. --
   As provas 1 a 5 medem consulta e renderização separadamente. Esta segue o
   caminho inteiro, que é onde o defeito de origem vivia: cada peça funcionava,
   e nada as ligava. */
{
  const { default: handler } = await import('../api/relatorio-publico.ts');
  const token = 'A'.repeat(43);
  const checksum = 'checksum-aprovado';
  const linha: any = {
    id: '11111111-1111-4111-8111-111111111111',
    cliente_slug: 'cliente_exemplo',
    competencia: '2026-07',
    versao: 1,
    estado: 'liberado',
    gerado_em: '2026-08-01T10:00:00Z',
    checksum,
    checksum_factual_editorial: 'checksum-factual-final',
    aprovado_por: 'Fernanda',
    aprovado_em: '2026-08-09T10:00:00Z',
    aprovado_checksum: checksum,
    enviado_em: null,
    enviado_para: null,
    substituido_por: null,
    revogado_em: null,
    conteudo: structuredClone(snapshot),
  };
  linha.conteudo.identidade.clienteSlug = linha.cliente_slug;
  linha.conteudo.identidade.competencia = linha.competencia;
  linha.conteudo.dados.audios = {};
  const fechamento = {
    relatorio_id: linha.id,
    cliente_slug: linha.cliente_slug,
    competencia: linha.competencia,
    relatorio_versao: linha.versao,
    checksum_documento: linha.checksum,
    checksum_factual: linha.checksum_factual_editorial,
    aprovado_checksum: linha.aprovado_checksum,
  };
  const analises = [{ secao: 'introducao', texto: INTRO_APROVADA }, { secao: `bloco:${primeiroBloco.id}`, texto: ANALISE_SECAO }];

  const urls: string[] = [];
  const fetchOriginal = globalThis.fetch;
  const env = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://projeto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
  globalThis.fetch = (async (entrada: any) => {
    const url = String(entrada);
    urls.push(url);
    const corpo = url.includes('/relatorio_fechamentos_editoriais?') ? [fechamento]
      : url.includes('/relatorio_analises_publicadas?') ? analises
      : url.includes('/relatorio_observacoes_publicas_liberadas?') ? []
      : [linha];
    return new Response(JSON.stringify(corpo), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  let corpoDaResposta: any;
  const res: any = {
    setHeader() {},
    status() { return res; },
    json(valor: any) { corpoDaResposta = valor; return res; },
  };
  await handler({ method: 'GET', url: `/api/relatorio-publico?token=${token}` } as any, res);

  globalThis.fetch = fetchOriginal;
  process.env.SUPABASE_URL = env.url ?? '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.key ?? '';

  assert.ok(
    urls.some((url) => url.includes('/relatorio_analises_publicadas?')),
    'a rota precisa consultar a view das análises aprovadas',
  );
  assert.deepEqual(
    corpoDaResposta?.relatorio?.analisesPublicadas,
    analises,
    'a rota precisa entregar as análises aprovadas ao navegador do cliente',
  );
  /* E o token nunca volta — a leitura nova não pode ter aberto essa porta. */
  assert.ok(!JSON.stringify(corpoDaResposta).includes(token), 'o token não pode voltar no corpo');
}

console.log('verifica-analises-publicadas: ok');
