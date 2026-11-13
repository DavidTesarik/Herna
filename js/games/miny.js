'use strict';
/* Miny: klasická, obří (posuvná) i vlastní pole. Generátor se snaží o pole řešitelné bez hádání. */
(function () {
  const { el } = H;
  const STD = [[8, 8, 9], [8, 10, 14], [8, 12, 20], [8, 13, 26]], XPS = [30, 60, 100, 150];
  const XL = [[12, 18, 38], [16, 24, 75], [20, 30, 125], [24, 40, 200]], XPX = [220, 380, 560, 800];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v) || a));
  const dims = (mode, diff, o) => {
    if (mode === 'xl') return XL[diff];
    if (mode === 'own') { const w = clamp(o.w, 5, 30), h = clamp(o.h, 5, 50); return [w, h, clamp(o.m, 1, w * h - 9)]; }
    return STD[diff];
  };
  const neighbours = (W, Hh) => {
    const NB = [];
    for (let i = 0; i < W * Hh; i++) { const r = (i / W) | 0, c = i % W, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < Hh && cc >= 0 && cc < W) o.push(rr * W + cc); } NB.push(o); }
    return NB;
  };
  /* jde pole vyřešit jen logikou (pravidla jednoho čísla a podmnožin)? */
  const solvable = (mines, NB, n, M, start) => {
    const st = new Uint8Array(n), num = new Int8Array(n);
    for (let i = 0; i < n; i++) { let k = 0; for (const j of NB[i]) k += mines[j]; num[i] = k; }
    let opened = 0; const total = n - M;
    const open = i => { const s = [i]; while (s.length) { const j = s.pop(); if (st[j]) continue; st[j] = 1; opened++; if (!num[j]) for (const k of NB[j]) if (!st[k]) s.push(k); } };
    open(start);
    for (let guard = 0; guard < 4000 && opened < total; guard++) {
      let changed = false; const fr = [], at = new Int32Array(n).fill(-1);
      for (let i = 0; i < n; i++) {
        if (st[i] !== 1 || !num[i]) continue;
        const U = []; let f = 0;
        for (const j of NB[i]) { if (!st[j]) U.push(j); else if (st[j] === 2) f++; }
        if (!U.length) continue;
        const need = num[i] - f;
        if (need === 0) { for (const j of U) open(j); changed = true; }
        else if (need === U.length) { for (const j of U) st[j] = 2; changed = true; }
        else { at[i] = fr.length; fr.push({ U, need }); }
      }
      if (changed) continue;
      for (const a of fr) {
        const seen = new Set(), inA = new Set(a.U);
        for (const u of a.U) for (const k of NB[u]) {
          if (at[k] < 0 || seen.has(k)) continue; seen.add(k);
          const b = fr[at[k]];
          if (b === a || b.U.length >= a.U.length || !b.U.every(x => inA.has(x))) continue;
          const diff = a.U.filter(x => !b.U.includes(x)), nd = a.need - b.need;
          if (nd === 0) { for (const j of diff) if (!st[j]) open(j); changed = true; }
          else if (nd === diff.length) { for (const j of diff) st[j] = 2; changed = true; }
          if (changed) break;
        }
        if (changed) break;
      }
      if (!changed) return false;
    }
    return opened === total;
  };
  const range = (label, min, max, val, on, done) => {
    const out = el('b', { text: val });
    return el('label', { class: 'rangerow' }, el('span', {}, label + ' ', out),
      el('input', { type: 'range', min, max, value: val, oninput: e => { out.textContent = e.target.value; on(+e.target.value); }, onchange: () => { if (done) done(); } }));
  };

  H.register({
    id: 'miny', name: 'Miny', icon: '💣', grad: ['#047857', '#0f766e'], saveable: true, winLose: true, bestFmt: 'time',
    desc: 'Odkryj pole a vyhni se minám',
    modes: [{ id: 'std', name: 'Klasika' }, { id: 'xl', name: 'Obří pole' }, { id: 'own', name: 'Vlastní' }],
    diffNamesFor: mode => mode === 'xl' ? ['XL 12×18', 'XXL 16×24', 'XXXL 20×30', 'XXXXL 24×40'] : mode === 'own' ? null : ['Malé pole', 'Střední pole', 'Velké pole', 'Minové peklo'],
    variant: { name: 'Na čas', desc: 'Běží odpočet. Kdo nestihne, prohrál. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Vyhraj v Minách', kind: 'win' },
    help: 'Číslo říká, kolik min sousedí s políčkem. Dole si přepínáš, jestli ťuknutí odkrývá, nebo dává vlajku. Vlajku položíš i dlouhým stiskem. Velká pole posouváš tažením prstu. Hra se snaží postavit pole, které jde vyřešit bez hádání.',
    menuExtra(sel, opts, refresh) {
      if (sel.mode !== 'own') return [];
      opts.w = clamp(opts.w || 12, 5, 30); opts.h = clamp(opts.h || 16, 5, 50);
      const maxM = opts.w * opts.h - 9; opts.m = clamp(opts.m || 30, 1, maxM);
      return [el('h3', { text: 'Vlastní pole' }),
        range('Sloupce:', 5, 30, opts.w, v => { opts.w = v; }, refresh), range('Řádky:', 5, 50, opts.h, v => { opts.h = v; }, refresh),
        range('Miny:', 1, maxM, opts.m, v => { opts.m = v; }, refresh),
        el('p', { class: 'muted', text: `Pole ${opts.w}×${opts.h}, nejvýš ${maxM} min. Když zadaný počet nepůjde rozumně postavit, hra ho mírně sníží.` })];
    },
    start(root, ctx) {
      const mode = ctx.mode || 'std', [W, Hh, M0] = dims(mode, ctx.diff, ctx.opts || {}), n = W * Hh, limit = Math.round(n * 2.2), NB = neighbours(W, Hh), big = W > 8;
      const sv = ctx.saved && ctx.saved.open.length === n ? ctx.saved : null;
      let st = sv || { mines: null, open: Array(n).fill(0), flag: Array(n).fill(0), time: 0, hints: ctx.upg.detector, M: M0 };
      let over = false, flagMode = false, tick = 0, boom = -1, busy = false;
      const count = i => { let k = 0; for (const j of NB[i]) k += st.mines[j]; return k; };
      const info = el('p', { class: 'g-score' });
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board mines' + (big ? ' big' : ''), style: `--n:${W}` });
      let press = 0, longDone = false, px = 0, py = 0;
      const cells = st.open.map((_, i) => el('button', {
        class: 'cell', onclick: () => { if (longDone) { longDone = false; return; } tap(i); },
        onpointerdown: e => { longDone = false; px = e.clientX; py = e.clientY; clearTimeout(press); press = setTimeout(() => { longDone = true; toggleFlag(i); }, 420); },
        onpointermove: e => { if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 10) clearTimeout(press); },
        onpointerup: () => clearTimeout(press), onpointerleave: () => clearTimeout(press), onpointercancel: () => clearTimeout(press),
        oncontextmenu: e => { e.preventDefault(); }
      }));
      board.append(...cells);
      const modeBtn = el('button', { class: 'btn big', 'aria-pressed': 'false', onclick: () => { flagMode = !flagMode; paint(); } });
      const hintBtn = el('button', { class: 'btn ghost', onclick: hint });
      root.append(info, status, big ? H.pan(board) : board, el('div', { class: 'g-actions' }, modeBtn, ctx.upg.detector ? hintBtn : null));
      const head = () => {
        const flags = st.flag.reduce((a, b) => a + b, 0);
        info.textContent = `💣 ${st.M - flags}   ⏱ ${ctx.variant ? H.fmtTime(Math.max(0, limit - st.time)) : H.fmtTime(st.time)}`;
      };
      const paint = () => {
        cells.forEach((c, i) => {
          const o = st.open[i], f = st.flag[i], mine = st.mines && st.mines[i];
          let t = '', cls = 'cell', label = 'zakryté';
          if (o) { const k = count(i); t = k || ''; cls += ' open n' + k; label = k ? k + ' min okolo' : 'prázdné'; }
          else if (f) { t = '🚩'; label = 'vlajka'; }
          if (over && mine && !f) { t = '💣'; cls += i === boom ? ' boom' : ' open'; label = 'mina'; }
          if (over && f && !mine) { t = '✖'; label = 'špatná vlajka'; }
          if (c.textContent !== String(t)) c.textContent = t;
          if (c.className !== cls) c.className = cls;
          c.disabled = over || !!o;
          c.setAttribute('aria-label', `Řádek ${((i / W) | 0) + 1}, sloupec ${i % W + 1}: ${label}`);
        });
        head();
        modeBtn.textContent = flagMode ? '🚩 Režim: VLAJKA' : '⛏ Režim: ODKRÝT';
        modeBtn.setAttribute('aria-pressed', String(flagMode));
        modeBtn.classList.toggle('alt', flagMode);
        hintBtn.textContent = `📡 Nápověda (${st.hints})`;
        hintBtn.disabled = over || !st.hints || !st.mines;
      };
      const lay = (safe, m) => {
        const ban = new Set([safe, ...NB[safe]]);
        const pool = H.shuffle([...Array(n).keys()].filter(i => !ban.has(i)));
        const mines = Array(n).fill(0); pool.slice(0, m).forEach(i => { mines[i] = 1; });
        return mines;
      };
      /* nejdřív zkouší pole bez hádání; když to nejde včas, u obřích a vlastních polí ubere min, nakonec vezme náhodné */
      const build = safe => {
        const t0 = performance.now(), canCut = mode !== 'std', phase = canCut ? 320 : 450;
        let m = Math.min(st.M, n - 9), cuts = 0, mines;
        for (;;) {
          mines = lay(safe, m);
          if (solvable(mines, NB, n, m, safe)) return { mines, m, clean: true, cuts };
          if (performance.now() - t0 > phase * (cuts + 1)) { if (canCut && cuts < 4 && m > 3) { m = Math.max(1, Math.round(m * 0.9)); cuts++; } else return { mines, m, clean: false, cuts }; }
        }
      };
      const reveal = i => {
        const stack = [i];
        while (stack.length) {
          const j = stack.pop();
          if (st.open[j] || st.flag[j]) continue;
          st.open[j] = 1;
          if (!count(j)) for (const k of NB[j]) stack.push(k);
        }
      };
      const end = res => {
        over = true; clearInterval(tick); paint();
        status.textContent = res === 'win' ? 'Pole je čisté!' : 'Bum! Tentokrát to nevyšlo.';
        const xp = res !== 'win' ? 8 : mode === 'xl' ? XPX[ctx.diff] : mode === 'own' ? Math.min(600, Math.round(st.M * 3.5)) : XPS[ctx.diff];
        ctx.end({ result: res, xp, score: res === 'win' && mode !== 'own' ? st.time : null, lower: true });
      };
      const checkWin = () => { if (st.open.reduce((a, b) => a + b, 0) === n - st.M) end('win'); else { ctx.save(st); paint(); } };
      const startClock = () => {
        if (tick) return;
        tick = setInterval(() => {
          if (document.hidden || over || ctx.paused) return;
          st.time++;
          if (ctx.variant && st.time >= limit) { H.sfx('lose'); return end('loss'); }
          if (st.time % 5 === 0) ctx.save(st);
          head();
        }, 1000);
      };
      function toggleFlag(i) { if (over || st.open[i]) return; st.flag[i] = st.flag[i] ? 0 : 1; H.sfx('tap'); H.buzz(12); if (st.mines) ctx.save(st); paint(); }
      function tap(i) {
        if (over || busy || st.open[i]) return;
        if (flagMode) return toggleFlag(i);
        if (st.flag[i]) return;
        if (!st.mines) {
          busy = true; status.textContent = 'Sestavuji pole…';
          return setTimeout(() => {
            const b = build(i); st.mines = b.mines; busy = false;
            if (b.m !== st.M) { st.M = b.m; status.textContent = `Pole zjednodušeno na ${b.m} min${b.clean ? ', jde vyřešit bez hádání' : ''}.`; }
            else status.textContent = b.clean ? 'Tohle pole jde vyřešit bez hádání.' : 'Pole je připravené. Občas možná budeš muset hádat.';
            startClock(); H.sfx('place'); reveal(i); checkWin();
          }, 30);
        }
        if (st.mines[i]) { boom = i; H.sfx('boom'); H.buzz(120); H.shake(board); return end('loss'); }
        H.sfx('place'); reveal(i); checkWin();
      }
      function hint() {
        if (over || !st.hints || !st.mines) return;
        const safe = [...Array(n).keys()].filter(i => !st.open[i] && !st.mines[i]);
        if (!safe.length) return;
        const edge = safe.filter(i => NB[i].some(j => st.open[j]));
        st.hints--;
        const i = H.pick(edge.length ? edge : safe); st.flag[i] = 0; H.sfx('coin'); reveal(i);
        if (big && cells[i].scrollIntoView) cells[i].scrollIntoView({ block: 'center', inline: 'center' });
        checkWin();
      }
      if (st.mines) startClock();
      paint();
      status.textContent = sv ? 'Pokračuješ v rozehrané hře.' : 'První ťuknutí je vždy bezpečné.';
      return { destroy() { clearInterval(tick); clearTimeout(press); over = true; } };
    }
  });
})();
