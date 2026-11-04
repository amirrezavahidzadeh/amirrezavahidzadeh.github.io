/* ─────────────────────────────────────────────────────────────
   SND: a tiny procedural cyberpunk soundtrack (WebAudio, no files)
   Three tracks, editable drums, a pumping sidechain, and a
   playable lead that always fits the current chord.
   ───────────────────────────────────────────────────────────── */
window.SND = (() => {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const P = s => [...s].map(c => c === 'x' ? 1 : c === 'X' ? 2 : 0);

  // Three original melodies in traditional Persian modes (dastgah), with koron
  // quarter-tones written as .5 MIDI steps. Melody arrays are indices into
  // the scale, one per 16th step, -1 = rest. Drones replace Western chords.
  const TRACKS = [
    { name: 'SHUR · NIGHT', mode: 'Dastgah-e Shur', bpm: 92, style: 'riz',
      scale: [62, 63.5, 65, 67, 69, 70, 72, 74, 75.5, 77],
      drone: [[50, 57], [50, 57], [48, 55], [50, 57]],
      bass: [38, 38, 36, 38], bassPat: 'x...x.o.x...x.o.',
      mel: [[0, -1, -1, 2, 1, -1, 0, -1, 2, 3, 4, -1, 3, 2, 1, -1],
            [4, -1, 5, 4, 3, -1, 2, -1, 3, 4, 3, 2, 1, -1, -1, -1],
            [7, -1, 6, 5, 4, -1, 4, 5, 4, 3, 2, -1, 3, 2, 3, -1],
            [2, 1, 2, 3, 2, 1, 0, -1, 1, -1, 0, -1, -1, -1, -1, -1]],
      drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '..x...x...x...xx', o: '..............x.', t: 'X..x..x.X..x.xx.' } },
    { name: 'CHAHARGAH RUN', mode: 'Dastgah-e Chahargah', bpm: 108, style: 'mezrab',
      scale: [60, 61.5, 64, 65, 67, 68.5, 71, 72, 73.5, 76],
      drone: [[48, 55], [48, 55], [53, 60], [48, 55]],
      bass: [36, 36, 41, 36], bassPat: 'x..xx..xx.x.x..o',
      mel: [[0, -1, 1, -1, 2, -1, 3, -1, 4, -1, 3, -1, 2, -1, 1, -1],
            [2, -1, 3, -1, 4, -1, 5, -1, 6, -1, 7, -1, 6, -1, 5, -1],
            [4, -1, 5, -1, 4, -1, 3, -1, 2, -1, 3, -1, 2, -1, 1, -1],
            [2, -1, 1, -1, 0, -1, 1, -1, 0, -1, -1, -1, 0, -1, -1, -1]],
      drums: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'x.xxx.xxx.xxx.xx', o: '......x.......x.', t: 'X.x.x.X.x.xX.x.x' } },
    { name: 'HOMAYOUN 2099', mode: 'Dastgah-e Homayoun', bpm: 122, style: 'lead',
      scale: [67, 68.5, 71, 72, 74, 75, 77, 79, 80.5, 83],
      drone: [[43, 50], [43, 50], [48, 55], [43, 50]],
      bass: [31, 31, 36, 31], bassPat: 'xxoxxxoxxxoxxxox',
      mel: [[0, -1, 1, 2, -1, 2, 3, -1, 4, -1, 3, 2, 1, -1, 0, -1],
            [4, -1, 5, 4, -1, 3, 4, -1, 5, 6, 5, 4, 3, -1, 2, -1],
            [7, -1, 6, 5, -1, 6, 5, 4, 3, -1, 4, 5, 4, -1, 3, -1],
            [2, 3, 2, 1, 0, -1, 1, -1, 0, -1, -1, -1, 0, -1, -1, -1]],
      drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'xxxXxxxXxxxXxxxX', o: '..x...x...x...x.', t: '..x...xX..x...xX' } },
  ];
  // live, editable copies of the drum patterns
  const DEF = TRACKS.map(t => Object.fromEntries(Object.entries(t.drums).map(([k, v]) => [k, P(v)])));
  let drums = DEF.map(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.slice()])));
  const parts = { bass: true, arp: true, pad: true, drums: true };

  let ctx = null, out, comp, an, vol, music, sfx, rev, dly, noiseBuf;
  let playing = false, track = 0, step = 0, nextT = 0, timer = 0, muted = false, volume = .8;
  const q = [], fns = [];
  let pulse = 0, spec = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    // phones: bigger audio buffers so the music never crackles when the screen is busy
    try { ctx = new AC({ latencyHint: matchMedia('(pointer: coarse)').matches ? 'playback' : 'interactive' }); } catch (e) { ctx = new AC(); }
    vol = ctx.createGain(); vol.gain.value = muted ? 0 : volume;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .78; spec = new Uint8Array(an.frequencyBinCount);
    vol.connect(comp); comp.connect(an); an.connect(ctx.destination);
    music = ctx.createGain(); music.connect(vol);
    sfx = ctx.createGain(); sfx.gain.value = .7; sfx.connect(vol);
    // reverb from generated noise
    rev = ctx.createConvolver(); const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir; const rg = ctx.createGain(); rg.gain.value = .32; rev.connect(rg); rg.connect(vol);
    // dotted-eighth delay with a dark feedback loop
    dly = ctx.createDelay(1.5); const fb = ctx.createGain(), lp = ctx.createBiquadFilter(), dg = ctx.createGain();
    fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2600; dg.gain.value = .3;
    dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(dg); dg.connect(vol);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setDelay();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  }
  const sd = () => 60 / TRACKS[track].bpm / 4;
  function setDelay() { if (dly) dly.delayTime.setValueAtTime(Math.min(1.4, sd() * 3), ctx.currentTime); }

  /* ── voices ── */
  function env(g, t, a, peak, d, end = .0001) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  function osc(type, f, t, dur, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + .05); return o; }
  function noise(t, dur, dest) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur); return s; }

  function kick(t) {
    const g = ctx.createGain(); g.connect(vol); env(g, t, .002, 1, .38);
    const o = osc('sine', 150, t, .4, g); o.frequency.exponentialRampToValueAtTime(42, t + .13);
    const c = ctx.createGain(); c.connect(vol); env(c, t, .001, .25, .02); osc('square', 900, t, .03, c);
    // sidechain pump on the music bus
    music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(.28, t); music.gain.linearRampToValueAtTime(1, t + sd() * 2.6);
  }
  function snare(t) {
    const g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = .7;
    bp.connect(g); g.connect(vol); g.connect(rev); env(g, t, .001, .55, .22); noise(t, .3, bp);
    const tg = ctx.createGain(); tg.connect(vol); env(tg, t, .001, .35, .09); osc('triangle', 196, t, .12, tg);
  }
  function hat(t, open, acc) {
    const g = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7600;
    hp.connect(g); g.connect(vol); env(g, t, .001, open ? .22 : acc ? .2 : .1, open ? .26 : .035); noise(t, open ? .3 : .06, hp);
  }
  function bass(t, m, dur) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
    lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(track === 2 ? 1400 : 900, t + .015); lp.frequency.exponentialRampToValueAtTime(160, t + dur);
    lp.connect(g); g.connect(music); env(g, t, .004, .34, dur);
    osc('sawtooth', mtof(m), t, dur, lp); const o2 = osc('square', mtof(m), t, dur, lp); o2.detune.value = 9;
  }
  function pluck(t, m, hij) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(hij ? 3800 : 2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + .2);
    lp.connect(g); g.connect(music); g.connect(dly); env(g, t, .002, hij ? .16 : .11, hij ? .32 : .2);
    osc(hij ? 'triangle' : 'square', mtof(m), t, .4, lp);
    if (hij) { const o = osc('sawtooth', mtof(m + 12), t, .2, lp); o.detune.value = 4; }
  }
  // santur-like hammered string: bright partials, fast decay
  function santur(t, m, vel = 1, dest = music) {
    const g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 180;
    bp.connect(g); g.connect(dest); g.connect(dly); env(g, t, .002, .15 * vel, .55);
    const f = mtof(m);
    [[1, 'triangle', 1], [2.003, 'sine', .45], [3.01, 'sine', .18]].forEach(([r, ty, a]) => { const og = ctx.createGain(); og.gain.value = a; og.connect(bp); const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f * r, t); o.detune.value = (Math.random() - .5) * 6; o.connect(og); o.start(t); o.stop(t + .7); });
  }
  // tombak: 'tom' is the deep centre stroke, 'bak' the sharp rim
  function tombak(t, tom) {
    const g = ctx.createGain(); g.connect(vol);
    if (tom) { env(g, t, .002, .5, .26); const o = osc('sine', 150, t, .3, g); o.frequency.exponentialRampToValueAtTime(70, t + .1); }
    else { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 3; bp.connect(g); env(g, t, .001, .35, .06); noise(t, .08, bp); const c = ctx.createGain(); c.connect(vol); env(c, t, .001, .12, .04); osc('sine', 620, t, .06, c); }
  }
  function pad(t, ch, dur) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * .6);
    lp.connect(g); g.connect(music); g.connect(rev);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + .5); g.gain.setValueAtTime(.05, t + dur - .3); g.gain.linearRampToValueAtTime(.0001, t + dur + .4);
    ch.forEach(m => [-8, 8].forEach(dt => { const o = osc('sawtooth', mtof(m), t, dur + .5, lp); o.detune.value = dt; }));
  }
  function lead(m, t = ctx.currentTime, len = .35, dest) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(900, t + len);
    lp.connect(g); g.connect(dest || sfx); g.connect(dly); env(g, t, .005, .2, len);
    const o = osc('sawtooth', mtof(m), t, len + .1, lp); const o2 = osc('square', mtof(m), t, len + .1, lp); o2.detune.value = -12;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = 7; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + len + .1);
  }

  /* ── scheduler ── */
  function playStep(s, t) {
    const T = TRACKS[track], bar = s >> 4, i = s & 15, D = drums[track], d = sd();
    const hit = { k: D.k[i], s: D.s[i], h: D.h[i], o: D.o[i], t: D.t ? D.t[i] : 0 };
    if (parts.drums) { if (hit.k) kick(t); if (hit.s) snare(t); if (hit.o) hat(t, true); else if (hit.h) hat(t, false, hit.h === 2); if (hit.t) tombak(t, hit.t === 2); }
    if (parts.pad && i === 0) pad(t, T.drone[bar], d * 16);
    if (parts.bass) { const c = T.bassPat[i]; if (c !== '.') bass(t, T.bass[bar] + (c === 'o' ? 12 : 0), d * .9); }
    if (parts.arp) {
      const n = T.mel[bar][i], S = T.scale;
      if (n >= 0) {
        const m = S[n];
        if (T.style === 'lead') { lead(m, t, d * 1.6, music); santur(t, m - 12, .7); }
        else santur(t, m, 1);
        // tahrir: a quick grace flick from the note above, the Persian vocal ornament
        if (i % 8 === 4 && n + 1 < S.length) santur(t - .045, S[n + 1], .45);
        // riz: santur tremolo on notes that are held
        if (T.style === 'riz' && T.mel[bar][(i + 1) % 16] === -1 && T.mel[bar][(i + 2) % 16] === -1) for (let k = 1; k < 6; k++) santur(t + k * d * .5, m, .55 - k * .07);
      } else if (T.style === 'mezrab' && i % 2) santur(t, S[0] + (bar === 2 ? 5 : 0), .35);
    }
    q.push({ t, step: i, bar, hit });
  }
  function sched() {
    while (nextT < ctx.currentTime + .14) { playStep(step, nextT); nextT += sd(); step = (step + 1) % 64; }
  }
  function start() {
    init(); ctx.resume();
    if (playing) return; playing = true; step = 0; nextT = ctx.currentTime + .08;
    clearInterval(timer); timer = setInterval(sched, 25); sched(); emit('state');
  }
  function stop() { playing = false; clearInterval(timer); q.length = 0; if (music) { music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setValueAtTime(1, ctx.currentTime); } emit('state'); }

  // called every animation frame by the page
  function tick() {
    if (!ctx) return;
    const now = ctx.currentTime;
    while (q.length && q[0].t <= now) { const e = q.shift(); if (e.hit.k) pulse = 1; emit('step', e); }
    pulse *= .9;
    an.getByteFrequencyData(spec);
  }
  function emit(type, e) { fns.forEach(f => f(type, e)); }

  /* ── public ── */
  const scaleNote = i => { const S = TRACKS[track].scale; return S[((i % S.length) + S.length) % S.length] + 12 * Math.floor(i / S.length); };
  function ui(kind) {
    if (!ctx) return; const t = ctx.currentTime;
    const g = ctx.createGain(); g.connect(sfx);
    if (kind === 'blip') { env(g, t, .002, .08, .06); osc('square', 1320, t, .08, g); }
    else if (kind === 'tick') { env(g, t, .001, .05, .03); osc('square', 2200, t, .04, g); }
    else if (kind === 'open') { env(g, t, .004, .12, .25); const o = osc('sawtooth', 220, t, .3, g); o.frequency.exponentialRampToValueAtTime(880, t + .2); }
    else if (kind === 'close') { env(g, t, .004, .1, .2); const o = osc('sawtooth', 660, t, .25, g); o.frequency.exponentialRampToValueAtTime(160, t + .2); }
    else if (kind === 'bad') { env(g, t, .002, .14, .22); const o = osc('sawtooth', 140, t, .25, g); o.frequency.linearRampToValueAtTime(70, t + .2); noise(t, .12, g); }
    else if (kind === 'good') { [4, 5, 7].forEach((n, j) => santur(t + j * .06, scaleNote(n), .9, sfx)); }
    else if (kind === 'win') { [0, 1, 2, 3, 4, 7].forEach((n, j) => { santur(t + j * .08, scaleNote(n), 1, sfx); if (j === 5) lead(scaleNote(n), t + j * .08, .5); }); }
    else if (kind === 'glitch') { env(g, t, .001, .1, .12); noise(t, .14, g); const o = osc('square', 80 + Math.random() * 400, t, .12, g); o.frequency.setValueAtTime(30 + Math.random() * 900, t + .05); }
    else if (kind === 'shoot') { env(g, t, .002, .12, .18); noise(t, .2, g); }
  }

  return {
    TRACKS, parts,
    start, stop, tick,
    toggle() { playing ? stop() : start(); },
    get playing() { return playing; }, get ready() { return !!ctx; },
    get track() { return track; },
    setTrack(i) { track = (i + TRACKS.length) % TRACKS.length; if (ctx) setDelay(); emit('track'); },
    get bpm() { return TRACKS[track].bpm; },
    stepDur: sd,
    now: () => ctx ? ctx.currentTime : performance.now() / 1000,
    // next time a bar starts (or soon, if the music is paused)
    nextBar() { if (!ctx) return 0; if (!playing) return ctx.currentTime + .6; let s = step, t = nextT; while (s % 16) { s++; t += sd(); } return t; },
    drums: () => drums[track],
    resetDrums() { drums[track] = Object.fromEntries(Object.entries(DEF[track]).map(([k, v]) => [k, v.slice()])); emit('track'); },
    loadDrums(saved) { if (Array.isArray(saved)) saved.forEach((d, i) => { if (d && drums[i]) Object.keys(drums[i]).forEach(k => { if (Array.isArray(d[k]) && d[k].length === 16) drums[i][k] = d[k].map(v => +v || 0); }); }); },
    allDrums: () => drums,
    note(i, len) { if (!ctx) return; const t = ctx.currentTime, m = scaleNote(i); santur(t, m, 1.1, sfx); lead(m, t, (len || .35) * .7); },
    ui,
    get muted() { return muted; },
    mute(m) { muted = m; if (vol) vol.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, .03); emit('state'); },
    get pulse() { return pulse; },
    spectrum: () => spec,
    on(f) { fns.push(f); },
  };
})();
