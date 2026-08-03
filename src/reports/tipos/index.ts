/**
 * Registro de modelos de relatório por TIPO.
 *
 * É o equivalente, no portal, ao `client_report_formats` do repositório da
 * fábrica: o formato da página é resolvido por um campo do snapshot
 * (`identidade.tipoRelatorio`), nunca por um `if` com o nome do cliente. Um
 * cliente novo de e-commerce entra no modelo inteiro sem uma linha de código;
 * se o layout mudasse por se chamar Sant'Alberti, o desenho estaria errado.
 *
 * Cada construtor devolve apenas as seções do MIOLO. Cabeçalho, capa, resumo
 * executivo, indicadores, oportunidades, qualidade das fontes e rodapé são do
 * esqueleto, iguais nos dois tipos, e ficam em `RelatorioMensal.tsx`.
 */

import type { ReactNode } from 'react';
import type { Snapshot, TipoRelatorio } from '../snapshot';
import type { ChartTheme } from '../charts/chartTheme';
import { construirCorpoServicosLeads } from './servicosLeads';
import { construirCorpoEcommerce } from './ecommerce';

export interface SecaoRelatorio {
  id: string;
  titulo: string;
  apoio?: string;
  conteudo: ReactNode;
}

export interface ContextoCorpo {
  snapshot: Snapshot;
  theme: ChartTheme;
}

export type ConstrutorCorpo = (ctx: ContextoCorpo) => SecaoRelatorio[];

export const CORPO_POR_TIPO: Record<TipoRelatorio, ConstrutorCorpo> = {
  servicos_leads: construirCorpoServicosLeads,
  ecommerce: construirCorpoEcommerce,
};
