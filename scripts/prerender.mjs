/**
 * Pré-renderiza cada rota para HTML estático.
 *
 * Por quê: o site é um SPA Vite. Sem isso o HTML entregue é só
 * <div id="root"></div> — o Google até renderiza JS, mas os crawlers de IA
 * (GPTBot, ClaudeBot, PerplexityBot) não executam JavaScript e enxergariam
 * uma página vazia.
 *
 * Roda depois de `vite build` + `vite build --ssr`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROUTES, SITE } from './seo-routes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');

/* O template É `dist/index.html`, e o laço abaixo SOBRESCREVE esse mesmo
   arquivo com a home pré-renderizada. Rodar este script duas vezes sem um
   `vite build` no meio faria a casca nascer a partir da home já renderizada —
   exatamente o conteúdo que ela existe para não ter. Falhar alto aqui é a
   diferença entre um erro visível e uma casca errada publicada em silêncio. */
if (!template.includes('<div id="root"></div>')) {
  throw new Error(
    'dist/index.html já está pré-renderizado. Rode `vite build` antes de `prerender` — ' +
    'este script consome o template limpo e o substitui.',
  );
}
const { render } = await import(
  pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href
);

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Substitui o bloco entre <!--tag--> e <!--/tag-->. Usa replacer em função
 *  para não interpretar $& e afins no conteúdo. */
function replaceBlock(html, tag, content) {
  const re = new RegExp(`<!--${tag}-->[\\s\\S]*?<!--/${tag}-->`);
  if (!re.test(html)) throw new Error(`Marcador <!--${tag}--> não encontrado no template`);
  return html.replace(re, () => `<!--${tag}-->\n${content}\n    <!--/${tag}-->`);
}

function headFor(route, url) {
  const title = esc(route.title);
  const desc = esc(route.description);
  const img = route.ogImage || `${SITE}/og-image.jpg`;
  return `    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="${esc(route.robots)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Dácora Performance Digital" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />`;
}

/**
 * Nós de schema da página. Organization e WebSite são declarados na home
 * (index.html) e referenciados aqui por @id, sem duplicar o grafo.
 */
function jsonldFor(route, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': route.jsonld(url),
  };
  return `    <script type="application/ld+json">
${JSON.stringify(payload, null, 2)}
    </script>`;
}

/**
 * A CASCA das rotas privadas (painel e relatórios).
 *
 * Por que ela existe: `vercel.json` mandava TODA rota não-arquivo para
 * `index.html`, e `index.html` é a home INTEIRA já renderizada (é esse o
 * ponto da pré-renderização, para os crawlers de IA lerem o site sem
 * JavaScript). Resultado: abrir o painel ou o relatório de um cliente pintava
 * a home institucional por alguns instantes antes de o roteador trocar de
 * página — e, junto dela, vinham três coisas que não pertencem a uma página
 * privada:
 *
 * 1. o `<title>` de venda, até o JavaScript rodar;
 * 2. o preload em prioridade ALTA da imagem do banner, competindo com o
 *    código do próprio relatório e alongando o flash que causava;
 * 3. o Google Analytics e o Pixel do Facebook, disparando `PageView` na
 *    página privada do cliente — decisão do PO em 2026-08-20: fora dos dois,
 *    tanto do relatório do cliente quanto do painel interno.
 *
 * A casca é o MESMO template, com `#root` vazio (o app monta a página certa
 * de primeira, sem nada para trocar), sem rastreador, sem preload de
 * marketing e com cabeçalho neutro. Ela não entra no sitemap nem em
 * `ROUTES`: quem a serve é `vercel.json`, por rota.
 */
const CABECALHO_DA_CASCA = `    <title>Dácora</title>
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="referrer" content="no-referrer" />`;

{
  let casca = replaceBlock(template, 'seo', CABECALHO_DA_CASCA);
  casca = replaceBlock(casca, 'jsonld', '');
  casca = replaceBlock(casca, 'hero-preload', '');
  casca = replaceBlock(casca, 'analytics', '');
  casca = replaceBlock(casca, 'analytics-noscript', '');
  fs.writeFileSync(path.join(dist, 'app.html'), casca);
  const kb = (Buffer.byteLength(casca) / 1024).toFixed(0);
  console.log(`  casca      ${'(rotas privadas)'.padEnd(26)} -> dist/app.html  (${kb} KB)`);
}

let count = 0;
for (const route of ROUTES) {
  const url = route.path === '/' ? `${SITE}/` : `${SITE}${route.path}`;
  const appHtml = render(route.path);

  let html = template.replace(
    '<div id="root"></div>',
    () => `<div id="root">${appHtml}</div>`,
  );

  if (!route.keepTemplateHead) {
    html = replaceBlock(html, 'seo', headFor(route, url));
    html = replaceBlock(html, 'jsonld', jsonldFor(route, url));
  }

  const outPath = path.join(dist, route.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`  prerender  ${route.path.padEnd(26)} -> dist/${route.out}  (${kb} KB)`);
  count++;
}

console.log(`\n  ${count} rotas pré-renderizadas.`);
