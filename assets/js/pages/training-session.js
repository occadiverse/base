function escapeTrainingHtml(value) {
    return typeof window.escapeModalHtml === 'function'
        ? window.escapeModalHtml(value)
        : String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
}

window._trainingSessionGroupCounts = window._trainingSessionGroupCounts || {};
window._trainingSessionGroups = window._trainingSessionGroups || {};

function setTrainingSessionFeedback(message, variant = '', autoClearMs = 0) {
    const el = document.querySelector('[data-training-attendance-save-state]');
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

function getTrainingEvent(eventId) {
    return (window.activeEvents || []).find(event => event.id === eventId) || null;
}

function isActivitySessionType(type) {
    return type === 'Trening' || type === 'Annet';
}

function getRegisteredPlayersForEvent(event) {
    const refs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    const categoryOrder = { K: 0, F: 1, M: 2, A: 3, Gjest: 4 };

    const getSortCategory = (player) => {
        if (player?.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player?.id))) {
            return 'Gjest';
        }
        if (typeof window.getPositionCategoryFromPos1 === 'function') {
            return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
        }
        return 'M';
    };

    return refs
        .map(ref => (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null))
        .filter(Boolean)
        .sort((a, b) => {
            const orderA = categoryOrder[getSortCategory(a)] ?? 3;
            const orderB = categoryOrder[getSortCategory(b)] ?? 3;
            if (orderA !== orderB) return orderA - orderB;
            return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
        });
}

function getPlayerPositionCategory(player) {
    if (typeof window.getPositionCategoryFromPos1 === 'function') {
        return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
    }
    return 'M';
}

