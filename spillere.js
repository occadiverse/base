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

// --- HENT DATA FRA FIREBASE ---
onValue(ref(db, 'players'), (snapshot) => {
    const data = snapshot.val() || {};
    // Konverterer objekt til liste med ID
    spillerliste = Object.entries(data).map(([id, values]) => ({
        id: id,
        ...values
    })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    
    renderPlayers();
});

// --- BYTT VISNING (Filtrering) ---
window.switchPlayerView = (filter) => {
    currentFilter = filter;
    
    // Oppdater aktive knapper i filter-linjen
    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => {
        const mappedValue = posMap[filter] || filter;
        // Sjekker om knappens tekst matcher nummeret eller "ALLE"
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

    // Filtrering: Vis alle, eller de som har valgt posisjon som Pos 1 eller Pos 2
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
        
        // Forkortelse for fot
        const fotVisning = s.fot === 'Begge' ? 'B' : (s.fot === 'Venstre' ? 'V' : 'H');

        return `
            <tr>
                <td><strong style="color: var(--primary);">${s.draktnummer || '-'}</strong></td>
                <td class="name-col"><strong>${s.navn}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <span style="display:inline-block; width:26px; height:26px; line-height:26px; background:var(--text-main); color:white; border-radius:50%; font-weight:800; font-size:0.8rem;">${n1}</span>
                        ${n2 !== '-' ? `<span style="color:var(--text-muted); font-size:0.75rem;">/ ${n2}</span>` : ''}
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
        draktnummer: document.getElementById('draktnummer').value || '-'
    };

    if (editId) {
        set(ref(db, `players/${editId}`), spillerData).then(() => window.closeModal());
    } else {
        const newRef = push(ref(db, 'players'));
        set(newRef, spillerData).then(() => window.closeModal());
    }
});
