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
import { textoParaCliente } from './motivo-cliente';
import type {
  BlocoB2,
  ColunaTabela,
  CoberturaTabela,
  DimensaoEntidade,
  TabelaEntidades,
} from './tipos';

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

/**
 * C2 da direção de 2026-08-12: "blocos grandes demais... como o de termos e
 * palavras-chave do Google" abrem resumidos. As duas dimensões que o PO citou
 * são as únicas que costumam vir com muita linha — campanha e grupo de
 * anúncios continuam abrindo inteiros, porque não é sobre eles a queixa.
 */
const DIMENSOES_QUE_RECOLHEM: DimensaoEntidade[] = ['palavra_chave', 'termo_de_pesquisa'];
const LIMITE_LINHAS_VISIVEIS = 8;

/**
 * O aviso de lista parcial, e ele vem ANTES da tabela de propósito.
 *
 * Quem lê uma tabela lê os números primeiro e as notas depois — se é que lê. Um
 * aviso embaixo chega tarde: a essa altura o leitor já somou a coluna de
 * investimento e concluiu que aquele é o gasto do mês. Aqui a ordem é o que faz
 * o trabalho, não o texto.
 *
 * Ele não calcula percentual nem diferença: se um dos dois lados não for uma
 * medição, uma conta feita aqui viraria número inventado na tela. Imprime os
 * dois valores lado a lado e deixa a subtração com quem lê.
 */
function AvisoCobertura({
  cobertura,
  rotuloColuna,
  unidade,
  sufixo,
  somaListada,
}: {
  cobertura: CoberturaTabela;
  rotuloColuna: string;
  unidade: ColunaTabela['unidade'];
  sufixo?: string;
  somaListada: Valor | null;
}) {
  const motivos = cobertura.motivos.map(textoParaCliente);
  return (
    <div className="dc-cobertura" role="note" aria-label="Esta lista é parcial">
      <p className="dc-cobertura__rotulo">Lista parcial</p>
      <p className="dc-cobertura__linha">
        {rotuloColuna} da lista abaixo:{' '}
        <strong>{textoValor(somaListada ?? SEM_COLUNA, unidade, sufixo)}</strong>, de{' '}
        <strong>{textoValor(cobertura.totalDoUniverso, unidade, sufixo)}</strong> em{' '}
        {cobertura.universo}. <strong>Esta lista representa só uma parte do total.</strong>
      </p>
      {motivos.length > 0 && (
        <ul className="dc-cobertura__motivos">
          {motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
      <p className="dc-motivo">Esta tabela não está disponível neste relatório.</p>
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

  /**
   * A coluna medida pela cobertura precisa existir. Montagem que aponta para
   * coluna inexistente é erro nosso — e, calada, produziria um aviso sem número
   * de um lado, que é pior que aviso nenhum.
   */
  const colunaCobertura = tabela.cobertura
    ? tabela.colunas.find((c) => c.id === tabela.cobertura!.colunaId)
    : undefined;

  return (
    <>
      <EtiquetaEscopo escopo={tabela.escopo} />
      {tabela.cobertura && colunaCobertura && (
        <AvisoCobertura
          cobertura={tabela.cobertura}
          rotuloColuna={colunaCobertura.rotulo}
          unidade={colunaCobertura.unidade}
          sufixo={colunaCobertura.sufixo}
          somaListada={tabela.total.valores[colunaCobertura.id] ?? null}
        />
      )}
      {tabela.cobertura && !colunaCobertura && (
        <p className="dc-motivo">Esta lista parcial não está disponível neste relatório.</p>
      )}
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
          notas={tabela.definicoes.map(textoParaCliente)}
          participacaoRotulo={config.participacaoRotulo}
          limiteLinhasVisiveis={
            DIMENSOES_QUE_RECOLHEM.includes(tabela.dimensao) ? LIMITE_LINHAS_VISIVEIS : undefined
          }
        />
      </div>
    </>
  );
}
