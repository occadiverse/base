document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // Åpne/Lukke modal
    window.openMatchModal = () => document.getElementById('matchModal').style.display = 'flex';
    window.closeMatchModal = () => document.getElementById('matchModal').style.display = 'none';

    // Lagre kamp
    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newMatch = {
            date: document.getElementById('matchDate').value,
            time: document.getElementById('matchTime').value || '--:--', // Nytt felt
            opponent: document.getElementById('opponent').value,
            pitch: document.getElementById('pitch').value || 'Ikke satt', // Nytt felt
            type: document.getElementById('matchType').value,
            result: document.getElementById('result').value || '-'
        };

        const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
        window.dbSet(matchRef, newMatch).then(() => {
            closeMatchModal();
            matchForm.reset();
        }).catch(error => {
            console.error("Feil ved lagring av kamp:", error);
            alert("Kunne ikke lagre kampen.");
        });
    });

    // Lese kamper
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        matchTableBody.innerHTML = '';
        
        if (data) {
            // Sorterer kamper etter dato
            const sortedMatches = Object.entries(data).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
            
            sortedMatches.forEach(([id, match]) => {
                // Formaterer datoen litt penere (valgfritt)
                const row = `
                    <tr>
                        <td>
                            <div style="font-weight: 600;">${match.date}</div>
                            <div style="font-size: 0.85em; color: #666;">kl. ${match.time}</div>
                        </td>
                        <td class="text-left"><strong>${match.opponent}</strong></td>
                        <td>${match.pitch}</td>
                        <td>${match.type}</td>
                        <td><strong>${match.result}</strong></td>
                        <td>
                            <button onclick="deleteMatch('${id}')" class="btn-cancel" title="Slett kamp">
                                <i class="fa-solid fa-trash"></i>
                            </button>
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
