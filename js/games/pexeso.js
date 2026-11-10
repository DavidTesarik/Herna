'use strict';
/* Pexeso proti počítači s různě dobrou pamětí */
(function () {
  const { el } = H;
  H.register({
    id: 'pexeso', name: 'Pexeso', icon: '🃏', grad: ['#a21caf', '#be185d'], vsAI: true,
    desc: 'Najdi víc dvojic než počítač',
    variant: { name: 'Velké pole', desc: '36 karet místo 20. Delší partie, víc si toho musíš pamatovat.', level: 2 },
    help: 'Otoč dvě karty. Když jsou stejné, získáváš dvojici a hraješ znovu. Když ne, hraje počítač. Vyhrává, kdo má víc dvojic.',
    start(root, ctx) {
      const cols = ctx.variant ? 6 : 4, total = ctx.variant ? 36 : 20;
      const faces = Array.from(ctx.skin('cards').set).slice(0, total / 2);
      const deck = H.shuffle(faces.concat(faces));
      const state = deck.map(() => 0); // 0 rub, 1 otočená, 2 pryč
      const mem = new Map(), pMem = [0.25, 0.5, 0.8, 1][ctx.diff];
      let turn = ctx.aiFirst ? 2 : 1, open = [], lock = false, over = false, score = [0, 0, 0];
      const timers = [];
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const status = el('p', { class: 'g-status', role: 'status' });
      const sc = el('p', { class: 'g-score' });
      const board = el('div', { class: 'board px', style: `--n:${cols}` });
      const cards = deck.map((f, i) => el('button', { class: 'card', onclick: () => human(i) }, el('span', { class: 'cf', 'aria-hidden': 'true' }, f)));
      board.append(...cards);
      root.append(sc, status, board);
      const paint = () => {
        cards.forEach((c, i) => {
          c.className = 'card' + (state[i] === 1 ? ' up' : state[i] === 2 ? ' up gone' : '');
          c.disabled = over || lock || turn !== 1 || state[i] !== 0;
          c.setAttribute('aria-label', 'Karta ' + (i + 1) + ': ' + (state[i] ? deck[i] : 'zakrytá'));
        });
        sc.textContent = `Ty ${score[1]} : ${score[2]} Počítač`;
      };
      const say = t => { status.textContent = t; };
      const see = i => { if (Math.random() < pMem) mem.set(i, deck[i]); };
      const flip = i => { state[i] = 1; open.push(i); see(i); H.sfx('flip'); paint(); };
      const resolve = () => {
        const [a, b] = open; lock = true; paint();
        if (deck[a] === deck[b]) {
          later(() => {
            state[a] = state[b] = 2; mem.delete(a); mem.delete(b); score[turn]++; open = []; lock = false;
            H.sfx('match'); if (turn === 1) H.buzz(15);
            if (!state.includes(0)) {
              over = true; paint();
              const res = score[1] > score[2] ? 'win' : score[1] < score[2] ? 'loss' : 'draw';
              say(res === 'win' ? 'Vyhrál jsi!' : res === 'loss' ? 'Počítač vyhrál.' : 'Remíza.');
              return ctx.end({ result: res });
            }
            paint();
            if (turn === 2) aiTurn(); else say('Dvojice! Hraješ znovu.');
          }, 550);
        } else {
          later(() => {
            state[a] = state[b] = 0; open = []; lock = false; turn = 3 - turn; paint();
            if (turn === 2) aiTurn(); else say('Jsi na tahu.');
          }, 950);
        }
      };
      const human = i => { if (over || lock || turn !== 1 || state[i] !== 0) return; ctx.touch(); flip(i); if (open.length === 2) resolve(); };
      const aiTurn = () => {
        say('Hraje počítač…'); lock = true; paint();
        later(() => {
          const hidden = state.map((s, i) => s === 0 ? i : -1).filter(i => i >= 0);
          const known = hidden.filter(i => mem.has(i));
          let first = -1, second = -1;
          for (const i of known) { const j = known.find(k => k !== i && mem.get(k) === mem.get(i)); if (j != null) { first = i; second = j; break; } }
          if (first < 0) {
            const unknown = hidden.filter(i => !mem.has(i));
            first = H.pick(unknown.length ? unknown : hidden);
          }
          flip(first);
          later(() => {
            if (second < 0) {
              const m = hidden.find(k => k !== first && mem.get(k) === deck[first]);
              if (m != null) second = m;
              else { const rest = hidden.filter(k => k !== first); const unk = rest.filter(k => !mem.has(k)); second = H.pick(unk.length ? unk : rest); }
            }
            flip(second); resolve();
          }, 700);
        }, 700);
      };
      paint();
      if (turn === 2) aiTurn(); else say('Začínáš. Otoč dvě karty.');
      return { destroy() { timers.forEach(clearTimeout); over = true; } };
    }
  });
})();
