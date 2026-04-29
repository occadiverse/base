/**
 * BSK Taktikk-modul
 * Håndterer formasjoner, spillerutvalg og kjemiberegning.
 */

const TaktikkModul = {
    // 1. Formasjonsdata (Fase 1, 2 og 3)
    konfigurasjon: {
        "424": [
            { id: "GK", top: 88, left: 50 },
            { id: "B1", top: 75, left: 20 }, { id: "B2", top: 78, left: 40 },
            { id: "B3", top: 78, left: 60 }, { id: "B4", top: 75, left: 80 },
            { id: "M1", top: 50, left: 35 }, { id: "M2", top: 50, left: 65 },
            { id: "A1", top: 20, left: 15 }, { id: "A2", top: 15, left: 40 },
            { id: "A3", top: 15, left: 60 }, { id: "A4", top: 20, left: 85 }
        ],
        "2323": [ /* Legg til koordinater her */ ],
        "325": [ /* Legg til koordinater her */ ]
    },

    // 2. Navneformat: "Petter Moi" -> "PM"
    formaterInitialer: function(navn) {
        if (!navn) return "";
        return navn.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    // 3. Hent spillere som er pålogget i dag
    hentDagensTropp: function() {
        const iDag = new Date();
        const y = iDag.getFullYear();
        const m = iDag.getMonth();
        const d = iDag.getDate();

        return DB.getActivePlayers().filter(spiller => {
            return DB.getAttendance(y, m, spiller.id, d) === 'present';
        });
    },

    // 4. Beregn prosent (Gjenbruk av din logikk)
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

    // 5. Tegn banen
    renderBane: function(fase) {
        const bane = document.getElementById('taktikkBane');
        const posisjoner = this.konfigurasjon[fase];
        const tropp = this.hentDagensTropp();

        bane.innerHTML = ''; // Rens banen

        posisjoner.forEach(p => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            // Lag dropdown for spiller valg
            let selectHTML = `<select onchange="TaktikkModul.oppdaterKjemi()">
                <option value="">Velg</option>`;
            tropp.forEach(s => {
                selectHTML += `<option value="${s.id}">${this.formaterInitialer(s.navn)} (${this.beregnProsent(s.id)}%)</option>`;
            });
            selectHTML += `</select>`;

            node.innerHTML = `
                <div class="pos-label">${p.id}</div>
                ${selectHTML}
            `;
            bane.appendChild(node);
        });
    }
};

// Start opp med Fase 1
document.addEventListener('DOMContentLoaded', () => {
    TaktikkModul.renderBane("424");
});
