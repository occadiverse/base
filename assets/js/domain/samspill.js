(function() {
    const POSITION_PAIR_RELEVANCE = {
        'VB|VK': 1.0, 'HB|HK': 1.0,
        'HMS|VMS': 1.0,
        'MS|VMS': 1.0, 'HMS|MS': 1.0,
        'VB|VMS': 0.95, 'HB|HMS': 0.95,
        'DM|VMS': 0.95, 'DM|HMS': 0.95,
        'DM|OM': 1.0, 'DM|PM': 1.0,
        'OM|SP': 1.0, 'PM|SP': 1.0,
        'SP|VK': 1.0, 'HK|SP': 1.0,
        'OM|VK': 0.95, 'HK|PM': 0.95,
        'OM|PM': 0.9,
        'OM|VB': 0.9, 'HB|PM': 0.9,
        'DM|VB': 0.85, 'DM|HB': 0.95,
        'OM|VMS': 0.95, 'HMS|PM': 0.75,
        'DM|VK': 0.7, 'DM|HK': 0.7,
        'GK|VMS': 0.7, 'GK|HMS': 0.7, 'GK|MS': 0.7,
        'DM|GK': 0.55,
        'GK|SP': 0.3,
        'PM|SP2': 1.0, 'SP|SP2': 1.0, 'DM|SP2': 1.0, 'HK|SP2': 1.0,
        'HK|VK': 0.3,
        'HB|VK': 0.35, 'HK|VB': 0.35, 'HB|VB': 0.5,
        'GK|VK': 0.35, 'GK|HK': 0.35,
        'GK|OM': 0.4, 'GK|PM': 0.4,
        'SP|VMS': 0.45, 'HMS|SP': 0.45,
        'PM|VK': 0.65, 'HK|OM': 0.65
    };

    const DEFAULT_POSITION_RELEVANCE = 0.65;
    const MIN_RELEVANCE_TO_DRAW = 0.45;
    const TACTICAL_SAMSPILL_CONNECTIONS = {
        fase1: [
            ['VMS', 'GK'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB'], ['VMS', 'OM'], ['HMS', 'DM'],
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
            // SP → kant, midtbanespillere
            ['SP', 'VK'], ['SP', 'DM'], ['SP', 'OM']
        ],
        '4-3-3': [
            // Keeper → hele forsvarsfiresome
            ['GK', 'VB'], ['GK', 'VMS'], ['GK', 'HMS'], ['GK', 'HB'],
            // Back four
            ['VB', 'VMS'], ['VMS', 'HMS'], ['HMS', 'HB'],
            // Bekker → nærmeste midtbane (ikke direkte til kant/DM)
            ['VB', 'OM'],
            ['HB', 'PM'],
            // Stoppere → nærmeste midtbane + sittende
            ['VMS', 'OM'], ['VMS', 'DM'],
            ['HMS', 'DM'], ['HMS', 'PM'],
            // Flat midtbanetreer via sittende (ikke OM–PM rett over DM)
            ['OM', 'DM'], ['DM', 'PM'],
            // Midtbane → angrep
            ['OM', 'VK'], ['OM', 'SP'],
            ['DM', 'SP'],
            ['PM', 'HK'], ['PM', 'SP'],
            // Front three
            ['VK', 'SP'], ['SP', 'HK']
        ],
        '4-2-3-1': [
            // Keeper → hele forsvarsfiresome
            ['GK', 'VB'], ['GK', 'VMS'], ['GK', 'HMS'], ['GK', 'HB'],
            // Back four
            ['VB', 'VMS'], ['VMS', 'HMS'], ['HMS', 'HB'],
            // Bekker → nærmeste sittende midtbane
            ['VB', 'OM'],
            ['HB', 'DM'],
            // Stoppere → dobbel pivot
            ['VMS', 'OM'], ['VMS', 'DM'],
            ['HMS', 'OM'], ['HMS', 'DM'],
            // Dobbel pivot
            ['OM', 'DM'],
            // Pivot → nærmeste kant + 10er
            ['OM', 'VK'], ['OM', 'PM'],
            ['DM', 'HK'], ['DM', 'PM'],
            // Offensiv treer (ikke VK–HK rett over PM)
            ['VK', 'PM'], ['PM', 'HK'],
            // Mot spiss
            ['PM', 'SP'], ['VK', 'SP'], ['HK', 'SP']
        ],
        '4-5-1': [
            // Keeper → hele forsvarsfiresome
            ['GK', 'VB'], ['GK', 'VMS'], ['GK', 'HMS'], ['GK', 'HB'],
            // Back four
            ['VB', 'VMS'], ['VMS', 'HMS'], ['HMS', 'HB'],
            // Bekker → nærmeste kant og midtbane
            ['VB', 'VK'], ['VB', 'OM'],
            ['HB', 'HK'], ['HB', 'PM'],
            // Stoppere → nærmeste midtbane + sittende
            ['VMS', 'OM'], ['VMS', 'DM'],
            ['HMS', 'DM'], ['HMS', 'PM'],
            // Flat midtbanefemmer (kun nabopar, ikke over DM)
            ['VK', 'OM'], ['OM', 'DM'], ['DM', 'PM'], ['PM', 'HK'],
            // Mot spiss
            ['OM', 'SP'], ['DM', 'SP'], ['PM', 'SP'],
            ['VK', 'SP'], ['HK', 'SP']
        ],
        '3-4-1-2': [
            ['GK', 'VMS'], ['GK', 'MS'], ['GK', 'HMS'],
            ['VMS', 'MS'], ['MS', 'HMS'],
            ['VMS', 'VK'], ['HMS', 'HK'],
            ['VMS', 'OM'], ['MS', 'OM'], ['MS', 'DM'], ['HMS', 'DM'],
            ['VK', 'OM'], ['HK', 'DM'],
            ['OM', 'DM'],
            ['OM', 'PM'], ['DM', 'PM'],
            ['PM', 'SP'], ['PM', 'SP2'],
            ['OM', 'SP'], ['DM', 'SP2'],
            ['VK', 'SP'], ['HK', 'SP2'],
            ['SP', 'SP2']
        ]
    };

    window.getMatchGamePlanSamspillConnections = function(formationId) {
        const id = formationId || '4-2-4';
        const raw = MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS[id]
            ? MATCH_GAME_PLAN_SAMSPILL_CONNECTIONS[id]
            : window.getTacticalSamspillConnections(
                typeof window.getActiveTacticalSamspillPhase === 'function'
                    ? window.getActiveTacticalSamspillPhase()
                    : undefined
            );
        const seen = new Set();
        return (raw || []).filter(([posA, posB]) => {
            if (!posA || !posB || posA === posB) return false;
            const key = pairKey(posA, posB);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
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

    function pairLimitedScore(a, b) {
        const left = Number(a) || 0;
        const right = Number(b) || 0;
        const minV = Math.min(left, right);
        const avgV = (left + right) / 2;
        return minV * 0.75 + avgV * 0.25;
    }

    function normalizeKampbidrag(value) {
        const v = Number(value) || 0;
        if (v <= 0) return 0;
        return Math.max(0, Math.min(100, ((v - 5) / 25) * 100));
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

    function clampScore(value) {
        return Math.max(0, Math.min(100, Number(value) || 0));
    }

    function getPlayerMatchLineupPosition(match, playerObj) {
        if (!match || !playerObj) return null;
        const lineup = (match.lineupRefs && typeof match.lineupRefs === 'object'
            && Object.values(match.lineupRefs).some(Boolean))
            ? match.lineupRefs
            : match.lineup;
        if (!lineup || typeof lineup !== 'object') return null;
        const entry = Object.entries(lineup).find(([, ref]) => {
            if (!ref) return false;
            if (typeof window.playerRefMatches === 'function') {
                return window.playerRefMatches(ref, playerObj);
            }
            const name = typeof ref === 'string' ? ref : ref.navn;
            return name && name === playerObj.navn;
        });
        return entry ? entry[0] : null;
    }

    function wereAdjacentInMatch(match, posA, posB) {
        if (!posA || !posB || posA === posB) return false;
        const formation = String(match?.formation || match?.lineupFormation || '').trim();
        if (formation && typeof window.hasMatchGamePlanSamspillConnections === 'function'
            && window.hasMatchGamePlanSamspillConnections(formation)
            && typeof window.getMatchGamePlanSamspillConnections === 'function') {
            const connections = window.getMatchGamePlanSamspillConnections(formation) || [];
            return connections.some(([left, right]) => (
                (left === posA && right === posB) || (left === posB && right === posA)
            ));
        }
        return window.getPositionPairRelevance(posA, posB) >= 0.9;
    }

    function buildPairPlayLabel(play) {
        if (!play || play.pitchCount <= 0) {
            return 'lite felles kamper på banen';
        }
        const kampLabel = play.pitchCount === 1 ? 'kamp på banen' : 'kamper på banen';
        const bits = [`${play.pitchCount} ${kampLabel}`];
        if (play.adjacentCount >= 2) {
            bits.push(`${play.adjacentCount} som nabopar`);
        } else if (play.xiCount >= 2) {
            bits.push(`${play.xiCount} i samme 11er`);
        }
        return bits.join(', ');
    }

    window.getDuoPairPlayHistory = function(playerA, playerB, options) {
        const opts = options || {};
        const filterLag = opts.teamName || null;
        const historicalOnly = opts.historicalOnly !== false;
        const playerObjA = resolvePlayer(playerA);
        const playerObjB = resolvePlayer(playerB);
        const empty = {
            troppCount: 0,
            pitchCount: 0,
            xiCount: 0,
            adjacentCount: 0,
            ratingCount: 0,
            ratingAvg: 0,
            dataConfidence: 'none'
        };
        if (!playerObjA || !playerObjB) return empty;

        const cache = typeof window.getDerivedStatsCache === 'function'
            ? window.getDerivedStatsCache('duoPairPlay')
            : null;
        const cacheKey = [
            playerObjA.id || playerObjA.navn,
            playerObjB.id || playerObjB.navn
        ].sort().join('|') + `|${filterLag || ''}|${historicalOnly ? 1 : 0}`;
        if (cache?.has(cacheKey)) return cache.get(cacheKey);

        const matches = (window.activeMatches || []).filter((match) => {
            if (filterLag && match.matchGroup !== filterLag) return false;
            if (historicalOnly && typeof window.isHistoricalActivity === 'function'
                && !window.isHistoricalActivity(match)) return false;
            if (!match.attendance) return false;
            return window.isPlayerAttending(match.attendance, playerObjA)
                && window.isPlayerAttending(match.attendance, playerObjB);
        }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let troppCount = 0;
        let pitchCount = 0;
        let xiCount = 0;
        let adjacentCount = 0;
        let ratingCount = 0;
        let ratingSum = 0;

        matches.forEach((match) => {
            troppCount += 1;
            const onPitchA = typeof window.isPlayerOnPitch === 'function'
                ? window.isPlayerOnPitch(match, playerObjA)
                : true;
            const onPitchB = typeof window.isPlayerOnPitch === 'function'
                ? window.isPlayerOnPitch(match, playerObjB)
                : true;
            if (onPitchA && onPitchB) pitchCount += 1;

            const xiA = typeof window.isPlayerInMatchStartingXi === 'function'
                && window.isPlayerInMatchStartingXi(match, playerObjA);
            const xiB = typeof window.isPlayerInMatchStartingXi === 'function'
                && window.isPlayerInMatchStartingXi(match, playerObjB);
            if (xiA && xiB) xiCount += 1;

            const posA = getPlayerMatchLineupPosition(match, playerObjA);
            const posB = getPlayerMatchLineupPosition(match, playerObjB);
            if (wereAdjacentInMatch(match, posA, posB)) adjacentCount += 1;

            const ratingA = Number(window.getPlayerRefMapValue(match.ratings, playerObjA, 0)) || 0;
            const ratingB = Number(window.getPlayerRefMapValue(match.ratings, playerObjB, 0)) || 0;
            if (ratingA > 0 && ratingB > 0) {
                ratingCount += 1;
                ratingSum += (ratingA + ratingB) / 2;
            }
        });

        let dataConfidence = 'none';
        if (pitchCount >= 6 || xiCount >= 4 || adjacentCount >= 3) dataConfidence = 'high';
        else if (pitchCount >= 3 || xiCount >= 2 || adjacentCount >= 1) dataConfidence = 'medium';
        else if (pitchCount >= 1 || troppCount >= 1) dataConfidence = 'low';

        const result = {
            troppCount,
            pitchCount,
            xiCount,
            adjacentCount,
            ratingCount,
            ratingAvg: ratingCount > 0 ? ratingSum / ratingCount : 0,
            dataConfidence
        };
        if (cache) cache.set(cacheKey, result);
        return result;
    };

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

    function resolveSamspillStatus(score, play, formA, formB, teamName) {
        const confidence = play?.dataConfidence || 'none';
        const lowHistory = confidence === 'none' || confidence === 'low';
        const pairLabel = buildPairPlayLabel(play);
        const formToneA = typeof window.getFormScoreTone === 'function'
            ? window.getFormScoreTone(formA, teamName)
            : 'none';
        const formToneB = typeof window.getFormScoreTone === 'function'
            ? window.getFormScoreTone(formB, teamName)
            : 'none';
        const eitherRed = formToneA === 'red' || formToneB === 'red';
        const formFloor = Math.min(Number(formA) || 0, Number(formB) || 0);
        const adjacentCount = Number(play?.adjacentCount) || 0;
        const xiCount = Number(play?.xiCount) || 0;
        const pitchCount = Number(play?.pitchCount) || 0;
        const provenPair = adjacentCount >= 3 || (adjacentCount >= 2 && xiCount >= 8);

        if (lowHistory) {
            if (formFloor >= 50 && !eitherRed) {
                return {
                    status: 'potential',
                    reason: `Potensial (${score}/100): god form, men ${pairLabel}`
                };
            }
            return {
                status: 'unknown',
                reason: `Usikkert (${score}/100): ${pairLabel}`
            };
        }

        if (score >= 62 && pitchCount >= 4 && provenPair && !eitherRed) {
            return {
                status: 'strong',
                reason: `Sterkt samspill (${score}/100): ${pairLabel}`
            };
        }
        if (score >= 62 && pitchCount >= 4 && provenPair && eitherRed) {
            return {
                status: 'ok',
                reason: `Ok samspill (${score}/100): ${pairLabel}, men svak form nå`
            };
        }
        if (score >= 48) {
            return {
                status: 'ok',
                reason: `Ok samspill (${score}/100): ${pairLabel}`
            };
        }
        return {
            status: 'weak',
            reason: `Svakt samspill (${score}/100): ${pairLabel}`
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
        const play = window.getDuoPairPlayHistory(playerObjA, playerObjB, opts);
        const confidence = play.dataConfidence || 'none';

        const formA = typeof window.calculatePlayerPerformanceChemistry === 'function'
            ? window.calculatePlayerPerformanceChemistry(playerObjA.navn)
            : 0;
        const formB = typeof window.calculatePlayerPerformanceChemistry === 'function'
            ? window.calculatePlayerPerformanceChemistry(playerObjB.navn)
            : 0;

        const togetherScore = clampScore((play.pitchCount / 8) * 100);
        const pairingScore = clampScore((play.adjacentCount / 4) * 60 + (play.xiCount / 8) * 40);
        const togetherQuality = play.ratingCount > 0
            ? clampScore(40 + (play.ratingAvg - 5) * 30)
            : 50;
        const formScore = pairLimitedScore(formA, formB);
        const dataTrustScore = confidenceToTrustScore(confidence);

        const score = Math.round(clampScore(
            togetherScore * 0.30 +
            pairingScore * 0.40 +
            togetherQuality * 0.20 +
            formScore * 0.10
        ));

        const statusResult = resolveSamspillStatus(score, play, formA, formB, teamName);

        return {
            score,
            status: statusResult.status,
            confidence,
            reason: statusResult.reason,
            shouldDraw: positionalRelevance >= MIN_RELEVANCE_TO_DRAW,
            positionalRelevance,
            sharedCount: play.troppCount,
            matchCount: play.pitchCount,
            components: {
                formA,
                formB,
                formScore: Math.round(formScore),
                togetherScore: Math.round(togetherScore),
                pairingScore: Math.round(pairingScore),
                togetherQuality: Math.round(togetherQuality),
                pitchCount: play.pitchCount,
                xiCount: play.xiCount,
                adjacentCount: play.adjacentCount,
                ratingAvg: play.ratingCount > 0 ? Math.round(play.ratingAvg * 10) / 10 : null,
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
        const legacy = `${posA}|${posB}`;
        const legacyRev = `${posB}|${posA}`;
        if (Object.prototype.hasOwnProperty.call(POSITION_PAIR_RELEVANCE, legacy)) {
            return POSITION_PAIR_RELEVANCE[legacy];
        }
        if (Object.prototype.hasOwnProperty.call(POSITION_PAIR_RELEVANCE, legacyRev)) {
            return POSITION_PAIR_RELEVANCE[legacyRev];
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
        let strokeWidth = isMatchPlan ? 2.4 : (focused ? 2.8 : 2.6);
        let strokeDasharray = null;
        let opacity = 1;

        switch (status) {
            case 'strong':
                strokeColor = '#22c55e';
                strokeWidth = isMatchPlan ? 3.6 : (focused ? 3.8 : 3.4);
                break;
            case 'ok':
                strokeColor = '#facc15';
                strokeWidth = isMatchPlan ? 3.2 : (focused ? 3.4 : 3);
                break;
            case 'potential':
                strokeColor = '#4f46e5';
                strokeWidth = isMatchPlan ? 3.1 : (focused ? 3.2 : 2.9);
                strokeDasharray = '5 4';
                break;
            case 'weak':
                strokeColor = '#ef4444';
                strokeWidth = isMatchPlan ? 3.2 : (focused ? 3.4 : 3);
                break;
            case 'unknown':
            default:
                strokeColor = 'rgba(71, 85, 105, 0.72)';
                strokeWidth = isMatchPlan ? 2.6 : (focused ? 2.8 : 2.6);
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

    window.getSamspillScoreLabelPositions = function(coordList, options) {
        const overlapDistance = Number(options?.minDistance) > 0 ? Number(options.minDistance) : 3;
        const offset = Number(options?.offset) > 0 ? Number(options.offset) : 3.2;
        const entries = (coordList || []).map(coords => {
            const x1 = Number(coords?.x1) || 0;
            const y1 = Number(coords?.y1) || 0;
            const x2 = Number(coords?.x2) || 0;
            const y2 = Number(coords?.y2) || 0;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.hypot(dx, dy) || 1;
            return {
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2,
                x1,
                y1,
                dx,
                dy,
                length,
                dirX: dx / length,
                dirY: dy / length
            };
        });

        const clampToSegment = (entry) => {
            const fromStartX = entry.x - entry.x1;
            const fromStartY = entry.y - entry.y1;
            const t = Math.max(0.34, Math.min(0.66, (
                (fromStartX * entry.dx + fromStartY * entry.dy) / (entry.length * entry.length)
            )));
            entry.x = entry.x1 + entry.dx * t;
            entry.y = entry.y1 + entry.dy * t;
        };

        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const left = entries[i];
                const right = entries[j];
                const dist = Math.hypot(right.x - left.x, right.y - left.y);
                if (dist >= overlapDistance) continue;

                const parallel = Math.abs(left.dirX * right.dirX + left.dirY * right.dirY) > 0.85;
                if (parallel) {
                    const perpX = -left.dirY;
                    const perpY = left.dirX;
                    left.x -= perpX * offset;
                    left.y -= perpY * offset;
                    right.x += perpX * offset;
                    right.y += perpY * offset;
                    clampToSegment(left);
                    clampToSegment(right);
                } else {
                    left.x -= offset;
                    right.x += offset;
                }
            }
        }

        return entries.map(entry => ({ x: entry.x, y: entry.y }));
    };

    function getMatchPlanSamspillLabelMetrics(label, pitchWidthPx, cardWidthPx) {
        const safePitchWidth = pitchWidthPx > 0 ? pitchWidthPx : 400;
        const safeCardWidth = cardWidthPx > 0 ? cardWidthPx : safePitchWidth * 0.165;
        const fontPx = Math.min(15.2, Math.max(9.5, safeCardWidth * 0.33));
        const fontVb = (fontPx / safePitchWidth) * 100;
        const padVb = fontVb * 0.26;
        const widthVb = Math.max(fontVb * 1.55, label.length * fontVb * 0.58 + padVb * 2);
        const heightVb = fontVb * 1.12;

        return {
            fontVb,
            widthVb,
            heightVb,
            radiusVb: heightVb / 2
        };
    }

    function appendSamspillLineScoreLabel(group, coords, score, unit, status, isMatchPlan, pitchWidthPx, cardWidthPx, labelPos) {
        const midX = labelPos?.x ?? ((coords.x1 + coords.x2) / 2);
        const midY = labelPos?.y ?? ((coords.y1 + coords.y2) / 2);
        const label = score > 0 ? String(score) : '–';
        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        labelGroup.setAttribute('class', `samspill-line-label is-tone-${status}${isMatchPlan ? ' is-match-plan' : ''}`);
        labelGroup.setAttribute('pointer-events', 'none');
        labelGroup.setAttribute('transform', `translate(${midX}${unit}, ${midY}${unit})`);

        const metrics = isMatchPlan
            ? getMatchPlanSamspillLabelMetrics(label, pitchWidthPx, cardWidthPx)
            : {
                fontVb: null,
                widthVb: Math.max(20, label.length * 4.8 + 8),
                heightVb: 11,
                radiusVb: 5.5
            };

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(-metrics.widthVb / 2));
        rect.setAttribute('y', String(-metrics.heightVb / 2));
        rect.setAttribute('width', String(metrics.widthVb));
        rect.setAttribute('height', String(metrics.heightVb));
        rect.setAttribute('rx', String(metrics.radiusVb));
        rect.setAttribute('class', 'samspill-line-label-bg');
        if (isMatchPlan) rect.setAttribute('vector-effect', 'non-scaling-stroke');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'samspill-line-label-text');
        if (isMatchPlan && metrics.fontVb) {
            text.setAttribute('font-size', String(metrics.fontVb));
        }
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
            appendSamspillLineScoreLabel(
                group,
                coords,
                score,
                unit,
                status,
                isMatchPlan,
                opts.pitchWidthPx,
                opts.cardWidthPx,
                opts.labelX != null && opts.labelY != null ? { x: opts.labelX, y: opts.labelY } : null
            );
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

    const SAMSPILL_ZONE_DEFINITIONS_BY_FORMATION = {
        '4-2-4': {
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
                    pairs: [['VK', 'SP'], ['SP', 'PM'], ['PM', 'HK']]
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
        },
        '4-3-3': {
            rows: [
                {
                    id: 'forsvar',
                    label: 'Forsvar',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB']]
                },
                {
                    id: 'midtbane',
                    label: 'Midtbane',
                    pairs: [['OM', 'DM'], ['DM', 'PM']]
                },
                {
                    id: 'angrep',
                    label: 'Angrep',
                    pairs: [['VK', 'SP'], ['SP', 'HK'], ['OM', 'SP'], ['PM', 'SP']]
                }
            ],
            corridors: [
                {
                    id: 'venstre',
                    label: 'Venstre',
                    pairs: [['VMS', 'VB'], ['VB', 'OM'], ['OM', 'VK']]
                },
                {
                    id: 'sentral',
                    label: 'Sentral',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'DM'], ['HMS', 'DM'], ['DM', 'SP'], ['OM', 'SP'], ['PM', 'SP']]
                },
                {
                    id: 'hoyre',
                    label: 'Høyre',
                    pairs: [['HMS', 'HB'], ['HB', 'PM'], ['PM', 'HK']]
                }
            ]
        },
        '4-2-3-1': {
            rows: [
                {
                    id: 'forsvar',
                    label: 'Forsvar',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB']]
                },
                {
                    id: 'midtbane',
                    label: 'Midtbane',
                    pairs: [['OM', 'DM'], ['OM', 'PM'], ['DM', 'PM']]
                },
                {
                    id: 'angrep',
                    label: 'Angrep',
                    pairs: [['VK', 'PM'], ['PM', 'HK'], ['PM', 'SP'], ['VK', 'SP'], ['HK', 'SP']]
                }
            ],
            corridors: [
                {
                    id: 'venstre',
                    label: 'Venstre',
                    pairs: [['VMS', 'VB'], ['VB', 'OM'], ['OM', 'VK']]
                },
                {
                    id: 'sentral',
                    label: 'Sentral',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['OM', 'DM'], ['OM', 'PM'], ['DM', 'PM'], ['PM', 'SP']]
                },
                {
                    id: 'hoyre',
                    label: 'Høyre',
                    pairs: [['HMS', 'HB'], ['HB', 'DM'], ['DM', 'HK']]
                }
            ]
        },
        '4-5-1': {
            rows: [
                {
                    id: 'forsvar',
                    label: 'Forsvar',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB']]
                },
                {
                    id: 'midtbane',
                    label: 'Midtbane',
                    pairs: [['VK', 'OM'], ['OM', 'DM'], ['DM', 'PM'], ['PM', 'HK']]
                },
                {
                    id: 'angrep',
                    label: 'Angrep',
                    pairs: [['OM', 'SP'], ['DM', 'SP'], ['PM', 'SP'], ['VK', 'SP'], ['HK', 'SP']]
                }
            ],
            corridors: [
                {
                    id: 'venstre',
                    label: 'Venstre',
                    pairs: [['VMS', 'VB'], ['VB', 'VK'], ['VB', 'OM'], ['VK', 'OM']]
                },
                {
                    id: 'sentral',
                    label: 'Sentral',
                    pairs: [['GK', 'VMS'], ['GK', 'HMS'], ['VMS', 'HMS'], ['VMS', 'DM'], ['HMS', 'DM'], ['OM', 'DM'], ['DM', 'PM'], ['DM', 'SP']]
                },
                {
                    id: 'hoyre',
                    label: 'Høyre',
                    pairs: [['HMS', 'HB'], ['HB', 'HK'], ['HB', 'PM'], ['PM', 'HK']]
                }
            ]
        },
        '3-4-1-2': {
            rows: [
                {
                    id: 'forsvar',
                    label: 'Forsvar',
                    pairs: [['GK', 'VMS'], ['GK', 'MS'], ['GK', 'HMS'], ['VMS', 'MS'], ['MS', 'HMS']]
                },
                {
                    id: 'midtbane',
                    label: 'Midtbane',
                    pairs: [['VK', 'OM'], ['OM', 'DM'], ['DM', 'HK'], ['OM', 'PM'], ['DM', 'PM']]
                },
                {
                    id: 'angrep',
                    label: 'Angrep',
                    pairs: [['PM', 'SP'], ['PM', 'SP2'], ['SP', 'SP2'], ['VK', 'SP'], ['HK', 'SP2'], ['DM', 'SP2']]
                }
            ],
            corridors: [
                {
                    id: 'venstre',
                    label: 'Venstre',
                    pairs: [['VMS', 'VK'], ['VK', 'OM'], ['VK', 'SP'], ['OM', 'SP'], ['OM', 'PM']]
                },
                {
                    id: 'sentral',
                    label: 'Sentral',
                    pairs: [['GK', 'VMS'], ['GK', 'MS'], ['GK', 'HMS'], ['VMS', 'MS'], ['MS', 'HMS'], ['OM', 'DM'], ['OM', 'PM'], ['DM', 'PM'], ['PM', 'SP'], ['PM', 'SP2']]
                },
                {
                    id: 'hoyre',
                    label: 'Høyre',
                    pairs: [['HMS', 'HK'], ['HK', 'DM'], ['HK', 'SP2'], ['DM', 'SP2'], ['DM', 'PM']]
                }
            ]
        }
    };

    const SAMSPILL_ZONE_DEFINITIONS = SAMSPILL_ZONE_DEFINITIONS_BY_FORMATION['4-2-4'];

    function getSamspillZoneDefinitions(formationId) {
        return SAMSPILL_ZONE_DEFINITIONS_BY_FORMATION[formationId] || SAMSPILL_ZONE_DEFINITIONS;
    }

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

        const opts = options || {};
        const zones = getSamspillZoneDefinitions(opts.formationId);
        const rows = zones.rows.map(zone => analyzeSamspillZone(zone, lineup, opts));
        const corridors = zones.corridors.map(zone => analyzeSamspillZone(zone, lineup, opts));
        const isEmpty = rows.every(zone => zone.isEmpty) && corridors.every(zone => zone.isEmpty);

        return { rows, corridors, isEmpty };
    };

    function playerLastName(player) {
        const parts = String(player?.navn || '').trim().split(/\s+/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : 'Spiller';
    }

    function pairDisplayName(pair) {
        return `${playerLastName(pair.playerA)}–${playerLastName(pair.playerB)}`;
    }

    function pairLineGroup(pair) {
        const defence = new Set(['GK', 'VB', 'VMS', 'MS', 'HMS', 'HB']);
        const midfield = new Set(['OM', 'DM', 'PM']);
        const attack = new Set(['VK', 'HK', 'SP', 'SP2']);
        const bothDefence = defence.has(pair.posA) && defence.has(pair.posB);
        const bothMid = midfield.has(pair.posA) && midfield.has(pair.posB);
        const involvesAttack = attack.has(pair.posA) || attack.has(pair.posB);
        if (bothDefence) return 'forsvar';
        if (bothMid) return 'midtbane';
        if (involvesAttack && !defence.has(pair.posA) && !defence.has(pair.posB)) return 'angrep';
        return 'other';
    }

    function isLowHistoryPair(pair) {
        return pair.confidence === 'none'
            || pair.confidence === 'low'
            || (Number(pair.pitchCount) || 0) < 3;
    }

    function scoreTone(score) {
        if (score == null) return 'unknown';
        if (score >= 62) return 'strong';
        if (score >= 48) return 'ok';
        return 'weak';
    }

    function averagePairScore(pairs) {
        if (!pairs.length) return null;
        return Math.round(pairs.reduce((sum, pair) => sum + (Number(pair.score) || 0), 0) / pairs.length);
    }

    function pairInLine(pair, positions) {
        if (!pair || !Array.isArray(positions) || !positions.length) return false;
        return positions.includes(pair.posA) && positions.includes(pair.posB);
    }

    window.buildSamspillLineTotals = function(pairs, lineZones) {
        const zones = lineZones || {};
        const allPairs = pairs || [];
        const lines = [
            { id: 'lag', label: 'Lag', score: averagePairScore(allPairs) },
            { id: 'forsvar', label: 'Forsvar', score: averagePairScore(allPairs.filter((pair) => pairInLine(pair, zones.forsvar))) },
            { id: 'midtbane', label: 'Midtbane', score: averagePairScore(allPairs.filter((pair) => pairInLine(pair, zones.midtbane))) },
            { id: 'angrep', label: 'Angrep', score: averagePairScore(allPairs.filter((pair) => pairInLine(pair, zones.angrep))) }
        ].map((line) => ({ ...line, tone: scoreTone(line.score) }));

        return { lines, teamScore: lines[0].score };
    };

    window.collectSamspillLineupPairs = function(lineup, options) {
        const opts = options || {};
        const formationId = opts.formationId;
        const connections = typeof window.getMatchGamePlanSamspillConnections === 'function'
            ? window.getMatchGamePlanSamspillConnections(formationId)
            : [];
        const zonePositions = Array.isArray(opts.zonePositions) ? new Set(opts.zonePositions) : null;

        return connections.map(([posA, posB]) => {
            if (zonePositions && (!zonePositions.has(posA) || !zonePositions.has(posB))) return null;
            const playerA = lineup?.[posA];
            const playerB = lineup?.[posB];
            if (!playerA || !playerB) return null;
            const samspill = typeof window.getDuoSamspill === 'function'
                ? window.getDuoSamspill(playerA, playerB, { ...opts, posA, posB })
                : null;
            if (!samspill) return null;
            return {
                posA,
                posB,
                playerA,
                playerB,
                status: samspill.status || 'unknown',
                score: Number(samspill.score) || 0,
                confidence: samspill.confidence || samspill.dataConfidence || 'none',
                pitchCount: Number(samspill.components?.pitchCount || samspill.matchCount) || 0,
                adjacentCount: Number(samspill.components?.adjacentCount) || 0,
                xiCount: Number(samspill.components?.xiCount) || 0
            };
        }).filter(Boolean);
    };

    window.buildSamspillBriefing = function(lineup, options) {
        const opts = options || {};
        const pairs = window.collectSamspillLineupPairs(lineup, opts);
        const totals = window.buildSamspillLineTotals(pairs, opts.lineZones);
        if (!pairs.length) {
            return { isEmpty: true, items: [], totals };
        }

        const items = [];
        const usedKeys = new Set();
        const pairKeyOf = (pair) => [pair.playerA?.navn || pair.posA, pair.playerB?.navn || pair.posB].sort().join('|');

        const newPairs = pairs.filter(isLowHistoryPair);
        const newCountByPlayer = {};
        newPairs.forEach((pair) => {
            const nameA = pair.playerA?.navn;
            const nameB = pair.playerB?.navn;
            if (nameA) newCountByPlayer[nameA] = (newCountByPlayer[nameA] || 0) + 1;
            if (nameB) newCountByPlayer[nameB] = (newCountByPlayer[nameB] || 0) + 1;
        });
        const hubEntry = Object.entries(newCountByPlayer).sort((a, b) => b[1] - a[1])[0];
        if (hubEntry && hubEntry[1] >= 2) {
            const hubName = hubEntry[0];
            const hubPairs = newPairs.filter((pair) => (
                pair.playerA?.navn === hubName || pair.playerB?.navn === hubName
            ));
            const hubPlayer = hubPairs[0].playerA?.navn === hubName ? hubPairs[0].playerA : hubPairs[0].playerB;
            const hubPos = hubPairs[0].playerA?.navn === hubName ? hubPairs[0].posA : hubPairs[0].posB;
            const minPitch = Math.min(...hubPairs.map((pair) => pair.pitchCount));
            const kampLabel = minPitch === 1 ? 'kamp' : 'kamper';
            const against = hubPos === 'GK' ? 'stopperne' : hubPairs
                .map((pair) => playerLastName(pair.playerA?.navn === hubName ? pair.playerB : pair.playerA))
                .slice(0, 3)
                .join(', ');
            items.push({
                id: 'new',
                tone: 'unknown',
                prefix: 'Nye / lite data',
                text: `${playerLastName(hubPlayer)} mot ${against} — ${minPitch} ${kampLabel} sammen`
            });
            hubPairs.forEach((pair) => usedKeys.add(pairKeyOf(pair)));
        } else {
            newPairs.slice(0, 2).forEach((pair) => {
                usedKeys.add(pairKeyOf(pair));
                const kampLabel = pair.pitchCount === 1 ? 'kamp' : 'kamper';
                items.push({
                    id: `new-${pairKeyOf(pair)}`,
                    tone: 'unknown',
                    prefix: 'Nye / lite data',
                    text: `${pairDisplayName(pair)} — ${pair.pitchCount} ${kampLabel} sammen`
                });
            });
        }

        const established = pairs
            .filter((pair) => pair.status === 'strong' && !isLowHistoryPair(pair))
            .sort((a, b) => b.score - a.score);
        const establishedPicks = [];
        ['forsvar', 'midtbane', 'angrep'].forEach((line) => {
            const pick = established.find((pair) => (
                pairLineGroup(pair) === line && !usedKeys.has(pairKeyOf(pair))
            ));
            if (pick) establishedPicks.push(pick);
        });
        established.forEach((pair) => {
            if (establishedPicks.length >= 3) return;
            if (usedKeys.has(pairKeyOf(pair))) return;
            if (establishedPicks.includes(pair)) return;
            establishedPicks.push(pair);
        });
        if (establishedPicks.length) {
            establishedPicks.forEach((pair) => usedKeys.add(pairKeyOf(pair)));
            items.unshift({
                id: 'established',
                tone: 'strong',
                prefix: 'Etablerte par',
                text: establishedPicks.map(pairDisplayName).join(', ')
            });
        }

        const unproven = pairs
            .filter((pair) => pair.status === 'ok' && !isLowHistoryPair(pair) && !usedKeys.has(pairKeyOf(pair)))
            .sort((a, b) => {
                const lineA = pairLineGroup(a) === 'other' ? 1 : 0;
                const lineB = pairLineGroup(b) === 'other' ? 1 : 0;
                if (lineA !== lineB) return lineA - lineB;
                if (a.adjacentCount !== b.adjacentCount) return a.adjacentCount - b.adjacentCount;
                return a.score - b.score;
            })
            .slice(0, 2);
        if (unproven.length) {
            items.push({
                id: 'unproven',
                tone: 'ok',
                prefix: 'Ikke etablert ennå',
                text: unproven.map(pairDisplayName).join(', ')
            });
        }

        if (!items.length) {
            return { isEmpty: true, items: [] };
        }

        const order = { established: 0, new: 1, unproven: 2 };
        items.sort((a, b) => {
            const groupA = a.id.startsWith('new') ? 'new' : a.id;
            const groupB = b.id.startsWith('new') ? 'new' : b.id;
            return (order[groupA] ?? 9) - (order[groupB] ?? 9);
        });

        return { isEmpty: false, items: items.slice(0, 4), totals };
    };
})();
