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

/**
 * ELA SÓ APARECE QUANDO O RECORTE É MAIS ESTREITO QUE A CONTA — 2026-08-15.
 *
 * Medido na página: a seção "Meta Ads em julho" abria com a frase do bloco
 * ("todos os números são da conta inteira do Meta Ads, com a comparação ao
 * lado") e, na linha seguinte, com esta etiqueta dizendo "Todos os números
 * abaixo são de toda a conta do Meta Ads". **A mesma informação, duas vezes,
 * coladas, antes do primeiro número** — e o título da seção já dizia a
 * terceira. Numa seção de seis números, 54% dos caracteres eram método.
 *
 * ⚠️ **O valor desta etiqueta está no recorte ESTREITO, e é lá que ela fica.**
 * O defeito que a originou (ICH) era exatamente esse caso: uma página presa a
 * UMA campanha publicando um custo calculado com o investimento da conta
 * inteira. Em `campanha` e `grupo` ela continua impressa, porque ali o leitor
 * não tem como saber sozinho de que fatia é o número. Em `conta`, `plataforma`
 * e `ano` o título da seção já responde, e repetir só empurra o número para
 * baixo.
 *
 * O dado não muda: `escopo` continua inteiro no snapshot, para auditoria.
 */
const RECORTES_QUE_PRECISAM_SE_DECLARAR: ReadonlyArray<Escopo['tipo']> = ['campanha', 'grupo'];

export function EtiquetaEscopo({ escopo }: { escopo: Escopo }) {
  if (!RECORTES_QUE_PRECISAM_SE_DECLARAR.includes(escopo.tipo)) return null;

  return (
    <p className="dc-escopo" data-tipo={escopo.tipo}>
      <span className="dc-escopo__texto">
        {PREFIXO[escopo.tipo]} <strong>{escopo.rotulo}</strong>.
      </span>
      {/*
       * Os identificadores de campanha do cadastro NÃO vão para a página do
       * cliente. "camp_frio_video, camp_frio_carrossel, camp_frio_estatico" é
       * nome interno nosso: não diz nada a quem lê e ocupa duas linhas na
       * seção. Os nomes de verdade das campanhas já aparecem na tabela, e o
       * agrupamento continua no snapshot para auditoria.
       */}
    </p>
  );
}
