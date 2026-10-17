/* Escenas fuera de la partida: arranque, menú (principal, aventura, duelo, libre y reglas),
   pausa, el final de la aventura y una galería con todas las cartas (para revisar el arte).
   Atajos de prueba: ?nivel=N, ?duelo=0..3, ?libre=0..4, ?final, ?galeria; ?auto juega solo. */

class Arranque extends Phaser.Scene {
    constructor() { super('Arranque'); }

    preload() {
        const barra = this.add.rectangle(ANCHO / 2 - 160, ALTO / 2, 0, 12, 0xffd23f).setOrigin(0, 0.5);
        this.add.rectangle(ANCHO / 2, ALTO / 2, 326, 20).setStrokeStyle(3, 0xffffff);
        this.add.text(ANCHO / 2, ALTO / 2 - 36, TXT.cargando, estiloTexto(22)).setOrigin(0.5);
        this.load.on('progress', (p) => barra.setSize(320 * p, 12));
        Arte.cargar(this);
    }

    create() {
        Arte.generar(this);
        const q = new URLSearchParams(location.search);
        const n = parseInt(q.get('nivel'), 10);
        if (n >= 1 && n <= NIVELES.length) this.scene.start('Juego', { modo: 'aventura', nivel: n - 1 });
        else if (q.has('duelo')) this.scene.start('Juego', { modo: 'duelo', rival: Phaser.Math.Clamp(parseInt(q.get('duelo'), 10) || 0, 0, 3) });
        else if (q.has('libre')) this.scene.start('Juego', { modo: 'libre', tamano: Phaser.Math.Clamp(parseInt(q.get('libre'), 10) || 0, 0, TAMANOS_LIBRE.length - 1) });
        else if (q.has('final')) this.scene.start('Final');
        else if (q.has('galeria')) this.scene.start('Galeria');
        else this.scene.start('Menu');
    }
}

/** Una carta de adorno que se da la vuelta de vez en cuando. */
function cartaAdorno(escena, x, y, escala, mundo, gema, angulo = 0) {
    const base = escena.add.image(0, 0, 'dorso_' + mundo).setScale(escala);
    const icono = escena.add.image(0, -2, 'gema_' + gema).setVisible(false);
    icono.setScale((CARTA_W * escala * 0.66) / icono.width);
    const c = escena.add.container(x, y, [escena.add.image(5, 8, 'sombra_carta').setScale(escala).setAlpha(0.3), base, icono]).setAngle(angulo).setDepth(4);
    let arriba = false;
    const girar = () => {
        if (!c.active) return;
        escena.tweens.add({
            targets: c, scaleX: 0, duration: 120, ease: 'Quad.easeIn',
            onComplete: () => {
                arriba = !arriba;
                base.setTexture(arriba ? 'anverso' : 'dorso_' + mundo);
                if (arriba) icono.setTexture('gema_' + Phaser.Math.Between(0, NUM_GEMAS - 1)).setScale((CARTA_W * escala * 0.66) / 256 * (256 / icono.width));
                icono.setVisible(arriba);
                escena.tweens.add({ targets: c, scaleX: 1, duration: 140, ease: 'Quad.easeOut' });
            },
        });
    };
    escena.time.addEvent({ delay: Phaser.Math.Between(1400, 2600), loop: true, callback: girar });
    return c;
}

/* ===================================================================== */
class Menu extends Phaser.Scene {
    constructor() { super('Menu'); }

    init(d) { this.pantallaInicial = (d && d.pantalla) || 'principal'; }

    create() {
        this.cameras.main.fadeIn(400, 0, 0, 0);
        const mundo = Math.min(2, Math.floor((Progreso.datos.desbloqueado - 1) / 3));
        this.add.image(0, 0, 'fondo_' + mundo).setOrigin(0);
        this.adornos = [];
        [[120, 230, -10], [250, 470, 8], [120, 620, -4], [ANCHO - 120, 230, 10], [ANCHO - 250, 470, -8], [ANCHO - 120, 620, 5]].forEach(([x, y, a], i) => {
            this.adornos.push(cartaAdorno(this, x, y, 0.62, i % 3, (i * 3) % NUM_GEMAS, a));
        });
        this.nav = null;
        this.sub = [];
        this.teclasExtra = [];
        this[this.pantallaInicial]();
        Sonido.musica('menu');
        this.input.keyboard.on('keydown', () => Sonido.iniciar());
        this.input.on('pointerdown', () => Sonido.iniciar());
    }

