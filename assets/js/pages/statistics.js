window.checkIndividualChemistry = function() {
            const selectedPlayer = document.getElementById('chemistryPlayerSelect').value;
            const resContainer = document.getElementById('individual-chemistry-result');
            const emptyContainer = document.getElementById('individual-chemistry-empty');

            if (!selectedPlayer) {
                if (resContainer) resContainer.classList.add('hidden');
                if (emptyContainer) emptyContainer.classList.remove('hidden');
                return;
            }

            if (resContainer) resContainer.classList.remove('hidden');
            if (emptyContainer) emptyContainer.classList.add('hidden');

            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, team: m.matchGroup }))];
            const teamPlayers = (window.activePlayers || []).filter(p => filterLag === 'Alle' || p.spillerLag === filterLag);

            let bestPartner = null, bestScore = -1, bestSharedCount = 0;

            teamPlayers.forEach(p => {
                if (p.navn === selectedPlayer) return;
                let sharedPresent = 0, eitherPresent = 0;
                allEvents.forEach(e => {
                    if (filterLag !== 'Alle' && e.team !== filterLag) return;
                    if (e.attendance) {
                        const p1Present = window.isPlayerAttending(e.attendance, selectedPlayer);
                        const p2Present = window.isPlayerAttending(e.attendance, p);
                        if (p1Present || p2Present) eitherPresent++;
                        if (p1Present && p2Present) sharedPresent++;
                    }
                });
                const score = eitherPresent > 0 ? Math.round((sharedPresent / eitherPresent) * 100) : 0;
                if (score > bestScore && sharedPresent > 0) { bestScore = score; bestPartner = p.navn; bestSharedCount = sharedPresent; }
            });

            if (bestPartner) {
                if (document.getElementById('individual-chem-pct')) document.getElementById('individual-chem-pct').innerText = `${bestScore}%`;
                if (document.getElementById('individual-partner-name')) document.getElementById('individual-partner-name').innerText = bestPartner;
                if (document.getElementById('individual-partner-desc')) document.getElementById('individual-partner-desc').innerText = `Har stilt opp sammen på ${bestSharedCount} økter.`;
                if (document.getElementById('chem-circle-progress')) document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2 - (251.2 * bestScore) / 100;
            } else {
                if (document.getElementById('individual-chem-pct')) document.getElementById('individual-chem-pct').innerText = `0%`;
                if (document.getElementById('individual-partner-name')) document.getElementById('individual-partner-name').innerText = "Ingen match";
                if (document.getElementById('individual-partner-desc')) document.getElementById('individual-partner-desc').innerText = "Ikke nok data registrert.";
                if (document.getElementById('chem-circle-progress')) document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2;
            }
        }

        window.getStatsTeamFilter = function() {
            const statsSelect = document.getElementById('statsLagFilterSelect');
            if (statsSelect && statsSelect.value) return statsSelect.value;
            const rosterSelect = document.getElementById('lagFilterSelect');
            if (rosterSelect && rosterSelect.value) return rosterSelect.value;
            const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];
            return teams[0] ? teams[0].name : 'Alle';
        };

        window.handleStatsTeamFilterChange = function() {
            const rosterSelect = document.getElementById('lagFilterSelect');
            const statsSelect = document.getElementById('statsLagFilterSelect');
            if (rosterSelect && statsSelect && rosterSelect.value !== statsSelect.value) {
                rosterSelect.value = statsSelect.value;
            }

            window.renderStatistikkSide();
            if (window._statsSelectedPlayer) {
                window.renderSpillereDetail(window._statsSelectedPlayer);
            } else {
                window.renderSpillereView();
            }
            if (typeof window.renderMatchStatsView === 'function') window.renderMatchStatsView();
        };

        window.getTeamFormGuide = function(teamName) {
            const matches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (teamName && teamName !== 'Alle' && m.matchGroup !== teamName) return false;
                return true;
            });

            matches.sort((a, b) => new Date(b.date) - new Date(a.date));
            const last5 = matches.slice(0, 5).reverse();

            return last5.map(m => {
                const score = parseScore(m.result);
                if (!score) return { m, form: 'U', text: 'U', tooltip: `Registrert: ${m.result}` };
                if (score.bsk > score.opponent) return { m, form: 'S', text: 'S', tooltip: `Seier vs ${m.opponent} (${m.result})` };
                if (score.bsk === score.opponent) return { m, form: 'U', text: 'U', tooltip: `Uavgjort vs ${m.opponent} (${m.result})` };
                return { m, form: 'T', text: 'T', tooltip: `Tap vs ${m.opponent} (${m.result})` };
            });
        };

        window.buildPlayerAnalysisStats = function(filterLag) {
            const players = (window.activePlayers || []).filter(p => {
                if (p.status === 'Passiv') return false;
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });

            const matches = (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                    if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            const playerStats = players.map(player => {
                const name = player.navn || player.name || player.fullName || player.spiller || '';
                if (!name) return null;

                const playerMatches = matches.filter(m => window.isPlayerAttending(m.attendance, player));
                let totalPoints = 0;
                let goals = 0;
                let assists = 0;
                let bb = 0;
                let yellowSerie = 0;
                let redSerie = 0;
                let ratings = [];

                playerMatches.forEach(m => {
                    totalPoints += typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(m, name)
                        : 0;
                    if (window.getPlayerRefMapValue(m.scorers, player, 0)) goals += Number(window.getPlayerRefMapValue(m.scorers, player, 0)) || 0;
                    if (window.getPlayerRefMapValue(m.assists, player, 0)) assists += Number(window.getPlayerRefMapValue(m.assists, player, 0)) || 0;
                    if (window.motmMatchesPlayer(m.motm, player)) bb += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.guleKort, player)) yellowSerie += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.rodeKort, player)) redSerie += 1;

                    const playerRating = window.getPlayerRefMapValue(m.ratings, player, 0);
                    if (playerRating) {
                        ratings.push({
                            date: m.date,
                            rating: Number(playerRating) || 0
                        });
                    }
                });

                const lastFiveRatings = ratings
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                const formLastFive = lastFiveRatings.length
                    ? lastFiveRatings.reduce((sum, r) => sum + r.rating, 0) / lastFiveRatings.length
                    : 0;

                const pointsPerMatch = playerMatches.length > 0 ? totalPoints / playerMatches.length : 0;

                return {
                    name,
                    spillerLag: player.spillerLag || '',
                    matches: playerMatches.length || 0,
                    totalPoints: totalPoints || 0,
                    pointsPerMatch: pointsPerMatch || 0,
                    goals: goals || 0,
                    assists: assists || 0,
                    bb: bb || 0,
                    yellowSerie: yellowSerie || 0,
                    redSerie: redSerie || 0,
                    formLastFive: formLastFive || 0,
                    formScore: typeof window.calculatePlayerPerformanceChemistry === 'function'
                        ? window.calculatePlayerPerformanceChemistry(name)
                        : 0
                };
            }).filter(Boolean);

            const activeStats = playerStats.filter(p => p.matches > 0);

            const followUps = activeStats
                .filter(p => p.redSerie > 0 || p.yellowSerie >= 3 || p.formLastFive < 5.5 || p.matches <= 2)
                .map(p => {
                    const reason = [];
                    if (p.redSerie > 0) reason.push('Rødt kort i serie');
                    if (p.yellowSerie >= 3) {
                        const hint = typeof window.getSerieYellowDisciplineHint === 'function'
                            ? window.getSerieYellowDisciplineHint(p.yellowSerie)
                            : null;
                        reason.push(hint && hint.isAtRisk
                            ? `${p.yellowSerie} gule i serie – karantene ved ${hint.nextSuspensionAt}`
                            : 'Mange gule kort i serie');
                    }
                    if (p.formLastFive > 0 && p.formLastFive < 5.5) reason.push('Lav form siste kamper');
                    if (p.matches <= 2) reason.push('Få kamper registrert');
                    return { name: p.name, reason: reason.join(', ') };
                })
                .slice(0, 6);

            return {
                matches,
                activeStats,
                followUps,
                topFormPlayer: [...activeStats].sort((a, b) => b.formLastFive - a.formLastFive)[0] || null,
                bbLeader: [...activeStats].sort((a, b) => b.bb - a.bb)[0] || null,
                topScorer: [...activeStats].sort((a, b) => b.goals - a.goals)[0] || null,
                topAssist: [...activeStats].sort((a, b) => b.assists - a.assists)[0] || null,
                topKampbidrag: [...activeStats].sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0] || null
            };
        };

        window.renderStatsFollowUpsHtml = function(followUps) {
            if (!followUps.length) {
                return `
                    <div class="stats-panel">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Oppfølging</h3>
                            <p class="stats-panel-subtitle">Spillere som trenerteamet bør følge litt ekstra med på.</p>
                        </div>
                        <div class="stats-empty-state">
                            <p class="text-slate-400 italic text-xs">Ingen tydelige varsler akkurat nå.</p>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="stats-panel">
                    <div class="stats-panel-header">
                        <h3 class="stats-panel-title">Oppfølging</h3>
                        <p class="stats-panel-subtitle">Spillere som trenerteamet bør følge litt ekstra med på.</p>
                    </div>
                    <div class="stats-followup-list">
                        ${followUps.map(p => `
                            <button type="button" onclick="window.openSpillerDetail('${String(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" class="stats-followup-item w-full text-left">
                                <div class="flex items-center gap-3">
                                    <div class="stats-metric-icon text-bsk-yellow">
                                        <i class="fa-solid fa-triangle-exclamation text-sm"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-black text-slate-800">${p.name}</div>
                                        <div class="text-xs text-slate-500 leading-snug">${p.reason}</div>
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        
        window.renderStatistikkSide = function() {
            const filterLag = window.getStatsTeamFilter();
            const teamPlayers = (window.activePlayers || []).filter(p => {
                if (p.status === 'Passiv') return false;
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });

            const filteredMatches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                return true;
            });

            let wins = 0, draws = 0, losses = 0, goals = 0, conceded = 0;
            filteredMatches.forEach(m => {
                const score = parseScore(m.result);
                if (score !== null) {
                    goals += score.bsk;
                    conceded += score.opponent;
                    if (score.bsk > score.opponent) wins++;
                    else if (score.bsk === score.opponent) draws++;
                    else losses++;
                }
            });

            const matchCount = filteredMatches.length;
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            let totalEventTicks = 0, totalPossibleTicks = 0;
            allEvents.forEach(e => {
                if (filterLag && filterLag !== 'Alle' && e.team !== filterLag) return;
                if (e.date) {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    if (eventDate > todayForStats) return;
                }
                const eventTeam = e.team || 'Lag A';
                const squad = teamPlayers.filter(p => p.spillerLag === eventTeam);
                if (!squad.length) return;
                totalPossibleTicks += squad.length;
                if (e.attendance) {
                    squad.forEach(p => {
                        if (window.isPlayerAttending(e.attendance, p)) totalEventTicks++;
                    });
                }
            });

            window._statsLagData = {
                filterLag,
                title: filterLag && filterLag !== 'Alle' ? filterLag : 'Lagstatistikk',
                wins,
                draws,
                losses,
                goals,
                goalsAvg: matchCount ? (goals / matchCount).toFixed(1) : '0',
                concededAvg: matchCount ? (conceded / matchCount).toFixed(1) : '0',
                playerCount: teamPlayers.length,
                avgAttendance: totalPossibleTicks > 0 ? Math.round((totalEventTicks / totalPossibleTicks) * 100) : 0,
                teamFormMedian: typeof window.getTeamFormMedian === 'function'
                    ? window.getTeamFormMedian(filterLag === 'Alle' ? '' : filterLag)
                    : 0
            };

            if (document.querySelector('#stat-tab-lag.is-active') || document.getElementById('stat-view-lag')?.classList.contains('block')) {
                window.renderStatsTabHero('lag');
            }

            const followUpsContainer = document.getElementById('stats-lag-followups');
            if (followUpsContainer) {
                const analysis = window.buildPlayerAnalysisStats(filterLag);
                followUpsContainer.innerHTML = window.renderStatsFollowUpsHtml(analysis.followUps);
            }
        };


