function escapeAttendanceHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeCalendarHtml(value) {
    return escapeAttendanceHtml(value);
}

function bindAttendanceModalEvents() {
    const container = document.getElementById('attendance-players-list');
    if (!container || container.dataset.attendanceEventsBound === 'true') return;

    container.dataset.attendanceEventsBound = 'true';
    container.addEventListener('click', (event) => {
        const alertBtn = event.target.closest('[data-attendance-action="match-alert"]');
        if (!alertBtn) return;

        event.preventDefault();
        event.stopPropagation();
        const matchId = alertBtn.dataset.eventId;
        if (matchId) window.showMatchAlertModal(matchId);
    });
    container.addEventListener('change', (event) => {
        if (event.target.matches('.attendance-modal-checkbox')) {
            window.updateAttendanceModalSummary();
        }
    });
}

function bindDailyEventsListEvents() {
    const container = document.getElementById('daily-events-list');
    if (!container || container.dataset.attendanceEventsBound === 'true') return;

    container.dataset.attendanceEventsBound = 'true';
    container.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-attendance-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.attendanceAction;
        const eventId = actionEl.dataset.eventId;
        const activityType = actionEl.dataset.activityType;

        if (action === 'attendance' && eventId) {
            window.openAttendanceModal(eventId);
        } else if (action === 'edit-match' && eventId) {
            window.openMatchModal(eventId);
        } else if (action === 'edit-activity' && eventId) {
            window.editActivity(eventId);
        } else if (action === 'open-session' && eventId) {
            if (typeof window.openTrainingSession === 'function') window.openTrainingSession(eventId);
        } else if (action === 'open-match-details' && eventId) {
            if (typeof window.goToMatchDetails === 'function') window.goToMatchDetails(eventId);
        } else if (action === 'add-activity') {
            window.openActivityModal(activityType || 'Trening');
        }
    });
}

function setAttendanceModalFeedback(message, variant = '', autoClearMs = 0) {
    const el = document.getElementById('attendanceModalFeedback');
    if (!el) return;

    if (el._feedbackTimer) {
        clearTimeout(el._feedbackTimer);
        el._feedbackTimer = null;
    }

    el.textContent = message || '';
    el.hidden = !message;
    el.classList.remove('is-success', 'is-error', 'is-pending');
    if (message && variant) el.classList.add(`is-${variant}`);

    if (message && autoClearMs > 0) {
        el._feedbackTimer = setTimeout(() => {
            el.textContent = '';
            el.hidden = true;
            el.classList.remove('is-success', 'is-error', 'is-pending');
            el._feedbackTimer = null;
        }, autoClearMs);
    }
}

window.showPortalAttendanceFeedback = function(message, variant = 'success', autoClearMs = 5000) {
    const el = document.getElementById('portal-attendance-feedback');
    if (!el) return;

    if (el._feedbackTimer) {
        clearTimeout(el._feedbackTimer);
        el._feedbackTimer = null;
    }

    el.textContent = message || '';
    el.hidden = !message;
    el.classList.remove('is-success', 'is-error', 'is-pending');
    if (message && variant) el.classList.add(`is-${variant}`);

    if (message && autoClearMs > 0) {
        el._feedbackTimer = setTimeout(() => {
            el.textContent = '';
            el.hidden = true;
            el.classList.remove('is-success', 'is-error', 'is-pending');
            el._feedbackTimer = null;
        }, autoClearMs);
    }
};

function bindAttendanceListEvents() {
    bindAttendanceModalEvents();
    bindDailyEventsListEvents();
}

