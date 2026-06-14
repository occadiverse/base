window.getPlayerCardCounts = function(playerName, teamName) {
    const counts = { serie: { gule: 0, rode: 0 }, cup: { gule: 0, rode: 0 } };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== teamName) return;
        if (m.date) {
            const matchDate = new Date(m.date);
            matchDate.setHours(0, 0, 0, 0);
            if (matchDate > today) return;
        }

        const bucket = m.matchType === 'Cup' ? 'cup' : (m.matchType === 'Serie' ? 'serie' : null);
        if (!bucket) return;

        if (m.guleKort && m.guleKort.includes(playerName)) counts[bucket].gule++;
        if (m.rodeKort && m.rodeKort.includes(playerName)) counts[bucket].rode++;
    });

    return counts;
};

window.isPlayerOnPitch = function(match, playerName) {
    if (!match || !playerName) return true;

    if (match.benchOnly && match.benchOnly[playerName] === true) return false;
    if (match.benchOnly && match.benchOnly[playerName] === false) return true;

    if (match.lineup && typeof match.lineup === 'object' && Object.keys(match.lineup).length > 0) {
        return Object.values(match.lineup).some(player => {
            if (!player) return false;
            if (typeof player === 'string') return player === playerName;
            return player.navn === playerName;
        });
    }

    return true;
};

window.isPlayerBenchOnly = function(match, playerName) {
    if (!match || !playerName) return false;
    if (match.benchOnly && match.benchOnly[playerName] === true) return true;
    if (match.benchOnly && match.benchOnly[playerName] === false) return false;
    if (match.lineup && typeof match.lineup === 'object' && Object.keys(match.lineup).length > 0) {
        return !window.isPlayerOnPitch({ ...match, benchOnly: {} }, playerName);
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

    let playerStats = {};

    pastMatches.forEach(m => {
        Object.keys(playerStats).forEach(pName => {
            if (playerStats[pName].isSuspended) {
                if (!m.attendance || m.attendance[pName] !== true) {
                    playerStats[pName].isSuspended = false;
                    playerStats[pName].reason = '';
                    playerStats[pName].cardType = '';
                    playerStats[pName].displayNum = 0;
                }
            }
        });

        if (m.attendance) {
            Object.keys(m.attendance).forEach(pName => {
                if (m.attendance[pName] === true) {
                    if (!playerStats[pName]) {
                        playerStats[pName] = {
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

                    const gotYellow = m.guleKort && m.guleKort.includes(pName);
                    const gotRed = m.rodeKort && m.rodeKort.includes(pName);

                    if (gotRed) {
                        playerStats[pName].reds++;
                        playerStats[pName].isSuspended = true;
                        playerStats[pName].isAtRisk = false;
                        playerStats[pName].reason = 'Rødt kort';
                        playerStats[pName].cardType = 'red';
                        playerStats[pName].displayNum = playerStats[pName].reds;
                    }

                    if (gotYellow) {
                        playerStats[pName].yellows++;
                        const y = playerStats[pName].yellows;
                        const hint = window.getSerieYellowDisciplineHint(y);
                        playerStats[pName].isAtRisk = hint.isAtRisk;
                        playerStats[pName].nextKaranteneAt = hint.nextSuspensionAt;

                        if (hint.isSuspendedThreshold) {
                            playerStats[pName].isSuspended = true;
                            playerStats[pName].isAtRisk = false;
                            playerStats[pName].reason = `${y} gule kort`;
                            playerStats[pName].cardType = 'yellow';
                            playerStats[pName].displayNum = y;
                        }
                    }
                }
            });
        }
    });

    return playerStats;
};

window.calculatePlayerMatchPoints = function(m, playerName, returnDetails = false) {
    const onPitch = typeof window.isPlayerOnPitch === 'function'
        ? window.isPlayerOnPitch(m, playerName)
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

        if (m.ratings && m.ratings[playerName]) {
            ratingBonus = (m.ratings[playerName] - 5) * 6;
        }

        if (m.motm === playerName) {
            bbBonus = 1;
        }
    }

    const total = base + resultBonus + ratingBonus + bbBonus;

    if (returnDetails) {
        return { total, base, resultBonus, ratingBonus, bbBonus, onPitch };
    }

    return total;
};
