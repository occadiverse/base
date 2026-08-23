function escapeMatchHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeMatchJsString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function bindMatchListEvents() {
    ['matchListContainer', 'matchListUpcomingContainer', 'matchListPastContainer', 'kampdetaljer-info'].forEach((containerId) => {
        const container = document.getElementById(containerId);
        if (!container || container.dataset.matchEventsBound === 'true') return;

        container.dataset.matchEventsBound = 'true';
        container.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-match-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.matchAction;
            const matchId = actionEl.dataset.matchId;

            if (action === 'edit' || action === 'alert' || action === 'attendance' || action === 'tactics') {
                event.stopPropagation();
            }

            if (action === 'go-back') {
                if (typeof window.goBackToPreviousPortalPage === 'function' && window.goBackToPreviousPortalPage()) {
                    return;
                }
                switchTab('kamper');
                return;
            }

            if (action === 'toggle-past-year') {
                event.stopPropagation();
                togglePastMatchYearGroup(actionEl);
                return;
            }

            if (!matchId) return;

            if (action === 'open-details') {
                if (actionEl.closest('[data-match-panel="motstanderinfo"]')) {
                    window.pendingMatchDetailsOpenPanel = 'motstanderinfo';
                }
                window.showMatchDetails(matchId);
            } else if (action === 'edit') {
                window.openMatchModal(matchId);
            } else if (action === 'alert') {
                window.showMatchAlertModal(matchId);
            } else if (action === 'attendance') {
                window.openAttendanceModal(`match_${matchId}`);
            } else if (action === 'tactics') {
                window.goToMatchTactics(matchId);
            }
        });
        container.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const actionEl = event.target.closest('[data-match-action="open-details"], [data-match-action="go-back"]');
            if (!actionEl) return;

            event.preventDefault();
            const action = actionEl.dataset.matchAction;
            if (action === 'go-back') {
                if (typeof window.goBackToPreviousPortalPage === 'function' && window.goBackToPreviousPortalPage()) {
                    return;
                }
                switchTab('kamper');
                return;
            }

            const matchId = actionEl.dataset.matchId;
            if (matchId) window.showMatchDetails(matchId);
        });
    });
}

function bindMatchStatsEvents() {
    const panel = document.querySelector('#kampdetaljer-info .match-stats-panel');
    if (!panel || panel.dataset.matchStatEventsBound === 'true') return;
    panel.dataset.matchStatEventsBound = 'true';

    panel.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-match-stat-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.matchStatAction;
        if (action === 'bench-toggle') {
            window.toggleBenchOnly(actionEl);
            window.updateMatchStatsResultBar();
        } else if (action === 'yellow-card') {
            window.toggleCard(actionEl, 'yellow');
        } else if (action === 'red-card') {
            window.toggleCard(actionEl, 'red');
        } else if (action === 'motm-toggle') {
            window.toggleMotm(actionEl);
        } else if (action === 'rating-guide-select') {
            const rating = Number(actionEl.dataset.rating);
            if (!Number.isNaN(rating)) window.selectMatchRatingFromGuide(actionEl, rating);
        }
    });

    panel.addEventListener('change', (event) => {
        if (event.target.matches('.player-goals-input, #match-stats-opponent-goals, #match-stats-penalties-enabled, #match-stats-penalty-bsk, #match-stats-penalty-opponent')) {
            window.updateMatchStatsResultBar();
        }
        if (event.target.matches('#match-stats-penalties-enabled')) {
            window.toggleMatchStatsPenaltyFields();
        }

        const select = event.target.closest('[data-match-stat-action="rating-select"]');
        if (select) window.updateMatchRatingHint(select);
    });

    panel.addEventListener('input', (event) => {
        if (event.target.matches('#match-stats-opponent-goals, #match-stats-penalty-bsk, #match-stats-penalty-opponent')) {
            window.updateMatchStatsResultBar();
        }
    });

    panel.addEventListener('focusin', (event) => {
        const select = event.target.closest('[data-match-stat-action="rating-select"]');
        if (select) window.updateMatchRatingHint(select);
    });

    panel.addEventListener('mouseover', (event) => {
        if (event.target.matches('[data-match-stat-action="rating-select"]')) {
            window.updateMatchRatingHint(event.target);
        }
    });
}

const matchRatingGuide = {
    1: {
        label: 'Katastrofalt',
        description: 'Grove feil som førte til baklengs, tidlig rødt kort eller total mangel på innsats'
    },
    2: {
        label: 'Svært svakt',
        description: 'Involvert i baklengsmål, mange feilpasninger og fullstendig utspilt'
    },
    3: {
        label: 'Svakt',
        description: 'Kom aldri inn i kampen. Tapte de fleste dueller og slurvet mye'
    },
    4: {
        label: 'Skuffende',
        description: 'Slet med tempoet og posisjoneringen. Presterte merkbart under sitt vanlige nivå'
    },
    5: {
        label: 'Under par',
        description: 'Prøvde, men fikk det ikke helt til å stemme. Litt for mange feilvalg i dag'
    },
    6: {
        label: 'Godkjent',
        tooltip: 'Godkjent. Gjorde jobben sin, stabil',
        description: 'Stabil og godkjent. Gjorde det som forventes i posisjonen, uten store feil'
    },
    7: {
        label: 'God kamp',
        description: 'God kamp! Flere viktige involveringer, skapte sjanser eller holdt tett bakover'
    },
    8: {
        label: 'Banens beste-kandidat',
        tooltip: 'Dominerende i banespillet og leverte avgjørende målpoeng/scoringer/redninger',
        description: 'Dominerende i banespillet og leverte avgjørende målpoeng/scoringer/redninger'
    },
    9: {
        label: 'Særdeles god',
        description: 'Helt outstanding. Hevet lagkameratene, gjorde knapt feil og herjet med motstanderen'
    },
    10: {
        label: 'Perfekt matchvinner',
        description: 'Perfekt og historisk! Avgjorde kampen på egen hånd (f.eks. hat-trick eller total defensiv mur)'
    }
};

function getMatchRatingGuideEntry(value) {
    return matchRatingGuide[Number(value)] || null;
}

function formatMatchRatingHint(value) {
    const entry = getMatchRatingGuideEntry(value);
    if (!entry) return 'Ingen børs satt ennå';

    return `${Number(value)}: ${entry.description}`;
}

