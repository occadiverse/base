window.normalizeAttendanceValue = function(value) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
};

window.GUEST_PLAYER_REF_PREFIX = 'guest:';

window.isGuestPlayerRef = function(ref) {
    return typeof ref === 'string' && ref.startsWith(window.GUEST_PLAYER_REF_PREFIX);
};

window.getGuestPlayerNumber = function(ref) {
    if (!window.isGuestPlayerRef(ref)) return null;
    const number = Number(ref.slice(window.GUEST_PLAYER_REF_PREFIX.length));
    return Number.isInteger(number) && number > 0 ? number : null;
};

window.buildGuestPlayerRef = function(number) {
    return `${window.GUEST_PLAYER_REF_PREFIX}${number}`;
};

window.getGuestPlayerDisplayName = function(refOrNumber) {
    const number = typeof refOrNumber === 'number'
        ? refOrNumber
        : window.getGuestPlayerNumber(refOrNumber);
    return number ? `Gjest ${number}` : 'Gjest';
};

window.createGuestPlayer = function(number) {
    const id = window.buildGuestPlayerRef(number);
    return {
        id,
        navn: window.getGuestPlayerDisplayName(number),
        pos1: 'Gjest',
        isGuest: true,
        status: 'Aktiv'
    };
};

window.getNextGuestPlayerNumber = function(attendance, container) {
    let max = 0;
    const consider = (ref) => {
        const number = window.getGuestPlayerNumber(ref);
        if (number && number > max) max = number;
    };

    Object.keys(attendance || {}).forEach(consider);
    if (container) {
        container.querySelectorAll('[data-player-id]').forEach((el) => {
            consider(el.getAttribute('data-player-id'));
        });
    }
    return max + 1;
};

window.hasRegisteredAttendance = function(attendance) {
    return attendance !== undefined && attendance !== null;
};

window.ensurePlayerId = function(player) {
    if (!player || typeof player !== 'object') return player;
    if (window.isValidPlayerRefKey(player.id)) return player;
    return { ...player, id: crypto.randomUUID() };
};

window.isValidPlayerRefKey = function(ref) {
    return Boolean(ref && ref !== 'undefined' && ref !== 'null' && String(ref).trim() !== '');
};

window.findPlayerByRef = function(ref) {
    if (!window.isValidPlayerRefKey(ref)) return null;
    if (window.isGuestPlayerRef(ref)) {
        const number = window.getGuestPlayerNumber(ref);
        return number ? window.createGuestPlayer(number) : null;
    }
    const players = window.activePlayers || [];
    const byId = players.find(p => p.id === ref);
    if (byId) return byId;
    return players.find(p => p.navn === ref) || null;
};

window.getPlayerStorageKey = function(playerOrRef) {
    if (playerOrRef === 'undefined' || playerOrRef === 'null' || playerOrRef === '') {
        playerOrRef = null;
    }

    const player = typeof playerOrRef === 'object' && playerOrRef !== null && playerOrRef.navn
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    const resolvedId = player?.id;
    if (window.isValidPlayerRefKey(resolvedId)) return resolvedId;

    return null;
};

window.getPlayerNameFromRef = function(ref) {
    const player = window.findPlayerByRef(ref);
    return player?.navn || ref || '';
};

window.playerRefMatches = function(ref, player) {
    if (!ref || !player) return false;
    if (player.id && ref === player.id) return true;
    if (player.navn && ref === player.navn) return true;
    return false;
};

window.getAttendanceForPlayer = function(attendance, playerOrRef) {
    if (!attendance) return undefined;
    const player = typeof playerOrRef === 'object' && playerOrRef !== null
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    if (player?.id && attendance[player.id] !== undefined) {
        return window.normalizeAttendanceValue(attendance[player.id]);
    }
    if (player?.navn && attendance[player.navn] !== undefined) {
        return window.normalizeAttendanceValue(attendance[player.navn]);
    }
    if (typeof playerOrRef === 'string' && attendance[playerOrRef] !== undefined) {
        return window.normalizeAttendanceValue(attendance[playerOrRef]);
    }
    return undefined;
};

window.isPlayerAttending = function(attendance, playerOrRef) {
    return window.getAttendanceForPlayer(attendance, playerOrRef) === true;
};

window.isPlayerEligibleForMatch = function(attendance, playerOrRef) {
    if (!window.hasRegisteredAttendance(attendance)) return true;
    return window.isPlayerAttending(attendance, playerOrRef);
};

window.normalizeActivityDateKey = function(value) {
    if (!value) return '';
    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

window.getPlayerJoinedFromDate = function(player) {
    if (!player || player.isGuest) return '';
    if (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id)) return '';
    return window.normalizeActivityDateKey(player.tilknyttetFra);
};

window.getPlayerLeftToDate = function(player) {
    if (!player || player.isGuest) return '';
    if (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id)) return '';
    return window.normalizeActivityDateKey(player.tilknyttetTil);
};

// Utregistrert, or legacy Passiv + sluttdato (before status migration is saved).
window.isPlayerDeregistered = function(player) {
    if (!player) return false;
    if (player.status === 'Utregistrert') return true;
    return player.status === 'Passiv' && Boolean(window.getPlayerLeftToDate(player));
};

// Current tropp pool: Aktiv/Rekrutt (and any other non-pause/non-left status).
window.isPlayerInCurrentSquadPool = function(player) {
    if (!player) return false;
    if (player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
        return false;
    }
    if (player.status === 'Passiv' || player.status === 'Utregistrert') return false;
    return true;
};

window.isPlayerOnRosterForDate = function(player, dateValue) {
    if (!player) return false;
    if (player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
        return true;
    }
    const dateKey = window.normalizeActivityDateKey(dateValue);
    if (!dateKey) return true;
    const joinedFrom = window.getPlayerJoinedFromDate(player);
    if (joinedFrom && dateKey < joinedFrom) return false;
    const leftTo = window.getPlayerLeftToDate(player);
    if (leftTo && dateKey > leftTo) return false;
    return true;
};

window.isPlayerOnRosterForActivity = function(player, activity) {
    return window.isPlayerOnRosterForDate(player, activity?.date);
};

// Activity-dated lists (oppmøte, kamptropp, historikk): include players who belonged
// that day. Passiv (pause) stays hidden. Utregistrert still appears inside affiliation window.
window.isPlayerListedForActivity = function(player, activity) {
    if (!player) return false;
    if (player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
        return true;
    }
    if (!window.isPlayerOnRosterForActivity(player, activity)) return false;
    if (window.isPlayerDeregistered(player)) return true;
    if (player.status === 'Passiv') return false;
    return true;
};

window.PLAYER_SEASON_FIELDS = [
    'spillerLag',
    'draktnummer',
    'pos1',
    'pos2',
    'status',
    'tilknyttetFra',
    'tilknyttetTil',
    'utviklingsmoment'
];

