/**
 * Gráfico 1 do catálogo: evolução no tempo.
 *
 * Lê uma `Serie` do snapshot. Lacuna (`null`) é desenhada como interrupção da
 * linha — `connectNulls` fica desligado de propósito, para o gráfico não
 * inventar um valor que ninguém coletou.
 */

import { type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Serie } from '../snapshot';
import { formatarDiaMes } from '../format';
import type { ChartTheme } from './chartTheme';
import { PALETA } from './chartTheme';
import {
  LegendaRelatorio,
  MolduraGrafico,
  TickEixo,
  TooltipRelatorio,
  rotuloDia,
  usaMovimentoReduzido,
} from './primitivas';

interface Props {
  serie: Serie;
  theme: ChartTheme;
  controles?: ReactNode;
}

/** Resumo em texto do gráfico, calculado — nunca escrito à mão. */
function resumirSerie(serie: Serie): string {
  const partes: string[] = [];
  for (const chave of serie.chaves) {
    const valores = serie.pontos
      .map((p) => ({ data: p.data, v: p.valores[chave.id] }))
      .filter((p): p is { data: string; v: number } => typeof p.v === 'number');
    if (!valores.length) continue;
    const total = valores.reduce((a, b) => a + b.v, 0);
    const pico = valores.reduce((a, b) => (b.v > a.v ? b : a));
    const lacunas = serie.pontos.length - valores.length;
    partes.push(
      `${chave.rotulo} somou ${formatarTotal(total, serie)} na série, com pico em ${formatarDiaMes(
        pico.data,
      )}${lacunas ? ` e ${lacunas} dia(s) sem dado` : ''}`,
    );
  }
  return `${partes.join('. ')}.`;
}

function formatarTotal(total: number, serie: Serie): string {
  return new Intl.NumberFormat('pt-BR', {
    style: serie.unidade === 'brl' ? 'currency' : 'decimal',
    currency: 'BRL',
    maximumFractionDigits: serie.unidade === 'brl' ? 2 : 0,
    minimumFractionDigits: serie.unidade === 'brl' ? 2 : 0,
  }).format(total);
}

export default function EvolucaoNoTempo({ serie, theme, controles }: Props) {
  const reduzido = usaMovimentoReduzido();

  const dados = serie.pontos.map((ponto) => ({
    data: ponto.data,
    ...ponto.valores,
  }));

  const rotulos = Object.fromEntries(serie.chaves.map((c) => [c.id, c.rotulo]));

  const tabela = {
    titulo: serie.pergunta,
    colunas: ['Dia', ...serie.chaves.map((c) => c.rotulo)],
    linhas: serie.pontos.map((ponto) => ({
      rotulo: formatarDiaMes(ponto.data),
      celulas: serie.chaves.map((c) => {
        const v = ponto.valores[c.id];
        return typeof v === 'number' ? theme.completo(v, serie.unidade) : 'sem dado';
      }),
    })),
  };

  return (
    <MolduraGrafico
      pergunta={serie.pergunta}
      unidadeTexto={
        serie.unidade === 'brl' ? 'Em reais, por dia' : 'Em contatos, por dia'
      }
      resumo={resumirSerie(serie)}
      legenda={serie.chaves.map((c) => ({
        id: c.id,
        rotulo: c.rotulo,
        plataforma: c.plataforma,
      }))}
      theme={theme}
      controles={controles}
      tabela={tabela}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={theme.margem}>
          <defs>
            {serie.chaves.map((c) => {
              const estilo = theme.series[c.plataforma];
              return (
                <linearGradient
                  key={c.id}
                  id={`dc-area-${theme.proposta}-${c.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={estilo.cor} stopOpacity={theme.opacidadeArea} />
                  <stop offset="100%" stopColor={estilo.cor} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid
            vertical={theme.gradeVertical}
            stroke={theme.corGrade}
            strokeDasharray={theme.gradeTracejada}
          />

          <XAxis
            dataKey="data"
            axisLine={{ stroke: theme.corGrade }}
            tickLine={false}
            minTickGap={26}
            interval="preserveStartEnd"
            tick={(props) => <TickEixo {...props} theme={theme} formatar={rotuloDia} />}
          />

          <YAxis
            width={52}
            axisLine={false}
            tickLine={false}
            tickCount={5}
            tick={(props) => (
              <TickEixo
                {...props}
                theme={theme}
                ancora="end"
                deslocamentoY={4}
                formatar={(v) => theme.eixo(Number(v), serie.unidade)}
              />
            )}
          />

          <Tooltip
            cursor={{ stroke: PALETA.sage, strokeWidth: 1, strokeDasharray: '3 4' }}
            content={(props) => (
              <TooltipRelatorio
                {...props}
                theme={theme}
                unidade={serie.unidade}
                rotulos={rotulos}
                formatarRotulo={(v) => `Dia ${formatarDiaMes(String(v))}`}
              />
            )}
          />

          {serie.chaves.map((c) => {
            const estilo = theme.series[c.plataforma];
            return (
              <Area
                key={c.id}
                type="monotone"
                dataKey={c.id}
                name={c.rotulo}
                stroke={estilo.cor}
                strokeWidth={theme.espessuraLinha}
                strokeDasharray={estilo.tracejado}
                strokeLinecap="round"
                fill={`url(#dc-area-${theme.proposta}-${c.id})`}
                connectNulls={false}
                isAnimationActive={!reduzido}
                animationDuration={420}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const marcar =
                    theme.marcarACada > 0 &&
                    typeof props.index === 'number' &&
                    props.index % theme.marcarACada === 0 &&
                    typeof props.cy === 'number';
                  return (
                    <circle
                      key={`${c.id}-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={marcar ? 2.6 : 0}
                      fill={PALETA.superficie}
                      stroke={estilo.cor}
                      strokeWidth={1.6}
                    />
                  );
                }}
                activeDot={{
                  r: theme.raioPontoAtivo,
                  fill: estilo.cor,
                  stroke: PALETA.superficie,
                  strokeWidth: 2,
                }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </MolduraGrafico>
  );
}

export { LegendaRelatorio };
