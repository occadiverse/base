# Portalstruktur

Dette er første ryddige versjon av portalen. Målet i denne runden er å beholde funksjonen, men flytte felles kode ut av `index.html`.

## Mapper

- `index.html` inneholder app-skallet og HTML-visningene.
- `assets/css/base.css` inneholder global styling som gjelder hele portalen.
- `assets/js/config/tailwind.config.js` inneholder felles Tailwind/BSK-farger.
- `assets/js/state.js` setter opp global app-tilstand.
- `assets/js/app-shell.js` håndterer bekreftelsesmodal, fanebytte, admin-opplåsing og små app-hjelpere.
- `assets/js/domain/scoring.js` inneholder poengberegning og kort-/karantenelogikk som brukes av flere deler av portalen.
- `assets/js/firebase-sync.js` håndterer Firestore og lokal fallback.
- `assets/js/app.js` inneholder dagens app-logikk.
- `assets/js/components/navigation.js` renderer sidebar, mobilheader, actionbar, mobilmeny og floating action-knapp.
- `assets/js/components/` er klargjort for flere felles komponenter som modaler og toppfelt.
- `assets/js/pages/` er klargjort for senere flytting av side-spesifikk logikk.

## Neste naturlige steg

1. Splitte resten av `app.js` i fagområder: kamper, spillere, oppmøte, statistikk og taktikk.
2. Flytte hver stor HTML-visning ut i egne templates eller render-funksjoner.
3. Flytte modaler til egne komponenter når app-logikken er enklere å dele.
4. Bytte Tailwind CDN til en lokal build hvis portalen skal publiseres mer profesjonelt.
