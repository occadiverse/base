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

function getRegisteredPlayerSortCategory(player) {
    if (player?.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player?.id))) {
        return 'Gjest';
    }
    if (typeof window.getPositionCategoryFromPos1 === 'function') {
        return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
    }
    return 'M';
}

function getRegisteredPlayersForEvent(event) {
    const refs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    const categoryOrder = { K: 0, F: 1, M: 2, A: 3, Gjest: 4 };

    return refs
        .map(ref => (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null))
        .filter(Boolean)
        .sort((a, b) => {
            const orderA = categoryOrder[getRegisteredPlayerSortCategory(a)] ?? 3;
            const orderB = categoryOrder[getRegisteredPlayerSortCategory(b)] ?? 3;
            if (orderA !== orderB) return orderA - orderB;
            return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
        });
}

function getPlayerPositionCategory(player) {
    if (player?.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player?.id))) {
        return 'Gjest';
    }
    if (typeof window.getPositionCategoryFromPos1 === 'function') {
        return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
    }
    return 'M';
}

function getPlayerFormScore(player) {
    if (!player || player.isGuest) return 0;
    if (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id)) return 0;
    if (typeof window.calculatePlayerPerformanceChemistry === 'function' && player.navn) {
        return Number(window.calculatePlayerPerformanceChemistry(player.navn)) || 0;
    }
    return 0;
}

function sortPlayersByForm(players) {
    return [...players].sort((a, b) => {
        const formDiff = getPlayerFormScore(b) - getPlayerFormScore(a);
        if (formDiff !== 0) return formDiff;
        return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
    });
}

function allocateCategoryQuotas(remainingByCategory, targetCount) {
    const categories = ['F', 'M', 'A', 'Gjest'];
    const available = categories
        .map((category) => ({
            category,
            count: (remainingByCategory[category] || []).length
        }))
        .filter(item => item.count > 0);

    const totalRemaining = available.reduce((sum, item) => sum + item.count, 0);
    const quotas = { F: 0, M: 0, A: 0, Gjest: 0 };

    if (targetCount <= 0 || totalRemaining <= 0) return quotas;
    if (targetCount >= totalRemaining) {
        available.forEach((item) => {
            quotas[item.category] = item.count;
        });
        return quotas;
    }

    const rows = available.map((item) => ({
        category: item.category,
        count: item.count,
        floor: Math.floor((item.count * targetCount) / totalRemaining),
        remScore: (item.count * targetCount) % totalRemaining
    }));

    let assigned = rows.reduce((sum, row) => sum + row.floor, 0);
    let need = targetCount - assigned;

    rows.forEach((row) => {
        quotas[row.category] = row.floor;
    });

    // Gi restplasser etter høyest rest; ved likhet: knappest rolle først.
    rows
        .slice()
        .sort((a, b) => {
            if (b.remScore !== a.remScore) return b.remScore - a.remScore;
            if (a.count !== b.count) return a.count - b.count;
            return categories.indexOf(a.category) - categories.indexOf(b.category);
        })
        .forEach((row) => {
            if (need <= 0) return;
            if (quotas[row.category] >= row.count) return;
            quotas[row.category] += 1;
            need -= 1;
        });

    categories.forEach((category) => {
        quotas[category] = Math.min(quotas[category], (remainingByCategory[category] || []).length);
    });

    return quotas;
}

function takeBestRemainingPlayer(remainingByCategory) {
    const categories = ['F', 'M', 'A', 'Gjest'];
    let bestPlayer = null;
    let bestCategory = null;
    let bestForm = -Infinity;

    categories.forEach((category) => {
        const player = (remainingByCategory[category] || [])[0];
        if (!player) return;
        const form = getPlayerFormScore(player);
        if (
            form > bestForm
            || (form === bestForm && (bestCategory === null || categories.indexOf(category) < categories.indexOf(bestCategory)))
        ) {
            bestForm = form;
            bestPlayer = player;
            bestCategory = category;
        }
    });

    if (!bestPlayer || !bestCategory) return null;
    remainingByCategory[bestCategory].shift();
    return bestPlayer;
}