window.getPlayerFormComponents = function(playerName, asOfDate) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };

    const spillerLag = playerObj.spillerLag;
    const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
    const todayForChemistry = new Date();
    todayForChemistry.setHours(0, 0, 0, 0);
    let cutoffDate = asOfDate ? new Date(asOfDate) : null;
    if (cutoffDate && Number.isNaN(cutoffDate.getTime())) {
        cutoffDate = null;
    } else if (cutoffDate) {
        cutoffDate.setHours(23, 59, 59, 999);
    }
    const isHistorical = (item) => {
        if (!item.date) return !cutoffDate;
        const itemDate = new Date(item.date);
        if (Number.isNaN(itemDate.getTime())) return false;
        itemDate.setHours(0, 0, 0, 0);
        if (cutoffDate) {
            const cut = new Date(cutoffDate);
            cut.setHours(0, 0, 0, 0);
            return itemDate <= cut;
        }
        if (typeof window.isHistoricalActivity === 'function') {
            return window.isHistoricalActivity(item);
        }
        return itemDate <= todayForChemistry;
    };
    const teamEvents = allEvents
        .filter(e => e.team === spillerLag && isHistorical(e))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const recentEvents = teamEvents.slice(0, 8);
    const attendedRecentEvents = recentEvents.filter(e => window.isPlayerAttending(e.attendance, playerObj)).length;
    const availabilityScore = recentEvents.length > 0
        ? (attendedRecentEvents / recentEvents.length) * 20
        : 0;

    const recentMatches = (window.activeMatches || [])
        .filter(m => (
            isHistorical(m) &&
            m.matchGroup === spillerLag &&
            m.attendance &&
            window.isPlayerAttending(m.attendance, playerObj)
        ))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    if (recentMatches.length === 0) {
        return { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };
    }

    let performanceScore = 0;
    let weightedPoints = 0;
    let totalWeight = 0;

    recentMatches.forEach((m, index) => {
        const weight = recentMatches.length - index;
        weightedPoints += window.calculatePlayerMatchPoints(m, playerName) * weight;
        totalWeight += weight;
    });

    const weightedAverage = totalWeight > 0 ? weightedPoints / totalWeight : 0;
    performanceScore = Math.max(0, Math.min(70, ((weightedAverage - 5) / 35) * 70));

    let totalYellowCards = 0;
    let totalRedCards = 0;

    (window.activeMatches || []).forEach(m => {
        if (!isHistorical(m) || m.matchGroup !== spillerLag || m.matchType !== 'Serie') return;
        if (window.playerRefListIncludes(m.guleKort, playerObj)) totalYellowCards++;
        if (window.playerRefListIncludes(m.rodeKort, playerObj)) totalRedCards++;
    });

    let karantener = 0;
    if (totalYellowCards >= 4) {
        karantener = 1 + Math.floor((totalYellowCards - 4) / 2);
    }

    const disciplinePenalty = (totalRedCards * 10) + (karantener > 1 ? (karantener - 1) * 5 : 0);
    const disciplineScore = Math.max(0, 10 - disciplinePenalty);
    const kamp = Math.round(performanceScore);
    const oppm = Math.round(availabilityScore);
    const dis = Math.round(disciplineScore);
    const total = Math.max(0, Math.min(100, kamp + oppm + dis));

    return { total, kamp, oppm, dis, hasFormData: true };
};

window.calculatePlayerPerformanceChemistry = function(playerName, asOfDate) {
    return window.getPlayerFormComponents(playerName, asOfDate).total;
};

window.getTeamFormMedian = function(teamName, asOfDate) {
    const scores = (window.activePlayers || [])
        .filter(p => p.status !== 'Passiv' && (!teamName || p.spillerLag === teamName))
        .map(p => window.calculatePlayerPerformanceChemistry(p.navn, asOfDate))
        .filter(score => score > 0)
        .sort((a, b) => a - b);

    if (!scores.length) return 0;

    const middle = Math.floor(scores.length / 2);
    return scores.length % 2 === 0
        ? Math.round((scores[middle - 1] + scores[middle]) / 2)
        : scores[middle];
};

window.getTeamMatchAveragePoints = function(match, teamName) {
    if (!match || !teamName || !match.attendance) return null;

    const players = (window.activePlayers || []).filter(p =>
        p.status !== 'Passiv' &&
        p.spillerLag === teamName &&
        window.isPlayerAttending(match.attendance, p)
    );

    if (!players.length) return null;

    const sum = players.reduce((total, player) => {
        return total + (typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, player)
            : 0);
    }, 0);

    return Math.round((sum / players.length) * 10) / 10;
};

window.getFormScoreTone = function(score, teamName) {
    if (!score || score <= 0) return 'none';

    const median = typeof window.getTeamFormMedian === 'function'
        ? window.getTeamFormMedian(teamName)
        : 0;

    if (!median) return 'none';
    if (score >= median + 8) return 'green';
    if (score < median - 8) return 'red';
    return 'amber';
}

window.getFormScoreTextClass = function(score, teamName) {
    const tone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(score, teamName)
        : 'none';

    if (tone === 'green') return 'text-emerald-500';
    if (tone === 'amber') return 'text-amber-500';
    if (tone === 'red') return 'text-rose-500';
    return 'text-slate-400';
}

