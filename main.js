/* ─────────────────────────────────────────────────────────────
   MAIN: boot, HUD and deck, the arcade, files, dossier, jamming.
   Everything visible comes from content (content.js defaults,
   overridden by content.json written by the admin page).
   ───────────────────────────────────────────────────────────── */
window.AV_START = (C) => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const F = C.files, RULES = C.rules;
  const IMG = { siaStream: F.siavash.gameBackdrop || ((F.siavash.features || [])[0] || {}).image || F.siavash.hero || '' };
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
  const LOCKED = ['about', 'bazar', 'siavash', 'edu', 'writer', 'crew', 'chess'];
  const CABS = C.cabinets.filter(c => !c.hidden && (LOCKED.includes(c.id) || c.id === 'maker' || c.id === 'beat'))
    .map((c, i) => ({ ...c, n: String(i + 1).padStart(2, '0'), c: c.color, file: LOCKED.includes(c.id) }));
  const FILES = CABS.filter(c => c.file), NF = FILES.length;
  const cab = id => CABS.find(c => c.id === id);
  const done = id => !!S.shards[id];
  const kick = (id, k) => `<p class="f-k">${String(FILES.findIndex(f => f.id === id) + 1).padStart(2, '0')} · ${E(k)}</p>`;
  const fa = t => t ? `<span lang="fa" dir="rtl">${E(t)}</span>` : '';
  // fix links typed without a scheme: bare emails become mailto:, bare domains become https://
  const link = u => { u = String(u || '').trim(); if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; if (/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(u)) return 'mailto:' + u; if (/^\+?[\d\s()-]{7,}$/.test(u)) return 'tel:' + u.replace(/[^\d+]/g, ''); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith('/') && !u.startsWith('#')) return 'https://' + u; return u; };
  const more = l => l ? `<p><a class="f-link" href="${E(link(l))}" target="_blank" rel="noopener">Open ↗</a></p>` : '';

  /* ── story: one chapter per file ── */
  const ST = C.story || { chapters: {} };
  const chapN = id => FILES.findIndex(f => f.id === id) + 1;
  const chap = id => { const x = (ST.chapters || {})[id]; return x && x.text ? `<div class="chapter"><p class="ch-k">Chapter ${chapN(id)} of ${NF}${x.title ? ` · ${E(x.title)}` : ''}</p><p class="ch-t">${E(x.text)}</p></div>` : ''; };
  // live chess.com rating, falling back to the number set in the admin
  function hydrate(root) {
    root.querySelectorAll('[data-chess]').forEach(el => {
      const h = el.dataset.chess; if (!h) return;
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(h.toLowerCase())}/stats`).then(r => r.ok ? r.json() : null).then(j => {
        const r = j && j.chess_rapid; if (!r || !r.last) return;
        const v = el.querySelector('.cz-num'); if (v) v.textContent = r.last.rating;
        const b = el.querySelector('.cz-best'); if (b && r.best) { b.textContent = `Best ${r.best.rating}`; b.hidden = false; }
        const l = el.querySelector('.cz-live'); if (l) l.hidden = false;
      }).catch(() => { });
    });
  }

  /* ── file contents ── */
  const FILE = {
    about: () => { const d = F.about; return `<div class="file f-about">${kick('about', d.kicker)}
      <h3>${E(d.title)}</h3>${d.fa ? `<p class="f-fa" lang="fa" dir="rtl">${E(d.fa)}</p>` : ''}
      <dl class="f-stats">${d.stats.map(x => `<div><dt>${E(x.label)}</dt><dd>${E(x.value)}</dd></div>`).join('')}</dl></div>`; },
    bazar: () => { const d = F.bazar; return `<div class="file f-pb">
      ${d.hero ? `<button type="button" class="f-cover" data-zoom="${E(d.hero)}" aria-label="Enlarge: ${E(d.heroAlt)}"><img src="${E(d.hero)}" alt="${E(d.heroAlt)}"></button>` : ''}
      <header class="f-head">${kick('bazar', d.kicker)}<h3>${E(d.title)} ${fa(d.fa)}</h3>${d.role ? `<p class="f-role">${E(d.role)}</p>` : ''}</header>
      <p class="f-lede">${E(d.lede)}</p>${d.body ? `<p class="f-body">${E(d.body)}</p>` : ''}
      ${(d.features || []).length ? `<ul class="f-feats">${d.features.map(x => `<li><b>${E(x.title)}</b><span>${E(x.text)}</span></li>`).join('')}</ul>` : ''}
      ${(d.shots || []).length ? `<div class="f-pair">${d.shots.map(x => `<figure><button type="button" data-zoom="${E(x.image)}" aria-label="Enlarge: ${E(x.caption)}"><img src="${E(x.image)}" alt="${E(x.caption)}" loading="lazy"></button><figcaption>${E(x.caption)}</figcaption></figure>`).join('')}</div>` : ''}
      ${d.footnote ? `<p class="f-tech">${E(d.footnote)}</p>` : ''}${more(d.link)}</div>`; },
    siavash: () => { const d = F.siavash; return `<div class="file f-sia2">
      ${d.hero ? `<button type="button" class="f-cover" data-zoom="${E(d.hero)}" aria-label="Enlarge: ${E(d.heroAlt)}"><img src="${E(d.hero)}" alt="${E(d.heroAlt)}"></button>` : ''}
      <header class="f-head">${kick('siavash', d.kicker)}<h3>${E(d.title)} ${fa(d.fa)}</h3>${d.tagline ? `<p class="f-role">${E(d.tagline)}</p>` : ''}</header>
      <p class="f-lede">${E(d.lede)}</p>
      ${(d.features || []).length ? `<div class="f-rows">${d.features.map((x, i) => `<article class="f-row${i % 2 ? ' flip' : ''}">${x.image ? `<button type="button" data-zoom="${E(x.image)}" aria-label="Enlarge: ${E(x.title)}"><img src="${E(x.image)}" alt="${E(x.title)}" loading="lazy"></button>` : ''}<div><p class="f-n">${String(i + 1).padStart(2, '0')}</p><h4>${E(x.title)}</h4><p>${E(x.text)}</p></div></article>`).join('')}</div>` : ''}
      ${d.footnote ? `<p class="f-tech">${E(d.footnote)}</p>` : ''}${more(d.link)}</div>`; },
    edu: () => { const d = F.edu; return `<div class="file f-edu">${kick('edu', d.kicker)}
      <div class="f-badges">${d.badges.map(x => `<div class="f-badge${x.highlight ? ' hl' : ''}">${x.logo ? `<img src="${E(x.logo)}" alt="${E(x.logoAlt)}">` : ''}<div><p class="f-k2">${E(x.small)}</p><h3>${E(x.big)}</h3><p>${E(x.line)}</p></div></div>`).join('')}</div></div>`; },
    writer: () => { const d = F.writer; return `<div class="file f-writer">${kick('writer', d.kicker)}
      <h3>${E(d.title)} ${fa(d.fa)}</h3>
      <p class="f-lede">${E(d.lede)}</p>
      ${(d.genres || []).length ? `<ul class="f-genres">${d.genres.map(g => `<li>${E(g)}</li>`).join('')}</ul>` : ''}
      ${(d.credits || []).length ? `<ul class="f-quill">${d.credits.map(x => `<li><b>${E(x.where)}</b><span>${E(x.role)}</span></li>`).join('')}</ul>` : ''}</div>`; },
    chess: () => { const d = F.chess; return `<div class="file f-chess" data-chess="${E(d.handle)}">${kick('chess', d.kicker)}
      <div class="cz">
        <div class="cz-card"><p class="cz-fmt">${E(d.format)} · chess.com</p><p class="cz-num">${E(d.rating)}</p><p class="cz-sub"><span class="cz-live" hidden>● live rating</span> <span class="cz-best" hidden></span></p></div>
        <div class="cz-main"><h3>${E(d.title)}</h3><p class="cz-handle">@${E(d.handle)}</p><p class="f-lede">${E(d.lede)}</p>
          ${d.profile ? `<a class="btn-neon cz-cta" href="${E(link(d.profile))}" target="_blank" rel="noopener">${E(d.cta || 'Profile')} ↗</a>` : ''}</div>
      </div></div>`; },
    crew: () => { const d = F.crew; return `<div class="file f-crew">${kick('crew', d.kicker)}
      <ul class="f-roles">${d.roles.map(x => `<li><span class="f-clap" aria-hidden="true"></span><div><b>${E(x.role)}</b><span>${E(x.where)}</span></div></li>`).join('')}</ul></div>`; },
  };
  /* ── HUD + deck ── */
  const gems = $('#gems'), shardN = $('#shardN');
  function hud() {
    const n = FILES.filter(f => done(f.id)).length;
    shardN.textContent = n; $('#shardT').textContent = NF; $$('.r-play').forEach(b => { $('.r-won', b).hidden = !done(b.dataset.id); }); gems.innerHTML = FILES.map(f => `<i class="${done(f.id) ? 'on' : ''}" style="--c:${f.c}"></i>`).join('');

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
    const bits = [`♪ Now playing: ${T.name} · ${T.mode} · ${T.bpm} BPM`, 'Original melodies in the Persian modes, played on synth santur', `${n}/${NF} games won`, 'Tap anywhere to play a note', 'Press A to L to jam', 'Build a level and send it as a link', 'Rewrite the drums in the Beat Lab', 'Night city, Tehran, 2099'];
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
  let lix = 0;
  heroName.innerHTML = [C.hero.nameLine1, C.hero.nameLine2].filter(Boolean).map(w => `<span class="hn-w">${[...w].map(ch => `<span class="hn-l" aria-hidden="true" style="--i:${lix++}">${E(ch)}</span>`).join('')}</span>`).join(' ');
  $('.hero-k').firstChild.textContent = C.hero.kicker + ' ';
  $('.hero-fa').textContent = C.hero.fa;
  $('#roles').innerHTML = C.hero.roles.map(r => `<li><button type="button" data-c="${E(r.color)}" style="--c:${E(r.color)}">${E(r.label)}</button></li>`).join('');
  $('.hero-play').textContent = C.hero.hint;
  { const hs = $('.hero-story'); if (hs) { if (ST.prologue) hs.textContent = ST.prologue; else hs.remove(); } }
  $('#arcade').insertAdjacentHTML('afterend', `<section class="contact" aria-label="About me"><h2>Transmit</h2><ul><li><a href="about/">About me · Contact</a></li></ul></section>`);
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

  // pause the hero's animations when it is off screen
  if ('IntersectionObserver' in window) new IntersectionObserver(es => document.body.classList.toggle('hero-off', !es[0].isIntersecting)).observe($('.hero'));

  /* ── the arcade ── */
  // the résumé: every file is a full section you reach by scrolling; its game is an optional extra
  const playBtn = c => `<button type="button" class="r-play cab" data-id="${c.id}" style="--c:${c.c}">
      <span class="cab-screen"><canvas width="240" height="140" aria-hidden="true"></canvas></span>
      <span class="r-play-t"><b>▶ Play ${E(c.game)}</b><span>${E(c.how)}</span><i class="r-won" hidden>✓ Won</i></span></button>`;
  $('#resume').innerHTML = FILES.map(c => `<article class="rsec" id="sec-${c.id}" style="--c:${c.c}" aria-label="${E(c.name)}">
      <div class="rsec-in"><div class="rsec-body">${FILE[c.id]()}</div>
      <footer class="rsec-foot"><span class="rsec-or">Optional</span>${playBtn(c)}</footer></div>
    </article>`).join('');
  hydrate($('#resume'));
  const FREE = CABS.filter(c => !c.file);
  $('#arcade').innerHTML = FREE.map(c => `<button type="button" class="cab free" data-id="${c.id}" style="--c:${c.c}">
      <span class="cab-sign"><b>${E(c.name)}</b><i lang="fa" dir="rtl">${E(c.fa)}</i></span>
      <span class="cab-screen"><canvas width="240" height="140" aria-hidden="true"></canvas><span class="cab-lock">Free play</span></span>
      <span class="cab-foot"><span class="cab-game">▶ ${E(c.game)}</span><span class="cab-how">${E(c.how)}</span></span>
    </button>`).join('');
  if (!FREE.length) { $('#arcade').remove(); $('.arc-h') && $('.arc-h').remove(); }
  $$('.cab').forEach(b => {
    b.addEventListener('click', () => open(b.dataset.id, { play: true }));
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') SND.ui('blip'); });
  });
  // sections slide in as you scroll to them
  // each section arrives with its own transition (CRT boot, typed page, bazaar doors, unrolling manuscript, film strip, clapperboard, rising from lava)
  $$('.rsec').forEach(sec => {
    sec.dataset.fx = sec.id.slice(4); $('.rsec-in', sec).insertAdjacentHTML('afterbegin', '<span class="rfx" aria-hidden="true"></span>');
    $$('.f-stats > div, .f-feats li, .f-pair figure, .f-row, .f-badge, .f-quill li, .f-roles li, .f-genres li, .cz-card, .cz-main, .rsec-foot', sec).forEach(el => el.classList.add('stg'));
  });
  $('#resume').addEventListener('click', e => { const z = e.target.closest('[data-zoom]'); if (z) { const im = $('img', zoom); im.src = z.dataset.zoom; im.alt = $('img', z)?.alt || ''; zoom.hidden = false; SND.ui('open'); } });

  // attract-mode screens
  const imgs = {}; const getImg = k => imgs[k] || (imgs[k] = Object.assign(new Image(), { src: IMG[k] }));
  let lastStep = 0; SND.on((t, e) => { if (t === 'step') lastStep = e.step; });
  const ATTR = {
    about(g, w, h, t, c) { for (let i = 0; i < 12; i++) { const l = i % 4, y = ((t * 70 + i * 47) % (h + 20)) - 10; g.fillStyle = ['#22f3ff', '#ff2bd6', '#7dff6a', '#ffe14d'][l]; g.fillRect(20 + l * 52, y, 40, 8); } g.fillStyle = '#fff'; g.fillRect(0, h - 26, w, 2); },
    bazar(g, w, h, t) { g.font = '14px "Share Tech Mono"'; const ch = '01ابپسکپرامپت{}<>'; for (let x = 0; x < 16; x++) for (let k = 0; k < 4; k++) { const y = ((t * (30 + x * 3) + k * 40 + x * 13) % (h + 20)); g.fillStyle = k ? 'rgba(255,201,77,.35)' : '#ffe9a8'; g.fillText(ch[(x * 7 + k + Math.floor(t * 4)) % ch.length], x * 15 + 4, y); } },
    siavash(g, w, h, t, c) { const im = getImg('siaStream'); if (im.complete) g.drawImage(im, 0, 0, w, h); g.fillStyle = 'rgba(30,5,40,.6)'; g.fillRect(0, 0, w, h); const k = (t * .6) % 1; g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20 * k; g.lineTo(30 + u * 180, 110 - Math.sin(u * Math.PI) * 70); } g.stroke(); },
    edu(g, w, h, t, c) { const o = (t * 60) % 60; for (let i = -1; i < 6; i++) { const x = i * 60 - o; g.fillStyle = `hsla(${(i * 40 + 160) % 360},70%,40%,.7)`; g.fillRect(x + 3, 35, 54, 70); g.fillStyle = '#1e1630'; for (let k = 0; k < 3; k++) { g.fillRect(x + 6 + k * 20, 22, 10, 7); g.fillRect(x + 6 + k * 20, 111, 10, 7); } } g.strokeStyle = c; g.lineWidth = 3; g.strokeRect(w / 2 - 14, 14, 28, 112); },
    crew(g, w, h, t) { const on = Math.floor(t * 2.5) % 4, cs = ['#22f3ff', '#ff2bd6', '#ffe14d', '#7dff6a']; for (let i = 0; i < 4; i++) { g.globalAlpha = i === on ? 1 : .25; g.fillStyle = cs[i]; g.fillRect(40 + (i % 2) * 84, 14 + (i >> 1) * 60, 74, 50); } g.globalAlpha = 1; },
    writer(g, w, h, t, c) { g.font = '13px "Share Tech Mono"'; const lines = ['INT. TAXI - NIGHT', 'He checks the mirror.', 'PASSENGER (O.S.)', 'Keep driving.', 'The tape clicks.', 'FADE OUT.']; const k = (t * 9) % 140; lines.forEach((l, i) => { const n = Math.max(0, Math.min(l.length, Math.floor(k - i * 22))); g.fillStyle = i % 2 ? 'rgba(200,210,255,.75)' : c; g.fillText(l.slice(0, n), 18, 24 + i * 19); }); if (Math.floor(t * 2) % 2) { g.fillStyle = c; g.fillRect(18, 128, 8, 3); } },
    chess(g, w, h, t) { for (let i = 0; i < 6; i++) { const x = 120 + Math.sin(t * .5 + i * 1.7) * 90, y = 70 + Math.cos(t * .4 + i * 2.3) * 40, r = 40 + 14 * Math.sin(t + i); const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,190,60,.9)'); gr.addColorStop(.5, 'rgba(255,70,20,.55)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) { if ((r + q) % 2) continue; g.fillStyle = 'rgba(10,6,6,.82)'; g.fillRect(24 + q * 24, 22 + r * 24, 24, 24); } g.font = '20px serif'; g.fillStyle = '#fff1d6'; g.fillText('\u265A\uFE0E', 30 + (Math.floor(t) % 8) * 24, 40 + (Math.floor(t / 8) % 4) * 24); },
    maker(g, w, h, t, c) { g.strokeStyle = '#22f3ff'; g.lineWidth = 2; [[10, 120, 80], [110, 95, 50], [175, 70, 55]].forEach(([x, y, l]) => g.strokeRect(x, y, l, 10)); const k = (t * .5) % 1, x = 20 + k * 200, y = 108 - Math.abs(Math.sin(k * Math.PI * 3)) * 50 - k * 30; g.fillStyle = c; g.fillRect(x, y, 12, 12); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(200, 50, 5, 0, 7); g.fill(); },
    beat(g, w, h, t, c) { const D = SND.drums(), rows = ['t', 'k', 's', 'h']; rows.forEach((r, j) => { for (let i = 0; i < 16; i++) { g.fillStyle = D[r][i] ? (i === lastStep && SND.playing ? '#fff' : c) : 'rgba(255,255,255,.08)'; g.fillRect(8 + i * 14, 20 + j * 26, 11, 18); } }); },
  };
  const cabCv = $$('.cab canvas').map(cv => ({ cv, g: cv.getContext('2d'), c: cab(cv.closest('.cab').dataset.id) }));
  let at = 0;
  // only animate cabinet screens that are on screen; phones get 20 fps attract mode
  const LOWA = matchMedia('(pointer: coarse)').matches || innerWidth < 760, seen = new Set();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))) : null;
  cabCv.forEach(x => io ? io.observe(x.cv) : seen.add(x.cv));
  (function aloop(ts) {
    if (ts - at > (LOWA ? 50 : 33) && $('#ov').hidden && seen.size) {
      at = ts; const t = RM ? 0 : ts / 1000;
      cabCv.forEach(({ cv, g, c }) => { if (!seen.has(cv)) return; g.clearRect(0, 0, 240, 140); g.save(); ATTR[c.id](g, 240, 140, t, c.c); g.restore(); g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 140; y += 3) g.fillRect(0, y, 240, 1); });
    }
    requestAnimationFrame(aloop);
  })(0);

  /* ── overlay: games, files, dossier ── */
  const ov = $('#ov'), body = $('#ovBody'), stat = $('#ovStat');
  let cur = null, cleanup = null, token = 0, lastFocus = null;
  function teardown() { if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; } token++; }
  const skipBtn = $('#ovSkip');
  function frame(c, game) {
    skipBtn.hidden = true;
    $('#ovPanel').style.setProperty('--c', c ? c.c : '#22f3ff');
    $('#ovKick').textContent = c ? (c.file ? `File ${c.n} · ${game ? c.game : 'decrypted'}` : c.game) : 'All files';
    $('#ovTitle').textContent = c ? c.name : 'Dossier'; stat.textContent = '';
  }
  function open(id, opts = {}) {
    if (!ov.hidden && cur === id && !opts.force) return;
    teardown(); cur = id; if (ov.hidden) { lastFocus = document.activeElement; ov.hidden = false; document.body.classList.add('ov-open'); SND.ui('open'); }
    if (id === 'dossier') return dossier();
    const c = cab(id);
    if (c.file && !opts.play) { close(); const sec = $('#sec-' + id); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
      ? `<div class="res win"><p class="res-k">${E(c.game)}</p><h3 class="glitch" data-t="YOU WIN">YOU WIN</h3><p>${msg}</p></div>`
      : `<div class="res lose"><p class="res-k">${E(c.game)}</p><h3 class="glitch" data-t="GAME OVER">GAME OVER</h3><p>${msg}</p>
          <div class="res-act"><button type="button" class="btn-neon" data-a="retry">Try again</button><button type="button" class="btn-ghost" data-a="close">Back to the résumé</button></div></div>`;
    stat.textContent = won ? 'WON' : `ATTEMPT ${f}`;
    if (won) { const my = token; setTimeout(() => { if (my === token && cur === id) { close(); const sec = $('#sec-' + id); if (sec) sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); } }, 1500); }
    else body.querySelector('.res-act').addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'retry') { frame(c, true); runGame(id, {}); }
      if (a === 'close') close();
    });
  }
  function nextLocked(id) { const i = FILES.findIndex(f => f.id === id); for (let k = 1; k <= FILES.length; k++) { const f = FILES[(i + k) % FILES.length]; if (!done(f.id)) return f; } return null; }
  function showFile(id, fresh) {
    const c = cab(id); frame(c, false); teardown();
    const nx = nextLocked(id);
    const all = FILES.every(f => done(f.id));
    body.innerHTML = `${chap(id)}${FILE[id]()}${all && fresh && ST.epilogue ? `<div class="chapter epi"><p class="ch-k">Epilogue</p><p class="ch-t">${E(ST.epilogue)}</p><a class="btn-neon" href="about/">Write to him →</a></div>` : ''}<div class="file-foot">
      <button type="button" class="btn-ghost" data-a="replay">Play ${c.game} again</button>
      ${nx ? `<button type="button" class="btn-neon" data-a="next" data-id="${nx.id}">Next: ${nx.name} →</button>` : `<button type="button" class="btn-neon" data-a="dossier">Open the dossier</button>`}</div>`;
    stat.textContent = 'DECRYPTED';
    if (fresh && !RM) scramble($('.file', body));
    hydrate(body);
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
    $('#ovKick').textContent = 'Print view'; $('#ovTitle').textContent = 'Résumé';
    body.innerHTML = `<div class="dos">
      <p class="dos-lede">The whole résumé on one page, ready to print.</p>
      ${n === NF && ST.epilogue ? `<div class="chapter epi"><p class="ch-k">Epilogue</p><p class="ch-t">${E(ST.epilogue)}</p><a class="btn-neon" href="about/">Write to him →</a></div>` : ST.prologue ? `<div class="chapter"><p class="ch-k">Prologue</p><p class="ch-t">${E(ST.prologue)}</p></div>` : ''}
      ${FILES.map(f => `<section class="dos-f" style="--c:${f.c}">${FILE[f.id]()}</section>`).join('')}
      <div class="file-foot"><button type="button" class="btn-neon" data-a="print">Print or save as PDF</button></div></div>`;
    stat.textContent = ''; hydrate(body);
    body.querySelector('.dos').addEventListener('click', e => {
      const p = e.target.closest('[data-play]'); if (p) return open(p.dataset.play, { force: true });
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'print') print();
      if (a === 'reset') { S.shards = {}; S.fails = {}; persist(); hud(); dossier(); SND.ui('glitch'); }
    });
    requestAnimationFrame(() => $('#ovPanel').focus());
  }
  $('#ovX').addEventListener('click', close);
  skipBtn.addEventListener('click', () => { if (!cur || !cab(cur) || !cab(cur).file) return; const id = cur; teardown(); S.shards[id] = 1; persist(); hud(); SND.ui('glitch'); showFile(id, true); });
  // no time? open every file at once

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
  const LINES = ['> waking up night city', '> tuning the santur: Shur, Chahargah, Homayoun', `> ${CABS.length} arcade cabinets online`, `> ${NF} chapters of a résumé`, '> one player detected'];
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
