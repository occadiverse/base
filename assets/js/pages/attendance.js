window.openEventModal = function() {
    document.getElementById('eventForm').reset();
    document.getElementById('editEventId').value = '';
    document.getElementById('eventDate').value = window.selectedCalendarDateStr;
    window.updateDynamicSelectors();
    document.getElementById('eventModal').classList.remove('hidden');
    document.getElementById('eventModal').classList.add('flex');
};

window.closeEventModal = function() {
    document.getElementById('eventModal').classList.add('hidden');
    document.getElementById('eventModal').classList.remove('flex');
};

window.saveEvent = async function(event) {
    event.preventDefault();

    const eventData = {
        id: document.getElementById('editEventId').value || crypto.randomUUID(),
        title: document.getElementById('eventTitle').value,
        type: document.getElementById('eventType').value,
        team: document.getElementById('eventTeam').value,
        date: document.getElementById('eventDate').value,
        attendance: {}
    };

    await window.saveEventToDatabase(eventData);
    window.closeEventModal();
    window.recalculateOppmoteAndKjemi();

    if (typeof window.renderCalendar === 'function') window.renderCalendar();
};

window.openAttendanceModal = function(eventId) {
    activeAttendanceEventId = eventId;

    let ev = null;
    const isMatchClick = eventId.startsWith('match_');

    if (isMatchClick) {
        ev = (window.activeMatches || []).find(m => m.id === eventId.replace('match_', ''));
    } else {
        ev = (window.activeEvents || []).find(e => e.id === eventId);
    }

    if (!ev) return;

    let modalTitleText = "";
    if (isMatchClick || ev.type === 'Kamp') {
        modalTitleText = `Kamp mot ${ev.opponent || 'Ukjent motstander'}`;
    } else {
        modalTitleText = ev.title && ev.title.trim() !== "" ? ev.title : "Trening";
    }

    document.getElementById('attendanceModalTitle').innerText = modalTitleText;
    document.getElementById('attendanceModalSub').innerText = `${ev.team || 'Hele troppen'} • ${new Date(ev.date).toLocaleDateString('no-NO')}`;

    const container = document.getElementById('attendance-players-list');
    container.innerHTML = '';

    const teamName = ev.team || ev.matchGroup;
    let teamPlayers = (window.activePlayers || []).filter(p => p.spillerLag === teamName && p.status !== 'Passiv');
    if (teamPlayers.length === 0) teamPlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');

    if (teamPlayers.length === 0) {
        container.innerHTML = `<div class="py-6 text-center text-slate-400 text-xs italic">Ingen aktive spillere registrert i systemet.</div>`;
    } else {
        teamPlayers.sort((a, b) => a.navn.localeCompare(b.navn)).forEach(p => {
            const status = ev.attendance ? ev.attendance[p.navn] : undefined;
            const div = document.createElement('div');
            div.className = "py-3 flex justify-between items-center border-b border-slate-50";
            div.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="font-semibold text-slate-800 text-xs">${p.navn}</span>
                    <span class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">${p.pos1 || '-'}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <button type="button" onclick="setAttendancePill(this, true)"
                        class="attendance-pill px-3 py-1.5 rounded-lg text-[10px] font-extrabold border transition ${status === true ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}" data-player="${p.navn}" data-status="true">OK ✅</button>
                    <button type="button" onclick="setAttendancePill(this, false)"
                        class="attendance-pill px-3 py-1.5 rounded-lg text-[10px] font-extrabold border transition ${status === false ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-white border-slate-200 text-slate-400'}" data-player="${p.navn}" data-status="false">X ❌</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    document.getElementById('attendanceModal').classList.remove('hidden');
    document.getElementById('attendanceModal').classList.add('flex');
};

window.setAttendancePill = function(btn, status) {
    const row = btn.parentElement;
    row.querySelectorAll('.attendance-pill').forEach(b => {
        b.classList.remove('bg-emerald-100', 'border-emerald-300', 'text-emerald-800', 'bg-rose-100', 'border-rose-300', 'text-rose-800');
        b.classList.add('bg-white', 'border-slate-200', 'text-slate-400');
    });

    btn.classList.remove('bg-white', 'border-slate-200', 'text-slate-400');
    if (status) btn.classList.add('bg-emerald-100', 'border-emerald-300', 'text-emerald-800');
    else btn.classList.add('bg-rose-100', 'border-rose-300', 'text-rose-800');
};

window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.add('hidden');
    document.getElementById('attendanceModal').classList.remove('flex');

    if (activeAttendanceEventId && activeAttendanceEventId.startsWith('match_')) {
        const matchId = activeAttendanceEventId.replace('match_', '');

        setTimeout(() => {
            if (typeof window.showMatchDetails === 'function') {
                window.showMatchDetails(matchId);
            }
        }, 100);
    }

    activeAttendanceEventId = null;
};

window.saveAttendanceRegistry = async function() {
    const isMatch = activeAttendanceEventId.startsWith('match_');
    const realId = isMatch ? activeAttendanceEventId.replace('match_', '') : activeAttendanceEventId;
    const ev = isMatch
        ? (window.activeMatches || []).find(m => m.id === realId)
        : (window.activeEvents || []).find(e => e.id === realId);

    if (!ev) return;

    const attMap = {};
    document.getElementById('attendance-players-list').querySelectorAll('.attendance-pill').forEach(btn => {
        if (btn.classList.contains('bg-emerald-100') || btn.classList.contains('bg-rose-100')) {
            attMap[btn.getAttribute('data-player')] = btn.getAttribute('data-status') === 'true';
        }
    });

    ev.attendance = attMap;
    if (isMatch) await window.saveMatchToDatabase(ev);
    else await window.saveEventToDatabase(ev);

    window.closeAttendanceModal();
    window.recalculateOppmoteAndKjemi();
};

window.promptDeleteEvent = function(id) {
    window.customConfirm("Slette event?", "Er du sikker på at du ønsker å slette dette oppmøte-eventet permanent?", async () => {
        await window.deleteEventFromDatabase(id);
        window.recalculateOppmoteAndKjemi();
    });
};

window.recalculateOppmoteAndKjemi = function() {
    // Kalenderens gamle statistikkbokser er fjernet, men andre moduler kaller fortsatt denne kroken.
};

window.navigateCalendar = function(direction) {
    const current = window.currentCalendarDate;
    window.currentCalendarDate = new Date(current.getFullYear(), current.getMonth() + direction, 1);
    window.renderCalendar();
};

function formatCalendarDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseCalendarDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

window.goToToday = function() {
    const today = new Date();
    window.currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    window.selectedCalendarDateStr = formatCalendarDate(today);
    window.renderCalendar();
};

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    const date = window.currentCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

    if (document.getElementById('calendar-month-year')) {
        document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;
    }

    grid.innerHTML = '';
    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
        grid.innerHTML += `<div class="bg-slate-50/70 rounded-2xl min-h-[64px] md:min-h-[82px] border border-slate-100"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const dayDate = new Date(year, month, day);
        const dateStr = formatCalendarDate(dayDate);
        const isSelected = window.selectedCalendarDateStr === dateStr;
        const isToday = new Date().toDateString() === dayDate.toDateString();
        const matches = (window.activeMatches || []).filter(m => m.date === dateStr);
        const events = (window.activeEvents || []).filter(e => e.date === dateStr);
        const items = [
            ...matches.map(m => ({
                color: 'bg-emerald-500',
                tint: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                label: m.opponent || 'Kamp'
            })),
            ...events.map(e => ({
                color: e.type === 'Trening' ? 'bg-blue-500' : e.type === 'Dugnad' ? 'bg-amber-500' : e.type === 'Sosialt' ? 'bg-purple-500' : 'bg-slate-400',
                tint: e.type === 'Trening' ? 'bg-blue-50 text-blue-700 border-blue-100' : e.type === 'Dugnad' ? 'bg-amber-50 text-amber-700 border-amber-100' : e.type === 'Sosialt' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-100 text-slate-600 border-slate-200',
                label: e.title || e.type || 'Aktivitet'
            }))
        ];

        const cell = document.createElement('div');
        cell.className = `calendar-day-cell group border rounded-2xl p-1.5 md:p-2 min-h-[64px] md:min-h-[82px] flex flex-col cursor-pointer transition active:scale-95 bg-white hover:bg-sky-50/70 text-slate-800 shadow-sm ${isSelected ? 'is-selected border-bsk-blue/30' : 'border-slate-200'} ${isToday && !isSelected ? 'ring-2 ring-bsk-yellow ring-offset-1' : ''}`;
        cell.onclick = () => window.selectCalendarDate(dateStr);

        const visibleItems = items.slice(0, 2).map(item => `
            <span class="flex items-center gap-1 min-w-0 rounded-full border px-1.5 py-0.5 text-[9px] font-black ${isSelected ? 'bg-bsk-yellow/10 text-bsk-blue border-bsk-yellow/30' : item.tint}">
                <span class="w-1.5 h-1.5 rounded-full ${item.color} shrink-0"></span>
                <span class="hidden sm:inline truncate">${item.label}</span>
            </span>
        `).join('');

        const moreHtml = items.length > 2
            ? `<span class="text-[9px] font-black ${isSelected ? 'text-bsk-blue' : 'text-slate-400'}">+${items.length - 2}</span>`
            : '';

        cell.innerHTML = `
            <div class="flex items-start justify-between gap-1">
                <span class="text-xs md:text-sm font-black ${isSelected ? 'text-bsk-blue' : 'text-slate-700'}">${day}</span>
                ${isToday ? `<span class="text-[8px] font-black uppercase text-bsk-blue">I dag</span>` : ''}
            </div>
            <div class="mt-auto space-y-1 min-h-[22px]">
                ${visibleItems || `<span class="block h-1"></span>`}
                ${moreHtml}
            </div>
        `;
        grid.appendChild(cell);
    }

    window.updateDailySchedule();
};

window.selectCalendarDate = function(dateStr) {
    window.selectedCalendarDateStr = dateStr;
    window.renderCalendar();
};

window.updateDailySchedule = function() {
    const listContainer = document.getElementById('daily-events-list');
    if (!listContainer) return;

    if (!window.selectedCalendarDateStr) window.selectedCalendarDateStr = formatCalendarDate(new Date());

    const dateStr = window.selectedCalendarDateStr;
    const dayMatches = (window.activeMatches || []).filter(m => m.date === dateStr);
    const dayEvents = (window.activeEvents || []).filter(e => e.date === dateStr);
    const selectedDate = parseCalendarDate(dateStr);
    const selectedDateLabel = selectedDate.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });

    if (document.getElementById('selected-calendar-date')) {
        document.getElementById('selected-calendar-date').innerText = selectedDateLabel;
    }

    listContainer.innerHTML = '';

    if (dayMatches.length === 0 && dayEvents.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-slate-50 border border-slate-100 rounded-2xl py-8 px-4 text-center">
                <div class="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mx-auto mb-3">
                    <i class="fa-regular fa-calendar text-slate-300 text-xl"></i>
                </div>
                <p class="font-black text-slate-700 text-sm">Ingen aktiviteter denne dagen</p>
                <p class="text-xs text-slate-500 mt-1">Legg inn trening, sosialt eller dugnad når planen er klar.</p>
                <button onclick="openActivityModal('Trening')" class="portal-btn portal-btn-secondary portal-btn-sm mt-4">
                    Legg til
                </button>
            </div>`;
        return;
    }

    dayMatches.forEach(m => {
        const presentCount = m.attendance ? Object.values(m.attendance).filter(v => v === true).length : 0;
        listContainer.innerHTML += `
            <div class="calendar-detail-card">
                <i class="fa-solid fa-futbol calendar-detail-watermark"></i>
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 relative z-10">
                    <div class="flex items-start gap-3 min-w-0">
                        <div class="calendar-detail-icon">
                            <i class="fa-solid fa-futbol"></i>
                        </div>
                        <div class="min-w-0">
                            <span class="calendar-detail-date">${selectedDateLabel}</span>
                            <h4 class="calendar-detail-title truncate">${m.opponent || 'Kamp'}</h4>
                            <div class="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                <span><i class="fa-regular fa-clock mr-1.5 text-slate-400"></i>${m.time || 'TBA'}</span>
                                <span><i class="fa-solid fa-location-dot mr-1.5 text-slate-400"></i>${m.pitch || 'Ikke oppgitt'}</span>
                                <span><i class="fa-solid fa-user-check mr-1.5 text-slate-400"></i>${presentCount} påmeldt</span>
                            </div>
                            <button onclick="openAttendanceModal('match_${m.id}')" class="portal-btn portal-btn-primary portal-btn-sm mt-2">
                                <i class="fa-solid fa-user-check text-bsk-yellow"></i> Oppmøte
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 shrink-0">
                        <button onclick="window.openMatchModal('${m.id}')" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="promptDeleteMatch('${m.id}')" class="portal-btn portal-btn-icon-sm portal-btn-danger" title="Slett"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });

    dayEvents.forEach(e => {
        const theme = e.type === 'Trening'
            ? { icon: 'fa-person-running', label: 'Trening', box: 'bg-blue-50 border-blue-100 text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100', text: 'text-blue-700' }
            : e.type === 'Dugnad'
                ? { icon: 'fa-hammer', label: 'Dugnad', box: 'bg-amber-50 border-amber-100 text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-100', text: 'text-amber-700' }
                : e.type === 'Sosialt'
                    ? { icon: 'fa-users', label: 'Sosialt', box: 'bg-purple-50 border-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-100', text: 'text-purple-700' }
                    : { icon: 'fa-calendar-check', label: e.type || 'Aktivitet', box: 'bg-slate-50 border-slate-100 text-slate-500', badge: 'bg-slate-100 text-slate-600 border-slate-200', text: 'text-slate-600' };
        const presentCount = e.attendance ? Object.values(e.attendance).filter(v => v === true).length : 0;
        listContainer.innerHTML += `
            <div class="calendar-detail-card">
                <i class="fa-solid ${theme.icon} calendar-detail-watermark"></i>
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 relative z-10">
                    <div class="flex items-start gap-3 min-w-0">
                        <div class="calendar-detail-icon">
                            <i class="fa-solid ${theme.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <span class="calendar-detail-date">${selectedDateLabel}</span>
                            <h4 class="calendar-detail-title truncate">${e.title || theme.label}</h4>
                            <div class="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                <span><i class="fa-regular fa-clock mr-1.5 text-slate-400"></i>${e.time || 'TBA'}</span>
                                <span><i class="fa-solid fa-location-dot mr-1.5 text-slate-400"></i>${e.location || 'Ikke oppgitt'}</span>
                                <span><i class="fa-solid fa-user-check mr-1.5 text-slate-400"></i>${presentCount} påmeldt</span>
                            </div>
                            <button onclick="openAttendanceModal('${e.id}')" class="portal-btn portal-btn-primary portal-btn-sm mt-2">
                                <i class="fa-solid fa-user-check text-bsk-yellow"></i> Oppmøte
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 shrink-0">
                        <button onclick="editActivity('${e.id}')" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="deleteActivity('${e.id}')" class="portal-btn portal-btn-icon-sm portal-btn-danger" title="Slett"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
};

window.quickAddEvent = function(type) {
    if (type === 'Kamp') {
        window.openMatchModal();
        document.getElementById('matchDate').value = window.selectedCalendarDateStr;
    } else {
        window.openEventModal();
        document.getElementById('eventType').value = type;
        document.getElementById('eventDate').value = window.selectedCalendarDateStr;
    }
};

window.renderEvents = function() {
    const tableBody = document.getElementById('eventTableBody');
    const noEventsView = document.getElementById('no-events-view');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const events = Array.isArray(window.activeEvents) ? window.activeEvents : [];
    const formattedMatches = (window.activeMatches || []).map(m => ({
        id: 'match_' + m.id,
        title: "Kamp: " + m.opponent,
        type: "Kamp",
        date: m.date,
        attendance: m.attendance || {}
    }));
    const combinedList = [...events, ...formattedMatches];

    if (combinedList.length === 0) {
        if (noEventsView) noEventsView.classList.remove('hidden');
        return;
    }

    if (noEventsView) noEventsView.classList.add('hidden');

    combinedList.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(ev => {
        const attendanceCount = ev.attendance ? Object.values(ev.attendance).filter(v => v === true).length : 0;
        tableBody.innerHTML += `<tr class="hover:bg-slate-50 transition-colors"><td class="py-3 px-4 font-bold text-slate-800">${ev.title || 'Uten navn'}</td><td class="py-3 px-4 text-slate-500">${ev.type || '-'}</td><td class="py-3 px-4 text-center text-slate-600">${new Date(ev.date).toLocaleDateString('no-NO', {day:'2-digit', month:'2-digit'})}</td><td class="py-3 px-4 text-center font-bold text-bsk-blue">${attendanceCount}</td><td class="py-3 px-6 text-right"><button onclick="openAttendanceModal('${ev.id}')" class="portal-btn portal-btn-success portal-btn-xs">REGISTRER</button></td></tr>`;
    });
};

window.openActivityModal = function(defaultType = 'Trening') {
    document.getElementById('activityType').value = defaultType;
    window.updateActivityTitlePlaceholder();

    const modal = document.getElementById('activityModal');
    const header = modal.querySelector('h3');
    const submitBtn = modal.querySelector('button[onclick="saveNewActivity()"]');

    if (header) header.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Opprett Aktivitet`;
    if (submitBtn) submitBtn.innerText = "OPPRETT AKTIVITET";

    document.getElementById('editEventId').value = '';
    document.getElementById('activityDate').value = window.selectedCalendarDateStr || new Date().toISOString().split('T')[0];
    document.getElementById('activityTitle').value = '';
    document.getElementById('activityLocation').value = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeActivityModal = function() {
    document.getElementById('activityModal').classList.add('hidden');
    document.getElementById('activityModal').classList.remove('flex');
};

window.editActivity = function(id) {
    if (id.startsWith('match_')) {
        window.openMatchModal(id.replace('match_', ''));
        return;
    }

    const ev = (window.activeEvents || []).find(e => e.id === id);
    if (!ev) return;

    window.openActivityModal(ev.type);

    const modal = document.getElementById('activityModal');
    const header = modal.querySelector('h3');
    const submitBtn = modal.querySelector('button[onclick="saveNewActivity()"]');

    if (header) header.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Endre Aktivitet`;
    if (submitBtn) submitBtn.innerText = "OPPDATER AKTIVITET";

    document.getElementById('editEventId').value = ev.id;
    document.getElementById('activityTitle').value = ev.title;
    document.getElementById('activityDate').value = ev.date;
    document.getElementById('activityTime').value = ev.time || '';
    document.getElementById('activityTeam').value = ev.team;
    document.getElementById('activityLocation').value = ev.location || '';
};

window.deleteActivity = function(id) {
    window.customConfirm("Slette aktivitet?", "Er du sikker?", async () => {
        if (id.startsWith('match_')) await window.deleteMatchFromDatabase(id.replace('match_', ''));
        else await window.deleteEventFromDatabase(id);

        window.updateDailySchedule();
        if (typeof window.renderEvents === 'function') window.renderEvents();
    });
};

window.updateActivityTitlePlaceholder = function() {
    const type = document.getElementById('activityType').value;
    const titleInput = document.getElementById('activityTitle');
    const titleLabel = document.getElementById('activityTitleLabel');

    if (type === 'Kamp') {
        if (titleLabel) titleLabel.innerText = "Motstander";
        titleInput.placeholder = "F.eks. BSK - KFUM";
    } else {
        if (titleLabel) titleLabel.innerText = "Tittel";
        titleInput.placeholder = "F.eks. Taktisk trening, Lagfest...";
    }
};

window.saveNewActivity = async function() {
    const editId = document.getElementById('editEventId').value;
    const type = document.getElementById('activityType').value;
    const title = document.getElementById('activityTitle').value;
    const date = document.getElementById('activityDate').value;
    const time = document.getElementById('activityTime').value;
    const selectedTeam = document.getElementById('activityTeam').value;
    const location = document.getElementById('activityLocation').value;

    if (!date || !selectedTeam) {
        alert("Du må i hvert fall velge dato og lag!");
        return;
    }

    if (type === 'Kamp') {
        const existingMatch = editId ? (window.activeMatches || []).find(m => m.id === editId) : null;
        const matchData = {
            id: editId || Date.now().toString(),
            date,
            time,
            opponent: title,
            pitch: location || 'Ikke satt',
            matchType: existingMatch ? existingMatch.matchType : 'Treningskamp',
            matchGroup: selectedTeam,
            result: existingMatch ? existingMatch.result : '',
            attendance: existingMatch ? (existingMatch.attendance || {}) : {},
            scorers: existingMatch ? (existingMatch.scorers || {}) : {},
            ratings: existingMatch ? (existingMatch.ratings || {}) : {}
        };

        if (typeof window.saveMatchToDatabase === 'function') await window.saveMatchToDatabase(matchData);
    } else {
        const existingEvent = editId ? (window.activeEvents || []).find(e => e.id === editId) : null;
        const activityData = {
            id: editId || Date.now().toString(),
            type,
            title,
            date,
            time,
            location: location || 'Ikke satt',
            team: selectedTeam,
            attendance: existingEvent ? (existingEvent.attendance || {}) : {}
        };

        if (typeof window.saveEventToDatabase === 'function') await window.saveEventToDatabase(activityData);
    }

    window.closeActivityModal();

    if (typeof window.applyFilters === 'function') window.applyFilters();
    if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
};
