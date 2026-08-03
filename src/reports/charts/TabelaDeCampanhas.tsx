/**
 * Gráfico 3 do catálogo: tabela de campanhas com barra embutida.
 *
 * É uma `<table>` de verdade, com `<th scope>` — não um grid de divs. No
 * celular as colunas secundárias saem da grade e reaparecem numa linha
 * expansível, então nunca há rolagem lateral e nada depende de hover.
 * Na impressão, todas as linhas de detalhe abrem.
 *
 * O componente não sabe o que é um lead nem o que é uma compra. Ele recebe
 * uma coluna principal (a que ganha barra embutida e define a ordenação),
 * as demais colunas e o total. Quem traduz `Campanha` para isso é o módulo
 * do TIPO de relatório, em `src/reports/tipos/`.
 *
 * Uma tabela por natureza de campanha, de propósito: venda, tráfego e
 * mensagem não compartilham colunas nem total, e forçá-las na mesma grade
 * seria somar coisas diferentes.
 */

import { useState } from 'react';
import type { PlataformaId, SituacaoCampanha, Unidade, Valor } from '../snapshot';
import { formatarParticipacao, textoValor } from '../format';
import type { ChartTheme } from './chartTheme';

export interface ColunaCampanha {
  id: string;
  rotulo: string;
  unidade: Unidade;
  sufixo?: string;
  /** Sai da grade no celular e reaparece na linha de detalhe. */
  secundaria?: boolean;
}

export interface LinhaCampanha {
  id: string;
  nome: string;
  plataforma: PlataformaId;
  situacao: SituacaoCampanha;
  /** Natureza em uma palavra: "Venda", "Tráfego", "Mensagem". */
  etiqueta?: string;
  /** Valor da coluna principal. É ele que vira barra e ordena a tabela. */
  principal: Valor;
  colunas: Record<string, Valor>;
  detalhes: { rotulo: string; texto: string }[];
}

export interface TotalCampanhas {
  rotulo: string;
  principal: Valor;
  /** Coluna sem total legítimo fica `null` e a célula sai vazia. */
  colunas: Record<string, Valor | null>;
}

interface Props {
  /** Pergunta que a tabela responde. Vira o título acessível. */
  pergunta: string;
  theme: ChartTheme;
  rotulosPlataforma: Record<string, string>;
  principal: ColunaCampanha;
  colunas: ColunaCampanha[];
  linhas: LinhaCampanha[];
  total: TotalCampanhas;
  /** Ressalva que vale para a tabela inteira. */
  nota?: string;
  /** Rótulo da participação mostrada no detalhe. */
  participacaoRotulo?: string;
}

const SITUACAO: Record<string, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

/** Só para ordenar e dimensionar a barra. Ausência e falha vão para o fim. */
function ordenavel(valor: Valor): number {
  return valor.estado === 'ok' ? valor.numero : -1;
}

export default function TabelaDeCampanhas({
  pergunta,
  theme,
  rotulosPlataforma,
  principal,
  colunas,
  linhas,
  total,
  nota,
  participacaoRotulo,
}: Props) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});

  const ordenadas = [...linhas].sort((a, b) => ordenavel(b.principal) - ordenavel(a.principal));
  const maior = Math.max(...ordenadas.map((l) => ordenavel(l.principal)), 1);
  const somaPrincipal = ordenadas
    .map((l) => (l.principal.estado === 'ok' ? l.principal.numero : 0))
    .reduce((a, b) => a + b, 0);

  const totalColunas = 2 + colunas.length + 1;

  const alternar = (id: string) => setAbertas((atual) => ({ ...atual, [id]: !atual[id] }));

  return (
    <div className="dc-campanhas">
      {nota && <p className="dc-campanhas__nota">{nota}</p>}

      <table className="dc-tabela-campanhas">
        <caption className="dc-sr">{pergunta}</caption>
        <thead>
          <tr>
            <th scope="col">Campanha</th>
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

        <tbody>
          {ordenadas.map((linha) => {
            const aberta = !!abertas[linha.id];
            const proporcao = Math.max(ordenavel(linha.principal), 0) / maior;
            const estilo = theme.series[linha.plataforma];
            const participacao =
              somaPrincipal > 0 && linha.principal.estado === 'ok'
                ? formatarParticipacao(linha.principal.numero / somaPrincipal)
                : '—';

            return [
              <tr key={linha.id} className={aberta ? 'dc-linha dc-linha--aberta' : 'dc-linha'}>
                <th scope="row">
                  <span className="dc-campanha__nome">{linha.nome}</span>
                  <span className="dc-campanha__meta">
                    <span className="dc-chip-canal" data-plataforma={linha.plataforma}>
                      {rotulosPlataforma[linha.plataforma] ?? linha.plataforma}
                    </span>
                    {linha.etiqueta && (
                      <span className="dc-campanha__natureza">{linha.etiqueta}</span>
                    )}
                    <span className="dc-campanha__situacao" data-situacao={linha.situacao}>
                      {SITUACAO[linha.situacao] ?? linha.situacao}
                    </span>
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
                      {textoValor(linha.principal, principal.unidade, principal.sufixo)}
                    </span>
                  </span>
                </td>

                {colunas.map((coluna) => (
                  <td
                    key={coluna.id}
                    className={coluna.secundaria ? 'dc-num dc-col-secundaria' : 'dc-num'}
                  >
                    {linha.colunas[coluna.id]
                      ? textoValor(linha.colunas[coluna.id], coluna.unidade, coluna.sufixo)
                      : '—'}
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
              {textoValor(total.principal, principal.unidade, principal.sufixo)}
            </td>
            {colunas.map((coluna) => {
              const valor = total.colunas[coluna.id];
              return (
                <td
                  key={coluna.id}
                  className={coluna.secundaria ? 'dc-num dc-col-secundaria' : 'dc-num'}
                >
                  {valor ? textoValor(valor, coluna.unidade, coluna.sufixo) : ''}
                </td>
              );
            })}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
