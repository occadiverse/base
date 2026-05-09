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
    
    // Vi tegner både de tre topp-listene og den store tabellen
    renderTopplister(stats);
    renderTabell(stats);
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

            // Komplett score: (Poeng * innsats) + (liten oppmøte-bonus)
            const komplettScore = parseFloat((poeng * jobbVerdi) + (prosent / 100)).toFixed(2);

            return {
                navn,
                mål,
                assist,
                poeng,
                jobbSnitt: jobbVerdi.toFixed(2),
                prosent,
                komplettScore,
                harRating: antallRatings > 0
            };
        });

    return resultat;
}

// --- VISNING: TOPPLISTER (Topp 10) ---
function renderTopplister(statsArray) {
    // 1. Poengkongen (Sortert på poeng)
    const toppPoeng = [...statsArray].sort((a, b) => b.poeng - a.poeng).slice(0, 10);
    const listPoeng = document.getElementById('listPoeng');
    listPoeng.innerHTML = toppPoeng.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.poeng} <small>p</small></span>
        </li>
    `).join('');

    // 2. Komplett Lagspiller (Sortert på komplettScore)
    const toppKomplett = [...statsArray]
        .filter(s => s.harRating || s.poeng > 0)
        .sort((a, b) => b.komplettScore - a.komplettScore)
        .slice(0, 10);
    const listKomplett = document.getElementById('listKomplett');
    listKomplett.innerHTML = toppKomplett.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.komplettScore}</span>
        </li>
    `).join('');

    // 3. Treningsiver (Sortert på prosent)
    const toppOppmote = [...statsArray].sort((a, b) => b.prosent - a.prosent).slice(0, 10);
    const listOppmote = document.getElementById('listOppmote');
    listOppmote.innerHTML = toppOppmote.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.prosent}%</span>
        </li>
    `).join('');
}

// --- VISNING: FULL TABELL ---
function renderTabell(statsArray) {
    // Sorterer hovedtabellen etter poeng som standard
    const sortertTabell = [...statsArray].sort((a, b) => b.poeng - a.poeng);
    
    statsBody.innerHTML = sortertTabell.map(s => `
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

function getFarge(prosent) {
    if (prosent >= 85) return '#2ecc71'; 
    if (prosent >= 60) return '#f39c12'; 
    return '#e74c3c'; 
}
