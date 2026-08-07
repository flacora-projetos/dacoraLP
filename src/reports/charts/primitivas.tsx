/**
 * Peças próprias que substituem os componentes padrão do Recharts:
 * eixo, tooltip, legenda, textura de barra e moldura do gráfico.
 *
 * Nenhuma delas decide aparência: todas leem `ChartTheme`.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlataformaId, Unidade } from '../snapshot';
import { formatarDiaMes } from '../format';
import { idTextura, type ChartTheme } from './chartTheme';

/* ------------------------------------------------------------------ */
/* Movimento                                                           */
/* ------------------------------------------------------------------ */

export function usaMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzido(mq.matches);
    const ouvir = (e: MediaQueryListEvent) => setReduzido(e.matches);
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, []);
  return reduzido;
}

/** Largura real do elemento — usada para posicionar rótulo direto no gráfico. */
export function usaLargura<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width);
    });
    observador.observe(alvo);
    setLargura(alvo.getBoundingClientRect().width);
    return () => observador.disconnect();
  }, []);
  return { ref, largura };
}

/* ------------------------------------------------------------------ */
/* Texturas de barra (contraste sem depender de cor)                   */
/* ------------------------------------------------------------------ */

export function TexturasSVG({ theme }: { theme: ChartTheme }) {
  const plataformas = Object.values(theme.series).filter((s) => s.textura === 'hachura');
  return (
    <defs>
      {plataformas.map((s) => (
        <pattern
          key={s.id}
          id={idTextura(theme.proposta, s.id)}
          patternUnits="userSpaceOnUse"
          width={5}
          height={5}
          patternTransform="rotate(45)"
        >
          <rect width={5} height={5} fill={s.cor} fillOpacity={0.16} />
          <line x1={0} y1={0} x2={0} y2={5} stroke={s.cor} strokeWidth={2.1} />
        </pattern>
      ))}
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/* Eixos                                                               */
/* ------------------------------------------------------------------ */

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  theme: ChartTheme;
  formatar?: (valor: string | number) => string;
  ancora?: 'start' | 'middle' | 'end';
  deslocamentoY?: number;
  forte?: boolean;
}

export function TickEixo({
  x = 0,
  y = 0,
  payload,
  theme,
  formatar,
  ancora = 'middle',
  deslocamentoY = 12,
  forte = false,
}: TickProps) {
  const bruto = payload?.value ?? '';
  const texto = formatar ? formatar(bruto) : String(bruto);
  if (texto === '') return null;
  return (
    <text
      x={x}
      y={y + deslocamentoY}
      textAnchor={ancora}
      fill={forte ? theme.corEixoForte : theme.corEixo}
      fontFamily={theme.fonte}
      fontSize={theme.tamanhoEixo}
      fontWeight={500}
      letterSpacing={`${theme.espacamentoEixo}em`}
    >
      {texto}
    </text>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export interface ItemTooltip {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | null;
  color?: string;
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ItemTooltip[];
  theme: ChartTheme;
  unidade: Unidade;
  rotulos: Record<string, string>;
  formatarRotulo?: (label: string | number) => string;
}

export function TooltipRelatorio({
  active,
  label,
  payload,
  theme,
  unidade,
  rotulos,
  formatarRotulo,
}: TooltipProps) {
  if (!active || !payload?.length) return null;
  const titulo = formatarRotulo ? formatarRotulo(label ?? '') : String(label ?? '');
  return (
    <div className="dc-tooltip">
      <p className="dc-tooltip__titulo">{titulo}</p>
      <ul className="dc-tooltip__lista">
        {payload.map((item) => {
          const chave = String(item.dataKey ?? item.name ?? '');
          const estilo = theme.series[chave as PlataformaId];
          const temValor = item.value !== null && item.value !== undefined;
          return (
            <li key={chave} className="dc-tooltip__item">
              <MarcaSerie cor={estilo?.cor ?? theme.corEixo} tracejado={estilo?.tracejado} />
              <span className="dc-tooltip__rotulo">{rotulos[chave] ?? chave}</span>
              <span className="dc-tooltip__valor">
                {temValor ? theme.completo(Number(item.value), unidade) : 'sem dado'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legenda                                                             */
/* ------------------------------------------------------------------ */

export function MarcaSerie({
  cor,
  tracejado,
  largura = 22,
}: {
  cor: string;
  tracejado?: string;
  largura?: number;
}) {
  return (
    <svg width={largura} height={8} aria-hidden="true" className="dc-marca-serie">
      <line
        x1={0}
        y1={4}
        x2={largura}
        y2={4}
        stroke={cor}
        strokeWidth={2.5}
        strokeDasharray={tracejado}
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface ItemLegenda {
  id: string;
  rotulo: string;
  plataforma: PlataformaId;
}

export function LegendaRelatorio({
  itens,
  theme,
}: {
  itens: ItemLegenda[];
  theme: ChartTheme;
}) {
  return (
    <ul className="dc-legenda">
      {itens.map((item) => {
        const estilo = theme.series[item.plataforma];
        return (
          <li key={item.id} className="dc-legenda__item" data-plataforma={item.plataforma}>
            <MarcaSerie cor={estilo.cor} tracejado={estilo.tracejado} />
            <span>{item.rotulo}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Moldura: pergunta + gráfico + leitura + dados em tabela             */
/* ------------------------------------------------------------------ */

export interface LinhaTabelaGrafico {
  rotulo: string;
  celulas: string[];
}

export function MolduraGrafico({
  pergunta,
  unidadeTexto,
  resumo,
  legenda,
  theme,
  controles,
  tabela,
  alturaLivre = false,
  children,
}: {
  pergunta: string;
  unidadeTexto: string;
  /** Resumo em texto do que o gráfico mostra — lido por leitor de tela e visível. */
  resumo: string;
  legenda?: ItemLegenda[];
  theme: ChartTheme;
  controles?: ReactNode;
  tabela?: { colunas: string[]; linhas: LinhaTabelaGrafico[]; titulo: string };
  /** Quando o próprio gráfico define a altura (barras, por exemplo). */
  alturaLivre?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="dc-grafico">
      <div className="dc-grafico__cabecalho">
        <figcaption className="dc-grafico__pergunta">{pergunta}</figcaption>
        <p className="dc-grafico__unidade">{unidadeTexto}</p>
      </div>

      {(controles || legenda) && (
        <div className="dc-grafico__barra">
          {legenda && <LegendaRelatorio itens={legenda} theme={theme} />}
          {controles}
        </div>
      )}

      <div
        className={alturaLivre ? 'dc-grafico__area dc-grafico__area--livre' : 'dc-grafico__area'}
        role="img"
        aria-label={`${pergunta} ${resumo}`}
      >
        {children}
      </div>

      <p className="dc-grafico__leitura">{resumo}</p>

      {tabela && (
        <details className="dc-grafico__dados">
          <summary>Ver os números em tabela</summary>
          <div className="dc-grafico__dados-rolagem">
            <table className="dc-tabela-dados">
              <caption className="dc-sr">{tabela.titulo}</caption>
              <thead>
                <tr>
                  {tabela.colunas.map((coluna) => (
                    <th key={coluna} scope="col">
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((linha) => (
                  <tr key={linha.rotulo}>
                    <th scope="row">{linha.rotulo}</th>
                    {linha.celulas.map((celula, i) => (
                      <td key={i}>{celula}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/** Rótulo de dia usado nos eixos de série diária. */
export const rotuloDia = (valor: string | number) => formatarDiaMes(String(valor));