function distributePlayersIntoGroups(players, groupCount) {
    const keepers = sortPlayersByForm(
        players.filter(player => getPlayerPositionCategory(player) === 'K')
    );
    const outfieldPlayers = players.filter(player => getPlayerPositionCategory(player) !== 'K');
    const remainingByCategory = { F: [], M: [], A: [], Gjest: [] };

    outfieldPlayers.forEach((player) => {
        const category = getPlayerPositionCategory(player);
        const key = remainingByCategory[category] ? category : 'M';
        remainingByCategory[key].push(player);
    });
    Object.keys(remainingByCategory).forEach((category) => {
        remainingByCategory[category] = sortPlayersByForm(remainingByCategory[category]);
    });

    const totalOutfield = outfieldPlayers.length;
    const base = Math.floor(totalOutfield / groupCount);
    const remainder = totalOutfield % groupCount;
    // Restspillere til de siste gruppene, så størrelsene blir så like som mulig
    // uten at Gruppe 1 blir den største ved rest.
    const targetSizes = Array.from({ length: groupCount }, (_, index) => (
        base + (index >= groupCount - remainder ? 1 : 0)
    ));

    const fieldGroups = Array.from({ length: groupCount }, () => []);

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const remainingCount = Object.values(remainingByCategory).reduce((sum, list) => sum + list.length, 0);
        if (remainingCount === 0) break;

        if (groupIndex === groupCount - 1) {
            ['F', 'M', 'A', 'Gjest'].forEach((category) => {
                fieldGroups[groupIndex].push(...remainingByCategory[category]);
                remainingByCategory[category] = [];
            });
            break;
        }

        const target = targetSizes[groupIndex];
        const quotas = allocateCategoryQuotas(remainingByCategory, target);
        ['F', 'M', 'A', 'Gjest'].forEach((category) => {
            const takeCount = quotas[category] || 0;
            if (takeCount > 0) {
                fieldGroups[groupIndex].push(...remainingByCategory[category].splice(0, takeCount));
            }
        });

        while (fieldGroups[groupIndex].length < target) {
            const nextPlayer = takeBestRemainingPlayer(remainingByCategory);
            if (!nextPlayer) break;
            fieldGroups[groupIndex].push(nextPlayer);
        }
    }

    const groups = [];
    if (keepers.length) {
        groups.push({
            label: keepers.length === 1 ? 'Keeper' : 'Keepere',
            players: keepers,
            isKeeperGroup: true
        });
    }

    fieldGroups.forEach((groupPlayers, index) => {
        if (!groupPlayers.length && keepers.length && totalOutfield === 0) return;
        groups.push({
            label: `Gruppe ${index + 1}`,
            players: groupPlayers,
            isKeeperGroup: false
        });
    });

    if (!groups.length && keepers.length) {
        groups.push({
            label: keepers.length === 1 ? 'Keeper' : 'Keepere',
            players: keepers,
            isKeeperGroup: true
        });
    }

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

    const categoryLabels = {
        K: 'Keeper',
        F: 'Forsvar',
        M: 'Midtbane',
        A: 'Angrep',
        Gjest: 'Gjestespiller'
    };
    const categoryOrder = ['K', 'F', 'M', 'A', 'Gjest'];
    const grouped = Object.fromEntries(categoryOrder.map(key => [key, []]));

    players.forEach((player) => {
        const category = getRegisteredPlayerSortCategory(player);
        (grouped[category] || grouped.M).push(player);
    });

    const groupsHtml = categoryOrder
        .filter(key => grouped[key].length > 0)
        .map((key) => {
            const rowsHtml = grouped[key].map((player) => {
                const jersey = player.draktnummer ? `#${player.draktnummer}` : '';
                const pos = !player.isGuest && player.pos1 && player.pos1 !== '-' ? player.pos1 : '';
                return `
                    <div class="training-session-player-row">
                        <span class="training-session-player-name">${escapeTrainingHtml(player.navn)}</span>
                        <span class="training-session-player-meta">
                            ${jersey ? `<span>${escapeTrainingHtml(jersey)}</span>` : ''}
                            ${pos ? `<span>${escapeTrainingHtml(pos)}</span>` : ''}
                        </span>
                    </div>
                `;
            }).join('');

            return `
                <section class="training-session-player-group">
                    <header class="match-fixture-month">${escapeTrainingHtml(categoryLabels[key])}</header>
                    <div class="training-session-player-group-box">
                        ${rowsHtml}
                    </div>
                </section>
            `;
        }).join('');

    return `
        <div class="training-session-player-list">
            ${groupsHtml}
        </div>
    `;
}

