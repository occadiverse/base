function setMatchTimeFilter(filterType) {
    window.activeTimeFilter = filterType;

    const btnKommende = document.getElementById('btn-filter-kommende');
    const btnTidligere = document.getElementById('btn-filter-tidligere');
    const activeClass = "px-4 py-2 rounded-lg transition-all text-bsk-blue bg-white shadow-sm shrink-0";
    const inactiveClass = "px-4 py-2 rounded-lg transition-all text-slate-500 hover:text-slate-800 shrink-0";

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
        tr.className = "hover:bg-slate-50/70 active:bg-slate-100 transition-all border-b border-slate-100 cursor-pointer";
        tr.onclick = () => showMatchDetails(m.id);

        const dateFormatted = new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
        let resultBadge = `<span class="text-slate-400 font-medium">-</span>`;

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
            <td class="py-3.5 px-4 md:px-6 font-bold text-slate-900"><div class="flex flex-col"><span>${m.opponent}</span><span class="text-[10px] text-slate-400 font-normal lg:hidden">${m.pitch || 'Ingen bane'}</span></div></td>
            <td class="py-3.5 px-4 text-center text-slate-600 font-semibold">${dateFormatted}</td>
            <td class="py-3.5 px-2 text-center text-slate-500 font-medium text-xs">${m.time || '--:--'}</td>
            <td class="py-3.5 px-4 text-center">${resultBadge}</td>
            <td class="py-3.5 px-6 text-left hidden lg:table-cell text-slate-600">${m.pitch || '<span class="text-slate-300">Ikke oppgitt</span>'}</td>
            <td class="py-3.5 px-6 text-left hidden lg:table-cell"><span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">${m.matchType}</span></td>
            <td class="py-3.5 px-4 md:px-6 text-right text-slate-400"><i class="fa-solid fa-chevron-right text-xs"></i></td>
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
        ratings: existingMatch ? (existingMatch.ratings || {}) : {}
    };

    await window.saveMatchToDatabase(matchData);
    window.closeMatchModal();
    window.closeMatchInfo();
};

window.promptDeleteMatch = function(id) {
    customConfirm("Slette kamp?", "Er du sikker på at du ønsker å slette denne kampen permanent fra terminlisten?", async () => {
        await window.deleteMatchFromDatabase(id);
        window.closeMatchInfo();
    });
};

