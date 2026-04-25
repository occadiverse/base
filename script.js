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
        const states = ['?', '✅', '❌', '🤕'];
        const nextStatus = states[(states.indexOf(currentStatus) + 1) % states.length];

        DB.setAttendance(currentYear, monthIdx, playerId, dayNr, nextStatus);
        renderAttendanceTable();
    }

    function getTrainingDays(monthIdx) {
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
        const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
        const days = [];

        for (let dayNr = 1; dayNr <= daysInMonth; dayNr++) {
            const date = new Date(currentYear, monthIdx, dayNr);
            const dayOfWeek = date.getDay();
            const type = localStorage.getItem(getDayTypeKey(monthIdx, dayNr));

            if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 6 || (type && type !== 'X')) {
                days.push({ nr: dayNr, navn: dayNames[dayOfWeek] });
            }
        }

        return days;
    }

    function renderAttendanceTable() {
        const monthIdx = getMonthIndex();
        const players = DB.getActivePlayers();
        const days = getTrainingDays(monthIdx);

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

        let bodyHtml = '';
        players.forEach((player) => {
            bodyHtml += `<tr><td class="name-col name-cell">${player.navn}</td>`;
            let attended = 0;
            let totalPossible = 0;

            days.forEach((dayInfo) => {
                const type = localStorage.getItem(getDayTypeKey(monthIdx, dayInfo.nr));
                const status = DB.getAttendance(currentYear, monthIdx, player.id, dayInfo.nr);

                if (type === 'T' || type === 'K') {
                    totalPossible++;
                    if (status === '✅') {
                        attended++;
                    }
                }

                bodyHtml += `<td class="status-cell" data-playerid="${player.id}" data-daynr="${dayInfo.nr}">${status}</td>`;
            });

            const percent = totalPossible > 0 ? Math.round((attended / totalPossible) * 100) : 0;
            const statClass = percent >= 80 ? 'stat-good' : (percent >= 50 ? 'stat-mid' : 'stat-low');
            bodyHtml += `<td class="stat-col ${statClass}">${percent}%</td></tr>`;
        });

        tableBody.innerHTML = bodyHtml || "<tr><td colspan='100%'>Ingen aktive spillere.</td></tr>";

        document.querySelectorAll('.date-header').forEach((header) => {
            header.addEventListener('click', () => {
                toggleDayType(parseInt(header.dataset.daynr, 10));
            });
        });

        document.querySelectorAll('.status-cell').forEach((cell) => {
            cell.addEventListener('click', () => {
                cycleStatus(cell.dataset.playerid, parseInt(cell.dataset.daynr, 10));
            });
        });
    }

    function addName() {
        const input = document.getElementById('nameInput');
        const name = input.value.trim();

        if (!name) {
            return;
        }

        const players = DB.getPlayers();
        const duplicate = players.some((player) => player.navn.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            alert('Denne spilleren finnes allerede.');
            return;
        }

        players.push({
            id: DB.generateId(),
            navn: name,
            fodselsdato: '',
            status: 'Aktiv',
            mobil: '',
            draktnummer: ''
        });

        DB.savePlayers(players);
        input.value = '';
        renderAttendanceTable();
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

    window.addName = addName;
    window.addDate = addDate;
    window.clearData = clearData;

    monthSelect.addEventListener('change', initMonth);
    populateMonthSelect();
    initMonth();
})();
