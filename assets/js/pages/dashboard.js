function escapeDashboardHtml(value) {
    if (typeof window.escapeModalHtml === 'function') {
        return window.escapeModalHtml(value);
    }
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeDashboardJsString(value) {
    return typeof window.escapeModalJsString === 'function'
        ? window.escapeModalJsString(value)
        : String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function bindDashboardEvents() {
    ['hjem-hero-match-container', 'hjem-bottom-widgets'].forEach((containerId) => {
        const container = document.getElementById(containerId);
        if (!container || container.dataset.dashboardEventsBound === 'true') return;

        container.dataset.dashboardEventsBound = 'true';
        container.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-dashboard-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.dashboardAction;
            if (action === 'match-alert' || action === 'session-injury' || action === 'session-attendance' || action === 'open-training-session') {
                event.stopPropagation();
            }

            if (action === 'open-match') {
                const matchId = actionEl.dataset.matchId;
                if (matchId) window.goToMatchDetails(matchId);
            } else if (action === 'match-alert') {
                window.showDashboardAlertModal();
            } else if (action === 'open-kamper-tab') {
                switchTab('kamper');
            } else if (action === 'open-calendar-date') {
                const date = actionEl.dataset.eventDate;
                if (date) window.goToCalendarDate(date);
            } else if (action === 'session-attendance') {
                const eventId = actionEl.dataset.eventId;
                if (eventId) window.openAttendanceModal(eventId);
            } else if (action === 'open-training-session') {
                const eventId = actionEl.dataset.eventId;
                if (eventId && typeof window.openTrainingSession === 'function') {
                    window.openTrainingSession(eventId);
                }
            } else if (action === 'session-injury') {
                window.showSessionInjuryModal();
            }
        });
        container.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const card = event.target.closest('[data-dashboard-action][role="button"]');
            if (!card || event.target.closest('button[data-dashboard-action]')) return;

            event.preventDefault();
            card.click();
        });
    });
}

window.goToMatchDetails = function(matchId) {
    if (!matchId) return;
    window.pendingMatchDetailsBackTab = window.currentTab || 'hjem';
    if (typeof window.showMatchDetails === 'function') {
        window.showMatchDetails(matchId);
        return;
    }
    switchTab('kamper', { skipHistory: true });
};

