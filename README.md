# Memory Card

El juego de memoria convertido en una búsqueda del tesoro, hecho con [Phaser 3](https://phaser.io): una aventura de 9 niveles contra el reloj, duelos y modo libre.

La primera versión (HTML, CSS y JavaScript) sigue en el historial del repositorio y sus 8 gemas siguen en el juego. También se puede jugar en mi portafolio: [victorfernandes.vercel.app](https://victorfernandes.vercel.app).

## Qué tiene

- **Aventura de 9 niveles contra el reloj** en 3 mundos, cada uno con su fondo, su reverso de carta y su música:
  - La Mina: lo básico; al empezar se ven todas las cartas un momento.
  - El Templo: trampas (una calavera que baraja las cartas tapadas) y niveles de tríos.
  - La Bóveda: cartas vivas, que cambian de sitio cada vez que fallas, y un tablero final de 35 cartas.
- **Cartas especiales**: reloj de arena (+8 s), ojo (ves todas las cartas un instante) y cofre (500 puntos).
- **Puntuación**: combos de hasta ×5, bono por el tiempo que sobra y 3 estrellas por nivel.
- **Duelo** contra una IA con tres niveles de memoria (la fácil olvida casi todo, la experta lo recuerda todo) o contra un amigo en el mismo dispositivo.
- **Modo libre** con 5 tamaños de tablero y récord de intentos y tiempo en cada uno.
- 18 gemas: las 8 originales y 10 dibujadas por código con el mismo estilo facetado.
- Sonido y música con WebAudio y textos en español, inglés y portugués.

## Controles

Clic o toque para levantar una carta (se puede levantar la segunda mientras gira la primera). También con el teclado: flechas para moverse por el tablero y Enter o Espacio para levantar. `P` pausa y `M` quita el sonido.

## Jugar en local

Los navegadores no dejan cargar imágenes desde `file://`, así que hace falta un servidor estático:

```bash
python3 -m http.server 8000
```

Después abre <http://localhost:8000>. Para probar: `?nivel=4`, `?duelo=0` a `?duelo=3` (fácil, normal, experta, un amigo) o `?libre=0` a `?libre=4` (tamaños de tablero).

## Estructura

```
src/niveles.js   los 9 niveles y los tableros de duelo y libre
src/juego.js     la partida: reparto, giros, especiales, trampas, IA y resultados
src/escenas.js   menú, aventura, duelo, libre, reglas, pausa y final
src/arte.js      gemas extra, cartas, fondos e interfaz dibujados por código
src/sonido.js    efectos y música con WebAudio
src/textos.js    textos en los tres idiomas
img-1…8.png      las gemas originales
lib/             Phaser 3.70 (licencia MIT) y un arreglo del teclado de Phaser
```

## Créditos

- Código: Victor Fernandes.
- Fuente Fredoka: SIL Open Font License (`fuente/OFL.txt`).
- Phaser 3: licencia MIT (`lib/PHASER-LICENSE.txt`).
