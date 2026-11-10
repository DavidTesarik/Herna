'use strict';
/* Čtyři v řadě: negamax s alfa-beta ořezáváním */
(function () {
  const { el } = H;
  const R = 6, C = 7, ORDER = [3, 2, 4, 1, 5, 0, 6], WINS = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const er = r + dr * 3, ec = c + dc * 3;
    if (er >= R || ec < 0 || ec >= C) continue;
    WINS.push([0, 1, 2, 3].map(k => (r + dr * k) * C + c + dc * k));
  }
  const BY = Array.from({ length: R * C }, () => []);
  WINS.forEach(w => w.forEach(i => BY[i].push(w)));
  const rowFor = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) return r; return -1; };
  const winAt = (b, i) => { const p = b[i]; for (const w of BY[i]) if (w.every(j => b[j] === p)) return w; return null; };
  const evalB = (b, p) => {
    let s = 0;
    for (const w of WINS) {
      let a = 0, o = 0, x = 0;
      for (const j of w) { const v = b[j]; if (v === p) a++; else if (v === 3) x++; else if (v) o++; }
      if (x || (a && o)) continue;
      if (a) s += a === 3 ? 50 : a === 2 ? 8 : 1; else if (o) s -= o === 3 ? 60 : o === 2 ? 8 : 1;
    }
    for (let r = 0; r < R; r++) { const v = b[r * C + 3]; if (v === p) s += 4; else if (v && v !== 3) s -= 4; }
    return s;
  };
  let deadline = 0, nodes = 0;
  const nega = (b, p, depth, a, bt) => {
    if ((++nodes & 1023) === 0 && deadline && performance.now() > deadline) throw 0;
    let best = -Infinity, any = false;
    for (const c of ORDER) {
      const r = rowFor(b, c); if (r < 0) continue;
      any = true;
      const i = r * C + c; b[i] = p;
      let v;
      if (winAt(b, i)) v = 100000 + depth;
      else if (depth <= 1) v = evalB(b, p);
      else v = -nega(b, 3 - p, depth - 1, -bt, -a);
      b[i] = 0;
      if (v > best) best = v;
      if (best > a) a = best;
      if (a >= bt) break;
    }
    return any ? best : 0;
  };
  const rootMove = (b, depth) => {
    let best = -Infinity, mv = [];
    for (const c of ORDER) {
      const r = rowFor(b, c); if (r < 0) continue;
      const i = r * C + c; b[i] = 2;
      const v = winAt(b, i) ? 1e6 : depth <= 1 ? evalB(b, 2) : -nega(b, 1, depth - 1, -Infinity, Infinity);
      b[i] = 0;
      if (v > best) { best = v; mv = [c]; } else if (v === best) mv.push(c);
    }
    return mv[0];
  };
  const ai = (b, diff) => {
    const free = ORDER.filter(c => rowFor(b, c) >= 0);
    deadline = 0;
    if (diff === 0) return Math.random() < 0.4 ? H.pick(free) : rootMove(b, 1);
    if (diff === 1) return Math.random() < 0.1 ? H.pick(free) : rootMove(b, 3);
    if (diff === 2) return rootMove(b, 6);
    let mv = rootMove(b, 4);
    deadline = performance.now() + 900;
    const copy = b.slice();
    try { for (let d = 6; d <= 42; d += 1) mv = rootMove(copy, d); } catch (e) { /* čas vypršel, platí poslední dokončená hloubka */ }
    deadline = 0;
    return mv;
  };

  H.register({
    id: 'ctyri', name: 'Čtyři v řadě', icon: '🔴', grad: ['#b91c1c', '#c2410c'], vsAI: true, saveable: true,
    desc: 'Házej žetony, spoj čtyři',
    variant: { name: 'Překážky', desc: 'Na dně leží tři šedé kameny, které nepatří nikomu a kazí plány.', level: 2 },
    help: 'Ťukni na sloupec a žeton spadne dolů. Vyhrává, kdo první spojí čtyři své žetony vodorovně, svisle nebo šikmo.',
    start(root, ctx) {
      const sk = ctx.skin('pieces');
      let st = ctx.saved;
      if (!st) {
        st = { b: Array(R * C).fill(0), turn: ctx.aiFirst ? 2 : 1, hist: [], undos: ctx.undos, last: -1 };
        if (ctx.variant) H.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3).forEach(c => { st.b[(R - 1) * C + c] = 3; });
      }
      let over = false, timer = 0;
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board c4', role: 'group', 'aria-label': 'Hrací pole, 7 sloupců' });
      const cols = [], discs = [];
      for (let c = 0; c < C; c++) {
        const col = el('button', { class: 'c4col', 'aria-label': 'Vhodit žeton do sloupce ' + (c + 1), onclick: () => human(c) });
        for (let r = 0; r < R; r++) { const d = el('span', { class: 'slot' }); discs[r * C + c] = d; col.append(d); }
        cols.push(col); board.append(col);
      }
      const undoBtn = el('button', { class: 'btn ghost', onclick: undo });
      root.append(status, board, el('div', { class: 'g-actions' }, ctx.undosMax ? undoBtn : null));
      const say = t => { status.textContent = t; };
      const paint = (w, dropped) => {
        discs.forEach((d, i) => {
          const v = st.b[i];
          d.className = 'slot' + (v ? ' p' + v : '') + (i === dropped ? ' drop' : '') + (w && w.includes(i) ? ' winc' : '') + (i === st.last ? ' last' : '');
          d.textContent = v === 1 ? sk.a : v === 2 ? sk.b : v === 3 ? '▲' : '';
          d.style.background = v === 1 ? sk.ca : v === 2 ? sk.cb : '';
          if (i === dropped) d.style.setProperty('--dr', ((i / C) | 0) + 1);
        });
        cols.forEach((col, c) => { col.disabled = over || st.turn !== 1 || rowFor(st.b, c) < 0; });
        undoBtn.textContent = `↩ Vrátit tah (${st.undos})`;
        undoBtn.disabled = over || !st.undos || st.turn !== 1 || st.hist.length < 2;
      };
      const drop = (c, p) => {
        const r = rowFor(st.b, c); if (r < 0) return;
        st.hist.push(st.b.slice());
        const i = r * C + c; st.b[i] = p; st.last = i;
        const w = winAt(st.b, i);
        if (w) { over = true; paint(w, i); say(p === 1 ? 'Vyhrál jsi!' : 'Počítač vyhrál.'); return ctx.end({ result: p === 1 ? 'win' : 'loss' }); }
        if (!st.b.includes(0)) { over = true; paint(null, i); say('Remíza.'); return ctx.end({ result: 'draw' }); }
        st.turn = 3 - p; ctx.save(st); paint(null, i);
        if (st.turn === 2) aiTurn(); else say('Jsi na tahu (' + sk.a + ')');
      };
      const human = c => { if (over || st.turn !== 1) return; H.sfx('place'); H.buzz(8); drop(c, 1); };
      const aiTurn = () => {
        say('Počítač přemýšlí…');
        timer = setTimeout(() => { const c = ai(st.b, ctx.diff); H.sfx('tap'); drop(c, 2); }, 450);
      };
      function undo() {
        if (over || !st.undos || st.turn !== 1 || st.hist.length < 2) return;
        st.hist.pop(); st.b = st.hist.pop(); st.last = -1; st.undos--;
        ctx.save(st); paint(); say('Tah vrácen. Jsi na tahu.');
      }
      paint();
      if (st.turn === 2) aiTurn(); else say(ctx.saved ? 'Pokračuješ v rozehrané hře. Jsi na tahu.' : 'Začínáš (' + sk.a + ')');
      return { destroy() { clearTimeout(timer); over = true; } };
    }
  });
})();
