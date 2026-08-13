/**
 * Gráfico 3 do catálogo fechado: tabela de entidades com barra embutida.
 *
 * É uma `<table>` de verdade, com `<th scope>` — não um grid de divs. No
 * celular as colunas secundárias saem da grade e reaparecem numa linha
 * expansível, então nunca há rolagem lateral e nada depende de hover.
 * Na impressão, todas as linhas de detalhe abrem.
 *
 * O componente não sabe o que é um lead, uma compra ou uma palavra-chave.
 * Ele recebe o rótulo da dimensão, uma coluna principal (a que ganha barra
 * embutida e define a ordenação), as demais colunas e o total.
 *
 * Ele nasceu chamando-se `TabelaDeCampanhas` e atendia só campanha. O
 * inventário dos seis relatórios validados mostrou que **a mesma peça cobre
 * cinco tabelas que pareciam diferentes** — campanha, grupo de anúncios,
 * palavra-chave, termo de pesquisa e produto do PMax. O nome mudou junto com
 * o escopo, para a próxima pessoa não achar que precisa de uma tabela nova
 * para cada dimensão.
 *
 * Uma tabela por natureza de resultado, de propósito: venda, tráfego e
 * mensagem não compartilham colunas nem total, e forçá-las na mesma grade
 * seria somar coisas diferentes.
 */

import { useId, useState } from 'react';
import type { PlataformaId, SituacaoCampanha, Unidade, Valor } from '../snapshot';
import { formatarParticipacao, textoValor } from '../format';
import type { ChartTheme } from './chartTheme';

export interface ColunaEntidade {
  id: string;
  rotulo: string;
  unidade: Unidade;
  sufixo?: string;
  /** Sai da grade no celular e reaparece na linha de detalhe. */
  secundaria?: boolean;
}

export interface LinhaEntidade {
  id: string;
  nome: string;
  plataforma: PlataformaId;
  /** Só campanha e grupo de anúncios têm situação. Palavra-chave não tem. */
  situacao?: SituacaoCampanha;
  /** Natureza em uma palavra: "Venda", "Tráfego", "Mensagem". */
  etiqueta?: string;
  /** Valor da coluna principal. É ele que vira barra e ordena a tabela. */
  principal: Valor;
  colunas: Record<string, Valor>;
  detalhes: { rotulo: string; texto: string }[];
}

export interface TotalEntidades {
  rotulo: string;
  principal: Valor;
  /** Coluna sem total legítimo fica `null` e a célula sai vazia. */
  colunas: Record<string, Valor | null>;
}

interface Props {
  /** Pergunta que a tabela responde. Vira o título acessível. */
  pergunta: string;
  theme: ChartTheme;
  /** Cabeçalho da primeira coluna: "Campanha", "Palavra-chave", "Produto". */
  rotuloDimensao: string;
  rotulosPlataforma: Record<string, string>;
  principal: ColunaEntidade;
  colunas: ColunaEntidade[];
  linhas: LinhaEntidade[];
  total: TotalEntidades;
  /**
   * Ressalvas que valem para a tabela inteira. É aqui que mora a definição de
   * cada coluna calculada — em particular a do CPC, que **não quer dizer a
   * mesma coisa em todos os clientes**: uns dividem o investimento pelos
   * cliques no link, outros pelos cliques totais, e na carteira a diferença
   * chegou a 54% sem nada aparecer na tela. Escrever a fórmula é o que impede
   * duas grandezas diferentes de passarem pelo mesmo nome.
   */
  notas?: string[];
  /** Rótulo da participação mostrada no detalhe. */
  participacaoRotulo?: string;
  /**
   * C2 da direção de 2026-08-12: tabela grande demais para abrir inteira.
   *
   * Quando definido e a lista excede este número, só as primeiras linhas
   * (já ordenadas pela coluna principal) ficam visíveis, com um resumo e um
   * botão "ver todas". Duas travas, e nenhuma é negociável:
   *
   *  • o resumo é contagem, nunca conclusão nossa sobre o que ele mostra;
   *  • as linhas além do limite continuam no HTML, só com uma classe de
   *    recolhimento — a impressão remove essa classe visual (`report.css`),
   *    então quem imprime nunca perde dado.
   */
  limiteLinhasVisiveis?: number;
}

