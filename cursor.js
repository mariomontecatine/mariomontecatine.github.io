// El cursor de la bolita (09-11-2026): la bola del logo sin el soporte, con el
// ojo en el centro, que mira hacia donde va el ratón. Es el mismo que el de la
// web de *****, que salió del de alertcreative.com (un aro y un punto que lo
// siguen con retraso). Si se cambia allí, conviene cambiarlo aquí también.
//
// - El aro y la pupila siguen al ratón con inercia, la pupila más deprisa: al
//   moverse, la pupila se adelanta hacia donde va y, si va rápido, se sale un
//   poco del aro. Al pararse, vuelve al centro. El clic va siempre donde está
//   el ratón de verdad.
// - Quieto un rato, mira a un lado y a otro y parpadea. Al hacer clic, parpadea.
// - Sobre enlaces y botones (las filas de proyectos) se agranda y la pupila se
//   dilata.
// - Solo con ratón o trackpad (`hover: hover` y `pointer: fine`); en el móvil,
//   nada. En los campos de texto, el cursor de escribir de siempre.
// - Con «reducir movimiento», el ojo se queda quieto y el aro va pegado al
//   ratón, sin inercia ni miradas.
// - Si este archivo no carga, vuelve la flecha: el script del <head> de
//   index.html la esconde desde el principio y la devuelve a los 4 s si no ha
//   llegado `window.cursorFocco`.
//
// Va aparte de main.js: no toca la nube de puntos ni el personaje grande, que
// siguen al ratón de verdad por su cuenta (así el grande mira al pequeño).
// El aspecto está en index.html, en «El cursor de la bolita». Las medidas
// salen del logo: el aro, de 52 de grueso con un radio de 214, y la pupila, de
// 57,6, a 28 px de ancho.

const conRaton = matchMedia('(hover: hover) and (pointer: fine)');
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');

// Lo que cuenta como «se puede pulsar» y como «aquí se escribe».
const PULSABLE = 'a[href], button, [role="button"], label, summary, select, input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], input[type="range"]';
const ESCRIBIBLE = 'input:not([type="checkbox"], [type="radio"], [type="submit"], [type="button"], [type="range"], [type="color"], [type="file"]), textarea, [contenteditable=""], [contenteditable="true"]';

// Cuánto se acercan al ratón el aro y la pupila en cada fotograma a 60 Hz. Los
// de alertcreative.com: 0,14 el aro y 0,3 el punto; el aro, un pelín más ágil.
const SIGUE_ARO = 0.16;
const SIGUE_PUPILA = 0.3;
// Hasta dónde se puede alejar la pupila del centro yendo rápido (el aro mide
// 14 px de radio: con 24 se sale un poco) y cuánto mira a los lados en reposo.
const MAX_FUERA = 24;
const MIRADA = 6;

let cursor = null;
let mirada = null;
let x = 0, y = 0; // el ratón
let ax = 0, ay = 0; // el aro
let dx = 0, dy = 0; // la pupila, en la pantalla
let px = 0, py = 0; // la pupila, respecto al centro del aro (lo que se pinta)
let visible = false;
let frame = 0;
let ultimo = 0;
let reposo = 0; // temporizador de las miradas en reposo

function crear() {
  cursor = document.createElement('div');
  cursor.className = 'cursor-focco';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML =
    '<div class="cursor-focco__cuerpo">' +
    '<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="21.4" /></svg>' +
    '<span class="cursor-focco__mirada"><span class="cursor-focco__pupila"></span></span>' +
    '</div>';
  mirada = cursor.querySelector('.cursor-focco__mirada');
  document.body.appendChild(cursor);
}

function pintar() {
  cursor.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
  mirada.style.transform = `translate3d(${px}px, ${py}px, 0)`;
}

// Un paso de la animación. Se para sola cuando el aro ha llegado y la pupila
// ha vuelto al centro: quieto, no gasta nada.
function paso(ahora) {
  const dt = Math.min(ahora - (ultimo || ahora), 64);
  ultimo = ahora;
  const quieto = sinMovimiento.matches;
  // A cualquier frecuencia de pantalla (60 o 120 Hz), lo mismo por segundo.
  const k = (f) => 1 - Math.pow(1 - f, dt / 16.67);

  if (quieto) {
    ax = dx = x;
    ay = dy = y;
    px = 0;
    py = 0;
  } else {
    ax += (x - ax) * k(SIGUE_ARO);
    ay += (y - ay) * k(SIGUE_ARO);
    dx += (x - dx) * k(SIGUE_PUPILA);
    dy += (y - dy) * k(SIGUE_PUPILA);
    // La pupila va por delante del aro, hacia donde va el ratón. Yendo muy
    // rápido se sale del aro, pero se frena suave hacia MAX_FUERA.
    const ox = dx - ax;
    const oy = dy - ay;
    const d = Math.hypot(ox, oy);
    const f = d > 0 ? (MAX_FUERA * Math.tanh(d / MAX_FUERA)) / d : 0;
    px = ox * f;
    py = oy * f;
  }
  pintar();

  const llegado = Math.hypot(x - ax, y - ay) < 0.1 && Math.hypot(x - dx, y - dy) < 0.1;
  if (llegado) {
    ax = dx = x;
    ay = dy = y;
    px = 0;
    py = 0;
    pintar();
    frame = 0;
    ultimo = 0;
    programarReposo();
  } else {
    frame = requestAnimationFrame(paso);
  }
}

