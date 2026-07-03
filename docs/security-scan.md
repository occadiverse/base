# Sikkerhets- og event-scan

**Dato:** 3. juli 2026  
**Type:** Read-only skanning (ingen kodeendringer i denne runden)

## Kort status

### Filer delvis/fullt ryddet (event delegation + escape)

| Fil | Omfang |
|-----|--------|
| `assets/js/pages/players.js` | Tropp/lag: `data-player-id`, `data-team-action`, delegation. Ingen inline `onclick`/`onkeydown` i dynamisk HTML. |
| `assets/js/pages/matches.js` | Kampliste + kampkort: `data-match-action`, `bindMatchListEvents()`. Kampplan/spillerbørs uendret. |
| `assets/js/pages/attendance.js` | Dagliste, aktivitetskort, oppmøterader, event-tabell: `data-attendance-action`, delegation. |
| `assets/js/pages/dashboard.js` | Hero + bunnwidgets: `data-dashboard-action`, `bindDashboardEvents()`. Ingen inline handlers i dynamisk HTML. |

### Filer med escape, men fortsatt inline handlers

`statistics.js`, `matches.js` (kampplan/spillerbørs), `tactics.js`, `modals.js`, `navigation.js`, `index.html`

### Ingen `insertAdjacentHTML` funnet i prosjektet

---

## Gjenværende inline handlers (`onclick="` / `onkeydown="` / `onchange="`)

### Dynamisk HTML i JavaScript (prioritert)

| Fil | Linje(r) | Kontekst | Risiko |
|-----|----------|----------|--------|
| `statistics.js` | 441, 1081, 1893, 1944 | Spillerkort/rader: `openSpillerDetail(name)` | Medium — navn escaped via `escapeStatsJsString`/`safeName` |
| `statistics.js` | 2558, 2659 | Kampkontekst: `openMatchStatsEditor(match.id)` | Lav–medium — UUID, ikke escaped i JS-streng |
| `statistics.js` | 976 | Dynamisk `clickHandler` i metrikk | Medium — avhenger av handler-bygger |
| `statistics.js` | 1598, 2024 | Seksjon/sortering med `section.id` / `opt.id` | Lav — kontrollerte ID-er |
| `statistics.js` | 879, 1457–1460, 1737–1739, 2173, 2225, 2243, 2549, 2920 | UI-knapper (statisk funksjon) | Lav |
| `matches.js` | 967–1390, 1837–1853, 2449–2453 | Kampplan (11-er, benk, dødball, tabs) | Lav — IDs escaped med `escapeMatchJsString` |
| `matches.js` | 2106, 2144–2187 | Kampdetalj: oppmøte, panel-toggle, lagre stats | Lav — statiske funksjoner |
| `matches.js` | 2889–2930 | Spillerbørs: `toggleBenchOnly`, kort, MOTM | Medium — `data-player`/`data-player-id` escaped, men inline onclick |
| `matches.js` | 1193, 1251, 1371, 1381, 2912 | `onchange` i kampplan/spillerbørs | Lav — IDs escaped |
| `modals.js` | 112 | Skade-modal: `markSessionInjuryPlayerHealthy` | Medium — `playerId` er HTML-escaped, brukt i JS-streng (bør være JS-escape) |
| `navigation.js` | 34, 49, 63, 75, 85, 89, 93, 112 | Sidebar/mobilnav: `switchTab(...)` | Lav — statiske tab-ID-er fra config |
| `attendance.js` | — | Ingen `onclick="` i dynamisk HTML | ✅ |

### `setAttribute('onclick', ...)`

| Fil | Linje | Kontekst |
|-----|-------|----------|
| `attendance.js` | 656, 697 | Aktivitetsmodal header (lukk/slett) |
| `matches.js` | 1909, 1928 | Kampmodal header (slett/lukk) |

### Programmatisk `.onclick =` (ikke HTML-string)

| Fil | Linje | Kontekst | Risiko |
|-----|-------|----------|--------|
| `attendance.js` | 427 | Kalendercelle → `selectCalendarDate` | Lav |
| `tactics.js` | 505, 534 | Spillervalg-modal | Lav |
| `matches.js` | 2476, 2502, 2571 | Kampplan spillervalg | Lav |
| `modals.js` | 251, 264, 268 | Confirm-modal, backdrop | Lav — init-tid |

### Statisk HTML (`index.html`) — 50+ `onclick`, 7 `onchange`

Faste knapper, taktikkbanenodes, modaler, filtre. **Lav XSS-risiko** (ingen brukerdata i attributter). Større opprydding krever HTML-endring, ikke prioritert før dynamiske JS-områder.

### Fjernet i oppryddingen

- `onkeydown="` i dynamisk HTML: **0 treff** (tidligere i `dashboard.js`)
- `players.js`, `dashboard.js` dynamisk HTML: **0** `onclick="`

