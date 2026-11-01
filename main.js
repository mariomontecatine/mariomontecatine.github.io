// Monta la página a partir de content.js: la entrada, la primera pantalla con
// la nube de puntos sobre los proyectos y la segunda con el retrato grande.

import { site, tabs } from './content.js';
import { createCloud } from './dots.js';
import { scene, portrait, logo } from './scenes.js';
import { createFocco } from './focco.js';
import { runIntro } from './intro.js';

const narrow = window.innerWidth < 880;
const COUNT = narrow ? 3000 : 6500;
const SHAPE = Math.round(COUNT * 0.55);

const $ = (id) => document.getElementById(id);
const root = document.documentElement;

let lang = root.lang === 'en' ? 'en' : 'es';
const t = (v) => (typeof v === 'string' ? v : v[lang]);

// ---- Las dos nubes --------------------------------------------------------------

const slot = $('slot');
const cloud = createCloud($('stage'), {
  count: COUNT,
  area: () => {
    const r = slot.getBoundingClientRect();
    if (window.innerWidth < 880) return r;
    // En escritorio la nube aprovecha casi todo el alto del hueco.
    return { left: r.left, top: r.top, width: r.width, height: r.height, r: Math.min(r.width / 2.3, r.height * 0.52) };
  },
});
cloud.setScene(scene('rings', SHAPE)); // mientras carga la foto

// El personaje, en el sitio y del tamaño del de Bloub: medido allí a 1440 × 900,
// el centro queda a 0,14 altos del borde derecho y a media altura, y el radio
// es 0,39 altos, así que se sale por la derecha. En móvil, como allí: arriba,
// centrada y entera, con el panel debajo (el hueco lo reserva el CSS).
const about = $('sobre-mi');
const focco = createFocco($('focco'), {
  art: 'assets/starry-night.jpg',
  place: (w, h) => {
    if (w < 880) return { x: w / 2, y: 84 + w * 0.285, r: w * 0.285 };
    return { x: w - h * 0.142, y: h * 0.517, r: h * 0.387 };
  },
});
about.addEventListener('click', (e) => focco.poke(e.clientX, e.clientY));

let face = null;
const home = () => face || scene('rings', SHAPE);
const photo = new Image();
photo.decoding = 'async';
photo.src = 'assets/portrait-dots-dark.png';
photo.onload = () => {
  face = portrait(photo, { count: COUNT });
  if (!active) cloud.setScene(home());
};

// Los logos de las webs de clientes, en puntos. Se cargan aparte; hasta
// entonces la fila dibuja el nombre.
const logos = {};
for (const tab of tabs) {
  for (const item of tab.items) {
    if (!item.logo) continue;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      logos[item.logo] = logo(img, { count: SHAPE });
    };
    img.src = `assets/logos/${item.logo}.png`;
  }
}
const sceneFor = (item) => logos[item.logo] || scene(item.scene, SHAPE);

// ---- La pista y la descripción de cada proyecto -------------------------------

const caption = $('caption');
let active = null;

// Sin proyecto elegido, la descripción queda vacía.
function clearCaption() {
  caption.classList.remove('in');
  caption.innerHTML = '';
}

function show(row) {
  if (active === row) return;
  active = row;
  for (const r of document.querySelectorAll('.row')) r.classList.toggle('on', r === row);

  if (!row) {
    cloud.setScene(home());
    clearCaption();
    return;
  }

  const item = row._item;
  cloud.setScene(sceneFor(item));
  caption.classList.remove('in');
  void caption.offsetWidth; // reinicia la animación
  caption.innerHTML = `<b></b><span></span>`;
  caption.querySelector('b').textContent = t(item.title);
  caption.querySelector('span').textContent = t(item.line);
  // Los enlaces van aquí, a la vista y a propósito, nunca en la fila.
  const links = [];
  if (item.web) links.push({ name: t(site.visit), href: item.web });
  if (item.href) links.push({ name: t(site.code), href: item.href });
  for (const c of item.clients || []) links.push(c.href ? { name: `${c.name} ↗`, href: c.href } : { name: `${c.name} · ${t(site.soon)}` });
  if (links.length) {
    const box = document.createElement('span');
    box.className = 'links';
    for (const l of links) {
      const el = document.createElement(l.href ? 'a' : 'span');
      el.textContent = l.name;
      if (l.href) {
        el.href = l.href;
        el.target = '_blank';
        el.rel = 'noopener';
      } else el.className = 'soon';
      box.append(el);
    }
    caption.append(box);
  }
  caption.classList.add('in');
}

