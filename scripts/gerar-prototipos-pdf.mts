import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { renderToFile } from '@react-pdf/renderer';

import { aviarte202607 } from '../src/reports/fixtures/aviarte-2026-07';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07';
import { zenun202607 } from '../src/reports/fixtures/zenun-2026-07';
import RelatorioPdf, { registrarFontesDoRelatorioPdf } from '../src/reports/pdf/RelatorioPdf';

const raiz = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pastaSaida = path.join(raiz, 'output', 'pdf');
const pastaFontes = path.join(raiz, 'node_modules', '@expo-google-fonts', 'red-hat-display');

registrarFontesDoRelatorioPdf({
  regular: path.join(pastaFontes, '400Regular', 'RedHatDisplay_400Regular.ttf'),
  medium: path.join(pastaFontes, '500Medium', 'RedHatDisplay_500Medium.ttf'),
  bold: path.join(pastaFontes, '700Bold', 'RedHatDisplay_700Bold.ttf'),
});

await mkdir(pastaSaida, { recursive: true });

const prototipos = [
  { nome: 'Dacora-Dr-Flavio-Zenun-2026-07-v1-prototipo.pdf', snapshot: zenun202607 },
  { nome: 'Dacora-Karyne-Magalhaes-2026-07-v1-prototipo.pdf', snapshot: karyneMontada202607 },
  { nome: 'Dacora-Aviarte-2026-07-v1-prototipo.pdf', snapshot: aviarte202607 },
] as const;

for (const prototipo of prototipos) {
  const destino = path.join(pastaSaida, prototipo.nome);
  await renderToFile(RelatorioPdf({ snapshot: prototipo.snapshot }), destino);
  console.log(destino);
}
