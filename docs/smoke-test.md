# Smoke-test sjekkliste

Kjør etter kodeendringer. Test i nettleser med hard refresh (Cmd+Shift+R). Kryss av når forventet resultat er oppfylt.

## Oppstart og data

- [ ] **Appen laster uten feil i konsollen** — Dashboard vises med kamper/spillere/aktiviteter som før.
- [ ] **Data synkroniseres fra Firebase** (hvis aktivert) — Endringer fra annen økt/tab dukker opp etter refresh eller live sync.

## Spillere

- [ ] **Opprette spiller med gyldig navn og fødselsår** — Spilleren vises i troppen med riktige felt.
- [ ] **Avvise tom spiller uten navn** — Alert vises; ingen ny spiller lagres.
- [ ] **Redigere spiller** — Endringer lagres og vises etter lukking av modal.
- [ ] **Slette spiller** — Spilleren forsvinner fra troppen etter bekreftelse.

## Lag

- [ ] **Redigere lag (navn/trener)** — Laginfo oppdateres i admin og brukes i resten av appen.
- [ ] **Avvise tomt lagnavn** — Alert vises; laget lagres ikke.
- [ ] **Slette lag er blokkert** — Alert om at appen er låst til ett lag; ingenting slettes.

## Kamper

- [ ] **Opprette kamp med dato og motstander** — Kampen vises i kamper-liste og kalender.
- [ ] **Avvise kamp uten dato eller motstander** — Alert vises; kampen lagres ikke.
- [ ] **Redigere kamp** — Eksisterende kampdata (f.eks. resultat, oppmøte) beholdes der det ikke endres.
- [ ] **Slette kamp** — Kampen forsvinner fra liste og kalender etter bekreftelse.

## Aktiviteter og oppmøte

- [ ] **Opprette aktivitet med dato** — Aktiviteten vises i kalender/dagsplan.
- [ ] **Avvise aktivitet uten dato** — Alert vises; aktiviteten lagres ikke.
- [ ] **Registrere oppmøte (presence-only)** — Kun avkryssede spillere lagres; avkryssing fjernet fjerner spilleren fra listen (ingen `false`/forfall).
- [ ] **Lagre uten noen avkrysset** — Viser «Ingen registrert med oppmøte», ikke stat-fallback i tropp.
- [ ] **Teller `X/Y møtt opp`** — Vises i kalender, dashboard og detaljsider etter første lagring; skjules før oppmøte er registrert.
- [ ] **Inline lagringsstatus fra kalender/dashboard** — Grønn melding i modal (~1,3 s), deretter toast nederst på skjermen.
- [ ] **Inline lagringsstatus fra kampdetaljer/øktside** — Melding under Kamptropp / Møtt opp etter lagring.
- [ ] **Trening: åpne øktside** — Fokus, møtt opp og grupper vises.
- [ ] **Annet: åpne aktivitet** — Hero + møtt opp-liste (uten fokus/grupper).
- [ ] **Kalender: snarvei til kampdetaljer** — Skjold-knapp på kampkort åpner kampdetaljer.
- [ ] **Kalender: snarvei til aktivitet** — 📋-knapp åpner øktside/aktivitet.

## Kampdetaljer og statistikk

- [ ] **Åpne kampdetaljer** — Riktig motstander, dato, kamptropp (`X/Y`-badge) og faner lastes uten feil.
- [ ] **Spillerbørs: «Kun oppmøte» vs oppmøte** — Intro-tekst forklarer forskjellen; benk-knapp markerer kun oppmøtepoeng, ikke oppmøteregistrering.
- [ ] **Endre mål, assist, spillerbørs og kort** — Verdier lagres og vises i kampdetaljer/statistikk.
- [ ] **Statistikk viser «Benk» (ikke «Kun oppmøte») i poengfordeling** — Skiller benkspiller fra spillere som bidro på banen.
- [ ] **Dashboard viser riktig neste kamp/økt** — `X/Y møtt opp` eller «Oppmøte ikke registrert».
- [ ] **Statistikk-siden viser spillere og tall** — Sortering og filtre fungerer uten konsollfeil.

## Taktikk og kampplan

- [ ] **Velge kamp i taktikk og plassere spillere** — Banen og benk oppdateres visuelt.
- [ ] **Taktikk viser ✅ MED for møtt opp** — Ingen forfall/ikke-svart-chips.
- [ ] **Lagre taktikk** — Oppstilling og roller er der ved reload/nytt kampvalg.
- [ ] **Bruke kampplan (11-er, dødball, bytteplan)** — Endringer lagres og vises i kampdetaljer.

## Sikkerhet (XSS)

- [ ] **Spillernavn med `<script>alert(1)</script>`** — Vises som vanlig tekst overalt (tropp, statistikk, taktikk); ingen popup.
- [ ] **Motstander/aktivitetstittel med HTML-tegn** — Vises escaped i liste, kalender og kampdetaljer.

## Feilhåndtering og offline

- [ ] **Valideringsfeil viser alert, modal forblir åpen** — F.eks. tom motstander eller navn gir melding uten at skjema lukkes.
- [ ] **Firebase-feil ved lagring** (simuler med nettverk av / blokkert request) — Alert med feilmelding; data lagres ikke som om alt gikk bra.
- [ ] **Lokal modus uten Firebase** (hvis tilgjengelig) — Opprette/redigere kamp og aktivitet fungerer mot localStorage; oppmøte oppdaterer kalender umiddelbart.

---

**Signert av:** _______________ **Dato:** _______________ **Commit/branch:** _______________