window.getFormScoreBorderClass = function(score, teamName) {
    const tone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(score, teamName)
        : 'none';

    if (tone === 'green') return 'border-emerald-500';
    if (tone === 'amber') return 'border-amber-500';
    if (tone === 'red') return 'border-rose-500';
    return 'border-slate-300';
}

        window.buildPlayerStatsData = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];

            return (window.activePlayers || [])
                .filter(p => filterLag === 'Alle' || p.spillerLag === filterLag)
                .map(p => {
                    const teamEvents = allEvents.filter(e => {
                        if (e.team !== p.spillerLag) return false;
                        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                        return true;
                    });

                    let attended = 0, kamper = 0, attendedMatches = 0, mal = 0, assist = 0, totalMatchPoints = 0, bb = 0;
                    let ratingSum = 0, ratingCount = 0;

                    teamEvents.forEach(e => {
                        if (window.isPlayerAttending(e.attendance, p)) {
                            attended++;
                            if (e.type === 'Kamp') {
                                attendedMatches++;
                                const onPitch = typeof window.isPlayerOnPitch === 'function'
                                    ? window.isPlayerOnPitch(e, p)
                                    : true;
                                if (onPitch) {
                                    kamper++;
                                    mal += Number(window.getPlayerRefMapValue(e.scorers, p, 0)) || 0;
                                    assist += Number(window.getPlayerRefMapValue(e.assists, p, 0)) || 0;
                                    if (window.motmMatchesPlayer(e.motm, p)) bb++;
                                    const playerRating = Number(window.getPlayerRefMapValue(e.ratings, p, 0)) || 0;
                                    if (playerRating > 0) {
                                        ratingSum += playerRating;
                                        ratingCount++;
                                    }
                                }
                                totalMatchPoints += window.calculatePlayerMatchPoints(e, p);
                            }
                        }
                    });

                    const cardCounts = typeof window.getPlayerCardCounts === 'function'
                        ? window.getPlayerCardCounts(p.navn, p.spillerLag)
                        : { serie: { gule: 0, rode: 0 }, cup: { gule: 0, rode: 0 } };
                    const serieHint = typeof window.getSerieYellowDisciplineHint === 'function'
                        ? window.getSerieYellowDisciplineHint(cardCounts.serie.gule)
                        : { isAtRisk: false };

                    return {
                        navn: p.navn,
                        pos1: p.pos1 || '',
                        spillerLag: p.spillerLag || '',
                        oppmotePct: teamEvents.length > 0 ? Math.round((attended / teamEvents.length) * 100) : 0,
                        kamper,
                        attendedMatches,
                        mal,
                        assist,
                        kampbonus: typeof window.getPlayerKampbidragSnitt === 'function'
                            ? window.getPlayerKampbidragSnitt(p)
                            : (attendedMatches > 0 ? totalMatchPoints / attendedMatches : 0),
                        guleSerie: cardCounts.serie.gule,
                        rodeSerie: cardCounts.serie.rode,
                        guleCup: cardCounts.cup.gule,
                        rodeCup: cardCounts.cup.rode,
                        serieAtRisk: serieHint.isAtRisk,
                        kjemi: window.calculatePlayerPerformanceChemistry(p.navn),
                        snittBors: ratingCount > 0 ? ratingSum / ratingCount : 0,
                        bb
                    };
                });
        };

        window.renderStatsHeroTabsHtml = function(activeTabId) {
            const tabs = [
                { id: 'lag', label: 'Lag' },
                { id: 'spillere', label: 'Spillere' },
                { id: 'kampstat', label: 'Kamper' }
            ];

            return `
                <div class="stats-hero-tabs">
                    <div class="roster-status-filter stats-hero-tablist" role="tablist" aria-label="Statistikkfaner">
                        ${tabs.map(tab => `
                            <button
                                type="button"
                                onclick="switchStatTab('${tab.id}')"
                                id="stat-tab-${tab.id}"
                                class="stat-tab-btn roster-status-btn ${activeTabId === tab.id ? 'is-active' : ''}"
                            >${tab.label}</button>
                        `).join('')}
                        <button
                            type="button"
                            onclick="window.openStatsFormInfoModal()"
                            class="roster-status-btn stats-chrome-info-btn"
                            title="Slik regnes form"
                            aria-label="Slik regnes form"
                        >
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        window.playerStatsRelevantForSort = function(stat, column) {
            switch (column) {
                case 'guleSerie': return stat.guleSerie > 0;
                case 'rodeSerie': return stat.rodeSerie > 0;
                case 'mal': return stat.mal > 0;
                case 'assist': return stat.assist > 0;
                case 'bb': return stat.bb > 0;
                case 'kamper': return stat.kamper > 0;
                case 'kampbonus': return stat.attendedMatches > 0;
                case 'kjemi': return stat.kjemi > 0;
                case 'snittBors': return stat.snittBors > 0;
                case 'oppmotePct': return stat.oppmotePct > 0;
                default: return true;
            }
        };

        window.getStatsSortEmptyMessage = function(column, searchTerm) {
            if (searchTerm) return 'Ingen spillere matcher søket.';

            const labels = {
                guleSerie: 'gule kort',
                rodeSerie: 'røde kort',
                mal: 'mål',
                assist: 'assist',
                bb: 'banens beste',
                kamper: 'kamper',
                kampbonus: 'kampbidrag',
                kjemi: 'form',
                snittBors: 'spillerbørs',
                oppmotePct: 'oppmøte'
            };

            const label = labels[column];
            return label
                ? `Ingen spillere med registrerte ${label}.`
                : 'Ingen spillere funnet for valgt lag.';
        };

        window.clearStatsTabHero = function() {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = '';
            hero.innerHTML = '';
        };

        window.paintStatsChrome = function(markup) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = 'stats-chrome';
            hero.innerHTML = markup;
            if (typeof window.syncStatsLagFilterPlacement === 'function') {
                window.syncStatsLagFilterPlacement();
            }
        };

        window.paintStatsTabHero = function(markup) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = 'stats-hero-panel';
            hero.innerHTML = markup;
            if (typeof window.syncStatsLagFilterPlacement === 'function') {
                window.syncStatsLagFilterPlacement();
            }
        };

        window.renderStatsChromeTabsOnly = function(tabsHtml) {
            return `
                <div class="stats-chrome-bar stats-chrome-bar-centered">
                    <div class="stats-chrome-actions">${tabsHtml}</div>
                </div>
            `;
        };

        window.renderStatsChromeBar = function(title, tabsHtml, subtitleHtml = '') {
            return `
                <div class="stats-chrome-bar">
                    <div class="stats-chrome-main">
                        <h2 class="stats-chrome-title">${title}</h2>
                        ${subtitleHtml}
                    </div>
                    <div class="stats-chrome-actions">${tabsHtml}</div>
                </div>
            `;
        };

        window.renderStatsInlineMetricHtml = function(label, value, toneClass = '', clickHandler = '') {
            const tag = clickHandler ? 'button' : 'div';
            const attrs = clickHandler
                ? ` type="button" onclick="${clickHandler}" class="stats-inline-metric stats-inline-metric-clickable"`
                : ` class="stats-inline-metric"`;
            return `
                <${tag}${attrs}>
                    <span class="stats-inline-metric-label">${label}</span>
                    <span class="stats-inline-metric-value ${toneClass}">${value}</span>
                </${tag}>
            `;
        };

        window.getStatsTeamMedian = function(statsData, column) {
            const values = statsData
                .map(stat => Number(stat[column]))
                .filter(value => !Number.isNaN(value));
            if (!values.length) return null;

            values.sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);
            return values.length % 2 === 0
                ? (values[mid - 1] + values[mid]) / 2
                : values[mid];
        };

        window.formatStatsSortValue = function(column, value) {
            const numeric = Number(value);
            if (Number.isNaN(numeric)) return '-';

            if (column === 'oppmotePct') return `${Math.round(numeric)}%`;
            if (column === 'kjemi') return String(Math.round(numeric));
            if (column === 'kampbonus' || column === 'snittBors') return numeric > 0 ? numeric.toFixed(1) : '-';
            if (numeric > 0 || column === 'kamper') return String(Math.round(numeric));
            return '-';
        };

        window.formatStatsMedianDelta = function(column, playerValue, median) {
            if (median === null || median === undefined) return { text: '', tone: 'is-equal' };

            const delta = Number(playerValue) - Number(median);
            if (Number.isNaN(delta)) return { text: '', tone: 'is-equal' };

            if (Math.abs(delta) < 0.05) {
                return { text: '+0', tone: 'is-equal' };
            }

            const rounded = column === 'oppmotePct'
                ? Math.round(delta)
                : (column === 'kampbonus' || column === 'snittBors')
                    ? Math.round(delta * 10) / 10
                    : Math.round(delta);
            const suffix = column === 'oppmotePct' ? '%' : '';
            const sign = rounded > 0 ? '+' : '';
            return {
                text: `${sign}${rounded}${suffix}`,
                tone: rounded > 0 ? 'is-above' : 'is-below'
            };
        };

        window.getStatsSortedLeader = function(sortCol, statsData) {
            const relevantStats = statsData.filter(stat => window.playerStatsRelevantForSort(stat, sortCol));
            relevantStats.sort((a, b) => (
                currentStatSortDesc
                    ? b[sortCol] - a[sortCol]
                    : a[sortCol] - b[sortCol]
            ));
            return relevantStats[0] || null;
        };

        window.getStatsSortMedian = function(column, statsData, teamName) {
            const pool = statsData.filter(stat => {
                if (teamName && stat.spillerLag !== teamName) return false;
                return window.playerStatsRelevantForSort(stat, column);
            });

            if (column === 'kjemi' && typeof window.getTeamFormMedian === 'function') {
                return window.getTeamFormMedian(teamName || '');
            }

            return window.getStatsTeamMedian(pool, column);
        };

        window.renderStatsSpillereLeaderNameCardHtml = function(leader) {
            if (!leader) {
                return `
                    <div class="stats-inline-metric">
                        <span class="stats-inline-metric-value is-bsk-blue stats-leader-name">-</span>
                    </div>
                `;
            }

            const safeName = String(leader.navn).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `
                <button type="button" onclick="window.openSpillerDetail('${safeName}')" class="stats-inline-metric stats-inline-metric-clickable">
                    <span class="stats-inline-metric-value is-bsk-blue stats-leader-name">${leader.navn}</span>
                </button>
            `;
        };

        window.renderStatsSpillereMetricCardHtml = function(column, leader, statsData) {
            if (!leader) {
                return `
                    <div class="stats-inline-metric">
                        <span class="stats-inline-metric-value is-bsk-blue">-</span>
                    </div>
                `;
            }

            const option = window.getStatsSortOption(column);
            const iconHtml = window.renderStatsSortIconHtml(option, 'stats-sort-context-icon');
            const value = leader[column];
            const median = window.getStatsSortMedian(column, statsData, leader.spillerLag || '');
            const mainText = window.formatStatsSortValue(column, value);
            const delta = window.formatStatsMedianDelta(column, value, median);

            return `
                <div class="stats-inline-metric">
                    <span class="stats-inline-metric-value stats-sort-context-value is-bsk-blue">
                        ${iconHtml}
                        <span class="stats-sort-context-main">${mainText}</span>
                        ${delta.text ? `<span class="stats-sort-context-delta ${delta.tone}">${delta.text}</span>` : ''}
                    </span>
                </div>
            `;
        };

        window.renderStatsSpillereSummaryCardsHtml = function(statsData) {
            const leader = window.getStatsSortedLeader(currentStatSortCol, statsData);

            return `
                ${window.renderStatsSpillereLeaderNameCardHtml(leader)}
                ${window.renderStatsSpillereMetricCardHtml(currentStatSortCol, leader, statsData)}
                ${window.renderStatsSpillereMetricCardHtml('kjemi', leader, statsData)}
                ${window.renderStatsSpillereMetricCardHtml('kampbonus', leader, statsData)}
            `;
        };

        window.renderStatsLagSummary = function() {
            const container = document.getElementById('stats-lag-summary');
            const data = window._statsLagData;
            if (!container) return;
            if (!data) {
                container.innerHTML = '';
                return;
            }

            const formGuide = window.getTeamFormGuide(data.filterLag);
            const getPillClass = (form) => {
                if (form === 'S') return 'is-win';
                if (form === 'T') return 'is-loss';
                return 'is-draw';
            };
            const formRowHtml = formGuide.length
                ? `<span class="stats-form-label">Form siste ${formGuide.length}</span><div class="stats-form-pills">${formGuide.map(item => `<span class="dashboard-series-form-pill ${getPillClass(item.form)}" title="${item.tooltip}">${item.text}</span>`).join('')}</div>`
                : `<span class="stats-form-empty">Ingen registrerte kamper ennå</span>`;

            container.innerHTML = `
                <div class="stats-summary-panel">
                    <div class="stats-form-row is-light">${formRowHtml}</div>
                    <div class="stats-inline-metrics">
                        ${window.renderStatsInlineMetricHtml('Seire', data.wins, 'is-win')}
                        ${window.renderStatsInlineMetricHtml('Uavgjorte', data.draws, 'is-draw')}
                        ${window.renderStatsInlineMetricHtml('Tap', data.losses, 'is-loss')}
                        ${window.renderStatsInlineMetricHtml('Mål scoret', data.goals, 'is-goals')}
                        ${window.renderStatsInlineMetricHtml('Snitt scoret', data.goalsAvg)}
                        ${window.renderStatsInlineMetricHtml('Snitt innslipp', data.concededAvg, 'is-loss')}
                        ${window.renderStatsInlineMetricHtml('Spillere', data.playerCount)}
                        ${window.renderStatsInlineMetricHtml('Oppmøte', `${data.avgAttendance}%`, 'is-win')}
                    </div>
                </div>
            `;
        };

        window.renderStatsSpillereSummary = function() {
            const container = document.getElementById('stats-spillere-summary');
            if (!container) return;

            const allStats = window.buildPlayerStatsData();
            const statsData = allStats.filter(s => s.kamper > 0 || s.kjemi > 0);

            container.innerHTML = `
                <div class="stats-summary-panel">
                    <div class="stats-inline-metrics stats-spillere-summary-metrics">
                        ${window.renderStatsSpillereSummaryCardsHtml(statsData)}
                    </div>
                </div>
            `;
        };

        window.renderStatsKampContext = function() {
            const container = document.getElementById('stats-kamp-context');
            const data = window._statsKampHeroData;
            if (!container) return;
            if (!data) {
                container.innerHTML = '';
                return;
            }

            const { playedMatches, matchId, matchType, matchGroup, dateStr, pitch, matchResult } = data;
            const currentIdx = playedMatches.findIndex(m => m.id === matchId);

            container.innerHTML = `
                <div class="stats-kamp-bar">
                    <div class="stats-kamp-bar-row">
                        <div class="stats-kamp-matchline">
                            <span class="stats-kamp-vs">BSK</span>
                            <span class="stats-kamp-vs-sep">–</span>
                            <span class="stats-kamp-select-wrap stats-hero-select-wrap">
                                <select id="kampstat-match-select" onfocus="expandKampSelectLabels()" onmousedown="expandKampSelectLabels()" onblur="collapseKampSelectLabel()" onchange="showMatchStatsTable()" class="portal-field portal-field-display truncate">
                                    ${playedMatches.map(m => {
                                        const optionDate = m.date ? new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                                        const shortText = m.opponent || 'Motstander';
                                        const fullText = `${m.opponent || 'Motstander'}${optionDate ? ' · ' + optionDate : ''}${m.result ? ' · ' + m.result : ''}`;
                                        return `<option value="${m.id}" data-short="${shortText}" data-full="${fullText}" ${m.id === matchId ? 'selected' : ''}>${shortText}</option>`;
                                    }).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down"></i>
                            </span>
                        </div>
                        <span class="stats-kamp-bar-result">${matchResult}</span>
                    </div>
                    <div class="stats-kamp-bar-meta">
                        <span>${[matchType, matchGroup, dateStr, pitch].filter(Boolean).join(' · ')}</span>
                        <div class="stats-kamp-nav">
                            <button type="button" onclick="window.navigateKampstatMatch(-1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx <= 0 ? 'disabled' : ''} title="Forrige kamp"><i class="fa-solid fa-chevron-left"></i></button>
                            <span>${currentIdx + 1} / ${playedMatches.length}</span>
                            <button type="button" onclick="window.navigateKampstatMatch(1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx >= playedMatches.length - 1 ? 'disabled' : ''} title="Neste kamp"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
            `;
            if (typeof window.collapseKampSelectLabel === 'function') window.collapseKampSelectLabel();
        };

        window.syncStatsLagFilterPlacement = function() {
            const hero = document.getElementById('stats-tab-hero');
            const wrap = document.getElementById('statsLagFilterWrap');
            const view = document.getElementById('view-statistikk');
            if (!wrap || !view) return;

            const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];
            const showFilter = teams.length > 1;
            const heroReady = hero && (hero.classList.contains('stats-hero-panel') || hero.classList.contains('stats-chrome'));

            if (!showFilter || !heroReady) {
                wrap.classList.add('hidden');
                if (wrap.parentElement !== view) view.appendChild(wrap);
                return;
            }

            wrap.classList.remove('hidden');
            if (wrap.parentElement !== hero) hero.insertBefore(wrap, hero.firstChild);
        };

        window.renderStatsTabHero = function(tabId) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;

            const heroTabsHtml = window.renderStatsHeroTabsHtml(tabId);

            if (tabId === 'lag') {
                const data = window._statsLagData;
                if (!data) {
                    window.clearStatsTabHero();
                    const summary = document.getElementById('stats-lag-summary');
                    if (summary) summary.innerHTML = '';
                    return;
                }

                window.paintStatsChrome(window.renderStatsChromeBar('Laganalyse', heroTabsHtml));
                window.renderStatsLagSummary();
                return;
            }

            if (tabId === 'spillere') {
                window.paintStatsChrome(window.renderStatsChromeTabsOnly(heroTabsHtml));
                window.renderStatsSpillereSummary();
                return;
            }

            if (tabId === 'kampstat') {
                window.paintStatsChrome(window.renderStatsChromeBar('Kampanalyse', heroTabsHtml));
                window.renderStatsKampContext();
            }
        };

        window.renderSpillerDetailHero = function(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player) {
            const heroTabsHtml = window.renderStatsHeroTabsHtml('spillere');
            const summary = document.getElementById('stats-spillere-summary');
            if (summary) summary.innerHTML = '';

            window.paintStatsChrome(window.renderStatsChromeBar(
                playerName,
                `
                    ${heroTabsHtml}
                    <div class="stats-chrome-badge">
                        <span>Snitt ${avgPoints ? avgPoints.toFixed(1) : '-'}</span>
                        <span class="stats-chrome-badge-sep">·</span>
                        <span>Form ${chemistry}/100</span>
                    </div>
                `,
                `<p class="stats-chrome-subtitle">${player.pos1 || 'Spiller'} · ${player.spillerLag || ''} · ${formComparison}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}</p>`
            ));
        };

        window.getStatsPlayerSearchTerm = function() {
            const el = document.getElementById('statsPlayerSearchInput');
            return (el ? el.value : '').trim().toLowerCase();
        };

        window.handleStatsPlayerSearchChange = function() {
            if (window._statsSelectedPlayer) return;
            const spillereView = document.getElementById('stat-view-spillere');
            if (spillereView && !spillereView.classList.contains('hidden')) {
                window.renderPlayerStatsList();
            }
        };

        window.renderPlayerStatsList = function() {
            const list = document.getElementById('stats-player-list');
            if (!list) return;

            let statsData = window.buildPlayerStatsData();
            const searchTerm = window.getStatsPlayerSearchTerm();

            if (searchTerm) {
                statsData = statsData.filter(stat => {
                    const player = (window.activePlayers || []).find(p => p.navn === stat.navn);
                    const posStr = player && player.pos2 && player.pos2 !== '-'
                        ? `${player.pos1} / ${player.pos2}`
                        : (stat.pos1 || '');
                    const haystack = [
                        stat.navn,
                        player && player.draktnummer ? String(player.draktnummer) : '',
                        posStr,
                        stat.spillerLag
                    ].join(' ').toLowerCase();
                    return haystack.includes(searchTerm);
                });
            }

            statsData = statsData.filter(stat => window.playerStatsRelevantForSort(stat, currentStatSortCol));

            statsData.sort((a, b) => {
                if (currentStatSortCol === 'navn') {
                    return currentStatSortDesc ? a.navn.localeCompare(b.navn) : b.navn.localeCompare(a.navn);
                }
                return currentStatSortDesc ? b[currentStatSortCol] - a[currentStatSortCol] : a[currentStatSortCol] - b[currentStatSortCol];
            });

            if (!statsData.length) {
                list.innerHTML = `<div class="stats-player-empty">${window.getStatsSortEmptyMessage(currentStatSortCol, searchTerm)}</div>`;
                return;
            }

            list.innerHTML = statsData.map(stat => {
                const activeSortCol = currentStatSortCol;
                const formTone = typeof window.getFormScoreTone === 'function' ? window.getFormScoreTone(stat.kjemi, stat.spillerLag) : 'none';
                const formClass = formTone === 'green' ? 'is-high' : formTone === 'amber' ? 'is-mid' : formTone === 'red' ? 'is-low' : 'is-neutral';
                const formSortActiveClass = activeSortCol === 'kjemi' ? ' is-sort-active' : '';
                const bonusClass = stat.kampbonus > 15 ? 'is-high' : stat.kampbonus >= 10 ? 'is-mid' : stat.kampbonus > 0 ? 'is-low' : 'is-neutral';
                const kbSortActiveClass = activeSortCol === 'kampbonus' ? ' is-sort-active' : '';
                const bonusText = stat.attendedMatches > 0 ? stat.kampbonus.toFixed(1) : '-';
                const borsText = stat.snittBors > 0 ? stat.snittBors.toFixed(1) : '-';
                const safeName = String(stat.navn).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                const extras = [];
                if (stat.mal > 0) extras.push(window.renderStatsMetaPartHtml('mal', String(stat.mal)));
                if (stat.assist > 0) extras.push(window.renderStatsMetaPartHtml('assist', String(stat.assist)));
                if (stat.bb > 0) extras.push(window.renderStatsMetaPartHtml('bb', String(stat.bb)));
                if (stat.guleSerie > 0) extras.push(window.renderStatsMetaPartHtml('guleSerie', String(stat.guleSerie)));
                if (stat.rodeSerie > 0) extras.push(window.renderStatsMetaPartHtml('rodeSerie', String(stat.rodeSerie)));

                const metaParts = [
                    `<span class="stats-meta-pos">${stat.pos1 || 'Spiller'}</span>`,
                    window.renderStatsMetaPartHtml('kamper', String(stat.kamper)),
                    window.renderStatsMetaPartHtml('oppmotePct', `${stat.oppmotePct}%`),
                    window.renderStatsMetaPartHtml('snittBors', borsText)
                ];
                if (extras.length) metaParts.push(...extras);

                const kampbidragIcon = window.renderStatsSortIconHtml(window.getStatsSortOption('kampbonus'), 'stats-kb-icon');

                return `
                    <button type="button" onclick="window.openSpillerDetail('${safeName}')" class="roster-player-row stats-player-row" aria-label="${stat.navn}, form ${stat.kjemi}, snittbørs ${borsText}, kampbidrag ${bonusText}">
                        <div class="stats-form-jersey ${formClass}${formSortActiveClass}" aria-hidden="true">
                            <span class="stats-form-jersey-value">${stat.kjemi}</span>
                            <span class="stats-form-jersey-label">Form</span>
                        </div>
                        <div class="roster-player-main">
                            <div class="roster-player-name">${stat.navn}${formTone === 'green' ? ' <span class="stats-player-star">★</span>' : ''}</div>
                            <div class="roster-player-meta">${metaParts.join('<span class="roster-player-meta-sep">·</span>')}</div>
                        </div>
                        <div class="roster-player-side">
                            <span class="stats-kb-badge ${bonusClass}${kbSortActiveClass}" title="Kampbidrag">${kampbidragIcon}<span>${bonusText}</span></span>
                        </div>
                    </button>
                `;
            }).join('');
        };
        
        window.switchStatTab = function(tabId) {
            const statViewActiveClasses = {
                lag: 'block space-y-4',
                spillere: 'block space-y-4',
                kampstat: 'block space-y-4'
            };

            ['lag', 'spillere', 'kampstat'].forEach(id => {
                const view = document.getElementById(`stat-view-${id}`);
                if (view) view.className = id === tabId ? statViewActiveClasses[id] : 'hidden';
            });

            document.querySelectorAll('.stat-tab-btn').forEach(btn => {
                btn.classList.remove('is-active');
            });

            const activeBtn = document.getElementById(`stat-tab-${tabId}`);
            if (activeBtn) activeBtn.classList.add('is-active');

            if (tabId === 'lag') window.renderStatistikkSide();
            if (tabId === 'spillere') {
                if (window._statsSelectedPlayer) window.renderSpillereDetail(window._statsSelectedPlayer);
                else window.renderSpillereView();
            }
            if (tabId === 'kampstat') window.renderMatchStatsView();
        };


        window.statsEmptyStateHtml = function(icon, title, text) {
            return `
                <div class="stats-panel">
                    <div class="stats-empty-state">
                        <i class="fa-solid ${icon}"></i>
                        <h3>${title}</h3>
                        <p>${text}</p>
                    </div>
                </div>
            `;
        };

        window.statsMetricCardHtml = function(label, value, sub, icon, iconClass = 'text-bsk-blue', playerName = '') {
            const safeName = playerName
                ? String(playerName).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
                : '';
            const clickAttrs = safeName
                ? ` role="button" tabindex="0" onclick="window.openSpillerDetail('${safeName}')" class="stats-metric-card stats-metric-card-clickable"`
                : ` class="stats-metric-card"`;

            return `
                <div${clickAttrs}>
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">${label}</span>
                        <div class="stats-metric-icon">
                            <i class="fa-solid ${icon} ${iconClass}"></i>
                        </div>
                    </div>
                    <div class="stats-metric-value">${value || '-'}</div>
                    <div class="stats-metric-sub">${sub || ''}</div>
                </div>
            `;
        };

        window.statsSmallTableHtml = function(title, subtitle, headers, rowsHtml) {
            return `
                <div class="stats-table-panel">
                    <div class="stats-panel-header">
                        <h3 class="stats-panel-title">${title}</h3>
                        <p class="stats-panel-subtitle">${subtitle}</p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="stats-table-head">
                                <tr>${headers}</tr>
                            </thead>
                            <tbody class="stats-table-body divide-y divide-slate-100">
                                ${rowsHtml || `
                                    <tr>
                                        <td colspan="6" class="p-5 text-center text-slate-400 italic text-xs">Ingen data ennå</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };
        
        window.STATS_PLAYER_SORT_OPTIONS = [
            { id: 'kampbonus', label: 'Kampbidrag', icon: 'fa-chart-line' },
            { id: 'kjemi', label: 'Form', icon: 'fa-heart-pulse' },
            { id: 'snittBors', label: 'Snittbørs', icon: 'fa-star' },
            { id: 'mal', label: 'Mål', icon: 'fa-futbol' },
            { id: 'assist', label: 'Assist', icon: 'fa-handshake-angle' },
            { id: 'guleSerie', label: 'Gule kort', glyph: 'g' },
            { id: 'rodeSerie', label: 'Røde kort', glyph: 'r' },
            { id: 'bb', label: 'Banens beste', icon: 'fa-crown' },
            { id: 'oppmotePct', label: 'Oppmøte', icon: 'fa-user-check' },
            { id: 'kamper', label: 'Kamper', icon: 'fa-shield-halved' }
        ];

        window.getStatsSortOption = function(id) {
            return (window.STATS_PLAYER_SORT_OPTIONS || []).find(opt => opt.id === id);
        };

        window.renderStatsSortIconHtml = function(option, extraClass = '') {
            if (!option) return '';
            const classSuffix = extraClass ? ` ${extraClass}` : '';
            if (option.glyph) {
                return `<i class="stats-sort-glyph stats-sort-glyph-${option.glyph}${classSuffix}" aria-hidden="true"></i>`;
            }
            return `<i class="fa-solid ${option.icon}${classSuffix}" aria-hidden="true"></i>`;
        };

        window.renderStatsMetaPartHtml = function(id, text) {
            const option = window.getStatsSortOption(id);
            const iconHtml = window.renderStatsSortIconHtml(option, 'stats-meta-icon');
            const activeClass = id === currentStatSortCol ? ' is-sort-active' : '';
            return `<span class="stats-meta-part${activeClass}" data-stat-meta="${id}">${iconHtml}<span class="stats-meta-text">${text}</span></span>`;
        };

        window.renderStatsSortButtonsHtml = function(activeCol) {
            return window.STATS_PLAYER_SORT_OPTIONS.map(opt => `
                <button
                    type="button"
                    onclick="sortStatsTable('${opt.id}')"
                    class="roster-status-btn stats-sort-btn ${activeCol === opt.id ? 'is-active' : ''}"
                    data-sort-col="${opt.id}"
                    aria-label="${opt.label}"
                    title="${opt.label}"
                >
                    ${opt.glyph
                        ? `<i class="stats-sort-glyph stats-sort-glyph-${opt.glyph}" aria-hidden="true"></i>`
                        : `<i class="fa-solid ${opt.icon} ${opt.iconClass || ''}" aria-hidden="true"></i>`
                    }
                    <span class="stats-sort-label">${opt.label}</span>
                </button>
            `).join('');
        };

        window.updateStatsSortButtons = function() {
            document.querySelectorAll('.stats-sort-btn[data-sort-col]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.sortCol === currentStatSortCol);
            });
            window.centerStatsSortButton('smooth');
        };

        window.syncStatsSortScroller = function() {
            const scroller = document.getElementById('stats-player-sort-scroller');
            const wrap = scroller?.closest('.stats-sort-scroller-wrap');
            if (!scroller || !wrap) return;

            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            wrap.classList.toggle('can-scroll-left', scroller.scrollLeft > 6);
            wrap.classList.toggle('can-scroll-right', maxScroll > 6 && scroller.scrollLeft < maxScroll - 6);
        };

        window.centerStatsSortButton = function(behavior = 'smooth') {
            const scroller = document.getElementById('stats-player-sort-scroller');
            const active = scroller?.querySelector('.stats-sort-btn.is-active');
            if (!scroller || !active) return;

            requestAnimationFrame(() => {
                const target = active.offsetLeft - (scroller.clientWidth / 2) + (active.offsetWidth / 2);
                scroller.scrollTo({ left: Math.max(0, target), behavior });
                if (behavior === 'auto') {
                    window.syncStatsSortScroller();
                } else {
                    setTimeout(window.syncStatsSortScroller, 280);
                }
            });
        };

        window.bindStatsSortScroller = function() {
            const scroller = document.getElementById('stats-player-sort-scroller');
            if (!scroller) return;

            scroller.addEventListener('scroll', window.syncStatsSortScroller, { passive: true });
            window.centerStatsSortButton('auto');
        };

        window.openStatsFormInfoModal = function() {
            const modal = document.getElementById('kjemi-info-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        window.renderSpillereView = function() {
            window._statsSelectedPlayer = null;
            const container = document.getElementById('stat-spillere-content');
            if (!container) return;

            window.renderStatsTabHero('spillere');
            const searchValue = window.getStatsPlayerSearchTerm();

            container.innerHTML = `
                <div class="stats-spillere-layout">
                    <div class="stats-player-search-row">
                        <div class="roster-search-wrap">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="search" id="statsPlayerSearchInput" oninput="handleStatsPlayerSearchChange()" placeholder="Søk etter navn, drakt eller posisjon…" class="roster-search-input" aria-label="Søk spillere i statistikk">
                        </div>
                    </div>
                    <div id="stats-player-list" class="roster-list stats-player-list"></div>
                    <div class="stats-player-sort-dock" aria-label="Sorter spillere">
                        <div class="stats-player-toolbar">
                            <div class="stats-sort-scroller-wrap">
                                <div class="stats-sort-scroller-fade stats-sort-scroller-fade-left" aria-hidden="true">
                                    <i class="fa-solid fa-chevron-left"></i>
                                </div>
                                <div class="stats-sort-scroller" id="stats-player-sort-scroller">
                                    <div class="roster-status-filter stats-sort-filter" role="tablist" aria-label="Sorter spillere">
                                        ${window.renderStatsSortButtonsHtml(currentStatSortCol)}
                                    </div>
                                </div>
                                <div class="stats-sort-scroller-fade stats-sort-scroller-fade-right" aria-hidden="true">
                                    <i class="fa-solid fa-chevron-right"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const searchInput = document.getElementById('statsPlayerSearchInput');
            if (searchInput && searchValue) searchInput.value = searchValue;

            window.bindStatsSortScroller();
            window.renderPlayerStatsList();
        };


        window.openSpillerDetail = function(playerName) {
            if (!playerName) return;
            window._statsSelectedPlayer = playerName;

            const spillereView = document.getElementById('stat-view-spillere');
            if (spillereView && spillereView.classList.contains('hidden') && typeof window.switchStatTab === 'function') {
                window.switchStatTab('spillere');
                return;
            }

            window.renderSpillereDetail(playerName);
        };

        window.showSpillereOverview = function() {
            window.renderSpillereView();
        };

        window.renderSpillereDetail = function(playerName) {
            const container = document.getElementById('stat-spillere-content');
            if (!container || !playerName) return;

            const player = (window.activePlayers || []).find(p => p.navn === playerName);
            const history = typeof window.getPlayerMatchPointsHistory === 'function'
                ? window.getPlayerMatchPointsHistory(playerName)
                : [];

            if (!player || history.length === 0) {
                if (player && typeof window.renderSpillerDetailHero === 'function') {
                    window.renderSpillerDetailHero(playerName, 0, 0, 0, 'Ingen sammenligning', 0, player);
                }
                container.innerHTML = `
                    <div class="stats-player-detail">
                        <button type="button" onclick="window.showSpillereOverview()" class="stats-player-back-btn portal-btn portal-btn-secondary portal-btn-sm">
                            <i class="fa-solid fa-arrow-left"></i> Tilbake til oversikt
                        </button>
                        ${window.statsEmptyStateHtml(
                            'fa-circle-info',
                            'Ingen spilte kamper',
                            'Ingen spilte kamper er registrert for denne spilleren ennå.'
                        )}
                    </div>
                `;
                return;
            }

            const chemistry = typeof window.calculatePlayerPerformanceChemistry === 'function'
                ? window.calculatePlayerPerformanceChemistry(playerName)
                : 0;
            const teamMedian = typeof window.getTeamFormMedian === 'function'
                ? window.getTeamFormMedian(player.spillerLag)
                : 0;
            const formComparison = teamMedian > 0
                ? (chemistry >= teamMedian + 8 ? 'Over lagssnitt' : chemistry < teamMedian - 8 ? 'Under lagssnitt' : 'Om lagssnitt')
                : 'Ingen sammenligning';

            const totalMatches = history.length;
            const ratings = history.map(h => Number(h.rating)).filter(r => !isNaN(r) && r > 0);
            const avgRating = ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
            const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
            const avgPoints = totalMatches ? totalPoints / totalMatches : 0;

            let totalGoals = 0;
            let totalAssists = 0;
            let totalYellowSerie = 0;
            let totalYellowCup = 0;
            let totalRedSerie = 0;
            let totalRedCup = 0;
            let totalBb = 0;

            history.forEach(h => {
                const m = (window.activeMatches || []).find(match => match.id === h.matchId);
                if (!m) return;
                totalGoals += Number(window.getPlayerRefMapValue(m.scorers, player, 0)) || 0;
                totalAssists += Number(window.getPlayerRefMapValue(m.assists, player, 0)) || 0;
                if (m.matchType === 'Serie') {
                    totalYellowSerie += window.playerRefListIncludes(m.guleKort, player) ? 1 : 0;
                    totalRedSerie += window.playerRefListIncludes(m.rodeKort, player) ? 1 : 0;
                } else if (m.matchType === 'Cup') {
                    totalYellowCup += window.playerRefListIncludes(m.guleKort, player) ? 1 : 0;
                    totalRedCup += window.playerRefListIncludes(m.rodeKort, player) ? 1 : 0;
                }
                totalBb += window.motmMatchesPlayer(m.motm, player) ? 1 : 0;
            });

            window.renderSpillerDetailHero(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player);

            const card = window.statsMetricCardHtml;
            const trendData = typeof window.getPlayerPerformanceTrend === 'function'
                ? window.getPlayerPerformanceTrend(playerName)
                : [];
            const matchHistoryHtml = typeof window.renderPlayerFormHistoryTableHtml === 'function'
                ? window.renderPlayerFormHistoryTableHtml(playerName, history)
                : '';

            container.innerHTML = `
                <div class="stats-player-detail">
                    <button type="button" onclick="window.showSpillereOverview()" class="stats-player-back-btn portal-btn portal-btn-secondary portal-btn-sm">
                        <i class="fa-solid fa-arrow-left"></i> Tilbake til oversikt
                    </button>

                    <div class="stats-metric-grid is-four">
                        ${card('Form', chemistry + '/100', 'Kampbidrag, oppmøte og disiplin', 'fa-heart-pulse', 'text-emerald-600')}
                        ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
                        ${card('Snittbørs', avgRating ? avgRating.toFixed(1) : '-', 'Gjennomsnittlig spillerbørs', 'fa-star', 'text-bsk-yellow')}
                        ${card('Mål / Assist', `${totalGoals} / ${totalAssists}`, `${totalBb} BB · Serie ${totalYellowSerie}/${totalRedSerie} · Cup ${totalYellowCup}/${totalRedCup}`, 'fa-chart-line', 'text-bsk-blue')}
                    </div>

                    <div class="stats-panel stats-player-chart-panel">
                        <div class="stats-panel-header">
                            <div class="stats-player-panel-heading">
                                <div class="min-w-0">
                                    <h3 class="stats-panel-title">Utvikling</h3>
                                    <p class="stats-panel-subtitle">Spiller vs lagets snitt per kamp. Nyeste kamp til høyre.</p>
                                </div>
                                <button type="button" onclick="window.openStatsFormInfoModal()" class="portal-btn portal-btn-success portal-btn-sm shrink-0">
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span class="hidden sm:inline">Slik regnes form</span>
                                </button>
                            </div>
                        </div>
                        <div class="stats-player-chart-wrap">
                            ${window.renderPlayerTrendChartSvg(trendData)}
                        </div>
                        <div class="stats-chart-legend" aria-hidden="true">
                            <span class="stats-chart-legend-item is-kampbidrag"><i></i> Spiller poeng</span>
                            <span class="stats-chart-legend-item is-form"><i></i> Spiller form</span>
                            <span class="stats-chart-legend-item is-team-kampbidrag"><i></i> Lag snitt</span>
                            <span class="stats-chart-legend-item is-team-form"><i></i> Lag form</span>
                        </div>
                    </div>

                    <div class="stats-panel stats-form-history-panel">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Form etter hver kamp — kamp for kamp</h3>
                        </div>
                        <div class="stats-form-history-table-wrap">${matchHistoryHtml}</div>
                    </div>
                </div>
            `;
        };

        window.showPlayerPointsTable = function() {
            const select = document.getElementById('poeng-player-select');
            const playerName = select ? select.value : window._statsSelectedPlayer;
            if (playerName) window.openSpillerDetail(playerName);
        };

        window.renderPointHistoryView = function() {
            window.renderSpillereView();
        };

        window.getFilteredPlayedMatches = function() {
            const filterLag = window.getStatsTeamFilter();
            return (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        };

        window.navigateKampstatMatch = function(direction) {
            const playedMatches = window.getFilteredPlayedMatches();
            const matchSelect = document.getElementById('kampstat-match-select');
            const currentId = window.pendingKampstatMatchId || (matchSelect ? matchSelect.value : '');
            const idx = playedMatches.findIndex(m => m.id === currentId);
            if (idx === -1) return;
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= playedMatches.length) return;
            window.pendingKampstatMatchId = playedMatches[nextIdx].id;
            window.showMatchStatsTable();
        };

        window.renderMatchStatsView = function() {
    const container = document.getElementById('stat-view-kampstat');
    if (!container) return;

    const playedMatches = window.getFilteredPlayedMatches();

    const html = `
    <div class="space-y-4">
        <div id="stats-kamp-context"></div>
        <div id="kampstat-table-container">
            <div class="stats-empty-state">
                <p class="text-slate-400 italic text-sm">
                    ${playedMatches.length ? 'Laster siste spilte kamp...' : 'Ingen spilte kamper med resultat er registrert ennå.'}
                </p>
            </div>
        </div>
    </div>
`;

    container.innerHTML = html;

    if (playedMatches.length > 0 && typeof window.showMatchStatsTable === 'function') {
        window.showMatchStatsTable();
    } else {
        window._statsKampHeroData = null;
        window.renderStatsTabHero('kampstat');
    }
};

        window.expandKampSelectLabels = function() {
            const select = document.getElementById('kampstat-match-select');
            if (!select) return;
        
            Array.from(select.options).forEach(option => {
                if (option.dataset.full) {
                    option.textContent = option.dataset.full;
                }
            });
        };
        
        window.collapseKampSelectLabel = function() {
            const select = document.getElementById('kampstat-match-select');
            if (!select) return;
        
            Array.from(select.options).forEach(option => {
                if (option.dataset.short) {
                    option.textContent = option.dataset.short;
                }
            });
        };

        window.showMatchStatsTable = function() {
    const matchSelect = document.getElementById('kampstat-match-select');

    const playedMatches = window.getFilteredPlayedMatches();

    const pendingMatchId = window.pendingKampstatMatchId;
    window.pendingKampstatMatchId = null;

    const matchId = pendingMatchId && playedMatches.some(m => m.id === pendingMatchId)
        ? pendingMatchId
        : (matchSelect && matchSelect.value
            ? matchSelect.value
            : (playedMatches[0] ? playedMatches[0].id : ''));
    
    const container = document.getElementById('kampstat-table-container');

    if (!container) return;

    if (!matchId) {
        window._statsKampHeroData = null;
        window.renderStatsTabHero('kampstat');
        container.innerHTML = '<div class="text-center py-10 text-slate-400 italic text-sm">Velg en kamp for å se statistikk for spillerne som deltok.</div>';
        return;
    }

    const match = (window.activeMatches || []).find(m => m.id === matchId);

    if (!match) {
    container.innerHTML = '<div class="text-center py-10 text-slate-500 font-medium">Fant ikke valgt kamp.</div>';
    return;
        }
        
        const participantRefs = typeof window.getMatchParticipantRefs === 'function'
            ? window.getMatchParticipantRefs(match)
            : window.getAttendingPlayerRefs(match.attendance);

        if (participantRefs.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-500 font-medium">Ingen spillere var registrert med oppmøte på denne kampen.</div>';
            return;
        }

        const sortedPlayers = [...(window.activePlayers || [])]
            .filter(p => participantRefs.some(ref => window.playerRefMatches(ref, p)));

        const fallbackPlayers = participantRefs
            .filter(ref => !sortedPlayers.some(p => window.playerRefMatches(ref, p)))
            .map(ref => window.findPlayerByRef(ref) || { id: ref, navn: window.getPlayerNameFromRef(ref) });

        const playersToRender = [...sortedPlayers, ...fallbackPlayers];

    const stats = playersToRender.map(playerObj => {
        const playerRef = playerObj.id || playerObj.navn;
        const rating = Number(window.getPlayerRefMapValue(match.ratings, playerObj, 0)) || 0;
        const goals = Number(window.getPlayerRefMapValue(match.scorers, playerObj, 0)) || 0;
        const assists = Number(window.getPlayerRefMapValue(match.assists, playerObj, 0)) || 0;
        const yellow = window.playerRefListIncludes(match.guleKort, playerObj) ? 1 : 0;
        const red = window.playerRefListIncludes(match.rodeKort, playerObj) ? 1 : 0;
        const isBbInMatch = window.motmMatchesPlayer(match.motm, playerObj);

        const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, playerObj, true)
            : { total: 0, base: 0, resultBonus: 0, ratingBonus: 0, bbBonus: 0 };

        return {
            name: playerObj.navn || window.getPlayerNameFromRef(playerRef),
            rating,
            goals,
            assists,
            yellow,
            red,
            isBbInMatch,
            points: pointsDetails.total || 0,
            base: pointsDetails.base || 0,
            resultBonus: pointsDetails.resultBonus || 0,
            ratingBonus: pointsDetails.ratingBonus || 0,
            bbBonus: pointsDetails.bbBonus || 0,
            breakdown: `${pointsDetails.onPitch === false ? 'Kun oppmøte' : 'Spilt'}: ${pointsDetails.base || 0} | Res/Mål: ${(pointsDetails.resultBonus || 0) > 0 ? '+' + pointsDetails.resultBonus : (pointsDetails.resultBonus || 0)} | Børs: ${(pointsDetails.ratingBonus || 0) > 0 ? '+' + pointsDetails.ratingBonus : (pointsDetails.ratingBonus || 0)} | BB: ${(pointsDetails.bbBonus || 0) > 0 ? '+' + pointsDetails.bbBonus : '-'}`
        };
    });

    stats.sort((a, b) => b.points - a.points || b.rating - a.rating || b.goals - a.goals || b.assists - a.assists);

    const dateStr = match.date
        ? new Date(match.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    const matchResult = match.result || '?';
    const matchType = match.type || match.matchType || 'Kamp';
    const matchGroup = match.matchGroup || match.team || '';
    const opponent = match.opponent || 'Motstander';
    const pitch = match.pitch || match.bane || '';

    window._statsKampHeroData = {
        playedMatches,
        matchId,
        matchType,
        matchGroup,
        dateStr,
        pitch,
        matchResult
    };
    window.renderStatsTabHero('kampstat');

    const avgRating = stats.filter(s => s.rating > 0).length
        ? stats.filter(s => s.rating > 0).reduce((sum, s) => sum + s.rating, 0) / stats.filter(s => s.rating > 0).length
        : 0;

    const totalGoals = stats.reduce((sum, s) => sum + s.goals, 0);
    const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
    const totalYellow = stats.reduce((sum, s) => sum + s.yellow, 0);
    const totalRed = stats.reduce((sum, s) => sum + s.red, 0);

    const bbPlayer = stats.find(s => s.isBbInMatch);
    const topScorer = [...stats].sort((a, b) => b.goals - a.goals)[0];
    const assistLeader = [...stats].sort((a, b) => b.assists - a.assists)[0];
    const pointsLeader = stats[0];

    const pointColor = (points) => {
        if (points >= 25) return 'text-emerald-600';
        if (points >= 18) return 'text-bsk-blue';
        if (points >= 10) return 'text-slate-700';
        return 'text-rose-600';
    };

    const scoreBadge = (value, type = 'neutral') => {
        const styles = {
            blue: 'bg-bsk-blue/10 text-bsk-blue border-bsk-blue/10',
            emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            amber: 'bg-amber-50 text-amber-700 border-amber-100',
            rose: 'bg-rose-50 text-rose-700 border-rose-100',
            indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            slate: 'bg-slate-50 text-slate-600 border-slate-100'
        };

        return `<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black border ${styles[type] || styles.slate}">${value}</span>`;
    };

    const rowsHtml = stats.map(s => {
        const baseVis = scoreBadge(`+${s.base}`, 'slate');
        const resultVis = scoreBadge(`${s.resultBonus > 0 ? '+' : ''}${s.resultBonus}`, s.resultBonus >= 0 ? 'blue' : 'rose');
        const ratingVis = s.rating > 0
            ? scoreBadge(`${s.ratingBonus > 0 ? '+' : ''}${s.ratingBonus}`, s.ratingBonus >= 0 ? 'emerald' : 'rose')
            : '<span class="text-slate-300 font-bold">-</span>';

        const goalVis = s.goals > 0
            ? scoreBadge(`⚽ +${s.goals}`, 'emerald')
            : '<span class="text-slate-300 font-bold">-</span>';

        const assistVis = s.assists > 0
            ? scoreBadge(`A ${s.assists}`, 'blue')
            : '<span class="text-slate-300 font-bold">-</span>';

       const yellowVis = s.yellow > 0
            ? scoreBadge('🟨 0', 'amber')
            : '<span class="text-slate-300 font-bold">-</span>';

        const redVis = s.red > 0
            ? scoreBadge('🟥 -10', 'rose')
            : '<span class="text-slate-300 font-bold">-</span>';

        const bbVis = s.isBbInMatch
            ? scoreBadge('👑 +1', 'indigo')
            : '<span class="text-slate-300 font-bold">-</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors" title="${s.breakdown}">
                <td class="p-4 font-black text-slate-800">${s.name}</td>
                <td class="p-4 text-center font-black text-lg ${pointColor(s.points)}">${s.points}</td>
	                <td class="p-4 text-center">${ratingVis}</td>
	                <td class="p-4 text-center">${goalVis}</td>
	                <td class="p-4 text-center">${assistVis}</td>
	                <td class="p-4 text-center">${bbVis}</td>
                <td class="p-4 text-center">${yellowVis}</td>
                <td class="p-4 text-center">${redVis}</td>
                <td class="p-4 text-center">${resultVis}</td>
                <td class="p-4 text-center">${baseVis}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="space-y-5">
            <div class="stats-metric-grid is-four">
                <div class="stats-metric-card">
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">Banens beste</span>
                        <div class="stats-metric-icon">👑</div>
                    </div>
                    <div class="stats-metric-value">${bbPlayer ? bbPlayer.name : '-'}</div>
                    <div class="stats-metric-sub">${bbPlayer ? '+1 BB-bonus' : 'Ingen BB registrert'}</div>
                </div>

                <div class="stats-metric-card">
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">Toppscorer</span>
                        <div class="stats-metric-icon">⚽</div>
                    </div>
                    <div class="stats-metric-value">${topScorer && topScorer.goals > 0 ? topScorer.name : '-'}</div>
                    <div class="stats-metric-sub">${topScorer && topScorer.goals > 0 ? topScorer.goals + ' mål' : 'Ingen mål registrert'}</div>
                </div>

                <div class="stats-metric-card">
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">Mest poeng</span>
                        <div class="stats-metric-icon"><i class="fa-solid fa-chart-line text-bsk-blue"></i></div>
                    </div>
                    <div class="stats-metric-value">${pointsLeader ? pointsLeader.name : '-'}</div>
                    <div class="stats-metric-sub">${pointsLeader ? pointsLeader.points + ' matchpoeng' : 'Ingen poengdata'}</div>
                </div>

                <div class="stats-metric-card">
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">Kampbildet</span>
                        <div class="stats-metric-icon"><i class="fa-solid fa-clipboard-list text-bsk-yellow"></i></div>
                    </div>
                    <div class="stats-metric-value">${avgRating ? avgRating.toFixed(1) : '-'}</div>
                    <div class="stats-metric-sub">Snittbørs · ${totalGoals} mål · ${totalAssists} assist · ${totalYellow}🟨 ${totalRed}🟥</div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div class="xl:col-span-2 stats-table-panel">
                    <div class="stats-panel-header">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="stats-panel-title">Spillerstatistikk</h3>
                                <p class="stats-panel-subtitle">
                                    Poengfordeling for spillerne som var registrert med oppmøte i kampen.
                                </p>
                            </div>
                        
                            <div class="flex items-center gap-2 shrink-0">
                                <button 
                                    onclick="document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');"
                                    class="portal-btn portal-btn-success portal-btn-sm"
                                >
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span class="sm:hidden">Form</span>
                                    <span class="hidden sm:inline">Slik regnes form</span>
                                </button>
                            
                                <button
                                    onclick="openMatchStatsEditor('${match.id}')"
                                    title="Rediger mål, assist, kort og spillerbørs"
                                    class="portal-btn portal-btn-icon-sm portal-btn-warning"
                                >
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="stats-table-head">
                                <tr>
                                    <th>Spiller</th>
                                    <th class="text-center">Poeng</th>
                                    <th class="text-center">Børs</th>
                                    <th class="text-center">Mål</th>
                                    <th class="text-center">Assist</th>
                                    <th class="text-center text-bsk-blue">BB</th>
                                    <th class="text-center">Gult</th>
                                    <th class="text-center">Rødt</th>
                                    <th class="text-center">Res/Mål</th>
                                    <th class="text-center">Start</th>
                                </tr>
                            </thead>
                            <tbody class="stats-table-body divide-y divide-slate-100">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="stats-panel">
                    <div class="stats-panel-header">
                        <h3 class="stats-panel-title">Kampoppsummering</h3>
                        <p class="stats-panel-subtitle">Kort bilde av kampen basert på registrerte data.</p>
                    </div>
                
                    <div class="p-5 space-y-4">
                        <div class="stats-mini-grid">
                            <div class="stats-mini-card">
                                <p class="stats-mini-label">Snittbørs</p>
                                <p class="stats-mini-value text-bsk-blue">${avgRating ? avgRating.toFixed(1) : '-'}</p>
                            </div>
                
                            <div class="stats-mini-card">
                                <p class="stats-mini-label">Mål</p>
                                <p class="stats-mini-value text-emerald-600">${totalGoals}</p>
                            </div>

                            <div class="stats-mini-card">
                                <p class="stats-mini-label">Assist</p>
                                <p class="stats-mini-value text-sky-600">${totalAssists}</p>
                            </div>
                
                            <div class="stats-mini-card">
                                <p class="stats-mini-label">Gule kort</p>
                                <p class="stats-mini-value text-amber-600">${totalYellow}</p>
                            </div>
                
                            <div class="stats-mini-card">
                                <p class="stats-mini-label">Røde kort</p>
                                <p class="stats-mini-value text-rose-600">${totalRed}</p>
                            </div>
                        </div>
                
                        <div class="border-t border-slate-100 pt-4 space-y-3">
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">👑 Banens beste</span>
                                <span class="text-xs font-black text-slate-800 text-right">${bbPlayer ? bbPlayer.name : '-'}</span>
                            </div>
                        
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">⚽ Toppscorer</span>
                                <span class="text-xs font-black text-slate-800 text-right">
                                    ${topScorer && topScorer.goals > 0 ? topScorer.name + ' · ' + topScorer.goals + ' mål' : '-'}
                                </span>
                            </div>

                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">A Assistkonge</span>
                                <span class="text-xs font-black text-slate-800 text-right">
                                    ${assistLeader && assistLeader.assists > 0 ? assistLeader.name + ' · ' + assistLeader.assists + ' assist' : '-'}
                                </span>
                            </div>
                        
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">📈 Mest poeng</span>
                                <span class="text-xs font-black text-slate-800 text-right">
                                    ${pointsLeader ? pointsLeader.name + ' · ' + pointsLeader.points + ' p' : '-'}
                                </span>
                            </div>

                            <div class="border-t border-slate-100 pt-4 space-y-3">
                                <p class="stats-mini-label">Trenernotater</p>
                                ${typeof window.buildMatchCoachNotesFieldsHtml === 'function' ? window.buildMatchCoachNotesFieldsHtml(match) : ''}
                            </div>
                            
                            <div class="pt-3">
                                <button 
                                    onclick="openTacticalPlanForMatch('${match.id}')"
                                    class="portal-btn portal-btn-primary portal-btn-lg portal-btn-full"
                                >
                                    <i class="fa-solid fa-chess-board text-bsk-yellow"></i>
                                    Gå til kampplan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
}; 

        window.openTacticalPlanForMatch = function(matchId) {
            switchTab('taktikk');
        
            setTimeout(() => {
                const select = document.getElementById('tacticalMatchSelect');
        
                if (select) {
                    select.value = matchId;
        
                    if (typeof window.loadMatchTactics === 'function') {
                        window.loadMatchTactics();
                    } else if (typeof loadMatchTactics === 'function') {
                        loadMatchTactics();
                    }
                }
            }, 100);
        };

        window.openMatchStatsEditor = function(matchId) {
            if (typeof window.showMatchDetails === 'function') {
                window.showMatchDetails(matchId);
        
                setTimeout(() => {
                    const section = document.getElementById('kampdetaljer-spillerbors');
        
                    if (section) {
                        section.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 150);
            }
        };

        window.sortStatsTable = function(column) {
            if (currentStatSortCol === column) currentStatSortDesc = !currentStatSortDesc;
            else { currentStatSortCol = column; currentStatSortDesc = true; }

            window.updateStatsSortButtons();
            window.renderPlayerStatsList();

            const spillereView = document.getElementById('stat-view-spillere');
            if (spillereView && !spillereView.classList.contains('hidden') && typeof window.renderStatsSpillereSummary === 'function') {
                window.renderStatsSpillereSummary();
            }
        };

        
        window.renderPlayerStatsTable = function() {
            window.renderPlayerStatsList();
        };


window.getPlayerMatchPointsHistory = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];
    
    const history = [];
    
    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== playerObj.spillerLag || !window.isPlayerAttending(m.attendance, playerObj)) return;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return;

        const ptsDetails = window.calculatePlayerMatchPoints(m, playerObj, true);
        const goals = Number(window.getPlayerRefMapValue(m.scorers, playerObj, 0)) || 0;
        const assists = Number(window.getPlayerRefMapValue(m.assists, playerObj, 0)) || 0;
        const yellow = window.playerRefListIncludes(m.guleKort, playerObj);
        const red = window.playerRefListIncludes(m.rodeKort, playerObj);
        const bb = window.motmMatchesPlayer(m.motm, playerObj);

        history.push({
            matchId: m.id,
            date: m.date,
            opponent: m.opponent,
            matchType: m.matchType || 'Kamp',
            result: m.result || 'Ikke spilt',
            rating: window.getPlayerRefMapValue(m.ratings, playerObj, '-') || '-',
            points: ptsDetails.total,
            onPitch: ptsDetails.onPitch !== false,
            goals,
            assists,
            yellow,
            red,
            bb,
            breakdownDetails: {
                base: ptsDetails.base,
                resultBonus: ptsDetails.resultBonus,
                ratingBonus: ptsDetails.ratingBonus,
                bbBonus: ptsDetails.bbBonus,
                onPitch: ptsDetails.onPitch !== false
            },
            breakdown: `${ptsDetails.onPitch === false ? 'Kun oppmøte' : 'Spilt'}: ${ptsDetails.base} | Res/Mål: ${ptsDetails.resultBonus > 0 ? '+' + ptsDetails.resultBonus : ptsDetails.resultBonus} | Børs: ${ptsDetails.ratingBonus > 0 ? '+' + ptsDetails.ratingBonus : ptsDetails.ratingBonus}`
        });
    });
    
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};