window.goToCalendarDate = function(dateStr) {
    if (dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            window.pendingCalendarDateStr = dateStr;
        }
    }

    switchTab('oppmote');
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

    bindDashboardEvents();
    
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
                const logoHtml = typeof window.buildClubLogoImgHtml === 'function'
                    ? window.buildClubLogoImgHtml(team.name, 'match-detail-crest-logo')
                    : '';
                const crestClass = [
                    'match-detail-crest',
                    team.isBsk ? '' : 'match-detail-crest-opponent',
                    logoHtml ? 'match-detail-crest-has-logo' : ''
                ].filter(Boolean).join(' ');
                const iconClass = team.isBsk ? 'fa-shield-halved' : 'fa-shield';
                return `
                    <div class="match-detail-team">
                        <div class="${crestClass}">
                            ${logoHtml || `<i class="fa-solid ${iconClass}"></i>`}
                        </div>
                        <span class="match-detail-team-name">${escapeDashboardHtml(team.name)}</span>
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
            
            // Oppdaterer den dedikerte "Utilgjengelig"-boksen til høyre på forsiden
            if (dangerZoneContainer) {
                dangerZoneContainer.innerHTML = '';
                if (suspendedPlayers.length === 0 && atRiskPlayers.length === 0 && injuredPlayers.length === 0) {
                    dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Alle mann er meldt klare og tilgjengelige! 🦅</p>`;
                } else {
                    suspendedPlayers.forEach(playerRef => {
                        const s = teamSuspensions[playerRef];
                        const badgeColor = s.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-rose-50 border border-rose-100 p-2 rounded-xl text-xs font-bold text-rose-900 shadow-sm">
                                <span class="truncate">🚨 ${escapeDashboardHtml(window.getPlayerNameFromRef(playerRef))}</span>
                                <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-black shrink-0">${escapeDashboardHtml(s.reason || 'KARANTENE')}</span>
                            </div>`;
                    });
                    atRiskPlayers.forEach(playerRef => {
                        const s = teamSuspensions[playerRef];
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-amber-50 border border-amber-100 p-2 rounded-xl text-xs font-bold text-amber-900 shadow-sm">
                                <span class="truncate">⚠️ ${escapeDashboardHtml(window.getPlayerNameFromRef(playerRef))}</span>
                                <span class="bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-[9px] font-black shrink-0">${s.yellows} gule · karantene ved ${s.nextKaranteneAt || 4}</span>
                            </div>`;
                    });
                    injuredPlayers.forEach(p => {
                        const badgeClass = p.info.type === 'langvarig'
                            ? 'bg-rose-600 text-white'
                            : 'bg-orange-500 text-white';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-orange-50 border border-orange-100 p-2 rounded-xl text-xs font-bold text-orange-900 shadow-sm">
                                <span class="truncate">🩹 ${escapeDashboardHtml(p.navn)}</span>
                                <span class="${badgeClass} px-2 py-0.5 rounded text-[9px] font-black shrink-0">${escapeDashboardHtml(p.info.shortLabel)}</span>
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
                            data-dashboard-action="match-alert"
                            class="bsk-btn bsk-btn-chip bsk-btn-danger dashboard-alert-chip"
                            title="Vis varsel for neste seriekamp">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Varsel</span>
                    </button>
                `;
            }

            // HTML for forsiden bruker samme kortspråk som kampdetaljer.
            heroContainer.innerHTML = `
                <article data-dashboard-action="open-match" data-match-id="${escapeDashboardHtml(nm.id)}" role="button" tabindex="0" class="match-detail-card dashboard-next-match-card dashboard-click-card">
                    <div class="dashboard-next-match-watermark">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>

                    <div class="match-detail-card-top relative z-10">
                        <div class="match-detail-meta relative">
                            <i class="fa-regular fa-calendar-days"></i>
                            <span>${escapeDashboardHtml(dateLabel)}</span>
                            ${herosuspensionBadgeHtml}
                        </div>
                        <div class="match-detail-chip">
                            <i class="fa-solid fa-futbol"></i>
                            <span>${escapeDashboardHtml(matchTypeLabel)}</span>
                        </div>
                    </div>

                    <div class="match-detail-main relative z-10">
                        ${renderHeroTeamHtml(sides.left)}

                        <div class="match-detail-center">
                            <span class="match-detail-time">${escapeDashboardHtml(nm.time || '--:--')}</span>
                            <span class="match-detail-sub">Kampstart</span>
                        </div>

                        ${renderHeroTeamHtml(sides.right)}
                    </div>

                    <div class="match-detail-footer relative z-10">
                        <div class="match-detail-footer-item" title="${escapeDashboardHtml(nm.pitch || 'Ikke fastsatt')}">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${escapeDashboardHtml(nm.pitch || 'Ikke fastsatt')}</span>
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
                <div data-dashboard-action="open-kamper-tab" role="button" tabindex="0" class="dashboard-widget-card dashboard-click-card rounded-2xl p-8 md:p-10 text-center relative overflow-hidden border min-h-[210px] flex flex-col items-center justify-center">
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
                id: player.id,
                navn: player.navn,
                type: injuryInfo.type,
                label: injuryInfo.label,
                shortLabel: injuryInfo.shortLabel,
                skadeNotat: player.skadeNotat || '',
                skadeFraDato: player.skadeFraDato || '',
                skadeTilDato: player.skadeTilDato || ''
            });
        }
    });

    const møttOppAntall = attendingRefs.length;
    const lowAttendanceThreshold = Math.max(8, Math.ceil(squadSize * 0.45));
    let fractionTone = 'good';
    if (positionCounts.K === 0) fractionTone = 'critical';
    else if (møttOppAntall < lowAttendanceThreshold) fractionTone = 'warning';

    injuredReady.sort((a, b) => {
        const typeOrder = { langvarig: 0, 'dag-til-dag': 1 };
        const typeDiff = (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2);
        if (typeDiff !== 0) return typeDiff;
        return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
    });

    const hasLangvarigInjury = injuredReady.some(p => p.type === 'langvarig');
    const injuryTone = hasLangvarigInjury ? 'critical' : 'warning';

    return {
        møttOppAntall,
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

    bindDashboardEvents();

    const events = Array.isArray(window.activeEvents) ? window.activeEvents : [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const upcomingEvents = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));

    let sessionWidgetHtml = '';
    if (upcomingEvents.length > 0) {
        const ne = upcomingEvents[0];
        const isTraining = ne.type === 'Trening';
        const canOpenSession = isTraining || ne.type === 'Annet';
        const sessionButtonLabel = isTraining ? 'Åpne øktside' : 'Åpne aktivitet';
        const eventTypeLabel = isTraining ? 'Trening' : (ne.type || 'Aktivitet');
        const sessionStats = window.buildNextSessionAttendanceStats(ne);
        const dateValue = new Date(ne.date);
        const dateFormatted = Number.isNaN(dateValue.getTime())
            ? 'Dato ikke satt'
            : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
        const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
        const timeLabel = ne.time || '--:--';
        const locationLabel = ne.location || 'Ikke oppgitt';
        const fractionToneClass = sessionStats.fractionTone === 'good' ? '' : ` is-${sessionStats.fractionTone}`;
        const hasSessionAttendance = typeof window.hasRegisteredAttendance === 'function'
            ? window.hasRegisteredAttendance(ne.attendance)
            : false;
        const radarParts = ['K', 'F', 'M', 'A'].map(letter => (
            `${sessionStats.positionCounts[letter]}${letter}`
        )).join('<span class="dashboard-session-radar-sep"> - </span>');
        const sessionStatsHtml = hasSessionAttendance
            ? `
                            <div class="dashboard-session-stats-line">
                                <span class="match-detail-time${fractionToneClass}">${sessionStats.møttOppAntall}<span class="dashboard-session-fraction-sep">/</span>${sessionStats.squadSize}</span>
                                <span class="dashboard-session-attendance-label">møtt opp</span>
                                <span class="dashboard-session-radar-inline">${radarParts}</span>
                            </div>`
            : `
                            <div class="dashboard-session-stats-line">
                                <span class="dashboard-session-unregistered-label">Oppmøte ikke registrert</span>
                            </div>`;

        window._sessionInjuryPopupData = sessionStats.injuredReady;

        let injuryButtonHtml = '';
        if (sessionStats.injuredReady.length > 0) {
            const injuredCount = sessionStats.injuredReady.length;
            const injuryLabel = injuredCount === 1
                ? '1 skadet'
                : `${injuredCount} skadet`;
            injuryButtonHtml = `
                <button type="button" data-dashboard-action="session-injury" class="bsk-btn bsk-btn-warning is-collapsible dashboard-session-action-btn" title="${escapeDashboardHtml(injuryLabel)}" aria-label="${escapeDashboardHtml(injuryLabel)}">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <span class="bsk-btn-label">${escapeDashboardHtml(injuryLabel)}</span>
                </button>
            `;
        } else {
            window._sessionInjuryPopupData = [];
        }

        sessionWidgetHtml = `
            <article data-dashboard-action="open-calendar-date" data-event-date="${escapeDashboardHtml(ne.date)}" role="button" tabindex="0" class="match-detail-card dashboard-next-session-card dashboard-click-card h-full">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-stopwatch"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeDashboardHtml(dateLabel)}</span>
                    </div>
                    <div class="match-detail-chip">
                        <i class="fa-solid ${isTraining ? 'fa-stopwatch' : 'fa-calendar-check'}"></i>
                        <span>${escapeDashboardHtml(eventTypeLabel)}</span>
                    </div>
                </div>

                <div class="dashboard-session-main relative z-10">
                    <div class="dashboard-session-middle">
                        <div class="dashboard-session-focus-block min-w-0">
                            ${sessionStatsHtml}
                        </div>
                        <div class="dashboard-session-actions">
                            <button type="button" data-dashboard-action="session-attendance" data-event-id="${escapeDashboardHtml(ne.id)}" class="bsk-btn bsk-btn-primary is-collapsible dashboard-session-action-btn" title="Oppmøte" aria-label="Oppmøte">
                                <i class="fa-solid fa-user-check" aria-hidden="true"></i>
                                <span class="bsk-btn-label">Oppmøte</span>
                            </button>
                            ${canOpenSession ? `
                            <button type="button" data-dashboard-action="open-training-session" data-event-id="${escapeDashboardHtml(ne.id)}" class="bsk-btn bsk-btn-primary is-collapsible dashboard-session-action-btn" title="${escapeDashboardHtml(sessionButtonLabel)}" aria-label="${escapeDashboardHtml(sessionButtonLabel)}">
                                <i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>
                                <span class="bsk-btn-label">${escapeDashboardHtml(sessionButtonLabel)}</span>
                            </button>
                            ` : ''}
                            ${injuryButtonHtml}
                        </div>
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    <div class="match-detail-footer-item" title="${escapeDashboardHtml(locationLabel)}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeDashboardHtml(locationLabel)}</span>
                    </div>
                    <div class="match-detail-footer-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${escapeDashboardHtml(timeLabel)}</span>
                    </div>
                </div>
            </article>
        `;
    } else {
        sessionWidgetHtml = `
            <article data-dashboard-action="open-calendar-date" data-event-date="${escapeDashboardHtml(todayStr)}" role="button" tabindex="0" class="match-detail-card dashboard-next-session-card dashboard-click-card h-full flex flex-col items-center justify-center text-center min-h-[220px]">
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

    bottomContainer.innerHTML = sessionWidgetHtml;
};
