import { ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';

/**
 * BSK Taktikk-modul
 */
const TaktikkModul = {
    valgtLag: { lineup: {}, roles: {}, instructions: {}, subPlan: {}, customPositions: {} }, 
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
        ],
        "off_corner": [
            { id: "GK", top: 96, left: 50 },
            { id: "F1", top: 10, left: 45 }, { id: "F2", top: 10, left: 55 }, { id: "F3", top: 15, left: 50 },
            { id: "M1", top: 12, left: 35 }, { id: "M2", top: 12, left: 65 },
            { id: "V", top: 15, left: 5 }, { id: "S1", top: 8, left: 48 }, 
            { id: "S2", top: 8, left: 52 }, { id: "H", top: 15, left: 95 }, { id: "B", top: 25, left: 50 }
        ],
        "def_corner": [
            { id: "GK", top: 92, left: 50 },
            { id: "F1", top: 95, left: 45 }, { id: "F2", top: 95, left: 55 }, { id: "F3", top: 90, left: 50 },
            { id: "M1", top: 88, left: 40 }, { id: "M2", top: 88, left: 60 },
            { id: "V", top: 85, left: 15 }, { id: "S1", top: 92, left: 42 }, 
            { id: "S2", top: 92, left: 58 }, { id: "H", top: 85, left: 85 }, { id: "B", top: 60, left: 50 }
        ]
    },

    init: function() {
        if (!this.matchId) return;

        const rootRef = ref(db, '/');
        onValue(rootRef, (snapshot) => {
            const data = snapshot.val();
            this.databaseKopi = data;

            if (data.tactics && data.tactics[this.matchId]) {
                const saved = data.tactics[this.matchId];
                this.valgtLag = {
                    lineup: saved.lineup || {},
                    roles: saved.roles || {},
                    instructions: saved.instructions || {},
                    subPlan: saved.subPlan || {},
                    customPositions: saved.customPositions || {}
                };
            }
            
            this.oppdaterVisning();
        });
    },

    oppdaterVisning: function() {
        if (this.databaseKopi && this.matchId) {
            const match = this.databaseKopi.matches?.[this.matchId];
            if (match) {
                document.getElementById('matchOpponentTitle').innerText = match.opponent;
                document.getElementById('matchDetailsSub').innerText = `Kampplan | ${match.date} kl. ${match.time}`;
            }
        }

        const activeBtn = document.querySelector('.tab-btn.active');
        const currentPhase = activeBtn ? activeBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : "424";
        this.renderBane(currentPhase);

        this.oppdaterAlleSelectMenyer();
        this.oppdaterTekstFelter();
        this.oppdaterBenken();
    },

    fokuserFase: function(faseId) {
        const filterButtons = document.querySelectorAll('.filter-bar .tab-btn');
        let targetBtn = null;

        filterButtons.forEach(btn => {
            if (btn.getAttribute('onclick').includes(`'${faseId}'`)) {
                targetBtn = btn;
            }
        });

        if (targetBtn) {
            this.byttFase(faseId, targetBtn);
        }

        document.getElementById('pitch').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    gjorFlyttbar: function(node, index, fase) {
        let isDragging = false;

        const startDragging = (e) => {
            if (e.target.tagName === 'SELECT' || e.target.closest('select')) {
                isDragging = false;
                return;
            }
            
            isDragging = true;
            node.style.cursor = 'grabbing';
            node.style.zIndex = 1000;
            node.style.transition = 'none';
        };

        const moveNode = (e) => {
            if (!isDragging) return;

            // Hindrer scrolling KUN hvis vi faktisk drar en spiller
            if (e.cancelable) e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = document.getElementById('pitch').getBoundingClientRect();
            let x = ((clientX - rect.left) / rect.width) * 100;
            let y = ((clientY - rect.top) / rect.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            node.style.left = x + '%';
            node.style.top = y + '%';
        };

        const stopDragging = () => {
            if (isDragging) {
                isDragging = false;
                node.style.cursor = 'grab';
                node.style.zIndex = 5;
                node.style.transition = 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), left 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

                if (!this.valgtLag.customPositions) this.valgtLag.customPositions = {};
                if (!this.valgtLag.customPositions[fase]) this.valgtLag.customPositions[fase] = {};

                this.valgtLag.customPositions[fase][index] = {
                    top: parseFloat(node.style.top),
                    left: parseFloat(node.style.left)
                };
            }
        };

        node.onmousedown = startDragging;
        window.addEventListener('mousemove', moveNode);
        window.addEventListener('mouseup', stopDragging);

        node.addEventListener('touchstart', startDragging, { passive: false });
        window.addEventListener('touchmove', moveNode, { passive: false });
        window.addEventListener('touchend', stopDragging);
    },

    oppdaterAlleSelectMenyer: function() {
        const tropp = this.hentAktuellTropp();
        const roles = this.valgtLag.roles || {};
        const selectIds = ['cap-select', 'pen1-select', 'pen2-select', 'corV-select', 'corH-select'];

        selectIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const lagretVerdi = roles[id] || "";
            
            el.innerHTML = '<option value="">-- Velg spiller --</option>';
            tropp.forEach(s => {
                const isSelected = s.id === lagretVerdi ? "selected" : "";
                el.innerHTML += `<option value="${s.id}" ${isSelected}>${s.navn || s.name}</option>`;
            });
        });
    },

    oppdaterTekstFelter: function() {
        const i = this.valgtLag.instructions || {};
        if(document.getElementById('off-corner-text')) document.getElementById('off-corner-text').value = i.offCorner || "";
        if(document.getElementById('def-corner-text')) document.getElementById('def-corner-text').value = i.defCorner || "";
    },

    oppdaterBenken: function() {
        const subContainer = document.getElementById('sub-plan-container');
        if (!subContainer) return;

        const tropp = this.hentAktuellTropp();
        const startelleverIder = Object.values(this.valgtLag.lineup || {});
        const benkSpillere = tropp.filter(s => !startelleverIder.includes(s.id));
        const lagretPlan = this.valgtLag.subPlan || {};
        
        if (benkSpillere.length === 0) {
            subContainer.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; padding:10px; display:block;">Ingen spillere på benken</span>';
            return;
        }

        subContainer.innerHTML = benkSpillere.map(s => `
            <div class="role-row">
                <span style="font-weight:600; font-size: 0.9rem;">${s.navn || s.name}</span>
                <select onchange="TaktikkModul.oppdaterBytteTid('${s.id}', this.value)" style="width: 50%; font-size: 0.85rem;">
                    <option value="">Ikke planlagt</option>
                    ${this.genererTidsValg(lagretPlan[s.id])}
                </select>
            </div>
        `).join('');
    },

    genererTidsValg: function(valgtTid) {
        let html = "";
        for (let min = 5; min <= 85; min += 5) {
            const verdi = `${min}. min`;
            const isSelected = valgtTid === verdi ? "selected" : "";
            html += `<option value="${verdi}" ${isSelected}>${verdi}</option>`;
        }
        const pauseSelected = valgtTid === "Pause" ? "selected" : "";
        html += `<option value="Pause" ${pauseSelected}>Pause</option>`;
        return html;
    },

    oppdaterBytteTid: function(spillerId, tid) {
        if (!this.valgtLag.subPlan || typeof this.valgtLag.subPlan === 'string') {
            this.valgtLag.subPlan = {};
        }
        this.valgtLag.subPlan[spillerId] = tid;
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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderBane(fase);
    },

    lagreTaktikk: function() {
        if (!this.matchId) return;

        this.valgtLag.roles = {
            'cap-select': document.getElementById('cap-select')?.value || "",
            'pen1-select': document.getElementById('pen1-select')?.value || "",
            'pen2-select': document.getElementById('pen2-select')?.value || "",
            'corV-select': document.getElementById('corV-select')?.value || "",
            'corH-select': document.getElementById('corH-select')?.value || ""
        };

        this.valgtLag.instructions = {
            offCorner: document.getElementById('off-corner-text')?.value || "",
            defCorner: document.getElementById('def-corner-text')?.value || ""
        };

        const tacticRef = ref(db, `tactics/${this.matchId}`);
        set(tacticRef, this.valgtLag)
            .then(() => alert("Hele kampplanen er lagret!"))
            .catch((err) => alert("Lagringsfeil: " + err));
    },

    lagreValg: function(index, playerId) {
        if (!this.valgtLag.lineup) this.valgtLag.lineup = {};
        this.valgtLag.lineup[index] = playerId;
        this.oppdaterBenken();
        
        if (this.matchId) {
            const lineupRef = ref(db, `tactics/${this.matchId}/lineup`);
            set(lineupRef, this.valgtLag.lineup);
        }
    },

    renderBane: function(fase) {
        const layer = document.getElementById('playerLayer');
        const pitchContainer = document.getElementById('pitch');
        if (!layer || !pitchContainer) return;

        pitchContainer.style.setProperty('transform', 'none', 'important');
        pitchContainer.style.setProperty('transition', 'none', 'important');
        pitchContainer.style.setProperty('transform-origin', 'initial', 'important');

        const tropp = this.hentAktuellTropp();
        const posisjoner = this.konfigurasjon[fase];
        const lineup = this.valgtLag.lineup || {};

        layer.innerHTML = ''; 

        posisjoner.forEach((p, index) => {
            const node = document.createElement('div');
            node.className = 'player-node'; 
            node.style.cursor = 'grab';

            const custom = this.valgtLag.customPositions?.[fase]?.[index];
            node.style.top = `${custom ? custom.top : p.top}%`;
            node.style.left = `${custom ? custom.left : p.left}%`;

            const lagretId = lineup[index] || "";
            const valgtSpiller = tropp.find(s => s.id === lagretId);
            
            if (p.id.includes("GK")) {
                node.style.backgroundColor = "#e67e22";
                node.style.borderColor = "#fff";
            }

            let innholdHTML = "";
            
            if (valgtSpiller) {
                const navn = valgtSpiller.navn || valgtSpiller.name;
                const initialer = this.formaterInitialer(navn);
                const etternavn = navn.split(' ').pop();
                
                innholdHTML = `
                    <div class="player-initials" style="pointer-events: none;">${initialer}</div>
                    <div class="player-full-name" style="pointer-events: none;">${etternavn}</div>
                `;
            } else {
                node.classList.add('empty');
                innholdHTML = `<div class="player-initials" style="opacity: 0.7; pointer-events: none;">${p.id}</div>`;
            }

            if (fase === "424") {
                let selectHTML = `<select onchange="TaktikkModul.lagreValg(${index}, this.value)" style="width: 90%; font-size: 9px; margin-top: 4px; border: none; border-radius: 4px; background: white; position: relative; z-index: 10;">
                    <option value="">-- Ledig --</option>`;
                
                tropp.forEach(s => {
                    const isSelected = s.id === lagretId ? "selected" : "";
                    selectHTML += `<option value="${s.id}" ${isSelected}>${s.navn || s.name}</option>`;
                });
                selectHTML += `</select>`;
                innholdHTML += selectHTML;
            }

            node.innerHTML = innholdHTML;
            this.gjorFlyttbar(node, index, fase);
            layer.appendChild(node);
        });
    }
};

window.TaktikkModul = TaktikkModul;
TaktikkModul.init();
