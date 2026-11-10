'use strict';
/* Slovo: hádání pětipísmenného českého slova bez diakritiky */
(function () {
  const { el } = H;
  const WORDS = 'ALTAN ANDEL ASPON BANAN BANKA BARVA BATOH BAZEN BEHEM BERAN BEZET BLESK BRADA BRATR BRONZ BROUK BRYLE BUNDA CASTO CEKAT CERNY CESTA CHLEB CHLEV CHTIT CHUDY CISLO CISTY DABEL DAVAT DCERA DELAT DIVNY DOBRE DOBRY DOKUD DOLAR DOLNI DOPIS DOSUD DRAHY DREVO DRUHY DRZET DUVOD DVERE FIRMA GARAZ GULAS HASIC HASIT HAZET HEREC HEZKY HLAVA HLINA HNEDY HODNE HODNY HOKEJ HOLKA HOLUB HORET HORKY HORNI HOTEL HOUBA HRNEC HRNEK HUDBA IHNED JASNY JATRA JAZYK JELEN JENOM JESTE JINAK JISTE KABAT KABEL KAMEN KANEC KAPSA KARTY KDYBY KLIKA KNIHA KOALA KOCKA KOLAC KOLEM KOMAR KOMIN KONEC KONEV KOPAT KOPEC KOVAR KRAVA KRIDA KROME KRYSA LABUT LAMPA LASKA LATKA LEHKY LEKAR LETAT LETET LEVNY LEZET LISKA LOKET LOUKA LOVEC LOVIT LZICE MALIR MASLO MATKA MEKKY MERIT MESIC MESTO METRO MINCE MLADI MLADY MLEKO MOBIL MODRY MOKRY MOTOR MOTYL MOUKA MOZEK MOZNA MRKEV MRTVY MUSET MYCKA MYDLO NAFTA NAJIT NAKUP NEBOT NEHET NEMOC NIKDE NIKDY NIZKY NOSIT OBCAS OBLAK OBRAZ OKOLO OKRAJ OKRUH OPICE OSOBA OSTRY PADAT PALAC PALKA PANDA PANEV PAPIR PAREK PASEK PEKAR PESEC PILNY PILOT PISEK PISEN PISMO PIZZA PLAST PLICE PLOUT POCET POCIT PODLE POHAR POKOJ POMOC POPEL POSTA POTOK POTOM POUZE PRACE PRASE PRAVE PRAVO PRAVY PRECE PRINC PROTI PROTO PROUD PRSET PRVNI PUMPA PYSNY RADIT RAJCE RETEZ RIDIC RIDIT RIKAT RIZEK ROVNE RUKAV RYBAR RYTIR SACHY SALAM SALAT SANKY SAZET SCHOD SEDET SESIT SILNY SKALA SKLAD SKLEP SKOLA SKORO SLABY SLANY SLEVA SLOVO SMELY SMICH SMYSL SOKOL SOPKA SOTVA SPOLU SRDCE SRNEC SROUB STALE STARI START STARY STENA STIKA STRED STROM STROP SUCHY SUKNE SUMEC SUNKA SVETR SVICE TAHAT TAKTO TALIR TANEC TASKA TEMNY TENIS TENKY TEPLO TEPLY TEZKY TICHO TICHY TOTIZ TRAVA TRETI TRHAT TRIDA TRIKO TULEN TUNEL TUZKA TVRDY TYDEN UDOLI ULICE UNAVA UPLNE VALKA VARIT VAZIT VAZNY VCELA VCERA VEDET VEJCE VELKY VELMI VENKU VERIT VERNY VISNE VLASY VLEVO VODIT VOJAK VOLAT VOZIT VRANA VRTAK VSTAT VSUDE VYHRA ZADNI ZAJIC ZAKON ZALIT ZAMEK ZAPAS ZARIT ZAVOD ZBOZI ZCELA ZEBRA ZELVA ZIDLE ZITRA ZIVOT ZLATO ZLATY ZLUTY ZNAMY ZNOVU ZUBAR'.split(' ');
  const TRIES = [7, 6, 5, 4], XP = [40, 60, 90, 130];
  const ROWS = ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'];
  const score = (guess, word) => {
    const res = Array(5).fill('n'), left = {};
    for (let i = 0; i < 5; i++) { if (guess[i] === word[i]) res[i] = 'y'; else left[word[i]] = (left[word[i]] || 0) + 1; }
    for (let i = 0; i < 5; i++) if (res[i] !== 'y' && left[guess[i]]) { res[i] = 'p'; left[guess[i]]--; }
    return res;
  };
  const LAB = { y: 'správně', p: 'jinde ve slově', n: 've slově není' };
  H.register({
    id: 'slovo', name: 'Slovo', icon: '🔤', grad: ['#4d7c0f', '#3f6212'], saveable: true, winLose: true, bestFmt: 'tries',
    desc: 'Uhodni slovo z pěti písmen',
    diffNames: ['7 pokusů', '6 pokusů', '5 pokusů', '4 pokusy'],
    variant: { name: 'Přísný režim', desc: 'Odhalená písmena musíš v dalších pokusech použít. Za výhru je o polovinu víc odměn.', level: 2 },
    quest: { n: 1, text: 'Uhodni slovo ve hře Slovo', kind: 'win' },
    help: 'Hádej české slovo z pěti písmen, píše se bez háčků a čárek (KOCKA). Po každém pokusu se písmena obarví: zelené s ✓ je na správném místě, žluté s ↔ ve slově je, ale jinde, šedé ve slově není.',
    start(root, ctx) {
      const max = TRIES[ctx.diff];
      let st = ctx.saved || { word: H.pick(WORDS), rows: [], cur: '' };
      let over = false;
      const status = el('p', { class: 'g-status', role: 'status' });
      const grid = el('div', { class: 'wgrid', role: 'group', 'aria-label': 'Pokusy' });
      const kb = el('div', { class: 'wkb' });
      const keys = {};
      ROWS.forEach((row, r) => {
        const line = el('div', { class: 'wrow' });
        if (r === 2) line.append(el('button', { class: 'wkey wide', 'aria-label': 'Smazat písmeno', text: '⌫', onclick: () => type('<') }));
        for (const ch of row) { keys[ch] = el('button', { class: 'wkey', text: ch, onclick: () => type(ch) }); line.append(keys[ch]); }
        if (r === 2) line.append(el('button', { class: 'wkey wide ok', 'aria-label': 'Potvrdit slovo', text: 'OK', onclick: () => type('>') }));
        kb.append(line);
      });
      root.append(status, grid, kb);
      const MARK = { y: '✓', p: '↔', n: '' };
      const paint = () => {
        grid.textContent = '';
        const best = {};
        for (let r = 0; r < max; r++) {
          const g = st.rows[r], res = g ? score(g, st.word) : null, txt = g || (r === st.rows.length ? st.cur : '');
          const line = el('div', { class: 'wline' + (r === st.rows.length && !over ? ' active' : '') });
          for (let i = 0; i < 5; i++) {
            const ch = txt[i] || '';
            line.append(el('span', { class: 'wt' + (res ? ' ' + res[i] : ch ? ' typed' : ''), role: 'img', 'aria-label': ch ? ch + (res ? ', ' + LAB[res[i]] : '') : 'prázdné' }, ch, res && MARK[res[i]] ? el('sup', { text: MARK[res[i]] }) : null));
            if (res) { const o = best[ch]; if (res[i] === 'y' || (res[i] === 'p' && o !== 'y') || !o) best[ch] = res[i]; }
          }
          grid.append(line);
        }
        for (const ch in keys) { keys[ch].className = 'wkey' + (best[ch] ? ' ' + best[ch] : ''); keys[ch].setAttribute('aria-label', ch + (best[ch] ? ', ' + LAB[best[ch]] : '')); keys[ch].disabled = over; }
      };
      const strictFail = g => {
        for (const prev of st.rows) {
          const res = score(prev, st.word);
          for (let i = 0; i < 5; i++) {
            if (res[i] === 'y' && g[i] !== prev[i]) return `${i + 1}. písmeno musí být ${prev[i]}.`;
            if (res[i] === 'p' && !g.includes(prev[i])) return `Slovo musí obsahovat ${prev[i]}.`;
          }
        }
        return '';
      };
      function type(k) {
        if (over) return;
        if (k === '<') st.cur = st.cur.slice(0, -1);
        else if (k === '>') {
          if (st.cur.length < 5) { status.textContent = 'Slovo musí mít pět písmen.'; H.sfx('bad'); H.shake(grid); return; }
          const fail = ctx.variant ? strictFail(st.cur) : '';
          if (fail) { status.textContent = fail; H.sfx('bad'); H.shake(grid); return; }
          st.rows.push(st.cur); st.cur = '';
          const g = st.rows[st.rows.length - 1], n = st.rows.length;
          if (g === st.word) { over = true; paint(); status.textContent = 'Správně!'; return ctx.end({ result: 'win', xp: XP[ctx.diff] + (max - n) * 10, score: n, lower: true, flags: { slovo2: n <= 2 } }); }
          if (n >= max) { over = true; paint(); status.textContent = 'Hledané slovo bylo ' + st.word + '.'; return ctx.end({ result: 'loss', xp: 8 }); }
          H.sfx('place'); status.textContent = `Zbývá pokusů: ${max - n}`;
        } else if (st.cur.length < 5) { st.cur += k; H.sfx('tap'); }
        ctx.save(st); paint();
      }
      const key = e => {
        if (document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Backspace') type('<');
        else if (e.key === 'Enter') { e.preventDefault(); type('>'); }
        else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toUpperCase());
      };
      window.addEventListener('keydown', key);
      paint();
      status.textContent = st.rows.length ? `Pokračuješ. Zbývá pokusů: ${max - st.rows.length}` : 'Napiš první slovo a potvrď OK.';
      return { destroy() { window.removeEventListener('keydown', key); over = true; } };
    }
  });
})();