window.resolvePlayerSeasonYear = function(year) {
    if (year == null || year === '' || year === 'alle') return null;
    const parsed = Number(year);
    return Number.isInteger(parsed) && parsed >= 1990 && parsed <= 2100 ? parsed : null;
};

const ACTIVE_SEASON_STORAGE_KEY = 'bsk_local_active_season';

window.readStoredActiveSeasonYear = function() {
    try {
        return window.resolvePlayerSeasonYear(window.localStorage.getItem(ACTIVE_SEASON_STORAGE_KEY));
    } catch (error) {
        return null;
    }
};

window._activeSeasonYear = window.readStoredActiveSeasonYear();

window.applyActiveSeasonYear = function(year) {
    const parsed = window.resolvePlayerSeasonYear(year);
    if (parsed == null) return null;
    window._activeSeasonYear = parsed;
    try {
        window.localStorage.setItem(ACTIVE_SEASON_STORAGE_KEY, String(parsed));
    } catch (error) {
        console.warn('Kunne ikke mellomlagre aktiv sesong:', error);
    }
    return parsed;
};

window.getActiveSeasonYear = function() {
    const explicit = window.resolvePlayerSeasonYear(window._activeSeasonYear);
    if (explicit != null) return explicit;
    const years = typeof window.getStatsKampYearOptions === 'function'
        ? window.getStatsKampYearOptions()
        : [];
    if (years.length) return years[0];
    return new Date().getFullYear();
};

window.getActivitySeasonYear = function(activity) {
    if (activity && typeof window.getMatchStatsYear === 'function') {
        const fromHelper = window.getMatchStatsYear(activity);
        if (fromHelper) return fromHelper;
    }
    const prefix = Number(String(activity?.date || '').slice(0, 4));
    if (Number.isInteger(prefix) && prefix >= 1990 && prefix <= 2100) return prefix;
    return window.getActiveSeasonYear();
};

window.getPlayerSeasonRecord = function(player, year) {
    const seasonYear = window.resolvePlayerSeasonYear(year);
    if (!player || seasonYear == null || !player.seasons || typeof player.seasons !== 'object') return null;
    const record = player.seasons[seasonYear] || player.seasons[String(seasonYear)];
    return record && typeof record === 'object' && !Array.isArray(record) ? record : null;
};

window.getPlayerSeasonData = function(player, year) {
    const record = window.getPlayerSeasonRecord(player, year);
    const pick = (field) => {
        if (record && Object.prototype.hasOwnProperty.call(record, field)) return record[field];
        return player?.[field];
    };
    const from = window.normalizeActivityDateKey(pick('tilknyttetFra'));
    const to = window.normalizeActivityDateKey(pick('tilknyttetTil'));
    return {
        year: window.resolvePlayerSeasonYear(year),
        hasSeason: Boolean(record),
        spillerLag: String(pick('spillerLag') || ''),
        draktnummer: pick('draktnummer') ?? '',
        pos1: String(pick('pos1') || ''),
        pos2: String(pick('pos2') || ''),
        status: String(pick('status') || ''),
        tilknyttetFra: from,
        tilknyttetTil: to,
        utviklingsmoment: String(pick('utviklingsmoment') || '')
    };
};

window.getPlayerTeamForYear = function(player, year) {
    return window.getPlayerSeasonData(player, year).spillerLag;
};

window.getPlayerRosterPeriodForYear = function(player, year) {
    const data = window.getPlayerSeasonData(player, year);
    return { from: data.tilknyttetFra, to: data.tilknyttetTil, hasSeason: data.hasSeason };
};

window.isPlayerOnRosterForSeasonDate = function(player, dateValue, year) {
    if (!window.getPlayerSeasonRecord(player, year)) return window.isPlayerOnRosterForDate(player, dateValue);
    const dateKey = window.normalizeActivityDateKey(dateValue);
    if (!dateKey) return true;
    const period = window.getPlayerRosterPeriodForYear(player, year);
    if (period.from && dateKey < period.from) return false;
    if (period.to && dateKey > period.to) return false;
    return true;
};

window.playerHasSeasonActivity = function(player, year) {
    const seasonYear = window.resolvePlayerSeasonYear(year);
    if (!player || player.isGuest || seasonYear == null) return false;
    const team = window.getPlayerTeamForYear(player, seasonYear);
    const inYear = (item) => {
        if (!item) return false;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(item)) return false;
        const itemYear = typeof window.getMatchStatsYear === 'function'
            ? window.getMatchStatsYear(item)
            : (item.date ? new Date(item.date).getFullYear() : null);
        if (itemYear !== seasonYear) return false;
        const itemTeam = item.matchGroup || item.team || '';
        if (team && itemTeam && itemTeam !== team) return false;
        if (typeof window.isPlayerAttending === 'function' && window.isPlayerAttending(item.attendance, player)) return true;
        const maps = ['ratings', 'scorers', 'assists', 'minutesPlayed'];
        for (let i = 0; i < maps.length; i += 1) {
            const map = item[maps[i]];
            if (!map || typeof map !== 'object') continue;
            const value = map[player.id] ?? (player.navn ? map[player.navn] : undefined);
            if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false) return true;
        }
        if (typeof window.playerRefListIncludes === 'function') {
            if (window.playerRefListIncludes(item.guleKort, player)) return true;
            if (window.playerRefListIncludes(item.rodeKort, player)) return true;
        }
        if (typeof window.motmMatchesPlayer === 'function' && window.motmMatchesPlayer(item.motm, player)) return true;
        return false;
    };
    if ((window.activeMatches || []).some(inYear)) return true;
    return (window.activeEvents || []).some(inYear);
};

window.playerBelongsToSeason = function(player, year) {
    const seasonYear = window.resolvePlayerSeasonYear(year);
    if (!player || seasonYear == null) return window.isPlayerInCurrentSquadPool(player);
    if (window.getPlayerSeasonRecord(player, seasonYear)) return true;
    return window.playerHasSeasonActivity(player, seasonYear);
};

window.isPlayerEligibleForStatsYear = function(player, year) {
    const resolved = year !== undefined
        ? year
        : (typeof window.getStatsSpillerYearFilter === 'function' ? window.getStatsSpillerYearFilter() : null);
    if (window.resolvePlayerSeasonYear(resolved) == null) return window.isPlayerInCurrentSquadPool(player);
    return window.playerBelongsToSeason(player, resolved);
};

const PLAYER_SEASON_2026_SQUAD = {
    include: [
        { id: '964959ce-504e-4b61-baa3-8c70b1bdfc64', navn: 'Ty Grønlie' },
        { id: '75aa7ade-641a-4bd8-bd9d-260d909dd915', navn: 'Rafael Nordseth' }
    ],
    exclude: [
        { id: '8208f87f-f7fd-4302-8628-b001e5b6973f', navn: 'Falk Thomassen' },
        { id: '4303b6e5-ac43-4852-b709-ed7ca7e2b42d', navn: 'Magnus Wolff' },
        { id: 'f47b4338-a3e0-4e4c-9abf-8ee782b6990d', navn: 'Simen Blikeng' }
    ]
};

