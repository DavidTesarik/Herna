'use strict';
/* Herna — obrazovky, průběh her, odměny */
(function () {
  const { el } = H;
  const VERSION = '1.2.0';
  const $ = s => document.querySelector(s);
  let S, view = 'home', cur = null; // cur = { g, inst, diff, variant, mode, started, ended }

  /* ---------- Vzhled ---------- */
  const applyTheme = () => {
    const t = S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const r = document.documentElement;
    r.dataset.mode = dark ? 'dark' : 'light';
    r.dataset.skin = S.active.theme;
    r.classList.toggle('no-motion', !H.motionOK());
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#0b1020' : '#f4f5fb');
  };

  /* ---------- Toast a dialogy ---------- */
  let toastT = 0;
  H.toast = (text, action) => {
    const t = $('#toast'); t.textContent = '';
    t.append(el('span', { text }));
    if (action) t.append(el('button', { class: 'btn small', text: action.label, onclick: () => { t.hidden = true; action.fn(); } }));
    t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, action ? 7000 : 2600);
  };
  H.modal = ({ title, body, actions, onClose }) => {
    const prev = document.activeElement;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', key, true); if (onClose) onClose(); if (prev && prev.isConnected) prev.focus(); };
    const key = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const f = [...box.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'dhead' }, el('h2', { text: title }), el('button', { class: 'icon', 'aria-label': 'Zavřít', text: '✕', onclick: () => close() })),
      el('div', { class: 'dbody' }, body),
      el('div', { class: 'dactions' }, (actions || []).map(a => el('button', {
        class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''), text: a.label,
        onclick: () => { if (a.fn && a.fn() === false) return; close(); }
      }))));
    const wrap = el('div', { class: 'modal', onclick: e => { if (e.target === wrap) close(); } }, box);
    document.body.append(wrap);
    document.addEventListener('keydown', key, true);
    (box.querySelector('.btn.primary') || box.querySelector('button')).focus({ preventScroll: true });
    return close;
  };
  const confirmBox = (title, text, label, fn, danger) => H.modal({ title, body: el('p', { text }), actions: [{ label: 'Zrušit' }, { label, primary: !danger, danger, fn }] });

  /* ---------- Společné kousky ---------- */
  const bar = (into, need, label) => el('div', { class: 'xpbar', role: 'img', 'aria-label': `${label}: ${into} z ${need} XP` }, el('span', { style: `width:${Math.min(100, into / need * 100)}%` }));
  const diffName = (g, d) => (g.diffNames || H.DIFFS)[d];
  const bestKey = (g, p) => (g.noDiff ? 'x' : p.diff) + (p.variant ? 'v' : '');
  const fmtBest = (g, v) => g.bestFmt === 'time' ? H.fmtTime(v) : g.bestFmt === 'sec' ? v.toFixed(1) + ' s' : g.bestFmt === 'tries' ? v + '. pokus' : String(v);
  const tileInfo = g => {
    const st = S.games[g.id]; if (!st || !st.played) return 'Ještě nehráno';
    if (g.vsAI) return st.wins + (st.wins === 1 ? ' výhra' : st.wins >= 2 && st.wins <= 4 ? ' výhry' : ' výher');
    const b = st.best[bestKey(g, H.pref(g.id))];
    return b != null ? 'Rekord ' + fmtBest(g, b) : 'Odehráno ' + st.played + '×';
  };

  /* ---------- Domů ---------- */
  const renderTop = () => {
    const L = H.level(S.xp);
    const top = $('#top'); top.textContent = '';
    top.append(el('button', { class: 'player', 'aria-label': `Profil. Level ${L.level}, ${S.coins} mincí`, onclick: () => go('profile') },
      el('span', { class: 'lvl', text: L.level }),
      el('span', { class: 'pmid' }, el('span', { class: 'plabel', text: `Level ${L.level}` }), bar(L.into, L.need, 'Postup levelu')),
      el('span', { class: 'coins', id: 'coinsTop', text: '🪙 ' + H.fmt(S.coins) })));
  };
  const renderHome = main => {
    H.ensureDaily();
    const qs = S.daily.quests, done = qs.filter(q => q.done).length;
    main.append(
      el('h1', { class: 'sr', text: 'Herna' }),
      el('details', { class: 'quests' },
        el('summary', {}, el('span', { text: '📅 Denní výzvy' }), el('span', { class: 'pill', text: `${done}/3 splněno` })),
        el('ul', {}, qs.map(q => el('li', { class: q.done ? 'done' : '' },
          el('span', { text: (q.done ? '✅ ' : '⬜ ') + q.text }),
          el('span', { class: 'qr', text: q.done ? 'splněno' : `${Math.min(q.prog, q.n)}/${q.n} · +${q.reward} 🪙` }))))),
      el('div', { class: 'grid' }, H.games.map(g => {
        const st = S.games[g.id], gl = H.gameLevel(st ? st.xp : 0).level;
        return el('button', { class: 'tile', style: `--c1:${g.grad[0]};--c2:${g.grad[1]};background-color:${g.grad[0]}`, onclick: () => openGame(g.id) },
          el('span', { class: 'ticon', 'aria-hidden': 'true', text: g.icon }),
          el('span', { class: 'tname', text: g.name }),
          el('span', { class: 'tdesc', text: S.saves[g.id] ? '▶ Rozehráno' : tileInfo(g) }),
          el('span', { class: 'tlvl', text: 'Úr. ' + gl }));
      })));
  };

  /* ---------- Obchod ---------- */
  const buy = (name, price, fn) => {
    if (S.coins < price) return H.toast(`Chybí ti ${price - S.coins} mincí.`);
    confirmBox('Koupit?', `${name} za ${H.fmt(price)} mincí. Zůstane ti ${H.fmt(S.coins - price)} mincí.`, 'Koupit', () => {
      H.city.accrue(Date.now()); S.coins -= price; fn(); checkBadges([]); H.save(); H.sfx('coin'); applyTheme(); render();
    });
  };
  const renderShop = main => {
    main.append(el('h1', { text: 'Obchod' }), el('p', { class: 'muted', text: 'Mince získáváš hraním. Nic se tu nekupuje za skutečné peníze.' }));
    main.append(el('h2', { text: 'Vylepšení' }), el('div', { class: 'list' }, H.UPGRADES.map(u => {
      const lv = S.upg[u.id], max = lv >= u.prices.length, price = u.prices[lv];
      return el('div', { class: 'row' },
        el('span', { class: 'ricon', 'aria-hidden': 'true', text: u.icon }),
        el('div', { class: 'rmid' }, el('strong', { text: `${u.name} · úroveň ${lv}/${u.prices.length}` }), el('span', { class: 'muted', text: u.desc })),
        el('button', { class: 'btn small' + (max ? '' : ' primary'), disabled: max, text: max ? 'Maximum' : `🪙 ${price}`, 'aria-label': max ? `${u.name}: maximum` : `Vylepšit ${u.name} za ${price} mincí`,
          onclick: () => buy(`${u.name} (úroveň ${lv + 1})`, price, () => { S.upg[u.id]++; }) }));
    })));
    for (const cat in H.SKINS) {
      const c = H.SKINS[cat];
      main.append(el('h2', { text: c.name }), el('div', { class: 'skins' }, c.items.map(it => {
        const own = S.owned[cat].includes(it.id), act = S.active[cat] === it.id;
        const prev = cat === 'theme' ? el('span', { class: 'sw', style: `background:${it.sw}` })
          : cat === 'pieces' ? el('span', { class: 'swt' }, el('b', { style: `color:${it.ca}`, text: it.a }), el('b', { style: `color:${it.cb}`, text: it.b }))
            : cat === 'car' ? el('span', { class: 'sw car', style: `background:${it.c};border-color:${it.s}` })
              : el('span', { class: 'swt', text: Array.from(it.set).slice(0, 2).join('') });
        return el('button', { class: 'skin' + (act ? ' active' : ''), 'aria-pressed': String(act),
          'aria-label': `${it.name}: ${act ? 'aktivní' : own ? 'použít' : 'koupit za ' + it.price + ' mincí'}`,
          onclick: () => {
            if (act) return;
            if (own) { S.active[cat] = it.id; H.save(); H.sfx('tap'); applyTheme(); render(); return; }
            buy(it.name, it.price, () => { S.owned[cat].push(it.id); S.active[cat] = it.id; });
          } },
          el('span', { class: 'sprev', 'aria-hidden': 'true' }, prev), el('span', { class: 'sname', text: it.name }),
          el('span', { class: 'sstate', text: act ? '✓ Aktivní' : own ? 'Použít' : `🪙 ${it.price}` }));
      })));
    }
  };

  /* ---------- Profil a statistiky ---------- */
  const renderProfile = main => {
    const L = H.level(S.xp);
    const all = Object.values(S.games), played = all.reduce((a, s) => a + s.played, 0), wins = all.reduce((a, s) => a + s.wins, 0);
    main.append(el('h1', { text: 'Profil' }),
      el('div', { class: 'card hero' }, el('div', { class: 'big', text: 'Level ' + L.level }), bar(L.into, L.need, 'Postup levelu'),
        el('p', { class: 'muted', text: `${L.into} / ${L.need} XP do dalšího levelu` }),
        el('div', { class: 'stats3' },
          el('div', {}, el('b', { text: played }), el('span', { text: 'her' })),
          el('div', {}, el('b', { text: wins }), el('span', { text: 'výher' })),
          el('div', {}, el('b', { text: S.questsDone }), el('span', { text: 'výzev' })))));
    main.append(el('h2', { text: 'Hry' }));
    if (!played) main.append(el('p', { class: 'empty', text: 'Zatím tu nic není. Zahraj si první hru a statistiky se začnou plnit.' }, el('br'), el('button', { class: 'btn primary', text: 'Vybrat hru', onclick: () => go('home') })));
    for (const g of H.games) {
      const st = S.games[g.id]; if (!st || !st.played) continue;
      const gl = H.gameLevel(st.xp);
      const lines = [];
      if (g.vsAI) lines.push(`Výhry ${st.wins} · prohry ${st.losses} · remízy ${st.draws}`, `Série výher: teď ${st.streak}, nejdelší ${st.bestStreak}`);
      if (!g.noDiff) lines.push(Object.keys(st.byDiff).sort().map(d => `${diffName(g, d)}: ${g.vsAI || g.winLose ? st.byDiff[d].w + ' výher z ' : ''}${st.byDiff[d].p}${g.vsAI || g.winLose ? '' : '×'}`).join(' · '));
      const bests = Object.keys(st.best).sort().map(k => `${g.noDiff ? '' : diffName(g, k[0]) + ' '}${k.endsWith('v') ? '(' + g.variant.name + ') ' : ''}${fmtBest(g, st.best[k])}`);
      if (bests.length) lines.push((g.bestFmt === 'time' || g.bestFmt === 'sec' ? 'Nejlepší časy: ' : 'Rekordy: ') + bests.join(' · '));
      if (g.vsAI || g.winLose) lines.push('Posledních ' + st.last.length + ': ' + st.last.map(r => ({ w: 'V', l: 'P', d: 'R' }[r] || '•')).join(' ') + '  (V výhra, P prohra, R remíza)');
      main.append(el('details', { class: 'card gstat' },
        el('summary', {}, el('span', { text: `${g.icon} ${g.name}` }), el('span', { class: 'pill', text: `Úroveň ${gl.level} · ${st.played}×` })),
        bar(gl.into, gl.need, 'Postup úrovně hry'), lines.map(t => el('p', { text: t }))));
    }
    const got = H.BADGES.filter(b => S.badges[b.id]).length;
    main.append(el('h2', { text: `Odznaky ${got}/${H.BADGES.length}` }), el('div', { class: 'badges' }, H.BADGES.map(b =>
      el('div', { class: 'badge' + (S.badges[b.id] ? ' got' : '') },
        el('span', { class: 'bicon', 'aria-hidden': 'true', text: S.badges[b.id] ? b.icon : '🔒' }),
        el('strong', { text: b.name }), el('span', { class: 'muted', text: b.desc + (S.badges[b.id] ? ' · získáno' : '') })))));
  };

  /* ---------- Nastavení ---------- */
  const exportData = async () => {
    const name = `herna-zaloha-${H.today()}.json`, text = JSON.stringify(S, null, 2);
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Záloha Herny' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
    document.body.append(a); a.click(); a.remove(); H.toast('Záloha stažena.');
  };
  const importData = file => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!H.validate(d)) throw new Error('bad');
        confirmBox('Nahradit data?', `Záloha obsahuje level ${H.level(d.xp).level} a ${d.coins} mincí. Současný postup se přepíše.`, 'Nahradit', () => {
          H.S = S = H.merge(d); S.city.last = Date.now(); H.save(); applyTheme(); render(); H.toast('Záloha načtena.');
        });
      } catch (e) { H.toast('Tenhle soubor není záloha Herny.'); }
    };
    r.onerror = () => H.toast('Soubor se nepodařilo přečíst.');
    r.readAsText(file);
  };
  const renderSettings = main => {
    const toggle = (key, label, hint) => el('label', { class: 'row' },
      el('div', { class: 'rmid' }, el('strong', { text: label }), hint ? el('span', { class: 'muted', text: hint }) : null),
      el('input', { type: 'checkbox', class: 'switch', role: 'switch', checked: S.settings[key], onchange: e => { S.settings[key] = e.target.checked; H.save(); if (e.target.checked) { H.sfx('coin'); if (key === 'vib') H.buzz(30); } } }));
    const select = (key, label, opts, hint) => el('label', { class: 'row' },
      el('div', { class: 'rmid' }, el('strong', { text: label }), hint ? el('span', { class: 'muted', text: hint }) : null),
      el('select', { onchange: e => { S.settings[key] = e.target.value; H.save(); applyTheme(); } }, opts.map(([v, t]) => el('option', { value: v, selected: S.settings[key] === v, text: t }))));
    const file = el('input', { type: 'file', accept: 'application/json,.json', class: 'sr', 'aria-label': 'Soubor se zálohou', onchange: e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; } });
    main.append(el('h1', { text: 'Nastavení' }),
      el('h2', { text: 'Hra' }), el('div', { class: 'list' },
        toggle('sound', 'Zvuky'), toggle('vib', 'Vibrace', 'Funguje na Androidu. iPhone vibrace z webových appek nepovoluje.'),
        select('motion', 'Animace', [['auto', 'Podle systému'], ['on', 'Zapnuté'], ['off', 'Vypnuté']], 'Konfety, otřesy a přechody.')),
      el('h2', { text: 'Vzhled' }), el('div', { class: 'list' },
        select('theme', 'Režim', [['system', 'Podle systému'], ['light', 'Světlý'], ['dark', 'Tmavý']], 'Barvu motivu měníš v Obchodě.')),
      el('h2', { text: 'Data' }), el('div', { class: 'list' },
        el('div', { class: 'row' }, el('div', { class: 'rmid' }, el('strong', { text: 'Záloha' }), el('span', { class: 'muted', text: 'Postup je uložený jen v tomhle telefonu. Zálohuj před výměnou telefonu.' })),
          el('div', { class: 'rbtns' }, el('button', { class: 'btn small', text: 'Exportovat', onclick: exportData }), el('button', { class: 'btn small', text: 'Importovat', onclick: () => file.click() }), file)),
        el('div', { class: 'row' }, el('div', { class: 'rmid' }, el('strong', { text: 'Smazat všechna data' }), el('span', { class: 'muted', text: 'Level, mince, město, skiny, statistiky i rozehrané hry.' })),
          el('button', { class: 'btn small danger', text: 'Smazat', onclick: () => H.modal({ title: 'Smazat všechno?', body: el('p', { text: 'Přijdeš o level, mince, město, skiny, statistiky i rozehrané hry. Nejde to vrátit, pokud nemáš zálohu.' }),
            actions: [{ label: 'Zrušit' }, { label: 'Nejdřív exportovat', fn: () => { exportData(); return false; } }, { label: 'Smazat vše', danger: true, fn: () => { H.reset(); S = H.S; S.city.last = Date.now(); applyTheme(); go('home'); H.toast('Data smazána.'); } }] }) }))),
      el('h2', { text: 'O appce' }), el('div', { class: 'card' },
        el('p', { text: 'Herna je sbírka rychlých her, která běží celá v tvém telefonu, i bez internetu.' }),
        el('p', { text: 'Žádný účet, žádné reklamy, žádné sledování. Appka nic neposílá na server a nenačítá nic od třetích stran. Postup se ukládá jen do úložiště prohlížeče v tomto zařízení.' }),
        el('p', { class: 'muted', text: 'Verze ' + VERSION })));
  };

  /* ---------- Navigace ---------- */
  const VIEWS = { home: ['🎮', 'Hry', renderHome], city: ['🏙️', 'Město', m => H.renderCity(m)], shop: ['🛍️', 'Obchod', renderShop], profile: ['🏆', 'Profil', renderProfile], settings: ['⚙️', 'Nastavení', renderSettings] };
  const render = () => {
    S = H.S;
    const main = $('#view'); main.textContent = ''; main.className = 'view v-' + view;
    document.body.classList.toggle('ingame', view === 'game');
    if (view === 'game') return;
    renderTop();
    const nav = $('#nav'); nav.textContent = '';
    for (const k in VIEWS) nav.append(el('button', { class: 'navb', 'aria-current': k === view ? 'page' : null, onclick: () => go(k) },
      el('span', { 'aria-hidden': 'true', text: VIEWS[k][0] }), el('span', { text: VIEWS[k][1] })));
    VIEWS[view][2](main);
  };
  H.rerender = () => render();
  const go = v => { if (cur) { cur.inst.destroy(); cur = null; } view = v; render(); window.scrollTo(0, 0); };

  /* ---------- Hra ---------- */
  const openGame = id => {
    const g = H.byId[id], p = H.pref(id), sv = S.saves[id];
    view = 'game'; render();
    if (sv) startGame(g, sv.diff, sv.variant, sv.mode, sv.state);
    else startGame(g, p.diff, p.variant && variantOpen(g), p.mode, null);
  };
  const variantOpen = g => g.variant && H.gameLevel(H.gstat(g.id).xp).level >= g.variant.level;
  const startGame = (g, diff, variant, mode, saved) => {
    if (cur) cur.inst.destroy();
    const p = H.pref(g.id), main = $('#view');
    main.textContent = '';
    const chipText = [g.modes ? g.modes.find(m => m.id === mode).name : null, g.noDiff ? null : diffName(g, diff), variant ? g.variant.name : null].filter(Boolean).join(' · ') || 'Možnosti';
    const stage = el('div', { class: 'stage' });
    main.append(...[
      el('header', { class: 'ghead' },
        el('button', { class: 'btn small', 'aria-label': 'Zpět na seznam her', text: '‹ Hry', onclick: leave }),
        el('h1', { text: g.name }),
        el('button', { class: 'icon', 'aria-label': 'Nová hra', text: '↻', onclick: () => guard(() => startGame(g, cur.diff, cur.variant, cur.mode, null)) })),
      el('button', { class: 'chip', 'aria-label': 'Možnosti hry: ' + chipText, onclick: () => setup(g) }, chipText + '  ▾'),
      S.seenHelp[g.id] ? null : el('div', { class: 'help' }, el('p', {}, el('strong', { text: 'Jak hrát: ' }), g.help),
        el('button', { class: 'btn small', text: 'Rozumím', onclick: e => { S.seenHelp[g.id] = 1; H.save(); e.target.parentNode.remove(); } })),
      stage, el('div', { id: 'result' })].filter(Boolean));
    const aiFirst = !saved && g.vsAI && p.n % 2 === 1;
    if (!saved) { p.n++; delete S.saves[g.id]; H.save(); }
    const undos = (g.noDiff || diff < 3) ? S.upg.undo : 0;
    const me = cur = { g, diff, variant, mode, started: !!saved, ended: false, inst: null };
    const ctx = {
      diff, variant, mode, saved, aiFirst, undos, undosMax: undos, upg: S.upg, skin: H.skin,
      touch() { me.started = true; },
      save(state) { me.started = true; if (g.saveable && cur === me && !me.ended) { S.saves[g.id] = { diff, variant, mode, state }; H.save(); } },
      end(res) { if (cur !== me || me.ended) return; me.ended = true; onEnd(me, res); }
    };
    me.inst = g.start(stage, ctx);
  };
  const guard = fn => {
    if (!cur || !cur.started || cur.ended) return fn();
    confirmBox('Ukončit rozehranou hru?', 'Tahle partie se zahodí a nezapočítá.', 'Ukončit a začít znovu', fn);
  };
  const leave = () => {
    if (cur && cur.started && !cur.ended && !cur.g.saveable) return confirmBox('Odejít ze hry?', 'Tahle partie se zahodí a nezapočítá.', 'Odejít', () => go('home'));
    if (cur && cur.started && !cur.ended) H.toast('Hra je uložená. Pokračuješ příště.');
    go('home');
  };
  const setup = g => {
    const p = H.pref(g.id), sel = { diff: cur.diff, variant: cur.variant, mode: cur.mode };
    const open = variantOpen(g);
    const radios = (name, items, key) => el('div', { class: 'seg', role: 'radiogroup', 'aria-label': name }, items.map(([v, t]) => {
      const b = el('button', { class: 'segb', role: 'radio', 'aria-checked': String(sel[key] === v), text: t, onclick: () => { sel[key] = v; b.parentNode.querySelectorAll('.segb').forEach(x => x.setAttribute('aria-checked', String(x === b))); } });
      return b;
    }));
    const body = [];
    if (g.modes) body.push(el('h3', { text: 'Režim' }), radios('Režim', g.modes.map(m => [m.id, m.name]), 'mode'));
    if (!g.noDiff) {
      body.push(el('h3', { text: 'Obtížnost' }), radios('Obtížnost', (g.diffNames || H.DIFFS).map((t, i) => [i, t]), 'diff'));
      if (g.vsAI) body.push(el('p', { class: 'muted', text: 'Vyšší obtížnost dává víc XP a mincí. Na Nemožné nejde vracet tahy.' }));
    }
    if (g.variant) body.push(el('h3', { text: 'Varianta' }), el('label', { class: 'row' },
      el('div', { class: 'rmid' }, el('strong', { text: (open ? '' : '🔒 ') + g.variant.name }), el('span', { class: 'muted', text: g.variant.desc + (open ? '' : ` Odemkne se, až tahle hra dosáhne úrovně ${g.variant.level}.`) })),
      el('input', { type: 'checkbox', class: 'switch', role: 'switch', disabled: !open, checked: sel.variant && open, onchange: e => { sel.variant = e.target.checked; } })));
    body.push(el('h3', { text: 'Jak hrát' }), el('p', { text: g.help }));
    if (cur.started && !cur.ended) body.push(el('p', { class: 'warn', text: 'Pozor: změnou začne nová hra a rozehraná partie se zahodí.' }));
    H.modal({ title: g.name, body, actions: [{ label: 'Zavřít' }, { label: 'Hrát', primary: true, fn: () => {
      p.diff = sel.diff; p.variant = sel.variant; p.mode = sel.mode; H.save();
      startGame(g, sel.diff, sel.variant, sel.mode, null);
    } }] });
  };

  /* ---------- Konec hry a odměny ---------- */
  const checkBadges = out => {
    const all = Object.values(S.games), played = all.reduce((a, s) => a + s.played, 0);
    const owned = Object.values(S.owned).reduce((a, l) => a + l.length, 0);
    const tests = {
      first: all.some(s => s.wins > 0), streak5: all.some(s => s.bestStreak >= 5), streak10: all.some(s => s.bestStreak >= 10),
      all: H.games.every(g => S.games[g.id] && S.games[g.id].played), p50: played >= 50, p250: played >= 250,
      lvl10: H.level(S.xp).level >= 10, rich: S.coins >= 2000, collector: owned >= 8, quest10: S.questsDone >= 10,
      city1: H.CITY.some(b => H.city.level(b.id)), cityAll: H.CITY.every(b => H.city.level(b.id)),
      city100: H.CITY.reduce((a, b) => a + H.city.level(b.id), 0) >= 100, earn100k: S.city.earned >= 100000,
      metro: H.city.stage() >= 5, planet: H.city.stage() >= 7, galaxy: H.city.stage() >= 9
    };
    for (const b of H.BADGES) if (!S.badges[b.id] && (tests[b.id] || (out.flags && out.flags[b.id]))) { S.badges[b.id] = H.today(); out.push(`${b.icon} Nový odznak: ${b.name}`); }
  };
  const onEnd = (me, res) => {
    const { g, diff, variant } = me, st = H.gstat(g.id), r = res.result, extras = [], cityX = [];
    H.city.accrue(Date.now());
    delete S.saves[g.id];
    st.played++;
    const bd = st.byDiff[diff] || (st.byDiff[diff] = { p: 0, w: 0 }); bd.p++;
    if (r === 'win') { st.wins++; bd.w++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
    else if (r === 'loss') { st.losses++; st.streak = 0; }
    else if (r === 'draw') st.draws++;
    st.last.push(r[0] === 'd' && r !== 'draw' ? 'x' : r[0]); if (st.last.length > 10) st.last.shift();
    if (res.score != null) {
      const k = bestKey(g, { diff, variant }), old = st.best[k];
      if (old == null || (res.lower ? res.score < old : res.score > old)) { st.best[k] = res.score; if (old != null && res.score > 0) extras.push('🏅 Nový rekord: ' + fmtBest(g, res.score)); }
    }
    let xp = res.xp != null ? res.xp : r === 'win' ? [40, 70, 100, 130][diff] : r === 'draw' ? [20, 35, 50, 65][diff] : 10;
    if (variant && r === 'win' && g.id !== 'had') xp = Math.round(xp * 1.5);
    let coins = Math.round(xp / 2) + (res.coins || 0);
    const L0 = H.level(S.xp).level, G0 = H.gameLevel(st.xp).level;
    S.xp += xp; st.xp += xp;
    const L1 = H.level(S.xp).level, G1 = H.gameLevel(st.xp);
    if (L1 > L0) { const bonus = 50 * (L1 - L0); coins += bonus; extras.push(`⭐ Level ${L1}! Bonus ${bonus} mincí`); }
    if (G1.level > G0) extras.push(`📈 ${g.name}: úroveň ${G1.level}` + (g.variant && G0 < g.variant.level && G1.level >= g.variant.level ? ` · odemčena varianta ${g.variant.name}` : ''));
    H.ensureDaily();
    for (const q of S.daily.quests) {
      if (q.done) continue;
      if (q.type === 'play') q.prog++;
      else if (q.game === g.id && q.type === 'win' && r === 'win') q.prog++;
      else if (q.game === g.id && q.type === 'score') { if (g.quest.kind === 'win') { if (r === 'win') q.prog = 1; } else q.prog = Math.max(q.prog, res.score || 0); }
      if (q.prog >= q.n) { q.done = true; coins += q.reward; S.questsDone++; extras.push(`📅 Výzva splněna: +${q.reward} mincí`); }
    }
    const bld = H.city.building(g.id), cr = H.city.total();
    if (cr > 0) { const cb = Math.round(cr * (r === 'win' ? 5 : r === 'loss' ? 1 : 3)); if (cb) { coins += cb; cityX.push(`🏙️ Bonus města: +${H.fmt(cb)} mincí`); } }
    if ((r === 'win' || (r === 'done' && xp >= 25)) && H.city.level(g.id) > 0) { S.city.boost[g.id] = Date.now() + H.city.BOOST_MS; cityX.push(`⚡ ${bld.name}: dvojnásobný výdělek na 10 minut`); }
    if (st.played === 1) cityX.push(`🏗️ Ve městě teď můžeš postavit: ${bld.name}`);
    S.coins += coins;
    extras.flags = Object.assign({ imp: r === 'win' && diff === 3 && g.vsAI, hard: r === 'win' && diff >= 2 && g.vsAI }, res.flags || {});
    checkBadges(extras);
    H.save();
    const good = r === 'win' || (r === 'done' && extras.length > 0);
    setTimeout(() => {
      if (cur !== me) return;
      if (good) { H.sfx(L1 > L0 ? 'level' : 'win'); H.confetti(); H.buzz([30, 40, 60]); } else if (r === 'loss') H.sfx('lose'); else H.sfx('match');
      showResult(me, r, xp, coins, G1, extras.concat(cityX), res);
    }, 500);
  };
  const showResult = (me, r, xp, coins, G1, extras, res) => {
    const g = me.g, box = $('#result'); if (!box) return;
    const title = r === 'win' ? '🎉 Výhra!' : r === 'loss' ? '😵 Prohra' : r === 'draw' ? '🤝 Remíza' : `Konec hry · ${res.score}`;
    const again = el('button', { class: 'btn primary big', text: 'Hrát znovu', onclick: () => startGame(g, me.diff, me.variant, me.mode, null) });
    const details = el('div', { class: 'rdetails' },
      el('p', { class: 'rewards' }, el('span', { class: 'rw', text: `+${xp} XP` }), el('span', { class: 'rw', text: `+${H.fmt(coins)} 🪙` })),
      el('div', { class: 'glvl' }, el('span', { text: `${g.name} · úroveň ${G1.level}` }), bar(G1.into, G1.need, 'Postup úrovně hry')),
      extras.length ? el('ul', { class: 'extras' }, extras.map(t => el('li', { text: t }))) : null);
    const hide = el('button', { class: 'btn small ghost', 'aria-expanded': 'true', text: 'Prohlédnout pole', onclick: () => {
      const h = details.hidden = !details.hidden; hide.textContent = h ? 'Zobrazit odměny' : 'Prohlédnout pole'; hide.setAttribute('aria-expanded', String(!h));
    } });
    box.textContent = '';
    box.append(el('section', { class: 'sheet', 'aria-label': 'Výsledek hry' },
      el('div', { class: 'shead' }, el('h2', { text: title }), hide), details,
      el('div', { class: 'sbtns' }, el('button', { class: 'btn big', text: 'Domů', onclick: () => go('home') }), again)));
    again.focus({ preventScroll: true });
  };

  /* ---------- Start ---------- */
  H.load(); S = H.S;
  applyTheme();
  if (window.matchMedia) {
    const on = () => applyTheme();
    for (const q of ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)']) { const m = matchMedia(q); if (m.addEventListener) m.addEventListener('change', on); }
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) H.toast('Je připravená nová verze.', { label: 'Obnovit', fn: () => location.reload() }); });
  }
  S.city.stage = Math.max(S.city.stage || 0, H.city.stage());
  const away = S.city.last ? Date.now() - S.city.last : 0, gained = H.city.accrue(Date.now());
  H.save();
  render();
  if (gained >= 1 && away > 120000) {
    const h = Math.min(away, H.city.capHours() * 3600000) / 3600000;
    H.modal({ title: '🏙️ Vítej zpátky', body: [el('p', { class: 'big', text: `+${H.fmt(gained)} 🪙` }),
      el('p', { text: `Tolik město vydělalo, zatímco jsi byl pryč (${h < 1 ? Math.round(h * 60) + ' min' : h.toFixed(1).replace('.', ',') + ' h'}).` }),
      away > H.city.capHours() * 3600000 ? el('p', { class: 'muted', text: `Mimo appku se počítá nejvýš ${H.city.capHours()} hodin. Strop zvedneš v Obchodě vylepšením Městský sklad.` }) : null],
      actions: [{ label: 'Super', primary: true }] });
  }
  let ticks = 0;
  setInterval(() => {
    if (document.hidden) return;
    const got = H.city.accrue(Date.now());
    if (got) { const c = $('#coinsTop'); if (c) c.textContent = '🪙 ' + H.fmt(S.coins); }
    if (view === 'city') H.cityTick();
    if (++ticks % 15 === 0) { if (got || ticks % 60 === 0) { const out = []; checkBadges(out); if (out.length) { H.toast(out[0]); H.sfx('level'); } } H.save(); }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) H.save(); else H.city.accrue(Date.now()); });
})();