const SITUACAO: Record<string, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

/** Só para ordenar e dimensionar a barra. O que não é número vai para o fim. */
function ordenavel(valor: Valor): number {
  return valor.estado === 'ok' ? valor.numero : -1;
}

function ValorTabela({ valor, coluna }: { valor: Valor; coluna: ColunaEntidade }) {
  const zeroMedido = valor.estado === 'ok' && valor.numero === 0;
  return (
    <span className="dc-valor-tabela">
      <span>{textoValor(valor, coluna.unidade, coluna.sufixo)}</span>
      {zeroMedido && (
        <span className="dc-estado-medicao dc-estado-medicao--tabela">medido</span>
      )}
    </span>
  );
}

export default function TabelaDeEntidades({
  pergunta,
  theme,
  rotuloDimensao,
  rotulosPlataforma,
  principal,
  colunas,
  linhas,
  total,
  notas,
  participacaoRotulo,
  limiteLinhasVisiveis,
}: Props) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [verTudo, setVerTudo] = useState(false);
  const listaId = useId();

  const ordenadas = [...linhas].sort((a, b) => ordenavel(b.principal) - ordenavel(a.principal));
  const maior = Math.max(...ordenadas.map((l) => ordenavel(l.principal)), 1);
  const somaPrincipal = ordenadas
    .map((l) => (l.principal.estado === 'ok' ? l.principal.numero : 0))
    .reduce((a, b) => a + b, 0);

  const totalColunas = 2 + colunas.length + 1;

  const alternar = (id: string) => setAbertas((atual) => ({ ...atual, [id]: !atual[id] }));

  // C2: só recolhe quando a lista de fato excede o limite. Uma tabela curta
  // não ganha resumo nem botão — não há o que "ver mais".
  const limite =
    typeof limiteLinhasVisiveis === 'number' && ordenadas.length > limiteLinhasVisiveis
      ? limiteLinhasVisiveis
      : null;

  return (
    <div className="dc-campanhas">
      {limite && (
        <div className="dc-tabela-resumo">
          <p className="dc-tabela-resumo__texto">
            {verTudo
              ? `Mostrando as ${ordenadas.length} linhas.`
              : `Mostrando as ${limite} primeiras de ${ordenadas.length} linhas, ordenadas por ${principal.rotulo.toLowerCase()}.`}
          </p>
          <button
            type="button"
            className="dc-botao-vermais"
            aria-expanded={verTudo}
            aria-controls={listaId}
            onClick={() => setVerTudo((atual) => !atual)}
          >
            {verTudo ? 'Ver menos' : `Ver todas as ${ordenadas.length} linhas`}
          </button>
        </div>
      )}
      <table className="dc-tabela-campanhas">
        <caption className="dc-sr">{pergunta}</caption>
        <thead>
          <tr>
            <th scope="col">{rotuloDimensao}</th>
            <th scope="col" className="dc-num">
              {principal.rotulo}
            </th>
            {colunas.map((coluna) => (
              <th
                key={coluna.id}
                scope="col"
                className={coluna.secundaria ? 'dc-num dc-col-secundaria' : 'dc-num'}
              >
                {coluna.rotulo}
              </th>
            ))}
            <th scope="col">
              <span className="dc-sr">Detalhes</span>
            </th>
          </tr>
        </thead>

        <tbody id={listaId}>
          {ordenadas.map((linha, indice) => {
            const aberta = !!abertas[linha.id];
            // C2: linha além do resumo. Continua no DOM e usa só uma classe
            // de recolhimento, que a impressão remove (ver report.css).
            const recolhida = !!limite && !verTudo && indice >= limite;
            const proporcao = Math.max(ordenavel(linha.principal), 0) / maior;
            const estilo = theme.series[linha.plataforma];
            const participacao =
              somaPrincipal > 0 && linha.principal.estado === 'ok'
                ? formatarParticipacao(linha.principal.numero / somaPrincipal)
                : '—';

            return [
              <tr
                key={linha.id}
                className={[
                  'dc-linha',
                  aberta ? 'dc-linha--aberta' : '',
                  recolhida ? 'dc-linha--recolhida' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-plataforma={linha.plataforma}
              >
                <th scope="row">
                  <span className="dc-campanha__nome">{linha.nome}</span>
                  <span className="dc-campanha__meta">
                    <span className="dc-chip-canal" data-plataforma={linha.plataforma}>
                      {rotulosPlataforma[linha.plataforma] ?? linha.plataforma}
                    </span>
                    {linha.etiqueta && (
                      <span className="dc-campanha__natureza">{linha.etiqueta}</span>
                    )}
                    {linha.situacao && (
                      <span className="dc-campanha__situacao" data-situacao={linha.situacao}>
                        {SITUACAO[linha.situacao] ?? linha.situacao}
                      </span>
                    )}
                  </span>
                </th>

                <td className="dc-num">
                  <span className="dc-barra-embutida">
                    <span
                      className="dc-barra-embutida__trilho"
                      aria-hidden="true"
                      data-textura={estilo.textura}
                    >
                      <span
                        className="dc-barra-embutida__preenchimento"
                        style={{
                          width: `${Math.max(proporcao * 100, 2)}%`,
                          ['--dc-barra-cor' as string]: estilo.cor,
                        }}
                      />
                    </span>
                    <span className="dc-barra-embutida__valor">
                      <ValorTabela valor={linha.principal} coluna={principal} />
                    </span>
                  </span>
                </td>

                {colunas.map((coluna) => (
                  <td
                    key={coluna.id}
                    className={coluna.secundaria ? 'dc-num dc-col-secundaria' : 'dc-num'}
                  >
                    {linha.colunas[coluna.id] ? (
                      <ValorTabela valor={linha.colunas[coluna.id]} coluna={coluna} />
                    ) : (
                      '—'
                    )}
                  </td>
                ))}

                <td className="dc-acao">
                  <button
                    type="button"
                    className="dc-botao-detalhe"
                    aria-expanded={aberta}
                    aria-controls={`detalhe-${linha.id}`}
                    onClick={() => alternar(linha.id)}
                  >
                    <span className="dc-sr">
                      {aberta ? 'Fechar detalhes de' : 'Ver detalhes de'} {linha.nome}
                    </span>
                    <span aria-hidden="true" className="dc-botao-detalhe__sinal">
                      {aberta ? '−' : '+'}
                    </span>
                  </button>
                </td>
              </tr>,

              <tr
                key={`${linha.id}-detalhe`}
                id={`detalhe-${linha.id}`}
                className="dc-detalhe"
                hidden={!aberta}
              >
                <td colSpan={totalColunas}>
                  <dl className="dc-detalhe__lista">
                    {linha.detalhes.map((item) => (
                      <div key={item.rotulo}>
                        <dt>{item.rotulo}</dt>
                        <dd>{item.texto}</dd>
                      </div>
                    ))}
                    {participacaoRotulo && (
                      <div>
                        <dt>{participacaoRotulo}</dt>
                        <dd>{participacao}</dd>
                      </div>
                    )}
                  </dl>
                </td>
              </tr>,
            ];
          })}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row">{total.rotulo}</th>
            <td className="dc-num">
              <ValorTabela valor={total.principal} coluna={principal} />
            </td>
            {colunas.map((coluna) => {
              const valor = total.colunas[coluna.id];
              return (
                <td
                  key={coluna.id}
                  className={coluna.secundaria ? 'dc-num dc-col-secundaria' : 'dc-num'}
                >
                  {valor ? <ValorTabela valor={valor} coluna={coluna} /> : ''}
                </td>
              );
            })}
            <td />
          </tr>
        </tfoot>
      </table>

      {notas && notas.length > 0 && (
        <ul className="dc-notas-tabela">
          {notas.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
