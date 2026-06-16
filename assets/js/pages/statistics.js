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
                topScorer: [...activeStats].sort((a, b) => b.goals - a.goals)[0] || null
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
            const goalsAvg = matchCount ? (goals / matchCount).toFixed(1) : '0';
            const concededAvg = matchCount ? (conceded / matchCount).toFixed(1) : '0';

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

            const avgAttendance = totalPossibleTicks > 0 ? Math.round((totalEventTicks / totalPossibleTicks) * 100) : 0;
            const teamFormMedian = typeof window.getTeamFormMedian === 'function'
                ? window.getTeamFormMedian(filterLag === 'Alle' ? '' : filterLag)
                : 0;

            const titleEl = document.getElementById('stats-lag-title');
            if (titleEl) titleEl.textContent = filterLag && filterLag !== 'Alle' ? filterLag : 'Lagstatistikk';

            if (document.getElementById('stats-page-wins')) document.getElementById('stats-page-wins').innerText = wins;
            if (document.getElementById('stats-page-draws')) document.getElementById('stats-page-draws').innerText = draws;
            if (document.getElementById('stats-page-losses')) document.getElementById('stats-page-losses').innerText = losses;
            if (document.getElementById('stats-page-goals')) document.getElementById('stats-page-goals').innerText = goals;
            if (document.getElementById('stats-page-goals-avg')) document.getElementById('stats-page-goals-avg').innerText = goalsAvg;
            if (document.getElementById('stats-page-conceded-avg')) document.getElementById('stats-page-conceded-avg').innerText = concededAvg;
            if (document.getElementById('stats-page-players')) document.getElementById('stats-page-players').innerText = teamPlayers.length;
            if (document.getElementById('stats-page-attendance')) document.getElementById('stats-page-attendance').innerText = `${avgAttendance}%`;
            if (document.getElementById('stats-lag-form-median')) {
                document.getElementById('stats-lag-form-median').innerText = teamFormMedian > 0 ? teamFormMedian : '-';
            }

            const formRow = document.getElementById('stats-lag-form-row');
            if (formRow) {
                const formGuide = window.getTeamFormGuide(filterLag);
                const getPillClass = (form) => {
                    if (form === 'S') return 'is-win';
                    if (form === 'T') return 'is-loss';
                    return 'is-draw';
                };

                formRow.innerHTML = formGuide.length
                    ? `<span class="stats-form-label">Form siste ${formGuide.length}</span><div class="stats-form-pills">${formGuide.map(item => `<span class="dashboard-series-form-pill ${getPillClass(item.form)}" title="${item.tooltip}">${item.text}</span>`).join('')}</div>`
                    : `<span class="stats-form-empty">Ingen registrerte kamper ennå</span>`;
            }

            const followUpsContainer = document.getElementById('stats-lag-followups');
            if (followUpsContainer) {
                const analysis = window.buildPlayerAnalysisStats(filterLag);
                followUpsContainer.innerHTML = window.renderStatsFollowUpsHtml(analysis.followUps);
            }
        };

window.calculatePlayerPerformanceChemistry = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return 0;
    const spillerLag = playerObj.spillerLag;
    const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
    const todayForChemistry = new Date();
    todayForChemistry.setHours(0, 0, 0, 0);
    const isHistorical = (item) => {
        if (!item.date) return true;
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
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

    let performanceScore = 0;
    if (recentMatches.length > 0) {
        let weightedPoints = 0;
        let totalWeight = 0;

        recentMatches.forEach((m, index) => {
            const weight = recentMatches.length - index;
            weightedPoints += window.calculatePlayerMatchPoints(m, playerName) * weight;
            totalWeight += weight;
        });

        const weightedAverage = totalWeight > 0 ? weightedPoints / totalWeight : 0;
        performanceScore = Math.max(0, Math.min(70, ((weightedAverage - 5) / 35) * 70));
    }

    if (recentMatches.length === 0) return 0;

    let totalYellowCards = 0;
    let totalRedCards = 0;

    (window.activeMatches || []).forEach(m => {
        if (!isHistorical(m) || m.matchGroup !== spillerLag || m.matchType !== 'Serie') return;
        if (window.playerRefListIncludes(m.guleKort, playerObj)) totalYellowCards++;
        if (window.playerRefListIncludes(m.rodeKort, playerObj)) totalRedCards++;
    });

    // NFF-logikk for gule kort: første karantene er gratis, gjentatte karantener trekker.
    let karantener = 0;
    if (totalYellowCards >= 4) {
        karantener = 1 + Math.floor((totalYellowCards - 4) / 2);
    }

    const hasFormData = recentMatches.length > 0;
    const disciplinePenalty = (totalRedCards * 10) + (karantener > 1 ? (karantener - 1) * 5 : 0);
    const disciplineScore = hasFormData ? Math.max(0, 10 - disciplinePenalty) : 0;

    const formScore = performanceScore + availabilityScore + disciplineScore;
    return Math.max(0, Math.min(100, Math.round(formScore)));
}

