/**
 * Carrega um snapshot mensal para a tabela `public.relatorios` — fase A da P1.
 *
 *   npm run carrega:relatorio -- "<caminho do snapshot>.json"
 *   npm run carrega:relatorio -- "<caminho>.json" --simular
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE ESTE ARQUIVO EXISTE PARA NÃO DEIXAR QUEBRAR
 *
 * O snapshot tem números reais de cliente e este repositório é PÚBLICO. O
 * arquivo é LIDO de fora do repositório, mandado para o banco, e fica por lá.
 * Ele nunca é copiado para dentro, nem como fixture, nem como teste, nem como
 * exemplo — por isso o script recusa qualquer caminho que esteja dentro do
 * repositório, em vez de confiar em quem vier depois lembrar disso.
 * ---------------------------------------------------------------------------
 *
 * O que este script NÃO faz, de propósito: ele não confere competência, nem
 * tamanho de token, nem versão repetida. Essas regras já são RESTRIÇÃO da
 * tabela, e reimplementá-las aqui criaria uma segunda fonte de verdade que
 * diverge da primeira no dia em que alguém mudar uma das duas. Quando o banco
 * recusa, o script mostra a recusa dele, inteira.
 *
 * A única conferência própria é a do checksum, e ela não duplica regra
 * nenhuma: recalcula a impressão digital a partir do conteúdo que vai ser
 * gravado e compara com a que veio no arquivo. Se divergirem, o que seria
 * gravado não é o que foi apurado, e aí gravar é pior que falhar.
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Mesma ordem do `server.ts`: `.env.local` primeiro, porque `dotenv` sozinho lê
// só `.env` e `.env.local` é convenção do Vite. Quem vem antes ganha.
dotenv.config({ path: ['.env.local', '.env'] });

const RAIZ_DO_REPOSITORIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function morrer(mensagem: string): never {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Argumentos                                                          */
/* ------------------------------------------------------------------ */

const argumentos = process.argv.slice(2);
const simular = argumentos.includes('--simular');
const caminhoInformado = argumentos.find((a) => !a.startsWith('--'));

if (!caminhoInformado) {
  morrer(
    'Falta o caminho do snapshot.\n\n' +
      '  npm run carrega:relatorio -- "C:\\caminho\\para\\cliente-2026-07.json"\n\n' +
      'Use --simular para conferir o arquivo sem gravar nada no banco.',
  );
}

const caminho = path.resolve(caminhoInformado);

// O guard do repositório público. `path.relative` sem `..` no começo quer dizer
// "está dentro".
const relativoAoRepo = path.relative(RAIZ_DO_REPOSITORIO, caminho);
if (!relativoAoRepo.startsWith('..') && !path.isAbsolute(relativoAoRepo)) {
  morrer(
    'Este snapshot está DENTRO do repositório, e ele não pode estar.\n\n' +
      'Os relatórios têm números reais de cliente e este repositório é público.\n' +
      'Aponte para o arquivo no lugar de origem (a pasta `out/relatorios/` da\n' +
      'fábrica) e apague a cópia que ficou aqui dentro.',
  );
}

/* ------------------------------------------------------------------ */
/* O arquivo                                                           */
/* ------------------------------------------------------------------ */

let snapshot: Record<string, any>;
try {
  snapshot = JSON.parse(readFileSync(caminho, 'utf8'));
} catch (err) {
  morrer(`Não consegui ler o snapshot em ${caminho}.\n${err instanceof Error ? err.message : err}`);
}

const { publicacao, ...conteudo } = snapshot;
const identidade = conteudo.identidade ?? {};

if (!identidade.clienteSlug || !identidade.competencia) {
  morrer('O arquivo não parece um snapshot de relatório: falta `identidade.clienteSlug` ou `identidade.competencia`.');
}
if (!publicacao?.checksum) {
  morrer('O arquivo não traz `publicacao.checksum`. O checksum é gerado pela fábrica; sem ele não há o que gravar.');
}

