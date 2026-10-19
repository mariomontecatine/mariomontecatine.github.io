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

function sampler(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c.getContext('2d', { willReadFrequently: true });
}

// draw(ctx, S) pinta en blanco sobre negro; se queda con los píxeles encendidos.
function fromDrawing(draw, { count = 2600, depth = 0, jitter = 0.5, resolution = SIZE, weighted = false } = {}) {
  const SIZE = resolution;
  const ctx = sampler(SIZE);
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
      if (v > (weighted ? 0.12 : 0.35) && (!weighted || rand() < v * v)) hits.push([x, y, v]);
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
  focco(count) {
    // Geometría del logo original, incluido el grosor y la base redondeada.
    const points = fromDrawing((ctx, S) => {
      ctx.scale(S / 1080, S / 1080);
      ctx.lineWidth = 52;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(521, 430, 214, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(663, 600);
      ctx.lineTo(761, 752);
      ctx.lineTo(629, 864);
      ctx.moveTo(485, 864);
      ctx.lineTo(773, 864);
      ctx.stroke();
    }, { count: Math.round(count * 0.87), resolution: 420, jitter: 0.4 });
    for (let i = points.length; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 57.5;
      points.push([(468 + Math.cos(a) * r) / 540 - 1,
        (459 + Math.sin(a) * r) / 540 - 1, -0.015, 1, 1.8]);
    }
    return pack(shuffle(points), { crisp: true, spin: 0.025 });
  },

  knight(count) {
    count = Math.round(count * 1.6);
    // Cabeza tallada con dos caras curvas y cantos; peana de revolución.
    const S = 360;
    const ctx = sampler(S);
    ctx.fillStyle = '#fff';
    const profile = new Path2D('M 114 286 C 115 252 139 232 145 204 L 146 161 L 125 173 L 92 166 L 72 147 Q 68 138 81 126 L 120 97 L 136 65 L 142 28 L 164 51 L 188 22 L 191 58 C 231 78 248 116 250 160 C 251 207 226 237 238 286 Z');
    ctx.fill(profile);
    // Ojo y separación de la boca, perforados en ambos lados del caballo.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(144, 105, 7, 5, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(78, 145); ctx.lineTo(111, 149); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    const data = ctx.getImageData(0, 0, S, S).data;
    const hits = [];
    const edge = [];
    const inside = (x, y) => x >= 0 && y >= 0 && x < S && y < S && data[(y * S + x) * 4 + 3] > 128;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!inside(x, y)) continue;
      hits.push([x, y]);
      if (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2)) edge.push([x, y]);
    }
    shuffle(hits); shuffle(edge);
    const points = [];
    const body = Math.round(count * 0.65);
    for (let i = 0; i < body; i++) {
      const [x, y] = hits[i % hits.length];
      const halfDepth = 0.11 + 0.08 * Math.sin(Math.min(1, y / 286) * Math.PI / 2);
      const rounded = 0.8 + 0.2 * Math.cos((x - 175) / 110 * Math.PI / 2);
      const front = i % 2 === 0;
      points.push([(x - 175) / 155, (y - 179) / 165,
        (front ? -1 : 1) * halfDepth * rounded, front ? 1 : 0.62, 1.65]);
    }
    const sides = Math.round(count * 0.13);
    for (let i = 0; i < sides; i++) {
      const [x, y] = edge[i % edge.length];
      const halfDepth = 0.11 + 0.08 * Math.sin(Math.min(1, y / 286) * Math.PI / 2);
      points.push([(x - 175) / 155, (y - 179) / 165, (rand() * 2 - 1) * halfDepth, 0.85, 1.7]);
    }
    const rings = [[0.65, 0.43], [0.68, 0.49], [0.73, 0.49], [0.77, 0.40], [0.83, 0.45], [0.91, 0.59], [0.98, 0.59]];
    while (points.length < count) {
      const segment = Math.floor(rand() * (rings.length - 1));
      const a = rings[segment], b = rings[segment + 1];
      const t = rand(), angle = rand() * Math.PI * 2;
      const r = a[1] + (b[1] - a[1]) * t;
      points.push([Math.cos(angle) * r, a[0] + (b[0] - a[0]) * t, Math.sin(angle) * r, 0.9, 1.8]);
    }
    return pack(shuffle(points), { yaw: -0.42, sway: 0.22, pitch: -0.05, crisp: true });
  },

  // Tokio: perfil urbano en dos planos, con huecos entre los edificios.
  tokyo(count) {
    const points = fromDrawing((ctx, S) => {
      ctx.translate(S * 0.025, S * 0.19);
      ctx.scale(S * 0.00095, S * 0.00095);
      ctx.lineWidth = 3;
      const base = 610;
      const line = (coords) => {
        ctx.beginPath();
        coords.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.stroke();
      };
      const building = (x, top, w, windows = true) => {
        ctx.strokeRect(x, top, w, base - top);
        if (windows) {
          for (let y = top + 15; y < base - 8; y += 16) {
            for (let xx = x + 9; xx < x + w - 5; xx += 13) ctx.fillRect(xx, y, 3, 5);
          }
        }
      };
      // Fondo: torres gemelas y edificios de distintas alturas.
      ctx.globalAlpha = 0.64;
      building(128, 435, 65);
      building(204, 395, 47);
      line([[226, 395], [226, 358], [230, 358], [230, 335]]);
      building(320, 345, 68);
      building(526, 305, 58);
      building(603, 305, 58);
      line([[526, 305], [551, 282], [584, 305]]);
      line([[603, 305], [635, 282], [661, 305]]);
      building(585, 465, 17, false);
      building(728, 442, 43);
      building(784, 410, 45);
      line([[789, 410], [806, 391], [819, 410]]);
      building(847, 381, 59);
      line([[847, 381], [847, 364], [906, 390]]);
      building(930, 468, 45);
      ctx.globalAlpha = 1;

      // Skytree: antena, dos plataformas y cuerpo estrecho.
      line([[438, base], [447, 340], [452, 266], [454, 218], [461, 218], [464, 266], [469, 340], [480, base]]);
      line([[457, 218], [457, 87]]);
      ctx.strokeRect(453, 110, 8, 84);
      line([[447, 272], [442, 259], [442, 247], [473, 247], [473, 259], [466, 272]]);
      line([[446, 340], [435, 316], [434, 302], [480, 302], [479, 316], [469, 340]]);
      line([[438, 315], [476, 315]]);
      for (const x of [448, 457, 470]) line([[457, 340], [x, base]]);

      // Torre de Tokio: patas abiertas, travesaños y antena.
      ctx.clearRect(267, 468, 61, 142);
      line([[257, base], [281, 552], [298, 451], [305, 367], [311, 451], [328, 552], [352, base]]);
      line([[305, 367], [305, 261]]);
      ctx.strokeRect(299, 365, 12, 12);
      ctx.strokeRect(282, 477, 46, 9);
      line([[278, 550], [332, 550]]);
      line([[284, 537], [322, 501], [290, 501], [329, 537]]);
      line([[271, 573], [339, 573]]);
      line([[267, base], [305, 568], [342, base]]);

      // Cocoon Tower: silueta curva y diagonales visibles.
      ctx.clearRect(669, 390, 55, 220);
      ctx.beginPath();
      ctx.moveTo(693, 385);
      ctx.bezierCurveTo(641, 459, 655, 558, 681, base);
      ctx.lineTo(705, base);
      ctx.bezierCurveTo(733, 550, 743, 459, 693, 385);
      ctx.stroke();
      line([[693, 404], [671, 482], [714, 545], [685, 602]]);
      line([[693, 404], [718, 482], [672, 545], [702, 602]]);
      for (let y = 459; y < base; y += 24) line([[676, y], [711, y]]);

      // Primer plano: templo, puerta tradicional y pabellón ovalado.
      const roof = (x, y, w) => {
        ctx.clearRect(x, y, w, 20);
        line([[x, y - 6], [x + 14, y + 5], [x + w / 2, y + 10], [x + w - 14, y + 5], [x + w, y - 6]]);
        line([[x, y - 6], [x + 20, y + 20], [x + w - 20, y + 20], [x + w, y - 6]]);
      };
      ctx.clearRect(45, 512, 72, 98);
      building(54, 545, 52, false);
      roof(35, 534, 91);
      roof(46, 513, 69);
      line([[73, base], [73, 568], [88, 568], [88, base]]);
      ctx.clearRect(150, 515, 110, 95);
      building(162, 534, 87, false);
      roof(143, 503, 125);
      roof(137, 548, 137);
      for (const x of [174, 198, 223]) ctx.strokeRect(x, 579, 14, 31);
      ctx.clearRect(760, 536, 166, 74);
      ctx.beginPath();
      ctx.ellipse(842, 575, 88, 37, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let x = 780; x <= 904; x += 21) {
        line([[x, 545], [x - 7, 575], [x, 605]]);
      }
      line([[756, 574], [929, 574]]);
      line([[0, base], [1000, base]]);
    }, { count: Math.round(count * 1.6), depth: 0.045, jitter: 0.4, resolution: 480 });
    return pack(shuffle(points.map(p => [...p, 1.6])), { sway: 0.025, crisp: true });
  },

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

  // Terminal: el texto se muestrea una vez; el reloj revela cada carácter.
  terminal(count) {
    const budget = Math.round(count * 1.55);
    const points = [];
    const add = list => points.push(...list);
    add(fromDrawing((ctx, S) => {
      ctx.lineWidth = S * 0.006;
      ctx.beginPath();
      ctx.roundRect(S * 0.04, S * 0.19, S * 0.92, S * 0.61, S * 0.025);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S * 0.04, S * 0.285); ctx.lineTo(S * 0.96, S * 0.285); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(S * (0.085 + i * 0.035), S * 0.238, S * 0.009, 0, Math.PI * 2); ctx.fill();
      }
    }, { count: Math.round(budget * 0.27), resolution: 480, jitter: 0.2 }));

    // Pequeño guion de tecleo y retrocesos. Cada paso conserva lo ya escrito.
    const script = [{ at: 0, text: '' }];
    const type = (start, prefix, text, step) => {
      for (let i = 1; i <= text.length; i++) script.push({ at: start + (i - 1) * step, text: prefix + text.slice(0, i) });
    };
    type(0.35, '', '2+2 = 5', 0.14);
    script.push({ at: 2.7, text: '2+2 = ' }, { at: 3.05, text: '2+2 = 6' },
      { at: 4.35, text: '2+2 = ' }, { at: 4.7, text: '2+2 = 3' },
      { at: 6.0, text: '2+2 = ' });
    const rage = 'rasdfjdfasdasjshdfasdpa';
    type(6.65, '2+2 = ', rage, 0.045);
    const full = '2+2 = ' + rage;
    for (let i = 1; i <= full.length; i++) script.push({ at: 8.4 + (i - 1) * 0.035, text: full.slice(0, -i) });

    const columns = 23;
    const slots = full.length;
    const charWidth = 0.0332;
    const perGlyph = Math.floor(budget * 0.68 / slots);
    const glyphs = new Map();
    for (const char of new Set('2+ =563' + rage)) {
      glyphs.set(char, char === ' ' ? [] : fromDrawing((ctx, S) => {
        ctx.font = `500 ${S * 0.055}px monospace`;
        ctx.fillText(char, S * 0.10, S * 0.46);
      }, { count: perGlyph, resolution: 480, jitter: 0.12 }));
    }
    const textStart = points.length;
    for (let i = 0; i < slots * perGlyph; i++) points.push([-0.8, -0.08, 0, 0, 1.8]);
    const cursorStart = points.length;
    add(fromDrawing((ctx, S) => {
      ctx.fillRect(S * 0.10, S * 0.412, S * 0.023, S * 0.055);
    }, { count: 90, resolution: 480, jitter: 0.1 }));
    const built = pack(points, { crisp: true, lean: 0.18, sway: 0.018 });
    const cursorHome = new Float32Array(built.pos.slice(cursorStart * 3));
    let previousText = null;
    built.update = (elapsed, calm) => {
      const t = calm ? 1.8 : elapsed % 10.7;
      let frame = script[0];
      for (const candidate of script) { if (candidate.at > t) break; frame = candidate; }
      if (frame.text !== previousText) {
        for (let slot = 0; slot < slots; slot++) {
          const glyph = glyphs.get(frame.text[slot]) || [];
          const dx = slot % columns * charWidth * 2;
          const dy = Math.floor(slot / columns) * 0.20;
          for (let j = 0; j < perGlyph; j++) {
            const i = textStart + slot * perGlyph + j;
            const p = glyph.length ? glyph[j % glyph.length] : null;
            built.alpha[i] = p ? p[3] : 0;
            if (p) {
              built.pos[i * 3] = p[0] + dx;
              built.pos[i * 3 + 1] = p[1] + dy;
            }
          }
        }
        previousText = frame.text;
      }
      const chars = frame.text.length;
      const active = !calm && t - frame.at < 0.2;
      for (let i = cursorStart; i < built.n; i++) {
        const j = (i - cursorStart) * 3;
        built.pos[i * 3] = cursorHome[j] + chars % columns * charWidth * 2;
        built.pos[i * 3 + 1] = cursorHome[j + 1] + Math.floor(chars / columns) * 0.20;
        built.alpha[i] = calm || active || Math.sin(t * Math.PI * 2.4) > 0 ? 0.95 : 0;
      }
    };
    return built;
  },

  // Veleta visto desde Hoya de la Mora: perfil trazado a partir de la foto
  // de la cara oeste, con los tajos de la cumbre y la ladera larga a la derecha.
  // Referencia: montanaycorazon.com/pico-veleta-3396-m-sierra-nevada/
  mountain(count) {
    const points = fromDrawing((ctx, S) => {
      ctx.translate(S * 0.045, S * 0.12);
      ctx.scale(S / 900, S / 600);
      ctx.translate(-100, -130);
      const path = (coords, fill, stroke, width = 2) => {
        ctx.beginPath();
        coords.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
      };
      // Cumbre asimétrica, resaltes del Salón y caída de los tajos.
      const ridge = [[108, 298], [168, 285], [214, 269], [246, 274],
        [277, 273], [300, 255], [319, 264], [342, 258], [350, 242],
        [365, 239], [376, 244], [381, 214], [396, 218], [411, 222],
        [436, 220], [451, 223], [478, 238], [512, 249], [550, 258],
        [591, 270], [633, 282], [673, 294], [714, 308], [752, 326],
        [788, 345], [816, 365], [856, 382], [908, 414]];
      path([...ridge, [890, 451], [812, 460], [718, 448], [638, 456],
        [550, 439], [474, 447], [387, 421], [310, 425], [223, 401], [130, 419]], '#9b9b9b');
      // Roca vertical bajo la cima: las dos discontinuidades son parte del perfil.
      path([[381, 215], [400, 222], [435, 221], [420, 240], [430, 259],
        [409, 269], [376, 266]], '#454545');
      path([[350, 243], [367, 241], [376, 249], [374, 267], [343, 271]], '#686868');
      // Placas y bandas de nieve que siguen la pendiente, sin casquete triangular.
      path([[437, 224], [482, 243], [565, 266], [660, 296], [752, 335],
        [813, 374], [779, 365], [718, 337], [650, 315], [574, 288],
        [504, 270], [458, 251]], '#fff');
      path([[438, 259], [506, 279], [588, 307], [657, 335], [726, 361],
        [786, 389], [736, 378], [661, 353], [580, 328], [513, 302], [459, 287], [403, 280]], '#ededed');
      path([[292, 280], [365, 274], [421, 283], [387, 293], [326, 291], [255, 301], [183, 307]], '#e5e5e5');
      path([[196, 337], [270, 319], [338, 316], [405, 329], [499, 350],
        [601, 382], [694, 414], [771, 432], [715, 432], [625, 410],
        [521, 380], [427, 356], [347, 336], [281, 335]], '#fafafa');
      path([[151, 388], [231, 365], [313, 357], [381, 370], [449, 390],
        [519, 413], [455, 404], [376, 385], [308, 377], [235, 385]], '#d0d0d0');
      // Estratos cortos y grietas, orientados como la roca de la referencia.
      for (const seam of [
        [[455, 247], [484, 255], [510, 262]],
        [[473, 269], [526, 287], [548, 295]],
        [[550, 280], [586, 292], [609, 304]],
        [[606, 310], [654, 328], [690, 339]],
        [[451, 306], [492, 322], [531, 333]],
        [[701, 367], [738, 380], [764, 393]],
        [[309, 306], [347, 302], [385, 309]],
      ]) path(seam, null, '#202020', 3);
      path(ridge, null, '#fff', 2.3);
      path([[388, 231], [386, 251], [397, 257]], null, '#b5b5b5', 2);
      path([[408, 232], [405, 247], [417, 257]], null, '#9a9a9a', 2);
    }, { count: Math.round(count * 1.6), depth: 0, resolution: 480, jitter: 0.5, weighted: true });
    // Relieve discreto, suficiente para separar las laderas al inclinar la nube.
    for (const p of points) {
      p[2] = 0.07 * Math.sin(p[0] * 5 + p[1] * 7) + p[1] * 0.08;
      p[4] = 1.5 + rand() * 0.45;
    }
    return pack(shuffle(points), { crisp: true, sway: 0.055, lean: 0.4 });
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
