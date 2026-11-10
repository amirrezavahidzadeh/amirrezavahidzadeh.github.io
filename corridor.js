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
    const ROOMS = [...FILES, ...FREE];

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
    const poster = (c, im) => {
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
      const f = { c, grp, plane, mat, border, halo, z, side, reveal: 0, hover: 0, copyOf };
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
    chip.addEventListener('click', () => { const f = chip.__f; if (!f) return; if (f.c.file) AV.openFile(f.c.id); else AV.open(f.c.id, { play: true }); });
    document.body.append(chip);

    // ── scroll → walk ──
    const track = document.getElementById('corridorTrack');
    const STEP_VH = MOBILE ? 75 : 90;
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
      const z = zOf(i) + 4.2;
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
    const ray = new T.Raycaster(), ndc = new T.Vector2(); let hoverF = null;
    const pick = (x, y) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(frames.map(f => f.plane))[0]; return hit && hit.distance < 22 ? frames.find(f => f.plane === hit.object) : null; };
    cv.addEventListener('pointermove', e => { const f = pick(e.clientX, e.clientY); if (f !== hoverF) { hoverF = f; cv.style.cursor = f ? 'pointer' : ''; if (f) SND.ui('blip'); } });
    let downAt = null;
    cv.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', e => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; downAt = null;
      const f = pick(e.clientX, e.clientY); if (!f) return;
      if (f.c.file) AV.openFile(f.c.id); else AV.open(f.c.id, { play: true });
    });
    addEventListener('keydown', e => { if (!$('#ov').hidden || e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'ArrowDown' || e.key === 'PageDown') { /* native scroll */ } });

    // touch: drag to walk, flick for momentum. Panels, the top bar and buttons keep their own touches.
    if (VIRTUAL) {
      let ly = 0, lt = 0, vel = 0, sy0 = 0, moved = false;
      const skipT = t => t.closest && t.closest('#ov, #hud, #zoom, .near-open, .rooms, button, a, input, textarea');
      addEventListener('touchstart', e => { if (!document.body.classList.contains('corridor') || skipT(e.target) || e.touches.length > 1) return; dragging = true; moved = false; ly = sy0 = e.touches[0].clientY; lt = performance.now(); vel = 0; vv = 0; vTarget = null; }, { passive: true });
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
      // a button for the frame you are looking at
      const show = near && w > .45 ? near : null;
      if (chip.__f !== show) { chip.__f = show; chip.hidden = !show; if (show) { chip.style.setProperty('--c', show.c.c); chip.querySelector('b').textContent = show.c.name; chip.querySelector('span').textContent = show.c.file ? 'Open' : 'Play'; } }
      cam.position.set(Math.sin(t * .4) * .06 + lookX * .25, 1.75 + Math.sin(t * .9) * .02 - lookY * .08, camZ);
      cam.rotation.set(-lookY * .08, yaw, 0, 'YXZ');
      // frames paint themselves in as you approach; the nearest one glows
      for (const f of frames) {
        const d = camZ - f.z, target = d < 16 ? Math.min(1, Math.max(0, (16 - d) / 9)) : 0;
        // timed in seconds, not frames, so a slower phone paints the frame in just as fast; and it finishes all the way
        const rt = d < -2 ? 1 : target; f.reveal += (rt - f.reveal) * (1 - Math.pow(.92, dt * 60)); if (Math.abs(rt - f.reveal) < .004) f.reveal = rt;
        f.hover += ((f === hoverF ? 1 : 0) - f.hover) * (1 - Math.pow(.85, dt * 60));
        f.mat.uniforms.uReveal.value = f.reveal >= 1 ? 1.05 : f.reveal; f.mat.uniforms.uHover.value = f.hover;
        f.halo.material.opacity = (.18 + f.reveal * .25 + f.hover * .25) * (1 + p * .3);
      }
      arches.forEach((a, i) => { a.material.opacity = .65 + .35 * Math.max(0, Math.sin(t * 1.6 - i * .5)) + p * .2; });
      floorMat.uniforms.uTime.value = t; floorMat.uniforms.uPulse.value = p;
      rainMat.uniforms.uTime.value = t; starMat.uniforms.uTime.value = t;
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
    window.CORRIDOR = { goTo };
  };
  if (window.THREE) start(); else addEventListener('three-ready', start, { once: true });
})();
