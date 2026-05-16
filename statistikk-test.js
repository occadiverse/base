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

// --- DATODETEKTOR (Håndterer både rene datoer og de nye Kamp-ID-ene) ---
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

// --- INITIALISERING OG METRIC-TRIGGER ---
onValue(ref(db, '/'), (snapshot) => {
    globalData = snapshot.val() || {};
    genererDynamiskFilter();
    oppdaterTestStats();
});

if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        periodSelect.setAttribute('data-user-selected', 'true');
        oppdaterTestStats();
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

function oppdaterTestStats() {
    if (!globalData) return;
    
    const periodWordEl = document.getElementById('stat-period-word');
    if (periodSelect && periodWordEl) {
        periodWordEl.innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }

    const valgtPeriode = periodSelect ? periodSelect.value : 'total';
    lagretStatsArray = kvernRaaData(globalData.players || {}, globalData.attendance || {}, globalData.matches || {}, valgtPeriode);
    
    renderTestTab(); 
}

// --- MATEMATISK DATAKVERNING MED DOBBELTSJEKK AV SPILTE KAMPER ---
function kvernRaaData(players, attendance, matches, periodeValg) {
    return Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, pData]) => {
            const navn = (pData.navn || pData.name || "").trim();
            let treninger = 0, kamperOppmøte = 0, mål = 0, assist = 0;

            const relevanteNøkler = Object.keys(attendance).filter(key => periodeValg === 'total' || hentPeriodeFraNokkel(key, attendance) === periodeValg);

            relevanteNøkler.forEach(key => {
                if (attendance[key][id] === 'K') {
                    const info = attendance[key].info || {};
                    const type = info.type || 'Trening';
                    
                    if (type === 'Kamp') {
                        // Sjekker om kampen faktisk finnes i matches (enten via ID eller dato)
                        const tilhørendeKamp = matches[key] || Object.values(matches).find(m => matchDatoer(m.date, key));
                        
                        // SIKRING: Tell bare kampen hvis den faktisk er spilt (har et reelt resultat lagret)
                        if (tilhørendeKamp && tilhørendeKamp.result && tilhørendeKamp.result !== '-') {
                            kamperOppmøte++;
                        } else {
                            // Hvis kampen ikke er spilt ennå, eller er en fremtidig oppføring,
                            // skal vi IKKE telle den som kampoppmøte i historisk statistikk.
                        }
                    } else {
                        treninger++;
                    }
                }
            });

            Object.entries(matches).forEach(([mId, m]) => {
                const tilhorerPerioden = periodeValg === 'total' || 
                                         (attendance[mId] && hentPeriodeFraNokkel(mId, attendance) === periodeValg) ||
                                         (m.date && m.date.includes('-') && `${m.date.split('-')[1]}-${m.date.split('-')[0]}` === periodeValg);
                
                if (!tilhorerPerioden) return;

                // Teller bare mål og assist fra kamper som faktisk har et resultat
                if (m.result && m.result !== '-') {
                    if (m.goalScorers) mål += m.goalScorers.split(',').filter(s => s.trim() === navn).length;
                    if (m.assists) assist += m.assists.split(',').filter(a => a.trim() === navn).length;
                }
            });

            return { navn, kamperOppmøte, treninger, mål, assist };
        });
}

// --- VISNINGSFUNKSJON (Tegner opp fanene dynamisk) ---
function renderTestTab() {
    const container = document.getElementById('tabContentContainer');
    if (!container) return;

    let nøkkel = 'mål';
    let tekst = 'mål';

    if (currentActiveTab === 'assist') { nøkkel = 'assist'; tekst = 'assists'; }
    else if (currentActiveTab === 'trening') { nøkkel = 'treninger'; tekst = 'treninger'; }
    else if (currentActiveTab === 'kamp') { nøkkel = 'kamperOppmøte'; tekst = 'kamper'; }

    // Sorterer troppen fra mest til færrest basert på valgt fane
    const sortert = [...lagretStatsArray].sort((a, b) => b[nøkkel] - a[nøkkel]);

    if (sortert.length === 0 || sortert[0][nøkkel] === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px; font-weight:600;">Ingen registrerte data i denne perioden.</div>`;
        return;
    }

    const topp5 = sortert.slice(0, 5);
    const resten = sortert.slice(5);

    let html = '';
    topp5.forEach((s, i) => {
        html += `
            <div class="stat-row" style="display:flex; justify-content:space-between; padding:14px 0; border-bottom:1px solid #f1f5f9; font-weight:600; align-items:center;">
                <span>
                    <span style="display:inline-block; width:28px; color:${i===0 ? '#eab308' : 'var(--text-muted)'}; font-weight:900; font-size:1.1rem;">${i + 1}</span>
                    <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                </span>
                <span style="color:var(--bsk-blue); font-weight:800; background: var(--active-bg); padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${s[nøkkel]} ${tekst}</span>
            </div>`;
    });

    if (resten.length > 0) {
        const extraId = `extra-test-${currentActiveTab}`;
        html += `
            <div id="${extraId}" style="display:none;">
                ${resten.map((s, i) => `
                    <div class="stat-row" style="display:flex; justify-content:space-between; padding:14px 0; border-bottom:1px solid #f1f5f9; font-weight:600; align-items:center;">
                        <span>
                            <span style="display:inline-block; width:28px; color:var(--text-muted); font-size:0.95rem;">${i + 6}</span>
                            <span style="color:var(--text-main); font-size:0.95rem;">${s.navn}</span>
                        </span>
                        <span style="color:var(--bsk-blue); font-weight:800; background: var(--active-bg); padding: 4px 10px; border-radius: 6px; font-size:0.85rem;">${s[nøkkel]} ${tekst}</span>
                    </div>`).join('')}
            </div>
            <button onclick="event.stopPropagation(); window.toggleTestList('${extraId}', this)" style="margin-top:20px; background:none; border:none; color:var(--bsk-blue); font-weight:800; width:100%; text-align:center; cursor:pointer; font-size:0.85rem; letter-spacing:0.02em;">
                VIS ALLE (${sortert.length} SPILLERE)
            </button>`;
    }

    container.innerHTML = html;
}

// --- FANESTYRING (Globale metoder bundet til vinduet) ---
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
        btn.innerText = "VIS FÆRRE";
    } else {
        div.style.display = 'none';
        btn.innerText = `VIS ALLE (${lagretStatsArray.length} SPILLERE)`;
    }
};