const playerMatchesSeasonSquadEntry = function(player, entry) {
    if (!player || !entry) return false;
    if (entry.id && player.id === entry.id) return true;
    return String(player.navn || '').trim().toLocaleLowerCase('nb') === String(entry.navn || '').trim().toLocaleLowerCase('nb');
};

const playerSeason2026SquadDecision = function(player, seasonYear) {
    if (seasonYear !== 2026) return null;
    if (PLAYER_SEASON_2026_SQUAD.exclude.some(entry => playerMatchesSeasonSquadEntry(player, entry))) return 'exclude';
    if (PLAYER_SEASON_2026_SQUAD.include.some(entry => playerMatchesSeasonSquadEntry(player, entry))) return 'include';
    return null;
};

window.planPlayerSeasonSnapshot = function(year = 2026) {
    const seasonYear = window.resolvePlayerSeasonYear(year);
    const plan = {
        year: seasonYear,
        write: [],
        existing: [],
        excluded: [],
        skipped: [],
        review: []
    };
    if (seasonYear == null) return plan;
    const start = `${seasonYear}-01-01`;
    const end = `${seasonYear}-12-31`;
    (window.activePlayers || []).forEach(player => {
        if (!player || player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
            return;
        }
        const squadDecision = playerSeason2026SquadDecision(player, seasonYear);
        if (squadDecision === 'exclude') {
            plan.excluded.push({
                id: player.id,
                navn: player.navn || '',
                reason: 'Bevisst ekskludert fra 2026. Tilhørte ikke troppen.'
            });
            return;
        }
        if (window.getPlayerSeasonRecord(player, seasonYear)) {
            plan.existing.push({ id: player.id, navn: player.navn || '' });
            return;
        }
        const from = window.normalizeActivityDateKey(player.tilknyttetFra);
        const to = window.normalizeActivityDateKey(player.tilknyttetTil);
        const overlaps = (!from || from <= end) && (!to || to >= start);
        const activity = window.playerHasSeasonActivity(player, seasonYear);
        if (squadDecision !== 'include' && !overlaps && !activity) {
            plan.skipped.push({ id: player.id, navn: player.navn || '', reason: 'Ingen tilknytning eller aktivitet i året' });
            return;
        }
        if (squadDecision !== 'include' && !player.spillerLag && !activity) {
            plan.skipped.push({ id: player.id, navn: player.navn || '', reason: 'Mangler lag og har ingen aktivitet i året' });
            return;
        }
        const season = {};
        window.PLAYER_SEASON_FIELDS.forEach(field => {
            if (field === 'tilknyttetFra') season[field] = from;
            else if (field === 'tilknyttetTil') season[field] = to;
            else season[field] = player[field] ?? '';
        });
        const notes = [];
        if (!activity && !from && !to) notes.push('Ingen tilknytningsdato og ingen registrert aktivitet. Snapshot bruker dagens globale felt.');
        if (!player.spillerLag) notes.push('Mangler lag.');
        if (player.draktnummer === '' || player.draktnummer == null) notes.push('Mangler draktnummer. Ingen verdi er antatt.');
        if (!player.pos1 || player.pos1 === '-') notes.push('Mangler hovedposisjon. Ingen verdi er antatt.');
        if (player.status === 'Passiv' || player.status === 'Utregistrert') {
            notes.push(`Status er ${player.status} nå. Snapshot fryser denne statusen for ${seasonYear}.`);
        }
        plan.write.push({ id: player.id, navn: player.navn || '', season, notes });
        if (notes.length) plan.review.push({ id: player.id, navn: player.navn || '', notes });
    });
    return plan;
};

window.previewPlayerSeasonSnapshot = function(year = 2026) {
    return window.planPlayerSeasonSnapshot(year);
};

const SEASON_ROSTER_PLAN_INCLUDE = ['Fortsetter', 'Ny spiller'];

const readSeasonRosterPlanStatus = function(player, targetYear) {
    const plans = player?.seasonPlans;
    if (!plans || typeof plans !== 'object' || Array.isArray(plans)) return '';
    const plan = plans[targetYear] || plans[String(targetYear)];
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return '';
    return String(plan.status || '');
};

const buildNextSeasonRecord = function(player, sourceYear) {
    const source = window.getPlayerSeasonRecord(player, sourceYear);
    const season = {};
    window.PLAYER_SEASON_FIELDS.forEach(field => {
        season[field] = source ? (source[field] ?? '') : (player?.[field] ?? '');
    });
    if (!source) season.status = 'Aktiv';
    season.tilknyttetTil = '';
    return season;
};

window.previewCreateSeasonRoster = function(sourceYear, targetYear, players) {
    const source = window.resolvePlayerSeasonYear(sourceYear);
    const target = window.resolvePlayerSeasonYear(targetYear);
    const plan = {
        sourceYear: source,
        targetYear: target,
        antall: {
            fortsetter: 0,
            nySpiller: 0,
            uavklart: 0,
            slutter: 0,
            eksistererAllerede: 0,
            skalSkrives: 0
        },
        write: [],
        existing: [],
        excluded: []
    };
    if (source == null || target == null || target <= source) return plan;
    const list = Array.isArray(players) ? players : (window.activePlayers || []);
    list.forEach(player => {
        if (!player || player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
            return;
        }
        const hasSource = Boolean(window.getPlayerSeasonRecord(player, source));
        const explicit = readSeasonRosterPlanStatus(player, target);
        if (!hasSource && !explicit) return;
        const status = explicit || 'Uavklart';
        if (status === 'Fortsetter') plan.antall.fortsetter += 1;
        else if (status === 'Ny spiller') plan.antall.nySpiller += 1;
        else if (status === 'Slutter') plan.antall.slutter += 1;
        else if (status === 'Uavklart') plan.antall.uavklart += 1;
        const entry = {
            id: player.id,
            navn: player.navn || '',
            status,
            grunnlag: hasSource ? 'sesong' : 'global'
        };
        if (!SEASON_ROSTER_PLAN_INCLUDE.includes(status)) {
            plan.excluded.push({
                ...entry,
                reason: status === 'Slutter' ? 'Slutter tas ikke med.' : 'Uavklart tas ikke med.'
            });
            return;
        }
        if (window.getPlayerSeasonRecord(player, target)) {
            plan.antall.eksistererAllerede += 1;
            plan.existing.push(entry);
            return;
        }
        plan.antall.skalSkrives += 1;
        plan.write.push({ ...entry, season: buildNextSeasonRecord(player, source) });
    });
    return plan;
};

