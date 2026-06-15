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

            const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
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

        window.renderStatistikkSide = function() {
            // 1. KAMP-STATISTIKK
            let wins = 0, draws = 0, losses = 0, goals = 0;
            (window.activeMatches || []).forEach(m => {
                const score = parseScore(m.result);
                if (score !== null) {
                    goals += score.bsk;
                    if (score.bsk > score.opponent) wins++; else if (score.bsk === score.opponent) draws++; else losses++;
                }
            });
            
            if (document.getElementById('stats-page-wins')) document.getElementById('stats-page-wins').innerText = wins;
            if (document.getElementById('stats-page-draws')) document.getElementById('stats-page-draws').innerText = draws;
            if (document.getElementById('stats-page-losses')) document.getElementById('stats-page-losses').innerText = losses;
            if (document.getElementById('stats-page-goals')) document.getElementById('stats-page-goals').innerText = goals;

            // 2. TROPPSTATISTIKK
            const activePlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
            let totalAge = 0;
            let recruits = 0;

            activePlayers.forEach(p => {
                if (p.fodselsaar) totalAge += (2026 - parseInt(p.fodselsaar));
                if (p.status === 'Rekrutt') recruits++;
            });

            const avgAge = activePlayers.length > 0 ? (totalAge / activePlayers.length).toFixed(1) : 0;

            // RIKTIG LOGIKK FOR OPPMØTE: Tar utgangspunkt i lagets faktiske størrelse
            let totalEventTicks = 0, totalPossibleTicks = 0;
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            
            // NYTT: Hent dagens dato for å stoppe "fremtidsstraff"
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            allEvents.forEach(e => {
                // NYTT: Sjekk om hendelsen ligger i fremtiden. Hvis ja, hopp over!
                if (e.date) {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    if (eventDate > todayForStats) return; 
                }

                const eventTeam = e.team || 'Lag A'; 
                const teamPlayers = activePlayers.filter(p => p.spillerLag === eventTeam); 
                
                if (teamPlayers.length > 0) {
                    totalPossibleTicks += teamPlayers.length;
                    if (e.attendance) {
                        teamPlayers.forEach(p => {
                            if (window.isPlayerAttending(e.attendance, p)) {
                                totalEventTicks++;
                            }
                        });
                    }
                }
            });
            
            const avgAttendance = totalPossibleTicks > 0 ? Math.round((totalEventTicks / totalPossibleTicks) * 100) : 0;

            // Oppdater de nye HTML-boksene
            if (document.getElementById('stats-page-players')) document.getElementById('stats-page-players').innerText = activePlayers.length;
            if (document.getElementById('stats-page-age')) document.getElementById('stats-page-age').innerText = avgAge;
            if (document.getElementById('stats-page-recruits')) document.getElementById('stats-page-recruits').innerText = recruits;
            if (document.getElementById('stats-page-attendance')) document.getElementById('stats-page-attendance').innerText = `${avgAttendance}%`;
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
            // 1. Skjul alle de fire innholdscontainerne
            document.getElementById('stat-view-lag').className = "hidden";
            document.getElementById('stat-view-spillere').className = "hidden";
            document.getElementById('stat-view-poeng').className = "hidden";
            document.getElementById('stat-view-kampstat').className = "hidden";
            document.getElementById('stat-view-analyse').className = "hidden";
            
            // 2. Vis containeren som ble trykket på
            document.getElementById(`stat-view-${tabId}`).className = "block space-y-6";
            
            // 3. Nullstill alle knappene til passiv grå stil
            const inactiveClass = "stat-tab-btn portal-segment-btn";
            document.querySelectorAll('.stat-tab-btn').forEach(btn => {
                btn.className = inactiveClass;
            });
            
            // 4. Gi den aktive knappen felles aktiv-stil fra base.css
            const activeBtn = document.getElementById(`stat-tab-${tabId}`);
            if (activeBtn) {
                activeBtn.className = "stat-tab-btn portal-segment-btn is-active";
            }
            
            // 5. Kjør tilhørende funksjoner for den aktuelle fanen
            if (tabId === 'spillere') window.renderPlayerStatsTable();
            if (tabId === 'poeng') renderPointHistoryView();
            if (tabId === 'kampstat') renderMatchStatsView(); 
            if (tabId === 'analyse') renderAnalysisStatsView();
        };

        window.renderAnalysisStatsView = function() {
    const container = document.getElementById('stat-view-analyse');
    if (!container) return;
        container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-bsk-blue mb-3"></i>
            <h3 class="font-black text-slate-800 text-lg mb-1">Laster analyse</h3>
            <p class="text-sm text-slate-500">Regner ut form, BB, mål og poeng per kamp...</p>
        </div>
    `;

    const players = (window.activePlayers || []).filter(p => p.status !== 'Passiv');

    const matches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!players.length || !matches.length) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-chart-line text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Ikke nok data ennå</h3>
                <p class="text-sm text-slate-500">Registrer kamper, oppmøte, mål, BB og spillerbørs for å bygge analysebildet.</p>
            </div>
        `;
        return;
    }

    const playerStats = players.map(player => {
                const name = player.navn || player.name || player.fullName || player.spiller || '';
                if (!name) return null;

                const playerMatches = matches.filter(m =>
                    window.isPlayerAttending(m.attendance, player)
                );

                let totalPoints = 0;
                let goals = 0;
                let assists = 0;
                let bb = 0;
                let yellow = 0;
                let yellowSerie = 0;
                let red = 0;
                let redSerie = 0;
                let ratings = [];

                playerMatches.forEach(m => {
                    const points = typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(m, name)
                        : 0;

                    totalPoints += points;

                    if (window.getPlayerRefMapValue(m.scorers, player, 0)) goals += Number(window.getPlayerRefMapValue(m.scorers, player, 0)) || 0;
                    if (window.getPlayerRefMapValue(m.assists, player, 0)) assists += Number(window.getPlayerRefMapValue(m.assists, player, 0)) || 0;
                    if (window.motmMatchesPlayer(m.motm, player)) bb += 1;
                    if (window.playerRefListIncludes(m.guleKort, player)) yellow += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.guleKort, player)) yellowSerie += 1;
                    if (window.playerRefListIncludes(m.rodeKort, player)) red += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.rodeKort, player)) redSerie += 1;

                    const playerRating = window.getPlayerRefMapValue(m.ratings, player, 0);
                    if (playerRating) {
                        ratings.push({
                            date: m.date,
                            rating: Number(playerRating) || 0,
                            opponent: m.opponent || ''
                        });
                    }
                });

                const lastFiveRatings = ratings
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                const avgRating = ratings.length
                    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                    : 0;

                const formLastFive = lastFiveRatings.length
                    ? lastFiveRatings.reduce((sum, r) => sum + r.rating, 0) / lastFiveRatings.length
                    : 0;

                // Sørger for at vi alltid returnerer et tall, selv om ingen kamper er spilt
                const pointsPerMatch = (playerMatches.length > 0) 
                    ? (totalPoints / playerMatches.length) 
                    : 0;
        
                return {
                    name,
                    matches: playerMatches.length || 0,
                    totalPoints: totalPoints || 0,
                    pointsPerMatch: pointsPerMatch || 0,
                    goals: goals || 0,
                    assists: assists || 0,
                    bb: bb || 0,
                    yellow: yellow || 0,
                    yellowSerie: yellowSerie || 0,
                    red: red || 0,
                    redSerie: redSerie || 0,
                    avgRating: avgRating || 0,
                    formLastFive: formLastFive || 0
                };
            }).filter(Boolean);

    const activeStats = playerStats.filter(p => p.matches > 0);

    const topFormPlayer = [...activeStats].sort((a, b) => b.formLastFive - a.formLastFive)[0];
    const bbLeader = [...activeStats].sort((a, b) => b.bb - a.bb)[0];
    const topScorer = [...activeStats].sort((a, b) => b.goals - a.goals)[0];
    const assistLeader = [...activeStats].sort((a, b) => b.assists - a.assists)[0];
    const pointsLeader = [...activeStats].sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0];

    const formTable = [...activeStats]
        .sort((a, b) => b.formLastFive - a.formLastFive)
        .slice(0, 8);

    const bbTable = [...activeStats]
        .filter(p => p.bb > 0)
        .sort((a, b) => b.bb - a.bb || b.formLastFive - a.formLastFive)
        .slice(0, 8);

    const scorerTable = [...activeStats]
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals || b.pointsPerMatch - a.pointsPerMatch)
        .slice(0, 8);

    const assistTable = [...activeStats]
        .filter(p => p.assists > 0)
        .sort((a, b) => b.assists - a.assists || b.pointsPerMatch - a.pointsPerMatch)
        .slice(0, 8);

    const pointsTable = [...activeStats]
        .sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)
        .slice(0, 8);

    const followUps = activeStats
        .filter(p => p.redSerie > 0 || p.yellowSerie >= 3 || p.formLastFive < 5.5 || p.matches <= 2)
        .map(p => {
            let reason = [];

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

            return {
                name: p.name,
                reason: reason.join(', ')
            };
        })
        .slice(0, 8);

    const card = (label, value, sub, icon, colorClass) => `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${label}</span>
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <i class="fa-solid ${icon} ${colorClass} text-lg"></i>
                </div>
            </div>
            <div class="text-2xl font-black text-slate-900 leading-tight">${value || '-'}</div>
            <div class="text-xs text-slate-500 mt-1">${sub || ''}</div>
        </div>
    `;

    const smallTable = (title, subtitle, headers, rowsHtml) => `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50">
                <h3 class="font-black text-slate-800 text-sm">${title}</h3>
                <p class="text-xs text-slate-500 mt-1">${subtitle}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                        <tr>${headers}</tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${rowsHtml || `
                            <tr>
                                <td colspan="5" class="p-5 text-center text-slate-400 italic text-xs">Ingen data ennå</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="space-y-6">

            <div class="bg-gradient-to-br from-white via-sky-50 to-amber-50 rounded-2xl p-6 shadow-sm text-slate-900 border border-slate-200 border-b-4 border-bsk-yellow">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p class="text-[10px] font-black text-bsk-blue uppercase tracking-[0.25em] mb-2">Statistikk 2.0</p>
                        <h2 class="text-2xl font-black tracking-tight text-bsk-blue">Analyse og trenerinnsikt</h2>
                        <p class="text-sm text-slate-600 mt-1">Form, BB, mål, assists, poeng per kamp og spillere som bør følges opp.</p>
                    </div>
                    <div class="shrink-0">
                        <div class="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/85 border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-slate-500 tracking-wider leading-none">
                                Grunnlag
                            </p>
                            <p class="text-xl md:text-3xl font-black text-bsk-blue leading-tight mt-1">
                                ${matches.length}
                            </p>
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-amber-700 tracking-wider leading-none">
                                kamper
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                ${card(
                    'Formspiller',
                    topFormPlayer ? topFormPlayer.name : '-',
                    topFormPlayer ? `Snitt siste 5: ${topFormPlayer.formLastFive.toFixed(1)}` : 'Ingen formdata',
                    'fa-fire',
                    'text-orange-500'
                )}

                ${card(
                    'BB-leder',
                    bbLeader ? bbLeader.name : '-',
                    bbLeader ? `${bbLeader.bb} BB-kåringer` : 'Ingen BB registrert',
                    'fa-crown',
                    'text-indigo-500'
                )}

                ${card(
                    'Toppscorer',
                    topScorer ? topScorer.name : '-',
                    topScorer ? `${topScorer.goals} mål` : 'Ingen mål registrert',
                    'fa-futbol',
                    'text-emerald-500'
                )}

                ${card(
                    'Assistkonge',
                    assistLeader ? assistLeader.name : '-',
                    assistLeader ? `${assistLeader.assists} assists` : 'Ingen assists registrert',
                    'fa-handshake-angle',
                    'text-sky-500'
                )}

                ${card(
                    'Poeng per kamp',
                    pointsLeader ? pointsLeader.name : '-',
                    pointsLeader ? `${pointsLeader.pointsPerMatch.toFixed(1)} poeng i snitt` : 'Ingen poengdata',
                    'fa-chart-line',
                    'text-bsk-blue'
                )}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                ${smallTable(
                    'Form siste 5 kamper',
                    'Sortert på snittbørs i spillerens siste registrerte kamper.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Kamper</th>
                        <th class="p-4 text-center">Snittbørs</th>
                        <th class="p-4 text-center">Mål</th>
                        <th class="p-4 text-center">Assist</th>
                        <th class="p-4 text-center">BB</th>
                    `,
                    formTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">${p.matches}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black ${
                                    p.formLastFive >= 7 ? 'bg-orange-100 text-orange-700' :
                                    p.formLastFive >= 6 ? 'bg-emerald-100 text-emerald-700' :
                                    p.formLastFive > 0 ? 'bg-slate-100 text-slate-600' :
                                    'bg-slate-50 text-slate-300'
                                }">
                                    ${p.formLastFive.toFixed(1)}
                                </span>
                            </td>
                            <td class="p-4 text-center font-bold">${p.goals}</td>
                            <td class="p-4 text-center font-bold">${p.assists}</td>
                            <td class="p-4 text-center">
                                ${
                                    p.bb > 0
                                        ? `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">👑 +${p.bb}</span>`
                                        : `<span class="text-slate-300 font-bold">-</span>`
                                }
                            </td>
                        </tr>
                    `).join('')
                )}

                ${smallTable(
                    'Poeng per kamp',
                    'Viser hvem som leverer mest når de faktisk spiller.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Kamper</th>
                        <th class="p-4 text-center">Totalt</th>
                        <th class="p-4 text-right">Snitt</th>
                    `,
                    pointsTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">${p.matches}</td>
                            <td class="p-4 text-center">${Math.round(p.totalPoints)}</td>
                            <td class="p-4 text-right font-black text-bsk-blue">${p.pointsPerMatch.toFixed(1)}</td>
                        </tr>
                    `).join('')
                )}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                ${smallTable(
                    'BB-liga',
                    'Antall ganger spilleren er kåret til banens beste.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center text-indigo-600">BB</th>
                    `,
                    bbTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                                    👑 +${p.bb}
                                </span>
                            </td>
                        </tr>
                    `).join('')
                )}

                ${smallTable(
                    'Toppscorer',
                    'Mål registrert på kampdetaljene.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Mål</th>
                        <th class="p-4 text-right">Mål/kamp</th>
                    `,
                    scorerTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                                    ⚽ ${p.goals}
                                </span>
                            </td>
                            <td class="p-4 text-right">${p.matches ? (p.goals / p.matches).toFixed(2) : '0.00'}</td>
                        </tr>
                    `).join('')
                )}

                ${smallTable(
                    'Assistliga',
                    'Assist registrert på kampdetaljene. Vises som motivasjon, men påvirker ikke Form eller Kampbidrag.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Assist</th>
                        <th class="p-4 text-right">Assist/kamp</th>
                    `,
                    assistTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                                    A ${p.assists}
                                </span>
                            </td>
                            <td class="p-4 text-right">${p.matches ? (p.assists / p.matches).toFixed(2) : '0.00'}</td>
                        </tr>
                    `).join('')
                )}
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-black text-slate-800 text-sm">Oppfølging</h3>
                    <p class="text-xs text-slate-500 mt-1">Spillere som trenerteamet bør følge litt ekstra med på.</p>
                </div>
                <div class="divide-y divide-slate-100">
                    ${
                        followUps.length
                            ? followUps.map(p => `
                                <div class="p-4 hover:bg-amber-50/40 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                                            <i class="fa-solid fa-triangle-exclamation text-sm"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-black text-slate-800">${p.name}</div>
                                            <div class="text-xs text-slate-500 leading-snug">${p.reason}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')
                            : `
                                <div class="p-6 text-center text-slate-400 italic text-xs">
                                    Ingen tydelige varsler akkurat nå.
                                </div>
                            `
                    }
                </div>
            </div>

        </div>
    `;
};
        
       window.renderPointHistoryView = function() {
    const container = document.getElementById('stat-view-poeng');
    if (!container) return;
    
    const harSpiltMinstEnKamp = (playerName, spillerLag) => {
        return (window.activeMatches || []).some(m => 
            m.matchGroup === spillerLag && 
            window.isPlayerAttending(m.attendance, playerName)
        );
    };

    const playerOptions = (window.activePlayers || [])
    .filter(p => p.status !== 'Passiv')
    .sort((a, b) => a.navn.localeCompare(b.navn));

    const defaultPlayer = playerOptions
        .map(p => ({
            ...p,
            chemistry: typeof window.calculatePlayerPerformanceChemistry === 'function'
                ? window.calculatePlayerPerformanceChemistry(p.navn)
                : 0
        }))
        .sort((a, b) => b.chemistry - a.chemistry)[0];
    
    const defaultPlayerName = defaultPlayer ? defaultPlayer.navn : '';
    
    const optionsHtml = playerOptions
        .map(p => `
            <option 
                class="text-slate-900 bg-white" 
                value="${p.navn}"
                ${p.navn === defaultPlayerName ? 'selected' : ''}
            >
                ${p.navn}
            </option>
        `)
        .join('');
        
    let html = `
        <div class="space-y-6">

            <div class="bg-gradient-to-br from-white via-sky-50 to-amber-50 rounded-2xl p-5 md:p-6 shadow-sm text-slate-900 border border-slate-200 border-b-4 border-bsk-yellow">
                <div class="flex items-start justify-between gap-4">
                    
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-black text-bsk-blue uppercase tracking-[0.25em] mb-2">
                            Spilleranalyse
                        </p>
                    
                        <div class="relative inline-block w-full max-w-[230px] sm:max-w-[290px] md:max-w-none md:w-auto">
                            <select 
                                id="poeng-player-select" 
                                onchange="showPlayerPointsTable()" 
                                class="portal-field portal-field-strong w-full md:w-auto"
                            >
                                ${optionsHtml}
                            </select>
                    
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-bsk-blue text-xs pointer-events-none"></i>
                        </div>
                    
                        <p class="text-xs md:text-sm text-slate-600 mt-3 leading-snug max-w-xl">
                            Se utvikling, form, matchpoeng og kampbidrag for valgt spiller.
                        </p>
                    </div>
            
                    <div class="shrink-0 pt-7 md:pt-0">
                        <div class="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/85 border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-slate-500 tracking-wider leading-none">
                                Snitt
                            </p>
                            <p id="player-banner-main" class="text-xl md:text-3xl font-black text-bsk-blue leading-tight mt-1">
                                -
                            </p>
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-amber-700 tracking-wider leading-none">
                                poeng
                            </p>
                        </div>
            
                        <p id="player-banner-sub" class="hidden md:block text-[10px] text-slate-500 mt-2 text-center">
                            valgt spiller
                        </p>
                    </div>
            
                </div>
            </div>

            <div id="poeng-table-container">
                <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                    <i class="fa-solid fa-user-chart text-4xl text-slate-300 mb-3"></i>
                    <h3 class="font-black text-slate-800 text-lg mb-1">Velg en spiller</h3>
                    <p class="text-sm text-slate-500">Da får du nøkkeltall og poenghistorikk for spilleren.</p>
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;

