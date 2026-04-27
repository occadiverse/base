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
            opponent: document.getElementById('opponent').value,
            type: document.getElementById('matchType').value,
            result: document.getElementById('result').value || '-'
        };

        const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
        window.dbSet(matchRef, newMatch).then(() => {
            closeMatchModal();
            matchForm.reset();
        });
    });

    // Lese kamper
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        matchTableBody.innerHTML = '';
        if (data) {
            const sortedMatches = Object.entries(data).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
            sortedMatches.forEach(([id, match]) => {
                const row = `
                    <tr>
                        <td>${match.date}</td>
                        <td class="text-left"><strong>${match.opponent}</strong></td>
                        <td>${match.type}</td>
                        <td>${match.result}</td>
                        <td>
                            <button onclick="deleteMatch('${id}')" class="btn-cancel">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                matchTableBody.innerHTML += row;
            });
        }
    });

    window.deleteMatch = (id) => {
        if(confirm('Slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
