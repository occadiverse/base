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
    const selectedPlayers = [...benchPlayers, ...fallbackBenchPlayers];
    const getPositionCategory = (pos1) => {
        if (typeof window.getPositionCategoryFromPos1 === 'function') {
            return window.getPositionCategoryFromPos1(pos1);
        }
        if (!pos1) return null;
        const normalized = String(pos1).trim();
        if (normalized === 'Keeper' || normalized.toLowerCase().includes('keeper')) return 'K';
        if (['Høyre bekk', 'Venstre bekk', 'Høyre stopper', 'Venstre stopper'].includes(normalized)) return 'F';
        if (['Spiss', 'Playmaker', 'Høyre kant', 'Venstre kant'].includes(normalized)) return 'A';
        return 'M';
    };
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
    const benchPlayersHtml = selectedPlayers.length
        ? selectedPlayers.map(player => {
            const jersey = player.drakt ? `${escapeHtml(player.drakt)}. ` : '';
            const lastName = getLastName(player.navn);
            return `
                <div class="match-bench-player">
                    <span class="match-bench-avatar">${escapeHtml(getInitials(player.navn))}</span>
                    <span class="match-bench-name">${jersey}${escapeHtml(lastName)}</span>
                </div>
            `;
        }).join('')
        : `
            <div class="match-bench-empty">
                <i class="fa-solid fa-clipboard-user"></i>
                <span>Ingen spillere er meldt på ennå.</span>
            </div>
        `;

    container.innerHTML = `
        ${buildMatchDetailCardHtml(match)}

        <section class="match-bench-panel">
            <div class="match-bench-action-row">
                <div class="match-bench-heading">
                    <h3>Påmeldte spillere</h3>
                </div>
                <div class="match-bench-actions">
                    <button type="button" onclick="window.openAttendanceModal('match_${escapeJsString(match.id)}')" class="match-bench-action-btn" title="Legg til spillere">
                        <i class="fa-solid fa-user-check"></i>
                        <span>Legg til</span>
                    </button>
                    <button type="button" onclick="window.openMatchModal('${escapeJsString(match.id)}')" class="match-bench-action-btn" title="Rediger kamp">
                        <i class="fa-solid fa-pen-to-square"></i>
                        <span>Rediger</span>
                    </button>
                </div>
            </div>

            <div class="match-bench-list">
                ${benchPlayersHtml}
            </div>

            <div class="match-bench-position-line dashboard-session-radar-inline" aria-label="Posisjonsfordeling">
                ${benchPositionHtml}
            </div>
        </section>

        <section class="match-coach-notes-panel">
            <div class="match-coach-notes-header">
                <div>
                    <span class="match-detail-summary-label">Trenernotater</span>
                    <p class="match-coach-notes-lead">Sett fokus for treningsuka basert på kampen. Notatene vises på kampstatus-kortet på forsiden.</p>
                </div>
            </div>
            ${typeof window.buildMatchCoachNotesFieldsHtml === 'function' ? window.buildMatchCoachNotesFieldsHtml(match) : ''}
        </section>
    `;

    renderPlayerRowForm(match);
    const backTarget = window.pendingMatchDetailsBackTab || (window.currentTab && window.currentTab !== 'kampdetaljer' ? window.currentTab : 'kamper');
    window.pendingMatchDetailsBackTab = null;
    switchTab('kampdetaljer', { backTarget });
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
        b.classList.remove('bg-indigo-100', 'border-indigo-300', 'text-indigo-950', 'shadow-sm', 'scale-95');
        b.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-300');
    });

    if (!isActive) {
        btn.setAttribute('data-active', 'true');
        btn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-300');
        btn.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-950', 'shadow-sm', 'scale-95');
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
            <div class="py-8 text-center text-slate-500 text-sm">
                <i class="fa-solid fa-clipboard-user text-3xl text-slate-300 mb-3 block"></i>
                Ingen spillere er registrert med oppmøte på denne kampen enda.<br>
                <span class="text-xs mt-1 block">Trykk på <b>"Oppmøte"</b> for å velge hvem som spilte!</span>
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
        notice.className = 'py-3 px-1 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg mb-2';
        notice.innerHTML = 'Oppmøteliste mangler for denne kampen, men lagret kampstatistikk vises her. Trykk <b>Oppmøte</b> for å bekrefte troppen.';
        formList.appendChild(notice);
    }

    playersToRender.forEach(playerObj => {
        const player = playerObj.navn;
        const playerId = playerObj.id;
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

        const div = document.createElement('div');
        div.className = "py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2";
        div.innerHTML = `
            <div class="min-w-0">
                <span class="font-bold text-slate-800 text-xs">${player}</span>
                ${isBenchOnly ? '<span class="ml-2 text-[9px] font-black uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Kun oppmøte</span>' : ''}
            </div>
            <div class="flex items-end gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button type="button" onclick="toggleBenchOnly(this)" class="player-bench-btn h-7 px-2 rounded-md border-2 font-black text-[9px] transition-all flex items-center justify-center shrink-0 ${isBenchOnly ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'}" data-player-id="${playerId}" data-player="${player}" data-active="${isBenchOnly ? 'true' : 'false'}" title="Spilleren var kun på benken (15 poeng oppmøte)">BENK</button>
                <div class="player-pitch-stats flex items-end gap-2 ${pitchDisabled}">
                <div class="match-stat-field">
                    <span class="match-stat-label">Mål</span>
                    <select class="player-goals-input portal-field portal-field-sm match-stat-select" data-player-id="${playerId}" data-player="${player}" aria-label="Mål for ${player}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevGoals) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field">
                    <span class="match-stat-label">Ass</span>
                    <select class="player-assists-input portal-field portal-field-sm match-stat-select" data-player-id="${playerId}" data-player="${player}" aria-label="Assist for ${player}">
                        ${scoreOptions.map(v => `<option value="${v}" ${Number(prevAssists) === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>

                <div class="match-stat-field">
                    <span class="match-stat-label">Børs</span>
                    <select class="player-rating-select portal-field portal-field-sm match-stat-select match-stat-select-rating" data-player-id="${playerId}" data-player="${player}" aria-label="Børs for ${player}">
                        <option value="0" ${prevRating === 0 ? 'selected' : ''}>--</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(v => `<option value="${v}" ${prevRating === v ? 'selected' : ''}>${v} ★</option>`).join('')}
                    </select>
                </div>

                <div class="flex items-center space-x-1 border-l border-slate-200 pl-2 ml-1">
                    <button type="button" onclick="toggleCard(this, 'yellow')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasYellow ? 'bg-yellow-400 border-yellow-500 text-slate-900 shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'}" data-player-id="${playerId}" data-player="${player}" data-type="yellow" data-active="${hasYellow ? 'true' : 'false'}">🟨</button>
                    <button type="button" onclick="toggleCard(this, 'red')" class="player-card-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${hasRed ? 'bg-red-500 border-red-600 text-white shadow-inner scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-red-50 hover:text-red-400 hover:border-red-200'}" data-player-id="${playerId}" data-player="${player}" data-type="red" data-active="${hasRed ? 'true' : 'false'}">🟥</button>
                    <button type="button" onclick="toggleMotm(this)" class="player-motm-btn w-7 h-7 rounded-md border-2 font-black text-[10px] transition-all flex items-center justify-center ${isMotm ? 'bg-indigo-100 border-indigo-300 text-indigo-950 shadow-sm scale-95' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}" data-player-id="${playerId}" data-player="${player}" data-active="${isMotm ? 'true' : 'false'}">BB</button>
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
