document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // Åpne/Lukke modal
    window.openMatchModal = () => {
        document.getElementById('modalTitle').innerText = 'Registrer kamp';
        document.getElementById('matchModal').style.display = 'flex';
    };

    window.closeMatchModal = () => {
        document.getElementById('matchModal').style.display = 'none';
        matchForm.reset();
        document.getElementById('editMatchId').value = ''; // Tømmer ID-feltet
    };

    // Funksjon for å fylle modalen med eksisterende data for redigering
    window.openEditMatch = (id, date, time, opponent, pitch, type, result) => {
        document.getElementById('modalTitle').innerText = 'Rediger kamp';
        document.getElementById('editMatchId').value = id;
        document.getElementById('matchDate').value = date;
        document.getElementById('matchTime').value = time === '--:--' ? '' : time;
        document.getElementById('opponent').value = opponent;
        document.getElementById('pitch').value = pitch === 'Ikke satt' ? '' : pitch;
        document.getElementById('matchType').value = type;
        document.getElementById('result').value = result === '-' ? '' : result;
        
        document.getElementById('matchModal').style.display = 'flex';
    };

    // Lagre eller Oppdatere kamp
    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const matchId = document.getElementById('editMatchId').value;
        const matchData = {
            date: document.getElementById('matchDate').value,
            time: document.getElementById('matchTime').value || '--:--',
            opponent: document.getElementById('opponent').value,
            pitch: document.getElementById('pitch').value || 'Ikke satt',
            type: document.getElementById('matchType').value,
            result: document.getElementById('result').value || '-'
        };

        if (matchId) {
            // OPPDATER eksisterende kamp
            window.dbSet(window.dbRef(window.db, `matches/${matchId}`), matchData)
                .then(() => {
                    closeMatchModal();
                })
                .catch(error => console.error("Feil ved oppdatering:", error));
        } else {
            // LAGRE NY kamp
            const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
            window.dbSet(matchRef, matchData)
                .then(() => {
                    closeMatchModal();
                })
                .catch(error => console.error("Feil ved lagring:", error));
        }
    });

    // Lese kamper fra Firebase
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        matchTableBody.innerHTML = '';
        
        if (data) {
            // Sorterer etter dato
            const sortedMatches = Object.entries(data).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
            
            sortedMatches.forEach(([id, match]) => {
                const d = new Date(match.date);
                const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });

                const row = `
                    <tr>
                        <td>
                            <div style="font-weight: 600; text-transform: capitalize;">${shortDate}</div>
                            <div style="font-size: 0.85em; color: #666;">kl. ${match.time}</div>
                        </td>
                        <td class="text-left">
                            <span style="font-weight: 700;">${match.opponent}</span>
                        </td>
                        <td>
                            <div style="
                                display: inline-block;
                                min-width: 65px; 
                                text-align: center; 
                                background: #f0f2f5; 
                                padding: 4px 8px; 
                                border-radius: 6px; 
                                font-weight: 800; 
                                color: var(--primary-color);
                                font-family: 'Courier New', Courier, monospace;
                                font-size: 1.1em;
                            ">
                                ${match.result}
                            </div>
                        </td>
                        <td style="font-size: 0.9em;">${match.pitch}</td>
                        <td><span style="font-size: 0.8em; opacity: 0.8;">${match.type}</span></td>
                        <td>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button onclick="openEditMatch('${id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" 
                                        style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="deleteMatch('${id}')" 
                                        style="background:none; border:none; color:#e74c3c; cursor:pointer;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                matchTableBody.innerHTML += row;
            });
        } else {
            matchTableBody.innerHTML = '<tr><td colspan="6">Ingen kamper registrert</td></tr>';
        }
    });

    window.deleteMatch = (id) => {
        if(confirm('Er du sikker på at du vil slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