function buildMatchRatingTooltipHtml(selectedRating) {
    return `
        <div class="match-rating-tooltip" role="tooltip">
            <div class="match-rating-tooltip-title">Spillerbørs</div>
            <div class="match-rating-tooltip-list">
                ${[1,2,3,4,5,6,7,8,9,10].map(value => {
                    const entry = getMatchRatingGuideEntry(value);
                    const tooltipText = entry.tooltip || `${entry.label}. ${entry.description}`;
                    return `
                        <button
                            type="button"
                            class="match-rating-tooltip-row ${Number(selectedRating) === value ? 'is-selected' : ''}"
                            data-match-stat-action="rating-guide-select"
                            data-rating="${value}"
                            title="${escapeMatchHtml(tooltipText)}"
                        >
                            <span class="match-rating-tooltip-score">${value}</span>
                            <span class="match-rating-tooltip-copy">
                                <strong>${escapeMatchHtml(entry.label)}</strong>
                                <span>${escapeMatchHtml(tooltipText)}</span>
                            </span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderMatchTeamHtml(team) {
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
            <span class="match-detail-team-name">${escapeMatchHtml(team.name)}</span>
        </div>
    `;
}

function getMatchFixturePresentation(match) {
    const dateValue = new Date(match.date);
    const hasDate = !Number.isNaN(dateValue.getTime());
    const day = hasDate ? dateValue.toLocaleDateString('no-NO', { day: '2-digit' }) : '--';
    const month = hasDate
        ? dateValue.toLocaleDateString('no-NO', { month: 'short' }).replace('.', '').toUpperCase()
        : '---';
    const weekday = hasDate
        ? dateValue.toLocaleDateString('no-NO', { weekday: 'short' }).replace('.', '')
        : '';
    const monthKey = hasDate
        ? dateValue.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' })
        : 'Ukjent dato';
    const monthLabel = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    const monthNameKey = hasDate
        ? dateValue.toLocaleDateString('no-NO', { month: 'long' })
        : 'Ukjent dato';
    const monthNameLabel = monthNameKey.charAt(0).toUpperCase() + monthNameKey.slice(1);
    const parsedScore = typeof window.getMatchRegularScore === 'function'
        ? window.getMatchRegularScore(match)
        : (match.result ? parseScore(match.result) : null);
    const displayedResult = match.result
        ? (typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(match)
            : match.result)
        : '-';

    const resultTone = typeof window.getMatchResultTone === 'function'
        ? window.getMatchResultTone(match)
        : (() => {
            if (!parsedScore) return '';
            if (parsedScore.bsk > parsedScore.opponent) return 'is-win';
            if (parsedScore.bsk === parsedScore.opponent) return 'is-draw';
            return 'is-loss';
        })();

    const metaParts = [];
    if (match.matchType) metaParts.push(match.matchType);
    if (match.pitch) metaParts.push(match.pitch);

    return {
        day,
        month,
        weekday,
        monthLabel,
        monthNameLabel,
        meta: metaParts.join(' · '),
        displayedResult,
        resultTone
    };
}

function groupMatchesByMonth(matches, options = {}) {
    const includeYear = options.includeYear !== false;
    const groups = [];

    matches.forEach(match => {
        const presentation = getMatchFixturePresentation(match);
        const monthLabel = includeYear ? presentation.monthLabel : presentation.monthNameLabel;

        if (!groups.length || groups[groups.length - 1].monthLabel !== monthLabel) {
            groups.push({ monthLabel, matches: [] });
        }

        groups[groups.length - 1].matches.push(match);
    });

    return groups;
}

function getMatchListYear(match) {
    const dateValue = new Date(match?.date);
    if (Number.isNaN(dateValue.getTime())) return null;
    return dateValue.getFullYear();
}

function partitionPastMatchesForArchive(matches) {
    const currentYear = new Date().getFullYear();
    const currentYearMatches = [];
    const olderByYear = new Map();

    matches.forEach(match => {
        const year = getMatchListYear(match);
        if (year == null || year >= currentYear) {
            currentYearMatches.push(match);
            return;
        }
        if (!olderByYear.has(year)) olderByYear.set(year, []);
        olderByYear.get(year).push(match);
    });

    const olderYears = [...olderByYear.keys()]
        .sort((a, b) => b - a)
        .map(year => ({ year, matches: olderByYear.get(year) }));

    return { currentYearMatches, olderYears };
}

function isPastMatchYearOpen(year) {
    return Boolean((window.openPastMatchYears || {})[String(year)]);
}

function togglePastMatchYearGroup(actionEl) {
    const year = actionEl?.dataset.matchYear;
    if (!year) return;

    const groups = document.querySelectorAll(`.match-fixture-year-group[data-match-year="${CSS.escape(String(year))}"]`);
    const nextOpen = actionEl.closest('.match-fixture-year-group')?.classList.contains('is-collapsed') ?? true;

    window.openPastMatchYears = window.openPastMatchYears || {};
    if (nextOpen) window.openPastMatchYears[year] = true;
    else delete window.openPastMatchYears[year];

    groups.forEach(group => {
        group.classList.toggle('is-collapsed', !nextOpen);
        const toggle = group.querySelector('[data-match-action="toggle-past-year"]');
        if (!toggle) return;
        toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        toggle.setAttribute(
            'aria-label',
            nextOpen
                ? (toggle.dataset.hideLabel || `Skjul kamper fra ${year}`)
                : (toggle.dataset.showLabel || `Vis kamper fra ${year}`)
        );
    });
}

function buildMatchFixtureGroupsHtml(matches, options = {}) {
    const { isUpcoming = true, includeYearInMonthLabel = true } = options;
    return groupMatchesByMonth(matches, { includeYear: includeYearInMonthLabel }).map(group => `
        <section class="match-fixture-group">
            <header class="match-fixture-month">${escapeMatchHtml(group.monthLabel)}</header>
            <div class="match-fixture-group-rows">
                ${group.matches.map(match => buildMatchFixtureRowHtml(match, { isUpcoming })).join('')}
            </div>
        </section>
    `).join('');
}

function buildPastYearArchiveHtml(yearGroup) {
    const year = yearGroup.year;
    const isOpen = isPastMatchYearOpen(year);
    const count = yearGroup.matches.length;
    const showLabel = `Vis kamper fra ${year}`;
    const hideLabel = `Skjul kamper fra ${year}`;

    return `
        <section class="match-fixture-year-group ${isOpen ? '' : 'is-collapsed'}" data-match-year="${year}">
            <button
                type="button"
                class="match-fixture-year-toggle"
                data-match-action="toggle-past-year"
                data-match-year="${year}"
                aria-expanded="${isOpen ? 'true' : 'false'}"
                aria-label="${isOpen ? hideLabel : showLabel}"
                data-show-label="${showLabel}"
                data-hide-label="${hideLabel}"
            >
                <span class="match-fixture-year-label">${year}</span>
                <span class="match-fixture-year-count">${count}</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="match-fixture-year-content">
                ${buildMatchFixtureGroupsHtml(yearGroup.matches, { isUpcoming: false, includeYearInMonthLabel: false })}
            </div>
        </section>
    `;
}

function applyFilters() {
    bindMatchListEvents();

    const listContainer = document.getElementById('matchListContainer');
    const upcomingContainer = document.getElementById('matchListUpcomingContainer');
    const pastContainer = document.getElementById('matchListPastContainer');
    const noMatchesView = document.getElementById('no-matches-view');
    if (!listContainer && !upcomingContainer && !pastContainer) return;

    if (listContainer) listContainer.innerHTML = '';
    if (upcomingContainer) upcomingContainer.innerHTML = '';
    if (pastContainer) pastContainer.innerHTML = '';

    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    const currentTimeFilter = window.activeTimeFilter || 'kommende';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const datedMatches = matches.filter(m => Boolean(m.date));

    const upcomingMatches = datedMatches
        .filter(m => {
            const matchDate = new Date(m.date);
            matchDate.setHours(0, 0, 0, 0);
            return matchDate >= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const pastMatches = datedMatches
        .filter(m => {
            const matchDate = new Date(m.date);
            matchDate.setHours(0, 0, 0, 0);
            return matchDate < today;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    const filtered = currentTimeFilter === 'kommende' ? upcomingMatches : pastMatches;
    const sortedMatches = [...filtered].sort((a, b) =>
        currentTimeFilter === 'kommende' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
    );

    updateMatchListCount('matchListUpcomingCount', upcomingMatches.length);
    updateMatchListCount('matchListPastCount', pastMatches.length);
    updateMatchListCount('matchListMobileCount', sortedMatches.length);

    renderMatchListIntoContainer(upcomingContainer, upcomingMatches, {
        isUpcoming: true,
        emptyTitle: 'Ingen kommende kamper',
        emptyText: 'Når en ny kamp legges inn, vises den her.'
    });
    renderMatchListIntoContainer(pastContainer, pastMatches, {
        isUpcoming: false,
        archiveOlderYears: true,
        emptyTitle: 'Ingen tidligere kamper',
        emptyText: 'Resultater dukker opp her etter hvert som kampene er spilt.'
    });

    const isUpcoming = currentTimeFilter === 'kommende';
    renderMatchListIntoContainer(listContainer, sortedMatches, {
        isUpcoming,
        archiveOlderYears: !isUpcoming,
        showEmpty: false
    });

    if (noMatchesView) noMatchesView.classList.toggle('hidden', sortedMatches.length > 0);
}

function updateMatchListCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (element.classList.contains('match-list-count-badge')) {
        element.textContent = String(count);
        element.setAttribute('aria-label', count === 1 ? '1 kamp' : `${count} kamper`);
        return;
    }

    element.textContent = count === 1 ? '1 kamp' : `${count} kamper`;
}

function renderMatchListIntoContainer(container, matches, options = {}) {
    if (!container) return;

    const {
        isUpcoming = true,
        showEmpty = true,
        archiveOlderYears = false,
        emptyTitle = 'Ingen kamper funnet',
        emptyText = 'Du kan registrere en ny kamp ved å trykke på plussknappen eller i Admin-panelet.'
    } = options;

    if (!matches.length) {
        container.innerHTML = showEmpty
            ? buildMatchListEmptyHtml(emptyTitle, emptyText)
            : '';
        return;
    }

    if (archiveOlderYears) {
        const { currentYearMatches, olderYears } = partitionPastMatchesForArchive(matches);
        const currentHtml = currentYearMatches.length
            ? buildMatchFixtureGroupsHtml(currentYearMatches, { isUpcoming: false, includeYearInMonthLabel: true })
            : '';
        const archiveHtml = olderYears.map(yearGroup => buildPastYearArchiveHtml(yearGroup)).join('');
        container.innerHTML = `${currentHtml}${archiveHtml}`;
        return;
    }

    container.innerHTML = buildMatchFixtureGroupsHtml(matches, { isUpcoming, includeYearInMonthLabel: true });
}

function normalizeOpponentName(name) {
    return String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'o')
        .replace(/å/g, 'a')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getMatchTimestamp(match) {
    const date = String(match?.date || '').trim();
    if (!date) return 0;
    const time = String(match?.time || '00:00').trim() || '00:00';
    const timestamp = new Date(`${date}T${time}`).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getMatchesAgainstOpponent(currentMatch, { includeCurrent = false, playedOnly = false } = {}) {
    const opponentKey = normalizeOpponentName(currentMatch?.opponent);
    if (!opponentKey) return [];

    const currentGroup = currentMatch?.matchGroup || '';

    return (window.activeMatches || [])
        .filter(match => {
            if (!match) return false;
            if (!includeCurrent && match.id === currentMatch.id) return false;
            if (normalizeOpponentName(match.opponent) !== opponentKey) return false;
            if (currentGroup && match.matchGroup && match.matchGroup !== currentGroup) return false;
            if (playedOnly) return Boolean(parseScore(match.result));
            return true;
        })
        .sort((a, b) => getMatchTimestamp(b) - getMatchTimestamp(a));
}

function getOpponentRecordMatches(currentMatch) {
    return getMatchesAgainstOpponent(currentMatch, { includeCurrent: true, playedOnly: true });
}

function getOpponentHistoryRecord(matches) {
    return matches.reduce((record, match) => {
        const regularScore = typeof window.getMatchRegularScore === 'function'
            ? window.getMatchRegularScore(match)
            : (match.result ? parseScore(match.result) : null);
        const outcomeScore = typeof window.getMatchOutcomeScore === 'function'
            ? window.getMatchOutcomeScore(match)
            : regularScore;
        if (!regularScore || !outcomeScore) {
            record.unknown += 1;
            return record;
        }
        record.goalsFor += regularScore.bsk;
        record.goalsAgainst += regularScore.opponent;
        if (outcomeScore.bsk > outcomeScore.opponent) record.wins += 1;
        else if (outcomeScore.bsk === outcomeScore.opponent) record.draws += 1;
        else record.losses += 1;
        return record;
    }, { wins: 0, draws: 0, losses: 0, unknown: 0, goalsFor: 0, goalsAgainst: 0 });
}

function buildMatchOpponentHistoryRowHtml(match, currentMatchId) {
    const data = getMatchFixturePresentation(match);
    const venue = getMatchVenue(match);
    const venueLabel = venue === 'Hjemme' ? 'Hjemme' : 'Borte';
    const parsedScore = typeof window.getMatchRegularScore === 'function'
        ? window.getMatchRegularScore(match)
        : (match.result ? parseScore(match.result) : null);
    const resultLabel = parsedScore
        ? (typeof window.formatMatchResultForDisplay === 'function'
            ? window.formatMatchResultForDisplay(match)
            : `${parsedScore.bsk}-${parsedScore.opponent}`)
        : (match.result || 'Ikke spilt');
    const year = Number.isNaN(new Date(match.date).getTime())
        ? ''
        : new Date(match.date).getFullYear();
    const isCurrent = match.id === currentMatchId;
    const clickAttrs = `data-match-action="open-details" data-match-id="${escapeMatchHtml(match.id)}" role="button" tabindex="0"`;
    const whereParts = [venueLabel, match.pitch].filter(Boolean);
    const metaParts = [match.matchType, isCurrent ? 'Denne kampen' : ''].filter(Boolean);

    return `
        <article class="match-fixture-row dashboard-click-card ${data.resultTone}${isCurrent ? ' is-current' : ''}" ${clickAttrs}>
            <div class="match-fixture-date" aria-hidden="true">
                <span class="match-fixture-date-day">${escapeMatchHtml(data.day)}</span>
                <span class="match-fixture-date-month">${escapeMatchHtml(data.month)}</span>
            </div>

            <div class="match-fixture-main">
                <span class="match-fixture-weekday">${escapeMatchHtml([data.weekday, year].filter(Boolean).join(' · '))}</span>
                <span class="match-fixture-opponent">${escapeMatchHtml(whereParts.join(' · ') || 'Sted ikke satt')}</span>
                ${metaParts.length ? `<span class="match-fixture-meta">${escapeMatchHtml(metaParts.join(' · '))}</span>` : ''}
            </div>

            <div class="match-fixture-side">
                <span class="match-fixture-side-value">${escapeMatchHtml(resultLabel)}</span>
            </div>

            <div class="match-fixture-chevron" aria-hidden="true">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        </article>
    `;
}

function buildMatchOpponentInfoBodyHtml(match) {
    const opponentMatches = getMatchesAgainstOpponent(match, { includeCurrent: true });
    const record = getOpponentHistoryRecord(getOpponentRecordMatches(match));
    const opponentName = match.opponent || 'motstanderen';

    if (!opponentMatches.length) {
        return `
            <div class="match-opponent-info-empty">
                <i class="fa-solid fa-shield" aria-hidden="true"></i>
                <p>Ingen kamper mot ${escapeMatchHtml(opponentName)}.</p>
            </div>
        `;
    }

    return `
        <div class="match-opponent-info-record" aria-label="${record.wins} seire, ${record.draws} uavgjort, ${record.losses} tap, ${record.goalsFor}-${record.goalsAgainst} i mål totalt">
            <div class="match-opponent-info-record-item is-win">
                <strong>${record.wins}</strong>
                <span>Seire</span>
            </div>
            <div class="match-opponent-info-record-item is-draw">
                <strong>${record.draws}</strong>
                <span>Uavgjort</span>
            </div>
            <div class="match-opponent-info-record-item is-loss">
                <strong>${record.losses}</strong>
                <span>Tap</span>
            </div>
            <div class="match-opponent-info-record-item is-goals">
                <strong>
                    <span class="match-opponent-info-goals-for">${record.goalsFor}</span><span class="match-opponent-info-goals-sep">-</span><span class="match-opponent-info-goals-against">${record.goalsAgainst}</span>
                </strong>
                <span>Mål</span>
            </div>
        </div>
        <div class="match-opponent-info-list">
            ${opponentMatches.map(item => buildMatchOpponentHistoryRowHtml(item, match.id)).join('')}
        </div>
    `;
}

function buildMatchListEmptyHtml(title, text) {
    return `
        <div class="match-list-empty match-list-column-empty">
            <div class="match-list-empty-icon">
                <i class="fa-solid fa-futbol"></i>
            </div>
            <p class="match-list-empty-title">${escapeMatchHtml(title)}</p>
            <p class="match-list-empty-text">${escapeMatchHtml(text)}</p>
        </div>
    `;
}

function buildMatchFixtureRowHtml(match, options = {}) {
    const { isUpcoming = true } = options;
    const data = getMatchFixturePresentation(match);
    const opponentLogoHtml = typeof window.buildClubLogoImgHtml === 'function'
        ? window.buildClubLogoImgHtml(match.opponent, 'match-fixture-opponent-logo')
        : '';
    const opponentMarkHtml = opponentLogoHtml || `
        <span class="match-fixture-opponent-logo match-fixture-opponent-fallback" aria-hidden="true">
            <i class="fa-solid fa-shield"></i>
        </span>
    `;
    const clickAttrs = `data-match-action="open-details" data-match-id="${escapeMatchHtml(match.id)}" role="button" tabindex="0"`;
    const sideValue = isUpcoming
        ? (match.time || '--:--')
        : data.displayedResult;
    const sideLabel = isUpcoming ? 'Avspark' : '';

    return `
        <article class="match-fixture-row dashboard-click-card ${data.resultTone}" ${clickAttrs}>
            <div class="match-fixture-date" aria-hidden="true">
                <span class="match-fixture-date-day">${escapeMatchHtml(data.day)}</span>
                <span class="match-fixture-date-month">${escapeMatchHtml(data.month)}</span>
            </div>

            <div class="match-fixture-main">
                <span class="match-fixture-weekday">${escapeMatchHtml(data.weekday)}</span>
                <span class="match-fixture-opponent-line">
                    ${opponentMarkHtml}
                    <span class="match-fixture-opponent">${escapeMatchHtml(match.opponent)}</span>
                </span>
                ${data.meta ? `<span class="match-fixture-meta">${escapeMatchHtml(data.meta)}</span>` : ''}
            </div>

            <div class="match-fixture-side">
                <span class="match-fixture-side-value">${escapeMatchHtml(sideValue)}</span>
                ${sideLabel ? `<span class="match-fixture-side-label">${sideLabel}</span>` : ''}
            </div>

            <div class="match-fixture-chevron" aria-hidden="true">
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        </article>
    `;
}

function getMatchCardPresentation(match) {
    const dateValue = new Date(match.date);
    const dateFormatted = Number.isNaN(dateValue.getTime())
        ? 'Dato ikke satt'
        : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
    const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    const matchTypeLabel = match.matchType || 'Kamp';
    const venue = getMatchVenue(match);
    const parsedScore = typeof window.getMatchRegularScore === 'function'
        ? window.getMatchRegularScore(match)
        : (match.result ? parseScore(match.result) : null);
    const centerValue = match.result
        ? formatMatchResultForDisplay(match)
        : (match.time || '--:--');
    const centerLabel = match.result
        ? (match.penaltyResult
            ? 'Etter straffespark'
            : (match.time ? `Kl. ${match.time}` : 'Sluttresultat'))
        : 'Kampstart';
    const durationLabel = match.duration || '90 min';
    const attendanceStats = typeof window.getAttendancePresenceStats === 'function'
        ? window.getAttendancePresenceStats(match)
        : { presentCount: 0, squadSize: 0, isRegistered: false };
    const attendanceLabel = typeof window.formatAttendancePresenceLabel === 'function'
        ? window.formatAttendancePresenceLabel(match)
        : '';

    let resultTone = typeof window.getMatchResultTone === 'function'
        ? window.getMatchResultTone(match)
        : '';

    if (!resultTone && parsedScore) {
        if (parsedScore.bsk > parsedScore.opponent) resultTone = 'is-win';
        else if (parsedScore.bsk === parsedScore.opponent) resultTone = 'is-draw';
        else resultTone = 'is-loss';
    }

    return {
        dateLabel,
        matchTypeLabel,
        centerValue,
        centerLabel,
        durationLabel,
        attendingCount: attendanceStats.presentCount,
        attendanceLabel,
        attendanceStats,
        resultTone
    };
}

function getMatchScoreParts(match) {
    const parsed = match?.result ? parseScore(match.result) : null;
    return {
        bsk: parsed ? parsed.bsk : 0,
        opponent: parsed ? parsed.opponent : 0
    };
}

function buildMatchResultString(bskGoals, opponentGoals) {
    const bsk = Math.max(0, Number(bskGoals) || 0);
    const opponent = Math.max(0, Number(opponentGoals) || 0);
    return `${bsk}-${opponent}`;
}

function collectMatchStatsBenchOnlyFromForm() {
    const benchOnly = {};
    document.querySelectorAll('.player-bench-btn').forEach(btn => {
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(btn));
        if (!playerKey) return;
        benchOnly[playerKey] = btn.getAttribute('data-active') === 'true';
    });
    return benchOnly;
}

function getMatchBskGoalsFromStatsForm() {
    const benchOnly = collectMatchStatsBenchOnlyFromForm();
    let total = 0;
    document.querySelectorAll('.player-goals-input').forEach(input => {
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(input));
        if (!playerKey || benchOnly[playerKey] === true) return;
        total += parseInt(input.value, 10) || 0;
    });
    return total;
}

function getMatchStatsOpponentGoalsFromForm(match) {
    const input = document.getElementById('match-stats-opponent-goals');
    if (input) {
        const val = parseInt(input.value, 10);
        if (!Number.isNaN(val) && val >= 0) return val;
    }
    return getMatchScoreParts(match).opponent;
}

function getMatchPenaltyScoreParts(match) {
    const parsed = match?.penaltyResult ? parseScore(match.penaltyResult) : null;
    return {
        bsk: parsed ? parsed.bsk : 0,
        opponent: parsed ? parsed.opponent : 0
    };
}

function getPenaltyResultFromStatsForm() {
    const enabled = document.getElementById('match-stats-penalties-enabled')?.checked;
    if (!enabled) return '';

    const bsk = parseInt(document.getElementById('match-stats-penalty-bsk')?.value, 10);
    const opponent = parseInt(document.getElementById('match-stats-penalty-opponent')?.value, 10);
    if (Number.isNaN(bsk) || Number.isNaN(opponent) || bsk < 0 || opponent < 0) return '';
    if (bsk === 0 && opponent === 0) return '';
    return buildMatchResultString(bsk, opponent);
}

window.toggleMatchStatsPenaltyFields = function() {
    const enabled = document.getElementById('match-stats-penalties-enabled')?.checked;
    const scores = document.getElementById('match-stats-penalty-scores');
    if (scores) scores.hidden = !enabled;
};

function buildMatchStatsResultBarHtml(match) {
    const scoreParts = getMatchScoreParts(match);
    const penaltyParts = getMatchPenaltyScoreParts(match);
    const storedScorerSum = Object.values(match?.scorers || {}).reduce((sum, goals) => sum + (Number(goals) || 0), 0);
    const bskGoals = storedScorerSum || scoreParts.bsk;
    const opponentName = (match?.opponent || '').trim() || 'Motstander';
    const opponentLabel = escapeMatchHtml(opponentName);
    const isCupMatch = match?.matchType === 'Cup';
    const penaltiesEnabled = Boolean(match?.penaltyResult);
    const regularHeading = isCupMatch ? 'Sluttresultat' : 'Kampresultat';

    const penaltySectionHtml = isCupMatch
        ? `
            <div class="match-stats-penalty-section">
                <label class="match-stats-penalty-toggle">
                    <input
                        type="checkbox"
                        id="match-stats-penalties-enabled"
                        ${penaltiesEnabled ? 'checked' : ''}
                        onchange="window.toggleMatchStatsPenaltyFields()"
                    >
                    <span>Avgjort på straffespark</span>
                </label>
                <div class="match-stats-penalty-scores" id="match-stats-penalty-scores" ${penaltiesEnabled ? '' : 'hidden'}>
                    <p class="match-stats-result-heading">Straffespark</p>
                    <div class="match-stats-result-scoreline">
                        <span class="match-stats-result-team">BSK</span>
                        <span class="match-stats-result-dash" aria-hidden="true">-</span>
                        <label class="match-stats-result-team" for="match-stats-penalty-opponent" title="${opponentLabel}">${opponentLabel}</label>
                        <input
                            type="number"
                            id="match-stats-penalty-bsk"
                            class="match-stats-result-score match-stats-result-input"
                            min="0"
                            max="99"
                            inputmode="numeric"
                            value="${penaltyParts.bsk}"
                            aria-label="BSK straffemål"
                        >
                        <input
                            type="number"
                            id="match-stats-penalty-opponent"
                            class="match-stats-result-score match-stats-result-input"
                            min="0"
                            max="99"
                            inputmode="numeric"
                            value="${penaltyParts.opponent}"
                            aria-label="${opponentLabel} straffemål"
                        >
                    </div>
                    <p class="match-stats-result-hint">I Obos cup avgjøres uavgjort direkte på straffespark</p>
                </div>
            </div>
        `
        : '';

    return `
        <div class="match-stats-result-bar" aria-label="Kampresultat">
            <div class="match-stats-result-board">
                <p class="match-stats-result-heading">${regularHeading}</p>
                <div class="match-stats-result-scoreline">
                    <span class="match-stats-result-team">BSK</span>
                    <span class="match-stats-result-dash" aria-hidden="true">-</span>
                    <label class="match-stats-result-team" for="match-stats-opponent-goals" title="${opponentLabel}">${opponentLabel}</label>
                    <output id="match-stats-bsk-goals" class="match-stats-result-score" aria-live="polite">${bskGoals}</output>
                    <input
                        type="number"
                        id="match-stats-opponent-goals"
                        class="match-stats-result-score match-stats-result-input"
                        min="0"
                        max="99"
                        inputmode="numeric"
                        value="${scoreParts.opponent}"
                        aria-label="${opponentLabel} mål"
                    >
                </div>
                <p class="match-stats-result-hint">BSK-tall summeres fra spillermål</p>
                ${penaltySectionHtml}
            </div>
        </div>
    `;
}

window.updateMatchStatsResultBar = function() {
    const match = (window.activeMatches || []).find(m => m.id === activeDetailsId);
    if (!match) return;

    const bskGoals = getMatchBskGoalsFromStatsForm();
    const bskOutput = document.getElementById('match-stats-bsk-goals');

    if (bskOutput) bskOutput.textContent = String(bskGoals);
};

function syncMatchDetailCardResult(match) {
    const center = document.querySelector('#kampdetaljer-info .match-detail-center');
    if (!center) return;

    const data = getMatchCardPresentation(match);
    const timeEl = center.querySelector('.match-detail-time');
    const subEl = center.querySelector('.match-detail-sub');
    if (timeEl) timeEl.textContent = data.centerValue;
    if (subEl) subEl.textContent = data.centerLabel;
}

function buildMatchDetailCardHtml(match, options = {}) {
    const {
        extraClass = '',
        clickable = false,
        backOnClick = false,
        showWatermark = false,
        showAttendance = false,
        bottomContentHtml = ''
    } = options;
    const data = getMatchCardPresentation(match);
    const sides = getMatchCardSides(match);
    const cardClasses = [
        'match-detail-card',
        extraClass,
        data.resultTone,
        (clickable || backOnClick) ? 'dashboard-click-card' : ''
    ].filter(Boolean).join(' ');
    const watermarkHtml = showWatermark
        ? `<div class="dashboard-next-match-watermark"><i class="fa-solid fa-shield-halved"></i></div>`
        : '';
    const matchAlerts = typeof window.buildMatchAlertData === 'function' ? window.buildMatchAlertData(match) : [];
    const alertChipHtml = matchAlerts.length > 0
        ? `
            <button type="button"
                    data-match-action="alert"
                    data-match-id="${escapeMatchHtml(match.id)}"
                    class="bsk-btn bsk-btn-chip bsk-btn-danger dashboard-alert-chip"
                    title="Vis varsel for denne kampen">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>Varsel</span>
            </button>
        `
        : '';
    const footerAttendanceHtml = showAttendance && data.attendanceLabel
        ? `<div class="match-detail-footer-item">
                <i class="fa-solid fa-user-check"></i>
                <span>${escapeMatchHtml(data.attendanceLabel)}</span>
           </div>`
        : '';
    const clickAttrs = clickable
        ? `data-match-action="open-details" data-match-id="${escapeMatchHtml(match.id)}" role="button" tabindex="0"`
        : backOnClick
            ? 'data-match-action="go-back" role="button" tabindex="0" title="Tilbake" aria-label="Tilbake til forrige side"'
            : '';
    return `
        <article class="${cardClasses}" ${clickAttrs}>
            ${watermarkHtml}
            <div class="match-detail-card-top relative z-10">
                <div class="match-detail-meta">
                    <i class="fa-regular fa-calendar-days"></i>
                    <span>${escapeMatchHtml(data.dateLabel)}</span>
                    ${alertChipHtml}
                </div>
                <div class="match-detail-chip">
                    <i class="fa-solid fa-futbol"></i>
                    <span>${escapeMatchHtml(data.matchTypeLabel)}</span>
                </div>
            </div>

            <div class="match-detail-main relative z-10">
                ${renderMatchTeamHtml(sides.left)}

                <div class="match-detail-center">
                    <span class="match-detail-time">${escapeMatchHtml(data.centerValue)}</span>
                    <span class="match-detail-sub">${escapeMatchHtml(data.centerLabel)}</span>
                </div>

                ${renderMatchTeamHtml(sides.right)}
            </div>

            ${bottomContentHtml}

            <div class="match-detail-footer relative z-10">
                <div class="match-detail-footer-item" title="${escapeMatchHtml(match.pitch || 'Ikke fastsatt')}">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${escapeMatchHtml(match.pitch || 'Ikke fastsatt')}</span>
                </div>
                ${footerAttendanceHtml}
                <div class="match-detail-footer-item">
                    <i class="fa-regular fa-clock"></i>
                    <span>${escapeMatchHtml(data.durationLabel)}</span>
                </div>
            </div>
        </article>
    `;
}

const matchGamePlanTabs = [
    { id: 'offc', label: 'OffC' },
    { id: 'defc', label: 'DefC' },
    { id: 'roller', label: 'Roller' },
    { id: 'bench', label: 'Bytteplan' }
];

const matchGamePlanStarterPositions = {
    GK: { top: '94%', left: '50%' },
    VMS: { top: '95%', left: '34%' },
    HMS: { top: '95%', left: '66%' },
    VB: { top: '85%', left: '16%' },
    HB: { top: '85%', left: '84%' },
    DM: { top: '80%', left: '63%' },
    OM: { top: '80%', left: '37%' },
    PM: { top: '55%', left: '60%' },
    VK: { top: '50%', left: '5%' },
    HK: { top: '50%', left: '95%' },
    SP: { top: '50%', left: '40%' }
};

const matchGamePlanStarterPositionIds = Object.keys(matchGamePlanStarterPositions);

const matchGamePlanFormations = {
    '4-2-4': {
        label: '4-2-4',
        positions: {
            GK: { top: '95%', left: '50%', label: 'Keeper' },
            VB: { top: '71%', left: '17%', label: 'Venstre bekk' },
            VMS: { top: '71%', left: '39%', label: 'Venstre stopper' },
            HMS: { top: '71%', left: '61%', label: 'Høyre stopper' },
            HB: { top: '71%', left: '83%', label: 'Høyre bekk' },
            DM: { top: '50%', left: '61%', label: 'Def midtbane' },
            PM: { top: '29%', left: '61%', label: 'Playmaker' },
            VK: { top: '29%', left: '17%', label: 'Venstre kant' },
            OM: { top: '50%', left: '39%', label: 'Off midtbane' },
            SP: { top: '29%', left: '39%', label: 'Spiss' },
            HK: { top: '29%', left: '83%', label: 'Høyre kant' }
        }
    },
    '4-3-3': {
        label: '4-3-3',
        positions: {
            GK: { top: '95%', left: '50%', label: 'Keeper' },
            VB: { top: '71%', left: '17%', label: 'Venstre bekk' },
            VMS: { top: '71%', left: '39%', label: 'Venstre stopper' },
            HMS: { top: '71%', left: '61%', label: 'Høyre stopper' },
            HB: { top: '71%', left: '83%', label: 'Høyre bekk' },
            DM: { top: '50%', left: '50%', label: 'Def midtbane' },
            OM: { top: '50%', left: '28%', label: 'Off midtbane' },
            PM: { top: '50%', left: '72%', label: 'Playmaker' },
            VK: { top: '29%', left: '28%', label: 'Venstre kant' },
            SP: { top: '29%', left: '50%', label: 'Spiss' },
            HK: { top: '29%', left: '72%', label: 'Høyre kant' }
        }
    },
    '4-2-3-1': {
        label: '4-2-3-1',
        positions: {
            GK: { top: '95%', left: '50%', label: 'Keeper' },
            VB: { top: '71%', left: '17%', label: 'Venstre bekk' },
            VMS: { top: '71%', left: '39%', label: 'Venstre stopper' },
            HMS: { top: '71%', left: '61%', label: 'Høyre stopper' },
            HB: { top: '71%', left: '83%', label: 'Høyre bekk' },
            DM: { top: '50%', left: '61%', label: 'Def midtbane' },
            PM: { top: '29%', left: '50%', label: 'Playmaker' },
            VK: { top: '29%', left: '28%', label: 'Venstre kant' },
            OM: { top: '50%', left: '39%', label: 'Off midtbane' },
            HK: { top: '29%', left: '72%', label: 'Høyre kant' },
            SP: { top: '8%', left: '50%', label: 'Spiss' }
        }
    },
    '4-5-1': {
        label: '4-5-1',
        positions: {
            GK: { top: '95%', left: '50%', label: 'Keeper' },
            VB: { top: '71%', left: '17%', label: 'Venstre bekk' },
            VMS: { top: '71%', left: '39%', label: 'Venstre stopper' },
            HMS: { top: '71%', left: '61%', label: 'Høyre stopper' },
            HB: { top: '71%', left: '83%', label: 'Høyre bekk' },
            VK: { top: '50%', left: '10%', label: 'Venstre kant' },
            DM: { top: '50%', left: '50%', label: 'Def midtbane' },
            OM: { top: '50%', left: '28%', label: 'Off midtbane' },
            PM: { top: '50%', left: '72%', label: 'Playmaker' },
            HK: { top: '50%', left: '90%', label: 'Høyre kant' },
            SP: { top: '29%', left: '50%', label: 'Spiss' }
        }
    }
};

const matchGamePlanLineupOverlayOptions = [
    { id: 'bidrag', label: 'Bidrag' },
    { id: 'startBenk', label: 'Start/benk' },
    { id: 'form', label: 'Form' }
];

const matchGamePlanSamspillZoneOptions = [
    { id: 'av', label: 'Av' },
    { id: 'alle', label: 'Alle' },
    { id: 'forsvar', label: 'Forsvar' },
    { id: 'midtbane', label: 'Midtbane' },
    { id: 'angrep', label: 'Angrep' },
    { id: 'venstre', label: 'Venstre' },
    { id: 'sentral', label: 'Sentral' },
    { id: 'hoyre', label: 'Høyre' }
];

// OffC corner diagram. top/left are percentages of the pitch: top moves down, left moves right.
const matchGamePlanOffCPositions = {
    1: { top: '3%', left: '95%', tone: 'neutral' },
    2: { top: '7%', left: '58%', tone: 'green' },
    3: { top: '7%', left: '50%', tone: 'green' },
    4: { top: '7%', left: '42%', tone: 'green' },
    5: { top: '3%', left: '63%', tone: 'green' },
    6: { top: '20%', left: '71%', tone: 'yellow' },
    7: { top: '12%', left: '50%', tone: 'yellow' },
    8: { top: '20%', left: '29%', tone: 'yellow' },
    9: { top: '30%', left: '50%', tone: 'pink' },
    10: { top: '44%', left: '50%', tone: 'pink' }
};

const matchGamePlanDefCPositions = {
    1: { top: '3%', left: '63%', tone: 'red' },
    2: { top: '3%', left: '50%', tone: 'red' },
    3: { top: '3%', left: '42%', tone: 'red' },
    4: { top: '7%', left: '58%', tone: 'red' },
    5: { top: '7%', left: '50%', tone: 'red' },
    6: { top: '7%', left: '42%', tone: 'red' },
    7: { top: '12%', left: '50%', tone: 'yellow' },
    8: { top: '30%', left: '32%', tone: 'yellow' },
    9: { top: '44%', left: '25%', tone: 'green' },
    10: { top: '44%', left: '75%', tone: 'green' }
};

const matchGamePlanRoleSlots = ['K', 'K2', 'Cv', 'Ch', 'F', 'F2', 'S', 'S2'];
const matchGamePlanBenchMinutes = ['10', '20', '30', '45', '50', '55', '60', '65', '70', '75', '80', '85'];

const matchGamePlanRoleLabels = {
    K: 'Kaptein',
    K2: 'Visekaptein',
    Cv: 'Corner v.',
    Ch: 'Corner h.',
    F: 'Frispark',
    F2: 'Frispark 2',
    S: 'Straffe',
    S2: 'Straffe 2'
};

const matchGamePlanAssignmentKeys = {
    offc: 'offcAssignments',
    defc: 'defcAssignments',
    roller: 'rolePlanAssignments'
};

const matchGamePlanPositionRequirements = {
    GK: ['Keeper'],
    VMS: ['Venstre stopper', 'Høyre stopper'],
    HMS: ['Høyre stopper', 'Venstre stopper'],
    VB: ['Venstre bekk'],
    HB: ['Høyre bekk'],
    DM: ['Defensiv midtbane'],
    OM: ['Offensiv midtbane'],
    PM: ['Playmaker'],
    VK: ['Venstre kant', 'Venstre bekk'],
    HK: ['Høyre kant', 'Høyre bekk'],
    SP: ['Spiss']
};

const matchGamePlanPositionLabels = {
    GK: 'Keeper',
    VMS: 'Venstre stopper',
    HMS: 'Høyre stopper',
    VB: 'Venstre bekk',
    HB: 'Høyre bekk',
    DM: 'Def midtbane',
    OM: 'Off midtbane',
    PM: 'Playmaker',
    VK: 'Venstre kant',
    HK: 'Høyre kant',
    SP: 'Spiss'
};

const matchGamePlanPositionSortOrder = [
    'GK',
    'VMS',
    'HMS',
    'VB',
    'HB',
    'DM',
    'OM',
    'VK',
    'HK',
    'PM',
    'SP'
];

function getMatchGamePlanPositionSortIndex(posId) {
    const index = matchGamePlanPositionSortOrder.indexOf(posId);
    return index === -1 ? 999 : index;
}

function compareMatchGamePlanPositions(posA, posB) {
    return getMatchGamePlanPositionSortIndex(posA) - getMatchGamePlanPositionSortIndex(posB)
        || String(posA).localeCompare(String(posB));
}

function getMatchGamePlanPlayerShortName(player) {
    return String(player?.navn || '').trim() || 'Spiller';
}

function getMatchGamePlanPlayerLastName(player) {
    const parts = String(player?.navn || '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'Spiller';
}

function getMatchGamePlanPlayerPhotoUrl(player) {
    return player?.photoUrl || player?.bildeUrl || player?.avatarUrl || player?.imageUrl || player?.photo || '';
}

function getMatchGamePlanPlayerInitials(player) {
    return String(player?.navn || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'S';
}

function buildMatchStatsPlayerAvatarHtml(playerObj) {
    const photoUrl = getMatchGamePlanPlayerPhotoUrl(playerObj);
    const initials = getMatchGamePlanPlayerInitials(playerObj);

    if (photoUrl) {
        return `
            <div class="match-stats-player-avatar is-photo" aria-hidden="true">
                <img src="${escapeMatchHtml(photoUrl)}" alt="" loading="lazy" decoding="async">
            </div>
        `;
    }

    return `
        <div class="match-stats-player-avatar" aria-hidden="true">
            <span>${escapeMatchHtml(initials)}</span>
        </div>
    `;
}

function buildMatchGamePlanHeadingAvatarHtml(player, posId) {
    const photoUrl = getMatchGamePlanPlayerPhotoUrl(player);
    const fallbackText = player ? getMatchGamePlanPlayerInitials(player) : posId;

    return `
        <span class="match-game-plan-heading-avatar" data-player-id="${escapeMatchHtml(player?.id || '')}">
            ${photoUrl
                ? `<img src="${escapeMatchHtml(photoUrl)}" alt="" class="match-game-plan-heading-avatar-img" loading="lazy" decoding="async">`
                : `<span>${escapeMatchHtml(fallbackText)}</span>`}
        </span>
    `;
}

function buildMatchGamePlanPlayerOptionAvatarHtml(player) {
    const photoUrl = getMatchGamePlanPlayerPhotoUrl(player);
    const fallbackText = player ? getMatchGamePlanPlayerInitials(player) : '?';

    if (photoUrl) {
        return `<span class="match-game-plan-player-avatar is-photo"><img src="${escapeMatchHtml(photoUrl)}" alt="" loading="lazy" decoding="async"></span>`;
    }

    return `<span class="match-game-plan-player-avatar"><span>${escapeMatchHtml(fallbackText)}</span></span>`;
}

function getMatchGamePlanDraftFormationPositions(match) {
    const formation = matchGamePlanFormations[getMatchGamePlanDraftFormation(match)] || matchGamePlanFormations['4-2-4'];
    return formation.positions || {};
}

function findMatchGamePlanPlayerById(match, playerId) {
    if (!playerId) return null;
    const fromActive = (window.activePlayers || []).find(player => player.id === playerId);
    if (fromActive) return fromActive;
    return getMatchDetailAttendingPlayers(match).find(player => player.id === playerId) || null;
}

function showMatchGamePlanPlayerSelectModal(modal) {
    if (!modal) return;
    modal.classList.add('match-game-plan-select-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeMatchGamePlanPlayerSelectModal() {
    const modal = document.getElementById('tacticalPlayerModal');
    if (!modal) return;
    modal.classList.remove('match-game-plan-select-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function getMatchGamePlanFitTagMeta(score) {
    if (score === 0) return { label: 'Primær', tone: 'is-primary' };
    if (score === 1) return { label: 'Sekundær', tone: 'is-secondary' };
    return { label: 'Annen', tone: 'is-other' };
}

function buildMatchGamePlanFitTagHtml(score) {
    const tag = getMatchGamePlanFitTagMeta(score);
    return `<span class="match-game-plan-player-tag ${tag.tone}">${escapeMatchHtml(tag.label)}</span>`;
}

function buildMatchGamePlanBenchPlacementOptionsHtml(match, player) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const positions = getMatchGamePlanDraftFormationPositions(match);

    return Object.entries(positions)
        .sort(([posA], [posB]) => compareMatchGamePlanPositions(posA, posB))
        .map(([posId]) => {
            const targetPlayer = lineup[posId];
            const score = getMatchGamePlanPositionScore(player, posId);
            const positionLabel = getMatchGamePlanPositionLabel(posId);
            const avatarHtml = targetPlayer
                ? buildMatchGamePlanPlayerOptionAvatarHtml(targetPlayer)
                : `<span class="match-game-plan-player-avatar"><span>${escapeMatchHtml(posId)}</span></span>`;
            const detail = targetPlayer
                ? `Erstatter ${getMatchGamePlanPlayerShortName(targetPlayer)}`
                : 'Ledig posisjon';

            return `
                <button
                    type="button"
                    class="match-game-plan-player-option"
                    onclick="window.chooseMatchGamePlanPlayer('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(posId)}', '${escapeMatchJsString(player.id)}')"
                >
                    <span class="match-game-plan-player-status-dot ${targetPlayer ? 'is-on-pitch' : 'is-off-pitch'}" title="${targetPlayer ? 'Opptatt' : 'Ledig'}"></span>
                    ${avatarHtml}
                    <span class="match-game-plan-player-copy">
                        <strong>${escapeMatchHtml(positionLabel)}</strong>
                        <span>${escapeMatchHtml(detail)}</span>
                    </span>
                    ${buildMatchGamePlanFitTagHtml(score)}
                </button>
            `;
        })
        .join('');
}

function renderMatchGamePlanStarterCardNode(match, posId) {
    const formation = matchGamePlanFormations[getMatchGamePlanDraftFormation(match)] || matchGamePlanFormations['4-2-4'];
    const coords = formation.positions[posId];
    if (!coords) return;

    document.querySelectorAll(`.match-detail-lineup-pitch-wrap [data-game-plan-node="${posId}"]`).forEach(existingNode => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildMatchGamePlanStarterCardNodeHtml(match, posId, coords).trim();
        existingNode.replaceWith(wrapper.firstElementChild);
    });
}

function refreshMatchGamePlanLineupAfterChange(match, affectedPosIds = []) {
    const uniquePosIds = [...new Set(affectedPosIds.filter(Boolean))];
    uniquePosIds.forEach(posId => renderMatchGamePlanStarterCardNode(match, posId));
    renderMatchDetailSquadList(match);
    syncMatchGamePlanLineupOverlayUi(match);
    requestAnimationFrame(() => {
        if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
            window.drawMatchGamePlanChemistryLines(match);
        }
    });
}

function getMatchGamePlanLineup(match) {
    if (match?.lineupRefs && typeof match.lineupRefs === 'object') {
        const resolvedLineup = {};
        Object.entries(match.lineupRefs).forEach(([posId, ref]) => {
            resolvedLineup[posId] = ref && typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(ref)
                : null;
        });
        return resolvedLineup;
    }

    return match && typeof match.lineup === 'object' && match.lineup ? match.lineup : {};
}

function getMatchGamePlanLineupRefs(lineup) {
    return Object.fromEntries(
        Object.entries(lineup || {}).map(([posId, player]) => [
            posId,
            player ? (window.getPlayerStorageKey?.(player) || player.id || player.navn || '') : ''
        ])
    );
}

function cloneMatchGamePlanLineup(lineup) {
    return Object.fromEntries(
        Object.entries(lineup || {}).map(([posId, player]) => [posId, player ? { ...player } : null])
    );
}

function getMatchGamePlanDraft(match) {
    window.matchGamePlanDrafts = window.matchGamePlanDrafts || {};
    if (!match?.id) return {
        lineup: cloneMatchGamePlanLineup(getMatchGamePlanLineup(match)),
        formation: getMatchGamePlanFormation(match)
    };

    if (!window.matchGamePlanDrafts[match.id]) {
        window.matchGamePlanDrafts[match.id] = {
            lineup: cloneMatchGamePlanLineup(getMatchGamePlanLineup(match)),
            formation: getMatchGamePlanFormation(match)
        };
    }

    return window.matchGamePlanDrafts[match.id];
}

function pruneMatchGamePlanDraftLineupForFormation(draft, formationId) {
    const validPosIds = new Set(getMatchGamePlanFormationPositionIds(formationId));
    draft.lineup = Object.fromEntries(
        Object.entries(draft.lineup || {}).filter(([posId]) => validPosIds.has(posId))
    );
}

function resetMatchGamePlanDraft(match) {
    if (!match?.id) return;
    window.matchGamePlanDrafts = window.matchGamePlanDrafts || {};
    window.matchGamePlanDrafts[match.id] = {
        lineup: cloneMatchGamePlanLineup(getMatchGamePlanLineup(match)),
        formation: getMatchGamePlanFormation(match)
    };
}

function getMatchGamePlanFormationPositionIds(formationId) {
    const formation = matchGamePlanFormations[formationId] || matchGamePlanFormations['4-2-4'];
    return Object.keys(formation.positions || {});
}

function checkMatchGamePlanDraftDirty(match) {
    if (!match?.id || !window.matchGamePlanDrafts?.[match.id]) return false;

    const savedFormation = getMatchGamePlanFormation(match);
    const draftFormation = getMatchGamePlanDraftFormation(match);
    if (savedFormation !== draftFormation) return true;

    const positionIds = getMatchGamePlanFormationPositionIds(draftFormation);
    const savedRefs = getMatchGamePlanLineupRefs(getMatchGamePlanLineup(match));
    const draftRefs = getMatchGamePlanLineupRefs(getMatchGamePlanDraftLineup(match));

    return positionIds.some(posId => (savedRefs[posId] || '') !== (draftRefs[posId] || ''));
}

function syncMatchGamePlanLineupSaveState(match) {
    const builder = document.querySelector('.match-detail-lineup-builder');
    if (!builder || !match) return;

    const saveBtn = builder.querySelector('.match-game-plan-lineup-save-btn');
    const clearBtn = builder.querySelector('.match-game-plan-lineup-clear-btn');
    const playerCount = getMatchGamePlanDraftLineupPlayerCount(match);
    const isDirty = checkMatchGamePlanDraftDirty(match);

    if (saveBtn) {
        saveBtn.classList.toggle('is-dirty', isDirty);
        saveBtn.setAttribute('aria-label', isDirty ? 'Lagre ulagrede endringer' : 'Lagre lagoppstilling');
        saveBtn.title = isDirty ? 'Ulagrede endringer i 11eren' : 'Lagre lagoppstilling';

        const label = saveBtn.querySelector('.match-game-plan-lineup-save-label');
        if (label) {
            label.textContent = isDirty ? 'Lagre · ulagret' : 'Lagre';
        }
    }

    if (clearBtn) {
        clearBtn.disabled = playerCount === 0;
        clearBtn.setAttribute('aria-label', playerCount === 0
            ? 'Nullstill lagoppstilling (ingen spillere på banen)'
            : 'Nullstill lagoppstilling');
        clearBtn.title = playerCount === 0
            ? 'Ingen spillere å fjerne'
            : 'Fjern alle spillere fra banen';
    }

    if (isDirty) {
        setMatchDetailFeedback('[data-lineup-save-state]', '', '');
    }
}

function getMatchGamePlanDraftLineupPlayerCount(match) {
    const lineup = getMatchGamePlanDraftLineup(match);
    return matchGamePlanStarterPositionIds.filter(posId => lineup[posId]).length;
}

function syncMatchGamePlanSamspillHint(match) {
    const hint = document.querySelector('[data-samspill-hint]');
    if (!hint || !match) return;

    const overlayState = getMatchGamePlanLineupOverlayState(match);
    const playerCount = getMatchGamePlanDraftLineupPlayerCount(match);
    const shouldShow = !overlayState.samspill && playerCount >= 2;

    hint.hidden = !shouldShow;
    if (shouldShow) {
        hint.textContent = 'Velg Samspill for å se relasjoner og samspillanalyse';
    }
}

function setMatchDetailFeedback(selector, message, variant = '', autoClearMs = 0) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    if (el._feedbackTimer) {
        clearTimeout(el._feedbackTimer);
        el._feedbackTimer = null;
    }

    el.textContent = message || '';
    el.hidden = !message;
    el.classList.remove('is-success', 'is-error', 'is-pending');
    if (message && variant) el.classList.add(`is-${variant}`);

    if (message && autoClearMs > 0) {
        el._feedbackTimer = setTimeout(() => {
            el.textContent = '';
            el.hidden = true;
            el.classList.remove('is-success', 'is-error', 'is-pending');
            el._feedbackTimer = null;
        }, autoClearMs);
    }
}

window.setMatchDetailFeedback = setMatchDetailFeedback;

window.isMatchGamePlanDraftDirty = function(matchOrId) {
    const match = typeof matchOrId === 'string'
        ? (window.activeMatches || []).find(item => item.id === matchOrId)
        : matchOrId;
    return checkMatchGamePlanDraftDirty(match);
};

function getMatchGamePlanDraftLineup(match) {
    return getMatchGamePlanDraft(match).lineup || {};
}

function getMatchGamePlanFormation(match) {
    const formation = match?.formation || match?.lineupFormation || '4-2-4';
    if (formation === '4-4-2') return '4-2-4';
    return matchGamePlanFormations[formation] ? formation : '4-2-4';
}

function getMatchGamePlanDraftFormation(match) {
    const formation = getMatchGamePlanDraft(match).formation || getMatchGamePlanFormation(match);
    if (formation === '4-4-2') return '4-2-4';
    return matchGamePlanFormations[formation] ? formation : '4-2-4';
}

function getMatchGamePlanOffCAssignments(match) {
    return match && typeof match.offcAssignments === 'object' && match.offcAssignments ? match.offcAssignments : {};
}

function getMatchGamePlanSetPieceAssignments(match, planId) {
    const key = matchGamePlanAssignmentKeys[planId] || matchGamePlanAssignmentKeys.offc;
    return match && typeof match[key] === 'object' && match[key] ? match[key] : {};
}

function getMatchGamePlanBenchAssignments(match) {
    return match && typeof match.benchSubstitutionPlan === 'object' && match.benchSubstitutionPlan
        ? match.benchSubstitutionPlan
        : {};
}

function getMatchGamePlanBenchAssignment(match, playerRef) {
    const assignment = getMatchGamePlanBenchAssignments(match)[playerRef];
    if (!assignment) return { minute: '', position: '' };
    if (typeof assignment === 'string') return { minute: assignment, position: '' };
    return {
        minute: assignment.minute || '',
        position: assignment.position || ''
    };
}

function getMatchGamePlanPositionScore(player, posId) {
    const acceptedPositions = matchGamePlanPositionRequirements[posId] || [];
    if (acceptedPositions.includes(player?.pos1)) return 0;
    if (acceptedPositions.includes(player?.pos2)) return 1;
    return 2;
}

function matchGamePlanSamePlayer(left, right) {
    if (!left || !right) return false;
    return (left.id && right.id && left.id === right.id)
        || (left.navn && right.navn && left.navn === right.navn);
}

function getMatchGamePlanPositionLabel(posId) {
    return matchGamePlanPositionLabels[posId] || posId;
}

function getMatchGamePlanPositionBadgeLabel(posId) {
    if (posId === 'VMS') return 'VS';
    if (posId === 'HMS') return 'HS';
    return posId;
}

function getMatchDetailPositionCategory(pos1) {
    if (!pos1) return null;
    const normalized = String(pos1).trim();
    if (normalized === 'Keeper' || normalized.toLowerCase().includes('keeper')) return 'K';
    if (['Høyre bekk', 'Venstre bekk', 'Høyre stopper', 'Venstre stopper'].includes(normalized)) return 'F';
    if (['Spiss', 'Høyre kant', 'Venstre kant'].includes(normalized)) return 'A';
    return 'M';
}

function getMatchDetailAttendingPlayers(match) {
    const teamPlayers = (window.activePlayers || [])
        .filter(p => p.status !== 'Passiv' && (!match.matchGroup || p.spillerLag === match.matchGroup))
        .sort((a, b) => (Number(a.drakt) || 999) - (Number(b.drakt) || 999) || a.navn.localeCompare(b.navn));
    const attendingRefs = typeof window.getMatchParticipantRefs === 'function'
        ? window.getMatchParticipantRefs(match)
        : window.getAttendingPlayerRefs(match.attendance);
    const benchPlayers = teamPlayers
        .filter(p => attendingRefs.some(ref => window.playerRefMatches(ref, p)))
        .sort((a, b) => (Number(a.drakt) || 999) - (Number(b.drakt) || 999) || a.navn.localeCompare(b.navn));
    const fallbackBenchPlayers = attendingRefs
        .filter(ref => !benchPlayers.some(p => window.playerRefMatches(ref, p)))
        .sort((a, b) => window.getPlayerNameFromRef(a).localeCompare(window.getPlayerNameFromRef(b)))
        .map(ref => ({ navn: window.getPlayerNameFromRef(ref), drakt: '' }));

    return [...benchPlayers, ...fallbackBenchPlayers];
}

function getMatchGamePlanPlayerPitchPosId(match, player) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const entry = Object.entries(lineup).find(([, lineupPlayer]) => matchGamePlanSamePlayer(lineupPlayer, player));
    return entry ? entry[0] : '';
}

function assignMatchGamePlanDraftLineupPlayer(lineup, posId, player) {
    const nextLineup = { ...lineup };

    if (player) {
        Object.keys(nextLineup).forEach(otherPosId => {
            if (otherPosId !== posId && matchGamePlanSamePlayer(nextLineup[otherPosId], player)) {
                nextLineup[otherPosId] = null;
            }
        });
        nextLineup[posId] = { ...player };
        return nextLineup;
    }

    nextLineup[posId] = null;
    return nextLineup;
}

function getMatchGamePlanDraftLineupPosIdsForPlayer(lineup, player) {
    if (!player) return [];
    return Object.entries(lineup || {})
        .filter(([, lineupPlayer]) => matchGamePlanSamePlayer(lineupPlayer, player))
        .map(([pitchPosId]) => pitchPosId);
}

function getMatchGamePlanPlayerKampbidrag(player, match) {
    const teamName = match?.matchGroup || player?.spillerLag || '';
    return typeof window.getPlayerKampbidragSnitt === 'function'
        ? window.getPlayerKampbidragSnitt(player, teamName)
        : 0;
}

function buildMatchGamePlanBidragValueHtml(player, match) {
    const kampbidrag = getMatchGamePlanPlayerKampbidrag(player, match);
    const bidragText = kampbidrag > 0 ? String(kampbidrag) : '-';
    const bidragTone = getMatchGamePlanBidragToneClass(kampbidrag);
    const title = kampbidrag > 0 ? `Kampbidrag: ${kampbidrag}` : 'Kampbidrag: ingen data';

    return `<span class="match-game-plan-lineup-card-overlay match-game-plan-lineup-card-overlay-bidrag ${bidragTone}" title="${escapeMatchHtml(title)}">${escapeMatchHtml(bidragText)}</span>`;
}

function getMatchGamePlanPlayerForm(player) {
    if (!player?.navn || typeof window.calculatePlayerPerformanceChemistry !== 'function') return 0;
    return window.calculatePlayerPerformanceChemistry(player.navn);
}

function getMatchGamePlanFormToneClass(score, teamName) {
    const tone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(score, teamName)
        : 'none';
    if (tone === 'green') return 'is-green';
    if (tone === 'amber') return 'is-amber';
    if (tone === 'red') return 'is-red';
    return 'is-muted';
}

function buildMatchGamePlanFormValueHtml(player, match) {
    const teamName = match?.matchGroup || player?.spillerLag || '';
    const formScore = getMatchGamePlanPlayerForm(player, match);
    const formText = formScore > 0 ? String(formScore) : '-';
    const formTone = getMatchGamePlanFormToneClass(formScore, teamName);
    const title = formScore > 0 ? `Form: ${formScore}/100` : 'Form: ingen data';

    return `<span class="match-game-plan-lineup-card-overlay match-game-plan-lineup-card-overlay-form ${formTone}" title="${escapeMatchHtml(title)}">${escapeMatchHtml(formText)}</span>`;
}

function buildMatchBenchPlayerHtml(match, player) {
    const lastName = getMatchGamePlanPlayerLastName(player);
    const photoUrl = getMatchGamePlanPlayerPhotoUrl(player);
    const pitchPosId = getMatchGamePlanPlayerPitchPosId(match, player);
    const isOnPitch = Boolean(pitchPosId);
    const pitchCode = isOnPitch ? getMatchGamePlanPositionBadgeLabel(pitchPosId) : '';
    const ariaLabel = isOnPitch
        ? `${lastName}, på banen som ${pitchCode}. Bytt posisjon eller spiller.`
        : `${lastName}. Plasser på banen.`;
    const badgeHtml = isOnPitch
        ? `<span class="match-game-plan-lineup-pos-badge" aria-hidden="true"><span class="match-game-plan-lineup-pos-badge-label">${escapeMatchHtml(pitchCode)}</span></span>`
        : '';
    const overlayHtml = buildMatchGamePlanLineupCardOverlayHtml(match, player);

    return `
        <button
            type="button"
            class="match-game-plan-lineup-card match-bench-player is-filled${isOnPitch ? ' is-on-pitch' : ''}"
            data-player-id="${escapeMatchHtml(player.id || '')}"${isOnPitch ? ` data-pitch-pos="${escapeMatchHtml(pitchPosId)}"` : ''}
            aria-label="${escapeMatchHtml(ariaLabel)}"
            onclick="window.openMatchGamePlanBenchPlayerSelect('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(player.id || '')}')"
        >
            <span class="match-game-plan-lineup-visual" aria-hidden="true">
                <span class="match-game-plan-lineup-photo-area">
                    <span class="match-game-plan-lineup-photo match-bench-photo">
                        ${photoUrl
                            ? `<img src="${escapeMatchHtml(photoUrl)}" alt="">`
                            : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                        ${badgeHtml}
                    </span>
                    ${overlayHtml}
                </span>
                <strong>${escapeMatchHtml(lastName)}</strong>
            </span>
        </button>
    `;
}

function buildMatchDetailSquadListHtml(match) {
    const selectedPlayers = getMatchDetailAttendingPlayers(match);
    const benchPositionRows = [
        { key: 'keeper', label: 'Keeper', categories: ['K'], players: [] },
        { key: 'defence', label: 'Forsvar', categories: ['F'], players: [] },
        { key: 'midfield', label: 'Midtbane', categories: ['M'], players: [] },
        { key: 'attack', label: 'Angrep', categories: ['A'], players: [] }
    ];

    selectedPlayers.forEach(player => {
        const category = getMatchDetailPositionCategory(player.pos1) || 'M';
        const row = benchPositionRows.find(positionRow => positionRow.categories.includes(category)) || benchPositionRows[2];
        row.players.push(player);
    });

    if (!selectedPlayers.length) {
        const emptyMessage = typeof window.getMatchSquadEmptyMessage === 'function'
            ? window.getMatchSquadEmptyMessage(match)
            : 'Registrer oppmøte for å se hvem som møtte opp.';
        return `
            <div class="match-bench-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>${escapeMatchHtml(emptyMessage)}</span>
            </div>
        `;
    }

    return benchPositionRows.map(row => `
        <section class="match-bench-group match-bench-group-${row.key}" aria-label="${escapeMatchHtml(row.label)}">
            <div class="match-bench-group-title">${escapeMatchHtml(row.label)}</div>
            <div class="match-bench-row">
                ${row.players.map(player => buildMatchBenchPlayerHtml(match, player)).join('')}
            </div>
        </section>
    `).join('');
}

function syncMatchDetailSquadCardSizeToPitch() {
    const pitchCard = document.querySelector('.match-detail-lineup-pitch-wrap .match-game-plan-lineup-card');
    const squadList = document.querySelector('.match-detail-squad-list');
    if (!pitchCard || !squadList) return;

    const width = pitchCard.getBoundingClientRect().width;
    if (!width) return;

    const pitchStyles = window.getComputedStyle(pitchCard);
    squadList.style.setProperty('--squad-card-width', `${width}px`);
    squadList.style.setProperty('--lineup-card-radius', pitchStyles.borderRadius || '0.64rem');
}

function renderMatchDetailSquadList(match) {
    const list = document.querySelector('.match-detail-squad-list');
    if (!list || !match) return;
    list.innerHTML = buildMatchDetailSquadListHtml(match);
    applyMatchGamePlanSamspillZoneFocus(match);
    requestAnimationFrame(() => syncMatchDetailSquadCardSizeToPitch());
}

function getMatchGamePlanRoleLabel(slot) {
    return matchGamePlanRoleLabels[slot] || slot;
}

function getMatchGamePlanAddLabel(posId) {
    if (posId === 'GK') return 'Legg til målvakt';
    if (['VB', 'VMS', 'HMS', 'HB'].includes(posId)) return 'Legg til forsvarer';
    if (['DM', 'OM', 'PM'].includes(posId)) return 'Legg til midtbane';
    return 'Legg til angriper';
}

function buildMatchGamePlanNodeHtml(match, posId, coords) {
    const selectedPlayer = getMatchGamePlanLineup(match)[posId] || null;
    const playerNameHtml = selectedPlayer
        ? `<span class="match-game-plan-node-name">${escapeMatchHtml(getMatchGamePlanPlayerShortName(selectedPlayer))}</span>`
        : '';

    return `
        <button
            type="button"
            class="match-game-plan-node match-game-plan-node-${escapeMatchHtml(posId).toLowerCase()} ${selectedPlayer ? 'is-filled' : ''}"
            style="top: ${coords.top}; left: ${coords.left};"
            onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(posId)}')"
            data-game-plan-node="${escapeMatchHtml(posId)}"
            aria-label="Velg spiller for ${escapeMatchHtml(posId)}"
        >
            <span class="player-node-pos">${escapeMatchHtml(posId)}</span>
            ${playerNameHtml}
        </button>
    `;
}

function getMatchGamePlanLineupOverlayState(match) {
    window.matchGamePlanLineupOverlays = window.matchGamePlanLineupOverlays || {};
    if (!match?.id) {
        return { samspill: false, bidrag: false, startBenk: false, form: false };
    }

    if (!window.matchGamePlanLineupOverlays[match.id]) {
        window.matchGamePlanLineupOverlays[match.id] = {
            samspill: false,
            bidrag: false,
            startBenk: false,
            form: false
        };
    }

    const state = window.matchGamePlanLineupOverlays[match.id];
    if (state.kjemi && !state.samspill) {
        state.samspill = state.kjemi;
        delete state.kjemi;
    }

    return state;
}

function ensureMatchGamePlanSamspillPanelsDom() {
    const host = document.querySelector('.match-detail-lineup-builder')
        || document.querySelector('.match-detail-squad-lineup')
        || document.querySelector('.match-detail-squad-players');
    if (!host) return;

    if (!host.querySelector('[data-samspill-panels]')) {
        host.querySelectorAll('[data-samspill-summary], [data-samspill-analysis]').forEach(element => element.remove());
        host.insertAdjacentHTML('beforeend', `
            <div class="match-game-plan-samspill-panels" data-samspill-panels>
                <section class="match-game-plan-samspill-analysis" data-samspill-analysis aria-label="Samspillanalyse">
                    <h4 class="match-game-plan-samspill-analysis-title">Samspillanalyse</h4>
                </section>
            </div>
        `);
        return;
    }

    host.querySelector('[data-samspill-summary]')?.remove();

    if (!host.querySelector('[data-samspill-analysis]')) {
        host.querySelector('[data-samspill-panels]')?.insertAdjacentHTML('beforeend', `
            <section class="match-game-plan-samspill-analysis" data-samspill-analysis aria-label="Samspillanalyse">
                <h4 class="match-game-plan-samspill-analysis-title">Samspillanalyse</h4>
            </section>
        `);
    }
}

function isMatchGamePlanSamspillSummaryVisible(_builder, overlayState) {
    return !!(overlayState?.samspill);
}

function getMatchGamePlanOverlayStateClasses(match) {
    const overlayState = getMatchGamePlanLineupOverlayState(match);
    const classes = [];
    if (overlayState.samspill) classes.push('is-show-samspill');
    if (overlayState.bidrag) classes.push('is-show-bidrag');
    if (overlayState.startBenk) classes.push('is-show-start-benk');
    if (overlayState.form) classes.push('is-show-form');
    return classes;
}

function getMatchGamePlanLineupBuilderClass(match) {
    return ['match-detail-lineup-builder', ...getMatchGamePlanOverlayStateClasses(match)].join(' ');
}

function applyMatchGamePlanLineupOverlayClasses(match) {
    const overlayClasses = getMatchGamePlanOverlayStateClasses(match);
    const targets = [
        document.querySelector('.match-detail-lineup-builder'),
        document.querySelector('.match-detail-squad-section')
    ].filter(Boolean);

    targets.forEach(element => {
        element.classList.remove('is-show-samspill', 'is-show-kjemi', 'is-show-bidrag', 'is-show-start-benk', 'is-show-form');
        overlayClasses.forEach(className => element.classList.add(className));
    });
    applyMatchGamePlanSamspillZoneFocus(match);
}

function isMatchPlayedForStartBenchStats(match) {
    if (!match?.result || match.result === 'Ikke spilt') return false;
    return String(match.result).includes('-');
}

function matchHasSavedLineup(match) {
    if (match?.lineup && Object.values(match.lineup).some(Boolean)) return true;
    if (match?.lineupRefs && Object.values(match.lineupRefs).some(Boolean)) return true;
    return false;
}

function isPlayerInSavedStartingLineup(match, player) {
    if (!player || !match) return false;

    const hasLineupRefs = match.lineupRefs
        && typeof match.lineupRefs === 'object'
        && Object.values(match.lineupRefs).some(Boolean);
    if (hasLineupRefs) {
        return Object.values(match.lineupRefs).some(ref => (
            ref && typeof window.playerRefMatches === 'function' && window.playerRefMatches(ref, player)
        ));
    }

    if (match.lineup && typeof match.lineup === 'object') {
        return Object.values(match.lineup).some(entry => {
            if (!entry) return false;
            if (typeof entry === 'string') {
                return typeof window.playerRefMatches === 'function' && window.playerRefMatches(entry, player);
            }
            return typeof window.playerRefMatches === 'function'
                && window.playerRefMatches(entry.id || entry.navn, player);
        });
    }

    return false;
}

function getPlayerStartBenchCounts(player, teamName, currentMatch) {
    if (!player) return { starts: 0, bench: 0 };

    const currentMatchId = currentMatch?.id || null;
    const currentMatchDate = currentMatch?.date ? new Date(currentMatch.date) : null;
    if (currentMatchDate) currentMatchDate.setHours(0, 0, 0, 0);

    let starts = 0;
    let bench = 0;

    (window.activeMatches || []).forEach(match => {
        if (currentMatchId && match.id === currentMatchId) return;
        if (teamName && match.matchGroup !== teamName) return;
        if (!isMatchPlayedForStartBenchStats(match)) return;
        if (!matchHasSavedLineup(match)) return;

        if (currentMatchDate && match.date) {
            const matchDate = new Date(match.date);
            matchDate.setHours(0, 0, 0, 0);
            if (matchDate >= currentMatchDate) return;
        }

        if (typeof window.isPlayerAttending !== 'function' || !window.isPlayerAttending(match.attendance, player)) return;

        if (isPlayerInSavedStartingLineup(match, player)) {
            starts += 1;
            return;
        }

        bench += 1;
    });

    return { starts, bench };
}

function getMatchGamePlanBidragToneClass(value) {
    const kampbidrag = Number(value) || 0;
    if (kampbidrag <= 0) return 'is-muted';
    if (kampbidrag > 15) return 'is-high';
    if (kampbidrag >= 10) return 'is-mid';
    return 'is-low';
}

function getMatchGamePlanSamspillFilter(match) {
    if (match?.matchGroup) {
        return { teamName: match.matchGroup, historicalOnly: true };
    }
    return { teamName: null, historicalOnly: true };
}

function buildMatchGamePlanLineupCardOverlayHtml(match, player) {
    if (!player) return '';

    const teamName = match?.matchGroup || player.spillerLag || '';
    const { starts, bench } = getPlayerStartBenchCounts(player, teamName, match);

    return `
        <span class="match-game-plan-lineup-card-overlays" aria-hidden="true">
            ${buildMatchGamePlanBidragValueHtml(player, match)}
            ${buildMatchGamePlanFormValueHtml(player, match)}
            <span class="match-game-plan-lineup-card-overlay match-game-plan-lineup-card-overlay-start-benk">
                <span class="match-game-plan-lineup-card-overlay-start">${starts}</span><span class="match-game-plan-lineup-card-overlay-sep">/</span><span class="match-game-plan-lineup-card-overlay-bench">${bench}</span>
            </span>
        </span>
    `;
}

function getMatchGamePlanLineupOverlayMenuLabel(match) {
    const overlayState = getMatchGamePlanLineupOverlayState(match);
    const activeLabels = matchGamePlanLineupOverlayOptions
        .filter(option => overlayState[option.id])
        .map(option => option.label);

    return activeLabels.length ? activeLabels.join(', ') : 'Av';
}

function buildMatchGamePlanLineupViewSegmentHtml(match, options = {}) {
    const {
        includeSamspill = false,
        includePlayerOverlays = false,
        ariaLabel = 'Visning',
        extraClass = '',
        buttonClass = ''
    } = options;
    const overlayState = getMatchGamePlanLineupOverlayState(match);
    const viewOptions = [];

    if (includeSamspill) {
        viewOptions.push({
            id: 'samspill',
            label: 'Samspill',
            active: Boolean(overlayState.samspill)
        });
    }

    if (includePlayerOverlays) {
        matchGamePlanLineupOverlayOptions.forEach(option => {
            viewOptions.push({
                id: option.id,
                label: option.label,
                active: Boolean(overlayState[option.id])
            });
        });
    }

    if (!viewOptions.length) return '';

    return `
        <div class="match-game-plan-lineup-view-segment${extraClass ? ` ${extraClass}` : ''}" data-lineup-view-segment data-match-id="${escapeMatchHtml(match.id)}" role="group" aria-label="${escapeMatchHtml(ariaLabel)}">
            ${viewOptions.map(option => `
                <button
                    type="button"
                    class="match-game-plan-lineup-overlay-btn${buttonClass ? ` ${buttonClass}` : ''}${option.active ? ' is-active' : ''}"
                    data-lineup-view-toggle="${escapeMatchHtml(option.id)}"
                    aria-pressed="${option.active ? 'true' : 'false'}"
                    title="${escapeMatchHtml(option.label)}"
                    aria-label="${escapeMatchHtml(option.label)}"
                >${escapeMatchHtml(option.label)}</button>
            `).join('')}
        </div>
    `;
}

function buildMatchGamePlanSquadOverlaySegmentHtml(match) {
    return buildMatchGamePlanLineupViewSegmentHtml(match, {
        includePlayerOverlays: true,
        ariaLabel: 'Spillerinfo',
        extraClass: 'match-detail-squad-overlay-segment',
        buttonClass: 'bsk-btn bsk-btn-chip'
    });
}

function syncMatchGamePlanLineupViewSegmentUi(match) {
    if (!match) return;

    const overlayState = getMatchGamePlanLineupOverlayState(match);
    document.querySelectorAll('[data-lineup-view-segment]').forEach(segment => {
        segment.querySelectorAll('[data-lineup-view-toggle]').forEach(button => {
            const viewKey = button.dataset.lineupViewToggle;
            const isActive = viewKey === 'samspill'
                ? Boolean(overlayState.samspill)
                : Boolean(overlayState[viewKey]);
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    });
}

function buildMatchGamePlanLineupClearBtnHtml(match) {
    const playerCount = getMatchGamePlanDraftLineupPlayerCount(match);

    return `
        <button
            type="button"
            class="match-game-plan-lineup-clear-btn"
            aria-label="${playerCount === 0 ? 'Nullstill lagoppstilling (ingen spillere på banen)' : 'Nullstill lagoppstilling'}"
            title="${playerCount === 0 ? 'Ingen spillere å fjerne' : 'Fjern alle spillere fra banen'}"
            ${playerCount === 0 ? 'disabled' : ''}
            onclick="window.clearMatchGamePlanLineup('${escapeMatchJsString(match.id)}')"
        >
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
            <span class="match-game-plan-lineup-clear-label">Nullstill</span>
        </button>
    `;
}

function buildMatchGamePlanLineupSaveBtnHtml(match) {
    return `
        <button
            type="button"
            class="match-game-plan-lineup-save-btn"
            aria-label="Lagre lagoppstilling"
            title="Lagre lagoppstilling"
            onclick="window.completeMatchGamePlanLineup('${escapeMatchJsString(match.id)}')"
        >
            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
            <span class="match-game-plan-lineup-save-label">Lagre</span>
        </button>
    `;
}

function buildMatchGamePlanLineupToolbarHtml(match) {
    return `
        <div class="match-game-plan-lineup-toolbar">
            ${buildMatchGamePlanFormationPickerHtml(match)}
            ${buildMatchGamePlanSamspillControlHtml(match)}
            <div class="match-game-plan-lineup-actions">
                ${buildMatchGamePlanLineupClearBtnHtml(match)}
                ${buildMatchGamePlanLineupSaveBtnHtml(match)}
            </div>
        </div>
    `;
}

function clearMatchGamePlanDropdownPanelPosition(panel) {
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.minWidth = '';
    panel.style.maxHeight = '';
    panel.style.overflowY = '';
    panel.style.marginTop = '';
    panel.style.zIndex = '';
}

function positionMatchGamePlanDropdownPanel(menu) {
    if (!menu) return;

    const trigger = menu.querySelector('[data-formation-action="toggle"], [data-samspill-zone-action="toggle"], [data-lineup-stats-action="toggle"]');
    const panel = menu.querySelector('[data-formation-menu-panel], [data-samspill-zone-menu-panel], [data-lineup-stats-menu-panel]');
    if (!trigger || !panel || panel.hidden) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const minWidth = Math.max(rect.width, 7.5 * 16);

    panel.style.position = 'fixed';
    panel.style.minWidth = `${minWidth}px`;
    panel.style.right = 'auto';
    panel.style.marginTop = '0';
    panel.style.zIndex = '120';
    panel.style.maxHeight = `${Math.max(8 * 16, window.innerHeight - rect.bottom - gap - viewportPadding)}px`;
    panel.style.overflowY = 'auto';

    // Measure after making visible/fixed so width is accurate.
    const panelWidth = Math.max(panel.getBoundingClientRect().width, minWidth);
    let left = rect.left;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding));

    let top = rect.bottom + gap;
    const panelHeight = panel.getBoundingClientRect().height;
    if (top + panelHeight > window.innerHeight - viewportPadding && rect.top > panelHeight + gap + viewportPadding) {
        top = rect.top - panelHeight - gap;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}

function repositionOpenMatchGamePlanDropdownMenus() {
    document.querySelectorAll('[data-formation-menu].is-open, [data-samspill-zone-menu].is-open, [data-lineup-stats-menu].is-open')
        .forEach(menu => positionMatchGamePlanDropdownPanel(menu));
}

function ensureMatchGamePlanDropdownRepositionBound() {
    if (window.matchGamePlanDropdownRepositionBound) return;
    window.matchGamePlanDropdownRepositionBound = true;

    window.addEventListener('resize', repositionOpenMatchGamePlanDropdownMenus);
    document.addEventListener('scroll', repositionOpenMatchGamePlanDropdownMenus, true);
}

function closeMatchGamePlanLineupDropdownMenus(exceptMenu = null) {
    document.querySelectorAll('[data-formation-menu].is-open, [data-samspill-zone-menu].is-open, [data-lineup-stats-menu].is-open').forEach(menu => {
        if (exceptMenu && menu === exceptMenu) return;

        menu.classList.remove('is-open');
        const trigger = menu.querySelector('[data-formation-action="toggle"], [data-samspill-zone-action="toggle"], [data-lineup-stats-action="toggle"]');
        const panel = menu.querySelector('[data-formation-menu-panel], [data-samspill-zone-menu-panel], [data-lineup-stats-menu-panel]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (panel) {
            panel.hidden = true;
            clearMatchGamePlanDropdownPanelPosition(panel);
        }
    });
}

function setMatchGamePlanLineupDropdownMenuOpen(menu, isOpen) {
    if (!menu) return;

    const trigger = menu.querySelector('[data-formation-action="toggle"], [data-samspill-zone-action="toggle"], [data-lineup-stats-action="toggle"]');
    const panel = menu.querySelector('[data-formation-menu-panel], [data-samspill-zone-menu-panel], [data-lineup-stats-menu-panel]');

    if (isOpen) {
        closeMatchGamePlanLineupDropdownMenus(menu);
        menu.classList.add('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        if (panel) {
            panel.hidden = false;
            positionMatchGamePlanDropdownPanel(menu);
            ensureMatchGamePlanDropdownRepositionBound();
            requestAnimationFrame(() => positionMatchGamePlanDropdownPanel(menu));
        }
        return;
    }

    menu.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) {
        panel.hidden = true;
        clearMatchGamePlanDropdownPanelPosition(panel);
    }
}

function closeMatchGamePlanFormationMenus(exceptMenu = null) {
    closeMatchGamePlanLineupDropdownMenus(exceptMenu);
}

function setMatchGamePlanFormationMenuOpen(menu, isOpen) {
    setMatchGamePlanLineupDropdownMenuOpen(menu, isOpen);
}

function ensureMatchGamePlanFormationMenuEventsBound() {
    if (window.matchGamePlanFormationMenuBound) return;

    window.matchGamePlanFormationMenuBound = true;
    document.addEventListener('click', (event) => {
        const toggleBtn = event.target.closest('[data-formation-action="toggle"]');
        if (toggleBtn) {
            event.stopPropagation();
            const menu = toggleBtn.closest('[data-formation-menu]');
            setMatchGamePlanFormationMenuOpen(menu, !menu?.classList.contains('is-open'));
            return;
        }

        const selectBtn = event.target.closest('[data-formation-action="select"]');
        if (selectBtn) {
            event.stopPropagation();
            const menu = selectBtn.closest('[data-formation-menu]');
            const matchId = menu?.dataset.matchId;
            const formationId = selectBtn.dataset.formationId;
            if (matchId && formationId) {
                closeMatchGamePlanLineupDropdownMenus();
                window.setMatchGamePlanFormation(matchId, formationId);
            }
            return;
        }

        const samspillToggleBtn = event.target.closest('[data-samspill-zone-action="toggle"]');
        if (samspillToggleBtn) {
            event.stopPropagation();
            const menu = samspillToggleBtn.closest('[data-samspill-zone-menu]');
            setMatchGamePlanLineupDropdownMenuOpen(menu, !menu?.classList.contains('is-open'));
            return;
        }

        const samspillSelectBtn = event.target.closest('[data-samspill-zone-action="select"]');
        if (samspillSelectBtn) {
            event.stopPropagation();
            const menu = samspillSelectBtn.closest('[data-samspill-zone-menu]');
            const matchId = menu?.dataset.matchId;
            const zoneId = samspillSelectBtn.dataset.samspillZoneId;
            if (matchId && zoneId) {
                closeMatchGamePlanLineupDropdownMenus();
                window.setMatchGamePlanSamspillZoneSelection(matchId, zoneId);
            }
            return;
        }

        const viewToggleBtn = event.target.closest('[data-lineup-view-toggle]');
        if (viewToggleBtn) {
            event.stopPropagation();
            const samspillMenu = viewToggleBtn.closest('[data-samspill-zone-menu]');
            const matchId = viewToggleBtn.closest('[data-lineup-view-segment]')?.dataset.matchId
                || samspillMenu?.dataset.matchId;
            const viewKey = viewToggleBtn.dataset.lineupViewToggle;
            if (matchId && viewKey) {
                if (samspillMenu && viewKey === 'samspill') {
                    setMatchGamePlanLineupDropdownMenuOpen(samspillMenu, false);
                }
                window.toggleMatchGamePlanLineupView(matchId, viewKey);
            }
            return;
        }

        if (!event.target.closest('[data-formation-menu], [data-samspill-zone-menu], [data-lineup-view-segment]')) {
            closeMatchGamePlanLineupDropdownMenus();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMatchGamePlanLineupDropdownMenus();
    });
}

function buildMatchGamePlanFormationPickerHtml(match) {
    const activeFormation = getMatchGamePlanDraftFormation(match);

    return `
        <div class="match-game-plan-formation-menu" data-formation-menu data-match-id="${escapeMatchHtml(match.id)}">
            <button
                type="button"
                class="match-game-plan-formation-trigger"
                data-formation-action="toggle"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label="Velg formasjon, valgt ${escapeMatchHtml(activeFormation)}"
            >
                <span class="match-game-plan-formation-trigger-value">${escapeMatchHtml(activeFormation)}</span>
                <i class="fa-solid fa-chevron-down match-game-plan-formation-trigger-chevron" aria-hidden="true"></i>
            </button>
            <div class="match-game-plan-formation-dropdown" role="listbox" aria-label="Formasjoner" hidden data-formation-menu-panel>
                ${Object.keys(matchGamePlanFormations).map(formationId => `
                    <button
                        type="button"
                        class="match-game-plan-formation-option ${activeFormation === formationId ? 'is-active' : ''}"
                        role="option"
                        aria-selected="${activeFormation === formationId ? 'true' : 'false'}"
                        data-formation-action="select"
                        data-formation-id="${escapeMatchHtml(formationId)}"
                    >${escapeMatchHtml(formationId)}</button>
                `).join('')}
            </div>
        </div>
    `;
}

function getMatchGamePlanSamspillZoneSelectionId(match) {
    const overlayState = getMatchGamePlanLineupOverlayState(match);
    if (!overlayState.samspill) return 'av';

    const zoneId = getMatchGamePlanSamspillZoneFocus(match);
    return zoneId || 'alle';
}

function getMatchGamePlanSamspillZoneSelectionLabel(match) {
    const selectionId = getMatchGamePlanSamspillZoneSelectionId(match);
    const option = matchGamePlanSamspillZoneOptions.find(entry => entry.id === selectionId);
    return option?.label || 'Av';
}

function buildMatchGamePlanSamspillControlHtml(match) {
    const samspillOn = Boolean(getMatchGamePlanLineupOverlayState(match).samspill);
    const activeZoneId = getMatchGamePlanSamspillZoneSelectionId(match);
    const activeLabel = getMatchGamePlanSamspillZoneSelectionLabel(match);
    const displayLabel = activeLabel === 'Av' ? 'Alle' : activeLabel;
    const zoneOptions = matchGamePlanSamspillZoneOptions.filter(option => option.id !== 'av');

    return `
        <div class="match-game-plan-formation-menu match-game-plan-samspill-control" data-samspill-zone-menu data-match-id="${escapeMatchHtml(match.id)}">
            <div class="match-game-plan-samspill-control-shell${samspillOn ? ' is-active' : ''}" role="group" aria-label="Samspill">
                <button
                    type="button"
                    class="match-game-plan-samspill-control-toggle${samspillOn ? ' is-active' : ''}"
                    data-lineup-view-toggle="samspill"
                    aria-pressed="${samspillOn ? 'true' : 'false'}"
                    title="Samspill"
                    aria-label="Samspill"
                >Samspill</button>
                <button
                    type="button"
                    class="match-game-plan-samspill-control-zone${samspillOn ? '' : ' is-hidden'}"
                    data-samspill-zone-action="toggle"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-label="Velg samspillssone, valgt ${escapeMatchHtml(displayLabel)}"
                    title="Velg sone"
                    ${samspillOn ? '' : 'hidden'}
                >
                    <span class="match-game-plan-formation-trigger-value" data-samspill-zone-value>${escapeMatchHtml(displayLabel)}</span>
                    <i class="fa-solid fa-chevron-down match-game-plan-formation-trigger-chevron" aria-hidden="true"></i>
                </button>
            </div>
            <div class="match-game-plan-formation-dropdown" role="listbox" aria-label="Samspillssoner" hidden data-samspill-zone-menu-panel>
                ${zoneOptions.map(option => `
                    <button
                        type="button"
                        class="match-game-plan-formation-option ${(activeZoneId === option.id || (activeZoneId === 'av' && option.id === 'alle')) ? 'is-active' : ''}"
                        role="option"
                        aria-selected="${(activeZoneId === option.id || (activeZoneId === 'av' && option.id === 'alle')) ? 'true' : 'false'}"
                        data-samspill-zone-action="select"
                        data-samspill-zone-id="${escapeMatchHtml(option.id)}"
                    >${escapeMatchHtml(option.label)}</button>
                `).join('')}
            </div>
        </div>
    `;
}

function syncMatchGamePlanSamspillZonePickerUi(match) {
    const builder = document.querySelector('.match-detail-lineup-builder');
    if (!builder || !match) return;

    const menu = builder.querySelector('[data-samspill-zone-menu]');
    if (!menu) return;

    const samspillOn = Boolean(getMatchGamePlanLineupOverlayState(match).samspill);
    const activeZoneId = getMatchGamePlanSamspillZoneSelectionId(match);
    const activeLabel = getMatchGamePlanSamspillZoneSelectionLabel(match);
    const displayLabel = activeLabel === 'Av' ? 'Alle' : activeLabel;
    const shell = menu.querySelector('.match-game-plan-samspill-control-shell');
    const toggleBtn = menu.querySelector('[data-lineup-view-toggle="samspill"]');
    const valueEl = menu.querySelector('[data-samspill-zone-value]');
    const zoneTrigger = menu.querySelector('[data-samspill-zone-action="toggle"]');

    if (shell) shell.classList.toggle('is-active', samspillOn);
    if (toggleBtn) {
        toggleBtn.classList.toggle('is-active', samspillOn);
        toggleBtn.setAttribute('aria-pressed', samspillOn ? 'true' : 'false');
    }

    if (zoneTrigger) {
        zoneTrigger.hidden = !samspillOn;
        zoneTrigger.classList.toggle('is-hidden', !samspillOn);
        zoneTrigger.setAttribute('aria-label', `Velg samspillssone, valgt ${displayLabel}`);
        if (!samspillOn) {
            setMatchGamePlanLineupDropdownMenuOpen(menu, false);
        }
    }

    if (valueEl) valueEl.textContent = displayLabel;

    menu.querySelectorAll('[data-samspill-zone-action="select"]').forEach(button => {
        const isActive = button.dataset.samspillZoneId === activeZoneId
            || (activeZoneId === 'av' && button.dataset.samspillZoneId === 'alle');
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function buildMatchGamePlanStarterCardNodeHtml(match, posId, coords) {
    const selectedPlayer = getMatchGamePlanDraftLineup(match)[posId] || null;
    const positionLabel = getMatchGamePlanPositionLabel(posId);
    const positionBadge = getMatchGamePlanPositionBadgeLabel(posId);
    const photoUrl = selectedPlayer ? getMatchGamePlanPlayerPhotoUrl(selectedPlayer) : '';
    const cardLabel = selectedPlayer ? getMatchGamePlanPlayerLastName(selectedPlayer) : '';
    const badgeHtml = `<span class="match-game-plan-lineup-pos-badge" aria-hidden="true"><span class="match-game-plan-lineup-pos-badge-label">${escapeMatchHtml(positionBadge)}</span></span>`;
    const overlayHtml = buildMatchGamePlanLineupCardOverlayHtml(match, selectedPlayer);

    return `
        <div
            class="match-game-plan-lineup-card ${selectedPlayer ? 'is-filled' : 'is-empty'}${posId === 'GK' ? ' is-pitch-bottom' : ''}"
            style="top: ${coords.top}; left: ${coords.left};"
            data-game-plan-node="${escapeMatchHtml(posId)}"
        >
            <span class="match-game-plan-lineup-visual" aria-hidden="true">
                ${selectedPlayer ? `
                    <span class="match-game-plan-lineup-photo-area">
                        <span class="match-game-plan-lineup-photo">
                            ${photoUrl
                                ? `<img src="${escapeMatchHtml(photoUrl)}" alt="">`
                                : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                            ${badgeHtml}
                        </span>
                        ${overlayHtml}
                    </span>
                ` : `
                    <span class="match-game-plan-lineup-empty-slot">
                        <span class="match-game-plan-lineup-empty-add" aria-hidden="true"></span>
                        ${badgeHtml}
                    </span>
                `}
                <strong>${selectedPlayer ? escapeMatchHtml(cardLabel) : ''}</strong>
            </span>
            <button
                type="button"
                class="match-game-plan-lineup-select"
                aria-label="Velg spiller for ${escapeMatchHtml(positionLabel)}"
                onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(posId)}')"
            ></button>
        </div>
    `;
}

function collectMatchGamePlanSamspillPairs(match) {
    const formationId = getMatchGamePlanDraftFormation(match);
    const useFormationConnections = typeof window.hasMatchGamePlanSamspillConnections === 'function'
        && window.hasMatchGamePlanSamspillConnections(formationId);
    const connections = typeof window.getMatchGamePlanSamspillConnections === 'function'
        ? window.getMatchGamePlanSamspillConnections(formationId)
        : [];
    const lineup = getMatchGamePlanDraftLineup(match);
    const chemOptions = getMatchGamePlanSamspillFilter(match);

    return connections.map(([posA, posB]) => {
        const playerA = lineup[posA];
        const playerB = lineup[posB];
        if (!playerA || !playerB) return null;

        const samspill = typeof window.getDuoSamspill === 'function'
            ? window.getDuoSamspill(playerA, playerB, {
                ...chemOptions,
                posA,
                posB
            })
            : null;
        if (!samspill || (!samspill.shouldDraw && !useFormationConnections)) return null;

        return {
            posA,
            posB,
            status: samspill.status || samspill.tone,
            score: samspill.score,
            relevance: samspill.positionalRelevance,
            reason: samspill.reason || samspill.tooltip
        };
    }).filter(Boolean);
}

const matchGamePlanSamspillZonePositionsByFormation = {
    default: {
        forsvar: ['GK', 'VB', 'VMS', 'HMS', 'HB'],
        midtbane: ['DM', 'OM', 'PM'],
        angrep: ['VK', 'SP', 'PM', 'HK'],
        venstre: ['VB', 'VMS', 'OM', 'SP', 'VK'],
        sentral: ['VMS', 'HMS', 'OM', 'DM', 'SP', 'PM'],
        hoyre: ['HB', 'HMS', 'HK', 'PM', 'DM']
    },
    '4-3-3': {
        forsvar: ['GK', 'VB', 'VMS', 'HMS', 'HB'],
        midtbane: ['DM', 'OM', 'PM'],
        angrep: ['VK', 'SP', 'HK'],
        venstre: ['VB', 'VMS', 'OM', 'VK'],
        sentral: ['GK', 'VMS', 'HMS', 'DM', 'SP'],
        hoyre: ['HB', 'HMS', 'PM', 'HK']
    },
    '4-2-3-1': {
        forsvar: ['GK', 'VB', 'VMS', 'HMS', 'HB'],
        midtbane: ['OM', 'DM', 'PM'],
        angrep: ['VK', 'PM', 'HK', 'SP'],
        venstre: ['VB', 'VMS', 'OM', 'VK'],
        sentral: ['VMS', 'HMS', 'OM', 'DM', 'PM', 'SP'],
        hoyre: ['HB', 'HMS', 'DM', 'HK']
    },
    '4-5-1': {
        forsvar: ['GK', 'VB', 'VMS', 'HMS', 'HB'],
        midtbane: ['VK', 'OM', 'DM', 'PM', 'HK'],
        angrep: ['SP', 'VK', 'OM', 'PM', 'HK'],
        venstre: ['VB', 'VMS', 'VK', 'OM'],
        sentral: ['VMS', 'HMS', 'OM', 'DM', 'PM', 'SP'],
        hoyre: ['HB', 'HMS', 'HK', 'PM']
    }
};

function getMatchGamePlanSamspillZonePositions(matchOrFormationId) {
    const formationId = typeof matchOrFormationId === 'string'
        ? matchOrFormationId
        : getMatchGamePlanDraftFormation(matchOrFormationId);
    return matchGamePlanSamspillZonePositionsByFormation[formationId]
        || matchGamePlanSamspillZonePositionsByFormation.default;
}

const matchGamePlanSamspillZoneBenchCategories = {
    forsvar: ['K', 'F'],
    midtbane: ['M'],
    angrep: ['A'],
    venstre: ['F', 'M'],
    sentral: ['K', 'F', 'M', 'A'],
    hoyre: ['F', 'M', 'A']
};

function isMatchGamePlanPitchPositionInSamspillZone(posId, zoneId, match) {
    const positions = getMatchGamePlanSamspillZonePositions(match);
    return Boolean(zoneId && positions[zoneId]?.includes(posId));
}

function isMatchGamePlanBenchPlayerInSamspillZone(match, player, zoneId) {
    if (!zoneId || !player) return false;

    const pitchPosId = getMatchGamePlanPlayerPitchPosId(match, player);
    if (pitchPosId) {
        return isMatchGamePlanPitchPositionInSamspillZone(pitchPosId, zoneId, match);
    }

    const categories = matchGamePlanSamspillZoneBenchCategories[zoneId] || [];
    const category = getMatchDetailPositionCategory(player.pos1);
    return Boolean(category && categories.includes(category));
}

function getMatchGamePlanSamspillZoneFocus(match) {
    if (!match?.id) return null;
    window.matchGamePlanSamspillZoneFocus = window.matchGamePlanSamspillZoneFocus || {};
    return window.matchGamePlanSamspillZoneFocus[match.id] || null;
}

function isMatchGamePlanSamspillPairInZone(posA, posB, zoneId, match) {
    if (!zoneId) return true;
    return isMatchGamePlanPitchPositionInSamspillZone(posA, zoneId, match)
        && isMatchGamePlanPitchPositionInSamspillZone(posB, zoneId, match);
}

function setMatchGamePlanSamspillZoneFocus(match, zoneId) {
    if (!match?.id) return;
    window.matchGamePlanSamspillZoneFocus = window.matchGamePlanSamspillZoneFocus || {};
    const current = window.matchGamePlanSamspillZoneFocus[match.id];
    if (current === zoneId) {
        delete window.matchGamePlanSamspillZoneFocus[match.id];
    } else {
        getMatchGamePlanLineupOverlayState(match).samspill = true;
        window.matchGamePlanSamspillZoneFocus[match.id] = zoneId;
    }
    applyMatchGamePlanLineupOverlayClasses(match);
    syncMatchGamePlanSamspillZonePickerUi(match);
    if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
        requestAnimationFrame(() => window.drawMatchGamePlanChemistryLines(match));
    }
}

function clearMatchGamePlanSamspillZoneFocus(match) {
    if (!match?.id) return;
    window.matchGamePlanSamspillZoneFocus = window.matchGamePlanSamspillZoneFocus || {};
    delete window.matchGamePlanSamspillZoneFocus[match.id];
    applyMatchGamePlanSamspillZoneFocus(match);
    syncMatchGamePlanSamspillZonePickerUi(match);
}

function findBenchPlayerElementMatch(match, benchEl) {
    const attendingPlayers = getMatchDetailAttendingPlayers(match);
    const playerId = benchEl.dataset.playerId;
    if (playerId) {
        const byId = attendingPlayers.find(player => player.id === playerId);
        if (byId) return byId;
    }

    const pitchPos = benchEl.dataset.pitchPos;
    if (pitchPos) {
        const lineupPlayer = getMatchGamePlanDraftLineup(match)[pitchPos];
        if (lineupPlayer) return lineupPlayer;
    }

    return null;
}

const MATCH_GAME_PLAN_ZONE_DIM_FILTER = 'brightness(0.48) saturate(0.9)';

function resetMatchGamePlanSamspillZoneFocusVisualTarget(element) {
    element.querySelectorAll('.match-game-plan-lineup-photo, .match-bench-photo').forEach(photo => {
        photo.style.removeProperty('filter');
        photo.querySelectorAll('img, i').forEach(node => {
            node.style.removeProperty('filter');
            node.style.removeProperty('opacity');
        });
    });
    element.querySelectorAll('.match-game-plan-lineup-card-overlays').forEach(overlays => {
        overlays.style.removeProperty('display');
    });
}

function applyMatchGamePlanSamspillZoneFocusVisualTarget(element, zoneState, showStats) {
    const photo = element.querySelector('.match-game-plan-lineup-photo, .match-bench-photo');
    const overlays = element.querySelector('.match-game-plan-lineup-card-overlays');
    const isOnPitchBench = element.classList.contains('match-bench-player') && element.classList.contains('is-on-pitch');

    if (!zoneState) {
        resetMatchGamePlanSamspillZoneFocusVisualTarget(element);
        return;
    }

    if (zoneState === 'in') {
        if (photo) {
            photo.style.removeProperty('filter');
            photo.querySelectorAll('img, i').forEach(node => {
                node.style.removeProperty('filter');
                node.style.removeProperty('opacity');
            });
        }
        if (overlays) overlays.style.display = showStats ? 'block' : 'none';
        return;
    }

    if (isOnPitchBench) {
        if (photo) {
            photo.style.filter = MATCH_GAME_PLAN_ZONE_DIM_FILTER;
            photo.querySelectorAll('img').forEach(img => {
                img.style.filter = MATCH_GAME_PLAN_ZONE_DIM_FILTER;
            });
            photo.querySelectorAll('i').forEach(icon => {
                icon.style.removeProperty('filter');
                icon.style.removeProperty('opacity');
            });
        }
        if (overlays) overlays.style.display = 'none';
        return;
    }

    if (photo) {
        photo.style.filter = MATCH_GAME_PLAN_ZONE_DIM_FILTER;
        photo.querySelectorAll('img').forEach(img => {
            img.style.filter = MATCH_GAME_PLAN_ZONE_DIM_FILTER;
        });
    }
    if (overlays) overlays.style.display = 'none';
}

function applyMatchGamePlanSamspillZoneFocus(match) {
    const zoneId = match ? getMatchGamePlanSamspillZoneFocus(match) : null;
    const squadSection = document.querySelector('.match-detail-squad-section');
    if (!squadSection) return;

    const overlayState = match ? getMatchGamePlanLineupOverlayState(match) : {};
    const showStats = Boolean(overlayState.bidrag || overlayState.startBenk || overlayState.form);

    squadSection.classList.toggle('is-samspill-zone-focus', Boolean(zoneId));
    if (zoneId) squadSection.dataset.samspillZoneFocus = zoneId;
    else delete squadSection.dataset.samspillZoneFocus;

    const lineupBuilder = squadSection.querySelector('.match-detail-lineup-builder');
    if (lineupBuilder) {
        lineupBuilder.classList.toggle('is-samspill-zone-focus', Boolean(zoneId));
        if (zoneId) lineupBuilder.dataset.samspillZoneFocus = zoneId;
        else delete lineupBuilder.dataset.samspillZoneFocus;
    }

    squadSection.querySelectorAll('.match-detail-lineup-pitch-wrap [data-game-plan-node]').forEach(card => {
        const posId = card.dataset.gamePlanNode;
        const isFilled = card.classList.contains('is-filled');
        const inZone = Boolean(zoneId && isFilled && isMatchGamePlanPitchPositionInSamspillZone(posId, zoneId, match));
        const zoneState = zoneId && isFilled ? (inZone ? 'in' : 'out') : '';
        card.classList.toggle('is-samspill-zone-clear', inZone);
        card.classList.toggle('is-samspill-zone-out', zoneState === 'out');
        if (zoneState) card.dataset.samspillZoneState = zoneState;
        else delete card.dataset.samspillZoneState;
        applyMatchGamePlanSamspillZoneFocusVisualTarget(card, zoneState, showStats);
    });

    squadSection.querySelectorAll('.match-bench-player').forEach(benchPlayer => {
        const player = match ? findBenchPlayerElementMatch(match, benchPlayer) : null;
        const inZone = Boolean(zoneId && player && isMatchGamePlanBenchPlayerInSamspillZone(match, player, zoneId));
        const zoneState = zoneId && player ? (inZone ? 'in' : 'out') : '';
        benchPlayer.classList.toggle('is-samspill-zone-clear', inZone);
        benchPlayer.classList.toggle('is-samspill-zone-out', zoneState === 'out');
        if (zoneState) benchPlayer.dataset.samspillZoneState = zoneState;
        else delete benchPlayer.dataset.samspillZoneState;
        applyMatchGamePlanSamspillZoneFocusVisualTarget(benchPlayer, zoneState, showStats);
    });
}

function ensureMatchGamePlanSamspillAnalysisEventsBound() {
    if (window.matchGamePlanSamspillZoneFocusBound) return;

    window.matchGamePlanSamspillZoneFocusBound = true;
    document.addEventListener('click', (event) => {
        const item = event.target.closest('[data-samspill-zone-id]');
        if (!item || !item.closest('[data-samspill-analysis]')) return;

        const match = (window.activeMatches || []).find(entry => entry.id === window.activeDetailsId);
        if (!match) return;

        setMatchGamePlanSamspillZoneFocus(match, item.dataset.samspillZoneId);
        renderMatchGamePlanSamspillSummary(match);
        requestAnimationFrame(() => applyMatchGamePlanSamspillZoneFocus(match));
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const item = event.target.closest('[data-samspill-zone-id]');
        if (!item || !item.closest('[data-samspill-analysis]')) return;

        event.preventDefault();
        const match = (window.activeMatches || []).find(entry => entry.id === window.activeDetailsId);
        if (!match) return;

        setMatchGamePlanSamspillZoneFocus(match, item.dataset.samspillZoneId);
        renderMatchGamePlanSamspillSummary(match);
        requestAnimationFrame(() => applyMatchGamePlanSamspillZoneFocus(match));
    });
}

function getMatchGamePlanZonePitchPlayers(match, zoneId) {
    const positions = getMatchGamePlanSamspillZonePositions(match)[zoneId] || [];
    const lineup = getMatchGamePlanDraftLineup(match);
    const players = [];
    const seenIds = new Set();

    positions.forEach(posId => {
        const player = lineup[posId];
        if (!player?.id || seenIds.has(player.id)) return;
        seenIds.add(player.id);
        players.push(player);
    });

    return players;
}

function getMatchGamePlanZoneBenchPlayers(match, zoneId) {
    const categories = matchGamePlanSamspillZoneBenchCategories[zoneId] || [];
    const lineup = getMatchGamePlanDraftLineup(match);
    const onPitchIds = new Set(
        Object.values(lineup).filter(Boolean).map(player => player.id).filter(Boolean)
    );

    return getMatchDetailAttendingPlayers(match).filter(player => {
        if (player.id && onPitchIds.has(player.id)) return false;
        const category = getMatchDetailPositionCategory(player.pos1);
        return category && categories.includes(category);
    });
}

function averagePositiveMetricValues(values) {
    const valid = values.filter(value => value > 0);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((total, value) => total + value, 0) / valid.length);
}

function getMatchGamePlanPlayerDisplayName(player) {
    if (!player) return 'Ukjent';
    if (player.navn) return player.navn;
    if (typeof window.getPlayerNameFromRef === 'function') {
        const ref = player.id || player.ref || '';
        if (ref) {
            const name = window.getPlayerNameFromRef(ref);
            if (name) return name;
        }
    }
    return 'Ukjent';
}

function buildMatchGamePlanPlayerMetricEntries(players, match, getMetric) {
    return players.map(player => ({
        player,
        value: getMetric(player, match)
    }));
}

function getMatchGamePlanBenchSwapInsight(pitchEntries, benchEntries) {
    const pitchValues = pitchEntries.filter(entry => entry.value > 0);
    const benchCandidates = benchEntries.filter(entry => entry.value > 0);
    if (!benchCandidates.length) return null;
    if (!pitchValues.length) return { type: 'minus' };

    const currentSum = pitchValues.reduce((total, entry) => total + entry.value, 0);
    const currentAverage = currentSum / pitchValues.length;
    const worstOnPitch = Math.min(...pitchValues.map(entry => entry.value));
    const improvingBench = benchCandidates
        .filter(entry => entry.value > worstOnPitch)
        .sort((left, right) => (
            right.value - left.value
            || String(left.player?.navn || '').localeCompare(String(right.player?.navn || ''), 'nb')
        ));

    if (!improvingBench.length) return { type: 'minus' };

    const bestBench = improvingBench[0];
    const improvedAverage = (currentSum - worstOnPitch + bestBench.value) / pitchValues.length;
    const delta = Math.round(improvedAverage - currentAverage);
    if (delta <= 0) return { type: 'minus' };

    return {
        type: 'plus',
        delta,
        playerName: getMatchGamePlanPlayerDisplayName(bestBench.player)
    };
}

function buildMatchGamePlanBenchInsightHtml(insight) {
    if (!insight) return '';
    if (insight.type === 'minus') {
        return ' <span class="match-game-plan-samspill-analysis-bench-hint is-minus" title="Spillere fra kamptroppen i kategorien, men ingen som hever snittet">(−)</span>';
    }

    const playerName = escapeMatchHtml(insight.playerName);
    const title = `${insight.playerName} kan heve snittet med ca. ${insight.delta}`;
    return ` <span class="match-game-plan-samspill-analysis-bench-hint is-plus" title="${escapeMatchHtml(title)}">(+${insight.delta})</span> <span class="match-game-plan-samspill-analysis-bench-player">${playerName}</span>`;
}

function getMatchGamePlanSamspillZoneMetrics(match, zoneId) {
    const pitchPlayers = getMatchGamePlanZonePitchPlayers(match, zoneId);
    const benchPlayers = getMatchGamePlanZoneBenchPlayers(match, zoneId);
    const pitchBidragEntries = buildMatchGamePlanPlayerMetricEntries(pitchPlayers, match, getMatchGamePlanPlayerKampbidrag);
    const pitchFormEntries = buildMatchGamePlanPlayerMetricEntries(pitchPlayers, match, getMatchGamePlanPlayerForm);
    const benchBidragEntries = buildMatchGamePlanPlayerMetricEntries(benchPlayers, match, getMatchGamePlanPlayerKampbidrag);
    const benchFormEntries = buildMatchGamePlanPlayerMetricEntries(benchPlayers, match, getMatchGamePlanPlayerForm);
    const bidragAverage = averagePositiveMetricValues(pitchBidragEntries.map(entry => entry.value));
    const formAverage = averagePositiveMetricValues(pitchFormEntries.map(entry => entry.value));

    return {
        hasData: pitchPlayers.length > 0,
        bidragAverage,
        bidragInsight: getMatchGamePlanBenchSwapInsight(pitchBidragEntries, benchBidragEntries),
        formAverage,
        formInsight: getMatchGamePlanBenchSwapInsight(pitchFormEntries, benchFormEntries)
    };
}

function buildMatchGamePlanSamspillAnalysisItemHtml(zone, match) {
    const metrics = getMatchGamePlanSamspillZoneMetrics(match, zone.id);
    const selectedZoneId = getMatchGamePlanSamspillZoneFocus(match);
    const isSelected = selectedZoneId === zone.id;
    const metricsHtml = metrics.hasData
        ? `
            <p class="match-game-plan-samspill-analysis-metrics">
                <span>Bidrag: ${metrics.bidragAverage > 0 ? metrics.bidragAverage : '-'}${buildMatchGamePlanBenchInsightHtml(metrics.bidragInsight)}</span>
                <span class="match-game-plan-samspill-analysis-metrics-sep">·</span>
                <span>Form: ${metrics.formAverage > 0 ? metrics.formAverage : '-'}${buildMatchGamePlanBenchInsightHtml(metrics.formInsight)}</span>
            </p>
        `
        : '';

    return `
        <li
            class="match-game-plan-samspill-analysis-item is-${escapeMatchHtml(zone.status)}${isSelected ? ' is-zone-selected' : ''}"
            data-samspill-zone-id="${escapeMatchHtml(zone.id)}"
            role="button"
            tabindex="0"
            aria-pressed="${isSelected ? 'true' : 'false'}"
            aria-current="${isSelected ? 'true' : 'false'}"
        >
            <div class="match-game-plan-samspill-analysis-row">
                <span class="match-game-plan-samspill-analysis-name">
                    ${escapeMatchHtml(zone.label)}
                    ${isSelected ? '<span class="match-game-plan-samspill-analysis-selected-badge">Valgt</span>' : ''}
                </span>
                <span class="match-game-plan-samspill-analysis-status">${escapeMatchHtml(zone.statusLabel)}</span>
            </div>
            ${metricsHtml}
            <p class="match-game-plan-samspill-analysis-text">${escapeMatchHtml(zone.explanation)}</p>
        </li>
    `;
}

function buildMatchGamePlanSamspillAnalysisGroupHtml(title, zones, match) {
    if (!zones.length) return '';

    return `
        <div class="match-game-plan-samspill-analysis-group">
            <div class="match-game-plan-samspill-analysis-group-title">${escapeMatchHtml(title)}</div>
            <ul class="match-game-plan-samspill-analysis-list">
                ${zones.map(zone => buildMatchGamePlanSamspillAnalysisItemHtml(zone, match)).join('')}
            </ul>
        </div>
    `;
}

function buildMatchGamePlanSamspillAnalysisHtml(match) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const chemOptions = {
        ...getMatchGamePlanSamspillFilter(match),
        formationId: getMatchGamePlanDraftFormation(match)
    };
    const analysis = typeof window.buildSamspillZoneAnalysis === 'function'
        ? window.buildSamspillZoneAnalysis(lineup, chemOptions)
        : { rows: [], corridors: [], isEmpty: true };

    if (analysis.isEmpty) {
        return `
            <p class="match-game-plan-samspill-analysis-empty">
                Plasser spillere i 11eren for å se samspillanalyse.
            </p>
        `;
    }

    const selectedZoneId = getMatchGamePlanSamspillZoneFocus(match);

    return `
        <div class="match-game-plan-samspill-analysis-body${selectedZoneId ? ' has-zone-focus' : ''}">
            ${buildMatchGamePlanSamspillAnalysisGroupHtml('Rekker', analysis.rows, match)}
            ${buildMatchGamePlanSamspillAnalysisGroupHtml('Korridorer', analysis.corridors, match)}
        </div>
    `;
}

function buildMatchGamePlanSamspillPanelsShellHtml() {
    return `
        <div class="match-game-plan-samspill-panels" data-samspill-panels>
            <section class="match-game-plan-samspill-analysis" data-samspill-analysis aria-label="Samspillanalyse">
                <h4 class="match-game-plan-samspill-analysis-title">Samspillanalyse</h4>
            </section>
        </div>
    `;
}

function renderMatchGamePlanSamspillSummary(match) {
    ensureMatchGamePlanSamspillPanelsDom();
    ensureMatchGamePlanSamspillAnalysisEventsBound();

    const analysisEl = document.querySelector('[data-samspill-analysis]');
    if (!analysisEl) return;

    const selectedZoneId = getMatchGamePlanSamspillZoneFocus(match);
    const selectedOption = selectedZoneId
        ? matchGamePlanSamspillZoneOptions.find(option => option.id === selectedZoneId)
        : null;
    const titleText = selectedOption
        ? `Samspillanalyse · ${selectedOption.label}`
        : 'Samspillanalyse';

    analysisEl.classList.toggle('has-zone-focus', Boolean(selectedZoneId));
    analysisEl.innerHTML = `
        <h4 class="match-game-plan-samspill-analysis-title">${escapeMatchHtml(titleText)}</h4>
        ${buildMatchGamePlanSamspillAnalysisHtml(match)}
    `;
    applyMatchGamePlanSamspillZoneFocus(match);
}

function buildMatchGamePlanStarterFooterHtml(match) {
    return `
        <div class="match-game-plan-lineup-footer">
            <p class="match-game-plan-samspill-hint" data-samspill-hint hidden></p>
            <p class="match-inline-status match-game-plan-lineup-save-state" data-lineup-save-state aria-live="polite" hidden></p>
        </div>
        ${buildMatchGamePlanSamspillPanelsShellHtml()}
    `;
}

function buildMatchGamePlanStarter11Html(match, extraClass = '') {
    const isCompact = extraClass.includes('match-detail-lineup-pitch-wrap');
    if (isCompact) {
        const formation = matchGamePlanFormations[getMatchGamePlanDraftFormation(match)] || matchGamePlanFormations['4-2-4'];
        const pitchHtml = buildMatchGamePlanPitchHtml({
            ariaLabel: '11er bane',
            extraClass: `${extraClass} match-game-plan-starter11-wrap`,
            childrenHtml: `
                <svg class="match-game-plan-chemistry-lines" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
                ${Object.entries(formation.positions).map(([posId, coords]) => `
                    ${buildMatchGamePlanStarterCardNodeHtml(match, posId, coords)}
                `).join('')}
            `
        });

        return `
            <div class="${getMatchGamePlanLineupBuilderClass(match)}">
                ${buildMatchGamePlanLineupToolbarHtml(match)}
                ${pitchHtml}
                ${buildMatchGamePlanStarterFooterHtml(match)}
            </div>
        `;
    }

    return buildMatchGamePlanPitchHtml({
        ariaLabel: '11er bane',
        extraClass,
        childrenHtml: Object.entries(matchGamePlanStarterPositions).map(([posId, coords]) => `
            ${buildMatchGamePlanNodeHtml(match, posId, coords)}
        `).join('')
    });
}

function buildMatchGamePlanDiagramNodeHtml(value, coords, planLabel = 'OffC') {
    return `
        <span
            class="match-game-plan-diagram-node is-${escapeMatchHtml(coords.tone || 'neutral')}"
            style="top: ${coords.top}; left: ${coords.left};"
            aria-label="${escapeMatchHtml(planLabel)} ${escapeMatchHtml(value)}"
        >${escapeMatchHtml(value)}</span>
    `;
}

function buildMatchGamePlanBallMarkerHtml(coords, planLabel = 'DefC') {
    return `
        <span
            class="match-game-plan-ball-marker"
            style="top: ${coords.top}; left: ${coords.left};"
            aria-label="${escapeMatchHtml(planLabel)} ball"
        >
            <i class="fa-regular fa-futbol" aria-hidden="true"></i>
        </span>
    `;
}

function getMatchGamePlanStarterPlayerValue(player) {
    return player?.id || player?.navn || '';
}

function findMatchGamePlanStarterPlayerByValue(starterPlayers, value) {
    if (!value) return null;
    return starterPlayers.find(({ player }) => getMatchGamePlanStarterPlayerValue(player) === value)?.player || null;
}

function buildMatchGamePlanRoleSlotAvatarHtml(player) {
    const photoUrl = player ? getMatchGamePlanPlayerPhotoUrl(player) : '';
    if (photoUrl) {
        return `
            <span class="match-game-plan-role-avatar is-photo" data-role-avatar aria-hidden="true">
                <img src="${escapeMatchHtml(photoUrl)}" alt="" loading="lazy" decoding="async">
            </span>
        `;
    }

    return `
        <span class="match-game-plan-role-avatar is-empty" data-role-avatar aria-hidden="true">
            <i class="fa-solid fa-user" aria-hidden="true"></i>
        </span>
    `;
}

function buildMatchGamePlanOffCSelectHtml(match, slot, starterPlayers, planId = 'offc') {
    const assignments = getMatchGamePlanSetPieceAssignments(match, planId);
    const storedSelectedValue = assignments[slot] || '';
    const selectedValue = starterPlayers.some(({ player }) => getMatchGamePlanStarterPlayerValue(player) === storedSelectedValue)
        ? storedSelectedValue
        : '';
    const selectedPlayer = findMatchGamePlanStarterPlayerByValue(starterPlayers, selectedValue);
    const planLabel = planId === 'defc' ? 'DefC' : (planId === 'roller' ? 'Roller' : 'OffC');
    const slotLabel = planId === 'roller' ? getMatchGamePlanRoleLabel(slot) : slot;

    return `
        <label class="match-game-plan-offc-select-field has-role-avatar">
            <span class="match-game-plan-offc-select-number">${escapeMatchHtml(slotLabel)}</span>
            ${buildMatchGamePlanRoleSlotAvatarHtml(selectedPlayer)}
            <select
                class="match-game-plan-offc-select ${selectedValue ? '' : 'is-empty'}"
                aria-label="Velg spiller for ${escapeMatchHtml(planLabel)} ${escapeMatchHtml(slot)}"
                title="${escapeMatchHtml(planId === 'roller' ? `${slot}: ${slotLabel}` : `${planLabel} ${slot}`)}"
                onchange="this.classList.toggle('is-empty', !this.value); window.syncMatchGamePlanRoleSelectAvatar(this); window.updateMatchGamePlanSetPiecePlayer('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(planId)}', '${escapeMatchJsString(slot)}', this.value)"
            >
                <option value="">Velg spiller</option>
                ${starterPlayers.map(({ player }) => {
                    const value = getMatchGamePlanStarterPlayerValue(player);
                    const label = getMatchGamePlanPlayerShortName(player);
                    return `<option value="${escapeMatchHtml(value)}" ${selectedValue === value ? 'selected' : ''}>${escapeMatchHtml(label)}</option>`;
                }).join('')}
            </select>
        </label>
    `;
}

function buildMatchGamePlanOffCControlsHtml(match, planId = 'offc', options = {}) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const formationId = getMatchGamePlanDraftFormation(match);
    const starterPlayers = getMatchGamePlanFormationPositionIds(formationId)
        .map(posId => ({ posId, player: lineup[posId] }))
        .filter(item => item.player);
    const slots = options.slots || ['1', '6', '2', '7', '3', '8', '4', '9', '5', '10'];
    const planLabel = planId === 'defc' ? 'DefC' : (planId === 'roller' ? 'Roller' : 'OffC');
    const extraClass = options.className ? ` ${options.className}` : '';
    const heading = planId === 'offc'
        ? 'Offensiv corner'
        : planId === 'defc'
            ? 'Defensiv corner'
            : planId === 'roller'
                ? 'Roller'
                : '';
    const headingIcon = planId === 'roller' ? 'fa-users' : 'fa-flag-checkered';

    return `
        <div class="match-game-plan-offc-controls${extraClass}" aria-label="${escapeMatchHtml(planLabel)} spillervalg">
            ${heading ? `
                <h3 class="match-game-plan-setpiece-heading">
                    <i class="fa-solid ${headingIcon}" aria-hidden="true"></i>
                    <span>${escapeMatchHtml(heading)}</span>
                </h3>
            ` : ''}
            ${slots.map(slot => buildMatchGamePlanOffCSelectHtml(match, slot, starterPlayers, planId)).join('')}
        </div>
    `;
}

function getMatchGamePlanBenchPlayers(match) {
    const lineup = getMatchGamePlanDraftLineup(match);
    return getMatchGamePlanSelectablePlayers(match)
        .filter(player => !Object.values(lineup).some(lineupPlayer => matchGamePlanSamePlayer(lineupPlayer, player)))
        .sort((a, b) => {
            const jerseyA = Number(a.drakt || a.draktnummer) || 999;
            const jerseyB = Number(b.drakt || b.draktnummer) || 999;
            return jerseyA - jerseyB || a.navn.localeCompare(b.navn);
        });
}

function buildMatchGamePlanBenchPlanHtml(match) {
    const benchPlayers = getMatchGamePlanBenchPlayers(match);

    if (!benchPlayers.length) {
        return `
            <div class="match-game-plan-bench-panel" aria-label="Planlagte innbytter">
                <h3 class="match-game-plan-setpiece-heading">
                    <i class="fa-solid fa-right-left" aria-hidden="true"></i>
                    <span>Bytteplan</span>
                </h3>
                <div class="match-game-plan-bench-empty">
                    <i class="fa-solid fa-users-slash" aria-hidden="true"></i>
                    <span>Ingen innbyttere å planlegge – alle møtt opp er i 11eren.</span>
                </div>
            </div>
        `;
    }

    const benchItems = benchPlayers
        .map(player => {
            const playerKey = getMatchGamePlanStarterPlayerValue(player);
            const assignment = getMatchGamePlanBenchAssignment(match, playerKey);
            return {
                player,
                playerKey,
                assignment,
                minuteValue: Number(assignment.minute) || 999,
                isComplete: Boolean(assignment.minute && assignment.position)
            };
        })
        .sort((a, b) => {
            if (a.assignment.minute && !b.assignment.minute) return -1;
            if (!a.assignment.minute && b.assignment.minute) return 1;
            if (a.minuteValue !== b.minuteValue) return a.minuteValue - b.minuteValue;

            const jerseyA = Number(a.player.drakt || a.player.draktnummer) || 999;
            const jerseyB = Number(b.player.drakt || b.player.draktnummer) || 999;
            return jerseyA - jerseyB || a.player.navn.localeCompare(b.player.navn);
        });
    const hasUnsavedBenchChanges = window.dirtyMatchGamePlanBenchMatchIds?.has(match.id) || false;

    return `
        <div class="match-game-plan-bench-panel" aria-label="Planlagte innbytter">
            <div class="match-game-plan-bench-heading">
                <h3 class="match-game-plan-setpiece-heading">
                    <i class="fa-solid fa-right-left" aria-hidden="true"></i>
                    <span>Bytteplan</span>
                    <button
                        type="button"
                        class="training-session-attendance-add-btn match-game-plan-bench-save-btn ${hasUnsavedBenchChanges ? 'is-dirty' : ''}"
                        data-bench-save-match-id="${escapeMatchHtml(match.id)}"
                        onclick="event.preventDefault(); event.stopPropagation(); window.saveMatchGamePlanBenchPlan('${escapeMatchJsString(match.id)}')"
                        title="${hasUnsavedBenchChanges ? 'Ulagrede endringer i bytteplan' : 'Lagre bytteplan'}"
                        aria-label="${hasUnsavedBenchChanges ? 'Lagre ulagrede endringer' : 'Lagre bytteplan'}"
                    >
                        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                        <span class="match-game-plan-bench-save-label">${hasUnsavedBenchChanges ? 'Lagre' : 'Lagre'}</span>
                    </button>
                </h3>
            </div>
            <div class="match-game-plan-bench-list">
                ${benchItems.map(({ player, playerKey, assignment, isComplete }) => {
                    const jersey = player.drakt || player.draktnummer || '-';
                    const jerseySort = Number(player.drakt || player.draktnummer) || 999;
                    const isPlanned = Boolean(assignment.minute || assignment.position);
                    return `
                        <div
                            class="match-game-plan-offc-select-field has-role-avatar match-game-plan-bench-row ${isComplete ? 'is-complete' : ''}"
                            data-bench-player-ref="${escapeMatchHtml(playerKey)}"
                            data-bench-minute="${escapeMatchHtml(assignment.minute || '')}"
                            data-bench-position="${escapeMatchHtml(assignment.position || '')}"
                            data-bench-jersey-sort="${jerseySort}"
                            data-bench-name-sort="${escapeMatchHtml(player.navn)}"
                        >
                            <span class="match-game-plan-offc-select-number">${escapeMatchHtml(jersey)}</span>
                            ${buildMatchGamePlanRoleSlotAvatarHtml(player)}
                            <span class="match-game-plan-bench-name">${escapeMatchHtml(getMatchGamePlanPlayerShortName(player))}</span>
                            <span class="match-game-plan-bench-select-wrap">
                                <select
                                    class="match-game-plan-offc-select match-game-plan-bench-select ${assignment.minute ? '' : 'is-empty'}"
                                    aria-label="Planlagt innbytte for ${escapeMatchHtml(player.navn)}"
                                    onchange="this.classList.toggle('is-empty', !this.value); window.updateMatchGamePlanBenchMinute('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(playerKey)}', this.value)"
                                >
                                    <option value="">TID</option>
                                    ${matchGamePlanBenchMinutes.map(minute => `<option value="${minute}" ${assignment.minute === minute ? 'selected' : ''}>${minute}'</option>`).join('')}
                                </select>
                            </span>
                            <span class="match-game-plan-bench-select-wrap">
                                <select
                                    class="match-game-plan-offc-select match-game-plan-bench-select ${assignment.position ? '' : 'is-empty'}"
                                    aria-label="Planlagt posisjon for ${escapeMatchHtml(player.navn)}"
                                    onchange="this.classList.toggle('is-empty', !this.value); window.updateMatchGamePlanBenchPosition('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(playerKey)}', this.value)"
                                >
                                    <option value="">POS</option>
                                    ${Object.keys(matchGamePlanStarterPositions).map(posId => `<option value="${escapeMatchHtml(posId)}" ${assignment.position === posId ? 'selected' : ''}>${escapeMatchHtml(posId)}</option>`).join('')}
                                </select>
                            </span>
                            <button
                                type="button"
                                class="bsk-btn bsk-btn-icon bsk-btn-ghost match-game-plan-bench-clear-btn"
                                onclick="window.clearMatchGamePlanBenchAssignment('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(playerKey)}')"
                                title="Nullstill bytte for ${escapeMatchHtml(player.navn)}"
                                aria-label="Nullstill bytte for ${escapeMatchHtml(player.navn)}"
                                ${isPlanned ? '' : 'disabled'}
                            >
                                <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function sortMatchGamePlanBenchRows(list) {
    if (!list) return;

    [...list.querySelectorAll('.match-game-plan-bench-row')]
        .sort((a, b) => {
            const aHasMinute = Boolean(a.dataset.benchMinute);
            const bHasMinute = Boolean(b.dataset.benchMinute);
            if (aHasMinute && !bHasMinute) return -1;
            if (!aHasMinute && bHasMinute) return 1;

            const minuteA = Number(a.dataset.benchMinute) || 999;
            const minuteB = Number(b.dataset.benchMinute) || 999;
            if (minuteA !== minuteB) return minuteA - minuteB;

            const jerseyA = Number(a.dataset.benchJerseySort) || 999;
            const jerseyB = Number(b.dataset.benchJerseySort) || 999;
            return jerseyA - jerseyB || String(a.dataset.benchNameSort || '').localeCompare(String(b.dataset.benchNameSort || ''));
        })
        .forEach(row => list.appendChild(row));
}

function getMatchGamePlanBenchSaveButton(matchId) {
    return [...document.querySelectorAll('[data-bench-save-match-id]')]
        .find(button => button.dataset.benchSaveMatchId === matchId);
}

function setMatchGamePlanBenchDirty(matchId, isDirty = true) {
    window.dirtyMatchGamePlanBenchMatchIds = window.dirtyMatchGamePlanBenchMatchIds || new Set();
    if (isDirty) {
        window.dirtyMatchGamePlanBenchMatchIds.add(matchId);
    } else {
        window.dirtyMatchGamePlanBenchMatchIds.delete(matchId);
    }
    updateMatchGamePlanBenchSaveState(matchId);
}

function updateMatchGamePlanBenchSaveState(matchId) {
    const isDirty = window.dirtyMatchGamePlanBenchMatchIds?.has(matchId) || false;
    const saveButton = getMatchGamePlanBenchSaveButton(matchId);
    if (!saveButton) return;

    if (saveButton._savedTimer) {
        clearTimeout(saveButton._savedTimer);
        saveButton._savedTimer = null;
    }

    saveButton.disabled = false;
    saveButton.classList.toggle('is-dirty', isDirty);
    saveButton.classList.remove('is-saving', 'is-saved');
    const icon = saveButton.querySelector('i');
    const label = saveButton.querySelector('.match-game-plan-bench-save-label') || saveButton.querySelector('span');
    if (icon) icon.className = 'fa-solid fa-floppy-disk';
    if (label) label.textContent = 'Lagre';
    saveButton.title = isDirty ? 'Ulagrede endringer i bytteplan' : 'Lagre bytteplan';
    saveButton.setAttribute('aria-label', isDirty ? 'Lagre ulagrede endringer' : 'Lagre bytteplan');
}

function showMatchGamePlanBenchSavedConfirmation(matchId) {
    const saveButton = getMatchGamePlanBenchSaveButton(matchId);
    if (!saveButton) return;

    if (saveButton._savedTimer) {
        clearTimeout(saveButton._savedTimer);
        saveButton._savedTimer = null;
    }

    const icon = saveButton.querySelector('i');
    const label = saveButton.querySelector('.match-game-plan-bench-save-label') || saveButton.querySelector('span');
    saveButton.disabled = false;
    saveButton.classList.remove('is-dirty', 'is-saving');
    saveButton.classList.add('is-saved');
    if (icon) icon.className = 'fa-solid fa-check';
    if (label) label.textContent = 'Lagret';
    saveButton.title = 'Bytteplan lagret';
    saveButton.setAttribute('aria-label', 'Bytteplan lagret');

    saveButton._savedTimer = setTimeout(() => {
        saveButton._savedTimer = null;
        if (!saveButton.isConnected) return;
        saveButton.classList.remove('is-saved');
        updateMatchGamePlanBenchSaveState(matchId);
    }, 2200);
}

window.syncMatchGamePlanBenchPanel = function(match) {
    const panel = document.querySelector('[data-game-plan-page="bench"] .match-game-plan-bench-panel');
    const list = panel?.querySelector('.match-game-plan-bench-list');
    if (!panel || !list || !match) return;

    const scrollTop = panel.scrollTop;
    const benchItems = getMatchGamePlanBenchPlayers(match).map(player => {
        const playerKey = getMatchGamePlanStarterPlayerValue(player);
        const assignment = getMatchGamePlanBenchAssignment(match, playerKey);
        return {
            playerKey,
            assignment,
            isComplete: Boolean(assignment.minute && assignment.position)
        };
    });

    benchItems.forEach(({ playerKey, assignment, isComplete }) => {
        const row = [...list.querySelectorAll('.match-game-plan-bench-row')]
            .find(item => item.dataset.benchPlayerRef === playerKey);
        if (!row) return;

        const isPlanned = Boolean(assignment.minute || assignment.position);
        const clearButton = row.querySelector('.match-game-plan-bench-clear-btn');
        row.dataset.benchMinute = assignment.minute || '';
        row.dataset.benchPosition = assignment.position || '';
        row.classList.toggle('is-complete', isComplete);

        if (clearButton) {
            clearButton.disabled = !isPlanned;
        }

        const selects = row.querySelectorAll('.match-game-plan-bench-select');
        if (selects[0]) {
            selects[0].value = assignment.minute || '';
            selects[0].classList.toggle('is-empty', !assignment.minute);
        }
        if (selects[1]) {
            selects[1].value = assignment.position || '';
            selects[1].classList.toggle('is-empty', !assignment.position);
        }
    });

    sortMatchGamePlanBenchRows(list);
    updateMatchGamePlanBenchSaveState(match.id);
    panel.scrollTop = scrollTop;
    requestAnimationFrame(() => {
        panel.scrollTop = scrollTop;
    });
};

function buildMatchGamePlanPitchLinesHtml() {
    return `
        <div class="match-game-plan-pitch-halfway"></div>
        <div class="match-game-plan-pitch-center-circle"></div>
        <div class="match-game-plan-pitch-box match-game-plan-pitch-box-bottom"></div>
        <div class="match-game-plan-pitch-arc match-game-plan-pitch-arc-bottom"></div>
        <div class="match-game-plan-pitch-goal match-game-plan-pitch-goal-bottom"></div>
        <div class="match-game-plan-pitch-box match-game-plan-pitch-box-top"></div>
        <div class="match-game-plan-pitch-arc match-game-plan-pitch-arc-top"></div>
        <div class="match-game-plan-pitch-goal match-game-plan-pitch-goal-top"></div>
    `;
}

function buildMatchGamePlanPitchHtml({ ariaLabel, childrenHtml = '', extraClass = '' }) {
    const className = ['match-game-plan-pitch-wrap', extraClass].filter(Boolean).join(' ');
    return `
        <div class="${className}">
            <div class="tactical-pitch match-game-plan-pitch" aria-label="${escapeMatchHtml(ariaLabel)}">
                ${buildMatchGamePlanPitchLinesHtml()}
                ${childrenHtml}
            </div>
        </div>
    `;
}

function buildMatchGamePlanOffCHtml(match) {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'OffC bane',
        childrenHtml: Object.entries(matchGamePlanOffCPositions).map(([value, coords]) => `
            ${buildMatchGamePlanDiagramNodeHtml(value, coords, 'OffC')}
        `).join('') + buildMatchGamePlanOffCControlsHtml(match, 'offc')
    });
}

function buildMatchGamePlanDefCHtml(match) {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'DefC bane',
        childrenHtml: Object.entries(matchGamePlanDefCPositions).map(([value, coords]) => `
            ${buildMatchGamePlanDiagramNodeHtml(value, coords, 'DefC')}
        `).join('') + buildMatchGamePlanBallMarkerHtml({ top: '3%', left: '95%' }, 'DefC') + buildMatchGamePlanOffCControlsHtml(match, 'defc')
    });
}

