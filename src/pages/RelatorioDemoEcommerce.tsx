/**
 * Segundo modelo de relatório: E-COMMERCE, na pele da proposta B.
 *
 * A proposta B foi a escolhida pelo Flávio e pela Fernanda — tudo em Red Hat
 * Display, autoridade vinda de escala, espaço e composição. O modelo de
 * e-commerce nasce nela; nenhuma terceira pele foi criada.
 *
 * O que muda em relação a `/relatorios/demo/b` não é o visual: é o TIPO do
 * relatório, que vem de `identidade.tipoRelatorio` no snapshot. Trocar a
 * fixture aqui por qualquer outro cliente de e-commerce entrega o mesmo
 * modelo, sem nenhuma linha de código a mais.
 *
 * Rota privada de demonstração da fase W0. Não entra no sitemap, não é
 * pré-renderizada e leva `noindex`.
 */

import RelatorioMensal from '../reports/RelatorioMensal';
import {
  competenciasSantalberti,
  santalberti202607,
} from '../reports/fixtures/santalberti-2026-07';

export default function RelatorioDemoEcommerce() {
  return (
    <RelatorioMensal
      snapshot={santalberti202607}
      competencias={competenciasSantalberti}
      proposta="B"
      demo={{
        rotulo: 'Ver o modelo de geração de leads',
        href: '/relatorios/demo/b',
        descricao:
          'Modelo de e-commerce. Mesma pele, mesmo esqueleto e mesmo tema de gráfico do modelo de geração de leads — o que muda é o tipo do relatório.',
      }}
    />
  );
}
