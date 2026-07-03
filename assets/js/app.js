// Oppstarts-timeren ligger helt til slutt i dokumentet
setTimeout(() => {
    window.updateDynamicSelectors();
    window.applyFilters();
    window.updateDashboard();
    window.renderPlayerRoster();
    window.recalculateOppmoteAndKjemi();
    window.renderCalendar();
    window.switchTab('hjem');
    if (typeof window.setupMobileSwipeNavigation === 'function') window.setupMobileSwipeNavigation();
}, 300);

setTimeout(() => {
    if (typeof window.maybeRunSingleTeamDataMigration === 'function') {
        window.maybeRunSingleTeamDataMigration();
    }
}, 1200);
