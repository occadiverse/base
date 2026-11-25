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
        : (window.activePlayers || []).filter(p => window.isPlayerInCurrentSquadPool(p));
    const disciplineStatus = isMatchClick && typeof window.getDisciplineStatusForTeam === 'function'
        ? window.getDisciplineStatusForTeam(
            ev.matchGroup,
            ev.date,
            typeof window.getActivitySeasonYear === 'function' ? window.getActivitySeasonYear(ev) : null
        )
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
    setCalendarYearMenuOpen(false);
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

function getCalendarYearRange(viewedYear) {
    const nowYear = new Date().getFullYear();
    let minYear = Math.min(nowYear - 5, viewedYear);
    let maxYear = Math.max(nowYear + 3, viewedYear);

    const consider = (value) => {
        const year = Number(String(value || '').slice(0, 4));
        if (Number.isInteger(year) && year >= 1990 && year <= 2100) {
            minYear = Math.min(minYear, year);
            maxYear = Math.max(maxYear, year);
        }
    };

    (window.activeEvents || []).forEach((event) => consider(event.date));
    (window.activeMatches || []).forEach((match) => consider(match.date));

    if (maxYear - minYear > 16) {
        minYear = Math.min(nowYear, viewedYear) - 8;
        maxYear = Math.max(nowYear, viewedYear) + 4;
    }

    return { minYear, maxYear };
}

function renderCalendarYearOptions(viewedYear) {
    const panel = document.querySelector('[data-calendar-year-panel]');
    if (!panel) return;

    const { minYear, maxYear } = getCalendarYearRange(viewedYear);
    let html = '';
    for (let year = minYear; year <= maxYear; year += 1) {
        const isActive = year === viewedYear;
        html += `<button type="button" class="calendar-year-option${isActive ? ' is-active' : ''}" role="option" aria-selected="${isActive ? 'true' : 'false'}" data-calendar-year-option="${year}">${year}</button>`;
    }
    panel.innerHTML = html;
}

function setCalendarYearMenuOpen(open) {
    const menu = document.querySelector('[data-calendar-year-menu]');
    if (!menu) return;

    const trigger = menu.querySelector('[data-calendar-year-toggle]');
    const panel = menu.querySelector('[data-calendar-year-panel]');
    const shouldOpen = Boolean(open);

    menu.classList.toggle('is-open', shouldOpen);
    if (trigger) trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (panel) panel.hidden = !shouldOpen;

    if (shouldOpen && panel) {
        const activeOption = panel.querySelector('.calendar-year-option.is-active');
        if (activeOption && typeof activeOption.scrollIntoView === 'function') {
            activeOption.scrollIntoView({ block: 'nearest' });
        }
    }
}

function bindCalendarYearMenuEvents() {
    if (window._calendarYearMenuBound) return;
    window._calendarYearMenuBound = true;

    document.addEventListener('click', (event) => {
        const menu = document.querySelector('[data-calendar-year-menu]');
        if (!menu) return;

        const toggleBtn = event.target.closest('[data-calendar-year-toggle]');
        if (toggleBtn && menu.contains(toggleBtn)) {
            event.preventDefault();
            setCalendarYearMenuOpen(!menu.classList.contains('is-open'));
            return;
        }

        const optionBtn = event.target.closest('[data-calendar-year-option]');
        if (optionBtn && menu.contains(optionBtn)) {
            event.preventDefault();
            const year = Number(optionBtn.dataset.calendarYearOption);
            if (year) window.goToCalendarYear(year);
            return;
        }

        if (!event.target.closest('[data-calendar-year-menu]')) {
            setCalendarYearMenuOpen(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setCalendarYearMenuOpen(false);
    });
}

function updateCalendarHeading(date) {
    if (!date) return;
    const headingMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const viewedYear = headingMonthDate.getFullYear();
    window.visibleCalendarMonthDate = headingMonthDate;
    if (document.getElementById('calendar-month-year')) {
        document.getElementById('calendar-month-year').innerText = calendarMonthNames[headingMonthDate.getMonth()];
    }
    const yearLabel = document.querySelector('[data-calendar-year-label]');
    if (yearLabel) yearLabel.textContent = String(viewedYear);
    const yearTrigger = document.querySelector('[data-calendar-year-toggle]');
    if (yearTrigger) yearTrigger.setAttribute('aria-label', `Velg år, valgt ${viewedYear}`);
    renderCalendarYearOptions(viewedYear);
}

window.goToCalendarYear = function(year) {
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear)) return;

    const current = window.visibleCalendarMonthDate || window.currentCalendarDate || new Date();
    const targetMonth = new Date(parsedYear, current.getMonth(), 1);
    window.currentCalendarDate = targetMonth;
    window.visibleCalendarMonthDate = targetMonth;
    window.selectedCalendarDateStr = formatCalendarDate(targetMonth);
    setCalendarYearMenuOpen(false);
    window.renderCalendar();
};

