/* ─────────────────────────────────────────────────────────────
   CORRIDOR: walk down a neon Persian arcade (three.js).
   Scroll, drag or tilt your phone to move. Every résumé section hangs
   on the wall as a glowing frame that paints itself in as you approach;
   click it to open. At the end of the hall, the Tehran skyline.
   ───────────────────────────────────────────────────────────── */
(() => {
  const start = () => {
    const T = window.THREE; if (!T || !window.AV || !AV.files) return setTimeout(start, 80);
    const $ = s => document.querySelector(s);
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
    const C = AV.content, FILES = AV.files, CABS = AV.cabs;
    const FREE = CABS.filter(c => !c.file);
    // the last stop of the hall is not a résumé section: it's the atomic button (see "the atomic button" below)
    const ATOM = { id: 'atomic', name: 'Atomic Button', fa: 'دکمه‌ی اتمی', c: '#ff2a2a', atomic: true };
    const ROOMS = [...FILES, ...FREE, ATOM];
    let nukeLook = 'armed';   // what the button's panel shows: 'armed' or 'rebuild'

    // ── renderer ──
    const cv = document.getElementById('corridor');
    let R;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: !MOBILE, powerPreference: 'high-performance' }); }
    catch (e) { document.body.classList.remove('corridor'); const vt = document.getElementById('viewToggle'); if (vt) vt.hidden = true; return; }
    // phones start sharp (up to 2x) and only step down if the frame rate actually suffers (see the loop)
    let PR = Math.min(devicePixelRatio || 1, MOBILE ? 2 : 1.6);
    R.setPixelRatio(PR);
    R.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    scene.background = new T.Color(0x05010c);
    scene.fog = new T.FogExp2(0x0a0318, .045);
    const cam = new T.PerspectiveCamera(MOBILE ? 72 : 62, innerWidth / innerHeight, .25, 220);

    // ── layout ──
    const W = 7, Hh = 4.6, GAP = 10, START = 6;
    const zOf = i => -(START + i * GAP);
    // the hall is a loop: after the last room it repeats from the first, so the end looks exactly like the start
    const LOOP = GAP * ROOMS.length;
    const END = 8 - LOOP - 70;                  // geometry runs this far so the repeat is fully built
    const zMid = (12 + END) / 2, zLen = 12 - END;
    const glowMat = c => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false, fog: true });

    // floor: neon grid generated in the shader, so it stays crisp at any distance
    const floorMat = new T.ShaderMaterial({
      transparent: false, fog: true,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 }, uPulse: { value: 0 } }]),
      vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
        void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: `uniform float uTime; uniform float uPulse; varying vec3 vW;
#include <fog_pars_fragment>
        float line(float v, float w){ float d = abs(fract(v) - .5); return smoothstep(.5 - w, .5, d); }
        void main(){
          vec2 g = vW.xz / 1.4;
          float l = max(line(g.x, .035), line(g.y + uTime * .25, .035));
          vec3 base = vec3(.03,.01,.07);
          vec3 neon = mix(vec3(.13,.95,1.), vec3(1.,.17,.84), .5 + .5 * sin(vW.z * .08 + uTime * .3));
          vec3 col = base + neon * l * (.55 + uPulse * .45);
          float centre = 1. - smoothstep(.0, 3.4, abs(vW.x));
          col += vec3(.5,.1,.6) * centre * .06;
          gl_FragColor = vec4(col, 1.);
#include <fog_fragment>
        }`,
    });
    const floor = new T.Mesh(new T.PlaneGeometry(W, zLen), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid); scene.add(floor);
    const ceil = new T.Mesh(new T.PlaneGeometry(W, zLen), new T.MeshBasicMaterial({ color: 0x06020d }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, Hh, zMid); scene.add(ceil);
    // the walls: a hand-built Tehran panorama in neon line-art, one full panorama per lap on each wall
    const wallBack = new T.MeshBasicMaterial({ color: 0x0b0418 });
    [-1, 1].forEach(sd => { const w = new T.Mesh(new T.PlaneGeometry(zLen, Hh), wallBack); w.rotation.y = -sd * Math.PI / 2; w.position.set(sd * (W / 2 + .5), Hh / 2, zMid); scene.add(w); });   // well behind the art: phones with a coarse depth buffer let a plane 2 cm behind bleed through it
    // the wall tiles start dark and are painted a few at a time once the page is up (see "textures" below)
    const wallTiles = TEHRAN_WALL.build(T, { scene, LOOP, Hh, W, zFrom: 12, zTo: END, mobile: MOBILE, rooms: ROOMS.length, start: 8 + START });
    // a dark band at the foot and head of each wall, so the frames and neon tubes still read
    const bandMat = new T.MeshBasicMaterial({ color: 0x07020f });
    [-1, 1].forEach(sd => [[.18, .09], [Hh - .12, .24]].forEach(([y, h]) => { const b = new T.Mesh(new T.PlaneGeometry(zLen, h), bandMat); b.rotation.y = -sd * Math.PI / 2; b.position.set(sd * (W / 2 - .01), y, zMid); scene.add(b); }));

    // neon tubes running the length of the hall
    const tube = (pts, r, c) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.max(8, pts.length * 6), r, 6, false), glowMat(c));
    const len = [new T.Vector3(0, 0, 12), new T.Vector3(0, 0, END)];
    [[-W / 2 + .02, .03, 0x22f3ff], [W / 2 - .02, .03, 0xff2bd6], [-W / 2 + .02, Hh - .05, 0xb06bff], [W / 2 - .02, Hh - .05, 0xb06bff]].forEach(([x, y, c]) => scene.add(tube(len.map(v => new T.Vector3(x, y, v.z)), .025, c)));

    // Persian pointed arches (an ogee) every few metres, like a neon bazaar
    // a Persian pointed arch: straight legs, two arcs meeting in a point, and a small ogee tip
    function archPts(w, h, spring) {
      const hw = w / 2, e = hw * .28, r = hw + e, pts = [];
      for (let i = 0; i <= 6; i++) pts.push(new T.Vector3(-hw, spring * i / 6, 0));
      const th0 = Math.PI, th1 = Math.acos(-e / r);
      for (let i = 1; i <= 22; i++) { const th = th0 + (th1 - th0) * i / 22; pts.push(new T.Vector3(e + r * Math.cos(th), spring + r * Math.sin(th) * ((h - spring) / (r * Math.sin(th1))), 0)); }
      pts.push(new T.Vector3(0, h + .22, 0));
      const right = pts.slice(0, -1).reverse().map(p => new T.Vector3(-p.x, p.y, 0));
      return [...pts, ...right];
    }
    const archShape = archPts(W - .5, Hh - .5, Hh * .45);
    const archColors = [0x22f3ff, 0xff2bd6, 0xffc94d, 0x7dff6a, 0xb06bff];
    const arches = [];
    // every 5 m from z = 2: with frames every 10 m from z = -6, each frame sits between two arches
    // (one 3 m before it, one 2 m past it), so no arch ever crosses a frame, on any screen
    const AS = LOOP / Math.round(LOOP / 5);
    const nArch = Math.ceil((2 - END) / AS);
    for (let i = 0; i < nArch; i++) {
      const m = tube(archShape, .035, archColors[i % archColors.length]);
      m.position.z = 2 - i * AS; scene.add(m); arches.push(m);
    }

    // a soft glow texture shared by sprites
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();

    // ── rain inside the hall ──
    const NR = MOBILE ? 500 : 1200, rp = new Float32Array(NR * 3);
    for (let i = 0; i < NR; i++) { rp[i * 3] = (Math.random() - .5) * W; rp[i * 3 + 1] = Math.random() * Hh; rp[i * 3 + 2] = 12 - Math.random() * zLen; }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    const rainMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uH: { value: Hh }, uPx: { value: R.getPixelRatio() } },
      vertexShader: `uniform float uTime; uniform float uH; uniform float uPx; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * 6.5, uH); vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * 22. / -mv.z; vA = clamp(1. - (-mv.z) / 40., 0., 1.); }`,
      fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float a = smoothstep(.06, 0., abs(c.x)) * smoothstep(.5, .1, abs(c.y)); gl_FragColor = vec4(.6,.85,1., a * .35 * vA); }`,
    });
    scene.add(new T.Points(rg, rainMat));

    // ── a night sky painted on the roof: tiny stars, twinkling ──
    // one lap of stars, repeated every lap, so the loop jump never shows
    const lapStars = [], rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(20010202);
    const NS = Math.round(LOOP * W * (MOBILE ? 4 : 5));
    for (let i = 0; i < NS; i++) {
      const big = rnd() < .06, warm = rnd();
      lapStars.push([(rnd() - .5) * (W - .3), rnd() * LOOP, big ? 2.8 + rnd() * 1.6 : 1.2 + rnd() * 1.2, rnd() * 6.283, .6 + rnd() * 2.4, warm < .1 ? 1 : warm < .2 ? 2 : 0]);
    }
    const sp = [], sa = [];
    for (let lap = -1; 8 - lap * LOOP > END; lap++) lapStars.forEach(s => { const z = 8 - s[1] - lap * LOOP; if (z > 12 || z < END) return; sp.push(s[0], Hh - .015, z); sa.push(s[2], s[3], s[4], s[5]); });
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(new Float32Array(sp), 3)); sg.setAttribute('star', new T.BufferAttribute(new Float32Array(sa), 4));
    const starMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: R.getPixelRatio() } },
      vertexShader: `uniform float uTime; uniform float uPx; attribute vec4 star; varying float vA; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
          float d = -mv.z, tw = .55 + .45 * sin(uTime * star.z + star.y);
          gl_PointSize = max(1.5, uPx * star.x * clamp(6. / d, .5, 1.7));
          vA = tw * exp(-pow(d * .04, 2.)) * (star.x > 2.5 ? 1.6 : 1.1);
          vC = star.w > 1.5 ? vec3(.55,.9,1.) : star.w > .5 ? vec3(1.,.72,.85) : vec3(1.,.96,.9); }`,
      fragmentShader: `varying float vA; varying vec3 vC; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, .15, r); gl_FragColor = vec4(vC * a * vA, 1.); }`,
    });
    const stars = new T.Points(sg, starMat); stars.frustumCulled = false; scene.add(stars);

    // ── 35 mm film look over the 3D view: organic grain at 24 frames a second, a breath of exposure flicker, soft vignette ──
    // drawn as one full-screen pass on top (no extra render target, so it costs little and keeps the anti-aliasing)
    const grainMat = new T.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uSeed: { value: 0 }, uFlick: { value: 0 }, uPx: { value: R.getPixelRatio() }, uRes: { value: new T.Vector2(innerWidth, innerHeight) } },
      vertexShader: `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `uniform float uSeed; uniform float uFlick; uniform float uPx; uniform vec2 uRes;
        float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 q = gl_FragCoord.xy / uPx;                       // CSS pixels, so the grain is the same size on every screen
          vec2 o = vec2(h(vec2(uSeed, 1.7)), h(vec2(2.3, uSeed))) * 917.;
          float g = vn(q / .95 + o) * .7 + vn(q / 1.8 + o.yx) * .3 - .5;   // fine clumps on coarser clumps, like silver halide
          vec2 uv = gl_FragCoord.xy / (uRes * uPx) - .5;
          float vig = smoothstep(.35, .95, length(uv * vec2(uRes.x / uRes.y, 1.) * .9)) * .42;
          float s = g * .19 + uFlick - vig;                     // >0 lifts toward white, <0 sinks toward black
          gl_FragColor = s > 0. ? vec4(1., .97, .9, s) : vec4(0., 0., 0., -s);
        }`,
    });
    const grain = new T.Mesh(new T.PlaneGeometry(2, 2), grainMat); grain.frustumCulled = false; grain.renderOrder = 1e4; scene.add(grain);
    let grainFrame = -1;

    // ── the frames: one poster per résumé section ──
    // poster pictures: a copy cropped and sized to exactly the part the poster shows (img/x-p.webp), falling back to the full image
    const img = {}; const loadImg = src => img[src] || (img[src] = new Promise(res => {
      if (!src) return res(null);
      const tryLoad = (u, next) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => next ? tryLoad(next) : res(null); i.src = u; };
      const small = src.replace(/(\.\w+)$/, '-p$1'); tryLoad(small, small !== src ? src : null);
    }));
    const F = C.files;
    const posterPic = c => ({ bazar: F.bazar && F.bazar.hero, siavash: F.siavash && F.siavash.hero }[c.id]);
    ROOMS.forEach(c => { const p = posterPic(c); if (p) loadImg(p).then(i => { img[p].el = i; img[p].done = true; }); });
    // the atomic button's panel: steel plate, hazard stripes, and a big glossy red button under the label
    const atomPoster = () => {
      const cw = 1024, ch = 640, cnv = document.createElement('canvas'); cnv.width = cw; cnv.height = ch; const g = cnv.getContext('2d');
      if (!g) return null;
      const rebuild = nukeLook === 'rebuild';
      const st = g.createLinearGradient(0, 0, 0, ch); st.addColorStop(0, '#24232a'); st.addColorStop(1, '#0d0c11'); g.fillStyle = st; g.fillRect(0, 0, cw, ch);
      g.globalAlpha = .06; for (let y = 0; y < ch; y += 3) { g.fillStyle = y % 6 ? '#fff' : '#000'; g.fillRect(0, y, cw, 1); } g.globalAlpha = 1;   // brushed steel
      // hazard stripes round the edge
      g.save(); g.beginPath(); g.rect(0, 0, cw, ch); g.rect(34, 34, cw - 68, ch - 68); g.clip('evenodd');
      g.fillStyle = '#ffcf1a'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#111';
      for (let x = -ch; x < cw + ch; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 0); g.lineTo(x + 32 - ch, ch); g.lineTo(x - ch, ch); g.closePath(); g.fill(); }
      g.restore();
      // rivets
      g.fillStyle = '#4a4852'; [[58, 58], [cw - 58, 58], [58, ch - 58], [cw - 58, ch - 58]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); });
      // radiation trefoil
      const tre = (x, y, r) => { g.save(); g.translate(x, y); g.fillStyle = '#ffcf1a'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = '#111';
        for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 3; g.beginPath(); g.moveTo(Math.cos(a - .52) * r * .24, Math.sin(a - .52) * r * .24); g.arc(0, 0, r * .86, a - .52, a + .52); g.arc(0, 0, r * .24, a + .52, a - .52, true); g.fill(); }
        g.beginPath(); g.arc(0, 0, r * .16, 0, 7); g.fill(); g.restore(); };
      tre(104, 112, 34);
      g.fillStyle = '#ffcf1a'; g.font = '400 24px "Share Tech Mono", monospace'; g.fillText(rebuild ? 'AFTER // EVERYTHING' : 'CLASSIFIED // DO NOT PRESS', 152, 122);
      g.shadowColor = '#ff2a2a'; g.shadowBlur = rebuild ? 0 : 26; g.fillStyle = '#fff'; g.font = '900 112px "Big Shoulders Display", Impact, sans-serif';
      g.fillText(rebuild ? 'REBUILD' : 'ATOMIC', 74, 262); g.fillText(rebuild ? 'THE CITY' : 'BUTTON', 74, 366); g.shadowBlur = 0;
      g.fillStyle = '#ff4a3a'; g.font = '64px Sahand, Vazirmatn, sans-serif'; g.fillText(rebuild ? 'بازسازی' : 'دکمه‌ی اتمی', 74, 452);
      g.fillStyle = '#cfcbd8'; g.font = '500 28px "Chakra Petch", sans-serif'; g.fillText(rebuild ? 'Press to put it all back.' : 'Ends everything. Then something remains.', 74, 512);
      g.fillStyle = '#ffcf1a'; g.font = '700 26px "Chakra Petch", sans-serif'; g.fillText(rebuild ? 'PRESS  ·  ↺ REBUILD' : 'PRESS  ·  ☢ NOT OPTIONAL', 74, 574);
      // the button: a black collar, a red dome, a hard highlight
      const bx = 778, by = 330;
      const col = g.createRadialGradient(bx, by + 10, 120, bx, by + 10, 196); col.addColorStop(0, '#000'); col.addColorStop(.7, '#1b1a20'); col.addColorStop(1, '#5c5a66');
      g.fillStyle = col; g.beginPath(); g.arc(bx, by + 10, 196, 0, 7); g.fill();
      g.fillStyle = '#060509'; g.beginPath(); g.arc(bx, by + 10, 158, 0, 7); g.fill();
      const dome = g.createRadialGradient(bx - 50, by - 60, 10, bx, by, 150);
      if (rebuild) { dome.addColorStop(0, '#e9fff0'); dome.addColorStop(.25, '#4dff8a'); dome.addColorStop(.75, '#0f8c3c'); dome.addColorStop(1, '#043d19'); }
      else { dome.addColorStop(0, '#ffd4cc'); dome.addColorStop(.22, '#ff4a36'); dome.addColorStop(.72, '#b50d08'); dome.addColorStop(1, '#4a0000'); }
      g.shadowColor = rebuild ? '#4dff8a' : '#ff2a2a'; g.shadowBlur = 40; g.fillStyle = dome; g.beginPath(); g.arc(bx, by, 142, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(bx - 44, by - 70, 62, 30, -.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(bx - 62, by - 82, 18, 8, -.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.font = '900 64px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.fillText(rebuild ? '↺' : 'PUSH', bx, by + 70); g.textAlign = 'left';
      const t = new T.CanvasTexture(cnv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); return t;
    };
    const poster = (c, im) => {
      if (c.atomic) return atomPoster();
      const cw = 1024, ch = 640, cnv = document.createElement('canvas'); cnv.width = cw; cnv.height = ch; const g = cnv.getContext('2d');
      if (!g) return null;
      const col = c.c || '#22f3ff';
      g.fillStyle = '#07030f'; g.fillRect(0, 0, cw, ch);
      const bg = g.createRadialGradient(cw * .8, ch * .2, 10, cw * .8, ch * .2, cw * .9); bg.addColorStop(0, col + '40'); bg.addColorStop(1, 'transparent'); g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      if (im) { const s = Math.max(cw * .55 / im.width, ch / im.height); const w = im.width * s, h = im.height * s; g.save(); g.beginPath(); g.rect(cw * .45, 0, cw * .55, ch); g.clip(); g.drawImage(im, cw * .45 + (cw * .55 - w) / 2, (ch - h) / 2, w, h); const fade = g.createLinearGradient(cw * .45, 0, cw * .62, 0); fade.addColorStop(0, '#07030f'); fade.addColorStop(1, 'rgba(7,3,15,0)'); g.fillStyle = fade; g.fillRect(cw * .45, 0, cw * .2, ch); g.restore(); }
      const idx = FILES.indexOf(c);
      g.fillStyle = col; g.font = '400 26px "Share Tech Mono", monospace'; g.fillText(c.file ? `${String(idx + 1).padStart(2, '0')} / ${String(FILES.length).padStart(2, '0')}` : 'FREE PLAY', 56, 78);
      g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = '#fff'; g.font = '900 104px "Big Shoulders Display", Impact, sans-serif';
      const words = String(c.name).toUpperCase().split(' '); let line = '', y = 196; const maxW = im ? cw * .5 : cw - 110;
      for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { g.fillText(line, 56, y); y += 96; line = wd; } else line = t; } g.fillText(line, 56, y);
      g.shadowBlur = 0;
      if (c.fa) { g.fillStyle = col; g.font = '64px Sahand, Vazirmatn, sans-serif'; g.textAlign = 'left'; g.fillText(c.fa, 56, y + 84); }
      const sub = { about: (F.about && F.about.stats || []).map(x => x.value).slice(0, 2).join(' · '), writer: F.writer && F.writer.lede, bazar: F.bazar && F.bazar.role, siavash: F.siavash && F.siavash.tagline, edu: 'B.A. Cinema · Art University of Tehran', crew: (F.crew && F.crew.roles || []).map(r => r.where).join(' · '), chess: F.chess && `${F.chess.format} ${F.chess.rating} · @${F.chess.handle}` }[c.id] || c.how;
      g.fillStyle = '#d9d4f5'; g.font = '500 30px "Chakra Petch", sans-serif';
      const sw = String(sub || '').split(' '); let sl = '', sy2 = Math.min(ch - 110, y + (c.fa ? 150 : 70));
      for (const wd of sw) { const t = sl ? sl + ' ' + wd : wd; if (g.measureText(t).width > maxW && sl) { g.fillText(sl, 56, sy2); sy2 += 40; sl = wd; } else sl = t; } if (sl) g.fillText(sl, 56, sy2);
      g.fillStyle = col; g.font = '700 26px "Chakra Petch", sans-serif'; g.fillText(c.file ? 'CLICK TO OPEN  ·  ▶ ' + String(c.game).toUpperCase() + ' (OPTIONAL)' : '▶ PLAY', 56, ch - 44);
      const t = new T.CanvasTexture(cnv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); return t;
    };
    // paint-in reveal: a scanline wipes the frame from ink to full colour as you approach
    const frameMat = (tex, col) => new T.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uReveal: { value: 0 }, uHover: { value: 0 }, uCol: { value: new T.Color(col) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uReveal; uniform float uHover; uniform vec3 uCol; uniform float uTime; varying vec2 vUv;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          float lum = dot(t.rgb, vec3(.3,.59,.11));
          vec3 ink = uCol * lum * 1.6 * (.6 + .4 * step(.5, fract(vUv.y * 160.)));
          float edge = 1. - vUv.y;
          float shown = smoothstep(uReveal - .02, uReveal, edge) ;
          vec3 col = mix(t.rgb, ink * .5, shown);
          float scan = smoothstep(.03, 0., abs(edge - uReveal)) * step(uReveal, .999) * step(.001, uReveal);
          col += uCol * scan * 1.4 + uCol * uHover * .12;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    const frames = [];
    const FW = 3.3, FH = FW * 640 / 1024;
    const makeFrame = (c, i, z, copyOf) => {
      const side = i % 2 ? 1 : -1;
      const grp = new T.Group(); grp.position.set(side * (W / 2 - .03), 1.95, z); grp.rotation.y = -side * Math.PI / 2; scene.add(grp);
      const mat = frameMat(glowTex, c.c || '#22f3ff');
      const plane = new T.Mesh(new T.PlaneGeometry(FW, FH), mat); plane.position.z = .02; grp.add(plane);
      const bw = FW / 2 + .07, bh = FH / 2 + .07, path = new T.CurvePath();
      [[-bw, -bh], [bw, -bh], [bw, bh], [-bw, bh], [-bw, -bh]].reduce((a, b) => { path.add(new T.LineCurve3(new T.Vector3(a[0], a[1], 0), new T.Vector3(b[0], b[1], 0))); return b; });
      const border = new T.Mesh(new T.TubeGeometry(path, 64, .022, 5, false), glowMat(c.c || '#22f3ff'));
      border.position.z = .03; grp.add(border);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: c.c || '#22f3ff', transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false }));
      halo.scale.set(FW * 1.9, FH * 2.1, 1); halo.position.z = -.01; grp.add(halo);
      plane.userData.id = c.id;
      const f = { c, grp, plane, mat, border, halo, z, side, reveal: 0, hover: 0, copyOf, wallP: grp.position.clone(), wallQ: grp.quaternion.clone(), rp: grp.position.clone(), rq: grp.quaternion.clone(), up: 0, top: false, i };
      frames.push(f); return f;
    };
    ROOMS.forEach((c, i) => makeFrame(c, i, zOf(i)));
    ROOMS.forEach((c, i) => { if (zOf(i) - LOOP > END + 4) makeFrame(c, i, zOf(i) - LOOP, frames[i]); });

    // ── textures, a little at a time ──
    // Every poster and wall tile is painted once, after the web fonts arrive, nearest first and about one per
    // frame. Each is then uploaded to the GPU on its own frame and its canvas memory is released, so loading
    // never freezes the page and phones stay far below their canvas memory limit.
    const jobs = [];
    const upload = (t, keep) => { try { R.initTexture(t); } catch (e) { } if (!keep && t.image && t.image.getContext) t.image.width = t.image.height = 1; };
    const swapPoster = (c, t) => { let old = null; frames.forEach(f => { if (f.c === c) { old = f.mat.uniforms.uMap.value; f.mat.uniforms.uMap.value = t; } }); if (old && old !== glowTex && old !== t) old.dispose(); };
    const posterJob = c => () => {
      const p = posterPic(c), rec = p && img[p], waiting = !!p && !(rec && rec.done);
      const t = poster(c, rec && rec.el); if (!t) return;
      jobs.unshift(() => { upload(t); swapPoster(c, t); });
      if (waiting) loadImg(p).then(i => { if (i) jobs.push(posterJob(c)); });   // the picture is still coming: repaint when it lands
    };
    const tileJob = tile => () => {
      const t = tile.paint(); if (!t) return;
      jobs.unshift(() => { upload(t); const old = tile.mat.map; tile.mat.map = t; if (old && old.isCanvasTexture) old.dispose(); });
    };
    const queueAll = () => {
      jobs.length = 0;
      const list = [...ROOMS.map((c, i) => [START + 8 + i * GAP, posterJob(c)]), ...wallTiles.map(tl => [tl.k * (LOOP / (wallTiles.length / 2)), tileJob(tl)])];
      list.sort((a, b) => a[0] - b[0]).forEach(x => jobs.push(x[1]));
    };
    const runJobs = () => { const t0 = performance.now(); do { jobs.shift()(); } while (jobs.length && performance.now() - t0 < 4); };
    const FONTS = ['900 104px "Big Shoulders Display"', '400 26px "Share Tech Mono"', '500 30px "Chakra Petch"', '700 26px "Chakra Petch"', '64px Sahand', '800 64px Vazirmatn'];
    let fontsIn = false, timedOut = false;
    const fontsLoaded = document.fonts ? Promise.all(FONTS.map(f => document.fonts.load(f).catch(() => { }))) : Promise.resolve();
    fontsLoaded.then(() => { if (!fontsIn) { fontsIn = true; queueAll(); } else if (timedOut) queueAll(); });   // very slow fonts: paint again once they land
    setTimeout(() => { if (!fontsIn) { fontsIn = timedOut = true; queueAll(); } }, 3000);
    cv.addEventListener('webglcontextrestored', () => queueAll());

    // ── room list: jump anywhere ──
    const nav = document.createElement('nav'); nav.className = 'rooms'; nav.setAttribute('aria-label', 'Rooms');
    nav.innerHTML = ROOMS.map((c, i) => `<button type="button" data-i="${i}" style="--c:${c.c}"><i></i><span>${c.name}</span></button>`).join('');
    document.body.append(nav);

    const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'near-open'; chip.hidden = true; chip.innerHTML = '<span>Open</span><b></b><i>→</i>';
    chip.addEventListener('click', () => { const f = chip.__f; if (!f) return; if (f.c.atomic) NK.press(); else if (f.c.file) AV.openFile(f.c.id); else AV.open(f.c.id, { play: true }); });
    document.body.append(chip);

    // ── scroll → walk ──
    const track = document.getElementById('corridorTrack');
    const STEP_VH = MOBILE ? 84 : 100;   // how far you scroll per metre walked (higher = slower walk)
    // scroll distance maps straight to walking distance; the page is one lap plus some extra hall,
    // so you keep walking past the last room into the next lap, and the page quietly jumps back one lap
    // Phones don't use native page scroll here: a finger drag with its own momentum moves you, so the
    // address bar never resizes the page, momentum is never cut off, and the loop is a plain modulo.
    // Desktop keeps native scrolling (wheel, keys, scrollbar).
    const VIRTUAL = MOBILE;
    let ppu = 1, refH = innerHeight;                     // pixels of scroll per metre walked
    const sizeTrack = () => {
      if (!VIRTUAL || Math.abs(innerWidth - (sizeTrack.w || 0)) > 40) { refH = innerHeight; sizeTrack.w = innerWidth; }
      ppu = refH * STEP_VH / 100 / GAP; track.style.height = VIRTUAL ? '0px' : `${Math.round(LOOP * ppu + innerHeight * 3.2)}px`;
    };
    sizeTrack(); addEventListener('resize', sizeTrack);
    let vy = 0, vv = 0, vTarget = null, dragging = false;
    const posY = () => VIRTUAL ? vy : scrollY;
    const camZFor = () => 8 - posY() / ppu;
    window.VY = VIRTUAL ? 0 : null;
    const progress = () => clamp01(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    const clamp01 = v => Math.max(0, Math.min(1, v));
    function goTo(id) {
      const i = ROOMS.findIndex(r => r.id === id); if (i < 0) return;
      goZ(zOf(i) + 4.2);
    }
    function goZ(z) {
      if (VIRTUAL) { vv = 0; vTarget = (8 - z) * ppu; if (vTarget < vy - LOOP * ppu / 2) vTarget += LOOP * ppu; }
      else scrollTo({ top: (8 - z) * ppu, behavior: RM ? 'auto' : 'smooth' });
    }
    nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) goTo(ROOMS[+b.dataset.i].id); });

    // look around: mouse on desktop, tilt on phones
    let lookX = 0, lookY = 0, tlx = 0, tly = 0;
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; tlx = (e.clientX / innerWidth - .5) * 2; tly = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
    const onTilt = e => { if (e.gamma == null) return; tlx = Math.max(-1, Math.min(1, e.gamma / 25)); tly = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); };
    const askTilt = () => { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => { }); else addEventListener('deviceorientation', onTilt); };
    if (MOBILE) { const jb = document.getElementById('jackIn'), js = document.getElementById('jackSilent'); [jb, js].forEach(b => b && b.addEventListener('click', askTilt, { once: true })); }

    // click a frame to open it
    // ── the tablet: at each résumé stop the frame lifts off the wall and floats up in front of you,
    // facing you square on like a tablet held at reading distance; walk on and it settles back onto the wall ──
    const TAB_D = 2;                                                   // metres in front of the camera
    const smooth = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    // d = how far the frame is ahead of you; the button stop is d = 4.2
    const lift = d => d > 6.2 ? smooth((8.6 - d) / 2.4) : d > 2.6 ? 1 : smooth((d - 1.2) / 1.4);
    const tabP = new T.Vector3(), tabOff = new T.Vector3();
    const setTop = (f, top) => {   // while lifted, draw it over everything (arches, rain) the way a held tablet would be
      if (f.top === top) return; f.top = top;
      f.mat.transparent = top; f.mat.depthTest = !top; f.border.material.depthTest = !top; f.halo.material.depthTest = !top;
      f.halo.renderOrder = top ? 9000 : 0; f.plane.renderOrder = top ? 9001 : 0; f.border.renderOrder = top ? 9002 : 0;
      if (f.crack) { f.crack.material.depthTest = !top; f.crack.renderOrder = top ? 9001.5 : 0; }
    };
    const ray = new T.Raycaster(), ndc = new T.Vector2(); let hoverF = null;
    const pick = (x, y) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(frames.map(f => f.plane))[0]; return hit && hit.distance < 22 ? frames.find(f => f.plane === hit.object) : null; };
    cv.addEventListener('pointermove', e => { const f = pick(e.clientX, e.clientY); if (f !== hoverF) { hoverF = f; cv.style.cursor = f ? 'pointer' : ''; if (f) SND.ui('blip'); } });
    let downAt = null;
    cv.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', e => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; downAt = null;
      const f = pick(e.clientX, e.clientY); if (!f) return;
      if (f.c.atomic) NK.press(); else if (f.c.file) AV.openFile(f.c.id); else AV.open(f.c.id, { play: true });
    });
    addEventListener('keydown', e => { if (!$('#ov').hidden || e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'ArrowDown' || e.key === 'PageDown') { /* native scroll */ } });

    // touch: drag to walk, flick for momentum. Panels, the top bar and buttons keep their own touches.
    if (VIRTUAL) {
      let ly = 0, lt = 0, vel = 0, sy0 = 0, moved = false;
      const skipT = t => t.closest && t.closest('#ov, #hud, #zoom, .near-open, .rooms, button, a, input, textarea');
      addEventListener('touchstart', e => { if (!document.body.classList.contains('corridor') || NK.busy || skipT(e.target) || e.touches.length > 1) return; dragging = true; moved = false; ly = sy0 = e.touches[0].clientY; lt = performance.now(); vel = 0; vv = 0; vTarget = null; }, { passive: true });
      addEventListener('touchmove', e => {
        if (!dragging) return;
        const y = e.touches[0].clientY, now = performance.now(), dy = ly - y, dtm = Math.max(1, now - lt);
        if (!moved && Math.abs(y - sy0) < 6) return; moved = true;
        if (e.cancelable) e.preventDefault();
        vy += dy * 1.15; vel = vel * .6 + (dy * 1.15 / dtm) * .4; ly = y; lt = now;
      }, { passive: false });
      const end = () => { if (!dragging) return; dragging = false; if (performance.now() - lt < 140) vv = vel * 16.7; };
      addEventListener('touchend', end, { passive: true }); addEventListener('touchcancel', end, { passive: true });
    }

    // ── the atomic button ──
    // Press it: a siren and a countdown, a fireball at the far end of the hall, and a shock front that rolls
    // toward you ripping the frames off the walls. Then dust. When it settles everything is still there, in black
    // and white: some frames hang crooked, some lean or lie on the floor, some are cracked. Press it again to rebuild.
    // Everything here is timed from the press in seconds, so it plays the same on any screen.
    const ash = (() => {   // ash drifting down afterwards (it lives in a window around you as you walk)
      const N = MOBILE ? 420 : 900, a = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) { a[i * 4] = (Math.random() - .5) * (W - .4); a[i * 4 + 1] = Math.random() * Hh; a[i * 4 + 2] = Math.random() * 35; a[i * 4 + 3] = Math.random(); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('seed', new T.BufferAttribute(a, 4));
      return g;
    })();
    const ashMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCamZ: { value: 0 }, uH: { value: Hh }, uPx: { value: R.getPixelRatio() }, uA: { value: 0 }, uWin: { value: LOOP / Math.max(1, Math.round(LOOP / 32)) } },   // the window divides the lap, so the loop jump doesn't move the ash
      vertexShader: `uniform float uTime; uniform float uCamZ; uniform float uH; uniform float uPx; uniform float uWin; attribute vec4 seed; varying float vA;
        void main(){ vec3 p = seed.xyz; p.y = mod(p.y - uTime * (.22 + seed.w * .25), uH); p.x += sin(uTime * .5 + seed.w * 40.) * .35;
          p.z = p.z / 35. * uWin; p.z = p.z + uWin * ceil((uCamZ - (uWin - 5.) - p.z) / uWin);
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = uPx * (1.5 + seed.w * 2.5) * clamp(6. / -mv.z, .4, 2.); vA = clamp(1. - (-mv.z) / 28., 0., 1.); }`,
      fragmentShader: `uniform float uA; varying float vA; void main(){ float r = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.8), smoothstep(.5, .15, r) * vA * .75 * uA); }`,
    });
    const ashPts = new T.Points(ash, ashMat); ashPts.frustumCulled = false; ashPts.visible = false; scene.add(ashPts);
    const rainPts = scene.children.find(o => o.isPoints && o.material === rainMat);

    const NK = (() => {
      const S = { phase: 'idle', t0: 0, busy: false, music: false, zDet: 0, contact: false, settled: false, focus: 0, ft: 0 };
      const shake = [0, 0, 0, 0];
      const ov = document.createElement('div'); ov.id = 'nk'; ov.setAttribute('aria-hidden', 'true');
      ov.innerHTML = '<div class="nk-alarm"></div><div class="nk-heat"></div><div class="nk-count"></div><div class="nk-dust"></div><div class="nk-flash"></div>';
      document.body.append(ov);
      const $k = k => ov.querySelector('.nk-' + k), alarm = $k('alarm'), heat = $k('heat'), count = $k('count'), dust = $k('dust'), flash = $k('flash');
      const op = (el, v) => { v = Math.max(0, Math.min(1, v)); if (RM && (el === flash || el === alarm)) v = Math.min(v, .3); const s = v.toFixed(3); if (el.__o !== s) { el.__o = s; el.style.opacity = s; el.style.visibility = v > 0 ? 'visible' : 'hidden'; } };
      const fog0 = scene.fog.color.clone(), bg0 = scene.background.clone();
      const RED = new T.Color(.42, .02, .03), HOT = new T.Color(1, .62, .3), DUST = new T.Color(.36, .33, .3), AFTER = new T.Color(.15, .15, .155), BGA = new T.Color(.05, .05, .055);
      const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

      // the fireball, far down the hall, and the shock front rolling toward you
      const fire = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xfff0d8, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
      fire.visible = false; scene.add(fire);
      const waveMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, side: T.DoubleSide,
        uniforms: { uTime: { value: 0 }, uA: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `uniform float uTime; uniform float uA; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
          float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * n(p); p *= 2.1; a *= .5; } return v; }
          void main(){
            vec2 p = vUv * vec2(3., 2.) + vec2(0., -uTime * .9);
            float d = fbm(p * 2. + fbm(p * 3. + uTime));
            float core = smoothstep(.95, .1, length((vUv - vec2(.5, .42)) * vec2(1.2, 1.6)));
            vec3 c = mix(vec3(.45, .32, .24), vec3(1., .78, .45), core * d * 1.4);
            c = mix(c, vec3(1., .97, .88), smoothstep(.55, .95, core * d * 1.5));
            float edge = smoothstep(0., .22, vUv.x) * smoothstep(1., .78, vUv.x) * smoothstep(0., .12, vUv.y) * smoothstep(1., .7, vUv.y);
            gl_FragColor = vec4(c, uA * clamp(.35 + d * .85, 0., 1.) * mix(.35, 1., edge));
          }`,
      });
      const wave = new T.Group(); wave.visible = false; scene.add(wave);
      [0, 1.6, 3.4].forEach((dz, k) => { const m = new T.Mesh(new T.PlaneGeometry(W + 1.5, Hh + 1.2), waveMat); m.position.set(0, Hh / 2, -dz); m.scale.x = k % 2 ? -1 : 1; m.renderOrder = 9500 - k; wave.add(m); });

      // cracked glass, drawn once and shared
      let crackTex = null;
      const makeCracks = () => {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 640; const g = c.getContext('2d'); let sd = 7;
        const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        const ray = (x, y, a, len, w) => {
          g.beginPath(); g.moveTo(x, y); let px = x, py = y;
          for (let l = 0; l < len; l += 14) { a += (r() - .5) * .5; px += Math.cos(a) * 14; py += Math.sin(a) * 14; g.lineTo(px, py);
            if (r() < .08 && w > .8) { g.stroke(); ray(px, py, a + (r() - .5) * 1.6, len * .35, w * .6); g.beginPath(); g.moveTo(px, py); } }
          g.lineWidth = w; g.stroke();
        };
        [[300, 250], [760, 430]].forEach(([x, y], k) => {
          g.strokeStyle = 'rgba(0,0,0,.55)'; g.save(); g.translate(2, 2);
          const save = sd; for (let i = 0; i < 13; i++) ray(x, y, i / 13 * 6.283 + r() * .3, 180 + r() * 360, 2.6); sd = save; g.restore();
          g.strokeStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 13; i++) ray(x, y, i / 13 * 6.283 + r() * .3, 180 + r() * 360, 2.2);
          g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.4;
          for (let ring = 1; ring <= 3; ring++) for (let i = 0; i < 13; i++) if (r() < .6) { const a = i / 13 * 6.283, rr = ring * (28 + r() * 16); g.beginPath(); g.arc(x, y, rr, a, a + .45); g.stroke(); }
          g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
        });
        const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
      };

      // where each frame ends up. Same pose for a room and its copy one lap on, so the loop stays seamless.
      const qa = new T.Quaternion(), qb = new T.Quaternion(), X = new T.Vector3(1, 0, 0), Z = new T.Vector3(0, 0, 1), Y = new T.Vector3(0, 1, 0);
      const KINDS = ['tilt', 'floor', 'crack', 'lean', 'tiltcrack', 'floorup', 'leancrack'];
      const broken = f => {
        const k = KINDS[f.i % KINDS.length], p = f.wallP.clone(), q = f.wallQ.clone();
        const out = (dx, dy, dz) => p.add(new T.Vector3(dx, dy, dz).applyQuaternion(f.wallQ));   // move in the frame's own axes (x along the wall, z out of it)
        const turn = (axis, a) => q.multiply(qa.setFromAxisAngle(axis, a));
        if (k === 'tilt' || k === 'tiltcrack') { const a = k === 'tilt' ? .24 : -.4; turn(Z, a); out(0, -.32, .02); }
        else if (k === 'crack') { turn(Z, -.05); }
        else if (k === 'lean' || k === 'leancrack') { const a = .36; turn(X, -a); out(k === 'lean' ? .3 : -.4, (FH / 2 + .07) * Math.cos(a) + .02 - 1.95, (FH / 2 + .07) * Math.sin(a) + .05); }
        else { const tilt = k === 'floorup' ? .32 : 0; turn(X, -Math.PI / 2 + tilt); turn(Z, k === 'floor' ? .3 : -.22); out(k === 'floor' ? .5 : -.3, .06 + (FH / 2) * Math.sin(tilt) - 1.95, FH / 2 + .45); }
        return { p, q, crack: /crack/.test(k) || k === 'floor' };
      };
      const spinAxis = f => new T.Vector3(Math.sin(f.i * 2.1), Math.cos(f.i * 1.3), Math.sin(f.i * .7 + 1)).normalize();

      const victims = () => frames.filter(f => !f.c.atomic);
      function press() {
        if (S.busy) return;
        if (S.phase === 'idle') { S.phase = 'count'; S.t0 = -1; S.busy = true; S.restored = false; S.music = !!(window.SND && SND.playing); if (window.SND) { SND.ui('blip'); SND.nuke('siren'); } }
        else if (S.phase === 'after') { S.phase = 'rebuild'; S.t0 = -1; S.busy = true; S.restored = false; if (window.SND) SND.ui('open'); }
      }
      // block wheel and arrow-key walking while it happens
      addEventListener('wheel', e => { if (S.busy) e.preventDefault(); }, { passive: false });
      addEventListener('keydown', e => { if (S.busy && /Arrow|Page|Space|Home|End/.test(e.code || e.key)) e.preventDefault(); });

      const repaintButton = look => { nukeLook = look; const a = frames.filter(f => f.c.atomic); if (a.length) jobs.unshift(posterJob(a[0].c)); };
      const setNuked = on => {
        document.body.classList.toggle('nuked', on);
        scene.fog.color.copy(on ? AFTER : fog0); scene.background.copy(on ? BGA : bg0);
        if (rainPts) rainPts.visible = !on; ashPts.visible = on; ashMat.uniforms.uA.value = on ? 1 : 0;
        if (!on) victims().forEach(f => { f.rp.copy(f.wallP); f.rq.copy(f.wallQ); f.hitAt = null; f.dest = null; if (f.crack) f.crack.visible = false; });
      };

      function update(t, camZ) {
        shake[0] = shake[1] = shake[2] = shake[3] = 0;
        if (RM) { const r = upd(t, camZ); shake[0] = shake[1] = shake[2] = shake[3] = 0; return r; }
        return upd(t, camZ);
      }
      function upd(t, camZ) {
        // how much to take over the view: 1 from the press until the dust has nearly settled
        const ft = S.phase === 'count' || S.phase === 'blast' || S.phase === 'rebuild' && !S.restored || S.phase === 'after' && t - S.t0 < 3.2 ? 1 : 0;
        S.focus += (ft - S.focus) * Math.min(1, (t - (S.lt || t)) * (ft ? 4 : 1.4)); S.lt = t; if (S.focus < .002) S.focus = 0;
        if (S.phase === 'idle' || S.phase === 'after' && S.settled) return;
        if (S.t0 < 0) S.t0 = t;
        const T_ = t - S.t0;
        if (S.phase === 'count') {
          // red alarm, the hall pulsing red, a countdown
          const pulse = .5 + .5 * Math.sin(T_ * Math.PI * 2.5 - Math.PI / 2);
          op(alarm, .35 + .55 * pulse);
          scene.fog.color.copy(fog0).lerp(RED, .35 + .55 * pulse);
          const n = 3 - Math.floor(T_ / .8), fr = (T_ % .8) / .8;
          if (n >= 1) { count.textContent = String(n); op(count, 1 - Math.max(0, fr - .7) / .3); count.style.transform = `translate(-50%,-50%) scale(${(1.6 - .6 * ease(fr * 2)).toFixed(3)})`; } else op(count, 0);
          if (T_ >= 2.4) { S.phase = 'blast'; S.t0 = t; S.zDet = camZ - 52; S.contact = false; if (window.SND) { if (SND.playing) SND.stop(); SND.nuke('boom'); }
            if (!crackTex) crackTex = makeCracks();
            victims().forEach(f => { const b = broken(f); f.dest = b; f.hitAt = null; f.flown = false;
              if (b.crack && !f.crack) { f.crack = new T.Mesh(new T.PlaneGeometry(FW, FH), new T.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, fog: true })); f.crack.position.z = .03; if (f.i % 2) f.crack.rotation.z = Math.PI; f.grp.add(f.crack); }
              if (f.crack) f.crack.visible = false; }); }
          return;
        }
        if (S.phase === 'blast') {
          const u = T_;
          op(alarm, .9 * (1 - u / .3)); op(count, 0);
          // flash: blinding white, then it opens up onto the shock front
          op(flash, u < .1 ? u / .1 : u < .45 ? 1 : 1 - ease((u - .45) / .7) * .9 - (u > 1.2 ? (u - 1.2) / .4 * .1 : 0));
          // fireball
          fire.visible = u < 1.8; fire.position.set(0, Hh * .45, S.zDet); const fs = 6 + 70 * ease(u / .9); fire.scale.set(fs, fs, 1); fire.material.opacity = u < 1 ? 1 : Math.max(0, 1 - (u - 1) / .8);
          // the hall glows hot, then goes to dust
          scene.fog.color.copy(fog0).lerp(HOT, Math.min(1, u / .25)).lerp(DUST, Math.max(0, (u - 1) / .6));
          // the shock front: from the fireball to you in about 1.3 s
          const k = Math.max(0, Math.min(1, (u - .3) / 1.3)), zw = S.zDet + 4 + (camZ + .6 - S.zDet - 4) * (k * k * (3 - 2 * k) * .35 + k * .65);
          wave.visible = u > .3 && u < 1.75; wave.position.z = zw; waveMat.uniforms.uTime.value = t; waveMat.uniforms.uA.value = Math.min(1, (u - .3) / .2);
          victims().forEach(f => { if (f.hitAt == null && !f.flown && (zw + 12 >= f.z || k >= 1)) { f.hitAt = t; f.flown = true; } });
          // the hall glows hotter as the front comes on, and the dust rises around you as it arrives
          op(heat, u < .3 ? u / .3 * .5 : .5 + .4 * k); if (!S.contact) op(dust, Math.max(0, (zw - (camZ - 5)) / 5.4) * .9);
          const amp = .02 + .2 * k * k; shake[0] = (Math.random() - .5) * amp; shake[1] = (Math.random() - .5) * amp * .8; shake[2] = (Math.random() - .5) * amp * .2; shake[3] = (Math.random() - .5) * amp * .25;
          if (k >= 1 && !S.contact) { S.contact = true; S.tc = t; if (window.SND) SND.nuke('ring'); }
          if (S.contact) {
            // dust swallows everything; under it the world turns black and white
            const c = t - S.tc; op(dust, .9 + c / .1); op(flash, 0); op(heat, .9 - c * 4); wave.visible = false;
            if (c > .15 && !document.body.classList.contains('nuked')) { setNuked(true); repaintButton('rebuild'); if (window.SND) SND.nuke('wind'); }
            if (c > .3) { S.phase = 'after'; S.t0 = t; S.settled = false; }
          }
        }
        if (S.phase === 'after') {
          // the dust settles over a few seconds
          const u = T_; op(dust, 1 - ease((u - .3) / 3)); op(heat, 0); fire.visible = false;
          const amp = .25 * Math.exp(-u * 1.6); shake[0] = (Math.random() - .5) * amp; shake[1] = (Math.random() - .5) * amp * .6; shake[3] = (Math.random() - .5) * amp * .2;
          if (u > 1.2) S.busy = false;
          if (u > 4) { S.settled = true; op(dust, 0); }
        }
        if (S.phase === 'rebuild') {
          // a white-out, everything put back, the music comes back
          const u = T_; op(flash, u < .45 ? ease(u / .45) : 1 - ease((u - .55) / .9));
          if (u >= .45 && document.body.classList.contains('nuked')) { S.restored = true; setNuked(false); repaintButton('armed'); if (window.SND) { SND.nuke('calm'); if (S.music) SND.start(); } }
          if (u > 1.5) { op(flash, 0); S.phase = 'idle'; S.busy = false; }
        }
        // frames in flight: ripped off the wall when the front reaches them, tumbling to where they end up
        for (const f of victims()) {
          if (f.hitAt == null || !f.dest) continue;
          const v = Math.min(1, (t - f.hitAt) / 1.15), e = ease(v), arc = Math.sin(Math.PI * Math.min(1, v));
          f.rp.lerpVectors(f.wallP, f.dest.p, e); f.rp.y += arc * .7; f.rp.z += arc * 1.4;
          f.rq.slerpQuaternions(f.wallQ, f.dest.q, e); f.rq.multiply(qb.setFromAxisAngle(spinAxis(f), arc * 2.2));
          if (f.crack) f.crack.visible = v > .05;
          if (v >= 1) f.hitAt = null;
        }
      }
      // dead and flickering neon afterwards
      const arch = (i, t) => {
        if (!document.body.classList.contains('nuked')) return 1;
        const h = Math.sin(i * 91.7) * 43758.5 % 1, hh = h < 0 ? -h : h;
        if (hh < .35) return Math.sin(t * 23 + i) > .93 ? .7 : .05;   // dead, the odd spark
        return .45;
      };
      return { press, update, arch, shake, get busy() { return S.busy; }, get focus() { return S.focus; } };
    })();

    // ── loop ──
    let camZ = camZFor(), last = performance.now(), on = true, skip = 0;
    const tmpV = new T.Vector3();
    function resize() { R.setSize(innerWidth, innerHeight, false); grainMat.uniforms.uRes.value.set(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 78 : MOBILE ? 72 : 62; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    // the loop: one lap after the start (plus a screen of walking, so the hero has already faded),
    // jump back exactly one lap. The hall there is identical, so nothing visibly changes.
    let looping = 0, wallTick = 0;
    function wrap() {
      looping = 1;
      const lapPx = LOOP * ppu;
      if (VIRTUAL) { vy -= lapPx; if (vTarget != null) vTarget -= lapPx; }
      else scrollTo({ top: scrollY - lapPx, behavior: 'instant' });
      camZ += LOOP;
      frames.forEach(f => { if (f.copyOf) { f.copyOf.reveal = Math.max(f.copyOf.reveal, f.reveal); f.reveal = 0; } });
      requestAnimationFrame(() => { looping = 0; });
    }
    addEventListener('scroll', () => { if (!VIRTUAL && !looping && document.body.classList.contains('corridor') && scrollY >= LOOP * ppu + innerHeight * 1.05) wrap(); }, { passive: true });
    function loop(ts) {
      requestAnimationFrame(loop);
      const corr = document.body.classList.contains('corridor');
      if (VIRTUAL) { document.documentElement.classList.toggle('vscroll', corr); window.VY = corr ? vy : null; }
      if (!corr || document.hidden) return;
      if (jobs.length) runJobs();
      // sharpness guard: if this phone can't hold a smooth frame rate at full sharpness, step down a notch
      else if (MOBILE && PR > 1.25 && !document.body.classList.contains('ov-open')) {
        const fd = ts - (loop.fp || ts); loop.fp = ts; const fs = loop.fs || (loop.fs = []);
        if (fd > 0 && fd < 200) fs.push(fd);
        if (fs.length >= 90) { fs.sort((a, b) => a - b); if (fs[45] > 24) { PR = PR > 1.5 ? 1.5 : 1.25; R.setPixelRatio(PR); R.setSize(innerWidth, innerHeight, false); rainMat.uniforms.uPx.value = starMat.uniforms.uPx.value = grainMat.uniforms.uPx.value = PR; } fs.length = 0; }
      }
      if (document.body.classList.contains('ov-open') && (skip = (skip + 1) % 3)) return;
      const dt = Math.min(.05, (ts - last) / 1000); last = ts;
      if (VIRTUAL) {
        const k = dt * 60, before = vy;
        if (vTarget != null) { vy += (vTarget - vy) * (1 - Math.pow(.88, k)); if (Math.abs(vTarget - vy) < .5) { vy = vTarget; vTarget = null; } }
        else if (!dragging && Math.abs(vv) > .02) { vy += vv * k; vv *= Math.pow(.955, k); }
        if (vy < 0) { vy += (0 - vy) * (1 - Math.pow(.8, k)); if (vv < 0) vv = 0; }   // soft stop at the very start
        if (vy >= LOOP * ppu + refH * 1.05) wrap();
        if (vy !== before) { window.VY = vy; dispatchEvent(new Event('vscroll')); }
      }
      const t = ts / 1000, p = window.SND ? SND.pulse : 0;
      const target = camZFor();
      const lerpDt = Math.min(.12, (ts - (loop.prev || ts)) / 1000); loop.prev = ts;
      camZ += (target - camZ) * (RM ? 1 : 1 - Math.exp(-lerpDt * 5.5));
      lookX += (tlx - lookX) * .05; lookY += (tly - lookY) * .05;
      // drift toward the nearest frame so each one turns to face you as you pass
      let near = null, nd = 99;
      for (const f of frames) { const d = camZ - f.z; if (d > -1 && d < nd) { nd = d; near = f; } }
      let yaw = -lookX * .22;
      // turn to look at the frame you are passing (on a phone held upright, look straight at it)
      const portrait = innerWidth < innerHeight, wPeak = portrait ? 5.2 : 3.8, wSpan = portrait ? 4.2 : 3.8;
      let w = 0; if (near && nd < 9.5) { w = Math.max(0, 1 - Math.abs(nd - wPeak) / wSpan); const ws = w * w * (3 - 2 * w), aim = Math.atan2(W / 2 - .03, Math.max(.6, nd)); yaw += -near.side * aim * ws * (portrait ? 1 : .62); }
      // while a frame is up in front of you, look down the hall rather than at the wall
      let upNow = 0; for (const f of frames) { f.up = RM ? (lift(camZ - f.z) > .5 ? 1 : 0) : lift(camZ - f.z); if (f.up > upNow) upNow = f.up; }
      yaw *= 1 - .9 * upNow;
      // while the bomb goes off, everything drops back to the wall and you look straight down the hall
      if (NK.focus > 0) { for (const f of frames) f.up *= 1 - NK.focus; upNow *= 1 - NK.focus; yaw *= 1 - NK.focus; }
      // a button for the frame you are looking at
      const show = near && w > .45 ? near : null;
      if (chip.__f !== show) { chip.__f = show; chip.hidden = !show; if (show) { chip.style.setProperty('--c', show.c.c); chip.querySelector('b').textContent = show.c.name; chip.querySelector('span').textContent = show.c.atomic ? 'Press' : show.c.file ? 'Open' : 'Play'; if (show.c.atomic) chip.querySelector('b').textContent = nukeLook === 'rebuild' ? 'Rebuild' : 'Atomic button'; } }
      NK.update(t, camZ);
      cam.position.set(Math.sin(t * .4) * .06 + lookX * .25 + NK.shake[0], 1.75 + Math.sin(t * .9) * .02 - lookY * .08 + NK.shake[1], camZ);
      cam.rotation.set(-lookY * .08 + NK.shake[2], yaw, NK.shake[3], 'YXZ');
      // place every frame: from its rest pose (on the wall, or wherever the blast left it), blended toward the
      // tablet spot when lifted. The tablet spot is centred a little low (clear of the top bar) and sized to the screen.
      let tabS = 1;
      if (upNow > 0) {
        const vH = 2 * Math.tan(cam.fov * Math.PI / 360) * TAB_D, vW = vH * cam.aspect;
        tabS = Math.min(.9 * vW / FW, (portrait ? .5 : .64) * vH / FH);
        tabOff.set(0, -vH * (portrait ? .06 : .03) + Math.sin(t * 1.3) * .012, -TAB_D);
        tabP.copy(tabOff).applyQuaternion(cam.quaternion).add(cam.position);
      }
      for (const f of frames) {
        const e = f.up;
        if (e > 0) { f.grp.position.lerpVectors(f.rp, tabP, e); f.grp.quaternion.slerpQuaternions(f.rq, cam.quaternion, e); f.grp.scale.setScalar(1 + (tabS - 1) * e); }
        else { f.grp.position.copy(f.rp); f.grp.quaternion.copy(f.rq); f.grp.scale.setScalar(1); }
        setTop(f, e > .02);
      }
      // frames paint themselves in as you approach; the nearest one glows
      for (const f of frames) {
        const d = camZ - f.z, target = d < 16 ? Math.min(1, Math.max(0, (16 - d) / 9)) : 0;
        // timed in seconds, not frames, so a slower phone paints the frame in just as fast; and it finishes all the way
        const rt = d < -2 ? 1 : target; f.reveal += (rt - f.reveal) * (1 - Math.pow(.92, dt * 60)); if (Math.abs(rt - f.reveal) < .004) f.reveal = rt;
        f.hover += ((f === hoverF ? 1 : 0) - f.hover) * (1 - Math.pow(.85, dt * 60));
        f.mat.uniforms.uReveal.value = f.reveal >= 1 ? 1.05 : f.reveal; f.mat.uniforms.uHover.value = f.hover;
        f.halo.material.opacity = (.18 + f.reveal * .25 + f.hover * .25) * (1 + p * .3);
      }
      arches.forEach((a, i) => { a.material.opacity = (.65 + .35 * Math.max(0, Math.sin(t * 1.6 - i * .5)) + p * .2) * NK.arch(i, t); });
      floorMat.uniforms.uTime.value = t; floorMat.uniforms.uPulse.value = p;
      rainMat.uniforms.uTime.value = t; starMat.uniforms.uTime.value = t; ashMat.uniforms.uTime.value = t; ashMat.uniforms.uCamZ.value = camZ;
      // film runs at 24 frames a second: the grain and the flicker change on that beat, whatever the screen's rate
      const gf = RM ? 0 : Math.floor(t * 24);
      if (gf !== grainFrame) { grainFrame = gf; grainMat.uniforms.uSeed.value = gf % 997 + .37; grainMat.uniforms.uFlick.value = RM ? 0 : (Math.random() - .5) * .018; }
      // room list follows you
      let ri = 0; frames.forEach((f, i) => { if (!f.copyOf && camZ < f.z + 6) ri = i; });
      if (nav.__ri !== ri) { nav.__ri = ri; nav.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === ri)); }
      document.body.classList.toggle('walking', camZ < 3);
      R.render(scene, cam);
    }
    requestAnimationFrame(loop);
    window.CORRIDOR = { goTo, goZ, nuke: () => NK.press(), where: () => ({ z: camZ, rooms: ROOMS.map(r => r.id) }) };
  };
  if (window.THREE) start(); else addEventListener('three-ready', start, { once: true });
})();
