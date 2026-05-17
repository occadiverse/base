import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');
let globalData = null;
let currentActiveTab = 'maal'; 
let lagretStatsArray = [];     

const manederTekst = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
    "Juli", "August", "September", "Oktober", "November", "Desember"
];

// --- DATO-HÅNDTERING ---

function hentPeriodeFraNokkel(nøkkel, attendance) {
    if (!nøkkel) return "";
    const info = attendance[nøkkel]?.info || {};
    if (info.date) {
        const deler = info.date.split('-');
        return `${deler[1]}-${deler[0]}`; 
    }
    if (nøkkel.includes('-') && nøkkel.split('-')[0].length === 2) {
        const deler = nøkkel.split('-');
        return `${deler[1]}-${deler[2]}`; 
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
    try {
        globalData = snapshot.val() || {};
        genererDynamiskFilter();
        oppdaterStatistikk();
    } catch (err) {
        console.error("Feil under lasting av Firebase-data:", err);
    }
});

if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        periodSelect.setAttribute('data-user-selected', 'true');
        oppdaterStatistikk();
    });
}

function genererDynamiskFilter() {
    const attendance = globalData.attendance || {};
    const unikePerioder = new Set();
    Object.keys(attendance).forEach(key => {
        const p = hentPeriodeFraNokkel(key, attendance);
        if (p) unikePerioder.add(p);
    });

    const nå = new Date();
    const innevarende = `${String(nå.getMonth() + 1).padStart(2, '0')}-${nå.getFullYear()}`;
    let valgt = periodSelect?.value;
    if (periodSelect && !periodSelect.hasAttribute('data-user-selected') && unikePerioder.has(innevarende)) valgt = innevarende;

    if (periodSelect) {
        periodSelect.innerHTML = '<option value="total">Sesong 2026</option>';
        Array.from(unikePerioder).sort().reverse().forEach(p => {
            const [m, a] = p.split('-');
            periodSelect.innerHTML += `<option value="${p}">${manederTekst[parseInt(m)-1]} ${a}</option>`;
        });
        if (valgt) periodSelect.value = valgt;
    }
}

function oppdaterStatistikk() {
    if (!globalData) return;
    
    const periodWordEl = document.getElementById('stat-period-word');
    if (periodSelect && periodWordEl) {
        periodWordEl.innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }

    const valgtPeriode = periodSelect ? periodSelect.value : 'total';
    lagretStatsArray = kvernRaaData(globalData.players || {}, globalData.attendance || {}, globalData.matches || {}, valgtPeriode);
    
    renderTestTab(); 
    oppdaterLagStats(globalData.matches || {}, lagretStatsArray, valgtPeriode);
}

