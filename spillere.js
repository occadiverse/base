import { db } from './firebase-config.js';
import { ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const tableBody = document.getElementById('playerTableBody');
const playerForm = document.getElementById('playerForm');
let spillerliste = [];

// --- HENT DATA FRA FIREBASE (Live lytter) ---
onValue(ref(db, 'players'), (snapshot) => {
    const data = snapshot.val();
    console.log("Data mottatt fra Firebase:", data); // Sjekk i konsollen om dataene kommer
    renderPlayers(data);
});

// --- TEGN OPP TABELLEN ---
function renderPlayers(data) {
    if (!data) {
        tableBody.innerHTML = '<tr><td colspan="5" style="padding:20px;">Ingen spillere funnet i databasen.</td></tr>';
        return;
    }

    // Konverterer objekt til liste og sorterer alfabetisk
    spillerliste = Object.entries(data).map(([id, values]) => ({
        id: id, // Dette er den unike Firebase-nøkkelen
        ...values
    })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));

    tableBody.innerHTML = spillerliste.map(s => `
        <tr>
            <td><strong style="color: var(--primary);">${s.draktnummer || s.draknummer || '-'}</strong></td>
            <td class="text-left" style="font-weight: 600;">${s.navn}</td>
            <td>
                <span class="status-pill ${s.status === 'Aktiv' ? 'status-active' : 'status-passive'}">
                    ${s.status}
                </span>
            </td>
            <td>
                <a href="tel:${s.mobil}" style="text-decoration:none; color:var(--primary); font-weight: 500;">
                    <i class="fa-solid fa-phone" style="font-size: 0.8em; margin-right: 5px;"></i>${s.mobil || '-'}
                </a>
            </td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="action-btn btn-edit" onclick="window.editPlayer('${s.id}')" title="Rediger">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="window.deletePlayer('${s.id}')" title="Slett">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// --- GLOBALE FUNKSJONER (Tvinges ut på window) ---

window.editPlayer = function(id) {
    console.log("Prøver å redigere ID:", id);
    const spiller = spillerliste.find(s => s.id === id);
    if (!spiller) return;

    document.getElementById('editId').value = id;
    document.getElementById('navn').value = spiller.navn || '';
    document.getElementById('fodselsdato').value = spiller.fodselsdato || '';
    document.getElementById('status').value = spiller.status || 'Aktiv';
    document.getElementById('mobil').value = spiller.mobil || '';
    document.getElementById('draktnummer').value = spiller.draktnummer || spiller.draknummer || '';

    document.getElementById('formTitle').innerText = 'Rediger spiller';
    document.getElementById('submitBtn').innerText = 'Oppdater spiller';
    document.getElementById('playerModal').style.display = 'flex';
};

window.deletePlayer = function(id) {
    console.log("Slette-forespørsel sendt for ID:", id);
    if (confirm('Er du sikker på at du vil slette denne spilleren?')) {
        const playerRef = ref(db, `players/${id}`);
        remove(playerRef)
            .then(() => {
                console.log("Sletting vellykket for ID:", id);
                // Tabellen vil oppdatere seg selv automatisk pga onValue over
            })
            .catch((error) => {
                console.error("Feil ved sletting:", error);
                alert("Kunne ikke slette spilleren: " + error.message);
            });
    }
};

// --- LAGRE / OPPDATERE ---
playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const spillerData = {
        navn: document.getElementById('navn').value,
        fodselsdato: document.getElementById('fodselsdato').value,
        status: document.getElementById('status').value,
        mobil: document.getElementById('mobil').value,
        draktnummer: document.getElementById('draktnummer').value || '-'
    };

    if (editId) {
        set(ref(db, `players/${editId}`), spillerData).then(() => window.closeModal());
    } else {
        const newRef = push(ref(db, 'players'));
        set(newRef, spillerData).then(() => window.closeModal());
    }
});
