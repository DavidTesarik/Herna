'use strict';
/* Pexeso proti počítači: kreslené obrázky, pole od 20 do 80 karet */
(function () {
  const { el } = H;
  const SIZES = { s: [4, 20], m: [6, 36], l: [6, 48], xl: [8, 64], xxl: [8, 80], ultra: [8, 96] };
  H.register({
    id: 'pexeso', name: 'Pexeso', icon: '🃏', grad: ['#a21caf', '#be185d'], vsAI: true, pvp: true,
    desc: 'Najdi víc dvojic než počítač',
    modes: [{ id: 's', name: '20 karet' }, { id: 'm', name: '36 karet' }, { id: 'l', name: '48 karet' }, { id: 'xl', name: '64 karet' }, { id: 'xxl', name: '80 karet' }, { id: 'ultra', name: 'Ultra: 96 čínských znaků' }],
    help: 'Otoč dvě karty. Když jsou stejné, získáváš dvojici a hraješ znovu. Když ne, hraje počítač. Vyhrává, kdo má víc dvojic. Na velkých polích se některé motivy opakují v jiné barvě, takže pozor na barvu. Režim Ultra má 48 dvojic čínských znaků, které si jsou hodně podobné.',
    start(root, ctx) {
      const [cols, total] = SIZES[ctx.mode] || SIZES.s, skin = ctx.mode === 'ultra' ? { art: 'hanzi' } : ctx.skin('cards'), P = !!ctx.pvp;
      const ids = Array.from({ length: total / 2 }, (_, i) => i);
      const deck = H.shuffle(ids.concat(ids));
      const state = deck.map(() => 0); // 0 rub, 1 otočená, 2 pryč
      const mem = new Map(), pMem = [0.25, 0.5, 0.8, 1][ctx.diff];
      let turn = ctx.aiFirst ? 2 : 1, open = [], lock = false, over = false, score = [0, 0, 0];
      const timers = [];
      const later = (f, ms) => timers.push(setTimeout(f, ms));
      const status = el('p', { class: 'g-status', role: 'status' });
      const sc = el('p', { class: 'g-score' });
      const board = el('div', { class: 'board px' + (cols > 6 ? ' dense' : ''), style: `--n:${cols}` });
      const cards = deck.map((f, i) => el('button', { class: 'card', onclick: () => human(i) }, el('span', { class: 'cf', 'aria-hidden': 'true' })));
      board.append(...cards);
      root.append(sc, status, board);
      const paint = () => {
        cards.forEach((c, i) => {
          const up = state[i] > 0, face = c.firstChild;
          if (up && !face.firstChild) face.innerHTML = H.cardFace(skin, deck[i]);
          c.className = 'card' + (state[i] === 1 ? ' up' : state[i] === 2 ? ' up gone' : '');
          c.disabled = over || lock || (!P && turn !== 1) || state[i] !== 0;
          c.setAttribute('aria-label', 'Karta ' + (i + 1) + ': ' + (state[i] ? 'obrázek číslo ' + (deck[i] + 1) + (state[i] === 2 ? ', nalezená dvojice' : '') : 'zakrytá'));
        });
        sc.textContent = P ? `Hráč 1  ${score[1]} : ${score[2]}  Hráč 2` : `Ty ${score[1]} : ${score[2]} Počítač`;
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
              if (P) { const w = res === 'win' ? 1 : res === 'loss' ? 2 : 0; say(w ? `Vyhrál hráč ${w}!` : 'Remíza.'); return ctx.end({ result: 'pvp', winner: w }); }
              say(res === 'win' ? 'Vyhrál jsi!' : res === 'loss' ? 'Počítač vyhrál.' : 'Remíza.');
              return ctx.end({ result: res });
            }
            paint();
            if (P) say(`Dvojice! Hráč ${turn} hraje znovu.`); else if (turn === 2) aiTurn(); else say('Dvojice! Hraješ znovu.');
          }, 520);
        } else {
          later(() => {
            state[a] = state[b] = 0; open = []; lock = false; turn = 3 - turn; paint();
            if (P) say(`Na tahu je hráč ${turn}.`); else if (turn === 2) aiTurn(); else say('Jsi na tahu.');
          }, 950);
        }
      };
      const human = i => { if (over || lock || (!P && turn !== 1) || state[i] !== 0) return; ctx.touch(); flip(i); if (open.length === 2) resolve(); };
      const aiTurn = () => {
        say('Hraje počítač…'); lock = true; paint();
        later(() => {
          const hidden = state.map((s, i) => s === 0 ? i : -1).filter(i => i >= 0);
          const known = hidden.filter(i => mem.has(i));
          let first = -1, second = -1;
          for (const i of known) { const j = known.find(k => k !== i && mem.get(k) === mem.get(i)); if (j != null) { first = i; second = j; break; } }
          if (first < 0) { const unknown = hidden.filter(i => !mem.has(i)); first = H.pick(unknown.length ? unknown : hidden); }
          flip(first);
          later(() => {
            if (second < 0) {
              const m = hidden.find(k => k !== first && mem.get(k) === deck[first]);
              if (m != null) second = m;
              else { const rest = hidden.filter(k => k !== first); const unk = rest.filter(k => !mem.has(k)); second = H.pick(unk.length ? unk : rest); }
            }
            flip(second); resolve();
          }, 650);
        }, 650);
      };
      paint();
      if (P) say(`Začíná hráč ${turn}. Otoč dvě karty.`); else if (turn === 2) aiTurn(); else say('Začínáš. Otoč dvě karty.');
      return { destroy() { timers.forEach(clearTimeout); over = true; } };
    }
  });
})();
