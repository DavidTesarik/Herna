'use strict';
/* 2048 s plynulým posunem dlaždic */
(function () {
  const { el } = H;
  H.register({
    id: 'g2048', name: '2048', icon: '🧮', grad: ['#b45309', '#92400e'], saveable: true, noDiff: true,
    desc: 'Spojuj stejná čísla',
    variant: { name: 'Mini 3×3', desc: 'Menší pole, mnohem méně místa. Odměny jsou dvojnásobné.', level: 2 },
    quest: { n: 1500, text: 'Získej 1 500 bodů ve 2048' },
    help: 'Přejeď prstem a všechny dlaždice se posunou tím směrem. Dvě stejné se spojí v jednu dvojnásobnou. Hra končí, když už nejde táhnout.',
    start(root, ctx) {
      const n = ctx.variant ? 3 : 4;
      let uid = 1, over = false;
      let st = ctx.saved || { tiles: [], score: 0, undos: ctx.undos, hist: [], top: 0 };
      st.tiles.forEach(t => { t.id = uid++; });
      const info = el('p', { class: 'g-score', role: 'status' });
      const board = el('div', { class: 'board t48', style: `--n:${n}`, tabindex: '0', 'aria-label': 'Hrací pole 2048. Ovládej šipkami nebo přejetím prstu.' });
      for (let i = 0; i < n * n; i++) board.append(el('span', { class: 'bg' }));
      const layer = el('div', { class: 'tiles' }); board.append(layer);
      const undoBtn = el('button', { class: 'btn ghost', onclick: undo });
      root.append(info, board, el('div', { class: 'g-actions' }, ctx.undosMax ? undoBtn : null));
      const dom = new Map();
      const at = (r, c) => st.tiles.find(t => t.r === r && t.c === c && !t.dead);
      const spawn = () => {
        const free = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!at(r, c)) free.push([r, c]);
        if (!free.length) return;
        const [r, c] = H.pick(free);
        st.tiles.push({ id: uid++, v: Math.random() < 0.9 ? 2 : 4, r, c, fresh: true });
      };
      const paint = () => {
        const alive = new Set();
        for (const t of st.tiles) {
          alive.add(t.id);
          let d = dom.get(t.id);
          if (!d) { d = el('span', { class: 'tl' }); dom.set(t.id, d); layer.append(d); }
          d.textContent = t.v;
          d.className = 'tl v' + Math.min(t.v, 4096) + (t.fresh ? ' fresh' : '') + (t.pop ? ' pop' : '') + (t.dead ? ' dead' : '');
          d.style.transform = `translate(${t.c * 100}%, ${t.r * 100}%)`;
          t.fresh = t.pop = false;
        }
        for (const [id, d] of dom) if (!alive.has(id)) { d.remove(); dom.delete(id); }
        info.textContent = `Skóre ${st.score}`;
        undoBtn.textContent = `↩ Vrátit tah (${st.undos})`;
        undoBtn.disabled = over || !st.undos || !st.hist.length;
      };
      const canMove = () => {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
          const t = at(r, c); if (!t) return true;
          const a = at(r + 1, c), b = at(r, c + 1);
          if ((a && a.v === t.v) || (b && b.v === t.v)) return true;
        }
        return false;
      };
      const snap = () => JSON.stringify({ tiles: st.tiles.filter(t => !t.dead).map(t => ({ v: t.v, r: t.r, c: t.c })), score: st.score });
      const persist = () => ctx.save({ tiles: st.tiles.filter(t => !t.dead).map(t => ({ v: t.v, r: t.r, c: t.c })), score: st.score, undos: st.undos, hist: st.hist, top: st.top });
      const move = dir => {
        if (over) return;
        st.tiles = st.tiles.filter(t => !t.dead);
        const before = snap();
        const [dr, dc] = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[dir];
        let moved = false, gained = 0;
        const order = st.tiles.slice().sort((a, b) => dr ? (b.r - a.r) * dr : (b.c - a.c) * dc);
        const merged = new Set();
        for (const t of order) {
          let r = t.r, c = t.c;
          for (;;) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) break;
            const o = st.tiles.find(x => x !== t && !x.dead && x.r === nr && x.c === nc);
            if (!o) { r = nr; c = nc; continue; }
            if (o.v === t.v && !merged.has(o.id)) { r = nr; c = nc; t.dead = true; o.v *= 2; o.pop = true; merged.add(o.id); gained += o.v; }
            break;
          }
          if (r !== t.r || c !== t.c) { t.r = r; t.c = c; moved = true; }
        }
        if (!moved) return;
        st.hist.push(before); if (st.hist.length > 3) st.hist.shift();
        st.score += gained; st.top = Math.max(st.top, ...st.tiles.map(t => t.v));
        H.sfx(gained ? 'match' : 'tap'); if (gained) H.buzz(10);
        spawn(); paint();
        if (!canMove()) {
          over = true; paint();
          const xp = Math.min(220, Math.round(st.score / 45) * (ctx.variant ? 2 : 1));
          return ctx.end({ result: 'done', score: st.score, xp, flags: { t2048: st.top >= 2048 } });
        }
        persist();
      };
      function undo() {
        if (over || !st.undos || !st.hist.length) return;
        const s = JSON.parse(st.hist.pop());
        st.tiles = s.tiles.map(t => ({ ...t, id: uid++ })); st.score = s.score; st.undos--;
        persist(); paint();
      }
      H.swipe(board, d => { if (d !== 'tap') move(d); });
      const offKeys = H.keys(move);
      if (!st.tiles.length) { spawn(); spawn(); }
      paint();
      return { destroy() { offKeys(); over = true; } };
    }
  });
})();
