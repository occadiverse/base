import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';

/**
 * BSK Taktikk-modul
 * Håndterer formasjoner, spillerutvalg og sanntidssynkronisering.
 */
const TaktikkModul = {
    valgtLag: {}, 
    databaseKopi: null,
    matchId: new URLSearchParams(window.location.search).get('matchId'),

    konfigurasjon: {
        "424": [
            { id: "GK", top: 98, left: 50 },
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

    init: function() {
        const rootRef = ref(db, '/');
        onValue(rootRef, (snapshot) => {
            const data = snapshot.val();
            this.databaseKopi = data;

            // Last inn lagret taktikk hvis den finnes
            if (this.matchId && data.tactics && data.tactics[this.matchId]) {
                this.valgtLag = data.tactics[this.matchId];
            }
            
            console.log("Firebase-data synkronisert.");
            this.oppdaterVisning();
        });
    },

    oppdaterVisning: function() {
        const activeBtn = document.querySelector('.phase-btn.active');
        const currentPhase = activeBtn ? activeBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : "424";
        this.renderBane(currentPhase);
    },

    formaterInitialer: function(navn) {
        if (!navn) return "";
        return navn.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    hentAktuellTropp: function() {
        if (!this.databaseKopi) return [];

        const params = new URLSearchParams(window.location.search);
        let targetDate = params.get('date');

        if (!targetDate) {
            const nå = new Date();
            targetDate = `${String(nå.getDate()).padStart(2, '0')}-${String(nå.getMonth() + 1).padStart(2, '0')}-${nå.getFullYear()}`;
        }

        const players = this.databaseKopi.players || {};
        const attendance = this.databaseKopi.attendance || {};
        const dailyAttendance = attendance[targetDate] || {};

        return Object.entries(players)
            .map(([id, data]) => ({ id, ...data }))
            .filter(player => dailyAttendance[player.id] === 'K');
    },

    byttFase: function(fase, btn) {
        document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderBane(fase);
    },

    lagreValg: function(index, playerId) {
        this.valgtLag[index] = playerId;
        if (this.matchId) {
            const tacticRef = ref(db, `tactics/${this.matchId}`);
            set(tacticRef, this.valgtLag)
                .then(() => console.log("Posisjon lagret."))
                .catch((err) => console.error("Lagringsfeil:", err));
        }
    },

    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const tropp = this.hentAktuellTropp();
        const posisjoner = this.konfigurasjon[fase];

        console.log(`Tegner ${fase}. Spillere funnet: ${tropp.length}`);

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            const lagretId = this.valgtLag[index] || "";
            let innholdHTML = "";

            if (fase === "424") {
                let selectHTML = `<select onchange="TaktikkModul.lagreValg(${index}, this.value)">
                    <option value="">-- Velg spiller --</option>`;
                
                tropp.forEach(s => {
                    const isSelected = s.id === lagretId ? "selected" : "";
                    const fulltNavn = s.navn || s.name || "Ukjent";
                    const initialer = this.formaterInitialer(fulltNavn);
                    selectHTML += `<option value="${s.id}" ${isSelected}>${fulltNavn} (${initialer})</option>`;
                });
                selectHTML += `</select>`;
                innholdHTML = selectHTML;
            } else {
                const valgtSpiller = tropp.find(s => s.id === lagretId);
                const tekst = valgtSpiller ? this.formaterInitialer(valgtSpiller.navn || valgtSpiller.name) : "--";
                innholdHTML = `<div class="player-info-text" style="font-weight:bold; font-size:12px; padding-top:4px;">${tekst}</div>`;
            }

            node.innerHTML = `<div class="pos-label" style="font-size:9px; opacity:0.7;">${p.id}</div>${innholdHTML}`;
            layer.appendChild(node);
        });
    }
}; // Her var feilen i forrige versjon - objektet ble ikke lukket korrekt!

// Tilgjengeliggjør modulen globalt
window.TaktikkModul = TaktikkModul;
TaktikkModul.init();
