/* La partida de Memory Card: un nivel de la aventura, un duelo (contra la IA o un amigo) o una
   partida libre. Las cartas se reparten desde el mazo, se voltean con animación y algunas
   tienen efectos: reloj, ojo, cofre y trampas. En los niveles "vivos" dos cartas cambian de
   sitio cada vez que fallas. */

const BASE_PAREJA = 100, BASE_TRIO = 200;
const MEMORIA_IA = [{ recuerda: 0.35, olvida: 0.25 }, { recuerda: 0.7, olvida: 0.08 }, { recuerda: 0.97, olvida: 0 }];

class Juego extends Phaser.Scene {
    constructor() { super('Juego'); }

    init(d) {
        this.modo = (d && d.modo) || 'aventura';
        this.indice = (d && d.nivel) || 0;
        this.rival = (d && d.rival) ?? 1;
        this.tamano = (d && d.tamano) ?? 1;
        const q = new URLSearchParams(location.search);
        this.auto = q.has('auto');
        this.memoriaAuto = parseFloat(q.get('memoria')) || 0.8;
    }

    create() {
        const libre = TAMANOS_LIBRE[this.tamano];
        if (this.modo === 'aventura') this.def = NIVELES[this.indice];
        else if (this.modo === 'duelo') this.def = { mundo: 1, cols: TABLERO_DUELO.cols, filas: TABLERO_DUELO.filas, grupo: 2, especiales: [], trampas: 0, tiempo: 0, vistazo: 0, pistas: [] };
        else this.def = { mundo: 0, cols: libre[0], filas: libre[1], grupo: 2, especiales: [], trampas: 0, tiempo: 0, vistazo: 0, pistas: [] };
        Object.assign(this, {
            estado: 'intro', cartas: [], abiertas: [], bloqueado: true, puntos: 0, combo: 0, mejorCombo: 0, intentos: 0, fallos: 0,
            grupos: 0, hechos: 0, transcurrido: 0, restante: (this.def.tiempo || 0) * 1000, ultimoTic: 99, cursor: 0, teclado: false,
            turno: 0, marcador: [0, 0], memoria: new Map(), capa: [], nav: null, intro: null, brilloCursor: null, animando: false,
        });
        this.mundo = this.def.mundo;
        this.cameras.main.fadeIn(350, 0, 0, 0);
        this.add.image(0, 0, 'fondo_' + this.mundo).setOrigin(0).setDepth(-10);
        this.emChispas = this.add.particles(0, 0, 'destello', { speed: { min: 80, max: 260 }, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 }, lifespan: 700, emitting: false }).setDepth(40);
        this.emHumo = this.add.particles(0, 0, 'humo', { speed: { min: 20, max: 90 }, scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.7, end: 0 }, lifespan: 900, tint: 0x9a6cff, emitting: false }).setDepth(41);
        this.emMonedas = this.add.particles(0, 0, 'moneda', { speed: { min: 150, max: 380 }, angle: { min: 220, max: 320 }, gravityY: 700, scale: { start: 1, end: 0.7 }, rotate: { min: 0, max: 360 }, lifespan: 1400, emitting: false }).setDepth(42);
        this.crearCartas();
        this.crearHUD();
        this.crearControles();
        this.mostrarIntro();
        Sonido.musica(this.modo === 'aventura' ? MUNDOS[this.mundo].musica : 'templo');
        const alReanudar = () => this.botonSonido.icono.setTexture(Sonido.activo ? 'ic_sonido' : 'ic_mudo');
        this.events.on('resume', alReanudar);
        this.events.once('shutdown', () => this.events.off('resume', alReanudar));
    }

    /* ------------------------------------------------------------------ cartas */

    crearCartas() {
        const d = this.def;
        const total = d.cols * d.filas;
        const nGrupos = (total - d.trampas) / d.grupo;
        const gemas = Phaser.Utils.Array.Shuffle(Array.from({ length: NUM_GEMAS }, (_, i) => i));
        const caras = [...d.especiales.map((e) => ({ tipo: e, textura: 'esp_' + e }))];
        for (let i = 0; caras.length < nGrupos; i++) caras.push({ tipo: 'gema', textura: 'gema_' + gemas[i] });
        const mazo = [];
        caras.forEach((c, k) => { for (let r = 0; r < d.grupo; r++) mazo.push({ ...c, grupo: k }); });
        for (let t = 0; t < d.trampas; t++) mazo.push({ tipo: 'trampa', textura: 'esp_trampa', grupo: -1 - t });
        Phaser.Utils.Array.Shuffle(mazo);
        this.grupos = nGrupos;

        // Tamaño y huecos del tablero
        const duelo = this.modo === 'duelo';
        const area = duelo ? { x: 250, y: 100, w: 780, h: 600 } : { x: 40, y: 104, w: 1200, h: 596 };
        const gap = Math.max(10, 16 - d.cols);
        const alto = Math.min((area.h - (d.filas - 1) * gap) / d.filas, ((area.w - (d.cols - 1) * gap) / d.cols) / 0.757);
        const ancho = alto * 0.757;
        this.cw = ancho; this.ch = alto;
        const x0 = area.x + (area.w - (d.cols * ancho + (d.cols - 1) * gap)) / 2 + ancho / 2;
        const y0 = area.y + (area.h - (d.filas * alto + (d.filas - 1) * gap)) / 2 + alto / 2;
        this.huecos = [];
        for (let f = 0; f < d.filas; f++) for (let c = 0; c < d.cols; c++) this.huecos.push({ x: x0 + c * (ancho + gap), y: y0 + f * (alto + gap) });
        const escala = ancho / CARTA_W;
        mazo.forEach((m, i) => {
            const sombra = this.add.image(6, 9, 'sombra_carta').setScale(escala).setAlpha(0.3);
            const base = this.add.image(0, 0, 'dorso_' + this.mundo).setScale(escala);
            const icono = this.add.image(0, -2, m.textura).setVisible(false);
            icono.setScale((ancho * (m.tipo === 'gema' ? 0.66 : 0.72)) / icono.width);
            const brillo = this.add.image(0, 0, 'brillo_carta').setScale(escala).setTint(0xffd23f).setVisible(false);
            const cont = this.add.container(ANCHO / 2, ALTO + 120, [sombra, brillo, base, icono]).setDepth(10).setSize(ancho, alto);
            cont.setInteractive({ useHandCursor: true });
            const carta = { ...m, id: i, hueco: i, estado: 'tapada', cont, base, icono, sombra, brillo };
            cont.on('pointerdown', () => { this.teclado = false; this.pintarCursor(); this.elegir(carta, true); });
            cont.on('pointerover', () => { if (carta.estado === 'tapada' && !this.bloqueado && this.esHumano()) this.tweens.add({ targets: cont, y: this.huecos[carta.hueco].y - 6, duration: 100 }); });
            cont.on('pointerout', () => { if (carta.estado === 'tapada') this.tweens.add({ targets: cont, y: this.huecos[carta.hueco].y, duration: 100 }); });
            this.cartas.push(carta);
        });
    }

    /** Da la vuelta a una carta con un giro (encoge, cambia de cara y vuelve). */
    voltear(carta, arriba, dur = 110) {
        return new Promise((res) => {
            const c = carta.cont;
            Sonido.sfx('voltear');
            this.tweens.add({
                targets: c, scaleX: 0, y: this.huecos[carta.hueco].y - 10, duration: dur, ease: 'Quad.easeIn',
                onComplete: () => {
                    carta.base.setTexture(arriba ? 'anverso' : 'dorso_' + this.mundo);
                    carta.icono.setVisible(arriba);
                    this.tweens.add({ targets: c, scaleX: 1, y: this.huecos[carta.hueco].y, duration: dur + 20, ease: 'Quad.easeOut', onComplete: res });
                },
            });
        });
    }

    async repartir() {
        Sonido.sfx('barajar');
        this.cartas.forEach((c, i) => {
            const h = this.huecos[c.hueco];
            c.cont.setPosition(ANCHO / 2 + Phaser.Math.Between(-4, 4), ALTO + 80).setAngle(Phaser.Math.Between(-20, 20));
            this.tweens.add({ targets: c.cont, x: h.x, y: h.y, angle: 0, duration: 380, delay: i * 28, ease: 'Cubic.easeOut', onStart: () => { if (i % 3 === 0) Sonido.sfx('voltear'); } });
        });
        await esperar(this, this.cartas.length * 28 + 420);
        const v = this.def.vistazo;
        if (v > 0) {
            this.cartas.forEach((c, i) => this.time.delayedCall(i * 18, () => this.voltear(c, true, 90)));
            await esperar(this, this.cartas.length * 18 + 260 + v);
            this.cartas.forEach((c, i) => this.time.delayedCall(i * 12, () => this.voltear(c, false, 90)));
            await esperar(this, this.cartas.length * 12 + 260);
        }
    }

    /* ------------------------------------------------------------------ HUD */

    crearHUD() {
        const d = this.def;
        let titulo;
        if (this.modo === 'aventura') titulo = `${this.indice + 1} · ${TXT.niveles[this.indice]}`;
        else if (this.modo === 'duelo') titulo = `${TXT.duelo} · ${TXT.rivales[this.rival]}`;
        else titulo = `${TXT.libre} · ${d.cols}×${d.filas}`;
        this.add.text(44, 26, titulo, estiloTexto(24, CREMA)).setOrigin(0, 0.5).setDepth(60);
        this.txtProgreso = this.add.text(44, 60, '', estiloTexto(18, '#ffe9b8')).setOrigin(0, 0.5).setDepth(60);
        this.txtCentroTit = this.add.text(ANCHO / 2, 22, this.modo === 'libre' ? TXT.hud.intentos : TXT.hud.puntos, estiloTexto(14, '#ffe9b8', { strokeThickness: 3 })).setOrigin(0.5).setDepth(60);
        this.txtCentro = this.add.text(ANCHO / 2, 52, '0', estiloTexto(34, ORO)).setOrigin(0.5).setDepth(60);
        this.txtCombo = this.add.text(ANCHO / 2 + 130, 50, '', estiloTexto(26, '#ff9f43')).setOrigin(0.5).setDepth(60);
        this.add.text(980, 22, TXT.hud.tiempo, estiloTexto(14, '#ffe9b8', { strokeThickness: 3 })).setOrigin(0.5).setDepth(60);
        this.txtTiempo = this.add.text(980, 52, '', estiloTexto(30, CREMA)).setOrigin(0.5).setDepth(60);
        this.botonSonido = crearBotonIcono(this, 1176, 44, Sonido.activo ? 'ic_sonido' : 'ic_mudo', (b) => b.icono.setTexture(Sonido.alternar() ? 'ic_sonido' : 'ic_mudo'));
        crearBotonIcono(this, 1232, 44, 'ic_pausa', () => this.pausar());
        if (this.modo === 'duelo') {
            this.txtCentroTit.setVisible(false); this.txtCentro.setVisible(false);
            const nombres = [TXT.tu, this.rival === 3 ? TXT.amigo : TXT.ia];
            this.paneles = nombres.map((n, i) => {
                const x = i === 0 ? 130 : ANCHO - 130;
                const p = this.add.nineslice(x, 400, 'panel', 0, 200, 230, 18, 18, 18, 18).setDepth(5);
                const t = this.add.text(x, 330, n, estiloTexto(28, CREMA)).setOrigin(0.5).setDepth(6);
                const pts = this.add.text(x, 410, '0', estiloTexto(64, ORO, { fontStyle: '700' })).setOrigin(0.5).setDepth(6);
                const sub = this.add.text(x, 470, TXT.parejas, estiloTexto(18, '#ffe9b8')).setOrigin(0.5).setDepth(6);
                return { p, t, pts, sub, x };
            });
            this.txtCombo.setVisible(false);
            this.txtTurno = this.add.text(ANCHO / 2, 46, '', estiloTexto(26, ORO)).setOrigin(0.5).setDepth(60);
        }
        this.actualizarHUD();
    }

    actualizarHUD() {
        const total = this.grupos;
        const conTiempo = this.modo === 'aventura';
        this.txtProgreso.setText(`${TXT.hud.parejas}: ${this.hechos}/${total}${this.modo !== 'libre' ? '' : `   ·   ${TXT.mejor(...this.marcaLibre())}`}`);
        if (this.modo === 'libre') this.txtCentro.setText(String(this.intentos));
        else this.txtCentro.setText(String(this.puntos));
        this.txtCombo.setText(this.combo > 1 ? `x${Math.min(this.combo, 5)}` : '');
        const seg = conTiempo ? Math.ceil(this.restante / 1000) : Math.floor(this.transcurrido / 1000);
        this.txtTiempo.setText(formatoTiempo(Math.max(0, seg)));
        this.txtTiempo.setColor(conTiempo && seg <= 10 ? ROJO : CREMA);
        if (this.paneles) {
            this.paneles.forEach((p, i) => {
                p.pts.setText(String(this.marcador[i]));
                const activo = i === this.turno && this.estado === 'jugando';
                p.p.setAlpha(activo ? 1 : 0.6);
                p.t.setColor(activo ? ORO : CREMA);
            });
        }
    }

    marcaLibre() {
        const m = Progreso.datos.libre[this.tamano];
        return m ? [m.intentos, formatoTiempo(m.tiempo)] : ['—', '—'];
    }

    /* ------------------------------------------------------------------ controles */

    crearControles() {
        const tk = this.input.keyboard;
        tk.on('keydown', () => Sonido.iniciar());
        const mover = (dx, dy) => () => {
            if (this.estado !== 'jugando' || this.nav) return;
            const d = this.def;
            if (!this.teclado) { this.teclado = true; this.pintarCursor(); return; }
            let c = this.cursor % d.cols, f = Math.floor(this.cursor / d.cols);
            c = (c + dx + d.cols) % d.cols; f = (f + dy + d.filas) % d.filas;
            this.cursor = f * d.cols + c;
            Sonido.sfx('menu');
            this.pintarCursor();
        };
        for (const [t, dx, dy] of [['LEFT', -1, 0], ['RIGHT', 1, 0], ['UP', 0, -1], ['DOWN', 0, 1], ['A', -1, 0], ['D', 1, 0], ['W', 0, -1], ['S', 0, 1]]) tk.on('keydown-' + t, mover(dx, dy));
        const pulsar = () => {
            if (this.nav) return;
            if (this.estado === 'intro') { this.empezar(); return; }
            if (this.estado !== 'jugando') return;
            if (!this.teclado) { this.teclado = true; this.pintarCursor(); return; }
            const carta = this.cartas.find((c) => c.hueco === this.cursor);
            if (carta) this.elegir(carta, true);
        };
        tk.on('keydown-ENTER', pulsar);
        tk.on('keydown-SPACE', pulsar);
        for (const t of ['P', 'ESC']) tk.on('keydown-' + t, () => this.pausar());
        tk.on('keydown-M', () => this.botonSonido.icono.setTexture(Sonido.alternar() ? 'ic_sonido' : 'ic_mudo'));
        this.input.on('pointerdown', () => { Sonido.iniciar(); if (this.estado === 'intro' && !this.nav) this.empezar(); });
    }

    pintarCursor() {
        if (!this.brilloCursor) this.brilloCursor = this.add.image(0, 0, 'brillo_carta').setTint(0x7fe3ff).setDepth(9).setScale(this.cw / CARTA_W);
        const h = this.huecos[this.cursor];
        this.brilloCursor.setVisible(this.teclado && this.estado === 'jugando').setPosition(h.x, h.y);
    }

    pausar() {
        if (this.nav || this.estado === 'fin') return;
        this.scene.launch('Pausa');
        this.scene.pause();
    }

    esHumano() { return this.modo !== 'duelo' || this.turno === 0 || this.rival === 3; }

    /* ------------------------------------------------------------------ inicio */

    mostrarIntro() {
        const objs = [];
        const lineas = [];
        let titulo;
        if (this.modo === 'aventura') {
            titulo = `${TXT.nivel(this.indice + 1)} · ${TXT.niveles[this.indice]}`;
            for (const p of this.def.pistas) lineas.push(TXT.pistas[p]);
        } else if (this.modo === 'duelo') {
            titulo = `${TXT.duelo} · ${TXT.rivales[this.rival]}`;
            lineas.push(TXT.reglas[6]);
        } else {
            titulo = `${TXT.libre} · ${this.def.cols}×${this.def.filas}`;
            lineas.push(TXT.reglas[0]);
        }
        objs.push(this.add.nineslice(ANCHO / 2, ALTO / 2, 'panel', 0, 760, 120 + lineas.length * 40 + 60, 18, 18, 18, 18).setDepth(70));
        const top = ALTO / 2 - (120 + lineas.length * 40 + 60) / 2;
        objs.push(this.add.text(ANCHO / 2, top + 50, titulo, estiloTexto(38, ORO, { fontStyle: '700' })).setOrigin(0.5).setDepth(71));
        lineas.forEach((l, i) => objs.push(this.add.text(ANCHO / 2, top + 104 + i * 40, l, estiloTexto(21, CREMA, { align: 'center', wordWrap: { width: 700 } })).setOrigin(0.5).setDepth(71)));
        const pulsa = this.add.text(ANCHO / 2, top + 104 + lineas.length * 40 + 30, TXT.jugar, estiloTexto(24, '#ffe9b8')).setOrigin(0.5).setDepth(71);
        this.tweens.add({ targets: pulsa, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
        objs.push(pulsa);
        objs.forEach((o) => { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 300 }); });
        this.intro = objs;
        if (this.auto) this.time.delayedCall(500, () => this.empezar());
    }

    async empezar() {
        if (this.estado !== 'intro') return;
        this.estado = 'repartiendo';
        Sonido.iniciar();
        const objs = this.intro;
        this.intro = null;
        this.tweens.add({ targets: objs, alpha: 0, duration: 200, onComplete: () => objs.forEach((o) => o.destroy()) });
        await this.repartir();
        if (!this.sys.isActive()) return;
        this.estado = 'jugando';
        this.bloqueado = false;
        this.actualizarHUD();
        this.pintarCursor();
        this.siguienteTurno(true);
    }

    update(t, dt) {
        if (this.estado !== 'jugando') return;
        const pausaReloj = this.animando;
        this.transcurrido += dt;
        if (this.modo === 'aventura' && !pausaReloj) {
            this.restante -= dt;
            const s = Math.ceil(this.restante / 1000);
            if (s <= 10 && s !== this.ultimoTic && s >= 0) { this.ultimoTic = s; Sonido.sfx(s <= 3 ? 'alarma' : 'tic'); this.tweens.add({ targets: this.txtTiempo, scale: 1.25, duration: 120, yoyo: true }); }
            if (this.restante <= 0) { this.restante = 0; this.terminar(false); return; }
        }
        this.actualizarHUD();
    }

    /* ------------------------------------------------------------------ jugar */

    async elegir(carta, porPersona = false) {
        if (this.estado !== 'jugando' || this.bloqueado || carta.estado !== 'tapada') return;
        if (porPersona && !this.esHumano()) return;
        if (this.abiertas.length >= this.def.grupo) return;
        carta.estado = 'arriba';
        this.abiertas.push(carta);
        this.recordar(carta);
        // Se puede levantar la siguiente mientras gira esta; solo decide la última que se abrió
        if (this.abiertas.length >= this.def.grupo || carta.tipo === 'trampa') this.bloqueado = true;
        await this.voltear(carta, true);
        if (!this.sys.isActive() || this.abiertas[this.abiertas.length - 1] !== carta) return;
        await this.evaluar();
    }

    async evaluar() {
        const ab = this.abiertas;
        const trampa = ab.find((c) => c.tipo === 'trampa');
        if (trampa) { await this.activarTrampa(trampa); return; }
        if (ab.length >= 2 && ab.some((c) => c.grupo !== ab[0].grupo)) { await this.fallar(); return; }
        if (ab.length === this.def.grupo) { await this.acertar(); return; }
        if (!this.esHumano()) this.jugadaIA();
    }

    async acertar() {
        const grupo = [...this.abiertas];
        this.abiertas = [];
        this.bloqueado = false;
        this.intentos++;
        this.combo++;
        this.mejorCombo = Math.max(this.mejorCombo, this.combo);
        this.hechos++;
        const mult = Math.min(this.combo, 5);
        const base = this.def.grupo === 3 ? BASE_TRIO : BASE_PAREJA;
        const tipo = grupo[0].tipo;
        let ganados = base * mult + (tipo === 'reloj' || tipo === 'ojo' ? 50 : 0) + (tipo === 'cofre' ? 500 : 0);
        if (this.modo === 'duelo') { this.marcador[this.turno]++; ganados = 0; }
        this.puntos += ganados;
        Sonido.sfx(this.def.grupo === 3 ? 'trio' : 'pareja', this.combo);
        grupo.forEach((c) => {
            c.estado = 'hecha';
            this.memoria.delete(c.id);
            c.brillo.setVisible(true).setAlpha(1);
            this.emChispas.setParticleTint(Phaser.Utils.Array.GetRandom([0xffd23f, 0xffffff, 0x9ef0ff]));
            this.emChispas.explode(10, c.cont.x, c.cont.y);
            this.tweens.add({ targets: c.cont, scale: 1.12, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
            this.tweens.add({ targets: c.cont, alpha: 0.38, delay: 650, duration: 350 });
            this.tweens.add({ targets: c.brillo, alpha: 0, delay: 500, duration: 400 });
        });
        const cx = grupo.reduce((s, c) => s + c.cont.x, 0) / grupo.length, cy = grupo.reduce((s, c) => s + c.cont.y, 0) / grupo.length;
        if (ganados) this.flotante(cx, cy - 20, `+${ganados}`);
        if (this.combo >= 2 && this.modo !== 'duelo') this.flotante(cx, cy - 56, TXT.combo(mult), '#ff9f43', 24);
        this.actualizarHUD();
        if (tipo === 'reloj' && this.modo === 'aventura') { this.restante += 8000; Sonido.sfx('reloj'); this.flotante(980, 90, TXT.masTiempo, '#7dffcf', 26); }
        if (tipo === 'cofre') { Sonido.sfx('cofre'); this.emMonedas.explode(40, cx, cy); this.aviso(TXT.cofre); }
        if (tipo === 'ojo') { Sonido.sfx('ojo'); this.aviso(TXT.vistazoTodo); await this.vistazoTodas(1300); }
        if (this.hechos >= this.grupos) { this.time.delayedCall(700, () => this.terminar(true)); return; }
        this.siguienteTurno(true);
    }

    async fallar() {
        const abiertas = [...this.abiertas];
        this.intentos++;
        this.fallos++;
        this.combo = 0;
        this.bloqueado = true;
        Sonido.sfx('fallo');
        abiertas.forEach((c) => this.tweens.add({ targets: c.cont, x: c.cont.x + 7, duration: 45, yoyo: true, repeat: 3, delay: 250 }));
        this.actualizarHUD();
        await esperar(this, 750);
        if (!this.sys.isActive()) return;
        await Promise.all(abiertas.map((c) => { c.estado = 'tapada'; return this.voltear(c, false); }));
        this.abiertas = [];
        if (this.def.viva) await this.intercambiar();
        this.bloqueado = false;
        if (this.modo === 'duelo') this.turno = 1 - this.turno;
        this.siguienteTurno(false);
    }

    /** Cartas vivas: dos cartas tapadas cambian de sitio a la vista. */
    async intercambiar() {
        const tapadas = this.cartas.filter((c) => c.estado === 'tapada');
        if (tapadas.length < 2) return;
        const [a, b] = Phaser.Utils.Array.Shuffle([...tapadas]).slice(0, 2);
        this.animando = true;
        Sonido.sfx('cambio');
        [a.hueco, b.hueco] = [b.hueco, a.hueco];
        for (const c of [a, b]) {
            const h = this.huecos[c.hueco];
            c.cont.setDepth(30);
            c.brillo.setVisible(true).setTint(0x7fe3ff).setAlpha(1);
            this.tweens.add({ targets: c.cont, x: h.x, duration: 520, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: c.cont, y: h.y - 40, duration: 260, yoyo: true, ease: 'Sine.easeOut', onComplete: () => c.cont.setY(h.y) });
        }
        await esperar(this, 600);
        for (const c of [a, b]) {
            c.cont.setDepth(10); c.brillo.setVisible(false).setTint(0xffd23f);
            // Quien juega solo sigue con la vista el cambio a veces
            if (this.memoria.has(c.id) && Math.random() > 0.7) this.memoria.delete(c.id);
        }
        this.animando = false;
    }

    async activarTrampa(trampa) {
        this.bloqueado = true;
        this.animando = true;
        this.intentos++;
        this.combo = 0;
        Sonido.sfx('trampa');
        this.aviso(TXT.trampa, ROJO);
        this.emHumo.explode(18, trampa.cont.x, trampa.cont.y);
        this.cameras.main.shake(220, 0.006);
        await esperar(this, 650);
        if (!this.sys.isActive()) return;
        const otras = this.abiertas.filter((c) => c !== trampa);
        await Promise.all(otras.map((c) => { c.estado = 'tapada'; return this.voltear(c, false); }));
        this.abiertas = [];
        trampa.estado = 'hecha';
        this.tweens.add({ targets: trampa.cont, scale: 0, angle: 200, alpha: 0, duration: 380, ease: 'Back.easeIn' });
        this.emHumo.explode(14, trampa.cont.x, trampa.cont.y);
        // Las tapadas se barajan
        const tapadas = this.cartas.filter((c) => c.estado === 'tapada');
        const huecos = Phaser.Utils.Array.Shuffle(tapadas.map((c) => c.hueco));
        Sonido.sfx('barajar');
        tapadas.forEach((c, i) => {
            c.hueco = huecos[i];
            const h = this.huecos[c.hueco];
            this.tweens.add({ targets: c.cont, x: h.x, y: h.y, duration: 560, delay: i * 12, ease: 'Cubic.easeInOut' });
        });
        await esperar(this, 600 + tapadas.length * 12);
        this.memoria.clear();
        this.animando = false;
        this.bloqueado = false;
        if (this.modo === 'duelo') this.turno = 1 - this.turno;
        this.siguienteTurno(false);
    }

    async vistazoTodas(ms) {
        this.animando = true;
        this.bloqueado = true;
        const tapadas = this.cartas.filter((c) => c.estado === 'tapada');
        tapadas.forEach((c) => this.voltear(c, true, 80));
        await esperar(this, 200 + ms);
        await Promise.all(tapadas.map((c) => (c.estado === 'tapada' ? this.voltear(c, false, 80) : null)));
        this.animando = false;
        this.bloqueado = false;
    }

    flotante(x, y, texto, color = ORO, tam = 28) {
        const t = this.add.text(x, y, texto, estiloTexto(tam, color)).setOrigin(0.5).setDepth(50);
        this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    }

    aviso(texto, color = ORO) {
        grito(this, texto, { tam: 60, color, dura: 700 });
    }

    /* ------------------------------------------------------------------ turnos e IA */

    siguienteTurno(acierto) {
        if (this.estado !== 'jugando') return;
        this.actualizarHUD();
        if (this.modo === 'duelo') {
            const nombre = this.turno === 0 ? TXT.tu : this.rival === 3 ? TXT.amigo : TXT.ia;
            this.txtTurno.setText(this.turno === 1 && this.rival < 3 ? TXT.piensa : TXT.turnoDe(nombre));
            if (!this.esHumano()) { this.time.delayedCall(acierto ? 700 : 900, () => this.jugadaIA()); return; }
            // El que olvida, olvida al cambiar de turno
            if (!acierto && this.rival < 3) this.olvidar();
        }
        if (this.auto && this.esHumano()) this.time.delayedCall(350, () => this.jugadaBot());
    }

    recordar(carta) {
        if (this.modo === 'duelo' && this.rival < 3) {
            if (Math.random() < MEMORIA_IA[this.rival].recuerda) this.memoria.set(carta.id, carta.grupo);
        } else if (this.auto) {
            if (Math.random() < this.memoriaAuto) this.memoria.set(carta.id, carta.grupo);
        }
    }

    olvidar() {
        const f = MEMORIA_IA[this.rival].olvida;
        for (const id of [...this.memoria.keys()]) if (Math.random() < f) this.memoria.delete(id);
    }

    /** Elige la siguiente carta con lo que recuerda: completar un grupo conocido o probar una nueva. */
    cartaPensada() {
        const tapadas = this.cartas.filter((c) => c.estado === 'tapada');
        if (!tapadas.length) return null;
        const conocidas = tapadas.filter((c) => this.memoria.has(c.id));
        const g = this.def.grupo;
        if (this.abiertas.length) {
            const objetivo = this.abiertas[0].grupo;
            const sabe = conocidas.find((c) => this.memoria.get(c.id) === objetivo);
            if (sabe) return sabe;
        } else {
            // ¿Conoce un grupo entero?
            const porGrupo = {};
            for (const c of conocidas) (porGrupo[this.memoria.get(c.id)] ||= []).push(c);
            const completo = Object.values(porGrupo).find((l) => l.length >= g);
            if (completo) return completo[0];
        }
        const desconocidas = tapadas.filter((c) => !this.memoria.has(c.id));
        if (desconocidas.length) return Phaser.Utils.Array.GetRandom(desconocidas);
        return Phaser.Utils.Array.GetRandom(tapadas);
    }

    jugadaIA() {
        if (this.estado !== 'jugando' || this.esHumano() || this.bloqueado) return;
        const c = this.cartaPensada();
        if (c) this.time.delayedCall(550, () => this.elegir(c));
    }

    jugadaBot() {
        if (this.estado !== 'jugando' || !this.esHumano() || this.bloqueado) { if (this.estado === 'jugando') this.time.delayedCall(200, () => this.jugadaBot()); return; }
        const c = this.cartaPensada();
        if (!c) return;
        this.elegir(c).then(() => { if (this.abiertas.length && this.abiertas.length < this.def.grupo && this.estado === 'jugando') this.time.delayedCall(250, () => this.jugadaBot()); });
    }

    /* ------------------------------------------------------------------ final */

    terminar(gano) {
        if (this.estado === 'fin') return;
        this.estado = 'fin';
        this.bloqueado = true;
        if (this.brilloCursor) this.brilloCursor.setVisible(false);
        Sonido.parar();
        const d = this.def;
        let bono = 0, estrellas = 0, record = false;
        if (this.modo === 'aventura' && gano) {
            bono = Math.round(this.restante / 1000) * 10;
            this.puntos += bono;
            estrellas = 1 + (this.puntos >= d.estrellas[0] ? 1 : 0) + (this.puntos >= d.estrellas[1] ? 1 : 0);
            Progreso.completar(this.indice, estrellas, this.puntos);
        }
        if (this.modo === 'libre') {
            const m = Progreso.datos.libre[this.tamano];
            const seg = Math.round(this.transcurrido / 1000);
            if (!m || this.intentos < m.intentos || (this.intentos === m.intentos && seg < m.tiempo)) {
                Progreso.datos.libre[this.tamano] = { intentos: this.intentos, tiempo: seg };
                Progreso.guardar();
                record = !!m;
            }
        }
        let titulo, colorTitulo = ORO, victoria = gano;
        if (this.modo === 'duelo') {
            const [a, b] = this.marcador;
            // Las estadísticas de duelo son solo contra la IA
            if (this.rival < 3) {
                Progreso.datos.duelos.jugados++;
                if (a > b) Progreso.datos.duelos.ganados++;
                Progreso.guardar();
            }
            if (this.rival === 3) titulo = a === b ? TXT.empate : TXT.gana(a > b ? TXT.jugador(1) : TXT.jugador(2));
            else titulo = a > b ? TXT.ganaste : a < b ? TXT.perdiste : TXT.empate;
            victoria = a >= b || this.rival === 3;
            if (a < b && this.rival < 3) colorTitulo = ROJO;
        } else if (this.modo === 'aventura') {
            titulo = gano ? TXT.nivelSuperado : TXT.sinTiempo;
            if (!gano) colorTitulo = ROJO;
        } else titulo = TXT.completado;
        Sonido.sfx(victoria ? 'nivel' : 'derrota');
        if (victoria) this.time.delayedCall(300, () => lluviaConfeti(this, 80, 89));
        this.mostrarFin({ titulo, colorTitulo, gano, bono, estrellas, record });
    }

    mostrarFin({ titulo, colorTitulo, gano, bono, estrellas, record }) {
        const d = this.def;
        const filas = [];
        if (this.modo === 'duelo') filas.push([TXT.tu, String(this.marcador[0])], [this.rival === 3 ? TXT.amigo : TXT.ia, String(this.marcador[1])]);
        else {
            filas.push([TXT.parejas, `${this.hechos}/${this.grupos}`], [TXT.intentos, String(this.intentos)], [TXT.fallos, String(this.fallos)]);
            if (this.modo === 'aventura') filas.push([TXT.mejorCombo, `x${Math.min(5, this.mejorCombo)}`]);
            filas.push([TXT.tiempo, formatoTiempo(this.transcurrido / 1000)]);
            if (gano && this.modo === 'aventura') filas.push([TXT.bonoTiempo, `+${bono}`]);
        }
        const conEstrellas = this.modo === 'aventura' && gano;
        const alto = 110 + filas.length * 32 + (this.modo === 'aventura' ? 56 : 10) + (conEstrellas ? 110 : 0) + 100;
        const velo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.55).setOrigin(0).setDepth(90).setInteractive();
        const panel = this.add.nineslice(ANCHO / 2, ALTO / 2, 'panel', 0, 680, alto, 18, 18, 18, 18).setDepth(91);
        velo.setAlpha(0); this.tweens.add({ targets: velo, alpha: 1, duration: 250 });
        panel.setScale(0.85).setAlpha(0); this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
        const top = ALTO / 2 - alto / 2;
        const add = (o) => o.setDepth(92);
        if (this.modo === 'duelo' && this.marcador[0] > this.marcador[1] && this.rival < 3) {
            const t = add(this.add.image(ANCHO / 2 + 260, top + 60, 'trofeo').setScale(0.1));
            this.tweens.add({ targets: t, scale: 0.42, angle: 10, duration: 500, ease: 'Back.easeOut' });
        }
        add(this.add.text(ANCHO / 2, top + 54, titulo, estiloTexto(44, colorTitulo, { fontStyle: '700' })).setOrigin(0.5));
        filas.forEach(([a, b], i) => {
            const y = top + 112 + i * 32;
            add(this.add.text(ANCHO / 2 - 170, y, a, estiloTexto(21, '#ffe9b8')).setOrigin(0, 0.5));
            add(this.add.text(ANCHO / 2 + 170, y, b, estiloTexto(21, CREMA)).setOrigin(1, 0.5));
        });
        let y = top + 112 + filas.length * 32 + 12;
        if (this.modo === 'aventura') { add(this.add.text(ANCHO / 2, y + 8, `${TXT.puntos}: ${this.puntos}`, estiloTexto(30, ORO)).setOrigin(0.5)); y += 50; }
        if (record) {
            const r = add(this.add.text(ANCHO / 2 + 210, top + 112, TXT.nuevoRecord, estiloTexto(22, '#ff9f43')).setOrigin(0.5).setAngle(-8));
            this.tweens.add({ targets: r, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
        }
        if (conEstrellas) {
            const textos = TXT.estrellas(d.estrellas);
            for (let i = 0; i < 3; i++) {
                const ex = ANCHO / 2 - 150 + i * 150;
                add(this.add.image(ex, y + 26, 'estrella_vacia').setScale(0.75));
                add(this.add.text(ex, y + 64, textos[i], estiloTexto(15, i < estrellas ? CREMA : '#a8a090')).setOrigin(0.5));
                if (i < estrellas) {
                    const e = add(this.add.image(ex, y + 26, 'estrella').setScale(0));
                    this.tweens.add({ targets: e, scale: 0.75, angle: 360, duration: 420, delay: 400 + i * 300, ease: 'Back.easeOut', onStart: () => Sonido.sfx('estrella') });
                }
            }
        }
        const ultimo = this.modo === 'aventura' && gano && this.indice === NIVELES.length - 1;
        const datos = { modo: this.modo, nivel: this.indice, rival: this.rival, tamano: this.tamano };
        const opciones = [];
        if (this.modo === 'aventura' && gano && !ultimo) opciones.push([TXT.siguiente, () => this.scene.start('Juego', { ...datos, nivel: this.indice + 1 })]);
        if (ultimo) opciones.push([TXT.siguiente, () => this.scene.start('Final')]);
        opciones.push([this.modo === 'aventura' && !gano ? TXT.reintentar : TXT.otraVez, () => this.scene.start('Juego', datos)]);
        opciones.push([this.modo === 'aventura' ? TXT.nivelesBoton : TXT.menu, () => this.scene.start('Menu', { pantalla: this.modo === 'aventura' ? 'aventura' : this.modo })]);
        const ancho = opciones.length === 3 ? 200 : 240;
        const botones = opciones.map(([t, f], i) => crearBoton(this, ANCHO / 2 + (i - (opciones.length - 1) / 2) * (ancho + 16), top + alto - 48, ancho, 54, t, f, { prof: 93, tam: 22 }));
        this.nav = navegacion(this, botones);
        if (this.auto && gano && !ultimo && this.modo === 'aventura') this.time.delayedCall(1500, () => botones[0].pulsar());
    }
}
