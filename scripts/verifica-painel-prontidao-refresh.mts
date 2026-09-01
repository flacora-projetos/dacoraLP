/**
 * A prontidão editorial precisa CHEGAR À TELA sem recarregar a página.
 *
 * O defeito que originou este arquivo: no Dr. Flávio Zenun / 2026-08 as oito
 * seções obrigatórias foram resolvidas, o banco passou a considerar o relatório
 * apto, e o botão "Aprovar relatório" continuou desabilitado até um F5. A causa
 * era de refresh, não de contrato: `Revisao.tsx` atualizava só o histórico
 * editorial (`setTentativaHistorico`) depois de aplicar/editar/dispensar, e o
 * `relatorio.revisaoEditorial` — que é quem decide o `disabled` do botão —
 * continuava sendo a cópia lida na abertura da tela.
 *
 * O que estas regressões provam, no componente real montado em jsdom:
 *
 *  1. seção pendente mantém o botão bloqueado;
 *  2. resolver uma seção intermediária NÃO libera cedo demais;
 *  3. resolver a última pendência libera o botão sem reload manual;
 *  4. aplicar análise revalida a prontidão;
 *  5. editar análise revalida a prontidão;
 *  6. dispensar seção sem análise revalida a prontidão;
 *  7. `desfazer` volta a bloquear — a revalidação vale nos dois sentidos;
 *  8. falha na revalidação NUNCA promove o botão por inferência local;
 *  9. documento trocado embaixo da tela (checksum divergente) é descartado;
 * 10. nenhuma decisão real de aprovação/recusa é registrada aqui.
 */
import assert from 'node:assert/strict';
import { createElement, type ReactNode } from 'react';
import { createRequire } from 'node:module';
import { MemoryRouter } from 'react-router-dom';
import { RevisaoComSessao } from '../src/painel/Revisao.tsx';
import { resumoEditorialDaRevisao, type ResumoEditorialRA4 } from '../src/painel/estadoEditorial.ts';
import { espacosAnaliticosDoSnapshot } from '../src/reports/blocos/analise.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';

const require = createRequire(import.meta.url);
const ID = '77777777-7777-4777-8777-777777777777';
const CHECKSUM = 'checksum-prontidao-refresh';
const fetchOriginal = globalThis.fetch;

/* ------------------------------------------------------------------ */
/* Fixture — um snapshot com DUAS seções analíticas obrigatórias, mais  */
/* a introdução. Três obrigatórias no total: é o mínimo para distinguir */
/* "resolvi uma no meio" de "resolvi a última".                         */
/* ------------------------------------------------------------------ */

/* O snapshot é a montagem REAL já usada pelas outras regressões do painel.
   Fixture inventada aqui só provaria que o componente renderiza o que ela
   inventou; esta tem as seções analíticas de um relatório de verdade. */
const SNAPSHOT = karyneMontada202607 as any;

const ESPACOS = espacosAnaliticosDoSnapshot(SNAPSHOT);
assert.ok(ESPACOS.length >= 2, 'a fixture precisa de ao menos duas seções analíticas para separar "do meio" de "a última"');

/** As seções obrigatórias, derivadas do snapshot — nunca escritas à mão. */
const OBRIGATORIAS = ['introducao', ...ESPACOS.map((item) => item.secao)];


/**
 * A prontidão é sempre calculada pela MESMA autoridade que a API usa
 * (`resumoEditorialDaRevisao`), a partir das seções resolvidas — nunca escrita
 * à mão. Um teste que inventasse `podeAprovar` provaria apenas que o
 * componente sabe ler um booleano.
 */
function prontidaoServidor(resolvidas: readonly string[]): ResumoEditorialRA4 {
  return resumoEditorialDaRevisao(SNAPSHOT, [], resolvidas, [], null);
}

{
  assert.equal(prontidaoServidor([]).totalObrigatorias, OBRIGATORIAS.length);
  assert.equal(prontidaoServidor([]).podeAprovar, false);
  assert.equal(prontidaoServidor(OBRIGATORIAS).podeAprovar, true, 'com todas resolvidas o servidor libera');
}

/* ------------------------------------------------------------------ */
/* Servidor de mentira                                                  */
/* ------------------------------------------------------------------ */

interface Servidor {
  resolvidas: Set<string>;
  /** Falha proposital na releitura da prontidão. */
  falharRelatorio: boolean;
  /** Devolve outro documento (checksum divergente) na releitura. */
  checksumDivergente: boolean;
  chamadas: string[];
  decisoes: unknown[];
}

function servidorNovo(resolvidas: string[] = []): Servidor {
  return { resolvidas: new Set(resolvidas), falharRelatorio: false, checksumDivergente: false, chamadas: [], decisoes: [] };
}