// ---- Texto ---------------------------------------------------------------------

function roll(el, text) {
  el.innerHTML = '<span></span><span aria-hidden="true"></span>';
  el.children[0].textContent = text;
  el.children[1].textContent = text;
}

function paintText() {
  root.lang = lang;
  document.title = site.name;
  document.querySelector('meta[name="description"]').content = site.meta[lang];

  $('role').textContent = t(site.role);
  $('statement').textContent = t(site.statement);
  $('services').textContent = t(site.services);
  roll($('cta'), t(site.cta));
  roll($('contact'), `${t(site.nav.contact)} ↗`);
  // Una sola palabra: el idioma al que cambias.
  const other = lang === 'es' ? 'en' : 'es';
  roll($('lang'), other.toUpperCase());
  $('lang').setAttribute('aria-label', other === 'en' ? 'Switch to English' : 'Cambiar a español');

  $('nav').innerHTML = '';
  for (const [href, key] of [['#proyectos', 'work'], ['#sobre-mi', 'about']]) {
    const a = document.createElement('a');
    a.className = 'roll';
    a.href = href;
    roll(a, t(site.nav[key]));
    $('nav').append(a);
  }

  $('big').textContent = site.about.big;
  paintPanel();
  paintPlace();
}

// El panel de la segunda pantalla, a la manera de los ajustes de Bloub.
function paintPanel() {
  const panel = $('panel');
  panel.innerHTML = '';

  const heading = (text) => {
    const h = document.createElement('h2');
    h.textContent = text;
    panel.append(h);
  };

  heading(t(site.about.contact));
  const links = document.createElement('div');
  links.className = 'choices contact-choices';
  for (const link of site.links) {
    const a = document.createElement('a');
    a.className = 'choice';
    a.href = link.href;
    a.innerHTML = `<span></span><span class="mark" aria-hidden="true">${link.mail ? '→' : '↗'}</span>`;
    a.firstChild.textContent = t(link.label);
    if (!link.mail) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    links.append(a);
  }
  panel.append(links);

  const play = document.createElement('div');
  play.className = 'play';
  const h = document.createElement('h2');
  h.textContent = t(site.about.play);
  const destroy = document.createElement('a');
  destroy.className = 'destroy';
  destroy.href = site.destroy.href;
  destroy.target = '_blank';
  destroy.rel = 'noopener';
  destroy.innerHTML = `<img src="${site.destroy.badge}" alt="Destroy this website" width="180" height="40" loading="lazy" />`;
  play.append(h, destroy);
  panel.append(play);

}

// ---- Listas de proyectos -------------------------------------------------------

function buildLists() {
  const lists = $('lists');
  lists.innerHTML = '';

  for (const tab of tabs) {
    const group = document.createElement('div');
    group.className = 'group';
    const h = document.createElement('h2');
    h.className = 'mono';
    h.textContent = t(tab.heading);
    const list = document.createElement('ol');
    list.className = 'list';

    for (const item of tab.items) {
      const li = document.createElement('li');
      // Siempre un botón: tocarlo cambia el dibujo y no te lleva a ningún sitio.
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'row';
      row._item = item;
      row.innerHTML = `<span class="name"></span><span class="tag"></span><span class="go" aria-hidden="true"></span>`;
      row.querySelector('.name').textContent = t(item.title);
      row.querySelector('.tag').textContent = t(item.tag);

      row.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') show(row);
      });
      row.addEventListener('focus', () => {
        if (row.matches(':focus-visible')) show(row);
      });
      row.addEventListener('click', () => {
        show(row);
        revealDrawing();
      });

      li.append(row);
      list.append(li);
    }

    group.append(h, list);
    lists.append(group);
  }

}

// Al salir con el ratón de toda la columna (dibujo, descripción y listas) se
// vuelve al retrato; así se puede ir hasta los enlaces de la descripción.
$('proyectos').addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') show(null);
});

