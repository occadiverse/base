function setMatchTimeFilter(filterType) {
    window.activeTimeFilter = filterType;

    const btnKommende = document.getElementById('btn-filter-kommende');
    const btnTidligere = document.getElementById('btn-filter-tidligere');
    const activeClass = "portal-segment-btn is-active";
    const inactiveClass = "portal-segment-btn";

    if (btnKommende && btnTidligere) {
        if (filterType === 'kommende') {
            btnKommende.className = activeClass;
            btnTidligere.className = inactiveClass;
        } else {
            btnTidligere.className = activeClass;
            btnKommende.className = inactiveClass;
        }
    }

    applyFilters();
}

function applyFilters() {
    const tableBody = document.getElementById('matchTableBody');
    const noMatchesView = document.getElementById('no-matches-view');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    const currentTimeFilter = window.activeTimeFilter || 'kommende';
    const kamperLagFilter = document.getElementById('kamperLagFilterSelect') ? document.getElementById('kamperLagFilterSelect').value : 'Alle';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = matches.filter(m => {
        if (!m.date) return false;

        const matchDate = new Date(m.date);
        matchDate.setHours(0, 0, 0, 0);

        const matchesTime = currentTimeFilter === 'kommende' ? matchDate >= today : matchDate < today;
        const matchesLag = kamperLagFilter === 'Alle' || m.matchGroup === kamperLagFilter;

        return matchesTime && matchesLag;
    });

    const sortedMatches = [...filtered].sort((a, b) =>
        currentTimeFilter === 'kommende' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
    );

    if (sortedMatches.length === 0) {
        if (noMatchesView) noMatchesView.classList.remove('hidden');
        return;
    }

    if (noMatchesView) noMatchesView.classList.add('hidden');

    sortedMatches.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-sky-50/60 active:bg-slate-100 transition-all border-b border-slate-100 cursor-pointer";
        tr.onclick = () => showMatchDetails(m.id);

        const dateFormatted = new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
        let resultBadge = `<span class="text-slate-400 font-medium">-</span>`;
        const matchMeta = `${m.matchGroup || 'Lag'} · ${m.matchType || 'Kamp'}`;

        if (m.result) {
            const score = parseScore(m.result);

            if (score) {
                if (score.bsk > score.opponent) resultBadge = `<span class="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-200">${m.result}</span>`;
                else if (score.bsk === score.opponent) resultBadge = `<span class="inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200">${m.result}</span>`;
                else resultBadge = `<span class="inline-flex items-center justify-center bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-200">${m.result}</span>`;
            } else {
                resultBadge = `<span class="text-slate-600 font-bold">${m.result}</span>`;
            }
        }

        tr.innerHTML = `
            <td class="py-3.5 px-4 md:px-6 font-bold text-slate-900">
                <div class="min-w-[180px]">
                    <div class="flex flex-col min-w-0">
                        <span class="truncate">${m.opponent}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wide">${matchMeta}</span>
                        <span class="text-[10px] text-slate-400 font-normal lg:hidden truncate">${m.pitch || 'Ingen bane'}</span>
                    </div>
                </div>
            </td>
            <td class="py-3.5 px-4 text-center text-slate-600 font-semibold">${dateFormatted}</td>
            <td class="py-3.5 px-2 text-center text-slate-500 font-medium text-xs">${m.time || '--:--'}</td>
            <td class="py-3.5 px-4 text-center">${resultBadge}</td>
            <td class="py-3.5 px-6 text-left hidden lg:table-cell text-slate-600">${m.pitch || '<span class="text-slate-300">Ikke oppgitt</span>'}</td>
            <td class="py-3.5 px-6 text-left hidden lg:table-cell"><span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">${m.matchType}</span></td>
            <td class="py-3.5 px-4 md:px-6 text-right">
                <button type="button" onclick="event.stopPropagation(); showMatchDetails('${m.id}')" class="portal-btn portal-btn-secondary portal-btn-xs">
                    <i class="fa-solid fa-clipboard-list text-[10px]"></i>
                    <span class="hidden sm:inline">Detaljer</span>
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

window.openMatchModal = function(editId = null) {
    const modal = document.getElementById('matchModal');
    document.getElementById('matchForm').reset();
    document.getElementById('editMatchId').value = '';
    updateDynamicSelectors();

    if (editId) {
        const matchObj = (window.activeMatches || []).find(m => m.id === editId);

        if (matchObj) {
            document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-bsk-yellow"></i> Rediger Kamp`;
            document.getElementById('editMatchId').value = matchObj.id;
            document.getElementById('matchDate').value = matchObj.date;
            document.getElementById('matchTime').value = matchObj.time || '';
            document.getElementById('opponent').value = matchObj.opponent;
            document.getElementById('pitch').value = matchObj.pitch || '';
            document.getElementById('matchType').value = matchObj.matchType;
            document.getElementById('matchGroup').value = matchObj.matchGroup || 'Lag A';
            document.getElementById('result').value = matchObj.result || '';
        }
    } else {
        document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-calendar-plus text-bsk-yellow"></i> Registrer Ny Kamp`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeMatchModal = function() {
    document.getElementById('matchModal').classList.add('hidden');
    document.getElementById('matchModal').classList.remove('flex');
};