// --- SIKKER DATAKVERNING MED SKUDDSIKKER NAVNESJEKK ---
function kvernRaaData(players, attendance, matches, periodeValg) {
    const naa = new Date();
    const dagensDatoTall = Number(`${naa.getFullYear()}${String(naa.getMonth() + 1).padStart(2, '0')}${String(naa.getDate()).padStart(2, '0')}`);

    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = (pData.navn || pData.name || "").trim();
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0;
            let totalRatingScore = 0, antallRatings = 0, mvpLagScore = 0;

            const relevanteNøkler = Object.keys(attendance).filter(key => periodeValg === 'total' || hentPeriodeFraNokkel(key, attendance) === periodeValg);

            relevanteNøkler.forEach(key => {
                if (attendance[key][id] === 'K') {
                    const info = attendance[key].info || {};
                    const type = info.type || 'Trening';
                    
                    const oektDatoStr = info.date || (key.includes('-') ? key : "");
                    let oektDatoTall = 0;
                    if (oektDatoStr) {
                        const deler = oektDatoStr.split('-');
                        oektDatoTall = deler[0].length === 4 ? Number(`${deler[0]}${deler[1]}${deler[2]}`) : Number(`${deler[2]}${deler[1]}${deler[0]}`);
                    }

                    if (type === 'Camp' || type === 'Kamp') {
                        const tilhørendeKamp = matches[key] || Object.values(matches).find(m => matchDatoer(m.date, key));
                        
                        if (tilhørendeKamp && tilhørendeKamp.result && tilhørendeKamp.result !== '-') {
                            kamperOppmøte++;
                            
                            const scores = tilhørendeKamp.result.replace(/\s/g, "").split('-');
                            let pRating = null;
                            if (tilhørendeKamp.playerRatings) {
                                const rKey = Object.keys(tilhørendeKamp.playerRatings).find(k => k.trim().toLowerCase() === navn.toLowerCase() || navn.toLowerCase().includes(k.trim().toLowerCase()));
                                if (rKey) pRating = tilhørendeKamp.playerRatings[rKey];
                            }

                            if (scores.length === 2 && pRating) {
                                const vi = Number(scores[0]);
                                const dem = Number(scores[1]);
                                const offVal = Number(pRating.off || 0);
                                const defVal = Number(pRating.def || 0);

                                if (offVal === 2) { mvpLagScore += 0.5; if (vi >= 3) mvpLagScore += 0.5; }
                                else if (offVal === 1) { mvpLagScore += 0.25; if (vi >= 3) mvpLagScore += 0.25; }

                                if (defVal === 2) { mvpLagScore += 0.5; if (dem === 0) mvpLagScore += 0.5; }
                                else if (defVal === 1) { mvpLagScore += 0.25; if (dem === 0) mvpLagScore += 0.25; }
                            }
                        }
                    } else {
                        if (oektDatoTall === 0 || oektDatoTall <= dagensDatoTall) {
                            treninger++;
                        }
                    }
                }
            });

            Object.entries(matches).forEach(([mId, m]) => {
                const tilhorerPerioden = periodeValg === 'total' || 
                                         (attendance[mId] && hentPeriodeFraNokkel(mId, attendance) === periodeValg) ||
                                         (m.date && m.date.includes('-') && `${m.date.split('-')[1]}-${m.date.split('-')[0]}` === periodeValg);
                
                if (!tilhorerPerioden) return;

                if (m.result && m.result !== '-') {
                    if (m.goalScorers) {
                        mål += m.goalScorers.split(',').filter(s => {
                            const scName = s.trim().toLowerCase();
                            return scName && (navn.toLowerCase().includes(scName) || scName.includes(navn.toLowerCase()));
                        }).length;
                    }
                    
                    if (m.assists) {
                        assist += m.assists.split(',').filter(a => {
                            const asName = a.trim().toLowerCase();
                            return asName && (navn.toLowerCase().includes(asName) || asName.includes(navn.toLowerCase()));
                        }).length;
                    }
                    
                    if (m.playerRatings) {
                        const rKey = Object.keys(m.playerRatings).find(k => k.trim().toLowerCase() === navn.toLowerCase() || navn.toLowerCase().includes(k.trim().toLowerCase()));
                        if (rKey) {
                            const r = m.playerRatings[rKey];
                            totalRatingScore += (Number(r.off || 0) + Number(r.def || 0));
                            antallRatings++;
                        }
                    }
                }
            });

            const snittRating = antallRatings > 0 ? (totalRatingScore / (antallRatings * 4)) : 0;
            const pPk = kamperOppmøte > 0 ? ((mål + assist) / kamperOppmøte) : 0;
            const komplettScore = kamperOppmøte > 0 ? parseFloat((snittRating * 7) + (pPk * 1.5)).toFixed(2) : "0.00";

            return { 
                navn, 
                kamperOppmøte, 
                treninger, 
                mål, 
                assist,
                mvpKamp: Number(komplettScore),
                mvpLag: Number(parseFloat(mvpLagScore).toFixed(2))
            };
        });
}

