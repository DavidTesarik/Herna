'use strict';
/* Herna — jádro: stav, ukládání, zvuk, efekty, pomocné funkce */
(function () {
  const H = window.H = { games: [], byId: {} };
  const KEY = 'herna:data';

  H.register = g => { H.games.push(g); H.byId[g.id] = g; };
  H.DIFFS = ['Lehká', 'Střední', 'Těžká', 'Nemožná'];

  /* ---------- DOM ---------- */
  H.el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  };
  H.rnd = n => Math.floor(Math.random() * n);
  H.pick = a => a[H.rnd(a.length)];
  H.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = H.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  H.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  H.fmt = n => n < 10000 ? Math.floor(n).toLocaleString('cs-CZ') : n < 1e6 ? (n / 1e3).toFixed(1).replace('.', ',') + ' tis.' : (n / 1e6).toFixed(2).replace('.', ',') + ' mil.';
  H.fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---------- Ikony (vlastní, kreslené čarou) ---------- */
  H.ICONS = {
    piskvorky: '<path d="M4 4l7 7M11 4l-7 7"/><circle cx="16.5" cy="16.5" r="4"/>',
    ctyri: '<circle cx="5" cy="19" r="2.3" fill="currentColor"/><circle cx="9.7" cy="14.3" r="2.3" fill="currentColor"/><circle cx="14.3" cy="9.7" r="2.3" fill="currentColor"/><circle cx="19" cy="5" r="2.3" fill="currentColor"/><circle cx="5" cy="9.7" r="2.3"/><circle cx="19" cy="14.3" r="2.3"/>',
    zavod: '<path d="M5 21V4M5 5h13l-2.5 4 2.5 4H5"/>',
    miny: '<circle cx="12" cy="12.5" r="5"/><path d="M12 4.5v3M12 17.5v3M4 12.5h3M17 12.5h3M6.4 6.9l2 2M15.6 16.1l2 2M17.6 6.9l-2 2M6.4 18.1l2-2"/>',
    pexeso: '<rect x="3.5" y="6.5" width="10" height="14" rx="2"/><rect x="10.5" y="3.5" width="10" height="14" rx="2"/>',
    g2048: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><rect x="13" y="13" width="7.5" height="7.5" rx="2"/>',
    had: '<path d="M4 19c0-3 3-3.5 6-3.5s4.5-1 4.5-3-2-3-4.5-3-4-1-4-3 2-2.5 5-2.5h6"/><circle cx="19.5" cy="4" r="1.4" fill="currentColor"/>',
    sudoku: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
    slovo: '<rect x="2.5" y="6.5" width="8.5" height="11" rx="2"/><rect x="13" y="6.5" width="8.5" height="11" rx="2"/><path d="M5 15l1.75-5.5L8.5 15M5.6 13.3h2.3M16 9.5v5.5h2.6"/>',
    lode: '<path d="M3 15h18l-2.6 5.5H5.6zM12 15V4M12 5l6.5 7H12"/>',
    dama: '<path d="M4 19.5h16M5.2 16l-1.2-8.5 4.6 4L12 5l3.4 6.5 4.6-4L18.8 16z"/>',
    home: '<path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.5 4.5v1.2a3 3 0 0 1-5.6 1.6l-.5-.8H9.1l-.5.8A3 3 0 0 1 3 14.2V13a4.5 4.5 0 0 1 4.5-4.5zM8 11.5v3M6.5 13h3"/><circle cx="16.5" cy="13" r="1" fill="currentColor"/>',
    city: '<path d="M3 20.5h18M4.5 20.5V10l5-2.5v13M9.5 20.5V4.5l6 2.5v13.5M15.5 12l4 2v6.5"/>',
    shop: '<path d="M5 8.5h14l-1 12H6zM9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    profile: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
    settings: '<path d="M4 7.5h8M17 7.5h3M4 16.5h3M12 16.5h8"/><circle cx="14.5" cy="7.5" r="2.3"/><circle cx="9.5" cy="16.5" r="2.3"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>'
  };
  H.ico = (name, cls) => H.el('span', { class: 'ico' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${H.ICONS[name] || ''}</svg>` });
  /* posuvné pole pro velké desky */
  H.pan = inner => {
    const box = H.el('div', { class: 'pan' }, inner);
    requestAnimationFrame(() => { box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2; box.scrollTop = (box.scrollHeight - box.clientHeight) / 2; });
    return box;
  };

  /* ---------- Katalog skinů a vylepšení ---------- */
  H.SKINS = {
    theme: { name: 'Motiv appky', items: [
      { id: 'neon', name: 'Fialová', price: 0, sw: '#6d28d9', rar: 'Základní', fx: '', about: ['Čistý vzhled bez efektů.'] },
      { id: 'ocean', name: 'Oceán', price: 150, sw: '#1d4ed8', rar: 'Běžný', fx: '', about: ['Modrý přechod na pozadí.', 'Bublinky stoupající obrazovkou.'] },
      { id: 'les', name: 'Les', price: 300, sw: '#047857', rar: 'Běžný', fx: '', about: ['Zelený přechod na pozadí.', 'Padající listí.'] },
      { id: 'zapad', name: 'Západ slunce', price: 600, sw: '#be123c', rar: 'Vzácný', fx: 'glow', about: ['Teplý přechod na pozadí.', 'Vznášející se světélka.', 'Zářící tlačítka.'] },
      { id: 'zlato', name: 'Zlato', price: 1500, sw: '#92400e', rar: 'Vzácný', fx: 'glow shine', about: ['Třpytivé jiskry na pozadí.', 'Odlesk přejíždějící přes dlaždice her.', 'Zlaté jiskry při ťuknutí na tlačítko.'] },
      { id: 'kyber', name: 'Neon', price: 5000, sw: '#0e7490', rar: 'Epický', fx: 'glow border', about: ['Neonové světelné pruhy na pozadí.', 'Svítící obrysy karet a dlaždic.', 'Světelné kruhy při ťuknutí.'] },
      { id: 'vesmir', name: 'Galaxie', price: 20000, sw: '#4338ca', rar: 'Legendární', fx: 'glow shine border', about: ['Hvězdné nebe s padajícími hvězdami.', 'Svítící obrysy a odlesky dlaždic.', 'Hvězdný prach při ťuknutí.'] },
      { id: 'lava', name: 'Láva', price: 60000, sw: '#c2410c', rar: 'Legendární', fx: 'glow shine border pulse', about: ['Žhavé jiskry stoupající obrazovkou.', 'Pulzující záře tlačítek a karet.', 'Výbuch jisker při ťuknutí.'] },
      { id: 'duha', name: 'Hologram', price: 200000, sw: '#a21caf', rar: 'Mýtický', fx: 'shine rainbow', about: ['Barevné světelné koule plující pozadím.', 'Duhové obrysy, které plynule mění barvu.', 'Odlesky dlaždic a duhový výbuch při ťuknutí.'] }
    ] },
    city: { name: 'Styl domů (obrázek sídla)', items: [
      { id: 'klasik', name: 'Klasika', price: 0, rar: 'Základní' },
      { id: 'cihla', name: 'Cihlové', price: 400, rar: 'Běžný' },
      { id: 'sever', name: 'Severské', price: 1500, rar: 'Vzácný' },
      { id: 'poust', name: 'Pouštní', price: 5000, rar: 'Vzácný' },
      { id: 'cukr', name: 'Cukrové', price: 15000, rar: 'Epický' },
      { id: 'kyber', name: 'Kyberpunk', price: 50000, rar: 'Legendární' },
      { id: 'zlate', name: 'Zlaté město', price: 150000, rar: 'Mýtický' }
    ] },
    pieces: { name: 'Kameny (piškvorky, čtyři v řadě, dáma)', items: [
      { id: 'klasik', name: 'Klasika', price: 0, a: '✕', b: '◯', ca: '#ef4444', cb: '#facc15' },
      { id: 'neon', name: 'Neon', price: 200, a: '✦', b: '◉', ca: '#22d3ee', cb: '#f472b6' },
      { id: 'zivly', name: 'Oheň a voda', price: 450, a: '🔥', b: '💧', ca: '#fb923c', cb: '#60a5fa' },
      { id: 'zver', name: 'Kočka a pes', price: 900, a: '🐱', b: '🐶', ca: '#a78bfa', cb: '#86efac' },
      { id: 'vesmir', name: 'Vesmír', price: 2000, a: '🚀', b: '👽', ca: '#93c5fd', cb: '#bef264' }
    ] },
    bg: { name: 'Pozadí', items: [
      { id: 'auto', name: 'Podle motivu', price: 0, rar: 'Základní', sw: '◐' },
      { id: 'none', name: 'Čisté', price: 0, rar: 'Základní', sw: '○' },
      { id: 'ocean', name: 'Bublinky', price: 300, rar: 'Běžný', sw: '🫧' },
      { id: 'les', name: 'Padající listí', price: 300, rar: 'Běžný', sw: '🍃' },
      { id: 'snih', name: 'Sněžení', price: 1200, rar: 'Vzácný', sw: '❄️' },
      { id: 'zapad', name: 'Světlušky', price: 1200, rar: 'Vzácný', sw: '✨' },
      { id: 'zlato', name: 'Zlaté jiskry', price: 4000, rar: 'Epický', sw: '🌟' },
      { id: 'vesmir', name: 'Hvězdná obloha', price: 12000, rar: 'Epický', sw: '🌌' },
      { id: 'lava', name: 'Žhavé uhlíky', price: 30000, rar: 'Legendární', sw: '🔥' },
      { id: 'aurora', name: 'Polární záře', price: 80000, rar: 'Mýtický', sw: '🌈' }
    ] },
    win: { name: 'Oslava výhry', items: [
      { id: 'konfety', name: 'Konfety', price: 0, rar: 'Základní', sw: '🎉' },
      { id: 'hvezdy', name: 'Déšť hvězd', price: 800, rar: 'Běžný', sw: '⭐' },
      { id: 'mince', name: 'Zlatý déšť', price: 3000, rar: 'Vzácný', sw: '🪙' },
      { id: 'ohnostroj', name: 'Ohňostroj', price: 10000, rar: 'Epický', sw: '🎆' },
      { id: 'supernova', name: 'Supernova', price: 40000, rar: 'Legendární', sw: '💥' }
    ] },
    car: { name: 'Auto (závod)', items: [
      { id: 'cervene', name: 'Červené', price: 0, c: '#ef4444', s: '#ffffff' },
      { id: 'modre', name: 'Modré', price: 200, c: '#3b82f6', s: '#fde047' },
      { id: 'zelene', name: 'Zelené', price: 450, c: '#22c55e', s: '#052e16' },
      { id: 'cerne', name: 'Noční', price: 900, c: '#1f2937', s: '#22d3ee' },
      { id: 'zlate', name: 'Zlaté', price: 2500, c: '#f59e0b', s: '#7c2d12' }
    ] },
    cards: { name: 'Karty (pexeso)', items: [
      { id: 'recko', name: 'Antické Řecko', price: 0, art: 'recko' },
      { id: 'sport', name: 'Sportovci', price: 300, art: 'sport' },
      { id: 'zvirata', name: 'Zvířata', price: 0, set: '🐶🐱🦊🐻🐼🐸🐵🦁🐷🐮🐔🐙🦋🐢🐬🦄🐝🦉' },
      { id: 'jidlo', name: 'Jídlo', price: 250, set: '🍎🍌🍓🍉🍕🍔🍟🌮🍩🍪🍦🧀🥕🌽🍇🍒🥐🍫' },
      { id: 'sport', name: 'Sport a hry', price: 700, set: '⚽🏀🏈🎾🏐🎱🏓🥊⛳🎯🎲🎸🚲🏆🛹🎳🥇🪁' }
    ] }
  };
  H.UPGRADES = [
    { id: 'income', group: 'city', name: 'Vyšší nájmy', icon: '💹', desc: '+10 % k výdělku všech budov za každou úroveň.', prices: [300, 800, 2000, 5000, 12000, 30000, 70000, 160000, 350000, 800000] },
    { id: 'boostPow', group: 'city', name: 'Silnější bonus', icon: '⚡', desc: 'Bonus po výhře násobí výdělek budovy víc: 2× → 2,5× → 3× → 3,5× → 4×.', prices: [1500, 8000, 40000, 200000] },
    { id: 'boostLen', group: 'city', name: 'Delší bonus', icon: '⏳', desc: 'Bonus po výhře trvá o 5 minut déle za každou úroveň (základ je 10 minut).', prices: [500, 2000, 8000, 30000, 100000] },
    { id: 'discount', group: 'city', name: 'Stavební firma', icon: '🏗️', desc: 'Budovy jsou o 4 % levnější za každou úroveň.', prices: [400, 1500, 6000, 25000, 90000] },
    { id: 'winBonus', group: 'city', name: 'Sponzoři', icon: '🤝', desc: 'Bonus města za dohranou hru je o minutu výdělku větší za každou úroveň.', prices: [600, 2500, 10000, 40000, 150000] },
    { id: 'cap', group: 'city', name: 'Městský sklad', icon: '🏬', desc: 'Jak dlouho město vydělává, když je appka zavřená: 8 → 12 → 16 → 24 hodin.', prices: [1000, 4000, 15000] },
    { id: 'streakCap', group: 'game', name: 'Horká ruka', icon: '🔥', desc: 'Bonus za sérii výher může růst výš: strop +50 % → +75 % → +100 %.', prices: [2000, 20000] },
    { id: 'undo', group: 'game', name: 'Vrátit tah', icon: '↩️', desc: 'Počet vrácení tahu za hru (piškvorky, čtyři v řadě, dáma, 2048). Na obtížnosti Nemožná je vypnuté.', prices: [200, 600, 1500] },
    { id: 'shield', group: 'game', name: 'Štít', icon: '🛡️', desc: 'Závod: tolik nárazů auto vydrží bez zpomalení.', prices: [200, 600, 1500] },
    { id: 'magnet', group: 'game', name: 'Magnet', icon: '🧲', desc: 'Závod: přitahuje mince ze sousedních pruhů (vyšší úroveň = větší dosah).', prices: [250, 700, 1600] },
    { id: 'detector', group: 'game', name: 'Detektor min', icon: '📡', desc: 'Miny: počet bezpečných nápověd za hru.', prices: [200, 600, 1500] }
  ];
  H.BADGES = [
    { id: 'first', icon: '🎉', name: 'První výhra', desc: 'Vyhraj jakoukoli hru.' },
    { id: 'imp', icon: '👑', name: 'Nemožné? Možné.', desc: 'Vyhraj na obtížnosti Nemožná.' },
    { id: 'hard', icon: '💪', name: 'Tvrďák', desc: 'Vyhraj na obtížnosti Těžká.' },
    { id: 'streak5', icon: '🔥', name: 'Série 5', desc: '5 výher v řadě v jedné hře.' },
    { id: 'streak10', icon: '☄️', name: 'Série 10', desc: '10 výher v řadě v jedné hře.' },
    { id: 't2048', icon: '🧮', name: '2048!', desc: 'Slož dlaždici 2048.' },
    { id: 'snake30', icon: '🐍', name: 'Dlouhý had', desc: 'Sněz 30 jablek v Hadovi.' },
    { id: 'all', icon: '🧭', name: 'Všehochuť', desc: 'Zahraj si každou hru.' },
    { id: 'p50', icon: '🎮', name: 'Padesátka', desc: 'Odehraj 50 her.' },
    { id: 'p250', icon: '🕹️', name: 'Veterán', desc: 'Odehraj 250 her.' },
    { id: 'lvl10', icon: '⭐', name: 'Level 10', desc: 'Dosáhni levelu 10.' },
    { id: 'rich', icon: '💰', name: 'Boháč', desc: 'Měj najednou 2 000 mincí.' },
    { id: 'collector', icon: '🎨', name: 'Sběratel', desc: 'Vlastni 8 skinů.' },
    { id: 'quest10', icon: '📅', name: 'Výzvy přijaty', desc: 'Splň 10 denních výzev.' },
    { id: 'slovo2', icon: '🔮', name: 'Jasnovidec', desc: 'Uhodni Slovo nejpozději na druhý pokus.' },
    { id: 'city1', icon: '🏗️', name: 'Základní kámen', desc: 'Postav první budovu ve městě.' },
    { id: 'cityAll', icon: '🏙️', name: 'Starosta', desc: 'Postav všechny budovy.' },
    { id: 'city100', icon: '🌆', name: 'Velkoměsto', desc: 'Měj budovy s úrovněmi dohromady 100.' },
    { id: 'earn100k', icon: '🏧', name: 'Zlatý důl', desc: 'Město ti vydělalo celkem 100 000 mincí.' },
    { id: 'metro', icon: '🌃', name: 'Metropole', desc: 'Rozšiř sídlo na metropoli.' },
    { id: 'planet', icon: '🌍', name: 'Vládce planety', desc: 'Rozšiř sídlo na celou planetu.' },
    { id: 'galaxy', icon: '🌌', name: 'Galaktická říše', desc: 'Rozšiř sídlo na galaxii.' },
    { id: 'streak7', icon: '🌋', name: 'V ráži', desc: 'Vyhraj 7 her po sobě napříč hrami.' }
  ];

  /* ---------- Stav ---------- */
  const defaults = () => ({
    schema: 1, xp: 0, coins: 0,
    owned: { theme: ['neon'], bg: ['auto', 'none'], win: ['konfety'], city: ['klasik'], pieces: ['klasik'], car: ['cervene'], cards: ['recko', 'zvirata'] },
    active: { theme: 'neon', bg: 'auto', win: 'konfety', city: 'klasik', pieces: 'klasik', car: 'cervene', cards: 'recko' },
    upg: { undo: 0, shield: 0, magnet: 0, detector: 0, cap: 0, income: 0, boostPow: 0, boostLen: 0, discount: 0, winBonus: 0, streakCap: 0 },
    streak: 0, bestWin: 0,
    city: { b: {}, boost: {}, last: 0, frac: 0, earned: 0, stage: 0 },
    games: {}, prefs: {}, saves: {}, badges: {},
    daily: { date: '', quests: [] }, questsDone: 0, seenHelp: {},
    settings: { sound: true, vib: true, motion: 'auto', theme: 'system' }
  });
  H.validate = d => d && typeof d === 'object' && d.schema === 1 && typeof d.xp === 'number' && typeof d.coins === 'number';
  H.merge = d => {
    const base = defaults();
    for (const k in base) {
      if (d[k] == null) continue;
      if (typeof base[k] === 'object' && !Array.isArray(base[k])) {
        for (const kk in d[k]) base[k][kk] = d[k][kk];
      } else base[k] = d[k];
    }
    return base;
  };
  H.migrate = s => { if (!s.owned.cards.includes('recko')) { s.owned.cards.unshift('recko'); if (s.active.cards === 'zvirata') s.active.cards = 'recko'; } };
  H.load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (H.validate(d)) { H.S = H.merge(d); H.migrate(H.S); return; } }
    } catch (e) { console.warn('Načtení dat selhalo, začínám s čistým stavem.', e); }
    H.S = defaults();
  };
  H.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(H.S)); return true; }
    catch (e) { console.warn('Uložení selhalo', e); return false; }
  };
  H.reset = () => { H.S = defaults(); try { localStorage.removeItem(KEY); } catch (e) { /* nic */ } };
  H.gstat = id => H.S.games[id] || (H.S.games[id] = { xp: 0, played: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, byDiff: {}, best: {}, last: [] });
  H.pref = id => {
    const g = H.byId[id];
    const p = H.S.prefs[id] || (H.S.prefs[id] = { diff: 0, variant: false, mode: null, n: 0 });
    if (g.modes && !g.modes.some(m => m.id === p.mode)) p.mode = g.modes[0].id;
    if (!(p.diff >= 0 && p.diff <= 3)) p.diff = 0;
    return p;
  };
  H.skin = cat => H.SKINS[cat].items.find(i => i.id === H.S.active[cat]) || H.SKINS[cat].items[0];

  /* ---------- Levely ---------- */
  const lvl = (xp, base, step) => {
    let l = 1, need = base;
    while (xp >= need) { xp -= need; l++; need += step; }
    return { level: l, into: xp, need };
  };
  H.level = xp => lvl(xp, 100, 50);
  H.gameLevel = xp => lvl(xp, 60, 40);

  /* ---------- Denní výzvy ---------- */
  const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  H.ensureDaily = () => {
    const t = H.today();
    if (H.S.daily.date === t && H.S.daily.quests.length) return;
    const r = seeded(Number(t.replace(/-/g, '')));
    const ai = H.games.filter(g => g.vsAI), solo = H.games.filter(g => g.quest);
    const a = ai[Math.floor(r() * ai.length)], s = solo[Math.floor(r() * solo.length)];
    H.S.daily = { date: t, quests: [
      { type: 'play', n: 3, prog: 0, reward: 30, text: 'Odehraj 3 libovolné hry' },
      { type: 'win', game: a.id, n: 1 + Math.floor(r() * 2), prog: 0, reward: 50, text: '' },
      { type: 'score', game: s.id, n: s.quest.n, prog: 0, reward: 50, text: s.quest.text }
    ] };
    const q = H.S.daily.quests[1];
    q.text = (q.n === 1 ? 'Vyhraj hru ' : 'Vyhraj ' + q.n + '× hru ') + a.name;
    H.save();
  };

  /* ---------- Zvuk a vibrace ---------- */
  let ac = null;
  const TUNES = {
    tap: [[420, .04]], place: [[560, .06]], flip: [[700, .04]], bad: [[170, .14]],
    coin: [[990, .05], [1480, .09]], match: [[660, .07], [880, .1]],
    win: [[523, .1], [659, .1], [784, .1], [1047, .22]], lose: [[330, .14], [247, .16], [185, .26]],
    level: [[523, .08], [784, .08], [1047, .08], [1319, .08], [1568, .25]], boom: [[90, .3]]
  };
  H.sfx = name => {
    if (!H.S.settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      let t = ac.currentTime;
      for (const [f, d] of TUNES[name] || TUNES.tap) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = name === 'boom' || name === 'bad' ? 'sawtooth' : 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.16, t + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g).connect(ac.destination);
        o.start(t); o.stop(t + d + .02);
        t += d * .9;
      }
    } catch (e) { /* zvuk není dostupný */ }
  };
  H.buzz = ms => { if (H.S.settings.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* nic */ } } };

  /* ---------- Animace ---------- */
  H.motionOK = () => {
    const m = H.S.settings.motion;
    if (m === 'off') return false;
    if (m === 'on') return true;
    return !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  H.shake = el => { if (!H.motionOK() || !el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  H.confetti = kind => {
    if (!H.motionOK()) return;
    kind = kind || (H.S.active.win || 'konfety');
    const c = H.el('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.append(c);
    const W = c.width = innerWidth, Ht = c.height = innerHeight, x = c.getContext('2d');
    const cols = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#facc15'], gold = ['#fde047', '#fbbf24', '#f59e0b', '#fff7ae'];
    const R = Math.random, ps = [];
    const burst = (cx, cy, n, sp, pal, shape) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, s = sp * (.35 + R() * .65); ps.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s: 3 + R() * 4, c: H.pick(pal), r: R() * 6, vr: (R() - .5) * .4, g: .12, shape, life: 1, fade: .012 + R() * .01, t0: 0 }); } };
    let frames = 130;
    if (kind === 'hvezdy') { for (let i = 0; i < 70; i++) ps.push({ x: R() * W, y: -20 - R() * Ht * .6, vx: (R() - .5) * 1.5, vy: 4 + R() * 5, s: 5 + R() * 7, c: H.pick(gold), r: R() * 6, vr: (R() - .5) * .2, g: .03, shape: 'star', life: 1, fade: 0 }); frames = 150; }
    else if (kind === 'mince') { for (let i = 0; i < 80; i++) ps.push({ x: R() * W, y: -20 - R() * Ht * .8, vx: (R() - .5) * 1, vy: 5 + R() * 6, s: 6 + R() * 5, c: H.pick(gold), r: R() * 6, vr: .15 + R() * .2, g: .08, shape: 'coin', life: 1, fade: 0 }); frames = 150; }
    else if (kind === 'ohnostroj') { for (let k = 0; k < 6; k++) { const pal = [H.pick(cols), '#ffffff', H.pick(cols)]; const before = ps.length; burst(W * (.15 + R() * .7), Ht * (.15 + R() * .4), 42, 7, pal, 'dot'); for (let i = before; i < ps.length; i++) ps[i].t0 = k * 14; } frames = 190; }
    else if (kind === 'supernova') { burst(W / 2, Ht * .42, 150, 15, ['#ffffff', '#c7d2fe', '#f0abfc', '#fde68a', '#67e8f9'], 'star'); burst(W / 2, Ht * .42, 60, 6, ['#ffffff'], 'dot'); frames = 170; }
    else for (let i = 0; i < 110; i++) ps.push({ x: W / 2 + (R() - .5) * 80, y: Ht * .45, vx: (R() - .5) * 13, vy: -R() * 15 - 3, s: 5 + R() * 6, c: H.pick(cols), r: R() * 6, vr: (R() - .5) * .4, g: .42, shape: 'rect', life: 1, fade: 0, t0: 0 });
    const star = (r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .6283 - 1.571, q = i % 2 ? r * .45 : r; x.lineTo(Math.cos(a) * q, Math.sin(a) * q); } x.closePath(); x.fill(); };
    let f = 0;
    const step = () => {
      x.clearRect(0, 0, W, Ht);
      for (const p of ps) {
        if (p.t0 && f < p.t0) continue;
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .99; if (p.fade) { p.life -= p.fade; p.vy *= .985; }
        if (p.life <= 0) continue;
        x.save(); x.globalAlpha = Math.max(0, Math.min(1, p.life)); x.translate(p.x, p.y); x.fillStyle = p.c;
        if (p.shape === 'star') { x.rotate(p.r); star(p.s); }
        else if (p.shape === 'coin') { x.scale(Math.abs(Math.cos(p.r)) * .9 + .1, 1); x.beginPath(); x.arc(0, 0, p.s, 0, 6.29); x.fill(); x.fillStyle = '#a16207'; x.beginPath(); x.arc(0, 0, p.s * .45, 0, 6.29); x.fill(); }
        else if (p.shape === 'dot') { x.beginPath(); x.arc(0, 0, p.s * .55, 0, 6.29); x.fill(); }
        else { x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); }
        x.restore();
      }
      if (++f < frames) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
  };

  /* ---------- Gesta ---------- */
  H.swipe = (el, cb) => {
    let sx = 0, sy = 0, on = false;
    const down = e => { on = true; sx = e.clientX; sy = e.clientY; };
    const up = e => {
      if (!on) return; on = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) { cb('tap', e); return; }
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), e);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { on = false; });
  };
  H.keys = cb => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
    const h = e => { const d = map[e.key]; if (d && !document.querySelector('.modal')) { e.preventDefault(); cb(d); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  };
})();
