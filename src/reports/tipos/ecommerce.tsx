/**
 * Modelo de relatório: e-commerce.
 *
 * O que este modelo precisa provar, e onde cada coisa é provada:
 *
 *  1. Receita sempre identifica a fonte — nenhum rótulo diz só "receita".
 *     É "receita atribuída pelo Meta Ads" ou "faturamento registrado pela
 *     loja". As duas nunca entram no mesmo total nem na mesma linha de
 *     gráfico.
 *  2. A divergência entre mídia e loja é a seção 03, antes de qualquer
 *     detalhe de canal ou campanha. Ver `ConfrontoMidiaLoja.tsx`.
 *  3. Campanha de venda fica numa tabela; tráfego e mensagem, em outra. Não
 *     é separação por seção só: são totais diferentes, porque o resultado
 *     delas não é a mesma coisa.
 *  4. ROAS carrega a base no próprio rótulo: sobre o investimento em
 *     campanhas de venda, com o investimento fora de venda mostrado à parte.
 *  5. GA4 entra como medição e só aparece em cartão de canal — nunca num
 *     gráfico de investimento, nunca com orçamento.
 *  6. Pinterest é canal de verdade, nos mesmos gráficos e tabelas que Meta e
 *     Google. Onde a plataforma não devolve uma métrica, o cartão dela
 *     escreve isso.
 */

import type { Campanha, CampanhaSemVenda, CampanhaVenda, Valor } from '../snapshot';
import { textoValor } from '../format';
import TabelaDeEntidades, {
  type ColunaEntidade,
  type LinhaEntidade,
} from '../charts/TabelaDeEntidades';
import ConfrontoMidiaLoja from '../ConfrontoMidiaLoja';
import { CartoesDeCanal, ComparacaoDeCanais, EvolucaoComSeletor } from '../secoes';
import { NOME_NATUREZA, rotulosDePlataforma, somar } from './comum';
import type { ContextoCorpo, SecaoRelatorio } from './index';

/* ------------------------------------------------------------------ */
/* Campanhas de venda                                                  */
/* ------------------------------------------------------------------ */

/**
 * No celular ficam só receita e ROAS ao lado do nome. O resto sai da grade e
 * reaparece na linha expansível — é o que mantém a promessa de nunca haver
 * rolagem lateral numa tela de 375 px.
 */
const COLUNAS_VENDA: ColunaEntidade[] = [
  { id: 'roas', rotulo: 'ROAS', unidade: 'decimal', sufixo: '×' },
  { id: 'compras', rotulo: 'Compras', unidade: 'inteiro', secundaria: true },
  { id: 'investimento', rotulo: 'Investimento', unidade: 'brl', secundaria: true },
  { id: 'custo_compra', rotulo: 'Custo por compra', unidade: 'brl', secundaria: true },
];

function ehVenda(campanha: Campanha): campanha is CampanhaVenda {
  return campanha.resultado === 'venda';
}

function ehSemVenda(campanha: Campanha): campanha is CampanhaSemVenda {
  return campanha.resultado === 'sem_venda';
}

