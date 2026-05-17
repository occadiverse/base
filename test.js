import { db } from './firebase-config.js';
import { ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const tableBody = document.getElementById('playerTableBody');
const playerForm = document.getElementById('playerForm');
const periodSelect = document.getElementById('statPeriodSelect'); // Styrer valgt sesongårstall (f.eks "2026")
const lagFilterSelect = document.getElementById('lagFilterSelect'); // Styrer valgt lag (Alle, Lag A, Lag B)

let spillerliste = [];
let currentLagFilter = 'Alle';

// --- OVERSETTER FOR POSISJONSNUMRE ---
const posMap = {
    'Keeper': '1',
    'Høyre bekk': '2',
    'Venstre bekk': '3',
    'Høyre stopper': '4',
    'Venstre stopper': '5',
    'Defensiv midtbane': '6',
    'Høyre kant': '7',
    'Offensiv midtbane': '8',
    'Spiss': '9',
    'Playmaker': '10',
    'Venstre kant': '11',
    '-': '-'
};

// --- GLOBALT SYNKRONISERT SESONGFILTER ---
function genererSesongFilter() {
    if (!periodSelect) return;
    
    const nåværendeÅr = new Date().getFullYear();
    const unikeSesonger = new Set([nåværendeÅr.toString(), (nåværendeÅr + 1).toString()]);
    
    let valgt = periodSelect.value;
    if (!periodSelect.hasAttribute('data-user-selected')) {
        valgt = nåværendeÅr.toString();
    }

    periodSelect.innerHTML = '';
    Array.from(unikeSesonger).sort().reverse().forEach(aar => {
        periodSelect.innerHTML += `<option value="${aar}">SESONG ${aar}</option>`;
    });
    
    if (valgt) periodSelect.value = valgt;
}

// Hvis brukeren bytter sesong, må vi regne ut alder, status og lag på nytt for det året
if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        periodSelect.setAttribute('data-user-selected', 'true');
        updateHeroStats(spillerliste);
        renderPlayers();
    });
}

// Hvis brukeren bytter lagfilter
if (lagFilterSelect) {
    lagFilterSelect.addEventListener('change', (e) => {
        currentLagFilter = e.target.value;
        updateHeroStats(spillerliste);
        renderPlayers();
    });
}

// --- UTREKNING AV SESONGDATA (Hjelpefunksjon) ---
// Henter ut status, lag og draktnummer for en spesifikk sesong med trygge fallbacks
function hentSesongData(spiller, valgtÅr) {
    if (spiller.historikk && spiller.historikk[valgtÅr]) {
        return {
            lag: spiller.historikk[valgtÅr].lag || 'Lag A',
            status: spiller.historikk[valgtÅr].status || 'Aktiv',
            draktnummer: spiller.historikk[valgtÅr].draktnummer || '-'
        };
    }
    // Fallback-logikk for eksisterende flate data (bakoverkompatibelt for sesong 2026)
    return {
        lag: spiller.lag === 'B-lag' ? 'Lag B' : (spiller.lag || 'Lag A'),
        status: spiller.status || 'Aktiv',
        draktnummer: spiller.draktnummer || '-'
    };
}