// En móvil el dibujo queda arriba: al tocar un proyecto, la página sube lo
// justo para verlo cambiar, con su descripción debajo.
function revealDrawing() {
  if (window.innerWidth >= 880) return;
  const r = slot.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= window.innerHeight) return;
  window.scrollTo({ top: window.scrollY + r.top - 64, behavior: calm ? 'auto' : 'smooth' });
}

function setLang(code) {
  if (code === lang) return;
  lang = code;
  try {
    localStorage.setItem('mm-lang', lang);
  } catch (e) {}
  active = null;
  paintText();
  buildLists();
  cloud.setScene(home());
  clearCaption();
}

// ---- Animaciones de la página --------------------------------------------------

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// power3.out de GSAP, la curva que usa Jeremy: arranca rápido y llega muy suave.
const SOFT = 'cubic-bezier(0.25, 1, 0.5, 1)';

// La entrada tras la intro, con la misma coreografía que la web de Jeremy:
// la descripción sube, la cabecera baja, luego la hora, y las filas entran
// desde la derecha una detrás de otra. `fill: backwards` las tiene en su
// sitio de salida durante la espera, y al acabar no queda ningún estilo.
function entrance() {
  if (calm) return;
  const from = (el, start, duration, transform) =>
    el?.animate([{ opacity: 0, transform }, { opacity: 1, transform: 'none' }], {
      duration: duration * 1000,
      delay: (0.1 + start) * 1000,
      easing: SOFT,
      fill: 'backwards',
    });
  from(document.querySelector('.statement'), 0, 0.6, 'translateY(20px)');
  from(document.querySelector('.top'), 0.2, 0.8, 'translateY(-10px)');
  from(document.querySelector('.cta'), 0.35, 0.5, 'translateY(20px)');
  from(document.querySelector('.clock'), 0.5, 0.5, 'translateY(20px)');
  from(document.querySelector('.services'), 0.6, 0.5, 'translateY(20px)');
  const rows = document.querySelectorAll('.caption, .group h2, ol.list li');
  rows.forEach((el, i) => from(el, 0.3 + i * 0.06, 0.5, el.matches('li') ? 'translateX(20px)' : 'translateY(20px)'));
  $('stage').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 400, easing: SOFT, fill: 'backwards' });
}

// Cambiar de idioma: a la página le entra gravedad y todo se cae girando,
// sin encogerse, hasta salir por abajo; después lo nuevo nace pieza a pieza, casi a
// la vez y con suavidad.
const PIECES = '.logo, .role, .nav > a, .end > *, .statement, .cta, .clock, .services, .caption, .group h2, ol.list li, .panel h2, .panel .choice, .panel .destroy, .big, #stage, #focco';
const onScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
};
let switching = false;

async function switchLang() {
  const next = lang === 'es' ? 'en' : 'es';
  if (calm) return setLang(next);
  if (switching) return;
  switching = true;

  const falling = [...document.querySelectorAll(PIECES)].filter(onScreen);
  await Promise.all(
    falling.map((el) => {
      const r = el.getBoundingClientRect();
      const drop = window.innerHeight - r.top + 60 + Math.random() * window.innerHeight * 0.5;
      const spin = (Math.random() - 0.5) * 60;
      const drift = (Math.random() - 0.5) * 120;
      return el.animate(
        [
          // un saltito hacia arriba antes de caer, como quien pierde el suelo
          { transform: 'none', opacity: 1, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
          { transform: `translate(${drift * 0.1}px, -12px) rotate(${spin * 0.08}deg)`, opacity: 1, offset: 0.14, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
          { transform: `translate(${drift}px, ${drop}px) rotate(${spin}deg)`, opacity: 1 },
        ],
        { duration: 780 + Math.random() * 260, delay: Math.random() * 160, fill: 'forwards' }
      ).finished;
    })
  );
  await wait(140);

  // Lo que no se rehace (el logo, los lienzos…) vuelve a su sitio, todavía
  // invisible, y en la misma tarea se pinta el idioma nuevo y nace todo.
  for (const el of falling) for (const a of el.getAnimations()) a.cancel();
  setLang(next);
  // Nace suave: se aclara desde un desenfoque, sube un poco y crece apenas,
  // casi todo a la vez, en una ola ligera de arriba abajo.
  for (const el of [...document.querySelectorAll(PIECES)].filter(onScreen)) {
    const top = Math.max(0, el.getBoundingClientRect().top) / window.innerHeight;
    const canvas = el.tagName === 'CANVAS';
    el.animate(
      [
        { opacity: 0, transform: 'translateY(16px) scale(0.94)', filter: canvas ? 'none' : 'blur(8px)' },
        { opacity: 1, transform: 'none', filter: 'none' },
      ],
      { duration: canvas ? 1000 : 800, delay: top * 220 + Math.random() * 90, easing: SOFT, fill: 'backwards' }
    );
  }
  await wait(1100);
  switching = false;
}

$('lang').onclick = switchLang;

// ---- La hora en Granada ----------------------------------------------------------

const clockFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: site.zone });

