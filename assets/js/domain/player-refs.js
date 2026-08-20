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

window.isPlayerOnRosterForDate = function(player, dateValue) {
    if (!player) return false;
    if (player.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))) {
        return true;
    }
    const joinedFrom = window.getPlayerJoinedFromDate(player);
    if (!joinedFrom) return true;
    const dateKey = window.normalizeActivityDateKey(dateValue);
    if (!dateKey) return true;
    return dateKey >= joinedFrom;
};

window.isPlayerOnRosterForActivity = function(player, activity) {
    return window.isPlayerOnRosterForDate(player, activity?.date);
};

window.getMatchSquadEmptyMessage = function(match) {
    if (window.hasRegisteredAttendance(match?.attendance)) {
        return 'Ingen spillere er registrert med oppmøte.';
    }
    return 'Registrer oppmøte for å se hvem som møtte opp.';
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
    if (squadSize > 0) return `${presentCount}/${squadSize} ${suffix}`;
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
    const teamName = ev?.team || ev?.matchGroup;
    let teamPlayers = (window.activePlayers || []).filter(p => p.spillerLag === teamName && p.status !== 'Passiv');
    if (teamPlayers.length === 0) {
        teamPlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
    }
    return teamPlayers.filter(player => window.isPlayerOnRosterForActivity(player, ev));
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
    if (match.guleKort) normalized.guleKort = window.normalizePlayerRefList(match.guleKort);
    if (match.rodeKort) normalized.rodeKort = window.normalizePlayerRefList(match.rodeKort);

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

        ['attendance', 'scorers', 'assists', 'ratings', 'benchOnly', 'benchSubstitutionPlan'].forEach((field) => {
            if (!entity[field]) return;
            const newMap = {};
            Object.entries(entity[field]).forEach(([key, value]) => {
                const newKey = remapKey(key);
                if (newKey !== key) changed = true;
                newMap[newKey] = value;
            });
            updated[field] = newMap;
        });

        ['guleKort', 'rodeKort'].forEach((field) => {
            if (!Array.isArray(entity[field])) return;
            updated[field] = entity[field].map((ref) => {
                const newRef = remapKey(ref);
                if (newRef !== ref) changed = true;
                return newRef;
            });
        });

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
