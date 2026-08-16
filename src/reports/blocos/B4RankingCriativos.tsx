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
 *  • **o status do anúncio só entra traduzido e datado.** O relatório de origem
 *    da VetSell imprime `ADSET_PAUSED` e `CAMPAIGN_PAUSED`, que é o status cru
 *    da API, em inglês. Pior que o idioma: é o status de HOJE, não o do
 *    período. Um anúncio que rodou o mês inteiro e foi pausado depois aparece
 *    como pausado num relatório sobre o mês em que ele rodou, e o cliente
 *    conclui que ele não rodou. Aqui sai "Pausado · situação em 01/08/2026" —
 *    a data é obrigatória no tipo, então não há como esquecer dela.
 */

import { useId, useState } from 'react';

import { formatarDataExtenso, textoValor } from '../format';
import { NotasDoBloco } from '../componentes';
import { EtiquetaEscopo } from './escopo';
import { motivoParaCliente } from './motivo-cliente';
import type { RankingCriativos } from './tipos';

const NOME_SITUACAO: Record<string, string> = {
  ativa: 'Ativo',
  pausada: 'Pausado',
  encerrada: 'Encerrado',
};

/**
 * C2 da direção de 2026-08-12: "ranking de criativos" é citado nominalmente
 * como bloco grande que precisa de resumo. Só recolhe quando de fato excede
 * o limite — um ranking de três anúncios não ganha botão para "ver mais".
 */
const LIMITE_CRIATIVOS_VISIVEIS = 6;

export default function B4RankingCriativos({ ranking }: { ranking: RankingCriativos }) {
  const [verTudo, setVerTudo] = useState(false);
  const listaId = useId();

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
        .map((criativo) =>
          motivoParaCliente(
            criativo.motivoSemMiniatura ?? 'Miniatura não disponível para este anúncio.',
            'Miniatura não disponível para este anúncio.',
          ),
        ),
    ),
  ];

  const temSituacao = ranking.criativos.some((criativo) => criativo.situacao);

  const limite =
    ranking.criativos.length > LIMITE_CRIATIVOS_VISIVEIS ? LIMITE_CRIATIVOS_VISIVEIS : null;

  return (
    <>
      <EtiquetaEscopo escopo={ranking.escopo} />
      <p className="dc-ranking__ordem">
        Ordenados por <strong>{ranking.ordenadoPor}</strong>, do maior para o menor.
      </p>

      {limite && (
        <div className="dc-ranking-resumo">
          <p className="dc-ranking-resumo__texto">
            {verTudo
              ? `Mostrando os ${ranking.criativos.length} anúncios.`
              : `Mostrando os ${limite} primeiros de ${ranking.criativos.length} anúncios.`}
          </p>
          <button
            type="button"
            className="dc-botao-vermais"
            aria-expanded={verTudo}
            aria-controls={listaId}
            onClick={() => setVerTudo((atual) => !atual)}
          >
            {verTudo ? 'Ver menos' : `Ver todos os ${ranking.criativos.length} anúncios`}
          </button>
        </div>
      )}

      <ol className="dc-criativos" id={listaId}>
        {ranking.criativos.map((criativo, posicao) => (
          <li
            className={
              !!limite && !verTudo && posicao >= limite
                ? 'dc-criativo dc-criativo--recolhido'
                : 'dc-criativo'
            }
            key={criativo.id}
          >
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
              <h3 className="dc-criativo__nome">{criativo.nome}</h3>

              {criativo.situacao && (
                <p
                  className="dc-criativo__situacao"
                  data-situacao={criativo.situacao.situacao}
                >
                  <span className="dc-criativo__situacao-nome">
                    {NOME_SITUACAO[criativo.situacao.situacao] ?? criativo.situacao.situacao}
                  </span>
                  <span className="dc-criativo__situacao-data">
                    situação em {formatarDataExtenso(criativo.situacao.lidaEm)}
                  </span>
                </p>
              )}
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

      <NotasDoBloco quantidade={motivos.length + (temSituacao ? 1 : 0)}>
        {temSituacao && (
          <li key="situacao">
            A situação de cada anúncio é a mais recente que conferimos, não a do período do
            relatório: um anúncio pode ter rodado o mês inteiro e ter sido pausado depois.
          </li>
        )}
        {motivos.map((motivo) => (
          <li key={motivo}>{motivo}</li>
        ))}
      </NotasDoBloco>
    </>
  );
}