function mover(e) {
  if (e.pointerType === 'touch') return ocultar();
  x = e.clientX;
  y = e.clientY;
  if (!visible) aparecer();
  dejarDeMirar();
  const objetivo = e.target instanceof Element ? e.target : null;
  cursor.classList.toggle('is-escribir', Boolean(objetivo?.closest(ESCRIBIBLE)));
  cursor.classList.toggle('is-pulsable', Boolean(objetivo?.closest(PULSABLE)));
  if (!frame) frame = requestAnimationFrame(paso);
}

// Aparece donde está el ratón, sin venir volando.
function aparecer() {
  ax = dx = x;
  ay = dy = y;
  px = 0;
  py = 0;
  pintar();
  visible = true;
  cursor.classList.add('is-visible');
}

function ocultar() {
  visible = false;
  cursor.classList.remove('is-visible');
  dejarDeMirar();
}

// En reposo: de vez en cuando mira a un lado (con una transición de CSS, sin
// animación de JS) y parpadea. Con «reducir movimiento», nada.
function programarReposo() {
  clearTimeout(reposo);
  if (sinMovimiento.matches || !visible) return;
  reposo = setTimeout(() => {
    if (Math.random() < 0.4) {
      parpadear();
    } else {
      const angulo = Math.random() * Math.PI * 2;
      const r = MIRADA * (0.55 + Math.random() * 0.4);
      cursor.classList.add('is-mirando');
      px = Math.cos(angulo) * r;
      py = Math.sin(angulo) * r * 0.8;
      pintar();
      // Se queda un momento mirando y vuelve al centro.
      reposo = setTimeout(() => {
        px = 0;
        py = 0;
        pintar();
        programarReposo();
      }, 700 + Math.random() * 900);
      return;
    }
    programarReposo();
  }, 1800 + Math.random() * 2600);
}

// Al moverse, deja de mirar a los lados: la pupila sigue desde donde estaba.
function dejarDeMirar() {
  clearTimeout(reposo);
  if (cursor.classList.contains('is-mirando')) {
    cursor.classList.remove('is-mirando');
    dx = ax + px;
    dy = ay + py;
  }
}

function parpadear() {
  if (sinMovimiento.matches) return;
  cursor.classList.remove('is-parpadeo');
  // Para poder repetirlo seguido.
  void cursor.offsetWidth;
  cursor.classList.add('is-parpadeo');
}

// Al recargar, la página nueva no sabe dónde está el ratón hasta que se mueve,
// y mientras tanto no habría cursor. Se apunta dónde estaba y la siguiente lo
// pinta ahí mismo.
const CLAVE = 'cursor-focco';
function recordar() {
  if (!visible) return;
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ x, y, t: Date.now() }));
  } catch (e) {}
}
function recuperar() {
  try {
    const r = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
    if (r && Date.now() - r.t < 15000 && Number.isFinite(r.x) && Number.isFinite(r.y)) {
      x = r.x;
      y = r.y;
      aparecer();
    }
  } catch (e) {}
}

function pulsar(e) {
  if (e.pointerType === 'touch') return;
  cursor.classList.add('is-pulsado');
  parpadear();
  recordar();
}
const soltar = () => cursor.classList.remove('is-pulsado');
// Al salir de la ventana se esconde.
const salir = (e) => {
  if (!e.relatedTarget) ocultar();
};
const finParpadeo = () => cursor.classList.remove('is-parpadeo');

function encender() {
  if (cursor) return;
  crear();
  document.documentElement.classList.add('cursor-focco-activo');
  addEventListener('pointermove', mover, { passive: true });
  // Al cargar la página con el ratón encima, a veces llega antes esto que un movimiento.
  addEventListener('pointerover', mover, { passive: true });
  addEventListener('pointerdown', pulsar, { passive: true });
  addEventListener('pagehide', recordar);
  addEventListener('pointerup', soltar, { passive: true });
  document.addEventListener('mouseout', salir);
  cursor.querySelector('.cursor-focco__pupila').addEventListener('animationend', finParpadeo);
  recuperar();
}

function apagar() {
  if (!cursor) return;
  cancelAnimationFrame(frame);
  clearTimeout(reposo);
  frame = 0;
  ultimo = 0;
  removeEventListener('pointermove', mover);
  removeEventListener('pointerover', mover);
  removeEventListener('pagehide', recordar);
  removeEventListener('pointerdown', pulsar);
  removeEventListener('pointerup', soltar);
  document.removeEventListener('mouseout', salir);
  document.documentElement.classList.remove('cursor-focco-activo');
  cursor.remove();
  cursor = null;
  visible = false;
}

// Si se conecta o se quita un ratón (un iPad con trackpad), se enciende o se apaga.
const decidir = () => (conRaton.matches ? encender() : apagar());
// Para el script del <head> que esconde la flecha desde el primer momento: si
// esto no llega a cargar, la vuelve a poner.
window.cursorFocco = true;
conRaton.addEventListener('change', decidir);
decidir();