window.openAttendanceModal = function(eventId) {
    activeAttendanceEventId = eventId;
    window._modalReturnContext = window.captureModalReturnContext();

    let ev = null;
    const isMatchClick = eventId.startsWith('match_');

    if (isMatchClick) {
        ev = (window.activeMatches || []).find(m => m.id === eventId.replace('match_', ''));
    } else {
        ev = (window.activeEvents || []).find(e => e.id === eventId);
    }

    if (!ev) return;

    let activityLabel = 'aktivitet';
    if (isMatchClick || ev.type === 'Kamp') {
        activityLabel = 'kamp';
    } else if (ev.type === 'Trening') {
        activityLabel = 'trening';
    } else if (ev.type) {
        activityLabel = 'annet';
    }

    const dateLabel = new Date(ev.date).toLocaleDateString('no-NO');
    document.getElementById('attendanceModalTitle').innerText = `Oppmøte ${activityLabel} • ${dateLabel}`;

    bindAttendanceModalEvents();

    setAttendanceModalFeedback('', '');

    const container = document.getElementById('attendance-players-list');
    container.innerHTML = '';

    const teamPlayers = typeof window.getAttendanceModalTeamPlayers === 'function'
        ? window.getAttendanceModalTeamPlayers(ev)
        : (window.activePlayers || []).filter(p => p.status !== 'Passiv');
    const disciplineStatus = isMatchClick && typeof window.getDisciplineStatusForTeam === 'function'
        ? window.getDisciplineStatusForTeam(ev.matchGroup, ev.date)
        : {};

    const appendPlayerRow = (player, { checked } = {}) => {
        const playerId = window.getPlayerStorageKey(player);
        if (!playerId) return;

        const isGuest = Boolean(player.isGuest) || window.isGuestPlayerRef(playerId);
        const isRegistered = checked === true || window.getAttendanceForPlayer(ev.attendance, player) === true;
        const playerDiscipline = !isGuest
            ? (disciplineStatus[playerId] || disciplineStatus[player.navn] || {})
            : {};
        const hasDisciplineWarning = playerDiscipline.isSuspended || playerDiscipline.isAtRisk;
        const warningLabel = playerDiscipline.isSuspended
            ? (playerDiscipline.reason || 'Karantene')
            : 'Faresone';
        const warningTitle = playerDiscipline.isSuspended
            ? `${player.navn} har karantene i neste seriekamp.`
            : `${player.navn} står i faresone for karantene.`;
        const warningChipHtml = hasDisciplineWarning
            ? `
                <button type="button"
                        data-attendance-action="match-alert"
                        data-event-id="${escapeAttendanceHtml(ev.id)}"
                        class="attendance-modal-player-alert-chip ${playerDiscipline.isSuspended ? 'is-critical' : 'is-warning'}"
                        title="${escapeAttendanceHtml(warningTitle)}">
                    <i class="fa-solid ${playerDiscipline.cardType === 'red' ? 'fa-square' : 'fa-triangle-exclamation'}"></i>
                    <span>${escapeAttendanceHtml(warningLabel)}</span>
                </button>
            `
            : '';
        const div = document.createElement('div');
        div.className = `attendance-modal-player${isGuest ? ' is-guest' : ''}`;
        div.setAttribute('data-player-id', playerId);
        if (isGuest) div.setAttribute('data-guest', 'true');
        div.innerHTML = `
            <label class="attendance-modal-player-label">
                <input
                    type="checkbox"
                    class="attendance-modal-checkbox"
                    data-player-id="${escapeAttendanceHtml(playerId)}"
                    ${isRegistered ? 'checked' : ''}
                >
                <div class="attendance-modal-player-info">
                    <span class="attendance-modal-player-name-row">
                        <span class="attendance-modal-player-name">${escapeAttendanceHtml(player.navn)}</span>
                        ${warningChipHtml}
                    </span>
                    <span class="attendance-modal-player-pos">${escapeAttendanceHtml(player.pos1 || '-')}</span>
                </div>
            </label>
        `;
        container.appendChild(div);
    };

    const guestBtn = document.getElementById('attendanceAddGuestBtn');
    const canAddGuests = !isMatchClick && (ev.type === 'Trening' || ev.type === 'Annet');
    if (guestBtn) {
        guestBtn.classList.toggle('hidden', !canAddGuests);
    }

    const existingGuestRefs = Object.keys(ev.attendance || {})
        .filter(ref => window.isGuestPlayerRef(ref) && window.normalizeAttendanceValue(ev.attendance[ref]) === true)
        .sort((a, b) => (window.getGuestPlayerNumber(a) || 0) - (window.getGuestPlayerNumber(b) || 0));

    if (teamPlayers.length === 0 && existingGuestRefs.length === 0) {
        container.innerHTML = `<div class="attendance-modal-empty">Ingen aktive spillere registrert i systemet.</div>`;
    } else if (teamPlayers.length > 0) {
        const seenPlayerIds = new Set();
        teamPlayers
            .slice()
            .sort((a, b) => a.navn.localeCompare(b.navn, 'no'))
            .filter(player => {
                const playerId = window.getPlayerStorageKey(player);
                if (!playerId || seenPlayerIds.has(playerId)) return false;
                seenPlayerIds.add(playerId);
                return true;
            })
            .forEach(player => appendPlayerRow(player));
    }

    existingGuestRefs.forEach((ref) => {
        const guest = window.createGuestPlayer(window.getGuestPlayerNumber(ref));
        if (guest) appendPlayerRow(guest, { checked: true });
    });

    window.updateAttendanceModalSummary();

    document.getElementById('attendanceModal').classList.remove('hidden');
    document.getElementById('attendanceModal').classList.add('flex');
};

