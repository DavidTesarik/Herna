'use strict';
/* Dáma (česká pravidla, zjednodušeně): povinné braní, kámen bere jen vpřed, dáma létá. */
(function () {
  const { el } = H;
  const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  // 1 = kámen hráče (jde nahoru), 2 = dáma hráče, -1 / -2 = počítač
  function capsFrom(b, pos, piece, first, path, caps, out) {
    const side = Math.sign(piece), king = Math.abs(piece) === 2, r = pos >> 3, c = pos & 7; let found = false;
    const jump = (m, l) => {
      const nb = b.slice(); nb[pos] = 0; nb[m] = 0; nb[l] = piece;
      const np = path.concat(l), nc = caps.concat(m);
      if (!king && (l >> 3) === (side === 1 ? 0 : 7)) out.push({ from: first, to: l, path: np, caps: nc });
      else capsFrom(nb, l, piece, first, np, nc, out);
    };
    for (const [dr, dc] of DIRS) {
      if (!king) {
        if (dr !== -side) continue;
        const lr = r + 2 * dr, lc = c + 2 * dc;
        if (!inb(lr, lc)) continue;
        const m = (r + dr) * 8 + c + dc, l = lr * 8 + lc;
        if (b[m] * side < 0 && b[l] === 0) { found = true; jump(m, l); }
      } else {
        let rr = r + dr, cc = c + dc;
        while (inb(rr, cc) && b[rr * 8 + cc] === 0) { rr += dr; cc += dc; }
        if (!inb(rr, cc) || b[rr * 8 + cc] * side >= 0) continue;
        const m = rr * 8 + cc; rr += dr; cc += dc;
        while (inb(rr, cc) && b[rr * 8 + cc] === 0) { found = true; jump(m, rr * 8 + cc); rr += dr; cc += dc; }
      }
    }
    if (!found && caps.length) out.push({ from: first, to: pos, path, caps });
  }
  const gen = (b, side, must) => {
    const caps = [];
    for (let i = 0; i < 64; i++) if (b[i] * side > 0) capsFrom(b, i, b[i], i, [], [], caps);
    if (caps.length && must) { const k = caps.filter(m => Math.abs(b[m.from]) === 2); return k.length ? k : caps; }
    const simple = [];
    for (let i = 0; i < 64; i++) {
      if (b[i] * side <= 0) continue;
      const r = i >> 3, c = i & 7;
      for (const [dr, dc] of DIRS) {
        if (Math.abs(b[i]) === 1) { if (dr === -side && inb(r + dr, c + dc) && !b[(r + dr) * 8 + c + dc]) simple.push({ from: i, to: (r + dr) * 8 + c + dc, path: [], caps: [] }); }
        else { let rr = r + dr, cc = c + dc; while (inb(rr, cc) && !b[rr * 8 + cc]) { simple.push({ from: i, to: rr * 8 + cc, path: [], caps: [] }); rr += dr; cc += dc; } }
      }
    }
    return must ? simple : caps.concat(simple);
  };
  const apply = (b, m) => {
    const nb = b.slice(); let p = nb[m.from]; nb[m.from] = 0;
    for (const c of m.caps) nb[c] = 0;
    if (Math.abs(p) === 1 && (m.to >> 3) === (p === 1 ? 0 : 7)) p *= 2;
    nb[m.to] = p; return nb;
  };
  const evalB = (b, side) => {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p) continue;
      const r = i >> 3, c = i & 7;
      const v = Math.abs(p) === 2 ? 320 : 100 + (p > 0 ? 7 - r : r) * 5 + (c > 1 && c < 6 ? 3 : 0);
      s += p > 0 ? v : -v;
    }
    return s * side;
  };
  let deadline = 0, nodes = 0;
  const nega = (b, side, depth, a, bt, must) => {
    if ((++nodes & 511) === 0 && deadline && performance.now() > deadline) throw 0;
    const moves = gen(b, side, must);
    if (!moves.length) return -100000 - depth;
    if (depth <= 0) return evalB(b, side);
    moves.sort((x, y) => y.caps.length - x.caps.length);
    let best = -Infinity;
    for (const m of moves) {
      const v = -nega(apply(b, m), -side, depth - 1, -bt, -a, must);
      if (v > best) best = v;
      if (best > a) a = best;
      if (a >= bt) break;
    }
    return best;
  };
  const rootPick = (b, depth, must) => {
    let best = -Infinity, pick = [];
    for (const m of gen(b, -1, must)) {
      const v = -nega(apply(b, m), 1, depth - 1, -Infinity, Infinity, must);
      if (v > best) { best = v; pick = [m]; } else if (v === best) pick.push(m);
    }
    return H.pick(pick);
  };
  const ai = (b, diff, must) => {
    const moves = gen(b, -1, must);
    deadline = 0;
    if (diff === 0) return Math.random() < 0.35 ? H.pick(moves) : rootPick(b, 2, must);
    if (diff === 1) return rootPick(b, 3, must);
    if (diff === 2) return rootPick(b, 5, must);
    let mv = rootPick(b, 4, must);
    deadline = performance.now() + 800;
    try { for (let d = 6; d <= 14; d++) mv = rootPick(b, d, must); } catch (e) { /* čas vypršel */ }
    deadline = 0;
    return mv;
  };
  const initial = () => {
    const b = Array(64).fill(0);
    for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; if ((r + c) % 2 === 1) { if (r < 3) b[i] = -1; else if (r > 4) b[i] = 1; } }
    return b;
  };

  H.register({
    id: 'dama', name: 'Dáma', icon: '♛', grad: ['#7c2d12', '#78350f'], vsAI: true, saveable: true,
    desc: 'Přeskákej kameny počítače',
    variant: { name: 'Dobrovolné braní', desc: 'Brát se nemusí. Volnější hra s více možnostmi.', level: 2 },
    help: 'Ťukni na svůj kámen a pak na označené pole. Kámen chodí šikmo vpřed o jedno pole a bere přeskokem vpřed. Braní je povinné. Na poslední řadě se kámen mění v dámu, která chodí i bere na dálku všemi směry. Kdo nemá tah nebo kameny, prohrál.',
    start(root, ctx) {
      const sk = ctx.skin('pieces'), must = !ctx.variant;
      let st = ctx.saved || { b: initial(), turn: ctx.aiFirst ? 2 : 1, hist: [], undos: ctx.undos, quiet: 0, last: [] };
      let over = false, sel = -1, moves = [], timer = 0;
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board dama', role: 'grid', 'aria-label': 'Šachovnice' });
      const cells = st.b.map((_, i) => el('button', { class: 'cell ' + (((i >> 3) + (i & 7)) % 2 ? 'dark' : 'light'), onclick: () => tap(i) }));
      board.append(...cells);
      const undoBtn = el('button', { class: 'btn ghost', onclick: undo });
      root.append(status, board, el('div', { class: 'g-actions' }, ctx.undosMax ? undoBtn : null));
      const say = t => { status.textContent = t; };
      const paint = () => {
        const from = new Set(moves.map(m => m.from)), to = new Set(moves.filter(m => m.from === sel).map(m => m.to));
        cells.forEach((c, i) => {
          const p = st.b[i], dark = ((i >> 3) + (i & 7)) % 2;
          c.className = 'cell ' + (dark ? 'dark' : 'light') + (i === sel ? ' sel' : '') + (to.has(i) ? ' target' : '') + (st.turn === 1 && !over && from.has(i) && sel < 0 ? ' can' : '') + (st.last.includes(i) ? ' last' : '');
          c.textContent = '';
          if (p) c.append(el('span', { class: 'disc' + (p < 0 ? ' ai' : ''), style: `background:${p > 0 ? sk.ca : sk.cb}`, 'aria-hidden': 'true', text: Math.abs(p) === 2 ? '♛' : '' }));
          else if (to.has(i)) c.append(el('span', { class: 'dot', 'aria-hidden': 'true', text: '●' }));
          c.disabled = over || st.turn !== 1 || !dark;
          c.setAttribute('aria-label', `${String.fromCharCode(65 + (i & 7))}${8 - (i >> 3)}: ` + (p ? (p > 0 ? 'tvůj ' : 'počítačův ') + (Math.abs(p) === 2 ? 'dáma' : 'kámen') : 'prázdné') + (to.has(i) ? ', sem můžeš táhnout' : ''));
        });
        undoBtn.textContent = `↩ Vrátit tah (${st.undos})`;
        undoBtn.disabled = over || !st.undos || st.turn !== 1 || st.hist.length < 2;
      };
      const finish = res => { over = true; sel = -1; moves = []; paint(); say(res === 'win' ? 'Vyhrál jsi!' : res === 'loss' ? 'Počítač vyhrál.' : 'Remíza.'); ctx.end({ result: res }); };
      const play = (m, side) => {
        st.hist.push(JSON.stringify({ b: st.b, quiet: st.quiet }));
        if (st.hist.length > 12) st.hist.shift();
        st.quiet = (m.caps.length || Math.abs(st.b[m.from]) === 1) ? 0 : st.quiet + 1;
        st.b = apply(st.b, m); st.last = [m.from, m.to]; sel = -1;
        H.sfx(m.caps.length ? 'match' : 'place'); if (m.caps.length && side === 1) H.buzz(15);
        st.turn = side === 1 ? 2 : 1;
        if (st.quiet >= 30) return finish('draw');
        const next = gen(st.b, side === 1 ? -1 : 1, must);
        if (!next.length) return finish(side === 1 ? 'win' : 'loss');
        ctx.save(st);
        if (st.turn === 2) { moves = []; paint(); aiTurn(); } else { moves = next; paint(); say(must && next[0].caps.length ? 'Musíš brát.' : 'Jsi na tahu.'); }
      };
      const tap = i => {
        if (over || st.turn !== 1) return;
        if (st.b[i] > 0) { sel = moves.some(m => m.from === i) ? i : -1; if (sel < 0) { H.sfx('bad'); say(must && moves[0] && moves[0].caps.length ? 'Tímhle kamenem teď nemůžeš. Musíš brát jiným.' : 'Tenhle kámen nemá kam táhnout.'); } return paint(); }
        const opts = moves.filter(m => m.from === sel && m.to === i);
        if (opts.length) play(opts.sort((a, b) => b.caps.length - a.caps.length)[0], 1);
      };
      const aiTurn = () => { say('Počítač přemýšlí…'); timer = setTimeout(() => { if (!over) play(ai(st.b, ctx.diff, must), -1); }, 450); };
      function undo() {
        if (over || !st.undos || st.turn !== 1 || st.hist.length < 2) return;
        st.hist.pop(); const s = JSON.parse(st.hist.pop());
        st.b = s.b; st.quiet = s.quiet; st.last = []; st.undos--; sel = -1; moves = gen(st.b, 1, must);
        ctx.save(st); paint(); say('Tah vrácen. Jsi na tahu.');
      }
      if (st.turn === 2) { paint(); aiTurn(); }
      else { moves = gen(st.b, 1, must); paint(); say(ctx.saved ? 'Pokračuješ v rozehrané hře. Jsi na tahu.' : 'Začínáš. Tvoje kameny jsou dole.'); }
      return { destroy() { clearTimeout(timer); over = true; } };
    }
  });
})();
