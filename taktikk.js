/**
 * BSK Taktikk-motor 
 * Versjon: Spillersynkronisering (Låst til Fase 1)
 */

const TaktikkModul = {
    // Sannhetens kilde: Holder på spiller-ID for indeks 0-10
    valgtLag: {},

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

    formaterInitialer: function(navn) {
        if (!navn) return "";
        return navn.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    hentDagensTropp: function() {
        const iDag = new Date();
        const y = iDag.getFullYear(), m = iDag.getMonth(), d = iDag.getDate();
        if (typeof DB === 'undefined') return [];
        return DB.getActivePlayers().filter(s => DB.getAttendance(y, m, s.id, d) === 'present');
    },

    beregnProsent: function(playerID) {
        const currentYear = new Date().getFullYear();
        let attended = 0, possible = 0;
        for (let m = 0; m <= 11; m++) {
            for (let d = 1; d <= 31; d++) {
                const status = DB.getAttendance(currentYear, m, playerID, d);
                const type = localStorage.getItem(`type-${currentYear}-${m}-${d}`);
                if (status === 'present') attended++;
                if (type === 'T' || type === 'K') possible++;
            }
        }
        return possible > 0 ? Math.round((attended / possible) * 100) : 0;
    },

    byttFase: function(fase, btn) {
        document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderBane(fase);
    },

    lagreValg: function(posIndex, spillerID) {
        this.valgtLag[posIndex] = spillerID;
    },

    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const posisjoner = this.konfigurasjon[fase];
        const tropp = this.hentDagensTropp();
        
        // Sjekk om vi skal låse dropdowns (Alt som ikke er Fase 1)
        const isLocked = fase !== "424" ? "disabled" : "";

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            const lagretID = this.valgtLag[index] || "";

            // Vi legger til ${isLocked} i select-taggen
            let selectHTML = `<select id="pos-${index}" ${isLocked} onchange="TaktikkModul.lagreValg(${index}, this.value)">
                <option value="">--</option>`;
            
            tropp.forEach(s => {
                const pcent = this.beregnProsent(s.id);
                const isSelected = s.id === lagretID ? "selected" : "";
                selectHTML += `<option value="${s.id}" ${isSelected}>
                    ${this.formaterInitialer(s.navn)} (${pcent}%)
                </option>`;
            });
            selectHTML += `</select>`;

            node.innerHTML = `<div class="pos-label">${p.id}</div>${selectHTML}`;
            layer.appendChild(node);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => TaktikkModul.renderBane("424"), 500);
});
