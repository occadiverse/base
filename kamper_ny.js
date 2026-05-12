document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // --- GLOBALE VARIABLER ---
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

    // --- TEGN TABELLEN (OPPDATERT FOR TID OG RES) ---
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
                    <div style="display: flex; justify-content: center; gap: 8px;" onclick="event.stopPropagation()">
                        <button onclick="window.openEditMatch('${match.id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" class="action-btn btn-edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="window.deleteMatch('${match.id}')" class="action-btn btn-delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        };

        if (kommende.length > 0) {
            matchTableBody.innerHTML += `<tr class="table-divider"><td colspan="6">KOMMENDE KAMPER</td></tr>`;
            kommende.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, false));
        }

        if (tidligere.length > 0) {
            matchTableBody.innerHTML += `<tr class="table-divider"><td colspan="6">TIDLIGERE RESULTATER</td></tr>`;
            tidligere.forEach(m => matchTableBody.innerHTML += lagRadHTML(m, true));
        }

        if (allMatches.length === 0) {
            matchTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Ingen kamper registrert.</td></tr>`;
        }
    }

    // --- (Resten av koden for modal, stats og firebase forblir uendret) ---
    // ... (visMatchInfo, addGoal, saveStats osv) ...

    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        allMatches = data ? Object.entries(data).map(([id, match]) => ({ id, ...match })) : [];
        updateMatchHeroStats(allMatches);
        renderTable(); 
    });

    window.deleteMatch = (id) => { if(confirm('Slette kampen?')) window.dbRemove(window.dbRef(window.db, `matches/${id}`)); };
});
