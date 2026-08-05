/**
 * Dr. Flávio Zenun — terceiro relatório montado pelo catálogo. O arranjo dele
 * serve três clientes (ele, a Dra. Maria Nazaré e o Dr. Danilo de Sá) e é o
 * mais simples da carteira: só Google, nenhum texto humano.
 *
 * Ele foi, por um tempo, o relatório que **não fechava** — três seções saíam
 * declarando o que faltava. As três foram montadas em 2026-08-05, e é o
 * argumento a favor da escolha: por estarem visíveis, com o que faltava escrito
 * no próprio lugar, ninguém precisou lembrar delas quando o dado chegou. Se
 * tivessem sido apagadas da montagem, a página estaria bonita e incompleta até
 * hoje.
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
          'Este relatório teve três seções declaradas como faltantes até a fonte devolver o dado; hoje as três estão preenchidas. A tabela de palavras-chave mostra de quanto é a lista e de quanto é a conta, porque as duas não são a mesma coisa.',
      }}
    />
  );
}
