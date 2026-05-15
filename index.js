import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const nextOpponentEl = document.getElementById('dashNextOpponent');
const nextDateEl = document.getElementById('dashNextDate');
const nextTimeEl = document.getElementById('dashNextTime');
const nextPitchEl = document.getElementById('dashNextPitch');

onValue(ref(db, 'matches'), (snapshot) => {
    const data = snapshot.val() || {};
    
    // Gjør om Firebase-objektet til en liste (array) slik du gjør i kamper.js
    const allMatches = Object.entries(data).map(([id, match]) => ({ id, ...match }));
    
    const nå = new Date();

    // 1. Filtrer ut kamper ved å bruke nøyaktig samme datometode som kamper.js
    let kommendeKamper = allMatches.filter(m => {
        if (!m.date) return false;
        const kampDato = new Date(m.date + "T23:59:59");
        return kampDato >= nå; // Sørger for at den blir stående ut dagen
    });

    // 2. Sorter dem kronologisk (den nærmeste kampen først)
    kommendeKamper.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    // 3. Plukk ut den aller første kampen i den sorterte listen (neste kamp)
    const nesteKamp = kommendeKamper[0];

    // 4. Oppdater grensesnittet
    if (nesteKamp) {
        // Formater datoen fra YYYY-MM-DD til DD.MM.YYYY for visning på kortet
        let visningsDato = nesteKamp.date;
        if (nesteKamp.date.includes('-')) {
            const deler = nesteKamp.date.split('-');
            if (deler.length === 3) {
                visningsDato = `${deler[2]}.${deler[1]}.${deler[0]}`;
            }
        }

        if (nextOpponentEl) nextOpponentEl.innerText = nesteKamp.opponent || "Ukjent motstander";
        if (nextDateEl) nextDateEl.innerText = visningsDato;
        if (nextTimeEl) nextTimeEl.innerText = "kl. " + (nesteKamp.time || "--:--");
        if (nextPitchEl) nextPitchEl.innerText = nesteKamp.pitch || "Ikke satt";
    } else {
        if (nextOpponentEl) nextOpponentEl.innerText = "Ingen kommende kamper";
        if (nextDateEl) nextDateEl.innerText = "Sesongplan ikke klar";
        if (nextTimeEl) nextTimeEl.innerText = "--:--";
        if (nextPitchEl) nextPitchEl.innerText = "Ikke satt";
    }
});
