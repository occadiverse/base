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

// Oppstarts-timeren ligger helt til slutt i dokumentet
setTimeout(() => {
    window.updateDynamicSelectors();
    window.applyFilters();
    window.updateDashboard();
    window.renderPlayerRoster();
    window.recalculateOppmoteAndKjemi();
    window.renderCalendar();
    window.switchTab('hjem');
}, 300);