window.applyCreateSeasonRoster = function(players, sourceYear, targetYear) {
    const list = Array.isArray(players) ? players : [];
    const plan = window.previewCreateSeasonRoster(sourceYear, targetYear, list);
    const seasonById = new Map(plan.write.map(item => [item.id, item.season]));
    const next = list.map(player => {
        const season = seasonById.get(player.id);
        if (!season || window.getPlayerSeasonRecord(player, plan.targetYear)) return player;
        const sourceBefore = JSON.stringify(window.getPlayerSeasonRecord(player, plan.sourceYear) ?? null);
        const updated = {
            ...player,
            seasons: { ...(player.seasons || {}), [String(plan.targetYear)]: season }
        };
        const sourceAfter = JSON.stringify(window.getPlayerSeasonRecord(updated, plan.sourceYear) ?? null);
        if (sourceBefore !== sourceAfter) return player;
        if (updated.status !== player.status || updated.spillerLag !== player.spillerLag) return player;
        if (updated.draktnummer !== player.draktnummer || updated.pos1 !== player.pos1 || updated.pos2 !== player.pos2) return player;
        return updated;
    });
    return { plan, players: next };
};

const seasonControlItemYear = function(item) {
    if (typeof window.getMatchStatsYear === 'function') return window.getMatchStatsYear(item);
    const key = window.normalizeActivityDateKey(item?.date);
    const parsed = Number(String(key || '').slice(0, 4));
    return Number.isInteger(parsed) ? parsed : null;
};

const seasonControlPlayerInvolved = function(player, item) {
    if (!player || !item) return false;
    if (typeof window.isPlayerAttending === 'function' && window.isPlayerAttending(item.attendance, player)) return true;
    const maps = ['ratings', 'scorers', 'assists', 'minutesPlayed'];
    for (let i = 0; i < maps.length; i += 1) {
        const map = item[maps[i]];
        if (!map || typeof map !== 'object') continue;
        const value = map[player.id] ?? (player.navn ? map[player.navn] : undefined);
        if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false) return true;
    }
    if (typeof window.playerRefListIncludes === 'function') {
        if (window.playerRefListIncludes(item.guleKort, player)) return true;
        if (window.playerRefListIncludes(item.rodeKort, player)) return true;
    }
    if (typeof window.motmMatchesPlayer === 'function' && window.motmMatchesPlayer(item.motm, player)) return true;
    return false;
};

const inspectPlayerSeasonActivity = function(player, seasonYear) {
    const matches = [];
    const positionCounts = new Map();
    let otherActivity = false;
    const inYear = (item) => {
        if (!item) return false;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(item)) return false;
        return seasonControlItemYear(item) === seasonYear;
    };
    (window.activeMatches || []).forEach(match => {
        if (!inYear(match) || !seasonControlPlayerInvolved(player, match)) return;
        if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) {
            otherActivity = true;
            return;
        }
        matches.push(match);
        const posId = typeof window.getPlayerMatchPlayedPositionId === 'function'
            ? window.getPlayerMatchPlayedPositionId(match, player)
            : '';
        if (!posId) return;
        const label = typeof window.getMatchGamePlanPositionLabel === 'function'
            ? window.getMatchGamePlanPositionLabel(posId)
            : posId;
        positionCounts.set(label, (positionCounts.get(label) || 0) + 1);
    });
    (window.activeEvents || []).forEach(event => {
        if (inYear(event) && seasonControlPlayerInvolved(player, event)) otherActivity = true;
    });
    matches.sort((a, b) => String(window.normalizeActivityDateKey(a.date)).localeCompare(String(window.normalizeActivityDateKey(b.date))));
    const grupper = {};
    matches.forEach(match => {
        const team = match.matchGroup || '(uten lag)';
        grupper[team] = (grupper[team] || 0) + 1;
    });
    const posisjoner = [...positionCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb'))
        .map(([label, count]) => `${label} ${count}`);
    return {
        kamper: matches.length,
        forsteKamp: matches.length ? window.normalizeActivityDateKey(matches[0].date) : '',
        sisteKamp: matches.length ? window.normalizeActivityDateKey(matches[matches.length - 1].date) : '',
        grupper,
        posisjoner,
        aktivitet: matches.length > 0 || otherActivity
    };
};

const seasonValueText = function(value) {
    return value == null || value === '' ? 'tomt' : String(value);
};

