// Todo el texto del sitio vive aquí. Para cambiar la web, cambia este archivo.
// Cada cadena es { es, en }. `scene` elige la figura de puntos (ver scenes.js).

export const site = {
  name: 'Mario Montecatine',
  email: 'mario@focco.app',
  // La intro, como en la web de Jeremy: cada visita salen `introCount`
  // saludos al azar, sin repetir, de esta lista; el último va en el idioma
  // de la web (`welcome`) y se deshace en partículas.
  // Cada uno lleva su idioma para no repetir el de la web antes de tiempo.
  intro: [
    ['Hello', 'en'], ['Welcome', 'en'], ['Bonjour', 'fr'], ['Bienvenue', 'fr'], ['Enchanté', 'fr'],
    ['Ciao', 'it'], ['Benvenuto', 'it'], ['Olá', 'pt'], ['Bem-vindo', 'pt'], ['Hallo', 'de'],
    ['Willkommen', 'de'], ['Привет', 'ru'], ['Добро пожаловать', 'ru'], ['こんにちは', 'ja'], ['ようこそ', 'ja'],
    ['안녕하세요', 'ko'], ['환영합니다', 'ko'], ['你好', 'zh'], ['欢迎', 'zh'], ['مرحبا', 'ar'],
    ['أهلاً وسهلاً', 'ar'], ['Namaste', 'hi'], ['स्वागत', 'hi'], ['Hej', 'sv'], ['Välkommen', 'sv'],
    ['Γεια σου', 'el'], ['Καλώς ήρθες', 'el'], ['Merhaba', 'tr'], ['Hoş geldin', 'tr'], ['שלום', 'he'],
    ['ברוך הבא', 'he'], ['Sawubona', 'zu'], ['Jambo', 'sw'], ['Karibu', 'sw'], ['Salam', 'fa'],
    ['Hei', 'no'], ['Velkommen', 'no'], ['Cześć', 'pl'], ['Witaj', 'pl'], ['Ahoj', 'cs'],
    ['Szia', 'hu'], ['Saluton', 'eo'], ['Terve', 'fi'], ['Tervetuloa', 'fi'], ['Hoi', 'nl'],
    ['Welkom', 'nl'], ['Zdravo', 'sr'], ['Dobrodošli', 'hr'], ['Sannu', 'ha'], ['Kamusta', 'tl'],
    ['Sawasdee', 'th'], ['Croeso', 'cy'], ['Fáilte', 'ga'], ['Bon dia', 'ca'], ['Kaixo', 'eu'],
  ],
  introCount: 5,
  // La palabra final sale al azar de estas.
  welcome: { es: ['Bienvenido', 'Encantado'], en: ['Welcome', 'Nice to meet you'] },
  role: { es: 'Ingeniero de Telecomunicaciones', en: 'Telecommunications Engineer' },
  // La definición grande de abajo a la izquierda: quién soy y qué hago.
  statement: {
    es: 'Ingeniero de Telecomunicaciones en Granada, la ciudad de la Alhambra. Llevo tu proyecto digital de la idea a internet: proceso creativo, desarrollo y puesta en marcha.',
    en: 'Telecommunications engineer based in Granada, the city of the Alhambra. I take your digital project from idea to launch: creative process, development and everything technical.',
  },
  cta: { es: 'Cuéntame tu idea →', en: 'Tell me your idea →' },
  // Lo que hago, en una línea, debajo de la hora.
  services: { es: 'Webs · Apps · Automatizaciones de Instagram · Newsletters', en: 'Websites · Apps · Instagram automation · Newsletters' },
  // Lo que sale en la descripción de cada proyecto al elegirlo.
  code: { es: 'Ver el código en GitHub ↗', en: 'See the code on GitHub ↗' },
  soon: { es: 'pronto', en: 'soon' },
  visit: { es: 'Visitar la web ↗', en: 'Visit the website ↗' },
  city: 'Granada',
  zone: 'Europe/Madrid',
  meta: {
    es: 'Ingeniero en Telecomunicaciones por la UGR, de Granada. Creador de *****.',
    en: 'Telecommunications engineer from Granada, University of Granada. Building *****.',
  },
  nav: {
    work: { es: 'Proyectos', en: 'Projects' },
    about: { es: 'Sobre mí', en: 'About' },
    contact: { es: 'Contacto', en: 'Contact' },
  },
  links: [
    { label: 'GitHub', href: 'https://github.com/mariomontecatine' },
    { label: 'LinkedIn', href: 'https://es.linkedin.com/in/mariomontecatine' },
    { label: { es: 'Correo', en: 'Email' }, href: 'mailto:mario@focco.app', mail: true },
  ],
  // La segunda pantalla, la del personaje.
  about: {
    big: 'MARIO',
    contact: { es: 'Contacto', en: 'Contact' },
    play: { es: '¿Te aburres?', en: 'Bored?' },
  },
  // El juego de Sprite Fusion que destroza webs. Es sólo un enlace con su
  // imagen: no carga ningún script en esta web. Sólo funciona en ordenador.
  destroy: {
    href: 'https://destroy.spritefusion.com/?from=badge&url=https://mariomontecatine.github.io/',
    badge: 'https://destroy.spritefusion.com/badge.svg',
  },
};

