/* Niveles de la aventura y tableros de los modos duelo y libre.
   grupo: 2 = parejas, 3 = tríos. especiales: cartas con efecto (siempre en pareja).
   trampas: cartas sueltas que barajan el tablero. viva: al fallar, dos cartas cambian de sitio.
   vistazo: milisegundos que se enseñan todas las cartas al empezar. */
const ANCHO = 1280, ALTO = 720;
const NUM_GEMAS = 18; // 8 originales + 10 dibujadas por código

const MUNDOS = [
    { clave: 'mina', musica: 'mina' },
    { clave: 'templo', musica: 'templo' },
    { clave: 'boveda', musica: 'boveda' },
];

const NIVELES = [
    { mundo: 0, cols: 4, filas: 3, grupo: 2, especiales: [], trampas: 0, tiempo: 60, vistazo: 2500, estrellas: [900, 1400], pistas: ['vistazo'] },
    { mundo: 0, cols: 4, filas: 4, grupo: 2, especiales: ['reloj'], trampas: 0, tiempo: 75, vistazo: 1800, estrellas: [1500, 2400], pistas: ['reloj'] },
    { mundo: 0, cols: 5, filas: 4, grupo: 2, especiales: ['reloj', 'ojo'], trampas: 0, tiempo: 90, vistazo: 1200, estrellas: [2100, 3200], pistas: ['ojo'] },
    { mundo: 1, cols: 6, filas: 4, grupo: 2, especiales: ['ojo'], trampas: 2, tiempo: 110, vistazo: 1000, estrellas: [2000, 3100], pistas: ['trampa'] },
    { mundo: 1, cols: 6, filas: 3, grupo: 3, especiales: [], trampas: 0, tiempo: 100, vistazo: 1500, estrellas: [1450, 2250], pistas: ['trios'] },
    { mundo: 1, cols: 6, filas: 4, grupo: 2, especiales: ['reloj', 'ojo'], trampas: 4, tiempo: 120, vistazo: 0, estrellas: [1700, 2600], pistas: ['trampa'] },
    { mundo: 2, cols: 6, filas: 4, grupo: 2, especiales: ['reloj'], trampas: 0, tiempo: 130, vistazo: 0, viva: true, estrellas: [1500, 2300], pistas: ['viva'] },
    { mundo: 2, cols: 7, filas: 4, grupo: 3, especiales: [], trampas: 1, tiempo: 160, vistazo: 1000, estrellas: [2500, 3900], pistas: ['trios', 'trampa'] },
    { mundo: 2, cols: 7, filas: 5, grupo: 2, especiales: ['reloj', 'ojo', 'cofre'], trampas: 3, tiempo: 210, vistazo: 0, viva: true, estrellas: [3300, 5100], pistas: ['cofre', 'viva'] },
];

const TAMANOS_LIBRE = [[4, 3], [4, 4], [5, 4], [6, 4], [6, 5]];
const TABLERO_DUELO = { cols: 6, filas: 4 };
