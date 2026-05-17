import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Henter elementer fra testsiden
const btnTestLogg = document.getElementById('btnTestLogg');
const btnTestLag = document.getElementById('btnTestLag');
const testOutput = document.getElementById('testOutput');

let testSpillerliste = [];

// --- 1. HENT EKTE DATA FRA FIREBASE TIL TESTMILJØET ---
onValue(ref(db, 'players'), (snapshot) => {
    try {
        const data = snapshot.val() || {};
        testSpillerliste = Object.entries(data).map(([id, values]) => ({
            id: id,
            ...values
        }));
        
        console.log("Sandkasse: Data lastet suksessfullt fra Firebase. Antall spillere:", testSpillerliste.length);
        if (testOutput) testOutput.innerText = `Firebase-tilkobling OK!\nFant ${testSpillerliste.length} spillere i databasen.`;
    } catch (err) {
        console.error("Sandkasse-feil under lasting av Firebase-data:", err);
        if (testOutput) testOutput.innerText = "Feil under lasting av data: " + err.message;
    }
});

// --- 2. KNAPP: LOGG ALLE SPILLERE TIL KONSOLLEN ---
if (btnTestLogg) {
    btnTestLogg.addEventListener('click', () => {
        console.log("--- ALLE SPILLERE I DATABASEN ---");
        console.table(testSpillerliste); // Lager en dritlekker tabell i F12-konsollen!
        
        if (testOutput) {
            testOutput.innerText = `Sjekk F12-konsollen i nettleseren for en detaljert tabelloversikt over alle ${testSpillerliste.length} spillere.`;
        }
    });
}

// --- 3. KNAPP: TEST SIMULERING AV FLERE LAG ---
if (btnTestLag) {
    btnTestLag.addEventListener('click', () => {
        // Her simulerer vi en filtrering. Siden ingen har 'lag'-feltet ennå, 
        // vil vi kode det slik at hvis 'lag' mangler, regnes de som 'A-lag'.
        
        const simulatedALag = testSpillerliste.filter(s => !s.lag || s.lag === 'A-lag');
        const simulatedBLag = testSpillerliste.filter(s => s.lag === 'B-lag');

        let rapport = "=== SIMULERING AV LAG-OPPDELING ===\n\n";
        rapport += `Totalt i troppen: ${testSpillerliste.length} spillere\n`;
        rapport += `Antall på A-lag (eller uten lag-felt): ${simulatedALag.length}\n`;
        rapport += `Antall på B-lag: ${simulatedBLag.length}\n\n`;
        
        rapport += "Navn på de 5 første A-lagsspillerne:\n";
        simulatedALag.slice(0, 5).forEach(s => {
            rapport += `- ${s.navn} (Nåværende lagfelt i database: ${s.lag || 'Ikke satt (A-lag)'})\n`;
        });

        if (testOutput) testOutput.innerText = rapport;
        console.log("Lag-simulering ferdig kjørt.");
    });
}
