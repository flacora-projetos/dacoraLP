/**
 * B2 — Tabela de entidades com métricas.
 *
 * Aparece nos seis relatórios validados, e é o bloco que mais se paga: uma
 * única peça cobre cinco tabelas que pareciam diferentes — campanha, grupo de
 * anúncios, palavra-chave, termo de pesquisa e produto do PMax.
 *
 * O bloco não desenha a tabela: ele traduz o dado do snapshot para o gráfico 3
 * do catálogo fechado (`TabelaDeEntidades`). Nenhum tipo de tabela novo entra
 * aqui sem decisão do PO.
 *
 * Regras da casa:
 *  • "não se aplica" imprime traço, nunca zero. A campanha de tráfego do ICH
 *    não tem o evento de mensagem: ela mostra `-`, e isso é diferente de
 *    "indisponível";
 *  • o total vem apurado no snapshot — a página não soma;
 *  • toda coluna calculada leva a fórmula impressa embaixo da tabela.
 */

import type { Valor } from '../snapshot';
import { textoValor } from '../format';
import TabelaDeEntidades, {
  type ColunaEntidade,
  type LinhaEntidade,
} from '../charts/TabelaDeEntidades';
import type { ChartTheme } from '../charts/chartTheme';
import { EtiquetaEscopo } from './escopo';
import type { BlocoB2, ColunaTabela, TabelaEntidades } from './tipos';

interface Props {
  tabela: TabelaEntidades;
  config: BlocoB2;
  theme: ChartTheme;
  rotulosPlataforma: Record<string, string>;
}

const paraColuna = (coluna: ColunaTabela): ColunaEntidade => ({
  id: coluna.id,
  rotulo: coluna.rotulo,
  unidade: coluna.unidade,
  sufixo: coluna.sufixo,
  secundaria: coluna.secundaria,
});

/** Valor de coluna que a coleta nem sequer devolveu para aquela linha. */
const SEM_COLUNA: Valor = {
  estado: 'ausente',
  motivo: 'A coleta não trouxe esta métrica para esta linha.',
};

export default function B2TabelaEntidades({
  tabela,
  config,
  theme,
  rotulosPlataforma,
}: Props) {
  const principal = tabela.colunas.find((c) => c.id === tabela.colunaPrincipal);
  if (!principal) {
    /**
     * Montagem inconsistente é erro nosso, não do cliente: em vez de renderizar
     * uma tabela sem eixo, o bloco diz o que faltou. Silêncio aqui viraria uma
     * seção vazia que ninguém saberia explicar.
     */
    return (
      <p className="dc-motivo">
        Esta tabela não pôde ser montada: a coluna principal “{tabela.colunaPrincipal}” não existe
        entre as colunas configuradas.
      </p>
    );
  }

  const secundarias = tabela.colunas.filter((c) => c.id !== tabela.colunaPrincipal);

  const linhas: LinhaEntidade[] = tabela.linhas.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    plataforma: linha.plataforma,
    situacao: linha.situacao,
    etiqueta: linha.etiqueta,
    principal: linha.valores[principal.id] ?? SEM_COLUNA,
    colunas: Object.fromEntries(
      secundarias.map((coluna) => [coluna.id, linha.valores[coluna.id] ?? SEM_COLUNA]),
    ),
    detalhes: tabela.colunas.map((coluna) => ({
      rotulo: coluna.rotulo,
      texto: textoValor(linha.valores[coluna.id] ?? SEM_COLUNA, coluna.unidade, coluna.sufixo),
    })),
  }));

  return (
    <>
      <EtiquetaEscopo escopo={tabela.escopo} />
      <div className="dc-superficie">
        <TabelaDeEntidades
          pergunta={config.pergunta}
          theme={theme}
          rotuloDimensao={tabela.rotuloDimensao}
          rotulosPlataforma={rotulosPlataforma}
          principal={paraColuna(principal)}
          colunas={secundarias.map(paraColuna)}
          linhas={linhas}
          total={{
            rotulo: tabela.total.rotulo,
            principal: tabela.total.valores[principal.id] ?? SEM_COLUNA,
            colunas: Object.fromEntries(
              secundarias.map((coluna) => [coluna.id, tabela.total.valores[coluna.id] ?? null]),
            ),
          }}
          notas={tabela.definicoes}
          participacaoRotulo={config.participacaoRotulo}
        />
      </div>
    </>
  );
}
