import { db } from './firebase-config.js';
import { ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const tableBody = document.getElementById('playerTableBody');
const playerForm = document.getElementById('playerForm');

let spillerliste = [];
let currentFilter = 'Alle';

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

// --- OPPDATERER HERO-STATS ---
function updateHeroStats(liste) {
    const aktive = liste.filter(s => s.status === 'Aktiv');
    const rekrutter = liste.filter(s => s.status === 'Rekrutt');
    
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
    const data = snapshot.val() || {};
    spillerliste = Object.entries(data).map(([id, values]) => ({
        id: id,
        ...values
    })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    
    updateHeroStats(spillerliste);
    renderPlayers();
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
    if (spillerliste.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding:20px;">Ingen spillere funnet.</td></tr>';
        return;
    }

    const currentYear = new Date().getFullYear();

    tableBody.innerHTML = spillerliste.map(s => {
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

        return `
            <tr class="match-row" onclick="window.editPlayer('${s.id}')" style="cursor:pointer;">
                <td class="name-col" style="text-align: left;">
                    ${s.navn}${statusBadge}
                </td>
                
                <td>${s.draktnummer || '-'}</td>
                
                <td>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span style="display:inline-block; width:28px; height:28px; line-height:28px; background:var(--text-main); color:white; border-radius:50%; font-weight:800; font-size:0.8rem;">${n1}</span>
                        ${n2 !== '-' ? `<span style="color:var(--text-muted); font-size:0.75rem; font-weight: 500;">${n2}</span>` : ''}
                    </div>
                </td>
                
                <td><span class="status-pill" style="background:#f1f2f6; min-width:30px; font-weight:700;">${fotVisning}</span></td>
                
                <td>${alder}</td>
                
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
        status: document.getElementById('status').value
    };

    if (editId) {
        set(ref(db, `players/${editId}`), spillerData).then(() => window.closePlayerModal());
    } else {
        const newRef = push(ref(db, 'players'));
        set(newRef, spillerData).then(() => window.closePlayerModal());
    }
});
