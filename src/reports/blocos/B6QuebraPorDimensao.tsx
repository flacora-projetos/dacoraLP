/**
 * B6 — Quebra por dimensão não temporal.
 *
 * Uma métrica dividida por uma dimensão categórica: investimento por região no
 * ICH, mensagens por dia da semana na VetSell, tipo de conversão no Zenun.
 *
 * Reusa o gráfico 2 do catálogo fechado (comparação entre categorias). Não
 * estreia tipo de gráfico: a pizza do Zenun continua sendo decisão pendente do
 * PO, com recomendação registrada de não abrir a exceção — duas fatias cabem
 * inteiras numa comparação em barras, que é mais legível no celular e entrega
 * exatamente a mesma informação.
 *
 * Regra da casa que este bloco carrega sozinho: a categoria `Unknown` que a
 * Meta devolve é **valor real da plataforma, não ausência**. Ela quer dizer
 * "a Meta não determinou a região deste gasto". Escondê-la seria tão errado
 * quanto tratá-la como zero — e no ICH ela existe, com R$ 0,03. Vai para a
 * tela traduzida e com a explicação junto, porque `Unknown` em inglês num
 * relatório de cliente é o mesmo problema do `ADSET_PAUSED`.
 *
 * O bloco também imprime o **total apurado** e as **definições**, quando quem
 * montou o dado os manda. Os dois campos existiam no contrato e eram
 * silenciosamente descartados aqui — a primeira quebra de investimento por
 * região que chegou à tela mostrou três estados e nenhum total, sendo que a
 * soma deles é exatamente o mês. Campo que chega e ninguém lê não dá erro:
 * some.
 */

import ComparacaoEntreCanais, { type ItemCanal } from '../charts/ComparacaoEntreCanais';
import type { ChartTheme } from '../charts/chartTheme';
import { textoValor } from '../format';
import { EtiquetaEscopo } from './escopo';
import type { QuebraPorDimensao } from './tipos';

interface Props {
  quebra: QuebraPorDimensao;
  theme: ChartTheme;
}

export default function B6QuebraPorDimensao({ quebra, theme }: Props) {
  const itens: ItemCanal[] = quebra.itens.map((item) => ({
    plataforma: quebra.plataforma,
    rotulo: item.rotulo,
    valor: item.valor,
  }));

  const comNota = quebra.itens.filter((item) => item.nota);

  return (
    <>
      <EtiquetaEscopo escopo={quebra.escopo} />
      <div className="dc-superficie">
        <ComparacaoEntreCanais
          pergunta={quebra.pergunta}
          unidade={quebra.unidade}
          unidadeTexto={quebra.unidadeTexto}
          itens={itens}
          theme={theme}
          rotuloCategoria={quebra.rotuloDimensao ?? 'Categoria'}
        />

        {/*
          O total vai como linha de texto, com o mesmo formato que o B3 usa
          quando a evolução vira gráfico: somar barras de olho não é leitura
          possível, e no gráfico não existe rodapé de tabela onde ele caberia.
        */}
        {quebra.total && (
          <p className="dc-total-periodo">
            <span className="dc-total-periodo__rotulo">{quebra.total.rotulo}</span>
            <span className="dc-total-periodo__item">
              <strong>{textoValor(quebra.total.valor, quebra.unidade)}</strong>
            </span>
          </p>
        )}

        {(comNota.length > 0 || (quebra.definicoes?.length ?? 0) > 0) && (
          <ul className="dc-notas-tabela">
            {comNota.map((item) => (
              <li key={item.id}>
                <strong>{item.rotulo}:</strong> {item.nota}
              </li>
            ))}
            {quebra.definicoes?.map((nota) => <li key={nota}>{nota}</li>)}
          </ul>
        )}
      </div>
    </>
  );
}