function buildMatchGamePlanRolesHtml(match) {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'Roller bane',
        childrenHtml: buildMatchGamePlanOffCControlsHtml(match, 'roller', {
            slots: matchGamePlanRoleSlots,
            className: 'match-game-plan-role-controls'
        })
    });
}

function buildMatchGamePlanBenchHtml(match) {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'Bytteplan bane',
        extraClass: 'match-game-plan-bench-wrap',
        childrenHtml: buildMatchGamePlanBenchPlanHtml(match)
    });
}

function renderMatchGamePlanSetPiecePage(match, planId) {
    const page = document.querySelector(`[data-game-plan-page="${planId}"]`);
    if (!page) return;

    if (planId === 'defc') {
        page.innerHTML = buildMatchGamePlanDefCHtml(match);
        return;
    }

    if (planId === 'roller') {
        page.innerHTML = buildMatchGamePlanRolesHtml(match);
        return;
    }

    page.innerHTML = buildMatchGamePlanOffCHtml(match);
}

function renderMatchGamePlanOffCPage(match) {
    renderMatchGamePlanSetPiecePage(match, 'offc');
}

function renderMatchGamePlanDefCPage(match) {
    renderMatchGamePlanSetPiecePage(match, 'defc');
}

function renderMatchGamePlanRolesPage(match) {
    renderMatchGamePlanSetPiecePage(match, 'roller');
}

