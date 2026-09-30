/**
 * Gera `src/reports/pdf/recursos-embutidos.ts` a partir das fontes e dos logos.
 *
 * O PDF é montado numa função do servidor (Vercel). Ali não há navegador para
 * baixar fonte, e arquivo solto ao lado da função depende de o empacotador
 * lembrar de levá-lo — se esquecer, a fonte some em silêncio e o PDF sai com a
 * letra padrão. Embutir em código elimina essa dependência: se o módulo
 * carregou, a fonte e o logo estão lá.
 *
 * Rode depois de trocar qualquer arquivo em `src/reports/pdf/marcas/`:
 *   node scripts/gerar-recursos-pdf.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontes = path.join(raiz, 'node_modules', '@expo-google-fonts', 'red-hat-display');
const marcas = path.join(raiz, 'src', 'reports', 'pdf', 'marcas');

const dataUri = (arquivo, tipo) => `data:${tipo};base64,${readFileSync(arquivo).toString('base64')}`;

const recursos = {
  FONTE_400: dataUri(path.join(fontes, '400Regular', 'RedHatDisplay_400Regular.ttf'), 'font/ttf'),
  FONTE_500: dataUri(path.join(fontes, '500Medium', 'RedHatDisplay_500Medium.ttf'), 'font/ttf'),
  FONTE_700: dataUri(path.join(fontes, '700Bold', 'RedHatDisplay_700Bold.ttf'), 'font/ttf'),
  FONTE_900: dataUri(path.join(fontes, '900Black', 'RedHatDisplay_900Black.ttf'), 'font/ttf'),
  LOGO_ALLGROTECH: dataUri(path.join(marcas, 'allgrotech-horizontal.png'), 'image/png'),
  LOGO_ALLGROTECH_CLARO: dataUri(path.join(marcas, 'allgrotech-horizontal-claro.png'), 'image/png'),
  SIMBOLO_ALLGROTECH: dataUri(path.join(marcas, 'allgrotech-simbolo.png'), 'image/png'),
};

const corpo = [
  '/* ARQUIVO GERADO por scripts/gerar-recursos-pdf.mjs — não edite à mão. */',
  '/* eslint-disable */',
  ...Object.entries(recursos).map(([nome, valor]) => `export const ${nome} = ${JSON.stringify(valor)};`),
  '',
].join('\n');

const destino = path.join(raiz, 'src', 'reports', 'pdf', 'recursos-embutidos.ts');
writeFileSync(destino, corpo);
console.log(destino, `${Math.round(corpo.length / 1024)} KB`);
