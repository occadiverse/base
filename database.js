// database.js - Sentralisert håndtering av data
const DB_KEY = 'full-spillerliste';

const DB = {
    // Henter alle spillere fra localStorage
    getPlayers: function() {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    },

    // Henter kun aktive spillere sortert alfabetisk
    getActivePlayers: function() {
        return this.getPlayers()
            .filter(s => s.status === "Aktiv")
            .sort((a, b) => a.navn.localeCompare(b.navn));
    },

    // Lagrer hele spillerlisten
    savePlayers: function(list) {
        localStorage.setItem(DB_KEY, JSON.stringify(list));
    },

    // Genererer en unik ID som streng
    generateId: function() {
        return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    },

    // Henter oppmøte-status for en spesifikk celle
    getAttendance: function(year, month, playerId, day) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        return localStorage.getItem(key) || "?";
    },

    // Lagrer oppmøte-status
    setAttendance: function(year, month, playerId, day, status) {
        const key = `att-base-${year}-${month}-${playerId}-${day}`;
        localStorage.setItem(key, status);
    }
};