window.saveMatch = async function(event) {
    event.preventDefault();

    const matchId = document.getElementById('editMatchId').value || null;
    const existingMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const matchData = {
        id: matchId,
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        opponent: document.getElementById('opponent').value,
        pitch: document.getElementById('pitch').value,
        matchType: document.getElementById('matchType').value,
        matchGroup: document.getElementById('matchGroup').value,
        result: document.getElementById('result').value,
        scorers: existingMatch ? (existingMatch.scorers || {}) : {},
        assists: existingMatch ? (existingMatch.assists || {}) : {},
        ratings: existingMatch ? (existingMatch.ratings || {}) : {}
    };

    await window.saveMatchToDatabase(matchData);
    window.closeMatchModal();
    window.closeMatchInfo();
};

window.promptDeleteMatch = function(id) {
    window.customConfirm("Slette kamp?", "Er du sikker på at du ønsker å slette denne kampen permanent fra terminlisten?", async () => {
        await window.deleteMatchFromDatabase(id);
        window.closeMatchInfo();
    });
};

window.showMatchDetails = function(id) {
    activeDetailsId = id;

    const match = (window.activeMatches || []).find(m => m.id === id);
    if (!match) return;

    const container = document.getElementById('kampdetaljer-info');
    const dateValue = new Date(match.date);
    const dateFormatted = Number.isNaN(dateValue.getTime())
        ? 'Dato ikke satt'
        : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
    const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    const matchTypeLabel = match.matchType || 'Kamp';
    const parsedScore = match.result ? parseScore(match.result) : null;
    const displayedResult = parsedScore ? `${parsedScore.opponent}-${parsedScore.bsk}` : match.result;
    const centerValue = match.result ? displayedResult : (match.time || '--:--');
    const centerLabel = match.result ? (match.time ? `Kl. ${match.time}` : 'Sluttresultat') : 'Kampstart';
    const durationLabel = match.duration || '90 min';
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
    const escapeJsString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const teamPlayers = (window.activePlayers || [])
        .filter(p => p.status !== 'Passiv' && (!match.matchGroup || p.spillerLag === match.matchGroup))
        .sort((a, b) => (Number(a.drakt) || 999) - (Number(b.drakt) || 999) || a.navn.localeCompare(b.navn));
    const attendingNames = match.attendance
        ? Object.keys(match.attendance).filter(navn => match.attendance[navn] === true)
        : [];
    const attendingNameSet = new Set(attendingNames);
    const benchPlayers = teamPlayers
        .filter(p => attendingNameSet.has(p.navn))
        .sort((a, b) => (Number(a.drakt) || 999) - (Number(b.drakt) || 999) || a.navn.localeCompare(b.navn));
    const fallbackBenchPlayers = attendingNames
        .filter(name => !benchPlayers.some(p => p.navn === name))
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({ navn: name, drakt: '' }));
    const selectedPlayers = [...benchPlayers, ...fallbackBenchPlayers];
    const teamCount = teamPlayers.length || selectedPlayers.length;
    const selectedCountLabel = teamCount
        ? `${selectedPlayers.length} av ${teamCount} påmeldt`
        : `${selectedPlayers.length} påmeldt`;
    const getLastName = (name) => {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : 'Spiller';
    };
    const getInitials = (name) => String(name || 'S')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'S';
    const benchPlayersHtml = selectedPlayers.length
        ? selectedPlayers.map(player => {
            const jersey = player.drakt ? `${escapeHtml(player.drakt)}. ` : '';
            const lastName = getLastName(player.navn);
            return `
                <div class="match-bench-player">
                    <span class="match-bench-avatar">${escapeHtml(getInitials(player.navn))}</span>
                    <span class="match-bench-name">${jersey}${escapeHtml(lastName)}</span>
                </div>
            `;
        }).join('')
        : `
            <div class="match-bench-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>Ingen spillere er meldt på ennå.</span>
            </div>
        `;

    container.innerHTML = `
        <article class="match-detail-card">
            <div class="match-detail-card-top">
                <div class="match-detail-meta">
                    <i class="fa-regular fa-calendar-days"></i>
                    <span>${dateLabel}</span>
                </div>
                <div class="match-detail-chip">
                    <i class="fa-solid fa-futbol"></i>
                    <span>${matchTypeLabel}</span>
                </div>
            </div>

            <div class="match-detail-main">
                <div class="match-detail-team">
                    <div class="match-detail-crest match-detail-crest-opponent">
                        <i class="fa-solid fa-shield"></i>
                    </div>
                    <span class="match-detail-team-name">${match.opponent}</span>
                </div>

                <div class="match-detail-center">
                    <span class="match-detail-time">${centerValue}</span>
                    <span class="match-detail-sub">${centerLabel}</span>
                </div>

                <div class="match-detail-team">
                    <div class="match-detail-crest">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <span class="match-detail-team-name">Bækkelaget</span>
                </div>
            </div>

            <div class="match-detail-footer">
                <div class="match-detail-footer-item" title="${match.pitch || 'Ikke fastsatt'}">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${match.pitch || 'Ikke fastsatt'}</span>
                </div>
                <div class="match-detail-footer-item">
                    <i class="fa-regular fa-clock"></i>
                    <span>${durationLabel}</span>
                </div>
            </div>
        </article>

        <section class="match-bench-panel">
            <div class="match-bench-action-row">
                <div class="match-bench-count">
                    <i class="fa-solid fa-clipboard-user"></i>
                    <span>${selectedCountLabel}</span>
                </div>
                <div class="match-bench-actions">
                    <button type="button" onclick="window.openAttendanceModal('match_${escapeJsString(match.id)}')" class="match-bench-action-btn">
                        <i class="fa-solid fa-user-check"></i>
                        <span>Oppmøte</span>
                    </button>
                    <button type="button" onclick="window.openMatchModal('${escapeJsString(match.id)}')" class="match-bench-icon-btn" title="Rediger kamp">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
            </div>

            <div class="match-bench-heading">
                <h3>Benk</h3>
                <span>Påmeldte spillere</span>
            </div>

            <div class="match-bench-list">
                ${benchPlayersHtml}
            </div>
        </section>

        <div class="match-detail-summary match-detail-summary-single">
            <div class="match-detail-bb-card">
                <i class="fa-solid fa-crown match-detail-bb-watermark"></i>
                <div class="match-detail-bb-icon">
                    <i class="fa-solid fa-crown"></i>
                </div>
                <div class="min-w-0">
                    <span class="match-detail-bb-label">Banens Beste (BB)</span>
                    <span class="match-detail-bb-value">${match.motm || '<span class="text-slate-400">Ikke kåret</span>'}</span>
                </div>
            </div>
        </div>
    `;

    renderPlayerRowForm(match);
    switchTab('kampdetaljer');
};

