/* Sonido de Memory Card, sintetizado con WebAudio: efectos y un tema para cada mundo.
   El navegador solo deja sonar audio tras un gesto del jugador (Sonido.iniciar). */
const Sonido = (() => {
    const CLAVE = 'memoria-sonido';
    let activo = true, musicaActiva = true;
    try {
        activo = localStorage.getItem(CLAVE) !== 'no';
        musicaActiva = localStorage.getItem(CLAVE + '-musica') !== 'no';
    } catch (e) { /* sin almacenamiento */ }

    let ctx = null, maestro = null, busSfx = null, busMusica = null, ruidoBuffer = null, pendiente = null;

    function iniciar() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        comp.connect(ctx.destination);
        maestro = ctx.createGain(); maestro.gain.value = activo ? 1 : 0; maestro.connect(comp);
        busSfx = ctx.createGain(); busSfx.gain.value = 0.55; busSfx.connect(maestro);
        busMusica = ctx.createGain(); busMusica.gain.value = musicaActiva ? 0.22 : 0; busMusica.connect(maestro);
        ruidoBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        if (pendiente) { const p = pendiente; pendiente = null; musica(p); }
    }

    function tono({ tipo = 'square', f0 = 440, f1 = f0, dur = 0.12, vol = 0.2, retardo = 0, bus = busSfx }) {
        if (!ctx) return;
        const t = ctx.currentTime + retardo;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(bus);
        osc.start(t); osc.stop(t + dur + 0.02);
    }

    function ruido({ dur = 0.15, vol = 0.25, f0 = 2000, f1 = 300, tipo = 'lowpass', retardo = 0, bus = busSfx }) {
        if (!ctx) return;
        const t = ctx.currentTime + retardo;
        const src = ctx.createBufferSource();
        src.buffer = ruidoBuffer;
        const filtro = ctx.createBiquadFilter();
        filtro.type = tipo;
        filtro.frequency.setValueAtTime(f0, t);
        filtro.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filtro); filtro.connect(g); g.connect(bus);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }

    const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);

    const EFECTOS = {
        // Al voltear una carta: un "fsss" corto de papel
        voltear: () => { ruido({ dur: 0.07, vol: 0.18, f0: 5000, f1: 1800, tipo: 'bandpass' }); tono({ tipo: 'sine', f0: 900, f1: 1300, dur: 0.05, vol: 0.04 }); },
        // Cada pareja del combo suena un poco más aguda
        pareja: (combo = 1) => { const n = 72 + Math.min(combo - 1, 6) * 2; [0, 4, 7, 12].forEach((d, i) => tono({ tipo: 'triangle', f0: nota(n + d), dur: 0.16, vol: 0.12, retardo: i * 0.05 })); },
        trio: () => [72, 76, 79, 84, 88].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: 0.18, vol: 0.12, retardo: i * 0.05 })),
        fallo: () => { tono({ tipo: 'square', f0: 330, f1: 220, dur: 0.14, vol: 0.06 }); tono({ tipo: 'square', f0: 262, f1: 180, dur: 0.18, vol: 0.06, retardo: 0.12 }); },
        trampa: () => { tono({ tipo: 'sawtooth', f0: 220, f1: 70, dur: 0.6, vol: 0.12 }); ruido({ dur: 0.5, vol: 0.2, f0: 1200, f1: 150 }); [58, 61, 64].forEach((n, i) => tono({ tipo: 'square', f0: nota(n), dur: 0.2, vol: 0.05, retardo: 0.1 + i * 0.12 })); },
        barajar: () => { for (let i = 0; i < 10; i++) ruido({ dur: 0.05, vol: 0.12, f0: 4000, f1: 2000, tipo: 'bandpass', retardo: i * 0.05 }); },
        cambio: () => { ruido({ dur: 0.18, vol: 0.12, f0: 3000, f1: 800, tipo: 'bandpass' }); tono({ tipo: 'sine', f0: 400, f1: 800, dur: 0.18, vol: 0.06 }); },
        reloj: () => [0, 0.12, 0.24].forEach((r) => tono({ tipo: 'square', f0: 1400, dur: 0.03, vol: 0.06, retardo: r })),
        ojo: () => { tono({ tipo: 'sine', f0: 400, f1: 1600, dur: 0.35, vol: 0.1 }); ruido({ dur: 0.3, vol: 0.1, f0: 6000, f1: 2000, tipo: 'highpass' }); },
        cofre: () => { [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => tono({ tipo: 'square', f0: nota(n), dur: 0.12, vol: 0.06, retardo: i * 0.05 })); for (let i = 0; i < 8; i++) tono({ tipo: 'sine', f0: 2000 + Math.random() * 1500, dur: 0.06, vol: 0.04, retardo: 0.3 + i * 0.06 }); },
        tic: () => tono({ tipo: 'square', f0: 1000, dur: 0.03, vol: 0.05 }),
        alarma: () => tono({ tipo: 'square', f0: 880, f1: 660, dur: 0.12, vol: 0.06 }),
        nivel: () => [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tono({ f0: nota(n), dur: i === 6 ? 0.55 : 0.12, vol: 0.1, retardo: i * 0.11 })),
        derrota: () => [67, 65, 64, 60].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: i === 3 ? 0.7 : 0.25, vol: 0.12, retardo: i * 0.2 })),
        menu: () => tono({ f0: nota(84), dur: 0.05, vol: 0.06 }),
        elegir: () => { tono({ f0: nota(79), dur: 0.06, vol: 0.08 }); tono({ f0: nota(86), dur: 0.12, vol: 0.08, retardo: 0.06 }); },
        estrella: () => [79, 84, 91].forEach((n, i) => tono({ tipo: 'triangle', f0: nota(n), dur: 0.22, vol: 0.13, retardo: i * 0.05 })),
        error: () => tono({ tipo: 'square', f0: 200, f1: 150, dur: 0.15, vol: 0.06 }),
    };

    function sfx(nombre, arg) {
        if (!ctx || !activo) return;
        const f = EFECTOS[nombre];
        if (f) f(arg);
    }

    /* ---------- Música chiptune: bajo, arpegio, batería y melodía ---------- */
    const ACORDES = { M: [0, 4, 7, 12], m: [0, 3, 7, 12] };
    const CANCIONES = {
        menu: { bpm: 104, acordes: [[48, 'M'], [45, 'm'], [41, 'M'], [43, 'M']],
            melodia: [76, null, 79, null, 84, null, 83, 79, 81, null, 77, null, 76, null, null, null,
                      74, null, 77, null, 81, null, 79, 77, 76, null, 72, null, 74, null, null, null] },
        mina: { bpm: 112, acordes: [[45, 'm'], [41, 'M'], [43, 'M'], [40, 'M']],
            melodia: [76, null, null, 72, 74, null, 76, null, 77, null, 76, 74, 72, null, null, null,
                      71, null, null, 72, 74, null, 71, null, 69, null, 68, null, 69, null, null, null] },
        templo: { bpm: 120, acordes: [[50, 'm'], [48, 'M'], [46, 'M'], [45, 'M']],
            melodia: [74, null, 77, null, 81, 79, 77, null, 76, null, 74, null, 73, null, null, null,
                      74, null, 77, null, 79, 81, 82, null, 81, null, 79, null, 77, null, null, null] },
        boveda: { bpm: 126, acordes: [[48, 'M'], [52, 'm'], [53, 'M'], [55, 'M']],
            melodia: [79, null, 84, 83, 79, null, 76, null, 77, null, 81, null, 79, null, null, null,
                      79, null, 84, 86, 88, null, 86, 84, 83, null, 79, null, 81, null, null, null] },
        final: { bpm: 108, acordes: [[48, 'M'], [43, 'M'], [45, 'm'], [41, 'M']],
            melodia: [79, null, 84, null, 88, null, 84, null, 83, null, 79, null, 81, null, null, null,
                      84, null, 83, null, 81, null, 79, null, 81, null, null, null, null, null, null, null] },
    };

    let actual = null, temporizador = null, paso = 0, proxima = 0;

    function programar() {
        const c = CANCIONES[actual];
        if (!c || !ctx) return;
        const dur = 60 / c.bpm / 4;
        while (proxima < ctx.currentTime + 0.12) {
            const compas = Math.floor(paso / 16) % c.acordes.length;
            const p = paso % 16;
            const [raiz, tipo] = c.acordes[compas];
            const t0 = proxima - ctx.currentTime;
            if (p % 2 === 0) tono({ tipo: 'triangle', f0: nota(raiz - 12 + (p % 8 === 4 ? 7 : 0)), dur: dur * 1.8, vol: 0.28, retardo: t0, bus: busMusica });
            tono({ tipo: 'square', f0: nota(raiz + 12 + ACORDES[tipo][p % 4]), dur: dur * 0.7, vol: 0.025, retardo: t0, bus: busMusica });
            if (p % 4 === 0) tono({ tipo: 'sine', f0: 150, f1: 45, dur: 0.1, vol: 0.2, retardo: t0, bus: busMusica });
            if (p % 8 === 4) ruido({ dur: 0.08, vol: 0.09, f0: 6000, f1: 2500, tipo: 'highpass', retardo: t0, bus: busMusica });
            if (p % 2 === 1) ruido({ dur: 0.03, vol: 0.03, f0: 9000, f1: 7000, tipo: 'highpass', retardo: t0, bus: busMusica });
            const m = c.melodia[paso % c.melodia.length];
            if (m) tono({ tipo: 'square', f0: nota(m), dur: dur * 1.7, vol: 0.05, retardo: t0, bus: busMusica });
            proxima += dur;
            paso++;
        }
    }

    function musica(nombre) {
        if (!ctx) { pendiente = nombre; return; }
        if (actual === nombre) return;
        parar();
        actual = nombre;
        paso = 0;
        proxima = ctx.currentTime + 0.05;
        temporizador = setInterval(programar, 30);
    }

    function parar() {
        if (temporizador) clearInterval(temporizador);
        temporizador = null;
        actual = null;
    }

    function guardar() {
        try {
            localStorage.setItem(CLAVE, activo ? 'si' : 'no');
            localStorage.setItem(CLAVE + '-musica', musicaActiva ? 'si' : 'no');
        } catch (e) { /* sin almacenamiento */ }
    }

    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
    });

    return {
        iniciar, sfx, musica, parar,
        alternar() { activo = !activo; guardar(); if (maestro) maestro.gain.setTargetAtTime(activo ? 1 : 0, ctx.currentTime, 0.02); return activo; },
        alternarMusica() { musicaActiva = !musicaActiva; guardar(); if (busMusica) busMusica.gain.setTargetAtTime(musicaActiva ? 0.22 : 0, ctx.currentTime, 0.05); return musicaActiva; },
        get activo() { return activo; },
        get musicaActiva() { return musicaActiva; },
    };
})();
