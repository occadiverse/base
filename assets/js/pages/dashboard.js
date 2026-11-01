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
    ['hjem-hero-match-container', 'hjem-bottom-widgets', 'hjem-season-summary'].forEach((containerId) => {
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
                    extraClass: 'h-full',
                    clickable: true,
                    showWatermark: true,
                    battleHero: true,
                    showHeroNav: false
                });
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
        } else if (seasonModel) {
            heroContainer.innerHTML = '';
            heroContainer.classList.add('is-absent');
        } else {
            heroContainer.classList.remove('is-absent');
            heroContainer.innerHTML = `
                <article data-dashboard-action="open-kamper-tab" role="button" tabindex="0" class="match-detail-card dashboard-next-match-card dashboard-click-card hjem-empty-card h-full">
                    <div class="dashboard-next-match-watermark">
                        <i class="fa-solid fa-futbol"></i>
                    </div>
                    <div class="relative z-10 px-6 py-8 text-center">
                        <div class="match-detail-chip mb-4 mx-auto">
                            <i class="fa-solid fa-calendar-plus"></i>
                            <span>Neste kamp</span>
                        </div>
                        <h3 class="font-black text-white text-sm">Ingen kommende kamp</h3>
                        <p class="text-xs text-white/60 mt-2 max-w-[240px] mx-auto">Legg til en kamp for å komme i gang.</p>
                        <button
                            type="button"
                            class="bsk-btn bsk-btn-chip match-list-add-btn hjem-empty-cta"
                            data-dashboard-action="add-match"
                            title="Legg til kamp"
                            aria-label="Legg til kamp"
                        >
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            <span>Legg til kamp</span>
                        </button>
                    </div>
                </article>`;
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
        /* Samme datostil som kamp-hero (uten ukedag). */
        const dateValue = new Date(ne.date);
        const dateFormatted = Number.isNaN(dateValue.getTime())
            ? 'Dato ikke satt'
            : dateValue.toLocaleDateString('no-NO', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
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
        const sessionArenaHtml = hasSessionAttendance
            ? `
                        <div class="dashboard-session-side is-attendance">
                            <span class="dashboard-session-attendance-count${fractionToneClass}">${sessionStats.møttOppAntall}</span>
                            <span class="dashboard-session-attendance-label">påmeldt</span>
                        </div>
                        <div class="dashboard-session-hero">
                            <span class="dashboard-session-hero-time">${escapeDashboardHtml(timeLabel)}</span>
                            <span class="dashboard-session-hero-label">${escapeDashboardHtml(eventTypeLabel)}</span>
                        </div>
                        <div class="dashboard-session-side is-radar">
                            <span class="dashboard-session-radar-inline">${radarParts}</span>
                        </div>`
            : `
                        <div class="dashboard-session-side is-attendance is-empty" aria-hidden="true"></div>
                        <div class="dashboard-session-hero">
                            <span class="dashboard-session-hero-time">${escapeDashboardHtml(timeLabel)}</span>
                            <span class="dashboard-session-hero-label">${escapeDashboardHtml(eventTypeLabel)}</span>
                            <span class="dashboard-session-unregistered-label">Oppmøte ikke registrert</span>
                        </div>
                        <div class="dashboard-session-side is-radar is-empty" aria-hidden="true"></div>`;

        window._sessionInjuryPopupData = sessionStats.injuredReady;

        let injuryChipHtml = '';
        if (sessionStats.injuredReady.length > 0) {
            const injuredCount = sessionStats.injuredReady.length;
            const injuryLabel = injuredCount === 1
                ? '1 skadet'
                : `${injuredCount} skadet`;
            injuryChipHtml = `
                    <button type="button"
                            data-dashboard-action="session-injury"
                            class="bsk-btn bsk-btn-chip bsk-btn-danger dashboard-alert-chip"
                            title="${escapeDashboardHtml(injuryLabel)}"
                            aria-label="${escapeDashboardHtml(injuryLabel)}">
                        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                        <span>${escapeDashboardHtml(injuryLabel)}</span>
                    </button>`;
        } else {
            window._sessionInjuryPopupData = [];
        }

        const cardActionAttrs = canOpenSession
            ? `data-dashboard-action="open-training-session" data-event-id="${escapeDashboardHtml(ne.id)}"`
            : `data-dashboard-action="open-calendar-date" data-event-date="${escapeDashboardHtml(ne.date)}"`;

        sessionWidgetHtml = `
            <article ${cardActionAttrs} role="button" tabindex="0" class="match-detail-card dashboard-next-session-card dashboard-click-card h-full">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-stopwatch"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeDashboardHtml(dateLabel)}</span>
                        ${injuryChipHtml}
                    </div>
                    <div class="match-detail-top-chips">
                        <div class="match-detail-chip match-detail-type-chip" aria-label="${escapeDashboardHtml(eventTypeLabel)}">
                            <i class="fa-solid ${isTraining ? 'fa-stopwatch' : 'fa-calendar-check'}" aria-hidden="true"></i>
                            <span>${escapeDashboardHtml(eventTypeLabel)}</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-session-main relative z-10">
                    <div class="dashboard-session-middle">
                        ${sessionArenaHtml}
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    <div class="match-detail-footer-item" title="${escapeDashboardHtml(locationLabel)}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeDashboardHtml(locationLabel)}</span>
                    </div>
                </div>
            </article>
        `;
    } else if (window.buildHjemSeasonModel()) {
        sessionWidgetHtml = '';
        bottomContainer.classList.add('is-absent');
    } else {
        bottomContainer.classList.remove('is-absent');
        sessionWidgetHtml = `
            <article data-dashboard-action="open-calendar-date" data-event-date="${escapeDashboardHtml(todayStr)}" role="button" tabindex="0" class="match-detail-card dashboard-next-session-card dashboard-click-card hjem-empty-card h-full">
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-calendar-days"></i>
                </div>
                <div class="relative z-10 px-6 py-8 text-center">
                    <div class="match-detail-chip mb-4 mx-auto">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span>Neste økt</span>
                    </div>
                    <h3 class="font-black text-white text-sm">Ingen kommende økter</h3>
                    <p class="text-xs text-white/60 mt-2 max-w-[240px] mx-auto">Legg inn trening eller aktivitet i kalenderen.</p>
                </div>
            </article>
        `;
    }

    if (sessionWidgetHtml) bottomContainer.classList.remove('is-absent');
    bottomContainer.innerHTML = sessionWidgetHtml;
    if (typeof window.renderHjemSeasonSummary === 'function') {
        window.renderHjemSeasonSummary();
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

function hjemSeasonPlayerPhoto(name, playerId) {
    const finder = typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef : null;
    const player = finder ? (finder(playerId) || finder(name)) : null;
    if (typeof window.getPlayerProfilePhotoUrl !== 'function') return '';
    return window.getPlayerProfilePhotoUrl(player) || '';
}

function hjemSeasonOneDecimal(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return '';
    return number.toFixed(1).replace('.', ',');
}

function hjemSeasonBorsScore(stat) {
    return hjemSeasonOneDecimal(stat?.snittBors);
}

function hjemSeasonAward(name, line, score, playerId) {
    return {
        name,
        line,
        score: score || '',
        photo: hjemSeasonPlayerPhoto(name, playerId)
    };
}

function readHjemSeasonAwards(year) {
    if (typeof window.readHallOfFameStore !== 'function') return {};
    const store = window.readHallOfFameStore();
    const yearKey = String(year);
    const team = typeof window.getStatsTeamFilter === 'function' ? window.getStatsTeamFilter() : 'Alle';
    const teamKey = team && team !== 'Alle' ? String(team) : 'Alle';
    const scoped = store[teamKey] && store[teamKey][yearKey];
    if (scoped && typeof scoped === 'object') return scoped;
    const allTeams = store.Alle && store.Alle[yearKey];
    return allTeams && typeof allTeams === 'object' ? allTeams : {};
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

    const awards = readHjemSeasonAwards(year);
    const statRows = typeof window.buildPlayerStatsData === 'function'
        ? window.buildPlayerStatsData({ applyYearFilter: true, yearFilter: year })
        : [];
    const statFor = (winner) => statRows.find(row => winner && row.navn === winner.navn) || null;
    const people = [];
    if (awards.player && awards.player.navn) {
        people.push(hjemSeasonAward(
            awards.player.navn,
            'årets spiller',
            hjemSeasonOneDecimal(statFor(awards.player)?.totalScore),
            awards.player.playerId
        ));
    }
    const sameBors = Boolean(awards.bors?.navn && awards.mal?.navn && awards.bors.navn === awards.mal.navn);
    if (awards.mal && awards.mal.navn) {
        const goals = Number(statFor(awards.mal)?.mal) || 0;
        const goalLabel = goals === 1 ? '1 mål' : `${goals} mål`;
        const borsScore = sameBors ? hjemSeasonBorsScore(statFor(awards.bors)) : '';
        people.push(hjemSeasonAward(
            awards.mal.navn,
            sameBors ? `${goalLabel} og årets børs` : goalLabel,
            borsScore,
            awards.mal.playerId
        ));
    }
    if (awards.bors?.navn && !sameBors) {
        people.push(hjemSeasonAward(
            awards.bors.navn,
            'årets børs',
            hjemSeasonBorsScore(statFor(awards.bors)),
            awards.bors.playerId
        ));
    }
    if (awards.oppmote && awards.oppmote.navn) {
        const stat = statFor(awards.oppmote);
        const attended = Number(stat?.oppmoteSamletAttended) || 0;
        const possible = Number(stat?.oppmoteSamletPossible) || 0;
        const pct = Math.round(Number(stat?.oppmoteSamletPct) || 0);
        const detail = possible > 0 ? `, ${attended} av ${possible}` : '';
        people.push(hjemSeasonAward(
            awards.oppmote.navn,
            `årets hederspris${detail}`,
            pct > 0 ? `${pct}%` : '',
            awards.oppmote.playerId
        ));
    }

    if (!story && !notes && !cup && !matches.length && !people.length) return null;
    return { year, story, notes, cupLead: cup ? cup.lead : '', matches, people };
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
    const peopleRows = model.people.map(person => `
        <article data-dashboard-action="open-player" data-player-name="${escapeDashboardHtml(person.name)}" data-season-year="${year}" role="button" tabindex="0" class="hjem-season-award dashboard-click-card">
            <span class="hjem-season-award-photo" aria-hidden="true">
                ${person.photo
                    ? `<img src="${escapeDashboardHtml(person.photo)}" alt="" loading="lazy" decoding="async">`
                    : '<i class="fa-solid fa-user"></i>'}
            </span>
            <span class="hjem-season-award-copy">
                <span class="hjem-season-award-name">${escapeDashboardHtml(person.name)}</span>
                <span class="hjem-season-award-line">${escapeDashboardHtml(person.line)}</span>
            </span>
            ${person.score ? `<span class="hjem-season-award-score">${escapeDashboardHtml(person.score)}</span>` : ''}
        </article>
    `).join('');

    slot.classList.remove('is-absent');
    slot.innerHTML = `
        <section class="hjem-season" aria-label="Sesong ${year}">
            <article data-dashboard-action="open-statistikk" data-season-year="${year}" role="button" tabindex="0" class="match-detail-card dashboard-next-match-card hjem-season-story dashboard-click-card">
                <div class="dashboard-next-match-watermark" aria-hidden="true">
                    <i class="fa-solid fa-book-open"></i>
                </div>
                <div class="hjem-season-story-body relative z-10">
                    <div class="match-detail-chip">
                        <i class="fa-solid fa-flag" aria-hidden="true"></i>
                        <span>NFF 5.div. avd.2 ${year}</span>
                    </div>
                    ${paragraphs}
                </div>
            </article>
            ${(model.cupLead || matchRows) ? `<div class="match-detail-card dashboard-next-session-card hjem-season-panel">${model.cupLead ? `<div class="hjem-season-cup-body"><div class="match-detail-chip"><i class="fa-solid fa-trophy" aria-hidden="true"></i><span>Obos Cup ${year}</span></div><p class="hjem-season-cup-lead">${escapeDashboardHtml(model.cupLead)}</p></div>` : ''}${matchRows}</div>` : ''}
            ${peopleRows ? `<div class="match-detail-card dashboard-next-session-card hjem-season-panel hjem-season-awards-card"><div class="hjem-season-awards"><div class="match-detail-chip"><i class="fa-solid fa-crown" aria-hidden="true"></i><span>Kåringer</span></div>${peopleRows}</div></div>` : ''}
        </section>
    `;
};
