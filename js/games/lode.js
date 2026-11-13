'use strict';
/* Lodě proti počítači: vlastní rozmístění, kreslené lodě. Lodě se nesmějí dotýkat, zásah znamená další výstřel. */
(function () {
  const { el } = H;
  const TYPES = {
    letadlova: { name: 'Letadlová loď', len: 5 }, bitevni: { name: 'Bitevní loď', len: 4 }, kriznik: { name: 'Křižník', len: 3 },
    ponorka: { name: 'Ponorka', len: 3 }, torpedo: { name: 'Torpédoborec', len: 2 }, clun: { name: 'Hlídkový člun', len: 2 }
  };
  const FLEETS = { small: ['letadlova', 'bitevni', 'kriznik', 'ponorka', 'torpedo'], big: ['letadlova', 'bitevni', 'kriznik', 'kriznik', 'ponorka', 'torpedo', 'clun'] };
  const hull = (L, fill) => `<path d="M3 10Q3 3.5 10 3.5H${L - 9}Q${L - 2} 6 ${L - 1.5} 10Q${L - 2} 14 ${L - 9} 16.5H10Q3 16.5 3 10Z" fill="${fill}" stroke="#0f172a" stroke-width="1"/>`;
  const turret = (x, dir) => `<path d="M${x} 9.2h${7 * dir}M${x} 10.8h${7 * dir}" stroke="#1e293b" stroke-width="1.1"/><circle cx="${x}" cy="10" r="3.2" fill="#cbd5e1" stroke="#1e293b" stroke-width=".8"/>`;
  const ART = {
    letadlova: L => hull(L, '#475569') + `<path d="M9 10H${L - 10}" stroke="#f8fafc" stroke-width="1" stroke-dasharray="5 4"/><path d="M14 14.5L${L - 30} 5.5" stroke="#fde047" stroke-width=".8"/><rect x="${L - 44}" y="12" width="15" height="3.6" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width=".7"/><rect x="20" y="5" width="6" height="4" fill="#64748b" stroke="#0f172a" stroke-width=".5"/><path d="M${L - 20} 8l5 2-5 2z" fill="#e2e8f0"/>`,
    bitevni: L => hull(L, '#64748b') + turret(16, -1) + turret(L - 20, 1) + turret(L - 32, 1) + `<rect x="28" y="6.2" width="15" height="7.6" rx="2" fill="#e2e8f0" stroke="#0f172a" stroke-width=".8"/><circle cx="35.5" cy="10" r="2" fill="#1e293b"/>`,
    kriznik: L => hull(L, '#6b7f99') + turret(13, -1) + turret(L - 17, 1) + `<rect x="22" y="6.5" width="13" height="7" rx="2" fill="#e2e8f0" stroke="#0f172a" stroke-width=".8"/><path d="M28.500 6.500v7" stroke="#0f172a" stroke-width=".8"/>`,
    ponorka: L => `<ellipse cx="${L / 2}" cy="10" rx="${L / 2 - 3}" ry="5.6" fill="#334155" stroke="#0f172a" stroke-width="1"/><ellipse cx="${L / 2 + 3}" cy="10" rx="6" ry="3" fill="#1e293b" stroke="#94a3b8" stroke-width=".7"/><path d="M4 6.500v7M2.500 10h4" stroke="#94a3b8" stroke-width="1.200"/><circle cx="${L - 10}" cy="10" r="1.200" fill="#94a3b8"/>`,
    torpedo: L => hull(L, '#64748b') + turret(L - 14, 1) + `<rect x="10" y="6.800" width="10" height="6.400" rx="1.800" fill="#e2e8f0" stroke="#0f172a" stroke-width=".8"/>`,
    clun: L => hull(L, '#b45309') + `<rect x="11" y="6.500" width="13" height="7" rx="2" fill="#fef3c7" stroke="#0f172a" stroke-width=".8"/><path d="M24 7.500l5 2.500-5 2.500" fill="#93c5fd" stroke="#0f172a" stroke-width=".6"/>`
  };
  const shipSvg = (type, vert) => {
    const L = TYPES[type].len * 20, body = ART[type](L).replace(/(\d)\.(\d)00/g, '$1.$2');
    return vert ? `<svg viewBox="0 0 20 ${L}" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(20 0) rotate(90)">${body}</g></svg>`
      : `<svg viewBox="0 0 ${L} 20" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  };

  H.register({
    id: 'lode', name: 'Lodě', icon: '🚢', grad: ['#1e40af', '#3730a3'], vsAI: true, saveable: true, pvp: true,
    desc: 'Rozmísti flotilu a potop tu soupeřovu',
    variant: { name: 'Velké moře', desc: 'Pole 12×12 a sedm lodí místo pěti. Delší bitva.', level: 2 },
    help: 'Nejdřív si rozmísti lodě: ťukni na loď (na moři nebo v seznamu), případně ji otoč, a ťukni na políčko, kam má přijít její příď. Lodě se nesmějí dotýkat, ani rohem. V bitvě ťukáš na moře soupeře. Zásah znamená, že střílíš znovu.',
    start(root, ctx) {
      const N = ctx.variant ? 12 : 10, FLEET = FLEETS[ctx.variant ? 'big' : 'small'];
      const around = i => { const r = (i / N) | 0, c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } return o; };
      const cellsFor = (i, len, vert) => { let r = (i / N) | 0, c = i % N; if (vert) r = Math.min(r, N - len); else c = Math.min(c, N - len); return Array.from({ length: len }, (_, k) => (r + (vert ? k : 0)) * N + c + (vert ? 0 : k)); };
      const fits = (fleet, idx, cs) => { const taken = new Set(); fleet.forEach((s, k) => { if (k !== idx && s.cells) s.cells.forEach(j => around(j).forEach(q => taken.add(q))); }); return cs.every(j => !taken.has(j)); };
      const randomFleet = () => {
        for (;;) {
          const fleet = FLEET.map(t => ({ type: t, cells: null, vert: false })); let ok = true;
          for (let k = 0; k < fleet.length && ok; k++) {
            ok = false;
            for (let t = 0; t < 300 && !ok; t++) { const vert = Math.random() < .5, cs = cellsFor(H.rnd(N * N), TYPES[fleet[k].type].len, vert); if (fits(fleet, k, cs)) { fleet[k].cells = cs; fleet[k].vert = vert; ok = true; } }
          }
          if (ok) return fleet;
        }
      };
      const toSide = fleet => { const grid = Array(N * N).fill(-1); const ships = fleet.map((s, k) => { s.cells.forEach(j => { grid[j] = k; }); return { cells: s.cells, hits: 0, type: s.type, vert: s.vert }; }); return { grid, ships }; };
      const P = !!ctx.pvp;
      const sv = ctx.saved && ctx.saved.fleet && ctx.saved.sMe.length === N * N && !!ctx.saved.fleet2 === P ? ctx.saved : null;
      /* me/sAi = flotila hráče 1 a střely na ni; ai/sMe = flotila soupeře (počítač nebo hráč 2) a střely na ni */
      let st = sv || { phase: 'place', fleet: randomFleet(), fleet2: P ? randomFleet() : null, me: null, ai: P ? null : toSide(randomFleet()), sMe: Array(N * N).fill(0), sAi: Array(N * N).fill(0), turn: ctx.aiFirst ? 2 : 1 };
      let over = false, sel = -1, handVert = false; const timers = [];
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const status = el('p', { class: 'g-status', role: 'status' }), info = el('p', { class: 'g-score' });
      const say = t => { status.textContent = t; };
      const mkBoard = (cls, onCell) => {
        const layer = el('div', { class: 'ships', 'aria-hidden': 'true' });
        const cells = Array.from({ length: N * N }, (_, i) => onCell ? el('button', { class: 'cell', onclick: () => onCell(i) }) : el('span', { class: 'cell' }));
        const grid = el('div', { class: 'seagrid', style: `--n:${N}` }, cells);
        return { box: el('div', { class: 'board sea ' + cls, style: `--n:${N}` }, layer, grid), layer, cells };
      };
      const drawShips = (layer, ships, filter) => {
        layer.textContent = '';
        ships.forEach((s, k) => {
          if (!s.cells || (filter && !filter(s, k))) return;
          const first = Math.min(...s.cells), r = (first / N) | 0, c = first % N, len = s.cells.length, vert = s.vert;
          layer.append(el('span', { class: 'ship' + (k === sel ? ' picked' : ''), style: `left:${c * 100 / N}%;top:${r * 100 / N}%;width:${(vert ? 1 : len) * 100 / N}%;height:${(vert ? len : 1) * 100 / N}%`, html: shipSvg(s.type, vert) }));
        });
      };
      const SYM = ['', '•', '✸', '✖'], LAB = ['neznámé', 'voda', 'zásah', 'potopeno'];
      const coord = i => `${String.fromCharCode(65 + i % N)}${((i / N) | 0) + 1}`;
      const left = side => side.ships.filter(s => s.hits < s.cells.length).length;
      /* zástěna při předávání telefonu: na obrazovce není vidět žádné pole */
      const cover = (who, what, next) => {
        root.textContent = '';
        const b = el('button', { class: 'btn primary big', text: `Jsem hráč ${who}, pokračovat`, onclick: () => { H.sfx('tap'); next(); } });
        root.append(el('div', { class: 'cover' }, el('p', { class: 'covernum', text: `Hráč ${who}` }), el('p', { class: 'g-status', role: 'status', text: `Předej telefon hráči ${who}. ${what}` }), el('p', { class: 'muted', text: 'Druhý hráč se teď nedívá.' }), b));
        b.focus({ preventScroll: true });
      };

      /* ---------- rozmisťování ---------- */
      const place = who => {
        const fleet = who === 1 ? st.fleet : st.fleet2;
        sel = -1; handVert = false;
        root.textContent = '';
        const B = mkBoard('placing', i => tapCell(i));
        const tray = el('div', { class: 'tray', role: 'group', 'aria-label': 'Lodě k rozmístění' });
        const rot = el('button', { class: 'btn', onclick: () => { handVert = !handVert; if (sel >= 0) fleet[sel].vert = handVert; paint(); } });
        const go = el('button', { class: 'btn primary big', text: P && who === 1 ? 'Hotovo, předat hráči 2' : '⚓ Do boje', onclick: () => {
          if (fleet.some(s => !s.cells)) return;
          H.sfx('match');
          if (who === 1) { st.me = toSide(st.fleet); if (P) { st.phase = 'place2'; ctx.save(st); return cover(2, 'Rozmístí si své lodě.', () => place(2)); } }
          else st.ai = toSide(st.fleet2);
          st.phase = 'battle'; ctx.save(st);
          if (P) cover(st.turn, 'Začíná bitva a střílí jako první.', battle); else battle();
        } });
        root.append(P ? el('p', { class: 'g-score', text: `Hráč ${who}: rozmísti lodě` }) : null, status, B.box, tray, el('div', { class: 'g-actions' }, rot, el('button', { class: 'btn', text: '🔀 Náhodně', onclick: () => { const f = randomFleet(); fleet.forEach((s, k) => { s.cells = f[k].cells; s.vert = f[k].vert; }); sel = -1; paint(); say('Nové náhodné rozmístění.'); } })), el('div', { class: 'g-actions' }, go));
        const pick = k => { if (sel === k) sel = -1; else { sel = k; handVert = fleet[k].vert; fleet[k].cells = null; say(`${TYPES[fleet[k].type].name}: ťukni na políčko, kam má přijít příď.`); } paint(); };
        const tapCell = i => {
          const hit = fleet.findIndex(s => s.cells && s.cells.includes(i));
          if (sel < 0) { if (hit >= 0) pick(hit); else say('Nejdřív ťukni na loď, kterou chceš přemístit.'); return; }
          const s = fleet[sel], cs = cellsFor(i, TYPES[s.type].len, handVert);
          if (!fits(fleet, sel, cs)) { H.sfx('bad'); H.shake(B.box); return say('Sem se nevejde. Lodě se nesmějí dotýkat, ani rohem.'); }
          s.cells = cs; s.vert = handVert; H.sfx('place'); H.buzz(10);
          sel = fleet.findIndex(q => !q.cells);
          if (sel >= 0) handVert = fleet[sel].vert;
          say(sel >= 0 ? `Další: ${TYPES[fleet[sel].type].name}.` : 'Všechny lodě jsou na místě. Můžeš pokračovat, nebo ještě něco přesunout.');
          paint();
        };
        const paint = () => {
          drawShips(B.layer, fleet);
          const occ = new Map(); fleet.forEach((s, k) => { if (s.cells) s.cells.forEach(j => occ.set(j, k)); });
          B.cells.forEach((c, i) => { const k = occ.get(i); c.setAttribute('aria-label', `${coord(i)}: ${k != null ? TYPES[fleet[k].type].name : 'volné moře'}`); });
          tray.textContent = '';
          fleet.forEach((s, k) => tray.append(el('button', { class: 'trayb' + (k === sel ? ' on' : ''), 'aria-pressed': String(k === sel), 'aria-label': `${TYPES[s.type].name}, délka ${TYPES[s.type].len}, ${s.cells ? 'umístěná' : k === sel ? 'v ruce' : 'čeká'}`, onclick: () => pick(k) },
            el('span', { class: 'traysvg', style: `width:${TYPES[s.type].len * 18}px`, html: shipSvg(s.type, false) }), el('span', { text: `${TYPES[s.type].name}${s.cells ? ' ✓' : ''}` }))));
          rot.textContent = handVert ? '↻ Otočit (teď svisle)' : '↻ Otočit (teď vodorovně)';
          go.disabled = fleet.some(s => !s.cells);
        };
        paint();
        say('Lodě jsou rozmístěné náhodně. Ťukni na loď a přesuň ji, nebo rovnou pokračuj.');
      };

      /* ---------- bitva ---------- */
      const battle = () => {
        root.textContent = '';
        const cp = P ? st.turn : 1;                       // kdo se právě dívá na displej
        const foe = cp === 1 ? st.ai : st.me, mine = cp === 1 ? st.me : st.ai;
        const myShots = cp === 1 ? st.sMe : st.sAi, foeShots = cp === 1 ? st.sAi : st.sMe;
        let lock = false;
        const E = mkBoard('enemy', i => human(i)), M = mkBoard('mini', null);
        root.append(info, status, E.box, el('p', { class: 'muted', text: P ? `Flotila hráče ${cp} a střely soupeře:` : 'Tvoje flotila a střely počítače:' }), M.box);
        const fire = (side, shots, i) => {
          const s = side.grid[i];
          if (s < 0) { shots[i] = 1; return 'miss'; }
          const ship = side.ships[s]; ship.hits++; shots[i] = 2;
          if (ship.hits < ship.cells.length) return 'hit';
          ship.cells.forEach(j => { shots[j] = 3; around(j).forEach(k => { if (!shots[k]) shots[k] = 1; }); });
          return 'sunk';
        };
        const paint = () => {
          drawShips(E.layer, foe.ships, s => s.hits >= s.cells.length);
          drawShips(M.layer, mine.ships);
          E.cells.forEach((c, i) => { const s = myShots[i]; c.textContent = SYM[s]; c.className = 'cell s' + s; c.disabled = over || lock || (!P && st.turn !== 1) || !!s; c.setAttribute('aria-label', `${coord(i)}: ${LAB[s]}`); });
          M.cells.forEach((c, i) => { const s = foeShots[i]; c.textContent = SYM[s]; c.className = 'cell s' + s; });
          info.textContent = P ? `Hráč ${cp} střílí · tvoje lodě ${left(mine)} · lodě soupeře ${left(foe)}` : `Tvoje lodě ${left(st.me)}   Lodě počítače ${left(st.ai)}`;
        };
        const finish = res => {
          over = true; paint();
          if (P) { say(`Hráč ${cp} potopil celou flotilu soupeře!`); return ctx.end({ result: 'pvp', winner: cp }); }
          say(res === 'win' ? 'Flotila počítače je na dně!' : 'Počítač potopil všechny tvoje lodě.'); ctx.end({ result: res });
        };
        const human = i => {
          if (over || lock || (!P && st.turn !== 1) || myShots[i]) return;
          const r = fire(foe, myShots, i);
          H.sfx(r === 'miss' ? 'tap' : r === 'sunk' ? 'boom' : 'match'); if (r !== 'miss') H.buzz(r === 'sunk' ? 60 : 20);
          if (!left(foe)) return finish('win');
          if (r === 'miss') {
            st.turn = 3 - cp; ctx.save(st);
            if (!P) { paint(); return aiTurn(); }
            lock = true; paint(); say(`Vedle. Na řadě je hráč ${st.turn}.`);
            return later(() => { if (!over) cover(st.turn, 'Je na řadě se střelbou.', battle); }, 1300);
          }
          ctx.save(st); paint();
          say(r === 'sunk' ? `Potopená: ${TYPES[foe.ships[foe.grid[i]].type].name}! Střílíš znovu.` : 'Zásah! Střílíš znovu.');
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
        if (P) say('Vyber políčko na moři soupeře.');
        else if (st.turn === 2) aiTurn(); else say(sv && st.sMe.some(Boolean) ? 'Pokračuješ v rozehrané bitvě. Střílíš ty.' : 'Střílíš první. Vyber políčko na moři soupeře.');
      };
      if (st.phase === 'battle') { if (P) cover(st.turn, 'Pokračuje rozehraná bitva.', battle); else battle(); }
      else if (st.phase === 'place2') cover(2, 'Rozmístí si své lodě.', () => place(2));
      else place(1);
      return { destroy() { timers.forEach(clearTimeout); over = true; } };
    }
  });
})();
