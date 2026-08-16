/**
 * Peças de página do relatório. Nenhuma delas conhece cliente nem proposta
 * visual: o esqueleto é um só, a pele vem de `[data-proposta]` no CSS.
 */

import type { ReactNode } from 'react';
import type {
  Comparativo as ComparativoTipo,
  DirecaoFavoravel,
  Metrica,
  PlataformaId,
  SituacaoFonte,
  Unidade,
  Valor,
} from './snapshot';
import {
  formatarCompetencia,
  formatarNumero,
  formatarVariacao,
  textoDoEstadoVazio,
} from './format';
import { motivoParaCliente, textoParaCliente } from './blocos/motivo-cliente';

/* ------------------------------------------------------------------ */

export type TomChip = 'ok' | 'atencao' | 'falha' | 'neutro';

export function Chip({ tom = 'neutro', children }: { tom?: TomChip; children: ReactNode }) {
  return (
    <span className="dc-chip" data-tom={tom}>
      {children}
    </span>
  );
}

const TOM_POR_SITUACAO: Record<SituacaoFonte, TomChip> = {
  sucesso: 'ok',
  parcial: 'atencao',
  indisponivel: 'falha',
  nao_configurada: 'neutro',
  erro: 'falha',
};

const TEXTO_SITUACAO: Record<SituacaoFonte, string> = {
  sucesso: 'Dados completos',
  parcial: 'Dados parciais',
  indisponivel: 'Sem dados neste período',
  nao_configurada: 'Não contratada',
  erro: 'Não confirmado',
};

export function ChipFonte({ situacao }: { situacao: SituacaoFonte }) {
  return <Chip tom={TOM_POR_SITUACAO[situacao]}>{TEXTO_SITUACAO[situacao]}</Chip>;
}

/* ------------------------------------------------------------------ */
/* Valor em três estados                                               */
/* ------------------------------------------------------------------ */

/**
 * O único lugar que transforma `Valor` em texto na tela.
 * Ausência e falha nunca viram `0` e nunca são comunicadas só por cor:
 * levam palavra ("indisponível", "não confirmado"). "Não se aplica" é traço,
 * e é tratado como estado neutro — não é problema a resolver.
 */
