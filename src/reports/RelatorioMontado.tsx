/**
 * Relatório montado a partir do CATÁLOGO DE BLOCOS.
 *
 * É o caminho da W0 depois da mudança de abordagem: em vez de propor um
 * formato novo e perguntar "você gostou?", reproduzir os relatórios que a
 * Fernanda já entrega e valida, e perguntar "está fiel?".
 *
 * A fidelidade combinada é de **informação, não de pixel**: mesmas seções,
 * mesmas métricas, mesma ordem; a forma é nossa. E ela tem um limite explícito
 * — **as regras da casa não se dobram à fidelidade**. Onde o relatório de
 * origem transforma ausência em zero, imprime status cru de API em inglês ou
 * mistura escopos numa mesma faixa de números, nós apontamos em vez de copiar.
 *
 * Este componente é curto de propósito. Ele não sabe o que é uma campanha, uma
 * região ou um criativo: percorre a montagem, pede ao catálogo que renderize
 * cada bloco e entrega a lista de seções ao esqueleto. Toda a inteligência de
 * apresentação está nos blocos, e todo o dado está no snapshot.
 */

import { useMemo } from 'react';

import type { CompetenciaDisponivel } from './snapshot';
import { criarChartTheme, type PropostaId } from './charts/chartTheme';
import Esqueleto, { type SecaoRelatorio } from './Esqueleto';
import { renderizarBloco } from './blocos/catalogo';
import type { SnapshotMontado } from './blocos/tipos';

interface Props {
  snapshot: SnapshotMontado;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  demo?: { rotulo: string; href: string; descricao: string };
}

export default function RelatorioMontado({ snapshot, competencias, proposta, demo }: Props) {
  const theme = useMemo(() => criarChartTheme(proposta), [proposta]);

  const secoes: SecaoRelatorio[] = useMemo(() => {
    /**
     * Os rótulos de plataforma saem das FONTES, não de uma lista de canais: a
     * fonte é quem já declara "Meta Ads" com a conta consultada e a situação da
     * coleta. Manter duas listas de nome de plataforma seria criar duas
     * verdades para a mesma coisa.
     */
    const rotulosPlataforma = Object.fromEntries(
      snapshot.fontes.map((fonte) => [fonte.plataforma, fonte.rotulo]),
    );

    return snapshot.montagem.map((config) => ({
      id: config.id,
      titulo: config.titulo,
      apoio: config.apoio,
      conteudo: renderizarBloco(config, {
        dados: snapshot.dados,
        theme,
        rotulosPlataforma,
      }),
    }));
  }, [snapshot, theme]);

  return (
    <Esqueleto
      snapshot={snapshot}
      competencias={competencias}
      proposta={proposta}
      secoes={secoes}
      demo={demo}
    />
  );
}
