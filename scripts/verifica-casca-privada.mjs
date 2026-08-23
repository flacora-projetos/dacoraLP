/**
 * Prova, no artefato REALMENTE construído, que as rotas privadas recebem uma
 * casca limpa — e que o site institucional não perdeu nada no caminho.
 *
 * Roda dentro de `npm run build`, logo depois do `prerender`, porque o que
 * importa aqui é o arquivo que vai ao ar, não a intenção do código-fonte.
 *
 * ⚠️ As duas metades são igualmente importantes. Sem a prova NEGATIVA sobre
 * `dist/index.html`, "zero rastreador" passaria verde no dia em que alguém
 * quebrasse a pré-renderização da home e os dois arquivos virassem cascas
 * vazias. Sem a prova de que a casca ainda carrega o app, "zero rastreador"
 * passaria verde numa página em branco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const falhas = [];
const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };

const RASTREADORES = [
  'googletagmanager',
  'gtag(',
  'connect.facebook.net',
  'fbq(',
  'facebook.com/tr',
];

/* ---------- 1. A casca das rotas privadas ---------- */

const caminhoCasca = path.join(dist, 'app.html');
exigir(fs.existsSync(caminhoCasca), 'dist/app.html não foi gerado pelo prerender.');

if (fs.existsSync(caminhoCasca)) {
  const casca = fs.readFileSync(caminhoCasca, 'utf-8');

  exigir(
    casca.includes('<div id="root"></div>'),
    'A casca precisa entregar #root VAZIO — é o conteúdo pré-renderizado dentro dele que pintava a home antes do painel.',
  );

  for (const rastreador of RASTREADORES) {
    exigir(
      !casca.includes(rastreador),
      `A casca das rotas privadas não pode carregar "${rastreador}" (decisão do PO em 2026-08-20).`,
    );
  }

  exigir(
    !casca.includes('hero-trafego-pago'),
    'A casca não pode dar preload na imagem do banner institucional: ela competia com o código do relatório.',
  );

  exigir(/noindex/.test(casca), 'A casca precisa declarar noindex.');

  /* Sem isto, "zero rastreador" seria satisfeito por uma página em branco. */
  exigir(
    /<script[^>]+type="module"[^>]+src="\/assets\/[^"]+\.js"/.test(casca),
    'A casca precisa carregar o bundle do app — senão ela é só uma página vazia.',
  );
  exigir(
    /<link[^>]+rel="stylesheet"[^>]+href="\/assets\/[^"]+\.css"/.test(casca),
    'A casca precisa carregar o CSS do app.',
  );
}

/* ---------- 2. Prova negativa: a home NÃO virou casca ---------- */

const caminhoHome = path.join(dist, 'index.html');
exigir(fs.existsSync(caminhoHome), 'dist/index.html não existe.');

if (fs.existsSync(caminhoHome)) {
  const home = fs.readFileSync(caminhoHome, 'utf-8');

  exigir(
    !home.includes('<div id="root"></div>'),
    'A home precisa continuar pré-renderizada: é dela que os crawlers de IA leem o site sem executar JavaScript.',
  );
  for (const rastreador of ['googletagmanager', 'connect.facebook.net']) {
    exigir(home.includes(rastreador), `A home deveria manter "${rastreador}" — a remoção vale só para as rotas privadas.`);
  }
  exigir(
    home.includes('hero-trafego-pago'),
    'A home deveria manter o preload do banner (é a imagem LCP dela).',
  );
}

/* ---------- 3. O roteamento aponta as rotas privadas para a casca ---------- */

const rotas = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'vercel.json'), 'utf-8'),
).routes;

const indiceFilesystem = rotas.findIndex((rota) => rota.handle === 'filesystem');
const indiceCoringa = rotas.findIndex((rota) => rota.src === '/(.*)' && rota.dest === '/index.html');
exigir(indiceFilesystem >= 0, 'vercel.json perdeu o handle de filesystem.');
exigir(indiceCoringa >= 0, 'vercel.json perdeu a regra final para /index.html.');

for (const alvo of ['/painel-de-relatorios(/.*)?', '/data-hub(/.*)?', '/relatorios/(.*)']) {
  const indice = rotas.findIndex((rota) => rota.src === alvo && rota.dest === '/app.html');
  exigir(indice >= 0, `vercel.json precisa mandar "${alvo}" para /app.html, senão a rota volta a receber a home inteira.`);
  if (indice >= 0) {
    exigir(indice > indiceFilesystem, `A regra de "${alvo}" precisa vir DEPOIS do handle de filesystem.`);
    exigir(indice < indiceCoringa, `A regra de "${alvo}" precisa vir ANTES da regra final, senão nunca é alcançada.`);
  }
}

if (falhas.length > 0) {
  console.error('\n  verifica:casca — REPROVADO\n');
  for (const falha of falhas) console.error(`   • ${falha}`);
  console.error('');
  process.exit(1);
}

console.log('  casca      rotas privadas sem home, sem rastreador e com o app carregando — ok');
