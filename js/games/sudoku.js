'use strict';
/* Sudoku: generátor s kontrolou jediného řešení */
(function () {
  const { el } = H;
  const CLUES = [42, 35, 30, 26], XP = [40, 70, 110, 160];
  const bits = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
  const masks = g => {
    const R = Array(9).fill(0), C = Array(9).fill(0), B = Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << (g[i] - 1), r = (i / 9) | 0, c = i % 9; R[r] |= b; C[c] |= b; B[((r / 3) | 0) * 3 + ((c / 3) | 0)] |= b; }
    return [R, C, B];
  };
  const solve = (g, limit, keep) => {
    const [R, C, B] = masks(g); let count = 0;
    const rec = () => {
      let best = -1, bm = 0, bc = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const r = (i / 9) | 0, c = i % 9, m = 511 & ~(R[r] | C[c] | B[((r / 3) | 0) * 3 + ((c / 3) | 0)]), n = bits(m);
        if (n < bc) { bc = n; best = i; bm = m; if (n <= 1) break; }
      }
      if (best < 0) { count++; return; }
      if (!bc) return;
      const r = (best / 9) | 0, c = best % 9, bx = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      for (const d of H.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8])) {
        if (!((bm >> d) & 1)) continue;
        const b = 1 << d;
        g[best] = d + 1; R[r] |= b; C[c] |= b; B[bx] |= b;
        rec();
        if (count >= limit) { if (!keep) g[best] = 0; return; }
        g[best] = 0; R[r] &= ~b; C[c] &= ~b; B[bx] &= ~b;
      }
    };
    rec();
    return count;
  };
  const generate = clues => {
    const sol = Array(81).fill(0); solve(sol, 1, true);
    const puz = sol.slice(); let left = 81;
    for (const i of H.shuffle([...Array(81).keys()])) {
      if (left <= clues) break;
      const v = puz[i]; puz[i] = 0;
      if (solve(puz.slice(), 2, false) !== 1) puz[i] = v; else left--;
    }
    return { puz, sol };
  };

  H.register({
    id: 'sudoku', name: 'Sudoku', icon: '🔢', grad: ['#0e7490', '#155e75'], saveable: true, winLose: true, bestFmt: 'time',
    desc: 'Čísla 1–9 do řádků a čtverců',
    diffNames: ['Lehké', 'Střední', 'Těžké', 'Ďábelské'],
    variant: { name: 'Tři životy', desc: 'Třetí chybně zapsané číslo znamená konec. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Vyřeš Sudoku', kind: 'win' },
    help: 'V každém řádku, sloupci i čtverci 3×3 musí být čísla 1 až 9 právě jednou. Ťukni na políčko a pak na číslo dole. V režimu Poznámky si do políčka píšeš malé tipy.',
    start(root, ctx) {
      let st = ctx.saved;
      if (!st) { const g = generate(CLUES[ctx.diff]); st = { puz: g.puz, sol: g.sol, cur: g.puz.slice(), notes: Array(81).fill(0), bad: Array(81).fill(0), time: 0, miss: 0 }; }
      let sel = st.cur.findIndex(v => !v), notes = false, over = false, tick = 0;
      const info = el('p', { class: 'g-score', role: 'status' });
      const board = el('div', { class: 'board sdk', role: 'grid', 'aria-label': 'Sudoku' });
      const cells = st.cur.map((_, i) => el('button', { class: 'cell', onclick: () => { sel = i; paint(); } }));
      board.append(...cells);
      const pad = el('div', { class: 'numpad' });
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => el('button', { class: 'btn num', text: n, 'aria-label': 'Číslo ' + n, onclick: () => put(n) }));
      const noteBtn = el('button', { class: 'btn', 'aria-pressed': 'false', onclick: () => { notes = !notes; paint(); } });
      pad.append(...nums);
      root.append(info, board, pad, el('div', { class: 'g-actions' }, noteBtn, el('button', { class: 'btn ghost', text: '⌫ Smazat', onclick: () => put(0) })));
      const paint = () => {
        const sv = sel >= 0 ? st.cur[sel] : 0, sr = (sel / 9) | 0, sc = sel % 9;
        cells.forEach((c, i) => {
          const v = st.cur[i], r = (i / 9) | 0, k = i % 9, given = !!st.puz[i];
          c.className = 'cell' + (given ? ' given' : '') + (i === sel ? ' sel' : (r === sr || k === sc) && sel >= 0 ? ' peer' : '') + (v && v === sv && i !== sel ? ' same' : '') + (st.bad[i] ? ' bad' : '') +
            (k % 3 === 2 && k < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '');
          c.textContent = '';
          if (v) c.textContent = v;
          else if (st.notes[i]) c.append(el('span', { class: 'notes', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => el('i', { text: (st.notes[i] >> (n - 1)) & 1 ? n : '' }))));
          c.setAttribute('aria-label', `Řádek ${r + 1}, sloupec ${k + 1}: ` + (v ? (given ? 'zadané ' : '') + v + (st.bad[i] ? ', chybně' : '') : 'prázdné'));
        });
        nums.forEach((b, n) => { b.disabled = over || st.cur.filter((v, i) => v === n + 1 && !st.bad[i]).length >= 9; });
        noteBtn.textContent = notes ? '✏️ Poznámky: ZAP' : '✏️ Poznámky: VYP';
        noteBtn.setAttribute('aria-pressed', String(notes)); noteBtn.classList.toggle('alt', notes);
        info.textContent = `⏱ ${H.fmtTime(st.time)}   Chyby ${st.miss}${ctx.variant ? '/3' : ''}`;
      };
      const finish = res => {
        over = true; clearInterval(tick); paint();
        ctx.end({ result: res, xp: res === 'win' ? XP[ctx.diff] : 8, score: res === 'win' ? st.time : null, lower: true });
      };
      function put(n) {
        if (over || sel < 0 || st.puz[sel]) return;
        if (!tick) clock();
        if (n && notes) { if (!st.cur[sel]) st.notes[sel] ^= 1 << (n - 1); H.sfx('tap'); ctx.save(st); return paint(); }
        st.cur[sel] = n; st.bad[sel] = 0;
        if (n && n !== st.sol[sel]) { st.bad[sel] = 1; st.miss++; H.sfx('bad'); H.buzz(40); H.shake(cells[sel]); if (ctx.variant && st.miss >= 3) return finish('loss'); }
        else if (n) {
          H.sfx('place'); st.notes[sel] = 0;
          const r = (sel / 9) | 0, c = sel % 9;
          for (let i = 0; i < 81; i++) { const rr = (i / 9) | 0, cc = i % 9; if (rr === r || cc === c || (((rr / 3) | 0) === ((r / 3) | 0) && ((cc / 3) | 0) === ((c / 3) | 0))) st.notes[i] &= ~(1 << (n - 1)); }
          if (st.cur.every((v, i) => v === st.sol[i])) return finish('win');
        }
        ctx.save(st); paint();
      }
      function clock() { tick = setInterval(() => { if (document.hidden || over || ctx.paused) return; st.time++; if (st.time % 5 === 0) ctx.save(st); info.textContent = `⏱ ${H.fmtTime(st.time)}   Chyby ${st.miss}${ctx.variant ? '/3' : ''}`; }, 1000); }
      const key = e => {
        if (over || document.querySelector('.modal')) return;
        if (e.key >= '1' && e.key <= '9') put(+e.key);
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
        else { const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]; if (!d || sel < 0) return; const n = sel + d; if (n < 0 || n > 80 || (Math.abs(d) === 1 && ((n / 9) | 0) !== ((sel / 9) | 0))) return; sel = n; e.preventDefault(); paint(); }
      };
      window.addEventListener('keydown', key);
      if (ctx.saved && st.time) clock();
      paint();
      return { destroy() { clearInterval(tick); window.removeEventListener('keydown', key); over = true; } };
    }
  });
})();