function renderMatchGamePlanBenchPage(match) {
    const page = document.querySelector('[data-game-plan-page="bench"]');
    if (!page) return;
    page.innerHTML = buildMatchGamePlanBenchHtml(match);
}

function syncMatchGamePlanLineupOverlayUi(match) {
    applyMatchGamePlanLineupOverlayClasses(match);

    const builder = document.querySelector('.match-detail-lineup-builder');
    if (!builder) {
        renderMatchGamePlanSamspillSummary(match);
        return;
    }

    syncMatchGamePlanLineupViewSegmentUi(match);
    renderMatchGamePlanSamspillSummary(match);
    syncMatchGamePlanLineupSaveState(match);
    syncMatchGamePlanSamspillHint(match);
    syncMatchGamePlanSamspillZonePickerUi(match);
}

function renderMatchGamePlanStarter11Page(match) {
    document.querySelectorAll('.match-detail-squad-lineup > .match-detail-lineup-builder, .match-detail-squad-lineup > .match-detail-lineup-pitch-wrap').forEach(wrap => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildMatchGamePlanStarter11Html(match, 'match-detail-lineup-pitch-wrap').trim();
        wrap.replaceWith(wrapper.firstElementChild);
    });
    renderMatchDetailSquadList(match);
    syncMatchGamePlanLineupOverlayUi(match);
    requestAnimationFrame(() => {
        syncMatchDetailSquadCardSizeToPitch();
        if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
            window.drawMatchGamePlanChemistryLines(match);
        }
    });

    if (!window.matchGamePlanChemistryResizeBound) {
        window.matchGamePlanChemistryResizeBound = true;
        window.addEventListener('resize', () => {
            syncMatchDetailSquadCardSizeToPitch();
            const activeMatch = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
            if (activeMatch && typeof window.drawMatchGamePlanChemistryLines === 'function') {
                window.drawMatchGamePlanChemistryLines(activeMatch);
            }
        });
    }
}