window.addAttendanceGuestPlayer = function() {
    const container = document.getElementById('attendance-players-list');
    if (!container || !activeAttendanceEventId) return;
    if (String(activeAttendanceEventId).startsWith('match_')) return;

    const emptyState = container.querySelector('.attendance-modal-empty');
    if (emptyState) emptyState.remove();

    const nextNumber = window.getNextGuestPlayerNumber(
        null,
        container
    );
    const guest = window.createGuestPlayer(nextNumber);
    if (!guest) return;

    const div = document.createElement('div');
    div.className = 'attendance-modal-player is-guest';
    div.setAttribute('data-player-id', guest.id);
    div.setAttribute('data-guest', 'true');
    div.innerHTML = `
        <label class="attendance-modal-player-label">
            <input
                type="checkbox"
                class="attendance-modal-checkbox"
                data-player-id="${escapeAttendanceHtml(guest.id)}"
                checked
            >
            <div class="attendance-modal-player-info">
                <span class="attendance-modal-player-name-row">
                    <span class="attendance-modal-player-name">${escapeAttendanceHtml(guest.navn)}</span>
                </span>
                <span class="attendance-modal-player-pos">Gjest</span>
            </div>
        </label>
    `;
    container.appendChild(div);
    div.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    window.updateAttendanceModalSummary();
};

window.updateAttendanceModalSummary = function() {
    const checkboxes = document.querySelectorAll('#attendance-players-list .attendance-modal-checkbox');
    const checkedCount = [...checkboxes].filter(checkbox => checkbox.checked).length;
    const totalCount = checkboxes.length;
    const summary = document.getElementById('attendanceModalSummary');
    if (summary) {
        summary.textContent = `${checkedCount}/${totalCount}`;
        summary.setAttribute('aria-label', `${checkedCount} av ${totalCount} spillere møtt opp`);
    }
};

