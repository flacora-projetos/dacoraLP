/**
 * Empacota o gerador do PDF num arquivo só: `api/_pdf-empacotado.js`.
 *
 * ⚠️ POR QUE EXISTE (29/09/2026): a Vercel compila cada arquivo de `api/` e o
 * que ele importa, mas NÃO compila `.tsx` — a primeira prévia do PDF caiu com
 * `ERR_MODULE_NOT_FOUND: .../RelatorioPdf.js`. O desenho do PDF é JSX, então
 * ele chega à função já empacotado, em JavaScript puro.
 *
 * O pacote é gerado aqui e VERSIONADO; `verifica:pdf-dedicado` reempacota e
 * compara, então um pacote que não bate com o código-fonte derruba o build.
 * Depois de mexer em qualquer arquivo de `src/reports/pdf/` ou nas marcas:
 *   node scripts/empacotar-pdf.mjs
 */
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DESTINO = path.join(raiz, 'api', '_pdf-empacotado.js');

export async function empacotar() {
  const resultado = await build({
    entryPoints: [path.join(raiz, 'src', 'reports', 'pdf', 'gerarPdf.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    jsx: 'automatic',
    write: false,
    legalComments: 'none',
    /* Bibliotecas ficam de fora: a Vercel as leva de node_modules. */
    packages: 'external',
    banner: { js: '/* ARQUIVO GERADO por scripts/empacotar-pdf.mjs a partir de src/reports/pdf/gerarPdf.ts — não edite à mão. */' },
  });
  return resultado.outputFiles[0].text.replace(/\r\n/g, '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const codigo = await empacotar();
  writeFileSync(DESTINO, codigo);
  console.log(DESTINO, `${Math.round(codigo.length / 1024)} KB`);
}
