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

// --- NY FUNKSJON: OPPDATERER HERO-STATS ---
function updateHeroStats(liste) {
    const aktive = liste.filter(s => s.status === 'Aktiv');
    const rekrutter = liste.filter(s => s.status === 'Rekrutt');
    
    // Vi beregner snittalder for de som er enten Aktiv eller Rekrutt
    const relevante = [...aktive, ...rekrutter];
    const currentYear = new Date().getFullYear();
    const totalAlder = relevante.reduce((acc, s) => acc + (s.fodselsaar ? (currentYear - s.fodselsaar) : 0), 0);
    
    const snittAlder = relevante.length > 0 ? (totalAlder / relevante.length).toFixed(1) : 0;

    // Oppdaterer HTML-elementene i Hero-seksjonen
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

// --- HENT DATA FRA FIREBASE ---
onValue(ref(db, 'players'), (snapshot) => {
    const data = snapshot.val() || {};
    // Konverterer objekt til liste med ID
    spillerliste = Object.entries(data).map(([id, values]) => ({
        id: id,
        ...values
    })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    
    // Oppdaterer statistikk i Hero
    updateHeroStats(spillerliste);
    
    renderPlayers();
});

// --- BYTT VISNING (Filtrering) ---
window.switchPlayerView = (filter) => {
    currentFilter = filter;
    
    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => {
        const mappedValue = posMap[filter] || filter;
        if (btn.innerText === mappedValue || (filter === 'Alle' && btn.innerText === 'ALLE')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderPlayers();
};

// --- TEGN OPP TABELLEN ---
function renderPlayers() {
    if (spillerliste.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding:20px;">Ingen spillere funnet.</td></tr>';
        return;
    }

    let filtrertListe = spillerliste;
    if (currentFilter !== 'Alle') {
        filtrertListe = spillerliste.filter(s => 
            s.pos1 === currentFilter || s.pos2 === currentFilter
        );
    }

    const currentYear = new Date().getFullYear();

    tableBody.innerHTML = filtrertListe.map(s => {
        const alder = s.fodselsaar ? (currentYear - s.fodselsaar) : '-';
        const n1 = posMap[s.pos1] || '?';
        const n2 = posMap[s.pos2] || '-';
        
        const fotVisning = s.fot === 'Begge' ? 'B' : (s.fot === 'Venstre' ? 'V' : 'H');

        return `
            <tr>
                <td><strong style="color: var(--text-main);">${s.draktnummer || '-'}</strong></td>
                <td class="name-col">
                    <strong>${s.navn}</strong>
                    ${s.status === 'Passiv' ? '<span style="font-size:0.7rem; color:var(--text-muted); margin-left:5px;">(P)</span>' : ''}
                </td>
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
                        <button class="action-btn btn-edit" onclick="window.editPlayer('${s.id}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="window.deletePlayer('${s.id}')">
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
    document.getElementById('status').value = spiller.status || 'Aktiv'; // NY

    document.getElementById('formTitle').innerText = 'Rediger spiller';
    document.getElementById('submitBtn').innerText = 'Oppdater spiller';
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
        status: document.getElementById('status').value // NY
    };

    if (editId) {
        set(ref(db, `players/${editId}`), spillerData).then(() => window.closeModal());
    } else {
        const newRef = push(ref(db, 'players'));
        set(newRef, spillerData).then(() => window.closeModal());
    }
});
