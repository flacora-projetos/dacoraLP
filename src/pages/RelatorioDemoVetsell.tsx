/**
 * VetSell — segundo relatório montado pelo catálogo de blocos.
 *
 * O que ele prova é diferente do que o ICH provou. O ICH mostrou que o
 * catálogo funciona; a VetSell mostra que ele **se paga**: nove seções, oito
 * delas em peças que já existiam, e o único bloco novo (o comentário humano)
 * serve a três dos seis relatórios da carteira.
 *
 * Na pele B. Todos os números são inventados — ver o cabeçalho da fixture.
 *
 * Rota privada de demonstração: não entra no sitemap, não é pré-renderizada e
 * leva `noindex`.
 */

import RelatorioMontado from '../reports/RelatorioMontado';
import { competenciasVetsell, vetsell202607 } from '../reports/fixtures/vetsell-2026-07';

export default function RelatorioDemoVetsell() {
  return (
    <RelatorioMontado
      snapshot={vetsell202607}
      competencias={competenciasVetsell}
      proposta="B"
      demo={{
        rotulo: 'Ver o relatório do ICH',
        href: '/relatorios/demo/ich',
        descricao:
          'Mesmas peças do ICH, em outra ordem e com outros parâmetros. Nenhum código foi escrito para este cliente.',
      }}
    />
  );
}
