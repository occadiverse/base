// database.js - Sentralisert håndtering av data med Firebase-støtte
const DB_KEY = 'full-spillerliste';

const DB = {
    // Henter alle spillere fra localStorage (for rask oppstart)
    getPlayers: function() {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    },

    // Henter kun aktive spillere sortert alfabetisk
    getActivePlayers: function() {
        return this.getPlayers()
            .filter(s => s.status === "Aktiv")
            .sort((a, b) => a.navn.localeCompare(b.navn));
    },

    // Lagrer hele spillerlisten til både lokal lagring og Firebase
    savePlayers: function(list) {
        localStorage.setItem(DB_KEY, JSON.stringify(list));
        
        // Synkroniser med Firebase hvis tilgjengelig
        if (window.db && window.dbSet && window.dbRef) {
            window.dbSet(window.dbRef(window.db, 'players/'), list)
                .catch(err => console.error("Firebase error (savePlayers):", err));
        }
    },

    // Genererer en unik ID som streng
    generateId: function() {
        return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    },

    // Henter oppmøte-status for en spesifikk celle fra lokal lagring
    getAttendance: function(year, month, playerId, day) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        return localStorage.getItem(key) || "?";
    },

    // Lagrer oppmøte-status til både lokal lagring og Firebase
    setAttendance: function(year, month, playerId, day, status) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        const path = `attendance/${year}/${month}/${playerId}/${day}`;
        
        // 1. Lagre lokalt umiddelbart
        localStorage.setItem(key, status);
        
        // 2. Send til Firebase-skyen
        if (window.db && window.dbSet && window.dbRef) {
            window.dbSet(window.dbRef(window.db, path), status)
                .catch(err => console.error("Firebase error (setAttendance):", err));
        }
    }
};
