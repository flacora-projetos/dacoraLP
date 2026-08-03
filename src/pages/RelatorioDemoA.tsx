/**
 * Proposta visual A — "Editorial".
 *
 * Serif nos títulos e nos números (Source Serif 4, hospedada localmente, dois
 * pesos), filetes sob cada cabeçalho de seção, indicadores em cartões de
 * papel e a capa em verde profundo como única superfície de destaque.
 *
 * Rota privada de demonstração da fase W0. Não entra no sitemap, não é
 * pré-renderizada e leva `noindex`.
 */

import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';

import RelatorioMensal from '../reports/RelatorioMensal';
import { competenciasKaryne, karyne202607 } from '../reports/fixtures/karyne-2026-07';

export default function RelatorioDemoA() {
  return (
    <RelatorioMensal
      snapshot={karyne202607}
      competencias={competenciasKaryne}
      proposta="A"
      demo={{
        rotulo: 'Ver a proposta B',
        href: '/relatorios/demo/b',
        descricao:
          'Editorial: serif nos títulos e números, filetes de seção, capa em verde.',
      }}
    />
  );
}
