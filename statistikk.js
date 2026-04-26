(function () {
    const tableBody = document.getElementById('statsTableBody');
    const yearLabel = document.getElementById('currentYear');
    const currentYear = new Date().getFullYear();

    if (!tableBody) return;
    if (yearLabel) yearLabel.textContent = currentYear;

    function isSession(type) {
        return type === 'T' || type === 'K';
    }

    function calculateFullYearStats(player, year) {
        let attended = 0;
        let possible = 0;

        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                // Henter dags-type (T, K eller X) fra localStorage
                const typeKey = `type-${year}-${month}-${day}`;
                const type = localStorage.getItem(typeKey);

                if (isSession(type)) {
                    possible++;
                    const status = DB.getAttendance(year, month, player.id, day);
                    if (status === '✅') {
                        attended++;
                    }
                }
            }
        }

        const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
        return { attended, possible, percent };
    }

    function renderStats() {
        const players = DB.getActivePlayers();
        
        // Beregn stats for alle
        const rankedPlayers = players.map(player => {
            const stats = calculateFullYearStats(player, currentYear);
            return {
                name: player.navn,
                ...stats
            };
        });

        // Sorter: Høyest prosent først. Ved lik prosent, flest oppmøter.
        rankedPlayers.sort((a, b) => b.percent - a.percent || b.attended - a.attended);

        tableBody.innerHTML = rankedPlayers.map((p, index) => {
            // Legg til medalje-ikon for topp 3
            let rankDisplay = index + 1;
            if (index === 0) rankDisplay = '🥇';
            if (index === 1) rankDisplay = '🥈';
            if (index === 2) rankDisplay = '🥉';

            const statClass = p.percent >= 80 ? 'stat-good' : (p.percent >= 50 ? 'stat-mid' : 'stat-low');

            return `
                <tr>
                    <td><strong>${rankDisplay}</strong></td>
                    <td class="text-left">${p.name}</td>
                    <td>${p.possible}</td>
                    <td>${p.attended}</td>
                    <td class="${statClass}"><strong>${p.percent}%</strong></td>
                </tr>
            `;
        }).join('');

        if (rankedPlayers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">Ingen aktive spillere funnet.</td></tr>';
        }
    }

    renderStats();
})();
