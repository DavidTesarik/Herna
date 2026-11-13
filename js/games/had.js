'use strict';
/* Had na canvasu */
(function () {
  const { el } = H;
  const W = 15, Hh = 19, SPEED = [170, 125, 95, 68];
  H.register({
    id: 'had', name: 'Had', icon: '🐍', grad: ['#15803d', '#166534'], realtime: true,
    desc: 'Jez jablka a nenaraz',
    diffNames: ['Pomalý', 'Svižný', 'Rychlý', 'Šílený'],
    variant: { name: 'Portály', desc: 'Zdi nezabíjejí. Had vyjede na druhé straně.', level: 2 },
    quest: { n: 12, text: 'Sněz 12 jablek v Hadovi' },
    help: 'Přejeď prstem směrem, kam má had zatočit (na počítači šipky). Červené jablko je za 1 bod, zlaté za 3 a brzy zmizí. Nenaraz do zdi ani do sebe.',
    start(root, ctx) {
      const info = el('p', { class: 'g-score', role: 'status' });
      const status = el('p', { class: 'g-status' }, 'Přejeď prstem a had vyrazí.');
      const cv = el('canvas', { class: 'board cv', role: 'img', 'aria-label': 'Herní plocha hada' });
      root.classList.add('swipe');
      root.append(info, status, cv);
      const cell = Math.floor(Math.min(root.clientWidth || 340, 440, (innerHeight - 150) * W / Hh) / W), dpr = window.devicePixelRatio || 1;
      cv.width = W * cell * dpr; cv.height = Hh * cell * dpr; cv.style.width = W * cell + 'px'; cv.style.height = Hh * cell + 'px';
      const x = cv.getContext('2d'); x.scale(dpr, dpr);
      const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc-text').trim() || '#8b5cf6';
      let snake = [[7, 10], [7, 11], [7, 12]], dir = null, queue = [], apple, gold = null, score = 0, eaten = 0, over = false, timer = 0;
      const free = () => { for (;;) { const p = [H.rnd(W), H.rnd(Hh)]; if (!snake.some(s => s[0] === p[0] && s[1] === p[1]) && !(apple && apple[0] === p[0] && apple[1] === p[1])) return p; } };
      apple = free();
      const draw = () => {
        const dark = document.documentElement.dataset.mode === 'dark';
        x.fillStyle = dark ? '#111827' : '#e5e7eb'; x.fillRect(0, 0, W * cell, Hh * cell);
        x.fillStyle = dark ? '#1f2937' : '#d1d5db';
        for (let r = 0; r < Hh; r++) for (let c = (r % 2); c < W; c += 2) x.fillRect(c * cell, r * cell, cell, cell);
        const dot = (p, col, k) => { x.fillStyle = col; x.beginPath(); x.arc(p[0] * cell + cell / 2, p[1] * cell + cell / 2, cell * k, 0, 7); x.fill(); };
        dot(apple, '#ef4444', .4);
        if (gold) dot(gold.p, '#f59e0b', .28 + .12 * Math.abs(Math.sin(gold.t / 3)));
        snake.forEach((s, i) => {
          x.fillStyle = i ? acc : (dark ? '#ffffff' : '#111827');
          const pad = i ? 1.5 : .5; x.beginPath();
          x.roundRect(s[0] * cell + pad, s[1] * cell + pad, cell - pad * 2, cell - pad * 2, cell * .3); x.fill();
        });
        info.textContent = `Jablka ${score}`;
      };
      const die = () => {
        over = true; clearInterval(timer); H.sfx('lose'); H.buzz(100); H.shake(cv);
        status.textContent = 'Konec hry.';
        ctx.end({ result: 'done', score, xp: Math.min(250, score * (2 + ctx.diff) + 5), flags: { snake30: score >= 30 } });
      };
      const step = () => {
        if (over || document.hidden || ctx.paused || !dir) return;
        if (queue.length) { const d = queue.shift(); if (d[0] !== -dir[0] || d[1] !== -dir[1]) dir = d; }
        let nx = snake[0][0] + dir[0], ny = snake[0][1] + dir[1];
        if (ctx.variant) { nx = (nx + W) % W; ny = (ny + Hh) % Hh; }
        else if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) return die();
        const grow = nx === apple[0] && ny === apple[1], g = gold && nx === gold.p[0] && ny === gold.p[1];
        if (!grow && !g) snake.pop();
        if (snake.some(s => s[0] === nx && s[1] === ny)) return die();
        snake.unshift([nx, ny]);
        if (grow) { score++; eaten++; H.sfx('coin'); H.buzz(10); apple = free(); if (eaten % 5 === 0 && !gold) gold = { p: free(), t: 45 }; }
        if (g) { score += 3; gold = null; H.sfx('match'); H.buzz(20); }
        if (gold && --gold.t <= 0) gold = null;
        draw();
      };
      const turn = d => {
        if (over || d === 'tap') return;
        const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[d];
        if (!dir) { if (d === 'down') return; dir = v; status.textContent = ''; ctx.touch(); return; }
        if (queue.length < 2) queue.push(v);
      };
      H.swipe(root, turn);
      const offKeys = H.keys(turn);
      timer = setInterval(step, SPEED[ctx.diff]);
      draw();
      return { destroy() { clearInterval(timer); offKeys(); over = true; } };
    }
  });
})();
