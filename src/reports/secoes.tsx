/**
 * Seções que os DOIS tipos de relatório usam com o mesmo desenho.
 *
 * O que mora aqui é o que não muda entre geração de leads e e-commerce: o
 * gráfico de evolução com seu seletor, o gráfico de comparação entre canais
 * e os cartões de canal. O que muda é QUAIS séries e QUAIS métricas entram —
 * e isso quem decide é o módulo do tipo, em `src/reports/tipos/`.
 *
 * Nenhuma peça aqui conhece cliente.
 */

import { useState } from 'react';

import type { Canal, Fonte, PlataformaId, Serie, Unidade, Valor } from './snapshot';
import { ChipFonte, Motivo, ValorExibido } from './componentes';
import type { ChartTheme } from './charts/chartTheme';
import EvolucaoNoTempo from './charts/EvolucaoNoTempo';
import ComparacaoEntreCanais from './charts/ComparacaoEntreCanais';

/* ------------------------------------------------------------------ */
/* Evolução no tempo, com seletor de série                             */
/* ------------------------------------------------------------------ */

export interface OpcaoSerie {
  /** Chave em `snapshot.series`. */
  id: string;
  rotulo: string;
}

/**
 * O seletor troca a série inteira; ele nunca combina duas séries num gráfico
 * só. É o que impede o relatório de e-commerce de desenhar, na mesma linha,
 * receita que a mídia atribui e faturamento que a loja registrou.
 */
export function EvolucaoComSeletor({
  series,
  opcoes,
  theme,
}: {
  series: Record<string, Serie>;
  opcoes: OpcaoSerie[];
  theme: ChartTheme;
}) {
  const [ativa, setAtiva] = useState(opcoes[0]?.id ?? '');
  const serie = series[ativa] ?? series[opcoes[0]?.id ?? ''];
  if (!serie) return null;

  return (
    <div className="dc-superficie">
      <EvolucaoNoTempo
        serie={serie}
        theme={theme}
        controles={
          opcoes.length > 1 ? (
            <div className="dc-segmentado" role="group" aria-label="O que mostrar no gráfico">
              {opcoes.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  aria-pressed={ativa === opcao.id}
                  onClick={() => setAtiva(opcao.id)}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comparação entre canais, a partir de uma métrica dos canais         */
/* ------------------------------------------------------------------ */

const AUSENTE_NO_SNAPSHOT: Valor = {
  estado: 'ausente',
  motivo: 'Métrica não presente no snapshot.',
};

/**
 * Monta os itens do gráfico de barras a partir de uma métrica por canal.
 * `canais` já vem filtrado por papel — é assim que GA4 (medição) nunca entra
 * num gráfico de investimento e a loja nunca entra num de receita atribuída.
 */
export function itensPorCanal(canais: Canal[], sufixoMetricaId: string) {
  return canais.map((canal) => ({
    plataforma: canal.plataforma,
    rotulo: canal.rotulo,
    valor:
      canal.metricas.find((m) => m.id === `${canal.plataforma}_${sufixoMetricaId}`)?.valor ??
      AUSENTE_NO_SNAPSHOT,
  }));
}

export function ComparacaoDeCanais({
  canais,
  sufixoMetricaId,
  pergunta,
  unidade,
  unidadeTexto,
  theme,
}: {
  canais: Canal[];
  sufixoMetricaId: string;
  pergunta: string;
  unidade: Unidade;
  unidadeTexto: string;
  theme: ChartTheme;
}) {
  return (
    <div className="dc-superficie">
      <ComparacaoEntreCanais
        pergunta={pergunta}
        unidade={unidade}
        unidadeTexto={unidadeTexto}
        itens={itensPorCanal(canais, sufixoMetricaId)}
        theme={theme}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cartões de canal                                                    */
/* ------------------------------------------------------------------ */

export function CartoesDeCanal({
  canais,
  fontes,
  theme,
}: {
  canais: Canal[];
  fontes: Fonte[];
  theme: ChartTheme;
}) {
  return (
    <div className="dc-canais">
      {canais.map((canal) => {
        const fonte = fontes.find((f) => f.plataforma === canal.plataforma);
        const incompletas = canal.metricas.filter((m) => m.valor.estado !== 'ok');
        return (
          <article
            key={canal.plataforma}
            className="dc-superficie dc-canal"
            data-plataforma={canal.plataforma}
          >
            <header className="dc-canal__cabecalho">
              <h3 className="dc-canal__nome">
                <span
                  className="dc-canal__marca"
                  aria-hidden="true"
                  style={{ background: theme.series[canal.plataforma as PlataformaId].cor }}
                />
                {canal.rotulo}
              </h3>
              <ChipFonte situacao={canal.situacao} />
            </header>

            {canal.nota && <p className="dc-canal__nota">{canal.nota}</p>}

            <div className="dc-metricas">
              {canal.metricas.map((metrica) => (
                <div className="dc-metrica" key={metrica.id}>
                  <span className="dc-metrica__rotulo">{metrica.rotulo}</span>
                  <ValorExibido
                    valor={metrica.valor}
                    unidade={metrica.unidade}
                    sufixo={metrica.sufixo}
                    className="dc-metrica__valor"
                  />
                </div>
              ))}
            </div>

            {incompletas.map(
              (metrica) =>
                metrica.valor.estado !== 'ok' && (
                  <div className="dc-canal__observacao" key={metrica.id}>
                    <Motivo texto={`${metrica.rotulo}: ${metrica.valor.motivo}`} />
                  </div>
                ),
            )}

            {fonte?.conta && (
              <p className="dc-origem" style={{ marginTop: '0.9rem' }}>
                Conta consultada: {fonte.conta}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
