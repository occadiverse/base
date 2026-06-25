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
        tooltip: 'Fremragende. Matchvinner eller dominerende',
        description: 'Banens beste-kandidat. Dominerende i banespillet og leverte avgjørende målpoeng/redninger'
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
                            onclick="window.selectMatchRatingFromGuide(this, ${value})"
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
    const crestClass = team.isBsk ? 'match-detail-crest' : 'match-detail-crest match-detail-crest-opponent';
    const iconClass = team.isBsk ? 'fa-shield-halved' : 'fa-shield';

    return `
        <div class="match-detail-team">
            <div class="${crestClass}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <span class="match-detail-team-name">${escapeMatchHtml(team.name)}</span>
        </div>
    `;
}

function getMatchFixturePresentation(match, options = {}) {
    const { showLag = false } = options;
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
    const parsedScore = match.result ? parseScore(match.result) : null;
    const displayedResult = match.result || '-';

    let resultTone = '';
    if (parsedScore) {
        if (parsedScore.bsk > parsedScore.opponent) resultTone = 'is-win';
        else if (parsedScore.bsk === parsedScore.opponent) resultTone = 'is-draw';
        else resultTone = 'is-loss';
    }

    const metaParts = [];
    if (showLag && match.matchGroup) metaParts.push(match.matchGroup);
    if (match.matchType) metaParts.push(match.matchType);
    if (match.pitch) metaParts.push(match.pitch);

    return {
        day,
        month,
        weekday,
        monthLabel,
        meta: metaParts.join(' · '),
        displayedResult,
        resultTone
    };
}

function groupMatchesByMonth(matches) {
    const groups = [];

    matches.forEach(match => {
        const { monthLabel } = getMatchFixturePresentation(match);

        if (!groups.length || groups[groups.length - 1].monthLabel !== monthLabel) {
            groups.push({ monthLabel, matches: [] });
        }

        groups[groups.length - 1].matches.push(match);
    });

    return groups;
}

function applyFilters() {
    const listContainer = document.getElementById('matchListContainer');
    const noMatchesView = document.getElementById('no-matches-view');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    const currentTimeFilter = window.activeTimeFilter || 'kommende';
    const kamperLagFilter = 'Alle';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = matches.filter(m => {
        if (!m.date) return false;

        const matchDate = new Date(m.date);
        matchDate.setHours(0, 0, 0, 0);

        const matchesTime = currentTimeFilter === 'kommende' ? matchDate >= today : matchDate < today;
        const matchesLag = kamperLagFilter === 'Alle' || m.matchGroup === kamperLagFilter;

        return matchesTime && matchesLag;
    });

    const sortedMatches = [...filtered].sort((a, b) =>
        currentTimeFilter === 'kommende' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
    );

    if (sortedMatches.length === 0) {
        if (noMatchesView) noMatchesView.classList.remove('hidden');
        return;
    }

    if (noMatchesView) noMatchesView.classList.add('hidden');

    const isUpcoming = currentTimeFilter === 'kommende';
    const groups = groupMatchesByMonth(sortedMatches);

    listContainer.innerHTML = groups.map(group => `
        <section class="match-fixture-group">
            <header class="match-fixture-month">${escapeMatchHtml(group.monthLabel)}</header>
            <div class="match-fixture-group-rows">
                ${group.matches.map(match => buildMatchFixtureRowHtml(match, { showLag: false, isUpcoming })).join('')}
            </div>
        </section>
    `).join('');
}

