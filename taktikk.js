import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
// Vi antar at db er eksportert fra firebase-config.js
import { db } from './firebase-config.js';

const TaktikkModul = {
    valgtLag: {},
    databaseKopi: null, // Her lagrer vi alt fra Firebase

    konfigurasjon: {
        "424": [
            { id: "GK", top: 88, left: 50 },
            { id: "B1", top: 75, left: 15 }, { id: "B2", top: 78, left: 38 },
            { id: "B3", top: 78, left: 62 }, { id: "B4", top: 75, left: 85 },
            { id: "M1", top: 50, left: 35 }, { id: "M2", top: 50, left: 65 },
            { id: "A1", top: 22, left: 15 }, { id: "A2", top: 15, left: 40 },
            { id: "A3", top: 15, left: 60 }, { id: "A4", top: 22, left: 85 }
        ],
        // ... (behold resten av formasjonene dine her)
    },

    // Initialiserer modulen og starter lytting på Firebase
    init: function() {
        const dbRef = ref(db, '/');
        onValue(dbRef, (snapshot) => {
            this.databaseKopi = snapshot.val();
            console.log("Data mottatt fra Firebase:", this.databaseKopi);
            
            // Finn aktiv fase fra knappene
            const aktivFase = document.querySelector('.phase-btn.active')?.getAttribute('onclick')?.match(/'([^']+)'/)[1] || "424";
            this.renderBane(aktivFase);
        });
    },

    hentTroppForDato: function() {
        if (!this.databaseKopi) return [];

        const params = new URLSearchParams(window.location.search);
        let targetDate = params.get('date');

        if (!targetDate) {
            const iDag = new Date();
            targetDate = `${String(iDag.getDate()).padStart(2, '0')}-${String(iDag.getMonth() + 1).padStart(2, '0')}-${iDag.getFullYear()}`;
        }

        const alleSpillere = this.databaseKopi.players || {};
        const attendance = this.databaseKopi.attendance || {};
        const dagensAttendance = attendance[targetDate] || {};

        // Filtrer spillere som har status 'K' (Kamp) eller 'present'
        return Object.entries(alleSpillere)
            .map(([id, data]) => ({ id, ...data }))
            .filter(s => {
                const status = dagensAttendance[s.id];
                return status === 'K' || status === 'present';
            });
    },

    formaterInitialer: function(navn) {
        if (!navn) return "";
        return navn.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const posisjoner = this.konfigurasjon[fase];
        const tropp = this.hentTroppForDato();

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            const lagretID = this.valgtLag[index] || "";
            let innholdHTML = "";

            if (fase === "424") {
                let selectHTML = `<select onchange="TaktikkModul.lagreValg(${index}, this.value)">
                    <option value="">--</option>`;
                
                tropp.forEach(s => {
                    const navn = s.navn || s.name || "Ukjent";
                    const isSelected = s.id === lagretID ? "selected" : "";
                    selectHTML += `<option value="${s.id}" ${isSelected}>${this.formaterInitialer(navn)}</option>`;
                });
                selectHTML += `</select>`;
                innholdHTML = selectHTML;
            } else {
                const spiller = tropp.find(s => s.id === lagretID);
                const tekst = spiller ? this.formaterInitialer(spiller.navn || spiller.name) : "--";
                innholdHTML = `<div class="player-info-text">${tekst}</div>`;
            }

            node.innerHTML = `<div class="pos-label">${p.id}</div>${innholdHTML}`;
            layer.appendChild(node);
        });
    },

    lagreValg: function(index, id) {
        this.valgtLag[index] = id;
    }
};

// Gjør modulen tilgjengelig globalt for onclick-hendelser
window.TaktikkModul = TaktikkModul;
TaktikkModul.init();
