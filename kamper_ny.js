document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // --- GLOBALE VARIABLER FOR STATS ---
    let allMatches = []; 
    let currentView = 'kommende';
    let currentMatchGoals = [];
    let currentMatchAssists = [];
    let currentTroopNames = []; // Holder på navnene til de påmeldte for dropdowns

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
        document.getElementById('postMatchStats').style.display = 'none'; // Skjul stats ved lukk
    };

    // --- LOGIKK FOR FANER (Kommende/Tidligere) ---
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
        
        let filtrerteKamper = allMatches.filter(m => {
            const kampDato = new Date(m.date + "T23:59:59");
            return currentView === 'kommende' ? kampDato >= nå : kampDato < nå;
        });

        filtrerteKamper.sort((a, b) => {
            return currentView === 'kommende' 
                ? new Date(a.date) - new Date(b.date) 
                : new Date(b.date) - new Date(a.date);
        });

        if (filtrerteKamper.length === 0) {
            matchTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Ingen kamper registrert her.</td></tr>`;
            return;
        }

        filtrerteKamper.forEach(match => {
            const d = new Date(match.date);
            const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            
            const row = `
                <tr>
                    <td class="name-col">
                        <div style="font-weight:600;">${shortDate}</div>
                        <div style="font-size:0.8em; color:var(--text-muted);">kl. ${match.time}</div>
                    </td>
                    <td class="text-left">
                        <span style="font-weight:700; color:var(--primary); cursor:pointer; text-decoration: underline;" 
                              onclick="showMatchInfo('${match.id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">
                            ${match.opponent}
                        </span>
                    </td>
                    <td>
                        <div style="background:rgba(0,0,0,0.04); padding:4px 10px; border-radius:6px; font-weight:800; display:inline-block;">
                            ${match.result || '-'}
                        </div>
                    </td>
                    <td style="font-size:0.9em; color:var(--text-muted);">${match.pitch}</td>
                    <td style="font-size:0.85rem; font-weight:500; color:var(--text-main);">${match.type}</td>
                    <td>
                        <div style="display: flex; justify-content: center; gap: 8px;">
                            <button onclick="openEditMatch('${match.id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" 
                                    class="action-btn btn-edit" title="Rediger">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="deleteMatch('${match.id}')" 
                                    class="action-btn btn-delete" title="Slett">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            matchTableBody.innerHTML += row;
        });
    }

    // --- VIS KAMP-INFO OG SPILLERE ---
    window.showMatchInfo = (id, date, opponent, time, pitch) => {
        // Viktig: Lagre ID i det skjulte feltet så stats vet hvilken kamp det gjelder
        document.getElementById('editMatchId').value = id;

        const playerListUl = document.getElementById('matchPlayerList');
        const infoTitle = document.getElementById('infoTitle');
        const detailsDiv = document.getElementById('matchInfoDetails');
        const tacticContainer = document.getElementById('tacticBarContainer');
        
        const parts = date.split('-'); 
        const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        
        infoTitle.innerText = opponent;

        detailsDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-calendar-day" style="color: var(--primary); width: 20px;"></i> 
                    <span style="font-weight: 600;">${formattedDate} kl. ${time}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-location-dot" style="color: var(--primary); width: 20px;"></i> 
                    <span style="font-weight: 500; color: var(--text-muted);">${pitch}</span>
                </div>
            </div>
            <div class="modal-action-bar" id="toggleTropp">
                <div style="display: flex; align-items: center;">
                    <i class="fa-solid fa-users icon-left"></i>
                    <span style="font-weight: 700; color: var(--text-main);">Påmeldt tropp</span>
                    <span id="pilleAntall" style="background: var(--primary); color: white; padding: 2px 10px; border-radius: 20px; font-weight: 800; font-size: 0.75rem; margin-left: 10px;">0</span>
                </div>
                <i class="fa-solid fa-chevron-down chevron"></i>
            </div>
        `;

        tacticContainer.innerHTML = `
            <div class="modal-action-bar" id="jumpToTactic" style="margin-top: 15px;">
                <div style="display: flex; align-items: center;">
                    <i class="fa-solid fa-clipboard-list icon-left"></i>
                    <span style="font-weight: 700; color: var(--text-main);">Kampplan</span>
                </div>
                <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.9rem;"></i>
            </div>
        `;

        playerListUl.classList.remove('show');
        const toggleBtn = document.getElementById('toggleTropp');
        toggleBtn.onclick = () => {
            toggleBtn.classList.toggle('open');
            playerListUl.classList.toggle('show');
        };

        const tacticBar = document.getElementById('jumpToTactic');
        tacticBar.onclick = () => {
            const dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
            window.location.href = `taktikk.html?matchId=${id}&date=${dateKey}`;
        };

        document.getElementById('matchInfoModal').style.display = 'flex';

        // Hent spillere og lagre i currentTroopNames for stats-bruk
        window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
            const root = snapshot.val();
            const dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
            const enrolled = root.attendance ? root.attendance[dateKey] : null;
            const allPlayers = root.players;

            playerListUl.innerHTML = '';
            let list = [];

            if (enrolled && allPlayers) {
                Object.entries(enrolled).forEach(([pId, status]) => {
                    if (status === 'K') {
                        let player = allPlayers[pId] || Object.values(allPlayers).find(p => p.id === pId);
                        if (player) list.push(player.name || player.navn);
                    }
                });
                list.sort((a, b) => a.localeCompare(b, 'nb'));
            }

            currentTroopNames = list; // Lagre troppen globalt for dropdown-bruk
            
            const pille = document.getElementById('pilleAntall');
            if (pille) pille.innerText = list.length;

            if (list.length > 0) {
                list.forEach(name => {
                    const item = document.createElement('div');
                    item.style.cssText = `background: #fff; border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 0.9rem; color: var(--text-main); box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
                    item.innerText = name;
                    playerListUl.appendChild(item);
                });
            } else {
                playerListUl.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Ingen påmeldte.</div>';
            }
        }, { onlyOnce: true });
    };

    // --- STATISTIKK LOGIKK (MÅL, ASSIST, KARAKTERER) ---
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
        if (currentTroopNames.length === 0) {
            alert("Ingen spillere i troppen. Sjekk oppmøte-listen.");
            document.getElementById('postMatchStats').style.display = 'none';
            return;
        }

        const goalSelect = document.getElementById('goalSelect');
        const assistSelect = document.getElementById('assistSelect');
        const options = currentTroopNames.map(name => `<option value="${name}">${name}</option>`).join('');
        
        goalSelect.innerHTML = `<option value="">Velg spiller...</option>` + options;
        assistSelect.innerHTML = `<option value="">Velg spiller...</option>` + options;

        currentMatchGoals = [];
        currentMatchAssists = [];
        renderStatsBadges();

        const ratingBody = document.getElementById('playerRatingBody');
        ratingBody.innerHTML = currentTroopNames.map(name => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 5px; font-weight: 600;">${name}</td>
                <td style="text-align: center;">
                    <select class="off-rating" data-player="${name}" style="padding: 5px; border-radius: 4px;">
                        <option value="1">1</option>
                        <option value="0">0</option>
                    </select>
                </td>
                <td style="text-align: center;">
                    <select class="def-rating" data-player="${name}" style="padding: 5px; border-radius: 4px;">
                        <option value="1">1</option>
                        <option value="0">0</option>
                    </select>
                </td>
            </tr>
        `).join('');
    }

    window.addGoal = function() {
        const name = document.getElementById('goalSelect').value;
        if (name) { currentMatchGoals.push(name); renderStatsBadges(); }
    };

    window.addAssist = function() {
        const name = document.getElementById('assistSelect').value;
        if (name) { currentMatchAssists.push(name); renderStatsBadges(); }
    };

    function renderStatsBadges() {
        document.getElementById('goalListDisplay').innerText = currentMatchGoals.length > 0 ? "Mål: " + currentMatchGoals.join(', ') : "";
        document.getElementById('assistListDisplay').innerText = currentMatchAssists.length > 0 ? "Assist: " + currentMatchAssists.join(', ') : "";
    }

    window.saveFinalMatchStats = function() {
        const matchId = document.getElementById('editMatchId').value;
        if (!matchId) return;

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

        window.dbUpdate(window.dbRef(window.db), updates)
            .then(() => {
                alert("Kamprapport lagret!");
                document.getElementById('postMatchStats').style.display = 'none';
            })
            .catch(err => alert("Feil: " + err.message));
    };

    // --- REDIGERING OG SLETTING ---
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

        if (matchId) {
            window.dbSet(window.dbRef(window.db, `matches/${matchId}`), matchData).then(() => closeMatchModal());
        } else {
            const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
            window.dbSet(matchRef, matchData).then(() => closeMatchModal());
        }
    });

    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        allMatches = data ? Object.entries(data).map(([id, match]) => ({ id, ...match })) : [];
        renderTable(); 
    });

    window.deleteMatch = (id) => {
        if(confirm('Er du sikker på at du vil slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
