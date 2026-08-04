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
import { Indicador } from '../componentes';
import { EtiquetaEscopo } from './escopo';
import type { BlocoB1, FaixaIndicadores } from './tipos';

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
    descricao: config.descricaoSobNumero ? metrica.descricao : undefined,
  }));

  return (
    <>
      <EtiquetaEscopo escopo={faixa.escopo} />
      <div className="dc-kpis">
        {metricas.map((metrica) => (
          <Indicador key={metrica.id} metrica={metrica} />
        ))}
      </div>
    </>
  );
}
