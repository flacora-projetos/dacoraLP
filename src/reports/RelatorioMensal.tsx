/**
 * Relatório resolvido por TIPO — o formato do protótipo inicial da W0.
 *
 * O miolo vem de `src/reports/tipos/`, escolhido por `identidade.tipoRelatorio`
 * (serviços/leads x e-commerce). O esqueleto é compartilhado.
 *
 * > **Este caminho está sendo substituído.** A W0 mudou de abordagem: em vez
 * > de propor um formato e pedir aprovação, os relatórios passam a reproduzir
 * > os que a Fernanda já entrega e valida, montados a partir do catálogo de
 * > blocos (`src/reports/blocos/`, renderizado por `RelatorioMontado`). O que
 * > sobrevive daqui é o MOTOR — contrato do snapshot, tema de gráfico,
 * > catálogo fechado de gráficos, valor em três estados, formatação pt-BR. O
 * > que não sobrevive é o ARRANJO: quais seções, em que ordem, com quais
 * > métricas.
 * >
 * > As rotas `/relatorios/demo/b` e `/relatorios/demo/ecommerce` continuam de
 * > pé enquanto a W0 não fecha, para comparação. Não investir mais nelas.
 */

import { useMemo } from 'react';

import type { CompetenciaDisponivel, Snapshot } from './snapshot';
import { formatarCompetencia } from './format';
import { Indicador } from './componentes';
import { criarChartTheme, type PropostaId } from './charts/chartTheme';
import Esqueleto, { type SecaoRelatorio } from './Esqueleto';
import { CORPO_POR_TIPO } from './tipos';

interface Props {
  snapshot: Snapshot;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  demo?: { rotulo: string; href: string; descricao: string };
}

export default function RelatorioMensal({ snapshot, competencias, proposta, demo }: Props) {
  const theme = useMemo(() => criarChartTheme(proposta), [proposta]);
  const competenciaTexto = formatarCompetencia(snapshot.identidade.competencia);

  const secoes: SecaoRelatorio[] = useMemo(() => {
    const indicadores: SecaoRelatorio = {
      id: 'indicadores',
      titulo: `Os números que resumem ${competenciaTexto.split(' de ')[0]}`,
      apoio:
        'Cada indicador traz a fonte e a base de comparação. Valor que não veio aparece escrito, nunca como zero.',
      conteudo: (
        <div className="dc-kpis">
          {snapshot.indicadores.map((metrica) => (
            <Indicador key={metrica.id} metrica={metrica} />
          ))}
        </div>
      ),
    };

    return [indicadores, ...CORPO_POR_TIPO[snapshot.identidade.tipoRelatorio]({ snapshot, theme })];
  }, [snapshot, theme, competenciaTexto]);

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
