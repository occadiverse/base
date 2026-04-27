(function() {
    const statsBody = document.getElementById('statsBody');
    const periodSelect = document.getElementById('statPeriodSelect');

    function renderStats() {
        const players = DB.getActivePlayers();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const showTotal = periodSelect.value === 'total';

        let html = '';

        players.forEach(player => {
            let tCount = 0; // Treninger
            let kCount = 0; // Kamper
            let sCount = 0; // Skader
            let possible = 0;
            let attended = 0;

            // Her går vi gjennom dataene i localStorage (som synkes fra Firebase)
            // Vi looper gjennom dagene 1-31
            for (let m = 0; m <= 11; m++) {
                // Hvis vi bare skal vise denne måneden, hopp over andre måneder
                if (!showTotal && m !== currentMonth) continue;

                for (let d = 1; d <= 31; d++) {
                    const status = DB.getAttendance(currentYear, m, player.id, d);
                    const type = localStorage.getItem(`type-${currentYear}-${m}-${d}`);

                    if (status === 'present') {
                        attended++;
                        if (type === 'K') kCount++;
                        else tCount++;
                    } else if (status === 'injured') {
                        sCount++;
                    }

                    if (type === 'T' || type === 'K') {
                        possible++;
                    }
                }
            }

            const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
            const statClass = percent >= 80 ? 'stat-good' : (percent >= 50 ? 'stat-mid' : 'stat-low');

            html += `
                <tr>
                    <td class="name-col">${player.navn}</td>
                    <td>${tCount}</td>
                    <td>${kCount}</td>
                    <td>${sCount}</td>
                    <td class="stat-col ${statClass}"><strong>${percent}%</strong></td>
                </tr>
            `;
        });

        statsBody.innerHTML = html || '<tr><td colspan="5">Ingen data funnet.</td></tr>';
    }

    // Lytt på endringer i dropdown
    periodSelect.addEventListener('change', renderStats);

    // Initial kjøring - vent litt på Firebase hvis nødvendig
    setTimeout(renderStats, 500);

    // Live-oppdatering hvis noen endrer noe mens du ser på
    if (window.dbOnValue && window.dbRef && window.db) {
        window.dbOnValue(window.dbRef(window.db, 'attendance/'), renderStats);
    }

})();
