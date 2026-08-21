window.getPlayerCardCounts = function(playerRef, teamName, options = {}) {
    const counts = { serie: { gule: 0, rode: 0 }, cup: { gule: 0, rode: 0 } };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yearFilter = options.yearFilter;

    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== teamName) return;
        if (m.date) {
            const matchDate = new Date(m.date);
            matchDate.setHours(0, 0, 0, 0);
            if (matchDate > today) return;
        }
        if (yearFilter && yearFilter !== 'alle' && typeof window.getMatchStatsYear === 'function') {
            if (window.getMatchStatsYear(m) !== yearFilter) return;
        }

        const bucket = m.matchType === 'Cup' ? 'cup' : (m.matchType === 'Serie' ? 'serie' : null);
        if (!bucket) return;

        if (window.playerRefListIncludes(m.guleKort, playerRef)) counts[bucket].gule++;
        if (window.playerRefListIncludes(m.rodeKort, playerRef)) counts[bucket].rode++;
    });

    return counts;
};

window.isPlayerOnPitch = function(match, playerRef) {
    if (!match || !playerRef) return true;

    if (window.getPlayerRefMapValue(match.benchOnly, playerRef, undefined) === true) return false;
    if (window.getPlayerRefMapValue(match.benchOnly, playerRef, undefined) === false) return true;

    if (match.lineup && typeof match.lineup === 'object' && Object.keys(match.lineup).length > 0) {
        return Object.values(match.lineup).some(player => {
            if (!player) return false;
            if (typeof player === 'string') return window.playerRefMatches(player, window.findPlayerByRef(playerRef) || { navn: playerRef });
            return window.playerRefMatches(player.id || player.navn, window.findPlayerByRef(playerRef) || { navn: playerRef });
        });
    }

    return true;
};

window.isPlayerBenchOnly = function(match, playerRef) {
    if (!match || !playerRef) return false;
    if (window.getPlayerRefMapValue(match.benchOnly, playerRef, undefined) === true) return true;
    if (window.getPlayerRefMapValue(match.benchOnly, playerRef, undefined) === false) return false;
    if (match.lineup && typeof match.lineup === 'object' && Object.keys(match.lineup).length > 0) {
        return !window.isPlayerOnPitch({ ...match, benchOnly: {} }, playerRef);
    }
    return false;
};

window.getPlayerInjuryInfo = function(player) {
    if (!player || !player.skadeStatus || player.skadeStatus === 'frisk') {
        return { isInjured: false, type: 'frisk', label: '', shortLabel: '' };
    }

    if (player.skadeStatus === 'dag-til-dag') {
        const note = player.skadeNotat ? `: ${player.skadeNotat}` : '';
        return { isInjured: true, type: 'dag-til-dag', label: `Dag-til-dag${note}`, shortLabel: 'D-T-D' };
    }

    if (player.skadeStatus === 'langvarig') {
        const til = player.skadeTilDato ? ` (til ${player.skadeTilDato})` : '';
        const note = player.skadeNotat ? `: ${player.skadeNotat}` : '';
        return { isInjured: true, type: 'langvarig', label: `Langvarig skade${til}${note}`, shortLabel: 'SKADET' };
    }

    return { isInjured: false, type: 'frisk', label: '', shortLabel: '' };
};

window.getSerieYellowDisciplineHint = function(serieYellowCount) {
    const count = Number(serieYellowCount) || 0;
    const isAtRisk = count === 3 || (count > 3 && count % 2 === 1);
    let nextSuspensionAt = 4;

    if (count >= 4) {
        nextSuspensionAt = count % 2 === 0 ? count + 2 : count + 1;
    }

    return {
        serieYellowCount: count,
        isAtRisk,
        nextSuspensionAt,
        isSuspendedThreshold: count >= 4 && count % 2 === 0
    };
};

