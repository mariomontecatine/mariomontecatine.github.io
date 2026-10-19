// Cada escena es una nube de puntos: posiciones en un cubo de lado 2 centrado en
// el origen, más un peso por punto (0..1) que el motor usa como tamaño y opacidad.
// Las figuras planas se dibujan en un lienzo pequeño y se muestrean; las de
// volumen se generan con fórmulas.

const rand = seeded(20260219);

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

// Barajar es lo que hace que una transición parezca un enjambre y no un barrido.
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}

// Cada punto es [x, y, z, opacidad, tamaño]. Si no se le da tamaño recibe uno
// de una escalera de 97 valores: la nube nunca es de puntos todos iguales.
function pack(points, extra = {}) {
  const n = points.length;
  const pos = new Float32Array(n * 3);
  const alpha = new Float32Array(n);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = points[i][0];
    pos[i * 3 + 1] = points[i][1];
    pos[i * 3 + 2] = points[i][2] || 0;
    alpha[i] = points[i][3] === undefined ? 1 : points[i][3];
    size[i] = points[i][4] === undefined ? 1.6 + ((i * 7919) % 97) / 120 : points[i][4];
  }
  return { n, pos, alpha, size, spin: 0, pitch: 0, ...extra };
}

// ---- Muestreo de un dibujo 2D ----------------------------------------------

const SIZE = 190;

function sampler() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return c.getContext('2d', { willReadFrequently: true });
}

// draw(ctx, S) pinta en blanco sobre negro; se queda con los píxeles encendidos.
function fromDrawing(draw, { count = 2600, depth = 0, jitter = 0.5 } = {}) {
  const ctx = sampler();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, SIZE);

  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const hits = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = data[(y * SIZE + x) * 4] / 255;
      if (v > 0.35) hits.push([x, y, v]);
    }
  }
  shuffle(hits);

  const take = Math.min(count, hits.length);
  const points = [];
  for (let i = 0; i < take; i++) {
    const [x, y, v] = hits[i];
    points.push([
      ((x + (rand() - 0.5) * jitter) / SIZE) * 2 - 1,
      ((y + (rand() - 0.5) * jitter) / SIZE) * 2 - 1,
      depth ? (rand() - 0.5) * depth : 0,
      0.55 + v * 0.45,
    ]);
  }
  return points;
}

// ---- El retrato -------------------------------------------------------------

// La imagen que llega aquí no es la foto: es el mapa que escupe
// tools/build-dots.py, con la probabilidad de cada punto en el canal rojo y su
// tinta en el verde. El contraste local, el recorte y el desvanecido del hombro
// ya están decididos ahí, donde se pueden mirar antes de publicarlos.
export function portrait(img, { count = 6000 } = {}) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  const aspect = W / H;
  // Sorteo local por píxel: editar el pelo no cambia toda la cara ni depende
  // del orden de carga de los dos temas.
  const sample = seeded(7310451);
  const hits = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const p = data[i] / 255;
      const accept = sample();
      const priority = sample();
      const jitterX = sample() - 0.5;
      const jitterY = sample() - 0.5;
      const dotVariation = sample();
      if (p <= 0.02 || accept > p) continue;
      hits.push([x + jitterX, y + jitterY, data[i + 1] / 255, priority, dotVariation]);
    }
  }
  hits.sort((a, b) => a[3] - b[3]);

  const take = Math.min(count, hits.length);
  const points = [];
  for (let i = 0; i < take; i++) {
    const [x, y, ink, , dotVariation] = hits[i];
    const nx = (x / W) * 2 - 1;
    const ny = (y / H) * 2 - 1;
    // Un relieve de verdad: el centro del rostro se adelanta y los bordes se
    // van hacia atrás, así la perspectiva sola ya reparte tamaños.
    const r = Math.hypot(nx * 0.9, ny * 0.75);
    // Z negativo se acerca a la cámara. Relieve suave para no deformar la foto.
    const z = -0.16 + Math.min(1, r) * 0.24;
    const dot = 1.05 + ink * 0.35 + dotVariation * 0.55;
    points.push([nx * aspect * 0.98, ny * 0.99, z, 0.65 + ink * 0.35, dot]);
  }
  return pack(shuffle(points), { pitch: 0, spin: 0, sway: 0.13, portrait: true });
}

