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
- [ ] **Registrere oppmøte på kamp/aktivitet** — Oppmøtestatus lagres og vises ved ny åpning av modal.

## Kampdetaljer og statistikk

- [ ] **Åpne kampdetaljer** — Riktig motstander, dato, oppmøteliste og faner lastes uten feil.
- [ ] **Endre mål, assist, spillerbørs og kort** — Verdier lagres og vises i kampdetaljer/statistikk.
- [ ] **Dashboard viser riktig neste kamp/hero** — Ingen tomme eller feil kort etter datalasting.
- [ ] **Statistikk-siden viser spillere og tall** — Sortering og filtre fungerer uten konsollfeil.

## Taktikk og kampplan

- [ ] **Velge kamp i taktikk og plassere spillere** — Banen og benk oppdateres visuelt.
- [ ] **Lagre taktikk** — Oppstilling og roller er der ved reload/nytt kampvalg.
- [ ] **Bruke kampplan (11-er, dødball, bytteplan)** — Endringer lagres og vises i kampdetaljer.

## Sikkerhet (XSS)

- [ ] **Spillernavn med `<script>alert(1)</script>`** — Vises som vanlig tekst overalt (tropp, statistikk, taktikk); ingen popup.
- [ ] **Motstander/aktivitetstittel med HTML-tegn** — Vises escaped i liste, kalender og kampdetaljer.

## Feilhåndtering og offline

- [ ] **Valideringsfeil viser alert, modal forblir åpen** — F.eks. tom motstander eller navn gir melding uten at skjema lukkes.
- [ ] **Firebase-feil ved lagring** (simuler med nettverk av / blokkert request) — Alert med feilmelding; data lagres ikke som om alt gikk bra.
- [ ] **Lokal modus uten Firebase** (hvis tilgjengelig) — Opprette/redigere kamp og aktivitet fungerer mot localStorage.

---

**Signert av:** _______________ **Dato:** _______________ **Commit/branch:** _______________
