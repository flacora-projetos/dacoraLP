/**
 * `/propostas/<endereço>`: proposta comercial com senha própria.
 *
 * O repositório é PÚBLICO. Por isso nenhuma proposta entra no Git nem em
 * `public/`: a página e o resumo da senha ficam no bucket privado `propostas`
 * do Supabase (`<endereço>/pagina.html` e `<endereço>/acesso.json`), enviados
 * por `scripts/propostas-subir.mjs`. Proposta nova não precisa de publicação.
 *
 * Endereço inexistente e senha errada respondem igual, para que a tela não
 * revele quais propostas existem. A falta de configuração falha fechado.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const BUCKET = 'propostas';
const ENDERECO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALIDADE_SEGUNDOS = 60 * 60 * 24 * 30;
const CUSTO = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TAMANHO_CHAVE = 32;

export interface AcessoProposta {
  sal: string;
  hash: string;
  /** Logins aceitos, em minúsculas. Sem a lista, vale o próprio endereço. */
  logins?: string[];
}

export interface DependenciasPropostas {
  baixarAcesso?: (endereco: string) => Promise<AcessoProposta | null>;
  baixarPagina?: (endereco: string) => Promise<string | null>;
  chaveDeServico?: string;
  agora?: () => Date;
}

function derivar(senha: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scrypt(senha.normalize('NFKC'), sal, TAMANHO_CHAVE, CUSTO, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave)));
  });
}

export async function resumirSenha(senha: string): Promise<AcessoProposta> {
  const sal = randomBytes(16);
  return { sal: sal.toString('hex'), hash: (await derivar(senha, sal)).toString('hex') };
}