// --- VISNINGSFUNKSJON FOR ALL STATISTIKK ---
function renderTestTab() {
    const container = document.getElementById('tabContentContainer');
    const infoSpan = document.getElementById('infoTextSpan');
    if (!container) return;

    let nøkkel = 'mål';
    let tekst = 'mål';
    let visMedDesimaler = false; 

    // Oppdaterer tekster, sorteringsnøkler og det dynamiske infofeltet i bunn
    if (currentActiveTab === 'maal') {
        nøkkel = 'mål'; tekst = 'mål';
        if (infoSpan) infoSpan.innerHTML = "Viser oversikt over lagets toppscorere i valgt periode.";
    }
    else if (currentActiveTab === 'assist') { 
        nøkkel = 'assist'; tekst = 'assists'; 
        if (infoSpan) infoSpan.innerHTML = "Viser hvem som har servert flest målgivende pasninger i valgt periode.";
    }
    else if (currentActiveTab === 'trening') { 
        nøkkel = 'treninger'; tekst = 'treninger'; 
        if (infoSpan) infoSpan.innerHTML = "Viser antall gjennomførte treningsøkter. Fremtidige økter telles ikke med.";
    }
    else if (currentActiveTab === 'kamp') { 
        nøkkel = 'kamperOppmøte'; tekst = 'kamper'; 
        if (infoSpan) infoSpan.innerHTML = "Antall offisielle kamper spilt (kamper med registrert resultat).";
    }
    else if (currentActiveTab === 'mvpkamp') { 
        nøkkel = 'mvpKamp'; tekst = 'poeng'; visMedDesimaler = true; 
        if (infoSpan) infoSpan.innerHTML = "<strong>MVP Kamp:</strong> Vektet score basert på personlige karakterer (0-2) kombinert med mål og assists per kamp.";
    }
    else if (currentActiveTab === 'mvplag') { 
        nøkkel = 'mvpLag'; tekst = 'poeng'; visMedDesimaler = true; 
        if (infoSpan) infoSpan.innerHTML = "<strong>MVP Lag:</strong> Viser taktisk lojalitet. Poeng (0-2) tildeles for bidrag til offensive/defensiv mål, samt lagbonuser.";
    }

    const sortert = [...lagretStatsArray].sort((a, b) => b[nøkkel] - a[nøkkel]);

    if (sortert.length === 0 || sortert[0][nøkkel] === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-weight:600;">Ingen registrerte data i denne perioden.</div>`;
        return;
    }

    const topp5 = sortert.slice(0, 5);
    const resten = sortert.slice(5);

    let html = '';
    topp5.forEach((s, i) => {
        const verdiVisning = visMedDesimaler ? Number(s[nøkkel]).toFixed(2) : s[nøkkel];

        html += `
            <div class="stat-row">
                <span>
                    <span style="display:inline-block; width:28px; color:${i===0 ? '#eab308' : 'var(--text-muted)'}; font-weight:900; font-size:1.1rem;">${i + 1}</span>
                    <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                </span>
                <span style="color:var(--bsk-blue); font-weight:800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${verdiVisning} ${tekst}</span>
            </div>`;
    });

    if (resten.length > 0) {
        const extraId = `extra-real-${currentActiveTab}`;
        html += `
            <div id="${extraId}" style="display:none;">
                ${resten.map((s, i) => {
                    const verdiVisning = visMedDesimaler ? Number(s[nøkkel]).toFixed(2) : s[nøkkel];
                    return `
                    <div class="stat-row">
                        <span>
                            <span style="display:inline-block; width:28px; color:var(--text-muted); font-size:0.95rem;">${i + 6}</span>
                            <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                        </span>
                        <span style="color:var(--bsk-blue); font-weight:800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${verdiVisning} ${tekst}</span>
                    </div>`;
                }).join('')}
            </div>
            <button onclick="event.stopPropagation(); window.toggleRealList('${extraId}', this)" class="show-all-btn">
                VIS ALLE (${sortert.length} SPILLERE) <i class="fa-solid fa-chevron-down"></i>
            </button>`;
    }

    container.innerHTML = html;
}

// --- GLOBAL NETTVERKSSTYRING FOR FANER ---

window.switchStatTab = function(tabName) {
    currentActiveTab = tabName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = 'var(--bg-light)';
        btn.style.color = 'var(--text-muted)';
    });
    
    const aktivKnapp = document.getElementById(`tab-${tabName}`);
    if (aktivKnapp) {
        aktivKnapp.style.background = 'var(--bsk-blue)';
        aktivKnapp.style.color = 'white';
    }

    renderTestTab();
};

window.toggleRealList = function(id, btn) {
    const div = document.getElementById(id);
    if (div.style.display === 'none') {
        div.style.display = 'block';
        btn.innerHTML = `VIS FÆRRE <i class="fa-solid fa-chevron-up"></i>`;
    } else {
        div.style.display = 'none';
        btn.innerHTML = `VIS ALLE (${lagretStatsArray.length} SPILLERE) <i class="fa-solid fa-chevron-down"></i>`;
    }
};

// --- HERO-OPPDATERING FOR LAGSTATISTIKK ---
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
