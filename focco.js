// El personaje de *****: la bolita de un solo ojo, con la piel de La noche
// estrellada (Van Gogh, 1889, dominio público).
//
// Es el mismo dibujo que en la app (FoccoBall.swift y FoccoSphere.metal),
// pasado a WebGL. La técnica viene de bloub (github.com/jeremy-prt/bloub, MIT,
// © Jeremy Perret): el ojo está pintado sobre la esfera, así que al girar la
// cabeza se escorza solo; el cuadro también va pegado al cuerpo y gira con él.
// Una luz fija arriba a la izquierda y un grano mate muy suave.

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;        // lienzo, en píxeles de dispositivo
uniform vec2 uCenter;     // centro de la bola, en píxeles de dispositivo
uniform float uRadius;    // radio en píxeles de dispositivo
uniform vec3 uAngles;     // lacet, cabeceo y alabeo, en grados
uniform vec3 uBody;       // aplastado x, aplastado y, salto (en radios)
uniform vec4 uEye;        // ancho, alto (en radios), inclinación (grados), apertura
uniform vec4 uLid;        // párpado, ángulo del párpado, sonrisa, escala del ojo
uniform sampler2D uArt;
uniform float uReady;
uniform float uSkin;     // cuánto se ha desplazado el cielo dentro de la bola, en vueltas

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 c = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash(c), hash(c + vec3(1, 0, 0)), f.x);
  float b = mix(hash(c + vec3(0, 1, 0)), hash(c + vec3(1, 1, 0)), f.x);
  float d = mix(hash(c + vec3(0, 0, 1)), hash(c + vec3(1, 0, 1)), f.x);
  float e = mix(hash(c + vec3(0, 1, 1)), hash(c + vec3(1, 1, 1)), f.x);
  return mix(mix(a, b, f.y), mix(d, e, f.y), f.z);
}
vec2 rot(vec2 p, float deg) {
  float a = radians(deg), c = cos(a), s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}
