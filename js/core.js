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

  /* ---------- Katalog skinů a vylepšení ---------- */
  H.SKINS = {
    theme: { name: 'Motiv appky', items: [
      { id: 'neon', name: 'Fialová', price: 0, sw: '#6d28d9' },
      { id: 'ocean', name: 'Oceán', price: 150, sw: '#1d4ed8' },
      { id: 'les', name: 'Les', price: 300, sw: '#047857' },
      { id: 'zapad', name: 'Západ slunce', price: 600, sw: '#be123c' },
      { id: 'zlato', name: 'Zlato', price: 1500, sw: '#92400e' }
    ] },
    pieces: { name: 'Kameny (piškvorky, čtyři v řadě)', items: [
      { id: 'klasik', name: 'Klasika', price: 0, a: '✕', b: '◯', ca: '#ef4444', cb: '#facc15' },
      { id: 'neon', name: 'Neon', price: 200, a: '✦', b: '◉', ca: '#22d3ee', cb: '#f472b6' },
      { id: 'zivly', name: 'Oheň a voda', price: 450, a: '🔥', b: '💧', ca: '#fb923c', cb: '#60a5fa' },
      { id: 'zver', name: 'Kočka a pes', price: 900, a: '🐱', b: '🐶', ca: '#a78bfa', cb: '#86efac' },
      { id: 'vesmir', name: 'Vesmír', price: 2000, a: '🚀', b: '👽', ca: '#93c5fd', cb: '#bef264' }
    ] },
    car: { name: 'Auto (závod)', items: [
      { id: 'cervene', name: 'Červené', price: 0, c: '#ef4444', s: '#ffffff' },
      { id: 'modre', name: 'Modré', price: 200, c: '#3b82f6', s: '#fde047' },
      { id: 'zelene', name: 'Zelené', price: 450, c: '#22c55e', s: '#052e16' },
      { id: 'cerne', name: 'Noční', price: 900, c: '#1f2937', s: '#22d3ee' },
      { id: 'zlate', name: 'Zlaté', price: 2500, c: '#f59e0b', s: '#7c2d12' }
    ] },
    cards: { name: 'Karty (pexeso)', items: [
      { id: 'zvirata', name: 'Zvířata', price: 0, set: '🐶🐱🦊🐻🐼🐸🐵🦁🐷🐮🐔🐙🦋🐢🐬🦄🐝🦉' },
      { id: 'jidlo', name: 'Jídlo', price: 250, set: '🍎🍌🍓🍉🍕🍔🍟🌮🍩🍪🍦🧀🥕🌽🍇🍒🥐🍫' },
      { id: 'sport', name: 'Sport a hry', price: 700, set: '⚽🏀🏈🎾🏐🎱🏓🥊⛳🎯🎲🎸🚲🏆🛹🎳🥇🪁' }
    ] }
  };
  H.UPGRADES = [
    { id: 'undo', name: 'Vrátit tah', icon: '↩️', desc: 'Počet vrácení tahu za hru (piškvorky, čtyři v řadě, 2048). Na obtížnosti Nemožná je vypnuté.', prices: [200, 600, 1500] },
    { id: 'shield', name: 'Štít', icon: '🛡️', desc: 'Závod: tolik nárazů auto vydrží bez zpomalení.', prices: [200, 600, 1500] },
    { id: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Závod: přitahuje mince ze sousedních pruhů (vyšší úroveň = větší dosah).', prices: [250, 700, 1600] },
    { id: 'detector', name: 'Detektor min', icon: '📡', desc: 'Miny: počet bezpečných nápověd za hru.', prices: [200, 600, 1500] },
    { id: 'cap', name: 'Městský sklad', icon: '🏬', desc: 'Jak dlouho město vydělává, když je appka zavřená: 8 → 12 → 16 → 24 hodin.', prices: [1000, 4000, 15000] }
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
    { id: 'earn100k', icon: '🏧', name: 'Zlatý důl', desc: 'Město ti vydělalo celkem 100 000 mincí.' }
  ];

  /* ---------- Stav ---------- */
  const defaults = () => ({
    schema: 1, xp: 0, coins: 0,
    owned: { theme: ['neon'], pieces: ['klasik'], car: ['cervene'], cards: ['zvirata'] },
    active: { theme: 'neon', pieces: 'klasik', car: 'cervene', cards: 'zvirata' },
    upg: { undo: 0, shield: 0, magnet: 0, detector: 0, cap: 0 },
    city: { b: {}, boost: {}, last: 0, frac: 0, earned: 0 },
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
  H.load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (H.validate(d)) { H.S = H.merge(d); return; } }
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
    return H.S.prefs[id] || (H.S.prefs[id] = { diff: 0, variant: false, mode: g.modes ? g.modes[0].id : null, n: 0 });
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
  H.confetti = () => {
    if (!H.motionOK()) return;
    const c = H.el('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.append(c);
    const W = c.width = innerWidth, Ht = c.height = innerHeight, x = c.getContext('2d');
    const cols = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#facc15'];
    const ps = Array.from({ length: 110 }, () => ({
      x: W / 2 + (Math.random() - .5) * 80, y: Ht * .45, vx: (Math.random() - .5) * 13, vy: -Math.random() * 15 - 3,
      s: 5 + Math.random() * 6, c: H.pick(cols), r: Math.random() * 6, vr: (Math.random() - .5) * .4
    }));
    let f = 0;
    const step = () => {
      x.clearRect(0, 0, W, Ht);
      for (const p of ps) {
        p.vy += .42; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .99;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
        x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); x.restore();
      }
      if (++f < 130) requestAnimationFrame(step); else c.remove();
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