if (defaultPlayerName) {
    showPlayerPointsTable();
}
};

        window.showPlayerPointsTable = function() {
    const playerName = document.getElementById('poeng-player-select').value;
    const container = document.getElementById('poeng-table-container');
    
    if (!container) return;

    if (!playerName) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-user-chart text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Velg en spiller</h3>
                <p class="text-sm text-slate-500">Da får du nøkkeltall og poenghistorikk for spilleren.</p>
            </div>
        `;
        return;
    }
    
    const player = (window.activePlayers || []).find(p => p.navn === playerName);
    const history = typeof window.getPlayerMatchPointsHistory === 'function' ? window.getPlayerMatchPointsHistory(playerName) : [];
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-circle-info text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Ingen spilte kamper</h3>
                <p class="text-sm text-slate-500">Ingen spilte kamper er registrert for denne spilleren ennå.</p>
            </div>
        `;
        return;
    }

    const chemistry = typeof window.calculatePlayerPerformanceChemistry === 'function'
        ? window.calculatePlayerPerformanceChemistry(playerName)
        : 0;

    const totalMatches = history.length;

    const ratings = history
        .map(h => Number(h.rating))
        .filter(r => !isNaN(r) && r > 0);

    const avgRating = ratings.length
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
    const avgPoints = totalMatches ? totalPoints / totalMatches : 0;

    const bannerMain = document.getElementById('player-banner-main');
    const bannerSub = document.getElementById('player-banner-sub');
    
    if (bannerMain) {
        bannerMain.textContent = avgPoints ? avgPoints.toFixed(1) : '-';
    }
    
    if (bannerSub) {
        bannerSub.textContent = totalPoints + ' poeng totalt';
    }

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

    const card = (label, value, sub, icon, iconClass) => `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${label}</span>
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <i class="fa-solid ${icon} ${iconClass}"></i>
                </div>
            </div>
            <div class="text-2xl font-black text-slate-900">${value}</div>
            <div class="text-xs text-slate-500 mt-1">${sub}</div>
        </div>
    `;

    let tableHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            ${card('Form', chemistry + '/100', 'Kampbidrag, oppmøte og disiplin', 'fa-heart-pulse', 'text-emerald-600')}
            ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
            ${card('Snittbørs', avgRating ? avgRating.toFixed(1) : '-', 'Gjennomsnittlig spillerbørs', 'fa-star', 'text-amber-500')}
            ${card('Mål / Assist', `${totalGoals} / ${totalAssists}`, `${totalBb} BB · Serie ${totalYellowSerie}/${totalRedSerie} · Cup ${totalYellowCup}/${totalRedCup}`, 'fa-chart-line', 'text-indigo-600')}
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-black text-slate-800 text-sm">${playerName}</h3>
                        <p class="text-xs text-slate-500 mt-1 leading-snug">
                            Poenghistorikk per kamp. Nyeste kamp vises øverst.
                        </p>
                    </div>

                    <button 
                        onclick="document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');"
                        class="portal-btn portal-btn-success portal-btn-sm shrink-0"
                    >
                        <i class="fa-solid fa-circle-info"></i>
                        <span class="sm:hidden">Form</span>
                        <span class="hidden sm:inline">Slik regnes form</span>
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                        <tr>
                            <th class="p-4">Dato</th>
                            <th class="p-4">Motstander</th>
                            <th class="p-4 text-center">Poeng</th>
                            <th class="p-4 text-center">Børs</th>
                            <th class="p-4 text-center">Mål</th>
                            <th class="p-4 text-center">Assist</th>
                            <th class="p-4 text-center text-indigo-600">BB</th>
                            <th class="p-4 text-center">Gult</th>
                            <th class="p-4 text-center">Rødt</th>
                            <th class="p-4 text-center">Res</th>
                            <th class="p-4 text-right">Rediger</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
    `;
    
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

        const målVis = goals > 0
            ? `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black">⚽ ${goals}</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const assistVis = assists > 0
            ? `<span class="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full text-xs font-black">A ${assists}</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const bbVis = bb
            ? `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black">👑 +1</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const yellowVis = yellow
            ? `<span class="text-amber-500 font-black">🟨</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const redVis = red
            ? `<span class="text-rose-600 font-black">🟥 -10</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const dateText = h.date
            ? new Date(h.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
            : '-';

        tableHtml += `
            <tr class="hover:bg-slate-50 transition" title="${h.breakdown}">
                <td class="p-4 text-slate-500 font-medium">${dateText}</td>
                <td class="p-4 font-black text-slate-800">${h.opponent}${h.onPitch === false ? ' <span class="text-[9px] text-amber-700 font-bold">(benk)</span>' : ''}</td>
                <td class="p-4 text-center font-black text-lg ${pointColor}">${h.points}</td>
	                <td class="p-4 text-center">
	                    <span class="bg-bsk-blue text-white px-2 py-1 rounded text-[10px] font-black shadow-sm">${h.rating}</span>
	                </td>
	                <td class="p-4 text-center">${målVis}</td>
	                <td class="p-4 text-center">${assistVis}</td>
	                <td class="p-4 text-center">${bbVis}</td>
                <td class="p-4 text-center">${yellowVis}</td>
                <td class="p-4 text-center">${redVis}</td>
                <td class="p-4 text-center font-semibold text-slate-600">${h.result}</td>
                <td class="p-4 text-right">
                    <button
                        onclick="openMatchStatsEditor('${h.matchId}')"
                        title="Rediger mål, assist, kort og spillerbørs"
                        class="portal-btn portal-btn-icon-sm portal-btn-warning"
                    >
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = tableHtml;
};

        window.renderMatchStatsView = function() {
    const container = document.getElementById('stat-view-kampstat');
    if (!container) return;

    // Filtrer ut kamper som er spilt (som har et resultat)
    const playedMatches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Nyeste øverst

    // Bygg nedtrekksmenyen for kampene
    const optionsHtml = playedMatches.map(m => {
        const dateStr = new Date(m.date).toLocaleDateString('no-NO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const resultText = m.result ? ` · ${m.result}` : '';
        const groupText = m.matchGroup ? ` (${m.matchGroup})` : '';

        return `<option value="${m.id}">${m.opponent}${resultText}</option>`;
    }).join('');

let html = `
    <div class="space-y-6">
        <div id="kampstat-table-container">
            <div class="text-center py-10 text-slate-400 italic text-sm">
                ${playedMatches.length ? 'Laster siste spilte kamp...' : 'Ingen spilte kamper med resultat er registrert ennå.'}
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

    const playedMatches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

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
        
        const attendance = match.attendance || {};
        
        let attendingPlayers = window.getAttendingPlayerRefs(attendance);
        
        // Fallback: hvis attendance mangler, men ratings/scorers finnes, bruk dem
        if (attendingPlayers.length === 0) {
            const ratingPlayers = match.ratings ? Object.keys(match.ratings) : [];
            const scorerPlayers = match.scorers ? Object.keys(match.scorers) : [];
            const assistPlayers = match.assists ? Object.keys(match.assists) : [];
            const bbPlayer = match.motm ? [match.motm] : [];
        
            attendingPlayers = [...new Set([
                ...ratingPlayers,
                ...scorerPlayers,
                ...assistPlayers,
                ...bbPlayer
            ])];
        }
            
    if (attendingPlayers.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-slate-500 font-medium">Ingen spillere var registrert med oppmøte på denne kampen.</div>';
        return;
    }

    const stats = attendingPlayers.map(playerRef => {
        const rating = Number(window.getPlayerRefMapValue(match.ratings, playerRef, 0)) || 0;
        const goals = Number(window.getPlayerRefMapValue(match.scorers, playerRef, 0)) || 0;
        const assists = Number(window.getPlayerRefMapValue(match.assists, playerRef, 0)) || 0;
        const yellow = window.playerRefListIncludes(match.guleKort, playerRef) ? 1 : 0;
        const red = window.playerRefListIncludes(match.rodeKort, playerRef) ? 1 : 0;
        const isBbInMatch = window.motmMatchesPlayer(match.motm, playerRef);

        const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, playerRef, true)
            : { total: 0, base: 0, resultBonus: 0, ratingBonus: 0, bbBonus: 0 };

        return {
            name: window.getPlayerNameFromRef(playerRef),
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

    const topFiveHtml = stats.slice(0, 5).map((s, index) => `
        <div class="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-full ${index === 0 ? 'bg-bsk-yellow text-bsk-blue' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-black text-xs shrink-0">
                    ${index + 1}
                </div>
                <div class="min-w-0">
                    <div class="font-black text-slate-800 truncate">${s.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Børs ${s.rating || '-'} · Mål ${s.goals} · Assist ${s.assists} · BB ${s.isBbInMatch ? '+1' : '-'}
                    </div>
                </div>
            </div>
            <div class="text-right font-black ${pointColor(s.points)}">${s.points}</div>
        </div>
    `).join('');

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
        <div class="space-y-6">

            <div class="bg-gradient-to-br from-white via-sky-50 to-amber-50 rounded-2xl p-6 shadow-sm text-slate-900 border border-slate-200 border-b-4 border-bsk-yellow">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div>
                        <p class="text-[10px] font-black text-bsk-blue uppercase tracking-[0.25em] mb-2">Kampanalyse</p>
                        <h2 class="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 flex-nowrap text-bsk-blue">
                            <span>BSK -</span>
                            <span class="relative inline-block flex-1 min-w-0 max-w-[260px]">
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
                                                class="text-slate-900" 
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
                                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-bsk-blue text-xs pointer-events-none"></i>
                            </span>
                        </h2>
                        <p class="text-sm text-slate-600 mt-1">
                            ${matchType} ${matchGroup ? '· ' + matchGroup : ''} ${dateStr ? '· ' + dateStr : ''} ${pitch ? '· ' + pitch : ''}
                        </p>
                    </div>
                    <div class="bg-white/85 border border-slate-200 rounded-2xl px-6 py-4 text-center min-w-[130px] shadow-sm">
                        <p class="text-[10px] uppercase font-black text-slate-500 mb-1">Resultat</p>
                        <p class="text-3xl font-black text-amber-700">${matchResult}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Banens beste</span>
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">👑</div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${bbPlayer ? bbPlayer.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${bbPlayer ? '+1 BB-bonus' : 'Ingen BB registrert'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toppscorer</span>
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">⚽</div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${topScorer && topScorer.goals > 0 ? topScorer.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${topScorer && topScorer.goals > 0 ? topScorer.goals + ' mål' : 'Ingen mål registrert'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mest poeng</span>
                        <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <i class="fa-solid fa-chart-line text-bsk-blue"></i>
                        </div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${pointsLeader ? pointsLeader.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${pointsLeader ? pointsLeader.points + ' matchpoeng' : 'Ingen poengdata'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kampbildet</span>
                        <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                            <i class="fa-solid fa-clipboard-list text-amber-600"></i>
                        </div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${avgRating ? avgRating.toFixed(1) : '-'}</div>
	                    <div class="text-xs text-slate-500 mt-1">Snittbørs · ${totalGoals} mål · ${totalAssists} assist · ${totalYellow}🟨 ${totalRed}🟥</div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-5 border-b border-slate-100 bg-slate-50">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="font-black text-slate-800 text-sm">Spillerstatistikk</h3>
                                <p class="text-xs text-slate-500 mt-1 leading-snug">
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
                            <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                <tr>
                                    <th class="p-4">Spiller</th>
                                    <th class="p-4 text-center">Poeng</th>
	                                    <th class="p-4 text-center">Børs</th>
	                                    <th class="p-4 text-center">Mål</th>
	                                    <th class="p-4 text-center">Assist</th>
	                                    <th class="p-4 text-center text-indigo-600">BB</th>
                                    <th class="p-4 text-center">Gult</th>
                                    <th class="p-4 text-center">Rødt</th>
                                    <th class="p-4 text-center">Res/Mål</th>
                                    <th class="p-4 text-center">Start</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-5 border-b border-slate-100 bg-slate-50">
                        <h3 class="font-black text-slate-800 text-sm">Kampoppsummering</h3>
                        <p class="text-xs text-slate-500 mt-1">Kort bilde av kampen basert på registrerte data.</p>
                    </div>
                
                    <div class="p-5 space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Snittbørs</p>
                                <p class="text-xl font-black text-bsk-blue mt-1">${avgRating ? avgRating.toFixed(1) : '-'}</p>
                            </div>
                
	                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
	                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mål</p>
	                                <p class="text-xl font-black text-emerald-600 mt-1">${totalGoals}</p>
	                            </div>

	                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
	                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assist</p>
	                                <p class="text-xl font-black text-sky-600 mt-1">${totalAssists}</p>
	                            </div>
	                
	                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gule kort</p>
                                <p class="text-xl font-black text-amber-600 mt-1">${totalYellow}</p>
                            </div>
                
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Røde kort</p>
                                <p class="text-xl font-black text-rose-600 mt-1">${totalRed}</p>
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
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trenernotater</p>
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
            
            const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
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

            theadContainer.className = "bg-slate-50 text-slate-500 text-xs uppercase font-bold cursor-pointer select-none border-b border-slate-200";
            theadContainer.innerHTML = `
                <tr>
                    <th class="p-4 hover:text-slate-800 transition-colors" onclick="sortStatsTable('navn')">Spiller <span id="sort-icon-navn"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('oppmotePct')">Oppmøte <span id="sort-icon-oppmotePct"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('kamper')">Kamper <span id="sort-icon-kamper"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('mal')">Mål <span id="sort-icon-mal"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('assist')">Assist <span id="sort-icon-assist"></span></th>
                    <th class="p-4 text-center text-indigo-600 hover:text-indigo-800 transition-colors" onclick="sortStatsTable('bb')">BB <span id="sort-icon-bb"></span></th>
                    <th class="p-4 text-center text-blue-500 hover:text-blue-700 transition-colors" onclick="sortStatsTable('kampbonus')">Kampbidrag <span id="sort-icon-kampbonus"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('guleSerie')" title="Gule kort i seriespill">Gul S <span id="sort-icon-guleSerie"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('guleCup')" title="Gule kort i cup">Gul C <span id="sort-icon-guleCup"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('rodeSerie')" title="Røde kort i seriespill">Rød S <span id="sort-icon-rodeSerie"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('rodeCup')" title="Røde kort i cup">Rød C <span id="sort-icon-rodeCup"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors">
                        <span onclick="sortStatsTable('kjemi')">Form <span id="sort-icon-kjemi"></span></span>
                        <i class="fa-solid fa-circle-info text-emerald-500 hover:text-emerald-400 ml-2 cursor-pointer transition-colors" onclick="event.stopPropagation(); document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');" title="Les mer om Form"></i>
                    </th>
                </tr>
            `;

            ['navn', 'oppmotePct', 'kamper', 'mal', 'assist', 'bb', 'kampbonus', 'guleSerie', 'guleCup', 'rodeSerie', 'rodeCup', 'kjemi'].forEach(col => {
                const iconEl = document.getElementById(`sort-icon-${col}`);
                if(iconEl) iconEl.innerHTML = col === currentStatSortCol ? (currentStatSortDesc ? '<i class="fa-solid fa-sort-down ml-1 text-bsk-blue"></i>' : '<i class="fa-solid fa-sort-up ml-1 text-bsk-blue"></i>') : '';
            });

            tableBody.className = "divide-y divide-slate-100 bg-white";

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

                return `
                    <tr class="bg-white hover:bg-slate-50 transition-colors">
                        <td class="p-4"><div class="font-bold text-slate-800">${stat.navn}</div><div class="text-[10px] text-slate-500 uppercase tracking-wide">${stat.pos1}</div></td>
                        <td class="p-4 text-center font-bold text-slate-700">${stat.oppmotePct}%</td>
                        <td class="p-4 text-center font-bold text-slate-800">${stat.kamper}</td>
                        <td class="p-4 text-center ${malFarge}">${stat.mal > 0 ? stat.mal : '-'}</td>
                        <td class="p-4 text-center ${assistFarge}">${stat.assist > 0 ? stat.assist : '-'}</td>
                        <td class="p-4 text-center ${bbFarge}">${stat.bb > 0 ? stat.bb : '-'}</td>
                        <td class="p-4 text-center font-bold ${bonusColor}">${bonusTekst}</td>
                        <td class="p-4 text-center ${gulSerieFarge}" title="${stat.serieAtRisk ? 'Faresone: karantene ved neste gule i serie' : 'Gule kort i seriespill'}">${stat.guleSerie > 0 ? stat.guleSerie : '-'}</td>
                        <td class="p-4 text-center ${gulCupFarge}" title="Gule kort i cup">${stat.guleCup > 0 ? stat.guleCup : '-'}</td>
                        <td class="p-4 text-center ${rodSerieFarge}" title="Røde kort i seriespill">${stat.rodeSerie > 0 ? stat.rodeSerie : '-'}</td>
                        <td class="p-4 text-center ${rodCupFarge}" title="Røde kort i cup">${stat.rodeCup > 0 ? stat.rodeCup : '-'}</td>
                        <td class="p-4 text-center font-bold ${chemColor}">${stat.kjemi}/100 ${isStarPlayer ? '<span class="ml-1 text-xs text-amber-400">★</span>' : ''}</td>
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
