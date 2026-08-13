/**
 * B3 — Evolução mensal do ano corrente.
 *
 * Todos os meses fechados do ano, do primeiro até o anterior ao relatório.
 * Aparece em quatro dos seis relatórios validados, como tabela em três
 * (VetSell, ICH, Zenun) e como gráfico na Karyne.
 *
 * **As duas apresentações leem a MESMA estrutura de dados.** Trocar de tabela
 * para gráfico é parâmetro de montagem, não recoleta: nenhuma métrica muda de
 * lugar e nenhum cliente precisa de dado novo para mudar de forma.
 *
 * O gráfico é **um painel por métrica**, e não o barra + linha de dois eixos
 * do relatório de origem. O porquê está em `tipos.ts`, no `BlocoB3`: dois
 * eixos Y deixam o autor escolher onde as curvas se cruzam, e o leitor lê
 * dessa coincidência uma relação que ninguém mediu.
 *
 * Regras da casa:
 *  • mês sem veiculação aparece como mês sem veiculação, **nunca como zero** —
 *    é a diferença entre "não anunciamos em fevereiro" e "anunciamos e não deu
 *    nada", que são leituras opostas;
 *  • o total é do PERÍODO INTEIRO, não a média das linhas. Conferido na
 *    VetSell: o CPC total é o investimento acumulado dividido pelos cliques
 *    acumulados, e a média dos sete CPCs mensais dá outro número. A tabela
 *    escreve isso em vez de deixar o leitor supor.
 */

import ComparacaoEntreCanais from '../charts/ComparacaoEntreCanais';
import type { ChartTheme } from '../charts/chartTheme';
import { formatarCompetencia, textoValor } from '../format';
import { textoParaCliente } from './motivo-cliente';
import type { BlocoB3, EvolucaoMensal } from './tipos';

/** "2026-07" → "Julho". O ano já está no título da seção. */
function nomeDoMes(competencia: string): string {
  const extenso = formatarCompetencia(competencia).split(' de ')[0];
  return extenso.charAt(0).toUpperCase() + extenso.slice(1);
}

interface Props {
  evolucao: EvolucaoMensal;
  config: BlocoB3;
  theme: ChartTheme;
}

/**
 * Um painel por métrica, meses no eixo das categorias.
 *
 * Reaproveita o gráfico de comparação que já existe no catálogo fechado, em
 * vez de estrear um quarto tipo. Isso não é economia de código: aquele gráfico
 * já resolve, provado em tela, as duas coisas que este bloco não pode errar —
 * **rótulo direto em cada barra** (dispensa legenda e sobrevive a 320 px) e
 * **ausência escrita por extenso**, nunca como barra de tamanho zero. Um mês
 * sem veiculação sai com a palavra no lugar do número, que é a diferença entre
 * "não anunciamos em fevereiro" e "anunciamos e não deu nada".
 */
function GraficoPorMetrica({ evolucao, theme }: { evolucao: EvolucaoMensal; theme: ChartTheme }) {
  return (
    <div className="dc-paineis-metrica">
      {evolucao.colunas.map((coluna) => (
        <ComparacaoEntreCanais
          key={coluna.id}
          pergunta={coluna.rotulo}
          unidade={coluna.unidade}
          unidadeTexto={`${coluna.rotulo}, mês a mês`}
          theme={theme}
          /**
           * Sem participação percentual: aqui as categorias são meses do mesmo
           * canal, e "julho foi 22% do total do ano" não é leitura que alguém
           * faça — o total do ano ainda está sendo formado.
           */
          mostrarParticipacao={false}
          itens={evolucao.meses.map((mes) => ({
            plataforma: evolucao.plataforma,
            rotulo: mes.observacao
              ? `${nomeDoMes(mes.competencia)} · ${mes.observacao}`
              : nomeDoMes(mes.competencia),
            valor: mes.valores[coluna.id],
          }))}
        />
      ))}
    </div>
  );
}

export default function B3EvolucaoMensal({ evolucao, config, theme }: Props) {
  const definicoes = evolucao.definicoes.map(textoParaCliente);

  if (config.apresentacao === 'grafico') {
    /**
     * O total do período não pode sumir só porque a apresentação virou
     * gráfico: ele é do PERÍODO INTEIRO e não é recuperável somando as barras
     * de olho — no caso do CPC, somar nem faria sentido. Vai como linha de
     * texto, com o mesmo rótulo que a tabela usaria.
     */
    const totais = evolucao.colunas
      .map((coluna) => ({ coluna, valor: evolucao.total.valores[coluna.id] }))
      .filter((t): t is { coluna: (typeof evolucao.colunas)[number]; valor: NonNullable<typeof t.valor> } =>
        Boolean(t.valor),
      );

    return (
      <div className="dc-superficie">
        <GraficoPorMetrica evolucao={evolucao} theme={theme} />

        {totais.length > 0 && (
          <p className="dc-total-periodo">
            <span className="dc-total-periodo__rotulo">{evolucao.total.rotulo}</span>
            {totais.map((t) => (
              <span key={t.coluna.id} className="dc-total-periodo__item">
                {t.coluna.rotulo}{' '}
                <strong>{textoValor(t.valor, t.coluna.unidade, t.coluna.sufixo)}</strong>
              </span>
            ))}
          </p>
        )}

        {definicoes.length > 0 && (
          <ul className="dc-notas-tabela">
            {definicoes.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="dc-superficie">
      <div className="dc-rolagem-tabela">
        <table className="dc-tabela-meses">
          <caption className="dc-sr">
            Evolução mês a mês dos meses já fechados do ano corrente
          </caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              {evolucao.colunas.map((coluna) => (
                <th key={coluna.id} scope="col" className="dc-num">
                  {coluna.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evolucao.meses.map((mes) => (
              <tr key={mes.competencia}>
                <th scope="row">
                  {nomeDoMes(mes.competencia)}
                  {mes.observacao && (
                    <span className="dc-mes__observacao">{mes.observacao}</span>
                  )}
                </th>
                {evolucao.colunas.map((coluna) => {
                  const valor = mes.valores[coluna.id];
                  return (
                    <td key={coluna.id} className="dc-num">
                      {valor ? (
                        textoValor(valor, coluna.unidade, coluna.sufixo)
                      ) : (
                        <span className="dc-valor--indisponivel" data-estado="ausente">
                          indisponível
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{evolucao.total.rotulo}</th>
              {evolucao.colunas.map((coluna) => {
                const valor = evolucao.total.valores[coluna.id];
                return (
                  <td key={coluna.id} className="dc-num">
                    {valor ? textoValor(valor, coluna.unidade, coluna.sufixo) : ''}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {definicoes.length > 0 && (
        <ul className="dc-notas-tabela">
          {definicoes.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
