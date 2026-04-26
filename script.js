// script.js - Oppmøtelogikk (samlet ett sted)
(function () {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    const currentYear = new Date().getFullYear();

    const monthSelect = document.getElementById('monthSelect');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // Ikke kjør logikken på sider som ikke er oppmøte-siden
    if (!monthSelect || !tableHead || !tableBody) {
        return;
    }

    const yearLabel = document.getElementById('currentYearLabel');
    if (yearLabel) {
        yearLabel.textContent = String(currentYear);
    }

    function getMonthIndex() {
        return parseInt(monthSelect.value, 10);
    }

    function getDayTypeKey(monthIdx, dayNr) {
        return `type-${currentYear}-${monthIdx}-${dayNr}`;
    }

    function populateMonthSelect() {
        monthSelect.innerHTML = '';

        months.forEach((monthName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${monthName} ${currentYear}`;
            if (index === new Date().getMonth()) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        });
    }

    function initMonth() {
        const monthIdx = getMonthIndex();
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const key = getDayTypeKey(monthIdx, day);

            if (!localStorage.getItem(key)) {
                const dayOfWeek = new Date(currentYear, monthIdx, day).getDay();
                const defaultType = (dayOfWeek === 1 || dayOfWeek === 6) ? 'T' : (dayOfWeek === 3 ? 'K' : 'X');
                localStorage.setItem(key, defaultType);
            }
        }

        renderAttendanceTable();
    }

    function toggleDayType(dayNr) {
        const monthIdx = getMonthIndex();
        const key = getDayTypeKey(monthIdx, dayNr);
        const currentType = localStorage.getItem(key) || 'X';
        const nextType = currentType === 'X' ? 'T' : (currentType === 'T' ? 'K' : 'X');

        localStorage.setItem(key, nextType);
        renderAttendanceTable();
    }

    function cycleStatus(playerId, dayNr) {
        const monthIdx = getMonthIndex();
        const currentStatus = DB.getAttendance(currentYear, monthIdx, playerId, dayNr);
    
        // Vi bytter ut emojier med enkle bokstavkoder
        const states = ['?', 'present', 'absent', 'injured']; 
        const nextStatus = states[(states.indexOf(currentStatus) + 1) % states.length];

        DB.setAttendance(currentYear, monthIdx, playerId, dayNr, nextStatus);
        renderAttendanceTable();
    }

function renderAttendanceTable() {
    const monthIdx = getMonthIndex();
    const players = DB.getActivePlayers();
    const days = getTrainingDays(monthIdx);

    // 1. GENERER TABELLHODE (Datoer og Typer)
    let headHtml = '<tr><th class="name-col">Spiller</th>';
    days.forEach((dayInfo) => {
        const type = localStorage.getItem(getDayTypeKey(monthIdx, dayInfo.nr)) || 'X';
        const label = type === 'T' ? 'T' : (type === 'K' ? 'K' : '-');
        const badgeClass = type === 'T' ? 'day-type day-type-training' : (type === 'K' ? 'day-type day-type-match' : 'day-type day-type-none');

        headHtml += `
            <th class="date-header" data-daynr="${dayInfo.nr}">
                <span class="date-weekday">${dayInfo.navn}</span><br>${dayInfo.nr}.<br>
                <span class="${badgeClass}">${label}</span>
            </th>`;
    });
    headHtml += '<th class="stat-col">%</th></tr>';
    tableHead.innerHTML = headHtml;

    // 2. GENERER TABELLKROPP (Spillere og Ikoner)
    let bodyHtml = '';
    players.forEach((player) => {
        bodyHtml += `<tr><td class="name-col name-cell">${player.navn}</td>`;
        let attended = 0;
        let totalPossible = 0;

        days.forEach((dayInfo) => {
            const type = localStorage.getItem(getDayTypeKey(monthIdx, dayInfo.nr));
            const status = DB.getAttendance(currentYear, monthIdx, player.id, dayInfo.nr);

            // Tell kun med økter som er merket T (Trening) eller K (Kamp)
            if (type === 'T' || type === 'K') {
                totalPossible++;
                if (status === 'present') {
                    attended++;
                }
            }

            // Velg riktig ikon basert på status
            let iconHtml = '';
            if (status === 'present') {
                iconHtml = '<i class="fa-solid fa-circle-check status-present"></i>';
            } else if (status === 'absent') {
                iconHtml = '<i class="fa-solid fa-circle-xmark status-absent"></i>';
            } else if (status === 'injured') {
                iconHtml = '<i class="fa-solid fa-crutch status-injured"></i>';
            } else {
                iconHtml = '<i class="fa-solid fa-minus status-none"></i>';
            }

            bodyHtml += `<td class="status-cell" data-playerid="${player.id}" data-daynr="${dayInfo.nr}">${iconHtml}</td>`;
        });

        // Beregn prosent for raden
        const percent = totalPossible > 0 ? Math.round((attended / totalPossible) * 100) : 0;
        const statClass = percent >= 80 ? 'stat-good' : (percent >= 50 ? 'stat-mid' : 'stat-low');
        bodyHtml += `<td class="stat-col ${statClass}"><strong>${percent}%</strong></td></tr>`;
    });

    tableBody.innerHTML = bodyHtml || "<tr><td colspan='100%'>Ingen aktive spillere funnet.</td></tr>";

    // 3. LEGG TIL EVENT LISTENERS (Klikk-funksjonalitet)
    
    // Klikk på dato-overskrift (Endre type: T, K, -)
    document.querySelectorAll('.date-header').forEach((header) => {
        header.addEventListener('click', () => {
            toggleDayType(parseInt(header.dataset.daynr, 10));
        });
    });

    // Klikk på status-celle (Endre status: Present, Absent, Injured, ?)
    document.querySelectorAll('.status-cell').forEach((cell) => {
        cell.addEventListener('click', () => {
            cycleStatus(cell.dataset.playerid, parseInt(cell.dataset.daynr, 10));
        });
    });
}

    function addDate() {
        const input = document.getElementById('dateInput');
        const selectedDate = input.value;
        if (!selectedDate) {
            return;
        }

        const [year, month, day] = selectedDate.split('-').map((v) => parseInt(v, 10));
        const localDate = new Date(year, month - 1, day);

        if (localDate.getFullYear() !== currentYear) {
            alert(`Datoen må være i ${currentYear}.`);
            return;
        }

        const monthIdx = localDate.getMonth();
        const dayNr = localDate.getDate();

        monthSelect.value = String(monthIdx);
        localStorage.setItem(getDayTypeKey(monthIdx, dayNr), 'T');

        renderAttendanceTable();
        input.value = '';
    }

    function clearData() {
        const confirmed = confirm('Er du sikker på at du vil nullstille oppmøtestatus og økttyper for hele året?');
        if (!confirmed) {
            return;
        }

        for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
            const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                localStorage.removeItem(getDayTypeKey(monthIdx, day));
            }
        }

        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`att-base-${currentYear}-`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((key) => localStorage.removeItem(key));

        initMonth();
    }

    window.addDate = addDate;
    window.clearData = clearData;

    monthSelect.addEventListener('change', initMonth);
    populateMonthSelect();
    initMonth();
})();
