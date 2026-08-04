/**
 * Karyne Magalhães — quarto relatório montado pelo catálogo, e o primeiro com
 * **duas plataformas**.
 *
 * Ele é o que mais mexeu no catálogo desde que ele nasceu, e por dois motivos
 * opostos: destravou o B5, que existia declarado e sem renderizador desde o
 * começo, e recusou a apresentação de eixo duplo do relatório de origem — que
 * é a decisão mais importante desta montagem. O porquê está no cabeçalho da
 * fixture e em `blocos/tipos.ts`.
 *
 * Três seções da parte de Google aparecem dizendo o que falta, porque a nossa
 * integração devolve Google só em nível de campanha.
 *
 * Na pele B. Todos os números são inventados — ver o cabeçalho da fixture.
 */

import RelatorioMontado from '../reports/RelatorioMontado';
import {
  competenciasKaryneMontada,
  karyneMontada202607,
} from '../reports/fixtures/karyne-montada-2026-07';

export default function RelatorioDemoKaryne() {
  return (
    <RelatorioMontado
      snapshot={karyneMontada202607}
      competencias={competenciasKaryneMontada}
      proposta="B"
      demo={{
        rotulo: 'Ver o relatório do Dr. Flávio Zenun',
        href: '/relatorios/demo/zenun',
        descricao:
          'Primeiro relatório com duas plataformas, com a evolução mensal em painéis separados por métrica em vez do gráfico de eixo duplo do relatório de origem.',
      }}
    />
  );
}