function buildGroupPlayersRowsHtml(groupPlayers) {
    if (!groupPlayers.length) {
        return `
            <div class="training-session-player-row">
                <span class="training-session-player-name training-session-group-empty">Ingen spillere</span>
            </div>
        `;
    }

    return groupPlayers.map((player) => {
        const jersey = player.draktnummer ? `#${player.draktnummer}` : '';
        const pos = !player.isGuest && player.pos1 && player.pos1 !== '-' ? player.pos1 : '';
        return `
            <div class="training-session-player-row">
                <span class="training-session-player-name">${escapeTrainingHtml(player.navn)}</span>
                <span class="training-session-player-meta">
                    ${jersey ? `<span>${escapeTrainingHtml(jersey)}</span>` : ''}
                    ${pos ? `<span>${escapeTrainingHtml(pos)}</span>` : ''}
                </span>
            </div>
        `;
    }).join('');
}

function buildGroupsHtml(eventId, players) {
    const groupCount = window._trainingSessionGroupCounts[eventId] || 1;
    let groups = null;

    if (players.length) {
        groups = distributePlayersIntoGroups(players, groupCount);
        window._trainingSessionGroups[eventId] = groups;
    } else {
        delete window._trainingSessionGroups[eventId];
    }

    const groupCountButtons = [1, 2, 3, 4].map(count => {
        const label = count === 1 ? '1 gruppe' : `${count} grupper`;
        const isActive = count === groupCount;
        return `
            <button
                type="button"
                class="training-session-group-count-btn${isActive ? ' is-active' : ''}"
                data-training-action="set-group-count"
                data-group-count="${count}"
                aria-pressed="${isActive ? 'true' : 'false'}"
                title="${escapeTrainingHtml(label)}"
                aria-label="${escapeTrainingHtml(label)}"
            >${escapeTrainingHtml(label)}</button>
        `;
    }).join('');

    let groupsResultHtml = '';
    if (!players.length) {
        groupsResultHtml = `
            <div class="training-session-empty training-session-empty-compact">
                <p>Registrer oppmøte før du fordeler grupper.</p>
            </div>
        `;
    } else if (groups && groups.length) {
        groupsResultHtml = `
            <div class="training-session-player-list">
                ${groups.map((group) => `
                    <section class="training-session-player-group">
                        <header class="match-fixture-month">${escapeTrainingHtml(group.label)}</header>
                        <div class="training-session-player-group-box">
                            ${buildGroupPlayersRowsHtml(group.players || [])}
                        </div>
                    </section>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="training-session-groups-controls" role="group" aria-label="Antall grupper">
            ${groupCountButtons}
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

        if (action === 'toggle-groups') {
            const panel = actionEl.closest('.match-collapsible-panel');
            if (!panel) return;

            const shouldOpen = panel.classList.contains('is-collapsed');
            panel.classList.toggle('is-collapsed', !shouldOpen);
            window._trainingSessionGroupsOpen = shouldOpen;
            actionEl.setAttribute('aria-expanded', String(shouldOpen));
            actionEl.setAttribute(
                'aria-label',
                shouldOpen
                    ? (actionEl.dataset.hideLabel || 'Skjul grupper')
                    : (actionEl.dataset.showLabel || 'Vis grupper')
            );
            return;
        }

        if (action === 'toggle-groups-info') {
            window._trainingSessionGroupsInfoOpen = !window._trainingSessionGroupsInfoOpen;
            const eventId = window._activeTrainingSessionId;
            if (eventId) window.renderTrainingSession(eventId);
            return;
        }

        if (action === 'set-group-count') {
            const eventId = window._activeTrainingSessionId;
            if (!eventId) return;

            const groupCount = Number(actionEl.dataset.groupCount);
            if (!Number.isFinite(groupCount) || groupCount < 1 || groupCount > 4) return;

            const trainingEvent = getTrainingEvent(eventId);
            if (!trainingEvent || trainingEvent.type !== 'Trening') return;

            if ((window._trainingSessionGroupCounts[eventId] || 1) === groupCount) return;

            const players = getRegisteredPlayersForEvent(trainingEvent);
            window._trainingSessionGroupCounts[eventId] = groupCount;

            if (!players.length) {
                delete window._trainingSessionGroups[eventId];
            } else {
                window._trainingSessionGroups[eventId] = distributePlayersIntoGroups(players, groupCount);
            }

            window.renderTrainingSession(eventId);
        }
    });
}

