(function () {
    // Kjør kun på forsiden
    const activePlayersEl = document.getElementById('statActivePlayers');
    const monthlyAttendanceEl = document.getElementById('statMonthlyAttendance');
    const sessionsEl = document.getElementById('statSessions');
    const topPlayerEl = document.getElementById('statTopPlayer');

    if (!activePlayersEl || !monthlyAttendanceEl || !sessionsEl || !topPlayerEl) {
        return;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    function getDayType(year, month, day) {
        const key = `type-${year}-${month}-${day}`;
        return localStorage.getItem(key); // "T", "K" eller null
    }

    function isSessionType(type) {
        return type === 'T' || type === 'K';
    }

    function getMonthSessionDays(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const type = getDayType(year, month, day);
            if (isSessionType(type)) {
                days.push(day);
            }
        }

        return days;
    }

    function calculateMonthlyAttendancePercent(players, year, month) {
        const sessionDays = getMonthSessionDays(year, month);
        if (players.length === 0 || sessionDays.length === 0) return 0;

        let attended = 0;
        let possible = 0;

        players.forEach((player) => {
            sessionDays.forEach((day) => {
                possible++;
                const status = DB.getAttendance(year, month, player.id, day);
                if (status === '✅') attended++;
            });
        });

        return possible > 0 ? Math.round((attended / possible) * 100) : 0;
    }

    function countYearSessions(year) {
        let total = 0;

        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const type = getDayType(year, month, day);
                if (isSessionType(type)) total++;
            }
        }

        return total;
    }

    function calculatePlayerYearStats(player, year) {
        let attended = 0;
        let possible = 0;

        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const type = getDayType(year, month, day);
                if (!isSessionType(type)) continue;

                possible++;
                const status = DB.getAttendance(year, month, player.id, day);
                if (status === 'present') attended++;
            }
        }

        const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
        return { attended, possible, percent };
    }

    function getTopPlayer(players, year) {
        if (players.length === 0) return null;

        const ranked = players.map((player) => {
            const stats = calculatePlayerYearStats(player, year);
            return {
                name: player.navn,
                attended: stats.attended,
                possible: stats.possible,
                percent: stats.percent
            };
        });

        ranked.sort((a, b) => b.percent - a.percent || b.attended - a.attended);
        return ranked[0] || null;
    }

    function renderDashboard() {
        const activePlayers = DB.getActivePlayers();

        // 1) Aktive spillere
        activePlayersEl.textContent = activePlayers.length;

        // 2) Oppmøte denne måneden
        const monthlyPercent = calculateMonthlyAttendancePercent(activePlayers, currentYear, currentMonth);
        monthlyAttendanceEl.textContent = `${monthlyPercent}%`;

        // 3) Registrerte økter (i år)
        const totalSessions = countYearSessions(currentYear);
        sessionsEl.textContent = totalSessions;

        // 4) Toppspiller
        const top = getTopPlayer(activePlayers, currentYear);
        if (!top || top.possible === 0) {
            topPlayerEl.textContent = 'Ingen data';
        } else {
            topPlayerEl.textContent = `${top.name} (${top.percent}%)`;
        }
    }

    // Oppdater når siden lastes
    renderDashboard();
})();
