/**
 * Efeitos da home (remodelação "manifesto", 16/11/2026 — opção 2 escolhida
 * pela Fernanda). Tudo aqui roda só no navegador, chamado de dentro de um
 * useEffect da Home: a versão pré-renderizada (a que buscadores e IAs leem)
 * continua com todo o texto, sem depender de JavaScript.
 *
 * Cada função devolve a sua limpeza. Os desenhos em canvas param quando saem
 * da tela ou a aba fica oculta, e nenhum anima sob "reduzir movimento".
 */

type Limpeza = () => void;

const menosMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const semMouse = () => window.matchMedia('(hover: none)').matches;

/* ------------------------------------------------------------------ */
/* Espetáculo: bando de leads no herói                                 */
/* ------------------------------------------------------------------ */

type Ponto = { x: number; y: number; vx: number; vy: number; a: number; r: number; u: number; c: string; s: number; f: number };

/** Ponto no contorno arredondado do botão, para o bando "abraçar" o botão. */
function pontoNoBotao(u: number, r: { left: number; top: number; width: number; height: number }, folga: number): [number, number] {
  const x0 = r.left - folga, y0 = r.top - folga, w = r.width + folga * 2, h = r.height + folga * 2;
  const rad = h / 2, reto = w - 2 * rad, per = 2 * reto + 2 * Math.PI * rad;
  let d = u * per;
  if (d < reto) return [x0 + rad + d, y0];
  d -= reto;
  if (d < Math.PI * rad) { const a = -Math.PI / 2 + d / rad; return [x0 + w - rad + Math.cos(a) * rad, y0 + rad + Math.sin(a) * rad]; }
  d -= Math.PI * rad;
  if (d < reto) return [x0 + w - rad - d, y0 + h];
  d -= reto;
  const b = Math.PI / 2 + d / rad;
  return [x0 + rad + Math.cos(b) * rad, y0 + rad + Math.sin(b) * rad];
}