window.saveAttendanceRegistry = async function() {
    if (!activeAttendanceEventId) return;

    const isMatch = activeAttendanceEventId.startsWith('match_');
    const realId = isMatch ? activeAttendanceEventId.replace('match_', '') : activeAttendanceEventId;
    const ev = isMatch
        ? (window.activeMatches || []).find(m => m.id === realId)
        : (window.activeEvents || []).find(e => e.id === realId);

    if (!ev) return;

    const container = document.getElementById('attendance-players-list');
    const teamPlayers = typeof window.getAttendanceModalTeamPlayers === 'function'
        ? window.getAttendanceModalTeamPlayers(ev)
        : [];

    ev.attendance = typeof window.buildAttendanceMapFromModal === 'function'
        ? window.buildAttendanceMapFromModal(container, ev.attendance, teamPlayers)
        : (ev.attendance || {});

    try {
        if (isMatch) {
            const pruneResult = typeof window.pruneMatchPlanUnavailablePlayers === 'function'
                ? window.pruneMatchPlanUnavailablePlayers(ev)
                : { match: ev, changed: false };
            const matchToSave = pruneResult.match;
            Object.assign(ev, matchToSave);
            await window.saveMatchToDatabase(matchToSave);

            const tacticalSelect = document.getElementById('tacticalMatchSelect');
            if (pruneResult.changed && tacticalSelect?.value === ev.id && typeof window.loadMatchTactics === 'function') {
                window.loadMatchTactics();
            }
        } else {
            await window.saveEventToDatabase(ev);
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    const presenceStats = typeof window.getAttendancePresenceStats === 'function'
        ? window.getAttendancePresenceStats(ev)
        : { presentCount: 0, squadSize: 0, isRegistered: true };
    const feedbackMessage = typeof window.buildAttendanceSaveFeedbackMessage === 'function'
        ? window.buildAttendanceSaveFeedbackMessage(presenceStats)
        : 'Oppmøte lagret';
    const returnContext = window._modalReturnContext;
    const returnsToDetailPage = returnContext?.tab === 'kampdetaljer' || returnContext?.tab === 'oktside';

    window._pendingAttendanceFeedback = {
        isMatch,
        recordId: realId,
        presentCount: presenceStats.presentCount,
        squadSize: presenceStats.squadSize
    };

    if (returnsToDetailPage) {
        window.closeAttendanceModal();
        return;
    }

    setAttendanceModalFeedback(feedbackMessage, 'success');
    setTimeout(() => {
        window._pendingAttendanceFeedback = null;
        window.closeAttendanceModal();
        if (typeof window.showPortalAttendanceFeedback === 'function') {
            window.showPortalAttendanceFeedback(feedbackMessage, 'success', 5000);
        }
    }, 1300);
};

window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.add('hidden');
    document.getElementById('attendanceModal').classList.remove('flex');

    const guestBtn = document.getElementById('attendanceAddGuestBtn');
    if (guestBtn) guestBtn.classList.add('hidden');

    const context = window._modalReturnContext;
    window._modalReturnContext = null;
    activeAttendanceEventId = null;

    window.restoreModalReturnContext(context);

    if (typeof window.updateDashboard === 'function') window.updateDashboard();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
};

window.promptDeleteEvent = function(id) {
    window.customConfirm("Slette event?", "Er du sikker på at du ønsker å slette dette oppmøte-eventet permanent?", async () => {
        await window.deleteEventFromDatabase(id);
        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
    });
};

const calendarMonthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

window.navigateCalendar = function(direction) {
    const current = window.visibleCalendarMonthDate || window.currentCalendarDate || new Date();
    const targetMonth = new Date(current.getFullYear(), current.getMonth() + direction, 1);
    window.currentCalendarDate = targetMonth;
    window.visibleCalendarMonthDate = targetMonth;
    window.selectedCalendarDateStr = formatCalendarDate(targetMonth);
    window.renderCalendar();
};

function formatCalendarDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseCalendarDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function startOfCalendarWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dayIndex);
    return d;
}

function addCalendarDays(date, days) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
}

function updateCalendarHeading(date) {
    if (!date) return;
    const headingMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    window.visibleCalendarMonthDate = headingMonthDate;
    if (document.getElementById('calendar-month-year')) {
        document.getElementById('calendar-month-year').innerText = calendarMonthNames[headingMonthDate.getMonth()];
    }
    if (document.getElementById('calendar-year')) {
        document.getElementById('calendar-year').innerText = String(headingMonthDate.getFullYear());
    }
}

