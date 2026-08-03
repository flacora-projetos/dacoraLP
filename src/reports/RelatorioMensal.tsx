/**
 * O relatório mensal. Uma árvore só, duas propostas visuais.
 *
 * O componente não conhece cliente: tudo que ele mostra vem do snapshot.
 * Não existe `if` por nome de cliente aqui, e não deve passar a existir —
 * variação de formato é por `tipoRelatorio`, não por quem é o cliente.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { CompetenciaDisponivel, PlataformaId, Snapshot } from './snapshot';
import {
  formatarCarimbo,
  formatarCompetencia,
  formatarDataExtenso,
  formatarPeriodo,
} from './format';
import {
  BlocoLeitura,
  Chip,
  ChipFonte,
  Indicador,
  Motivo,
  Secao,
  ValorExibido,
  nomePlataforma,
} from './componentes';
import { criarChartTheme, type PropostaId } from './charts/chartTheme';
import EvolucaoNoTempo from './charts/EvolucaoNoTempo';
import ComparacaoEntreCanais from './charts/ComparacaoEntreCanais';
import TabelaDeCampanhas from './charts/TabelaDeCampanhas';
import './report.css';

interface Props {
  snapshot: Snapshot;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  /** Rodapé de demonstração com o link para a outra proposta. Só na W0. */
  demo?: { rotuloOutra: string; hrefOutra: string; descricao: string };
}

const ESTADO_PUBLICACAO: Record<string, { texto: string; tom: 'ok' | 'atencao' | 'neutro' }> = {
  gerado: { texto: 'Gerado, aguardando liberação', tom: 'atencao' },
  liberado: { texto: 'Liberado', tom: 'ok' },
  substituido: { texto: 'Substituído por versão mais nova', tom: 'atencao' },
};

/** Rota privada: fora do sitemap, fora da pré-renderização e sem indexação. */
function usaPaginaPrivada(titulo: string) {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = titulo;

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive';
    document.head.appendChild(meta);

    return () => {
      document.title = tituloAnterior;
      meta.remove();
    };
  }, [titulo]);
}

