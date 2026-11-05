/* ─────────────────────────────────────────────────────────────
   GAMES: one short game per encrypted file, plus the Beat Lab.
   Each game is mount(el, api) -> cleanup. api: win, lose, stat.
   ───────────────────────────────────────────────────────────── */
window.GAMES = (() => {
  const dbg = {}; // test hooks, harmless
  const DPR = () => Math.min(2, devicePixelRatio || 1);
  function stage(cv, w, h) {
    const d = DPR(); cv.width = w * d; cv.height = h * d; cv.style.aspectRatio = `${w} / ${h}`;
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * h / r.height }; };
    return { g, pt };
  }
  function loop(fn) { let id = 0, alive = true, last = performance.now(); const f = ts => { if (!alive) return; const dt = Math.min(.05, (ts - last) / 1000); last = ts; fn(dt, ts / 1000); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => { alive = false; cancelAnimationFrame(id); }; }
  function keys(map) { const h = e => { if (e.metaKey || e.ctrlKey || e.altKey) return; const f = map[e.key.toLowerCase()] || map[e.code]; if (f) { e.preventDefault(); if (!e.repeat) f(e); } }; addEventListener('keydown', h); return () => removeEventListener('keydown', h); }
  const glow = (g, c, b = 14) => { g.shadowColor = c; g.shadowBlur = .9 * (b); };

  /* ══ 01 · SYNC: a four-lane rhythm game riding the soundtrack ══ */
  function sync(el, api) {
    el.innerHTML = `<div class="g g-sync">
      <p class="g-how">Notes fall on the beat of the music. Hit each one as it crosses the line. Hit 60% to decrypt.</p>
      <div class="g-stage sync-stage"><canvas></canvas></div>
      <div class="lanes">${['D', 'F', 'J', 'K'].map((k, i) => `<button type="button" data-l="${i}" aria-label="Lane ${i + 1}"><kbd>${k}</kbd></button>`).join('')}</div></div>`;
    const cv = el.querySelector('canvas'), W = 400, H = 440, { g } = stage(cv, W, H);
    if (!SND.playing) SND.start();
    const sd = SND.stepDur(), t0 = SND.nextBar() + 16 * sd, TR = 1.5, HL = H - 64, LW = W / 4;
    const COL = ['#22f3ff', '#ff2bd6', '#7dff6a', '#ffe14d'];
    let s = 5; const rr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const notes = []; let lane = 0;
    for (let b = 0; b < 6; b++) for (let e = 0; e < 8; e++) {
      const on = e % 2 === 0 ? rr() < .82 : (b >= 2 && rr() < .38);
      if (!on) continue; lane = (lane + 1 + Math.floor(rr() * 3)) % 4;
      notes.push({ t: t0 + (b * 16 + e * 2) * sd, l: lane, st: 0 });
    }
    let hits = 0, combo = 0, best = 0, msg = '', msgT = 0, done = false; const flash = [0, 0, 0, 0];
    const btns = [...el.querySelectorAll('.lanes button')];
    function judge(l) {
      if (done) return; const now = SND.now(); flash[l] = 1; btns[l].classList.add('on'); setTimeout(() => btns[l].classList.remove('on'), 90);
      let n = null, bd = 9; notes.forEach(x => { if (x.l === l && !x.st) { const d = Math.abs(x.t - now); if (d < bd) { bd = d; n = x; } } });
      if (n && bd < .2) { n.st = 1; hits++; combo++; best = Math.max(best, combo); msg = bd < .08 ? 'PERFECT' : 'GOOD'; msgT = 1; SND.note(l * 2 + (combo % 3), .25); }
      else { combo = 0; msg = 'OFF BEAT'; msgT = .6; }
      api.stat(`HITS ${hits}/${notes.length} · COMBO ${combo}`);
    }
    btns.forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); judge(+b.dataset.l); }));
    const unkey = keys({ d: () => judge(0), f: () => judge(1), j: () => judge(2), k: () => judge(3), arrowleft: () => judge(0), arrowdown: () => judge(1), arrowup: () => judge(2), arrowright: () => judge(3) });
    api.stat(`HITS 0/${notes.length}`); dbg.sync = { notes, judge };
    const stop = loop(dt => {
      const now = SND.now();
      notes.forEach(n => { if (!n.st && now > n.t + .2) { n.st = 2; combo = 0; api.stat(`HITS ${hits}/${notes.length} · COMBO 0`); } });
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = `rgba(255,255,255,${.025 + flash[i] * .12})`; g.fillRect(i * LW + 2, 0, LW - 4, H);
        flash[i] *= .86;
      }
      g.save(); glow(g, '#fff', 12); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, HL); g.lineTo(W, HL); g.stroke(); g.restore();
      notes.forEach(n => {
        if (n.st === 1) return; const y = HL - (n.t - now) / TR * (HL - 10); if (y < -20 || y > H + 20) return;
        g.save(); glow(g, COL[n.l], 18); g.fillStyle = n.st === 2 ? 'rgba(120,120,140,.5)' : COL[n.l];
        g.fillRect(n.l * LW + 12, y - 9, LW - 24, 18); g.restore();
      });
      if (now < t0) { const beats = Math.ceil((t0 - now) / (sd * 4)); g.save(); glow(g, '#ff2bd6', 20); g.fillStyle = '#fff'; g.font = '700 54px "Big Shoulders Display"'; g.textAlign = 'center'; g.fillText(beats > 4 ? 'READY' : beats, W / 2, H * .42); g.restore(); }
      if (msgT > 0) { msgT -= dt; g.save(); g.globalAlpha = Math.min(1, msgT * 2); glow(g, '#22f3ff', 14); g.fillStyle = '#fff'; g.font = '700 30px "Big Shoulders Display"'; g.textAlign = 'center'; g.fillText(msg, W / 2, HL - 40); g.restore(); }
      if (!done && now > notes[notes.length - 1].t + .5) { done = true; hits / notes.length >= .6 ? api.win(`${hits} of ${notes.length} on the beat. Best combo ${best}.`) : api.lose(`${hits} of ${notes.length}. You need ${Math.ceil(notes.length * .6)}.`); }
    });
    return () => { stop(); unkey(); };
  }

  /* ══ 02 · DECODE: Prompt Scholar, as a game ══ */
  const PARTS = { subject: 'Subject', action: 'Action', camera: 'Camera', environment: 'Environment', light: 'Light', timing: 'Timing', constraints: 'Constraints' };
  const PROMPTS = [
    [['A woman', 'subject'], ' ', ['runs', 'action'], ' ', ['through deep snow at night', 'environment'], '; ', ['35mm handheld tracking', 'camera'], ', ', ['cold moonlight', 'light'], ', ', ['uninterrupted shot', 'constraints'], '.'],
    [['An old tailor', 'subject'], ' ', ['threads a needle', 'action'], ' ', ['by a dusty window', 'environment'], ', ', ['slow push-in', 'camera'], ' ', ['over eight seconds', 'timing'], ', ', ['warm afternoon light', 'light'], ', ', ['his hands stay in focus', 'constraints'], '.'],
    [['Two horses', 'subject'], ' ', ['gallop', 'action'], ' ', ['across a salt flat', 'environment'], '; ', ['drone shot pulling back', 'camera'], ', ', ['long shadows from a low sun', 'light'], ', ', ['no text on screen', 'constraints'], '.'],
  ];
  function decode(el, api) {
    const P = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    const queue = P.filter(Array.isArray).map(x => x[1]).sort(() => Math.random() - .5);
    el.innerHTML = `<div class="g g-dec">
      <p class="g-how">An AI video prompt has up to seven parts. Prompt Bazar's Scholar tags them. Tag the part it asks for. Three mistakes, or running out of time, and the file stays locked.</p>
      <p class="dec-task" aria-live="polite"></p>
      <p class="dec-prompt">${P.map(x => Array.isArray(x) ? `<button type="button" class="chip" data-k="${x[1]}">${x[0]}</button>` : x).join('')}</p>
      <div class="dec-bar"><i></i></div>
      <ul class="dec-legend">${Object.entries(PARTS).map(([k, v]) => `<li data-k="${k}">${v}</li>`).join('')}</ul></div>`;
    const task = el.querySelector('.dec-task'), bar = el.querySelector('.dec-bar i');
    let miss = 0, done = false, T = 50, left = T;
    const ask = () => { task.innerHTML = `Find the <b>${PARTS[queue[0]]}</b>`; api.stat(`MISTAKES ${miss}/3 · ${queue.length} LEFT`); };
    el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
      if (done || b.classList.contains('ok')) return;
      if (b.dataset.k === queue[0]) {
        b.classList.add('ok'); b.dataset.label = PARTS[b.dataset.k]; el.querySelector(`.dec-legend [data-k="${b.dataset.k}"]`).classList.add('ok');
        queue.shift(); SND.ui('good');
        if (!queue.length) {
          done = true; el.querySelectorAll('.dec-legend li:not(.ok)').forEach(li => li.classList.add('miss'));
          task.innerHTML = 'Decoded. Parts the prompt never states are marked <b>not specified</b>.'; setTimeout(() => api.win(`Decoded with ${miss} mistake${miss === 1 ? '' : 's'}.`), 1500);
        } else ask();
      } else {
        miss++; SND.ui('bad'); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
        if (miss >= 3) { done = true; api.lose('Three wrong tags.'); } else ask();
      }
    }));
    ask();
    const stop = loop(dt => { if (done) return; left -= dt; bar.style.transform = `scaleX(${Math.max(0, left / T)})`; if (left <= 0) { done = true; api.lose('Out of time.'); } });
    return stop;
  }

  /* ══ 03 · WINDSHOT: Siavash's bow, the wind, the stag ══ */
  function windshot(el, api) {
    el.innerHTML = `<div class="g g-wind">
      <p class="g-how">Drag back from anywhere and let go to loose an arrow. The wind bends it, and the guide line does not show the wind. Hit the stag twice with six arrows. <span class="kb">Keyboard: arrows to aim, Space to shoot</span></p>
      <div class="g-stage wind-stage"><canvas></canvas></div></div>`;
    const cv = el.querySelector('canvas'), W = 960, H = 540, { g, pt } = stage(cv, W, H);
    const bg = new Image(), bgc = document.createElement('canvas'); bgc.width = W; bgc.height = H; let bgReady = false;
    bg.onload = () => { const c = bgc.getContext('2d'), s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight); c.filter = 'blur(2px) saturate(1.2)'; c.drawImage(bg, (W - bg.naturalWidth * s) / 2, (H - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s); bgReady = true; };
    bg.src = api.IMG.siaStream;
    const A = { x: 120, y: 420 };
    let arrows = 6, hits = 0, wind = 0, arrow = null, aim = null, flashT = 0, done = false, t = 0, msg = '', msgT = 0;
    let kAng = -.5, kPow = .62;
    const newWind = () => { wind = Math.round((Math.random() * 2 - 1) * 30) / 10; };
    newWind();
    const stag = () => ({ x: 790 + Math.sin(t * .6) * 70, y: 418 });
    const status = () => api.stat(`ARROWS ${arrows} · HITS ${hits}/2 · WIND ${wind > 0 ? '→' : wind < 0 ? '←' : '·'} ${Math.abs(wind).toFixed(1)}`);
    status(); dbg.wind = { st: () => ({ wind, t, arrows, hits, busy: !!arrow }), shoot: (vx, vy) => shoot({ vx, vy }) };
    function vel() {
      if (aim) { let dx = aim.sx - aim.ex, dy = aim.sy - aim.ey; const m = Math.hypot(dx, dy), c = Math.min(m, 260) / (m || 1); return { vx: dx * c * 4.2, vy: dy * c * 4.2, m }; }
      return { vx: Math.cos(kAng) * kPow * 1090, vy: Math.sin(kAng) * kPow * 1090, m: 99 };
    }
    function shoot(v) { if (done || arrow || !arrows) return; arrows--; arrow = { x: A.x + 18, y: A.y - 40, vx: v.vx, vy: v.vy }; SND.ui('shoot'); status(); }
    cv.addEventListener('pointerdown', e => { if (done || arrow) return; cv.setPointerCapture(e.pointerId); const p = pt(e); aim = { sx: p.x, sy: p.y, ex: p.x, ey: p.y }; });
    cv.addEventListener('pointermove', e => { if (aim) { const p = pt(e); aim.ex = p.x; aim.ey = p.y; } });
    const up = () => { if (!aim) return; const v = vel(); if (v.m > 24) shoot(v); aim = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { aim = null; });
    const unkey = keys({ arrowup: () => { kAng = Math.max(-1.35, kAng - .05); }, arrowdown: () => { kAng = Math.min(.1, kAng + .05); }, arrowright: () => { kPow = Math.min(1, kPow + .03); }, arrowleft: () => { kPow = Math.max(.25, kPow - .03); }, ' ': () => shoot(vel()), Space: () => shoot(vel()) });

    function deer(x, y, c) {
      g.save(); g.translate(x, y); g.strokeStyle = c; g.lineWidth = 3; g.lineCap = 'round'; glow(g, c, 14);
      g.beginPath(); g.ellipse(0, -46, 38, 15, 0, 0, 7);
      g.moveTo(-26, -36); g.lineTo(-30, 0); g.moveTo(-14, -34); g.lineTo(-12, 0); g.moveTo(18, -34); g.lineTo(20, 0); g.moveTo(30, -38); g.lineTo(34, 0);
      g.moveTo(32, -54); g.lineTo(48, -80); g.lineTo(62, -76);
      g.moveTo(48, -82); g.lineTo(42, -104); g.moveTo(44, -96); g.lineTo(34, -104); g.moveTo(50, -84); g.lineTo(60, -106); g.moveTo(56, -98); g.lineTo(66, -104);
      g.moveTo(-38, -50); g.lineTo(-46, -56); g.stroke(); g.restore();
    }
    const stop = loop(dt => {
      t += dt; g.clearRect(0, 0, W, H);
      if (bgReady) g.drawImage(bgc, 0, 0, W, H);
      g.fillStyle = 'rgba(10,2,24,.64)'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.03)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
      // wind streaks
      g.save(); g.strokeStyle = 'rgba(160,240,255,.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { const yy = 40 + i * 34, xx = ((t * wind * 120 + i * 173) % (W + 200) + W + 200) % (W + 200) - 100; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + wind * 18, yy); g.stroke(); }
      g.restore();
      const S = stag();
      deer(S.x, S.y, flashT > 0 ? '#ffffff' : '#ff8a3d');
      g.save(); g.strokeStyle = '#ffe14d'; glow(g, '#ffe14d', 10); g.lineWidth = 2; g.beginPath(); g.moveTo(S.x, S.y - 148); g.lineTo(S.x + 9, S.y - 138); g.lineTo(S.x, S.y - 128); g.lineTo(S.x - 9, S.y - 138); g.closePath(); g.stroke();
      g.font = '700 16px "Chakra Petch"'; g.fillStyle = '#ffe14d'; g.textAlign = 'center'; g.fillText('THE STAG', S.x, S.y - 158); g.restore();
      // archer
      g.save(); g.strokeStyle = '#22f3ff'; g.lineWidth = 3; g.lineCap = 'round'; glow(g, '#22f3ff', 14);
      g.beginPath(); g.arc(A.x, A.y - 74, 9, 0, 7); g.moveTo(A.x, A.y - 64); g.lineTo(A.x, A.y - 26); g.lineTo(A.x - 10, A.y); g.moveTo(A.x, A.y - 26); g.lineTo(A.x + 10, A.y);
      const v = vel(), ang = Math.atan2(v.vy, v.vx); g.moveTo(A.x, A.y - 52); g.lineTo(A.x + Math.cos(ang) * 22, A.y - 44 + Math.sin(ang) * 22); g.stroke();
      g.beginPath(); g.arc(A.x + 16, A.y - 42, 26, ang - 1.2, ang + 1.2); g.stroke(); g.restore();
      // guide line (no wind)
      if ((aim && v.m > 24) || (!aim && !arrow && !done)) {
        g.save(); g.fillStyle = 'rgba(255,255,255,.75)'; let x = A.x + 18, y = A.y - 40, vx = v.vx, vy = v.vy;
        for (let i = 0; i < 16; i++) { for (let k = 0; k < 3; k++) { vy += 900 / 60; x += vx / 60; y += vy / 60; } g.globalAlpha = (aim ? .9 : .35) * (1 - i / 16); g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
        g.restore();
      }
      // arrow flight
      if (arrow) {
        arrow.vy += 900 * dt; arrow.vx += wind * 140 * dt; arrow.x += arrow.vx * dt; arrow.y += arrow.vy * dt;
        const a = Math.atan2(arrow.vy, arrow.vx);
        g.save(); g.translate(arrow.x, arrow.y); g.rotate(a); g.strokeStyle = '#fff'; glow(g, '#ff2bd6', 16); g.lineWidth = 3; g.beginPath(); g.moveTo(-26, 0); g.lineTo(8, 0); g.stroke(); g.restore();
        if (Math.hypot(arrow.x - S.x, arrow.y - (S.y - 50)) < 44) {
          hits++; arrow = null; flashT = .5; msg = 'HIT'; msgT = 1; SND.ui('good'); newWind(); status();
          if (hits >= 2) { done = true; setTimeout(() => api.win(`Two hits with ${arrows} arrow${arrows === 1 ? '' : 's'} to spare.`), 700); }
        } else if (arrow.x > W + 60 || arrow.y > H + 30 || arrow.x < -60) {
          arrow = null; msg = 'MISS'; msgT = .8; newWind(); status();
          if (!arrows && !done) { done = true; setTimeout(() => api.lose('Out of arrows.'), 500); }
        }
      }
      flashT -= dt;
      // wind gauge
      g.save(); g.translate(W - 110, 56); g.strokeStyle = '#22f3ff'; glow(g, '#22f3ff', 10); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.stroke();
      const wl = wind * 9; g.beginPath(); g.moveTo(-wl, 0); g.lineTo(wl, 0); g.lineTo(wl - Math.sign(wl) * 8, -6); g.moveTo(wl, 0); g.lineTo(wl - Math.sign(wl) * 8, 6); g.stroke();
      g.font = '700 14px "Chakra Petch"'; g.fillStyle = '#e9e6ff'; g.textAlign = 'center'; g.fillText(`WIND ${Math.abs(wind).toFixed(1)}`, 0, 56); g.restore();
      for (let i = 0; i < arrows; i++) { g.fillStyle = '#ff2bd6'; g.fillRect(28 + i * 12, 28, 3, 30); }
      if (msgT > 0) { msgT -= dt; g.save(); g.globalAlpha = Math.min(1, msgT * 2); g.fillStyle = '#fff'; glow(g, msg === 'HIT' ? '#7dff6a' : '#ff2bd6', 18); g.font = '700 64px "Big Shoulders Display"'; g.textAlign = 'center'; g.fillText(msg, W / 2, H * .35); g.restore(); }
    });
    return () => { stop(); unkey(); };
  }

  /* ══ 04 · SPLICE: cut the film on the beat ══ */
  function splice(el, api) {
    el.innerHTML = `<div class="g g-splice">
      <p class="g-how">Film runs through the gate on the beat. Cut when a marked join is inside the gate. Five joins come through. Cut at least 4 of them cleanly. Two misses and it jams.</p>
      <div class="g-stage splice-stage"><canvas></canvas></div>
      <button type="button" class="btn-neon cut-btn">Cut <kbd>Space</kbd></button></div>`;
    const cv = el.querySelector('canvas'), W = 900, H = 300, { g } = stage(cv, W, H);
    if (!SND.playing) SND.start();
    const sd = SND.stepDur(), t0 = SND.nextBar() + 16 * sd, V = 260, GX = W / 2, FW = 4 * sd * V;
    const pick = [0, 1, 3, 4, 6];
    const marks = pick.map(i => ({ t: t0 + i * 8 * sd, st: 0 }));
    let good = 0, lives = 2, done = false, gf = 0, gc = '#22f3ff';
    const st = () => api.stat(`CUTS ${good}/4 · MISSES LEFT ${lives}`); st(); dbg.splice = { marks, cut };
    function cut() {
      if (done) return; const now = SND.now();
      let m = null, bd = 9; marks.forEach(x => { if (!x.st) { const d = Math.abs(x.t - now); if (d < bd) { bd = d; m = x; } } });
      if (m && bd < .15) { m.st = 1; good++; gf = 1; gc = '#7dff6a'; SND.note(4 + good, .2); }
      else { lives--; gf = 1; gc = '#ff2bd6'; SND.ui('bad'); }
      st(); check();
    }
    function check() {
      if (done) return;
      if (lives <= 0) { done = true; api.lose('The film jammed.'); return; }
      if (marks.every(m => m.st)) { done = true; good >= 4 ? api.win(`${good} clean cuts.`) : api.lose(`${good} good cuts. You need 4.`); }
    }
    el.querySelector('.cut-btn').addEventListener('pointerdown', e => { e.preventDefault(); cut(); });
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cut(); });
    const unkey = keys({ ' ': cut, Space: cut, enter: cut });
    const stop = loop(() => {
      const now = SND.now();
      marks.forEach(m => { if (!m.st && now > m.t + .15) { m.st = 2; lives--; gf = 1; gc = '#ff2bd6'; st(); check(); } });
      g.clearRect(0, 0, W, H);
      const top = 70, fh = 160;
      g.fillStyle = '#0a0612'; g.fillRect(0, top - 26, W, fh + 52);
      const k0 = Math.floor((now - t0) / (4 * sd)) - 6;
      for (let k = k0; k < k0 + 14; k++) {
        const x = GX + (t0 + k * 4 * sd - now) * V;
        const hue = (k * 47 % 360 + 360) % 360, gr = g.createLinearGradient(x, top, x + FW, top + fh);
        gr.addColorStop(0, `hsla(${hue},80%,45%,.75)`); gr.addColorStop(1, `hsla(${(hue + 60) % 360},70%,18%,.9)`);
        g.fillStyle = gr; g.fillRect(x + 4, top, FW - 8, fh);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 13px "Share Tech Mono"'; g.fillText(String(((k % 99) + 99) % 99 + 1).padStart(2, '0'), x + 10, top + fh - 10);
        g.fillStyle = '#1e1630'; for (let h = 0; h < 4; h++) { g.fillRect(x + 8 + h * FW / 4, top - 18, FW / 8, 10); g.fillRect(x + 8 + h * FW / 4, top + fh + 8, FW / 8, 10); }
      }
      marks.forEach(m => {
        const x = GX + (m.t - now) * V; if (x < -40 || x > W + 40) return;
        g.save(); const c = m.st === 1 ? '#7dff6a' : m.st === 2 ? '#555' : '#ff2bd6'; g.strokeStyle = c; glow(g, c, 14); g.lineWidth = 4;
        g.beginPath(); g.moveTo(x - 16, top + 20); g.lineTo(x + 16, top + fh - 20); g.moveTo(x + 16, top + 20); g.lineTo(x - 16, top + fh - 20); g.stroke();
        if (m.st === 1) { g.fillStyle = 'rgba(125,255,106,.35)'; g.fillRect(x - 10, top - 26, 20, fh + 52); }
        g.restore();
      });
      g.save(); g.strokeStyle = gc; glow(g, gc, 18 + gf * 24); g.lineWidth = 3 + gf * 3;
      const gw = .15 * V; g.strokeRect(GX - gw, top - 34, gw * 2, fh + 68); g.restore();
      gf *= .9; if (gf < .02) gc = '#22f3ff';
      if (now < t0) { g.save(); g.fillStyle = '#fff'; glow(g, '#2bffc6', 18); g.font = '700 40px "Big Shoulders Display"'; g.textAlign = 'center'; g.fillText('ROLLING…', W / 2, 40); g.restore(); }
    });
    return () => { stop(); unkey(); };
  }

  /* ══ 05 · ECHO: repeat the director's cues ══ */
  function echo(el, api) {
    const CUES = [['Roll', '#22f3ff', 0], ['Action', '#ff2bd6', 2], ['Lights', '#ffe14d', 4], ['Cut', '#7dff6a', 7]];
    el.innerHTML = `<div class="g g-echo">
      <p class="g-how">Watch and listen to the cues, then repeat them in order. Three rounds. Two lives.</p>
      <div class="pads">${CUES.map(([n, c], i) => `<button type="button" class="pad" data-i="${i}" style="--c:${c}"><b>${n}</b><kbd>${i + 1}</kbd></button>`).join('')}</div>
      <p class="echo-msg" aria-live="polite"></p></div>`;
    const pads = [...el.querySelectorAll('.pad')], msg = el.querySelector('.echo-msg');
    const LEN = [3, 4, 5]; let round = 0, seq = [], pos = 0, lives = 2, input = false, done = false; const tm = [];
    const later = (f, ms) => tm.push(setTimeout(f, ms));
    const st = () => api.stat(`ROUND ${round + 1}/3 · LIVES ${'♥'.repeat(lives)}`);
    function light(i, ms = 320) { pads[i].classList.add('lit'); SND.note(CUES[i][2], .3); later(() => pads[i].classList.remove('lit'), ms); }
    function show(fresh) {
      if (fresh) seq = Array.from({ length: LEN[round] }, () => Math.floor(Math.random() * 4));
      input = false; pos = 0; msg.textContent = 'Watch…'; st();
      seq.forEach((i, k) => later(() => light(i), 700 + k * 520));
      later(() => { input = true; msg.textContent = 'Your turn.'; }, 700 + seq.length * 520);
    }
    function press(i) {
      if (!input || done) return; light(i, 180);
      if (i !== seq[pos]) {
        input = false; lives--; SND.ui('bad'); el.querySelector('.pads').classList.add('shake'); later(() => el.querySelector('.pads').classList.remove('shake'), 400);
        if (!lives) { done = true; later(() => api.lose('The take fell apart.'), 500); } else { msg.textContent = 'Wrong cue. Again.'; later(() => show(false), 900); }
        st(); return;
      }
      if (++pos === seq.length) {
        input = false;
        if (++round === 3) { done = true; msg.textContent = 'That’s a wrap.'; later(() => api.win('Three rounds, every cue.'), 700); }
        else { msg.textContent = 'Good take.'; later(() => show(true), 900); }
      }
    }
    pads.forEach(p => p.addEventListener('pointerdown', e => { e.preventDefault(); press(+p.dataset.i); }));
    const unkey = keys({ 1: () => press(0), 2: () => press(1), 3: () => press(2), 4: () => press(3) });
    later(() => show(true), 300); dbg.echo = { seq: () => seq, input: () => input, press };
    return () => { tm.forEach(clearTimeout); unkey(); };
  }

  /* ══ 06 · PLOT: put a film's beats in story order ══ */
  function plot(el, api) {
    const BEATS = [
      ['Setup', 'A night-shift taxi driver works the empty streets of Tehran.'],
      ['Inciting incident', 'A passenger leaves a bag of cassette tapes in the back seat.'],
      ['Midpoint', 'He plays one. The tapes are recordings of him.'],
      ['Darkest moment', 'His cab is found burned, and he is the only suspect.'],
      ['Climax', 'He plays the last tape to the man who recorded it.'],
    ];
    let order; do { order = BEATS.map((_, i) => i).sort(() => Math.random() - .5); } while (order.every((v, i) => v === i));
    el.innerHTML = `<div class="g g-plot">
      <p class="g-how">A film in five beats, shuffled. Tap them in story order, from the first scene to the climax. Two wrong picks and the draft is torn up.</p>
      <ol class="plot-slots">${BEATS.map((_, i) => `<li data-i="${i}"><span>${String(i + 1).padStart(2, '0')}</span><i></i></li>`).join('')}</ol>
      <div class="plot-cards">${order.map(i => `<button type="button" class="plot-card" data-i="${i}"><p>${BEATS[i][1]}</p></button>`).join('')}</div></div>`;
    let next = 0, lives = 2, done = false;
    const st = () => api.stat(`SCENE ${Math.min(next + 1, 5)}/5 · LIVES ${'♥'.repeat(lives)}`); st();
    el.querySelector('.plot-cards').addEventListener('click', e => {
      const b = e.target.closest('.plot-card'); if (!b || done || b.disabled) return;
      if (+b.dataset.i === next) {
        b.disabled = true; b.classList.add('used');
        const slot = el.querySelector(`.plot-slots li[data-i="${next}"]`); slot.classList.add('on'); slot.querySelector('i').innerHTML = `<b>${BEATS[next][0]}</b>${BEATS[next][1]}`;
        SND.note(next * 2, .3); next++; st();
        if (next === BEATS.length) { done = true; setTimeout(() => api.win(`The draft holds together with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`), 900); }
      } else {
        lives--; SND.ui('bad'); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); st();
        if (!lives) { done = true; setTimeout(() => api.lose('The story fell out of order.'), 500); }
      }
    });
    dbg.plot = { next: () => next };
    return () => { };
  }

  /* ══ 07 · MATE IN ONE: three burning boards ══ */
  function mate(el, api) {
    const G = { K: '\u265A', Q: '\u265B', R: '\u265C', B: '\u265D', N: '\u265E', P: '\u265F' };
    const PZ = [
      { pos: { g1: 'K', a1: 'R', g8: 'k', f7: 'p', g7: 'p', h7: 'p' }, sol: ['a1a8'], tip: 'The back rank is a trap.' },
      { pos: { c1: 'K', a7: 'R', b1: 'R', h8: 'k' }, sol: ['b1b8'], tip: 'Two rooks climb a ladder.' },
      { pos: { g6: 'K', b1: 'Q', h8: 'k' }, sol: ['b1b8'], tip: 'The king and queen work together.' },
    ];
    el.innerHTML = `<div class="g g-mate">
      <p class="g-how">White to move. Each board has a checkmate in one move. Tap a white piece, then the square it should go to. Three boards, three mistakes allowed.</p>
      <div class="mate-wrap"><div class="mate-frame"><div class="mate-board" role="grid" aria-label="Chess board"></div></div><p class="mate-tip" aria-live="polite"></p></div></div>`;
    const board = el.querySelector('.mate-board'), tip = el.querySelector('.mate-tip');
    const files = 'abcdefgh';
    let pi = 0, sel = null, miss = 0, solved = 0, done = false, pos = {};
    const st = () => api.stat(`BOARD ${Math.min(pi + 1, 3)}/3 · MISTAKES ${miss}/3`);
    function draw() {
      board.innerHTML = '';
      for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
        const sq = files[f] + r, pc = pos[sq], b = document.createElement('button');
        b.type = 'button'; b.className = 'sq ' + ((f + r) % 2 ? 'ash' : 'obs'); b.dataset.sq = sq;
        b.setAttribute('aria-label', sq + (pc ? ' ' + (pc === pc.toUpperCase() ? 'white ' : 'black ') + ({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[pc.toLowerCase()] : ''));
        if (pc) b.innerHTML = `<span class="pc ${pc === pc.toUpperCase() ? 'w' : 'b'}">${G[pc.toUpperCase()]}\uFE0E</span>`;
        if (sel === sq) b.classList.add('sel');
        if (f === 0) b.insertAdjacentHTML('beforeend', `<i class="rk">${r}</i>`);
        if (r === 1) b.insertAdjacentHTML('beforeend', `<i class="fl">${files[f]}</i>`);
        board.append(b);
      }
    }
    function load(i) { pos = { ...PZ[i].pos }; sel = null; tip.textContent = PZ[i].tip; draw(); st(); }
    board.addEventListener('click', e => {
      const b = e.target.closest('.sq'); if (!b || done) return;
      const sq = b.dataset.sq, pc = pos[sq];
      if (pc && pc === pc.toUpperCase()) { sel = sq; SND.ui('tick'); draw(); return; }
      if (!sel) return;
      const mv = sel + sq;
      if (PZ[pi].sol.includes(mv)) {
        pos[sq] = pos[sel]; delete pos[sel]; sel = null; draw(); board.querySelector(`[data-sq="${sq}"]`).classList.add('mate');
        tip.textContent = 'Checkmate.'; SND.ui('good'); solved++; done = true;
        setTimeout(() => { if (solved === PZ.length) api.win(`Three mates with ${miss} mistake${miss === 1 ? '' : 's'}.`); else { done = false; pi++; load(pi); } }, 1100);
      } else {
        miss++; sel = null; SND.ui('bad'); board.classList.remove('no'); void board.offsetWidth; board.classList.add('no'); draw(); st();
        tip.textContent = 'Not mate. The king escapes.';
        if (miss >= 3) { done = true; setTimeout(() => api.lose('Three moves that were not mate.'), 600); }
      }
    });
    load(0);
    dbg.mate = { PZ, idx: () => pi };
    return () => { };
  }

  /* ══ BEAT LAB: rewrite the drums of the soundtrack ══ */
  let labEl = null;
  SND.on((type, e) => {
    if (!labEl) return;
    if (type === 'step') { labEl.querySelectorAll('.bl-col.now').forEach(c => c.classList.remove('now')); labEl.querySelectorAll(`.bl-col[data-s="${e.step}"]`).forEach(c => c.classList.add('now')); }
    if (type === 'track' || type === 'state') labEl.dispatchEvent(new Event('refresh'));
  });
  function beat(el, api) {
    const ROWS = [['t', 'Tombak'], ['k', 'Kick'], ['s', 'Snare'], ['h', 'Hat'], ['o', 'Open hat']];
    el.innerHTML = `<div class="g g-lab">
      <div class="bl-top">
        <div class="bl-tracks" role="group" aria-label="Track">${SND.TRACKS.map((t, i) => `<button type="button" data-t="${i}">${t.name}<span>${t.bpm} BPM</span></button>`).join('')}</div>
        <button type="button" class="btn-neon bl-play"></button>
      </div>
      <div class="bl-grid">${ROWS.map(([k, n]) => `<div class="bl-row"><span class="bl-name">${n}</span><div class="bl-steps">${Array.from({ length: 16 }, (_, i) => `<button type="button" class="bl-col" data-r="${k}" data-s="${i}" aria-label="${n} step ${i + 1}"></button>`).join('')}</div></div>`).join('')}</div>
      <div class="bl-bottom">
        <div class="bl-parts">${['drums', 'bass', 'arp', 'pad'].map(p => `<button type="button" data-p="${p}">${p}</button>`).join('')}</div>
        <div class="bl-act"><button type="button" class="btn-ghost" data-a="rand">Glitch it</button><button type="button" class="btn-ghost" data-a="reset">Reset</button></div>
      </div>
      <p class="g-how">Tap squares to rewrite the drums live. Your beat stays in this browser, so it plays when you come back.</p></div>`;
    labEl = el;
    const refresh = () => {
      const D = SND.drums();
      el.querySelectorAll('.bl-col').forEach(b => { const v = D[b.dataset.r][+b.dataset.s]; b.classList.toggle('on', !!v); b.classList.toggle('acc', v === 2); });
      el.querySelectorAll('.bl-tracks button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.t === SND.track));
      el.querySelectorAll('.bl-parts button').forEach(b => b.setAttribute('aria-pressed', !!SND.parts[b.dataset.p]));
      el.querySelector('.bl-play').innerHTML = SND.playing ? 'Pause' : 'Play';
    };
    el.addEventListener('refresh', refresh);
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('bl-col')) { const D = SND.drums(), r = b.dataset.r, s = +b.dataset.s; D[r][s] = D[r][s] ? 0 : (r === 't' && s % 4 === 0 ? 2 : 1); api.save(); SND.ui('tick'); }
      else if (b.dataset.t) SND.setTrack(+b.dataset.t);
      else if (b.dataset.p) { SND.parts[b.dataset.p] = !SND.parts[b.dataset.p]; }
      else if (b.classList.contains('bl-play')) SND.toggle();
      else if (b.dataset.a === 'reset') { SND.resetDrums(); api.save(); }
      else if (b.dataset.a === 'rand') { const D = SND.drums(); for (const r of ['t', 'k', 's', 'h', 'o']) D[r] = D[r].map((v, i) => Math.random() < ({ t: .35, k: .28, s: .14, h: .5, o: .1 })[r] + (r === 'k' && i % 4 === 0 ? .4 : 0) ? 1 : 0); api.save(); SND.ui('glitch'); }
      refresh();
    });
    refresh(); api.stat(SND.playing ? 'LIVE' : 'PRESS PLAY');
    return () => { labEl = null; };
  }

  return { dbg, about: sync, bazar: decode, siavash: windshot, edu: splice, crew: echo, writer: plot, chess: mate, beat };
})();