    limpiar(adornos = false) {
        this.adornos.forEach((a) => a.setVisible(adornos));
        if (this.nav) { this.nav.destruir(); this.nav = null; }
        for (const [k, f] of this.teclasExtra) this.input.keyboard.off(k, f);
        this.teclasExtra = [];
        this.sub.forEach((o) => o.destroy());
        this.sub = [];
    }

    tecla(nombre, f) { this.input.keyboard.on(nombre, f); this.teclasExtra.push([nombre, f]); }

    titulo(texto, y = 62, tam = 56) {
        const t = this.add.text(ANCHO / 2, y, texto, estiloTexto(tam, ORO, { fontStyle: '700', strokeThickness: 12, shadow: { offsetX: 0, offsetY: 6, color: '#000', blur: 10, fill: true } })).setOrigin(0.5).setDepth(20);
        this.sub.push(t);
        return t;
    }

    jugar(datos) {
        this.limpiar();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Juego', datos));
    }

    principal() {
        this.limpiar(true);
        const colores = ['#7dffcf', '#ff7aa8', '#ffd23f', '#9fb4ff', '#c59bff', '#ff9f43'];
        ['MEMORY', 'CARD'].forEach((palabra, fila) => {
            const tam = fila ? 64 : 104;
            const letras = palabra.split('').map((l, i) => this.add.text(0, -80, l, estiloTexto(tam, colores[(i + fila * 3) % colores.length], { fontStyle: '700', strokeThickness: fila ? 12 : 16, shadow: { offsetX: 0, offsetY: 8, color: '#000', blur: 12, fill: true } })).setOrigin(0.5).setDepth(20));
            const anchos = letras.map((t) => t.width - (fila ? 10 : 16));
            let x = ANCHO / 2 - anchos.reduce((a, b) => a + b, 0) / 2;
            const y = fila ? 170 : 96;
            letras.forEach((t, i) => {
                t.x = x + anchos[i] / 2; x += anchos[i];
                this.tweens.add({ targets: t, y, duration: 600, delay: (i + fila * 6) * 60, ease: 'Bounce.easeOut' });
                this.sub.push(t);
            });
        });
        this.sub.push(this.add.text(ANCHO / 2, 226, TXT.lema, estiloTexto(21, CREMA)).setOrigin(0.5).setDepth(20));
        const d = Progreso.datos;
        const total = d.estrellas.reduce((a, b) => a + b, 0);
        if (total || d.duelos.jugados) this.sub.push(this.add.text(ANCHO / 2, 258, `★ ${total}/27   ·   ${TXT.duelo}: ${d.duelos.ganados}/${d.duelos.jugados}`, estiloTexto(16, '#ffe9b8')).setOrigin(0.5).setDepth(20));
        const items = [
            [TXT.aventura, () => this.aventura()],
            [TXT.duelo, () => this.duelo()],
            [TXT.libre, () => this.libre()],
            [TXT.ayuda, () => this.ayuda()],
            [Sonido.activo ? TXT.sonidoSi : TXT.sonidoNo, (b) => b.texto.setText(Sonido.alternar() ? TXT.sonidoSi : TXT.sonidoNo)],
            [Sonido.musicaActiva ? TXT.musicaSi : TXT.musicaNo, (b) => b.texto.setText(Sonido.alternarMusica() ? TXT.musicaSi : TXT.musicaNo)],
        ];
        const botones = items.map(([t, f], i) => {
            const b = crearBoton(this, ANCHO / 2, 312 + i * 62, 340, 52, t, (bb) => f(bb), { tam: i < 4 ? 25 : 21, prof: 30 });
            b.setAlpha(0);
            this.tweens.add({ targets: b, alpha: 1, duration: 300, delay: 350 + i * 50 });
            return b;
        });
        this.sub.push(...botones);
        this.sub.push(this.add.text(ANCHO / 2, 704, TXT.creditos, estiloTexto(13, '#ffe9b8', { strokeThickness: 2 })).setOrigin(0.5).setDepth(20));
        this.nav = navegacion(this, botones);
    }

