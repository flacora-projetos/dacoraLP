/**
 * Desenha o PDF do RELATÓRIO ANUAL com o MESMO gerador do mensal
 * (`gerarPdfDoRelatorio`), a partir do pacote montado pela fábrica
 * (`OpenClaw-Dacora/scripts/gerar-relatorio-anual.js`). Roteiro completo:
 * `OpenClaw-Dacora/.claude/skills/relatorio-anual/SKILL.md`.
 *
 *   npx tsx --env-file=<.env.local do portal> --import ./scripts/_registra-css-vazio.mjs \
 *     scripts/gerar-pdf-anual.mts <pacote.json> <saida.pdf>
 *
 * O anual não passa pelo banco nem pela página pública: não há link, não há
 * aprovação no painel. Quem libera é o PO, lendo o PDF antes de ele ir para o
 * Drive. Por isso as miniaturas são baixadas aqui, direto do bucket privado,
 * com a chave de serviço (só leitura).
 *
 * O pacote traz `resumo` (frases do "Resumo do ano") e `analisesPublicadas`
 * (`{ secao: 'bloco:<id>', texto }`), escritas pela sessão depois de ler a
 * conferência da fábrica.
 */
import { readFile, writeFile } from 'node:fs/promises';

import { gerarPdfDoRelatorio } from '../src/reports/pdf/gerarPdf';

const [, , caminhoDoPacote, destino] = process.argv;
if (!caminhoDoPacote || !destino) {
  console.error('Uso: scripts/gerar-pdf-anual.mts <pacote.json> <saida.pdf>');
  process.exit(1);
}

const pacote = JSON.parse(await readFile(caminhoDoPacote, 'utf8'));
const snapshot = pacote.snapshot;
if (snapshot?.identidade?.produto !== 'anual_externo_cliente') {
  throw new Error('o pacote não é de um relatório anual');
}
snapshot.leitura = {
  ...snapshot.leitura,
  resumoExecutivo: (pacote.resumo ?? []).map((texto: string) => ({ texto, sustentadaPor: [] })),
};

const url = process.env.VITE_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error('faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (use --env-file com o .env.local do portal)');

type Imagem = { data: Buffer; format: 'jpg' | 'png' } | null;
const imagens = new Map<string, Imagem>();
let falhas = 0;
for (const ranking of Object.values<any>(snapshot.dados.rankingsCriativos ?? {})) {
  for (const criativo of ranking.criativos) {
    const src: string | undefined = criativo.miniatura?.src;
    if (!src || imagens.has(src)) continue;
    const caminho = src.replace(/^storage:\/\//, '');
    const resposta = await fetch(`${url}/storage/v1/object/${caminho}`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!resposta?.ok) { imagens.set(src, null); falhas += 1; continue; }
    const dados = Buffer.from(await resposta.arrayBuffer());
    const formato = dados[0] === 0xff && dados[1] === 0xd8 ? 'jpg' : dados[0] === 0x89 && dados[1] === 0x50 ? 'png' : null;
    imagens.set(src, formato ? { data: dados, format: formato } : null);
    if (!formato) falhas += 1;
  }
}

const pdf = await gerarPdfDoRelatorio({
  snapshot,
  analisesPublicadas: pacote.analisesPublicadas ?? [],
  observacoesPublicas: [],
  imagens,
});
await writeFile(destino, pdf);
const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`PDF gravado em ${destino}: ${paginas} páginas, ${pdf.length} bytes.`);
if (falhas) console.warn(`⚠️  ${falhas} miniatura(s) não baixaram; os cartões saem com o aviso de imagem indisponível.`);
