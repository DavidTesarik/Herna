'use strict';
/* Obrázky na karty pexesa kreslené kódem: antické Řecko a sportovní piktogramy. */
(function () {
  const S = (inner, bg, fg, extra) => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="48" height="48" rx="7" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" color="${fg}">${inner}</g>${extra || ''}</svg>`;
  const F = 'fill="currentColor" stroke="none"';
  const leaves = (cx, cy, r, a0, a1, n) => { let s = ''; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.6" ry="1.7" transform="rotate(${(a * 57.3 + 60).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" ${F}/>`; } return s; };
  const rays = n => { let s = ''; for (let i = 0; i < n; i++) { const a = i * 6.283 / n, l = i % 2 ? 15 : 19; s += `<path d="M${(24 + Math.cos(a) * 8).toFixed(1)} ${(24 + Math.sin(a) * 8).toFixed(1)}L${(24 + Math.cos(a) * l).toFixed(1)} ${(24 + Math.sin(a) * l).toFixed(1)}"/>`; } return s; };
  const letter = ch => `<text x="24" y="35" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="700" fill="currentColor" stroke="none">${ch}</text>`;
  const GREEK = [
    /* amfora */ `<path d="M19 8h10M20 8c0 4 1 5 1 7-5 3-7 8-7 13 0 6 4 10 7 12h6c3-2 7-6 7-12 0-5-2-10-7-13 0-2 1-3 1-7"/><path d="M20 12c-5 0-7 4-5 9M28 12c5 0 7 4 5 9M15 28h18"/>`,
    /* sloup */ `<path d="M12 9h24M14 9c0 4 4 4 4 0M34 9c0 4-4 4-4 0M17 13h14M18 13v24M24 13v24M30 13v24M15 37h18M12 41h24"/>`,
    /* chrám */ `<path d="M6 18L24 7l18 11zM9 18h30M12 21v15M20 21v15M28 21v15M36 21v15M8 36h32M6 40h36"/>`,
    /* helma */ `<path d="M14 38V22c0-8 5-12 11-12s10 5 10 12v16h-6v-9l-3-2-3 2v9z"/><path d="M19 22h5M28 22h3M25 10c0-4 6-6 12-3-4 1-5 3-5 6"/>`,
    /* lyra */ `<path d="M16 10c-5 8-4 20 4 26h8c8-6 9-18 4-26M15 14h18M20 14v22M24 14v22M28 14v22M19 36h10v4H19z"/>`,
    /* věnec */ leaves(24, 25, 14, 2.0, 5.3, 8) + leaves(24, 25, 14, 1.15, -2.15, 8) + `<path d="M21 40l3-3 3 3"/>`,
    /* trojzubec */ `<path d="M24 42V14M14 8v8c0 5 4 7 10 7s10-2 10-7V8M24 8v8M11 11l3-4 3 4M21 11l3-4 3 4M31 11l3-4 3 4M20 32h8"/>`,
    /* sova */ `<path d="M14 14c0-3 2-5 4-6l6 4 6-4c2 1 4 3 4 6v14c0 7-5 12-10 12s-10-5-10-12z"/><circle cx="19" cy="19" r="3.5"/><circle cx="29" cy="19" r="3.5"/><circle cx="19" cy="19" r="1" ${F}/><circle cx="29" cy="19" r="1" ${F}/><path d="M24 22l-1.5 3h3zM19 31c2 2 3 2 5 0 2 2 3 2 5 0"/>`,
    /* štít */ `<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="12"/><path d="M17 31l7-15 7 15"/>`,
    /* slunce */ `<circle cx="24" cy="24" r="5"/>` + rays(16),
    /* pochodeň */ `<path d="M19 22h10l-3 20h-4zM17 22h14M24 20c-6-3-5-8-1-13 0 4 5 4 5 9 0 2-2 4-4 4z"/>`,
    /* loď */ `<path d="M5 30h38c-2 6-7 9-13 9H16c-6 0-9-4-11-9zM24 30V7M24 9c8 2 11 8 11 15H24M12 30l-3-7M10 43c3-2 5-2 8 0s5 2 8 0 5-2 8 0 4 2 6 0"/>`,
    /* meandr */ `<path d="M6 42V6h36v36H14V14h20v20H22V22h6v6"/>`,
    /* ratolest */ `<path d="M10 40C18 32 28 20 38 8"/>` + [[16, 33], [21, 28], [26, 22], [31, 16]].map(([x, y]) => `<ellipse cx="${x - 5}" cy="${y - 1}" rx="4.6" ry="2" transform="rotate(20 ${x - 5} ${y - 1})" ${F}/><ellipse cx="${x + 3}" cy="${y + 4}" rx="4.6" ry="2" transform="rotate(75 ${x + 3} ${y + 4})" ${F}/>`).join('') + `<circle cx="36" cy="16" r="2.2" ${F}/>`,
    /* maska */ `<path d="M11 9h26v15c0 9-6 16-13 16s-13-7-13-16z"/><path d="M16 18c2-2 5-2 6 0M26 18c1-2 4-2 6 0M17 28c4 5 10 5 14 0-4 1-10 1-14 0z"/>`,
    /* váza kylix */ `<path d="M8 14h32c0 9-7 14-16 14S8 23 8 14zM24 28v9M16 40h16M8 16c-5-1-5 6 2 6M40 16c5-1 5 6-2 6"/>`,
    letter('Ω'), letter('Σ'), letter('Φ'), letter('Ψ'), letter('Δ'), letter('Π'), letter('Λ'), letter('Θ')
  ];
  const GCOL = [['#e2703a', '#1c1917'], ['#1e40af', '#ffffff'], ['#171717', '#facc15'], ['#fef3c7', '#3f6212'], ['#7f1d1d', '#fde68a']];
  const fig = (head, lines, extra) => `<circle cx="${head[0]}" cy="${head[1]}" r="4" ${F}/><g stroke-width="4.2">` + lines.map(l => `<path d="M${l[0]} ${l[1]}` + l.slice(2).reduce((s, v, i) => s + (i % 2 ? ' ' + v : 'L' + v), '') + '"/>').join('') + '</g>' + (extra || '');
  const SPORT = [
    /* běh */ fig([30, 9], [[28, 15, 22, 27], [27, 17, 34, 22, 38, 18], [27, 17, 19, 18, 15, 23], [22, 27, 30, 33, 27, 42], [22, 27, 14, 31, 8, 29]]),
    /* vzpírání */ fig([24, 14], [[24, 20, 24, 31], [24, 21, 15, 15, 15, 8], [24, 21, 33, 15, 33, 8], [24, 31, 17, 37, 17, 44], [24, 31, 31, 37, 31, 44]], `<path d="M7 8h34" stroke-width="2.6"/><circle cx="7" cy="8" r="3.4" ${F}/><circle cx="41" cy="8" r="3.4" ${F}/>`),
    /* fotbal */ fig([20, 9], [[20, 15, 22, 28], [21, 17, 12, 22], [21, 17, 29, 22], [22, 28, 18, 36, 14, 43], [22, 28, 30, 32, 36, 29]], `<circle cx="41" cy="32" r="3.6"/>`),
    /* basketbal */ fig([20, 14], [[20, 20, 20, 31], [20, 21, 28, 15, 31, 9], [20, 21, 13, 26], [20, 31, 15, 38, 15, 44], [20, 31, 25, 38, 27, 44]], `<circle cx="34" cy="6" r="3.8"/><path d="M38 14h8M40 14l1 6h4l1-6" stroke-width="1.8"/>`),
    /* tenis */ fig([17, 10], [[17, 16, 19, 29], [18, 18, 27, 17, 32, 12], [18, 18, 10, 23], [19, 29, 13, 36, 11, 44], [19, 29, 26, 36, 28, 44]], `<ellipse cx="37" cy="8" rx="4.5" ry="5.5" transform="rotate(35 37 8)"/><circle cx="42" cy="24" r="2" ${F}/>`),
    /* plavání */ fig([35, 22], [[30, 25, 14, 28], [30, 25, 38, 17, 43, 19], [14, 28, 6, 25], [14, 28, 6, 31]], `<path d="M4 38q5-4 10 0t10 0 10 0 10 0M4 44q5-4 10 0t10 0 10 0 10 0" stroke-width="2.2"/>`),
    /* cyklistika */ fig([32, 9], [[22, 22, 29, 14], [29, 15, 36, 22], [22, 22, 28, 29, 24, 36]], `<circle cx="11" cy="36" r="7.5" stroke-width="2.4"/><circle cx="37" cy="36" r="7.5" stroke-width="2.4"/><path d="M11 36l10-12h13l3 12M21 24l5 12" stroke-width="2"/>`),
    /* lyžování */ fig([30, 9], [[28, 15, 22, 26], [27, 17, 35, 21], [22, 26, 29, 31, 24, 39]], `<path d="M10 44l32-8M35 21l5 13" stroke-width="2.4"/>`),
    /* golf */ fig([21, 10], [[21, 16, 21, 29], [21, 18, 29, 15, 34, 9], [21, 29, 16, 37, 15, 44], [21, 29, 26, 37, 28, 44]], `<path d="M34 9l7-5M41 4l2 2" stroke-width="2.4"/><circle cx="39" cy="42" r="2.2" ${F}/><path d="M39 44v2" stroke-width="1.6"/>`),
    /* box */ fig([19, 10], [[19, 16, 20, 29], [19, 18, 28, 17, 34, 15], [19, 18, 24, 23, 28, 20], [20, 29, 14, 36, 12, 44], [20, 29, 26, 36, 29, 44]], `<circle cx="37" cy="15" r="3.6" ${F}/><circle cx="30" cy="20" r="3" ${F}/>`),
    /* gymnastika */ fig([24, 35], [[24, 30, 24, 17], [24, 30, 18, 39, 16, 44], [24, 30, 30, 39, 32, 44], [24, 17, 17, 10, 12, 6], [24, 17, 31, 10, 36, 6]], `<path d="M6 46h36" stroke-width="2"/>`),
    /* potápění */ fig([35, 31], [[32, 28, 18, 17], [32, 28, 39, 37, 42, 42], [18, 17, 10, 11], [18, 17, 9, 17]], `<path d="M10 11l-5-1 2 5zM9 17l-5 2 4 3z" ${F}/><circle cx="40" cy="20" r="1.8"/><circle cx="43" cy="13" r="1.3"/><circle cx="38" cy="9" r="1"/>`),
    /* veslování */ fig([21, 15], [[21, 21, 19, 31], [21, 23, 31, 26], [19, 31, 30, 33]], `<path d="M4 37h40c-2 4-6 6-10 6H14c-4 0-8-2-10-6zM31 26l11 14" stroke-width="2.4"/>`),
    /* lukostřelba */ fig([18, 11], [[18, 17, 18, 30], [18, 19, 30, 19], [18, 19, 11, 21, 16, 22], [18, 30, 13, 37, 12, 44], [18, 30, 23, 37, 25, 44]], `<path d="M32 7c7 7 7 17 0 24M32 7v24M16 19h26" stroke-width="2"/>`)
  ];
  const SCOL = [['#1d4ed8', '#ffffff'], ['#b91c1c', '#ffffff'], ['#facc15', '#111827'], ['#047857', '#ffffff'], ['#18181b', '#f4f4f5']];
  const HANZI = Array.from('人入八大太天夫犬木本未末土士王玉主住日白百目自月用田由甲申电石右左友有在水永冰小少山出生牛午干千手毛');
  const TINT = ['#f8fafc', '#dbeafe', '#fef3c7', '#fce7f3', '#dcfce7'];
  /* vrátí funkci: číslo dvojice → HTML obrázku; nejdřív různé motivy, pak další barevné varianty */
  H.cardFace = (skin, i) => {
    if (skin.art === 'hanzi') return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="48" height="48" rx="7" fill="#fafaf9"/><text x="24" y="36" text-anchor="middle" font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="33" fill="#b91c1c">${HANZI[i % HANZI.length]}</text></svg>`;
    if (skin.art === 'recko') { const c = GCOL[Math.floor(i / GREEK.length) % GCOL.length]; return S(GREEK[i % GREEK.length], c[0], c[1]); }
    if (skin.art === 'sport') { const c = SCOL[Math.floor(i / SPORT.length) % SCOL.length]; return S(SPORT[i % SPORT.length], c[0], c[1]); }
    const set = Array.from(skin.set), t = TINT[Math.floor(i / set.length) % TINT.length];
    return `<span class="emo" style="background:${t}">${set[i % set.length]}</span>`;
  };
  H.cardName = (skin, i) => 'obrázek ' + (i + 1);
})();
