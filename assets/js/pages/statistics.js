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
    if (playerId && typeof window.showPlayerProfile === 'function') {
        window.showPlayerProfile(playerId);
        return;
    }

    const playerName = actionEl.dataset.playerName;
    if (playerName) {
        const player = (window.activePlayers || []).find(p => p.navn === playerName);
        if (player?.id && typeof window.showPlayerProfile === 'function') {
            window.showPlayerProfile(player.id);
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
        if (!actionEl || actionEl.disabled) {
            if (!event.target.closest('[data-stats-filter-menu]') && typeof window.closeStatsFilterMenus === 'function') {
                window.closeStatsFilterMenus();
            }
            return;
        }

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
        if (action === 'toggle-player-list' || action === 'toggle-attendance-list') {
            const block = actionEl.closest('.training-data-rank-block');
            const rankList = block?.querySelector('.training-data-rank-list');
            if (!rankList) return;
            const expanded = !rankList.classList.contains('is-expanded');
            rankList.classList.toggle('is-expanded', expanded);
            const stateKey = action === 'toggle-attendance-list'
                ? '_statsOppmoteListExpanded'
                : '_statsPlayerListExpanded';
            window[stateKey] = expanded;
            actionEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const total = rankList.querySelectorAll('li').length;
            actionEl.textContent = expanded ? 'Vis færre' : `Vis alle (${total})`;
            return;
        }
        if (action === 'open-form-info') {
            if (typeof window.openStatsFormInfoModal === 'function') window.openStatsFormInfoModal();
            return;
        }
        if (action === 'open-total-score-info') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.openTotalScoreInfoModal === 'function') window.openTotalScoreInfoModal(actionEl);
            return;
        }
        if (action === 'open-kampbidrag-info') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.openKampbidragInfoModal === 'function') window.openKampbidragInfoModal(actionEl);
            return;
        }
        if (action === 'toggle-diagram-info') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.toggleStatsDiagramInfo === 'function') {
                window.toggleStatsDiagramInfo(actionEl.dataset.diagramInfo || 'main');
            }
            return;
        }
        if (action === 'toggle-spillerstats-info') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.toggleStatsSpillerstatsInfo === 'function') {
                window.toggleStatsSpillerstatsInfo(actionEl.dataset.spillerstatsInfo);
            }
            return;
        }
        if (action === 'print-awards') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.printStatsAwardsSheet === 'function') window.printStatsAwardsSheet();
            return;
        }
        if (action === 'toggle-award-info') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.toggleStatsAwardInfo === 'function') {
                window.toggleStatsAwardInfo(actionEl.dataset.awardId);
            }
            return;
        }
        if (action === 'toggle-hall-info') {
            event.preventDefault();
            event.stopPropagation();
            const awardId = actionEl.dataset.awardId || '';
            window.hallOfFameInfoId = window.hallOfFameInfoId === awardId ? '' : awardId;
            if (typeof window.renderHallOfFameSlot === 'function') window.renderHallOfFameSlot();
            return;
        }
        if (action === 'edit-hall-award' || action === 'cancel-hall-award') {
            event.preventDefault();
            event.stopPropagation();
            window.hallOfFameEditingId = action === 'edit-hall-award' ? (actionEl.dataset.awardId || '') : '';
            if (typeof window.renderHallOfFameSlot === 'function') window.renderHallOfFameSlot();
            return;
        }
        if (action === 'save-hall-award') {
            event.preventDefault();
            event.stopPropagation();
            const awardId = actionEl.dataset.awardId || '';
            let navn = actionEl.dataset.playerName || '';
            let playerId = actionEl.dataset.playerId || '';
            if (!navn) {
                const select = actionEl.closest('.hall-of-fame-plaque')?.querySelector('select');
                const option = select?.selectedOptions?.[0];
                navn = option?.dataset.name || '';
                playerId = option?.value || '';
            }
            const lineAward = (window.getStatsAwardDefinitions?.() || [])
                .flatMap(group => group.awards || [])
                .find(award => award.id === awardId);
            const withheld = lineAward && typeof window.hallOfFameLineAwardWithheldReason === 'function'
                ? window.hallOfFameLineAwardWithheldReason(lineAward)
                : '';
            if (!withheld && awardId && navn && typeof window.saveHallOfFameWinner === 'function') {
                window.saveHallOfFameWinner(awardId, { navn, playerId });
            }
            window.hallOfFameEditingId = '';
            if (typeof window.renderHallOfFameSlot === 'function') window.renderHallOfFameSlot();
            return;
        }
        if (action === 'clear-hall-award') {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.saveHallOfFameWinner === 'function') {
                window.saveHallOfFameWinner(actionEl.dataset.awardId, null);
            }
            window.hallOfFameEditingId = '';
            if (typeof window.renderHallOfFameSlot === 'function') window.renderHallOfFameSlot();
            return;
        }
        if (action === 'set-kamp-year') {
            const year = actionEl.dataset.year;
            if (year && typeof window.setStatsKampYearFilter === 'function') window.setStatsKampYearFilter(year);
            return;
        }
        if (action === 'set-spiller-position') {
            const positionId = actionEl.dataset.positionId;
            if (positionId && typeof window.setStatsSpillerPositionFilter === 'function') {
                window.setStatsSpillerPositionFilter(positionId);
            }
            return;
        }
        if (action === 'set-oppmote-range') {
            const range = actionEl.dataset.range;
            if (range && typeof window.setStatsOppmoteRangeFilter === 'function') {
                window.setStatsOppmoteRangeFilter(range);
            }
            return;
        }
        if (action === 'toggle-stats-filter-menu') {
            event.preventDefault();
            if (typeof window.toggleStatsFilterMenu === 'function') {
                window.toggleStatsFilterMenu(actionEl.closest('[data-stats-filter-menu]'));
            }
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
        if (action === 'open-kampstats') {
            const matchId = actionEl.dataset.matchId;
            if (matchId && typeof window.openKampstatsForMatch === 'function') {
                window.openKampstatsForMatch(matchId);
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

        window.getStatsActiveSeasonYear = function() {
            const years = typeof window.getStatsKampYearOptions === 'function'
                ? window.getStatsKampYearOptions()
                : [];
            return years.length ? years[0] : new Date().getFullYear();
        };

        window.getStatsKampYearFilter = function() {
            const years = typeof window.getStatsKampYearOptions === 'function'
                ? window.getStatsKampYearOptions()
                : [];
            const current = window.statsKampYearFilter;
            // Explicit "Alle" stays available on demand; default is always aktiv sesong.
            if (current === 'alle') return 'alle';
            const year = Number(current);
            if (Number.isFinite(year) && years.includes(year)) return year;
            return years.length ? years[0] : new Date().getFullYear();
        };

        window.getStatsKampMatchTypeFilter = function() {
            return 'alle';
        };

        window.matchBelongsToStatsKampYear = function(match) {
            const filter = window.getStatsKampYearFilter();
            if (filter === 'alle') return true;
            return window.getMatchStatsYear(match) === filter;
        };

        window.matchBelongsToStatsKampMatchType = function(match) {
            const filter = window.getStatsKampMatchTypeFilter();
            if (filter === 'alle') return true;
            return (match?.matchType || 'Serie') === filter;
        };

        window.matchBelongsToStatsKampFilters = function(match) {
            if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return false;
            if (typeof window.matchBelongsToStatsKampYear === 'function' && !window.matchBelongsToStatsKampYear(match)) {
                return false;
            }
            if (typeof window.matchBelongsToStatsKampMatchType === 'function' && !window.matchBelongsToStatsKampMatchType(match)) {
                return false;
            }
            return true;
        };

        window.invalidateStatsSpillerYearOptionsCache = function() {
            window._statsSpillerYearOptionsCache = null;
            window._statsSpillerYearOptionsCacheKey = '';
            window._statsKampYearOptionsCache = null;
            window._statsKampYearOptionsCacheKey = '';
        };

        window.activityBelongsToStatsYear = function(activity, yearFilter) {
            const filter = yearFilter === undefined
                ? (typeof window.getStatsSpillerYearFilter === 'function'
                    ? window.getStatsSpillerYearFilter()
                    : window.getStatsKampYearFilter())
                : yearFilter;
            const year = window.getMatchStatsYear(activity);
            if (!year) return false;

            // Concrete year filters are cheap; only "Alle" needs the player-data year set.
            if (filter !== 'alle' && filter != null && filter !== '') {
                return year === filter;
            }

            if (typeof window.getStatsSpillerYearOptions === 'function') {
                const playerYears = window.getStatsSpillerYearOptions();
                if (playerYears.length && !playerYears.includes(year)) return false;
            }
            return true;
        };

        window.activityHasAttendanceData = function(item) {
            if (!item) return false;
            if (typeof window.getAttendingPlayerRefs === 'function') {
                return window.getAttendingPlayerRefs(item.attendance).length > 0;
            }
            if (item.attendance && typeof item.attendance === 'object') {
                return Object.values(item.attendance).some(value => value === true || value === 'true');
            }
            return false;
        };

        window.getStatsKampYearOptions = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const cacheKey = String(filterLag || 'Alle');
            if (
                window._statsKampYearOptionsCache
                && window._statsKampYearOptionsCacheKey === cacheKey
            ) {
                return window._statsKampYearOptionsCache;
            }

            const years = new Set();
            const addYear = (item, teamName) => {
                if (!item) return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(item)) return;
                if (filterLag && filterLag !== 'Alle' && teamName && teamName !== filterLag) return;
                const year = window.getMatchStatsYear(item);
                if (year) years.add(year);
            };

            (window.activeMatches || []).forEach(match => {
                const hasResult = Boolean(match?.result && String(match.result).includes('-'));
                const hasStats = typeof window.activityHasPlayerStats === 'function'
                    && window.activityHasPlayerStats(match);
                const hasAttendance = typeof window.activityHasAttendanceData === 'function'
                    && window.activityHasAttendanceData(match);
                if (!hasResult && !hasStats && !hasAttendance) return;
                addYear(match, match.matchGroup);
            });

            (window.activeEvents || []).forEach(event => {
                const hasStats = typeof window.activityHasPlayerStats === 'function'
                    && window.activityHasPlayerStats(event);
                const hasAttendance = typeof window.activityHasAttendanceData === 'function'
                    && window.activityHasAttendanceData(event);
                if (!hasStats && !hasAttendance) return;
                addYear(event, event.team);
            });

            const result = [...years].sort((a, b) => b - a);
            window._statsKampYearOptionsCache = result;
            window._statsKampYearOptionsCacheKey = cacheKey;
            return result;
        };

        window.activityHasPlayerStats = function(item) {
            if (!item) return false;
            if (typeof window.getAttendingPlayerRefs === 'function') {
                if (window.getAttendingPlayerRefs(item.attendance).length > 0) return true;
            } else if (item.attendance && typeof item.attendance === 'object') {
                if (Object.values(item.attendance).some(value => value === true || value === 'true')) return true;
            }
            const hasMapValues = (map) => Boolean(
                map && typeof map === 'object' && Object.keys(map).some(key => {
                    const value = map[key];
                    return value !== undefined && value !== null && value !== '' && value !== 0 && value !== false;
                })
            );
            if (hasMapValues(item.ratings) || hasMapValues(item.scorers) || hasMapValues(item.assists)) return true;
            if (Array.isArray(item.guleKort) && item.guleKort.length) return true;
            if (Array.isArray(item.rodeKort) && item.rodeKort.length) return true;
            return Boolean(item.motm);
        };

        window.getStatsSpillerYearOptions = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            if (
                window._statsSpillerYearOptionsCache
                && window._statsSpillerYearOptionsCacheKey === filterLag
            ) {
                return window._statsSpillerYearOptionsCache;
            }

            const years = new Set();
            const consider = (item, teamName) => {
                if (!item) return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(item)) return;
                if (filterLag && filterLag !== 'Alle' && teamName && teamName !== filterLag) return;
                if (typeof window.activityHasPlayerStats === 'function' && !window.activityHasPlayerStats(item)) return;
                const year = window.getMatchStatsYear(item);
                if (year) years.add(year);
            };

            (window.activeMatches || []).forEach(match => consider(match, match.matchGroup));
            (window.activeEvents || []).forEach(event => consider(event, event.team));
            const result = [...years].sort((a, b) => b - a);
            window._statsSpillerYearOptionsCache = result;
            window._statsSpillerYearOptionsCacheKey = filterLag;
            return result;
        };

        window.getStatsSpillerYearFilter = function() {
            const years = typeof window.getStatsSpillerYearOptions === 'function'
                ? window.getStatsSpillerYearOptions()
                : [];
            if (!years.length) return new Date().getFullYear();
            const filter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : 'alle';
            if (filter !== 'alle' && years.includes(filter)) return filter;
            return years[0];
        };

        window.closeStatsFilterMenus = function(exceptMenu = null) {
            document.querySelectorAll('[data-stats-filter-menu].is-open').forEach(menu => {
                if (exceptMenu && menu === exceptMenu) return;
                menu.classList.remove('is-open');
                const trigger = menu.querySelector('[data-stat-action="toggle-stats-filter-menu"]');
                const panel = menu.querySelector('[data-stats-filter-menu-panel]');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (panel) panel.hidden = true;
            });
        };

        window.toggleStatsFilterMenu = function(menu) {
            if (!menu) return;
            const isOpen = menu.classList.contains('is-open');
            window.closeStatsFilterMenus();
            if (isOpen) return;

            menu.classList.add('is-open');
            const trigger = menu.querySelector('[data-stat-action="toggle-stats-filter-menu"]');
            const panel = menu.querySelector('[data-stats-filter-menu-panel]');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
            if (panel) panel.hidden = false;
        };

        window.renderStatsFilterMenuHtml = function({
            menuId,
            ariaLabel,
            valueLabel,
            options,
            action,
            valueAttr,
            icon = ''
        }) {
            const selectedOption = (options || []).find(option => option.selected);
            const selectedLabel = selectedOption?.label || valueLabel;
            return `
                <div class="stats-filter-menu" data-stats-filter-menu="${escapeStatisticsHtml(menuId)}">
                    <button
                        type="button"
                        class="stats-filter-trigger"
                        data-stat-action="toggle-stats-filter-menu"
                        aria-haspopup="listbox"
                        aria-expanded="false"
                        aria-label="${escapeStatisticsHtml(ariaLabel)}, valgt ${escapeStatisticsHtml(selectedLabel)}"
                    >
                        ${icon ? `<i class="fa-solid ${escapeStatisticsHtml(icon)}" aria-hidden="true"></i>` : ''}
                        <span class="stats-filter-trigger-value">${escapeStatisticsHtml(valueLabel)}</span>
                        <i class="fa-solid fa-chevron-down stats-filter-trigger-chevron" aria-hidden="true"></i>
                    </button>
                    <div class="stats-filter-dropdown" role="listbox" aria-label="${escapeStatisticsHtml(ariaLabel)}" hidden data-stats-filter-menu-panel>
                        ${options.map(option => `
                            <button
                                type="button"
                                class="stats-filter-option ${option.selected ? 'is-active' : ''}"
                                role="option"
                                aria-selected="${option.selected ? 'true' : 'false'}"
                                data-stat-action="${escapeStatisticsHtml(action)}"
                                data-${escapeStatisticsHtml(valueAttr)}="${escapeStatisticsHtml(option.value)}"
                            >${escapeStatisticsHtml(option.label)}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        window.renderStatsSectionFilterHtml = function() {
            const activeSection = typeof window.getStatsLagSection === 'function'
                ? window.getStatsLagSection()
                : 'kampdata';
            const sections = Array.isArray(window.statsLagSections)
                ? window.statsLagSections
                : [
                    { id: 'kampdata', label: 'Kamp', icon: 'fa-shield-halved' },
                    { id: 'spillerdata', label: 'Spiller', icon: 'fa-users' },
                    { id: 'treningsdata', label: 'Trening', icon: 'fa-user-check' }
                ];

            return sections.map(section => `
                <button
                    type="button"
                    role="tab"
                    aria-selected="${activeSection === section.id ? 'true' : 'false'}"
                    class="bsk-btn bsk-btn-chip stats-lag-section-btn ${activeSection === section.id ? 'is-active' : ''}"
                    data-stat-action="set-lag-section"
                    data-section-id="${escapeStatisticsHtml(section.id)}"
                >
                    ${section.icon ? `<i class="fa-solid ${escapeStatisticsHtml(section.icon)}" aria-hidden="true"></i>` : ''}
                    <span>${escapeStatisticsHtml(section.label)}</span>
                </button>
            `).join('');
        };

        window.renderStatsSeasonFiltersHtml = function() {
            const years = typeof window.getStatsKampYearOptions === 'function'
                ? window.getStatsKampYearOptions()
                : [];
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : (years[0] || new Date().getFullYear());
            const yearLabel = String(yearFilter === 'alle' ? (years[0] || new Date().getFullYear()) : yearFilter);
            if (!years.length) {
                return `
                    <button type="button" class="bsk-btn bsk-btn-chip stats-lag-section-btn" disabled>
                        <i class="fa-solid fa-calendar" aria-hidden="true"></i>
                        <span>${escapeStatisticsHtml(yearLabel)}</span>
                    </button>
                `;
            }

            return window.renderStatsFilterMenuHtml({
                menuId: 'year',
                ariaLabel: 'Velg sesong',
                valueLabel: yearFilter === 'alle' ? 'Alle år' : yearLabel,
                icon: 'fa-calendar',
                action: 'set-kamp-year',
                valueAttr: 'year',
                options: [
                    ...years.map(year => ({
                        value: String(year),
                        label: String(year),
                        selected: yearFilter === year
                    })),
                    {
                        value: 'alle',
                        label: 'Alle år',
                        selected: yearFilter === 'alle'
                    }
                ]
            });
        };

        window.renderStatsLagFiltersHtml = function() {
            const sectionFilterHtml = typeof window.renderStatsSectionFilterHtml === 'function'
                ? window.renderStatsSectionFilterHtml()
                : '';
            const seasonFilterHtml = typeof window.renderStatsSeasonFiltersHtml === 'function'
                ? window.renderStatsSeasonFiltersHtml()
                : '';

            return `
                <div class="stats-lag-filters" role="tablist" aria-label="Statistikkvalg">
                    ${sectionFilterHtml}
                    ${seasonFilterHtml}
                </div>
            `;
        };

        window.renderStatsYearFilterHtml = function(ariaLabel, yearOptions, selectedYear, options = {}) {
            const includeAlle = options.includeAlle !== false;
            const yearFilter = selectedYear !== undefined
                ? selectedYear
                : (typeof window.getStatsKampYearFilter === 'function'
                    ? window.getStatsKampYearFilter()
                    : 'alle');
            const years = Array.isArray(yearOptions)
                ? yearOptions
                : (typeof window.getStatsKampYearOptions === 'function'
                    ? window.getStatsKampYearOptions()
                    : []);
            if (!includeAlle && years.length <= 1) return '';
            return `
                <div class="stats-kamp-year-filter" role="tablist" aria-label="${escapeStatisticsHtml(ariaLabel || 'Filtrer etter år')}">
                    ${includeAlle ? `
                    <button
                        type="button"
                        role="tab"
                        aria-selected="${yearFilter === 'alle' ? 'true' : 'false'}"
                        class="bsk-btn bsk-btn-chip stats-kamp-year-btn ${yearFilter === 'alle' ? 'is-active' : ''}"
                        data-stat-action="set-kamp-year"
                        data-year="alle"
                    >Alle</button>
                    ` : ''}
                    ${years.map(year => `
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
        };

        window.setStatsKampYearFilter = function(year) {
            const availableYears = typeof window.getStatsKampYearOptions === 'function'
                ? window.getStatsKampYearOptions()
                : [];
            const next = year === 'alle' || year == null || year === ''
                ? 'alle'
                : Number(year);
            if (next === 'alle') {
                window.statsKampYearFilter = 'alle';
            } else if (Number.isFinite(next) && availableYears.includes(next)) {
                window.statsKampYearFilter = next;
            } else {
                window.statsKampYearFilter = availableYears.length ? availableYears[0] : new Date().getFullYear();
            }
            window.pendingKampstatMatchId = null;
            if (typeof window.invalidateStatsSpillerYearOptionsCache === 'function') {
                window.invalidateStatsSpillerYearOptionsCache();
            }
            if (typeof window.renderStatistikkSide === 'function') {
                window.renderStatistikkSide();
            }
        };

        window.getStatsOppmoteRangeFilter = function() {
            return window._statsOppmoteRange === 'last8' ? 'last8' : 'season';
        };

        window.setStatsOppmoteRangeFilter = function(range) {
            window._statsOppmoteRange = range === 'last8' ? 'last8' : 'season';
            if (typeof window.renderStatsLagSummary === 'function') {
                window.renderStatsLagSummary();
            }
        };

        window.getStatsKampPanelState = function() {
            const defaults = {
                kampdata: true,
                kampforkamp: false,
                kampstats: false,
                oppmote: true,
                spillerutvikling: false,
                oppfolging: false,
                spillerliste: false,
                sesongkaaringer: false,
                halloffame: true
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

        window.openStatsKampPanel = function(panelId) {
            if (!panelId || window.isStatsKampPanelOpen(panelId)) return;
            window.toggleStatsKampPanel(panelId);
        };

        window.openKampstatsForMatch = function(matchId) {
            if (!matchId) return;
            window.pendingKampstatMatchId = matchId;
            if (typeof window.openStatsKampPanel === 'function') {
                window.openStatsKampPanel('kampstats');
            }
            if (typeof window.showMatchStatsTable === 'function') {
                window.showMatchStatsTable();
            }
            const panel = document.querySelector('#view-statistikk [data-stats-panel="kampstats"]');
            if (panel && typeof panel.scrollIntoView === 'function') {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        window.renderStatsCollapsiblePanelHtml = function({ id, title, badge = '', showLabel, hideLabel, content, headerActionsHtml = '', headingExtraHtml = '', infoPanelHtml = '', markHtml = '', clash = false }) {
            const isOpen = window.isStatsKampPanelOpen(id);
            const badgeHtml = badge !== '' && badge != null
                ? `<span class="match-detail-section-badge">${badge}</span>`
                : '';
            return `
                <section class="match-game-plan-panel match-collapsible-panel stats-kamp-collapsible-panel${clash ? ' stats-clash-panel' : ''} ${isOpen ? '' : 'is-collapsed'}" data-stats-panel="${id}">
                    <div class="match-bench-action-row match-bench-topline">
                        <div class="match-bench-heading">
                            ${markHtml}
                            <h3>${title}</h3>
                            ${badgeHtml}
                            ${headingExtraHtml}
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
                        ${headerActionsHtml}
                    </div>
                    ${infoPanelHtml}
                    <div class="match-collapsible-content">
                        ${content}
                    </div>
                </section>
            `;
        };

        window.getTeamFormGuide = function(teamName) {
            const matches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(m)) return false;
                if (teamName && teamName !== 'Alle' && m.matchGroup !== teamName) return false;
                return true;
            });

            matches.sort((a, b) => new Date(b.date) - new Date(a.date));
            const last5 = matches.slice(0, 5).reverse();

            return last5.map(m => {
                const score = typeof window.getMatchOutcomeScore === 'function'
                    ? window.getMatchOutcomeScore(m)
                    : parseScore(m.result);
                const displayResult = typeof window.formatStatsBskFirstResult === 'function'
                    ? window.formatStatsBskFirstResult(m)
                    : m.result;
                const away = m.venue === 'Borte' ? ' borte' : '';
                if (!score) return { m, form: 'U', text: 'U', tooltip: `Registrert: ${displayResult}` };
                if (score.bsk > score.opponent) return { m, form: 'S', text: 'S', tooltip: `Seier${away} vs ${m.opponent} (${displayResult})` };
                if (score.bsk === score.opponent) return { m, form: 'U', text: 'U', tooltip: `Uavgjort${away} vs ${m.opponent} (${displayResult})` };
                return { m, form: 'T', text: 'T', tooltip: `Tap${away} vs ${m.opponent} (${displayResult})` };
            });
        };

        window.buildPlayerAnalysisStats = function(filterLag) {
            const players = (window.activePlayers || []).filter(p => {
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });
            const currentPlayers = players.filter(p => window.isPlayerInCurrentSquadPool(p));
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : (typeof window.getStatsActiveSeasonYear === 'function'
                    ? window.getStatsActiveSeasonYear()
                    : new Date().getFullYear());

            const matches = (window.activeMatches || [])
                .filter(m => {
                    if (!m.result || !m.result.includes('-')) return false;
                    if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(m)) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                    if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                    if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(m, yearFilter)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))]
                .filter(e => {
                    if (filterLag && filterLag !== 'Alle' && e.team !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                    if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return false;
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

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const disciplineUpToDate = tomorrow.toISOString().slice(0, 10);
            const relevantTeams = filterLag && filterLag !== 'Alle'
                ? [filterLag]
                : [...new Set(currentPlayers.map(p => p.spillerLag).filter(Boolean))];
            const disciplineByPlayerKey = new Map();

            relevantTeams.forEach(teamName => {
                const discipline = typeof window.getDisciplineStatusForTeam === 'function'
                    ? window.getDisciplineStatusForTeam(teamName, disciplineUpToDate)
                    : {};
                Object.entries(discipline).forEach(([key, status]) => {
                    disciplineByPlayerKey.set(key, status);
                });
            });

            const getDisciplineForPlayerName = (name) => {
                const player = currentPlayers.find(pl => {
                    const playerName = pl.navn || pl.name || pl.fullName || pl.spiller || '';
                    return playerName === name;
                });
                if (!player) return null;
                const key = typeof window.getPlayerStorageKey === 'function'
                    ? window.getPlayerStorageKey(player)
                    : (player.id || name);
                return disciplineByPlayerKey.get(key) || null;
            };

            const followUpMap = new Map();
            activeStats.filter(p => window.isPlayerInCurrentSquadPool(p)).forEach(p => {
                const discipline = getDisciplineForPlayerName(p.name);
                const hasRedSuspension = Boolean(discipline?.isSuspended && discipline?.cardType === 'red');
                const hasYellowSuspension = Boolean(discipline?.isSuspended && discipline?.cardType === 'yellow');
                const hasYellowRisk = Boolean(discipline?.isAtRisk && !discipline?.isSuspended);

                if (!(hasRedSuspension || hasYellowSuspension || hasYellowRisk || (p.formLastFive > 0 && p.formLastFive < 5.5) || p.matches <= 2)) return;

                const reason = [];
                if (hasRedSuspension) reason.push('Rødt kort i serie – karantene');
                if (hasYellowSuspension) {
                    reason.push(`${discipline.yellows || discipline.displayNum || 0} gule kort – karantene`);
                } else if (hasYellowRisk) {
                    reason.push(`${discipline.yellows} gule i serie – karantene ved ${discipline.nextKaranteneAt || 4}`);
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
                    .filter(e => typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(player, e))
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
                : scoped.filter(p => window.isPlayerInCurrentSquadPool(p));
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
                .filter(p => typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(p, event))
                .forEach(addPlayer);

            // Players who actually attended still count, even if they later became passive
            // or got a later tilknytningsdato.
            if (event?.attendance) {
                scoped.forEach(player => {
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
            const activePlayers = scopedPlayers.filter(p => window.isPlayerInCurrentSquadPool(p));
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
                    if (typeof window.matchBelongsToStatsKampFilters === 'function' && !window.matchBelongsToStatsKampFilters(m)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            let conceded = 0;
            playedMatches.forEach(m => {
                const score = typeof window.getMatchRegularScore === 'function'
                    ? window.getMatchRegularScore(m)
                    : parseScore(m.result);
                if (score) conceded += score.opponent;
            });

            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : (typeof window.getStatsActiveSeasonYear === 'function'
                    ? window.getStatsActiveSeasonYear()
                    : new Date().getFullYear());
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const historicalEvents = allEvents
                .filter(e => {
                    if (teamFilterActive && e.team !== filterLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                    if (e.type === 'Kamp' && typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(e)) return false;
                    if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return false;
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
                    const score = typeof window.getMatchRegularScore === 'function'
                        ? window.getMatchRegularScore(m)
                        : parseScore(m.result);
                    return total + (score ? score.bsk : 0);
                }, 0);
                return Math.round((sum / matches.length) * 10) / 10;
            };
            const avgAgainst = (matches) => {
                if (!matches.length) return null;
                const sum = matches.reduce((total, m) => {
                    const score = typeof window.getMatchRegularScore === 'function'
                        ? window.getMatchRegularScore(m)
                        : parseScore(m.result);
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
                const score = typeof window.getMatchOutcomeScore === 'function'
                    ? window.getMatchOutcomeScore(m)
                    : parseScore(m.result);
                let form = 'U';
                if (score && score.bsk > score.opponent) form = 'S';
                else if (score && score.bsk < score.opponent) form = 'T';
                return {
                    opponent: m.opponent || 'Motstander',
                    date: m.date || '',
                    result: typeof window.formatStatsBskFirstResult === 'function'
                        ? window.formatStatsBskFirstResult(m)
                        : (m.result || '-'),
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
                    seasonFor: avgFor(playedMatches),
                    lastFiveFor: avgFor(lastFiveMatches),
                    baselineFor: avgFor(previousMatches),
                    allFor: avgFor(previousMatches),
                    seasonAgainst: avgAgainst(playedMatches),
                    lastFiveAgainst: avgAgainst(lastFiveMatches),
                    baselineAgainst: avgAgainst(previousMatches),
                    allAgainst: avgAgainst(previousMatches),
                    seasonKampbidrag: avgKampbidrag(playedMatches),
                    lastFiveKampbidrag: avgKampbidrag(lastFiveMatches),
                    baselineKampbidrag: avgKampbidrag(previousMatches),
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

        
        window.scheduleStatsHeavyWork = function(task) {
            const generation = (window._statsRenderGeneration = (window._statsRenderGeneration || 0) + 1);
            const run = () => {
                if (generation !== window._statsRenderGeneration) return;
                try {
                    task();
                } catch (error) {
                    console.error('Statistikk-render feilet:', error);
                }
            };
            // Double rAF: wait until after the browser has painted the stats shell.
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => requestAnimationFrame(run));
            } else {
                setTimeout(run, 0);
            }
        };

        window.paintStatsOpeningShell = function(tabId = 'lag') {
            const heroTab = tabId === 'spillere' ? 'spillere' : 'lag';
            if (typeof window.paintStatsChrome === 'function' && typeof window.renderStatsChromeTabsOnly === 'function') {
                window.paintStatsChrome(window.renderStatsChromeTabsOnly(window.renderStatsHeroTabsHtml(heroTab)));
            }
            if (typeof window.updateStatsLagSectionVisibility === 'function') {
                window.updateStatsLagSectionVisibility();
            }

            // First visit: tiny placeholder so the view isn't empty while heavy work runs.
            const activeSection = typeof window.getStatsLagSection === 'function'
                ? window.getStatsLagSection()
                : 'kampdata';
            const placeholder = '<div class="stats-panel"><p class="stats-kamp-panel-hint">Laster statistikk…</p></div>';
            if (activeSection === 'kampdata') {
                const slot = document.getElementById('stats-kampdata-slot');
                if (slot && !slot.innerHTML.trim()) slot.innerHTML = placeholder;
            } else if (activeSection === 'spillerdata') {
                const slot = document.getElementById('stats-spillerstats-slot');
                if (slot && !slot.innerHTML.trim()) slot.innerHTML = placeholder;
            } else if (activeSection === 'treningsdata') {
                const slot = document.getElementById('stats-oppmote-slot');
                if (slot && !slot.innerHTML.trim()) slot.innerHTML = placeholder;
            }
        };

        window.renderStatistikkSide = function(options = {}) {
            if (typeof window.invalidateStatsSpillerYearOptionsCache === 'function') {
                window.invalidateStatsSpillerYearOptionsCache();
            }
            const filterLag = window.getStatsTeamFilter();
            const scopedPlayers = (window.activePlayers || []).filter(p => {
                if (filterLag && filterLag !== 'Alle' && p.spillerLag !== filterLag) return false;
                return true;
            });
            const teamPlayers = scopedPlayers.filter(p => window.isPlayerInCurrentSquadPool(p));

            const filteredMatches = (window.activeMatches || []).filter(m => {
                if (!m.result || !m.result.includes('-')) return false;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                if (filterLag && filterLag !== 'Alle' && m.matchGroup !== filterLag) return false;
                if (typeof window.matchBelongsToStatsKampFilters === 'function' && !window.matchBelongsToStatsKampFilters(m)) return false;
                return true;
            });

            let wins = 0, draws = 0, losses = 0, goals = 0, conceded = 0;
            filteredMatches.forEach(m => {
                const regularScore = typeof window.getMatchRegularScore === 'function'
                    ? window.getMatchRegularScore(m)
                    : parseScore(m.result);
                const outcomeScore = typeof window.getMatchOutcomeScore === 'function'
                    ? window.getMatchOutcomeScore(m)
                    : regularScore;
                if (regularScore && outcomeScore) {
                    goals += regularScore.bsk;
                    conceded += regularScore.opponent;
                    if (outcomeScore.bsk > outcomeScore.opponent) wins++;
                    else if (outcomeScore.bsk === outcomeScore.opponent) draws++;
                    else losses++;
                }
            });

            const matchCount = filteredMatches.length;
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : (typeof window.getStatsActiveSeasonYear === 'function'
                    ? window.getStatsActiveSeasonYear()
                    : new Date().getFullYear());
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            let totalEventTicks = 0, totalPossibleTicks = 0;
            allEvents.forEach(e => {
                if (filterLag && filterLag !== 'Alle' && e.team !== filterLag) return;
                if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return;
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

            const activeSection = typeof window.getStatsLagSection === 'function'
                ? window.getStatsLagSection()
                : 'kampdata';
            if (activeSection === 'spillerdata') {
                if (window._statsSelectedPlayer && typeof window.renderSpillereDetail === 'function') {
                    window.renderSpillereDetail(window._statsSelectedPlayer);
                } else if (typeof window.renderSpillereView === 'function') {
                    window.renderSpillereView();
                } else if (typeof window.renderStatsLagSummary === 'function') {
                    window.renderStatsLagSummary();
                }
            } else if (document.querySelector('#stat-tab-lag.is-active') || document.getElementById('stat-view-lag')?.classList.contains('block')) {
                if (options.skipChrome && typeof window.renderStatsLagSummary === 'function') {
                    window.renderStatsLagSummary();
                } else if (typeof window.renderStatsTabHero === 'function') {
                    window.renderStatsTabHero('lag');
                }
            }

            if (typeof window.updateStatsLagSectionVisibility === 'function') {
                window.updateStatsLagSectionVisibility();
            }
            bindStatisticsEvents();
        };


window.getPlayerFormComponents = function(playerName, options = {}) {
    // Default to active season — full history only when caller passes yearFilter: 'alle'.
    const yearFilter = options.yearFilter !== undefined
        ? options.yearFilter
        : (typeof window.getStatsSpillerYearFilter === 'function'
            ? window.getStatsSpillerYearFilter()
            : (typeof window.getStatsActiveSeasonYear === 'function'
                ? window.getStatsActiveSeasonYear()
                : new Date().getFullYear()));
    const excludeMatchId = options.excludeMatchId ? String(options.excludeMatchId) : '';
    const asOfDateRaw = options.asOfDate || null;
    const cache = typeof window.getDerivedStatsCache === 'function'
        ? window.getDerivedStatsCache('playerForm')
        : null;
    const cacheKey = `${playerName}|${yearFilter}|${asOfDateRaw || ''}|${excludeMatchId}`;
    if (cache?.has(cacheKey)) return cache.get(cacheKey);

    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) {
        const empty = { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };
        if (cache) cache.set(cacheKey, empty);
        return empty;
    }
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
    let asOfCutoff = null;
    if (asOfDateRaw) {
        const asOf = new Date(asOfDateRaw);
        if (!Number.isNaN(asOf.getTime())) {
            asOf.setHours(23, 59, 59, 999);
            asOfCutoff = asOf;
        }
    }
    const isOnOrBeforeAsOf = (item) => {
        if (!asOfCutoff) return true;
        if (!item?.date) return false;
        const itemDate = new Date(item.date);
        if (Number.isNaN(itemDate.getTime())) return false;
        return itemDate <= asOfCutoff;
    };
    const isExcludedMatch = (item) => (
        Boolean(excludeMatchId) && String(item?.id || '') === excludeMatchId
    );
    const teamEvents = allEvents
        .filter(e => {
            if (e.team !== spillerLag || !isHistorical(e)) return false;
            if (e.type === 'Kamp' && !hasCompletedMatchResult(e)) return false;
            if (isExcludedMatch(e)) return false;
            if (!isOnOrBeforeAsOf(e)) return false;
            if (typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(playerObj, e)) return false;
            if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return false;
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
            !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(m)) &&
            m.attendance &&
            window.isPlayerAttending(m.attendance, playerObj) &&
            !isExcludedMatch(m) &&
            isOnOrBeforeAsOf(m) &&
            (typeof window.activityBelongsToStatsYear !== 'function' || window.activityBelongsToStatsYear(m, yearFilter))
        ))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    if (recentMatches.length === 0) {
        const empty = { total: 0, kamp: 0, oppm: 0, dis: 0, hasFormData: false };
        if (cache) cache.set(cacheKey, empty);
        return empty;
    }

    let performanceScore = 0;
    let weightedPoints = 0;
    let totalWeight = 0;

    recentMatches.forEach((m, index) => {
        const weight = recentMatches.length - index;
        const matchPoints = typeof window.calculatePlayerFormMatchPoints === 'function'
            ? window.calculatePlayerFormMatchPoints(m, playerObj)
            : window.calculatePlayerMatchPoints(m, playerObj);
        weightedPoints += matchPoints * weight;
        totalWeight += weight;
    });

    const weightedAverage = totalWeight > 0 ? weightedPoints / totalWeight : 0;
    performanceScore = typeof window.scaleFormKampScore === 'function'
        ? window.scaleFormKampScore(weightedAverage)
        : Math.max(0, Math.min(80, ((weightedAverage - 12) / 20) * 80));

    const kamp = Math.round(performanceScore);
    const oppm = Math.round(availabilityScore);
    const total = Math.max(0, Math.min(100, kamp + oppm));

    const result = { total, kamp, oppm, dis: 0, recentRedCardPenalty: 0, hasFormData: true };
    if (cache) cache.set(cacheKey, result);
    return result;
};

window.calculatePlayerPerformanceChemistry = function(playerName) {
    return window.getPlayerFormComponents(playerName).total;
};

window.getTeamFormMedian = function(teamName) {
    const cache = typeof window.getDerivedStatsCache === 'function'
        ? window.getDerivedStatsCache('teamFormMedian')
        : null;
    const cacheKey = teamName || '*';
    if (cache?.has(cacheKey)) return cache.get(cacheKey);

    const scores = (window.activePlayers || [])
        .filter(p => window.isPlayerInCurrentSquadPool(p) && (!teamName || p.spillerLag === teamName))
        .map(p => window.calculatePlayerPerformanceChemistry(p.navn))
        .filter(score => score > 0)
        .sort((a, b) => a - b);

    const median = scores.length
        ? (scores.length % 2 === 0
            ? Math.round((scores[Math.floor(scores.length / 2) - 1] + scores[Math.floor(scores.length / 2)]) / 2)
            : scores[Math.floor(scores.length / 2)])
        : 0;
    if (cache) cache.set(cacheKey, median);
    return median;
};

window.getTeamMatchSquadPoints = function(match, teamName) {
    if (!match || !teamName || !match.attendance) return [];

    const scopedPlayers = (window.activePlayers || []).filter(p => p.spillerLag === teamName);
    const activePlayers = scopedPlayers.filter(p => window.isPlayerInCurrentSquadPool(p));
    const players = (typeof window.getStatsHistoricalEventSquad === 'function'
        ? window.getStatsHistoricalEventSquad(match, scopedPlayers, activePlayers)
        : activePlayers
    ).filter(p => window.isPlayerAttending(match.attendance, p));

    if (!players.length) return [];

    return players.map(player => (
        typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, player)
            : 0
    ));
};

window.getTeamMatchAveragePoints = function(match, teamName) {
    const values = window.getTeamMatchSquadPoints(match, teamName);
    if (!values.length) return null;

    const sum = values.reduce((total, value) => total + value, 0);
    return Math.round((sum / values.length) * 10) / 10;
};

window.getTeamMatchMedianPoints = function(match, teamName) {
    const values = window.getTeamMatchSquadPoints(match, teamName)
        .filter(value => Number.isFinite(value))
        .sort((a, b) => a - b);
    if (!values.length) return null;

    const middle = Math.floor(values.length / 2);
    const median = values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];
    return Math.round(median * 10) / 10;
};

window.getMedianOfNumbers = function(values) {
    const sorted = (values || [])
        .map(Number)
        .filter(value => Number.isFinite(value))
        .sort((a, b) => a - b);
    if (!sorted.length) return null;

    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    return Math.round(median * 10) / 10;
};

window.getPlayerRollingMatchPointsAsOf = function(player, asOfDate, options = {}) {
    if (!player || !asOfDate) return null;

    const asOf = new Date(asOfDate);
    if (Number.isNaN(asOf.getTime())) return null;
    asOf.setHours(23, 59, 59, 999);

    const yearFilter = options.yearFilter !== undefined
        ? options.yearFilter
        : (typeof window.getStatsSpillerYearFilter === 'function'
            ? window.getStatsSpillerYearFilter()
            : (typeof window.getStatsActiveSeasonYear === 'function'
                ? window.getStatsActiveSeasonYear()
                : new Date().getFullYear()));
    const teamName = player.spillerLag;
    const recentMatches = (window.activeMatches || [])
        .filter(m => {
            if (!m?.date || m.matchGroup !== teamName || !m.attendance) return false;
            if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(m)) return false;
            if (!window.isPlayerAttending(m.attendance, player)) return false;
            if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
            if (!(m.result && String(m.result).includes('-'))) return false;
            if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(m, yearFilter)) return false;
            const matchDate = new Date(m.date);
            if (Number.isNaN(matchDate.getTime()) || matchDate > asOf) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5);

    if (!recentMatches.length) return null;

    let weightedPoints = 0;
    let totalWeight = 0;
    recentMatches.forEach((match, index) => {
        const weight = recentMatches.length - index;
        const points = typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, player)
            : 0;
        weightedPoints += (Number(points) || 0) * weight;
        totalWeight += weight;
    });

    if (!totalWeight) return null;
    return Math.round((weightedPoints / totalWeight) * 10) / 10;
};

window.getTeamDevelopmentMedianAsOf = function(teamName, asOfDate, options = {}) {
    if (!teamName || !asOfDate) return null;

    const excludeName = options.excludePlayerName || '';
    const values = (window.activePlayers || [])
        .filter(player => (
            window.isPlayerInCurrentSquadPool(player) &&
            player.spillerLag === teamName &&
            player.navn !== excludeName
        ))
        .map(player => window.getPlayerRollingMatchPointsAsOf(player, asOfDate, options))
        .filter(value => value !== null && value !== undefined && Number(value) > 0);

    return window.getMedianOfNumbers(values);
};

window.smoothNumericSeries = function(values, windowSize = 3) {
    const series = Array.isArray(values) ? values : [];
    if (series.length < 2) return series.map(value => (
        value === null || value === undefined ? null : Number(value)
    ));

    const radius = Math.max(1, Math.floor(windowSize / 2));
    return series.map((value, index) => {
        if (value === null || value === undefined) return null;
        let sum = 0;
        let count = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
            const neighbor = series[index + offset];
            if (neighbor === null || neighbor === undefined) continue;
            const numeric = Number(neighbor);
            if (!Number.isFinite(numeric)) continue;
            sum += numeric;
            count += 1;
        }
        if (!count) return null;
        return Math.round((sum / count) * 10) / 10;
    });
};

window.buildSmoothChartPath = function(points) {
    const valid = (points || []).filter(point => (
        point &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    ));
    if (!valid.length) return '';
    if (valid.length === 1) return `M ${valid[0].x} ${valid[0].y}`;

    let path = `M ${valid[0].x} ${valid[0].y}`;
    for (let index = 0; index < valid.length - 1; index += 1) {
        const current = valid[index];
        const next = valid[index + 1];
        const previous = valid[index - 1] || current;
        const afterNext = valid[index + 2] || next;
        const control1X = current.x + (next.x - previous.x) / 6;
        const control1Y = current.y + (next.y - previous.y) / 6;
        const control2X = next.x - (afterNext.x - current.x) / 6;
        const control2Y = next.y - (afterNext.y - current.y) / 6;
        path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
    }
    return path;
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
                const hasParticipation = (Number(stat.attendedMatches) || 0) > 0
                    || (Number(stat.oppmotePct) || 0) > 0;
                if (!hasParticipation) {
                    stat.disiplinScore = 0;
                    stat.totalScore = 0;
                    return;
                }

                const hasMatches = (Number(stat.attendedMatches) || 0) > 0;
                const kampbidragScore = bestKampbonus > 0
                    ? ((Number(stat.kampbonus) || 0) / bestKampbonus) * 100
                    : 0;
                const borsScore = stat.snittBors > 0
                    ? Math.max(0, Math.min(100, Number(stat.snittBors) * 10))
                    : 0;
                const oppmoteScore = Math.max(0, Math.min(100, Number(stat.oppmotePct) || 0));
                const disciplineScore = hasMatches
                    ? window.calculatePlayerTotalDisciplineScore(stat)
                    : 0;

                stat.disiplinScore = disciplineScore;
                // Total Score = beste sesong-helhet. Form = beste nå.
                // Spilletidstillegg (+0/+1/+2) ligger i kampbidrag. Minuttandel er egen forklarende stat.
                stat.totalScore = Math.round((
                    (kampbidragScore * 0.50) +
                    (borsScore * 0.25) +
                    (oppmoteScore * 0.15) +
                    (disciplineScore * 0.10)
                ) * 10) / 10;
            });

            return rows;
        };

        window.matchHasMinutesTracking = function(match) {
            if (!match) return false;
            // Spillerbørs er fasit for total spilletid i sesongstat.
            // Live/Bytter forhåndsutfyller Min, men teller ikke før Spillerbørs er lagret.
            return match.minutesSource === 'spillerbors';
        };

        window.getPlayerMatchMinutesForStats = function(match, player) {
            if (!match || !player || !window.matchHasMinutesTracking(match)) return 0;
            return Math.max(
                0,
                Math.floor(Number(window.getPlayerRefMapValue(match.minutesPlayed, player, 0)) || 0)
            );
        };

        window.getMatchDurationForMinutesShare = function(match) {
            if (typeof window.resolveMatchLiveDurationMinutes === 'function') {
                const resolved = window.resolveMatchLiveDurationMinutes(match);
                if (resolved > 0) return resolved;
            }
            const stored = Math.max(0, Math.floor(Number(match?.liveDurationMinutes) || 0));
            return stored > 0 ? stored : 90;
        };

        window.buildPlayerStatsData = function(options = {}) {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const yearFilter = options.yearFilter !== undefined
                ? options.yearFilter
                : (options.applyYearFilter
                    ? (typeof window.getStatsSpillerYearFilter === 'function'
                        ? window.getStatsSpillerYearFilter()
                        : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle'))
                    : 'alle');
            const cache = typeof window.getDerivedStatsCache === 'function'
                ? window.getDerivedStatsCache('playerStatsData')
                : null;
            const cacheKey = `${filterLag}|${yearFilter}`;
            if (cache?.has(cacheKey)) return cache.get(cacheKey);

            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            const teamKampCountByTeam = new Map();
            const seasonAttendanceByTeam = new Map();
            allEvents.forEach(e => {
                const team = e.team || e.matchGroup;
                if (!team) return;
                if (e.type !== 'Kamp' && e.type !== 'Trening') return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return;
                if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return;
                if (e.type === 'Kamp' && !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(e))) {
                    if (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(e)) {
                        teamKampCountByTeam.set(team, (teamKampCountByTeam.get(team) || 0) + 1);
                    }
                }
                if (e.type === 'Kamp' && typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(e)) return;
                const registered = typeof window.hasRegisteredAttendance === 'function'
                    ? window.hasRegisteredAttendance(e.attendance)
                    : Boolean(e.attendance);
                if (!registered) return;
                if (!seasonAttendanceByTeam.has(team)) seasonAttendanceByTeam.set(team, []);
                seasonAttendanceByTeam.get(team).push(e);
            });

            const statsData = (window.activePlayers || [])
                .filter(p => filterLag === 'Alle' || p.spillerLag === filterLag)
                .map(p => {
                    const teamEvents = allEvents.filter(e => {
                        if (e.team !== p.spillerLag) return false;
                        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return false;
                        if (typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(p, e)) return false;
                        if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return false;
                        return true;
                    });

                    let attended = 0, kamper = 0, attendedMatches = 0, mal = 0, assist = 0, totalMatchPoints = 0, bb = 0;
                    let ratingSum = 0, ratingCount = 0;
                    let minutesTotal = 0, minutesMatches = 0, minutesPossible = 0;

                    let trainingAttended = 0;
                    let trainingPossible = 0;
                    const seasonActivities = seasonAttendanceByTeam.get(p.spillerLag) || [];
                    let oppmoteSamletAttended = 0;
                    seasonActivities.forEach(e => {
                        if (window.isPlayerAttending(e.attendance, p)) oppmoteSamletAttended += 1;
                    });
                    const oppmoteSamletPossible = seasonActivities.length;
                    (window.activeEvents || []).forEach(e => {
                        if (e.type !== 'Trening') return;
                        if ((e.team || e.matchGroup) !== p.spillerLag) return;
                        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return;
                        if (typeof window.hasRegisteredAttendance === 'function'
                            ? !window.hasRegisteredAttendance(e.attendance)
                            : !e.attendance) return;
                        if (typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(p, e)) return;
                        if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(e, yearFilter)) return;
                        trainingPossible += 1;
                        if (window.isPlayerAttending(e.attendance, p)) trainingAttended += 1;
                    });

                    teamEvents.forEach(e => {
                        const attending = window.isPlayerAttending(e.attendance, p);
                        const competitiveMatch = e.type === 'Kamp'
                            && !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(e))
                            && (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(e));
                        if (attending) {
                            attended++;
                            if (competitiveMatch) {
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
                                const minutes = typeof window.getPlayerMatchMinutesForStats === 'function'
                                    ? window.getPlayerMatchMinutesForStats(e, p)
                                    : Math.max(
                                        0,
                                        Math.floor(Number(window.getPlayerRefMapValue(e.minutesPlayed, p, 0)) || 0)
                                    );
                                if (minutes > 0) {
                                    minutesTotal += minutes;
                                    minutesMatches += 1;
                                }
                                if (window.matchHasMinutesTracking(e)) {
                                    minutesPossible += window.getMatchDurationForMinutesShare(e);
                                }
                                totalMatchPoints += window.calculatePlayerMatchPoints(e, p);
                            }
                        }
                    });

                    const cardCounts = typeof window.getPlayerCardCounts === 'function'
                        ? window.getPlayerCardCounts(p.navn, p.spillerLag, { yearFilter })
                        : { serie: { gule: 0, rode: 0 }, cup: { gule: 0, rode: 0 } };
                    const serieHint = typeof window.getSerieYellowDisciplineHint === 'function'
                        ? window.getSerieYellowDisciplineHint(cardCounts.serie.gule)
                        : { isAtRisk: false };

                    const guleSerie = cardCounts.serie.gule;
                    const rodeSerie = cardCounts.serie.rode;
                    const guleCup = cardCounts.cup.gule;
                    const rodeCup = cardCounts.cup.rode;
                    const oppmoteSamletPct = oppmoteSamletPossible > 0
                        ? Math.round((oppmoteSamletAttended / oppmoteSamletPossible) * 100)
                        : 0;
                    const minutesSharePct = minutesPossible > 0
                        ? Math.min(100, Math.round((minutesTotal / minutesPossible) * 100))
                        : null;
                    const teamKampCount = teamKampCountByTeam.get(p.spillerLag) || 0;
                    const kampSharePct = teamKampCount > 0
                        ? Math.round((kamper / teamKampCount) * 1000) / 10
                        : 0;
                    const expectedMalpoeng = kamper > 0
                        ? Math.round(((mal + assist) / kamper) * 10) / 10
                        : null;

                    return {
                        navn: p.navn,
                        pos1: p.pos1 || '',
                        spillerLag: p.spillerLag || '',
                        oppmotePct: trainingPossible > 0 ? Math.round((trainingAttended / trainingPossible) * 100) : 0,
                        oppmoteAttended: trainingAttended,
                        oppmotePossible: trainingPossible,
                        oppmoteSamletPct,
                        oppmoteSamletAttended,
                        oppmoteSamletPossible,
                        kamper,
                        attendedMatches,
                        teamKampCount,
                        kampSharePct,
                        mal,
                        assist,
                        expectedMalpoeng,
                        kampbonus: attendedMatches > 0 ? totalMatchPoints / attendedMatches : 0,
                        kampbonusTotal: totalMatchPoints,
                        guleSerie,
                        rodeSerie,
                        guleCup,
                        rodeCup,
                        // Sesongsum for Spillerstats (serie + cup)
                        gule: guleSerie + guleCup,
                        rode: rodeSerie + rodeCup,
                        fairPlayKort: ((guleSerie + guleCup) * 8) + ((rodeSerie + rodeCup) * 25),
                        serieAtRisk: serieHint.isAtRisk,
                        kjemi: window.getPlayerFormComponents(p.navn, { yearFilter }).total,
                        snittBors: ratingCount > 0 ? ratingSum / ratingCount : 0,
                        bb,
                        minutesTotal,
                        minutesMatches,
                        minutesAvg: minutesMatches > 0 ? minutesTotal / minutesMatches : 0,
                        minutesPossible,
                        minutesSharePct,
                        fodselsaar: p.fodselsaar || '',
                        tilknyttetFra: typeof window.getPlayerJoinedFromDate === 'function'
                            ? window.getPlayerJoinedFromDate(p)
                            : ''
                    };
                });

            const scored = window.applyPlayerTotalScores(statsData);
            if (cache) cache.set(cacheKey, scored);
            return scored;
        };

        window.STATS_SPILLER_POSITION_OPTIONS = [
            { id: 'alle', label: 'Alle' },
            { id: 'GK', label: 'GK' },
            { id: 'VMS', label: 'VS' },
            { id: 'MS', label: 'MS' },
            { id: 'HMS', label: 'HS' },
            { id: 'VB', label: 'VB' },
            { id: 'HB', label: 'HB' },
            { id: 'DM', label: 'DM' },
            { id: 'OM', label: 'OM' },
            { id: 'PM', label: 'PM' },
            { id: 'VK', label: 'VK' },
            { id: 'HK', label: 'HK' },
            { id: 'SP', label: 'SP' }
        ];

        window.getStatsSpillerPositionFilter = function() {
            const ids = (window.STATS_SPILLER_POSITION_OPTIONS || []).map((opt) => opt.id);
            const raw = String(window.statsSpillerPositionFilter || 'alle').trim();
            return ids.includes(raw) ? raw : 'alle';
        };

        window.getStatsSpillerPositionFilterOption = function() {
            const id = window.getStatsSpillerPositionFilter();
            return (window.STATS_SPILLER_POSITION_OPTIONS || []).find((opt) => opt.id === id)
                || { id: 'alle', label: 'Alle' };
        };

        window.playerMeetsPositionStatsThreshold = function(row) {
            return (Number(row?.matches) || 0) >= 1;
        };

        window.getPlayerPositionSpillerborsMinutes = function(player, positionId, yearFilter) {
            let minutesTotal = 0;
            let minutesMatches = 0;
            let minutesPossible = 0;
            const yearNum = yearFilter != null && yearFilter !== '' && yearFilter !== 'alle'
                ? Number(yearFilter)
                : null;

            (window.activeMatches || []).forEach((match) => {
                if (!match || !player || match.matchGroup !== player.spillerLag) return;
                if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return;
                if (typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(match)) return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return;
                if (!window.isPlayerAttending?.(match.attendance, player)) return;
                if (yearNum != null && Number.isFinite(yearNum)) {
                    const matchYear = match?.date ? new Date(match.date).getFullYear() : NaN;
                    if (matchYear !== yearNum) return;
                }
                if (typeof window.getPlayerMatchPlayedPositionId === 'function'
                    && window.getPlayerMatchPlayedPositionId(match, player) !== positionId) {
                    return;
                }
                if (!window.matchHasMinutesTracking?.(match)) return;

                const minutes = typeof window.getPlayerMatchMinutesForStats === 'function'
                    ? window.getPlayerMatchMinutesForStats(match, player)
                    : 0;
                if (minutes > 0) {
                    minutesTotal += minutes;
                    minutesMatches += 1;
                }
                minutesPossible += typeof window.getMatchDurationForMinutesShare === 'function'
                    ? window.getMatchDurationForMinutesShare(match)
                    : 90;
            });

            return {
                minutesTotal,
                minutesMatches,
                minutesPossible,
                minutesAvg: minutesMatches > 0 ? minutesTotal / minutesMatches : 0,
                minutesSharePct: minutesPossible > 0
                    ? Math.min(100, Math.round((minutesTotal / minutesPossible) * 100))
                    : null
            };
        };

        window.buildPlayerPositionFilterStatsData = function(options = {}) {
            const yearFilter = options.yearFilter !== undefined
                ? options.yearFilter
                : (typeof window.getStatsSpillerYearFilter === 'function'
                    ? window.getStatsSpillerYearFilter()
                    : 'alle');
            const overall = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true, yearFilter })
                : [];
            const positionId = window.getStatsSpillerPositionFilter();
            if (!positionId || positionId === 'alle') return overall;
            if (typeof window.buildPlayerPositionMatchStats !== 'function') return [];

            return overall.map((stat) => {
                const player = (window.activePlayers || []).find((item) => item.navn === stat.navn);
                if (!player) return null;
                const row = (window.buildPlayerPositionMatchStats(player, { yearFilter }) || [])
                    .find((entry) => entry.posId === positionId);
                if (!row || !window.playerMeetsPositionStatsThreshold(row)) return null;

                const kamper = Number(row.matches) || 0;
                const minuteStats = typeof window.getPlayerPositionSpillerborsMinutes === 'function'
                    ? window.getPlayerPositionSpillerborsMinutes(player, positionId, yearFilter)
                    : {
                        minutesTotal: 0,
                        minutesMatches: 0,
                        minutesPossible: 0,
                        minutesAvg: 0,
                        minutesSharePct: null
                    };
                const seasonStat = typeof window.getMatchGamePlanPlayerSeasonStat === 'function'
                    ? window.getMatchGamePlanPlayerSeasonStat(player, yearFilter)
                    : null;
                const kjemi = typeof window.computeMatchGamePlanPositionForm === 'function'
                    ? window.computeMatchGamePlanPositionForm(row.entries)
                    : 0;
                const totalScore = typeof window.computeMatchGamePlanPositionSeason === 'function'
                    ? window.computeMatchGamePlanPositionSeason(row, seasonStat)
                    : 0;

                return {
                    ...stat,
                    kamper,
                    attendedMatches: kamper,
                    kampSharePct: Number(stat.teamKampCount) > 0
                        ? Math.round((kamper / Number(stat.teamKampCount)) * 1000) / 10
                        : 0,
                    mal: Number(row.goals) || 0,
                    assist: Number(row.assists) || 0,
                    expectedMalpoeng: kamper > 0
                        ? Math.round((((Number(row.goals) || 0) + (Number(row.assists) || 0)) / kamper) * 10) / 10
                        : null,
                    kampbonus: kamper > 0 ? (Number(row.points) || 0) / kamper : 0,
                    kampbonusTotal: Number(row.points) || 0,
                    kjemi,
                    snittBors: row.ratingsCount > 0 ? row.ratingsSum / row.ratingsCount : 0,
                    bb: Number(row.bb) || 0,
                    minutesTotal: Number(minuteStats.minutesTotal) || 0,
                    minutesMatches: Number(minuteStats.minutesMatches) || 0,
                    minutesAvg: Number(minuteStats.minutesAvg) || 0,
                    minutesPossible: Number(minuteStats.minutesPossible) || 0,
                    minutesSharePct: minuteStats.minutesSharePct,
                    totalScore
                };
            }).filter(Boolean);
        };

        window.getStatsSpillerListData = function() {
            return typeof window.buildPlayerPositionFilterStatsData === 'function'
                ? window.buildPlayerPositionFilterStatsData({ applyYearFilter: true })
                : (typeof window.buildPlayerStatsData === 'function'
                    ? window.buildPlayerStatsData({ applyYearFilter: true })
                    : []);
        };

        window.renderStatsSpillerPositionFilterHtml = function() {
            const active = window.getStatsSpillerPositionFilter();
            return `
                <div class="stats-player-sort-dock stats-player-position-dock" aria-label="Filtrer etter posisjon" data-no-swipe>
                    <div class="stats-player-toolbar">
                        <div class="stats-sort-scroller-wrap">
                            <div class="stats-sort-scroller" id="stats-player-position-scroller" data-no-swipe>
                                <div class="roster-status-filter stats-sort-filter" role="tablist" aria-label="Filtrer etter posisjon">
                                    ${(window.STATS_SPILLER_POSITION_OPTIONS || []).map((opt) => `
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected="${active === opt.id ? 'true' : 'false'}"
                                            class="bsk-btn bsk-btn-chip roster-status-btn stats-sort-btn stats-position-btn ${active === opt.id ? 'is-active' : ''}"
                                            data-stat-action="set-spiller-position"
                                            data-position-id="${escapeStatisticsHtml(opt.id)}"
                                            aria-label="${escapeStatisticsHtml(opt.label)}"
                                            title="${escapeStatisticsHtml(opt.label)}"
                                        >
                                            <span class="stats-sort-label">${escapeStatisticsHtml(opt.label)}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        window.setStatsSpillerPositionFilter = function(positionId) {
            const ids = (window.STATS_SPILLER_POSITION_OPTIONS || []).map((opt) => opt.id);
            window.statsSpillerPositionFilter = ids.includes(positionId) ? positionId : 'alle';
            window._statsPlayerListExpanded = false;
            if (typeof window.renderSpillereView === 'function') {
                window.renderSpillereView();
            }
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

        window.renderStatsHeroTabsHtml = function() {
            return `
                <div class="stats-hero-tabs stats-hero-tabs-info-only">
                    <button
                        type="button"
                        data-stat-action="open-form-info"
                        class="training-session-groups-info-btn stats-chrome-info-btn"
                        title="Statsforklaring"
                        aria-label="Statsforklaring"
                    >
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        };

        window.playerStatsRelevantForSort = function(stat, column) {
            switch (column) {
                case 'totalScore': return stat.totalScore > 0 && ((Number(stat.attendedMatches) || 0) > 0 || (Number(stat.oppmotePct) || 0) > 0);
                case 'gule':
                case 'guleSerie': return ((Number(stat.gule) || 0) || (Number(stat.guleSerie) || 0) + (Number(stat.guleCup) || 0)) > 0;
                case 'rode':
                case 'rodeSerie': return ((Number(stat.rode) || 0) || (Number(stat.rodeSerie) || 0) + (Number(stat.rodeCup) || 0)) > 0;
                case 'mal': return stat.mal > 0;
                case 'assist': return stat.assist > 0;
                case 'expectedMalpoeng': return (Number(stat.kamper) || 0) > 0
                    && stat.expectedMalpoeng != null
                    && Number(stat.expectedMalpoeng) > 0;
                case 'bb': return stat.bb > 0;
                case 'kamper': return stat.kamper > 0;
                case 'kampbonus': return stat.attendedMatches > 0;
                case 'kampbonusTotal': return (Number(stat.kampbonusTotal) || 0) > 0;
                case 'kjemi': return stat.kjemi > 0;
                case 'snittBors': return stat.snittBors > 0;
                case 'oppmotePct': return (Number(stat.oppmotePossible) || 0) > 0;
                case 'oppmoteSamletPct': return (Number(stat.oppmoteSamletPossible) || 0) > 0;
                case 'minutesTotal': return (Number(stat.minutesTotal) || 0) > 0;
                case 'minutesSharePct': return (Number(stat.minutesPossible) || 0) > 0 && stat.minutesSharePct != null;
                case 'attendedMatches': return (Number(stat.attendedMatches) || 0) > 0;
                default: return true;
            }
        };

        window.getStatsSortEmptyMessage = function(column) {
            const labels = {
                gule: 'gule kort',
                guleSerie: 'gule kort',
                rode: 'røde kort',
                rodeSerie: 'røde kort',
                totalScore: 'total score',
                mal: 'mål',
                assist: 'assist',
                expectedMalpoeng: 'expected målpoeng',
                bb: 'banens beste',
                kamper: 'kamper',
                kampbonus: 'kampbidrag',
                kjemi: 'form',
                snittBors: 'spillerbørs',
                oppmotePct: 'oppmøte',
                minutesTotal: 'spilleminutter',
                minutesSharePct: 'minuttandel'
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
            if (column === 'minutesSharePct') return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : '-';
            if (column === 'minutesTotal') return numeric > 0 ? `${Math.round(numeric)}'` : '-';
            if (column === 'kjemi') return String(Math.round(numeric));
            if (column === 'kampbonus' || column === 'snittBors' || column === 'totalScore') return numeric > 0 ? numeric.toFixed(1) : '-';
            if (column === 'expectedMalpoeng') {
                if (!Number.isFinite(numeric) || numeric <= 0) return '-';
                return numeric.toFixed(1);
            }
            if (numeric > 0 || column === 'kamper') return String(Math.round(numeric));
            return '-';
        };

        window.formatMinutesTotalDisplay = function(stat) {
            const total = Math.round(Number(stat?.minutesTotal) || 0);
            if (total <= 0) return '-';
            const avg = Math.round(Number(stat.minutesAvg) || 0);
            return `${total}' / ${avg}'`;
        };

        window.formatExpectedMalpoengDisplay = function(stat) {
            if (!stat || !(Number(stat.kamper) > 0) || stat.expectedMalpoeng == null) return '-';
            const value = Number(stat.expectedMalpoeng);
            if (!Number.isFinite(value) || value <= 0) return '-';
            return `${value.toFixed(1)} · ${Number(stat.kamper) || 0} kamper`;
        };

        window.formatOppmoteDisplay = function(stat) {
            const possible = Number(stat?.oppmotePossible) || 0;
            if (possible <= 0) return '-';
            const pct = Math.round(Number(stat.oppmotePct) || 0);
            const attended = Number(stat.oppmoteAttended) || 0;
            return `${pct}% ${attended}/${possible}`;
        };

        window.playerMeetsKampShareThreshold = function(stat) {
            return (Number(stat?.kampSharePct) || 0) >= 50;
        };

        window.statsSortUsesKampShareThreshold = function(column) {
            return column === 'totalScore'
                || column === 'kampbonus'
                || column === 'kampbonusTotal'
                || column === 'kjemi'
                || column === 'snittBors'
                || column === 'expectedMalpoeng'
                || column === 'minutesSharePct';
        };

        window.playerQualifiesForStatsSort = function(stat, column) {
            if (typeof window.statsSortUsesKampShareThreshold === 'function'
                && !window.statsSortUsesKampShareThreshold(column)) {
                return true;
            }
            return typeof window.playerMeetsKampShareThreshold === 'function'
                ? window.playerMeetsKampShareThreshold(stat)
                : true;
        };

        window.getStatsSortTiebreakKamper = function(column) {
            return column === 'mal' || column === 'assist' || column === 'bb' || column === 'gule' || column === 'expectedMalpoeng' ? 'fewer' : 'more';
        };

        window.comparePlayerStatsSort = function(a, b, column, options = {}) {
            const descending = options.descending !== false;
            if (column === 'navn') {
                const nameCmp = String(a?.navn || '').localeCompare(String(b?.navn || ''), 'nb', { sensitivity: 'base' });
                return descending ? nameCmp : -nameCmp;
            }
            let va = Number(a?.[column]) || 0;
            let vb = Number(b?.[column]) || 0;
            if (column === 'snittBors' || column === 'totalScore') {
                va = Math.round(va * 10) / 10;
                vb = Math.round(vb * 10) / 10;
            }
            if (va !== vb) return descending ? vb - va : va - vb;
            // Lik trenings-%: flest oppmøter først (ved synkende sortering)
            if (column === 'oppmotePct' || column === 'oppmoteSamletPct') {
                const attendedKey = column === 'oppmoteSamletPct' ? 'oppmoteSamletAttended' : 'oppmoteAttended';
                const aa = Number(a?.[attendedKey]) || 0;
                const ab = Number(b?.[attendedKey]) || 0;
                if (aa !== ab) return descending ? ab - aa : aa - ab;
            }
            const ka = Number(a?.kamper) || 0;
            const kb = Number(b?.kamper) || 0;
            if (ka !== kb) {
                const fewerWins = (options.tiebreakKamper || window.getStatsSortTiebreakKamper(column)) === 'fewer';
                return fewerWins ? ka - kb : kb - ka;
            }
            return String(a?.navn || '').localeCompare(String(b?.navn || ''), 'nb', { sensitivity: 'base' });
        };

        window.playerMeetsExpectedMalpoengThreshold = function(stat) {
            return window.playerMeetsKampShareThreshold(stat);
        };

        window.formatStatsMedianDelta = function(column, playerValue, median) {
            if (median === null || median === undefined) return { text: '', tone: 'is-equal' };

            const delta = Number(playerValue) - Number(median);
            if (Number.isNaN(delta)) return { text: '', tone: 'is-equal' };

            if (Math.abs(delta) < 0.05) {
                return { text: '+0', tone: 'is-equal' };
            }

            const rounded = (column === 'oppmotePct' || column === 'minutesSharePct')
                ? Math.round(delta)
                : (column === 'kampbonus' || column === 'snittBors' || column === 'totalScore' || column === 'expectedMalpoeng')
                    ? Math.round(delta * 10) / 10
                    : Math.round(delta);
            const suffix = (column === 'oppmotePct' || column === 'minutesSharePct') ? '%' : '';
            const sign = rounded > 0 ? '+' : '';
            return {
                text: `${sign}${rounded}${suffix}`,
                tone: rounded > 0 ? 'is-above' : 'is-below'
            };
        };

        window.getStatsPlayerRank = function(playerName, column, statsData) {
            let relevantStats = statsData.filter(stat => window.playerStatsRelevantForSort(stat, column));
            if (typeof window.playerQualifiesForStatsSort === 'function') {
                relevantStats = relevantStats.filter(stat => window.playerQualifiesForStatsSort(stat, column));
            }
            const useActiveSort = column === currentStatSortCol;
            const descending = !(useActiveSort && !currentStatSortDesc);

            relevantStats.sort((a, b) => (
                typeof window.comparePlayerStatsSort === 'function'
                    ? window.comparePlayerStatsSort(a, b, column, { descending })
                    : (descending ? b[column] - a[column] : a[column] - b[column])
            ));

            const index = relevantStats.findIndex(stat => stat.navn === playerName);
            return index === -1 ? null : index + 1;
        };

        window.getStatsSortedLeader = function(sortCol, statsData) {
            const relevantStats = statsData.filter(stat => {
                if (!window.playerStatsRelevantForSort(stat, sortCol)) return false;
                if (typeof window.playerQualifiesForStatsSort === 'function' && !window.playerQualifiesForStatsSort(stat, sortCol)) {
                    return false;
                }
                return true;
            });
            relevantStats.sort((a, b) => (
                typeof window.comparePlayerStatsSort === 'function'
                    ? window.comparePlayerStatsSort(a, b, sortCol, { descending: currentStatSortDesc !== false })
                    : (currentStatSortDesc
                        ? b[sortCol] - a[sortCol]
                        : a[sortCol] - b[sortCol])
            ));
            return relevantStats[0] || null;
        };

        window.getStatsSortMedian = function(column, statsData, teamName) {
            const pool = statsData.filter(stat => {
                if (teamName && stat.spillerLag !== teamName) return false;
                if (!window.playerStatsRelevantForSort(stat, column)) return false;
                if (typeof window.playerQualifiesForStatsSort === 'function' && !window.playerQualifiesForStatsSort(stat, column)) {
                    return false;
                }
                return true;
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
            const mainText = window.formatStatsSortValue(leader, column);
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
            const rows = Array.isArray(statsData) ? statsData : [];
            const pickLeader = (column) => {
                const relevant = rows.filter(stat => {
                    if (!window.playerStatsRelevantForSort(stat, column)) return false;
                    if (typeof window.playerQualifiesForStatsSort === 'function') {
                        return window.playerQualifiesForStatsSort(stat, column);
                    }
                    return true;
                });
                if (!relevant.length) return null;
                relevant.sort((a, b) => {
                    if (typeof window.comparePlayerStatsSort === 'function') {
                        return window.comparePlayerStatsSort(a, b, column);
                    }
                    return (Number(b[column]) || 0) - (Number(a[column]) || 0);
                });
                return relevant[0] || null;
            };
            const seasonLeader = pickLeader('totalScore');
            const nowLeader = pickLeader('kjemi');
            const positionOption = typeof window.getStatsSpillerPositionFilterOption === 'function'
                ? window.getStatsSpillerPositionFilterOption()
                : { id: 'alle', label: 'Alle' };
            const positionSuffix = positionOption.id && positionOption.id !== 'alle'
                ? ` · ${positionOption.label}`
                : '';

            const card = (horizon, title, leader, column) => {
                if (!leader) {
                    return `
                        <div class="stats-best-player-card ${horizon}">
                            <span class="stats-best-player-eyebrow">${title}</span>
                            <span class="stats-best-player-name">—</span>
                            <span class="stats-best-player-meta">Ingen data</span>
                        </div>
                    `;
                }
                const valueText = column === 'kjemi'
                    ? `${window.formatStatsSortValue(leader, column)}/100`
                    : window.formatStatsSortValue(leader, column);
                const playerId = typeof getStatsPlayerIdForName === 'function'
                    ? getStatsPlayerIdForName(leader.navn)
                    : '';
                return `
                    <button
                        type="button"
                        data-stat-action="open-player"
                        data-player-id="${escapeStatisticsHtml(playerId)}"
                        data-player-name="${escapeStatisticsHtml(leader.navn)}"
                        class="stats-best-player-card ${horizon} is-clickable"
                    >
                        <span class="stats-best-player-eyebrow">${title}</span>
                        <span class="stats-best-player-name">${escapeStatisticsHtml(leader.navn)}</span>
                        <span class="stats-best-player-meta">${escapeStatisticsHtml(valueText)}</span>
                    </button>
                `;
            };

            return `
                <div class="stats-best-player-horizons">
                    ${card('is-season', `Beste sesong${positionSuffix}`, seasonLeader, 'totalScore')}
                    ${card('is-now', `Beste nå${positionSuffix}`, nowLeader, 'kjemi')}
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

        window.formatStatsTrendDelta = function(delta, suffix = '') {
            if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return '—';
            const value = Number(delta);
            const rounded = Math.round(value * 10) / 10;
            const prefix = rounded > 0 ? '+' : '';
            return `${prefix}${rounded}${suffix}`;
        };

        window.renderTeamSeasonTrendStatGridHtml = function({ label, season, lastFive, baseline, inverted = false, suffix = '', title = '' }) {
            const delta = (lastFive !== null && lastFive !== undefined && baseline !== null && baseline !== undefined)
                ? Number(lastFive) - Number(baseline)
                : null;
            const trendTone = delta === null
                ? ''
                : (inverted
                    ? (delta < 0 ? 'is-up' : (delta > 0 ? 'is-down' : 'is-flat'))
                    : (delta > 0 ? 'is-up' : (delta < 0 ? 'is-down' : 'is-flat')));
            const formatValue = (value) => (
                value === null || value === undefined || Number.isNaN(Number(value))
                    ? '—'
                    : `${Number(value)}${suffix}`
            );
            const titleAttr = title
                ? ` title="${escapeStatisticsHtml(title)}"`
                : '';

            return `
                <div class="stats-team-season-trend-block">
                    <h5 class="stats-team-season-trend-title"${titleAttr}>${escapeStatisticsHtml(label)}</h5>
                    <div class="training-data-stat-grid">
                        <div class="training-data-stat">
                            <span class="training-data-stat-label">Sesong</span>
                            <strong>${escapeStatisticsHtml(formatValue(season))}</strong>
                        </div>
                        <div class="training-data-stat">
                            <span class="training-data-stat-label">Siste 5</span>
                            <strong>${escapeStatisticsHtml(formatValue(lastFive))}</strong>
                        </div>
                        <div class="training-data-stat ${trendTone}">
                            <span class="training-data-stat-label">Retning</span>
                            <strong>${escapeStatisticsHtml(window.formatStatsTrendDelta(delta, suffix))}</strong>
                        </div>
                    </div>
                </div>
            `;
        };

        window.renderKamputviklingCardsHtml = function(report) {
            const trends = report?.trends || {};
            return `
                <div class="stats-team-season-trends">
                    ${window.renderTeamSeasonTrendStatGridHtml({
                        label: 'Mål scoret',
                        season: trends.seasonFor,
                        lastFive: trends.lastFiveFor,
                        baseline: trends.baselineFor ?? trends.allFor,
                        suffix: ''
                    })}
                    ${window.renderTeamSeasonTrendStatGridHtml({
                        label: 'Mål imot',
                        season: trends.seasonAgainst,
                        lastFive: trends.lastFiveAgainst,
                        baseline: trends.baselineAgainst ?? trends.allAgainst,
                        inverted: true,
                        suffix: ''
                    })}
                    ${window.renderTeamSeasonTrendStatGridHtml({
                        label: 'Kampbidrag per kamp',
                        season: trends.seasonKampbidrag,
                        lastFive: trends.lastFiveKampbidrag,
                        baseline: trends.baselineKampbidrag ?? trends.allKampbidrag,
                        suffix: '',
                        title: 'Snitt kampbidrag blant oppmøtte i hver kamp — hver kamp teller likt'
                    })}
                </div>
            `;
        };

        window.renderTeamSeasonStatChipHtml = function(label, value, title = '') {
            const titleAttr = title
                ? ` title="${escapeStatisticsHtml(title)}"`
                : '';
            return `
                <div class="player-profile-stat-chip stats-team-season-chip"${titleAttr}>
                    <span class="player-profile-stat-chip-label">${escapeStatisticsHtml(label)}</span>
                    <span class="player-profile-stat-chip-value">${escapeStatisticsHtml(value)}</span>
                </div>
            `;
        };

        window.buildTeamSeasonStatsGridHtml = function(data, report) {
            const filterLag = data?.filterLag && data.filterLag !== 'Alle' ? data.filterLag : '';
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : 'alle';

            let assists = 0;
            let guleKort = 0;
            let rodeKort = 0;
            let ratingSum = 0;
            let ratingCount = 0;
            let kampbidragSum = 0;
            let kampbidragCount = 0;

            const matches = (window.activeMatches || []).filter(m => {
                if (!m.result || !String(m.result).includes('-')) return false;
                if (filterLag && m.matchGroup !== filterLag) return false;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                if (typeof window.matchBelongsToStatsKampFilters === 'function' && !window.matchBelongsToStatsKampFilters(m)) return false;
                if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(m, yearFilter)) return false;
                return true;
            });

            const teamPlayers = (window.activePlayers || []).filter(p => !filterLag || p.spillerLag === filterLag);

            matches.forEach(match => {
                teamPlayers.forEach(player => {
                    if (!window.isPlayerAttending(match.attendance, player)) return;
                    assists += Number(window.getPlayerRefMapValue(match.assists, player, 0)) || 0;
                    const rating = Number(window.getPlayerRefMapValue(match.ratings, player, 0));
                    if (Number.isFinite(rating) && rating > 0) {
                        ratingSum += rating;
                        ratingCount += 1;
                    }
                    if (typeof window.calculatePlayerMatchPoints === 'function') {
                        kampbidragSum += Number(window.calculatePlayerMatchPoints(match, player)) || 0;
                        kampbidragCount += 1;
                    }
                });

                // Kort telles fra Serie + Cup (samme kamptyper som getPlayerCardCounts).
                if (match.matchType === 'Serie' || match.matchType === 'Cup') {
                    guleKort += Array.isArray(match.guleKort) ? match.guleKort.length : 0;
                    rodeKort += Array.isArray(match.rodeKort) ? match.rodeKort.length : 0;
                }
            });

            const snittBors = ratingCount > 0 ? (Math.round((ratingSum / ratingCount) * 10) / 10).toFixed(1) : '-';
            const kampbidrag = kampbidragCount > 0
                ? String(Math.round((kampbidragSum / kampbidragCount) * 10) / 10)
                : '-';
            const chip = window.renderTeamSeasonStatChipHtml;

            let totalScoreLabel = '-';
            if (typeof window.buildPlayerStatsData === 'function') {
                const totalScores = window.buildPlayerStatsData({
                    applyYearFilter: yearFilter !== 'alle',
                    yearFilter
                })
                    .filter(stat => (
                        (!filterLag || stat.spillerLag === filterLag) &&
                        (Number(stat.totalScore) || 0) > 0
                    ))
                    .map(stat => Number(stat.totalScore))
                    .filter(score => Number.isFinite(score) && score > 0);
                const medianTotal = typeof window.getMedianOfNumbers === 'function'
                    ? window.getMedianOfNumbers(totalScores)
                    : null;
                if (medianTotal != null) totalScoreLabel = String(medianTotal);
            }

            return `
                <div class="stats-team-season-wrap">
                    ${typeof window.renderKamputviklingCardsHtml === 'function'
                        ? window.renderKamputviklingCardsHtml(report)
                        : ''}
                    <div class="player-profile-stat-grid stats-team-season-grid">
                        ${chip('Kamper', String(report?.matchCount ?? 0))}
                        ${chip('Seire', String(data?.wins ?? 0))}
                        ${chip('Uavgjort', String(data?.draws ?? 0))}
                        ${chip('Tap', String(data?.losses ?? 0))}
                        ${chip('Mål', String(data?.goals ?? 0))}
                        ${chip('Mål imot', String(report?.conceded ?? 0))}
                        ${chip('Assist', String(assists))}
                        ${chip('Børs', snittBors)}
                        ${chip(
                            'Kampbidrag per spiller',
                            kampbidrag,
                            'Snitt kampbidrag per oppmøtt spiller på tvers av alle kamper'
                        )}
                        ${chip('Totalscore', totalScoreLabel)}
                        ${chip('Gule kort', String(guleKort))}
                        ${chip('Røde kort', String(rodeKort))}
                    </div>
                </div>
            `;
        };

        window.buildTeamMatchHistoryHtml = function(data) {
            const filterLag = data?.filterLag && data.filterLag !== 'Alle' ? data.filterLag : '';
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : 'alle';
            const matchHistory = [];

            const matches = (window.activeMatches || []).filter(m => {
                if (!m.result || !String(m.result).includes('-')) return false;
                if (filterLag && m.matchGroup !== filterLag) return false;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return false;
                if (typeof window.matchBelongsToStatsKampFilters === 'function' && !window.matchBelongsToStatsKampFilters(m)) return false;
                if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(m, yearFilter)) return false;
                return true;
            });

            const teamPlayers = (window.activePlayers || []).filter(p => !filterLag || p.spillerLag === filterLag);

            matches.forEach(match => {
                let matchRatingSum = 0;
                let matchRatingCount = 0;
                let matchPointsSum = 0;
                let matchPointsCount = 0;

                teamPlayers.forEach(player => {
                    if (!window.isPlayerAttending(match.attendance, player)) return;
                    const rating = Number(window.getPlayerRefMapValue(match.ratings, player, 0));
                    if (Number.isFinite(rating) && rating > 0) {
                        matchRatingSum += rating;
                        matchRatingCount += 1;
                    }
                    if (typeof window.calculatePlayerMatchPoints === 'function') {
                        const details = window.calculatePlayerMatchPoints(match, player, true);
                        if (details && details.onPitch === false) return;
                        matchPointsSum += Number(details?.total) || 0;
                        matchPointsCount += 1;
                    }
                });

                const score = typeof window.getMatchOutcomeScore === 'function'
                    ? window.getMatchOutcomeScore(match)
                    : null;
                let form = '';
                if (score) {
                    if (score.bsk > score.opponent) form = 'S';
                    else if (score.bsk < score.opponent) form = 'T';
                    else form = 'U';
                }

                const storedFormation = String(match.formation || match.lineupFormation || '').trim();
                const formation = storedFormation
                    ? (typeof window.getMatchGamePlanFormation === 'function'
                        ? window.getMatchGamePlanFormation(match)
                        : storedFormation)
                    : '';

                matchHistory.push({
                    matchId: match.id,
                    date: match.date,
                    opponent: match.opponent,
                    matchType: match.matchType || 'Kamp',
                    result: typeof window.formatStatsBskFirstResult === 'function'
                        ? window.formatStatsBskFirstResult(match)
                        : (match.result || '-'),
                    venue: match.venue === 'Borte' ? 'Borte' : (match.venue === 'Hjemme' ? 'Hjemme' : ''),
                    form,
                    rating: matchRatingCount > 0
                        ? Math.round((matchRatingSum / matchRatingCount) * 10) / 10
                        : '-',
                    avgPoints: matchPointsCount > 0
                        ? Math.round((matchPointsSum / matchPointsCount) * 10) / 10
                        : '-',
                    yellowCards: Array.isArray(match.guleKort) ? match.guleKort.length : 0,
                    redCards: Array.isArray(match.rodeKort) ? match.rodeKort.length : 0,
                    formation
                });
            });

            const tableHtml = typeof window.renderTeamMatchHistoryTableHtml === 'function'
                ? window.renderTeamMatchHistoryTableHtml(matchHistory)
                : '';

            return `
                <div class="stats-team-match-history">
                    <div class="stats-form-history-table-wrap">${tableHtml}</div>
                </div>
            `;
        };

        window.renderStatsOppmotePanelHtml = function(data) {
            if (!data) return '';
            const attendanceTone = data.avgAttendance >= 75 ? 'is-win' : data.avgAttendance >= 60 ? 'is-draw' : 'is-loss';
            const summaryItem = (label, valueHtml, tone = '', icon = 'fa-circle', hint = '') => `
                <div class="stats-analysis-chip ${tone}">
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                    <span class="stats-analysis-chip-label">${label}</span>
                    <strong class="stats-analysis-chip-value">${valueHtml}</strong>
                    ${hint ? `<span class="stats-analysis-chip-hint">${hint}</span>` : ''}
                </div>
            `;
            const oppmoteTeamName = data.filterLag && data.filterLag !== 'Alle' ? data.filterLag : '';
            const oppmoteRange = typeof window.getStatsOppmoteRangeFilter === 'function'
                ? window.getStatsOppmoteRangeFilter()
                : 'season';
            const oppmoteIsLast8 = oppmoteRange === 'last8';
            const oppmoteContent = typeof window.buildTrainingDataAttendanceHtml === 'function'
                ? window.buildTrainingDataAttendanceHtml(oppmoteTeamName, {
                    listExpandedKey: '_statsOppmoteListExpanded',
                    toggleActionAttr: 'data-stat-action',
                    toggleAction: 'toggle-attendance-list',
                    eventLimit: oppmoteIsLast8 ? 8 : null,
                    rangeLabel: oppmoteIsLast8 ? 'Siste 8' : 'Sesong',
                    ownAttendanceThreshold: 30
                })
                : `
                    <p class="stats-kamp-panel-hint">Oppmøteregistrering på historiske aktiviteter for valgt lag.</p>
                    <div class="stats-analysis-strip stats-analysis-strip-single">
                        ${summaryItem('Oppmøte', `${data.avgAttendance}%`, attendanceTone, 'fa-user-check', 'av mulige registreringer')}
                    </div>
                `;
            const oppmotePanel = window.renderStatsCollapsiblePanelHtml({
                id: 'oppmote',
                title: 'Oppmøte',
                showLabel: 'Vis oppmøte',
                hideLabel: 'Skjul oppmøte',
                headingExtraHtml: `
                    <div class="stats-kamp-year-filter stats-oppmote-range-filter" role="tablist" aria-label="Filtrer oppmøteperiode">
                        <button
                            type="button"
                            role="tab"
                            aria-selected="${oppmoteIsLast8 ? 'false' : 'true'}"
                            class="bsk-btn bsk-btn-chip stats-kamp-year-btn ${oppmoteIsLast8 ? '' : 'is-active'}"
                            data-stat-action="set-oppmote-range"
                            data-range="season"
                        >Sesong</button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected="${oppmoteIsLast8 ? 'true' : 'false'}"
                            class="bsk-btn bsk-btn-chip stats-kamp-year-btn ${oppmoteIsLast8 ? 'is-active' : ''}"
                            data-stat-action="set-oppmote-range"
                            data-range="last8"
                        >Siste 8</button>
                    </div>
                `,
                content: oppmoteContent
            });
            return oppmotePanel;
        };

        window.renderStatsKampdataPanelHtml = function(data, report) {
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : new Date().getFullYear();
            return window.renderStatsCollapsiblePanelHtml({
                id: 'kampdata',
                title: 'Sesong i tall',
                badge: String(yearFilter),
                showLabel: 'Vis sesong i tall',
                hideLabel: 'Skjul sesong i tall',
                content: typeof window.buildTeamSeasonStatsGridHtml === 'function'
                    ? window.buildTeamSeasonStatsGridHtml(data, report)
                    : ''
            });
        };

        window.renderStatsKampForKampPanelHtml = function(data) {
            const yearFilter = typeof window.getStatsKampYearFilter === 'function'
                ? window.getStatsKampYearFilter()
                : new Date().getFullYear();
            return window.renderStatsCollapsiblePanelHtml({
                id: 'kampforkamp',
                title: 'Kamp for Kamp',
                showLabel: 'Vis kamp for kamp',
                hideLabel: 'Skjul kamp for kamp',
                clash: true,
                markHtml: '<span class="stats-clash-heading-mark" aria-hidden="true"><i class="fa-solid fa-futbol"></i></span>',
                headerActionsHtml: `<span class="stats-clash-year">${escapeStatisticsHtml(String(yearFilter))}</span>`,
                content: typeof window.buildTeamMatchHistoryHtml === 'function'
                    ? window.buildTeamMatchHistoryHtml(data)
                    : ''
            });
        };

        window.renderStatsKampstatsPanelHtml = function() {
            return window.renderStatsCollapsiblePanelHtml({
                id: 'kampstats',
                title: 'Kampstats',
                showLabel: 'Vis kampstats',
                hideLabel: 'Skjul kampstats',
                content: `
                    <div id="stats-lag-kampdata-detail" class="stats-lag-kampdata-detail"></div>
                `
            });
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
            if (target === 'redCards') return openPlayerStats('rode');
            if (target === 'yellowCards') return openPlayerStats('gule');
        };

        window.statsScoreDiagramMode = window.statsScoreDiagramMode || 'total';
        window.statsScoreDiagramKind = window.statsScoreDiagramKind || 'tropp';
        window.statsScoreDiagramExplanationOpen = window.statsScoreDiagramExplanationOpen || false;
        window.statsDiagramInfoOpen = window.statsDiagramInfoOpen || {
            main: window.statsScoreDiagramExplanationOpen === true,
            form: false,
            line: false
        };
        window.STATS_DIAGRAM_INFO_KEYS = ['main', 'form', 'line'];
        window.STATS_SCORE_DIAGRAM_KINDS = [
            { id: 'tropp', label: 'Tropp' },
            { id: 'tillit', label: 'Tillit' },
            { id: 'produksjon', label: 'Produksjon' },
            { id: 'trening', label: 'Trening' }
        ];
        window.statsLineDiagramKind = window.statsLineDiagramKind || 'forsvar';
        window.STATS_LINE_DIAGRAM_KINDS = [
            { id: 'forsvar', label: 'Forsvar' },
            { id: 'midtbane', label: 'Midtbane' },
            { id: 'angrep', label: 'Angrep' }
        ];
        window.STATS_LINE_DIAGRAM_POSITION_IDS = {
            forsvar: ['VB', 'VMS', 'MS', 'HMS', 'HB'],
            midtbane: ['PM', 'OM', 'DM'],
            angrep: ['VK', 'SP', 'SP2', 'HK']
        };
        window.STATS_LINE_DIAGRAM_SLOT_ALIASES = {
            VS: 'VMS',
            HS: 'HMS',
            SV: 'SP',
            SH: 'SP2'
        };

        window.getStatsScoreDiagramKind = function() {
            const ids = (window.STATS_SCORE_DIAGRAM_KINDS || []).map(kind => kind.id);
            return ids.includes(window.statsScoreDiagramKind) ? window.statsScoreDiagramKind : 'tropp';
        };

        window.getStatsDiagramYearFilter = function() {
            return typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle');
        };

        window.getStatsDiagramInfoKey = function(which) {
            return (window.STATS_DIAGRAM_INFO_KEYS || []).includes(which) ? which : 'main';
        };

        window.getStatsLineDiagramKind = function() {
            const ids = (window.STATS_LINE_DIAGRAM_KINDS || []).map(kind => kind.id);
            return ids.includes(window.statsLineDiagramKind) ? window.statsLineDiagramKind : 'forsvar';
        };

        window.isStatsDiagramInfoOpen = function(which) {
            return window.statsDiagramInfoOpen?.[window.getStatsDiagramInfoKey(which)] === true;
        };

        window.renderStatsDiagramExplanationHtml = function(which) {
            const isTotal = (window.statsScoreDiagramMode || 'total') !== 'five';
            const kind = window.getStatsScoreDiagramKind();
            if (which === 'form') {
                return `
                    <p class="training-session-groups-info-title">Formkart</p>
                    <ul class="training-session-groups-info-list">
                        <li>Høyre er kampbidrag gjennom sesongen. Opp er kampbidrag nå (siste 5 kamper).</li>
                        <li>Den gule diagonalen er «som vanlig». Over den er i form. Under den er på vei ned.</li>
                        <li>Gul boble er som vanlig. Grønn er over egen sesong. Rød er under. Trykk på en boble for navn.</li>
                    </ul>
                `;
            }
            if (which === 'line') {
                const lineLabels = {
                    forsvar: 'Forsvar',
                    midtbane: 'Midtbane',
                    angrep: 'Angrep'
                };
                const lineLabel = lineLabels[window.getStatsLineDiagramKind()] || 'Linjen';
                return `
                    <p class="training-session-groups-info-title">Linjekart · ${lineLabel}</p>
                    <ul class="training-session-groups-info-list">
                        <li>Midtbane er PM, OM og DM. Angrep er VK, SV, SP, SH og HK. Forsvar er VB, VS, MS, HS og HB.</li>
                        <li>Hver boble er de som startet på ${lineLabel.toLowerCase()}et i kampen. Høyre er snitt kampbidrag. Opp er snitt spillerbørs.</li>
                        <li>Tallet i boblen er antall kamper. Trykk for navnene: grønt pluss drar snittet opp, rødt minus drar det ned. Kampbidrag først, så børs.</li>
                    </ul>
                `;
            }
            const kindCopy = {
                tropp: isTotal ? `
                    <li><strong>Troppkart · Sesong:</strong> Høyre er høyt kampbidrag. Opp er høy snittbørs.</li>
                    <li>Oppe til høyre leverer. Boblen viser Total Score. Trykk på en boble for navn. Gul ring / tall betyr flere på samme sted.</li>
                ` : `
                    <li><strong>Troppkart · Nå:</strong> Høyre er kampbidrag i de siste 5 kampene. Opp er snittbørs i samme periode.</li>
                    <li>Grønn boble er over egen sesongscore. Rød boble er under. Trykk på en boble for navn.</li>
                `,
                tillit: isTotal ? `
                    <li><strong>Tillitskart · Sesong:</strong> Høyre er mye spilletid. Opp er høy snittbørs.</li>
                    <li>Oppe til høyre er kjernen. Oppe til venstre er kvalitet som sitter. Nede til høyre er overbrukt. Trykk på en boble for minuttandel.</li>
                ` : `
                    <li><strong>Tillitskart · Nå:</strong> Minuttandel i de siste 5 lagkampene med spilletid, også kamper de ikke spilte.</li>
                    <li>Grønn boble får mer spilletid enn egen sesong. Rød boble får mindre. Trykk på en boble for minuttandel.</li>
                `,
                produksjon: isTotal ? `
                    <li><strong>Produksjonskart · Sesong:</strong> Høyre er mye spilletid. Opp er høy mål+assist per kamp.</li>
                    <li>Oppe til venstre scorer uten så mange minutter. Nede til høyre spiller mye uten å skape. Trykk på en boble for produksjon.</li>
                ` : `
                    <li><strong>Produksjonskart · Nå:</strong> Minuttandel og mål+assist per kamp i de siste 5.</li>
                    <li>Grønn boble produserer mer enn egen sesong. Rød boble produserer mindre. Trykk på en boble for produksjon.</li>
                `,
                trening: isTotal ? `
                    <li><strong>Treningskart · Sesong:</strong> Høyre er høyt treningsoppmøte. Opp er høyt kampbidrag.</li>
                    <li>Høyt oppmøte og lavt bidrag er en samtale. Lavt oppmøte og høyt bidrag er en annen. Trykk på en boble for oppmøte.</li>
                ` : `
                    <li><strong>Treningskart · Nå:</strong> Oppmøte på de siste 5 treningene mot kampbidrag i de siste 5 kampene.</li>
                    <li>Grønn boble trener mer enn egen sesong. Rød boble trener mindre. Trykk på en boble for oppmøte.</li>
                `
            };
            const titles = {
                tropp: 'Troppkart',
                tillit: 'Tillitskart',
                produksjon: 'Produksjonskart',
                trening: 'Treningskart'
            };
            return `
                <p class="training-session-groups-info-title">${titles[kind] || 'Troppkart'}</p>
                <ul class="training-session-groups-info-list">
                    ${kindCopy[kind] || kindCopy.tropp}
                </ul>
            `;
        };

        window.renderStatsDiagramInfoButtonHtml = function(which) {
            const key = window.getStatsDiagramInfoKey(which);
            const open = window.isStatsDiagramInfoOpen(key);
            const panelId = `stats-diagram-info-${key}`;
            return `
                <button
                    type="button"
                    class="training-session-groups-info-btn team-score-diagram-info-btn${open ? ' is-active' : ''}"
                    data-stat-action="toggle-diagram-info"
                    data-diagram-info="${key}"
                    aria-expanded="${open ? 'true' : 'false'}"
                    aria-controls="${panelId}"
                    title="Diagramforklaring"
                    aria-label="Diagramforklaring"
                >
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                </button>
            `;
        };

        window.renderStatsDiagramInfoPanelHtml = function(which) {
            const key = window.getStatsDiagramInfoKey(which);
            const open = window.isStatsDiagramInfoOpen(key);
            return `
                <div
                    id="stats-diagram-info-${key}"
                    class="training-session-groups-info team-score-diagram-info${open ? '' : ' is-hidden'}"
                    ${open ? '' : 'hidden'}
                >
                    ${window.renderStatsDiagramExplanationHtml(key)}
                </div>
            `;
        };

        window.toggleStatsDiagramInfo = function(which) {
            const key = window.getStatsDiagramInfoKey(which);
            window.statsDiagramInfoOpen = window.statsDiagramInfoOpen || { main: false, form: false, line: false };
            window.statsDiagramInfoOpen[key] = !window.isStatsDiagramInfoOpen(key);
            window.statsScoreDiagramExplanationOpen = window.statsDiagramInfoOpen.main === true;
            const wraps = {
                main: ['team-score-diagram-wrap', window.renderTeamScoreDiagramHtml],
                form: ['stats-formkart-wrap', window.renderStatsFormDiagramHtml],
                line: ['stats-linjekart-wrap', window.renderStatsLineDiagramHtml]
            };
            const [wrapId, renderFn] = wraps[key] || wraps.main;
            const wrap = document.getElementById(wrapId);
            if (wrap && typeof renderFn === 'function') wrap.innerHTML = renderFn();
        };

        window.renderTeamScoreDiagramExplanationHtml = function() {
            return window.renderStatsDiagramExplanationHtml('main');
        };

        window.syncStatsScoreDiagramExplanationUi = function() {
            const wrap = document.getElementById('team-score-diagram-wrap');
            if (wrap && typeof window.renderTeamScoreDiagramHtml === 'function') {
                wrap.innerHTML = window.renderTeamScoreDiagramHtml();
            }
        };

        window.toggleStatsScoreDiagramExplanation = function() {
            window.toggleStatsDiagramInfo('main');
        };

        window.setStatsScoreDiagramMode = function(mode) {
            window.statsScoreDiagramMode = mode === 'five' ? 'five' : 'total';
            const container = document.getElementById('team-score-diagram-wrap');
            if (container) container.innerHTML = window.renderTeamScoreDiagramHtml();
        };

        window.setStatsScoreDiagramKind = function(kind) {
            const ids = (window.STATS_SCORE_DIAGRAM_KINDS || []).map(item => item.id);
            window.statsScoreDiagramKind = ids.includes(kind) ? kind : 'tropp';
            const container = document.getElementById('team-score-diagram-wrap');
            if (container) container.innerHTML = window.renderTeamScoreDiagramHtml();
        };

        window.setStatsLineDiagramKind = function(kind) {
            const ids = (window.STATS_LINE_DIAGRAM_KINDS || []).map(item => item.id);
            window.statsLineDiagramKind = ids.includes(kind) ? kind : 'forsvar';
            const container = document.getElementById('stats-linjekart-wrap');
            if (container) container.innerHTML = window.renderStatsLineDiagramHtml();
        };

        window.clearStatsDiagramPointTooltips = function(exceptPoint) {
            if (window.statsDiagramTooltipHideTimer) {
                clearTimeout(window.statsDiagramTooltipHideTimer);
                window.statsDiagramTooltipHideTimer = null;
            }
            document.querySelectorAll('.team-score-diagram-point.is-active').forEach(point => {
                if (point !== exceptPoint) point.classList.remove('is-active');
            });
        };

        window.setStatsDiagramPointTooltip = function(point, isActive, event) {
            if (!point) return;
            if (window.statsDiagramTooltipHideTimer) {
                clearTimeout(window.statsDiagramTooltipHideTimer);
                window.statsDiagramTooltipHideTimer = null;
            }
            if (isActive) {
                window.clearStatsDiagramPointTooltips(point);
                const svg = point.closest('.team-score-diagram-svg');
                if (svg && svg.lastElementChild !== point) svg.appendChild(point);
                point.classList.add('is-active');
                return;
            }
            const related = event?.relatedTarget;
            if (related && point.contains(related)) return;
            if (event?.pointerType === 'touch' || event?.pointerType === 'pen') return;
            window.statsDiagramTooltipHideTimer = setTimeout(() => {
                window.statsDiagramTooltipHideTimer = null;
                if (point.matches(':hover') || point.contains(document.activeElement)) return;
                point.classList.remove('is-active');
            }, 160);
        };

        if (!window._statsDiagramTooltipDismissBound) {
            window._statsDiagramTooltipDismissBound = true;
            document.addEventListener('pointerdown', event => {
                if (event.target.closest?.('.team-score-diagram-point')) return;
                window.clearStatsDiagramPointTooltips();
            }, true);
        }

        window.getStatsDiagramInitials = function(name) {
            return String(name || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join('');
        };

        window.getStatsDiagramRecentPlayerWindow = function(player, yearFilter) {
            const teamName = player?.spillerLag;
            const matches = window.activeMatches || [];
            const playerMatches = matches
                .filter(match => (
                    match.matchGroup === teamName &&
                    !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) &&
                    (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(match)) &&
                    (!window.isHistoricalActivity || window.isHistoricalActivity(match)) &&
                    match.attendance &&
                    window.isPlayerAttending(match.attendance, player) &&
                    (typeof window.activityBelongsToStatsYear !== 'function' || window.activityBelongsToStatsYear(match, yearFilter))
                ))
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 5);
            const teamMatches = matches
                .filter(match => (
                    match.matchGroup === teamName &&
                    (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(match)) &&
                    (!window.isHistoricalActivity || window.isHistoricalActivity(match)) &&
                    (typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(player, match)) &&
                    (typeof window.activityBelongsToStatsYear !== 'function' || window.activityBelongsToStatsYear(match, yearFilter))
                ))
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 5);
            return { playerMatches, teamMatches };
        };

        window.getStatsDiagramRecentSnittBors = function(player, playerMatches) {
            let ratingSum = 0;
            let ratingCount = 0;
            (playerMatches || []).forEach(match => {
                const onPitch = typeof window.isPlayerOnPitch === 'function'
                    ? window.isPlayerOnPitch(match, player)
                    : true;
                if (!onPitch) return;
                const rating = Number(window.getPlayerRefMapValue(match.ratings, player, 0)) || 0;
                if (rating > 0) {
                    ratingSum += rating;
                    ratingCount += 1;
                }
            });
            return ratingCount > 0 ? ratingSum / ratingCount : 0;
        };

        window.buildStatsTotalScoreDiagramData = function() {
            const playerByName = new Map((window.activePlayers || []).map(player => [player.navn, player]));
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true })
                : [];

            return rows
                .filter(stat => {
                    const player = playerByName.get(stat.navn);
                    return stat.attendedMatches > 0 && stat.totalScore > 0 && (player && window.isPlayerInCurrentSquadPool(player));
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
            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle');
            const scopedPlayers = (window.activePlayers || [])
                .filter(player => window.isPlayerInCurrentSquadPool(player))
                .filter(player => filterLag === 'Alle' || player.spillerLag === filterLag);

            const totalRows = window.buildStatsTotalScoreDiagramData();
            const totalByName = new Map(totalRows.map(row => [row.name, row.totalScore]));
            const rows = scopedPlayers.map(player => {
                const { playerMatches, teamMatches } = window.getStatsDiagramRecentPlayerWindow(player, yearFilter);
                if (!playerMatches.length) return null;

                const matchPoints = playerMatches.reduce((sum, match) => {
                    return sum + (typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(match, player)
                        : 0);
                }, 0);
                const recentKampbidrag = matchPoints / playerMatches.length;
                const recentSnittBors = window.getStatsDiagramRecentSnittBors(player, playerMatches);

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

        window.buildStatsTillitTotalDiagramData = function() {
            const playerByName = new Map((window.activePlayers || []).map(player => [player.navn, player]));
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true })
                : [];

            return rows
                .filter(stat => {
                    const player = playerByName.get(stat.navn);
                    return stat.attendedMatches > 0
                        && (Number(stat.minutesPossible) || 0) > 0
                        && stat.minutesSharePct != null
                        && (Number(stat.snittBors) || 0) > 0
                        && (player && window.isPlayerInCurrentSquadPool(player));
                })
                .map(stat => {
                    const minutesSharePct = Math.max(0, Math.min(100, Number(stat.minutesSharePct) || 0));
                    return {
                        name: stat.navn,
                        x: minutesSharePct,
                        y: Number(stat.snittBors) || 0,
                        score: Number(stat.totalScore) || 0,
                        totalScore: Number(stat.totalScore) || 0,
                        seasonX: minutesSharePct
                    };
                });
        };

        window.buildStatsTillitFiveDiagramData = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle');
            const scopedPlayers = (window.activePlayers || [])
                .filter(player => window.isPlayerInCurrentSquadPool(player))
                .filter(player => filterLag === 'Alle' || player.spillerLag === filterLag);
            const seasonByName = new Map(
                (window.buildStatsTillitTotalDiagramData() || []).map(row => [row.name, row])
            );

            return scopedPlayers.map(player => {
                const teamName = player.spillerLag;
                const recentTrackedMatches = (window.activeMatches || [])
                    .filter(match => (
                        match.matchGroup === teamName &&
                        !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) &&
                        (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(match)) &&
                        (!window.isHistoricalActivity || window.isHistoricalActivity(match)) &&
                        (typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(player, match)) &&
                        (typeof window.activityBelongsToStatsYear !== 'function' || window.activityBelongsToStatsYear(match, yearFilter)) &&
                        typeof window.matchHasMinutesTracking === 'function' &&
                        window.matchHasMinutesTracking(match)
                    ))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                    .slice(0, 5);
                if (!recentTrackedMatches.length) return null;

                let minutesTotal = 0;
                let minutesPossible = 0;
                recentTrackedMatches.forEach(match => {
                    minutesPossible += typeof window.getMatchDurationForMinutesShare === 'function'
                        ? window.getMatchDurationForMinutesShare(match)
                        : 90;
                    if (match.attendance && window.isPlayerAttending(match.attendance, player)) {
                        minutesTotal += typeof window.getPlayerMatchMinutesForStats === 'function'
                            ? window.getPlayerMatchMinutesForStats(match, player)
                            : 0;
                    }
                });
                if (!(minutesPossible > 0)) return null;

                const playedMatches = recentTrackedMatches.filter(match => (
                    match.attendance && window.isPlayerAttending(match.attendance, player)
                ));
                const recentSnittBors = window.getStatsDiagramRecentSnittBors(player, playedMatches);
                const seasonRow = seasonByName.get(player.navn);
                const y = recentSnittBors > 0 ? recentSnittBors : (Number(seasonRow?.y) || 0);
                if (!(y > 0)) return null;

                const minutesSharePct = Math.max(0, Math.min(100, (minutesTotal / minutesPossible) * 100));
                return {
                    name: player.navn,
                    x: minutesSharePct,
                    y,
                    score: minutesSharePct,
                    totalScore: seasonRow?.totalScore || 0,
                    seasonX: seasonRow ? seasonRow.x : minutesSharePct
                };
            }).filter(Boolean);
        };

        window.getStatsDiagramScopedPlayers = function() {
            const filterLag = window.getStatsTeamFilter ? window.getStatsTeamFilter() : 'Alle';
            return (window.activePlayers || [])
                .filter(player => window.isPlayerInCurrentSquadPool(player))
                .filter(player => filterLag === 'Alle' || player.spillerLag === filterLag);
        };

        window.getStatsDiagramRecentTrainings = function(player, yearFilter) {
            const events = (window.activeEvents || [])
                .filter(event => {
                    if (event.type !== 'Trening') return false;
                    if ((event.team || event.matchGroup) !== player.spillerLag) return false;
                    if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(event)) return false;
                    if (typeof window.hasRegisteredAttendance === 'function'
                        ? !window.hasRegisteredAttendance(event.attendance)
                        : !event.attendance) return false;
                    if (typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(player, event)) return false;
                    if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(event, yearFilter)) return false;
                    return true;
                })
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 5);
            const attended = events.filter(event => window.isPlayerAttending(event.attendance, player)).length;
            return {
                possible: events.length,
                attended,
                pct: events.length > 0 ? Math.round((attended / events.length) * 100) : null
            };
        };

        window.buildStatsProduksjonTotalDiagramData = function() {
            const playerByName = new Map((window.activePlayers || []).map(player => [player.navn, player]));
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true })
                : [];

            return rows
                .filter(stat => {
                    const player = playerByName.get(stat.navn);
                    return stat.attendedMatches > 0
                        && (Number(stat.kamper) || 0) > 0
                        && (Number(stat.minutesPossible) || 0) > 0
                        && stat.minutesSharePct != null
                        && (player && window.isPlayerInCurrentSquadPool(player));
                })
                .map(stat => {
                    const minutesSharePct = Math.max(0, Math.min(100, Number(stat.minutesSharePct) || 0));
                    const production = Number(stat.expectedMalpoeng) || 0;
                    return {
                        name: stat.navn,
                        x: minutesSharePct,
                        y: production,
                        score: Number(stat.totalScore) || 0,
                        totalScore: Number(stat.totalScore) || 0,
                        seasonX: minutesSharePct,
                        seasonY: production
                    };
                });
        };

        window.buildStatsProduksjonFiveDiagramData = function() {
            const yearFilter = window.getStatsDiagramYearFilter();
            const seasonByName = new Map(
                (window.buildStatsProduksjonTotalDiagramData() || []).map(row => [row.name, row])
            );

            return window.getStatsDiagramScopedPlayers().map(player => {
                const { playerMatches } = window.getStatsDiagramRecentPlayerWindow(player, yearFilter);
                const pitchMatches = (playerMatches || []).filter(match => (
                    typeof window.isPlayerOnPitch !== 'function' || window.isPlayerOnPitch(match, player)
                ));
                if (!pitchMatches.length) return null;

                const recentTrackedMatches = (window.activeMatches || [])
                    .filter(match => (
                        match.matchGroup === player.spillerLag &&
                        !(typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) &&
                        (typeof window.matchHasPlayedResult !== 'function' || window.matchHasPlayedResult(match)) &&
                        (!window.isHistoricalActivity || window.isHistoricalActivity(match)) &&
                        (typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(player, match)) &&
                        (typeof window.activityBelongsToStatsYear !== 'function' || window.activityBelongsToStatsYear(match, yearFilter)) &&
                        typeof window.matchHasMinutesTracking === 'function' &&
                        window.matchHasMinutesTracking(match)
                    ))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                    .slice(0, 5);

                let minutesTotal = 0;
                let minutesPossible = 0;
                recentTrackedMatches.forEach(match => {
                    minutesPossible += typeof window.getMatchDurationForMinutesShare === 'function'
                        ? window.getMatchDurationForMinutesShare(match)
                        : 90;
                    if (match.attendance && window.isPlayerAttending(match.attendance, player)) {
                        minutesTotal += typeof window.getPlayerMatchMinutesForStats === 'function'
                            ? window.getPlayerMatchMinutesForStats(match, player)
                            : 0;
                    }
                });
                if (!(minutesPossible > 0)) return null;

                let goals = 0;
                let assists = 0;
                pitchMatches.forEach(match => {
                    goals += Number(window.getPlayerRefMapValue(match.scorers, player, 0)) || 0;
                    assists += Number(window.getPlayerRefMapValue(match.assists, player, 0)) || 0;
                });
                const production = (goals + assists) / pitchMatches.length;
                const minutesSharePct = Math.max(0, Math.min(100, (minutesTotal / minutesPossible) * 100));
                const seasonRow = seasonByName.get(player.navn);
                return {
                    name: player.navn,
                    x: minutesSharePct,
                    y: production,
                    score: minutesSharePct,
                    totalScore: seasonRow?.totalScore || 0,
                    seasonX: seasonRow ? seasonRow.x : minutesSharePct,
                    seasonY: seasonRow ? seasonRow.y : production
                };
            }).filter(Boolean);
        };

        window.buildStatsTreningTotalDiagramData = function() {
            const playerByName = new Map((window.activePlayers || []).map(player => [player.navn, player]));
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true })
                : [];

            return rows
                .filter(stat => {
                    const player = playerByName.get(stat.navn);
                    return stat.attendedMatches > 0
                        && (Number(stat.oppmotePossible) || 0) > 0
                        && (player && window.isPlayerInCurrentSquadPool(player));
                })
                .map(stat => ({
                    name: stat.navn,
                    x: Math.max(0, Math.min(100, Number(stat.oppmotePct) || 0)),
                    y: Number(stat.kampbonus) || 0,
                    score: Number(stat.totalScore) || 0,
                    totalScore: Number(stat.totalScore) || 0,
                    seasonX: Math.max(0, Math.min(100, Number(stat.oppmotePct) || 0))
                }));
        };

        window.buildStatsTreningFiveDiagramData = function() {
            const yearFilter = window.getStatsDiagramYearFilter();
            const seasonByName = new Map(
                (window.buildStatsTreningTotalDiagramData() || []).map(row => [row.name, row])
            );
            const recentByName = new Map(
                (window.buildStatsFiveScoreDiagramData() || []).map(row => [row.name, row])
            );

            return window.getStatsDiagramScopedPlayers().map(player => {
                const training = window.getStatsDiagramRecentTrainings(player, yearFilter);
                if (!(training.possible > 0) || training.pct == null) return null;
                const recent = recentByName.get(player.navn);
                if (!recent) return null;
                const seasonRow = seasonByName.get(player.navn);
                return {
                    name: player.navn,
                    x: training.pct,
                    y: recent.x,
                    score: training.pct,
                    totalScore: seasonRow?.totalScore || recent.totalScore || 0,
                    seasonX: seasonRow ? seasonRow.x : training.pct
                };
            }).filter(Boolean);
        };

        window.buildStatsFormDiagramData = function() {
            const recentByName = new Map(
                (window.buildStatsFiveScoreDiagramData() || []).map(row => [row.name, row])
            );
            return (window.buildStatsTotalScoreDiagramData() || []).map(row => {
                const recent = recentByName.get(row.name);
                if (!recent) return null;
                return {
                    name: row.name,
                    x: row.x,
                    y: recent.x,
                    score: row.totalScore || row.score,
                    totalScore: row.totalScore || row.score
                };
            }).filter(Boolean);
        };

        window.getStatsDiagramLineSlotId = function(posId) {
            const id = String(posId || '').trim().toUpperCase();
            return (window.STATS_LINE_DIAGRAM_SLOT_ALIASES || {})[id] || id;
        };

        window.getStatsDiagramLineSlotIds = function(match, lineId) {
            const lineSlots = (window.STATS_LINE_DIAGRAM_POSITION_IDS || {})[lineId] || [];
            const formationId = typeof window.getMatchGamePlanFormation === 'function'
                ? window.getMatchGamePlanFormation(match)
                : (match?.formation || '4-2-4');
            const formationSlots = typeof window.getMatchGamePlanFormationPositionIds === 'function'
                ? window.getMatchGamePlanFormationPositionIds(formationId)
                : [];
            if (!formationSlots.length) return lineSlots.slice();
            const present = new Set(formationSlots.map(posId => window.getStatsDiagramLineSlotId(posId)));
            return lineSlots.filter(posId => present.has(posId));
        };

        window.getStatsDiagramMatchLineup = function(match) {
            let lineup = {};
            if (match?.lineupRefs && typeof match.lineupRefs === 'object') {
                Object.entries(match.lineupRefs).forEach(([posId, ref]) => {
                    lineup[posId] = (ref && typeof window.findPlayerByRef === 'function')
                        ? window.findPlayerByRef(ref)
                        : null;
                });
            } else if (match?.lineup && typeof match.lineup === 'object') {
                lineup = { ...match.lineup };
            }
            const formationId = typeof window.getMatchGamePlanFormation === 'function'
                ? window.getMatchGamePlanFormation(match)
                : (match?.formation || '4-2-4');
            if (typeof window.remapMatchGamePlanLineupSlotsForFormation === 'function') {
                lineup = window.remapMatchGamePlanLineupSlotsForFormation(lineup, formationId, { overwrite: true });
            }
            return lineup || {};
        };

        window.getStatsDiagramMatchLinePlayers = function(match, lineId, scopedPlayers) {
            const slotIds = window.getStatsDiagramLineSlotIds(match, lineId);
            if (!slotIds.length) return [];
            const uniqueFrom = (players) => {
                const seen = new Set();
                return (players || []).filter(player => {
                    const name = player?.navn;
                    if (!name || seen.has(name)) return false;
                    seen.add(name);
                    return true;
                });
            };
            const lineup = window.getStatsDiagramMatchLineup(match);
            const fromLineup = uniqueFrom(slotIds.map(posId => lineup[posId]).filter(Boolean));
            if (fromLineup.length === slotIds.length) return fromLineup;

            const bestBySlot = new Map();
            (scopedPlayers || []).forEach(player => {
                if (player.spillerLag !== match.matchGroup) return;
                if (!match.attendance || !window.isPlayerAttending(match.attendance, player)) return;
                if (typeof window.isPlayerOnPitch === 'function' && !window.isPlayerOnPitch(match, player)) return;
                const rawPosId = (typeof window.getPlayerMatchPlayedPositionIds === 'function'
                    ? (window.getPlayerMatchPlayedPositionIds(match, player) || [])[0]
                    : '')
                    || (typeof window.getPlayerMatchPlayedPositionId === 'function'
                        ? window.getPlayerMatchPlayedPositionId(match, player)
                        : '');
                const posId = window.getStatsDiagramLineSlotId(rawPosId);
                if (!slotIds.includes(posId)) return;
                const minutes = typeof window.getPlayerMatchMinutesForStats === 'function'
                    ? Number(window.getPlayerMatchMinutesForStats(match, player)) || 0
                    : 0;
                const current = bestBySlot.get(posId);
                if (!current || minutes > current.minutes) bestBySlot.set(posId, { player, minutes });
            });
            const fromMinutes = uniqueFrom(slotIds.map(posId => bestBySlot.get(posId)?.player).filter(Boolean));
            return fromMinutes.length === slotIds.length ? fromMinutes : [];
        };

        window.buildStatsLineDiagramData = function(lineId) {
            const line = (window.STATS_LINE_DIAGRAM_KINDS || []).some(kind => kind.id === lineId)
                ? lineId
                : window.getStatsLineDiagramKind();
            const yearFilter = window.getStatsDiagramYearFilter();
            const players = window.getStatsDiagramScopedPlayers();
            const combinations = new Map();

            (window.activeMatches || []).forEach(match => {
                if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(match)) return;
                if (typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(match)) return;
                if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(match)) return;
                if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(match, yearFilter)) return;
                const linePlayers = window.getStatsDiagramMatchLinePlayers(match, line, players);
                if (!linePlayers.length) return;
                const contribs = linePlayers.map(player => (
                    typeof window.calculatePlayerMatchPoints === 'function'
                        ? Number(window.calculatePlayerMatchPoints(match, player)) || 0
                        : 0
                ));
                const ratings = linePlayers.map(player => (
                    Number(window.getPlayerRefMapValue?.(match.ratings, player, 0)) || 0
                ));
                const rated = ratings.filter(rating => rating > 0);
                if (!rated.length) return;
                const names = linePlayers.map(player => player.navn).sort((a, b) => a.localeCompare(b, 'no'));
                const key = names.join('\n');
                const current = combinations.get(key) || {
                    names,
                    matchCount: 0,
                    contribSum: 0,
                    borsSum: 0,
                    players: {}
                };
                current.matchCount += 1;
                current.contribSum += contribs.reduce((sum, value) => sum + value, 0) / contribs.length;
                current.borsSum += rated.reduce((sum, value) => sum + value, 0) / rated.length;
                linePlayers.forEach((player, index) => {
                    const playerStats = current.players[player.navn] || {
                        contribSum: 0,
                        contribCount: 0,
                        borsSum: 0,
                        borsCount: 0
                    };
                    playerStats.contribSum += contribs[index];
                    playerStats.contribCount += 1;
                    if (ratings[index] > 0) {
                        playerStats.borsSum += ratings[index];
                        playerStats.borsCount += 1;
                    }
                    current.players[player.navn] = playerStats;
                });
                combinations.set(key, current);
            });

            const jitter = (label, spread) => {
                let hash = 0;
                String(label || '').split('').forEach(char => {
                    hash = ((hash * 31) + char.charCodeAt(0)) | 0;
                });
                return (((Math.abs(hash) % 100) / 100) - 0.5) * spread;
            };
            const firstName = (name) => {
                const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
                const first = parts[0] || '';
                const lastInitial = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : '';
                return lastInitial ? `${first} ${lastInitial}` : first;
            };
            const rows = [];
            const formatLineDelta = (delta) => {
                const rounded = Math.round((Number(delta) || 0) * 10) / 10;
                if (rounded === 0) {
                    return { text: '0.0', className: 'is-season' };
                }
                return {
                    text: `${rounded > 0 ? '+' : '-'}${Math.abs(rounded).toFixed(1)}`,
                    className: rounded > 0 ? 'is-up' : 'is-down'
                };
            };
            combinations.forEach((stats) => {
                const contrib = stats.contribSum / stats.matchCount;
                const bors = stats.borsSum / stats.matchCount;
                const labels = stats.names.map(name => firstName(name));
                const label = labels.join(' · ');
                rows.push({
                    name: label,
                    tooltipRows: [
                        {
                            name: 'Snitt',
                            displayValue: `${(Math.round(contrib * 10) / 10).toFixed(1)} · ${(Math.round(bors * 10) / 10).toFixed(1)}`,
                            tooltipValueClass: 'is-season'
                        },
                        ...stats.names.map((playerName) => {
                            const playerStats = stats.players[playerName] || {};
                            const playerContrib = playerStats.contribCount
                                ? playerStats.contribSum / playerStats.contribCount
                                : contrib;
                            const playerBors = playerStats.borsCount
                                ? playerStats.borsSum / playerStats.borsCount
                                : bors;
                            const contribDelta = formatLineDelta(playerContrib - contrib);
                            const borsDelta = formatLineDelta(playerBors - bors);
                            return {
                                name: firstName(playerName),
                                contrib: playerContrib,
                                bors: playerBors,
                                displayValue: `${contribDelta.text} · ${borsDelta.text}`,
                                valueParts: [
                                    contribDelta,
                                    { text: ' · ', className: 'is-season' },
                                    borsDelta
                                ]
                            };
                        }).sort((a, b) => (Number(b.contrib) || 0) - (Number(a.contrib) || 0)
                            || (Number(b.bors) || 0) - (Number(a.bors) || 0)
                            || String(a.name || '').localeCompare(String(b.name || ''), 'no')),
                        {
                            name: stats.matchCount === 1 ? '1 kamp' : `${stats.matchCount} kamper`,
                            displayValue: '',
                            tooltipValueClass: 'is-season'
                        }
                    ],
                    x: contrib + jitter(label, 0.18),
                    y: bors + jitter(`${label}|y`, 0.04),
                    score: bors,
                    totalScore: contrib,
                    matchCount: stats.matchCount
                });
            });
            return rows.sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0)
                || (Number(b.x) || 0) - (Number(a.x) || 0)
                || String(a.name || '').localeCompare(String(b.name || ''), 'no'));
        };

        window.groupStatsDiagramOverlapPoints = function(points) {
            const items = Array.isArray(points) ? points : [];
            const parent = items.map((_, index) => index);
            const find = (index) => {
                if (parent[index] === index) return index;
                parent[index] = find(parent[index]);
                return parent[index];
            };
            const unite = (a, b) => {
                const rootA = find(a);
                const rootB = find(b);
                if (rootA !== rootB) parent[rootB] = rootA;
            };

            for (let i = 0; i < items.length; i += 1) {
                for (let j = i + 1; j < items.length; j += 1) {
                    const dx = items[i].pointX - items[j].pointX;
                    const dy = items[i].pointY - items[j].pointY;
                    const dist = Math.hypot(dx, dy);
                    const limit = Math.max(items[i].radius, items[j].radius) + 6;
                    if (dist <= limit) unite(i, j);
                }
            }

            const groups = new Map();
            items.forEach((item, index) => {
                const root = find(index);
                if (!groups.has(root)) groups.set(root, []);
                groups.get(root).push(item);
            });
            return Array.from(groups.values());
        };

        window.renderTeamScoreDiagramTopbarHtml = function(isTotal, activeKind) {
            const kinds = window.STATS_SCORE_DIAGRAM_KINDS || [];
            return `
                <div class="team-score-diagram-topbar">
                    <div class="team-score-diagram-topbar-main">
                        <div class="team-score-diagram-tabs" role="tablist" aria-label="Diagram">
                            ${kinds.map(kind => `
                                <button type="button" onclick="window.setStatsScoreDiagramKind('${kind.id}')" class="team-score-diagram-tab ${activeKind === kind.id ? 'is-active' : ''}" aria-selected="${activeKind === kind.id ? 'true' : 'false'}">${kind.label}</button>
                            `).join('')}
                        </div>
                        <div class="team-score-diagram-tabs" role="tablist" aria-label="Periode">
                            <button type="button" onclick="window.setStatsScoreDiagramMode('total')" class="team-score-diagram-tab ${isTotal ? 'is-active' : ''}" aria-selected="${isTotal ? 'true' : 'false'}">Sesong</button>
                            <button type="button" onclick="window.setStatsScoreDiagramMode('five')" class="team-score-diagram-tab ${!isTotal ? 'is-active' : ''}" aria-selected="${!isTotal ? 'true' : 'false'}">Nå</button>
                        </div>
                    </div>
                    ${window.renderStatsDiagramInfoButtonHtml('main')}
                </div>
            `;
        };

        window.renderStatsScatterDiagramCardHtml = function(config) {
            const rows = Array.isArray(config.rows) ? config.rows : [];
            const topbarHtml = config.topbarHtml || '';
            const infoPanelHtml = config.infoPanelHtml || '';
            const isCompact = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
            if (!rows.length) {
                return `
                    <div class="team-score-diagram-card">
                        ${topbarHtml}
                        ${infoPanelHtml}
                        <p class="team-score-diagram-empty">${config.emptyMessage || 'Ingen spillere å vise.'}</p>
                    </div>
                `;
            }

            const width = isCompact ? 390 : 860;
            const height = isCompact ? 360 : 520;
            const pad = isCompact
                ? { left: 46, right: 14, top: 40, bottom: 58 }
                : { left: 72, right: 32, top: 36, bottom: 72 };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const xMin = Number(config.xMin);
            const xMax = Number(config.xMax);
            const yMin = Number(config.yMin);
            const yMax = Number(config.yMax);
            const x = value => pad.left + ((Math.max(xMin, Math.min(xMax, value)) - xMin) / (xMax - xMin)) * plotW;
            const y = value => pad.top + (1 - ((Math.max(yMin, Math.min(yMax, value)) - yMin) / (yMax - yMin))) * plotH;
            const escapeHtml = window.escapeModalHtml || (value => String(value || ''));
            const prepare = typeof config.prepareRow === 'function' ? config.prepareRow : row => row;
            const groupNoun = config.groupNoun || 'spillere';

            const prepared = rows.map(row => {
                const extra = prepare(row, { isCompact }) || {};
                const radius = extra.radius != null ? extra.radius : (4 + ((row.score - 20) / 65) * 3);
                return {
                    ...row,
                    ...extra,
                    radius,
                    pointX: x(row.x),
                    pointY: y(row.y)
                };
            });

            const overlapGroups = config.skipOverlap
                ? prepared.map(point => [point])
                : window.groupStatsDiagramOverlapPoints(prepared);
            const pointsHtml = overlapGroups.map(group => {
                const members = [...group].sort((a, b) =>
                    (Number(b.score) || 0) - (Number(a.score) || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'no')
                );
                const lead = members[0];
                const isGroup = members.length > 1;
                const pointX = members.reduce((sum, m) => sum + m.pointX, 0) / members.length;
                const pointY = members.reduce((sum, m) => sum + m.pointY, 0) / members.length;
                const radius = Math.max(...members.map(m => m.radius));
                const hitRadius = Math.max(radius + (isGroup ? 10 : 8), isGroup ? 16 : 14);
                const fill = lead.fill || '#0b2b4c';
                const rowHeight = 18;
                const tooltipPadY = 14;
                const tooltipMembers = (!isGroup && Array.isArray(lead.tooltipRows) && lead.tooltipRows.length)
                    ? lead.tooltipRows
                    : members;
                const tooltipWidth = Number(config.tooltipWidth) > 0
                    ? Number(config.tooltipWidth)
                    : (isCompact ? 178 : 220);
                const tooltipHeight = tooltipPadY + (tooltipMembers.length * rowHeight) + (isGroup ? 16 : 4);
                const tooltipX = Math.max(8, Math.min(width - tooltipWidth - 8, pointX - (tooltipWidth / 2)));
                const tooltipY = Math.max(8, pointY - hitRadius - tooltipHeight - (isCompact ? 10 : 8));
                const insideLabel = (!isGroup && config.labelInPoint)
                    ? String(lead.shortName || lead.matchCount || '')
                    : '';
                const labelText = insideLabel
                    ? ''
                    : ((config.hideInitials && !isGroup)
                        ? ''
                        : (isGroup
                            ? String(members.length)
                            : (lead.shortName || window.getStatsDiagramInitials(lead.name))));
                const ariaNames = members.map(m => `${m.name} ${m.displayValue}`).join(', ');
                const ariaLabel = isGroup
                    ? `${members.length} ${groupNoun}: ${ariaNames}`
                    : `${lead.name}. ${lead.displayValue}`;
                const tooltipRows = tooltipMembers.map((member, index) => {
                    const rowY = tooltipPadY + 4 + (index * rowHeight);
                    const valueParts = Array.isArray(member.valueParts) ? member.valueParts.filter(part => part && part.text) : [];
                    const valueHtml = valueParts.length
                        ? valueParts.map(part => `<tspan class="${escapeHtml(part.className || member.tooltipValueClass || '')}">${escapeHtml(part.text)}</tspan>`).join('')
                        : escapeHtml(member.displayValue || '');
                    return `
                        <text x="12" y="${rowY}" class="team-score-diagram-tooltip-name">${escapeHtml(member.name)}</text>
                        <text x="${tooltipWidth - 12}" y="${rowY}" text-anchor="end" class="team-score-diagram-tooltip-value ${escapeHtml(member.tooltipValueClass || '')}">${valueHtml}</text>
                    `;
                }).join('');
                const groupHint = isGroup
                    ? `<text x="12" y="${tooltipHeight - 8}" class="team-score-diagram-tooltip-meta">${members.length} ${groupNoun} på samme sted</text>`
                    : '';
                const bridgeTop = tooltipY + tooltipHeight;
                const bridgeHeight = Math.max(0, pointY - bridgeTop);
                const bridgeWidth = Math.max(hitRadius * 2, 28);
                const bridgeHtml = bridgeHeight > 0
                    ? `<rect class="team-score-diagram-tooltip-bridge" x="${pointX - (bridgeWidth / 2)}" y="${bridgeTop}" width="${bridgeWidth}" height="${bridgeHeight}" fill="transparent"></rect>`
                    : '';

                return `
                    <g class="team-score-diagram-point${isGroup ? ' is-overlap-group' : ''}" tabindex="0" aria-label="${escapeHtml(ariaLabel)}" onpointerenter="window.setStatsDiagramPointTooltip(this, true, event)" onpointerleave="window.setStatsDiagramPointTooltip(this, false, event)" onfocus="window.setStatsDiagramPointTooltip(this, true, event)" onblur="window.setStatsDiagramPointTooltip(this, false, event)" onpointerdown="window.setStatsDiagramPointTooltip(this, true, event)">
                        <circle class="team-score-diagram-hit-area" cx="${pointX}" cy="${pointY}" r="${hitRadius}" fill="transparent" stroke="none"></circle>
                        ${labelText ? `<text x="${pointX}" y="${pointY - radius - (isCompact ? 8 : 6)}" text-anchor="middle" class="team-score-diagram-initials${isGroup ? ' is-group-count' : ''}">${escapeHtml(labelText)}</text>` : ''}
                        <circle cx="${pointX}" cy="${pointY}" r="${radius}" fill="${fill}" stroke="#ffffff" stroke-width="1.5" opacity="0.92"></circle>
                        ${insideLabel ? `<text x="${pointX}" y="${pointY + 1}" text-anchor="middle" dominant-baseline="middle" class="team-score-diagram-initials is-count">${escapeHtml(insideLabel)}</text>` : ''}
                        ${isGroup ? `<circle cx="${pointX}" cy="${pointY}" r="${radius + 3.5}" class="team-score-diagram-overlap-ring" fill="none"></circle>` : ''}
                        ${bridgeHtml}
                        <g class="team-score-diagram-tooltip" transform="translate(${tooltipX} ${tooltipY})">
                            <rect width="${tooltipWidth}" height="${tooltipHeight}" rx="10"></rect>
                            ${tooltipRows}
                            ${groupHint}
                        </g>
                    </g>
                `;
            }).join('');

            const splitHtml = config.splitDiagonal
                ? `<line x1="${x(xMin)}" x2="${x(xMax)}" y1="${y(yMin)}" y2="${y(yMax)}" class="team-score-diagram-split-line"></line>`
                : `
                    <line x1="${x(config.splitX)}" x2="${x(config.splitX)}" y1="${pad.top}" y2="${height - pad.bottom}" class="team-score-diagram-split-line"></line>
                    <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(config.splitY)}" y2="${y(config.splitY)}" class="team-score-diagram-split-line"></line>
                `;
            const formatTick = typeof config.formatTick === 'function' ? config.formatTick : tick => tick;

            return `
                <div class="team-score-diagram-card">
                    ${topbarHtml}
                    ${infoPanelHtml}
                    <div class="team-score-diagram-scroll">
                        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(config.ariaLabel || 'Diagram')}" class="team-score-diagram-svg" onpointerleave="window.clearStatsDiagramPointTooltips()">
                            <rect x="0" y="0" width="${width}" height="${height}" class="team-score-diagram-bg"></rect>
                            ${(config.gridX || []).map(tick => `
                                <g>
                                    <line x1="${x(tick)}" x2="${x(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" class="team-score-diagram-grid"></line>
                                    <text x="${x(tick)}" y="${height - 42}" text-anchor="middle" class="team-score-diagram-tick">${formatTick(tick)}</text>
                                </g>
                            `).join('')}
                            ${(config.gridY || []).map(tick => `
                                <g>
                                    <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="team-score-diagram-grid"></line>
                                    <text x="${isCompact ? 22 : 46}" y="${y(tick) + 4}" text-anchor="middle" class="team-score-diagram-tick">${formatTick(tick)}</text>
                                </g>
                            `).join('')}
                            <g class="team-score-diagram-split" aria-hidden="true">${splitHtml}</g>
                            <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" class="team-score-diagram-axis"></line>
                            <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" class="team-score-diagram-axis"></line>
                            <text x="${width / 2}" y="${height - 14}" text-anchor="middle" class="team-score-diagram-axis-label">${escapeHtml(config.xAxisLabel || '')}</text>
                            <text transform="translate(18 ${height / 2}) rotate(-90)" text-anchor="middle" class="team-score-diagram-axis-label">${escapeHtml(config.yAxisLabel || '')}</text>
                            ${pointsHtml}
                        </svg>
                    </div>
                </div>
            `;
        };

        window.getStatsScoreDiagramTone = function(isUp) {
            return isUp ? { fill: '#00c853', className: 'is-up' } : { fill: '#ff1744', className: 'is-down' };
        };

        window.renderTeamScoreDiagramHtml = function() {
            const kind = window.getStatsScoreDiagramKind();
            const isTotal = (window.statsScoreDiagramMode || 'total') !== 'five';
            const isCompact = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
            const rowsByKind = {
                tropp: isTotal ? window.buildStatsTotalScoreDiagramData() : window.buildStatsFiveScoreDiagramData(),
                tillit: isTotal ? window.buildStatsTillitTotalDiagramData() : window.buildStatsTillitFiveDiagramData(),
                produksjon: isTotal ? window.buildStatsProduksjonTotalDiagramData() : window.buildStatsProduksjonFiveDiagramData(),
                trening: isTotal ? window.buildStatsTreningTotalDiagramData() : window.buildStatsTreningFiveDiagramData()
            };
            const percentGrid = isCompact ? [0, 25, 50, 75, 100] : [0, 20, 40, 50, 60, 80, 100];
            const contribGrid = isTotal
                ? (isCompact ? [8, 12, 16, 20, 24] : [8, 10, 12, 14, 16, 18, 20, 22, 24])
                : (isCompact ? [8, 12, 16, 20, 24, 28] : [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
            const plots = {
                tropp: {
                    xMin: 8,
                    xMax: isTotal ? 24 : 28,
                    yMin: 4,
                    yMax: 7,
                    splitX: isTotal ? 16 : 18,
                    splitY: 5.5,
                    gridX: contribGrid,
                    gridY: isCompact ? [4, 5, 6, 7] : [4, 4.5, 5, 5.5, 6, 6.5, 7],
                    xAxisLabel: isCompact ? 'Kampbidrag' : (isTotal ? 'Kampbidrag (sesongsnitt)' : 'Kampbidrag siste 5'),
                    yAxisLabel: isCompact ? 'Snittbørs' : (isTotal ? 'Snittbørs' : 'Snittbørs siste 5'),
                    emptyMessage: 'Ingen spillere å vise.',
                    kindLabel: 'Troppkart'
                },
                tillit: {
                    xMin: 0,
                    xMax: 100,
                    yMin: 4,
                    yMax: 7,
                    splitX: 50,
                    splitY: 5.5,
                    gridX: percentGrid,
                    gridY: isCompact ? [4, 5, 6, 7] : [4, 4.5, 5, 5.5, 6, 6.5, 7],
                    xAxisLabel: isCompact ? 'Minuttandel' : (isTotal ? 'Minuttandel' : 'Minuttandel siste 5'),
                    yAxisLabel: isCompact ? 'Snittbørs' : (isTotal ? 'Snittbørs' : 'Snittbørs siste 5'),
                    emptyMessage: 'Mangler minuttandel å vise.',
                    kindLabel: 'Tillitskart'
                },
                produksjon: {
                    xMin: 0,
                    xMax: 100,
                    yMin: 0,
                    yMax: 1,
                    splitX: 50,
                    splitY: 0.5,
                    gridX: percentGrid,
                    gridY: isCompact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1],
                    xAxisLabel: isCompact ? 'Minuttandel' : (isTotal ? 'Minuttandel' : 'Minuttandel siste 5'),
                    yAxisLabel: isCompact ? 'Mål+assist' : 'Mål+assist per kamp',
                    emptyMessage: 'Mangler produksjon å vise.',
                    kindLabel: 'Produksjonskart'
                },
                trening: {
                    xMin: 0,
                    xMax: 100,
                    yMin: 8,
                    yMax: isTotal ? 24 : 28,
                    splitX: 50,
                    splitY: isTotal ? 16 : 18,
                    gridX: percentGrid,
                    gridY: contribGrid,
                    xAxisLabel: isCompact ? 'Oppmøte' : (isTotal ? 'Treningsoppmøte' : 'Oppmøte siste 5 treninger'),
                    yAxisLabel: isCompact ? 'Kampbidrag' : (isTotal ? 'Kampbidrag (sesongsnitt)' : 'Kampbidrag siste 5'),
                    emptyMessage: 'Mangler treningsoppmøte å vise.',
                    kindLabel: 'Treningskart'
                }
            };
            const plot = plots[kind] || plots.tropp;
            const formatProduction = value => (Math.round((Number(value) || 0) * 10) / 10).toFixed(1);
            const prepareRow = (row) => {
                const radius = 4 + ((row.score - 20) / 65) * 3;
                if (kind === 'tillit' || kind === 'trening') {
                    const delta = Math.round(row.x - (Number(row.seasonX) || 0));
                    const tone = isTotal ? { fill: '#0b2b4c', className: 'is-season' } : window.getStatsScoreDiagramTone(delta >= 0);
                    return {
                        radius,
                        fill: tone.fill,
                        displayValue: `${Math.round(row.x)}%`,
                        tooltipValueClass: tone.className
                    };
                }
                if (kind === 'produksjon') {
                    const delta = (Number(row.y) || 0) - (Number(row.seasonY) || 0);
                    const tone = isTotal ? { fill: '#0b2b4c', className: 'is-season' } : window.getStatsScoreDiagramTone(delta >= 0);
                    return {
                        radius,
                        fill: tone.fill,
                        displayValue: formatProduction(row.y),
                        tooltipValueClass: tone.className
                    };
                }
                const delta = (Number(row.score) || 0) - (Number(row.totalScore) || 0);
                const tone = isTotal ? { fill: '#0b2b4c', className: 'is-season' } : window.getStatsScoreDiagramTone(delta >= 0);
                return {
                    radius,
                    fill: tone.fill,
                    displayValue: isTotal ? Number(row.score).toFixed(1) : `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(1)}`,
                    tooltipValueClass: tone.className
                };
            };

            return window.renderStatsScatterDiagramCardHtml({
                topbarHtml: window.renderTeamScoreDiagramTopbarHtml(isTotal, kind),
                infoPanelHtml: window.renderStatsDiagramInfoPanelHtml('main'),
                rows: rowsByKind[kind] || [],
                emptyMessage: plot.emptyMessage,
                ariaLabel: `${plot.kindLabel} ${isTotal ? 'Sesong' : 'Nå'}`,
                ...plot,
                prepareRow
            });
        };

        window.renderStatsFormDiagramHtml = function() {
            const isCompact = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
            const grid = isCompact ? [8, 12, 16, 20, 24, 28] : [8, 12, 16, 20, 24, 28];
            return window.renderStatsScatterDiagramCardHtml({
                topbarHtml: `
                    <div class="team-score-diagram-topbar">
                        <p class="team-score-diagram-card-title">Formkart</p>
                        ${window.renderStatsDiagramInfoButtonHtml('form')}
                    </div>
                `,
                infoPanelHtml: window.renderStatsDiagramInfoPanelHtml('form'),
                rows: window.buildStatsFormDiagramData(),
                emptyMessage: 'Mangler form å vise.',
                ariaLabel: 'Formkart sesong mot nå',
                xMin: 8,
                xMax: 28,
                yMin: 8,
                yMax: 28,
                splitDiagonal: true,
                gridX: grid,
                gridY: grid,
                xAxisLabel: isCompact ? 'Sesong' : 'Kampbidrag sesong',
                yAxisLabel: isCompact ? 'Nå' : 'Kampbidrag nå',
                prepareRow: (row) => {
                    const delta = (Number(row.y) || 0) - (Number(row.x) || 0);
                    const rounded = Math.round(delta * 10) / 10;
                    const tone = rounded === 0
                        ? { fill: '#f5c542', className: 'is-season' }
                        : window.getStatsScoreDiagramTone(rounded > 0);
                    return {
                        radius: 4 + ((row.score - 20) / 65) * 3,
                        fill: tone.fill,
                        displayValue: rounded === 0
                            ? '0.0'
                            : `${rounded > 0 ? '+' : '-'}${Math.abs(rounded).toFixed(1)}`,
                        tooltipValueClass: tone.className
                    };
                }
            });
        };

        window.renderStatsLineDiagramHtml = function() {
            const isCompact = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
            const activeKind = window.getStatsLineDiagramKind();
            const kinds = window.STATS_LINE_DIAGRAM_KINDS || [];
            const lineLabels = {
                forsvar: 'Forsvar',
                midtbane: 'Midtbane',
                angrep: 'Angrep'
            };
            return window.renderStatsScatterDiagramCardHtml({
                topbarHtml: `
                    <div class="team-score-diagram-topbar">
                        <div class="team-score-diagram-topbar-main">
                            <p class="team-score-diagram-card-title">Linjekart</p>
                            <div class="team-score-diagram-tabs" role="tablist" aria-label="Linje">
                                ${kinds.map(kind => `
                                    <button type="button" onclick="window.setStatsLineDiagramKind('${kind.id}')" class="team-score-diagram-tab ${activeKind === kind.id ? 'is-active' : ''}" aria-selected="${activeKind === kind.id ? 'true' : 'false'}">${kind.label}</button>
                                `).join('')}
                            </div>
                        </div>
                        ${window.renderStatsDiagramInfoButtonHtml('line')}
                    </div>
                `,
                infoPanelHtml: window.renderStatsDiagramInfoPanelHtml('line'),
                rows: window.buildStatsLineDiagramData(activeKind),
                emptyMessage: `Mangler ${String(lineLabels[activeKind] || 'linjer').toLowerCase()} å vise.`,
                ariaLabel: `Linjekart ${lineLabels[activeKind] || 'linje'} kampbidrag og spillerbørs`,
                groupNoun: 'linjer',
                skipOverlap: true,
                hideInitials: true,
                labelInPoint: true,
                tooltipWidth: isCompact ? 228 : 280,
                xMin: 8,
                xMax: 32,
                yMin: 4,
                yMax: 8,
                splitX: 20,
                splitY: 6,
                gridX: isCompact ? [8, 16, 24, 32] : [8, 12, 16, 20, 24, 28, 32],
                gridY: isCompact ? [4, 5, 6, 7, 8] : [4, 5, 6, 7, 8],
                xAxisLabel: isCompact ? 'Kampbidrag' : 'Kampbidrag snitt',
                yAxisLabel: isCompact ? 'Børs' : 'Spillerbørs snitt',
                prepareRow: (row) => ({
                    radius: 8 + Math.min(3, (Number(row.matchCount) || 1) * 0.45),
                    fill: '#0b2b4c',
                    displayValue: `${(Math.round((Number(row.totalScore) || 0) * 10) / 10).toFixed(1)} · ${(Math.round((Number(row.score) || 0) * 10) / 10).toFixed(1)}`,
                    tooltipValueClass: 'is-season',
                    tooltipRows: row.tooltipRows,
                    shortName: String(row.matchCount || 1),
                    matchCount: row.matchCount
                })
            });
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
            return typeof window.renderStatsLagFiltersHtml === 'function'
                ? window.renderStatsLagFiltersHtml()
                : '';
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

            if (summary) summary.classList.add('hidden');

            const hallSlot = document.getElementById('stats-hall-of-fame-slot');
            if (hallSlot) hallSlot.classList.toggle('hidden', activeSection !== 'spillerdata');
            const awardsSlot = document.getElementById('stats-awards-slot');
            if (awardsSlot) awardsSlot.classList.toggle('hidden', activeSection !== 'spillerdata');
            const spillerstatsSlot = document.getElementById('stats-spillerstats-slot');
            if (spillerstatsSlot) spillerstatsSlot.classList.toggle('hidden', activeSection !== 'spillerdata');
            const utviklingSlot = document.getElementById('stats-utvikling-slot');
            if (utviklingSlot) utviklingSlot.classList.toggle('hidden', activeSection !== 'spillerdata');
            const oppfolgingSlot = document.getElementById('stats-oppfolging-slot');
            if (oppfolgingSlot) oppfolgingSlot.classList.toggle('hidden', activeSection !== 'spillerdata');
            const oppmoteSlot = document.getElementById('stats-oppmote-slot');
            if (oppmoteSlot) oppmoteSlot.classList.toggle('hidden', activeSection !== 'treningsdata');
            const kampdataSlot = document.getElementById('stats-kampdata-slot');
            if (kampdataSlot) kampdataSlot.classList.toggle('hidden', activeSection !== 'kampdata');
            const kampForKampSlot = document.getElementById('stats-kampforkamp-slot');
            if (kampForKampSlot) kampForKampSlot.classList.toggle('hidden', activeSection !== 'kampdata');
            const kampstatsSlot = document.getElementById('stats-kampstats-slot');
            if (kampstatsSlot) kampstatsSlot.classList.toggle('hidden', activeSection !== 'kampdata');

            if (playerData) playerData.classList.toggle('hidden', activeSection !== 'spillerdata' || !window._statsSelectedPlayer);
        };

        window.setStatsLagSection = function(section) {
            window.statsLagSection = window.statsLagSections.some(item => item.id === section) ? section : 'kampdata';
            if (window.statsLagSection === 'spillerdata') {
                if (window._statsSelectedPlayer && typeof window.renderSpillereDetail === 'function') {
                    window.renderSpillereDetail(window._statsSelectedPlayer);
                } else if (typeof window.renderSpillereView === 'function') {
                    window.renderSpillereView();
                }
                window.updateStatsLagSectionVisibility();
                return;
            }
            // Deferred section paint (69d8df1) only fills the active section on full render.
            // Re-paint when switching so Trening/Kamp cards are not left empty.
            if (typeof window.renderStatsLagSummary === 'function') {
                window.renderStatsLagSummary();
                return;
            }
            window.updateStatsLagSectionVisibility();
        };

        window.renderStatsLagSummary = function() {
            const container = document.getElementById('stats-lag-summary');
            const navContainer = document.getElementById('stats-lag-section-nav');
            const kampdataSlot = document.getElementById('stats-kampdata-slot');
            const kampstatsSlot = document.getElementById('stats-kampstats-slot');
            const kampForKampSlot = document.getElementById('stats-kampforkamp-slot');
            const hallSlot = document.getElementById('stats-hall-of-fame-slot');
            const awardsSlot = document.getElementById('stats-awards-slot');
            const spillerstatsSlot = document.getElementById('stats-spillerstats-slot');
            const utviklingSlot = document.getElementById('stats-utvikling-slot');
            const oppfolgingSlot = document.getElementById('stats-oppfolging-slot');
            const oppmoteSlot = document.getElementById('stats-oppmote-slot');
            const data = window._statsLagData;
            const report = window._statsTeamReportData;
            if (!container) return;
            if (!data || !report) {
                container.innerHTML = '';
                if (navContainer) navContainer.innerHTML = '';
                if (kampdataSlot) kampdataSlot.innerHTML = '';
                if (kampForKampSlot) kampForKampSlot.innerHTML = '';
                if (kampstatsSlot) kampstatsSlot.innerHTML = '';
                if (hallSlot) hallSlot.innerHTML = '';
                if (awardsSlot) awardsSlot.innerHTML = '';
                if (spillerstatsSlot) spillerstatsSlot.innerHTML = '';
                if (utviklingSlot) utviklingSlot.innerHTML = '';
                if (oppfolgingSlot) oppfolgingSlot.innerHTML = '';
                if (oppmoteSlot) oppmoteSlot.innerHTML = '';
                return;
            }

            container.innerHTML = '';
            const activeSection = typeof window.getStatsLagSection === 'function'
                ? window.getStatsLagSection()
                : 'kampdata';

            // Only build panels for the visible section — avoids ~0.5–1s of hidden work.
            if (activeSection === 'kampdata') {
                if (kampdataSlot && typeof window.renderStatsKampdataPanelHtml === 'function') {
                    kampdataSlot.innerHTML = window.renderStatsKampdataPanelHtml(data, report);
                }
                if (kampForKampSlot && typeof window.renderStatsKampForKampPanelHtml === 'function') {
                    kampForKampSlot.innerHTML = window.renderStatsKampForKampPanelHtml(data);
                }
                if (kampstatsSlot && typeof window.renderStatsKampstatsPanelHtml === 'function') {
                    kampstatsSlot.innerHTML = window.renderStatsKampstatsPanelHtml();
                }
                if (typeof window.renderMatchStatsView === 'function') {
                    window.renderMatchStatsView();
                }
            } else if (activeSection === 'spillerdata') {
                if (window._statsSelectedPlayer && typeof window.renderSpillereDetail === 'function') {
                    window.renderSpillereDetail(window._statsSelectedPlayer);
                } else if (typeof window.renderSpillereView === 'function') {
                    window.renderSpillereView();
                }
            } else if (activeSection === 'treningsdata') {
                if (oppmoteSlot && typeof window.renderStatsOppmotePanelHtml === 'function') {
                    oppmoteSlot.innerHTML = window.renderStatsOppmotePanelHtml(data);
                }
            }

            window.updateStatsLagSectionVisibility();
        };

        window.getStatsAwardPositionGroup = function(pos1) {
            const pos = String(pos1 || '').toLowerCase();
            if (pos.includes('keeper')) return 'keeper';
            if (pos.includes('stopper') || pos.includes('bekk')) return 'forsvar';
            if (pos.includes('midtbane') || pos.includes('playmaker')) return 'midtbane';
            if (pos.includes('kant') || pos.includes('spiss')) return 'angrep';
            return '';
        };

        window.getStatsSuggestedMalscorerName = function(model) {
            let name = '';
            (model?.groups || []).some(group => (group.awards || []).some(award => {
                if (award.id !== 'mal') return false;
                name = award.podium?.[0]?.navn || '';
                return true;
            }));
            return name;
        };

        window.getStatsPlayerLine = function(rows, name) {
            if (!name) return '';
            const stat = (Array.isArray(rows) ? rows : []).find(row => row?.navn === name);
            if (stat) return window.getStatsAwardPositionGroup(stat.pos1);
            const player = (window.activePlayers || []).find(item => item?.navn === name);
            return window.getStatsAwardPositionGroup(player?.pos1);
        };

        window.getStatsLineAwardWithheldReason = function(award, scorerLine) {
            const line = award?.group;
            if (!line || !scorerLine || line !== scorerLine) return '';
            const labels = {
                keeper: 'keeper',
                forsvar: 'forsvar',
                midtbane: 'midtbane',
                angrep: 'angrep'
            };
            const label = labels[line];
            if (!label) return '';
            return `Målscoreren kommer fra ${label}, så prisen deles ikke ut.`;
        };

        window.getStatsAwardSeasonYear = function(yearFilter) {
            const year = parseInt(yearFilter, 10);
            return Number.isFinite(year) ? year : new Date().getFullYear();
        };

        window.getStatsAwardPlayerAge = function(stat, yearFilter) {
            const birth = parseInt(stat?.fodselsaar, 10);
            if (!Number.isFinite(birth) || birth < 1950) return null;
            return window.getStatsAwardSeasonYear(yearFilter) - birth;
        };

        window.playerJoinedInAwardSeason = function(stat, yearFilter, rows) {
            const joined = String(stat?.tilknyttetFra || '');
            const year = parseInt(joined.slice(0, 4), 10);
            if (!Number.isFinite(year) || year !== window.getStatsAwardSeasonYear(yearFilter)) return false;
            const peers = (Array.isArray(rows) ? rows : [])
                .map(row => String(row?.tilknyttetFra || ''))
                .filter(date => parseInt(date.slice(0, 4), 10) === year);
            const counts = new Map();
            peers.forEach(date => counts.set(date, (counts.get(date) || 0) + 1));
            let baseline = '';
            let baselineCount = 0;
            counts.forEach((count, date) => {
                if (count > baselineCount || (count === baselineCount && date < baseline)) {
                    baseline = date;
                    baselineCount = count;
                }
            });
            const laterArrivalExists = peers.some(date => date > baseline);
            if (baselineCount >= 3 && laterArrivalExists && joined === baseline) return false;
            return true;
        };

        window.getStatsAwardFilterFn = function(award, yearFilter, rows) {
            const filters = [];
            if (award?.group) {
                filters.push((stat) => window.getStatsAwardPositionGroup(stat.pos1) === award.group);
            }
            if (Number.isFinite(award?.maxAge)) {
                filters.push((stat) => {
                    const age = window.getStatsAwardPlayerAge(stat, yearFilter);
                    return age != null && age <= award.maxAge;
                });
            }
            if (award?.joinedInSeason) {
                filters.push((stat) => window.playerJoinedInAwardSeason(stat, yearFilter, rows));
            }
            if (award?.id === 'fairplay' || award?.id === 'tropp') {
                filters.push((stat) => (Number(stat.attendedMatches) || 0) > 0);
            }
            if (!filters.length) return null;
            return (stat) => filters.every((fn) => fn(stat));
        };

        window.formatFairPlayCards = function(stat) {
            const yellow = Number(stat?.gule) || 0;
            const red = Number(stat?.rode) || 0;
            const games = Number(stat?.kamper) || 0;
            const parts = [];
            if (yellow === 0 && red === 0) {
                parts.push('0 kort');
            } else {
                if (yellow > 0) parts.push(yellow === 1 ? '1 gult' : `${yellow} gule`);
                if (red > 0) parts.push(red === 1 ? '1 rødt' : `${red} røde`);
            }
            return `${parts.join(', ')} · ${games} kamper`;
        };

        window.formatTroppAttendanceDisplay = function(stat) {
            const attended = Number(stat?.attendedMatches) || 0;
            const possible = Number(stat?.teamKampCount) || 0;
            if (possible <= 0 && attended <= 0) return '—';
            if (possible <= 0) return `${attended} kamper`;
            return `${attended} / ${possible} kamper`;
        };

        window.buildStatsAwardPodium = function(rows, options = {}) {
            const column = options.column;
            const ascending = options.ascending === true;
            const limit = Number.isFinite(options.limit) ? options.limit : 3;
            const requireRelevant = options.requireRelevant !== false;
            const requireQualify = options.requireQualify !== false;
            const qualifyAs = options.qualifyAs || column;
            const filterFn = typeof options.filterFn === 'function' ? options.filterFn : null;
            const pool = (Array.isArray(rows) ? rows : []).filter((stat) => {
                if (!stat) return false;
                if (filterFn && !filterFn(stat)) return false;
                if (requireRelevant && typeof window.playerStatsRelevantForSort === 'function'
                    && !window.playerStatsRelevantForSort(stat, column)) {
                    return false;
                }
                if (requireQualify && typeof window.playerQualifiesForStatsSort === 'function'
                    && !window.playerQualifiesForStatsSort(stat, qualifyAs)) {
                    return false;
                }
                return true;
            });
            pool.sort((a, b) => {
                if (typeof options.compare === 'function') return options.compare(a, b);
                const va = Number(a[column]) || 0;
                const vb = Number(b[column]) || 0;
                if (typeof window.comparePlayerStatsSort === 'function') {
                    return window.comparePlayerStatsSort(a, b, column, {
                        descending: !ascending,
                        tiebreakKamper: options.tiebreakKamper || window.getStatsSortTiebreakKamper?.(column)
                    });
                }
                if (va !== vb) return ascending ? va - vb : vb - va;
                const ka = Number(a.kamper) || 0;
                const kb = Number(b.kamper) || 0;
                if (ka !== kb) {
                    return options.tiebreakKamper === 'fewer' ? ka - kb : kb - ka;
                }
                return String(a.navn || '').localeCompare(String(b.navn || ''), 'nb', { sensitivity: 'base' });
            });
            return pool.slice(0, limit);
        };

        window.formatStatsAwardValue = function(stat, column, extra = '') {
            if (!stat) return '—';
            if (extra) return extra;
            if (column === 'oppmotePct' && typeof window.formatOppmoteDisplay === 'function') {
                return window.formatOppmoteDisplay(stat);
            }
            if (column === 'minutesTotal' && typeof window.formatMinutesTotalDisplay === 'function') {
                return window.formatMinutesTotalDisplay(stat);
            }
            if (column === 'expectedMalpoeng' && typeof window.formatExpectedMalpoengDisplay === 'function') {
                return window.formatExpectedMalpoengDisplay(stat);
            }
            if (typeof window.formatStatsSortValue === 'function') {
                const formatted = window.formatStatsSortValue(stat, column);
                if (formatted && formatted !== '-') return formatted;
            }
            return '—';
        };

        window.renderStatsAwardIconHtml = function(award) {
            if (!award) return '';
            if (award.glyph) {
                return `<i class="stats-sort-glyph stats-sort-glyph-${escapeStatisticsHtml(award.glyph)}" aria-hidden="true"></i>`;
            }
            if (award.icon) {
                return `<i class="fa-solid ${escapeStatisticsHtml(award.icon)}" aria-hidden="true"></i>`;
            }
            const option = award.column && typeof window.getStatsSortOption === 'function'
                ? window.getStatsSortOption(award.column)
                : null;
            if (option && typeof window.renderStatsSortIconHtml === 'function') {
                return window.renderStatsSortIconHtml(option);
            }
            return '';
        };

        window.getStatsAwardDefinitions = function() {
            return [
                {
                    id: 'hoved',
                    label: 'Hovedkåringer',
                    awards: [
                        {
                            id: 'player',
                            title: 'Årets spiller',
                            column: 'totalScore',
                            tiebreakKamper: 'more',
                            valueFn: (stat) => {
                                const score = Number(stat.totalScore);
                                const shown = Number.isFinite(score) && score > 0 ? score.toFixed(1) : '—';
                                return `${shown} · ${Number(stat.kamper) || 0} kamper`;
                            },
                            explain: 'Høyest Total Score (beste sesong): kampbidrag 50 %, spillerbørs 25 %, treningsoppmøte 15 % og disiplin 10 %. Krever minst 50 % av lagets kamper. Ved lik score rangeres den med flest kamper høyest.'
                        },
                        {
                            id: 'bors',
                            title: 'Årets børs',
                            column: 'snittBors',
                            tiebreakKamper: 'more',
                            valueFn: (stat) => {
                                const avg = Number(stat.snittBors);
                                const shown = Number.isFinite(avg) && avg > 0 ? avg.toFixed(1) : '—';
                                return `${shown} · ${Number(stat.kamper) || 0} kamper`;
                            },
                            explain: 'Høyest snittkarakter på Spillerbørs gjennom sesongen. Krever minst 50 % av lagets kamper. Ved likt snitt rangeres den med flest kamper høyest.'
                        },
                        {
                            id: 'mal',
                            title: 'Årets målscorer',
                            column: 'mal',
                            tiebreakKamper: 'fewer',
                            valueFn: (stat) => `${Number(stat.mal) || 0} · ${Number(stat.kamper) || 0} kamper`,
                            explain: 'Flest scoringer i valgt sesong, serie og cup samlet. Ved likt antall rangeres den med færre kamper høyest.'
                        },
                        {
                            id: 'playmaker',
                            title: 'Årets assister',
                            column: 'assist',
                            tiebreakKamper: 'fewer',
                            valueFn: (stat) => `${Number(stat.assist) || 0} · ${Number(stat.kamper) || 0} kamper`,
                            explain: 'Flest assists i valgt sesong, serie og cup samlet. Ved likt antall rangeres den med færre kamper høyest.'
                        },
                        {
                            id: 'xp',
                            title: 'Expected målpoeng',
                            column: 'expectedMalpoeng',
                            tiebreakKamper: 'fewer',
                            valueFn: (stat) => typeof window.formatExpectedMalpoengDisplay === 'function'
                                ? window.formatExpectedMalpoengDisplay(stat)
                                : `${Number(stat.expectedMalpoeng).toFixed(1)} · ${Number(stat.kamper) || 0} kamper`,
                            explain: 'Mål + assist per kamp på banen. Krever minst 50 % av lagets kamper. Ved likt tall rangeres den med færre kamper høyest.'
                        },
                        {
                            id: 'bb',
                            title: 'Banens beste',
                            column: 'bb',
                            tiebreakKamper: 'fewer',
                            valueFn: (stat) => `${Number(stat.bb) || 0} · ${Number(stat.kamper) || 0} kamper`,
                            explain: 'Flest kåringer som banens beste i valgt sesong. Ved likt antall rangeres den med færre kamper høyest.'
                        },
                        {
                            id: 'talent',
                            title: 'Årets talent',
                            column: 'totalScore',
                            icon: 'fa-seedling',
                            maxAge: 19,
                            explain: 'Høyest Total Score blant spillere som er 19 år eller yngre i valgt sesong. Krever minst 50 % av lagets kamper.'
                        },
                        {
                            id: 'nykommer',
                            title: 'Årets Nykommer',
                            column: 'totalScore',
                            icon: 'fa-user-plus',
                            joinedInSeason: true,
                            requireQualify: false,
                            tiebreakKamper: 'more',
                            valueFn: (stat) => {
                                const score = Number(stat.totalScore);
                                const shown = Number.isFinite(score) && score > 0 ? score.toFixed(1) : '—';
                                return `${shown} · ${Number(stat.kamper) || 0} kamper`;
                            },
                            explain: 'Høyest Total Score blant spillere som ble tilknyttet laget i valgt sesong, etter datoen troppen allerede var registrert på. Krever ikke 50 % av kampene, siden mange kommer inn underveis.'
                        }
                    ]
                },
                {
                    id: 'innsats',
                    label: 'Innsats',
                    awards: [
                        {
                            id: 'jernmann',
                            title: 'Jernspilleren',
                            column: 'minutesTotal',
                            explain: 'Flest registrerte spilleminutter i Spillerbørs. Tallet viser total minutter og snitt per kamp.'
                        },
                        {
                            id: 'tropp',
                            title: 'Troppens spiller',
                            column: 'attendedMatches',
                            icon: 'fa-users',
                            valueFn: (stat) => window.formatTroppAttendanceDisplay(stat),
                            explain: 'Flest spilte kamper i troppen på kampdagen, uavhengig av minutter. En kamp teller først når resultatet er registrert. Ved likt antall rangeres den med flest kamper på banen høyest.'
                        },
                        {
                            id: 'oppmote',
                            title: 'Årets hederspris',
                            column: 'oppmoteSamletPct',
                            icon: 'fa-user-check',
                            valueFn: (stat) => {
                                const possible = Number(stat?.oppmoteSamletPossible) || 0;
                                if (possible <= 0) return '—';
                                const pct = Math.round(Number(stat.oppmoteSamletPct) || 0);
                                const attended = Number(stat.oppmoteSamletAttended) || 0;
                                return `${pct}% ${attended}/${possible}`;
                            },
                            explain: 'Høyest samlet oppmøte for hele sesongen, på trening, kamp og treningskamp. Hele året teller, også før en spiller kom inn og etter at han gikk ut. Bare økter og kamper med registrert oppmøte teller. Vises som prosent og møtt/mulige.'
                        }
                    ]
                },
                {
                    id: 'linjer',
                    label: 'Årets på linjen',
                    awards: [
                        {
                            id: 'keeper',
                            title: 'Årets keeper',
                            column: 'kampbonus',
                            icon: 'fa-mitten',
                            group: 'keeper',
                            explain: 'Høyest snitt kampbidrag blant keepere. Krever minst 50 % av lagets kamper.'
                        },
                        {
                            id: 'forsvar',
                            title: 'Årets forsvar',
                            column: 'kampbonus',
                            icon: 'fa-shield-halved',
                            group: 'forsvar',
                            explain: 'Høyest snitt kampbidrag blant stoppere og bekker. Krever minst 50 % av lagets kamper.'
                        },
                        {
                            id: 'midtbane',
                            title: 'Årets midtbane',
                            column: 'kampbonus',
                            icon: 'fa-diagram-project',
                            group: 'midtbane',
                            explain: 'Høyest snitt kampbidrag blant defensiv/offensiv midtbane og playmaker. Krever minst 50 % av lagets kamper.'
                        },
                        {
                            id: 'angrep',
                            title: 'Årets angrep',
                            column: 'kampbonus',
                            icon: 'fa-bullseye',
                            group: 'angrep',
                            explain: 'Høyest snitt kampbidrag blant kanter og spisser. Krever minst 50 % av lagets kamper.'
                        }
                    ]
                },
                {
                    id: 'fair',
                    label: 'Fair play',
                    awards: [
                        {
                            id: 'fairplay',
                            title: 'Fair play',
                            column: 'fairPlayKort',
                            icon: 'fa-scale-balanced',
                            ascending: true,
                            requireRelevant: false,
                            qualifyAs: 'totalScore',
                            tiebreakKamper: 'more',
                            valueFn: (stat) => window.formatFairPlayCards(stat),
                            explain: 'Færrest kort blant spillere med minst 50 % av lagets kamper. Både gule og røde teller, og et rødt kort veier tyngre enn et gult. Ved likt vinner den med flest kamper.'
                        },
                        {
                            id: 'gule',
                            title: 'Årets gule',
                            column: 'gule',
                            glyph: 'g',
                            tiebreakKamper: 'fewer',
                            valueFn: (stat) => `${Number(stat.gule) || 0} · ${Number(stat.kamper) || 0} kamper`,
                            explain: 'Flest gule kort i valgt sesong, serie og cup samlet. Ved likt antall rangeres den med færre kamper høyest.'
                        }
                    ]
                }
            ];
        };

        window.buildStatsAwardsModel = function() {
            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : new Date().getFullYear();
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true, yearFilter })
                : [];
            const teamFilter = typeof window.getStatsTeamFilter === 'function'
                ? window.getStatsTeamFilter()
                : 'Alle';
            const teamName = teamFilter && teamFilter !== 'Alle'
                ? teamFilter
                : (typeof window.getPrimaryTeamName === 'function' ? window.getPrimaryTeamName() : 'BSK');

            const groups = window.getStatsAwardDefinitions().map((group) => ({
                id: group.id,
                label: group.label,
                awards: group.awards.map((award) => {
                    const podium = window.buildStatsAwardPodium(rows, {
                        column: award.column,
                        ascending: award.ascending === true,
                        requireRelevant: award.requireRelevant,
                        requireQualify: award.requireQualify,
                        qualifyAs: award.qualifyAs,
                        tiebreakKamper: award.tiebreakKamper,
                        filterFn: window.getStatsAwardFilterFn(award, yearFilter, rows)
                    });
                    return {
                        ...award,
                        podium: podium.map((stat) => ({
                            navn: stat.navn,
                            playerId: typeof getStatsPlayerIdForName === 'function'
                                ? getStatsPlayerIdForName(stat.navn)
                                : '',
                            valueText: typeof award.valueFn === 'function'
                                ? award.valueFn(stat)
                                : window.formatStatsAwardValue(stat, award.column)
                        }))
                    };
                })
            }));

            return { year: yearFilter, teamName, groups };
        };

        window.renderStatsAwardPodiumHtml = function(award) {
            const podium = Array.isArray(award?.podium) ? award.podium : [];
            if (!podium.length) {
                return `<p class="stats-awards-empty">Ingen data</p>`;
            }
            return `
                <ol class="stats-awards-podium">
                    ${podium.map((entry, index) => {
                        const rank = index + 1;
                        const name = escapeStatisticsHtml(entry.navn || '');
                        const value = escapeStatisticsHtml(entry.valueText || '—');
                        const playerId = escapeStatisticsHtml(entry.playerId || '');
                        return `
                            <li class="stats-awards-podium-item is-rank-${rank}">
                                <button
                                    type="button"
                                    class="stats-awards-podium-btn"
                                    data-stat-action="open-player"
                                    data-player-id="${playerId}"
                                    data-player-name="${name}"
                                >
                                    <span class="stats-awards-rank">${rank}</span>
                                    <span class="stats-awards-name">${name}</span>
                                    <span class="stats-awards-value">${value}</span>
                                </button>
                            </li>
                        `;
                    }).join('')}
                </ol>
            `;
        };

        window.toggleStatsAwardInfo = function(awardId) {
            const next = window.statsAwardInfoOpen === awardId ? '' : String(awardId || '');
            window.statsAwardInfoOpen = next;
            document.querySelectorAll('#view-statistikk .stats-awards-card[data-award-id]').forEach((card) => {
                const open = card.dataset.awardId === next;
                card.classList.toggle('is-info-open', open);
                const btn = card.querySelector('[data-stat-action="toggle-award-info"]');
                const panel = card.querySelector('[data-award-info]');
                if (btn) {
                    btn.classList.toggle('is-active', open);
                    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                }
                if (panel) {
                    panel.classList.toggle('is-hidden', !open);
                    if (open) panel.removeAttribute('hidden');
                    else panel.setAttribute('hidden', '');
                }
            });
        };

        window.renderStatsAwardsCardHtml = function(model) {
            const data = model || window.buildStatsAwardsModel();
            return `
                <div class="stats-awards-board">
                    ${(data.groups || []).map((group) => `
                        <section class="stats-awards-group" aria-label="${escapeStatisticsHtml(group.label)}">
                            <h4 class="stats-awards-group-title">${escapeStatisticsHtml(group.label)}</h4>
                            <div class="stats-awards-grid">
                                ${(group.awards || []).map((award) => {
                                    const open = window.statsAwardInfoOpen === award.id;
                                    const infoId = `stats-award-info-${escapeStatisticsHtml(award.id)}`;
                                    return `
                                    <article class="stats-awards-card${open ? ' is-info-open' : ''}" data-award-id="${escapeStatisticsHtml(award.id)}">
                                        <div class="stats-awards-card-head">
                                            <span class="stats-awards-icon">${window.renderStatsAwardIconHtml(award)}</span>
                                            <h5 class="stats-awards-title">${escapeStatisticsHtml(award.title)}</h5>
                                            ${award.explain ? `
                                                <button
                                                    type="button"
                                                    class="training-session-groups-info-btn stats-awards-info-btn${open ? ' is-active' : ''}"
                                                    data-stat-action="toggle-award-info"
                                                    data-award-id="${escapeStatisticsHtml(award.id)}"
                                                    aria-expanded="${open ? 'true' : 'false'}"
                                                    aria-controls="${infoId}"
                                                    title="Forklaring av ${escapeStatisticsHtml(award.title)}"
                                                    aria-label="Forklaring av ${escapeStatisticsHtml(award.title)}"
                                                >
                                                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                        ${award.explain ? `
                                            <p
                                                id="${infoId}"
                                                class="stats-awards-explain${open ? '' : ' is-hidden'}"
                                                data-award-info
                                                ${open ? '' : 'hidden'}
                                            >${escapeStatisticsHtml(award.explain)}</p>
                                        ` : ''}
                                        ${window.renderStatsAwardPodiumHtml(award)}
                                    </article>
                                    `;
                                }).join('')}
                            </div>
                        </section>
                    `).join('')}
                </div>
            `;
        };

        window.HALL_OF_FAME_KEY = 'bsk_hall_of_fame';

        window.readHallOfFameStore = function() {
            try {
                const parsed = JSON.parse(window.localStorage.getItem(window.HALL_OF_FAME_KEY) || '{}');
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch (error) {
                return {};
            }
        };

        window.getHallOfFameScope = function() {
            const teamFilter = typeof window.getStatsTeamFilter === 'function'
                ? window.getStatsTeamFilter()
                : 'Alle';
            const year = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : new Date().getFullYear();
            return {
                team: teamFilter && teamFilter !== 'Alle' ? String(teamFilter) : 'Alle',
                year: String(year)
            };
        };

        window.getHallOfFameWinners = function() {
            const store = window.readHallOfFameStore();
            const scope = window.getHallOfFameScope();
            const bucket = store[scope.team] && store[scope.team][scope.year];
            return bucket && typeof bucket === 'object' ? bucket : {};
        };

        window.normalizeHallOfFameStore = function(store) {
            const normalized = {};
            Object.keys(store || {}).sort().forEach((team) => {
                Object.keys(store[team] || {}).sort().forEach((year) => {
                    Object.keys(store[team][year] || {}).sort().forEach((awardId) => {
                        const winner = store[team][year][awardId];
                        if (!winner || !winner.navn) return;
                        if (!normalized[team]) normalized[team] = {};
                        if (!normalized[team][year]) normalized[team][year] = {};
                        normalized[team][year][awardId] = {
                            navn: String(winner.navn),
                            playerId: winner.playerId ? String(winner.playerId) : ''
                        };
                    });
                });
            });
            return normalized;
        };

        window.writeHallOfFameStore = function(store) {
            const normalized = window.normalizeHallOfFameStore(store);
            const next = JSON.stringify(normalized);
            let previous = '';
            try {
                previous = window.localStorage.getItem(window.HALL_OF_FAME_KEY) || '';
                window.localStorage.setItem(window.HALL_OF_FAME_KEY, next);
            } catch (error) {
                /* Storage can be full or blocked. */
            }
            return next !== previous;
        };

        window._hallOfFamePending = window._hallOfFamePending || new Map();

        window.hallOfFamePendingKey = function(team, year, awardId) {
            return `${String(team || '')}\u0000${String(year || '')}\u0000${String(awardId || '')}`;
        };

        window.applyPendingHallOfFameWrites = function(store) {
            const next = window.normalizeHallOfFameStore(store);
            window._hallOfFamePending.forEach((winner, key) => {
                const [team, year, awardId] = key.split('\u0000');
                const remoteWinner = next[team] && next[team][year] ? next[team][year][awardId] : null;
                const remoteName = remoteWinner && remoteWinner.navn ? remoteWinner.navn : '';
                const remoteId = remoteWinner && remoteWinner.playerId ? remoteWinner.playerId : '';
                const localName = winner && winner.navn ? winner.navn : '';
                const localId = winner && winner.playerId ? winner.playerId : '';
                if (remoteName === localName && remoteId === localId) {
                    window._hallOfFamePending.delete(key);
                    return;
                }
                if (!next[team]) next[team] = {};
                if (!next[team][year]) next[team][year] = {};
                if (winner && winner.navn) next[team][year][awardId] = winner;
                else delete next[team][year][awardId];
            });
            return window.normalizeHallOfFameStore(next);
        };

        window.applyHallOfFameStore = function(store) {
            const changed = window.writeHallOfFameStore(window.applyPendingHallOfFameWrites(store));
            if (!changed || window.hallOfFameEditingId) return;
            const slot = document.getElementById('stats-hall-of-fame-slot');
            if (slot && typeof window.renderHallOfFameSlot === 'function') {
                window.renderHallOfFameSlot();
            }
        };

        window.saveHallOfFameWinner = function(awardId, winner) {
            if (!awardId) return;
            const store = window.readHallOfFameStore();
            const scope = window.getHallOfFameScope();
            if (!store[scope.team]) store[scope.team] = {};
            if (!store[scope.team][scope.year]) store[scope.team][scope.year] = {};
            const storedWinner = winner && winner.navn
                ? {
                    navn: String(winner.navn),
                    playerId: winner.playerId ? String(winner.playerId) : ''
                }
                : null;
            if (storedWinner) {
                store[scope.team][scope.year][awardId] = storedWinner;
            } else {
                delete store[scope.team][scope.year][awardId];
            }
            window._hallOfFamePending.set(
                window.hallOfFamePendingKey(scope.team, scope.year, awardId),
                storedWinner
            );
            window.writeHallOfFameStore(store);
            if (typeof window.saveHallOfFameToDatabase === 'function') {
                Promise.resolve(window.saveHallOfFameToDatabase(scope, awardId, storedWinner)).catch((error) => {
                    console.error('Kunne ikke lagre kåring i databasen:', error);
                });
            }
        };

        window.getHallOfFameSquadPlayers = function() {
            const teamFilter = typeof window.getStatsTeamFilter === 'function'
                ? window.getStatsTeamFilter()
                : 'Alle';
            return (window.activePlayers || [])
                .filter(player => {
                    if (!player || !player.navn) return false;
                    if (typeof window.isPlayerInCurrentSquadPool === 'function' && !window.isPlayerInCurrentSquadPool(player)) return false;
                    if (teamFilter && teamFilter !== 'Alle' && player.spillerLag !== teamFilter) return false;
                    return true;
                })
                .map(player => ({
                    navn: player.navn,
                    playerId: player.id != null ? String(player.id) : ''
                }))
                .sort((a, b) => a.navn.localeCompare(b.navn, 'no'));
        };

        window.getHallOfFameAwardExplain = function(award) {
            const text = {
                player: 'Høyest Total Score i sesongen. Krever minst 50 % av kampene.',
                'spillernes-beste': 'Spillernes kåring av lagets beste. Velges fra troppen, uten statistikk.',
                mal: 'Flest mål i sesongen, serie og cup samlet.',
                nykommer: 'Høyest Total Score blant dem som kom inn etter at troppen var registrert.',
                oppmote: 'Høyest samlet oppmøte på trening, kamp og treningskamp.',
                'spillernes-favoritt': 'Spillernes kåring av lagets favoritt. Velges fra troppen, uten statistikk.',
                forsvar: 'Høyest snitt kampbidrag blant forsvarsspillere med minst 50 % av kampene. Deles ikke ut hvis målscoreren kommer fra forsvar.',
                midtbane: 'Høyest snitt kampbidrag blant midtbanespillere med minst 50 % av kampene. Deles ikke ut hvis målscoreren kommer fra midtbane.',
                angrep: 'Høyest snitt kampbidrag blant angrepsspillere med minst 50 % av kampene. Deles ikke ut hvis målscoreren kommer fra angrep.',
                kampgeneral: 'Høyest snitt kampbidrag i troppen. Krever minst 50 % av kampene.',
                fairplay: 'Færrest gule og røde kort. Et rødt kort veier tyngre enn et gult. Krever minst 50 % av kampene.'
            };
            return text[award?.id] || '';
        };

        window.renderHallOfFameExplainHtml = function(explain) {
            const safe = escapeStatisticsHtml(explain || '');
            return safe
                .replace(
                    /Total Score/g,
                    '<button type="button" class="hall-of-fame-term" data-stat-action="open-total-score-info">Total Score</button>'
                )
                .replace(
                    /kampbidrag/g,
                    '<button type="button" class="hall-of-fame-term" data-stat-action="open-kampbidrag-info">kampbidrag</button>'
                );
        };

        window.getHallOfFameVoteAwards = function() {
            return [
                {
                    id: 'spillernes-beste',
                    title: 'Årets Spillernes Beste',
                    icon: 'fa-hand-fist',
                    vote: true,
                    hallGroup: 'hoved'
                },
                {
                    id: 'spillernes-favoritt',
                    title: 'Årets Spillernes favoritt',
                    icon: 'fa-heart',
                    vote: true,
                    hallGroup: 'innsats'
                }
            ];
        };

        window.hallOfFameLineAwardWithheldReason = function(award, rows, winners, model) {
            const awardModel = model || (typeof window.buildStatsAwardsModel === 'function' ? window.buildStatsAwardsModel() : null);
            const yearFilter = awardModel?.year;
            const awardRows = Array.isArray(rows)
                ? rows
                : (typeof window.buildPlayerStatsData === 'function'
                    ? window.buildPlayerStatsData({ applyYearFilter: true, yearFilter })
                    : []);
            const awardWinners = winners || (typeof window.getHallOfFameWinners === 'function' ? window.getHallOfFameWinners() : {});
            const scorerName = awardWinners?.mal?.navn || window.getStatsSuggestedMalscorerName(awardModel);
            return window.getStatsLineAwardWithheldReason(award, window.getStatsPlayerLine(awardRows, scorerName));
        };

        window.getHallOfFameKampGeneralAward = function(rows) {
            const award = {
                id: 'kampgeneral',
                title: 'Reserve2: Årets Kamp general',
                column: 'kampbonus',
                icon: 'fa-chess-king',
                tiebreakKamper: 'more',
                valueFn: (stat) => {
                    const avg = Number(stat?.kampbonus);
                    const shown = Number.isFinite(avg) && avg > 0 ? avg.toFixed(1) : '—';
                    return `${shown} · ${Number(stat?.kamper) || 0} kamper`;
                }
            };
            const podium = typeof window.buildStatsAwardPodium === 'function'
                ? window.buildStatsAwardPodium(rows, {
                    column: 'kampbonus',
                    tiebreakKamper: 'more',
                    requireQualify: true
                })
                : [];
            award.podium = podium.map(stat => ({
                navn: stat.navn,
                playerId: typeof getStatsPlayerIdForName === 'function' ? getStatsPlayerIdForName(stat.navn) : '',
                valueText: award.valueFn(stat)
            }));
            return award;
        };

        window.getHallOfFameFairPlayAward = function(rows) {
            const award = {
                id: 'fairplay',
                title: 'Fair play',
                column: 'fairPlayKort',
                icon: 'fa-scale-balanced',
                ascending: true,
                requireRelevant: false,
                qualifyAs: 'totalScore',
                tiebreakKamper: 'more',
                valueFn: (stat) => window.formatFairPlayCards(stat)
            };
            const podium = typeof window.buildStatsAwardPodium === 'function'
                ? window.buildStatsAwardPodium(rows, {
                    column: 'fairPlayKort',
                    ascending: true,
                    requireRelevant: false,
                    requireQualify: true,
                    qualifyAs: 'totalScore',
                    tiebreakKamper: 'more'
                })
                : [];
            award.podium = podium.map(stat => ({
                navn: stat.navn,
                playerId: typeof getStatsPlayerIdForName === 'function' ? getStatsPlayerIdForName(stat.navn) : '',
                valueText: award.valueFn(stat)
            }));
            return award;
        };

        function getHallOfFamePlayerPhotoUrl(playerId, navn) {
            const player = (playerId && typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(playerId)
                : null)
                || (navn && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(navn)
                    : null);
            if (typeof window.getPlayerProfilePhotoUrl === 'function') {
                return window.getPlayerProfilePhotoUrl(player) || '';
            }
            return '';
        }

        function splitHallOfFameValue(valueText) {
            const text = String(valueText || '').trim();
            if (!text || text === '—') return { primary: '', rest: '' };
            const parts = text.split(' · ');
            if (parts.length > 1) return { primary: parts[0], rest: parts.slice(1).join(' · ') };
            if (text.length <= 8) return { primary: text, rest: '' };
            return { primary: '', rest: text };
        }

        window.renderHallOfFamePlaqueHtml = function(award, rows, winners) {
            const withheld = award.withheldReason || '';
            const saved = withheld ? null : (winners[award.id] || null);
            const editing = withheld ? false : window.hallOfFameEditingId === award.id;
            const vote = award.vote === true;
            const players = vote
                ? window.getHallOfFameSquadPlayers()
                : rows
                    .map(item => ({
                        navn: item.navn || '',
                        playerId: typeof getStatsPlayerIdForName === 'function' ? getStatsPlayerIdForName(item.navn) : ''
                    }))
                    .filter(item => item.navn)
                    .sort((a, b) => a.navn.localeCompare(b.navn, 'no'));
            const picks = vote ? '' : (award.podium || []).map(entry => `
                <button
                    type="button"
                    class="hall-of-fame-btn is-crown"
                    data-stat-action="save-hall-award"
                    data-award-id="${escapeStatisticsHtml(award.id)}"
                    data-player-id="${escapeStatisticsHtml(entry.playerId || '')}"
                    data-player-name="${escapeStatisticsHtml(entry.navn || '')}"
                >Kår ${escapeStatisticsHtml(entry.navn || '')}</button>
            `).join('');
            const editor = editing ? `
                ${picks ? `<div class="hall-of-fame-picks">${picks}</div>` : ''}
                <select class="hall-of-fame-select" aria-label="${vote ? 'Velg fra spillertroppen' : 'Velg vinner av'} ${escapeStatisticsHtml(award.title)}">
                    <option value="" data-name="">${vote ? 'Velg fra troppen' : 'Velg spiller'}</option>
                    ${players.map(player => `
                        <option value="${escapeStatisticsHtml(player.playerId)}" data-name="${escapeStatisticsHtml(player.navn)}"${saved && saved.navn === player.navn ? ' selected' : ''}>${escapeStatisticsHtml(player.navn)}</option>
                    `).join('')}
                </select>
                <div class="hall-of-fame-actions">
                    <button type="button" class="hall-of-fame-btn is-gold" data-stat-action="save-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Lagre</button>
                    <button type="button" class="hall-of-fame-btn" data-stat-action="cancel-hall-award">Avbryt</button>
                </div>
            ` : '';
            const podium = (!vote && !withheld && Array.isArray(award.podium)) ? award.podium : [];
            const first = podium[0] || null;
            const avatarHtml = (playerId, navn) => {
                const photo = getHallOfFamePlayerPhotoUrl(playerId, navn);
                return `
                    <span class="hall-of-fame-avatar" aria-hidden="true">
                        ${photo
                            ? `<img src="${escapeStatisticsHtml(photo)}" alt="" loading="lazy" decoding="async">`
                            : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                    </span>
                `;
            };
            const valueParts = splitHallOfFameValue(first && first.valueText);
            const scoreHtml = valueParts.primary
                ? `<div class="hall-of-fame-score"><span class="hall-of-fame-score-value">${escapeStatisticsHtml(valueParts.primary)}</span></div>`
                : '';
            const playHtml = valueParts.rest
                ? `<p class="hall-of-fame-play">${escapeStatisticsHtml(valueParts.rest)}</p>`
                : '';
            const rackHtml = podium.slice(1, 3).map((entry, index) => `
                <div class="hall-of-fame-tile">
                    <strong>${index + 2}</strong>
                    <span class="hall-of-fame-tile-copy">
                        <span>${escapeStatisticsHtml(entry.navn || '')}</span>
                        ${entry.valueText ? `<em>${escapeStatisticsHtml(entry.valueText)}</em>` : ''}
                    </span>
                </div>
            `).join('');
            const rack = rackHtml ? `<div class="hall-of-fame-rack">${rackHtml}</div>` : '';
            const prizeLabels = { player: '3K', 'spillernes-beste': '2.5K', mal: '1K', nykommer: '1K', oppmote: '2.5K', 'spillernes-favoritt': '1K', forsvar: '1K', midtbane: '1K', angrep: '1K', kampgeneral: '1K' };
            const prizeChip = prizeLabels[award.id]
                ? `<span class="hall-of-fame-pos-chip">${prizeLabels[award.id]}</span>`
                : '';
            const firstBlock = first ? `
                <div class="hall-of-fame-identity">
                    ${avatarHtml(first.playerId, first.navn)}
                    <div class="hall-of-fame-identity-text">
                        <div class="hall-of-fame-name-row">
                            <p class="hall-of-fame-winner">${escapeStatisticsHtml(first.navn || '')}</p>
                            ${scoreHtml}
                        </div>
                        ${playHtml}
                    </div>
                </div>
                ${rack}
            ` : '';
            const crownedNote = saved && first && saved.navn !== first.navn
                ? `<p class="hall-of-fame-hint">Kåret: ${escapeStatisticsHtml(saved.navn)}</p>`
                : '';
            const body = withheld ? `
                <p class="hall-of-fame-winner is-pending">Deles ikke ut</p>
                <p class="hall-of-fame-hint">${escapeStatisticsHtml(withheld)}</p>
                ${prizeChip ? `<div class="hall-of-fame-actions">${prizeChip}</div>` : ''}
            ` : (editing ? `
                <p class="hall-of-fame-winner${saved ? '' : ' is-pending'}">${saved ? escapeStatisticsHtml(saved.navn) : 'Velg vinner'}</p>
                ${editor}
            ` : (first ? `
                ${firstBlock}
                ${crownedNote}
                <div class="hall-of-fame-actions">
                    ${saved ? `
                        <button type="button" class="hall-of-fame-btn" data-stat-action="edit-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Endre</button>
                        <button type="button" class="hall-of-fame-btn" data-stat-action="clear-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Fjern</button>
                    ` : `
                        <button
                            type="button"
                            class="hall-of-fame-btn is-crown"
                            data-stat-action="save-hall-award"
                            data-award-id="${escapeStatisticsHtml(award.id)}"
                            data-player-id="${escapeStatisticsHtml(first.playerId || '')}"
                            data-player-name="${escapeStatisticsHtml(first.navn || '')}"
                        >Kår ${escapeStatisticsHtml(first.navn)}</button>
                        <button type="button" class="hall-of-fame-btn" data-stat-action="edit-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Velg spiller</button>
                    `}
                    ${prizeChip}
                </div>
            ` : (saved ? `
                <div class="hall-of-fame-identity">
                    ${avatarHtml(saved.playerId, saved.navn)}
                    <div class="hall-of-fame-identity-text">
                        <p class="hall-of-fame-winner">${escapeStatisticsHtml(saved.navn || '')}</p>
                    </div>
                </div>
                <div class="hall-of-fame-actions">
                    <button type="button" class="hall-of-fame-btn" data-stat-action="edit-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Endre</button>
                    <button type="button" class="hall-of-fame-btn" data-stat-action="clear-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">Fjern</button>
                    ${prizeChip}
                </div>
            ` : `
                <p class="hall-of-fame-winner is-pending">Ikke kåret</p>
                ${vote
                    ? '<p class="hall-of-fame-hint">Avgjøres av spillernes stemmer. Velg fra troppen.</p>'
                    : '<p class="hall-of-fame-hint">Ingen statistikk å foreslå fra ennå.</p>'}
                <div class="hall-of-fame-actions">
                    <button type="button" class="hall-of-fame-btn${vote ? ' is-crown' : ''}" data-stat-action="edit-hall-award" data-award-id="${escapeStatisticsHtml(award.id)}">${vote ? 'Velg fra troppen' : 'Velg spiller'}</button>
                    ${prizeChip}
                </div>
            `)));
            const explain = window.getHallOfFameAwardExplain(award);
            const infoOpen = Boolean(explain) && window.hallOfFameInfoId === award.id;
            const infoId = `hall-award-info-${escapeStatisticsHtml(award.id)}`;
            const chips = [
                saved && !editing ? '<span class="hall-of-fame-official">Offisiell</span>' : ''
            ].filter(Boolean).join('');
            return `
                <article class="hall-of-fame-plaque${saved ? ' is-filled' : ' is-empty'}${withheld ? ' is-withheld' : ''}${editing ? ' is-editing' : ''}${infoOpen ? ' is-info-open' : ''}">
                    <span class="hall-of-fame-gem">${escapeStatisticsHtml(award.title)}</span>
                    <span class="hall-of-fame-mark" aria-hidden="true">${window.renderStatsAwardIconHtml(award)}</span>
                    ${chips ? `<div class="hall-of-fame-meta">${chips}</div>` : ''}
                    ${explain ? `
                            <button
                                type="button"
                                class="hall-of-fame-info-btn${infoOpen ? ' is-active' : ''}"
                                data-stat-action="toggle-hall-info"
                                data-award-id="${escapeStatisticsHtml(award.id)}"
                                aria-expanded="${infoOpen ? 'true' : 'false'}"
                                aria-controls="${infoId}"
                                title="Forklaring av ${escapeStatisticsHtml(award.title)}"
                                aria-label="Forklaring av ${escapeStatisticsHtml(award.title)}"
                            >
                                <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                            </button>
                        ` : ''}
                    ${explain ? `
                        <p id="${infoId}" class="hall-of-fame-explain${infoOpen ? '' : ' is-hidden'}" ${infoOpen ? '' : 'hidden'}>${window.renderHallOfFameExplainHtml(explain)}</p>
                    ` : ''}
                    ${body}
                </article>
            `;
        };

        window.HALL_OF_FAME_AWARD_IDS = ['player', 'mal', 'nykommer', 'forsvar', 'midtbane', 'angrep', 'oppmote'];

        window.renderHallOfFamePanelHtml = function() {
            const model = typeof window.buildStatsAwardsModel === 'function'
                ? window.buildStatsAwardsModel()
                : { year: new Date().getFullYear(), groups: [] };
            const yearFilter = model.year;
            const rows = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true, yearFilter })
                : [];
            const winners = window.getHallOfFameWinners();
            const hallIds = new Set(window.HALL_OF_FAME_AWARD_IDS);
            const reservedAwards = [];
            const groups = (model.groups || []).map(group => {
                const awards = (group.awards || []).filter(award => hallIds.has(award.id));
                const shown = [];
                awards.forEach(award => {
                    const withheldReason = window.hallOfFameLineAwardWithheldReason(award, rows, winners, model);
                    if (withheldReason) {
                        reservedAwards.push({ ...award, withheldReason });
                        return;
                    }
                    shown.push(award);
                });
                window.getHallOfFameVoteAwards()
                    .filter(award => award.hallGroup === group.id)
                    .forEach(award => {
                        const playerIndex = shown.findIndex(item => item.id === 'player');
                        shown.splice(playerIndex >= 0 ? playerIndex + 1 : shown.length, 0, award);
                    });
                if (!shown.length) return '';
                return `
                <section class="hall-of-fame-group" aria-label="${escapeStatisticsHtml(group.label)}">
                    <h4 class="hall-of-fame-group-title">${escapeStatisticsHtml(group.label)}</h4>
                    <div class="hall-of-fame-grid">
                        ${shown.map(award => window.renderHallOfFamePlaqueHtml(award, rows, winners)).join('')}
                    </div>
                </section>
            `;
            }).join('');
            reservedAwards.push(window.getHallOfFameKampGeneralAward(rows));
            reservedAwards.push(window.getHallOfFameFairPlayAward(rows));
            const reserveGroup = reservedAwards.length ? `
                <section class="hall-of-fame-group" aria-label="Reserve kåringer">
                    <h4 class="hall-of-fame-group-title">Reserve kåringer</h4>
                    <div class="hall-of-fame-grid">
                        ${reservedAwards.map(award => window.renderHallOfFamePlaqueHtml(award, rows, winners)).join('')}
                    </div>
                </section>
            ` : '';
            const looseVotes = window.getHallOfFameVoteAwards().filter(award => !award.hallGroup);
            const voteGroup = looseVotes.length ? `
                <section class="hall-of-fame-group" aria-label="Spillernes stemmer">
                    <h4 class="hall-of-fame-group-title">Spillernes stemmer</h4>
                    <div class="hall-of-fame-grid">
                        ${looseVotes.map(award => window.renderHallOfFamePlaqueHtml(award, rows, winners)).join('')}
                    </div>
                </section>
            ` : '';
            return window.renderStatsCollapsiblePanelHtml({
                id: 'halloffame',
                title: 'Hall of Fame',
                clash: true,
                showLabel: 'Vis Hall of Fame',
                hideLabel: 'Skjul Hall of Fame',
                markHtml: '<span class="stats-clash-heading-mark" aria-hidden="true"><i class="fa-solid fa-trophy"></i></span>',
                headerActionsHtml: `<span class="stats-clash-year">${escapeStatisticsHtml(String(yearFilter))}</span>`,
                content: `
                    <div class="hall-of-fame-hall">
                        <i class="fa-solid fa-trophy hall-of-fame-watermark" aria-hidden="true"></i>
                        <p class="hall-of-fame-lead">De offisielle kåringene for sesongen. Statistikken foreslår, laget kårer.</p>
                        ${groups}
                        ${reserveGroup}
                        ${voteGroup}
                    </div>
                `
            });
        };

        window.renderHallOfFameSlot = function() {
            const slot = document.getElementById('stats-hall-of-fame-slot');
            if (!slot || typeof window.renderHallOfFamePanelHtml !== 'function') return;
            slot.innerHTML = window.renderHallOfFamePanelHtml();
        };

        window.renderStatsAwardsPanelHtml = function() {
            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : new Date().getFullYear();
            const yearOptions = typeof window.getStatsSpillerYearOptions === 'function'
                ? window.getStatsSpillerYearOptions()
                : [];
            const yearFilterHtml = typeof window.renderStatsYearFilterHtml === 'function'
                ? window.renderStatsYearFilterHtml(
                    'Filtrer kåringer etter år',
                    yearOptions,
                    yearFilter,
                    { includeAlle: false }
                )
                : '';
            const model = window.buildStatsAwardsModel();
            return window.renderStatsCollapsiblePanelHtml({
                id: 'sesongkaaringer',
                title: 'Sesongens kåringer',
                badge: yearFilter,
                showLabel: 'Vis kåringer',
                hideLabel: 'Skjul kåringer',
                headerActionsHtml: `
                    <button
                        type="button"
                        class="training-session-attendance-add-btn match-print-sheet-btn"
                        data-stat-action="print-awards"
                        title="Skriv ut sesongens kåringer"
                        aria-label="Skriv ut sesongens kåringer"
                    >
                        <i class="fa-solid fa-print" aria-hidden="true"></i>
                        <span>Skriv ut</span>
                    </button>
                `,
                content: `
                    ${yearFilterHtml}
                    ${window.renderStatsAwardsCardHtml(model)}
                `
            });
        };

        window.buildStatsAwardsPrintSheetHtml = function(model) {
            const data = model || window.buildStatsAwardsModel();
            const yearLabel = data.year === 'alle' ? 'Alle år' : String(data.year);
            return `
                <header class="match-print-header">
                    <h1>Sesongens kåringer</h1>
                    <p class="match-print-meta">${escapeStatisticsHtml(data.teamName || 'BSK')} · ${escapeStatisticsHtml(yearLabel)}</p>
                </header>
                ${(data.groups || []).map((group) => `
                    <section class="match-print-section stats-awards-print-section">
                        <h2>${escapeStatisticsHtml(group.label)}</h2>
                        <div class="stats-awards-print-grid">
                            ${(group.awards || []).map((award) => `
                                <div class="stats-awards-print-item">
                                    <h3>${escapeStatisticsHtml(award.title)}</h3>
                                    ${award.explain ? `<p class="stats-awards-print-explain">${escapeStatisticsHtml(award.explain)}</p>` : ''}
                                    ${award.podium.length ? `
                                        <table class="stats-awards-print-table">
                                            <tbody>
                                                ${award.podium.map((entry, index) => `
                                                    <tr>
                                                        <td class="stats-awards-print-rank">${index + 1}</td>
                                                        <td class="stats-awards-print-name">${escapeStatisticsHtml(entry.navn)}</td>
                                                        <td class="stats-awards-print-value">${escapeStatisticsHtml(entry.valueText)}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    ` : '<p class="match-print-empty">Ingen data</p>'}
                                </div>
                            `).join('')}
                        </div>
                    </section>
                `).join('')}
            `;
        };

        window.cleanupStatsAwardsPrintSheet = function() {
            document.documentElement.classList.remove('is-printing-awards-sheet');
            document.body.classList.remove('is-printing-awards-sheet');
            document.getElementById('stats-awards-print-sheet')?.remove();
            if (window._statsAwardsPrintCleanup) {
                window.removeEventListener('afterprint', window._statsAwardsPrintCleanup);
                window._statsAwardsPrintCleanup = null;
            }
            if (window._statsAwardsPrintCleanupTimer) {
                clearTimeout(window._statsAwardsPrintCleanupTimer);
                window._statsAwardsPrintCleanupTimer = null;
            }
        };

        window.printStatsAwardsSheet = function() {
            window.cleanupStatsAwardsPrintSheet();
            const sheet = document.createElement('div');
            sheet.id = 'stats-awards-print-sheet';
            sheet.setAttribute('aria-hidden', 'true');
            sheet.innerHTML = window.buildStatsAwardsPrintSheetHtml();
            document.body.appendChild(sheet);
            document.documentElement.classList.add('is-printing-awards-sheet');
            document.body.classList.add('is-printing-awards-sheet');

            const cleanup = () => window.cleanupStatsAwardsPrintSheet();
            window._statsAwardsPrintCleanup = cleanup;
            window.addEventListener('afterprint', cleanup);
            window._statsAwardsPrintCleanupTimer = setTimeout(cleanup, 60000);

            requestAnimationFrame(() => {
                window.print();
            });
        };

        window.renderStatsOppfolgingPanelHtml = function() {
            const followUps = Array.isArray(window._statsFollowUps)
                ? window._statsFollowUps
                : [];
            return window.renderStatsCollapsiblePanelHtml({
                id: 'oppfolging',
                title: 'Oppfølging',
                badge: followUps.length,
                showLabel: 'Vis oppfølging',
                hideLabel: 'Skjul oppfølging',
                content: window.renderStatsFollowUpsHtml(followUps)
            });
        };

        window.renderStatsUtviklingPanelHtml = function() {
            return window.renderStatsCollapsiblePanelHtml({
                id: 'spillerutvikling',
                title: 'Diagrammer',
                showLabel: 'Vis diagrammer',
                hideLabel: 'Skjul diagrammer',
                content: `
                    <div class="stats-diagram-stack">
                        <div id="team-score-diagram-wrap" class="team-score-diagram-wrap">
                            ${window.renderTeamScoreDiagramHtml()}
                        </div>
                        <div id="stats-formkart-wrap" class="team-score-diagram-wrap">
                            ${window.renderStatsFormDiagramHtml()}
                        </div>
                        <div id="stats-linjekart-wrap" class="team-score-diagram-wrap">
                            ${window.renderStatsLineDiagramHtml()}
                        </div>
                    </div>
                `
            });
        };

        window.renderStatsSpillereSummary = function() {
            const summary = document.getElementById('stats-spillere-summary');
            if (summary) summary.innerHTML = '';

            const diagramWrap = document.getElementById('team-score-diagram-wrap');
            if (diagramWrap && typeof window.renderTeamScoreDiagramHtml === 'function') {
                diagramWrap.innerHTML = window.renderTeamScoreDiagramHtml();
            }
            const formWrap = document.getElementById('stats-formkart-wrap');
            if (formWrap && typeof window.renderStatsFormDiagramHtml === 'function') {
                formWrap.innerHTML = window.renderStatsFormDiagramHtml();
            }
            const lineWrap = document.getElementById('stats-linjekart-wrap');
            if (lineWrap && typeof window.renderStatsLineDiagramHtml === 'function') {
                lineWrap.innerHTML = window.renderStatsLineDiagramHtml();
            }
        };

        window.renderStatsKampContext = function() {
            const container = document.getElementById('stats-kamp-context');
            const data = window._statsKampHeroData;
            if (!container) return;
            if (!data) {
                container.innerHTML = '';
                return;
            }

            const { playedMatches, matchId, matchType, pitch, matchResult, form = '', attendingCount = 0 } = data;
            const match = (window.activeMatches || []).find(m => m.id === matchId) || null;
            const dateValue = match?.date ? new Date(match.date) : null;
            const hasDate = dateValue && !Number.isNaN(dateValue.getTime());
            const day = hasDate ? dateValue.toLocaleDateString('no-NO', { day: '2-digit' }) : '--';
            const month = hasDate
                ? dateValue.toLocaleDateString('no-NO', { month: 'short' }).replace('.', '').toUpperCase()
                : '---';
            const weekday = hasDate
                ? dateValue.toLocaleDateString('no-NO', { weekday: 'short' }).replace('.', '')
                : '';
            const formTone = form === 'S' ? 'is-win' : (form === 'T' ? 'is-loss' : (form === 'U' ? 'is-draw' : ''));
            const resultTone = formTone || '';
            const metaParts = [matchType, pitch, attendingCount ? `${attendingCount} oppmøtt` : ''].filter(Boolean);
            const opponentLogoHtml = (match?.opponent && typeof window.buildClubLogoImgHtml === 'function')
                ? window.buildClubLogoImgHtml(match.opponent, 'match-fixture-opponent-logo')
                : '';
            const opponentMarkHtml = opponentLogoHtml || `
                <span class="match-fixture-opponent-logo match-fixture-opponent-fallback" aria-hidden="true">
                    <i class="fa-solid fa-shield"></i>
                </span>
            `;

            container.innerHTML = `
                <article class="stats-kamp-bar match-fixture-row ${resultTone}">
                    <div class="match-fixture-date" aria-hidden="true">
                        <span class="match-fixture-date-day">${escapeStatsHtml(day)}</span>
                        <span class="match-fixture-date-month">${escapeStatsHtml(month)}</span>
                    </div>

                    <div class="match-fixture-main">
                        ${weekday ? `<span class="match-fixture-weekday">${escapeStatsHtml(weekday)}</span>` : ''}
                        <div class="stats-kamp-opponent-line">
                            ${opponentMarkHtml}
                            <span class="stats-kamp-select-wrap stats-hero-select-wrap">
                                <select id="kampstat-match-select" onfocus="expandKampSelectLabels()" onmousedown="expandKampSelectLabels()" onblur="collapseKampSelectLabel()" onchange="showMatchStatsTable()" class="portal-field portal-field-display truncate stats-kamp-opponent-select" aria-label="Velg kamp">
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
                        ${metaParts.length ? `<span class="match-fixture-meta">${escapeStatsHtml(metaParts.join(' · '))}</span>` : ''}
                    </div>

                    <div class="match-fixture-side stats-kamp-bar-side">
                        <span class="match-fixture-side-value">${escapeStatsHtml(matchResult)}</span>
                        ${form ? `<span class="stats-kamp-bar-form stats-form-history-result-pill ${formTone}">${escapeStatsHtml(form)}</span>` : ''}
                    </div>
                </article>
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
                        <span>Form (nå) ${chemistry}/100</span>
                    </div>
                `,
                `<p class="stats-chrome-subtitle">${escapeStatisticsHtml(player.pos1 || 'Spiller')} · ${escapeStatisticsHtml(player.spillerLag || '')} · ${escapeStatisticsHtml(formComparison)}${teamMedian > 0 ? ` (${teamMedian} median)` : ''}</p>`
            ));
        };

        window.renderPlayerStatsList = function() {
            const list = document.getElementById('stats-player-list');
            if (!list) return;
            currentStatSortDesc = true;

            let statsData = typeof window.getStatsSpillerListData === 'function'
                ? window.getStatsSpillerListData()
                : window.buildPlayerStatsData({ applyYearFilter: true });
            statsData = statsData.filter(stat => window.playerStatsRelevantForSort(stat, currentStatSortCol));

            const sortRows = (rows) => {
                rows.sort((a, b) => {
                    if (typeof window.comparePlayerStatsSort === 'function') {
                        return window.comparePlayerStatsSort(a, b, currentStatSortCol, {
                            descending: currentStatSortDesc !== false
                        });
                    }
                    if (currentStatSortCol === 'navn') {
                        return currentStatSortDesc ? a.navn.localeCompare(b.navn) : b.navn.localeCompare(a.navn);
                    }
                    return currentStatSortDesc
                        ? b[currentStatSortCol] - a[currentStatSortCol]
                        : a[currentStatSortCol] - b[currentStatSortCol];
                });
                return rows;
            };

            let qualified = statsData;
            let belowThreshold = [];
            if (typeof window.statsSortUsesKampShareThreshold === 'function'
                && window.statsSortUsesKampShareThreshold(currentStatSortCol)
                && typeof window.playerMeetsKampShareThreshold === 'function') {
                qualified = sortRows(statsData.filter(stat => window.playerMeetsKampShareThreshold(stat)));
                belowThreshold = sortRows(statsData.filter(stat => !window.playerMeetsKampShareThreshold(stat)));
            } else {
                sortRows(statsData);
                qualified = statsData;
            }

            const sortOption = window.getStatsSortOption(currentStatSortCol);
            const sortLabel = sortOption?.label || 'Stat';
            const infoKind = typeof window.getStatsSpillerstatsInfoKind === 'function'
                ? window.getStatsSpillerstatsInfoKind(currentStatSortCol)
                : '';
            const headingHtml = `
                <div class="training-data-rank-heading">
                    <h5>${escapeStatisticsHtml(sortLabel)}</h5>
                    ${infoKind && typeof window.renderStatsSpillerstatsInfoButtonHtml === 'function'
                        ? window.renderStatsSpillerstatsInfoButtonHtml(infoKind)
                        : ''}
                </div>
                ${infoKind && typeof window.renderStatsSpillerstatsInfoPanelHtml === 'function'
                    ? window.renderStatsSpillerstatsInfoPanelHtml(infoKind)
                    : ''}
            `;
            const totalPlayers = qualified.length + belowThreshold.length;

            if (!totalPlayers) {
                const positionOption = typeof window.getStatsSpillerPositionFilterOption === 'function'
                    ? window.getStatsSpillerPositionFilterOption()
                    : { id: 'alle' };
                const emptyMessage = positionOption.id && positionOption.id !== 'alle'
                    ? `Ingen spillere med kamper som ${positionOption.label}.`
                    : window.getStatsSortEmptyMessage(currentStatSortCol);
                list.innerHTML = `
                    <div class="training-data-rank-block">
                        ${headingHtml}
                        <div class="training-data-empty">
                            <p>${escapeStatsHtml(emptyMessage)}</p>
                        </div>
                    </div>
                `;
                return;
            }

            const visibleLimit = 10;
            const isExpanded = window._statsPlayerListExpanded === true;
            const hasOverflow = totalPlayers > visibleLimit;

            const renderPlayerRow = (stat, rankIndex, overflow) => {
                const sortValue = window.formatStatsSortValue(stat, currentStatSortCol);
                const safeNameHtml = escapeStatisticsHtml(stat.navn);
                const playerIdAttr = escapeStatisticsHtml(getStatsPlayerIdForName(stat.navn));
                let valueHtml = escapeStatisticsHtml(sortValue);
                if (currentStatSortCol === 'oppmotePct' && (Number(stat.oppmotePossible) || 0) > 0) {
                    const pct = Math.round(Number(stat.oppmotePct) || 0);
                    const attended = Number(stat.oppmoteAttended) || 0;
                    const possible = Number(stat.oppmotePossible) || 0;
                    valueHtml = `${pct}% <span class="training-data-rank-count">${attended}/${possible}</span>`;
                }
                if ((currentStatSortCol === 'mal' || currentStatSortCol === 'assist' || currentStatSortCol === 'snittBors' || currentStatSortCol === 'totalScore' || currentStatSortCol === 'expectedMalpoeng' || currentStatSortCol === 'gule' || currentStatSortCol === 'bb') && (Number(stat.kamper) || 0) > 0) {
                    valueHtml = `${escapeStatisticsHtml(sortValue)} <span class="training-data-rank-count">${Number(stat.kamper)} kamper</span>`;
                }
                return `
                    <li class="${overflow ? 'is-overflow' : ''}">
                        <button type="button" class="training-data-rank-row" data-stat-action="open-player" data-player-id="${playerIdAttr}" data-player-name="${safeNameHtml}" aria-label="${safeNameHtml}, plass ${rankIndex + 1}, ${escapeStatisticsHtml(sortLabel)} ${escapeStatisticsHtml(sortValue)}">
                            <span class="training-data-rank-index">${rankIndex + 1}.</span>
                            <span class="training-data-rank-name">${safeNameHtml}</span>
                            <strong>${valueHtml}</strong>
                        </button>
                    </li>
                `;
            };

            let visiblePlayerCount = 0;
            const qualifiedHtml = qualified.map((stat, index) => {
                const overflow = visiblePlayerCount >= visibleLimit;
                visiblePlayerCount += 1;
                return renderPlayerRow(stat, index, overflow);
            }).join('');

            let belowHtml = '';
            if (belowThreshold.length) {
                const sepOverflow = visiblePlayerCount >= visibleLimit;
                belowHtml = `
                    <li class="training-data-rank-separator${sepOverflow ? ' is-overflow' : ''}" role="presentation">
                        <span class="training-data-rank-separator-line" aria-hidden="true"></span>
                        <span class="training-data-rank-separator-label">Under 50 % kamper</span>
                        <span class="training-data-rank-separator-line" aria-hidden="true"></span>
                    </li>
                    ${belowThreshold.map((stat, index) => {
                        const overflow = visiblePlayerCount >= visibleLimit;
                        visiblePlayerCount += 1;
                        return renderPlayerRow(stat, index, overflow);
                    }).join('')}
                `;
            }

            list.innerHTML = `
                <div class="training-data-rank-block">
                    ${headingHtml}
                    <ul class="training-data-rank-list ${isExpanded ? 'is-expanded' : ''}">
                        ${qualifiedHtml}
                        ${belowHtml}
                    </ul>
                    ${hasOverflow ? `
                        <button
                            type="button"
                            class="training-data-rank-toggle"
                            data-stat-action="toggle-player-list"
                            aria-expanded="${isExpanded ? 'true' : 'false'}"
                        >
                            ${isExpanded ? 'Vis færre' : `Vis alle (${totalPlayers})`}
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
            }

            // Paint shell immediately so the Statistikk click feels instant.
            if (typeof window.paintStatsOpeningShell === 'function') {
                window.paintStatsOpeningShell(tabId);
            }

            if (typeof window.scheduleStatsHeavyWork === 'function') {
                window.scheduleStatsHeavyWork(() => {
                    window.renderStatistikkSide({ skipChrome: true });
                });
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
            { id: 'totalScore', label: 'Sesong', icon: 'fa-ranking-star' },
            { id: 'kampbonus', label: 'Kampbidrag', icon: 'fa-chart-line' },
            { id: 'kjemi', label: 'Form', icon: 'fa-heart-pulse' },
            { id: 'snittBors', label: 'Snittbørs', icon: 'fa-star' },
            { id: 'mal', label: 'Mål', icon: 'fa-futbol' },
            { id: 'assist', label: 'Assist', icon: 'fa-handshake-angle' },
            { id: 'expectedMalpoeng', label: 'Expected målpoeng', glyph: 'xp' },
            { id: 'gule', label: 'Gule kort', glyph: 'g' },
            { id: 'rode', label: 'Røde kort', glyph: 'r' },
            { id: 'bb', label: 'Banens beste', icon: 'fa-crown' },
            { id: 'oppmotePct', label: 'Oppmøte', icon: 'fa-user-check', title: 'Treningsoppmøte: møtt / mulige økter med registrert oppmøte' },
            { id: 'kamper', label: 'Kamper', icon: 'fa-shield-halved' },
            { id: 'minutesTotal', label: 'Minutter', icon: 'fa-stopwatch', title: 'Total / snitt per kamp' },
            { id: 'minutesSharePct', label: 'Minuttandel', icon: 'fa-chart-pie' }
        ];

        window.getStatsSortOption = function(id) {
            return (window.STATS_PLAYER_SORT_OPTIONS || []).find(opt => opt.id === id);
        };

        window.formatStatsSortValue = function(statOrColumn, columnOrValue) {
            // Støtt både (stat, column) og (column, value)
            if (statOrColumn && typeof statOrColumn === 'object') {
                const stat = statOrColumn;
                const column = columnOrValue;
                if (!stat) return '-';
                if (column === 'oppmotePct') {
                    return typeof window.formatOppmoteDisplay === 'function'
                        ? window.formatOppmoteDisplay(stat)
                        : `${Number(stat.oppmotePct) || 0}%`;
                }
                if (column === 'minutesSharePct') {
                    if (!(Number(stat.minutesPossible) > 0) || stat.minutesSharePct == null) return '-';
                    return `${Math.round(Number(stat.minutesSharePct) || 0)}%`;
                }
                if (column === 'minutesTotal') {
                    return typeof window.formatMinutesTotalDisplay === 'function'
                        ? window.formatMinutesTotalDisplay(stat)
                        : '-';
                }
                if (column === 'totalScore' || column === 'kampbonus' || column === 'kampbonusTotal' || column === 'snittBors' || column === 'expectedMalpoeng') {
                    if (column === 'expectedMalpoeng') {
                        const xp = Number(stat.expectedMalpoeng);
                        if (!(Number(stat.kamper) > 0) || !Number.isFinite(xp) || xp <= 0) return '-';
                        return xp.toFixed(1);
                    }
                    const value = Number(stat[column]);
                    if ((column === 'kampbonus' || column === 'kampbonusTotal') && !(stat.attendedMatches > 0)) return '-';
                    if (!Number.isFinite(value) || value <= 0) return '-';
                    if (column === 'kampbonusTotal') {
                        const rounded = Math.round(value * 10) / 10;
                        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
                    }
                    return value.toFixed(1);
                }
                if (column === 'kjemi') return String(stat.kjemi || 0);
                const value = stat[column];
                if (value == null || value === '') return '-';
                return String(value);
            }

            const column = statOrColumn;
            const numeric = Number(columnOrValue);
            if (Number.isNaN(numeric)) return '-';
            if (column === 'oppmotePct' || column === 'minutesSharePct') return `${Math.round(numeric)}%`;
            if (column === 'minutesTotal') return numeric > 0 ? `${Math.round(numeric)}'` : '-';
            if (column === 'kjemi') return String(Math.round(numeric));
            if (column === 'kampbonus' || column === 'snittBors' || column === 'totalScore') {
                return numeric > 0 ? numeric.toFixed(1) : '-';
            }
            if (column === 'kampbonusTotal') {
                if (!(numeric > 0)) return '-';
                const rounded = Math.round(numeric * 10) / 10;
                return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
            }
            if (column === 'expectedMalpoeng') {
                return Number.isFinite(numeric) && numeric > 0 ? numeric.toFixed(1) : '-';
            }
            if (numeric > 0 || column === 'kamper') return String(Math.round(numeric));
            return '-';
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
                    title="${opt.title || opt.label}"
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

        const bindStatsExplainEscape = () => {
            if (window._statsExplainKeyBound) return;
            window._statsExplainKeyBound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                const total = document.getElementById('total-score-info-modal');
                if (total && !total.classList.contains('hidden')) window.closeTotalScoreInfoModal();
                const kamp = document.getElementById('kampbidrag-info-modal');
                if (kamp && !kamp.classList.contains('hidden')) window.closeKampbidragInfoModal();
            });
        };

        const openStatsExplainModal = (modalId, trigger) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            bindStatsExplainEscape();
            window._statsExplainReturn = trigger && trigger.focus ? trigger : null;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            const closeBtn = modal.querySelector('[data-close-stats-explain]');
            if (closeBtn) closeBtn.focus();
        };

        const closeStatsExplainModal = (modalId) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            const trigger = window._statsExplainReturn;
            window._statsExplainReturn = null;
            if (trigger && document.contains(trigger)) trigger.focus();
        };

        window.openTotalScoreInfoModal = function(trigger) {
            openStatsExplainModal('total-score-info-modal', trigger);
        };

        window.closeTotalScoreInfoModal = function() {
            closeStatsExplainModal('total-score-info-modal');
        };

        window.openKampbidragInfoModal = function(trigger) {
            openStatsExplainModal('kampbidrag-info-modal', trigger);
        };

        window.closeKampbidragInfoModal = function() {
            closeStatsExplainModal('kampbidrag-info-modal');
        };

        window.STATS_SPILLERSTATS_INFO = {
            totalScore: {
                title: 'Spillerstats · Sesong',
                buttonLabel: 'Slik regnes sesong',
                items: [
                    '<strong>Sesong</strong> rangeres etter Total Score: kampbidrag 50 %, spillerbørs 25 %, treningsoppmøte 15 % og disiplin 10 %.',
                    'Krever minst 50 % av lagets kamper for å ligge øverst.'
                ]
            },
            kampbonus: {
                title: 'Spillerstats · Kampbidrag',
                buttonLabel: 'Slik regnes kampbidrag',
                items: [
                    '<strong>Kampbidrag</strong> er snitt kamppoeng i kampene spilleren har vært med på.',
                    'Per kamp: 15 + resultat + børs + minutter. Børs 5 er par. 61+ min gir +2. Seier +5, uavgjort +2, tap −2, rent null +3, ±1 per mål.',
                    'Krever minst 50 % av lagets kamper for å ligge øverst. Benk uten minutter får bare de 15 grunnpoengene.'
                ]
            },
            kjemi: {
                title: 'Spillerstats · Form',
                buttonLabel: 'Slik regnes form',
                items: [
                    '<strong>Form</strong> er siste 5 kamper. Skala 0–100.',
                    'Nyeste kamp teller mest: ved 5 kamper vektes de 5–4–3–2–1. En fersk kamp trekker Form mer enn en eldre i det vinduet.',
                    'Kampdel inntil 80 (15 + børs + minutter + seier +2 / uavgjort +1 / tap 0) og oppmøte 20. Kort teller ikke i Form.',
                    'Krever minst 50 % av lagets kamper for å ligge øverst. Uten minst én kamp blir Form 0.'
                ]
            }
        };
        window.statsSpillerstatsInfoOpen = window.statsSpillerstatsInfoOpen || {};

        window.getStatsSpillerstatsInfoKind = function(kind) {
            const key = String(kind || '');
            return (window.STATS_SPILLERSTATS_INFO || {})[key] ? key : '';
        };

        window.isStatsSpillerstatsInfoOpen = function(kind) {
            const key = window.getStatsSpillerstatsInfoKind(kind);
            return key ? window.statsSpillerstatsInfoOpen?.[key] === true : false;
        };

        window.renderStatsSpillerstatsExplanationHtml = function(kind) {
            const key = window.getStatsSpillerstatsInfoKind(kind);
            const info = (window.STATS_SPILLERSTATS_INFO || {})[key];
            if (!info) return '';
            return `
                <p class="training-session-groups-info-title">${info.title}</p>
                <ul class="training-session-groups-info-list">
                    ${(info.items || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
            `;
        };

        window.renderStatsSpillerstatsInfoButtonHtml = function(kind) {
            const key = window.getStatsSpillerstatsInfoKind(kind);
            const info = (window.STATS_SPILLERSTATS_INFO || {})[key];
            if (!info) return '';
            const open = window.isStatsSpillerstatsInfoOpen(key);
            const panelId = `stats-spillerstats-info-${key}`;
            return `
                <button
                    type="button"
                    class="training-session-groups-info-btn stats-spillerstats-heading-info-btn${open ? ' is-active' : ''}"
                    data-stat-action="toggle-spillerstats-info"
                    data-spillerstats-info="${key}"
                    aria-expanded="${open ? 'true' : 'false'}"
                    aria-controls="${panelId}"
                    title="${escapeStatisticsHtml(info.buttonLabel)}"
                    aria-label="${escapeStatisticsHtml(info.buttonLabel)}"
                >
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                </button>
            `;
        };

        window.renderStatsSpillerstatsInfoPanelHtml = function(kind) {
            const key = window.getStatsSpillerstatsInfoKind(kind);
            if (!key) return '';
            const open = window.isStatsSpillerstatsInfoOpen(key);
            return `
                <div
                    id="stats-spillerstats-info-${key}"
                    class="training-session-groups-info${open ? '' : ' is-hidden'}"
                    ${open ? '' : 'hidden'}
                >
                    ${window.renderStatsSpillerstatsExplanationHtml(key)}
                </div>
            `;
        };

        window.toggleStatsSpillerstatsInfo = function(kind) {
            const key = window.getStatsSpillerstatsInfoKind(kind) || window.getStatsSpillerstatsInfoKind(currentStatSortCol);
            if (!key) return;
            window.statsSpillerstatsInfoOpen = window.statsSpillerstatsInfoOpen || {};
            window.statsSpillerstatsInfoOpen[key] = !window.isStatsSpillerstatsInfoOpen(key);
            if (typeof window.renderPlayerStatsList === 'function') {
                window.renderPlayerStatsList();
            }
        };

        window.renderStatsSpillerstatsPanelHtml = function() {
            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : new Date().getFullYear());
            const yearOptions = typeof window.getStatsSpillerYearOptions === 'function'
                ? window.getStatsSpillerYearOptions()
                : [];
            const yearFilterHtml = typeof window.renderStatsYearFilterHtml === 'function'
                ? window.renderStatsYearFilterHtml(
                    'Filtrer spillerstats etter år',
                    yearOptions,
                    yearFilter,
                    { includeAlle: false }
                )
                : '';
            return window.renderStatsCollapsiblePanelHtml({
                id: 'spillerliste',
                title: 'Spillerstats',
                badge: yearFilter,
                showLabel: 'Vis spillerstats',
                hideLabel: 'Skjul spillerstats',
                headerActionsHtml: `
                    <button
                        type="button"
                        data-stat-action="open-form-info"
                        class="training-session-groups-info-btn stats-chrome-info-btn"
                        title="Statsforklaring"
                        aria-label="Statsforklaring"
                    >
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    </button>
                `,
                content: `
                    ${yearFilterHtml}
                    <div class="stats-spillere-layout">
                        ${typeof window.renderStatsSpillerPositionFilterHtml === 'function'
                            ? window.renderStatsSpillerPositionFilterHtml()
                            : ''}
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
        };

        window.renderSpillereView = function() {
            window._statsSelectedPlayer = null;
            const container = document.getElementById('stat-spillere-content');
            if (!container) return;

            window.statsLagSection = 'spillerdata';
            // Chrome/tabs only — diagrams are rendered once inside utvikling-panelet below.
            const hero = document.getElementById('stats-tab-hero');
            if (hero && typeof window.paintStatsChrome === 'function' && typeof window.renderStatsChromeTabsOnly === 'function') {
                window.paintStatsChrome(window.renderStatsChromeTabsOnly(window.renderStatsHeroTabsHtml('spillere')));
            }
            const hallSlot = document.getElementById('stats-hall-of-fame-slot');
            if (hallSlot && typeof window.renderHallOfFameSlot === 'function') {
                window.renderHallOfFameSlot();
            }
            const awardsSlot = document.getElementById('stats-awards-slot');
            if (awardsSlot) {
                awardsSlot.innerHTML = typeof window.renderStatsAwardsPanelHtml === 'function'
                    ? window.renderStatsAwardsPanelHtml()
                    : '';
            }
            const spillerstatsSlot = document.getElementById('stats-spillerstats-slot');
            if (spillerstatsSlot) {
                spillerstatsSlot.innerHTML = typeof window.renderStatsSpillerstatsPanelHtml === 'function'
                    ? window.renderStatsSpillerstatsPanelHtml()
                    : '';
            }
            const utviklingSlot = document.getElementById('stats-utvikling-slot');
            if (utviklingSlot) {
                utviklingSlot.innerHTML = typeof window.renderStatsUtviklingPanelHtml === 'function'
                    ? window.renderStatsUtviklingPanelHtml()
                    : '';
            }
            const oppfolgingSlot = document.getElementById('stats-oppfolging-slot');
            if (oppfolgingSlot) {
                oppfolgingSlot.innerHTML = typeof window.renderStatsOppfolgingPanelHtml === 'function'
                    ? window.renderStatsOppfolgingPanelHtml()
                    : '';
            }

            container.innerHTML = '';

            window.renderPlayerStatsList();
            if (typeof window.updateStatsLagSectionVisibility === 'function') {
                window.updateStatsLagSectionVisibility();
            }
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
                ? window.getPlayerMatchPointsHistory(playerName, { applyYearFilter: true })
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
                            typeof window.getStatsSpillerYearFilter === 'function'
                                ? `Ingen spilte kamper er registrert for denne spilleren i ${window.getStatsSpillerYearFilter()}.`
                                : 'Ingen spilte kamper er registrert for denne spilleren ennå.'
                        )}
                    </div>
                `;
                return;
            }

            const yearFilter = typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function'
                    ? window.getStatsKampYearFilter()
                    : 'alle');
            const chemistry = typeof window.getPlayerFormComponents === 'function'
                ? window.getPlayerFormComponents(playerName, { yearFilter }).total
                : (typeof window.calculatePlayerPerformanceChemistry === 'function'
                    ? window.calculatePlayerPerformanceChemistry(playerName)
                    : 0);
            const teamMedian = typeof window.getTeamFormMedian === 'function'
                ? window.getTeamFormMedian(player.spillerLag)
                : 0;
            const formComparison = teamMedian > 0
                ? (chemistry >= teamMedian + 8 ? 'Over lagsmedian' : chemistry < teamMedian - 8 ? 'Under lagsmedian' : 'Om lagsmedian')
                : 'Ingen sammenligning';

            const totalMatches = history.length;
            const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
            const avgPoints = totalMatches ? totalPoints / totalMatches : 0;
            const playerStatsData = typeof window.buildPlayerStatsData === 'function'
                ? window.buildPlayerStatsData({ applyYearFilter: true })
                : [];
            const playerTotalStat = playerStatsData.find(stat => stat.navn === playerName);
            const totalRank = playerTotalStat
                ? (() => {
                    const relevant = playerStatsData.filter(stat =>
                        window.playerStatsRelevantForSort(stat, 'totalScore')
                    );
                    const playerScore = Number(playerTotalStat.totalScore) || 0;
                    const betterCount = relevant.filter(stat =>
                        (Number(stat.totalScore) || 0) > playerScore
                    ).length;
                    return betterCount + 1;
                })()
                : 0;
            const totalScoreText = playerTotalStat && playerTotalStat.totalScore > 0
                ? playerTotalStat.totalScore.toFixed(1)
                : '-';

            window.renderSpillerDetailHero(playerName, avgPoints, totalPoints, chemistry, formComparison, teamMedian, player);

            const card = window.statsMetricCardHtml;
            const trendData = typeof window.getPlayerPerformanceTrend === 'function'
                ? window.getPlayerPerformanceTrend(playerName, { applyYearFilter: true })
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
                        ${card('Form (nå)', chemistry + '/100', 'Beste nå — nylig børs og spilletid, oppmøte og disiplin', 'fa-heart-pulse', 'text-emerald-600')}
                        ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
                        ${card('Plassering (sesong)', totalRank > 0 ? String(totalRank) : '-', 'Beste sesong — rangert etter Total Score', 'fa-ranking-star', 'text-bsk-blue')}
                        ${card('Total score (sesong)', totalScoreText, 'Beste sesong: 50% kampbidrag · 25% børs · 15% oppmøte · 10% disiplin', 'fa-gauge-high', 'text-bsk-blue')}
                    </div>

                    <div class="stats-panel stats-player-chart-panel">
                        <div class="stats-panel-header">
                            <div class="stats-player-panel-heading">
                                <div class="min-w-0">
                                    <h3 class="stats-panel-title">Utvikling</h3>
                                    <p class="stats-panel-subtitle">Spillerutvikling vs troppens utvikling. Nyeste kamp til høyre.</p>
                                </div>
                                <button type="button" data-stat-action="open-form-info" class="training-session-groups-info-btn stats-chrome-info-btn stats-form-info-btn" title="Statsforklaring" aria-label="Statsforklaring">
                                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="stats-player-chart-wrap">
                            ${window.renderPlayerTrendChartSvg(trendData)}
                        </div>
                        <div class="stats-chart-legend" aria-hidden="true">
                            <span class="stats-chart-legend-item is-kampbidrag"><i></i> Spiller utvikling</span>
                            <span class="stats-chart-legend-item is-team-median"><i></i> Lagsmedian</span>
                        </div>
                    </div>

                    <div class="stats-panel stats-form-history-panel">
                        <div class="stats-panel-header">
                            <h3 class="stats-panel-title">Kamp for Kamp</h3>
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
                    if (typeof window.matchBelongsToStatsKampFilters === 'function' && !window.matchBelongsToStatsKampFilters(m)) return false;
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

        window.isMatchSummaryKeeperPlayer = function(match, playerObj) {
            if (!playerObj) return false;
            const pos = String(playerObj.pos1 || '').trim().toLowerCase();
            if (pos === 'keeper' || pos.includes('keeper')) return true;

            const gkRefs = [
                match?.lineupRefs?.GK,
                match?.lineup?.GK,
                typeof window.liveLineup === 'object' ? window.liveLineup?.GK : null
            ].filter(Boolean);

            return gkRefs.some(ref => {
                const gkPlayer = typeof ref === 'object'
                    ? ref
                    : (typeof window.findPlayerByRef === 'function' ? window.findPlayerByRef(ref) : ref);
                if (!gkPlayer) return false;
                if (typeof window.playerRefMatches === 'function') {
                    return window.playerRefMatches(gkPlayer, playerObj) || window.playerRefMatches(ref, playerObj);
                }
                const a = playerObj.id || playerObj.navn;
                const b = gkPlayer.id || gkPlayer.navn || gkPlayer;
                return a && b && String(a) === String(b);
            });
        };

        window.buildMatchSummaryStatsFromMatch = function(match) {
            if (!match) {
                return {
                    stats: [],
                    avgRating: 0,
                    goalsFor: null,
                    goalsAgainst: null,
                    totalYellow: 0,
                    totalRed: 0,
                    form: '',
                    matchResult: '',
                    matchType: 'Kamp'
                };
            }

            const matchResult = match.result || '';
            const matchType = match.type || match.matchType || 'Kamp';
            const outcomeScore = typeof window.getMatchOutcomeScore === 'function'
                ? window.getMatchOutcomeScore(match)
                : null;
            let form = '';
            if (outcomeScore) {
                if (outcomeScore.bsk > outcomeScore.opponent) form = 'S';
                else if (outcomeScore.bsk < outcomeScore.opponent) form = 'T';
                else form = 'U';
            }

            const regularScore = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(match)
                : (typeof window.parseScore === 'function' ? window.parseScore(match.result) : null);
            const goalsFor = regularScore ? regularScore.bsk : null;
            const goalsAgainst = regularScore ? regularScore.opponent : null;

            const participantRefs = typeof window.getMatchParticipantRefs === 'function'
                ? window.getMatchParticipantRefs(match)
                : (typeof window.getAttendingPlayerRefs === 'function'
                    ? window.getAttendingPlayerRefs(match.attendance)
                    : []);

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
                const minutesRaw = window.matchHasMinutesTracking(match)
                    ? window.getPlayerRefMapValue(match.minutesPlayed, playerObj, null)
                    : null;
                const minutes = minutesRaw === null || minutesRaw === undefined || minutesRaw === ''
                    ? null
                    : Math.max(0, Math.floor(Number(minutesRaw) || 0));
                const isBbInMatch = window.motmMatchesPlayer(match.motm, playerObj);
                const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
                    ? window.calculatePlayerMatchPoints(match, playerObj, true)
                    : { total: 0, onPitch: true };
                const isKeeper = window.isMatchSummaryKeeperPlayer(match, playerObj);
                const onPitch = pointsDetails.onPitch !== false;
                const formationId = typeof window.getMatchGamePlanFormation === 'function'
                    ? window.getMatchGamePlanFormation(match)
                    : String(match.formation || match.lineupFormation || '').trim();
                const posId = onPitch && typeof window.getPlayerMatchPlayedPositionIds === 'function'
                    ? ((window.getPlayerMatchPlayedPositionIds(match, playerObj) || [])[0] || '')
                    : (onPitch && typeof window.getPlayerMatchPlayedPositionId === 'function'
                        ? (window.getPlayerMatchPlayedPositionId(match, playerObj) || '')
                        : '');
                const posCode = posId && typeof window.getMatchGamePlanPositionBadgeLabel === 'function'
                    ? window.getMatchGamePlanPositionBadgeLabel(posId, formationId)
                    : posId;

                return {
                    id: playerObj.id || '',
                    name: playerObj.navn || window.getPlayerNameFromRef(playerRef),
                    rating,
                    goals,
                    assists,
                    yellow,
                    red,
                    minutes,
                    isBbInMatch,
                    isKeeper,
                    onPitch,
                    posCode,
                    points: pointsDetails.total || 0
                };
            });

            stats.sort((a, b) => (
                b.points - a.points
                || b.rating - a.rating
                || b.goals - a.goals
                || b.assists - a.assists
                || a.name.localeCompare(b.name, 'nb')
            ));

            const ratedStats = stats.filter(s => s.rating > 0);
            const avgRating = ratedStats.length
                ? ratedStats.reduce((sum, s) => sum + s.rating, 0) / ratedStats.length
                : 0;

            return {
                stats,
                avgRating,
                goalsFor,
                goalsAgainst,
                totalYellow: stats.reduce((sum, s) => sum + s.yellow, 0),
                totalRed: stats.reduce((sum, s) => sum + s.red, 0),
                form,
                matchResult,
                matchType
            };
        };

        function getStatsSummaryLastName(fullName) {
            const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
            return parts.length ? parts[parts.length - 1] : String(fullName || '').trim();
        }

        function getStatsSummaryShortName(fullName, allNames = []) {
            const last = getStatsSummaryLastName(fullName);
            const clash = (Array.isArray(allNames) ? allNames : [])
                .filter(name => getStatsSummaryLastName(name) === last)
                .length > 1;
            if (!clash) return last;
            const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1]}`;
            return last;
        }

        function getStatsSummaryPlayerPhotoUrl(row) {
            const player = (row?.id && typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(row.id)
                : null)
                || (row?.name && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(row.name)
                    : null)
                || row
                || null;
            if (typeof window.getPlayerProfilePhotoUrl === 'function') {
                return window.getPlayerProfilePhotoUrl(player) || '';
            }
            return String(
                player?.photoUrl
                || player?.bildeUrl
                || player?.avatarUrl
                || player?.imageUrl
                || player?.photo
                || row?.photoUrl
                || ''
            ).trim();
        }

        function buildStatsSummaryPlayerChipHtml(row, allNames = [], options = {}) {
            const name = getStatsSummaryShortName(row?.name, allNames);
            const photoUrl = getStatsSummaryPlayerPhotoUrl(row);
            const value = Number(options.value);
            const showValue = Number.isFinite(value) && value > 1;
            return `
                <span class="stats-kamp-summary-player">
                    <span class="roster-player-avatar" aria-hidden="true">
                        ${photoUrl
                            ? `<img src="${escapeStatisticsHtml(photoUrl)}" alt="" loading="lazy" decoding="async">`
                            : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                    </span>
                    <span class="stats-kamp-summary-player-name">${escapeStatisticsHtml(name)}</span>
                    ${showValue
                        ? `<span class="stats-kamp-summary-player-value">${escapeStatisticsHtml(String(value))}</span>`
                        : ''}
                </span>
            `;
        }

        function buildStatsSummaryPlayersHtml(rows, allNames = [], options = {}) {
            const list = Array.isArray(rows) ? rows : [];
            const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : list.length;
            const shown = list.slice(0, Math.max(0, limit));
            const extra = list.length - shown.length;
            const chips = shown.map((row) => buildStatsSummaryPlayerChipHtml(
                row,
                allNames,
                { value: options.valueKey ? Number(row[options.valueKey]) || 0 : 0 }
            )).join('');
            const extraHtml = extra > 0
                ? `<span class="stats-kamp-summary-player-extra">+${escapeStatisticsHtml(String(extra))}</span>`
                : '';
            return `<span class="stats-kamp-summary-players">${chips}${extraHtml}</span>`;
        }

        function buildStatsSummaryLabeledLineHtml(label, bodyHtml, options = {}) {
            if (!bodyHtml) return '';
            const icon = String(options.icon || '').trim();
            const hideLabel = Boolean(options.hideLabel);
            const labelHtml = hideLabel
                ? ''
                : (icon
                    ? `<span class="stats-kamp-summary-line-label is-icon" title="${escapeStatisticsHtml(label)}" aria-label="${escapeStatisticsHtml(label)}"><i class="fa-solid ${escapeStatisticsHtml(icon)}" aria-hidden="true"></i></span>`
                    : `<span class="stats-kamp-summary-line-label">${escapeStatisticsHtml(label)}</span>`);
            return `
                <div class="stats-kamp-summary-line${hideLabel ? ' is-unlabeled' : ''}">
                    ${labelHtml}
                    ${bodyHtml}
                </div>
            `;
        }

        function getStatsSummaryFirstSentence(text, maxLen = 140) {
            const raw = String(text || '').trim().replace(/\s+/g, ' ');
            if (!raw) return '';
            const match = raw.match(/^(.+?[.!?])(?:\s|$)/);
            let sentence = (match ? match[1] : raw).trim();
            if (sentence.length > maxLen) {
                sentence = `${sentence.slice(0, maxLen - 1).trim()}…`;
            }
            return sentence;
        }

        function joinStatsSummaryBits(bits) {
            return (Array.isArray(bits) ? bits : []).map(bit => String(bit || '').trim()).filter(Boolean).join(' · ');
        }

        function getStatsSummaryOutcomeLabel(match) {
            const score = typeof window.getMatchOutcomeScore === 'function'
                ? window.getMatchOutcomeScore(match)
                : null;
            if (!score) return '';
            if (score.bsk > score.opponent) return 'Seier';
            if (score.bsk === score.opponent) return 'Uavgjort';
            return 'Tap';
        }

        function getStatsSummarySquadPlayers(match) {
            const refs = typeof window.getMatchParticipantRefs === 'function'
                ? window.getMatchParticipantRefs(match)
                : (typeof window.getAttendingPlayerRefs === 'function'
                    ? window.getAttendingPlayerRefs(match?.attendance)
                    : []);
            const seen = new Set();
            const players = [];
            refs.forEach((ref) => {
                const player = typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(ref)
                    : null;
                if (!player || player.isGuest) return;
                const key = player.id || player.navn;
                if (!key || seen.has(key)) return;
                seen.add(key);
                players.push(player);
            });
            return players;
        }

        function formatStatsSummaryPositionMix(players) {
            const counts = { K: 0, F: 0, M: 0, A: 0 };
            (Array.isArray(players) ? players : []).forEach((player) => {
                const category = typeof window.getPositionCategoryFromPos1 === 'function'
                    ? (window.getPositionCategoryFromPos1(player?.pos1) || 'M')
                    : 'M';
                if (Object.prototype.hasOwnProperty.call(counts, category)) counts[category] += 1;
            });
            return ['K', 'F', 'M', 'A'].map(letter => `${counts[letter]}${letter}`).join(' - ');
        }

        function formatStatsSummaryOpponentRecord(record) {
            const wins = Number(record?.wins) || 0;
            const draws = Number(record?.draws) || 0;
            const losses = Number(record?.losses) || 0;
            const goalsFor = Number(record?.goalsFor) || 0;
            const goalsAgainst = Number(record?.goalsAgainst) || 0;
            const diff = goalsFor - goalsAgainst;
            const signedDiff = diff > 0 ? `+${diff}` : String(diff);
            const seier = wins === 1 ? '1 seier' : `${wins} seire`;
            return joinStatsSummaryBits([
                `${seier} ${draws} uavgjort ${losses} tap`,
                `målforskjell ${signedDiff}`
            ]);
        }

        function getStatsSummarySeasonMapTotal(playerHint, match, mapKey) {
            const player = (playerHint?.id && typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(playerHint.id)
                : null)
                || (playerHint?.name && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(playerHint.name)
                    : null)
                || { id: playerHint?.id || '', navn: playerHint?.name || '' };
            const year = typeof window.getMatchStatsYear === 'function'
                ? window.getMatchStatsYear(match)
                : (match?.date ? new Date(match.date).getFullYear() : null);
            return (window.activeMatches || []).reduce((sum, item) => {
                if (!item?.result || !String(item.result).includes('-')) return sum;
                if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(item)) return sum;
                if (match?.matchGroup && item.matchGroup && item.matchGroup !== match.matchGroup) return sum;
                if (year && typeof window.activityBelongsToStatsYear === 'function'
                    && !window.activityBelongsToStatsYear(item, year)) {
                    return sum;
                }
                return sum + (Number(window.getPlayerRefMapValue?.(item[mapKey], player, 0)) || 0);
            }, 0);
        }

        function formatStatsSummaryMatchStatList(rows, match, valueKey, mapKey) {
            return (Array.isArray(rows) ? rows : []).map((row) => {
                const matchValue = Number(row[valueKey]) || 0;
                const total = getStatsSummarySeasonMapTotal(row, match, mapKey);
                const name = String(row.name || '').trim();
                return `${matchValue} ${name} (${total})`;
            }).join(', ');
        }

        function formatStatsSummaryCardNames(rows, valueKey) {
            return (Array.isArray(rows) ? rows : []).map((row) => {
                const name = String(row.name || '').trim();
                const value = Number(row[valueKey]) || 0;
                return value > 1 ? `${name} ${value}` : name;
            }).join(', ');
        }

        function formatStatsSummaryNameCountsHtml(rows, valueKey, allNames) {
            return buildStatsSummaryPlayersHtml(rows, allNames, { valueKey });
        }

        function formatStatsSummaryEventListHtml({ title, rows, valueKey, icon, ariaLabel }) {
            const key = String(valueKey || '').trim();
            const iconClass = String(icon || '').trim();
            const list = (Array.isArray(rows) ? rows : [])
                .filter((row) => (Number(row?.[key]) || 0) > 0);
            if (!list.length || !key || !iconClass) return '';
            const items = list.map((row) => {
                const count = Math.max(1, Math.min(10, Math.floor(Number(row[key]) || 0)));
                const name = String(row.name || '').trim() || '–';
                const marks = Array.from({ length: count }, () => (
                    `<i class="fa-solid ${escapeStatisticsHtml(iconClass)} stats-kamp-summary-scorer-ball" aria-hidden="true"></i>`
                )).join('');
                return `
                    <li class="stats-kamp-summary-scorer">
                        <span class="stats-kamp-summary-scorer-name">${escapeStatisticsHtml(name)}</span>
                        <span class="stats-kamp-summary-scorer-balls" aria-hidden="true">${marks}</span>
                    </li>
                `;
            }).join('');
            return `
                <div class="stats-kamp-summary-scorers-wrap">
                    <h5 class="stats-kamp-summary-metric-heading">${escapeStatisticsHtml(title)}</h5>
                    <ul class="stats-kamp-summary-scorers" aria-label="${escapeStatisticsHtml(ariaLabel || title)}">${items}</ul>
                </div>
            `;
        }

        function formatStatsSummaryScorersHtml(rows) {
            const list = (Array.isArray(rows) ? rows : [])
                .filter((row) => (Number(row?.goals) || 0) > 0);
            if (!list.length) return '';
            const items = list.map((row) => {
                const count = Math.max(1, Math.min(10, Math.floor(Number(row.goals) || 0)));
                const name = String(row.name || '').trim() || '–';
                const countHtml = count > 1
                    ? `<span class="stats-kamp-summary-scorer-count">- ${escapeStatisticsHtml(String(count))}</span>`
                    : '';
                return `
                    <li class="stats-kamp-summary-scorer">
                        <span class="stats-kamp-summary-scorer-name">${escapeStatisticsHtml(name)}</span>
                        ${countHtml}
                    </li>
                `;
            }).join('');
            return `
                <div class="stats-kamp-summary-scorers-wrap">
                    <h5 class="stats-kamp-summary-goal-banner" aria-label="Mål">
                        <span class="stats-kamp-summary-goal-mark" aria-hidden="true">
                            <i class="fa-solid fa-futbol"></i>
                        </span>
                    </h5>
                    <ul class="stats-kamp-summary-scorers" aria-label="Målscorere">${items}</ul>
                </div>
            `;
        }

        function formatStatsSummaryAssistersHtml(rows) {
            const list = (Array.isArray(rows) ? rows : [])
                .filter((row) => (Number(row?.assists) || 0) > 0);
            if (!list.length) return '';
            const items = list.map((row) => {
                const count = Math.max(1, Math.min(10, Math.floor(Number(row.assists) || 0)));
                const name = String(row.name || '').trim() || '–';
                const countHtml = count > 1
                    ? `<span class="stats-kamp-summary-scorer-count">- ${escapeStatisticsHtml(String(count))}</span>`
                    : '';
                return `
                    <li class="stats-kamp-summary-scorer">
                        <span class="stats-kamp-summary-scorer-name">${escapeStatisticsHtml(name)}</span>
                        ${countHtml}
                    </li>
                `;
            }).join('');
            return `
                <div class="stats-kamp-summary-scorers-wrap">
                    <h5 class="stats-kamp-summary-assist-banner" aria-label="Assist">
                        <span class="stats-kamp-summary-assist-mark" aria-hidden="true">
                            <i class="fa-solid fa-handshake-angle"></i>
                        </span>
                    </h5>
                    <ul class="stats-kamp-summary-scorers" aria-label="Assist">${items}</ul>
                </div>
            `;
        }

        function formatStatsSummaryNamedListHtml(rows, allNames, limit = 3) {
            return buildStatsSummaryPlayersHtml(rows, allNames, { limit });
        }

        function formatStatsSummaryHighRatingsHtml(rows, mixedLabel = '8+') {
            const list = (Array.isArray(rows) ? rows : [])
                .filter((row) => (Number(row?.rating) || 0) > 0);
            if (!list.length) return '';
            const ratings = list.map((row) => Number(row.rating) || 0);
            const sharedRating = ratings.every((rating) => rating === ratings[0])
                ? ratings[0]
                : null;
            const medalValue = sharedRating != null ? String(sharedRating) : String(mixedLabel);
            const bannerLabel = `Børs ${medalValue}`;
            const items = list.map((row) => {
                const name = String(row.name || '').trim() || '–';
                return `
                    <li class="stats-kamp-summary-scorer">
                        <span class="stats-kamp-summary-scorer-name">${escapeStatisticsHtml(name)}</span>
                    </li>
                `;
            }).join('');
            return `
                <div class="stats-kamp-summary-scorers-wrap">
                    <h5 class="stats-kamp-summary-bors-banner" aria-label="${escapeStatisticsHtml(bannerLabel)}">
                        <span class="stats-kamp-summary-bors-mark" aria-hidden="true">
                            <i class="fa-solid fa-star"></i>
                            <span class="stats-kamp-summary-bors-mark-value">${escapeStatisticsHtml(medalValue)}</span>
                        </span>
                    </h5>
                    <ul class="stats-kamp-summary-scorers" aria-label="${escapeStatisticsHtml(bannerLabel)}">${items}</ul>
                </div>
            `;
        }

        function formatStatsSummaryRatingLineHtml(rows, allNames, mixedLabel) {
            const body = formatStatsSummaryHighRatingsHtml(rows, mixedLabel);
            if (!body) return '';
            return buildStatsSummaryLabeledLineHtml('Børs', body, { hideLabel: true });
        }

        function formatStatsSummaryLowRatingsHtml(rows) {
            const list = (Array.isArray(rows) ? rows : [])
                .filter((row) => (Number(row?.rating) || 0) > 0);
            if (!list.length) return '';
            const items = list.map((row) => {
                const rating = Math.max(1, Math.min(10, Math.floor(Number(row.rating) || 0)));
                const name = String(row.name || '').trim() || '–';
                return `
                    <li class="stats-kamp-summary-scorer">
                        <span class="stats-kamp-summary-scorer-name">${escapeStatisticsHtml(name)}</span>
                        <span class="stats-kamp-summary-scorer-count">- ${escapeStatisticsHtml(String(rating))}</span>
                    </li>
                `;
            }).join('');
            return `
                <div class="stats-kamp-summary-scorers-wrap">
                    <h5 class="stats-kamp-summary-low-banner" aria-label="Under pari">
                        <span class="stats-kamp-summary-low-mark" aria-hidden="true">
                            <i class="fa-solid fa-arrow-trend-down"></i>
                        </span>
                    </h5>
                    <ul class="stats-kamp-summary-scorers" aria-label="Under pari">${items}</ul>
                </div>
            `;
        }

        function formatStatsSummaryPlaytimeBits(rows) {
            const counts = {
                bench: 0,
                '0-20': 0,
                '21-45': 0,
                '46-75': 0,
                '76-90': 0
            };
            (Array.isArray(rows) ? rows : []).forEach((row) => {
                if (row.onPitch === false) {
                    counts.bench += 1;
                    return;
                }
                if (row.minutes == null) return;
                const minutes = Math.max(0, Math.floor(Number(row.minutes) || 0));
                if (minutes <= 20) counts['0-20'] += 1;
                else if (minutes <= 45) counts['21-45'] += 1;
                else if (minutes <= 75) counts['46-75'] += 1;
                else counts['76-90'] += 1;
            });
            return [
                `Benk ${counts.bench}`,
                `0-20 ${counts['0-20']}`,
                `21-45 ${counts['21-45']}`,
                `46-75 ${counts['46-75']}`,
                `76-90 ${counts['76-90']}`
            ];
        }

        function buildStatsSummaryCardRowHtml({ id, label, value = '', htmlValue = '', empty = false, matchId = '' }) {
            const text = String(value || '').trim();
            const inner = htmlValue || escapeStatisticsHtml(text || (empty ? 'Ikke fylt' : '–'));
            return `
                <button
                    type="button"
                    class="stats-kamp-summary-card-row${empty ? ' is-empty' : ''}"
                    data-match-action="open-summary-card"
                    data-summary-card="${escapeStatisticsHtml(id)}"
                    data-match-id="${escapeStatisticsHtml(matchId)}"
                >
                    <span>${escapeStatisticsHtml(label)}</span>
                    <strong>${inner}</strong>
                </button>
            `;
        }

        window.buildKampstatsMatchSummaryHtml = function(match, stats, context = {}) {
            if (!match) return '';
            const rows = Array.isArray(stats) ? stats : [];
            const allNames = rows.map(row => row.name);
            const matchId = String(match.id || '');

            const storedFormation = String(match.formation || match.lineupFormation || '').trim();
            const formation = storedFormation
                ? (typeof window.getMatchGamePlanFormation === 'function'
                    ? window.getMatchGamePlanFormation(match)
                    : storedFormation)
                : '';

            const bb = rows.find(s => s.isBbInMatch) || null;
            const scorers = rows
                .filter(s => (Number(s.goals) || 0) > 0)
                .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'nb'));
            const assisters = rows
                .filter(s => (Number(s.assists) || 0) > 0)
                .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name, 'nb'));
            const highRatings = rows
                .filter(s => (Number(s.rating) || 0) >= 8)
                .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || a.name.localeCompare(b.name, 'nb'));
            const lowRatings = rows
                .filter(s => s.onPitch !== false && (Number(s.rating) || 0) > 0 && (Number(s.rating) || 0) <= 4)
                .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || a.name.localeCompare(b.name, 'nb'));

            const matchLines = [];
            if (scorers.length) {
                matchLines.push(buildStatsSummaryLabeledLineHtml(
                    'Mål',
                    formatStatsSummaryScorersHtml(scorers),
                    { hideLabel: true }
                ));
            }
            if (assisters.length) {
                matchLines.push(buildStatsSummaryLabeledLineHtml(
                    'Assist',
                    formatStatsSummaryAssistersHtml(assisters),
                    { hideLabel: true }
                ));
            }
            const highLine = formatStatsSummaryRatingLineHtml(highRatings, allNames, '8+');
            const lowLine = lowRatings.length
                ? buildStatsSummaryLabeledLineHtml(
                    'Under pari',
                    formatStatsSummaryLowRatingsHtml(lowRatings),
                    { hideLabel: true }
                )
                : '';
            if (highLine) matchLines.push(highLine);
            if (lowLine) matchLines.push(lowLine);

            const buildBbHeroHtml = (row) => {
                if (!row) return '';
                const name = String(row.name || '').trim();
                const photoUrl = getStatsSummaryPlayerPhotoUrl(row);
                const playerObj = (typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(row.id || row.name)
                    : null) || { id: row.id, navn: row.name };
                const rating = Number(row.rating) || 0;
                const goals = Number(row.goals) || 0;
                const assists = Number(row.assists) || 0;
                const points = Number(row.points) || 0;
                const minutes = row.minutes == null || row.minutes === ''
                    ? null
                    : Math.max(0, Math.floor(Number(row.minutes) || 0));
                const yellow = Number(row.yellow) || 0;
                const red = Number(row.red) || 0;
                const startStatusRaw = typeof window.getPlayerMatchStartStatus === 'function'
                    ? window.getPlayerMatchStartStatus(match, playerObj)
                    : '';
                const playLine = minutes != null
                    ? (startStatusRaw === 'S'
                        ? `Spilte ${minutes} min fra start`
                        : (startStatusRaw === 'B'
                            ? `Spilte ${minutes} min som innbytter`
                            : `Spilte ${minutes} min`))
                    : (startStatusRaw === 'S'
                        ? 'Fra start'
                        : (startStatusRaw === 'B' ? 'Innbytter' : ''));
                let posId = '';
                if (row.onPitch !== false) {
                    posId = typeof window.getPlayerMatchPlayedPositionIds === 'function'
                        ? ((window.getPlayerMatchPlayedPositionIds(match, playerObj) || [])[0] || '')
                        : (typeof window.getPlayerMatchPlayedPositionId === 'function'
                            ? (window.getPlayerMatchPlayedPositionId(match, playerObj) || '')
                            : '');
                }
                const posLabel = posId && typeof window.getMatchGamePlanPositionLabel === 'function'
                    ? window.getMatchGamePlanPositionLabel(posId)
                    : (String(row.posCode || '').trim() || '');
                const teamName = match?.matchGroup || playerObj?.spillerLag || '';
                const formPlayerName = playerObj.navn || name;
                const formAfterParts = typeof window.getPlayerFormComponents === 'function'
                    ? window.getPlayerFormComponents(formPlayerName, { asOfDate: match?.date || null })
                    : { total: 0, hasFormData: false };
                const formBeforeParts = typeof window.getPlayerFormComponents === 'function'
                    ? window.getPlayerFormComponents(formPlayerName, {
                        asOfDate: match?.date || null,
                        excludeMatchId: match?.id || null
                    })
                    : { total: 0, hasFormData: false };
                const formAfter = formAfterParts?.hasFormData
                    ? Math.round(Number(formAfterParts.total) || 0)
                    : 0;
                const formBefore = formBeforeParts?.hasFormData
                    ? Math.round(Number(formBeforeParts.total) || 0)
                    : 0;
                let formValue = '–';
                let formSuffix = '';
                let formTitle = 'Form: ingen data';
                let formToneClass = '';
                let formEmpty = true;
                if (formAfter > 0 && formBefore > 0) {
                    const formDelta = formAfter - formBefore;
                    const formDeltaText = formDelta === 0
                        ? '±0'
                        : `${formDelta > 0 ? '+' : ''}${formDelta}`;
                    formValue = String(formAfter);
                    formSuffix = formDeltaText;
                    formTitle = `Form etter kampen: ${formAfter} (${formDeltaText} fra ${formBefore} før kampen)`;
                    formToneClass = formDelta > 0 ? 'hot' : (formDelta < 0 ? 'red' : '');
                    formEmpty = false;
                } else if (formAfter > 0) {
                    formValue = String(formAfter);
                    formTitle = `Form etter kampen: ${formAfter}`;
                    formEmpty = false;
                }
                const bidragScore = typeof window.getPlayerKampbidragSnitt === 'function'
                    ? Math.round(Number(window.getPlayerKampbidragSnitt(playerObj, teamName)) || 0)
                    : 0;
                const bidragSnittText = bidragScore > 0 ? `snitt ${bidragScore}` : '';
                const metaBits = [
                    posLabel
                        ? `<span class="stats-kamp-summary-bb-pos-label">${escapeStatisticsHtml(posLabel)}</span>`
                        : '',
                    playLine
                        ? `<span class="stats-kamp-summary-bb-play">${escapeStatisticsHtml(playLine)}</span>`
                        : ''
                ].filter(Boolean).join('');
                const tile = (value, label, opts = {}) => {
                    const empty = Boolean(opts.empty);
                    const tone = opts.tone ? ` is-${opts.tone}` : '';
                    const emptyClass = empty ? ' is-empty' : '';
                    const softSuffix = opts.softSuffix
                        ? `<em class="stats-kamp-summary-bb-tile-soft">${escapeStatisticsHtml(String(opts.softSuffix))}</em>`
                        : '';
                    const titleAttr = opts.title
                        ? ` title="${escapeStatisticsHtml(opts.title)}"`
                        : '';
                    return `
                        <div class="stats-kamp-summary-bb-tile${tone}${emptyClass}"${titleAttr}>
                            <span class="stats-kamp-summary-bb-tile-value">
                                <strong>${escapeStatisticsHtml(String(value))}</strong>${softSuffix}
                            </span>
                            <span>${escapeStatisticsHtml(label)}</span>
                        </div>
                    `;
                };
                const rackTiles = [
                    tile(goals, 'Mål', { empty: goals <= 0, tone: goals > 0 ? 'hot' : '' }),
                    tile(assists, 'Assist', { empty: assists <= 0 }),
                    tile(points, 'Bidrag', {
                        empty: points <= 0,
                        tone: points > 0 ? 'gold' : '',
                        softSuffix: bidragSnittText,
                        title: points > 0
                            ? `Kampbidrag i denne kampen${bidragScore > 0 ? ` (sesongsnitt ${bidragScore})` : ''}`
                            : 'Kampbidrag i denne kampen'
                    }),
                    tile(formValue, 'Form', {
                        empty: formEmpty,
                        tone: formToneClass,
                        softSuffix: formSuffix,
                        title: formTitle
                    }),
                    yellow > 0 ? tile(yellow, 'Gult', { tone: 'card' }) : '',
                    red > 0 ? tile(red, 'Rødt', { tone: 'red' }) : ''
                ].filter(Boolean).slice(0, 4);
                const ratingHtml = rating > 0
                    ? `<span class="stats-kamp-summary-bb-rating-value">${escapeStatisticsHtml(String(rating))}</span>`
                    : `<span class="stats-kamp-summary-bb-rating-value is-empty">–</span>`;
                const ariaPos = posLabel ? `, ${posLabel}` : '';
                return `
                    <div class="stats-kamp-summary-bb-hero" aria-label="Banens beste ${escapeStatisticsHtml(name)}${escapeStatisticsHtml(ariaPos)}">
                        <div class="stats-kamp-summary-bb-board">
                            <span class="stats-kamp-summary-bb-gem">Banens beste</span>
                            <span class="stats-kamp-summary-bb-crown" aria-hidden="true">
                                <i class="fa-solid fa-crown"></i>
                            </span>
                            <div class="stats-kamp-summary-bb-stage">
                                <div class="stats-kamp-summary-bb-identity">
                                    <span class="stats-kamp-summary-bb-avatar" aria-hidden="true">
                                        ${photoUrl
                                            ? `<img src="${escapeStatisticsHtml(photoUrl)}" alt="" loading="lazy" decoding="async">`
                                            : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                                    </span>
                                    <div class="stats-kamp-summary-bb-identity-text">
                                        <p class="stats-kamp-summary-bb-name">${escapeStatisticsHtml(name)}</p>
                                        ${metaBits
                                            ? `<div class="stats-kamp-summary-bb-meta">${metaBits}</div>`
                                            : ''}
                                    </div>
                                    <div class="stats-kamp-summary-bb-bors">
                                        ${ratingHtml}
                                        <span class="stats-kamp-summary-bb-rating-label">Børs</span>
                                    </div>
                                </div>
                                <div class="stats-kamp-summary-bb-rack" aria-label="Kampprestasjon">
                                    ${rackTiles.join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };

            const kampplanNotes = typeof window.getMatchGamePlanNotesText === 'function'
                ? window.getMatchGamePlanNotesText(match)
                : (typeof match.kampplanNotes === 'string'
                    ? match.kampplanNotes
                    : (typeof match.notes?.kampplan === 'string' ? match.notes.kampplan : ''));
            const kampplanTemplate = typeof window.getMatchGamePlanSelectedTemplateTitle === 'function'
                ? window.getMatchGamePlanSelectedTemplateTitle(match)
                : '';
            const kampplanText = getStatsSummaryFirstSentence(kampplanNotes, 110) || kampplanTemplate;
            const notesPositiveRaw = String(match?.notes?.positive || '').trim();
            const notesChallengeRaw = String(match?.notes?.challenge || '').trim();
            const notesPositive = getStatsSummaryFirstSentence(notesPositiveRaw, 90);
            const notesChallenge = getStatsSummaryFirstSentence(notesChallengeRaw, 90);
            const planLines = [];
            if (formation) planLines.push(formation);
            if (kampplanText) planLines.push(kampplanText);

            const presence = typeof window.getAttendancePresenceStats === 'function'
                ? window.getAttendancePresenceStats(match)
                : { presentCount: 0, squadSize: 0, isRegistered: false };
            const squadPlayers = getStatsSummarySquadPlayers(match);
            const troppCount = presence.isRegistered
                ? presence.presentCount
                : squadPlayers.length;
            const subCount = Array.isArray(match.liveSubstitutions) ? match.liveSubstitutions.length : 0;
            const minutesTracked = typeof window.matchHasMinutesTracking === 'function'
                ? window.matchHasMinutesTracking(match)
                : rows.some(s => s.minutes != null);
            const manyMinutes = rows.filter(s => s.onPitch !== false && s.minutes != null && Number(s.minutes) >= 75);
            const littleMinutes = rows.filter(s => s.onPitch !== false && s.minutes != null && Number(s.minutes) <= 20);
            const benchOnlyRows = rows.filter(s => s.onPitch === false);
            const usedOnPitch = rows.filter(s => s.onPitch !== false);
            const positionMix = squadPlayers.length
                ? formatStatsSummaryPositionMix(squadPlayers)
                : '';
            const formatTroppNames = (list, limit = 4) => {
                const names = (Array.isArray(list) ? list : [])
                    .map((row) => String(row?.name || '').trim())
                    .filter(Boolean);
                if (!names.length) return '';
                if (names.length <= limit) {
                    if (names.length === 1) return names[0];
                    if (names.length === 2) return `${names[0]} og ${names[1]}`;
                    return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
                }
                const shown = names.slice(0, limit);
                const rest = names.length - limit;
                return `${shown.join(', ')} og ${rest} ${rest === 1 ? 'til' : 'andre'}`;
            };
            const troppLines = [];
            if (troppCount > 0) {
                let intro = `${troppCount} spillere var med i troppen`;
                if (subCount === 1) intro += ', og det ble gjort ett bytte underveis';
                else if (subCount > 1) intro += `, og det ble gjort ${subCount} bytter underveis`;
                troppLines.push(`<p class="stats-kamp-summary-text">${escapeStatisticsHtml(`${intro}.`)}</p>`);
            }
            if (minutesTracked && manyMinutes.length) {
                let longSpell = '';
                if (manyMinutes.length === 1) {
                    longSpell = `${manyMinutes[0].name || 'Én spiller'} fikk en lang økt med over 75 minutter`;
                } else if (manyMinutes.length >= Math.max(6, Math.ceil(usedOnPitch.length * 0.55))) {
                    longSpell = `${manyMinutes.length} spillere fikk over 75 minutter — troppen ble brukt med god kontinuitet`;
                } else {
                    longSpell = `${manyMinutes.length} spillere fikk en lang økt (over 75 minutter)`;
                }
                troppLines.push(`<p class="stats-kamp-summary-text">${escapeStatisticsHtml(`${longSpell}.`)}</p>`);
            }
            if (minutesTracked && littleMinutes.length) {
                const shortNames = formatTroppNames(littleMinutes, 8);
                const shortCountLabel = littleMinutes.length === 1
                    ? '1 spiller fikk lite spilletid, under 20 minutter'
                    : `${littleMinutes.length} spillere fikk lite spilletid, under 20 minutter`;
                const shortSpell = shortNames
                    ? `${shortCountLabel}. ${shortNames}`
                    : shortCountLabel;
                troppLines.push(`<p class="stats-kamp-summary-text">${escapeStatisticsHtml(`${shortSpell}.`)}</p>`);
            }
            if (benchOnlyRows.length) {
                const benchSpell = benchOnlyRows.length === 1
                    ? `${benchOnlyRows[0].name || 'Én spiller'} satt hele kampen på benken`
                    : `${benchOnlyRows.length} spillere satt hele kampen på benken`;
                troppLines.push(`<p class="stats-kamp-summary-text">${escapeStatisticsHtml(`${benchSpell}.`)}</p>`);
            }
            if (positionMix && troppCount > 0) {
                troppLines.push(`<p class="stats-kamp-summary-text">${escapeStatisticsHtml(`Linjefordeling i troppen: ${positionMix}.`)}</p>`);
            }

            const opponent = match.opponent || 'Motstander';
            const headerResult = typeof window.formatStatsMatchResult === 'function'
                ? window.formatStatsMatchResult(context.matchResult || match.result)
                : (context.matchResult || match.result || '–');

            const renderLines = (lines, emptyLabel, { html = false } = {}) => {
                const filled = (Array.isArray(lines) ? lines : []).filter(Boolean);
                if (!filled.length) {
                    return `<p>${escapeStatisticsHtml(emptyLabel)}</p>`;
                }
                if (html) return filled.join('');
                return filled.map((line) => `<p>${escapeStatisticsHtml(line)}</p>`).join('');
            };
            const renderNoteLine = (label, text) => {
                if (!text) return '';
                return `<p><span class="stats-kamp-summary-note-label">${escapeStatisticsHtml(label)}</span> ${escapeStatisticsHtml(text)}</p>`;
            };
            const buildKampenNoteCardHtml = (toneClass, icon, title, bodyHtml) => {
                if (!bodyHtml) return '';
                return `
                    <div class="stats-kamp-summary-kampen-note ${escapeStatisticsHtml(toneClass)}">
                        <div class="stats-kamp-summary-kampen-note-label">
                            <span class="stats-kamp-summary-kampen-note-gem" aria-hidden="true">
                                <i class="fa-solid ${escapeStatisticsHtml(icon)}"></i>
                            </span>
                            <span class="stats-kamp-summary-kampen-note-title">${escapeStatisticsHtml(title)}</span>
                        </div>
                        ${bodyHtml}
                    </div>
                `;
            };
            const buildKampenNotesInfoHtml = (positiveText, challengeText, planText, troppHtml) => {
                const blocks = [
                    positiveText
                        ? buildKampenNoteCardHtml(
                            'is-positive',
                            'fa-thumbs-up',
                            'Positivt',
                            `<p class="stats-kamp-summary-kampen-note-text">${escapeStatisticsHtml(positiveText)}</p>`
                        )
                        : '',
                    challengeText
                        ? buildKampenNoteCardHtml(
                            'is-challenge',
                            'fa-triangle-exclamation',
                            'Utfordringer',
                            `<p class="stats-kamp-summary-kampen-note-text">${escapeStatisticsHtml(challengeText)}</p>`
                        )
                        : '',
                    planText
                        ? buildKampenNoteCardHtml(
                            'is-plan',
                            'fa-diagram-project',
                            'Planen',
                            `<p class="stats-kamp-summary-kampen-note-text">${escapeStatisticsHtml(planText)}</p>`
                        )
                        : '',
                    troppHtml
                        ? buildKampenNoteCardHtml(
                            'is-tropp',
                            'fa-users',
                            'Troppen',
                            `<div class="stats-kamp-summary-kampen-note-text">${troppHtml}</div>`
                        )
                        : ''
                ].filter(Boolean);
                if (!blocks.length) return '';
                return `
                    <aside class="stats-kamp-summary-kampen-notes" aria-label="Trenernotater, plan og tropp">
                        ${blocks.join('')}
                    </aside>
                `;
            };
            const planHtml = context.embedInPanel
                ? (planLines.length ? renderLines(planLines, '') : '')
                : [
                    planLines.length ? renderLines(planLines, '') : '',
                    renderNoteLine('Bra', notesPositive),
                    renderNoteLine('Utfordring', notesChallenge)
                ].join('');
            const planEmpty = context.embedInPanel
                ? !planLines.length
                : !planLines.length && !notesPositive && !notesChallenge;

            const buildBlock = (id, title, bodyHtml, empty) => {
                const extraClass = id === 'spillerbors'
                    ? ' stats-kamp-summary-match'
                    : (id === 'kampplan'
                        ? ' stats-kamp-summary-plan'
                        : (id === 'bytter' ? ' stats-kamp-summary-tropp' : ''));
                return `
                <button
                    type="button"
                    class="stats-kamp-summary-block is-clickable${empty ? ' is-empty' : ''}${extraClass}"
                    data-match-action="open-summary-card"
                    data-summary-card="${escapeStatisticsHtml(id)}"
                    data-match-id="${escapeStatisticsHtml(matchId)}"
                >
                    <h4>${escapeStatisticsHtml(title)}</h4>
                    <div class="stats-kamp-summary-block-body">${bodyHtml}</div>
                </button>
            `;
            };

            const pitchChipsHtml = typeof window.buildMatchSummaryPitchChipsHtml === 'function'
                ? window.buildMatchSummaryPitchChipsHtml(match, context)
                : '';
            const bbHeroHtml = buildBbHeroHtml(bb);
            const eventsHtml = matchLines.length
                ? renderLines(matchLines, 'Ikke fylt', { html: true })
                : '';
            const kampenMainHtml = [
                eventsHtml,
                pitchChipsHtml
            ].filter(Boolean).join('');
            const planNoteParts = [];
            if (formation) planNoteParts.push(formation);
            const planNoteBody = String(kampplanNotes || '').trim() || kampplanTemplate;
            if (planNoteBody) planNoteParts.push(planNoteBody);
            const planNoteText = planNoteParts.join('\n\n');
            const troppNoteHtml = troppLines.length ? troppLines.join('') : '';
            const kampenNotesHtml = buildKampenNotesInfoHtml(
                notesPositiveRaw,
                notesChallengeRaw,
                context.embedInPanel ? planNoteText : '',
                context.embedInPanel ? troppNoteHtml : ''
            );
            const kampenLowerHtml = kampenNotesHtml
                ? `
                    <div class="stats-kamp-summary-kampen-layout${kampenMainHtml ? '' : ' is-notes-only'}">
                        <div class="stats-kamp-summary-kampen-main">
                            ${kampenMainHtml || ''}
                        </div>
                        ${kampenNotesHtml}
                    </div>
                `
                : kampenMainHtml;
            const kampenBody = [
                bbHeroHtml,
                kampenLowerHtml
            ].filter(Boolean).join('') || renderLines([], 'Ikke fylt');
            const kampenEmpty = !bbHeroHtml && !kampenMainHtml && !kampenNotesHtml;
            const planenBody = planEmpty ? renderLines([], 'Ikke fylt') : planHtml;
            const troppenBody = renderLines(troppLines, 'Ikke fylt', { html: true });

            if (context.embedInPanel) {
                return `
                    <section class="stats-kamp-summary is-embedded${kampenEmpty ? ' is-empty' : ''}" aria-label="Oppsummering">
                        <div class="stats-kamp-summary-block-body">${kampenBody}</div>
                    </section>
                `;
            }

            return `
                <section class="stats-kamp-summary" aria-label="Oppsummering">
                    <div class="stats-kamp-summary-header">
                        <div class="min-w-0">
                            <p class="stats-kamp-summary-kicker">Oppsummering</p>
                            <h3 class="stats-kamp-summary-title">
                                BSK – ${escapeStatisticsHtml(opponent)}
                                <span class="stats-kamp-summary-result">${escapeStatisticsHtml(headerResult)}</span>
                            </h3>
                        </div>
                    </div>
                    <div class="stats-kamp-summary-grid">
                        ${buildBlock('spillerbors', 'Kampen', kampenBody || renderLines([], 'Ikke fylt'), kampenEmpty)}
                        ${buildBlock('kampplan', 'Planen', planenBody, planEmpty)}
                        ${buildBlock('bytter', 'Troppen', troppenBody, !troppLines.length)}
                    </div>
                </section>
            `;
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

            const outcomeScore = typeof window.getMatchOutcomeScore === 'function'
                ? window.getMatchOutcomeScore(match)
                : null;
            let form = '';
            if (outcomeScore) {
                if (outcomeScore.bsk > outcomeScore.opponent) form = 'S';
                else if (outcomeScore.bsk < outcomeScore.opponent) form = 'T';
                else form = 'U';
            }

            const regularScore = typeof window.getMatchRegularScore === 'function'
                ? window.getMatchRegularScore(match)
                : (typeof window.parseScore === 'function' ? window.parseScore(match.result) : null);
            const goalsFor = regularScore ? regularScore.bsk : null;
            const goalsAgainst = regularScore ? regularScore.opponent : null;

            const participantRefs = typeof window.getMatchParticipantRefs === 'function'
                ? window.getMatchParticipantRefs(match)
                : window.getAttendingPlayerRefs(match.attendance);

            window._statsKampHeroData = {
                playedMatches,
                matchId,
                matchType,
                matchGroup,
                dateStr,
                pitch,
                matchResult,
                form,
                attendingCount: participantRefs.length
            };
            window.renderStatsKampContext();

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
            const formationId = typeof window.getMatchGamePlanFormation === 'function'
                ? window.getMatchGamePlanFormation(match)
                : (match.formation || '');
            const matchDuration = typeof window.getMatchDurationForMinutesShare === 'function'
                ? window.getMatchDurationForMinutesShare(match)
                : (Math.max(0, Math.floor(Number(match.liveDurationMinutes) || 0)) || 90);
            const stintsByKey = typeof window.computeLivePositionStints === 'function'
                ? (window.computeLivePositionStints(match, matchDuration) || {})
                : {};
            const posBadge = (posId) => {
                const id = String(posId || '').trim();
                if (!id) return '';
                return typeof window.getMatchGamePlanPositionBadgeLabel === 'function'
                    ? window.getMatchGamePlanPositionBadgeLabel(id, formationId)
                    : id;
            };

            const stats = playersToRender.map(playerObj => {
                const playerRef = playerObj.id || playerObj.navn;
                const rating = Number(window.getPlayerRefMapValue(match.ratings, playerObj, 0)) || 0;
                const goals = Number(window.getPlayerRefMapValue(match.scorers, playerObj, 0)) || 0;
                const assists = Number(window.getPlayerRefMapValue(match.assists, playerObj, 0)) || 0;
                const yellow = window.playerRefListIncludes(match.guleKort, playerObj) ? 1 : 0;
                const red = window.playerRefListIncludes(match.rodeKort, playerObj) ? 1 : 0;
                const minutesRaw = window.matchHasMinutesTracking(match)
                    ? window.getPlayerRefMapValue(match.minutesPlayed, playerObj, null)
                    : null;
                const minutes = minutesRaw === null || minutesRaw === undefined || minutesRaw === ''
                    ? null
                    : Math.max(0, Math.floor(Number(minutesRaw) || 0));
                const isBbInMatch = window.motmMatchesPlayer(match.motm, playerObj);
                const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
                    ? window.calculatePlayerMatchPoints(match, playerObj, true)
                    : { total: 0, base: 0, resultBonus: 0, ratingBonus: 0, bbBonus: 0, minutesBonus: 0, onPitch: true };
                const onPitch = pointsDetails.onPitch !== false;
                const posIds = onPitch && typeof window.getPlayerMatchPlayedPositionIds === 'function'
                    ? (window.getPlayerMatchPlayedPositionIds(match, playerObj) || [])
                    : [];
                const posId = posIds[0] || '';
                const startStatus = typeof window.getPlayerMatchStartStatus === 'function'
                    ? window.getPlayerMatchStartStatus(match, playerObj)
                    : '';
                const stints = stintsByKey[playerObj.id] || stintsByKey[playerRef] || [];
                const posPath = stints.length >= 2
                    ? stints.map((stint) => `${posBadge(stint.posId)} ${Math.max(0, Math.floor(Number(stint.minutes) || 0))}'`).join(' · ')
                    : '';
                const signed = (value) => {
                    const numeric = Number(value) || 0;
                    return numeric > 0 ? `+${numeric}` : String(numeric);
                };

                return {
                    id: playerObj.id || '',
                    name: playerObj.navn || window.getPlayerNameFromRef(playerRef),
                    rating,
                    goals,
                    assists,
                    yellow,
                    red,
                    minutes,
                    isBbInMatch,
                    onPitch,
                    posCode: posBadge(posId),
                    startStatus,
                    posPath,
                    points: pointsDetails.total || 0,
                    breakdown: `${onPitch ? 'Spilt' : 'Benk'}: ${pointsDetails.base || 0} | Res/Mål: ${signed(pointsDetails.resultBonus)} | Børs: ${signed(pointsDetails.ratingBonus)} | Min: ${signed(pointsDetails.minutesBonus)}${(Number(pointsDetails.bbBonus) || 0) > 0 ? ` | BB: +${pointsDetails.bbBonus}` : ''}`
                };
            });

            stats.sort((a, b) => (
                b.points - a.points
                || b.rating - a.rating
                || b.goals - a.goals
                || b.assists - a.assists
                || a.name.localeCompare(b.name, 'nb')
            ));

            const ratedStats = stats.filter(s => s.rating > 0);
            const avgRating = ratedStats.length
                ? ratedStats.reduce((sum, s) => sum + s.rating, 0) / ratedStats.length
                : 0;
            const totalYellow = stats.reduce((sum, s) => sum + s.yellow, 0);
            const totalRed = stats.reduce((sum, s) => sum + s.red, 0);

            const formatDash = (value) => (value == null || value === '' || value === 0 ? '–' : String(value));
            const rowsHtml = stats.map(s => {
                const pointsClass = window.getPlayerPointsToneClass ? window.getPlayerPointsToneClass(s.points) : 'is-neutral';
                const playerId = escapeStatisticsHtml(s.id || getStatsPlayerIdForName(s.name) || '');
                const safeName = escapeStatisticsHtml(s.name);
                const ratingText = s.rating > 0 ? String(s.rating) : '–';
                const ratingClass = s.rating >= 8 ? 'is-high' : s.rating >= 6 ? 'is-mid' : s.rating > 0 ? 'is-low' : 'is-neutral';
                const maText = (s.goals > 0 || s.assists > 0)
                    ? `${s.goals}/${s.assists}`
                    : '–';
                const minutesText = s.minutes != null && s.minutes > 0 ? `${s.minutes}'` : '–';
                const cardBits = [];
                if (s.yellow > 0) cardBits.push(`<span class="stats-kampdata-card-dot is-yellow" title="Gult kort">${s.yellow > 1 ? s.yellow : ''}</span>`);
                if (s.red > 0) cardBits.push(`<span class="stats-kampdata-card-dot is-red" title="Rødt kort">${s.red > 1 ? s.red : ''}</span>`);
                if (s.isBbInMatch) cardBits.push('<span class="stats-kampdata-bb-mark" title="Banens beste"><i class="fa-solid fa-crown" aria-hidden="true"></i></span>');
                const cardsHtml = cardBits.length ? cardBits.join('') : '–';
                const roleHtml = s.onPitch === false
                    ? '<span class="stats-kampdata-role is-bench">Benk</span>'
                    : '';
                const pathHtml = s.posPath
                    ? `<span class="stats-kampdata-pos-path">${escapeStatisticsHtml(s.posPath)}</span>`
                    : '';
                const posHtml = s.posCode
                    ? `<span class="stats-kampdata-pos-code">${escapeStatisticsHtml(s.posCode)}</span>`
                    : '–';
                const startStatus = s.startStatus === 'S' || s.startStatus === 'B'
                    ? s.startStatus
                    : (s.onPitch === false ? 'B' : 'S');
                const sbTitle = startStatus === 'S' ? 'Startet kampen' : 'Startet kampen på benken';

                return `
                    <tr
                        class="stats-kampdata-table-row${s.onPitch === false ? ' is-bench' : ''}${s.isBbInMatch ? ' is-bb' : ''}"
                        data-stat-action="open-player"
                        data-player-id="${playerId}"
                        data-player-name="${safeName}"
                        role="button"
                        tabindex="0"
                        title="${escapeStatisticsHtml(s.breakdown)}"
                        aria-label="${safeName}${s.posCode ? `, ${s.posCode}` : ''}, ${startStatus === 'S' ? 'start' : 'benk'}, børs ${ratingText}, ${s.points} poeng"
                    >
                        <td class="stats-kampdata-col-player">
                            <span class="stats-kampdata-player-name">${safeName}</span>
                            ${roleHtml}
                            ${pathHtml}
                        </td>
                        <td class="stats-kampdata-col-pos stats-kampdata-pc">${posHtml}</td>
                        <td class="stats-kampdata-col-sb stats-kampdata-pc${startStatus === 'B' ? ' is-bench' : ' is-start'}" title="${escapeStatisticsHtml(sbTitle)}">${startStatus}</td>
                        <td class="stats-kampdata-col-min">${minutesText}</td>
                        <td class="stats-kampdata-col-rating ${ratingClass}">${ratingText}</td>
                        <td class="stats-kampdata-col-ma">${maText}</td>
                        <td class="stats-kampdata-col-cards">${cardsHtml}</td>
                        <td class="stats-kampdata-col-points ${pointsClass}">${s.points}</td>
                    </tr>
                `;
            }).join('');

            const notesHtml = typeof window.buildMatchCoachNotesFieldsHtml === 'function'
                ? window.buildMatchCoachNotesFieldsHtml(match)
                : '';

            container.innerHTML = `
                <div class="stats-kampdata-stack">
                    <div class="stats-kampdata-snapshot" aria-label="Kamp-snapshot">
                        <div class="stats-kampdata-snapshot-item">
                            <span class="stats-kampdata-snapshot-label">Snittbørs</span>
                            <strong class="stats-kampdata-snapshot-value">${avgRating ? avgRating.toFixed(1) : '–'}</strong>
                        </div>
                        <div class="stats-kampdata-snapshot-item">
                            <span class="stats-kampdata-snapshot-label">Mål for</span>
                            <strong class="stats-kampdata-snapshot-value">${formatDash(goalsFor)}</strong>
                        </div>
                        <div class="stats-kampdata-snapshot-item">
                            <span class="stats-kampdata-snapshot-label">Mål imot</span>
                            <strong class="stats-kampdata-snapshot-value">${formatDash(goalsAgainst)}</strong>
                        </div>
                        <div class="stats-kampdata-snapshot-item">
                            <span class="stats-kampdata-snapshot-label">Gule</span>
                            <strong class="stats-kampdata-snapshot-value">${totalYellow}</strong>
                        </div>
                        <div class="stats-kampdata-snapshot-item">
                            <span class="stats-kampdata-snapshot-label">Røde</span>
                            <strong class="stats-kampdata-snapshot-value">${totalRed}</strong>
                        </div>
                    </div>

                    <section class="stats-kampdata-players-panel">
                        <div class="stats-kampdata-table-toolbar">
                            <h3 class="stats-kampdata-table-title">Spillere</h3>
                            <button
                                type="button"
                                data-stat-action="open-form-info"
                                class="training-session-groups-info-btn stats-chrome-info-btn"
                                title="Slik regnes kampbidrag"
                                aria-label="Slik regnes kampbidrag"
                            >
                                <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="stats-kampdata-table-wrap">
                            <table class="stats-kampdata-table">
                                <thead>
                                    <tr>
                                        <th>Spiller</th>
                                        <th class="stats-kampdata-pc" title="Hovedposisjon i kampen">Pos</th>
                                        <th class="stats-kampdata-pc" title="Start / Benk ved avspark">S/B</th>
                                        <th>MIN</th>
                                        <th>Børs</th>
                                        <th>M/A</th>
                                        <th>Kort</th>
                                        <th>Poeng</th>
                                    </tr>
                                </thead>
                                <tbody>${rowsHtml}</tbody>
                            </table>
                        </div>
                    </section>

                    <div class="stats-kampdata-secondary">
                        <div class="stats-kampdata-notes">
                            <p class="stats-mini-label">Trenernotater</p>
                            ${notesHtml}
                        </div>
                        <button type="button" data-stat-action="open-tactical" data-match-id="${escapeStatisticsHtml(match.id)}" class="portal-btn portal-btn-primary portal-btn-lg portal-btn-full">
                            <i class="fa-solid fa-broadcast-tower" aria-hidden="true"></i>
                            Gå til Live
                        </button>
                    </div>
                </div>
            `;
            if (typeof window.autosizeMatchCoachNotesFields === 'function') {
                requestAnimationFrame(() => window.autosizeMatchCoachNotesFields(container));
            }
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
            window.pendingMatchDetailsOpenPanel = 'spillerbors';
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
            currentStatSortCol = column;
            currentStatSortDesc = true;

            window.updateStatsSortButtons();
            window.renderPlayerStatsList();

            if (window.getStatsLagSection && window.getStatsLagSection() === 'spillerdata' && typeof window.renderStatsSpillereSummary === 'function') {
                window.renderStatsSpillereSummary();
            }
        };

        
        window.renderPlayerStatsTable = function() {
            window.renderPlayerStatsList();
        };


window.getPlayerMatchPointsHistory = function(playerName, options = {}) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];

    const yearFilter = options.yearFilter !== undefined
        ? options.yearFilter
        : (options.applyYearFilter
            ? (typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle'))
            : 'alle');
    const history = [];

    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup !== playerObj.spillerLag || !window.isPlayerAttending(m.attendance, playerObj)) return;
        if (typeof window.isTreningskamp === 'function' && window.isTreningskamp(m)) return;
        if (typeof window.matchHasPlayedResult === 'function' && !window.matchHasPlayedResult(m)) return;
        if (typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(m)) return;
        if (typeof window.activityBelongsToStatsYear === 'function' && !window.activityBelongsToStatsYear(m, yearFilter)) return;

        const ptsDetails = window.calculatePlayerMatchPoints(m, playerObj, true);
        const goals = Number(window.getPlayerRefMapValue(m.scorers, playerObj, 0)) || 0;
        const assists = Number(window.getPlayerRefMapValue(m.assists, playerObj, 0)) || 0;
        const yellow = window.playerRefListIncludes(m.guleKort, playerObj);
        const red = window.playerRefListIncludes(m.rodeKort, playerObj);
        const bb = window.motmMatchesPlayer(m.motm, playerObj);
        const startStatus = typeof window.getPlayerMatchStartStatus === 'function'
            ? window.getPlayerMatchStartStatus(m, playerObj)
            : '';
        const onPitch = ptsDetails.onPitch !== false;
        const posId = onPitch && typeof window.getPlayerMatchPlayedPositionIds === 'function'
            ? (window.getPlayerMatchPlayedPositionIds(m, playerObj)[0] || '')
            : (onPitch && typeof window.getPlayerMatchPlayedPositionId === 'function'
                ? (window.getPlayerMatchPlayedPositionId(m, playerObj) || '')
                : '');
        const formationId = typeof window.getMatchGamePlanFormation === 'function'
            ? window.getMatchGamePlanFormation(m)
            : (m.formation || '');
        const posCode = posId && typeof window.getMatchGamePlanPositionBadgeLabel === 'function'
            ? window.getMatchGamePlanPositionBadgeLabel(posId, formationId)
            : posId;
        const posLabel = posId && typeof window.getMatchGamePlanPositionLabel === 'function'
            ? window.getMatchGamePlanPositionLabel(posId)
            : posCode;

        const minutesTracked = typeof window.matchHasMinutesTracking === 'function'
            && window.matchHasMinutesTracking(m);
        const minutes = minutesTracked
            ? (typeof window.getPlayerMatchMinutesForStats === 'function'
                ? window.getPlayerMatchMinutesForStats(m, playerObj)
                : Math.max(0, Math.floor(Number(window.getPlayerRefMapValue(m.minutesPlayed, playerObj, 0)) || 0)))
            : null;

        history.push({
            matchId: m.id,
            date: m.date,
            opponent: m.opponent,
            matchType: m.matchType || 'Kamp',
            result: m.result || 'Ikke spilt',
            rating: window.getPlayerRefMapValue(m.ratings, playerObj, '-') || '-',
            points: ptsDetails.total,
            onPitch,
            startStatus,
            minutes,
            posId,
            posCode,
            posLabel,
            goals,
            assists,
            yellow,
            red,
            bb,
            breakdownDetails: {
                base: ptsDetails.base,
                resultBonus: ptsDetails.resultBonus,
                ratingBonus: ptsDetails.ratingBonus,
                minutesBonus: ptsDetails.minutesBonus || 0,
                bbBonus: ptsDetails.bbBonus,
                onPitch: ptsDetails.onPitch !== false
            },
            breakdown: `${ptsDetails.onPitch === false ? 'Benk' : 'Spilt'}: ${ptsDetails.base} | Res/Mål: ${ptsDetails.resultBonus > 0 ? '+' + ptsDetails.resultBonus : ptsDetails.resultBonus} | Børs: ${ptsDetails.ratingBonus > 0 ? '+' + ptsDetails.ratingBonus : ptsDetails.ratingBonus} | Min: ${(ptsDetails.minutesBonus || 0) > 0 ? '+' + ptsDetails.minutesBonus : (ptsDetails.minutesBonus || 0)}`
        });
    });
    
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};

