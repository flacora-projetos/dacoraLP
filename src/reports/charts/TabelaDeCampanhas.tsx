/**
 * Gráfico 3 do catálogo: tabela de campanhas com barra embutida.
 *
 * É uma `<table>` de verdade, com `<th scope>` — não um grid de divs. No
 * celular as colunas secundárias saem da grade e reaparecem numa linha
 * expansível, então nunca há rolagem lateral e nada depende de hover.
 * Na impressão, todas as linhas de detalhe abrem.
 */

import { useState } from 'react';
import type { Campanha, PlataformaId, Valor } from '../snapshot';
import { formatarNumero, formatarParticipacao, textoValor } from '../format';
import type { ChartTheme } from './chartTheme';

interface Props {
  campanhas: Campanha[];
  theme: ChartTheme;
  rotulosPlataforma: Record<string, string>;
  /** Pergunta que a tabela responde. Vira o título acessível. */
  pergunta: string;
}

const SITUACAO: Record<string, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

function numero(valor: Valor): number {
  return valor.estado === 'ok' ? valor.numero : 0;
}

export default function TabelaDeCampanhas({
  campanhas,
  theme,
  rotulosPlataforma,
  pergunta,
}: Props) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});

  const ordenadas = [...campanhas].sort((a, b) => numero(b.leads) - numero(a.leads));
  const maiorLeads = Math.max(...ordenadas.map((c) => numero(c.leads)), 1);
  const totalLeads = ordenadas.reduce((soma, c) => soma + numero(c.leads), 0);

  const alternar = (id: string) =>
    setAbertas((atual) => ({ ...atual, [id]: !atual[id] }));

  return (
    <div className="dc-campanhas">
      <table className="dc-tabela-campanhas">
        <caption className="dc-sr">{pergunta}</caption>
        <thead>
          <tr>
            <th scope="col">Campanha</th>
            <th scope="col" className="dc-num">
              Leads
            </th>
            <th scope="col" className="dc-num">
              Custo por lead
            </th>
            <th scope="col" className="dc-num dc-col-secundaria">
              Investimento
            </th>
            <th scope="col" className="dc-num dc-col-secundaria">
              Taxa de cliques
            </th>
            <th scope="col">
              <span className="dc-sr">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((campanha) => {
            const aberta = !!abertas[campanha.id];
            const leads = numero(campanha.leads);
            const proporcao = leads / maiorLeads;
            const estilo = theme.series[campanha.plataforma as PlataformaId];
            return [
              <tr key={campanha.id} className={aberta ? 'dc-linha dc-linha--aberta' : 'dc-linha'}>
                <th scope="row">
                  <span className="dc-campanha__nome">{campanha.nome}</span>
                  <span className="dc-campanha__meta">
                    <span className="dc-chip-canal" data-plataforma={campanha.plataforma}>
                      {rotulosPlataforma[campanha.plataforma] ?? campanha.plataforma}
                    </span>
                    <span className="dc-campanha__situacao" data-situacao={campanha.situacao}>
                      {SITUACAO[campanha.situacao] ?? campanha.situacao}
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
                      {textoValor(campanha.leads, 'inteiro')}
                    </span>
                  </span>
                </td>

                <td className="dc-num">{textoValor(campanha.custoPorLead, 'brl')}</td>
                <td className="dc-num dc-col-secundaria">
                  {textoValor(campanha.investimento, 'brl')}
                </td>
                <td className="dc-num dc-col-secundaria">
                  {textoValor(campanha.ctr, 'percentual')}
                </td>

                <td className="dc-acao">
                  <button
                    type="button"
                    className="dc-botao-detalhe"
                    aria-expanded={aberta}
                    aria-controls={`detalhe-${campanha.id}`}
                    onClick={() => alternar(campanha.id)}
                  >
                    <span className="dc-sr">
                      {aberta ? 'Fechar detalhes de' : 'Ver detalhes de'} {campanha.nome}
                    </span>
                    <span aria-hidden="true" className="dc-botao-detalhe__sinal">
                      {aberta ? '−' : '+'}
                    </span>
                  </button>
                </td>
              </tr>,

              <tr
                key={`${campanha.id}-detalhe`}
                id={`detalhe-${campanha.id}`}
                className="dc-detalhe"
                hidden={!aberta}
              >
                <td colSpan={6}>
                  <dl className="dc-detalhe__lista">
                    <div>
                      <dt>Investimento</dt>
                      <dd>{textoValor(campanha.investimento, 'brl')}</dd>
                    </div>
                    <div>
                      <dt>Impressões</dt>
                      <dd>{textoValor(campanha.impressoes, 'inteiro')}</dd>
                    </div>
                    <div>
                      <dt>Cliques</dt>
                      <dd>{textoValor(campanha.cliques, 'inteiro')}</dd>
                    </div>
                    <div>
                      <dt>Taxa de cliques</dt>
                      <dd>{textoValor(campanha.ctr, 'percentual')}</dd>
                    </div>
                    <div>
                      <dt>Objetivo</dt>
                      <dd>{campanha.objetivo}</dd>
                    </div>
                    <div>
                      <dt>Participação nos leads</dt>
                      <dd>
                        {totalLeads > 0
                          ? formatarParticipacao(numero(campanha.leads) / totalLeads)
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </td>
              </tr>,
            ];
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total do período</th>
            <td className="dc-num">{formatarNumero(totalLeads, 'inteiro')}</td>
            <td className="dc-num" colSpan={4}>
              <span className="dc-sr">Custo por lead do total: ver indicadores</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
