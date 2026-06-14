window.findPlayerByRef = function(ref) {
    if (!ref) return null;
    const players = window.activePlayers || [];
    const byId = players.find(p => p.id === ref);
    if (byId) return byId;
    return players.find(p => p.navn === ref) || null;
};

window.getPlayerStorageKey = function(playerOrRef) {
    const player = typeof playerOrRef === 'object' && playerOrRef !== null && playerOrRef.navn
        ? playerOrRef
        : window.findPlayerByRef(playerOrRef);
    return player?.id || (typeof playerOrRef === 'string' ? playerOrRef : null);
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

    if (player?.id && attendance[player.id] !== undefined) return attendance[player.id];
    if (player?.navn && attendance[player.navn] !== undefined) return attendance[player.navn];
    if (typeof playerOrRef === 'string' && attendance[playerOrRef] !== undefined) return attendance[playerOrRef];
    return undefined;
};

window.isPlayerAttending = function(attendance, playerOrRef) {
    return window.getAttendanceForPlayer(attendance, playerOrRef) === true;
};

window.getAttendingPlayerRefs = function(attendance) {
    if (!attendance) return [];
    return Object.keys(attendance).filter(ref => attendance[ref] === true);
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

    return [...refs];
};

window.getMatchParticipantRefs = function(match) {
    const attendingRefs = window.getAttendingPlayerRefs(match?.attendance);
    if (attendingRefs.length > 0) return attendingRefs;
    return window.getMatchStatPlayerRefs(match);
};

window.repairMatchAttendanceFromStats = function(match) {
    if (!match) return { match, changed: false };

    const hasAttendance = match.attendance
        && Object.values(match.attendance).some(value => value === true);

    if (hasAttendance) return { match, changed: false };

    const statRefs = window.getMatchStatPlayerRefs(match);
    if (statRefs.length === 0) return { match, changed: false };

    const attendance = {};
    statRefs.forEach(ref => {
        const player = window.findPlayerByRef(ref);
        attendance[player?.id || ref] = true;
    });

    return {
        match: { ...match, attendance },
        changed: true
    };
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

window.normalizePlayerRefMap = function(map) {
    if (!map || typeof map !== 'object') return {};
    const result = {};
    Object.entries(map).forEach(([key, value]) => {
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

    if (match.attendance) normalized.attendance = window.normalizePlayerRefMap(match.attendance);
    if (match.scorers) normalized.scorers = window.normalizePlayerRefMap(match.scorers);
    if (match.assists) normalized.assists = window.normalizePlayerRefMap(match.assists);
    if (match.ratings) normalized.ratings = window.normalizePlayerRefMap(match.ratings);
    if (match.benchOnly) normalized.benchOnly = window.normalizePlayerRefMap(match.benchOnly);
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
    if (!event.attendance) return { ...event };
    return { ...event, attendance: window.normalizePlayerRefMap(event.attendance) };
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

        ['attendance', 'scorers', 'assists', 'ratings', 'benchOnly'].forEach((field) => {
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
