/**
 * Gera dist/sitemap.xml a partir de scripts/seo-routes.mjs, para o sitemap
 * nunca sair de sincronia com as rotas reais.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE } from './seo-routes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lastmod = new Date().toISOString().slice(0, 10);

const IMAGES = {
  '/': [
    ['/img/hero-trafego-pago-1920.webp', 'Gestão de tráfego pago para negócios locais'],
    ['/img/diagnostico-comercial-1200.webp', 'Diagnóstico do processo comercial'],
  ],
};

const urls = ROUTES.filter((r) => r.sitemap).map((r) => {
  const loc = r.path === '/' ? `${SITE}/` : `${SITE}${r.path}`;
  const images = (IMAGES[r.path] || [])
    .map(
      ([src, title]) =>
        `    <image:image>\n` +
        `      <image:loc>${SITE}${src}</image:loc>\n` +
        `      <image:title>${title}</image:title>\n` +
        `    </image:image>`,
    )
    .join('\n');

  return (
    `  <url>\n` +
    `    <loc>${loc}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${r.sitemap.changefreq}</changefreq>\n` +
    `    <priority>${r.sitemap.priority}</priority>\n` +
    (images ? images + '\n' : '') +
    `  </url>`
  );
});

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
  `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  urls.join('\n') +
  `\n</urlset>\n`;

const out = path.join(root, 'dist', 'sitemap.xml');
fs.writeFileSync(out, xml);
console.log(`  sitemap    ${urls.length} URLs -> dist/sitemap.xml`);
