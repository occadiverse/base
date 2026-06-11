Portalstruktur
Dette er første ryddige versjon av portalen. Målet i denne runden er å beholde funksjonen, men flytte felles kode ut av index.html.

Mapper
index.html inneholder app-skallet og HTML-visningene.
assets/css/base.css inneholder global styling som gjelder hele portalen.
assets/js/config/tailwind.config.js inneholder felles Tailwind/BSK-farger.
assets/js/state.js setter opp global app-tilstand.
assets/js/firebase-sync.js håndterer Firestore og lokal fallback.
assets/js/app.js inneholder dagens app-logikk.
assets/js/components/ er klargjort for felles komponenter som sidebar, topbar og modaler.
assets/js/pages/ er klargjort for senere flytting av side-spesifikk logikk.

Neste naturlige steg
Flytte sidebar, mobilmeny og actionbar til assets/js/components/.
Splitte app.js i fagområder: kamper, spillere, oppmøte, statistikk og taktikk.
Flytte hver stor HTML-visning ut i egne templates eller render-funksjoner.
Bytte Tailwind CDN til en lokal build hvis portalen skal publiseres mer profesjonelt.
