/**
 * O ESQUELETO do relatório — o que não muda entre clientes nem entre formatos.
 *
 * Cabeçalho, capa, resumo do mês, oportunidades, qualidade das fontes e
 * rodapé. O miolo chega pronto, como uma lista de seções: quem monta essa
 * lista é o formato (`RelatorioMensal` resolve por tipo, `RelatorioMontado`
 * resolve pelo catálogo de blocos).
 *
 * Este componente não conhece cliente. Não existe `if` por nome de cliente
 * aqui, e não deve passar a existir.
 *
 * Duas variações, e elas são coisas diferentes:
 *
 *  • PROPOSTA VISUAL (A/B) — a pele. Vive no CSS, em `[data-proposta]`, e no
 *    `chartTheme`. Não muda o que a página diz.
 *  • MARCA — de quem é o relatório na capa e no rodapé. É parâmetro de
 *    montagem que vem do cadastro, nunca deduzido do cliente. Desde
 *    2026-08-04, por decisão do Flávio, o único valor em uso é a Dácora:
 *    nenhum relatório leva identidade visual da Allgrotech.
 */

import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { CompetenciaDisponivel, Marca, SnapshotBase } from './snapshot';
import {
  formatarCarimbo,
  formatarCompetencia,
  formatarDataExtenso,
  formatarPeriodo,
} from './format';
import { BlocoLeitura, Chip, ChipFonte, Secao, nomePlataforma } from './componentes';
import { textoParaCliente } from './blocos/motivo-cliente';
import type { PropostaId } from './charts/chartTheme';
import './report.css';

export interface SecaoRelatorio {
  id: string;
  titulo: string;
  /** A abertura: uma linha, no cabeçalho. */
  apoio?: string;
  /** A ressalva de leitura, ao pé da seção, em corpo menor. */
  nota?: string;
  conteudo: ReactNode;
}

interface Props {
  snapshot: SnapshotBase;
  competencias: CompetenciaDisponivel[];
  proposta: PropostaId;
  /** O miolo já montado, na ordem final. */
  secoes: SecaoRelatorio[];
  /** Rodapé de demonstração com link para outra rota. Só na W0. */
  demo?: { rotulo: string; href: string; descricao: string };
  /** Só a revisão autenticada entrega a caneta; relatórios públicos nunca a montam. */
  introducaoDaRevisao?: ReactNode;
}

const MARCA_DACORA: Marca = {
  id: 'dacora',
  nome: 'Dácora',
  assinatura: 'Dácora Performance Digital',
};

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

export default function Esqueleto({ snapshot, competencias, proposta, secoes, demo, introducaoDaRevisao }: Props) {
  const { identidade, publicacao, leitura } = snapshot;
  const marca = identidade.marca ?? MARCA_DACORA;

  const competenciaTexto = formatarCompetencia(identidade.competencia);
  usaPaginaPrivada(`Relatório ${competenciaTexto} — ${identidade.clienteNome} | ${marca.nome}`);

  const estado = ESTADO_PUBLICACAO[publicacao.estado] ?? {
    texto: publicacao.estado,
    tom: 'neutro' as const,
  };

  /** A numeração é posicional: nenhum formato precisa saber do outro. */
  let posicao = 0;
  const proximo = () => indice(++posicao);

  return (
    <div
      className="dc-report"
      data-proposta={proposta}
      data-tipo={identidade.tipoRelatorio}
      data-marca={marca.id}
    >
      {/* 1 — cabeçalho discreto ------------------------------------- */}
      <header className="dc-topo">
        <div className="dc-largura dc-topo__conteudo">
          <span className="dc-topo__marca">{marca.nome}</span>
          <span className="dc-topo__separador" aria-hidden="true" />
          <span className="dc-topo__cliente">{identidade.clienteNome}</span>

          <div className="dc-topo__seletor">
            <label htmlFor="competencia">Período</label>
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

        {/* 3 — resumo do mês ---------------------------------------- */}
        <Secao
          indice={proximo()}
          id="resumo"
          titulo="Resumo do mês"
          apoio="Os principais movimentos e resultados registrados no período."
        >
          <div
            className={proposta === 'B' ? 'dc-destaque' : 'dc-superficie'}
            data-sobre={proposta === 'B' ? 'verde' : undefined}
          >
            <div
              className={`dc-resumo ${proposta === 'B' ? 'dc-resumo--verde' : 'dc-resumo--claro'}`}
            >
              {leitura.resumoExecutivo.map((afirmacao) => (
                <p key={afirmacao.texto}>{textoParaCliente(afirmacao.texto)}</p>
              ))}
            </div>
            {introducaoDaRevisao}
          </div>
        </Secao>

        {/* 4..N — miolo --------------------------------------------- */}
        {secoes.map((secao) => (
          <Secao
            key={secao.id}
            indice={proximo()}
            id={secao.id}
            titulo={secao.titulo}
            apoio={secao.apoio}
            nota={secao.nota}
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
          titulo="Qualidade e origem dos dados"
          apoio="De onde veio cada número, quando foi consultado e o que faltou. Esta seção é parte do relatório, não um apêndice."
        >
          <div className="dc-fontes">
            {snapshot.fontes.map((fonte) => {
              const observacoes = fonte.observacoes.map(textoParaCliente);
              return (
              <div
                className="dc-fonte"
                key={fonte.plataforma}
                data-plataforma={fonte.plataforma}
                data-situacao={fonte.situacao}
              >
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
                    ? `Consultado em ${formatarCarimbo(fonte.coletadoEm)}.`
                    : 'Não foi consultado.'}
                </p>

                {observacoes.length > 0 && (
                  <ul className="dc-fonte__observacoes">
                    {observacoes.map((obs) => (
                      <li key={obs}>{obs}</li>
                    ))}
                  </ul>
                )}
              </div>
              );
            })}
          </div>
        </Secao>

        {/* rodapé ---------------------------------------------------- */}
        <footer className="dc-rodape">
          <span className="dc-rodape__marca">{marca.assinatura}</span>
          <p>
            Este relatório é um documento fechado: os números foram registrados uma vez, no
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
              Origens: {snapshot.fontes.map((f) => nomePlataforma(f.plataforma)).join(', ')}
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
