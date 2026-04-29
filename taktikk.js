/**
 * BSK Taktikk-modul
 * Håndterer formasjoner, spillerutvalg og kjemiberegning.
 */

const TaktikkModul = {
    // 1. Formasjonsdata (Fase 1, 2 og 3)
    konfigurasjon: {
        "424": [
            { id: "GK", top: 98, left: 50 },
            { id: "B1", top: 75, left: 20 }, { id: "B2", top: 88, left: 30 },
            { id: "B3", top: 88, left: 70 }, { id: "B4", top: 75, left: 80 },
            { id: "M1", top: 50, left: 35 }, { id: "M2", top: 50, left: 65 },
            { id: "A1", top: 20, left: 15 }, { id: "A2", top: 15, left: 40 },
            { id: "A3", top: 15, left: 60 }, { id: "A4", top: 20, left: 85 }
        ],
        "2323": [
            { id: "GK", top: 88, left: 50 },
            { id: "MS1", top: 78, left: 35 }, { id: "MS2", top: 78, left: 65 },
            { id: "DM", top: 62, left: 50 }, { id: "IM1", top: 55, left: 25 }, { id: "IM2", top: 55, left: 75 },
            { id: "OM1", top: 38, left: 35 }, { id: "OM2", top: 38, left: 65 },
            { id: "V", top: 15, left: 15 }, { id: "S", top: 10, left: 50 }, { id: "H", top: 15, left: 85 }
        ],
        "325": [
            { id: "GK", top: 75, left: 50 },
            { id: "F1", top: 78, left: 25 }, { id: "F2", top: 82, left: 50 }, { id: "F3", top: 78, left: 75 },
            { id: "M1", top: 58, left: 40 }, { id: "M2", top: 58, left: 60 },
            { id: "V", top: 18, left: 10 }, { id: "IM1", top: 22, left: 32 }, 
            { id: "S", top: 15, left: 50 }, { id: "IM2", top: 22, left: 68 }, { id: "H", top: 18, left: 90 }
        ]
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

        // Sikrer at DB er tilgjengelig før vi filtrerer
        if (typeof DB === 'undefined') return [];

        return DB.getActivePlayers().filter(spiller => {
            return DB.getAttendance(y, m, spiller.id, d) === 'present';
        });
    },

    // 4. Beregn prosent
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

    // 5. Bytte fase
    byttFase: function(fase, btn) {
        // Oppdater knapper
        document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.renderBane(fase);
    },

    // 6. Tegn banen
    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const posisjoner = this.konfigurasjon[fase];
        const tropp = this.hentDagensTropp();

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            let selectHTML = `<select id="select-${index}" onchange="TaktikkModul.oppdaterKjemi()">
                <option value="" data-percent="0">Velg</option>`;
            tropp.forEach(s => {
                const pcent = this.beregnProsent(s.id);
                selectHTML += `<option value="${s.id}" data-percent="${pcent}">${this.formaterInitialer(s.navn)} (${pcent}%)</option>`;
            });
            selectHTML += `</select>`;

            node.innerHTML = `
                <div class="pos-label">${p.id}</div>
                ${selectHTML}
            `;
            layer.appendChild(node);
        });
        
        this.oppdaterKjemi();
    },

    // 7. Oppdater Kjemi (Beregner snitt og viser linjer)
    oppdaterKjemi: function() {
        const svg = document.getElementById('chemistryLines');
        if (!svg) return;
        svg.innerHTML = ''; // Rens linjer

        // Her kan vi senere legge til spesifikke forbindelser
        // For eksempel snittet av to spillere:
        // Snitt = (p1.prosent + p2.prosent) / 2
        console.log("Kjemi oppdatert");
    }
};

// Start opp
document.addEventListener('DOMContentLoaded', () => {
    // Liten delay for å sikre at Firebase/DB er klar
    setTimeout(() => {
        TaktikkModul.renderBane("424");
    }, 500);
});
