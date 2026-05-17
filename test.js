import { db } from './firebase-config.js';
import { ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const tableBody = document.getElementById('playerTableBody');
const playerForm = document.getElementById('playerForm');
const periodSelect = document.getElementById('statPeriodSelect');
const lagFilterSelect = document.getElementById('lagFilterSelect'); // Det nye lagfilteret i headeren

let spillerliste = [];
let currentLagFilter = 'Alle'; // Standard filterverdi

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

// --- GLOBALT SYNKRONISERT SESONGFILTER FOR HEADINGEN ---
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

if (periodSelect) {
    periodSelect.addEventListener('change', () => {
        periodSelect.setAttribute('data-user-selected', 'true');
    });
}

// Lytter på endringer i lagvelgeren i headeren
if (lagFilterSelect) {
    lagFilterSelect.addEventListener('change', (e) => {
        currentLagFilter = e.target.value;
        updateHeroStats(spillerliste);
        renderPlayers();
    });
}

// --- OPPDATERER HERO-STATS (Tar hensyn til valgt lag) ---
function updateHeroStats(liste) {
    // Filtrerer listen basert på valgt lag først, slik at snittalder og antall oppdateres live
    const lagFiltrert = liste.filter(s => currentLagFilter === 'Alle' || (s.lag || 'A-lag') === currentLagFilter);

    const aktive = lagFiltrert.filter(s => s.status === 'Aktiv');
    const rekrutter = lagFiltrert.filter(s => s.status === 'Rekrutt');
    
    const relevante = [...aktive, ...rekrutter];
    const currentYear = new Date().getFullYear();
    const totalAlder = relevante.reduce((acc, s) => acc + (s.fodselsaar ? (currentYear - s.fodselsaar) : 0), 0);
    
    const snittAlder = relevante.length > 0 ? (totalAlder / relevante.length).toFixed(1) : 0;

    if (document.getElementById('stat-total-players')) {
        document.getElementById('stat-total-players').innerText = `${relevante.length} spillere`;
    }
    if (document.getElementById('stat-avg-age')) {
        document.getElementById('stat-avg-age').innerText = `${snittAlder} år`;
    }
    if (document.getElementById('stat-total-rekrutt')) {
        document.getElementById('stat-total-rekrutt').innerText = `${rekrutter.length} rekrutter`;
    }
}

// --- HENT DATA FRA FIREBASE (Alfabetisk sortering bevart) ---
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

// Lukk modal hvis man klikker på utsiden
window.onclick = function(event) {
    const modal = document.getElementById('playerModal');
    if (event.target === modal) {
        window.closePlayerModal();
    }
};

// --- TEGN OPP TABELLEN ---
function renderPlayers() {
    if (!tableBody) return;
    
    // Filtrerer ut spillerne som skal på skjermen. Mangler de lag-feltet i db, faller de tilbake til 'A-lag'
    const filtrertListe = spillerliste.filter(s => currentLagFilter === 'Alle' || (s.lag || 'A-lag') === currentLagFilter);

    if (filtrertListe.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:var(--text-muted);">Ingen spillere funnet for ${currentLagFilter}.</td></tr>`;
        return;
    }

    const currentYear = new Date().getFullYear();

    tableBody.innerHTML = filtrertListe.map(s => {
        const alder = s.fodselsaar ? (currentYear - s.fodselsaar) : '-';
        const n1 = posMap[s.pos1] || '?';
        const n2 = posMap[s.pos2] || '-';
        const fotVisning = s.fot === 'Begge' ? 'B' : (s.fot === 'Venstre' ? 'V' : 'H');

        let statusBadge = '';
        if (s.status === 'Rekrutt') {
            statusBadge = '<span style="font-size:0.7rem; color:var(--bsk-blue); margin-left:5px; font-weight:800;">(R)</span>';
        } else if (s.status === 'Passiv') {
            statusBadge = '<span style="font-size:0.7rem; color:var(--text-muted); margin-left:5px; font-weight:500;">(P)</span>';
        }

        // Viser en liten subtil indikator ved siden av navnet om man ser på "ALLE" og spilleren er på B-laget
        const lagBadge = (s.lag === 'B-lag' && currentLagFilter === 'Alle') ? '<span style="font-size:0.65rem; background:#e2e8f0; color:#334155; padding:2px 6px; border-radius:4px; margin-left:5px; font-weight:700;">B</span>' : '';

        const posisjonsVisning = n2 !== '-' ? `${n1} - ${n2}` : n1;

        return `
            <tr class="match-row" onclick="window.editPlayer('${s.id}')" style="cursor:pointer;">
                <td class="name-col" style="text-align: left;">
                    ${s.navn}${statusBadge}${lagBadge}
                </td>
                
                <td style="text-align: center;">${s.draktnummer || '-'}</td>
                
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

    document.getElementById('editId').value = id;
    document.getElementById('navn').value = spiller.navn || '';
    document.getElementById('fodselsaar').value = spiller.fodselsaar || '';
    document.getElementById('pos1').value = spiller.pos1 || 'Keeper';
    document.getElementById('pos2').value = spiller.pos2 || '-';
    document.getElementById('fot').value = spiller.fot || 'Høyre';
    document.getElementById('draktnummer').value = spiller.draktnummer || '';
    document.getElementById('status').value = spiller.status || 'Aktiv';
    
    // Setter skjemafeltet for lag til riktig verdi (med fallback til A-lag)
    if (document.getElementById('spillerLag')) {
        document.getElementById('spillerLag').value = spiller.lag || 'A-lag';
    }

    document.getElementById('formTitle').innerText = 'Rediger spiller';
    document.getElementById('submitBtn').innerText = 'OPPDATER SPILLER';
    document.getElementById('playerModal').style.display = 'flex';
};

// --- SLETT SPILLER ---
window.deletePlayer = function(id) {
    if (confirm('Vil du slette denne spilleren fra stallen?')) {
        remove(ref(db, `players/${id}`));
    }
};

// --- LAGRE / OPPDATERE ---
playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const spillerData = {
        navn: document.getElementById('navn').value,
        fodselsaar: parseInt(document.getElementById('fodselsaar').value) || '',
        pos1: document.getElementById('pos1').value,
        pos2: document.getElementById('pos2').value,
        fot: document.getElementById('fot').value,
        draktnummer: document.getElementById('draktnummer').value || '-',
        status: document.getElementById('status').value,
        lag: document.getElementById('spillerLag') ? document.getElementById('spillerLag').value : 'A-lag' // Lagrer lag-valget
    };

    if (editId) {
        set(ref(db, `players/${editId}`), spillerData).then(() => window.closePlayerModal());
    } else {
        const newRef = push(ref(db, 'players'));
        set(newRef, spillerData).then(() => window.closePlayerModal());
    }
});