window.getDisciplineStatusForTeam = function(teamName, upToDateStr) {
    const pastMatches = (window.activeMatches || [])
        .filter(m => m.matchGroup === teamName && m.matchType === 'Serie' && m.date < upToDateStr)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const playerStats = {};

    const ensureStats = (playerRef) => {
        const player = window.findPlayerByRef(playerRef);
        const key = player?.id || playerRef;
        if (!playerStats[key]) {
            playerStats[key] = {
                yellows: 0,
                reds: 0,
                isSuspended: false,
                isAtRisk: false,
                reason: '',
                cardType: '',
                displayNum: 0,
                nextKaranteneAt: 4
            };
        }
        return key;
    };

    pastMatches.forEach(m => {
        Object.keys(playerStats).forEach(key => {
            if (playerStats[key].isSuspended && !window.isPlayerAttending(m.attendance, key)) {
                playerStats[key].isSuspended = false;
                playerStats[key].reason = '';
                playerStats[key].cardType = '';
                playerStats[key].displayNum = 0;
            }
        });

        window.getAttendingPlayerRefs(m.attendance).forEach(playerRef => {
            const key = ensureStats(playerRef);
            const gotYellow = window.playerRefListIncludes(m.guleKort, playerRef);
            const gotRed = window.playerRefListIncludes(m.rodeKort, playerRef);

            if (gotRed) {
                playerStats[key].reds++;
                playerStats[key].isSuspended = true;
                playerStats[key].isAtRisk = false;
                playerStats[key].reason = 'Rødt kort';
                playerStats[key].cardType = 'red';
                playerStats[key].displayNum = playerStats[key].reds;
            }

            if (gotYellow) {
                playerStats[key].yellows++;
                const y = playerStats[key].yellows;
                const hint = window.getSerieYellowDisciplineHint(y);
                playerStats[key].isAtRisk = hint.isAtRisk;
                playerStats[key].nextKaranteneAt = hint.nextSuspensionAt;

                if (hint.isSuspendedThreshold) {
                    playerStats[key].isSuspended = true;
                    playerStats[key].isAtRisk = false;
                    playerStats[key].reason = `${y} gule kort`;
                    playerStats[key].cardType = 'yellow';
                    playerStats[key].displayNum = y;
                }
            }
        });
    });

    return playerStats;
};

window.isHistoricalActivity = function(item) {
    if (!item || !item.date) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate <= today;
};

window.getPlayerKampbidragSnitt = function(playerOrRef, teamName) {
    const player = typeof playerOrRef === 'object' && playerOrRef !== null
        ? playerOrRef
        : (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(playerOrRef) : null);
    const lag = teamName || player?.spillerLag;
    if (!player || !lag) return 0;

    let kamper = 0;
    let totalMatchPoints = 0;

    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== lag) return;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return;
        if (!window.isPlayerAttending(m.attendance, player)) return;

        kamper++;
        totalMatchPoints += window.calculatePlayerMatchPoints(m, player.navn || playerOrRef);
    });

    return kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
};

window.calculatePlayerMatchPoints = function(m, playerRef, returnDetails = false) {
    const onPitch = typeof window.isPlayerOnPitch === 'function'
        ? window.isPlayerOnPitch(m, playerRef)
        : true;

    let base = 15;
    let resultBonus = 0;
    let ratingBonus = 0;
    let bbBonus = 0;

    if (onPitch) {
        if (m.result && m.result.includes('-')) {
            const score = typeof parseScore === 'function' ? parseScore(m.result) : null;
            if (score) {
                if (score.bsk > score.opponent) resultBonus += 5;
                else if (score.bsk === score.opponent) resultBonus += 2;
                else resultBonus -= 2;

                if (score.opponent === 0) resultBonus += 3;

                resultBonus += score.bsk * 1;
                resultBonus -= score.opponent * 1;
            }
        }

        const rating = window.getPlayerRefMapValue(m.ratings, playerRef, 0);
        if (rating > 0) ratingBonus = (rating - 5) * 6;

        if (window.motmMatchesPlayer(m.motm, playerRef)) bbBonus = 1;
    }

    const total = base + resultBonus + ratingBonus + bbBonus;

    if (returnDetails) {
        return { total, base, resultBonus, ratingBonus, bbBonus, onPitch };
    }

    return total;
};
