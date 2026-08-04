/**
 * O CATÁLOGO — o único lugar que sabe transformar um bloco configurado em tela.
 *
 * É o equivalente, no portal, ao `client_report_formats` da fábrica, levado um
 * nível adiante: lá o formato é resolvido por TIPO de relatório; aqui, por
 * lista de blocos. Nos dois casos a regra é a mesma e não se negocia — **nunca
 * um `if` com o nome do cliente**. Um cliente novo entra escrevendo a montagem
 * dele, sem uma linha de código.
 *
 * Quando um bloco pede um dado que não existe no snapshot, o catálogo escreve
 * o que faltou em vez de renderizar nada. Seção que some sozinha é a pior
 * falha possível num relatório: ninguém percebe que devia haver algo ali.
 */

import type { ReactNode } from 'react';

import type { ChartTheme } from '../charts/chartTheme';
import B1FaixaIndicadores from './B1FaixaIndicadores';
import B2TabelaEntidades from './B2TabelaEntidades';
import B3EvolucaoMensal from './B3EvolucaoMensal';
import B4RankingCriativos from './B4RankingCriativos';
import B6QuebraPorDimensao from './B6QuebraPorDimensao';
import B7Glossario from './B7Glossario';
import B8ComentarioHumano from './B8ComentarioHumano';
import BlocoIndisponivel from './BlocoIndisponivel';
import type { BlocoConfigurado, DadosDeBloco } from './tipos';

export interface ContextoBloco {
  dados: DadosDeBloco;
  theme: ChartTheme;
  rotulosPlataforma: Record<string, string>;
}

function DadoFaltando({ bloco, chave }: { bloco: string; chave: string }) {
  return (
    <p className="dc-motivo">
      O bloco {bloco} desta montagem aponta para “{chave}”, que não existe neste relatório. Nada foi
      exibido no lugar, e isto é um erro de montagem — não uma ausência de dado do cliente.
    </p>
  );
}

export function renderizarBloco(config: BlocoConfigurado, ctx: ContextoBloco): ReactNode {
  /**
   * A indisponibilidade declarada vem ANTES de qualquer tentativa de
   * renderizar. Ela não é um erro que o bloco descobre: é uma decisão que a
   * montagem tomou, sabendo que o dado ainda não existe. Deixar o bloco tentar
   * e falhar produziria uma mensagem técnica no lugar de uma frase escrita
   * para o cliente ler.
   */
  if (config.indisponivel) {
    return <BlocoIndisponivel info={config.indisponivel} />;
  }

  switch (config.bloco) {
    case 'B1': {
      const faixa = ctx.dados.faixas[config.faixa];
      if (!faixa) return <DadoFaltando bloco="B1" chave={config.faixa} />;
      return <B1FaixaIndicadores faixa={faixa} config={config} />;
    }

    case 'B2': {
      const tabela = ctx.dados.tabelas[config.tabela];
      if (!tabela) return <DadoFaltando bloco="B2" chave={config.tabela} />;
      return (
        <B2TabelaEntidades
          tabela={tabela}
          config={config}
          theme={ctx.theme}
          rotulosPlataforma={ctx.rotulosPlataforma}
        />
      );
    }

    case 'B3': {
      const evolucao = ctx.dados.evolucoesMensais[config.evolucao];
      if (!evolucao) return <DadoFaltando bloco="B3" chave={config.evolucao} />;
      return <B3EvolucaoMensal evolucao={evolucao} />;
    }

    case 'B4': {
      const ranking = ctx.dados.rankingsCriativos[config.ranking];
      if (!ranking) return <DadoFaltando bloco="B4" chave={config.ranking} />;
      return <B4RankingCriativos ranking={ranking} />;
    }

    case 'B5':
      /**
       * B5 só existe declarado. Os dois usos do catálogo são séries diárias de
       * Google, que o conector ainda não devolve — e por isso a montagem
       * sempre traz `indisponivel`, que já foi tratado acima. Chegar aqui
       * significa que alguém configurou um B5 com dado disponível antes de o
       * renderizador existir; a mensagem diz isso em vez de renderizar vazio.
       */
      return (
        <p className="dc-motivo">
          Este bloco de série diária ainda não tem apresentação construída. Ele foi declarado no
          catálogo porque a fonte de dados correspondente não existe hoje.
        </p>
      );

    case 'B6': {
      const quebra = ctx.dados.quebras[config.quebra];
      if (!quebra) return <DadoFaltando bloco="B6" chave={config.quebra} />;
      return <B6QuebraPorDimensao quebra={quebra} theme={ctx.theme} />;
    }

    case 'B7':
      return <B7Glossario config={config} />;

    case 'B8': {
      /**
       * Único bloco em que dado faltando NÃO é erro de montagem: quando
       * ninguém escreveu comentário naquele mês, a seção simplesmente não
       * existe. Metade dos relatórios validados não tem nenhum comentário
       * humano e mesmo assim é entregue. Quem decide se a seção aparece é
       * `RelatorioMontado`, que a descarta antes de numerar — senão sobraria
       * um número de seção sem seção.
       */
      const comentario = ctx.dados.comentarios?.[config.comentario];
      return comentario ? <B8ComentarioHumano comentario={comentario} /> : null;
    }
  }
}
