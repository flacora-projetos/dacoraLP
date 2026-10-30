/**
 * Gera, em `output/pdf/`, o PDF dos relatórios de demonstração — pelo MESMO
 * caminho do servidor (`gerarPdfDoRelatorio`), para conferência visual.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { aviarte202607 } from '../src/reports/fixtures/aviarte-2026-07';
import { karyneMontada202607 } from '../src/reports/fixtures/karyne-montada-2026-07';
import { zenun202607 } from '../src/reports/fixtures/zenun-2026-07';
import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf';

const raiz = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pastaSaida = path.join(raiz, 'output', 'pdf');
await mkdir(pastaSaida, { recursive: true });

const prototipos = [
  { nome: 'Dacora-Dr-Flavio-Zenun-2026-07-prototipo.pdf', snapshot: zenun202607 },
  { nome: 'Dacora-Karyne-Magalhaes-2026-07-prototipo.pdf', snapshot: karyneMontada202607 },
  { nome: 'Dacora-Aviarte-2026-07-prototipo.pdf', snapshot: aviarte202607 },
  { nome: 'Allgrotech-Karyne-Magalhaes-2026-07-prototipo.pdf', snapshot: { ...karyneMontada202607, identidade: { ...karyneMontada202607.identidade, carteira: 'ALLGROTECH' } } },
] as const;

for (const prototipo of prototipos) {
  const destino = path.join(pastaSaida, prototipo.nome);
  await writeFile(destino, await gerarPdfDoRelatorio({ snapshot: prototipo.snapshot as any, imagens: new Map() }));
  console.log(destino);
}
