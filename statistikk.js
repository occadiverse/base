import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');
let globalData = null;

const manederTekst = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
    "Juli", "August", "September", "Oktober", "November", "Desember"
];

// --- DATO-HÅNDTERING ---

// NY: Hjelpefunksjon for å finne riktig filter-periode (MM-YYYY) uavhengig av om nøkkelen er en dato eller en Kamp-ID
function hentPeriodeFraNokkel(nøkkel, attendance) {
    if (!nøkkel) return "";
    
    const info = attendance[nøkkel]?.info || {};
    if (info.date) {
        const deler = info.date.split('-');
        return `${deler[1]}-${deler[0]}`; // Returnerer MM-YYYY
    }
    
    if (nøkkel.includes('-') && nøkkel.split('-')[0].length === 2) {
        const deler = nøkkel.split('-');
        return `${deler[1]}-${deler[2]}`; // Returnerer MM-YYYY
    }
    
    return "";
}

function hentPeriodeFraDato(datoStr) {
    if (!datoStr) return "";
    const deler = datoStr.split('-');
    if (deler.length !== 3) return "";
    const mnd = deler[0].length === 4 ? deler[1] : deler[1];
    const ar = deler[0].length === 4 ? deler[0] : deler[2];
    return `${mnd}-${ar}`;
}

function matchDatoer(dato1, dato2) {
    if (!dato1 || !dato2) return false;
    const d1 = dato1.replace(/\D/g, ""); 
    const d2 = dato2.split('-').reverse().join(""); 
    const d2_alt = dato2.replace(/\D/g, "");
    return d1 === d2 || d1 === d2_alt;
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

function genererDynamiskFilter() {
    const attendance = globalData.attendance || {};
    const unikePerioder = new Set();
    Object.keys(attendance).forEach(key => {
        const p = hentPeriodeFraNokkel(key, attendance);
        if (p) unikePerioder.add(p);
    });

    const nå = new Date();
    const innevarende = `${String(nå.getMonth() + 1).padStart(2, '0')}-${nå.getFullYear()}`;
    let valgt = periodSelect.value;
    if (!periodSelect.hasAttribute('data-user-selected') && unikePerioder.has(innevarende)) valgt = innevarende;

    periodSelect.innerHTML = '<option value="total">Sesong 2026</option>';
    Array.from(unikePerioder).sort().reverse().forEach(p => {
        const [m, a] = p.split('-');
        periodSelect.innerHTML += `<option value="${p}">${manederTekst[parseInt(m)-1]} ${a}</option>`;
    });
    if (valgt) periodSelect.value = valgt;
}

function oppdaterStatistikk() {
    if (!globalData) return;
    
    // Henter ut den faktiske teksten i filteret og oppdaterer den gule heroteksten i sanntid
    const periodWordEl = document.getElementById('stat-period-word');
    if (periodSelect && periodWordEl) {
        const valgtTekst = periodSelect.options[periodSelect.selectedIndex].text;
        periodWordEl.innerText = valgtTekst;
    }

    const stats = beregnLogikk(globalData.players || {}, globalData.attendance || {}, globalData.matches || {}, periodSelect.value);
    renderTopplister(stats);
    oppdaterLagStats(globalData.matches || {}, stats, periodSelect.value);
}

function beregnLogikk(players, attendance, matches, periodeValg) {
    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = (pData.navn || pData.name || "").trim();
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0, totalRatingScore = 0, antallRatings = 0;
            let mvpLagScore = 0;

            const relevanteNøkler = Object.keys(attendance).filter(key => periodeValg === 'total' || hentPeriodeFraNokkel(key, attendance) === periodeValg);
            const totaltMulige = relevanteNøkler.length;

            relevanteNøkler.forEach(key => {
                if (attendance[key][id] === 'K') {
                    const info = attendance[key].info || {};
                    const type = info.type || 'Trening';

                    if (type === 'Kamp') {
                        kamperOppmøte++;
                        
                        // Sjekker om kampen finnes direkte under Kamp-ID, eller om den må søkes opp på dato (gammel struktur)
                        const kamp = matches[key] || Object.values(matches).find(m => matchDatoer(m.date, key));

                        if (kamp && kamp.result) {
                            const scores = kamp.result.replace(/\s/g, "").split('-');
                            
                            let pRating = null;
                            if (kamp.playerRatings) {
                                const rKey = Object.keys(kamp.playerRatings).find(k => k.trim() === navn);
                                if (rKey) pRating = kamp.playerRatings[rKey];
                            }

                            if (scores.length === 2 && pRating) {
                                const vi = Number(scores[0]);
                                const dem = Number(scores[1]);

                                const offVal = Number(pRating.off || 0);
                                const defVal = Number(pRating.def || 0);

                                if (offVal === 2) {
                                    mvpLagScore += 0.5;
                                    if (vi >= 3) mvpLagScore += 0.5;
                                } else if (offVal === 1) {
                                    mvpLagScore += 0.25;
                                    if (vi >= 3) mvpLagScore += 0.25;
                                }

                                if (defVal === 2) {
                                    mvpLagScore += 0.5;
                                    if (dem === 0) mvpLagScore += 0.5;
                                } else if (defVal === 1) {
                                    mvpLagScore += 0.25;
                                    if (dem === 0) mvpLagScore += 0.25;
                                }
                            }
                        }
                    } else treninger++;
                }
            });

            Object.entries(matches).forEach(([mId, m]) => {
                // Sjekker om kampen tilhører den valgte perioden i filteret (via Kamp-ID eller dato)
                const tilhorerPerioden = periodeValg === 'total' || 
                                         (attendance[mId] && hentPeriodeFraNokkel(mId, attendance) === periodeValg) ||
                                         (m.date && m.date.includes('-') && `${m.date.split('-')[1]}-${m.date.split('-')[0]}` === periodeValg);
                
                if (!tilhorerPerioden) return;

                if (m.goalScorers) mål += m.goalScorers.split(',').filter(s => s.trim() === navn).length;
                if (m.assists) assist += m.assists.split(',').filter(a => a.trim() === navn).length;
                if (m.playerRatings) {
                    const rKey = Object.keys(m.playerRatings).find(k => k.trim() === navn);
                    if (rKey) {
                        const r = m.playerRatings[rKey];
                        totalRatingScore += (Number(r.off || 0) + Number(r.def || 0));
                        antallRatings++;
                    }
                }
            });

            const snittRating = antallRatings > 0 ? (totalRatingScore / (antallRatings * 4)) : 0;
            const pPk = kamperOppmøte > 0 ? ((mål + assist) / kamperOppmøte) : 0;
            const mvpKampScore = parseFloat((snittRating * 7) + (pPk * 1.5)).toFixed(2);

            return { 
                navn, 
                lagPoeng: parseFloat(mvpLagScore).toFixed(1),
                komplettScore: mvpKampScore, 
                prosent: totaltMulige > 0 ? Math.round(((treninger + kamperOppmøte) / totaltMulige) * 100) : 0,
                kamperOppmøte, mål
            };
        });
}

