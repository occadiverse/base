function setHiddenTeamFieldValue(id, teamName) {
    const el = document.getElementById(id);
    if (el) el.value = teamName;
}

window.updateDynamicSelectors = function() {
    const teamName = window.getPrimaryTeamName();
    setHiddenTeamFieldValue('matchGroup', teamName);
    setHiddenTeamFieldValue('playerTeamInput', teamName);
    setHiddenTeamFieldValue('eventTeam', teamName);
    setHiddenTeamFieldValue('activityTeam', teamName);
};

window.renderAdminTeamsList = function() {
    const listContainer = document.getElementById('admin-teams-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const team = window.getPrimaryTeam();
    const teams = team ? [team] : [];

    if (teams.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-2 py-8 text-center text-slate-400 text-xs italic bg-slate-50 border border-dashed rounded-xl">
                Ingen lag satt opp ennå. Klikk på «Rediger lag» for å legge inn trenerinfo og beskrivelse.
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
                    <h4 class="font-extrabold text-bsk-blue text-base">${escapeRosterHtml(t.name)}</h4>
                    <div class="flex gap-1">
                        <button onclick="openTeamModal('${escapeRosterJsString(t.id)}')" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                    </div>
                </div>
                <div class="space-y-1 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                    <p><strong class="text-slate-800">Trener:</strong> ${escapeRosterHtml(t.coachName || 'Uoppgitt')}</p>
                    <p><strong class="text-slate-800">Kontaktinfo:</strong> ${escapeRosterHtml(t.coachContact || 'Uoppgitt')}</p>
                </div>
                <p class="text-xs text-slate-500 italic line-clamp-2">${escapeRosterHtml(t.description || 'Ingen lagbeskrivelse.')}</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
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

function getRosterStatusFilterLabel(status = window.rosterStatusFilter) {
    if (status === 'tilgjengelig') return 'Tilgjengelige';
    if (status === 'Aktiv') return 'Aktive';
    if (status === 'Rekrutt') return 'Rekrutter';
    if (status === 'skadet') return 'Skadede';
    return 'Alle spillere';
}

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
    const searchEl = document.getElementById('playerSearchInput');
    const searchTerm = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const players = Array.isArray(window.activePlayers) ? window.activePlayers : [];

    return players.filter(p => {
        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
            ? window.getPlayerInjuryInfo(p)
            : { isInjured: false };

        if (window.rosterStatusFilter === 'skadet' && !injuryInfo.isInjured) return false;
        if (window.rosterStatusFilter === 'tilgjengelig' && (p.status === 'Passiv' || injuryInfo.isInjured)) return false;
        if (window.rosterStatusFilter === 'Aktiv' && p.status === 'Passiv') return false;
        if (!['alle', 'skadet', 'tilgjengelig', 'Aktiv'].includes(window.rosterStatusFilter) && p.status !== window.rosterStatusFilter) return false;

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
    const safeStatus = escapeRosterHtml(status);
    if (status === 'Aktiv') {
        return `<span class="roster-badge roster-badge-active">${safeStatus}</span>`;
    }
    if (status === 'Rekrutt') {
        return `<span class="roster-badge roster-badge-recruit">${safeStatus}</span>`;
    }
    return `<span class="roster-badge roster-badge-muted">${safeStatus}</span>`;
}

function buildRosterInjuryBadge(injuryInfo) {
    if (!injuryInfo.isInjured) return '';

    const injuryClass = injuryInfo.type === 'langvarig'
        ? 'roster-badge-injury-long'
        : 'roster-badge-injury-short';

    return `<span class="roster-badge ${injuryClass}" title="${escapeRosterHtml(injuryInfo.label)}">${escapeRosterHtml(injuryInfo.shortLabel)}</span>`;
}

function escapeRosterHtml(value) {
    if (typeof window.escapeModalHtml === 'function') {
        return window.escapeModalHtml(value);
    }
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeRosterJsString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getRosterPlayerPhotoUrl(player) {
    return player?.photoUrl || player?.bildeUrl || player?.avatarUrl || player?.imageUrl || player?.photo || '';
}

function buildRosterPlayerAvatarHtml(player) {
    const photoUrl = getRosterPlayerPhotoUrl(player);

    return `
        <div class="roster-player-avatar" aria-hidden="true">
            ${photoUrl
                ? `<img src="${escapeRosterHtml(photoUrl)}" alt="">`
                : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
        </div>
    `;
}

function buildRosterPlayerRow(p, currentYear) {
    const age = currentYear - parseInt(p.fodselsaar || 2000);
    const posStr = p.pos2 && p.pos2 !== '-' ? `${p.pos1} / ${p.pos2}` : p.pos1;
    const foot = p.fot ? `${p.fot} fot` : 'Ukjent fot';
    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(p)
        : { isInjured: false };
    const captainMark = p.isCaptain ? '<span class="roster-captain" title="Kaptein">⚓</span>' : '';
    const rowStateClasses = [
        p.status === 'Aktiv' ? 'is-active-player' : '',
        p.status === 'Rekrutt' ? 'is-recruit-player' : '',
        p.status === 'Passiv' ? 'is-passive-player' : '',
        injuryInfo.isInjured ? 'is-injured-player' : '',
        injuryInfo.type === 'langvarig' ? 'is-long-injury-player' : ''
    ].filter(Boolean).join(' ');

    const safeId = escapeRosterJsString(p.id);
    const clickHandler = `window.openPlayerModal('${safeId}')`;

    return `
        <article class="roster-player-row ${rowStateClasses}" onclick="${clickHandler}" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${clickHandler};}">
            ${buildRosterPlayerAvatarHtml(p)}
            <div class="roster-player-main">
                <div class="roster-player-name">${escapeRosterHtml(p.navn)}${captainMark}</div>
                <div class="roster-player-meta">
                    <span>${escapeRosterHtml(posStr)}</span>
                    <span class="roster-player-meta-sep">·</span>
                    <span>${escapeRosterHtml(foot)}</span>
                </div>
            </div>
            <div class="roster-player-position">${escapeRosterHtml(posStr)}</div>
            <div class="roster-player-foot">${escapeRosterHtml(foot)}</div>
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
    const allPlayers = Array.isArray(window.activePlayers) ? window.activePlayers : [];
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
    const boardTitleEl = document.getElementById('rosterBoardTitle');
    const bottomlineSummaryEl = document.getElementById('rosterBottomlineSummary');

    if (statPlayersEl) statPlayersEl.innerText = String(filteredPlayers.length);
    if (statAvgAgeEl) statAvgAgeEl.innerText = `${avgAge} år`;
    if (statRekruttEl) statRekruttEl.innerText = String(countRekrutt);
    if (statInjuredEl) statInjuredEl.innerText = String(countInjured);
    if (boardTitleEl) boardTitleEl.innerText = getRosterStatusFilterLabel();
    if (bottomlineSummaryEl) {
        bottomlineSummaryEl.innerText = `Viser ${filteredPlayers.length} av ${allPlayers.length} spillere i troppen.`;
    }

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
            document.getElementById('playerTeamInput').value = pObj.spillerLag || window.getPrimaryTeamName();
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

window.openAdminTeamEditor = function() {
    const team = typeof window.getPrimaryTeam === 'function' ? window.getPrimaryTeam() : null;
    window.openTeamModal(team?.id || null);
};

window.runPrimaryTeamDataMigration = async function(force = true) {
    if (typeof window.migrateAllDataToPrimaryTeam !== 'function') {
        alert('Migrering er ikke tilgjengelig ennå. Last siden på nytt og prøv igjen.');
        return;
    }

    try {
        await window.migrateAllDataToPrimaryTeam({ force, silent: false });
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke oppdatere data til laget. Prøv igjen.');
    }
};

window.openTeamModal = function(editTeamId = null) {
    if (!editTeamId) {
        const existingTeam = window.getPrimaryTeam();
        if (existingTeam) editTeamId = existingTeam.id;
    }

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
        document.getElementById('teamModalTitle').innerHTML = `<i class="fa-solid fa-users text-bsk-yellow"></i> Sett opp lag`;
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

    const existingTeam = window.getPrimaryTeam();
    const previousTeamName = existingTeam?.name || '';
    const teamData = {
        id: document.getElementById('editTeamId').value || existingTeam?.id || null,
        name: document.getElementById('teamName').value.trim(),
        coachName: document.getElementById('teamCoach').value.trim(),
        coachContact: document.getElementById('teamCoachContact').value.trim(),
        description: document.getElementById('teamDesc').value.trim()
    };

    if (!teamData.name) {
        alert('Du må fylle inn lagnavn.');
        return;
    }

    try {
        await window.saveTeamToDatabase(teamData);
    } catch (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    window.closeTeamModal();
    window.updateDynamicSelectors();
    window.renderAdminTeamsList();

    if (previousTeamName && previousTeamName !== teamData.name) {
        if (typeof window.resetSingleTeamMigrationState === 'function') {
            window.resetSingleTeamMigrationState();
        }
        if (typeof window.migrateAllDataToPrimaryTeam === 'function') {
            try {
                await window.migrateAllDataToPrimaryTeam({ force: true, silent: true });
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        }
    }
};

window.promptDeleteTeam = function() {
    alert('Appen er låst til ett lag. Du kan redigere laget, men ikke slette det.');
};

window.savePlayer = async function(event) {
    event.preventDefault();

    const existingPlayerId = document.getElementById('editPlayerId').value || null;
    const existingPlayer = existingPlayerId ? (window.activePlayers || []).find(p => p.id === existingPlayerId) : null;
    const selectedSkadeStatus = document.getElementById('playerSkadeStatusInput').value || 'frisk';
    const isSavingInjury = selectedSkadeStatus !== 'frisk';
    const todayStr = getTodayDateString();
    const playerTeam = window.getPrimaryTeamName();

    const navn = document.getElementById('playerNameInput').value.trim();
    const jerseyRaw = document.getElementById('playerJerseyInput').value.trim();
    const birthYearInput = document.getElementById('playerBirthYearInput');
    const birthYearRaw = birthYearInput ? birthYearInput.value.trim() : '';
    const status = document.getElementById('playerStatusInput').value;
    const pos1 = document.getElementById('playerPos1Input').value.trim();
    const pos2 = document.getElementById('playerPos2Input').value.trim();
    const fot = document.getElementById('playerFootInput').value.trim();
    const skadeNotat = isSavingInjury ? document.getElementById('playerSkadeNotatInput').value.trim() : '';

    if (!navn) {
        alert('Du må fylle inn spillerens navn.');
        return;
    }

    let fodselsaar = existingPlayer?.fodselsaar ?? '';
    if (birthYearInput) {
        if (!birthYearRaw) {
            alert('Du må fylle inn fødselsår.');
            return;
        }
        const parsedBirthYear = parseInt(birthYearRaw, 10);
        if (Number.isNaN(parsedBirthYear) || parsedBirthYear < 1950 || parsedBirthYear > new Date().getFullYear()) {
            alert('Fødselsår må være et gyldig årstall.');
            return;
        }
        fodselsaar = parsedBirthYear;
    }

    const parsedJersey = jerseyRaw ? parseInt(jerseyRaw, 10) : '';
    const draktnummer = parsedJersey === '' || Number.isNaN(parsedJersey) ? '' : parsedJersey;

    let playerData = {
        id: document.getElementById('editPlayerId').value || null,
        navn,
        draktnummer,
        fodselsaar,
        status,
        spillerLag: playerTeam,
        pos1,
        pos2,
        fot,
        skadeStatus: selectedSkadeStatus,
        skadeNotat,
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
            navn,
            draktnummer,
            fodselsaar,
            status,
            spillerLag: playerTeam,
            pos1,
            pos2,
            fot
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
