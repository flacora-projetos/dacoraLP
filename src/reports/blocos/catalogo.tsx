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

    case 'B6': {
      const quebra = ctx.dados.quebras[config.quebra];
      if (!quebra) return <DadoFaltando bloco="B6" chave={config.quebra} />;
      return <B6QuebraPorDimensao quebra={quebra} theme={ctx.theme} />;
    }

    case 'B7':
      return <B7Glossario config={config} />;
  }
}
