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
window.rosterMode = 'now';
window.rosterPlanFilter = 'Uavklart';
window.ROSTER_PLAN_SOURCE_YEAR = 2026;
window.ROSTER_PLAN_YEAR = 2027;
window.ROSTER_PLAN_STATUSES = ['Uavklart', 'Fortsetter', 'Slutter', 'Ny spiller'];

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

function formatPlayerAffiliationDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPlayerJoinedFromLabel(player) {
    const joinedFrom = typeof window.getPlayerJoinedFromDate === 'function'
        ? window.getPlayerJoinedFromDate(player)
        : (player?.tilknyttetFra || '');
    const leftTo = typeof window.getPlayerLeftToDate === 'function'
        ? window.getPlayerLeftToDate(player)
        : (player?.tilknyttetTil || '');
    const fromLabel = joinedFrom ? formatPlayerAffiliationDate(joinedFrom) : 'Fra start';
    if (!leftTo) return fromLabel;
    return `${fromLabel} – ${formatPlayerAffiliationDate(leftTo)}`;
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

function buildPlayerInjuryHistoryHtml(player) {
    const history = getPlayerInjuryHistoryEntries(player);
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

    if (!history.length) {
        return `<p class="player-profile-injury-history-empty">Ingen tidligere skader registrert.</p>`;
    }
    return `<ul class="player-profile-injury-history-list">${historyRows}</ul>`;
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

function getPlayerUtviklingsmoment(player) {
    return String(player?.utviklingsmoment || '').trim();
}

function buildPlayerUtviklingsmomentSectionHtml(player) {
    const moment = getPlayerUtviklingsmoment(player);
    return `
        <div class="player-profile-section">
            <p class="player-profile-section-title">Utviklingsmoment</p>
            <p class="player-profile-moment-text${moment ? '' : ' is-empty'}">${escapeRosterHtml(moment || 'Ikke satt')}</p>
        </div>
    `;
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

function isPlayerLeftSquad(player) {
    if (typeof window.isPlayerDeregistered === 'function') {
        return window.isPlayerDeregistered(player);
    }
    const leftTo = typeof window.getPlayerLeftToDate === 'function'
        ? window.getPlayerLeftToDate(player)
        : (player?.tilknyttetTil || '');
    if (!leftTo) return false;
    return leftTo < getTodayDateString();
}

function getPlayerDisplayStatus(player) {
    if (typeof window.isPlayerDeregistered === 'function' && window.isPlayerDeregistered(player)) {
        return 'Utregistrert';
    }
    return player?.status || '-';
}

window.syncPlayerStatusWithLeftToDate = function() {
    const leftToInput = document.getElementById('playerLeftToInput');
    const statusInput = document.getElementById('playerStatusInput');
    if (!leftToInput || !statusInput) return;
    if (window._rosterPlanNewPlayer) {
        statusInput.value = 'Passiv';
        return;
    }
    const leftTo = (leftToInput.value || '').trim();
    if (leftTo) {
        statusInput.value = 'Utregistrert';
        return;
    }
    if (statusInput.value === 'Utregistrert') {
        statusInput.value = 'Passiv';
    }
};

window.syncPlayerLeftToDateWithStatus = function() {
    const leftToInput = document.getElementById('playerLeftToInput');
    const statusInput = document.getElementById('playerStatusInput');
    if (!leftToInput || !statusInput) return;
    if (statusInput.value === 'Utregistrert') {
        if (!(leftToInput.value || '').trim()) {
            leftToInput.value = getTodayDateString();
        }
        return;
    }
    // Leaving Utregistrert clears sluttdato so they re-enter current tropp cleanly.
    leftToInput.value = '';
};

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

        // Utregistrert skjules fra tropplisten, men forblir søkbare for historikk/profil.
        if (!searchTerm && isPlayerLeftSquad(p)) return false;

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
    if (status === 'Utregistrert') {
        return `<span class="roster-badge roster-badge-muted" title="Ikke lenger tilknyttet troppen">${safeStatus}</span>`;
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
        if (event.target.closest('[data-roster-plan-control]')) return;
        const row = event.target.closest('[data-player-id]');
        if (!row) return;

        const playerId = row.dataset.playerId;
        if (playerId && typeof window.showPlayerProfile === 'function') {
            window.showPlayerProfile(playerId);
        } else if (playerId) {
            window.openPlayerModal(playerId);
        }
    });
    listContainer.addEventListener('change', (event) => {
        const select = event.target.closest('[data-roster-plan-status]');
        if (!select) return;
        const row = select.closest('[data-player-id]');
        if (!row) return;
        window.saveRosterSeasonPlan(row.dataset.playerId, { status: select.value });
    });
    listContainer.addEventListener('focusout', (event) => {
        const note = event.target.closest('[data-roster-plan-note]');
        if (!note) return;
        const row = note.closest('[data-player-id]');
        if (!row) return;
        if (note.value === (note.dataset.savedNote || '')) return;
        window.saveRosterSeasonPlan(row.dataset.playerId, { note: note.value });
    });
    listContainer.addEventListener('keydown', (event) => {
        if (event.target.closest('[data-roster-plan-control]')) return;
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
    return typeof window.getPlayerProfilePhotoUrl === 'function'
        ? window.getPlayerProfilePhotoUrl(player)
        : (player?.photoUrl || player?.bildeUrl || player?.avatarUrl || player?.imageUrl || player?.photo || '');
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
    const displayStatus = getPlayerDisplayStatus(p);
    const rowStateClasses = [
        displayStatus === 'Aktiv' ? 'is-active-player' : '',
        displayStatus === 'Rekrutt' ? 'is-recruit-player' : '',
        displayStatus === 'Passiv' || displayStatus === 'Utregistrert' ? 'is-passive-player' : '',
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
                    ${buildRosterStatusBadge(displayStatus)}
                    ${buildRosterInjuryBadge(injuryInfo)}
                </div>
            </div>
        </article>
    `;
}

function getExplicitRosterSeasonPlan(player, year = window.ROSTER_PLAN_YEAR) {
    const plans = player?.seasonPlans;
    if (!plans || typeof plans !== 'object') return null;
    const plan = plans[String(year)] || plans[year];
    if (!plan || typeof plan !== 'object' || Array.isArray(plan) || !plan.status) return null;
    return plan;
}

function playerHasRosterPlanSeason(player, year = window.ROSTER_PLAN_SOURCE_YEAR) {
    return typeof window.getPlayerSeasonRecord === 'function'
        && Boolean(window.getPlayerSeasonRecord(player, year));
}

function getRosterPlanStatus(player) {
    const explicit = getExplicitRosterSeasonPlan(player);
    if (explicit?.status) return explicit.status;
    if (playerHasRosterPlanSeason(player)) return 'Uavklart';
    return '';
}

function playerBelongsInRosterPlan(player) {
    if (!player || player.isGuest) return false;
    if (playerHasRosterPlanSeason(player)) return true;
    return Boolean(getExplicitRosterSeasonPlan(player)?.status);
}

function getRosterPlanReference(player, year = window.ROSTER_PLAN_SOURCE_YEAR) {
    const record = typeof window.getPlayerSeasonRecord === 'function'
        ? window.getPlayerSeasonRecord(player, year)
        : null;
    if (record) {
        return {
            hasSeason: true,
            pos1: record.pos1 || '',
            pos2: record.pos2 || '',
            draktnummer: record.draktnummer ?? '',
            status: record.status || ''
        };
    }
    return {
        hasSeason: false,
        pos1: player?.pos1 || '',
        pos2: player?.pos2 || '',
        draktnummer: player?.draktnummer ?? '',
        status: ''
    };
}

function getRosterPlanPosition(player) {
    const reference = getRosterPlanReference(player);
    return reference.pos1 && reference.pos1 !== '-' ? reference.pos1 : '';
}

function getRosterPlanPlayers() {
    const searchTerm = (document.getElementById('playerSearchInput')?.value || '').trim().toLowerCase();
    return (window.activePlayers || []).filter(player => {
        if (!playerBelongsInRosterPlan(player)) return false;
        const planStatus = getRosterPlanStatus(player);
        if (window.rosterPlanFilter !== 'alle' && planStatus !== window.rosterPlanFilter) return false;
        if (!searchTerm) return true;
        const reference = getRosterPlanReference(player);
        const position = reference.pos2 && reference.pos2 !== '-'
            ? `${reference.pos1} / ${reference.pos2}`
            : reference.pos1;
        const note = getExplicitRosterSeasonPlan(player)?.note || '';
        const haystack = [
            player.navn,
            reference.draktnummer,
            position,
            reference.status,
            planStatus,
            note
        ].join(' ').toLowerCase();
        return haystack.includes(searchTerm);
    });
}

function buildRosterPlanBadge(status) {
    const tone = status === 'Fortsetter'
        ? 'is-continue'
        : status === 'Slutter'
            ? 'is-leave'
            : status === 'Ny spiller'
                ? 'is-new'
                : 'is-open';
    return `<span class="roster-plan-badge ${tone}">${escapeRosterHtml(status)}</span>`;
}

function buildRosterPlanRow(player) {
    const reference = getRosterPlanReference(player);
    const plan = getExplicitRosterSeasonPlan(player);
    const planStatus = getRosterPlanStatus(player);
    const position = reference.pos1 && reference.pos1 !== '-'
        ? (reference.pos2 && reference.pos2 !== '-' ? `${reference.pos1} / ${reference.pos2}` : reference.pos1)
        : '';
    const number = reference.draktnummer !== '' && reference.draktnummer != null
        ? `#${reference.draktnummer}`
        : '';
    const meta = [position, number].filter(Boolean).join(' · ') || 'Posisjon ikke satt';
    const sourceYear = window.ROSTER_PLAN_SOURCE_YEAR;
    const targetYear = window.ROSTER_PLAN_YEAR;
    const seasonLine = reference.hasSeason
        ? `${sourceYear}: ${reference.status || 'ikke satt'}`
        : `Ingen ${sourceYear}-sesong`;
    const hasTargetSeason = typeof window.getPlayerSeasonRecord === 'function'
        && Boolean(window.getPlayerSeasonRecord(player, targetYear));
    const note = plan?.note || '';
    const options = window.ROSTER_PLAN_STATUSES.map(status => `
        <option value="${escapeRosterHtml(status)}"${status === planStatus ? ' selected' : ''}>${escapeRosterHtml(status)}</option>
    `).join('');

    return `
        <article class="roster-player-row is-plan-row" data-player-id="${escapeRosterHtml(player.id)}">
            ${buildRosterPlayerAvatarHtml(player)}
            <div class="roster-player-main" role="button" tabindex="0">
                <div class="roster-player-name">${escapeRosterHtml(player.navn)}</div>
                <div class="roster-player-meta">
                    <span>${escapeRosterHtml(meta)}</span>
                </div>
                <div class="roster-plan-season">${escapeRosterHtml(seasonLine)}</div>
            </div>
            <div class="roster-plan-controls" data-roster-plan-control>
                ${buildRosterPlanBadge(planStatus)}
                ${hasTargetSeason ? `<span class="roster-plan-created">${targetYear}-tropp ✓</span>` : ''}
                <label class="roster-plan-label">
                    <span>${targetYear}</span>
                    <select class="roster-plan-select" data-roster-plan-status aria-label="${targetYear}-planstatus for ${escapeRosterHtml(player.navn)}">
                        ${options}
                    </select>
                </label>
                <input
                    type="text"
                    class="roster-plan-note"
                    data-roster-plan-note
                    data-saved-note="${escapeRosterHtml(note)}"
                    value="${escapeRosterHtml(note)}"
                    maxlength="160"
                    placeholder="Notat"
                    aria-label="Plan-notat for ${escapeRosterHtml(player.navn)}"
                >
            </div>
        </article>
    `;
}

function renderRosterPlan() {
    const listContainer = document.getElementById('playerRosterContainer');
    const emptyState = document.getElementById('playerRosterEmpty');
    if (!listContainer) return;
    bindPlayerRosterEvents();

    const planPlayers = (window.activePlayers || []).filter(playerBelongsInRosterPlan);
    const filteredPlayers = getRosterPlanPlayers();
    const counts = { Uavklart: 0, Fortsetter: 0, Slutter: 0, 'Ny spiller': 0 };
    planPlayers.forEach(player => {
        const status = getRosterPlanStatus(player);
        if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
    });

    const playersLabel = document.getElementById('roster-stat-label-players');
    const ageLabel = document.getElementById('roster-stat-label-age');
    const recruitsLabel = document.getElementById('roster-stat-label-recruits');
    const injuredLabel = document.getElementById('roster-stat-label-injured');
    if (playersLabel) playersLabel.textContent = 'Uavklart';
    if (ageLabel) ageLabel.textContent = 'Fortsetter';
    if (recruitsLabel) recruitsLabel.textContent = 'Slutter';
    if (injuredLabel) injuredLabel.textContent = 'Ny spiller';
    const statPlayersEl = document.getElementById('stat-total-players');
    const statAvgAgeEl = document.getElementById('stat-avg-age');
    const statRekruttEl = document.getElementById('stat-total-rekrutt');
    const statInjuredEl = document.getElementById('stat-total-injured');
    if (statPlayersEl) statPlayersEl.textContent = String(counts.Uavklart);
    if (statAvgAgeEl) statAvgAgeEl.textContent = String(counts.Fortsetter);
    if (statRekruttEl) statRekruttEl.textContent = String(counts.Slutter);
    if (statInjuredEl) statInjuredEl.textContent = String(counts['Ny spiller']);

    const boardTitleEl = document.getElementById('rosterBoardTitle');
    const bottomlineSummaryEl = document.getElementById('rosterBottomlineSummary');
    if (boardTitleEl) boardTitleEl.textContent = 'Troppsplan 2027';
    if (bottomlineSummaryEl) {
        bottomlineSummaryEl.textContent = `Viser ${filteredPlayers.length} av ${planPlayers.length} spillere i 2027-planen.`;
    }
    const emptyTitle = document.getElementById('roster-empty-title');
    const emptyText = document.getElementById('roster-empty-text');
    if (emptyTitle) emptyTitle.textContent = 'Ingen spillere i dette filteret';
    if (emptyText) emptyText.textContent = 'Prøv et annet planfilter, eller legg til en ny spiller.';

    listContainer.innerHTML = '';
    if (!filteredPlayers.length) {
        listContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    listContainer.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    const grouped = assignPlayersToRosterGroups(
        [...filteredPlayers].sort(comparePlayersByFirstName).map(player => ({
            ...player,
            pos1: getRosterPlanPosition(player)
        }))
    );
    const playersById = new Map(filteredPlayers.map(player => [player.id, player]));
    ROSTER_POSITION_GROUPS.forEach(group => {
        const playersInGroup = (grouped[group.id] || [])
            .map(player => playersById.get(player.id))
            .filter(Boolean);
        if (!playersInGroup.length) return;
        const section = document.createElement('section');
        section.className = 'roster-group';
        section.innerHTML = `
            <div class="roster-group-heading">
                <span>${group.label}</span>
                <span class="roster-group-count">${playersInGroup.length}</span>
            </div>
            <div class="roster-group-rows">
                ${playersInGroup.map(player => buildRosterPlanRow(player)).join('')}
            </div>
        `;
        listContainer.appendChild(section);
    });
}

window.readRosterPlanSummary = function(year) {
    const target = Number(year) || window.ROSTER_PLAN_YEAR;
    const counts = { Uavklart: 0, Fortsetter: 0, Slutter: 0, 'Ny spiller': 0 };
    const useRosterPlan = target === window.ROSTER_PLAN_YEAR;
    (window.activePlayers || []).forEach(player => {
        if (useRosterPlan) {
            if (!playerBelongsInRosterPlan(player)) return;
            const status = getRosterPlanStatus(player);
            if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
            return;
        }
        const plans = player?.seasonPlans;
        const plan = plans && typeof plans === 'object' ? (plans[String(target)] || plans[target]) : null;
        const status = plan && typeof plan === 'object' ? plan.status : '';
        if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
    });
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return { year: target, counts, total };
};

window.setRosterMode = function(mode) {
    window.rosterMode = mode === 'plan2027' ? 'plan2027' : 'now';
    const planMode = window.rosterMode === 'plan2027';
    document.getElementById('view-tropp')?.classList.toggle('is-plan-mode', planMode);
    document.getElementById('roster-mode-now')?.classList.toggle('is-active', !planMode);
    document.getElementById('roster-mode-plan')?.classList.toggle('is-active', planMode);
    document.getElementById('roster-now-filters')?.classList.toggle('hidden', planMode);
    document.getElementById('roster-plan-filters')?.classList.toggle('hidden', !planMode);
    document.getElementById('rosterPlanIntro')?.classList.toggle('hidden', !planMode);
    document.getElementById('rosterNowLegend')?.classList.toggle('hidden', planMode);
    const addLabel = document.getElementById('roster-add-player-label');
    const addButton = document.getElementById('roster-add-player-btn');
    const createButton = document.getElementById('roster-create-season-btn');
    if (addLabel) addLabel.textContent = planMode ? 'Ny spiller' : 'Legg til';
    if (createButton) {
        createButton.textContent = `Opprett ${window.ROSTER_PLAN_YEAR}-tropp`;
        createButton.classList.toggle('hidden', !planMode);
    }
    if (addButton) {
        const label = planMode ? 'Ny spiller i 2027-planen' : 'Legg til ny spiller';
        addButton.title = label;
        addButton.setAttribute('aria-label', label);
    }
    window.renderPlayerRoster();
};

window.setRosterPlanFilter = function(status) {
    window.rosterPlanFilter = window.ROSTER_PLAN_STATUSES.includes(status) || status === 'alle'
        ? status
        : 'Uavklart';
    document.querySelectorAll('#roster-plan-filters .roster-status-btn').forEach(button => {
        button.classList.remove('is-active');
    });
    const activeId = window.rosterPlanFilter === 'alle'
        ? 'roster-plan-filter-alle'
        : window.rosterPlanFilter === 'Ny spiller'
            ? 'roster-plan-filter-ny'
            : `roster-plan-filter-${window.rosterPlanFilter.toLowerCase()}`;
    document.getElementById(activeId)?.classList.add('is-active');
    window.renderPlayerRoster();
};

function setRosterPlanCreateLock(locked) {
    window._rosterPlanNewPlayer = Boolean(locked);
    const statusInput = document.getElementById('playerStatusInput');
    const leftToInput = document.getElementById('playerLeftToInput');
    const hint = document.getElementById('playerPlanNewHint');
    if (statusInput) {
        statusInput.disabled = Boolean(locked);
        if (locked) statusInput.value = 'Passiv';
    }
    if (leftToInput) {
        leftToInput.disabled = Boolean(locked);
        if (locked) leftToInput.value = '';
    }
    if (hint) {
        const year = window.ROSTER_PLAN_YEAR;
        hint.textContent = `Spilleren opprettes som Passiv og ligger kun i Troppsplan ${year} inntil ${year}-troppen opprettes.`;
        hint.classList.toggle('hidden', !locked);
    }
}

window.openRosterPlayerModal = function() {
    if (window.rosterMode === 'plan2027') {
        window.openPlayerModal();
        setRosterPlanCreateLock(true);
        const title = document.getElementById('playerFormTitle');
        if (title) title.textContent = `Ny spiller i ${window.ROSTER_PLAN_YEAR}-planen`;
        return;
    }
    window.openPlayerModal();
};

function fillCreateSeasonRosterDialog(plan) {
    const title = document.getElementById('seasonRosterDialogTitle');
    const body = document.getElementById('seasonRosterDialogBody');
    const confirmButton = document.getElementById('seasonRosterDialogConfirm');
    const year = plan?.targetYear || window.ROSTER_PLAN_YEAR;
    const sourceYear = plan?.sourceYear || window.ROSTER_PLAN_SOURCE_YEAR;
    const counts = plan?.antall || {};
    if (title) title.textContent = `Opprett ${year}-tropp`;
    if (confirmButton) {
        confirmButton.textContent = `Opprett ${year}-tropp`;
        confirmButton.disabled = !counts.skalSkrives;
    }
    if (!body) return;
    body.replaceChildren();
    const writeCount = counts.skalSkrives || 0;
    const lines = [
        `Fortsetter: ${counts.fortsetter || 0}`,
        `Nye spillere: ${counts.nySpiller || 0}`,
        '',
        writeCount === 1
            ? `1 spiller vil bli lagt til i ${year}-troppen.`
            : `${writeCount} spillere vil bli lagt til i ${year}-troppen.`,
        '',
        `Uavklart: ${counts.uavklart || 0}`,
        `Slutter: ${counts.slutter || 0}`,
        '',
        'Uavklarte og spillere som slutter tas ikke med.'
    ];
    if ((counts.uavklart || 0) > 0) {
        const unresolved = counts.uavklart;
        lines.push(unresolved === 1
            ? '1 spiller er fortsatt uavklart og blir ikke tatt med.'
            : `${unresolved} spillere er fortsatt uavklart og blir ikke tatt med.`);
    }
    if ((counts.eksistererAllerede || 0) > 0) {
        lines.push(`${counts.eksistererAllerede} eksisterer allerede og blir ikke overskrevet.`);
    }
    lines.push(`Ingen ${sourceYear}-data endres.`);
    lines.forEach(line => {
        const paragraph = document.createElement('p');
        paragraph.textContent = line;
        if (!line) paragraph.className = 'season-roster-dialog-gap';
        body.appendChild(paragraph);
    });
}

window.openCreateSeasonRosterDialog = function() {
    const dialog = document.getElementById('seasonRosterDialog');
    if (!dialog || typeof window.previewCreateSeasonRoster !== 'function') return;
    const plan = window.previewCreateSeasonRoster(window.ROSTER_PLAN_SOURCE_YEAR, window.ROSTER_PLAN_YEAR);
    fillCreateSeasonRosterDialog(plan);
    dialog.classList.remove('hidden');
    dialog.classList.add('flex');
};

window.closeCreateSeasonRosterDialog = function() {
    const dialog = document.getElementById('seasonRosterDialog');
    if (!dialog) return;
    dialog.classList.add('hidden');
    dialog.classList.remove('flex');
};

window.confirmCreateSeasonRoster = async function() {
    const confirmButton = document.getElementById('seasonRosterDialogConfirm');
    if (!confirmButton || confirmButton.disabled) return;
    if (typeof window.createSeasonRoster !== 'function') {
        alert('Oppretting er ikke tilgjengelig ennå. Last siden på nytt.');
        return;
    }
    confirmButton.disabled = true;
    try {
        const result = await window.createSeasonRoster(window.ROSTER_PLAN_SOURCE_YEAR, window.ROSTER_PLAN_YEAR);
        window.closeCreateSeasonRosterDialog();
        if (!result?.saved) {
            alert(result?.reason === 'nothing_to_write'
                ? 'Ingen nye spillere å opprette.'
                : 'Troppen ble ikke opprettet.');
        }
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke opprette troppen.');
    } finally {
        if (confirmButton) confirmButton.disabled = false;
    }
};

window.saveRosterSeasonPlan = async function(playerId, patch) {
    const players = window.activePlayers || [];
    const index = players.findIndex(player => player.id === playerId);
    if (index === -1) return;
    const player = players[index];
    const current = getExplicitRosterSeasonPlan(player) || {};
    const status = patch.status !== undefined ? patch.status : (current.status || getRosterPlanStatus(player) || 'Uavklart');
    if (!window.ROSTER_PLAN_STATUSES.includes(status)) return;
    const note = String(patch.note !== undefined ? patch.note : (current.note || '')).trim().slice(0, 160);
    if (patch.status === undefined && note === String(current.note || '').trim()) return;
    const sourceYear = window.ROSTER_PLAN_SOURCE_YEAR;
    const targetYear = window.ROSTER_PLAN_YEAR;
    const sourceBefore = JSON.stringify(window.getPlayerSeasonRecord?.(player, sourceYear) ?? null);
    const targetBefore = JSON.stringify(window.getPlayerSeasonRecord?.(player, targetYear) ?? null);
    const updated = {
        ...player,
        seasonPlans: {
            ...(player.seasonPlans || {}),
            [String(targetYear)]: {
                status,
                note,
                updatedAt: new Date().toISOString()
            }
        }
    };
    if (JSON.stringify(window.getPlayerSeasonRecord?.(updated, sourceYear) ?? null) !== sourceBefore) return;
    if (JSON.stringify(window.getPlayerSeasonRecord?.(updated, targetYear) ?? null) !== targetBefore) return;
    try {
        await window.savePlayerToDatabase(updated);
    } catch (error) {
        console.error(error);
        alert(error.message || 'Kunne ikke lagre 2027-planen.');
        window.renderPlayerRoster();
        return;
    }
    players[index] = updated;
    window.localStorage.setItem('bsk_local_players', JSON.stringify(players));
    window.renderPlayerRoster();
};

window.renderPlayerRoster = function() {
    if (window.rosterMode === 'plan2027') {
        renderRosterPlan();
        return;
    }
    const playersLabel = document.getElementById('roster-stat-label-players');
    const ageLabel = document.getElementById('roster-stat-label-age');
    const recruitsLabel = document.getElementById('roster-stat-label-recruits');
    const injuredLabel = document.getElementById('roster-stat-label-injured');
    if (playersLabel) playersLabel.textContent = 'Spillere';
    if (ageLabel) ageLabel.textContent = 'Snittalder';
    if (recruitsLabel) recruitsLabel.textContent = 'Rekrutter';
    if (injuredLabel) injuredLabel.textContent = 'Skadede';
    const emptyTitle = document.getElementById('roster-empty-title');
    const emptyText = document.getElementById('roster-empty-text');
    if (emptyTitle) emptyTitle.textContent = 'Ingen spillere funnet';
    if (emptyText) emptyText.textContent = 'Prøv et annet filter, eller registrer en ny spiller i troppen.';
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

function getPlayerProfileRadarLineLabel(line) {
    const labels = {
        keeper: 'keepere',
        forsvar: 'forsvarsspillere',
        midtbane: 'midtbanespillere',
        angrep: 'angrepsspillere'
    };
    return labels[line] || 'troppen';
}

function getPlayerProfileSeasonMatches(player, yearFilter) {
    const seasonTeam = typeof window.getPlayerTeamForYear === 'function'
        ? window.getPlayerTeamForYear(player, yearFilter)
        : (player?.spillerLag || '');
    if (!seasonTeam) return [];
    return (window.activeMatches || []).filter(match => {
        if (match.matchGroup !== seasonTeam) return false;
        if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return false;
        if (typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(match)) return false;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return false;
        if (typeof window.activityBelongsToStatsYear === 'function'
            && !window.activityBelongsToStatsYear(match, yearFilter)) return false;
        return true;
    });
}

function playerProfileMatchIsWin(match) {
    const outcome = typeof window.getMatchOutcomeScore === 'function'
        ? window.getMatchOutcomeScore(match)
        : (typeof window.getMatchRegularScore === 'function' ? window.getMatchRegularScore(match) : null);
    return Boolean(outcome && outcome.bsk > outcome.opponent);
}

function getPlayerProfileWinSplit(player, yearFilter) {
    const inne = [];
    const ute = [];
    getPlayerProfileSeasonMatches(player, yearFilter).forEach(match => {
        const onPitch = typeof window.isPlayerAttending === 'function'
            && window.isPlayerAttending(match.attendance, player)
            && typeof window.isPlayerOnPitch === 'function'
            && window.isPlayerOnPitch(match, player);
        if (!onPitch) {
            ute.push(match);
            return;
        }
        inne.push(match);
    });
    const summarize = (list) => {
        let w = 0;
        let d = 0;
        let l = 0;
        let gf = 0;
        let ga = 0;
        let clean = 0;
        list.forEach(match => {
            const outcome = typeof window.getMatchOutcomeScore === 'function'
                ? window.getMatchOutcomeScore(match)
                : (typeof window.getMatchRegularScore === 'function' ? window.getMatchRegularScore(match) : null);
            const regular = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(match)
                : outcome;
            if (outcome && outcome.bsk > outcome.opponent) w += 1;
            else if (outcome && outcome.bsk === outcome.opponent) d += 1;
            else if (outcome) l += 1;
            const scored = Number(regular?.bsk) || 0;
            const conceded = Number(regular?.opponent) || 0;
            gf += scored;
            ga += conceded;
            if (regular && Number(regular.opponent) === 0) clean += 1;
        });
        const n = list.length;
        const decisive = w + l;
        const per = (value) => (n ? Math.round((value / n) * 10) / 10 : null);
        return {
            n,
            w,
            d,
            l,
            decisive,
            pct: decisive ? Math.round((w / decisive) * 100) : null,
            gf,
            ga,
            gfPer: per(gf),
            gaPer: per(ga),
            gdPer: per(gf - ga),
            clean,
            cleanPct: n ? Math.round((clean / n) * 100) : null
        };
    };
    return {
        inne: summarize(inne),
        ute: summarize(ute)
    };
}

function getPlayerProfileRadarAxes(line, yearFilter) {
    const winSplits = new Map();
    const winSplitFor = (stat) => {
        const name = stat?.navn || '';
        if (!name) return null;
        if (!winSplits.has(name)) {
            const person = (window.activePlayers || []).find(item => item.navn === name) || null;
            winSplits.set(name, person ? getPlayerProfileWinSplit(person, yearFilter) : null);
        }
        return winSplits.get(name);
    };
    const axes = [
        {
            id: 'bors',
            label: 'Børs',
            read: (stat) => (Number(stat?.snittBors) || 0) > 0 ? Number(stat.snittBors) : null,
            format: (stat) => (Number(stat?.snittBors) || 0) > 0
                ? (Math.round(Number(stat.snittBors) * 10) / 10).toFixed(1)
                : '–',
            absolute: (value) => Math.max(0, Math.min(100, Number(value) * 10))
        },
        {
            id: 'produksjon',
            label: 'Produksjon',
            read: (stat) => (Number(stat?.kamper) || 0) > 0 && stat?.expectedMalpoeng != null
                ? Number(stat.expectedMalpoeng)
                : null,
            format: (stat) => (Number(stat?.kamper) || 0) > 0 && stat?.expectedMalpoeng != null
                ? Number(stat.expectedMalpoeng).toFixed(1)
                : '–',
            absolute: (value) => Math.max(0, Math.min(100, (Number(value) || 0) / 1.2 * 100))
        },
        {
            id: 'minuttandel',
            label: 'Minuttandel',
            read: (stat) => (Number(stat?.minutesPossible) || 0) > 0 && stat?.minutesSharePct != null
                ? Number(stat.minutesSharePct)
                : null,
            format: (stat) => (Number(stat?.minutesPossible) || 0) > 0 && stat?.minutesSharePct != null
                ? `${Math.round(Number(stat.minutesSharePct))}%`
                : '–',
            absolute: (value) => Math.max(0, Math.min(100, Number(value) || 0))
        },
        {
            id: 'oppmote',
            label: 'Oppmøte',
            read: (stat) => (Number(stat?.oppmotePossible) || 0) > 0 ? Number(stat.oppmotePct) || 0 : null,
            format: (stat) => (Number(stat?.oppmotePossible) || 0) > 0
                ? `${Math.round(Number(stat.oppmotePct) || 0)}%`
                : '–',
            absolute: (value) => Math.max(0, Math.min(100, Number(value) || 0))
        },
        {
            id: 'disiplin',
            label: 'Disiplin',
            read: (stat) => (Number(stat?.attendedMatches) || 0) > 0 ? Number(stat.disiplinScore) || 0 : null,
            format: (stat) => {
                if (!((Number(stat?.attendedMatches) || 0) > 0)) return '–';
                const yellow = Number(stat.gule) || 0;
                const red = Number(stat.rode) || 0;
                if (yellow === 0 && red === 0) return '0 kort';
                const parts = [];
                if (yellow > 0) parts.push(yellow === 1 ? '1 gult' : `${yellow} gule`);
                if (red > 0) parts.push(red === 1 ? '1 rødt' : `${red} røde`);
                return parts.join(', ');
            },
            absolute: (value) => Math.max(0, Math.min(100, Number(value) || 0))
        }
    ];
    const withoutMinutes = axes.filter(axis => axis.id !== 'minuttandel');
    const seierAxis = {
        id: 'seier',
        label: 'Seier',
        read: (stat) => {
            const split = winSplitFor(stat);
            return split && split.inne.n > 0 ? split.inne.pct : null;
        },
        format: (stat) => {
            const split = winSplitFor(stat);
            return split && split.inne.n > 0 ? `${split.inne.pct}%` : '–';
        },
        absolute: (value) => Math.max(0, Math.min(100, Number(value) || 0))
    };
    const cleanAxis = {
        id: 'rent-null',
        label: 'Rent null',
        read: (stat) => {
            const split = winSplitFor(stat);
            return split && split.inne.n > 0 ? split.inne.cleanPct : null;
        },
        format: (stat) => {
            const split = winSplitFor(stat);
            return split && split.inne.n > 0 ? `${split.inne.cleanPct}%` : '–';
        },
        absolute: (value) => Math.max(0, Math.min(100, Number(value) || 0))
    };
    if (line === 'keeper') {
        const keeperAxes = withoutMinutes.filter(axis => axis.id !== 'produksjon');
        keeperAxes.splice(1, 0, cleanAxis);
        return keeperAxes;
    }
    if (line === 'forsvar') {
        const defenseAxes = withoutMinutes.map(axis => (axis.id === 'produksjon' ? seierAxis : axis));
        const seierIndex = defenseAxes.findIndex(axis => axis.id === 'seier');
        defenseAxes.splice(seierIndex + 1, 0, cleanAxis);
        return defenseAxes;
    }
    const outfieldAxes = withoutMinutes.slice();
    const produksjonIndex = outfieldAxes.findIndex(axis => axis.id === 'produksjon');
    outfieldAxes.splice(produksjonIndex + 1, 0, seierAxis);
    return outfieldAxes;
}

function getPlayerProfileRadarValueScore(value, peerValues, absoluteScore) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const peers = (Array.isArray(peerValues) ? peerValues : []).filter(item => Number.isFinite(item));
    const best = peers.length ? Math.max(...peers) : 0;
    if (!(best > 0)) return absoluteScore(numeric);
    return Math.max(0, Math.min(100, (numeric / best) * 100));
}

function buildPlayerProfileRadarHtml(player, yearFilter) {
    const rows = getPlayerProfileStatRows(player, yearFilter);
    const stat = rows.find(row => row.navn === player?.navn) || null;
    const line = typeof window.getStatsAwardPositionGroup === 'function'
        ? window.getStatsAwardPositionGroup(player?.pos1 || stat?.pos1 || '')
        : '';
    const axes = getPlayerProfileRadarAxes(line, yearFilter);
    const hasAny = stat && axes.some(axis => axis.read(stat) != null);
    const lineLabel = getPlayerProfileRadarLineLabel(line);
    const sameLine = rows.filter(row => {
        if (typeof window.getStatsAwardPositionGroup !== 'function') return true;
        const group = window.getStatsAwardPositionGroup(row.pos1);
        return line ? group === line : Boolean(group);
    });
    const qualified = sameLine.filter(row => (
        typeof window.playerMeetsKampShareThreshold === 'function'
            ? window.playerMeetsKampShareThreshold(row)
            : (Number(row.kampSharePct) || 0) >= 50
    ));
    const usePercentile = qualified.length >= 3;
    const share = Number(stat?.kampSharePct) || 0;
    const winSplit = getPlayerProfileWinSplit(player, yearFilter);
    const played = winSplit.inne.n;
    const missed = winSplit.ute.n;
    const teamMatches = played + missed;
    let note = teamMatches > 0
        ? `${played} av ${teamMatches} kamper på banen.`
        : 'Ingen kamper i perioden.';
    if (line !== 'keeper' && winSplit.inne.n > 0) {
        note += ` Seier i ${winSplit.inne.w} av de ${winSplit.inne.n}.`;
        if (winSplit.ute.n > 0) {
            note += ` Laget vant ${winSplit.ute.w} av de ${winSplit.ute.n} han ikke spilte.`;
        }
    }
    if ((line === 'forsvar' || line === 'keeper') && winSplit.inne.n > 0) {
        note += ` Rent null i ${winSplit.inne.clean} av de ${winSplit.inne.n}.`;
    }
    if (usePercentile && teamMatches > 0 && share < 50) {
        note += ' Under halvparten, så skalaen settes av de andre.';
    }

    const header = buildPlayerProfileClashHeaderHtml({
        title: 'Profil',
        icon: 'fa-bullseye'
    });

    if (!hasAny) {
        return `
            <section class="${playerProfilePanelClass('profil')}" data-profile-panel="profil" aria-expanded="${isPlayerProfilePanelOpen('profil') ? 'true' : 'false'}">
                ${header}
                <div class="player-profile-collapsible-content">
                    <p class="player-profile-empty">Ikke nok data til å vise profilen.</p>
                </div>
            </section>
        `;
    }

    const axisPeers = axes.map(axis => qualified
        .map(row => axis.read(row))
        .filter(item => item != null && Number.isFinite(Number(item)))
        .map(Number));
    const showAverage = axisPeers.some(peers => peers.length >= 2);
    const scoreOnAxis = (axis, peers, value) => {
        if (value == null || !Number.isFinite(Number(value))) return 0;
        if (!usePercentile) return axis.absolute(value);
        return getPlayerProfileRadarValueScore(value, peers, axis.absolute);
    };
    const scores = axes.map((axis, index) => scoreOnAxis(axis, axisPeers[index], axis.read(stat)));
    const averageScores = axes.map((axis, index) => {
        const peers = axisPeers[index];
        if (peers.length < 2) return null;
        const average = peers.reduce((sum, item) => sum + item, 0) / peers.length;
        return scoreOnAxis(axis, peers, average);
    });
    const readText = showAverage
        ? (usePercentile
            ? `Ytterste ring er best blant ${lineLabel} med minst halvparten av kampene. Grå strek er snittet deres. Tallet ved aksen er sesongtallet.`
            : `Få ${lineLabel} med minst halvparten av kampene, så ytterste ring er topp på skalaen. Grå strek er snittet. Tallet ved aksen er sesongtallet.`)
        : (usePercentile
            ? `Ytterste ring er best blant ${lineLabel} med minst halvparten av kampene. Tallet ved aksen er sesongtallet.`
            : `Få ${lineLabel} med minst halvparten av kampene, så ytterste ring er topp på skalaen. Tallet ved aksen er sesongtallet.`);
    const summary = axes.map(axis => `${axis.label} ${axis.format(stat)}`).join(', ');
    const count = axes.length;
    const cx = 210;
    const cy = 176;
    const radius = 96;
    const labelRadius = 128;
    const pointAt = (index, score) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
        const distance = radius * (Math.max(0, Math.min(100, score)) / 100);
        return [
            cx + (distance * Math.cos(angle)),
            cy + (distance * Math.sin(angle))
        ];
    };
    const ringPoints = (level) => axes.map((_, index) => {
        const [x, y] = pointAt(index, level);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const shape = scores.map((score, index) => {
        const [x, y] = pointAt(index, score);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const averageShape = showAverage
        ? averageScores.map((score, index) => {
            const [x, y] = pointAt(index, score || 0);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ')
        : '';
    const rings = [25, 50, 75, 100].map(level => `
        <polygon class="player-profile-radar-ring" points="${ringPoints(level)}"></polygon>
    `).join('');
    const spokes = axes.map((_, index) => {
        const [x, y] = pointAt(index, 100);
        return `<line class="player-profile-radar-spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
    }).join('');
    const dots = scores.map((score, index) => {
        const [x, y] = pointAt(index, score);
        return `<circle class="player-profile-radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"></circle>`;
    }).join('');
    const labels = axes.map((axis, index) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
        const x = cx + (labelRadius * Math.cos(angle));
        const y = cy + (labelRadius * Math.sin(angle));
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const anchor = cos > 0.42 ? 'start' : cos < -0.42 ? 'end' : 'middle';
        const yShift = sin > 0.45 ? 8 : sin < -0.45 ? -8 : 0;
        const nameY = (y + yShift - 6).toFixed(1);
        const valueY = (y + yShift + 10).toFixed(1);
        return `
            <text class="player-profile-radar-label" x="${x.toFixed(1)}" y="${nameY}" text-anchor="${anchor}">${escapeRosterHtml(axis.label)}</text>
            <text class="player-profile-radar-value" x="${x.toFixed(1)}" y="${valueY}" text-anchor="${anchor}">${escapeRosterHtml(axis.format(stat))}</text>
        `;
    }).join('');

    return `
        <section class="${playerProfilePanelClass('profil')}" data-profile-panel="profil" aria-expanded="${isPlayerProfilePanelOpen('profil') ? 'true' : 'false'}">
            ${header}
            <div class="player-profile-collapsible-content">
            <p class="player-profile-radar-read">${escapeRosterHtml(readText)}</p>
            <div class="player-profile-radar">
                <svg viewBox="0 0 420 360" role="img" aria-label="${escapeRosterHtml(`Profil. ${summary}`)}">
                    ${rings}
                    ${spokes}
                    ${averageShape ? `<polygon class="player-profile-radar-average" points="${averageShape}"></polygon>` : ''}
                    <polygon class="player-profile-radar-shape" points="${shape}"></polygon>
                    ${dots}
                    ${labels}
                </svg>
                ${showAverage ? `
                    <div class="player-profile-radar-legend" aria-hidden="true">
                        <span class="player-profile-radar-legend-item is-player"><i></i> Spilleren</span>
                        <span class="player-profile-radar-legend-item is-average"><i></i> Snitt på linjen</span>
                    </div>
                ` : ''}
            </div>
            <p class="player-profile-radar-note">${escapeRosterHtml(note)}</p>
            </div>
        </section>
    `;
}

function formatPlayerProfilePresenceScore(side) {
    if (!side?.n || side.pct == null) return '—';
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const winPoints = (Number(side.pct) || 0) / 100 * 40;
    const goalPoints = clamp((Number(side.gfPer) || 0) / 4) * 25;
    const concededPoints = clamp(1 - ((Number(side.gaPer) || 0) / 5)) * 25;
    const cleanPoints = (Number(side.cleanPct) || 0) / 100 * 10;
    return String(Math.round(Math.max(0, Math.min(100, winPoints + goalPoints + concededPoints + cleanPoints))));
}

function getPlayerProfilePanelState() {
    const defaults = {
        sesong: false,
        posisjon: false,
        profil: false,
        utvikling: false,
        kampforkamp: false,
        trening: false,
        innsikt: true
    };
    window.playerProfilePanelState = window.playerProfilePanelState || {};
    Object.keys(defaults).forEach((key) => {
        if (typeof window.playerProfilePanelState[key] !== 'boolean') {
            window.playerProfilePanelState[key] = defaults[key];
        }
    });
    return window.playerProfilePanelState;
}

function isPlayerProfilePanelOpen(panelId) {
    return getPlayerProfilePanelState()[panelId] === true;
}

function playerProfilePanelClass(panelId, extra = '') {
    return [
        'match-detail-card',
        'player-profile-panel',
        'player-profile-presence-card',
        'player-profile-collapsible',
        extra,
        isPlayerProfilePanelOpen(panelId) ? '' : 'is-collapsed',
        'relative'
    ].filter(Boolean).join(' ');
}

function togglePlayerProfilePanel(panelId) {
    const state = getPlayerProfilePanelState();
    if (typeof state[panelId] !== 'boolean') return;
    state[panelId] = !state[panelId];
    const panel = document.querySelector(`#spillerprofil-content [data-profile-panel="${panelId}"]`);
    if (!panel) return;
    panel.classList.toggle('is-collapsed', !state[panelId]);
    panel.setAttribute('aria-expanded', state[panelId] ? 'true' : 'false');
}

function buildPlayerProfileClashHeaderHtml({ title, icon, asideHtml = '', subtitle = '' }) {
    const iconName = String(icon || 'fa-user').replace(/[^\w-]/g, '');
    const subtitleHtml = subtitle
        ? `<p class="player-profile-clash-subtitle">${escapeRosterHtml(subtitle)}</p>`
        : '';
    return `
        <div class="player-profile-presence-topline">
            <div class="player-profile-presence-heading">
                <span class="player-profile-presence-mark" aria-hidden="true"><i class="fa-solid ${iconName}"></i></span>
                <div class="player-profile-presence-heading-copy">
                    <h2 class="player-profile-panel-title">${title}</h2>
                    ${subtitleHtml}
                </div>
            </div>
            ${asideHtml}
        </div>
    `;
}

function getPlayerProfileStats(player, yearFilter = 'alle') {
    if (!player || typeof window.buildPlayerStatsData !== 'function') return null;
    const options = yearFilter === 'alle'
        ? {}
        : { applyYearFilter: true, yearFilter };
    return window.buildPlayerStatsData(options).find(stat => stat.navn === player.navn) || null;
}

const PLAYER_PROFILE_LINE_ORDER = ['keeper', 'forsvar', 'midtbane', 'angrep'];

const PLAYER_PROFILE_LINE_LABELS = {
    keeper: 'Keeper',
    forsvar: 'Forsvar',
    midtbane: 'Midtbane',
    angrep: 'Angrep'
};

function getPlayerProfilePositionLine(posId) {
    const id = String(posId || '').trim().toUpperCase();
    if (id === 'GK') return 'keeper';
    if (['VB', 'VMS', 'VS', 'MS', 'HMS', 'HS', 'HB'].includes(id)) return 'forsvar';
    if (['DM', 'OM', 'PM'].includes(id)) return 'midtbane';
    if (['VK', 'HK', 'SP', 'SP2', 'SV', 'SH'].includes(id)) return 'angrep';
    return '';
}

function formatPlayerProfilePositionStatCells(row) {
    const matches = Number(row?.matches) || 0;
    const snittBidrag = matches > 0
        ? (Math.round((Number(row.points) / matches) * 10) / 10)
        : 0;
    const goals = Number(row?.goals) || 0;
    const assists = Number(row?.assists) || 0;
    const maText = (goals > 0 || assists > 0) ? `${goals}/${assists}` : '—';
    const xpText = typeof window.formatMatchGamePlanXp === 'function'
        ? window.formatMatchGamePlanXp(goals, assists, matches)
        : '—';
    const formText = Number(row?.formValue) > 0 ? String(row.formValue) : '—';
    const seasonText = Number(row?.seasonValue) > 0
        ? (Math.round(Number(row.seasonValue) * 10) / 10).toFixed(1)
        : '—';
    const minutes = Number(row?.minutes) || 0;
    const minutesPerMatch = matches > 0 && minutes > 0
        ? Math.round((minutes / matches) * 10) / 10
        : null;
    const minutesText = minutesPerMatch != null
        ? (Number.isInteger(minutesPerMatch) ? String(minutesPerMatch) : minutesPerMatch.toFixed(1))
        : '—';
    const ratingsCount = Number(row?.ratingsCount) || 0;
    const borsText = ratingsCount > 0
        ? (Math.round((Number(row.ratingsSum) / ratingsCount) * 10) / 10).toFixed(1)
        : '—';
    return {
        matchesText: matches > 0 ? String(matches) : '—',
        bidragText: matches > 0 ? String(snittBidrag) : '—',
        maText,
        xpText,
        formText,
        seasonText,
        minutesText,
        minutesTitle: minutes > 0 && matches > 0 ? `${minutes}' totalt / ${matches} kamper` : '',
        borsText
    };
}

function buildPlayerProfilePositionLineRows(rows, seasonStat) {
    const grouped = new Map();
    rows.forEach((row) => {
        const line = getPlayerProfilePositionLine(row.posId);
        if (!line) return;
        if (!grouped.has(line)) {
            grouped.set(line, {
                line,
                label: PLAYER_PROFILE_LINE_LABELS[line] || line,
                matches: 0,
                points: 0,
                goals: 0,
                assists: 0,
                minutes: 0,
                ratingsSum: 0,
                ratingsCount: 0,
                entries: []
            });
        }
        const target = grouped.get(line);
        target.matches += Number(row.matches) || 0;
        target.points += Number(row.points) || 0;
        target.goals += Number(row.goals) || 0;
        target.assists += Number(row.assists) || 0;
        target.minutes += Number(row.minutes) || 0;
        target.ratingsSum += Number(row.ratingsSum) || 0;
        target.ratingsCount += Number(row.ratingsCount) || 0;
        if (Array.isArray(row.entries)) target.entries.push(...row.entries);
    });

    return PLAYER_PROFILE_LINE_ORDER
        .filter(line => grouped.has(line))
        .map((line) => {
            const row = grouped.get(line);
            const formValue = typeof window.computeMatchGamePlanPositionForm === 'function'
                ? window.computeMatchGamePlanPositionForm(row.entries)
                : 0;
            const seasonValue = typeof window.computeMatchGamePlanPositionSeason === 'function'
                ? window.computeMatchGamePlanPositionSeason(row, seasonStat)
                : 0;
            return { ...row, formValue, seasonValue };
        })
        .sort((a, b) => (
            b.formValue - a.formValue
            || b.matches - a.matches
            || PLAYER_PROFILE_LINE_ORDER.indexOf(a.line) - PLAYER_PROFILE_LINE_ORDER.indexOf(b.line)
        ));
}

function buildPlayerProfilePositionStatsHtml(player, yearFilter = 'alle') {
    if (!player || typeof window.buildPlayerPositionMatchStats !== 'function') {
        return `
            <p class="player-profile-empty">Ingen posisjonsdata tilgjengelig.</p>
        `;
    }

    const seasonStat = typeof window.getMatchGamePlanPlayerSeasonStat === 'function'
        ? window.getMatchGamePlanPlayerSeasonStat(player, yearFilter)
        : null;
    const rows = (window.buildPlayerPositionMatchStats(player, { yearFilter }) || [])
        .map((row) => {
            const formValue = typeof window.computeMatchGamePlanPositionForm === 'function'
                ? window.computeMatchGamePlanPositionForm(row.entries)
                : 0;
            const seasonValue = typeof window.computeMatchGamePlanPositionSeason === 'function'
                ? window.computeMatchGamePlanPositionSeason(row, seasonStat)
                : 0;
            return {
                ...row,
                formValue,
                seasonValue
            };
        })
        .sort((a, b) => (
            b.formValue - a.formValue
            || b.matches - a.matches
            || b.minutes - a.minutes
            || a.label.localeCompare(b.label, 'nb')
        ));

    if (!rows.length) {
        return `
            <p class="player-profile-empty">Ingen registrerte kampposisjoner ennå.</p>
        `;
    }

    const positionHead = `
        <tr>
            <th scope="col">Pos</th>
            <th scope="col" title="Antall kamper som hovedposisjon">K</th>
            <th scope="col" title="Snitt kampbidrag">Bidrag</th>
            <th scope="col" title="Mål / Assist">M/A</th>
            <th scope="col" title="Mål+assist per kamp">XP</th>
            <th scope="col" title="Form fra snitt på posisjonen (siste 5)">Form</th>
            <th scope="col" title="Sesongscore fra snitt på posisjonen">Sesong</th>
            <th scope="col" title="Snitt spilleminutter per kamp på posisjonen">Min/90</th>
            <th scope="col" title="Snittbørs på posisjonen">Børs</th>
        </tr>
    `;
    const bodyRows = rows.map((row) => {
        const cells = formatPlayerProfilePositionStatCells(row);
        const posCode = typeof window.getMatchGamePlanPositionBadgeLabel === 'function'
            ? window.getMatchGamePlanPositionBadgeLabel(row.posId)
            : row.posId;
        const posTitle = row.label || row.posId;

        return `
            <tr>
                <td class="player-profile-position-pos" title="${escapeRosterHtml(posTitle)}">
                    <span class="player-profile-position-code">${escapeRosterHtml(posCode)}</span>
                </td>
                <td>${escapeRosterHtml(cells.matchesText)}</td>
                <td>${escapeRosterHtml(cells.bidragText)}</td>
                <td>${escapeRosterHtml(cells.maText)}</td>
                <td>${escapeRosterHtml(cells.xpText)}</td>
                <td>${escapeRosterHtml(cells.formText)}</td>
                <td>${escapeRosterHtml(cells.seasonText)}</td>
                <td title="${escapeRosterHtml(cells.minutesTitle)}">${escapeRosterHtml(cells.minutesText)}</td>
                <td>${escapeRosterHtml(cells.borsText)}</td>
            </tr>
        `;
    }).join('');
    const lineRows = buildPlayerProfilePositionLineRows(rows, seasonStat).map((row) => {
        const cells = formatPlayerProfilePositionStatCells(row);
        return `
            <tr>
                <td class="player-profile-position-pos">
                    <span class="player-profile-line-name">${escapeRosterHtml(row.label)}</span>
                </td>
                <td>${escapeRosterHtml(cells.matchesText)}</td>
                <td>${escapeRosterHtml(cells.bidragText)}</td>
                <td>${escapeRosterHtml(cells.maText)}</td>
                <td>${escapeRosterHtml(cells.xpText)}</td>
                <td>${escapeRosterHtml(cells.formText)}</td>
                <td>${escapeRosterHtml(cells.seasonText)}</td>
                <td title="${escapeRosterHtml(cells.minutesTitle)}">${escapeRosterHtml(cells.minutesText)}</td>
                <td>${escapeRosterHtml(cells.borsText)}</td>
            </tr>
        `;
    }).join('');
    const lineTable = lineRows
        ? `
            <div class="player-profile-line-block">
                <h3 class="player-profile-line-heading">Linje</h3>
                <div class="player-profile-position-table-wrap">
                    <table class="player-profile-position-table" aria-label="Linjestatistikk">
                        <thead>
                            <tr>
                                <th scope="col">Linje</th>
                                <th scope="col" title="Kamper på linjen">K</th>
                                <th scope="col" title="Snitt kampbidrag på linjen">Bidrag</th>
                                <th scope="col" title="Mål / Assist på linjen">M/A</th>
                                <th scope="col" title="Mål+assist per kamp på linjen">XP</th>
                                <th scope="col" title="Form fra siste kamper på linjen">Form</th>
                                <th scope="col" title="Sesongscore fra snitt på linjen">Sesong</th>
                                <th scope="col" title="Snitt spilleminutter per kamp på linjen">Min/90</th>
                                <th scope="col" title="Snittbørs på linjen">Børs</th>
                            </tr>
                        </thead>
                        <tbody>${lineRows}</tbody>
                    </table>
                </div>
            </div>
        `
        : '';

    return `
        <div class="player-profile-position-table-wrap">
            <table class="player-profile-position-table" aria-label="Posisjonsstatistikk">
                <thead>${positionHead}</thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
        ${lineTable}
    `;
}

function buildPlayerProfileMetricHtml(label, value) {
    return `
        <div class="player-profile-metric">
            <span class="player-profile-metric-label">${escapeRosterHtml(label)}</span>
            <span class="player-profile-metric-value">${escapeRosterHtml(value)}</span>
        </div>
    `;
}

function buildPlayerProfileFactHtml(label, value, valueClass = '') {
    const tone = valueClass ? ` ${valueClass}` : '';
    return `
        <div class="player-profile-fact">
            <dt>${escapeRosterHtml(label)}</dt>
            <dd class="player-profile-fact-value${tone}">${escapeRosterHtml(value)}</dd>
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
    const oppmote = stats
        ? (typeof window.formatOppmoteDisplay === 'function'
            ? window.formatOppmoteDisplay(stats)
            : `${stats.oppmotePct}%`)
        : '-';
    const form = stats && stats.kjemi > 0 ? `${stats.kjemi}/100` : '-';
    const kampbidrag = stats && stats.kampbonus > 0 ? String(Math.round(stats.kampbonus)) : '-';
    const spilletid = formatPlayerProfileMinutesLabel(stats);
    const minuttandel = formatPlayerProfileMinutesShareLabel(stats);
    const kamper = stats ? String(stats.kamper) : '0';
    const mal = stats ? String(stats.mal) : '0';
    const assist = stats ? String(stats.assist) : '0';
    const expectedMalpoeng = stats && stats.expectedMalpoeng != null && (Number(stats.kamper) || 0) > 0
        ? (typeof window.formatExpectedMalpoengDisplay === 'function'
            ? window.formatExpectedMalpoengDisplay(stats)
            : `${Number(stats.expectedMalpoeng).toFixed(1)} · ${Number(stats.kamper) || 0} kamper`)
        : '-';
    const gule = stats
        ? formatPlayerProfileCardsSplitLabel(stats.guleSerie, stats.guleCup)
        : '0/0';
    const rode = stats
        ? formatPlayerProfileCardsSplitLabel(stats.rodeSerie, stats.rodeCup)
        : '0/0';
    const bb = stats ? String(stats.bb || 0) : '0';
    const hasMatchData = stats && (stats.kamper > 0 || stats.attendedMatches > 0);

    profileEl.innerHTML = `
        <div class="player-profile-hero">
            ${buildPlayerProfileAvatarHtml(player)}
            <div class="player-profile-hero-main">
                <h3 class="player-profile-name">${escapeRosterHtml(player.navn)}${captainMark}</h3>
                <div class="player-profile-badges">
                    ${buildRosterStatusBadge(getPlayerDisplayStatus(player))}
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
                ${buildPlayerProfileMetricHtml('Status', getPlayerDisplayStatus(player))}
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

        ${buildPlayerUtviklingsmomentSectionHtml(player)}

        <div class="player-profile-section">
            <p class="player-profile-section-title">Statistikk</p>
            ${hasMatchData ? `
                <div class="player-profile-grid player-profile-grid-stats">
                    ${buildPlayerProfileMetricHtml('Kamper', kamper)}
                    ${buildPlayerProfileMetricHtml('Mål', mal)}
                    ${buildPlayerProfileMetricHtml('Assist', assist)}
                    ${buildPlayerProfileMetricHtml('Expected målpoeng', expectedMalpoeng)}
                    ${buildPlayerProfileMetricHtml('Oppmøte', oppmote)}
                    ${buildPlayerProfileMetricHtml('Form', form)}
                    ${buildPlayerProfileMetricHtml('Kampbidrag', kampbidrag)}
                    ${buildPlayerProfileMetricHtml('Spilletid', spilletid)}
                    ${buildPlayerProfileMetricHtml('Minuttandel', minuttandel)}
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
    const selected = Number(current);
    if (current != null && current !== '' && Number.isFinite(selected)) return selected;
    if (typeof window.getActiveSeasonYear === 'function') return window.getActiveSeasonYear();
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

function formatPlayerProfileMinutesLabel(stats) {
    const matches = Number(stats?.minutesMatches) || 0;
    if (matches <= 0) return '-';
    const total = Math.round(Number(stats.minutesTotal) || 0);
    const avg = Math.round(Number(stats.minutesAvg) || 0);
    return `${total}' / ${avg}'`;
}

function formatPlayerProfileMinutesShareLabel(stats) {
    if (!(Number(stats?.minutesPossible) > 0) || stats?.minutesSharePct == null) return '-';
    return `${Math.round(Number(stats.minutesSharePct) || 0)}%`;
}

function formatPlayerProfileCardsSplitLabel(serieCount, cupCount) {
    const serie = Math.max(0, Math.floor(Number(serieCount) || 0));
    const cup = Math.max(0, Math.floor(Number(cupCount) || 0));
    return `${serie}/${cup}`;
}

function getPlayerProfileStatRows(player, yearFilter = 'alle') {
    if (!player || typeof window.buildPlayerStatsData !== 'function') return [];
    return window.buildPlayerStatsData({
        applyYearFilter: yearFilter !== 'alle',
        yearFilter
    });
}

function getPlayerProfileStatRank(playerName, column, statsData) {
    if (!playerName || !column || !Array.isArray(statsData) || !statsData.length) return null;
    let relevant = typeof window.playerStatsRelevantForSort === 'function'
        ? statsData.filter(stat => window.playerStatsRelevantForSort(stat, column))
        : statsData.slice();
    if (typeof window.statsSortUsesKampShareThreshold === 'function'
        && window.statsSortUsesKampShareThreshold(column)
        && typeof window.playerMeetsKampShareThreshold === 'function') {
        relevant = relevant.filter(stat => window.playerMeetsKampShareThreshold(stat));
    }
    const playerStat = relevant.find(stat => stat.navn === playerName);
    if (!playerStat) return null;

    if (typeof window.comparePlayerStatsSort === 'function') {
        const betterCount = relevant.filter(stat => window.comparePlayerStatsSort(stat, playerStat, column) < 0).length;
        return betterCount + 1;
    }
    const playerValue = Number(playerStat[column]) || 0;
    const betterCount = relevant.filter(stat => (Number(stat[column]) || 0) > playerValue).length;
    return betterCount + 1;
}

function getPlayerProfileStatChipVisual(column) {
    const option = typeof window.getStatsSortOption === 'function'
        ? window.getStatsSortOption(column)
        : null;
    if (!option) return {};
    return {
        icon: option.icon || '',
        glyph: option.glyph || ''
    };
}

function buildPlayerProfileSeasonGlyphHtml(options = {}) {
    if (options.glyph) {
        return `<span class="player-profile-season-glyph stats-sort-glyph stats-sort-glyph-${escapeRosterHtml(options.glyph)}" aria-hidden="true"></span>`;
    }
    if (options.icon) {
        return `<span class="player-profile-season-glyph" aria-hidden="true"><i class="fa-solid ${escapeRosterHtml(options.icon)}"></i></span>`;
    }
    return '';
}

function buildPlayerProfileSeasonRowHtml(label, value, options = {}) {
    const titleAttr = options.title ? ` title="${escapeRosterHtml(options.title)}"` : '';
    const rank = Number(options.rank) || 0;
    const rankText = rank > 0 ? `${rank}.` : '—';
    return `
        <tr${titleAttr}>
            <td class="player-profile-season-icon">${buildPlayerProfileSeasonGlyphHtml(options)}</td>
            <th scope="row">${escapeRosterHtml(label)}</th>
            <td class="player-profile-season-value">${escapeRosterHtml(value)}</td>
            <td class="player-profile-season-rank">${rankText}</td>
        </tr>
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
        const topline = event.target.closest('.player-profile-collapsible .player-profile-presence-topline');
        if (topline && root.contains(topline)) {
            const interactive = event.target.closest('a, button, input, select, textarea, label');
            if (!interactive) {
                const panelId = topline.closest('[data-profile-panel]')?.dataset.profilePanel;
                togglePlayerProfilePanel(panelId);
                return;
            }
        }

        const actionEl = event.target.closest('[data-player-profile-action]');
        if (!actionEl || !root.contains(actionEl)) return;

        const action = actionEl.dataset.playerProfileAction;
        const playerId = window.activePlayerProfileId;

        if (action === 'toggle-insight-detail') {
            const detail = actionEl.closest('.player-insight-detail');
            const id = actionEl.dataset.insightDetail;
            if (!detail || !id) return;
            const willOpen = detail.classList.contains('is-collapsed');
            detail.classList.toggle('is-collapsed', !willOpen);
            actionEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            const verb = detail.querySelector('.player-insight-detail-action');
            if (verb) verb.textContent = willOpen ? 'Skjul detaljer' : 'Vis detaljer';
            window.playerInsightDetailOpen = window.playerInsightDetailOpen || {};
            window.playerInsightDetailOpen[id] = willOpen;
            return;
        }

        if (action === 'toggle-insight-info') {
            window.playerProfileInsightInfoOpen = !isPlayerProfileInsightInfoOpen();
            const open = isPlayerProfileInsightInfoOpen();
            const panel = actionEl.closest('[data-profile-panel="innsikt"]');
            if (panel && open && panel.classList.contains('is-collapsed')) {
                togglePlayerProfilePanel('innsikt');
            }
            const info = panel?.querySelector('.player-profile-insight-info');
            const button = panel?.querySelector('.player-profile-insight-info-btn');
            if (info) {
                info.classList.toggle('is-hidden', !open);
                info.hidden = !open;
            }
            if (button) {
                button.classList.toggle('is-active', open);
                button.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
            return;
        }

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
        }
    });
}

function isPlayerProfileInsightInfoOpen() {
    return window.playerProfileInsightInfoOpen === true;
}

function insightRound(value, digits) {
    if (value == null || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const factor = 10 ** digits;
    return Math.round(number * factor) / factor;
}

function insightMean(values) {
    if (!values || !values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function insightFormatNumber(value, digits) {
    const rounded = insightRound(value, digits);
    if (rounded == null) return '—';
    return rounded.toFixed(digits).replace('.', ',');
}

function insightFormatSigned(value, digits) {
    const rounded = insightRound(value, digits);
    if (rounded == null) return '—';
    const text = Math.abs(rounded).toFixed(digits).replace('.', ',');
    if (rounded > 0) return `+${text}`;
    if (rounded < 0) return `−${text}`;
    return insightFormatNumber(0, digits);
}

function insightFormatDelta(season, recent, digits) {
    const left = insightRound(season, digits);
    const right = insightRound(recent, digits);
    if (left == null || right == null) return '—';
    return insightFormatSigned(right - left, digits);
}

function insightRawDelta(season, recent) {
    if (season == null || season === '' || recent == null || recent === '') return null;
    const left = Number(season);
    const right = Number(recent);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    return right - left;
}

function insightRecentLabel(count) {
    return count > 0 ? `Siste ${count}` : 'Siste periode';
}

function insightMatchBasis(count, thinNote) {
    if (!count) return '';
    const word = count === 1 ? 'kamp' : 'kamper';
    if (thinNote && count < 3) return `${count} ${word} – lite grunnlag`;
    return `${count} ${word}`;
}

function insightRatingValue(match, player) {
    const rating = Number(window.getPlayerRefMapValue?.(match?.ratings, player, 0)) || 0;
    return rating > 0 ? rating : null;
}

function insightRelativeValue(sample, minOthers) {
    if (!sample || !Array.isArray(sample.others) || sample.others.length < minOthers) return null;
    const otherAverage = sample.others.reduce((sum, value) => sum + value, 0) / sample.others.length;
    return sample.rating - otherAverage;
}

function insightSamplesForMatches(samples, matches, minOthers) {
    const ids = new Set((matches || []).map(match => match?.id).filter(Boolean));
    const dates = new Set((matches || []).map(match => match?.date).filter(Boolean));
    return (samples || [])
        .filter(sample => (sample.matchId && ids.has(sample.matchId)) || (!sample.matchId && dates.has(sample.date)))
        .map(sample => insightRelativeValue(sample, minOthers))
        .filter(value => value != null);
}

function getPlayerInsightAttendedMatches(player, yearFilter) {
    return getPlayerProfileSeasonMatches(player, yearFilter)
        .filter(match => typeof window.isPlayerAttending === 'function' && window.isPlayerAttending(match.attendance, player))
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

function getPlayerInsightRecentMatches(player, yearFilter, attendedMatches) {
    if (typeof window.getStatsDiagramRecentPlayerWindow === 'function') {
        const recent = window.getStatsDiagramRecentPlayerWindow(player, yearFilter);
        return Array.isArray(recent?.playerMatches) ? recent.playerMatches : [];
    }
    return attendedMatches.slice(-5).reverse();
}

function buildPlayerInsightRatingChartSvg(points) {
    if (!points || points.length < 2) return '';
    const width = 320;
    const height = 92;
    const pad = { left: 26, right: 8, top: 12, bottom: 16 };
    const ratings = points.map(point => point.rating);
    let yMin = Math.floor(Math.min(...ratings, 6) - 0.4);
    let yMax = Math.ceil(Math.max(...ratings, 6) + 0.4);
    if (yMax - yMin < 2) {
        yMin -= 1;
        yMax += 1;
    }
    yMin = Math.max(1, yMin);
    yMax = Math.min(10, Math.max(yMin + 1, yMax));
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const xAt = index => pad.left + (index / (points.length - 1)) * innerWidth;
    const yAt = rating => pad.top + ((yMax - rating) / (yMax - yMin)) * innerHeight;
    const line = points.map((point, index) => `${xAt(index).toFixed(1)},${yAt(point.rating).toFixed(1)}`).join(' ');
    const referenceY = yAt(6);
    const dots = points.map((point, index) => (
        `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(point.rating).toFixed(1)}" r="2.4" fill="#f5c542"></circle>`
    )).join('');
    return `
        <div class="player-insight-chart">
            <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Trenerbørs gjennom sesongen">
                <line x1="${pad.left}" y1="${referenceY.toFixed(1)}" x2="${width - pad.right}" y2="${referenceY.toFixed(1)}" stroke="rgba(245,197,66,0.45)" stroke-dasharray="3 3"></line>
                <text x="2" y="${(referenceY + 3).toFixed(1)}" fill="rgba(255,255,255,0.5)" font-size="9" font-weight="700">6</text>
                <polyline points="${line}" fill="none" stroke="#f8fafc" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline>
                ${dots}
            </svg>
            <p class="player-insight-chart-caption">Trenerbørs kamp for kamp. Stiplet linje er 6. Kamper uten børs er ikke med.</p>
        </div>
    `;
}

function buildPlayerInsightModel(player, yearFilter) {
    const stats = getPlayerProfileStats(player, yearFilter);
    const minOthers = window.STATS_RELATIV_MIN_OTHERS || 5;
    const attendedMatches = getPlayerInsightAttendedMatches(player, yearFilter);
    const recentMatches = getPlayerInsightRecentMatches(player, yearFilter, attendedMatches);
    const samples = typeof window.getStatsRatingResultSamples === 'function'
        ? (window.getStatsRatingResultSamples(player, yearFilter) || [])
        : [];
    const validRelatives = samples
        .map(sample => insightRelativeValue(sample, minOthers))
        .filter(value => value != null);

    const played = Number(stats?.kamper) || 0;
    const attended = Number(stats?.attendedMatches) || attendedMatches.length;
    const seasonBors = Number(stats?.snittBors) > 0 ? Number(stats.snittBors) : null;
    const seasonBorsCount = attendedMatches.reduce((count, match) => (
        count + (typeof window.isPlayerOnPitch === 'function' && window.isPlayerOnPitch(match, player) && insightRatingValue(match, player) != null ? 1 : 0)
    ), 0);
    const seasonBidrag = attended > 0 ? Number(stats?.kampbonus) || 0 : null;
    const seasonRelative = validRelatives.length ? insightMean(validRelatives) : null;

    const recentBorsCount = recentMatches.reduce((count, match) => (
        count + (typeof window.isPlayerOnPitch === 'function' && window.isPlayerOnPitch(match, player) && insightRatingValue(match, player) != null ? 1 : 0)
    ), 0);
    const recentBorsRaw = typeof window.getStatsDiagramRecentSnittBors === 'function'
        ? window.getStatsDiagramRecentSnittBors(player, recentMatches)
        : 0;
    const recentBors = recentBorsRaw > 0 ? recentBorsRaw : null;
    const recentRelatives = insightSamplesForMatches(samples, recentMatches, minOthers);
    const recentRelative = recentRelatives.length ? insightMean(recentRelatives) : null;
    const recentBidrag = recentMatches.length && typeof window.calculatePlayerMatchPoints === 'function'
        ? recentMatches.reduce((sum, match) => sum + (Number(window.calculatePlayerMatchPoints(match, player)) || 0), 0) / recentMatches.length
        : null;

    const goals = played > 0 ? Number(stats?.mal) || 0 : null;
    const assists = played > 0 ? Number(stats?.assist) || 0 : null;
    const goalPoints = played > 0 ? (goals + assists) : null;
    const seasonRate = played > 0 && stats?.expectedMalpoeng != null ? Number(stats.expectedMalpoeng) : null;
    let recentGoals = 0;
    let recentAssists = 0;
    let recentPlayed = 0;
    recentMatches.forEach(match => {
        if (typeof window.isPlayerOnPitch === 'function' && !window.isPlayerOnPitch(match, player)) return;
        recentPlayed += 1;
        recentGoals += Number(window.getPlayerRefMapValue?.(match.scorers, player, 0)) || 0;
        recentAssists += Number(window.getPlayerRefMapValue?.(match.assists, player, 0)) || 0;
    });
    const recentGoalPoints = recentPlayed > 0 ? recentGoals + recentAssists : null;
    const recentRate = recentPlayed > 0
        ? Math.round(((recentGoals + recentAssists) / recentPlayed) * 10) / 10
        : null;

    const trainingPossible = Number(stats?.oppmotePossible) || 0;
    const trainingAttended = Number(stats?.oppmoteAttended) || 0;
    const trainingPct = trainingPossible > 0 ? Number(stats?.oppmotePct) || 0 : null;
    const recentTraining = typeof window.getStatsDiagramRecentTrainings === 'function'
        ? window.getStatsDiagramRecentTrainings(player, yearFilter)
        : { possible: 0, attended: 0, pct: null };

    const positionRows = typeof window.buildPlayerPositionMatchStats === 'function'
        ? (window.buildPlayerPositionMatchStats(player, { yearFilter }) || [])
        : [];
    const datesByRole = new Map();
    positionRows.forEach(row => {
        const dates = new Set((row.entries || []).map(entry => entry?.date).filter(Boolean));
        datesByRole.set(row.posId, dates);
    });
    const dateOwners = new Map();
    datesByRole.forEach((dates, posId) => {
        dates.forEach(date => {
            const owners = dateOwners.get(date) || [];
            owners.push(posId);
            dateOwners.set(date, owners);
        });
    });
    const relativesByRole = new Map();
    samples.forEach(sample => {
        const relative = insightRelativeValue(sample, minOthers);
        if (relative == null || !sample.date) return;
        const owners = dateOwners.get(sample.date) || [];
        if (owners.length !== 1) return;
        const list = relativesByRole.get(owners[0]) || [];
        list.push(relative);
        relativesByRole.set(owners[0], list);
    });
    const roles = positionRows.map(row => {
        const ratingsCount = Number(row.ratingsCount) || 0;
        const bors = ratingsCount > 0 ? Number(row.ratingsSum) / ratingsCount : null;
        const relatives = relativesByRole.get(row.posId) || [];
        return {
            label: row.label || row.posId || 'Ukjent rolle',
            matches: Number(row.matches) || 0,
            bors,
            borsRounded: insightRound(bors, 1),
            relative: relatives.length ? insightMean(relatives) : null,
            relativeCount: relatives.length
        };
    }).filter(role => role.matches > 0);

    const starters = [];
    const subs = [];
    let knownXi = 0;
    attendedMatches.forEach(match => {
        if (typeof window.matchHasStartingXi !== 'function' || !window.matchHasStartingXi(match)) return;
        knownXi += 1;
        if (typeof window.isPlayerOnPitch !== 'function' || !window.isPlayerOnPitch(match, player)) return;
        const status = typeof window.getPlayerMatchStartStatus === 'function'
            ? window.getPlayerMatchStartStatus(match, player)
            : '';
        if (status === 'S') starters.push(match);
        else if (status === 'B') subs.push(match);
    });

    const summarizeSide = matches => {
        const ratings = matches.map(match => insightRatingValue(match, player)).filter(value => value != null);
        const relatives = insightSamplesForMatches(samples, matches, minOthers);
        const bidrag = matches.length && typeof window.calculatePlayerMatchPoints === 'function'
            ? matches.reduce((sum, match) => sum + (Number(window.calculatePlayerMatchPoints(match, player)) || 0), 0) / matches.length
            : null;
        return {
            count: matches.length,
            bors: ratings.length ? insightMean(ratings) : null,
            relative: relatives.length ? insightMean(relatives) : null,
            bidrag
        };
    };

    const resultGroups = [
        { key: 'seier', label: 'Seier', points: 3 },
        { key: 'uavgjort', label: 'Uavgjort', points: 1 },
        { key: 'tap', label: 'Tap', points: 0 }
    ].map(group => {
        const groupSamples = samples.filter(sample => sample.points === group.points);
        const relatives = groupSamples
            .map(sample => insightRelativeValue(sample, minOthers))
            .filter(value => value != null);
        return {
            ...group,
            count: groupSamples.length,
            bors: groupSamples.length ? insightMean(groupSamples.map(sample => sample.rating)) : null,
            relative: relatives.length ? insightMean(relatives) : null
        };
    }).filter(group => group.count > 0);

    const chartPoints = attendedMatches
        .filter(match => typeof window.isPlayerOnPitch !== 'function' || window.isPlayerOnPitch(match, player))
        .map(match => {
            const rating = insightRatingValue(match, player);
            return rating == null ? null : { date: match.date, rating };
        })
        .filter(Boolean);

    const borsMove = insightRawDelta(seasonBors, recentBors);
    const relativeMove = insightRawDelta(seasonRelative, recentRelative);
    const bidragMove = insightRawDelta(seasonBidrag, recentBidrag);
    const insightMove = (delta, count, threshold) => {
        if (delta == null || count < 3) return null;
        if (delta >= threshold) return 'up';
        if (delta <= -threshold) return 'down';
        return 'flat';
    };
    const moves = {
        bors: insightMove(borsMove, recentBorsCount, 0.3),
        relative: insightMove(relativeMove, recentRelatives.length, 0.2),
        bidrag: insightMove(bidragMove, recentMatches.length, 2)
    };
    const votes = [moves.bors, moves.relative, moves.bidrag].filter(Boolean);
    const ups = votes.filter(vote => vote === 'up').length;
    const downs = votes.filter(vote => vote === 'down').length;
    const trend = ups >= 2 && downs === 0 ? 'up' : downs >= 2 && ups === 0 ? 'down' : null;
    const stable = !trend && votes.length >= 2 && ups === 0 && downs === 0 && played >= 5 && recentMatches.length >= 3;

    const eligibleRoles = roles.filter(role => role.matches >= 3 && role.borsRounded != null);
    let roleGapText = '';
    if (eligibleRoles.length >= 2) {
        const ranked = [...eligibleRoles].sort((a, b) => b.borsRounded - a.borsRounded || b.matches - a.matches);
        const high = ranked[0];
        const low = ranked[ranked.length - 1];
        if (high.borsRounded - low.borsRounded >= 0.4) {
            roleGapText = `Prestasjonstallene varierer mellom rollene. Spilleren har så langt levert sterkere som ${high.label} (${insightFormatNumber(high.bors, 1)}, ${high.matches} kamper) enn som ${low.label} (${insightFormatNumber(low.bors, 1)}, ${low.matches} kamper).`;
        }
    }

    const recentRoleCounts = new Map();
    recentMatches.forEach(match => {
        if (!match?.date) return;
        const owners = dateOwners.get(match.date) || [];
        if (owners.length !== 1) return;
        const row = positionRows.find(item => item.posId === owners[0]);
        const label = row?.label || row?.posId || '';
        if (!label) return;
        recentRoleCounts.set(label, (recentRoleCounts.get(label) || 0) + 1);
    });
    const recentRoleRanked = [...recentRoleCounts.entries()].sort((a, b) => b[1] - a[1]);
    const recentRoleTop = recentRoleRanked[0];
    const recentRoleLabel = recentRoleTop
        && recentRoleTop[1] >= 2
        && recentRoleTop[1] >= Math.ceil(recentMatches.length / 2)
        && (recentRoleRanked.length === 1 || recentRoleTop[1] > recentRoleRanked[1][1])
        ? `${recentRoleTop[0]} · ${recentRoleTop[1]} av ${recentMatches.length}`
        : '';

    const relativeRounded = insightRound(seasonRelative, 2);
    const relativeClear = relativeRounded != null && validRelatives.length >= 5 && Math.abs(relativeRounded) >= 0.25;
    const trainingEnough = trainingPct != null && trainingPossible >= 8;
    let trainingPattern = null;
    if (trainingEnough && trainingPct >= 65 && relativeRounded != null && relativeRounded <= -0.25 && validRelatives.length >= 5) {
        trainingPattern = 'high-low';
    }
    const strongSignals = [
        relativeRounded != null && relativeRounded >= 0.25 && validRelatives.length >= 5,
        seasonBidrag != null && insightRound(seasonBidrag, 1) >= 20 && attended >= 5 && played >= 5,
        seasonRate != null && seasonRate >= 0.4 && goalPoints >= 4 && played >= 5,
        seasonBors != null && insightRound(seasonBors, 1) >= 6.3 && seasonBorsCount >= 5
    ].filter(Boolean).length;
    if (!trainingPattern && trainingEnough && trainingPct <= 40 && strongSignals >= 1) {
        trainingPattern = 'low-high';
    }

    let productionShift = null;
    if (seasonRate != null && recentRate != null && played >= 3 && recentPlayed >= 3) {
        const productionDelta = insightRound(recentRate - seasonRate, 1);
        if (productionDelta >= 0.3) productionShift = 'up';
        else if (productionDelta <= -0.3) productionShift = 'down';
    }

    return {
        played,
        attended,
        knownXi,
        bors: { value: seasonBors, count: seasonBorsCount },
        relative: { value: seasonRelative, count: validRelatives.length },
        bidrag: { value: seasonBidrag, count: attended },
        training: { pct: trainingPct, attended: trainingAttended, possible: trainingPossible },
        recentTraining: {
            pct: recentTraining?.pct == null ? null : Number(recentTraining.pct),
            attended: Number(recentTraining?.attended) || 0,
            possible: Number(recentTraining?.possible) || 0
        },
        recent: {
            windowCount: recentMatches.length,
            bors: { value: recentBors, count: recentBorsCount },
            relative: { value: recentRelative, count: recentRelatives.length },
            bidrag: { value: recentBidrag, count: recentMatches.length },
            production: {
                played: recentPlayed,
                points: recentGoalPoints,
                rate: recentRate
            }
        },
        production: {
            goals,
            assists,
            points: goalPoints,
            played,
            rate: seasonRate
        },
        roles,
        roleGapText,
        recentRoleLabel,
        moves,
        trend,
        stable,
        relativeClear,
        trainingPattern,
        productionShift,
        starters: summarizeSide(starters),
        subs: summarizeSide(subs),
        results: resultGroups,
        chartPoints,
        sameWindow: recentMatches.length > 0 && recentMatches.length === attended && attended < 5
    };
}

function buildPlayerInsightObservations(model) {
    const caution = 'Datagrunnlaget er foreløpig begrenset. Tallene bør tolkes med forsiktighet.';
    if ((model.played || 0) <= 2) return [caution];

    const items = [];
    if (model.trend === 'up') {
        items.push('Følg om den positive utviklingen holder seg over flere kamper.');
    } else if (model.trend === 'down') {
        items.push('Følg om nedgangen holder seg over de neste kampene.');
    }
    if (model.roleGapText) items.push(model.roleGapText);

    const relativeValue = model.relative?.value;
    const suppressRelative = model.trainingPattern === 'high-low'
        || (model.trainingPattern === 'low-high' && relativeValue != null && relativeValue > 0);
    if (model.relativeClear && !suppressRelative) {
        const side = relativeValue < 0 ? 'under' : 'over';
        items.push(`Spilleren ligger ${insightFormatSigned(relativeValue, 2)} i relativ prestasjon, ${side} lagkameratene i de samme kampene (${model.relative.count} gyldige kamper). Verdt å se nærmere på om det varierer med rolle eller periode.`);
    }
    if (model.trainingPattern === 'high-low') {
        items.push('Høyt treningsoppmøte, samtidig som relativ prestasjon ligger under lagkameratene i de samme kampene. Undersøk om dette varierer med rolle, posisjon, utvikling eller kampfase.');
    } else if (model.trainingPattern === 'low-high') {
        items.push('Lavt treningsoppmøte, men sterke kamp- og produksjonsverdier. Undersøk hvor stabil prestasjonen er over tid og om lavt oppmøte påvirker tilgjengelighet eller samspill.');
    }
    const sameProductionDirection = (model.trend === 'up' && model.productionShift === 'up')
        || (model.trend === 'down' && model.productionShift === 'down');
    if (model.productionShift && !sameProductionDirection && model.recent?.production?.played) {
        const direction = model.productionShift === 'up' ? 'høyere' : 'lavere';
        const period = insightRecentLabel(model.recent.production.played).toLowerCase();
        items.push(`Målpoeng per kamp ligger ${direction} i ${period} kamper på banen (${insightFormatNumber(model.recent.production.rate, 1)}) enn sesongsnittet (${insightFormatNumber(model.production.rate, 1)}). Se om produksjonen følger med børs og rolle.`);
    }
    if (model.stable) {
        items.push('Følg om den stabile perioden holder seg over flere kamper.');
    }

    const limited = model.played < 5;
    const selected = items.slice(0, limited ? 2 : 3);
    if (limited) selected.push(caution);
    if (!selected.length) {
        selected.push('Ingen tydelig sammensatt avvik i de registrerte tallene.');
    }
    return selected.slice(0, 3);
}

function buildPlayerInsightMetricHtml(label, value, basis, title) {
    const titleAttr = title ? ` title="${escapeRosterHtml(title)}"` : '';
    const basisHtml = basis
        ? `<span class="player-insight-basis">${escapeRosterHtml(basis)}</span>`
        : '';
    return `
        <div class="player-profile-metric player-insight-metric"${titleAttr}>
            <span class="player-profile-metric-label">${escapeRosterHtml(label)}</span>
            <span class="player-profile-metric-value">${escapeRosterHtml(value)}</span>
            ${basisHtml}
        </div>
    `;
}

function buildPlayerInsightCompareHtml(label, seasonValue, seasonBasis, recentLabel, recentValue, recentBasis, delta, showDelta) {
    return `
        <div class="player-insight-compare">
            <p class="player-insight-kicker">${escapeRosterHtml(label)}</p>
            <div class="player-insight-compare-line">
                <span>Sesong</span>
                <strong>${escapeRosterHtml(seasonValue)}</strong>
                <span>${escapeRosterHtml(seasonBasis || '')}</span>
            </div>
            <div class="player-insight-compare-line">
                <span>${escapeRosterHtml(recentLabel)}</span>
                <strong>${escapeRosterHtml(recentValue)}</strong>
                <span>${escapeRosterHtml(recentBasis || '')}</span>
            </div>
            ${showDelta ? `
                <div class="player-insight-compare-line">
                    <span>Endring</span>
                    <strong>${escapeRosterHtml(delta)}</strong>
                    <span></span>
                </div>
            ` : ''}
        </div>
    `;
}

function buildPlayerInsightSideHtml(title, side) {
    if (!side?.count) {
        return `
            <div class="player-insight-side">
                <p class="player-insight-kicker">${escapeRosterHtml(title)}</p>
                <p class="player-insight-note">Ikke nok data</p>
            </div>
        `;
    }
    return `
        <div class="player-insight-side">
            <p class="player-insight-kicker">${escapeRosterHtml(title)}</p>
            <p class="player-insight-side-value">${escapeRosterHtml(insightFormatNumber(side.bors, 1))}</p>
            <p class="player-insight-basis">${escapeRosterHtml(insightMatchBasis(side.count, true))}</p>
            <p class="player-insight-side-line"><span>Relativ</span><strong>${escapeRosterHtml(insightFormatSigned(side.relative, 2))}</strong></p>
            <p class="player-insight-side-line"><span>Kampbidrag</span><strong>${escapeRosterHtml(insightFormatNumber(side.bidrag, 1))}</strong></p>
        </div>
    `;
}

function buildPlayerInsightSectionHtml(title, body, extraClass = '') {
    return `
        <section class="player-insight-block${extraClass ? ` ${extraClass}` : ''}">
            <h3 class="player-profile-section-title">${escapeRosterHtml(title)}</h3>
            ${body}
        </section>
    `;
}

function insightJoinPhrases(parts) {
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} og ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')} og ${parts[parts.length - 1]}`;
}

function insightNowStatus(model) {
    const moves = model.moves || {};
    const votes = [moves.bors, moves.relative, moves.bidrag].filter(Boolean);
    const ups = votes.filter(vote => vote === 'up').length;
    const downs = votes.filter(vote => vote === 'down').length;
    const thin = (model.played || 0) <= 2
        || (model.recent?.windowCount || 0) < 3
        || model.sameWindow
        || votes.length < 2;
    if (thin) return 'limited';
    if (ups >= 2 && downs === 0) return 'up';
    if (downs >= 2 && ups === 0) return 'down';
    if (ups === 0 && downs === 0) return 'stable';
    return 'mixed';
}

function insightNowSplitSentence(moves) {
    const phrase = {
        bors: { up: 'trenerbørsen har økt', down: 'trenerbørsen har falt', flat: 'børsen er omtrent stabil' },
        relative: { up: 'relativ prestasjon har økt', down: 'relativ prestasjon har falt', flat: 'relativ prestasjon er omtrent stabil' },
        bidrag: { up: 'kampbidraget har økt', down: 'kampbidraget har falt', flat: 'kampbidraget er omtrent stabilt' }
    };
    const up = [];
    const down = [];
    const flat = [];
    ['bidrag', 'bors', 'relative'].forEach(key => {
        const direction = moves?.[key];
        if (!direction || !phrase[key][direction]) return;
        if (direction === 'up') up.push(phrase[key][direction]);
        else if (direction === 'down') down.push(phrase[key][direction]);
        else flat.push(phrase[key][direction]);
    });
    const moving = [...up, ...down];
    if (!moving.length && !flat.length) return '';
    const lead = insightJoinPhrases(moving.length ? moving : flat);
    const rest = moving.length && flat.length ? `, mens ${insightJoinPhrases(flat)}` : '';
    return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}${rest}.`;
}

function insightNowRelativeSentence(model, status) {
    const value = insightRound(model.relative?.value, 2);
    const count = model.relative?.count || 0;
    if (value == null || count < 5) return '';
    if (status === 'mixed' && value <= -0.25) {
        return 'Relativ prestasjon ligger fortsatt under lagkameratene i de samme kampene, så det er verdt å undersøke rolle og kampforløp nærmere.';
    }
    if (value >= 0.25) return 'Spilleren ligger over lagkameratene i de samme kampene.';
    if (value <= -0.25) return 'Spilleren ligger under lagkameratene i de samme kampene.';
    return 'Spilleren ligger omtrent på nivå med lagkameratene i de samme kampene.';
}

function insightNowProductionSentence(model, status) {
    if (!model.productionShift || status === 'limited' || status === 'mixed') return '';
    if (status === 'stable' && model.productionShift === 'up') {
        return 'Prestasjonen har vært stabil, mens målpoengproduksjonen har økt.';
    }
    if (status === 'stable' && model.productionShift === 'down') {
        return 'Prestasjonen har vært stabil, mens målpoengproduksjonen har falt.';
    }
    if (status === 'up' && model.productionShift === 'up') {
        return 'Målpoengproduksjonen har også økt i den siste perioden.';
    }
    if (status === 'down' && model.productionShift === 'down') {
        return 'Målpoengproduksjonen har også falt i den siste perioden.';
    }
    return '';
}

function buildPlayerInsightNowCopy(model) {
    const status = insightNowStatus(model);
    const labels = {
        up: 'Sterkere periode',
        down: 'Svakere periode',
        stable: 'Stabil periode',
        mixed: 'Blandet bilde',
        limited: 'Begrenset datagrunnlag'
    };
    const sentences = [];
    if (status === 'limited') {
        sentences.push((model.played || 0) <= 2
            ? 'Det er foreløpig for få kamper til å beskrive spillerens utvikling på en robust måte.'
            : 'Datagrunnlaget i den siste perioden er foreløpig for lite til å beskrive en tydelig utvikling.');
    } else if (status === 'up') {
        sentences.push('Prestasjonstallene har vært sterkere i den siste perioden enn gjennom sesongen totalt.');
    } else if (status === 'down') {
        sentences.push('Flere prestasjonsmål ligger lavere i den siste perioden enn sesongsnittet.');
        sentences.push('Se nærmere på hvilke kamper og roller som ligger bak endringen.');
    } else if (status === 'mixed') {
        sentences.push('Prestasjonstallene i den siste perioden peker i ulike retninger.');
        const split = insightNowSplitSentence(model.moves);
        if (split) sentences.push(split);
    } else if (!insightNowProductionSentence(model, status)) {
        sentences.push('Prestasjonstallene er omtrent uendret i den siste perioden sammenlignet med sesongen.');
    }

    const relativeSentence = status === 'limited' ? '' : insightNowRelativeSentence(model, status);
    const productionSentence = insightNowProductionSentence(model, status);
    [relativeSentence, productionSentence].forEach(sentence => {
        if (sentence && sentences.length < 3) sentences.push(sentence);
    });
    if (status === 'up' && sentences.length < 3) {
        const risen = [
            model.moves?.bors === 'up' ? 'trenerbørs' : '',
            model.moves?.relative === 'up' ? 'relativ prestasjon' : '',
            model.moves?.bidrag === 'up' ? 'kampbidrag' : ''
        ].filter(Boolean);
        if (risen.length >= 2) sentences.push(`Både ${insightJoinPhrases(risen)} har økt.`);
    }

    return {
        status,
        label: labels[status],
        sentences: sentences.slice(0, 3),
        recentRoleLabel: status === 'limited' ? '' : (model.recentRoleLabel || '')
    };
}

window.getPlayerInsightNowStatus = function(player, yearFilter) {
    if (!player) return null;
    const copy = buildPlayerInsightNowCopy(buildPlayerInsightModel(player, yearFilter));
    return {
        status: copy.status,
        label: copy.label,
        sentence: copy.sentences[0] || ''
    };
};

function buildPlayerInsightNowCardHtml(label, nowText, seasonText, deltaText, basis, direction) {
    const tone = direction === 'up' || direction === 'down' || direction === 'flat' ? direction : '';
    const icon = direction === 'up' ? 'fa-arrow-up' : direction === 'down' ? 'fa-arrow-down' : '';
    const mark = direction === 'flat'
        ? '<span class="player-insight-flat" aria-hidden="true"></span>'
        : icon ? `<i class="fa-solid ${icon}" aria-hidden="true"></i>` : '';
    const deltaHtml = `
        <p class="player-insight-now-delta${tone ? ` is-${tone}` : ''}">
            ${mark}
            <span>${escapeRosterHtml(deltaText)}</span>
        </p>
    `;
    return `
        <article class="player-insight-now-card">
            <p class="player-insight-kicker">${escapeRosterHtml(label)}</p>
            <p class="player-insight-now-value">${escapeRosterHtml(nowText)}</p>
            <p class="player-insight-now-season">Sesong ${escapeRosterHtml(seasonText)}</p>
            ${deltaHtml}
            ${basis ? `<p class="player-insight-basis">${escapeRosterHtml(basis)}</p>` : ''}
        </article>
    `;
}

function insightNowCountBasis(count, singular, plural) {
    if (!count) return '';
    return `${count} ${count === 1 ? singular : plural}`;
}

function isPlayerInsightDetailOpen(id) {
    return window.playerInsightDetailOpen?.[id] === true;
}

function buildPlayerInsightDetailHtml(id, title, summary, body) {
    const plain = String(body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!summary && (!plain || plain === 'Ikke nok data')) return '';
    const open = isPlayerInsightDetailOpen(id);
    return `
        <section class="player-insight-detail${open ? '' : ' is-collapsed'}" data-insight-detail="${escapeRosterHtml(id)}">
            <button
                type="button"
                class="player-insight-detail-toggle"
                data-player-profile-action="toggle-insight-detail"
                data-insight-detail="${escapeRosterHtml(id)}"
                aria-expanded="${open ? 'true' : 'false'}"
            >
                <span class="player-insight-detail-copy">
                    <span class="player-insight-detail-title">${escapeRosterHtml(title)}</span>
                    ${summary ? `<span class="player-insight-detail-summary">${escapeRosterHtml(summary)}</span>` : ''}
                </span>
                <span class="player-insight-detail-action">${open ? 'Skjul detaljer' : 'Vis detaljer'}</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="player-insight-detail-body">${body}</div>
        </section>
    `;
}

function buildPlayerInsightCardHtml(player, yearFilter) {
    const model = buildPlayerInsightModel(player, yearFilter);
    const nowCopy = buildPlayerInsightNowCopy(model);
    const recentLabel = insightRecentLabel(model.recent.windowCount);
    const observations = buildPlayerInsightObservations(model);
    const trainingBasis = model.training.possible > 0
        ? `${model.training.attended} av ${model.training.possible}`
        : '';
    const recentTrainingBasis = model.recentTraining.possible > 0
        ? `${model.recentTraining.attended} av ${model.recentTraining.possible}`
        : '';
    const starterKnown = model.knownXi > 0;
    const overview = [
        buildPlayerInsightMetricHtml(
            'Sesongbørs',
            insightFormatNumber(model.bors.value, 1),
            model.bors.count ? insightMatchBasis(model.bors.count) : '',
            'Snitt av registrert trenerbørs på banen'
        ),
        buildPlayerInsightMetricHtml(
            'Relativ prestasjon',
            insightFormatSigned(model.relative.value, 2),
            model.relative.count ? `${model.relative.count} gyldige kamper` : '',
            'Trenerbørs minus snittet til de andre vurderte spillerne i samme kamp'
        ),
        buildPlayerInsightMetricHtml(
            'Kampbidrag',
            insightFormatNumber(model.bidrag.value, 1),
            model.bidrag.count ? (model.attended === model.played ? insightMatchBasis(model.bidrag.count) : `${model.bidrag.count} kamper i troppen`) : '',
            'Snitt kampbidrag for kamper spilleren var i troppen'
        ),
        buildPlayerInsightMetricHtml(
            'Trening',
            model.training.pct == null ? '—' : `${model.training.pct} %`,
            trainingBasis,
            'Møtt av treninger der spilleren var registrert i troppen'
        )
    ];
    const secondary = [
        buildPlayerInsightMetricHtml('Kamper', model.played > 0 || model.attended > 0 ? String(model.played) : '—', model.played ? 'På banen' : '')
    ];
    if (starterKnown) {
        secondary.push(buildPlayerInsightMetricHtml(
            'Starter',
            String(model.starters.count),
            model.knownXi === model.attended
                ? insightMatchBasis(model.starters.count)
                : `${model.starters.count} av ${model.knownXi} med 11er`
        ));
    }
    if (model.production.points != null) {
        secondary.push(buildPlayerInsightMetricHtml(
            'Målpoeng',
            String(model.production.points),
            model.production.played ? `${model.production.points} på ${model.production.played} kamper` : ''
        ));
    }

    const developmentParts = [];
    const developmentRows = [
        ['Trenerbørs', model.bors, model.recent.bors, 1, false],
        ['Relativ prestasjon', model.relative, model.recent.relative, 2, true],
        ['Kampbidrag', model.bidrag, model.recent.bidrag, 1, false]
    ];
    developmentRows.forEach(([label, season, recent, digits, signed]) => {
        if (season.value == null && recent.value == null) return;
        const format = signed ? insightFormatSigned : insightFormatNumber;
        const recentBasis = recent.count
            ? (recent.count < model.recent.windowCount
                ? `Basert på ${recent.count} ${recent.count === 1 ? 'kamp' : 'kamper'}`
                : insightMatchBasis(recent.count, true))
            : '';
        developmentParts.push(buildPlayerInsightCompareHtml(
            label,
            format(season.value, digits),
            season.count ? (label === 'Relativ prestasjon' ? `${season.count} gyldige kamper` : insightMatchBasis(season.count)) : '',
            recentLabel,
            recent.value == null ? 'Ikke nok data' : format(recent.value, digits),
            recentBasis,
            insightFormatDelta(season.value, recent.value, digits),
            season.value != null && recent.value != null && recent.count >= 2
        ));
    });
    let developmentBody = developmentParts.length
        ? `<div class="player-insight-trends">${developmentParts.join('')}</div>`
        : '<p class="player-insight-note">Ikke nok data</p>';
    if (model.sameWindow) {
        developmentBody += '<p class="player-insight-note">Siste periode er de samme kampene som sesongen.</p>';
    } else if (model.recent.windowCount > 0) {
        developmentBody += `<p class="player-insight-note">${escapeRosterHtml(recentLabel)} er spillerens egne siste kamper i troppen.</p>`;
    }
    developmentBody += buildPlayerInsightRatingChartSvg(model.chartPoints);

    let roleBody = '<p class="player-insight-note">Ikke nok data</p>';
    if (model.roles.length) {
        roleBody = `
            <div class="player-insight-role-list">
                ${model.roles.map(role => `
                    <article class="player-insight-role" title="${escapeRosterHtml(insightMatchBasis(role.matches, true))}">
                        <h4>${escapeRosterHtml(role.label)}</h4>
                        <p class="player-insight-role-stat"><strong>${escapeRosterHtml(insightFormatNumber(role.bors, 1))}</strong><span>børs</span></p>
                        ${role.relative == null ? '' : `<p class="player-insight-role-stat"><strong>${escapeRosterHtml(insightFormatSigned(role.relative, 2))}</strong><span>relativ</span></p>`}
                        <p class="player-insight-basis">${escapeRosterHtml(insightMatchBasis(role.matches, true))}</p>
                    </article>
                `).join('')}
            </div>
        `;
        if (model.roles.length === 1) {
            roleBody += '<p class="player-insight-note">Kun én registrert rolle, så det blir ingen sammenligning.</p>';
        }
    }

    const relativeSentence = model.relative.value == null
        ? ''
        : (() => {
            const amount = insightFormatNumber(Math.abs(model.relative.value), 2);
            if (insightRound(model.relative.value, 2) > 0) {
                return `Det betyr at spilleren i gjennomsnitt ligger ${amount} børspoeng over lagkameratene i de samme kampene.`;
            }
            if (insightRound(model.relative.value, 2) < 0) {
                return `Det betyr at spilleren i gjennomsnitt ligger ${amount} børspoeng under lagkameratene i de samme kampene.`;
            }
            return 'Det betyr at spilleren i gjennomsnitt ligger på samme nivå som lagkameratene i de samme kampene.';
        })();
    const relativeLead = model.relative.value == null
        ? ''
        : insightRound(model.relative.value, 2) > 0
            ? 'Over lagkameratene i de samme kampene'
            : insightRound(model.relative.value, 2) < 0
                ? 'Under lagkameratene i de samme kampene'
                : 'På nivå med lagkameratene i de samme kampene';
    let performanceBody = `
        <div class="player-insight-relative">
            <p class="player-insight-kicker">Relativ prestasjon</p>
            <p class="player-insight-relative-value">${escapeRosterHtml(insightFormatSigned(model.relative.value, 2))}</p>
            ${relativeLead ? `<p class="player-insight-lead">${escapeRosterHtml(relativeLead)}</p>` : ''}
            ${model.relative.count ? `<p class="player-insight-basis">${model.relative.count} gyldige kamper</p>` : ''}
            <p class="player-insight-note">Forskjellen mellom spillerens trenerbørs og gjennomsnittet til de andre vurderte spillerne i de samme kampene.</p>
            ${relativeSentence ? `<p class="player-insight-note">${escapeRosterHtml(relativeSentence)} Dette er ikke et mål på årsak eller spillereffekt.</p>` : '<p class="player-insight-note">Dette er ikke et mål på årsak eller spillereffekt.</p>'}
        </div>
    `;
    if (!model.starters.count && !model.subs.count) {
        performanceBody += '<p class="player-insight-note">Ikke nok data til å skille starter og innbytter.</p>';
    } else if (!model.starters.count || !model.subs.count) {
        const only = model.starters.count ? model.starters : model.subs;
        const onlyTitle = model.starters.count ? 'Starter' : 'Innbytter';
        performanceBody += buildPlayerInsightSideHtml(onlyTitle, only);
        performanceBody += '<p class="player-insight-note">Ikke nok data til å sammenligne med den andre kategorien.</p>';
    } else {
        performanceBody += `
            <div class="player-insight-split">
                ${buildPlayerInsightSideHtml('Starter', model.starters)}
                ${buildPlayerInsightSideHtml('Innbytter', model.subs)}
            </div>
        `;
    }
    if (!model.results.length) {
        performanceBody += '<p class="player-insight-note">Ikke nok data til å dele på seier, uavgjort og tap.</p>';
    } else {
        performanceBody += `
            <div class="player-insight-results">
                ${model.results.map(result => `
                    <div class="player-insight-side">
                        <p class="player-insight-kicker">${escapeRosterHtml(result.label)}</p>
                        <p class="player-insight-side-value">${escapeRosterHtml(insightFormatNumber(result.bors, 1))}</p>
                        <p class="player-insight-side-line"><span>Relativ</span><strong>${escapeRosterHtml(insightFormatSigned(result.relative, 2))}</strong></p>
                        <p class="player-insight-basis">${escapeRosterHtml(insightMatchBasis(result.count, true))}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    const trainingMeter = model.training.pct == null
        ? ''
        : `<div class="player-insight-meter" aria-hidden="true"><span style="width: ${Math.max(0, Math.min(100, Number(model.training.pct) || 0))}%"></span></div>`;
    const trainingBody = `
        <p class="player-insight-relative-value">${escapeRosterHtml(model.training.pct == null ? '—' : `${model.training.pct} %`)}</p>
        <p class="player-insight-basis">${escapeRosterHtml(trainingBasis ? `${trainingBasis} treninger` : 'Ikke nok data')}</p>
        ${trainingMeter}
        <p class="player-insight-kicker player-insight-subkicker">${escapeRosterHtml(insightRecentLabel(model.recentTraining.possible))}</p>
        <p class="player-insight-inline">${escapeRosterHtml(model.recentTraining.pct == null ? '—' : `${model.recentTraining.pct} %`)} <span>${escapeRosterHtml(recentTrainingBasis || 'Ikke nok data')}</span></p>
        <p class="player-insight-note">Treningsoppmøte og kampprestasjon vises som separate observasjoner.</p>
    `;

    let productionBody = '<p class="player-insight-note">Ikke nok data</p>';
    if (model.production.played > 0) {
        const recentProductionBasis = model.recent.production.played
            ? `${model.recent.production.points} målpoeng på ${model.recent.production.played} kamper`
            : '';
        productionBody = `
            <div class="player-insight-metrics">
                ${buildPlayerInsightMetricHtml('Mål', String(model.production.goals))}
                ${buildPlayerInsightMetricHtml('Assist', String(model.production.assists))}
                ${buildPlayerInsightMetricHtml('Målpoeng', String(model.production.points), `${model.production.points} på ${model.production.played} kamper`)}
                ${buildPlayerInsightMetricHtml('Målpoeng/kamp', insightFormatNumber(model.production.rate, 1), `${model.production.played} kamper på banen`)}
            </div>
            <p class="player-insight-inline">${escapeRosterHtml(insightRecentLabel(model.recent.production.played))}: <strong>${escapeRosterHtml(model.recent.production.rate == null ? 'Ikke nok data' : `${insightFormatNumber(model.recent.production.rate, 1)} / kamp`)}</strong></p>
            ${recentProductionBasis ? `<p class="player-insight-basis">${escapeRosterHtml(recentProductionBasis)}</p>` : ''}
            <p class="player-insight-note">Registrert produksjon. Ikke et mål på offensiv kvalitet.</p>
        `;
    }

    const nowDelta = (season, recent, digits) => (
        season.value != null && recent.value != null && recent.count >= 2
            ? insightFormatDelta(season.value, recent.value, digits)
            : '—'
    );
    const formatNow = (metric, digits, signed) => {
        const format = signed ? insightFormatSigned : insightFormatNumber;
        return {
            now: metric.recent.value == null ? '—' : format(metric.recent.value, digits),
            season: metric.season.value == null ? '—' : format(metric.season.value, digits),
            delta: nowDelta(metric.season, metric.recent, digits)
        };
    };
    const borsNow = formatNow({ season: model.bors, recent: model.recent.bors }, 1, false);
    const relativeNow = formatNow({ season: model.relative, recent: model.recent.relative }, 2, true);
    const bidragNow = formatNow({ season: model.bidrag, recent: model.recent.bidrag }, 1, false);
    const roleParts = String(nowCopy.recentRoleLabel || '').split(' · ');
    const relativeBit = model.relative.value == null ? '' : `relativ ${insightFormatSigned(model.relative.value, 2)}`;
    const roleSummary = roleParts.length === 2
        ? [`${roleParts[0]} mest brukt`, relativeBit].filter(Boolean).join(' · ')
        : model.roles.length === 1
            ? [model.roles[0].label, relativeBit].filter(Boolean).join(' · ')
            : relativeBit || (model.roles.length ? `${model.roles.length} roller` : '');
    const developmentSummary = model.sameWindow
        ? 'Siste periode er sesongen'
        : model.trend === 'up'
            ? 'Sterkere siste periode'
            : model.trend === 'down'
                ? 'Svakere siste periode'
                : model.stable
                    ? 'Omtrent uendret siste periode'
                    : [model.moves?.bors, model.moves?.relative, model.moves?.bidrag].some(Boolean)
                        ? 'Ulik retning siste periode'
                        : '';
    const trainingSummary = (model.training.possible > 0 || model.recentTraining.possible > 0)
        ? [
            model.training.pct == null ? '' : `${model.training.pct} % sesong`,
            model.recentTraining.possible > 0 ? `${model.recentTraining.attended}/${model.recentTraining.possible} siste` : ''
        ].filter(Boolean).join(' · ')
        : '';
    const productionSummary = model.production.played > 0
        ? [
            `${model.production.points} målpoeng`,
            model.recent.production.rate == null ? '' : `${insightFormatNumber(model.recent.production.rate, 1)}/kamp siste periode`
        ].filter(Boolean).join(' · ')
        : '';
    const roleFacts = secondary.slice(0, starterKnown ? 2 : 1);
    const rolePerformanceBody = `
        <div class="player-insight-detail-group">
            <p class="player-insight-kicker">Roller</p>
            ${roleBody}
        </div>
        <div class="player-insight-detail-group">
            <p class="player-insight-kicker">Prestasjon</p>
            ${performanceBody}
            ${roleFacts.length ? `<div class="player-insight-metrics">${roleFacts.join('')}</div>` : ''}
        </div>
    `;
    if (overview.length) {
        developmentBody += `
            <div class="player-insight-detail-group">
                <p class="player-insight-kicker">Sesongtall</p>
                <div class="player-insight-metrics is-primary">${overview.join('')}</div>
            </div>
        `;
    }
    const developmentUseful = developmentParts.length > 0 || (model.chartPoints || []).length >= 2 || model.recent.windowCount > 0 || overview.length > 0;
    const roleUseful = model.roles.length > 0 || model.relative.value != null || model.starters.count > 0 || model.subs.count > 0 || model.results.length > 0 || model.played > 0;
    const detailHtml = [
        developmentUseful ? buildPlayerInsightDetailHtml('utvikling', 'Utvikling', developmentSummary, developmentBody) : '',
        roleUseful ? buildPlayerInsightDetailHtml('rolle', 'Rolle & prestasjon', roleSummary, rolePerformanceBody) : '',
        trainingSummary ? buildPlayerInsightDetailHtml('trening', 'Trening', trainingSummary, trainingBody) : '',
        productionSummary ? buildPlayerInsightDetailHtml('produksjon', 'Produksjon', productionSummary, productionBody) : ''
    ].join('');
    const infoOpen = isPlayerProfileInsightInfoOpen();
    return `
        <section class="${playerProfilePanelClass('innsikt', 'player-insight')}" data-profile-panel="innsikt" aria-expanded="${isPlayerProfilePanelOpen('innsikt') ? 'true' : 'false'}">
            ${buildPlayerProfileClashHeaderHtml({
                title: 'Spillerinnsikt',
                icon: 'fa-magnifying-glass',
                subtitle: 'Prestasjon, utvikling og observasjoner',
                asideHtml: `
                    <button
                        type="button"
                        class="training-session-groups-info-btn player-profile-insight-info-btn${infoOpen ? ' is-active' : ''}"
                        data-player-profile-action="toggle-insight-info"
                        aria-expanded="${infoOpen ? 'true' : 'false'}"
                        aria-controls="player-profile-insight-info"
                        title="Om Spillerinnsikt"
                        aria-label="Om Spillerinnsikt"
                    >
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    </button>
                `
            })}
            <div class="player-profile-collapsible-content">
                <div id="player-profile-insight-info" class="training-session-groups-info player-profile-insight-info${infoOpen ? '' : ' is-hidden'}" ${infoOpen ? '' : 'hidden'}>
                    <p>Spillerinnsikt samler registrerte prestasjons-, trenings-, rolle- og produksjonsdata. Observasjonene peker på mønstre som kan være verdt å undersøke nærmere, men forklarer ikke hvorfor de oppstår.</p>
                </div>
                <div class="player-insight-main">
                    ${buildPlayerInsightSectionHtml('Akkurat nå', `
                        <p class="player-insight-status is-${escapeRosterHtml(nowCopy.status)}">${escapeRosterHtml(nowCopy.label)}</p>
                        <p class="player-insight-now-copy">${escapeRosterHtml(nowCopy.sentences.join(' '))}</p>
                        ${nowCopy.recentRoleLabel ? `<p class="player-insight-now-meta">Mest brukt nå: ${escapeRosterHtml(nowCopy.recentRoleLabel)}</p>` : ''}
                    `, `player-insight-hero is-${nowCopy.status}`)}
                    ${buildPlayerInsightSectionHtml('Nå vs sesong', `
                        <p class="player-insight-note">${escapeRosterHtml(recentLabel)} mot sesongsnittet. Grunnlaget kan være ulikt for hvert mål.</p>
                        <div class="player-insight-now-grid">
                            ${buildPlayerInsightNowCardHtml('Børs', borsNow.now, borsNow.season, borsNow.delta, insightNowCountBasis(model.recent.bors.count, 'vurdert kamp', 'vurderte kamper'), model.moves?.bors)}
                            ${buildPlayerInsightNowCardHtml('Relativ', relativeNow.now, relativeNow.season, relativeNow.delta, insightNowCountBasis(model.recent.relative.count, 'gyldig kamp', 'gyldige kamper'), model.moves?.relative)}
                            ${buildPlayerInsightNowCardHtml('Kampbidrag', bidragNow.now, bidragNow.season, bidragNow.delta, insightNowCountBasis(model.recent.bidrag.count, 'troppskamp', 'troppskamper'), model.moves?.bidrag)}
                        </div>
                    `, 'player-insight-kpi')}
                    ${buildPlayerInsightSectionHtml('Hva bør vi se nærmere på?', `
                        <ul class="player-insight-notes">
                            ${observations.map(text => `<li><i class="fa-solid fa-circle" aria-hidden="true"></i><span>${escapeRosterHtml(text)}</span></li>`).join('')}
                        </ul>
                    `, 'player-insight-watch')}
                </div>
                ${detailHtml ? `
                    <section class="player-insight-details">
                        <h3 class="player-insight-details-title">Detaljer</h3>
                        ${detailHtml}
                    </section>
                ` : ''}
            </div>
        </section>
    `;
}

function buildPlayerInsightHtml(player, yearFilter) {
    try {
        return buildPlayerInsightCardHtml(player, yearFilter);
    } catch (error) {
        console.error('Spillerinnsikt', error);
        return `
            <section class="${playerProfilePanelClass('innsikt', 'player-insight')}" data-profile-panel="innsikt">
                ${buildPlayerProfileClashHeaderHtml({
                    title: 'Spillerinnsikt',
                    icon: 'fa-magnifying-glass',
                    subtitle: 'Prestasjon, utvikling og observasjoner'
                })}
                <div class="player-profile-collapsible-content">
                    <p class="player-insight-note">Ikke nok data</p>
                </div>
            </section>
        `;
    }
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
    const seasonView = typeof window.getPlayerSeasonData === 'function'
        ? window.getPlayerSeasonData(player, yearFilter)
        : null;
    const profilePlayer = seasonView?.hasSeason
        ? {
            ...player,
            spillerLag: seasonView.spillerLag,
            draktnummer: seasonView.draktnummer,
            pos1: seasonView.pos1,
            pos2: seasonView.pos2,
            status: seasonView.status,
            tilknyttetFra: seasonView.tilknyttetFra,
            tilknyttetTil: seasonView.tilknyttetTil,
            utviklingsmoment: seasonView.utviklingsmoment
        }
        : player;
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
        ? window.getTeamFormMedian(profilePlayer.spillerLag)
        : 0;
    const formTone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(formComponents.total, profilePlayer.spillerLag)
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

    const jersey = profilePlayer.draktnummer ? String(profilePlayer.draktnummer) : '-';
    const posLabel = buildPlayerPositionLabel(profilePlayer);
    const foot = player.fot ? `${player.fot} fot` : 'Ukjent fot';
    const ageLabel = age != null && birthYear ? `${age} år (${birthYear})` : (birthYear || '-');
    const statusLabel = getPlayerDisplayStatus(profilePlayer);
    const statusTone = statusLabel === 'Aktiv'
        ? 'is-active'
        : statusLabel === 'Rekrutt'
            ? 'is-recruit'
            : 'is-muted';
    const injuryValue = injuryInfo.isInjured ? (injuryInfo.label || 'Skadet') : 'Frisk';
    const injuryTone = injuryInfo.isInjured ? 'is-hurt' : 'is-ok';
    const moment = getPlayerUtviklingsmoment(profilePlayer);
    const captainMark = player.isCaptain ? '<span class="player-profile-captain" title="Kaptein">⚓</span>' : '';
    const oppmote = stats
        ? (typeof window.formatOppmoteDisplay === 'function'
            ? window.formatOppmoteDisplay(stats)
            : `${stats.oppmotePct}%`)
        : '-';
    const form = formComponents.total > 0 ? `${formComponents.total}` : '-';
    const kampbidrag = stats && stats.kampbonus > 0 ? String(Math.round(stats.kampbonus * 10) / 10) : '-';
    const snittBors = stats && stats.snittBors > 0 ? (Math.round(Number(stats.snittBors) * 10) / 10).toFixed(1) : '-';
    const spilletid = formatPlayerProfileMinutesLabel(stats);
    const minuttandel = formatPlayerProfileMinutesShareLabel(stats);
    const kamper = stats ? String(stats.kamper) : '0';
    const mal = stats ? String(stats.mal) : '0';
    const assist = stats ? String(stats.assist) : '0';
    const expectedMalpoeng = stats && stats.expectedMalpoeng != null && (Number(stats.kamper) || 0) > 0
        ? (typeof window.formatExpectedMalpoengDisplay === 'function'
            ? window.formatExpectedMalpoengDisplay(stats)
            : `${Number(stats.expectedMalpoeng).toFixed(1)} · ${Number(stats.kamper) || 0} kamper`)
        : '-';
    const gule = stats
        ? formatPlayerProfileCardsSplitLabel(stats.guleSerie, stats.guleCup)
        : '0/0';
    const rode = stats
        ? formatPlayerProfileCardsSplitLabel(stats.rodeSerie, stats.rodeCup)
        : '0/0';
    const bb = stats ? String(stats.bb || 0) : '0';
    const totalScore = stats && stats.totalScore > 0 ? String(stats.totalScore) : '-';

    let totalRank = 0;
    const rankRows = getPlayerProfileStatRows(player, yearFilter);
    if (stats && rankRows.length) {
        const totalRows = rankRows.filter(stat =>
            (Number(stat.attendedMatches) || 0) > 0 || (Number(stat.oppmotePct) || 0) > 0
        );
        const playerScore = Number(stats.totalScore) || 0;
        const betterCount = totalRows.filter(stat => (Number(stat.totalScore) || 0) > playerScore).length;
        totalRank = betterCount + 1;
    }

    const rankOf = (column) => getPlayerProfileStatRank(player.navn, column, rankRows);
    const formRank = rankOf('kjemi');

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
                            ${buildRosterStatusBadge(getPlayerDisplayStatus(profilePlayer))}
                            ${buildRosterInjuryBadge(injuryInfo)}
                        </div>
                    </div>
                    <h1 class="player-profile-page-name">${escapeRosterHtml(player.navn)}${captainMark}</h1>
                    <p class="player-profile-page-subtitle">${escapeRosterHtml(posLabel)} · ${escapeRosterHtml(player.spillerLag || window.getPrimaryTeamName())}</p>
                    <div class="player-profile-page-form-row">
                        <span class="player-profile-form-chip ${formToneClass}" title="Form (nå): ${escapeRosterHtml(formComparison)}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}">
                            Form (nå) ${escapeRosterHtml(form)}/100
                        </span>
                        <span class="player-profile-form-note">${escapeRosterHtml(formComparison)}${teamMedian > 0 ? ` · median ${teamMedian}` : ''}</span>
                    </div>
                </div>
            </div>

            <div class="player-profile-shell-details relative z-10">
                <div class="player-profile-facts-sheet">
                    <dl class="player-profile-facts">
                        ${buildPlayerProfileFactHtml('Fot', foot)}
                        ${buildPlayerProfileFactHtml('Alder', ageLabel)}
                        ${buildPlayerProfileFactHtml('Tilknyttet', formatPlayerJoinedFromLabel(player))}
                    </dl>
                    <dl class="player-profile-facts player-profile-facts-state">
                        ${buildPlayerProfileFactHtml('Status', statusLabel, statusTone)}
                        ${buildPlayerProfileFactHtml('Skade', injuryValue, injuryTone)}
                    </dl>
                </div>

                <div class="player-profile-section">
                    <p class="player-profile-section-title">Historikk</p>
                    ${buildPlayerInjuryHistoryHtml(player)}
                </div>

                <div class="player-profile-section">
                    <p class="player-profile-section-title">Utviklingsmoment</p>
                    <p class="player-profile-note${moment ? '' : ' is-empty'}">${escapeRosterHtml(moment || 'Ikke satt')}</p>
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

        <div class="player-profile-year-bar">
            ${buildPlayerProfileYearFilterHtml(player)}
        </div>

        ${buildPlayerInsightHtml(player, yearFilter)}

        <section class="${playerProfilePanelClass('sesong', 'player-profile-season-card')}" data-profile-panel="sesong" aria-expanded="${isPlayerProfilePanelOpen('sesong') ? 'true' : 'false'}">
            <div class="player-profile-presence-topline">
                <div class="player-profile-presence-heading">
                    <span class="player-profile-presence-mark" aria-hidden="true"><i class="fa-solid fa-ranking-star"></i></span>
                    <h2 class="player-profile-panel-title">Sesong i tall</h2>
                </div>
            </div>
            <div class="player-profile-collapsible-content">
            <div class="player-profile-season-wrap">
                <table class="player-profile-season-table">
                    <thead>
                        <tr>
                            <th class="player-profile-season-icon" scope="col"><span class="sr-only">Ikon</span></th>
                            <th scope="col">Stat</th>
                            <th class="player-profile-season-value" scope="col">Verdi</th>
                            <th class="player-profile-season-rank" scope="col">Plass</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buildPlayerProfileSeasonRowHtml('Total score', totalScore, {
                            title: 'Rangert etter Total Score for sesongen',
                            rank: totalRank,
                            icon: 'fa-ranking-star'
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Form', form, {
                            title: 'Form nå',
                            rank: formRank,
                            icon: 'fa-heart-pulse'
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Kamper', kamper, {
                            rank: rankOf('kamper'),
                            ...getPlayerProfileStatChipVisual('kamper')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Mål', mal, {
                            rank: rankOf('mal'),
                            ...getPlayerProfileStatChipVisual('mal')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Assist', assist, {
                            rank: rankOf('assist'),
                            ...getPlayerProfileStatChipVisual('assist')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Expected målpoeng', expectedMalpoeng, {
                            title: 'Mål + assist per kamp på banen (vist som snitt / kamper). Hovedlisten krever minst 50 % kamper.',
                            rank: rankOf('expectedMalpoeng'),
                            ...getPlayerProfileStatChipVisual('expectedMalpoeng')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Gule kort', gule, {
                            title: 'Serie / Cup',
                            rank: rankOf('gule'),
                            ...getPlayerProfileStatChipVisual('gule')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Røde kort', rode, {
                            title: 'Serie / Cup',
                            rank: rankOf('rode'),
                            ...getPlayerProfileStatChipVisual('rode')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Børs', snittBors, {
                            rank: rankOf('snittBors'),
                            ...getPlayerProfileStatChipVisual('snittBors')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Kampbidrag', kampbidrag, {
                            rank: rankOf('kampbonus'),
                            ...getPlayerProfileStatChipVisual('kampbonus')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Oppmøte', oppmote, {
                            title: 'Treningsoppmøte: møtt / mulige økter med registrert oppmøte',
                            rank: rankOf('oppmotePct'),
                            ...getPlayerProfileStatChipVisual('oppmotePct')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Banens beste', bb, {
                            rank: rankOf('bb'),
                            ...getPlayerProfileStatChipVisual('bb')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Spilletid', spilletid, {
                            title: 'Forklarende statistikk — ikke del av Beste sesong eller Beste nå',
                            rank: rankOf('minutesTotal'),
                            ...getPlayerProfileStatChipVisual('minutesTotal')
                        })}
                        ${buildPlayerProfileSeasonRowHtml('Minuttandel', minuttandel, {
                            title: 'Forklarende statistikk — ikke del av Beste sesong eller Beste nå',
                            rank: rankOf('minutesSharePct'),
                            ...getPlayerProfileStatChipVisual('minutesSharePct')
                        })}
                    </tbody>
                </table>
            </div>
            </div>
        </section>

        <section class="${playerProfilePanelClass('posisjon')}" data-profile-panel="posisjon" aria-expanded="${isPlayerProfilePanelOpen('posisjon') ? 'true' : 'false'}">
            ${buildPlayerProfileClashHeaderHtml({
                title: 'Posisjon og linje',
                icon: 'fa-shirt',
                subtitle: 'Sortert etter form'
            })}
            <div class="player-profile-collapsible-content">
            ${buildPlayerProfilePositionStatsHtml(player, yearFilter)}
            </div>
        </section>

        ${buildPlayerProfileRadarHtml(player, yearFilter)}

        <section class="${playerProfilePanelClass('utvikling')}" data-profile-panel="utvikling" aria-expanded="${isPlayerProfilePanelOpen('utvikling') ? 'true' : 'false'}">
            ${buildPlayerProfileClashHeaderHtml({
                title: 'Utvikling',
                icon: 'fa-chart-line',
                subtitle: 'Spillerutvikling mot troppens utvikling. Nyeste kamp til høyre.'
            })}
            <div class="player-profile-collapsible-content">
            <div class="player-profile-chart-wrap">${trendHtml}</div>
            <div class="stats-chart-legend player-profile-chart-legend" aria-hidden="true">
                <span class="stats-chart-legend-item is-kampbidrag"><i></i> Spiller utvikling</span>
                <span class="stats-chart-legend-item is-team-median"><i></i> Lagsmedian</span>
            </div>
            </div>
        </section>

        <section class="${playerProfilePanelClass('kampforkamp')}" data-profile-panel="kampforkamp" aria-expanded="${isPlayerProfilePanelOpen('kampforkamp') ? 'true' : 'false'}">
            ${buildPlayerProfileClashHeaderHtml({
                title: 'Kamp for kamp',
                icon: 'fa-futbol'
            })}
            <div class="player-profile-collapsible-content">
            <div class="player-profile-history-wrap">${matchHistoryHtml}</div>
            </div>
        </section>

        <section class="${playerProfilePanelClass('trening')}" data-profile-panel="trening" aria-expanded="${isPlayerProfilePanelOpen('trening') ? 'true' : 'false'}">
            ${buildPlayerProfileClashHeaderHtml({
                title: 'Trening / oppmøte',
                icon: 'fa-user-check',
                subtitle: 'Siste aktiviteter spilleren kunne møtt på'
            })}
            <div class="player-profile-collapsible-content">
            ${buildPlayerProfileTrainingHtml(player)}
            </div>
        </section>
    `;
};

window.showPlayerProfile = function(playerId, options = {}) {
    if (!playerId) return;
    const player = (window.activePlayers || []).find(item => item.id === playerId);
    if (!player) return;

    window.activePlayerProfileId = playerId;
    if (options.yearFilter != null && options.yearFilter !== '') {
        window.playerProfileYearFilter = options.yearFilter;
    } else if (window.playerProfileYearFilter == null) {
        window.playerProfileYearFilter = typeof window.getStatsSpillerYearFilter === 'function'
            ? window.getStatsSpillerYearFilter()
            : new Date().getFullYear();
    }
    if (options.focus === 'innsikt' || options.focus === 'trening') {
        getPlayerProfilePanelState()[options.focus] = true;
    }

    window.renderPlayerProfilePage(playerId);

    const backTarget = options.backTarget
        || window.pendingPlayerProfileBackTab
        || (window.currentTab && window.currentTab !== 'spillerprofil' ? window.currentTab : 'tropp');
    window.pendingPlayerProfileBackTab = null;

    if (typeof window.switchTab === 'function') {
        window.switchTab('spillerprofil', { backTarget });
    }
    if (!options.focus) return;
    const focusSelector = options.focus === 'trening'
        ? '[data-profile-panel="trening"]'
        : options.focus === 'innsikt'
            ? '[data-profile-panel="innsikt"]'
            : options.focus === 'skade'
                ? '.player-profile-facts-state'
                : '.player-profile-shell';
    requestAnimationFrame(() => {
        document.querySelector(`#spillerprofil-content ${focusSelector}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    setRosterPlanCreateLock(false);

    if (editPlayerId) {
        const pObj = (window.activePlayers || []).find(p => p.id === editPlayerId);
        if (pObj) {
            document.getElementById('playerFormTitle').innerText = 'Rediger spiller';
            document.getElementById('editPlayerId').value = pObj.id;
            document.getElementById('playerNameInput').value = pObj.navn;
            document.getElementById('playerJerseyInput').value = pObj.draktnummer || '';
            document.getElementById('playerBirthYearInput').value = pObj.fodselsaar;
            const joinedFromInput = document.getElementById('playerJoinedFromInput');
            if (joinedFromInput) {
                joinedFromInput.value = typeof window.getPlayerJoinedFromDate === 'function'
                    ? window.getPlayerJoinedFromDate(pObj)
                    : (pObj.tilknyttetFra || '');
            }
            const leftToInput = document.getElementById('playerLeftToInput');
            if (leftToInput) {
                leftToInput.value = typeof window.getPlayerLeftToDate === 'function'
                    ? window.getPlayerLeftToDate(pObj)
                    : (pObj.tilknyttetTil || '');
            }
            // Migrate legacy Passiv + sluttdato into Utregistrert in the form.
            document.getElementById('playerStatusInput').value = getPlayerDisplayStatus(pObj) === 'Utregistrert'
                ? 'Utregistrert'
                : (pObj.status || 'Aktiv');
            document.getElementById('playerTeamInput').value = pObj.spillerLag || window.getPrimaryTeamName();
            document.getElementById('playerPos1Input').value = pObj.pos1;
            document.getElementById('playerPos2Input').value = pObj.pos2 || '-';
            document.getElementById('playerFootInput').value = pObj.fot || 'Høyre';
            document.getElementById('playerSkadeStatusInput').value = pObj.skadeStatus || 'frisk';
            document.getElementById('playerSkadeNotatInput').value = pObj.skadeNotat || '';
            document.getElementById('playerSkadeFraDatoInput').value = pObj.skadeFraDato || '';
            document.getElementById('playerSkadeTilDatoInput').value = pObj.skadeTilDato || '';
            const momentInput = document.getElementById('playerUtviklingsmomentInput');
            if (momentInput) momentInput.value = getPlayerUtviklingsmoment(pObj);
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
        const leftToInput = document.getElementById('playerLeftToInput');
        if (leftToInput) leftToInput.value = '';
        document.getElementById('playerSkadeStatusInput').value = 'frisk';
        document.getElementById('playerSkadeNotatInput').value = '';
        document.getElementById('playerSkadeFraDatoInput').value = '';
        document.getElementById('playerSkadeTilDatoInput').value = '';
        const momentInput = document.getElementById('playerUtviklingsmomentInput');
        if (momentInput) momentInput.value = '';
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
    setRosterPlanCreateLock(false);
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
    let tilknyttetFra = (document.getElementById('playerJoinedFromInput')?.value || '').trim();
    let tilknyttetTil = (document.getElementById('playerLeftToInput')?.value || '').trim();
    let status = document.getElementById('playerStatusInput').value;
    const creatingPlanPlayer = !existingPlayerId && window._rosterPlanNewPlayer;
    // Utregistrert always requires tilknyttet til. Setting the date forces Utregistrert.
    // A player created from Troppsplan stays Passiv until the next squad is created.
    if (creatingPlanPlayer) {
        status = 'Passiv';
        tilknyttetTil = '';
    } else if (tilknyttetTil) {
        status = 'Utregistrert';
    } else if (status === 'Utregistrert') {
        tilknyttetTil = getTodayDateString();
        const leftToInput = document.getElementById('playerLeftToInput');
        if (leftToInput) leftToInput.value = tilknyttetTil;
    } else {
        tilknyttetTil = '';
    }
    const statusInput = document.getElementById('playerStatusInput');
    if (statusInput) statusInput.value = status;
    const pos1 = document.getElementById('playerPos1Input').value.trim();
    const pos2 = document.getElementById('playerPos2Input').value.trim();
    const fot = document.getElementById('playerFootInput').value.trim();
    const skadeNotat = isSavingInjury ? document.getElementById('playerSkadeNotatInput').value.trim() : '';
    const utviklingsmoment = (document.getElementById('playerUtviklingsmomentInput')?.value || '').trim().slice(0, 160);

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
        tilknyttetTil,
        spillerLag: playerTeam,
        pos1,
        pos2,
        fot,
        utviklingsmoment,
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
            tilknyttetTil,
            spillerLag: playerTeam,
            pos1,
            pos2,
            fot,
            utviklingsmoment
        };
    }

    const oldName = existingPlayer?.navn;
    if (!existingPlayerId && window._rosterPlanNewPlayer) {
        playerData.seasonPlans = {
            ...(playerData.seasonPlans || {}),
            [String(window.ROSTER_PLAN_YEAR)]: {
                status: 'Ny spiller',
                note: '',
                updatedAt: new Date().toISOString()
            }
        };
    }

    try {
        await window.savePlayerToDatabase(playerData);
        window._rosterPlanNewPlayer = false;

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