/**
 * O `conteudo` que vai para o banco é o snapshot SEM o bloco `publicacao`.
 *
 * Não é economia de espaço: `publicacao` é o ENVELOPE (estado, versão,
 * checksum, quem aprovou, quando enviou), e o envelope são as colunas da
 * tabela. Guardar uma segunda cópia dele dentro do `conteudo` — que é imutável
 * por gatilho — criaria um "estado: gerado" congelado para sempre dentro de um
 * relatório que amanhã estará aprovado e enviado. Duas respostas para a mesma
 * pergunta, e a de dentro sempre errada.
 *
 * É também exatamente o objeto que o checksum cobre, conferido abaixo.
 */
function checksumDe(alvo: Record<string, any>): string {
  // O `coletadoEm` de cada fonte sai antes da conta — é o que a fábrica faz, e
  // pelo mesmo motivo: com ele dentro, duas gerações do mesmo mês com os mesmos
  // números dariam checksums diferentes, e o checksum passaria a responder "foi
  // gerado noutro instante?" em vez de "o relatório mudou?".
  const semCarimbo = {
    ...alvo,
    fontes: (alvo.fontes ?? []).map(({ coletadoEm, ...resto }: any) => resto),
  };
  return createHash('sha256').update(JSON.stringify(semCarimbo)).digest('hex').slice(0, 32);
}

const checksumRecalculado = checksumDe(conteudo);
if (checksumRecalculado !== publicacao.checksum) {
  morrer(
    'O checksum do arquivo não bate com o conteúdo dele.\n\n' +
      `  no arquivo:   ${publicacao.checksum}\n` +
      `  recalculado:  ${checksumRecalculado}\n\n` +
      'Ou o arquivo foi editado à mão depois de gerado, ou a forma de calcular\n' +
      'mudou na fábrica. Nos dois casos, gerar de novo é mais seguro que gravar.',
  );
}

/**
 * O token É a credencial de acesso do relatório: não há login, quem tem o link
 * vê. Por isso ele é sorteado, e **nunca** derivado do nome, do slug ou da
 * competência — se derivasse, o link de um cliente entregaria os outros 45 por
 * adivinhação. 32 bytes de aleatoriedade viram 43 caracteres em base64url, bem
 * acima do mínimo de 32 que a tabela exige.
 */
function sortearToken(): string {
  return randomBytes(32).toString('base64url');
}

const linha = {
  cliente_slug: identidade.clienteSlug,
  competencia: identidade.competencia,
  versao: publicacao.versao ?? 1,
  token: sortearToken(),
  conteudo,
  checksum: publicacao.checksum,
  estado: publicacao.estado ?? 'gerado',
  // A data de geração é a da fábrica, não a de agora: o relatório foi apurado
  // quando foi apurado, e a hora em que alguém rodou a carga não é fato do
  // relatório.
  ...(publicacao.geradoEm ? { gerado_em: publicacao.geradoEm } : {}),
};

console.log('\nRelatório lido do arquivo:');
console.log(`  cliente      ${identidade.clienteNome ?? '(sem nome)'} (${linha.cliente_slug})`);
console.log(`  competência  ${linha.competencia}, versão ${linha.versao}, estado "${linha.estado}"`);
console.log(`  checksum     ${linha.checksum} (recalculado do conteúdo, confere)`);
console.log(`  conteúdo     ${JSON.stringify(conteudo).length.toLocaleString('pt-BR')} caracteres`);
// O token nunca sai inteiro em log: ele é a credencial do cliente, e log é o
// lugar mais fácil do mundo de vazar uma.
console.log(`  token        sorteado, ${linha.token.length} caracteres (começa em ${linha.token.slice(0, 4)}…)`);