---

## `innerHTML` / dynamisk data

| Fil | Antall | Dynamisk brukerdata | Escape | Merknad |
|-----|--------|---------------------|--------|---------|
| `players.js` | 7 | Navn, lag, posisjon | ✅ `escapeRosterHtml` | Ryddet |
| `dashboard.js` | 10 | Spillere, kamp, skade, notater | ✅ `escapeDashboardHtml` | Ryddet |
| `attendance.js` | 17 | Tittel, sted, spillernavn, kalender | ✅ `escapeAttendanceHtml` | Ryddet |
| `matches.js` | 35 | Motstander, spillere (liste/kort) | ✅ `escapeMatchHtml` i liste/kort | Kampplan/spillerbørs: escaped der det gjelder navn |
| `statistics.js` | 30 | Spillernavn, kamp, notater | ✅ `escapeStatsHtml` (de fleste) | Noen `onclick` gjenstår |
| `tactics.js` | 14 | Spillernavn, posisjon | ✅ `escapeTacticalHtml` | Benk/noder OK |
| `modals.js` | 2 | Skade/varsellister | ✅ `escapeModalHtml` | Se onclick-linje 112 |
| `navigation.js` | 1 | Tab-navn fra config | Delvis — statiske labels | Lav risiko |

### Lav risiko (statisk innhold)

- `innerHTML = ''` (tøm container)
- Ikoner, statiske meldinger («Ingen kamper», modal-titler med fast tekst)
- `svg.innerHTML = ''`, `<option>`-lister med kontrollert tekst

---

## `JSON.parse` og `localStorage`

| Fil | Linje | Kode | Try/catch / validering |
|-----|-------|------|------------------------|
| `firebase-sync.js` | 102 | `getCachedCollection` → `JSON.parse` | ✅ try/catch, array-sjekk |
| `firebase-sync.js` | 511 | `readSingleTeamMigrationState` | ✅ try/catch |
| `firebase-sync.js` | 177, 217, 243, 269, 519 | `localStorage.setItem` (sync cache) | ✅ egen data fra app |
| `players.js` | 690 | `markPlayerHealthy` → `localStorage.setItem(players)` | ⚠️ Direkte skriv utenom `firebase-sync` — kan drifte fra Firebase |

Ingen ubeskyttet `JSON.parse` utenfor `firebase-sync.js`.

---

## `data-*-id` i HTML-strenger (etter opprydding)

| Fil | Attributt | Escape |
|-----|-----------|--------|
| `players.js` | `data-player-id`, `data-team-id` | ✅ |
| `matches.js` | `data-match-id`, `data-player-id` (spillerbørs) | ✅ |
| `attendance.js` | `data-event-id`, `data-player-id` | ✅ |
| `dashboard.js` | `data-match-id`, `data-event-id` | ✅ |

Gjenstående `data-player` (navn/ref) i spillerbørs bruker escape-attributter — se `matches.js` ~2889+.

---

## Topp 5 anbefalte neste oppgaver

1. **`statistics.js` — spillerlister og klikkbare kort**  
   Bytt `onclick="openSpillerDetail(...)"` på spillerrader/metrikk-kort til `data-stats-action` + delegation (samme mønster som tropp). Høy brukerfrekvens, navn i attributter.

2. **`matches.js` — spillerbørs i kampdetaljer**  
   Erstatt inline `onclick` på BENK/kort/MOTM-rader med `data-match-stats-action` + delegation. Behold eksisterende escape på `data-player-id`.

3. **`modals.js` — skade-modal «Marker frisk»**  
   Fjern inline `onclick`; bruk `data-player-id` + delegation. Rett opp at `playerId` i onclick bruker HTML-escape i stedet for JS-escape.

4. **`matches.js` — kampdetalj-chips (oppmøte, panel-toggle)**  
   Liten pakke: `data-match-action` for oppmøte-knapp og panel-toggles i `showMatchDetails` (utvider eksisterende `bindMatchListEvents` eller egen container på `#kampdetaljer-info`).

5. **`dashboard.js` — død kode + `players.js` localStorage**  
   Fjern ubrukte `activateDashboardCardFromKeyboard` / `escapeDashboardJsString`. Vurder om `markPlayerHealthy` skal bruke `savePlayerToDatabase` i stedet for direkte `localStorage.setItem` (dataconsistens, ikke XSS).

---

## Manuell smoke-test etter neste runde

Se `docs/smoke-test.md` — prioritér:

- Statistikk → åpne spiller fra liste
- Kampdetaljer → spillerbørs (benk, kort, MOTM)
- Skade-modal fra dashboard → «Marker frisk»
- XSS: spillernavn/motstander med `<script>alert(1)</script>` i statistikk og spillerbørs