export function ValorExibido({
  valor,
  unidade,
  sufixo,
  className,
}: {
  valor: Valor;
  unidade: Unidade;
  sufixo?: string;
  className?: string;
}) {
  if (valor.estado === 'ok') {
    const zeroMedido = valor.numero === 0;
    return (
      <span className={className}>
        <span className="dc-numero" data-estado={zeroMedido ? 'zero' : 'medido'}>
          {formatarNumero(valor.numero, unidade)}
        </span>
        {sufixo && <span className="dc-kpi__sufixo">{sufixo}</span>}
        {zeroMedido && <span className="dc-estado-medicao">medido</span>}
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="dc-valor--indisponivel" data-estado={valor.estado}>
        {textoDoEstadoVazio(valor)}
      </span>
    </span>
  );
}

/**
 * O motivo de um valor não medido, filtrado pelo classificador de
 * vocabulário técnico (C1 da direção de 2026-08-12) antes de chegar à tela
 * do cliente — mesma régua do `BlocoIndisponivel`, aplicada aqui porque é o
 * único ponto por onde o motivo de uma métrica ausente ou com falha passa.
 */
export function Motivo({ texto }: { texto: string }) {
  return <p className="dc-motivo">{motivoParaCliente(texto, 'Não disponível neste relatório.')}</p>;
}

/* ------------------------------------------------------------------ */
/* Comparativo                                                         */
/* ------------------------------------------------------------------ */

/**
 * Alta não é verde automaticamente: quem decide é `direcaoFavoravel` da
 * métrica. Custo por lead subindo é ruim; leads subindo é bom; investimento
 * subindo não é nem uma coisa nem outra.
 */
function leituraDaVariacao(
  variacao: number,
  direcao: DirecaoFavoravel,
): 'favoravel' | 'desfavoravel' | 'neutra' {
  if (direcao === 'neutra' || variacao === 0) return 'neutra';
  const subiu = variacao > 0;
  if (direcao === 'alta') return subiu ? 'favoravel' : 'desfavoravel';
  return subiu ? 'desfavoravel' : 'favoravel';
}

const ROTULO_LEITURA = {
  favoravel: 'favorável',
  desfavoravel: 'desfavorável',
  neutra: 'neutra',
} as const;

export function ComparativoExibido({
  comparativo,
  direcao,
  unidade,
}: {
  comparativo?: ComparativoTipo;
  direcao: DirecaoFavoravel;
  unidade: Unidade;
}) {
  if (!comparativo) return null;

  if (!comparativo.permitido) {
    return (
      <p className="dc-origem">
        {motivoParaCliente(comparativo.motivo, 'Não há comparação disponível para este número.')}
      </p>
    );
  }

  if (comparativo.variacao === null || comparativo.variacao === undefined) return null;

  const leitura = leituraDaVariacao(comparativo.variacao, direcao);
  const seta = comparativo.variacao > 0 ? '▲' : comparativo.variacao < 0 ? '▼' : '■';
  const base =
    comparativo.valorBase?.estado === 'ok'
      ? formatarNumero(comparativo.valorBase.numero, unidade)
      : null;

  return (
    <p className="dc-comparativo" data-leitura={leitura}>
      <span aria-hidden="true" className="dc-comparativo__seta">
        {seta}
      </span>
      <span>{formatarVariacao(comparativo.variacao)}</span>
      <span className="dc-comparativo__leitura">{ROTULO_LEITURA[leitura]}</span>
      {comparativo.competenciaBase && (
        <span className="dc-comparativo__base">
          ante {formatarCompetencia(comparativo.competenciaBase)}
          {base ? ` (${base})` : ''}
        </span>
      )}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Origem                                                              */
/* ------------------------------------------------------------------ */

const NOME_PLATAFORMA: Record<PlataformaId, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  pinterest: 'Pinterest Ads',
  ga4: 'Google Analytics 4',
  instagram: 'Instagram',
  ecommerce: 'Loja',
  crm: 'CRM',
};

export function nomePlataforma(id: PlataformaId): string {
  return NOME_PLATAFORMA[id] ?? id;
}

/**
 * `modo` decide o que sobra desta linha — 2026-08-15.
 *
 * Ela imprimia sempre "Via Meta Ads · investimento ÷ impressões × 1.000", sob
 * CADA número. Numa faixa de seis indicadores isso são seis linhas de método,
 * 332 caracteres, e o "Via Meta Ads" aparece seis vezes numa seção intitulada
 * "Meta Ads em julho".
 *
 * - `completo`  — como sempre foi. É o padrão, então quem chama de fora não muda.
 * - `sem-plataforma` — a seção inteira é de uma plataforma só e já diz isso no
 *   título; sobra a fórmula, que é a parte que o leitor não tem como deduzir.
 * - `oculto`   — a fórmula foi recolhida para o pé da seção (ver `B1FaixaIndicadores`).
 */
export function OrigemExibida({
  metrica,
  modo = 'completo',
}: {
  metrica: Metrica;
  modo?: 'completo' | 'sem-plataforma' | 'oculto';
}) {
  if (modo === 'oculto') return null;

  const formula = metrica.origem.formula ? textoParaCliente(metrica.origem.formula) : '';
  if (modo === 'sem-plataforma') {
    return formula ? <p className="dc-origem">{formula}</p> : null;
  }

  const fontes = metrica.origem.fontes.map(nomePlataforma).join(' + ');
  return (
    <p className="dc-origem">
      Via {fontes}
      {formula ? ` · ${formula}` : ''}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Indicador                                                           */
/* ------------------------------------------------------------------ */

export function Indicador({
  metrica,
  origem = 'completo',
}: {
  metrica: Metrica;
  /** Ver `OrigemExibida`. O padrão preserva o comportamento de quem já chamava. */
  origem?: 'completo' | 'sem-plataforma' | 'oculto';
}) {
  const plataforma =
    metrica.origem.fontes.length === 1 ? metrica.origem.fontes[0] : 'multiplataforma';

  return (
    <article className="dc-kpi" data-plataforma={plataforma}>
      <h3 className="dc-kpi__rotulo">{textoParaCliente(metrica.rotulo)}</h3>

      <ValorExibido
        valor={metrica.valor}
        unidade={metrica.unidade}
        sufixo={metrica.sufixo}
        className="dc-kpi__valor"
      />

      {metrica.valor.estado !== 'ok' && <Motivo texto={metrica.valor.motivo} />}

      {metrica.descricao && metrica.valor.estado === 'ok' && (
        <p className="dc-kpi__descricao">{textoParaCliente(metrica.descricao)}</p>
      )}

      <div className="dc-kpi__rodape">
        <ComparativoExibido
          comparativo={metrica.comparativo}
          direcao={metrica.direcaoFavoravel}
          unidade={metrica.unidade}
        />
        <OrigemExibida metrica={metrica} modo={origem} />
      </div>
    </article>
  );
}

/**
 * NOTAS DE UM BLOCO — recolhidas quando são muitas.
 *
 * Fonte única para as listas que hoje aparecem em B2/B3/B4/B5/B6. A tabela de
 * campanhas da Aviarte fecha com **seis parágrafos de nota, mais longos que a
 * própria tabela**; a partir de três, elas passam a nascer recolhidas.
 *
 * Uma ou duas continuam abertas: são curtas, e esconder o que se lê num relance
 * troca ruído por clique. `<details>` nativo, como o glossário — teclado,
 * leitor de tela e impressão funcionam sem JavaScript.
 */
const NOTAS_ATE_ONDE_CABEM_ABERTAS = 2;

export function NotasDoBloco({ quantidade, children }: { quantidade: number; children: ReactNode }) {
  if (quantidade <= 0) return null;

  const lista = <ul className="dc-notas-tabela">{children}</ul>;
  if (quantidade <= NOTAS_ATE_ONDE_CABEM_ABERTAS) return lista;

  return (
    <details className="dc-notas-caixa">
      <summary className="dc-notas-resumo">
        Ver {quantidade === 1 ? 'a observação' : `as ${quantidade} observações`} desta seção
      </summary>
      {lista}
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Seção                                                               */
/* ------------------------------------------------------------------ */

export function Secao({
  indice,
  titulo,
  apoio,
  nota,
  children,
  id,
}: {
  indice: string;
  titulo: string;
  /** A abertura: uma linha, no cabeçalho. */
  apoio?: string;
  /**
   * A ressalva de leitura, ao PÉ da seção. Separada da abertura em 2026-08-15:
   * a ressalva só faz sentido depois que o leitor viu o número a que ela se
   * refere, e no cabeçalho ela empurrava os números para baixo da dobra.
   */
  nota?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="dc-secao" id={id} aria-labelledby={`${id ?? indice}-titulo`}>
      <header className="dc-secao__cabecalho">
        <span className="dc-secao__indice" aria-hidden="true">
          {indice}
        </span>
        <div>
          <h2 className="dc-secao__titulo" id={`${id ?? indice}-titulo`}>
            {textoParaCliente(titulo)}
          </h2>
          {apoio && <p className="dc-secao__apoio">{textoParaCliente(apoio)}</p>}
        </div>
      </header>
      {children}
      {nota && <p className="dc-secao__nota">{textoParaCliente(nota)}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lista de afirmações                                                 */
/* ------------------------------------------------------------------ */

export function BlocoLeitura({
  titulo,
  tom,
  itens,
}: {
  titulo: string;
  tom: 'destaques' | 'atencao' | 'passos';
  itens: { texto: string }[];
}) {
  if (!itens.length) return null;
  return (
    <div className="dc-superficie dc-bloco-leitura" data-tom={tom}>
      <h3 className="dc-bloco-leitura__titulo">{titulo}</h3>
      <ul className="dc-lista-afirmacoes" data-tom={tom}>
        {itens.map((item) => (
          <li key={item.texto}>{textoParaCliente(item.texto)}</li>
        ))}
      </ul>
    </div>
  );
}
