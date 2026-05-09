import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');

let globalData = null;

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
    renderTopplister(stats);
}

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

    return Object.entries(players)
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

            // FORMEL: KOMPLETT LAGSPILLER
            const komplettScore = parseFloat((poeng * jobbVerdi) + (prosent / 100)).toFixed(2);

            return {
                navn,
                poeng,
                prosent,
                komplettScore,
                harRating: antallRatings > 0
            };
        });
}

function renderTopplister(statsArray) {
    // 1. POENGKONGRE
    const toppPoeng = [...statsArray].sort((a, b) => b.poeng - a.poeng).slice(0, 10);
    document.getElementById('listPoeng').innerHTML = toppPoeng.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.poeng} poeng</span>
        </li>
    `).join('');

    // 2. KOMPLETT LAGSPILLER
    const toppKomplett = [...statsArray].sort((a, b) => b.komplettScore - a.komplettScore).slice(0, 10);
    document.getElementById('listKomplett').innerHTML = toppKomplett.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.komplettScore}</span>
        </li>
    `).join('');

    // 3. TRENINGSIVER
    const toppOppmote = [...statsArray].sort((a, b) => b.prosent - a.prosent).slice(0, 10);
    document.getElementById('listOppmote').innerHTML = toppOppmote.map((s, i) => `
        <li>
            <span><span class="rank">${i + 1}</span><span class="player-name">${s.navn}</span></span>
            <span class="score-val">${s.prosent}%</span>
        </li>
    `).join('');
}
