/**
 * Envia uma proposta para o bucket privado e cria (ou mantém) a senha dela.
 *
 * node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --guardar-senha <arquivo.env>
 * node --env-file=.env.local scripts/propostas-subir.mjs <endereco> <pagina.html> --manter-senha
 *
 * A senha nunca aparece na tela: fica só no arquivo indicado, fora do Git, na
 * linha PROPOSTA_SENHA_<ENDERECO>. No bucket vai apenas o resumo dela.
 */
import { randomBytes, randomInt, scrypt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

const derivar = promisify(scrypt);
const [endereco, arquivo, opcao, destino] = process.argv.slice(2);
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'propostas';

function parar(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(endereco ?? '')) parar('Endereço inválido: use letras minúsculas, números e hífen.');
if (!arquivo || !existsSync(arquivo)) parar('Arquivo da proposta não encontrado.');
if (opcao !== '--manter-senha' && !(opcao === '--guardar-senha' && destino)) parar('Indique --guardar-senha <arquivo.env> ou --manter-senha.');
if (!url || !chave) parar('Faltam a URL do Supabase ou a chave de serviço.');

const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };

async function garantirBucketPrivado() {
  const criar = await fetch(new URL('/storage/v1/bucket', url), {
    method: 'POST',
    headers: { ...cabecalhos, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  const leitura = await fetch(new URL(`/storage/v1/bucket/${BUCKET}`, url), { headers: cabecalhos });
  if (!leitura.ok) parar(`Não foi possível criar o bucket (HTTP ${criar.status}).`);
  if ((await leitura.json()).public !== false) parar('O bucket não está privado. Nada foi enviado.');
}

async function enviar(nome, conteudo, tipo) {
  const resposta = await fetch(new URL(`/storage/v1/object/${BUCKET}/${endereco}/${nome}`, url), {
    method: 'POST',
    headers: { ...cabecalhos, 'Content-Type': tipo, 'x-upsert': 'true' },
    body: conteudo,
  });
  if (!resposta.ok) parar(`Falha ao enviar ${nome} (HTTP ${resposta.status}).`);
}

function gerarSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bloco = () => Array.from({ length: 5 }, () => letras[randomInt(letras.length)]).join('');
  return [bloco(), bloco(), bloco()].join('-');
}

function guardarSenha(senha) {
  const nome = `PROPOSTA_SENHA_${endereco.toUpperCase().replaceAll('-', '_')}`;
  const atual = existsSync(destino) ? readFileSync(destino, 'utf8') : '';
  const linhas = atual.split(/\r?\n/).filter(linha => linha && !linha.startsWith(`${nome}=`));
  writeFileSync(destino, `${[...linhas, `${nome}=${senha}`].join('\n')}\n`);
  console.log(`Senha guardada em ${nome}.`);
}

await garantirBucketPrivado();
await enviar('pagina.html', readFileSync(arquivo), 'text/html; charset=utf-8');
if (opcao === '--guardar-senha') {
  const senha = gerarSenha();
  const sal = randomBytes(16);
  const hash = await derivar(senha.normalize('NFKC'), sal, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  await enviar('acesso.json', JSON.stringify({ sal: sal.toString('hex'), hash: hash.toString('hex') }), 'application/json');
  guardarSenha(senha);
}
console.log(`Proposta enviada: /propostas/${endereco}`);