export default function RelatorioMensal({ snapshot, competencias, proposta, demo }: Props) {
  const { identidade, publicacao, leitura } = snapshot;
  const theme = useMemo(() => criarChartTheme(proposta), [proposta]);
  const [serieAtiva, setSerieAtiva] = useState<'leads_dia' | 'investimento_dia'>('leads_dia');

  const competenciaTexto = formatarCompetencia(identidade.competencia);
  usaPaginaPrivada(
    `Relatório ${competenciaTexto} — ${identidade.clienteNome} | Dácora`,
  );

  const estado = ESTADO_PUBLICACAO[publicacao.estado] ?? {
    texto: publicacao.estado,
    tom: 'neutro' as const,
  };

  const canalPorPlataforma = (id: PlataformaId) =>
    snapshot.canais.find((c) => c.plataforma === id);

  const metricaDoCanal = (id: PlataformaId, metricaId: string) =>
    canalPorPlataforma(id)?.metricas.find((m) => m.id === metricaId);

  const itensLeads = snapshot.canais.map((canal) => ({
    plataforma: canal.plataforma,
    rotulo: canal.rotulo,
    valor: metricaDoCanal(canal.plataforma, `${canal.plataforma}_leads`)?.valor ?? {
      estado: 'ausente' as const,
      motivo: 'Métrica não presente no snapshot.',
    },
  }));

  const itensInvestimento = snapshot.canais.map((canal) => ({
    plataforma: canal.plataforma,
    rotulo: canal.rotulo,
    valor: metricaDoCanal(canal.plataforma, `${canal.plataforma}_investimento`)?.valor ?? {
      estado: 'ausente' as const,
      motivo: 'Métrica não presente no snapshot.',
    },
  }));

  const rotulosPlataforma = Object.fromEntries(
    snapshot.canais.map((c) => [c.plataforma, c.rotulo]),
  );

  const resumoVerde = proposta === 'B';

  return (
    <div className="dc-report" data-proposta={proposta}>
      {/* 1 — cabeçalho discreto ------------------------------------- */}
      <header className="dc-topo">
        <div className="dc-largura dc-topo__conteudo">
          <span className="dc-topo__marca">Dácora</span>
          <span className="dc-topo__separador" aria-hidden="true" />
          <span className="dc-topo__cliente">{identidade.clienteNome}</span>

          <div className="dc-topo__seletor">
            <label htmlFor="competencia">Competência</label>
            <select
              id="competencia"
              className="dc-select"
              defaultValue={identidade.competencia}
            >
              {competencias.map((c) => (
                <option key={c.competencia} value={c.competencia} disabled={!c.publicada}>
                  {c.rotulo}
                  {c.publicada ? '' : ' — não publicada'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="dc-largura">
        {/* 2 — capa ------------------------------------------------- */}
        <section className="dc-capa" aria-labelledby="capa-titulo">
          <div className="dc-capa__caixa" data-sobre={proposta === 'A' ? 'verde' : undefined}>
            <p className="dc-capa__eyebrow">Relatório mensal de performance</p>
            <h1 className="dc-capa__titulo" id="capa-titulo">
              {identidade.clienteNome}
            </h1>
            <p className="dc-capa__competencia">{competenciaTexto}</p>

            <div className="dc-capa__linha">
              <Chip tom={estado.tom}>{estado.texto}</Chip>
              <span>Período de {formatarPeriodo(identidade.periodo.inicio, identidade.periodo.fim)}</span>
              <span>Versão {publicacao.versao}</span>
              {publicacao.aprovadoEm && (
                <span>Liberado em {formatarCarimbo(publicacao.aprovadoEm)}</span>
              )}
            </div>
          </div>
        </section>

        {/* 3 — resumo executivo ------------------------------------- */}
        <Secao
          indice="01"
          id="resumo"
          titulo="Resumo do mês"
          apoio="Escrito a partir dos números apurados. Nenhuma causa é inferida: o que não foi medido não é explicado."
        >
          <div
            className={resumoVerde ? 'dc-destaque' : 'dc-superficie'}
            data-sobre={resumoVerde ? 'verde' : undefined}
          >
            <div className={`dc-resumo ${resumoVerde ? 'dc-resumo--verde' : 'dc-resumo--claro'}`}>
              {leitura.resumoExecutivo.map((afirmacao) => (
                <p key={afirmacao.texto}>{afirmacao.texto}</p>
              ))}
            </div>
          </div>
        </Secao>

        {/* 4 — indicadores ------------------------------------------ */}
        <Secao
          indice="02"
          id="indicadores"
          titulo="Os números que resumem julho"
          apoio="Cinco indicadores, cada um com a fonte e a base de comparação. Valor que não veio aparece escrito, nunca como zero."
        >
          <div className="dc-kpis">
            {snapshot.indicadores.map((metrica) => (
              <Indicador key={metrica.id} metrica={metrica} />
            ))}
          </div>
        </Secao>

        {/* 5 — evolução do período ---------------------------------- */}
        <Secao
          indice="03"
          id="evolucao"
          titulo="Como o mês se comportou dia a dia"
          apoio="Dia sem coleta aparece como interrupção na linha. Nada é preenchido por estimativa."
        >
          <div className="dc-superficie">
            <EvolucaoNoTempo
              serie={snapshot.series[serieAtiva]}
              theme={theme}
              controles={
                <div className="dc-segmentado" role="group" aria-label="O que mostrar no gráfico">
                  <button
                    type="button"
                    aria-pressed={serieAtiva === 'leads_dia'}
                    onClick={() => setSerieAtiva('leads_dia')}
                  >
                    Leads
                  </button>
                  <button
                    type="button"
                    aria-pressed={serieAtiva === 'investimento_dia'}
                    onClick={() => setSerieAtiva('investimento_dia')}
                  >
                    Investimento
                  </button>
                </div>
              }
            />
          </div>
        </Secao>

        {/* 6 — blocos por canal ------------------------------------- */}
        <Secao
          indice="04"
          id="canais"
          titulo="O que cada canal entregou"
          apoio="Meta e Google são medidos por contas diferentes. Onde a comparação não é possível, isso está dito em vez de omitido."
        >
          <div className="dc-canais">
            <div className="dc-superficie">
              <ComparacaoEntreCanais
                pergunta="De onde vieram os leads?"
                unidade="inteiro"
                unidadeTexto="Leads no período"
                itens={itensLeads}
                theme={theme}
              />
            </div>
            <div className="dc-superficie">
              <ComparacaoEntreCanais
                pergunta="Onde o investimento foi aplicado?"
                unidade="brl"
                unidadeTexto="Reais no período"
                itens={itensInvestimento}
                theme={theme}
              />
            </div>
          </div>

          <div className="dc-canais" style={{ marginTop: '1.15rem' }}>
            {snapshot.canais.map((canal) => {
              const fonte = snapshot.fontes.find((f) => f.plataforma === canal.plataforma);
              const metricasIncompletas = canal.metricas.filter((m) => m.valor.estado !== 'ok');
              return (
                <article key={canal.plataforma} className="dc-superficie dc-canal">
                  <header className="dc-canal__cabecalho">
                    <h3 className="dc-canal__nome">
                      <span
                        className="dc-canal__marca"
                        aria-hidden="true"
                        style={{ background: theme.series[canal.plataforma].cor }}
                      />
                      {canal.rotulo}
                    </h3>
                    <ChipFonte situacao={canal.situacao} />
                  </header>

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

                  {metricasIncompletas.map(
                    (metrica) =>
                      metrica.valor.estado !== 'ok' && (
                        <div className="dc-canal__observacao" key={metrica.id}>
                          <Motivo texto={`${metrica.rotulo}: ${metrica.valor.motivo}`} />
                        </div>
                      ),
                  )}

                  {fonte && fonte.conta && (
                    <p className="dc-origem" style={{ marginTop: '0.9rem' }}>
                      Conta consultada: {fonte.conta}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </Secao>

        {/* 7 — campanhas -------------------------------------------- */}
        <Secao
          indice="05"
          id="campanhas"
          titulo="Campanhas do período"
          apoio="Ordenadas por leads. No celular, toque no + para ver investimento, impressões, cliques e participação."
        >
          <div className="dc-superficie">
            <TabelaDeCampanhas
              campanhas={snapshot.campanhas}
              theme={theme}
              rotulosPlataforma={rotulosPlataforma}
              pergunta="Quais campanhas trouxeram os leads do mês e a que custo?"
            />
          </div>
        </Secao>

        {/* 8 — oportunidades e próximos passos ---------------------- */}
        <Secao
          indice="06"
          id="proximos-passos"
          titulo="Oportunidades e próximos passos"
          apoio="Cada item aponta para um número deste relatório. Nada aqui é promessa de resultado."
        >
          <div className="dc-blocos-leitura">
            <BlocoLeitura titulo="Destaques" tom="destaques" itens={leitura.destaques} />
            <BlocoLeitura titulo="Pontos de atenção" tom="atencao" itens={leitura.atencao} />
          </div>
          <div style={{ marginTop: '1.15rem' }}>
            <BlocoLeitura
              titulo="Próximos passos"
              tom="passos"
              itens={leitura.proximosPassos}
            />
          </div>
        </Secao>

        {/* 9 — qualidade dos dados ---------------------------------- */}
        <Secao
          indice="07"
          id="qualidade"
          titulo="Qualidade dos dados e fontes"
          apoio="De onde veio cada número, quando foi coletado e o que faltou. Esta seção é parte do relatório, não um apêndice."
        >
          <div className="dc-fontes">
            {snapshot.fontes.map((fonte) => (
              <div className="dc-fonte" key={fonte.plataforma} data-situacao={fonte.situacao}>
                <div className="dc-fonte__topo">
                  <span className="dc-fonte__nome">{fonte.rotulo}</span>
                  <ChipFonte situacao={fonte.situacao} />
                  {fonte.conta && <span className="dc-fonte__conta">{fonte.conta}</span>}
                </div>

                <p className="dc-fonte__linha">
                  {fonte.janela
                    ? `Janela consultada: ${formatarDataExtenso(
                        fonte.janela.inicio,
                      )} a ${formatarDataExtenso(fonte.janela.fim)}.`
                    : 'Sem janela consultada.'}{' '}
                  {fonte.coletadoEm
                    ? `Coletado em ${formatarCarimbo(fonte.coletadoEm)}.`
                    : 'Não houve coleta.'}
                </p>

                {fonte.observacoes.length > 0 && (
                  <ul className="dc-fonte__observacoes">
                    {fonte.observacoes.map((obs) => (
                      <li key={obs}>{obs}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Secao>

        {/* 10 — rodapé ---------------------------------------------- */}
        <footer className="dc-rodape">
          <span className="dc-rodape__marca">Dácora Performance Digital</span>
          <p>
            Este relatório é um documento fechado: os números foram coletados uma vez, no
            fechamento do período, e não mudam quando a página é reaberta. Reconsultar as
            plataformas meses depois devolve valores diferentes.
          </p>
          <div className="dc-rodape__dados">
            <span>Versão {publicacao.versao}</span>
            <span>Conteúdo {publicacao.checksum}</span>
            <span>Schema {identidade.versaoSchema}</span>
            <span>Gerado em {formatarCarimbo(publicacao.geradoEm)}</span>
            {publicacao.aprovadoPor && (
              <span>
                Liberado por {publicacao.aprovadoPor}
                {publicacao.aprovadoEm ? ` em ${formatarCarimbo(publicacao.aprovadoEm)}` : ''}
              </span>
            )}
            <span>
              Fontes: {snapshot.fontes.map((f) => nomePlataforma(f.plataforma)).join(', ')}
            </span>
          </div>
        </footer>

        {/* Barra de demonstração — não faz parte do relatório -------- */}
        {demo && (
          <aside className="dc-demo dc-no-print" aria-label="Comparação entre propostas visuais">
            <strong>Proposta {proposta}</strong>
            <span>{demo.descricao}</span>
            <Link to={demo.hrefOutra}>Ver a proposta {demo.rotuloOutra}</Link>
          </aside>
        )}
      </main>
    </div>
  );
}
