import { ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';

const TaktikkModul = {
    valgtLag: { lineup: {}, roles: {}, instructions: {}, subPlan: "" }, 
    databaseKopi: null,
    matchId: new URLSearchParams(window.location.search).get('matchId'),

    konfigurasjon: {
        "424": [
            { id: "GK", top: 96, left: 50 },
            { id: "VB", top: 83, left: 15 }, { id: "VS", top: 95, left: 32 },
            { id: "HS", top: 95, left: 70 }, { id: "HB", top: 83, left: 85 },
            { id: "DM", top: 75, left: 35 }, { id: "OM", top: 75, left: 65 },
            { id: "VK", top: 50, left: 5 }, { id: "SP", top: 50, left: 40 },
            { id: "PM", top: 55, left: 60 }, { id: "HK", top: 50, left: 95 }
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
        if (!this.matchId) return;

        const rootRef = ref(db, '/');
        onValue(rootRef, (snapshot) => {
            const data = snapshot.val();
            this.databaseKopi = data;

            if (data.tactics && data.tactics[this.matchId]) {
                // Sørg for at vi har riktig struktur selv om gammel data finnes
                const saved = data.tactics[this.matchId];
                this.valgtLag = {
                    lineup: saved.lineup || saved || {}, // Fallback hvis gammelt format
                    roles: saved.roles || {},
                    instructions: saved.instructions || {},
                    subPlan: saved.subPlan || ""
                };
            }
            
            this.oppdaterVisning();
            this.oppdaterTekstFelter();
            this.oppdaterBenken();
        });
    },

    // NY: Oppdaterer input-feltene i HTML
    oppdaterTekstFelter: function() {
        const r = this.valgtLag.roles;
        const i = this.valgtLag.instructions;
        
        if(document.getElementById('cap-input')) document.getElementById('cap-input').value = r.captain || "";
        if(document.getElementById('pen-input')) document.getElementById('pen-input').value = r.penalty || "";
        if(document.getElementById('cor-input')) document.getElementById('cor-input').value = r.corners || "";
        if(document.getElementById('off-corner-text')) document.getElementById('off-corner-text').value = i.offCorner || "";
        if(document.getElementById('def-corner-text')) document.getElementById('def-corner-text').value = i.defCorner || "";
        if(document.getElementById('sub-plan-text')) document.getElementById('sub-plan-text').value = this.valgtLag.subPlan || "";
    },

    // NY: Viser spillere som ikke er i 11-eren
    oppdaterBenken: function() {
        const benchDiv = document.getElementById('bench-list');
        if (!benchDiv) return;

        const tropp = this.hentAktuellTropp();
        const startelleverIder = Object.values(this.valgtLag.lineup);
        
        const benkSpillere = tropp.filter(s => !startelleverIder.includes(s.id));
        
        benchDiv.innerHTML = benkSpillere.length > 0 
            ? benkSpillere.map(s => `<span class="badge">${s.navn || s.name}</span>`).join(' ')
            : '<span style="color:var(--text-muted); font-size:0.8rem;">Ingen på benken</span>';
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

    // OPPDATERT: Lagrer nå hele objektet inkludert roller
    lagreTaktikk: function() {
        if (!this.matchId) return;

        // Oppdater objektet fra tekstfeltene før lagring
        this.valgtLag.roles = {
            captain: document.getElementById('cap-input')?.value || "",
            penalty: document.getElementById('pen-input')?.value || "",
            corners: document.getElementById('cor-input')?.value || ""
        };
        this.valgtLag.instructions = {
            offCorner: document.getElementById('off-corner-text')?.value || "",
            defCorner: document.getElementById('def-corner-text')?.value || ""
        };
        this.valgtLag.subPlan = document.getElementById('sub-plan-text')?.value || "";

        const tacticRef = ref(db, `tactics/${this.matchId}`);
        set(tacticRef, this.valgtLag)
            .then(() => alert("Hele kampplanen er lagret!"))
            .catch((err) => alert("Lagringsfeil: " + err));
    },

    // Hjelpefunksjon for å lagre kun posisjon (brukes av select-menyen)
    lagreValg: function(index, playerId) {
        this.valgtLag.lineup[index] = playerId;
        this.oppdaterBenken(); // Oppdater benk-visning med en gang
        
        // Lagre automatisk posisjonsendring
        const lineupRef = ref(db, `tactics/${this.matchId}/lineup`);
        set(lineupRef, this.valgtLag.lineup);
    },

    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        if (!layer) return;

        const tropp = this.hentAktuellTropp();
        const posisjoner = this.konfigurasjon[fase];

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node'; 
            node.style.top = `${p.top}%`;
            node.style.left = `${p.left}%`;

            const lagretId = this.valgtLag.lineup[index] || "";
            const valgtSpiller = tropp.find(s => s.id === lagretId);
            
            const tekstSomSkalVises = valgtSpiller 
                ? this.formaterInitialer(valgtSpiller.navn || valgtSpiller.name) 
                : p.id;

            let innholdHTML = `<div class="player-initials">${tekstSomSkalVises}</div>`;

            if (fase === "424") {
                let selectHTML = `<select onchange="TaktikkModul.lagreValg(${index}, this.value)">
                    <option value="">-- Velg --</option>`;
                
                tropp.forEach(s => {
                    const isSelected = s.id === lagretId ? "selected" : "";
                    selectHTML += `<option value="${s.id}" ${isSelected}>${s.navn || s.name}</option>`;
                });
                selectHTML += `</select>`;
                innholdHTML += selectHTML;
            }

            node.innerHTML = innholdHTML;
            layer.appendChild(node);
        });
    }
};

window.TaktikkModul = TaktikkModul;
TaktikkModul.init();
