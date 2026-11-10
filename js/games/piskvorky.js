'use strict';
/* Piškvorky: 3×3 (minimax) a 5 v řadě na 9×9 (heuristika + hledání) */
(function () {
  const { el } = H;
  const LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const N = 9, WINS5 = [], BYCELL = Array.from({ length: N * N }, () => []);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const er = r + dr * 4, ec = c + dc * 4;
    if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
    const w = [0, 1, 2, 3, 4].map(k => (r + dr * k) * N + c + dc * k);
    WINS5.push(w); w.forEach(i => BYCELL[i].push(w));
  }

  /* --- 3×3 --- */
  const win3 = b => { for (const l of LINES3) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l; return null; };
  const apply3 = (st, i, p, vanish) => {
    const b = st.b.slice(), q = { 1: st.q[1].slice(), 2: st.q[2].slice() };
    if (vanish && q[p].length === 3) b[q[p].shift()] = 0;
    b[i] = p; q[p].push(i);
    return { b, q };
  };
  const mm3 = (st, p, me, depth, vanish, a, bt) => {
    const w = win3(st.b);
    if (w) return st.b[w[0]] === me ? 10 + depth : -10 - depth;
    const free = []; for (let i = 0; i < 9; i++) if (!st.b[i]) free.push(i);
    if (!free.length || depth === 0) return 0;
    let best = p === me ? -99 : 99;
    for (const i of free) {
      const v = mm3(apply3(st, i, p, vanish), 3 - p, me, depth - 1, vanish, a, bt);
      if (p === me) { if (v > best) best = v; if (best > a) a = best; }
      else { if (v < best) best = v; if (best < bt) bt = best; }
      if (a >= bt) break;
    }
    return best;
  };
  const ai3 = (st, diff, vanish) => {
    const free = []; for (let i = 0; i < 9; i++) if (!st.b[i]) free.push(i);
    const smart = [0.25, 0.6, 0.9, 1][diff];
    if (Math.random() > smart) return H.pick(free);
    let best = -99, moves = [];
    for (const i of free) {
      const v = mm3(apply3(st, i, 2, vanish), 1, 2, vanish ? 7 : 9, vanish, -99, 99);
      if (v > best) { best = v; moves = [i]; } else if (v === best) moves.push(i);
    }
    return H.pick(moves);
  };

  /* --- 5 v řadě --- */
  const OWN = [1, 12, 120, 1500, 1e6], OPP = [0, 10, 100, 1300, 2e5], VAL = [0, 1, 8, 60, 600, 1e6];
  const moveScore = (b, i, me) => {
    let s = 0;
    for (const w of BYCELL[i]) {
      let a = 0, o = 0;
      for (const j of w) { if (b[j] === me) a++; else if (b[j]) o++; }
      if (a && o) continue;
      s += o ? OPP[o] : OWN[a];
    }
    return s;
  };
  const cands = b => {
    const out = [];
    for (let i = 0; i < N * N; i++) {
      if (b[i]) continue;
      const r = (i / N) | 0, c = i % N; let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr * N + cc]) { near = true; break; }
      }
      if (near) out.push(i);
    }
    return out.length ? out : [((N * N) / 2) | 0];
  };
  const win5 = (b, i) => { const p = b[i]; for (const w of BYCELL[i]) if (w.every(j => b[j] === p)) return w; return null; };
  const evalB = (b, me) => {
    let s = 0;
    for (const w of WINS5) {
      let a = 0, o = 0;
      for (const j of w) { if (b[j] === me) a++; else if (b[j]) o++; }
      if (a && !o) s += VAL[a]; else if (o && !a) s -= VAL[o] * 1.3;
    }
    return s;
  };
  const top = (b, p, k) => cands(b).map(i => [moveScore(b, i, p), i]).sort((x, y) => y[0] - x[0]).slice(0, k);
  const search = (b, p, depth, a, bt) => {
    if (depth === 0) return evalB(b, p);
    let best = -Infinity;
    const list = top(b, p, 7);
    for (const [, i] of list) {
      b[i] = p;
      const v = win5(b, i) ? 1e7 + depth : -search(b, 3 - p, depth - 1, -bt, -a);
      b[i] = 0;
      if (v > best) best = v;
      if (best > a) a = best;
      if (a >= bt) break;
    }
    return list.length ? best : 0;
  };
  const ai5 = (b, diff) => {
    const list = top(b, 2, 8);
    if (diff === 0) return H.pick(list.slice(0, 6))[1];
    if (diff === 1) return (Math.random() < 0.3 && list.length > 2 ? list[1 + H.rnd(2)] : list[0])[1];
    if (diff === 2) return list[0][1];
    let best = -Infinity, mv = list[0][1];
    for (const [, i] of list) {
      b[i] = 2;
      const v = win5(b, i) ? 1e8 : -search(b, 1, 3, -Infinity, Infinity);
      b[i] = 0;
      if (v > best) { best = v; mv = i; }
    }
    return mv;
  };

  H.register({
    id: 'piskvorky', name: 'Piškvorky', icon: '❌', grad: ['#4338ca', '#7c3aed'], vsAI: true, saveable: true,
    desc: 'Klasika 3×3 nebo pět v řadě',
    modes: [{ id: '3', name: '3×3' }, { id: '5', name: '5 v řadě' }],
    variant: { name: 'Zmizík', desc: 'Jen pro 3×3: každý má nejvýš 3 značky, čtvrtá smaže tu nejstarší. Remíza neexistuje.', level: 2 },
    help: 'Spoj své značky do řady dřív než počítač. V režimu 3×3 stačí tři, v režimu 5 v řadě pět (vodorovně, svisle i šikmo).',
    start(root, ctx) {
      const five = ctx.mode === '5', size = five ? N : 3, vanish = ctx.variant && !five;
      const sk = ctx.skin('pieces');
      let st = ctx.saved || { b: Array(size * size).fill(0), q: { 1: [], 2: [] }, turn: ctx.aiFirst ? 2 : 1, hist: [], undos: ctx.undos, last: -1 };
      let over = false, timer = 0;
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board pv' + (five ? ' pv5' : ''), style: `--n:${size}`, role: 'grid', 'aria-label': 'Hrací pole' });
      const cells = st.b.map((_, i) => el('button', { class: 'cell', onclick: () => human(i) }));
      board.append(...cells);
      const undoBtn = el('button', { class: 'btn ghost', onclick: undo });
      root.append(status, board, el('div', { class: 'g-actions' }, ctx.undosMax ? undoBtn : null));

      const paint = (winLine) => {
        cells.forEach((c, i) => {
          const v = st.b[i];
          c.textContent = v ? (v === 1 ? sk.a : sk.b) : '';
          c.style.color = v ? (v === 1 ? sk.ca : sk.cb) : '';
          c.className = 'cell' + (v ? ' filled' : '') + (i === st.last ? ' last' : '') + (winLine && winLine.includes(i) ? ' winc' : '') +
            (vanish && v && st.q[v].length === 3 && st.q[v][0] === i ? ' fading' : '');
          c.disabled = over || !!v || st.turn !== 1;
          c.setAttribute('aria-label', `Řádek ${((i / size) | 0) + 1}, sloupec ${i % size + 1}: ` + (v ? (v === 1 ? 'tvoje značka' : 'značka počítače') : 'prázdné'));
        });
        undoBtn.textContent = `↩ Vrátit tah (${st.undos})`;
        undoBtn.disabled = over || !st.undos || st.turn !== 1 || st.hist.length < 2;
      };
      const say = t => { status.textContent = t; };
      const place = (i, p) => {
        st.hist.push(JSON.stringify({ b: st.b, q: st.q, last: st.last }));
        if (five) st.b[i] = p; else { const n = apply3(st, i, p, vanish); st.b = n.b; st.q = n.q; }
        st.last = i;
        const w = five ? win5(st.b, i) : win3(st.b);
        if (w) return finish(p === 1 ? 'win' : 'loss', w);
        if (!st.b.includes(0)) return finish('draw');
        st.turn = 3 - p;
        ctx.save(st);
        paint();
        if (st.turn === 2) aiTurn(); else say('Jsi na tahu (' + sk.a + ')');
      };
      const finish = (res, w) => { over = true; paint(w); say(res === 'win' ? 'Vyhrál jsi!' : res === 'loss' ? 'Počítač vyhrál.' : 'Remíza.'); ctx.end({ result: res }); };
      const human = i => { if (over || st.turn !== 1 || st.b[i]) return; H.sfx('place'); H.buzz(8); place(i, 1); };
      const aiTurn = () => {
        say('Počítač přemýšlí…'); paint();
        timer = setTimeout(() => {
          const i = five ? ai5(st.b, ctx.diff) : ai3(st, ctx.diff, vanish);
          H.sfx('tap'); place(i, 2);
        }, 420);
      };
      function undo() {
        if (over || !st.undos || st.turn !== 1 || st.hist.length < 2) return;
        let snap = null;
        for (let k = 0; k < 2 && st.hist.length; k++) snap = JSON.parse(st.hist.pop());
        st.b = snap.b; st.q = snap.q; st.last = snap.last; st.undos--;
        ctx.save(st); paint(); say('Tah vrácen. Jsi na tahu.');
      }
      paint();
      if (st.turn === 2) aiTurn(); else say(ctx.saved ? 'Pokračuješ v rozehrané hře. Jsi na tahu.' : 'Začínáš (' + sk.a + ')');
      return { destroy() { clearTimeout(timer); over = true; } };
    }
  });
})();
