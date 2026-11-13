'use strict';
/* Efekty motivů: částice na pozadí a jiskry při ťuknutí. Vypnuté při omezených animacích a během her. */
(function () {
  const R = Math.random;
  // [světlý režim, tmavý režim]
  const AMB = {
    ocean: { n: 20, kind: 'bubble', dir: -1, col: [['#1d4ed8', '#0e7490'], ['#7dd3fc', '#bae6fd']], size: [3, 9], speed: [12, 30], alpha: [.25, .6] },
    les: { n: 14, kind: 'leaf', dir: 1, col: [['#15803d', '#4d7c0f', '#a16207'], ['#4ade80', '#a3e635', '#fbbf24']], size: [4, 7], speed: [14, 30], alpha: [.45, .8] },
    zapad: { n: 22, kind: 'dot', dir: -1, col: [['#e11d48', '#ea580c'], ['#fda4af', '#fdba74']], size: [1.2, 3], speed: [6, 16], alpha: [.3, .7] },
    zlato: { n: 26, kind: 'spark', dir: 0, col: [['#b45309', '#ca8a04'], ['#fde047', '#fbbf24', '#fff7ae']], size: [3, 7], speed: [0, 4], alpha: [.5, 1] },
    kyber: { n: 9, kind: 'streak', dir: 2, col: [['#0e7490', '#a21caf'], ['#22d3ee', '#f472b6']], size: [40, 110], speed: [50, 130], alpha: [.25, .55] },
    vesmir: { n: 70, kind: 'star', dir: 0, col: [['#4338ca', '#6d28d9', '#1d4ed8'], ['#ffffff', '#c7d2fe', '#fde68a']], size: [.6, 1.8], speed: [0, 2], alpha: [.4, 1], shoot: true },
    lava: { n: 34, kind: 'ember', dir: -1, col: [['#dc2626', '#ea580c'], ['#f97316', '#fbbf24', '#ef4444']], size: [1.2, 3.4], speed: [22, 60], alpha: [.5, 1] },
    snih: { n: 46, kind: 'dot', dir: 1, col: [['#64748b', '#94a3b8'], ['#ffffff', '#e2e8f0']], size: [1, 2.8], speed: [18, 46], alpha: [.5, .95] },
    aurora: { n: 9, kind: 'orb', dir: 3, col: [['#10b981', '#8b5cf6', '#06b6d4'], ['#34d399', '#a78bfa', '#22d3ee']], size: [90, 170], speed: [6, 14], alpha: [.12, .24] },
    duha: { n: 14, kind: 'orb', dir: 3, col: [['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']], size: [26, 60], speed: [5, 14], alpha: [.1, .22] }
  };
  const TAP = {
    zlato: ['#fde047', '#fbbf24', '#fff7ae'], kyber: ['#22d3ee', '#f472b6'], vesmir: ['#ffffff', '#c7d2fe', '#fde68a'],
    lava: ['#f97316', '#fbbf24', '#ef4444'], duha: ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']
  };
  let bg, top, bx, tx, W = 0, Ht = 0, ambKey = null, theme = 'neon', amb = [], bursts = [], raf = 0, last = 0, dark = true, shootT = 0, frame = 0;
  const rnd = (a, b) => a + R() * (b - a);
  const size = () => {
    const d = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; Ht = innerHeight;
    for (const [c, x] of [[bg, bx], [top, tx]]) { c.width = W * d; c.height = Ht * d; x.setTransform(d, 0, 0, d, 0, 0); }
  };
  const spawn = (cfg, init) => {
    const cols = cfg.col[dark ? 1 : 0], p = { kind: cfg.kind, col: cols[(R() * cols.length) | 0], r: rnd(...cfg.size), a: rnd(...cfg.alpha), ph: R() * 6.28, rot: R() * 6.28, vr: rnd(-1, 1) };
    const sp = rnd(...cfg.speed);
    p.x = R() * W; p.y = R() * Ht; p.vx = 0; p.vy = 0;
    if (cfg.dir === -1) { p.vy = -sp; p.vx = rnd(-4, 4); if (!init) p.y = Ht + 10; }
    else if (cfg.dir === 1) { p.vy = sp; p.vx = rnd(-10, 10); if (!init) p.y = -10; }
    else if (cfg.dir === 2) { p.vx = sp * (R() < .5 ? -1 : 1); p.y = R() * Ht; if (!init) p.x = p.vx > 0 ? -p.r : W + p.r; }
    else if (cfg.dir === 3) { const a = R() * 6.28; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
    return p;
  };
  const spark = (x, cx, cy, r) => { x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill(); };
  const draw = (x, p, t) => {
    let a = p.a;
    if (p.kind === 'spark' || p.kind === 'star' || p.kind === 'ember') a *= .35 + .65 * Math.abs(Math.sin(t * (p.kind === 'ember' ? 5 : 1.6) + p.ph));
    if (p.life != null) a *= Math.max(0, p.life);
    x.globalAlpha = a; x.fillStyle = x.strokeStyle = p.col;
    if (p.kind === 'bubble') { x.lineWidth = 1.2; x.beginPath(); x.arc(p.x + Math.sin(t + p.ph) * 4, p.y, p.r, 0, 6.29); x.stroke(); }
    else if (p.kind === 'leaf') { x.save(); x.translate(p.x + Math.sin(t * .8 + p.ph) * 12, p.y); x.rotate(p.rot + t * p.vr); x.beginPath(); x.ellipse(0, 0, p.r, p.r * .45, 0, 0, 6.29); x.fill(); x.restore(); }
    else if (p.kind === 'spark') spark(x, p.x, p.y, p.r);
    else if (p.kind === 'streak') { x.lineWidth = 1.5; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - Math.sign(p.vx) * p.r, p.y); x.stroke(); }
    else if (p.kind === 'orb') { const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, p.col); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.29); x.fill(); }
    else if (p.kind === 'ring') { x.lineWidth = 2; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.29); x.stroke(); }
    else if (p.kind === 'shoot') { x.lineWidth = 1.6; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * .12, p.y - p.vy * .12); x.stroke(); }
    else { x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.29); x.fill(); }
  };
  const active = () => H.motionOK() && !document.hidden && !document.body.classList.contains('ingame');
  const loop = now => {
    raf = 0;
    if (!active()) { bx.clearRect(0, 0, W, Ht); tx.clearRect(0, 0, W, Ht); bursts = []; return; }
    const cfg = AMB[ambKey];
    if (!cfg && !bursts.length) { bx.clearRect(0, 0, W, Ht); tx.clearRect(0, 0, W, Ht); return; }
    raf = requestAnimationFrame(loop);
    if (++frame % 2) return; // ~30 snímků za sekundu
    const dt = Math.min(.1, (now - last) / 1000 || 0), t = now / 1000; last = now;
    bx.clearRect(0, 0, W, Ht);
    if (cfg) {
      for (let i = 0; i < amb.length; i++) {
        const p = amb[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'shoot') { p.life -= dt * 1.2; if (p.life <= 0) { amb.splice(i--, 1); continue; } }
        else if (p.y < -70 || p.y > Ht + 70 || p.x < -130 || p.x > W + 130) amb[i] = spawn(cfg, false);
        draw(bx, p, t);
      }
      if (cfg.shoot && (shootT -= dt) < 0) { shootT = rnd(4, 9); amb.push({ kind: 'shoot', col: dark ? '#ffffff' : '#4338ca', x: rnd(0, W * .7), y: rnd(0, Ht * .4), vx: rnd(260, 420), vy: rnd(120, 220), a: 1, life: 1, r: 1 }); }
    }
    tx.clearRect(0, 0, W, Ht);
    for (let i = 0; i < bursts.length; i++) {
      const p = bursts[i]; p.life -= dt * (p.kind === 'ring' ? 2.4 : 1.7);
      if (p.life <= 0) { bursts.splice(i--, 1); continue; }
      if (p.kind === 'ring') p.r += dt * 110; else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; }
      draw(tx, p, t);
    }
    bx.globalAlpha = tx.globalAlpha = 1;
  };
  const kick = () => { if (!raf && bg) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const burst = (x, y) => {
    const cols = TAP[theme]; if (!cols || !active()) return;
    if (theme === 'kyber') bursts.push({ kind: 'ring', x, y, r: 6, a: .9, life: 1, col: cols[0] }, { kind: 'ring', x, y, r: 2, a: .9, life: 1, col: cols[1] });
    const n = theme === 'kyber' ? 5 : 11;
    for (let i = 0; i < n; i++) { const a = R() * 6.28, s = rnd(50, 190); bursts.push({ kind: theme === 'lava' ? 'ember' : theme === 'duha' ? 'dot' : 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, r: rnd(2, 5), a: 1, life: 1, ph: R() * 6, col: cols[(R() * cols.length) | 0] }); }
    kick();
  };
  H.fx = {
    set(id, isDark, amb0) {
      if (!bg) {
        bg = H.el('canvas', { id: 'fxbg', 'aria-hidden': 'true' }); top = H.el('canvas', { id: 'fxtop', 'aria-hidden': 'true' });
        document.body.prepend(bg); document.body.append(top);
        bx = bg.getContext('2d'); tx = top.getContext('2d'); size();
        window.addEventListener('resize', () => { size(); H.fx.set(theme, dark, ambKey); });
        document.addEventListener('visibilitychange', kick);
        document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('button')) burst(e.clientX, e.clientY); }, { passive: true });
      }
      theme = id; dark = isDark; ambKey = amb0 === undefined ? id : amb0; amb = []; shootT = 3;
      const cfg = AMB[ambKey];
      if (cfg && H.motionOK()) for (let i = 0; i < cfg.n; i++) amb.push(spawn(cfg, true));
      kick();
    },
    wake: kick
  };
})();
