function setHiddenTeamFieldValue(id, teamName) {
    const el = document.getElementById(id);
    if (el) el.value = teamName;
}

window.updateDynamicSelectors = function() {
    const teamName = window.getPrimaryTeamName();
    setHiddenTeamFieldValue('matchGroup', teamName);
    setHiddenTeamFieldValue('playerTeamInput', teamName);
};

window.renderAdminTeamsList = function() {
    const listContainer = document.getElementById('admin-teams-list');
    if (!listContainer) return;

    bindAdminTeamsListEvents();
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
                        <button type="button" data-team-action="edit" data-team-id="${escapeRosterHtml(t.id)}" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
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

window.rosterStatusFilter = 'Aktiv';

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

function formatPlayerJoinedFromLabel(player) {
    const joinedFrom = typeof window.getPlayerJoinedFromDate === 'function'
        ? window.getPlayerJoinedFromDate(player)
        : (player?.tilknyttetFra || '');
    if (!joinedFrom) return 'Fra start';
    const date = new Date(`${joinedFrom}T12:00:00`);
    if (Number.isNaN(date.getTime())) return joinedFrom;
    return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPlayerInjuryHistoryDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getPlayerInjuryHistoryEntries(player) {
    const history = Array.isArray(player?.skadeHistorikk) ? [...player.skadeHistorikk] : [];
    return history
        .filter(entry => entry && (entry.fraDato || entry.tilDato || entry.skadeType || entry.skadeNotat))
        .sort((a, b) => {
            const dateA = new Date(a.tilDato || a.fraDato || 0).getTime();
            const dateB = new Date(b.tilDato || b.fraDato || 0).getTime();
            return dateB - dateA;
        });
}

function buildPlayerInjuryHistoryHtml(player, injuryInfo) {
    const history = getPlayerInjuryHistoryEntries(player);
    const currentLabel = injuryInfo?.isInjured
        ? (injuryInfo.label || 'Skadet')
        : 'Frisk';

    const historyRows = history.length
        ? history.map(entry => {
            const typeLabel = entry.skadeType || entry.skadeStatus || 'Skade';
            const fromLabel = formatPlayerInjuryHistoryDate(entry.fraDato) || '–';
            const toLabel = formatPlayerInjuryHistoryDate(entry.tilDato) || '–';
            const note = entry.skadeNotat ? String(entry.skadeNotat).trim() : '';
            return `
                <li class="player-profile-injury-history-row">
                    <div class="player-profile-injury-history-main">
                        <span class="player-profile-injury-history-type">${escapeRosterHtml(typeLabel)}</span>
                        <span class="player-profile-injury-history-dates">${escapeRosterHtml(fromLabel)} – ${escapeRosterHtml(toLabel)}</span>
                    </div>
                    ${note ? `<p class="player-profile-injury-history-note">${escapeRosterHtml(note)}</p>` : ''}
                </li>
            `;
        }).join('')
        : '';

    return `
        <p class="player-profile-injury-text">${escapeRosterHtml(currentLabel)}</p>
        <div class="player-profile-injury-history">
            <p class="player-profile-injury-history-title">Historikk</p>
            ${history.length
                ? `<ul class="player-profile-injury-history-list">${historyRows}</ul>`
                : `<p class="player-profile-injury-history-empty">Ingen tidligere skader registrert.</p>`
            }
        </div>
    `;
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
        if (window.rosterStatusFilter !== 'alle' && window.rosterStatusFilter !== 'skadet' && p.status !== window.rosterStatusFilter) return false;

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

function bindAdminTeamsListEvents() {
    const listContainer = document.getElementById('admin-teams-list');
    if (!listContainer || listContainer.dataset.eventsBound === 'true') return;

    listContainer.dataset.eventsBound = 'true';
    listContainer.addEventListener('click', (event) => {
        const button = event.target.closest('[data-team-action]');
        if (!button) return;

        const action = button.dataset.teamAction;
        const teamId = button.dataset.teamId || null;

        if (action === 'edit' && teamId) {
            window.openTeamModal(teamId);
        } else if (action === 'delete') {
            window.promptDeleteTeam(teamId);
        }
    });
}

function bindPlayerRosterEvents() {
    const listContainer = document.getElementById('playerRosterContainer');
    if (!listContainer || listContainer.dataset.eventsBound === 'true') return;

    listContainer.dataset.eventsBound = 'true';
    listContainer.addEventListener('click', (event) => {
        const row = event.target.closest('[data-player-id]');
        if (!row) return;

        const playerId = row.dataset.playerId;
        if (playerId && typeof window.showPlayerProfile === 'function') {
            window.showPlayerProfile(playerId);
        } else if (playerId) {
            window.openPlayerModal(playerId);
        }
    });
    listContainer.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const row = event.target.closest('[data-player-id]');
        if (!row) return;

        event.preventDefault();
        const playerId = row.dataset.playerId;
        if (playerId && typeof window.showPlayerProfile === 'function') {
            window.showPlayerProfile(playerId);
        } else if (playerId) {
            window.openPlayerModal(playerId);
        }
    });
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

    return `
        <article class="roster-player-row ${rowStateClasses}" data-player-id="${escapeRosterHtml(p.id)}" role="button" tabindex="0">
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

    bindPlayerRosterEvents();

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

function buildPlayerPositionLabel(player) {
    if (!player?.pos1 || player.pos1 === '-') return 'Ukjent posisjon';
    return player.pos2 && player.pos2 !== '-'
        ? `${player.pos1} / ${player.pos2}`
        : player.pos1;
}

function getPlayerProfileStats(player, yearFilter = 'alle') {
    if (!player || typeof window.buildPlayerStatsData !== 'function') return null;
    const options = yearFilter === 'alle'
        ? {}
        : { applyYearFilter: true, yearFilter };
    return window.buildPlayerStatsData(options).find(stat => stat.navn === player.navn) || null;
}

function buildPlayerProfileMetricHtml(label, value) {
    return `
        <div class="player-profile-metric">
            <span class="player-profile-metric-label">${escapeRosterHtml(label)}</span>
            <span class="player-profile-metric-value">${escapeRosterHtml(value)}</span>
        </div>
    `;
}

function buildPlayerProfileAvatarHtml(player) {
    const photoUrl = getRosterPlayerPhotoUrl(player);

    return `
        <div class="player-profile-avatar" aria-hidden="true">
            ${photoUrl
                ? `<img src="${escapeRosterHtml(photoUrl)}" alt="">`
                : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
        </div>
    `;
}

function renderPlayerModalProfile(player) {
    const profileEl = document.getElementById('playerModalProfile');
    if (!profileEl || !player) return;

    const currentYear = new Date().getFullYear();
    const birthYear = player.fodselsaar ? String(player.fodselsaar) : '';
    const age = birthYear ? currentYear - parseInt(birthYear, 10) : null;
    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(player)
        : { isInjured: false, label: '' };
    const stats = getPlayerProfileStats(player);
    const jersey = player.draktnummer ? `#${player.draktnummer}` : '-';
    const posLabel = buildPlayerPositionLabel(player);
    const foot = player.fot ? `${player.fot} fot` : 'Ukjent fot';
    const ageLabel = age != null && birthYear ? `${age} år (${birthYear})` : (birthYear || '-');
    const captainMark = player.isCaptain ? '<span class="player-profile-captain" title="Kaptein">⚓</span>' : '';
    const oppmote = stats ? `${stats.oppmotePct}%` : '-';
    const form = stats && stats.kjemi > 0 ? `${stats.kjemi}/100` : '-';
    const kampbidrag = stats && stats.kampbonus > 0 ? String(Math.round(stats.kampbonus)) : '-';
    const kamper = stats ? String(stats.kamper) : '0';
    const mal = stats ? String(stats.mal) : '0';
    const assist = stats ? String(stats.assist) : '0';
    const gule = stats ? String((stats.guleSerie || 0) + (stats.guleCup || 0)) : '0';
    const rode = stats ? String((stats.rodeSerie || 0) + (stats.rodeCup || 0)) : '0';
    const bb = stats ? String(stats.bb || 0) : '0';
    const hasMatchData = stats && (stats.kamper > 0 || stats.attendedMatches > 0);

    profileEl.innerHTML = `
        <div class="player-profile-hero">
            ${buildPlayerProfileAvatarHtml(player)}
            <div class="player-profile-hero-main">
                <h3 class="player-profile-name">${escapeRosterHtml(player.navn)}${captainMark}</h3>
                <div class="player-profile-badges">
                    ${buildRosterStatusBadge(player.status)}
                    ${buildRosterInjuryBadge(injuryInfo)}
                </div>
                <p class="player-profile-subtitle">${escapeRosterHtml(posLabel)} · ${escapeRosterHtml(player.spillerLag || window.getPrimaryTeamName())}</p>
            </div>
            <div class="player-profile-jersey">${escapeRosterHtml(jersey)}</div>
        </div>

        <div class="player-profile-section">
            <p class="player-profile-section-title">Spillerinfo</p>
            <div class="player-profile-grid">
                ${buildPlayerProfileMetricHtml('Lag', player.spillerLag || window.getPrimaryTeamName())}
                ${buildPlayerProfileMetricHtml('Posisjon', posLabel)}
                ${buildPlayerProfileMetricHtml('Fot', foot)}
                ${buildPlayerProfileMetricHtml('Status', player.status || '-')}
                ${buildPlayerProfileMetricHtml('Tilknyttet', formatPlayerJoinedFromLabel(player))}
                ${buildPlayerProfileMetricHtml('Alder', ageLabel)}
            </div>
        </div>

        ${injuryInfo.isInjured ? `
            <div class="player-profile-section player-profile-section-injury">
                <p class="player-profile-section-title">Skade</p>
                <p class="player-profile-injury-text">${escapeRosterHtml(injuryInfo.label)}</p>
            </div>
        ` : ''}

        <div class="player-profile-section">
            <p class="player-profile-section-title">Statistikk</p>
            ${hasMatchData ? `
                <div class="player-profile-grid player-profile-grid-stats">
                    ${buildPlayerProfileMetricHtml('Kamper', kamper)}
                    ${buildPlayerProfileMetricHtml('Mål', mal)}
                    ${buildPlayerProfileMetricHtml('Assist', assist)}
                    ${buildPlayerProfileMetricHtml('Oppmøte', oppmote)}
                    ${buildPlayerProfileMetricHtml('Form', form)}
                    ${buildPlayerProfileMetricHtml('Kampbidrag', kampbidrag)}
                    ${buildPlayerProfileMetricHtml('Gule kort', gule)}
                    ${buildPlayerProfileMetricHtml('Røde kort', rode)}
                    ${buildPlayerProfileMetricHtml('Banens beste', bb)}
                </div>
            ` : `
                <p class="player-profile-empty">Ingen kampdata registrert ennå.</p>
            `}
        </div>
    `;
}

function getPlayerProfileYearOptions(player) {
    if (typeof window.getStatsSpillerYearOptions === 'function') {
        return window.getStatsSpillerYearOptions();
    }
    const years = new Set();
    (window.activeMatches || []).forEach(match => {
        if (match.matchGroup !== player?.spillerLag) return;
        const year = typeof window.getMatchStatsYear === 'function'
            ? window.getMatchStatsYear(match)
            : (match.date ? new Date(match.date).getFullYear() : null);
        if (year) years.add(year);
    });
    return [...years].sort((a, b) => b - a);
}

function getPlayerProfileYearFilter(player) {
    const years = getPlayerProfileYearOptions(player);
    const current = window.playerProfileYearFilter;
    if (current === 'alle') return 'alle';
    if (current && years.includes(Number(current))) return Number(current);
    return years[0] || new Date().getFullYear();
}

function buildPlayerProfileYearFilterHtml(player) {
    const years = getPlayerProfileYearOptions(player);
    if (!years.length) return '';
    const selected = getPlayerProfileYearFilter(player);
    return `
        <div class="player-profile-year-filter" role="tablist" aria-label="Filtrer etter år">
            <button
                type="button"
                role="tab"
                aria-selected="${selected === 'alle' ? 'true' : 'false'}"
                class="bsk-btn bsk-btn-chip player-profile-year-btn ${selected === 'alle' ? 'is-active' : ''}"
                data-player-profile-action="set-year"
                data-year="alle"
            >Alle</button>
            ${years.map(year => `
                <button
                    type="button"
                    role="tab"
                    aria-selected="${selected === year ? 'true' : 'false'}"
                    class="bsk-btn bsk-btn-chip player-profile-year-btn ${selected === year ? 'is-active' : ''}"
                    data-player-profile-action="set-year"
                    data-year="${year}"
                >${year}</button>
            `).join('')}
        </div>
    `;
}

function buildPlayerProfileStatChipHtml(label, value, options = {}) {
    const toneClass = options.tone ? ` is-${options.tone}` : '';
    return `
        <div class="player-profile-stat-chip${toneClass}">
            <span class="player-profile-stat-chip-value">${escapeRosterHtml(value)}</span>
            <span class="player-profile-stat-chip-label">${escapeRosterHtml(label)}</span>
        </div>
    `;
}

function getPlayerProfileTrainingRows(player, limit = 8) {
    const teamName = player?.spillerLag || window.getPrimaryTeamName();
    return (window.activeEvents || [])
        .filter(event => {
            if (event.team !== teamName) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(event)) return false;
            if (typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(player, event)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, limit)
        .map(event => {
            const attended = window.isPlayerAttending(event.attendance, player);
            const dateLabel = event.date
                ? (typeof window.formatStatsShortDate === 'function'
                    ? window.formatStatsShortDate(event.date)
                    : event.date)
                : '-';
            return {
                id: event.id,
                title: event.title || event.type || 'Trening',
                dateLabel,
                attended
            };
        });
}

function buildPlayerProfileTrainingHtml(player) {
    const rows = getPlayerProfileTrainingRows(player);
    if (!rows.length) {
        return `<p class="player-profile-empty">Ingen treningsaktiviteter registrert ennå.</p>`;
    }

    return `
        <ul class="player-profile-training-list">
            ${rows.map(row => `
                <li class="player-profile-training-row ${row.attended ? 'is-attended' : 'is-missed'}">
                    <span class="player-profile-training-date">${escapeRosterHtml(row.dateLabel)}</span>
                    <span class="player-profile-training-title">${escapeRosterHtml(row.title)}</span>
                    <span class="player-profile-training-status">${row.attended ? 'Møtt' : 'Ikke møtt'}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function bindPlayerProfilePageEvents() {
    const root = document.getElementById('spillerprofil-content');
    if (!root || root.dataset.eventsBound === 'true') return;
    root.dataset.eventsBound = 'true';

    root.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-player-profile-action]');
        if (!actionEl || !root.contains(actionEl)) return;

        const action = actionEl.dataset.playerProfileAction;
        const playerId = window.activePlayerProfileId;

        if (action === 'go-back') {
            if (typeof window.goBackToPreviousPortalPage === 'function' && window.goBackToPreviousPortalPage()) return;
            if (typeof window.switchTab === 'function') window.switchTab('tropp', { skipHistory: true });
            return;
        }

        if (action === 'set-year') {
            const year = actionEl.dataset.year;
            window.playerProfileYearFilter = year === 'alle' ? 'alle' : Number(year);
            if (playerId) window.renderPlayerProfilePage(playerId);
            return;
        }

        if (action === 'edit' && playerId) {
            window.openPlayerModal(playerId, { editOnly: true });
            return;
        }

        if (action === 'delete' && playerId) {
            window.promptDeletePlayer(playerId);
            return;
        }

        if (action === 'open-form-info' && typeof window.openStatsFormInfoModal === 'function') {
            window.openStatsFormInfoModal();
        }
    });
}

window.renderPlayerProfilePage = function(playerId) {
    const container = document.getElementById('spillerprofil-content');
    if (!container) return;

    bindPlayerProfilePageEvents();

    const player = (window.activePlayers || []).find(item => item.id === playerId);
    if (!player) {
        container.innerHTML = `
            <section class="match-detail-card player-profile-shell">
                <p class="player-profile-empty">Fant ikke spilleren.</p>
                <div class="player-profile-page-actions relative z-10">
                    <button type="button" class="bsk-btn bsk-btn-secondary player-profile-back-btn" data-player-profile-action="go-back">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                        <span>Tilbake</span>
                    </button>
                </div>
            </section>
        `;
        return;
    }

    const yearFilter = getPlayerProfileYearFilter(player);
    const currentYear = new Date().getFullYear();
    const birthYear = player.fodselsaar ? String(player.fodselsaar) : '';
    const age = birthYear ? currentYear - parseInt(birthYear, 10) : null;
    const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
        ? window.getPlayerInjuryInfo(player)
        : { isInjured: false, label: '' };
    const stats = getPlayerProfileStats(player, yearFilter);
    const formComponents = typeof window.getPlayerFormComponents === 'function'
        ? window.getPlayerFormComponents(player.navn, { yearFilter })
        : { total: 0 };
    const teamMedian = typeof window.getTeamFormMedian === 'function'
        ? window.getTeamFormMedian(player.spillerLag)
        : 0;
    const formTone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(formComponents.total, player.spillerLag)
        : 'none';
    const formComparison = teamMedian > 0
        ? (formComponents.total >= teamMedian + 8
            ? 'Over lagsmedian'
            : formComponents.total < teamMedian - 8
                ? 'Under lagsmedian'
                : 'Om lagsmedian')
        : 'Ingen sammenligning';

    const history = typeof window.getPlayerMatchPointsHistory === 'function'
        ? window.getPlayerMatchPointsHistory(player.navn, { applyYearFilter: true, yearFilter })
        : [];
    const trendData = typeof window.getPlayerPerformanceTrend === 'function'
        ? window.getPlayerPerformanceTrend(player.navn, { applyYearFilter: true, yearFilter })
        : [];
    const matchHistoryHtml = typeof window.renderPlayerFormHistoryTableHtml === 'function'
        ? window.renderPlayerFormHistoryTableHtml(player.navn, history)
        : '<p class="player-profile-empty">Ingen kamper registrert.</p>';
    const trendHtml = typeof window.renderPlayerTrendChartSvg === 'function' && trendData.length
        ? window.renderPlayerTrendChartSvg(trendData)
        : '<p class="player-profile-empty">Ikke nok kamper til å vise utvikling.</p>';

    const jersey = player.draktnummer ? String(player.draktnummer) : '-';
    const posLabel = buildPlayerPositionLabel(player);
    const foot = player.fot ? `${player.fot} fot` : 'Ukjent fot';
    const ageLabel = age != null && birthYear ? `${age} år (${birthYear})` : (birthYear || '-');
    const captainMark = player.isCaptain ? '<span class="player-profile-captain" title="Kaptein">⚓</span>' : '';
    const yearLabel = yearFilter === 'alle' ? 'Alle år' : String(yearFilter);

    const oppmote = stats ? `${stats.oppmotePct}%` : '-';
    const form = formComponents.total > 0 ? `${formComponents.total}` : '-';
    const kampbidrag = stats && stats.kampbonus > 0 ? String(Math.round(stats.kampbonus * 10) / 10) : '-';
    const snittBors = stats && stats.snittBors > 0 ? (Math.round(Number(stats.snittBors) * 10) / 10).toFixed(1) : '-';
    const kamper = stats ? String(stats.kamper) : '0';
    const mal = stats ? String(stats.mal) : '0';
    const assist = stats ? String(stats.assist) : '0';
    const guleSerie = stats ? String(stats.guleSerie || 0) : '0';
    const guleCup = stats ? String(stats.guleCup || 0) : '0';
    const rodeSerie = stats ? String(stats.rodeSerie || 0) : '0';
    const rodeCup = stats ? String(stats.rodeCup || 0) : '0';
    const bb = stats ? String(stats.bb || 0) : '0';
    const totalScore = stats && stats.totalScore > 0 ? String(stats.totalScore) : '-';

    let totalRank = 0;
    if (stats && typeof window.buildPlayerStatsData === 'function') {
        const rows = window.buildPlayerStatsData({
            applyYearFilter: yearFilter !== 'alle',
            yearFilter
        }).filter(stat => (Number(stat.attendedMatches) || 0) > 0 || (Number(stat.oppmotePct) || 0) > 0);
        rows.sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0));
        totalRank = rows.findIndex(stat => stat.navn === player.navn) + 1;
    }

    const formToneClass = formTone === 'green' ? 'is-green' : formTone === 'red' ? 'is-red' : formTone === 'amber' ? 'is-amber' : 'is-muted';

    container.innerHTML = `
        <section class="match-detail-card player-profile-shell">
            <div class="dashboard-next-match-watermark player-profile-page-watermark" aria-hidden="true">
                <i class="fa-solid fa-user"></i>
            </div>

            <div class="player-profile-page-hero relative z-10">
                ${buildPlayerProfileAvatarHtml(player)}
                <div class="player-profile-page-hero-main">
                    <div class="player-profile-page-hero-meta">
                        <span class="player-profile-page-jersey">#${escapeRosterHtml(jersey)}</span>
                        <div class="player-profile-badges">
                            ${buildRosterStatusBadge(player.status)}
                            ${buildRosterInjuryBadge(injuryInfo)}
                        </div>
                    </div>
                    <h1 class="player-profile-page-name">${escapeRosterHtml(player.navn)}${captainMark}</h1>
                    <p class="player-profile-page-subtitle">${escapeRosterHtml(posLabel)} · ${escapeRosterHtml(player.spillerLag || window.getPrimaryTeamName())}</p>
                    <div class="player-profile-page-form-row">
                        <span class="player-profile-form-chip ${formToneClass}" title="${escapeRosterHtml(formComparison)}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}">
                            Form ${escapeRosterHtml(form)}/100
                        </span>
                        <span class="player-profile-form-note">${escapeRosterHtml(formComparison)}${teamMedian > 0 ? ` · median ${teamMedian}` : ''}</span>
                    </div>
                </div>
            </div>

            <div class="player-profile-page-actions relative z-10">
                <button type="button" class="bsk-btn bsk-btn-secondary player-profile-back-btn" data-player-profile-action="go-back" title="Tilbake" aria-label="Tilbake til tropp">
                    <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    <span>Tilbake</span>
                </button>
                <button type="button" class="bsk-btn bsk-btn-primary player-profile-action-btn" data-player-profile-action="edit">
                    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    <span>Rediger</span>
                </button>
                <button type="button" class="bsk-btn bsk-btn-danger player-profile-action-btn" data-player-profile-action="delete">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                    <span>Slett</span>
                </button>
            </div>
        </section>

        <section class="match-detail-card player-profile-panel relative">
            <div class="player-profile-section">
                <p class="player-profile-section-title">Spillerinfo</p>
                <div class="player-profile-grid">
                    ${buildPlayerProfileMetricHtml('Lag', player.spillerLag || window.getPrimaryTeamName())}
                    ${buildPlayerProfileMetricHtml('Posisjon', posLabel)}
                    ${buildPlayerProfileMetricHtml('Fot', foot)}
                    ${buildPlayerProfileMetricHtml('Status', player.status || '-')}
                    ${buildPlayerProfileMetricHtml('Tilknyttet', formatPlayerJoinedFromLabel(player))}
                    ${buildPlayerProfileMetricHtml('Alder', ageLabel)}
                </div>
            </div>

            <div class="player-profile-section ${injuryInfo.isInjured ? 'player-profile-section-injury' : ''}">
                <p class="player-profile-section-title">Skade</p>
                ${buildPlayerInjuryHistoryHtml(player, injuryInfo)}
            </div>
        </section>

        <section class="match-detail-card player-profile-panel relative">
            <div class="player-profile-panel-header">
                <div class="min-w-0">
                    <h2 class="player-profile-panel-title">Sesong i tall</h2>
                    <p class="player-profile-panel-subtitle">${escapeRosterHtml(yearLabel)} · kamp, oppmøte og disiplin</p>
                </div>
                ${buildPlayerProfileYearFilterHtml(player)}
            </div>
            <div class="player-profile-stat-grid">
                ${buildPlayerProfileStatChipHtml('Kamper', kamper)}
                ${buildPlayerProfileStatChipHtml('Mål', mal)}
                ${buildPlayerProfileStatChipHtml('Assist', assist)}
                ${buildPlayerProfileStatChipHtml('Snittbørs', snittBors)}
                ${buildPlayerProfileStatChipHtml('Kampbidrag', kampbidrag)}
                ${buildPlayerProfileStatChipHtml('Oppmøte', oppmote)}
                ${buildPlayerProfileStatChipHtml('Form', formComponents.total > 0 ? `${formComponents.total}/100` : '-')}
                ${buildPlayerProfileStatChipHtml('Banens beste', bb)}
                ${buildPlayerProfileStatChipHtml('Gule (serie)', guleSerie)}
                ${buildPlayerProfileStatChipHtml('Gule (cup)', guleCup)}
                ${buildPlayerProfileStatChipHtml('Røde (serie)', rodeSerie)}
                ${buildPlayerProfileStatChipHtml('Røde (cup)', rodeCup)}
                ${buildPlayerProfileStatChipHtml('Total score', totalScore)}
                ${buildPlayerProfileStatChipHtml('Plassering', totalRank > 0 ? `#${totalRank}` : '-')}
            </div>
        </section>

        <section class="match-detail-card player-profile-panel relative">
            <div class="player-profile-panel-header">
                <div class="min-w-0">
                    <h2 class="player-profile-panel-title">Utvikling</h2>
                    <p class="player-profile-panel-subtitle">Spillerutvikling vs troppens utvikling. Nyeste kamp til høyre.</p>
                </div>
                <button type="button" class="bsk-btn bsk-btn-chip player-profile-info-btn" data-player-profile-action="open-form-info" title="Statsforklaring" aria-label="Statsforklaring">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>Statsforklaring</span>
                </button>
            </div>
            <div class="player-profile-chart-wrap">${trendHtml}</div>
            <div class="stats-chart-legend player-profile-chart-legend" aria-hidden="true">
                <span class="stats-chart-legend-item is-kampbidrag"><i></i> Spiller utvikling</span>
                <span class="stats-chart-legend-item is-team-median"><i></i> Lagsmedian</span>
            </div>
        </section>

        <section class="match-detail-card player-profile-panel relative">
            <div class="player-profile-panel-header">
                <div class="min-w-0 player-profile-panel-heading">
                    <h2 class="player-profile-panel-title">
                        Kamp for Kamp
                        <span class="player-profile-year-chip">${escapeRosterHtml(yearLabel)}</span>
                    </h2>
                </div>
            </div>
            <div class="player-profile-history-wrap">${matchHistoryHtml}</div>
        </section>

        <section class="match-detail-card player-profile-panel relative">
            <div class="player-profile-panel-header">
                <div class="min-w-0">
                    <h2 class="player-profile-panel-title">Trening / oppmøte</h2>
                    <p class="player-profile-panel-subtitle">Siste aktiviteter spilleren kunne møtt på</p>
                </div>
            </div>
            ${buildPlayerProfileTrainingHtml(player)}
        </section>
    `;
};

window.showPlayerProfile = function(playerId, options = {}) {
    if (!playerId) return;
    const player = (window.activePlayers || []).find(item => item.id === playerId);
    if (!player) return;

    window.activePlayerProfileId = playerId;
    if (window.playerProfileYearFilter == null) {
        window.playerProfileYearFilter = typeof window.getStatsSpillerYearFilter === 'function'
            ? window.getStatsSpillerYearFilter()
            : new Date().getFullYear();
    }

    window.renderPlayerProfilePage(playerId);

    const backTarget = options.backTarget
        || window.pendingPlayerProfileBackTab
        || (window.currentTab && window.currentTab !== 'spillerprofil' ? window.currentTab : 'tropp');
    window.pendingPlayerProfileBackTab = null;

    if (typeof window.switchTab === 'function') {
        window.switchTab('spillerprofil', { backTarget });
    }
};

window.setPlayerModalView = function(mode = 'profile') {
    const profileEl = document.getElementById('playerModalProfile');
    const formEl = document.getElementById('playerForm');
    const tabsEl = document.getElementById('playerModalTabs');
    const footer = document.querySelector('.player-modal-footer');
    const saveBtn = footer ? footer.querySelector('[form="playerForm"]') : null;
    const deleteBtn = document.getElementById('playerModalDeleteBtn');
    const editPlayerId = document.getElementById('editPlayerId')?.value || '';
    const isExistingPlayer = Boolean(editPlayerId);
    const editOnly = Boolean(window._playerModalEditOnly);
    const isProfile = mode === 'profile' && isExistingPlayer && !editOnly;

    if (tabsEl) tabsEl.classList.toggle('hidden', !isExistingPlayer || editOnly);
    if (profileEl) profileEl.classList.toggle('hidden', !isProfile);
    if (formEl) formEl.classList.toggle('hidden', isProfile);

    const profileTab = document.getElementById('playerModalTabProfile');
    const editTab = document.getElementById('playerModalTabEdit');
    if (profileTab) {
        profileTab.classList.toggle('is-active', isProfile);
        profileTab.setAttribute('aria-selected', isProfile ? 'true' : 'false');
    }
    if (editTab) {
        editTab.classList.toggle('is-active', !isProfile);
        editTab.setAttribute('aria-selected', !isProfile ? 'true' : 'false');
    }

    const titleEl = document.getElementById('playerFormTitle');
    if (titleEl) {
        if (!isExistingPlayer) titleEl.innerText = 'Ny spiller';
        else if (isProfile) titleEl.innerText = 'Spillerprofil';
        else titleEl.innerText = 'Rediger spiller';
    }

    if (footer) {
        footer.classList.toggle('is-profile-mode', isProfile);
        footer.classList.toggle('is-edit-mode', !isProfile && isExistingPlayer);
    }
    if (saveBtn) saveBtn.classList.toggle('hidden', isProfile);
    if (deleteBtn) deleteBtn.classList.toggle('hidden', isProfile || !isExistingPlayer);
    const cancelBtn = footer ? footer.querySelector('.player-modal-cancel-btn') : null;
    if (cancelBtn) cancelBtn.classList.toggle('hidden', isProfile);
};

window.openPlayerModal = function(editPlayerId = null, options = {}) {
    const modal = document.getElementById('playerModal');
    document.getElementById('playerForm').reset();
    document.getElementById('editPlayerId').value = '';
    window.updateDynamicSelectors();
    window._playerModalEditOnly = Boolean(options.editOnly);
    window._playerModalWasInjured = false;

    if (editPlayerId) {
        const pObj = (window.activePlayers || []).find(p => p.id === editPlayerId);
        if (pObj) {
            document.getElementById('playerFormTitle').innerText = 'Rediger spiller';
            document.getElementById('editPlayerId').value = pObj.id;
            document.getElementById('playerNameInput').value = pObj.navn;
            document.getElementById('playerJerseyInput').value = pObj.draktnummer || '';
            document.getElementById('playerBirthYearInput').value = pObj.fodselsaar;
            document.getElementById('playerStatusInput').value = pObj.status;
            const joinedFromInput = document.getElementById('playerJoinedFromInput');
            if (joinedFromInput) {
                joinedFromInput.value = typeof window.getPlayerJoinedFromDate === 'function'
                    ? window.getPlayerJoinedFromDate(pObj)
                    : (pObj.tilknyttetFra || '');
            }
            document.getElementById('playerTeamInput').value = pObj.spillerLag || window.getPrimaryTeamName();
            document.getElementById('playerPos1Input').value = pObj.pos1;
            document.getElementById('playerPos2Input').value = pObj.pos2 || '-';
            document.getElementById('playerFootInput').value = pObj.fot || 'Høyre';
            document.getElementById('playerSkadeStatusInput').value = pObj.skadeStatus || 'frisk';
            document.getElementById('playerSkadeNotatInput').value = pObj.skadeNotat || '';
            document.getElementById('playerSkadeFraDatoInput').value = pObj.skadeFraDato || '';
            document.getElementById('playerSkadeTilDatoInput').value = pObj.skadeTilDato || '';
            window._playerModalWasInjured = isPlayerCurrentlyInjured(pObj);
            const friskDatoInput = document.getElementById('playerSkadeFriskDatoInput');
            if (friskDatoInput) friskDatoInput.value = getTodayDateString();
            window.togglePlayerSkadeFields();
        }
    } else {
        document.getElementById('playerFormTitle').innerText = 'Ny spiller';
        document.getElementById('playerPos1Input').value = '-';
        document.getElementById('playerPos2Input').value = '-';
        const joinedFromInput = document.getElementById('playerJoinedFromInput');
        if (joinedFromInput) joinedFromInput.value = getTodayDateString();
        document.getElementById('playerSkadeStatusInput').value = 'frisk';
        document.getElementById('playerSkadeNotatInput').value = '';
        document.getElementById('playerSkadeFraDatoInput').value = '';
        document.getElementById('playerSkadeTilDatoInput').value = '';
        const friskDatoInput = document.getElementById('playerSkadeFriskDatoInput');
        if (friskDatoInput) friskDatoInput.value = getTodayDateString();
        window.togglePlayerSkadeFields();
    }

    const deleteBtn = document.getElementById('playerModalDeleteBtn');
    const footer = document.querySelector('.player-modal-footer');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !editPlayerId || window._playerModalEditOnly);
    if (footer) footer.classList.toggle('is-edit-mode', Boolean(editPlayerId));

    if (editPlayerId && !window._playerModalEditOnly) {
        const profilePlayer = (window.activePlayers || []).find(p => p.id === editPlayerId);
        if (profilePlayer) renderPlayerModalProfile(profilePlayer);
        window.setPlayerModalView('profile');
    } else {
        const profileEl = document.getElementById('playerModalProfile');
        if (profileEl) profileEl.innerHTML = '';
        window.setPlayerModalView('edit');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.togglePlayerSkadeFields = function() {
    const status = document.getElementById('playerSkadeStatusInput')?.value || 'frisk';
    const isInjured = status !== 'frisk';
    const isClearingInjury = !isInjured && Boolean(window._playerModalWasInjured);
    const fromDateWrap = document.getElementById('playerSkadeFraDatoWrap');
    const dateWrap = document.getElementById('playerSkadeTilDatoWrap');
    const notatWrap = document.getElementById('playerSkadeNotatWrap');
    const friskDatoWrap = document.getElementById('playerSkadeFriskDatoWrap');
    const friskDatoInput = document.getElementById('playerSkadeFriskDatoInput');
    if (fromDateWrap) fromDateWrap.classList.toggle('hidden', !isInjured);
    if (dateWrap) dateWrap.classList.toggle('hidden', !isInjured);
    if (notatWrap) notatWrap.classList.toggle('hidden', !isInjured);
    if (friskDatoWrap) friskDatoWrap.classList.toggle('hidden', !isClearingInjury);
    if (isClearingInjury && friskDatoInput && !friskDatoInput.value) {
        friskDatoInput.value = getTodayDateString();
    }
};

window.closePlayerModal = function() {
    const profileEl = document.getElementById('playerModalProfile');
    if (profileEl) profileEl.innerHTML = '';
    window._playerModalEditOnly = false;
    window._playerModalWasInjured = false;
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
    const tilknyttetFra = (document.getElementById('playerJoinedFromInput')?.value || '').trim();
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
        tilknyttetFra,
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
        const recoveredOn = document.getElementById('playerSkadeFriskDatoInput')?.value || todayStr;
        const injuryStart = existingPlayer.skadeFraDato || '';
        if (injuryStart && recoveredOn && recoveredOn < injuryStart) {
            alert('Friskmeldt-dato kan ikke være før skadet-fra-dato.');
            return;
        }
        playerData = finishPlayerInjury(existingPlayer, recoveredOn);
        playerData = {
            ...playerData,
            id: existingPlayer.id,
            navn,
            draktnummer,
            fodselsaar,
            status,
            tilknyttetFra,
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
    if (window.currentTab === 'spillerprofil' && window.activePlayerProfileId && typeof window.renderPlayerProfilePage === 'function') {
        window.renderPlayerProfilePage(window.activePlayerProfileId);
    }
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
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();

    return updatedPlayer;
};

window.promptDeletePlayer = function(id) {
    const player = (window.activePlayers || []).find(item => item.id === id);
    const playerName = player?.navn ? `«${player.navn}»` : 'denne spilleren';
    window.customConfirm(
        'Slette spiller?',
        `Vil du slette ${playerName} fra troppen? Spilleren og tilknyttet data fjernes permanent.`,
        async () => {
            try {
                await window.deletePlayerFromDatabase(id);
                window.closePlayerModal();
                window.renderPlayerRoster();
                if (window.activePlayerProfileId === id) {
                    window.activePlayerProfileId = null;
                    if (typeof window.switchTab === 'function') {
                        window.switchTab('tropp', { skipHistory: true });
                    }
                }
            } catch (error) {
                console.error(error);
                alert(error.message || 'Kunne ikke slette spiller i databasen. Prøv igjen.');
            }
        },
        { confirmLabel: 'Ja, slett', danger: true }
    );
};

window.deletePlayerFromModal = function() {
    const id = document.getElementById('editPlayerId')?.value;
    if (id) window.promptDeletePlayer(id);
};
