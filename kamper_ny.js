document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // --- GLOBALE VARIABLER FOR STATS ---
    let allMatches = []; 
    let currentView = 'kommende';
    let currentMatchGoals = [];
    let currentMatchAssists = [];
    let currentTroopNames = [];

    // --- NY FUNKSJON: OPPDATERER HERO-STATS I TOPPEN ---
    function updateMatchHeroStats(matches) {
    const nå = new Date();
    nå.setHours(0, 0, 0, 0);

    // 1. Finn neste kamp
    const kommende = matches
        .filter(m => new Date(m.date + "T23:59:59") >= nå)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let nesteKampDato = "ingen planlagte";
    let nesteMotstander = "...";

    if (kommende.length > 0) {
        const d = new Date(kommende[0].date);
        nesteKampDato = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
        nesteMotstander = kommende[0].opponent; // Henter motstander-navnet
    }

    // 2. Beregn seire og mål (samme som før)
    let totalSeire = 0;
    let totalMaal = 0;

    matches.forEach(m => {
        if (m.result && m.result.includes('-')) {
            const scores = m.result.split('-').map(s => parseInt(s.trim()));
            if (scores.length === 2 && !isNaN(scores[0])) {
                totalMaal += scores[0]; 
                if (scores[0] > scores[1]) totalSeire++;
            }
        }
    });

    // Oppdater HTML
    const opponentEl = document.getElementById('stat-next-opponent');
    const dateEl = document.getElementById('stat-next-match');
    const winsEl = document.getElementById('stat-wins');
    const goalsEl = document.getElementById('stat-goals');

    if (opponentEl) opponentEl.innerText = nesteMotstander;
    if (dateEl) dateEl.innerText = nesteKampDato;
    if (winsEl) winsEl.innerText = `${totalSeire} seire`;
    if (goalsEl) goalsEl.innerText = `${totalMaal} scorede mål`;
}

    // --- MODAL KONTROLL ---
    window.openMatchModal = () => {
        document.getElementById('modalTitle').innerText = 'Registrer kamp';
        document.getElementById('matchModal').style.display = 'flex';
    };

    window.closeMatchModal = () => {
        document.getElementById('matchModal').style.display = 'none';
        matchForm.reset();
        document.getElementById('editMatchId').value = ''; 
    };

    window.closeMatchInfo = () => {
        document.getElementById('matchInfoModal').style.display = 'none';
        document.getElementById('postMatchStats').style.display = 'none';
    };

    // --- LOGIKK FOR FANER ---
    window.switchView = (view) => {
        currentView = view;
        const btnKommende = document.getElementById('btnKommende');
        const btnTidligere = document.getElementById('btnTidligere');
        if (btnKommende && btnTidligere) {
            if (view === 'kommende') {
                btnKommende.classList.add('active');
                btnTidligere.classList.remove('active');
            } else {
                btnTidligere.classList.add('active');
                btnKommende.classList.remove('active');
            }
        }
        renderTable();
    };

    // --- TEGN TABELLEN ---
    function renderTable() {
    const matchTableBody = document.getElementById('matchTableBody');
    matchTableBody.innerHTML = '';
    const nå = new Date();
    nå.setHours(0, 0, 0, 0); // Nullstiller klokkeslett for ren dato-sjekk

    // 1. Del opp i to grupper
    const kommende = allMatches.filter(m => new Date(m.date + "T23:59:59") >= nå);
    const tidligere = allMatches.filter(m => new Date(m.date + "T23:59:59") < nå);

    // 2. Sorter listene
    // Kommende: Nærmeste kamp først
    kommende.sort((a, b) => new Date(a.date) - new Date(b.date));
    // Tidligere: Siste spilte kamp øverst
    tidligere.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Hjelpefunksjon for å generere rad-HTML
    const lagRadHTML = (match, erTidligere) => {
        const d = new Date(match.date);
        const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
        
        return `
        <tr style="${erTidligere ? 'opacity: 0.85;' : ''}">
            <td class="name-col" style="min-width: 100px; padding-left: 20px;">
                <div style="font-weight:700; color:var(--text-main); line-height: 1.1; font-size: 0.95rem;">
                    ${shortDate}
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:500; margin-top: 3px;">
                    kl. ${match.time}
                </div>
            </td>
            <td class="name-col">
                <span style="font-weight:800; color:var(--bsk-blue); cursor:pointer;" 
                      onclick="showMatchInfo('${match.id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">
                    ${match.opponent}
                </span>
            </td>
            <td>
                <span class="status-pill" style="background:#f1f2f6; min-width:50px; font-weight:800; display:inline-block; padding: 4px 8px; border-radius: 8px;">
                    ${match.result || '-'}
                </span>
            </td>
            <td style="font-size:0.85rem; color:var(--text-muted); font-weight:500;">
                ${match.pitch}
            </td>
            <td>
                <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform: uppercase;">
                    ${match.type}
                </span>
            </td>
            <td>
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button onclick="openEditMatch('${match.id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" 
                            class="action-btn btn-edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteMatch('${match.id}')" 
                            class="action-btn btn-delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    };

    // 3. Tegn KOMMENDE seksjon
    if (kommende.length > 0) {
        matchTableBody.innerHTML += `
            <tr>
                <td colspan="6" style="background: #f8f9fa; padding: 12px 20px; font-weight: 800; font-size: 0.75rem; color: var(--bsk-blue); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--border-color);">
                    <i class="fa-solid fa-calendar-star" style="margin-right: 8px;"></i> Kommende Kamper
                </td>
            </tr>`;
        kommende.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, false));
    }

    // 4. Tegn TIDLIGERE seksjon (Resultater)
    if (tidligere.length > 0) {
        // Legger til litt ekstra luft før resultatene hvis det er mange kommende kamper
        const spacer = kommende.length > 0 ? 'border-top: 20px solid white;' : '';
        matchTableBody.innerHTML += `
            <tr>
                <td colspan="6" style="background: #f8f9fa; padding: 12px 20px; font-weight: 800; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--border-color); ${spacer}">
                    <i class="fa-solid fa-clock-rotate-left" style="margin-right: 8px;"></i> Tidligere Resultater
                </td>
            </tr>`;
        tidligere.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, true));
    }

    if (allMatches.length === 0) {
        matchTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Ingen kamper registrert.</td></tr>`;
    }
}

    // --- VIS KAMP-INFO ---
   window.showMatchInfo = (id, date, opponent, time, pitch) => {
    document.getElementById('editMatchId').value = id;
    const playerListUl = document.getElementById('matchPlayerList');
    const infoTitle = document.getElementById('infoTitle');
    const detailsDiv = document.getElementById('matchInfoDetails');
    const tacticContainer = document.getElementById('tacticBarContainer');
    
    // date kommer inn som YYYY-MM-DD fra koden (standard input-format)
    // Vi må konvertere den til DD-MM-YYYY for å matche din Firebase-nøkkel
    const parts = date.split('-'); 
    const firebaseDateKey = `${parts[2]}-${parts[1]}-${parts[0]}`; // Blir f.eks. "02-05-2026"
    const displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`; // Blir "02.05.2026"

    infoTitle.innerText = opponent;

    // Tegn selve info-boksen og knappen for tropp
    detailsDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-calendar-day" style="color: var(--bsk-blue); width: 20px;"></i> 
                    <span style="font-weight: 600;">${displayDate} kl. ${time}</span>
                </div>
                <div style="background: var(--bsk-blue); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 1.1rem;">
                    ${allMatches.find(m => m.id === id)?.result || '-'}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid fa-location-dot" style="color: var(--bsk-blue); width: 20px;"></i> 
                <span style="font-weight: 500; color: var(--text-muted);">${pitch}</span>
            </div>
        </div>
        <div class="modal-action-bar" id="toggleTropp" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border-color);">
            <div style="display: flex; align-items: center;">
                <i class="fa-solid fa-users" style="margin-right:10px; color:var(--bsk-blue);"></i>
                <span style="font-weight: 700;">Påmeldt tropp</span>
                <span id="pilleAntall" style="background: var(--bsk-blue); color: white; padding: 2px 10px; border-radius: 20px; font-weight: 800; font-size: 0.75rem; margin-left: 10px;">0</span>
            </div>
            <i class="fa-solid fa-chevron-down chevron-icon" style="transition: 0.3s;"></i>
        </div>
    `;

    tacticContainer.innerHTML = `
        <div class="modal-action-bar" id="jumpToTactic" style="margin-top: 15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border-color);">
            <div style="display: flex; align-items: center;"><i class="fa-solid fa-clipboard-list" style="margin-right:10px; color:var(--bsk-blue);"></i><span style="font-weight: 700;">Kampplan</span></div>
            <i class="fa-solid fa-arrow-right" style="color: var(--text-muted);"></i>
        </div>
    `;

    // Nullstill og skjul listen
    playerListUl.innerHTML = '';
    playerListUl.style.display = 'none';
    playerListUl.style.gridTemplateColumns = 'repeat(2, 1fr)';
    playerListUl.style.gap = '10px';
    playerListUl.style.marginTop = '15px';

    const toggleBtn = document.getElementById('toggleTropp');
    toggleBtn.onclick = () => {
        const isHidden = playerListUl.style.display === 'none';
        playerListUl.style.display = isHidden ? 'grid' : 'none';
        const icon = toggleBtn.querySelector('.chevron-icon');
        if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    };

    const tacticBar = document.getElementById('jumpToTactic');
    tacticBar.onclick = () => {
        window.location.href = `taktikk.html?matchId=${id}&date=${firebaseDateKey}`;
    };

    document.getElementById('matchInfoModal').style.display = 'flex';

    // Hent troppen fra Firebase
    window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
        const root = snapshot.val();
        if (!root) return;

        const enrolled = root.attendance ? root.attendance[firebaseDateKey] : null;
        const allPlayers = root.players;
        
        playerListUl.innerHTML = '';
        let list = [];

        if (enrolled) {
            Object.entries(enrolled).forEach(([pId, status]) => {
                if (status === 'K') {
                    // Sjekker om pId finnes i players-mappen for å få navnet, 
                    // hvis ikke bruker vi selve IDen (hvis den er lagret som tekst)
                    let name = pId;
                    if (allPlayers && allPlayers[pId]) {
                        name = allPlayers[pId].navn || allPlayers[pId].name || pId;
                    }
                    list.push(name);
                }
            });
            list.sort((a, b) => a.localeCompare(b, 'nb'));
        }

        if (document.getElementById('pilleAntall')) document.getElementById('pilleAntall').innerText = list.length;
        
        if (list.length === 0) {
            playerListUl.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 15px; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Ingen påmeldte spillere funnet.</div>';
        } else {
            list.forEach(name => {
                const item = document.createElement('div');
                item.style.cssText = `background: #fff; border: 1px solid var(--border-color); padding: 12px 10px; border-radius: 10px; text-align: center; font-weight: 700; font-size: 0.85rem; color: var(--bsk-blue);`;
                item.innerText = name;
                playerListUl.appendChild(item);
            });
        }
    }, { onlyOnce: true });
};

    // --- STATISTIKK LOGIKK ---
    window.toggleStatsEdit = function() {
        const container = document.getElementById('postMatchStats');
        const isVisible = container.style.display === 'block';
        if (!isVisible) {
            container.style.display = 'block';
            prepareStatsForm();
        } else {
            container.style.display = 'none';
        }
    };

    function prepareStatsForm() {
        const matchId = document.getElementById('editMatchId').value;
        const matchData = allMatches.find(m => m.id === matchId);
        const savedRatings = matchData?.playerRatings || {};

        if (currentTroopNames.length === 0) {
            alert("Ingen spillere i troppen.");
            document.getElementById('postMatchStats').style.display = 'none';
            return;
        }

        const container = document.getElementById('postMatchStats');
        container.innerHTML = `
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Målscorer</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="goalSelect" class="form-control" style="flex: 1;"></select>
                        <button type="button" onclick="window.addGoal()" style="background: var(--bsk-blue); color: white; border:none; padding: 0 15px; border-radius:10px;">+</button>
                    </div>
                    <div id="goalListDisplay" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Assist</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="assistSelect" class="form-control" style="flex: 1;"></select>
                        <button type="button" onclick="window.addAssist()" style="background: #27ae60; color: white; border:none; padding: 0 15px; border-radius:10px;">+</button>
                    </div>
                    <div id="assistListDisplay" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <label style="font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 10px; color: var(--text-main);">Vurdering (2=Bra, 1=Innpå, 0=Dårlig)</label>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 10px; max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid #ddd;">
                                <th style="padding: 5px;">Navn</th>
                                <th style="text-align: center;">OFF</th>
                                <th style="text-align: center;">DEF</th>
                            </tr>
                        </thead>
                        <tbody id="playerRatingBody"></tbody>
                    </table>
                </div>
            </div>
            <button type="button" onclick="window.saveFinalMatchStats()" style="width:100%; background: var(--bsk-blue); color:white; border:none; padding:14px; border-radius:12px; font-weight:700; margin-top:15px; cursor:pointer;">LAGRE RAPPORT</button>
        `;

        const goalSelect = document.getElementById('goalSelect');
        const assistSelect = document.getElementById('assistSelect');
        const options = currentTroopNames.map(name => `<option value="${name}">${name}</option>`).join('');
        goalSelect.innerHTML = `<option value="">Velg...</option>` + options;
        assistSelect.innerHTML = `<option value="">Velg...</option>` + options;

        currentMatchGoals = matchData?.goalScorers ? matchData.goalScorers.split(', ').filter(s => s !== "") : [];
        currentMatchAssists = matchData?.assists ? matchData.assists.split(', ').filter(s => s !== "") : [];
        renderStatsBadges();

        const ratingBody = document.getElementById('playerRatingBody');
        ratingBody.innerHTML = currentTroopNames.map(name => {
            const r = savedRatings[name] || { off: 1, def: 1 };
            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 5px; font-weight: 600;">${name}</td>
                    <td style="text-align: center;">
                        <select class="off-rating" data-player="${name}" style="padding:2px; border-radius:4px;">
                            <option value="2" ${r.off == 2 ? 'selected' : ''}>2</option>
                            <option value="1" ${r.off == 1 ? 'selected' : ''}>1</option>
                            <option value="0" ${r.off == 0 ? 'selected' : ''}>0</option>
                        </select>
                    </td>
                    <td style="text-align: center;">
                        <select class="def-rating" data-player="${name}" style="padding:2px; border-radius:4px;">
                            <option value="2" ${r.def == 2 ? 'selected' : ''}>2</option>
                            <option value="1" ${r.def == 1 ? 'selected' : ''}>1</option>
                            <option value="0" ${r.def == 0 ? 'selected' : ''}>0</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.addGoal = function() {
        const name = document.getElementById('goalSelect').value;
        if (name) { currentMatchGoals.push(name); renderStatsBadges(); }
    };

    window.addAssist = function() {
        const name = document.getElementById('assistSelect').value;
        if (name) { currentMatchAssists.push(name); renderStatsBadges(); }
    };

    window.removeGoal = function(index) {
        currentMatchGoals.splice(index, 1);
        renderStatsBadges();
    };

    window.removeAssist = function(index) {
        currentMatchAssists.splice(index, 1);
        renderStatsBadges();
    };

    function renderStatsBadges() {
        const goalDisplay = document.getElementById('goalListDisplay');
        const assistDisplay = document.getElementById('assistListDisplay');
        goalDisplay.innerHTML = currentMatchGoals.map((name, index) => `<span onclick="window.removeGoal(${index})" style="background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:20px; font-size:0.8rem; cursor:pointer; border:1px solid #2e7d32;">${name} &times;</span>`).join('');
        assistDisplay.innerHTML = currentMatchAssists.map((name, index) => `<span onclick="window.removeAssist(${index})" style="background:#e3f2fd; color:#1565c0; padding:4px 10px; border-radius:20px; font-size:0.8rem; cursor:pointer; border:1px solid #1565c0;">${name} &times;</span>`).join('');
    }

    window.saveFinalMatchStats = function() {
        const matchId = document.getElementById('editMatchId').value;
        const ratings = {};
        document.querySelectorAll('.off-rating').forEach(el => {
            const player = el.getAttribute('data-player');
            ratings[player] = {
                off: parseInt(el.value),
                def: parseInt(document.querySelector(`.def-rating[data-player="${player}"]`).value)
            };
        });
        const updates = {};
        updates[`matches/${matchId}/goalScorers`] = currentMatchGoals.join(', ');
        updates[`matches/${matchId}/assists`] = currentMatchAssists.join(', ');
        updates[`matches/${matchId}/playerRatings`] = ratings;
        
        window.dbUpdate(window.dbRef(window.db), updates).then(() => {
            alert("Rapport lagret!");
            document.getElementById('postMatchStats').style.display = 'none';
        });
    };

    // --- STANDARD MODAL FUNKSJONER ---
    window.openEditMatch = (id, date, time, opponent, pitch, type, result) => {
        document.getElementById('modalTitle').innerText = 'Rediger kamp';
        document.getElementById('editMatchId').value = id;
        document.getElementById('matchDate').value = date;
        document.getElementById('matchTime').value = time === '--:--' ? '' : time;
        document.getElementById('opponent').value = opponent;
        document.getElementById('pitch').value = pitch === 'Ikke satt' ? '' : pitch;
        document.getElementById('matchType').value = type;
        document.getElementById('result').value = result === '-' ? '' : result;
        document.getElementById('matchModal').style.display = 'flex';
    };

    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const matchId = document.getElementById('editMatchId').value;
        const matchData = {
            date: document.getElementById('matchDate').value,
            time: document.getElementById('matchTime').value || '--:--',
            opponent: document.getElementById('opponent').value,
            pitch: document.getElementById('pitch').value || 'Ikke satt',
            type: document.getElementById('matchType').value,
            result: document.getElementById('result').value || '-'
        };
        const path = matchId ? `matches/${matchId}` : `matches/${window.dbPush(window.dbRef(window.db, 'matches')).key}`;
        window.dbSet(window.dbRef(window.db, path), matchData).then(() => window.closeMatchModal());
    });

    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        allMatches = data ? Object.entries(data).map(([id, match]) => ({ id, ...match })) : [];
        updateMatchHeroStats(allMatches); // Oppdaterer den blå boksen
        renderTable(); 
    });

    window.deleteMatch = (id) => {
        if(confirm('Slette kampen?')) window.dbRemove(window.dbRef(window.db, `matches/${id}`));
    };
});