window.reportPlayerSeasonSnapshot = function(year = 2026) {
    const plan = window.planPlayerSeasonSnapshot(year);
    const seasonYear = plan.year;
    const byId = new Map((window.activePlayers || []).map(player => [player.id, player]));
    const rows = [];
    const addRow = (player, season, kilde) => {
        const evidence = seasonYear == null
            ? { kamper: 0, forsteKamp: '', sisteKamp: '', grupper: {}, posisjoner: [], aktivitet: false }
            : inspectPlayerSeasonActivity(player, seasonYear);
        const mangler = [];
        const kontroller = [];
        const lag = season.spillerLag || '';
        const pos1 = season.pos1 || '';
        const status = season.status || '';
        if (season.draktnummer == null || season.draktnummer === '') {
            mangler.push('Draktnummer mangler. Snapshot lagrer tomt felt.');
        }
        if (!season.pos2 || season.pos2 === '-') mangler.push('pos2 mangler.');
        if (!pos1 || pos1 === '-') {
            if (evidence.posisjoner.length) {
                kontroller.push(`Hovedposisjon mangler. Registrerte kampposisjoner: ${evidence.posisjoner.join(', ')}.`);
            } else {
                mangler.push('Hovedposisjon mangler. Ingen kampposisjon er registrert.');
            }
        }
        if (!evidence.aktivitet) {
            kontroller.push('Mangler historisk grunnlag. Ingen registrert 2026-aktivitet, men snapshot vil fryse dagens globale felt.');
        }
        if (evidence.kamper > 0 && !lag) {
            kontroller.push(`Spiller har ${evidence.kamper} kamper i ${seasonYear}, men mangler spillerLag.`);
        }
        Object.entries(evidence.grupper).forEach(([team, count]) => {
            if (team !== lag) {
                kontroller.push(`Snapshotlag = ${lag || 'tomt'}, men ${count} kamper er registrert på ${team}.`);
            }
        });
        if (evidence.forsteKamp && season.tilknyttetFra && season.tilknyttetFra > evidence.forsteKamp) {
            kontroller.push(`tilknyttetFra ${season.tilknyttetFra} ligger etter første 2026-kamp ${evidence.forsteKamp}.`);
        }
        if (evidence.sisteKamp && season.tilknyttetTil && season.tilknyttetTil < evidence.sisteKamp) {
            kontroller.push(`tilknyttetTil ${season.tilknyttetTil} ligger før siste 2026-kamp ${evidence.sisteKamp}.`);
        }
        const unusualStatus = status === 'Passiv' || status === 'Utregistrert';
        const manyMatches = evidence.kamper >= 5;
        if (unusualStatus) {
            kontroller.push(evidence.kamper > 0
                ? `2026-status bør kontrolleres. Dagens status er ${status}, og spilleren har ${evidence.kamper} kamper i ${seasonYear}.`
                : `2026-status bør kontrolleres. Dagens status er ${status}, uten registrerte 2026-kamper.`);
        } else if (status === 'Rekrutt' && manyMatches) {
            kontroller.push(`2026-status bør kontrolleres. Dagens status er Rekrutt, og spilleren har ${evidence.kamper} kamper i ${seasonYear}.`);
        } else if (status && status !== 'Aktiv' && status !== 'Rekrutt' && evidence.kamper > 0) {
            kontroller.push(`2026-status bør kontrolleres. Dagens status er ${status}, og spilleren har ${evidence.kamper} kamper i ${seasonYear}.`);
        }
        const klasse = kontroller.length ? 'kontroller' : (mangler.length ? 'mangler' : 'klar');
        rows.push({
            id: player.id,
            navn: player.navn || '',
            kilde,
            spillerLag: lag,
            draktnummer: season.draktnummer ?? '',
            draktnummerTekst: `Snapshot vil lagre ${seasonValueText(season.draktnummer)}`,
            pos1,
            pos2: season.pos2 || '',
            status,
            tilknyttetFra: season.tilknyttetFra || '',
            tilknyttetTil: season.tilknyttetTil || '',
            utviklingsmoment: season.utviklingsmoment || '',
            kamper: evidence.kamper,
            aktivitet: evidence.aktivitet,
            forsteKamp: evidence.forsteKamp,
            sisteKamp: evidence.sisteKamp,
            lagFordeling: evidence.grupper,
            kampPosisjoner: evidence.posisjoner,
            mangler,
            kontroller,
            klasse
        });
    };
    (plan.write || []).forEach(item => {
        const player = byId.get(item.id);
        if (player) addRow(player, item.season, 'planlagt');
    });
    (plan.existing || []).forEach(item => {
        const player = byId.get(item.id);
        const stored = player ? window.getPlayerSeasonRecord(player, seasonYear) : null;
        if (player && stored) addRow(player, stored, 'lagret');
    });
    rows.sort((a, b) => {
        const order = { kontroller: 0, mangler: 1, klar: 2 };
        return (order[a.klasse] - order[b.klasse]) || a.navn.localeCompare(b.navn, 'nb');
    });
    const oppsummering = {
        spillere: (window.activePlayers || []).filter(player => player && !player.isGuest && !(typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))).length,
        klare: rows.filter(row => row.klasse === 'klar').length,
        manglerInformasjon: rows.filter(row => row.klasse === 'mangler').length,
        borKontrolleres: rows.filter(row => row.klasse === 'kontroller').length,
        eksisterende: plan.existing.length,
        planlagtSkrevet: plan.write.length,
        hoppetOver: plan.skipped.length
    };
    const linje = (row) => {
        const flags = [...row.kontroller, ...row.mangler].map(note => `  - ${note}`).join('\n');
        return [
            `${row.navn} | ${row.id} | ${row.spillerLag || 'tomt lag'} | ${row.draktnummerTekst} | pos1 ${row.pos1 || 'tom'} | pos2 ${row.pos2 || 'tom'} | ${row.status || 'tom status'} | fra ${row.tilknyttetFra || 'tom'} | til ${row.tilknyttetTil || 'tom'} | moment ${row.utviklingsmoment || 'tomt'} | ${row.kamper} kamper | aktivitet ${row.aktivitet ? 'ja' : 'nei'}`,
            flags
        ].filter(Boolean).join('\n');
    };
    const tekst = [
        `${seasonYear} snapshot-kontroll`,
        '',
        `${oppsummering.spillere} spillere totalt`,
        `${oppsummering.klare} klare`,
        `${oppsummering.manglerInformasjon} mangler ikke-kritisk informasjon`,
        `${oppsummering.borKontrolleres} bør kontrolleres`,
        `${oppsummering.eksisterende} eksisterende snapshots`,
        `${oppsummering.planlagtSkrevet} planlagt skrevet`,
        oppsummering.hoppetOver ? `${oppsummering.hoppetOver} hoppet over` : '',
        '',
        ...rows.map(linje)
    ].filter(line => line !== '').join('\n');
    return { year: seasonYear, oppsummering, spillere: rows, tekst };
};

window.verifyPlayerSeasonSnapshot = function(year = 2026) {
    const plan = window.planPlayerSeasonSnapshot(year);
    const seasonYear = plan.year;
    const manglerSnapshot = [];
    const ufullstendige = [];
    const avvikMotDagensGlobaleFelt = [];
    const aktivitetUtenSesong = [];
    let medSnapshot = 0;
    (window.activePlayers || []).forEach(player => {
        if (!player || player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) return;
        const record = seasonYear == null ? null : window.getPlayerSeasonRecord(player, seasonYear);
        const evidence = seasonYear == null ? { aktivitet: false } : inspectPlayerSeasonActivity(player, seasonYear);
        if ((plan.excluded || []).some(item => item.id === player.id)) return;
        if (!record) {
            if (plan.write.some(item => item.id === player.id)) {
                manglerSnapshot.push({ id: player.id, navn: player.navn || '', grunn: 'Planlagt skrevet, men seasons mangler.' });
            }
            if (evidence.aktivitet) {
                aktivitetUtenSesong.push({ id: player.id, navn: player.navn || '' });
            }
            return;
        }
        medSnapshot += 1;
        const missingFields = window.PLAYER_SEASON_FIELDS.filter(field => !Object.prototype.hasOwnProperty.call(record, field));
        if (missingFields.length) {
            ufullstendige.push({ id: player.id, navn: player.navn || '', felt: missingFields });
        }
        const expected = {};
        const from = window.normalizeActivityDateKey(player.tilknyttetFra);
        const to = window.normalizeActivityDateKey(player.tilknyttetTil);
        window.PLAYER_SEASON_FIELDS.forEach(field => {
            if (field === 'tilknyttetFra') expected[field] = from;
            else if (field === 'tilknyttetTil') expected[field] = to;
            else expected[field] = player[field] ?? '';
        });
        const felt = window.PLAYER_SEASON_FIELDS.filter(field => String(record[field] ?? '') !== String(expected[field] ?? ''));
        if (felt.length) {
            avvikMotDagensGlobaleFelt.push({
                id: player.id,
                navn: player.navn || '',
                felt: felt.map(field => ({
                    felt: field,
                    lagret: record[field] ?? '',
                    globaltNaa: expected[field] ?? ''
                }))
            });
        }
    });
    return {
        year: seasonYear,
        medSnapshot,
        burdeHattSnapshot: plan.write.length + plan.existing.length,
        bevisstEkskludert: plan.excluded || [],
        manglerSnapshot,
        ufullstendige,
        avvikMotDagensGlobaleFelt,
        aktivitetUtenSesong,
        plan: {
            write: plan.write.length,
            existing: plan.existing.length,
            skipped: plan.skipped.length
        }
    };
};

window.getMatchSquadEmptyMessage = function(_match) {
    return 'Ingen spillere i kamptroppen. Trykk oppmøte for å registrere.';
};

