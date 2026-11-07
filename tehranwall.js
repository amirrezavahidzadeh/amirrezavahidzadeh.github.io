/* ─────────────────────────────────────────────────────────────
   TEHRAN WALL: a long, non-repeating Tehran panorama for the corridor
   walls. Drawn once, in neon line-art. One full lap of the corridor is
   one full panorama on each wall (different on left and right), and it
   wraps seamlessly so the endless loop never shows a seam.
   Coordinates are in metres: a = distance along the wall, y = height.
   ───────────────────────────────────────────────────────────── */
window.TEHRAN_WALL = (() => {
  const TAU = Math.PI * 2;
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const COL = { cy: '#22f3ff', mg: '#ff2bd6', yl: '#ffe14d', lm: '#7dff6a', vi: '#b06bff', or: '#ff8a3d', tq: '#2bffc6', gd: '#ffc94d' };
  // shop signs that are really about Amirreza: cinema, writing, games, chess, AI and his projects
  const WORDS = ['سینما', 'فیلم', 'بازی', 'شطرنج', 'نویسنده', 'کارگردان', 'فیلمنامه', 'سیاوش', 'شاهنامه', 'دوربین', 'اکشن', 'کات', 'هوش مصنوعی', 'بازار پرامپت', 'نهال', 'موزیک ویدیو', 'فیلم کوتاه', 'گیم'];

  // build the scene description for one wall, laid out over one lap of length L
  function plan(L, side, H, at) {
    const r = rng(side < 0 ? 4111 : 9377);
    const P = { L, side, skyHue: side < 0 ? 275 : 200, items: [] };
    // periodic ridge: sum of sines whose periods divide the lap, so it wraps exactly
    const ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];
    P.ridge = a => { const t = a / L * TAU; return H * .68 + .28 * Math.sin(t * 2 + ph[0]) + .18 * Math.sin(t * 5 + ph[1]) + .1 * Math.sin(t * 11 + ph[2]) + .05 * Math.sin(t * 23 + ph[3]); };
    P.ridge2 = a => { const t = a / L * TAU; return H * .58 + .2 * Math.sin(t * 3 + ph[1]) + .12 * Math.sin(t * 7 + ph[3]) + .06 * Math.sin(t * 17 + ph[0]); };
    // landmarks, spread around the lap
    const marks = side < 0
      ? [['damavand', .06], ['milad', .2], ['tabiat', .41], ['azadi', .62], ['metro', .82]]
      : [['tochal', .08], ['shams', .27], ['mosque', .47], ['bazaar', .68], ['towers', .86]];
    marks.forEach(([k, f]) => P.items.push({ k, a: at && at[k] != null ? at[k] : f * L }));
    // ordinary city: blocks between landmarks, never overlapping them
    const busy = P.items.map(m => [m.a - (m.k === 'damavand' || m.k === 'tochal' ? 0 : 3.2), m.a + 3.2]);
    let a = 0;
    while (a < L) {
      const w = .7 + r() * 1.6, h = 1.1 + Math.pow(r(), 1.5) * 3.1;
      const free = !busy.some(([x0, x1]) => a + w > x0 && a < x1 && x1 - x0 > 1);
      if (free) P.items.push({ k: 'block', a, w, h, seed: Math.floor(r() * 1e6), tank: r() < .55, dish: r() < .35, sign: r() < .16 ? WORDS[Math.floor(r() * WORDS.length)] : null, signCol: Object.values(COL)[Math.floor(r() * 8)] });
      a += w + .06 + r() * .25;
    }
    // street life
    for (let i = 0, n = Math.round(L / 4.5); i < n; i++) if (r() < .7) P.items.push({ k: 'tree', a: (i + r() * .7) * L / n, s: .5 + r() * .35 });
    for (let i = 0, n = Math.round(L / 5); i < n; i++) P.items.push({ k: 'lamp', a: (i + .5) * L / n });
    P.stars = Array.from({ length: Math.round(L * 4) }, () => [r() * L, H * .72 + r() * H * .27, r()]); P.H = H;
    return P;
  }

  // draw the part of the panorama between a0 and a1 into a canvas context
  function draw(g, P, a0, a1, ppm, H) {
    const L = P.L, W = (a1 - a0) * ppm;
    const X = a => (a - a0) * ppm, Y = y => (H - y) * ppm;
    // every element is drawn at its position and one lap either side, so the seam is invisible
    const each = (a, w, fn) => { for (const o of [-L, 0, L]) { const x = a + o; if (x + w > a0 - 1 && x - 1 < a1) fn(x); } };
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    // sky: the horizon colour drifts around the lap, so no stretch looks the same
        const hueAt = a => P.skyHue + 55 * Math.sin(a / L * TAU) + 25 * Math.sin(a / L * TAU * 3 + 1);
    for (let px = 0; px < W; px += 4) {
      const hu = hueAt(a0 + px / ppm), gz = g.createLinearGradient(0, 0, 0, Y(.4));
      gz.addColorStop(0, '#040109'); gz.addColorStop(.55, `hsl(${hu.toFixed(1)},70%,9%)`); gz.addColorStop(1, `hsl(${(hu + 25).toFixed(1)},75%,20%)`);
      g.fillStyle = gz; g.fillRect(px, 0, 5, Y(.4));
    }
    // stars
    g.fillStyle = 'rgba(255,255,255,.7)';
    P.stars.forEach(([a, y, s]) => each(a, .02, x => { g.globalAlpha = .3 + s * .6; g.fillRect(X(x), Y(y), s > .85 ? 2 : 1, s > .85 ? 2 : 1); })); g.globalAlpha = 1;
    // far Alborz ridge with a thin rim of light, and a nearer ridge
    const ridge = (fn, fill, rim, rw) => {
      g.beginPath(); g.moveTo(-2, Y(0)); for (let px = -2; px <= W + 2; px += 3) g.lineTo(px, Y(fn(a0 + px / ppm))); g.lineTo(W + 2, Y(0)); g.closePath(); g.fillStyle = fill; g.fill();
      g.beginPath(); for (let px = -2; px <= W + 2; px += 3) { const y = Y(fn(a0 + px / ppm)); px < 0 ? g.moveTo(px, y) : g.lineTo(px, y); } g.strokeStyle = rim; g.lineWidth = rw; g.shadowColor = rim; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0;
    };
    ridge(P.ridge, '#0d0820', 'rgba(140,200,255,.55)', 1.4);
    ridge(P.ridge2, '#0a0518', 'rgba(176,107,255,.45)', 1.2);
    // haze over the base of the mountains
    const hz = g.createLinearGradient(0, Y(P.H * .45), 0, Y(.4)); hz.addColorStop(0, 'rgba(255,43,214,0)'); hz.addColorStop(1, 'rgba(255,43,214,.16)'); g.fillStyle = hz; g.fillRect(0, Y(P.H * .45), W, Y(.4) - Y(P.H * .45));

    const neon = (c, w = 2, b = 10) => { g.strokeStyle = c; g.lineWidth = w; g.shadowColor = c; g.shadowBlur = b; };
    const flat = '#07030f';
    const items = P.items.slice().sort((p, q) => (p.k === 'tree' || p.k === 'lamp') - (q.k === 'tree' || q.k === 'lamp'));
    for (const it of items) {
      const LM = LANDMARK[it.k];
      if (LM) { each(it.a, 4, x => { g.save(); g.translate(X(x), Y(.4)); g.scale(ppm, -ppm); LM(g, neon, flat); g.restore(); }); continue; }
      if (it.k === 'block') each(it.a, it.w, x => block(g, it, X(x), Y(.4), ppm, neon, flat));
      if (it.k === 'tree') each(it.a, .6, x => { const s = it.s * ppm, bx = X(x), by = Y(.4); g.fillStyle = '#05020b'; g.beginPath(); g.ellipse(bx, by - s * .62, s * .32, s * .4, 0, 0, TAU); g.fill(); g.fillRect(bx - s * .03, by - s * .3, s * .06, s * .3); neon('rgba(125,255,106,.55)', 1, 6); g.beginPath(); g.ellipse(bx, by - s * .62, s * .32, s * .4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.shadowBlur = 0; });
      if (it.k === 'lamp') each(it.a, .2, x => { const bx = X(x), by = Y(.4); neon('rgba(200,190,255,.5)', 1.2, 0); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - ppm * 1.15); g.lineTo(bx + ppm * .18, by - ppm * 1.2); g.stroke(); g.fillStyle = '#ffe9a8'; g.shadowColor = '#ffc94d'; g.shadowBlur = 16; g.beginPath(); g.arc(bx + ppm * .2, by - ppm * 1.18, ppm * .03, 0, TAU); g.fill(); g.shadowBlur = 0; });
    }
    // street: a glowing kerb, and long-exposure car light trails that vary around the lap
    g.shadowBlur = 0; g.fillStyle = '#040108'; g.fillRect(0, Y(.4), W, Y(0) - Y(.4) + 2);
    neon('rgba(255,43,214,.7)', 1.6, 8); g.beginPath(); g.moveTo(0, Y(.4)); g.lineTo(W, Y(.4)); g.stroke();
    for (const [y, c, f] of [[.33, 'rgba(255,60,60,.75)', 3], [.29, 'rgba(255,240,220,.7)', 5], [.25, 'rgba(255,200,80,.5)', 7]]) {
      neon(c, 1.6, 6); g.beginPath(); for (let px = 0; px <= W; px += 6) { const a = a0 + px / ppm, on = Math.sin(a / L * TAU * f * 3) + Math.sin(a / L * TAU * f * 7 + y * 40) > .4; const yy = Y(y); if (on) { g.lineTo(px, yy); } else g.moveTo(px, yy); } g.stroke();
    }
    g.restore();
  }

  // an ordinary Tehran block: flat roof, water tanks and dishes, a few lit windows, maybe a neon sign
  function block(g, it, x, base, ppm, neon, flat) {
    const w = it.w * ppm, h = it.h * ppm, r = rng(it.seed + 1);
    g.shadowBlur = 0; g.fillStyle = flat; g.fillRect(x, base - h, w, h);
    neon('rgba(120,90,200,.55)', 1, 0); g.strokeRect(x + .5, base - h + .5, w - 1, h - 1);
    // windows: a regular grid, only some lit, in warm and cool tones
    const cw = ppm * .09, ch = ppm * .11, gx = ppm * .07, gy = ppm * .1;
    for (let yy = base - h + gy; yy < base - ch - gy * .5; yy += ch + gy) for (let xx = x + gx; xx < x + w - cw - gx * .5; xx += cw + gx) {
      const v = r(); if (v < .62) continue;
      g.fillStyle = v > .95 ? 'rgba(34,243,255,.85)' : v > .88 ? 'rgba(255,43,214,.75)' : 'rgba(255,214,140,.55)';
      g.fillRect(xx, yy, cw, ch);
    }
    // rooftop: the yellow water tanks and white dishes every Tehran roof has
    if (it.tank) { const tx = x + w * (.2 + r() * .4), tw = ppm * .18; g.fillStyle = '#0c0614'; g.fillRect(tx, base - h - ppm * .14, tw, ppm * .14); neon('rgba(255,225,77,.75)', 1.2, 6); g.strokeRect(tx, base - h - ppm * .14, tw, ppm * .14); g.beginPath(); g.moveTo(tx + tw * .2, base - h); g.lineTo(tx + tw * .2, base - h - ppm * .04); g.stroke(); }
    if (it.dish) { const dx = x + w * (.65 + r() * .25); neon('rgba(230,230,255,.6)', 1.2, 4); g.beginPath(); g.arc(dx, base - h - ppm * .07, ppm * .06, Math.PI * .9, Math.PI * 1.9); g.stroke(); g.beginPath(); g.moveTo(dx, base - h); g.lineTo(dx, base - h - ppm * .05); g.stroke(); }
    if (it.sign) {
      const fs = Math.round(ppm * .22); g.font = `${fs}px Sahand, Vazirmatn, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(it.sign).width + fs * .6, sy = base - h * .55;
      if (tw < w * 1.2) { g.fillStyle = 'rgba(5,1,12,.85)'; g.fillRect(x + w / 2 - tw / 2, sy - fs * .7, tw, fs * 1.4); neon(it.signCol, 1.4, 10); g.strokeRect(x + w / 2 - tw / 2, sy - fs * .7, tw, fs * 1.4); g.fillStyle = it.signCol; g.shadowColor = it.signCol; g.shadowBlur = 14; g.fillText(it.sign, x + w / 2, sy + fs * .05); g.shadowBlur = 0; }
    }
  }

  // landmarks, drawn in metres with y up (the caller flips the axis); each fits in about 6 m
  const LANDMARK = {
    milad(g, neon, flat) {   // Milad tower: shaft, the faceted pod, mast
      g.fillStyle = flat; g.beginPath(); g.moveTo(-.22, 0); g.lineTo(-.07, 2.7); g.lineTo(.07, 2.7); g.lineTo(.22, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-.1, 2.7); g.lineTo(-.42, 2.86); g.lineTo(-.48, 3.02); g.lineTo(-.36, 3.2); g.lineTo(.36, 3.2); g.lineTo(.48, 3.02); g.lineTo(.42, 2.86); g.lineTo(.1, 2.7); g.closePath(); g.fill();
      g.fillRect(-.04, 3.2, .08, .55);
      neon(COL.cy, .025, 14); g.beginPath(); g.moveTo(-.22, 0); g.lineTo(-.07, 2.7); g.moveTo(.22, 0); g.lineTo(.07, 2.7);
      g.moveTo(-.1, 2.7); g.lineTo(-.42, 2.86); g.lineTo(-.48, 3.02); g.lineTo(-.36, 3.2); g.lineTo(.36, 3.2); g.lineTo(.48, 3.02); g.lineTo(.42, 2.86); g.lineTo(.1, 2.7); g.moveTo(-.48, 3.02); g.lineTo(.48, 3.02);
      g.moveTo(-.03, 3.2); g.lineTo(-.03, 3.75); g.moveTo(.03, 3.2); g.lineTo(.03, 3.75); g.moveTo(0, 3.75); g.lineTo(0, 4.1); g.stroke();
      g.fillStyle = COL.mg; g.shadowColor = COL.mg; g.beginPath(); g.arc(0, 4.1, .035, 0, TAU); g.fill(); g.shadowBlur = 0;
    },
    azadi(g, neon, flat) {   // Azadi tower: flared legs, central arch, the tapering top
      const s = 1.15; g.save(); g.scale(s, s);
      const path = () => { g.beginPath(); g.moveTo(-1, 0); g.quadraticCurveTo(-.58, .82, -.32, 1.72); g.lineTo(-.2, 2.12); g.lineTo(.2, 2.12); g.lineTo(.32, 1.72); g.quadraticCurveTo(.58, .82, 1, 0); g.lineTo(.5, 0); g.quadraticCurveTo(.34, .72, 0, 1.1); g.quadraticCurveTo(-.34, .72, -.5, 0); g.closePath(); };
      path(); g.fillStyle = flat; g.fill(); neon(COL.vi, .022, 14); path(); g.stroke();
      g.beginPath(); g.moveTo(-.2, 2.12); g.lineTo(-.12, 2.3); g.lineTo(.12, 2.3); g.lineTo(.2, 2.12); g.stroke();
      neon(COL.tq, .014, 8); g.beginPath(); g.moveTo(-.28, 1.62); g.quadraticCurveTo(0, 1.9, .28, 1.62); g.stroke();
      g.restore(); g.shadowBlur = 0;
    },
    tabiat(g, neon, flat) {  // Tabiat bridge: a long curved truss on tree-like columns
      neon(COL.tq, .02, 10);
      for (const cx of [-2.2, 0, 2.2]) { g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, .75); g.moveTo(cx, .5); g.lineTo(cx - .35, .9); g.moveTo(cx, .5); g.lineTo(cx + .35, .9); g.stroke(); }
      g.beginPath(); g.moveTo(-3.2, .82); g.quadraticCurveTo(0, 1.1, 3.2, .82); g.moveTo(-3.2, 1.02); g.quadraticCurveTo(0, 1.32, 3.2, 1.02); g.stroke();
      neon(COL.cy, .01, 4); g.beginPath(); for (let i = -16; i < 16; i++) { const x0 = i * .2, x1 = x0 + .2, y0 = .82 + .28 * (1 - (x0 / 3.2) ** 2), y1 = 1.02 + .3 * (1 - (x1 / 3.2) ** 2); g.moveTo(x0, y0); g.lineTo(x1, y1); } g.stroke(); g.shadowBlur = 0;
    },
    shams(g, neon, flat) {   // Shams-ol-Emareh: stacked arcaded storeys and two slim towers
      g.fillStyle = flat; g.fillRect(-.9, 0, 1.8, 1.7); g.fillRect(-.45, 1.7, .9, .55);
      neon(COL.gd, .018, 10); g.strokeRect(-.9, 0, 1.8, 1.7); g.strokeRect(-.45, 1.7, .9, .55);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const x = -.78 + i * .3, y = .15 + row * .52; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + .28); g.quadraticCurveTo(x + .1, y + .42, x + .2, y + .28); g.lineTo(x + .2, y); g.stroke(); }
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * .3, 2.25); g.lineTo(sx * .3, 2.75); g.lineTo(sx * .22, 2.9); g.lineTo(sx * .38, 2.9); g.lineTo(sx * .3, 2.75); g.stroke(); }
      neon(COL.cy, .014, 6); g.beginPath(); g.arc(0, 2.0, .12, 0, TAU); g.stroke(); g.shadowBlur = 0;
    },
    mosque(g, neon, flat) {  // a turquoise onion dome and two minarets
      g.fillStyle = flat; g.fillRect(-1.1, 0, 2.2, .9);
      const dome = () => { g.beginPath(); g.moveTo(-.62, .9); g.bezierCurveTo(-.75, 1.6, -.25, 1.85, 0, 2.15); g.bezierCurveTo(.25, 1.85, .75, 1.6, .62, .9); g.closePath(); };
      dome(); g.fillStyle = '#071a1c'; g.fill(); neon(COL.tq, .024, 16); dome(); g.stroke();
      g.beginPath(); g.moveTo(0, 2.15); g.lineTo(0, 2.4); g.stroke();
      neon(COL.tq, .012, 6); for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(-.62 + i * .207, .92); g.quadraticCurveTo(-.55 + i * .17, 1.6, 0, 2.12); g.stroke(); }
      for (const sx of [-1, 1]) { g.fillStyle = flat; g.fillRect(sx * 1.25 - .09, 0, .18, 2.4); neon(COL.gd, .016, 8); g.strokeRect(sx * 1.25 - .09, 0, .18, 2.4); g.beginPath(); g.moveTo(sx * 1.25 - .14, 1.9); g.lineTo(sx * 1.25 + .14, 1.9); g.moveTo(sx * 1.25 - .09, 2.4); g.lineTo(sx * 1.25, 2.62); g.lineTo(sx * 1.25 + .09, 2.4); g.stroke(); }
      neon(COL.gd, .016, 8); g.strokeRect(-1.1, 0, 2.2, .9); g.beginPath(); g.moveTo(-.3, 0); g.lineTo(-.3, .55); g.quadraticCurveTo(0, .85, .3, .55); g.lineTo(.3, 0); g.stroke(); g.shadowBlur = 0;
    },
    bazaar(g, neon, flat) {  // the Grand Bazaar: rows of small brick domes
      g.fillStyle = flat; g.fillRect(-2.6, 0, 5.2, .55);
      neon(COL.or, .016, 8); g.strokeRect(-2.6, 0, 5.2, .55);
      for (let i = 0; i < 9; i++) { const x = -2.4 + i * .6; g.beginPath(); g.moveTo(x - .24, .55); g.quadraticCurveTo(x, .95, x + .24, .55); g.fillStyle = flat; g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, .82); g.lineTo(x, .9); g.stroke(); }
      neon(COL.gd, .012, 6); for (let i = 0; i < 9; i++) { const x = -2.4 + i * .6; g.beginPath(); g.moveTo(x - .12, 0); g.lineTo(x - .12, .3); g.quadraticCurveTo(x, .42, x + .12, .3); g.lineTo(x + .12, 0); g.stroke(); }
      g.shadowBlur = 0;
    },
    metro(g, neon, flat) {   // an elevated metro line with a train passing
      neon('rgba(200,190,255,.6)', .016, 0); for (const x of [-2.6, -.9, .9, 2.6]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, .95); g.stroke(); }
      g.fillStyle = flat; g.fillRect(-3.2, .95, 6.4, .12); neon(COL.mg, .014, 8); g.strokeRect(-3.2, .95, 6.4, .12);
      g.fillStyle = '#0b0618'; g.fillRect(-1.6, 1.07, 2.9, .32); neon(COL.cy, .016, 10); g.strokeRect(-1.6, 1.07, 2.9, .32);
      g.fillStyle = 'rgba(255,230,170,.75)'; for (let i = 0; i < 9; i++) g.fillRect(-1.48 + i * .31, 1.2, .2, .12); g.shadowBlur = 0;
    },
    towers(g, neon, flat) {  // a cluster of tall north-Tehran towers with rooftop lights
      [[-1.3, .7, 2.9], [-.4, .8, 3.5], [.6, .65, 3.1], [1.4, .55, 2.5]].forEach(([x, w, h], i) => {
        g.fillStyle = flat; g.fillRect(x - w / 2, 0, w, h); neon(i % 2 ? COL.vi : COL.cy, .016, 10); g.strokeRect(x - w / 2, 0, w, h);
        g.fillStyle = i % 2 ? 'rgba(176,107,255,.5)' : 'rgba(34,243,255,.45)'; for (let y = .2; y < h - .2; y += .22) g.fillRect(x - w / 2 + .06, y, w - .12, .04);
        g.fillStyle = '#ff3a3a'; g.shadowColor = '#ff3a3a'; g.shadowBlur = 10; g.beginPath(); g.arc(x, h + .06, .04, 0, TAU); g.fill(); g.shadowBlur = 0;
      });
    },
    damavand(g, neon, flat) {   // Damavand: the great snow-capped cone, far behind the city
      g.save(); g.translate(0, 2.6); g.scale(1.35, 1.35);
      g.fillStyle = '#0f0a24'; g.beginPath(); g.moveTo(-4.5, 0); g.lineTo(-.45, 2.3); g.quadraticCurveTo(0, 2.42, .45, 2.3); g.lineTo(4.5, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(230,240,255,.85)'; g.beginPath(); g.moveTo(-1.05, 1.95); g.lineTo(-.45, 2.3); g.quadraticCurveTo(0, 2.42, .45, 2.3); g.lineTo(1.05, 1.95); g.lineTo(.7, 1.82); g.lineTo(.4, 1.98); g.lineTo(.1, 1.8); g.lineTo(-.25, 1.97); g.lineTo(-.6, 1.8); g.closePath(); g.fill();
      neon('rgba(170,220,255,.8)', .02, 12); g.beginPath(); g.moveTo(-4.5, 0); g.lineTo(-.45, 2.3); g.quadraticCurveTo(0, 2.42, .45, 2.3); g.lineTo(4.5, 0); g.stroke();
      g.restore(); g.shadowBlur = 0;
    },
    tochal(g, neon, flat) {     // Tochal: the long ridge above the city, with the cable-car line
      g.save(); g.translate(0, 2.7); g.scale(1.3, 1.3);
      g.fillStyle = '#0f0a24'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(-2.4, 1.3); g.lineTo(-1.2, 1.15); g.lineTo(.2, 1.9); g.lineTo(1.6, 1.55); g.lineTo(5, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(230,240,255,.7)'; g.beginPath(); g.moveTo(-.4, 1.6); g.lineTo(.2, 1.9); g.lineTo(1.0, 1.7); g.lineTo(.5, 1.6); g.lineTo(.2, 1.72); g.closePath(); g.fill();
      neon('rgba(255,225,77,.7)', .012, 6); g.beginPath(); g.moveTo(-3.6, .2); g.lineTo(.2, 1.9); g.stroke();
      g.fillStyle = COL.yl; for (const t of [.25, .55, .8]) { g.beginPath(); g.arc(-3.6 + 3.8 * t, .2 + 1.7 * t - .06, .035, 0, TAU); g.fill(); }
      g.restore(); g.shadowBlur = 0;
    },
  };

  // build textured wall segments for three.js: one lap per wall, split into tiles
  function build(T, opts) {
    const { scene, LOOP, Hh, W, zFrom, zTo, mobile } = opts;
    const SEG = LOOP / Math.max(1, Math.round(LOOP / 15));
    const ppm = mobile ? 72 : 136, S = .62;           // 1 unit of art = 0.62 m of wall, so more city fits in view
    const LA = LOOP / S, HA = Hh / S, SA = SEG / S, ppa = ppm * S;
    // put each landmark in an empty stretch of wall between the frames (frames hang every 10 m, alternating sides)
    const U = (side, u) => (side < 0 ? u : LOOP - u) / S;
    const n = opts.rooms || Math.round(LOOP / 10), gap = LOOP / n;
    const gaps = side => {                       // centres of the empty stretches on one wall, widest first
      const fr = []; for (let i = 0; i < n; i++) if ((i % 2 ? 1 : -1) === side) fr.push(((opts.start || 14) + i * gap) % LOOP);
      fr.sort((p, q) => p - q);
      const out = [];
      fr.forEach((f, i) => { const nx = i + 1 < fr.length ? fr[i + 1] : fr[0] + LOOP, w = nx - f;
        if (w >= 26) { out.push([(f + w / 3) % LOOP, w / 2]); out.push([(f + 2 * w / 3) % LOOP, w / 2]); } else out.push([(f + nx) / 2 % LOOP, w]); });
      return out.sort((p, q) => q[1] - p[1]).map(g => g[0]);
    };
    const place = (side, names) => { const g = gaps(side), o = {}; names.forEach((k, i) => { if (g[i] != null) o[k] = U(side, g[i]); }); return o; };
    const atL = place(-1, ['tabiat', 'azadi', 'milad', 'metro', 'damavand']);
    const atR = place(1, ['bazaar', 'mosque', 'shams', 'towers', 'tochal']);
    const tex = { '-1': [], '1': [] }, plans = { '-1': plan(LA, -1, HA, atL), '1': plan(LA, 1, HA, atR) };
    const nSeg = Math.round(LOOP / SEG);
    const paint = () => [-1, 1].forEach(sd => tex[sd].forEach((t, k) => {
      const c = t.image, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
      const a0 = sd < 0 ? k * SA : LA - (k + 1) * SA;      // right wall runs the other way round
      draw(g, plans[sd], a0, a0 + SA, ppa, HA); t.needsUpdate = true;
    }));
    [-1, 1].forEach(sd => { for (let k = 0; k < nSeg; k++) { const c = document.createElement('canvas'); c.width = Math.round(SEG * ppm); c.height = Math.round(Hh * ppm); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; tex[sd].push(t); } });
    paint();
    const mats = { '-1': tex['-1'].map(t => new T.MeshBasicMaterial({ map: t, color: new T.Color(1, 1, 1) })), '1': tex['1'].map(t => new T.MeshBasicMaterial({ map: t, color: new T.Color(1, 1, 1) })) };
    const geo = new T.PlaneGeometry(SEG, Hh);
    // lay tiles from the start of the hall to beyond the end; distance u = 8 - z is the art coordinate
    for (let lap = -1; lap * LOOP < 8 - zTo + LOOP; lap++) for (let k = 0; k < nSeg; k++) {
      const u0 = lap * LOOP + k * SEG, zc = 8 - (u0 + SEG / 2);
      if (zc - SEG / 2 > zFrom || zc + SEG / 2 < zTo) continue;
      [-1, 1].forEach(sd => {
        const m = new T.Mesh(geo, mats[sd][k]); m.rotation.y = -sd * Math.PI / 2; m.position.set(sd * W / 2, Hh / 2, zc); scene.add(m);
      });
    }
    if (document.fonts) document.fonts.ready.then(paint);
  }
  return { build, plan, draw };
})();
