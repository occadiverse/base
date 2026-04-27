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
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 700;">${match.opponent}</span>
                                <span style="background: #f0f2f5; padding: 2px 8px; border-radius: 4px; font-weight: 800; color: var(--primary-color);">
                                    ${match.result}
                                </span>
                            </div>
                        </td>
                        <td style="font-size: 0.9em;">${match.pitch}</td>
                        <td><span style="font-size: 0.8em; opacity: 0.8;">${match.type}</span></td>
                        <td>
                            <button onclick="deleteMatch('${id}')" class="btn-cancel">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                matchTableBody.innerHTML += row;
            });
        } else {
            matchTableBody.innerHTML = '<tr><td colspan="5">Ingen kamper registrert</td></tr>';
        }
    });

    window.deleteMatch = (id) => {
        if(confirm('Er du sikker på at du vil slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
