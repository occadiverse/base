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

function getTrainingEvent(eventId) {
    return (window.activeEvents || []).find(event => event.id === eventId) || null;
}

function getRegisteredPlayersForEvent(event) {
    const refs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    return refs
        .map(ref => (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null))
        .filter(Boolean)
        .sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' }));
}

window.getLastMatchFocusForTeam = function(teamName) {
    const playedMatches = (window.activeMatches || [])
        .filter(match => {
            if (!match.result || !match.result.includes('-')) return false;
            if (teamName && match.matchGroup !== teamName) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const match = playedMatches[0];
    if (!match) return null;

    const notes = match.notes || {};
    const positive = String(notes.positive || '').trim();
    const challenge = String(notes.challenge || '').trim();

    return {
        match,
        positive,
        challenge,
        hasNotes: Boolean(positive || challenge)
    };
};

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

function formatTrainingDateLabel(dateStr) {
    if (!dateStr) return 'Dato ikke satt';
    const dateValue = new Date(dateStr);
    if (Number.isNaN(dateValue.getTime())) return dateStr;
    const formatted = dateValue.toLocaleDateString('no-NO', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function buildRegisteredPlayersHtml(players) {
    if (!players.length) {
        return `
            <div class="training-session-empty">
                <i class="fa-solid fa-user-slash"></i>
                <p>Ingen påmeldte spillere ennå.</p>
                <p class="training-session-empty-hint">Registrer oppmøte for å se hvem som er påmeldt.</p>
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

function buildMatchFocusHtml(teamName) {
    const focus = window.getLastMatchFocusForTeam(teamName);
    if (!focus) {
        return `
            <div class="training-session-empty training-session-empty-compact">
                <p>Ingen spilte kamper registrert ennå.</p>
            </div>
        `;
    }

    const { match, positive, challenge, hasNotes } = focus;
    const dateLabel = formatTrainingDateLabel(match.date);
    const opponent = match.opponent || 'motstander';

    if (!hasNotes) {
        return `
            <p class="training-session-focus-meta">${escapeTrainingHtml(dateLabel)} · vs ${escapeTrainingHtml(opponent)}</p>
            <p class="training-session-focus-empty">Ingen trenernotater fra siste kamp.</p>
        `;
    }

    return `
        <p class="training-session-focus-meta">${escapeTrainingHtml(dateLabel)} · vs ${escapeTrainingHtml(opponent)}</p>
        ${positive ? `
            <div class="training-session-focus-note is-positive">
                <span class="training-session-focus-note-label">Positivt</span>
                <p>${escapeTrainingHtml(positive)}</p>
            </div>
        ` : ''}
        ${challenge ? `
            <div class="training-session-focus-note is-challenge">
                <span class="training-session-focus-note-label">Utfordring</span>
                <p>${escapeTrainingHtml(challenge)}</p>
            </div>
        ` : ''}
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

        if (action === 'distribute-groups') {
            if (!eventId) return;
            const trainingEvent = getTrainingEvent(eventId);
            if (!trainingEvent) return;

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

    const trainingEvent = getTrainingEvent(eventId);
    if (!trainingEvent || trainingEvent.type !== 'Trening') return;

    window._activeTrainingSessionId = eventId;
    if (!window._trainingSessionGroupCounts[eventId]) {
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
    if (!container || !trainingEvent) return;

    bindTrainingSessionEvents();

    const teamName = trainingEvent.team || window.getPrimaryTeamName();
    const title = trainingEvent.title || 'Trening';
    const dateLabel = formatTrainingDateLabel(trainingEvent.date);
    const timeLabel = trainingEvent.time || '--:--';
    const locationLabel = trainingEvent.location || 'Ikke oppgitt';
    const registeredPlayers = getRegisteredPlayersForEvent(trainingEvent);

    container.innerHTML = `
        <div class="training-session-page">
            <button type="button" data-training-action="back" class="training-session-back-btn portal-btn portal-btn-secondary portal-btn-sm is-collapsible" title="Tilbake" aria-label="Tilbake">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                <span class="portal-btn-label">Tilbake</span>
            </button>

            <article class="match-detail-card training-session-hero">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-person-running"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeTrainingHtml(dateLabel)}</span>
                    </div>
                    <div class="match-detail-chip">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span>Trening</span>
                    </div>
                </div>

                <div class="training-session-hero-main relative z-10">
                    <h2 class="training-session-title">${escapeTrainingHtml(title)}</h2>
                    <p class="training-session-subtitle">${escapeTrainingHtml(teamName)}</p>
                    <button type="button" data-training-action="attendance" class="match-bench-action-btn dashboard-session-action-btn">
                        <i class="fa-solid fa-user-check"></i>
                        <span>Oppmøte</span>
                    </button>
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

            <section class="training-session-panel">
                <div class="training-session-panel-header">
                    <h3>Fokus fra siste kamp</h3>
                </div>
                <div class="training-session-panel-body">
                    ${buildMatchFocusHtml(teamName)}
                </div>
            </section>

            <section class="training-session-panel">
                <div class="training-session-panel-header">
                    <h3>Påmeldte</h3>
                    <span class="training-session-count-badge">${registeredPlayers.length}</span>
                </div>
                <div class="training-session-panel-body">
                    ${buildRegisteredPlayersHtml(registeredPlayers)}
                </div>
            </section>

            <section class="training-session-panel">
                <div class="training-session-panel-header">
                    <h3>Grupper</h3>
                </div>
                <div class="training-session-panel-body">
                    ${buildGroupsHtml(trainingEvent.id, registeredPlayers)}
                </div>
            </section>
        </div>
    `;
};
