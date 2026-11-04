/* ─────────────────────────────────────────────────────────────
   MAIN: boot, HUD and deck, the arcade, files, dossier, jamming.
   Everything visible comes from content (content.js defaults,
   overridden by content.json written by the admin page).
   ───────────────────────────────────────────────────────────── */
window.AV_START = (C) => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const F = C.files, RULES = C.rules;
  const IMG = { siaStream: (F.siavash.screenshots[0] || {}).image || '' };
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── page meta, from the admin ── */
  document.title = C.site.title;
  const md = $('meta[name="description"]'); if (md) md.content = C.site.description;

  /* ── saved state ── */
  const KEY = 'av-neon-v1';
  const S = { shards: {}, fails: {}, drums: null, track: null, muted: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { }
  SND.loadDrums(S.drums); SND.setTrack(S.track ?? (+RULES.defaultTrack || 0));
  const persist = () => { try { S.drums = SND.allDrums(); S.track = SND.track; S.muted = SND.muted; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

  /* ── the cabinets ── */
  const LOCKED = ['about', 'bazar', 'siavash', 'edu', 'crew'];
  const CABS = C.cabinets.filter(c => !c.hidden && (LOCKED.includes(c.id) || c.id === 'maker' || c.id === 'beat'))
    .map((c, i) => ({ ...c, n: String(i + 1).padStart(2, '0'), c: c.color, file: LOCKED.includes(c.id) }));
  const FILES = CABS.filter(c => c.file), NF = FILES.length;
  const cab = id => CABS.find(c => c.id === id);
  const done = id => !!S.shards[id];
  const kick = (id, k) => `<p class="f-k">File ${cab(id) ? cab(id).n : ''} · ${E(k)}</p>`;
  const fa = t => t ? `<span lang="fa" dir="rtl">${E(t)}</span>` : '';
  // fix links typed without a scheme: bare emails become mailto:, bare domains become https://
  const link = u => { u = String(u || '').trim(); if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; if (/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(u)) return 'mailto:' + u; if (/^\+?[\d\s()-]{7,}$/.test(u)) return 'tel:' + u.replace(/[^\d+]/g, ''); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith('/') && !u.startsWith('#')) return 'https://' + u; return u; };
  const more = l => l ? `<p><a class="f-link" href="${E(link(l))}" target="_blank" rel="noopener">Open ↗</a></p>` : '';

  /* ── file contents ── */
  const FILE = {
    about: () => { const d = F.about; return `<div class="file f-about">${kick('about', d.kicker)}
      <h3>${E(d.title)}</h3>${d.fa ? `<p class="f-fa" lang="fa" dir="rtl">${E(d.fa)}</p>` : ''}
      <dl class="f-stats">${d.stats.map(x => `<div><dt>${E(x.label)}</dt><dd>${E(x.value)}</dd></div>`).join('')}</dl></div>`; },
    bazar: () => { const d = F.bazar; return `<div class="file f-bazar">
      ${d.image ? `<figure class="f-hero"><img src="${E(d.image)}" alt="${E(d.imageAlt)}"></figure>` : ''}
      <div class="f-main">${kick('bazar', d.kicker)}
        <h3>${E(d.title)} ${fa(d.fa)}</h3>
        <p class="f-lede">${E(d.lede)}</p>
        ${d.numbers.length ? `<dl class="f-nums">${d.numbers.map(x => `<div><dd>${E(x.value)}</dd><dt>${E(x.label)}</dt></div>`).join('')}</dl>` : ''}
        ${d.points.length ? `<ul class="f-list">${d.points.map(x => `<li><b>${E(x.bold)}</b> ${E(x.text)}</li>`).join('')}</ul>` : ''}
        ${d.gallery.length ? `<div class="f-strip">${d.gallery.map(x => `<button type="button" data-zoom="${E(x.image)}" aria-label="Enlarge ${E(x.label)}"><img src="${E(x.image)}" alt="${E(x.label)}"><span>${E(x.label)}</span></button>`).join('')}</div>` : ''}
        ${d.footnote ? `<p class="f-tech">${E(d.footnote)}</p>` : ''}${more(d.link)}
      </div></div>`; },
    siavash: () => { const d = F.siavash; return `<div class="file f-sia">${kick('siavash', d.kicker)}
      <h3>${E(d.title)} ${fa(d.fa)}</h3>
      <p class="f-lede">${E(d.lede)}</p>
      ${d.screenshots.length ? `<div class="f-shots n${Math.min(3, d.screenshots.length)}">${d.screenshots.map(x => `<button type="button" data-zoom="${E(x.image)}" aria-label="Enlarge: ${E(x.alt)}"><img src="${E(x.image)}" alt="${E(x.alt)}"></button>`).join('')}</div>` : ''}
      ${d.footnote ? `<p class="f-tech">${E(d.footnote)}</p>` : ''}${more(d.link)}</div>`; },
    edu: () => { const d = F.edu; return `<div class="file f-edu">${kick('edu', d.kicker)}
      <div class="f-badges">${d.badges.map(x => `<div class="f-badge${x.highlight ? ' hl' : ''}">${x.logo ? `<img src="${E(x.logo)}" alt="${E(x.logoAlt)}">` : ''}<div><p class="f-k2">${E(x.small)}</p><h3>${E(x.big)}</h3><p>${E(x.line)}</p></div></div>`).join('')}</div></div>`; },
    crew: () => { const d = F.crew; return `<div class="file f-crew">${kick('crew', d.kicker)}
      <ul class="f-roles">${d.roles.map(x => `<li><span class="f-clap" aria-hidden="true"></span><div><b>${E(x.role)}</b><span>${E(x.where)}</span></div></li>`).join('')}</ul></div>`; },
  };
  /* ── HUD + deck ── */
  const gems = $('#gems'), shardN = $('#shardN');
  function hud() {
    const n = FILES.filter(f => done(f.id)).length;
    shardN.textContent = n; $('#shardT').textContent = NF; gems.innerHTML = FILES.map(f => `<i class="${done(f.id) ? 'on' : ''}" style="--c:${f.c}"></i>`).join('');
    $$('.cab').forEach(b => { const c = cab(b.dataset.id); if (!c.file) return; b.classList.toggle('open', done(c.id)); $('.cab-lock', b).textContent = done(c.id) ? 'Decrypted' : 'Encrypted'; });
    $('.hero-brief b').textContent = n === NF ? `All ${NF} files decrypted.` : `${NF - n} of ${NF} files ${NF - n === 1 ? 'is' : 'are'} encrypted.`;
    ticker();
  }
  function deck() {
    const T = SND.TRACKS[SND.track];
    $('#dName').textContent = T.name; $('#dBpm').textContent = `${T.bpm} BPM`;
    $('#dPlay').classList.toggle('on', SND.playing); $('#dPlay').setAttribute('aria-label', SND.playing ? 'Pause the music' : 'Play the music');
    $('#dMute').classList.toggle('off', SND.muted); $('#dMute').setAttribute('aria-label', SND.muted ? 'Unmute' : 'Mute');
    ticker();
  }
  function ticker() {
    const T = SND.TRACKS[SND.track], n = FILES.filter(f => done(f.id)).length;
    const bits = [`♪ Now playing: ${T.name} · ${T.mode} · ${T.bpm} BPM`, 'Original melodies in the Persian modes, played on synth santur', `${n}/${NF} files decrypted`, 'Tap anywhere to play a note', 'Press A to L to jam', 'Build a level and send it as a link', 'Rewrite the drums in the Beat Lab', 'Night city, Tehran, 2099'];
    const s = bits.map(b => `<span>${b}</span><i>✦</i>`).join('');
    $('#tkIn').innerHTML = s + s;
  }
  $('#dPlay').addEventListener('click', () => { SND.toggle(); });
  $('#dTrack').addEventListener('click', () => { SND.setTrack(SND.track + 1); persist(); SND.ui('blip'); });
  $('#dMute').addEventListener('click', () => { SND.mute(!SND.muted); persist(); });
  $('#hudShards').addEventListener('click', () => open('dossier'));
  SND.on(type => { if (type === 'state' || type === 'track') deck(); });
  const viz = $('#dViz'), vg = viz.getContext('2d');
  (function vloop() {
    const sp = SND.spectrum(); vg.clearRect(0, 0, 96, 28);
    for (let i = 0; i < 16; i++) { const v = sp ? sp[2 + i * 3] / 255 : 0, h = Math.max(2, v * 26); vg.fillStyle = i % 2 ? '#ff2bd6' : '#22f3ff'; vg.fillRect(i * 6, 28 - h, 4, h); }
    requestAnimationFrame(vloop);
  })();

  /* ── hero: a name you can play ── */
  const heroName = $('#heroName');
  heroName.setAttribute('aria-label', `${C.hero.nameLine1} ${C.hero.nameLine2}`.trim());
  heroName.innerHTML = [C.hero.nameLine1, C.hero.nameLine2].filter(Boolean).map(w => `<span class="hn-w">${[...w].map(ch => `<span class="hn-l" aria-hidden="true">${E(ch)}</span>`).join('')}</span>`).join(' ');
  $('.hero-k').firstChild.textContent = C.hero.kicker + ' ';
  $('.hero-fa').textContent = C.hero.fa;
  $('#roles').innerHTML = C.hero.roles.map(r => `<li><button type="button" data-c="${E(r.color)}" style="--c:${E(r.color)}">${E(r.label)}</button></li>`).join('');
  $('.hero-play').textContent = C.hero.hint;
  if (C.contact.length) $('#arcade').insertAdjacentHTML('afterend', `<section class="contact" aria-label="Contact"><h2>Transmit</h2><ul>${C.contact.map(x => `<li><a href="${E(link(x.url))}"${/^mailto:|^tel:/.test(link(x.url)) ? '' : ' target="_blank" rel="noopener"'}>${E(x.label)}</a></li>`).join('')}</ul></section>`);
  const letters = $$('.hn-l');
  function hitLetter(i, sound = true) {
    const l = letters[i]; if (!l) return; l.classList.remove('hit'); void l.offsetWidth; l.classList.add('hit');
    if (sound) SND.note(i % 10, .3);
    const r = l.getBoundingClientRect(); CITY.ripple(r.left + r.width / 2, r.top + r.height / 2, i % 2 ? '#ff2bd6' : '#22f3ff', 70);
  }
  letters.forEach((l, i) => { l.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hitLetter(i); }); l.addEventListener('pointerdown', () => hitLetter(i)); });
  $('#roles').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#roles button').forEach(x => x.setAttribute('aria-pressed', x === b)); CITY.setAccent(b.dataset.c);
    document.documentElement.style.setProperty('--acc', b.dataset.c); SND.ui('good');
  });

  /* ── the arcade ── */
  $('#arcade').innerHTML = CABS.map(c => `<button type="button" class="cab${c.file ? '' : ' free'}" data-id="${c.id}" style="--c:${c.c}">
      <span class="cab-sign"><span class="cab-n">${c.n}</span><b>${E(c.name)}</b><i lang="fa" dir="rtl">${E(c.fa)}</i></span>
      <span class="cab-screen"><canvas width="240" height="140" aria-hidden="true"></canvas><span class="cab-lock">${c.file ? 'Encrypted' : 'Free play'}</span></span>
      <span class="cab-foot"><span class="cab-game">▶ ${E(c.game)}</span><span class="cab-how">${E(c.how)}</span></span>
    </button>`).join('');
  $$('.cab').forEach(b => {
    b.addEventListener('click', () => open(b.dataset.id));
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') SND.ui('blip'); });
  });

  // attract-mode screens
  const imgs = {}; const getImg = k => imgs[k] || (imgs[k] = Object.assign(new Image(), { src: IMG[k] }));
  let lastStep = 0; SND.on((t, e) => { if (t === 'step') lastStep = e.step; });
  const ATTR = {
    about(g, w, h, t, c) { for (let i = 0; i < 12; i++) { const l = i % 4, y = ((t * 70 + i * 47) % (h + 20)) - 10; g.fillStyle = ['#22f3ff', '#ff2bd6', '#7dff6a', '#ffe14d'][l]; g.fillRect(20 + l * 52, y, 40, 8); } g.fillStyle = '#fff'; g.fillRect(0, h - 26, w, 2); },
    bazar(g, w, h, t) { g.font = '14px "Share Tech Mono"'; const ch = '01ابپسکپرامپت{}<>'; for (let x = 0; x < 16; x++) for (let k = 0; k < 4; k++) { const y = ((t * (30 + x * 3) + k * 40 + x * 13) % (h + 20)); g.fillStyle = k ? 'rgba(255,201,77,.35)' : '#ffe9a8'; g.fillText(ch[(x * 7 + k + Math.floor(t * 4)) % ch.length], x * 15 + 4, y); } },
    siavash(g, w, h, t, c) { const im = getImg('siaStream'); if (im.complete) g.drawImage(im, 0, 0, w, h); g.fillStyle = 'rgba(30,5,40,.6)'; g.fillRect(0, 0, w, h); const k = (t * .6) % 1; g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20 * k; g.lineTo(30 + u * 180, 110 - Math.sin(u * Math.PI) * 70); } g.stroke(); },
    edu(g, w, h, t, c) { const o = (t * 60) % 60; for (let i = -1; i < 6; i++) { const x = i * 60 - o; g.fillStyle = `hsla(${(i * 40 + 160) % 360},70%,40%,.7)`; g.fillRect(x + 3, 35, 54, 70); g.fillStyle = '#1e1630'; for (let k = 0; k < 3; k++) { g.fillRect(x + 6 + k * 20, 22, 10, 7); g.fillRect(x + 6 + k * 20, 111, 10, 7); } } g.strokeStyle = c; g.lineWidth = 3; g.strokeRect(w / 2 - 14, 14, 28, 112); },
    crew(g, w, h, t) { const on = Math.floor(t * 2.5) % 4, cs = ['#22f3ff', '#ff2bd6', '#ffe14d', '#7dff6a']; for (let i = 0; i < 4; i++) { g.globalAlpha = i === on ? 1 : .25; g.fillStyle = cs[i]; g.fillRect(40 + (i % 2) * 84, 14 + (i >> 1) * 60, 74, 50); } g.globalAlpha = 1; },
    maker(g, w, h, t, c) { g.strokeStyle = '#22f3ff'; g.lineWidth = 2; [[10, 120, 80], [110, 95, 50], [175, 70, 55]].forEach(([x, y, l]) => g.strokeRect(x, y, l, 10)); const k = (t * .5) % 1, x = 20 + k * 200, y = 108 - Math.abs(Math.sin(k * Math.PI * 3)) * 50 - k * 30; g.fillStyle = c; g.fillRect(x, y, 12, 12); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(200, 50, 5, 0, 7); g.fill(); },
    beat(g, w, h, t, c) { const D = SND.drums(), rows = ['t', 'k', 's', 'h']; rows.forEach((r, j) => { for (let i = 0; i < 16; i++) { g.fillStyle = D[r][i] ? (i === lastStep && SND.playing ? '#fff' : c) : 'rgba(255,255,255,.08)'; g.fillRect(8 + i * 14, 20 + j * 26, 11, 18); } }); },
  };
  const cabCv = $$('.cab canvas').map(cv => ({ cv, g: cv.getContext('2d'), c: cab(cv.closest('.cab').dataset.id) }));
  let at = 0;
  (function aloop(ts) {
    if (ts - at > 33 && $('#ov').hidden) {
      at = ts; const t = RM ? 0 : ts / 1000;
      cabCv.forEach(({ cv, g, c }) => { g.clearRect(0, 0, 240, 140); g.save(); ATTR[c.id](g, 240, 140, t, c.c); g.restore(); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 140; y += 3) g.fillRect(0, y, 240, 1); });
    }
    requestAnimationFrame(aloop);
  })(0);

  /* ── overlay: games, files, dossier ── */
  const ov = $('#ov'), body = $('#ovBody'), stat = $('#ovStat');
  let cur = null, cleanup = null, token = 0, lastFocus = null;
  function teardown() { if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; } token++; }
  function frame(c, game) {
    $('#ovPanel').style.setProperty('--c', c ? c.c : '#22f3ff');
    $('#ovKick').textContent = c ? (c.file ? `File ${c.n} · ${game ? c.game : 'decrypted'}` : c.game) : 'All files';
    $('#ovTitle').textContent = c ? c.name : 'Dossier'; stat.textContent = '';
  }
  function open(id, opts = {}) {
    if (!ov.hidden && cur === id && !opts.force) return;
    teardown(); cur = id; if (ov.hidden) { lastFocus = document.activeElement; ov.hidden = false; document.body.classList.add('ov-open'); SND.ui('open'); }
    if (id === 'dossier') return dossier();
    const c = cab(id);
    if (c.file && done(id) && !opts.play) return showFile(id, false);
    frame(c, true); runGame(id, opts);
    requestAnimationFrame(() => $('#ovPanel').focus());
  }
  function close() {
    if (ov.hidden) return; teardown(); cur = null; ov.hidden = true; body.innerHTML = ''; document.body.classList.remove('ov-open'); SND.ui('close');
    hideZoom(); if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (location.hash.startsWith('#lvl=')) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  }
  function runGame(id, opts) {
    body.innerHTML = ''; const host = document.createElement('div'); host.className = 'g-host'; body.append(host);
    const my = ++token, c = cab(id);
    const api = {
      IMG, save: persist,
      stat: t => { if (my === token) stat.textContent = t; },
      win: msg => { if (my !== token) return; teardown(); S.shards[id] = 1; persist(); hud(); SND.ui('win'); CITY.ripple(innerWidth / 2, innerHeight / 2, c.c, 400, true); result(id, true, msg); },
      lose: msg => { if (my !== token) return; teardown(); S.fails[id] = (S.fails[id] || 0) + 1; persist(); SND.ui('glitch'); result(id, false, msg); },
    };
    cleanup = id === 'maker' ? MAKER.mount(host, api, opts.level) : GAMES[id](host, api);
  }
  function result(id, won, msg) {
    const c = cab(id), f = S.fails[id] || 0, BY = !!RULES.bypassEnabled, BN = Math.max(1, +RULES.lossesBeforeBypass || 2);
    body.innerHTML = won
      ? `<div class="res win"><p class="res-k">Access granted</p><h3 class="glitch" data-t="FILE DECRYPTED">FILE DECRYPTED</h3><p>${msg}</p></div>`
      : `<div class="res lose"><p class="res-k">Signal lost</p><h3 class="glitch" data-t="STILL ENCRYPTED">STILL ENCRYPTED</h3><p>${msg}</p>
          <div class="res-act"><button type="button" class="btn-neon" data-a="retry">Try again</button>${BY && f >= BN ? `<button type="button" class="btn-ghost" data-a="bypass">Bypass the lock</button>` : ''}</div>
          ${BY && f < BN ? `<p class="res-hint">Lose ${BN === 1 ? 'once' : BN === 2 ? 'twice' : BN + ' times'} and a bypass appears.</p>` : ''}</div>`;
    stat.textContent = won ? 'DECRYPTED' : `ATTEMPT ${f}`;
    if (won) { const my = token; setTimeout(() => { if (my === token && cur === id) showFile(id, true); }, 1300); }
    else body.querySelector('.res-act').addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'retry') { frame(c, true); runGame(id, {}); }
      if (a === 'bypass') { S.shards[id] = 1; persist(); hud(); SND.ui('glitch'); showFile(id, true); }
    });
  }
  function nextLocked(id) { const i = FILES.findIndex(f => f.id === id); for (let k = 1; k <= FILES.length; k++) { const f = FILES[(i + k) % FILES.length]; if (!done(f.id)) return f; } return null; }
  function showFile(id, fresh) {
    const c = cab(id); frame(c, false); teardown();
    const nx = nextLocked(id);
    body.innerHTML = `${FILE[id]()}<div class="file-foot">
      <button type="button" class="btn-ghost" data-a="replay">Play ${c.game} again</button>
      ${nx ? `<button type="button" class="btn-neon" data-a="next" data-id="${nx.id}">Next: ${nx.name} →</button>` : `<button type="button" class="btn-neon" data-a="dossier">Open the dossier</button>`}</div>`;
    stat.textContent = 'DECRYPTED';
    if (fresh && !RM) scramble($('.file', body));
    body.querySelector('.file-foot').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'replay') open(id, { play: true, force: true });
      if (b.dataset.a === 'next') open(b.dataset.id, { force: true });
      if (b.dataset.a === 'dossier') open('dossier', { force: true });
    });
    body.scrollTop = 0;
  }
  function dossier() {
    frame(null); const n = FILES.filter(f => done(f.id)).length;
    body.innerHTML = `<div class="dos">
      <p class="dos-lede">${n === NF ? 'Every file is decrypted. Here is the whole record.' : `${n} of ${NF} files decrypted. Win the rest to fill in the record.`}</p>
      ${FILES.map(f => done(f.id) ? `<section class="dos-f" style="--c:${f.c}">${FILE[f.id]()}</section>`
        : `<section class="dos-f locked" style="--c:${f.c}"><p class="f-k">File ${f.n} · ${f.name}</p><p class="dos-scr" aria-label="Encrypted">${'█▓▒░ '.repeat(9)}</p><button type="button" class="btn-neon" data-play="${f.id}">Play ${f.game} to decrypt</button></section>`).join('')}
      <div class="file-foot">${n === NF ? '<button type="button" class="btn-neon" data-a="print">Print or save as PDF</button>' : ''}<button type="button" class="btn-ghost" data-a="reset">Lock everything again</button></div></div>`;
    stat.textContent = `${n}/${NF} DECRYPTED`;
    body.querySelector('.dos').addEventListener('click', e => {
      const p = e.target.closest('[data-play]'); if (p) return open(p.dataset.play, { force: true });
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'print') print();
      if (a === 'reset') { S.shards = {}; S.fails = {}; persist(); hud(); dossier(); SND.ui('glitch'); }
    });
    requestAnimationFrame(() => $('#ovPanel').focus());
  }
  $('#ovX').addEventListener('click', close);
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });

  // enlarge screenshots
  const zoom = document.createElement('div'); zoom.id = 'zoom'; zoom.hidden = true; zoom.innerHTML = '<img alt=""><button type="button" class="ov-x" aria-label="Close the image">✕</button>'; document.body.append(zoom);
  function hideZoom() { zoom.hidden = true; }
  body.addEventListener('click', e => { const z = e.target.closest('[data-zoom]'); if (!z) return; const im = $('img', zoom); im.src = z.dataset.zoom; im.alt = $('img', z)?.alt || ''; zoom.hidden = false; SND.ui('open'); });
  zoom.addEventListener('click', hideZoom);

  function scramble(root) {
    const nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const nd = w.currentNode; if (nd.nodeValue.trim() && !nd.parentElement.closest('[lang="fa"]')) nodes.push([nd, nd.nodeValue]); }
    const G = '█▓▒░<>/\\#01', t0 = performance.now(), D = 900;
    (function f(ts) {
      const k = Math.min(1, (ts - t0) / D);
      nodes.forEach(([nd, v]) => { const cut = Math.floor(v.length * k); nd.nodeValue = v.slice(0, cut) + v.slice(cut).replace(/\S/g, () => G[Math.random() * G.length | 0]); });
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ── play along: keys, taps ── */
  const JAM = 'asdfghjkl';
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!zoom.hidden) { hideZoom(); return; } if (!ov.hidden) { close(); return; } }
    if (!ov.hidden || !$('#boot').hidden || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const i = JAM.indexOf(e.key.toLowerCase()); if (i < 0) return;
    hitLetter(i);
  });
  document.addEventListener('pointerdown', e => {
    if (!ov.hidden || !$('#boot').hidden) return;
    if (e.target.closest('button, a, #hud, .hn-l')) return;
    const i = Math.floor(e.clientX / innerWidth * 10);
    SND.note(i, .3); CITY.ripple(e.clientX, e.clientY, ['#22f3ff', '#ff2bd6', '#ffe14d', '#7dff6a'][i % 4], 110, true);
  });

  /* ── boot ── */
  const boot = $('#boot'), log = $('#bootLog');
  const LINES = ['> waking up night city', '> tuning the santur: Shur, Chahargah, Homayoun', `> ${CABS.length} arcade cabinets online`, `> ${NF} files encrypted`, '> one player detected'];
  let li = 0; const typer = setInterval(() => { if (li >= LINES.length) return clearInterval(typer); log.textContent += LINES[li++] + '\n'; }, RM ? 10 : 260);
  function enter(sound) {
    SND.start(); SND.mute(!sound || false); if (!sound) S.muted = true; persist();
    boot.classList.add('out'); setTimeout(() => { boot.hidden = true; }, 600);
    hud(); deck();
    const h = location.hash; if (h.startsWith('#lvl=')) setTimeout(() => open('maker', { level: h.slice(5) }), 500);
  }
  $('#jackIn').addEventListener('click', () => enter(true));
  $('#jackSilent').addEventListener('click', () => enter(false));
  $('#jackIn').focus();

  hud(); deck();
  window.AV = { open, close, state: S, content: C };
};

/* load content.json (written by the admin), fall back to the defaults */
(() => {
  const merge = (a, b) => { if (b === undefined || b === null) return a; if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object') return b; const o = { ...a }; for (const k of Object.keys(b)) o[k] = merge(a[k], b[k]); return o; };
  const go = j => AV_START(merge(JSON.parse(JSON.stringify(window.AV_DEFAULT)), j));
  if (location.protocol === 'file:') return go(null);
  fetch('content.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(go);
})();
