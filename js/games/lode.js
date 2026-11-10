'use strict';
/* Lodě proti počítači. Lodě se nesmějí dotýkat, zásah znamená další výstřel. */
(function () {
  const { el } = H;
  H.register({
    id: 'lode', name: 'Lodě', icon: '🚢', grad: ['#1e40af', '#3730a3'], vsAI: true, saveable: true,
    desc: 'Potop flotilu počítače',
    variant: { name: 'Velké moře', desc: 'Pole 10×10 a šest lodí místo pěti. Delší bitva.', level: 2 },
    help: 'Ťukni na políčko v horním poli a vystřelíš. Zásah znamená, že střílíš znovu. Lodě se nikde nedotýkají, ani rohem. Vyhrává, kdo první potopí celou flotilu soupeře.',
    start(root, ctx) {
      const N = ctx.variant ? 10 : 8, FLEET = ctx.variant ? [5, 4, 3, 3, 2, 2] : [4, 3, 3, 2, 2];
      const around = i => { const r = (i / N) | 0, c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } return o; };
      const place = () => {
        for (;;) {
          const grid = Array(N * N).fill(-1), ships = []; let ok = true;
          for (const len of FLEET) {
            let done = false;
            for (let t = 0; t < 200 && !done; t++) {
              const h = Math.random() < .5, r = H.rnd(h ? N : N - len + 1), c = H.rnd(h ? N - len + 1 : N);
              const cs = Array.from({ length: len }, (_, k) => (r + (h ? 0 : k)) * N + c + (h ? k : 0));
              if (cs.some(i => around(i).some(j => grid[j] >= 0))) continue;
              cs.forEach(i => { grid[i] = ships.length; }); ships.push({ cells: cs, hits: 0 }); done = true;
            }
            if (!done) { ok = false; break; }
          }
          if (ok) return { grid, ships };
        }
      };
      let st = ctx.saved || { me: place(), ai: place(), sMe: Array(N * N).fill(0), sAi: Array(N * N).fill(0), turn: ctx.aiFirst ? 2 : 1, fired: false };
      let over = false; const timers = [];
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const fire = (side, shots, i) => {
        const s = side.grid[i];
        if (s < 0) { shots[i] = 1; return 'miss'; }
        const ship = side.ships[s]; ship.hits++; shots[i] = 2;
        if (ship.hits < ship.cells.length) return 'hit';
        ship.cells.forEach(j => { shots[j] = 3; around(j).forEach(k => { if (!shots[k]) shots[k] = 1; }); });
        return 'sunk';
      };
      const left = side => side.ships.filter(s => s.hits < s.cells.length).length;
      const status = el('p', { class: 'g-status', role: 'status' });
      const info = el('p', { class: 'g-score' });
      const enemy = el('div', { class: 'board sea', style: `--n:${N}`, role: 'grid', 'aria-label': 'Moře počítače' });
      const cells = st.sMe.map((_, i) => el('button', { class: 'cell', onclick: () => human(i) }));
      enemy.append(...cells);
      const mine = el('div', { class: 'sea mini', style: `--n:${N}`, 'aria-hidden': 'true' });
      const mcells = st.sAi.map(() => el('span', { class: 'cell' })); mine.append(...mcells);
      const mix = el('button', { class: 'btn small ghost', text: '🔀 Jinak rozmístit moje lodě', onclick: () => { if (st.fired) return; st.me = place(); paint(); } });
      root.append(info, status, enemy, el('p', { class: 'muted', text: 'Tvoje flotila a střely počítače:' }), mine, el('div', { class: 'g-actions' }, mix));
      const SYM = ['', '•', '✸', '✖'], LAB = ['neznámé', 'voda', 'zásah', 'potopeno'];
      const paint = () => {
        cells.forEach((c, i) => {
          const s = st.sMe[i];
          c.textContent = SYM[s]; c.className = 'cell s' + s; c.disabled = over || st.turn !== 1 || !!s;
          c.setAttribute('aria-label', `${String.fromCharCode(65 + i % N)}${((i / N) | 0) + 1}: ${LAB[s]}`);
        });
        mcells.forEach((c, i) => { const s = st.sAi[i]; c.textContent = SYM[s]; c.className = 'cell s' + s + (st.me.grid[i] >= 0 ? ' ship' : ''); });
        info.textContent = `Tvoje lodě ${left(st.me)}   Lodě počítače ${left(st.ai)}`;
        mix.hidden = st.fired;
      };
      const say = t => { status.textContent = t; };
      const finish = res => { over = true; paint(); say(res === 'win' ? 'Flotila počítače je na dně!' : 'Počítač potopil všechny tvoje lodě.'); ctx.end({ result: res }); };
      const human = i => {
        if (over || st.turn !== 1 || st.sMe[i]) return;
        st.fired = true;
        const r = fire(st.ai, st.sMe, i);
        H.sfx(r === 'miss' ? 'tap' : r === 'sunk' ? 'boom' : 'match'); if (r !== 'miss') H.buzz(r === 'sunk' ? 60 : 20);
        if (!left(st.ai)) return finish('win');
        if (r === 'miss') { st.turn = 2; ctx.save(st); paint(); return aiTurn(); }
        ctx.save(st); paint(); say(r === 'sunk' ? 'Potopená! Střílíš znovu.' : 'Zásah! Střílíš znovu.');
      };
      const aiPick = () => {
        const free = st.sAi.map((s, i) => s ? -1 : i).filter(i => i >= 0);
        if (ctx.diff === 0) return H.pick(free);
        if (ctx.diff === 1) {
          const t = [];
          st.sAi.forEach((s, i) => { if (s === 2) for (const d of [-N, N, -1, 1]) { const j = i + d; if (j >= 0 && j < N * N && !st.sAi[j] && (Math.abs(d) !== 1 || ((j / N) | 0) === ((i / N) | 0))) t.push(j); } });
          return H.pick(t.length ? t : free);
        }
        const w = Array(N * N).fill(0);
        for (const ship of st.me.ships) {
          if (ship.hits >= ship.cells.length) continue;
          const len = ship.cells.length;
          for (let h = 0; h < 2; h++) for (let r = 0; r < (h ? N : N - len + 1); r++) for (let c = 0; c < (h ? N - len + 1 : N); c++) {
            let k = 0, ok = true; const cs = [];
            for (let q = 0; q < len; q++) { const i = (r + (h ? 0 : q)) * N + c + (h ? q : 0), s = st.sAi[i]; if (s === 1 || s === 3) { ok = false; break; } if (s === 2) k++; cs.push(i); }
            if (!ok) continue;
            const wt = Math.pow(30, k);
            for (const i of cs) if (!st.sAi[i]) w[i] += wt;
          }
        }
        const ranked = free.sort((a, b) => w[b] - w[a]);
        return ctx.diff === 2 ? H.pick(ranked.slice(0, 3)) : ranked[0];
      };
      const aiTurn = () => {
        say('Střílí počítač…');
        later(() => {
          if (over) return;
          const r = fire(st.me, st.sAi, aiPick());
          H.sfx(r === 'miss' ? 'tap' : 'bad');
          if (!left(st.me)) return finish('loss');
          if (r === 'miss') { st.turn = 1; ctx.save(st); paint(); return say('Počítač minul. Střílíš ty.'); }
          ctx.save(st); paint(); aiTurn();
        }, 650);
      };
      paint();
      if (st.turn === 2) aiTurn(); else say(ctx.saved ? 'Pokračuješ v rozehrané bitvě. Střílíš ty.' : 'Začínáš. Vyber políčko.');
      return { destroy() { timers.forEach(clearTimeout); over = true; } };
    }
  });
})();
