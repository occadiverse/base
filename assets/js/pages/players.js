window.updateDynamicSelectors = function() {
    const filterSelect = document.getElementById('lagFilterSelect');
    const kamperFilterSelect = document.getElementById('kamperLagFilterSelect');
    const formSelect = document.getElementById('matchGroup');
    const playerTeamSelect = document.getElementById('playerTeamInput');
    const eventTeamSelect = document.getElementById('eventTeam');
    const activityTeamSelect = document.getElementById('activityTeam');

    if (formSelect) formSelect.innerHTML = '';
    if (playerTeamSelect) playerTeamSelect.innerHTML = '';
    if (eventTeamSelect) eventTeamSelect.innerHTML = '';
    if (activityTeamSelect) activityTeamSelect.innerHTML = '';

    const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];

    if (filterSelect) {
        const previousFilter = filterSelect.value;
        filterSelect.innerHTML = '';
        if (teams.length > 1) {
            const allOpt = document.createElement('option');
            allOpt.value = 'Alle';
            allOpt.innerText = 'ALLE LAG';
            filterSelect.appendChild(allOpt);
        }
        teams.forEach(t => {
            const optFilter = document.createElement('option');
            optFilter.value = t.name;
            optFilter.innerText = t.name.toUpperCase();
            filterSelect.appendChild(optFilter);
        });
        if (previousFilter && (previousFilter === 'Alle' || teams.some(t => t.name === previousFilter))) {
            filterSelect.value = previousFilter;
        } else if (teams.length > 1) {
            filterSelect.value = 'Alle';
        } else if (teams[0]) {
            filterSelect.value = teams[0].name;
        }
    }

    const statsFilterSelect = document.getElementById('statsLagFilterSelect');
    if (statsFilterSelect) {
        const previousStatsFilter = statsFilterSelect.value;
        statsFilterSelect.innerHTML = '';
        if (teams.length > 1) {
            const allOpt = document.createElement('option');
            allOpt.value = 'Alle';
            allOpt.innerText = 'ALLE LAG';
            statsFilterSelect.appendChild(allOpt);
        }
        teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.innerText = t.name.toUpperCase();
            statsFilterSelect.appendChild(opt);
        });
        if (previousStatsFilter && (previousStatsFilter === 'Alle' || teams.some(t => t.name === previousStatsFilter))) {
            statsFilterSelect.value = previousStatsFilter;
        } else if (teams[0]) {
            statsFilterSelect.value = teams[0].name;
        }
    }

    if (typeof window.syncStatsLagFilterPlacement === 'function') {
        window.syncStatsLagFilterPlacement();
    }
    if (kamperFilterSelect) kamperFilterSelect.innerHTML = `<option value="Alle">ALLE LAG</option>`;

    const lagFilterWrap = document.getElementById('rosterLagFilterWrap');
    if (lagFilterWrap) lagFilterWrap.classList.toggle('hidden', teams.length <= 1);

    teams.forEach(t => {
        if (kamperFilterSelect) {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.innerText = t.name.toUpperCase();
            kamperFilterSelect.appendChild(opt);
        }

        if (formSelect) {
            const optForm = document.createElement('option');
            optForm.value = t.name;
            optForm.innerText = t.name;
            formSelect.appendChild(optForm);
        }

        if (playerTeamSelect) {
            const optPlayer = document.createElement('option');
            optPlayer.value = t.name;
            optPlayer.innerText = t.name;
            playerTeamSelect.appendChild(optPlayer);
        }

        if (eventTeamSelect) {
            const optEvent = document.createElement('option');
            optEvent.value = t.name;
            optEvent.innerText = t.name;
            eventTeamSelect.appendChild(optEvent);
        }

        if (activityTeamSelect) {
            const optAct = document.createElement('option');
            optAct.value = t.name;
            optAct.innerText = t.name;
            activityTeamSelect.appendChild(optAct);
        }
    });
};

