// El motor: una sola nube de partículas que viaja de una escena a la siguiente.
//
// El viaje no es un muelle que persigue el destino, sino una interpolación con
// duración fija a la que se le añaden dos cosas: cada punto arranca un poco
// más tarde que el anterior (escalonado) y, a mitad de camino, se desvía en una
// dirección propia antes de recogerse (remolino). Sin esas dos, la nube cambia
// de forma de un tirón y parece un corte de vídeo en vez de un movimiento.
//
// Puede haber varias nubes en la página: cada una vive en su lienzo y sólo se
// pinta mientras ese lienzo está a la vista.

const DURATION = 1.25;
const STAGGER = 0.4;
const SWIRL = 0.3;
const DEPTH_FLOOR = 0.2;

const GREYS = ['#f3f1ec', '#b9b7b0', '#6e6c66'];
const FLOOR_INK = '243,241,236';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function sprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(12, 12, 11, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// Opciones:
//   area()   el hueco donde se centra la nube, en coordenadas de ventana.
//            Puede devolver `r` para fijar el radio a mano.
//   floor    pinta el suelo en perspectiva.
//   palette  colores propios; `tint(x, y, t, i)` elige uno por punto y frame.
//   stars    cuántas estrellitas de fondo titilan detrás de la nube.
export function createCloud(canvas, { count = 8000, area, floor = false, palette, tint, stars = 0, look = 0.34 } = {}) {
  const ctx = canvas.getContext('2d');
  // El lienzo ocupa su sección entera. Se mide la sección y no el lienzo para
  // que animarlo (caerse, aparecer) no descoloque lo que hay dentro.
  const frame0 = () => canvas.parentElement.getBoundingClientRect();
  const rand = seeded(7310451);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lo que se pinta ahora.
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const z = new Float32Array(count);
  const size = new Float32Array(count).fill(1.8);
  const alpha = new Float32Array(count);
  // De dónde salió cada punto al empezar el viaje actual.
  const fx = new Float32Array(count);
  const fy = new Float32Array(count);
  const fz = new Float32Array(count);
  const fs = new Float32Array(count).fill(1.8);
  const fa = new Float32Array(count);
  // A dónde va.
  const tx = new Float32Array(count);
  const ty = new Float32Array(count);
  const tz = new Float32Array(count);
  const ts = new Float32Array(count).fill(1.8);
  const ta = new Float32Array(count);
  // Lo propio de cada punto: su retraso, su dirección de remolino y su fase.
  const delay = new Float32Array(count);
  const dir = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  // Desplazamiento suavizado de cada punto alrededor del ratón.
  const offset = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    delay[i] = rand() * STAGGER;
    const a = rand() * Math.PI * 2;
    const b = Math.acos(2 * rand() - 1);
    dir[i * 3] = Math.sin(b) * Math.cos(a);
    dir[i * 3 + 1] = Math.sin(b) * Math.sin(a);
    dir[i * 3 + 2] = Math.cos(b);
    phase[i] = rand() * Math.PI * 2;
    const r = 1.3 + rand() * 1.1;
    x[i] = fx[i] = dir[i * 3] * r * 1.4;
    y[i] = fy[i] = dir[i * 3 + 1] * r * 0.8;
    z[i] = fz[i] = dir[i * 3 + 2] * r;
  }

  // Estrellas de fondo: posición relativa al lienzo, tamaño, fase y color.
  const sky = [];
  for (let i = 0; i < stars; i++) {
    sky.push({ u: rand(), v: rand(), s: 0.6 + rand() ** 3 * 2.2, p: rand() * 6.28, k: rand() < 0.25 ? 1 : 0 });
  }

  let w = 0;
  let h = 0;
  // La nube vive dentro de un hueco de la maqueta, no en todo el lienzo.
  let stageX = 0;
  let stageY = 0;
  let stageR = 0;
  const greys = GREYS.map(sprite);
  const tints = palette ? palette.map(sprite) : null;
  let sceneExtent = { x: 1, y: 1 };
  let visible = true;

  let spin = 0;
  let sway = 0;
  let pitch = 0;
  let spinNow = 0;
  let lean = 1;
  let tiltX = 0;
  let tiltY = 0;
  let tiltXNow = 0;
  let tiltYNow = 0;
  let yaw = 0;
  let yawNow = 0;

  let pointerX = -1e5;
  let pointerY = -1e5;
  let pointerLive = false;

  let scale = 0;
  let scaleTarget = 1;
  let portraitMix = 0;
  let portraitTarget = 0;
  let crispMix = 0;
  let crispTarget = 0;
  let animatedScene = null;
  let started = -DURATION;

  function resize() {
    const rect = frame0();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    layout();
  }

  function layout() {
    const rect = frame0();
    const box = area ? area() : rect;
    stageX = box.left - rect.left + box.width / 2;
    stageY = box.top - rect.top + box.height / 2;
    if (box.r) {
      stageR = box.r;
      return;
    }
    // En móvil encuadra los puntos visibles de cada escena: los dibujos no
    // ocupan todos el mismo espacio dentro de su cubo de coordenadas.
    stageR = window.matchMedia('(max-width: 880px)').matches
      ? Math.min(box.width * 0.44 / sceneExtent.x, box.height * 0.44 / sceneExtent.y) / scaleTarget
      : Math.min(box.width / 2.3, box.height * 0.36);
  }

  function measureScene(s) {
    let extentX = 0.1;
    let extentY = 0.1;
    // Reserva espacio para el giro completo o para los extremos del balanceo.
    const angles = s.spin ? Array.from({ length: 24 }, (_, i) => i * Math.PI / 12)
      : [(s.yaw || 0) - (s.sway || 0), (s.yaw || 0) + (s.sway || 0)];
    const cosX = Math.cos(s.pitch || 0);
    const sinX = Math.sin(s.pitch || 0);
    for (const angle of angles) {
      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      for (let i = 0; i < s.n; i++) {
        if (s.alpha[i] < 0.01) continue;
        const x = s.pos[i * 3], y = s.pos[i * 3 + 1], z = s.pos[i * 3 + 2];
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const perspective = 1 / (1 + (y * sinX + rz * cosX) * 0.34);
        extentX = Math.max(extentX, Math.abs(rx * perspective));
        extentY = Math.max(extentY, Math.abs((y * cosX - rz * sinX) * perspective));
      }
    }
    return { x: extentX, y: extentY };
  }

  // Cambiar de escena es congelar dónde está cada punto ahora y darle un
  // destino nuevo; el reloj del viaje vuelve a cero.
  function setScene(s) {
    animatedScene = s.update ? s : null;
    spin = calm ? 0 : s.spin || 0;
    sway = calm ? 0 : s.sway || 0;
    pitch = s.pitch || 0;
    yaw = s.yaw || 0;
    // El retrato apenas se inclina: una cara girada deja de ser un retrato.
    lean = calm ? 0 : s.lean ?? (s.portrait ? 0.58 : 1);
    scaleTarget = s.portrait ? 0.94 : 0.82;
    sceneExtent = measureScene(s);
    layout();
    portraitTarget = s.portrait ? 1 : 0;
    crispTarget = s.crisp ? 1 : 0;
    started = clock;
    for (let i = 0; i < count; i++) {
      fx[i] = x[i];
      fy[i] = y[i];
      fz[i] = z[i];
      fs[i] = size[i];
      fa[i] = alpha[i];
      if (i < s.n) {
        tx[i] = s.pos[i * 3];
        ty[i] = s.pos[i * 3 + 1];
        tz[i] = s.pos[i * 3 + 2];
        ts[i] = s.size[i];
        ta[i] = s.alpha[i];
      } else {
        // Reparte el excedente sobre puntos ya existentes y lo deja invisible.
        const j = i % s.n;
        tx[i] = s.pos[j * 3];
        ty[i] = s.pos[j * 3 + 1];
        tz[i] = s.pos[j * 3 + 2];
        ts[i] = s.size[j];
        ta[i] = 0;
      }
    }
  }

  // El puntero llega en coordenadas de ventana. La nube gira hacia él: lo que
  // cuenta es dónde está respecto a su propio centro, no respecto a la ventana.
  function pointer(cx, cy, live) {
    const rect = frame0();
    pointerX = live ? cx - rect.left : -1e5;
    pointerY = live ? cy - rect.top : -1e5;
    pointerLive = live;
    if (live && w) {
      const reachX = Math.max(stageR * 2.2, window.innerWidth * 0.5);
      const reachY = Math.max(stageR * 1.6, window.innerHeight * 0.5);
      tiltY = clamp((pointerX - stageX) / reachX, -1, 1) * look;
      tiltX = clamp((pointerY - stageY) / reachY, -1, 1) * -look * 0.6;
    } else {
      tiltY = 0;
      tiltX = 0;
    }
  }

  // El suelo: líneas que se juntan hacia un horizonte y se van acercando, para
  // que la nube flote en una habitación en vez de en el vacío.
  function drawFloor(t) {
    const narrow = w < 760;
    const horizon = h * (narrow ? 0.82 : 0.68);
    const depth = h - horizon;
    if (depth < 40) return;
    const ink = FLOOR_INK;
    const glide = calm ? 0 : (t * 0.09) % 1;
    const strength = narrow ? 0.5 : 1;

    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const k = 1 + (i + 1 - glide) * 0.52;
      const yy = horizon + depth / k;
      if (yy > h + 1) continue;
      const near = Math.min(1, (yy - horizon) / (depth * 0.3));
      ctx.strokeStyle = `rgba(${ink},${(0.075 / k) * near * strength})`;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }

    const fan = ctx.createLinearGradient(0, horizon, 0, h);
    fan.addColorStop(0, `rgba(${ink},0)`);
    fan.addColorStop(0.5, `rgba(${ink},${0.035 * strength})`);
    fan.addColorStop(1, `rgba(${ink},${0.07 * strength})`);
    ctx.strokeStyle = fan;
    const spread = Math.max(80, w / 11);
    for (let i = -18; i <= 18; i++) {
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(i) * 0.045);
      ctx.beginPath();
      ctx.moveTo(w / 2, horizon);
      ctx.lineTo(w / 2 + i * spread * 1.8, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSky(t) {
    if (!sky.length) return;
    const warm = tints ? tints[tints.length - 1] : greys[0];
    for (const s of sky) {
      const glow = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.3 + s.p);
      ctx.globalAlpha = 0.12 + glow * 0.45;
      const d = s.s * (0.8 + glow * 0.4);
      ctx.drawImage(s.k ? warm : greys[1], s.u * w - d / 2, s.v * h - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  let clock = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !visible) {
      last = now;
      return;
    }

    const dt = Math.min(64, now - last) / 16.667;
    last = now;
    clock += dt * 0.0166;

    // Sin giro propio la escena vuelve a mirar de frente, en vez de quedarse
    // con el ángulo que arrastraba de la figura anterior.
    if (spin) spinNow += spin * dt * 0.0166 * Math.PI * 2;
    else spinNow += (Math.round(spinNow / (Math.PI * 2)) * Math.PI * 2 - spinNow) * 0.06 * Math.min(1, dt);

    const follow = 1 - Math.exp(-dt / 15);
    tiltXNow += (tiltX * lean + pitch - tiltXNow) * follow;
    tiltYNow += (tiltY * lean - tiltYNow) * follow;
    yawNow += (yaw - yawNow) * follow;
    scale += (scaleTarget - scale) * 0.06;
    portraitMix += (portraitTarget - portraitMix) * 0.06;
    crispMix += (crispTarget - crispMix) * 0.06;

    const idleSway = Math.sin(clock * 0.5) * sway;
    const ang = spinNow + yawNow + tiltYNow + idleSway;
    const cosY = Math.cos(ang);
    const sinY = Math.sin(ang);
    const cosX = Math.cos(tiltXNow);
    const sinX = Math.sin(tiltXNow);

    const R = stageR * scale;
    const cx = stageX + idleSway * R * 0.22 * portraitMix;
    const cy = stageY;
    const dotScale = Math.max(0.65, Math.min(2.4, R / 260));
    const breathe = calm ? 1 : 1 + Math.sin(clock * 0.9) * 0.012;
    const repel = clamp(R * 0.3, 55, 150);
    const drift = calm ? 0 : (0.006 - portraitMix * 0.0045) * (1 - crispMix * 0.9);

    const T = calm ? 1 : clamp01((clock - started) / DURATION);
    if (animatedScene) animatedScene.update(Math.max(0, clock - started - DURATION), calm);

    ctx.clearRect(0, 0, w, h);
    if (floor) drawFloor(clock);
    drawSky(clock);

    for (let i = 0; i < count; i++) {
      if (animatedScene && i < animatedScene.n) {
        tx[i] = animatedScene.pos[i * 3];
        ty[i] = animatedScene.pos[i * 3 + 1];
        tz[i] = animatedScene.pos[i * 3 + 2];
        ta[i] = animatedScene.alpha[i];
      }
      const g = calm ? 1 : easeInOut(clamp01(T * (1 + STAGGER) - delay[i]));
      const bulge = Math.sin(Math.PI * g) * SWIRL;

      const gx = tx[i] + Math.sin(clock * 0.9 + phase[i]) * drift;
      const gy = ty[i] + Math.cos(clock * 0.7 + phase[i]) * drift;

      x[i] = fx[i] + (gx - fx[i]) * g + dir[i * 3] * bulge;
      y[i] = fy[i] + (gy - fy[i]) * g + dir[i * 3 + 1] * bulge;
      z[i] = fz[i] + (tz[i] - fz[i]) * g + dir[i * 3 + 2] * bulge;
      size[i] = fs[i] + (ts[i] - fs[i]) * g;
      alpha[i] = fa[i] + (ta[i] - fa[i]) * g;

      const a = alpha[i];
      if (a < 0.01) continue;

      // Rotación en Y y luego en X.
      const rx = x[i] * cosY - z[i] * sinY;
      const rz0 = x[i] * sinY + z[i] * cosY;
      const ry = y[i] * cosX - rz0 * sinX;
      const rz = y[i] * sinX + rz0 * cosX;

      const persp = 1 / (1 + rz * 0.34);
      const px = cx + rx * R * persp * breathe;
      const py = cy + ry * R * persp * breathe;
      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

      // Desplazamiento acotado con entrada y retorno suaves, sin acumular
      // impulsos ni rebotar al cruzar el cursor por un rasgo de la cara.
      const o = i * 2;
      let pushX = 0;
      let pushY = 0;
      if (pointerLive && !calm) {
        const dx = px - pointerX;
        const dy = py - pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < repel * repel && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const falloff = (1 - d / repel) ** 2;
          const push = (18 - portraitMix * 8) * falloff * (repel / 85);
          // El denominador suaviza el cambio de dirección justo bajo el ratón.
          pushX = dx / Math.sqrt(d2 + 144) * push;
          pushY = dy / Math.sqrt(d2 + 144) * push;
        }
      }
      const settle = 1 - Math.exp(-dt / 7);
      offset[o] += (pushX - offset[o]) * settle;
      offset[o + 1] += (pushY - offset[o + 1]) * settle;

      const near = clamp01((1 - rz) / 2);
      const px2 = size[i] * dotScale * (0.8 + 0.4 * near);
      if (px2 < 0.3) continue;
      let ink;
      if (tints) {
        ink = tints[tint(x[i], y[i], clock, i)];
      } else {
        // El mapa del retrato ya contiene sus luces y sombras. Atenuarlo otra
        // vez como una esfera borra los rasgos; las figuras mantienen su relieve.
        const shade = portraitMix + crispMix > 0.5 ? 0 : rz < -0.1 ? 0 : rz > 0.45 ? 2 : 1;
        ink = greys[shade];
      }
      const depthFloor = DEPTH_FLOOR + Math.max(portraitMix, crispMix) * 0.55;
      ctx.globalAlpha = Math.min(1, a * (depthFloor + (1 - depthFloor) * near));
      ctx.drawImage(ink, px + offset[o] - px2 / 2, py + offset[o + 1] - px2 / 2, px2, px2);
    }

    ctx.globalAlpha = 1;
  }

  // Fuera de pantalla no se pinta: dos nubes a la vez se notan en el portátil.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(canvas);
  }

  resize();
  requestAnimationFrame(frame);

  return { resize, setScene, pointer };
}
