/* ─────────────────────────────────────────────────────────────
   TABRIZ: a Persian Tabriz carpet drawn in neon light, for the corridor floor.
   Classic layout: a lobed central medallion (toranj) with pendants (sar-toranj),
   quarter medallions in the corners (lachak), a field of spiralling arabesque
   vines (eslimi) and blossoms (khatai), and a wide main border (hashieh) between
   guard stripes, with a fringe at both ends. Like a real carpet, the field is
   designed in one quarter and mirrored four ways.
   TABRIZ.paint(w, h) returns a canvas: glowing lines on a near-black ground.
   ───────────────────────────────────────────────────────────── */
(() => {
  const C = { cyan: '#22f3ff', mag: '#ff2bd6', gold: '#ffc94a', violet: '#9d5cff', red: '#ff3b5c', ink: '#06030f' };
  const TAU = Math.PI * 2;

  function paint(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    let g = cv.getContext('2d'); if (!g) return null;
    const k = w / 1024;                       // everything is designed on a 1024-wide carpet
    g.lineCap = 'round'; g.lineJoin = 'round';

    // neon stroke: a wide soft pass, then a bright core (cheaper than shadowBlur, same look)
    const neon = (path, col, lw, glow = 1) => {
      g.save(); g.strokeStyle = col;
      g.globalAlpha = .22 * glow; g.lineWidth = lw * 4.2; path(); g.stroke();
      g.globalAlpha = .45 * glow; g.lineWidth = lw * 2; path(); g.stroke();
      g.globalAlpha = 1; g.lineWidth = lw; path(); g.stroke();
      g.globalAlpha = .9; g.strokeStyle = '#fff'; g.lineWidth = lw * .35; path(); g.stroke();
      g.restore();
    };
    const fillA = (path, col, a) => { g.save(); g.globalAlpha = a; g.fillStyle = col; path(); g.fill(); g.restore(); };

    // ground
    g.fillStyle = C.ink; g.fillRect(0, 0, w, h);

    // ── geometry ──
    const fr = 34 * k;                        // fringe length at each end
    const x0 = 14 * k, y0 = fr, x1 = w - 14 * k, y1 = h - fr;
    const gb = 16 * k, mb = 92 * k;           // guard band, main border
    const fx0 = x0 + gb * 2 + mb, fy0 = y0 + gb * 2 + mb, fx1 = x1 - gb * 2 - mb, fy1 = y1 - gb * 2 - mb;
    const cx = w / 2, cy = h / 2;
    const rect = (a, b, c, d) => () => { g.beginPath(); g.rect(a, b, c - a, d - b); };

    // fringe
    g.save(); g.strokeStyle = C.gold; g.globalAlpha = .55; g.lineWidth = 2.2 * k;
    for (let x = x0 + 6 * k; x < x1; x += 9 * k) { const j = Math.sin(x * .7) * 3 * k;
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + j, y0 - fr + 4 * k); g.stroke(); g.beginPath(); g.moveTo(x, y1); g.lineTo(x - j, y1 + fr - 4 * k); g.stroke(); }
    g.restore();

    // field ground: the deep Tabriz red, glowing faintly
    const fg = g.createRadialGradient(cx, cy, 40 * k, cx, cy, Math.hypot(fx1 - cx, fy1 - cy));
    fg.addColorStop(0, 'rgba(120,10,60,.55)'); fg.addColorStop(1, 'rgba(60,4,40,.35)');
    g.fillStyle = fg; g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    // border ground: indigo
    g.save(); g.fillStyle = 'rgba(40,20,110,.5)'; g.beginPath(); g.rect(x0 + gb, y0 + gb, x1 - x0 - 2 * gb, y1 - y0 - 2 * gb); g.rect(fx0 - gb, fy0 - gb, fx1 - fx0 + 2 * gb, fy1 - fy0 + 2 * gb); g.fill('evenodd'); g.restore();

    // ── borders: guard stripes and the main border ──
    neon(rect(x0, y0, x1, y1), C.cyan, 3.2 * k);
    neon(rect(x0 + gb, y0 + gb, x1 - gb, y1 - gb), C.cyan, 2 * k, .8);
    neon(rect(fx0 - gb, fy0 - gb, fx1 + gb, fy1 + gb), C.cyan, 2 * k, .8);
    neon(rect(fx0, fy0, fx1, fy1), C.gold, 3 * k);
    // guard stripes: tiny reciprocal trefoils
    const guard = (ax, ay, bx, by, inset) => {
      const len = Math.hypot(bx - ax, by - ay), n = Math.round(len / (22 * k)), ux = (bx - ax) / len, uy = (by - ay) / len;
      for (let i = 0; i < n; i++) { const t = (i + .5) / n * len, px = ax + ux * t + -uy * inset, py = ay + uy * t + ux * inset;
        neon(() => { g.beginPath(); g.arc(px, py, 2.6 * k, 0, TAU); }, i % 2 ? C.mag : C.gold, 1.6 * k, .7); }
    };
    const ring = (ax, ay, bx, by, off) => { guard(ax, ay + off, bx, ay + off, 0); guard(ax, by - off, bx, by - off, 0); guard(ax + off, ay, ax + off, by, 0); guard(bx - off, ay, bx - off, by, 0); };
    ring(x0, y0, x1, y1, gb / 2); ring(fx0 - gb, fy0 - gb, fx1 + gb, fy1 + gb, gb / 2);

    // main border: rosettes on a running vine (an S-scroll between them), corner rosettes
    const rosette = (x, y, r, col, petals = 8, col2 = C.gold) => {
      neon(() => { g.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, rr = r * (.62 + .38 * Math.abs(Math.cos(a * petals / 2))); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + rr, y); } g.closePath(); }, col, 2.4 * k);
      neon(() => { g.beginPath(); g.arc(x, y, r * .3, 0, TAU); }, col2, 2 * k);
      fillA(() => { g.beginPath(); g.arc(x, y, r * .3, 0, TAU); }, col2, .35);
    };
    const bmx0 = x0 + gb * 2, bmy0 = y0 + gb * 2, bmx1 = x1 - gb * 2, bmy1 = y1 - gb * 2;   // main border box
    const band = (ax, ay, bx, by) => {          // one side of the main border, from corner to corner along its centre line
      const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / (118 * k))), ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
      const amp = mb * .28, pts = 160;
      neon(() => { g.beginPath(); for (let i = 0; i <= pts; i++) { const t = i / pts, s = Math.sin(t * n * Math.PI) * amp;
        const px = ax + ux * t * len + nx * s, py = ay + uy * t * len + ny * s; i ? g.lineTo(px, py) : g.moveTo(px, py); } }, C.violet, 2.4 * k);
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, side = i % 2 ? -1 : 1, px = ax + ux * t * len + nx * amp * side * .95, py = ay + uy * t * len + ny * amp * side * .95;
        // a leaf curling off the vine at each crest
        const lx = ax + ux * t * len - nx * amp * side * .55, ly = ay + uy * t * len - ny * amp * side * .55;
        neon(() => { g.beginPath(); g.ellipse(lx, ly, 15 * k, 6 * k, Math.atan2(uy, ux) + side * .6, 0, TAU); }, C.cyan, 1.8 * k, .8);
        rosette(px, py, 25 * k, i % 2 ? C.mag : C.red, 8);
      }
    };
    const mcx0 = bmx0 + mb / 2, mcy0 = bmy0 + mb / 2, mcx1 = bmx1 - mb / 2, mcy1 = bmy1 - mb / 2;
    band(mcx0 + mb / 2, mcy0, mcx1 - mb / 2, mcy0); band(mcx0 + mb / 2, mcy1, mcx1 - mb / 2, mcy1);
    band(mcx0, mcy0 + mb / 2, mcx0, mcy1 - mb / 2); band(mcx1, mcy0 + mb / 2, mcx1, mcy1 - mb / 2);
    [[mcx0, mcy0], [mcx1, mcy0], [mcx0, mcy1], [mcx1, mcy1]].forEach(([x, y]) => { neon(() => { g.beginPath(); g.rect(x - mb * .36, y - mb * .36, mb * .72, mb * .72); }, C.gold, 2 * k, .8); rosette(x, y, 28 * k, C.mag, 12, C.cyan); });

    // ── the field, designed in the top-left quarter and mirrored four ways ──
    const qw = Math.ceil(cx - fx0), qh = Math.ceil(cy - fy0);
    const q = document.createElement('canvas'); q.width = qw; q.height = qh; const qg = q.getContext('2d');
    const G = g; let gg = qg;                 // draw helpers into the quarter canvas for this part
    const N = (path, col, lw, glow = 1) => { const s = g; g = gg; neon(path, col, lw, glow); g = s; };
    const F = (path, col, a) => { const s = g; g = gg; fillA(path, col, a); g = s; };
    // eslimi: a spiral vine with leaves, curling from (x, y)
    const spiral = (x, y, r0, turns, a0, dir, col, leaf) => {
      const pts = [];
      for (let i = 0; i <= 90; i++) { const t = i / 90, a = a0 + dir * t * turns * TAU, r = r0 * (1 - t * .82); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, a]); }
      N(() => { gg.beginPath(); pts.forEach(([px, py], i) => i ? gg.lineTo(px, py) : gg.moveTo(px, py)); }, col, 2.6 * k);
      for (let i = 12; i < 80; i += 17) { const [px, py, a] = pts[i];
        N(() => { gg.beginPath(); gg.ellipse(px + Math.cos(a) * 12 * k, py + Math.sin(a) * 12 * k, 13 * k, 5 * k, a + dir * .9, 0, TAU); }, leaf, 1.8 * k, .8); }
      const [ex, ey] = pts[pts.length - 1];
      N(() => { gg.beginPath(); gg.arc(ex, ey, 5 * k, 0, TAU); }, C.gold, 2 * k);
    };
    const qrose = (x, y, r, col, petals) => { const s = g; g = gg; rosette(x, y, r, col, petals); g = s; };
    // the corner quarter-medallion (lachak)
    const lr = Math.min(qw, qh) * .52;
    const lobe = (a, R) => R * (1 + .07 * Math.pow(Math.abs(Math.cos(a * 8)), 3));
    F(() => { gg.beginPath(); gg.moveTo(0, 0); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI / 2, rr = lobe(a, lr); gg.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } gg.closePath(); }, '#2a0c6b', .55);
    N(() => { gg.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI / 2, rr = lobe(a, lr); i ? gg.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : gg.moveTo(rr, 0); } }, C.cyan, 3 * k);
    N(() => { gg.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI / 2, rr = lobe(a, lr * .72); i ? gg.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : gg.moveTo(rr, 0); } }, C.gold, 1.8 * k, .8);
    spiral(lr * .3, lr * .3, lr * .26, 1.1, 0, 1, C.mag, C.cyan);
    qrose(lr * .55, lr * .1, 20 * k, C.gold, 8); qrose(lr * .1, lr * .55, 20 * k, C.gold, 8);
    // vines and blossoms filling the quarter between the corner and the medallion
    spiral(qw * .78, qh * .22, qw * .2, 1.25, Math.PI, -1, C.violet, C.cyan);
    spiral(qw * .26, qh * .7, qw * .2, 1.25, 0, 1, C.violet, C.cyan);
    spiral(qw * .7, qh * .55, qw * .16, 1.1, Math.PI * .5, 1, C.cyan, C.mag);
    qrose(qw * .5, qh * .36, 26 * k, C.red, 8); qrose(qw * .86, qh * .82, 22 * k, C.mag, 6); qrose(qw * .45, qh * .9, 18 * k, C.gold, 6);
    // khatai palmettes along the centre lines (they meet their mirror image)
    const palm = (x, y, s, rot, col) => N(() => { gg.save(); gg.translate(x, y); gg.rotate(rot); gg.beginPath();
      gg.moveTo(0, -s); gg.bezierCurveTo(s * .8, -s * .6, s * .9, s * .4, 0, s * .2); gg.bezierCurveTo(-s * .9, s * .4, -s * .8, -s * .6, 0, -s);
      gg.moveTo(0, -s * .55); gg.lineTo(0, s * .1); gg.restore(); }, col, 2.2 * k);
    palm(qw - 2, qh * .18, 30 * k, Math.PI / 2, C.gold); palm(qw * .2, qh - 2, 30 * k, 0, C.gold);
    { let sd = 41; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const mrx = (fx1 - fx0) * .36, mry = (fy1 - fy0) * .31;
      for (let i = 0, made = 0; i < 400 && made < 22; i++) {
        const x = r() * qw, y = r() * qh;
        if (Math.hypot(x, y) < lr * 1.08) continue;                                         // the corner piece
        if (Math.pow((qw - x) / mrx, 2) + Math.pow((qh - y) / mry, 2) < 1.1) continue;     // the medallion
        made++;
        if (made % 3) { const a = r() * TAU; N(() => { gg.beginPath(); gg.ellipse(x - Math.cos(a) * 8 * k, y - Math.sin(a) * 8 * k, 11 * k, 4.5 * k, a, 0, TAU); gg.moveTo(x + Math.cos(a) * 19 * k, y + Math.sin(a) * 19 * k); gg.ellipse(x + Math.cos(a) * 8 * k, y + Math.sin(a) * 8 * k, 11 * k, 4.5 * k, a, 0, TAU); }, made % 2 ? C.cyan : C.violet, 1.6 * k, .75); }
        else qrose(x, y, (10 + r() * 7) * k, [C.gold, C.red, C.mag][made % 3], 6);
      } }
    // place the quarter four ways
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => { G.save(); G.translate(cx, cy); G.scale(sx, sy); G.drawImage(q, -qw, -qh); G.restore(); });
    g = G;

    // ── the central medallion (toranj) with its pendants ──
    const rx = (fx1 - fx0) * .33, ry = (fy1 - fy0) * .27;
    const shamseh = (sx, sy, n, amp) => () => { g.beginPath();
      for (let i = 0; i <= 720; i++) { const a = i / 720 * TAU, c = Math.cos(a), s = Math.sin(a);
        const se = Math.pow(Math.pow(Math.abs(c), 1.35) + Math.pow(Math.abs(s), 1.35), -1 / 1.35);   // between a diamond and an ellipse
        const rr = se * (1 + amp * .6 * Math.pow(Math.abs(Math.cos(a * n / 2)), 6) + .018 * Math.abs(Math.cos(a * n * 1.5)));
        const px = cx + c * rr * sx, py = cy + s * rr * sy; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); };
    // pendants first, so the medallion sits over their stems
    [-1, 1].forEach(d => {
      const py = cy + d * (ry * 1.08 + 50 * k);
      fillA(() => { g.beginPath(); g.ellipse(cx, py, 50 * k, 34 * k, 0, 0, TAU); }, C.mag, .2);
      neon(() => { g.beginPath(); g.ellipse(cx, py, 50 * k, 34 * k, 0, 0, TAU); }, C.mag, 2.6 * k);
      neon(() => { g.beginPath(); g.moveTo(cx, py + d * 34 * k); g.lineTo(cx, py + d * 92 * k); }, C.gold, 2.4 * k);
      rosette(cx, py + d * 104 * k, 16 * k, C.gold, 6, C.mag);
      rosette(cx, py, 20 * k, C.cyan, 8, C.gold);
    });
    fillA(shamseh(rx, ry, 16, .14), '#3a0a5c', .7);
    neon(shamseh(rx, ry, 16, .14), C.mag, 3.6 * k);
    neon(shamseh(rx * .86, ry * .86, 16, .12), C.gold, 2 * k, .85);
    fillA(shamseh(rx * .55, ry * .55, 12, .16), '#071a3a', .8);
    neon(shamseh(rx * .55, ry * .55, 12, .16), C.cyan, 2.6 * k);
    // inside: eight vines radiating round a central rosette
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + TAU / 16, x = cx + Math.cos(a) * rx * .68, y = cy + Math.sin(a) * ry * .68;
      neon(() => { g.beginPath(); g.moveTo(cx + Math.cos(a) * rx * .58, cy + Math.sin(a) * ry * .58); g.quadraticCurveTo(cx + Math.cos(a + .3) * rx * .72, cy + Math.sin(a + .3) * ry * .72, x, y); }, C.violet, 2 * k, .8);
      rosette(x, y, 13 * k, i % 2 ? C.cyan : C.red, 6, C.gold);
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU;
      neon(() => { g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * .3, cy + Math.sin(a) * ry * .3, 12 * k, 5 * k, a, 0, TAU); }, C.gold, 1.8 * k, .8); }
    rosette(cx, cy, 40 * k, C.mag, 12, C.cyan);
    rosette(cx, cy, 20 * k, C.gold, 8, '#fff');
    return cv;
  }

  window.TABRIZ = { paint };
})();
