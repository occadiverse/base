(function () {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    const currentYear = new Date().getFullYear();

    const monthSelect = document.getElementById('monthSelect');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // Sikkerhet: Avbryt hvis vi ikke er på oppmøte-siden
    if (!monthSelect || !tableHead || !tableBody) return;

    function getMonthIndex() {
        return parseInt(monthSelect.value, 10);
    }

    function getDayTypeKey(monthIdx, dayNr) {
        return `type-${currentYear}-${monthIdx}-${dayNr}`;
    }

    function populateMonthSelect() {
        monthSelect.innerHTML = '';
        const now = new Date();
        months.forEach((monthName, index) => {
            const option = document.createElement('option');
            option.value = index;
            // Vi fjerner "2026" fra teksten her hvis du vil ha den helt ren, 
            // men beholder den hvis du liker det.
            option.textContent = `${monthName}`; 
            if (index === now.getMonth()) option.selected = true;
            monthSelect.appendChild(option);
        });
    }

    // --- VISNING AV DATOVELGER (Oppdatert for ny stil) ---
    window.showDatePicker = function() {
        const btn = document.getElementById('toggleDateBtn');
        const container = document.getElementById('datePickerContainer');
        if (btn && container) {
            btn.classList.add('hidden');
            container.classList.remove('hidden');
            container.style.display = 'flex'; // Sikrer flex-layout
        }
    };

    window.hideDatePicker = function() {
        const btn = document.getElementById('toggleDateBtn');
        const container = document.getElementById('datePickerContainer');
        const input = document.getElementById('dateInput');
        if (btn && container) {
            container.classList.add('hidden');
            container.style.display = 'none';
            btn.classList.remove('hidden');
            if (input) input.value = ''; 
        }
    };

    window.toggleDayType = function(dayNr) {
        const monthIdx = getMonthIndex();
        const key = getDayTypeKey(monthIdx, dayNr);
        const currentType = localStorage.getItem(key) || 'X';
        const nextType = currentType === 'X' ? 'T' : (currentType === 'T' ? 'K' : 'X');

        localStorage.setItem(key, nextType);
        renderAttendanceTable();
    };

    window.cycleStatus = function(playerId, dayNr) {
        const monthIdx = getMonthIndex();
        // Sørg for at DB-objektet ditt er lastet inn i HTML før dette scriptet
        const currentStatus = DB.getAttendance(currentYear, monthIdx, playerId, dayNr);
        
        const states = ['?', 'present', 'absent', 'injured'];
        let currentIndex = states.indexOf(currentStatus);
        if (currentIndex === -1) currentIndex = 0;
        
        const nextStatus = states[(currentIndex + 1) % states.length];
        DB.setAttendance(currentYear, monthIdx, playerId, dayNr, nextStatus);
        renderAttendanceTable();
    };

    function getTrainingDays(monthIdx) {
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
        const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
        const days = [];

        for (let dayNr = 1; dayNr <= daysInMonth; dayNr++) {
            const date = new Date(currentYear, monthIdx, dayNr);
            const dayOfWeek = date.getDay();
            const type = localStorage.getItem(getDayTypeKey(monthIdx, dayNr));

            // Viser dager som er manuelt satt til Trening/Kamp, 
            // eller faste dager (Man, Ons, Lør)
            if (type === 'T' || type === 'K' || dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 6) {
                days.push({ nr: dayNr, navn: dayNames[dayOfWeek], type: type || 'X' });
            }
        }
        return days;
    }

    window.renderAttendanceTable = function() {
        const monthIdx = getMonthIndex();
        const players = DB.getActivePlayers();
        const days = getTrainingDays(monthIdx);

        // 1. GENERER TABELLHODE
        let headHtml = '<tr><th class="name-col">Spiller</th>';
        days.forEach(d => {
            const type = localStorage.getItem(getDayTypeKey(monthIdx, d.nr)) || 'X';
            const badgeClass = type === 'T' ? 'day-type day-type-training' : (type === 'K' ? 'day-type day-type-match' : 'day-type');
            const label = type === 'X' ? '-' : type;
            
            headHtml += `
                <th class="date-header" onclick="toggleDayType(${d.nr})" style="cursor:pointer">
                    <span class="date-weekday">${d.navn}</span><br>${d.nr}.<br>
                    <span class="${badgeClass}">${label}</span>
                </th>`;
        });
        headHtml += '<th class="stat-col">%</th></tr>';
        tableHead.innerHTML = headHtml;

        // 2. GENERER TABELLRADER
        let bodyHtml = '';
        players.forEach(player => {
            bodyHtml += `<tr><td class="name-col">${player.navn}</td>`;
            let attended = 0;
            let possible = 0;

            days.forEach(d => {
                const type = localStorage.getItem(getDayTypeKey(monthIdx, d.nr));
                const status = DB.getAttendance(currentYear, monthIdx, player.id, d.nr);

                if (type === 'T' || type === 'K') {
                    possible++;
                    if (status === 'present') attended++;
                }

                let iconHtml = '<i class="fa-solid fa-minus status-none"></i>';
                if (status === 'present') {
                    iconHtml = '<i class="fa-solid fa-circle-check status-present"></i>';
                } else if (status === 'absent') {
                    iconHtml = '<i class="fa-solid fa-circle-xmark status-absent"></i>';
                } else if (status === 'injured') {
                    // Vi bruker din original-ikon her: fa-crutch
                    iconHtml = '<i class="fa-solid fa-crutch status-injured"></i>';
                }

                bodyHtml += `<td class="status-cell" onclick="cycleStatus('${player.id}', ${d.nr})">${iconHtml}</td>`;
            });

            const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
            const statClass = percent >= 80 ? 'stat-good' : (percent >= 50 ? 'stat-mid' : 'stat-low');
            bodyHtml += `<td class="stat-col ${statClass}"><strong>${percent}%</strong></td></tr>`;
        });

        tableBody.innerHTML = bodyHtml || '<tr><td colspan="100%">Ingen aktive spillere funnet.</td></tr>';
    };

    window.addDate = function() {
        const input = document.getElementById('dateInput');
        if (!input || !input.value) return;
        
        const date = new Date(input.value);
        const m = date.getMonth();
        const d = date.getDate();
        
        localStorage.setItem(getDayTypeKey(m, d), 'T');
        monthSelect.value = m;
        
        renderAttendanceTable();
        hideDatePicker(); 
    };

    monthSelect.addEventListener('change', renderAttendanceTable);
    
    populateMonthSelect();
    renderAttendanceTable();

})();
