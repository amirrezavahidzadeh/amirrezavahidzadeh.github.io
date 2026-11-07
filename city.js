/* ─────────────────────────────────────────────────────────────
   CITY: night Tehran, 2099. Skyline with Milad and Azadi towers,
   a turning shamseh (Persian sun medallion), neon signs, rain,
   and a grid floor that rides the beat.
   ───────────────────────────────────────────────────────────── */
window.CITY = (() => {
  const cv = document.getElementById('city'), cx = cv.getContext('2d');
  const fx = document.getElementById('fx'), fc = fx.getContext('2d');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, hor = 0, layers = [], drops = [], signs = [];
  let mx = .5, my = .5, tmx = .5, tmy = .5, accent = '#ff2bd6', accent2 = '#22f3ff';
  const ripples = [], trail = [], pulses = []; let boostV = 0, scrolling = 0;
  // while the page is being scrolled, the city redraws at 30 fps so scrolling stays smooth
  addEventListener('scroll', () => { scrolling = performance.now() + 180; }, { passive: true });
  // render scale: full on desktop; phones and slow machines draw the city a bit smaller and scale it up
  const COARSE = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  let Q = COARSE ? .75 : 1, CAP = COARSE ? 30 : 0, probe = { n: 0, sum: 0, done: COARSE };
  const bc = document.createElement('canvas'), bx = bc.getContext('2d'), BQ = .5; let bgTick = 0, bgReady = false;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function resize() {
    dpr = window.CITY_Q || Q; W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); fx.width = W; fx.height = H;
    hor = Math.round(H * (W < 700 ? .56 : .6));
    bc.width = Math.ceil(W * BQ); bc.height = Math.ceil(hor * BQ + 1); bgReady = false;
    build();
  }

  function building(g, x, w, h, base, lit, dim, k) {
    g.fillStyle = base; g.fillRect(x, hor - h, w, h);
    // roof details
    if (rnd() < .35) g.fillRect(x + w * .3, hor - h - 8 - rnd() * 14, 2, 22);
    const cw = 5 + k, ch = 7 + k;
    for (let y = hor - h + 8; y < hor - 6; y += ch + 4) for (let xx = x + 4; xx < x + w - cw - 2; xx += cw + 4) {
      const r = rnd(); if (r < .45) continue;
      const tgt = r > .82 ? lit : dim; tgt.push([xx, y, cw, ch]);
    }
  }
  function milad(g, x, s) { // Milad tower: shaft, pod, mast
    g.save(); g.translate(x, hor); g.scale(s, s);
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(-5, -230); g.lineTo(5, -230); g.lineTo(14, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-8, -230); g.lineTo(-30, -250); g.lineTo(-34, -270); g.lineTo(-26, -292); g.lineTo(26, -292); g.lineTo(34, -270); g.lineTo(30, -250); g.lineTo(8, -230); g.closePath(); g.fill();
    g.fillRect(-3, -360, 6, 70); g.fillRect(-1, -420, 2, 60);
    g.restore();
  }
  function miladLines(g, x, s, col) {
    g.save(); g.translate(x, hor); g.scale(s, s); g.strokeStyle = col; g.lineWidth = 2 / s;
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(-5, -230); g.moveTo(14, 0); g.lineTo(5, -230);
    g.moveTo(-8, -230); g.lineTo(-30, -250); g.lineTo(-34, -270); g.lineTo(-26, -292); g.lineTo(26, -292); g.lineTo(34, -270); g.lineTo(30, -250); g.lineTo(8, -230);
    g.moveTo(-34, -270); g.lineTo(34, -270); g.moveTo(-3, -292); g.lineTo(-3, -360); g.moveTo(3, -292); g.lineTo(3, -360); g.moveTo(0, -360); g.lineTo(0, -420);
    g.stroke(); g.restore();
  }
  function azadi(g, x, s, stroke) { // Azadi tower: flared legs, central arch, tapering top
    g.save(); g.translate(x, hor); g.scale(s, s); g.beginPath();
    g.moveTo(-70, 0); g.quadraticCurveTo(-40, -60, -22, -120); g.lineTo(-14, -150); g.lineTo(14, -150); g.lineTo(22, -120); g.quadraticCurveTo(40, -60, 70, 0);
    g.lineTo(34, 0); g.quadraticCurveTo(24, -50, 0, -78); g.quadraticCurveTo(-24, -50, -34, 0); g.closePath();
    if (stroke) { g.lineWidth = 2 / s; g.stroke(); g.beginPath(); g.moveTo(-14, -150); g.lineTo(-8, -162); g.lineTo(8, -162); g.lineTo(14, -150); g.stroke(); }
    else { g.fill(); g.fillRect(-8, -162, 16, 14); }
    g.restore();
  }

  function build() {
    seed = 11; layers = [];
    const span = W * 1.16;
    const defs = [
      { par: .012, base: '#120726', lit: 'rgba(160,90,255,.55)', dim: 'rgba(120,70,200,.16)', hmin: .16, hmax: .42, wmin: 26, wmax: 60, k: 0 },
      { par: .028, base: '#0b0418', lit: 'rgba(34,243,255,.75)', dim: 'rgba(34,180,255,.14)', hmin: .1, hmax: .34, wmin: 34, wmax: 80, k: 1 },
      { par: .05, base: '#05020c', lit: 'rgba(255,60,200,.85)', dim: 'rgba(255,90,200,.13)', hmin: .06, hmax: .26, wmin: 46, wmax: 110, k: 2 },
    ];
    defs.forEach((d, li) => {
      const top = Math.max(0, Math.floor(hor - Math.max(hor * .56, 450 * Math.min(1.25, H / 700)))), lh = hor - top + 2;
      const c = document.createElement('canvas'); c.width = span * dpr; c.height = lh * dpr;
      const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(0, -top);
      const lit = [], dim = [];
      let x = -20;
      while (x < span) {
        const w = d.wmin + rnd() * (d.wmax - d.wmin), h = hor * (d.hmin + rnd() * (d.hmax - d.hmin));
        building(g, x, w, h, d.base, lit, dim, d.k); x += w + (li === 2 ? 6 + rnd() * 30 : rnd() * 6);
      }
      g.fillStyle = d.base;
      if (li === 0) azadi(g, span * .3, Math.min(1.3, W / 900) * .9, false);
      if (li === 1) milad(g, span * .74, Math.min(1.25, H / 700) * (W < 700 ? .62 : .9));
      g.fillStyle = d.dim; dim.forEach(r => g.fillRect(...r));
      if (li === 1) { g.save(); g.shadowColor = '#22f3ff'; g.shadowBlur = .9 * (12); miladLines(g, span * .74, Math.min(1.25, H / 700) * (W < 700 ? .62 : .9), '#22f3ff'); g.restore(); }
      if (li === 0) { g.save(); g.strokeStyle = 'rgba(176,107,255,.8)'; g.shadowColor = '#b06bff'; g.shadowBlur = .9 * (10); azadi(g, span * .3, Math.min(1.3, W / 900) * .9, true); g.restore(); }
      const l = document.createElement('canvas'); l.width = c.width; l.height = c.height;
      const lg = l.getContext('2d'); lg.scale(dpr, dpr); lg.translate(0, -top); lg.fillStyle = d.lit; lit.forEach(r => lg.fillRect(...r));
      layers.push({ c, l, par: d.par, span, top, lh });
    });
    // neon signs on the front layer (cinema, game, bazaar...)
    const words = [['سینما', '#ff2bd6'], ['بازی', '#22f3ff'], ['FILM', '#ffe14d'], ['بازار', '#ff8a3d'], ['AI', '#7dff6a'], ['شب', '#b06bff'], ['24H', '#22f3ff'], ['تهران', '#ff2bd6']];
    const XS = [.05, .13, .21, .29, .71, .79, .87, .95];
    signs = words.map(([t, c], i) => ({ t, c, x: span * (XS[i] + (rnd() - .5) * .03), y: hor - H * (.05 + rnd() * .08), v: /[a-z0-9]/i.test(t) ? 0 : 1, f: rnd() }));
    signs.forEach(sg => {
      const fs = Math.round(sg.v ? H * .028 : H * .024), font = sg.v ? `${Math.round(fs * 1.15)}px Sahand, Vazirmatn` : `700 ${fs}px "Chakra Petch"`;
      const m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(sg.t).width) + 40, h = fs * 2 + 20;
      const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = sg.c; g.shadowColor = sg.c; g.shadowBlur = .9 * (14); g.fillText(sg.t, w / 2, h / 2); g.fillText(sg.t, w / 2, h / 2);
      sg.img = c; sg.w = w; sg.h = h;
    });
    drops = Array.from({ length: RM ? 0 : Math.round(W / 9) }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 500 + Math.random() * 500, l: 8 + Math.random() * 16 }));
  }

  let shC = null, shKey = '';
  function shamseh(x, y, r, rot, col, p) {
    const key = Math.round(r / 8) + col;
    if (key !== shKey) { shKey = key; shC = document.createElement('canvas'); const R = Math.round(r / 8) * 8, sz = Math.ceil(R * 2.7); shC.width = shC.height = sz * dpr; const g = shC.getContext('2d'); g.scale(dpr, dpr); shC.R = R; shC.sz = sz; drawShamseh(g, sz / 2, sz / 2, R, col); }
    const k = r / shC.R, sz = shC.sz * k;
    const trip = !RM, hue = trip ? (performance.now() / 1000 * 9) % 360 : 0;
    cx.save(); cx.translate(x, y);
    if (trip && !LOW) cx.filter = `hue-rotate(${hue.toFixed(0)}deg)`;
    cx.rotate(rot); cx.globalAlpha = .85 + p * .15; cx.drawImage(shC, -sz / 2, -sz / 2, sz, sz);
    if (trip) { // a smaller medallion turning the other way, like a kaleidoscope
      const k2 = .58 + .06 * Math.sin(performance.now() / 1300); cx.rotate(-rot * 2.6); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .45 + p * .3;
      cx.drawImage(shC, -sz * k2 / 2, -sz * k2 / 2, sz * k2, sz * k2);
    }
    cx.restore();
  }
  function drawShamseh(cx, x, y, r, col) {
    const p = .3, rot = 0;
    cx.save(); cx.translate(x, y); cx.rotate(rot);
    // soft sun behind
    const gr = cx.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.25);
    gr.addColorStop(0, 'rgba(255,90,170,.26)'); gr.addColorStop(.55, 'rgba(255,60,140,.12)'); gr.addColorStop(1, 'rgba(255,60,140,0)');
    cx.fillStyle = gr; cx.beginPath(); cx.arc(0, 0, r * 1.25, 0, 7); cx.fill();
    cx.strokeStyle = col; cx.lineWidth = 2; cx.shadowColor = col; cx.shadowBlur = .9 * (16 + p * 20);
    const n = 16; cx.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * .74 : r; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    cx.stroke();
    cx.beginPath(); cx.arc(0, 0, r * .56, 0, 7); cx.stroke();
    cx.lineWidth = 1; cx.globalAlpha = .7; cx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cx.moveTo(Math.cos(a) * r * .56, Math.sin(a) * r * .56); cx.lineTo(Math.cos(a + Math.PI / 8) * r * .3, Math.sin(a + Math.PI / 8) * r * .3); cx.lineTo(Math.cos(a + Math.PI / 4) * r * .56, Math.sin(a + Math.PI / 4) * r * .56); }
    cx.stroke(); cx.restore();
  }

  let last = performance.now(), phase = 0;
  // phones and small screens: draw the city at ~30 fps (the beat clock still ticks every frame)
  const LOW = matchMedia('(pointer: coarse)').matches || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
  let skip = 0, fxDirty = true;
  function frame(ts) {
    // in the 3D corridor the 2D city isn't shown, so only keep the music clock running
    if (document.body.classList.contains('corridor')) { if (window.SND) SND.tick(); requestAnimationFrame(frame); return; }
    if (document.body.classList.contains('ov-open') && (skip = (skip + 1) % 4)) { if (window.SND) SND.tick(); requestAnimationFrame(frame); return; }
    if (ts - last < (window.CITY_MS || Math.max(CAP, scrolling > ts ? 30 : 0))) { if (window.SND) SND.tick(); requestAnimationFrame(frame); return; }
    const dt = Math.min(.05, (ts - last) / 1000);
    // adaptive quality: if this machine cannot hold ~45 fps, draw the city smaller and at 30 fps
    if (!probe.done && !document.hidden && ts > 2500) { probe.sum += ts - last; if (++probe.n >= 90) { probe.done = true; if (probe.sum / probe.n > 22) { Q = .75; CAP = 30; resize(); } } }
    last = ts;
    if (window.SND) SND.tick();
    const p = window.SND ? SND.pulse : 0, sp = window.SND && SND.spectrum();
    let bass = 0, hi = 0; if (sp) { for (let i = 1; i < 6; i++) bass += sp[i]; bass /= 1275; for (let i = 40; i < 80; i++) hi += sp[i]; hi /= 10200; }
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    const t = ts / 1000;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sky, aurora and sunburst are soft light: paint them at half resolution, every other frame
    const cxs = W * .5 + (mx - .5) * -10, cys = hor - Math.min(W, H) * .16;
    if ((bgTick = (bgTick + 1) % 2) === 0 || !bgReady) {
      bgReady = true; bx.setTransform(BQ, 0, 0, BQ, 0, 0);
      const sky = bx.createLinearGradient(0, 0, 0, hor);
      const sh = RM ? 0 : 50 * Math.sin(t * .07) + 20 * Math.sin(t * .19);
      sky.addColorStop(0, '#030108'); sky.addColorStop(.55, `hsl(${(268 + sh).toFixed(0)},80%,10%)`); sky.addColorStop(1, `hsl(${(290 + sh * 1.4).toFixed(0)},75%,19%)`);
      bx.fillStyle = sky; bx.fillRect(0, 0, W, hor);
      if (!RM) { // aurora: slow liquid ribbons of colour across the sky
        bx.save(); bx.globalCompositeOperation = 'lighter'; bx.lineCap = 'round';
        const nR = LOW ? 1 : 3, st = LOW ? 80 : 36;
        for (let i = 0; i < nR; i++) {
          bx.beginPath(); const base = hor * (.22 + i * .13), amp = 26 + i * 12 + bass * 30;
          for (let x = -st; x <= W + st; x += st) { const y = base + Math.sin(x * (.0042 + i * .0011) + t * (.35 + i * .12) + i * 2) * amp + Math.sin(x * .013 - t * .6) * 8; x < 0 ? bx.moveTo(x, y) : bx.lineTo(x, y); }
          bx.strokeStyle = `hsla(${((t * 14 + i * 110) % 360).toFixed(0)},100%,60%,${.07 + p * .05})`; bx.lineWidth = 46 - i * 8; bx.stroke();
          bx.strokeStyle = `hsla(${((t * 14 + i * 110 + 40) % 360).toFixed(0)},100%,70%,.18)`; bx.lineWidth = 2; bx.stroke();
        }
        // sunburst: rays turning behind the medallion
        const R = Math.max(W, H) * (LOW ? .6 : .75), nr = LOW ? 12 : 24, rot = -t * .06;
        for (let k = 0; k < nr; k++) {
          const a0 = rot + k / nr * Math.PI * 2, a1 = a0 + Math.PI / nr;
          bx.beginPath(); bx.moveTo(cxs, cys); bx.arc(cxs, cys, R, a0, a1); bx.closePath();
          bx.fillStyle = `hsla(${((t * 20 + k * (LOW ? 30 : 15)) % 360).toFixed(0)},100%,60%,${(.035 + p * .03).toFixed(3)})`; bx.fill();
        }
          bx.restore();
        }
    }
    cx.drawImage(bc, 0, 0, bc.width, bc.height, 0, 0, bc.width / BQ, bc.height / BQ);
    if (!RM) {
      cx.save(); cx.globalCompositeOperation = 'lighter';
      // every kick drum sends a rainbow shockwave out of the sun
      for (let i = pulses.length - 1; i >= 0; i--) {
        const P = pulses[i]; P.a += dt / 1.3; if (P.a >= 1) { pulses.splice(i, 1); continue; }
        cx.beginPath(); cx.arc(cxs, cys, 20 + P.a * Math.max(W, H) * .55, 0, 7);
        cx.strokeStyle = `hsla(${P.h.toFixed(0)},100%,62%,${((1 - P.a) * .22).toFixed(3)})`; cx.lineWidth = 1.5 + (1 - P.a) * 4; cx.stroke();
      }
      cx.restore();
    }

    const r = Math.min(W, H) * (W < 700 ? .3 : .22) * (1 + p * .035 + bass * .05 + (RM ? 0 : .03 * Math.sin(t * .8)));
    shamseh(W * .5 + (mx - .5) * -10, hor - Math.min(W, H) * .16, r, RM ? 0 : t * .03, accent, p);

    layers.forEach((L, i) => {
      const off = -((L.span - W) / 2) + (mx - .5) * -W * L.par * 4;
      cx.drawImage(L.c, off, L.top, L.span, L.lh);
      cx.globalAlpha = Math.min(1, .35 + bass * (i === 2 ? 1.2 : .8) + p * .25);
      cx.drawImage(L.l, off, L.top, L.span, L.lh); cx.globalAlpha = 1;
      if (i === 2) {
        signs.forEach(sg => {
          const fl = (Math.sin(t * 7 + sg.f * 40) > .96 || (sg.f > .7 && Math.sin(t * 2.3 + sg.f * 9) > .9)) && !RM ? .25 : 1;
          cx.globalAlpha = fl * (.8 + p * .2); cx.drawImage(sg.img, off + sg.x - sg.w / 2, sg.y - sg.h / 2, sg.w, sg.h);
        });
        cx.globalAlpha = 1;
      }
    });

    // horizon glow
    const hg = cx.createLinearGradient(0, hor - 40, 0, hor + 30);
    hg.addColorStop(0, 'rgba(255,43,214,0)'); hg.addColorStop(.6, `rgba(255,43,214,${.25 + p * .3})`); hg.addColorStop(1, 'rgba(255,43,214,0)');
    cx.fillStyle = hg; cx.fillRect(0, hor - 40, W, 70);

    // floor + grid
    const fl = cx.createLinearGradient(0, hor, 0, H); fl.addColorStop(0, '#0d0220'); fl.addColorStop(1, '#020006');
    cx.fillStyle = fl; cx.fillRect(0, hor, W, H - hor);
    const speed = (window.SND && SND.playing ? SND.bpm / 60 : .25) * (RM ? .2 : 1);
    phase = (phase + dt * speed * .5 * (1 + boostV)) % 1; boostV *= .94;
    const gh = RM ? 0 : 40 * Math.sin(t * .11) + 25 * Math.sin(t * .037);
    cx.save(); cx.strokeStyle = gh ? `hsl(${(186 + gh).toFixed(0)},100%,57%)` : accent2;
    const N = 14, wav = RM ? 0 : 1, step = LOW ? 48 : 28;
    for (let band = 0; band < 3; band++) {
      cx.beginPath();
      for (let k = 0; k < N; k++) {
        const f = (k + phase) / N; if (Math.min(2, Math.floor(f * 3)) !== band) continue;
        const y = hor + (H - hor) * Math.pow(f, 2.1), amp = wav * (1 + f * 7) * (1 + bass * .8);
        cx.moveTo(0, y + Math.sin(t * 1.3 + k) * amp);
        for (let x = step; x <= W + step; x += step) cx.lineTo(x, y + Math.sin(x * .011 + t * 1.3 + k * .9) * amp);
      }
      { const ga = (.3 + band * .25) * (.55 + p * .45); cx.globalAlpha = ga * .25; cx.lineWidth = 5 + band * 3; cx.stroke(); cx.globalAlpha = ga; cx.lineWidth = .7 + band * .8; cx.stroke(); }
    }
    const vx = W * .5 + (mx - .5) * -60;
    cx.beginPath();
    for (let k = -16; k <= 16; k++) { const ex = W * .5 + k * W * .11, sw = wav * Math.sin(t * .7 + k * .45) * 12; cx.moveTo(vx + k * 6, hor); cx.quadraticCurveTo((vx + k * 6 + ex) / 2 + sw, (hor + H) / 2, ex, H); }
    cx.globalAlpha = .08 + p * .08; cx.lineWidth = 5; cx.stroke(); cx.globalAlpha = .35 + p * .3; cx.lineWidth = 1; cx.stroke();
    cx.restore();
    // spectrum on the horizon: a thin equaliser skyline
    if (sp) {
      cx.save(); cx.fillStyle = accent; cx.globalAlpha = .6;
      const n = 48, bw = W / n;
      cx.beginPath(); for (let i = 0; i < n; i++) { const v = sp[2 + i] / 255; cx.rect(i * bw + 1, hor - v * H * .05, bw - 2, v * H * .05 + 1); } cx.fill();
      cx.restore();
    }
    // rain
    cx.save(); cx.strokeStyle = RM ? 'rgba(140,220,255,.22)' : `hsla(${((t * 25 + 180) % 360).toFixed(0)},100%,80%,.24)`; cx.lineWidth = 1; cx.beginPath();
    const wind = (mx - .5) * 260;
    drops.forEach(d => { d.y += d.v * dt; d.x += wind * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * W; } if (d.x > W) d.x -= W; if (d.x < 0) d.x += W; cx.moveTo(d.x, d.y); cx.lineTo(d.x - wind * .03, d.y - d.l); });
    cx.stroke(); cx.restore();

    // fx layer: ripples and the cursor trail
    const fxBusy = ripples.length || trail.length;
    if (!fxBusy && !fxDirty) { if (fx.style.visibility !== 'hidden') fx.style.visibility = 'hidden'; requestAnimationFrame(frame); return; }
    if (fx.style.visibility) fx.style.visibility = '';
    fxDirty = !!fxBusy;
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, W, H);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const R = ripples[i]; R.a += dt; const k = R.a / R.life; if (k >= 1) { ripples.splice(i, 1); continue; }
      fc.strokeStyle = R.c; fc.globalAlpha = (1 - k) * .3; fc.lineWidth = 9 * (1 - k) + 2; fc.beginPath(); fc.arc(R.x, R.y, 6 + k * R.r, 0, 7); fc.stroke();
      fc.globalAlpha = 1 - k; fc.lineWidth = 2.5 * (1 - k) + .5; fc.stroke();
      if (R.ring2) { fc.beginPath(); fc.arc(R.x, R.y, 4 + k * R.r * .55, 0, 7); fc.stroke(); }
    }
    if (trail.length > 1) {
      fc.globalAlpha = 1; fc.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) { const a = trail[i - 1], b = trail[i], k = i / trail.length; const hh = (performance.now() / 6 + i * 14) % 360; fc.strokeStyle = `hsla(${hh},100%,60%,${k * .3})`; fc.lineWidth = k * 10; fc.beginPath(); fc.moveTo(a.x, a.y); fc.lineTo(b.x, b.y); fc.stroke(); fc.strokeStyle = `hsla(${hh},100%,85%,${k * .9})`; fc.lineWidth = k * 2.5; fc.beginPath(); fc.moveTo(a.x, a.y); fc.lineTo(b.x, b.y); fc.stroke(); }
    }
    for (let i = trail.length - 1; i >= 0; i--) if ((trail[i].a += dt) > .28) trail.splice(i, 1);
    fc.globalAlpha = 1; fc.shadowBlur = 0;
    requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  addEventListener('pointermove', e => { tmx = e.clientX / W; tmy = e.clientY / H; if (e.pointerType === 'mouse' && !RM) trail.push({ x: e.clientX, y: e.clientY, a: 0 }); if (trail.length > 24) trail.shift(); }, { passive: true });
  resize(); requestAnimationFrame(frame);
  if (window.SND && !RM) SND.on((type, e) => { if (type === 'step' && e.hit.k && e.step === 0 && !document.body.classList.contains('ov-open')) { pulses.push({ a: 0, h: performance.now() / 20 % 360 }); if (pulses.length > 6) pulses.shift(); } });
  if (document.fonts) document.fonts.ready.then(() => build());
  return {
    ripple(x, y, c = accent2, r = 90, ring2 = false) { fxDirty = true; ripples.push({ x, y, c, r, a: 0, life: .7, ring2 }); if (ripples.length > 40) ripples.shift(); },
    boost(v) { boostV = Math.max(boostV, v); },
    setAccent(a, b) { accent = a; if (b) accent2 = b; },
  };
})();