// "UTC+1" en invierno, "UTC+2" en verano: lo dice el propio navegador.
function offset() {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: site.zone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part.value.replace('GMT', 'UTC');
  } catch (e) {
    return 'UTC+1';
  }
}

function paintPlace() {
  $('place').textContent = `${site.city}, ${offset()}`;
}

let shown = '';
function tick() {
  const now = clockFormat.format(new Date());
  if (now === shown) return;
  const time = $('time');
  time.setAttribute('aria-label', now);
  if (!shown) {
    time.innerHTML = '';
    for (const ch of now) {
      const cell = document.createElement('span');
      cell.setAttribute('aria-hidden', 'true');
      if (ch === ':') cell.className = 'colon';
      cell.innerHTML = '<span></span>';
      cell.firstChild.textContent = ch;
      time.append(cell);
    }
  } else {
    // Sólo cambia la cifra que cambia, y entra rodando desde abajo.
    [...now].forEach((ch, i) => {
      if (shown[i] === ch) return;
      const cell = time.children[i];
      cell.innerHTML = '<span class="new"></span>';
      cell.firstChild.textContent = ch;
    });
    paintPlace();
  }
  shown = now;
}

// ---- Cabecera ------------------------------------------------------------------

// Arriba del todo, transparente. Al bajar se esconde; al subir vuelve con fondo.
const header = document.querySelector('.top');
let lastY = window.scrollY;
let ticking = false;
function onScroll() {
  ticking = false;
  const y = window.scrollY;
  root.classList.toggle('scrolled', y > 8);
  if (y > lastY + 6 && y > 120) header.classList.add('away');
  else if (y < lastY - 6 || y <= 120) header.classList.remove('away');
  lastY = y;
}
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) requestAnimationFrame(onScroll);
    ticking = true;
  },
  { passive: true }
);
onScroll();

// ---- Puntero y tamaño ---------------------------------------------------------

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  cloud.pointer(e.clientX, e.clientY, true);
  focco.pointer(e.clientX, e.clientY, true);
});
// En móvil no hay ratón: la bolita sigue el dedo mientras tocas o arrastras.
for (const type of ['touchstart', 'touchmove']) {
  window.addEventListener(
    type,
    (e) => {
      const f = e.touches[0];
      if (f) focco.pointer(f.clientX, f.clientY, true);
    },
    { passive: true }
  );
}
const leave = () => {
  cloud.pointer(0, 0, false);
  focco.pointer(0, 0, false);
};
document.documentElement.addEventListener('pointerleave', leave);
window.addEventListener('blur', leave);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') show(null);
});

const resizeAll = () => {
  cloud.resize();
  focco.resize();
};
let pending;
window.addEventListener('resize', () => {
  clearTimeout(pending);
  pending = setTimeout(resizeAll, 100);
});
window.addEventListener('orientationchange', () => setTimeout(resizeAll, 200));

// ---- Arranque -----------------------------------------------------------------

paintText();
buildLists();
clearCaption();
tick();
setInterval(tick, 1000);
resizeAll();
window.addEventListener('load', resizeAll);
if (document.fonts) document.fonts.ready.then(resizeAll);

// El texto puede ocupar más líneas al seleccionar un proyecto o cambiar idioma.
const layoutObserver = new ResizeObserver(resizeAll);
layoutObserver.observe(slot);
layoutObserver.observe(caption);
layoutObserver.observe(about);

// Saludos al azar, sin repetir y sin el idioma de la web: ese va al final.
const pool = site.intro.filter(([, code]) => code !== lang).map(([word]) => word);
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const finals = site.welcome[lang];
runIntro({ words: pool.slice(0, site.introCount), last: finals[Math.floor(Math.random() * finals.length)], onDone: entrance });