window.goToToday = function() {
    const today = new Date();
    window.currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    window.visibleCalendarMonthDate = window.currentCalendarDate;
    window.selectedCalendarDateStr = formatCalendarDate(today);
    window.renderCalendar();
};

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    const date = window.currentCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    updateCalendarHeading(date);

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const rangeStart = startOfCalendarWeek(monthStart);
    const rangeEnd = addCalendarDays(startOfCalendarWeek(monthEnd), 6);
    const weeksToRender = Math.floor((rangeEnd - rangeStart) / (7 * 24 * 60 * 60 * 1000)) + 1;

    grid.innerHTML = '';

    for (let week = 0; week < weeksToRender; week++) {
        const weekStart = addCalendarDays(rangeStart, week * 7);

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const dayDate = addCalendarDays(weekStart, dayOffset);
            const day = dayDate.getDate();
            const dateStr = formatCalendarDate(dayDate);
            const isSelected = window.selectedCalendarDateStr === dateStr;
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isOutsideActiveMonth = dayDate.getMonth() !== month;
            const matches = (window.activeMatches || []).filter(m => m.date === dateStr);
            const events = (window.activeEvents || []).filter(e => e.date === dateStr);
            const items = [
                ...matches.map(m => ({
                    color: 'bg-emerald-500',
                    label: m.opponent || 'Kamp'
                })),
                ...events.map(e => ({
                    color: e.type === 'Trening' ? 'bg-blue-500' : 'bg-slate-400',
                    label: e.title || e.type || 'Aktivitet'
                }))
            ];

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = `calendar-day-cell group border rounded-2xl p-1.5 md:p-2 min-h-[64px] md:min-h-[82px] flex flex-col cursor-pointer transition active:scale-95 bg-white hover:bg-sky-50/70 text-slate-800 shadow-sm ${isSelected ? 'is-selected border-bsk-blue/30' : 'border-slate-200'} ${isToday && !isSelected ? 'is-today' : ''} ${isOutsideActiveMonth ? 'is-outside-month' : ''}`;
            cell.dataset.calendarDate = dateStr;
            if (dayOffset === 0) cell.dataset.calendarWeekStart = formatCalendarDate(weekStart);
            cell.setAttribute('aria-label', dayDate.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
            if (isSelected) cell.setAttribute('aria-current', 'date');
            cell.onclick = () => window.selectCalendarDate(dateStr);

            const visibleItems = items.slice(0, 2).map(item => `
                <span class="calendar-day-event flex items-center gap-1 min-w-0 font-black ${isSelected ? 'text-white' : 'text-slate-600'}">
                    <span class="calendar-day-event-dot rounded-full ${item.color} shrink-0"></span>
                    <span class="calendar-day-event-label truncate">${escapeCalendarHtml(item.label)}</span>
                </span>
            `).join('');

            const moreHtml = items.length > 2
                ? `<span class="calendar-day-more text-[9px] font-black ${isSelected ? 'text-bsk-blue' : 'text-slate-400'}">+${items.length - 2}</span>`
                : '';

            cell.innerHTML = `
                <div class="calendar-day-layout">
                    <span class="calendar-day-number text-xs md:text-sm font-black ${isSelected ? 'text-bsk-blue' : 'text-slate-700'}">${day}</span>
                    <div class="calendar-day-events">
                        ${visibleItems || `<span class="calendar-day-empty-space"></span>`}
                        ${moreHtml}
                    </div>
                </div>
            `;
            grid.appendChild(cell);
        }
    }

    window.updateDailySchedule();
};

window.selectCalendarDate = function(dateStr) {
    window.selectedCalendarDateStr = dateStr;
    window.currentCalendarDate = parseCalendarDate(dateStr);
    window.visibleCalendarMonthDate = new Date(window.currentCalendarDate.getFullYear(), window.currentCalendarDate.getMonth(), 1);
    window.renderCalendar();
};

