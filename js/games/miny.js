'use strict';
/* Miny: klasická, obří a gigantická (posuvná) i vlastní pole. Generátor se snaží o pole řešitelné bez hádání. */
(function () {
  const { el } = H;
  const STD = [[8, 8, 9], [8, 10, 14], [8, 12, 20], [8, 13, 26]], XPS = [30, 60, 100, 150];
  const XL = [[12, 18, 38], [16, 24, 75], [20, 30, 125], [24, 40, 200]], XPX = [220, 380, 560, 800];
  const GIGA = [[32, 50, 330], [40, 64, 525], [50, 80, 820], [64, 100, 1300]], XPG = [1100, 1600, 2300, 3200];
  const MAXW = 64, MAXH = 100, HUGE = 1200; // nad HUGE políček: delší příprava, šetrnější ukládání
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v) || a));
  const dims = (mode, diff, o) => {
    if (mode === 'xl') return XL[diff] || XL[0];
    if (mode === 'giga') return GIGA[diff] || GIGA[0];
    if (mode === 'own') { const w = clamp(o.w, 5, MAXW), h = clamp(o.h, 5, MAXH); return [w, h, clamp(o.m, 1, w * h - 9)]; }
    return STD[diff] || STD[0];
  };
  const neighbours = (W, Hh) => {
    const NB = [];
    for (let i = 0; i < W * Hh; i++) { const r = (i / W) | 0, c = i % W, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < Hh && cc >= 0 && cc < W) o.push(rr * W + cc); } NB.push(o); }
    return NB;
  };
  /* logické řešení od prvního ťuknutí (pravidla jednoho čísla a podmnožin); st: 0 zakryté, 1 odkryté, 2 jistá mina */
  const solve = (mines, NB, n, start) => {
    const st = new Uint8Array(n), num = new Uint8Array(n), inQ = new Uint8Array(n), inA = new Int32Array(n), vis = new Int32Array(n), Q = [];
    let total = n, opened = 0, stamp = 0;
    for (let i = 0; i < n; i++) { if (mines[i]) total--; let k = 0; for (const j of NB[i]) k += mines[j]; num[i] = k; }
    const touch = i => { for (const k of NB[i]) if (st[k] === 1 && num[k] && !inQ[k]) { inQ[k] = 1; Q.push(k); } };
    const open = i => {
      const s = [i];
      while (s.length) {
        const j = s.pop(); if (st[j]) continue;
        st[j] = 1; opened++; touch(j);
        if (num[j]) { if (!inQ[j]) { inQ[j] = 1; Q.push(j); } } else for (const k of NB[j]) if (!st[k]) s.push(k);
      }
    };
    const flag = i => { if (!st[i]) { st[i] = 2; touch(i); } };
    const unk = (i, out) => { out.length = 0; let f = 0; for (const j of NB[i]) { if (!st[j]) out.push(j); else if (st[j] === 2) f++; } return num[i] - f; };
    const U = [], A = [], B = [];
    const drain = () => {
      while (Q.length) {
        const i = Q.pop(); inQ[i] = 0;
        const need = unk(i, U); if (!U.length) continue;
        if (!need) for (const j of U) open(j); else if (need === U.length) for (const j of U) flag(j);
      }
    };
    open(start); drain();
    while (opened < total) {
      let changed = false;
      for (let a = 0; a < n && opened < total; a++) {
        if (st[a] !== 1 || !num[a]) continue;
        const na = unk(a, A); if (A.length < 2) continue;
        stamp++; for (const x of A) inA[x] = stamp;
        let hit = false;
        for (let p = 0; p < A.length && !hit; p++) for (const b of NB[A[p]]) {
          if (b === a || vis[b] === stamp || st[b] !== 1 || !num[b]) continue; vis[b] = stamp;
          const nb = unk(b, B); if (!B.length || B.length >= A.length) continue;
          let sub = true; for (const x of B) if (inA[x] !== stamp) { sub = false; break; }
          if (!sub) continue;
          const nd = na - nb;
          if (nd !== 0 && nd !== A.length - B.length) continue;
          for (const x of B) inA[x] = -stamp;
          const D = A.filter(x => inA[x] === stamp);
          if (nd === 0) for (const x of D) open(x); else for (const x of D) flag(x);
          drain(); hit = changed = true; break;
        }
      }
      if (!changed) break;
    }
    return { ok: opened >= total, st, num };
  };
  /* logika uvázla: miny kolem náhodného čísla na hranici se přesunou dovnitř zakrytého území (nebo se uberou) */
  const repair = (mines, r, NB, n, canCut, safe) => {
    const { st, num } = r, front = [];
    for (let i = 0; i < n; i++) if (st[i] === 1 && num[i] && NB[i].some(j => !st[j])) front.push(i);
    let p, from;
    if (front.length) { p = H.pick(front); from = NB[p].filter(j => !st[j] && mines[j]); }
    else {
      const walls = []; for (let i = 0; i < n; i++) if (st[i] === 2 && NB[i].some(j => !st[j])) walls.push(i);
      if (!walls.length) return -1;
      p = H.pick(walls); from = [p];
    }
    /* kam s minou: nejlépe do zakrytého vnitřku, pak k okraji, nakonec i do už vyřešené části (vše se pak řeší znovu od začátku) */
    const near = new Set([p, ...NB[p], safe, ...NB[safe]]), inner = [], loose = [], any = [];
    for (let i = 0; i < n; i++) if (!mines[i] && !near.has(i)) (st[i] ? any : NB[i].some(j => st[j] === 1) ? loose : inner).push(i);
    let cut = 0;
    for (const j of from) {
      const pool = inner.length ? inner : loose.length ? loose : any;
      if (pool.length) { const k = H.rnd(pool.length); mines[pool[k]] = 1; pool[k] = pool[pool.length - 1]; pool.pop(); mines[j] = 0; }
      else if (canCut) { mines[j] = 0; cut++; } else return -1;
    }
    return cut;
  };
  const lay = (n, NB, safe, m) => {
    const ban = new Set([safe, ...NB[safe]]), pool = [];
    for (let i = 0; i < n; i++) if (!ban.has(i)) pool.push(i);
    H.shuffle(pool);
    const mines = Array(n).fill(0); for (let k = 0; k < m; k++) mines[pool[k]] = 1;
    return mines;
  };
  /* stavba pole po krátkých dávkách: nejdřív náhodné pokusy, pak opravy uvázlých míst; po limitu vezme, co má */
  const generator = (NB, n, safe, m0, canCut) => {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), t0 = now();
    const randMs = n <= 400 ? 300 : n <= HUGE ? 120 : 0, cap = n > HUGE ? 2800 : 1800;
    let m = Math.min(m0, n - 9), mines = null, fixing = false;
    return budget => {
      const until = now() + budget;
      do {
        if (!mines || !fixing) mines = lay(n, NB, safe, m);
        const r = solve(mines, NB, n, safe), t = now() - t0;
        if (r.ok) return { mines, m, clean: true };
        if (t > cap) return { mines, m, clean: false };
        if (t >= randMs) {
          fixing = true;
          const c = repair(mines, r, NB, n, canCut, safe);
          if (c < 0) mines = null; else m -= c;
        }
      } while (now() < until);
      return null;
    };
  };
  const range = (label, min, max, val, on, done) => {
    const out = el('b', { text: val });
    return el('label', { class: 'rangerow' }, el('span', {}, label + ' ', out),
      el('input', { type: 'range', min, max, value: val, oninput: e => { out.textContent = e.target.value; on(+e.target.value); }, onchange: () => { if (done) done(); } }));
  };

  H.register({
    id: 'miny', name: 'Miny', icon: '💣', grad: ['#047857', '#0f766e'], saveable: true, winLose: true, bestFmt: 'time',
    desc: 'Odkryj pole a vyhni se minám',
    modes: [{ id: 'std', name: 'Klasika' }, { id: 'xl', name: 'Obří pole' }, { id: 'giga', name: 'Gigant' }, { id: 'own', name: 'Vlastní' }],
    diffNamesFor: mode => mode === 'xl' ? ['XL 12×18', 'XXL 16×24', 'XXXL 20×30', 'XXXXL 24×40']
      : mode === 'giga' ? ['Obr 32×50', 'Titán 40×64', 'Kolos 50×80', 'Gigant 64×100']
      : mode === 'own' ? null : ['Malé pole', 'Střední pole', 'Velké pole', 'Minové peklo'],
    variant: { name: 'Na čas', desc: 'Běží odpočet. Kdo nestihne, prohrál. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Vyhraj v Minách', kind: 'win' },
    help: 'Číslo říká, kolik min sousedí s políčkem. Dole si přepínáš, jestli ťuknutí odkrývá, nebo dává vlajku. Vlajku položíš i dlouhým stiskem. Když ťukneš na odkryté číslo, kolem kterého už leží stejný počet vlajek, odkryjí se naráz všechna ostatní sousední políčka (pozor, špatná vlajka znamená výbuch). Velká pole posouváš tažením prstu. Hra se snaží postavit pole, které jde vyřešit bez hádání; gigantická pole se chvilku připravují.',
    menuExtra(sel, opts, refresh) {
      if (sel.mode !== 'own') return [];
      opts.w = clamp(opts.w || 12, 5, MAXW); opts.h = clamp(opts.h || 16, 5, MAXH);
      const maxM = opts.w * opts.h - 9; opts.m = clamp(opts.m || 30, 1, maxM);
      return [el('h3', { text: 'Vlastní pole' }),
        range('Sloupce:', 5, MAXW, opts.w, v => { opts.w = v; }, refresh), range('Řádky:', 5, MAXH, opts.h, v => { opts.h = v; }, refresh),
        range('Miny:', 1, maxM, opts.m, v => { opts.m = v; }, refresh),
        el('p', { class: 'muted', text: `Pole ${opts.w}×${opts.h}, nejvýš ${maxM} min. Když zadaný počet nepůjde rozumně postavit, hra ho mírně sníží.` })];
    },
    start(root, ctx) {
      const mode = ctx.mode || 'std', [W, Hh, M0] = dims(mode, ctx.diff, ctx.opts || {}), n = W * Hh, huge = n > HUGE;
      const limit = Math.round(n * (huge ? 1.8 : 2.2)), NB = neighbours(W, Hh), big = W > 8;
      const sv = ctx.saved && ctx.saved.open && ctx.saved.open.length === n ? ctx.saved : null;
      let st = sv || { mines: null, open: Array(n).fill(0), flag: Array(n).fill(0), time: 0, hints: ctx.upg.detector, M: M0 };
      let over = false, flagMode = false, tick = 0, boom = -1, busy = false, gen = 0, saveT = 0, num = null;
      let opened = st.open.reduce((a, b) => a + b, 0), flags = st.flag.reduce((a, b) => a + b, 0);
      const setMines = m => { st.mines = m; num = new Uint8Array(n); for (let i = 0; i < n; i++) { let k = 0; for (const j of NB[i]) k += m[j]; num[i] = k; } };
      if (st.mines) setMines(st.mines);
      const info = el('p', { class: 'g-score' });
      const status = el('p', { class: 'g-status', role: 'status' });
      const board = el('div', { class: 'board mines' + (big ? ' big' : '') + (huge ? ' giga' : ''), style: `--n:${W}` });
      /* jedna tlačítková buňka na políčko, ale události řeší jediný posluchač na celé desce;
         u gigantických polí jsou buňky v samostatných řádcích, aby změna políčka nepřepočítávala celou mřížku */
      const cells = new Array(n), frag = document.createDocumentFragment();
      let row = null;
      for (let i = 0; i < n; i++) {
        if (huge && i % W === 0) { row = document.createElement('div'); row.className = 'mrow'; frag.appendChild(row); }
        const c = document.createElement('button'); c.type = 'button'; c.className = 'cell'; c.$i = i; cells[i] = c; (huge ? row : frag).appendChild(c);
      }
      board.appendChild(frag);
      let press = 0, longDone = false, px = 0, py = 0;
      const cellOf = e => { const c = e.target && e.target.closest ? e.target.closest('.cell') : null; return c && c.$i !== undefined && cells[c.$i] === c ? c : null; };
      board.addEventListener('click', e => { const c = cellOf(e); if (!c) return; if (longDone) { longDone = false; return; } tap(c.$i); });
      board.addEventListener('pointerdown', e => {
        longDone = false; clearTimeout(press); const c = cellOf(e); if (!c) return;
        px = e.clientX; py = e.clientY; press = setTimeout(() => { longDone = true; toggleFlag(c.$i); }, 420);
      });
      board.addEventListener('pointermove', e => { if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 10) clearTimeout(press); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerout']) board.addEventListener(ev, () => clearTimeout(press));
      board.addEventListener('contextmenu', e => e.preventDefault());
      const modeBtn = el('button', { class: 'btn big', 'aria-pressed': 'false', onclick: () => { flagMode = !flagMode; ui(); } });
      const hintBtn = el('button', { class: 'btn ghost', onclick: hint });
      root.append(info, status, big ? H.pan(board) : board, el('div', { class: 'g-actions' }, modeBtn, ctx.upg.detector ? hintBtn : null));
      const head = () => { info.textContent = `💣 ${st.M - flags}   ⏱ ${ctx.variant ? H.fmtTime(Math.max(0, limit - st.time)) : H.fmtTime(st.time)}`; };
      const ui = () => {
        head();
        modeBtn.textContent = flagMode ? '🚩 Režim: VLAJKA' : '⛏ Režim: ODKRÝT';
        modeBtn.setAttribute('aria-pressed', String(flagMode));
        modeBtn.classList.toggle('alt', flagMode);
        hintBtn.textContent = `📡 Nápověda (${st.hints})`;
        hintBtn.disabled = over || !st.hints || !st.mines;
      };
      /* kreslí se jen změněná políčka; shown drží kód toho, co buňka právě ukazuje */
      const shown = new Int16Array(n).fill(-1), dq = new Uint8Array(n), dirty = [];
      const draw = i => {
        const o = st.open[i], f = st.flag[i], mine = st.mines && st.mines[i];
        let k = o ? 10 + num[i] : f ? 1 : 0;
        if (over && mine && !f) k = i === boom ? 21 : 20;
        if (over && f && !mine) k = 22;
        const code = over ? k + 100 : k;
        if (shown[i] === code) return;
        shown[i] = code;
        let t = '', cls = 'cell', label = 'zakryté';
        if (k >= 10 && k < 20) { const v = k - 10; t = v ? String(v) : ''; cls += ' open n' + v; label = v ? v + ' min okolo' : 'prázdné'; }
        else if (k === 1) { t = '🚩'; label = 'vlajka'; }
        else if (k === 20 || k === 21) { t = '💣'; cls += k === 21 ? ' boom' : ' open'; label = 'mina'; }
        else if (k === 22) { t = '✖'; label = 'špatná vlajka'; }
        const c = cells[i];
        if (c.textContent !== t) c.textContent = t;
        if (c.className !== cls) c.className = cls;
        c.disabled = over || k === 10;
        c.setAttribute('aria-label', `Řádek ${((i / W) | 0) + 1}, sloupec ${i % W + 1}: ${label}`);
      };
      const mark = i => { if (!dq[i]) { dq[i] = 1; dirty.push(i); } };
      const flush = () => { for (const i of dirty) { dq[i] = 0; draw(i); } dirty.length = 0; ui(); };
      const paintAll = () => { for (let i = 0; i < n; i++) draw(i); dirty.length = 0; dq.fill(0); ui(); };
      /* u obřích polí se ukládá nejvýš jednou za chvíli (a hned při odchodu nebo skrytí appky) */
      const flushSave = () => { if (saveT) { clearTimeout(saveT); saveT = 0; ctx.save(st); } };
      const save = () => { if (!huge) return ctx.save(st); if (!saveT) saveT = setTimeout(() => { saveT = 0; ctx.save(st); }, 1500); };
      const onHide = () => { if (document.hidden) flushSave(); };
      document.addEventListener('visibilitychange', onHide);
      const reveal = i => {
        const stack = [i];
        while (stack.length) {
          const j = stack.pop();
          if (st.open[j] || st.flag[j]) continue;
          st.open[j] = 1; opened++; mark(j);
          if (!num[j]) for (const k of NB[j]) if (!st.open[k]) stack.push(k);
        }
      };
      const end = res => {
        over = true; clearInterval(tick); clearTimeout(saveT); saveT = 0; paintAll();
        status.textContent = res === 'win' ? 'Pole je čisté!' : 'Bum! Tentokrát to nevyšlo.';
        const xp = res !== 'win' ? 8 : mode === 'xl' ? XPX[ctx.diff] : mode === 'giga' ? XPG[ctx.diff]
          : mode === 'own' ? Math.min(2500, Math.round(Math.min(st.M, n - st.M) * 3.5)) : XPS[ctx.diff];
        ctx.end({ result: res, xp, score: res === 'win' && mode !== 'own' ? st.time : null, lower: true });
      };
      const checkWin = () => { if (opened >= n - st.M) end('win'); else { save(); flush(); } };
      const startClock = () => {
        if (tick) return;
        tick = setInterval(() => {
          if (document.hidden || over || ctx.paused) return;
          st.time++;
          if (ctx.variant && st.time >= limit) { H.sfx('lose'); return end('loss'); }
          if (st.time % 5 === 0) save();
          head();
        }, 1000);
      };
      const blast = i => { boom = i; H.sfx('boom'); H.buzz(120); H.shake(board); end('loss'); };
      function toggleFlag(i) {
        if (over || st.open[i]) return;
        st.flag[i] = st.flag[i] ? 0 : 1; flags += st.flag[i] ? 1 : -1;
        H.sfx('tap'); H.buzz(12); if (st.mines) save(); mark(i); flush();
      }
      /* akord: kolem odkrytého čísla je stejně vlajek jako min, takže se odkryje zbytek sousedů */
      function chord(i) {
        if (!num || !num[i]) return;
        let f = 0; const hid = [];
        for (const j of NB[i]) { if (st.flag[j]) f++; else if (!st.open[j]) hid.push(j); }
        if (f !== num[i] || !hid.length) return;
        for (const j of hid) if (st.mines[j]) return blast(j);
        H.sfx('place'); for (const j of hid) reveal(j); checkWin();
      }
      function tap(i) {
        if (over || busy) return;
        if (st.open[i]) return chord(i);
        if (flagMode) return toggleFlag(i);
        if (st.flag[i]) return;
        if (!st.mines) {
          busy = true; status.textContent = 'Připravuji pole…';
          const job = generator(NB, n, i, st.M, mode !== 'std');
          const step = () => {
            gen = 0; if (over) return;
            const b = job(14);
            if (!b) { gen = setTimeout(step, 0); return; }
            setMines(b.mines); busy = false;
            if (b.m !== st.M) { st.M = b.m; status.textContent = `Pole zjednodušeno na ${b.m} min${b.clean ? ', jde vyřešit bez hádání' : ''}.`; }
            else status.textContent = b.clean ? 'Tohle pole jde vyřešit bez hádání.' : 'Pole je připravené. Občas možná budeš muset hádat.';
            startClock(); H.sfx('place'); reveal(i); checkWin();
          };
          gen = setTimeout(step, 30);
          return;
        }
        if (st.mines[i]) return blast(i);
        H.sfx('place'); reveal(i); checkWin();
      }
      function hint() {
        if (over || !st.hints || !st.mines) return;
        const safe = []; for (let i = 0; i < n; i++) if (!st.open[i] && !st.mines[i]) safe.push(i);
        if (!safe.length) return;
        const edge = safe.filter(i => NB[i].some(j => st.open[j]));
        st.hints--;
        const i = H.pick(edge.length ? edge : safe);
        if (st.flag[i]) { st.flag[i] = 0; flags--; }
        H.sfx('coin'); reveal(i); mark(i);
        if (big && cells[i].scrollIntoView) cells[i].scrollIntoView({ block: 'center', inline: 'center' });
        checkWin();
      }
      if (st.mines) startClock();
      paintAll();
      status.textContent = sv ? 'Pokračuješ v rozehrané hře.' : 'První ťuknutí je vždy bezpečné.';
      return {
        destroy() {
          clearInterval(tick); clearTimeout(press); clearTimeout(gen);
          if (!over) flushSave();
          document.removeEventListener('visibilitychange', onHide);
          over = true;
        }
      };
    }
  });
  if (typeof module !== 'undefined') module.exports /* jen pro testy generátoru mimo prohlížeč */ = { solve, repair, generator, neighbours, lay, GIGA, XL, STD };
})();
