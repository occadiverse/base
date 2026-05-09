import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');
let globalData = null;

const manederTekst = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
    "Juli", "August", "September", "Oktober", "November", "Desember"
];

// --- INITIALISERING ---
onValue(ref(db, '/'), (snapshot) => {
    globalData = snapshot.val() || {};
    genererDynamiskFilter();
    oppdaterStatistikk();
});

periodSelect.addEventListener('change', () => {
    // Marker at brukeren har gjort et manuelt valg
    periodSelect.setAttribute('data-user-selected', 'true');
    oppdaterStatistikk();
});

// Gjør toggle-funksjonen tilgjengelig globalt for onclick i HTML
window.toggleStatList = function(id, header) {
    if (window.innerWidth > 768) return;
    const container = document.getElementById(id);
    if (!container) return;
    container.classList.toggle('show');
    header.classList.toggle('active');
};

function genererDynamiskFilter() {
    const attendance = globalData.attendance || {};
    const datoer = Object.keys(attendance);
    const unikePerioder = new Set();

    datoer.forEach(datoStr => {
        const deler = datoStr.split('-');
        if (deler.length === 3) {
            const mndAr = `${deler[1]}-${deler[2]}`;
            unikePerioder.add(mndAr);
        }
    });

    const nå = new Date();
    const innevarendeMndAr = `${String(nå.getMonth() + 1).padStart(2, '0')}-${nå.getFullYear()}`;

    let valgtNå = periodSelect.value;
    
    if (!periodSelect.hasAttribute('data-user-selected') && unikePerioder.has(innevarendeMndAr)) {
        valgtNå = innevarendeMndAr;
    }

    periodSelect.innerHTML = '<option value="total">Hele sesongen</option>';

    Array.from(unikePerioder).sort().reverse().forEach(periode => {
        const [mnd, ar] = periode.split('-');
        const navn = `${manederTekst[parseInt(mnd) - 1]} ${ar}`;
        const option = document.createElement('option');
        option.value = periode;
        option.textContent = navn;
        periodSelect.appendChild(option);
    });

    if (valgtNå) periodSelect.value = valgtNå;
}

function oppdaterStatistikk() {
    if (!globalData) return;
    const players = globalData.players || {};
    const attendance = globalData.attendance || {};
    const matches = globalData.matches || {};
    const valg = periodSelect.value;

    const stats = beregnLogikk(players, attendance, matches, valg);
    renderTopplister(stats);
    oppdaterLagStats(matches, stats, valg);
}

function beregnLogikk(players, attendance, matches, periodeValg) {
    const alleDatoer = Object.keys(attendance);
    const relevanteDatoer = alleDatoer.filter(datoStr => {
        if (periodeValg === 'total') return true;
        return datoStr.includes(periodeValg);
    });

    const totaltMulige = relevanteDatoer.length;

    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = pData.navn || pData.name;
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0, totalRatingScore = 0, antallRatings = 0;

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    if (attendance[dato].info?.type === 'Kamp') kamperOppmøte++;
                    else treninger++;
                }
            });

            Object.values(matches).forEach(m => {
                const d = new Date(m.date);
                const kampPeriode = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                if (periodeValg !== 'total' && kampPeriode !== periodeValg) return;

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
            const komplettScore = parseFloat((poeng * jobbVerdi) + (prosent / 100)).toFixed(2);

            return { navn, mål, poeng, prosent, komplettScore, harRating: antallRatings > 0 };
        });
}

function oppdaterLagStats(matches, statsArray, periode) {
    const kampListe = Object.values(matches).filter(m => {
        if (!m.result || m.result === '-' || m.result === ' - ') return false;
        if (periode === 'total') return true;
        const d = new Date(m.date);
        const kampPeriode = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        return kampPeriode === periode;
    });

    const totaltMål = statsArray.reduce((sum, s) => sum + s.mål, 0);
    let seire = 0;
    kampListe.forEach(m => {
        const scores = m.result.split(' - ').map(Number);
        if (scores.length === 2 && scores[0] > scores[1]) seire++;
    });

    const seiersProsent = kampListe.length > 0 ? Math.round((seire / kampListe.length) * 100) : 0;
    document.getElementById('teamMatches').innerText = kampListe.length;
    document.getElementById('teamGoals').innerText = totaltMål;
    document.getElementById('teamWinRate').innerText = seiersProsent + "%";
}

function renderTopplister(statsArray) {
    const configs = [
        { 
            key: 'poeng', 
            winnerEl: 'winnerPoeng', 
            listEl: 'listPoengContainer', 
            suffix: ' poeng' 
        },
        { 
            key: 'komplettScore', 
            winnerEl: 'winnerKomplett', 
            listEl: 'listKomplettContainer', 
            suffix: '' 
        },
        { 
            key: 'prosent', 
            winnerEl: 'winnerOppmote', 
            listEl: 'listOppmoteContainer', 
            suffix: '%' 
        }
    ];

    configs.forEach(conf => {
        const sorted = [...statsArray].sort((a, b) => b[conf.key] - a[conf.key]).slice(0, 10);
        const winnerDisplay = document.getElementById(conf.winnerEl);
        const listDisplay = document.getElementById(conf.listEl);

        if (sorted.length > 0) {
            const winner = sorted[0];
            const rest = sorted.slice(1);

            // Nr 1 i stat-row struktur
            winnerDisplay.innerHTML = `
                <div class="stat-row">
                    <span><span class="rank">1</span><span class="player-name">${winner.navn}</span></span>
                    <span class="score-val">${winner[conf.key]}${conf.suffix}</span>
                </div>
            `;

            // Resten i stat-row struktur (ikke li/ul)
            listDisplay.innerHTML = rest.map((s, i) => `
                <div class="stat-row">
                    <span><span class="rank">${i + 2}</span><span class="player-name">${s.navn}</span></span>
                    <span class="score-val">${s[conf.key]}${conf.suffix}</span>
                </div>
            `).join('');
        } else {
            winnerDisplay.innerHTML = '<div class="stat-row">Ingen data for denne perioden</div>';
            listDisplay.innerHTML = "";
        }
    });
}
