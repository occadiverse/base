window.goToMatchDetails = function(matchId) {
    if (!matchId) return;
    window.pendingMatchDetailsBackTab = window.currentTab || 'hjem';
    switchTab('kamper', { skipHistory: true });
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

window.goToMatchSummaryNotes = function(matchId) {
    if (matchId) {
        window.pendingKampstatMatchId = matchId;
    }

    switchTab('statistikk');

    if (typeof window.switchStatTab === 'function') {
        window.switchStatTab('kampstat');
    } else if (typeof window.renderMatchStatsView === 'function') {
        window.renderMatchStatsView();
    }
};

window.goToPlayerAnalysis = function(playerName) {
    switchTab('statistikk');

    if (typeof window.switchStatTab === 'function') {
        window.switchStatTab('spillere');
    }

    if (playerName && typeof window.openSpillerDetail === 'function') {
        window.openSpillerDetail(playerName);
    } else if (typeof window.renderSpillereView === 'function') {
        window.renderSpillereView();
    }
};

window.goToInjuredRoster = function() {
    switchTab('tropp');
    if (typeof window.setPlayerStatusFilter === 'function') {
        window.setPlayerStatusFilter('skadet');
    }
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
            const dashboardAlerts = typeof window.buildMatchAlertData === 'function' ? window.buildMatchAlertData(nm) : [];
            window._dashboardAlertPopupData = dashboardAlerts;

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

            // --- KLIKKBAR VARSELCHIP FOR KARANTENER OG FARESONE ---
            let herosuspensionBadgeHtml = '';
            const totalWarnings = suspendedPlayers.length + atRiskPlayers.length;
            if (totalWarnings > 0) {
                herosuspensionBadgeHtml = `
                    <button type="button"
                            onclick="event.stopPropagation(); window.showDashboardAlertModal()"
                            class="dashboard-alert-chip"
                            title="Vis varsel for neste seriekamp">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Varsel</span>
                    </button>
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
                            <i class="fa-regular fa-calendar-days"></i>
                            <span>${dateLabel}</span>
                            ${herosuspensionBadgeHtml}
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

window.buildInjuryOverviewStats = function(teamName) {
    const allActivePlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
    const squadPlayers = teamName
        ? allActivePlayers.filter(p => p.spillerLag === teamName)
        : allActivePlayers;

    const injured = [];
    let langvarigCount = 0;
    let dagTilDagCount = 0;
    const positionCounts = { K: 0, F: 0, M: 0, A: 0 };

    squadPlayers.forEach(player => {
        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
            ? window.getPlayerInjuryInfo(player)
            : { isInjured: false, type: 'frisk' };
        if (!injuryInfo.isInjured) return;

        const category = window.getPositionCategoryFromPos1(player.pos1);
        if (category) positionCounts[category] += 1;
        if (injuryInfo.type === 'langvarig') langvarigCount += 1;
        else if (injuryInfo.type === 'dag-til-dag') dagTilDagCount += 1;

        injured.push({
            id: player.id,
            navn: player.navn,
            pos1: player.pos1,
            spillerLag: player.spillerLag,
            skadeNotat: player.skadeNotat,
            skadeTilDato: player.skadeTilDato,
            info: injuryInfo
        });
    });

    injured.sort((a, b) => {
        const typeOrder = { langvarig: 0, 'dag-til-dag': 1 };
        const typeDiff = (typeOrder[a.info.type] ?? 2) - (typeOrder[b.info.type] ?? 2);
        if (typeDiff !== 0) return typeDiff;
        return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
    });

    return {
        squadSize: squadPlayers.length,
        injuredCount: injured.length,
        availableCount: squadPlayers.length - injured.length,
        langvarigCount,
        dagTilDagCount,
        positionCounts,
        injured
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

    // 2. FORBERED SKADESTATUS (Høyre blokk)
    const injuryStats = window.buildInjuryOverviewStats();
    const formatInjuryReturnDate = (dateStr) => {
        if (!dateStr) return '';
        const dateValue = new Date(dateStr);
        if (Number.isNaN(dateValue.getTime())) return dateStr;
        return dateValue.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
    };

    const buildInjuryDetailLine = (player) => {
        if (player.info.type === 'langvarig' && player.skadeTilDato) {
            return `Tilbake ${formatInjuryReturnDate(player.skadeTilDato)}`;
        }
        if (player.skadeNotat) return player.skadeNotat;
        if (player.info.type === 'dag-til-dag') return 'Avventer daglig vurdering';
        return player.info.label || 'Skade registrert';
    };

    const injuryPositionLine = ['K', 'F', 'M', 'A']
        .filter(letter => injuryStats.positionCounts[letter] > 0)
        .map(letter => `${injuryStats.positionCounts[letter]}${letter}`)
        .join(' · ');

    let rightWidgetHtml = '';
    if (injuryStats.injuredCount > 0) {
        const maxInjuryRows = 3;
        const hasOverflow = injuryStats.injuredCount > maxInjuryRows;
        const visibleInjuries = hasOverflow
            ? injuryStats.injured.slice(0, maxInjuryRows - 1)
            : injuryStats.injured;
        const overflowCount = hasOverflow
            ? injuryStats.injuredCount - visibleInjuries.length
            : 0;
        const injuryChipLabel = injuryStats.injuredCount === 1
            ? '1 skadet'
            : `${injuryStats.injuredCount} skadet`;

        const injuryRowsHtml = visibleInjuries.map(player => {
            const badgeClass = player.info.type === 'langvarig' ? 'is-critical' : 'is-warning';
            const firstName = (player.navn || '').trim().split(/\s+/)[0] || player.navn;
            return `
                <div class="dashboard-injury-row">
                    <div class="dashboard-injury-row-main min-w-0">
                        <span class="dashboard-injury-name">${escapeHtml(firstName)}</span>
                        <span class="dashboard-injury-detail">${escapeHtml(buildInjuryDetailLine(player))}</span>
                    </div>
                    <span class="dashboard-injury-badge ${badgeClass}">${escapeHtml(player.info.shortLabel)}</span>
                </div>
            `;
        }).join('');

        const overflowRowHtml = overflowCount > 0
            ? `
                <div class="dashboard-injury-row dashboard-injury-row-overflow">
                    <div class="dashboard-injury-row-main min-w-0">
                        <span class="dashboard-injury-name">+${overflowCount} flere skadet</span>
                    </div>
                </div>
            `
            : '';

        rightWidgetHtml = `
            <article onclick="window.goToInjuredRoster()" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-injury-card dashboard-click-card h-full">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-user-injured"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-solid fa-kit-medical"></i>
                        <span>Skadestatus</span>
                    </div>
                    <div class="match-detail-chip${injuryStats.langvarigCount > 0 ? ' dashboard-injury-chip-alert' : ''}">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>${escapeHtml(injuryChipLabel)}</span>
                    </div>
                </div>

                <div class="dashboard-injury-main relative z-10">
                    <div class="dashboard-injury-middle">
                        <div class="dashboard-injury-list min-w-0 flex-1">
                            ${injuryRowsHtml}
                            ${overflowRowHtml}
                        </div>

                        <div class="dashboard-series-goal-stack shrink-0">
                            <div class="match-bench-count dashboard-series-goal-count dashboard-injury-count">
                                <span class="dashboard-series-goal-count-value dashboard-injury-count-value">${injuryStats.langvarigCount}</span>
                                <span>Langvarig</span>
                            </div>
                            <div class="match-bench-count dashboard-series-goal-count dashboard-injury-count">
                                <span class="dashboard-series-goal-count-value dashboard-injury-count-value">${injuryStats.dagTilDagCount}</span>
                                <span>Dag-til-dag</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    ${injuryPositionLine ? `
                        <div class="match-detail-footer-item dashboard-series-footer-line">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>${escapeHtml(injuryPositionLine)}</span>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    } else {
        rightWidgetHtml = `
            <article onclick="window.goToInjuredRoster()" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-injury-card dashboard-click-card h-full flex flex-col items-center justify-center text-center min-h-[220px]">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-user-injured"></i>
                </div>
                <div class="relative z-10 px-6 py-8">
                    <div class="match-detail-chip mb-4 mx-auto">
                        <i class="fa-solid fa-kit-medical"></i>
                        <span>Skadestatus</span>
                    </div>
                    <h3 class="font-black text-white text-sm">Ingen registrerte skader</h3>
                    <p class="text-xs text-white/60 mt-2 max-w-[240px] mx-auto">Alle aktive spillere er markert som friske. Oppdater status i troppen ved behov.</p>
                </div>
            </article>
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
    let lastMatchResultLine = '';
    if (lastMatchItem) {
        const { match, score } = lastMatchItem;
        const venue = typeof window.getMatchVenue === 'function' ? window.getMatchVenue(match) : 'Borte';
        const displayScore = typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(match.result, venue)
            : match.result;
        let outcome = 'uavgjort mot';
        if (score.bsk > score.opponent) outcome = 'seier over';
        else if (score.bsk < score.opponent) outcome = 'tap mot';
        lastMatchResultLine = `${displayScore} ${outcome} ${match.opponent || 'motstander'}`;
    }

    const lastMatchNotes = lastMatchItem?.match?.notes || {};
    const positiveNote = String(lastMatchNotes.positive || '').trim();
    const challengeNote = String(lastMatchNotes.challenge || '').trim();
    const hasCoachNotes = Boolean(positiveNote || challengeNote);
    const lastMatchIdForJs = lastMatchItem?.match?.id ? escapeJsString(lastMatchItem.match.id) : '';

    const getSeriesFormPillClass = (form) => {
        if (form === 'S') return 'is-win';
        if (form === 'T') return 'is-loss';
        return 'is-draw';
    };

    const hasSeriesData = playedMatches.length > 0;
    const goalsScoredAvg = hasSeriesData ? (goalsFor / playedMatches.length).toFixed(1) : '–';
    const goalsConcededAvg = hasSeriesData ? (goalsAgainst / playedMatches.length).toFixed(1) : '–';
    const formPillsHtml = formGuide.length
        ? formGuide.map(item => `<span class="dashboard-series-form-pill ${getSeriesFormPillClass(item.form)}" title="${escapeAttr(item.tooltip)}">${item.text}</span>`).join('')
        : '<span class="dashboard-series-form-empty">Ingen form</span>';
    const seriesFooterLine = hasSeriesData
        ? `${playedMatches.length} kamper · ${tableWins}S · ${tableDraws}U · ${tableLosses}T`
        : 'Ingen registrerte kamper ennå';

    let seriesFocusHtml = '';
    if (!lastMatchResultLine) {
        seriesFocusHtml = '<p class="dashboard-series-result is-empty">Ingen registrerte kamper ennå</p>';
    } else if (hasCoachNotes) {
        seriesFocusHtml = `
            <p class="dashboard-series-result">${escapeAttr(lastMatchResultLine)}</p>
            ${positiveNote ? `<p class="dashboard-series-note-positive">${escapeAttr(positiveNote)}</p>` : ''}
            ${challengeNote ? `<p class="dashboard-series-note-challenge">${escapeAttr(challengeNote)}</p>` : ''}
        `;
    } else {
        seriesFocusHtml = `
            <p class="dashboard-series-result">${escapeAttr(lastMatchResultLine)}</p>
            <p class="dashboard-series-fallback">Ingen trenernotater lagt inn for denne kampen ennå. Klikk her for å sette fokus for treningsuka!</p>
        `;
    }

    const seriesCardClickHandler = lastMatchIdForJs
        ? `window.goToMatchSummaryNotes('${lastMatchIdForJs}')`
        : "switchTab('statistikk')";

    const seriesWidgetHtml = `
        <article onclick="${seriesCardClickHandler}" role="button" tabindex="0" onkeydown="window.activateDashboardCardFromKeyboard(event)" class="match-detail-card dashboard-series-card dashboard-click-card h-full">
            <div class="dashboard-next-match-watermark">
                <i class="fa-solid fa-ranking-star"></i>
            </div>

            <div class="match-detail-card-top relative z-10">
                <div class="match-detail-meta">
                    <i class="fa-solid fa-table-list"></i>
                    <span>Kampstatus</span>
                </div>
                <div class="dashboard-series-form-row">
                    ${formPillsHtml}
                </div>
            </div>

            <div class="dashboard-series-main relative z-10">
                <div class="dashboard-series-middle">
                    <div class="dashboard-series-focus-block min-w-0 flex-1">
                        ${seriesFocusHtml}
                    </div>

                    <div class="dashboard-series-goal-stack shrink-0">
                        <div class="match-bench-count dashboard-series-goal-count">
                            <span class="dashboard-series-goal-count-value">${goalsScoredAvg}</span>
                            <span>Scoret</span>
                        </div>
                        <div class="match-bench-count dashboard-series-goal-count">
                            <span class="dashboard-series-goal-count-value">${goalsConcededAvg}</span>
                            <span>Innslipp</span>
                        </div>
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
