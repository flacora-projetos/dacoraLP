/**
 * B3 — Evolução mensal do ano corrente.
 *
 * Todos os meses fechados do ano, do primeiro até o anterior ao relatório.
 * Aparece em quatro dos seis relatórios validados, como tabela em três
 * (VetSell, ICH, Zenun) e como gráfico combinado na Karyne.
 *
 * Aqui está só a apresentação em tabela, que é a que o ICH usa. O gráfico
 * combinado entra quando a montagem da Karyne for construída — a decisão de
 * não antecipá-lo é deliberada: gráfico combinado barra + linha ainda não está
 * no catálogo fechado de três tipos e depende do PO.
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

import { formatarCompetencia, textoValor } from '../format';
import type { EvolucaoMensal } from './tipos';

/** "2026-07" → "Julho". O ano já está no título da seção. */
function nomeDoMes(competencia: string): string {
  const extenso = formatarCompetencia(competencia).split(' de ')[0];
  return extenso.charAt(0).toUpperCase() + extenso.slice(1);
}

export default function B3EvolucaoMensal({ evolucao }: { evolucao: EvolucaoMensal }) {
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

      {evolucao.definicoes.length > 0 && (
        <ul className="dc-notas-tabela">
          {evolucao.definicoes.map((nota) => (
            <li key={nota}>{nota}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
