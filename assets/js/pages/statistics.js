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

        window.buildPlayerStatsData = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            return (window.activePlayers || [])
                .filter(p => filterLag === 'Alle' || p.spillerLag === filterLag)
                .map(p => {
                    const teamEvents = allEvents.filter(e => {
                        if (e.team !== p.spillerLag) return false;
                        if (e.date) {
                            const eventDate = new Date(e.date);
                            eventDate.setHours(0, 0, 0, 0);
                            if (eventDate > todayForStats) return false;
                        }
                        return true;
                    });

                    let attended = 0, kamper = 0, attendedMatches = 0, mal = 0, assist = 0, totalMatchPoints = 0, bb = 0;

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
                        kampbonus: attendedMatches > 0 ? totalMatchPoints / attendedMatches : 0,
                        guleSerie: cardCounts.serie.gule,
                        rodeSerie: cardCounts.serie.rode,
                        guleCup: cardCounts.cup.gule,
                        rodeCup: cardCounts.cup.rode,
                        serieAtRisk: serieHint.isAtRisk,
                        kjemi: window.calculatePlayerPerformanceChemistry(p.navn),
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
                oppmotePct: 'oppmøte'
            };

            const label = labels[column];
            return label
                ? `Ingen spillere med registrerte ${label}.`
                : 'Ingen spillere funnet for valgt lag.';
        };

        window.renderStatsTabHero = function(tabId) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;

            const heroTabsHtml = window.renderStatsHeroTabsHtml(tabId);

            if (tabId === 'lag') {
                const data = window._statsLagData;
                if (!data) {
                    hero.innerHTML = '';
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

                hero.innerHTML = `
                    <div class="stats-hero-panel">
                        <div class="stats-hero-top">
                            <div>
                                <p class="stats-hero-kicker">BSK Fotball</p>
                                <h2 class="stats-hero-title">${data.title}</h2>
                                <p class="stats-hero-subtitle">Kampresultater, form og troppens nøkkeltall for valgt lag.</p>
                            </div>
                            <div class="stats-hero-aside">
                                ${heroTabsHtml}
                                <div class="stats-hero-ring">
                                    <p class="stats-hero-ring-label">Lagform</p>
                                    <p class="stats-hero-ring-value">${data.teamFormMedian > 0 ? data.teamFormMedian : '-'}</p>
                                    <p class="stats-hero-ring-sub">median</p>
                                </div>
                            </div>
                        </div>
                        <div class="stats-form-row">${formRowHtml}</div>
                        <div class="stats-stat-grid">
                            <div class="stats-stat-card"><span class="stats-stat-label">Seire</span><span class="stats-stat-value is-win">${data.wins}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Uavgjorte</span><span class="stats-stat-value is-draw">${data.draws}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Tap</span><span class="stats-stat-value is-loss">${data.losses}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Mål scoret</span><span class="stats-stat-value is-goals">${data.goals}</span></div>
                        </div>
                        <div class="stats-section-divider"></div>
                        <div class="stats-stat-grid">
                            <div class="stats-stat-card"><span class="stats-stat-label">Snitt scoret</span><span class="stats-stat-value">${data.goalsAvg}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Snitt innslipp</span><span class="stats-stat-value is-loss">${data.concededAvg}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Spillere</span><span class="stats-stat-value">${data.playerCount}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Oppmøte</span><span class="stats-stat-value is-win">${data.avgAttendance}%</span></div>
                        </div>
                    </div>
                `;
                return;
            }

            if (tabId === 'spillere') {
                const filterLag = window.getStatsTeamFilter();
                const analysis = window.buildPlayerAnalysisStats(filterLag);
                const allStats = window.buildPlayerStatsData();
                const statsData = allStats.filter(s => s.kamper > 0 || s.kjemi > 0);
                const avgForm = statsData.length
                    ? Math.round(statsData.reduce((sum, s) => sum + s.kjemi, 0) / statsData.length)
                    : 0;
                const avgBonus = statsData.length
                    ? (statsData.reduce((sum, s) => sum + s.kampbonus, 0) / statsData.length).toFixed(1)
                    : '-';

                const buildLeaderCard = (label, player, detail, toneClass = 'is-goals') => {
                    if (!player || !detail) {
                        return `
                            <div class="stats-stat-card">
                                <span class="stats-stat-label">${label}</span>
                                <span class="stats-stat-value ${toneClass}">-</span>
                            </div>
                        `;
                    }
                    const safeName = String(player.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `
                        <button type="button" onclick="window.openSpillerDetail('${safeName}')" class="stats-stat-card stats-stat-card-clickable">
                            <span class="stats-stat-label">${label}</span>
                            <span class="stats-stat-value is-leader ${toneClass}">${player.name} · ${detail}</span>
                        </button>
                    `;
                };

                const topScorer = analysis.topScorer && analysis.topScorer.goals > 0 ? analysis.topScorer : null;
                const topScorerDetail = topScorer ? `${topScorer.goals} mål` : null;
                const formPlayer = analysis.topFormPlayer && analysis.topFormPlayer.formLastFive > 0 ? analysis.topFormPlayer : null;
                const formPlayerDetail = formPlayer ? `${formPlayer.formLastFive.toFixed(1)} børs` : null;

                hero.innerHTML = `
                    <div class="stats-hero-panel">
                        <div class="stats-hero-top stats-hero-top-compact">
                            <h2 class="stats-hero-title">Spilleranalyse</h2>
                            ${heroTabsHtml}
                        </div>
                        <div class="stats-stat-grid">
                            <div class="stats-stat-card"><span class="stats-stat-label">Snitt form</span><span class="stats-stat-value is-win">${avgForm || '-'}</span></div>
                            <div class="stats-stat-card"><span class="stats-stat-label">Snitt kampbidrag</span><span class="stats-stat-value is-accent">${avgBonus}</span></div>
                            ${buildLeaderCard('Toppscorer', topScorer, topScorerDetail, 'is-goals')}
                            ${buildLeaderCard('Formspiller', formPlayer, formPlayerDetail, 'is-draw')}
                        </div>
                    </div>
                `;
                return;
            }

            if (tabId === 'kampstat') {
                const data = window._statsKampHeroData;
                if (!data) {
                    hero.innerHTML = `
                        <div class="stats-hero-panel">
                            <div class="stats-hero-top">
                                <div>
                                    <p class="stats-hero-kicker">BSK Fotball · Kamper</p>
                                    <h2 class="stats-hero-title">Kampstatistikk</h2>
                                    <p class="stats-hero-subtitle">Velg en spilt kamp for å se poengfordeling og kampbilde.</p>
                                </div>
                                ${heroTabsHtml}
                            </div>
                        </div>
                    `;
                    return;
                }

                const { playedMatches, matchId, matchType, matchGroup, dateStr, pitch, matchResult } = data;
                const currentIdx = playedMatches.findIndex(m => m.id === matchId);

                hero.innerHTML = `
                    <div class="stats-hero-panel">
                        <div class="stats-hero-top">
                            <div class="min-w-0">
                                <p class="stats-hero-kicker">Kampanalyse</p>
                                <h2 class="stats-hero-title">
                                    BSK -
                                    <span class="stats-hero-select-wrap ml-2 align-middle">
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
                                </h2>
                                <p class="stats-hero-subtitle">${matchType} ${matchGroup ? '· ' + matchGroup : ''} ${dateStr ? '· ' + dateStr : ''} ${pitch ? '· ' + pitch : ''}</p>
                                <div class="stats-kamp-nav">
                                    <button type="button" onclick="window.navigateKampstatMatch(-1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx <= 0 ? 'disabled' : ''} title="Forrige kamp"><i class="fa-solid fa-chevron-left"></i></button>
                                    <span>${currentIdx + 1} / ${playedMatches.length}</span>
                                    <button type="button" onclick="window.navigateKampstatMatch(1)" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx >= playedMatches.length - 1 ? 'disabled' : ''} title="Neste kamp"><i class="fa-solid fa-chevron-right"></i></button>
                                </div>
                            </div>
                            <div class="stats-hero-aside">
                                ${heroTabsHtml}
                                <div class="stats-hero-result">
                                    <p class="stats-hero-result-label">Resultat</p>
                                    <p class="stats-hero-result-value">${matchResult}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                if (typeof window.collapseKampSelectLabel === 'function') window.collapseKampSelectLabel();
            }
        };

        window.renderSpillerDetailHero = function(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;

            const heroTabsHtml = window.renderStatsHeroTabsHtml('spillere');

            hero.innerHTML = `
                <div class="stats-hero-panel">
                    <div class="stats-hero-top">
                        <div>
                            <p class="stats-hero-kicker">${player.pos1 || 'Spiller'}</p>
                            <h2 class="stats-hero-title">${playerName}</h2>
                            <p class="stats-hero-subtitle">${player.spillerLag || ''} · ${formComparison}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}</p>
                        </div>
                        <div class="stats-hero-aside">
                            ${heroTabsHtml}
                            <div class="stats-hero-ring">
                                <p class="stats-hero-ring-label">Snitt</p>
                                <p class="stats-hero-ring-value">${avgPoints ? avgPoints.toFixed(1) : '-'}</p>
                                <p class="stats-hero-ring-sub">${totalPoints} totalt · Form ${chemistry}/100</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
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
                const formTone = typeof window.getFormScoreTone === 'function' ? window.getFormScoreTone(stat.kjemi, stat.spillerLag) : 'none';
                const formClass = formTone === 'green' ? 'is-high' : formTone === 'amber' ? 'is-mid' : formTone === 'red' ? 'is-low' : 'is-neutral';
                const bonusClass = stat.kampbonus > 15 ? 'is-high' : stat.kampbonus >= 10 ? 'is-mid' : stat.kampbonus > 0 ? 'is-low' : 'is-neutral';
                const bonusText = stat.attendedMatches > 0 ? stat.kampbonus.toFixed(1) : '-';
                const safeName = String(stat.navn).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                const extras = [];
                if (stat.mal > 0) extras.push(`⚽ ${stat.mal}`);
                if (stat.assist > 0) extras.push(`A ${stat.assist}`);
                if (stat.bb > 0) extras.push(`👑 ${stat.bb}`);
                if (stat.guleSerie > 0) extras.push(`🟨 ${stat.guleSerie}`);
                if (stat.rodeSerie > 0) extras.push(`🟥 ${stat.rodeSerie}`);

                const metaParts = [
                    stat.pos1 || 'Spiller',
                    `${stat.kamper} kamper`,
                    `${stat.oppmotePct}% oppmøte`
                ];
                if (extras.length) metaParts.push(...extras);

                return `
                    <button type="button" onclick="window.openSpillerDetail('${safeName}')" class="roster-player-row stats-player-row" aria-label="${stat.navn}, form ${stat.kjemi}, kampbidrag ${bonusText}">
                        <div class="stats-form-jersey ${formClass}" aria-hidden="true">
                            <span class="stats-form-jersey-value">${stat.kjemi}</span>
                            <span class="stats-form-jersey-label">Form</span>
                        </div>
                        <div class="roster-player-main">
                            <div class="roster-player-name">${stat.navn}${formTone === 'green' ? ' <span class="stats-player-star">★</span>' : ''}</div>
                            <div class="roster-player-meta">${metaParts.join('<span class="roster-player-meta-sep">·</span>')}</div>
                        </div>
                        <div class="roster-player-side">
                            <span class="stats-kb-badge ${bonusClass}">KB ${bonusText}</span>
                        </div>
                    </button>
                `;
            }).join('');
        };
        
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
            { id: 'mal', label: 'Mål', icon: 'fa-futbol' },
            { id: 'assist', label: 'Assist', icon: 'fa-handshake-angle' },
            { id: 'guleSerie', label: 'Gule kort', icon: 'fa-square', iconClass: 'stats-sort-icon-gk' },
            { id: 'rodeSerie', label: 'Røde kort', icon: 'fa-square', iconClass: 'stats-sort-icon-rk' },
            { id: 'bb', label: 'Banens beste', icon: 'fa-crown' },
            { id: 'oppmotePct', label: 'Oppmøte', icon: 'fa-user-check' },
            { id: 'kamper', label: 'Kamper', icon: 'fa-shield-halved' }
        ];

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
                    <i class="fa-solid ${opt.icon} ${opt.iconClass || ''}" aria-hidden="true"></i>
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
                <div class="stats-player-tools">
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
                    <div class="stats-player-search-row">
                        <div class="roster-search-wrap">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="search" id="statsPlayerSearchInput" oninput="handleStatsPlayerSearchChange()" placeholder="Søk etter navn, drakt eller posisjon…" class="roster-search-input" aria-label="Søk spillere i statistikk">
                        </div>
                    </div>
                </div>
                <div id="stats-player-list" class="roster-list stats-player-list"></div>
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

            window.renderSpillerDetailHero(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player);

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
        };

        
        window.renderPlayerStatsTable = function() {
            window.renderPlayerStatsList();
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
