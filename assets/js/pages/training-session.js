function escapeTrainingHtml(value) {
    return typeof window.escapeModalHtml === 'function'
        ? window.escapeModalHtml(value)
        : String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
}

window._trainingSessionGroupCounts = window._trainingSessionGroupCounts || {};
window._trainingSessionGroups = window._trainingSessionGroups || {};

function setTrainingSessionFeedback(message, variant = '', autoClearMs = 0, selector = '[data-training-attendance-save-state]') {
    const el = document.querySelector(selector);
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

function getTrainingEvent(eventId) {
    return (window.activeEvents || []).find(event => event.id === eventId) || null;
}

function isActivitySessionType(type) {
    return type === 'Trening' || type === 'Annet';
}

function getRegisteredPlayerSortCategory(player) {
    if (player?.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player?.id))) {
        return 'Gjest';
    }
    if (typeof window.getPositionCategoryFromPos1 === 'function') {
        return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
    }
    return 'M';
}

function getRegisteredPlayersForEvent(event) {
    const refs = typeof window.getAttendingPlayerRefs === 'function'
        ? window.getAttendingPlayerRefs(event?.attendance)
        : Object.keys(event?.attendance || {}).filter(ref => event.attendance[ref] === true);

    const categoryOrder = { K: 0, F: 1, M: 2, A: 3, Gjest: 4 };

    return refs
        .map(ref => (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : null))
        .filter(Boolean)
        .sort((a, b) => {
            const orderA = categoryOrder[getRegisteredPlayerSortCategory(a)] ?? 3;
            const orderB = categoryOrder[getRegisteredPlayerSortCategory(b)] ?? 3;
            if (orderA !== orderB) return orderA - orderB;
            return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
        });
}

function getPlayerPositionCategory(player) {
    if (player?.isGuest || (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player?.id))) {
        return 'Gjest';
    }
    if (typeof window.getPositionCategoryFromPos1 === 'function') {
        return window.getPositionCategoryFromPos1(player?.pos1) || 'M';
    }
    return 'M';
}

function getPlayerFormScore(player) {
    if (!player || player.isGuest) return 0;
    if (typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id)) return 0;
    if (typeof window.calculatePlayerPerformanceChemistry === 'function' && player.navn) {
        return Number(window.calculatePlayerPerformanceChemistry(player.navn)) || 0;
    }
    return 0;
}

function sortPlayersByForm(players) {
    return [...players].sort((a, b) => {
        const formDiff = getPlayerFormScore(b) - getPlayerFormScore(a);
        if (formDiff !== 0) return formDiff;
        return (a.navn || '').localeCompare(b.navn || '', 'no', { sensitivity: 'base' });
    });
}

function allocateCategoryQuotas(remainingByCategory, targetCount) {
    const categories = ['F', 'M', 'A', 'Gjest'];
    const available = categories
        .map((category) => ({
            category,
            count: (remainingByCategory[category] || []).length
        }))
        .filter(item => item.count > 0);

    const totalRemaining = available.reduce((sum, item) => sum + item.count, 0);
    const quotas = { F: 0, M: 0, A: 0, Gjest: 0 };

    if (targetCount <= 0 || totalRemaining <= 0) return quotas;
    if (targetCount >= totalRemaining) {
        available.forEach((item) => {
            quotas[item.category] = item.count;
        });
        return quotas;
    }

    const rows = available.map((item) => ({
        category: item.category,
        count: item.count,
        floor: Math.floor((item.count * targetCount) / totalRemaining),
        remScore: (item.count * targetCount) % totalRemaining
    }));

    let assigned = rows.reduce((sum, row) => sum + row.floor, 0);
    let need = targetCount - assigned;

    rows.forEach((row) => {
        quotas[row.category] = row.floor;
    });

    // Gi restplasser etter høyest rest; ved likhet: knappest rolle først.
    rows
        .slice()
        .sort((a, b) => {
            if (b.remScore !== a.remScore) return b.remScore - a.remScore;
            if (a.count !== b.count) return a.count - b.count;
            return categories.indexOf(a.category) - categories.indexOf(b.category);
        })
        .forEach((row) => {
            if (need <= 0) return;
            if (quotas[row.category] >= row.count) return;
            quotas[row.category] += 1;
            need -= 1;
        });

    categories.forEach((category) => {
        quotas[category] = Math.min(quotas[category], (remainingByCategory[category] || []).length);
    });

    return quotas;
}

function takeBestRemainingPlayer(remainingByCategory) {
    const categories = ['F', 'M', 'A', 'Gjest'];
    let bestPlayer = null;
    let bestCategory = null;
    let bestForm = -Infinity;

    categories.forEach((category) => {
        const player = (remainingByCategory[category] || [])[0];
        if (!player) return;
        const form = getPlayerFormScore(player);
        if (
            form > bestForm
            || (form === bestForm && (bestCategory === null || categories.indexOf(category) < categories.indexOf(bestCategory)))
        ) {
            bestForm = form;
            bestPlayer = player;
            bestCategory = category;
        }
    });

    if (!bestPlayer || !bestCategory) return null;
    remainingByCategory[bestCategory].shift();
    return bestPlayer;
}

function distributePlayersIntoGroups(players, groupCount) {
    const keepers = sortPlayersByForm(
        players.filter(player => getPlayerPositionCategory(player) === 'K')
    );
    const outfieldPlayers = players.filter(player => getPlayerPositionCategory(player) !== 'K');
    const remainingByCategory = { F: [], M: [], A: [], Gjest: [] };

    outfieldPlayers.forEach((player) => {
        const category = getPlayerPositionCategory(player);
        const key = remainingByCategory[category] ? category : 'M';
        remainingByCategory[key].push(player);
    });
    Object.keys(remainingByCategory).forEach((category) => {
        remainingByCategory[category] = sortPlayersByForm(remainingByCategory[category]);
    });

    const totalOutfield = outfieldPlayers.length;
    const base = Math.floor(totalOutfield / groupCount);
    const remainder = totalOutfield % groupCount;
    // Restspillere til de siste gruppene, så størrelsene blir så like som mulig
    // uten at Gruppe 1 blir den største ved rest.
    const targetSizes = Array.from({ length: groupCount }, (_, index) => (
        base + (index >= groupCount - remainder ? 1 : 0)
    ));

    const fieldGroups = Array.from({ length: groupCount }, () => []);

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const remainingCount = Object.values(remainingByCategory).reduce((sum, list) => sum + list.length, 0);
        if (remainingCount === 0) break;

        if (groupIndex === groupCount - 1) {
            ['F', 'M', 'A', 'Gjest'].forEach((category) => {
                fieldGroups[groupIndex].push(...remainingByCategory[category]);
                remainingByCategory[category] = [];
            });
            break;
        }

        const target = targetSizes[groupIndex];
        const quotas = allocateCategoryQuotas(remainingByCategory, target);
        ['F', 'M', 'A', 'Gjest'].forEach((category) => {
            const takeCount = quotas[category] || 0;
            if (takeCount > 0) {
                fieldGroups[groupIndex].push(...remainingByCategory[category].splice(0, takeCount));
            }
        });

        while (fieldGroups[groupIndex].length < target) {
            const nextPlayer = takeBestRemainingPlayer(remainingByCategory);
            if (!nextPlayer) break;
            fieldGroups[groupIndex].push(nextPlayer);
        }
    }

    const groups = [];
    if (keepers.length) {
        groups.push({
            label: keepers.length === 1 ? 'Keeper' : 'Keepere',
            players: keepers,
            isKeeperGroup: true
        });
    }

    fieldGroups.forEach((groupPlayers, index) => {
        if (!groupPlayers.length && keepers.length && totalOutfield === 0) return;
        groups.push({
            label: `Gruppe ${index + 1}`,
            players: groupPlayers,
            isKeeperGroup: false
        });
    });

    if (!groups.length && keepers.length) {
        groups.push({
            label: keepers.length === 1 ? 'Keeper' : 'Keepere',
            players: keepers,
            isKeeperGroup: true
        });
    }

    return groups;
}

