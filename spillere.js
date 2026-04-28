document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('playerTableBody');
    const playerForm = document.getElementById('playerForm');
    let spillerliste = [];

    // --- MODAL HÅNDTERING ---
    window.openModal = () => {
        document.getElementById('formTitle').innerText = 'Registrer ny spiller';
        document.getElementById('submitBtn').innerText = 'Lagre spiller';
        document.getElementById('playerModal').style.display = 'flex';
    };

    window.closeModal = () => {
        document.getElementById('playerModal').style.display = 'none';
        playerForm.reset();
        document.getElementById('editId').value = '';
    };

    // --- LAGRE / OPPDATERE SPILLER ---
    playerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editId').value;
        
        const spillerData = {
            navn: document.getElementById('navn').value,
            fodselsdato: document.getElementById('fodselsdato').value,
            status: document.getElementById('status').value,
            mobil: document.getElementById('mobil').value,
            draknummer: document.getElementById('draktnummer').value || '-'
        };

        if (editId) {
            // Oppdater eksisterende
            window.dbSet(window.dbRef(window.db, `players/${editId}`), spillerData)
                .then(() => closeModal());
        } else {
            // Lag ny
            const newPlayerRef = window.dbPush(window.dbRef(window.db, 'players'));
            window.dbSet(newPlayerRef, spillerData)
                .then(() => closeModal());
        }
    });

    // --- REDIGER SPILLER ---
    window.editPlayer = function(id) {
        const spiller = spillerliste.find(s => s.id === id);
        if (!spiller) return;

        document.getElementById('editId').value = id;
        document.getElementById('navn').value = spiller.navn || '';
        document.getElementById('fodselsdato').value = spiller.fodselsdato || '';
        document.getElementById('status').value = spiller.status || 'Aktiv';
        document.getElementById('mobil').value = spiller.mobil || '';
        document.getElementById('draktnummer').value = spiller.draknummer || '';

        document.getElementById('formTitle').innerText = 'Rediger spiller';
        document.getElementById('submitBtn').innerText = 'Oppdater spiller';

        document.getElementById('playerModal').style.display = 'flex';
    };

    // --- SLETTE SPILLER ---
    window.deletePlayer = function(id) {
        if (confirm('Er du sikker på at du vil slette denne spilleren?')) {
            window.dbRemove(window.dbRef(window.db, `players/${id}`));
        }
    };

    // --- TEGN OPP TABELLEN ---
    function renderPlayers(data) {
        if (!data) {
            tableBody.innerHTML = '<tr><td colspan="5">Ingen spillere funnet</td></tr>';
            return;
        }

        // Konverterer objekt til liste og sorterer alfabetisk
        spillerliste = Object.entries(data).map(([id, values]) => ({
            id,
            ...values
        })).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));

        tableBody.innerHTML = spillerliste.map(s => `
            <tr>
                <td><strong style="color: var(--primary);">${s.draknummer || '-'}</strong></td>
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
                        <button class="action-btn btn-edit" onclick="editPlayer('${s.id}')" title="Rediger">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deletePlayer('${s.id}')" title="Slett">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // --- HENT DATA FRA FIREBASE (Live) ---
    if (window.dbOnValue && window.dbRef && window.db) {
        const playersRef = window.dbRef(window.db, 'players');
        window.dbOnValue(playersRef, (snapshot) => {
            renderPlayers(snapshot.val());
        });
    }
});