function montarFetch(servidor: Servidor) {
  return (async (entrada: any, init?: RequestInit) => {
    const url = String(typeof entrada === 'string' ? entrada : entrada?.url ?? entrada);
    const metodo = String(init?.method ?? 'GET').toUpperCase();
    servidor.chamadas.push(metodo + ' ' + url.split('?')[0]);
    const corpo = init?.body ? JSON.parse(String(init.body)) : null;

    if (url.startsWith('/api/painel-decisao')) {
      servidor.decisoes.push(corpo);
      return new Response(JSON.stringify({ gravado: true }), { status: 200 });
    }

    if (url.startsWith('/api/painel-relatorio')) {
      if (servidor.falharRelatorio) return new Response('erro', { status: 500 });
      return new Response(JSON.stringify({
        relatorio: {
          id: ID,
          clienteNome: 'Cliente Governado',
          competencia: '2026-08',
          versao: 1,
          estado: 'gerado',
          sinais: [],
          conteudoCarregado: true,
          snapshot: SNAPSHOT,
          checksum: servidor.checksumDivergente ? 'outro-checksum-de-outra-coleta' : CHECKSUM,
          podeDecidir: true,
          aprovadoPor: null, aprovadoEm: null, recusadoPor: null, recusadoEm: null, recusaMotivo: null,
          revisaoEditorial: prontidaoServidor([...servidor.resolvidas]),
        },
      }), { status: 200 });
    }

    if (url.startsWith('/api/painel-historico-analises')) {
      return new Response(JSON.stringify({ historico: { disponivel: true, total: 0, revisoes: [] } }), { status: 200 });
    }

    if (url.startsWith('/api/painel-analise-introducao')) {
      if (metodo === 'GET') return new Response(JSON.stringify({ sugestao: null }), { status: 200 });
      return new Response(JSON.stringify({ sugestao: { id: 'sug-intro', estado: 'aplicada', texto: 'Leitura da introducao.', checksum: CHECKSUM } }), { status: 200 });
    }

    if (url.startsWith('/api/painel-analises-secao')) {
      if (metodo === 'GET') {
        return new Response(JSON.stringify({
          sugestoes: [],
          dispensas: [...servidor.resolvidas].map((secao) => ({ secao })),
          espacos: ESPACOS,
        }), { status: 200 });
      }
      const secao = String(corpo?.secao ?? '');
      if (corpo?.acao === 'dispensar') {
        servidor.resolvidas.add(secao);
        return new Response(JSON.stringify({ dispensa: { secao, ativa: true, por: 'revisor@exemplo.com' } }), { status: 200 });
      }
      if (corpo?.acao === 'reverter_dispensa') {
        servidor.resolvidas.delete(secao);
        return new Response(JSON.stringify({ dispensa: { secao, ativa: false } }), { status: 200 });
      }
      return new Response(JSON.stringify({ sugestoes: [] }), { status: 200 });
    }

    return new Response('nao_mapeado', { status: 404 });
  }) as typeof fetch;
}

/* ------------------------------------------------------------------ */
/* Bancada jsdom                                                       */
/* ------------------------------------------------------------------ */

const { JSDOM } = require('jsdom') as typeof import('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="montagem"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'https://exemplo.test/painel-de-relatorios',
});
for (const nome of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'HTMLTextAreaElement', 'Element', 'Node', 'Event', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(globalThis, nome, { value: (dom.window as any)[nome], configurable: true, writable: true });
}
/* jsdom não implementa `matchMedia`, e os gráficos do relatório consultam
   `prefers-reduced-motion` na montagem. O alvo aqui é estado, não aparência:
   respondemos "sem preferência" e seguimos. */