    aventura() {
        this.limpiar();
        this.titulo(TXT.aventura, 52);
        const d = Progreso.datos;
        const tarjetas = [];
        for (let m = 0; m < 3; m++) {
            const y = 112 + m * 162;
            this.sub.push(this.add.text(70, y, TXT.mundos[m], estiloTexto(22, ['#ffcf8a', '#9ff0d0', '#d2c0ff'][m])).setOrigin(0, 0.5).setDepth(20));
            for (let j = 0; j < 3; j++) {
                const i = m * 3 + j;
                tarjetas.push(this.tarjetaNivel(i, 250 + j * 390, y + 76, i + 1 > d.desbloqueado));
            }
        }
        const volver = crearBoton(this, ANCHO / 2, 676, 240, 50, TXT.volver, () => this.principal(), { prof: 30 });
        this.sub.push(...tarjetas, volver);
        this.nav = navegacion(this, [...tarjetas, volver], { columnas: 3, inicial: Math.min(d.desbloqueado, NIVELES.length) - 1 });
        this.tecla('keydown-ESC', () => this.principal());
    }

    tarjetaNivel(i, x, y, bloqueado) {
        const W = 360, H = 112;
        const n = NIVELES[i];
        const objs = [this.add.nineslice(0, 0, 'panel', 0, W, H, 18, 18, 18, 18)];
        objs.push(this.add.image(-W / 2 + 56, 0, 'dorso_' + n.mundo).setScale(0.36));
        objs.push(this.add.text(-W / 2 + 56, 0, String(i + 1), estiloTexto(34, CREMA, { fontStyle: '700' })).setOrigin(0.5));
        objs.push(this.add.text(-W / 2 + 112, -26, TXT.niveles[i], estiloTexto(21, ORO)).setOrigin(0, 0.5));
        objs.push(this.add.text(-W / 2 + 112, 4, `${n.cols}×${n.filas}${n.grupo === 3 ? ' · ×3' : ''}`, estiloTexto(15, '#ffe9b8')).setOrigin(0, 0.5));
        const e = Progreso.datos.estrellas[i];
        for (let s = 0; s < 3; s++) objs.push(this.add.image(-W / 2 + 128 + s * 36, 32, s < e ? 'estrella' : 'estrella_vacia').setScale(0.45));
        if (Progreso.datos.puntos[i]) objs.push(this.add.text(W / 2 - 18, 32, String(Progreso.datos.puntos[i]), estiloTexto(16, '#ffe9b8')).setOrigin(1, 0.5));
        if (bloqueado) {
            objs.push(this.add.rectangle(0, 0, W - 6, H - 6, 0x000000, 0.55));
            objs.push(this.add.image(-W / 2 + 56, 0, 'candado').setScale(0.9));
        }
        return this.tarjeta(x, y, W, H, objs, () => {
            if (bloqueado) return false;
            this.jugar({ modo: 'aventura', nivel: i });
            return true;
        });
    }

    /** Contenedor seleccionable con brillo, para niveles, rivales y tableros. */
    tarjeta(x, y, W, H, objs, alPulsar) {
        const brillo = this.add.nineslice(0, 0, 'boton_oro', 0, W + 12, H + 12, 22, 22, 22, 22).setAlpha(0.9).setVisible(false);
        const c = this.add.container(x, y, [brillo, ...objs]).setSize(W, H).setDepth(20);
        c.setInteractive({ useHandCursor: true });
        c.resaltar = (si) => { brillo.setVisible(si); c.setScale(si ? 1.03 : 1); };
        c.pulsar = () => {
            Sonido.iniciar();
            if (alPulsar() === false) {
                Sonido.sfx('error');
                this.tweens.add({ targets: c, x: x + 8, duration: 50, yoyo: true, repeat: 3 });
                return;
            }
            Sonido.sfx('elegir');
        };
        c.on('pointerdown', c.pulsar);
        return c;
    }

    duelo() {
        this.limpiar();
        this.titulo(TXT.elegirRival, 70);
        const iconos = ['gema_6', 'gema_4', 'gema_1', 'esp_ojo'];
        const tarjetas = TXT.rivales.map((nombre, i) => {
            const W = 250, H = 300;
            const objs = [this.add.nineslice(0, 0, 'panel', 0, W, H, 18, 18, 18, 18)];
            objs.push(this.add.image(0, -66, 'anverso').setScale(0.55));
            const ic = this.add.image(0, -68, iconos[i]);
            ic.setScale(70 / ic.width);
            objs.push(ic);
            objs.push(this.add.text(0, 38, nombre, estiloTexto(26, ORO)).setOrigin(0.5));
            objs.push(this.add.text(0, 92, TXT.rivalDesc[i], estiloTexto(17, CREMA, { align: 'center', wordWrap: { width: W - 30 } })).setOrigin(0.5));
            return this.tarjeta(205 + i * 290, 330, W, H, objs, () => this.jugar({ modo: 'duelo', rival: i }));
        });
        const volver = crearBoton(this, ANCHO / 2, 600, 240, 52, TXT.volver, () => this.principal(), { prof: 30 });
        this.sub.push(...tarjetas, volver);
        this.nav = navegacion(this, [...tarjetas, volver], { columnas: 4, inicial: 1 });
        this.tecla('keydown-ESC', () => this.principal());
    }

