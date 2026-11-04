/* ─────────────────────────────────────────────────────────────
   MAKER: build a tiny neon platformer level, play it, and send
   it to someone as a link. Works with keys or on-screen buttons.
   ───────────────────────────────────────────────────────────── */
window.MAKER = (() => {
  const W = 24, H = 13, T = 40;
  const TOOLS = [['#', 'Wall', '#22f3ff'], ['o', 'Coin', '#ffe14d'], ['^', 'Spikes', '#ff2bd6'], ['S', 'Spring', '#7dff6a'], ['e', 'Drone', '#ff8a3d'], ['P', 'Start', '#ffffff'], ['G', 'Goal', '#b06bff'], ['.', 'Erase', '#8a83a8']];
  const ENC = { '#': 'w', o: 'c', '^': 's', S: 'j', e: 'e', P: 'p', G: 'g', '.': '.' }, DEC = Object.fromEntries(Object.entries(ENC).map(([a, b]) => [b, a]));
  const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
  function starter() {
    const g = blank(); for (let x = 0; x < W; x++) { g[H - 1][x] = '#'; } for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
    const plat = (x, y, n) => { for (let i = 0; i < n; i++) g[y][x + i] = '#'; };
    plat(5, 10, 3); plat(10, 8, 3); plat(15, 6, 3); plat(19, 4, 4); plat(12, 11, 1);
    g[11][2] = 'P'; g[3][21] = 'G'; g[9][6] = 'o'; g[7][11] = 'o'; g[5][16] = 'o'; g[11][9] = 'S'; g[11][14] = '^'; g[11][15] = '^'; g[11][18] = 'e'; g[3][19] = 'o';
    return g;
  }
  const encode = g => { let s = '', run = 0, prev = ''; const flat = g.flat().map(c => ENC[c] || '.'); flat.forEach((c, i) => { if (c === prev) run++; else { if (prev) s += (run > 1 ? run : '') + prev; prev = c; run = 1; } if (i === flat.length - 1) s += (run > 1 ? run : '') + prev; }); return s; };
  function decode(s) {
    const out = []; const re = /(\d*)([wcsjepg.])/g; let m;
    while ((m = re.exec(s))) { const n = m[1] ? +m[1] : 1; for (let i = 0; i < n && out.length < W * H; i++) out.push(DEC[m[2]]); }
    if (out.length !== W * H) return null; const g = blank(); out.forEach((c, i) => { g[Math.floor(i / W)][i % W] = c; }); return g;
  }
  const load = () => { try { const s = localStorage.getItem('av-neon-level'); return s && decode(s); } catch (e) { return null; } };
  const save = g => { try { localStorage.setItem('av-neon-level', encode(g)); } catch (e) { } };

  function mount(el, api, shared) {
    let grid = (shared && decode(shared)) || load() || starter(), tool = '#', mode = 'edit', sim = null, msgT = 0, msg = '', cleared = false;
    el.innerHTML = `<div class="g g-make">
      <div class="mk-bar">
        <div class="mk-tools" role="group" aria-label="Tiles">${TOOLS.map(([k, n, c], i) => `<button type="button" data-k="${k}" style="--c:${c}" aria-label="${n}" title="${n} (${(i + 1) % 10})"><i class="mk-ic" data-k="${k}"></i><span>${n}</span></button>`).join('')}</div>
        <div class="mk-act"><button type="button" class="btn-neon mk-play">Play</button><button type="button" class="btn-ghost" data-a="share">Copy link</button><button type="button" class="btn-ghost" data-a="clear">Clear</button><button type="button" class="btn-ghost" data-a="demo">Demo</button></div>
      </div>
      <div class="g-stage mk-stage"><canvas></canvas><p class="mk-msg" role="status"></p></div>
      <div class="mk-pad" aria-hidden="true"><button type="button" data-c="l">◀</button><button type="button" data-c="r">▶</button><button type="button" data-c="u">▲</button></div>
      <p class="g-how">Paint tiles, then press Play. Collect every coin to open the goal. Arrows or WASD to move, Space to jump, Esc to edit. Right-click erases.</p></div>`;
    const cv = el.querySelector('canvas'), PW = W * T, PH = H * T, d = Math.min(2, devicePixelRatio || 1);
    cv.width = PW * d; cv.height = PH * d; cv.style.aspectRatio = `${PW} / ${PH}`; const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    const msgEl = el.querySelector('.mk-msg'), playBtn = el.querySelector('.mk-play');
    const say = (m, t = 2) => { msg = m; msgT = t; msgEl.textContent = m; msgEl.classList.add('on'); };
    const pick = k => { tool = k; el.querySelectorAll('.mk-tools button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k)); };
    pick('#');
    el.querySelectorAll('.mk-ic').forEach(c => { const cc = document.createElement('canvas'); cc.width = cc.height = 40; drawTile(cc.getContext('2d'), c.dataset.k, 0, 0, 0); c.append(cc); });

    const cell = e => { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H); return x >= 0 && y >= 0 && x < W && y < H ? { x, y } : null; };
    let painting = 0;
    function paint(c, k) {
      if (!c) return; if (k === 'P' || k === 'G') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === k) grid[y][x] = '.';
      if (grid[c.y][c.x] !== k) { grid[c.y][c.x] = k; SND.ui('tick'); save(grid); }
    }
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { if (mode !== 'edit') return; cv.setPointerCapture(e.pointerId); painting = e.button === 2 ? 2 : 1; paint(cell(e), painting === 2 ? '.' : tool); });
    cv.addEventListener('pointermove', e => { if (mode === 'edit' && painting && tool !== 'P' && tool !== 'G') paint(cell(e), painting === 2 ? '.' : tool); });
    addEventListener('pointerup', () => { painting = 0; });

    const K = { l: 0, r: 0, u: 0 }; let jumpBuf = 0;
    function find(k) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === k) return { x, y }; return null; }
    function start() {
      const p = find('P'), gl = find('G'); if (!p) return say('Place a Start tile first.'); if (!gl) return say('Place a Goal tile first.');
      const coins = []; const drones = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (grid[y][x] === 'o') coins.push({ x, y, got: 0 }); if (grid[y][x] === 'e') drones.push({ x: x * T + 4, y: y * T + 8, w: T - 8, h: T - 12, vx: 70 }); }
      sim = { p: { x: p.x * T + 8, y: p.y * T + 6, w: T - 16, h: T - 8, vx: 0, vy: 0, on: 0 }, sp: p, coins, drones, t: 0, deaths: 0 };
      mode = 'play'; cleared = false; playBtn.textContent = 'Edit'; el.classList.add('playing'); cv.focus?.(); SND.ui('open');
      say(coins.length ? `Collect ${coins.length} coin${coins.length > 1 ? 's' : ''}.` : 'Reach the goal.', 1.6);
    }
    function edit() { mode = 'edit'; sim = null; playBtn.textContent = 'Play'; el.classList.remove('playing'); }
    playBtn.addEventListener('click', () => mode === 'edit' ? start() : edit());
    el.querySelector('.mk-tools').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { pick(b.dataset.k); if (mode === 'play') edit(); } });
    el.querySelector('.mk-act').addEventListener('click', async e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      if (a === 'clear') { grid = blank(); for (let x = 0; x < W; x++) grid[H - 1][x] = '#'; save(grid); edit(); say('Blank level.'); }
      if (a === 'demo') { grid = starter(); save(grid); edit(); say('Demo level loaded.'); }
      if (a === 'share') {
        const url = location.href.split('#')[0] + '#lvl=' + encode(grid);
        try { await navigator.clipboard.writeText(url); say('Link copied. Send it to someone.', 2.4); } catch (err) { say('Copy this link: ' + url, 6); }
        try { history.replaceState(null, '', '#lvl=' + encode(grid)); } catch (err) { }
      }
    });
    const pad = el.querySelector('.mk-pad');
    pad.querySelectorAll('button').forEach(b => {
      const c = b.dataset.c, on = e => { e.preventDefault(); K[c] = 1; if (c === 'u') jumpBuf = .12; b.classList.add('on'); }, off = () => { K[c] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    const kd = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key.toLowerCase();
      if (mode === 'edit') { const n = '1234567890'.indexOf(k); if (n >= 0 && TOOLS[n]) { pick(TOOLS[n][0]); e.preventDefault(); } if (k === 'enter') { start(); e.preventDefault(); } return; }
      if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); edit(); return; }
      if (k === 'arrowleft' || k === 'a') K.l = 1; else if (k === 'arrowright' || k === 'd') K.r = 1;
      else if (k === 'arrowup' || k === 'w' || k === ' ') { K.u = 1; if (!e.repeat) jumpBuf = .12; } else if (k === 'r') start(); else return;
      e.preventDefault();
    };
    const ku = e => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') K.l = 0; if (k === 'arrowright' || k === 'd') K.r = 0; if (k === 'arrowup' || k === 'w' || k === ' ') K.u = 0; };
    addEventListener('keydown', kd, true); addEventListener('keyup', ku);

    const solid = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); if (cx < 0 || cx >= W) return true; if (cy < 0 || cy >= H) return false; return grid[cy][cx] === '#'; };
    const at = (r, ch) => { for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.h - 1) / T); y++) for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.w - 1) / T); x++) if (grid[y] && grid[y][x] === ch) return { x, y }; return null; };
    function die(why) { const s = sim; s.deaths++; SND.ui('bad'); say(why, 1); s.p.x = s.sp.x * T + 8; s.p.y = s.sp.y * T + 6; s.p.vx = s.p.vy = 0; s.coins.forEach(c => c.got = 0); }
    function step(dt) {
      const s = sim, p = s.p; s.t += dt;
      const ax = (K.r - K.l) * 2600; p.vx += ax * dt; p.vx *= p.on ? .8 : .92; p.vx = Math.max(-300, Math.min(300, p.vx));
      jumpBuf -= dt; if (jumpBuf > 0 && p.on > 0) { p.vy = -720; p.on = 0; jumpBuf = 0; SND.ui('tick'); }
      if (!K.u && p.vy < -260) p.vy = -260;
      p.vy = Math.min(900, p.vy + 2000 * dt); p.on = Math.max(0, p.on - dt);
      p.x += p.vx * dt;
      if (p.vx > 0 && (solid(p.x + p.w, p.y + 1) || solid(p.x + p.w, p.y + p.h - 1))) { p.x = Math.floor((p.x + p.w) / T) * T - p.w - .01; p.vx = 0; }
      if (p.vx < 0 && (solid(p.x, p.y + 1) || solid(p.x, p.y + p.h - 1))) { p.x = Math.floor(p.x / T + 1) * T + .01; p.vx = 0; }
      p.y += p.vy * dt;
      if (p.vy > 0 && (solid(p.x + 2, p.y + p.h) || solid(p.x + p.w - 2, p.y + p.h))) { p.y = Math.floor((p.y + p.h) / T) * T - p.h - .01; p.vy = 0; p.on = .1; }
      if (p.vy < 0 && (solid(p.x + 2, p.y) || solid(p.x + p.w - 2, p.y))) { p.y = Math.floor(p.y / T + 1) * T + .01; p.vy = 0; }
      if (p.y > H * T + 40) return die('Fell.');
      if (at(p, '^')) return die('Spiked.');
      const sp = at({ x: p.x, y: p.y + p.h - 4, w: p.w, h: 6 }, 'S'); if (sp && p.vy >= 0) { p.vy = -1040; p.on = 0; SND.note(9, .2); }
      s.coins.forEach(c => { if (!c.got && Math.abs(p.x + p.w / 2 - (c.x * T + T / 2)) < T * .6 && Math.abs(p.y + p.h / 2 - (c.y * T + T / 2)) < T * .6) { c.got = 1; SND.note(5 + s.coins.filter(q => q.got).length, .15); } });
      s.drones.forEach(dn => {
        dn.x += dn.vx * dt;
        if (solid(dn.vx > 0 ? dn.x + dn.w : dn.x, dn.y + dn.h / 2) || !solid(dn.vx > 0 ? dn.x + dn.w : dn.x, dn.y + dn.h + 4)) dn.vx *= -1;
        if (p.x < dn.x + dn.w && p.x + p.w > dn.x && p.y < dn.y + dn.h && p.y + p.h > dn.y) {
          if (p.vy > 0 && p.y + p.h - dn.y < 16) { dn.dead = 1; p.vy = -520; SND.ui('good'); } else die('Zapped.');
        }
      });
      s.drones = s.drones.filter(x => !x.dead);
      const open = s.coins.every(c => c.got);
      if (open && at(p, 'G') && !cleared) { cleared = true; SND.ui('win'); say(`Cleared in ${s.t.toFixed(1)}s${s.deaths ? `, ${s.deaths} death${s.deaths > 1 ? 's' : ''}` : ''}. Copy the link and dare someone.`, 4); setTimeout(edit, 1800); }
    }

    function drawTile(c, k, x, y, t, open) {
      const s = T, m = s / 2; c.save(); c.translate(x, y);
      if (k === '#') { c.fillStyle = '#10082a'; c.fillRect(1, 1, s - 2, s - 2); c.strokeStyle = '#22f3ff'; c.shadowColor = '#22f3ff'; c.shadowBlur = .9 * (8); c.lineWidth = 2; c.strokeRect(3, 3, s - 6, s - 6); }
      else if (k === 'o') { c.fillStyle = '#ffe14d'; c.shadowColor = '#ffe14d'; c.shadowBlur = .9 * (12); c.beginPath(); c.ellipse(m, m, 8 * Math.abs(Math.cos(t * 3)) + 2, 10, 0, 0, 7); c.fill(); }
      else if (k === '^') { c.fillStyle = '#ff2bd6'; c.shadowColor = '#ff2bd6'; c.shadowBlur = .9 * (10); c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(4 + i * 11, s - 3); c.lineTo(9.5 + i * 11, s - 22); c.lineTo(15 + i * 11, s - 3); } c.fill(); }
      else if (k === 'S') { c.strokeStyle = '#7dff6a'; c.shadowColor = '#7dff6a'; c.shadowBlur = .9 * (10); c.lineWidth = 3; c.beginPath(); c.moveTo(6, s - 6); c.lineTo(s - 6, s - 6); c.moveTo(8, s - 12); for (let i = 0; i < 4; i++) c.lineTo(i % 2 ? 8 : s - 8, s - 12 - i * 5); c.moveTo(6, s - 30); c.lineTo(s - 6, s - 30); c.stroke(); }
      else if (k === 'e') { c.strokeStyle = '#ff8a3d'; c.shadowColor = '#ff8a3d'; c.shadowBlur = .9 * (10); c.lineWidth = 2.5; c.strokeRect(8, 12, s - 16, s - 22); c.fillStyle = '#ff8a3d'; c.fillRect(13, 18, 5, 5); c.fillRect(s - 18, 18, 5, 5); c.beginPath(); c.moveTo(4, 10); c.lineTo(s - 4, 10); c.stroke(); }
      else if (k === 'P') { c.strokeStyle = '#fff'; c.setLineDash([4, 4]); c.lineWidth = 2; c.strokeRect(6, 6, s - 12, s - 12); c.setLineDash([]); c.fillStyle = '#fff'; c.font = '700 14px "Chakra Petch"'; c.textAlign = 'center'; c.fillText('P1', m, m + 5); }
      else if (k === 'G') { const col = open === false ? '#5a4f7a' : '#b06bff'; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = .9 * (14); c.lineWidth = 3; c.beginPath(); c.moveTo(10, s - 3); c.lineTo(10, 5); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(10, 5); c.lineTo(s - 6, 11); c.lineTo(10, 17); c.fill(); }
      else if (k === '.') { c.strokeStyle = '#8a83a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(10, 10); c.lineTo(s - 10, s - 10); c.moveTo(s - 10, 10); c.lineTo(10, s - 10); c.stroke(); }
      c.restore();
    }

    let alive = true, last = performance.now();
    function frame(ts) {
      if (!alive) return; const dt = Math.min(.033, (ts - last) / 1000), t = ts / 1000; last = ts;
      if (mode === 'play' && sim) step(dt);
      g.clearRect(0, 0, PW, PH); g.fillStyle = '#07030f'; g.fillRect(0, 0, PW, PH);
      g.strokeStyle = 'rgba(176,107,255,.09)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x++) { g.moveTo(x * T, 0); g.lineTo(x * T, PH); } for (let y = 0; y <= H; y++) { g.moveTo(0, y * T); g.lineTo(PW, y * T); } g.stroke();
      const open = sim ? sim.coins.every(c => c.got) : true;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = grid[y][x]; if (k === '.') continue;
        if (sim && (k === 'o' && sim.coins.find(c => c.x === x && c.y === y && c.got))) continue;
        if (sim && (k === 'e' || k === 'P')) continue;
        drawTile(g, k, x * T, y * T, t + x * .3, k === 'G' ? open : undefined);
      }
      if (sim) {
        sim.drones.forEach(dn => drawTile(g, 'e', dn.x - 4, dn.y - 8, t));
        const p = sim.p; g.save(); g.fillStyle = '#ff2bd6'; g.shadowColor = '#ff2bd6'; g.shadowBlur = .9 * (16); g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#22f3ff'; g.shadowColor = '#22f3ff'; g.fillRect(p.x + (p.vx < 0 ? 2 : p.w - 16), p.y + 7, 14, 6); g.restore();
      }
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.classList.remove('on'); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    api.stat('BUILD · PLAY · SHARE');
    if (shared) say(decode(shared) ? 'Someone sent you this level. Press Play.' : 'That level link is broken. Here is the demo.', 3);
    return () => { alive = false; removeEventListener('keydown', kd, true); removeEventListener('keyup', ku); };
  }
  return { mount, decode };
})();