// --- VISUALISERING ---

function renderTopplister(statsArray) {
    const configs = [
        { key: 'lagPoeng', winnerEl: 'winnerPoeng', listEl: 'listPoengContainer', suffix: ' pts', minOppmote: 0 },
        { key: 'komplettScore', winnerEl: 'winnerKomplett', listEl: 'listKomplettContainer', suffix: '', minOppmote: 1 },
        { key: 'prosent', winnerEl: 'winnerOppmote', listEl: 'listOppmoteContainer', suffix: '%', minOppmote: 0 }
    ];

    configs.forEach(conf => {
        const allSorted = [...statsArray]
            .filter(s => s.kamperOppmøte >= conf.minOppmote)
            .sort((a, b) => Number(b[conf.key]) - Number(a[conf.key]));

        const winner = allSorted[0];
        const top10 = allSorted.slice(1, 10);
        const resten = allSorted.slice(10);
        
        const winnerEl = document.getElementById(conf.winnerEl);
        const listEl = document.getElementById(conf.listEl);
        
        if (winnerEl) {
            winnerEl.innerHTML = winner ? `
                <div class="stat-row">
                    <span><span class="rank">1</span><span class="player-name">${winner.navn}</span></span>
                    <span class="score-val">${winner[conf.key]}${conf.suffix}</span>
                </div>` : "";
        }

        if (listEl) {
            let listHTML = top10.map((s, i) => `
                <div class="stat-row">
                    <span><span class="rank">${i + 2}</span><span class="player-name">${s.navn}</span></span>
                    <span class="score-val">${s[conf.key]}${conf.suffix}</span>
                </div>`).join('');

            if (resten.length > 0) {
                const extraId = `extra-${conf.key}`;
                listHTML += `
                    <div id="${extraId}" class="hidden-list">
                        ${resten.map((s, i) => `
                            <div class="stat-row">
                                <span><span class="rank">${i + 11}</span><span class="player-name">${s.navn}</span></span>
                                <span class="score-val">${s[conf.key]}${conf.suffix}</span>
                            </div>`).join('')}
                    </div>
                    <button onclick="event.stopPropagation(); toggleFullList('${extraId}', this)" class="show-all-btn">
                        Vis alle (${allSorted.length} spillere)
                    </button>
                `;
            }
            listEl.innerHTML = listHTML;
        }
    });
}

window.toggleFullList = function(id, btn) {
    const extraDiv = document.getElementById(id);
    
    if (!extraDiv.classList.contains('show')) {
        extraDiv.classList.add('show');
        btn.innerText = "Vis færre";
    } else {
        extraDiv.classList.remove('show');
        btn.innerText = "Vis alle";
    }
};

function oppdaterLagStats(matches, statsArray, periode) {
    const kampListe = Object.values(matches).filter(m => {
        if (!m.result || m.result === '-') return false;
        return periode === 'total' || hentPeriodeFraDato(m.date) === periode;
    });
    const seire = kampListe.filter(m => {
        const s = m.result.split('-').map(Number);
        return s[0] > s[1];
    }).length;
    
    const teamMatchesEl = document.getElementById('teamMatches');
    const teamGoalsEl = document.getElementById('teamGoals');
    const teamWinRateEl = document.getElementById('teamWinRate');
    
    if (teamMatchesEl) teamMatchesEl.innerText = kampListe.length;
    if (teamGoalsEl) teamGoalsEl.innerText = statsArray.reduce((sum, s) => sum + s.mål, 0);
    
    if (teamWinRateEl) teamWinRateEl.innerText = (kampListe.length > 0 ? Math.round((seire / kampListe.length) * 100) : 0) + "%";
}