window.closeMatchInfo = function() {
    switchTab('kamper');
};

window.goToMatchTactics = function(matchId) {
    window.switchTab('taktikk');
    setTimeout(() => {
        const tacticalSelect = document.getElementById('tacticalMatchSelect');
        if (tacticalSelect) {
            tacticalSelect.value = matchId;
            window.loadMatchTactics();
        }
    }, 50);
};

window.toggleMotm = function(btn) {
    const isActive = btn.getAttribute('data-active') === 'true';

    document.querySelectorAll('.player-motm-btn').forEach(b => {
        b.setAttribute('data-active', 'false');
        b.classList.remove('bg-indigo-100', 'border-indigo-300', 'text-indigo-950', 'shadow-sm', 'scale-95');
        b.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300');
    });

    if (!isActive) {
        btn.setAttribute('data-active', 'true');
        btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300');
        btn.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-950', 'shadow-sm', 'scale-95');
    }
};

window.renderPlayerRowForm = function(match) {
    const formList = document.getElementById('kampdetaljer-spillerbors');
    if (!formList) return;

    formList.innerHTML = '';

    const attendingPlayers = match.attendance
        ? Object.keys(match.attendance).filter(navn => match.attendance[navn] === true)
        : [];

    if (attendingPlayers.length === 0) {
        formList.innerHTML = `
            <div class="py-8 text-center text-slate-500 text-sm">
                <i class="fa-solid fa-clipboard-user text-3xl text-slate-300 mb-3 block"></i>
                Ingen spillere er registrert med oppmøte på denne kampen enda.<br>
                <span class="text-xs mt-1 block">Trykk på <b>"Før Oppmøte / Tropp"</b> for å velge hvem som spilte!</span>
            </div>`;
        return;
    }

    const sortedPlayers = [...(window.activePlayers || [])]
        .filter(p => attendingPlayers.includes(p.navn))
        .sort((a, b) => a.navn.localeCompare(b.navn));

    sortedPlayers.forEach(playerObj => {
        const player = playerObj.navn;
        const prevGoals = match.scorers ? (match.scorers[player] || 0) : 0;
        const prevAssists = match.assists ? (match.assists[player] || 0) : 0;
        const prevRating = match.ratings ? (match.ratings[player] || 0) : 0;
        const hasYellow = match.guleKort && match.guleKort.includes(player);
        const hasRed = match.rodeKort && match.rodeKort.includes(player);
        const isMotm = match.motm === player;
        const scoreOptions = [0,1,2,3,4,5,6,7,8,9,10];

        const div = document.createElement('div');
        div.className = "py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2";
        div.innerHTML = `
            <span class="font-bold text-slate-800 text-xs">${player}</span>
            <div class="flex items-end gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div class="match-stat-field">
                    <span class="match-stat-label">Mål</span>
                    <select class="player-goals-input portal-field portal-field-sm match-stat-select" data-player="${player}" aria-label="Mål for ${player}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevGoals) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field">
                    <span class="match-stat-label">Ass</span>
                    <select class="player-assists-input portal-field portal-field-sm match-stat-select" data-player="${player}" aria-label="Assist for ${player}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevAssists) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field">
                    <span class="match-stat-label">Børs</span>
                    <select class="player-rating-select portal-field portal-field-sm match-stat-select match-stat-select-rating" data-player="${player}" aria-label="Børs for ${player}">
                        <option value="0" ${prevRating === 0 ? 'selected' : ''}>--</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(v => `<option value="${v}" ${prevRating === v ? 'selected' : ''}>${v} ★</option>`).join('')}
                    </select>
                </div>

                <div class="flex items-center space-x-1 border-l border-slate-200 pl-2 ml-1">
                    <button type="button" onclick="toggleCard(this, 'yellow')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasYellow ? 'bg-yellow-400 border-yellow-500 text-slate-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'}" data-player="${player}" data-type="yellow" data-active="${hasYellow ? 'true' : 'false'}">🟨</button>
                    <button type="button" onclick="toggleCard(this, 'red')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasRed ? 'bg-red-500 border-red-600 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-red-50 hover:text-red-400 hover:border-red-200'}" data-player="${player}" data-type="red" data-active="${hasRed ? 'true' : 'false'}">🟥</button>
                    <button type="button" onclick="toggleMotm(this)" class="player-motm-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${isMotm ? 'bg-indigo-100 border-indigo-300 text-indigo-950 shadow-sm scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}" data-player="${player}" data-active="${isMotm ? 'true' : 'false'}">BB</button>
                </div>
            </div>
        `;
        formList.appendChild(div);
    });
};

