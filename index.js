import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Hent HTML-elementene vi skal fylle med data
const nextOpponentEl = document.getElementById('dashNextOpponent');
const nextDateEl = document.getElementById('dashNextDate');
const nextTimeEl = document.getElementById('dashNextTime');
const nextPitchEl = document.getElementById('dashNextPitch');

onValue(ref(db, 'matches'), (snapshot) => {
    const matches = snapshot.val() || {};
    
    const nå = new Date();
    nå.setHours(0, 0, 0, 0); // Nullstiller klokken for ren datosammenligning

    let nesteKamp = null;
    let nærmesteTid = Infinity;

    // Gå gjennom alle kamper og finn den som er i fremtiden og nærmest akkurat nå
    Object.values(matches).forEach(m => {
        if (!m.date) return;
        
        // Konverterer datoformatet ditt (DD-MM-YYYY) til et Date-objekt nettleseren forstår
        const deler = m.date.split('-');
        if (deler.length !== 3) return;
        const kampDato = new Date(`${deler[2]}-${deler[1]}-${deler[0]}`);
        kampDato.setHours(0, 0, 0, 0);

        // Hvis kampen er i dag eller i fremtiden
        if (kampDato >= nå) {
            const tidsDiff = kampDato.getTime() - nå.getTime();
            
            // Sjekker om denne kampen ligger tettere på enn de andre vi har sett
            if (tidsDiff < nærmesteTid) {
                nærmesteTid = tidsDiff;
                nesteKamp = m;
            }
        }
    });

    // Hvis vi fant en kommende kamp, oppdaterer vi kortet
    if (nesteKamp) {
        if (nextOpponentEl) nextOpponentEl.innerText = nesteKamp.opponent || "Ukjent motstander";
        if (nextDateEl) nextDateEl.innerText = nesteKamp.date || "Dato ikke satt";
        if (nextTimeEl) nextTimeEl.innerText = (nesteKamp.time || "Klokkeslett ikke satt") + " og her";
        if (nextPitchEl) nextPitchEl.innerText = nesteKamp.pitch || "Bane ikke spesifisert";
    } else {
        // Hvis alle kamper i databasen er spilt
        if (nextOpponentEl) nextOpponentEl.innerText = "Ingen kommende kamper satt opp";
        if (nextDateEl) nextDateEl.style.display = 'none';
        if (nextTimeEl) nextTimeEl.style.display = 'none';
        if (nextPitchEl) nextPitchEl.style.display = 'none';
    }
});
