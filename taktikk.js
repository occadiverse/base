import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';

/**
 * BSK Taktikk-modul
 * Håndterer formasjoner, spillerutvalg og kampspesifikk tropp.
 */
const TaktikkModul = {
    valgtLag: {}, // Beholder valgene (index -> spillerId)
    databaseKopi: null,

    konfigurasjon: {
        "424": [
            { id: "GK", top: 88, left: 50 },
            { id: "B1", top: 75, left: 15 }, { id: "B2", top: 78, left: 38 },
            { id: "B3", top: 78, left: 62 }, { id: "B4", top: 75, left: 85 },
            { id: "M1", top: 50, left: 35 }, { id: "M2", top: 50, left: 65 },
            { id: "A1", top: 22, left: 15 }, { id: "A2", top: 15, left: 40 },
            { id: "A3", top: 15, left: 60 }, { id: "A4", top: 22, left: 85 }
        ],
        "2323": [
            { id: "GK", top: 88, left: 50 },
            { id: "MS1", top: 78, left: 35 }, { id: "MS2", top: 78, left: 65 },
            { id: "DM", top: 62, left: 50 }, { id: "IM1", top: 55, left: 20 }, { id: "IM2", top: 55, left: 80 },
            { id: "OM1", top: 38, left: 35 }, { id: "OM2", top: 38, left: 65 },
            { id: "V", top: 15, left: 12 }, { id: "S", top: 10, left: 50 }, { id: "H", top: 15, left: 88 }
        ],
        "325": [
            { id: "GK", top: 88, left: 50 },
            { id: "F1", top: 78, left: 25 }, { id: "F2", top: 82, left: 50 }, { id: "F3", top: 78, left: 75 },
            { id: "M1", top: 58, left: 38 }, { id: "M2", top: 58, left: 62 },
            { id: "V", top: 18, left: 10 }, { id: "IM1", top: 22, left: 32 }, 
            { id: "S", top: 15, left: 50 }, { id: "IM2", top: 22, left: 68 }, { id: "H", top: 18, left: 90 }
        ]
    },

    // 1. Initialisering: Kobler til Firebase og lytter på data
    init: function() {
        const rootRef = ref(db, '/');
        onValue(rootRef, (snapshot) => {
            this.databaseKopi = snapshot.val();
            console.log("Data lastet:", this.databaseKopi);
            
            // Finn nåværende aktiv fase fra UI
            const activeBtn = document.querySelector('.phase-btn.active');
            const currentPhase = activeBtn ? activeBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : "424";
            
            this.renderBane(currentPhase);
        });
    },

    // 2. Hjelper: Formaterer navn (Petter Moi -> PM)
    formaterInitialer: function(navn) {
        if (!navn) return "";
        return navn.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    // 3. Henter troppen basert på URL-dato og status 'K'
    hentAktuellTropp: function() {
        if (!this.databaseKopi) return [];

        const params = new URLSearchParams(window.location.search);
        let targetDate = params.get('date');

        // Fallback til i dag hvis ingen dato er i URL
        if (!targetDate) {
            const nå = new Date();
            targetDate = `${String(nå.getDate()).padStart(2, '0')}-${String(nå.getMonth() + 1).padStart(2, '0')}-${nå.getFullYear()}`;
        }

        const players = this.databaseKopi.players || {};
        const attendance = this.databaseKopi.attendance || {};
        const dailyAttendance = attendance[targetDate] || {};

        // Returner kun spillere som er påmeldt ('K') til denne kampen
        return Object.entries(players)
            .map(([id, data]) => ({ id, ...data }))
            .filter(player => dailyAttendance[player.id] === 'K');
    },

    // 4. Bytte mellom faser
    byttFase: function(fase, btn) {
        document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderBane(fase);
    },

    // 5. Lagre valg fra dropdown
    lagreValg: function(index, playerId) {
        this.valgtLag[index] = playerId;
        console.log(`Posisjon ${index} satt til ${playerId}`);
    },

    // 6. Tegne banen dynamisk
    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const posisjoner = this.konfigurasjon[fase];
        const tropp = this.hentAktuellTropp();

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            const lagretId = this.valgtLag[index] || "";
            let innholdHTML = "";

            if (fase === "424") {
                // Fase 1: Interaktiv dropdown
                let selectHTML = `<select onchange="TaktikkModul.lagreValg(${index}, this.value)">
                    <option value="">--</option>`;
                
                tropp.forEach(s => {
                    const isSelected = s.id === lagretId ? "selected" : "";
                    const visningsNavn = s.navn || s.name || "Ukjent";
                    selectHTML += `<option value="${s.id}" ${isSelected}>${this.formaterInitialer(visningsNavn)}</option>`;
                });
                selectHTML += `</select>`;
                innholdHTML = selectHTML;
            } else {
                // Fase 2 & 3: Kun tekstvisning
                const valgtSpiller = tropp.find(s => s.id === lagretId);
                const tekst = valgtSpiller ? this.formaterInitialer(valgtSpiller.navn || valgtSpiller.name) : "--";
                innholdHTML = `<div class="player-info-text" style="font-weight:bold; font-size:12px; padding-top:4px;">${tekst}</div>`;
            }

            node.innerHTML = `<div class="pos-label" style="font-size:9px; opacity:0.7;">${p.id}</div>${innholdHTML}`;
            layer.appendChild(node);
        });
    }
};

// Gjør modulen tilgjengelig globalt slik at onclick-funksjonene i HTML fungerer
window.TaktikkModul = TaktikkModul;

// Start modulen
TaktikkModul.init();