window.goToToday = function() {
    const today = new Date();
    window.currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    window.visibleCalendarMonthDate = window.currentCalendarDate;
    window.selectedCalendarDateStr = formatCalendarDate(today);
    setCalendarYearMenuOpen(false);
    window.renderCalendar();
};

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    bindCalendarYearMenuEvents();

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
            const planItems = (window.yearPlanEvents || []).filter(item => item.date === dateStr && !yearPlanLinkedMatch(item));
            const items = [
                ...matches.map(m => ({
                    type: 'match',
                    label: m.opponent || 'Kamp'
                })),
                ...events.map(e => ({
                    type: e.type === 'Trening' ? 'training' : 'other',
                    label: e.title || e.type || 'Aktivitet'
                })),
                ...planItems.map(item => ({
                    type: yearPlanStoredType(item) === YEAR_PLAN_TRAINING_TYPE ? 'training' : 'plan',
                    label: item.title || 'Årsplan'
                }))
            ];

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = [
                'calendar-day-cell',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                isOutsideActiveMonth ? 'is-outside-month' : ''
            ].filter(Boolean).join(' ');
            cell.dataset.calendarDate = dateStr;
            if (dayOffset === 0) cell.dataset.calendarWeekStart = formatCalendarDate(weekStart);
            cell.setAttribute('aria-label', dayDate.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
            if (isSelected) cell.setAttribute('aria-current', 'date');
            cell.onclick = () => window.selectCalendarDate(dateStr);

            const visibleItems = items.slice(0, 2).map(item => `
                <span class="calendar-day-event">
                    <span class="calendar-day-event-dot is-${item.type}" aria-hidden="true"></span>
                    <span class="calendar-day-event-label">${escapeCalendarHtml(item.label)}</span>
                </span>
            `).join('');

            const moreHtml = items.length > 2
                ? `<span class="calendar-day-more">+${items.length - 2}</span>`
                : '';

            cell.innerHTML = `
                <div class="calendar-day-layout">
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">
                        ${visibleItems || `<span class="calendar-day-empty-space" aria-hidden="true"></span>`}
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
    const dayPlan = (window.yearPlanEvents || [])
        .map(item => typeof window.normalizeYearPlanItem === 'function' ? window.normalizeYearPlanItem(item) : item)
        .filter(item => item && item.date === dateStr && !yearPlanLinkedMatch(item));
    const selectedDate = parseCalendarDate(dateStr);
    const selectedDateLabel = selectedDate.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });

    if (document.getElementById('selected-calendar-date')) {
        document.getElementById('selected-calendar-date').innerText = selectedDateLabel;
    }

    listContainer.innerHTML = '';

    if (dayMatches.length === 0 && dayEvents.length === 0 && dayPlan.length === 0) {
        listContainer.innerHTML = `
            <div class="calendar-empty-state">
                <div class="calendar-empty-icon" aria-hidden="true">
                    <i class="fa-solid fa-calendar-xmark"></i>
                </div>
                <p class="calendar-empty-title">Ingen aktiviteter</p>
                <p class="calendar-empty-text">Ledig dag</p>
            </div>`;
        if (typeof window.renderYearPlan === 'function') window.renderYearPlan();
        return;
    }

    const getCalendarAttendanceSuffix = (record) => {
        const dateStr = record?.date;
        if (!dateStr) return 'påmeldt';
        const day = parseCalendarDate(dateStr);
        if (Number.isNaN(day.getTime())) return 'påmeldt';
        const now = new Date();
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (dayOnly > todayOnly) return 'påmeldt';
        if (dayOnly < todayOnly) return 'møtt opp';
        const timeMatch = /^(\d{1,2}):(\d{2})/.exec(String(record?.time || '').trim());
        if (!timeMatch) return 'påmeldt';
        const start = new Date(day);
        start.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
        return start.getTime() > now.getTime() ? 'påmeldt' : 'møtt opp';
    };

    const renderDailyMatch = (m) => {
        const attendanceMeta = typeof window.formatAttendancePresenceLabel === 'function'
            ? window.formatAttendancePresenceLabel(m, {
                suffix: getCalendarAttendanceSuffix(m),
                includeSquadSize: false
            })
            : '';
        const matchId = escapeAttendanceHtml(m.id);
        const opponent = m.opponent || 'Motstander ikke satt';
        const venue = typeof window.getMatchVenue === 'function'
            ? window.getMatchVenue(m)
            : (m.venue || 'Hjemme');
        const resultValue = m.result && typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(m)
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
                        <span class="calendar-match-mark">${opponentMarkHtml}</span>
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
            ? window.formatAttendancePresenceLabel(e, {
                suffix: getCalendarAttendanceSuffix(e),
                includeSquadSize: false
            })
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
                                <h4 class="calendar-detail-title calendar-daily-title">${escapeCalendarHtml(displayTitle)}</h4>
                                <span class="calendar-detail-time-dot" aria-hidden="true"></span>
                                <span class="calendar-daily-time calendar-event-time">${escapeCalendarHtml(e.time || 'TBA')}</span>
                            </div>
                            <div class="calendar-daily-meta-row calendar-detail-meta-row">
                                <span><i class="fa-solid fa-location-dot"></i>${escapeCalendarHtml(e.location || 'Ikke oppgitt')}</span>
                                ${attendanceMeta ? `<span><i class="fa-solid fa-user-check"></i>${escapeCalendarHtml(attendanceMeta)}</span>` : ''}
                                ${e.type === 'Trening' && typeof window.getTrainingObligationLabel === 'function' && window.getTrainingObligationLabel(e)
                                    ? `<span>${escapeCalendarHtml(window.getTrainingObligationLabel(e))}</span>`
                                    : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    const renderDailyPlan = (item) => {
        const isTraining = yearPlanStoredType(item) === YEAR_PLAN_TRAINING_TYPE;
        const timeHtml = item.time
            ? `<span class="calendar-detail-time-dot" aria-hidden="true"></span><span class="calendar-daily-time">${escapeCalendarHtml(item.time)}</span>`
            : '';
        const notesHtml = item.notes
            ? `<p class="calendar-plan-notes">${escapeCalendarHtml(item.notes)}</p>`
            : '';
        const icon = isTraining ? 'fa-person-running' : 'fa-flag';
        return `
            <div class="calendar-detail-card calendar-plan-detail-card${isTraining ? ' is-training' : ''}">
                <i class="fa-solid ${icon} calendar-detail-watermark" aria-hidden="true"></i>
                <div class="calendar-daily-card-content calendar-plan-card-content relative z-10">
                    <div class="calendar-daily-icon-slot">
                        <div class="calendar-detail-icon">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                    </div>
                    <div class="calendar-daily-main">
                        <div class="calendar-daily-title-block">
                            <div class="calendar-daily-title-line">
                                <h4 class="calendar-detail-title calendar-daily-title">${escapeCalendarHtml(item.title)}</h4>
                                ${timeHtml}
                            </div>
                            ${notesHtml}
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
        ...dayEvents.map(event => ({ type: 'event', data: event })),
        ...dayPlan.map(item => ({ type: 'plan', data: item }))
    ]
        .sort((a, b) => getSortTime(a) - getSortTime(b))
        .map(item => {
            if (item.type === 'match') return renderDailyMatch(item.data);
            if (item.type === 'plan') return renderDailyPlan(item.data);
            return renderDailyEvent(item.data);
        })
        .join('');
    if (typeof window.renderYearPlan === 'function') window.renderYearPlan();
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
    window.fillActivitySeasonOptions();
    document.getElementById('activityTitle').value = '';
    document.getElementById('activityLocation').value = '';
    const venueSelect = document.getElementById('activityVenue');
    if (venueSelect) venueSelect.value = 'Hjemme';
    const matchTypeSelect = document.getElementById('activityMatchType');
    if (matchTypeSelect) matchTypeSelect.value = 'Treningskamp';

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
    window.fillActivitySeasonOptions(
        ev.seasonYear != null && ev.seasonYear !== ''
            ? ev.seasonYear
            : (typeof window.getExplicitActivitySeasonYear === 'function'
                ? window.getExplicitActivitySeasonYear(ev)
                : null)
    );
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