window.openTrainingSession = function(eventId) {
    if (!eventId) return;

    const activityEvent = getTrainingEvent(eventId);
    if (!activityEvent || !isActivitySessionType(activityEvent.type)) return;

    window._activeTrainingSessionId = eventId;
    if (activityEvent.type === 'Trening' && !window._trainingSessionGroupCounts[eventId]) {
        window._trainingSessionGroupCounts[eventId] = 1;
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

    const isGroupsOpen = window._trainingSessionGroupsOpen === true;
    const isGroupsInfoOpen = window._trainingSessionGroupsInfoOpen === true;
    const groupsPanelHtml = isTraining
        ? `
            <section class="training-session-groups-panel match-game-plan-panel match-collapsible-panel ${isGroupsOpen ? '' : 'is-collapsed'}">
                <div class="match-bench-action-row match-bench-topline">
                    <div class="match-bench-heading">
                        <h3>Grupper</h3>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-groups" aria-expanded="${isGroupsOpen ? 'true' : 'false'}" aria-label="${isGroupsOpen ? 'Skjul grupper' : 'Vis grupper'}" data-show-label="Vis grupper" data-hide-label="Skjul grupper">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                    <button
                        type="button"
                        class="training-session-groups-info-btn${isGroupsInfoOpen ? ' is-active' : ''}"
                        data-training-action="toggle-groups-info"
                        aria-expanded="${isGroupsInfoOpen ? 'true' : 'false'}"
                        aria-controls="training-session-groups-info"
                        title="Slik fordeles gruppene"
                        aria-label="Slik fordeles gruppene"
                    >
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    </button>
                </div>
                <div
                    id="training-session-groups-info"
                    class="training-session-groups-info${isGroupsInfoOpen ? '' : ' is-hidden'}"
                    ${isGroupsInfoOpen ? '' : 'hidden'}
                >
                    <p class="training-session-groups-info-title">Slik fordeles spillere</p>
                    <ul class="training-session-groups-info-list">
                        <li>Keepere trekkes ut i egen gruppe og fordeles ikke på banen.</li>
                        <li>Utespillere sorteres etter Form innen forsvar, midtbane, angrep og gjester.</li>
                        <li>Gruppene gjøres så jevnstore som mulig. Eventuell rest legges på de siste gruppene.</li>
                        <li>Hver gruppe fylles med en proporsjonal blanding av posisjoner fra det som er igjen.</li>
                        <li>Innen hver rolle tas spillere med høyest Form først, så formstyrken fordeles jevnere.</li>
                        <li>Siste gruppe får det som er igjen etter at de andre er fylt opp.</li>
                    </ul>
                </div>
                <div class="match-collapsible-content">
                    <div class="training-session-groups-body">
                        ${buildGroupsHtml(trainingEvent.id, registeredPlayers)}
                    </div>
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
    const attendanceBadgeLabel = presenceStats.isRegistered && presenceStats.squadSize > 0
        ? `${presenceStats.presentCount}/${presenceStats.squadSize}`
        : String(presenceStats.isRegistered ? presenceStats.presentCount : (presenceStats.squadSize || 0));
    const attendanceBadgeAria = presenceStats.isRegistered
        ? `${presenceStats.presentCount} av ${presenceStats.squadSize || presenceStats.presentCount} spillere påmeldt`
        : `${presenceStats.squadSize || 0} spillere i troppen`;

    const desktopTitle = document.getElementById('current-tab-title');
    if (desktopTitle && window.currentTab === 'oktside') {
        desktopTitle.innerText = isTraining ? 'Øktside' : 'Aktivitet';
    }

    container.innerHTML = `
        <div class="training-session-page">
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
                        <span class="match-detail-section-badge" aria-label="${escapeTrainingHtml(attendanceBadgeAria)}">${escapeTrainingHtml(attendanceBadgeLabel)}</span>
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
