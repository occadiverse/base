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
        const option = document.createElement('option');
        option.value = periode;
        option.textContent = `${manederTekst[parseInt(mnd) - 1]} ${ar}`;
        periodSelect.appendChild(option);
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
    const relevanteDatoer = Object.keys(attendance).filter(d => periodeValg === 'total' || d.includes(periodeValg));
    const totaltMulige = relevanteDatoer.length;

    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = pData.navn || pData.name;
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0, totalRatingScore = 0, antallRatings = 0;
            let mvpLagScore = 0;

            relevanteDatoer.forEach(dato => {
                if (attendance[dato][id] === 'K') {
                    // Sjekker om dagen er markert som 'Kamp' i oppmøte-fanen
                    if (attendance[dato].info?.type === 'Kamp') {
                        kamperOppmøte++;

                        // Finn kampen som matcher denne datoen
                        // Vi fjerner alt unntatt tall (2026-05-10 blir 20260510) for sikker sammenligning
                        const sokeDato = dato.replace(/\D/g, "");
                        const kamp = Object.values(matches).find(m => m.date && m.date.replace(/\D/g, "") === sokeDato);

                        if (kamp && kamp.result) {
                            const scores = kamp.result.replace(/\s/g, "").split('-');
                            if (scores.length === 2) {
                                const vi = Number(scores[0]);
                                const dem = Number(scores[1]);

                                if (vi >= 3) mvpLagScore += 1.0;
                                else if (vi >= 1) mvpLagScore += 0.5;

                                if (dem === 0) mvpLagScore += 1.0;
                                else if (dem === 1) mvpLagScore += 0.5;
                            }
                        }
                    } else {
                        treninger++;
                    }
                }
            });

            // MVP KAMP & MÅL-LOGIKK
            Object.values(matches).forEach(m => {
                const d = new Date(m.date);
                const kampPeriode = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                if (periodeValg !== 'total' && kampPeriode !== periodeValg) return;

                if (m.goalScorers) mål += m.goalScorers.split(', ').filter(s => s.trim() === navn).length;
                if (m.assists) assist += m.assists.split(', ').filter(a => a.trim() === navn).length;
                
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
                lagPoeng: mvpLagScore.toFixed(1),
                komplettScore: mvpKampScore, 
                prosent: totaltMulige > 0 ? Math.round(((treninger + kamperOppmøte) / totaltMulige) * 100) : 0,
                kamperOppmøte,
                mål
            };
        });
}

function renderTopplister(statsArray) {
    const configs = [
        { 
            key: 'lagPoeng', 
            winnerEl: 'winnerPoeng', 
            listEl: 'listPoengContainer', 
            suffix: ' pts', 
            minOppmoteProsent: 0, // FJERNET 30% KRAV FOR MVP LAG
            info: "MVP Lag: Basert på lagets resultat når du spiller (Mål og Clean Sheet)."
        },
        { 
            key: 'komplettScore', 
            winnerEl: 'winnerKomplett', 
            listEl: 'listKomplettContainer', 
            suffix: '', 
            minOppmoteProsent: 0.3, // BEHOLDT FOR MVP KAMP
            info: "MVP Kamp: (Snittrating × 7) + (Målpoeng pr kamp × 1.5)."
        },
        { 
            key: 'prosent', 
            winnerEl: 'winnerOppmote', 
            listEl: 'listOppmoteContainer', 
            suffix: '%', 
            minOppmoteProsent: 0,
            info: "Totalt oppmøte på treninger og kamper."
        }
    ];

    configs.forEach(conf => {
        const matches = globalData.matches || {};
        const valg = periodSelect.value;
        const antallLagKamper = Object.values(matches).filter(m => {
            if (!m.result || m.result === '-' || m.result === ' - ') return false;
            if (valg === 'total') return true;
            const d = new Date(m.date);
            return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` === valg;
        }).length;

        const filtered = statsArray.filter(s => {
            if (conf.minOppmoteProsent === 0) return true;
            if (antallLagKamper <= 1) return s.kamperOppmøte >= 1;
            return (s.kamperOppmøte / antallLagKamper) >= conf.minOppmoteProsent;
        });

        const sorted = [...filtered].sort((a, b) => Number(b[conf.key]) - Number(a[conf.key])).slice(0, 10);
        
        const winnerDisplay = document.getElementById(conf.winnerEl);
        const listDisplay = document.getElementById(conf.listEl);
        const parentCard = winnerDisplay.closest('.stat-card');

        if (sorted.length > 0) {
            winnerDisplay.innerHTML = `<div class="stat-row"><span><span class="rank">1</span><span class="player-name">${sorted[0].navn}</span></span><span class="score-val">${sorted[0][conf.key]}${conf.suffix}</span></div>`;
            listDisplay.innerHTML = sorted.slice(1).map((s, i) => `<div class="stat-row"><span><span class="rank">${i + 2}</span><span class="player-name">${s.navn}</span></span><span class="score-val">${s[conf.key]}${conf.suffix}</span></div>`).join('');
            
            let footer = parentCard.querySelector('.stat-footer') || document.createElement('div');
            footer.className = 'stat-footer hidden-footer';
            footer.style.cssText = "margin-top: 15px; padding-top: 10px; border-top: 1px dashed #eee; font-size: 0.75rem; color: #888; display: flex; align-items: center; gap: 8px;";
            footer.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--primary);"></i> ${conf.info}`;
            if (!parentCard.querySelector('.stat-footer')) parentCard.appendChild(footer);
        } else {
            winnerDisplay.innerHTML = '<div class="stat-row">Ingen data</div>';
            listDisplay.innerHTML = "";
        }
    });
}

function oppdaterLagStats(matches, statsArray, periode) {
    const kampListe = Object.values(matches).filter(m => {
        if (!m.result || m.result === '-' || m.result === ' - ') return false;
        if (periode === 'total') return true;
        const d = new Date(m.date);
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` === periode;
    });
    const totaltMål = statsArray.reduce((sum, s) => sum + s.mål, 0);
    let seire = 0;
    kampListe.forEach(m => {
        const s = m.result.replace(/\s/g, "").split('-');
        if (Number(s[0]) > Number(s[1])) seire++;
    });
    document.getElementById('teamMatches').innerText = kampListe.length;
    document.getElementById('teamGoals').innerText = totaltMål;
    document.getElementById('teamWinRate').innerText = (kampListe.length > 0 ? Math.round((seire/kampListe.length)*100) : 0) + "%";
}
