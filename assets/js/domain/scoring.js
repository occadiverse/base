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
                }
            }
        });

        if (m.attendance) {
            Object.keys(m.attendance).forEach(pName => {
                if (m.attendance[pName] === true) {
                    if (!playerStats[pName]) playerStats[pName] = { yellows: 0, reds: 0, isSuspended: false, isAtRisk: false, reason: '', cardType: '', displayNum: 0 };

                    const gotYellow = m.guleKort && m.guleKort.includes(pName);
                    const gotRed = m.rodeKort && m.rodeKort.includes(pName);

                    if (gotRed) {
                        playerStats[pName].reds++;
                        playerStats[pName].isSuspended = true;
                        playerStats[pName].reason = 'Rødt kort';
                        playerStats[pName].cardType = 'red';
                        playerStats[pName].displayNum = playerStats[pName].reds;
                    }

                    if (gotYellow) {
                        playerStats[pName].yellows++;
                        let y = playerStats[pName].yellows;
                        playerStats[pName].isAtRisk = (y === 3 || (y > 3 && y % 2 === 1));

                        if (y === 4 || (y > 4 && y % 2 === 0)) {
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
    let base = 15;
    let resultBonus = 0;
    let ratingBonus = 0;
    let bbBonus = 0;

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

    const total = base + resultBonus + ratingBonus + bbBonus;

    if (returnDetails) {
        return { total, base, resultBonus, ratingBonus, bbBonus };
    }

    return total;
};