window.getTeamFormMedian = function(teamName) {
    const scores = (window.activePlayers || [])
        .filter(p => p.status !== 'Passiv' && (!teamName || p.spillerLag === teamName))
        .map(p => window.calculatePlayerPerformanceChemistry(p.navn))
        .filter(score => score > 0)
        .sort((a, b) => a - b);

    if (!scores.length) return 0;

    const middle = Math.floor(scores.length / 2);
    return scores.length % 2 === 0
        ? Math.round((scores[middle - 1] + scores[middle]) / 2)
        : scores[middle];
}

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

        window.switchStatTab = function(tabId) {
            const statViewActiveClasses = {
                lag: 'block space-y-5',
                spillere: 'block space-y-5',
                kampstat: 'block space-y-5'
            };

            ['lag', 'spillere', 'kampstat'].forEach(id => {
                const view = document.getElementById(`stat-view-${id}`);
                if (view) view.className = id === tabId ? statViewActiveClasses[id] : 'hidden';
            });

            const inactiveClass = "stat-tab-btn portal-segment-btn";
            document.querySelectorAll('.stat-tab-btn').forEach(btn => {
                btn.className = inactiveClass;
            });

            const activeBtn = document.getElementById(`stat-tab-${tabId}`);
            if (activeBtn) activeBtn.className = "stat-tab-btn portal-segment-btn is-active";

            if (tabId === 'lag') window.renderStatistikkSide();
            if (tabId === 'spillere') window.renderSpillereView();
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
        window.renderSpillereView = function() {
            window._statsSelectedPlayer = null;
            const container = document.getElementById('stat-spillere-content');
            if (!container) return;

            const filterLag = window.getStatsTeamFilter();
            const analysis = window.buildPlayerAnalysisStats(filterLag);
            const card = window.statsMetricCardHtml;

            container.innerHTML = `
                <div class="space-y-5">
                    <div class="stats-metric-grid is-three">
                        ${card(
                            'Formspiller',
                            analysis.topFormPlayer ? analysis.topFormPlayer.name : '-',
                            analysis.topFormPlayer ? `Snitt siste 5: ${analysis.topFormPlayer.formLastFive.toFixed(1)}` : 'Ingen formdata',
                            'fa-fire',
                            'text-orange-500',
                            analysis.topFormPlayer ? analysis.topFormPlayer.name : ''
                        )}
                        ${card(
                            'Toppscorer',
                            analysis.topScorer ? analysis.topScorer.name : '-',
                            analysis.topScorer ? `${analysis.topScorer.goals} mål` : 'Ingen mål registrert',
                            'fa-futbol',
                            'text-emerald-600',
                            analysis.topScorer ? analysis.topScorer.name : ''
                        )}
                        ${card(
                            'BB-leder',
                            analysis.bbLeader ? analysis.bbLeader.name : '-',
                            analysis.bbLeader ? `${analysis.bbLeader.bb} BB-kåringer` : 'Ingen BB registrert',
                            'fa-crown',
                            'text-bsk-yellow',
                            analysis.bbLeader ? analysis.bbLeader.name : ''
                        )}
                    </div>

                    <div class="stats-table-panel">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Alle spillere</h3>
                            <p class="stats-panel-subtitle">Trykk på en spiller for detaljer, eller sorter etter kolonne.</p>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm whitespace-nowrap">
                                <thead class="stats-table-head select-none">
                                    <tr>
                                        <th onclick="sortStatsTable('navn')">Spiller <span id="sort-icon-navn"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('oppmotePct')">Oppmøte <span id="sort-icon-oppmotePct"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('kamper')">Kamper <span id="sort-icon-kamper"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('mal')">Mål <span id="sort-icon-mal"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('assist')">Assist <span id="sort-icon-assist"></span></th>
                                        <th class="text-center text-bsk-blue" onclick="sortStatsTable('bb')">BB <span id="sort-icon-bb"></span></th>
                                        <th class="text-center text-bsk-blue" onclick="sortStatsTable('kampbonus')">Kampbidrag <span id="sort-icon-kampbonus"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('guleSerie')">Gul S <span id="sort-icon-guleSerie"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('guleCup')">Gul C <span id="sort-icon-guleCup"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('rodeSerie')">Rød S <span id="sort-icon-rodeSerie"></span></th>
                                        <th class="text-center" onclick="sortStatsTable('rodeCup')">Rød C <span id="sort-icon-rodeCup"></span></th>
                                        <th class="text-center">
                                            <span onclick="sortStatsTable('kjemi')">Form <span id="sort-icon-kjemi"></span></span>
                                            <i class="fa-solid fa-circle-info text-bsk-yellow hover:text-amber-500 ml-2 cursor-pointer transition-colors" onclick="event.stopPropagation(); document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');" title="Les mer om Form"></i>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="stats-player-table-body" class="stats-table-body divide-y divide-slate-100"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            window.renderPlayerStatsTable();
        };

        window.openSpillerDetail = function(playerName) {
            if (!playerName) return;
            window._statsSelectedPlayer = playerName;
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
                container.innerHTML = `
                    <div class="space-y-5">
                        <button type="button" onclick="window.showSpillereOverview()" class="portal-btn portal-btn-secondary portal-btn-sm">
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

            const card = window.statsMetricCardHtml;
            let rowsHtml = '';

            history.forEach(h => {
                const m = (window.activeMatches || []).find(match => match.id === h.matchId);
                let pointColor = 'text-slate-700';
                if (h.points >= 25) pointColor = 'text-emerald-600';
                else if (h.points >= 18) pointColor = 'text-bsk-blue';
                else if (h.points < 10) pointColor = 'text-rose-600';

                const goals = m ? Number(window.getPlayerRefMapValue(m.scorers, player, 0)) || 0 : 0;
                const assists = m ? Number(window.getPlayerRefMapValue(m.assists, player, 0)) || 0 : 0;
                const yellow = m && window.playerRefListIncludes(m.guleKort, player);
                const red = m && window.playerRefListIncludes(m.rodeKort, player);
                const bb = m && window.motmMatchesPlayer(m.motm, player);
                const dateText = h.date
                    ? new Date(h.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
                    : '-';

                rowsHtml += `
                    <tr class="hover:bg-slate-50 transition" title="${h.breakdown}">
                        <td class="text-slate-500 font-medium">${dateText}</td>
                        <td class="font-black text-slate-800">${h.opponent}${h.onPitch === false ? ' <span class="text-[9px] text-amber-700 font-bold">(benk)</span>' : ''}</td>
                        <td class="text-center font-black text-lg ${pointColor}">${h.points}</td>
                        <td class="text-center"><span class="bg-bsk-blue text-white px-2 py-1 rounded text-[10px] font-black shadow-sm">${h.rating}</span></td>
                        <td class="text-center">${goals > 0 ? `⚽ ${goals}` : '-'}</td>
                        <td class="text-center">${assists > 0 ? `A ${assists}` : '-'}</td>
                        <td class="text-center">${bb ? '👑 +1' : '-'}</td>
                        <td class="text-center">${yellow ? '🟨' : '-'}</td>
                        <td class="text-center">${red ? '🟥 -10' : '-'}</td>
                        <td class="text-center font-semibold text-slate-600">${h.result}</td>
                        <td class="text-right">
                            <button onclick="openMatchStatsEditor('${h.matchId}')" title="Rediger kampstatistikk" class="portal-btn portal-btn-icon-sm portal-btn-warning">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            container.innerHTML = `
                <div class="space-y-5">
                    <button type="button" onclick="window.showSpillereOverview()" class="portal-btn portal-btn-secondary portal-btn-sm">
                        <i class="fa-solid fa-arrow-left"></i> Tilbake til oversikt
                    </button>

                    <div class="stats-hero-panel">
                        <div class="stats-hero-top">
                            <div>
                                <p class="stats-hero-kicker">${player.pos1 || 'Spiller'}</p>
                                <h2 class="stats-hero-title">${playerName}</h2>
                                <p class="stats-hero-subtitle">${player.spillerLag || ''} · ${formComparison}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}</p>
                            </div>
                            <div class="stats-hero-ring">
                                <p class="stats-hero-ring-label">Snitt</p>
                                <p class="stats-hero-ring-value">${avgPoints ? avgPoints.toFixed(1) : '-'}</p>
                                <p class="stats-hero-ring-sub">${totalPoints} totalt</p>
                            </div>
                        </div>
                    </div>

                    <div class="stats-metric-grid is-four">
                        ${card('Form', chemistry + '/100', 'Kampbidrag, oppmøte og disiplin', 'fa-heart-pulse', 'text-emerald-600')}
                        ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
                        ${card('Snittbørs', avgRating ? avgRating.toFixed(1) : '-', 'Gjennomsnittlig spillerbørs', 'fa-star', 'text-bsk-yellow')}
                        ${card('Mål / Assist', `${totalGoals} / ${totalAssists}`, `${totalBb} BB · Serie ${totalYellowSerie}/${totalRedSerie} · Cup ${totalYellowCup}/${totalRedCup}`, 'fa-chart-line', 'text-bsk-blue')}
                    </div>

                    <div class="stats-table-panel">
                        <div class="stats-panel-header">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <h3 class="stats-panel-title">Poenghistorikk</h3>
                                    <p class="stats-panel-subtitle">Nyeste kamp vises øverst.</p>
                                </div>
                                <button onclick="document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');" class="portal-btn portal-btn-success portal-btn-sm shrink-0">
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span class="hidden sm:inline">Slik regnes form</span>
                                </button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm whitespace-nowrap">
                                <thead class="stats-table-head">
                                    <tr>
                                        <th>Dato</th>
                                        <th>Motstander</th>
                                        <th class="text-center">Poeng</th>
                                        <th class="text-center">Børs</th>
                                        <th class="text-center">Mål</th>
                                        <th class="text-center">Assist</th>
                                        <th class="text-center text-bsk-blue">BB</th>
                                        <th class="text-center">Gult</th>
                                        <th class="text-center">Rødt</th>
                                        <th class="text-center">Res</th>
                                        <th class="text-right">Rediger</th>
                                    </tr>
                                </thead>
                                <tbody class="stats-table-body divide-y divide-slate-100">${rowsHtml}</tbody>
                            </table>
                        </div>
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
    <div class="space-y-5">
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

    // Vis siste spilte kamp automatisk
    if (playedMatches.length > 0 && typeof window.showMatchStatsTable === 'function') {
        window.showMatchStatsTable();
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

            <div class="stats-hero-panel">
                <div class="stats-hero-top">
                    <div class="min-w-0">
                        <p class="stats-hero-kicker">Kampanalyse</p>
                        <h2 class="stats-hero-title">
                            BSK -
                            <span class="stats-hero-select-wrap ml-2 align-middle">
                                <select 
                                    id="kampstat-match-select" 
                                    onfocus="expandKampSelectLabels()"
                                    onmousedown="expandKampSelectLabels()"
                                    onblur="collapseKampSelectLabel()"
                                    onchange="showMatchStatsTable()" 
                                    class="portal-field portal-field-display truncate"
                                >
                                    ${playedMatches.map(m => {
                                        const optionDate = m.date
                                            ? new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                            : '';
                                
                                        const shortText = m.opponent || 'Motstander';
                                        const fullText = `${m.opponent || 'Motstander'}${optionDate ? ' · ' + optionDate : ''}${m.result ? ' · ' + m.result : ''}`;
                                
                                        return `
                                            <option 
                                                value="${m.id}" 
                                                data-short="${shortText}" 
                                                data-full="${fullText}"
                                                ${m.id === matchId ? 'selected' : ''}
                                            >
                                                ${shortText}
                                            </option>
                                        `;
                                    }).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down"></i>
                            </span>
                        </h2>
                        <p class="stats-hero-subtitle">
                            ${matchType} ${matchGroup ? '· ' + matchGroup : ''} ${dateStr ? '· ' + dateStr : ''} ${pitch ? '· ' + pitch : ''}
                        </p>
                        <div class="flex items-center gap-2 mt-3">
                            <button type="button" onclick="window.navigateKampstatMatch(-1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${playedMatches.findIndex(m => m.id === matchId) <= 0 ? 'disabled' : ''} title="Forrige kamp">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <span class="text-xs font-bold text-white/60">${playedMatches.findIndex(m => m.id === matchId) + 1} / ${playedMatches.length}</span>
                            <button type="button" onclick="window.navigateKampstatMatch(1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${playedMatches.findIndex(m => m.id === matchId) >= playedMatches.length - 1 ? 'disabled' : ''} title="Neste kamp">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                    <div class="stats-hero-result">
                        <p class="stats-hero-result-label">Resultat</p>
                        <p class="stats-hero-result-value">${matchResult}</p>
                    </div>
                </div>
            </div>

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
    window.collapseKampSelectLabel();
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
            window.renderPlayerStatsTable(); 
        };

        window.renderPlayerStatsTable = function() {
            const tableBody = document.getElementById('stats-player-table-body');
            const theadContainer = tableBody ? tableBody.previousElementSibling : null;
            if (!tableBody || !theadContainer) return;
            
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];

            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            let statsData = (window.activePlayers || []).filter(p => filterLag === 'Alle' || p.spillerLag === filterLag).map(p => {
                const teamEvents = allEvents.filter(e => {
                    if (e.team !== p.spillerLag) return false;
                    if (e.date) {
                        const eventDate = new Date(e.date);
                        eventDate.setHours(0, 0, 0, 0);
                        if (eventDate > todayForStats) return false;
                    }
                    return true;
                });

                let attended = 0, kamper = 0, attendedMatches = 0, yellowSerie = 0, redSerie = 0, yellowCup = 0, redCup = 0, mal = 0, assist = 0, totalMatchPoints = 0, bb = 0;

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
                            }
                            totalMatchPoints += window.calculatePlayerMatchPoints(e, p);
                        }
                    }
                    if (e.type === 'Kamp') {
                        if (e.matchType === 'Serie') {
                            if (window.playerRefListIncludes(e.guleKort, p)) yellowSerie++;
                            if (window.playerRefListIncludes(e.rodeKort, p)) redSerie++;
                        } else if (e.matchType === 'Cup') {
                            if (window.playerRefListIncludes(e.guleKort, p)) yellowCup++;
                            if (window.playerRefListIncludes(e.rodeKort, p)) redCup++;
                        }
                    }
                });

                const cardCounts = typeof window.getPlayerCardCounts === 'function'
                    ? window.getPlayerCardCounts(p.navn, p.spillerLag)
                    : { serie: { gule: yellowSerie, rode: redSerie }, cup: { gule: yellowCup, rode: redCup } };
                const serieHint = typeof window.getSerieYellowDisciplineHint === 'function'
                    ? window.getSerieYellowDisciplineHint(cardCounts.serie.gule)
                    : { isAtRisk: false };

                return {
                    navn: p.navn, pos1: p.pos1 || '', spillerLag: p.spillerLag || '', oppmotePct: teamEvents.length > 0 ? Math.round((attended / teamEvents.length) * 100) : 0,
                    kamper: kamper, attendedMatches: attendedMatches, mal: mal, assist: assist, kampbonus: attendedMatches > 0 ? Math.round(totalMatchPoints / attendedMatches) : 0,
                    guleSerie: cardCounts.serie.gule, rodeSerie: cardCounts.serie.rode,
                    guleCup: cardCounts.cup.gule, rodeCup: cardCounts.cup.rode,
                    gule: cardCounts.serie.gule, rode: cardCounts.serie.rode,
                    serieAtRisk: serieHint.isAtRisk,
                    kjemi: window.calculatePlayerPerformanceChemistry(p.navn),
                    bb: bb
                };
            });

            statsData.sort((a, b) => {
                if (currentStatSortCol === 'navn') return currentStatSortDesc ? a.navn.localeCompare(b.navn) : b.navn.localeCompare(a.navn);
                return currentStatSortDesc ? b[currentStatSortCol] - a[currentStatSortCol] : a[currentStatSortCol] - b[currentStatSortCol];
            });

            theadContainer.className = "stats-table-head select-none";
            theadContainer.innerHTML = `
                <tr>
                    <th onclick="sortStatsTable('navn')">Spiller <span id="sort-icon-navn"></span></th>
                    <th class="text-center" onclick="sortStatsTable('oppmotePct')">Oppmøte <span id="sort-icon-oppmotePct"></span></th>
                    <th class="text-center" onclick="sortStatsTable('kamper')">Kamper <span id="sort-icon-kamper"></span></th>
                    <th class="text-center" onclick="sortStatsTable('mal')">Mål <span id="sort-icon-mal"></span></th>
                    <th class="text-center" onclick="sortStatsTable('assist')">Assist <span id="sort-icon-assist"></span></th>
                    <th class="text-center text-bsk-blue" onclick="sortStatsTable('bb')">BB <span id="sort-icon-bb"></span></th>
                    <th class="text-center text-bsk-blue" onclick="sortStatsTable('kampbonus')">Kampbidrag <span id="sort-icon-kampbonus"></span></th>
                    <th class="text-center" onclick="sortStatsTable('guleSerie')" title="Gule kort i seriespill">Gul S <span id="sort-icon-guleSerie"></span></th>
                    <th class="text-center" onclick="sortStatsTable('guleCup')" title="Gule kort i cup">Gul C <span id="sort-icon-guleCup"></span></th>
                    <th class="text-center" onclick="sortStatsTable('rodeSerie')" title="Røde kort i seriespill">Rød S <span id="sort-icon-rodeSerie"></span></th>
                    <th class="text-center" onclick="sortStatsTable('rodeCup')" title="Røde kort i cup">Rød C <span id="sort-icon-rodeCup"></span></th>
                    <th class="text-center">
                        <span onclick="sortStatsTable('kjemi')">Form <span id="sort-icon-kjemi"></span></span>
                        <i class="fa-solid fa-circle-info text-bsk-yellow hover:text-amber-500 ml-2 cursor-pointer transition-colors" onclick="event.stopPropagation(); document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');" title="Les mer om Form"></i>
                    </th>
                </tr>
            `;

            ['navn', 'oppmotePct', 'kamper', 'mal', 'assist', 'bb', 'kampbonus', 'guleSerie', 'guleCup', 'rodeSerie', 'rodeCup', 'kjemi'].forEach(col => {
                const iconEl = document.getElementById(`sort-icon-${col}`);
                if(iconEl) iconEl.innerHTML = col === currentStatSortCol ? (currentStatSortDesc ? '<i class="fa-solid fa-sort-down ml-1 text-bsk-blue"></i>' : '<i class="fa-solid fa-sort-up ml-1 text-bsk-blue"></i>') : '';
            });

            tableBody.className = "stats-table-body divide-y divide-slate-100";

            tableBody.innerHTML = statsData.map(stat => {
                const formTone = typeof window.getFormScoreTone === 'function' ? window.getFormScoreTone(stat.kjemi, stat.spillerLag) : 'none';
                const isStarPlayer = formTone === 'green'; 
                const chemColor = typeof window.getFormScoreTextClass === 'function'
                    ? window.getFormScoreTextClass(stat.kjemi, stat.spillerLag)
                    : 'text-slate-400';

                let bonusColor = 'text-slate-400';
                if (stat.kampbonus > 15) bonusColor = 'text-emerald-500';
                else if (stat.kampbonus >= 10) bonusColor = 'text-amber-500';
                else if (stat.kampbonus > 0) bonusColor = 'text-rose-500';
                
                let bonusTekst = stat.attendedMatches > 0 ? stat.kampbonus.toFixed(1) : '-';
                let malFarge = stat.mal > 0 ? 'text-slate-800 font-bold' : 'text-slate-300 font-bold';
                let assistFarge = stat.assist > 0 ? 'text-sky-700 font-bold' : 'text-slate-300 font-bold';
                let gulSerieFarge = stat.guleSerie > 0
                    ? (stat.serieAtRisk ? 'text-yellow-500 animate-pulse font-bold' : 'text-slate-800 font-bold')
                    : 'text-slate-300 font-bold';
                let gulCupFarge = stat.guleCup > 0 ? 'text-slate-700 font-bold' : 'text-slate-300 font-bold';
                let rodSerieFarge = stat.rodeSerie > 0 ? 'text-rose-600 bg-rose-50 font-bold' : 'text-slate-300 font-bold';
                let rodCupFarge = stat.rodeCup > 0 ? 'text-rose-500 font-bold' : 'text-slate-300 font-bold';
                
                let bbFarge = stat.bb > 0 ? 'text-indigo-600 font-black text-sm' : 'text-slate-300 font-bold';
                const safeName = String(stat.navn).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                return `
                    <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="window.openSpillerDetail('${safeName}')">
                        <td><div class="font-bold text-slate-800">${stat.navn}</div><div class="text-[10px] text-slate-500 uppercase tracking-wide">${stat.pos1}</div></td>
                        <td class="text-center font-bold text-slate-700">${stat.oppmotePct}%</td>
                        <td class="text-center font-bold text-slate-800">${stat.kamper}</td>
                        <td class="text-center ${malFarge}">${stat.mal > 0 ? stat.mal : '-'}</td>
                        <td class="text-center ${assistFarge}">${stat.assist > 0 ? stat.assist : '-'}</td>
                        <td class="text-center ${bbFarge}">${stat.bb > 0 ? stat.bb : '-'}</td>
                        <td class="text-center font-bold ${bonusColor}">${bonusTekst}</td>
                        <td class="text-center ${gulSerieFarge}" title="${stat.serieAtRisk ? 'Faresone: karantene ved neste gule i serie' : 'Gule kort i seriespill'}">${stat.guleSerie > 0 ? stat.guleSerie : '-'}</td>
                        <td class="text-center ${gulCupFarge}" title="Gule kort i cup">${stat.guleCup > 0 ? stat.guleCup : '-'}</td>
                        <td class="text-center ${rodSerieFarge}" title="Røde kort i seriespill">${stat.rodeSerie > 0 ? stat.rodeSerie : '-'}</td>
                        <td class="text-center ${rodCupFarge}" title="Røde kort i cup">${stat.rodeCup > 0 ? stat.rodeCup : '-'}</td>
                        <td class="text-center font-bold ${chemColor}">${stat.kjemi}/100 ${isStarPlayer ? '<span class="ml-1 text-xs text-bsk-yellow">★</span>' : ''}</td>
                    </tr>`;
            }).join('');
        };

