/**
 * Peças que os dois tipos de relatório usam para montar tabela de campanhas.
 *
 * A regra dura vive aqui: total é soma das linhas exibidas, e se qualquer
 * linha estiver sem o dado o total NÃO é somado — ele vira ausente, com o
 * motivo escrito. Somar tratando a ausência como zero é a forma clássica de
 * o relatório mentir sem avisar.
 */

import type { PlataformaId, NaturezaCampanha, Valor } from '../snapshot';

export const NOME_NATUREZA: Record<NaturezaCampanha, string> = {
  venda: 'Venda',
  cadastro: 'Cadastro',
  trafego: 'Tráfego',
  mensagem: 'Mensagem',
  reconhecimento: 'Reconhecimento',
};

/**
 * Soma que se recusa a somar pela metade. Uma ausência ou falha em qualquer
 * parcela contamina o total, e isso é dito em vez de arredondado para zero.
 */
export function somar(valores: Valor[], oQue: string): Valor {
  const incompletos = valores.filter((v) => v.estado !== 'ok');
  if (incompletos.length > 0) {
    return {
      estado: 'ausente',
      motivo: `${incompletos.length} de ${valores.length} campanhas estão sem ${oQue}, então este total não foi somado.`,
    };
  }
  const total = valores.reduce((soma, v) => soma + (v.estado === 'ok' ? v.numero : 0), 0);
  return { estado: 'ok', numero: Number(total.toFixed(2)) };
}

/** Rótulos de plataforma indexados, para a tabela de campanhas. */
export function rotulosDePlataforma(
  canais: { plataforma: PlataformaId; rotulo: string }[],
): Record<string, string> {
  return Object.fromEntries(canais.map((c) => [c.plataforma, c.rotulo]));
}