export function iniciarBando(cv: HTMLCanvasElement, heroi: HTMLElement, cta: HTMLElement | null): Limpeza {
  const cx = cv.getContext('2d');
  if (!cx) return () => {};
  const reduz = menosMovimento();
  const toque = semMouse();
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const N = toque ? 320 : 760;
  const CEL = 22;
  const cores = ['#CFE3B8', '#A9D17E', '#8A9E95', '#F2EFEB'];
  let W = 0, H = 0, cols = 0, rows = 0, grade = new Float32Array(0);
  let P: Ponto[] = [];
  const mouse = { x: -1e4, y: -1e4, ativo: false, t: 0 };
  let alvoBotao: HTMLElement | null = null;
  let visivel = true, explosao = 0, t = 0, rodando = false, quadro = 0;

  const medir = () => {
    const r = heroi.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * DPR; cv.height = H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cols = Math.ceil(W / CEL); rows = Math.ceil(H / CEL);
    grade = new Float32Array(cols * rows);
  };
  const semear = () => {
    P = [];
    for (let k = 0; k < N; k++) {
      P.push({
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        a: Math.random() * 6.283, r: 40 + Math.random() * 170, u: Math.random(),
        c: cores[k % 7 === 0 ? 3 : k % 3], s: 1.8 + Math.random() * 2.2, f: 0.6 + Math.random() * 0.8,
      });
    }
  };

  const desenhar = () => {
    const agora = performance.now();
    const parado = !mouse.ativo || agora - mouse.t > 2600;
    const hx = parado ? W * (0.62 + 0.22 * Math.sin(t * 0.23)) : mouse.x;
    const hy = parado ? H * (0.42 + 0.2 * Math.sin(t * 0.37 + 1)) : mouse.y;
    let rb: { left: number; top: number; width: number; height: number } | null = null;
    if (alvoBotao) {
      const hr = heroi.getBoundingClientRect(), b = alvoBotao.getBoundingClientRect();
      rb = { left: b.left - hr.left, top: b.top - hr.top, width: b.width, height: b.height };
    }
    grade.fill(0);
    cx.clearRect(0, 0, W, H);
    const ex = explosao; explosao *= 0.9;
    for (let k = 0; k < P.length; k++) {
      const p = P[k];
      let tx: number, ty: number, forca: number;
      if (rb) {
        [tx, ty] = pontoNoBotao((p.u + t * 0.04) % 1, rb, 6 + p.f * 16 * (k % 4));
        forca = 0.012;
      } else {
        const giro = p.a + t * (0.35 + p.f * 0.25) * (k % 2 ? 1 : -1);
        const raio = p.r * (parado ? 1.6 : 1) * (1 + 0.25 * Math.sin(t * 1.3 + k));
        tx = hx + Math.cos(giro) * raio; ty = hy + Math.sin(giro) * raio * 0.72;
        forca = parado ? 0.0025 : 0.006;
      }
      p.vx += (tx - p.x) * forca * p.f; p.vy += (ty - p.y) * forca * p.f;
      if (ex > 0.05) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dd = Math.sqrt(dx * dx + dy * dy) + 1;
        if (dd < 260) { p.vx += (dx / dd) * ex * 9; p.vy += (dy / dd) * ex * 9; }
      }
      p.vx += Math.sin(t * 1.7 + k) * 0.04; p.vy += Math.cos(t * 1.3 + k * 0.7) * 0.04;
      p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx; p.y += p.vy;
      const gc = (p.x / CEL) | 0, gr = (p.y / CEL) | 0;
      if (gc >= 0 && gc < cols && gr >= 0 && gr < rows) grade[gr * cols + gc] += 1;
    }
    // mosaico: as células acendem por onde o bando passa
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = grade[r * cols + c];
      if (v > 1) { cx.fillStyle = `rgba(169,209,126,${Math.min(0.22, v * 0.018)})`; cx.fillRect(c * CEL + 1, r * CEL + 1, CEL - 2, CEL - 2); }
    }
    for (const p of P) {
      const vel = Math.min(1, Math.abs(p.vx) + Math.abs(p.vy));
      cx.globalAlpha = 0.45 + vel * 0.55; cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s);
    }
    cx.globalAlpha = 1;
  };

  const passo = () => { rodando = false; if (!visivel || document.hidden) return; t += 1 / 60; desenhar(); pedir(); };
  const pedir = () => { if (!rodando && visivel && !document.hidden && !reduz) { rodando = true; quadro = requestAnimationFrame(passo); } };

  const aoMover = (e: PointerEvent) => { const r = heroi.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.ativo = true; mouse.t = performance.now(); };
  const aoSair = () => { mouse.ativo = false; };
  const aoTocar = (e: PointerEvent) => { aoMover(e); explosao = 1; };
  const entraBotao = () => { alvoBotao = cta; };
  const saiBotao = () => { alvoBotao = null; };
  const aoRedimensionar = () => medir();
  const aoVoltarAba = () => { if (!document.hidden) pedir(); };

  medir(); semear();
  window.addEventListener('resize', aoRedimensionar);
  heroi.addEventListener('pointermove', aoMover);
  heroi.addEventListener('pointerleave', aoSair);
  heroi.addEventListener('pointerdown', aoTocar);
  cta?.addEventListener('pointerenter', entraBotao);
  cta?.addEventListener('pointerleave', saiBotao);
  cta?.addEventListener('focus', entraBotao);
  cta?.addEventListener('blur', saiBotao);
  document.addEventListener('visibilitychange', aoVoltarAba);
  const io = new IntersectionObserver((es) => { visivel = es[0].isIntersecting; if (visivel) pedir(); }, { threshold: 0 });
  io.observe(heroi);
  if (reduz) desenhar(); else pedir();

  return () => {
    cancelAnimationFrame(quadro); io.disconnect();
    window.removeEventListener('resize', aoRedimensionar);
    heroi.removeEventListener('pointermove', aoMover);
    heroi.removeEventListener('pointerleave', aoSair);
    heroi.removeEventListener('pointerdown', aoTocar);
    cta?.removeEventListener('pointerenter', entraBotao);
    cta?.removeEventListener('pointerleave', saiBotao);
    cta?.removeEventListener('focus', entraBotao);
    cta?.removeEventListener('blur', saiBotao);
    document.removeEventListener('visibilitychange', aoVoltarAba);
  };
}