window.getPlayerPerformanceTrend = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];

    const history = window.getPlayerMatchPointsHistory(playerName);
    if (!history.length) return [];

    const teamName = playerObj.spillerLag;

    return [...history]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => {
            const match = (window.activeMatches || []).find(m => m.id === entry.matchId);
            return {
                matchId: entry.matchId,
                date: entry.date,
                opponent: entry.opponent,
                kampbidrag: entry.points,
                form: typeof window.calculatePlayerPerformanceChemistry === 'function'
                    ? window.calculatePlayerPerformanceChemistry(playerName, entry.date)
                    : 0,
                teamKampbidrag: match && typeof window.getTeamMatchAveragePoints === 'function'
                    ? window.getTeamMatchAveragePoints(match, teamName)
                    : null,
                teamForm: typeof window.getTeamFormMedian === 'function'
                    ? window.getTeamFormMedian(teamName, entry.date)
                    : 0
            };
        });
};

window.formatPointDelta = function(value) {
    const num = Number(value) || 0;
    if (num === 0) return '0';
    return num > 0 ? `+${num}` : String(num);
};

window.getPlayerPointsToneClass = function(points) {
    if (points >= 25) return 'is-high';
    if (points >= 18) return 'is-mid';
    if (points < 10) return 'is-low';
    return 'is-neutral';
};

