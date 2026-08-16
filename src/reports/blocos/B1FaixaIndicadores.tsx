/**
 * B1 — Faixa de indicadores.
 *
 * O bloco mais repetido do catálogo: aparece nos seis relatórios validados, e
 * várias vezes dentro do mesmo (a Aviarte usa cinco, o ICH quatro).
 *
 * De três a oito números com rótulo, valor e, quase sempre, a variação contra
 * o período anterior.
 *
 * Regras da casa, que NÃO são parâmetro de montagem:
 *  • ausência aparece escrita, nunca como zero;
 *  • variação vem acompanhada da base comparada;
 *  • alta não é verde automaticamente — quem decide é a direção favorável da
 *    própria métrica, porque CPM subindo é ruim e mensagem subindo é boa;
 *  • valor travado pela plataforma (o Google devolve 0.9001 acima de 90% e
 *    0.0999 abaixo de 10%) é faixa, não medição, e nunca entra em comparação.
 *
 * O escopo é impresso sempre. Ver `escopo.tsx` para o defeito real que isso
 * corrige.
 */

import type { Metrica } from '../snapshot';
import { Indicador, NotasDoBloco } from '../componentes';
import { textoParaCliente } from './motivo-cliente';
import { termoDoGlossario } from '../glossario';
import { EtiquetaEscopo } from './escopo';
import type { BlocoB1, FaixaIndicadores } from './tipos';

function descricaoDe(metrica: Metrica): string | undefined {
  const termo = metrica.glossarioId ? termoDoGlossario(metrica.glossarioId) : undefined;
  return termo?.texto ?? metrica.descricao;
}

interface Props {
  faixa: FaixaIndicadores;
  config: BlocoB1;
}

export default function B1FaixaIndicadores({ faixa, config }: Props) {
  /**
   * Esconder a variação é decisão de montagem, e é diferente de não ter
   * variação. Quando a montagem pede para esconder, o comparativo some da
   * tela; ele não é apagado do snapshot nem substituído por outra coisa.
   */
  const metricas: Metrica[] = faixa.metricas.map((metrica) => ({
    ...metrica,
    comparativo: config.mostrarVariacao ? metrica.comparativo : undefined,
    /**
     * Quando a montagem pede explicação sob o número — é o caso do Zenun, o
     * único cliente que põe o glossário ali em vez do rodapé — o texto vem do
     * glossário, escrito uma vez por métrica em código. A `descricao` do
     * snapshot só entra quando não há termo de glossário, para o caso raro de
     * uma explicação que só faz sentido naquele cliente.
     */
    descricao: config.descricaoSobNumero ? descricaoDe(metrica) : undefined,
  }));

  /**
   * A SEÇÃO É DE UMA PLATAFORMA SÓ? — 2026-08-15.
   *
   * Quando todos os números vêm da mesma fonte única, o "Via Meta Ads" sob cada
   * um é repetição: o título da seção já diz. Faixa que mistura plataformas
   * mantém a origem em cada número, porque ali ela distingue de verdade.
   */
  const fontesDaFaixa = new Set(
    metricas.flatMap((metrica) => (metrica.origem.fontes.length === 1 ? metrica.origem.fontes : ['+'])),
  );
  const plataformaUnica = fontesDaFaixa.size === 1 && !fontesDaFaixa.has('+');

  /**
   * As fórmulas descem para o pé da faixa, com o nome da métrica na frente.
   *
   * Decisão do Flávio em 2026-08-15, ajustando a regra anterior de "a fórmula
   * fica impressa junto do número": ela continua na mesma seção, a um palmo do
   * valor, e para de empurrar os números para baixo. A do CPC é a que mais
   * importa e a que mais se perdia no meio das outras — "cliques totais" e
   * "cliques no link" dão números diferentes com o mesmo nome.
   */
  const formulas = metricas
    .filter((metrica) => metrica.origem.formula && metrica.valor.estado === 'ok')
    .map((metrica) => `${metrica.rotulo}: ${metrica.origem.formula}`);

  return (
    <>
      <EtiquetaEscopo escopo={faixa.escopo} />
      <div className="dc-kpis">
        {metricas.map((metrica) => (
          <Indicador key={metrica.id} metrica={metrica} origem={plataformaUnica ? 'oculto' : 'completo'} />
        ))}
      </div>
      {/*
       * ⚠️ **A LISTA DE FÓRMULAS NUNCA É RECOLHIDA**, e isso é uma correção de
       * curso feita na conferência em tela.
       *
       * Ela chegou a usar `NotasDoBloco`, que recolhe a partir de três itens —
       * e escondeu atrás de um clique a fórmula do CPC. É exatamente a que não
       * pode se esconder: "cliques totais" e "cliques no link" dão números
       * diferentes com o mesmo nome (na Aviarte, R$ 0,40 contra R$ 0,60), e a
       * regra da casa manda a fórmula acompanhar o número.
       *
       * O PO pediu a fórmula "numa nota só, no pé da seção" — não pediu que ela
       * sumisse. Recolher é para as notas descritivas da tabela, que são muitas
       * e opcionais; a conta de um número publicado é outra coisa.
       */}
      {plataformaUnica && formulas.length > 0 && (
        <ul className="dc-notas-tabela dc-formulas">
          {formulas.map((formula) => (
            <li key={formula}>{textoParaCliente(formula)}</li>
          ))}
        </ul>
      )}
    </>
  );
}
