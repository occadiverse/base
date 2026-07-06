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
            // Midtbane ↔ kant
            ['OM', 'VK'], ['DM', 'HK'],
            ['DM', 'OM'],
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

    function confidenceToTrustScore(level) {
        switch (level) {
            case 'high': return 95;
            case 'medium': return 70;
            case 'low': return 40;
            default: return 15;
        }
    }

    function buildSharedHistoryLabel(history) {
        if (history.matchCount > 0) {
            return `${history.matchCount} felles kamper${history.trainingCount > 0 ? ` og ${history.trainingCount} økter` : ''}`;
        }
        if (history.sharedCount > 0) {
            return `${history.sharedCount} felles økter`;
        }
        return 'lite historikk sammen';
    }

    window.getDuoHistoricalChemistry = function(playerA, playerB, options) {
        const opts = options || {};
        const filterLag = opts.teamName || null;
        const historicalOnly = opts.historicalOnly !== false;
        const playerObjA = resolvePlayer(playerA);
        const playerObjB = resolvePlayer(playerB);
        if (!playerObjA || !playerObjB) return 0;

        const allEvents = [
            ...(window.activeEvents || []),
            ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))
        ];

        let shared = 0;
        let either = 0;
        allEvents.forEach(e => {
            if (filterLag && e.team !== filterLag) return;
            if (historicalOnly && typeof window.isHistoricalActivity === 'function' && !window.isHistoricalActivity(e)) return;
            if (!e.attendance) return;

            const aPresent = window.isPlayerAttending(e.attendance, playerObjA);
            const bPresent = window.isPlayerAttending(e.attendance, playerObjB);
            if (aPresent || bPresent) either += 1;
            if (aPresent && bPresent) shared += 1;
        });

        return either > 0 ? Math.round((shared / either) * 100) : 0;
    };

    function getDuoHistoricalSamspillScore(history, chemistryPct) {
        if (!history || history.sharedCount === 0) return 0;
        const weightedPct = Math.min(100, (history.weightedScore / 7) * 100);
        return Math.round(chemistryPct * 0.4 + weightedPct * 0.6);
    }

    function resolveSamspillStatus(score, history, formA, formB, normBidragA, normBidragB) {
        const confidence = history.dataConfidence || 'none';
        const lowHistory = confidence === 'none' || confidence === 'low';
        const sharedLabel = buildSharedHistoryLabel(history);
        const formAvg = (formA + formB) / 2;
        const bidragAvg = (normBidragA + normBidragB) / 2;
        const highForm = formAvg >= 50;
        const highBidrag = bidragAvg >= 52;
        const strongIndividuals = highBidrag || (highForm && bidragAvg >= 40);

        if (lowHistory) {
            if (strongIndividuals) {
                return {
                    status: 'potential',
                    reason: `Potensial (${score}/100): god form/kampbidrag, men ${sharedLabel}`
                };
            }
            return {
                status: 'unknown',
                reason: `Usikkert (${score}/100): lite datagrunnlag (${sharedLabel})`
            };
        }

        if (score >= 68) {
            return {
                status: 'strong',
                reason: `Sterkt samspill (${score}/100): høy score nå + ${sharedLabel}`
            };
        }
        if (score >= 48) {
            return {
                status: 'ok',
                reason: `Ok samspill (${score}/100): ${sharedLabel}`
            };
        }
        return {
            status: 'weak',
            reason: `Svakt samspill (${score}/100): lav form/kampbidrag nå${history.sharedCount > 0 ? ` (${sharedLabel})` : ''}`
        };
    }

    window.computeDuoSamspillScore = function(playerA, playerB, options) {
        const opts = options || {};
        const playerObjA = resolvePlayer(playerA);
        const playerObjB = resolvePlayer(playerB);
        const posA = opts.posA || null;
        const posB = opts.posB || null;
        const teamName = opts.teamName || playerObjA?.spillerLag || playerObjB?.spillerLag || null;

        if (!playerObjA || !playerObjB) {
            return {
                score: 0,
                status: 'unknown',
                confidence: 'none',
                reason: 'Usikkert: mangler spillerdata',
                shouldDraw: false,
                positionalRelevance: 0,
                components: {}
            };
        }

        const positionalRelevance = (posA && posB)
            ? window.getPositionPairRelevance(posA, posB)
            : DEFAULT_POSITION_RELEVANCE;
        const history = window.getDuoSharedHistory(playerObjA, playerObjB, opts);
        const confidence = history.dataConfidence || 'none';

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
        const kampbidragScore = (normBidragA + normBidragB) / 2;
        const formScore = (formA + formB) / 2;
        const chemistryPct = window.getDuoHistoricalChemistry(playerObjA, playerObjB, opts);
        const historiskScore = getDuoHistoricalSamspillScore(history, chemistryPct);
        const dataTrustScore = confidenceToTrustScore(confidence);

        const score = Math.round(Math.max(0, Math.min(100, (
            kampbidragScore * 0.45 +
            formScore * 0.30 +
            historiskScore * 0.20 +
            dataTrustScore * 0.05
        ))));

        const statusResult = resolveSamspillStatus(score, history, formA, formB, normBidragA, normBidragB);

        return {
            score,
            status: statusResult.status,
            confidence,
            reason: statusResult.reason,
            shouldDraw: positionalRelevance >= MIN_RELEVANCE_TO_DRAW,
            positionalRelevance,
            sharedCount: history.sharedCount,
            matchCount: history.matchCount,
            components: {
                formA,
                formB,
                bidragA,
                bidragB,
                kampbidragScore: Math.round(kampbidragScore),
                formScore: Math.round(formScore),
                historiskScore,
                chemistryPct,
                dataTrustScore
            }
        };
    };

    window.getDuoSamspill = function(playerA, playerB, options) {
        const result = window.computeDuoSamspillScore(playerA, playerB, options);
        const statusLabels = {
            strong: 'Sterkt samspill',
            ok: 'Ok samspill',
            weak: 'Svakt samspill',
            potential: 'Potensial',
            unknown: 'Usikkert'
        };

        return {
            ...result,
            tone: result.status,
            label: statusLabels[result.status] || 'Usikkert',
            tooltip: result.reason,
            dataConfidence: result.confidence
        };
    };
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

    window.getSamspillLineStyle = function(samspillResult, options) {
        const opts = options || {};
        const focused = !!opts.focused;
        const isMatchPlan = opts.context === 'match-plan';
        const result = samspillResult || { status: 'unknown', tone: 'unknown', score: 0 };
        const status = result.status || result.tone || 'unknown';

        let strokeColor = 'rgba(255, 255, 255, 0.42)';
        let strokeWidth = isMatchPlan ? 1.6 : (focused ? 2.4 : 2);
        let strokeDasharray = null;
        let opacity = 1;

        switch (status) {
            case 'strong':
                strokeColor = '#047857';
                strokeWidth = isMatchPlan ? 2.4 : (focused ? 3 : 2.6);
                break;
            case 'ok':
                strokeColor = '#facc15';
                strokeWidth = isMatchPlan ? 2.2 : (focused ? 2.8 : 2.4);
                break;
            case 'potential':
                strokeColor = '#4f46e5';
                strokeWidth = isMatchPlan ? 2.1 : (focused ? 2.6 : 2.3);
                strokeDasharray = '5 4';
                break;
            case 'weak':
                strokeColor = '#991b1b';
                strokeWidth = isMatchPlan ? 2.2 : (focused ? 2.8 : 2.4);
                break;
            case 'unknown':
            default:
                strokeColor = 'rgba(71, 85, 105, 0.72)';
                strokeWidth = isMatchPlan ? 1.8 : (focused ? 2.2 : 2);
                strokeDasharray = '4 4';
                opacity = 0.85;
                break;
        }

        if (!focused && opts.dimUnfocused) {
            opacity *= 0.5;
        }

        return {
            strokeColor,
            strokeWidth,
            strokeDasharray,
            opacity,
            tone: status
        };
    };

    function appendSamspillLineScoreLabel(group, coords, score, unit, status, isMatchPlan) {
        const midX = (coords.x1 + coords.x2) / 2;
        const midY = (coords.y1 + coords.y2) / 2;
        const label = score > 0 ? String(score) : '–';
        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        labelGroup.setAttribute('class', `samspill-line-label is-tone-${status}`);
        labelGroup.setAttribute('pointer-events', 'none');
        labelGroup.setAttribute('transform', `translate(${midX}${unit}, ${midY}${unit})`);

        const charWidth = isMatchPlan ? 1.9 : 5.8;
        const padX = isMatchPlan ? 2.2 : 5;
        const width = Math.max(isMatchPlan ? 8.5 : 24, label.length * charWidth + padX * 2);
        const height = isMatchPlan ? 5.4 : 14;
        const radius = isMatchPlan ? 2.7 : 7;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(-width / 2));
        rect.setAttribute('y', String(-height / 2));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(radius));
        rect.setAttribute('class', 'samspill-line-label-bg');
        if (isMatchPlan) rect.setAttribute('vector-effect', 'non-scaling-stroke');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'samspill-line-label-text');
        if (isMatchPlan) text.setAttribute('font-size', '3.8');
        text.textContent = label;

        labelGroup.appendChild(rect);
        labelGroup.appendChild(text);
        group.appendChild(labelGroup);
    }

    window.appendSamspillLine = function(svg, coords, samspillResult, options) {
        if (!svg || !coords) return null;

        const opts = options || {};
        const unit = opts.coordUnit || '';
        const style = window.getSamspillLineStyle(samspillResult, opts);
        const status = samspillResult?.status || samspillResult?.tone || style.tone || 'unknown';
        const isMatchPlan = opts.context === 'match-plan';
        const score = Number(samspillResult?.score) || 0;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `samspill-line-group is-tone-${status}`);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(coords.x1) + unit);
        line.setAttribute('y1', String(coords.y1) + unit);
        line.setAttribute('x2', String(coords.x2) + unit);
        line.setAttribute('y2', String(coords.y2) + unit);
        line.setAttribute('stroke', style.strokeColor);
        line.setAttribute('stroke-width', String(style.strokeWidth));
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', String(style.opacity));
        if (style.strokeDasharray) line.setAttribute('stroke-dasharray', style.strokeDasharray);
        line.setAttribute('class', `samspill-line samspill-line-core is-tone-${status} transition-all duration-500`);
        line.setAttribute('pointer-events', 'none');
        if (isMatchPlan) line.setAttribute('vector-effect', 'non-scaling-stroke');
        group.appendChild(line);

        if (opts.showScoreLabel !== false) {
            appendSamspillLineScoreLabel(group, coords, score, unit, status, isMatchPlan);
        }

        svg.appendChild(group);
        return group;
    };

    window.getDuoChemistry = function(playerA, playerB, options) {
        return window.getDuoSamspill(playerA, playerB, options).score;
    };

    window.buildSamspillSummary = function(pairs) {
        if (!Array.isArray(pairs) || pairs.length === 0) {
            return { items: [], totals: {}, totalsText: '', isEmpty: true };
        }

        const counts = { strong: 0, ok: 0, weak: 0, potential: 0, unknown: 0 };
        pairs.forEach(pair => {
            const status = pair.status || 'unknown';
            if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
            else counts.unknown += 1;
        });

        const pairLabel = (pair) => `${pair.posA} + ${pair.posB}`;
        const byScoreAsc = (a, b) => (a.score - b.score) || ((b.relevance || 0) - (a.relevance || 0));
        const byScoreDesc = (a, b) => (b.score - a.score) || ((b.relevance || 0) - (a.relevance || 0));
        const items = [];

        pairs
            .filter(pair => pair.status === 'weak')
            .sort(byScoreAsc)
            .slice(0, 2)
            .forEach(pair => items.push({ status: 'weak', prefix: 'Bør vurderes', pair: pairLabel(pair) }));

        pairs
            .filter(pair => pair.status === 'potential')
            .sort(byScoreDesc)
            .slice(0, 2)
            .forEach(pair => items.push({ status: 'potential', prefix: 'Potensial', pair: pairLabel(pair) }));

        pairs
            .filter(pair => pair.status === 'strong')
            .sort(byScoreDesc)
            .slice(0, 2)
            .forEach(pair => items.push({ status: 'strong', prefix: 'Sterk relasjon', pair: pairLabel(pair) }));

        if (items.length < 4) {
            pairs
                .filter(pair => pair.status === 'unknown')
                .sort(byScoreDesc)
                .slice(0, 4 - items.length)
                .forEach(pair => items.push({ status: 'unknown', prefix: 'Usikkert', pair: pairLabel(pair) }));
        }

        const totalParts = [];
        if (counts.strong) totalParts.push(`${counts.strong} sterk${counts.strong === 1 ? '' : 'e'}`);
        if (counts.ok) totalParts.push(`${counts.ok} ok`);
        if (counts.weak) totalParts.push(`${counts.weak} svak${counts.weak === 1 ? '' : 'e'}`);
        const unresolved = counts.potential + counts.unknown;
        if (unresolved) totalParts.push(`${unresolved} uavklart${unresolved === 1 ? '' : 'e'}`);

        return {
            items: items.slice(0, 4),
            totals: counts,
            totalsText: totalParts.length ? `Totalt: ${totalParts.join(', ')}` : '',
            isEmpty: false
        };
    };

    const SAMSPILL_ZONE_DEFINITIONS = {
        rows: [
            {
                id: 'forsvar',
                label: 'Forsvar',
                pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB']]
            },
            {
                id: 'midtbane',
                label: 'Midtbane',
                pairs: [['DM', 'OM'], ['DM', 'PM'], ['OM', 'PM']]
            },
            {
                id: 'angrep',
                label: 'Angrep',
                pairs: [['VK', 'SP'], ['HK', 'SP'], ['SP', 'OM'], ['SP', 'PM']]
            }
        ],
        corridors: [
            {
                id: 'venstre',
                label: 'Venstre',
                pairs: [['VMS', 'VB'], ['VB', 'VK'], ['OM', 'VK']]
            },
            {
                id: 'sentral',
                label: 'Sentral',
                pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['DM', 'OM'], ['DM', 'PM'], ['OM', 'SP'], ['PM', 'SP']]
            },
            {
                id: 'hoyre',
                label: 'Høyre',
                pairs: [['HMS', 'HB'], ['HB', 'HK'], ['PM', 'HK']]
            }
        ]
    };

    const ZONE_STATUS_LABELS = {
        strong: 'Sterk',
        ok: 'Ok',
        potential: 'Potensial',
        review: 'Bør vurderes',
        unknown: 'Usikker',
        weak: 'Svak'
    };

    function resolveZonePair(lineup, posA, posB, options) {
        const playerA = lineup?.[posA];
        const playerB = lineup?.[posB];
        if (!playerA || !playerB) return null;

        const samspill = typeof window.getDuoSamspill === 'function'
            ? window.getDuoSamspill(playerA, playerB, { ...options, posA, posB })
            : null;
        if (!samspill) return null;

        return {
            posA,
            posB,
            status: samspill.status || samspill.tone || 'unknown',
            score: samspill.score || 0,
            reason: samspill.reason || samspill.tooltip || ''
        };
    }

    function countZoneStatuses(relations) {
        const counts = { strong: 0, ok: 0, weak: 0, potential: 0, unknown: 0 };
        relations.forEach(relation => {
            const status = relation.status || 'unknown';
            if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
            else counts.unknown += 1;
        });
        return counts;
    }

    function resolveZoneStatus(relations, expectedCount) {
        if (!expectedCount) {
            return 'unknown';
        }

        if (!relations.length) {
            return 'unknown';
        }

        const counts = countZoneStatuses(relations);
        const resolved = relations.length - counts.unknown;

        if (resolved === 0) {
            return 'unknown';
        }

        if (counts.weak >= 2) {
            return 'weak';
        }

        if (counts.weak >= 1) {
            return 'review';
        }

        if (counts.potential >= Math.max(1, Math.ceil(relations.length / 2)) && counts.strong === 0 && counts.ok === 0) {
            return 'potential';
        }

        if (counts.strong >= 2 && counts.weak === 0) {
            return 'strong';
        }

        if (counts.strong >= 1 && counts.weak === 0 && counts.potential <= counts.strong) {
            if (counts.strong + counts.ok >= Math.ceil(resolved * 0.5)) {
                return counts.strong >= counts.ok ? 'strong' : 'ok';
            }
        }

        if (counts.strong + counts.ok >= Math.ceil(resolved * 0.6) && counts.weak === 0) {
            return counts.strong >= counts.ok ? 'strong' : 'ok';
        }

        if (counts.potential >= 1 && counts.weak === 0 && counts.strong === 0) {
            return 'potential';
        }

        if (counts.unknown >= Math.ceil(relations.length / 2)) {
            return 'unknown';
        }

        if (counts.ok >= counts.potential) {
            return 'ok';
        }

        return counts.potential > 0 ? 'potential' : 'ok';
    }

    function formatZonePairLabel(relation) {
        return `${relation.posA} + ${relation.posB}`;
    }

    function buildZoneExplanation(zone, status, relations) {
        const zoneLabel = zone.label.toLowerCase();
        const weakPairs = relations.filter(relation => relation.status === 'weak');
        const strongPairs = relations.filter(relation => relation.status === 'strong')
            .sort((a, b) => b.score - a.score);
        const potentialPairs = relations.filter(relation => relation.status === 'potential');

        if (!relations.length) {
            return `Sett spillere i ${zoneLabel} for å vurdere samspillet.`;
        }

        if (status === 'weak') {
            const labels = weakPairs.map(formatZonePairLabel);
            if (labels.length >= 2) {
                return `${zone.label} har flere svake relasjoner, blant annet ${labels.slice(0, 2).join(' og ')}.`;
            }
            return `${zone.label} trekkes ned av ${labels[0] || 'svake relasjoner'}.`;
        }

        if (status === 'review') {
            return `Viktig relasjon å følge med på: ${formatZonePairLabel(weakPairs[0])}.`;
        }

        if (status === 'potential') {
            if (zone.id === 'midtbane') {
                return 'Midtbanen har høy kampverdi, men lite historikk sammen.';
            }
            if (potentialPairs.length) {
                return `${zone.label} har potensial i ${formatZonePairLabel(potentialPairs[0])}, men begrenset historikk.`;
            }
            return `${zone.label} ser lovende ut individuelt, men med lite felles historikk.`;
        }

        if (status === 'unknown') {
            return `For lite data til å vurdere ${zoneLabel} trygt ennå.`;
        }

        if (status === 'strong') {
            if (zone.id === 'forsvar') {
                return 'Forsvarsrekken ser trygg ut med sterkt stopperpar.';
            }
            if (zone.id === 'venstre' && strongPairs.some(pair => (
                (pair.posA === 'VB' && pair.posB === 'VK') || (pair.posA === 'VK' && pair.posB === 'VB')
            ))) {
                return 'Venstresiden har sterk relasjon mellom VB + VK.';
            }
            if (zone.id === 'hoyre' && strongPairs.length) {
                return `Høyresiden styrkes av ${formatZonePairLabel(strongPairs[0])}.`;
            }
            if (strongPairs.length) {
                return `${zone.label} styrkes av ${formatZonePairLabel(strongPairs[0])}.`;
            }
        }

        if (status === 'ok') {
            if (zone.id === 'angrep') {
                return 'Angrepsleddet har jevne relasjoner uten tydelige svake ledd.';
            }
            return `${zone.label} ser samlet sett stabil ut.`;
        }

        return `${zone.label} er ${ZONE_STATUS_LABELS[status] || 'uavklart'} basert på relevante relasjoner.`;
    }

    function analyzeSamspillZone(zone, lineup, options) {
        const expectedPairs = zone.pairs || [];
        const relations = expectedPairs
            .map(([posA, posB]) => resolveZonePair(lineup, posA, posB, options))
            .filter(Boolean);
        const status = resolveZoneStatus(relations, expectedPairs.length);

        return {
            id: zone.id,
            label: zone.label,
            status,
            statusLabel: ZONE_STATUS_LABELS[status] || 'Usikker',
            explanation: buildZoneExplanation(zone, status, relations),
            relations,
            isEmpty: relations.length === 0
        };
    }

    window.buildSamspillZoneAnalysis = function(lineup, options) {
        if (!lineup || typeof lineup !== 'object') {
            return { rows: [], corridors: [], isEmpty: true };
        }

        const rows = SAMSPILL_ZONE_DEFINITIONS.rows.map(zone => analyzeSamspillZone(zone, lineup, options || {}));
        const corridors = SAMSPILL_ZONE_DEFINITIONS.corridors.map(zone => analyzeSamspillZone(zone, lineup, options || {}));
        const isEmpty = rows.every(zone => zone.isEmpty) && corridors.every(zone => zone.isEmpty);

        return { rows, corridors, isEmpty };
    };
})();