function buildMatchFixtureRowHtml(match, options = {}) {
    const { showLag = false, isUpcoming = true } = options;
    const data = getMatchFixturePresentation(match, { showLag });
    const clickAttrs = `onclick="showMatchDetails('${escapeMatchJsString(match.id)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMatchDetails('${escapeMatchJsString(match.id)}')}"`;
    const sideValue = isUpcoming
        ? (match.time || '--:--')
        : data.displayedResult;
    const sideLabel = isUpcoming ? 'Avspark' : 'Resultat';

    return `
        <article class="match-fixture-row dashboard-click-card ${data.resultTone}" ${clickAttrs}>
            <div class="match-fixture-date" aria-hidden="true">
                <span class="match-fixture-date-day">${escapeMatchHtml(data.day)}</span>
                <span class="match-fixture-date-month">${escapeMatchHtml(data.month)}</span>
            </div>

            <div class="match-fixture-main">
                <span class="match-fixture-weekday">${escapeMatchHtml(data.weekday)}</span>
                <span class="match-fixture-opponent">${escapeMatchHtml(match.opponent)}</span>
                ${data.meta ? `<span class="match-fixture-meta">${escapeMatchHtml(data.meta)}</span>` : ''}
            </div>

            <div class="match-fixture-side">
                <span class="match-fixture-side-value">${escapeMatchHtml(sideValue)}</span>
                <span class="match-fixture-side-label">${sideLabel}</span>
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
    const parsedScore = match.result ? parseScore(match.result) : null;
    const centerValue = match.result ? formatMatchResultForDisplay(match.result, venue) : (match.time || '--:--');
    const centerLabel = match.result ? (match.time ? `Kl. ${match.time}` : 'Sluttresultat') : 'Kampstart';
    const durationLabel = match.duration || '90 min';
    const attendingCount = match.attendance
        ? Object.values(match.attendance).filter(Boolean).length
        : 0;

    let resultTone = '';

    if (parsedScore) {
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
        attendingCount,
        resultTone
    };
}

function buildMatchDetailCardHtml(match, options = {}) {
    const {
        extraClass = '',
        clickable = false,
        showWatermark = false,
        showAttendance = false
    } = options;
    const data = getMatchCardPresentation(match);
    const sides = getMatchCardSides(match);
    const cardClasses = [
        'match-detail-card',
        extraClass,
        data.resultTone,
        clickable ? 'dashboard-click-card' : ''
    ].filter(Boolean).join(' ');
    const watermarkHtml = showWatermark
        ? `<div class="dashboard-next-match-watermark"><i class="fa-solid fa-shield-halved"></i></div>`
        : '';
    const matchAlerts = typeof window.buildMatchAlertData === 'function' ? window.buildMatchAlertData(match) : [];
    const alertChipHtml = matchAlerts.length > 0
        ? `
            <button type="button"
                    onclick="event.stopPropagation(); window.showMatchAlertModal('${escapeMatchJsString(match.id)}')"
                    class="dashboard-alert-chip"
                    title="Vis varsel for denne kampen">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Varsel</span>
            </button>
        `
        : '';
    const topChipsHtml = `
        <button type="button" class="match-detail-chip match-topline-action-btn" onclick="window.openMatchModal('${escapeMatchJsString(match.id)}')" title="Rediger kamp">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Rediger</span>
        </button>
        <div class="match-detail-chip">
            <i class="fa-solid fa-futbol"></i>
            <span>${escapeMatchHtml(data.matchTypeLabel)}</span>
        </div>
    `;
    const footerAttendanceHtml = showAttendance && data.attendingCount > 0
        ? `<div class="match-detail-footer-item">
                <i class="fa-solid fa-user-check"></i>
                <span>${data.attendingCount} påmeldt</span>
           </div>`
        : '';
    const clickAttrs = clickable
        ? `onclick="showMatchDetails('${escapeMatchJsString(match.id)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showMatchDetails('${escapeMatchJsString(match.id)}')}"`
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
                <div class="match-detail-top-chips">
                    ${topChipsHtml}
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
    { id: 'starter11', label: 'Starter11' },
    { id: 'offc', label: 'OffC' },
    { id: 'defc', label: 'DefC' },
    { id: 'roller', label: 'Roller' },
    { id: 'bench', label: 'Benk' }
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

// OffC corner diagram. top/left are percentages of the pitch: top moves down, left moves right.
const matchGamePlanOffCPositions = {
    1: { top: '3%', left: '95%', tone: 'neutral' },
    2: { top: '7%', left: '58%', tone: 'green' },
    3: { top: '7%', left: '50%', tone: 'green' },
    4: { top: '7%', left: '42%', tone: 'green' },
    5: { top: '3%', left: '63%', tone: 'green' },
    6: { top: '17%', left: '75%', tone: 'yellow' },
    7: { top: '12%', left: '50%', tone: 'yellow' },
    8: { top: '17%', left: '25%', tone: 'yellow' },
    9: { top: '41%', left: '50%', tone: 'pink' },
    10: { top: '50%', left: '50%', tone: 'pink' }
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

function getMatchGamePlanPlayerShortName(player) {
    const parts = String(player?.navn || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Spiller';
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}` : parts[0];
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

function buildMatchGamePlanHeadingAvatarHtml(player, posId) {
    const photoUrl = player?.photoUrl || player?.bildeUrl || player?.avatarUrl || '';
    const fallbackText = player ? getMatchGamePlanPlayerInitials(player) : posId;

    return `
        <span class="match-game-plan-heading-avatar" data-player-id="${escapeMatchHtml(player?.id || '')}">
            ${photoUrl
                ? `<img src="${escapeMatchHtml(photoUrl)}" alt="" class="match-game-plan-heading-avatar-img">`
                : `<span>${escapeMatchHtml(fallbackText)}</span>`}
        </span>
    `;
}

function getMatchGamePlanLineup(match) {
    return match && typeof match.lineup === 'object' && match.lineup ? match.lineup : {};
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

function buildMatchGamePlanNodeHtml(match, posId, coords) {
    const selectedPlayer = getMatchGamePlanLineup(match)[posId] || null;
    const playerNameHtml = selectedPlayer
        ? `<span class="match-game-plan-node-name">${escapeMatchHtml(getMatchGamePlanPlayerShortName(selectedPlayer))}</span>`
        : '';

    return `
        <button
            type="button"
            class="match-game-plan-node ${selectedPlayer ? 'is-filled' : ''}"
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

function buildMatchGamePlanDiagramNodeHtml(value, coords) {
    return `
        <span
            class="match-game-plan-diagram-node is-${escapeMatchHtml(coords.tone || 'neutral')}"
            style="top: ${coords.top}; left: ${coords.left};"
            aria-label="OffC ${escapeMatchHtml(value)}"
        >${escapeMatchHtml(value)}</span>
    `;
}

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

function buildMatchGamePlanPitchHtml({ ariaLabel, childrenHtml = '' }) {
    return `
        <div class="match-game-plan-pitch-wrap">
            <div class="tactical-pitch match-game-plan-pitch" aria-label="${escapeMatchHtml(ariaLabel)}">
                ${buildMatchGamePlanPitchLinesHtml()}
                ${childrenHtml}
            </div>
        </div>
    `;
}

function buildMatchGamePlanStarter11Html(match) {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'Starter 11 bane',
        childrenHtml: Object.entries(matchGamePlanStarterPositions).map(([posId, coords]) => `
            ${buildMatchGamePlanNodeHtml(match, posId, coords)}
        `).join('')
    });
}

function buildMatchGamePlanOffCHtml() {
    return buildMatchGamePlanPitchHtml({
        ariaLabel: 'OffC bane',
        childrenHtml: Object.entries(matchGamePlanOffCPositions).map(([value, coords]) => `
            ${buildMatchGamePlanDiagramNodeHtml(value, coords)}
        `).join('')
    });
}

function buildMatchGamePlanTabContentHtml(match, tab) {
    if (tab.id === 'starter11') {
        return buildMatchGamePlanStarter11Html(match);
    }

    if (tab.id === 'offc') {
        return buildMatchGamePlanOffCHtml();
    }

    if (tab.id === 'defc') {
        return buildMatchGamePlanPitchHtml({
            ariaLabel: `${tab.label} bane`
        });
    }

    return `
        <div class="match-game-plan-empty">
            <i class="fa-solid fa-clipboard-list"></i>
            <span>${escapeMatchHtml(tab.label)} kommer her.</span>
        </div>
    `;
}

function ensureMatchGamePlanPitchPages(root = document) {
    ['offc', 'defc'].forEach(tabId => {
        const page = root.querySelector(`[data-game-plan-page="${tabId}"]`);
        if (!page) return;

        const hasPitch = page.querySelector('.match-game-plan-pitch-wrap');
        const hasOffCNodes = page.querySelector('.match-game-plan-diagram-node');
        if (tabId === 'offc' && (!hasPitch || !hasOffCNodes)) {
            page.innerHTML = buildMatchGamePlanOffCHtml();
            return;
        }
        if (hasPitch) return;

        const tab = matchGamePlanTabs.find(item => item.id === tabId);
        page.innerHTML = buildMatchGamePlanPitchHtml({
            ariaLabel: `${tab?.label || tabId} bane`
        });
    });
}

function buildMatchGamePlanHtml(match) {
    return `
        <div class="match-game-plan-tabs-wrap" data-no-swipe>
            <button type="button" class="team-report-detail-scroll-btn match-game-plan-scroll-btn match-game-plan-scroll-btn-left" onclick="window.navigateMatchGamePlan(-1)" aria-label="Forrige del av kampplan" data-no-swipe>
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <div class="match-game-plan-tabs" id="match-game-plan-tabs" role="tablist" aria-label="Kampplan meny" data-no-swipe>
                ${matchGamePlanTabs.map((tab, index) => `
                    <button
                        type="button"
                        class="match-game-plan-tab ${index === 0 ? 'is-active' : ''}"
                        role="tab"
                        aria-selected="${index === 0 ? 'true' : 'false'}"
                        onclick="window.goToMatchGamePlanTab('${tab.id}')"
                        data-game-plan-tab="${tab.id}"
                        data-no-swipe
                    >${escapeMatchHtml(tab.label)}</button>
                `).join('')}
            </div>
            <button type="button" class="team-report-detail-scroll-btn match-game-plan-scroll-btn match-game-plan-scroll-btn-right" onclick="window.navigateMatchGamePlan(1)" aria-label="Neste del av kampplan" data-no-swipe>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
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
    const activeClass = 'match-filter-btn is-active';
    const inactiveClass = 'match-filter-btn';

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

window.openMatchModal = function(editId = null) {
    const modal = document.getElementById('matchModal');
    document.getElementById('matchForm').reset();
    document.getElementById('editMatchId').value = '';
    updateDynamicSelectors();

    if (editId) {
        const matchObj = (window.activeMatches || []).find(m => m.id === editId);

        if (matchObj) {
            document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-bsk-yellow"></i> Rediger Kamp`;
            document.getElementById('editMatchId').value = matchObj.id;
            document.getElementById('matchDate').value = matchObj.date;
            document.getElementById('matchTime').value = matchObj.time || '';
            document.getElementById('opponent').value = matchObj.opponent;
            document.getElementById('pitch').value = matchObj.pitch || '';
            document.getElementById('matchType').value = matchObj.matchType;
            document.getElementById('matchGroup').value = matchObj.matchGroup || 'Lag A';
            document.getElementById('matchVenue').value = getMatchVenue(matchObj);
            document.getElementById('result').value = matchObj.result || '';
        }
    } else {
        document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-calendar-plus text-bsk-yellow"></i> Registrer Ny Kamp`;
        document.getElementById('matchVenue').value = 'Hjemme';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeMatchModal = function() {
    document.getElementById('matchModal').classList.add('hidden');
    document.getElementById('matchModal').classList.remove('flex');
};

window.saveMatch = async function(event) {
    event.preventDefault();

    const matchId = document.getElementById('editMatchId').value || null;
    const existingMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const matchData = {
        ...(existingMatch || {}),
        id: matchId || crypto.randomUUID(),
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        opponent: document.getElementById('opponent').value,
        pitch: document.getElementById('pitch').value,
        matchType: document.getElementById('matchType').value,
        matchGroup: document.getElementById('matchGroup').value,
        venue: document.getElementById('matchVenue').value,
        result: document.getElementById('result').value
    };

    await window.saveMatchToDatabase(matchData);
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

    if (typeof window.saveMatchToDatabase === 'function') {
        await window.saveMatchToDatabase(match);
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

window.showMatchDetails = function(id) {
    activeDetailsId = id;
    window.activeDetailsId = id;

    const match = (window.activeMatches || []).find(m => m.id === id);
    if (!match) return;

    const container = document.getElementById('kampdetaljer-info');
    const escapeHtml = escapeMatchHtml;
    const escapeJsString = escapeMatchJsString;
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
    const getPositionCategory = (pos1) => {
        if (!pos1) return null;
        const normalized = String(pos1).trim();
        if (normalized === 'Keeper' || normalized.toLowerCase().includes('keeper')) return 'K';
        if (['Høyre bekk', 'Venstre bekk', 'Høyre stopper', 'Venstre stopper'].includes(normalized)) return 'F';
        if (['Spiss', 'Høyre kant', 'Venstre kant'].includes(normalized)) return 'A';
        return 'M';
    };
    const selectedPlayers = [...benchPlayers, ...fallbackBenchPlayers];
    const positionCounts = { K: 0, F: 0, M: 0, A: 0 };
    attendingRefs.forEach(ref => {
        const player = typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null;
        const category = getPositionCategory(player?.pos1);
        if (category) positionCounts[category] += 1;
    });
    const benchPositionHtml = ['K', 'F', 'M', 'A'].map(letter => (
        `${positionCounts[letter]}${letter}`
    )).join('<span class="dashboard-session-radar-sep"> - </span>');
    const getLastName = (name) => {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : 'Spiller';
    };
    const getInitials = (name) => String(name || 'S')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'S';
    const renderBenchPlayerHtml = (player) => {
        const jersey = player.drakt ? `${escapeHtml(player.drakt)}. ` : '';
        const lastName = getLastName(player.navn);

        return `
            <div class="match-bench-player">
                <span class="match-bench-avatar">${escapeHtml(getInitials(player.navn))}</span>
                <span class="match-bench-name">${jersey}${escapeHtml(lastName)}</span>
            </div>
        `;
    };
    const benchPositionRows = [
        { key: 'keeper', label: 'Keeper', categories: ['K'], players: [] },
        { key: 'defence', label: 'Forsvar', categories: ['F'], players: [] },
        { key: 'midfield', label: 'Midtbane', categories: ['M'], players: [] },
        { key: 'attack', label: 'Angrep', categories: ['A'], players: [] }
    ];
    selectedPlayers.forEach(player => {
        const category = getPositionCategory(player.pos1) || 'M';
        const row = benchPositionRows.find(positionRow => positionRow.categories.includes(category)) || benchPositionRows[2];
        row.players.push(player);
    });
    const benchPlayersHtml = selectedPlayers.length
        ? benchPositionRows.map(row => `
            <section class="match-bench-group match-bench-group-${row.key}" aria-label="${escapeHtml(row.label)}">
                <div class="match-bench-group-title">${escapeHtml(row.label)}</div>
                <div class="match-bench-row">
                    ${row.players.map(renderBenchPlayerHtml).join('')}
                </div>
            </section>
        `).join('')
        : `
            <div class="match-bench-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>Ingen spillere er meldt på ennå.</span>
            </div>
        `;
    const openPanel = window.pendingMatchDetailsOpenPanel || window.activeMatchDetailsOpenPanel || '';
    const isGamePlanOpen = openPanel === 'kampplan';
    window.pendingMatchDetailsOpenPanel = null;
    window.activeMatchDetailsOpenPanel = openPanel;

    container.innerHTML = `
        ${buildMatchDetailCardHtml(match)}

        <section class="match-bench-panel match-collapsible-panel is-collapsed">
            <div class="match-bench-action-row match-bench-topline">
                <div class="match-bench-heading">
                    <h3>Kamptropp</h3>
                    <span class="match-bench-heading-count" style="background:#f5c542;color:#0b2b4c;height:2.1rem;width:2.1rem;min-width:2.1rem;padding:0;" aria-label="${selectedPlayers.length} spillere i kamptropp">${selectedPlayers.length}</span>
                </div>
                <button type="button" class="match-panel-toggle-btn" onclick="window.toggleMatchPanel(this)" aria-expanded="false" aria-label="Vis kamptropp" data-show-label="Vis kamptropp" data-hide-label="Skjul kamptropp">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
                <div class="match-bench-actions">
                    <button type="button" onclick="window.openAttendanceModal('match_${escapeJsString(match.id)}')" class="match-detail-chip match-topline-action-btn" title="Åpne oppmøte">
                        <i class="fa-solid fa-user-check"></i>
                        <span>Oppmøte</span>
                    </button>
                </div>
            </div>

            <div class="match-bench-collapsible">
                <div class="match-bench-list">
                    ${benchPlayersHtml}
                </div>

                <div class="match-bench-position-line dashboard-session-radar-inline" aria-label="Posisjonsfordeling">
                    ${benchPositionHtml}
                </div>
            </div>
        </section>

        <section class="match-game-plan-panel match-collapsible-panel ${isGamePlanOpen ? '' : 'is-collapsed'}">
            <div class="match-bench-action-row match-bench-topline match-game-plan-topline">
                <div class="match-bench-heading">
                    <h3>Kampplan</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" onclick="window.toggleMatchPanel(this)" aria-expanded="${isGamePlanOpen ? 'true' : 'false'}" aria-label="${isGamePlanOpen ? 'Skjul kampplan' : 'Vis kampplan'}" data-show-label="Vis kampplan" data-hide-label="Skjul kampplan">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="match-game-plan-body">
                    ${buildMatchGamePlanHtml(match)}
                </div>
            </div>
        </section>

        <section class="match-coach-notes-panel match-collapsible-panel is-collapsed">
            <div class="match-bench-action-row match-bench-topline match-coach-notes-topline">
                <div class="match-bench-heading">
                    <h3>Trenernotater</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" onclick="window.toggleMatchPanel(this)" aria-expanded="false" aria-label="Vis trenernotater" data-show-label="Vis trenernotater" data-hide-label="Skjul trenernotater">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="match-coach-notes-body">
                    ${typeof window.buildMatchCoachNotesFieldsHtml === 'function' ? window.buildMatchCoachNotesFieldsHtml(match) : ''}
                </div>
                <div class="match-coach-notes-footer" aria-hidden="true"></div>
            </div>
        </section>

        <section class="match-stats-panel match-collapsible-panel is-collapsed">
            <div class="match-bench-action-row match-bench-topline match-stats-topline">
                <div class="match-bench-heading">
                    <h3>Spillerbørs</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" onclick="window.toggleMatchPanel(this)" aria-expanded="false" aria-label="Vis spillerbørs" data-show-label="Vis spillerbørs" data-hide-label="Skjul spillerbørs">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="match-stats-body">
                    <div id="kampdetaljer-spillerbors" class="match-stats-list">
                    </div>
                </div>
                <div class="match-stats-footer">
                    <button onclick="savePlayerMatchStats()" class="match-bench-action-btn match-stats-save-btn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Lagre</span>
                    </button>
                </div>
            </div>
        </section>
    `;

    renderPlayerRowForm(match);
    const backTarget = window.pendingMatchDetailsBackTab || (window.currentTab && window.currentTab !== 'kampdetaljer' ? window.currentTab : 'kamper');
    window.pendingMatchDetailsBackTab = null;
    switchTab('kampdetaljer', { backTarget });

    requestAnimationFrame(() => {
        window.initMatchGamePlanScroller();
        window.syncMatchGamePlanScroller();
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
    const existingNode = document.querySelector(`[data-game-plan-node="${posId}"]`);
    if (!coords || !existingNode) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildMatchGamePlanNodeHtml(match, posId, coords).trim();
    existingNode.replaceWith(wrapper.firstElementChild);
};

window.chooseMatchGamePlanPlayer = async function(matchId, posId, playerId = '') {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    const selectedPlayer = playerId
        ? (window.activePlayers || []).find(player => player.id === playerId)
        : null;

    match.lineup = {
        ...getMatchGamePlanLineup(match),
        [posId]: selectedPlayer ? { ...selectedPlayer } : null
    };

    window.renderMatchGamePlanStarterNode(match, posId);

    if (typeof window.saveMatchToDatabase === 'function') {
        await window.saveMatchToDatabase(match);
    }

    const modal = document.getElementById('tacticalPlayerModal');
    if (modal) {
        modal.classList.remove('match-game-plan-select-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.moveMatchGamePlanPlayerPosition = async function(matchId, fromPosId, toPosId) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    if (!match || fromPosId === toPosId) return;

    window.pendingMatchDetailsOpenPanel = 'kampplan';
    window.activeMatchDetailsOpenPanel = 'kampplan';
    const lineup = { ...getMatchGamePlanLineup(match) };
    const movingPlayer = lineup[fromPosId] || null;
    const targetPlayer = lineup[toPosId] || null;
    if (!movingPlayer) return;

    lineup[toPosId] = movingPlayer;
    lineup[fromPosId] = targetPlayer || null;
    match.lineup = lineup;

    window.renderMatchGamePlanStarterNode(match, fromPosId);
    window.renderMatchGamePlanStarterNode(match, toPosId);

    if (typeof window.saveMatchToDatabase === 'function') {
        await window.saveMatchToDatabase(match);
    }

    const modal = document.getElementById('tacticalPlayerModal');
    if (modal) {
        modal.classList.remove('match-game-plan-select-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

function renderMatchGamePlanSelectActions(list, matchId, posId, mode) {
    const actions = document.createElement('div');
    actions.className = 'match-game-plan-select-actions';
    actions.innerHTML = `
        <button type="button" class="match-game-plan-select-action ${mode === 'player' ? 'is-active' : ''}" onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(matchId)}', '${escapeMatchJsString(posId)}', 'player')">
            <i class="fa-solid fa-user-pen"></i>
            <span>Bytt spiller</span>
        </button>
        <button type="button" class="match-game-plan-select-action ${mode === 'position' ? 'is-active' : ''}" onclick="window.openMatchGamePlanPlayerSelect('${escapeMatchJsString(matchId)}', '${escapeMatchJsString(posId)}', 'position')">
            <i class="fa-solid fa-arrows-left-right"></i>
            <span>Bytt posisjon</span>
        </button>
    `;
    list.appendChild(actions);
}

function removeMatchGamePlanClearPlayerButton(modal) {
    modal?.querySelector('[data-match-game-plan-clear-player]')?.remove();
}

function renderMatchGamePlanClearPlayerButton(modal, matchId, posId) {
    removeMatchGamePlanClearPlayerButton(modal);
    const header = modal?.firstElementChild?.firstElementChild;
    if (!header) return;

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'match-gold-round-icon-btn match-game-plan-clear-icon-btn';
    clearButton.dataset.matchGamePlanClearPlayer = 'true';
    clearButton.title = `Fjern spiller fra ${posId}`;
    clearButton.setAttribute('aria-label', `Fjern spiller fra ${posId}`);
    clearButton.onclick = () => window.chooseMatchGamePlanPlayer(matchId, posId, '');
    clearButton.innerHTML = '<i class="fa-solid fa-user-minus"></i>';
    header.appendChild(clearButton);
}

function renderMatchGamePlanPositionOptions(list, match, posId) {
    const lineup = getMatchGamePlanLineup(match);
    const currentPlayer = lineup[posId];
    if (!currentPlayer) return;

    const options = Object.keys(matchGamePlanStarterPositions)
        .filter(targetPosId => targetPosId !== posId)
        .filter(targetPosId => !matchGamePlanSamePlayer(lineup[targetPosId], currentPlayer))
        .sort((a, b) => {
            const scoreA = getMatchGamePlanPositionScore(currentPlayer, a);
            const scoreB = getMatchGamePlanPositionScore(currentPlayer, b);
            return scoreA - scoreB || a.localeCompare(b);
        });

    options.forEach(targetPosId => {
        const targetPlayer = lineup[targetPosId];
        const score = getMatchGamePlanPositionScore(currentPlayer, targetPosId);
        const matchLabel = score === 0 ? 'Primær' : (score === 1 ? 'Sekundær' : 'Annen');
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'match-game-plan-player-option';
        row.onclick = () => window.moveMatchGamePlanPlayerPosition(match.id, posId, targetPosId);
        row.innerHTML = `
            <span class="match-game-plan-player-avatar">${escapeMatchHtml(targetPosId)}</span>
            <span class="match-game-plan-player-copy">
                <strong>${escapeMatchHtml(getMatchGamePlanPositionLabel(targetPosId))}</strong>
                <span>${targetPlayer ? `Bytt med ${escapeMatchHtml(getMatchGamePlanPlayerShortName(targetPlayer))}` : 'Ledig posisjon'}</span>
            </span>
            <span class="match-game-plan-player-tag">${matchLabel}</span>
        `;
        list.appendChild(row);
    });
}

window.openMatchGamePlanPlayerSelect = function(matchId, posId, mode = null) {
    const match = (window.activeMatches || []).find(item => item.id === matchId);
    const modal = document.getElementById('tacticalPlayerModal');
    const list = document.getElementById('tactical-player-list');
    const label = document.getElementById('tactical-pos-label');
    const title = modal.querySelector('h3');
    if (!match || !modal || !list) return;

    const lineup = getMatchGamePlanLineup(match);
    const selectedPlayer = lineup[posId] || null;
    const currentMode = mode || 'player';
    const players = getMatchGamePlanSelectablePlayers(match).sort((a, b) => {
        const scoreA = getMatchGamePlanPositionScore(a, posId);
        const scoreB = getMatchGamePlanPositionScore(b, posId);
        if (scoreA !== scoreB) return scoreA - scoreB;

        const jerseyA = Number(a.drakt || a.draktnummer) || 999;
        const jerseyB = Number(b.drakt || b.draktnummer) || 999;
        return jerseyA - jerseyB || a.navn.localeCompare(b.navn);
    });

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
    list.innerHTML = '';
    removeMatchGamePlanClearPlayerButton(modal);

    if (selectedPlayer) {
        renderMatchGamePlanSelectActions(list, matchId, posId, currentMode);
        renderMatchGamePlanClearPlayerButton(modal, matchId, posId);
    }

    if (currentMode === 'position' && selectedPlayer) {
        renderMatchGamePlanPositionOptions(list, match, posId);
    } else {
        players
            .filter(player => !matchGamePlanSamePlayer(player, selectedPlayer))
            .forEach(player => {
                const score = getMatchGamePlanPositionScore(player, posId);
                const matchLabel = score === 0 ? 'Primær' : (score === 1 ? 'Sekundær' : 'Annen');
                const jersey = player.drakt || player.draktnummer || '-';
                const isOnPitch = Object.values(lineup).some(lineupPlayer =>
                    lineupPlayer
                    && ((lineupPlayer.id && player.id && lineupPlayer.id === player.id)
                        || (lineupPlayer.navn && player.navn && lineupPlayer.navn === player.navn))
                );
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'match-game-plan-player-option';
                row.onclick = () => window.chooseMatchGamePlanPlayer(matchId, posId, player.id);
                row.innerHTML = `
                    <span class="match-game-plan-player-status-dot ${isOnPitch ? 'is-on-pitch' : 'is-off-pitch'}" title="${isOnPitch ? 'Allerede på banen' : 'Ledig'}"></span>
                    <span class="match-game-plan-player-avatar">${escapeMatchHtml(jersey)}</span>
                    <span class="match-game-plan-player-copy">
                        <strong>${escapeMatchHtml(player.navn)}</strong>
                        <span>${escapeMatchHtml(player.pos1 || 'Ukjent posisjon')}</span>
                    </span>
                    <span class="match-game-plan-player-tag">${matchLabel}</span>
                `;
                list.appendChild(row);
            });
    }

    if (!list.querySelector('.match-game-plan-player-option')) {
        const empty = document.createElement('div');
        empty.className = 'match-game-plan-player-empty';
        empty.textContent = currentMode === 'position'
            ? 'Ingen posisjoner å bytte til.'
            : 'Ingen påmeldte spillere å velge mellom ennå.';
        list.appendChild(empty);
    }

    modal.classList.add('match-game-plan-select-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
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

    window.goToMatchGamePlanTab(matchGamePlanTabs[0].id, 'auto');
};

window.toggleMatchPanel = function(btn) {
    const panel = btn?.closest('.match-collapsible-panel');
    if (!panel) return;

    const shouldOpen = panel.classList.contains('is-collapsed');

    if (shouldOpen) {
        document.querySelectorAll('#kampdetaljer-info .match-collapsible-panel').forEach(otherPanel => {
            otherPanel.classList.add('is-collapsed');
            const otherToggle = otherPanel.querySelector('.match-panel-toggle-btn');
            if (otherToggle) {
                otherToggle.setAttribute('aria-expanded', 'false');
                otherToggle.setAttribute('aria-label', otherToggle.dataset.showLabel || 'Vis seksjon');
            }
        });

        panel.classList.remove('is-collapsed');
        window.activeMatchDetailsOpenPanel = panel.classList.contains('match-game-plan-panel')
            ? 'kampplan'
            : (panel.classList.contains('match-bench-panel')
                ? 'kamptropp'
                : (panel.classList.contains('match-coach-notes-panel')
                    ? 'trenernotater'
                    : (panel.classList.contains('match-stats-panel') ? 'spillerbors' : '')));
    } else {
        panel.classList.add('is-collapsed');
        window.activeMatchDetailsOpenPanel = '';
    }

    btn.setAttribute('aria-expanded', String(shouldOpen));
    btn.setAttribute('aria-label', shouldOpen ? (btn.dataset.hideLabel || 'Skjul seksjon') : (btn.dataset.showLabel || 'Vis seksjon'));

    if (shouldOpen && panel.classList.contains('match-game-plan-panel')) {
        requestAnimationFrame(() => {
            window.initMatchGamePlanScroller();
            window.syncMatchGamePlanScroller();
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
    window.switchTab('taktikk');
    setTimeout(() => {
        const tacticalSelect = document.getElementById('tacticalMatchSelect');
        if (tacticalSelect) {
            tacticalSelect.value = matchId;
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
        formList.innerHTML = `
            <div class="match-stats-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>Ingen spillere er meldt på ennå.</span>
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
            <div class="match-stats-player-info">
                <span class="match-stats-player-name">${escapeMatchHtml(player)}</span>
                ${isBenchOnly ? '<span class="match-stats-bench-badge">Kun oppmøte</span>' : ''}
                <span class="match-rating-current-hint ${Number(prevRating) > 0 ? '' : 'is-empty'}" data-rating-current-hint>${escapeMatchHtml(ratingHint)}</span>
            </div>
            <div class="match-stats-controls">
                <button type="button" onclick="toggleBenchOnly(this)" class="player-bench-btn h-7 px-2 rounded-md border-2 font-black text-[9px] transition-all flex items-center justify-center shrink-0 ${isBenchOnly ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-active="${isBenchOnly ? 'true' : 'false'}" title="Spilleren var kun på benken (15 poeng oppmøte)">BENK</button>
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
                        data-player-id="${playerIdAttr}"
                        data-player="${playerAttr}"
                        aria-label="Børs for ${playerAttr}"
                        onchange="window.updateMatchRatingHint(this)"
                        onfocus="window.updateMatchRatingHint(this)"
                        onmouseenter="window.updateMatchRatingHint(this)"
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
                    <button type="button" onclick="toggleCard(this, 'yellow')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasYellow ? 'bg-yellow-400 border-yellow-500 text-slate-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-type="yellow" data-active="${hasYellow ? 'true' : 'false'}">🟨</button>
                    <button type="button" onclick="toggleCard(this, 'red')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasRed ? 'bg-red-500 border-red-600 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-red-50 hover:text-red-400 hover:border-red-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-type="red" data-active="${hasRed ? 'true' : 'false'}">🟥</button>
                    <button type="button" onclick="toggleMotm(this)" class="player-motm-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${isMotm ? 'bg-purple-700 border-purple-800 text-white shadow-sm scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'}" data-player-id="${playerIdAttr}" data-player="${playerAttr}" data-active="${isMotm ? 'true' : 'false'}">BB</button>
                </div>
                </div>
            </div>
        `;
        formList.appendChild(div);
    });
};

window.toggleBenchOnly = function(btn) {
    const isActive = btn.getAttribute('data-active') === 'true';
    const newState = !isActive;
    btn.setAttribute('data-active', newState ? 'true' : 'false');

    const row = btn.closest('.py-3');
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
    if (!match.result && totalBskGoals > 0) match.result = `${totalBskGoals}-0`;

    await window.saveMatchToDatabase(match);

    alert('Mål, assists, spillerbørs, kort og Banens Beste er oppdatert! 🏆');
    applyFilters();
    if (typeof window.renderStatistikkSide === 'function') window.renderStatistikkSide();
};
