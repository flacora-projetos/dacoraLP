/**
 * Aviarte — quinto relatório montado pelo catálogo, e o argumento mais forte a
 * favor dele.
 *
 * O relatório de origem tem nove páginas, e quatro delas são o mesmo trio de
 * blocos com escopo diferente. Aqui elas saem de um laço sobre uma lista de
 * campanhas em destaque — não de quatro trechos de página escritos à mão.
 *
 * Nenhum bloco novo foi preciso. Quatro seções aparecem declarando o que falta:
 * o perfil do Instagram e as três aberturas abaixo do nível de campanha no
 * Google.
 *
 * Na pele B. Todos os números são inventados — ver o cabeçalho da fixture.
 */

import RelatorioMontado from '../reports/RelatorioMontado';
import { aviarte202607, competenciasAviarte } from '../reports/fixtures/aviarte-2026-07';

export default function RelatorioDemoAviarte() {
  return (
    <RelatorioMontado
      snapshot={aviarte202607}
      competencias={competenciasAviarte}
      proposta="B"
      demo={{
        rotulo: 'Ver o relatório da Karyne Magalhães',
        href: '/relatorios/demo/karyne',
        descricao:
          'Primeiro relatório de e-commerce montado pelo catálogo, com quatro seções de campanha saídas de uma lista e nenhum bloco escrito para a cliente.',
      }}
    />
  );
}