window.renderAdminTeamsList = function() {
    const listContainer = document.getElementById('admin-teams-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];

    if (teams.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-2 py-8 text-center text-slate-400 text-xs italic bg-slate-50 border border-dashed rounded-xl">
                Ingen lag opprettet ennå. Klikk på "Opprett nytt lag" for å begynne.
            </div>
        `;
        return;
    }

    teams.forEach(t => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-bsk-blueLight transition";
        card.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h4 class="font-extrabold text-bsk-blue text-base">${t.name}</h4>
                    <div class="flex gap-1">
                        <button onclick="openTeamModal('${t.id}')" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="promptDeleteTeam('${t.id}')" class="portal-btn portal-btn-icon-sm portal-btn-danger" title="Slett"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="space-y-1 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                    <p><strong class="text-slate-800">Trener:</strong> ${t.coachName || 'Uoppgitt'}</p>
                    <p><strong class="text-slate-800">Kontaktinfo:</strong> ${t.coachContact || 'Uoppgitt'}</p>
                </div>
                <p class="text-xs text-slate-500 italic line-clamp-2">${t.description || 'Ingen lagbeskrivelse.'}</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
};

window.handleTeamFilterChange = function() {
    window.renderPlayerRoster();
    recalculateOppmoteAndKjemi();
    const statsSelect = document.getElementById('statsLagFilterSelect');
    const rosterSelect = document.getElementById('lagFilterSelect');
    if (statsSelect && rosterSelect && statsSelect.value !== rosterSelect.value) {
        statsSelect.value = rosterSelect.value;
    }
    if (typeof window.handleStatsTeamFilterChange === 'function') window.handleStatsTeamFilterChange();
};

window.rosterStatusFilter = 'alle';

window.setPlayerStatusFilter = function(status) {
    window.rosterStatusFilter = status;
    document.querySelectorAll('#view-tropp .roster-status-btn').forEach(btn => btn.classList.remove('is-active'));
    const activeBtn = document.getElementById(`roster-filter-${status === 'alle' ? 'alle' : status === 'skadet' ? 'skadet' : status.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('is-active');
    window.renderPlayerRoster();
};

window.handlePlayerSearchChange = function() {
    window.renderPlayerRoster();
};

const ROSTER_POSITION_GROUPS = [
    {
        id: 'keeper',
        label: 'Keeper',
        match: pos => pos === 'Keeper'
    },
    {
        id: 'forsvar',
        label: 'Forsvar',
        match: pos => ['Høyre bekk', 'Venstre bekk', 'Høyre stopper', 'Venstre stopper'].includes(pos)
    },
    {
        id: 'midtbane',
        label: 'Midtbane',
        match: pos => ['Defensiv midtbane', 'Offensiv midtbane', 'Playmaker'].includes(pos)
    },
    {
        id: 'angrep',
        label: 'Angrep',
        match: pos => ['Høyre kant', 'Venstre kant', 'Spiss'].includes(pos)
    },
    {
        id: 'other',
        label: 'Øvrige',
        match: () => true
    }
];

function getPlayerFirstName(name) {
    return (name || '').trim().split(/\s+/)[0] || '';
}

function comparePlayersByFirstName(a, b) {
    const firstCompare = getPlayerFirstName(a.navn).localeCompare(getPlayerFirstName(b.navn), 'no', { sensitivity: 'base' });
    if (firstCompare !== 0) return firstCompare;
    return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
}

function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isPlayerCurrentlyInjured(player) {
    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(player)
        : { isInjured: Boolean(player?.skadeStatus && player.skadeStatus !== 'frisk') };
    return injuryInfo.isInjured;
}

function buildPlayerInjuryHistoryEntry(player, tilDato = getTodayDateString()) {
    if (!isPlayerCurrentlyInjured(player)) return null;

    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(player)
        : { type: player.skadeStatus, label: player.skadeStatus };

    return {
        id: crypto.randomUUID(),
        skadeStatus: player.skadeStatus || injuryInfo.type || '',
        skadeType: injuryInfo.shortLabel || injuryInfo.label || player.skadeStatus || 'Skade',
        skadeNotat: player.skadeNotat || '',
        fraDato: player.skadeFraDato || tilDato,
        tilDato,
        forventetTilDato: player.skadeTilDato || ''
    };
}

function finishPlayerInjury(player, tilDato = getTodayDateString()) {
    const historyEntry = buildPlayerInjuryHistoryEntry(player, tilDato);
    const skadeHistorikk = Array.isArray(player.skadeHistorikk) ? [...player.skadeHistorikk] : [];
    if (historyEntry) skadeHistorikk.push(historyEntry);

    return {
        ...player,
        skadeStatus: 'frisk',
        skadeNotat: '',
        skadeFraDato: '',
        skadeTilDato: '',
        skadeHistorikk
    };
}

function getRosterFilteredPlayers() {
    const filterLagEl = document.getElementById('lagFilterSelect');
    const filterLag = filterLagEl ? filterLagEl.value : '';
    const searchEl = document.getElementById('playerSearchInput');
    const searchTerm = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const players = Array.isArray(window.activePlayers) ? window.activePlayers : [];

    return players.filter(p => {
        if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;

        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
            ? window.getPlayerInjuryInfo(p)
            : { isInjured: false };

        if (window.rosterStatusFilter === 'skadet' && !injuryInfo.isInjured) return false;
        if (window.rosterStatusFilter === 'tilgjengelig' && (p.status === 'Passiv' || injuryInfo.isInjured)) return false;
        if (!['alle', 'skadet', 'tilgjengelig'].includes(window.rosterStatusFilter) && p.status !== window.rosterStatusFilter) return false;

        if (!searchTerm) return true;

        const posStr = p.pos2 && p.pos2 !== '-' ? `${p.pos1} / ${p.pos2}` : p.pos1;
        const haystack = [
            p.navn,
            p.draktnummer ? String(p.draktnummer) : '',
            posStr,
            p.fot,
            p.status,
            p.spillerLag
        ].join(' ').toLowerCase();

        return haystack.includes(searchTerm);
    });
}

function getRosterPositionGroup(pos1) {
    const group = ROSTER_POSITION_GROUPS.find(entry => entry.id !== 'other' && entry.match(pos1));
    return group ? group.id : 'other';
}

function assignPlayersToRosterGroups(players) {
    const grouped = {};
    ROSTER_POSITION_GROUPS.forEach(group => {
        grouped[group.id] = [];
    });

    players.forEach(player => {
        const groupId = getRosterPositionGroup(player.pos1);
        grouped[groupId].push(player);
    });

    return grouped;
}

function buildRosterStatusBadge(status) {
    if (status === 'Aktiv') {
        return `<span class="roster-badge roster-badge-active">${status}</span>`;
    }
    if (status === 'Rekrutt') {
        return `<span class="roster-badge roster-badge-recruit">${status}</span>`;
    }
    return `<span class="roster-badge roster-badge-muted">${status}</span>`;
}

function buildRosterInjuryBadge(injuryInfo) {
    if (!injuryInfo.isInjured) return '';

    const injuryClass = injuryInfo.type === 'langvarig'
        ? 'roster-badge-injury-long'
        : 'roster-badge-injury-short';

    return `<span class="roster-badge ${injuryClass}" title="${injuryInfo.label}">${injuryInfo.shortLabel}</span>`;
}

function buildRosterPlayerRow(p, currentYear) {
    const age = currentYear - parseInt(p.fodselsaar || 2000);
    const jersey = p.draktnummer ? String(p.draktnummer) : '–';
    const posStr = p.pos2 && p.pos2 !== '-' ? `${p.pos1} / ${p.pos2}` : p.pos1;
    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(p)
        : { isInjured: false };
    const captainMark = p.isCaptain ? '<span class="roster-captain" title="Kaptein">⚓</span>' : '';

    return `
        <article class="roster-player-row" onclick="window.openPlayerModal('${p.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openPlayerModal('${p.id}');}">
            <div class="roster-player-jersey" aria-label="Draktnummer ${jersey}">
                <span>${jersey}</span>
            </div>
            <div class="roster-player-main">
                <div class="roster-player-name">${p.navn}${captainMark}</div>
                <div class="roster-player-meta">
                    <span>${posStr}</span>
                    <span class="roster-player-meta-sep">·</span>
                    <span>${p.fot} fot</span>
                    <span class="roster-player-meta-sep">·</span>
                    <span>${p.spillerLag || 'Uten lag'}</span>
                </div>
            </div>
            <div class="roster-player-side">
                <span class="roster-player-age">${age} år</span>
                <div class="roster-player-badges">
                    ${buildRosterStatusBadge(p.status)}
                    ${buildRosterInjuryBadge(injuryInfo)}
                </div>
            </div>
        </article>
    `;
}

window.renderPlayerRoster = function() {
    const listContainer = document.getElementById('playerRosterContainer');
    const emptyState = document.getElementById('playerRosterEmpty');
    if (!listContainer) return;

    const filteredPlayers = getRosterFilteredPlayers();
    const currentYear = new Date().getFullYear();
    let totalAge = 0;
    let countRekrutt = 0;
    let countInjured = 0;

    filteredPlayers.forEach(p => {
        totalAge += currentYear - parseInt(p.fodselsaar || 2000);
        if (p.status === 'Rekrutt') countRekrutt++;
        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
            ? window.getPlayerInjuryInfo(p)
            : { isInjured: false };
        if (injuryInfo.isInjured) countInjured++;
    });

    const avgAge = filteredPlayers.length > 0 ? (totalAge / filteredPlayers.length).toFixed(1) : 0;
    const statPlayersEl = document.getElementById('stat-total-players');
    const statAvgAgeEl = document.getElementById('stat-avg-age');
    const statRekruttEl = document.getElementById('stat-total-rekrutt');
    const statInjuredEl = document.getElementById('stat-total-injured');

    if (statPlayersEl) statPlayersEl.innerText = `${filteredPlayers.length} spillere`;
    if (statAvgAgeEl) statAvgAgeEl.innerText = `${avgAge} år`;
    if (statRekruttEl) statRekruttEl.innerText = `${countRekrutt} rekrutter`;
    if (statInjuredEl) statInjuredEl.innerText = String(countInjured);

    listContainer.innerHTML = '';

    if (filteredPlayers.length === 0) {
        listContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    listContainer.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    const grouped = assignPlayersToRosterGroups(
        [...filteredPlayers].sort(comparePlayersByFirstName)
    );

    ROSTER_POSITION_GROUPS.forEach(group => {
        const playersInGroup = grouped[group.id];
        if (!playersInGroup || playersInGroup.length === 0) return;

        const section = document.createElement('section');
        section.className = 'roster-group';
        section.innerHTML = `
            <div class="roster-group-heading">
                <span>${group.label}</span>
                <span class="roster-group-count">${playersInGroup.length}</span>
            </div>
            <div class="roster-group-rows">
                ${playersInGroup.map(player => buildRosterPlayerRow(player, currentYear)).join('')}
            </div>
        `;
        listContainer.appendChild(section);
    });
};

window.openPlayerModal = function(editPlayerId = null) {
    const modal = document.getElementById('playerModal');
    document.getElementById('playerForm').reset();
    document.getElementById('editPlayerId').value = '';
    window.updateDynamicSelectors();

    if (editPlayerId) {
        const pObj = (window.activePlayers || []).find(p => p.id === editPlayerId);
        if (pObj) {
            document.getElementById('playerFormTitle').innerText = 'Rediger spiller';
            document.getElementById('editPlayerId').value = pObj.id;
            document.getElementById('playerNameInput').value = pObj.navn;
            document.getElementById('playerJerseyInput').value = pObj.draktnummer || '';
            document.getElementById('playerBirthYearInput').value = pObj.fodselsaar;
            document.getElementById('playerStatusInput').value = pObj.status;
            document.getElementById('playerTeamInput').value = pObj.spillerLag || 'Lag A';
            document.getElementById('playerPos1Input').value = pObj.pos1;
            document.getElementById('playerPos2Input').value = pObj.pos2 || '-';
            document.getElementById('playerFootInput').value = pObj.fot || 'Høyre';
            document.getElementById('playerSkadeStatusInput').value = pObj.skadeStatus || 'frisk';
            document.getElementById('playerSkadeNotatInput').value = pObj.skadeNotat || '';
            document.getElementById('playerSkadeFraDatoInput').value = pObj.skadeFraDato || '';
            document.getElementById('playerSkadeTilDatoInput').value = pObj.skadeTilDato || '';
            window.togglePlayerSkadeFields();
        }
    } else {
        document.getElementById('playerFormTitle').innerText = 'Ny spiller';
        document.getElementById('playerPos1Input').value = '-';
        document.getElementById('playerPos2Input').value = '-';
        document.getElementById('playerSkadeStatusInput').value = 'frisk';
        document.getElementById('playerSkadeNotatInput').value = '';
        document.getElementById('playerSkadeFraDatoInput').value = '';
        document.getElementById('playerSkadeTilDatoInput').value = '';
        window.togglePlayerSkadeFields();
    }

    const deleteBtn = document.getElementById('playerModalDeleteBtn');
    const footer = document.querySelector('.player-modal-footer');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !editPlayerId);
    if (footer) footer.classList.toggle('is-edit-mode', Boolean(editPlayerId));

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.togglePlayerSkadeFields = function() {
    const status = document.getElementById('playerSkadeStatusInput')?.value || 'frisk';
    const isInjured = status !== 'frisk';
    const fromDateWrap = document.getElementById('playerSkadeFraDatoWrap');
    const dateWrap = document.getElementById('playerSkadeTilDatoWrap');
    const notatWrap = document.getElementById('playerSkadeNotatWrap');
    if (fromDateWrap) fromDateWrap.classList.toggle('hidden', !isInjured);
    if (dateWrap) dateWrap.classList.toggle('hidden', !isInjured);
    if (notatWrap) notatWrap.classList.toggle('hidden', !isInjured);
};

window.closePlayerModal = function() {
    document.getElementById('playerModal').classList.add('hidden');
    document.getElementById('playerModal').classList.remove('flex');
};

window.openTeamModal = function(editTeamId = null) {
    const modal = document.getElementById('teamModal');
    document.getElementById('teamForm').reset();
    document.getElementById('editTeamId').value = '';

    if (editTeamId) {
        const team = (window.activeTeams || []).find(t => t.id === editTeamId);
        if (team) {
            document.getElementById('teamModalTitle').innerHTML = `<i class="fa-solid fa-users text-bsk-yellow"></i> Rediger Lag`;
            document.getElementById('editTeamId').value = team.id;
            document.getElementById('teamName').value = team.name;
            document.getElementById('teamCoach').value = team.coachName || '';
            document.getElementById('teamCoachContact').value = team.coachContact || '';
            document.getElementById('teamDesc').value = team.description || '';
        }
    } else {
        document.getElementById('teamModalTitle').innerHTML = `<i class="fa-solid fa-users text-bsk-yellow"></i> Opprett Lag`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeTeamModal = function() {
    document.getElementById('teamModal').classList.add('hidden');
    document.getElementById('teamModal').classList.remove('flex');
};

window.saveTeam = async function(event) {
    event.preventDefault();

    const teamData = {
        id: document.getElementById('editTeamId').value || null,
        name: document.getElementById('teamName').value,
        coachName: document.getElementById('teamCoach').value,
        coachContact: document.getElementById('teamCoachContact').value,
        description: document.getElementById('teamDesc').value
    };

    await window.saveTeamToDatabase(teamData);
    window.closeTeamModal();
    window.updateDynamicSelectors();
    window.renderAdminTeamsList();
};

window.promptDeleteTeam = function(id) {
    window.customConfirm("Slette lag?", "Er du sikker på at du ønsker å slette dette laget permanent?", async () => {
        await window.deleteTeamFromDatabase(id);
        window.updateDynamicSelectors();
        window.renderAdminTeamsList();
    });
};

window.savePlayer = async function(event) {
    event.preventDefault();

    const existingPlayerId = document.getElementById('editPlayerId').value || null;
    const existingPlayer = existingPlayerId ? (window.activePlayers || []).find(p => p.id === existingPlayerId) : null;
    const selectedSkadeStatus = document.getElementById('playerSkadeStatusInput').value || 'frisk';
    const isSavingInjury = selectedSkadeStatus !== 'frisk';
    const todayStr = getTodayDateString();

    let playerData = {
        id: document.getElementById('editPlayerId').value || null,
        navn: document.getElementById('playerNameInput').value,
        draktnummer: document.getElementById('playerJerseyInput').value ? parseInt(document.getElementById('playerJerseyInput').value) : '',
        fodselsaar: parseInt(document.getElementById('playerBirthYearInput').value),
        status: document.getElementById('playerStatusInput').value,
        spillerLag: document.getElementById('playerTeamInput').value,
        pos1: document.getElementById('playerPos1Input').value,
        pos2: document.getElementById('playerPos2Input').value,
        fot: document.getElementById('playerFootInput').value,
        skadeStatus: selectedSkadeStatus,
        skadeNotat: isSavingInjury ? document.getElementById('playerSkadeNotatInput').value.trim() : '',
        skadeFraDato: isSavingInjury
            ? (document.getElementById('playerSkadeFraDatoInput').value || existingPlayer?.skadeFraDato || todayStr)
            : '',
        skadeTilDato: isSavingInjury ? (document.getElementById('playerSkadeTilDatoInput').value || '') : ''
    };

    playerData = {
        ...(existingPlayer || {}),
        ...playerData,
        skadeHistorikk: Array.isArray(existingPlayer?.skadeHistorikk) ? existingPlayer.skadeHistorikk : []
    };

    if (existingPlayer && isPlayerCurrentlyInjured(existingPlayer) && playerData.skadeStatus === 'frisk') {
        playerData = finishPlayerInjury(existingPlayer, todayStr);
        playerData = {
            ...playerData,
            id: existingPlayer.id,
            navn: document.getElementById('playerNameInput').value,
            draktnummer: document.getElementById('playerJerseyInput').value ? parseInt(document.getElementById('playerJerseyInput').value) : '',
            fodselsaar: parseInt(document.getElementById('playerBirthYearInput').value),
            status: document.getElementById('playerStatusInput').value,
            spillerLag: document.getElementById('playerTeamInput').value,
            pos1: document.getElementById('playerPos1Input').value,
            pos2: document.getElementById('playerPos2Input').value,
            fot: document.getElementById('playerFootInput').value
        };
    }

    const oldName = existingPlayer?.navn;

    try {
        await window.savePlayerToDatabase(playerData);

        if (playerData.id && oldName && oldName !== playerData.navn && typeof window.remapPlayerRefsAfterRename === 'function') {
            await window.remapPlayerRefsAfterRename(playerData.id, oldName);
        }
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke lagre spiller i databasen. Prøv igjen.');
        return;
    }

    window.closePlayerModal();
    window.renderPlayerRoster();
};

window.markPlayerHealthy = async function(playerId) {
    const playerIndex = (window.activePlayers || []).findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('Fant ikke spilleren som skulle markeres frisk.');

    const player = window.activePlayers[playerIndex];
    if (!isPlayerCurrentlyInjured(player)) return player;

    const updatedPlayer = finishPlayerInjury(player);
    await window.savePlayerToDatabase(updatedPlayer);

    window.activePlayers[playerIndex] = updatedPlayer;
    window.localStorage.setItem('bsk_local_players', JSON.stringify(window.activePlayers));

    if (typeof window.renderPlayerRoster === 'function') window.renderPlayerRoster();
    if (typeof window.updateDashboard === 'function') window.updateDashboard();
    if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi();
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();

    return updatedPlayer;
};

window.promptDeletePlayer = function(id) {
    window.customConfirm("Slette spiller?", "Er du sikker på at du vil slette denne spilleren fra troppen permanent?", async () => {
        try {
            await window.deletePlayerFromDatabase(id);
            window.closePlayerModal();
            window.renderPlayerRoster();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Kunne ikke slette spiller i databasen. Prøv igjen.');
        }
    });
};

window.deletePlayerFromModal = function() {
    const id = document.getElementById('editPlayerId')?.value;
    if (id) window.promptDeletePlayer(id);
};
