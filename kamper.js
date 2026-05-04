document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // Åpne/Lukke modal for registrering
    window.openMatchModal = () => {
        document.getElementById('modalTitle').innerText = 'Registrer kamp';
        document.getElementById('matchModal').style.display = 'flex';
    };

    window.closeMatchModal = () => {
        document.getElementById('matchModal').style.display = 'none';
        matchForm.reset();
        document.getElementById('editMatchId').value = ''; 
    };

    // --- LOGIKK FOR FANER (Kommende/Tidligere) ---
    let allMatches = []; 
    let currentView = 'kommende';

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
    
    // 1. Filtrering (beholder din logikk for å inkludere kamper ut dagen)
    let filtrerteKamper = allMatches.filter(m => {
        const kampDato = new Date(m.date + "T23:59:59");
        return currentView === 'kommende' ? kampDato >= nå : kampDato < nå;
    });

    // 2. Sortering (nærmeste kamp først for kommende, nyeste først for tidligere)
    filtrerteKamper.sort((a, b) => {
        return currentView === 'kommende' 
            ? new Date(a.date) - new Date(b.date) 
            : new Date(b.date) - new Date(a.date);
    });

    // 3. Generering av rader
    if (filtrerteKamper.length === 0) {
        matchTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Ingen kamper registrert her.</td></tr>`;
        return;
    }

    filtrerteKamper.forEach(match => {
        const d = new Date(match.date);
        const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
        
        // Bruker 'name-col' for sticky-effekt og inline-stil for å matche din dash-card følelse
        const row = `
            <tr>
                <td class="name-col">
                    <div style="font-weight:600;">${shortDate}</div>
                    <div style="font-size:0.8em; color:var(--text-muted);">kl. ${match.time}</div>
                </td>
                <td class="text-left">
                    <span style="font-weight:700; color:var(--primary); cursor:pointer;" 
                          onclick="showMatchInfo('${match.id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">
                        ${match.opponent}
                    </span>
                </td>
                <td>
                    <div style="background:rgba(0,0,0,0.04); padding:4px 10px; border-radius:6px; font-weight:800; display:inline-block;">
                        ${match.result}
                    </div>
                </td>
                <td style="font-size:0.9em; color:var(--text-muted);">${match.pitch}</td>
                <td>
                    <span class="status-pill" style="width:auto; padding:0 10px; font-size:0.75em; border-radius:4px; background:var(--primary);">
                        ${match.type}
                    </span>
                </td>
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
        const playerListUl = document.getElementById('matchPlayerList');
        const infoTitle = document.getElementById('infoTitle');
        const detailsDiv = document.getElementById('matchInfoDetails');
        
        const parts = date.split('-'); 
        const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        
        infoTitle.innerText = opponent;
        infoTitle.style.padding = '0 20px'; 
        infoTitle.style.fontSize = '1.8em';
        infoTitle.style.fontWeight = '800';
        infoTitle.style.color = '#222';
        infoTitle.style.marginBottom = '5px';

        detailsDiv.style.padding = '0 20px';
        detailsDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; color: #555; font-size: 1em; border-bottom: 1px solid #eee; padding: 10px 0 20px 0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-calendar-day" style="width: 20px; color: #007bff;"></i> 
                    <span>${formattedDate} kl. ${time}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-location-dot" style="width: 20px; color: #007bff;"></i> 
                    <span>${pitch}</span>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <span style="font-weight: 700; font-size: 1.15em; color: #222;">Påmeldte spillere</span>
                <span id="pilleAntall" style="background: #007bff; color: white; padding: 3px 12px; border-radius: 20px; font-weight: 800; font-size: 0.85em; box-shadow: 0 2px 4px rgba(0,123,255,0.2);">0</span>
            </div>
        `;

        playerListUl.style.padding = '0 20px 20px 20px'; 
        playerListUl.style.display = 'grid';
        playerListUl.style.gridTemplateColumns = 'repeat(2, 1fr)';
        playerListUl.style.gap = '10px';
        playerListUl.innerHTML = '<div style="grid-column: 1/-1; color:#999;">Henter tropp...</div>';

        // --- OPPSTART: LEGG TIL TAKTIKK-KNAPP I MODAL ---
        const modalFooter = document.querySelector('#matchInfoModal .button-group');
        
        // Rydd opp: Fjern gammel knapp hvis den finnes fra forrige gang modalen var åpen
        const existingBtn = document.getElementById('tacticJumpBtn');
        if (existingBtn) existingBtn.remove();

        const tacticBtn = document.createElement('button');
        tacticBtn.id = 'tacticJumpBtn';
        tacticBtn.className = 'btn btn-grow-2';
        tacticBtn.style.background = '#28a745'; // Grønn farge for taktikk
        tacticBtn.style.color = 'white';
        tacticBtn.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Lag Kamptaktikk';

        // Funksjonalitet: Hopp til taktikk.html med kamp-info i URL
        tacticBtn.onclick = () => {
            const dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
            window.location.href = `taktikk.html?matchId=${id}&date=${dateKey}`;
        };

        // Legg knappen først i knapperaden (før "Lukk"-knappen)
        if (modalFooter) modalFooter.prepend(tacticBtn);

        document.getElementById('matchInfoModal').style.display = 'flex';

        window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
            const root = snapshot.val();
            const enrolled = root.attendance ? root.attendance[`${parts[2]}-${parts[1]}-${parts[0]}`] : null;
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

            const pille = document.getElementById('pilleAntall');
            if (pille) pille.innerText = list.length;

            if (list.length > 0) {
                list.forEach(name => {
                    const item = document.createElement('div');
                    item.style.background = '#fcfcfc';
                    item.style.border = '1px solid #efefef';
                    item.style.padding = '12px 5px';
                    item.style.borderRadius = '6px';
                    item.style.textAlign = 'center';
                    item.style.fontWeight = '600';
                    item.style.fontSize = '0.95em';
                    item.style.color = '#333';
                    item.innerText = name;
                    playerListUl.appendChild(item);
                });
            } else {
                playerListUl.innerHTML = '<div style="grid-column: 1/-1; color:#999; font-style:italic;">Ingen spillere er påmeldt ennå.</div>';
            }
        }, { onlyOnce: true });
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

    // --- HENT DATA FRA FIREBASE ---
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allMatches = Object.entries(data).map(([id, match]) => ({ id, ...match }));
        } else {
            allMatches = [];
        }
        renderTable(); 
    });

    window.deleteMatch = (id) => {
        if(confirm('Er du sikker på at du vil slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
