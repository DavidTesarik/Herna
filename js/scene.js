'use strict';
/* Obrázek sídla kreslený kódem (SVG): od osady po mnohovesmír. Roste se stupněm i uvnitř stupně. */
(function () {
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const f = n => n.toFixed(1);
  const K = { house: ['#fca5a5', '#fdba74', '#fde68a', '#bae6fd', '#ddd6fe', '#fecdd3'], roof: '#b45309', block: ['#64748b', '#475569', '#7c8aa0', '#57534e', '#52627a'], tower: ['#4338ca', '#6d28d9', '#1d4ed8', '#be185d', '#0f766e'],
    ground: ['#22c55e', '#4ade80', '#4b5563'], hill: ['#86efac', '#4ade80'], tree: '#15803d', land: '#166534', light: '#fde047' };
  const STY = {
    klasik: K,
    cihla: { ...K, house: ['#b45309', '#9a3412', '#c2410c', '#a16207', '#92400e', '#b91c1c'], roof: '#292524', block: ['#9a3412', '#7c2d12', '#b45309', '#78350f', '#a16207'], tower: ['#7c2d12', '#9a3412', '#78350f', '#b45309', '#92400e'], land: '#a16207' },
    sever: { ...K, house: ['#f8fafc', '#bfdbfe', '#fecaca', '#e2e8f0', '#fde68a', '#c7d2fe'], roof: '#ffffff', block: ['#94a3b8', '#cbd5e1', '#7dd3fc', '#a5b4fc', '#e2e8f0'], ground: ['#f1f5f9', '#e2e8f0', '#64748b'], hill: ['#e2e8f0', '#f8fafc'], tree: '#0f766e', land: '#e2e8f0', snow: true },
    poust: { ...K, house: ['#fcd34d', '#fdba74', '#fde68a', '#f5d0a9', '#fbbf24', '#fed7aa'], roof: '#c2410c', block: ['#d6a56a', '#c08a52', '#e0b47c', '#b97f47', '#cf9a60'], tower: ['#b45309', '#c2410c', '#a16207', '#9a3412', '#d97706'], ground: ['#fbbf24', '#fcd34d', '#a8a29e'], hill: ['#fdba74', '#fcd34d'], tree: '#65a30d', sky: ['#fb923c', '#fef3c7'], land: '#d97706' },
    cukr: { ...K, house: ['#f9a8d4', '#c4b5fd', '#99f6e4', '#fde68a', '#fda4af', '#a5f3fc'], roof: '#db2777', block: ['#f472b6', '#a78bfa', '#2dd4bf', '#fb7185', '#60a5fa'], tower: ['#db2777', '#7c3aed', '#0d9488', '#e11d48', '#2563eb'], ground: ['#f0abfc', '#f5d0fe', '#a78bfa'], hill: ['#fbcfe8', '#f5d0fe'], tree: '#ec4899', sky: ['#f9a8d4', '#fef9c3'], land: '#f472b6', light: '#ffffff' },
    kyber: { ...K, house: ['#312e81', '#4c1d95', '#1e3a8a', '#831843', '#134e4a', '#3730a3'], roof: '#22d3ee', block: ['#312e81', '#4c1d95', '#1e3a8a', '#831843', '#134e4a'], tower: ['#4c1d95', '#831843', '#1e3a8a', '#701a75', '#155e75'], ground: ['#1e1b4b', '#1e1b4b', '#0f172a'], hill: ['#312e81', '#3730a3'], tree: '#22d3ee', sky: ['#0f0524', '#7e22ce'], land: '#4c1d95', light: '#22d3ee', night: true, lit: '#f0abfc' },
    zlate: { ...K, house: ['#fde047', '#fbbf24', '#fcd34d', '#f59e0b', '#fde68a', '#eab308'], roof: '#a16207', block: ['#eab308', '#ca8a04', '#f59e0b', '#d97706', '#fbbf24'], tower: ['#ca8a04', '#b45309', '#d97706', '#a16207', '#eab308'], land: '#ca8a04', light: '#fff7ae', sparkle: true }
  };
  let P = K, uid = 0;
  const stars = (r, n) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * 320)}" cy="${f(r() * 180)}" r="${f(.3 + r() * .9)}" fill="#fff" opacity="${f(.4 + r() * .6)}"${i % 5 === 0 ? ' class="tw"' : ''}/>`; return s; };
  const space = (r, n) => `<rect width="320" height="180" fill="#050816"/>` + stars(r, n);

  const tree = (x, y, k) => `<rect x="${f(x - 1)}" y="${f(y - 6 * k)}" width="2" height="${f(6 * k)}" fill="#78350f"/><circle cx="${f(x)}" cy="${f(y - 9 * k)}" r="${f(5 * k)}" fill="${P.tree}"/>`;
  const bld = (x, w, h, col, roof, win, lit) => {
    const y = 140 - h; let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col}"/>`;
    if (roof === 'tri') s += `<polygon points="${f(x - 2)},${f(y)} ${f(x + w / 2)},${f(y - w * .55)} ${f(x + w + 2)},${f(y)}" fill="${P.roof}"/>`;
    if (roof === 'spire') s += `<rect x="${f(x + w / 2 - .6)}" y="${f(y - 12)}" width="1.2" height="12" fill="${col}"/><circle cx="${f(x + w / 2)}" cy="${f(y - 12)}" r="1.2" fill="#f87171" class="tw"/>`;
    if (win) for (let wy = y + 4; wy < 134; wy += 7) for (let wx = x + 2.5; wx < x + w - 3; wx += 5) s += `<rect x="${f(wx)}" y="${f(wy)}" width="2.4" height="3.2" fill="${lit}" opacity="${((wx * 7 + wy * 13) | 0) % 4 ? 1 : .25}"/>`;
    else if (h > 9) s += `<rect x="${f(x + w / 2 - 1.6)}" y="${f(134)}" width="3.2" height="6" fill="#451a03"/><rect x="${f(x + 2)}" y="${f(y + 3)}" width="3" height="3" fill="${lit}"/>`;
    return s;
  };
  const ground = (s, t, r) => {
    const SKY = [['#7dd3fc', '#e0f2fe'], ['#7dd3fc', '#e0f2fe'], ['#60a5fa', '#dbeafe'], ['#60a5fa', '#e0e7ff'], ['#f97316', '#fde68a'], ['#1e1b4b', '#6d28d9']][s];
    const night = s === 5 || !!P.night, lit = P.lit || (night || s === 4 ? '#fde68a' : '#e0f2fe'), sk = P.sky && (P.night || s < 4) ? P.sky : SKY;
    let o = `<defs><linearGradient id="sky${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sk[0]}"/><stop offset="1" stop-color="${sk[1]}"/></linearGradient></defs><rect width="320" height="180" fill="url(#sky${uid})"/>`;
    if (night) o += stars(r, 40);
    o += `<circle cx="264" cy="${s === 4 ? 96 : 34}" r="${s === 4 ? 22 : 15}" fill="${night ? '#f1f5f9' : '#fde047'}"/>`;
    if (s < 3) o += `<path d="M0 140 Q50 ${96 - s * 4} 110 128 T220 120 T320 132 V140 Z" fill="${P.hill[0]}"/><path d="M0 140 Q80 112 160 134 T320 124 V140 Z" fill="${P.hill[1]}"/>`;
    else { let x = 0; while (x < 320) { const w = 8 + r() * 14, h = 20 + r() * (s === 5 ? 95 : s === 4 ? 60 : 35); o += `<rect x="${f(x)}" y="${f(140 - h)}" width="${f(w)}" height="${f(h)}" fill="${night ? '#312e81' : s === 4 ? '#9a3412' : '#93c5fd'}" opacity=".75"/>`; x += w + r() * 3; } }
    o += `<rect y="140" width="320" height="40" fill="${P.ground[s < 2 ? 0 : s === 2 ? 1 : 2]}"/>`;
    if (s === 0) o += `<path d="M0 162 Q160 150 320 166" stroke="#a16207" stroke-width="5" fill="none" opacity=".7"/>`;
    else o += `<rect y="152" width="320" height="${s < 3 ? 9 : 14}" fill="${s < 3 ? '#a8a29e' : '#1f2937'}"/>` + (s >= 3 ? `<path d="M0 159 H320" stroke="#fde047" stroke-width="1.2" stroke-dasharray="9 7"/>` : '');
    const n = [3, 6, 10, 13, 16, 20][s] + Math.round(t * [3, 4, 4, 4, 5, 6][s]), step = 300 / n;
    const COL = P.house, CITY = P.block, NEON = P.tower;
    for (let i = 0; i < n; i++) {
      const x = 10 + i * step + r() * step * .25, w = Math.min(step * .78, 9 + r() * 9);
      if (s === 0) { const h = 10 + r() * 5; o += `<polygon points="${f(x)},140 ${f(x + w / 2)},${f(140 - h)} ${f(x + w)},140" fill="${COL[i % 3]}" stroke="#7c2d12" stroke-width=".8"/><path d="M${f(x + w / 2)} 140 V${f(140 - h * .5)}" stroke="#7c2d12" stroke-width="1"/>`; if (i % 2) o += tree(x + w + 6, 140, 1.2); }
      else if (s === 1) { o += bld(x, w, 9 + r() * 4, COL[i % 6], 'tri', false, lit); if (i % 2) o += tree(x + w + 4, 140, 1); }
      else if (s === 2) { if (i === (n >> 1)) o += bld(x, 8, 30, '#e7e5e4', 'tri', false, lit); else o += bld(x, w, 10 + r() * 9, COL[i % 6], 'tri', r() > .6, lit); if (i % 4 === 1) o += tree(x + w + 3, 140, .9); }
      else if (s === 3) o += r() < .3 ? bld(x, w, 11 + r() * 5, COL[i % 6], 'tri', false, lit) : bld(x, w, 20 + r() * 28, CITY[i % 5], 'flat', true, lit);
      else if (s === 4) o += bld(x, w, 28 + r() * 52, CITY[i % 5], r() < .25 ? 'spire' : 'flat', true, lit);
      else o += bld(x, w, 45 + r() * 78, NEON[i % 5], r() < .45 ? 'spire' : 'flat', true, i % 3 ? '#fde68a' : '#67e8f9');
    }
    if (s === 0) o += `<circle cx="160" cy="166" r="4" fill="#f97316" class="tw"/><path d="M154 170 H166" stroke="#451a03" stroke-width="2"/>`;
    if (s >= 3) for (let i = 0; i < 2 + s; i++) o += `<rect x="${f(r() * 300)}" y="${i % 2 ? 153.5 : 160.5}" width="9" height="4" rx="1.5" fill="${COL[i % 6]}"/>`;
    if (P.snow) for (let i = 0; i < 45; i++) o += `<circle cx="${f(r() * 320)}" cy="${f(r() * 150)}" r="${f(.6 + r() * .9)}" fill="#fff" opacity=".9"${i % 3 === 0 ? ' class="tw"' : ''}/>`;
    if (P.sparkle) for (let i = 0; i < 16; i++) { const x = r() * 320, y = 30 + r() * 105, q = 1.5 + r() * 2.5; o += `<path d="M${f(x)} ${f(y - q)} L${f(x + q * .3)} ${f(y - q * .3)} L${f(x + q)} ${f(y)} L${f(x + q * .3)} ${f(y + q * .3)} L${f(x)} ${f(y + q)} L${f(x - q * .3)} ${f(y + q * .3)} L${f(x - q)} ${f(y)} L${f(x - q * .3)} ${f(y - q * .3)}Z" fill="#fff" class="tw"/>`; }
    return o;
  };
  const blob = (r, cx, cy, rad, col) => { let d = ''; const k = 9; for (let i = 0; i <= k; i++) { const a = i / k * 6.283, q = rad * (.65 + r() * .5); d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * q * 1.5) + ' ' + f(cy + Math.sin(a) * q); } return `<path d="${d}Z" fill="${col}" stroke-linejoin="round" stroke="${col}" stroke-width="6"/>`; };
  const country = (t, r) => {
    let o = `<rect width="320" height="180" fill="#0c4a6e"/>` + blob(r, 150, 92, 58, P.land) + blob(r, 215, 70, 26, P.land) + blob(r, 95, 120, 22, P.land);
    const n = 6 + Math.round(t * 12), pts = [];
    for (let i = 0; i < n; i++) pts.push([95 + r() * 130, 55 + r() * 75]);
    for (let i = 1; i < n; i++) o += `<path d="M${f(pts[i - 1][0])} ${f(pts[i - 1][1])} L${f(pts[i][0])} ${f(pts[i][1])}" stroke="#fde68a" stroke-width=".7" opacity=".55"/>`;
    pts.forEach((p, i) => { o += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${i ? 2.4 : 4.5}" fill="${P.light}" stroke="#fff7ed" stroke-width=".6"${i % 3 === 0 ? ' class="tw"' : ''}/>`; });
    return o + `<path d="M20 30 q8 -6 16 0 t16 0" stroke="#7dd3fc" fill="none"/><path d="M262 150 q8 -6 16 0 t16 0" stroke="#7dd3fc" fill="none"/>`;
  };
  const planet = (t, r) => {
    let o = space(r, 70) + `<defs><radialGradient id="pg${uid}" cx=".35" cy=".3"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0c2a6b"/></radialGradient><clipPath id="pc${uid}"><circle cx="160" cy="92" r="62"/></clipPath></defs>`;
    o += `<circle cx="160" cy="92" r="68" fill="#38bdf8" opacity=".18"/><circle cx="160" cy="92" r="62" fill="url(#pg${uid})"/><g clip-path="url(#pc${uid})">` + blob(r, 135, 70, 24, P.land) + blob(r, 190, 110, 20, P.land) + blob(r, 120, 130, 14, P.land);
    for (let i = 0, n = 10 + Math.round(t * 30); i < n; i++) o += `<circle cx="${f(105 + r() * 110)}" cy="${f(45 + r() * 95)}" r="1.3" fill="${P.light}"${i % 4 === 0 ? ' class="tw"' : ''}/>`;
    o += `</g><ellipse cx="160" cy="92" rx="96" ry="22" fill="none" stroke="#94a3b8" stroke-width=".6" stroke-dasharray="3 4"/><g class="orbit" style="transform-origin:160px 92px"><rect x="252" y="89" width="8" height="4" fill="#e2e8f0"/><rect x="248" y="90" width="3" height="2" fill="#38bdf8"/><rect x="261" y="90" width="3" height="2" fill="#38bdf8"/></g>`;
    return o;
  };
  const solar = (t, r) => {
    let o = space(r, 80) + `<defs><radialGradient id="sg${uid}"><stop offset="0" stop-color="#fff7ae"/><stop offset=".6" stop-color="#fbbf24"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient></defs><circle cx="160" cy="90" r="30" fill="url(#sg${uid})"/>`;
    const P = [[42, '#a8a29e', 3], [64, '#38bdf8', 5], [88, '#f87171', 4], [116, '#fbbf24', 8], [146, '#93c5fd', 6]], col = 1 + Math.round(t * 4);
    P.forEach(([rad, c, size], i) => {
      const a = r() * 6.283, x = 160 + Math.cos(a) * rad, y = 90 + Math.sin(a) * rad * .5;
      o += `<ellipse cx="160" cy="90" rx="${rad}" ry="${rad * .5}" fill="none" stroke="#475569" stroke-width=".6"/>`;
      if (i < col) o += `<circle cx="${f(x)}" cy="${f(y)}" r="${size + 3.5}" fill="none" stroke="#fde047" stroke-width="1.2" class="tw"/>`;
      o += `<circle cx="${f(x)}" cy="${f(y)}" r="${size}" fill="${c}"/>`;
    });
    return o;
  };
  const galaxy = (t, r) => {
    let o = space(r, 50) + `<defs><radialGradient id="gg${uid}"><stop offset="0" stop-color="#fef3c7"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient></defs><g class="spin" style="transform-origin:160px 90px">`;
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 90; i++) {
      const a = i * .09 + arm * 2.094, rad = 6 + i * .9, x = 160 + Math.cos(a) * rad * 1.35 + (r() - .5) * 9, y = 90 + Math.sin(a) * rad * .62 + (r() - .5) * 6;
      o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.5 + r() * 1.1)}" fill="${['#e0e7ff', '#a5b4fc', '#f0abfc'][i % 3]}" opacity="${f(.5 + r() * .5)}"/>`;
    }
    for (let i = 0, n = 4 + Math.round(t * 16); i < n; i++) { const a = r() * 6.283, rad = 12 + r() * 70; o += `<circle cx="${f(160 + Math.cos(a) * rad * 1.35)}" cy="${f(90 + Math.sin(a) * rad * .62)}" r="2" fill="#fde047" class="tw"/>`; }
    return o + `</g><circle cx="160" cy="90" r="22" fill="url(#gg${uid})"/>`;
  };
  const mini = (r, x, y, s, col) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r() * 180)})"><ellipse rx="${f(s * 1.8)}" ry="${f(s * .7)}" fill="${col}" opacity=".35"/><ellipse rx="${f(s)}" ry="${f(s * .4)}" fill="${col}" opacity=".7"/><circle r="${f(s * .25)}" fill="#fff"/></g>`;
  const universe = (t, r) => {
    let o = space(r, 110); const n = 6 + Math.round(t * 8), pts = [];
    for (let i = 0; i < n; i++) { const p = [20 + r() * 280, 18 + r() * 144]; pts.push(p); o += mini(r, p[0], p[1], 4 + r() * 7, ['#a5b4fc', '#f0abfc', '#7dd3fc', '#fde68a'][i % 4]); }
    for (let i = 1; i < n; i++) o += `<path d="M${f(pts[i - 1][0])} ${f(pts[i - 1][1])} L${f(pts[i][0])} ${f(pts[i][1])}" stroke="#fde047" stroke-width=".5" opacity=".5" stroke-dasharray="2 3"/>`;
    return o;
  };
  const multi = (t, r) => {
    let o = `<rect width="320" height="180" fill="#020617"/>`; const n = 5 + Math.round(t * 6);
    for (let i = 0; i < n; i++) {
      const x = 30 + r() * 260, y = 28 + r() * 124, rad = 16 + r() * 22, c = ['#a78bfa', '#38bdf8', '#f472b6', '#34d399', '#fbbf24'][i % 5];
      o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${c}" opacity=".16" stroke="${c}" stroke-width="1.2"/>`;
      for (let k = 0; k < 9; k++) { const a = r() * 6.283, q = r() * rad * .8; o += `<circle cx="${f(x + Math.cos(a) * q)}" cy="${f(y + Math.sin(a) * q)}" r=".8" fill="#fff"${k % 4 === 0 ? ' class="tw"' : ''}/>`; }
      o += mini(r, x, y, rad * .22, c);
    }
    return o;
  };
  /* stage 0..11, t = postup uvnitř stupně 0..1 */
  H.scene = (stage, t, label, style) => {
    P = STY[style || (H.S && H.S.active.city)] || K; uid++;
    const r = rng(1234 + stage * 77);
    const body = stage <= 5 ? ground(stage, t, r) : stage === 6 ? country(t, r) : stage === 7 ? planet(t, r) : stage === 8 ? solar(t, r) : stage === 9 ? galaxy(t, r) : stage === 10 ? universe(t, r) : multi(t, r);
    return `<svg class="scene" viewBox="0 0 320 180" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  };
})();
