import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const statsBody = document.getElementById('statsBody');
const periodSelect = document.getElementById('statPeriodSelect');

let globalData = null; // Lagrer kopi av data for filter-bytte uten ny henting

// --- INITIALISERING ---
onValue(ref(db, '/'), (snapshot) => {
    globalData = snapshot.val() || {};
    oppdaterStatistikk();
});

// Lytt til endringer i dropdown
periodSelect.addEventListener('change', oppdaterStatistikk);

function oppdaterStatistikk() {
    if (!globalData) return;

    const players = globalData.players || {};
    const attendance = globalData.attendance || {};
    const valg = periodSelect.value;

    const stats = beregnLogikk(players, attendance, valg);
    renderTabell(stats);
}

// --- BEREGNINGSLOGIKK ---
function beregnLogikk(players, attendance, periode) {
    const nå = new Date();
    const inneværendeMåned = nå.getMonth() + 1; // 1-12
    const inneværendeÅr = nå.getFullYear();

    // 1. Finn relevante datoer basert på filter
    const alleDatoer = Object.keys(attendance);
    const relevanteDatoer = alleDatoer.filter(datoStr => {
        if (periode === 'total') return true;
        
        // Formatet vårt er DD-MM-YYYY
        const [dag, mnd, år] = datoStr.split('-').map(Number);
        return mnd === inneværendeMåned && år === inneværendeÅr;
    });

    const totaltMulige = relevanteDatoer.length;

    // 2. Beregn per spiller
    const resultat = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv') // Tar kun med aktive spillere
        .map(([id, pData]) => {
            let treninger = 0;
            let kamper = 0;

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    const type = attendance[dato].info?.type;
                    if (type === 'Kamp') kamper++;
                    else treninger++; // Standard er Trening
                }
            });

            const oppmøtt = treninger + kamper;
            const prosent = totaltMulige > 0 ? Math.round((oppmøtt / totaltMulige) * 100) : 0;

            return {
                navn: pData.navn,
                treninger,
                kamper,
                prosent
            };
        });

    // Sorter etter høyest prosent
    return resultat.sort((a, b) => b.prosent - a.prosent);
}

// --- VISNING ---
function renderTabell(statsArray) {
    statsBody.innerHTML = statsArray.map(s => `
        <tr>
            <td class="name-col"><strong>${s.navn}</strong></td>
            <td>${s.treninger}</td>
            <td>${s.kamper}</td>
            <td class="stat-col">
                <span class="status-pill" style="background: ${getFarge(s.prosent)}; color: white; width: 50px; display: inline-block;">
                    ${s.prosent}%
                </span>
            </td>
        </tr>
    `).join('');
}

function getFarge(prosent) {
    if (prosent >= 75) return '#2ecc71'; // Grønn
    if (prosent >= 50) return '#f1c40f'; // Gul
    return '#e74c3c'; // Rød
}
