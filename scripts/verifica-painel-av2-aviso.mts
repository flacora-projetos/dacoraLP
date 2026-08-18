/**
 * AV2 — o aviso de validade da análise na tela do revisor.
 *
 * Duas coisas são travadas aqui: o texto que o PO pediu chega junto dos botões
 * que decidem, e a data vem do snapshot, nunca do relógio do navegador.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnaliseIntroducao } from '../src/painel/AnaliseIntroducao.tsx';
import { AnalisesSecaoProvider, AvisoDeValidadeDaAnalise } from '../src/painel/AnalisesSecao.tsx';

const AVISO = /Esta análise ficará válida apenas até a próxima atualização dos dados/;
const CONSEQUENCIA = /esta análise será marcada como revisão necessária/;
const COLETADO_EM = '2026-08-18T07:12:00-03:00';

/* O carimbo é o do snapshot, formatado pela mesma função do resto do painel. */
{
  const html = renderToStaticMarkup(createElement(AvisoDeValidadeDaAnalise, { coletadoEm: COLETADO_EM }));
  assert.match(html, AVISO);
  assert.match(html, CONSEQUENCIA);
  assert.match(html, /dados coletados em 18\/08\/2026 às 07h12/);
}

/* Sem carimbo no snapshot, o aviso sai SEM data. Nunca com a data de hoje: o
   relógio de quem abre a tela não sabe quando os dados foram coletados. */
{
  const html = renderToStaticMarkup(createElement(AvisoDeValidadeDaAnalise, { coletadoEm: null }));
  assert.match(html, AVISO);
  assert.doesNotMatch(html, /coletados em/);
  const anoDeHoje = String(new Date().getFullYear());
  assert.doesNotMatch(html, new RegExp(anoDeHoje), 'o aviso não pode cair no relógio do navegador');
}

/* Na bancada das seções o aviso aparece uma vez, no cabeçalho do painel de
   análises — não repetido em cada uma das seções obrigatórias. */
{
  const html = renderToStaticMarkup(createElement(AnalisesSecaoProvider, {
    podeRevisar: true,
    espacos: [{ secao: 'bloco:exemplo', blocoId: 'exemplo', titulo: 'Exemplo', objetivo: 'Objetivo' }],
    coletadoEm: COLETADO_EM,
    aoAcionar: async () => ({}),
    children: null,
  }));
  assert.match(html, AVISO);
  assert.equal(
    html.match(new RegExp(AVISO.source, 'g'))?.length,
    1,
    'o aviso aparece uma vez; quinze cópias do mesmo texto viram parede que ninguém lê',
  );
  assert.match(html, /dados coletados em 18\/08\/2026 às 07h12/);
}

/* Na introdução ele fica junto de "Aplicar na revisão", e só quando existe
   proposta para aplicar. */
{
  const semProposta = renderToStaticMarkup(createElement(AnaliseIntroducao, {
    original: 'Introdução original.',
    podeRevisar: true,
    coletadoEm: COLETADO_EM,
    aoAcionar: async () => null,
    aoMudarTexto: () => {},
  }));
  assert.doesNotMatch(semProposta, AVISO, 'sem proposta pendente não há decisão a qualificar');

  /* O bloco de comparação só existe depois que o efeito de carregamento traz
     uma proposta, e efeito não roda em render estático. A posição do aviso —
     imediatamente antes dos botões que aplicam/editam/desfazem — é conferida
     na fonte, que é onde ela de fato mora. */
  const fonte = readFileSync(new URL('../src/painel/AnaliseIntroducao.tsx', import.meta.url), 'utf8');
  const posicaoDoAviso = fonte.indexOf('<AvisoDeValidadeDaAnalise');
  const posicaoDasAcoes = fonte.indexOf('dcp-analise-introducao__acoes');
  assert.ok(posicaoDoAviso > 0, 'a introdução precisa exibir o aviso de validade');
  assert.ok(
    posicaoDoAviso < posicaoDasAcoes,
    'o aviso precisa vir antes dos botões de decisão, não depois deles',
  );
}

console.log('verifica-painel-av2-aviso: ok');