// ---- Figuras ----------------------------------------------------------------

function sphereShell(count, radius = 0.82) {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    points.push([Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius, 0.85]);
  }
  return points;
}

const builders = {
  // Círculos concéntricos: lo que focco hace con la atención.
  rings(count) {
    const points = [];
    const rings = [0.22, 0.42, 0.62, 0.8, 0.96];
    for (let i = 0; i < count; i++) {
      const step = i % rings.length;
      const ring = rings[step];
      const a = rand() * Math.PI * 2;
      const r = ring + (rand() - 0.5) * 0.018;
      // Cada anillo un poco más atrás: un embudo que apunta al centro.
      points.push([Math.cos(a) * r, Math.sin(a) * r, (step / (rings.length - 1) - 0.5) * 0.55, 0.55 + (1 - ring) * 0.45]);
    }
    return pack(shuffle(points), { spin: 0.012 });
  },

  // Una ventana de navegador.
  browser(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.lineWidth = S * 0.028;
            const m = S * 0.12;
            ctx.strokeRect(m, m * 1.45, S - m * 2, S - m * 2.9);
            ctx.beginPath();
            ctx.moveTo(m, m * 1.45 + S * 0.13);
            ctx.lineTo(S - m, m * 1.45 + S * 0.13);
            ctx.stroke();
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.arc(m + S * 0.055 + i * S * 0.062, m * 1.45 + S * 0.065, S * 0.018, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.lineWidth = S * 0.02;
            for (let i = 0; i < 4; i++) {
              const y = m * 1.45 + S * 0.26 + i * S * 0.12;
              ctx.beginPath();
              ctx.moveTo(m + S * 0.08, y);
              ctx.lineTo(m + S * 0.08 + (S * 0.6) * (i === 3 ? 0.45 : 1), y);
              ctx.stroke();
            }
          },
          { count, depth: 0.1 }
        )
      ),
      { spin: 0.01 }
    );
  },

  // Dos picos y una línea de nieve.
  mountain(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.beginPath();
            ctx.moveTo(S * 0.02, S * 0.86);
            ctx.lineTo(S * 0.33, S * 0.26);
            ctx.lineTo(S * 0.5, S * 0.56);
            ctx.lineTo(S * 0.68, S * 0.14);
            ctx.lineTo(S * 0.98, S * 0.86);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.moveTo(S * 0.33, S * 0.4);
            ctx.lineTo(S * 0.44, S * 0.62);
            ctx.lineTo(S * 0.2, S * 0.62);
            ctx.closePath();
            ctx.moveTo(S * 0.68, S * 0.3);
            ctx.lineTo(S * 0.82, S * 0.56);
            ctx.lineTo(S * 0.55, S * 0.56);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
          },
          { count, depth: 0.3 }
        )
      ),
      { spin: 0.008 }
    );
  },

  // Nodos en una esfera y el tráfico que corre por los enlaces.
  network(count) {
    const nodes = [];
    for (let i = 0; i < 13; i++) {
      const y = 1 - (i / 12) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      nodes.push([Math.cos(th) * r * 0.85, y * 0.85, Math.sin(th) * r * 0.85]);
    }
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1], nodes[i][2] - nodes[j][2]);
        if (d < 0.95) edges.push([i, j]);
      }
    }
    const points = [];
    const onNodes = Math.round(count * 0.42);
    for (let i = 0; i < onNodes; i++) {
      const n = nodes[i % nodes.length];
      const a = rand() * Math.PI * 2;
      const b = Math.acos(rand() * 2 - 1);
      const r = 0.07 * Math.cbrt(rand());
      points.push([
        n[0] + Math.sin(b) * Math.cos(a) * r,
        n[1] + Math.sin(b) * Math.sin(a) * r,
        n[2] + Math.cos(b) * r,
        1,
      ]);
    }
    for (let i = points.length; i < count; i++) {
      const [a, b] = edges[i % edges.length];
      const t = rand();
      points.push([
        nodes[a][0] + (nodes[b][0] - nodes[a][0]) * t,
        nodes[a][1] + (nodes[b][1] - nodes[a][1]) * t,
        nodes[a][2] + (nodes[b][2] - nodes[a][2]) * t,
        0.45,
      ]);
    }
    return pack(shuffle(points), { spin: 0.045 });
  },

  // Un reloj con sus dos agujas.
  clock(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.lineWidth = S * 0.03;
            ctx.beginPath();
            ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2;
              const r1 = S * 0.33;
              const r2 = S * 0.36;
              ctx.lineWidth = S * (i % 3 === 0 ? 0.028 : 0.015);
              ctx.beginPath();
              ctx.moveTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1);
              ctx.lineTo(S / 2 + Math.cos(a) * r2, S / 2 + Math.sin(a) * r2);
              ctx.stroke();
            }
            ctx.lineWidth = S * 0.032;
            ctx.beginPath();
            ctx.moveTo(S / 2, S / 2);
            ctx.lineTo(S / 2, S * 0.26);
            ctx.moveTo(S / 2, S / 2);
            ctx.lineTo(S * 0.72, S * 0.58);
            ctx.stroke();
          },
          { count, depth: 0.12 }
        )
      ),
      { spin: 0.014 }
    );
  },

  // Un tablero, inclinado para que se note que tiene volumen.
  chess(count) {
    const points = [];
    const cell = 2 / 8;
    for (let i = 0; i < count; i++) {
      const col = (rand() * 8) | 0;
      const row = (rand() * 8) | 0;
      if ((col + row) % 2 === 1) continue;
      const x = -1 + col * cell + rand() * cell;
      const y = -1 + row * cell + rand() * cell;
      points.push([x * 0.9, y * 0.9, (rand() - 0.5) * 0.04, 0.9]);
    }
    return pack(shuffle(points), { spin: 0.02, pitch: 0.55 });
  },

  // Un escudo: lo que bloquea.
  shield(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.beginPath();
            ctx.moveTo(S * 0.5, S * 0.08);
            ctx.lineTo(S * 0.86, S * 0.24);
            ctx.lineTo(S * 0.86, S * 0.52);
            ctx.quadraticCurveTo(S * 0.86, S * 0.82, S * 0.5, S * 0.94);
            ctx.quadraticCurveTo(S * 0.14, S * 0.82, S * 0.14, S * 0.52);
            ctx.lineTo(S * 0.14, S * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = S * 0.075;
            ctx.beginPath();
            ctx.moveTo(S * 0.33, S * 0.5);
            ctx.lineTo(S * 0.46, S * 0.65);
            ctx.lineTo(S * 0.7, S * 0.35);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          },
          { count, depth: 0.22 }
        )
      ),
      { spin: 0.01 }
    );
  },

  // Tres senos desfasados: una señal.
  wave(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const lane = i % 3;
      const t = rand() * 2 - 1;
      const amp = 0.46 - lane * 0.1;
      const y = Math.sin(t * Math.PI * 2.2 + lane * 1.1) * amp * (0.35 + 0.65 * Math.cos(t * 1.4));
      points.push([t * 0.95, y, (lane - 1) * 0.3, 0.55 + (2 - lane) * 0.2]);
    }
    return pack(shuffle(points), { spin: 0.03 });
  },

  // Un botón de reproducción.
  play(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.lineWidth = S * 0.03;
            ctx.beginPath();
            ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(S * 0.41, S * 0.33);
            ctx.lineTo(S * 0.68, S * 0.5);
            ctx.lineTo(S * 0.41, S * 0.67);
            ctx.closePath();
            ctx.fill();
          },
          { count, depth: 0.12 }
        )
      ),
      { spin: 0.016 }
    );
  },

  // El perfil de Granada: la Alhambra y Sierra Nevada detrás.
  skyline(count) {
    return pack(
      shuffle(
        fromDrawing(
          (ctx, S) => {
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(0, S * 0.56);
            ctx.lineTo(S * 0.26, S * 0.26);
            ctx.lineTo(S * 0.45, S * 0.44);
            ctx.lineTo(S * 0.66, S * 0.2);
            ctx.lineTo(S, S * 0.56);
            ctx.lineTo(S, S * 0.6);
            ctx.lineTo(0, S * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            // Muralla y torres.
            ctx.fillRect(S * 0.08, S * 0.62, S * 0.84, S * 0.2);
            const towers = [
              [0.12, 0.46, 0.13],
              [0.37, 0.52, 0.1],
              [0.56, 0.42, 0.14],
              [0.78, 0.5, 0.11],
            ];
            for (const [x, top, w] of towers) {
              ctx.fillRect(S * x, S * top, S * w, S * (0.82 - top));
              for (let i = 0; i < 3; i++) {
                ctx.fillRect(S * (x + (w / 3) * i) + S * 0.004, S * top - S * 0.035, S * (w / 3) - S * 0.012, S * 0.035);
              }
            }
          },
          { count, depth: 0.2 }
        )
      ),
      { spin: 0.006 }
    );
  },

  // Un globo con sus paralelos y meridianos.
  globe(count) {
    const points = sphereShell(Math.round(count * 0.5), 0.8).map((p) => [p[0], p[1], p[2], 0.4]);
    const lines = count - points.length;
    for (let i = 0; i < lines; i++) {
      const r = 0.81;
      if (i % 2 === 0) {
        const lat = (((i / 2) % 7) / 6) * Math.PI - Math.PI / 2;
        const lon = rand() * Math.PI * 2;
        points.push([Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r, 1]);
      } else {
        const lon = (((i / 2) | 0) % 8) * (Math.PI / 4);
        const lat = rand() * Math.PI - Math.PI / 2;
        points.push([Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r, 1]);
      }
    }
    return pack(shuffle(points), { spin: 0.055 });
  },

  // Una galaxia: el rumbo.
  spiral(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const t = Math.pow(rand(), 0.6);
      const a = t * 5.2 + (arm * Math.PI * 2) / 3 + (rand() - 0.5) * 0.4;
      const r = t * 0.95;
      points.push([
        Math.cos(a) * r,
        Math.sin(a) * r * 0.95,
        (rand() - 0.5) * 0.18 * (1 - t * 0.6),
        0.4 + (1 - t) * 0.6,
      ]);
    }
    return pack(shuffle(points), { spin: 0.03, pitch: 0.38 });
  },
};

function textScene(label, count) {
  return pack(
    shuffle(
      fromDrawing(
        (ctx, S) => {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let size = S * 0.46;
          ctx.font = `600 ${size}px Geist, system-ui, sans-serif`;
          const wide = ctx.measureText(label).width;
          const max = S * 0.9;
          if (wide > max) {
            size *= max / wide;
            ctx.font = `600 ${size}px Geist, system-ui, sans-serif`;
          }
          ctx.fillText(label, S / 2, S / 2);
        },
        { count, depth: 0.14 }
      )
    ),
    { spin: 0.012 }
  );
}

const cache = new Map();

export function scene(name, count) {
  if (cache.has(name)) return cache.get(name);
  let built;
  if (name.startsWith('text:')) built = textScene(name.slice(5), count);
  else if (builders[name]) built = builders[name](count);
  else built = pack(shuffle(sphereShell(count)), { spin: 0.04 });
  cache.set(name, built);
  return built;
}
