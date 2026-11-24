'use strict';
/* Herna — Učebnice: postupy, triky a strategie k dovednostním hrám.
   H.BOOKS = obsah, H.openBook(id, kapitola) = čtečka přes celou obrazovku, H.renderLibrary(main) = záložka Učebnice. */
(function () {
  const { el } = H;
  const LEVELS = ['Základy', 'Pokročilé', 'Mistrovské'];
  const KEY = 'herna:ucebnice';

  /* ---------- Obsah ----------
     Bloky: {p}, {tip}, {list}, {steps}, {diagram:{kind:'sudoku'|'miny'|'board', ...}}. **tučně** v textu.
     sudoku: rows (řetězce, '.' = prázdné), size 9|16, r0 (první řádek kvůli tlustým čarám), mark [[r,c,'a'|'ok'|'no'|'soft']], cand [[r,c,'kandidáti','zvýrazněné','škrtnuté']]
     miny: rows ('#' zakryté, '_' prázdné otevřené, 1–8 číslo, F vlajka, S jistě bezpečné, M jistě mina), walls ['top','right','bottom','left'], mines (celkem min, jen s okraji ze všech stran)
     board: rows (řetězce nebo pole), look 'grid'|'dama'|'c4'|'sea'|'t48', coords 'dama'|'c4'; kameny X O a A b B # ~ h k s + */
  const B = H.BOOKS = {};

  B.sudoku = {
    intro: 'Od prvního skenování po X-Wing: techniky seřazené tak, jak je potřebuješ na vyšších obtížnostech.',
    chapters: [
      { id: 'skenovani', level: 'Základy', title: 'Skenování a skrytá jednička', blocks: [
        { p: 'Každý řádek, sloupec i čtverec musí obsahovat každou číslici právě jednou. Skoro celé luštění stojí na jediné otázce: kam ještě může tahle číslice přijít?' },
        { p: 'Co která obtížnost v Herně vyžaduje:' },
        { list: ['**Lehké** – stačí jedničky (nahá a skrytá).', '**Střední** – navíc zamčení kandidáti a dvojice.', '**Těžké** – navíc trojice a X-Wing.', '**Ďábelské** – i to, co je nad tím: Swordfish, XY-Wing a další řetězce.'] },
        { p: '**Skenování** (křížové vyškrtávání): vyber číslici, třeba 5, a najdi v mřížce všechny pětky. Každá pětka zakáže svůj řádek, sloupec i čtverec. Pak hledej čtverec, kde pro pětku zbylo jediné volné políčko. To je **skrytá jednička**: políčko by snad uneslo i jiná čísla, ale pětka nemá kam jinam.' },
        { diagram: { kind: 'sudoku', rows: ['.5....2..', '7...5....', '..1...358'], mark: [[0, 1, 'a'], [1, 4, 'a'], [0, 7, 'soft'], [0, 8, 'soft'], [1, 6, 'soft'], [1, 7, 'soft'], [1, 8, 'soft'], [2, 7, 'ok']],
          caption: 'Pětky v 1. a 2. řádku vylučují tyto řádky v pravém čtverci. Ve 3. řádku jsou dvě políčka čtverce obsazená, takže pětka patří do zeleného.' } },
        { steps: ['Vezmi číslici, které je v mřížce nejvíc – zbývá jí nejméně volných míst.', 'Projdi čtverce jeden po druhém a hledej ten, kde pro ni zbylo jediné místo.', 'Totéž zkus pro řádky a sloupce: kam v tomhle řádku může přijít sedmička?', 'Po každém zapsaném čísle se podívej kolem něj. Nová číslice často hned odemkne další.'] },
        { tip: 'Skenuj po pásech: tři čtverce vedle sebe sdílejí tytéž tři řádky. Když je číslice ve dvou čtvercích pásu, třetí čtverec pro ni má jen jeden řádek.' }
      ] },
      { id: 'naha', level: 'Základy', title: 'Nahá jednička a poznámky', blocks: [
        { p: '**Nahá jednička** je opačný pohled: místo číslice si vybereš políčko a zjistíš, která čísla do něj nesmějí. Projdi jeho řádek, sloupec a čtverec. Když zbude jediná možnost, je to ona.' },
        { diagram: { kind: 'sudoku', rows: ['....4....', '....5....', '.........', '...7.....', '12..9..3.', '.....8...', '.........', '....6....', '.........'],
          mark: [[4, 4, 'ok'], [4, 0, 'a'], [4, 1, 'a'], [4, 7, 'a'], [0, 4, 'a'], [1, 4, 'a'], [7, 4, 'a'], [3, 3, 'a'], [5, 5, 'a']],
          caption: 'Řádek už obsahuje 1, 2 a 3, sloupec 4, 5 a 6, čtverec 7 a 8. Pro zelené políčko zbývá jen devítka.' } },
        { p: 'Na Lehké obtížnosti dojdeš do konce jen se skenováním a nahými jedničkami. Od Střední se vyplatí psát **poznámky** – malá čísla, která říkají, co do políčka ještě může přijít (takzvané kandidáty).' },
        { steps: ['Nejdřív vyplň všechno, co je vidět bez poznámek.', 'Zapni Poznámky a do každého prázdného políčka zapiš všechny možné číslice. Postupuj po čtvercích, ať na nic nezapomeneš.', 'Po každém zapsaném čísle ho škrtni z poznámek v jeho řádku, sloupci a čtverci. Po správném zápisu to Herna udělá za tebe.', 'Hledej políčko s jedinou poznámkou (nahá jednička) a číslici, která je v řádku, sloupci či čtverci v poznámkách jen jednou (skrytá jednička).'] },
        { tip: 'Poznámky piš celé, nebo vůbec. Neúplné poznámky klamou: políčko se dvěma tipy vypadá jako dvojice, i když tam patří třetí číslo, které jsi nezapsal.' }
      ] },
      { id: 'zamceni', level: 'Pokročilé', title: 'Zamčení kandidáti', blocks: [
        { p: 'Když se kandidát uvnitř jednoho čtverce drží jen v jednom řádku (nebo sloupci), ten řádek si ho zamkl. Číslice v něm bude určitě právě v tomhle čtverci, takže ji ve zbytku řádku mimo čtverec můžeš škrtnout. Tomu se říká **ukazování**.' },
        { diagram: { kind: 'sudoku', rows: ['1.3......', '.8.......', '5.7......', '.........', '.........', '.4.......', '.........', '.........', '.........'],
          cand: [[1, 0, '4', '4'], [1, 2, '4', '4'], [1, 4, '4', '', '4'], [1, 6, '4', '', '4'], [1, 7, '4', '', '4']], mark: [[5, 1, 'a'], [0, 1, 'soft'], [2, 1, 'soft']],
          caption: 'Ve čtverci vlevo nahoře může být čtyřka jen ve 2. řádku – ve 2. sloupci ji vylučuje čtyřka dole. Proto ve 2. řádku mimo tento čtverec čtyřka být nemůže.' } },
        { p: 'Obrácený případ je **vymezení**: když se kandidát v řádku drží jen uvnitř jednoho čtverce, musí v tom čtverci ležet právě v tomhle řádku. Ze zbytku čtverce ho škrtni.' },
        { diagram: { kind: 'sudoku', rows: ['.........', '.........', '....6....', '.........', '.......6.', '.........', '.........', '.7.1.23.9', '.........'],
          cand: [[7, 0, '6', '6'], [7, 2, '6', '6'], [6, 1, '6', '', '6'], [8, 0, '6', '', '6'], [8, 2, '6', '', '6']], mark: [[2, 4, 'a'], [4, 7, 'a'], [7, 4, 'soft'], [7, 7, 'soft']],
          caption: 'V 8. řádku může být šestka jen vlevo, protože sloupce 5 a 8 už šestku mají. Šestka čtverce vlevo dole tedy leží v 8. řádku a ostatní políčka čtverce ji ztrácejí.' } },
        { tip: 'Zamčení kandidáti jsou nejčastější technika Střední obtížnosti. Když se zasekneš, projdi čtverec po čtverci a u každé číslice se ptej: leží všichni její kandidáti v jedné lince?' }
      ] },
      { id: 'dvojice', level: 'Pokročilé', title: 'Nahé a skryté dvojice', blocks: [
        { p: '**Nahá dvojice**: dvě políčka v jednom řádku, sloupci nebo čtverci mají v poznámkách stejné dva kandidáty a nic jiného. Ty dvě číslice si mezi sebou rozdělí právě tato dvě políčka, takže je všude jinde v té jednotce můžeš škrtnout.' },
        { diagram: { kind: 'sudoku', rows: ['1.4.5.6.8'], cand: [[0, 1, '27', '27'], [0, 5, '27', '27'], [0, 3, '237', '', '27'], [0, 7, '279', '', '27']], mark: [[0, 1, 'a'], [0, 5, 'a']],
          caption: 'Modrá políčka mají jen 2 a 7. Z ostatních políček řádku dvojku i sedmičku škrtni – a hned vzniknou dvě nahé jedničky, 3 a 9.' } },
        { p: '**Skrytá dvojice**: dvě číslice se v jednotce vyskytují jen ve dvou stejných políčkách. Ta políčka mohou mít v poznámkách i další čísla, ale ta jsou zbytečná – patří tam právě ty dvě číslice.' },
        { diagram: { kind: 'sudoku', r0: 4, rows: ['.2.8.7.3.'], cand: [[0, 0, '1469', '16', '49'], [0, 2, '459'], [0, 4, '459'], [0, 6, '1569', '16', '59'], [0, 8, '45']], mark: [[0, 0, 'a'], [0, 6, 'a']],
          caption: 'Jednička a šestka jsou v tomhle řádku jen v modrých políčkách. Ostatní kandidáty z nich škrtni.' } },
        { tip: 'Nahou dvojici najdeš očima, skrytou počítáním: u každé číslice si v jednotce řekni, kolikrát se v poznámkách objevuje. Dvě číslice, které jsou tam dvakrát a ve stejných políčkách, tvoří dvojici.' }
      ] },
      { id: 's16', level: 'Pokročilé', title: 'Velké sudoku 16×16', blocks: [
        { p: 'Ve velkém sudoku je šestnáct symbolů: číslice 0–9 a písmena A–F. Každý řádek, sloupec a čtverec 4×4 musí obsahovat každý symbol právě jednou. Pravidla i techniky jsou stejné, jen je všeho víc.' },
        { diagram: { kind: 'sudoku', size: 16, rows: ['.A..5...........', '......A....C....', '..0......A......', '8...........3FA7'], mark: [[0, 1, 'a'], [1, 6, 'a'], [2, 9, 'a'], [3, 14, 'ok']],
          caption: 'Symbol A je v prvních třech řádcích pásu, takže v pravém čtverci mu zbývá jen 4. řádek. Tam jsou tři políčka obsazená a A patří do zeleného.' } },
        { list: ['**Skenuj po symbolech, ne po políčkách.** Šestnáct možností v jednom políčku se z hlavy počítá špatně, kdežto jeden symbol v pásu čtyř čtverců najdeš rychle.', '**Pás má čtyři čtverce.** Když je symbol ve třech z nich, čtvrtý čtverec pro něj má jediný řádek – přesně jako na obrázku.', '**Poznámky piš až později.** Nejdřív vyplň všechny skryté jedničky, které jdou vidět; poznámek by na začátku bylo příliš mnoho.', '**Rozděl si symboly na dvě poloviny**, 0–7 a 8–F. Při kontrole řádku počítej každou polovinu zvlášť, je to rychlejší a spolehlivější.', '**Zamčení kandidáti a dvojice** fungují úplně stejně jako v malé mřížce. Hledej je, jakmile se poznámky začnou zužovat.'] },
        { tip: 'Pracuj po pásech: dotáhni jeden pás čtyř čtverců, co nejdál to jde, a teprve pak přejdi k dalšímu. Ve velké mřížce se jinak snadno ztratíš.' }
      ] },
      { id: 'trojice', level: 'Mistrovské', title: 'Nahé a skryté trojice', blocks: [
        { p: '**Nahá trojice** jsou tři políčka jedné jednotky, jejichž poznámky dohromady obsahují jen tři číslice. Každé políčko nemusí mít všechny tři – stačí kombinace jako {3, 5}, {5, 8} a {3, 8}. Ty tři číslice pak z ostatních políček jednotky zmizí.' },
        { diagram: { kind: 'sudoku', r0: 8, rows: ['..2.4..79'], cand: [[0, 0, '35', '35'], [0, 3, '58', '58'], [0, 6, '38', '38'], [0, 1, '136', '', '3'], [0, 5, '1568', '', '58']], mark: [[0, 0, 'a'], [0, 3, 'a'], [0, 6, 'a']],
          caption: 'Modrá políčka obsahují dohromady jen 3, 5 a 8. Z ostatních políček řádku tyto číslice škrtni – zbydou dvě políčka s jedničkou a šestkou.' } },
        { p: '**Skrytá trojice**: tři číslice, které se v jednotce vyskytují jen ve třech políčkách a nikde jinde. Z těch tří políček můžeš škrtnout všechny ostatní kandidáty. Hledá se hůř, protože ji zakrývají další poznámky.' },
        { p: 'Nahá a skrytá skupina jsou dvě strany jedné mince. Když má jednotka šest prázdných políček a čtyři z nich tvoří nahou čtveřici, zbylá dvě tvoří skrytou dvojici. Vždycky hledej tu menší skupinu.' },
        { tip: 'Trojice potřebuješ od Těžké obtížnosti. Nejčastěji se schovávají v jednotkách, kde zbývá pět až sedm prázdných políček.' }
      ] },
      { id: 'xwing', level: 'Mistrovské', title: 'X-Wing a Swordfish', blocks: [
        { p: '**X-Wing** pracuje s jedinou číslicí. Když se kandidát ve dvou řádcích vyskytuje přesně ve dvou stejných sloupcích, tvoří ta čtyři políčka obdélník. Číslice bude buď v rozích jedné úhlopříčky, nebo druhé. V obou případech obsadí oba sloupce, takže ji z ostatních políček těch sloupců škrtneš.' },
        { diagram: { kind: 'sudoku', rows: ['.........', '18.347.29', '.........', '.........', '.........', '42.916.73', '.........', '.........', '.........'],
          cand: [[1, 2, '5', '5'], [1, 6, '5', '5'], [5, 2, '5', '5'], [5, 6, '5', '5'], [3, 2, '5', '', '5'], [7, 2, '5', '', '5'], [2, 6, '5', '', '5'], [8, 6, '5', '', '5']],
          caption: 'Pětka může být ve 2. a 6. řádku jen ve sloupcích 3 a 7. Ve zbytku těchto sloupců ji proto škrtni (červeně).' } },
        { p: 'Platí to i obráceně: dva sloupce, ve kterých kandidát leží ve stejných dvou řádcích, ho vymažou ze zbytku těch řádků.' },
        { p: '**Swordfish** je X-Wing pro tři řádky. Když se kandidát ve třech řádcích drží jen ve třech sloupcích (v každém řádku ve dvou nebo třech z nich), obsadí v těch sloupcích všechna tři místa a ze zbytku sloupců zmizí.' },
        { diagram: { kind: 'sudoku', rows: ['3.419.286', '.........', '.........', '.........', '8.623459.', '.........', '.........', '.........', '16948.32.'],
          cand: [[0, 1, '7', '7'], [0, 5, '7', '7'], [4, 1, '7', '7'], [4, 8, '7', '7'], [8, 5, '7', '7'], [8, 8, '7', '7'], [2, 1, '7', '', '7'], [6, 5, '7', '', '7'], [3, 8, '7', '', '7']],
          caption: 'Sedmička může být v 1., 5. a 9. řádku jen ve sloupcích 2, 6 a 9. Tři řádky ji tedy rozdělí do všech tří sloupců a jinde v nich být nemůže.' } },
        { tip: 'X-Wing stačí na Těžkou obtížnost, Swordfish už patří k Ďábelské. Vyber si jednu číslici a projdi jen její poznámky, řádek po řádku. Hledáš řádky, kde zbývají dva nebo tři kandidáti.' }
      ] },
      { id: 'xywing', level: 'Mistrovské', title: 'XY-Wing a další řetězce', blocks: [
        { p: '**XY-Wing** potřebuje tři políčka se dvěma kandidáty. Prostřední políčko (pivot) má {X, Y}, jedno křídlo {X, Z} a druhé {Y, Z}. Pivot musí obě křídla vidět – sdílet s každým z nich řádek, sloupec nebo čtverec.' },
        { p: 'Úvaha: když je v pivotu X, první křídlo musí být Z. Když je v pivotu Y, druhé křídlo musí být Z. Z je tedy aspoň v jednom křídle a každé políčko, které vidí obě křídla zároveň, Z obsahovat nemůže.' },
        { diagram: { kind: 'sudoku', rows: ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
          cand: [[1, 1, '37', '37'], [1, 7, '39'], [4, 1, '79'], [4, 7, '59', '', '9']], mark: [[1, 1, 'a'], [1, 7, 'soft'], [4, 1, 'soft'], [4, 7, 'no']],
          caption: 'Pivot {3, 7} vidí křídlo {3, 9} ve svém řádku a křídlo {7, 9} ve svém sloupci. Červené políčko vidí obě křídla, proto z něj zmizí devítka.' } },
        { p: 'Ďábelské zadání někdy chce i víc: XYZ-Wing (pivot se třemi kandidáty), řetězce silných vazeb nebo barvení jedné číslice. Princip je pořád stejný – najdi dvě možnosti, z nichž jedna určitě platí, a škrtni to, co by vadilo oběma.' },
        { tip: 'Než sáhneš po řetězcích, projdi ještě jednou jednodušší techniky. Po každém škrtnutí se často objeví obyčejná jednička, kterou jsi předtím přehlédl.' }
      ] }
    ]
  };

  B.miny = {
    intro: 'Počítání, vzory a postup na obřích polích – jak luštit miny bez hádání.',
    chapters: [
      { id: 'pocitani', level: 'Základy', title: 'Počítání kolem čísla', blocks: [
        { p: 'Číslo říká, kolik min leží v osmi sousedních políčkách, i šikmo. Z každého čísla plynou dvě jednoduchá pravidla:' },
        { list: ['Když má číslo **přesně tolik zakrytých sousedů, kolik ukazuje**, jsou to všechno miny.', 'Když už má kolem sebe **tolik vlajek, kolik ukazuje**, ostatní zakrytí sousedé jsou bezpeční.'] },
        { diagram: { kind: 'miny', rows: ['MMM', '232', '___'], mark: [[1, 1, 'a']], caption: 'Trojka sousedí jen se třemi zakrytými políčky, takže všechna tři jsou miny.' } },
        { p: 'První ťuknutí je v Herně vždy bezpečné a v jeho okolí žádná mina není, takže se otevře celá plocha. Od jejího okraje pak postupuješ dál.' },
        { tip: 'Odečítej vlajky: dvojka, vedle které už jedna vlajka leží, se pro zbylá zakrytá políčka chová jako jednička. Tak se dá každé číslo zmenšit a vzory hledat i uprostřed rozehrané plochy.' }
      ] },
      { id: 'vlajka', level: 'Základy', title: 'Vlajka a rychlé odkrytí', blocks: [
        { p: 'Vlajku položíš dlouhým stiskem nebo v režimu VLAJKA. Sama nic neodkrývá, jen si pamatuje, kde jsi minu našel – a otevírá rychlou zkratku.' },
        { p: 'Když má otevřené číslo kolem sebe tolik vlajek, kolik ukazuje, ťukni přímo na to číslo. Hra odkryje všechny jeho zbylé zakryté sousedy najednou.' },
        { diagram: { kind: 'miny', rows: ['FSF', '121', '___'], mark: [[1, 1, 'a']], caption: 'Dvojka už má dvě vlajky. Ťuknutí na ni odkryje zelené políčko.' } },
        { steps: ['Najdi jistou minu a dej na ni vlajku.', 'Podívej se na čísla kolem vlajky: které z nich už má plný počet vlajek?', 'Ťukni na takové číslo a nech hru otevřít zbytek.', 'Pokračuj od nově otevřených čísel.'] },
        { tip: 'Zkratka věří tvým vlajkám. Špatně položená vlajka z ní udělá past: hra pak odkryje políčko, kde mina doopravdy je. Vlajku dávej jen tam, kde si jsi jistý.' }
      ] },
      { id: 'vzory', level: 'Základy', title: 'Vzory 1-1 a 1-2', blocks: [
        { p: 'Vzory jsou hotové úvahy, které se na okraji otevřené plochy opakují pořád dokola. Čti je podél rovné hrany, kde pod čísly leží jen otevřená políčka.' },
        { p: '**1-1 od zdi**: jednička u kraje pole má minu v jednom ze dvou políček nad sebou. Sousední jednička hlídá tatáž dvě políčka, takže její třetí políčko je bezpečné.' },
        { diagram: { kind: 'miny', rows: ['##S#', '1111', '____'], walls: ['left'], mark: [[1, 0, 'a'], [1, 1, 'a']],
          caption: 'Obě modré jedničky hlídají tutéž dvojici políček vlevo nahoře. Třetí políčko nad druhou jedničkou je proto bezpečné.' } },
        { p: '**1-2**: dvojka vedle jedničky. Ze tří políček nad dvojkou sdílí dvě s jedničkou a v nich je nejvýš jedna mina. Druhá mina dvojky tedy leží ve třetím políčku, na straně od jedničky. A protože jednička má svou minu mezi sdílenými políčky, její vlastní vzdálenější políčko je bezpečné.' },
        { diagram: { kind: 'miny', rows: ['S##M#', '11221', '_____'], mark: [[1, 1, 'a'], [1, 2, 'a']],
          caption: 'Dvojka potřebuje dvě miny, ale v políčkách společných s jedničkou je nejvýš jedna. Mina je tedy vpravo nad dvojkou a políčko vlevo nad jedničkou je bezpečné.' } },
        { tip: 'Vzor platí, jen když číslo nemá další zakryté sousedy z boku nebo zespodu. Kdyby měl, musíš je započítat.' }
      ] },
      { id: 'vzory2', level: 'Pokročilé', title: 'Vzory 1-2-1, 1-2-2-1 a podmnožiny', blocks: [
        { p: '**1-2-1** na rovné hraně: miny leží nad oběma jedničkami, políčko nad dvojkou je bezpečné. Kdyby byla mina nad dvojkou, obě jedničky by už měly svou minu a dvojka by neměla kde vzít druhou.' },
        { diagram: { kind: 'miny', rows: ['SMSMS', '11211', '_____'], mark: [[1, 1, 'a'], [1, 2, 'a'], [1, 3, 'a']], caption: 'Miny leží nad jedničkami, nad dvojkou i po stranách je bezpečno.' } },
        { p: '**1-2-2-1**: miny leží nad oběma dvojkami, všechno ostatní nad touhle čtveřicí je bezpečné. Je to vlastně vzor 1-2 použitý z obou stran.' },
        { diagram: { kind: 'miny', rows: ['SSMMSS', '112211', '______'], mark: [[1, 1, 'a'], [1, 2, 'a'], [1, 3, 'a'], [1, 4, 'a']], caption: 'Dvě miny nad dvojkami, okolní políčka jsou bezpečná.' } },
        { p: '**Obecný trik s podmnožinami**: když jsou všechna zakrytá políčka čísla A zároveň sousedy čísla B, odečti. Rozdíl B − A je počet min v políčkách, která má jen B. Když je rozdíl nula, jsou tato políčka bezpečná; když se rovná jejich počtu, jsou to miny. Všechny vzory výše jsou jen pojmenované případy tohoto pravidla.' },
        { tip: 'Před odečítáním od obou čísel odečti vlajky. Počítáš se zbývajícím počtem min, ne s číslem na políčku.' }
      ] },
      { id: 'rohy', level: 'Pokročilé', title: 'Rohy a okraje', blocks: [
        { p: 'U okraje má políčko jen pět sousedů a v rohu tři. Čísla tam proto prozradí víc a vzory se na zdi skládají nejsnáz. Když se uprostřed zasekneš, podívej se nejdřív ke krajům.' },
        { diagram: { kind: 'miny', rows: ['SM1_', 'M21_', '11__', '____'], walls: ['top', 'left'], mark: [[0, 2, 'a'], [2, 0, 'a'], [1, 1, 'a']],
          caption: 'Jednička nahoře i jednička vlevo vidí po jediném zakrytém políčku, obě jsou tedy miny. Dvojka tím má své dvě miny a roh je bezpečný.' } },
        { p: 'Opačný případ: zakryté políčko v rohu, které nesousedí s žádným číslem, se logikou často rozhodnout nedá. Nech ho na konec, rozhodne o něm počítadlo min.' },
        { tip: 'Zeď funguje jako číslo nula: za krajním políčkem už nic není. Proto vzor 1-1 funguje jen od zdi nebo od políčka, o kterém už víš, že je bezpečné.' }
      ] },
      { id: 'koncovka', level: 'Mistrovské', title: 'Koncovka a počítadlo min', blocks: [
        { p: 'Nahoře vidíš 💣 se zbývajícím počtem min: celkový počet minus položené vlajky. Na konci hry je to další číslo, se kterým se dá počítat – platí ovšem jen tehdy, když jsou všechny tvé vlajky správně.' },
        { diagram: { kind: 'miny', rows: ['SF2_', 'FF2_', '221_', '____'], walls: ['top', 'right', 'bottom', 'left'], mines: 3, mark: [[0, 0, 'a']],
          caption: 'Roh vlevo nahoře nesousedí s žádným číslem. Pole má celkem 3 miny, všechny tři už mají vlajku a počítadlo ukazuje 0 – roh je bezpečný.' } },
        { p: 'Typické koncovky:' },
        { list: ['**Ostrov bez čísel**: zakrytá políčka obklopená jen minami. Když počítadlo ukazuje 0, jsou bezpečná; když ukazuje přesně jejich počet, jsou to miny.', '**Dvě řešení s různým počtem min**: když jedna možnost potřebuje dvě miny a druhá tři, rozhodne počítadlo.', '**Skutečné padesát na padesát**: dvě políčka, jedna mina, a žádné číslo ani počítadlo je nerozliší. Tady nezbývá než hádat.'] },
        { tip: 'Počítadlo začni brát vážně až na konci. Dokud je zakrytých políček hodně, skoro nic neřekne.' }
      ] },
      { id: 'obri', level: 'Mistrovské', title: 'Obří pole bez bloudění', blocks: [
        { p: 'Pole XXXXL má 24×40 políček a 200 min. Nejvíc času se tu neztrácí přemýšlením, ale hledáním, kde jsi skončil. Pomáhá pevný postup:' },
        { steps: ['**Pracuj na hraně.** Luštit se dá jen podél hranice mezi otevřenou a zakrytou plochou. Vnitřek otevřené plochy už nic nového neřekne.', '**Jeď v pásech.** Posouvej pole systematicky, třeba po sloupcích shora dolů, a každý pás dodělej, než přejdeš dál.', '**Nejdřív snadné tahy.** Při prvním průchodu ber jen jisté věci: plné jedničky, vlajky, rychlé odkrytí. Vzory a podmnožiny nech na druhý průchod.', '**Vlajky jako záložky.** Na velkém poli pokládej vlajky důsledně. Hned vidíš, co je hotové, a rychlé odkrytí ti ušetří desítky ťuknutí.', '**Ostrovy po jednom.** Když se hrana rozpadne na několik oddělených částí, pracuj na jedné, dokud se nezasekne, a pak přeskoč na další.'] },
        { p: 'Herna se obří a vlastní pole snaží postavit tak, aby šla vyřešit bez hádání. Když to nestihne, raději trochu ubere min a napíše ti to.' },
        { tip: 'Když se celá hrana zasekne, projdi ji ještě jednou pomalu a hledej podmnožiny i mezi čísly, která nejsou hned vedle sebe, ale sdílejí zakrytá políčka – třeba ob jedno políčko.' }
      ] },
      { id: 'hadani', level: 'Mistrovské', title: 'Kdy hádat', blocks: [
        { p: 'Herna se snaží postavit pole řešitelné čistou logikou a po prvním ťuknutí ti napíše, jestli se to povedlo. Když hlásí, že pole jde vyřešit bez hádání, každá zaseknutá situace znamená, že nějaký vzor ještě nevidíš. Nehádej – hledej dál.' },
        { p: 'Hádat má smysl, jen když:' },
        { list: ['hra napsala, že **občas možná budeš muset hádat** (čisté pole se nepodařilo včas postavit),', 'hraješ vlastní pole s hodně minami,', 've variantě Na čas dochází čas a jistý tah nevidíš,', 'zbývá skutečné padesát na padesát, které nerozhodne ani počítadlo.'] },
        { p: 'Jak hádat chytře:' },
        { list: ['Vyber políčko s **nejnižší šancí na minu**. Jednička se třemi zakrytými sousedy dává každému šanci 1 : 3, dvojka se třemi 2 : 3 – to je velký rozdíl.', 'Políčko daleko od čísel má šanci zhruba zbývající miny / zakrytá políčka. Na řídkém poli bývá bezpečnější než políčko vedle velkého čísla.', 'Ze dvou stejně riskantních políček vyber to, které po odkrytí **víc prozradí** – jehož číslo rozhodne i sousední nejistotu.', 'Nevyhnutelné padesát na padesát řeš hned, jak ho uvidíš. Je lepší prohrát po minutě než po deseti.'] },
        { tip: 'Máš-li z Obchodu Detektor min, nápověda odkryje bezpečné políčko na hraně plochy. Šetři ji na chvíli, kdy bys jinak musel hádat.' }
      ] }
    ]
  };

  B.dama = {
    intro: 'Povinné braní, létající dáma a kombinace: jak přehrát počítač v Herně.',
    chapters: [
      { id: 'pravidla', level: 'Základy', title: 'Pravidla, jak je hraje Herna', blocks: [
        { p: 'Hraje se na tmavých polích šachovnice 8×8, každý má dvanáct kamenů. Tvoje kameny jsou dole a souřadnice jdou jako v šachu: sloupce A–H zleva, řady 1–8 zdola.' },
        { list: ['**Kámen** táhne šikmo vpřed o jedno pole a **bere jen vpřed**: přeskočí soupeřův kámen na sousedním poli úhlopříčky, když je pole za ním volné.', '**Braní je povinné.** Když můžeš brát, musíš. Smíš si ale vybrat, kterým kamenem a kterou cestou – nemusíš brát nejvíc kamenů.', '**Dáma má přednost**: když může brát tvoje dáma, musíš brát dámou.', '**Vícenásobný skok**: když může kámen po přeskoku brát dál, pokračuje. Sebrané kameny mizí hned. Celou cestu zadáš ťuknutím na cílové pole.', 'Kámen, který dojde na poslední řadu, se mění v **dámu**. Když tam dojde při braní, tah končí.', '**Dáma létá**: táhne šikmo o libovolný počet volných polí a bere na dálku – přeskočí jeden soupeřův kámen a přistane na kterémkoli volném poli za ním.', 'Prohrává, kdo nemá kámen nebo tah. Třicet tahů po sobě (počítají se tahy obou hráčů) jen dámami a bez braní znamená remízu.'] },
        { diagram: { kind: 'board', look: 'dama', coords: 'dama', rows: ['........', '......b.', '........', '....b...', '...a....', '........', '........', '........'], mark: [[4, 3, 'a'], [2, 5, 'ok'], [0, 7, 'ok']],
          caption: 'Kámen z D4 bere E5 a doskočí na F6. Odtud bere G7 a na H8 se mění v dámu.' } },
        { p: 'Ve variantě **Dobrovolné braní** brát nemusíš a dáma nemá přednost. Když už ale braní začneš, kámen doskáče celou cestu.' }
      ] },
      { id: 'zahajeni', level: 'Základy', title: 'Zahájení: střed a spojené kameny', blocks: [
        { p: 'Na začátku rozhoduje prostor. Kameny ve středu (sloupce C–F) mají dva směry tahu a podporují se navzájem, kameny na kraji jen jeden.' },
        { list: ['**Táhni do středu.** Pole D4 a E5 jsou křižovatky: kámen tam brzdí soupeřův postup a sám má kam jít.', '**Drž kameny pohromadě.** Kámen jde sebrat jen tehdy, když je pole za ním volné. Když za ním na úhlopříčce stojí tvůj další kámen, po té úhlopříčce ho soupeř nesebere.', '**Nespěchej s krajními kameny.** Kámen na kraji je sice z jedné strany krytý, ale blokuje sám sebe a ze hry se ztrácí.', '**Nenechávej díry.** Volné pole hned za tvým kamenem je pozvánka: soupeřův kámen nebo dáma přes něj přeskočí.'] },
        { tip: 'Kameny táhnou jen dopředu a zpátky nemohou. Každý tah kamenem je trvalé rozhodnutí – před tahem se podívej, jaké díry za sebou necháš.' }
      ] },
      { id: 'zadni', level: 'Základy', title: 'Zadní řada a cesta do dámy', blocks: [
        { p: 'Počítač v Herně cení dámu zhruba na tři kameny, protože létá přes celou desku. Proto platí dvě pravidla: chraň svou zadní řadu a hledej cestu na tu soupeřovu.' },
        { p: 'Soupeřův kámen se mění v dámu jen na volném poli tvé zadní řady (A1, C1, E1, G1). Každé obsazené pole je pro něj zavřené.' },
        { diagram: { kind: 'board', look: 'dama', coords: 'dama', rows: ['.b...b.b', 'b.......', '........', '........', '........', '........', '...b....', '..a.a.a.'], mark: [[7, 2, 'a'], [7, 4, 'a'], [5, 2, 'ok'], [5, 4, 'ok']],
          caption: 'Soupeřův kámen na D2 je krok od dámy, ale C1 i E1 jsou obsazené a nemá kam táhnout. Navíc ho můžeš sebrat skokem na C3 nebo E3.' } },
        { list: ['Zadní kameny vyváděj mezi posledními. Nejcennější bývají ty uprostřed, C1 a E1.', 'Sám míř na slabá místa soupeřovy zadní řady (B8, D8, F8, H8). Jakmile ji soupeř vyklidí, jeden průlom stačí.', 'Dáma získaná v polovině hry obvykle rozhodne. Klidně za ni obětuj kámen.'] }
      ] },
      { id: 'vymeny', level: 'Pokročilé', title: 'Výměny a tempo', blocks: [
        { p: 'Výměna je tah, po kterém sebereš kámen a soupeř ti jeden vezme zpátky (nebo naopak). Díky povinnému braní ji můžeš vynutit: postavíš kámen tak, aby ho soupeř musel sebrat, a tvůj další kámen pak bere ten jeho.' },
        { list: ['**Když vedeš, měň.** Při stavu 5 na 4 je výhoda malá, při 2 na 1 rozhodující. Každá výměna kus za kus poměr zvětšuje.', '**Když prohráváš, výměnám se vyhýbej** a hledej kombinace, ve kterých bereš víc, než dáváš.', '**Výměnou si otevři cestu.** Dobrá výměna odstraní kámen, který ti blokuje průchod do dámy.'] },
        { p: '**Tempo**: v koncovkách s kameny rozhoduje, kdo musí táhnout. Když jsou kameny proti sobě zablokované, hráč, kterému dojdou volné tahy, musí táhnout do rány nebo nemá tah vůbec – a to je v Herně prohra.' },
        { tip: 'Počítej volné tahy: kolik tahů můžeš udělat, aniž by sis něco pokazil, a kolik jich má soupeř. V zablokované pozici vyhrává ten, kdo má v zásobě víc čekacích tahů.' }
      ] },
      { id: 'kombinace', level: 'Pokročilé', title: 'Kombinace s povinným braním', blocks: [
        { p: 'Povinné braní je zbraň: když soupeře donutíš brát, víš přesně, kam jeho kámen doskočí. Klasická kombinace obětuje jeden kámen, aby se dva soupeřovy kameny postavily do řady pro dvojskok.' },
        { diagram: { kind: 'board', look: 'dama', coords: 'dama', rows: ['........', '........', '...b.b..', '........', '...a.a..', '....a...', '...a....', '........'], mark: [[4, 5, 'a'], [3, 4, 'ok']],
          caption: 'Táhni F4–E5. Soupeř musí brát D6×F4 – jiné braní nemá a dál skákat nemůže, protože D2 je obsazené. Ty odpovíš dvojskokem E3×G5×E7: dal jsi jeden kámen a vzal dva.' } },
        { steps: ['Hledej soupeřovy kameny s volným polem za sebou – to jsou terče.', 'Zjisti, kam by soupeřův kámen doskočil, kdybys mu nabídl svůj.', 'Ověř, že odtud nemůže brát dál a že nemá jiné braní, které by si vybral místo tvého.', 'Teprve pak obětuj.'] },
        { tip: 'Počítač na Nemožné obtížnosti propočítá hodně tahů dopředu a jednoduchou kombinaci ti snadno nepřipustí. Stejný trik ale hrozí i tobě: před každým tahem zkontroluj, kam tě soupeř může donutit brát.' }
      ] },
      { id: 'koncovka', level: 'Mistrovské', title: 'Koncovka: dáma proti kamenům', blocks: [
        { p: 'Jedna dáma proti několika kamenům bývá silnější, než vypadá. Kameny táhnou jen dopředu, dáma všemi směry a na libovolnou vzdálenost.' },
        { diagram: { kind: 'board', look: 'dama', coords: 'dama', rows: ['........', '........', '........', '........', '...b....', '........', '........', 'A.......'], mark: [[7, 0, 'a'], [3, 4, 'ok'], [2, 5, 'ok'], [1, 6, 'ok'], [0, 7, 'ok']],
          caption: 'Dáma na A1 bere kámen na D4 z dálky a smí přistát na E5, F6, G7 nebo H8.' } },
        { list: ['**Obsaď hlavní úhlopříčku** A1–H8. Je nejdelší a dáma z ní hlídá obě poloviny desky.', '**Stůj za kameny, ne před nimi.** Kámen nebere dozadu, ale dáma ano: zezadu ho sebere, jakmile se před ním uvolní pole.', '**Chytej kameny na cestě do dámy.** Postav se na úhlopříčku, kterou musí kámen projít – každý jeho krok pak skončí sebráním.', '**Hlídej, kde stojíš.** I dámu jde sebrat: soupeřův kámen ji přeskočí, když je za ní volné pole.'] },
        { p: 'Se samými dámami se vyhrává těžko. Jedna proti jedné je remíza a ani dvě proti jedné obvykle nestačí. Se třemi dámami proti jedné se vyhrát dá, ale jen když soupeřova dáma nedrží hlavní úhlopříčku – proto ji obsaď dřív než on. A hlídej čas: třicet tahů bez braní a bez tahu kamenem je remíza.' }
      ] },
      { id: 'pasti', level: 'Mistrovské', title: 'Pasti a Dobrovolné braní', blocks: [
        { list: ['**Návnada**: soupeř ti nabídne kámen tak, že tvůj kámen po sebrání doskočí na místo, odkud ho vezme i s dalším. Před braním se vždycky podívej, kde přistaneš.', '**Dvojí hrozba**: jeden tah, který ohrožuje dvě místa zároveň. Soupeř uhájí jen jedno.', '**Uzamčení**: když tvoje kameny zablokují soupeřovy tak, že žádný nemůže táhnout, vyhráváš – i když máš kamenů méně.', '**Zapomenutá dáma**: soupeřova dáma na dlouhé úhlopříčce bere přes celou desku. Před každým tahem zkontroluj všechny úhlopříčky, na kterých stojí.'] },
        { p: 'Ve variantě **Dobrovolné braní** se oběti nevyplácejí: soupeř nabídnutý kámen prostě nemusí vzít. Hra je klidnější a víc rozhoduje postavení.' },
        { list: ['Stavěj pevné řetězy kamenů, ve kterých jeden kryje druhého.', 'Braní zvaž jako každý jiný tah. Někdy je lepší nechat soupeřův kámen stát, než si otevřít vlastní zadní řadu.', 'Soupeř tvůj kámen sebrat nemusí, ale může. Volné pole za kamenem je pořád slabina.'] }
      ] }
    ]
  };

  B.piskvorky = {
    intro: 'Jak na 3×3 nikdy neprohrát a jak v pěti v řadě postavit dvojitou hrozbu.',
    chapters: [
      { id: 'neprohrat', level: 'Základy', title: '3×3: jak nikdy neprohrát', blocks: [
        { p: 'Piškvorky 3×3 končí při bezchybné hře obou stran remízou. Proti počítači na obtížnosti Nemožná je remíza nejlepší možný výsledek; na nižších obtížnostech jde o to neprohrát a počkat na jeho chybu.' },
        { list: ['**Nejdřív vyhraj, pak blokuj**: když můžeš dát třetí značku do řady, udělej to. Jinak zablokuj soupeřovu dvojici.', '**Začínáš?** Nejlepší je roh – soupeři zbude jediná dobrá odpověď. Střed je taky bezpečný, ale dává mu víc možností.', '**Soupeř začal v rohu?** Odpověz středem. Cokoli jiného prohrává.', '**Soupeř začal ve středu?** Odpověz rohem. Hrana (políčko uprostřed strany) prohrává.', '**Soupeř začal na hraně?** Odpověz středem nebo rohem vedle jeho značky.'] },
        { diagram: { kind: 'board', look: 'grid', rows: ['X..', '.O.', '..X'], mark: [[0, 1, 'ok'], [1, 0, 'ok'], [1, 2, 'ok'], [2, 1, 'ok'], [0, 2, 'no'], [2, 0, 'no']],
          caption: '✕ má protilehlé rohy, ◯ střed. Teď musí ◯ hrát na hranu (zeleně). Roh (červeně) prohrává: ✕ musí blokovat v posledním rohu a získá tím dvě hrozby najednou.' } }
      ] },
      { id: 'vidlicka', level: 'Základy', title: '3×3: vidlička', blocks: [
        { p: 'Vyhrát se dá jen **vidličkou**: tahem, po kterém máš dvě hrozby najednou. Soupeř zablokuje jen jednu z nich.' },
        { diagram: { kind: 'board', look: 'grid', rows: ['XO.', 'XX.', '..O'], mark: [[1, 0, 'a'], [2, 0, 'ok'], [1, 2, 'ok']],
          caption: '◯ odpověděl na roh hranou. ✕ zahrál střed, ◯ musel blokovat protější roh, a teď ✕ tahem vlevo (modře) vytvořil dvě hrozby najednou (zeleně).' } },
        { p: 'Na 3×3 proto nehlídej jen soupeřovy dvojice, ale i tahy, kterými by si vidličku připravil. Před každým tahem se zeptej: kde by mohl mít dvě řady naráz?' },
        { tip: 'Na nižších obtížnostech počítač občas zahraje náhodně. Začni v rohu: když neodpoví středem, vždycky existuje vidlička, která vyhrává. Najdi ji.' }
      ] },
      { id: 'trojky', level: 'Pokročilé', title: '5 v řadě: trojky a čtyřky', blocks: [
        { p: 'V režimu 5 v řadě vyhrává pět značek v řadě vodorovně, svisle nebo šikmo, a počítá se i delší řada. Hra se točí kolem hrozeb – řad, které soupeř musí řešit.' },
        { list: ['**Otevřená čtyřka** – čtyři v řadě a oba konce volné. Nedá se ubránit, soupeř zavře jen jeden konec.', '**Zavřená čtyřka** – čtyři značky, kterým k pětce chybí jediné políčko (na konci nebo v díře, třeba ✕✕_✕✕). Soupeř musí hned blokovat.', '**Otevřená trojka** – tři v řadě s volnými konci, ze které jde jedním tahem udělat otevřenou čtyřku. Soupeř ji musí zavřít dřív.', '**Zavřená trojka** – jeden konec blokovaný. Sama nic nevynutí, ale hodí se do kombinace.'] },
        { diagram: { kind: 'board', look: 'grid', rows: ['.......', '.XXX...', '.......', 'OXXX...', '.......'], mark: [[1, 0, 'ok'], [1, 4, 'ok']],
          caption: 'Nahoře otevřená trojka: značka na kterýkoli zelený konec z ní udělá otevřenou čtyřku. Dole zavřená trojka – ◯ jí blokuje jeden konec.' } },
        { p: '**Stavěj ve středu a těsně u sebe.** Značka, která leží v mnoha možných pětkách najednou, má větší cenu. Tah daleko od ostatních značek je skoro vždycky ztráta tempa.' },
        { tip: 'Každý tah by měl buď stavět tvoji řadu, nebo kazit soupeřovu – nejlépe obojí zároveň.' }
      ] },
      { id: 'dvojita', level: 'Pokročilé', title: 'Dvojitá hrozba: 4-3 a 3-3', blocks: [
        { p: 'Vyhrává se stejně jako na 3×3: dvěma hrozbami najednou. Nejsilnější kombinace:' },
        { list: ['**4-4** – jeden tah vytvoří dvě čtyřky. Soupeř zablokuje jen jednu.', '**4-3** – čtyřka a k tomu otevřená trojka. Soupeř musí blokovat čtyřku a trojka mezitím vyroste v otevřenou čtyřku.', '**3-3** – dvě otevřené trojky naráz. Soupeř zavře jednu, z druhé uděláš otevřenou čtyřku.'] },
        { diagram: { kind: 'board', look: 'grid', rows: ['.........', '.........', '.....X...', '....OX...', '.OXXX....', '...O.....', '.........', '.........', '.........'], mark: [[4, 5, 'ok']],
          caption: 'Tah na zelené políčko udělá vodorovnou čtyřku (◯ musí blokovat vpravo) a zároveň svislou otevřenou trojku. Po bloku z ní ✕ udělá otevřenou čtyřku a vyhraje.' } },
        { p: 'Postup: připrav si dvě řady, které se protínají na jednom volném políčku, a zahraj ho ve chvíli, kdy soupeř nemá vlastní čtyřku.' },
        { tip: 'Nejjistější cesta k výhře jsou série čtyřek. Každou čtyřkou soupeře donutíš blokovat, takže nemá čas na vlastní hru. Když poslední čtyřka zároveň udělá druhou hrozbu, vyhráváš.' }
      ] },
      { id: 'obrana', level: 'Pokročilé', title: 'Obrana', blocks: [
        { list: ['**Pořadí priorit**: tvoje pětka → blok soupeřovy čtyřky → tvoje otevřená čtyřka → blok soupeřovy otevřené trojky → stavění.', '**Otevřenou trojku zavírej na konci**, ideálně z té strany, kde máš vlastní značky. U trojky s dírou (✕✕_✕) bývá nejlepší blok právě do díry.', '**Blokuj s užitkem**: ze dvou možných bloků vyber ten, který zároveň staví tvoji řadu.', '**Nečekej na trojku.** Silný soupeř chystá dvojitou hrozbu ze dvou dvojek. Když vidíš políčko, kde se křižují dvě jeho řady, obsaď ho dřív.'] },
        { tip: 'Počítač na vyšších obtížnostech umí dvojité hrozby stavět. Když se ti zdá, že má na desce hodně dvojek blízko sebe, je čas přestat stavět a začít kazit.' }
      ] },
      { id: 'zmizik', level: 'Mistrovské', title: 'Varianta Zmizík', blocks: [
        { p: 'Ve Zmizíkovi má každý na desce 3×3 nejvýš tři značky. Čtvrtá značka smaže tu nejstarší, která je předem vidět vybledlá. Deska se nikdy nezaplní a remíza neexistuje.' },
        { list: ['**Nejstarší značka nepočítá.** Když už máš tři značky, nová smaže tu vybledlou dřív, než se kontroluje výhra. Řada, ve které vybledlá značka je, ti tedy nepomůže.', '**Totéž u soupeře.** Jeho vybledlá značka zmizí s jeho dalším tahem – blok, který drží, za chvíli nebude.', '**Hrozba, která přežije.** Dobrá hrozba stojí na tvých dvou novějších značkách, ne na té nejstarší.', '**Počítej o tah dopředu.** U každého tahu si řekni, která značka zmizí a jak bude deska vypadat potom.'] },
        { tip: 'Blok je ve Zmizíkovi slabší než obvykle: tvoje blokující značka jednou zestárne a zmizí. Lepší je blokovat tahem, který zároveň staví tvou vlastní hrozbu.' }
      ] }
    ]
  };

  B.ctyri = {
    intro: 'Střed, hrozby a pravidlo lichých a sudých řad – jak číst desku 7×6.',
    chapters: [
      { id: 'stred', level: 'Základy', title: 'Střední sloupec', blocks: [
        { p: 'Deska má sedm sloupců a šest řad. Políčko uprostřed desky leží až ve třinácti možných čtveřicích, políčko v rohu jen ve třech. Proto je střední (4.) sloupec nejcennější.' },
        { list: ['Začínáš? Hoď do středu.', 'Soupeř začal středem? Hraj taky do středu, na jeho žeton, nebo těsně vedle.', 'Krajní sloupce (1. a 7.) se hodí hlavně k blokování a jako čekací tahy na konci hry.'] },
        { tip: 'Počítač v Herně dává při hodnocení přednost střednímu sloupci. Když mu ho necháš celý, staví z něj hrozby do všech stran.' }
      ] },
      { id: 'hrozby', level: 'Základy', title: 'Hrozby a obrana', blocks: [
        { p: '**Hrozba** je volné políčko, které by hráči dalo čtyřku. Rozhoduje, jestli je hned hratelné (pod ním už něco leží), nebo zatím visí ve vzduchu.' },
        { list: ['**Nejdřív vlastní výhra, pak blok.** Před každým hodem zkontroluj všechny sloupce: můžu vyhrát? Může soupeř vyhrát dalším hodem?', '**Nehraj pod soupeřovu hrozbu.** Když soupeř potřebuje políčko ve 3. řadě a pod ním je volno, tvůj žeton ve 2. řadě mu ho podá.', '**Dvojitá hrozba vyhrává**: dvě hratelné hrozby naráz, nebo dvě tvoje hrozby přímo nad sebou – soupeř zablokuje spodní a ty dáš horní.', '**Hlídej úhlopříčky.** Nejčastěji přehlédnutá výhra je šikmá řada.'] },
        { tip: 'Prohlížej desku po řadách odspodu. U každého volného políčka se zeptej, komu by dalo čtyřku.' }
      ] },
      { id: 'liche', level: 'Pokročilé', title: 'Liché a sudé řady', blocks: [
        { p: 'Řady počítej odspodu, 1 až 6. Ke konci hry se sloupce zaplňují a hráči často nemají jinou volbu, než hrát do sloupce, kde se něco rozhoduje. Druhý hráč může v takové chvíli odpovídat do stejného sloupce jako první, a tak získá políčka v sudých řadách. Odtud známé pravidlo:' },
        { list: ['**Začínající hráč** chce hrozby v **lichých** řadách (3 a 5).', '**Druhý hráč** chce hrozby v **sudých** řadách (2, 4 a 6).', 'Hrozba nevhodné řady sama obvykle nevyjde; potřebuje pomoc další hrozby.'] },
        { diagram: { kind: 'board', look: 'c4', coords: 'c4', rows: ['.......', '.......', '..a....', '..b.b..', '..b.a..', 'bbabaaa'], mark: [[3, 3, 'ok'], [4, 3, 'no']],
          caption: 'Červený začínal a má hrozbu ve 3. řadě na šikmé čtveřici (zeleně). Do políčka pod ní (červeně) nechce hodit nikdo: když tam hodí žlutý, červený vyhraje; když tam hodí červený, žlutý hrozbu zablokuje.' } },
        { tip: 'Hrozbu, kterou zatím nejde využít, nespotřebuj. Nech ji ležet – ke konci hry může soupeře donutit hodit pod ni.' }
      ] },
      { id: 'zugzwang', level: 'Pokročilé', title: 'Zugzwang: kdo musí hodit pod hrozbu', blocks: [
        { p: 'Zugzwang je chvíle, kdy by bylo nejlepší netáhnout vůbec – ale táhnout musíš. Ve čtyřech v řadě nastává, když jsou všechny bezpečné tahy vyčerpané a zbývají jen sloupce, kde tah něco pokazí.' },
        { steps: ['Najdi sloupce, do kterých nechce hodit nikdo (pod hrozbou, ať tvojí, nebo soupeřovou).', 'Spočítej volná políčka v ostatních sloupcích – to jsou bezpečné tahy, které si hráči budou střídavě brát.', 'Když je bezpečných tahů sudý počet, jako první do „zakázaného" sloupce musí hodit ten, kdo je teď na tahu. Když lichý, ten druhý.', 'Snaž se počet bezpečných tahů upravit ve svůj prospěch – třeba tahem, který jeden sloupec zablokuje nebo otevře.'] },
        { tip: 'Na Nemožné obtížnosti počítač v koncovce počítá velmi hluboko. Vyhrát se proti němu dá hlavně dobře načasovanou hrozbou v řadě se správnou paritou.' }
      ] },
      { id: 'prekazky', level: 'Mistrovské', title: 'Varianta Překážky', blocks: [
        { p: 'V Překážkách leží na dně tří náhodných sloupců šedé kameny, které nepatří nikomu. V těch sloupcích se začíná až od 2. řady a volných políček je celkem jen 39.' },
        { list: ['**Parita se mění.** Ve sloupci s překážkou je pět volných políček místo šesti a v celé desce je jich lichý počet, takže poslední žeton hodí ten, kdo začínal. Pravidlo lichých a sudých řad proto neber doslova; počítej podle postupu z kapitoly o zugzwangu.', '**Překážka je zeď.** Čtveřice přes šedý kámen nevede. Vodorovné řady ve spodní řadě jsou rozsekané, a tak víc rozhodují úhlopříčky a vyšší řady.', '**Střed může být pokažený.** Když leží překážka ve středním sloupci, ztrácí střed část své síly. Podívej se, které sloupce kolem mají nejvíc volných čtveřic.'] },
        { tip: 'Na začátku hry si spočítej, kolik volných políček je ve kterém sloupci. Pomůže ti to odhadnout, kdo bude na konci nucen hodit pod hrozbu.' }
      ] }
    ]
  };

  B.lode = {
    intro: 'Rozmístění flotily, hledání šachovnicí a dorážení zasažených lodí.',
    chapters: [
      { id: 'rozmisteni', level: 'Základy', title: 'Rozmístění flotily', blocks: [
        { p: 'V Herně se lodě nesmějí dotýkat, ani rohem. Na poli 10×10 máš letadlovou loď (5 políček), bitevní loď (4), křižník (3), ponorku (3) a torpédoborec (2).' },
        { list: ['**Nestav vzory.** Všechny lodě u jedné zdi nebo pěkně rovnoběžně vedle sebe se hledají snadno, jakmile soupeř trefí první.', '**Využij kraje.** Silnější počítač (Těžká, Nemožná) střílí tam, kam se vejde nejvíc možných lodí, a to je hlavně střed. U okraje se loď vejde méně způsoby, takže tam míří později.', '**Malou loď nedávej do úzké mezery** mezi velkými loděmi. Až soupeř velké lodě potopí, hra odkryje jejich okolí a osamělá mezera bude nápadná.', '**Ve hře dvou hráčů střídej.** Kdo staví pokaždé stejně, toho soupeř brzy prokoukne.'] },
        { tip: 'Tlačítko Náhodně je dobrý začátek: rozmístění bez lidských zvyků. Pak už jen přesuň loď, která ti připadá moc nápadná.' }
      ] },
      { id: 'sachovnice', level: 'Základy', title: 'Hledání šachovnicí', blocks: [
        { p: 'Každá loď zabírá aspoň dvě políčka v řadě. Stačí proto střílet na každé druhé políčko, jako na černá pole šachovnice – žádná loď mezi nimi neproklouzne. Hledání tím zkrátíš na polovinu.' },
        { diagram: { kind: 'board', look: 'sea', rows: ['+.+.+.+.+.', '.+.+.+.+.+', '+.+.+.+.+.', '.+.+.+.+.+', '+.+.+.+.+.', '.+.+.+.+.+', '+.+.+.+.+.', '.+.+.+.+.+', '+.+.+.+.+.', '.+.+.+.+.+'],
          caption: 'Stačí střílet na označená políčka. Každá loď je dlouhá aspoň 2, takže aspoň jedno její políčko je označené.' } },
        { p: 'Když je torpédoborec potopený a nejkratší zbylá loď má tři políčka, síť zřeď: stačí každé třetí políčko na úhlopříčkách. Každá trojice políček v řadě nebo ve sloupci pak obsahuje právě jedno z nich.' },
        { tip: 'Po každém potopení si odečti, které lodě zbývají. Když zbývá jen letadlová loď, stačí každé páté políčko – a jen tam, kam se pětka ještě vejde.' }
      ] },
      { id: 'zasah', level: 'Pokročilé', title: 'Po zásahu', blocks: [
        { p: 'Zásah znamená, že střílíš znovu. Teď jde o to loď dorazit co nejmenším počtem ran.' },
        { steps: ['Po prvním zásahu zkoušej čtyři sousedy: nahoru, dolů, doleva, doprava.', 'Jakmile máš dva zásahy vedle sebe, znáš směr. Pokračuj po linii, dokud loď neklesne.', 'Když po linii narazíš na vodu, vrať se a pokračuj na druhém konci.', 'Po potopení hra sama označí okolí lodi jako vodu. Na ta políčka už nestřílej.'] },
        { diagram: { kind: 'board', look: 'sea', rows: ['.......', '.......', '.......', '...h~..', '.......', '.......', '.......'], mark: [[2, 3, 'ok'], [4, 3, 'ok'], [3, 2, 'ok'], [2, 2, 'no'], [2, 4, 'no'], [4, 2, 'no'], [4, 4, 'no']],
          caption: 'Po zásahu (✸) zkus políčka nahoře, dole a vlevo (zeleně); vpravo už je voda. Šikmá políčka (červeně) jsou jistě voda.' } },
        { tip: 'Šikmá políčka u zásahu jsou vždycky voda: loď je rovná a jiná loď se jí nesmí dotknout ani rohem. Jakmile znáš směr lodi, jsou voda i políčka po stranách celé linie.' }
      ] },
      { id: 'hustota', level: 'Mistrovské', title: 'Pravděpodobnost a Velké moře', blocks: [
        { p: 'Nejsilnější počítač v Herně střílí podle hustoty: pro každou zbývající loď spočítá, kolika způsoby se dá na pole položit, a míří tam, kudy jich vede nejvíc. Odhadem to zvládneš i ty.' },
        { list: ['Velký prázdný prostor schová víc lodí než úzká mezera. Střílej do středu velkých prázdných ploch.', 'Mezera, do které se nevejde ani nejmenší zbývající loď, je jistě prázdná. Vynech ji.', 'Kolem potopené lodi je voda (hra ji označí sama). Úzké pruhy, které tím vzniknou, často nic neskrývají.', 'Pamatuj si, které lodě zbývají: když je pryč všechno kromě pětky, hledáš jen místa, kam se pětka vejde.'] },
        { p: '**Velké moře** má pole 12×12 a sedm lodí: 5, 4, 3, 3, 3, 2 a 2. Dohromady je to 22 políček lodí na 144 políčkách, oproti 17 na 100 na malém poli. Lodí je víc, ale moře je řidší a bitva delší.' },
        { list: ['Šachovnice platí dál, dokud nepotopíš obě dvojky.', 'Pro vlastní lodě se tu kraje vyplácejí ještě víc: střed je daleko a počítač míří nejdřív tam.', 'Bitva je dlouhá, tak si průběžně počítej, kolik lodí a jakých délek ještě zbývá.'] }
      ] }
    ]
  };

  B.slovo = {
    intro: 'Dobrá první slova, chytrý druhý pokus a hra v Přísném režimu.',
    chapters: [
      { id: 'prvni', level: 'Základy', title: 'První slovo', blocks: [
        { p: 'Hledané slovo je vždycky z vlastního seznamu Herny (335 slov bez diakritiky). Takhle často se v něm objevují jednotlivá písmena – číslo říká, v kolika slovech písmeno je:' },
        { list: ['A 160, E 132, T 115, O 114, R 102, L 96, K 93, S 86, I 82, N 76', 'P 60, V 60, Y 59, D 57, C 55, M 49, Z 46, H 44, U 40, B 38', 'J 16, F 2, G 2 – a Q, W ani X v seznamu nejsou vůbec.'] },
        { p: 'Dobré první slovo pokryje co nejvíc častých písmen a žádné neopakuje. Ze seznamu vycházejí nejlépe tato (všechna v něm jsou, takže mohou vyjít i rovnou):' },
        { list: ['**LOKET** – po něm zůstane v průměru nejméně možných slov, kolem 11 z 335.', '**LEKAR**, **DELAT** a **TALIR** – skoro stejně dobré.', '**STALE** a **STENA** – obsahují nejčastější písmena vůbec, hodí se, když chceš rychle zjistit A, E a T.'] },
        { tip: 'Využij i polohu: slova v seznamu nejčastěji začínají na P nebo S, druhé písmeno bývá A nebo O, čtvrté E a na konci stojí A, T nebo Y.' }
      ] },
      { id: 'druhy', level: 'Základy', title: 'Druhý pokus', blocks: [
        { p: 'Po prvním slově víš, co ve slově je a co ne. Druhý pokus může mít dvě role:' },
        { list: ['**Průzkum**: když první slovo dalo málo barev, zahraj slovo se samými novými písmeny. Dvojice **LEKAR + NOSIT** pokryje deset nejčastějších písmen; skoro stejně dobré jsou **SKOLA + VERIT** a **SLEVA + TRIKO**. Po takové dvojici zbývají v průměru jen jedno až dvě možná slova.', '**Útok**: když už máš tři a více barevných písmen, hraj slovo, které může být hledaným, a zároveň zkouší nejistá místa.'] },
        { p: 'Herna přijme jako pokus jakoukoli pětici písmen, i když to není slovo. Průzkumný pokus proto nemusí dávat smysl – stačí, když otestuje co nejvíc nových písmen.' },
        { tip: 'Žluté písmeno v dalším pokusu přesuň jinam. Zkoušet ho na stejném místě je zbytečné – už víš, že tam není.' }
      ] },
      { id: 'barvy', level: 'Pokročilé', title: 'Čtení barev a zdvojená písmena', blocks: [
        { list: ['**Zelené ✓** – písmeno je na správném místě.', '**Žluté ↔** – písmeno ve slově je, ale jinde.', '**Šedé** – písmeno ve slově není. Pozor na výjimku: když napíšeš písmeno dvakrát a ve slově je jen jednou, jedno se obarví a druhé zešedne.'] },
        { p: 'Zdvojená písmena nejsou vzácnost: zhruba každé čtvrté slovo v seznamu má některé písmeno dvakrát (BANAN, KOCKA, OKOLO, PIZZA). Když ti dochází kandidáti, zkus zopakovat písmeno, které už je zelené nebo žluté.' },
        { steps: ['U každé pozice si ujasni, které písmeno tam je, nebo která tam být nemohou.', 'Z písmen, která jsi ještě nezkoušel, vyber nejčastější (podle seznamu v první kapitole).', 'Mysli na české koncovky: -AT, -IT a -ET u sloves, -Y u přídavných jmen, -A u podstatných jmen.', 'Když zbývá víc kandidátů než pokusů, zahraj slovo, které je od sebe rozliší, i když samo vyjít nemůže.'] }
      ] },
      { id: 'prisny', level: 'Pokročilé', title: 'Přísný režim', blocks: [
        { p: 'V Přísném režimu musíš odhalená písmena použít: zelené písmeno musí zůstat na svém místě a žluté se musí ve slově objevit (hra nehlídá kde). Šedá písmena zakázaná nejsou.' },
        { list: ['Čistě průzkumné slovo se samými novými písmeny tu většinou nejde, protože musí obsahovat všechno odhalené. První slovo je proto ještě důležitější.', 'Volná místa vyplň častými písmeny, která jsi ještě nezkoušel. Šedé písmeno použij jen tehdy, když jiná rozumná možnost není.', 'Žluté písmeno vždycky posuň na nové místo. Pravidla to nevyžadují, ale jinak pokus zbytečně ztratíš.', 'Za výhru je o polovinu víc odměn, takže se vyplatí nespěchat.'] }
      ] }
    ]
  };

  B.g2048 = {
    intro: 'Roh, uspořádané řady a pořadí spojování – jak se dostat přes 2048.',
    chapters: [
      { id: 'roh', level: 'Základy', title: 'Strategie rohu', blocks: [
        { p: 'Nejspolehlivější postup: vyber si jeden roh a drž v něm největší dlaždici celou hru. Kolem ní stav řadu dlaždic seřazených podle velikosti.' },
        { diagram: { kind: 'board', look: 't48', rows: [['1024', '512', '256', '128'], ['8', '16', '32', '64'], ['4', '2', '.', '.'], ['.', '.', '.', '.']],
          caption: 'Největší dlaždice v levém horním rohu a za ní had seřazený podle velikosti. Spojování postupuje od konce hada k rohu.' } },
        { steps: ['Zvol roh, třeba levý horní.', 'Táhni hlavně dvěma směry, které do něj tlačí: doleva a nahoru.', 'Třetí směr (doprava) ber, jen když jinak nejde – a nejlépe když je horní řada plná, aby se největší dlaždice nepohnula.', 'Čtvrtému směru (dolů) se vyhýbej, jak jen to jde.'] },
        { tip: 'Když tě hra donutí táhnout dolů, hned dalším tahem táhni nahoru. Do uvolněného rohu by jinak mohla naskočit nová dvojka.' }
      ] },
      { id: 'rady', level: 'Základy', title: 'Uspořádané řady', blocks: [
        { p: 'Horní řada by měla od rohu klesat, třeba 512, 256, 128, 64. Druhá řada pokračuje opačným směrem, takže všechna čísla tvoří jednu klikatou čáru. Spojování pak běží jako domino: 64 se spojí s 64, vznikne 128 vedle 128 a tak dál až do rohu.' },
        { list: ['**Nenechávej malé číslo uvězněné** mezi velkými. Dvojka uprostřed horní řady zablokuje celé domino.', '**Horní řadu udržuj plnou.** Pak tah doleva nebo doprava velkými čísly nepohne.', '**Dívej se dva tahy dopředu**: nová dlaždice padne na náhodné volné políčko (devětkrát z deseti dvojka, jinak čtyřka). Kam může spadnout a bude pak kam táhnout?'] }
      ] },
      { id: 'retezeni', level: 'Pokročilé', title: 'Řetězení spojů', blocks: [
        { p: 'Jeden tah může spojit víc dvojic naráz, ale každá dlaždice se v jednom tahu spojí nejvýš jednou. Řada 4 4 8 dá po tahu doleva 8 8, ne 16.' },
        { list: ['**Připrav si schody**: z řady 64 32 16 16 vznikne tahem doleva 64 32 32, dalším 64 64 a dalším 128.', '**Spojuj od konce hada, ne od rohu.** Malá čísla tak vyrostou v dlaždici, která se hodí k sousedovi.', '**Nespojuj ve špatnou stranu.** Spoj, který by poslal velké číslo pryč od rohu, rozbije pořadí. Někdy je lepší jeden tah počkat.'] },
        { tip: 'Vrácení tahu (vylepšení z Obchodu) šetři na chvíli, kdy ti nová dlaždice zablokuje roh. Jinde se tolik nevyplatí.' }
      ] },
      { id: 'mini', level: 'Mistrovské', title: 'Mini 3×3', blocks: [
        { p: 'Na desce 3×3 je jen devět políček. Strategie rohu platí dál, ale místa je tak málo, že každá chyba je hned vidět. Odměny jsou za to dvojnásobné.' },
        { list: ['Mysli hlavně na jednu řadu: největší dlaždice v rohu, vedle ní druhá největší.', 'Táhni dvěma hlavními směry, třetí používej s rozmyslem a čtvrtý skoro nikdy.', 'Spojuj hned, jak to jde. Na velké desce se dá čekat, tady rozhoduje každé volné políčko.', 'Neměř se velkou deskou: i 256 je tady pěkný výsledek.'] }
      ] }
    ]
  };

  B.pexeso = {
    intro: 'Paměťové triky a znalost toho, jak si karty pamatuje počítač.',
    chapters: [
      { id: 'system', level: 'Základy', title: 'Systém místo náhody', blocks: [
        { p: 'Nejčastější chyba je otáčet karty nazdařbůh. Když postupuješ systematicky, pamatuješ si polohy mnohem snáz.' },
        { list: ['**Otáčej po řádcích**, zleva doprava. Pak víš, které karty jsi už viděl a které ne.', '**Dej každé kartě adresu**: „třetí řádek, druhá zleva". Souřadnice si zapamatuješ líp než obecné „někde vlevo".', '**Neotáčej zbytečně karty, které znáš** a nemáš k nim pár. Nic nového nezjistíš a pomáháš soupeři.'] },
        { tip: 'U velkých polí si desku rozděl na čtvrtiny a pracuj vždy v jedné. Menší kus se drží v hlavě snáz.' }
      ] },
      { id: 'pamet', level: 'Pokročilé', title: 'Paměťové triky', blocks: [
        { list: ['**Pojmenuj obrázek** v duchu nebo nahlas: „sova vlevo nahoře". Slovo si mozek zapamatuje líp než samotný obraz.', '**Spojuj do skupin**: dvě nebo tři karty blízko sebe si zapamatuj jako jednu scénu („kočka, míč a strom v rohu").', '**Opakuj si, co víš**, když hraje soupeř. Krátké zopakování poloh drží paměť čerstvou.', '**Na velkých polích hlídej barvu**: některé motivy se opakují v jiné barvě, a ty pár nejsou.', '**Ultra s čínskými znaky**: najdi na znaku jeden výrazný rys (dlouhou čáru, malý čtvereček) a ten si pojmenuj.'] }
      ] },
      { id: 'pocitac', level: 'Pokročilé', title: 'Jak si pamatuje počítač', blocks: [
        { p: 'Počítač vidí každou otočenou kartu, svou i tvou. Jestli si ji zapamatuje, závisí na obtížnosti: na Lehké asi každou čtvrtou, na Střední každou druhou, na Těžké čtyři z pěti a na Nemožné všechny. Při každém dalším otočení té karty má novou šanci. Co si jednou zapamatuje, už nezapomene.' },
        { p: 'Na tahu postupuje takhle:' },
        { steps: ['Když zná obě karty nějakého páru, otočí je.', 'Jinak otočí kartu, kterou ještě nezná.', 'Když k ní zná druhou kartu, vezme pár. Jinak otočí další neznámou.'] },
        { p: 'Každá karta, kterou odkryješ, je tedy informace i pro něj. Na vyšších obtížnostech mu tím často nadhazuješ páry.' }
      ] },
      { id: 'prvni-karta', level: 'Mistrovské', title: 'Kterou kartu otočit první', blocks: [
        { p: '**Jako první otoč neznámou kartu.** Když k ní znáš pár, máš dvojici. Když ne, nic jsi neztratil.' },
        { p: 'Obrácené pořadí – nejdřív známá karta, pak neznámá – se skoro nikdy nevyplatí. Pár pak vyjde, jen když neznámá karta bude náhodou právě ta jediná správná. Když otočíš neznámou kartu jako první, stačí, aby patřila k jakékoli kartě, kterou už znáš.' },
        { p: '**Co otočit jako druhou**, když první karta pár nemá:' },
        { list: ['**Další neznámou**, když je neznámých karet hodně a počítač si pamatuje málo (Lehká, Střední). Můžeš mít štěstí a sám se něco dozvíš.', '**Kartu, kterou už znáš**, když je počítač silný (Těžká, Nemožná). Neprozradíš nic nového a nenaservíruješ mu pár.'] },
        { tip: 'Pár znamená tah navíc. Když znáš víc párů, ber je všechny hned za sebou – dokud trefuješ, hraješ dál.' }
      ] }
    ]
  };

  B.had = {
    intro: 'Plánování cesty, cik-cak a jak se nezamotat do vlastního ocasu.',
    chapters: [
      { id: 'cesta', level: 'Základy', title: 'Plánování cesty', blocks: [
        { p: 'Had jede sám, ty jen zatáčíš. Otočit se o 180° nejde – takový pokyn hra přeskočí.' },
        { list: ['**Mysli o dva tahy dopředu.** Hra si pamatuje až dva pokyny najednou, takže rychlé „nahoru, doprava" provede přesně za sebou.', '**K jablku jezdi oklikou, ne nejkratší cestou**, když by tě nejkratší cesta zavedla mezi tělo a zeď.', '**Zlaté jablko** se objeví po každých pěti červených, je za 3 body a brzy zmizí. Vyplatí se jen tehdy, když na něj dojedeš bezpečně.'] },
        { tip: 'Na začátku je had krátký a chyby se odpouštějí. Zvykni si na rychlost, než naroste.' }
      ] },
      { id: 'cikcak', level: 'Pokročilé', title: 'Zdi a cik-cak', blocks: [
        { p: 'Když had naroste, je nejbezpečnější jezdit podél zdí a v pravidelných pruzích. Tělo pak leží úhledně a ty víš, kde je volno.' },
        { diagram: { kind: 'board', look: 'grid', rows: ['→→→→→↓', '↓←←←←←', '→→→→→↓', '↓←←←←←', '→→→→→↓', '●←←←←←'],
          caption: 'Cik-cak: had jezdí tam a zpátky v pruzích přes celé pole. Volné místo zůstává pohromadě a had se nezavře.' } },
        { list: ['Pruhy veď přes celou šířku pole a otáčej se až u zdi.', 'Mezi pruhy nenechávej mezeru širokou jedno políčko – do takové uličky se pak vjede, ale nevyjede.', 'Jablko ve vzdálené části pole nech chvíli být a dojeď si pro něj v rámci dalšího pruhu.'] }
      ] },
      { id: 'pasti', level: 'Pokročilé', title: 'Pasti', blocks: [
        { list: ['**Slepá ulička**: prostor, kam se vejdeš, ale nevyjdeš. Než do něj vjedeš, odhadni, jestli v něm je aspoň tolik volných políček, kolik je had dlouhý – ocas se mezitím uvolňuje.', '**Jeď za ocasem.** Když nevíš kudy, sleduj vlastní ocas. Políčko, na kterém je teď konec ocasu, se v dalším kroku uvolní (kromě kroku, kdy had jí jablko).', '**Rychlé zatáčky**: dva pokyny za sebou se provedou ve dvou krocích. Na rychlých obtížnostech je zadávej s předstihem, ne na poslední chvíli.'] }
      ] },
      { id: 'portaly', level: 'Mistrovské', title: 'Varianta Portály', blocks: [
        { p: 'V Portálech zdi nezabíjejí: had vyjede na protější straně. Okraje se jakoby spojí a jediné nebezpečí je vlastní tělo.' },
        { list: ['Jablko u kraje bývá nejblíž přes portál. Před zatočením porovnej obě cesty.', 'Cik-cak funguje dál, jen pruhy mohou pokračovat přes okraj. Dlouhý had může jezdit v rovné smyčce přes celé pole.', 'Pozor na tělo na druhé straně: hlava se po průjezdu objeví na protější straně, kde může ležet tvůj ocas.', 'Bez zdí chybějí opěrné body. Drž v hlavě, kde má had ocas – tam se uvolňuje místo.'] }
      ] }
    ]
  };

  /* ---------- Vykreslení textu a diagramů ---------- */
  const rich = t => String(t).split(/\*\*(.+?)\*\*/).map((s, i) => i % 2 ? el('strong', { text: s }) : s).filter(Boolean);
  const toks = row => Array.isArray(row) ? row : [...row];
  const marks = d => { const m = {}; (d.mark || []).forEach(([r, c, k]) => { m[r + ',' + c] = k || 'a'; }); return m; };
  const HEX = '0123456789ABCDEF';

  const sudoku = d => {
    const n = d.size === 16 ? 16 : 9, box = n === 16 ? 4 : 3, r0 = d.r0 || 0, mk = marks(d), cand = {};
    (d.cand || []).forEach(([r, c, all, hot, gone]) => { cand[r + ',' + c] = { all: String(all), hot: String(hot || ''), gone: String(gone || '') }; });
    const g = el('div', { class: 'ucb-grid ucb-sdk' });
    d.rows.forEach((row, r) => toks(row).forEach((ch, c) => {
      const k = mk[r + ',' + c], cd = cand[r + ',' + c], R = r0 + r;
      const cell = el('span', { class: 'ucb-c' + (k ? ' m-' + k : '') + ((c + 1) % box === 0 && c < n - 1 ? ' bR' : '') + ((R + 1) % box === 0 && r < d.rows.length - 1 ? ' bB' : '') + (ch !== '.' ? ' giv' : '') });
      if (ch !== '.') cell.textContent = ch;
      else if (cd && cd.all.length === 1) cell.append(el('span', { class: 'ucb-n1 ' + (cd.gone ? 'gone' : cd.hot ? 'hot' : ''), text: cd.all }));
      else if (cd) {
        const nt = el('span', { class: 'ucb-nt' });
        for (let i = 0; i < n; i++) {
          const s = n === 16 ? HEX[i] : String(i + 1), on = cd.all.includes(s);
          nt.append(el('i', { class: on ? (cd.gone.includes(s) ? 'gone' : cd.hot.includes(s) ? 'hot' : null) : null, text: on ? s : '' }));
        }
        cell.append(nt);
      }
      g.append(cell);
    }));
    return { grid: g, n, max: n === 16 ? 26 : 40 };
  };

  const miny = d => {
    const mk = marks(d), walls = d.walls || [], rows = d.rows.map(toks);
    const g = el('div', { class: 'ucb-grid ucb-mn' + walls.map(s => ' w-' + s).join('') });
    rows.forEach((row, r) => row.forEach((ch, c) => {
      const k = mk[r + ',' + c]; let cls = 'ucb-c', t = '';
      if (ch === '_') cls += ' op';
      else if (/[1-8]/.test(ch)) { cls += ' op n' + ch; t = ch; }
      else if (ch === 'F') t = '🚩';
      else if (ch === 'S') { cls += ' safe'; t = '✓'; }
      else if (ch === 'M') { cls += ' mine'; t = '💣'; }
      g.append(el('span', { class: cls + (k ? ' m-' + k : ''), text: t }));
    }));
    return { grid: g, n: rows[0].length, max: 40 };
  };

  const PIECE = { a: 'pa', A: 'pa', b: 'pb', B: 'pb', '#': 'pg' };
  const SEA = { '~': ['sm', '•'], h: ['sh', '✸'], k: ['sk', '✖'], s: ['ss', ''], '+': ['st', ''] };
  const board = d => {
    const rows = d.rows.map(toks), n = rows[0].length, look = d.look || 'grid', mk = marks(d);
    const g = el('div', { class: 'ucb-grid ucb-b lk-' + look });
    rows.forEach((row, r) => row.forEach((t, c) => {
      const k = mk[r + ',' + c], dark = look === 'dama' && (r + c) % 2 === 1;
      const cell = el('span', { class: 'ucb-c' + (dark ? ' dk' : '') + (k ? ' m-' + k : '') });
      if (t === '.' || t === '') { /* prázdné */ }
      else if (look === 't48') cell.append(el('span', { class: 'ucb-tl w' + Math.min(+t || 2, 4096), text: t }));
      else if (t === 'X') cell.append(el('span', { class: 'ucb-x', text: '✕' }));
      else if (t === 'O') cell.append(el('span', { class: 'ucb-o', text: '◯' }));
      else if (PIECE[t]) cell.append(el('span', { class: 'ucb-disc ' + PIECE[t], text: t === 'A' || t === 'B' ? '♛' : t === '#' ? '▲' : '' }));
      else if (SEA[t]) { cell.classList.add(SEA[t][0]); cell.textContent = SEA[t][1]; }
      else cell.append(el('span', { class: 'lbl', text: t }));
      g.append(cell);
    }));
    const MAX = { dama: 40, c4: 44, sea: 32, t48: 64, grid: n <= 3 ? 60 : 36 };
    return { grid: g, n, max: MAX[look] || 36 };
  };

  const diagram = d => {
    const out = d.kind === 'sudoku' ? sudoku(d) : d.kind === 'miny' ? miny(d) : board(d);
    let body = out.grid;
    if (d.coords) {
      const h = d.rows.length, cols = el('div', { class: 'ucb-cl' }), rl = el('div', { class: 'ucb-rl' });
      for (let r = 0; r < h; r++) rl.append(el('span', { text: d.coords === 'sea' ? r + 1 : h - r }));
      for (let c = 0; c < out.n; c++) cols.append(el('span', { text: d.coords === 'c4' ? c + 1 : String.fromCharCode(65 + c) }));
      body = el('div', { class: 'ucb-co' }, rl, out.grid, el('span'), cols);
    }
    return el('figure', { class: 'ucb-fig' },
      el('div', { class: 'ucb-dg' + (d.coords ? ' co' : ''), style: `--n:${out.n};--max:${out.max}px`, 'aria-hidden': 'true' }, body),
      el('figcaption', {}, rich(d.caption || '')));
  };

  const block = b => {
    if (b.p != null) return el('p', { class: 'ucb-p' }, rich(b.p));
    if (b.tip != null) return el('div', { class: 'ucb-tip' }, el('strong', { class: 'ucb-tipl', text: 'Trik' }), el('p', {}, rich(b.tip)));
    if (b.list) return el('ul', { class: 'ucb-ul' }, b.list.map(t => el('li', {}, rich(t))));
    if (b.steps) return el('ol', { class: 'ucb-ol' }, b.steps.map(t => el('li', {}, rich(t))));
    if (b.diagram) return diagram(b.diagram);
    return null;
  };

  /* ---------- Poslední otevřená kapitola ---------- */
  const lastRead = {
    all() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } },
    get(id) { const v = this.all()[id]; return typeof v === 'string' ? v : null; },
    set(id, ch) { try { const o = this.all(); o[id] = ch; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* úložiště nedostupné */ } }
  };
  const kapitol = n => n === 1 ? '1 kapitola' : n >= 2 && n <= 4 ? n + ' kapitoly' : n + ' kapitol';
  const gameOf = id => H.byId[id] || { id, name: id, grad: ['#6d28d9', '#4338ca'] };
  const grad = g => `--c1:${(g.grad || [])[0] || '#6d28d9'};--c2:${(g.grad || [])[1] || '#4338ca'}`;

  /* ---------- Čtečka přes celou obrazovku ---------- */
  let cur = null;
  const closeBook = () => {
    if (!cur) return;
    const c = cur; cur = null;
    document.removeEventListener('keydown', c.key, true);
    c.wrap.remove();
    if (c.app) c.app.inert = c.appInert;
    if (c.prev && c.prev.isConnected && typeof c.prev.focus === 'function') { try { c.prev.focus({ preventScroll: true }); } catch (e) { /* nic */ } }
  };
  H.closeBook = closeBook;

  H.openBook = (gameId, chapterId) => {
    const book = B[gameId];
    if (!book || !book.chapters.length) return false;
    const prevFocus = cur ? cur.prev : document.activeElement;
    closeBook();
    const g = gameOf(gameId), chs = book.chapters;
    const body = el('div', { class: 'ucb-body' });
    const back = el('button', { class: 'icon ucb-back', 'aria-label': 'Zpět na obsah', hidden: true, onclick: () => showList() }, H.ico('back'));
    const closeBtn = el('button', { class: 'icon', 'aria-label': 'Zavřít učebnici', text: '✕', onclick: closeBook });
    const panel = el('div', { class: 'ucb-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ucb-title' },
      el('div', { class: 'ucb-head' }, back, el('span', { class: 'tico ucb-tico', style: grad(g) }, H.ico(g.id)),
        el('h2', { id: 'ucb-title', class: 'ucb-title' }, el('span', { class: 'ucb-eb', text: 'Učebnice' }), el('span', { class: 'ucb-gn', text: g.name })), closeBtn),
      body);
    const wrap = el('div', { class: 'modal ucb' }, panel);

    const showList = () => {
      back.hidden = true; body.textContent = '';
      const last = lastRead.get(gameId), lastCh = chs.find(c => c.id === last);
      body.append(el('p', { class: 'ucb-intro', text: book.intro }));
      let first = null;
      if (lastCh) body.append(first = el('button', { class: 'btn primary ucb-cont', onclick: () => showChapter(lastCh.id) }, 'Pokračovat: ' + lastCh.title));
      LEVELS.forEach(lv => {
        const items = chs.filter(c => c.level === lv);
        if (!items.length) return;
        body.append(el('h3', { class: 'ucb-lv', text: lv }), el('div', { class: 'list' }, items.map(c => {
          const b = el('button', { class: 'row ucb-row', onclick: () => showChapter(c.id) },
            el('span', { class: 'ucb-num', 'aria-hidden': 'true', text: chs.indexOf(c) + 1 }),
            el('span', { class: 'rmid' }, el('strong', { text: c.title }), c.id === last ? el('span', { class: 'muted', text: 'Naposledy otevřeno' }) : null),
            el('span', { class: 'ucb-chev', 'aria-hidden': 'true' }, H.ico('right')));
          if (!first) first = b;
          return b;
        })));
      });
      body.scrollTop = 0;
      if (first) first.focus({ preventScroll: true });
    };

    const showChapter = id => {
      const i = chs.findIndex(c => c.id === id);
      if (i < 0) return showList();
      const ch = chs[i], prev = chs[i - 1], next = chs[i + 1];
      lastRead.set(gameId, ch.id);
      back.hidden = false; body.textContent = '';
      const h = el('h3', { class: 'ucb-h', tabindex: '-1', text: ch.title });
      const navBtn = (c, dir) => el('button', { class: 'btn ucb-nb' + (dir > 0 ? ' nx' : ''), onclick: () => showChapter(c.id) },
        el('span', { class: 'ucb-nl', text: dir > 0 ? 'Další ›' : '‹ Předchozí' }), el('span', { class: 'ucb-nt2', text: c.title }));
      body.append(el('p', { class: 'ucb-meta' }, el('span', { class: 'pill', text: ch.level }), el('span', { class: 'muted', text: `Kapitola ${i + 1} z ${chs.length}` })), h,
        ...ch.blocks.map(block).filter(Boolean),
        el('nav', { class: 'ucb-nav', 'aria-label': 'Další kapitoly' },
          prev ? navBtn(prev, -1) : el('button', { class: 'btn ucb-nb', onclick: () => showList() }, el('span', { class: 'ucb-nl', text: '‹ Zpět' }), el('span', { class: 'ucb-nt2', text: 'Obsah' })),
          next ? navBtn(next, 1) : el('button', { class: 'btn ucb-nb nx', onclick: () => showList() }, el('span', { class: 'ucb-nl', text: 'Hotovo ›' }), el('span', { class: 'ucb-nt2', text: 'Obsah' }))));
      body.scrollTop = 0;
      h.focus({ preventScroll: true });
    };

    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBook(); return; }
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll('button:not([disabled]):not([hidden]),[tabindex="0"]')];
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (!panel.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    const app = document.getElementById('app');
    cur = { wrap, key, prev: prevFocus, app, appInert: app ? !!app.inert : false };
    document.body.append(wrap);
    if (app) app.inert = true;
    document.addEventListener('keydown', key, true);
    if (chapterId && chs.some(c => c.id === chapterId)) showChapter(chapterId); else showList();
    return true;
  };

  /* ---------- Záložka Učebnice ---------- */
  H.renderLibrary = main => {
    const games = H.games.filter(g => B[g.id] && B[g.id].chapters.length);
    main.append(el('h1', { text: 'Učebnice' }),
      el('p', { class: 'muted ucb-libi', text: 'Postupy, triky a strategie, se kterými budeš hrát líp. Kapitoly jsou krátké a seřazené od základů po mistrovské finty.' }),
      el('div', { class: 'list' }, games.map(g => {
        const last = lastRead.get(g.id), lc = last && B[g.id].chapters.find(c => c.id === last);
        return el('button', { class: 'row ucb-row', onclick: () => H.openBook(g.id) },
          el('span', { class: 'tico ucb-tico', style: grad(g) }, H.ico(g.id)),
          el('span', { class: 'rmid' }, el('strong', { text: g.name }), el('span', { class: 'muted', text: lc ? 'Naposledy: ' + lc.title : B[g.id].intro })),
          el('span', { class: 'pill', text: kapitol(B[g.id].chapters.length) }));
      })));
  };
})();
