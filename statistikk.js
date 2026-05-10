import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');
let globalData = null;

const manederTekst = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
    "Juli", "August", "September", "Oktober", "November", "Desember"
];

// --- HJELPEFUNKSJONER FOR DATO-SYNKRONISERING ---

function hentPeriodeFraDato(datoStr) {
    if (!datoStr || typeof datoStr !== 'string') return "";
    const deler = datoStr.split('-');
    if (deler.length !== 3) return "";
    
    if (deler[0].length === 4) {
        return `${deler[1]}-${deler[0]}`;
    } 
    return `${deler[1]}-${deler[2]}`;
}

function matchDatoer(dato1, dato2) {
    if (!dato1 || !dato2) return false;
    const d1 = dato1.split('-').sort().join('');
    const d2 = dato2.split('-').sort().join('');
    return d1 === d2;
}

// --- INITIALISERING ---

onValue(ref(db, '/'), (snapshot) => {
    globalData = snapshot.val() || {};
    genererDynamiskFilter();
    oppdaterStatistikk();
});

periodSelect.addEventListener('change', () => {
    periodSelect.setAttribute('data-user-selected', 'true');
    oppdaterStatistikk();
});

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
        const p = hentPeriodeFraDato(datoStr);
        if (p) unikePerioder.add(p);
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
        periodSelect.innerHTML += `<option value="${periode}">${manederTekst[parseInt(mnd)-1]} ${ar}</option>`;
    });
    if (valgtNå) periodSelect.value = valgtNå;
}

function oppdaterStatistikk() {
    if (!globalData) return;
    const stats = beregnLogikk(globalData.players || {}, globalData.attendance || {}, globalData.matches || {}, periodSelect.value);
    renderTopplister(stats);
    oppdaterLagStats(globalData.matches || {}, stats, periodSelect.value);
}

function beregnLogikk(players, attendance, matches, periodeValg) {
    const relevanteDatoer = Object.keys(attendance).filter(d => {
        if (periodeValg === 'total') return true;
        return hentPeriodeFraDato(d) === periodeValg;
    });

    const totaltMulige = relevanteDatoer.length;

    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = pData.navn || pData.name;
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0, totalRatingScore = 0, antallRatings = 0;
            let mvpLagScore = 0;

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    if (attendance[dato].info?.type === 'Kamp') {
                        kamperOppmøte++;

                        const kamp = Object.values(matches).find(m => matchDatoer(m.date, dato));

                        if (kamp && kamp.result) {
                            const scores = kamp.result.replace(/\s/g, "").split('-');
                            const personligRating = kamp.playerRatings ? kamp.playerRatings[navn] : null;

                            // Sjekker om spilleren har fått 1 i vurdering for denne kampen
                            const harBraOff = personligRating && Number(personligRating.off) === 1;
                            const harBraDef = personligRating && Number(personligRating.def) === 1;

                            if (scores.length === 2) {
                                const vi = Number(scores[0]);
                                const dem = Number(scores[1]);

                                // OFFENSIVT: Laget scorer, men du må ha 1 i off-vurdering
                                if (harBraOff) {
                                    if (vi >= 3) mvpLagScore += 1.0;
                                    else if (vi >= 1) mvpLagScore += 0.5;
                                }

                                // DEFENSIVT: Laget holder tett, men du må ha 1 i def-vurdering
                                if (harBraDef) {
                                    if (dem === 0) mvpLagScore += 1.0;
                                    else if (dem === 1) mvpLagScore += 0.5;
                                }
                            }
                        }
                    } else {
                        treninger++;
                    }
                }
            });

            Object.values(matches).forEach(m => {
                if (periodeValg !== 'total' && hentPeriodeFraDato(m.date) !== periodeValg) return;

                if (m.goalScorers) {
                    const scorere = m.goalScorers.split(',').map(s => s.trim());
                    mål += scorere.filter(s => s === navn).length;
                }
                if (m.assists) {
                    const assistenter = m.assists.split(',').map(a => a.trim());
                    assist += assistenter.filter(a => a === navn).length;
                }
                if (m.playerRatings && m.playerRatings[navn]) {
                    const r = m.playerRatings[navn];
                    totalRatingScore += (Number(r.off) + Number(r.def));
                    antallRatings++;
                }
            });

            const snittRating = antallRatings > 0 ? (totalRatingScore / (antallRatings * 2)) : 0;
            const poengPerKamp = kamperOppmøte > 0 ? ((mål + assist) / kamperOppmøte) : 0;
            const mvpKampScore = parseFloat((snittRating * 7) + (poengPerKamp * 1.5)).toFixed(2);

            return { 
                navn, 
                lagPoeng: parseFloat(mvpLagScore).toFixed(1),
                komplettScore: mvpKampScore, 
                prosent: totaltMulige > 0 ? Math.round(((treninger + kamperOppmøte) / totaltMulige) * 100) : 0,
                kamperOppmøte,
                mål
            };
        });
}

function renderTopplister(statsArray) {
    const configs = [
        { key: 'lagPoeng', winnerEl: 'winnerPoeng', listEl: 'listPoengContainer', suffix: ' pts', minOppmoteProsent: 0, info: "MVP Lag: Lagets resultat kombinert med din personlige 1-er vurdering." },
        { key: 'komplettScore', winnerEl: 'winnerKomplett', listEl: 'listKomplettContainer', suffix: '', minOppmoteProsent: 0.3, info: "MVP Kamp: Individuell score basert på rating og mål." },
        { key: 'prosent', winnerEl: 'winnerOppmote', listEl: 'listOppmoteContainer', suffix: '%', minOppmoteProsent: 0, info: "Total treningsiver og kampoppmøte." }
    ];

    configs.forEach(conf => {
        const sorted = [...statsArray]
            .filter(s => {
                if (conf.minOppmoteProsent === 0) return true;
                return s.kamperOppmøte >= 1; 
            })
            .sort((a, b) => Number(b[conf.key]) - Number(a[conf.key]))
            .slice(0, 10);
        
        const winnerDisplay = document.getElementById(conf.winnerEl);
        const listDisplay = document.getElementById(conf.listEl);
        
        if (sorted.length > 0) {
            winnerDisplay.innerHTML = `<div class="stat-row"><span><span class="rank">1</span><span class="player-name">${sorted[0].navn}</span></span><span class="score-val">${sorted[0][conf.key]}${conf.suffix}</span></div>`;
            listDisplay.innerHTML = sorted.slice(1).map((s, i) => `<div class="stat-row"><span><span class="rank">${i + 2}</span><span class="player-name">${s.navn}</span></span><span class="score-val">${s[conf.key]}${conf.suffix}</span></div>`).join('');
        }
    });
}

function oppdaterLagStats(matches, statsArray, periodeValg) {
    const kampListe = Object.values(matches).filter(m => {
        if (!m.result || m.result === ' - ' || m.result === '-') return false;
        if (periodeValg === 'total') return true;
        return hentPeriodeFraDato(m.date) === periodeValg;
    });

    const totaltMål = statsArray.reduce((sum, s) => sum + s.mål, 0);
    let seire = 0;
    
    kampListe.forEach(m => {
        const s = m.result.replace(/\s/g, "").split('-');
        if (s.length === 2 && Number(s[0]) > Number(s[1])) seire++;
    });

    document.getElementById('teamMatches').innerText = kampListe.length;
    document.getElementById('teamGoals').innerText = totaltMål;
    document.getElementById('teamWinRate').innerText = (kampListe.length > 0 ? Math.round((seire/kampListe.length)*100) : 0) + "%";
}
