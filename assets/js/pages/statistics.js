function escapeStatsHtml(value) {
    return typeof window.escapeModalHtml === 'function'
        ? window.escapeModalHtml(value)
        : String(value || '');
}

function escapeStatisticsHtml(value) {
    return escapeStatsHtml(value);
}

function escapeStatsJsString(value) {
    return typeof window.escapeModalJsString === 'function'
        ? window.escapeModalJsString(value)
        : String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getStatsPlayerIdForName(name) {
    const player = (window.activePlayers || []).find(p => p.navn === name);
    return player && player.id != null ? String(player.id) : '';
}

function openStatsPlayerFromActionEl(actionEl) {
    const playerId = actionEl.dataset.playerId;
    if (playerId && typeof window.openPlayerModal === 'function') {
        window.openPlayerModal(playerId);
        return;
    }

    const playerName = actionEl.dataset.playerName;
    if (playerName) {
        const player = (window.activePlayers || []).find(p => p.navn === playerName);
        if (player?.id && typeof window.openPlayerModal === 'function') {
            window.openPlayerModal(player.id);
            return;
        }
        if (typeof window.openSpillerDetail === 'function') {
            window.openSpillerDetail(playerName);
        }
    }
}

function bindStatisticsEvents() {
    const container = document.getElementById('view-statistikk');
    if (!container || container.dataset.statEventsBound === 'true') return;
    container.dataset.statEventsBound = 'true';

    container.addEventListener('click', (event) => {
        const topline = event.target.closest('.stats-kamp-collapsible-panel .match-bench-topline');
        if (topline && container.contains(topline)) {
            const interactive = event.target.closest('a, button, input, select, textarea, label');
            if (!interactive || interactive.classList.contains('match-panel-toggle-btn')) {
                const toggle = interactive?.classList.contains('match-panel-toggle-btn')
                    ? interactive
                    : topline.querySelector('.match-panel-toggle-btn');
                const panelId = toggle?.dataset.panelId
                    || toggle?.closest('[data-stats-panel]')?.dataset.statsPanel;
                if (panelId && typeof window.toggleStatsKampPanel === 'function') {
                    if (interactive?.classList.contains('match-panel-toggle-btn')) {
                        event.preventDefault();
                    }
                    window.toggleStatsKampPanel(panelId);
                    return;
                }
            }
        }

        const actionEl = event.target.closest('[data-stat-action]');
        if (!actionEl || actionEl.disabled) return;

        const action = actionEl.dataset.statAction;
        if (action === 'open-player') {
            openStatsPlayerFromActionEl(actionEl);
            return;
        }
        if (action === 'back-overview') {
            if (typeof window.showSpillereOverview === 'function') window.showSpillereOverview();
            return;
        }
        if (action === 'sort') {
            const column = actionEl.dataset.sortCol;
            if (column && typeof window.sortStatsTable === 'function') window.sortStatsTable(column);
            return;
        }
        if (action === 'toggle-player-list') {
            const block = actionEl.closest('.training-data-rank-block');
            const rankList = block?.querySelector('.training-data-rank-list');
            if (!rankList) return;
            const expanded = !rankList.classList.contains('is-expanded');
            rankList.classList.toggle('is-expanded', expanded);
            window._statsPlayerListExpanded = expanded;
            actionEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const total = rankList.querySelectorAll('li').length;
            actionEl.textContent = expanded ? 'Vis færre' : `Vis alle (${total})`;
            return;
        }
        if (action === 'open-form-info') {
            if (typeof window.openStatsFormInfoModal === 'function') window.openStatsFormInfoModal();
            return;
        }
        if (action === 'set-kamp-year') {
            const year = actionEl.dataset.year;
            if (year && typeof window.setStatsKampYearFilter === 'function') window.setStatsKampYearFilter(year);
            return;
        }
        if (action === 'toggle-panel') {
            const panelId = actionEl.dataset.panelId;
            if (panelId && typeof window.toggleStatsKampPanel === 'function') {
                window.toggleStatsKampPanel(panelId);
            }
            return;
        }
        if (action === 'set-lag-section') {
            const section = actionEl.dataset.sectionId;
            if (section && typeof window.setStatsLagSection === 'function') window.setStatsLagSection(section);
            return;
        }
        if (action === 'navigate-match') {
            const direction = Number(actionEl.dataset.direction);
            if (!Number.isNaN(direction) && typeof window.navigateKampstatMatch === 'function') {
                window.navigateKampstatMatch(direction);
            }
            return;
        }
        if (action === 'edit-match') {
            const matchId = actionEl.dataset.matchId;
            if (matchId && typeof window.openMatchStatsEditor === 'function') window.openMatchStatsEditor(matchId);
            return;
        }
        if (action === 'open-tactical') {
            const matchId = actionEl.dataset.matchId;
            if (matchId && typeof window.openTacticalPlanForMatch === 'function') window.openTacticalPlanForMatch(matchId);
        }
    });

    container.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('[data-stat-action][role="button"]');
        if (!card || event.target.closest('button[data-stat-action]')) return;
        event.preventDefault();
        card.click();
    });
}

