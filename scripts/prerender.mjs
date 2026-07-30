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
