(function() {
    const statsBody = document.getElementById('statsBody');
    const periodSelect = document.getElementById('statPeriodSelect');

    function renderStats() {
        const players = DB.getActivePlayers();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const showTotal = periodSelect.value === 'total';

        let playerStats = [];

        // 1. Beregn statistikk for alle spillere
        players.forEach(player => {
            let tCount = 0; // Treninger
            let kCount = 0; // Kamper
            let possible = 0;
            let attended = 0;

            for (let m = 0; m <= 11; m++) {
                if (!showTotal && m !== currentMonth) continue;

                for (let d = 1; d <= 31; d++) {
                    const status = DB.getAttendance(currentYear, m, player.id, d);
                    const type = localStorage.getItem(`type-${currentYear}-${m}-${d}`);

                    if (status === 'present') {
                        attended++;
                        if (type === 'K') kCount++;
                        else tCount++;
                    }

                    if (type === 'T' || type === 'K') {
                        possible++;
                    }
                }
            }

            const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
            
            playerStats.push({
                navn: player.navn,
                tCount: tCount,
                kCount: kCount,
                percent: percent
            });
        });

        // 2. SORTERING: Høyest prosent øverst
        playerStats.sort((a, b) => b.percent - a.percent);

        // 3. GENERER HTML
        let html = '';
        playerStats.forEach(p => {
            const statClass = p.percent >= 80 ? 'stat-good' : (p.percent >= 50 ? 'stat-mid' : 'stat-low');

            html += `
                <tr>
                    <td class="name-col">${p.navn}</td>
                    <td>${p.tCount}</td>
                    <td>${p.kCount}</td>
                    <td class="stat-col ${statClass}"><strong>${p.percent}%</strong></td>
                </tr>
            `;
        });

        statsBody.innerHTML = html || '<tr><td colspan="4">Ingen data funnet.</td></tr>';
    }

    // Event listeners
    if (periodSelect) {
        periodSelect.addEventListener('change', renderStats);
    }

    // Kjør ved oppstart
    setTimeout(renderStats, 500);

    // Live-oppdatering fra Firebase
    if (window.dbOnValue && window.dbRef && window.db) {
        window.dbOnValue(window.dbRef(window.db, 'attendance/'), renderStats);
    }
})();