// --- OPPDATERER HERO-STATS ---
function updateHeroStats(liste) {
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    
    // Filtrer listen basert på hvem som tilhører valgt lag i den valgte sesongen
    const relevanteForSesongOgLag = liste.filter(s => {
        const sData = hentSesongData(s, valgtÅr);
        if (currentLagFilter === 'Alle') return true;
        return sData.lag === currentLagFilter;
    });

    // Finn aktive og rekrutter for det spesifikke året
    const aktive = relevanteForSesongOgLag.filter(s => hentSesongData(s, valgtÅr).status === 'Aktiv');
    const rekrutter = relevanteForSesongOgLag.filter(s => hentSesongData(s, valgtÅr).status === 'Rekrutt');
    
    const relevanteStats = [...aktive, ...rekrutter];
    const totalAlder = relevanteStats.reduce((acc, s) => acc + (s.fodselsaar ? (Number(valgtÅr) - s.fodselsaar) : 0), 0);
    const snittAlder = relevanteStats.length > 0 ? (totalAlder / relevanteStats.length).toFixed(1) : 0;

    if (document.getElementById('stat-total-players')) {
        document.getElementById('stat-total-players').innerText = `${relevanteStats.length} spillere`;
    }
    if (document.getElementById('stat-avg-age')) {
        document.getElementById('stat-avg-age').innerText = `${snittAlder} år`;
    }
    if (document.getElementById('stat-total-rekrutt')) {
        document.getElementById('stat-total-rekrutt').innerText = `${rekrutter.length} rekrutter`;
    }
}

