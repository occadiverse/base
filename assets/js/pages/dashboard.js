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
            const atRiskPlayers = Object.keys(teamSuspensions).filter(p => teamSuspensions[p].isAtRisk && !teamSuspensions[p].isSuspended);

            const injuredPlayers = (window.activePlayers || [])
                .filter(p => p.spillerLag === nm.matchGroup && typeof window.getPlayerInjuryInfo === 'function' && window.getPlayerInjuryInfo(p).isInjured)
                .map(p => ({
                    navn: p.navn,
                    info: window.getPlayerInjuryInfo(p)
                }));
            
            // Henter meldte forfall
            const forfallPlayers = [];
            if (nm.attendance) {
                Object.entries(nm.attendance).forEach(([playerRef, isReady]) => {
                    if (isReady === false) forfallPlayers.push(window.getPlayerNameFromRef(playerRef));
                });
            }

            // Oppdaterer den dedikerte "Utilgjengelig"-boksen til høyre på forsiden
            if (dangerZoneContainer) {
                dangerZoneContainer.innerHTML = '';
                if (suspendedPlayers.length === 0 && atRiskPlayers.length === 0 && injuredPlayers.length === 0 && forfallPlayers.length === 0) {
                    dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Alle mann er meldt klare og tilgjengelige! 🦅</p>`;
                } else {
                    suspendedPlayers.forEach(playerRef => {
                        const s = teamSuspensions[playerRef];
                        const badgeColor = s.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-rose-50 border border-rose-100 p-2 rounded-xl text-xs font-bold text-rose-900 shadow-sm">
                                <span class="truncate">🚨 ${window.getPlayerNameFromRef(playerRef)}</span>
                                <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-black shrink-0">${s.reason || 'KARANTENE'}</span>
                            </div>`;
                    });
                    atRiskPlayers.forEach(playerRef => {
                        const s = teamSuspensions[playerRef];
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-amber-50 border border-amber-100 p-2 rounded-xl text-xs font-bold text-amber-900 shadow-sm">
                                <span class="truncate">⚠️ ${window.getPlayerNameFromRef(playerRef)}</span>
                                <span class="bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-[9px] font-black shrink-0">${s.yellows} gule · karantene ved ${s.nextKaranteneAt || 4}</span>
                            </div>`;
                    });
                    injuredPlayers.forEach(p => {
                        const badgeClass = p.info.type === 'langvarig'
                            ? 'bg-rose-600 text-white'
                            : 'bg-orange-500 text-white';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-orange-50 border border-orange-100 p-2 rounded-xl text-xs font-bold text-orange-900 shadow-sm">
                                <span class="truncate">🩹 ${p.navn}</span>
                                <span class="${badgeClass} px-2 py-0.5 rounded text-[9px] font-black shrink-0">${p.info.shortLabel}</span>
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
            const totalWarnings = suspendedPlayers.length + atRiskPlayers.length;
            if (totalWarnings > 0) {
                herosuspensionBadgeHtml = `
                    <span onclick="event.stopPropagation(); switchTab('kamper'); showMatchDetails('${nm.id}')" 
                          class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse border border-white/20 cursor-pointer z-20 hover:bg-red-700 hover:scale-115 transition-all" 
                          title="Karantene eller faresone registrert! Klikk for detaljer.">
                        ${totalWarnings}
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

window.getPositionCategoryFromPos1 = function(pos1) {
    if (!pos1) return null;
    const normalized = String(pos1).trim();
    if (normalized === 'Keeper' || normalized.toLowerCase().includes('keeper')) return 'K';
    if (['Høyre bekk', 'Venstre bekk', 'Høyre stopper', 'Venstre stopper'].includes(normalized)) return 'F';
    if (['Spiss', 'Playmaker', 'Høyre kant', 'Venstre kant'].includes(normalized)) return 'A';
    return 'M';
};

window.buildNextSessionAttendanceStats = function(event) {
    const teamName = event?.team || event?.matchGroup;
    const allActivePlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
    const squadPlayers = teamName
        ? allActivePlayers.filter(p => p.spillerLag === teamName)
        : allActivePlayers;
    const squadSize = squadPlayers.length || allActivePlayers.length;

    const positionCounts = { K: 0, F: 0, M: 0, A: 0 };
    const injuredReady = [];
    const attendingRefs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    attendingRefs.forEach(ref => {
        const player = typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null;
        if (!player) return;

        const category = window.getPositionCategoryFromPos1(player.pos1);
        if (category) positionCounts[category] += 1;

        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
            ? window.getPlayerInjuryInfo(player)
            : { isInjured: false, type: 'frisk' };
        if (injuryInfo.isInjured) {
            injuredReady.push({
                navn: player.navn,
                type: injuryInfo.type,
                label: injuryInfo.label,
                shortLabel: injuryInfo.shortLabel
            });
        }
    });

    const påmeldtAntall = attendingRefs.length;
    const lowAttendanceThreshold = Math.max(8, Math.ceil(squadSize * 0.45));
    let fractionTone = 'good';
    if (positionCounts.K === 0) fractionTone = 'critical';
    else if (påmeldtAntall < lowAttendanceThreshold) fractionTone = 'warning';

    const hasLangvarigInjury = injuredReady.some(p => p.type === 'langvarig');
    const injuryTone = hasLangvarigInjury ? 'critical' : 'warning';

    return {
        påmeldtAntall,
        squadSize,
        positionCounts,
        injuredReady,
        fractionTone,
        injuryTone
    };
};

window.updateHjemWidget = function() {
    const bottomContainer = document.getElementById('hjem-bottom-widgets');
    if (!bottomContainer) return;

    // 1. FORBERED TRENINGSDATA (Venstre blokk - BSK-stil)
    const events = Array.isArray(window.activeEvents) ? window.activeEvents : [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const upcomingEvents = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const escapeJsString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
    
    let leftWidgetHtml = '';
    if (upcomingEvents.length > 0) {
        const ne = upcomingEvents[0];
        const sessionStats = window.buildNextSessionAttendanceStats(ne);
        const dateValue = new Date(ne.date);
        const dateFormatted = Number.isNaN(dateValue.getTime())
            ? 'Dato ikke satt'
            : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
        const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
        const timeLabel = ne.time || '--:--';
        const locationLabel = ne.location || 'Ikke oppgitt';
        const fractionToneClass = sessionStats.fractionTone === 'good' ? '' : ` is-${sessionStats.fractionTone}`;
        const radarParts = ['K', 'F', 'M', 'A'].map(letter => (
            `${sessionStats.positionCounts[letter]}${letter}`
        )).join('<span class="dashboard-session-radar-sep"> - </span>');

        window._sessionInjuryPopupData = sessionStats.injuredReady;

        let injuryButtonHtml = '';
        if (sessionStats.injuredReady.length > 0) {
            const injuredCount = sessionStats.injuredReady.length;
            const injuryLabel = injuredCount === 1
                ? '1 spiller med skade'
                : `${injuredCount} spillere med skade`;
            injuryButtonHtml = `
                <button type="button" onclick="event.stopPropagation(); window.showSessionInjuryModal()" class="match-bench-action-btn dashboard-session-action-btn">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>${escapeHtml(injuryLabel)}</span>
                </button>
            `;
        } else {
            window._sessionInjuryPopupData = [];
        }

        leftWidgetHtml = `
            <article onclick="window.goToCalendarDate('${escapeJsString(ne.date)}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-next-session-card dashboard-click-card h-full">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-stopwatch"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeHtml(dateLabel)}</span>
                    </div>
                    <div class="match-detail-chip">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span>Trening</span>
                    </div>
                </div>

                <div class="match-detail-main dashboard-session-main relative z-10">
                    <div class="match-detail-center dashboard-session-center">
                        <div class="dashboard-session-stats-line">
                            <span class="match-detail-time${fractionToneClass}">${sessionStats.påmeldtAntall}<span class="dashboard-session-fraction-sep">/</span>${sessionStats.squadSize}</span>
                            <span class="dashboard-session-radar-inline">${radarParts}</span>
                        </div>
                        <div class="dashboard-session-actions">
                            <button type="button" onclick="event.stopPropagation(); window.openAttendanceModal('${escapeJsString(ne.id)}')" class="match-bench-action-btn dashboard-session-action-btn">
                                <i class="fa-solid fa-user-check"></i>
                                <span>Oppmøte</span>
                            </button>
                            ${injuryButtonHtml}
                        </div>
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    <div class="match-detail-footer-item" title="${escapeHtml(locationLabel)}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHtml(locationLabel)}</span>
                    </div>
                    <div class="match-detail-footer-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${escapeHtml(timeLabel)}</span>
                    </div>
                </div>
            </article>
        `;
    } else {
        leftWidgetHtml = `
            <article onclick="window.goToCalendarDate('${todayStr}')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-next-session-card dashboard-click-card h-full flex flex-col items-center justify-center text-center min-h-[220px]">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-calendar-days"></i>
                </div>
                <div class="relative z-10 px-6 py-8">
                    <div class="match-detail-chip mb-4 mx-auto">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span>Neste økt</span>
                    </div>
                    <h3 class="font-black text-white text-sm">Ingen kommende økter</h3>
                    <p class="text-xs text-white/60 mt-2 max-w-[240px] mx-auto">Legg inn trening eller aktivitet i kalenderen, så dukker neste økt opp her.</p>
                </div>
            </article>
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
            if (window.isPlayerAttending(e.attendance, topPlayer)) {
                attendedEvents++;
                if (e.type === 'Kamp') {
	                    kamper++;
	                    mal += Number(window.getPlayerRefMapValue(e.scorers, topPlayer, 0)) || 0;
	                    assist += Number(window.getPlayerRefMapValue(e.assists, topPlayer, 0)) || 0;
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

    const sortedPlayedMatches = [...playedMatches].sort((a, b) => new Date(b.match.date) - new Date(a.match.date));
    const lastMatchItem = sortedPlayedMatches[0] || null;
    let lastMatchLine = '';
    if (lastMatchItem) {
        const { match, score } = lastMatchItem;
        const venue = typeof window.getMatchVenue === 'function' ? window.getMatchVenue(match) : 'Borte';
        const displayScore = typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(match.result, venue)
            : match.result;
        let outcome = 'uavgjort mot';
        if (score.bsk > score.opponent) outcome = 'seier over';
        else if (score.bsk < score.opponent) outcome = 'tap mot';
        lastMatchLine = `${displayScore} ${outcome} ${match.opponent || 'motstander'}`;
    }

    const last5ForForm = sortedPlayedMatches.slice(0, 5);
    let last5Points = 0;
    last5ForForm.forEach(({ score }) => {
        if (score.bsk > score.opponent) last5Points += 3;
        else if (score.bsk === score.opponent) last5Points += 1;
    });
    const formPpg = last5ForForm.length ? last5Points / last5ForForm.length : null;
    const seasonPpg = playedMatches.length ? tablePoints / playedMatches.length : null;

    let trendClass = 'is-flat';
    let trendIcon = '→';
    if (formPpg !== null && seasonPpg !== null) {
        if (formPpg > seasonPpg + 0.05) {
            trendClass = 'is-up';
            trendIcon = '↑';
        } else if (formPpg < seasonPpg - 0.05) {
            trendClass = 'is-down';
            trendIcon = '↓';
        }
    }

    const getSeriesFormPillClass = (form) => {
        if (form === 'S') return 'is-win';
        if (form === 'T') return 'is-loss';
        return 'is-draw';
    };

    const hasSeriesData = playedMatches.length > 0;
    const formPpgText = formPpg !== null ? formPpg.toFixed(1) : '–';
    const seasonPpgText = seasonPpg !== null ? seasonPpg.toFixed(1) : '–';
    const goalHubDiffClass = !hasSeriesData ? 'is-empty' : (goalDiff >= 0 ? 'is-positive' : 'is-negative');
    const goalHubDiffValue = hasSeriesData ? goalDiffText : '–';
    const goalHubStatsValue = hasSeriesData ? `${goalsFor} For · ${goalsAgainst} Mot` : '– For · – Mot';
    const formPillsHtml = formGuide.length
        ? formGuide.map(item => `<span class="dashboard-series-form-pill ${getSeriesFormPillClass(item.form)}" title="${escapeAttr(item.tooltip)}">${item.text}</span>`).join('')
        : '<span class="dashboard-series-form-empty">Ingen form</span>';
    const seriesFooterLine = hasSeriesData
        ? `${tablePoints} poeng · ${playedMatches.length} kamper · ${tableWins}S · ${tableDraws}U · ${tableLosses}T`
        : 'Ingen registrerte kamper ennå';

    const seriesWidgetHtml = `
        <article onclick="switchTab('statistikk')" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-series-card dashboard-click-card h-full">
            <div class="dashboard-next-match-watermark">
                <i class="fa-solid fa-ranking-star"></i>
            </div>

            <div class="match-detail-card-top relative z-10">
                <div class="match-detail-meta">
                    <i class="fa-solid fa-table-list"></i>
                    <span>Seriestatus</span>
                </div>
                <div class="dashboard-series-form-row">
                    ${formPillsHtml}
                </div>
            </div>

            <div class="dashboard-series-main relative z-10">
                <div class="dashboard-series-middle">
                    <div class="dashboard-series-last-block min-w-0 flex-1">
                        ${
                            lastMatchLine
                                ? `<p class="dashboard-series-last-match-label">Siste kamp</p><p class="dashboard-series-last-match">${escapeAttr(lastMatchLine)}</p>`
                                : '<p class="dashboard-series-last-match-label">Siste kamp</p><p class="dashboard-series-last-match is-empty">Ingen registrerte kamper ennå</p>'
                        }
                    </div>

                    <div class="dashboard-series-trend shrink-0 ${trendClass}">
                        <span class="dashboard-series-trend-label">Form vs Snitt</span>
                        <span class="dashboard-series-trend-values">${formPpgText}<span class="dashboard-series-trend-sep">vs</span>${seasonPpgText}</span>
                        <span class="dashboard-series-trend-icon" aria-hidden="true">${trendIcon}</span>
                    </div>

                    <div class="dashboard-series-goal-hub shrink-0">
                        <span class="dashboard-series-goal-diff ${goalHubDiffClass}">${goalHubDiffValue}</span>
                        <span class="dashboard-series-goal-stats">${goalHubStatsValue}</span>
                    </div>
                </div>
            </div>

            <div class="match-detail-footer relative z-10">
                <div class="match-detail-footer-item dashboard-series-footer-line">
                    <span>${escapeAttr(seriesFooterLine)}</span>
                </div>
            </div>
        </article>
    `;

    bottomContainer.innerHTML = leftWidgetHtml + seriesWidgetHtml + rightWidgetHtml;
};
