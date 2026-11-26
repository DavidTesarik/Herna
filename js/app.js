'use strict';
/* Herna — obrazovky, průběh her, odměny */
(function () {
  const { el } = H;
  const VERSION = '2.3.0';
  const $ = s => document.querySelector(s);
  let S, view = 'home', cur = null, menuOpen = false; // cur = právě otevřená hra

  /* ---------- Vzhled ---------- */
  let previewSkin = null, previewT = 0;
  const applyTheme = () => {
    const t = S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const r = document.documentElement;
    r.dataset.mode = dark ? 'dark' : 'light';
    const skinId = previewSkin || S.active.theme, skin = H.SKINS.theme.items.find(i => i.id === skinId) || H.SKINS.theme.items[0];
    r.dataset.skin = skin.id; skinFx = skin.fx;
    r.classList.toggle('no-motion', !H.motionOK());
    const bgSel = S.active.bg || 'auto', mono = S.settings.style === 'mono'; // Černobílý: bez částic a jisker
    H.fx.set(mono ? 'neon' : skin.id, dark, mono ? null : bgSel === 'auto' ? undefined : bgSel === 'none' ? null : bgSel);
    applyStyle();
  };
  /* Styl (Nastavení → Vzhled): mimo hru platí styl aplikace, ve hře styl her. <html data-style> nese aktivní styl,
     data-gstyle styl her. Přepíná se i při vstupu do hry a návratu (sleduje třídu .ingame na body). */
  let skinFx = '', styleKey = '';
  const applyStyle = () => {
    if (!S) return;
    const r = document.documentElement, st = S.settings, game = st.gstyle === 'same' ? st.style : st.gstyle;
    const s = document.body.classList.contains('ingame') ? game : st.style, fx = s === 'mono' ? '' : skinFx;
    const key = [s, game, fx, r.dataset.mode].join('|');
    if (key === styleKey) return;
    styleKey = key; r.dataset.style = s; r.dataset.gstyle = game; r.dataset.fx = fx;
    const m = $('meta[name="theme-color"]'), bg = getComputedStyle(r).backgroundColor;
    if (m) m.setAttribute('content', /^rgb/.test(bg) ? bg : r.dataset.mode === 'dark' ? '#09090b' : '#f5f5f7');
  };
  new MutationObserver(applyStyle).observe(document.body, { attributes: true, attributeFilter: ['class'] });

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
  const diffNames = (g, mode) => g.noDiff ? null : g.diffNamesFor ? g.diffNamesFor(mode) : (g.diffNames || H.DIFFS);
  const diffName = (g, d, mode) => (diffNames(g, mode || (g.modes ? g.modes[0].id : null)) || H.DIFFS)[d];
  const bestKey = (g, p) => (g.modes && p.mode && p.mode !== g.modes[0].id ? p.mode + ':' : '') + (g.noDiff ? 'x' : p.diff) + (p.variant ? 'v' : '');
  const bestLabel = (g, k) => { const [a, b] = k.includes(':') ? k.split(':') : [null, k]; return (g.noDiff || b[0] === 'x' ? '' : diffName(g, b[0], a) + ' ') + (b.endsWith('v') && g.variant ? '(' + g.variant.name + ') ' : ''); };
  const fmtBest = (g, v) => g.bestFmt === 'time' ? H.fmtTime(v) : g.bestFmt === 'sec' ? v.toFixed(1) + ' s' : g.bestFmt === 'tries' ? v + '. pokus' : String(v);
  const tileInfo = g => {
    const st = S.games[g.id]; if (!st || !st.played) return 'Ještě nehráno';
    if (g.vsAI) return st.wins + (st.wins === 1 ? ' výhra' : st.wins >= 2 && st.wins <= 4 ? ' výhry' : ' výher');
    const b = st.best[bestKey(g, H.pref(g.id))];
    return b != null ? 'Rekord ' + fmtBest(g, b) : 'Odehráno ' + st.played + '×';
  };

  /* ---------- Domů ---------- */
  /* Kostra appky (stránka, body, #app) se nesmí nikdy posunout: posouvá se jen obsah v .view. Když ji posune prohlížeč sám
     (fokus, scrollIntoView, iOS po návratu do appky), celá appka i s lištou by vyjela nahoru pod stavový řádek. */
  const pinShell = n => { if (n.scrollTop || n.scrollLeft) { n.scrollTop = 0; n.scrollLeft = 0; } };
  window.addEventListener('scroll', () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); pinShell(document.documentElement); }, { passive: true });
  for (const n of [document.body, $('#app')]) n.addEventListener('scroll', () => pinShell(n), { passive: true });
  const renderTop = () => {
    const L = H.level(S.xp);
    const top = $('#top'); top.textContent = '';
    top.append(el('button', { class: 'player', 'aria-label': `Profil. Level ${L.level}, ${S.coins} mincí`, onclick: () => go('profile') },
      el('span', { class: 'lvl', text: L.level }),
      el('span', { class: 'pmid' }, el('span', { class: 'plabel', text: `Level ${L.level}` }), bar(L.into, L.need, 'Postup levelu')),
      S.streak >= 2 ? el('span', { class: 'streak', role: 'img', 'aria-label': `Série ${S.streak} výher`, text: '🔥' + S.streak }) : null,
      el('span', { class: 'coins', id: 'coinsTop', text: '🪙 ' + H.fmt(S.coins) })));
  };
  /* Vlastní pořadí her: S.order = [id, …]. Neznámá (zrušená) id se přeskočí, hry, které v seznamu nejsou (nové), se přidají na konec. */
  let editOrder = false;
  const orderedGames = () => {
    const ids = Array.isArray(S.order) ? S.order : [], seen = new Set(), out = [];
    for (const id of ids) if (typeof id === 'string' && H.byId[id] && !seen.has(id)) { seen.add(id); out.push(H.byId[id]); }
    for (const g of H.games) if (!seen.has(g.id)) out.push(g);
    return out;
  };
  H.orderedGames = () => orderedGames();
  const tile = g => {
    const st = S.games[g.id], gl = H.gameLevel(st ? st.xp : 0).level;
    return el('button', { class: 'tile', 'data-id': g.id, style: `--c1:${g.grad[0]};--c2:${g.grad[1]}`, onclick: () => openGame(g.id) },
      el('span', { class: 'tico' }, H.ico(g.id)),
      el('span', { class: 'tname', text: g.name }),
      el('span', { class: 'tdesc', text: S.saves[g.id] ? '▶ Rozehráno' : tileInfo(g) }),
      el('span', { class: 'tlvl', text: 'Úr. ' + gl }));
  };
  const GRIP = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
  /* úprava pořadí: tažení za úchyt (myš i prst, u okraje se seznam sám posouvá) a tlačítka výš/níž */
  const orderEditor = games => {
    const live = el('p', { class: 'sr', 'aria-live': 'polite' });
    const list = el('ol', { class: 'reorder', 'aria-label': 'Pořadí her' });
    const isDefault = () => orderedGames().every((g, i) => g === H.games[i]);
    const reset = el('button', { class: 'btn small ghost', text: 'Obnovit výchozí pořadí', disabled: isDefault(),
      onclick: () => confirmBox('Výchozí pořadí?', 'Hry se seřadí tak, jak byly v appce původně.', 'Obnovit', () => { S.order = []; H.save(); render(); H.toast('Pořadí her je zase výchozí.'); }) });
    const save = () => { S.order = [...list.children].map(li => li.dataset.id); H.save(); reset.disabled = isDefault(); };
    const refresh = () => {
      const items = [...list.children], n = items.length;
      items.forEach((li, i) => {
        const [up, down] = li.querySelectorAll('.rmove button');
        up.disabled = i === 0; down.disabled = i === n - 1;
        li.querySelector('.rpos').textContent = i + 1 + '.';
      });
    };
    const say = li => { const i = [...list.children].indexOf(li); live.textContent = `${H.byId[li.dataset.id].name}: ${i + 1}. místo z ${list.children.length}`; };
    const move = (li, dir, btn) => {
      const other = dir < 0 ? li.previousElementSibling : li.nextElementSibling; if (!other) return;
      if (dir < 0) list.insertBefore(li, other); else list.insertBefore(other, li);
      refresh(); save(); say(li); H.sfx('tap');
      const [up, down] = li.querySelectorAll('.rmove button');
      (btn.disabled ? (btn === up ? down : up) : btn).focus({ preventScroll: true });
      const sc = list.closest('.view'), r = li.getBoundingClientRect(), vr = sc.getBoundingClientRect(); // jen obsah, ne celá stránka
      if (r.top < vr.top) sc.scrollTop -= vr.top - r.top + 8; else if (r.bottom > vr.bottom) sc.scrollTop += r.bottom - vr.bottom + 8;
    };
    for (const g of games) {
      const li = el('li', { class: 'ritem', 'data-id': g.id },
        el('span', { class: 'rhandle', 'aria-hidden': 'true', title: 'Táhni', html: GRIP }),
        el('span', { class: 'rpos', 'aria-hidden': 'true' }),
        el('span', { class: 'tico', style: `--c1:${g.grad[0]};--c2:${g.grad[1]}` }, H.ico(g.id)),
        el('span', { class: 'rname', text: g.name }),
        el('span', { class: 'rmove' },
          el('button', { class: 'icon', 'aria-label': `Posunout ${g.name} výš`, text: '↑', onclick: e => move(li, -1, e.currentTarget) }),
          el('button', { class: 'icon', 'aria-label': `Posunout ${g.name} níž`, text: '↓', onclick: e => move(li, 1, e.currentTarget) })));
      list.append(li);
    }
    refresh();
    /* tažení: položka jede pod prstem, sousedé se přeskládají, jakmile ji přejede přes jejich střed */
    let d = null;
    const place = () => {
      const li = d.li, top = d.y - d.grab - list.getBoundingClientRect().top, mid = top + li.offsetHeight / 2;
      const prev = li.previousElementSibling, next = li.nextElementSibling;
      if (prev && mid < prev.offsetTop + prev.offsetHeight / 2) { list.insertBefore(prev, li.nextElementSibling); d.moved = true; return place(); }
      if (next && mid > next.offsetTop + next.offsetHeight / 2) { list.insertBefore(next, li); d.moved = true; return place(); }
      li.style.transform = `translateY(${top - li.offsetTop}px)`;
    };
    const tick = now => {
      if (!d) return;
      const sc = list.closest('.view'), r = sc.getBoundingClientRect(), edge = 72, dt = Math.min(64, now - (d.t || now)); d.t = now;
      let v = 0; // u horního a dolního okraje se seznam posouvá, tím rychleji, čím blíž je prst okraji (až 0,9 px/ms)
      if (d.y < r.top + edge) v = -Math.min(1, (r.top + edge - d.y) / edge);
      else if (d.y > r.bottom - edge) v = Math.min(1, (d.y - r.bottom + edge) / edge);
      if (v && dt) { const before = sc.scrollTop; sc.scrollTop = before + Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * .9 * dt)); if (sc.scrollTop !== before) place(); }
      d.raf = requestAnimationFrame(tick);
    };
    const onMove = e => { if (!d || e.pointerId !== d.id) return; e.preventDefault(); d.y = e.clientY; place(); };
    const onUp = e => {
      if (!d || e.pointerId !== d.id) return;
      const li = d.li; cancelAnimationFrame(d.raf);
      li.style.transform = ''; li.classList.remove('drag'); list.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      if (d.moved) { refresh(); save(); say(li); H.sfx('place'); }
      d = null;
    };
    list.addEventListener('pointerdown', e => {
      const h = e.target.closest && e.target.closest('.rhandle');
      if (!h || d || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const li = h.closest('.ritem');
      d = { li, id: e.pointerId, y: e.clientY, grab: e.clientY - li.getBoundingClientRect().top, moved: false, raf: 0 };
      li.classList.add('drag'); list.classList.add('dragging'); H.buzz(12);
      window.addEventListener('pointermove', onMove, { passive: false }); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
      d.raf = requestAnimationFrame(tick);
    });
    return [el('p', { class: 'muted ordhint', text: 'Chyť hru za úchyt vlevo a přetáhni ji, nebo ji posuň šipkami. Pořadí se ukládá hned.' }), list, el('div', { class: 'ordfoot' }, reset), live];
  };
  const renderHome = main => {
    H.ensureDaily();
    const qs = S.daily.quests, done = qs.filter(q => q.done).length, games = orderedGames();
    const toggleEdit = on => { editOrder = on; render(); const b = $('#view .ordb'); if (b) b.focus({ preventScroll: true }); };
    main.append(...[
      el('h1', { class: 'sr', text: 'Herna' }),
      el('div', { class: 'homehead' },
        el('p', { class: 'eyebrow', text: editOrder ? 'Pořadí her' : 'Tvoje hry' }),
        el('button', { class: 'btn small ordb' + (editOrder ? ' primary' : ' ghost'), text: editOrder ? 'Hotovo' : 'Upravit pořadí', 'aria-label': editOrder ? 'Hotovo, ukončit úpravu pořadí' : 'Upravit pořadí her', onclick: () => toggleEdit(!editOrder) })),
      editOrder ? null : el('details', { class: 'quests' },
        el('summary', {}, el('span', { text: 'Denní výzvy' }), el('span', { class: 'pill', text: `${done}/3 splněno` })),
        el('ul', {}, qs.map(q => el('li', { class: q.done ? 'done' : '' },
          el('span', { text: (q.done ? '✓ ' : '○ ') + q.text }),
          el('span', { class: 'qr', text: q.done ? 'splněno' : `${Math.min(q.prog, q.n)}/${q.n} · +${q.reward} 🪙` }))))),
      editOrder ? orderEditor(games) : el('div', { class: 'grid' }, games.map(tile))].flat().filter(Boolean));
  };

  /* ---------- Obchod ---------- */
  const buy = (name, price, fn) => {
    if (S.coins < price) return H.toast(`Chybí ti ${price - S.coins} mincí.`);
    confirmBox('Koupit?', `${name} za ${H.fmt(price)} mincí. Zůstane ti ${H.fmt(S.coins - price)} mincí.`, 'Koupit', () => {
      S.coins -= price; fn(); checkBadges([]); H.save(); H.sfx('coin'); applyTheme(); render();
    });
  };
  /* Obchod je rozdělený do sbalovacích sekcí; která je otevřená a filtr si pamatuje localStorage (mimo uložená data hry) */
  const SHOP_KEY = 'herna:obchod';
  const SHOP_SECTIONS = [
    { id: 'theme', title: 'Motivy', icon: '🎨', cats: ['theme'] },
    { id: 'bg', title: 'Pozadí', icon: '🌌', cats: ['bg'] },
    { id: 'win', title: 'Oslavy výhry', icon: '🎉', cats: ['win'] },
    { id: 'look', title: 'Vzhled her', icon: '🃏', cats: ['cards', 'pieces', 'car'] },
    { id: 'upg', title: 'Vylepšení her', icon: '⚡', upg: 'game' }
  ];
  const shopUI = (() => {
    const ui = { open: { theme: true }, filter: 'all' };
    try {
      const v = JSON.parse(localStorage.getItem(SHOP_KEY) || 'null');
      if (v && typeof v.open === 'object' && v.open) ui.open = v.open;
      if (v && ['all', 'new', 'own'].includes(v.filter)) ui.filter = v.filter;
    } catch (e) { /* bez úložiště platí výchozí stav */ }
    return ui;
  })();
  const saveShopUI = () => { try { localStorage.setItem(SHOP_KEY, JSON.stringify(shopUI)); } catch (e) { /* nic */ } };
  let shopFocus = null; // po překreslení vrátí fokus na stejné tlačítko
  const renderShop = main => {
    const f = shopUI.filter;
    main.append(el('h1', { text: 'Obchod' }), el('p', { class: 'muted', text: 'Mince získáváš hraním. Nic se tu nekupuje za skutečné peníze.' }),
      el('div', { class: 'seg shfilter', role: 'radiogroup', 'aria-label': 'Zobrazit' }, [['all', 'Vše'], ['new', 'Nekoupené'], ['own', 'Koupené']].map(([v, t]) =>
        el('button', { class: 'segb', role: 'radio', 'aria-checked': String(f === v), 'data-k': 'f:' + v, text: t,
          onclick: () => { if (f === v) return; shopUI.filter = v; saveShopUI(); H.sfx('tap'); shopFocus = 'f:' + v; render(); } }))));
    const upgradeRows = group => H.UPGRADES.filter(u => u.group === group).filter(u => {
      const lv = S.upg[u.id] || 0;
      return f === 'all' || (f === 'new' ? lv < u.prices.length : lv > 0);
    }).map(u => {
      const lv = S.upg[u.id] || 0, max = lv >= u.prices.length, price = u.prices[lv];
      return el('div', { class: 'row' },
        el('span', { class: 'ricon', 'aria-hidden': 'true', text: u.icon }),
        el('div', { class: 'rmid' }, el('strong', { text: `${u.name} · úroveň ${lv}/${u.prices.length}` }), el('span', { class: 'muted', text: u.desc })),
        el('button', { class: 'btn small' + (max ? '' : ' primary'), disabled: max, 'data-k': 'u:' + u.id, text: max ? 'Maximum' : `🪙 ${H.fmt(price)}`, 'aria-label': max ? `${u.name}: maximum` : `Vylepšit ${u.name} za ${H.fmt(price)} mincí`,
          onclick: () => buy(`${u.name} (úroveň ${lv + 1})`, price, () => { S.upg[u.id] = lv + 1; shopFocus = 'u:' + u.id; }) }));
    });
    const skinTiles = cat => H.SKINS[cat].items.map((it, i) => [it, i]).filter(([it]) => {
      const own = S.owned[cat].includes(it.id);
      return f === 'all' || (f === 'new' ? !own : own);
    }).map(([it, i]) => {
      const own = S.owned[cat].includes(it.id), act = S.active[cat] === it.id, key = `s:${cat}:${i}`;
      const prev = cat === 'bg' || cat === 'win' ? el('span', { class: 'swe', text: it.sw })
        : cat === 'cards' && it.art ? el('span', { class: 'swc', html: H.cardFace(it, 0) + H.cardFace(it, 3) })
        : cat === 'theme' ? el('span', { class: 'sw', style: `background:${it.sw}` })
          : cat === 'pieces' ? el('span', { class: 'swt' }, el('b', { style: `color:${it.ca}`, text: it.a }), el('b', { style: `color:${it.cb}`, text: it.b }))
            : cat === 'car' ? el('span', { class: 'sw car', style: `background:${it.c};border-color:${it.s}` })
              : el('span', { class: 'swt', text: Array.from(it.set).slice(0, 2).join('') });
      return el('button', { class: 'skin' + (act ? ' active' : '') + (own ? ' owned' : ''), 'aria-pressed': String(act), 'data-k': key,
        'aria-label': `${it.name}${it.rar ? ', ' + it.rar : ''}: ${act ? 'aktivní' : own ? 'použít' : 'koupit za ' + H.fmt(it.price) + ' mincí'}`,
        onclick: () => {
          if (act) return;
          if (own) { S.active[cat] = it.id; previewSkin = null; H.save(); H.sfx('tap'); applyTheme(); shopFocus = key; render(); return; }
          const get = () => buy(it.name, it.price, () => { S.owned[cat].push(it.id); S.active[cat] = it.id; previewSkin = null; shopFocus = key; });
          if (cat !== 'theme') return get();
          H.modal({ title: `${it.name} · ${it.rar}`, body: [el('p', { class: 'muted', text: 'Co tenhle motiv umí:' }), el('ul', { class: 'fxlist' }, it.about.map(t => el('li', { text: t }))),
            el('p', { class: 'muted', text: S.coins >= it.price ? `Cena ${H.fmt(it.price)} mincí.` : `Cena ${H.fmt(it.price)} mincí, chybí ti ${H.fmt(it.price - S.coins)}.` })],
            actions: [{ label: 'Vyzkoušet na 10 s', fn: () => {
              previewSkin = it.id; applyTheme(); H.toast(`Náhled motivu ${it.name}. Za chvíli se vrátí tvůj.`);
              clearTimeout(previewT); previewT = setTimeout(() => { previewSkin = null; applyTheme(); }, 10000);
            } }, { label: 'Koupit', primary: true, fn: () => { setTimeout(get, 0); } }] });
        } },
        el('span', { class: 'sprev', 'aria-hidden': 'true' }, prev), el('span', { class: 'sname', text: it.name }), it.rar ? el('span', { class: 'srar', text: it.rar }) : null,
        el('span', { class: 'sstate', text: act ? '✓ Aktivní' : own ? 'Použít' : `🪙 ${H.fmt(it.price)}` }));
    });
    /* souhrn do hlavičky sekce: kolik vlastníš a co si můžeš koupit */
    const summary = sec => {
      let have = 0, total = 0;
      const offers = [];
      if (sec.upg) for (const u of H.UPGRADES.filter(x => x.group === sec.upg)) {
        const lv = S.upg[u.id] || 0; have += lv; total += u.prices.length;
        if (lv < u.prices.length) offers.push({ name: `${u.name} ${lv + 1}`, price: u.prices[lv] });
      } else for (const cat of sec.cats) for (const it of H.SKINS[cat].items) {
        total++;
        if (S.owned[cat].includes(it.id)) have++; else offers.push({ name: it.name, price: it.price });
      }
      offers.sort((a, b) => a.price - b.price);
      const can = offers.filter(o => o.price <= S.coins);
      const hint = !offers.length ? (sec.upg ? 'Všechno vylepšené na maximum' : 'Všechno máš')
        : can.length ? `Můžeš koupit: ${can[0].name} · 🪙 ${H.fmt(can[0].price)}`
          : `Nejlevnější: ${offers[0].name}, chybí 🪙 ${H.fmt(offers[0].price - S.coins)}`;
      return { have, total, hint, can: can.length > 0, done: !offers.length };
    };
    for (const sec of SHOP_SECTIONS) {
      const sm = summary(sec), open = !!shopUI.open[sec.id], bodyId = 'shop-' + sec.id;
      const content = [];
      if (sec.upg) { const rows = upgradeRows(sec.upg); if (rows.length) content.push(el('div', { class: 'list' }, rows)); }
      else for (const cat of sec.cats) {
        const tiles = skinTiles(cat); if (!tiles.length) continue;
        if (sec.cats.length > 1) content.push(el('h3', { text: H.SKINS[cat].name }));
        content.push(el('div', { class: 'skins' }, tiles));
      }
      if (!content.length) content.push(el('p', { class: 'muted shempty', text: f === 'new' ? 'Tady už máš všechno.' : 'Tady zatím nic nemáš.' }));
      if (sec.id === 'win' && f !== 'new') content.push(el('button', { class: 'btn small ghost', text: 'Přehrát aktivní oslavu', onclick: () => H.confetti() }));
      const body = el('div', { class: 'shbody', id: bodyId, role: 'region', 'aria-label': sec.title, hidden: !open }, content);
      const head = el('button', { class: 'shhead', 'aria-expanded': String(open), 'aria-controls': bodyId, 'data-k': 'h:' + sec.id,
        onclick: () => {
          const o = head.getAttribute('aria-expanded') !== 'true';
          head.setAttribute('aria-expanded', String(o)); body.hidden = !o; head.parentNode.parentNode.classList.toggle('open', o);
          if (o) shopUI.open[sec.id] = true; else delete shopUI.open[sec.id];
          saveShopUI(); H.sfx('tap');
        } },
        el('span', { class: 'shico', 'aria-hidden': 'true', text: sec.icon }),
        el('span', { class: 'shmid' }, el('span', { class: 'shtitle', text: sec.title }), el('span', { class: 'shhint' + (sm.can ? ' can' : ''), text: sm.hint })),
        el('span', { class: 'pill' + (sm.done ? ' full' : ''), 'aria-label': sec.upg ? `Úrovně ${sm.have} z ${sm.total}` : `Vlastníš ${sm.have} z ${sm.total}` }, `${sm.have}/${sm.total}`),
        el('span', { class: 'shchev', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' }));
      main.append(el('section', { class: 'shsec' + (open ? ' open' : '') }, el('h2', { class: 'shh' }, head), body));
    }
    if (shopFocus) {
      const t = main.querySelector(`[data-k="${shopFocus}"]`); shopFocus = null;
      if (t) setTimeout(() => { if (t.isConnected) t.focus({ preventScroll: true }); }, 0);
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
          el('div', {}, el('b', { text: S.questsDone }), el('span', { text: 'výzev' }))),
        el('p', { class: 'muted', text: `🔥 Série výher: teď ${S.streak}, nejdelší ${S.bestWin}` })));
    main.append(el('h2', { text: 'Hry' }));
    if (!played) main.append(el('p', { class: 'empty', text: 'Zatím tu nic není. Zahraj si první hru a statistiky se začnou plnit.' }, el('br'), el('button', { class: 'btn primary', text: 'Vybrat hru', onclick: () => go('home') })));
    for (const g of H.games) {
      const st = S.games[g.id]; if (!st || !st.played) continue;
      const gl = H.gameLevel(st.xp);
      const lines = [];
      if (g.vsAI) lines.push(`Výhry ${st.wins} · prohry ${st.losses} · remízy ${st.draws}`, `Série výher: teď ${st.streak}, nejdelší ${st.bestStreak}`);
      if (!g.noDiff) lines.push(Object.keys(st.byDiff).sort().map(d => `${diffName(g, d)}: ${g.vsAI || g.winLose ? st.byDiff[d].w + ' výher z ' : ''}${st.byDiff[d].p}${g.vsAI || g.winLose ? '' : '×'}`).join(' · '));
      const bests = Object.keys(st.best).sort().map(k => `${bestLabel(g, k)}${fmtBest(g, st.best[k])}`);
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
          H.S = S = H.merge(d); H.save(); applyTheme(); render(); H.toast('Záloha načtena.');
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
    /* výběr stylu: dlaždice s malým náhledem, volba platí hned */
    const stylePick = (key, label, opts) => {
      const grp = el('div', { class: 'stpick', role: 'radiogroup', 'aria-label': label, style: `--pa:${H.skin('theme').sw}` }, opts.map(([v, t]) =>
        el('button', { class: 'stp', role: 'radio', 'aria-checked': String(S.settings[key] === v), 'data-pv': v === 'same' ? null : v, onclick: e => {
          S.settings[key] = v; H.save(); H.sfx('tap'); applyTheme();
          for (const b of grp.children) b.setAttribute('aria-checked', String(b === e.currentTarget));
        } }, el('span', { class: 'stp-m' + (v === 'same' ? ' same' : ''), 'aria-hidden': 'true' }, v === 'same' ? '=' : [el('i'), el('i'), el('i'), el('i')]), el('span', { class: 'stp-n', text: t }))));
      return grp;
    };
    const styles = H.STYLES.map(s => [s.id, s.name]);
    const file = el('input', { type: 'file', accept: 'application/json,.json', class: 'sr', 'aria-label': 'Soubor se zálohou', onchange: e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; } });
    main.append(el('h1', { text: 'Nastavení' }),
      el('h2', { text: 'Hra' }), el('div', { class: 'list' },
        toggle('sound', 'Zvuky'), toggle('vib', 'Vibrace', 'Funguje na Androidu. iPhone vibrace z webových appek nepovoluje.'),
        select('motion', 'Animace', [['auto', 'Podle systému'], ['on', 'Zapnuté'], ['off', 'Vypnuté']], 'Konfety, otřesy a přechody.')),
      el('h2', { text: 'Vzhled' }), el('div', { class: 'list' },
        select('theme', 'Režim', [['system', 'Podle systému'], ['light', 'Světlý'], ['dark', 'Tmavý']], 'Barvu motivu měníš v Obchodě.')),
      el('h3', { text: 'Styl aplikace' }), stylePick('style', 'Styl aplikace', styles),
      el('h3', { text: 'Styl ve hrách' }), stylePick('gstyle', 'Styl ve hrách', [['same', 'Jako aplikace'], ...styles]),
      el('p', { class: 'muted stnote', text: 'Styl mění tvar: okraje, stíny, zaoblení a rozložení. Barvy dodává motiv z Obchodu, jen Černobílý je vždy černobílý a bez efektů.' }),
      el('h2', { text: 'Data' }), el('div', { class: 'list' },
        el('div', { class: 'row' }, el('div', { class: 'rmid' }, el('strong', { text: 'Záloha' }), el('span', { class: 'muted', text: 'Postup je uložený jen v tomhle telefonu. Zálohuj před výměnou telefonu.' })),
          el('div', { class: 'rbtns' }, el('button', { class: 'btn small', text: 'Exportovat', onclick: exportData }), el('button', { class: 'btn small', text: 'Importovat', onclick: () => file.click() }), file)),
        el('div', { class: 'row' }, el('div', { class: 'rmid' }, el('strong', { text: 'Smazat všechna data' }), el('span', { class: 'muted', text: 'Level, mince, skiny, vylepšení, statistiky i rozehrané hry.' })),
          el('button', { class: 'btn small danger', text: 'Smazat', onclick: () => H.modal({ title: 'Smazat všechno?', body: el('p', { text: 'Přijdeš o level, mince, skiny, vylepšení, statistiky i rozehrané hry. Nejde to vrátit, pokud nemáš zálohu.' }),
            actions: [{ label: 'Zrušit' }, { label: 'Nejdřív exportovat', fn: () => { exportData(); return false; } }, { label: 'Smazat vše', danger: true, fn: () => { H.reset(); S = H.S; applyTheme(); go('home'); H.toast('Data smazána.'); } }] }) }))),
      el('h2', { text: 'O appce' }), el('div', { class: 'card' },
        el('p', { text: 'Herna je sbírka rychlých her, která běží celá v tvém telefonu, i bez internetu.' }),
        el('p', { text: 'Žádný účet, žádné reklamy, žádné sledování. Appka nic neposílá na server a nenačítá nic od třetích stran. Postup se ukládá jen do úložiště prohlížeče v tomto zařízení.' }),
        el('p', { class: 'muted', text: 'Verze ' + VERSION })));
  };

  /* ---------- Učebnice (obsah dodává js/ucebnice.js) ---------- */
  const renderLearn = main => {
    if (H.renderLibrary) H.renderLibrary(main);
    else main.append(el('h1', { text: 'Učebnice' }), el('p', { class: 'empty', text: 'Učebnice se načítá. Zkus to prosím za chvíli znovu.' }));
  };

  /* ---------- Navigace ---------- */
  const VIEWS = { home: ['home', 'Hry', renderHome], learn: ['book', 'Učebnice', renderLearn], shop: ['shop', 'Obchod', renderShop], profile: ['profile', 'Profil', renderProfile], settings: ['settings', 'Nastavení', renderSettings] };
  const render = () => {
    S = H.S;
    const main = $('#view'); main.textContent = ''; main.className = 'view v-' + view;
    document.body.classList.toggle('ingame', view === 'game'); H.fx.wake();
    if (view === 'game') return;
    renderTop();
    const nav = $('#nav'); nav.textContent = '';
    for (const k in VIEWS) nav.append(el('button', { class: 'navb', 'aria-current': k === view ? 'page' : null, onclick: () => go(k) },
      H.ico(VIEWS[k][0]), el('span', { text: VIEWS[k][1] })));
    VIEWS[view][2](main);
  };
  H.rerender = () => render();
  const go = v => { if (cur) { if (cur.inst) cur.inst.destroy(); cur = null; } closeMenu(); if (v !== view) editOrder = false; view = v; render(); $('#view').scrollTop = 0; };

  /* ---------- Hra: celá obrazovka patří hře, nastavení je v rychlém menu ---------- */
  const variantOpen = g => !!g.variant && H.gameLevel(H.gstat(g.id).xp).level >= g.variant.level;
  const menuKey = e => {
    if (e.key !== 'Escape' || document.querySelector('.modal')) return;
    e.stopPropagation();
    if (menuOpen === 'pause') resume(); else if (menuOpen === 'start') go('home');
  };
  function closeMenu() {
    const m = $('#gmenu'); if (m) m.textContent = '';
    document.removeEventListener('keydown', menuKey, true);
    if (cur) { cur.stage.inert = false; cur.pauseBtn.hidden = !cur.inst; }
    menuOpen = false;
  }
  const pause = () => { if (!cur || !cur.inst || menuOpen) return; if (cur.ctx) cur.ctx.paused = true; menu(cur.ended ? 'end' : 'pause'); };
  const resume = () => { if (cur && cur.ctx) cur.ctx.paused = false; closeMenu(); if (cur) cur.pauseBtn.focus({ preventScroll: true }); };
  const openGame = id => {
    const g = H.byId[id];
    if (cur && cur.inst) cur.inst.destroy();
    view = 'game'; render();
    const stage = el('div', { class: 'stage' });
    const pauseBtn = el('button', { class: 'pauseb', 'aria-label': 'Pauza a menu', hidden: true, onclick: () => pause() }, H.ico('pause'));
    $('#view').append(el('h1', { class: 'sr', text: g.name }), pauseBtn, stage, el('div', { id: 'gmenu' }));
    cur = { g, stage, pauseBtn, inst: null, ctx: null, run: null, started: false, ended: false, result: null };
    menu('start');
  };
  const startGame = saved => {
    const me = cur, g = me.g, p = H.pref(g.id);
    if (me.inst) me.inst.destroy();
    me.stage.textContent = ''; me.stage.className = 'stage';
    const mode = saved ? saved.mode : p.mode, diff = saved ? saved.diff : (p.diff || 0);
    const variant = saved ? saved.variant : !!(p.variant && variantOpen(g));
    const opts = saved ? (saved.opts || {}) : JSON.parse(JSON.stringify(p.opts || {}));
    const pvp = saved ? !!saved.pvp : !!(g.pvp && p.vs === 'pvp');
    const aiFirst = !saved && g.vsAI && p.n % 2 === 1;
    if (!saved) { p.n++; delete S.saves[g.id]; }
    S.seenHelp[g.id] = 1; H.save();
    const undos = (g.noDiff || diff < 3 || pvp) ? S.upg.undo : 0, run = {};
    Object.assign(me, { diff, variant, mode, run, started: !!saved, ended: false, result: null });
    const ctx = me.ctx = {
      diff, variant, mode, opts, pvp, saved: saved ? saved.state : null, aiFirst, undos, undosMax: undos, upg: S.upg, skin: H.skin, paused: false,
      touch() { if (me.run === run) me.started = true; },
      save(state) { if (cur !== me || me.run !== run || me.ended) return; me.started = true; if (g.saveable) { S.saves[g.id] = { diff, variant, mode, opts, pvp, state }; H.save(); } },
      end(res) { if (cur !== me || me.run !== run || me.ended) return; me.ended = true; onEnd(me, res); }
    };
    me.inst = { destroy() {} };
    closeMenu();
    $('#view').scrollTop = 0;
    me.inst = g.start(me.stage, ctx);
  };
  const menu = kind => {
    const me = cur, g = me.g, p = H.pref(g.id), box = $('#gmenu'), sv = S.saves[g.id];
    if (!p.opts) p.opts = {};
    if (g.pvp && p.vs !== 'pvp') p.vs = 'ai';
    menuOpen = kind; me.stage.inert = true; me.pauseBtn.hidden = true;
    const optsBox = el('div', { class: 'gopts' });
    const seg = (name, items, key) => el('div', { class: 'seg', role: 'radiogroup', 'aria-label': name }, items.map(([v, t]) =>
      el('button', { class: 'segb', role: 'radio', 'aria-checked': String(p[key] === v), text: t, onclick: () => { p[key] = v; H.save(); H.sfx('tap'); drawOpts(); } })));
    function drawOpts() {
      optsBox.textContent = '';
      const nodes = [];
      if (g.modes) nodes.push(el('h3', { text: 'Režim' }), seg('Režim', g.modes.map(m => [m.id, m.name]), 'mode'));
      if (g.pvp) nodes.push(el('h3', { text: 'Soupeř' }), seg('Soupeř', [['ai', 'Počítač'], ['pvp', 'Dva hráči na telefonu']], 'vs'));
      const dn = g.pvp && p.vs === 'pvp' ? null : diffNames(g, p.mode);
      if (dn) nodes.push(el('h3', { text: 'Obtížnost' }), seg('Obtížnost', dn.map((t, i) => [i, t]), 'diff'));
      if (g.menuExtra) nodes.push(...g.menuExtra(p, p.opts, () => { H.save(); drawOpts(); }));
      if (g.variant) {
        const open = variantOpen(g);
        nodes.push(el('label', { class: 'row vrow' },
          el('div', { class: 'rmid' }, el('strong', { text: (open ? '' : '🔒 ') + 'Varianta: ' + g.variant.name }), el('span', { class: 'muted', text: g.variant.desc + (open ? '' : ` Odemkne se na úrovni ${g.variant.level} této hry.`) })),
          el('input', { type: 'checkbox', class: 'switch', role: 'switch', 'aria-label': 'Varianta ' + g.variant.name, disabled: !open, checked: p.variant && open, onchange: e => { p.variant = e.target.checked; H.save(); } })));
      }
      optsBox.append(...nodes);
    }
    drawOpts();
    const hasOpts = !!(g.modes || diffNames(g, p.mode) || g.variant || g.menuExtra);
    const parts = [];
    const gl = H.gameLevel(H.gstat(g.id).xp);
    parts.push(el('div', { class: 'mhead' }, el('span', { class: 'tico', style: `--c1:${g.grad[0]};--c2:${g.grad[1]}` }, H.ico(g.id)),
      el('div', { class: 'rmid' }, el('h2', { text: g.name }), el('span', { class: 'muted', text: `Úroveň ${gl.level} · ${g.desc}` }))));
    if (kind === 'end' && me.result) {
      const R = me.result, r = R.r;
      const title = R.title ? R.title : r === 'win' ? 'Výhra' : r === 'loss' ? 'Prohra' : r === 'draw' ? 'Remíza' : `Konec hry · ${R.res.score}`;
      parts.push(el('div', { class: 'result' + (R.hot ? ' hot' : '') + ' r-' + r },
        el('p', { class: 'rtitle', role: 'status', text: title + (R.hot ? `  🔥×${S.streak}` : '') }),
        el('p', { class: 'rewards' }, el('span', { class: 'rw', text: `+${R.xp} XP` }), el('span', { class: 'rw', text: `+${H.fmt(R.coins)} 🪙` })),
        el('div', { class: 'glvl' }, el('span', { text: `${g.name} · úroveň ${R.G1.level}` }), bar(R.G1.into, R.G1.need, 'Postup úrovně hry')),
        R.extras.length ? el('ul', { class: 'extras' }, R.extras.map(t => el('li', { text: t }))) : null));
    }
    const btn = (label, fn, cls) => el('button', { class: 'btn big ' + (cls || ''), text: label, onclick: fn });
    let primary;
    const btns = el('div', { class: 'mbtns' });
    if (kind === 'start') {
      if (sv) btns.append(primary = btn('Pokračovat v rozehrané', () => startGame(sv), 'primary'), btn('Nová hra', () => startGame(null)));
      else btns.append(primary = btn('Hrát', () => startGame(null), 'primary'));
    } else if (kind === 'pause') {
      btns.append(primary = btn('Pokračovat', resume, 'primary'), btn('Nová hra', () => startGame(null)));
    } else {
      btns.append(primary = btn('Hrát znovu', () => startGame(null), 'primary'), btn('Prohlédnout pole', () => closeMenu()));
    }
    if (hasOpts) parts.push(kind === 'start' ? optsBox : el('details', { class: 'mdet' }, el('summary', { text: 'Nastavení hry' }), optsBox, kind === 'pause' ? el('p', { class: 'muted', text: 'Změny se projeví v nové hře.' }) : null));
    parts.push(el('details', { class: 'mdet', open: !S.seenHelp[g.id] }, el('summary', { text: 'Jak hrát' }), el('p', { text: g.help })));
    if (H.BOOKS && H.BOOKS[g.id] && H.openBook) parts.push(el('button', { class: 'btn mbook', text: '📖 Učebnice', onclick: () => H.openBook(g.id) }));
    parts.push(btns);
    parts.push(el('button', { class: 'btn ghost mback', onclick: () => {
      const keep = me.started && !me.ended && g.saveable && S.saves[g.id];
      go('home'); if (keep) H.toast('Hra je uložená. Pokračuješ příště.');
    } }, H.ico('back'), el('span', { text: me.started && !me.ended && !g.saveable ? 'Ukončit hru a zpět na hry' : 'Zpět na hry' })));
    box.textContent = '';
    box.append(el('div', { class: 'gmenu k-' + kind, role: 'dialog', 'aria-modal': 'true', 'aria-label': g.name + ': menu' }, el('div', { class: 'gpanel' }, parts)));
    document.addEventListener('keydown', menuKey, true);
    primary.focus({ preventScroll: true });
  };

  /* ---------- Konec hry a odměny ---------- */
  const checkBadges = out => {
    const all = Object.values(S.games), played = all.reduce((a, s) => a + s.played, 0);
    const owned = Object.values(S.owned).reduce((a, l) => a + l.length, 0);
    const tests = {
      first: all.some(s => s.wins > 0), streak5: all.some(s => s.bestStreak >= 5), streak10: all.some(s => s.bestStreak >= 10),
      all: H.games.every(g => S.games[g.id] && S.games[g.id].played), p50: played >= 50, p250: played >= 250,
      lvl10: H.level(S.xp).level >= 10, rich: S.coins >= 2000, collector: owned >= 8, quest10: S.questsDone >= 10,
      streak7: S.bestWin >= 7
    };
    for (const b of H.BADGES) if (!S.badges[b.id] && (tests[b.id] || (out.flags && out.flags[b.id]))) { S.badges[b.id] = H.today(); out.push(`${b.icon} Nový odznak: ${b.name}`); }
  };
  const onEndPvp = (me, res) => {
    const g = me.g, st = H.gstat(g.id), run = me.run, w = res.winner;
    delete S.saves[g.id];
    st.played++;
    const xp = 10, coins = 5;
    S.xp += xp; st.xp += xp; S.coins += coins;
    H.ensureDaily();
    for (const q of S.daily.quests) if (!q.done && q.type === 'play') { q.prog++; if (q.prog >= q.n) { q.done = true; S.coins += q.reward; S.questsDone++; } }
    H.save();
    me.result = { r: 'pvp', title: w ? `Vyhrál hráč ${w}` : 'Remíza', xp, coins, G1: H.gameLevel(st.xp), extras: ['Hra dvou hráčů se nepočítá do výher, série ani rekordů.'], res, hot: false };
    setTimeout(() => { if (cur !== me || me.run !== run) return; if (w) { H.sfx('win'); H.confetti(); } else H.sfx('match'); }, 350);
    setTimeout(() => { if (cur === me && me.run === run && !menuOpen) menu('end'); }, 1500);
  };
  const onEnd = (me, res) => {
    if (res.result === 'pvp') return onEndPvp(me, res);
    const { g, diff, variant } = me, st = H.gstat(g.id), r = res.result, extras = [];
    delete S.saves[g.id];
    st.played++;
    const bd = st.byDiff[diff] || (st.byDiff[diff] = { p: 0, w: 0 }); bd.p++;
    if (r === 'win') { st.wins++; bd.w++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
    else if (r === 'loss') { st.losses++; st.streak = 0; }
    else if (r === 'draw') st.draws++;
    st.last.push(r[0] === 'd' && r !== 'draw' ? 'x' : r[0]); if (st.last.length > 10) st.last.shift();
    if (res.score != null) {
      const k = bestKey(g, { diff, variant, mode: me.mode }), old = st.best[k];
      if (old == null || (res.lower ? res.score < old : res.score > old)) { st.best[k] = res.score; if (old != null && res.score > 0) extras.push('🏅 Nový rekord: ' + fmtBest(g, res.score)); }
    }
    let xp = res.xp != null ? res.xp : r === 'win' ? [40, 70, 100, 130][diff] : r === 'draw' ? [20, 35, 50, 65][diff] : 10;
    if (variant && r === 'win' && g.id !== 'had') xp = Math.round(xp * 1.5);
    const counts = g.vsAI || g.winLose;
    if (counts && r === 'win') { S.streak++; S.bestWin = Math.max(S.bestWin, S.streak); }
    else if (counts && r === 'loss') { if (S.streak >= 2) extras.push(`Série ${S.streak} výher skončila.`); S.streak = 0; }
    const sCap = [50, 75, 100][S.upg.streakCap || 0], sPct = r === 'loss' ? 0 : Math.min(sCap, 5 * Math.max(0, S.streak - 1));
    if (sPct) xp = Math.round(xp * (1 + sPct / 100));
    let coins = Math.round(xp / 2) + Math.round((res.coins || 0) * (1 + sPct / 100));
    if (sPct) extras.push(`🔥 Série ${S.streak} výher: +${sPct} % k odměně` + (sPct >= sCap ? ' (strop)' : ''));
    const hot = sPct > 0;
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
    S.coins += coins;
    extras.flags = Object.assign({ imp: r === 'win' && diff === 3 && g.vsAI, hard: r === 'win' && diff >= 2 && g.vsAI }, res.flags || {});
    checkBadges(extras);
    H.save();
    const good = r === 'win' || (r === 'done' && extras.length > (hot ? 1 : 0)), run = me.run;
    me.result = { r, xp, coins, G1, extras, res, hot };
    setTimeout(() => {
      if (cur !== me || me.run !== run) return;
      if (good) { H.sfx(L1 > L0 ? 'level' : 'win'); H.confetti(); H.buzz([30, 40, 60]); } else if (r === 'loss') H.sfx('lose'); else H.sfx('match');
    }, 350);
    setTimeout(() => { if (cur === me && me.run === run && !menuOpen) menu('end'); }, good ? 1500 : 1100);
  };

  /* ---------- Skutečná výška displeje ---------- */
  const fitHeight = () => {
    const d = document.documentElement, standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let h = Math.max(window.innerHeight || 0, d.clientHeight || 0);
    if (standalone && ios && window.screen) { const portrait = !window.matchMedia || matchMedia('(orientation: portrait)').matches; h = Math.max(h, portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width)); }
    if (h > 0) d.style.setProperty('--app-h', h + 'px');
  };
  fitHeight();
  for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, () => { fitHeight(); setTimeout(fitHeight, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitHeight);

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
  H.save();
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && view === 'game' && cur && cur.inst && !menuOpen && !document.querySelector('.modal')) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && cur && cur.g.realtime && cur.started && !cur.ended && !menuOpen) pause(); });
  render();
  document.addEventListener('visibilitychange', () => { if (document.hidden) H.save(); });
})();
