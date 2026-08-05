/**
 * Dr. Flávio Zenun — terceiro relatório montado pelo catálogo, e o primeiro
 * que **não fecha**.
 *
 * O arranjo dele serve três clientes (ele, a Dra. Maria Nazaré e o Dr. Danilo
 * de Sá) e é o mais simples da carteira — só Google, nenhum texto humano. Mesmo
 * assim, três seções aparecem dizendo o que falta: duas esperam a montagem
 * daqui, desde que a integração passou a devolver os níveis abaixo de campanha e
 * a série diária, e uma continua dependendo de um campo que ela não devolve.
 *
 * É de propósito. Apagar da montagem o que não temos produziria uma página
 * bonita que nunca se completa sozinha, porque ninguém sentiria falta do que
 * não vê.
 *
 * Na pele B. Todos os números são inventados — ver o cabeçalho da fixture.
 */

import RelatorioMontado from '../reports/RelatorioMontado';
import { competenciasZenun, zenun202607 } from '../reports/fixtures/zenun-2026-07';

export default function RelatorioDemoZenun() {
  return (
    <RelatorioMontado
      snapshot={zenun202607}
      competencias={competenciasZenun}
      proposta="B"
      demo={{
        rotulo: 'Ver o relatório da VetSell',
        href: '/relatorios/demo/vetsell',
        descricao:
          'Três seções deste relatório aparecem dizendo o que falta, em vez de sumirem ou de serem preenchidas por estimativa.',
      }}
    />
  );
}