function buildRegisteredPlayersHtml(players) {
    if (!players.length) {
        return `
            <div class="training-session-empty">
                <i class="fa-solid fa-user-slash"></i>
                <p>Ingen spillere er registrert med oppmøte ennå.</p>
                <p class="training-session-empty-hint">Registrer oppmøte for å se hvem som møtte opp.</p>
            </div>
        `;
    }

    const categoryLabels = {
        K: 'Keeper',
        F: 'Forsvar',
        M: 'Midtbane',
        A: 'Angrep',
        Gjest: 'Gjestespiller'
    };
    const categoryOrder = ['K', 'F', 'M', 'A', 'Gjest'];
    const grouped = Object.fromEntries(categoryOrder.map(key => [key, []]));

    players.forEach((player) => {
        const category = getRegisteredPlayerSortCategory(player);
        (grouped[category] || grouped.M).push(player);
    });

    const groupsHtml = categoryOrder
        .filter(key => grouped[key].length > 0)
        .map((key) => {
            const rowsHtml = grouped[key].map((player) => {
                const jersey = player.draktnummer ? `#${player.draktnummer}` : '';
                const pos = !player.isGuest && player.pos1 && player.pos1 !== '-' ? player.pos1 : '';
                return `
                    <div class="training-session-player-row">
                        <span class="training-session-player-name">${escapeTrainingHtml(player.navn)}</span>
                        <span class="training-session-player-meta">
                            ${jersey ? `<span>${escapeTrainingHtml(jersey)}</span>` : ''}
                            ${pos ? `<span>${escapeTrainingHtml(pos)}</span>` : ''}
                        </span>
                    </div>
                `;
            }).join('');

            return `
                <section class="training-session-player-group">
                    <header class="match-fixture-month">${escapeTrainingHtml(categoryLabels[key])}</header>
                    <div class="training-session-player-group-box">
                        ${rowsHtml}
                    </div>
                </section>
            `;
        }).join('');

    return `
        <div class="training-session-player-list">
            ${groupsHtml}
        </div>
    `;
}

function buildGroupPlayersRowsHtml(groupPlayers) {
    if (!groupPlayers.length) {
        return `
            <div class="training-session-player-row">
                <span class="training-session-player-name training-session-group-empty">Ingen spillere</span>
            </div>
        `;
    }

    return groupPlayers.map((player) => {
        const jersey = player.draktnummer ? `#${player.draktnummer}` : '';
        const pos = !player.isGuest && player.pos1 && player.pos1 !== '-' ? player.pos1 : '';
        return `
            <div class="training-session-player-row">
                <span class="training-session-player-name">${escapeTrainingHtml(player.navn)}</span>
                <span class="training-session-player-meta">
                    ${jersey ? `<span>${escapeTrainingHtml(jersey)}</span>` : ''}
                    ${pos ? `<span>${escapeTrainingHtml(pos)}</span>` : ''}
                </span>
            </div>
        `;
    }).join('');
}

