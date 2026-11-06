/**
 * Capturas locais das fixtures sintéticas do trimestral, sem abrir navegador
 * autenticado nem publicar. A saída em output/ não é enviada automaticamente.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const dir = resolve('output/trimestral-etapa4');
const candidatos = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const navegador = candidatos.find(x => existsSync(x));
if (!navegador) throw new Error('Navegador headless local não encontrado.');
for (const alvo of ['pagina','painel','revisao']) {
  const html = join(dir, alvo + '.html');
  const css = ['src/reports/report.css', ...(alvo === 'pagina' ? [] : ['src/painel/painel.css'])].map(a => readFileSync(a, 'utf8')).join('\n');
  const texto = readFileSync(html,'utf8');
  const pronto = texto.replace('<body>', '<style>' + css + '</style><body>');
  const visual = join(dir, alvo + '-com-estilo.html');
  writeFileSync(visual, pronto);
  const destino = join(dir, alvo + '.png');
  const perfil = join(dir, 'chrome-temp-' + alvo);
  mkdirSync(perfil, {recursive:true});
  const args = [
    '--headless=new','--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--hide-scrollbars',
    '--allow-file-access-from-files',
    '--user-data-dir=' + perfil, '--window-size=1450,1050',
    '--screenshot=' + destino,
    pathToFileURL(visual).href,
  ];
  const r=spawnSync(navegador,args,{encoding:'utf8',timeout:60000});
  if(r.status!==0 || !existsSync(destino)) {
    throw new Error(alvo+' screenshot falhou: '+r.status+' '+String(r.stderr).slice(-900));
  }
  console.log(destino);
}