    libre() {
        this.limpiar();
        this.titulo(TXT.tamano, 70);
        const tarjetas = TAMANOS_LIBRE.map(([c, f], i) => {
            const W = 210, H = 220;
            const objs = [this.add.nineslice(0, 0, 'panel', 0, W, H, 18, 18, 18, 18)];
            // Mini tablero
            const s = Math.min(130 / c, 100 / f) * 0.9;
            for (let y = 0; y < f; y++) for (let x = 0; x < c; x++) objs.push(this.add.rectangle((x - (c - 1) / 2) * s, -40 + (y - (f - 1) / 2) * s, s * 0.8, s * 0.9, [0x8a5428, 0x1f9a7a, 0x4b2fa8][(x + y) % 3]).setStrokeStyle(1.5, 0xffe9b8));
            objs.push(this.add.text(0, 44, `${c}×${f}`, estiloTexto(30, ORO, { fontStyle: '700' })).setOrigin(0.5));
            const m = Progreso.datos.libre[i];
            objs.push(this.add.text(0, 86, m ? TXT.mejor(m.intentos, formatoTiempo(m.tiempo)) : TXT.sinMarca, estiloTexto(14, CREMA, { align: 'center', wordWrap: { width: W - 24 } })).setOrigin(0.5));
            return this.tarjeta(160 + i * 240, 340, W, H, objs, () => this.jugar({ modo: 'libre', tamano: i }));
        });
        const volver = crearBoton(this, ANCHO / 2, 600, 240, 52, TXT.volver, () => this.principal(), { prof: 30 });
        this.sub.push(...tarjetas, volver);
        this.nav = navegacion(this, [...tarjetas, volver], { columnas: 5, inicial: 1 });
        this.tecla('keydown-ESC', () => this.principal());
    }

    ayuda() {
        this.limpiar();
        this.titulo(TXT.ayuda, 62, 50);
        this.sub.push(this.add.nineslice(ANCHO / 2, 350, 'panel', 0, 1060, 460, 18, 18, 18, 18).setDepth(15));
        const ejemplos = ['esp_reloj', 'esp_ojo', 'esp_cofre', 'esp_trampa'];
        TXT.reglas.forEach((linea, i) => {
            const y = 158 + i * 52;
            this.sub.push(this.add.image(152, y, 'destello').setScale(0.5).setTint(0xffd23f).setDepth(20));
            this.sub.push(this.add.text(176, y, linea, estiloTexto(20, CREMA, { strokeThickness: 3, wordWrap: { width: 900 } })).setOrigin(0, 0.5).setDepth(20));
        });
        ejemplos.forEach((k, i) => {
            const img = this.add.image(ANCHO / 2 - 150 + i * 100, 538, k).setDepth(20);
            img.setScale(56 / img.width);
            this.sub.push(img);
        });
        this.sub.push(this.add.text(ANCHO / 2, 596, TXT.controles, estiloTexto(17, ORO, { strokeThickness: 3 })).setOrigin(0.5).setDepth(20));
        const volver = crearBoton(this, ANCHO / 2, 660, 240, 52, TXT.volver, () => this.principal(), { prof: 30 });
        this.sub.push(volver);
        this.nav = navegacion(this, [volver]);
        this.tecla('keydown-ESC', () => this.principal());
    }
}

/* ===================================================================== */
class Pausa extends Phaser.Scene {
    constructor() { super('Pausa'); }