window.fillActivitySeasonOptions = function(selectedYear) {
    const select = document.getElementById('activitySeasonYear');
    if (!select) return;
    const active = typeof window.getActiveSeasonYear === 'function'
        ? window.getActiveSeasonYear()
        : new Date().getFullYear();
    const selected = typeof window.resolvePlayerSeasonYear === 'function'
        ? window.resolvePlayerSeasonYear(selectedYear)
        : null;
    const years = [active, active + 1];
    if (selected != null && !years.includes(selected)) years.push(selected);
    years.sort((a, b) => a - b);
    select.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join('');
    select.value = String(selected != null ? selected : active);
};

window.updateActivityTitlePlaceholder = function() {
    const type = document.getElementById('activityType')?.value || '';
    const titleInput = document.getElementById('activityTitle');
    const titleLabel = document.getElementById('activityTitleLabel');
    const venueWrap = document.getElementById('activityVenueWrap');
    const matchTypeWrap = document.getElementById('activityMatchTypeWrap');
    const seasonWrap = document.getElementById('activitySeasonWrap');
    const isMatch = type === 'Kamp';
    const isTraining = type === 'Trening';

    if (titleLabel) titleLabel.innerText = isMatch ? 'Motstander' : 'Tittel';
    if (titleInput) {
        titleInput.placeholder = isMatch
            ? 'F.eks. KFUM, Lyn, Skeid...'
            : 'F.eks. Taktisk trening, Lagfest...';
        titleInput.required = isMatch;
    }
    if (venueWrap) venueWrap.classList.toggle('hidden', !isMatch);
    if (matchTypeWrap) matchTypeWrap.classList.toggle('hidden', !isMatch);
    if (seasonWrap) seasonWrap.classList.toggle('hidden', !isTraining);
    if (isTraining) {
        const select = document.getElementById('activitySeasonYear');
        if (select && !select.value) window.fillActivitySeasonOptions();
    }
};

function getActivityFormDateYear(date) {
    if (typeof window.getMatchStatsYear === 'function') {
        const year = window.getMatchStatsYear({ date });
        if (year) return year;
    }
    const prefix = Number(String(date || '').slice(0, 4));
    return Number.isInteger(prefix) && prefix >= 1990 && prefix <= 2100 ? prefix : null;
}

function formatActivityFormDate(date) {
    const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : String(date || '');
}