function distributePlayersIntoGroups(players, groupCount) {
    const groups = Array.from({ length: groupCount }, () => []);
    const categoryTotals = groups.map(() => ({}));

    const sortedPlayers = [...players].sort((a, b) => {
        const catA = getPlayerPositionCategory(a);
        const catB = getPlayerPositionCategory(b);
        if (catA !== catB) return catA.localeCompare(catB);
        return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
    });

    sortedPlayers.forEach(player => {
        const category = getPlayerPositionCategory(player);
        let bestIndex = 0;
        let bestScore = Infinity;

        for (let i = 0; i < groupCount; i += 1) {
            const sizeScore = groups[i].length;
            const categoryScore = categoryTotals[i][category] || 0;
            const score = sizeScore * 100 + categoryScore;
            if (score < bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }

        groups[bestIndex].push(player);
        categoryTotals[bestIndex][category] = (categoryTotals[bestIndex][category] || 0) + 1;
    });

    return groups;
}

function buildRegisteredPlayersHtml(players) {
    if (!players.length) {
        return `
            <div class="training-session-empty">
                <i class="fa-solid fa-user-slash"></i>
                <p>Ingen spillere er registrert med oppmøte ennå.</p>
                <p class="training-session-empty-hint">Registrer oppmøte for å se hvem som møtte opp.</p>
            </div>
        `;
    }

    return `
        <div class="training-session-player-list">
            ${players.map(player => {
                const jersey = player.draktnummer ? `#${player.draktnummer}` : '';
                const pos = player.pos1 && player.pos1 !== '-' ? player.pos1 : '';
                return `
                    <div class="training-session-player-row">
                        <span class="training-session-player-name">${escapeTrainingHtml(player.navn)}</span>
                        <span class="training-session-player-meta">
                            ${jersey ? `<span>${escapeTrainingHtml(jersey)}</span>` : ''}
                            ${pos ? `<span>${escapeTrainingHtml(pos)}</span>` : ''}
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function buildGroupsHtml(eventId, players) {
    const groupCount = window._trainingSessionGroupCounts[eventId] || 3;
    const groups = window._trainingSessionGroups[eventId] || null;

    const groupOptions = [2, 3, 4, 5].map(count => `
        <option value="${count}" ${count === groupCount ? 'selected' : ''}>${count} grupper</option>
    `).join('');

    let groupsResultHtml = '';
    if (groups && groups.length) {
        groupsResultHtml = `
            <div class="training-session-groups-result">
                ${groups.map((groupPlayers, index) => `
                    <div class="training-session-group-card">
                        <div class="training-session-group-title">Gruppe ${index + 1} <span>${groupPlayers.length}</span></div>
                        <div class="training-session-group-players">
                            ${groupPlayers.length
                                ? groupPlayers.map(player => `<span>${escapeTrainingHtml(player.navn)}</span>`).join('')
                                : '<span class="training-session-group-empty">Ingen spillere</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (!players.length) {
        groupsResultHtml = `
            <div class="training-session-empty training-session-empty-compact">
                <p>Registrer oppmøte før du fordeler grupper.</p>
            </div>
        `;
    }

    return `
        <div class="training-session-groups-controls">
            <label class="training-session-label" for="trainingGroupCountSelect">Antall grupper</label>
            <select id="trainingGroupCountSelect" class="training-session-select" data-training-action="set-group-count">
                ${groupOptions}
            </select>
            <button type="button" data-training-action="distribute-groups" class="match-bench-action-btn dashboard-session-action-btn" ${players.length ? '' : 'disabled'}>
                <i class="fa-solid fa-shuffle"></i>
                <span>Fordel spillere</span>
            </button>
        </div>
        ${groupsResultHtml}
    `;
}

function bindTrainingSessionEvents() {
    const container = document.getElementById('oktside-content');
    if (!container || container.dataset.trainingEventsBound === 'true') return;

    container.dataset.trainingEventsBound = 'true';

    container.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-training-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.trainingAction;
        const eventId = window._activeTrainingSessionId;

        if (action === 'back') {
            if (typeof window.goBackToPreviousPortalPage === 'function') {
                window.goBackToPreviousPortalPage();
            } else {
                switchTab('hjem', { skipHistory: true });
            }
            return;
        }

        if (action === 'attendance') {
            if (eventId) window.openAttendanceModal(eventId);
            return;
        }

        if (action === 'injury') {
            if (typeof window.showSessionInjuryModal === 'function') {
                window.showSessionInjuryModal();
            }
            return;
        }

        if (action === 'toggle-attendance') {
            const panel = actionEl.closest('.match-collapsible-panel');
            if (!panel) return;

            const shouldOpen = panel.classList.contains('is-collapsed');
            panel.classList.toggle('is-collapsed', !shouldOpen);
            window._trainingSessionAttendanceOpen = shouldOpen;
            actionEl.setAttribute('aria-expanded', String(shouldOpen));
            actionEl.setAttribute(
                'aria-label',
                shouldOpen
                    ? (actionEl.dataset.hideLabel || 'Skjul oppmøte')
                    : (actionEl.dataset.showLabel || 'Vis oppmøte')
            );
            return;
        }

        if (action === 'distribute-groups') {
            if (!eventId) return;
            const trainingEvent = getTrainingEvent(eventId);
            if (!trainingEvent || trainingEvent.type !== 'Trening') return;

            const players = getRegisteredPlayersForEvent(trainingEvent);
            const groupCount = window._trainingSessionGroupCounts[eventId] || 3;
            window._trainingSessionGroups[eventId] = distributePlayersIntoGroups(players, groupCount);
            window.renderTrainingSession(eventId);
        }
    });

    container.addEventListener('change', (event) => {
        const select = event.target.closest('[data-training-action="set-group-count"]');
        if (!select) return;

        const eventId = window._activeTrainingSessionId;
        if (!eventId) return;

        const groupCount = Number(select.value);
        if (!Number.isFinite(groupCount) || groupCount < 2 || groupCount > 5) return;

        window._trainingSessionGroupCounts[eventId] = groupCount;
        delete window._trainingSessionGroups[eventId];
        window.renderTrainingSession(eventId);
    });
}

window.openTrainingSession = function(eventId) {
    if (!eventId) return;

    const activityEvent = getTrainingEvent(eventId);
    if (!activityEvent || !isActivitySessionType(activityEvent.type)) return;

    window._activeTrainingSessionId = eventId;
    if (activityEvent.type === 'Trening' && !window._trainingSessionGroupCounts[eventId]) {
        window._trainingSessionGroupCounts[eventId] = 3;
    }

    const backTarget = window.currentTab && window.currentTab !== 'oktside'
        ? window.currentTab
        : 'hjem';
    switchTab('oktside', { backTarget });
    window.renderTrainingSession(eventId);
};

window.renderTrainingSession = function(eventId) {
    const container = document.getElementById('oktside-content');
    const trainingEvent = getTrainingEvent(eventId || window._activeTrainingSessionId);
    if (!container || !trainingEvent || !isActivitySessionType(trainingEvent.type)) return;

    bindTrainingSessionEvents();

    const isTraining = trainingEvent.type === 'Trening';
    const eventTypeLabel = isTraining ? 'Trening' : (trainingEvent.type || 'Aktivitet');
    const chipIcon = isTraining ? 'fa-stopwatch' : 'fa-calendar-check';
    const dateValue = new Date(trainingEvent.date);
    const dateFormatted = Number.isNaN(dateValue.getTime())
        ? 'Dato ikke satt'
        : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
    const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    const timeLabel = trainingEvent.time || '--:--';
    const locationLabel = trainingEvent.location || 'Ikke oppgitt';
    const registeredPlayers = getRegisteredPlayersForEvent(trainingEvent);
    const presenceStats = typeof window.getAttendancePresenceStats === 'function'
        ? window.getAttendancePresenceStats(trainingEvent)
        : { presentCount: registeredPlayers.length, squadSize: registeredPlayers.length, isRegistered: false };

    const sessionStats = typeof window.buildNextSessionAttendanceStats === 'function'
        ? window.buildNextSessionAttendanceStats(trainingEvent)
        : {
            møttOppAntall: registeredPlayers.length,
            squadSize: registeredPlayers.length,
            positionCounts: { K: 0, F: 0, M: 0, A: 0 },
            injuredReady: [],
            fractionTone: 'good'
        };
    const fractionToneClass = sessionStats.fractionTone === 'good' ? '' : ` is-${sessionStats.fractionTone}`;
    const hasSessionAttendance = typeof window.hasRegisteredAttendance === 'function'
        ? window.hasRegisteredAttendance(trainingEvent.attendance)
        : presenceStats.isRegistered;
    const radarParts = ['K', 'F', 'M', 'A'].map(letter => (
        `${sessionStats.positionCounts[letter]}${letter}`
    )).join('<span class="dashboard-session-radar-sep"> - </span>');
    const sessionStatsHtml = hasSessionAttendance
        ? `
                        <div class="dashboard-session-stats-line">
                            <span class="match-detail-time${fractionToneClass}">${sessionStats.møttOppAntall}<span class="dashboard-session-fraction-sep">/</span>${sessionStats.squadSize}</span>
                            <span class="dashboard-session-attendance-label">påmeldt</span>
                            <span class="dashboard-session-radar-inline">${radarParts}</span>
                        </div>`
        : `
                        <div class="dashboard-session-stats-line">
                            <span class="dashboard-session-unregistered-label">Oppmøte ikke registrert</span>
                        </div>`;

    window._sessionInjuryPopupData = sessionStats.injuredReady || [];
    let actionsHtml = '';
    if (sessionStats.injuredReady && sessionStats.injuredReady.length > 0) {
        const injuredCount = sessionStats.injuredReady.length;
        const injuryLabel = injuredCount === 1 ? '1 skadet' : `${injuredCount} skadet`;
        actionsHtml = `
                        <div class="dashboard-session-actions">
                            <button type="button" data-training-action="injury" class="bsk-btn bsk-btn-warning is-collapsible dashboard-session-action-btn" title="${escapeTrainingHtml(injuryLabel)}" aria-label="${escapeTrainingHtml(injuryLabel)}">
                                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                                <span class="bsk-btn-label">${escapeTrainingHtml(injuryLabel)}</span>
                            </button>
                        </div>
        `;
    } else {
        window._sessionInjuryPopupData = [];
    }

    const groupsPanelHtml = isTraining
        ? `
            <section class="training-session-panel">
                <div class="training-session-panel-header">
                    <h3>Grupper</h3>
                </div>
                <div class="training-session-panel-body">
                    ${buildGroupsHtml(trainingEvent.id, registeredPlayers)}
                </div>
            </section>
        `
        : '';

    const pendingFeedback = window._pendingAttendanceFeedback;
    const openForFeedback = Boolean(
        pendingFeedback && !pendingFeedback.isMatch && pendingFeedback.recordId === trainingEvent.id
    );
    if (openForFeedback) {
        window._trainingSessionAttendanceOpen = true;
    }
    const isAttendanceOpen = window._trainingSessionAttendanceOpen === true;

    const desktopTitle = document.getElementById('current-tab-title');
    if (desktopTitle && window.currentTab === 'oktside') {
        desktopTitle.innerText = isTraining ? 'Øktside' : 'Aktivitet';
    }

    container.innerHTML = `
        <div class="training-session-page">
            <button type="button" data-training-action="back" class="training-session-back-btn portal-btn portal-btn-secondary portal-btn-sm is-collapsible" title="Tilbake" aria-label="Tilbake">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                <span class="portal-btn-label">Tilbake</span>
            </button>

            <article class="match-detail-card dashboard-next-session-card">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-stopwatch"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeTrainingHtml(dateLabel)}</span>
                    </div>
                    <div class="match-detail-chip">
                        <i class="fa-solid ${chipIcon}"></i>
                        <span>${escapeTrainingHtml(eventTypeLabel)}</span>
                    </div>
                </div>

                <div class="dashboard-session-main relative z-10">
                    <div class="dashboard-session-middle">
                        <div class="dashboard-session-focus-block min-w-0">
                            ${sessionStatsHtml}
                        </div>
                        ${actionsHtml}
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    <div class="match-detail-footer-item" title="${escapeTrainingHtml(locationLabel)}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeTrainingHtml(locationLabel)}</span>
                    </div>
                    <div class="match-detail-footer-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${escapeTrainingHtml(timeLabel)}</span>
                    </div>
                </div>
            </article>

            <section class="training-session-attendance-panel match-game-plan-panel match-collapsible-panel ${isAttendanceOpen ? '' : 'is-collapsed'}">
                <div class="match-bench-action-row match-bench-topline">
                    <div class="match-bench-heading">
                        <h3>Oppmøte</h3>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-attendance" aria-expanded="${isAttendanceOpen ? 'true' : 'false'}" aria-label="${isAttendanceOpen ? 'Skjul oppmøte' : 'Vis oppmøte'}" data-show-label="Vis oppmøte" data-hide-label="Skjul oppmøte">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                    <button type="button" class="training-session-attendance-add-btn" data-training-action="attendance" title="Oppdater" aria-label="Oppdater oppmøte">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>Oppdater</span>
                    </button>
                </div>
                <div class="match-collapsible-content">
                    <p class="match-inline-status training-session-attendance-save-state" data-training-attendance-save-state aria-live="polite" hidden></p>
                    <div class="training-session-attendance-body">
                        ${buildRegisteredPlayersHtml(registeredPlayers)}
                    </div>
                </div>
            </section>

            ${groupsPanelHtml}
        </div>
    `;

    if (openForFeedback) {
        window._pendingAttendanceFeedback = null;
        const message = typeof window.buildAttendanceSaveFeedbackMessage === 'function'
            ? window.buildAttendanceSaveFeedbackMessage(pendingFeedback)
            : 'Oppmøte lagret';
        setTrainingSessionFeedback(message, 'success', 5000);
    }
};
