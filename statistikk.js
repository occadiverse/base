import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const statsBody = document.getElementById('statsBody');
const periodSelect = document.getElementById('statPeriodSelect');

let globalData = null;

// --- INITIALISERING ---
onValue(ref(db, '/'), (snapshot) => {
    globalData = snapshot.val() || {};
    oppdaterStatistikk();
});

periodSelect.addEventListener('change', oppdaterStatistikk);

function oppdaterStatistikk() {
    if (!globalData) return;

    const players = globalData.players || {};
    const attendance = globalData.attendance || {};
    const matches = globalData.matches || {};
    const valg = periodSelect.value;

    const stats = beregnLogikk(players, attendance, matches, valg);
    renderTabell(stats);
    oppdaterHero(stats, matches, valg);
}

// --- BEREGNINGSLOGIKK ---
function beregnLogikk(players, attendance, matches, periode) {
    const nå = new Date();
    const inneværendeMåned = nå.getMonth() + 1;
    const inneværendeÅr = nå.getFullYear();

    // Finn relevante datoer (Oppmøte)
    const alleDatoer = Object.keys(attendance);
    const relevanteDatoer = alleDatoer.filter(datoStr => {
        if (periode === 'total') return true;
        const [dag, mnd, år] = datoStr.split('-').map(Number);
        return mnd === inneværendeMåned && år === inneværendeÅr;
    });

    const totaltMulige = relevanteDatoer.length;

    // Beregn per spiller
    const resultat = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = pData.navn || pData.name;
            let treninger = 0;
            let kamperOppmøte = 0;
            let mål = 0;
            let assist = 0;
            let totalRatingScore = 0;
            let antallRatings = 0;

            // 1. Tell Oppmøte
            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    // Sjekker om det er kamp eller trening i attendance-info
                    if (attendance[dato].info?.type === 'Kamp') kamperOppmøte++;
                    else treninger++;
                }
            });

            // 2. Tell Mål, Assist og Rating fra matches-noden
            Object.values(matches).forEach(m => {
                const matchDate = new Date(m.date);
                if (periode === 'current' && (matchDate.getMonth() + 1 !== inneværendeMåned || matchDate.getFullYear() !== inneværendeÅr)) return;

                // Mål
                if (m.goalScorers) {
                    const scorers = m.goalScorers.split(', ');
                    mål += scorers.filter(s => s === navn).length;
                }

                // Assist
                if (m.assists) {
                    const assists = m.assists.split(', ');
                    assist += assists.filter(a => a === navn).length;
                }

                // Rating (Grovarbeid)
                if (m.playerRatings && m.playerRatings[navn]) {
                    const r = m.playerRatings[navn];
                    totalRatingScore += (Number(r.off) + Number(r.def));
                    antallRatings++;
                }
            });

            const oppmøtt = treninger + kamperOppmøte;
            const prosent = totaltMulige > 0 ? Math.round((oppmøtt / totaltMulige) * 100) : 0;
            const poeng = mål + assist;
            const jobbSnitt = antallRatings > 0 ? (totalRatingScore / (antallRatings * 2)).toFixed(2) : "0.00";

            return {
                navn,
                mål,
                assist,
                poeng,
                jobbSnitt,
                prosent
            };
        });

    // Sorter etter poeng (og så prosent hvis likt)
    return resultat.sort((a, b) => b.poeng - a.poeng || b.prosent - a.prosent);
}

// --- VISNING ---
function renderTabell(statsArray) {
    statsBody.innerHTML = statsArray.map(s => `
        <tr>
            <td class="name-col"><strong>${s.navn}</strong></td>
            <td style="text-align: center;">${s.mål}</td>
            <td style="text-align: center;">${s.assist}</td>
            <td style="text-align: center;"><span class="badge-point">${s.poeng}</span></td>
            <td style="text-align: center;"><span class="badge-work">${s.jobbSnitt}</span></td>
            <td class="stat-col" style="text-align: center;">
                <span style="font-weight: 700; color: ${getFarge(s.prosent)};">
                    ${s.prosent}%
                </span>
            </td>
        </tr>
    `).join('');
}

function oppdaterHero(statsArray, matches, periode) {
    const nå = new Date();
    const inneværendeMåned = nå.getMonth() + 1;
    
    // Tell totale kamper spilt i perioden
    const relevanteKamper = Object.values(matches).filter(m => {
        if (periode === 'total') return m.result && m.result !== '-';
        const matchDate = new Date(m.date);
        return (matchDate.getMonth() + 1 === inneværendeMåned) && m.result && m.result !== '-';
    });

    const totaltMål = statsArray.reduce((sum, s) => sum + s.mål, 0);
    const snittOppmøte = statsArray.length > 0 
        ? Math.round(statsArray.reduce((sum, s) => sum + s.prosent, 0) / statsArray.length) 
        : 0;
    
    // Finn poengkonge
    const poengkonge = statsArray.length > 0 && statsArray[0].poeng > 0 ? statsArray[0].navn : "-";

    document.getElementById('heroTotalMatches').innerText = relevanteKamper.length;
    document.getElementById('heroTotalGoals').innerText = totaltMål;
    document.getElementById('heroAvgAttendance').innerText = snittOppmøte + "%";
    document.getElementById('heroTopScorer').innerText = poengkonge;
}

function getFarge(prosent) {
    if (prosent >= 85) return '#2ecc71'; // Grønn
    if (prosent >= 60) return '#f39c12'; // Oransje/Gul
    return '#e74c3c'; // Rød
}
