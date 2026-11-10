'use strict';
/* Město: budovy vydělávají mince samy, hraní je odemyká, zvyšuje jim strop a zapíná bonusy */
(function () {
  const { el } = H;
  H.CITY = [
    { id: 'piskvorky', name: 'Kavárna', icon: '☕', cost: 30, rate: 0.5 },
    { id: 'ctyri', name: 'Hračkářství', icon: '🧸', cost: 60, rate: 0.8 },
    { id: 'zavod', name: 'Autodrom', icon: '🏁', cost: 120, rate: 1.2 },
    { id: 'miny', name: 'Důl', icon: '⛏️', cost: 250, rate: 2 },
    { id: 'pexeso', name: 'Galerie', icon: '🖼️', cost: 500, rate: 3.5 },
    { id: 'g2048', name: 'Banka', icon: '🏦', cost: 1000, rate: 6 },
    { id: 'had', name: 'Zoo', icon: '🦎', cost: 2000, rate: 10 },
    { id: 'sudoku', name: 'Knihovna', icon: '📚', cost: 4000, rate: 17 },
    { id: 'slovo', name: 'Tiskárna', icon: '📰', cost: 8000, rate: 28 },
    { id: 'lode', name: 'Přístav', icon: '⚓', cost: 15000, rate: 45 },
    { id: 'dama', name: 'Zámek', icon: '🏰', cost: 30000, rate: 75 }
  ];
  const CAP_H = [8, 12, 16, 24], BOOST_MS = 600000;
  const by = id => H.CITY.find(b => b.id === id);
  const C = H.city = {
    BOOST_MS,
    building: by,
    level: id => H.S.city.b[id] || 0,
    played: id => !!(H.S.games[id] && H.S.games[id].played),
    maxLevel: id => 10 * H.gameLevel(H.S.games[id] ? H.S.games[id].xp : 0).level,
    cost: id => Math.round(by(id).cost * Math.pow(1.15, C.level(id))),
    mult: () => 1 + 0.05 * Object.keys(H.S.badges).length + 0.02 * (H.level(H.S.xp).level - 1),
    gameMult: id => 1 + 0.1 * (H.gameLevel(H.S.games[id] ? H.S.games[id].xp : 0).level - 1),
    rate: id => by(id).rate * C.level(id) * C.gameMult(id) * C.mult(),
    boosted: (id, now) => (H.S.city.boost[id] || 0) > (now || Date.now()),
    total: () => H.CITY.reduce((s, b) => s + C.rate(b.id) * (C.boosted(b.id) ? 2 : 1), 0),
    capHours: () => CAP_H[H.S.upg.cap || 0],
    accrue(now) {
      const c = H.S.city;
      if (!c.last || now <= c.last) { c.last = now; return 0; }
      const dt = Math.min(now - c.last, C.capHours() * 3600000), from = now - dt;
      let sum = 0;
      for (const b of H.CITY) {
        const r = C.rate(b.id); if (!r) continue;
        const boostMs = Math.max(0, Math.min(now, c.boost[b.id] || 0) - from);
        sum += r * (dt + Math.min(boostMs, dt)) / 60000;
      }
      c.last = now; c.frac += sum;
      const whole = Math.floor(c.frac);
      c.frac -= whole; H.S.coins += whole; c.earned += whole;
      return whole;
    },
    buy(id) {
      const cost = C.cost(id);
      if (!C.played(id) || C.level(id) >= C.maxLevel(id) || H.S.coins < cost) return false;
      C.accrue(Date.now());
      H.S.coins -= cost; H.S.city.b[id] = C.level(id) + 1; H.save();
      return true;
    }
  };
  const perMin = r => (r < 10 ? r.toFixed(1).replace('.', ',') : H.fmt(r)) + ' 🪙/min';

  let dyn = [];
  H.cityTick = () => {
    const now = Date.now();
    for (const d of dyn) {
      if (d.btn) d.btn.classList.toggle('poor', H.S.coins < d.cost);
      const left = (H.S.city.boost[d.id] || 0) - now;
      d.boost.textContent = left > 0 ? `⚡ 2× ještě ${H.fmtTime(left / 1000)}` : '';
    }
  };
  H.renderCity = main => {
    dyn = [];
    const total = C.total(), built = H.CITY.filter(b => C.level(b.id)).length;
    main.append(...[el('h1', { text: 'Město' }),
      el('div', { class: 'card hero' },
        el('div', { class: 'skyline', 'aria-hidden': 'true' }, H.CITY.map(b => {
          const l = C.level(b.id);
          return el('span', { class: l ? '' : 'off', style: `font-size:${(1.3 + Math.min(l, 60) / 30).toFixed(2)}rem`, text: l ? b.icon : '▫️' });
        })),
        el('div', { class: 'big', text: perMin(total) }),
        el('p', { class: 'muted', text: `Násobič ×${C.mult().toFixed(2).replace('.', ',')} (odznaky a level) · mimo appku vydělává nejdéle ${C.capHours()} h` })),
      built ? null : el('p', { class: 'empty', text: 'Město je zatím prázdné. Každá hra, kterou si aspoň jednou zahraješ, ti tu odemkne jednu budovu. Budovy pak samy vydělávají mince.' }),
      el('h2', { text: 'Budovy' }),
      el('div', { class: 'list' }, H.CITY.map(b => {
        const g = H.byId[b.id], l = C.level(b.id), max = C.maxLevel(b.id), cost = C.cost(b.id), open = C.played(b.id);
        const boost = el('span', { class: 'boost' });
        let btn = null, note = '';
        if (!open) note = `🔒 Zahraj si hru ${g.name}`;
        else if (l >= max) note = `Strop úrovně ${max}. Zvyš úroveň hry ${g.name}.`;
        else btn = el('button', { class: 'btn small primary two', 'data-b': b.id, 'aria-label': `${l ? 'Vylepšit' : 'Postavit'} ${b.name} za ${H.fmt(cost)} mincí`,
          onclick: () => {
            if (!C.buy(b.id)) { H.sfx('bad'); return H.toast(`Chybí ti ${H.fmt(cost - H.S.coins)} mincí.`); }
            H.sfx('coin'); H.buzz(12); H.rerender();
            const again = document.querySelector(`[data-b="${b.id}"]`); if (again) again.focus({ preventScroll: true });
          } }, el('span', { text: l ? 'Vylepšit' : 'Postavit' }), el('span', { text: '🪙 ' + H.fmt(cost) }));
        dyn.push({ id: b.id, btn, cost, boost });
        return el('div', { class: 'row' + (open ? '' : ' locked') },
          el('span', { class: 'ricon', 'aria-hidden': 'true', text: b.icon }),
          el('div', { class: 'rmid' },
            el('strong', { text: `${b.name} · úroveň ${l}/${max}` }),
            el('span', { class: 'muted', text: l ? `${perMin(C.rate(b.id))} · hra ${g.name}` : `Hra ${g.name} · ${perMin(b.rate)} za úroveň` }),
            boost, note ? el('span', { class: 'muted', text: note }) : null),
          btn);
      })),
      el('h2', { text: 'Jak to funguje' }),
      el('div', { class: 'card' },
        el('p', { text: 'Budova vydělává sama, i když appku zavřeš. Hraním jí pomáháš třemi způsoby:' }),
        el('p', { text: '⚡ Výhra ve hře zapne její budově na 10 minut dvojnásobný výdělek.' }),
        el('p', { text: '📈 Vyšší úroveň hry zvedá strop úrovně budovy a přidává 10 % k výdělku.' }),
        el('p', { text: '🏅 Každý odznak přidá 5 % k výdělku celého města, každý level hráče 2 %.' }),
        el('p', { class: 'muted', text: 'Za každou dohranou hru navíc dostaneš bonus podle toho, kolik město právě vydělává.' }))].filter(Boolean));
    H.cityTick();
  };
})();
