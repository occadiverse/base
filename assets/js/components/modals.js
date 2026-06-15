window._sessionInjuryPopupData = [];

window.escapeModalHtml = function(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
};

window.showSessionInjuryModal = function() {
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
            const badgeClass = player.type === 'langvarig'
                ? 'session-injury-badge is-critical'
                : 'session-injury-badge is-warning';
            return `
                <div class="session-injury-item">
                    <span class="session-injury-name">${window.escapeModalHtml(player.navn)}</span>
                    <span class="${badgeClass}">${injuryLabel}</span>
                </div>
            `;
        }).join('');
    }

    const modal = document.getElementById('sessionInjuryModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeSessionInjuryModal = function() {
    const modal = document.getElementById('sessionInjuryModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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

document.getElementById('confirmYesBtn').onclick = function() {
    if (customConfirmCallback) customConfirmCallback();
    window.closeConfirmModal();
};

document.getElementById('confirmNoBtn').onclick = function() {
    window.closeConfirmModal();
};

window.onclick = function(event) {
    const modals = ['matchModal', 'teamModal', 'playerModal', 'matchInfoModal', 'eventModal', 'attendanceModal', 'confirmModal', 'sessionInjuryModal', 'kjemi-info-modal', 'activityModal', 'tacticalPlayerModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'matchModal') window.closeMatchModal();
            if (modalId === 'teamModal') window.closeTeamModal();
            if (modalId === 'playerModal') window.closePlayerModal();
            if (modalId === 'matchInfoModal') window.closeMatchInfo();
            if (modalId === 'eventModal') window.closeEventModal();
            if (modalId === 'attendanceModal') window.closeAttendanceModal();
            if (modalId === 'confirmModal') window.closeConfirmModal();
            if (modalId === 'sessionInjuryModal') window.closeSessionInjuryModal();
            if (modalId === 'activityModal') window.closeActivityModal();
            if (modalId === 'tacticalPlayerModal') window.closePlayerSelect();
            if (modalId === 'kjemi-info-modal') {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }
    });
};
