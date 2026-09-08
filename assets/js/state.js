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

// Hydrate from localStorage immediately so the first paint is not blocked on Firebase.
(function hydrateFromLocalCache() {
    function readLocalCollection(key) {
        try {
            const raw = window.localStorage.getItem('bsk_local_' + key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn(`Kunne ikke lese lokal cache for ${key}:`, error);
            return [];
        }
    }

    window.activeMatches = readLocalCollection('matches');
    window.activeTeams = readLocalCollection('teams');
    window.activePlayers = readLocalCollection('players');
    window.activeEvents = readLocalCollection('events');
})();
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
