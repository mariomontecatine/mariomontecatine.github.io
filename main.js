// Monta la página a partir de content.js y conecta cada fila con su figura.

import { site, tabs } from './content.js';
import { createCloud } from './dots.js';
import { scene, portrait } from './scenes.js';

// El retrato necesita muchos puntos para que se lean los rasgos; las figuras,
// que son geometría limpia, se leen con la mitad.
const COUNT = window.innerWidth < 760 ? 3000 : 6500;
const SHAPE = Math.round(COUNT * 0.55);

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const touch = matchMedia('(hover: none)').matches;

let lang = root.lang === 'en' ? 'en' : 'es';
const t = (v) => (typeof v === 'string' ? v : v[lang]);

// La nube se centra en el hueco de la columna del medio, por encima del pie.
const slot = document.querySelector('.slot');
const stageArea = () => {
  const r = slot.getBoundingClientRect();
  const caption = $('caption').getBoundingClientRect().height + 14;
  return { left: r.left, top: r.top, width: r.width, height: Math.max(160, r.height - caption) };
};

const cloud = createCloud($('stage'), { count: COUNT, area: stageArea });
cloud.setScene(scene('rings', SHAPE)); // mientras carga la foto

// Un punto oscuro sobre papel y uno claro sobre negro no dibujan lo mismo, así
// que cada tema tiene su retrato: en claro los puntos caen sobre el pelo, en
// oscuro sobre la piel y el pelo queda en silueta.
const faces = { light: null, dark: null };
const theme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const home = () => faces[theme()] || scene('rings', SHAPE);

for (const mode of ['light', 'dark']) {
  const photo = new Image();
  photo.decoding = 'async';
  photo.src = `assets/portrait-dots-${mode}.png`;
  photo.onload = () => {
    faces[mode] = portrait(photo, { count: COUNT });
    if (!active && mode === theme()) cloud.setScene(home());
  };
}

// ---- Texto -------------------------------------------------------------------

const caption = $('caption');
let active = null;

function hint() {
  caption.classList.remove('in');
  caption.innerHTML =
    `<span class="hint-mouse">${site.hint.mouse[lang]}</span>` +
    `<span class="hint-touch">${site.hint.touch[lang]}</span>`;
}

function show(row) {
  if (active === row) return;
  active = row;
  for (const r of document.querySelectorAll('.row')) r.classList.toggle('on', r === row);
  for (const list of document.querySelectorAll('ol.list')) list.classList.toggle('live', !!row && list.contains(row));

  if (!row) {
    cloud.setScene(home());
    hint();
    return;
  }

  const item = row._item;
  cloud.setScene(scene(item.scene, SHAPE));
  caption.classList.remove('in');
  void caption.offsetWidth; // reinicia la animación
  caption.innerHTML = `<b></b><span></span>`;
  caption.querySelector('b').textContent = t(item.title);
  caption.querySelector('span').textContent = t(item.line);
  caption.classList.add('in');
}

function paintText() {
  root.lang = lang;
  document.title = site.name;
  document.querySelector('meta[name="description"]').content = site.meta[lang];

  $('greet').textContent = site.hello[lang];
  $('first').textContent = site.first;
  $('foot').textContent = site.foot[lang];

  $('bio').innerHTML = '';
  for (const p of site.lede) {
    const el = document.createElement('p');
    el.textContent = p[lang];
    $('bio').append(el);
  }

  $('links').innerHTML = '';
  for (const link of site.links) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = t(link.label);
    if (link.mail) a.dataset.mail = '';
    else {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    $('links').append(a);
  }

  const en = lang === 'en';
  $('lang').textContent = en ? 'ES' : 'EN';
  $('lang').setAttribute('aria-label', en ? 'Cambiar a español' : 'Switch to English');
  const isDark = root.dataset.theme === 'dark';
  $('theme').setAttribute(
    'aria-label',
    en ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  );
}

// ---- Pestañas y listas --------------------------------------------------------