function readActivityFormSeasonYear() {
    return typeof window.resolvePlayerSeasonYear === 'function'
        ? window.resolvePlayerSeasonYear(document.getElementById('activitySeasonYear')?.value)
        : null;
}

function setActivityFormSeasonYear(year) {
    const select = document.getElementById('activitySeasonYear');
    if (!select) return;
    const value = String(year);
    if (![...select.options].some((option) => option.value === value)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
    select.value = value;
}

window.saveNewActivity = async function(options = {}) {
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
    if (type === 'Trening' && options.seasonYearConfirmed !== true) {
        const dateYear = getActivityFormDateYear(date);
        const seasonYear = readActivityFormSeasonYear();
        if (dateYear != null && seasonYear != null && dateYear !== seasonYear) {
            const message = [
                `Treningsdato: ${formatActivityFormDate(date)}`,
                `Fotballsesong: ${seasonYear}`,
                '',
                'Dato og fotballsesong kan være forskjellige, for eksempel ved oppkjøring før nyttår. Kontroller at dette er tilsiktet.'
            ].join('\n');
            window.customConfirm(
                'Dato og sesong er forskjellige',
                message,
                async () => {
                    setActivityFormSeasonYear(dateYear);
                    await window.saveNewActivity({ seasonYearConfirmed: true });
                },
                {
                    confirmLabel: `Endre til ${dateYear}`,
                    alternateLabel: `Behold ${seasonYear}`,
                    alternateCallback: async () => {
                        await window.saveNewActivity({ seasonYearConfirmed: true });
                    },
                    preformatted: true
                }
            );
            return;
        }
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
            const venue = document.getElementById('activityVenue')?.value?.trim()
                || existingMatch?.venue
                || 'Hjemme';
            const selectedMatchType = document.getElementById('activityMatchType')?.value;
            const matchType = selectedMatchType === 'Serie' || selectedMatchType === 'Cup' || selectedMatchType === 'Treningskamp'
                ? selectedMatchType
                : 'Treningskamp';
            const matchData = {
                ...(existingMatch || {}),
                id: editId || Date.now().toString(),
                date,
                time,
                opponent: title,
                pitch: location || 'Ikke satt',
                matchType,
                matchGroup: selectedTeam,
                venue,
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
            if (type === 'Trening') {
                const selectedSeason = typeof window.resolvePlayerSeasonYear === 'function'
                    ? window.resolvePlayerSeasonYear(document.getElementById('activitySeasonYear')?.value)
                    : null;
                activityData.seasonYear = selectedSeason != null
                    ? selectedSeason
                    : (typeof window.getActiveSeasonYear === 'function' ? window.getActiveSeasonYear() : null);
            } else {
                delete activityData.seasonYear;
            }

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

const yearPlanMonthShort = ['jan', 'feb', 'mars', 'apr', 'mai', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'des'];
const yearPlanOpenIds = new Set();
const yearPlanCollapsedYears = new Set();
let yearPlanEditor = null;

window.yearPlanEvents = window.yearPlanEvents || [];

window.normalizeYearPlanItem = function(item) {
    if (!item || typeof item !== 'object') return null;
    const date = String(item.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const title = String(item.title || '').trim();
    if (!title) return null;
    const time = String(item.time || '').trim();
    const matchId = String(item.matchId || '').trim();
    const storedType = yearPlanStoredType(item);
    return {
        id: String(item.id || ''),
        date,
        time: /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '',
        title,
        notes: String(item.notes || '').trim(),
        ...(storedType ? { matchType: storedType } : {}),
        ...(matchId ? { matchId } : {})
    };
};

const YEAR_PLAN_TRAINING_TYPE = 'Trening';
const YEAR_PLAN_MATCH_TYPES = [
    { value: 'Treningskamp', label: 'Treningskamp', phrase: 'treningskamp' },
    { value: 'Cup', label: 'Cupkamp', phrase: 'cupkamp' },
    { value: 'Serie', label: 'Seriekamp', phrase: 'seriekamp' }
];

function yearPlanMatchType(item) {
    const value = String(item?.matchType || '');
    return YEAR_PLAN_MATCH_TYPES.some(type => type.value === value) ? value : '';
}

function yearPlanStoredType(item) {
    const value = String(item?.matchType || '');
    if (value === YEAR_PLAN_TRAINING_TYPE) return YEAR_PLAN_TRAINING_TYPE;
    return yearPlanMatchType(item);
}

function yearPlanKind(item) {
    const stored = yearPlanStoredType(item);
    if (stored === YEAR_PLAN_TRAINING_TYPE) return { value: stored, label: 'Trening' };
    return yearPlanMatchTypeMeta(stored);
}

function yearPlanMatchTypeMeta(value) {
    return YEAR_PLAN_MATCH_TYPES.find(type => type.value === value) || null;
}

function yearPlanItemIsMatch(item) {
    return Boolean(yearPlanMatchType(item));
}

function yearPlanOpponentName(title) {
    const stripped = String(title || '')
        .replace(/^(treningskamp|seriekamp|cupkamp)\b[\s:\-–—]*/i, '')
        .replace(/^(serie|cup)\b[\s:\-–—]+/i, '')
        .replace(/^mot\s+/i, '')
        .trim();
    return stripped || String(title || '').trim();
}

function yearPlanLinkedMatch(item) {
    if (!item?.matchId) return null;
    return (window.activeMatches || []).find(match => match.id === item.matchId) || null;
}

function showYearPlanDate(dateStr) {
    if (!dateStr) return;
    window.selectCalendarDate(dateStr);
    const cell = document.querySelector(`[data-calendar-date="${dateStr}"]`);
    const scroller = document.querySelector('.calendar-mobile-main');
    if (cell && scroller && scroller.scrollHeight > scroller.clientHeight + 8) {
        const delta = cell.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollTop += delta - 16;
        return;
    }
    cell?.scrollIntoView({ block: 'center' });
}

function yearPlanViewYear() {
    const source = window.visibleCalendarMonthDate || window.currentCalendarDate || new Date();
    return source.getFullYear();
}

function formatYearPlanDate(dateStr) {
    const date = parseCalendarDate(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `${date.getDate()}. ${yearPlanMonthShort[date.getMonth()]}`;
}

function bindYearPlanEvents() {
    const root = document.getElementById('calendar-year-plan');
    if (!root || root.dataset.yearPlanBound === 'true') return;
    root.dataset.yearPlanBound = 'true';
    root.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-year-plan-action]');
        if (!actionEl || !root.contains(actionEl)) return;
        const action = actionEl.dataset.yearPlanAction;
        const id = actionEl.dataset.yearPlanId || '';
        if (action === 'add') {
            const targetYear = Number(actionEl.dataset.yearPlanYear) || yearPlanViewYear();
            yearPlanCollapsedYears.delete(targetYear);
            yearPlanEditor = { id: '', year: targetYear };
            window.renderYearPlan();
            document.getElementById('calendar-year-plan-form')?.scrollIntoView({ block: 'nearest' });
            return;
        }
        if (action === 'cancel') {
            yearPlanEditor = null;
            window.renderYearPlan();
            return;
        }
        if (action === 'toggle') {
            const item = yearPlanItems().find(entry => entry.id === id);
            if (item && item.date !== window.selectedCalendarDateStr) {
                showYearPlanDate(item.date);
                return;
            }
            if (yearPlanOpenIds.has(id)) yearPlanOpenIds.delete(id);
            else yearPlanOpenIds.add(id);
            window.renderYearPlan();
            return;
        }
        if (action === 'edit') {
            const item = yearPlanItems().find(entry => entry.id === id);
            if (item) yearPlanCollapsedYears.delete(Number(item.date.slice(0, 4)));
            yearPlanEditor = { id };
            yearPlanOpenIds.add(id);
            window.renderYearPlan();
            return;
        }
        if (action === 'delete') {
            const item = (window.yearPlanEvents || []).find(entry => entry.id === id);
            const name = item?.title || 'hendelsen';
            if (!window.confirm(`Slette «${name}» fra årsplanen?`)) return;
            window.deleteYearPlanItem(id);
            return;
        }
        if (action === 'add-match') {
            window.addYearPlanItemToMatches(id);
            return;
        }
        if (action === 'open-match') {
            const item = yearPlanItems().find(entry => entry.id === id);
            const match = yearPlanLinkedMatch(item);
            if (match && typeof window.goToMatchDetails === 'function') window.goToMatchDetails(match.id);
            return;
        }
        if (action === 'toggle-year') {
            const targetYear = Number(actionEl.dataset.yearPlanYear);
            if (yearPlanCollapsedYears.has(targetYear)) yearPlanCollapsedYears.delete(targetYear);
            else yearPlanCollapsedYears.add(targetYear);
            window.renderYearPlan();
            return;
        }
        if (action === 'save') {
            event.preventDefault();
            window.saveYearPlanFromForm();
        }
    });
    root.addEventListener('submit', (event) => {
        if (!event.target.closest('#calendar-year-plan-form')) return;
        event.preventDefault();
        window.saveYearPlanFromForm();
    });
}

function renderYearPlanForm() {
    const form = document.getElementById('calendar-year-plan-form');
    if (!form) return;
    if (!yearPlanEditor) {
        form.hidden = true;
        form.innerHTML = '';
        delete form.dataset.editorId;
        return;
    }
    const editorKey = yearPlanEditor.id || `new-${yearPlanEditor.year || yearPlanViewYear()}`;
    if (form.dataset.editorId === editorKey && form.querySelector('form')) return;
    form.dataset.editorId = editorKey;
    const existing = (window.yearPlanEvents || []).find(item => item.id === yearPlanEditor.id);
    const selectedDate = window.selectedCalendarDateStr || formatCalendarDate(new Date());
    const editorYear = Number(yearPlanEditor.year) || yearPlanViewYear();
    const date = existing?.date || (
        editorYear === yearPlanViewYear()
            ? selectedDate
            : yearPlanDateInYear(selectedDate, editorYear)
    );
    const time = existing?.time || '';
    const title = existing?.title || '';
    const notes = existing?.notes || '';
    const storedType = yearPlanStoredType(existing);
    const heading = existing ? 'Endre hendelse' : 'Ny hendelse';
    const eventOptions = `
        <option value=""${!storedType ? ' selected' : ''}>Hendelse</option>
        <option value="${YEAR_PLAN_TRAINING_TYPE}"${storedType === YEAR_PLAN_TRAINING_TYPE ? ' selected' : ''}>Trening</option>
    `;
    const matchOptions = YEAR_PLAN_MATCH_TYPES.map(type => `
        <option value="${escapeCalendarHtml(type.value)}"${type.value === storedType ? ' selected' : ''}>${escapeCalendarHtml(type.label)}</option>
    `).join('');
    form.hidden = false;
    form.innerHTML = `
        <form class="calendar-year-plan-editor">
            <p class="calendar-year-plan-editor-title">${heading}</p>
            <div class="calendar-year-plan-editor-grid">
                <label class="calendar-year-plan-field">
                    <span>Dato</span>
                    <input type="date" name="date" required value="${escapeCalendarHtml(date)}">
                </label>
                <label class="calendar-year-plan-field">
                    <span>Tid</span>
                    <input type="time" name="time" value="${escapeCalendarHtml(time)}">
                </label>
            </div>
            <label class="calendar-year-plan-field">
                <span>Type</span>
                <select name="matchType">
                    <optgroup label="Ikke kamp">${eventOptions}</optgroup>
                    <optgroup label="Kamp">${matchOptions}</optgroup>
                </select>
            </label>
            <p class="calendar-year-plan-type-hint">Hendelse er kickoff, sosialt og annet. Trening blir en treningsøkt i kalenderen og tas ut av årsplanen. Legg i kamper vises bare når typen er treningskamp, cupkamp eller seriekamp.</p>
            <label class="calendar-year-plan-field">
                <span>Emne</span>
                <input type="text" name="title" required maxlength="80" value="${escapeCalendarHtml(title)}" placeholder="Kickoff, seriestart, Grüner, Skeid...">
            </label>
            <label class="calendar-year-plan-field">
                <span>Notater</span>
                <textarea name="notes" rows="3" maxlength="600" placeholder="Praktisk info, sted, hvem som møter...">${escapeCalendarHtml(notes)}</textarea>
            </label>
            <div class="calendar-year-plan-editor-actions">
                <button type="submit" class="bsk-btn bsk-btn-primary" data-year-plan-action="save">Lagre</button>
                <button type="button" class="bsk-btn bsk-btn-secondary" data-year-plan-action="cancel">Avbryt</button>
            </div>
        </form>
    `;
}

function yearPlanDateInYear(dateStr, year) {
    const parsed = parseCalendarDate(dateStr);
    const month = Number.isNaN(parsed.getTime()) ? 0 : parsed.getMonth();
    const day = Number.isNaN(parsed.getTime()) ? 1 : parsed.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return formatCalendarDate(new Date(year, month, Math.min(day, lastDay)));
}

function yearPlanDateParts(dateStr) {
    const date = parseCalendarDate(dateStr);
    if (Number.isNaN(date.getTime())) return { day: '--', month: '---', weekday: '' };
    return {
        day: date.toLocaleDateString('no-NO', { day: '2-digit' }).replace('.', ''),
        month: date.toLocaleDateString('no-NO', { month: 'short' }).replace('.', '').toUpperCase(),
        weekday: date.toLocaleDateString('no-NO', { weekday: 'short' }).replace('.', '')
    };
}

function yearPlanEditorYear() {
    if (!yearPlanEditor) return null;
    if (yearPlanEditor.id) {
        const item = yearPlanItems().find(entry => entry.id === yearPlanEditor.id);
        return item ? Number(item.date.slice(0, 4)) : null;
    }
    return Number(yearPlanEditor.year) || yearPlanViewYear();
}

function yearPlanItems() {
    return (window.yearPlanEvents || [])
        .map(item => window.normalizeYearPlanItem(item))
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'nb'));
}

function renderYearPlanMonths(items) {
    const groups = new Map();
    items.forEach(item => {
        const month = Number(item.date.slice(5, 7)) - 1;
        if (!groups.has(month)) groups.set(month, []);
        groups.get(month).push(item);
    });

    return [...groups.entries()].map(([month, rows]) => `
        <section class="calendar-year-plan-month">
            <h4>${calendarMonthNames[month]}</h4>
            ${rows.map(item => {
                const open = yearPlanOpenIds.has(item.id);
                const selected = item.date === window.selectedCalendarDateStr;
                const parts = yearPlanDateParts(item.date);
                const kind = yearPlanKind(item);
                const notes = item.notes
                    ? `<p>${escapeCalendarHtml(item.notes)}</p>`
                    : `<p class="is-empty">Ingen notater.</p>`;
                const linkedMatch = yearPlanItemIsMatch(item) ? yearPlanLinkedMatch(item) : null;
                const matchAction = !yearPlanItemIsMatch(item)
                    ? ''
                    : linkedMatch
                        ? `<button type="button" data-year-plan-action="open-match" data-year-plan-id="${escapeCalendarHtml(item.id)}">Åpne kamp</button>`
                        : `<button type="button" data-year-plan-action="add-match" data-year-plan-id="${escapeCalendarHtml(item.id)}">Legg i kamper</button>`;
                return `
                    <article class="calendar-year-plan-item${selected ? ' is-selected' : ''}${open ? ' is-open' : ''}">
                        <button type="button" class="calendar-year-plan-row" data-year-plan-action="toggle" data-year-plan-id="${escapeCalendarHtml(item.id)}" aria-expanded="${open ? 'true' : 'false'}">
                            <span class="calendar-year-plan-date" aria-hidden="true">
                                <span class="calendar-year-plan-date-day">${escapeCalendarHtml(parts.day)}</span>
                                <span class="calendar-year-plan-date-month">${escapeCalendarHtml(parts.month)}</span>
                            </span>
                            <span class="calendar-year-plan-main">
                                <span class="calendar-year-plan-weekday">${escapeCalendarHtml(parts.weekday)}${kind ? ` · ${escapeCalendarHtml(kind.label)}` : ''}</span>
                                <span class="calendar-year-plan-subject">${escapeCalendarHtml(item.title)}</span>
                            </span>
                            <span class="calendar-year-plan-time">${escapeCalendarHtml(item.time || '–')}</span>
                            <span class="calendar-year-plan-chevron" aria-hidden="true">
                                <i class="fa-solid fa-chevron-down"></i>
                            </span>
                        </button>
                        <div class="calendar-year-plan-notes"${open ? '' : ' hidden'}>
                            ${notes}
                            <div class="calendar-year-plan-note-actions">
                                ${matchAction}
                                <button type="button" data-year-plan-action="edit" data-year-plan-id="${escapeCalendarHtml(item.id)}">Rediger</button>
                                <button type="button" data-year-plan-action="delete" data-year-plan-id="${escapeCalendarHtml(item.id)}">Slett</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('')}
        </section>
    `).join('');
}

function renderYearPlanSection(itemYear, rows) {
    const collapsed = yearPlanCollapsedYears.has(itemYear);
    const body = rows.length
        ? renderYearPlanMonths(rows)
        : `<p class="calendar-year-plan-empty">Ingen hendelser i ${itemYear} ennå.</p>`;
    return `
        <section class="calendar-year-plan-year-group${collapsed ? ' is-collapsed' : ''}">
            <div class="calendar-year-plan-head">
                <button type="button" class="match-bench-heading calendar-section-heading" data-year-plan-action="toggle-year" data-year-plan-year="${itemYear}" aria-expanded="${collapsed ? 'false' : 'true'}" aria-label="${collapsed ? 'Vis' : 'Skjul'} årsplan ${itemYear}">
                    <span class="match-game-card-icon calendar-section-mark" aria-hidden="true">
                        <i class="fa-solid fa-flag"></i>
                    </span>
                    <span class="match-bench-heading-copy">
                        <span class="calendar-year-plan-year-title">Årsplan ${itemYear}</span>
                    </span>
                    <i class="fa-solid fa-chevron-down calendar-year-plan-year-chevron" aria-hidden="true"></i>
                </button>
                <button type="button" class="bsk-btn bsk-btn-chip calendar-year-plan-add" data-year-plan-action="add" data-year-plan-year="${itemYear}">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    <span>Legg til</span>
                </button>
            </div>
            <div class="calendar-year-plan-year-content">
                <div class="calendar-year-plan-form-slot" data-year-plan-form-slot="${itemYear}"></div>
                ${body}
            </div>
        </section>
    `;
}

window.renderYearPlan = function() {
    const list = document.getElementById('calendar-year-plan-list');
    const root = document.getElementById('calendar-year-plan');
    const form = document.getElementById('calendar-year-plan-form');
    if (!list || !root) return;
    if (form && form.parentElement !== root) root.insertBefore(form, list);
    bindYearPlanEvents();

    const year = yearPlanViewYear();
    const byYear = new Map();
    yearPlanItems().forEach(item => {
        const itemYear = Number(item.date.slice(0, 4));
        if (!byYear.has(itemYear)) byYear.set(itemYear, []);
        byYear.get(itemYear).push(item);
    });

    const years = new Set([year, ...byYear.keys()]);
    list.innerHTML = [...years]
        .sort((a, b) => a - b)
        .map(itemYear => renderYearPlanSection(itemYear, byYear.get(itemYear) || []))
        .join('');
    const editorYear = yearPlanEditorYear();
    if (form && editorYear) {
        const slot = list.querySelector(`[data-year-plan-form-slot="${editorYear}"]`);
        if (slot) slot.appendChild(form);
    }
    renderYearPlanForm();
};

window.saveYearPlanFromForm = async function() {
    const form = document.querySelector('#calendar-year-plan-form form');
    if (!form || !form.reportValidity()) return;
    const data = new FormData(form);
    const existing = yearPlanEditor?.id
        ? (window.yearPlanEvents || []).find(entry => entry.id === yearPlanEditor.id)
        : null;
    const item = window.normalizeYearPlanItem({
        id: yearPlanEditor?.id || '',
        date: data.get('date'),
        time: data.get('time'),
        title: data.get('title'),
        notes: data.get('notes'),
        matchType: data.get('matchType'),
        matchId: existing?.matchId || ''
    });
    if (!item) {
        alert('Hendelsen trenger en dato og et emne.');
        return;
    }
    if (yearPlanStoredType(item) === YEAR_PLAN_TRAINING_TYPE) {
        const moved = await window.addYearPlanItemToTraining(item);
        if (!moved) return;
        yearPlanEditor = null;
        window.renderYearPlan();
        return;
    }
    try {
        const saved = typeof window.saveYearPlanItem === 'function'
            ? await window.saveYearPlanItem(item)
            : item;
        if (saved?.id) yearPlanOpenIds.add(saved.id);
        yearPlanEditor = null;
        window.renderYearPlan();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke lagre hendelsen.');
    }
};

function yearPlanExistingTraining(item) {
    const title = String(item?.title || '').trim().toLowerCase();
    return (window.activeEvents || []).find(event =>
        event.type === 'Trening'
        && event.date === item.date
        && String(event.title || '').trim().toLowerCase() === title
    ) || null;
}

window.addYearPlanItemToTraining = async function(item) {
    if (!item || yearPlanStoredType(item) !== YEAR_PLAN_TRAINING_TYPE) return false;
    if (typeof window.saveEventToDatabase !== 'function') {
        alert('Treningen kan ikke lagres akkurat nå.');
        return false;
    }
    const team = typeof window.getPrimaryTeamName === 'function' ? (window.getPrimaryTeamName() || '') : '';
    if (!team) {
        alert('Fant ikke lag. Opprett eller velg et lag først.');
        return false;
    }

    const when = `${formatYearPlanDate(item.date)} ${item.date.slice(0, 4)}`;
    const timeBit = item.time ? ` kl. ${item.time}` : '';
    const notesBit = item.notes ? '\n\nNotatet i årsplanen blir borte sammen med hendelsen.' : '';
    const confirmed = window.confirm(
        `Legge «${item.title}» inn som trening ${when}${timeBit}?\n\nHendelsen tas ut av årsplanen, så dagen bare viser treningen. Sted settes til ikke satt, og du kan endre treningen etterpå.${notesBit}`
    );
    if (!confirmed) return false;

    const existing = yearPlanExistingTraining(item);
    try {
        if (!existing) {
            const seasonYear = Number(item.date.slice(0, 4));
            await window.saveEventToDatabase({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                type: 'Trening',
                title: item.title,
                date: item.date,
                time: item.time || '',
                location: 'Ikke satt',
                team,
                seasonYear
            });
        }
        if (item.id && typeof window.deleteYearPlanItem === 'function') {
            await window.deleteYearPlanItem(item.id);
        }
        if (typeof window.selectCalendarDate === 'function') window.selectCalendarDate(item.date);
        return true;
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke legge treningen inn i kalenderen.');
        return false;
    }
};

window.addYearPlanItemToMatches = async function(id) {
    const item = yearPlanItems().find(entry => entry.id === id);
    if (!item || !yearPlanItemIsMatch(item)) return;
    if (yearPlanLinkedMatch(item)) {
        if (typeof window.goToMatchDetails === 'function') window.goToMatchDetails(item.matchId);
        return;
    }
    if (typeof window.saveMatchToDatabase !== 'function' || typeof window.saveYearPlanItem !== 'function') {
        alert('Kampen kan ikke lagres akkurat nå.');
        return;
    }

    const opponent = yearPlanOpponentName(item.title);
    const typeMeta = yearPlanMatchTypeMeta(item.matchType);
    const when = `${formatYearPlanDate(item.date)} ${item.date.slice(0, 4)}`;
    const timeBit = item.time ? ` kl. ${item.time}` : '';
    const confirmed = window.confirm(
        `Legge «${opponent}» inn som ${typeMeta?.phrase || 'kamp'} ${when}${timeBit}?\n\nHendelsen tas ut av årsplanen, så dagen bare viser kampen. Sted settes til ikke satt, og du kan endre kampen etterpå.`
    );
    if (!confirmed) return;

    const existing = (window.activeMatches || []).find(match =>
        match.date === item.date
        && match.matchType === item.matchType
        && String(match.opponent || '').trim().toLowerCase() === opponent.toLowerCase()
    );
    const matchId = existing?.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    try {
        if (!existing) {
            await window.saveMatchToDatabase({
                id: matchId,
                date: item.date,
                time: item.time || '',
                opponent,
                pitch: 'Ikke satt',
                matchType: item.matchType,
                matchGroup: typeof window.getPrimaryTeamName === 'function' ? (window.getPrimaryTeamName() || '') : '',
                venue: 'Hjemme',
                result: ''
            });
        }
        await window.deleteYearPlanItem(item.id);
        if (typeof window.renderCalendar === 'function') window.renderCalendar();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke legge kampen inn i kampoversikten.');
    }
};

window.deleteYearPlanItem = async function(id) {
    if (!id || typeof window.deleteYearPlanItemFromDatabase !== 'function') return;
    try {
        await window.deleteYearPlanItemFromDatabase(id);
        yearPlanOpenIds.delete(id);
        if (yearPlanEditor?.id === id) yearPlanEditor = null;
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke slette hendelsen.');
    }
};