window.setMatchGamePlanSamspillZoneSelection = function(matchId, zoneId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const overlayState = getMatchGamePlanLineupOverlayState(match);
    window.matchGamePlanSamspillZoneFocus = window.matchGamePlanSamspillZoneFocus || {};

    if (zoneId === 'av') {
        overlayState.samspill = false;
        delete window.matchGamePlanSamspillZoneFocus[match.id];
    } else if (!zoneId || zoneId === 'alle') {
        overlayState.samspill = true;
        delete window.matchGamePlanSamspillZoneFocus[match.id];
    } else if (getMatchGamePlanSamspillZonePositions(match)[zoneId]) {
        overlayState.samspill = true;
        window.matchGamePlanSamspillZoneFocus[match.id] = zoneId;
    }

    syncMatchGamePlanLineupOverlayUi(match);

    if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
        window.drawMatchGamePlanChemistryLines(match);
    }
};

window.setMatchGamePlanLineupStatsMenuSelection = function(matchId, optionId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const overlayState = getMatchGamePlanLineupOverlayState(match);

    if (optionId === 'av') {
        matchGamePlanLineupOverlayOptions.forEach(option => {
            overlayState[option.id] = false;
        });
    } else if (matchGamePlanLineupOverlayOptions.some(option => option.id === optionId)) {
        overlayState[optionId] = !overlayState[optionId];
    }

    syncMatchGamePlanLineupOverlayUi(match);

    if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
        window.drawMatchGamePlanChemistryLines(match);
    }
};

window.toggleMatchGamePlanLineupView = function(matchId, viewKey) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || !viewKey) return;

    const overlayState = getMatchGamePlanLineupOverlayState(match);

    if (viewKey === 'samspill') {
        overlayState.samspill = !overlayState.samspill;
        if (!overlayState.samspill) {
            clearMatchGamePlanSamspillZoneFocus(match);
        }
    } else if (matchGamePlanLineupOverlayOptions.some(option => option.id === viewKey)) {
        overlayState[viewKey] = !overlayState[viewKey];
    } else {
        return;
    }

    syncMatchGamePlanLineupOverlayUi(match);

    if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
        window.drawMatchGamePlanChemistryLines(match);
    }
};

