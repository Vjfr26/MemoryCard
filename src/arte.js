/* El arte de Memory Card: las 8 gemas originales se cargan como imagen y otras 10 se dibujan
   por código con el mismo estilo plano facetado. También se dibujan las cartas especiales,
   el anverso y los reversos de cada mundo, los fondos, partículas, estrellas y botones. */

const CARTA_W = 200, CARTA_H = 264;

const Arte = (() => {
    function lienzo(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return [c, c.getContext('2d')];
    }

    function registrar(escena, clave, canvas) {
        if (escena.textures.exists(clave)) escena.textures.remove(clave);
        return escena.textures.addCanvas(clave, canvas);
    }

    function redondeado(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }

    const azar = (a, b) => a + Math.random() * (b - a);
    function hexARgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function mezclar(h1, h2, t) {
        const a = hexARgb(h1), b = hexARgb(h2);
        return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
    }

    /* ---------------- Gemas facetadas ---------------- */
    function poligono(g, pts) {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
    }

    /** Gema plana: cada lado del contorno es una faceta con su luz, y el centro es la "tabla". */
    function gemaFacetada(g, pts, color, oscuro, claro, escalaTabla = 0.55) {
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const tabla = pts.map(([x, y]) => [cx + (x - cx) * escalaTabla, cy + (y - cy) * escalaTabla]);
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const a = pts[i], b = pts[(i + 1) % n];
            let nx = b[1] - a[1], ny = -(b[0] - a[0]);
            const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
            if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
            const l = Math.hypot(nx, ny) || 1;
            const luz = ((nx / l) * -0.55 + (ny / l) * -0.83 + 1) / 2;
            g.fillStyle = luz > 0.5 ? mezclar(color, claro, (luz - 0.5) * 1.6) : mezclar(oscuro, color, luz * 2);
            poligono(g, [a, b, tabla[(i + 1) % n], tabla[i]]);
            g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.stroke();
        }
        g.fillStyle = mezclar(color, claro, 0.55);
        poligono(g, tabla); g.fill();
        // Reflejo en la tabla
        g.fillStyle = 'rgba(255,255,255,0.35)';
        const t0 = tabla[0];
        poligono(g, [[cx, cy], t0, tabla[Math.floor(n / 8) % n] || t0]); g.fill();
    }

    const C = 128;
    const circulo = (n, rx, ry = rx, giro = 0) => Array.from({ length: n }, (_, i) => { const a = giro + (i / n) * Math.PI * 2; return [C + Math.cos(a) * rx, C + Math.sin(a) * ry]; });
    const FORMAS = [
        // corazón (rubí)
        { pts: Array.from({ length: 20 }, (_, i) => { const t = (i / 20) * Math.PI * 2; return [C + 6.2 * 16 * Math.pow(Math.sin(t), 3), C - 6.2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 6]; }), c: ['#e8263f', '#8c0f22', '#ff9aa8'] },
        // estrella (oro)
        { pts: Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 46 : 108, a = -Math.PI / 2 + (i * Math.PI) / 5; return [C + Math.cos(a) * r, C + 8 + Math.sin(a) * r]; }), c: ['#ffc21a', '#b87300', '#fff1a0'], tabla: 0.42 },
        // triángulo (aguamarina)
        { pts: [[C - 14, 30], [C + 14, 30], [C + 104, 196], [C + 92, 216], [C - 92, 216], [C - 104, 196]], c: ['#25d0e6', '#0b6f80', '#b8f6ff'] },
        // gota (zafiro claro): círculo abajo y punta arriba
        { pts: [[C, 20], ...Array.from({ length: 11 }, (_, i) => { const a = -Math.PI * 0.2 + (i / 10) * Math.PI * 1.4; return [C + Math.cos(a) * 74, C + 50 + Math.sin(a) * 74]; })], c: ['#4aa8ff', '#16488f', '#cfe8ff'] },
        // marquesa (granate anaranjado): una lente con las puntas afiladas
        { pts: [...Array.from({ length: 7 }, (_, i) => { const x = -110 + (i / 6) * 220; return [C + x, C - 66 * (1 - (x / 110) ** 2)]; }), ...Array.from({ length: 5 }, (_, i) => { const x = 110 - ((i + 1) / 6) * 220; return [C + x, C + 66 * (1 - (x / 110) ** 2)]; })], c: ['#ff5a1a', '#8f2600', '#ffcaa8'] },
        // óvalo (turquesa)
        { pts: circulo(14, 76, 104, Math.PI / 14), c: ['#18c4a0', '#06705a', '#b0ffe8'] },
        // brillante redondo (diamante)
        { pts: circulo(16, 104), c: ['#cfe6f5', '#6f8ca8', '#ffffff'], tabla: 0.5 },
        // escudo (índigo)
        { pts: [[C - 96, 36], [C + 96, 36], [C + 96, 120], [C + 60, 180], [C, 222], [C - 60, 180], [C - 96, 120]], c: ['#5b4be8', '#251a80', '#cbc4ff'] },
        // hexágono ancho (ónice)
        { pts: [[C - 110, C], [C - 60, C - 78], [C + 60, C - 78], [C + 110, C], [C + 60, C + 78], [C - 60, C + 78]], c: ['#55557a', '#1e1e30', '#d8d8f0'] },
        // corona (coral)
        { pts: [[C - 104, 70], [C - 52, 120], [C, 46], [C + 52, 120], [C + 104, 70], [C + 88, 206], [C - 88, 206]], c: ['#ff5f8f', '#99183f', '#ffd0df'], tabla: 0.5 },
    ];

    function gemasDibujadas(escena) {
        FORMAS.forEach((f, i) => {
            const [c, g] = lienzo(256, 256);
            // Más grandes, para que ocupen la carta como las gemas originales
            const xs = f.pts.map((p) => p[0]), ys = f.pts.map((p) => p[1]);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            const k = 116 / Math.max(Math.max(...xs) - cx, Math.max(...ys) - cy);
            f = { ...f, pts: f.pts.map(([x, y]) => [C + (x - cx) * k, C + (y - cy) * k]) };
            g.save();
            g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 10; g.shadowOffsetY = 6;
            poligono(g, f.pts); g.fillStyle = f.c[1]; g.fill();
            g.restore();
            gemaFacetada(g, f.pts, f.c[0], f.c[1], f.c[2], f.tabla || 0.55);
            registrar(escena, 'gema_' + (8 + i), c);
        });
    }

    /* ---------------- Cartas especiales ---------------- */
    function especiales(escena) {
        let [c, g] = lienzo(256, 256);
        // Reloj de arena
        g.fillStyle = '#c98a1a'; redondeado(g, 52, 24, 152, 22, 8); g.fill(); redondeado(g, 52, 210, 152, 22, 8); g.fill();
        g.fillStyle = 'rgba(200,240,255,0.55)'; g.strokeStyle = '#8fd0f0'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(70, 46); g.lineTo(186, 46); g.quadraticCurveTo(186, 110, 136, 128); g.quadraticCurveTo(186, 146, 186, 210); g.lineTo(70, 210); g.quadraticCurveTo(70, 146, 120, 128); g.quadraticCurveTo(70, 110, 70, 46); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ffcf4a';
        g.beginPath(); g.moveTo(92, 70); g.lineTo(164, 70); g.quadraticCurveTo(156, 104, 128, 120); g.quadraticCurveTo(100, 104, 92, 70); g.fill();
        g.beginPath(); g.moveTo(84, 204); g.quadraticCurveTo(128, 150, 172, 204); g.closePath(); g.fill();
        g.fillRect(126, 120, 4, 50);
        g.fillStyle = '#7a4e0a'; for (const x of [62, 186]) g.fillRect(x - 4, 44, 8, 168);
        registrar(escena, 'esp_reloj', c);

        // Ojo
        [c, g] = lienzo(256, 256);
        g.fillStyle = '#ffffff'; g.strokeStyle = '#2b2b5a'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(24, 128); g.quadraticCurveTo(128, 30, 232, 128); g.quadraticCurveTo(128, 226, 24, 128); g.closePath(); g.fill(); g.stroke();
        let rg = g.createRadialGradient(118, 118, 6, 128, 128, 50);
        rg.addColorStop(0, '#9ef0ff'); rg.addColorStop(0.6, '#1fa6d8'); rg.addColorStop(1, '#0b4f80');
        g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0b0b20'; g.beginPath(); g.arc(128, 128, 20, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(114, 112, 9, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2b2b5a'; g.lineWidth = 6; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.175); g.beginPath(); g.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 76); g.lineTo(128 + Math.cos(a) * 132, 128 + Math.sin(a) * 96); g.stroke(); }
        registrar(escena, 'esp_ojo', c);

        // Cofre del tesoro
        [c, g] = lienzo(256, 256);
        g.fillStyle = '#ffd23f';
        for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(70 + Math.random() * 116, 92 + Math.random() * 18, 14, 9, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#b8860b'; g.lineWidth = 2; g.stroke(); }
        g.fillStyle = '#8a4b1c'; redondeado(g, 34, 108, 188, 110, 14); g.fill();
        g.fillStyle = '#a65d26'; redondeado(g, 34, 60, 188, 56, 24); g.fill();
        g.fillStyle = '#e8b93a';
        for (const x of [54, 190]) g.fillRect(x, 60, 14, 158);
        g.fillRect(34, 108, 188, 12);
        redondeado(g, 108, 112, 40, 46, 8); g.fill();
        g.fillStyle = '#5a3008'; g.beginPath(); g.arc(128, 130, 7, 0, Math.PI * 2); g.fill(); g.fillRect(125, 132, 6, 14);
        g.strokeStyle = '#4a2408'; g.lineWidth = 4; redondeado(g, 34, 60, 188, 158, 16); g.stroke();
        registrar(escena, 'esp_cofre', c);

        // Trampa: calavera
        [c, g] = lienzo(256, 256);
        g.fillStyle = '#efe8ff'; g.strokeStyle = '#3a1f5a'; g.lineWidth = 7;
        g.beginPath(); g.arc(128, 108, 76, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(170, 196); g.lineTo(86, 196); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#3a1f5a';
        for (const x of [98, 158]) { g.beginPath(); g.ellipse(x, 116, 21, 24, 0, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.moveTo(128, 140); g.lineTo(116, 166); g.lineTo(140, 166); g.closePath(); g.fill();
        for (let i = 0; i < 4; i++) g.fillRect(98 + i * 16, 182, 8, 18);
        g.fillStyle = '#b07cff'; for (const x of [98, 158]) { g.beginPath(); g.arc(x, 118, 6, 0, Math.PI * 2); g.fill(); }
        registrar(escena, 'esp_trampa', c);
    }

    /* ---------------- Cartas ---------------- */
    function anverso(escena) {
        const [c, g] = lienzo(CARTA_W, CARTA_H);
        redondeado(g, 3, 3, CARTA_W - 6, CARTA_H - 6, 22);
        const fg = g.createLinearGradient(0, 0, 0, CARTA_H);
        fg.addColorStop(0, '#fffdf6'); fg.addColorStop(1, '#efe6d0');
        g.fillStyle = fg; g.fill();
        g.lineWidth = 4; g.strokeStyle = '#c9a85a'; g.stroke();
        redondeado(g, 14, 14, CARTA_W - 28, CARTA_H - 28, 14);
        g.lineWidth = 2; g.strokeStyle = 'rgba(201,168,90,0.6)'; g.stroke();
        registrar(escena, 'anverso', c);
    }

    const DORSOS = [
        { fondo: ['#8a5428', '#4e2c12'], linea: 'rgba(255,214,140,0.22)', emblema: '#ffb84a', borde: '#e8a650' },
        { fondo: ['#1f9a7a', '#0c4f40'], linea: 'rgba(170,255,220,0.22)', emblema: '#7dffcf', borde: '#7fe3c0' },
        { fondo: ['#4b2fa8', '#1d0f52'], linea: 'rgba(220,200,255,0.22)', emblema: '#ffd23f', borde: '#c9b0ff' },
    ];

    function dorso(escena, m) {
        const D = DORSOS[m];
        const [c, g] = lienzo(CARTA_W, CARTA_H);
        redondeado(g, 3, 3, CARTA_W - 6, CARTA_H - 6, 22);
        const fg = g.createLinearGradient(0, 0, CARTA_W, CARTA_H);
        fg.addColorStop(0, D.fondo[0]); fg.addColorStop(1, D.fondo[1]);
        g.fillStyle = fg; g.fill();
        g.save(); g.clip();
        g.strokeStyle = D.linea; g.lineWidth = 2;
        if (m === 0) {
            for (let y = 20; y < CARTA_H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(CARTA_W, y); g.stroke(); }
            for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(azar(0, CARTA_W), azar(0, CARTA_H), azar(10, 30), 2); }
        } else if (m === 1) {
            for (let k = 0; k < 6; k++) { redondeado(g, 18 + k * 14, 18 + k * 18, CARTA_W - 36 - k * 28, CARTA_H - 36 - k * 36, 6); g.stroke(); }
        } else {
            for (let k = -CARTA_H; k < CARTA_W + CARTA_H; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + CARTA_H, CARTA_H); g.stroke(); g.beginPath(); g.moveTo(k, CARTA_H); g.lineTo(k + CARTA_H, 0); g.stroke(); }
        }
        g.restore();
        // Emblema: un rombo-gema en el centro
        const cx = CARTA_W / 2, cy = CARTA_H / 2;
        g.beginPath(); g.arc(cx, cy, 46, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
        g.lineWidth = 4; g.strokeStyle = D.borde; g.stroke();
        gemaFacetada(g, [[cx, cy - 30], [cx + 26, cy], [cx, cy + 30], [cx - 26, cy]], D.emblema, mezclar(D.emblema, '#000000', 0.5), '#ffffff', 0.4);
        redondeado(g, 3, 3, CARTA_W - 6, CARTA_H - 6, 22);
        g.lineWidth = 5; g.strokeStyle = D.borde; g.stroke();
        redondeado(g, 14, 14, CARTA_W - 28, CARTA_H - 28, 14);
        g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
        registrar(escena, 'dorso_' + m, c);
    }

    function marcos(escena) {
        let [c, g] = lienzo(CARTA_W, CARTA_H);
        redondeado(g, 0, 0, CARTA_W, CARTA_H, 24); g.fillStyle = '#000'; g.fill();
        registrar(escena, 'sombra_carta', c);
        const m = 22;
        [c, g] = lienzo(CARTA_W + m * 2, CARTA_H + m * 2);
        g.shadowColor = '#fff'; g.shadowBlur = 18;
        redondeado(g, m, m, CARTA_W, CARTA_H, 22);
        g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
        registrar(escena, 'brillo_carta', c);
    }

    /* ---------------- Fondos de cada mundo ---------------- */
    function fondo(escena, m) {
        const [c, g] = lienzo(ANCHO, ALTO);
        const colores = [['#3a2414', '#140a04'], ['#0f3d33', '#04140f'], ['#1c1046', '#06031a']][m];
        const rg = g.createRadialGradient(ANCHO / 2, ALTO * 0.45, 80, ANCHO / 2, ALTO / 2, ANCHO * 0.75);
        rg.addColorStop(0, colores[0]); rg.addColorStop(1, colores[1]);
        g.fillStyle = rg; g.fillRect(0, 0, ANCHO, ALTO);
        if (m === 0) {
            // Roca con vetas y vigas de madera
            for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,190,120,${azar(0.03, 0.07)})`; g.lineWidth = azar(1, 3); g.beginPath(); let x = azar(0, ANCHO), y = azar(0, ALTO); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += azar(-60, 60); y += azar(-30, 30); g.lineTo(x, y); } g.stroke(); }
            for (let i = 0; i < 70; i++) { g.fillStyle = ['#7dff9a', '#ff5a7a', '#6be3ff', '#ffd23f'][i % 4]; g.globalAlpha = azar(0.25, 0.6); g.beginPath(); g.arc(azar(0, ANCHO), azar(0, ALTO), azar(1, 3), 0, Math.PI * 2); g.fill(); }
            g.globalAlpha = 1;
            const madera = (x, y, w, h) => { const wg = g.createLinearGradient(x, y, x + w, y + h); wg.addColorStop(0, '#7a4a22'); wg.addColorStop(1, '#4a2a10'); g.fillStyle = wg; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(x, y, w, h); };
            madera(0, 0, 26, ALTO); madera(ANCHO - 26, 0, 26, ALTO); madera(0, 0, ANCHO, 22);
            for (const x of [160, ANCHO - 160]) { const lg = g.createRadialGradient(x, 40, 2, x, 40, 160); lg.addColorStop(0, 'rgba(255,200,110,0.35)'); lg.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = lg; g.fillRect(x - 160, 0, 320, 220); }
        } else if (m === 1) {
            // Piedra del templo y hojas
            g.strokeStyle = 'rgba(160,255,220,0.06)'; g.lineWidth = 2;
            for (let y = 0; y < ALTO; y += 48) for (let x = (y / 48) % 2 ? 0 : 48; x < ANCHO; x += 96) g.strokeRect(x, y, 96, 48);
            for (let i = 0; i < 60; i++) {
                const x = i % 2 ? azar(0, 140) : azar(ANCHO - 140, ANCHO), y = azar(0, ALTO);
                g.fillStyle = `rgba(${40 + azar(0, 40)},${140 + azar(0, 60)},${70 + azar(0, 40)},${azar(0.35, 0.7)})`;
                g.beginPath(); g.ellipse(x, y, azar(14, 30), azar(6, 12), azar(0, 3), 0, Math.PI * 2); g.fill();
            }
        } else {
            // Bóveda: destellos y montones de monedas
            for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,${200 + azar(0, 55)},${120 + azar(0, 100)},${azar(0.15, 0.6)})`; g.beginPath(); g.arc(azar(0, ANCHO), azar(0, ALTO), azar(0.6, 2.2), 0, Math.PI * 2); g.fill(); }
            for (const [bx, dir] of [[0, 1], [ANCHO, -1]]) {
                for (let i = 0; i < 70; i++) {
                    const x = bx + dir * azar(0, 220) * Math.random(), y = ALTO - azar(0, 120) * Math.random();
                    g.fillStyle = '#e8b93a'; g.beginPath(); g.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2); g.fill();
                    g.strokeStyle = '#8a5a00'; g.lineWidth = 1.5; g.stroke();
                }
            }
        }
        // Viñeta
        const vg = g.createRadialGradient(ANCHO / 2, ALTO / 2, ALTO * 0.45, ANCHO / 2, ALTO / 2, ANCHO * 0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        g.fillStyle = vg; g.fillRect(0, 0, ANCHO, ALTO);
        registrar(escena, 'fondo_' + m, c);
    }

    /* ---------------- Piezas pequeñas y UI ---------------- */
    function piezas(escena) {
        let [c, g] = lienzo(24, 24);
        let rg = g.createRadialGradient(12, 12, 0, 12, 12, 12);
        rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 24, 24);
        registrar(escena, 'chispa', c);
        [c, g] = lienzo(40, 40);
        g.fillStyle = '#fff';
        g.beginPath(); g.moveTo(20, 0); g.quadraticCurveTo(22, 18, 40, 20); g.quadraticCurveTo(22, 22, 20, 40); g.quadraticCurveTo(18, 22, 0, 20); g.quadraticCurveTo(18, 18, 20, 0); g.fill();
        registrar(escena, 'destello', c);
        [c, g] = lienzo(28, 28);
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(14, 14, 12, 0, Math.PI * 2); g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#a86e00'; g.stroke();
        g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(10, 10, 4, 0, Math.PI * 2); g.fill();
        registrar(escena, 'moneda', c);
        [c, g] = lienzo(48, 48);
        rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
        rg.addColorStop(0, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 48, 48);
        registrar(escena, 'humo', c);
        [c, g] = lienzo(12, 7);
        g.fillStyle = '#fff'; g.fillRect(0, 0, 12, 7);
        registrar(escena, 'confeti', c);

        const estrella = (clave, relleno, borde) => {
            const [ce, ge] = lienzo(64, 64);
            ge.beginPath();
            for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 29, a = -Math.PI / 2 + (i * Math.PI) / 5; ge.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); }
            ge.closePath(); ge.fillStyle = relleno; ge.fill(); ge.lineJoin = 'round'; ge.lineWidth = 4; ge.strokeStyle = borde; ge.stroke();
            registrar(escena, clave, ce);
        };
        estrella('estrella', '#ffcf3a', '#7a4a08');
        estrella('estrella_vacia', 'rgba(0,0,0,0.35)', 'rgba(255,255,255,0.4)');
        [c, g] = lienzo(48, 56);
        g.beginPath(); g.arc(24, 22, 13, Math.PI, 0); g.lineWidth = 6; g.strokeStyle = '#c9ced8'; g.stroke();
        redondeado(g, 6, 22, 36, 30, 7); g.fillStyle = '#e8b93a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#7a5a12'; g.stroke();
        g.beginPath(); g.arc(24, 35, 4, 0, Math.PI * 2); g.fillStyle = '#5a400a'; g.fill(); g.fillRect(22, 36, 4, 8);
        registrar(escena, 'candado', c);
        // Trofeo
        [c, g] = lienzo(170, 190);
        const tg = g.createLinearGradient(20, 0, 150, 0);
        tg.addColorStop(0, '#b8860b'); tg.addColorStop(0.35, '#ffe27a'); tg.addColorStop(0.6, '#ffc93a'); tg.addColorStop(1, '#a8740a');
        for (const s of [-1, 1]) { g.beginPath(); g.arc(85 + s * 58, 52, 22, 0, Math.PI * 2); g.lineWidth = 9; g.strokeStyle = '#d9a520'; g.stroke(); }
        g.fillStyle = tg; g.lineWidth = 4; g.strokeStyle = '#6b4a06';
        g.beginPath(); g.moveTo(32, 18); g.lineTo(138, 18); g.quadraticCurveTo(136, 104, 85, 116); g.quadraticCurveTo(34, 104, 32, 18); g.closePath(); g.fill(); g.stroke();
        g.fillRect(74, 114, 22, 30); g.strokeRect(74, 114, 22, 30);
        redondeado(g, 44, 142, 82, 18, 5); g.fill(); g.stroke();
        redondeado(g, 34, 158, 102, 24, 6); g.fill(); g.stroke();
        registrar(escena, 'trofeo', c);

        const boton = (clave, grad, borde, base) => {
            const [cb, gb] = lienzo(64, 64);
            redondeado(gb, 2, 6, 60, 56, 18); gb.fillStyle = base; gb.fill();
            redondeado(gb, 2, 2, 60, 55, 18);
            const bg = gb.createLinearGradient(0, 0, 0, 56);
            bg.addColorStop(0, grad[0]); bg.addColorStop(1, grad[1]);
            gb.fillStyle = bg; gb.fill(); gb.lineWidth = 2.5; gb.strokeStyle = borde; gb.stroke();
            registrar(escena, clave, cb);
        };
        boton('boton', ['#fffaf0', '#efe2c8'], '#a8895a', '#c9b08a');
        boton('boton_oro', ['#fff0a8', '#ffc83d'], '#8a5a08', '#c98a10');
        [c, g] = lienzo(64, 64);
        redondeado(g, 2, 2, 60, 60, 18); g.fillStyle = 'rgba(18,14,30,0.94)'; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#e6c77a'; g.stroke();
        registrar(escena, 'panel', c);

        const icono = (clave, dibujar) => { const [ci, gi] = lienzo(48, 48); gi.fillStyle = '#fff'; gi.strokeStyle = '#fff'; gi.lineWidth = 4; gi.lineCap = 'round'; gi.lineJoin = 'round'; dibujar(gi); registrar(escena, clave, ci); };
        const altavoz = (gi) => { gi.beginPath(); gi.moveTo(8, 18); gi.lineTo(16, 18); gi.lineTo(26, 9); gi.lineTo(26, 39); gi.lineTo(16, 30); gi.lineTo(8, 30); gi.closePath(); gi.fill(); };
        icono('ic_sonido', (gi) => { altavoz(gi); gi.beginPath(); gi.arc(26, 24, 8, -0.9, 0.9); gi.stroke(); gi.beginPath(); gi.arc(26, 24, 15, -0.9, 0.9); gi.stroke(); });
        icono('ic_mudo', (gi) => { altavoz(gi); gi.beginPath(); gi.moveTo(32, 17); gi.lineTo(42, 31); gi.moveTo(42, 17); gi.lineTo(32, 31); gi.stroke(); });
        icono('ic_pausa', (gi) => { gi.fillRect(12, 9, 8, 30); gi.fillRect(28, 9, 8, 30); });
    }

    return {
        cargar(escena) {
            for (let i = 1; i <= 8; i++) escena.load.image('gema_' + (i - 1), `img-${i}.png`);
        },
        generar(escena) {
            gemasDibujadas(escena);
            especiales(escena);
            anverso(escena);
            for (let m = 0; m < 3; m++) { dorso(escena, m); fondo(escena, m); }
            marcos(escena);
            piezas(escena);
        },
    };
})();
