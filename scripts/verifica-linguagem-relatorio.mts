/** Regressão C1/C2/C3 — linguagem de cliente sem esconder dado. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import BlocoIndisponivel from '../src/reports/blocos/BlocoIndisponivel.tsx';
import { motivoParaCliente, textoParaCliente } from '../src/reports/blocos/motivo-cliente.ts';
import TabelaDeEntidades from '../src/reports/charts/TabelaDeEntidades.tsx';
import { criarChartTheme } from '../src/reports/charts/chartTheme.ts';
import { renderizarBloco } from '../src/reports/blocos/catalogo.tsx';
import { aviarte202607 } from '../src/reports/fixtures/aviarte-2026-07.ts';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07.ts';
import { ich202607 } from '../src/reports/fixtures/ich-2026-07.ts';

const vocabularioProibido = [
  /compet[êe]ncia/i,
  /evento(s)?\s+governado/i,
  /\bcolet\w*/i,
  /\bconector(es)?\b/i,
  /\bcobertura\b/i,
  /\bsnapshot\b/i,
  /\bfontes?\b/i,
  /\bintegra[cç][aã]o\b/i,
];

function semJargao(html: string) {
  const document = new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
  const acessivel = [...document.querySelectorAll('[aria-label], [alt], [title]')]
    .flatMap((elemento) => ['aria-label', 'alt', 'title'].map((atributo) => elemento.getAttribute(atributo) ?? ''))
    .join(' ');
  const textoCliente = `${document.body.textContent ?? ''} ${acessivel}`;
  for (const termo of vocabularioProibido) {
    assert.equal(termo.test(textoCliente), false, `jargão técnico vazou para o cliente: ${termo}`);
  }
}

// C1/C3: o diagnóstico técnico permanece no snapshot, mas não no documento.
const tecnico = renderToStaticMarkup(
  createElement(BlocoIndisponivel, {
    info: {
      motivo: 'A lista de anúncios veio cortada nesta consulta, então o ranking mostraria uma parte como se fosse o todo.',
      oQueTemos: [
        'O investimento do período está disponível.',
        'A coleta parcial trouxe só uma parte dos anúncios.',
      ],
      dependeDe: 'depende de uma nova coleta com a integração do Instagram respondendo',
    },
  }),
);
assert.match(tecnico, /O ranking de anúncios não está disponível neste relatório\./);
assert.match(tecnico, /O investimento do período está disponível\./);
assert.doesNotMatch(tecnico, /lista de anúncios veio cortada/i);
assert.doesNotMatch(tecnico, /depende de/i);
semJargao(tecnico);

// Fato do negócio continua visível: a limpeza não pode virar apagão de motivo.
const negocio = renderToStaticMarkup(
  createElement(BlocoIndisponivel, {
    info: { motivo: 'Nenhum anúncio deste grupo veiculou no mês.' },
  }),
);
assert.match(negocio, /Nenhum anúncio deste grupo veiculou no mês\./);

// Motivo técnico desconhecido cai numa frase neutra, nunca numa causa inventada.
assert.equal(
  motivoParaCliente(
    'O conector respondeu sem cobertura suficiente neste lote.',
    'Não disponível neste relatório.',
  ),
  'Não disponível neste relatório.',
);

// C2: uma lista grande abre resumida, mas TODAS as linhas continuam no HTML.
const linhas = Array.from({ length: 10 }, (_, indice) => ({
  id: `kw-${indice + 1}`,
  nome: `palavra ${indice + 1}`,
  plataforma: 'google' as const,
  principal: { estado: 'ok' as const, numero: 10 - indice },
  colunas: {},
  detalhes: [],
}));
const tabela = renderToStaticMarkup(
  createElement(TabelaDeEntidades, {
    pergunta: 'Quais palavras tiveram mais investimento?',
    theme: criarChartTheme('B'),
    rotuloDimensao: 'Palavra-chave',
    rotulosPlataforma: { google: 'Google Ads' },
    principal: { id: 'custo', rotulo: 'Investimento', unidade: 'brl' },
    colunas: [],
    linhas,
    total: {
      rotulo: 'Total',
      principal: { estado: 'ok', numero: 55 },
      colunas: {},
    },
    limiteLinhasVisiveis: 8,
  }),
);
assert.match(tabela, /Mostrando as 8 primeiras de 10 linhas/);
assert.match(tabela, /aria-expanded="false"/);
assert.match(tabela, /aria-controls=/);
assert.match(tabela, /palavra 1/);
assert.match(tabela, /palavra 10/); // recolhida na tela, preservada no documento/HTML
assert.match(tabela, /dc-linha--recolhida/);
assert.doesNotMatch(tabela, /<tr[^>]*class="[^"]*dc-linha[^"]*"[^>]*hidden/); // o recolhimento C2 não depende do atributo HTML hidden

// O gate renderiza todos os blocos das fixtures de referência pelo catálogo
// real. ICH entra aqui também porque usa o verbete de região do glossário;
// assim um vazamento nesse caminho derruba a regressão antes do build.
for (const [nome, snapshot] of [
  ['Karyne', karyneMontada202607],
  ['Aviarte', aviarte202607],
  ['ICH', ich202607],
] as const) {
  const rotulosPlataforma = Object.fromEntries(
    snapshot.fontes.map((fonte) => [fonte.plataforma, fonte.rotulo]),
  );
  const theme = criarChartTheme('B');
  // Títulos/apoios da montagem e a leitura editorial entram no Esqueleto sem
  // serem dados numéricos; se o snapshot corrente carregar jargão ali, o Gate 3
  // também precisa falhar.
  semJargao(
    JSON.stringify(snapshot.leitura, (_chave, valor) =>
      typeof valor === 'string' ? textoParaCliente(valor) : valor,
    ),
  );
  for (const config of snapshot.montagem) {
    semJargao(textoParaCliente(`${config.titulo} ${config.apoio ?? ''}`));
    const bloco = renderizarBloco(config, {
      dados: snapshot.dados,
      theme,
      rotulosPlataforma,
    });
    if (bloco === null) continue;
    const html = renderToStaticMarkup(createElement('div', null, bloco));
    try {
      semJargao(html);
    } catch (erro) {
      throw new Error(`${nome}/${config.id}: ${(erro as Error).message}`);
    }
  }
}

// O esqueleto não entra no teste acima porque importa CSS. As frases fixas
// que ele imprime são auditadas diretamente para impedir a volta dos quatro
// rótulos técnicos que motivaram C3.
const esqueleto = readFileSync(new URL('../src/reports/Esqueleto.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(esqueleto, />Competência</);
assert.doesNotMatch(esqueleto, /números foram coletados/);
assert.doesNotMatch(esqueleto, />\s*Fontes:/);
assert.match(esqueleto, />Período</);
assert.match(esqueleto, /números foram registrados/);
assert.match(esqueleto, /Origens:/);

const css = readFileSync(new URL('../src/reports/report.css', import.meta.url), 'utf8');
assert.match(css, /@media print[\s\S]*dc-linha--recolhida[\s\S]*display:\s*table-row\s*!important/);
assert.match(css, /@media print[\s\S]*dc-criativo--recolhido[\s\S]*display:\s*flex\s*!important/);

console.log('OK — linguagem de cliente: jargão técnico filtrado, fato de negócio preservado e blocos resumidos continuam completos no HTML/PDF');
