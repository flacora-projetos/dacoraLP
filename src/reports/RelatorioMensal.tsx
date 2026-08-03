/**
 * O relatório mensal. Uma árvore só, duas propostas visuais e dois tipos de
 * relatório.
 *
 * O componente não conhece cliente: tudo que ele mostra vem do snapshot. Não
 * existe `if` por nome de cliente aqui, e não deve passar a existir.
 *
 * Duas variações, e elas são coisas diferentes:
 *
 *  • PROPOSTA VISUAL (A/B) — a pele. Vive no CSS, em `[data-proposta]`, e no
 *    `chartTheme`. Não muda o que a página diz.
 *  • TIPO DE RELATÓRIO (serviços/leads x e-commerce) — o miolo. Vive em
 *    `src/reports/tipos/`, resolvido por `identidade.tipoRelatorio`. Muda
 *    quais seções existem e o que elas mostram.
 *
 * Este arquivo é o que os dois tipos compartilham: cabeçalho, capa, resumo
 * executivo, indicadores, oportunidades, qualidade das fontes e rodapé.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import type { CompetenciaDisponivel, Snapshot } from './snapshot';
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
  Secao,
  nomePlataforma,
} from './componentes';
import { criarChartTheme, type PropostaId } from './charts/chartTheme';
import { CORPO_POR_TIPO } from './tipos';
import './report.css';

interface Props {
  snapshot: Snapshot;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  /** Rodapé de demonstração com link para outra rota. Só na W0. */
  demo?: { rotulo: string; href: string; descricao: string };
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

const indice = (posicao: number) => String(posicao).padStart(2, '0');

export default function RelatorioMensal({ snapshot, competencias, proposta, demo }: Props) {
  const { identidade, publicacao, leitura } = snapshot;
  const theme = useMemo(() => criarChartTheme(proposta), [proposta]);

  const competenciaTexto = formatarCompetencia(identidade.competencia);
  usaPaginaPrivada(`Relatório ${competenciaTexto} — ${identidade.clienteNome} | Dácora`);

  const estado = ESTADO_PUBLICACAO[publicacao.estado] ?? {
    texto: publicacao.estado,
    tom: 'neutro' as const,
  };

  /**
   * O miolo é escolhido pelo TIPO do relatório, não por quem é o cliente. É o
   * mesmo desenho do `client_report_formats` na fábrica.
   */
  const secoesDoMiolo = useMemo(
    () => CORPO_POR_TIPO[identidade.tipoRelatorio]({ snapshot, theme }),
    [identidade.tipoRelatorio, snapshot, theme],
  );

  /** A numeração é posicional: nenhum tipo precisa saber quantas seções o outro tem. */
  let posicao = 0;
  const proximo = () => indice(++posicao);

  return (
    <div className="dc-report" data-proposta={proposta} data-tipo={identidade.tipoRelatorio}>
      {/* 1 — cabeçalho discreto ------------------------------------- */}
      <header className="dc-topo">
        <div className="dc-largura dc-topo__conteudo">
          <span className="dc-topo__marca">Dácora</span>
          <span className="dc-topo__separador" aria-hidden="true" />
          <span className="dc-topo__cliente">{identidade.clienteNome}</span>

          <div className="dc-topo__seletor">
            <label htmlFor="competencia">Competência</label>
            <select id="competencia" className="dc-select" defaultValue={identidade.competencia}>
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
              <span>
                Período de {formatarPeriodo(identidade.periodo.inicio, identidade.periodo.fim)}
              </span>
              <span>Versão {publicacao.versao}</span>
              {publicacao.aprovadoEm && (
                <span>Liberado em {formatarCarimbo(publicacao.aprovadoEm)}</span>
              )}
            </div>
          </div>
        </section>

        {/* 3 — resumo executivo ------------------------------------- */}
        <Secao
          indice={proximo()}
          id="resumo"
          titulo="Resumo do mês"
          apoio="Escrito a partir dos números apurados. Nenhuma causa é inferida: o que não foi medido não é explicado."
        >
          <div
            className={proposta === 'B' ? 'dc-destaque' : 'dc-superficie'}
            data-sobre={proposta === 'B' ? 'verde' : undefined}
          >
            <div
              className={`dc-resumo ${proposta === 'B' ? 'dc-resumo--verde' : 'dc-resumo--claro'}`}
            >
              {leitura.resumoExecutivo.map((afirmacao) => (
                <p key={afirmacao.texto}>{afirmacao.texto}</p>
              ))}
            </div>
          </div>
        </Secao>

        {/* 4 — indicadores ------------------------------------------ */}
        <Secao
          indice={proximo()}
          id="indicadores"
          titulo={`Os números que resumem ${competenciaTexto.split(' de ')[0]}`}
          apoio="Cada indicador traz a fonte e a base de comparação. Valor que não veio aparece escrito, nunca como zero."
        >
          <div className="dc-kpis">
            {snapshot.indicadores.map((metrica) => (
              <Indicador key={metrica.id} metrica={metrica} />
            ))}
          </div>
        </Secao>

        {/* 5..N — miolo, por tipo de relatório ---------------------- */}
        {secoesDoMiolo.map((secao) => (
          <Secao
            key={secao.id}
            indice={proximo()}
            id={secao.id}
            titulo={secao.titulo}
            apoio={secao.apoio}
          >
            {secao.conteudo}
          </Secao>
        ))}

        {/* N+1 — oportunidades e próximos passos -------------------- */}
        <Secao
          indice={proximo()}
          id="proximos-passos"
          titulo="Oportunidades e próximos passos"
          apoio="Cada item aponta para um número deste relatório. Nada aqui é promessa de resultado."
        >
          <div className="dc-blocos-leitura">
            <BlocoLeitura titulo="Destaques" tom="destaques" itens={leitura.destaques} />
            <BlocoLeitura titulo="Pontos de atenção" tom="atencao" itens={leitura.atencao} />
          </div>
          <div className="dc-espaco-bloco">
            <BlocoLeitura titulo="Próximos passos" tom="passos" itens={leitura.proximosPassos} />
          </div>
        </Secao>

        {/* N+2 — qualidade dos dados -------------------------------- */}
        <Secao
          indice={proximo()}
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

        {/* rodapé ---------------------------------------------------- */}
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
          <aside className="dc-demo dc-no-print" aria-label="Outras telas da demonstração">
            <strong>Proposta {proposta}</strong>
            <span>{demo.descricao}</span>
            <Link to={demo.href}>{demo.rotulo}</Link>
          </aside>
        )}
      </main>
    </div>
  );
}
