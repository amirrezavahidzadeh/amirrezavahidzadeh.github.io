/* ─────────────────────────────────────────────────────────────
   SCROLL: continuous, scroll-linked scenes. Nothing here runs on a
   timer: every transform is a function of scroll position, smoothed,
   so scrolling back plays everything in reverse.
   ───────────────────────────────────────────────────────────── */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const ease = t => 1 - Math.pow(1 - t, 3);              // ease-out cubic
  const bump = t => 4 * t * (1 - t);                      // 0 → 1 → 0
  const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 760;

  // only touch the DOM when a value actually changes
  const put = (el, prop, v) => { const c = el.__c || (el.__c = {}); if (c[prop] !== v) { c[prop] = v; el.style[prop] = v; } };
  const Y = () => window.VY != null ? window.VY : scrollY;
  let vh = innerHeight, sy = Y(), vel = 0, lastY = sy;
  let secs = [], hero = null, free = [];

  // per-section entrance, written as transforms of e (0 = off below, 1 = in place)
  // reveals use a scale on the section and the inverse scale on its contents: it looks exactly like a
  // wipe, but runs on the GPU compositor instead of repainting every frame
  const K = k => Math.max(.004, k);
  const FX = {
    about(s, e) { const k = ease(e); s.tf = `scale(1,${(.02 + .98 * Math.min(1, k * 1.15)).toFixed(4)})`; s.fx = 1 - k; },
    writer(s, e) { const k = K(ease(e)); s.tf = `scaleX(${k.toFixed(4)})`; s.in = k < 1 ? `scaleX(${(1 / k).toFixed(4)})` : ''; s.org = '0 0'; s.fxT = `translateX(${(-(1 - k) * s.w).toFixed(1)}px)`; s.fx = k < .995 ? 1 : 0; },
    bazar(s, e) { const k = K(ease(e)); s.tf = `scaleX(${k.toFixed(4)})`; s.in = k < 1 ? `scaleX(${(1 / k).toFixed(4)})` : ''; s.org = '50% 0'; s.fx = bump(clamp(e * 1.1 - .1)); s.fxBg = `${(250 - 400 * clamp(e)).toFixed(1)}% 0`; },
    siavash(s, e) { const k = K(ease(e)); s.tf = `scaleY(${k.toFixed(4)})`; s.in = k < 1 ? `scaleY(${(1 / k).toFixed(4)})` : ''; s.org = '0 0'; s.fx = 1 - k; s.fxT = `translateY(${(-(1 - k) * s.h).toFixed(1)}px)`; },
    edu(s, e) { const k = ease(e), r = 1 - k; s.tf = `translateX(${(r * 60).toFixed(2)}%) skewX(${(-r * 8).toFixed(2)}deg)`; s.fx = bump(clamp(e)); },
    crew(s, e) { const k = ease(e); s.tf = `perspective(1400px) rotateX(${(-(1 - k) * 78).toFixed(2)}deg)`; s.fx = 1 - k; },
    chess(s, e) { const k = ease(e); s.tf = `translateY(${((1 - k) * 160).toFixed(1)}px)`; s.fx = 1 - k * .85; s.op = clamp(e * 1.6); },
  };

  let docH = 1;
  function measure() {
    vh = innerHeight; docH = document.documentElement.scrollHeight;
    // offsetTop ignores transforms, so measuring works mid-animation
    const absTop = el => { let t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };
    secs.forEach(s => { s.top = absTop(s.el); s.h = s.el.offsetHeight; s.w = s.el.offsetWidth; s.kids.forEach(k => { k.top = absTop(k.el) - s.top; }); });
    free.forEach(f => { f.top = absTop(f.el); });
  }

  function setup() {
    secs = $$('.rsec').map(el => ({ el, inner: $('.rsec-in', el), kind: el.dataset.fx, rfx: $('.rfx', el), kids: $$('.stg', el).slice(0, 14).map(k => ({ el: k, c: 0 })), e: 0, x: 0 }));
    free = $$('.arc-h, #arcade').map(el => ({ el, e: 0 }));
    const nameWords = $$('.hn-w');
    hero = { parts: $$('.hero > *').filter(x => !x.classList.contains('hero-name')), w: nameWords, name: $('.hero-name'), h: 0 };
    document.documentElement.classList.add('js-scrub');
    measure();
  }

  function frame() {
    sy = Y();
    const dy = sy - lastY; lastY = sy;
    vel += (Math.abs(dy) - vel) * .12;
    if (window.CITY && CITY.boost) CITY.boost(Math.min(6, vel / 6));
    let busy = vel > .05;

    // hero: the name splits apart and the city leans in as you leave it
    if (hero) {
      const th = clamp(sy / (vh * .85)); hero.h += (th - hero.h) * .2; if (Math.abs(th - hero.h) > .001) busy = true;
      const h = hero.h, k = ease(h);
      const live = h > .0005 && h < .9995, wc = live ? 'transform,opacity' : 'auto';
      if (hero.w[0]) { put(hero.w[0], 'transform', `translateX(${(-k * 22).toFixed(2)}vw)`); put(hero.w[0], 'willChange', wc); }
      if (hero.w[1]) { put(hero.w[1], 'transform', `translateX(${(k * 22).toFixed(2)}vw)`); put(hero.w[1], 'willChange', wc); }
      if (hero.name) { put(hero.name, 'transform', `scale(${(1 + k * .35).toFixed(4)})`); put(hero.name, 'opacity', (1 - clamp(h * 1.25)).toFixed(3)); put(hero.name, 'willChange', wc); }
      hero.parts.forEach((p, i) => { put(p, 'transform', `translateY(${(-k * (40 + i * 26)).toFixed(1)}px)`); put(p, 'opacity', (1 - clamp(h * (1.5 + i * .15))).toFixed(3)); put(p, 'willChange', wc); });
      const city = document.getElementById('city');
      if (city) { put(city, 'transform', `scale(${(1 + k * .14 + clamp(sy / (docH - vh)) * .06).toFixed(4)}) translateY(${(-k * 3).toFixed(2)}%)`); put(city, 'willChange', 'transform'); }
    }

    // sections: themed entrance, children drifting in, and a recede as they leave
    const corrMode = document.body.classList.contains('corridor');
    for (const s of corrMode ? [] : secs) {
      if (s.top > sy + vh * 1.6 || s.top + s.h < sy - vh * .6) continue;
      const te = clamp((sy + vh - s.top) / (vh * (MOBILE ? .7 : .85)));
      const tx = clamp((sy + vh * .15 - (s.top + s.h - vh * .25)) / (vh * .75));
      s.e += (te - s.e) * .16; s.x += (tx - s.x) * .16;
      if (Math.abs(te - s.e) < .0008) s.e = te; else busy = true;
      if (Math.abs(tx - s.x) < .0008) s.x = tx; else busy = true;
      s.tf = ''; s.in = ''; s.org = ''; s.fx = 0; s.fxT = ''; s.fxBg = ''; s.op = 1;
      (FX[s.kind] || FX.chess)(s, s.e);
      const x = ease(s.x);
      const exitT = x ? `translateY(${(-x * 50).toFixed(1)}px) scale(${(1 - x * .07).toFixed(4)}) ` : '';
      const moving = (s.e > 0 && s.e < 1) || (s.x > 0 && s.x < 1);
      put(s.el, 'willChange', moving ? 'transform,opacity' : 'auto');
      put(s.el, 'transform', (exitT + s.tf).trim() || 'none');
      if (s.org) put(s.el, 'transformOrigin', s.org);
      put(s.el, 'opacity', (s.e < .002 && s.in ? 0 : s.op * (1 - x * .65)).toFixed(3));
      if (s.inner) { put(s.inner, 'transform', s.in || 'none'); put(s.inner, 'transformOrigin', s.org || '0 0'); put(s.inner, 'willChange', s.in ? 'transform' : 'auto'); }
      if (s.rfx) { put(s.rfx, 'opacity', s.fx.toFixed(3)); put(s.rfx, 'transform', s.fxT || ''); if (s.fxBg) put(s.rfx, 'backgroundPosition', s.fxBg); }
      // children follow, each a little later than the one before
      for (const k of s.kids) {
        const tc = clamp((sy + vh - s.top - k.top) / (vh * .3));
        k.c += (tc - k.c) * .18; if (Math.abs(tc - k.c) < .001) k.c = tc; else busy = true;
        const c = ease(k.c);
        put(k.el, 'transform', c < 1 ? `translateY(${((1 - c) * 46).toFixed(1)}px)` : '');
        put(k.el, 'opacity', c < 1 ? (.08 + c * .92).toFixed(3) : '');
        put(k.el, 'willChange', c > 0 && c < 1 ? 'transform,opacity' : 'auto');
      }
    }
    for (const f of free) {
      const te = clamp((sy + vh - f.top) / (vh * .7)); f.e += (te - f.e) * .16; if (Math.abs(te - f.e) > .001) busy = true; else f.e = te;
      const c = ease(f.e); put(f.el, 'transform', c < 1 ? `translateY(${((1 - c) * 70).toFixed(1)}px)` : ''); put(f.el, 'opacity', c.toFixed(3));
    }
    running = busy;
    if (busy) requestAnimationFrame(frame);
  }
  let running = false;
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  function start() { setup(); kick(); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('vscroll', kick);
  addEventListener('resize', () => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
  if ('ResizeObserver' in window) { let t = 0; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { measure(); kick(); }, 120); }).observe(document.body); }
  // the résumé is rendered by main.js once content loads
  const wait = () => { if (document.querySelector('.rsec')) start(); else setTimeout(wait, 60); };
  wait();
})();