window.getAttendancePresenceStats = function(record) {
    const squadPlayers = typeof window.getAttendanceModalTeamPlayers === 'function'
        ? window.getAttendanceModalTeamPlayers(record)
        : [];
    const squadSize = squadPlayers.length;
    const presentCount = window.getAttendingPlayerRefs(record?.attendance).length;
    const isRegistered = window.hasRegisteredAttendance(record?.attendance);
    return { presentCount, squadSize, isRegistered };
};

window.formatAttendancePresenceLabel = function(record, options = {}) {
    const { presentCount, squadSize, isRegistered } = window.getAttendancePresenceStats(record);
    if (!isRegistered) return '';
    const suffix = typeof options.suffix === 'string' && options.suffix.trim()
        ? options.suffix.trim()
        : 'møtt opp';
    const includeSquadSize = options.includeSquadSize !== false;
    if (includeSquadSize && squadSize > 0) return `${presentCount}/${squadSize} ${suffix}`;
    return `${presentCount} ${suffix}`;
};

window.buildAttendanceSaveFeedbackMessage = function({ presentCount, squadSize }) {
    if (presentCount === 0) return 'Oppmøte lagret — ingen møtt opp';
    const countLabel = squadSize > 0 ? `${presentCount}/${squadSize}` : String(presentCount);
    return `Oppmøte lagret — ${countLabel} møtt opp`;
};

window.deduplicatePlayerRefs = function(refs) {
    if (!Array.isArray(refs)) return [];
    const seen = new Set();
    const result = [];
    refs.forEach(ref => {
        const player = window.findPlayerByRef(ref);
        const key = player?.id || player?.navn || ref;
        if (seen.has(key)) return;
        seen.add(key);
        result.push(player?.id || ref);
    });
    return result;
};

window.getAttendingPlayerRefs = function(attendance) {
    if (!attendance) return [];
    const refs = Object.keys(attendance).filter(ref => window.normalizeAttendanceValue(attendance[ref]) === true);
    return window.deduplicatePlayerRefs(refs);
};

window.getMatchStatPlayerRefs = function(match) {
    if (!match) return [];

    const refs = new Set();

    ['scorers', 'assists', 'ratings', 'benchOnly'].forEach(field => {
        if (match[field] && typeof match[field] === 'object') {
            Object.keys(match[field]).forEach(key => refs.add(key));
        }
    });

    ['guleKort', 'rodeKort'].forEach(field => {
        if (Array.isArray(match[field])) {
            match[field].forEach(ref => refs.add(ref));
        }
    });

    if (match.motm) refs.add(match.motm);

    return window.deduplicatePlayerRefs([...refs]);
};

window.getMatchParticipantRefs = function(match) {
    const attendingRefs = window.getAttendingPlayerRefs(match?.attendance);
    if (attendingRefs.length > 0) return attendingRefs;
    if (window.hasRegisteredAttendance(match?.attendance)) return [];
    return window.getMatchStatPlayerRefs(match);
};

window.pruneMatchPlanUnavailablePlayers = function(match) {
    if (!match || !window.hasRegisteredAttendance(match.attendance)) {
        return { match, changed: false };
    }

    let changed = false;
    const nextMatch = { ...match };

    if (match.lineup && typeof match.lineup === 'object') {
        nextMatch.lineup = {};
        Object.entries(match.lineup).forEach(([pos, playerObj]) => {
            if (!playerObj) {
                nextMatch.lineup[pos] = null;
                return;
            }

            if (window.isPlayerAttending(match.attendance, playerObj)) {
                nextMatch.lineup[pos] = playerObj;
            } else {
                nextMatch.lineup[pos] = null;
                changed = true;
            }
        });
    }

    if (match.roles && typeof match.roles === 'object') {
        nextMatch.roles = {};
        Object.entries(match.roles).forEach(([role, ref]) => {
            if (!ref || window.isPlayerAttending(match.attendance, ref)) {
                nextMatch.roles[role] = ref || '';
            } else {
                nextMatch.roles[role] = '';
                changed = true;
            }
        });
    }

    if (match.benchSubstitutionPlan && typeof match.benchSubstitutionPlan === 'object') {
        nextMatch.benchSubstitutionPlan = {};
        Object.entries(match.benchSubstitutionPlan).forEach(([ref, minute]) => {
            if (!ref || window.isPlayerAttending(match.attendance, ref)) {
                nextMatch.benchSubstitutionPlan[ref] = minute || '';
            } else {
                changed = true;
            }
        });
    }

    return { match: changed ? nextMatch : match, changed };
};

window.clearPlayerAttendanceKeys = function(map, playerOrRef) {
    if (!map || typeof map !== 'object') return;
    const player = typeof playerOrRef === 'object' && playerOrRef !== null
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    Object.keys(map).forEach(key => {
        if (player && window.playerRefMatches(key, player)) {
            delete map[key];
        }
    });
};

window.getPlayerRefMapValue = function(map, playerOrRef, defaultValue) {
    if (!map) return defaultValue;
    const player = typeof playerOrRef === 'object' && playerOrRef !== null && playerOrRef.navn
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    if (player?.id !== undefined && map[player.id] !== undefined) return map[player.id];
    if (player?.navn && map[player.navn] !== undefined) return map[player.navn];
    if (typeof playerOrRef === 'string' && map[playerOrRef] !== undefined) return map[playerOrRef];
    return defaultValue;
};

window.playerRefListIncludes = function(list, playerOrRef) {
    if (!Array.isArray(list)) return false;
    const player = typeof playerOrRef === 'object' && playerOrRef !== null && playerOrRef.navn
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    if (player?.id && list.includes(player.id)) return true;
    if (player?.navn && list.includes(player.navn)) return true;
    return typeof playerOrRef === 'string' && list.includes(playerOrRef);
};

window.motmMatchesPlayer = function(motm, playerOrRef) {
    if (!motm) return false;
    const player = typeof playerOrRef === 'object' && playerOrRef !== null
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);

    if (player) return motm === player.id || motm === player.navn;
    return typeof playerOrRef === 'string' && motm === playerOrRef;
};

window.buildAttendanceMapFromModal = function(container, existingAttendance, teamPlayers) {
    const attMap = {};
    const sanitizedExisting = typeof window.sanitizeAttendanceMap === 'function'
        ? window.sanitizeAttendanceMap(existingAttendance || {})
        : { ...(existingAttendance || {}) };
    const handledKeys = new Set();

    if (container) {
        container.querySelectorAll('.attendance-modal-player').forEach(row => {
            const checkbox = row.querySelector('.attendance-modal-checkbox');
            if (!checkbox) return;

            const storageKey = checkbox.getAttribute('data-player-id');
            if (!window.isValidPlayerRefKey(storageKey)) return;
            handledKeys.add(storageKey);

            const isGuest = window.isGuestPlayerRef(storageKey);
            const player = window.findPlayerByRef(storageKey);
            if (!isGuest && (!player || window.getPlayerStorageKey(player) !== storageKey)) return;

            if (checkbox.checked) {
                attMap[storageKey] = true;
            }
        });
    }

    Object.entries(sanitizedExisting).forEach(([key, value]) => {
        if (handledKeys.has(key)) return;
        if (window.normalizeAttendanceValue(value) === true) {
            attMap[key] = true;
        }
    });

    return typeof window.sanitizeAttendanceMap === 'function'
        ? window.sanitizeAttendanceMap(attMap)
        : attMap;
};