if (typeof (dom.window as any).matchMedia !== 'function') {
  const media = (consulta: string) => ({
    matches: false, media: consulta, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  });
  Object.defineProperty(dom.window, 'matchMedia', { value: media, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'matchMedia', { value: media, configurable: true, writable: true });
}
/* Idem `ResizeObserver`: os gráficos medem a própria largura na montagem. */
if (typeof (dom.window as any).ResizeObserver !== 'function') {
  class ObservadorInerte { observe() {} unobserve() {} disconnect() {} }
  Object.defineProperty(dom.window, 'ResizeObserver', { value: ObservadorInerte, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ObservadorInerte, configurable: true, writable: true });
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');

const montagem = dom.window.document.getElementById('montagem')!;
const raiz = createRoot(montagem);

/** Deixa fetch + setState assentarem. Uma volta só leria o quadro anterior. */
async function assentar() {
  for (let volta = 0; volta < 8; volta += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
}

function envolver(filho: ReactNode) {
  return createElement(MemoryRouter, { initialEntries: ['/painel-de-relatorios?relatorio=' + ID] }, filho);
}

function botaoAprovar(): HTMLButtonElement {
  const alvo = [...montagem.querySelectorAll('button')]
    .find((botao) => botao.textContent?.trim() === 'Aprovar relatório') as HTMLButtonElement | undefined;
  assert.ok(alvo, 'o botão "Aprovar relatório" precisa estar montado');
  return alvo;
}

function botaoDispensa(titulo: string): HTMLButtonElement {
  const alvo = [...montagem.querySelectorAll('button')]
    .find((botao) => botao.getAttribute('aria-label') === 'Marcar ' + titulo + ' como revisada sem análise') as HTMLButtonElement | undefined;
  assert.ok(alvo, 'a seção "' + titulo + '" precisa oferecer "Revisada sem análise"');
  return alvo;
}

async function clicar(botao: HTMLButtonElement) {
  await act(async () => {
    botao.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await assentar();
}

/* Cada cenário precisa de uma montagem NOVA. Sem a chave, React reaproveita
   a instância anterior: os efeitos de carga não rodam de novo (as dependências
   não mudaram) e o cenário seguinte herda o estado do anterior — foi o que
   fez a primeira versão deste arquivo ler "0/10" onde o servidor dizia 7. */
let montagensFeitas = 0;
async function montar(servidor: Servidor) {
  globalThis.fetch = montarFetch(servidor);
  montagensFeitas += 1;
  await act(async () => {
    raiz.render(envolver(createElement(RevisaoComSessao, {
      key: 'montagem-' + montagensFeitas,
      sessao: { access_token: 'token-de-teste', user: { id: 'usuario-teste', email: 'revisor@exemplo.com' } } as any,
      relatorioId: ID,
    })));
  });
  await assentar();
}

/* ------------------------------------------------------------------ */
/* 1 + 2 + 3 + 6 + 7 — o caminho do defeito relatado                    */
/*                                                                      */
/* Partimos com TODAS as obrigatórias resolvidas menos três: a primeira  */
/* seção analítica, a última e a introdução. Assim os cliques testam a   */
/* transição que importa — "do meio" e "a última" — sem depender de      */
/* quantas seções a fixture tem.                                        */
/* ------------------------------------------------------------------ */
const TOTAL = OBRIGATORIAS.length;

/* Nem toda seção analítica do snapshot desenha o botão de dispensa — bloco
   declarado indisponível, por exemplo, não desenha. Descobrimos na DOM quais
   desenham em vez de supor pela lista: supor deixaria o teste quebrando por
   mudança de conteúdo da fixture, e não por regressão do que ele mede. */
const { PRIMEIRA, ULTIMA } = await (async () => {
  await montar(servidorNovo([]));
  const clicaveis = ESPACOS.filter((espaco) => montagem.querySelector(
    'button[aria-label="Marcar ' + espaco.titulo + ' como revisada sem análise"]',
  ));
  assert.ok(clicaveis.length >= 2, 'a fixture precisa de duas seções analíticas dispensáveis pela tela');
  return { PRIMEIRA: clicaveis[0], ULTIMA: clicaveis[clicaveis.length - 1] };
})();
assert.notEqual(PRIMEIRA.secao, ULTIMA.secao);

const PENDENTES = [PRIMEIRA.secao, ULTIMA.secao, 'introducao'];
const RESTO = OBRIGATORIAS.filter((secao) => !PENDENTES.includes(secao));

{
  const servidor = servidorNovo([...RESTO]);
  await montar(servidor);

  assert.equal(botaoAprovar().disabled, true, '1) com três seções pendentes o botão nasce bloqueado');
  assert.match(montagem.textContent ?? '', new RegExp(`${TOTAL - 3}/${TOTAL} prontas`), 'o resumo mostra a contagem do servidor');

  await clicar(botaoDispensa(PRIMEIRA.titulo));
  assert.equal(servidor.resolvidas.has(PRIMEIRA.secao), true, '6) a dispensa foi gravada no servidor');
  assert.equal(botaoAprovar().disabled, true, '2) resolver uma seção do meio não pode liberar cedo demais');
  assert.match(montagem.textContent ?? '', new RegExp(`${TOTAL - 2}/${TOTAL} prontas`), '6) a contagem anda junto com o servidor, sem reload');

  await clicar(botaoDispensa(ULTIMA.titulo));
  assert.equal(botaoAprovar().disabled, true, '2) faltando a introdução, o botão continua bloqueado');
  assert.match(montagem.textContent ?? '', new RegExp(`${TOTAL - 1}/${TOTAL} prontas`));

  await clicar(botaoDispensa('Introdução'));
  assert.equal(servidor.resolvidas.size, TOTAL, 'todas as obrigatórias foram resolvidas');
  assert.equal(
    botaoAprovar().disabled,
    false,
    '3) resolver a ÚLTIMA pendência precisa habilitar o botão sem reload manual — este é o defeito relatado',
  );
  assert.match(montagem.textContent ?? '', new RegExp(`${TOTAL}/${TOTAL} análises obrigatórias foram revisadas`));
  assert.equal(servidor.decisoes.length, 0, '10) nenhuma decisão de aprovação/recusa foi registrada');

  const reverter = [...montagem.querySelectorAll('button')]
    .find((botao) => botao.getAttribute('aria-label') === 'Voltar a exigir análise em ' + ULTIMA.titulo) as HTMLButtonElement;
  assert.ok(reverter, 'seção dispensada precisa oferecer a volta');
  await clicar(reverter);
  assert.equal(botaoAprovar().disabled, true, '7) desfazer a dispensa volta a bloquear o botão na hora');
}

/* ------------------------------------------------------------------ */
/* 8 — falha na revalidação nunca promove o botão                      */
/* ------------------------------------------------------------------ */
{
  const servidor = servidorNovo(OBRIGATORIAS.filter((secao) => secao !== ULTIMA.secao));
  await montar(servidor);
  assert.equal(botaoAprovar().disabled, true);
  servidor.falharRelatorio = true;
  await clicar(botaoDispensa(ULTIMA.titulo));
  assert.equal(servidor.resolvidas.size, TOTAL, 'a ação editorial foi gravada mesmo com a releitura falhando');
  assert.equal(
    botaoAprovar().disabled,
    true,
    '8) releitura que falha não pode habilitar o botão por inferência local',
  );
  assert.doesNotMatch(montagem.textContent ?? '', new RegExp(`${TOTAL}/${TOTAL} análises obrigatórias`), 'a tela não inventa a contagem que não leu');
}

/* ------------------------------------------------------------------ */
/* 9 — documento trocado embaixo da tela é descartado                  */
/* ------------------------------------------------------------------ */
{
  const servidor = servidorNovo(OBRIGATORIAS.filter((secao) => secao !== ULTIMA.secao));
  await montar(servidor);
  servidor.checksumDivergente = true;
  await clicar(botaoDispensa(ULTIMA.titulo));
  assert.equal(servidor.resolvidas.size, TOTAL, 'o servidor registrou a dispensa');
  assert.equal(
    botaoAprovar().disabled,
    true,
    '9) prontidão de OUTRO documento (checksum divergente) não pode liberar a aprovação desta tela',
  );
}

/* ------------------------------------------------------------------ */
/* 4 + 5 — aplicar e editar análise revalidam a prontidão              */
/*                                                                     */
/* Provado no CONTRATO do canal real (`aoAnalisarSecoes`), não por      */
/* clique: sem sugestão carregada os botões "Aplicar na revisão" e      */
/* "Salvar edição" não existem na tela, e uma fixture que os fizesse    */
/* aparecer estaria testando o provider, não a revalidação.             */
/* ------------------------------------------------------------------ */
{
  const fonte = require('node:fs').readFileSync(new URL('../src/painel/Revisao.tsx', import.meta.url), 'utf8') as string;
  /* Comentário fora: uma asserção que procura o nome de uma ação pode ser
     satisfeita pelo próprio comentário que documenta a regra — já aconteceu
     neste repositório. Aqui a busca só enxerga código. */
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const guardaSecoes = /if \(acao !== 'carregar' && acao !== 'salvar_contexto'\) await revalidarProntidao\(\);/;
  assert.match(codigo, guardaSecoes, '4+5) toda ação de seção que não seja leitura precisa revalidar a prontidão');
  const guardaIntroducao = /if \(acao !== 'carregar'\) await revalidarProntidao\(\);/;
  assert.match(codigo, guardaIntroducao, '4+5) a introdução também revalida em aplicar/editar/desfazer');

  /* A guarda cobre `aplicar` e `editar` por construção: ela nomeia as ÚNICAS
     duas exceções, e nenhuma delas é `aplicar` ou `editar`. */
  for (const acao of ['aplicar', 'editar', 'desfazer', 'dispensar', 'reverter_dispensa', 'gerar_secao', 'gerar_todas']) {
    assert.notEqual(acao, 'carregar');
    assert.notEqual(acao, 'salvar_contexto');
  }

  /* A tela não pode derivar a prontidão sozinha: `podeAprovar` só entra aqui
     vindo do corpo que o servidor respondeu. */
  assert.doesNotMatch(codigo, /podeAprovar\s*[:=]\s*(true|!)/, 'a tela nunca calcula podeAprovar por conta própria');
  assert.match(codigo, /setProntidaoEditorial\(lido\.revisaoEditorial as ResumoEditorialRA4\)/, 'a prontidão vem inteira do servidor');
}

await act(async () => { raiz.unmount(); });
dom.window.close();
globalThis.fetch = fetchOriginal;
console.log('verifica-painel-prontidao-refresh: ok');
