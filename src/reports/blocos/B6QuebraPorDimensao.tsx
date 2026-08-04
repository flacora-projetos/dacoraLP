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
 */

import ComparacaoEntreCanais, { type ItemCanal } from '../charts/ComparacaoEntreCanais';
import type { ChartTheme } from '../charts/chartTheme';
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
        />

        {comNota.length > 0 && (
          <ul className="dc-notas-tabela">
            {comNota.map((item) => (
              <li key={item.id}>
                <strong>{item.rotulo}:</strong> {item.nota}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
