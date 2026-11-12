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
    ['hjem-now', 'hjem-hero-match-container', 'hjem-bottom-widgets', 'hjem-coach-focus', 'hjem-season-pulse', 'hjem-season-summary'].forEach((containerId) => {
        const container = document.getElementById(containerId);
        if (!container || container.dataset.dashboardEventsBound === 'true') return;

        container.dataset.dashboardEventsBound = 'true';
        container.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-dashboard-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.dashboardAction;
            if (action === 'match-alert' || action === 'session-injury' || action === 'add-match') {
                event.stopPropagation();
            }

            if (action === 'open-match') {
                const matchId = actionEl.dataset.matchId;
                if (matchId) window.goToMatchDetails(matchId);
            } else if (action === 'match-alert') {
                window.showDashboardAlertModal();
            } else if (action === 'add-match') {
                if (typeof window.openActivityModal === 'function') {
                    window.openActivityModal('Kamp');
                }
            } else if (action === 'open-kamper-tab') {
                switchTab('kamper');
            } else if (action === 'open-statistikk') {
                const year = Number(actionEl.dataset.seasonYear);
                if (Number.isFinite(year)) window.statsKampYearFilter = year;
                switchTab('statistikk');
            } else if (action === 'open-season-pulse') {
                const year = Number(actionEl.dataset.seasonYear);
                if (Number.isFinite(year)) window.statsKampYearFilter = year;
                window.statsLagSection = 'kampdata';
                switchTab('statistikk');
            } else if (action === 'open-roster-plan') {
                if (typeof window.setRosterMode === 'function') window.setRosterMode('plan2027');
                switchTab('tropp');
            } else if (action === 'open-followup') {
                const year = Number(actionEl.dataset.seasonYear);
                if (Number.isFinite(year)) window.statsKampYearFilter = year;
                window.statsLagSection = 'spillerdata';
                if (typeof window.openStatsKampPanel === 'function') window.openStatsKampPanel('oppfolging');
                switchTab('statistikk');
                window.setTimeout(() => {
                    const panel = document.querySelector('#stats-oppfolging-slot [data-stats-panel="oppfolging"]');
                    if (panel && typeof panel.scrollIntoView === 'function') {
                        panel.scrollIntoView({ block: 'start' });
                    }
                }, 350);
            } else if (action === 'open-injured') {
                if (typeof window.setRosterMode === 'function') window.setRosterMode('now');
                if (typeof window.setPlayerStatusFilter === 'function') window.setPlayerStatusFilter('skadet');
                switchTab('tropp');
            } else if (action === 'open-training-start') {
                const year = Number(actionEl.dataset.seasonYear);
                if (Number.isFinite(year)) window.statsKampYearFilter = year;
                window.statsLagSection = 'treningsdata';
                switchTab('statistikk');
            } else if (action === 'open-player') {
                const year = Number(actionEl.dataset.seasonYear);
                const playerName = actionEl.dataset.playerName;
                if (Number.isFinite(year)) window.statsKampYearFilter = year;
                if (playerName && typeof window.goToPlayerAnalysis === 'function') {
                    window.goToPlayerAnalysis(playerName);
                }
            } else if (action === 'open-calendar-date') {
                const date = actionEl.dataset.eventDate;
                if (date) window.goToCalendarDate(date);
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
    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    const upcoming = matches
        .filter((m) => {
            const regularScore = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(m)
                : window.parseScore(m.result);
            return regularScore === null;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const heroContainer = document.getElementById('hjem-hero-match-container');
    const seasonModel = window.buildHjemSeasonModel();

    bindDashboardEvents();
    if (typeof window.bindMatchListEvents === 'function') {
        window.bindMatchListEvents();
    }

    if (heroContainer) {
        if (upcoming.length > 0 && typeof window.buildMatchDetailCardHtml === 'function') {
            heroContainer.classList.remove('is-absent');
            const nm = upcoming[0];
            const dashboardAlerts = typeof window.buildMatchAlertData === 'function' ? window.buildMatchAlertData(nm) : [];
            window._dashboardAlertPopupData = dashboardAlerts;

            /* Keep existing hero DOM on tab revisit (swipe back) — recreating <img> crests flickers */
            const existingMatchId = heroContainer.querySelector('[data-match-id]')?.getAttribute('data-match-id');
            const heroAlreadyCurrent = Boolean(
                existingMatchId
                && String(existingMatchId) === String(nm.id)
                && heroContainer.querySelector('.is-battle-hero')
            );

            if (!heroAlreadyCurrent) {
                heroContainer.classList.remove('is-absent');
                heroContainer.innerHTML = window.buildMatchDetailCardHtml(nm, {
                    extraClass: 'h-full hjem-card hjem-card-mid',
                    clickable: true,
                    showWatermark: true,
                    battleHero: true,
                    showHeroNav: false
                });
            }
            const heroCard = heroContainer.querySelector('.match-detail-card');
            if (heroCard && !heroCard.querySelector('.hjem-result-gem')) {
                heroCard.querySelector('.hjem-mark')?.remove();
                heroCard.classList.add('hjem-has-plaque');
                const plaque = document.createElement('span');
                plaque.className = 'hjem-result-gem';
                plaque.textContent = 'Neste kamp';
                heroCard.insertBefore(plaque, heroCard.firstChild);
            }
            if (heroCard && !heroCard.querySelector('.hjem-action')) {
                const cue = document.createElement('span');
                cue.className = 'blknapp hjem-action is-cue';
                cue.setAttribute('aria-hidden', 'true');
                cue.innerHTML = '<i class="fa-solid fa-futbol"></i>';
                heroCard.appendChild(cue);
            }
        } else if (upcoming.length > 0) {
            const nm = upcoming[0];
            heroContainer.innerHTML = `
                <article data-dashboard-action="open-match" data-match-id="${escapeDashboardHtml(nm.id)}" role="button" tabindex="0" class="match-detail-card dashboard-next-match-card dashboard-click-card h-full">
                    <div class="match-detail-card-top relative z-10">
                        <div class="match-detail-meta">
                            <i class="fa-regular fa-calendar-days"></i>
                            <span>Neste kamp</span>
                        </div>
                    </div>
                    <div class="match-detail-main relative z-10">
                        <span class="match-detail-time">${escapeDashboardHtml(nm.opponent || 'Motstander')}</span>
                    </div>
                </article>
            `;
            heroContainer.classList.remove('is-absent');
        } else {
            heroContainer.innerHTML = '';
            heroContainer.classList.add('is-absent');
        }
    }

    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
    window.renderHjemSeasonSummary(seasonModel);
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
    const allActivePlayers = (window.activePlayers || []).filter(p => window.isPlayerInCurrentSquadPool(p));
    const scopedPlayers = teamName
        ? allActivePlayers.filter(p => p.spillerLag === teamName)
        : allActivePlayers;
    const baseSquad = scopedPlayers.length ? scopedPlayers : allActivePlayers;
    const squadPlayers = baseSquad.filter(p => (
        typeof window.isPlayerOnRosterForActivity !== 'function'
        || window.isPlayerOnRosterForActivity(p, event)
    ));
    const squadSize = squadPlayers.length || baseSquad.length;

    const positionCounts = { K: 0, F: 0, M: 0, A: 0 };
    const injuredReady = [];
    const attendingRefs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    attendingRefs.forEach(ref => {
        const player = typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null;
        if (!player || player.isGuest) return;

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
        const eventTypeLabel = isTraining ? 'Trening' : (ne.type || 'Aktivitet');
        const sessionStats = window.buildNextSessionAttendanceStats(ne);
        /* Lang dato, samme formatter som sesongkortene. */
        const dateLabel = hjemSeasonLongDate(ne.date) || 'Dato ikke satt';
        const timeLabel = ne.time || '--:--';
        const locationLabel = ne.location || 'Ikke oppgitt';
        const hasSessionAttendance = typeof window.hasRegisteredAttendance === 'function'
            ? window.hasRegisteredAttendance(ne.attendance)
            : false;
        const sessionSeasonYear = typeof window.getExplicitActivitySeasonYear === 'function'
            ? window.getExplicitActivitySeasonYear(ne)
            : (typeof window.getActivitySeasonYear === 'function' ? window.getActivitySeasonYear(ne) : null);
        const sessionObligation = typeof window.getTrainingObligationLabel === 'function'
            ? window.getTrainingObligationLabel(ne)
            : '';
        const obligationClass = sessionObligation === 'Obligatorisk'
            ? ' is-mandatory'
            : (sessionObligation === 'Frivillig' ? ' is-voluntary' : '');
        const obligationHtml = sessionObligation
            ? `<span class="hjem-status-chip${obligationClass}">${escapeDashboardHtml(sessionObligation)}</span>`
            : '';
        const sessionSeasonHtml = [sessionSeasonYear ? escapeDashboardHtml(String(sessionSeasonYear)) : '', obligationHtml].filter(Boolean).join(' · ');

        window._sessionInjuryPopupData = sessionStats.injuredReady.length ? sessionStats.injuredReady : [];

        const cardActionAttrs = canOpenSession
            ? `data-dashboard-action="open-training-session" data-event-id="${escapeDashboardHtml(ne.id)}"`
            : `data-dashboard-action="open-calendar-date" data-event-date="${escapeDashboardHtml(ne.date)}"`;

        const attendanceLine = hasSessionAttendance
            ? `${sessionStats.møttOppAntall} påmeldt · ${['K', 'F', 'M', 'A'].map(letter => `${sessionStats.positionCounts[letter]}${letter}`).join(' - ')}`
            : 'Oppmøte ikke registrert';
        const injuryLine = sessionStats.injuredReady.length
            ? `<p class="hjem-session-injury"><span>${escapeDashboardHtml(sessionStats.injuredReady.length === 1 ? '1 skadet' : `${sessionStats.injuredReady.length} skadet`)}</span><button type="button" class="blknapp hjem-action" data-dashboard-action="session-injury" aria-label="Vis skadede på økten"><i class="fa-solid fa-user-injured" aria-hidden="true"></i></button></p>`
            : '';
        sessionWidgetHtml = `
            <article class="hjem-session-board h-full">
                <p class="hjem-note-kicker">Neste økt</p>
                <p class="hjem-lead">${escapeDashboardHtml(dateLabel)}</p>
                <p class="hjem-session-time">${escapeDashboardHtml(timeLabel)}</p>
                <p class="hjem-sub">${escapeDashboardHtml(eventTypeLabel)}</p>
                ${sessionSeasonHtml ? `<p class="hjem-quiet">${sessionSeasonHtml}</p>` : ''}
                <p class="hjem-quiet">${escapeDashboardHtml(attendanceLine)}</p>
                <p class="hjem-quiet">${escapeDashboardHtml(locationLabel)}</p>
                ${injuryLine}
                <button type="button" class="blknapp hjem-action" ${cardActionAttrs} aria-label="Åpne økt"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i></button>
            </article>
        `;
    } else {
        sessionWidgetHtml = '';
        bottomContainer.classList.add('is-absent');
    }

    if (sessionWidgetHtml) bottomContainer.classList.remove('is-absent');
    bottomContainer.innerHTML = sessionWidgetHtml;
    if (typeof window.renderHjemSeasonSummary === 'function') {
        window.renderHjemSeasonSummary();
    }
    if (typeof window.renderHjemOperations === 'function') {
        window.renderHjemOperations();
    }
};

const HJEM_LEAGUE_TITLE = 'NFF 5.div. avd.2';
const HJEM_CUP_TITLE = 'Obos Cup';

function hjemTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function hjemCountPhrase(count, one, many) {
    const n = Number(count) || 0;
    return `${n} ${n === 1 ? one : many}`;
}

function hjemMatchCountsForYear(match, year) {
    if (!match) return false;
    const team = typeof window.getStatsTeamFilter === 'function' ? window.getStatsTeamFilter() : 'Alle';
    if (team && team !== 'Alle' && match.matchGroup && match.matchGroup !== team) return false;
    if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return false;
    if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(match, year)) return false;
    return true;
}

function hjemMatchTone(match) {
    const outcome = typeof window.getMatchOutcomeScore === 'function'
        ? window.getMatchOutcomeScore(match)
        : (typeof window.getMatchRegularScore === 'function' ? window.getMatchRegularScore(match) : null);
    if (!outcome) return 'U';
    if (outcome.bsk > outcome.opponent) return 'S';
    if (outcome.bsk < outcome.opponent) return 'T';
    return 'U';
}

function hjemPlayedCountingMatches(year) {
    return (Array.isArray(window.activeMatches) ? window.activeMatches : [])
        .filter((match) => {
            if (!hjemMatchCountsForYear(match, year)) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return false;
            const regular = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(match)
                : null;
            return Boolean(regular);
        })
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function hjemHasUpcomingMatch(year) {
    const today = hjemTodayKey();
    return (Array.isArray(window.activeMatches) ? window.activeMatches : []).some((match) => {
        if (!hjemMatchCountsForYear(match, year)) return false;
        const date = String(match.date || '').slice(0, 10);
        if (!date || date < today) return false;
        const regular = typeof window.getMatchRegularScore === 'function'
            ? window.getMatchRegularScore(match)
            : null;
        return !regular;
    });
}

function hjemHasUpcomingMandatoryTraining(year) {
    const today = hjemTodayKey();
    return (Array.isArray(window.activeEvents) ? window.activeEvents : []).some((event) => {
        if (!event || event.type !== 'Trening') return false;
        const date = String(event.date || '').slice(0, 10);
        if (!date || date < today) return false;
        const season = typeof window.getExplicitActivitySeasonYear === 'function'
            ? window.getExplicitActivitySeasonYear(event)
            : null;
        if (season !== year) return false;
        return typeof window.isMandatoryTraining === 'function' && window.isMandatoryTraining(event);
    });
}

function hjemSeasonHasTraining(year) {
    return typeof window.seasonHasTrainingActivity === 'function' && window.seasonHasTrainingActivity(year);
}

function hjemMandatoryStart(year) {
    return typeof window.getMandatoryTrainingStart === 'function' ? window.getMandatoryTrainingStart(year) : '';
}

function hjemPlanSummary(year) {
    if (typeof window.readRosterPlanSummary !== 'function') {
        return { year, counts: { Uavklart: 0, Fortsetter: 0, Slutter: 0, 'Ny spiller': 0 }, total: 0 };
    }
    return window.readRosterPlanSummary(year);
}

function hjemResolvePhase(activeYear) {
    const nextYear = activeYear + 1;
    const playedActive = hjemPlayedCountingMatches(activeYear).length;
    const playedNext = hjemPlayedCountingMatches(nextYear).length;
    const upcomingActiveMatch = hjemHasUpcomingMatch(activeYear);
    const upcomingActiveMandatory = hjemHasUpcomingMandatoryTraining(activeYear);
    const nextHasPrep = hjemSeasonHasTraining(nextYear)
        || Boolean(hjemMandatoryStart(nextYear))
        || hjemHasUpcomingMatch(nextYear);
    const activeHasPrep = hjemSeasonHasTraining(activeYear)
        || Boolean(hjemMandatoryStart(activeYear))
        || upcomingActiveMatch;
    const nextPlan = hjemPlanSummary(nextYear);

    if (playedActive === 0 && activeHasPrep) {
        return {
            id: 'oppkjoring',
            year: activeYear,
            title: `Oppkjøring ${activeYear}`,
            detail: 'Ingen tellende kamper ennå'
        };
    }
    if (upcomingActiveMatch || upcomingActiveMandatory) {
        return {
            id: 'sesong',
            year: activeYear,
            title: `Sesong ${activeYear}`,
            detail: ''
        };
    }
    if (playedNext === 0 && nextHasPrep) {
        return {
            id: 'oppkjoring',
            year: nextYear,
            title: `Oppkjøring ${nextYear}`,
            detail: `Aktiv sesong er fortsatt ${activeYear}`
        };
    }
    if (nextPlan.total > 0) {
        const closed = playedActive > 0 ? `${activeYear} avsluttet · ` : '';
        return {
            id: 'pause',
            year: activeYear,
            title: 'Sesongpause',
            detail: `${closed}${nextYear} planlegges`
        };
    }
    if (playedActive > 0) {
        return {
            id: 'sesong',
            year: activeYear,
            title: `Sesong ${activeYear}`,
            detail: 'Ingen kommende kamp'
        };
    }
    return {
        id: 'sesong',
        year: activeYear,
        title: `Sesong ${activeYear}`,
        detail: 'Ingen tellende kamper ennå'
    };
}

function hjemTrainingStartStatus(year, alwaysShow) {
    const modelFrom = window.TRAINING_MANDATORY_MODEL_FROM_YEAR || 2027;
    if (!year || year < modelFrom) return null;
    const start = hjemMandatoryStart(year);
    if (start) {
        return { year, label: `${hjemSeasonLongDate(start)} ${year}` };
    }
    if (alwaysShow || hjemSeasonHasTraining(year)) {
        return { year, label: 'Ikke satt' };
    }
    return null;
}

function hjemFollowUpCount(activeYear) {
    if (typeof window.buildStatsFollowUps !== 'function') return null;
    const previous = window.statsKampYearFilter;
    window.statsKampYearFilter = activeYear;
    try {
        const team = typeof window.getStatsTeamFilter === 'function' ? window.getStatsTeamFilter() : 'Alle';
        const result = window.buildStatsFollowUps(team);
        return Number(result?.activePlayerCount) || 0;
    } catch (error) {
        console.warn('Kunne ikke lese oppfølging til forsiden.', error);
        return null;
    } finally {
        window.statsKampYearFilter = previous;
    }
}

function hjemInjuredSquadCount() {
    const team = typeof window.getStatsTeamFilter === 'function' ? window.getStatsTeamFilter() : 'Alle';
    return (Array.isArray(window.activePlayers) ? window.activePlayers : []).filter((player) => {
        if (typeof window.isPlayerInCurrentSquadPool === 'function' && !window.isPlayerInCurrentSquadPool(player)) return false;
        if (team && team !== 'Alle' && player.spillerLag !== team) return false;
        const info = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(player) : null;
        return Boolean(info?.isInjured);
    }).length;
}

function hjemPulseForYear(year) {
    const rows = hjemPlayedCountingMatches(year).map((match) => {
        const regular = typeof window.getMatchRegularScore === 'function'
            ? window.getMatchRegularScore(match)
            : null;
        return {
            tone: hjemMatchTone(match),
            gf: regular ? regular.bsk : 0,
            ga: regular ? regular.opponent : 0,
            opponent: match.opponent || 'Motstander',
            result: match.result || ''
        };
    });
    const last = rows.slice(-5);
    return {
        year,
        count: rows.length,
        wins: rows.filter(row => row.tone === 'S').length,
        draws: rows.filter(row => row.tone === 'U').length,
        losses: rows.filter(row => row.tone === 'T').length,
        goalsFor: rows.reduce((sum, row) => sum + row.gf, 0),
        goalsAgainst: rows.reduce((sum, row) => sum + row.ga, 0),
        last
    };
}

window.buildHjemFrontModel = function() {
    const activeYear = typeof window.getActiveSeasonYear === 'function'
        ? window.getActiveSeasonYear()
        : new Date().getFullYear();
    const phase = hjemResolvePhase(activeYear);
    const nextPlan = hjemPlanSummary(activeYear + 1);
    const namedPlan = window.ROSTER_PLAN_YEAR && window.ROSTER_PLAN_YEAR !== nextPlan.year
        ? hjemPlanSummary(window.ROSTER_PLAN_YEAR)
        : nextPlan;
    const plan = nextPlan.total > 0 ? nextPlan : (namedPlan.total > 0 ? namedPlan : nextPlan);
    const trainingYear = phase.id === 'oppkjoring' ? phase.year : (phase.id === 'pause' ? activeYear + 1 : activeYear);
    const trainingStart = hjemTrainingStartStatus(trainingYear, phase.id !== 'sesong');
    return {
        activeYear,
        teamName: typeof window.getPrimaryTeamName === 'function' ? window.getPrimaryTeamName() : 'BSK',
        phase,
        plan,
        showPlanInStatus: plan.total > 0 && phase.id !== 'sesong',
        trainingStart,
        followUpCount: hjemFollowUpCount(activeYear),
        injuredCount: hjemInjuredSquadCount(),
        pulse: hjemPulseForYear(activeYear)
    };
};

function hjemActionButton(attrs, icon, label) {
    return `<button type="button" class="blknapp hjem-action" ${attrs} aria-label="${escapeDashboardHtml(label)}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
}

function hjemSectionChip(attrs, label) {
    return `<button type="button" class="bsk-btn bsk-btn-chip stats-lag-section-btn is-active hjem-section-chip" ${attrs}><span>${escapeDashboardHtml(label)}</span></button>`;
}

function hjemPlanSecondaryLine(counts) {
    const parts = [];
    if (counts.Fortsetter) parts.push(hjemCountPhrase(counts.Fortsetter, 'fortsetter', 'fortsetter'));
    if (counts.Slutter) parts.push(hjemCountPhrase(counts.Slutter, 'slutter', 'slutter'));
    if (counts['Ny spiller']) parts.push(hjemCountPhrase(counts['Ny spiller'], 'ny', 'nye'));
    return parts.join(' · ');
}

window.renderHjemOperations = function() {
    const nowSlot = document.getElementById('hjem-now');
    const focusSlot = document.getElementById('hjem-coach-focus');
    const pulseSlot = document.getElementById('hjem-season-pulse');
    if (!nowSlot && !focusSlot && !pulseSlot) return;
    const model = window.buildHjemFrontModel();
    const year = model.activeYear;

    if (nowSlot) {
        const planSecondary = model.showPlanInStatus ? hjemPlanSecondaryLine(model.plan.counts) : '';
        const planLine = model.showPlanInStatus ? `
            <div class="hjem-now-fact">
                <p class="hjem-now-fact-text">
                    <span>Troppsplan ${model.plan.year} · ${escapeDashboardHtml(hjemCountPhrase(model.plan.counts.Uavklart, 'uavklart', 'uavklart'))}</span>
                    ${planSecondary ? `<span class="hjem-now-line-sub">${escapeDashboardHtml(planSecondary)}</span>` : ''}
                </p>
                ${hjemActionButton('data-dashboard-action="open-roster-plan"', 'fa-users', `Åpne troppsplan ${model.plan.year}`)}
            </div>` : '';
        const startLine = model.trainingStart ? `
            <div class="hjem-now-fact">
                <p class="hjem-now-fact-text">
                    <span>Obligatorisk treningsstart · ${escapeDashboardHtml(model.trainingStart.label)}</span>
                </p>
                ${hjemActionButton(`data-dashboard-action="open-training-start" data-season-year="${model.trainingStart.year}"`, 'fa-calendar-check', 'Åpne obligatorisk treningsstart')}
            </div>` : '';
        nowSlot.innerHTML = `
            <section class="hjem-now" aria-label="Akkurat nå">
                <article class="hjem-result-board">
                    <span class="hjem-result-gem">Akkurat nå</span>
                    <h2 class="hjem-now-phase">${escapeDashboardHtml(model.phase.title)}</h2>
                    ${model.phase.detail ? `<p class="hjem-now-detail">${escapeDashboardHtml(model.phase.detail)}</p>` : ''}
                    <div class="hjem-now-facts">
                        ${planLine}
                        ${startLine}
                    </div>
                </article>
            </section>`;
    }

    if (focusSlot) {
        const followCount = model.followUpCount;
        const rows = [`
            <article class="hjem-note-card is-orange">
                <span class="hjem-note-gem is-orange" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
                <div class="hjem-note-copy">
                    <span class="hjem-note-title">Oppfølging</span>
                    <span class="hjem-note-sub">Signaler som kan kreve oppfølging</span>
                    <span class="hjem-note-meta">${followCount == null ? '<span>Ikke tilgjengelig</span>' : hjemSectionChip(`data-dashboard-action="open-followup" data-season-year="${year}"`, followCount === 1 ? '1 spiller' : `${followCount} spillere`)}</span>
                </div>
            </article>`];
        if (model.plan.total > 0) {
            rows.push(`
                <article class="hjem-note-card is-plan">
                    <span class="hjem-note-gem is-gold" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
                    <div class="hjem-note-copy">
                        <span class="hjem-note-title">Troppsplan ${model.plan.year}</span>
                        <span class="hjem-note-meta">${hjemSectionChip('data-dashboard-action="open-roster-plan"', `${model.plan.counts.Uavklart} uavklart`)}</span>
                    </div>
                </article>`);
        }
        rows.push(`
            <article class="hjem-note-card is-injury">
                <span class="hjem-note-gem is-injury" aria-hidden="true"><i class="fa-solid fa-user-injured"></i></span>
                    <div class="hjem-note-copy">
                        <span class="hjem-note-title">Skadet</span>
                        <span class="hjem-note-sub">Nåværende skade i troppen</span>
                        <span class="hjem-note-meta">${hjemSectionChip('data-dashboard-action="open-injured"', model.injuredCount === 1 ? '1 spiller' : `${model.injuredCount} spillere`)}</span>
                    </div>
                </article>`);
        focusSlot.innerHTML = `
            <section class="hjem-focus" aria-label="Trenerfokus">
                <header class="hjem-family-head">
                    <span class="hjem-family-gem is-gold" aria-hidden="true"><i class="fa-solid fa-clipboard-list"></i></span>
                    <h2>Trenerfokus</h2>
                </header>
                <div class="hjem-note-list">
                    ${rows.join('')}
                </div>
            </section>`;
    }

    if (pulseSlot) {
        const pulse = model.pulse;
        const recordValue = `${pulse.wins} – ${pulse.draws} – ${pulse.losses}`;
        const facts = pulse.count ? `
            <div class="hjem-metric-grid">
                <div class="hjem-metric">
                    <strong class="hjem-metric-value">${pulse.count}</strong>
                    <span class="hjem-metric-label">${pulse.count === 1 ? 'Kamp' : 'Kamper'}</span>
                </div>
                <div class="hjem-metric is-record">
                    <strong class="hjem-metric-value">${escapeDashboardHtml(recordValue)}</strong>
                    <span class="hjem-metric-label">Seier · uavgjort · tap</span>
                </div>
                <div class="hjem-metric">
                    <strong class="hjem-metric-value">${pulse.goalsFor}–${pulse.goalsAgainst}</strong>
                    <span class="hjem-metric-label">Mål</span>
                </div>
            </div>
            ${pulse.last.length ? `<div class="hjem-form"><span>Siste ${pulse.last.length === 5 ? 'fem' : pulse.last.length}</span><ol>${pulse.last.map(row => `<li class="is-${String(row.tone || 'U').toLowerCase()}" title="${escapeDashboardHtml(`${row.opponent} ${row.gf}–${row.ga}`)}">${escapeDashboardHtml(`${row.gf}–${row.ga}`)}</li>`).join('')}</ol></div>` : ''}` : `
            <p class="hjem-pulse-empty">Ingen tellende kamper ennå</p>`;
        pulseSlot.innerHTML = `
            <section class="hjem-pulse" aria-label="Sesongpuls ${year}">
                <article class="hjem-pulse-board">
                    <header class="hjem-family-head">
                        <h2>Sesongpuls ${year}</h2>
                        ${hjemActionButton(`data-dashboard-action="open-season-pulse" data-season-year="${year}"`, 'fa-chart-simple', `Åpne statistikk ${year}`)}
                    </header>
                    ${facts}
                </article>
            </section>`;
    }
};

const HJEM_SEASON_NUMBER_WORDS = [
    '', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti',
    'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten', 'tjue'
];

const HJEM_SEASON_FORMATIONS = [
    { label: '3-4-1-2', pattern: /3[\s-]?4[\s-]?1[\s-]?2|\b3412\b/i },
    { label: '3-2-3-2', pattern: /3[\s-]?2[\s-]?3[\s-]?2|\b3232\b/i },
    { label: '4-4-2', pattern: /4[\s-]?4[\s-]?2|\b442\b/i },
    { label: '4-5-1', pattern: /4[\s-]?5[\s-]?1|\b451\b/i },
    { label: '3-5-2', pattern: /3[\s-]?5[\s-]?2|\b352\b/i },
    { label: '4-3-3', pattern: /4[\s-]?3[\s-]?3|\b433\b/i }
];

function hjemSeasonWord(count) {
    const n = Number(count) || 0;
    return HJEM_SEASON_NUMBER_WORDS[n] || String(n);
}

function hjemSeasonSeire(count) {
    const n = Number(count) || 0;
    return n === 1 ? `${hjemSeasonWord(1)} seier` : `${hjemSeasonWord(n)} seire`;
}

function hjemSeasonLongDate(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    const monthName = date.toLocaleDateString('nb-NO', { month: 'long' });
    return `${day}. ${monthName}`;
}

function hjemSeasonMonthName(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    if (!parts[0] || !parts[1] || !parts[2]) return '';
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('nb-NO', { month: 'long' });
}

function hjemSeasonQuote(text) {
    const parts = String(text || '')
        .trim()
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const sentence = parts[index];
        if (sentence.length >= 40 && sentence.length <= 180) return sentence;
    }
    return '';
}

function hjemSeasonFormationHits(text) {
    const source = String(text || '');
    const hits = [];
    HJEM_SEASON_FORMATIONS.forEach((formation) => {
        const re = new RegExp(formation.pattern.source, formation.pattern.flags.includes('g')
            ? formation.pattern.flags
            : `${formation.pattern.flags}g`);
        let match;
        while ((match = re.exec(source))) {
            const from = Math.max(0, match.index - 90);
            const to = Math.min(source.length, match.index + match[0].length + 90);
            const windowText = source.slice(from, to);
            hits.push({
                label: formation.label,
                landed: /funger|utmerket|full kontroll/i.test(windowText)
            });
            if (match.index === re.lastIndex) re.lastIndex += 1;
        }
    });
    return hits;
}

function hjemSeasonFormationShift(rows) {
    const mentionCounts = {};
    let earlyLabel = '';
    let shift = null;
    rows.forEach((row) => {
        const hits = hjemSeasonFormationHits(row.notesText);
        hits.forEach((hit) => {
            mentionCounts[hit.label] = (mentionCounts[hit.label] || 0) + 1;
        });
        if (!earlyLabel) {
            const leader = Object.entries(mentionCounts).sort((a, b) => b[1] - a[1])[0];
            if (leader && leader[1] >= 2) earlyLabel = leader[0];
        }
        if (earlyLabel && !shift) {
            const landed = hits.find(hit => hit.landed && hit.label !== earlyLabel);
            if (landed) shift = { from: earlyLabel, to: landed.label, row };
        }
    });
    return shift;
}

function hjemSeasonRecordPhrase(list) {
    const wins = list.filter(row => row.tone === 'S').length;
    const draws = list.filter(row => row.tone === 'U').length;
    const losses = list.filter(row => row.tone === 'T').length;
    const parts = [];
    if (wins) parts.push(hjemSeasonSeire(wins));
    if (draws) parts.push(draws === 1 ? 'én uavgjort' : `${hjemSeasonWord(draws)} uavgjort`);
    if (losses) parts.push(losses === 1 ? 'ett tap' : `${hjemSeasonWord(losses)} tap`);
    if (parts.length <= 1) return parts[0] || '';
    if (parts.length === 2) return `${parts[0]} og ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')} og ${parts[parts.length - 1]}`;
}

function hjemSeasonPenaltyClause(row) {
    const score = String(row.penalty || '').replace(/(\d)\s*-\s*(\d)/, '$1–$2');
    if (!score) return '';
    return row.tone === 'S'
        ? `, og videre etter ${score} på straffespark`
        : `, etter ${score} på straffespark`;
}

function hjemSeasonCupCard(rows) {
    const cup = rows.filter(row => row.type === 'Cup');
    if (!cup.length) return null;
    const record = hjemSeasonRecordPhrase(cup);
    if (!record) return null;
    const featured = cup
        .filter(row => row.quote)
        .sort((a, b) => (b.gf + b.ga) - (a.gf + a.ga))[0] || null;
    const last = cup[cup.length - 1];
    let lead = `I cupen ble det ${record}.`;
    if (last && last.tone === 'T' && (!featured || String(last.id) !== String(featured.id))) {
        const where = last.venue === 'Borte' ? 'borte mot' : (last.venue === 'Hjemme' ? 'hjemme mot' : 'mot');
        const when = hjemSeasonLongDate(last.date);
        lead += ` Ute etter ${last.gf}–${last.ga} ${where} ${last.opponent}${when ? `, ${when}` : ''}.`;
    }
    const match = featured ? {
        id: featured.id,
        line: `${featured.gf}–${featured.ga} mot ${featured.opponent}, ${hjemSeasonLongDate(featured.date)}${hjemSeasonPenaltyClause(featured)}.`,
        quote: featured.quote
    } : null;
    return { lead, match };
}

function hjemSeasonRunPhrase(list) {
    const wins = list.filter(row => row.tone === 'S').length;
    const draws = list.filter(row => row.tone === 'U').length;
    const losses = list.filter(row => row.tone === 'T').length;
    const goalsFor = list.reduce((sum, row) => sum + row.gf, 0);
    const goalsAgainst = list.reduce((sum, row) => sum + row.ga, 0);
    const goals = `${goalsFor}–${goalsAgainst} i mål`;
    if (wins === list.length) return `${hjemSeasonSeire(wins)} på rad og ${goals}`;
    const parts = [hjemSeasonSeire(wins)];
    if (draws) parts.push(draws === 1 ? 'én uavgjort' : `${hjemSeasonWord(draws)} uavgjort`);
    if (losses) parts.push(losses === 1 ? 'ett tap' : `${hjemSeasonWord(losses)} tap`);
    return `${parts.join(', ')} og ${goals}`;
}

function hjemSeasonStatementSentence(rows) {
    const win = rows.find(row => row.type === 'Serie' && row.tone === 'S' && /oldenborg/i.test(row.opponent));
    if (!win) return '';
    const when = hjemSeasonLongDate(win.date);
    const where = win.venue === 'Borte' ? 'borte ' : (win.venue === 'Hjemme' ? 'hjemme ' : '');
    return `En av de store kampene var seieren ${where}mot tabelleneren ${win.opponent}, ${win.gf}–${win.ga}${when ? `, ${when}` : ''}.`;
}

function hjemSeasonAfterFormationSentence(rows) {
    const shift = hjemSeasonFormationShift(rows);
    if (!shift?.row?.date) return '';
    const after = rows.filter(row => row.type === 'Serie' && row.date > shift.row.date);
    if (!after.length) return '';
    const when = hjemSeasonLongDate(shift.row.date);
    const against = shift.row.opponent ? ` mot ${shift.row.opponent}` : '';
    const dated = when ? `, ${when}` : '';
    return `Formasjonen ble byttet fra ${shift.from} til ${shift.to}${against}${dated}. I serien etter det ble det ${hjemSeasonRunPhrase(after)}.`;
}

function hjemSeasonPlace(venue) {
    if (venue === 'Borte') return 'Borte mot';
    if (venue === 'Hjemme') return 'Hjemme mot';
    return 'Mot';
}

window.buildHjemSeasonModel = function() {
    const year = typeof window.getStatsActiveSeasonYear === 'function'
        ? window.getStatsActiveSeasonYear()
        : new Date().getFullYear();
    const team = typeof window.getStatsTeamFilter === 'function' ? window.getStatsTeamFilter() : 'Alle';
    const rows = (Array.isArray(window.activeMatches) ? window.activeMatches : [])
        .filter((match) => {
            if (team && team !== 'Alle' && match.matchGroup && match.matchGroup !== team) return false;
            if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return false;
            if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(match, year)) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return false;
            return true;
        })
        .map((match) => {
            const regular = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(match)
                : null;
            if (!regular) return null;
            const outcome = typeof window.getMatchOutcomeScore === 'function'
                ? window.getMatchOutcomeScore(match)
                : regular;
            let tone = 'U';
            if (outcome.bsk > outcome.opponent) tone = 'S';
            else if (outcome.bsk < outcome.opponent) tone = 'T';
            const venue = typeof window.getMatchVenue === 'function'
                ? window.getMatchVenue(match)
                : (match.venue || '');
            return {
                id: match.id,
                date: match.date,
                opponent: String(match.opponent || 'Motstander').replace(/\s+/g, ' ').trim() || 'Motstander',
                type: String(match.matchType || '').trim(),
                venue,
                gf: regular.bsk,
                ga: regular.opponent,
                tone,
                penalty: String(match.penaltyResult || '').trim(),
                quote: hjemSeasonQuote(match.notes && match.notes.positive),
                positiveNote: String(match.notes?.positive || ''),
                notesText: `${match.notes?.positive || ''}\n${match.notes?.challenge || ''}`
            };
        })
        .filter(Boolean)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (rows.length < 6) return null;

    let winless = 0;
    while (winless < rows.length && rows[winless].tone !== 'S') winless += 1;
    const sentences = [];
    if (winless >= 4) {
        sentences.push(`De ${hjemSeasonWord(winless)} første kampene ga ingen seier.`);
        const worst = rows.slice(0, winless)
            .filter(row => row.tone === 'T')
            .sort((a, b) => (a.gf - a.ga) - (b.gf - b.ga))[0];
        if (worst && (worst.ga - worst.gf) >= 3) {
            sentences.push(`${hjemSeasonPlace(worst.venue)} ${worst.opponent} ble det ${worst.gf}–${worst.ga}.`);
        }
    }

    const half = Math.floor(rows.length / 2);
    const firstHalfWins = rows.slice(0, rows.length - half).filter(row => row.tone === 'S').length;
    const secondHalfWins = rows.slice(rows.length - half).filter(row => row.tone === 'S').length;
    const last = rows[rows.length - 1];
    const monthKey = String(last.date || '').slice(0, 7);
    const winsByMonth = {};
    rows.forEach((row) => {
        const key = String(row.date || '').slice(0, 7);
        if (!key) return;
        if (row.tone === 'S') winsByMonth[key] = (winsByMonth[key] || 0) + 1;
    });
    const monthWins = winsByMonth[monthKey] || 0;
    const otherMonthWins = Object.entries(winsByMonth)
        .filter(([key]) => key !== monthKey)
        .reduce((max, [, wins]) => Math.max(max, wins), 0);
    const monthName = monthWins >= 3 && monthWins >= otherMonthWins
        ? hjemSeasonMonthName(last.date)
        : '';

    if (half >= 4 && secondHalfWins > firstHalfWins) {
        const closing = monthName ? `, og ${monthName} alene ga ${hjemSeasonWord(monthWins)}` : '';
        sentences.push(`De ${hjemSeasonWord(half)} siste ga ${hjemSeasonSeire(secondHalfWins)}${closing}.`);
    } else if (monthName) {
        const name = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        sentences.push(`${name} alene ga ${hjemSeasonSeire(monthWins)}.`);
    }

    const series = rows.filter(row => row.type === 'Serie');
    if (series.length) {
        const wins = series.filter(row => row.tone === 'S').length;
        const draws = series.filter(row => row.tone === 'U').length;
        const losses = series.filter(row => row.tone === 'T').length;
        const stillOpen = (Array.isArray(window.activeMatches) ? window.activeMatches : []).some((match) => {
            if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(match, year)) return false;
            if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return false;
            if (match.matchType !== 'Serie') return false;
            const score = typeof window.getMatchRegularScore === 'function' ? window.getMatchRegularScore(match) : null;
            return !score;
        });
        sentences.unshift(`Serien ${stillOpen ? 'står' : 'endte'} ${wins}–${draws}–${losses}.`);
    }

    const afterFormation = hjemSeasonAfterFormationSentence(rows);
    if (afterFormation) sentences.push(afterFormation);
    const statement = hjemSeasonStatementSentence(rows);
    if (statement) sentences.push(statement);

    const story = sentences.join(' ');
    const notes = '';
    const cup = hjemSeasonCupCard(rows);
    const matches = cup && cup.match ? [cup.match] : [];

    if (!story && !notes && !cup && !matches.length) return null;
    return { year, story, notes, cupLead: cup ? cup.lead : '', matches };
};

window.renderHjemSeasonSummary = function(existingModel) {
    const slot = document.getElementById('hjem-season-summary');
    if (!slot) return;
    const model = existingModel === undefined ? window.buildHjemSeasonModel() : existingModel;
    if (!model) {
        slot.innerHTML = '';
        slot.classList.add('is-absent');
        return;
    }

    const year = escapeDashboardHtml(model.year);
    const paragraphs = [model.story, model.notes].filter(Boolean).map(text => (
        `<p>${escapeDashboardHtml(text)}</p>`
    )).join('');
    const matchRows = model.matches.map(match => `
        <article data-dashboard-action="open-match" data-match-id="${escapeDashboardHtml(match.id)}" role="button" tabindex="0" class="hjem-season-row dashboard-click-card">
            <p class="hjem-season-row-line">${escapeDashboardHtml(match.line)}</p>
            ${match.quote ? `<p class="hjem-season-quote">«${escapeDashboardHtml(match.quote)}»</p>` : ''}
        </article>
    `).join('');

    slot.classList.remove('is-absent');
    slot.innerHTML = `
        <section class="hjem-season" aria-label="Sesongoppsummering ${year}">
            <h2 class="hjem-section-label">Sesongoppsummering ${year}</h2>
            <article data-dashboard-action="open-statistikk" data-season-year="${year}" role="button" tabindex="0" class="match-detail-card dashboard-next-match-card hjem-season-story dashboard-click-card">
                <div class="dashboard-next-match-watermark" aria-hidden="true">
                    <i class="fa-solid fa-book-open"></i>
                </div>
                <div class="hjem-season-story-body relative z-10">
                    <div class="match-detail-chip">
                        <i class="fa-solid fa-flag" aria-hidden="true"></i>
                        <span>${HJEM_LEAGUE_TITLE} ${year}</span>
                    </div>
                    ${paragraphs}
                </div>
            </article>
            ${(model.cupLead || matchRows) ? `<div class="match-detail-card dashboard-next-session-card hjem-season-panel">${model.cupLead ? `<div class="hjem-season-cup-body"><div class="match-detail-chip"><i class="fa-solid fa-trophy" aria-hidden="true"></i><span>${HJEM_CUP_TITLE} ${year}</span></div><p class="hjem-season-cup-lead">${escapeDashboardHtml(model.cupLead)}</p></div>` : ''}${matchRows}</div>` : ''}
        </section>
    `;
};
