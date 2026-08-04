/**
 * B4 — Ranking de criativos.
 *
 * Aparece em cinco dos seis relatórios validados: todos os que têm Meta.
 *
 * Regras da casa:
 *
 *  • **a miniatura é nossa, baixada e guardada.** O endereço que a Meta
 *    devolve é link assinado que expira. Guardar o link faz o relatório
 *    quebrar sozinho semanas depois, sem erro nenhum: um relatório de julho
 *    aberto em outubro mostraria quadrados vazios e ninguém saberia por quê.
 *    Miniatura de um cliente também nunca é alcançável por quem tem o link de
 *    outro;
 *  • criativo sem resultado no período imprime traço, não zero;
 *  • o nome do criativo vai como está na conta, sem reescrita — é assim que a
 *    Fernanda o encontra depois no gerenciador;
 *  • **o status do anúncio não entra aqui.** O relatório de origem da VetSell
 *    imprime `ADSET_PAUSED` e `CAMPAIGN_PAUSED`, que é o status cru da API, em
 *    inglês. Além de não ser português, é o status de HOJE, não o do período:
 *    um anúncio que rodou o mês inteiro e foi pausado ontem apareceria como
 *    pausado num relatório sobre o mês em que ele rodou. Mostrar isso exige
 *    traduzir e datar; até lá, omitir é o certo.
 */

import { textoValor } from '../format';
import { EtiquetaEscopo } from './escopo';
import type { RankingCriativos } from './tipos';

export default function B4RankingCriativos({ ranking }: { ranking: RankingCriativos }) {
  /**
   * O motivo de uma miniatura faltar quase sempre é o mesmo para todos os
   * cartões, e repeti-lo dentro de cada um transforma a explicação em ruído —
   * o leitor para de ler na terceira vez. Ele aparece uma vez só, embaixo da
   * lista; o cartão fica com a marca curta. Motivos diferentes aparecem
   * separadamente, porque aí a diferença é a informação.
   */
  const motivos = [
    ...new Set(
      ranking.criativos
        .filter((criativo) => !criativo.miniatura)
        .map((criativo) => criativo.motivoSemMiniatura ?? 'Miniatura não guardada nesta coleta.'),
    ),
  ];

  return (
    <>
      <EtiquetaEscopo escopo={ranking.escopo} />
      <p className="dc-ranking__ordem">
        Ordenados por <strong>{ranking.ordenadoPor}</strong>, do maior para o menor.
      </p>

      <ol className="dc-criativos">
        {ranking.criativos.map((criativo, posicao) => (
          <li className="dc-criativo" key={criativo.id}>
            <div className="dc-criativo__miniatura">
              {criativo.miniatura ? (
                <img
                  src={criativo.miniatura.src}
                  alt={criativo.miniatura.alt}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="dc-criativo__sem-imagem">sem miniatura</span>
              )}
              <span className="dc-criativo__posicao" aria-hidden="true">
                {posicao + 1}
              </span>
            </div>

            <div className="dc-criativo__corpo">
              <h4 className="dc-criativo__nome">{criativo.nome}</h4>
              <dl className="dc-criativo__numeros">
                {criativo.numeros.map((numero) => (
                  <div key={numero.rotulo}>
                    <dt>{numero.rotulo}</dt>
                    <dd>
                      {numero.valor.estado === 'ok' ? (
                        textoValor(numero.valor, numero.unidade)
                      ) : (
                        <span className="dc-valor--indisponivel" data-estado={numero.valor.estado}>
                          {textoValor(numero.valor, numero.unidade)}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ol>

      {motivos.length > 0 && (
        <ul className="dc-notas-tabela">
          {motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
    </>
  );
}