/* ------------------------------------------------------------------ */
/* Marcante: retícula que revela a foto do diagnóstico                 */
/* ------------------------------------------------------------------ */

export function iniciarReticula(fig: HTMLElement): Limpeza {
  const img = fig.querySelector('img');
  const rc = fig.querySelector('canvas');
  const rx = rc?.getContext('2d');
  if (!img || !rc || !rx || menosMovimento()) {
    if (rc) rc.hidden = true;
    const legenda = fig.querySelector('figcaption'); if (legenda) legenda.hidden = true;
    return () => {};
  }
  const toque = semMouse();
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const PASSO = 9;
  let RW = 0, RH = 0, rcols = 0, rrows = 0, lum: Float32Array | null = null, ener = new Float32Array(0);
  const rm = { x: -999, y: -999, dentro: false };
  let rodando = false, visivel = false, t = 0, quadro = 0;

  const pintar = () => {
    if (!lum) return;
    rx.clearRect(0, 0, RW, RH);
    for (let r = 0; r < rrows; r++) for (let c = 0; c < rcols; c++) {
      const k = r * rcols + c, cobre = 1 - ener[k];
      if (cobre < 0.02) continue;
      rx.globalAlpha = cobre; rx.fillStyle = '#F2EFEB'; rx.fillRect(c * PASSO, r * PASSO, PASSO + 0.5, PASSO + 0.5);
      const raio = (1 - lum[k]) * PASSO * 0.62 + 0.4;
      rx.fillStyle = '#014029'; rx.beginPath(); rx.arc(c * PASSO + PASSO / 2, r * PASSO + PASSO / 2, raio, 0, 6.283); rx.fill();
    }
    rx.globalAlpha = 1;
  };
  const preparar = () => {
    const r = fig.getBoundingClientRect();
    RW = r.width; RH = r.height;
    rc.width = RW * DPR; rc.height = RH * DPR; rx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rcols = Math.ceil(RW / PASSO); rrows = Math.ceil(RH / PASSO); ener = new Float32Array(rcols * rrows);
    const o = document.createElement('canvas'); o.width = rcols; o.height = rrows;
    const ox = o.getContext('2d'); if (!ox) return;
    const ir = img.naturalWidth / img.naturalHeight, cr = RW / RH;
    let sw: number, sh: number, sx: number, sy: number;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    ox.drawImage(img, sx, sy, sw, sh, 0, 0, rcols, rrows);
    try {
      const d = ox.getImageData(0, 0, rcols, rrows).data;
      lum = new Float32Array(rcols * rrows);
      for (let k = 0; k < lum.length; k++) lum[k] = (d[k * 4] * 0.3 + d[k * 4 + 1] * 0.59 + d[k * 4 + 2] * 0.11) / 255;
    } catch { lum = null; }
    pintar();
  };
  const passo = () => {
    rodando = false; if (!visivel || document.hidden) return;
    t += 1 / 60;
    let ax = rm.x, ay = rm.y, ativo = rm.dentro;
    if (!ativo && toque) { ax = RW * (0.5 + 0.32 * Math.sin(t * 0.6)); ay = RH * (0.5 + 0.3 * Math.sin(t * 0.43 + 1)); ativo = true; }
    const R = Math.max(90, RW * 0.26);
    let mudou = false;
    for (let r = 0; r < rrows; r++) for (let c = 0; c < rcols; c++) {
      const k = r * rcols + c, v = ener[k];
      if (ativo) {
        const dx = c * PASSO - ax, dy = r * PASSO - ay, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) { const alvo = 1 - Math.pow(d / R, 2); if (alvo > v) { ener[k] = v + (alvo - v) * 0.35; mudou = true; continue; } }
      }
      if (v > 0) { ener[k] = Math.max(0, v - 0.012); mudou = true; }
    }
    if (mudou) pintar();
    pedir();
  };
  const pedir = () => { if (!rodando && visivel && !document.hidden) { rodando = true; quadro = requestAnimationFrame(passo); } };

  const aoMover = (e: PointerEvent) => { const r = fig.getBoundingClientRect(); rm.x = e.clientX - r.left; rm.y = e.clientY - r.top; rm.dentro = true; };
  const aoSair = () => { rm.dentro = false; };
  const aoRedimensionar = () => { if (img.naturalWidth) preparar(); };
  const aoCarregar = () => preparar();

  fig.addEventListener('pointermove', aoMover);
  fig.addEventListener('pointerleave', aoSair);
  window.addEventListener('resize', aoRedimensionar);
  const io = new IntersectionObserver((es) => { visivel = es[0].isIntersecting; if (visivel) pedir(); }, { threshold: 0 });
  io.observe(fig);
  if (img.complete && img.naturalWidth) preparar(); else img.addEventListener('load', aoCarregar);

  return () => {
    cancelAnimationFrame(quadro); io.disconnect();
    fig.removeEventListener('pointermove', aoMover);
    fig.removeEventListener('pointerleave', aoSair);
    window.removeEventListener('resize', aoRedimensionar);
    img.removeEventListener('load', aoCarregar);
  };
}