window.toggleMatchGamePlanLineupOverlay = function(matchId, overlayKey) {
    window.toggleMatchGamePlanLineupView(matchId, overlayKey);
};

function ensureMatchGamePlanSamspillLabelLayer(pitch) {
    let layer = pitch.querySelector('[data-samspill-line-labels]');
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'match-game-plan-samspill-line-labels';
        layer.dataset.samspillLineLabels = '';
        layer.setAttribute('aria-hidden', 'true');
        pitch.appendChild(layer);
    }
    return layer;
}

function clearMatchGamePlanSamspillLineLabels(pitch) {
    const layer = pitch?.querySelector('[data-samspill-line-labels]');
    if (layer) layer.innerHTML = '';
}

function getMatchGamePlanPitchValueTextStyle(builder) {
    const photo = builder?.querySelector(
        '.match-detail-lineup-pitch-wrap .match-game-plan-lineup-card.is-filled .match-game-plan-lineup-photo-area'
    );
    if (!photo) return null;

    const probe = document.createElement('span');
    probe.className = 'match-game-plan-lineup-card-overlay match-game-plan-lineup-card-overlay-bidrag';
    probe.textContent = '0';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.setProperty('display', 'inline-flex', 'important');
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    probe.style.left = '50%';
    probe.style.top = '50%';
    probe.style.pointerEvents = 'none';
    photo.appendChild(probe);

    const computed = window.getComputedStyle(probe);
    const textStyle = {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        letterSpacing: computed.letterSpacing,
        lineHeight: computed.lineHeight,
        color: computed.color,
        textShadow: computed.textShadow,
        fontFamily: computed.fontFamily
    };

    probe.remove();
    return textStyle;
}

function applyMatchGamePlanPitchValueTextStyle(element, textStyle) {
    if (!textStyle) return;
    element.style.fontSize = textStyle.fontSize;
    element.style.fontWeight = textStyle.fontWeight;
    element.style.letterSpacing = textStyle.letterSpacing;
    element.style.lineHeight = textStyle.lineHeight;
    element.style.color = textStyle.color;
    element.style.textShadow = textStyle.textShadow;
    element.style.fontFamily = textStyle.fontFamily;
}

function renderMatchGamePlanSamspillLineLabels(pitch, pairResults, textStyle) {
    const layer = ensureMatchGamePlanSamspillLabelLayer(pitch);
    layer.innerHTML = '';

    const positions = typeof window.getSamspillScoreLabelPositions === 'function'
        ? window.getSamspillScoreLabelPositions(pairResults.map(entry => entry.coords))
        : pairResults.map(entry => ({
            x: (entry.coords.x1 + entry.coords.x2) / 2,
            y: (entry.coords.y1 + entry.coords.y2) / 2
        }));

    pairResults.forEach((entry, index) => {
        const point = positions[index] || {
            x: (entry.coords.x1 + entry.coords.x2) / 2,
            y: (entry.coords.y1 + entry.coords.y2) / 2
        };
        const score = Number(entry.samspill?.score) || 0;
        const status = entry.samspill?.status || entry.samspill?.tone || 'unknown';
        const label = document.createElement('span');
        label.className = `match-game-plan-samspill-line-score is-tone-${status}`;
        label.style.left = `${point.x}%`;
        label.style.top = `${point.y}%`;
        label.textContent = score > 0 ? String(score) : '–';
        if (textStyle) {
            label.style.fontSize = textStyle.fontSize;
            label.style.fontWeight = textStyle.fontWeight;
            label.style.letterSpacing = textStyle.letterSpacing;
            label.style.fontFamily = textStyle.fontFamily;
        }
        layer.appendChild(label);
    });
}

window.drawMatchGamePlanChemistryLines = function(match) {
    const builder = document.querySelector('.match-detail-lineup-builder');
    const svg = builder?.querySelector('.match-game-plan-chemistry-lines');
    const pitch = builder?.querySelector('.match-game-plan-pitch');
    const overlayState = getMatchGamePlanLineupOverlayState(match);
    const samspillVisible = isMatchGamePlanSamspillSummaryVisible(builder, overlayState);

    renderMatchGamePlanSamspillSummary(match);
    if (svg) svg.innerHTML = '';
    clearMatchGamePlanSamspillLineLabels(pitch);
    if (!svg || !pitch || !samspillVisible) return;

    const pitchRect = pitch.getBoundingClientRect();
    if (!pitchRect.width || !pitchRect.height) return;

    const zoneId = getMatchGamePlanSamspillZoneFocus(match);
    const pairResults = collectMatchGamePlanSamspillPairs(match)
        .filter(pair => isMatchGamePlanSamspillPairInZone(pair.posA, pair.posB, zoneId, match))
        .map(pair => {
        const cardA = builder.querySelector(`[data-game-plan-node="${pair.posA}"]`);
        const cardB = builder.querySelector(`[data-game-plan-node="${pair.posB}"]`);
        if (!cardA || !cardB) return null;

        const rectA = cardA.getBoundingClientRect();
        const rectB = cardB.getBoundingClientRect();

        return {
            samspill: {
                status: pair.status,
                tone: pair.status,
                score: pair.score,
                reason: pair.reason,
                tooltip: pair.reason,
                positionalRelevance: pair.relevance
            },
            relevance: pair.relevance,
            coords: {
                x1: ((rectA.left + rectA.width / 2 - pitchRect.left) / pitchRect.width) * 100,
                y1: ((rectA.top + rectA.height / 2 - pitchRect.top) / pitchRect.height) * 100,
                x2: ((rectB.left + rectB.width / 2 - pitchRect.left) / pitchRect.width) * 100,
                y2: ((rectB.top + rectB.height / 2 - pitchRect.top) / pitchRect.height) * 100
            }
        };
    }).filter(Boolean);

    const formationId = getMatchGamePlanDraftFormation(match);
    const useFormationConnections = typeof window.hasMatchGamePlanSamspillConnections === 'function'
        && window.hasMatchGamePlanSamspillConnections(formationId);

    const drawnPairs = pairResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, useFormationConnections ? pairResults.length : 14);

    drawnPairs.forEach(entry => {
        if (typeof window.appendSamspillLine !== 'function') return;

        window.appendSamspillLine(svg, entry.coords, entry.samspill, {
            context: 'match-plan',
            showScoreLabel: false
        });
    });

    renderMatchGamePlanSamspillLineLabels(
        pitch,
        drawnPairs,
        getMatchGamePlanPitchValueTextStyle(builder)
    );
};

function buildMatchGamePlanTabContentHtml(match, tab) {
    if (tab.id === 'offc') {
        return buildMatchGamePlanOffCHtml(match);
    }

    if (tab.id === 'defc') {
        return buildMatchGamePlanDefCHtml(match);
    }

    if (tab.id === 'roller') {
        return buildMatchGamePlanRolesHtml(match);
    }

    if (tab.id === 'bench') {
        return buildMatchGamePlanBenchHtml(match);
    }

    return `
        <div class="match-game-plan-empty">
            <i class="fa-solid fa-clipboard-list"></i>
            <span>${escapeMatchHtml(tab.label)} kommer her.</span>
        </div>
    `;
}

function ensureMatchGamePlanPitchPages(root = document) {
    ['offc', 'defc', 'roller', 'bench'].forEach(tabId => {
        const page = root.querySelector(`[data-game-plan-page="${tabId}"]`);
        if (!page) return;

        const hasPitch = page.querySelector('.match-game-plan-pitch-wrap');
        const hasSetPieceNodes = page.querySelector('.match-game-plan-diagram-node');
        const hasSetPieceControls = page.querySelector('.match-game-plan-offc-controls');
        const hasBenchPanel = page.querySelector('.match-game-plan-bench-panel');
        if ((tabId === 'offc' || tabId === 'defc') && (!hasPitch || !hasSetPieceNodes || !hasSetPieceControls)) {
            const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
            if (!match) return;
            page.innerHTML = tabId === 'defc'
                ? buildMatchGamePlanDefCHtml(match)
                : buildMatchGamePlanOffCHtml(match);
            return;
        }
        if (tabId === 'roller' && (!hasPitch || !hasSetPieceControls)) {
            const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
            if (!match) return;
            page.innerHTML = buildMatchGamePlanRolesHtml(match);
            return;
        }
        if (tabId === 'bench' && (!hasPitch || !hasBenchPanel)) {
            const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
            if (!match) return;
            page.innerHTML = buildMatchGamePlanBenchHtml(match);
            return;
        }
        if (hasPitch) return;

        const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
        page.innerHTML = tabId === 'bench' && match
            ? buildMatchGamePlanBenchHtml(match)
            : buildMatchGamePlanPitchHtml({
                ariaLabel: `${matchGamePlanTabs.find(item => item.id === tabId)?.label || tabId} bane`
            });
    });
}

function resolveMatchPrintPlayer(match, value) {
    if (!value) return null;
    if (typeof window.findPlayerByRef === 'function') {
        const byRef = window.findPlayerByRef(value);
        if (byRef) return byRef;
    }
    const byId = findMatchGamePlanPlayerById(match, value);
    if (byId) return byId;

    const lineupPlayers = Object.values(getMatchGamePlanDraftLineup(match) || {}).filter(Boolean);
    const fromLineup = lineupPlayers.find(player => getMatchGamePlanStarterPlayerValue(player) === value);
    if (fromLineup) return fromLineup;

    const attending = typeof getMatchDetailAttendingPlayers === 'function'
        ? getMatchDetailAttendingPlayers(match)
        : [];
    const fromAttending = attending.find(player => getMatchGamePlanStarterPlayerValue(player) === value);
    if (fromAttending) return fromAttending;

    return (window.activePlayers || []).find(player =>
        player.id === value || player.navn === value
    ) || null;
}

function getMatchPrintPlayerLabel(player) {
    if (!player) return '—';
    return getMatchGamePlanPlayerShortName(player);
}

function getMatchPrintJersey(player) {
    const jersey = player?.drakt || player?.draktnummer;
    return jersey ? String(jersey) : '—';
}

function buildMatchPrintPitchHtml(planId) {
    const isDefC = planId === 'defc';
    const positions = isDefC ? matchGamePlanDefCPositions : matchGamePlanOffCPositions;
    const label = isDefC ? 'Defensiv corner' : 'Offensiv corner';
    const markersHtml = Object.entries(positions).map(([value, coords]) => `
        <span
            class="match-print-pitch-marker"
            style="top: ${coords.top}; left: ${coords.left};"
            aria-hidden="true"
        >${escapeMatchHtml(value)}</span>
    `).join('');

    return `
        <div class="match-print-pitch" aria-label="${escapeMatchHtml(label)} bane">
            <div class="match-print-pitch-field">
                <span class="match-print-pitch-halfway" aria-hidden="true"></span>
                <span class="match-print-pitch-center-circle" aria-hidden="true"></span>
                <span class="match-print-pitch-box" aria-hidden="true"></span>
                <span class="match-print-pitch-ball" style="top: 3%; left: 95%;" aria-hidden="true"></span>
                ${markersHtml}
            </div>
        </div>
    `;
}

function buildMatchPrintSetPieceListHtml(match, planId) {
    const assignments = getMatchGamePlanSetPieceAssignments(match, planId);
    const slots = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    return `
        <ul class="match-print-list match-print-setpiece-list">
            ${slots.map(slot => {
                const player = resolveMatchPrintPlayer(match, assignments[slot] || '');
                return `
                    <li>
                        <span class="match-print-slot">${escapeMatchHtml(slot)}</span>
                        <span class="match-print-name">${escapeMatchHtml(getMatchPrintPlayerLabel(player))}</span>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

function buildMatchPrintSetPieceBlockHtml(match, planId) {
    const title = planId === 'defc' ? 'Defensiv corner' : 'Offensiv corner';

    return `
        <section class="match-print-setpiece-block">
            <h2>${escapeMatchHtml(title)}</h2>
            ${buildMatchPrintPitchHtml(planId)}
            ${buildMatchPrintSetPieceListHtml(match, planId)}
        </section>
    `;
}

function buildMatchPrintLineupHtml(match) {
    const formationId = getMatchGamePlanDraftFormation(match);
    const lineup = getMatchGamePlanDraftLineup(match);
    const positionIds = getMatchGamePlanFormationPositionIds(formationId)
        .slice()
        .sort(compareMatchGamePlanPositions);

    return `
        <section class="match-print-section">
            <h2>Lagoppstilling <span class="match-print-formation">(${escapeMatchHtml(formationId)})</span></h2>
            <ul class="match-print-list match-print-lineup-list">
                ${positionIds.map(posId => {
                    const player = lineup[posId] || null;
                    return `
                        <li>
                            <span class="match-print-jersey">${escapeMatchHtml(getMatchPrintJersey(player))}</span>
                            <span class="match-print-pos">${escapeMatchHtml(getMatchGamePlanPositionLabel(posId))}</span>
                            <span class="match-print-name">${escapeMatchHtml(getMatchPrintPlayerLabel(player))}</span>
                        </li>
                    `;
                }).join('')}
            </ul>
        </section>
    `;
}

function buildMatchPrintRolesHtml(match) {
    const assignments = getMatchGamePlanSetPieceAssignments(match, 'roller');

    return `
        <section class="match-print-section match-print-roles-section">
            <h2>Roller</h2>
            <ul class="match-print-list match-print-roles-list">
                ${matchGamePlanRoleSlots.map(slot => {
                    const player = resolveMatchPrintPlayer(match, assignments[slot] || '');
                    return `
                        <li>
                            <span class="match-print-slot">${escapeMatchHtml(getMatchGamePlanRoleLabel(slot))}</span>
                            <span class="match-print-name">${escapeMatchHtml(getMatchPrintPlayerLabel(player))}</span>
                        </li>
                    `;
                }).join('')}
            </ul>
        </section>
    `;
}

function getMatchPrintBenchPlanItems(match) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const starterKeys = new Set(
        Object.values(lineup || {})
            .filter(Boolean)
            .map(player => getMatchGamePlanStarterPlayerValue(player))
    );
    const plan = getMatchGamePlanBenchAssignments(match);
    const seen = new Set();
    const items = [];

    const pushPlayer = (player, playerKey) => {
        const key = playerKey || getMatchGamePlanStarterPlayerValue(player);
        if (!key || seen.has(key) || starterKeys.has(key)) return;
        seen.add(key);
        items.push({
            player,
            playerKey: key,
            assignment: getMatchGamePlanBenchAssignment(match, key)
        });
    };

    getMatchGamePlanBenchPlayers(match).forEach(player => pushPlayer(player));

    Object.keys(plan || {}).forEach(playerKey => {
        if (seen.has(playerKey) || starterKeys.has(playerKey)) return;
        const player = resolveMatchPrintPlayer(match, playerKey);
        if (!player) return;
        pushPlayer(player, playerKey);
    });

    return items.sort((a, b) => {
        const minuteA = a.assignment.minute ? Number(a.assignment.minute) : 999;
        const minuteB = b.assignment.minute ? Number(b.assignment.minute) : 999;
        if (minuteA !== minuteB) return minuteA - minuteB;
        const jerseyA = Number(a.player?.drakt || a.player?.draktnummer) || 999;
        const jerseyB = Number(b.player?.drakt || b.player?.draktnummer) || 999;
        if (jerseyA !== jerseyB) return jerseyA - jerseyB;
        return getMatchPrintPlayerLabel(a.player).localeCompare(getMatchPrintPlayerLabel(b.player));
    });
}

