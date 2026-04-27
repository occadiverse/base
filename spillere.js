(function () {
    let spillerliste = DB.getPlayers();
    const tableBody = document.getElementById('playerTableBody');
    const playerForm = document.getElementById('playerForm');

    if (!tableBody || !playerForm) return;

    window.openModal = function() {
        document.getElementById('playerModal').style.display = 'block';
    }

    window.closeModal = function() {
        document.getElementById('playerModal').style.display = 'none';
        resetForm();
    }

    // Lukk modal hvis man klikker utenfor boksen
    window.onclick = function(event) {
        const modal = document.getElementById('playerModal');
        if (event.target === modal) closeModal();
    };

    playerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editId').value;
        
        const spillerData = {
            id: editId || DB.generateId(),
            navn: document.getElementById('navn').value,
            fodselsdato: document.getElementById('fodselsdato').value,
            status: document.getElementById('status').value,
            mobil: document.getElementById('mobil').value,
            draktnummer: document.getElementById('draktnummer').value
        };

        if (editId) {
            const index = spillerliste.findIndex(s => s.id === editId);
            if (index !== -1) spillerliste[index] = spillerData;
        } else {
            spillerliste.push(spillerData);
        }

        DB.savePlayers(spillerliste);
        renderPlayers();
        closeModal();
    });

    window.editPlayer = function(id) {
        const spiller = spillerliste.find(s => s.id === id);
        if (!spiller) return;

        document.getElementById('editId').value = spiller.id;
        document.getElementById('navn').value = spiller.navn;
        document.getElementById('fodselsdato').value = spiller.fodselsdato;
        document.getElementById('status').value = spiller.status;
        document.getElementById('mobil').value = spiller.mobil;
        document.getElementById('draktnummer').value = spiller.draktnummer;

        document.getElementById('formTitle').innerText = 'Rediger spiller';
        document.getElementById('submitBtn').innerText = 'Oppdater Spiller';

        openModal();
    }

    window.deletePlayer = function(id) {
        if (confirm('Er du sikker på at du vil slette denne spilleren?')) {
            spillerliste = spillerliste.filter(s => s.id !== id);
            DB.savePlayers(spillerliste);
            renderPlayers();
        }
    }

    function resetForm() {
        playerForm.reset();
        document.getElementById('editId').value = '';
        document.getElementById('formTitle').innerText = 'Registrer ny spiller';
        document.getElementById('submitBtn').innerText = 'Lagre Spiller';
    }

    window.renderPlayers = function() {
        // Sorterer alfabetisk
        const sorted = [...spillerliste].sort((a, b) => a.navn.localeCompare(b.navn));
        
        tableBody.innerHTML = sorted.map(s => `
            <tr>
                <td><strong>${s.draktnummer || '-'}</strong></td>
                <td class="text-left">${s.navn}</td>
                <td>${s.fodselsdato || '-'}</td>
                <td><span class="status-pill ${s.status === 'Aktiv' ? 'status-active' : 'status-passive'}">${s.status}</span></td>
                <td>${s.mobil || '-'}</td>
                <td>
                    <button class="btn btn-small btn-muted" onclick="editPlayer('${s.id}')">Endre</button>
                    <button class="btn btn-danger btn-small" onclick="deletePlayer('${s.id}')">Slett</button>
                </td>
            </tr>
        `).join('');
    }

    renderPlayers();

    // --- LIVE SYNKRONISERING AV SPILLERLISTE FRA FIREBASE ---
    if (window.dbOnValue && window.dbRef && window.db) {
        const playersRef = window.dbRef(window.db, 'players/');
        window.dbOnValue(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("Spillerliste oppdatert fra skyen...");
                // Oppdaterer den lokale variabelen og localStorage
                spillerliste = data;
                localStorage.setItem('full-spillerliste', JSON.stringify(data));
                // Tegner tabellen på nytt
                renderPlayers();
            }
        });
    }

})();