window.getAttendanceModalTeamPlayers = function(ev) {
    if (typeof window.isPlayerInMatchSeasonSquad === 'function') {
        return (window.activePlayers || []).filter(player => window.isPlayerInMatchSeasonSquad(player, ev));
    }
    const teamName = ev?.team || ev?.matchGroup;
    let teamPlayers = (window.activePlayers || []).filter(p => !teamName || p.spillerLag === teamName);
    if (teamName && teamPlayers.length === 0) {
        teamPlayers = [...(window.activePlayers || [])];
    }
    return teamPlayers.filter(player => window.isPlayerListedForActivity(player, ev));
};

window.sanitizeAttendanceMap = function(map) {
    if (!map || typeof map !== 'object') return {};
    const players = window.activePlayers || [];
    const byId = {};
    const byName = {};

    Object.entries(map).forEach(([key, value]) => {
        if (!window.isValidPlayerRefKey(key)) return;

        const normalizedValue = window.normalizeAttendanceValue(value);
        if (normalizedValue !== true) return;

        if (window.isGuestPlayerRef(key)) {
            const guestNumber = window.getGuestPlayerNumber(key);
            if (guestNumber) byId[window.buildGuestPlayerRef(guestNumber)] = true;
            return;
        }

        if (players.length === 0) {
            byId[key] = true;
            return;
        }

        const player = window.findPlayerByRef(key);
        if (!player || player.isGuest) return;

        const storageKey = window.getPlayerStorageKey(player);
        if (!storageKey) return;

        if (key === storageKey) byId[storageKey] = true;
        else byName[storageKey] = true;
    });

    return { ...byName, ...byId };
};

window.normalizePlayerRefMap = function(map) {
    if (!map || typeof map !== 'object') return {};
    const result = {};
    Object.entries(map).forEach(([key, value]) => {
        if (!window.isValidPlayerRefKey(key)) return;
        const player = window.findPlayerByRef(key);
        result[player?.id || key] = value;
    });
    return result;
};

window.normalizePlayerRefList = function(list) {
    if (!Array.isArray(list)) return [];
    return list.map(ref => {
        const player = window.findPlayerByRef(ref);
        return player?.id || ref;
    });
};

window.normalizeMatchPlayerRefs = function(match) {
    if (!match) return match;
    const normalized = { ...match };

    if (match.attendance !== undefined && match.attendance !== null) {
        normalized.attendance = window.sanitizeAttendanceMap(match.attendance);
    }
    if (match.scorers) normalized.scorers = window.normalizePlayerRefMap(match.scorers);
    if (match.assists) normalized.assists = window.normalizePlayerRefMap(match.assists);
    if (match.ratings) normalized.ratings = window.normalizePlayerRefMap(match.ratings);
    if (match.benchOnly) normalized.benchOnly = window.normalizePlayerRefMap(match.benchOnly);
    if (match.benchSubstitutionPlan) normalized.benchSubstitutionPlan = window.normalizePlayerRefMap(match.benchSubstitutionPlan);
    if (match.minutesPlayed) normalized.minutesPlayed = window.normalizePlayerRefMap(match.minutesPlayed);
    if (match.positionMinutes && typeof match.positionMinutes === 'object') {
        const normalizedPositions = {};
        Object.entries(match.positionMinutes).forEach(([ref, posMap]) => {
            const player = window.findPlayerByRef(ref);
            const key = player?.id || ref;
            if (!posMap || typeof posMap !== 'object' || Array.isArray(posMap)) {
                normalizedPositions[key] = {};
                return;
            }
            const cleaned = {};
            Object.entries(posMap).forEach(([posId, mins]) => {
                const posKey = String(posId || '').trim();
                if (!posKey) return;
                cleaned[posKey] = Math.max(0, Math.floor(Number(mins) || 0));
            });
            normalizedPositions[key] = cleaned;
        });
        normalized.positionMinutes = normalizedPositions;
    }
    if (match.positionAssignments && typeof match.positionAssignments === 'object') {
        const normalizedAssignments = {};
        Object.entries(match.positionAssignments).forEach(([ref, assignment]) => {
            const player = window.findPlayerByRef(ref);
            const key = player?.id || ref;
            if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
                normalizedAssignments[key] = { primary: '', secondary: '', secondaryFrom: '' };
                return;
            }
            const secondaryFromRaw = assignment.secondaryFrom ?? assignment.pos2From ?? '';
            normalizedAssignments[key] = {
                primary: String(assignment.primary || assignment.pos1 || '').trim(),
                secondary: String(assignment.secondary || assignment.pos2 || '').trim(),
                secondaryFrom: String(secondaryFromRaw).trim() === ''
                    ? ''
                    : String(Math.max(0, Math.min(120, Math.floor(Number(secondaryFromRaw) || 0))))
            };
        });
        normalized.positionAssignments = normalizedAssignments;
    }
    if (match.guleKort) normalized.guleKort = window.normalizePlayerRefList(match.guleKort);
    if (match.rodeKort) normalized.rodeKort = window.normalizePlayerRefList(match.rodeKort);

    if (Array.isArray(match.liveSubstitutions)) {
        normalized.liveSubstitutions = match.liveSubstitutions.map((sub) => {
            if (!sub || typeof sub !== 'object') return sub;
            const outPlayer = window.findPlayerByRef(sub.outId);
            const inPlayer = window.findPlayerByRef(sub.inId);
            const fillPlayer = sub.fillId ? window.findPlayerByRef(sub.fillId) : null;
            const posId = sub.posId || '';
            const fillChain = Array.isArray(sub.fillChain)
                ? sub.fillChain.map((step) => {
                    if (!step || typeof step !== 'object') return step;
                    const mover = step.playerId ? window.findPlayerByRef(step.playerId) : null;
                    return {
                        fromPos: step.fromPos || '',
                        toPos: step.toPos || '',
                        playerId: mover?.id || step.playerId || ''
                    };
                })
                : [];
            return {
                ...sub,
                posId,
                inPosId: sub.inPosId || posId,
                fillFromPos: sub.fillFromPos || '',
                fillId: fillPlayer?.id || sub.fillId || '',
                fillChain,
                outId: outPlayer?.id || sub.outId || '',
                inId: inPlayer?.id || sub.inId || ''
            };
        });
    }

    if (Array.isArray(match.liveLineupMoves)) {
        normalized.liveLineupMoves = match.liveLineupMoves.map((move) => {
            if (!move || typeof move !== 'object') return move;
            const playerA = window.findPlayerByRef(move.aId);
            const playerB = window.findPlayerByRef(move.bId);
            return {
                ...move,
                aPos: move.aPos || '',
                bPos: move.bPos || '',
                aId: playerA?.id || move.aId || '',
                bId: playerB?.id || move.bId || ''
            };
        });
    }

    if (match.motm) {
        const motmPlayer = window.findPlayerByRef(match.motm);
        normalized.motm = motmPlayer?.id || match.motm;
    }

    if (match.roles) {
        normalized.roles = {};
        Object.entries(match.roles).forEach(([role, ref]) => {
            const player = window.findPlayerByRef(ref);
            normalized.roles[role] = player?.id || ref || '';
        });
    }

    if (match.lineup) {
        normalized.lineup = {};
        Object.entries(match.lineup).forEach(([pos, playerObj]) => {
            if (!playerObj) {
                normalized.lineup[pos] = null;
                return;
            }
            if (typeof playerObj === 'string') {
                const player = window.findPlayerByRef(playerObj);
                normalized.lineup[pos] = player ? { ...player } : null;
                return;
            }
            const player = window.findPlayerByRef(playerObj.id || playerObj.navn);
            normalized.lineup[pos] = player ? { ...player } : { ...playerObj };
        });
    }

    return normalized;
};

