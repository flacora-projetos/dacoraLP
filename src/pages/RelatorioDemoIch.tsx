/**
 * ICH Agropastoril — primeiro relatório montado pelo catálogo de blocos.
 *
 * É a primeira tela da W0 depois da mudança de abordagem: em vez de propor um
 * formato novo, reproduzir um relatório que a Fernanda já entrega e valida, e
 * perguntar "está fiel?" em vez de "você gostou?".
 *
 * Na pele B, que foi a escolhida. Todos os números são inventados — ver o
 * cabeçalho da fixture.
 *
 * Rota privada de demonstração: não entra no sitemap, não é pré-renderizada e
 * leva `noindex`.
 */

import RelatorioMontado from '../reports/RelatorioMontado';
import { competenciasIch, ich202607 } from '../reports/fixtures/ich-2026-07';

export default function RelatorioDemoIch() {
  return (
    <RelatorioMontado
      snapshot={ich202607}
      competencias={competenciasIch}
      proposta="B"
      demo={{
        rotulo: 'Ver o protótipo anterior',
        href: '/relatorios/demo/b',
        descricao:
          'Montado a partir do catálogo de blocos, reproduzindo o relatório que a Allgrotech já entrega.',
      }}
    />
  );
}