function linhaVenda(campanha: CampanhaVenda): LinhaEntidade {
  return {
    id: campanha.id,
    nome: campanha.nome,
    plataforma: campanha.plataforma,
    situacao: campanha.situacao,
    etiqueta: NOME_NATUREZA[campanha.natureza],
    principal: campanha.receitaAtribuida,
    colunas: {
      roas: campanha.roas,
      compras: campanha.compras,
      investimento: campanha.investimento,
      custo_compra: campanha.custoPorCompra,
    },
    detalhes: [
      { rotulo: 'Compras atribuídas', texto: textoValor(campanha.compras, 'inteiro') },
      { rotulo: 'Investimento', texto: textoValor(campanha.investimento, 'brl') },
      { rotulo: 'Custo por compra', texto: textoValor(campanha.custoPorCompra, 'brl') },
      { rotulo: 'Impressões', texto: textoValor(campanha.impressoes, 'inteiro') },
      { rotulo: 'Cliques', texto: textoValor(campanha.cliques, 'inteiro') },
      { rotulo: 'Taxa de cliques', texto: textoValor(campanha.ctr, 'percentual') },
      { rotulo: 'Objetivo', texto: campanha.objetivo },
      { rotulo: 'Janela de atribuição', texto: campanha.janelaAtribuicao },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Campanhas que não foram compradas para vender                       */
/* ------------------------------------------------------------------ */

const COLUNAS_SEM_VENDA: ColunaEntidade[] = [
  { id: 'impressoes', rotulo: 'Impressões', unidade: 'inteiro' },
  { id: 'cliques', rotulo: 'Cliques', unidade: 'inteiro', secundaria: true },
  { id: 'ctr', rotulo: 'Taxa de cliques', unidade: 'percentual', secundaria: true },
];

function linhaSemVenda(campanha: CampanhaSemVenda): LinhaEntidade {
  const detalhes = [
    { rotulo: 'Objetivo', texto: campanha.objetivo },
    { rotulo: 'Cliques', texto: textoValor(campanha.cliques, 'inteiro') },
    { rotulo: 'Taxa de cliques', texto: textoValor(campanha.ctr, 'percentual') },
    { rotulo: 'Por que não tem receita', texto: campanha.motivo },
  ];

  if (campanha.resultadoProprio) {
    const proprio = campanha.resultadoProprio;
    detalhes.splice(1, 0, {
      rotulo: proprio.rotulo,
      texto: textoValor(proprio.valor, proprio.unidade),
    });
    if (proprio.custo && proprio.custoRotulo) {
      detalhes.splice(2, 0, {
        rotulo: proprio.custoRotulo,
        texto: textoValor(proprio.custo, 'brl'),
      });
    }
  }

  return {
    id: campanha.id,
    nome: campanha.nome,
    plataforma: campanha.plataforma,
    situacao: campanha.situacao,
    etiqueta: NOME_NATUREZA[campanha.natureza],
    principal: campanha.investimento,
    colunas: {
      impressoes: campanha.impressoes,
      cliques: campanha.cliques,
      ctr: campanha.ctr,
    },
    detalhes,
  };
}

/* ------------------------------------------------------------------ */

const SEM_INDICADOR: Valor = {
  estado: 'ausente',
  motivo: 'Indicador não presente no snapshot.',
};

export function construirCorpoEcommerce({ snapshot, theme }: ContextoCorpo): SecaoRelatorio[] {
  const canaisDeMidia = snapshot.canais.filter((c) => c.papel === 'midia');
  const rotulos = rotulosDePlataforma(snapshot.canais);

  const venda = snapshot.campanhas.filter(ehVenda);
  const semVenda = snapshot.campanhas.filter(ehSemVenda);

  /**
   * O ROAS do total NÃO é somado nem tirado de média: ele vem do indicador já
   * apurado no snapshot, sobre a mesma base declarada no cabeçalho da página.
   * Média de ROAS entre campanhas de tamanhos diferentes é errada e parece
   * certa, que é o pior tipo de erro.
   */
  const roasDeclarado =
    snapshot.indicadores.find((i) => i.id === 'roas_venda')?.valor ?? SEM_INDICADOR;

  const secoes: SecaoRelatorio[] = [];

  /* 03 — a divergência, antes de qualquer detalhe -------------------- */
  if (snapshot.confrontoReceita) {
    secoes.push({
      id: 'confronto',
      titulo: 'Mídia e loja não contam a mesma venda',
      apoio:
        'Os dois números abaixo medem coisas diferentes e não devem ser somados. Nenhum deles foi escolhido como o verdadeiro, e nenhum foi ajustado para caber no outro.',
      conteudo: <ConfrontoMidiaLoja confronto={snapshot.confrontoReceita} />,
    });
  }

  /* 04 — evolução ---------------------------------------------------- */
  secoes.push({
    id: 'evolucao',
    titulo: 'Como o mês se comportou dia a dia',
    apoio:
      'Cada opção é uma série própria, com a fonte no título. Faturamento da loja e receita atribuída nunca aparecem na mesma linha, porque não são a mesma medida. Dia sem coleta aparece como interrupção.',
    conteudo: (
      <EvolucaoComSeletor
        series={snapshot.series}
        opcoes={[
          { id: 'faturamento_dia', rotulo: 'Faturamento da loja' },
          { id: 'receita_atribuida_dia', rotulo: 'Receita atribuída' },
          { id: 'investimento_dia', rotulo: 'Investimento' },
        ]}
        theme={theme}
      />
    ),
  });

  /* 05 — canais ------------------------------------------------------ */
  secoes.push({
    id: 'canais',
    titulo: 'O que cada canal entregou',
    apoio:
      'Os dois gráficos abaixo mostram só as plataformas de mídia. A loja não entra: o que ela registra não é receita atribuída. O Google Analytics 4 também não: ele mede o site e nunca traz gasto nem orçamento.',
    conteudo: (
      <>
        <div className="dc-canais">
          <ComparacaoDeCanais
            canais={canaisDeMidia}
            sufixoMetricaId="receita_atribuida"
            pergunta="Quanta receita cada plataforma de mídia atribui a si?"
            unidade="brl"
            unidadeTexto="Reais atribuídos no período"
            theme={theme}
          />
          <ComparacaoDeCanais
            canais={canaisDeMidia}
            sufixoMetricaId="investimento"
            pergunta="Onde o investimento foi aplicado?"
            unidade="brl"
            unidadeTexto="Reais investidos no período"
            theme={theme}
          />
        </div>

        <div className="dc-espaco-bloco">
          <CartoesDeCanal canais={snapshot.canais} fontes={snapshot.fontes} theme={theme} />
        </div>
      </>
    ),
  });

  /* 06 — campanhas, em duas tabelas ---------------------------------- */
  secoes.push({
    id: 'campanhas',
    titulo: 'Campanhas do período',
    apoio:
      'Duas tabelas, e não uma com uma coluna vazia: campanha de venda e campanha de tráfego ou mensagem têm resultados de naturezas diferentes e não vão para o mesmo total.',
    conteudo: (
      <>
        <div className="dc-superficie">
          <h3 className="dc-subtitulo">Campanhas de venda</h3>
          <TabelaDeEntidades
            pergunta="Quanta receita cada campanha de venda atribui a si, e a que custo?"
            theme={theme}
            rotuloDimensao="Campanha"
            rotulosPlataforma={rotulos}
            principal={{ id: 'receita', rotulo: 'Receita atribuída', unidade: 'brl' }}
            colunas={COLUNAS_VENDA}
            linhas={venda.map(linhaVenda)}
            notas={[
              'Receita atribuída é o que cada plataforma reivindica para si, dentro da própria janela. Não é faturamento da loja e não pode ser somada com ele.',
            ]}
            total={{
              rotulo: 'Total das campanhas de venda',
              principal: somar(
                venda.map((c) => c.receitaAtribuida),
                'a receita atribuída',
              ),
              colunas: {
                roas: roasDeclarado,
                compras: somar(
                  venda.map((c) => c.compras),
                  'o número de compras',
                ),
                investimento: somar(
                  venda.map((c) => c.investimento),
                  'o investimento',
                ),
                custo_compra: null,
              },
            }}
            participacaoRotulo="Participação na receita atribuída"
          />
        </div>

        <div className="dc-superficie dc-espaco-bloco">
          <h3 className="dc-subtitulo">Campanhas de tráfego e de mensagem</h3>
          <TabelaDeEntidades
            pergunta="Quanto foi investido fora de campanhas de venda, e o que elas entregaram?"
            theme={theme}
            rotuloDimensao="Campanha"
            rotulosPlataforma={rotulos}
            principal={{ id: 'investimento', rotulo: 'Investimento', unidade: 'brl' }}
            colunas={COLUNAS_SEM_VENDA}
            linhas={semVenda.map(linhaSemVenda)}
            notas={[
              'Estas campanhas não foram compradas para vender. Nenhuma receita foi atribuída a elas neste relatório, e o investimento delas fica de fora do ROAS — que é calculado só sobre campanhas de venda.',
            ]}
            total={{
              rotulo: 'Total fora de campanhas de venda',
              principal: somar(
                semVenda.map((c) => c.investimento),
                'o investimento',
              ),
              colunas: {
                impressoes: somar(
                  semVenda.map((c) => c.impressoes),
                  'as impressões',
                ),
                cliques: somar(
                  semVenda.map((c) => c.cliques),
                  'os cliques',
                ),
                ctr: null,
              },
            }}
            participacaoRotulo="Participação no investimento fora de venda"
          />
        </div>
      </>
    ),
  });

  return secoes;
}