    create() {
        this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.6).setOrigin(0).setInteractive();
        this.add.nineslice(ANCHO / 2, ALTO / 2, 'panel', 0, 440, 470, 18, 18, 18, 18);
        this.add.text(ANCHO / 2, ALTO / 2 - 180, TXT.pausa, estiloTexto(48, ORO, { fontStyle: '700' })).setOrigin(0.5);
        const juego = this.scene.get('Juego');
        const items = [
            [TXT.reanudar, () => this.reanudar()],
            [TXT.reiniciar, () => { this.scene.stop(); juego.scene.restart(); }],
            [Sonido.activo ? TXT.sonidoSi : TXT.sonidoNo, (b) => b.texto.setText(Sonido.alternar() ? TXT.sonidoSi : TXT.sonidoNo)],
            [Sonido.musicaActiva ? TXT.musicaSi : TXT.musicaNo, (b) => b.texto.setText(Sonido.alternarMusica() ? TXT.musicaSi : TXT.musicaNo)],
            [TXT.salir, () => { this.scene.stop('Juego'); this.scene.start('Menu', { pantalla: juego.modo === 'aventura' ? 'aventura' : juego.modo }); }],
        ];
        const botones = items.map(([t, f], i) => crearBoton(this, ANCHO / 2, ALTO / 2 - 96 + i * 68, 320, 54, t, (b) => f(b), { tam: 24 }));
        this.nav = navegacion(this, botones);
        for (const t of ['ESC', 'P']) this.input.keyboard.on('keydown-' + t, () => this.reanudar());
    }

    reanudar() {
        this.scene.stop();
        this.scene.resume('Juego');
    }
}

/* ===================================================================== */
class Final extends Phaser.Scene {
    constructor() { super('Final'); }

    create() {
        this.cameras.main.fadeIn(600, 0, 0, 0);
        this.add.image(0, 0, 'fondo_2').setOrigin(0);
        const trofeo = this.add.image(ANCHO / 2, 170, 'trofeo').setScale(0.9).setDepth(20);
        this.tweens.add({ targets: trofeo, y: 160, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const c = cartaAdorno(this, ANCHO / 2 + Math.cos(a) * 470, 420 + Math.sin(a) * 200, 0.5, i % 3, (i * 2) % NUM_GEMAS, Math.cos(a) * 12);
            c.setDepth(3);
        }
        this.add.text(ANCHO / 2, 316, TXT.finalTitulo, estiloTexto(54, ORO, { fontStyle: '700' })).setOrigin(0.5).setDepth(20);
        this.add.text(ANCHO / 2, 376, TXT.finalTexto, estiloTexto(24, CREMA)).setOrigin(0.5).setDepth(20);
        const d = Progreso.datos;
        d.final = true;
        Progreso.guardar();
        const total = d.estrellas.reduce((a, b) => a + b, 0);
        const puntos = d.puntos.reduce((a, b) => a + b, 0);
        this.add.text(ANCHO / 2, 430, `${TXT.totalEstrellas}: ${total}/27   ·   ${TXT.puntos}: ${puntos}`, estiloTexto(26, '#ffe9b8')).setOrigin(0.5).setDepth(20);
        this.add.text(ANCHO / 2, 478, TXT.gracias, estiloTexto(22, '#9ff0d0')).setOrigin(0.5).setDepth(20);
        const monedas = this.add.particles(0, -20, 'moneda', { x: { min: 0, max: ANCHO }, speedY: { min: 120, max: 260 }, rotate: { min: 0, max: 360 }, lifespan: 5000, frequency: 90, scale: { min: 0.6, max: 1.1 } }).setDepth(10);
        this.time.delayedCall(6000, () => monedas.stop());
        lluviaConfeti(this, 160, 30);
        Sonido.musica('final');
        Sonido.sfx('cofre');
        const boton = crearBoton(this, ANCHO / 2, 640, 260, 56, TXT.menu, () => this.scene.start('Menu', { pantalla: 'aventura' }), { prof: 40 });
        this.nav = navegacion(this, [boton]);
    }
}

/** Para revisar el arte: todas las gemas, cartas especiales y reversos. */
class Galeria extends Phaser.Scene {
    constructor() { super('Galeria'); }

    create() {
        this.add.image(0, 0, 'fondo_0').setOrigin(0);
        const claves = [...Array.from({ length: NUM_GEMAS }, (_, i) => 'gema_' + i), 'esp_reloj', 'esp_ojo', 'esp_cofre', 'esp_trampa'];
        claves.forEach((k, i) => {
            const x = 90 + (i % 11) * 110, y = 120 + Math.floor(i / 11) * 170;
            this.add.image(x, y, 'anverso').setScale(0.5);
            const img = this.add.image(x, y, k);
            img.setScale(66 / img.width);
            this.add.text(x, y + 80, k, estiloTexto(12)).setOrigin(0.5);
        });
        for (let m = 0; m < 3; m++) this.add.image(420 + m * 220, 600, 'dorso_' + m).setScale(0.6);
    }
}