async function senhaConfere(senha: string, acesso: AcessoProposta | null): Promise<boolean> {
  // Sem proposta, faz o mesmo cálculo: o tempo de resposta não pode denunciar o endereço.
  const sal = acesso ? Buffer.from(acesso.sal, 'hex') : Buffer.alloc(16);
  const esperado = acesso ? Buffer.from(acesso.hash, 'hex') : Buffer.alloc(TAMANHO_CHAVE);
  const calculado = await derivar(senha, sal);
  return Boolean(acesso) && esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

function assinar(endereco: string, expira: number, acesso: AcessoProposta, chave: string) {
  return createHmac('sha256', chave).update(`${endereco}.${expira}.${acesso.hash}`).digest('hex');
}

function nomeDoCookie(endereco: string) {
  return `proposta_${endereco}`;
}

function lerCookie(cabecalho: unknown, nome: string) {
  if (typeof cabecalho !== 'string') return null;
  for (const parte of cabecalho.split(';')) {
    const separador = parte.indexOf('=');
    if (separador > 0 && parte.slice(0, separador).trim() === nome) return parte.slice(separador + 1).trim();
  }
  return null;
}

function cookieValido(valor: string | null, endereco: string, acesso: AcessoProposta, chave: string, agora: Date) {
  if (!valor) return false;
  const [texto, assinatura] = valor.split('.');
  const expira = Number(texto);
  if (!Number.isInteger(expira) || expira * 1000 <= agora.getTime() || !assinatura) return false;
  const esperado = Buffer.from(assinar(endereco, expira, acesso, chave));
  const recebido = Buffer.from(assinatura);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

function lerCampo(corpo: unknown, nome: 'login' | 'senha') {
  const valor = typeof corpo === 'string' ? new URLSearchParams(corpo).get(nome) : (corpo as Record<string, unknown> | null | undefined)?.[nome];
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 200 ? valor : null;
}

function loginAceito(login: string | null, endereco: string, acesso: AcessoProposta | null) {
  return Boolean(login && acesso) && (acesso!.logins ?? [endereco]).includes(login!.trim().toLowerCase());
}

function criarBaixador(url: string, chave: string) {
  return async (caminho: string) => {
    const resposta = await fetch(new URL(`/storage/v1/object/authenticated/${BUCKET}/${caminho}`, url), {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    });
    if (resposta.status === 400 || resposta.status === 404) return null;
    if (!resposta.ok) throw new Error(`Storage respondeu HTTP ${resposta.status}.`);
    return resposta.text();
  };
}

function telaDeSenha(endereco: string, situacao: 'pedir' | 'errada' | 'indisponivel') {
  const destino = ENDERECO.test(endereco) ? `/propostas/${endereco}` : '/propostas/';
  const aviso = situacao === 'errada'
    ? '<p class="aviso" role="alert">Login ou senha incorretos. Confira os dados recebidos da Dácora e tente de novo.</p>'
    : situacao === 'indisponivel'
      ? '<p class="aviso" role="alert">Não foi possível abrir a proposta agora. Tente de novo em alguns minutos.</p>'
      : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="theme-color" content="#014029">
<title>Proposta privada · Dácora</title>
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;700;800&family=Red+Hat+Mono:wght@400;500&display=swap">
<style>
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:#014029;color:#FFFEFA;font-family:"Red Hat Display",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{min-height:100%;max-width:520px;margin:0 auto;padding:max(40px,env(safe-area-inset-top)) 20px max(40px,env(safe-area-inset-bottom));display:flex;flex-direction:column;justify-content:center;gap:28px}
.marca{font-family:"Red Hat Mono",ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:#B9D3C4}
.marca b{color:#FFFEFA;font-weight:500}
h1{margin:0;font-size:clamp(34px,8vw,48px);line-height:1.05;font-weight:800;letter-spacing:-.015em;text-wrap:balance}
form{display:flex;flex-direction:column;gap:10px}
label{font-size:15px;color:#B9D3C4}
input{width:100%;height:54px;padding:0 16px;font:500 18px "Red Hat Display",system-ui,sans-serif;color:#0D1F18;background:#FFFEFA;border:2px solid #FFFEFA;border-radius:2px}
.entrar{height:54px;margin-top:6px;font:700 17px "Red Hat Display",system-ui,sans-serif;color:#014029;background:#CFE3D7;border:0;border-radius:2px;cursor:pointer;touch-action:manipulation;transition:background-color .15s ease}
.entrar:hover{background:#FFFEFA}
.campo-senha{position:relative}
.campo-senha input{padding-right:56px}
.ver{position:absolute;top:5px;right:5px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;padding:0;color:#014029;background:transparent;border:0;border-radius:2px;cursor:pointer;touch-action:manipulation;transition:background-color .15s ease}
.ver:hover{background:#E7E2DB}
.ver[hidden]{display:none}
.ver svg[hidden]{display:none}
input:focus-visible,.entrar:focus-visible,.ver:focus-visible{outline:3px solid #6CC497;outline-offset:2px}
.aviso{margin:0;padding:12px 14px;font-size:15px;line-height:1.4;background:#FFFEFA;color:#7A1F1F;border-radius:2px}
.ajuda{margin:0;font-size:14px;line-height:1.5;color:#B9D3C4}
</style>
</head>
<body>
<main>
  <span class="marca"><b>Dácora</b> · Proposta privada</span>
  <h1>Entre para abrir a proposta</h1>
  ${aviso}
  <form method="post" action="${destino}">
    <label for="login">Login</label>
    <input id="login" name="login" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="200" autofocus>
    <label for="senha">Senha</label>
    <div class="campo-senha">
      <input id="senha" name="senha" type="password" autocomplete="current-password" required maxlength="200">
      <button class="ver" id="ver-senha" type="button" aria-label="Mostrar senha" aria-pressed="false" hidden><svg class="olho" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="risco" hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.1 3.9M6.5 6.5C3.7 8.3 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.5-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>
    </div>
    <button class="entrar" type="submit">Abrir proposta</button>
  </form>
  <p class="ajuda">Não recebeu o acesso? Fale com quem enviou a proposta na Dácora.</p>
</main>
<script>
(function () {
  var campo = document.getElementById('senha');
  var botao = document.getElementById('ver-senha');
  botao.hidden = false;
  botao.addEventListener('click', function () {
    var mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.setAttribute('aria-pressed', String(mostrar));
    botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    botao.querySelector('.olho').toggleAttribute('hidden', mostrar);
    botao.querySelector('.risco').toggleAttribute('hidden', !mostrar);
    campo.focus();
  });
  campo.form.addEventListener('submit', function () { campo.type = 'password'; });
})();
</script>
</body>
</html>
`;
}

export async function atenderPropostas(req: Request, res: Response, dependencias: DependenciasPropostas = {}) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    return res.status(405).send('');
  }

  const endereco = typeof req.query?.slug === 'string' ? req.query.slug : '';
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const chave = dependencias.chaveDeServico ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const agora = dependencias.agora?.() ?? new Date();

  try {
    if (!chave || (!url && !dependencias.baixarAcesso)) throw new Error('faltam URL ou service role');
    const baixar = url ? criarBaixador(url, chave) : null;
    const baixarAcesso = dependencias.baixarAcesso ?? (async (alvo: string) => {
      const texto = await baixar!(`${alvo}/acesso.json`);
      return texto ? (JSON.parse(texto) as AcessoProposta) : null;
    });
    const baixarPagina = dependencias.baixarPagina ?? ((alvo: string) => baixar!(`${alvo}/pagina.html`));
    const acesso = ENDERECO.test(endereco) ? await baixarAcesso(endereco) : null;

    if (req.method === 'POST') {
      const senha = lerCampo(req.body, 'senha');
      const senhaOk = senha ? await senhaConfere(senha, acesso) : false;
      if (!senhaOk || !loginAceito(lerCampo(req.body, 'login'), endereco, acesso) || !acesso) {
        return res.status(401).send(telaDeSenha(endereco, 'errada'));
      }
      const expira = Math.floor(agora.getTime() / 1000) + VALIDADE_SEGUNDOS;
      const valor = `${expira}.${assinar(endereco, expira, acesso, chave)}`;
      res.setHeader('Set-Cookie', `${nomeDoCookie(endereco)}=${valor}; Path=/propostas/${endereco}; Max-Age=${VALIDADE_SEGUNDOS}; HttpOnly; Secure; SameSite=Lax`);
      res.setHeader('Location', `/propostas/${endereco}`);
      return res.status(303).send('');
    }

    if (acesso && cookieValido(lerCookie(req.headers.cookie, nomeDoCookie(endereco)), endereco, acesso, chave, agora)) {
      const pagina = await baixarPagina(endereco);
      if (pagina) return res.status(200).send(pagina);
      throw new Error('proposta sem página');
    }
    return res.status(200).send(telaDeSenha(endereco, 'pedir'));
  } catch (erro) {
    console.error('[propostas] Falha ao abrir:', erro instanceof Error ? erro.message : 'erro_desconhecido');
    return res.status(503).send(telaDeSenha(endereco, 'indisponivel'));
  }
}