window.updateDailySchedule = function() {
    const listContainer = document.getElementById('daily-events-list');
    if (!listContainer) return;

    bindDailyEventsListEvents();

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
            <div class="calendar-empty-state rounded-2xl py-8 px-4 text-center">
                <div class="calendar-empty-icon">
                    <i class="fa-regular fa-calendar"></i>
                </div>
                <p class="calendar-empty-title">Ingen aktiviteter</p>
                <button type="button" data-attendance-action="add-activity" data-activity-type="Trening" class="bsk-btn bsk-btn-primary is-collapsible" title="Legg til" aria-label="Legg til">
                    <i class="fa-solid fa-calendar-plus" aria-hidden="true"></i>
                    <span class="bsk-btn-label">Legg til</span>
                </button>
            </div>`;
        return;
    }

    const renderDailyMatch = (m) => {
        const attendanceMeta = typeof window.formatAttendancePresenceLabel === 'function'
            ? window.formatAttendancePresenceLabel(m)
            : '';
        const matchId = escapeAttendanceHtml(m.id);
        const opponent = m.opponent || 'Motstander ikke satt';
        const venue = typeof window.getMatchVenue === 'function'
            ? window.getMatchVenue(m)
            : (m.venue || 'Hjemme');
        const resultValue = m.result && typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(m.result, venue)
            : (m.result || '');
        const timeValue = m.time || '--:--';
        const matchTimeOrResult = resultValue || timeValue;
        const opponentLogoHtml = typeof window.buildClubLogoImgHtml === 'function'
            ? window.buildClubLogoImgHtml(opponent, 'calendar-match-opponent-logo')
            : '';
        const opponentMarkHtml = opponentLogoHtml || `
            <span class="calendar-match-opponent-logo calendar-match-opponent-fallback" aria-hidden="true">
                <i class="fa-solid fa-shield"></i>
            </span>
        `;
        return `
            <div class="calendar-detail-card calendar-match-detail-card">
                <i class="fa-solid fa-futbol calendar-detail-watermark"></i>
                <div class="calendar-detail-card-actions">
                    <button type="button" data-attendance-action="open-match-details" data-event-id="${matchId}" class="bsk-btn bsk-btn-icon bsk-btn-secondary" title="Åpne kampdetaljer" aria-label="Åpne kampdetaljer"><i class="fa-solid fa-shield-halved"></i></button>
                    <button type="button" data-attendance-action="attendance" data-event-id="match_${matchId}" class="bsk-btn bsk-btn-icon bsk-btn-primary" title="Oppmøte" aria-label="Oppmøte"><i class="fa-solid fa-user-check"></i></button>
                    <button type="button" data-attendance-action="edit-match" data-event-id="${matchId}" class="bsk-btn bsk-btn-icon bsk-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>
                <div class="calendar-daily-card-content calendar-match-card-content relative z-10">
                    <div class="calendar-daily-icon-slot calendar-match-icon-slot">
                        ${opponentMarkHtml}
                    </div>
                    <div class="calendar-daily-main calendar-match-main">
                        <div class="calendar-daily-title-block calendar-match-title-block">
                            <div class="calendar-daily-title-line calendar-match-opponent-line">
                                <h4 class="calendar-detail-title calendar-daily-title calendar-match-title">${escapeCalendarHtml(opponent)}</h4>
                                <span class="calendar-detail-time-dot" aria-hidden="true"></span>
                                <span class="calendar-daily-time calendar-match-time-result">${escapeCalendarHtml(matchTimeOrResult)}</span>
                            </div>
                            <div class="calendar-daily-meta-row calendar-match-meta-row">
                                <span><i class="fa-solid fa-location-dot"></i>${escapeCalendarHtml(m.pitch || 'Sted ikke satt')}</span>
                                ${attendanceMeta ? `<span><i class="fa-solid fa-user-check"></i>${escapeCalendarHtml(attendanceMeta)}</span>` : ''}
                            </div>
                        </div>
                    </div>

                </div>
            </div>`;
    };

    const renderDailyEvent = (e) => {
        const theme = e.type === 'Trening'
            ? { icon: 'fa-person-running', label: 'Trening', tone: 'is-training', box: 'bg-blue-50 border-blue-100 text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100', text: 'text-blue-700' }
            : { icon: 'fa-calendar-check', label: 'Annet', tone: 'is-other', box: 'bg-slate-50 border-slate-100 text-slate-500', badge: 'bg-slate-100 text-slate-600 border-slate-200', text: 'text-slate-600' };
        const attendanceMeta = typeof window.formatAttendancePresenceLabel === 'function'
            ? window.formatAttendancePresenceLabel(e)
            : '';
        const displayTitle = e.title && String(e.title).trim() ? e.title : theme.label;
        const eventId = escapeAttendanceHtml(e.id);
        const sessionActionTitle = e.type === 'Trening' ? 'Åpne øktside' : 'Åpne aktivitet';
        return `
            <div class="calendar-detail-card calendar-event-detail-card ${theme.tone}">
                <i class="fa-solid ${theme.icon} calendar-detail-watermark"></i>
                <div class="calendar-detail-card-actions">
                    <button type="button" data-attendance-action="open-session" data-event-id="${eventId}" class="bsk-btn bsk-btn-icon bsk-btn-secondary" title="${escapeAttendanceHtml(sessionActionTitle)}" aria-label="${escapeAttendanceHtml(sessionActionTitle)}"><i class="fa-solid fa-clipboard-list"></i></button>
                    <button type="button" data-attendance-action="attendance" data-event-id="${eventId}" class="bsk-btn bsk-btn-icon bsk-btn-primary" title="Oppmøte" aria-label="Oppmøte"><i class="fa-solid fa-user-check"></i></button>
                    <button type="button" data-attendance-action="edit-activity" data-event-id="${eventId}" class="bsk-btn bsk-btn-icon bsk-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>
                <div class="calendar-daily-card-content calendar-event-card-content relative z-10">
                    <div class="calendar-daily-icon-slot calendar-event-icon-slot">
                        <div class="calendar-detail-icon">
                            <i class="fa-solid ${theme.icon}"></i>
                        </div>
                    </div>
                    <div class="calendar-daily-main calendar-event-main">
                        <div class="calendar-daily-title-block calendar-event-title-block">
                            <div class="calendar-daily-title-line calendar-event-title-line">
                                <h4 class="calendar-detail-title calendar-daily-title truncate">${escapeCalendarHtml(displayTitle)}</h4>
                                <span class="calendar-detail-time-dot" aria-hidden="true"></span>
                                <span class="calendar-daily-time calendar-event-time">${escapeCalendarHtml(e.time || 'TBA')}</span>
                            </div>
                            <div class="calendar-daily-meta-row calendar-detail-meta-row">
                                <span><i class="fa-solid fa-location-dot"></i>${escapeCalendarHtml(e.location || 'Ikke oppgitt')}</span>
                                ${attendanceMeta ? `<span><i class="fa-solid fa-user-check"></i>${escapeCalendarHtml(attendanceMeta)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    const getSortTime = (item) => {
        const time = item.data.time || '99:99';
        const [hours = 99, minutes = 99] = String(time).split(':').map(Number);
        return (Number.isFinite(hours) ? hours : 99) * 60 + (Number.isFinite(minutes) ? minutes : 99);
    };

    listContainer.innerHTML = [
        ...dayMatches.map(match => ({ type: 'match', data: match })),
        ...dayEvents.map(event => ({ type: 'event', data: event }))
    ]
        .sort((a, b) => getSortTime(a) - getSortTime(b))
        .map(item => item.type === 'match' ? renderDailyMatch(item.data) : renderDailyEvent(item.data))
        .join('');
};

window.openActivityModal = function(defaultType = 'Trening') {
    document.getElementById('activityType').value = defaultType;
    window.updateActivityTitlePlaceholder();

    const modal = document.getElementById('activityModal');
    const header = modal.querySelector('h3');
    const submitBtn = modal.querySelector('button[onclick="saveNewActivity()"]');
    const headerAction = document.getElementById('activityModalHeaderAction');

    if (header) header.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Ny aktivitet`;
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Lagre</span>`;
    if (headerAction) {
        headerAction.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        headerAction.title = 'Lukk';
        headerAction.setAttribute('aria-label', 'Lukk');
        headerAction.setAttribute('onclick', 'window.closeActivityModal()');
        headerAction.classList.remove('calendar-action-danger');
        headerAction.classList.add('hidden');
    }

    document.getElementById('editActivityId').value = '';
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
    const headerAction = document.getElementById('activityModalHeaderAction');

    if (header) header.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Endre Aktivitet`;
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Lagre</span>`;
    if (headerAction) {
        headerAction.innerHTML = '<i class="fa-solid fa-trash"></i>';
        headerAction.title = 'Slett aktivitet';
        headerAction.setAttribute('aria-label', 'Slett aktivitet');
        headerAction.setAttribute('onclick', 'window.deleteCurrentActivity()');
        headerAction.classList.add('calendar-action-danger');
        headerAction.classList.remove('hidden');
    }

    document.getElementById('editActivityId').value = ev.id;
    document.getElementById('activityTitle').value = ev.title;
    document.getElementById('activityDate').value = ev.date;
    document.getElementById('activityTime').value = ev.time || '';
    document.getElementById('activityLocation').value = ev.location || '';
};

window.deleteActivity = function(id) {
    window.customConfirm("Slette aktivitet?", "Er du sikker?", async () => {
        if (id.startsWith('match_')) await window.deleteMatchFromDatabase(id.replace('match_', ''));
        else await window.deleteEventFromDatabase(id);

        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        window.updateDailySchedule();
    });
};

window.deleteCurrentActivity = function() {
    const activityId = document.getElementById('editActivityId')?.value;
    if (!activityId) return;

    window.customConfirm("Slette aktivitet?", "Er du sikker?", async () => {
        await window.deleteEventFromDatabase(activityId);
        window.closeActivityModal();

        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
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
    const editId = document.getElementById('editActivityId').value;
    const type = document.getElementById('activityType')?.value || '';
    const title = document.getElementById('activityTitle').value.trim();
    const date = document.getElementById('activityDate').value.trim();
    const time = document.getElementById('activityTime').value.trim();
    const selectedTeam = window.getPrimaryTeamName() || '';
    const location = document.getElementById('activityLocation').value.trim();

    if (!date) {
        alert('Du må velge dato!');
        return;
    }
    if (!selectedTeam) {
        alert('Fant ikke lag. Opprett eller velg et lag først.');
        return;
    }
    if (type === 'Kamp' && !title) {
        alert('Du må fylle inn motstander for kampen.');
        return;
    }

    try {
        if (type === 'Kamp') {
            const existingMatch = editId ? (window.activeMatches || []).find(m => m.id === editId) : null;
            const matchData = {
                ...(existingMatch || {}),
                id: editId || Date.now().toString(),
                date,
                time,
                opponent: title,
                pitch: location || 'Ikke satt',
                matchType: existingMatch ? existingMatch.matchType : 'Treningskamp',
                matchGroup: selectedTeam,
                result: existingMatch ? existingMatch.result : ''
            };

            if (typeof window.saveMatchToDatabase === 'function') await window.saveMatchToDatabase(matchData);
        } else {
            const existingEvent = editId ? (window.activeEvents || []).find(e => e.id === editId) : null;
            const activityData = {
                ...(existingEvent || {}),
                id: editId || Date.now().toString(),
                type,
                title,
                date,
                time,
                location: location || 'Ikke satt',
                team: selectedTeam
            };

            if (typeof window.saveEventToDatabase === 'function') await window.saveEventToDatabase(activityData);
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    window.closeActivityModal();

    if (typeof window.applyFilters === 'function') window.applyFilters();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
};
