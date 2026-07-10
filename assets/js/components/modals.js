window._sessionInjuryPopupData = [];
window._dashboardAlertPopupData = [];
window._modalReturnContext = null;

window.escapeModalHtml = function(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
};

window.escapeModalJsString = function(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
};

function bindSessionInjuryModalEvents() {
    const modal = document.getElementById('sessionInjuryModal');
    if (!modal || modal.dataset.modalEventsBound === 'true') return;
    modal.dataset.modalEventsBound = 'true';

    modal.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-modal-action="mark-player-healthy"]');
        if (!actionEl) return;

        event.stopPropagation();
        const playerId = actionEl.dataset.playerId;
        if (playerId) window.markSessionInjuryPlayerHealthy(playerId);
    });
}

window.buildMatchAlertData = function(match) {
    if (!match || typeof window.getDisciplineStatusForTeam !== 'function') return [];

    const teamSuspensions = window.getDisciplineStatusForTeam(match.matchGroup, match.date) || {};
    const suspendedPlayers = Object.keys(teamSuspensions).filter(playerRef => teamSuspensions[playerRef].isSuspended);
    const atRiskPlayers = Object.keys(teamSuspensions).filter(playerRef => teamSuspensions[playerRef].isAtRisk && !teamSuspensions[playerRef].isSuspended);
    const cleanText = (value) => String(value || '').trim();
    const matchLabel = [match.opponent, match.matchType].filter(Boolean).join(' · ') || 'neste kamp';

    return [
        ...suspendedPlayers.map(playerRef => {
            const status = teamSuspensions[playerRef] || {};
            const playerName = window.getPlayerNameFromRef(playerRef);
            const isRedCard = status.cardType === 'red';

            return {
                type: 'suspended',
                tone: isRedCard ? 'critical' : 'warning',
                icon: isRedCard ? 'fa-square' : 'fa-ban',
                playerName,
                badge: status.reason || 'Karantene',
                detail: isRedCard
                    ? `${playerName} fikk rødt kort i forrige seriekamp og har karantene i neste seriekamp.`
                    : `${playerName} har karantene i neste seriekamp (${cleanText(status.reason) || 'kortgrense'}).`,
                meta: matchLabel
            };
        }),
        ...atRiskPlayers.map(playerRef => {
            const status = teamSuspensions[playerRef] || {};
            const playerName = window.getPlayerNameFromRef(playerRef);

            return {
                type: 'at-risk',
                tone: 'notice',
                icon: 'fa-triangle-exclamation',
                playerName,
                badge: 'Faresone',
                detail: `${playerName} står med ${status.yellows || 0} gule kort og får karantene ved ${status.nextKaranteneAt || 4} gule kort.`,
                meta: matchLabel
            };
        })
    ];
};

window.showMatchAlertModal = function(matchId) {
    const match = (window.activeMatches || []).find(m => m.id === matchId);
    if (!match) return;

    window.showDashboardAlertModal(window.buildMatchAlertData(match));
};

window.captureModalReturnContext = function() {
    const tab = window.currentTab || 'hjem';
    return {
        tab,
        matchId: tab === 'kampdetaljer' ? (window.activeDetailsId || null) : null,
        trainingSessionId: tab === 'oktside' ? (window._activeTrainingSessionId || null) : null
    };
};

window.restoreModalReturnContext = function(context) {
    if (!context) return;

    if (context.tab === 'kampdetaljer' && context.matchId && typeof window.showMatchDetails === 'function') {
        window.showMatchDetails(context.matchId);
        return;
    }

    if (context.tab === 'oktside' && context.trainingSessionId && typeof window.renderTrainingSession === 'function') {
        if (window.currentTab !== 'oktside' && typeof window.switchTab === 'function') {
            window.switchTab('oktside', { backTarget: window.currentTab || 'hjem' });
        }
        window.renderTrainingSession(context.trainingSessionId);
        return;
    }

    if (context.tab && typeof window.switchTab === 'function') {
        window.switchTab(context.tab);
    }
};