float roundedBox(vec2 p, vec2 size, float r) {
  vec2 q = abs(p) - size + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  // Pantalla con la y hacia abajo, como en la app.
  vec2 s = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float R = uRadius;
  // Se aplasta apoyada en su base y sube con el salto.
  vec2 b = vec2((s.x - uCenter.x) / uBody.x,
                (s.y - uCenter.y + uBody.z * R - R * (1.0 - uBody.y)) / uBody.y) / R;
  float dist = length(b);
  if (dist >= 1.0) { gl_FragColor = vec4(0.0); return; }
  float px = 1.5 / R;
  float edge = 1.0 - smoothstep(1.0 - px, 1.0, dist);
  vec3 normal = vec3(b, sqrt(max(0.0, 1.0 - dot(b, b))));

  // La misma base de giro para la piel y para el ojo.
  vec3 c = cos(radians(uAngles));
  vec3 sn = sin(radians(uAngles));
  vec3 forward = vec3(sn.x, 0.0, c.x);
  vec3 right = vec3(c.x, 0.0, -sn.x);
  vec3 down = vec3(0.0, c.y, 0.0) + forward * sn.y;
  forward = forward * c.y - vec3(0.0, sn.y, 0.0);
  vec3 rolled = right * c.z + down * sn.z;
  down = down * c.z - right * sn.z;
  right = rolled;
  vec3 local = vec3(dot(normal, right), dot(normal, down), dot(normal, forward));

  vec2 uv = vec2(0.5 + atan(local.x, local.z) / 6.2831853, 0.5 + asin(clamp(local.y, -1.0, 1.0)) / 3.1415927);
  // El cielo se balancea un poco dentro de la bola. Los bordes del cuadro (la
  // costura) quedan siempre detrás, donde no se ven.
  vec3 pigment = mix(vec3(0.16, 0.25, 0.5), texture2D(uArt, vec2(uv.x + uSkin, uv.y)).rgb, uReady);
  float light = max(0.0, dot(normal, normalize(vec3(-0.45, -0.6, 1.0))));
  float shade = 0.55 + 0.45 * light;
  float grain = (noise(local * 180.0) - 0.5) * 0.085;
  float mottling = (noise(local * 7.0) - 0.5) * 0.045;
  vec3 color = pigment * (shade + grain + mottling);

  // El ojo: se deshace la proyección para volver a su propio plano.
  if (forward.z > 0.0) {
    vec2 t = b - forward.xy;
    float det = right.x * down.y - down.x * right.y;
    vec2 m = vec2(down.y * t.x - down.x * t.y, -right.y * t.x + right.x * t.y) / det;
    vec2 q = rot(m, -uEye.z);
    float w = uEye.x * (0.186 / 0.2) * uLid.w;
    float full = uEye.y * (0.412 / 0.42) * 1.08 * uLid.w;
    float h = full * clamp(uEye.w, 0.02, 1.0);
    float d = roundedBox(q, vec2(w, h) * 0.5, min(w, h) * 0.5);
    float eye = 1.0 - smoothstep(-px, px, d);
    if (uLid.x > 0.001) {
      float lidY = -h * 0.5 + uLid.x * h;
      vec2 l = rot(q - vec2(0.0, lidY), -uLid.y);
      eye *= smoothstep(-px, px, l.y);
    }
    if (uLid.z > 0.001) {
      float r = w * 0.5;
      float cy = h * 0.5 + r - uLid.z * h * 1.05;
      eye *= smoothstep(-px, px, length(q - vec2(0.0, cy)) - r);
    }
    // Crema sobre la pintura azul, como en la app.
    color = mix(color, vec3(1.0, 0.957, 0.851), eye);
  }
  gl_FragColor = vec4(color * edge, edge);
}
`;

// ---- La vida: miradas, parpadeos y saltitos (como en la app) -------------------

const ola = (t, periodo, fase) => (Math.sin((t / periodo) * 6.283 + fase) + Math.sin((t / periodo) * 6.283 * 1.618 + fase * 2.1) * 0.5) / 1.5;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const parpadeos = (() => {
  const r = rng(0x5eed);
  const out = [];
  let t = 1.2;
  while (t < 4000) {
    out.push(t);
    if (r() < 0.22) out.push(t + 0.32);
    t += 1.9 + r() * 2.8;
  }
  return out;
})();
function parpado(t) {
  for (const b of parpadeos) {
    if (b > t) break;
    const k = (t - b) / 0.16;
    if (k < 1) return 1 - Math.sin(k * Math.PI) * 0.95;
  }
  return 1;
}

// La pose de reposo, en espejo: mira hacia la izquierda, hacia la página.
const REST = { yaw: -8, pitch: 16, roll: 6, w: 0.2, h: 0.42, tilt: 14, open: 1, lid: 0, lidAng: 0, smile: 0, es: 1, sx: 1, sy: 1, lift: 0 };

// Va cambiando de cara sola, sin moverse del sitio. Son tres de las que eligió
// Mario para la app (BallExpression): sólo cambia el ojo.
const FACES = [
  { w: 0.2, h: 0.42, tilt: 14, smile: 0 }, // reposo
  { w: 0.44, h: 0.44, tilt: 0, smile: 0.55 }, // orgulloso: el ojo en arco
  { w: 0.12, h: 0.26, tilt: 0, smile: 0, pulse: true }, // enfocado
];
const FACE_TIME = 4.2;
const easeOutQuint = (k) => 1 - Math.pow(1 - k, 5);

export function createFocco(canvas, { art, place }) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return { resize() {}, pointer() {}, poke() {} };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // En ordenador ya sigue al ratón y basta. En móvil, sin ratón, le damos más
  // vida: curiosea sola, el cielo se balancea y respira.
  const lively = matchMedia('(hover: none)').matches && !calm;
  // El lienzo ocupa su sección entera. Se mide la sección y no el lienzo para
  // que animarlo (caerse, aparecer) no descoloque lo que hay dentro.
  const frame0 = () => canvas.parentElement.getBoundingClientRect();

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ['uRes', 'uCenter', 'uRadius', 'uAngles', 'uBody', 'uEye', 'uLid', 'uArt', 'uReady', 'uSkin']) u[name] = gl.getUniformLocation(prog, name);

  // El cuadro: no es potencia de dos, así que sin mipmaps y sin repetir.
  const tex = gl.createTexture();
  let ready = 0;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 64, 128, 255]));
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) {
    gl.texParameteri(gl.TEXTURE_2D, k, v);
  }
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    ready = 1;
  };
  img.src = art;
  gl.uniform1i(u.uArt, 0);

  let dpr = 1;
  let w = 0;
  let h = 0;
  let spot = { x: 0, y: 0, r: 100 };
  let visible = true;

  function resize() {
    const rect = frame0();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    spot = place(w, h);
  }

  // Hacia dónde mira: el ratón o el dedo, relativo a su propio centro. Si
  // nadie lo mueve en un rato, curiosea por su cuenta.
  let follow = { yaw: 0, pitch: 0 };
  let followNow = { yaw: 0, pitch: 0 };
  let pointedAt = -10;
  function pointer(cx, cy, live) {
    if (!live) {
      pointedAt = -10;
      return;
    }
    pointedAt = now();
    const rect = frame0();
    const dx = (cx - rect.left - spot.x) / (spot.r * 2);
    const dy = (cy - rect.top - spot.y) / (spot.r * 2);
    follow = { yaw: Math.tanh(dx * 1.4) * 30, pitch: -Math.tanh(dy * 1.4) * 22 };
  }

  // Las miradas cuando está solo: un sitio nuevo cada 1,6–3,4 s, a veces hacia
  // el texto de la izquierda, a veces arriba o abajo.
  const glances = (() => {
    const r = rng(0xf0cc0);
    const out = [];
    let t = 0;
    while (t < 4000) {
      out.push({ t, yaw: -34 + r() * 60, pitch: -14 + r() * 32 });
      t += 1.6 + r() * 1.8;
    }
    return out;
  })();
  const glance = (t) => {
    let g = glances[0];
    for (const x of glances) {
      if (x.t > t) break;
      g = x;
    }
    return g;
  };

  // El cielo del cuadro se balancea despacio y el scroll le da un empujón que
  // se va apagando. Nunca pasa de una décima de vuelta: así no asoma la costura.
  let skin = 0;
  let skinKick = 0;
  let lastScroll = window.scrollY;

  const start = performance.now() / 1000;
  const now = () => performance.now() / 1000 - start;
  let pokedAt = -10;
  // Tocarla: se sorprende y abre mucho el ojo (sin saltar).
  function poke(cx, cy) {
    const rect = frame0();
    if (Math.hypot(cx - rect.left - spot.x, cy - rect.top - spot.y) < spot.r) pokedAt = now();
  }

  let last = performance.now();
  let frameId = null;
  function frame(ms) {
    frameId = null;
    if (document.hidden || !visible) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(64, ms - last) / 16.667;
    last = ms;
    const t = now();
    const p = { ...REST };

    // La cara de ahora, viniendo de la anterior.
    const n = Math.floor(t / FACE_TIME);
    const from = FACES[(n + FACES.length - 1) % FACES.length];
    const to = FACES[n % FACES.length];
    const k0 = n === 0 ? 1 : easeOutQuint(clamp((t - n * FACE_TIME) / 0.45, 0, 1));
    for (const key of ['w', 'h', 'tilt', 'smile']) p[key] = from[key] + (to[key] - from[key]) * k0;
    if (to.pulse && !calm) p.es *= 1 + Math.sin(t * 1.4) * 0.06 * k0;

    if (!calm) {
      p.yaw += ola(t, 11.3, 0.4) * 5.5 + ola(t, 3.7, 2.1) * 1.6;
      p.pitch += ola(t, 9.1, 1.3) * 4.2 + ola(t, 4.3, 0.7) * 1.3;
      p.roll += ola(t, 13.7, 3.2) * 2.2;
      p.open *= parpado(t);
    }
    if (t - pointedAt > 2.5) follow = lively ? glance(t) : { yaw: 0, pitch: 0 };
    const k = 1 - Math.pow(0.9, dt);
    followNow.yaw += (follow.yaw - followNow.yaw) * k;
    followNow.pitch += (follow.pitch - followNow.pitch) * k;
    p.yaw += followNow.yaw;
    p.pitch += followNow.pitch;

    if (lively) {
      // Respira: se ensancha y se encoge un pelo, apoyada en su base.
      const breath = Math.sin(t * 1.7);
      p.sx *= 1 + breath * 0.012;
      p.sy *= 1 - breath * 0.015;
      const scrolled = window.scrollY - lastScroll;
      skinKick = clamp(skinKick * Math.pow(0.96, dt) + scrolled * 0.00004, -0.06, 0.06);
      skin = Math.sin(t * 0.22) * 0.045 + skinKick;
    }
    lastScroll = window.scrollY;

    const tp = t - pokedAt;
    if (tp < 0.7) {
      const s = Math.exp(-tp * 6);
      p.w += (0.34 - p.w) * s;
      p.h += (0.44 - p.h) * s;
      p.open = Math.max(p.open, s);
      p.es += (1.15 - p.es) * s;
    }

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uCenter, spot.x * dpr, spot.y * dpr);
    gl.uniform1f(u.uRadius, spot.r * dpr);
    gl.uniform3f(u.uAngles, p.yaw, p.pitch, p.roll);
    gl.uniform3f(u.uBody, p.sx, p.sy, p.lift);
    // Ojo de Grok, en espejo: inclinado hacia el otro lado.
    gl.uniform4f(u.uEye, p.w, p.h, p.tilt * 0.5 + 16, p.open);
    gl.uniform4f(u.uLid, p.lid, p.lidAng, p.smile, p.es);
    gl.uniform1f(u.uReady, ready);
    gl.uniform1f(u.uSkin, skin);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Al ocultarse el personaje o la pestaña, se cancela el siguiente frame.
  function syncAnimation() {
    if (document.hidden || !visible) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    } else if (frameId === null) {
      last = performance.now();
      lastScroll = window.scrollY;
      frameId = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', syncAnimation);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    }).observe(canvas);
  }

  resize();
  syncAnimation();
  return { resize, pointer, poke };
}