window.renderPlayerPointBreakdownHtml = function(details) {
    if (!details) return '';

    const items = [
        { label: 'Grunnpoeng', value: details.base, tone: 'neutral' },
        { label: 'Resultat / mål', value: details.resultBonus, tone: details.resultBonus >= 0 ? 'positive' : 'negative' },
        { label: 'Spillerbørs', value: details.ratingBonus, tone: details.ratingBonus >= 0 ? 'positive' : 'negative' },
        { label: 'Banens beste', value: details.bbBonus, tone: details.bbBonus > 0 ? 'accent' : 'neutral' }
    ];

    return `
        <div class="stats-point-breakdown-grid">
            ${items.map(item => `
                <div class="stats-point-chip is-${item.tone}">
                    <span class="stats-point-chip-label">${item.label}</span>
                    <span class="stats-point-chip-value">${window.formatPointDelta(item.value)}</span>
                </div>
            `).join('')}
            <div class="stats-point-chip is-total">
                <span class="stats-point-chip-label">Totalt</span>
                <span class="stats-point-chip-value">${details.base + details.resultBonus + details.ratingBonus + details.bbBonus}</span>
            </div>
        </div>
        ${details.onPitch === false ? '<p class="stats-match-history-note">Spilleren var på benken – kun oppmøtepoeng er registrert.</p>' : ''}
    `;
};