window.getPlayerPerformanceTrend = function(playerName, options = {}) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];

    const history = window.getPlayerMatchPointsHistory(playerName, options);
    if (!history.length) return [];

    const teamName = playerObj.spillerLag;
    const yearFilter = options.yearFilter !== undefined
        ? options.yearFilter
        : (options.applyYearFilter
            ? (typeof window.getStatsSpillerYearFilter === 'function'
                ? window.getStatsSpillerYearFilter()
                : (typeof window.getStatsKampYearFilter === 'function' ? window.getStatsKampYearFilter() : 'alle'))
            : 'alle');

    return [...history]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => {
            const playerDevelopment = typeof window.getPlayerRollingMatchPointsAsOf === 'function'
                ? window.getPlayerRollingMatchPointsAsOf(playerObj, entry.date, { yearFilter })
                : null;
            const teamMedian = typeof window.getTeamDevelopmentMedianAsOf === 'function'
                ? window.getTeamDevelopmentMedianAsOf(teamName, entry.date, {
                    yearFilter,
                    excludePlayerName: playerName
                })
                : null;
            return {
                matchId: entry.matchId,
                date: entry.date,
                opponent: entry.opponent,
                kampbidrag: entry.points,
                playerDevelopment,
                teamKampbidrag: teamMedian
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
        { label: 'Spilletid', value: details.minutesBonus || 0, tone: (details.minutesBonus || 0) > 0 ? 'positive' : 'neutral' },
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
                <span class="stats-point-chip-value">${details.base + details.resultBonus + details.ratingBonus + (details.minutesBonus || 0) + details.bbBonus}</span>
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
    const text = String(result || '').trim();
    if (!text || text === 'Ikke spilt') return '(ikke spilt)';
    if (text.includes('–')) return text;
    if (!text.includes('-')) return '(ikke spilt)';
    return text.replace(/\s*-\s*/, '–');
};

window.formatStatsBskFirstResult = function(match) {
    const resultStr = match && typeof match === 'object' ? match.result : match;
    const penaltyStr = match && typeof match === 'object' ? match.penaltyResult : '';
    if (!resultStr || resultStr === 'Ikke spilt' || !String(resultStr).includes('-')) {
        return '(ikke spilt)';
    }
    const parsed = typeof window.parseScore === 'function' ? window.parseScore(resultStr) : null;
    if (!parsed) return window.formatStatsMatchResult(resultStr);
    let text = `${parsed.bsk}–${parsed.opponent}`;
    const penalty = penaltyStr && typeof window.parseScore === 'function'
        ? window.parseScore(penaltyStr)
        : null;
    if (penalty) text += ` (${penalty.bsk}–${penalty.opponent} str.)`;
    return text;
};

window.formatStatsOpponentLabel = function(entry) {
    let label = entry.opponent || 'Motstander';
    const tags = [];
    if (entry.matchType === 'Cup') tags.push('cup');
    if (entry.venue === 'Borte') tags.push('borte');
    if (tags.length) label += ` (${tags.join(', ')})`;
    const resultText = String(entry.result || '');
    const notPlayed = !resultText || resultText === 'Ikke spilt' || (!resultText.includes('-') && !resultText.includes('–'));
    if (notPlayed) label += '*';
    return label;
};

window.renderPlayerFormHistoryTableHtml = function(playerName, history) {
    if (!history.length) {
        return `<div class="stats-form-history-empty">Ingen kamper registrert.</div>`;
    }

    const rows = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    const bodyRows = rows.map(entry => {
        const pointsClass = window.getPlayerPointsToneClass(entry.points);
        const ratingRaw = entry.rating && entry.rating !== '-' ? Number(entry.rating) : 0;
        const ratingText = ratingRaw > 0 ? String(ratingRaw) : '–';
        const ratingClass = ratingRaw >= 8 ? 'is-high' : ratingRaw >= 6 ? 'is-mid' : ratingRaw > 0 ? 'is-low' : 'is-neutral';
        const goals = Number(entry.goals) || 0;
        const assists = Number(entry.assists) || 0;
        const maText = (goals > 0 || assists > 0) ? `${goals}/${assists}` : '–';
        const satEntireBench = entry.onPitch === false;
        const startStatus = entry.startStatus === 'S' || entry.startStatus === 'B'
            ? entry.startStatus
            : (satEntireBench ? 'B' : 'S');
        const sbTitle = startStatus === 'S'
            ? 'Startet kampen'
            : 'Startet kampen på benken';
        const cardBits = [];
        if (entry.yellow) cardBits.push('<span class="stats-kampdata-card-dot is-yellow" title="Gult kort"></span>');
        if (entry.red) cardBits.push('<span class="stats-kampdata-card-dot is-red" title="Rødt kort"></span>');
        if (entry.bb) cardBits.push('<span class="stats-kampdata-bb-mark" title="Banens beste"><i class="fa-solid fa-crown" aria-hidden="true"></i></span>');
        const cardsHtml = cardBits.length ? cardBits.join('') : '–';
        const benchNote = satEntireBench
            ? '<span class="stats-form-history-bench">Benk</span>'
            : '';
        const posCode = String(entry.posCode || '').trim();
        const posLabel = String(entry.posLabel || posCode).trim();
        const posHtml = posCode
            ? `<span class="stats-form-history-pos-code">${escapeStatisticsHtml(posCode)}</span>`
            : '–';
        const minutesText = entry.minutes == null ? '–' : `${entry.minutes}'`;

        return `
            <tr class="stats-form-history-row${satEntireBench ? ' is-bench' : ''}">
                <td class="stats-form-history-date">${window.formatStatsShortDate(entry.date)}</td>
                <td class="stats-form-history-opponent">
                    <span class="stats-form-history-opponent-name">${escapeStatisticsHtml(window.formatStatsOpponentLabel(entry))}</span>
                    ${benchNote}
                </td>
                <td class="stats-form-history-pos" title="${escapeStatisticsHtml(posLabel || 'Hovedposisjon i kampen')}">${posHtml}</td>
                <td class="stats-form-history-rating ${ratingClass}">${ratingText}</td>
                <td class="stats-form-history-sb${startStatus === 'B' ? ' is-bench' : ' is-start'}" title="${escapeStatisticsHtml(sbTitle)}">${startStatus}</td>
                <td class="stats-form-history-minutes" title="Spilleminutter">${escapeStatisticsHtml(minutesText)}</td>
                <td class="stats-form-history-ma">${maText}</td>
                <td class="stats-form-history-cards">${cardsHtml}</td>
                <td class="stats-form-history-points ${pointsClass}">${entry.points}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="stats-form-history-table stats-form-history-table-player">
            <thead>
                <tr>
                    <th>Dato</th>
                    <th>Motstander</th>
                    <th title="Hovedposisjon i kampen">Pos</th>
                    <th>Børs</th>
                    <th title="Start / Benk ved avspark">S/B</th>
                    <th title="Spilleminutter">Min</th>
                    <th>M/A</th>
                    <th>Kort</th>
                    <th>Poeng</th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
};

window.renderTeamMatchHistoryTableHtml = function(history) {
    if (!Array.isArray(history) || !history.length) {
        return `<div class="stats-form-history-empty">Ingen kamper registrert.</div>`;
    }

    const rows = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    const bodyRows = rows.map(entry => {
        const opponent = entry.opponent || 'Motstander';
        const date = new Date(entry.date);
        const hasDate = !Number.isNaN(date.getTime());
        const day = hasDate ? String(date.getDate()).padStart(2, '0') : '–';
        const month = hasDate
            ? date.toLocaleDateString('no-NO', { month: 'short' }).replace('.', '').toUpperCase()
            : '';
        const fullResult = typeof window.formatStatsMatchResult === 'function'
            ? window.formatStatsMatchResult(entry.result)
            : (entry.result || '–');
        const penaltySplit = String(fullResult).match(/^(.*?)\s*\((.+)\)\s*$/);
        const mainResult = penaltySplit ? penaltySplit[1] : fullResult;
        const penaltyResult = penaltySplit ? penaltySplit[2] : '';
        const formTone = entry.form === 'S'
            ? 'is-win'
            : (entry.form === 'T' ? 'is-loss' : (entry.form === 'U' ? 'is-draw' : ''));
        const formLabel = entry.form === 'S' ? 'seier' : (entry.form === 'U' ? 'uavgjort' : (entry.form === 'T' ? 'tap' : ''));
        const formHtml = entry.form
            ? `<span class="stats-form-history-result-pill ${formTone}">${escapeStatisticsHtml(entry.form)}</span>`
            : '';
        const isCup = entry.matchType === 'Cup';
        const isAway = entry.venue === 'Borte';
        const typeMark = isCup
            ? '<span class="stats-match-log-mark is-cup">Cup</span>'
            : '';
        const awayMark = isAway
            ? '<span class="stats-match-log-mark is-away">Borte</span>'
            : '';
        const matchId = entry.matchId ? String(entry.matchId) : '';
        const ariaBits = [opponent, isCup ? 'cup' : '', isAway ? 'borte' : '', mainResult, formLabel].filter(Boolean);
        const rowAttrs = matchId
            ? ` type="button" class="stats-match-log-row" data-stat-action="open-kampstats" data-match-id="${escapeStatisticsHtml(matchId)}" title="Vis kampstats" aria-label="Vis kampstats for ${escapeStatisticsHtml(ariaBits.join(', '))}"`
            : ' type="button" class="stats-match-log-row" disabled';

        const monthKey = hasDate ? `${date.getFullYear()}-${date.getMonth()}` : '';
        const monthLabel = hasDate
            ? date.toLocaleDateString('no-NO', { month: 'long' }).replace('.', '')
            : '';
        return {
            monthKey,
            monthLabel,
            html: `
            <button${rowAttrs}>
                <span class="stats-match-log-date" aria-hidden="true">
                    <span class="stats-match-log-day">${escapeStatisticsHtml(day)}</span>
                    ${month ? `<span class="stats-match-log-month">${escapeStatisticsHtml(month)}</span>` : ''}
                </span>
                <span class="stats-match-log-main">
                    <span class="stats-match-log-title">
                        <span class="stats-match-log-name">${escapeStatisticsHtml(opponent)}</span>
                        ${typeMark}
                        ${awayMark}
                    </span>
                </span>
                <span class="stats-match-log-score">
                    <span class="stats-match-log-outcome ${formTone}">
                        <span class="stats-match-log-result">${escapeStatisticsHtml(mainResult)}</span>
                        ${formHtml}
                    </span>
                    ${penaltyResult ? `<span class="stats-match-log-penalty">${escapeStatisticsHtml(penaltyResult)}</span>` : ''}
                </span>
            </button>
        `
        };
    });
    const splitAt = Math.ceil(bodyRows.length / 2);
    const columns = [bodyRows.slice(0, splitAt), bodyRows.slice(splitAt)].filter(column => column.length);
    let previousMonth = '';
    const columnHtml = columns.map(column => {
        let lastMonth = '';
        const parts = [];
        column.forEach((item, index) => {
            if (item.monthLabel && item.monthKey !== lastMonth) {
                const continues = index === 0 && item.monthKey === previousMonth;
                parts.push(`<div class="stats-match-log-divider${continues ? ' is-continued' : ''}">${escapeStatisticsHtml(item.monthLabel)}</div>`);
                lastMonth = item.monthKey;
            }
            parts.push(item.html);
        });
        const lastItem = column[column.length - 1];
        if (lastItem && lastItem.monthKey) previousMonth = lastItem.monthKey;
        return `<div class="stats-match-log-col">${parts.join('')}</div>`;
    }).join('');

    return `<div class="stats-match-log">${columnHtml}</div>`;
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

    const data = trendData.slice(-10);
    const width = 360;
    const height = 188;
    const pad = { top: 18, right: 34, bottom: 36, left: 34 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const playerSeries = data.map(entry => (
        entry.playerDevelopment !== null && entry.playerDevelopment !== undefined
            ? entry.playerDevelopment
            : entry.kampbidrag
    ));
    const smoothedPlayer = typeof window.smoothNumericSeries === 'function'
        ? window.smoothNumericSeries(playerSeries, 3)
        : playerSeries;
    const smoothedTeam = typeof window.smoothNumericSeries === 'function'
        ? window.smoothNumericSeries(data.map(entry => entry.teamKampbidrag), 3)
        : data.map(entry => entry.teamKampbidrag);

    const pointValues = data.flatMap((entry, index) => [
        smoothedPlayer[index],
        smoothedTeam[index]
    ].filter(value => value !== null && value !== undefined));
    const maxPoints = Math.max(35, ...pointValues) * 1.08;
    const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;
    const toX = (index) => pad.left + (index * xStep);
    const toYPoints = (value) => pad.top + plotH - ((value / maxPoints) * plotH);
    const formatGridValue = (value) => {
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const gridLines = [0, 0.25, 0.5, 0.75].map(ratio => {
        const value = maxPoints * ratio;
        const y = toYPoints(value);
        const labelY = ratio === 0 ? y - 1 : y + 3;
        return `
            <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="${ratio === 0 ? 'stats-chart-axis' : 'stats-chart-grid-line'}" />
            <text x="${pad.left - 5}" y="${labelY}" class="stats-chart-grid-value" text-anchor="end">${formatGridValue(value)}</text>
        `;
    }).join('');

    const toPathPoints = (values) => values
        .map((value, index) => (
            value === null || value === undefined
                ? null
                : { x: toX(index), y: toYPoints(value) }
        ))
        .filter(Boolean);

    const playerPath = typeof window.buildSmoothChartPath === 'function'
        ? window.buildSmoothChartPath(toPathPoints(smoothedPlayer))
        : '';
    const teamMedianPath = typeof window.buildSmoothChartPath === 'function'
        ? window.buildSmoothChartPath(toPathPoints(smoothedTeam))
        : '';

    const labels = data.map((entry, index) => {
        const label = entry.date
            ? new Date(entry.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
            : String(index + 1);
        return `<text x="${toX(index)}" y="${height - 10}" class="stats-chart-axis-label" text-anchor="middle">${label}</text>`;
    }).join('');

    const markers = data.map((entry, index) => {
        const playerValue = smoothedPlayer[index];
        const teamValue = smoothedTeam[index];
        const playerText = playerValue !== null && playerValue !== undefined
            ? `utvikling ${playerValue}`
            : '';
        const medianText = teamValue !== null && teamValue !== undefined
            ? `, lagsmedian ${teamValue}`
            : '';
        const title = `${entry.opponent || 'Kamp'}: ${playerText}${medianText}`;
        const teamMarker = teamValue !== null && teamValue !== undefined
            ? `<circle cx="${toX(index)}" cy="${toYPoints(teamValue)}" r="3" class="stats-chart-marker is-team-median" />`
            : '';
        const playerMarker = playerValue !== null && playerValue !== undefined
            ? `<circle cx="${toX(index)}" cy="${toYPoints(playerValue)}" r="4.2" class="stats-chart-marker is-kampbidrag" />`
            : '';
        return `
            <g class="stats-chart-marker-group">
                <title>${title}</title>
                ${teamMarker}
                ${playerMarker}
            </g>
        `;
    }).join('');

    return `
        <svg class="stats-player-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Diagram over spillerutvikling mot lagsmedian">
            ${gridLines}
            <text x="8" y="${pad.top + 4}" class="stats-chart-axis-caption">Poeng</text>
            ${teamMedianPath ? `<path d="${teamMedianPath}" class="stats-chart-line is-team-median" fill="none" />` : ''}
            ${playerPath ? `<path d="${playerPath}" class="stats-chart-line is-kampbidrag" fill="none" />` : ''}
            ${markers}
            ${labels}
        </svg>
    `;
};