function buildMatchPrintBenchPlanHtml(match) {
    const items = getMatchPrintBenchPlanItems(match);

    return `
        <section class="match-print-section match-print-bench-section">
            <h2>Bytteplan</h2>
            ${items.length ? `
                <table class="match-print-bench-table">
                    <thead>
                        <tr>
                            <th scope="col">Tid</th>
                            <th scope="col">Nr</th>
                            <th scope="col">Spiller</th>
                            <th scope="col">Posisjon</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(({ player, assignment }) => {
                            const minute = assignment.minute ? `${assignment.minute}'` : '—';
                            const position = assignment.position
                                ? getMatchGamePlanPositionLabel(assignment.position)
                                : '—';
                            const jersey = getMatchPrintJersey(player);
                            return `
                                <tr>
                                    <td class="match-print-minute">${escapeMatchHtml(minute)}</td>
                                    <td class="match-print-jersey">${escapeMatchHtml(jersey)}</td>
                                    <td class="match-print-name">${escapeMatchHtml(getMatchPrintPlayerLabel(player))}</td>
                                    <td class="match-print-pos">${escapeMatchHtml(position)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : `
                <p class="match-print-empty">Ingen innbyttere i troppen.</p>
            `}
        </section>
    `;
}

function buildMatchPrintSheetHtml(match) {
    const data = getMatchCardPresentation(match);
    const sides = typeof window.getMatchCardSides === 'function' ? window.getMatchCardSides(match) : null;
    const title = sides
        ? `${sides.left.name} – ${sides.right.name}`
        : `Bækkelaget – ${match.opponent || 'Motstander'}`;
    const metaParts = [
        data.dateLabel,
        match.time || null,
        match.pitch || null,
        data.matchTypeLabel
    ].filter(Boolean);

    return `
        <header class="match-print-header">
            <h1>${escapeMatchHtml(title)}</h1>
            <p class="match-print-meta">${escapeMatchHtml(metaParts.join('  ·  '))}</p>
        </header>
        <div class="match-print-page match-print-page-1">
            ${buildMatchPrintLineupHtml(match)}
            <div class="match-print-setpiece-grid">
                ${buildMatchPrintSetPieceBlockHtml(match, 'offc')}
                ${buildMatchPrintSetPieceBlockHtml(match, 'defc')}
            </div>
        </div>
        <div class="match-print-page-break" aria-hidden="true">&nbsp;</div>
        <div class="match-print-page match-print-page-2">
            ${buildMatchPrintRolesHtml(match)}
            ${buildMatchPrintBenchPlanHtml(match)}
        </div>
    `;
}

function cleanupMatchPrintSheet() {
    document.documentElement.classList.remove('is-printing-match-sheet');
    document.body.classList.remove('is-printing-match-sheet');
    document.getElementById('match-print-sheet')?.remove();
    if (window._matchPrintCleanup) {
        window.removeEventListener('afterprint', window._matchPrintCleanup);
        window._matchPrintCleanup = null;
    }
    if (window._matchPrintCleanupTimer) {
        clearTimeout(window._matchPrintCleanupTimer);
        window._matchPrintCleanupTimer = null;
    }
}

window.printMatchSheet = function() {
    const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
    if (!match) return;

    cleanupMatchPrintSheet();

    const sheet = document.createElement('div');
    sheet.id = 'match-print-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = buildMatchPrintSheetHtml(match);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('is-printing-match-sheet');
    document.body.classList.add('is-printing-match-sheet');

    const cleanup = () => cleanupMatchPrintSheet();
    window._matchPrintCleanup = cleanup;
    window.addEventListener('afterprint', cleanup);
    window._matchPrintCleanupTimer = setTimeout(cleanup, 60000);

    requestAnimationFrame(() => {
        window.print();
    });
};

function buildMatchGamePlanHtml(match) {
    return `
        <div class="match-game-plan-tabs-wrap" data-no-swipe>
            <div class="match-game-plan-tabs" id="match-game-plan-tabs" role="tablist" aria-label="Kampplan meny" data-no-swipe>
                ${matchGamePlanTabs.map((tab, index) => `
                    <button
                        type="button"
                        class="match-game-plan-tab ${index === 0 ? 'is-active' : ''}"
                        role="tab"
                        aria-selected="${index === 0 ? 'true' : 'false'}"
                        title="${escapeMatchHtml(tab.label)}"
                        aria-label="${escapeMatchHtml(tab.label)}"
                        onclick="window.goToMatchGamePlanTab('${tab.id}')"
                        data-game-plan-tab="${tab.id}"
                        data-no-swipe
                    >${escapeMatchHtml(tab.label)}</button>
                `).join('')}
            </div>
        </div>

        <div class="match-game-plan-content-scroll" id="match-game-plan-content-scroll" data-no-swipe>
            ${matchGamePlanTabs.map(tab => `
                <section class="match-game-plan-page" data-game-plan-page="${tab.id}" aria-label="${escapeMatchHtml(tab.label)}">
                    ${buildMatchGamePlanTabContentHtml(match, tab)}
                </section>
            `).join('')}
        </div>
    `;
}

function setMatchTimeFilter(filterType) {
    window.activeTimeFilter = filterType;

    const btnKommende = document.getElementById('btn-filter-kommende');
    const btnTidligere = document.getElementById('btn-filter-tidligere');
    const activeClass = 'bsk-btn bsk-btn-chip match-filter-btn is-active';
    const inactiveClass = 'bsk-btn bsk-btn-chip match-filter-btn';

    if (btnKommende && btnTidligere) {
        if (filterType === 'kommende') {
            btnKommende.className = activeClass;
            btnTidligere.className = inactiveClass;
            btnKommende.setAttribute('aria-selected', 'true');
            btnTidligere.setAttribute('aria-selected', 'false');
        } else {
            btnTidligere.className = activeClass;
            btnKommende.className = inactiveClass;
            btnTidligere.setAttribute('aria-selected', 'true');
            btnKommende.setAttribute('aria-selected', 'false');
        }
    }

    applyFilters();
}

function populateMatchModalPenaltyFields(matchObj) {
    const penaltyParts = matchObj?.penaltyResult ? parseScore(matchObj.penaltyResult) : null;
    const decidedByPenalties = document.getElementById('match-decided-by-penalties');
    const penaltyBsk = document.getElementById('match-penalty-bsk');
    const penaltyOpponent = document.getElementById('match-penalty-opponent');

    if (decidedByPenalties) decidedByPenalties.checked = Boolean(penaltyParts);
    if (penaltyBsk) penaltyBsk.value = penaltyParts ? String(penaltyParts.bsk) : '';
    if (penaltyOpponent) penaltyOpponent.value = penaltyParts ? String(penaltyParts.opponent) : '';
}

window.toggleMatchModalPenaltyFields = function() {
    const matchType = document.getElementById('matchType')?.value;
    const penaltyFields = document.getElementById('match-penalty-fields');
    const penaltyScoreFields = document.getElementById('match-penalty-score-fields');
    const decidedByPenalties = document.getElementById('match-decided-by-penalties');
    const isCup = matchType === 'Cup';

    if (penaltyFields) penaltyFields.classList.toggle('hidden', !isCup);
    if (!isCup && decidedByPenalties) decidedByPenalties.checked = false;
    if (penaltyScoreFields) {
        penaltyScoreFields.classList.toggle('hidden', !isCup || !decidedByPenalties?.checked);
    }
};

window.openMatchModal = function(editId = null) {
    const modal = document.getElementById('matchModal');
    const headerAction = document.getElementById('matchModalHeaderAction');
    document.getElementById('matchForm').reset();
    document.getElementById('editMatchId').value = '';
    updateDynamicSelectors();

    if (editId) {
        const matchObj = (window.activeMatches || []).find(m => m.id === editId);

        if (matchObj) {
            document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-bsk-yellow"></i> Endre kamp`;
            if (headerAction) {
                headerAction.innerHTML = '<i class="fa-solid fa-trash"></i>';
                headerAction.title = 'Slett kamp';
                headerAction.setAttribute('aria-label', 'Slett kamp');
                headerAction.setAttribute('onclick', 'window.promptDeleteCurrentMatch()');
                headerAction.classList.add('calendar-action-danger');
            }
            document.getElementById('editMatchId').value = matchObj.id;
            document.getElementById('matchDate').value = matchObj.date;
            document.getElementById('matchTime').value = matchObj.time || '';
            document.getElementById('opponent').value = matchObj.opponent;
            document.getElementById('pitch').value = matchObj.pitch || '';
            document.getElementById('matchType').value = matchObj.matchType;
            document.getElementById('matchGroup').value = matchObj.matchGroup || window.getPrimaryTeamName();
            document.getElementById('matchVenue').value = getMatchVenue(matchObj);
            document.getElementById('result').value = matchObj.result || '';
            populateMatchModalPenaltyFields(matchObj);
        }
    } else {
        document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-calendar-plus text-bsk-yellow"></i> Registrer Ny Kamp`;
        if (headerAction) {
            headerAction.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            headerAction.title = 'Lukk';
            headerAction.setAttribute('aria-label', 'Lukk');
            headerAction.setAttribute('onclick', 'window.closeMatchModal()');
            headerAction.classList.remove('calendar-action-danger');
        }
        document.getElementById('matchVenue').value = 'Hjemme';
        document.getElementById('matchGroup').value = window.getPrimaryTeamName();
    }

    window.toggleMatchModalPenaltyFields();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeMatchModal = function() {
    document.getElementById('matchModal').classList.add('hidden');
    document.getElementById('matchModal').classList.remove('flex');
};

window.promptDeleteCurrentMatch = function() {
    const matchId = document.getElementById('editMatchId')?.value;
    if (!matchId) return;

    window.customConfirm("Slette kamp?", "Er du sikker på at du ønsker å slette denne kampen permanent fra terminlisten?", async () => {
        await window.deleteMatchFromDatabase(matchId);
        window.closeMatchModal();
        window.closeMatchInfo();
    });
};

window.saveMatch = async function(event) {
    event.preventDefault();

    const matchId = document.getElementById('editMatchId').value || null;
    const existingMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const date = document.getElementById('matchDate').value.trim();
    const opponent = document.getElementById('opponent').value.trim();
    const pitch = document.getElementById('pitch').value.trim();

    if (!date) {
        alert('Du må velge dato for kampen.');
        return;
    }
    if (!opponent) {
        alert('Du må fylle inn motstander.');
        return;
    }

    const matchData = {
        ...(existingMatch || {}),
        id: matchId || crypto.randomUUID(),
        date,
        time: document.getElementById('matchTime').value.trim(),
        opponent,
        pitch,
        matchType: document.getElementById('matchType').value,
        matchGroup: window.getPrimaryTeamName(),
        venue: document.getElementById('matchVenue').value.trim(),
        result: document.getElementById('result').value.trim()
    };

    const decidedByPenalties = document.getElementById('match-decided-by-penalties')?.checked;
    const penaltyBsk = parseInt(document.getElementById('match-penalty-bsk')?.value, 10);
    const penaltyOpponent = parseInt(document.getElementById('match-penalty-opponent')?.value, 10);

    if (matchData.matchType === 'Cup' && decidedByPenalties && !Number.isNaN(penaltyBsk) && !Number.isNaN(penaltyOpponent)) {
        matchData.penaltyResult = buildMatchResultString(penaltyBsk, penaltyOpponent);
    } else {
        delete matchData.penaltyResult;
    }

    try {
        await window.saveMatchToDatabase(matchData);
    } catch (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    window.closeMatchModal();
    window.closeMatchInfo();
};

window.saveMatchSummaryNotes = async function(matchId, sourceElement) {
    const match = (window.activeMatches || []).find(m => m.id === matchId);
    if (!match) return;

    const root = sourceElement && typeof sourceElement.closest === 'function'
        ? sourceElement.closest('[data-match-notes-form]')
        : null;
    const positiveInput = root
        ? root.querySelector('[data-match-note-positive]')
        : document.querySelector(`textarea[data-match-note-positive="${matchId}"]`);
    const challengeInput = root
        ? root.querySelector('[data-match-note-challenge]')
        : document.querySelector(`textarea[data-match-note-challenge="${matchId}"]`);

    match.notes = {
        ...(match.notes || {}),
        positive: positiveInput ? positiveInput.value.trim() : (match.notes?.positive || ''),
        challenge: challengeInput ? challengeInput.value.trim() : (match.notes?.challenge || '')
    };

    try {
        if (typeof window.saveMatchToDatabase === 'function') {
            await window.saveMatchToDatabase(match);
        }
    } catch (error) {
        console.error(error);
        setMatchDetailFeedback('[data-notes-save-state]', error.message || 'Kunne ikke lagre notater', 'error', 6000);
    }
};

window.buildMatchCoachNotesFieldsHtml = function(match) {
    if (!match || !match.id) return '';

    const matchId = escapeMatchHtml(match.id);
    const matchIdJs = escapeMatchJsString(match.id);
    const positiveNote = escapeMatchHtml(match.notes?.positive || '');
    const challengeNote = escapeMatchHtml(match.notes?.challenge || '');

    return `
        <div class="match-coach-notes-fields" data-match-notes-form="${matchId}">
            <div>
                <label class="portal-label">Positivt</label>
                <textarea
                    rows="2"
                    data-match-note-positive="${matchId}"
                    placeholder="Hva fungerte bra i denne kampen?"
                    onblur="saveMatchSummaryNotes('${matchIdJs}', this)"
                    class="portal-field portal-textarea-sm"
                >${positiveNote}</textarea>
            </div>
            <div>
                <label class="portal-label">Utfordringer</label>
                <textarea
                    rows="2"
                    data-match-note-challenge="${matchId}"
                    placeholder="Hva må vi forbedre eller følge opp?"
                    onblur="saveMatchSummaryNotes('${matchIdJs}', this)"
                    class="portal-field portal-textarea-sm"
                >${challengeNote}</textarea>
            </div>
        </div>
    `;
};

window.promptDeleteMatch = function(id) {
    window.customConfirm("Slette kamp?", "Er du sikker på at du ønsker å slette denne kampen permanent fra terminlisten?", async () => {
        await window.deleteMatchFromDatabase(id);
        window.closeMatchInfo();
        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
    });
};

function getPortalMainScrollHost() {
    return document.querySelector('.portal-main-shell');
}

function restorePortalMainScroll(scrollTop) {
    const host = getPortalMainScrollHost();
    if (!host || scrollTop == null) return;
    host.scrollTop = scrollTop;
    requestAnimationFrame(() => {
        host.scrollTop = scrollTop;
    });
}

window.showMatchDetails = function(id) {
    const stayOnDetails = window.currentTab === 'kampdetaljer';
    const savedScrollTop = stayOnDetails ? (getPortalMainScrollHost()?.scrollTop || 0) : null;

    activeDetailsId = id;
    window.activeDetailsId = id;

    const match = (window.activeMatches || []).find(m => m.id === id);
    if (!match) return;
    resetMatchGamePlanDraft(match);

    const container = document.getElementById('kampdetaljer-info');
    bindMatchListEvents();
    ensureMatchGamePlanFormationMenuEventsBound();
    const attendingRefs = typeof window.getMatchParticipantRefs === 'function'
        ? window.getMatchParticipantRefs(match)
        : window.getAttendingPlayerRefs(match.attendance);
    const presenceStats = typeof window.getAttendancePresenceStats === 'function'
        ? window.getAttendancePresenceStats(match)
        : { presentCount: attendingRefs.length, squadSize: 0, isRegistered: false };
    const squadBadgeLabel = presenceStats.isRegistered && presenceStats.squadSize > 0
        ? `${presenceStats.presentCount}/${presenceStats.squadSize}`
        : String(presenceStats.isRegistered ? presenceStats.presentCount : attendingRefs.length);
    const benchPlayersHtml = buildMatchDetailSquadListHtml(match);
    const pendingAttendanceFeedback = window._pendingAttendanceFeedback;
    const openForAttendanceFeedback = Boolean(
        pendingAttendanceFeedback?.isMatch && pendingAttendanceFeedback.recordId === id
    );
    if (window.matchDetailPairPanelMatchId !== id) {
        window.matchDetailPairPanelState = { kamptropp: false, oppstilling: false };
        window.matchDetailPairPanelMatchId = id;
        if (!openForAttendanceFeedback && !window.pendingMatchDetailsOpenPanel) {
            window.activeMatchDetailsOpenPanel = '';
        }
    }
    const openPanel = openForAttendanceFeedback
        ? 'kamptropp'
        : (window.pendingMatchDetailsOpenPanel || window.activeMatchDetailsOpenPanel || '');
    const exclusiveOpen = openPanel === 'kampplan'
        || openPanel === 'trenernotater'
        || openPanel === 'spillerbors'
        || openPanel === 'motstanderinfo';
    window.matchDetailPairPanelState = window.matchDetailPairPanelState || { kamptropp: false, oppstilling: false };
    const pairState = window.matchDetailPairPanelState;
    if (openForAttendanceFeedback) pairState.kamptropp = true;
    const isSquadPanelOpen = !exclusiveOpen && pairState.kamptropp === true;
    const isLineupPanelOpen = !exclusiveOpen && pairState.oppstilling === true;
    const isGamePlanOpen = openPanel === 'kampplan';
    const isCoachNotesOpen = openPanel === 'trenernotater';
    const isStatsOpen = openPanel === 'spillerbors';
    const isOpponentInfoOpen = openPanel === 'motstanderinfo';
    const opponentRecord = getOpponentHistoryRecord(getOpponentRecordMatches(match));
    const opponentInfoBadgeLabel = String(opponentRecord.wins + opponentRecord.draws + opponentRecord.losses);
    window.pendingMatchDetailsOpenPanel = null;
    window.activeMatchDetailsOpenPanel = openPanel;
    const matchSquadPanelHtml = `
        <div class="match-detail-squad-section ${getMatchGamePlanOverlayStateClasses(match).join(' ')}">
            <section class="match-bench-panel match-collapsible-panel ${isSquadPanelOpen ? '' : 'is-collapsed'}" data-match-panel="kamptropp">
                <div class="match-bench-action-row match-bench-topline" onclick="window.onMatchPanelToplineClick(event)">
                    <div class="match-bench-heading">
                        <h3>Kamptropp</h3>
                        <span class="match-detail-section-badge" aria-label="${presenceStats.presentCount} av ${presenceStats.squadSize || attendingRefs.length} spillere møtt opp">${squadBadgeLabel}</span>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" aria-expanded="${isSquadPanelOpen ? 'true' : 'false'}" aria-label="${isSquadPanelOpen ? 'Skjul kamptropp' : 'Vis kamptropp'}" data-show-label="Vis kamptropp" data-hide-label="Skjul kamptropp">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                    <button type="button" class="training-session-attendance-add-btn" data-match-action="attendance" data-match-id="${escapeMatchHtml(match.id)}" title="Oppdater" aria-label="Oppdater oppmøte">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>Oppdater</span>
                    </button>
                </div>
                <div class="match-collapsible-content">
                    <p class="match-inline-status match-attendance-save-state" data-attendance-save-state aria-live="polite" hidden></p>
                    <div class="match-detail-squad-body">
                        <div class="match-detail-squad-players match-detail-squad-zone">
                            <div class="match-detail-squad-overlay-toolbar">
                                ${buildMatchGamePlanSquadOverlaySegmentHtml(match)}
                            </div>
                            <div class="match-bench-list match-detail-squad-list">
                                ${benchPlayersHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section class="match-bench-panel match-collapsible-panel ${isLineupPanelOpen ? '' : 'is-collapsed'}" data-match-panel="oppstilling">
                <div class="match-bench-action-row match-bench-topline" onclick="window.onMatchPanelToplineClick(event)">
                    <div class="match-bench-heading">
                        <h3>Lagoppstilling</h3>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" aria-expanded="${isLineupPanelOpen ? 'true' : 'false'}" aria-label="${isLineupPanelOpen ? 'Skjul lagoppstilling' : 'Vis lagoppstilling'}" data-show-label="Vis lagoppstilling" data-hide-label="Skjul lagoppstilling">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                </div>
                <div class="match-collapsible-content">
                    <div class="match-detail-squad-lineup match-detail-squad-zone" aria-label="Lagoppstilling">
                        ${buildMatchGamePlanStarter11Html(match, 'match-detail-lineup-pitch-wrap')}
                    </div>
                </div>
            </section>
        </div>
    `;
    let gamePlanHtml = '';
    try {
        gamePlanHtml = buildMatchGamePlanHtml(match);
    } catch (error) {
        console.error('Kunne ikke rendere kampplan', error);
        gamePlanHtml = `
            <div class="match-game-plan-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Kampplanen kunne ikke vises akkurat nå.</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="match-detail-page">
        ${buildMatchDetailCardHtml(match, { showWatermark: true, backOnClick: true })}

        ${matchSquadPanelHtml}

        <section class="match-game-plan-panel match-collapsible-panel ${isGamePlanOpen ? '' : 'is-collapsed'}" data-match-panel="kampplan">
            <div class="match-bench-action-row match-bench-topline match-game-plan-topline" onclick="window.onMatchPanelToplineClick(event)">
                <div class="match-bench-heading">
                    <h3>Kampplan</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" aria-expanded="${isGamePlanOpen ? 'true' : 'false'}" aria-label="${isGamePlanOpen ? 'Skjul kampplan' : 'Vis kampplan'}" data-show-label="Vis kampplan" data-hide-label="Skjul kampplan">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
                <button type="button"
                        class="training-session-attendance-add-btn match-print-sheet-btn"
                        onclick="window.printMatchSheet()"
                        title="Skriv ut lagoppstilling og kampplan"
                        aria-label="Skriv ut lagoppstilling og kampplan">
                    <i class="fa-solid fa-print" aria-hidden="true"></i>
                    <span>Skriv ut</span>
                </button>
            </div>
            <div class="match-collapsible-content">
                <p class="match-inline-status match-kampplan-feedback" data-kampplan-feedback aria-live="polite" hidden></p>
                <div class="match-game-plan-body">
                    ${gamePlanHtml}
                </div>
            </div>
        </section>

        <section class="match-coach-notes-panel match-collapsible-panel ${isCoachNotesOpen ? '' : 'is-collapsed'}" data-match-panel="trenernotater">
            <div class="match-bench-action-row match-bench-topline match-coach-notes-topline" onclick="window.onMatchPanelToplineClick(event)">
                <div class="match-bench-heading">
                    <h3>Trenernotater</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" aria-expanded="${isCoachNotesOpen ? 'true' : 'false'}" aria-label="${isCoachNotesOpen ? 'Skjul trenernotater' : 'Vis trenernotater'}" data-show-label="Vis trenernotater" data-hide-label="Skjul trenernotater">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="match-coach-notes-body">
                    ${typeof window.buildMatchCoachNotesFieldsHtml === 'function' ? window.buildMatchCoachNotesFieldsHtml(match) : ''}
                </div>
                <div class="match-coach-notes-footer">
                    <p class="match-inline-status match-coach-notes-save-state" data-notes-save-state aria-live="polite" hidden></p>
                </div>
            </div>
        </section>

        <section class="match-stats-panel match-collapsible-panel ${isStatsOpen ? '' : 'is-collapsed'}" data-match-panel="spillerbors">
            <div class="match-bench-action-row match-bench-topline match-stats-topline" onclick="window.onMatchPanelToplineClick(event)">
                <div class="match-bench-heading">
                    <h3>Spillerbørs</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" aria-expanded="${isStatsOpen ? 'true' : 'false'}" aria-label="${isStatsOpen ? 'Skjul spillerbørs' : 'Vis spillerbørs'}" data-show-label="Vis spillerbørs" data-hide-label="Skjul spillerbørs">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <p class="match-stats-intro">Oppmøte registreres før kamp via «Oppdater» i kamptroppen. «Kun oppmøte» under markerer benkspillere som kun får oppmøtepoeng — ikke mål, assist eller børs.</p>
                <div class="match-stats-body">
                    ${buildMatchStatsResultBarHtml(match)}
                    <div id="kampdetaljer-spillerbors" class="match-stats-list">
                    </div>
                </div>
                <div class="match-stats-footer">
                    <p class="match-inline-status match-stats-save-state" data-stats-save-state aria-live="polite" hidden></p>
                    <button onclick="savePlayerMatchStats()" class="match-bench-action-btn match-stats-save-btn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Lagre</span>
                    </button>
                </div>
            </div>
        </section>

        <section class="match-opponent-info-panel match-collapsible-panel ${isOpponentInfoOpen ? '' : 'is-collapsed'}" data-match-panel="motstanderinfo">
            <div class="match-bench-action-row match-bench-topline match-opponent-info-topline" onclick="window.onMatchPanelToplineClick(event)">
                <div class="match-bench-heading">
                    <h3>Motstanderinfo</h3>
                    <span class="match-detail-section-badge" aria-label="${escapeMatchHtml(opponentInfoBadgeLabel)} kamper mot ${escapeMatchHtml(match.opponent || 'motstanderen')} totalt">${escapeMatchHtml(opponentInfoBadgeLabel)}</span>
                </div>
                <button type="button" class="match-panel-toggle-btn" aria-expanded="${isOpponentInfoOpen ? 'true' : 'false'}" aria-label="${isOpponentInfoOpen ? 'Skjul motstanderinfo' : 'Vis motstanderinfo'}" data-show-label="Vis motstanderinfo" data-hide-label="Skjul motstanderinfo">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="match-opponent-info-body">
                    ${buildMatchOpponentInfoBodyHtml(match)}
                </div>
            </div>
        </section>
        </div>
    `;

    renderPlayerRowForm(match);
    const backTarget = window.pendingMatchDetailsBackTab || (window.currentTab && window.currentTab !== 'kampdetaljer' ? window.currentTab : 'kamper');
    window.pendingMatchDetailsBackTab = null;
    switchTab('kampdetaljer', { backTarget });
    if (stayOnDetails) restorePortalMainScroll(savedScrollTop);

    requestAnimationFrame(() => {
        if (stayOnDetails) restorePortalMainScroll(savedScrollTop);
        window.initMatchGamePlanScroller();
        window.syncMatchGamePlanScroller();
        ensureMatchGamePlanSamspillPanelsDom();
        syncMatchGamePlanLineupOverlayUi(match);
        renderMatchGamePlanSamspillSummary(match);
        syncMatchDetailSquadCardSizeToPitch();
        if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
            window.drawMatchGamePlanChemistryLines(match);
        }
        if (stayOnDetails) restorePortalMainScroll(savedScrollTop);

        if (openForAttendanceFeedback) {
            window._pendingAttendanceFeedback = null;
            const message = typeof window.buildAttendanceSaveFeedbackMessage === 'function'
                ? window.buildAttendanceSaveFeedbackMessage(pendingAttendanceFeedback)
                : 'Oppmøte lagret';
            setMatchDetailFeedback('[data-attendance-save-state]', message, 'success', 5000);
        }
    });
};

function getMatchGamePlanSelectablePlayers(match) {
    const activePlayers = (window.activePlayers || [])
        .filter(player => player.status !== 'Passiv' && (!match.matchGroup || player.spillerLag === match.matchGroup));
    const participantRefs = typeof window.getMatchParticipantRefs === 'function'
        ? window.getMatchParticipantRefs(match)
        : window.getAttendingPlayerRefs(match.attendance);

    if (!participantRefs.length) return [];

    return activePlayers.filter(player =>
        participantRefs.some(ref => window.playerRefMatches(ref, player))
    );
}

window.renderMatchGamePlanStarterNode = function(match, posId) {
    const coords = matchGamePlanStarterPositions[posId];
    const existingNodes = document.querySelectorAll(`[data-game-plan-node="${posId}"]`);
    if (!coords || !existingNodes.length) return;

    existingNodes.forEach(existingNode => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildMatchGamePlanNodeHtml(match, posId, coords).trim();
        existingNode.replaceWith(wrapper.firstElementChild);
    });
};

window.chooseMatchGamePlanPlayer = async function(matchId, posId, playerId = '') {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const selectedPlayer = playerId
        ? (window.activePlayers || []).find(player => player.id === playerId)
        : null;

    const draft = getMatchGamePlanDraft(match);
    const previousLineup = getMatchGamePlanDraftLineup(match);
    draft.lineup = assignMatchGamePlanDraftLineupPlayer(previousLineup, posId, selectedPlayer);

    const affectedPosIds = new Set([
        posId,
        ...getMatchGamePlanDraftLineupPosIdsForPlayer(previousLineup, selectedPlayer),
        ...getMatchGamePlanDraftLineupPosIdsForPlayer(draft.lineup, selectedPlayer)
    ]);
    refreshMatchGamePlanLineupAfterChange(match, [...affectedPosIds]);
    closeMatchGamePlanPlayerSelectModal();
};

window.setMatchGamePlanFormation = async function(matchId, formationId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || !matchGamePlanFormations[formationId]) return;

    const draft = getMatchGamePlanDraft(match);
    draft.formation = formationId;
    pruneMatchGamePlanDraftLineupForFormation(draft, formationId);
    renderMatchGamePlanStarter11Page(match);
    renderMatchGamePlanOffCPage(match);
    renderMatchGamePlanDefCPage(match);
    renderMatchGamePlanRolesPage(match);
    renderMatchGamePlanBenchPage(match);
};

window.clearMatchGamePlanLineup = function(matchId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const playerCount = getMatchGamePlanDraftLineupPlayerCount(match);
    if (!playerCount) return;

    const runClear = () => {
        const draft = getMatchGamePlanDraft(match);
        const formationId = getMatchGamePlanDraftFormation(match);
        const emptyLineup = {};
        getMatchGamePlanFormationPositionIds(formationId).forEach(posId => {
            emptyLineup[posId] = null;
        });
        draft.lineup = emptyLineup;

        renderMatchGamePlanStarter11Page(match);
        renderMatchGamePlanOffCPage(match);
        renderMatchGamePlanDefCPage(match);
        renderMatchGamePlanRolesPage(match);
        renderMatchGamePlanBenchPage(match);
        setMatchDetailFeedback(
            '[data-lineup-save-state]',
            'Spillere fjernet fra banen. Trykk Lagre for å beholde endringen.',
            'pending'
        );
    };

    if (typeof window.customConfirm === 'function') {
        window.customConfirm(
            'Nullstill lagoppstilling',
            `Fjerne alle ${playerCount} spillere fra banen? Endringen lagres ikke før du trykker Lagre.`,
            runClear
        );
        return;
    }

    runClear();
};

window.completeMatchGamePlanLineup = async function(matchId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const draft = getMatchGamePlanDraft(match);
    const draftLineup = getMatchGamePlanDraftLineup(match);
    const draftFormation = getMatchGamePlanDraftFormation(match);
    const selectedCount = matchGamePlanStarterPositionIds.filter(posId => draftLineup[posId]).length;
    const saveBtn = document.querySelector('.match-detail-lineup-builder .match-game-plan-lineup-save-btn');
    const clearBtn = document.querySelector('.match-detail-lineup-builder .match-game-plan-lineup-clear-btn');
    const savedScrollTop = getPortalMainScrollHost()?.scrollTop || 0;

    if (saveBtn) saveBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;
    setMatchDetailFeedback('[data-lineup-save-state]', 'Lagrer lagoppstilling...', 'pending');

    match.lineup = cloneMatchGamePlanLineup(draft.lineup);
    match.lineupRefs = getMatchGamePlanLineupRefs(draft.lineup);
    match.formation = draftFormation;

    try {
        if (typeof window.saveMatchToDatabase === 'function') {
            await window.saveMatchToDatabase(match);
        }
    } catch (error) {
        console.error(error);
        setMatchDetailFeedback('[data-lineup-save-state]', error.message || 'Lagring feilet', 'error');
        if (saveBtn) saveBtn.disabled = false;
        syncMatchGamePlanLineupSaveState(match);
        return;
    }

    resetMatchGamePlanDraft(match);
    renderMatchGamePlanStarter11Page(match);
    renderMatchGamePlanOffCPage(match);
    renderMatchGamePlanDefCPage(match);
    renderMatchGamePlanRolesPage(match);
    renderMatchGamePlanBenchPage(match);
    restorePortalMainScroll(savedScrollTop);

    const successMessage = selectedCount === 11
        ? `Lagret i ${getMatchGamePlanFormation(match)}.`
        : selectedCount > 0
            ? `Lagret ${selectedCount} av 11 spillere i ${getMatchGamePlanFormation(match)}.`
            : `Tomt lag lagret i ${getMatchGamePlanFormation(match)}.`;
    setMatchDetailFeedback('[data-lineup-save-state]', successMessage, 'success', 5000);
    if (saveBtn) saveBtn.disabled = false;
};

window.updateMatchGamePlanOffCPlayer = async function(matchId, slot, playerRef = '') {
    await window.updateMatchGamePlanSetPiecePlayer(matchId, 'offc', slot, playerRef);
};

window.syncMatchGamePlanRoleSelectAvatar = function(selectEl) {
    if (!selectEl) return;

    const field = selectEl.closest('.match-game-plan-offc-select-field');
    const avatar = field?.querySelector('[data-role-avatar]');
    if (!field || !avatar) return;

    const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
    const value = selectEl.value || '';
    let player = null;

    if (value && match) {
        player = findMatchGamePlanPlayerById(match, value)
            || Object.values(getMatchGamePlanDraftLineup(match)).find(entry => (
                entry && getMatchGamePlanStarterPlayerValue(entry) === value
            ))
            || getMatchDetailAttendingPlayers(match).find(entry => (
                getMatchGamePlanStarterPlayerValue(entry) === value
            ))
            || null;
    }

    avatar.outerHTML = buildMatchGamePlanRoleSlotAvatarHtml(player);
};

window.updateMatchGamePlanSetPiecePlayer = async function(matchId, planId, slot, playerRef = '') {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    const key = matchGamePlanAssignmentKeys[planId] || matchGamePlanAssignmentKeys.offc;
    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    match[key] = {
        ...getMatchGamePlanSetPieceAssignments(match, planId),
        [slot]: playerRef || ''
    };

    try {
        if (typeof window.saveMatchToDatabase === 'function') {
            await window.saveMatchToDatabase(match);
        }
    } catch (error) {
        console.error(error);
        setMatchDetailFeedback('[data-kampplan-feedback]', error.message || 'Kunne ikke lagre', 'error', 6000);
    }
};

window.updateMatchGamePlanBenchMinute = async function(matchId, playerRef, minute = '') {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || !playerRef) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchGamePlanTab = 'bench';
    const currentAssignment = getMatchGamePlanBenchAssignment(match, playerRef);
    match.benchSubstitutionPlan = {
        ...getMatchGamePlanBenchAssignments(match),
        [playerRef]: {
            ...currentAssignment,
            minute: minute || ''
        }
    };
    window.syncMatchGamePlanBenchPanel(match);
    setMatchGamePlanBenchDirty(matchId, true);
};

window.updateMatchGamePlanBenchPosition = async function(matchId, playerRef, position = '') {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || !playerRef) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchGamePlanTab = 'bench';
    const currentAssignment = getMatchGamePlanBenchAssignment(match, playerRef);
    match.benchSubstitutionPlan = {
        ...getMatchGamePlanBenchAssignments(match),
        [playerRef]: {
            ...currentAssignment,
            position: position || ''
        }
    };
    window.syncMatchGamePlanBenchPanel(match);
    setMatchGamePlanBenchDirty(matchId, true);
};

window.clearMatchGamePlanBenchAssignment = async function(matchId, playerRef) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || !playerRef) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchGamePlanTab = 'bench';
    match.benchSubstitutionPlan = {
        ...getMatchGamePlanBenchAssignments(match),
        [playerRef]: {
            minute: '',
            position: ''
        }
    };
    window.syncMatchGamePlanBenchPanel(match);
    setMatchGamePlanBenchDirty(matchId, true);
};

window.saveMatchGamePlanBenchPlan = async function(matchId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchGamePlanTab = 'bench';
    const saveButton = getMatchGamePlanBenchSaveButton(matchId);
    const label = saveButton?.querySelector('.match-game-plan-bench-save-label') || saveButton?.querySelector('span');

    if (typeof window.saveMatchToDatabase !== 'function') {
        if (label) label.textContent = 'Feilet';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.classList.add('is-dirty');
            saveButton.title = 'Kunne ikke lagre';
            saveButton.setAttribute('aria-label', 'Kunne ikke lagre');
        }
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.classList.add('is-saving', 'is-dirty');
        saveButton.title = 'Lagrer bytteplan';
        saveButton.setAttribute('aria-label', 'Lagrer bytteplan');
    }
    if (label) label.textContent = 'Lagrer...';

    try {
        await window.saveMatchToDatabase(match);
        window.dirtyMatchGamePlanBenchMatchIds = window.dirtyMatchGamePlanBenchMatchIds || new Set();
        window.dirtyMatchGamePlanBenchMatchIds.delete(matchId);
        showMatchGamePlanBenchSavedConfirmation(matchId);
    } catch (error) {
        console.error('Kunne ikke lagre bytteplan', error);
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.classList.add('is-dirty');
            saveButton.classList.remove('is-saved');
            const icon = saveButton.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-floppy-disk';
            saveButton.title = error.message || 'Lagring feilet';
            saveButton.setAttribute('aria-label', error.message || 'Lagring feilet');
        }
        if (label) label.textContent = 'Prøv igjen';
        setMatchDetailFeedback('[data-kampplan-feedback]', error.message || 'Kunne ikke lagre bytteplan', 'error', 6000);
    } finally {
        if (saveButton) saveButton.classList.remove('is-saving');
    }
};

window.moveMatchGamePlanPlayerPosition = async function(matchId, fromPosId, toPosId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || fromPosId === toPosId) return;

    const draft = getMatchGamePlanDraft(match);
    const lineup = { ...getMatchGamePlanDraftLineup(match) };
    const movingPlayer = lineup[fromPosId] || null;
    const targetPlayer = lineup[toPosId] || null;
    if (!movingPlayer) return;

    lineup[toPosId] = movingPlayer;
    lineup[fromPosId] = targetPlayer || null;
    draft.lineup = lineup;

    refreshMatchGamePlanLineupAfterChange(match, [fromPosId, toPosId]);
    closeMatchGamePlanPlayerSelectModal();
};

function buildMatchGamePlanSelectActionsHtml(matchId, posId, mode) {
    return `
        <div class="match-game-plan-select-actions" role="group" aria-label="Handling">
            <button
                type="button"
                class="match-game-plan-select-action bsk-btn bsk-btn-chip ${mode === 'position' ? 'is-active' : ''}"
                aria-pressed="${mode === 'position' ? 'true' : 'false'}"
                onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(matchId)}', '${escapeMatchJsString(posId)}', 'position')"
            >
                <i class="fa-solid fa-arrows-left-right" aria-hidden="true"></i>
                <span>Bytt posisjon</span>
            </button>
            <button
                type="button"
                class="match-game-plan-select-action bsk-btn bsk-btn-chip ${mode === 'player' ? 'is-active' : ''}"
                aria-pressed="${mode === 'player' ? 'true' : 'false'}"
                onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(matchId)}', '${escapeMatchJsString(posId)}', 'player')"
            >
                <i class="fa-solid fa-user-pen" aria-hidden="true"></i>
                <span>Bytt spiller</span>
            </button>
        </div>
    `;
}

function buildMatchGamePlanPositionOptionsHtml(match, posId) {
    const lineup = getMatchGamePlanDraftLineup(match);
    const currentPlayer = lineup[posId];
    if (!currentPlayer) return '';
    const positions = getMatchGamePlanDraftFormationPositions(match);

    return Object.keys(positions)
        .filter(targetPosId => targetPosId !== posId)
        .filter(targetPosId => !matchGamePlanSamePlayer(lineup[targetPosId], currentPlayer))
        .sort(compareMatchGamePlanPositions)
        .map(targetPosId => {
            const targetPlayer = lineup[targetPosId];
            const score = getMatchGamePlanPositionScore(currentPlayer, targetPosId);
            const positionLabel = getMatchGamePlanPositionLabel(targetPosId);
            const avatarHtml = targetPlayer
                ? buildMatchGamePlanPlayerOptionAvatarHtml(targetPlayer)
                : `<span class="match-game-plan-player-avatar"><span>${escapeMatchHtml(targetPosId)}</span></span>`;
            const detail = targetPlayer
                ? `Bytt med ${getMatchGamePlanPlayerShortName(targetPlayer)}`
                : 'Ledig posisjon';

            return `
                <button
                    type="button"
                    class="match-game-plan-player-option"
                    onclick="window.moveMatchGamePlanPlayerPosition('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(posId)}', '${escapeMatchJsString(targetPosId)}')"
                >
                    <span class="match-game-plan-player-status-dot ${targetPlayer ? 'is-on-pitch' : 'is-off-pitch'}" title="${targetPlayer ? 'Opptatt' : 'Ledig'}"></span>
                    ${avatarHtml}
                    <span class="match-game-plan-player-copy">
                        <strong>${escapeMatchHtml(positionLabel)}</strong>
                        <span>${escapeMatchHtml(detail)}</span>
                    </span>
                    ${buildMatchGamePlanFitTagHtml(score)}
                </button>
            `;
        })
        .join('');
}

function buildMatchGamePlanPlayerOptionsHtml(match, posId, selectedPlayer) {
    const players = getMatchGamePlanSelectablePlayers(match).sort((a, b) =>
        String(a.navn || '').localeCompare(String(b.navn || ''), 'nb', { sensitivity: 'base' })
    );

    return players
        .filter(player => !matchGamePlanSamePlayer(player, selectedPlayer))
        .map(player => {
            const score = getMatchGamePlanPositionScore(player, posId);
            const jersey = player.drakt || player.draktnummer || '';
            const existingPosId = getMatchGamePlanPlayerPitchPosId(match, player);
            const isOnPitchElsewhere = Boolean(existingPosId);
            const metaParts = [player.pos1, jersey ? `#${jersey}` : ''].filter(Boolean);
            const meta = metaParts.join(' · ') || 'Ukjent posisjon';

            if (isOnPitchElsewhere) {
                return `
                    <button
                        type="button"
                        class="match-game-plan-player-option"
                        onclick="window.moveMatchGamePlanPlayerPosition('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(existingPosId)}', '${escapeMatchJsString(posId)}')"
                        title="Bytt hit fra ${escapeMatchHtml(existingPosId)}"
                    >
                        <span class="match-game-plan-player-status-dot is-on-pitch" title="På banen"></span>
                        ${buildMatchGamePlanPlayerOptionAvatarHtml(player)}
                        <span class="match-game-plan-player-copy">
                            <strong>${escapeMatchHtml(player.navn)}</strong>
                            <span>${escapeMatchHtml(meta)} · Bytt hit</span>
                        </span>
                        <span class="match-game-plan-player-tag is-pitch">${escapeMatchHtml(existingPosId)}</span>
                    </button>
                `;
            }

            return `
                <button
                    type="button"
                    class="match-game-plan-player-option"
                    onclick="window.chooseMatchGamePlanPlayer('${escapeMatchJsString(match.id)}', '${escapeMatchJsString(posId)}', '${escapeMatchJsString(player.id)}')"
                >
                    <span class="match-game-plan-player-status-dot is-off-pitch" title="Ledig"></span>
                    ${buildMatchGamePlanPlayerOptionAvatarHtml(player)}
                    <span class="match-game-plan-player-copy">
                        <strong>${escapeMatchHtml(player.navn)}</strong>
                        <span>${escapeMatchHtml(meta)}</span>
                    </span>
                    ${buildMatchGamePlanFitTagHtml(score)}
                </button>
            `;
        })
        .join('');
}

function removeMatchGamePlanClearPlayerButton(modal) {
    modal?.querySelector('[data-match-game-plan-clear-player]')?.remove();
}

