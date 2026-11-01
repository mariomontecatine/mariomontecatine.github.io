// La entrada: saludos que aparecen y se van con un desenfoque, y el último se
// deshace en polvo que sube mientras la cortina se abre.

// Los tiempos son los de la web de Jeremy (portfolio2025, Preloader): entra
// en 0,15 s, se queda 0,1 s y sale en 0,15 s; la última se deshace a los 0,1 s
// en un polvo que dura 1 s, y la cortina se va a mitad, en 0,4 s.
const IN = 150;
const HOLD = 100;
const OUT = 150;
const LAST_HOLD = 100;
const DUST = 1000;
const CURTAIN_AT = 0.55;
const CURTAIN = 400;
// Las curvas power2 de GSAP, que en CSS son las cúbicas.
const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
const EASE_IN = 'cubic-bezier(0.32, 0, 0.67, 0)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

const hidden = { opacity: 0, filter: 'blur(6px)' };

function appear(el) {
  return el.animate(
    [{ ...hidden, transform: 'translateY(10px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
    { duration: IN, easing: EASE_OUT, fill: 'forwards' }
  ).finished;
}

function vanish(el) {
  return el.animate(
    [{ opacity: 1, filter: 'blur(0px)', transform: 'none' }, { ...hidden, transform: 'translateY(-10px)' }],
    { duration: OUT, easing: EASE_IN, fill: 'forwards' }
  ).finished;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Pinta el texto en un lienzo, se queda con sus píxeles y los suelta: cada
// grano se deja llevar por un campo de corrientes y acaba subiendo.
function dust(word, curtain) {
  const rect = word.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const padX = 80;
  const padTop = 260;
  const padBottom = 60;
  const cssW = rect.width + padX * 2;
  const cssH = rect.height + padTop + padBottom;
  const W = Math.round(cssW * dpr);
  const H = Math.round(cssH * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'intro-dust';
  canvas.style.cssText = `left:${rect.left - padX}px;top:${rect.top - padTop}px;width:${cssW}px;height:${cssH}px`;
  const ctx = canvas.getContext('2d');

  const style = getComputedStyle(word);
  ctx.font = `${style.fontWeight} ${parseFloat(style.fontSize) * dpr}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(word.textContent, (padX + rect.width / 2) * dpr, (padTop + rect.height / 2) * dpr);

  const src = ctx.getImageData(0, 0, W, H).data;
  const px = [];
  const py = [];
  const pa = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = src[(y * W + x) * 4 + 3];
      if (a > 40) {
        px.push(x);
        py.push(y);
        pa.push(a / 255);
      }
    }
  }
  const n = px.length;
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const life = new Float32Array(n);
  for (let i = 0; i < n; i++) life[i] = 0.7 + Math.random() * 0.3;

  const out = ctx.createImageData(W, H);
  const buf = new Uint32Array(out.data.buffer);
  const rise = 260 * dpr;
  const swirl = 3 * dpr;

  curtain.append(canvas);
  word.style.visibility = 'hidden';

  return new Promise((resolve) => {
    const t0 = performance.now();
    let prev = 0;
    function step(now) {
      const e = Math.min(1, (now - t0) / DUST);
      const dt = Math.max(0, e - prev) * (DUST / 1000);
      prev = e;
      const damp = 0.95 ** (dt * 60);
      buf.fill(0);
      for (let i = 0; i < n; i++) {
        const a = e / life[i];
        if (a >= 1) continue;
        let x = px[i];
        let y = py[i];
        let alpha = pa[i];
        if (a > 0) {
          // Corrientes suaves que dependen del sitio: los granos vecinos se
          // mueven juntos, como humo, en vez de salir cada uno por su lado.
          const ang = Math.sin(x * 0.012 / dpr + e * 2) * 2.4 + Math.cos(y * 0.018 / dpr - e * 1.5) * 2.4;
          vx[i] = vx[i] * damp + Math.cos(ang) * swirl * 60 * dt;
          vy[i] = vy[i] * damp + Math.sin(ang) * swirl * 60 * dt - rise * a * a * dt;
          x += vx[i] * dt * 60 * 0.016;
          y += vy[i] * dt * 60 * 0.016;
          px[i] = x;
          py[i] = y;
          alpha *= 1 - a * a * a;
        }
        const ix = x | 0;
        const iy = y | 0;
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
        const v = (alpha * 255) | 0;
        if (v > 0) buf[iy * W + ix] = (v << 24) | 0xffffff;
      }
      ctx.putImageData(out, 0, 0);
      if (e < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

export async function runIntro({ words, last, onReveal, onDone }) {
  const curtain = document.getElementById('intro');
  const word = document.getElementById('intro-word');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const open = () => {
    onReveal?.();
    const fade = curtain.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CURTAIN, easing: EASE_IN_OUT, fill: 'forwards' });
    // Con la cortina ya fuera entra la página (onDone prepara su animación
    // antes de que se quite la clase que la tenía escondida).
    fade.finished.then(() => {
      curtain.remove();
      onDone?.();
      document.documentElement.classList.remove('intro-on');
    });
  };

  if (calm) {
    word.textContent = last;
    await wait(700);
    open();
    return;
  }

  if (document.fonts) await Promise.race([document.fonts.ready, wait(600)]);

  for (const w of words) {
    word.textContent = w;
    await appear(word);
    await wait(HOLD);
    await vanish(word);
  }
  word.textContent = last;
  await appear(word);
  await wait(LAST_HOLD);
  const done = dust(word, curtain);
  await wait(DUST * CURTAIN_AT);
  open();
  await done;
}
