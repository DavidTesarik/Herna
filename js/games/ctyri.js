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
    id: 'ctyri', name: 'Čtyři v řadě', icon: '🔴', grad: ['#b91c1c', '#c2410c'], vsAI: true, saveable: true, pvp: true,
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
      let over = false, timer = 0, win = null;
      const P = !!ctx.pvp, turnMsg = () => `Na tahu je hráč ${st.turn} (${st.turn === 1 ? sk.a : sk.b})`;
      const status = el('p', { class: 'g-status', role: 'status' });
      const discs = el('div', { class: 'c4discs', 'aria-hidden': 'true' });
      const colsEl = el('div', { class: 'c4cols' });
      const cols = [];
      for (let c = 0; c < C; c++) { const b = el('button', { class: 'c4col', onclick: () => human(c) }); cols.push(b); colsEl.append(b); }
      const board = el('div', { class: 'board c4b', role: 'group', 'aria-label': 'Hrací pole, 7 sloupců a 6 řad' }, discs, el('div', { class: 'c4front', 'aria-hidden': 'true' }), colsEl);
      const undoBtn = el('button', { class: 'btn ghost', onclick: undo });
      root.append(status, board, el('div', { class: 'g-actions' }, ctx.undosMax ? undoBtn : null));
      const say = t => { status.textContent = t; };
      const dom = new Map();
      const disc = (i, drop) => {
        const v = st.b[i], r = (i / C) | 0, c = i % C;
        const d = el('span', { class: 'c4d p' + v + (drop ? ' drop' : ''), style: `left:${c * 100 / C}%;top:${r * 100 / R}%;--rows:${r + 1};--dur:${(0.2 + r * 0.055).toFixed(2)}s` },
          el('span', { class: 'c4i', style: v === 1 ? `background:${sk.ca}` : v === 2 ? `background:${sk.cb}` : '', text: v === 1 ? sk.a : v === 2 ? sk.b : '▲' }));
        dom.set(i, d); discs.append(d);
      };
      const paint = dropped => {
        for (const [i, d] of dom) if (!st.b[i]) { d.remove(); dom.delete(i); }
        st.b.forEach((v, i) => { if (v && !dom.has(i)) disc(i, i === dropped); });
        for (const [i, d] of dom) { d.classList.toggle('last', i === st.last); d.classList.toggle('winc', !!win && win.includes(i)); d.classList.toggle('dim', !!win && !win.includes(i)); }
        cols.forEach((b, c) => {
          const free = rowFor(st.b, c) >= 0, mine = [], ai = [];
          for (let r = 0; r < R; r++) { const v = st.b[r * C + c]; if (v === 1) mine.push(R - r); else if (v === 2) ai.push(R - r); }
          b.disabled = over || (!P && st.turn !== 1) || !free;
          b.setAttribute('aria-label', `Sloupec ${c + 1}: ${free ? 'vhodit žeton' : 'plný'}. ${P ? 'Žetony hráče 1' : 'Tvoje žetony'} v řadách: ${mine.join(', ') || 'žádné'}. ${P ? 'Žetony hráče 2' : 'Žetony počítače'}: ${ai.join(', ') || 'žádné'}.`);
        });
        undoBtn.textContent = `↩ Vrátit tah (${st.undos})`;
        undoBtn.disabled = over || !st.undos || (P ? !st.hist.length : st.turn !== 1 || st.hist.length < 2);
      };
      const drop = (c, p) => {
        const r = rowFor(st.b, c); if (r < 0) return;
        st.hist.push(st.b.slice());
        const i = r * C + c; st.b[i] = p; st.last = i;
        const w = winAt(st.b, i);
        if (w) { over = true; win = w; paint(i); if (P) { say(`Vyhrál hráč ${p}!`); return ctx.end({ result: 'pvp', winner: p }); } say(p === 1 ? 'Vyhrál jsi!' : 'Počítač vyhrál.'); return ctx.end({ result: p === 1 ? 'win' : 'loss' }); }
        if (!st.b.includes(0)) { over = true; paint(i); say('Remíza.'); return ctx.end(P ? { result: 'pvp', winner: 0 } : { result: 'draw' }); }
        st.turn = 3 - p; ctx.save(st); paint(i);
        if (P) say(turnMsg()); else if (st.turn === 2) aiTurn(); else say('Jsi na tahu (' + sk.a + ')');
      };
      const human = c => { if (over || (!P && st.turn !== 1)) return; H.sfx('place'); H.buzz(8); drop(c, P ? st.turn : 1); };
      const aiTurn = () => {
        say('Počítač přemýšlí…');
        timer = setTimeout(() => { const c = ai(st.b, ctx.diff); H.sfx('tap'); drop(c, 2); }, 620);
      };
      function undo() {
        if (over || !st.undos || (P ? !st.hist.length : st.turn !== 1 || st.hist.length < 2)) return;
        if (P) { st.b = st.hist.pop(); st.turn = 3 - st.turn; } else { st.hist.pop(); st.b = st.hist.pop(); }
        st.last = -1; st.undos--;
        ctx.save(st); paint(); say(P ? 'Tah vrácen. ' + turnMsg() : 'Tah vrácen. Jsi na tahu.');
      }
      paint();
      if (P) say((ctx.saved ? 'Pokračujete. ' : '') + turnMsg()); else if (st.turn === 2) aiTurn(); else say(ctx.saved ? 'Pokračuješ v rozehrané hře. Jsi na tahu.' : 'Začínáš (' + sk.a + ')');
      return { destroy() { clearTimeout(timer); over = true; } };
    }
  });
})();
