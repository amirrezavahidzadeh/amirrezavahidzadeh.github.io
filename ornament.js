/* ─────────────────────────────────────────────────────────────
   ORNAMENT: Persian eslimi (arabesque) vines, girih stars and
   corner lunettes, drawn as neon line-work and pulsing on the beat.
   ───────────────────────────────────────────────────────────── */
(() => {
  const CY = '#22f3ff', MG = '#ff2bd6', GD = '#ffc94d';
  const url = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const star = (cx, cy, r, sw, col) => { // khatam: two overlapping squares = 8-pointed star
    const sq = a => [0, 1, 2, 3].map(i => { const t = a + i * Math.PI / 2; return `${(cx + Math.cos(t) * r).toFixed(2)},${(cy + Math.sin(t) * r).toFixed(2)}`; }).join(' ');
    return `<polygon points="${sq(0)}" fill="none" stroke="${col}" stroke-width="${sw}"/><polygon points="${sq(Math.PI / 4)}" fill="none" stroke="${col}" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${(r * .32).toFixed(2)}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
  };

  // vertical eslimi strip: S-curving stem, spiral curls, split palmettes (khatayi), ruled borders
  const side = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="112" viewBox="0 0 56 112" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#g)">
    <path d="M3 0V112M53 0V112" stroke="${GD}" stroke-width="1.4"/>
    <path d="M7 0V112M49 0V112" stroke="${GD}" stroke-width=".6" opacity=".55"/>
    <path d="M3 52l2.4 4-2.4 4-2.4-4zM53 108l2.4 4-2.4 4-2.4-4zM53 -4l2.4 4-2.4 4-2.4-4z" fill="${GD}" stroke="none"/>
    <path d="M28 0C44 18 44 38 28 56C12 74 12 94 28 112" stroke="${CY}" stroke-width="1.8"/>
    <path d="M39 22C46 13 53 21 47 28C43 32 37 27 42 24" stroke="${MG}" stroke-width="1.5"/>
    <path d="M17 78C10 69 3 77 9 84C13 88 19 83 14 80" stroke="${MG}" stroke-width="1.5"/>
    <path d="M38 35Q29 36 25 45Q34 43 38 35ZM38 35Q38 43 32 49" stroke="${CY}" stroke-width="1.2"/>
    <path d="M18 91Q27 90 31 81Q22 83 18 91ZM18 91Q18 83 24 77" stroke="${CY}" stroke-width="1.2"/>
    <path d="M36 14Q31 8 33 2M20 98Q25 104 23 110" stroke="${MG}" stroke-width="1" opacity=".8"/>
    <circle cx="44" cy="47" r="1.6" fill="${MG}" stroke="none"/><circle cx="12" cy="65" r="1.6" fill="${MG}" stroke="none"/>
    ${star(28, 56, 5.5, 1.1, GD)}
  </g></svg>`;

  // horizontal girih band: a chain of 8-pointed stars joined by rules
  const band = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="22" viewBox="0 0 48 22" fill="none"><defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#g)">
    <path d="M0 1.5H48M0 20.5H48" stroke="${GD}" stroke-width="1"/>
    <path d="M0 11H15M33 11H48" stroke="${CY}" stroke-width="1.2"/>
    ${star(24, 11, 7.5, 1.2, MG)}
    <path d="M0 8l3 3-3 3M48 8l-3 3 3 3" stroke="${CY}" stroke-width="1"/>
  </g></svg>`;

  // corner lunette: quarter medallion with an eslimi curl and a star (top-left; CSS mirrors it)
  const corner = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none" stroke-linecap="round"><defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#g)">
    <path d="M2 74A72 72 0 0 1 74 2" stroke="${GD}" stroke-width="1.6"/>
    <path d="M2 62A60 60 0 0 1 62 2" stroke="${GD}" stroke-width=".7" opacity=".6"/>
    <path d="M6 58C14 44 26 40 34 44C40 47 38 55 32 54C27 53 29 47 33 48" stroke="${CY}" stroke-width="1.6"/>
    <path d="M58 6C44 14 40 26 44 34C47 40 55 38 54 32C53 27 47 29 48 33" stroke="${CY}" stroke-width="1.6"/>
    <path d="M30 30Q38 22 50 22Q42 30 30 30ZM30 30Q22 38 22 50Q30 42 30 30Z" stroke="${MG}" stroke-width="1.3"/>
    ${star(15, 15, 9, 1.3, MG)}
    <circle cx="66" cy="20" r="1.6" fill="${GD}"/><circle cx="20" cy="66" r="1.6" fill="${GD}"/><circle cx="49" cy="49" r="1.8" fill="${GD}"/>
  </g></svg>`;

  // toranj: the central medallion between the hero and the arcade
  const petals = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, b = a + Math.PI / 16, c = a - Math.PI / 16; const P = (t, r) => `${(60 + Math.cos(t) * r).toFixed(1)} ${(60 + Math.sin(t) * r).toFixed(1)}`; return `<path d="M${P(c, 30)}Q${P(a, 52)} ${P(b, 30)}" stroke="${i % 2 ? CY : MG}" stroke-width="1.3"/>`; }).join('');
  const toranj = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="-10 -10 140 140" fill="none"><defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#g)">
    <circle cx="60" cy="60" r="56" stroke="${GD}" stroke-width="1.2"/><circle cx="60" cy="60" r="30" stroke="${GD}" stroke-width=".8" opacity=".7"/>
    ${petals}${star(60, 60, 20, 1.5, CY)}${star(60, 60, 11, 1, MG)}
  </g></svg>`;

  const R = document.documentElement.style;
  R.setProperty('--orn-side', url(side)); R.setProperty('--orn-band', url(band));
  R.setProperty('--orn-corner', url(corner)); R.setProperty('--orn-toranj', url(toranj));

  // the two vine strips down the sides of the screen
  ['l', 'r'].forEach(k => { const d = document.createElement('div'); d.className = `orn-side orn-${k}`; d.setAttribute('aria-hidden', 'true'); document.body.prepend(d); });
  // corner lunettes on the boot screen and the game panel
  for (const host of [document.querySelector('.boot-in'), document.getElementById('ovPanel')]) if (host) ['tl', 'tr', 'bl', 'br'].forEach(k => { const c = document.createElement('i'); c.className = `orn-c ${k}`; c.setAttribute('aria-hidden', 'true'); host.append(c); });
  // a medallion divider between the hero and the arcade
  const arc = document.getElementById('arcade'); if (arc) { const d = document.createElement('div'); d.className = 'orn-div'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<span></span><i></i><span></span>'; arc.before(d); }

  // the vines flare on every kick drum
  const strips = document.querySelectorAll('.orn-side, .orn-div'); let kickT = 0;
  if (window.SND) SND.on((type, e) => { if (type === 'step' && e.hit.k) { strips.forEach(s => s.classList.add('kick')); clearTimeout(kickT); kickT = setTimeout(() => strips.forEach(s => s.classList.remove('kick')), 110); } });
})();
