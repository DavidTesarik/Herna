# Herna

Sbírka rychlých her do kapsy. Běží celá v telefonu, i bez internetu, bez účtu a bez reklam.

## Co v ní je

- **Piškvorky** – 3×3 nebo 5 v řadě (pole 9×9), varianta Zmizík
- **Čtyři v řadě** – varianta Překážky
- **Závod** – tři pruhy, překážky, mince a soupeř řízený počítačem, varianta Noční jízda
- **Miny** – první ťuk je vždy bezpečný, varianta Na čas
- **Pexeso** proti počítači – varianta Velké pole
- **2048** – varianta Mini 3×3
- **Had** – varianta Portály
- **Sudoku** – generované zadání s jediným řešením, poznámky, varianta Tři životy
- **Slovo** – hádání českého slova z pěti písmen bez diakritiky, varianta Přísný režim
- **Lodě** proti počítači – varianta Velké moře
- **Dáma** proti počítači – varianta Dobrovolné braní

**Město:** každá hra odemyká jednu budovu, která sama vydělává mince (i když je appka zavřená, nejdéle 8 hodin; strop jde vylepšit). Výhra zapne budově na 10 minut dvojnásobný výdělek, úroveň hry zvedá strop úrovně budovy a odznaky přidávají trvalý násobič. Sídlo se podle součtu úrovní budov viditelně rozrůstá ve dvanácti stupních: Osada, Vesnice, Městečko, Město, Velkoměsto, Metropole, Země, Planeta, Sluneční soustava, Galaxie, Vesmír a Mnohovesmír. Každý stupeň má vlastní obrázek a přidá 10 % k výdělku.

Čtyři obtížnosti (Lehká, Střední, Těžká, Nemožná), XP a level hráče, vlastní úroveň každé hry (odemyká variantu), mince, obchod se skiny a vylepšeními, denní výzvy, odznaky a statistiky. Rozehrané piškvorky, čtyři v řadě, miny, 2048, sudoku, slovo, lodě a dáma se samy ukládají a příště pokračuješ.

Poctivá poznámka k obtížnosti Nemožná: v piškvorkách 3×3 počítač opravdu nejde porazit (nejlépe remíza). V ostatních hrách hraje, jak nejsilněji umí, ale matematicky neporazitelný není.

Slovo přijme jako pokus jakoukoli pětici písmen (appka nemá celý český slovník), hádaná slova jsou z vlastního seznamu 335 slov. V Dámě se braní provádí hned a kámen, který při braní dojde na poslední řadu, tam skončí.

Na počítači fungují šipky (2048, Had, Závod, Sudoku), čísla (Sudoku) a písmena (Slovo) a klávesa Tab pro procházení tlačítek.

## 1. Nahrání na GitHub
**Přes web (bez instalace čehokoliv):**
1. Na github.com vpravo nahoře **+ → New repository**, zadej název (např. `herna`), nech **Public** a klikni **Create repository**.
2. Klikni **uploading an existing file**, přetáhni **obsah** rozbalené složky (ne složku samotnou — `index.html` musí být v kořeni repa) a dej **Commit changes**.

**Přes git:**

    git init && git add . && git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/TVOJE-JMENO/herna.git
    git push -u origin main

## 2. Zapnutí GitHub Pages
1. V repu **Settings → Pages**.
2. **Source: Deploy from a branch**, **Branch: main**, složka **/ (root)** → **Save**.
3. Za 1–2 minuty bude appka na `https://TVOJE-JMENO.github.io/herna/` (odkaz se objeví nahoře na stránce Pages).

Pozn.: Na bezplatném účtu musí být repo **Public**. Postup ve hrách se na GitHub neukládá — zůstává jen v tvém telefonu.

## 3. Přidání na plochu telefonu
- **iPhone:** otevři odkaz v **Safari** → tlačítko **Sdílet** (čtvereček se šipkou) → **Přidat na plochu** → **Přidat**.
- **Android:** otevři odkaz v **Chrome** → menu **⋮** → **Instalovat aplikaci** (nebo **Přidat na plochu**).

Appka se pak spouští z ikony na celou obrazovku a funguje i bez internetu. Na iPhonu má appka na ploše vlastní úložiště oddělené od Safari, takže hraj rovnou z ikony.

## 4. Aktualizace appky
Nahraj změněné soubory do repa (přes web: **Add file → Upload files**, přepiš je) a v souboru `sw.js` zvyš `VERSION` (např. `v1` → `v2`), jinak telefon drží starou verzi. Po zhruba minutě se nová verze stáhne při dalším otevření appky (někdy je potřeba appku zavřít a otevřít dvakrát).

## 5. Záloha dat
V appce **Nastavení → Data → Exportovat**. Zálohuj občas, hlavně před výměnou telefonu. Obnova: **Importovat**.
