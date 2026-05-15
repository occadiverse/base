import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const nextOpponentEl = document.getElementById('dashNextOpponent');
const nextDateEl = document.getElementById('dashNextDate');
const nextTimeEl = document.getElementById('dashNextTime');
const nextPitchEl = document.getElementById('dashNextPitch');

onValue(ref(db, 'matches'), (snapshot) => {
    const matches = snapshot.val() || {};
    
    const nå = new Date(); // Henter nøyaktig tidspunkt akkurat nå (Dato + klokkeslett)

    let nesteKamp = null;
    let nærmesteTid = Infinity;

    Object.values(matches).forEach(m => {
        if (!m.date) return;
        
        // Splitter DD-MM-YYYY
        const deler = m.date.split('-');
        if (deler.length !== 3) return;
        
        // Hent klokkeslett hvis det finnes (f.eks. "19:30"), hvis ikke sett til 00:00
        const tid = m.time || "00:00";
        const [timer, minutter] = tid.split(':');

        // Opprett et ekte Date-objekt for kampen med riktig dato og klokkeslett
        const kampDato = new Date(deler[2], deler[1] - 1, deler[0], timer || 0, minutter || 0);

        // Hvis kampen er i fremtiden (eller skjer akkurat nå)
        if (kampDato.getTime() >= nå.getTime()) {
            const tidsDiff = kampDato.getTime() - nå.getTime();
            
            // Vi vil ha den som ligger *nærmest* nåtid
            if (tidsDiff < nærmesteTid) {
                nærmesteTid = tidsDiff;
                nesteKamp = m;
            }
        }
    });

    // Oppdater HTML med den faktiske neste kampen
    if (nesteKamp) {
        if (nextOpponentEl) nextOpponentEl.innerText = nesteKamp.opponent || "Ukjent motstander";
        if (nextDateEl) nextDateEl.innerText = nesteKamp.date || "Dato ikke satt";
        if (nextTimeEl) nextTimeEl.innerText = nesteKamp.time || "Klokkeslett ikke satt";
        if (nextPitchEl) nextPitchEl.innerText = nesteKamp.pitch || "Bane ikke spesifisert";
    } else {
        if (nextOpponentEl) nextOpponentEl.innerText = "Ingen kommende kamper";
        if (nextDateEl) nextDateEl.innerText = "Neste sesongplan i vente";
        if (nextTimeEl) nextTimeEl.innerText = "--:--";
        if (nextPitchEl) nextPitchEl.innerText = "Ikke satt";
    }
});
