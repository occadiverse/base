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

    const alleDatoer = Object.keys(attendance);
    const relevanteDatoer = alleDatoer.filter(datoStr => {
        if (periode === 'total') return true;
        const [dag, mnd, år] = datoStr.split('-').map(Number);
        return mnd === inneværendeMåned && år === inneværendeÅr;
    });

    const totaltMulige = relevanteDatoer.length;

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

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    if (attendance[dato].info?.type === 'Kamp') kamperOppmøte++;
                    else treninger++;
                }
            });

            Object.values(matches).forEach(m => {
                const matchDate = new Date(m.date);
                if (periode === 'current' && (matchDate.getMonth() + 1 !== inneværendeMåned || matchDate.getFullYear() !== inneværendeÅr)) return;

                if (m.goalScorers) {
                    const scorers = m.goalScorers.split(', ');
                    mål += scorers.filter(s => s === navn).length;
                }

                if (m.assists) {
                    const assists = m.assists.split(', ');
                    assist += assists.filter(a => a === navn).length;
                }

                if (m.playerRatings && m.playerRatings[navn]) {
                    const r = m.playerRatings[navn];
                    totalRatingScore += (Number(r.off) + Number(r.def));
                    antallRatings++;
                }
            });

            const oppmøtt = treninger + kamperOppmøte;
            const prosent = totaltMulige > 0 ? Math.round((oppmøtt / totaltMulige) * 100) : 0;
            const poeng = mål + assist;
            
            const jobbVerdi = antallRatings > 0 ? (totalRatingScore / (antallRatings * 2)) : 0;
            const jobbSnitt = jobbVerdi.toFixed(2);

            // FORMEL: DEN KOMPLETTE LAGSPILLEREN
            // Vi vekter poengproduksjon med arbeidsinnsats (jobbsnitt).
            // Vi legger også til en liten bonus for oppmøte (prosent / 100).
            const komplettScore = parseFloat((poeng * jobbVerdi) + (prosent / 100)).toFixed(2);

            return {
                navn,
                mål,
                assist,
                poeng,
                jobbSnitt,
                jobbVerdi,
                prosent,
                komplettScore,
                harRating: antallRatings > 0
            };
        });

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
            <td style="text-align: center;" title="Komplett score: ${s.komplettScore}">
                <span class="badge-work">${s.jobbSnitt}</span>
            </td>
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
    
    const relevanteKamper = Object.values(matches).filter(m => {
        if (periode === 'total') return m.result && m.result !== '-';
        const matchDate = new Date(m.date);
        return (matchDate.getMonth() + 1 === inneværendeMåned) && m.result && m.result !== '-';
    });

    const totaltMål = statsArray.reduce((sum, s) => sum + s.mål, 0);
    
    // Finn poengkonge
    const poengkonge = statsArray.length > 0 && statsArray[0].poeng > 0 ? statsArray[0].navn : "-";

    // Finn den KOMPLETTE LAGSPILLEREN
    // Vi sorterer på nytt etter den skjulte 'komplettScore'
    const komplettVinner = [...statsArray]
        .filter(s => s.harRating) 
        .sort((a, b) => b.komplettScore - a.komplettScore)[0];

    document.getElementById('heroTotalMatches').innerText = relevanteKamper.length;
    document.getElementById('heroTotalGoals').innerText = totaltMål;
    
    // Her bytter vi ut oppmøte-snittet med Komplett Lagspiller hvis ID-en finnes
    const heroComplete = document.getElementById('heroCompletePlayer');
    if (heroComplete) {
        heroComplete.innerText = komplettVinner ? komplettVinner.navn : "-";
        // Vi kan fortsatt vise oppmøte et annet sted om ønskelig
    } else {
        // Fallback: Bruker ID-en til oppmøte hvis du ikke har endret HTML ennå
        document.getElementById('heroAvgAttendance').innerText = komplettVinner ? komplettVinner.navn : "-";
    }
    
    document.getElementById('heroTopScorer').innerText = poengkonge;
}

function getFarge(prosent) {
    if (prosent >= 85) return '#2ecc71'; 
    if (prosent >= 60) return '#f39c12'; 
    return '#e74c3c'; 
}