window.getPlayerMatchPointsHistory = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];
    
    const history = [];
    
    (window.activeMatches || []).forEach(m => {
        // Sjekker kun kamper der spilleren faktisk møtte opp
        if (m.matchGroup === playerObj.spillerLag && window.isPlayerAttending(m.attendance, playerObj)) {
            
            const ptsDetails = window.calculatePlayerMatchPoints(m, playerObj, true);
            
            history.push({
                matchId: m.id,
                date: m.date,
                opponent: m.opponent,
                matchType: m.matchType || 'Kamp',
                result: m.result || 'Ikke spilt',
                rating: window.getPlayerRefMapValue(m.ratings, playerObj, '-') || '-',
                points: ptsDetails.total,
                onPitch: ptsDetails.onPitch !== false,
                breakdown: `${ptsDetails.onPitch === false ? 'Kun oppmøte' : 'Spilt'}: ${ptsDetails.base} | Res/Mål: ${ptsDetails.resultBonus > 0 ? '+' + ptsDetails.resultBonus : ptsDetails.resultBonus} | Børs: ${ptsDetails.ratingBonus > 0 ? '+' + ptsDetails.ratingBonus : ptsDetails.ratingBonus}`
            });
        }
    });
    
    // Sorterer fra nyeste kamp til eldste
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};
