window.goToMatchDetails = function(matchId) {
    if (!matchId) return;
    switchTab('kamper');
    if (typeof window.showMatchDetails === 'function') window.showMatchDetails(matchId);
};

window.goToCalendarDate = function(dateStr) {
    if (dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            window.currentCalendarDate = new Date(year, month - 1, 1);
            window.selectedCalendarDateStr = dateStr;
        }
    }

    switchTab('oppmote');
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
};

window.goToPlayerAnalysis = function(playerName) {
    switchTab('statistikk');

    if (typeof window.switchStatTab === 'function') {
        window.switchStatTab('poeng');
    }

    const playerSelect = document.getElementById('poeng-player-select');
    if (playerSelect && playerName) {
        const hasPlayer = Array.from(playerSelect.options).some(option => option.value === playerName);
        if (hasPlayer) playerSelect.value = playerName;
    }

    if (typeof window.showPlayerPointsTable === 'function') window.showPlayerPointsTable();
};

window.activateDashboardCardFromKeyboard = function(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.currentTarget.click();
};

window.updateDashboard = function() {
    let upcoming = [], totalGoals = 0, wins = 0, played = 0, draws = 0, losses = 0;
    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    
    matches.forEach(m => {
        const score = window.parseScore(m.result);
        if (score !== null) {
            played++; totalGoals += score.bsk;
            if (score.bsk > score.opponent) wins++;
            else if (score.bsk === score.opponent) draws++;
            else losses++;
        } else upcoming.push(m);
    });

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    const heroContainer = document.getElementById('hjem-hero-match-container');
    const dangerZoneContainer = document.getElementById('hjem-suspensions-danger-zone');
    
    if (heroContainer) {
        if (upcoming.length > 0) {
            const nm = upcoming[0];
            const dateValue = new Date(nm.date);
            const dateFormatted = Number.isNaN(dateValue.getTime())
                ? 'Dato ikke satt'
                : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
            const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
            const matchTypeLabel = nm.matchType || 'Kamp';
            const durationLabel = nm.duration || '90 min';
            const sides = typeof window.getMatchCardSides === 'function'
                ? window.getMatchCardSides(nm)
                : {
                    venueLabel: 'Borte',
                    left: { name: nm.opponent, isBsk: false },
                    right: { name: 'Bækkelaget', isBsk: true }
                };
            const renderHeroTeamHtml = (team) => {
                const crestClass = team.isBsk ? 'match-detail-crest' : 'match-detail-crest match-detail-crest-opponent';
                const iconClass = team.isBsk ? 'fa-shield-halved' : 'fa-shield';
                return `
                    <div class="match-detail-team">
                        <div class="${crestClass}">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <span class="match-detail-team-name">${team.name}</span>
                    </div>
                `;
            };
            
            // Henter ut karantener
            const teamSuspensions = typeof window.getDisciplineStatusForTeam === 'function' ? window.getDisciplineStatusForTeam(nm.matchGroup, nm.date) : {};
            const suspendedPlayers = Object.keys(teamSuspensions).filter(p => teamSuspensions[p].isSuspended);
            
            // Henter meldte forfall
            const forfallPlayers = [];
            if (nm.attendance) {
                Object.entries(nm.attendance).forEach(([pName, isReady]) => {
                    if (isReady === false) forfallPlayers.push(pName);
                });
            }

            // Oppdaterer den dedikerte "Utilgjengelig"-boksen til høyre på forsiden
            if (dangerZoneContainer) {
                dangerZoneContainer.innerHTML = '';
                if (suspendedPlayers.length === 0 && forfallPlayers.length === 0) {
                    dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Alle mann er meldt klare og tilgjengelige! 🦅</p>`;
                } else {
                    suspendedPlayers.forEach(p => {
                        const s = teamSuspensions[p];
                        const badgeColor = s.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-rose-50 border border-rose-100 p-2 rounded-xl text-xs font-bold text-rose-900 shadow-sm">
                                <span class="truncate">🚨 ${p}</span>
                                <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-black shrink-0">KARANTENE</span>
                            </div>`;
                    });
                    forfallPlayers.forEach(p => {
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-500">
                                <span class="truncate">❌ ${p}</span>
                                <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black shrink-0">MELDT FORFALL</span>
                            </div>`;
                    });
                }
            }

            // --- OPPGRADERTE KLIKKBAR BADGE (Tar deg rett til kampen) ---
            let herosuspensionBadgeHtml = '';
            if (suspendedPlayers.length > 0) {
                // Vi har lagt til onclick, cursor-pointer og fjernet den gamle title-teksten
                herosuspensionBadgeHtml = `
                    <span onclick="event.stopPropagation(); switchTab('kamper'); showMatchDetails('${nm.id}')" 
                          class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse border border-white/20 cursor-pointer z-20 hover:bg-red-700 hover:scale-115 transition-all" 
                          title="Karantene registrert! Klikk for å se hvem.">
                        ${suspendedPlayers.length}
                    </span>
                `;
            }

            // HTML for forsiden bruker samme kortspråk som kampdetaljer.
            heroContainer.innerHTML = `
                <article onclick="window.goToMatchDetails('${nm.id}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-next-match-card dashboard-click-card">
                    <div class="dashboard-next-match-watermark">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>

                    <div class="match-detail-card-top relative z-10">
                        <div class="match-detail-meta relative">
                            ${herosuspensionBadgeHtml}
                            <i class="fa-regular fa-calendar-days"></i>
                            <span>${dateLabel}</span>
                        </div>
                        <div class="match-detail-chip">
                            <i class="fa-solid fa-futbol"></i>
                            <span>${matchTypeLabel}</span>
                        </div>
                        <div class="match-detail-chip match-detail-chip-muted">
                            <i class="fa-solid ${sides.venue === 'Hjemme' ? 'fa-house' : 'fa-plane'}"></i>
                            <span>${sides.venueLabel}</span>
                        </div>
                    </div>

                    <div class="match-detail-main relative z-10">
                        ${renderHeroTeamHtml(sides.left)}

                        <div class="match-detail-center">
                            <span class="match-detail-time">${nm.time || '--:--'}</span>
                            <span class="match-detail-sub">Kampstart</span>
                        </div>

                        ${renderHeroTeamHtml(sides.right)}
                    </div>

                    <div class="match-detail-footer relative z-10">
                        <div class="match-detail-footer-item" title="${nm.pitch || 'Ikke fastsatt'}">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${nm.pitch || 'Ikke fastsatt'}</span>
                        </div>
                        <div class="match-detail-footer-item">
                            <i class="fa-regular fa-clock"></i>
                            <span>${durationLabel}</span>
                        </div>
                    </div>
                </article>
            `;

        } else {
            heroContainer.innerHTML = `
                <div onclick="switchTab('kamper')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-8 md:p-10 text-center relative overflow-hidden border min-h-[210px] flex flex-col items-center justify-center">
                    <div class="absolute -right-8 -bottom-10 opacity-5 pointer-events-none">
                        <i class="fa-solid fa-futbol text-[13rem] text-bsk-blue"></i>
                    </div>
                    <div class="portal-status-label mb-4 relative z-10">
                        <i class="fa-solid fa-calendar-plus"></i>
                        <span>Neste kamp</span>
                    </div>
                    <h3 class="font-black text-bsk-blue text-lg relative z-10">Ingen kommende kamp</h3>
                    <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto relative z-10">Når en kamp uten resultat ligger inne, vises den automatisk her.</p>
                </div>`;
            if (dangerZoneContainer) dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Ingen aktiv kamp. Ingen varsler å vise.</p>`;
        }
    }

    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
};

window.updateHjemWidget = function() {
    const bottomContainer = document.getElementById('hjem-bottom-widgets');
    if (!bottomContainer) return;

    // 1. FORBERED TRENINGSDATA (Venstre blokk - lys portalstil)
    const events = Array.isArray(window.activeEvents) ? window.activeEvents : [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const upcomingEvents = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const escapeJsString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    
    let leftWidgetHtml = '';
    if (upcomingEvents.length > 0) {
        const ne = upcomingEvents[0];
        const d = new Date(ne.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
        
        let påmeldtAntall = 0, forfallAntall = 0;
        if (ne.attendance) {
            Object.values(ne.attendance).forEach(status => {
                if (status === true) påmeldtAntall++;
                if (status === false) forfallAntall++;
            });
        }

        leftWidgetHtml = `
            <div onclick="window.goToCalendarDate('${escapeJsString(ne.date)}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-blue/20">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-stopwatch text-[14rem] text-bsk-blue"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                        <div class="portal-status-label">
                            <i class="fa-solid fa-stopwatch"></i>
                            <span>Neste økt</span>
                        </div>
                        <span class="portal-status-label portal-status-label-sm animate-pulse">${d.split(' ')[0]} ${new Date(ne.date).getDate()}</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${ne.time || 'TBA'} | ${ne.location || 'Ikke oppgitt'}</p>
                            <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight uppercase truncate pb-1">${ne.title || 'TRENING'}</h4>
                        </div>
                        
                        <div onclick="event.stopPropagation(); switchTab('oppmote'); openAttendanceModal('${escapeJsString(ne.id)}')" class="bg-bsk-blue/5 border border-bsk-blue/15 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-all duration-500 cursor-pointer hover:scale-105">
                            <span class="text-2xl font-black text-bsk-blue leading-none">${påmeldtAntall}</span>
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Klar</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-100">
                        <button onclick="event.stopPropagation(); switchTab('oppmote'); openAttendanceModal('${escapeJsString(ne.id)}')" class="portal-btn portal-btn-primary portal-btn-sm">
                            <i class="fa-solid fa-user-check text-bsk-yellow text-[11px]"></i> Oppmøte
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        leftWidgetHtml = `
            <div onclick="window.goToCalendarDate('${todayStr}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center h-full min-h-[220px] border">
                <div class="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
                    <i class="fa-solid fa-calendar-days text-[12rem] text-bsk-blue"></i>
                </div>
                <div class="portal-status-label mb-4 relative z-10">
                    <i class="fa-solid fa-stopwatch"></i>
                    <span>Neste økt</span>
                </div>
                <h3 class="font-black text-bsk-blue text-sm relative z-10">Ingen kommende økter</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-[210px] relative z-10">Legg inn trening eller aktivitet i kalenderen, så dukker neste økt opp her.</p>
            </div>
        `;
    }

    // 2. FORBERED "UKENS MASKIN" (Høyre blokk)
    let topPlayer = null;
    let topScore = -1;
    
    (window.activePlayers || []).filter(p => p.status !== 'Passiv').forEach(p => {
        const score = typeof window.calculatePlayerPerformanceChemistry === 'function' ? window.calculatePlayerPerformanceChemistry(p.navn) : 0;
        if (score > topScore) { topScore = score; topPlayer = p; }
    });

    let rightWidgetHtml = '';
    if (topPlayer && topScore > 0) {
        let kamper = 0, mal = 0, assist = 0, attendedEvents = 0;
        
        const allEvents = [
    ...(window.activeEvents || []),
    ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))
];

        const todayForChemistry = new Date();
        todayForChemistry.setHours(0, 0, 0, 0);
        
        const teamEvents = allEvents.filter(e => {
            // RETTET: La til topPlayer. foran spillerLag
            if (e.team !== topPlayer.spillerLag) return false; 
        
            if (e.date) {
                const eventDate = new Date(e.date);
                eventDate.setHours(0, 0, 0, 0);
                if (eventDate > todayForChemistry) return false;
            }
        
            return true;
        });
        
        teamEvents.forEach(e => { 
            if (e.attendance && e.attendance[topPlayer.navn] === true) {
                attendedEvents++;
                if (e.type === 'Kamp') {
	                    kamper++;
	                    if (e.scorers && e.scorers[topPlayer.navn]) mal += e.scorers[topPlayer.navn];
	                    if (e.assists && e.assists[topPlayer.navn]) assist += e.assists[topPlayer.navn];
	                }
            } 
        });

        const oppmotePct = teamEvents.length > 0 ? Math.round((attendedEvents / teamEvents.length) * 100) : 0;
        const topPlayerNameForJs = escapeJsString(topPlayer.navn);

        rightWidgetHtml = `
            <div onclick="window.goToPlayerAnalysis('${topPlayerNameForJs}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-yellow/40">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-fire-flame-curved text-[14rem] text-bsk-yellow"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                        <div class="portal-status-label">
                            <i class="fa-solid fa-bolt"></i>
                            <span>Ukens Maskin</span>
                        </div>
                        <span class="portal-status-label portal-status-label-sm animate-pulse">Hot Streak</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${topPlayer.pos1}</p>
                            <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight uppercase truncate pb-1">${topPlayer.navn.split(' ')[0]}</h4>
                        </div>
                        
                        <div class="bg-bsk-yellow/15 border border-bsk-yellow/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-500">
                            <span class="text-lg font-black text-amber-700 leading-none">${topScore}/100</span>
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Form</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-100">
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="text-slate-900 text-base block font-black mb-0.5 leading-none">${kamper}</span> Kamper
                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
	                            <span class="text-slate-900 text-base block font-black mb-0.5 leading-none">${mal}</span> Mål
	                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
	                            <span class="text-sky-700 text-base block font-black mb-0.5 leading-none">${assist}</span> Assist
	                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200 pl-4">
                            <span class="text-amber-700 text-base block font-black mb-0.5 leading-none">${oppmotePct}%</span> Trening
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        rightWidgetHtml = `
            <div onclick="window.goToPlayerAnalysis('')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center h-full min-h-[220px] border">
                <div class="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
                    <i class="fa-solid fa-bolt text-[12rem] text-bsk-yellow"></i>
                </div>
                <div class="portal-status-label mb-4 relative z-10">
                    <i class="fa-solid fa-bolt"></i>
                    <span>Ukens Maskin</span>
                </div>
                <h3 class="font-black text-bsk-blue text-sm relative z-10">Venter på formdata</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-[220px] relative z-10">Når spillere har oppmøte og kampdata, kåres ukens spiller automatisk.</p>
            </div>
        `;
    }

    const playedMatches = (window.activeMatches || [])
        .map(m => ({ match: m, score: window.parseScore(m.result) }))
        .filter(item => item.score !== null);

    let tableWins = 0;
    let tableDraws = 0;
    let tableLosses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    playedMatches.forEach(({ score }) => {
        goalsFor += score.bsk;
        goalsAgainst += score.opponent;
        if (score.bsk > score.opponent) tableWins++;
        else if (score.bsk === score.opponent) tableDraws++;
        else tableLosses++;
    });

    const tablePoints = tableWins * 3 + tableDraws;
    const goalDiff = goalsFor - goalsAgainst;
    const goalDiffText = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;
    const formGuide = typeof window.getFormGuide === 'function' ? window.getFormGuide() : [];
    const escapeAttr = (value) => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const seriesWidgetHtml = `
        <div onclick="switchTab('statistikk')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="dashboard-widget-card dashboard-click-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-blue/20">
            <div class="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <i class="fa-solid fa-ranking-star text-[14rem] text-bsk-blue"></i>
            </div>

            <div class="relative z-10 flex flex-col h-full justify-between">
                <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                    <div class="portal-status-label">
                        <i class="fa-solid fa-table-list"></i>
                        <span>Seriestatus</span>
                    </div>
                    <span class="portal-status-label portal-status-label-sm">Lokal</span>
                </div>

                <div class="flex-1 flex items-center justify-between gap-5 mb-2">
                    <div class="min-w-0">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Basert på registrerte kamper</p>
                        <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight">${playedMatches.length ? `${tablePoints} poeng` : 'Ingen resultater ennå'}</h4>
                        <p class="text-xs text-slate-500 mt-1">${playedMatches.length ? `${tableWins}S · ${tableDraws}U · ${tableLosses}T` : 'Når kampresultater føres, bygges seriestatus automatisk.'}</p>
                    </div>

                    <div class="bg-bsk-blue/5 border border-bsk-blue/15 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span class="text-xl font-black ${goalDiff >= 0 ? 'text-bsk-blue' : 'text-rose-600'} leading-none">${playedMatches.length ? goalDiffText : '-'}</span>
                        <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Mål diff</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-4 pt-3 mt-auto border-t border-slate-100">
                    <div class="flex gap-1.5 min-h-5 items-center">
                        ${
                            formGuide.length
                                ? formGuide.map(item => `<span class="w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] border border-white/60 shadow-sm ${item.class}" title="${escapeAttr(item.tooltip)}">${item.text}</span>`).join('')
                                : '<span class="text-[10px] text-slate-400 italic">Ingen formkurve</span>'
                        }
                    </div>
                    <button onclick="event.stopPropagation(); switchTab('statistikk')" class="portal-btn portal-btn-primary portal-btn-sm">Statistikk</button>
                </div>
            </div>
        </div>
    `;

    bottomContainer.innerHTML = leftWidgetHtml + seriesWidgetHtml + rightWidgetHtml;
};