// --- HENT DATA FRA FIREBASE ---
onValue(ref(db, 'players'), (snapshot) => {
    try {
        const data = snapshot.val() || {};
        spillerliste = Object.entries(data).map(([id, values]) => ({
            id: id,
            ...values
        })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
        
        genererSesongFilter();
        updateHeroStats(spillerliste);
        renderPlayers();
    } catch (err) {
        console.error("Feil under lasting av spillere:", err);
    }
});

// --- VISNINGSKONTROLL MODALER ---
window.openPlayerModal = () => {
    if (playerForm) playerForm.reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = 'Registrer spiller';
    document.getElementById('submitBtn').innerText = 'LAGRE SPILLER';
    document.getElementById('playerModal').style.display = 'flex';
};

window.closePlayerModal = () => {
    document.getElementById('playerModal').style.display = 'none';
    if (playerForm) playerForm.reset();
    document.getElementById('editId').value = '';
};

window.onclick = function(event) {
    const modal = document.getElementById('playerModal');
    if (event.target === modal) {
        window.closePlayerModal();
    }
};

// --- TEGN OPP TABELLEN ---
function renderPlayers() {
    if (!tableBody) return;
    
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();

    // Filtrer spillere basert på lagtilhørighet i den valgte sesongen
    const filtrertListe = spillerliste.filter(s => {
        const sData = hentSesongData(s, valgtÅr);
        if (currentLagFilter === 'Alle') return true;
        return sData.lag === currentLagFilter;
    });

    if (filtrertListe.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-muted);">Ingen spillere registrert på ${currentLagFilter} i denne sesongen.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtrertListe.map(s => {
        // Dynamisk alder regnet ut fra den valgte sesongen i stedet for dagens dato!
        const alder = s.fodselsaar ? (Number(valgtÅr) - s.fodselsaar) : '-';
        
        const n1 = posMap[s.pos1] || '?';
        const n2 = posMap[s.pos2] || '-';
        const fotVisning = s.fot === 'Begge' ? 'B' : (s.fot === 'Venstre' ? 'V' : 'H');

        // Hent sesongspesifikke verdier
        const sData = hentSesongData(s, valgtÅr);

        let statusBadge = '';
        if (sData.status === 'Rekrutt') {
            statusBadge = '<span style="font-size:0.7rem; color:var(--bsk-blue); margin-left:5px; font-weight:800;">(R)</span>';
        } else if (sData.status === 'Passiv') {
            statusBadge = '<span style="font-size:0.7rem; color:var(--text-muted); margin-left:5px; font-weight:500;">(P)</span>';
        }

        // Viser en liten 'B' hvis man har filteret stående på 'ALLE' og spilleren er registrert på Lag B i denne sesongen
        const lagBadge = (sData.lag === 'Lag B' && currentLagFilter === 'Alle') ? '<span style="font-size:0.65rem; background:#e2e8f0; color:#334155; padding:2px 6px; border-radius:4px; margin-left:5px; font-weight:700;">B</span>' : '';

        const posisjonsVisning = n2 !== '-' ? `${n1} - ${n2}` : n1;

        return `
            <tr class="match-row" onclick="window.editPlayer('${s.id}')" style="cursor:pointer;">
                <td class="name-col" style="text-align: left;">
                    ${s.navn}${statusBadge}${lagBadge}
                </td>
                
                <td style="text-align: center;">${sData.draktnummer || '-'}</td>
                
                <td style="text-align: center;">${posisjonsVisning}</td>
                
                <td style="text-align: center;">${fotVisning}</td>
                
                <td style="text-align: center;">${alder}</td>
                
                <td>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="action-btn btn-edit" onclick="event.stopPropagation(); window.editPlayer('${s.id}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="event.stopPropagation(); window.deletePlayer('${s.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- REDIGER SPILLER ---
window.editPlayer = function(id) {
    const spiller = spillerliste.find(s => s.id === id);
    if (!spiller) return;

    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    const sData = hentSesongData(spiller, valgtÅr);

    document.getElementById('editId').value = id;
    document.getElementById('navn').value = spiller.navn || '';
    document.getElementById('fodselsaar').value = spiller.fodselsaar || '';
    document.getElementById('pos1').value = spiller.pos1 || 'Keeper';
    document.getElementById('pos2').value = spiller.pos2 || '-';
    document.getElementById('fot').value = spiller.fot || 'Høyre';
    
    // Fyller feltene basert på historisk status for akkurat dette valgte året!
    document.getElementById('draktnummer').value = sData.draktnummer === '-' ? '' : sData.draktnummer;
    document.getElementById('status').value = sData.status;
    if (document.getElementById('spillerLag')) {
        document.getElementById('spillerLag').value = sData.lag;
    }

    document.getElementById('formTitle').innerText = `Rediger spiller (${valgtÅr})`;
    document.getElementById('submitBtn').innerText = 'OPPDATER SPILLER';
    document.getElementById('playerModal').style.display = 'flex';
};

// --- SLETT SPILLER ---
window.deletePlayer = function(id) {
    if (confirm('Vil du slette denne spilleren fullstendig fra hele databasen (inkludert all historikk)?')) {
        remove(ref(db, `players/${id}`));
    }
};

// --- LAGRE / OPPDATERE ---
playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    
    // 1. Hent ut verdier som ALLTID er faste for spilleren uansett årstall
    const fastSpillerData = {
        navn: document.getElementById('navn').value,
        fodselsaar: parseInt(document.getElementById('fodselsaar').value) || '',
        pos1: document.getElementById('pos1').value,
        pos2: document.getElementById('pos2').value,
        fot: document.getElementById('fot').value
    };

    // 2. Gjør klar de sesongavhengige dataene
    const nySesongData = {
        lag: document.getElementById('spillerLag') ? document.getElementById('spillerLag').value : 'Lag A',
        status: document.getElementById('status').value,
        draktnummer: document.getElementById('draktnummer').value || '-'
    };

    if (editId) {
        // Hvis vi redigerer en eksisterende spiller, må vi hente med oss den gamle historikken 
        // fra andre årstall så vi ikke overskriver tidslinjen deres!
        const eksisterendeSpiller = spillerliste.find(s => s.id === editId);
        const oppdatertHistorikk = eksisterendeSpiller.historikk || {};
        
        // Oppdater eller opprett noden for akkurat dette året
        oppdatertHistorikk[valgtÅr] = nySesongData;

        const komplettSpillerData = {
            ...fastSpillerData,
            historikk: oppdatertHistorikk
        };

        set(ref(db, `players/${editId}`), komplettSpillerData).then(() => window.closePlayerModal());
    } else {
        // Ny spiller får opprettet sin første historikk-node under det valgte årstallet
        const nyHistorikk = {};
        nyHistorikk[valgtÅr] = nySesongData;

        const komplettSpillerData = {
            ...fastSpillerData,
            historikk: nyHistorikk
        };

        const newRef = push(ref(db, 'players'));
        set(newRef, komplettSpillerData).then(() => window.closePlayerModal());
    }
});
