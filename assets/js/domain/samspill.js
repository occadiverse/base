(function() {
    const POSITION_PAIR_RELEVANCE = {
        'VB|VK': 1.0, 'HB|HK': 1.0,
        'VMS|HMS': 1.0,
        'VMS|VB': 0.95, 'HMS|HB': 0.95,
        'VMS|DM': 0.95, 'HMS|DM': 0.95,
        'DM|OM': 1.0, 'DM|PM': 1.0,
        'OM|SP': 1.0, 'PM|SP': 1.0,
        'VK|SP': 1.0, 'HK|SP': 1.0,
        'VK|OM': 0.95, 'HK|PM': 0.95,
        'OM|PM': 0.9,
        'VB|OM': 0.9, 'HB|PM': 0.9,
        'VB|DM': 0.85, 'HB|DM': 0.85,
        'VMS|OM': 0.75, 'HMS|PM': 0.75,
        'DM|VK': 0.7, 'DM|HK': 0.7,
        'GK|VMS': 0.7, 'GK|HMS': 0.7,
        'GK|DM': 0.55,
        'GK|SP': 0.3,
        'VK|HK': 0.3,
        'VB|HK': 0.35, 'HB|VK': 0.35,
        'GK|VK': 0.35, 'GK|HK': 0.35,
        'GK|OM': 0.4, 'GK|PM': 0.4,
        'VMS|SP': 0.45, 'HMS|SP': 0.45,
        'VK|PM': 0.65, 'HK|OM': 0.65,
        'VB|HB': 0.5
    };

    const DEFAULT_POSITION_RELEVANCE = 0.65;
    const MIN_RELEVANCE_TO_DRAW = 0.45;
    const TACTICAL_SAMSPILL_CONNECTIONS = {
        fase1: [
            ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB'], ['VMS', 'OM'], ['HMS', 'DM'],
            ['VB', 'OM'], ['VB', 'VK'], ['DM', 'OM'], ['HB', 'DM'], ['HB', 'HK'],
            ['OM', 'VK'], ['OM', 'SP'], ['VK', 'SP'], ['SP', 'PM'], ['PM', 'DM'],
            ['HK', 'DM'], ['HK', 'PM']
        ],
        fase2: [
            ['VMS', 'HMS'], ['VMS', 'VB'], ['VMS', 'GK'], ['VMS', 'DM'], ['HMS', 'HB'],
            ['HMS', 'GK'], ['HMS', 'DM'], ['VB', 'VK'], ['VB', 'OM'], ['VB', 'DM'],
            ['HB', 'HK'], ['HB', 'PM'], ['HB', 'DM'], ['VK', 'SP'], ['VK', 'OM'],
            ['HK', 'PM'], ['HK', 'SP'], ['PM', 'SP'], ['PM', 'DM'], ['PM', 'OM'],
            ['SP', 'OM'], ['OM', 'DM']
        ],
        fase3: [
            ['VB', 'VK'], ['HB', 'HK'], ['VB', 'VMS'], ['HB', 'HMS'], ['GK', 'VMS'],
            ['GK', 'HMS'], ['VK', 'SP'], ['HK', 'SP'], ['HK', 'PM'], ['VK', 'OM'],
            ['OM', 'SP'], ['PM', 'SP'], ['OM', 'PM'], ['OM', 'VB'], ['PM', 'HB'],
            ['DM', 'OM'], ['DM', 'PM'], ['DM', 'VB'], ['DM', 'HB'], ['DM', 'VMS'],
            ['DM', 'HMS'], ['VMS', 'HMS']
        ]
    };
    const TACTICAL_SAMSPILL_DEFAULT_PHASE = 'fase2';

    window.getTacticalSamspillConnections = function(phaseId) {
        const phase = phaseId || TACTICAL_SAMSPILL_DEFAULT_PHASE;
        return TACTICAL_SAMSPILL_CONNECTIONS[phase] || TACTICAL_SAMSPILL_CONNECTIONS[TACTICAL_SAMSPILL_DEFAULT_PHASE];
    };

    window.getActiveTacticalSamspillPhase = function() {
        if (typeof currentTacticalPhase !== 'undefined' && currentTacticalPhase) {
            return currentTacticalPhase;
        }
        return TACTICAL_SAMSPILL_DEFAULT_PHASE;
    };

    const MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS = {
        '4-2-4': [
            // Keeper → hele forsvarsfiresome
            ['GK', 'VB'], ['GK', 'VMS'], ['GK', 'HMS'], ['GK', 'HB'],
            // Venstre bekk → keeper, nærmeste stopper, kant og midtbane
            ['VB', 'VMS'], ['VB', 'VK'], ['VB', 'OM'],
            // Høyre bekk → keeper, nærmeste stopper, kant og midtbane
            ['HB', 'HMS'], ['HB', 'HK'], ['HB', 'DM'],
            // Midtstoppere → keeper, nærmeste bekk, stopperpartner og begge midtbanespillere
            ['VMS', 'HMS'], ['VMS', 'DM'], ['VMS', 'OM'],
            ['HMS', 'DM'], ['HMS', 'OM'],
            // PM → kant, midtbane og spiss
            ['PM', 'HK'], ['PM', 'DM'], ['PM', 'OM'], ['PM', 'SP'],
            // SP → kant, midtbanespillere og PM
            ['SP', 'VK'], ['SP', 'DM'], ['SP', 'OM'], ['SP', 'PM']
        ]
    };

    window.getMatchGamePlanSamspillConnections = function(formationId) {
        const id = formationId || '4-2-4';
        if (MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS[id]) {
            return MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS[id];
        }
        return window.getTacticalSamspillConnections(
            typeof window.getActiveTacticalSamspillPhase === 'function'
                ? window.getActiveTacticalSamspillPhase()
                : undefined
        );
    };

    window.hasMatchGamePlanSamspillConnections = function(formationId) {
        const id = formationId || '4-2-4';
        return Object.prototype.hasOwnProperty.call(MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS, id);
    };

    function pairKey(a, b) {
        return [a, b].sort().join('|');
    }

    function resolvePlayer(playerRef) {
        if (!playerRef) return null;
        if (typeof playerRef === 'object') return playerRef;
        return typeof window.findPlayerByRef === 'function'
            ? window.findPlayerByRef(playerRef)
            : (window.activePlayers || []).find(p => p.navn === playerRef) || { navn: playerRef };
    }

    function normalizeKampbidrag(value) {
        const v = Number(value) || 0;
        if (v <= 0) return 0;
        return Math.max(0, Math.min(100, ((v - 5) / 35) * 100));
    }

    window.getPositionPairRelevance = function(posA, posB) {
        if (!posA || !posB || posA === posB) return 0;
        const key = pairKey(posA, posB);
        if (Object.prototype.hasOwnProperty.call(POSITION_PAIR_RELEVANCE, key)) {
            return POSITION_PAIR_RELEVANCE[key];
        }
        return DEFAULT_POSITION_RELEVANCE;
    };

    window.getDuoSharedHistory = function(playerA, playerB, options) {
        const opts = options || {};
        const filterLag = opts.teamName || null;
        const historicalOnly = opts.historicalOnly !== false;
        const playerObjA = resolvePlayer(playerA);
        const playerObjB = resolvePlayer(playerB);

        if (!playerObjA || !playerObjB) {
            return {
                sharedCount: 0,
                matchCount: 0,
                trainingCount: 0,
                weightedScore: 0,
                dataConfidence: 'none'
            };
        }

        const allEvents = [
            ...(window.activeEvents || []),
            ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))
        ];

        let sharedCount = 0;
        let matchCount = 0;
        let trainingCount = 0;
        let weightedScore = 0;
        const sharedEvents = [];

        allEvents.forEach(e => {
            if (filterLag && e.team !== filterLag) return;
            if (historicalOnly && typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return;
            if (!e.attendance) return;

            const aPresent = window.isPlayerAttending(e.attendance, playerObjA);
            const bPresent = window.isPlayerAttending(e.attendance, playerObjB);
            if (!aPresent || !bPresent) return;

            sharedEvents.push(e);
        });

        sharedEvents.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        sharedEvents.forEach((e, index) => {
            sharedCount += 1;
            const isMatch = e.type === 'Kamp';
            if (isMatch) matchCount += 1;
            else trainingCount += 1;

            const recencyWeight = Math.max(0.25, 1 - index * 0.07);
            const typeWeight = isMatch ? 2 : 1;
            weightedScore += recencyWeight * typeWeight;
        });

        let dataConfidence = 'none';
        if (sharedCount >= 6 || matchCount >= 3) dataConfidence = 'high';
        else if (sharedCount >= 3 || matchCount >= 1) dataConfidence = 'medium';
        else if (sharedCount >= 1) dataConfidence = 'low';

        return {
            sharedCount,
            matchCount,
            trainingCount,
            weightedScore,
            dataConfidence
        };
    };

    window.getDuoSamspill = function(playerA, playerB, options) {
        const opts = options || {};
        const playerObjA = resolvePlayer(playerA);
        const playerObjB = resolvePlayer(playerB);
        const posA = opts.posA || null;
        const posB = opts.posB || null;
        const teamName = opts.teamName || playerObjA?.spillerLag || playerObjB?.spillerLag || null;

        if (!playerObjA || !playerObjB) {
            return {
                score: 0,
                tone: 'unknown',
                label: 'Usikkert',
                tooltip: 'Usikkert: lite datagrunnlag',
                shouldDraw: false,
                dataConfidence: 'none',
                positionalRelevance: 0,
                components: {}
            };
        }

        const positionalRelevance = (posA && posB)
            ? window.getPositionPairRelevance(posA, posB)
            : DEFAULT_POSITION_RELEVANCE;

        const history = window.getDuoSharedHistory(playerObjA, playerObjB, opts);
        const formA = typeof window.calculatePlayerPerformanceChemistry === 'function'
            ? window.calculatePlayerPerformanceChemistry(playerObjA.navn, opts.asOfDate)
            : 0;
        const formB = typeof window.calculatePlayerPerformanceChemistry === 'function'
            ? window.calculatePlayerPerformanceChemistry(playerObjB.navn, opts.asOfDate)
            : 0;
        const bidragA = typeof window.getPlayerKampbidragSnitt === 'function'
            ? window.getPlayerKampbidragSnitt(playerObjA, teamName)
            : 0;
        const bidragB = typeof window.getPlayerKampbidragSnitt === 'function'
            ? window.getPlayerKampbidragSnitt(playerObjB, teamName)
            : 0;

        const normBidragA = normalizeKampbidrag(bidragA);
        const normBidragB = normalizeKampbidrag(bidragB);
        const formSynergy = (formA + formB) / 2;
        const bidragSynergy = (normBidragA + normBidragB) / 2;

        let currentScore = (
            formSynergy * 0.30 +
            bidragSynergy * 0.40 +
            Math.min(formA, formB) * 0.15 +
            Math.min(normBidragA, normBidragB) * 0.15
        );

        if (normBidragA >= 65 && normBidragB >= 65) {
            currentScore = Math.min(100, currentScore * 1.1);
        }

        const posModifier = 0.82 + positionalRelevance * 0.18;
        currentScore = Math.min(100, currentScore * posModifier);

        const historicalScore = Math.min(100, (history.weightedScore / 7) * 100);

        let score = currentScore;
        if (history.dataConfidence === 'medium' || history.dataConfidence === 'high') {
            score = currentScore * 0.70 + historicalScore * 0.30;
        }

        score = Math.round(Math.max(0, Math.min(100, score)));

        const lowData = history.dataConfidence === 'none' || history.dataConfidence === 'low';
        const highBidrag = normBidragA >= 58 && normBidragB >= 58;
        const highForm = formA >= 50 && formB >= 50;

        let tone = 'ok';
        let label = 'Ok kombinasjon';
        let tooltip = '';

        const sharedLabel = history.matchCount > 0
            ? `${history.matchCount} felles kamper${history.trainingCount > 0 ? ` og ${history.trainingCount} økter` : ''}`
            : history.sharedCount > 0
                ? `${history.sharedCount} felles økter`
                : 'lite historikk sammen';

        if (lowData) {
            if (highBidrag || (highForm && (normBidragA >= 45 || normBidragB >= 45))) {
                tone = 'potential';
                label = 'Potensial';
                tooltip = `Potensial: høyt kampbidrag${highForm ? ' + god form' : ''}, men ${sharedLabel}`;
            } else {
                tone = 'unknown';
                label = 'Usikkert';
                tooltip = `Usikkert: lite datagrunnlag (${sharedLabel})`;
            }
        } else if (score >= 68 && (highBidrag || highForm)) {
            tone = 'strong';
            label = 'Sterkt samspill';
            tooltip = `Sterkt samspill: ${highForm ? 'høy form' : 'god form'} + ${highBidrag ? 'høyt kampbidrag' : 'godt kampbidrag'} + ${sharedLabel}`;
        } else if (score >= 68) {
            tone = 'strong';
            label = 'Sterkt samspill';
            tooltip = `Sterkt samspill: god kombinasjon nå + ${sharedLabel}`;
        } else if (score >= 48) {
            tone = 'ok';
            label = 'Ok kombinasjon';
            tooltip = `Ok kombinasjon: ${sharedLabel}`;
        } else {
            tone = 'weak';
            label = 'Svak relasjon';
            tooltip = `Svak relasjon: lav form/kampbidrag akkurat nå${history.sharedCount > 0 ? ` (${sharedLabel})` : ''}`;
        }

        const shouldDraw = positionalRelevance >= MIN_RELEVANCE_TO_DRAW;

        return {
            score,
            tone,
            label,
            tooltip,
            shouldDraw,
            dataConfidence: history.dataConfidence,
            positionalRelevance,
            sharedCount: history.sharedCount,
            matchCount: history.matchCount,
            components: {
                formA,
                formB,
                bidragA,
                bidragB,
                normBidragA,
                normBidragB,
                currentScore: Math.round(currentScore),
                historicalScore: Math.round(historicalScore)
            }
        };
    };

    window.getSamspillLineStyle = function(samspillResult, options) {
        const opts = options || {};
        const focused = !!opts.focused;
        const isMatchPlan = opts.context === 'match-plan';
        const result = samspillResult || { tone: 'unknown', score: 0 };

        let strokeColor = 'rgba(244, 63, 94, 0.78)';
        let outlineColor = 'rgba(69, 10, 10, 0.72)';
        let strokeWidth = isMatchPlan ? 3.4 : (focused ? 3.6 : 2.8);
        let outlineWidth = 0;
        let strokeDasharray = null;
        let opacity = focused ? 1 : 0.96;

        switch (result.tone) {
            case 'strong':
                strokeColor = '#bbf7d0';
                outlineColor = 'rgba(6, 78, 59, 0.92)';
                strokeWidth = isMatchPlan ? 4.8 : (focused ? 5.2 : 4.4);
                outlineWidth = isMatchPlan ? 3.2 : 2.8;
                opacity = 1;
                break;
            case 'ok':
            case 'potential':
                strokeColor = '#fef08a';
                outlineColor = 'rgba(120, 53, 15, 0.82)';
                strokeWidth = isMatchPlan ? 4.2 : (focused ? 4.6 : 3.6);
                outlineWidth = isMatchPlan ? 2.8 : 2.4;
                opacity = 1;
                break;
            case 'weak':
                strokeColor = '#fecdd3';
                outlineColor = 'rgba(127, 29, 29, 0.82)';
                strokeWidth = isMatchPlan ? 3.8 : (focused ? 4.2 : 3.2);
                outlineWidth = isMatchPlan ? 2.6 : 2.2;
                opacity = 0.98;
                break;
            case 'unknown':
            default:
                strokeColor = '#dbeafe';
                outlineColor = 'rgba(18, 63, 115, 0.55)';
                strokeWidth = isMatchPlan ? 2.8 : (focused ? 3 : 2.2);
                outlineWidth = 0;
                strokeDasharray = '4,4';
                opacity = focused ? 0.9 : 0.78;
                break;
        }

        if (!focused && opts.dimUnfocused) {
            opacity *= 0.55;
            strokeWidth *= 0.88;
        }

        return {
            strokeColor,
            outlineColor,
            outlineWidth,
            strokeWidth,
            strokeDasharray,
            opacity,
            tone: result.tone || 'unknown',
            tooltip: result.tooltip || result.label || ''
        };
    };

    function createSamspillLineElement(coords, style, unit, className) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(coords.x1) + unit);
        line.setAttribute('y1', String(coords.y1) + unit);
        line.setAttribute('x2', String(coords.x2) + unit);
        line.setAttribute('y2', String(coords.y2) + unit);
        line.setAttribute('stroke', style.strokeColor);
        line.setAttribute('stroke-width', String(style.strokeWidth));
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        line.setAttribute('opacity', String(style.opacity));
        if (style.strokeDasharray) line.setAttribute('stroke-dasharray', style.strokeDasharray);
        line.setAttribute('class', className);
        return line;
    }

    window.appendSamspillLine = function(svg, coords, samspillResult, options) {
        if (!svg || !coords) return null;

        const opts = options || {};
        const unit = opts.coordUnit || '';
        const style = window.getSamspillLineStyle(samspillResult, opts);
        const toneClass = `is-tone-${style.tone}`;

        if (style.outlineWidth > 0) {
            const outline = createSamspillLineElement(
                coords,
                {
                    ...style,
                    strokeColor: style.outlineColor,
                    strokeWidth: style.strokeWidth + style.outlineWidth,
                    strokeDasharray: null
                },
                unit,
                `samspill-line samspill-line-outline ${toneClass}`
            );
            svg.appendChild(outline);
        }

        const line = createSamspillLineElement(
            coords,
            style,
            unit,
            `samspill-line samspill-line-core ${toneClass} transition-all duration-500`
        );
        if (style.tooltip) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = style.tooltip;
            line.appendChild(title);
        }
        svg.appendChild(line);
        return line;
    };

    window.getDuoChemistry = function(playerA, playerB, options) {
        return window.getDuoSamspill(playerA, playerB, options).score;
    };
})();