window.formatStatsShortDate = function(dateValue) {
    if (!dateValue) return '–';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '–';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

window.formatStatsMatchResult = function(result) {
    if (!result || result === 'Ikke spilt' || !String(result).includes('-')) {
        return '(ikke spilt)';
    }
    return String(result).replace(/\s*-\s*/, '–');
};

window.formatStatsOpponentLabel = function(entry) {
    let label = entry.opponent || 'Motstander';
    if (entry.matchType === 'Cup') label += ' (cup)';
    const notPlayed = !entry.result || entry.result === 'Ikke spilt' || !String(entry.result).includes('-');
    if (notPlayed) label += '*';
    return label;
};

window.renderPlayerFormHistoryTableHtml = function(playerName, history) {
    if (!history.length) {
        return `<div class="stats-form-history-empty">Ingen kamper registrert.</div>`;
    }

    const rows = [...history]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => {
            const formParts = window.getPlayerFormComponents(playerName, entry.date);
            return {
                ...entry,
                form: formParts.total,
                formKamp: formParts.kamp,
                formOppm: formParts.oppm,
                formDis: formParts.dis,
                hasForm: formParts.hasFormData
            };
        });

    const formValues = rows.filter(row => row.hasForm && row.form > 0).map(row => row.form);
    const minForm = formValues.length ? Math.min(...formValues) : null;
    const maxForm = formValues.length ? Math.max(...formValues) : null;
    const showExtremes = formValues.length > 1;

    const bodyRows = rows.map(entry => {
        const pointsClass = window.getPlayerPointsToneClass(entry.points);
        const ratingText = entry.rating && entry.rating !== '-' ? entry.rating : '–';
        const formClass = showExtremes && entry.form === minForm
            ? 'is-lowest'
            : showExtremes && entry.form === maxForm
                ? 'is-highest'
                : '';
        const formNote = showExtremes && entry.form === minForm
            ? ' <span class="stats-form-history-flag">← laveste</span>'
            : showExtremes && entry.form === maxForm
                ? ' <span class="stats-form-history-flag">← høyeste</span>'
                : '';
        const breakdown = entry.hasForm
            ? `${entry.formKamp}+${entry.formOppm}+${entry.formDis}`
            : '–';
        const safeMatchId = String(entry.matchId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        return `
            <tr class="stats-form-history-row">
                <td class="stats-form-history-date">${window.formatStatsShortDate(entry.date)}</td>
                <td class="stats-form-history-opponent">${window.formatStatsOpponentLabel(entry)}</td>
                <td class="stats-form-history-result">${window.formatStatsMatchResult(entry.result)}</td>
                <td class="stats-form-history-points ${pointsClass}">${entry.points}</td>
                <td class="stats-form-history-rating">${ratingText}</td>
                <td class="stats-form-history-form ${formClass}">${entry.hasForm ? entry.form : '–'}${formNote}</td>
                <td class="stats-form-history-breakdown">${breakdown}</td>
                <td class="stats-form-history-action">
                    <button type="button" onclick="openMatchStatsEditor('${safeMatchId}')" title="Rediger kamp" class="portal-btn portal-btn-icon-sm portal-btn-warning">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="stats-form-history-table">
            <thead>
                <tr>
                    <th>Dato</th>
                    <th>Motstander</th>
                    <th>Resultat</th>
                    <th>Kampoeng</th>
                    <th>Børs</th>
                    <th>Form</th>
                    <th>Kamp+Oppm+Dis</th>
                    <th class="stats-form-history-action-head" aria-label="Rediger"></th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
};

window.renderPlayerTrendChartSvg = function(trendData) {
    if (!Array.isArray(trendData) || trendData.length < 2) {
        return `
            <div class="stats-chart-empty">
                <i class="fa-solid fa-chart-line"></i>
                <p>Trenger minst 2 kamper for å vise utviklingsdiagram.</p>
            </div>
        `;
    }

    const data = trendData.slice(-12);
    const width = 360;
    const height = 188;
    const pad = { top: 18, right: 34, bottom: 36, left: 34 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const pointValues = data.flatMap(entry => [
        entry.kampbidrag,
        entry.teamKampbidrag
    ].filter(value => value !== null && value !== undefined));
    const maxPoints = Math.max(35, ...pointValues) * 1.08;
    const maxForm = 100;
    const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;
    const toX = (index) => pad.left + (index * xStep);
    const toYPoints = (value) => pad.top + plotH - ((value / maxPoints) * plotH);
    const toYForm = (value) => pad.top + plotH - ((value / maxForm) * plotH);

    const gridLines = [0.25, 0.5, 0.75].map(ratio => {
        const y = pad.top + plotH * (1 - ratio);
        return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="stats-chart-grid-line" />`;
    }).join('');

    const buildLinePoints = (values, toY) => values
        .map((value, index) => (value === null || value === undefined ? null : `${toX(index)},${toY(value)}`))
        .filter(Boolean)
        .join(' ');

    const kampbidragPoints = buildLinePoints(data.map(entry => entry.kampbidrag), toYPoints);
    const formPoints = buildLinePoints(data.map(entry => entry.form), toYForm);
    const teamKampbidragPoints = buildLinePoints(data.map(entry => entry.teamKampbidrag), toYPoints);
    const teamFormPoints = buildLinePoints(data.map(entry => entry.teamForm), toYForm);

    const labels = data.map((entry, index) => {
        const label = entry.date
            ? new Date(entry.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
            : String(index + 1);
        return `<text x="${toX(index)}" y="${height - 10}" class="stats-chart-axis-label" text-anchor="middle">${label}</text>`;
    }).join('');

    const markers = data.map((entry, index) => {
        const teamPointsText = entry.teamKampbidrag !== null && entry.teamKampbidrag !== undefined
            ? `, lag snitt ${entry.teamKampbidrag}`
            : '';
        const teamFormText = entry.teamForm ? `, lag form ${entry.teamForm}` : '';
        const title = `${entry.opponent || 'Kamp'}: spiller ${entry.kampbidrag} poeng / form ${entry.form}${teamPointsText}${teamFormText}`;
        return `
            <g class="stats-chart-marker-group">
                <title>${title}</title>
                <circle cx="${toX(index)}" cy="${toYPoints(entry.kampbidrag)}" r="4.5" class="stats-chart-marker is-kampbidrag" />
                <circle cx="${toX(index)}" cy="${toYForm(entry.form)}" r="4.5" class="stats-chart-marker is-form" />
            </g>
        `;
    }).join('');

    const teamLines = [
        teamKampbidragPoints ? `<polyline points="${teamKampbidragPoints}" class="stats-chart-line is-team-kampbidrag" fill="none" />` : '',
        teamFormPoints ? `<polyline points="${teamFormPoints}" class="stats-chart-line is-team-form" fill="none" />` : ''
    ].join('');

    return `
        <svg class="stats-player-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Diagram over spiller og lag: poeng og form">
            ${gridLines}
            <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${width - pad.right}" y2="${pad.top + plotH}" class="stats-chart-axis" />
            <text x="8" y="${pad.top + 4}" class="stats-chart-axis-caption">Poeng</text>
            <text x="${width - 8}" y="${pad.top + 4}" class="stats-chart-axis-caption is-right" text-anchor="end">Form</text>
            ${teamLines}
            <polyline points="${kampbidragPoints}" class="stats-chart-line is-kampbidrag" fill="none" />
            <polyline points="${formPoints}" class="stats-chart-line is-form" fill="none" />
            ${markers}
            ${labels}
        </svg>
    `;
};
