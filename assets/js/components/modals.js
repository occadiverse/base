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
    const modals = ['matchModal', 'teamModal', 'playerModal', 'matchInfoModal', 'eventModal', 'attendanceModal', 'confirmModal', 'kjemi-info-modal', 'activityModal', 'tacticalPlayerModal'];
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
            if (modalId === 'activityModal') window.closeActivityModal();
            if (modalId === 'tacticalPlayerModal') window.closePlayerSelect();
            if (modalId === 'kjemi-info-modal') {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }
    });
};
