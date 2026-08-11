/**
 * Regressão A1 — entrada Dácora-only dos relatórios internos Allgrotech.
 *
 * A fixture de troca de ID abaixo é explicitamente fictícia. Nenhum dado real,
 * endpoint de relatório interno ou banco participa desta prova.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { emailAutorizado, lerListaAutorizada } from '../api/_painel-autorizacao.ts';
import InternosAllgrotech, {
  LINK_INTERNOS_ALLGROTECH,
} from '../src/painel/InternosAllgrotech.tsx';
import {
  NavegacaoDoPainel,
  resolverVistaDoPainel,
} from '../src/painel/navegacao-painel.tsx';

assert.equal(LINK_INTERNOS_ALLGROTECH, '/painel-de-relatorios?secao=internos-allgrotech');
assert.equal(resolverVistaDoPainel(null, null), 'fila');
assert.equal(resolverVistaDoPainel(null, 'id-externo-ficticio'), 'revisao');
assert.equal(resolverVistaDoPainel('internos-allgrotech', null), 'internos-allgrotech');
assert.equal(
  resolverVistaDoPainel('internos-allgrotech', 'id-trocado-ficticio'),
  'internos-allgrotech',
  'trocar o ID não pode tirar a pessoa da seção interna nem abrir a revisão externa',
);

const htmlDaNavegacao = renderToStaticMarkup(
  createElement(
    MemoryRouter,
    null,
    createElement(NavegacaoDoPainel, { vista: 'internos-allgrotech' }),
  ),
);
assert.ok(htmlDaNavegacao.includes('Internos Allgrotech'));
assert.ok(htmlDaNavegacao.includes('aria-current="page"'));
assert.ok(htmlDaNavegacao.includes('secao=internos-allgrotech'));

const htmlVazio = renderToStaticMarkup(
  createElement(MemoryRouter, null, createElement(InternosAllgrotech, { relatorioId: null })),
);
assert.ok(htmlVazio.includes('Nenhum relatório interno disponível'));
assert.ok(htmlVazio.includes('nenhum snapshot interno foi gerado ou carregado'));
assert.ok(htmlVazio.includes('processo externo, sem entrada neste painel'));
assert.ok(!htmlVazio.includes('VetSell'));
assert.ok(!htmlVazio.includes('Exportar PDF'));

const htmlIdTrocado = renderToStaticMarkup(
  createElement(
    MemoryRouter,
    null,
    createElement(InternosAllgrotech, { relatorioId: 'id-trocado-ficticio' }),
  ),
);
assert.ok(htmlIdTrocado.includes('Relatório interno não encontrado'));
assert.ok(htmlIdTrocado.includes('não abre um relatório de outro produto aqui'));
assert.ok(!htmlIdTrocado.includes('id-trocado-ficticio'));

const listaDacora = lerListaAutorizada('contato@nandacora.com.br,flacora@gmail.com');
assert.equal(emailAutorizado('flacora@gmail.com', listaDacora), true);
assert.equal(emailAutorizado('pessoa-allgrotech-ficticia@exemplo.invalid', listaDacora), false);

const pagina = readFileSync(new URL('../src/pages/PainelRelatorios.tsx', import.meta.url), 'utf8');
assert.match(
  pagina,
  /<Portao>\s*<PainelInicio\s*\/>\s*<\/Portao>/,
  'a seção inteira precisa continuar atrás do portão P0',
);

const componente = readFileSync(
  new URL('../src/painel/InternosAllgrotech.tsx', import.meta.url),
  'utf8',
);
assert.ok(!componente.includes('fetch('), 'A1 não consulta dado nem endpoint');
assert.ok(!componente.includes('/api/'), 'A1 não cria acesso alternativo ao servidor');

const vercel = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
) as { routes: Array<{ src?: string; headers?: Record<string, string> }> };
const regraDoPainel = vercel.routes.find((rota) => rota.src === '/painel-de-relatorios(/.*)?');
assert.equal(regraDoPainel?.headers?.['X-Robots-Tag'], 'noindex, nofollow, noarchive');

const { ROUTES } = await import('./seo-routes.mjs');
assert.equal(
  ROUTES.some((rota: { path: string }) => rota.path.startsWith('/painel-de-relatorios')),
  false,
  'o painel e o deep-link interno não podem entrar no sitemap/prerender',
);

console.log('OK — A1 interna: rota, estado vazio, troca de ID, allowlist e noindex preservados');
