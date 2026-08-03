/**
 * Modelo de relatório: serviços e captação de leads.
 *
 * É o formato já aprovado no protótipo da Karyne. Ele foi movido para cá sem
 * mudança de conteúdo nem de aparência quando o segundo modelo entrou — o
 * miolo virou um módulo por tipo, e o esqueleto ficou compartilhado.
 */

import type { Campanha, CampanhaLeads } from '../snapshot';
import { textoValor } from '../format';
import TabelaDeCampanhas, {
  type ColunaCampanha,
  type LinhaCampanha,
} from '../charts/TabelaDeCampanhas';
import { CartoesDeCanal, ComparacaoDeCanais, EvolucaoComSeletor } from '../secoes';
import { NOME_NATUREZA, rotulosDePlataforma, somar } from './comum';
import type { ContextoCorpo, SecaoRelatorio } from './index';

const COLUNAS: ColunaCampanha[] = [
  { id: 'cpl', rotulo: 'Custo por lead', unidade: 'brl' },
  { id: 'investimento', rotulo: 'Investimento', unidade: 'brl', secundaria: true },
  { id: 'ctr', rotulo: 'Taxa de cliques', unidade: 'percentual', secundaria: true },
];

function ehLeads(campanha: Campanha): campanha is CampanhaLeads {
  return campanha.resultado === 'leads';
}

function linha(campanha: CampanhaLeads): LinhaCampanha {
  return {
    id: campanha.id,
    nome: campanha.nome,
    plataforma: campanha.plataforma,
    situacao: campanha.situacao,
    etiqueta: NOME_NATUREZA[campanha.natureza],
    principal: campanha.leads,
    colunas: {
      cpl: campanha.custoPorLead,
      investimento: campanha.investimento,
      ctr: campanha.ctr,
    },
    detalhes: [
      { rotulo: 'Investimento', texto: textoValor(campanha.investimento, 'brl') },
      { rotulo: 'Impressões', texto: textoValor(campanha.impressoes, 'inteiro') },
      { rotulo: 'Cliques', texto: textoValor(campanha.cliques, 'inteiro') },
      { rotulo: 'Taxa de cliques', texto: textoValor(campanha.ctr, 'percentual') },
      { rotulo: 'Objetivo', texto: campanha.objetivo },
    ],
  };
}

export function construirCorpoServicosLeads({
  snapshot,
  theme,
}: ContextoCorpo): SecaoRelatorio[] {
  const canaisDeMidia = snapshot.canais.filter((c) => c.papel === 'midia');
  const campanhas = snapshot.campanhas.filter(ehLeads);
  const linhas = campanhas.map(linha);

  return [
    {
      id: 'evolucao',
      titulo: 'Como o mês se comportou dia a dia',
      apoio:
        'Dia sem coleta aparece como interrupção na linha. Nada é preenchido por estimativa.',
      conteudo: (
        <EvolucaoComSeletor
          series={snapshot.series}
          opcoes={[
            { id: 'leads_dia', rotulo: 'Leads' },
            { id: 'investimento_dia', rotulo: 'Investimento' },
          ]}
          theme={theme}
        />
      ),
    },

    {
      id: 'canais',
      titulo: 'O que cada canal entregou',
      apoio:
        'Meta e Google são medidos por contas diferentes. Onde a comparação não é possível, isso está dito em vez de omitido.',
      conteudo: (
        <>
          <div className="dc-canais">
            <ComparacaoDeCanais
              canais={canaisDeMidia}
              sufixoMetricaId="leads"
              pergunta="De onde vieram os leads?"
              unidade="inteiro"
              unidadeTexto="Leads no período"
              theme={theme}
            />
            <ComparacaoDeCanais
              canais={canaisDeMidia}
              sufixoMetricaId="investimento"
              pergunta="Onde o investimento foi aplicado?"
              unidade="brl"
              unidadeTexto="Reais no período"
              theme={theme}
            />
          </div>

          <div className="dc-espaco-bloco">
            <CartoesDeCanal canais={snapshot.canais} fontes={snapshot.fontes} theme={theme} />
          </div>
        </>
      ),
    },

    {
      id: 'campanhas',
      titulo: 'Campanhas do período',
      apoio:
        'Ordenadas por leads. No celular, toque no + para ver investimento, impressões, cliques e participação.',
      conteudo: (
        <div className="dc-superficie">
          <TabelaDeCampanhas
            pergunta="Quais campanhas trouxeram os leads do mês e a que custo?"
            theme={theme}
            rotulosPlataforma={rotulosDePlataforma(snapshot.canais)}
            principal={{ id: 'leads', rotulo: 'Leads', unidade: 'inteiro' }}
            colunas={COLUNAS}
            linhas={linhas}
            total={{
              rotulo: 'Total do período',
              principal: somar(
                campanhas.map((c) => c.leads),
                'o número de leads',
              ),
              colunas: { cpl: null, investimento: null, ctr: null },
            }}
            participacaoRotulo="Participação nos leads"
          />
        </div>
      ),
    },
  ];
}
