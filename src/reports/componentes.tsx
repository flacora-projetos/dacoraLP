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

export function OrigemExibida({ metrica }: { metrica: Metrica }) {
  const fontes = metrica.origem.fontes.map(nomePlataforma).join(' + ');
  const formula = metrica.origem.formula ? ` · ${textoParaCliente(metrica.origem.formula)}` : '';
  return (
    <p className="dc-origem">
      Via {fontes}
      {formula}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Indicador                                                           */
/* ------------------------------------------------------------------ */

export function Indicador({ metrica }: { metrica: Metrica }) {
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
        <OrigemExibida metrica={metrica} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Seção                                                               */
/* ------------------------------------------------------------------ */

export function Secao({
  indice,
  titulo,
  apoio,
  children,
  id,
}: {
  indice: string;
  titulo: string;
  apoio?: string;
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
