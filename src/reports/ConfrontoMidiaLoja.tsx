/**
 * O bloco que mostra a divergência entre o que a mídia atribui e o que a loja
 * registrou. É específico do relatório de e-commerce.
 *
 * Três decisões que o desenho precisa sustentar:
 *
 *  1. Os dois números aparecem inteiros, lado a lado, com o mesmo peso
 *     tipográfico. Nenhum é apresentado como o correto, nenhum é ajustado
 *     para caber no outro.
 *  2. A diferença é mostrada como diferença — valor e percentual, com a base
 *     do percentual escrita. Não é "erro", não é "perda", não é "vazamento".
 *  3. Não há gráfico aqui, de propósito. Uma barra ao lado da outra sugere
 *     que os dois números medem a mesma coisa em escalas comparáveis, e é
 *     exatamente isso que não é verdade. O catálogo de gráficos continua com
 *     três tipos.
 *
 * Nenhum texto desta tela é escrito pelo modelo: a explicação vem pronta do
 * snapshot, montada pelo gerador a partir dos números já apurados.
 */

import type { ConfrontoReceita, FonteDeVenda } from './snapshot';
import { textoPercentual1, textoValor } from './format';
import { ValorExibido } from './componentes';

function LadoDoConfronto({
  rotulo,
  descricao,
  receita,
  pedidos,
  pedidosRotulo,
}: ConfrontoReceita['midia']) {
  return (
    <article className="dc-confronto__lado">
      <h3 className="dc-confronto__rotulo">{rotulo}</h3>
      <ValorExibido valor={receita} unidade="brl" className="dc-confronto__valor" />
      <p className="dc-confronto__contagem">
        {textoValor(pedidos, 'inteiro')} {pedidosRotulo}
      </p>
      <p className="dc-confronto__descricao">{descricao}</p>
    </article>
  );
}

function LinhaFonte({ fonte }: { fonte: FonteDeVenda }) {
  return (
    <tr data-papel={fonte.papel} data-soma={fonte.soma ? 'sim' : undefined}>
      <th scope="row">
        <span className="dc-fonte-venda__nome">{fonte.rotulo}</span>
        {fonte.observacao && (
          <span className="dc-fonte-venda__observacao">{fonte.observacao}</span>
        )}
      </th>
      <td>{fonte.oQueConta}</td>
      <td>{fonte.janela}</td>
      <td className="dc-num">{textoValor(fonte.receita, 'brl')}</td>
      <td className="dc-num">{textoValor(fonte.pedidos, 'inteiro')}</td>
    </tr>
  );
}

export default function ConfrontoMidiaLoja({ confronto }: { confronto: ConfrontoReceita }) {
  const { midia, loja, diferenca, explicacao, fontes } = confronto;

  return (
    <div className="dc-confronto">
      <div className="dc-superficie dc-confronto__quadro">
        <div className="dc-confronto__lados">
          <LadoDoConfronto {...midia} />
          <div className="dc-confronto__separador" aria-hidden="true" />
          <LadoDoConfronto {...loja} />
        </div>

        <div className="dc-confronto__diferenca">
          <span className="dc-confronto__diferenca-rotulo">Diferença entre as duas contagens</span>
          <p className="dc-confronto__diferenca-valor">
            {textoValor(diferenca.receita, 'brl')}
            <span className="dc-confronto__diferenca-percentual">
              {textoPercentual1(diferenca.receitaPercentual)} {diferenca.base}
            </span>
          </p>
          <p className="dc-confronto__diferenca-secundaria">
            Em pedidos: {textoValor(diferenca.pedidos, 'inteiro')} a mais (
            {textoPercentual1(diferenca.pedidosPercentual)}).
          </p>
        </div>
      </div>

      <div className="dc-superficie dc-confronto__texto">
        {explicacao.map((paragrafo) => (
          <p key={paragrafo}>{paragrafo}</p>
        ))}
      </div>

      <div className="dc-superficie">
        <h3 className="dc-confronto__titulo-tabela">
          O que cada fonte conta, e em que janela
        </h3>
        <div className="dc-confronto__rolagem">
          <table className="dc-tabela-fontes-venda">
            <caption className="dc-sr">
              Fontes que contam venda neste relatório, o que cada uma conta, a janela declarada
              por ela e os valores do período.
            </caption>
            <thead>
              <tr>
                <th scope="col">Fonte</th>
                <th scope="col">O que ela conta</th>
                <th scope="col">Janela declarada</th>
                <th scope="col" className="dc-num">
                  Receita
                </th>
                <th scope="col" className="dc-num">
                  Contagem
                </th>
              </tr>
            </thead>
            <tbody>
              {fontes.map((fonte) => (
                <LinhaFonte key={fonte.id} fonte={fonte} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