function buildGroupsHtml(eventId, players) {
    const groupCount = window._trainingSessionGroupCounts[eventId] || 1;
    let groups = null;

    if (players.length) {
        groups = distributePlayersIntoGroups(players, groupCount);
        window._trainingSessionGroups[eventId] = groups;
    } else {
        delete window._trainingSessionGroups[eventId];
    }

    const groupCountButtons = [1, 2, 3, 4].map(count => {
        const label = count === 1 ? '1 gruppe' : `${count} grupper`;
        const isActive = count === groupCount;
        return `
            <button
                type="button"
                class="training-session-group-count-btn${isActive ? ' is-active' : ''}"
                data-training-action="set-group-count"
                data-group-count="${count}"
                aria-pressed="${isActive ? 'true' : 'false'}"
                title="${escapeTrainingHtml(label)}"
                aria-label="${escapeTrainingHtml(label)}"
            >${escapeTrainingHtml(label)}</button>
        `;
    }).join('');

    let groupsResultHtml = '';
    if (!players.length) {
        groupsResultHtml = `
            <div class="training-session-empty training-session-empty-compact">
                <p>Registrer oppmøte før du fordeler grupper.</p>
            </div>
        `;
    } else if (groups && groups.length) {
        groupsResultHtml = `
            <div class="training-session-player-list">
                ${groups.map((group) => `
                    <section class="training-session-player-group">
                        <header class="match-fixture-month">${escapeTrainingHtml(group.label)}</header>
                        <div class="training-session-player-group-box">
                            ${buildGroupPlayersRowsHtml(group.players || [])}
                        </div>
                    </section>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="training-session-groups-controls" role="group" aria-label="Antall grupper">
            ${groupCountButtons}
        </div>
        ${groupsResultHtml}
    `;
}

function getTrainingSessionTeamName(event) {
    return event?.team || event?.matchGroup || '';
}

function getLatestFinishedMatchForTeam(teamName) {
    return (window.activeMatches || [])
        .filter(match => {
            if (!match?.result || !String(match.result).includes('-')) return false;
            if (teamName && match.matchGroup && match.matchGroup !== teamName) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;
}

function getTrainingMatchScore(match) {
    if (typeof parseScore === 'function') return parseScore(match?.result);
    if (typeof window.parseScore === 'function') return window.parseScore(match?.result);
    return null;
}

function getTrainingMatchPlayerRating(match, player) {
    if (!match || !player || typeof window.getPlayerRefMapValue !== 'function') return 0;
    return Number(window.getPlayerRefMapValue(match.ratings, player, 0)) || 0;
}

function getTrainingMatchLineRatingAverages(match) {
    const teamName = match?.matchGroup || '';
    const players = (window.activePlayers || []).filter(player => (
        player.status !== 'Passiv'
        && (!teamName || player.spillerLag === teamName)
        && (typeof window.isPlayerAttending !== 'function' || window.isPlayerAttending(match.attendance, player))
        && (typeof window.isPlayerOnPitch !== 'function' || window.isPlayerOnPitch(match, player))
    ));

    const buckets = { F: [], M: [], A: [] };
    players.forEach(player => {
        const category = getPlayerPositionCategory(player);
        const rating = getTrainingMatchPlayerRating(match, player);
        if (!buckets[category] || rating <= 0) return;
        buckets[category].push(rating);
    });

    return Object.fromEntries(
        Object.entries(buckets).map(([key, values]) => [
            key,
            values.length
                ? values.reduce((sum, value) => sum + value, 0) / values.length
                : null
        ])
    );
}

function getTrainingMatchIntro(match, score) {
    const opponent = match.opponent || 'motstander';
    const resultLabel = score.bsk > score.opponent
        ? 'seier'
        : (score.bsk < score.opponent ? 'tap' : 'uavgjort');
    return `Basert på siste kamp mot ${opponent} — ${resultLabel} ${score.bsk}-${score.opponent}.`;
}

const TRAINING_FOCUS_NOTE_RULES = [
    {
        category: 'dodball',
        title: 'Defensiv corner / dødball',
        keywords: ['corner', 'defc', 'dødball', 'dodball', '5 meter', '5-meter', '5meter', 'marking i eget', 'eget felt']
    },
    {
        category: 'avslutninger',
        title: 'Angrep via kantene',
        keywords: ['kant', 'angrepsmønster', 'innlegg', 'avslutning', 'siste tredjedel']
    },
    {
        category: 'defensiv',
        title: 'Defensiv organisering',
        keywords: ['mellomrom', 'mellom rom', 'struktur', 'bakre fire', 'midtrekke', 'kompakt', '451', 'organisering', 'press']
    },
    {
        category: 'ballbesittelse',
        title: 'Spille seg ut / ballbesittelse',
        keywords: ['spille ut', 'spille oss ut', 'langs bakken', 'ballbesittelse', 'kombinere']
    },
    {
        category: 'linjespill',
        title: 'Linjespill',
        keywords: ['linje i spill', 'forsvar i spill', 'midtbane i spill', 'angrep i spill']
    },
    {
        category: 'annet',
        title: 'Neste jobb / konsentrasjon',
        keywords: ['neste jobb', 'dommer', 'provoser']
    }
];

function inferTrainingFocusFromCoachNotes(match) {
    const challenge = String(match?.notes?.challenge || '').trim();
    if (!challenge) return null;

    const normalized = challenge.toLowerCase();
    const rule = TRAINING_FOCUS_NOTE_RULES.find(entry => (
        entry.keywords.some(keyword => normalized.includes(keyword))
    ));
    if (!rule) {
        return {
            title: 'Fokus fra trenernotat',
            reason: challenge,
            category: 'annet',
            source: 'notes'
        };
    }

    return {
        title: rule.title,
        reason: challenge,
        category: rule.category,
        source: 'notes'
    };
}

function buildTrainingFocusFallbackFromMatch(match, score) {
    const needsDefensiveShape = score.opponent >= 3
        || (score.bsk < score.opponent && score.opponent >= 2);
    const needsDefensiveSetPieces = score.opponent >= 2;

    if (needsDefensiveSetPieces) {
        return {
            title: 'Defensiv corner / dødball',
            reason: `${score.opponent} mål imot — prioriter DefC og marking i eget felt.`,
            category: 'dodball',
            source: 'result'
        };
    }

    if (needsDefensiveShape) {
        return {
            title: 'Defensiv organisering',
            reason: `Med ${score.opponent} mål imot bør økten fokusere struktur, avstander og kommunikasjon bakover.`,
            category: 'defensiv',
            source: 'result'
        };
    }

    if (score.bsk === 0 || (score.bsk < score.opponent && score.bsk <= 1)) {
        return {
            title: 'Avslutninger og siste tredjedel',
            reason: score.bsk === 0
                ? 'Ingen scoringer sist kamp — mer trening i siste tredjedel og avslutninger.'
                : `Kun ${score.bsk} mål scoret — mer trening i siste tredjedel og avslutninger.`,
            category: 'avslutninger',
            source: 'result'
        };
    }

    const lineAverages = getTrainingMatchLineRatingAverages(match);
    const lineLabels = { F: 'Forsvar', M: 'Midtbane', A: 'Angrep' };
    const weakLines = Object.entries(lineAverages)
        .filter(([, avg]) => avg !== null && avg > 0 && avg < 5)
        .sort((a, b) => a[1] - b[1]);

    if (weakLines.length) {
        const [lineKey, avg] = weakLines[0];
        const lineName = lineLabels[lineKey];
        return {
            title: `${lineName} i spill`,
            reason: `Snittbørs ${avg.toFixed(1)} i ${lineName.toLowerCase()} sist kamp — gi den linjen mer spilløving.`,
            category: 'linjespill',
            source: 'ratings'
        };
    }

    if (score.bsk >= score.opponent) {
        return {
            title: 'Videreutvikle ballbesittelse',
            reason: 'Resultatet var bra — bygg videre på ballbesittelse og det som fungerte.',
            category: 'ballbesittelse',
            source: 'result'
        };
    }

    return null;
}

function buildTrainingSessionFocus(match) {
    if (!match) return null;

    const score = getTrainingMatchScore(match);
    if (!score) return null;

    const focus = inferTrainingFocusFromCoachNotes(match)
        || buildTrainingFocusFallbackFromMatch(match, score);
    if (!focus) return null;

    const keepOn = String(match.notes?.positive || '').trim();
    return {
        intro: getTrainingMatchIntro(match, score),
        focus,
        keepOn,
        items: [focus]
    };
}

function buildTrainingRecommendationsFromLastMatch(match) {
    return buildTrainingSessionFocus(match);
}

function getTrainingSessionFocusForEvent(trainingEvent) {
    const lastMatch = getLatestFinishedMatchForTeam(getTrainingSessionTeamName(trainingEvent));
    return buildTrainingSessionFocus(lastMatch);
}

function getTrainingTeamPlayers(teamName) {
    return (window.activePlayers || []).filter(player => (
        player.status !== 'Passiv'
        && (!teamName || player.spillerLag === teamName)
        && !(typeof window.isGuestPlayerRef === 'function' && window.isGuestPlayerRef(player.id))
        && !player.isGuest
    ));
}

function getCurrentSeasonDateRange(asOf = new Date()) {
    const end = new Date(asOf);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end, year: end.getFullYear() };
}

function isTrainingEventInCurrentSeason(event, asOf = new Date()) {
    if (!event?.date) return false;
    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) return false;
    eventDate.setHours(12, 0, 0, 0);
    const { start, end } = getCurrentSeasonDateRange(asOf);
    return eventDate >= start && eventDate <= end;
}

function getTrainingHistoricalAttendanceEvents(teamName) {
    return (window.activeEvents || [])
        .filter(event => {
            if (event?.type !== 'Trening') return false;
            if (!event?.attendance) return false;
            if (teamName && event.team && event.team !== teamName) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(event)) return false;
            if (!isTrainingEventInCurrentSeason(event)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function getTrainingEventAttendancePct(event, teamPlayers) {
    if (!event?.attendance || !teamPlayers.length) return null;
    const possible = teamPlayers.filter(player => {
        if (typeof window.getStatsHistoricalEventSquad === 'function') return true;
        return true;
    });
    const squad = typeof window.getStatsHistoricalEventSquad === 'function'
        ? window.getStatsHistoricalEventSquad(event, teamPlayers, teamPlayers)
        : possible;
    if (!squad.length) return null;
    const attending = squad.filter(player => (
        typeof window.isPlayerAttending === 'function'
            ? window.isPlayerAttending(event.attendance, player)
            : Boolean(event.attendance[player.id] || event.attendance[player.navn])
    )).length;
    return Math.round((attending / squad.length) * 100);
}

function buildTrainingAttendanceSeasonStats(teamName) {
    const teamPlayers = getTrainingTeamPlayers(teamName);
    const events = getTrainingHistoricalAttendanceEvents(teamName);

    const pctFor = (list) => {
        const values = list
            .map(event => getTrainingEventAttendancePct(event, teamPlayers))
            .filter(value => value !== null);
        if (!values.length) return null;
        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    };

    if (events.length) {
        const lastFivePct = pctFor(events.slice(0, 5));
        const baselinePct = pctFor(events.slice(5));
        const seasonPct = pctFor(events);
        return {
            seasonPct,
            lastFivePct,
            baselinePct,
            delta: (lastFivePct !== null && baselinePct !== null) ? lastFivePct - baselinePct : null
        };
    }

    return { seasonPct: null, lastFivePct: null, baselinePct: null, delta: null };
}

function buildTrainingPlayerAttendanceRanking(teamName) {
    const teamPlayers = getTrainingTeamPlayers(teamName);
    const events = getTrainingHistoricalAttendanceEvents(teamName);
    if (!events.length || !teamPlayers.length) return [];

    const rows = teamPlayers.map(player => {
        let attended = 0;
        let possible = 0;
        events.forEach(event => {
            const squad = typeof window.getStatsHistoricalEventSquad === 'function'
                ? window.getStatsHistoricalEventSquad(event, teamPlayers, teamPlayers)
                : teamPlayers;
            if (!squad.some(entry => entry.id === player.id || entry.navn === player.navn)) return;
            possible += 1;
            if (typeof window.isPlayerAttending === 'function'
                ? window.isPlayerAttending(event.attendance, player)
                : Boolean(event.attendance?.[player.id] || event.attendance?.[player.navn])) {
                attended += 1;
            }
        });
        if (possible < 3) return null;
        return {
            name: player.navn,
            pct: Math.round((attended / possible) * 100),
            attended,
            possible
        };
    }).filter(Boolean);

    return [...rows].sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, 'no'));
}

function formatTrainingTrendDelta(delta, suffix = '') {
    if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return '—';
    const value = Number(delta);
    const rounded = Math.round(value * 10) / 10;
    const prefix = rounded > 0 ? '+' : '';
    return `${prefix}${rounded}${suffix}`;
}

function buildTrainingDataRecommendationsHtml(match) {
    const recommendations = buildTrainingSessionFocus(match);
    if (!recommendations?.focus) {
        return `
            <div class="training-data-empty">
                <p>Ingen ferdig kamp å basere anbefaling på.</p>
            </div>
        `;
    }

    const focus = recommendations.focus;
    const categoryLabel = getTrainingExerciseCategoryLabel(focus.category);
    const sourceLabel = focus.source === 'notes'
        ? 'Fra trenernotat'
        : (focus.source === 'ratings' ? 'Fra spillerbørs' : 'Fra kampresultat');

    return `
        <div class="training-data-recommend-block">
            <p class="training-data-recommend-intro">${escapeTrainingHtml(recommendations.intro)}</p>
            ${recommendations.keepOn ? `
                <article class="training-data-recommend-item is-keep">
                    <strong>Bygg videre på</strong>
                    <span>${escapeTrainingHtml(recommendations.keepOn)}</span>
                </article>
            ` : ''}
            <article class="training-data-recommend-item is-focus">
                <div class="training-data-recommend-focus-top">
                    <strong>Hovedfokus denne økten</strong>
                    <span class="training-data-recommend-badge">${escapeTrainingHtml(categoryLabel)}</span>
                </div>
                <strong class="training-data-recommend-focus-title">${escapeTrainingHtml(focus.title)}</strong>
                <span>${escapeTrainingHtml(focus.reason)}</span>
                <span class="training-data-recommend-source">${escapeTrainingHtml(sourceLabel)}</span>
            </article>
        </div>
    `;
}

function buildTrainingDataAttendanceHtml(teamName, options = {}) {
    const {
        listExpandedKey = '_trainingSessionAttendanceListExpanded',
        toggleActionAttr = 'data-training-action',
        toggleAction = 'toggle-attendance-list'
    } = options;
    const stats = buildTrainingAttendanceSeasonStats(teamName);
    const ranking = buildTrainingPlayerAttendanceRanking(teamName);
    const visibleLimit = 10;
    const isExpanded = window[listExpandedKey] === true;
    const hasOverflow = ranking.length > visibleLimit;
    const trendTone = stats.delta === null
        ? ''
        : (stats.delta > 0 ? 'is-up' : (stats.delta < 0 ? 'is-down' : 'is-flat'));

    if (stats.seasonPct === null && stats.lastFivePct === null) {
        return `
            <div class="training-data-empty">
                <p>Ingen oppmøtedata registrert for sesongen ennå.</p>
            </div>
        `;
    }

    return `
        <div class="training-data-attendance">
            <div class="training-data-stat-grid">
                <div class="training-data-stat">
                    <span class="training-data-stat-label">Sesong</span>
                    <strong>${stats.seasonPct !== null ? `${stats.seasonPct}%` : '—'}</strong>
                </div>
                <div class="training-data-stat">
                    <span class="training-data-stat-label">Siste 5</span>
                    <strong>${stats.lastFivePct !== null ? `${stats.lastFivePct}%` : '—'}</strong>
                </div>
                <div class="training-data-stat ${trendTone}">
                    <span class="training-data-stat-label">Retning</span>
                    <strong>${escapeTrainingHtml(formatTrainingTrendDelta(stats.delta, ' %'))}</strong>
                </div>
            </div>
            ${ranking.length ? `
                <div class="training-data-rank-block">
                    <h5>Oppmøte spillere</h5>
                    <ul class="training-data-rank-list ${isExpanded ? 'is-expanded' : ''}">
                        ${ranking.map((row, index) => `
                            <li class="${index >= visibleLimit ? 'is-overflow' : ''}">
                                <span class="training-data-rank-index">${index + 1}.</span>
                                <span class="training-data-rank-name">${escapeTrainingHtml(row.name)}</span>
                                <strong>${row.pct}% <span class="training-data-rank-count">${row.attended}</span></strong>
                            </li>
                        `).join('')}
                    </ul>
                    ${hasOverflow ? `
                        <button
                            type="button"
                            class="training-data-rank-toggle"
                            ${toggleActionAttr}="${toggleAction}"
                            aria-expanded="${isExpanded ? 'true' : 'false'}"
                        >
                            ${isExpanded ? 'Vis færre' : `Vis alle (${ranking.length})`}
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

window.buildTrainingAttendanceSeasonStats = buildTrainingAttendanceSeasonStats;
window.buildTrainingDataAttendanceHtml = buildTrainingDataAttendanceHtml;

function buildTrainingDataPanelHtml(trainingEvent) {
    const lastMatch = getLatestFinishedMatchForTeam(getTrainingSessionTeamName(trainingEvent));
    const isOpen = window._trainingSessionDataOpen === true;

    return `
        <section class="training-session-data-panel match-game-plan-panel match-collapsible-panel ${isOpen ? '' : 'is-collapsed'}">
            <div class="match-bench-action-row match-bench-topline">
                <div class="match-bench-heading">
                    <h3>Treningsinfo</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-treningsdata" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${isOpen ? 'Skjul treningsinfo' : 'Vis treningsinfo'}" data-show-label="Vis treningsinfo" data-hide-label="Skjul treningsinfo">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="training-session-data-body">
                    <section class="training-data-section">
                        <h4>Anbefaling etter siste kamp</h4>
                        ${buildTrainingDataRecommendationsHtml(lastMatch)}
                    </section>
                </div>
            </div>
        </section>
    `;
}

function getTrainingExerciseCategories() {
    return [
        { id: 'defensiv', label: 'Defensiv organisering' },
        { id: 'dodball', label: 'Dødball' },
        { id: 'avslutninger', label: 'Avslutninger' },
        { id: 'ballbesittelse', label: 'Ballbesittelse' },
        { id: 'linjespill', label: 'Linjespill' },
        { id: 'annet', label: 'Annet' }
    ];
}

function getTrainingExerciseCategoryLabel(categoryId) {
    return getTrainingExerciseCategories().find(category => category.id === categoryId)?.label || 'Annet';
}

function inferExerciseCategoryFromRecommendation(titleOrFocus) {
    if (titleOrFocus && typeof titleOrFocus === 'object' && titleOrFocus.category) {
        return titleOrFocus.category;
    }

    const text = String(titleOrFocus || '').toLowerCase();
    if (text.includes('avslutning') || text.includes('kant')) return 'avslutninger';
    if (text.includes('ballbesittelse') || text.includes('spille')) return 'ballbesittelse';
    if (text.includes('i spill') || text.includes('linje')) return 'linjespill';
    if (text.includes('dødball') || text.includes('corner') || text.includes('defc')) return 'dodball';
    if (text.includes('defensiv') || text.includes('organisering') || text.includes('mellomrom')) return 'defensiv';
    return 'annet';
}

function getSuggestedExerciseCategory(trainingEvent) {
    const focus = getTrainingSessionFocusForEvent(trainingEvent)?.focus;
    if (focus?.category) return focus.category;
    return inferExerciseCategoryFromRecommendation(focus?.title);
}

function suggestExerciseFromLibrary(categoryId, focus) {
    const items = getTrainingExerciseLibrary().filter(item => item.category === categoryId);
    if (!items.length) return null;
    if (items.length === 1) return items[0];

    const haystack = `${focus?.title || ''} ${focus?.reason || ''}`.toLowerCase();
    const tokens = haystack.split(/[^a-zæøå0-9]+/i).filter(token => token.length > 3);
    const ranked = items.map(item => {
        const blob = `${item.title} ${item.description}`.toLowerCase();
        const score = tokens.reduce((sum, token) => sum + (blob.includes(token) ? 1 : 0), 0);
        return { item, score };
    }).sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'no'));

    return ranked[0]?.item || items[0];
}

function getSuggestedExerciseForEvent(trainingEvent) {
    const focusBundle = getTrainingSessionFocusForEvent(trainingEvent);
    const focus = focusBundle?.focus;
    const category = focus?.category || getSuggestedExerciseCategory(trainingEvent);
    return {
        focus,
        category,
        exercise: suggestExerciseFromLibrary(category, focus)
    };
}

function normalizeExerciseLibraryItem(raw, fallbackId) {
    const title = String(raw?.title || '').trim();
    if (!title) return null;

    const validIds = new Set(getTrainingExerciseCategories().map(category => category.id));
    const category = validIds.has(raw.category)
        ? raw.category
        : inferExerciseCategoryFromRecommendation(raw.title);

    return {
        id: String(raw.id || fallbackId || '').trim() || `legacy-${category}-${title.toLowerCase()}`,
        category,
        title,
        description: String(raw.description || '').trim(),
        updatedAt: raw.updatedAt || ''
    };
}

function getTrainingExerciseLibrary() {
    const team = typeof window.getPrimaryTeam === 'function' ? window.getPrimaryTeam() : null;
    const fromTeam = Array.isArray(team?.exercises) ? team.exercises : [];
    const items = new Map();

    fromTeam.forEach(raw => {
        const item = normalizeExerciseLibraryItem(raw);
        if (item) items.set(item.id, item);
    });

    (window.activeEvents || []).forEach(event => {
        const item = normalizeExerciseLibraryItem(event?.exercise, event?.id ? `legacy-${event.id}` : '');
        if (!item) return;

        const duplicate = [...items.values()].find(entry => (
            entry.id === item.id
            || (
                entry.title.toLowerCase() === item.title.toLowerCase()
                && entry.category === item.category
            )
        ));
        if (duplicate) {
            if ((item.updatedAt || '') > (duplicate.updatedAt || '')) {
                items.set(duplicate.id, { ...duplicate, ...item, id: duplicate.id });
            }
            return;
        }

        items.set(item.id, item);
    });

    return [...items.values()].sort((a, b) => a.title.localeCompare(b.title, 'no'));
}

function getTrainingSessionExerciseValues(trainingEvent) {
    const eventId = trainingEvent?.id;
    const draft = window._trainingSessionExerciseDraft;
    if (draft && draft.eventId === eventId) {
        return {
            libraryId: draft.libraryId || '',
            category: draft.category || getSuggestedExerciseCategory(trainingEvent),
            title: draft.title || '',
            description: draft.description || '',
            suggestionHint: draft.suggestionHint || ''
        };
    }

    const saved = normalizeExerciseLibraryItem(
        trainingEvent?.exercise,
        eventId ? `legacy-${eventId}` : ''
    );
    if (saved?.title) {
        return {
            libraryId: saved.id || '',
            category: saved.category || getSuggestedExerciseCategory(trainingEvent),
            title: saved.title || '',
            description: saved.description || '',
            suggestionHint: ''
        };
    }

    const suggestion = getSuggestedExerciseForEvent(trainingEvent);
    if (suggestion.exercise) {
        return {
            libraryId: suggestion.exercise.id,
            category: suggestion.category,
            title: suggestion.exercise.title,
            description: suggestion.exercise.description,
            suggestionHint: `Foreslått ut fra Treningsinfo: ${suggestion.focus?.title || getTrainingExerciseCategoryLabel(suggestion.category)}`
        };
    }

    return {
        libraryId: '',
        category: suggestion.category || getSuggestedExerciseCategory(trainingEvent),
        title: '',
        description: '',
        suggestionHint: suggestion.focus
            ? `Foreslått kategori ut fra Treningsinfo: ${getTrainingExerciseCategoryLabel(suggestion.category)}. Skriv en ny øvelse eller hent senere.`
            : ''
    };
}

function readTrainingExerciseFormValues(form, trainingEvent) {
    return {
        libraryId: form?.querySelector('[data-exercise-library]')?.value || '',
        category: form?.querySelector('[data-exercise-category]')?.value || getSuggestedExerciseCategory(trainingEvent),
        title: form?.querySelector('[data-exercise-title]')?.value || '',
        description: form?.querySelector('[data-exercise-description]')?.value || ''
    };
}

function setTrainingSessionExerciseDraft(eventId, values) {
    if (!eventId) return;
    window._trainingSessionExerciseDraft = {
        eventId,
        libraryId: values?.libraryId || values?.id || '',
        category: values?.category || 'annet',
        title: values?.title || '',
        description: values?.description || ''
    };
}

function setTrainingSessionExerciseFeedback(message, variant = '', autoClearMs = 0) {
    setTrainingSessionFeedback(message, variant, autoClearMs, '[data-training-exercise-save-state]');
}

function buildExerciseLibraryOptionsHtml(categoryId, selectedId) {
    const items = getTrainingExerciseLibrary().filter(item => item.category === categoryId);

    return [
        '<option value="">Skriv ny øvelse</option>',
        ...items.map(item => {
            const selected = item.id === selectedId ? ' selected' : '';
            return `<option value="${escapeTrainingHtml(item.id)}"${selected}>${escapeTrainingHtml(item.title)}</option>`;
        })
    ].join('');
}

function refreshTrainingExerciseLibraryOptions(form) {
    const librarySelect = form?.querySelector('[data-exercise-library]');
    if (!librarySelect) return;

    const categoryId = form.querySelector('[data-exercise-category]')?.value || 'annet';
    const selectedId = window._trainingSessionExerciseDraft?.libraryId || librarySelect.value || '';
    const belongsInCategory = getTrainingExerciseLibrary().some(item => (
        item.id === selectedId && item.category === categoryId
    ));
    const visibleId = belongsInCategory ? selectedId : '';
    librarySelect.innerHTML = buildExerciseLibraryOptionsHtml(categoryId, visibleId);
    librarySelect.value = visibleId;
}

function getSavedTrainingExerciseSnapshot(trainingEvent) {
    const saved = normalizeExerciseLibraryItem(
        trainingEvent?.exercise,
        trainingEvent?.id ? `legacy-${trainingEvent.id}` : ''
    );
    return {
        libraryId: saved?.id || '',
        category: saved?.category || '',
        title: (saved?.title || '').trim(),
        description: (saved?.description || '').trim()
    };
}

function isTrainingExerciseFormDirty(form, trainingEvent) {
    const current = readTrainingExerciseFormValues(form, trainingEvent);
    const title = current.title.trim();
    const description = current.description.trim();
    if (!title || !description) return false;

    const saved = getSavedTrainingExerciseSnapshot(trainingEvent);
    return current.category !== saved.category
        || title !== saved.title
        || description !== saved.description
        || (current.libraryId || '') !== (saved.libraryId || '');
}

function syncTrainingExerciseSaveButton(form) {
    const saveBtn = form?.querySelector('[data-training-action="save-exercise"]');
    if (!saveBtn) return;

    const trainingEvent = getTrainingEvent(window._activeTrainingSessionId);
    saveBtn.classList.toggle('is-active', isTrainingExerciseFormDirty(form, trainingEvent));
}

function applyExerciseCategoryChange(form) {
    const eventId = window._activeTrainingSessionId;
    const trainingEvent = getTrainingEvent(eventId);
    const categoryId = form?.querySelector('[data-exercise-category]')?.value || 'annet';
    const previousLibraryId = window._trainingSessionExerciseDraft?.libraryId
        || form?.querySelector('[data-exercise-library]')?.value
        || '';
    const previousItem = getTrainingExerciseLibrary().find(item => item.id === previousLibraryId);
    const belongsInCategory = previousItem?.category === categoryId;

    if (!belongsInCategory) {
        const titleInput = form.querySelector('[data-exercise-title]');
        const descriptionInput = form.querySelector('[data-exercise-description]');
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        setTrainingSessionExerciseDraft(eventId, {
            libraryId: '',
            category: categoryId,
            title: '',
            description: ''
        });
    } else {
        setTrainingSessionExerciseDraft(eventId, readTrainingExerciseFormValues(form, trainingEvent));
    }

    refreshTrainingExerciseLibraryOptions(form);
    syncTrainingExerciseSaveButton(form);
}

function loadTrainingExerciseFromLibrary(form, libraryId) {
    const eventId = window._activeTrainingSessionId;
    const trainingEvent = getTrainingEvent(eventId);
    const categorySelect = form?.querySelector('[data-exercise-category]');
    const titleInput = form?.querySelector('[data-exercise-title]');
    const descriptionInput = form?.querySelector('[data-exercise-description]');
    if (!form || !titleInput || !descriptionInput) return;

    if (!libraryId) {
        const category = categorySelect?.value || getSuggestedExerciseCategory(trainingEvent);
        titleInput.value = '';
        descriptionInput.value = '';
        setTrainingSessionExerciseDraft(eventId, {
            libraryId: '',
            category,
            title: '',
            description: ''
        });
        syncTrainingExerciseSaveButton(form);
        return;
    }

    const item = getTrainingExerciseLibrary().find(entry => entry.id === libraryId);
    if (!item) return;

    if (categorySelect) categorySelect.value = item.category;
    titleInput.value = item.title;
    descriptionInput.value = item.description;
    setTrainingSessionExerciseDraft(eventId, item);
    refreshTrainingExerciseLibraryOptions(form);
    const librarySelect = form.querySelector('[data-exercise-library]');
    if (librarySelect) librarySelect.value = item.id;
    syncTrainingExerciseSaveButton(form);
}

async function upsertTrainingExerciseInLibrary(item) {
    const team = typeof window.getPrimaryTeam === 'function' ? window.getPrimaryTeam() : null;
    if (!team || !item?.id) return;

    const library = getTrainingExerciseLibrary().filter(entry => !String(entry.id).startsWith('legacy-'));
    const next = library.filter(entry => (
        entry.id === item.id
        || entry.title.toLowerCase() !== item.title.toLowerCase()
    ));
    const index = next.findIndex(entry => entry.id === item.id);
    if (index >= 0) next[index] = item;
    else next.push(item);

    team.exercises = next.sort((a, b) => a.title.localeCompare(b.title, 'no'));
    if (typeof window.saveTeamToDatabase === 'function') {
        await window.saveTeamToDatabase(team);
    }
}

async function saveTrainingSessionExercise() {
    const eventId = window._activeTrainingSessionId;
    const trainingEvent = getTrainingEvent(eventId);
    if (!trainingEvent) return;

    const form = document.querySelector('[data-training-exercise-form]');
    const titleInput = form?.querySelector('[data-exercise-title]');
    const descriptionInput = form?.querySelector('[data-exercise-description]');
    const categorySelect = form?.querySelector('[data-exercise-category]');
    const librarySelect = form?.querySelector('[data-exercise-library]');
    const saveBtn = form?.querySelector('[data-training-action="save-exercise"]');
    const title = (titleInput?.value || '').trim();
    const description = (descriptionInput?.value || '').trim();
    const category = categorySelect?.value || getSuggestedExerciseCategory(trainingEvent);
    const draftLibraryId = window._trainingSessionExerciseDraft?.libraryId || '';
    const selectedLibraryId = librarySelect?.value || draftLibraryId || '';

    if (!title) {
        setTrainingSessionExerciseFeedback('Skriv en overskrift før du lagrer.', 'error', 5000);
        titleInput?.focus();
        return;
    }

    if (!description) {
        setTrainingSessionExerciseFeedback('Skriv en beskrivelse før du lagrer.', 'error', 5000);
        descriptionInput?.focus();
        return;
    }

    const libraryId = selectedLibraryId && !selectedLibraryId.startsWith('legacy-')
        ? selectedLibraryId
        : crypto.randomUUID();
    const exercise = {
        id: libraryId,
        category,
        title,
        description,
        updatedAt: new Date().toISOString()
    };

    trainingEvent.exercise = exercise;
    setTrainingSessionExerciseDraft(eventId, exercise);

    if (saveBtn) saveBtn.disabled = true;
    setTrainingSessionExerciseFeedback('Lagrer øvelse…', 'pending');

    try {
        if (typeof window.saveEventToDatabase === 'function') {
            await window.saveEventToDatabase(trainingEvent);
        }
        await upsertTrainingExerciseInLibrary(exercise);
        if (librarySelect) {
            librarySelect.innerHTML = buildExerciseLibraryOptionsHtml(category, libraryId);
            librarySelect.value = libraryId;
        }
        setTrainingSessionExerciseFeedback('Øvelse lagret. Du kan hente den opp igjen på senere økter.', 'success', 5000);
        syncTrainingExerciseSaveButton(form);
    } catch (error) {
        console.error(error);
        setTrainingSessionExerciseFeedback(error.message || 'Kunne ikke lagre øvelsen.', 'error', 6000);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        syncTrainingExerciseSaveButton(form);
    }
}

function buildTrainingExercisePanelHtml(trainingEvent) {
    const isOpen = window._trainingSessionExerciseOpen === true;
    const values = getTrainingSessionExerciseValues(trainingEvent);
    const categoryOptions = getTrainingExerciseCategories().map(category => `
        <option value="${category.id}"${category.id === values.category ? ' selected' : ''}>${escapeTrainingHtml(category.label)}</option>
    `).join('');
    const hint = values.suggestionHint
        || 'Velg kategori, hent en lagret øvelse, eller skriv en ny som treffer hovedfokuset i Treningsinfo.';

    return `
        <section class="training-session-exercise-panel training-session-data-panel match-game-plan-panel match-collapsible-panel ${isOpen ? '' : 'is-collapsed'}">
            <div class="match-bench-action-row match-bench-topline">
                <div class="match-bench-heading">
                    <h3>Øvelse</h3>
                </div>
                <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-ovelse" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${isOpen ? 'Skjul øvelse' : 'Vis øvelse'}" data-show-label="Vis øvelse" data-hide-label="Skjul øvelse">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <form class="training-session-exercise-body" data-training-exercise-form>
                    <p class="training-session-exercise-hint">${escapeTrainingHtml(hint)}</p>
                    <div class="training-session-exercise-fields">
                        <div class="training-session-exercise-meta">
                            <div>
                                <label class="portal-label" for="training-session-exercise-category">Kategori</label>
                                <select id="training-session-exercise-category" class="portal-field" data-exercise-category>
                                    ${categoryOptions}
                                </select>
                            </div>
                            <div>
                                <label class="portal-label" for="training-session-exercise-library">Hent øvelse</label>
                                <select id="training-session-exercise-library" class="portal-field" data-exercise-library>
                                    ${buildExerciseLibraryOptionsHtml(values.category, values.libraryId)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="portal-label" for="training-session-exercise-title">Overskrift</label>
                            <input
                                id="training-session-exercise-title"
                                type="text"
                                class="portal-field"
                                data-exercise-title
                                maxlength="120"
                                placeholder="F.eks. Defensiv organisering"
                                value="${escapeTrainingHtml(values.title)}"
                            >
                        </div>
                        <div>
                            <label class="portal-label" for="training-session-exercise-description">Beskrivelse</label>
                            <textarea
                                id="training-session-exercise-description"
                                class="portal-field portal-textarea-sm"
                                data-exercise-description
                                rows="4"
                                placeholder="Beskriv øvelsen, oppsett og hva dere skal få til."
                            >${escapeTrainingHtml(values.description)}</textarea>
                        </div>
                    </div>
                    <div class="training-session-exercise-footer">
                        <p class="match-inline-status training-session-exercise-save-state" data-training-exercise-save-state aria-live="polite" hidden></p>
                        <button type="submit" class="training-session-group-count-btn" data-training-action="save-exercise" title="Lagre øvelse" aria-label="Lagre øvelse">
                            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                            <span>Lagre</span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    `;
}

function buildTrainingAttendanceSeasonPanelHtml(trainingEvent) {
    const teamName = getTrainingSessionTeamName(trainingEvent);
    const isOpen = window._trainingSessionSeasonAttendanceOpen === true;
    const seasonYear = getCurrentSeasonDateRange().year;

    return `
        <section class="training-session-season-attendance-panel training-session-data-panel match-game-plan-panel match-collapsible-panel ${isOpen ? '' : 'is-collapsed'}">
            <div class="match-bench-action-row match-bench-topline">
                <div class="match-bench-heading">
                    <h3>Treningsoppmøte</h3>
                    <span class="match-detail-section-badge" aria-label="Sesong ${seasonYear}">${seasonYear}</span>
                </div>
                <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-treningsoppmote" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${isOpen ? 'Skjul treningsoppmøte' : 'Vis treningsoppmøte'}" data-show-label="Vis treningsoppmøte" data-hide-label="Skjul treningsoppmøte">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
            <div class="match-collapsible-content">
                <div class="training-session-data-body">
                    ${buildTrainingDataAttendanceHtml(teamName)}
                </div>
            </div>
        </section>
    `;
}

function toggleTrainingSessionCollapsiblePanel(panel, toggleBtn, stateKey) {
    if (!panel || !toggleBtn) return;

    const shouldOpen = panel.classList.contains('is-collapsed');
    panel.classList.toggle('is-collapsed', !shouldOpen);
    window[stateKey] = shouldOpen;
    toggleBtn.setAttribute('aria-expanded', String(shouldOpen));
    toggleBtn.setAttribute(
        'aria-label',
        shouldOpen
            ? (toggleBtn.dataset.hideLabel || 'Skjul seksjon')
            : (toggleBtn.dataset.showLabel || 'Vis seksjon')
    );
}

function bindTrainingSessionEvents() {
    const container = document.getElementById('oktside-content');
    if (!container || container.dataset.trainingEventsBound === 'true') return;

    container.dataset.trainingEventsBound = 'true';

    container.addEventListener('click', (event) => {
        const topline = event.target.closest('.match-bench-topline');
        if (topline && container.contains(topline)) {
            const interactive = event.target.closest('a, button, input, select, textarea, label');
            if (!interactive || interactive.classList.contains('match-panel-toggle-btn')) {
                const toggle = interactive?.classList.contains('match-panel-toggle-btn')
                    ? interactive
                    : topline.querySelector('.match-panel-toggle-btn[data-training-action^="toggle-"]');
                const panel = toggle?.closest('.match-collapsible-panel');
                const action = toggle?.dataset.trainingAction;

                if (panel && action === 'toggle-attendance') {
                    toggleTrainingSessionCollapsiblePanel(panel, toggle, '_trainingSessionAttendanceOpen');
                    return;
                }
                if (panel && action === 'toggle-groups') {
                    toggleTrainingSessionCollapsiblePanel(panel, toggle, '_trainingSessionGroupsOpen');
                    return;
                }
                if (panel && action === 'toggle-treningsdata') {
                    toggleTrainingSessionCollapsiblePanel(panel, toggle, '_trainingSessionDataOpen');
                    return;
                }
                if (panel && action === 'toggle-ovelse') {
                    toggleTrainingSessionCollapsiblePanel(panel, toggle, '_trainingSessionExerciseOpen');
                    return;
                }
                if (panel && action === 'toggle-treningsoppmote') {
                    toggleTrainingSessionCollapsiblePanel(panel, toggle, '_trainingSessionSeasonAttendanceOpen');
                    return;
                }
            }
        }

        const actionEl = event.target.closest('[data-training-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.trainingAction;
        const eventId = window._activeTrainingSessionId;

        if (action === 'go-back') {
            if (typeof window.goBackToPreviousPortalPage === 'function' && window.goBackToPreviousPortalPage()) {
                return;
            }
            switchTab('hjem');
            return;
        }

        if (action === 'attendance') {
            if (eventId) window.openAttendanceModal(eventId);
            return;
        }

        if (action === 'injury') {
            if (typeof window.showSessionInjuryModal === 'function') {
                window.showSessionInjuryModal();
            }
            return;
        }

        if (action === 'toggle-attendance') {
            const panel = actionEl.closest('.match-collapsible-panel');
            toggleTrainingSessionCollapsiblePanel(panel, actionEl, '_trainingSessionAttendanceOpen');
            return;
        }

        if (action === 'toggle-groups') {
            const panel = actionEl.closest('.match-collapsible-panel');
            toggleTrainingSessionCollapsiblePanel(panel, actionEl, '_trainingSessionGroupsOpen');
            return;
        }

        if (action === 'toggle-treningsdata') {
            const panel = actionEl.closest('.match-collapsible-panel');
            toggleTrainingSessionCollapsiblePanel(panel, actionEl, '_trainingSessionDataOpen');
            return;
        }

        if (action === 'toggle-ovelse') {
            const panel = actionEl.closest('.match-collapsible-panel');
            toggleTrainingSessionCollapsiblePanel(panel, actionEl, '_trainingSessionExerciseOpen');
            return;
        }

        if (action === 'toggle-treningsoppmote') {
            const panel = actionEl.closest('.match-collapsible-panel');
            toggleTrainingSessionCollapsiblePanel(panel, actionEl, '_trainingSessionSeasonAttendanceOpen');
            return;
        }

        if (action === 'toggle-attendance-list') {
            const block = actionEl.closest('.training-data-rank-block');
            const list = block?.querySelector('.training-data-rank-list');
            if (!list) return;

            const expanded = !list.classList.contains('is-expanded');
            list.classList.toggle('is-expanded', expanded);
            window._trainingSessionAttendanceListExpanded = expanded;
            actionEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const total = list.querySelectorAll('li').length;
            actionEl.textContent = expanded ? 'Vis færre' : `Vis alle (${total})`;
            return;
        }

        if (action === 'toggle-groups-info') {
            window._trainingSessionGroupsInfoOpen = !window._trainingSessionGroupsInfoOpen;
            const eventId = window._activeTrainingSessionId;
            if (eventId) window.renderTrainingSession(eventId);
            return;
        }

        if (action === 'set-group-count') {
            const eventId = window._activeTrainingSessionId;
            if (!eventId) return;

            const groupCount = Number(actionEl.dataset.groupCount);
            if (!Number.isFinite(groupCount) || groupCount < 1 || groupCount > 4) return;

            const trainingEvent = getTrainingEvent(eventId);
            if (!trainingEvent || trainingEvent.type !== 'Trening') return;

            if ((window._trainingSessionGroupCounts[eventId] || 1) === groupCount) return;

            const players = getRegisteredPlayersForEvent(trainingEvent);
            window._trainingSessionGroupCounts[eventId] = groupCount;

            if (!players.length) {
                delete window._trainingSessionGroups[eventId];
            } else {
                window._trainingSessionGroups[eventId] = distributePlayersIntoGroups(players, groupCount);
            }

            window.renderTrainingSession(eventId);
        }
    });

    container.addEventListener('input', (event) => {
        const form = event.target.closest('[data-training-exercise-form]');
        if (!form || !container.contains(form)) return;
        if (event.target.matches('[data-exercise-library]')) return;

        const eventId = window._activeTrainingSessionId;
        const trainingEvent = getTrainingEvent(eventId);
        if (!eventId) return;

        setTrainingSessionExerciseDraft(eventId, readTrainingExerciseFormValues(form, trainingEvent));
        syncTrainingExerciseSaveButton(form);
    });

    container.addEventListener('change', (event) => {
        const form = event.target.closest('[data-training-exercise-form]');
        if (!form || !container.contains(form)) return;

        const eventId = window._activeTrainingSessionId;
        const trainingEvent = getTrainingEvent(eventId);
        if (!eventId) return;

        if (event.target.matches('[data-exercise-library]')) {
            loadTrainingExerciseFromLibrary(form, event.target.value);
            return;
        }

        if (event.target.matches('[data-exercise-category]')) {
            applyExerciseCategoryChange(form);
        }
    });

    container.addEventListener('submit', (event) => {
        const form = event.target.closest('[data-training-exercise-form]');
        if (!form || !container.contains(form)) return;

        event.preventDefault();
        saveTrainingSessionExercise();
    });

    container.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        const actionEl = event.target.closest('[data-training-action="go-back"]');
        if (!actionEl) return;

        event.preventDefault();
        if (typeof window.goBackToPreviousPortalPage === 'function' && window.goBackToPreviousPortalPage()) {
            return;
        }
        switchTab('hjem');
    });
}