window.normalizeEventPlayerRefs = function(event) {
    if (!event) return event;
    if (event.attendance === undefined || event.attendance === null) return { ...event };
    return { ...event, attendance: window.sanitizeAttendanceMap(event.attendance) };
};

window.getPlayerRefFromElement = function(el) {
    if (!el || !el.dataset) return null;
    return el.dataset.playerId || el.dataset.player || null;
};

window.getDisciplineStatusForPlayer = function(suspData, player) {
    if (!suspData || !player) return { isSuspended: false, isAtRisk: false };
    return suspData[player.id] || suspData[player.navn] || { isSuspended: false, isAtRisk: false };
};

window.remapPlayerRefsAfterRename = async function(playerId, oldName) {
    const player = (window.activePlayers || []).find(p => p.id === playerId);
    if (!player || !oldName || oldName === player.navn) return;

    const remapKey = (key) => (key === oldName ? playerId : key);

    const remapEntity = (entity) => {
        let changed = false;
        const updated = { ...entity };

        ['attendance', 'scorers', 'assists', 'ratings', 'benchOnly', 'benchSubstitutionPlan', 'minutesPlayed'].forEach((field) => {
            if (!entity[field]) return;
            const newMap = {};
            Object.entries(entity[field]).forEach(([key, value]) => {
                const newKey = remapKey(key);
                if (newKey !== key) changed = true;
                newMap[newKey] = value;
            });
            updated[field] = newMap;
        });

        if (entity.positionMinutes && typeof entity.positionMinutes === 'object') {
            const newMap = {};
            Object.entries(entity.positionMinutes).forEach(([key, value]) => {
                const newKey = remapKey(key);
                if (newKey !== key) changed = true;
                newMap[newKey] = value;
            });
            updated.positionMinutes = newMap;
        }

        if (entity.positionAssignments && typeof entity.positionAssignments === 'object') {
            const newMap = {};
            Object.entries(entity.positionAssignments).forEach(([key, value]) => {
                const newKey = remapKey(key);
                if (newKey !== key) changed = true;
                newMap[newKey] = value;
            });
            updated.positionAssignments = newMap;
        }

        ['guleKort', 'rodeKort'].forEach((field) => {
            if (!Array.isArray(entity[field])) return;
            updated[field] = entity[field].map((ref) => {
                const newRef = remapKey(ref);
                if (newRef !== ref) changed = true;
                return newRef;
            });
        });

        if (Array.isArray(entity.liveSubstitutions)) {
            updated.liveSubstitutions = entity.liveSubstitutions.map((sub) => {
                if (!sub || typeof sub !== 'object') return sub;
                const outId = remapKey(sub.outId);
                const inId = remapKey(sub.inId);
                const fillId = sub.fillId ? remapKey(sub.fillId) : sub.fillId;
                let fillChain = sub.fillChain;
                if (Array.isArray(sub.fillChain)) {
                    fillChain = sub.fillChain.map((step) => {
                        if (!step || typeof step !== 'object') return step;
                        const playerId = step.playerId ? remapKey(step.playerId) : step.playerId;
                        if (playerId !== step.playerId) changed = true;
                        return { ...step, playerId };
                    });
                }
                if (outId !== sub.outId || inId !== sub.inId || fillId !== sub.fillId) changed = true;
                return { ...sub, outId, inId, fillId, fillChain };
            });
        }

        if (Array.isArray(entity.liveLineupMoves)) {
            updated.liveLineupMoves = entity.liveLineupMoves.map((move) => {
                if (!move || typeof move !== 'object') return move;
                const aId = remapKey(move.aId);
                const bId = remapKey(move.bId);
                if (aId !== move.aId || bId !== move.bId) changed = true;
                return { ...move, aId, bId };
            });
        }

        if (entity.motm === oldName) {
            updated.motm = playerId;
            changed = true;
        }

        if (entity.roles) {
            updated.roles = {};
            Object.entries(entity.roles).forEach(([role, ref]) => {
                updated.roles[role] = remapKey(ref);
                if (updated.roles[role] !== ref) changed = true;
            });
        }

        return changed ? updated : null;
    };

    for (const match of window.activeMatches || []) {
        const updated = remapEntity(match);
        if (updated && typeof window.saveMatchToDatabase === 'function') {
            await window.saveMatchToDatabase(updated);
        }
    }

    for (const event of window.activeEvents || []) {
        const updated = remapEntity(event);
        if (updated && typeof window.saveEventToDatabase === 'function') {
            await window.saveEventToDatabase(updated);
        }
    }
};

// Lokale profilbilder (assets/img/players) når spilleren mangler photoUrl i databasen.
window.PLAYER_LOCAL_PROFILE_PHOTOS = {
    'Vetle Hegbom': 'assets/img/players/vetle-hegbom-3x4.jpg',
    'Simen Skogstad': 'assets/img/players/simen-skogstad-3x4.jpg',
    'Hans Riseng': 'assets/img/players/hans-riseng-3x4.jpg',
    'Noah Holdal': 'assets/img/players/noah-holdal-3x4.jpg',
    'Mikaeel Shabbir': 'assets/img/players/mikaeel-shabbir-3x4.jpg'
};

window.getPlayerProfilePhotoUrl = function(player) {
    if (!player) return '';
    const explicit = player.photoUrl || player.bildeUrl || player.avatarUrl || player.imageUrl || player.photo || '';
    if (explicit) return explicit;
    const byName = window.PLAYER_LOCAL_PROFILE_PHOTOS;
    if (!byName) return '';
    return byName[player.navn] || byName[String(player.navn || '').trim()] || '';
};