window.toggleCard = function(btn, type) {
    const isActive = btn.getAttribute('data-active') === 'true';
    const newState = !isActive;
    btn.setAttribute('data-active', newState);

    if (type === 'yellow') {
        if (newState) {
            btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300', 'text-white', 'hover:bg-yellow-50', 'hover:text-yellow-600', 'hover:border-yellow-200');
            btn.classList.add('bg-yellow-400', 'border-yellow-500', 'text-slate-900', 'shadow-inner', 'scale-95');
        } else {
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-yellow-50', 'hover:text-yellow-600', 'hover:border-yellow-200');
            btn.classList.remove('bg-yellow-400', 'border-yellow-500', 'text-white', 'text-slate-900', 'shadow-inner', 'scale-95');
        }
    } else if (type === 'red') {
        if (newState) {
            btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-red-50', 'hover:text-red-400', 'hover:border-red-200');
            btn.classList.add('bg-red-500', 'border-red-600', 'text-white', 'shadow-inner', 'scale-95');
        } else {
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-red-50', 'hover:text-red-400', 'hover:border-red-200');
            btn.classList.remove('bg-red-500', 'border-red-600', 'text-white', 'shadow-inner', 'scale-95');
        }
    }
};

window.savePlayerMatchStats = async function() {
    const match = (window.activeMatches || []).find(m => m.id === activeDetailsId);
    if (!match) return;

    const scorers = {};
    const assists = {};
    const ratings = {};
    const guleKort = [];
    const rodeKort = [];

    document.querySelectorAll('.player-goals-input').forEach(input => {
        const val = parseInt(input.value);
        if (val > 0) scorers[input.dataset.player] = val;
    });

    document.querySelectorAll('.player-assists-input').forEach(input => {
        const val = parseInt(input.value);
        if (val > 0) assists[input.dataset.player] = val;
    });

    document.querySelectorAll('.player-rating-select').forEach(select => {
        const val = parseInt(select.value);
        if (val > 0) ratings[select.dataset.player] = val;
    });

    document.querySelectorAll('.player-card-btn').forEach(btn => {
        if (btn.getAttribute('data-active') === 'true') {
            if (btn.getAttribute('data-type') === 'yellow') guleKort.push(btn.dataset.player);
            if (btn.getAttribute('data-type') === 'red') rodeKort.push(btn.dataset.player);
        }
    });

    match.scorers = scorers;
    match.assists = assists;
    match.ratings = ratings;
    match.guleKort = guleKort;
    match.rodeKort = rodeKort;

    const activeMotmBtn = document.querySelector('.player-motm-btn[data-active="true"]');
    match.motm = activeMotmBtn ? activeMotmBtn.getAttribute('data-player') : null;

    const totalBskGoals = Object.values(scorers).reduce((sum, g) => sum + g, 0);
    if (!match.result && totalBskGoals > 0) match.result = `${totalBskGoals}-0`;

    await window.saveMatchToDatabase(match);

    alert('Mål, assists, spillerbørs, kort og Banens Beste er oppdatert! 🏆');
    applyFilters();
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();
};
