'use strict';
/* Sudoku 4×4, 9×9 a 16×16 (jen čísla): generátor s jediným řešením, obtížnost podle potřebných technik */
(function () {
  /* ---------- Výpočetní jádro (bez DOM, testovatelné v node) ---------- */
  const E = (() => {
    const PC = new Uint8Array(1 << 16);
    for (let i = 1; i < PC.length; i++) PC[i] = PC[i >> 1] + (i & 1);
    const hi = m => 31 - Math.clz32(m);
    const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    const rnd = n => Math.floor(Math.random() * n);
    const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    /* žebříček technik: [název, úroveň]; úroveň 0 Lehké, 1 Střední, 2 Těžké, 3+ Ďábelské */
    const TECH = [
      ['Jediný kandidát', 0], ['Jediné místo', 0],
      ['Zamčený kandidát (ukazování)', 1], ['Zamčený kandidát (vymezení)', 1], ['Nahá dvojice', 1], ['Skrytá dvojice', 1],
      ['Nahá trojice', 2], ['Skrytá trojice', 2], ['X-Wing', 2],
      ['Swordfish', 3], ['XY-Wing', 3],
      ['nad rámec základních technik (řetězce nebo zkoušení)', 4]
    ];
    const lvlOf = t => t < 0 ? 0 : TECH[t][1];

    const GEO = {};
    const geo = N => {
      if (GEO[N]) return GEO[N];
      const b = Math.round(Math.sqrt(N)), NN = N * N, FULL = (1 << N) - 1;
      const R = new Int8Array(NN), C = new Int8Array(NN), B = new Int8Array(NN);
      for (let i = 0; i < NN; i++) { R[i] = (i / N) | 0; C[i] = i % N; B[i] = ((R[i] / b) | 0) * b + ((C[i] / b) | 0); }
      const units = [];
      for (let r = 0; r < N; r++) units.push(Int16Array.from({ length: N }, (_, k) => r * N + k));
      for (let c = 0; c < N; c++) units.push(Int16Array.from({ length: N }, (_, k) => k * N + c));
      for (let x = 0; x < N; x++) { const u = []; for (let i = 0; i < NN; i++) if (B[i] === x) u.push(i); units.push(Int16Array.from(u)); }
      const P = 3 * N - 2 * b - 1, peers = new Int16Array(NN * P);
      for (let i = 0; i < NN; i++) { let k = 0; for (let j = 0; j < NN; j++) if (j !== i && (R[i] === R[j] || C[i] === C[j] || B[i] === B[j])) peers[i * P + k++] = j; }
      const see = (i, j) => R[i] === R[j] || C[i] === C[j] || B[i] === B[j];
      return (GEO[N] = { N, b, NN, FULL, R, C, B, units, P, peers, see });
    };

    const place = (g, v, c, i, d) => {
      v[i] = d; c[i] = 0;
      const nb = ~(1 << (d - 1)), pe = g.peers, o = i * g.P;
      for (let k = 0; k < g.P; k++) c[pe[o + k]] &= nb;
    };
    const init = (g, puz, v, c) => {
      v.fill(0); c.fill(g.FULL);
      for (let i = 0; i < g.NN; i++) if (puz[i]) { if (!(c[i] & (1 << (puz[i] - 1)))) return false; place(g, v, c, i, puz[i]); }
      return true;
    };
    /* jediný kandidát v políčku: -1 spor, 1 pokrok, 0 nic */
    const nakedSingles = (g, v, c) => {
      let p = 0;
      for (let i = 0; i < g.NN; i++) if (!v[i]) { const m = c[i]; if (!m) return -1; if (!(m & (m - 1))) { place(g, v, c, i, hi(m) + 1); p = 1; } }
      return p;
    };
    /* jediné místo pro číslo v řádku, sloupci nebo čtverci */
    const hiddenSingles = (g, v, c) => {
      const { units, N, FULL } = g; let p = 0;
      for (let ui = 0; ui < units.length; ui++) {
        const u = units[ui]; let once = 0, twice = 0, placed = 0;
        for (let k = 0; k < N; k++) { const i = u[k]; if (v[i]) placed |= 1 << (v[i] - 1); else { twice |= once & c[i]; once |= c[i]; } }
        if ((once | placed) !== FULL) return -1;
        let hs = once & ~twice;
        while (hs) {
          const bit = hs & -hs; hs ^= bit;
          for (let k = 0; k < N; k++) { const i = u[k]; if (!v[i] && (c[i] & bit)) { place(g, v, c, i, hi(bit) + 1); p = 1; break; } }
        }
      }
      return p;
    };
    /* zamčený kandidát: ukazování (čtverec → řádek/sloupec) */
    const pointing = (g, v, c) => {
      const { N, units, R, C, B } = g;
      for (let x = 0; x < N; x++) {
        const u = units[2 * N + x];
        for (let d = 0; d < N; d++) {
          const bit = 1 << d; let rm = 0, cm = 0;
          for (let k = 0; k < N; k++) { const i = u[k]; if (c[i] & bit) { rm |= 1 << R[i]; cm |= 1 << C[i]; } }
          if (!rm) continue;
          let p = false;
          if (!(rm & (rm - 1))) { const line = units[hi(rm)]; for (let k = 0; k < N; k++) { const i = line[k]; if (B[i] !== x && (c[i] & bit)) { c[i] &= ~bit; p = true; } } }
          if (!(cm & (cm - 1))) { const line = units[N + hi(cm)]; for (let k = 0; k < N; k++) { const i = line[k]; if (B[i] !== x && (c[i] & bit)) { c[i] &= ~bit; p = true; } } }
          if (p) return true;
        }
      }
      return false;
    };
    /* zamčený kandidát: vymezení (řádek/sloupec → čtverec) */
    const claiming = (g, v, c) => {
      const { N, units, R, C, B } = g;
      for (let ui = 0; ui < 2 * N; ui++) {
        const u = units[ui], row = ui < N;
        for (let d = 0; d < N; d++) {
          const bit = 1 << d; let bm = 0;
          for (let k = 0; k < N; k++) { const i = u[k]; if (c[i] & bit) bm |= 1 << B[i]; }
          if (!bm || (bm & (bm - 1))) continue;
          const box = units[2 * N + hi(bm)]; let p = false;
          for (let k = 0; k < N; k++) { const i = box[k]; if ((row ? R[i] !== ui : C[i] !== ui - N) && (c[i] & bit)) { c[i] &= ~bit; p = true; } }
          if (p) return true;
        }
      }
      return false;
    };
    /* kombinace k prvků z pole (k = 2 nebo 3), cb vrací true = konec */
    const combos = (arr, k, cb) => {
      const n = arr.length;
      if (k === 2) { for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (cb([arr[a], arr[b]])) return true; return false; }
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let e = b + 1; e < n; e++) if (cb([arr[a], arr[b], arr[e]])) return true;
      return false;
    };
    /* nahá dvojice/trojice */
    const nakedSubset = (g, v, c, k) => {
      const { units, N } = g;
      for (let ui = 0; ui < units.length; ui++) {
        const u = units[ui], cells = []; let empty = 0;
        for (let q = 0; q < N; q++) { const i = u[q]; if (!v[i]) { empty++; if (PC[c[i]] <= k) cells.push(i); } }
        if (cells.length < k || empty <= k) continue;
        if (combos(cells, k, set => {
          let m = 0; for (const i of set) m |= c[i];
          if (PC[m] !== k) return false;
          let p = false;
          for (let q = 0; q < N; q++) { const i = u[q]; if (!v[i] && !set.includes(i) && (c[i] & m)) { c[i] &= ~m; p = true; } }
          return p;
        })) return true;
      }
      return false;
    };
    /* skrytá dvojice/trojice */
    const hiddenSubset = (g, v, c, k) => {
      const { units, N } = g, pos = new Int32Array(N);
      for (let ui = 0; ui < units.length; ui++) {
        const u = units[ui]; pos.fill(0);
        for (let q = 0; q < N; q++) { let m = c[u[q]]; while (m) { const bit = m & -m; m ^= bit; pos[hi(bit)] |= 1 << q; } }
        const ds = [];
        for (let d = 0; d < N; d++) if (PC[pos[d]] >= 2 && PC[pos[d]] <= k) ds.push(d);
        if (ds.length < k) continue;
        if (combos(ds, k, set => {
          let pm = 0, dm = 0; for (const d of set) { pm |= pos[d]; dm |= 1 << d; }
          if (PC[pm] !== k) return false;
          let p = false;
          while (pm) { const bit = pm & -pm; pm ^= bit; const i = u[hi(bit)]; if (c[i] & ~dm) { c[i] &= dm; p = true; } }
          return p;
        })) return true;
      }
      return false;
    };
    /* ryby: X-Wing (k = 2), Swordfish (k = 3) */
    const fish = (g, v, c, k) => {
      const { N, units, R, C } = g;
      for (let d = 0; d < N; d++) {
        const bit = 1 << d;
        for (let o = 0; o < 2; o++) {
          const lines = [], masks = {};
          for (let l = 0; l < N; l++) {
            const u = units[o * N + l]; let m = 0;
            for (let q = 0; q < N; q++) { const i = u[q]; if (c[i] & bit) m |= 1 << (o ? R[i] : C[i]); }
            if (PC[m] >= 2 && PC[m] <= k) { lines.push(l); masks[l] = m; }
          }
          if (lines.length < k) continue;
          if (combos(lines, k, set => {
            let um = 0, lm = 0; for (const l of set) { um |= masks[l]; lm |= 1 << l; }
            if (PC[um] !== k) return false;
            let p = false;
            while (um) {
              const b = um & -um; um ^= b;
              const cover = units[(o ? 0 : N) + hi(b)];
              for (let q = 0; q < N; q++) { const i = cover[q]; if ((c[i] & bit) && !(lm & (1 << (o ? C[i] : R[i])))) { c[i] &= ~bit; p = true; } }
            }
            return p;
          })) return true;
        }
      }
      return false;
    };
    /* XY-Wing: pivot {x,y}, křídla {x,z} a {y,z} → z pryč ze všech, kdo vidí obě křídla */
    const xyWing = (g, v, c) => {
      const { NN, P, peers, see } = g;
      for (let i = 0; i < NN; i++) {
        const ci = c[i]; if (v[i] || PC[ci] !== 2) continue;
        for (let a = 0; a < P; a++) {
          const pa = peers[i * P + a], ca = c[pa];
          if (v[pa] || PC[ca] !== 2 || ca === ci || !(ca & ci)) continue;
          const z = ca & ~ci, want = (ci & ~ca) | z;
          for (let b = 0; b < P; b++) {
            const pb = peers[i * P + b];
            if (pb === pa || v[pb] || c[pb] !== want) continue;
            let p = false;
            for (let q = 0; q < P; q++) { const x = peers[pa * P + q]; if (x !== pb && x !== i && !v[x] && (c[x] & z) && see(x, pb)) { c[x] &= ~z; p = true; } }
            if (p) return true;
          }
        }
      }
      return false;
    };
    const STEPS = [
      [2, (g, v, c) => pointing(g, v, c)], [3, (g, v, c) => claiming(g, v, c)],
      [4, (g, v, c) => nakedSubset(g, v, c, 2)], [5, (g, v, c) => hiddenSubset(g, v, c, 2)],
      [6, (g, v, c) => nakedSubset(g, v, c, 3)], [7, (g, v, c) => hiddenSubset(g, v, c, 3)], [8, (g, v, c) => fish(g, v, c, 2)],
      [9, (g, v, c) => fish(g, v, c, 3)], [10, (g, v, c) => xyWing(g, v, c)]
    ];
    /* lidský řešitel: vždy zkusí nejjednodušší techniku; cap = nejvyšší povolená úroveň; sol = kontrola správnosti (testy) */
    const logic = (g, puz, cap, sol) => {
      const v = new Int8Array(g.NN), c = new Int32Array(g.NN), used = new Array(TECH.length).fill(0);
      if (!init(g, puz, v, c)) return { ok: false, lvl: 9, tech: -1, used };
      let tech = -1, hard = 0, sound = true;
      const check = () => { if (sol) for (let i = 0; i < g.NN; i++) if (v[i] ? v[i] !== sol[i] : !(c[i] & (1 << (sol[i] - 1)))) sound = false; };
      for (;;) {
        let left = 0; for (let i = 0; i < g.NN; i++) if (!v[i]) { left = 1; break; }
        if (!left) return { ok: true, lvl: lvlOf(tech), tech, hard, used, sound };
        let r = nakedSingles(g, v, c);
        if (r < 0) return { ok: false, lvl: 9, tech: -1, used, sound: false };
        if (r) { used[0]++; if (tech < 0) tech = 0; check(); continue; }
        r = hiddenSingles(g, v, c);
        if (r < 0) return { ok: false, lvl: 9, tech: -1, used, sound: false };
        if (r) { used[1]++; if (tech < 1) tech = 1; check(); continue; }
        let done = false;
        for (const [t, fn] of STEPS) {
          if (TECH[t][1] > cap) break;
          if (fn(g, v, c)) { used[t]++; if (t > tech) tech = t; if (TECH[t][1] >= 2) hard++; done = true; check(); break; }
        }
        if (!done) return { ok: false, lvl: 4, tech: 11, hard, used, sound };
      }
    };
    /* počítání řešení: propagace jedniček + větvení podle nejmenšího počtu kandidátů */
    const count = (g, puz, limit, out, random, maxNodes) => {
      const v0 = new Int8Array(g.NN), c0 = new Int32Array(g.NN);
      if (!init(g, puz, v0, c0)) return 0;
      let n = 0, nodes = 0, abort = false;
      const rec = (v, c) => {
        if (maxNodes && ++nodes > maxNodes) { abort = true; return; }
        for (;;) {
          const a = nakedSingles(g, v, c); if (a < 0) return;
          const b = hiddenSingles(g, v, c); if (b < 0) return;
          if (!a && !b) break;
        }
        let best = -1, bc = 99;
        for (let i = 0; i < g.NN; i++) if (!v[i]) { const k = PC[c[i]]; if (k < bc) { bc = k; best = i; if (k === 2) break; } }
        if (best < 0) { n++; if (out && n === 1) for (let i = 0; i < g.NN; i++) out[i] = v[i]; return; }
        const ds = []; let m = c[best]; while (m) { const bit = m & -m; m ^= bit; ds.push(hi(bit) + 1); }
        if (random) shuf(ds);
        for (const d of ds) {
          const v2 = v.slice(), c2 = c.slice(); place(g, v2, c2, best, d);
          rec(v2, c2);
          if (n >= limit || abort) return;
        }
      };
      rec(v0, c0);
      return abort ? -1 : n;
    };
    /* náhodná plná mřížka */
    const fill = g => {
      const out = new Int8Array(g.NN);
      for (;;) if (count(g, new Int8Array(g.NN), 1, out, true, 3000) === 1) return Array.from(out);
    };
    /* ubírání čísel, dokud zadání jde vyřešit technikami do úrovně cap (tím je jisté i jediné řešení) */
    function* digLogic(g, sol, cap, lo, hiC, want) {
      const puz = sol.slice(); let n = g.NN, cur = { ok: true, lvl: 0, tech: -1, hard: 0 };
      const target = lo + rnd(hiC - lo + 1);
      for (const i of shuf([...Array(g.NN).keys()])) {
        if (n <= lo || (n <= target && cur.lvl >= want)) break;
        const d = puz[i]; puz[i] = 0;
        const r = logic(g, puz, cap);
        /* jakmile zadání dosáhne cílové úrovně, další ubírání ho už nesmí zjednodušit */
        if (r.ok && r.lvl >= Math.min(want, cur.lvl)) { n--; cur = r; } else puz[i] = d;
        yield;
      }
      return { puz, n, lvl: cur.lvl, tech: cur.tech, hard: cur.hard };
    }
    /* ubírání čísel s kontrolou jediného řešení až na minimální zadání (Ďábelské 9×9), pak hodnocení */
    function* digUnique(g, sol) {
      const puz = sol.slice(); let n = g.NN;
      for (const i of shuf([...Array(g.NN).keys()])) {
        const d = puz[i]; puz[i] = 0;
        if (count(g, puz, 2) !== 1) puz[i] = d; else n--;
        yield;
      }
      const r = logic(g, puz, 3);
      return { puz, n, lvl: r.lvl, tech: r.tech, hard: r.hard };
    }
    /* [nejvyšší povolená úroveň technik, min. čísel, max. čísel, požadovaná úroveň]; null = minimální zadání s kontrolou jednoznačnosti */
    /* 4×4: každé zadání se vyřeší jednoduchými kroky, obtížnost tu určuje jen počet zadaných čísel */
    const CFG = {
      4: [[0, 10, 10, 0], [0, 8, 8, 0], [0, 6, 6, 0], [0, 4, 5, 0]],
      9: [[0, 36, 40, 0], [1, 29, 34, 1], [2, 24, 31, 2], null],
      16: [[0, 140, 148, 0], [1, 124, 132, 1], [2, 110, 118, 2], [3, 98, 106, 3]]
    };
    /* časový strop (ms); běžně je zadání hotové mnohem dřív */
    const BUDGET = { 4: [300, 300, 300, 300], 9: [900, 900, 1800, 2800], 16: [2600, 2600, 2600, 2600] };
    /* generátor po kouscích (yield = místo pro přerušení kvůli plynulosti UI) */
    function* gen(N, diff, budget) {
      const g = geo(N), t0 = now(), lim = budget || BUDGET[N][diff], cfg = CFG[N][diff];
      /* Ďábelské 9×9: většinou chce zadání řešitelné technikami žebříčku (Swordfish, XY-Wing), asi v třetině případů vezme rovnou i těžší */
      const anyBeyond = !cfg && Math.random() < 1 / 3;
      let best = null;
      const better = r => !best || r.lvl > best.lvl || (r.lvl === best.lvl && (r.hard > best.hard || (r.hard === best.hard && r.n < best.n)));
      for (let tries = 1; ; tries++) {
        const sol = fill(g); yield;
        const r = cfg ? yield* digLogic(g, sol, cfg[0], cfg[1], cfg[2], cfg[3]) : yield* digUnique(g, sol);
        r.sol = sol; r.tries = tries;
        const ok = cfg ? r.lvl >= cfg[3] && r.n <= cfg[2] : r.lvl === 3 || (r.lvl > 3 && (anyBeyond || now() - t0 > lim * 0.4));
        if (ok) { r.ms = now() - t0; return r; }
        if (better(r)) best = r;
        if (now() - t0 > lim) { best.ms = now() - t0; best.tries = tries; return best; }
      }
    }
    const genSync = (N, diff, budget) => { const it = gen(N, diff, budget); for (;;) { const r = it.next(); if (r.done) return r.value; } };
    return { TECH, geo, logic, count, fill, gen, genSync, lvlOf };
  })();

  /* ---------- Hra ---------- */
  const { el } = H;
  /* režim = počet čísel; 9×9 zůstává první kvůli dosavadním rekordům */
  const SIZE = { '9': 9, '4': 4, '16': 16 };
  const XP = { 4: [10, 14, 18, 22], 9: [40, 70, 110, 160], 16: [150, 220, 300, 420] };
  const DIFFN = ['Lehké', 'Střední', 'Těžké', 'Ďábelské'];
  const ABOUT = {
    '9': 'Mřížka 9×9 se čtverci 3×3, čísla 1 až 9. Klasika.',
    '4': 'Mřížka 4×4 se čtverci 2×2, čísla 1 až 4. Na zahřátí: každé zadání se vyřeší jednoduchými kroky, obtížnost tu určuje jen počet zadaných čísel (10, 8, 6, nebo co nejméně).',
    '16': 'Mřížka 16×16 se čtverci 4×4, čísla 1 až 16. Velký hlavolam na delší chvíli, pole na telefonu posouváš tažením prstu.'
  };
  /* spustí generátor po časových dílcích, aby appka nezamrzla */
  const runGen = (N, diff, done) => {
    const it = E.gen(N, diff); let tm = 0, dead = false;
    const step = () => {
      if (dead) return;
      const t = Date.now(); let r;
      do { r = it.next(); } while (!r.done && Date.now() - t < 16);
      if (r.done) done(r.value); else tm = setTimeout(step, 0);
    };
    tm = setTimeout(step, 40);
    return () => { dead = true; clearTimeout(tm); };
  };
  /* uložená hra: přijme jen úplná a konzistentní data (staré 9×9 bez velikosti i 16×16, kde se znaky 0–F ukládaly jako čísla 1–16) */
  const validSave = sv => {
    if (!sv || !Array.isArray(sv.cur) || !Array.isArray(sv.puz) || !Array.isArray(sv.sol)) return 0;
    const N = Math.round(Math.sqrt(sv.cur.length));
    if (!(N in XP) || sv.cur.length !== N * N || sv.puz.length !== N * N || sv.sol.length !== N * N) return 0;
    const okv = (v, z) => Number.isInteger(v) && v >= (z ? 0 : 1) && v <= N;
    return sv.sol.every(v => okv(v)) && sv.puz.every(v => okv(v, 1)) && sv.cur.every(v => okv(v, 1)) ? N : 0;
  };
  /* poznámky = bitová maska (bit n−1 = číslo n) */
  const noteHas = (m, n) => (m >> (n - 1)) & 1;

  H.register({
    id: 'sudoku', name: 'Sudoku', icon: '🔢', grad: ['#0e7490', '#155e75'], saveable: true, winLose: true, bestFmt: 'time',
    desc: 'Čísla do řádků, sloupců a čtverců: 4×4, 9×9 i 16×16',
    modes: [{ id: '9', name: '9 čísel · klasika' }, { id: '4', name: '4 čísla · mini' }, { id: '16', name: '16 čísel · velké' }],
    diffNames: DIFFN,
    menuExtra: sel => [el('p', { class: 'muted sdk-about', text: ABOUT[sel.mode] || ABOUT['9'] })],
    variant: { name: 'Tři životy', desc: 'Třetí chybně zapsané číslo znamená konec. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Vyřeš Sudoku', kind: 'win' },
    help: 'V každém řádku, sloupci i čtverci musí být každé číslo právě jednou. Velikost vybereš v Režimu: 4 čísla (čtverce 2×2), 9 čísel (klasika se čtverci 3×3), nebo 16 čísel (čtverce 4×4, čísla 1 až 16). Ťukni na políčko a pak na číslo dole. V režimu Poznámky si do políčka píšeš malé tipy. Obtížnost určují techniky, které zadání vyžaduje: Lehké stačí jediný kandidát a jediné místo, Střední potřebuje zamčené kandidáty nebo dvojice, Těžké trojice nebo X-Wing a Ďábelské ještě víc. Mřížka 4×4 je na zahřátí, obtížnost v ní mění jen počet zadaných čísel. Velké pole 16×16 posouváš tažením prstu a pod ním vidíš, kde jsi. Na klávesnici píšeš čísla rovnou; v 16×16 hra po jedničce chvilku čeká na druhou číslici (10 až 16), Enter zapíše hned. Backspace nebo Delete maže, šipky posouvají výběr.',
    engine: E,
    start(root, ctx) {
      const svN = validSave(ctx.saved), sv = svN ? ctx.saved : null;
      const N = sv ? svN : (SIZE[ctx.mode] || 9);
      const g = E.geo(N), NN = g.NN, b = g.b, big = N > 9, all = [...Array(N).keys()].map(k => k + 1);
      let st = null, sel = -1, notes = false, over = false, tick = 0, cancel = null, gone = false, buf = 0, bufTm = 0;
      const info = el('p', { class: 'g-score', role: 'status' });
      const status = el('p', { class: 'g-status sdk-st' });
      const where = el('p', { class: 'sdk-where', 'aria-live': 'polite' });
      const head = () => { info.textContent = `⏱ ${H.fmtTime(st.time)}   Chyby ${st.miss}${ctx.variant ? '/3' : ''}`; };
      let cells = [], nums = [], noteBtn = null, keys = [], labels = [];
      const pick = i => { flush(); sel = i; paint(); };
      const build = () => {
        sel = st.cur.findIndex(v => !v);
        const board = el('div', { class: `board sdk s${N}`, role: 'grid', 'aria-label': `Sudoku ${N}×${N}` });
        cells = st.cur.map((_, i) => el('button', { class: 'cell', onclick: () => pick(i) }));
        keys = cells.map(() => ''); labels = cells.map(() => '');
        board.append(...cells);
        const pad = el('div', { class: `numpad n${N}` });
        nums = all.map(n => el('button', { class: 'btn num', text: String(n), 'aria-label': 'Číslo ' + n, onclick: () => { flush(); put(n); } }));
        noteBtn = el('button', { class: 'btn', 'aria-pressed': 'false', onclick: () => { notes = !notes; paint(); } });
        pad.append(...nums);
        root.textContent = '';
        let view = board;
        if (big) { view = H.pan(board); view.classList.add('sdk-pan'); }
        root.append(info, status, view);
        if (big) root.append(where);
        root.append(pad, el('div', { class: 'g-actions' }, noteBtn, el('button', { class: 'btn ghost', text: '⌫ Smazat', onclick: () => { flush(true); put(0); } })));
        status.textContent = '';
        if (sv && st.time) clock();
        paint();
      };
      const noteNode = m => el('span', { class: 'notes', 'aria-hidden': 'true' }, all.map(n => el('i', { text: noteHas(m, n) ? String(n) : '' })));
      const noteList = m => all.filter(n => noteHas(m, n));
      const paint = () => {
        if (!st) return;
        const sv2 = sel >= 0 ? st.cur[sel] : 0, sr = g.R[sel], sc = g.C[sel], sbx = g.B[sel];
        cells.forEach((c, i) => {
          const v = st.cur[i], r = g.R[i], k = g.C[i], given = !!st.puz[i];
          const peer = sel >= 0 && i !== sel && (r === sr || k === sc || g.B[i] === sbx);
          const cls = 'cell' + (given ? ' given' : '') + (i === sel ? ' sel' : peer ? ' peer' : '') + (v && v === sv2 && i !== sel ? ' same' : '') + (st.bad[i] ? ' bad' : '') +
            (k % b === b - 1 && k < N - 1 ? ' br' : '') + (r % b === b - 1 && r < N - 1 ? ' bb' : '');
          if (c.className !== cls) c.className = cls;
          const key = v ? 'v' + v : 'n' + st.notes[i];
          if (keys[i] !== key) {
            keys[i] = key; c.textContent = '';
            if (v) c.textContent = String(v);
            else if (st.notes[i]) c.append(noteNode(st.notes[i]));
          }
          const lab = `Řádek ${r + 1}, sloupec ${k + 1}: ` + (v ? (given ? 'zadané ' : '') + v + (st.bad[i] ? ', chybně' : '') : st.notes[i] ? 'poznámky ' + noteList(st.notes[i]).join(', ') : 'prázdné');
          if (labels[i] !== lab) { labels[i] = lab; c.setAttribute('aria-label', lab); }
        });
        const cnt = new Array(N + 1).fill(0);
        st.cur.forEach((v, i) => { if (v && !st.bad[i]) cnt[v]++; });
        nums.forEach((bt, n) => { bt.disabled = over || cnt[n + 1] >= N; });
        noteBtn.textContent = notes ? '✏️ Poznámky: ZAP' : '✏️ Poznámky: VYP';
        noteBtn.setAttribute('aria-pressed', String(notes)); noteBtn.classList.toggle('alt', notes);
        if (big) where.textContent = sel < 0 ? '' : `Řádek ${g.R[sel] + 1}, sloupec ${g.C[sel] + 1}` + (buf ? ` · píšeš ${buf}…` : '') +
          (!st.cur[sel] && st.notes[sel] ? ' · poznámky ' + noteList(st.notes[sel]).join(', ') : '');
        head();
      };
      const gradeText = () => {
        const gr = st.grade; if (!gr) return '';
        const t = E.TECH[gr.tech];
        return t ? `Nejtěžší potřebná technika: ${t[0]} (${DIFFN[Math.min(3, gr.lvl)]}).` : 'Zadání šlo vyřešit jen jednoduchými kroky.';
      };
      const finish = res => {
        over = true; clearInterval(tick); clearTimeout(bufTm); buf = 0; paint();
        if (res === 'win') { const t = gradeText(); status.textContent = t; if (t && H.toast) H.toast(t); }
        ctx.end({ result: res, xp: res === 'win' ? XP[N][ctx.diff] : 8, score: res === 'win' ? st.time : null, lower: true });
      };
      function put(n) {
        if (!st || over || sel < 0 || st.puz[sel]) return;
        if (!tick) clock();
        if (n && notes) { if (!st.cur[sel]) st.notes[sel] ^= 1 << (n - 1); H.sfx('tap'); ctx.save(st); return paint(); }
        st.cur[sel] = n; st.bad[sel] = 0;
        if (n && n !== st.sol[sel]) { st.bad[sel] = 1; st.miss++; H.sfx('bad'); H.buzz(40); H.shake(cells[sel]); if (ctx.variant && st.miss >= 3) return finish('loss'); }
        else if (n) {
          H.sfx('place'); st.notes[sel] = 0;
          const nb = ~(1 << (n - 1));
          for (let q = 0; q < g.P; q++) st.notes[g.peers[sel * g.P + q]] &= nb;
          if (st.cur.every((v, i) => v === st.sol[i])) return finish('win');
        }
        ctx.save(st); paint();
      }
      function clock() { if (tick) return; tick = setInterval(() => { if (document.hidden || over || ctx.paused) return; st.time++; if (st.time % 5 === 0) ctx.save(st); head(); }, 1000); }
      /* klávesnice v 16×16: číslice 2–9 hned, po jedničce se chvilku čeká na druhou číslici (10–16); Enter zapíše hned */
      function flush(drop) {
        clearTimeout(bufTm); bufTm = 0;
        const d = buf; buf = 0;
        if (d && !drop) put(d); else if (d) paint();
      }
      const digit = d => {
        if (!big) { if (d >= 1 && d <= N) put(d); return; }
        if (buf) {
          const two = buf * 10 + d;
          if (two <= N) { clearTimeout(bufTm); bufTm = 0; buf = 0; return put(two); }
          flush();
        }
        if (d === 0) return;
        if (d * 10 <= N) { buf = d; bufTm = setTimeout(() => flush(), 1100); paint(); return; }
        put(d);
      };
      const key = e => {
        if (!st || over || document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 'Backspace' || k === 'Delete' || (N === 9 && k === '0')) { e.preventDefault(); flush(true); return put(0); }
        if (k === 'Enter' && buf) { e.preventDefault(); return flush(); }
        if (k.length === 1 && k >= '0' && k <= '9') { e.preventDefault(); return digit(+k); }
        const dd = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -N, ArrowDown: N }[k]; if (!dd || sel < 0) return;
        const nx = sel + dd; if (nx < 0 || nx >= NN || (Math.abs(dd) === 1 && g.R[nx] !== g.R[sel])) return;
        e.preventDefault(); pick(nx);
        if (big && cells[sel].scrollIntoView) cells[sel].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      };
      window.addEventListener('keydown', key);
      if (sv) {
        st = sv; st.size = N;
        if (!Array.isArray(st.notes) || st.notes.length !== NN) st.notes = Array(NN).fill(0);
        if (!Array.isArray(st.bad) || st.bad.length !== NN) st.bad = Array(NN).fill(0);
        st.time = st.time | 0; st.miss = st.miss | 0;
        build();
      } else {
        info.textContent = 'Připravuji zadání…';
        status.textContent = N === 16 ? 'Skládám velké pole 16×16, chvilku strpení.' : N === 9 && ctx.diff === 3 ? 'Hledám opravdu ďábelské zadání, chvilku to trvá.' : '';
        root.append(info, status, el('div', { class: 'sdk-wait', 'aria-hidden': 'true' }));
        cancel = runGen(N, ctx.diff, r => {
          cancel = null; if (gone) return;
          st = { size: N, puz: Array.from(r.puz), sol: Array.from(r.sol), cur: Array.from(r.puz), notes: Array(NN).fill(0), bad: Array(NN).fill(0), time: 0, miss: 0, grade: { lvl: r.lvl, tech: r.tech } };
          build(); ctx.save(st);
          if (N !== 4 && Math.min(3, r.lvl) < ctx.diff) status.textContent = `Tak těžké zadání se teď nenašlo, tohle je ${DIFFN[Math.min(3, r.lvl)]}.`;
        });
      }
      return { destroy() { gone = true; if (cancel) cancel(); clearInterval(tick); clearTimeout(bufTm); window.removeEventListener('keydown', key); over = true; } };
    }
  });
})();
