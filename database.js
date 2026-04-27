// database.js - Sentralisert håndtering av data med Firebase-støtte
const DB_KEY = 'full-spillerliste';

const DB = {
    // Henter alle spillere fra localStorage (for rask oppstart)
    getPlayers: function() {
        try {
            const data = localStorage.getItem(DB_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Feil ved henting av spillere fra localStorage", e);
            return [];
        }
    },

    // Henter kun aktive spillere sortert alfabetisk
    getActivePlayers: function() {
        return this.getPlayers()
            .filter(s => s && s.status === "Aktiv")
            .sort((a, b) => (a.navn || "").localeCompare(b.navn || ""));
    },

    // Lagrer hele spillerlisten til både lokal lagring og Firebase
    savePlayers: function(list) {
        // 1. Lagre lokalt
        localStorage.setItem(DB_KEY, JSON.stringify(list));
        
        // 2. Synkroniser med Firebase hvis tilgjengelig
        if (window.db && window.dbSet && window.dbRef) {
            window.dbSet(window.dbRef(window.db, 'players/'), list)
                .then(() => console.log("Spillerliste lagret i skyen"))
                .catch(err => console.error("Firebase error (savePlayers):", err));
        }
    },

    // Genererer en unik ID som streng
    generateId: function() {
        return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    },

    // Henter oppmøte-status for en spesifikk celle
    getAttendance: function(year, month, playerId, day) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        const val = localStorage.getItem(key);
        // Returnerer "?" hvis verdien er tom, null eller undefined
        return (val === null || val === undefined) ? "?" : val;
    },

    // Lagrer oppmøte-status til både lokal lagring og Firebase
    setAttendance: function(year, month, playerId, day, status) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        const path = `attendance/${year}/${month}/${playerId}/${day}`;
        
        // 1. Lagre lokalt umiddelbart (for rask respons i UI)
        localStorage.setItem(key, status);
        
        // 2. Send til Firebase-skyen
        if (window.db && window.dbSet && window.dbRef) {
            window.dbSet(window.dbRef(window.db, path), status)
                .catch(err => {
                    console.error("Firebase feil ved lagring av oppmøte:", err);
                    // Om ønskelig kan man legge til et visuelt varsel her hvis nettet er nede
                });
        }
    }
};
