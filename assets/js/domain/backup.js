window.exportAppBackup = function exportAppBackup() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const backup = {
            exportedAt: now.toISOString(),
            appName: 'BSK Fotball',
            activeTeams: Array.isArray(window.activeTeams) ? window.activeTeams : [],
            activePlayers: Array.isArray(window.activePlayers) ? window.activePlayers : [],
            activeMatches: Array.isArray(window.activeMatches) ? window.activeMatches : [],
            activeEvents: Array.isArray(window.activeEvents) ? window.activeEvents : []
        };

        if (typeof window.APP_VERSION !== 'undefined' && window.APP_VERSION) {
            backup.version = window.APP_VERSION;
        }

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bsk-backup-${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Backup export failed:', error);
        alert('Kunne ikke laste ned backup. Prøv igjen.');
    }
};