function buildIndex() {
  $('tabs').innerHTML = '';
  $('panels').innerHTML = '';

  tabs.forEach((tab, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.id = `tab-${tab.id}`;
    button.setAttribute('aria-controls', tab.id);
    button.setAttribute('aria-selected', String(i === 0));
    button.tabIndex = i === 0 ? 0 : -1;
    button.innerHTML = `${tab.label[lang]}<sup>${String(tab.items.length).padStart(2, '0')}</sup>`;
    button.onclick = () => select(i);
    $('tabs').append(button);

    const list = document.createElement('ol');
    list.className = 'list';
    list.id = tab.id;
    list.role = 'tabpanel';
    list.setAttribute('aria-labelledby', button.id);
    list.hidden = i !== 0;

    tab.items.forEach((item, n) => {
      const li = document.createElement('li');
      const row = document.createElement(item.href ? 'a' : 'button');
      row.className = 'row';
      if (item.href) {
        row.href = item.href;
        row.target = '_blank';
        row.rel = 'noopener';
      } else {
        row.type = 'button';
      }
      row._item = item;
      row.innerHTML =
        `<span class="no">${String(n + 1).padStart(2, '0')}</span>` +
        `<span class="name"></span>` +
        `<span class="tag"></span>` +
        `<span class="go" aria-hidden="true">${item.href ? '↗' : ''}</span>`;
      row.querySelector('.name').textContent = t(item.title);
      row.querySelector('.tag').textContent = t(item.tag);

      row.addEventListener('pointerenter', () => show(row));
      row.addEventListener('focus', () => show(row));
      // En táctil el primer toque enseña la figura; el segundo abre el enlace.
      row.addEventListener('click', (e) => {
        if (touch && active !== row) {
          e.preventDefault();
          show(row);
        }
      });

      li.append(row);
      list.append(li);
    });

    list.addEventListener('pointerleave', () => {
      if (!touch) show(null);
    });
    $('panels').append(list);
  });
}

function select(index) {
  tabs.forEach((tab, i) => {
    const button = $(`tab-${tab.id}`);
    button.setAttribute('aria-selected', String(i === index));
    button.tabIndex = i === index ? 0 : -1;
    $(tab.id).hidden = i !== index;
  });
  show(null);
}

$('tabs').addEventListener('keydown', (e) => {
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!step) return;
  e.preventDefault();
  const current = tabs.findIndex((tab) => $(`tab-${tab.id}`).getAttribute('aria-selected') === 'true');
  const next = (current + step + tabs.length) % tabs.length;
  select(next);
  $(`tab-${tabs[next].id}`).focus();
});

// ---- Controles ----------------------------------------------------------------

$('theme').onclick = () => {
  const dark = root.dataset.theme !== 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  try {
    localStorage.setItem('mm-theme', root.dataset.theme);
  } catch (e) {}
  $('theme').setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0e0e0f' : '#fbfbfa';
  cloud.setTheme(dark);
  // El retrato del otro tema está hecho al revés, así que se cambia también, y
  // la transición de siempre se encarga de llevar los puntos de uno a otro.
  if (!active) cloud.setScene(home());
  paintText();
};

$('lang').onclick = () => {
  lang = lang === 'es' ? 'en' : 'es';
  try {
    localStorage.setItem('mm-lang', lang);
  } catch (e) {}
  const open = tabs.findIndex((tab) => $(`tab-${tab.id}`).getAttribute('aria-selected') === 'true');
  paintText();
  buildIndex();
  select(Math.max(0, open));
};

// ---- Puntero y tamaño ---------------------------------------------------------

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  cloud.pointer(e.clientX, e.clientY, true);
});
window.addEventListener('pointerleave', () => cloud.pointer(0, 0, false));
window.addEventListener('blur', () => cloud.pointer(0, 0, false));

let pending;
window.addEventListener('resize', () => {
  clearTimeout(pending);
  pending = setTimeout(() => cloud.resize(), 100);
});
window.addEventListener('orientationchange', () => setTimeout(() => cloud.resize(), 200));

// ---- Arranque -----------------------------------------------------------------

$('theme').setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
cloud.setTheme(root.dataset.theme === 'dark');
document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#0e0e0f' : '#fbfbfa';
paintText();
buildIndex();
hint();
cloud.resize();
window.addEventListener('load', () => cloud.resize());
if (document.fonts) document.fonts.ready.then(() => cloud.resize());
