/**
 * Gráfico 2 do catálogo: comparação entre canais.
 *
 * Barra horizontal com rótulo direto: nome do canal à esquerda, valor à
 * direita, barra embaixo. Não depende de legenda nem de tooltip — a página
 * continua compreensível antes de qualquer interação, e o layout aguenta
 * 320 px de largura sem rolagem lateral.
 *
 * A distinção entre canais é por luminosidade E textura, nunca só por cor.
 * Canal sem valor aparece escrito ("indisponível" / "falha na coleta"),
 * nunca como barra de tamanho zero.
 */

import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { PlataformaId, Unidade, Valor } from '../snapshot';
import { formatarParticipacao, textoDoEstadoVazio } from '../format';
import { PALETA, preenchimentoBarra, type ChartTheme } from './chartTheme';
import { MolduraGrafico, TexturasSVG, usaLargura, usaMovimentoReduzido } from './primitivas';

export interface ItemCanal {
  plataforma: PlataformaId;
  rotulo: string;
  valor: Valor;
}

interface Props {
  pergunta: string;
  unidade: Unidade;
  unidadeTexto: string;
  itens: ItemCanal[];
  theme: ChartTheme;
  /** Quando true, o resumo cita a participação de cada canal no total. */
  mostrarParticipacao?: boolean;
}

const MARGEM = { top: 22, right: 0, bottom: 2, left: 0 };

export default function ComparacaoEntreCanais({
  pergunta,
  unidade,
  unidadeTexto,
  itens,
  theme,
  mostrarParticipacao = true,
}: Props) {
  const reduzido = usaMovimentoReduzido();
  const { ref, largura } = usaLargura<HTMLDivElement>();

  const dados = itens.map((item) => ({
    rotulo: item.rotulo,
    plataforma: item.plataforma,
    valor: item.valor.estado === 'ok' ? item.valor.numero : null,
    ausencia: item.valor.estado === 'ok' ? null : textoDoEstadoVazio(item.valor),
  }));

  const total = dados
    .map((d) => d.valor)
    .filter((v): v is number => typeof v === 'number')
    .reduce((a, b) => a + b, 0);

  const resumo = dados
    .map((d) => {
      if (d.valor === null) return `${d.rotulo}: ${d.ausencia}`;
      const share =
        mostrarParticipacao && total > 0
          ? ` (${formatarParticipacao(d.valor / total)} do total)`
          : '';
      return `${d.rotulo}: ${theme.completo(d.valor, unidade)}${share}`;
    })
    .join('. ');

  const linhaAltura = theme.espessuraBarra + 38;
  const altura = itens.length * linhaAltura + MARGEM.top;
  const larguraPlot = Math.max(largura - MARGEM.left - MARGEM.right, 0);

  return (
    <MolduraGrafico
      pergunta={pergunta}
      unidadeTexto={unidadeTexto}
      resumo={`${resumo}.`}
      theme={theme}
      alturaLivre
      tabela={{
        titulo: pergunta,
        colunas: ['Canal', unidadeTexto],
        linhas: dados.map((d) => ({
          rotulo: d.rotulo,
          celulas: [d.valor === null ? (d.ausencia ?? '—') : theme.completo(d.valor, unidade)],
        })),
      }}
    >
      <div ref={ref} style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={MARGEM} barCategoryGap="34%">
            <TexturasSVG theme={theme} />
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="rotulo" hide />

            <Bar
              dataKey="valor"
              barSize={theme.espessuraBarra}
              isAnimationActive={!reduzido}
              animationDuration={420}
              shape={(props: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                payload?: { plataforma: PlataformaId; valor: number | null };
              }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                if (!payload) return <g />;
                const estilo = theme.series[payload.plataforma];
                return (
                  <g>
                    {/* trilho: mostra o espaço total, para a barra ter escala visível */}
                    <rect
                      x={MARGEM.left}
                      y={y}
                      width={larguraPlot}
                      height={height}
                      rx={theme.raioBarra}
                      fill={PALETA.tinta}
                      fillOpacity={0.05}
                    />
                    {payload.valor === null ? null : (
                      <>
                        <rect
                          x={x}
                          y={y}
                          width={Math.max(width, 2)}
                          height={height}
                          rx={theme.raioBarra}
                          fill={preenchimentoBarra(theme, payload.plataforma)}
                        />
                        {estilo.textura === 'hachura' && (
                          <rect
                            x={x}
                            y={y}
                            width={Math.max(width, 2)}
                            height={height}
                            rx={theme.raioBarra}
                            fill="none"
                            stroke={estilo.cor}
                            strokeWidth={1}
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              }}
            >
              <LabelList
                dataKey="valor"
                content={(props: {
                  x?: number | string;
                  y?: number | string;
                  index?: number;
                }) => {
                  const i = props.index ?? 0;
                  const item = dados[i];
                  if (!item || !larguraPlot) return null;
                  const y = Number(props.y ?? 0) - 10;
                  const semValor = item.valor === null;
                  return (
                    <g>
                      <text
                        x={MARGEM.left}
                        y={y}
                        textAnchor="start"
                        fill={theme.corEixo}
                        fontFamily={theme.fonte}
                        fontSize={theme.tamanhoEixo + 0.5}
                        fontWeight={500}
                        letterSpacing={`${theme.espacamentoEixo}em`}
                      >
                        {item.rotulo}
                      </text>
                      <text
                        x={MARGEM.left + larguraPlot}
                        y={y}
                        textAnchor="end"
                        fill={semValor ? PALETA.sinal : theme.corEixoForte}
                        fontFamily={theme.fonte}
                        fontSize={theme.tamanhoEixo + 2.5}
                        fontWeight={semValor ? 500 : 600}
                        fontStyle={semValor ? 'italic' : 'normal'}
                      >
                        {semValor
                          ? (item.ausencia ?? '—')
                          : theme.completo(item.valor as number, unidade)}
                      </text>
                    </g>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MolduraGrafico>
  );
}