window.showMatchDetails = function(id) {
    activeDetailsId = id;

    const match = (window.activeMatches || []).find(m => m.id === id);
    if (!match) return;

    document.getElementById('kampdetaljer-title').innerHTML = `Kamp mot ${match.opponent}`;

    const container = document.getElementById('kampdetaljer-info');
    const dateFormatted = new Date(match.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
        <div class="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <span class="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Kamptidspunkt</span>
            <span class="font-black text-slate-800 text-sm"><i class="fa-regular fa-clock text-bsk-blue mr-1.5"></i> ${dateFormatted} kl. ${match.time || '--:--'}</span>
        </div>
        <div class="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <span class="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Spillearena</span>
            <span class="font-black text-slate-800 text-sm"><i class="fa-solid fa-location-dot text-rose-500 mr-1.5"></i> ${match.pitch || 'Ikke fastsatt'}</span>
        </div>
        <div class="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <span class="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Lag og Type</span>
            <span class="font-black text-slate-800 text-sm"><i class="fa-solid fa-shield-halved text-bsk-yellow mr-1.5"></i> ${match.matchGroup} (${match.matchType})</span>
        </div>
        <div class="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
            <span class="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Sluttresultat</span>
            <span class="text-lg font-black ${match.result ? 'text-emerald-600' : 'text-slate-400'}">
                <i class="fa-solid fa-square-poll-horizontal mr-1.5"></i> ${match.result || 'Ikke ferdigspilt'}
            </span>
        </div>
        <div class="col-span-1 sm:col-span-2 space-y-1 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden mt-2">
            <i class="fa-solid fa-crown absolute -right-2 -bottom-4 text-indigo-500 opacity-10 text-[5rem]"></i>
            <span class="text-indigo-700 font-black block uppercase tracking-wide text-[10px]">Banens Beste (BB) 👑</span>
            <span class="text-lg font-black text-indigo-950 relative z-10">${match.motm || '<span class="text-indigo-600/50">Ikke kåret</span>'}</span>
        </div>
    `;

    document.getElementById('btnEditKampdetaljer').onclick = () => window.openMatchModal(match.id);
    document.getElementById('btnDeleteKampdetaljer').onclick = () => {
        customConfirm("Slette kamp?", "Er du sikker på at du ønsker å slette denne kampen permanent fra terminlisten?", async () => {
            await window.deleteMatchFromDatabase(match.id);
            switchTab('kamper');
        });
    };

    document.getElementById('btnKampdetaljerOppmote').onclick = () => {
        if (typeof window.openAttendanceModal === 'function') {
            window.openAttendanceModal('match_' + match.id);
        }
    };

    document.getElementById('btnKampdetaljerTaktikk').onclick = () => {
        window.switchTab('taktikk');
        setTimeout(() => {
            const tacticalSelect = document.getElementById('tacticalMatchSelect');
            if (tacticalSelect) {
                tacticalSelect.value = match.id;
                window.loadMatchTactics();
            }
        }, 50);
    };

    renderPlayerRowForm(match);
    switchTab('kampdetaljer');
};

window.closeMatchInfo = function() {
    switchTab('kamper');
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
        const prevRating = match.ratings ? (match.ratings[player] || 0) : 0;
        const hasYellow = match.guleKort && match.guleKort.includes(player);
        const hasRed = match.rodeKort && match.rodeKort.includes(player);
        const isMotm = match.motm === player;

        const div = document.createElement('div');
        div.className = "py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2";
        div.innerHTML = `
            <span class="font-bold text-slate-800 text-xs">${player}</span>
            <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div class="flex items-center space-x-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <span class="text-[9px] uppercase font-bold text-slate-400 px-1">Mål:</span>
                    <button type="button" onclick="changeCount(this, -1)" class="w-6 h-6 rounded bg-white hover:bg-slate-100 font-bold text-slate-600 shadow-sm text-xs">-</button>
                    <span class="w-5 text-center font-extrabold text-slate-800 text-xs text-goal-val">${prevGoals}</span>
                    <input type="hidden" class="player-goals-input" data-player="${player}" value="${prevGoals}">
                    <button type="button" onclick="changeCount(this, 1)" class="w-6 h-6 rounded bg-white hover:bg-slate-100 font-bold text-slate-600 shadow-sm text-xs">+</button>
                </div>

                <div class="flex items-center space-x-1 ml-1">
                    <span class="text-[9px] uppercase font-bold text-slate-400 hidden sm:inline-block">Børs:</span>
                    <select class="player-rating-select bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none text-slate-800" data-player="${player}">
                        <option value="0" ${prevRating === 0 ? 'selected' : ''}>--</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(v => `<option value="${v}" ${prevRating === v ? 'selected' : ''}>${v} ★</option>`).join('')}
                    </select>
                </div>

                <div class="flex items-center space-x-1 border-l border-slate-200 pl-2 ml-1">
                    <button type="button" onclick="toggleCard(this, 'yellow')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasYellow ? 'bg-yellow-400 border-yellow-500 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-yellow-50 hover:text-yellow-400 hover:border-yellow-200'}" data-player="${player}" data-type="yellow" data-active="${hasYellow ? 'true' : 'false'}">🟨</button>
                    <button type="button" onclick="toggleCard(this, 'red')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasRed ? 'bg-red-500 border-red-600 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-red-50 hover:text-red-400 hover:border-red-200'}" data-player="${player}" data-type="red" data-active="${hasRed ? 'true' : 'false'}">🟥</button>
                    <button type="button" onclick="toggleMotm(this)" class="player-motm-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${isMotm ? 'bg-indigo-100 border-indigo-300 text-indigo-950 shadow-sm scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}" data-player="${player}" data-active="${isMotm ? 'true' : 'false'}">BB</button>
                </div>
            </div>
        `;
        formList.appendChild(div);
    });
};

window.changeCount = function(btn, amount) {
    const container = btn.parentElement;
    const span = container.querySelector('.text-goal-val');
    const hidden = container.querySelector('.player-goals-input');
    let current = parseInt(span.innerText);

    current = Math.max(0, current + amount);
    span.innerText = current;
    hidden.value = current;
};

window.toggleCard = function(btn, type) {
    const isActive = btn.getAttribute('data-active') === 'true';
    const newState = !isActive;
    btn.setAttribute('data-active', newState);

    if (type === 'yellow') {
        if (newState) {
            btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-yellow-50', 'hover:text-yellow-400', 'hover:border-yellow-200');
            btn.classList.add('bg-yellow-400', 'border-yellow-500', 'text-white', 'shadow-inner', 'scale-95');
        } else {
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-yellow-50', 'hover:text-yellow-400', 'hover:border-yellow-200');
            btn.classList.remove('bg-yellow-400', 'border-yellow-500', 'text-white', 'shadow-inner', 'scale-95');
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
    const ratings = {};
    const guleKort = [];
    const rodeKort = [];

    document.querySelectorAll('.player-goals-input').forEach(input => {
        const val = parseInt(input.value);
        if (val > 0) scorers[input.dataset.player] = val;
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
    match.ratings = ratings;
    match.guleKort = guleKort;
    match.rodeKort = rodeKort;

    const activeMotmBtn = document.querySelector('.player-motm-btn[data-active="true"]');
    match.motm = activeMotmBtn ? activeMotmBtn.getAttribute('data-player') : null;

    const totalBskGoals = Object.values(scorers).reduce((sum, g) => sum + g, 0);
    if (!match.result && totalBskGoals > 0) match.result = `${totalBskGoals}-0`;

    await window.saveMatchToDatabase(match);

    alert('Spillerbørs, kort og Banens Beste er oppdatert! 🏆');
    applyFilters();
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();
};
