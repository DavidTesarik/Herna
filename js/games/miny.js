'use strict';
/* Miny: první ťuk je vždy bezpečný, pole má nejvýš 8 sloupců kvůli velikosti políček */
(function () {
  const { el } = H;
  const CFG = [[8, 8, 9], [8, 10, 14], [8, 12, 20], [8, 13, 26]]; // sloupce, řádky, miny
  const XP = [30, 60, 100, 150];
  H.register({
    id: 'miny', name: 'Miny', icon: '💣', grad: ['#047857', '#0f766e'], saveable: true, winLose: true, bestFmt: 'time',
    desc: 'Odkryj pole a vyhni se minám',
    diffNames: ['Malé pole', 'Střední pole', 'Velké pole', 'Minové peklo'],
    variant: { name: 'Na čas', desc: 'Běží odpočet. Kdo nestihne, prohrál. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Vyhraj v Minách', kind: 'win' },
    help: 'Číslo říká, kolik min sousedí s políčkem. Dole si přepínáš, jestli ťuknutí odkrývá, nebo dává vlajku. Vlajku položíš i dlouhým stiskem.',
    start(root, ctx) {
      const [W, Hh, M] = CFG[ctx.diff], n = W * Hh, limit = Math.round(n * 2.2);
      let st = ctx.saved || { mines: null, open: Array(n).fill(0), flag: Array(n).fill(0), time: 0, hints: ctx.upg.detector };
      let over = false, flagMode = false, tick = 0, boom = -1;
      const nb = i => { const r = (i / W) | 0, c = i % W, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < Hh && cc >= 0 && cc < W) o.push(rr * W + cc); } return o; };
      const count = i => nb(i).reduce((s, j) => s + st.mines[j], 0);
      const info = el('p', { class: 'g-score' });
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board mines', style: `--n:${W}` });
      let press = 0, longDone = false;
      const cells = st.open.map((_, i) => el('button', {
        class: 'cell', onclick: () => { if (longDone) { longDone = false; return; } tap(i); },
        onpointerdown: () => { longDone = false; press = setTimeout(() => { longDone = true; toggleFlag(i); }, 420); },
        onpointerup: () => clearTimeout(press), onpointerleave: () => clearTimeout(press),
        oncontextmenu: e => { e.preventDefault(); }
      }));
      board.append(...cells);
      const modeBtn = el('button', { class: 'btn big', 'aria-pressed': 'false', onclick: () => { flagMode = !flagMode; paint(); } });
      const hintBtn = el('button', { class: 'btn ghost', onclick: hint });
      root.append(info, status, board, el('div', { class: 'g-actions' }, modeBtn, ctx.upg.detector ? hintBtn : null));
      const paint = () => {
        const flags = st.flag.reduce((a, b) => a + b, 0);
        cells.forEach((c, i) => {
          const o = st.open[i], f = st.flag[i], mine = st.mines && st.mines[i];
          let t = '', cls = 'cell', label = 'zakryté';
          if (o) { const k = count(i); t = k || ''; cls += ' open n' + k; label = k ? k + ' min okolo' : 'prázdné'; }
          else if (f) { t = '🚩'; label = 'vlajka'; }
          if (over && mine && !f) { t = '💣'; cls += i === boom ? ' boom' : ' open'; label = 'mina'; }
          if (over && f && !mine) { t = '✖'; label = 'špatná vlajka'; }
          c.textContent = t; c.className = cls; c.disabled = over || !!o;
          c.setAttribute('aria-label', `Řádek ${((i / W) | 0) + 1}, sloupec ${i % W + 1}: ${label}`);
        });
        info.textContent = `💣 ${M - flags}   ⏱ ${ctx.variant ? H.fmtTime(Math.max(0, limit - st.time)) : H.fmtTime(st.time)}`;
        modeBtn.textContent = flagMode ? '🚩 Režim: VLAJKA' : '⛏ Režim: ODKRÝT';
        modeBtn.setAttribute('aria-pressed', String(flagMode));
        modeBtn.classList.toggle('alt', flagMode);
        hintBtn.textContent = `📡 Nápověda (${st.hints})`;
        hintBtn.disabled = over || !st.hints || !st.mines;
      };
      const lay = safe => {
        const ban = new Set([safe, ...nb(safe)]);
        const pool = H.shuffle([...Array(n).keys()].filter(i => !ban.has(i)));
        st.mines = Array(n).fill(0); pool.slice(0, M).forEach(i => { st.mines[i] = 1; });
      };
      const reveal = i => {
        const stack = [i];
        while (stack.length) {
          const j = stack.pop();
          if (st.open[j] || st.flag[j]) continue;
          st.open[j] = 1;
          if (!count(j)) stack.push(...nb(j));
        }
      };
      const end = (res) => {
        over = true; clearInterval(tick); paint();
        status.textContent = res === 'win' ? 'Pole je čisté!' : 'Bum! Tentokrát to nevyšlo.';
        ctx.end({ result: res, xp: res === 'win' ? XP[ctx.diff] : 8, score: res === 'win' ? st.time : null, lower: true });
      };
      const checkWin = () => { if (st.open.reduce((a, b) => a + b, 0) === n - M) end('win'); else { ctx.save(st); paint(); } };
      const startClock = () => {
        if (tick) return;
        tick = setInterval(() => {
          if (document.hidden || over) return;
          st.time++;
          if (ctx.variant && st.time >= limit) { H.sfx('lose'); return end('loss'); }
          if (st.time % 5 === 0) ctx.save(st);
          paint();
        }, 1000);
      };
      function toggleFlag(i) { if (over || st.open[i]) return; st.flag[i] = st.flag[i] ? 0 : 1; H.sfx('tap'); H.buzz(12); if (st.mines) ctx.save(st); paint(); }
      function tap(i) {
        if (over || st.open[i]) return;
        if (flagMode) return toggleFlag(i);
        if (st.flag[i]) return;
        if (!st.mines) { lay(i); startClock(); }
        if (st.mines[i]) { boom = i; H.sfx('boom'); H.buzz(120); H.shake(board); return end('loss'); }
        H.sfx('place'); reveal(i); checkWin();
      }
      function hint() {
        if (over || !st.hints || !st.mines) return;
        const safe = [...Array(n).keys()].filter(i => !st.open[i] && !st.mines[i]);
        if (!safe.length) return;
        const edge = safe.filter(i => nb(i).some(j => st.open[j]));
        st.hints--;
        const i = H.pick(edge.length ? edge : safe); st.flag[i] = 0; H.sfx('coin'); reveal(i); checkWin();
      }
      if (st.mines) startClock();
      paint();
      status.textContent = ctx.saved ? 'Pokračuješ v rozehrané hře.' : 'První ťuknutí je vždy bezpečné.';
      return { destroy() { clearInterval(tick); clearTimeout(press); over = true; } };
    }
  });
})();
