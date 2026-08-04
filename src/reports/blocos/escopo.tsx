/**
 * A etiqueta de escopo.
 *
 * Ela é pequena e é uma das peças mais importantes do relatório inteiro.
 *
 * No relatório de origem do ICH, a página presa à campanha de mensagens
 * mostrava "Investimento R$ 208,02 · Mensagens 13 · Custo por Mensagem 31,56".
 * A conta daqueles dois números é 16,00. O 31,56 vinha de dividir o
 * investimento da **conta inteira** (R$ 410,30) pelas mensagens de **uma
 * campanha** — o numerador ignorava o filtro da página, o denominador não.
 * O cliente lia um custo quase duas vezes maior que o real e não havia como
 * perceber.
 *
 * A correção não é uma regra escrita em algum lugar pedindo cuidado: é
 * declarar o escopo no dado e imprimi-lo junto do bloco. Quem lê passa a
 * conseguir conferir a conta sozinho, que é o único tipo de garantia que não
 * depende de ninguém lembrar de nada.
 */

import type { Escopo } from './tipos';

const PREFIXO: Record<Escopo['tipo'], string> = {
  conta: 'Todos os números abaixo são de',
  plataforma: 'Todos os números abaixo são de',
  campanha: 'Todos os números abaixo são da',
  grupo: 'Todos os números abaixo são do',
  ano: 'Todos os números abaixo são de',
};

export function EtiquetaEscopo({ escopo }: { escopo: Escopo }) {
  return (
    <p className="dc-escopo" data-tipo={escopo.tipo}>
      <span className="dc-escopo__texto">
        {PREFIXO[escopo.tipo]} <strong>{escopo.rotulo}</strong>.
      </span>
      {escopo.campanhasDoGrupo && escopo.campanhasDoGrupo.length > 0 && (
        <span className="dc-escopo__grupo">
          Agrupamento definido no cadastro do cliente, por identificador de campanha:{' '}
          {escopo.campanhasDoGrupo.join(', ')}.
        </span>
      )}
    </p>
  );
}
