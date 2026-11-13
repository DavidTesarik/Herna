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
  const CAP_H = [8, 12, 16, 24];
  H.STAGES = [
    { name: 'Osada', need: 0, text: 'Pár stanů u ohně. Odtud to všechno začíná.' },
    { name: 'Vesnice', need: 3, text: 'První domky a pěšina mezi nimi.' },
    { name: 'Městečko', need: 8, text: 'Přibyl kostel, silnice a patrové domy.' },
    { name: 'Město', need: 16, text: 'Paneláky, auta a rušné ulice.' },
    { name: 'Velkoměsto', need: 28, text: 'Věžáky rostou do nebe.' },
    { name: 'Metropole', need: 45, text: 'Mrakodrapy, které svítí celou noc.' },
    { name: 'Země', need: 70, text: 'Tvoje města pokrývají celou zemi.' },
    { name: 'Planeta', need: 100, text: 'Světla tvé civilizace jsou vidět z vesmíru.' },
    { name: 'Sluneční soustava', need: 140, text: 'Osídluješ další planety.' },
    { name: 'Galaxie', need: 190, text: 'Tvoje kolonie svítí mezi hvězdami.' },
    { name: 'Vesmír', need: 250, text: 'Síť galaxií, které ti patří.' },
    { name: 'Mnohovesmír', need: 330, text: 'Dál už to nejde. Nebo ano?' }
  ];
  const by = id => H.CITY.find(b => b.id === id);
  const C = H.city = {
    boostMs: () => 600000 + 300000 * (H.S.upg.boostLen || 0),
    boostX: () => 2 + 0.5 * (H.S.upg.boostPow || 0),
    building: by,
    level: id => H.S.city.b[id] || 0,
    played: id => !!(H.S.games[id] && H.S.games[id].played),
    maxLevel: id => 10 * H.gameLevel(H.S.games[id] ? H.S.games[id].xp : 0).level,
    cost: id => Math.round(by(id).cost * Math.pow(1.15, C.level(id)) * (1 - 0.04 * (H.S.upg.discount || 0))),
    sum: () => H.CITY.reduce((a, b) => a + C.level(b.id), 0),
    stage() { const n = C.sum(); let i = 0; while (i + 1 < H.STAGES.length && n >= H.STAGES[i + 1].need) i++; return i; },
    stageInfo() {
      const i = C.stage(), n = C.sum(), cur = H.STAGES[i], next = H.STAGES[i + 1];
      return { i, name: cur.name, text: cur.text, next, into: n - cur.need, need: next ? next.need - cur.need : 0, t: next ? (n - cur.need) / (next.need - cur.need) : 1 };
    },
    mult: () => 1 + 0.05 * Object.keys(H.S.badges).length + 0.02 * (H.level(H.S.xp).level - 1) + 0.1 * C.stage() + 0.1 * (H.S.upg.income || 0),
    gameMult: id => 1 + 0.1 * (H.gameLevel(H.S.games[id] ? H.S.games[id].xp : 0).level - 1),
    rate: id => by(id).rate * C.level(id) * C.gameMult(id) * C.mult(),
    boosted: (id, now) => (H.S.city.boost[id] || 0) > (now || Date.now()),
    total: () => H.CITY.reduce((s, b) => s + C.rate(b.id) * (C.boosted(b.id) ? C.boostX() : 1), 0),
    capHours: () => CAP_H[H.S.upg.cap || 0],
    accrue(now) {
      const c = H.S.city;
      if (!c.last || now <= c.last) { c.last = now; return 0; }
      const dt = Math.min(now - c.last, C.capHours() * 3600000), from = now - dt;
      let sum = 0;
      for (const b of H.CITY) {
        const r = C.rate(b.id); if (!r) continue;
        const boostMs = Math.max(0, Math.min(now, c.boost[b.id] || 0) - from);
        sum += r * (dt + (C.boostX() - 1) * Math.min(boostMs, dt)) / 60000;
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
      H.S.coins -= cost; H.S.city.b[id] = C.level(id) + 1;
      const up = C.stage() > (H.S.city.stage || 0);
      if (up) H.S.city.stage = C.stage();
      H.save();
      return up ? 'stage' : true;
    }
  };
  const perMin = r => (r < 10 ? r.toFixed(1).replace('.', ',') : H.fmt(r)) + ' 🪙/min';

  let dyn = [];
  H.cityTick = () => {
    const now = Date.now();
    for (const d of dyn) {
      if (d.btn) d.btn.classList.toggle('poor', H.S.coins < d.cost);
      const left = (H.S.city.boost[d.id] || 0) - now;
      d.boost.textContent = left > 0 ? `⚡ ${String(C.boostX()).replace('.', ',')}× ještě ${H.fmtTime(left / 1000)}` : '';
    }
  };
  H.renderCity = main => {
    dyn = [];
    const total = C.total(), built = H.CITY.filter(b => C.level(b.id)).length, si = C.stageInfo();
    main.append(...[el('h1', { text: si.name }),
      el('div', { class: 'card hero' },
        el('div', { html: H.scene(si.i, si.t, `Obrázek: ${si.name}, stupeň ${si.i + 1} z ${H.STAGES.length}`) }),
        el('p', { text: si.text }),
        si.next ? el('div', { class: 'glvl' }, el('span', { text: `Další stupeň: ${si.next.name} · ${si.into}/${si.need} úrovní budov` }),
          el('div', { class: 'xpbar', role: 'img', 'aria-label': `Postup k dalšímu stupni: ${si.into} z ${si.need}` }, el('span', { style: `width:${Math.round(si.t * 100)}%` })))
          : el('p', { class: 'muted', text: 'Dosáhl jsi nejvyššího stupně.' }),
        el('div', { class: 'big', text: perMin(total) }),
        el('p', { class: 'muted', text: `Násobič ×${C.mult().toFixed(2).replace('.', ',')} (stupeň, vylepšení, odznaky, level) · mimo appku vydělává nejdéle ${C.capHours()} h` })),
      built ? null : el('p', { class: 'empty', text: 'Osada je zatím prázdná. Každá hra, kterou si aspoň jednou zahraješ, ti tu odemkne jednu budovu. Budovy pak samy vydělávají mince.' }),
      el('h2', { text: 'Budovy' }),
      el('div', { class: 'list' }, H.CITY.map(b => {
        const g = H.byId[b.id], l = C.level(b.id), max = C.maxLevel(b.id), cost = C.cost(b.id), open = C.played(b.id);
        const boost = el('span', { class: 'boost' });
        let btn = null, note = '';
        if (!open) note = `🔒 Zahraj si hru ${g.name}`;
        else if (l >= max) note = `Strop úrovně ${max}. Zvyš úroveň hry ${g.name}.`;
        else btn = el('button', { class: 'btn small primary two', 'data-b': b.id, 'aria-label': `${l ? 'Vylepšit' : 'Postavit'} ${b.name} za ${H.fmt(cost)} mincí`,
          onclick: () => {
            const got = C.buy(b.id);
            if (!got) { H.sfx('bad'); return H.toast(`Chybí ti ${H.fmt(cost - H.S.coins)} mincí.`); }
            H.sfx('coin'); H.buzz(12); H.rerender();
            const again = document.querySelector(`[data-b="${b.id}"]`); if (again) again.focus({ preventScroll: true });
            if (got === 'stage') {
              const si = C.stageInfo(); H.sfx('level'); H.confetti(); H.buzz([30, 40, 80]);
              H.modal({ title: '🎉 Nový stupeň: ' + si.name, body: [el('div', { html: H.scene(si.i, 0, 'Obrázek: ' + si.name) }), el('p', { text: si.text }), el('p', { class: 'muted', text: 'Každý stupeň přidává 10 % k výdělku všech budov.' })], actions: [{ label: 'Paráda', primary: true }] });
            }
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
        el('p', { text: `⚡ Výhra ve hře zapne její budově na ${C.boostMs() / 60000} minut ${String(C.boostX()).replace('.', ',')}× výdělek.` }),
        el('p', { text: '🛍️ V Obchodě najdeš vylepšení města (vyšší nájmy, silnější a delší bonus, levnější stavby) a styly domů, které mění vzhled sídla.' }),
        el('p', { text: '📈 Vyšší úroveň hry zvedá strop úrovně budovy a přidává 10 % k výdělku.' }),
        el('p', { text: '🌍 Součet úrovní všech budov posouvá sídlo na další stupeň: z osady přes město a planetu až ke galaxiím. Každý stupeň přidá 10 % k výdělku.' }),
        el('p', { text: '🏅 Každý odznak přidá 5 % k výdělku celého města, každý level hráče 2 %.' }),
        el('p', { class: 'muted', text: 'Za každou dohranou hru navíc dostaneš bonus podle toho, kolik město právě vydělává.' }))].filter(Boolean));
    H.cityTick();
  };
})();
