// Todo el texto del sitio vive aquí. Para cambiar la web, cambia este archivo.
// Cada cadena es { es, en }. `scene` elige la figura de puntos (ver scenes.js).

export const site = {
  name: 'Mario Montecatine',
  email: 'mario@focco.app',
  hello: { es: 'Hola, soy', en: "Hi, I'm" },
  first: 'Mario.',
  lede: [
    {
      es: 'De la ciudad de la Alhambra. He estudiado Ingeniería en Telecomunicaciones en la UGR.',
      en: 'From the city of the Alhambra. I studied Telecommunications Engineering at the University of Granada.',
    },
    {
      es: 'Ahora construyo focco, una app para recuperar la atención.',
      en: "Right now I'm building focco, an app to get your attention back.",
    },
  ],
  meta: {
    es: 'Ingeniero en Telecomunicaciones por la UGR, de Granada. Creador de focco.',
    en: 'Telecommunications engineer from Granada, University of Granada. Building focco.',
  },
  links: [
    { label: 'GitHub', href: 'https://github.com/mariomontecatine' },
    { label: 'LinkedIn', href: 'https://es.linkedin.com/in/mariomontecatine' },
    { label: { es: 'Correo', en: 'Email' }, href: 'mailto:mario@focco.app', mail: true },
  ],
  hint: {
    mouse: {
      es: 'Pasa el ratón por cualquier cosa de la derecha para verla en puntos.',
      en: 'Hover anything on the right to see it in dots.',
    },
    touch: {
      es: 'Toca cualquier cosa de abajo para verla en puntos.',
      en: 'Tap anything below to see it in dots.',
    },
  },
  foot: { es: 'Hecho en Granada', en: 'Made in Granada' },
};

export const tabs = [
  {
    id: 'work',
    label: { es: 'Trabajo', en: 'Work' },
    items: [
      {
        title: 'focco',
        tag: { es: 'Fundador', en: 'Founder' },
        href: 'https://focco.app',
        scene: 'rings',
        line: {
          es: 'App y extensión para bloquear lo que te distrae y devolverte las horas de concentración. Diseño, código y envío.',
          en: 'An app and extension that blocks what distracts you and gives your focused hours back. Design, code and shipping.',
        },
      },
      {
        title: { es: 'Web freelance', en: 'Freelance web' },
        tag: { es: 'Diseño y código', en: 'Design and code' },
        scene: 'browser',
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
    id: 'projects',
    label: { es: 'Proyectos', en: 'Projects' },
    items: [
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
        title: 'tokio',
        tag: { es: 'CLI y dashboard', en: 'CLI and dashboard' },
        href: 'https://github.com/mariomontecatine/tokio',
        scene: 'clock',
        line: {
          es: 'Encola prompts para agentes de código y los lanza en cuanto se reinicia la cuota, midiendo el gasto real de cada turno antes de comprometerlo.',
          en: 'Queues coding-agent prompts and fires them the moment the quota resets, metering what each turn really costs before committing it.',
        },
      },
      {
        title: 'freeChessAnalyzer',
        tag: { es: 'Extensión Chrome', en: 'Chrome extension' },
        href: 'https://github.com/mariomontecatine/freeChessAnalyzer',
        scene: 'chess',
        line: {
          es: 'Exporta partidas de Chess.com a Lichess con un clic. Aprender de tus errores debería ser gratis.',
          en: 'Exports Chess.com games to Lichess in one click. Learning from your mistakes should be free.',
        },
      },
    ],
  },
];
