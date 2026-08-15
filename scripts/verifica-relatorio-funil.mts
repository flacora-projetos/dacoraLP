import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import BlocoFunil from '../src/reports/blocos/BlocoFunil.tsx';
import type { FunilRelatorio } from '../src/reports/blocos/tipos.ts';

const ecommerce: FunilRelatorio = {
  id: 'funil_ecommerce',
  etapas: [
    { id: 'sessoes', rotulo: 'Sessões', valor: 1000 },
    { id: 'carrinhos', rotulo: 'Carrinhos', valor: 120 },
    { id: 'checkouts', rotulo: 'Checkouts', valor: 48 },
    { id: 'compras', rotulo: 'Compras', valor: 12 },
  ],
  transicoes: [
    { id: 'sessoes_para_carrinhos', de: 'sessoes', para: 'carrinhos', taxa: 0.12, perda: 0.88 },
    { id: 'carrinhos_para_checkouts', de: 'carrinhos', para: 'checkouts', taxa: 0.4, perda: 0.6 },
    { id: 'checkouts_para_compras', de: 'checkouts', para: 'compras', taxa: 0.25, perda: 0.75 },
  ],
  gargalo: {
    transicaoId: 'sessoes_para_carrinhos',
    de: 'sessoes',
    para: 'carrinhos',
    taxa: 0.12,
    perda: 0.88,
  },
};

const htmlEcommerce = renderToStaticMarkup(createElement(BlocoFunil, { funil: ecommerce }));
assert.match(htmlEcommerce, /Sessões/);
assert.match(htmlEcommerce, /Carrinhos/);
assert.match(htmlEcommerce, /Checkouts/);
assert.match(htmlEcommerce, /Compras/);
assert.match(htmlEcommerce, /12,0%/);
assert.match(htmlEcommerce, /data-gargalo="true"/);
assert.match(htmlEcommerce, /Maior gargalo/);

const instagram: FunilRelatorio = {
  id: 'funil_instagram',
  fonte: 'instagram',
  janela: {
    competencia: '2026-07',
    inicio: '2026-07-16',
    fim: '2026-08-14',
    dias: 30,
    foraDaCompetencia: true,
    limiteDaFonteDias: 30,
  },
  etapas: [
    { id: 'visualizacoes', rotulo: 'Visualizações', valor: 10000 },
    { id: 'visitas_perfil', rotulo: 'Visitas ao perfil', valor: 800 },
    { id: 'cliques_bio', rotulo: 'Cliques no link da bio', valor: 120 },
  ],
  transicoes: [
    { id: 'visualizacoes_para_visitas_perfil', de: 'visualizacoes', para: 'visitas_perfil', taxa: 0.08, perda: 0.92 },
    { id: 'visitas_perfil_para_cliques_bio', de: 'visitas_perfil', para: 'cliques_bio', taxa: 0.15, perda: 0.85 },
  ],
  gargalo: {
    id: 'visualizacoes_para_visitas_perfil',
    de: 'visualizacoes',
    para: 'visitas_perfil',
    taxa: 0.08,
    perda: 0.92,
  },
  desfechosAdicionais: [
    {
      id: 'novos_seguidores',
      rotulo: 'Novos seguidores',
      valor: 1600,
      observacao: 'É um desfecho adicional do perfil, medido na mesma janela.',
    },
  ],
  observacao:
    'A Meta limita novos seguidores a no máximo 30 dias. Por isso este funil usa a janela móvel recente de 2026-07-16 a 2026-08-14 (30 dias), que não coincide integralmente com a competência 2026-07.',
};

const htmlInstagram = renderToStaticMarkup(createElement(BlocoFunil, { funil: instagram }));
assert.match(htmlInstagram, /16\/07 a 14\/08/);
assert.match(htmlInstagram, /30 dias/);
assert.match(htmlInstagram, /Novos seguidores/);
assert.match(htmlInstagram, /Meta limita novos seguidores a no máximo 30 dias/);

console.log('verifica-relatorio-funil: ok');

/**
 * RM6 — o funil não some por causa de um elo torto, e o número impossível
 * nunca chega à tela. Decisão do PO em 2026-08-14, com o aviso visível ao
 * cliente por escolha dele.
 */
const comRessalva: FunilRelatorio = {
  id: 'funil_ecommerce',
  rotulo: 'Leitura do funil',
  etapas: [
    { id: 'sessoes', rotulo: 'Sessões', valor: 1000, medida: true },
    { id: 'carrinhos', rotulo: 'Carrinhos', valor: 120, medida: true },
    { id: 'checkouts', rotulo: 'Checkouts', valor: null, medida: false, motivo: 'a fonte não devolveu esta etapa no período' },
    { id: 'compras', rotulo: 'Compras', valor: 12, medida: true },
  ],
  transicoes: [
    { id: 'sessoes_para_carrinhos', de: 'sessoes', para: 'carrinhos', taxa: 0.12, perda: 0.88 },
    { id: 'carrinhos_para_checkouts', de: 'carrinhos', para: 'checkouts', taxa: null, perda: null, motivo: 'Checkouts não foi medida no período, então esta passagem não tem taxa' },
    { id: 'checkouts_para_compras', de: 'checkouts', para: 'compras', taxa: null, perda: null, motivo: 'Checkouts não foi medida no período, então esta passagem não tem taxa' },
  ],
  gargalo: { id: 'sessoes_para_carrinhos', de: 'sessoes', para: 'carrinhos', taxa: 0.12, perda: 0.88 },
  avisos: [{ id: 'carrinhos_para_checkouts_sem_medida', texto: 'Checkouts não foi medida no período, então esta passagem não tem taxa' }],
};

const htmlRessalva = renderToStaticMarkup(createElement(BlocoFunil, { funil: comRessalva }));
assert.match(htmlRessalva, /Sobre a medição deste funil/);
assert.match(htmlRessalva, /não medido/);
assert.match(htmlRessalva, /Checkouts não foi medida/);
// As etapas medidas continuam impressas, que é a razão de o bloco não sumir.
assert.match(htmlRessalva, /1\.000/);
assert.match(htmlRessalva, /12,0%/);
// E o gargalo continua sendo apontado entre as passagens que têm taxa.
assert.match(htmlRessalva, /Maior gargalo/);
// Nenhuma porcentagem acima de 100% pode aparecer na página.
for (const [, numero] of htmlRessalva.matchAll(/(\d+(?:,\d+)?)%/g)) {
  assert.ok(Number(numero.replace(',', '.')) <= 100, `percentual acima de 100% na tela: ${numero}%`);
}

console.log('verifica-relatorio-funil: ok (com ressalva de medição)');