window.checkIndividualChemistry = function() {
            const selectedPlayer = document.getElementById('chemistryPlayerSelect').value;
            const resContainer = document.getElementById('individual-chemistry-result');
            const emptyContainer = document.getElementById('individual-chemistry-empty');

            if (!selectedPlayer) {
                if (resContainer) resContainer.classList.add('hidden');
                if (emptyContainer) emptyContainer.classList.remove('hidden');
                return;
            }

            if (resContainer) resContainer.classList.remove('hidden');
            if (emptyContainer) emptyContainer.classList.add('hidden');

            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const teamPlayers = (window.activePlayers || []).filter(p => filterLag === 'Alle' || p.spillerLag === filterLag);
            const chemOptions = {
                teamName: filterLag === 'Alle' ? null : filterLag,
                historicalOnly: true
            };

            let bestPartner = null;
            let bestSamspill = null;

            teamPlayers.forEach(p => {
                if (p.navn === selectedPlayer) return;
                const samspill = typeof window.getDuoSamspill === 'function'
                    ? window.getDuoSamspill(selectedPlayer, p, chemOptions)
                    : null;
                if (!samspill) return;
                if (!bestSamspill || samspill.score > bestSamspill.score) {
                    bestSamspill = samspill;
                    bestPartner = p.navn;
                }
            });

            if (bestPartner && bestSamspill) {
                if (document.getElementById('individual-chem-pct')) {
                    document.getElementById('individual-chem-pct').innerText = `${bestSamspill.score}`;
                }
                if (document.getElementById('individual-partner-name')) {
                    document.getElementById('individual-partner-name').innerText = bestPartner;
                }
                if (document.getElementById('individual-partner-desc')) {
                    document.getElementById('individual-partner-desc').innerText = bestSamspill.tooltip || bestSamspill.label;
                }
                if (document.getElementById('chem-circle-progress')) {
                    document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2 - (251.2 * bestSamspill.score) / 100;
                }
            } else {
                if (document.getElementById('individual-chem-pct')) document.getElementById('individual-chem-pct').innerText = '–';
                if (document.getElementById('individual-partner-name')) document.getElementById('individual-partner-name').innerText = 'Ingen match';
                if (document.getElementById('individual-partner-desc')) document.getElementById('individual-partner-desc').innerText = 'Ikke nok data registrert.';
                if (document.getElementById('chem-circle-progress')) document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2;
            }
        }

        window.getStatsTeamFilter = function() {
            return 'Alle';
        };

        window.getMatchStatsYear = function(match) {
            if (!match?.date) return null;
            const parsed = new Date(match.date);
            if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear();
            const prefix = String(match.date).match(/^(\d{4})/);
            return prefix ? Number(prefix[1]) : null;
        };

        window.getStatsKampYearFilter = function() {
            const current = window.statsKampYearFilter;
            if (current === 'alle' || current == null || current === '') return 'alle';
            const year = Number(current);
            return Number.isFinite(year) ? year : 'alle';
        };

        window.matchBelongsToStatsKampYear = function(match) {
            const filter = window.getStatsKampYearFilter();
            if (filter === 'alle') return true;
            return window.getMatchStatsYear(match) === filter;
        };

        window.getStatsKampYearOptions = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const years = new Set();
            (window.activeMatches || []).forEach(match => {
                if (!match.result || !String(match.result).includes('-')) return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return;
                if (filterLag && filterLag !== 'Alle' && match.matchGroup !== filterLag) return;
                const year = window.getMatchStatsYear(match);
                if (year) years.add(year);
            });
            return [...years].sort((a, b) => b - a);
        };

        window.setStatsKampYearFilter = function(year) {
            const next = year === 'alle' || year == null || year === ''
                ? 'alle'
                : Number(year);
            window.statsKampYearFilter = Number.isFinite(next) ? next : 'alle';
            window.pendingKampstatMatchId = null;
            if (typeof window.renderStatistikkSide === 'function') {
                window.renderStatistikkSide();
            }
        };

        window.getStatsKampPanelState = function() {
            const defaults = {
                kampdata: true,
                kamputvikling: false,
                kampstats: false,
                oppmote: true,
                oppmoteutvikling: false,
                spillerutvikling: false,
                oppfolging: false,
                spillerliste: true
            };
            window.statsKampPanelState = window.statsKampPanelState || {};
            Object.keys(defaults).forEach(key => {
                if (typeof window.statsKampPanelState[key] !== 'boolean') {
                    window.statsKampPanelState[key] = defaults[key];
                }
            });
            return window.statsKampPanelState;
        };

        window.isStatsKampPanelOpen = function(panelId) {
            const state = window.getStatsKampPanelState();
            return state[panelId] === true;
        };

        window.toggleStatsKampPanel = function(panelId) {
            if (!panelId) return;
            const state = window.getStatsKampPanelState();
            const nextOpen = !window.isStatsKampPanelOpen(panelId);
            state[panelId] = nextOpen;
            const panel = document.querySelector(`#view-statistikk [data-stats-panel="${panelId}"]`);
            if (!panel) return;
            panel.classList.toggle('is-collapsed', !nextOpen);
            const toggle = panel.querySelector('.match-panel-toggle-btn');
            if (!toggle) return;
            toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
            toggle.setAttribute(
                'aria-label',
                nextOpen
                    ? (toggle.dataset.hideLabel || 'Skjul seksjon')
                    : (toggle.dataset.showLabel || 'Vis seksjon')
            );
        };

        window.renderStatsCollapsiblePanelHtml = function({ id, title, badge = '', showLabel, hideLabel, content }) {
            const isOpen = window.isStatsKampPanelOpen(id);
            const badgeHtml = badge !== '' && badge != null
                ? `<span class="match-detail-section-badge">${badge}</span>`
                : '';
            return `
                <section class="match-game-plan-panel match-collapsible-panel stats-kamp-collapsible-panel ${isOpen ? '' : 'is-collapsed'}" data-stats-panel="${id}">
                    <div class="match-bench-action-row match-bench-topline">
                        <div class="match-bench-heading">
                            <h3>${title}</h3>
                            ${badgeHtml}
                        </div>
                        <button
                            type="button"
                            class="match-panel-toggle-btn"
                            data-stat-action="toggle-panel"
                            data-panel-id="${id}"
                            aria-expanded="${isOpen ? 'true' : 'false'}"
                            aria-label="${isOpen ? hideLabel : showLabel}"
                            data-show-label="${showLabel}"
                            data-hide-label="${hideLabel}"
                        >
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                    </div>
                    <div class="match-collapsible-content">
                        ${content}
                    </div>
                </section>
            `;
        };

        window.getTeamFormGuide = function(teamName) {
            const matches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (teamName && teamName !== 'Alle' && m.matchGroup !== teamName) return false;
                return true;
            });

            matches.sort((a, b) => new Date(b.date) - new Date(a.date));
            const last5 = matches.slice(0, 5).reverse();

            return last5.map(m => {
                const score = parseScore(m.result);
                if (!score) return { m, form: 'U', text: 'U', tooltip: `Registrert: ${m.result}` };
                if (score.bsk > score.opponent) return { m, form: 'S', text: 'S', tooltip: `Seier vs ${m.opponent} (${m.result})` };
                if (score.bsk === score.opponent) return { m, form: 'U', text: 'U', tooltip: `Uavgjort vs ${m.opponent} (${m.result})` };
                return { m, form: 'T', text: 'T', tooltip: `Tap vs ${m.opponent} (${m.result})` };
            });
        };

        window.buildPlayerAnalysisStats = function(filterLag) {
            const players = (window.activePlayers || []).filter(p => {
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });
            const currentPlayers = players.filter(p => p.status !== 'Passiv');

            const matches = (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                    if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))]
                .filter(e => {
                    if (filterLag && filterLag !== 'Alle' && e.team !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                    return Boolean(e.attendance);
                })
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const playerStats = players.map(player => {
                const name = player.navn || player.name || player.fullName || player.spiller || '';
                if (!name) return null;

                const playerMatches = matches.filter(m => window.isPlayerAttending(m.attendance, player));
                let totalPoints = 0;
                let goals = 0;
                let assists = 0;
                let bb = 0;
                let yellowSerie = 0;
                let redSerie = 0;
                let ratings = [];

                playerMatches.forEach(m => {
                    totalPoints += typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(m, name)
                        : 0;
                    if (window.getPlayerRefMapValue(m.scorers, player, 0)) goals += Number(window.getPlayerRefMapValue(m.scorers, player, 0)) || 0;
                    if (window.getPlayerRefMapValue(m.assists, player, 0)) assists += Number(window.getPlayerRefMapValue(m.assists, player, 0)) || 0;
                    if (window.motmMatchesPlayer(m.motm, player)) bb += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.guleKort, player)) yellowSerie += 1;
                    if (m.matchType === 'Serie' && window.playerRefListIncludes(m.rodeKort, player)) redSerie += 1;

                    const playerRating = window.getPlayerRefMapValue(m.ratings, player, 0);
                    if (playerRating) {
                        ratings.push({
                            date: m.date,
                            rating: Number(playerRating) || 0
                        });
                    }
                });

                const lastFiveRatings = ratings
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                const formLastFive = lastFiveRatings.length
                    ? lastFiveRatings.reduce((sum, r) => sum + r.rating, 0) / lastFiveRatings.length
                    : 0;

                const pointsPerMatch = playerMatches.length > 0 ? totalPoints / playerMatches.length : 0;

                return {
                    name,
                    status: player.status || '',
                    spillerLag: player.spillerLag || '',
                    matches: playerMatches.length || 0,
                    totalPoints: totalPoints || 0,
                    pointsPerMatch: pointsPerMatch || 0,
                    goals: goals || 0,
                    assists: assists || 0,
                    bb: bb || 0,
                    yellowSerie: yellowSerie || 0,
                    redSerie: redSerie || 0,
                    formLastFive: formLastFive || 0,
                    formScore: typeof window.calculatePlayerPerformanceChemistry === 'function'
                        ? window.calculatePlayerPerformanceChemistry(name)
                        : 0
                };
            }).filter(Boolean);

            const activeStats = playerStats.filter(p => p.matches > 0);

            const followUpMap = new Map();
            activeStats.filter(p => p.status !== 'Passiv').forEach(p => {
                if (!(p.redSerie > 0 || p.yellowSerie >= 3 || (p.formLastFive > 0 && p.formLastFive < 5.5) || p.matches <= 2)) return;

                    const reason = [];
                    if (p.redSerie > 0) reason.push('Rødt kort i serie');
                    if (p.yellowSerie >= 3) {
                        const hint = typeof window.getSerieYellowDisciplineHint === 'function'
                            ? window.getSerieYellowDisciplineHint(p.yellowSerie)
                            : null;
                        reason.push(hint && hint.isAtRisk
                            ? `${p.yellowSerie} gule i serie – karantene ved ${hint.nextSuspensionAt}`
                            : 'Mange gule kort i serie');
                    }
                    if (p.formLastFive > 0 && p.formLastFive < 5.5) reason.push('Lav form siste kamper');
                    if (p.matches <= 2) reason.push('Få kamper registrert');
                if (reason.length) followUpMap.set(p.name, reason);
            });

            currentPlayers.forEach(player => {
                const name = player.navn || player.name || player.fullName || player.spiller || '';
                if (!name) return;

                const reason = followUpMap.get(name) || [];
                const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
                    ? window.getPlayerInjuryInfo(player)
                    : { isInjured: false };
                if (injuryInfo.isInjured) reason.push(injuryInfo.label || 'Skadestatus');

                const relevantRecentEvents = allEvents
                    .filter(e => !e.team || e.team === player.spillerLag)
                    .slice(0, 5);
                if (relevantRecentEvents.length >= 3) {
                    const attended = relevantRecentEvents.filter(e => window.isPlayerAttending(e.attendance, player)).length;
                    if (attended === 0) reason.push('Ingen nylig oppmøte registrert');
                }

                if (reason.length) followUpMap.set(name, reason);
            });

            const followUps = [...followUpMap.entries()]
                .map(([name, reason]) => ({ name, reason: reason.slice(0, 3).join(', ') }))
                .slice(0, 8);

            return {
                matches,
                activeStats,
                followUps
            };
        };

        window.getStatsHistoricalEventSquad = function(event, scopedPlayers, activePlayers) {
            const eventTeam = event?.team || event?.matchGroup;
            const scoped = Array.isArray(scopedPlayers) ? scopedPlayers : [];
            const current = Array.isArray(activePlayers)
                ? activePlayers
                : scoped.filter(p => p.status !== 'Passiv');
            const squadMap = new Map();
            const addPlayer = (player) => {
                if (!player) return;
                const key = typeof window.getPlayerStorageKey === 'function'
                    ? window.getPlayerStorageKey(player)
                    : (player.id || player.navn);
                if (!key || squadMap.has(key)) return;
                squadMap.set(key, player);
            };

            current
                .filter(p => !eventTeam || p.spillerLag === eventTeam)
                .forEach(addPlayer);

            // Passive players should count historically when the event itself says they attended.
            if (event?.attendance) {
                scoped.forEach(player => {
                    if (player.status !== 'Passiv') return;
                    if (eventTeam && player.spillerLag !== eventTeam) return;
                    if (window.isPlayerAttending(event.attendance, player)) addPlayer(player);
                });
            }

            return [...squadMap.values()];
        };

        window.buildTeamReportData = function(filterLag, lagData, analysis) {
            const teamFilterActive = filterLag && filterLag !== 'Alle';
            const allPlayers = window.activePlayers || [];
            const scopedPlayers = allPlayers.filter(p => !teamFilterActive || p.spillerLag === filterLag);
            const activePlayers = scopedPlayers.filter(p => p.status !== 'Passiv');
            const passivePlayers = scopedPlayers.filter(p => p.status === 'Passiv');
            const injuredPlayers = activePlayers.filter(p => {
                const injuryInfo = typeof window.getPlayerInjuryInfo === 'function'
                    ? window.getPlayerInjuryInfo(p)
                    : { isInjured: false };
                return injuryInfo.isInjured;
            });

            const playedMatches = (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (teamFilterActive && m.matchGroup !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                    if (typeof window.matchBelongsToStatsKampYear === 'function' && !window.matchBelongsToStatsKampYear(m)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            let conceded = 0;
            playedMatches.forEach(m => {
                const score = parseScore(m.result);
                if (score) conceded += score.opponent;
            });

            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const historicalEvents = allEvents
                .filter(e => {
                    if (teamFilterActive && e.team !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                    return Boolean(e.attendance);
                })
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const recentAttendance = historicalEvents.slice(0, 5).map(e => {
                const squad = window.getStatsHistoricalEventSquad(e, scopedPlayers, activePlayers);
                const attending = squad.filter(p => window.isPlayerAttending(e.attendance, p)).length;
                const pct = squad.length > 0 ? Math.round((attending / squad.length) * 100) : 0;
                return {
                    title: e.type === 'Kamp' ? `Kamp vs ${e.opponent || 'motstander'}` : (e.title || e.type || 'Aktivitet'),
                    date: e.date || '',
                    pct,
                    attending,
                    possible: squad.length
                };
            });

            const relevantTeams = teamFilterActive
                ? [filterLag]
                : [...new Set(activePlayers.map(p => p.spillerLag).filter(Boolean))];
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().slice(0, 10);
            const disciplinePlayers = new Set();
            let suspendedCount = 0;
            let atRiskCount = 0;

            relevantTeams.forEach(teamName => {
                const discipline = typeof window.getDisciplineStatusForTeam === 'function'
                    ? window.getDisciplineStatusForTeam(teamName, tomorrowStr)
                    : {};
                Object.entries(discipline).forEach(([key, status]) => {
                    if (disciplinePlayers.has(key)) return;
                    if (status.isSuspended || status.isAtRisk) disciplinePlayers.add(key);
                    if (status.isSuspended) suspendedCount++;
                    else if (status.isAtRisk) atRiskCount++;
                });
            });

            const lastFiveMatches = playedMatches.slice(0, 5);
            const previousMatches = playedMatches.slice(5);
            const avgFor = (matches) => {
                if (!matches.length) return null;
                const sum = matches.reduce((total, m) => {
                    const score = parseScore(m.result);
                    return total + (score ? score.bsk : 0);
                }, 0);
                return Math.round((sum / matches.length) * 10) / 10;
            };
            const avgAgainst = (matches) => {
                if (!matches.length) return null;
                const sum = matches.reduce((total, m) => {
                    const score = parseScore(m.result);
                    return total + (score ? score.opponent : 0);
                }, 0);
                return Math.round((sum / matches.length) * 10) / 10;
            };
            const avgTeamMatchPoints = (match) => {
                const attendingPlayers = window.getStatsHistoricalEventSquad(match, scopedPlayers, activePlayers)
                    .filter(p => window.isPlayerAttending(match.attendance, p));
                if (!attendingPlayers.length || typeof window.calculatePlayerMatchPoints !== 'function') return 0;
                const sum = attendingPlayers.reduce((total, p) => total + window.calculatePlayerMatchPoints(match, p), 0);
                return Math.round((sum / attendingPlayers.length) * 10) / 10;
            };
            const avgKampbidrag = (matches) => {
                const values = matches
                    .map(m => avgTeamMatchPoints(m))
                    .filter(value => value > 0);
                if (!values.length) return null;
                const sum = values.reduce((total, value) => total + value, 0);
                return Math.round((sum / values.length) * 10) / 10;
            };
            const avgAttendancePct = (events) => {
                let attendingTotal = 0;
                let possibleTotal = 0;

                events.forEach(e => {
                    const squad = window.getStatsHistoricalEventSquad(e, scopedPlayers, activePlayers);
                    if (!squad.length) return;
                    possibleTotal += squad.length;
                    attendingTotal += squad.filter(p => window.isPlayerAttending(e.attendance, p)).length;
                });

                return possibleTotal > 0 ? Math.round((attendingTotal / possibleTotal) * 100) : null;
            };

            const latestMatches = [...lastFiveMatches].reverse().map(m => {
                const score = parseScore(m.result);
                let form = 'U';
                if (score && score.bsk > score.opponent) form = 'S';
                else if (score && score.bsk < score.opponent) form = 'T';
                return {
                    opponent: m.opponent || 'Motstander',
                    date: m.date || '',
                    result: m.result || '-',
                    form,
                    points: avgTeamMatchPoints(m)
                };
            });

            return {
                title: lagData?.title || (teamFilterActive ? filterLag : 'Lagstatistikk'),
                filterLag,
                matchCount: playedMatches.length,
                conceded,
                squad: {
                    active: activePlayers.length,
                    passive: passivePlayers.length,
                    injured: injuredPlayers.length,
                    available: Math.max(0, activePlayers.length - injuredPlayers.length)
                },
                discipline: {
                    suspended: suspendedCount,
                    atRisk: atRiskCount
                },
                trends: {
                    lastFiveFor: avgFor(lastFiveMatches),
                    allFor: avgFor(previousMatches),
                    lastFiveAgainst: avgAgainst(lastFiveMatches),
                    allAgainst: avgAgainst(previousMatches),
                    lastFiveKampbidrag: avgKampbidrag(lastFiveMatches),
                    allKampbidrag: avgKampbidrag(previousMatches),
                    lastFiveAttendance: avgAttendancePct(historicalEvents.slice(0, 5)),
                    allAttendance: avgAttendancePct(historicalEvents.slice(5)),
                    latestMatches,
                    recentAttendance
                }
            };
        };

        window.renderStatsFollowUpsHtml = function(followUps) {
            if (!followUps.length) {
                return `
                    <p class="stats-kamp-panel-hint">Handlingsliste for spillere, skade, disiplin og oppmøte.</p>
                    <div class="stats-empty-state">
                        <h3>Ingen tydelige oppfølgingspunkter</h3>
                        <p>Det er ingen spillere som skiller seg ut på skade, disiplin eller oppmøte akkurat nå.</p>
                    </div>
                `;
            }

            return `
                <p class="stats-kamp-panel-hint">Handlingsliste for spillere, skade, disiplin og oppmøte.</p>
                <div class="stats-followup-list">
                    ${followUps.map(p => `
                        <button type="button" data-stat-action="open-player" data-player-id="${escapeStatisticsHtml(getStatsPlayerIdForName(p.name))}" data-player-name="${escapeStatisticsHtml(p.name)}" class="stats-followup-item w-full text-left">
                            <div class="flex items-center gap-3">
                                <div class="stats-metric-icon text-bsk-yellow">
                                    <i class="fa-solid fa-triangle-exclamation text-sm"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="font-black text-slate-800">${escapeStatsHtml(p.name)}</div>
                                    <div class="text-xs text-slate-500 leading-snug">${escapeStatsHtml(p.reason)}</div>
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>
            `;
        };

        
        window.renderStatistikkSide = function() {
            const filterLag = window.getStatsTeamFilter();
            const scopedPlayers = (window.activePlayers || []).filter(p => {
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });
            const teamPlayers = scopedPlayers.filter(p => {
                if (p.status === 'Passiv') return false;
                return true;
            });

            const filteredMatches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                if (typeof window.matchBelongsToStatsKampYear === 'function' && !window.matchBelongsToStatsKampYear(m)) return false;
                return true;
            });

            let wins = 0, draws = 0, losses = 0, goals = 0, conceded = 0;
            filteredMatches.forEach(m => {
                const score = parseScore(m.result);
                if (score !== null) {
                    goals += score.bsk;
                    conceded += score.opponent;
                    if (score.bsk > score.opponent) wins++;
                    else if (score.bsk === score.opponent) draws++;
                    else losses++;
                }
            });

            const matchCount = filteredMatches.length;
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            let totalEventTicks = 0, totalPossibleTicks = 0;
            allEvents.forEach(e => {
                if (filterLag && filterLag !== 'Alle' && e.team !== filterLag) return;
                if (e.date) {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    if (eventDate > todayForStats) return;
                }
                const eventTeam = e.team || 'Lag A';
                const squad = typeof window.getStatsHistoricalEventSquad === 'function'
                    ? window.getStatsHistoricalEventSquad(e, scopedPlayers, teamPlayers)
                    : teamPlayers.filter(p => p.spillerLag === eventTeam);
                if (!squad.length) return;
                totalPossibleTicks += squad.length;
                if (e.attendance) {
                    squad.forEach(p => {
                        if (window.isPlayerAttending(e.attendance, p)) totalEventTicks++;
                    });
                }
            });

            window._statsLagData = {
                filterLag,
                title: filterLag && filterLag !== 'Alle' ? filterLag : 'Lagstatistikk',
                wins,
                draws,
                losses,
                goals,
                goalsAvg: matchCount ? (goals / matchCount).toFixed(1) : '0',
                concededAvg: matchCount ? (conceded / matchCount).toFixed(1) : '0',
                playerCount: teamPlayers.length,
                avgAttendance: totalPossibleTicks > 0 ? Math.round((totalEventTicks / totalPossibleTicks) * 100) : 0,
                teamFormMedian: typeof window.getTeamFormMedian === 'function'
                    ? window.getTeamFormMedian(filterLag === 'Alle' ? '' : filterLag)
                    : 0
            };

            const analysis = typeof window.buildPlayerAnalysisStats === 'function'
                ? window.buildPlayerAnalysisStats(filterLag)
                : { followUps: [] };
            window._statsFollowUps = analysis.followUps || [];
            window._statsTeamReportData = typeof window.buildTeamReportData === 'function'
                ? window.buildTeamReportData(filterLag, window._statsLagData, analysis)
                : null;

            if (document.querySelector('#stat-tab-lag.is-active') || document.getElementById('stat-view-lag')?.classList.contains('block')) {
                window.renderStatsTabHero('lag');
            }

            if (typeof window.updateStatsLagSectionVisibility === 'function') {
                window.updateStatsLagSectionVisibility();
            }
            bindStatisticsEvents();
        };


window.getPlayerFormComponents = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };

    const spillerLag = playerObj.spillerLag;
    const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
    const isHistorical = (item) => {
        if (typeof window.isHistoricalActivity === 'function') {
            return window.isHistoricalActivity(item);
        }
        if (!item?.date) return true;
        const itemDate = new Date(item.date);
        if (Number.isNaN(itemDate.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate <= today;
    };
    const hasCompletedMatchResult = (item) => Boolean(item?.result && String(item.result).includes('-'));
    const teamEvents = allEvents
        .filter(e => {
            if (e.team !== spillerLag || !isHistorical(e)) return false;
            if (e.type === 'Kamp' && !hasCompletedMatchResult(e)) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const recentEvents = teamEvents.slice(0, 8);
    const attendedRecentEvents = recentEvents.filter(e => window.isPlayerAttending(e.attendance, playerObj)).length;
    const availabilityScore = recentEvents.length > 0
        ? (attendedRecentEvents / recentEvents.length) * 20
        : 0;

    const recentMatches = (window.activeMatches || [])
        .filter(m => (
            isHistorical(m) &&
            hasCompletedMatchResult(m) &&
            m.matchGroup === spillerLag &&
            m.attendance &&
            window.isPlayerAttending(m.attendance, playerObj)
        ))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    if (recentMatches.length === 0) {
        return { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };
    }

    let performanceScore = 0;
    let weightedPoints = 0;
    let totalWeight = 0;

    recentMatches.forEach((m, index) => {
        const weight = recentMatches.length - index;
        weightedPoints += window.calculatePlayerMatchPoints(m, playerName) * weight;
        totalWeight += weight;
    });

    const weightedAverage = totalWeight > 0 ? weightedPoints / totalWeight : 0;
    performanceScore = Math.max(0, Math.min(70, ((weightedAverage - 5) / 35) * 70));

    let totalYellowCards = 0;

    (window.activeMatches || []).forEach(m => {
        if (!isHistorical(m) || m.matchGroup !== spillerLag || m.matchType !== 'Serie') return;
        if (window.playerRefListIncludes(m.guleKort, playerObj)) totalYellowCards++;
    });

    const recentSerieMatches = (window.activeMatches || [])
        .filter(m => (
            isHistorical(m) &&
            m.matchGroup === spillerLag &&
            m.matchType === 'Serie' &&
            m.attendance &&
            window.isPlayerAttending(m.attendance, playerObj) &&
            (typeof window.isPlayerOnPitch !== 'function' || window.isPlayerOnPitch(m, playerObj))
        ))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    const recentRedCardWeights = [10, 8, 6, 4, 2];
    const recentRedCardPenalty = recentSerieMatches.reduce((total, m, index) => {
        return total + (window.playerRefListIncludes(m.rodeKort, playerObj)
            ? recentRedCardWeights[index]
            : 0);
    }, 0);

    let karantener = 0;
    if (totalYellowCards >= 4) {
        karantener = 1 + Math.floor((totalYellowCards - 4) / 2);
    }

    const disciplinePenalty = karantener > 1 ? (karantener - 1) * 5 : 0;
    const disciplineScore = Math.max(0, 10 - disciplinePenalty);
    const kamp = Math.round(performanceScore);
    const oppm = Math.round(availabilityScore);
    const dis = Math.round(disciplineScore);
    const total = Math.max(0, Math.min(100, kamp + oppm + dis - recentRedCardPenalty));

    return { total, kamp, oppm, dis, recentRedCardPenalty, hasFormData: true };
};

window.calculatePlayerPerformanceChemistry = function(playerName) {
    return window.getPlayerFormComponents(playerName).total;
};

window.getTeamFormMedian = function(teamName) {
    const scores = (window.activePlayers || [])
        .filter(p => p.status !== 'Passiv' && (!teamName || p.spillerLag === teamName))
        .map(p => window.calculatePlayerPerformanceChemistry(p.navn))
        .filter(score => score > 0)
        .sort((a, b) => a - b);

    if (!scores.length) return 0;

    const middle = Math.floor(scores.length / 2);
    return scores.length % 2 === 0
        ? Math.round((scores[middle - 1] + scores[middle]) / 2)
        : scores[middle];
};

window.getTeamMatchAveragePoints = function(match, teamName) {
    if (!match || !teamName || !match.attendance) return null;

    const scopedPlayers = (window.activePlayers || []).filter(p => p.spillerLag === teamName);
    const activePlayers = scopedPlayers.filter(p => p.status !== 'Passiv');
    const players = (typeof window.getStatsHistoricalEventSquad === 'function'
        ? window.getStatsHistoricalEventSquad(match, scopedPlayers, activePlayers)
        : activePlayers
    ).filter(p => window.isPlayerAttending(match.attendance, p));

    if (!players.length) return null;

    const sum = players.reduce((total, player) => {
        return total + (typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, player)
            : 0);
    }, 0);

    return Math.round((sum / players.length) * 10) / 10;
};

window.getFormScoreTone = function(score, teamName) {
    if (!score || score <= 0) return 'none';

    const median = typeof window.getTeamFormMedian === 'function'
        ? window.getTeamFormMedian(teamName)
        : 0;

    if (!median) return 'none';
    if (score >= median + 8) return 'green';
    if (score < median - 8) return 'red';
    return 'amber';
}

window.getFormScoreTextClass = function(score, teamName) {
    const tone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(score, teamName)
        : 'none';

    if (tone === 'green') return 'text-emerald-500';
    if (tone === 'amber') return 'text-amber-500';
    if (tone === 'red') return 'text-rose-500';
    return 'text-slate-400';
}

window.getFormScoreBorderClass = function(score, teamName) {
    const tone = typeof window.getFormScoreTone === 'function'
        ? window.getFormScoreTone(score, teamName)
        : 'none';

    if (tone === 'green') return 'border-emerald-500';
    if (tone === 'amber') return 'border-amber-500';
    if (tone === 'red') return 'border-rose-500';
    return 'border-slate-300';
}

        window.calculatePlayerTotalDisciplineScore = function(stat) {
            if (!stat) return 0;
            const yellowCards = (Number(stat.guleSerie) || 0) + (Number(stat.guleCup) || 0);
            const redCards = (Number(stat.rodeSerie) || 0) + (Number(stat.rodeCup) || 0);
            const atRiskPenalty = stat.serieAtRisk ? 10 : 0;
            return Math.max(0, 100 - (yellowCards * 8) - (redCards * 25) - atRiskPenalty);
        };

        window.applyPlayerTotalScores = function(statsData) {
            const rows = Array.isArray(statsData) ? statsData : [];
            const bestKampbonus = rows.reduce((max, stat) => {
                if (!stat || !stat.attendedMatches) return max;
                return Math.max(max, Number(stat.kampbonus) || 0);
            }, 0);

            rows.forEach(stat => {
                const kampbidragScore = bestKampbonus > 0
                    ? ((Number(stat.kampbonus) || 0) / bestKampbonus) * 100
                    : 0;
                const borsScore = stat.snittBors > 0
                    ? Math.max(0, Math.min(100, Number(stat.snittBors) * 10))
                    : 0;
                const oppmoteScore = Math.max(0, Math.min(100, Number(stat.oppmotePct) || 0));
                const disciplineScore = window.calculatePlayerTotalDisciplineScore(stat);

                stat.disiplinScore = disciplineScore;
                stat.totalScore = Math.round((
                    (kampbidragScore * 0.50) +
                    (borsScore * 0.25) +
                    (oppmoteScore * 0.15) +
                    (disciplineScore * 0.10)
                ) * 10) / 10;
            });

            return rows;
        };

        window.buildPlayerStatsData = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];

            const statsData = (window.activePlayers || [])
                .filter(p => filterLag === 'Alle' || p.spillerLag === filterLag)
                .map(p => {
                    const teamEvents = allEvents.filter(e => {
                        if (e.team !== p.spillerLag) return false;
                        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                        return true;
                    });

                    let attended = 0, kamper = 0, attendedMatches = 0, mal = 0, assist = 0, totalMatchPoints = 0, bb = 0;
                    let ratingSum = 0, ratingCount = 0;

                    teamEvents.forEach(e => {
                        if (window.isPlayerAttending(e.attendance, p)) {
                            attended++;
                            if (e.type === 'Kamp') {
                                attendedMatches++;
                                const onPitch = typeof window.isPlayerOnPitch === 'function'
                                    ? window.isPlayerOnPitch(e, p)
                                    : true;
                                if (onPitch) {
                                    kamper++;
                                    mal += Number(window.getPlayerRefMapValue(e.scorers, p, 0)) || 0;
                                    assist += Number(window.getPlayerRefMapValue(e.assists, p, 0)) || 0;
                                    if (window.motmMatchesPlayer(e.motm, p)) bb++;
                                    const playerRating = Number(window.getPlayerRefMapValue(e.ratings, p, 0)) || 0;
                                    if (playerRating > 0) {
                                        ratingSum += playerRating;
                                        ratingCount++;
                                    }
                                }
                                totalMatchPoints += window.calculatePlayerMatchPoints(e, p);
                            }
                        }
                    });

                    const cardCounts = typeof window.getPlayerCardCounts === 'function'
                        ? window.getPlayerCardCounts(p.navn, p.spillerLag)
                        : { serie: { gule: 0, rode: 0 }, cup: { gule: 0, rode: 0 } };
                    const serieHint = typeof window.getSerieYellowDisciplineHint === 'function'
                        ? window.getSerieYellowDisciplineHint(cardCounts.serie.gule)
                        : { isAtRisk: false };

                    return {
                        navn: p.navn,
                        pos1: p.pos1 || '',
                        spillerLag: p.spillerLag || '',
                        oppmotePct: teamEvents.length > 0 ? Math.round((attended / teamEvents.length) * 100) : 0,
                        kamper,
                        attendedMatches,
                        mal,
                        assist,
                        kampbonus: typeof window.getPlayerKampbidragSnitt === 'function'
                            ? window.getPlayerKampbidragSnitt(p)
                            : (attendedMatches > 0 ? totalMatchPoints / attendedMatches : 0),
                        guleSerie: cardCounts.serie.gule,
                        rodeSerie: cardCounts.serie.rode,
                        guleCup: cardCounts.cup.gule,
                        rodeCup: cardCounts.cup.rode,
                        serieAtRisk: serieHint.isAtRisk,
                        kjemi: window.calculatePlayerPerformanceChemistry(p.navn),
                        snittBors: ratingCount > 0 ? ratingSum / ratingCount : 0,
                        bb
                    };
                });

            return window.applyPlayerTotalScores(statsData);
        };

        window.renderStatsTeamFormPillsHtml = function(teamName) {
            const formGuide = window.getTeamFormGuide(teamName);
            if (!formGuide.length) return '';

            const getPillClass = (form) => {
                if (form === 'S') return 'is-win';
                if (form === 'T') return 'is-loss';
                return 'is-draw';
            };

            return `
                <div class="stats-chrome-form-row" aria-label="Lagform siste kamper">
                    <div class="stats-chrome-form-track">
                        ${formGuide.map((item, index) => `
                            <span class="stats-chrome-form-item ${getPillClass(item.form)} ${index === formGuide.length - 1 ? 'is-latest' : ''}" title="${escapeStatisticsHtml(item.tooltip)}">
                                <span class="stats-chrome-form-dot" aria-hidden="true"></span>
                                <span>${escapeStatisticsHtml(item.text)}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        window.renderStatsHeroTabsHtml = function(activeTabId) {
            const showTeamForm = activeTabId === 'lag' && window._statsLagData;
            const teamFormHtml = showTeamForm
                ? window.renderStatsTeamFormPillsHtml(window._statsLagData.filterLag)
                : '';

            return `
                <div class="stats-hero-tabs stats-hero-tabs-info-only">
                    <div class="roster-status-filter stats-hero-tablist stats-hero-tablist-info-only" aria-label="Statistikkvalg">
                        <button
                            type="button"
                            data-stat-action="open-form-info"
                            class="roster-status-btn stats-chrome-info-btn"
                            title="Slik regnes form"
                            aria-label="Slik regnes form"
                        >
                            <i class="fa-solid fa-circle-info"></i>
                        </button>
                    </div>
                    ${teamFormHtml}
                </div>
            `;
        };

        window.playerStatsRelevantForSort = function(stat, column) {
            switch (column) {
                case 'totalScore': return stat.totalScore > 0;
                case 'guleSerie': return stat.guleSerie > 0;
                case 'rodeSerie': return stat.rodeSerie > 0;
                case 'mal': return stat.mal > 0;
                case 'assist': return stat.assist > 0;
                case 'bb': return stat.bb > 0;
                case 'kamper': return stat.kamper > 0;
                case 'kampbonus': return stat.attendedMatches > 0;
                case 'kjemi': return stat.kjemi > 0;
                case 'snittBors': return stat.snittBors > 0;
                case 'oppmotePct': return stat.oppmotePct > 0;
                default: return true;
            }
        };

        window.getStatsSortEmptyMessage = function(column, searchTerm) {
            if (searchTerm) return 'Ingen spillere matcher søket.';

            const labels = {
                guleSerie: 'gule kort',
                rodeSerie: 'røde kort',
                totalScore: 'total score',
                mal: 'mål',
                assist: 'assist',
                bb: 'banens beste',
                kamper: 'kamper',
                kampbonus: 'kampbidrag',
                kjemi: 'form',
                snittBors: 'spillerbørs',
                oppmotePct: 'oppmøte'
            };

            const label = labels[column];
            return label
                ? `Ingen spillere med registrerte ${label}.`
                : 'Ingen spillere funnet for valgt lag.';
        };

        window.clearStatsTabHero = function() {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = '';
            hero.innerHTML = '';
        };

        window.paintStatsChrome = function(markup) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = 'stats-chrome';
            hero.innerHTML = markup;
        };

        window.paintStatsTabHero = function(markup) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;
            hero.className = 'stats-hero-panel';
            hero.innerHTML = markup;
        };

        window.renderStatsChromeTabsOnly = function(tabsHtml) {
            return `
                <div class="stats-chrome-bar stats-chrome-bar-centered">
                    <div class="stats-chrome-actions">${tabsHtml}</div>
                </div>
            `;
        };

        window.renderStatsChromeBar = function(title, tabsHtml, subtitleHtml = '') {
            return `
                <div class="stats-chrome-bar stats-chrome-bar-centered stats-chrome-bar-stacked">
                    <div class="stats-chrome-main">
                        <h2 class="stats-chrome-title">${title}</h2>
                        ${subtitleHtml}
                    </div>
                    <div class="stats-chrome-actions">${tabsHtml}</div>
                </div>
            `;
        };

        window.renderStatsInlineMetricHtml = function(label, value, toneClass = '', clickHandler = '') {
            const tag = clickHandler ? 'button' : 'div';
            const attrs = clickHandler
                ? ` type="button" onclick="${clickHandler}" class="stats-inline-metric stats-inline-metric-clickable"`
                : ` class="stats-inline-metric"`;
            return `
                <${tag}${attrs}>
                    <span class="stats-inline-metric-label">${label}</span>
                    <span class="stats-inline-metric-value ${toneClass}">${value}</span>
                </${tag}>
            `;
        };

        window.getStatsTeamMedian = function(statsData, column) {
            const values = statsData
                .map(stat => Number(stat[column]))
                .filter(value => !Number.isNaN(value));
            if (!values.length) return null;

            values.sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);
            return values.length % 2 === 0
                ? (values[mid - 1] + values[mid]) / 2
                : values[mid];
        };

        window.formatStatsSortValue = function(column, value) {
            const numeric = Number(value);
            if (Number.isNaN(numeric)) return '-';

            if (column === 'oppmotePct') return `${Math.round(numeric)}%`;
            if (column === 'kjemi') return String(Math.round(numeric));
            if (column === 'kampbonus' || column === 'snittBors' || column === 'totalScore') return numeric > 0 ? numeric.toFixed(1) : '-';
            if (numeric > 0 || column === 'kamper') return String(Math.round(numeric));
            return '-';
        };

        window.formatStatsMedianDelta = function(column, playerValue, median) {
            if (median === null || median === undefined) return { text: '', tone: 'is-equal' };

            const delta = Number(playerValue) - Number(median);
            if (Number.isNaN(delta)) return { text: '', tone: 'is-equal' };

            if (Math.abs(delta) < 0.05) {
                return { text: '+0', tone: 'is-equal' };
            }

            const rounded = column === 'oppmotePct'
                ? Math.round(delta)
                : (column === 'kampbonus' || column === 'snittBors' || column === 'totalScore')
                    ? Math.round(delta * 10) / 10
                    : Math.round(delta);
            const suffix = column === 'oppmotePct' ? '%' : '';
            const sign = rounded > 0 ? '+' : '';
            return {
                text: `${sign}${rounded}${suffix}`,
                tone: rounded > 0 ? 'is-above' : 'is-below'
            };
        };

        window.getStatsPlayerRank = function(playerName, column, statsData) {
            const relevantStats = statsData.filter(stat => window.playerStatsRelevantForSort(stat, column));
            const useActiveSort = column === currentStatSortCol;

            relevantStats.sort((a, b) => (
                useActiveSort && !currentStatSortDesc
                    ? a[column] - b[column]
                    : b[column] - a[column]
            ));

            const index = relevantStats.findIndex(stat => stat.navn === playerName);
            return index === -1 ? null : index + 1;
        };

        window.getStatsSortedLeader = function(sortCol, statsData) {
            const relevantStats = statsData.filter(stat => window.playerStatsRelevantForSort(stat, sortCol));
            relevantStats.sort((a, b) => (
                currentStatSortDesc
                    ? b[sortCol] - a[sortCol]
                    : a[sortCol] - b[sortCol]
            ));
            return relevantStats[0] || null;
        };

        window.getStatsSortMedian = function(column, statsData, teamName) {
            const pool = statsData.filter(stat => {
                if (teamName && stat.spillerLag !== teamName) return false;
                return window.playerStatsRelevantForSort(stat, column);
            });

            if (column === 'kjemi' && typeof window.getTeamFormMedian === 'function') {
                return window.getTeamFormMedian(teamName || '');
            }

            return window.getStatsTeamMedian(pool, column);
        };

        window.renderStatsSpillereLeaderNameCardHtml = function(leader) {
            if (!leader) {
                return `
                    <div class="match-bench-count dashboard-series-goal-count stats-spillere-summary-card">
                        <span class="dashboard-series-goal-count-value stats-leader-name">-</span>
                    </div>
                `;
            }

            return `
                <button type="button" data-stat-action="open-player" data-player-id="${escapeStatisticsHtml(getStatsPlayerIdForName(leader.navn))}" data-player-name="${escapeStatisticsHtml(leader.navn)}" class="match-bench-count dashboard-series-goal-count stats-spillere-summary-card stats-spillere-summary-card-clickable">
                    <span class="dashboard-series-goal-count-value stats-leader-name">${escapeStatisticsHtml(leader.navn)}</span>
                </button>
            `;
        };

        window.renderStatsSpillereMetricCardHtml = function(column, leader, statsData) {
            if (!leader) {
                return `
                    <div class="match-bench-count dashboard-series-goal-count stats-spillere-summary-card">
                        <span class="dashboard-series-goal-count-value">-</span>
                    </div>
                `;
            }

            const option = window.getStatsSortOption(column);
            const iconHtml = window.renderStatsSortIconHtml(option, 'stats-sort-context-icon');
            const value = leader[column];
            const median = window.getStatsSortMedian(column, statsData, leader.spillerLag || '');
            const mainText = window.formatStatsSortValue(column, value);
            const delta = window.formatStatsMedianDelta(column, value, median);

            return `
                <div class="match-bench-count dashboard-series-goal-count stats-spillere-summary-card">
                    <span class="dashboard-series-goal-count-value stats-spillere-summary-value">
                        ${iconHtml}
                        <span class="stats-sort-context-main">${mainText}</span>
                        ${delta.text ? `<span class="stats-sort-context-delta ${delta.tone}">${delta.text}</span>` : ''}
                    </span>
                </div>
            `;
        };

        window.renderStatsSpillereSummaryCardsHtml = function(statsData) {
            const leader = statsData
                .filter(stat => window.playerStatsRelevantForSort(stat, 'totalScore'))
                .sort((a, b) => b.totalScore - a.totalScore)[0] || null;

            return `
                <div class="stats-spillere-summary-metrics">
                    ${window.renderStatsSpillereLeaderNameCardHtml(leader)}
                    ${window.renderStatsSpillereMetricCardHtml('totalScore', leader, statsData)}
                </div>
            `;
        };

        window.getTeamReportTrendMeta = function(current, baseline, inverted = false) {
            if (current === null || current === undefined || baseline === null || baseline === undefined || current === baseline) {
                return { tone: 'is-neutral', arrow: '→', direction: 'is-neutral' };
            }
            const better = inverted ? current < baseline : current > baseline;
            const arrowIsUp = current > baseline;
            return {
                tone: better ? 'is-good' : 'is-alert',
                arrow: arrowIsUp ? '↑' : '↓',
                direction: arrowIsUp === inverted ? 'is-down' : 'is-up'
            };
        };

        window.renderTeamReportTrendCardHtml = function(label, current, baseline, inverted = false, suffix = '', icon = '') {
            const meta = window.getTeamReportTrendMeta(current, baseline, inverted);
            const trendValue = (value) => (
                value === null || value === undefined ? '-' : `${value}${suffix}`
            );
            return `
                <div class="team-report-trend-card ${meta.tone}">
                    <span class="team-report-card-label">${label}</span>
                    <strong class="team-report-trend-values">
                        <span>${trendValue(current)}</span>
                        ${icon ? `<i class="fa-solid ${icon} team-report-trend-icon" aria-hidden="true"></i>` : ''}
                        <span class="team-report-trend-arrow ${meta.direction}">${meta.arrow}</span>
                        <span>${trendValue(baseline)}</span>
                    </strong>
                </div>
            `;
        };

        window.renderKamputviklingCardsHtml = function(report) {
            const trends = report?.trends || {};
            return `
                <div class="team-report-trend-grid stats-development-match-grid">
                    ${window.renderTeamReportTrendCardHtml('Mål scoret siste 5', trends.lastFiveFor, trends.allFor, false, '', 'fa-futbol')}
                    ${window.renderTeamReportTrendCardHtml('Mål imot siste 5', trends.lastFiveAgainst, trends.allAgainst, true, '', 'fa-futbol')}
                    ${window.renderTeamReportTrendCardHtml('Kampbidrag siste 5', trends.lastFiveKampbidrag, trends.allKampbidrag, false, '', 'fa-chart-line')}
                </div>
            `;
        };

        window.renderOppmoteutviklingCardsHtml = function(report) {
            const trends = report?.trends || {};
            return `
                <div class="team-report-trend-grid stats-development-attendance-grid">
                    ${window.renderTeamReportTrendCardHtml('Oppmøte siste 5', trends.lastFiveAttendance, trends.allAttendance, false, '%', 'fa-user-check')}
                </div>
            `;
        };

        window.renderTeamReportStatusHtml = function(data, report) {
            const recordClass = data.wins >= data.losses ? 'is-win' : 'is-loss';
            const attendanceTone = data.avgAttendance >= 75 ? 'is-win' : data.avgAttendance >= 60 ? 'is-draw' : 'is-loss';
            const goalTone = data.goals >= report.conceded ? 'is-goals' : 'is-loss';
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : 'alle';
            const yearOptions = typeof window.getStatsKampYearOptions === 'function'
                ? window.getStatsKampYearOptions()
                : [];
            const yearFilterHtml = `
                <div class="stats-kamp-year-filter" role="tablist" aria-label="Filtrer kamper etter år">
                    <button
                        type="button"
                        role="tab"
                        aria-selected="${yearFilter === 'alle' ? 'true' : 'false'}"
                        class="bsk-btn bsk-btn-chip stats-kamp-year-btn ${yearFilter === 'alle' ? 'is-active' : ''}"
                        data-stat-action="set-kamp-year"
                        data-year="alle"
                    >Alle</button>
                    ${yearOptions.map(year => `
                        <button
                            type="button"
                            role="tab"
                            aria-selected="${yearFilter === year ? 'true' : 'false'}"
                            class="bsk-btn bsk-btn-chip stats-kamp-year-btn ${yearFilter === year ? 'is-active' : ''}"
                            data-stat-action="set-kamp-year"
                            data-year="${year}"
                        >${year}</button>
                    `).join('')}
                </div>
            `;
            const kampHint = yearFilter === 'alle'
                ? 'Resultater og mål fra alle spilte kamper med registrert resultat.'
                : `Resultater og mål fra spilte kamper i ${yearFilter}.`;
            const utviklingHint = yearFilter === 'alle'
                ? 'Sammenligner siste 5 kamper med snittet for alle spilte kamper.'
                : `Sammenligner siste 5 kamper i ${yearFilter} med snittet for ${yearFilter}.`;
            const summaryItem = (label, valueHtml, tone = '', icon = 'fa-circle', hint = '') => `
                <div class="stats-analysis-chip ${tone}">
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                    <span class="stats-analysis-chip-label">${label}</span>
                    <strong class="stats-analysis-chip-value">${valueHtml}</strong>
                    ${hint ? `<span class="stats-analysis-chip-hint">${hint}</span>` : ''}
                </div>
            `;
            const kampdataPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'kampdata',
                title: 'Sesong',
                badge: yearFilter === 'alle' ? 'Alle' : yearFilter,
                showLabel: 'Vis sesong',
                hideLabel: 'Skjul sesong',
                content: `
                    <p class="stats-kamp-panel-hint">${kampHint}</p>
                    ${yearFilterHtml}
                    <div class="stats-analysis-strip">
                        ${summaryItem('Kamper', report.matchCount, '', 'fa-calendar-days', 'spilte kamper')}
                        ${summaryItem('Resultat', `<span class="team-report-record"><span class="is-win">${data.wins}</span><span>${data.draws}</span><span class="is-loss">${data.losses}</span></span>`, recordClass, 'fa-trophy', 'seier - uavgjort - tap')}
                        ${summaryItem('Mål', `<span class="team-report-goals"><span class="is-win">${data.goals}</span><span class="team-report-goal-sep">-</span><span class="is-loss">${report.conceded}</span></span>`, goalTone, 'fa-futbol', 'scoret - imot')}
                    </div>
                `
            });
            const kamputviklingPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'kamputvikling',
                title: 'Kamputvikling',
                showLabel: 'Vis kamputvikling',
                hideLabel: 'Skjul kamputvikling',
                content: `
                    <p class="stats-kamp-panel-hint">${utviklingHint}</p>
                    ${window.renderKamputviklingCardsHtml(report)}
                `
            });
            const kampstatsPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'kampstats',
                title: 'Kampstats',
                showLabel: 'Vis kampstats',
                hideLabel: 'Skjul kampstats',
                content: `
                    <div id="stats-lag-kampdata-detail" class="stats-lag-kampdata-detail"></div>
                `
            });
            const oppmotePanel = window.renderStatsCollapsiblePanelHtml({
                id: 'oppmote',
                title: 'Oppmøte',
                badge: `${data.avgAttendance}%`,
                showLabel: 'Vis oppmøte',
                hideLabel: 'Skjul oppmøte',
                content: `
                    <p class="stats-kamp-panel-hint">Oppmøteregistrering på historiske aktiviteter for valgt lag.</p>
                    <div class="stats-analysis-strip stats-analysis-strip-single">
                        ${summaryItem('Oppmøte', `${data.avgAttendance}%`, attendanceTone, 'fa-user-check', 'av mulige registreringer')}
                    </div>
                `
            });
            const oppmoteutviklingPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'oppmoteutvikling',
                title: 'Oppmøteutvikling',
                showLabel: 'Vis oppmøteutvikling',
                hideLabel: 'Skjul oppmøteutvikling',
                content: `
                    <p class="stats-kamp-panel-hint">Viser om oppmøtet i de siste 5 aktivitetene går opp eller ned.</p>
                    ${window.renderOppmoteutviklingCardsHtml(report)}
                `
            });

            return `
                <div class="team-report-status-stack">
                    ${kampdataPanel}
                    ${kamputviklingPanel}
                    ${kampstatsPanel}
                    ${oppmotePanel}
                    ${oppmoteutviklingPanel}
                </div>
            `;
        };

        window.syncTeamReportDetailMenuScroll = function() {
            const scroller = document.getElementById('team-report-detail-scroller');
            const wrap = scroller?.closest('.team-report-detail-scroller-wrap');
            if (!scroller || !wrap) return;

            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            wrap.classList.toggle('can-scroll-left', scroller.scrollLeft > 6);
            wrap.classList.toggle('can-scroll-right', maxScroll > 6 && scroller.scrollLeft < maxScroll - 6);
        };

        window.bindTeamReportDetailMenuScroll = function() {
            const scroller = document.getElementById('team-report-detail-scroller');
            if (!scroller || scroller.dataset.scrollBound === 'true') return;

            scroller.dataset.scrollBound = 'true';
            scroller.addEventListener('scroll', window.syncTeamReportDetailMenuScroll, { passive: true });
            if (!window.teamReportDetailMenuResizeBound) {
                window.teamReportDetailMenuResizeBound = true;
                window.addEventListener('resize', window.syncTeamReportDetailMenuScroll);
            }
            requestAnimationFrame(window.syncTeamReportDetailMenuScroll);
        };

        window.scrollTeamReportDetailMenu = function(direction) {
            const scroller = document.getElementById('team-report-detail-scroller');
            if (!scroller) return;

            scroller.scrollBy({
                left: direction * Math.max(160, Math.round(scroller.clientWidth * 0.72)),
                behavior: 'smooth'
            });
            setTimeout(window.syncTeamReportDetailMenuScroll, 280);
        };

        window.openTeamReportMetaTarget = function(target) {
            const openRoster = (status) => {
                if (typeof window.switchTab === 'function') window.switchTab('tropp');
                const searchInput = document.getElementById('playerSearchInput');
                if (searchInput) searchInput.value = '';
                if (typeof window.setPlayerStatusFilter === 'function') {
                    window.setPlayerStatusFilter(status);
                } else if (typeof window.renderPlayerRoster === 'function') {
                    window.renderPlayerRoster();
                }
            };
            const openPlayerStats = (sortColumn) => {
                if (typeof window.switchTab === 'function') window.switchTab('statistikk');
                window.statsBackTarget = 'lag';
                if (typeof window.switchStatTab === 'function') window.switchStatTab('spillere');

                if (sortColumn) {
                    if (currentStatSortCol !== sortColumn) {
                        currentStatSortCol = sortColumn;
                        currentStatSortDesc = true;
                    }
                    if (typeof window.updateStatsSortButtons === 'function') window.updateStatsSortButtons();
                    if (typeof window.renderPlayerStatsList === 'function') window.renderPlayerStatsList();
                    if (typeof window.renderStatsSpillereSummary === 'function') window.renderStatsSpillereSummary();
                }
            };

            if (target === 'available') return openRoster('alle');
            if (target === 'active') return openRoster('Aktiv');
            if (target === 'injured') return openRoster('skadet');
            if (target === 'passive') return openRoster('Passiv');
            if (target === 'form') return openPlayerStats('kjemi');
            if (target === 'redCards') return openPlayerStats('rodeSerie');
            if (target === 'yellowCards') return openPlayerStats('guleSerie');
        };

        window.statsScoreDiagramMode = window.statsScoreDiagramMode || 'total';
        window.statsScoreDiagramExplanationOpen = window.statsScoreDiagramExplanationOpen || false;

        window.setStatsScoreDiagramMode = function(mode) {
            window.statsScoreDiagramMode = mode === 'five' ? 'five' : 'total';
            const container = document.getElementById('team-score-diagram-wrap');
            if (container) container.innerHTML = window.renderTeamScoreDiagramHtml();
        };

        window.toggleStatsScoreDiagramExplanation = function() {
            window.statsScoreDiagramExplanationOpen = !window.statsScoreDiagramExplanationOpen;
            const container = document.getElementById('team-score-diagram-wrap');
            if (container) container.innerHTML = window.renderTeamScoreDiagramHtml();
        };

        window.setStatsDiagramPointTooltip = function(point, isActive) {
            if (!point) return;
            if (isActive) {
                const svg = point.closest('.team-score-diagram-svg');
                if (svg) {
                    svg.querySelectorAll('.team-score-diagram-point.is-active').forEach(activePoint => {
                        if (activePoint !== point) activePoint.classList.remove('is-active');
                    });
                    svg.appendChild(point);
                }
                point.classList.add('is-active');
                return;
            }
            point.classList.remove('is-active');
        };

        window.getStatsDiagramInitials = function(name) {
            return String(name || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join('');
        };

        window.buildStatsTotalScoreDiagramData = function() {
            const playerByName = new Map((window.activePlayers || []).map(player => [player.navn, player]));
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData()
                : [];

            return rows
                .filter(stat => {
                    const player = playerByName.get(stat.navn);
                    return stat.attendedMatches > 0 && stat.totalScore > 0 && player?.status !== 'Passiv';
                })
                .map(stat => ({
                    name: stat.navn,
                    x: Number(stat.kampbonus) || 0,
                    y: Number(stat.snittBors) || 0,
                    score: Number(stat.totalScore) || 0,
                    totalScore: Number(stat.totalScore) || 0
                }));
        };

        window.buildStatsFiveScoreDiagramData = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const scopedPlayers = (window.activePlayers || [])
                .filter(player => player.status !== 'Passiv')
                .filter(player => filterLag === 'Alle' || player.spillerLag === filterLag);

            const totalRows = window.buildStatsTotalScoreDiagramData();
            const totalByName = new Map(totalRows.map(row => [row.name, row.totalScore]));
            const rows = scopedPlayers.map(player => {
                const teamName = player.spillerLag;
                const playerMatches = (window.activeMatches || [])
                    .filter(match => (
                        match.matchGroup === teamName &&
                        (!window.isHistoricalActivity || window.isHistoricalActivity(match)) &&
                        match.attendance &&
                        window.isPlayerAttending(match.attendance, player)
                    ))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                    .slice(0, 5);

                if (!playerMatches.length) return null;

                const teamMatches = (window.activeMatches || [])
                    .filter(match => (
                        match.matchGroup === teamName &&
                        (!window.isHistoricalActivity || window.isHistoricalActivity(match))
                    ))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                    .slice(0, 5);

                const matchPoints = playerMatches.reduce((sum, match) => {
                    return sum + (typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(match, player)
                        : 0);
                }, 0);
                const recentKampbidrag = matchPoints / playerMatches.length;

                let ratingSum = 0;
                let ratingCount = 0;
                playerMatches.forEach(match => {
                    const onPitch = typeof window.isPlayerOnPitch === 'function'
                        ? window.isPlayerOnPitch(match, player)
                        : true;
                    if (!onPitch) return;

                    const rating = Number(window.getPlayerRefMapValue(match.ratings, player, 0)) || 0;
                    if (rating > 0) {
                        ratingSum += rating;
                        ratingCount++;
                    }
                });
                const recentSnittBors = ratingCount > 0 ? ratingSum / ratingCount : 0;

                const recentOppmote = teamMatches.length > 0
                    ? Math.round((teamMatches.filter(match => window.isPlayerAttending(match.attendance, player)).length / teamMatches.length) * 100)
                    : 0;

                const yellowCards = playerMatches.filter(match => match.matchType === 'Serie' && window.playerRefListIncludes(match.guleKort, player)).length;
                const redCards = playerMatches.filter(match => match.matchType === 'Serie' && window.playerRefListIncludes(match.rodeKort, player)).length;
                const recentDiscipline = Math.max(0, 100 - (yellowCards * 8) - (redCards * 25));

                return {
                    name: player.navn,
                    x: recentKampbidrag,
                    y: recentSnittBors,
                    oppmote: recentOppmote,
                    discipline: recentDiscipline,
                    totalScore: totalByName.get(player.navn) || 0
                };
            }).filter(Boolean);

            const bestRecentKampbidrag = rows.reduce((max, row) => Math.max(max, row.x), 0);
            return rows.map(row => {
                const kampbidragScore = bestRecentKampbidrag > 0 ? (row.x / bestRecentKampbidrag) * 100 : 0;
                const borsScore = row.y > 0 ? Math.max(0, Math.min(100, row.y * 10)) : 0;
                const score = Math.round((
                    (kampbidragScore * 0.50) +
                    (borsScore * 0.25) +
                    (row.oppmote * 0.15) +
                    (row.discipline * 0.10)
                ) * 10) / 10;

                return { ...row, score };
            });
        };

        window.renderTeamScoreDiagramHtml = function() {
            const mode = window.statsScoreDiagramMode === 'five' ? 'five' : 'total';
            const isTotal = mode === 'total';
            const rows = isTotal
                ? window.buildStatsTotalScoreDiagramData()
                : window.buildStatsFiveScoreDiagramData();

            if (!rows.length) {
                return '';
            }

            const isCompact = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
            const width = isCompact ? 390 : 860;
            const height = isCompact ? 360 : 520;
            const pad = isCompact
                ? { left: 42, right: 14, top: 40, bottom: 58 }
                : { left: 72, right: 32, top: 36, bottom: 72 };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const xMin = isTotal ? 8 : 8;
            const xMax = isTotal ? 24 : 28;
            const yMin = 4;
            const yMax = 7;
            const x = value => pad.left + ((Math.max(xMin, Math.min(xMax, value)) - xMin) / (xMax - xMin)) * plotW;
            const y = value => pad.top + (1 - ((Math.max(yMin, Math.min(yMax, value)) - yMin) / (yMax - yMin))) * plotH;
            const gridX = isTotal
                ? (isCompact ? [8, 12, 16, 20, 24] : [8, 10, 12, 14, 16, 18, 20, 22, 24])
                : (isCompact ? [8, 12, 16, 20, 24, 28] : [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
            const gridY = isCompact ? [4, 5, 6, 7] : [4, 4.5, 5, 5.5, 6, 6.5, 7];
            const escapeHtml = window.escapeModalHtml || (value => String(value || ''));

            const pointsHtml = rows.map(row => {
                const radius = 4 + ((row.score - 20) / 65) * 3;
                const fill = isTotal
                    ? '#0b2b4c'
                    : row.score >= row.totalScore ? '#00c853' : '#ff1744';
                const stroke = '#ffffff';
                const strokeWidth = 1.5;
                const pointX = x(row.x);
                const pointY = y(row.y);
                const tooltipWidth = isCompact ? 142 : 160;
                const tooltipHeight = 52;
                const tooltipX = Math.max(8, Math.min(width - tooltipWidth - 8, pointX - (tooltipWidth / 2)));
                const tooltipY = Math.max(8, pointY - radius - tooltipHeight - (isCompact ? 14 : 12));
                const recentDelta = row.score - (row.totalScore || 0);
                const recentDeltaLabel = `${recentDelta >= 0 ? '+' : '-'}${Math.abs(recentDelta).toFixed(1)}`;
                const tooltipValueClass = isTotal
                    ? 'is-season'
                    : recentDelta >= 0 ? 'is-up' : 'is-down';

                return `
                    <g class="team-score-diagram-point" tabindex="0" aria-label="${escapeHtml(isTotal ? `${row.name}. Sesongform ${row.score.toFixed(1)}` : `${row.name}. Form 5 siste ${recentDeltaLabel}`)}" onmouseenter="window.setStatsDiagramPointTooltip(this, true)" onmouseleave="window.setStatsDiagramPointTooltip(this, false)" onfocus="window.setStatsDiagramPointTooltip(this, true)" onblur="window.setStatsDiagramPointTooltip(this, false)" onpointerdown="window.setStatsDiagramPointTooltip(this, true)">
                        <text x="${pointX}" y="${pointY - radius - (isCompact ? 8 : 6)}" text-anchor="middle" class="team-score-diagram-initials">${escapeHtml(window.getStatsDiagramInitials(row.name))}</text>
                        <circle cx="${pointX}" cy="${pointY}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="0.92"></circle>
                        <g class="team-score-diagram-tooltip" transform="translate(${tooltipX} ${tooltipY})">
                            <rect width="${tooltipWidth}" height="${tooltipHeight}" rx="10"></rect>
                            <text x="12" y="19" class="team-score-diagram-tooltip-name">${escapeHtml(row.name)}</text>
                            <text x="12" y="38" class="team-score-diagram-tooltip-meta">
                                <tspan>${isTotal ? 'Sesongform' : 'Form 5 siste'}</tspan>
                                <tspan class="team-score-diagram-tooltip-value ${tooltipValueClass}" dx="6">${isTotal ? row.score.toFixed(1) : recentDeltaLabel}</tspan>
                            </text>
                        </g>
                    </g>
                `;
            }).join('');

            return `
                <div class="team-score-diagram-card">
                    <div class="team-score-diagram-topbar">
                        <div class="team-score-diagram-tabs">
                            <button type="button" onclick="window.setStatsScoreDiagramMode('total')" class="team-score-diagram-tab ${isTotal ? 'is-active' : ''}">Total score</button>
                            <button type="button" onclick="window.setStatsScoreDiagramMode('five')" class="team-score-diagram-tab ${!isTotal ? 'is-active' : ''}">5 siste score</button>
                        </div>
                        <button type="button" onclick="window.toggleStatsScoreDiagramExplanation()" class="team-score-diagram-help">Diagramforklaring</button>
                    </div>

                    ${window.statsScoreDiagramExplanationOpen ? `
                        <div class="team-score-diagram-explanation">
                            <h4>Lesing av diagrammet</h4>
                            ${isTotal ? `
                                <p>Spillere langt til høyre har høyt kampbidrag. Spillere høyt oppe har høy snittbørs. Boblen viser total score, som fortsatt tar med oppmøte og disiplin.</p>
                                <p>Kilde: spillerstatistikken. Begge akser bruker tall som allerede finnes på spillerfanen.</p>
                            ` : `
                                <p>Spillere langt til høyre har høyt kampbidrag i de siste 5 kampene. Spillere høyt oppe har høy snittbørs i samme periode. Boblen viser 5 siste score, som også tar med nylig kampoppmøte og disiplin.</p>
                                <p>Grønn boble betyr at spilleren er over egen total score. Rød boble betyr under.</p>
                                <p>Kilde: spillerstatistikken. 5 siste score bruker samme formel som total score, men avgrenset til nylige kamper.</p>
                            `}
                        </div>
                    ` : ''}

                    <div class="team-score-diagram-scroll">
                        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${isTotal ? 'Total score' : '5 siste score'} diagram" class="team-score-diagram-svg">
                            <rect x="0" y="0" width="${width}" height="${height}" class="team-score-diagram-bg"></rect>
                            ${gridX.map(tick => `
                                <g>
                                    <line x1="${x(tick)}" x2="${x(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" class="team-score-diagram-grid"></line>
                                    <text x="${x(tick)}" y="${height - 42}" text-anchor="middle" class="team-score-diagram-tick">${tick}</text>
                                </g>
                            `).join('')}
                            ${gridY.map(tick => `
                                <g>
                                    <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="team-score-diagram-grid"></line>
                                    <text x="46" y="${y(tick) + 4}" text-anchor="middle" class="team-score-diagram-tick">${tick}</text>
                                </g>
                            `).join('')}
                            <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" class="team-score-diagram-axis"></line>
                            <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" class="team-score-diagram-axis"></line>
                            <text x="${width / 2}" y="${height - 14}" text-anchor="middle" class="team-score-diagram-axis-label">${isCompact ? 'Kampbidrag' : (isTotal ? 'Kampbidrag (sesongsnitt)' : 'Kampbidrag siste 5')}</text>
                            <text transform="translate(18 ${height / 2}) rotate(-90)" text-anchor="middle" class="team-score-diagram-axis-label">${isCompact ? 'Snittbørs' : (isTotal ? 'Snittbørs' : 'Snittbørs siste 5')}</text>
                            ${pointsHtml}
                        </svg>
                    </div>
                </div>
            `;
        };

        window.statsLagSections = [
            { id: 'kampdata', label: 'Kamp', icon: 'fa-shield-halved' },
            { id: 'spillerdata', label: 'Spiller', icon: 'fa-users' },
            { id: 'treningsdata', label: 'Trening', icon: 'fa-user-check' }
        ];
        window.statsLagSection = window.statsLagSection || 'kampdata';

        window.getStatsLagSection = function() {
            const validIds = new Set(window.statsLagSections.map(section => section.id));
            return validIds.has(window.statsLagSection) ? window.statsLagSection : 'kampdata';
        };

        window.renderStatsLagSectionNav = function() {
            const activeSection = window.getStatsLagSection();
            return `
                <div class="stats-lag-section-nav-inner" role="tablist" aria-label="Lagstatistikk">
                    ${window.statsLagSections.map(section => `
                        <button
                            type="button"
                            role="tab"
                            aria-selected="${activeSection === section.id ? 'true' : 'false'}"
                            class="bsk-btn bsk-btn-chip stats-lag-section-btn ${activeSection === section.id ? 'is-active' : ''}"
                            data-stat-action="set-lag-section"
                            data-section-id="${section.id}"
                        >
                            <span>${section.label}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        };

        window.updateStatsBoardActiveSection = function() {
            const icon = document.getElementById('stats-board-active-icon');
            const label = document.getElementById('stats-board-active-label');

            if (icon) {
                icon.className = 'fa-solid fa-chart-simple';
            }
            if (label) {
                label.textContent = 'Statistikk';
            }
        };

        window.updateStatsLagSectionVisibility = function() {
            const activeSection = window.getStatsLagSection();
            const nav = document.getElementById('stats-lag-section-nav');
            const summary = document.getElementById('stats-lag-summary');
            const playerData = document.getElementById('stats-lag-playerdata');
            const view = document.getElementById('stat-view-lag');

            if (nav) nav.innerHTML = window.renderStatsLagSectionNav();
            if (typeof window.updateStatsBoardActiveSection === 'function') window.updateStatsBoardActiveSection();
            if (view) {
                window.statsLagSections.forEach(section => view.classList.remove(`is-section-${section.id}`));
                view.classList.add(`is-section-${activeSection}`);
            }

            if (summary) {
                summary.classList.toggle('hidden', activeSection === 'spillerdata');
                const kampdataPanel = summary.querySelector('[data-stats-panel="kampdata"]');
                const kamputviklingPanel = summary.querySelector('[data-stats-panel="kamputvikling"]');
                const kampstatsPanel = summary.querySelector('[data-stats-panel="kampstats"]');
                const oppmotePanel = summary.querySelector('[data-stats-panel="oppmote"]');
                const oppmoteutviklingPanel = summary.querySelector('[data-stats-panel="oppmoteutvikling"]');
                if (kampdataPanel) kampdataPanel.classList.toggle('hidden', activeSection !== 'kampdata');
                if (kamputviklingPanel) kamputviklingPanel.classList.toggle('hidden', activeSection !== 'kampdata');
                if (kampstatsPanel) kampstatsPanel.classList.toggle('hidden', activeSection !== 'kampdata');
                if (oppmotePanel) oppmotePanel.classList.toggle('hidden', activeSection !== 'treningsdata');
                if (oppmoteutviklingPanel) oppmoteutviklingPanel.classList.toggle('hidden', activeSection !== 'treningsdata');
            }

            if (playerData) playerData.classList.toggle('hidden', activeSection !== 'spillerdata');
        };

        window.setStatsLagSection = function(section) {
            window.statsLagSection = window.statsLagSections.some(item => item.id === section) ? section : 'kampdata';
            if (window.statsLagSection === 'spillerdata') {
                if (window._statsSelectedPlayer && typeof window.renderSpillereDetail === 'function') {
                    window.renderSpillereDetail(window._statsSelectedPlayer);
                } else if (typeof window.renderSpillereView === 'function') {
                    window.renderSpillereView();
                }
            }
            window.updateStatsLagSectionVisibility();
        };

        window.renderStatsLagSummary = function() {
            const container = document.getElementById('stats-lag-summary');
            const navContainer = document.getElementById('stats-lag-section-nav');
            const data = window._statsLagData;
            const report = window._statsTeamReportData;
            if (!container) return;
            if (!data || !report) {
                container.innerHTML = '';
                if (navContainer) navContainer.innerHTML = '';
                return;
            }

            container.innerHTML = window.renderTeamReportStatusHtml(data, report);
            if (typeof window.renderMatchStatsView === 'function') {
                window.renderMatchStatsView();
            }
            if (window.getStatsLagSection() === 'spillerdata') {
                if (window._statsSelectedPlayer && typeof window.renderSpillereDetail === 'function') {
                    window.renderSpillereDetail(window._statsSelectedPlayer);
                } else if (typeof window.renderSpillereView === 'function') {
                    window.renderSpillereView();
                }
            }
            window.updateStatsLagSectionVisibility();
        };

        window.renderStatsSpillereSummary = function() {
            const container = document.getElementById('stats-spillere-summary');
            if (!container) return;
            if (window._statsSelectedPlayer) {
                container.innerHTML = '';
                return;
            }
            const followUps = Array.isArray(window._statsFollowUps)
                ? window._statsFollowUps
                : [];
            const utviklingPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'spillerutvikling',
                title: 'Utvikling',
                showLabel: 'Vis utvikling',
                hideLabel: 'Skjul utvikling',
                content: `
                    <div id="team-score-diagram-wrap" class="team-score-diagram-wrap">
                        ${window.renderTeamScoreDiagramHtml()}
                    </div>
                `
            });
            const oppfolgingPanel = window.renderStatsCollapsiblePanelHtml({
                id: 'oppfolging',
                title: 'Oppfølging',
                badge: followUps.length,
                showLabel: 'Vis oppfølging',
                hideLabel: 'Skjul oppfølging',
                content: window.renderStatsFollowUpsHtml(followUps)
            });
            container.innerHTML = `
                <div class="team-report-status-stack">
                    ${utviklingPanel}
                    ${oppfolgingPanel}
                </div>
            `;
        };

        window.renderStatsKampContext = function() {
            const container = document.getElementById('stats-kamp-context');
            const data = window._statsKampHeroData;
            if (!container) return;
            if (!data) {
                container.innerHTML = '';
                return;
            }

            const { playedMatches, matchId, matchType, matchGroup, dateStr, pitch, matchResult } = data;
            const currentIdx = playedMatches.findIndex(m => m.id === matchId);

            container.innerHTML = `
                <div class="stats-kamp-bar">
                    <div class="stats-kamp-bar-row">
                        <div class="stats-kamp-matchline">
                            <span class="stats-kamp-vs">BSK</span>
                            <span class="stats-kamp-vs-sep">–</span>
                            <span class="stats-kamp-select-wrap stats-hero-select-wrap">
                                <select id="kampstat-match-select" onfocus="expandKampSelectLabels()" onmousedown="expandKampSelectLabels()" onblur="collapseKampSelectLabel()" onchange="showMatchStatsTable()" class="portal-field portal-field-display truncate">
                                    ${playedMatches.map(m => {
                                        const optionDate = m.date ? new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                                        const shortText = m.opponent || 'Motstander';
                                        const fullText = `${m.opponent || 'Motstander'}${optionDate ? ' · ' + optionDate : ''}${m.result ? ' · ' + m.result : ''}`;
                                        return `<option value="${escapeStatsHtml(m.id)}" data-short="${escapeStatsHtml(shortText)}" data-full="${escapeStatsHtml(fullText)}" ${m.id === matchId ? 'selected' : ''}>${escapeStatsHtml(shortText)}</option>`;
                                    }).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down"></i>
                            </span>
                        </div>
                        <span class="stats-kamp-bar-result">${escapeStatsHtml(matchResult)}</span>
                    </div>
                    <div class="stats-kamp-bar-meta">
                        <span>${[matchType, matchGroup, dateStr, pitch].filter(Boolean).map(escapeStatsHtml).join(' · ')}</span>
                        <div class="stats-kamp-nav">
                            <button type="button" data-stat-action="navigate-match" data-direction="-1" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx <= 0 ? 'disabled' : ''} title="Forrige kamp"><i class="fa-solid fa-chevron-left"></i></button>
                            <span>${currentIdx + 1} / ${playedMatches.length}</span>
                            <button type="button" data-stat-action="navigate-match" data-direction="1" class="portal-btn portal-btn-icon-sm portal-btn-secondary" ${currentIdx >= playedMatches.length - 1 ? 'disabled' : ''} title="Neste kamp"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
            `;
            if (typeof window.collapseKampSelectLabel === 'function') window.collapseKampSelectLabel();
        };

        window.renderStatsTabHero = function(tabId) {
            const hero = document.getElementById('stats-tab-hero');
            if (!hero) return;

            const heroTabsHtml = window.renderStatsHeroTabsHtml(tabId);

            if (tabId === 'lag') {
                const data = window._statsLagData;
                if (!data) {
                    window.clearStatsTabHero();
                    const summary = document.getElementById('stats-lag-summary');
                    if (summary) summary.innerHTML = '';
                    const sectionNav = document.getElementById('stats-lag-section-nav');
                    if (sectionNav) sectionNav.innerHTML = '';
                    return;
                }

                window.paintStatsChrome(window.renderStatsChromeTabsOnly(heroTabsHtml));
                window.renderStatsLagSummary();
                return;
            }

            if (tabId === 'spillere') {
                window.paintStatsChrome(window.renderStatsChromeTabsOnly(heroTabsHtml));
                window.renderStatsSpillereSummary();
                return;
            }

            if (tabId === 'kampstat') {
                window.paintStatsChrome(window.renderStatsChromeTabsOnly(window.renderStatsHeroTabsHtml('lag')));
                window.statsLagSection = 'kampdata';
                window.renderStatsLagSummary();
            }
        };

        window.renderSpillerDetailHero = function(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player) {
            const heroTabsHtml = window.renderStatsHeroTabsHtml('spillere');
            const summary = document.getElementById('stats-spillere-summary');
            if (summary) summary.innerHTML = '';

            window.paintStatsChrome(window.renderStatsChromeBar(
                escapeStatisticsHtml(playerName),
                `
                    ${heroTabsHtml}
                    <div class="stats-chrome-badge">
                        <span>Snitt ${avgPoints ? avgPoints.toFixed(1) : '-'}</span>
                        <span class="stats-chrome-badge-sep">·</span>
                        <span>Form ${chemistry}/100</span>
                    </div>
                `,
                `<p class="stats-chrome-subtitle">${escapeStatisticsHtml(player.pos1 || 'Spiller')} · ${escapeStatisticsHtml(player.spillerLag || '')} · ${escapeStatisticsHtml(formComparison)}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}</p>`
            ));
        };

        window.getStatsPlayerSearchTerm = function() {
            const el = document.getElementById('statsPlayerSearchInput');
            return (el ? el.value : '').trim().toLowerCase();
        };

        window.handleStatsPlayerSearchChange = function() {
            if (window._statsSelectedPlayer) return;
            if (window.getStatsLagSection && window.getStatsLagSection() === 'spillerdata') {
                window.renderPlayerStatsList();
            }
        };

        window.renderPlayerStatsList = function() {
            const list = document.getElementById('stats-player-list');
            if (!list) return;

            let statsData = window.buildPlayerStatsData();
            const searchTerm = window.getStatsPlayerSearchTerm();

            if (searchTerm) {
                statsData = statsData.filter(stat => {
                    const player = (window.activePlayers || []).find(p => p.navn === stat.navn);
                    const posStr = player && player.pos2 && player.pos2 !== '-'
                        ? `${player.pos1} / ${player.pos2}`
                        : (stat.pos1 || '');
                    const haystack = [
                        stat.navn,
                        player && player.draktnummer ? String(player.draktnummer) : '',
                        posStr,
                        stat.spillerLag
                    ].join(' ').toLowerCase();
                    return haystack.includes(searchTerm);
                });
            }

            statsData = statsData.filter(stat => window.playerStatsRelevantForSort(stat, currentStatSortCol));

            statsData.sort((a, b) => {
                if (currentStatSortCol === 'navn') {
                    return currentStatSortDesc ? a.navn.localeCompare(b.navn) : b.navn.localeCompare(a.navn);
                }
                return currentStatSortDesc ? b[currentStatSortCol] - a[currentStatSortCol] : a[currentStatSortCol] - b[currentStatSortCol];
            });

            const sortOption = window.getStatsSortOption(currentStatSortCol);
            const sortLabel = sortOption?.label || 'Stat';

            if (!statsData.length) {
                list.innerHTML = `
                    <div class="training-data-rank-block">
                        <h5>${escapeStatisticsHtml(sortLabel)}</h5>
                        <div class="training-data-empty">
                            <p>${escapeStatsHtml(window.getStatsSortEmptyMessage(currentStatSortCol, searchTerm))}</p>
                        </div>
                    </div>
                `;
                return;
            }

            const visibleLimit = 10;
            const isExpanded = window._statsPlayerListExpanded === true;
            const hasOverflow = statsData.length > visibleLimit;

            const rowsHtml = statsData.map((stat, index) => {
                const sortValue = window.formatStatsSortValue(stat, currentStatSortCol);
                const safeNameHtml = escapeStatisticsHtml(stat.navn);
                const playerIdAttr = escapeStatisticsHtml(getStatsPlayerIdForName(stat.navn));

                return `
                    <li class="${index >= visibleLimit ? 'is-overflow' : ''}">
                        <button type="button" class="training-data-rank-row" data-stat-action="open-player" data-player-id="${playerIdAttr}" data-player-name="${safeNameHtml}" aria-label="${safeNameHtml}, plass ${index + 1}, ${escapeStatisticsHtml(sortLabel)} ${escapeStatisticsHtml(sortValue)}">
                            <span class="training-data-rank-index">${index + 1}.</span>
                            <span class="training-data-rank-name">${safeNameHtml}</span>
                            <strong>${escapeStatisticsHtml(sortValue)}</strong>
                        </button>
                    </li>
                `;
            }).join('');

            list.innerHTML = `
                <div class="training-data-rank-block">
                    <h5>${escapeStatisticsHtml(sortLabel)}</h5>
                    <ul class="training-data-rank-list ${isExpanded ? 'is-expanded' : ''}">
                        ${rowsHtml}
                    </ul>
                    ${hasOverflow ? `
                        <button
                            type="button"
                            class="training-data-rank-toggle"
                            data-stat-action="toggle-player-list"
                            aria-expanded="${isExpanded ? 'true' : 'false'}"
                        >
                            ${isExpanded ? 'Vis færre' : `Vis alle (${statsData.length})`}
                        </button>
                    ` : ''}
                </div>
            `;
        };
        
        window.switchStatTab = function(tabId) {
            if (tabId === 'kampstat') {
                tabId = 'lag';
                window.statsLagSection = 'kampdata';
            }
            if (tabId === 'spillere') {
                window.statsLagSection = 'spillerdata';
                window.renderStatistikkSide();
                if (window._statsSelectedPlayer) window.renderSpillereDetail(window._statsSelectedPlayer);
                else window.renderSpillereView();
                window.updateStatsLagSectionVisibility();
                return;
            }
            window.renderStatistikkSide();
        };


        window.statsEmptyStateHtml = function(icon, title, text) {
            return `
                <div class="stats-panel">
                    <div class="stats-empty-state">
                        <i class="fa-solid ${icon}"></i>
                        <h3>${title}</h3>
                        <p>${text}</p>
                    </div>
                </div>
            `;
        };

        window.statsMetricCardHtml = function(label, value, sub, icon, iconClass = 'text-bsk-blue', playerName = '') {
            const playerId = playerName ? escapeStatisticsHtml(getStatsPlayerIdForName(playerName)) : '';
            const clickAttrs = playerName
                ? ` role="button" tabindex="0" data-stat-action="open-player" data-player-id="${playerId}" data-player-name="${escapeStatisticsHtml(playerName)}" class="stats-metric-card stats-metric-card-clickable"`
                : ` class="stats-metric-card"`;

            return `
                <div${clickAttrs}>
                    <div class="stats-metric-card-top">
                        <span class="stats-metric-label">${escapeStatisticsHtml(label)}</span>
                        <div class="stats-metric-icon">
                            <i class="fa-solid ${icon} ${iconClass}"></i>
                        </div>
                    </div>
                    <div class="stats-metric-value">${escapeStatisticsHtml(value || '-')}</div>
                    <div class="stats-metric-sub">${escapeStatisticsHtml(sub || '')}</div>
                </div>
            `;
        };

        window.statsSmallTableHtml = function(title, subtitle, headers, rowsHtml) {
            return `
                <div class="stats-table-panel">
                    <div class="stats-panel-header">
                        <h3 class="stats-panel-title">${title}</h3>
                        <p class="stats-panel-subtitle">${subtitle}</p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="stats-table-head">
                                <tr>${headers}</tr>
                            </thead>
                            <tbody class="stats-table-body divide-y divide-slate-100">
                                ${rowsHtml || `
                                    <tr>
                                        <td colspan="6" class="p-5 text-center text-slate-400 italic text-xs">Ingen data ennå</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };
        
        window.STATS_PLAYER_SORT_OPTIONS = [
            { id: 'totalScore', label: 'Total', icon: 'fa-ranking-star' },
            { id: 'kampbonus', label: 'Kampbidrag', icon: 'fa-chart-line' },
            { id: 'kjemi', label: 'Form', icon: 'fa-heart-pulse' },
            { id: 'snittBors', label: 'Snittbørs', icon: 'fa-star' },
            { id: 'mal', label: 'Mål', icon: 'fa-futbol' },
            { id: 'assist', label: 'Assist', icon: 'fa-handshake-angle' },
            { id: 'guleSerie', label: 'Gule kort', glyph: 'g' },
            { id: 'rodeSerie', label: 'Røde kort', glyph: 'r' },
            { id: 'bb', label: 'Banens beste', icon: 'fa-crown' },
            { id: 'oppmotePct', label: 'Oppmøte', icon: 'fa-user-check' },
            { id: 'kamper', label: 'Kamper', icon: 'fa-shield-halved' }
        ];

        window.getStatsSortOption = function(id) {
            return (window.STATS_PLAYER_SORT_OPTIONS || []).find(opt => opt.id === id);
        };

        window.formatStatsSortValue = function(stat, column) {
            if (!stat) return '-';
            if (column === 'oppmotePct') return `${Number(stat.oppmotePct) || 0}%`;
            if (column === 'totalScore' || column === 'kampbonus' || column === 'snittBors') {
                const value = Number(stat[column]) || 0;
                if (column === 'kampbonus' && !(stat.attendedMatches > 0)) return '-';
                return value > 0 ? value.toFixed(1) : '-';
            }
            if (column === 'kjemi') return String(stat.kjemi || 0);
            const value = stat[column];
            if (value == null || value === '') return '-';
            return String(value);
        };

        window.renderStatsSortIconHtml = function(option, extraClass = '') {
            if (!option) return '';
            const classSuffix = extraClass ? ` ${extraClass}` : '';
            if (option.glyph) {
                return `<i class="stats-sort-glyph stats-sort-glyph-${option.glyph}${classSuffix}" aria-hidden="true"></i>`;
            }
            return `<i class="fa-solid ${option.icon}${classSuffix}" aria-hidden="true"></i>`;
        };

        window.renderStatsMetaPartHtml = function(id, text) {
            const option = window.getStatsSortOption(id);
            const iconHtml = window.renderStatsSortIconHtml(option, 'stats-meta-icon');
            const activeClass = id === currentStatSortCol ? ' is-sort-active' : '';
            return `<span class="stats-meta-part${activeClass}" data-stat-meta="${id}">${iconHtml}<span class="stats-meta-text">${escapeStatisticsHtml(text)}</span></span>`;
        };

        window.renderStatsSortButtonsHtml = function(activeCol) {
            return window.STATS_PLAYER_SORT_OPTIONS.map(opt => `
                <button
                    type="button"
                    data-stat-action="sort"
                    class="bsk-btn bsk-btn-chip roster-status-btn stats-sort-btn ${activeCol === opt.id ? 'is-active' : ''}"
                    data-sort-col="${opt.id}"
                    aria-label="${opt.label}"
                    title="${opt.label}"
                >
                    ${opt.glyph
                        ? `<i class="stats-sort-glyph stats-sort-glyph-${opt.glyph}" aria-hidden="true"></i>`
                        : `<i class="fa-solid ${opt.icon} ${opt.iconClass || ''}" aria-hidden="true"></i>`
                    }
                    <span class="stats-sort-label">${opt.label}</span>
                </button>
            `).join('');
        };

        window.updateStatsSortButtons = function() {
            document.querySelectorAll('.stats-sort-btn[data-sort-col]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.sortCol === currentStatSortCol);
            });
        };

        window.openStatsFormInfoModal = function() {
            const modal = document.getElementById('kjemi-info-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        window.renderSpillereView = function() {
            window._statsSelectedPlayer = null;
            const container = document.getElementById('stat-spillere-content');
            if (!container) return;

            window.statsLagSection = 'spillerdata';
            window.renderStatsTabHero('spillere');
            const searchValue = window.getStatsPlayerSearchTerm();

            container.innerHTML = window.renderStatsCollapsiblePanelHtml({
                id: 'spillerliste',
                title: 'Spillerstats',
                showLabel: 'Vis spillerstats',
                hideLabel: 'Skjul spillerstats',
                content: `
                    <div class="stats-spillere-layout">
                        <div class="stats-player-search-row">
                            <div class="roster-search-wrap">
                                <i class="fa-solid fa-magnifying-glass"></i>
                                <input type="search" id="statsPlayerSearchInput" oninput="handleStatsPlayerSearchChange()" placeholder="Søk etter navn, drakt eller posisjon..." class="roster-search-input" aria-label="Søk spillere">
                            </div>
                        </div>
                        <div id="stats-player-list" class="stats-player-list"></div>
                        <div class="stats-player-sort-dock" aria-label="Sorter spillere" data-no-swipe>
                            <div class="stats-player-toolbar">
                                <div class="stats-sort-scroller-wrap">
                                    <div class="stats-sort-scroller" id="stats-player-sort-scroller" data-no-swipe>
                                        <div class="roster-status-filter stats-sort-filter" role="tablist" aria-label="Sorter spillere">
                                            ${window.renderStatsSortButtonsHtml(currentStatSortCol)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            });

            const searchInput = document.getElementById('statsPlayerSearchInput');
            if (searchInput && searchValue) searchInput.value = searchValue;

            window.renderPlayerStatsList();
        };


        window.openSpillerDetail = function(playerName) {
            if (!playerName) return;
            window._statsSelectedPlayer = playerName;
            window.statsLagSection = 'spillerdata';
            if (typeof window.updateStatsLagSectionVisibility === 'function') window.updateStatsLagSectionVisibility();
            window.renderSpillereDetail(playerName);
        };

        window.showSpillereOverview = function() {
            window.renderSpillereView();
        };

        window.renderSpillereDetail = function(playerName) {
            const container = document.getElementById('stat-spillere-content');
            if (!container || !playerName) return;
            window.statsLagSection = 'spillerdata';
            if (typeof window.updateStatsLagSectionVisibility === 'function') window.updateStatsLagSectionVisibility();

            const player = (window.activePlayers || []).find(p => p.navn === playerName);
            const history = typeof window.getPlayerMatchPointsHistory === 'function'
                ? window.getPlayerMatchPointsHistory(playerName)
                : [];

            if (!player || history.length === 0) {
                if (player && typeof window.renderSpillerDetailHero === 'function') {
                    window.renderSpillerDetailHero(playerName, 0, 0, 0, 'Ingen sammenligning', 0, player);
                }
                container.innerHTML = `
                    <div class="stats-player-detail">
                        <button type="button" data-stat-action="back-overview" class="stats-player-back-btn portal-btn portal-btn-secondary portal-btn-sm is-collapsible" title="Tilbake til oversikt" aria-label="Tilbake til oversikt">
                            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                            <span class="portal-btn-label">Tilbake til oversikt</span>
                        </button>
                        ${window.statsEmptyStateHtml(
                            'fa-circle-info',
                            'Ingen spilte kamper',
                            'Ingen spilte kamper er registrert for denne spilleren ennå.'
                        )}
                    </div>
                `;
                return;
            }

            const chemistry = typeof window.calculatePlayerPerformanceChemistry === 'function'
                ? window.calculatePlayerPerformanceChemistry(playerName)
                : 0;
            const teamMedian = typeof window.getTeamFormMedian === 'function'
                ? window.getTeamFormMedian(player.spillerLag)
                : 0;
            const formComparison = teamMedian > 0
                ? (chemistry >= teamMedian + 8 ? 'Over lagssnitt' : chemistry < teamMedian - 8 ? 'Under lagssnitt' : 'Om lagssnitt')
                : 'Ingen sammenligning';

            const totalMatches = history.length;
            const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
            const avgPoints = totalMatches ? totalPoints / totalMatches : 0;
            const playerStatsData = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData()
                : [];
            const playerTotalStat = playerStatsData.find(stat => stat.navn === playerName);
            const totalRank = playerTotalStat
                ? [...playerStatsData]
                    .filter(stat => window.playerStatsRelevantForSort(stat, 'totalScore'))
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .findIndex(stat => stat.navn === playerName) + 1
                : 0;
            const totalScoreText = playerTotalStat && playerTotalStat.totalScore > 0
                ? playerTotalStat.totalScore.toFixed(1)
                : '-';

            window.renderSpillerDetailHero(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player);

            const card = window.statsMetricCardHtml;
            const trendData = typeof window.getPlayerPerformanceTrend === 'function'
                ? window.getPlayerPerformanceTrend(playerName)
                : [];
            const matchHistoryHtml = typeof window.renderPlayerFormHistoryTableHtml === 'function'
                ? window.renderPlayerFormHistoryTableHtml(playerName, history)
                : '';

            container.innerHTML = `
                <div class="stats-player-detail">
                    <button type="button" data-stat-action="back-overview" class="stats-player-back-btn portal-btn portal-btn-secondary portal-btn-sm is-collapsible" title="Tilbake til oversikt" aria-label="Tilbake til oversikt">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                        <span class="portal-btn-label">Tilbake til oversikt</span>
                    </button>

                    <div class="stats-metric-grid is-four">
                        ${card('Form', chemistry + '/100', 'Kampbidrag, oppmøte og nylig disiplin', 'fa-heart-pulse', 'text-emerald-600')}
                        ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
                        ${card('Total plassering', totalRank > 0 ? `#${totalRank}` : '-', 'Rangert etter total score', 'fa-ranking-star', 'text-bsk-blue')}
                        ${card('Total score', totalScoreText, '50% kampbidrag · 25% børs · 15% oppmøte · 10% disiplin', 'fa-gauge-high', 'text-bsk-blue')}
                    </div>

                    <div class="stats-panel stats-player-chart-panel">
                        <div class="stats-panel-header">
                            <div class="stats-player-panel-heading">
                                <div class="min-w-0">
                                    <h3 class="stats-panel-title">Utvikling</h3>
                                    <p class="stats-panel-subtitle">Kampbidrag vs lagets snitt per kamp. Nyeste kamp til høyre.</p>
                                </div>
                                <button type="button" data-stat-action="open-form-info" class="portal-btn portal-btn-success portal-btn-sm shrink-0">
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span class="hidden sm:inline">Slik regnes form</span>
                                </button>
                            </div>
                        </div>
                        <div class="stats-player-chart-wrap">
                            ${window.renderPlayerTrendChartSvg(trendData)}
                        </div>
                        <div class="stats-chart-legend" aria-hidden="true">
                            <span class="stats-chart-legend-item is-kampbidrag"><i></i> Spiller poeng</span>
                            <span class="stats-chart-legend-item is-team-kampbidrag"><i></i> Lag snitt</span>
                        </div>
                    </div>

                    <div class="stats-panel stats-form-history-panel">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Kamper — kamp for kamp</h3>
                        </div>
                        <div class="stats-form-history-table-wrap">${matchHistoryHtml}</div>
                    </div>
                </div>
            `;
        };

        window.showPlayerPointsTable = function() {
            const select = document.getElementById('poeng-player-select');
            const playerName = select ? select.value : window._statsSelectedPlayer;
            if (playerName) window.openSpillerDetail(playerName);
        };

        window.renderPointHistoryView = function() {
            window.renderSpillereView();
        };

        window.getFilteredPlayedMatches = function() {
            const filterLag = window.getStatsTeamFilter();
            return (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                    if (typeof window.matchBelongsToStatsKampYear === 'function' && !window.matchBelongsToStatsKampYear(m)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        };

        window.navigateKampstatMatch = function(direction) {
            const playedMatches = window.getFilteredPlayedMatches();
            const matchSelect = document.getElementById('kampstat-match-select');
            const currentId = window.pendingKampstatMatchId || (matchSelect ? matchSelect.value : '');
            const idx = playedMatches.findIndex(m => m.id === currentId);
            if (idx === -1) return;
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= playedMatches.length) return;
            window.pendingKampstatMatchId = playedMatches[nextIdx].id;
            window.showMatchStatsTable();
        };

        window.renderMatchStatsView = function() {
            const container = document.getElementById('stats-lag-kampdata-detail');
            if (!container) return;

            const playedMatches = window.getFilteredPlayedMatches();
            const emptyText = playedMatches.length
                ? 'Laster siste spilte kamp...'
                : 'Ingen spilte kamper med resultat er registrert ennå.';

            container.innerHTML = `
                <div class="stats-kampdata-match">
                    <div id="stats-kamp-context"></div>
                    <div id="kampstat-table-container">
                        <div class="stats-empty-state">
                            <p>${emptyText}</p>
                        </div>
                    </div>
                </div>
            `;

            if (playedMatches.length > 0 && typeof window.showMatchStatsTable === 'function') {
                window.showMatchStatsTable();
            } else {
                window._statsKampHeroData = null;
                window.renderStatsKampContext();
            }
        };

        window.expandKampSelectLabels = function() {
            const select = document.getElementById('kampstat-match-select');
            if (!select) return;
        
            Array.from(select.options).forEach(option => {
                if (option.dataset.full) {
                    option.textContent = option.dataset.full;
                }
            });
        };
        
        window.collapseKampSelectLabel = function() {
            const select = document.getElementById('kampstat-match-select');
            if (!select) return;
        
            Array.from(select.options).forEach(option => {
                if (option.dataset.short) {
                    option.textContent = option.dataset.short;
                }
            });
        };

        window.showMatchStatsTable = function() {
            const matchSelect = document.getElementById('kampstat-match-select');
            const playedMatches = window.getFilteredPlayedMatches();
            const pendingMatchId = window.pendingKampstatMatchId;
            window.pendingKampstatMatchId = null;

            const matchId = pendingMatchId && playedMatches.some(m => m.id === pendingMatchId)
                ? pendingMatchId
                : (matchSelect && matchSelect.value
                    ? matchSelect.value
                    : (playedMatches[0] ? playedMatches[0].id : ''));

            const container = document.getElementById('kampstat-table-container');
            if (!container) return;

            const emptyState = (text) => `
                <div class="stats-empty-state">
                    <i class="fa-solid fa-futbol" aria-hidden="true"></i>
                    <p>${text}</p>
                </div>
            `;

            if (!matchId) {
                window._statsKampHeroData = null;
                window.renderStatsKampContext();
                container.innerHTML = emptyState('Velg en kamp for å se statistikk for spillerne som deltok.');
                return;
            }

            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) {
                container.innerHTML = emptyState('Fant ikke valgt kamp.');
                return;
            }

            const dateStr = match.date
                ? new Date(match.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';
            const matchResult = match.result || '?';
            const matchType = match.type || match.matchType || 'Kamp';
            const matchGroup = match.matchGroup || match.team || '';
            const pitch = match.pitch || match.bane || '';

            window._statsKampHeroData = {
                playedMatches,
                matchId,
                matchType,
                matchGroup,
                dateStr,
                pitch,
                matchResult
            };
            window.renderStatsKampContext();

            const participantRefs = typeof window.getMatchParticipantRefs === 'function'
                ? window.getMatchParticipantRefs(match)
                : window.getAttendingPlayerRefs(match.attendance);

            if (participantRefs.length === 0) {
                container.innerHTML = emptyState('Ingen spillere var registrert med oppmøte på denne kampen.');
                return;
            }

            const sortedPlayers = [...(window.activePlayers || [])]
                .filter(p => participantRefs.some(ref => window.playerRefMatches(ref, p)));

            const fallbackPlayers = participantRefs
                .filter(ref => !sortedPlayers.some(p => window.playerRefMatches(ref, p)))
                .map(ref => window.findPlayerByRef(ref) || { id: ref, navn: window.getPlayerNameFromRef(ref) });

            const playersToRender = [...sortedPlayers, ...fallbackPlayers];

            const stats = playersToRender.map(playerObj => {
                const playerRef = playerObj.id || playerObj.navn;
                const rating = Number(window.getPlayerRefMapValue(match.ratings, playerObj, 0)) || 0;
                const goals = Number(window.getPlayerRefMapValue(match.scorers, playerObj, 0)) || 0;
                const assists = Number(window.getPlayerRefMapValue(match.assists, playerObj, 0)) || 0;
                const yellow = window.playerRefListIncludes(match.guleKort, playerObj) ? 1 : 0;
                const red = window.playerRefListIncludes(match.rodeKort, playerObj) ? 1 : 0;
                const isBbInMatch = window.motmMatchesPlayer(match.motm, playerObj);
                const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
                    ? window.calculatePlayerMatchPoints(match, playerObj, true)
                    : { total: 0, base: 0, resultBonus: 0, ratingBonus: 0, bbBonus: 0, onPitch: true };

                return {
                    id: playerObj.id || '',
                    name: playerObj.navn || window.getPlayerNameFromRef(playerRef),
                    rating,
                    goals,
                    assists,
                    yellow,
                    red,
                    isBbInMatch,
                    onPitch: pointsDetails.onPitch !== false,
                    points: pointsDetails.total || 0,
                    base: pointsDetails.base || 0,
                    resultBonus: pointsDetails.resultBonus || 0,
                    ratingBonus: pointsDetails.ratingBonus || 0,
                    bbBonus: pointsDetails.bbBonus || 0,
                    breakdown: `${pointsDetails.onPitch === false ? 'Benk' : 'Spilt'}: ${pointsDetails.base || 0} | Res/Mål: ${(pointsDetails.resultBonus || 0) > 0 ? '+' + pointsDetails.resultBonus : (pointsDetails.resultBonus || 0)} | Børs: ${(pointsDetails.ratingBonus || 0) > 0 ? '+' + pointsDetails.ratingBonus : (pointsDetails.ratingBonus || 0)} | BB: ${(pointsDetails.bbBonus || 0) > 0 ? '+' + pointsDetails.bbBonus : '-'}`
                };
            });

            stats.sort((a, b) => b.points - a.points || b.rating - a.rating || b.goals - a.goals || b.assists - a.assists);

            const ratedStats = stats.filter(s => s.rating > 0);
            const avgRating = ratedStats.length
                ? ratedStats.reduce((sum, s) => sum + s.rating, 0) / ratedStats.length
                : 0;
            const totalGoals = stats.reduce((sum, s) => sum + s.goals, 0);
            const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
            const totalYellow = stats.reduce((sum, s) => sum + s.yellow, 0);
            const totalRed = stats.reduce((sum, s) => sum + s.red, 0);
            const bbPlayer = stats.find(s => s.isBbInMatch);
            const topScorer = [...stats].sort((a, b) => b.goals - a.goals)[0];
            const assistLeader = [...stats].sort((a, b) => b.assists - a.assists)[0];
            const pointsLeader = stats[0];

            const metaPart = (id, text) => {
                const option = window.getStatsSortOption ? window.getStatsSortOption(id) : null;
                const iconHtml = window.renderStatsSortIconHtml ? window.renderStatsSortIconHtml(option, 'stats-meta-icon') : '';
                return `<span class="stats-meta-part">${iconHtml}<span class="stats-meta-text">${escapeStatisticsHtml(text)}</span></span>`;
            };

            const highlightRow = (icon, label, valueHtml, playerName = '') => {
                const inner = `
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                    <span class="stats-kampdata-highlight-label">${label}</span>
                    <strong class="stats-kampdata-highlight-value">${valueHtml}</strong>
                `;
                if (!playerName) {
                    return `<div class="stats-kampdata-highlight">${inner}</div>`;
                }
                const playerId = escapeStatisticsHtml(getStatsPlayerIdForName(playerName) || '');
                return `
                    <button type="button" class="stats-kampdata-highlight" data-stat-action="open-player" data-player-id="${playerId}" data-player-name="${escapeStatisticsHtml(playerName)}">
                        ${inner}
                    </button>
                `;
            };

            const rowsHtml = stats.map(s => {
                const pointsClass = window.getPlayerPointsToneClass ? window.getPlayerPointsToneClass(s.points) : 'is-neutral';
                const playerId = escapeStatisticsHtml(s.id || getStatsPlayerIdForName(s.name) || '');
                const safeName = escapeStatisticsHtml(s.name);
                const ratingText = s.rating > 0 ? String(s.rating) : '–';
                const ratingClass = s.rating >= 8 ? 'is-high' : s.rating >= 6 ? 'is-mid' : s.rating > 0 ? 'is-low' : 'is-neutral';
                const metaParts = [];

                if (s.onPitch === false) metaParts.push('<span class="stats-meta-pos">Benk</span>');
                if (s.goals > 0) metaParts.push(metaPart('mal', String(s.goals)));
                if (s.assists > 0) metaParts.push(metaPart('assist', String(s.assists)));
                if (s.isBbInMatch) metaParts.push(metaPart('bb', 'BB'));
                if (s.yellow > 0) metaParts.push(metaPart('guleSerie', String(s.yellow)));
                if (s.red > 0) metaParts.push(metaPart('rodeSerie', String(s.red)));
                if (!metaParts.length) metaParts.push('<span class="stats-meta-pos">Ingen registrerte hendelser</span>');

                const kampbidragIcon = window.renderStatsSortIconHtml
                    ? window.renderStatsSortIconHtml(window.getStatsSortOption('kampbonus'), 'stats-kb-icon')
                    : '';

                return `
                    <button
                        type="button"
                        class="roster-player-row stats-player-row stats-kampdata-player-row${s.onPitch === false ? ' is-bench' : ''}${s.isBbInMatch ? ' is-bb' : ''}"
                        data-stat-action="open-player"
                        data-player-id="${playerId}"
                        data-player-name="${safeName}"
                        title="${escapeStatisticsHtml(s.breakdown)}"
                        aria-label="${safeName}, ${s.points} poeng${s.rating > 0 ? ', børs ' + s.rating : ''}"
                    >
                        <div class="stats-form-jersey ${ratingClass}" aria-hidden="true">
                            <span class="stats-form-jersey-value">${ratingText}</span>
                            <span class="stats-form-jersey-label">Børs</span>
                        </div>
                        <div class="roster-player-main">
                            <div class="roster-player-name">${safeName}${s.isBbInMatch ? ' <span class="stats-player-star">★</span>' : ''}</div>
                            <div class="roster-player-meta">${metaParts.join('<span class="roster-player-meta-sep">·</span>')}</div>
                        </div>
                        <div class="roster-player-side">
                            <span class="stats-kb-badge ${pointsClass}" title="Kamppoeng">${kampbidragIcon}<span>${s.points}</span></span>
                        </div>
                    </button>
                `;
            }).join('');

            const topScorerHtml = topScorer && topScorer.goals > 0
                ? highlightRow('fa-futbol', 'Toppscorer', `${escapeStatisticsHtml(topScorer.name)} · ${topScorer.goals} mål`, topScorer.name)
                : highlightRow('fa-futbol', 'Toppscorer', '–');
            const assistHtml = assistLeader && assistLeader.assists > 0
                ? highlightRow('fa-handshake-angle', 'Assist', `${escapeStatisticsHtml(assistLeader.name)} · ${assistLeader.assists} assist`, assistLeader.name)
                : highlightRow('fa-handshake-angle', 'Assist', '–');
            const bbHtml = bbPlayer
                ? highlightRow('fa-crown', 'Banens beste', escapeStatisticsHtml(bbPlayer.name), bbPlayer.name)
                : highlightRow('fa-crown', 'Banens beste', '–');
            const pointsHtml = pointsLeader
                ? highlightRow('fa-chart-line', 'Mest poeng', `${escapeStatisticsHtml(pointsLeader.name)} · ${pointsLeader.points} p`, pointsLeader.name)
                : highlightRow('fa-chart-line', 'Mest poeng', '–');

            container.innerHTML = `
                <div class="stats-kampdata-layout">
                    <section class="stats-table-panel stats-kampdata-players">
                        <div class="stats-panel-header">
                            <div class="stats-kampdata-header">
                                <div class="min-w-0">
                                    <h3 class="stats-panel-title">Spillere i kampen</h3>
                                    <p class="stats-panel-subtitle">Poeng og hendelser for de som var registrert med oppmøte.</p>
                                </div>
                                <div class="stats-kampdata-panel-actions">
                                    <button type="button" data-stat-action="open-form-info" class="portal-btn portal-btn-icon-sm portal-btn-secondary" title="Slik regnes form" aria-label="Slik regnes form">
                                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                                    </button>
                                    <button type="button" data-stat-action="edit-match" data-match-id="${escapeStatisticsHtml(match.id)}" title="Rediger mål, assist, kort og spillerbørs" aria-label="Rediger kampdata" class="portal-btn portal-btn-icon-sm portal-btn-warning">
                                        <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="stats-kampdata-player-list">
                            ${rowsHtml}
                        </div>
                    </section>

                    <aside class="stats-panel stats-kampdata-summary">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Kampoppsummering</h3>
                            <p class="stats-panel-subtitle">Kort bilde av kampen basert på registrerte data.</p>
                        </div>
                        <div class="stats-kampdata-summary-body">
                            <div class="stats-mini-grid">
                                <div class="stats-mini-card">
                                    <p class="stats-mini-label">Snittbørs</p>
                                    <p class="stats-mini-value">${avgRating ? avgRating.toFixed(1) : '–'}</p>
                                </div>
                                <div class="stats-mini-card">
                                    <p class="stats-mini-label">Mål</p>
                                    <p class="stats-mini-value is-win">${totalGoals}</p>
                                </div>
                                <div class="stats-mini-card">
                                    <p class="stats-mini-label">Assist</p>
                                    <p class="stats-mini-value is-goals">${totalAssists}</p>
                                </div>
                                <div class="stats-mini-card">
                                    <p class="stats-mini-label">Gule kort</p>
                                    <p class="stats-mini-value is-draw">${totalYellow}</p>
                                </div>
                                <div class="stats-mini-card">
                                    <p class="stats-mini-label">Røde kort</p>
                                    <p class="stats-mini-value is-loss">${totalRed}</p>
                                </div>
                            </div>
                            <div class="stats-kampdata-highlights">
                                ${bbHtml}
                                ${topScorerHtml}
                                ${assistHtml}
                                ${pointsHtml}
                            </div>
                            <div class="stats-kampdata-notes">
                                <p class="stats-mini-label">Trenernotater</p>
                                ${typeof window.buildMatchCoachNotesFieldsHtml === 'function' ? window.buildMatchCoachNotesFieldsHtml(match) : ''}
                            </div>
                            <button type="button" data-stat-action="open-tactical" data-match-id="${escapeStatisticsHtml(match.id)}" class="portal-btn portal-btn-primary portal-btn-lg portal-btn-full">
                                <i class="fa-solid fa-chess-board" aria-hidden="true"></i>
                                Gå til kampplan
                            </button>
                        </div>
                    </aside>
                </div>
            `;
        };

        window.openTacticalPlanForMatch = function(matchId) {
            switchTab('taktikk');
        
            setTimeout(() => {
                const select = document.getElementById('tacticalMatchSelect');
        
                if (select) {
                    select.value = matchId;
        
                    if (typeof window.loadMatchTactics === 'function') {
                        window.loadMatchTactics();
                    } else if (typeof loadMatchTactics === 'function') {
                        loadMatchTactics();
                    }
                }
            }, 100);
        };

        window.openMatchStatsEditor = function(matchId) {
            if (typeof window.showMatchDetails === 'function') {
                window.showMatchDetails(matchId);
        
                setTimeout(() => {
                    const section = document.getElementById('kampdetaljer-spillerbors');
        
                    if (section) {
                        section.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 150);
            }
        };

        window.sortStatsTable = function(column) {
            if (currentStatSortCol === column) currentStatSortDesc = !currentStatSortDesc;
            else { currentStatSortCol = column; currentStatSortDesc = true; }

            window.updateStatsSortButtons();
            window.renderPlayerStatsList();

            if (window.getStatsLagSection && window.getStatsLagSection() === 'spillerdata' && typeof window.renderStatsSpillereSummary === 'function') {
                window.renderStatsSpillereSummary();
            }
        };

        
        window.renderPlayerStatsTable = function() {
            window.renderPlayerStatsList();
        };


window.getPlayerMatchPointsHistory = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];
    
    const history = [];
    
    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== playerObj.spillerLag || !window.isPlayerAttending(m.attendance, playerObj)) return;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return;

        const ptsDetails = window.calculatePlayerMatchPoints(m, playerObj, true);
        const goals = Number(window.getPlayerRefMapValue(m.scorers, playerObj, 0)) || 0;
        const assists = Number(window.getPlayerRefMapValue(m.assists, playerObj, 0)) || 0;
        const yellow = window.playerRefListIncludes(m.guleKort, playerObj);
        const red = window.playerRefListIncludes(m.rodeKort, playerObj);
        const bb = window.motmMatchesPlayer(m.motm, playerObj);

        history.push({
            matchId: m.id,
            date: m.date,
            opponent: m.opponent,
            matchType: m.matchType || 'Kamp',
            result: m.result || 'Ikke spilt',
            rating: window.getPlayerRefMapValue(m.ratings, playerObj, '-') || '-',
            points: ptsDetails.total,
            onPitch: ptsDetails.onPitch !== false,
            goals,
            assists,
            yellow,
            red,
            bb,
            breakdownDetails: {
                base: ptsDetails.base,
                resultBonus: ptsDetails.resultBonus,
                ratingBonus: ptsDetails.ratingBonus,
                bbBonus: ptsDetails.bbBonus,
                onPitch: ptsDetails.onPitch !== false
            },
            breakdown: `${ptsDetails.onPitch === false ? 'Benk' : 'Spilt'}: ${ptsDetails.base} | Res/Mål: ${ptsDetails.resultBonus > 0 ? '+' + ptsDetails.resultBonus : ptsDetails.resultBonus} | Børs: ${ptsDetails.ratingBonus > 0 ? '+' + ptsDetails.ratingBonus : ptsDetails.ratingBonus}`
        });
    });
    
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};

window.getPlayerPerformanceTrend = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];

    const history = window.getPlayerMatchPointsHistory(playerName);
    if (!history.length) return [];

    const teamName = playerObj.spillerLag;

    return [...history]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => {
            const match = (window.activeMatches || []).find(m => m.id === entry.matchId);
            return {
                matchId: entry.matchId,
                date: entry.date,
                opponent: entry.opponent,
                kampbidrag: entry.points,
                teamKampbidrag: match && typeof window.getTeamMatchAveragePoints === 'function'
                    ? window.getTeamMatchAveragePoints(match, teamName)
                    : null
            };
        });
};

window.formatPointDelta = function(value) {
    const num = Number(value) || 0;
    if (num === 0) return '0';
    return num > 0 ? `+${num}` : String(num);
};

window.getPlayerPointsToneClass = function(points) {
    if (points >= 25) return 'is-high';
    if (points >= 18) return 'is-mid';
    if (points < 10) return 'is-low';
    return 'is-neutral';
};

window.renderPlayerPointBreakdownHtml = function(details) {
    if (!details) return '';

    const items = [
        { label: 'Grunnpoeng', value: details.base, tone: 'neutral' },
        { label: 'Resultat / mål', value: details.resultBonus, tone: details.resultBonus >= 0 ? 'positive' : 'negative' },
        { label: 'Spillerbørs', value: details.ratingBonus, tone: details.ratingBonus >= 0 ? 'positive' : 'negative' },
        { label: 'Banens beste', value: details.bbBonus, tone: details.bbBonus > 0 ? 'accent' : 'neutral' }
    ];

    return `
        <div class="stats-point-breakdown-grid">
            ${items.map(item => `
                <div class="stats-point-chip is-${item.tone}">
                    <span class="stats-point-chip-label">${item.label}</span>
                    <span class="stats-point-chip-value">${window.formatPointDelta(item.value)}</span>
                </div>
            `).join('')}
            <div class="stats-point-chip is-total">
                <span class="stats-point-chip-label">Totalt</span>
                <span class="stats-point-chip-value">${details.base + details.resultBonus + details.ratingBonus + details.bbBonus}</span>
            </div>
        </div>
        ${details.onPitch === false ? '<p class="stats-match-history-note">Spilleren satt på benken og fikk kun oppmøtepoeng — ikke kampbidrag.</p>' : ''}
    `;
};

window.formatStatsShortDate = function(dateValue) {
    if (!dateValue) return '–';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '–';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

window.formatStatsMatchResult = function(result) {
    if (!result || result === 'Ikke spilt' || !String(result).includes('-')) {
        return '(ikke spilt)';
    }
    return String(result).replace(/\s*-\s*/, '–');
};

window.formatStatsOpponentLabel = function(entry) {
    let label = entry.opponent || 'Motstander';
    if (entry.matchType === 'Cup') label += ' (cup)';
    const notPlayed = !entry.result || entry.result === 'Ikke spilt' || !String(entry.result).includes('-');
    if (notPlayed) label += '*';
    return label;
};

window.renderPlayerFormHistoryTableHtml = function(playerName, history) {
    if (!history.length) {
        return `<div class="stats-form-history-empty">Ingen kamper registrert.</div>`;
    }

    const rows = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    const bodyRows = rows.map(entry => {
        const pointsClass = window.getPlayerPointsToneClass(entry.points);
        const ratingText = entry.rating && entry.rating !== '-' ? entry.rating : '–';
        const safeMatchId = escapeStatisticsHtml(entry.matchId);

        return `
            <tr class="stats-form-history-row">
                <td class="stats-form-history-date">${window.formatStatsShortDate(entry.date)}</td>
                <td class="stats-form-history-opponent">${escapeStatisticsHtml(window.formatStatsOpponentLabel(entry))}</td>
                <td class="stats-form-history-result">${escapeStatisticsHtml(window.formatStatsMatchResult(entry.result))}</td>
                <td class="stats-form-history-points ${pointsClass}">${entry.points}</td>
                <td class="stats-form-history-rating">${ratingText}</td>
                <td class="stats-form-history-action">
                    <button type="button" data-stat-action="edit-match" data-match-id="${safeMatchId}" title="Rediger kamp" class="portal-btn portal-btn-icon-sm portal-btn-warning">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="stats-form-history-table">
            <thead>
                <tr>
                    <th>Dato</th>
                    <th>Motstander</th>
                    <th>Resultat</th>
                    <th>Kampoeng</th>
                    <th>Børs</th>
                    <th class="stats-form-history-action-head" aria-label="Rediger"></th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
};

window.renderPlayerTrendChartSvg = function(trendData) {
    if (!Array.isArray(trendData) || trendData.length < 2) {
        return `
            <div class="stats-chart-empty">
                <i class="fa-solid fa-chart-line"></i>
                <p>Trenger minst 2 kamper for å vise utviklingsdiagram.</p>
            </div>
        `;
    }

    const data = trendData.slice(-12);
    const width = 360;
    const height = 188;
    const pad = { top: 18, right: 34, bottom: 36, left: 34 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const pointValues = data.flatMap(entry => [
        entry.kampbidrag,
        entry.teamKampbidrag
    ].filter(value => value !== null && value !== undefined));
    const maxPoints = Math.max(35, ...pointValues) * 1.08;
    const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;
    const toX = (index) => pad.left + (index * xStep);
    const toYPoints = (value) => pad.top + plotH - ((value / maxPoints) * plotH);

    const gridLines = [0.25, 0.5, 0.75].map(ratio => {
        const y = pad.top + plotH * (1 - ratio);
        return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="stats-chart-grid-line" />`;
    }).join('');

    const buildLinePoints = (values, toY) => values
        .map((value, index) => (value === null || value === undefined ? null : `${toX(index)},${toY(value)}`))
        .filter(Boolean)
        .join(' ');

    const kampbidragPoints = buildLinePoints(data.map(entry => entry.kampbidrag), toYPoints);
    const teamKampbidragPoints = buildLinePoints(data.map(entry => entry.teamKampbidrag), toYPoints);

    const labels = data.map((entry, index) => {
        const label = entry.date
            ? new Date(entry.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
            : String(index + 1);
        return `<text x="${toX(index)}" y="${height - 10}" class="stats-chart-axis-label" text-anchor="middle">${label}</text>`;
    }).join('');

    const markers = data.map((entry, index) => {
        const teamPointsText = entry.teamKampbidrag !== null && entry.teamKampbidrag !== undefined
            ? `, lag snitt ${entry.teamKampbidrag}`
            : '';
        const title = `${entry.opponent || 'Kamp'}: spiller ${entry.kampbidrag} poeng${teamPointsText}`;
        return `
            <g class="stats-chart-marker-group">
                <title>${title}</title>
                <circle cx="${toX(index)}" cy="${toYPoints(entry.kampbidrag)}" r="4.5" class="stats-chart-marker is-kampbidrag" />
            </g>
        `;
    }).join('');

    const teamLine = teamKampbidragPoints
        ? `<polyline points="${teamKampbidragPoints}" class="stats-chart-line is-team-kampbidrag" fill="none" />`
        : '';

    return `
        <svg class="stats-player-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Diagram over kampbidrag mot lagets snitt">
            ${gridLines}
            <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${width - pad.right}" y2="${pad.top + plotH}" class="stats-chart-axis" />
            <text x="8" y="${pad.top + 4}" class="stats-chart-axis-caption">Poeng</text>
            ${teamLine}
            <polyline points="${kampbidragPoints}" class="stats-chart-line is-kampbidrag" fill="none" />
            ${markers}
            ${labels}
        </svg>
    `;
};