if (simular) {
  console.log('\n— simulação — nada foi gravado no banco.\n');
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* O banco                                                             */
/* ------------------------------------------------------------------ */

const urlSupabase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!urlSupabase) {
  morrer('Falta `SUPABASE_URL` (ou `VITE_SUPABASE_URL`) no `.env.local`.');
}
if (!chaveDeServico) {
  morrer(
    'Falta `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.\n\n' +
      'Onde pegar: Supabase → projeto Dácora Reports → Project Settings → API →\n' +
      'a chave `service_role` (a secreta, não a `anon`).\n\n' +
      'Onde colar: no arquivo `.env.local` na raiz deste projeto, numa linha\n' +
      '`SUPABASE_SERVICE_ROLE_KEY=...`.\n\n' +
      'Ela NUNCA leva `VITE_` na frente: tudo que começa com `VITE_` é embutido\n' +
      'na página e qualquer visitante consegue ler. Com essa chave no navegador,\n' +
      'qualquer visitante leria os relatórios de todos os clientes.',
  );
}

const cabecalhos = {
  apikey: chaveDeServico,
  Authorization: `Bearer ${chaveDeServico}`,
  'Content-Type': 'application/json',
};

const resposta = await fetch(`${urlSupabase}/rest/v1/relatorios`, {
  method: 'POST',
  headers: { ...cabecalhos, Prefer: 'return=representation' },
  body: JSON.stringify(linha),
});

const corpo = await resposta.text();

if (!resposta.ok) {
  // A recusa do banco vai INTEIRA para a tela. Traduzir aqui viraria a segunda
  // fonte de verdade que este script existe para não criar — e a mensagem do
  // Postgres diz qual restrição recusou, que é a informação que interessa.
  morrer(
    `O banco recusou a gravação (HTTP ${resposta.status}).\n\n${corpo}\n\n` +
      'Se a recusa foi por versão repetida, o mês já está gravado: corrigir um\n' +
      'relatório publicado gera versão NOVA, nunca sobrescreve a anterior.',
  );
}

const gravado = JSON.parse(corpo)[0];
console.log(`\n✔ Gravado. id ${gravado.id}`);

/* ------------------------------------------------------------------ */
/* A leitura de volta                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ler de volta não é zelo: é a única prova de que o que está no banco é o que
 * saiu daqui. `INSERT` que responde 201 e grava outra coisa é raro, mas a
 * conferência custa uma chamada e responde a pergunta que ninguém quer estar
 * fazendo depois de o cliente ter aberto o link.
 */
const conferencia = await fetch(
  `${urlSupabase}/rest/v1/relatorios?id=eq.${gravado.id}&select=cliente_slug,competencia,versao,estado,checksum,gerado_em,conteudo`,
  { headers: cabecalhos },
);

if (!conferencia.ok) {
  morrer(`Gravou, mas não consegui ler de volta (HTTP ${conferencia.status}).\n${await conferencia.text()}`);
}

const [devolvido] = (await conferencia.json()) as any[];
if (!devolvido) morrer('Gravou, mas a leitura de volta não encontrou a linha.');

const checksumDoQueVoltou = checksumDe(devolvido.conteudo);
const confere =
  devolvido.cliente_slug === linha.cliente_slug &&
  devolvido.competencia === linha.competencia &&
  devolvido.versao === linha.versao &&
  devolvido.checksum === linha.checksum &&
  checksumDoQueVoltou === linha.checksum;

console.log('\nLido de volta do banco:');
console.log(`  ${devolvido.cliente_slug} · ${devolvido.competencia} · versão ${devolvido.versao} · ${devolvido.estado}`);
console.log(`  checksum da coluna:              ${devolvido.checksum}`);
console.log(`  checksum recalculado do conteúdo: ${checksumDoQueVoltou}`);

if (!confere) {
  morrer('O que voltou do banco NÃO é o que foi mandado. Não use este relatório.');
}

console.log('\n✔ Confere: o que está no banco é o mesmo relatório que saiu do arquivo.\n');