export const tabs = [
  {
    id: 'work',
    label: { es: 'Trabajo', en: 'Work' },
    heading: { es: 'En lo que trabajo', en: 'What I work on' },
    items: [
      {
        title: '*****',
        tag: { es: 'Fundador', en: 'Founder' },
        scene: 'attention',
        line: {
          es: 'Un dispositivo para recuperar la atención. Diseño y desarrollo.',
          en: 'A device to get your attention back. Design and development.',
        },
      },
      {
        title: { es: 'Web freelance', en: 'Freelance web' },
        tag: { es: 'Diseño y código', en: 'Design and code' },
        scene: 'terminal',
        // Las webs de clientes, la más destacada primero. Sin `href` = aún no
        // está publicada (sale como «pronto»).
        clients: [
          { name: 'Psi con Rebeca', href: 'https://psiconrebeca.com/' },
          { name: 'Sara Montecatine', href: 'https://saramontecatine.com/' },
          { name: 'Alonso Nieto', href: 'https://mariomontecatine.github.io/alonsonieto/' },
        ],
        line: {
          es: 'Sitios para psicólogas, restaurantes y negocios locales: diseño, desarrollo y puesta en producción de principio a fin.',
          en: 'Sites for therapists, restaurants and local businesses: design, build and ship, end to end.',
        },
      },
      {
        title: { es: 'Monitor de esquí', en: 'Ski instructor' },
        tag: { es: 'Sierra Nevada', en: 'Sierra Nevada' },
        scene: 'mountain',
        line: {
          es: 'Tres temporadas en el Club de Esquí Caja Rural de Granada, enseñando a grupos de niños y adultos de todos los niveles.',
          en: 'Three seasons with Club de Esquí Caja Rural de Granada, teaching groups of children and adults at every level.',
        },
      },
    ],
  },
  {
    id: 'featured',
    label: { es: 'Destacados', en: 'Featured' },
    heading: { es: 'Proyectos destacados', en: 'Featured projects' },
    // `web` sale en la descripción como «Visitar la web»; `href`, como el código.
    items: [
      {
        title: 'Psi con Rebeca',
        tag: { es: 'Web · Newsletter · Instagram', en: 'Web · Newsletter · Instagram' },
        web: 'https://psiconrebeca.com/',
        scene: 'text:Rebeca', // mientras carga el logo
        logo: 'rebeca', // assets/logos/rebeca.png, de tools/build-logos.py
        line: {
          es: 'Su espacio de psicología, con artículos y newsletter, y un bot de Instagram que manda un mensaje privado a quien comenta una palabra.',
          en: 'Her psychology space, with articles and a newsletter, plus an Instagram bot that DMs anyone who comments a keyword.',
        },
      },
      {
        title: 'Mininet Agents',
        tag: { es: 'Redes + LLMs', en: 'Networks + LLMs' },
        href: 'https://github.com/mariomontecatine/mininet-agents',
        scene: 'network',
        line: {
          es: 'Un centro de operaciones de red autónomo: agentes LLM locales despliegan la red desde lenguaje natural, detectan ataques y los mitigan solos. 86 % de detección, pérdida de VoIP del 49,8 % al 0 %.',
          en: 'A self-driving network operations center: local LLM agents deploy the network from plain language, then detect and mitigate attacks unsupervised. 86% detection, VoIP loss from 49.8% to 0%.',
        },
      },
      {
        title: 'Alonso Nieto',
        tag: { es: 'Psicólogo · Bilbao', en: 'Psychologist · Bilbao' },
        web: 'https://mariomontecatine.github.io/alonsonieto/',
        scene: 'text:Alonso', // mientras carga el logo
        logo: 'alonso', // assets/logos/alonso.png, de tools/build-logos.py
        line: {
          es: 'Web para un psicólogo en Bilbao y online, con reseñas de pacientes y botón de WhatsApp.',
          en: 'Website for a psychologist in Bilbao and online, with patient reviews and a WhatsApp button.',
        },
      },
    ],
  },
  {
    id: 'projects',
    label: { es: 'Proyectos', en: 'Projects' },
    heading: { es: 'Otros proyectos', en: 'Other projects' },
    items: [
      {
        title: 'tokio',
        tag: { es: 'CLI y dashboard', en: 'CLI and dashboard' },
        href: 'https://github.com/mariomontecatine/tokio',
        scene: 'tokyo',
        line: {
          es: 'Encola prompts para agentes de código y los lanza en cuanto se reinicia la cuota, midiendo el gasto real de cada turno antes de comprometerlo.',
          en: 'Queues coding-agent prompts and fires them the moment the quota resets, metering what each turn really costs before committing it.',
        },
      },
      {
        title: 'freeChessAnalyzer',
        tag: { es: 'Extensión Chrome', en: 'Chrome extension' },
        href: 'https://github.com/mariomontecatine/freeChessAnalyzer',
        scene: 'knight',
        line: {
          es: 'Exporta partidas de Chess.com a Lichess con un clic. Aprender de tus errores debería ser gratis.',
          en: 'Exports Chess.com games to Lichess in one click. Learning from your mistakes should be free.',
        },
      },
    ],
  },
];
