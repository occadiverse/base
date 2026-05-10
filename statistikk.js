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
    periodSelect.setAttribute('data-user-selected', 'true');
    oppdaterStatistikk();
});

// Sikrer at accordions og fotnoter fungerer på mobil
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
            let mvpLagScore = 0;

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    if (attendance[dato].info?.type === 'Kamp') {
                        kamperOppmøte++;

                        // --- MVP LAG LOGIKK (Din poengtabell) ---
                        const kamp = Object.values(matches).find(m => m.date === dato);
                        if (kamp && kamp.result && kamp.result.includes(' - ')) {
                            const [vi, dem] = kamp.result.split(' - ').map(Number);
                            
                            // Offensivt bidrag (Laget scorer)
                            if (vi >= 3) mvpLagScore += 1.0;
                            else if (vi >= 1) mvpLagScore += 0.5;

                            // Defensivt bidrag (Laget holder tett)
                            if (dem === 0) mvpLagScore += 1.0;
                            else if (dem === 1) mvpLagScore += 0.5;
                        }
                    } else {
                        treninger++;
                    }
                }
            });

            // INDIVIDUELLE STATS (Brukt til MVP Kamp)
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
            const individueltPoeng = mål + assist;
            
            // MVP Kamp (Individuell prestasjon)
            const snittRating = antallRatings > 0 ? (totalRatingScore / (antallRatings * 2)) : 0;
            const poengPerKamp = kamperOppmøte > 0 ? (individueltPoeng / kamperOppmøte) : 0;
            const mvpKampScore = parseFloat((snittRating * 7) + (poengPerKamp * 1.5)).toFixed(2);

            return { 
                navn, 
                mål, 
                lagPoeng: mvpLagScore.toFixed(1), // Til MVP Lag
                prosent, 
                komplettScore: mvpKampScore, // Til MVP Kamp
                kamperOppmøte
            };
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
    const matches = globalData.matches || {};
    const valg = periodSelect.value;
    
    const antallLagKamper = Object.values(matches).filter(m => {
        if (!m.result || m.result === '-' || m.result === ' - ') return false;
        if (valg === 'total') return true;
        const d = new Date(m.date);
        const kampPeriode = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        return kampPeriode === valg;
    }).length;

    const configs = [
        { 
            key: 'lagPoeng', 
            winnerEl: 'winnerPoeng', 
            listEl: 'listPoengContainer', 
            suffix: ' pts', 
            minOppmoteProsent: 0.3,
            info: "MVP Lag: Lagets prestasjon når du spiller. Mål (maks 1.0) og defensivt (maks 1.0). Krever 30% oppmøte."
        },
        { 
            key: 'komplettScore', 
            winnerEl: 'winnerKomplett', 
            listEl: 'listKomplettContainer', 
            suffix: '', 
            minOppmoteProsent: 0.3,
            info: "MVP Kamp: (Snittrating × 7) + (Målpoeng pr kamp × 1.5). Krever min. 30% kampoppmøte."
        },
        { 
            key: 'prosent', 
            winnerEl: 'winnerOppmote', 
            listEl: 'listOppmoteContainer', 
            suffix: '%', 
            minOppmoteProsent: 0,
            info: "Totalt oppmøte på treninger og kamper kombinert."
        }
    ];

    configs.forEach(conf => {
        const filtered = statsArray.filter(s => {
            if (conf.minOppmoteProsent > 0) {
                if (antallLagKamper <= 1) return s.kamperOppmøte >= 1;
                const spillerKampProsent = s.kamperOppmøte / antallLagKamper;
                return spillerKampProsent >= conf.minOppmoteProsent;
            }
            return true;
        });

        const sorted = [...filtered].sort((a, b) => Number(b[conf.key]) - Number(a[conf.key])).slice(0, 10);
        
        const winnerDisplay = document.getElementById(conf.winnerEl);
        const listDisplay = document.getElementById(conf.listEl);
        const parentCard = winnerDisplay.closest('.stat-card');

        if (sorted.length > 0) {
            const winner = sorted[0];
            const rest = sorted.slice(1);

            winnerDisplay.innerHTML = `
                <div class="stat-row">
                    <span><span class="rank">1</span><span class="player-name">${winner.navn}</span></span>
                    <span class="score-val">${winner[conf.key]}${conf.suffix}</span>
                </div>
            `;

            listDisplay.innerHTML = rest.map((s, i) => `
                <div class="stat-row">
                    <span><span class="rank">${i + 2}</span><span class="player-name">${s.navn}</span></span>
                    <span class="score-val">${s[conf.key]}${conf.suffix}</span>
                </div>
            `).join('');

            if (conf.info) {
                let footer = parentCard.querySelector('.stat-footer');
                if (!footer) {
                    footer = document.createElement('div');
                    footer.className = 'stat-footer hidden-footer';
                    footer.style.cssText = "margin-top: 15px; padding-top: 10px; border-top: 1px dashed #eee; font-size: 0.75rem; color: #888; display: flex; align-items: center; gap: 8px;";
                    parentCard.appendChild(footer);
                }
                footer.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--primary);"></i> ${conf.info}`;
            }
        } else {
            winnerDisplay.innerHTML = '<div class="stat-row">Ikke nok data</div>';
            listDisplay.innerHTML = "";
        }
    });
}
