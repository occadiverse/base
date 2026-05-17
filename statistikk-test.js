import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const periodSelect = document.getElementById('statPeriodSelect');
let globalData = null;
let currentActiveTab = 'maal'; 
let lagretStatsArray = [];     

// --- DATO- OG SESONGHÅNDTERING ---

// Henter rent årstall ut fra øktens dato eller nøkkel
function hentSesongFraNokkel(nøkkel, attendance) {
    if (!nøkkel) return "";
    const info = attendance[nøkkel]?.info || {};
    
    // Sjekker info.date først (formater: DD-MM-YYYY eller YYYY-MM-DD)
    if (info.date) {
        const deler = info.date.split('-');
        return deler[0].length === 4 ? deler[0] : deler[2];
    }
    // Fallback hvis nøkkelen i seg selv er en dato (f.eks DD-MM-YYYY)
    if (nøkkel.includes('-')) {
        const deler = nøkkel.split('-');
        if (deler[0].length === 2 && deler[2]?.length === 4) return deler[2];
        if (deler[0].length === 4) return deler[0];
    }
    return "";
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
        genererSesongFilter();
        oppdaterTestStats();
    } catch (err) {
        console.error("Feil under lasting av Firebase-data:", err);
    }
});

if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        periodSelect.setAttribute('data-user-selected', 'true');
        oppdaterTestStats();
    });
}

// Skanner databasen etter unike årstall og bygger rene sesongvalg
function genererSesongFilter() {
    const attendance = globalData.attendance || {};
    const unikeSesonger = new Set();

    Object.keys(attendance).forEach(key => {
        const aar = hentSesongFraNokkel(key, attendance);
        if (aar && aar.length === 4) {
            unikeSesonger.add(aar);
        }
    });

    const nåværendeÅr = new Date().getFullYear().toString();
    
    // Hvis databasen er tom, sørg for at nåværende sesong i hvert fall eksisterer
    if (unikeSesonger.size === 0) {
        unikeSesonger.add(nåværendeÅr);
    }

    let valgt = periodSelect?.value;
    
    // Hvis brukeren ikke har valgt noe manuelt ennå, sett inneværende år som standard
    if (periodSelect && !periodSelect.hasAttribute('data-user-selected') && unikeSesonger.has(nåværendeÅr)) {
        valgt = nåværendeÅr;
    }

    if (periodSelect) {
        periodSelect.innerHTML = '';
        // Sorterer sesongene slik at nyeste årstall kommer øverst i listen
        Array.from(unikeSesonger).sort().reverse().forEach(aar => {
            periodSelect.innerHTML += `<option value="${aar}">SESONG ${aar}</option>`;
        });
        
        if (valgt) periodSelect.value = valgt;
    }
}

function oppdaterTestStats() {
    if (!globalData) return;
    
    const periodWordEl = document.getElementById('stat-period-word');
    if (periodWordEl && periodSelect) {
        periodWordEl.innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }

    // Standardiserer til inneværende år hvis selecten feiler
    const valgtSesong = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    lagretStatsArray = kvernRaaData(globalData.players || {}, globalData.attendance || {}, globalData.matches || {}, valgtSesong);
    
    renderTestTab(); 
}

// --- OPTIMALISERT DATAKVERNING BASERT PÅ HELE SESONGER ---
function kvernRaaData(players, attendance, matches, valgtSesong) {
    const naa = new Date();
    const dagensDatoTall = Number(`${naa.getFullYear()}${String(naa.getMonth() + 1).padStart(2, '0')}${String(naa.getDate()).padStart(2, '0')}`);

    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = (pData.navn || pData.name || "").trim();
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0;
            let totalRatingScore = 0, antallRatings = 0, mvpLagScore = 0;

            // Filtrerer ut økter som kun tilhører det valgte året (sesongen)
            const relevanteNøkler = Object.keys(attendance).filter(key => hentSesongFraNokkel(key, attendance) === valgtSesong);

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
                // Sjekker om kampen tilhører valgt sesong ut ifra oppmøtenøkkel eller kampdatoen selv
                const tilhorerSesongen = (attendance[mId] && hentSesongFraNokkel(mId, attendance) === valgtSesong) ||
                                         (m.date && m.date.includes('-') && (m.date.split('-')[0].length === 4 ? m.date.split('-')[0] : m.date.split('-')[2]) === valgtSesong);
                
                if (!tilhorerSesongen) return;

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

// --- VISNINGSFUNKSJON MED TO DESIMALER PÅ MVP OG LAG ---
function renderTestTab() {
    const container = document.getElementById('tabContentContainer');
    if (!container) return;

    let nøkkel = 'mål';
    let tekst = 'mål';
    let visMedDesimaler = false;

    if (currentActiveTab === 'assist') { nøkkel = 'assist'; tekst = 'assists'; }
    else if (currentActiveTab === 'trening') { nøkkel = 'treninger'; tekst = 'treninger'; }
    else if (currentActiveTab === 'kamp') { nøkkel = 'kamperOppmøte'; tekst = 'kamper'; }
    else if (currentActiveTab === 'mvpkamp') { nøkkel = 'mvpKamp'; tekst = 'poeng'; visMedDesimaler = true; }
    else if (currentActiveTab === 'mvplag') { nøkkel = 'mvpLag'; tekst = 'poeng'; visMedDesimaler = true; }

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
            <div class="stat-row" style="display:flex; justify-content:space-between; padding:14px 0; border-bottom:1px solid #f1f5f9; font-weight:600; align-items:center;">
                <span>
                    <span style="display:inline-block; width:28px; color:${i===0 ? '#eab308' : 'var(--text-muted)'}; font-weight:900; font-size:1.1rem;">${i + 1}</span>
                    <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                </span>
                <span style="color:var(--bsk-blue); font-weight:800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${verdiVisning} ${tekst}</span>
            </div>`;
    });

    if (resten.length > 0) {
        const extraId = `extra-test-${currentActiveTab}`;
        html += `
            <div id="${extraId}" style="display:none;">
                ${resten.map((s, i) => {
                    const verdiVisning = visMedDesimaler ? Number(s[nøkkel]).toFixed(2) : s[nøkkel];
                    return `
                    <div class="stat-row" style="display:flex; justify-content:space-between; padding:14px 0; border-bottom:1px solid #f1f5f9; font-weight:600; align-items:center;">
                        <span>
                            <span style="display:inline-block; width:28px; color:var(--text-muted); font-size:0.95rem;">${i + 6}</span>
                            <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                        </span>
                        <span style="color:var(--bsk-blue); font-weight:800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${verdiVisning} ${tekst}</span>
                    </div>`;
                }).join('')}
            </div>
            <button onclick="event.stopPropagation(); window.toggleTestList('${extraId}', this)" class="show-all-btn">
                VIS ALLE (${sortert.length} SPILLERE) <i class="fa-solid fa-chevron-down"></i>
            </button>`;
    }

    container.innerHTML = html;
}

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

window.toggleTestList = function(id, btn) {
    const div = document.getElementById(id);
    if (div.style.display === 'none') {
        div.style.display = 'block';
        btn.innerHTML = `VIS FÆRRE <i class="fa-solid fa-chevron-up"></i>`;
    } else {
        div.style.display = 'none';
        btn.innerHTML = `VIS ALLE (${lagretStatsArray.length} SPILLERE) <i class="fa-solid fa-chevron-down"></i>`;
    }
};
