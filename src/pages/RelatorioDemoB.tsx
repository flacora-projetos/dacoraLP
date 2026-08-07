/**
 * Proposta visual B — "Composição".
 *
 * Tudo em Red Hat Display, a fonte que a Dácora já usa. A autoridade vem de
 * escala, espaço e alinhamento: título de capa muito grande em peso leve,
 * indicadores sem caixa separados só por filete, seções abertas por filete
 * superior e muito ar. O resumo executivo é a única superfície de destaque.
 *
 * Nenhum arquivo de fonte extra é carregado nesta proposta.
 *
 * Rota privada de demonstração da fase W0. Não entra no sitemap, não é
 * pré-renderizada e leva `noindex`.
 */

import RelatorioMensal from '../reports/RelatorioMensal';
import { competenciasKaryne, karyne202607 } from '../reports/fixtures/karyne-2026-07';

export default function RelatorioDemoB() {
  return (
    <RelatorioMensal
      snapshot={karyne202607}
      competencias={competenciasKaryne}
      proposta="B"
      demo={{
        rotulo: 'Ver o modelo de e-commerce',
        href: '/relatorios/demo/ecommerce',
        descricao:
          'Modelo de geração de leads para clientes de serviços. O modelo de e-commerce usa esta mesma pele, com outro miolo.',
      }}
    />
  );
}