window.showSessionInjuryModal = function() {
    window._modalReturnContext = window.captureModalReturnContext();

    const players = window._sessionInjuryPopupData || [];
    if (players.length === 0) return;

    const listEl = document.getElementById('sessionInjuryList');
    const titleEl = document.getElementById('sessionInjuryModalTitle');
    if (titleEl) {
        titleEl.textContent = players.length === 1
            ? '1 spiller med skade'
            : `${players.length} spillere med skade`;
    }
    if (listEl) {
        listEl.innerHTML = players.map(player => {
            const injuryLabel = window.escapeModalHtml(player.label || player.shortLabel || 'Skade registrert');
            const playerId = window.escapeModalHtml(player.id || '');
            const healthyButton = player.id
                ? `
                    <button type="button"
                            class="session-injury-healthy-btn"
                            data-modal-action="mark-player-healthy"
                            data-player-id="${playerId}"
                            title="Marker ${window.escapeModalHtml(player.navn)} som frisk">
                        <i class="fa-solid fa-check"></i>
                        <span>Frisk</span>
                    </button>
                `
                : '';
            const badgeClass = player.type === 'langvarig'
                ? 'session-injury-badge is-critical'
                : 'session-injury-badge is-warning';
            return `
                <div class="session-injury-item">
                    <div class="session-injury-topline">
                        <span class="session-injury-name">${window.escapeModalHtml(player.navn)}</span>
                        ${healthyButton}
                    </div>
                    <span class="${badgeClass}">${injuryLabel}</span>
                </div>
            `;
        }).join('');
    }

    const modal = document.getElementById('sessionInjuryModal');
    bindSessionInjuryModalEvents();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.markSessionInjuryPlayerHealthy = async function(playerId) {
    if (!playerId || typeof window.markPlayerHealthy !== 'function') return;

    const trigger = document.activeElement;
    if (trigger && trigger.classList?.contains('session-injury-healthy-btn')) {
        trigger.disabled = true;
        trigger.classList.add('is-loading');
    }

    try {
        await window.markPlayerHealthy(playerId);
        window._sessionInjuryPopupData = (window._sessionInjuryPopupData || []).filter(player => player.id !== playerId);

        if (window._sessionInjuryPopupData.length === 0) {
            window.closeSessionInjuryModal();
            return;
        }

        window.showSessionInjuryModal();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke markere spilleren som frisk. Prøv igjen.');
        if (trigger && trigger.classList?.contains('session-injury-healthy-btn')) {
            trigger.disabled = false;
            trigger.classList.remove('is-loading');
        }
    }
};

window.closeSessionInjuryModal = function() {
    const modal = document.getElementById('sessionInjuryModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    const context = window._modalReturnContext;
    window._modalReturnContext = null;
    window.restoreModalReturnContext(context);
};

window.showDashboardAlertModal = function(alertsOverride) {
    window._modalReturnContext = window.captureModalReturnContext();

    const alerts = Array.isArray(alertsOverride) ? alertsOverride : (window._dashboardAlertPopupData || []);
    if (alerts.length === 0) return;
    window._dashboardAlertPopupData = alerts;

    const titleEl = document.getElementById('dashboardAlertModalTitle');
    const leadEl = document.getElementById('dashboardAlertModalLead');
    const listEl = document.getElementById('dashboardAlertList');

    if (titleEl) {
        titleEl.textContent = alerts.length === 1
            ? 'Varsel før neste kamp'
            : `${alerts.length} varsler før neste kamp`;
    }

    if (leadEl) {
        leadEl.textContent = alerts.length === 1
            ? 'Dette må tas hensyn til i laguttaket.'
            : 'Disse punktene må tas hensyn til i laguttaket.';
    }

    if (listEl) {
        listEl.innerHTML = alerts.map(alert => `
            <div class="dashboard-alert-modal-item is-${window.escapeModalHtml(alert.tone || 'notice')}">
                <div class="dashboard-alert-modal-icon">
                    <i class="fa-solid ${window.escapeModalHtml(alert.icon || 'fa-triangle-exclamation')}"></i>
                </div>
                <div class="dashboard-alert-modal-copy min-w-0">
                    <div class="dashboard-alert-modal-row">
                        <span class="dashboard-alert-modal-name">${window.escapeModalHtml(alert.playerName)}</span>
                        <span class="dashboard-alert-modal-badge">${window.escapeModalHtml(alert.badge)}</span>
                    </div>
                    <p>${window.escapeModalHtml(alert.detail)}</p>
                    <span>${window.escapeModalHtml(alert.meta)}</span>
                </div>
            </div>
        `).join('');
    }

    const modal = document.getElementById('dashboardAlertModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeDashboardAlertModal = function() {
    const modal = document.getElementById('dashboardAlertModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    const context = window._modalReturnContext;
    window._modalReturnContext = null;
    window.restoreModalReturnContext(context);
};

window.customConfirm = function(title, message, callback) {
    customConfirmCallback = callback;
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;

    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    customConfirmCallback = null;
};

document.getElementById('confirmYesBtn').onclick = async function() {
    const callback = customConfirmCallback;
    window.closeConfirmModal();
    if (!callback) return;

    try {
        await callback();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

document.getElementById('confirmNoBtn').onclick = function() {
    window.closeConfirmModal();
};

window.onclick = function(event) {
    const modals = ['matchModal', 'teamModal', 'playerModal', 'matchInfoModal', 'attendanceModal', 'confirmModal', 'sessionInjuryModal', 'dashboardAlertModal', 'kjemi-info-modal', 'activityModal', 'tacticalPlayerModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'matchModal') window.closeMatchModal();
            if (modalId === 'teamModal') window.closeTeamModal();
            if (modalId === 'playerModal') window.closePlayerModal();
            if (modalId === 'matchInfoModal') window.closeMatchInfo();
            if (modalId === 'attendanceModal') window.closeAttendanceModal();
            if (modalId === 'confirmModal') window.closeConfirmModal();
            if (modalId === 'sessionInjuryModal') window.closeSessionInjuryModal();
            if (modalId === 'dashboardAlertModal') window.closeDashboardAlertModal();
            if (modalId === 'activityModal') window.closeActivityModal();
            if (modalId === 'tacticalPlayerModal') window.closePlayerSelect();
            if (modalId === 'kjemi-info-modal') {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }
    });
};
