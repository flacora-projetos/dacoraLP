import type { PedidoDeDecisao } from './DecisaoDaRevisao';

/**
 * Monta o corpo que vai ao `/api/painel-decisao`.
 *
 * ISTO ERA UM `...spread` ESCRITO À MÃO DENTRO DO `fetch`, e ele listava só
 * `motivo` e `escopoSecoes`. Quando a recusa passou a ser por causas
 * estruturadas, o modal montava `causas` e `catalogVersion` corretamente, o
 * `DecisaoDaRevisao` os punha no pedido, e ESTA função os jogava fora antes de
 * enviar. O servidor recebia uma recusa sem causa nenhuma e respondia
 * "escolha de 1 a 5 causas" para quem tinha acabado de escolher uma.
 *
 * Nenhum teste pegou porque as regressões substituem `aoDecidir` por um falso
 * que registra o pedido: o fake ocupava justamente o lugar do defeito. Por isso
 * a montagem virou função pura e exportada — é o único jeito de provar o que
 * sai daqui sem depender de quem chama.
 */
export function corpoDaDecisao(pedido: PedidoDeDecisao, id: string, checksum: string) {
  return {
    id,
    decisao: pedido.decisao,
    // O checksum que ESTA tela mostrou. Se o documento mudou no banco, o
    // servidor recusa em vez de carimbar algo que ninguém leu.
    checksum,
    ...(pedido.decisao === 'recusar'
      ? {
          motivo: pedido.motivo ?? '',
          catalogVersion: pedido.catalogVersion,
          causas: pedido.causas,
        }
      : {}),
  };
}
