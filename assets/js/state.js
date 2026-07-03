window.SINGLE_TEAM_MODE = true;

window.isSingleTeamMode = function() {
    return window.SINGLE_TEAM_MODE === true;
};

window.getPrimaryTeam = function() {
    const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];
    return teams[0] || null;
};

window.getPrimaryTeamName = function() {
    return window.getPrimaryTeam()?.name || 'Lag A';
};

window.activeMatches = [];
        window.activeTeams = [];
        window.activePlayers = [];
        window.activeEvents = [];
        window.tacticalLineup = {}; 
        let currentSelectPos = null;
        let currentTacticalPhase = 'fase1'; 
        let activeAttendanceEventId = null;
        let customConfirmCallback = null;
        let currentTab = 'hjem';
        window.currentTab = 'hjem';
        let isAdminUnlocked = false;
        let activeDetailsId = null;
        let currentStatSortCol = 'totalScore';
        let currentStatSortDesc = true;
        
        // Finner dagens dato dynamisk
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        window.currentCalendarDate = today; 
        window.selectedCalendarDateStr = `${year}-${month}-${day}`;
        if (typeof window.activeTimeFilter === 'undefined') {
            window.activeTimeFilter = 'kommende'; 
        }
