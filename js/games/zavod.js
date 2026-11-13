'use strict';
/* Závod: tři pruhy, překážky, mince a soupeř řízený počítačem */
(function () {
  const { el } = H;
  const LW = 300, LH = 470, LANES = [70, 150, 230], PY = 380, VMAX = 520, LEN = VMAX * 36;
  const RIVAL = [0.74, 0.83, 0.9, 0.955], GAP = [340, 295, 255, 225], DOUBLE = [0, 0.15, 0.3, 0.45];
  H.register({
    id: 'zavod', name: 'Závod', icon: '🏎️', grad: ['#1d4ed8', '#0369a1'], vsAI: true, bestFmt: 'sec', realtime: true,
    desc: 'Předjeď soupeře do cíle',
    variant: { name: 'Noční jízda', desc: 'Vidíš jen kousek před sebe. Mince se počítají dvakrát.', level: 2 },
    help: 'Šipkami dole (nebo ťuknutím na levou či pravou půlku dráhy) měníš pruh. Vyhni se překážkám, náraz tě hodně zpomalí. Sbírej mince a buď v cíli dřív než soupeř.',
    start(root, ctx) {
      const car = ctx.skin('car');
      const info = el('p', { class: 'g-score', role: 'status' });
      const bar = el('div', { class: 'racebar', 'aria-hidden': 'true' }, el('span', { class: 'rb me' }, '🟢'), el('span', { class: 'rb pc' }, '🤖'), el('span', { class: 'rb fin' }, '🏁'));
      const cv = el('canvas', { class: 'board cv', role: 'img', 'aria-label': 'Závodní dráha' });
      const status = el('p', { class: 'g-status' }, 'Zmáčkni šipku a závod začne.');
      const mk = (d, label) => el('button', { class: 'steerb', 'aria-label': label, onpointerdown: e => { e.preventDefault(); steer(d); }, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); steer(d); } } }, H.ico(d));
      root.append(info, bar, cv, status, el('div', { class: 'steer' }, mk('left', 'Doleva'), mk('right', 'Doprava')));
      const scale = Math.min((root.clientWidth || 340), 420, (innerHeight - 250) * LW / LH) / LW, dpr = window.devicePixelRatio || 1;
      cv.width = LW * scale * dpr; cv.height = LH * scale * dpr; cv.style.width = LW * scale + 'px'; cv.style.height = LH * scale + 'px';
      const x = cv.getContext('2d'); x.scale(scale * dpr, scale * dpr);
      let lane = 1, px = LANES[1], v = 0, dist = 0, rdist = 0, rlane = 0, time = 0, coins = 0, shield = ctx.upg.shield;
      let running = false, over = false, raf = 0, last = 0, flash = 0, next = 500;
      const objs = []; // {d, lane, type:'car'|'cone'|'coin', hit}
      const magnet = ctx.upg.magnet;
      const gen = () => {
        while (next < dist + 900 && next < LEN - 300) {
          const l = H.rnd(3);
          objs.push({ d: next, lane: l, type: Math.random() < 0.5 ? 'car' : 'cone', col: H.pick(['#64748b', '#0ea5e9', '#a855f7', '#f97316']) });
          if (Math.random() < DOUBLE[ctx.diff]) objs.push({ d: next, lane: (l + 1 + H.rnd(2)) % 3, type: 'cone' });
          if (Math.random() < 0.7) objs.push({ d: next + GAP[ctx.diff] / 2, lane: H.rnd(3), type: 'coin' });
          next += GAP[ctx.diff] * (0.85 + Math.random() * 0.4);
        }
      };
      const drawCar = (cx, cy, body, stripe, alpha) => {
        x.globalAlpha = alpha; x.fillStyle = '#0b0f19';
        for (const [ox, oy] of [[-19, -22], [15, -22], [-19, 12], [15, 12]]) x.fillRect(cx + ox, cy + oy, 5, 12);
        x.fillStyle = body; x.beginPath(); x.roundRect(cx - 16, cy - 30, 32, 60, 9); x.fill();
        x.fillStyle = stripe; x.fillRect(cx - 3, cy - 30, 6, 60);
        x.fillStyle = 'rgba(15,23,42,.75)'; x.beginPath(); x.roundRect(cx - 11, cy - 14, 22, 14, 4); x.fill();
        x.globalAlpha = 1;
      };
      const draw = () => {
        x.fillStyle = '#166534'; x.fillRect(0, 0, LW, LH);
        x.fillStyle = '#374151'; x.fillRect(30, 0, 240, LH);
        x.fillStyle = '#f8fafc'; x.fillRect(30, 0, 4, LH); x.fillRect(266, 0, 4, LH);
        const off = dist % 60;
        for (const lx of [110, 190]) for (let y = -60; y < LH + 60; y += 60) x.fillRect(lx - 2, y + off, 4, 30);
        const fy = PY - (LEN - dist);
        if (fy > -40) { for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111827' : '#ffffff'; x.fillRect(30 + i * 20, fy + j * 14, 20, 14); } }
        for (const o of objs) {
          const y = PY - (o.d - dist); if (y < -50 || y > LH + 50 || o.hit) continue;
          const cx = LANES[o.lane];
          if (o.type === 'coin') { x.fillStyle = '#facc15'; x.beginPath(); x.arc(cx, y, 11, 0, 7); x.fill(); x.fillStyle = '#a16207'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center'; x.fillText('★', cx, y + 5); }
          else if (o.type === 'cone') { x.fillStyle = '#f97316'; x.beginPath(); x.moveTo(cx, y - 18); x.lineTo(cx + 15, y + 14); x.lineTo(cx - 15, y + 14); x.fill(); x.fillStyle = '#fff'; x.fillRect(cx - 8, y - 2, 16, 5); }
          else drawCar(cx, y, o.col, '#e2e8f0', 1);
        }
        const ry = PY - (rdist - dist);
        if (ry > -50 && ry < LH + 50) { drawCar(LANES[rlane] + 0, ry, '#111827', '#f43f5e', .55); x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('PC', LANES[rlane], ry + 24); }
        if (!(flash > 0 && Math.floor(flash * 12) % 2)) drawCar(px, PY, car.c, car.s, 1);
        if (shield > 0) { x.strokeStyle = '#67e8f9'; x.lineWidth = 3; x.beginPath(); x.arc(px, PY, 40, 0, 7); x.stroke(); }
        if (ctx.variant) {
          const g = x.createRadialGradient(px, PY - 70, 40, px, PY - 70, 190);
          g.addColorStop(0, 'rgba(2,6,23,0)'); g.addColorStop(1, 'rgba(2,6,23,.96)');
          x.fillStyle = g; x.fillRect(0, 0, LW, LH);
        }
        info.textContent = `⏱ ${time.toFixed(1)} s   🪙 ${coins}` + (shield > 0 ? `   🛡 ${shield}` : '');
        const pm = Math.min(1, dist / LEN) * 88, pr = Math.min(1, rdist / LEN) * 88;
        bar.children[0].style.left = pm + '%'; bar.children[1].style.left = pr + '%';
      };
      const finish = res => {
        over = true; running = false; draw();
        status.textContent = res === 'win' ? 'První v cíli!' : 'Soupeř byl rychlejší.';
        ctx.end({ result: res, coins: coins * (ctx.variant ? 2 : 1), score: res === 'win' ? Math.round(time * 10) / 10 : null, lower: true });
      };
      const loop = t => {
        if (!running) return;
        const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
        if (!document.hidden && !ctx.paused) {
          time += dt; flash = Math.max(0, flash - dt);
          v = Math.min(VMAX, v + 300 * dt);
          dist += v * dt; rdist += VMAX * RIVAL[ctx.diff] * (0.97 + 0.06 * Math.sin(time * 0.7)) * dt;
          if (Math.random() < dt * 0.4) rlane = H.rnd(3);
          px += (LANES[lane] - px) * Math.min(1, dt * 18);
          gen();
          for (const o of objs) {
            if (o.hit) continue;
            const dy = o.d - dist;
            if (o.type === 'coin') {
              const reach = o.lane === lane ? 34 : magnet === 3 ? 60 : magnet && Math.abs(o.lane - lane) === 1 ? (magnet === 1 ? 26 : 60) : -1;
              if (Math.abs(dy) < reach) { o.hit = true; if (coins < 40) coins++; H.sfx('coin'); }
            } else if (o.lane === lane && Math.abs(dy) < 46 && Math.abs(px - LANES[lane]) < 30) {
              o.hit = true;
              if (shield > 0) { shield--; H.sfx('tap'); }
              else { v = VMAX * 0.25; flash = 0.8; H.sfx('bad'); H.buzz(60); H.shake(cv); }
            }
          }
          while (objs.length && objs[0].d < dist - 200) objs.shift();
          if (dist >= LEN) return finish(rdist >= LEN ? 'loss' : 'win');
          if (rdist >= LEN) return finish('loss');
        }
        draw(); raf = requestAnimationFrame(loop);
      };
      const steer = d => {
        if (over) return;
        if (!running) { running = true; last = performance.now(); status.textContent = ''; ctx.touch(); raf = requestAnimationFrame(loop); }
        if (d === 'left' && lane > 0) lane--; else if (d === 'right' && lane < 2) lane++;
      };
      H.swipe(cv, (d, e) => {
        if (d === 'tap') { if (!running) return steer('tap'); const r = cv.getBoundingClientRect(); d = e.clientX < r.left + r.width / 2 ? 'left' : 'right'; }
        steer(d);
      });
      const offKeys = H.keys(steer);
      gen(); draw();
      return { destroy() { running = false; over = true; cancelAnimationFrame(raf); offKeys(); } };
    }
  });
})();
