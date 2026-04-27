(function () {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    const currentYear = new Date().getFullYear();

    const monthSelect = document.getElementById('monthSelect');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    if (!monthSelect || !tableHead || !tableBody) return;

    // --- 1. HJELPEFUNKSJONER ---
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
            option.textContent = `${monthName} ${currentYear}`;
            if (index === now.getMonth()) option.selected = true;
            monthSelect.appendChild(option);
        });
    }

    // --- 2. UI KONTROLLERE ---
    window.showDatePicker = function() {
        const btn = document.getElementById('toggleDateBtn');
        const container = document.getElementById('datePickerContainer');
        if (btn && container) {
            btn.classList.add('hidden');
            container.classList.remove('hidden');
            container.style.display = 'flex';
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
        
        if (window.dbSet && window.db) {
            const path = `dayTypes/${currentYear}/${monthIdx}/${dayNr}`;
            window.dbSet(window.dbRef(window.db, path), nextType);
        }
        window.renderAttendanceTable();
    };

    // --- OPPDATERT cycleStatus: LAGRER NÅ OGSÅ TIL KAMP-MAPPE ---
    window.cycleStatus = function(playerId, dayNr) {
    const monthIdx = getMonthIndex();
    const currentStatus = DB.getAttendance(currentYear, monthIdx, playerId, dayNr);
    const states = ['?', 'present', 'absent', 'injured'];
    let currentIndex = states.indexOf(currentStatus);
    const nextStatus = states[(currentIndex + 1) % states.length];
    
    // 1. Oppdater lokal lagring (for at tabellen skal oppdatere seg i nettleseren)
    DB.setAttendance(currentYear, monthIdx, playerId, dayNr, nextStatus);

    // 2. Oppdater Firebase
    if (window.dbSet && window.db) {
        // A: Gammelt format (for statistikk-visning i tabellen)
        const oldPath = `attendance/${currentYear}/${monthIdx}/${playerId}/${dayNr}`;
        window.dbSet(window.dbRef(window.db, oldPath), nextStatus);

        // B: Nytt flatt format (for kampsiden/modalen)
        // Vi lager dato-strengen manuelt: f.eks. "29.04.2026"
        const d = dayNr.toString().padStart(2, '0');
        const m = (monthIdx + 1).toString().padStart(2, '0');
        const dateKey = `${d}.${m}.${currentYear}`;
        
        // Vi lagrer status "K" hvis spilleren er grønn (present)
        const matchStatus = nextStatus === 'present' ? 'K' : null;
        const matchPath = `attendance/${dateKey}/${playerId}`;
        
        window.dbSet(window.dbRef(window.db, matchPath), matchStatus)
            .then(() => console.log("Lagret til kampformat:", dateKey))
            .catch(err => console.error("Firebase-feil:", err));
    }

    window.renderAttendanceTable();
};
    function getTrainingDays(monthIdx) {
        const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
        const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
        const days = [];

        for (let dayNr = 1; dayNr <= daysInMonth; dayNr++) {
            const date = new Date(currentYear, monthIdx, dayNr);
            const dayOfWeek = date.getDay();
            const type = localStorage.getItem(getDayTypeKey(monthIdx, dayNr));

            if (type === 'T' || type === 'K' || dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 6) {
                days.push({ nr: dayNr, navn: dayNames[dayOfWeek], type: type || 'X' });
            }
        }
        return days;
    }

    // --- 3. RENDERING AV TABELL ---
    window.renderAttendanceTable = function() {
        const monthIdx = getMonthIndex();
        const players = DB.getActivePlayers();
        const days = getTrainingDays(monthIdx);

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
                if (status === 'present') iconHtml = '<i class="fa-solid fa-circle-check status-present"></i>';
                else if (status === 'absent') iconHtml = '<i class="fa-solid fa-circle-xmark status-absent"></i>';
                else if (status === 'injured') iconHtml = '<i class="fa-solid fa-crutch status-injured"></i>';

                bodyHtml += `<td class="status-cell" onclick="cycleStatus('${player.id}', ${d.nr})">${iconHtml}</td>`;
            });

            const percent = possible > 0 ? Math.round((attended / possible) * 100) : 0;
            const statClass = percent >= 80 ? 'stat-good' : (percent >= 50 ? 'stat-mid' : 'stat-low');
            bodyHtml += `<td class="stat-col ${statClass}"><strong>${percent}%</strong></td></tr>`;
        });

        tableBody.innerHTML = bodyHtml || '<tr><td colspan="100%">Laster spillere fra skyen...</td></tr>';
    };

    window.addDate = function() {
        const input = document.getElementById('dateInput');
        if (!input || !input.value) return;
        const date = new Date(input.value);
        const m = date.getMonth();
        const d = date.getDate();
        localStorage.setItem(getDayTypeKey(m, d), 'T');
        if (window.dbSet && window.db) {
            window.dbSet(window.dbRef(window.db, `dayTypes/${currentYear}/${m}/${d}`), 'T');
        }
        monthSelect.value = m;
        window.renderAttendanceTable();
        hideDatePicker(); 
    };

    // --- 4. MASTER SYNKRONISERING ---
    function setupCloudListeners() {
        if (!window.dbOnValue || !window.dbRef || !window.db) {
            setTimeout(setupCloudListeners, 500);
            return;
        }

        window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.players) {
                localStorage.setItem('full-spillerliste', JSON.stringify(data.players));
            }

            if (data.attendance && data.attendance[currentYear]) {
                const yearData = data.attendance[currentYear];
                Object.keys(yearData).forEach(m => {
                    Object.keys(yearData[m]).forEach(pId => {
                        Object.keys(yearData[m][pId]).forEach(d => {
                            localStorage.setItem(`att-base-${currentYear}-${m}-${pId}-${d}`, yearData[m][pId][d]);
                        });
                    });
                });
            }

            if (data.dayTypes && data.dayTypes[currentYear]) {
                const yearTypes = data.dayTypes[currentYear];
                Object.keys(yearTypes).forEach(m => {
                    Object.keys(yearTypes[m]).forEach(d => {
                        localStorage.setItem(`type-${currentYear}-${m}-${d}`, yearTypes[m][d]);
                    });
                });
            }
            window.renderAttendanceTable();
        });
    }

    monthSelect.addEventListener('change', () => window.renderAttendanceTable());
    populateMonthSelect();
    window.renderAttendanceTable();
    setupCloudListeners();

})();