function renderMatchGamePlanClearPlayerButton(modal, matchId, posId) {
    removeMatchGamePlanClearPlayerButton(modal);
    const actions = modal?.querySelector('.match-game-plan-select-header-actions');
    if (!actions) return;

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'bsk-btn bsk-btn-icon bsk-btn-danger';
    clearButton.dataset.matchGamePlanClearPlayer = 'true';
    clearButton.title = `Fjern spiller fra ${posId}`;
    clearButton.setAttribute('aria-label', `Fjern spiller fra ${posId}`);
    clearButton.onclick = () => window.chooseMatchGamePlanPlayer(matchId, posId, '');
    clearButton.innerHTML = '<i class="fa-solid fa-user-minus" aria-hidden="true"></i>';

    const closeButton = actions.querySelector('[data-close-player-select]');
    if (closeButton) actions.insertBefore(clearButton, closeButton);
    else actions.appendChild(clearButton);
}

window.openMatchGamePlanPlayerSelect = function(matchId, posId, mode = null) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    const modal = document.getElementById('tacticalPlayerModal');
    const list = document.getElementById('tactical-player-list');
    const label = document.getElementById('tactical-pos-label');
    const title = modal?.querySelector('h3');
    if (!match || !modal || !list) return;

    const lineup = getMatchGamePlanDraftLineup(match);
    const selectedPlayer = lineup[posId] || null;
    const currentMode = mode || 'player';

    if (title) {
        title.innerHTML = `
            ${buildMatchGamePlanHeadingAvatarHtml(selectedPlayer, posId)}
            <span class="match-game-plan-heading-copy">
                <span class="match-game-plan-heading-title">${escapeMatchHtml(selectedPlayer ? selectedPlayer.navn : 'Ledig')}</span>
                <span class="match-game-plan-heading-subtitle">${escapeMatchHtml(getMatchGamePlanPositionLabel(posId))}</span>
            </span>
        `;
    }
    if (label) label.innerText = '';
    removeMatchGamePlanClearPlayerButton(modal);

    const listHtml = [
        selectedPlayer ? buildMatchGamePlanSelectActionsHtml(matchId, posId, currentMode) : '',
        currentMode === 'position' && selectedPlayer
            ? buildMatchGamePlanPositionOptionsHtml(match, posId)
            : buildMatchGamePlanPlayerOptionsHtml(match, posId, selectedPlayer)
    ].join('');

    list.innerHTML = listHtml || `
        <div class="match-game-plan-player-empty">
            ${currentMode === 'position'
                ? 'Ingen posisjoner å bytte til.'
                : 'Registrer oppmøte for å se hvem som møtte opp.'}
        </div>
    `;

    if (selectedPlayer) {
        renderMatchGamePlanClearPlayerButton(modal, matchId, posId);
    }

    showMatchGamePlanPlayerSelectModal(modal);
};

window.openMatchGamePlanBenchPlayerSelect = function(matchId, playerId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    const player = match ? findMatchGamePlanPlayerById(match, playerId) : null;
    if (!match || !player) return;

    const existingPosId = getMatchGamePlanPlayerPitchPosId(match, player);
    if (existingPosId) {
        // På banen: start i «Bytt posisjon» så flytting er synlig først
        window.openMatchGamePlanPlayerSelect(matchId, existingPosId, 'position');
        return;
    }

    const modal = document.getElementById('tacticalPlayerModal');
    const list = document.getElementById('tactical-player-list');
    const label = document.getElementById('tactical-pos-label');
    const title = modal?.querySelector('h3');
    if (!modal || !list) return;

    if (title) {
        title.innerHTML = `
            ${buildMatchGamePlanHeadingAvatarHtml(player, '')}
            <span class="match-game-plan-heading-copy">
                <span class="match-game-plan-heading-title">${escapeMatchHtml(player.navn)}</span>
                <span class="match-game-plan-heading-subtitle">Plasser på banen</span>
            </span>
        `;
    }
    if (label) label.innerText = '';
    removeMatchGamePlanClearPlayerButton(modal);

    const listHtml = buildMatchGamePlanBenchPlacementOptionsHtml(match, player);
    list.innerHTML = listHtml || `
        <div class="match-game-plan-player-empty">
            Ingen posisjoner i valgt formasjon.
        </div>
    `;

    showMatchGamePlanPlayerSelectModal(modal);
};

window.syncMatchGamePlanScroller = function() {
    const contentScroller = document.getElementById('match-game-plan-content-scroll');
    const tabsScroller = document.getElementById('match-game-plan-tabs');
    const wrap = tabsScroller?.closest('.match-game-plan-tabs-wrap');
    if (!contentScroller || !tabsScroller || !wrap) return;

    const isDesktop = window.innerWidth >= 768;
    const storedActiveTabId = contentScroller.dataset.activeGamePlanTab || matchGamePlanTabs[0].id;
    const pageWidth = contentScroller.clientWidth || 1;
    const activeIndex = isDesktop
        ? Math.max(0, matchGamePlanTabs.findIndex(tab => tab.id === storedActiveTabId))
        : Math.max(0, Math.min(
            matchGamePlanTabs.length - 1,
            Math.round(contentScroller.scrollLeft / pageWidth)
        ));
    const activeTab = matchGamePlanTabs[activeIndex];
    const maxScroll = contentScroller.scrollWidth - contentScroller.clientWidth;

    wrap.classList.toggle('can-scroll-left', activeIndex > 0 || (!isDesktop && contentScroller.scrollLeft > 6));
    wrap.classList.toggle('can-scroll-right', activeIndex < matchGamePlanTabs.length - 1 || (!isDesktop && maxScroll > 6 && contentScroller.scrollLeft < maxScroll - 6));

    const previousActiveTabId = tabsScroller.dataset.activeGamePlanTab || '';
    tabsScroller.querySelectorAll('.match-game-plan-tab').forEach(btn => {
        const isActive = btn.dataset.gamePlanTab === activeTab.id;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });
    contentScroller.querySelectorAll('.match-game-plan-page').forEach(page => {
        page.classList.toggle('is-active', page.dataset.gamePlanPage === activeTab.id);
    });
    tabsScroller.dataset.activeGamePlanTab = activeTab.id;
    contentScroller.dataset.activeGamePlanTab = activeTab.id;
    window.activeMatchGamePlanTab = activeTab.id;

    const activeButton = tabsScroller.querySelector('.match-game-plan-tab.is-active');
    if (activeButton && previousActiveTabId !== activeTab.id) {
        const target = activeButton.offsetLeft - (tabsScroller.clientWidth / 2) + (activeButton.offsetWidth / 2);
        tabsScroller.scrollTo({ left: Math.max(0, target), behavior: isDesktop ? 'auto' : 'smooth' });
    }
};

window.goToMatchGamePlanTab = function(tabId, behavior = 'smooth') {
    const contentScroller = document.getElementById('match-game-plan-content-scroll');
    const tabIndex = matchGamePlanTabs.findIndex(tab => tab.id === tabId);
    if (!contentScroller || tabIndex === -1) return;

    contentScroller.dataset.activeGamePlanTab = tabId;
    window.activeMatchGamePlanTab = tabId;

    if (window.innerWidth >= 768) {
        window.syncMatchGamePlanScroller();
        return;
    }

    contentScroller.scrollTo({ left: tabIndex * contentScroller.clientWidth, behavior });
    setTimeout(window.syncMatchGamePlanScroller, behavior === 'auto' ? 0 : 280);
};

window.navigateMatchGamePlan = function(direction) {
    const contentScroller = document.getElementById('match-game-plan-content-scroll');
    if (!contentScroller) return;

    const currentIndex = window.innerWidth >= 768
        ? Math.max(0, matchGamePlanTabs.findIndex(tab => tab.id === (contentScroller.dataset.activeGamePlanTab || matchGamePlanTabs[0].id)))
        : Math.round(contentScroller.scrollLeft / (contentScroller.clientWidth || 1));
    const nextIndex = Math.max(0, Math.min(matchGamePlanTabs.length - 1, currentIndex + direction));
    window.goToMatchGamePlanTab(matchGamePlanTabs[nextIndex].id);
};

window.initMatchGamePlanScroller = function() {
    const contentScroller = document.getElementById('match-game-plan-content-scroll');
    if (!contentScroller) return;

    ensureMatchGamePlanPitchPages(contentScroller);
    if (contentScroller.dataset.scrollBound === 'true') return;

    contentScroller.dataset.scrollBound = 'true';
    contentScroller.addEventListener('scroll', () => {
        if (contentScroller.dataset.scrollFrame === 'true') return;
        contentScroller.dataset.scrollFrame = 'true';
        requestAnimationFrame(() => {
            contentScroller.dataset.scrollFrame = 'false';
            window.syncMatchGamePlanScroller();
        });
    }, { passive: true });

    contentScroller.querySelectorAll('.match-game-plan-pitch-wrap').forEach(pitchWrap => {
        if (pitchWrap.dataset.pitchSwipeBound === 'true') return;

        let pitchStartX = 0;
        let pitchStartY = 0;
        pitchWrap.dataset.pitchSwipeBound = 'true';

        pitchWrap.addEventListener('touchstart', event => {
            if (event.touches.length !== 1) return;
            pitchStartX = event.touches[0].clientX;
            pitchStartY = event.touches[0].clientY;
        }, { passive: true });

        pitchWrap.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touch) return;

            const deltaX = touch.clientX - pitchStartX;
            const deltaY = touch.clientY - pitchStartY;
            const hasHorizontalIntent = Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
            if (!hasHorizontalIntent) return;

            window.navigateMatchGamePlan(deltaX < 0 ? 1 : -1);
        }, { passive: true });
    });

    const initialTabId = window.activeMatchGamePlanTab && matchGamePlanTabs.some(tab => tab.id === window.activeMatchGamePlanTab)
        ? window.activeMatchGamePlanTab
        : matchGamePlanTabs[0].id;
    window.goToMatchGamePlanTab(initialTabId, 'auto');
};

function getMatchDetailsPanelId(panel) {
    if (!panel) return '';
    if (panel.dataset.matchPanel) return panel.dataset.matchPanel;
    if (panel.classList.contains('match-game-plan-panel')) return 'kampplan';
    if (panel.classList.contains('match-coach-notes-panel')) return 'trenernotater';
    if (panel.classList.contains('match-stats-panel')) return 'spillerbors';
    if (panel.classList.contains('match-opponent-info-panel')) return 'motstanderinfo';
    if (panel.classList.contains('match-bench-panel')) return 'kamptropp';
    return '';
}

function setMatchDetailsPanelCollapsed(panel, collapsed) {
    if (!panel) return;
    panel.classList.toggle('is-collapsed', collapsed);
    const toggle = panel.querySelector('.match-panel-toggle-btn');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute(
        'aria-label',
        collapsed
            ? (toggle.dataset.showLabel || 'Vis seksjon')
            : (toggle.dataset.hideLabel || 'Skjul seksjon')
    );
}

function isMatchDetailsPairPanelId(panelId) {
    return panelId === 'kamptropp' || panelId === 'oppstilling';
}

function syncMatchDetailPairPanelsAfterExclusiveClose() {
    window.matchDetailPairPanelState = window.matchDetailPairPanelState || { kamptropp: false, oppstilling: false };
    const pairState = window.matchDetailPairPanelState;
    document.querySelectorAll('#kampdetaljer-info [data-match-panel="kamptropp"], #kampdetaljer-info [data-match-panel="oppstilling"]').forEach(panel => {
        const panelId = getMatchDetailsPanelId(panel);
        setMatchDetailsPanelCollapsed(panel, pairState[panelId] !== true);
    });
    if (pairState.kamptropp === true) return 'kamptropp';
    if (pairState.oppstilling === true) return 'oppstilling';
    return '';
}

window.onMatchPanelToplineClick = function(event) {
    const topline = event.currentTarget;
    if (!topline) return;

    const interactive = event.target.closest('a, button, input, select, textarea, label');
    if (interactive && !interactive.classList.contains('match-panel-toggle-btn')) {
        return;
    }

    const toggle = interactive?.classList.contains('match-panel-toggle-btn')
        ? interactive
        : topline.querySelector('.match-panel-toggle-btn');
    if (!toggle) return;

    if (interactive?.classList.contains('match-panel-toggle-btn')) {
        event.preventDefault();
    }
    window.toggleMatchPanel(toggle);
};

window.toggleMatchPanel = function(btn) {
    const panel = btn?.closest('.match-collapsible-panel');
    if (!panel) return;

    const panelId = getMatchDetailsPanelId(panel);
    const isPairPanel = isMatchDetailsPairPanelId(panelId);
    const shouldOpen = panel.classList.contains('is-collapsed');
    window.matchDetailPairPanelState = window.matchDetailPairPanelState || { kamptropp: false, oppstilling: false };

    if (shouldOpen) {
        document.querySelectorAll('#kampdetaljer-info .match-collapsible-panel').forEach(otherPanel => {
            if (otherPanel === panel) return;
            const otherId = getMatchDetailsPanelId(otherPanel);
            if (isPairPanel && isMatchDetailsPairPanelId(otherId)) return;
            setMatchDetailsPanelCollapsed(otherPanel, true);
        });

        setMatchDetailsPanelCollapsed(panel, false);
        window.activeMatchDetailsOpenPanel = panelId;
        if (isPairPanel) window.matchDetailPairPanelState[panelId] = true;
    } else {
        setMatchDetailsPanelCollapsed(panel, true);
        if (isPairPanel) {
            window.matchDetailPairPanelState[panelId] = false;
            const siblingId = panelId === 'kamptropp' ? 'oppstilling' : 'kamptropp';
            window.activeMatchDetailsOpenPanel = window.matchDetailPairPanelState[siblingId] === true
                ? siblingId
                : '';
        } else {
            window.activeMatchDetailsOpenPanel = syncMatchDetailPairPanelsAfterExclusiveClose();
        }
    }

    if (shouldOpen && panelId === 'kampplan') {
        requestAnimationFrame(() => {
            window.initMatchGamePlanScroller();
            window.syncMatchGamePlanScroller();
        });
    }

    if (shouldOpen && isPairPanel) {
        requestAnimationFrame(() => {
            const match = (window.activeMatches || []).find(item => item.id === window.activeDetailsId);
            if (!match) return;
            ensureMatchGamePlanSamspillPanelsDom();
            syncMatchGamePlanLineupOverlayUi(match);
            renderMatchGamePlanSamspillSummary(match);
            syncMatchDetailSquadCardSizeToPitch();
            if (typeof window.drawMatchGamePlanChemistryLines === 'function') {
                window.drawMatchGamePlanChemistryLines(match);
            }
        });
    }
};

window.toggleMatchBenchPanel = window.toggleMatchPanel;

window.updateMatchRatingHint = function(select) {
    if (!select) return;

    const row = select.closest('.match-stats-player-row');
    const hint = row ? row.querySelector('[data-rating-current-hint]') : null;
    const rating = Number(select.value) || 0;
    const hintText = formatMatchRatingHint(rating);

    select.title = hintText;

    if (hint) {
        hint.textContent = hintText;
        hint.classList.toggle('is-empty', rating === 0);
    }

    const tooltipRows = row ? row.querySelectorAll('.match-rating-tooltip-row') : [];
    tooltipRows.forEach(tooltipRow => {
        tooltipRow.classList.toggle(
            'is-selected',
            Number(tooltipRow.querySelector('.match-rating-tooltip-score')?.textContent) === rating
        );
    });
};

window.selectMatchRatingFromGuide = function(button, rating) {
    const row = button?.closest('.match-stats-player-row');
    const select = row ? row.querySelector('.player-rating-select') : null;
    if (!select) return;

    select.value = String(rating);
    window.updateMatchRatingHint(select);
};

window.closeMatchInfo = function() {
    switchTab('kamper');
};

window.goToMatchTactics = function(matchId) {
    if (!matchId) return;

    window.activeDetailsId = matchId;
    window.switchTab('taktikk');
    setTimeout(() => {
        const tacticalSelect = document.getElementById('tacticalMatchSelect');
        if (!tacticalSelect) return;
        tacticalSelect.value = matchId;
        if (typeof window.loadMatchTactics === 'function') {
            window.loadMatchTactics();
        }
    }, 50);
};

window.toggleMotm = function(btn) {
    const isActive = btn.getAttribute('data-active') === 'true';

    document.querySelectorAll('.player-motm-btn').forEach(b => {
        b.setAttribute('data-active', 'false');
        b.classList.remove('bg-purple-700', 'border-purple-800', 'text-white', 'shadow-sm', 'scale-95');
        b.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300');
    });

    if (!isActive) {
        btn.setAttribute('data-active', 'true');
        btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300');
        btn.classList.add('bg-purple-700', 'border-purple-800', 'text-white', 'shadow-sm', 'scale-95');
    }
};

window.renderPlayerRowForm = function(match) {
    const formList = document.getElementById('kampdetaljer-spillerbors');
    if (!formList) return;

    formList.innerHTML = '';

    const participantRefs = typeof window.getMatchParticipantRefs === 'function'
        ? window.getMatchParticipantRefs(match)
        : window.getAttendingPlayerRefs(match.attendance);
    const hasStoredAttendance = window.getAttendingPlayerRefs(match.attendance).length > 0;

    if (participantRefs.length === 0) {
        const emptyMessage = typeof window.getMatchSquadEmptyMessage === 'function'
            ? window.getMatchSquadEmptyMessage(match)
            : 'Registrer oppmøte for å se hvem som møtte opp.';
        formList.innerHTML = `
            <div class="match-stats-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>${escapeMatchHtml(emptyMessage)}</span>
            </div>`;
        return;
    }

    const sortedPlayers = [...(window.activePlayers || [])]
        .filter(p => participantRefs.some(ref => window.playerRefMatches(ref, p)))
        .sort((a, b) => a.navn.localeCompare(b.navn));

    const fallbackPlayers = participantRefs
        .filter(ref => !sortedPlayers.some(p => window.playerRefMatches(ref, p)))
        .map(ref => window.findPlayerByRef(ref) || { id: ref, navn: window.getPlayerNameFromRef(ref) });

    const playersToRender = [...sortedPlayers, ...fallbackPlayers].sort((a, b) =>
        a.navn.localeCompare(b.navn)
    );

    if (!hasStoredAttendance) {
        const notice = document.createElement('div');
        notice.className = 'match-stats-notice';
        notice.innerHTML = 'Oppmøteliste mangler for denne kampen, men lagret kampstatistikk vises her. Trykk <b>Legg til</b> for å bekrefte troppen.';
        formList.appendChild(notice);
    }

    playersToRender.forEach(playerObj => {
        const player = playerObj.navn;
        const playerId = playerObj.id;
        const playerAttr = escapeMatchHtml(player);
        const playerIdAttr = escapeMatchHtml(playerId || '');
        const prevGoals = window.getPlayerRefMapValue(match.scorers, playerObj, 0);
        const prevAssists = window.getPlayerRefMapValue(match.assists, playerObj, 0);
        const prevRating = window.getPlayerRefMapValue(match.ratings, playerObj, 0);
        const hasYellow = window.playerRefListIncludes(match.guleKort, playerObj);
        const hasRed = window.playerRefListIncludes(match.rodeKort, playerObj);
        const isMotm = window.motmMatchesPlayer(match.motm, playerObj);
        const isBenchOnly = typeof window.isPlayerBenchOnly === 'function'
            ? window.isPlayerBenchOnly(match, player)
            : false;
        const pitchDisabled = isBenchOnly ? 'opacity-40 pointer-events-none' : '';
        const scoreOptions = [0,1,2,3,4,5,6,7,8,9,10];
        const ratingHint = formatMatchRatingHint(prevRating);

        const div = document.createElement('div');
        div.className = "match-stats-player-row";
        div.innerHTML = `
            <div class="match-stats-player-main">
                ${buildMatchStatsPlayerAvatarHtml(playerObj)}
                <div class="match-stats-player-info">
                    <div class="match-stats-player-name-row">
                        <span class="match-stats-player-name">${escapeMatchHtml(player)}</span>
                        ${isBenchOnly ? '<span class="match-stats-bench-badge" title="Benkspiller – kun oppmøtepoeng">Benk</span>' : ''}
                    </div>
                    <span class="match-rating-current-hint ${Number(prevRating) > 0 ? '' : 'is-empty'}" data-rating-current-hint>${escapeMatchHtml(ratingHint)}</span>
                </div>
            </div>
            <div class="match-stats-controls">
                <button type="button" data-match-stat-action="bench-toggle" class="player-bench-btn h-7 px-2 rounded-md border-2 font-black text-[8px] transition-all flex items-center justify-center shrink-0 ${isBenchOnly ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-active="${isBenchOnly ? 'true' : 'false'}" aria-label="Kun oppmøtepoeng på benken" title="Benkspiller – kun oppmøtepoeng (15 p), ikke mål, assist eller børs">Kun oppmøte</button>
                <div class="player-pitch-stats match-stats-pitch-controls ${pitchDisabled}">
                <div class="match-stat-field">
                    <span class="match-stat-label">Mål</span>
                    <select class="player-goals-input portal-field portal-field-sm match-stat-select" data-player-id="${playerIdAttr}" data-player="${playerAttr}" aria-label="Mål for ${playerAttr}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevGoals) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field">
                    <span class="match-stat-label">Ass</span>
                    <select class="player-assists-input portal-field portal-field-sm match-stat-select" data-player-id="${playerIdAttr}" data-player="${playerAttr}" aria-label="Assist for ${playerAttr}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevAssists) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field match-rating-field">
                    <span class="match-stat-label">Børs</span>
                    <select
                        class="player-rating-select portal-field portal-field-sm match-stat-select match-stat-select-rating"
                        data-match-stat-action="rating-select"
                        data-player-id="${playerIdAttr}"
                        data-player="${playerAttr}"
                        aria-label="Børs for ${playerAttr}"
                        title="${escapeMatchHtml(ratingHint)}"
                    >
                        <option value="0" ${prevRating === 0 ? 'selected' : ''}>--</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(v => {
                            const ratingEntry = getMatchRatingGuideEntry(v);
                            const optionTitle = ratingEntry.tooltip || `${ratingEntry.label}. ${ratingEntry.description}`;
                            return `<option value="${v}" ${prevRating === v ? 'selected' : ''} title="${escapeMatchHtml(optionTitle)}">${v} ★</option>`;
                        }).join('')}
                    </select>
                    ${buildMatchRatingTooltipHtml(prevRating)}
                </div>

                <div class="match-stats-card-group">
                    <button type="button" data-match-stat-action="yellow-card" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasYellow ? 'bg-yellow-400 border-yellow-500 text-slate-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-type="yellow" data-active="${hasYellow ? 'true' : 'false'}">🟨</button>
                    <button type="button" data-match-stat-action="red-card" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasRed ? 'bg-red-500 border-red-600 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-red-50 hover:text-red-400 hover:border-red-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-type="red" data-active="${hasRed ? 'true' : 'false'}">🟥</button>
                    <button type="button" data-match-stat-action="motm-toggle" class="player-motm-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${isMotm ? 'bg-purple-700 border-purple-800 text-white shadow-sm scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-active="${isMotm ? 'true' : 'false'}">BB</button>
                </div>
                </div>
            </div>
        `;
        formList.appendChild(div);
    });

    bindMatchStatsEvents();
    window.updateMatchStatsResultBar();
};

window.toggleBenchOnly = function(btn) {
    const isActive = btn.getAttribute('data-active') === 'true';
    const newState = !isActive;
    btn.setAttribute('data-active', newState ? 'true' : 'false');

    const row = btn.closest('.match-stats-player-row');
    const pitchStats = row ? row.querySelector('.player-pitch-stats') : null;

    if (newState) {
        btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-400', 'hover:bg-amber-50', 'hover:text-amber-700', 'hover:border-amber-200');
        btn.classList.add('bg-amber-100', 'border-amber-300', 'text-amber-900', 'shadow-inner', 'scale-95');
        if (pitchStats) pitchStats.classList.add('opacity-40', 'pointer-events-none');
    } else {
        btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-400', 'hover:bg-amber-50', 'hover:text-amber-700', 'hover:border-amber-200');
        btn.classList.remove('bg-amber-100', 'border-amber-300', 'text-amber-900', 'shadow-inner', 'scale-95');
        if (pitchStats) pitchStats.classList.remove('opacity-40', 'pointer-events-none');
    }
};

window.toggleCard = function(btn, type) {
    const isActive = btn.getAttribute('data-active') === 'true';
    const newState = !isActive;
    btn.setAttribute('data-active', newState);

    if (type === 'yellow') {
        if (newState) {
            btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300', 'text-white', 'hover:bg-yellow-50', 'hover:text-yellow-600', 'hover:border-yellow-200');
            btn.classList.add('bg-yellow-400', 'border-yellow-500', 'text-slate-900', 'shadow-inner', 'scale-95');
        } else {
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-yellow-50', 'hover:text-yellow-600', 'hover:border-yellow-200');
            btn.classList.remove('bg-yellow-400', 'border-yellow-500', 'text-white', 'text-slate-900', 'shadow-inner', 'scale-95');
        }
    } else if (type === 'red') {
        if (newState) {
            btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-red-50', 'hover:text-red-400', 'hover:border-red-200');
            btn.classList.add('bg-red-500', 'border-red-600', 'text-white', 'shadow-inner', 'scale-95');
        } else {
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300', 'hover:bg-red-50', 'hover:text-red-400', 'hover:border-red-200');
            btn.classList.remove('bg-red-500', 'border-red-600', 'text-white', 'shadow-inner', 'scale-95');
        }
    }
};

window.savePlayerMatchStats = async function() {
    const match = (window.activeMatches || []).find(m => m.id === activeDetailsId);
    if (!match) return;

    const scorers = {};
    const assists = {};
    const ratings = {};
    const guleKort = [];
    const rodeKort = [];
    const benchOnly = {};

    document.querySelectorAll('.player-bench-btn').forEach(btn => {
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(btn));
        if (!playerKey) return;
        benchOnly[playerKey] = btn.getAttribute('data-active') === 'true';
    });

    document.querySelectorAll('.player-goals-input').forEach(input => {
        const val = parseInt(input.value);
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(input));
        if (!playerKey || benchOnly[playerKey] === true) return;
        if (val > 0) scorers[playerKey] = val;
    });

    document.querySelectorAll('.player-assists-input').forEach(input => {
        const val = parseInt(input.value);
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(input));
        if (!playerKey || benchOnly[playerKey] === true) return;
        if (val > 0) assists[playerKey] = val;
    });

    document.querySelectorAll('.player-rating-select').forEach(select => {
        const val = parseInt(select.value);
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(select));
        if (!playerKey || benchOnly[playerKey] === true) return;
        if (val > 0) ratings[playerKey] = val;
    });

    document.querySelectorAll('.player-card-btn').forEach(btn => {
        const playerKey = window.getPlayerStorageKey(window.getPlayerRefFromElement(btn));
        if (!playerKey || benchOnly[playerKey] === true) return;
        if (btn.getAttribute('data-active') === 'true') {
            if (btn.getAttribute('data-type') === 'yellow') guleKort.push(playerKey);
            if (btn.getAttribute('data-type') === 'red') rodeKort.push(playerKey);
        }
    });

    match.scorers = scorers;
    match.assists = assists;
    match.ratings = ratings;
    match.guleKort = guleKort;
    match.rodeKort = rodeKort;
    match.benchOnly = benchOnly;

    const activeMotmBtn = document.querySelector('.player-motm-btn[data-active="true"]');
    const motmPlayer = activeMotmBtn ? window.getPlayerStorageKey(window.getPlayerRefFromElement(activeMotmBtn)) : null;
    match.motm = motmPlayer && benchOnly[motmPlayer] !== true ? motmPlayer : null;

    const totalBskGoals = Object.values(scorers).reduce((sum, g) => sum + g, 0);
    const opponentGoals = getMatchStatsOpponentGoalsFromForm(match);
    if (totalBskGoals > 0 || opponentGoals > 0) {
        match.result = buildMatchResultString(totalBskGoals, opponentGoals);
    }

    const penaltyResult = getPenaltyResultFromStatsForm();
    if (penaltyResult) {
        match.penaltyResult = penaltyResult;
    } else {
        delete match.penaltyResult;
    }

    const saveBtn = document.querySelector('.match-stats-save-btn');
    const saveLabel = saveBtn?.querySelector('span');

    if (saveBtn) saveBtn.disabled = true;
    if (saveLabel) saveLabel.textContent = 'Lagrer...';
    setMatchDetailFeedback('[data-stats-save-state]', 'Lagrer spillerbørs...', 'pending');

    try {
        await window.saveMatchToDatabase(match);
    } catch (error) {
        console.error(error);
        setMatchDetailFeedback('[data-stats-save-state]', error.message || 'Lagring feilet', 'error');
        if (saveBtn) saveBtn.disabled = false;
        if (saveLabel) saveLabel.textContent = 'Lagre';
        return;
    }

    setMatchDetailFeedback('[data-stats-save-state]', 'Spillerbørs lagret', 'success', 5000);
    if (saveBtn) saveBtn.disabled = false;
    if (saveLabel) saveLabel.textContent = 'Lagre';
    window.updateMatchStatsResultBar();
    syncMatchDetailCardResult(match);
    const card = document.querySelector('#kampdetaljer-info .match-detail-card');
    if (card) {
        const data = getMatchCardPresentation(match);
        card.classList.remove('is-win', 'is-draw', 'is-loss');
        if (data.resultTone) card.classList.add(data.resultTone);
    }
    applyFilters();
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();
};
