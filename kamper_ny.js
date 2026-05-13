/**
 * GLOBALE FUNKSJONER
 * Disse må ligge utenfor DOMContentLoaded for å være tilgjengelige for onclick-hendelser i HTML-strenger
 */

window.showMatchInfo = (id, date, opponent, time, pitch) => {
    const modal = document.getElementById('matchInfoModal');
    if (!modal) return;

    console.log("Åpner kampinfo for:", opponent);
    
    // Sett ID i det skjulte feltet for redigering/stats
    const editField = document.getElementById('editMatchId');
    if (editField) editField.value = id;

    // Trigger logikken som fyller modalen (definert som en event listener lenger ned)
    const event = new CustomEvent('renderMatchDetails', { 
        detail: { id, date, opponent, time, pitch } 
    });
    document.dispatchEvent(event);

    modal.style.display = 'flex';
};

document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // --- GLOBALE VARIABLER (Scope i denne funksjonen) ---
    let allMatches = []; 
    let currentMatchGoals = [];
    let currentMatchAssists = [];
    let currentTroopNames = [];

    // --- HERO-STATS ---
    function updateMatchHeroStats(matches) {
        const nå = new Date();
        nå.setHours(0, 0, 0, 0);

        const kommende = matches
            .filter(m => new Date(m.date + "T23:59:59") >= nå)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let nesteKampDato = "ingen planlagte";
        let nesteMotstander = "...";

        if (kommende.length > 0) {
            const d = new Date(kommende[0].date);
            nesteKampDato = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            nesteMotstander = kommende[0].opponent;
        }

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

    // --- TEGN TABELLEN (OPPDATERT FOR RESPONSIVITET OG KLIKK) ---
    function renderTable() {
        if (!matchTableBody) return;
        matchTableBody.innerHTML = '';
        const nå = new Date();
        nå.setHours(0, 0, 0, 0);

        const kommende = allMatches.filter(m => new Date(m.date + "T23:59:59") >= nå);
        const tidligere = allMatches.filter(m => new Date(m.date + "T23:59:59") < nå);

        kommende.sort((a, b) => new Date(a.date) - new Date(b.date));
        tidligere.sort((a, b) => new Date(b.date) - new Date(a.date));

        const lagRadHTML = (match, erTidligere) => {
            const d = new Date(match.date);
            const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
            
            return `
            <tr class="match-row" style="${erTidligere ? 'opacity: 0.8;' : ''}" 
                onclick="window.showMatchInfo('${match.id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">
                
                <td class="date-time-cell">
                    <span class="date-part">${shortDate}</span>
                    <span class="time-part">${match.time}</span>
                </td>
                
                <td class="text-left">
                    <div style="font-weight:700; color:var(--text-main);">${match.opponent}</div>
                </td>
                
                <td class="res-cell">
                    <span class="result-badge" style="background:${match.result && match.result !== '-' ? 'var(--bsk-blue)' : '#f1f2f6'}; 
                          color:${match.result && match.result !== '-' ? 'white' : '#999'}; 
                          min-width:45px; font-weight:800; display:inline-block; padding: 4px 8px; border-radius: 8px; font-size: 0.85rem;">
                        ${match.result || '-'}
                    </span>
                </td>
                
                <td class="desktop-only text-left" style="font-size:0.85rem; color:var(--text-muted);">${match.pitch}</td>
                <td class="desktop-only"><span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform: uppercase;">${match.type}</span></td>
                
                <td class="desktop-only">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button onclick="event.stopPropagation(); window.openEditMatch('${match.id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" class="action-btn btn-edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="event.stopPropagation(); window.deleteMatch('${match.id}')" class="action-btn btn-delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        };

        if (kommende.length > 0) {
            matchTableBody.innerHTML += `<tr class="table-divider"><td colspan="6" style="text-align:center; font-weight:800; background:#f8f9fa; font-size:0.7rem; color:#666; padding:12px;">KOMMENDE KAMPER</td></tr>`;
            kommende.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, false));
        }

        if (tidligere.length > 0) {
            matchTableBody.innerHTML += `<tr class="table-divider"><td colspan="6" style="text-align:center; font-weight:800; background:#f8f9fa; font-size:0.7rem; color:#666; padding:12px;">TIDLIGERE RESULTATER</td></tr>`;
            tidligere.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, true));
        }

        if (allMatches.length === 0) {
            matchTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Ingen kamper registrert.</td></tr>`;
        }
    }

    // --- LOGIKK FOR Å FYLLE KAMPINFO-MODAL ---
    document.addEventListener('renderMatchDetails', (e) => {
        const { id, date, opponent, time, pitch } = e.detail;
        
        // Oppdaterer tittelen fra "Laster..." til motstanderens navn
        const infoTitle = document.getElementById('infoTitle');
        if (infoTitle) infoTitle.innerText = opponent;

        const detailsDiv = document.getElementById('matchInfoDetails');
        const tacticContainer = document.getElementById('tacticBarContainer');
        
        const parts = date.split('-');
        const firebaseDateKey = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        const displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        const matchData = allMatches.find(m => m.id === id);

        if (!detailsDiv) return;

        detailsDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-calendar-day" style="color: var(--bsk-blue);"></i> 
                        <span style="font-weight: 600;">${displayDate} kl. ${time}</span>
                    </div>
                    <div style="background: var(--bsk-blue); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 800;">${matchData?.result || '-'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-location-dot" style="color: var(--bsk-blue);"></i> 
                    <span style="font-weight: 500; color: var(--text-muted);">${pitch}</span>
                </div>
            </div>

            <div class="modal-action-bar" id="toggleTropp" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border-color); margin-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    <i class="fa-solid fa-users" style="margin-right:10px; color:var(--bsk-blue);"></i>
                    <span style="font-weight: 700;">Påmeldt tropp</span>
                    <span id="pilleAntall" style="background: var(--bsk-blue); color: white; padding: 2px 10px; border-radius: 20px; font-weight: 800; font-size: 0.75rem; margin-left: 10px;">0</span>
                </div>
                <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </div>
            <div id="nySpillerListe" style="display: none; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;"></div>
        `;

        if (tacticContainer) {
            tacticContainer.innerHTML = `
                <div class="modal-action-bar" id="jumpToTactic" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border-color);">
                    <div style="display: flex; align-items: center;"><i class="fa-solid fa-clipboard-list" style="margin-right:10px; color:var(--bsk-blue);"></i><span style="font-weight: 700;">Kampplan</span></div>
                    <i class="fa-solid fa-arrow-right" style="color: var(--text-muted);"></i>
                </div>`;
            
            document.getElementById('jumpToTactic').onclick = () => {
                window.location.href = `taktikk.html?matchId=${id}&date=${firebaseDateKey}`;
            };
        }

        // Toggle-funksjon for spillerliste
        document.getElementById('toggleTropp').onclick = () => {
            const list = document.getElementById('nySpillerListe');
            const isHidden = list.style.display === 'none';
            list.style.display = isHidden ? 'grid' : 'none';
            const icon = document.querySelector('#toggleTropp .chevron-icon');
            if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        };

        // Firebase Henting av Tropp (K-status)
        window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
            const root = snapshot.val();
            if (!root) return;
            const players = root.players || {};
            const attendance = root.attendance || {};
            const dailyAttendance = attendance[firebaseDateKey] || {};
            
            const tropp = Object.entries(players)
                .map(([pId, data]) => ({ id: pId, ...data }))
                .filter(player => dailyAttendance[player.id] === 'K');

            currentTroopNames = tropp.map(p => p.navn || p.name).sort((a, b) => a.localeCompare(b, 'nb'));
            
            const pille = document.getElementById('pilleAntall');
            if (pille) pille.innerText = currentTroopNames.length;
            
            const nyListe = document.getElementById('nySpillerListe');
            if (nyListe) {
                if (currentTroopNames.length === 0) {
                    nyListe.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 10px;">Ingen påmeldte.</div>`;
                } else {
                    nyListe.innerHTML = currentTroopNames.map(name => `
                        <div style="background: white; border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; font-weight: 700; color: var(--bsk-blue); font-size: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            ${name}
                        </div>`).join('');
                }
            }
        }, { onlyOnce: true });
    });

    // --- STANDARD MODAL FUNKSJONER (REDIGERING) ---
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

    // --- FIREBASE HOVED-LYTTER ---
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        allMatches = data ? Object.entries(data).map(([id, match]) => ({ id, ...match })) : [];
        updateMatchHeroStats(allMatches);
        renderTable(); 
    });

    window.deleteMatch = (id) => { 
        if(confirm('Slette kampen?')) window.dbRemove(window.dbRef(window.db, `matches/${id}`)); 
    };
});