/* ------------------------------------------------------------------ */
/* Marcantes leves: texto que acende, etapas presas, contagem, ímã      */
/* ------------------------------------------------------------------ */

export function iniciarTextoQueAcende(el: HTMLElement): Limpeza {
  const ws = Array.from(el.querySelectorAll<HTMLElement>('.w'));
  if (menosMovimento()) return () => {};
  const acende = () => {
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const n = Math.round(p * ws.length);
    ws.forEach((w, k) => w.classList.toggle('on', k < n));
  };
  window.addEventListener('scroll', acende, { passive: true });
  acende();
  return () => window.removeEventListener('scroll', acende);
}

export function iniciarEtapas(raiz: HTMLElement): Limpeza {
  const passos = Array.from(raiz.querySelectorAll<HTMLElement>('.passo'));
  const num = raiz.querySelector<HTMLElement>('[data-num]');
  const barra = raiz.querySelector<HTMLElement>('[data-barra]');
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      const alvo = e.target as HTMLElement, n = alvo.dataset.n || '01';
      passos.forEach((p) => p.classList.toggle('ativo', p === alvo));
      if (num) num.textContent = n;
      if (barra) barra.style.width = `${(parseInt(n, 10) / passos.length) * 100}%`;
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  passos.forEach((p) => io.observe(p));
  passos[0]?.classList.add('ativo');
  return () => io.disconnect();
}

export function iniciarContagem(el: HTMLElement, total: number): Limpeza {
  if (menosMovimento()) return () => {};
  let quadro = 0, contou = false;
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting || contou) return;
    contou = true;
    const t0 = performance.now();
    const f = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600);
      el.textContent = String(Math.round(total * (1 - Math.pow(1 - p, 4))));
      if (p < 1) quadro = requestAnimationFrame(f);
    };
    quadro = requestAnimationFrame(f);
  }, { threshold: 0.4 });
  io.observe(el);
  return () => { io.disconnect(); cancelAnimationFrame(quadro); el.textContent = String(total); };
}

export function iniciarIma(raiz: HTMLElement): Limpeza {
  if (menosMovimento() || semMouse()) return () => {};
  const botoes = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ima]'));
  const fns = botoes.map((b) => {
    const mover = (e: PointerEvent) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.28}px`);
      b.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.38}px`);
    };
    const soltar = () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); };
    b.addEventListener('pointermove', mover);
    b.addEventListener('pointerleave', soltar);
    return () => { b.removeEventListener('pointermove', mover); b.removeEventListener('pointerleave', soltar); };
  });
  return () => fns.forEach((f) => f());
}
