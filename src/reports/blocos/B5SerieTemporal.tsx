/**
 * B5 — série temporal: uma métrica dia a dia dentro do mês.
 *
 * Este bloco passou meses declarado e sem renderizador, e isso era o certo: os
 * dois usos do catálogo (Zenun e Karyne) são séries diárias de Google, e o
 * conector não aceitava incremento de tempo. Em 2026-08-04 ele passou a
 * aceitar, conferido por chamada real, e o bloco virou o embrulho de poucas
 * linhas que estava previsto.
 *
 * Toda a apresentação vem de `EvolucaoNoTempo`, que é o gráfico nº 1 do
 * catálogo fechado e já está provado nas rotas antigas. Nada de tipo novo.
 *
 * A regra que este bloco carrega e que o gráfico sozinho não garantiria: dia
 * sem dado é **lacuna preservada**, nunca zero. São coisas diferentes e a
 * distinção é visível — `connectNulls` está desligado no gráfico, então a
 * linha interrompe em vez de atravessar por cima do buraco. "Não veiculamos
 * neste dia" e "veiculamos e não converteu" são leituras opostas, e o segundo
 * caso é um zero legítimo, que desenha ponto na base.
 */

import EvolucaoNoTempo from '../charts/EvolucaoNoTempo';
import type { ChartTheme } from '../charts/chartTheme';
import type { Serie } from '../snapshot';

interface Props {
  serie: Serie;
  theme: ChartTheme;
}

export default function B5SerieTemporal({ serie, theme }: Props) {
  return (
    <div className="dc-superficie">
      <EvolucaoNoTempo serie={serie} theme={theme} />

      {serie.observacoes.length > 0 && (
        <ul className="dc-notas-tabela">
          {serie.observacoes.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