window.openTrainingSession = function(eventId) {
    if (!eventId) return;

    const activityEvent = getTrainingEvent(eventId);
    if (!activityEvent || !isActivitySessionType(activityEvent.type)) return;

    window._activeTrainingSessionId = eventId;
    if (activityEvent.type === 'Trening' && !window._trainingSessionGroupCounts[eventId]) {
        window._trainingSessionGroupCounts[eventId] = 1;
    }

    const backTarget = window.currentTab && window.currentTab !== 'oktside'
        ? window.currentTab
        : 'hjem';
    switchTab('oktside', { backTarget });
    window.renderTrainingSession(eventId);
};

window.renderTrainingSession = function(eventId) {
    const container = document.getElementById('oktside-content');
    const trainingEvent = getTrainingEvent(eventId || window._activeTrainingSessionId);
    if (!container || !trainingEvent || !isActivitySessionType(trainingEvent.type)) return;

    bindTrainingSessionEvents();

    const isTraining = trainingEvent.type === 'Trening';
    const eventTypeLabel = isTraining ? 'Trening' : (trainingEvent.type || 'Aktivitet');
    const chipIcon = isTraining ? 'fa-stopwatch' : 'fa-calendar-check';
    const dateValue = new Date(trainingEvent.date);
    const dateFormatted = Number.isNaN(dateValue.getTime())
        ? 'Dato ikke satt'
        : dateValue.toLocaleDateString('no-NO', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' });
    const dateLabel = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    const timeLabel = trainingEvent.time || '--:--';
    const locationLabel = trainingEvent.location || 'Ikke oppgitt';
    const registeredPlayers = getRegisteredPlayersForEvent(trainingEvent);
    const presenceStats = typeof window.getAttendancePresenceStats === 'function'
        ? window.getAttendancePresenceStats(trainingEvent)
        : { presentCount: registeredPlayers.length, squadSize: registeredPlayers.length, isRegistered: false };

    const sessionStats = typeof window.buildNextSessionAttendanceStats === 'function'
        ? window.buildNextSessionAttendanceStats(trainingEvent)
        : {
            møttOppAntall: registeredPlayers.length,
            squadSize: registeredPlayers.length,
            positionCounts: { K: 0, F: 0, M: 0, A: 0 },
            injuredReady: [],
            fractionTone: 'good'
        };
    const fractionToneClass = sessionStats.fractionTone === 'good' ? '' : ` is-${sessionStats.fractionTone}`;
    const hasSessionAttendance = typeof window.hasRegisteredAttendance === 'function'
        ? window.hasRegisteredAttendance(trainingEvent.attendance)
        : presenceStats.isRegistered;
    const radarParts = ['K', 'F', 'M', 'A'].map(letter => (
        `${sessionStats.positionCounts[letter]}${letter}`
    )).join('<span class="dashboard-session-radar-sep"> - </span>');
    const sessionStatsHtml = hasSessionAttendance
        ? `
                        <div class="dashboard-session-stats-line">
                            <span class="match-detail-time${fractionToneClass}">${sessionStats.møttOppAntall}<span class="dashboard-session-fraction-sep">/</span>${sessionStats.squadSize}</span>
                            <span class="dashboard-session-attendance-label">påmeldt</span>
                            <span class="dashboard-session-radar-inline">${radarParts}</span>
                        </div>`
        : `
                        <div class="dashboard-session-stats-line">
                            <span class="dashboard-session-unregistered-label">Oppmøte ikke registrert</span>
                        </div>`;

    window._sessionInjuryPopupData = sessionStats.injuredReady || [];
    let actionsHtml = '';
    if (sessionStats.injuredReady && sessionStats.injuredReady.length > 0) {
        const injuredCount = sessionStats.injuredReady.length;
        const injuryLabel = injuredCount === 1 ? '1 skadet' : `${injuredCount} skadet`;
        actionsHtml = `
                        <div class="dashboard-session-actions">
                            <button type="button" data-training-action="injury" class="bsk-btn bsk-btn-warning is-collapsible dashboard-session-action-btn" title="${escapeTrainingHtml(injuryLabel)}" aria-label="${escapeTrainingHtml(injuryLabel)}">
                                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                                <span class="bsk-btn-label">${escapeTrainingHtml(injuryLabel)}</span>
                            </button>
                        </div>
        `;
    } else {
        window._sessionInjuryPopupData = [];
    }

    const isGroupsOpen = window._trainingSessionGroupsOpen === true;
    const isGroupsInfoOpen = window._trainingSessionGroupsInfoOpen === true;
    const groupsPanelHtml = isTraining
        ? `
            <section class="training-session-groups-panel match-game-plan-panel match-collapsible-panel ${isGroupsOpen ? '' : 'is-collapsed'}">
                <div class="match-bench-action-row match-bench-topline">
                    <div class="match-bench-heading">
                        <h3>Grupper</h3>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-groups" aria-expanded="${isGroupsOpen ? 'true' : 'false'}" aria-label="${isGroupsOpen ? 'Skjul grupper' : 'Vis grupper'}" data-show-label="Vis grupper" data-hide-label="Skjul grupper">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                    <button
                        type="button"
                        class="training-session-groups-info-btn${isGroupsInfoOpen ? ' is-active' : ''}"
                        data-training-action="toggle-groups-info"
                        aria-expanded="${isGroupsInfoOpen ? 'true' : 'false'}"
                        aria-controls="training-session-groups-info"
                        title="Slik fordeles gruppene"
                        aria-label="Slik fordeles gruppene"
                    >
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    </button>
                </div>
                <div
                    id="training-session-groups-info"
                    class="training-session-groups-info${isGroupsInfoOpen ? '' : ' is-hidden'}"
                    ${isGroupsInfoOpen ? '' : 'hidden'}
                >
                    <p class="training-session-groups-info-title">Slik fordeles spillere</p>
                    <ul class="training-session-groups-info-list">
                        <li>Keepere trekkes ut i egen gruppe og fordeles ikke på banen.</li>
                        <li>Utespillere sorteres etter Form innen forsvar, midtbane, angrep og gjester.</li>
                        <li>Gruppene gjøres så jevnstore som mulig. Eventuell rest legges på de siste gruppene.</li>
                        <li>Hver gruppe fylles med en proporsjonal blanding av posisjoner fra det som er igjen.</li>
                        <li>Innen hver rolle tas spillere med høyest Form først, så formstyrken fordeles jevnere.</li>
                        <li>Siste gruppe får det som er igjen etter at de andre er fylt opp.</li>
                    </ul>
                </div>
                <div class="match-collapsible-content">
                    <div class="training-session-groups-body">
                        ${buildGroupsHtml(trainingEvent.id, registeredPlayers)}
                    </div>
                </div>
            </section>
        `
        : '';

    const pendingFeedback = window._pendingAttendanceFeedback;
    const openForFeedback = Boolean(
        pendingFeedback && !pendingFeedback.isMatch && pendingFeedback.recordId === trainingEvent.id
    );
    if (openForFeedback) {
        window._trainingSessionAttendanceOpen = true;
    }
    const isAttendanceOpen = window._trainingSessionAttendanceOpen === true;
    const attendanceBadgeLabel = presenceStats.isRegistered && presenceStats.squadSize > 0
        ? `${presenceStats.presentCount}/${presenceStats.squadSize}`
        : String(presenceStats.isRegistered ? presenceStats.presentCount : (presenceStats.squadSize || 0));
    const attendanceBadgeAria = presenceStats.isRegistered
        ? `${presenceStats.presentCount} av ${presenceStats.squadSize || presenceStats.presentCount} spillere påmeldt`
        : `${presenceStats.squadSize || 0} spillere i troppen`;

    const desktopTitle = document.getElementById('current-tab-title');
    if (desktopTitle && window.currentTab === 'oktside') {
        desktopTitle.innerText = isTraining ? 'Øktside' : 'Aktivitet';
    }

    container.innerHTML = `
        <div class="training-session-page">
            <article
                class="match-detail-card dashboard-next-session-card dashboard-click-card"
                data-training-action="go-back"
                role="button"
                tabindex="0"
                title="Tilbake"
                aria-label="Tilbake til forrige side"
            >
                <div class="dashboard-next-match-watermark">
                    <i class="fa-solid fa-stopwatch"></i>
                </div>

                <div class="match-detail-card-top relative z-10">
                    <div class="match-detail-meta">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${escapeTrainingHtml(dateLabel)}</span>
                    </div>
                    <div class="match-detail-chip">
                        <i class="fa-solid ${chipIcon}"></i>
                        <span>${escapeTrainingHtml(eventTypeLabel)}</span>
                    </div>
                </div>

                <div class="dashboard-session-main relative z-10">
                    <div class="dashboard-session-middle">
                        <div class="dashboard-session-focus-block min-w-0">
                            ${sessionStatsHtml}
                        </div>
                        ${actionsHtml}
                    </div>
                </div>

                <div class="match-detail-footer relative z-10">
                    <div class="match-detail-footer-item" title="${escapeTrainingHtml(locationLabel)}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeTrainingHtml(locationLabel)}</span>
                    </div>
                    <div class="match-detail-footer-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${escapeTrainingHtml(timeLabel)}</span>
                    </div>
                </div>
            </article>

            <section class="training-session-attendance-panel match-game-plan-panel match-collapsible-panel ${isAttendanceOpen ? '' : 'is-collapsed'}">
                <div class="match-bench-action-row match-bench-topline">
                    <div class="match-bench-heading">
                        <h3>Oppmøte</h3>
                        <span class="match-detail-section-badge" aria-label="${escapeTrainingHtml(attendanceBadgeAria)}">${escapeTrainingHtml(attendanceBadgeLabel)}</span>
                    </div>
                    <button type="button" class="match-panel-toggle-btn" data-training-action="toggle-attendance" aria-expanded="${isAttendanceOpen ? 'true' : 'false'}" aria-label="${isAttendanceOpen ? 'Skjul oppmøte' : 'Vis oppmøte'}" data-show-label="Vis oppmøte" data-hide-label="Skjul oppmøte">
                        <i class="fa-solid fa-chevron-up"></i>
                    </button>
                    <button type="button" class="training-session-attendance-add-btn" data-training-action="attendance" title="Oppdater" aria-label="Oppdater oppmøte">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        <span>Oppdater</span>
                    </button>
                </div>
                <div class="match-collapsible-content">
                    <p class="match-inline-status training-session-attendance-save-state" data-training-attendance-save-state aria-live="polite" hidden></p>
                    <div class="training-session-attendance-body">
                        ${buildRegisteredPlayersHtml(registeredPlayers)}
                    </div>
                </div>
            </section>

            ${groupsPanelHtml}
            ${isTraining ? buildTrainingDataPanelHtml(trainingEvent) : ''}
            ${isTraining ? buildTrainingExercisePanelHtml(trainingEvent) : ''}
            ${isTraining ? buildTrainingAttendanceSeasonPanelHtml(trainingEvent) : ''}
        </div>
    `;

    if (openForFeedback) {
        window._pendingAttendanceFeedback = null;
        const message = typeof window.buildAttendanceSaveFeedbackMessage === 'function'
            ? window.buildAttendanceSaveFeedbackMessage(pendingFeedback)
            : 'Oppmøte lagret';
        setTrainingSessionFeedback(message, 'success', 5000);
    }

    syncTrainingExerciseSaveButton(container.querySelector('[data-training-exercise-form]'));
};
