        // ==========================================
        // ===== TAKTIKK OG KJEMI (LIVE TAVLE) =====
        // ==========================================
        function escapeTacticalHtml(value) {
            return typeof window.escapeModalHtml === 'function'
                ? window.escapeModalHtml(value)
                : String(value || '');
        }

        function escapeTacticalJsString(value) {
            return typeof window.escapeModalJsString === 'function'
                ? window.escapeModalJsString(value)
                : String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        }

        const tacticalPhases = {
            // Insets account for taller photo cards so nodes stay inside the pitch frame.
            fase1: {
                'GK': { top: '93%', left: '50%' },
                'VMS': { top: '92%', left: '34%' },
                'HMS': { top: '92%', left: '66%' },
                'VB': { top: '86%', left: '16%' },
                'HB': { top: '86%', left: '84%' },
                'DM': { top: '75%', left: '62%' },
                'OM': { top: '75%', left: '38%' },
                'PM': { top: '56%', left: '58%' },
                'VK': { top: '50%', left: '8%' },
                'HK': { top: '50%', left: '92%' },
                'SP': { top: '50%', left: '42%' }
            },
            fase2: {
                'GK': { top: '88%', left: '50%' },
                'VMS': { top: '70%', left: '35%' },
                'HMS': { top: '70%', left: '65%' },
                'VB': { top: '58%', left: '18%' },
                'HB': { top: '58%', left: '82%' },
                'DM': { top: '56%', left: '50%' },
                'OM': { top: '42%', left: '35%' },
                'PM': { top: '42%', left: '65%' },
                'VK': { top: '30%', left: '12%' },
                'HK': { top: '30%', left: '88%' },
                'SP': { top: '26%', left: '50%' }
            },
            fase3: {
                'GK': { top: '86%', left: '50%' },
                'VMS': { top: '52%', left: '33%' },
                'HMS': { top: '52%', left: '67%' },
                'VB': { top: '36%', left: '18%' },
                'HB': { top: '36%', left: '82%' },
                'DM': { top: '36%', left: '50%' },
                'OM': { top: '22%', left: '30%' },
                'PM': { top: '22%', left: '70%' },
                'VK': { top: '14%', left: '14%' },
                'HK': { top: '14%', left: '86%' },
                'SP': { top: '14%', left: '50%' }
            }
        };

        const TACTICAL_POSITIONS = ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'];
        const TACTICAL_LIVE_ROLE_SLOTS = ['K', 'K2', 'Cv', 'Ch', 'F', 'F2', 'S', 'S2'];
        const TACTICAL_LIVE_ROLE_LABELS = {
            K: 'Kaptein',
            K2: 'Visekaptein',
            Cv: 'Corner v.',
            Ch: 'Corner h.',
            F: 'Frispark',
            F2: 'Frispark 2',
            S: 'Straffe',
            S2: 'Straffe 2'
        };
        const TACTICAL_LIVE_ROLE_BADGE = {
            K: 'C',
            K2: 'C2',
            Cv: 'Cv',
            Ch: 'Ch',
            F: 'F',
            F2: 'F2',
            S: 'P',
            S2: 'P2'
        };

        window.tacticalLineupIsEditing = false;
        window.liveLineup = window.liveLineup || {};
        window.liveRoles = window.liveRoles || {};
        window.tacticalPendingSubIn = null;
        window.tacticalLiveDirty = false;
        window.tacticalAppliedLiveSubs = window.tacticalAppliedLiveSubs || [];

        function getTacticalMatchSelectValue() {
            const select = document.getElementById('tacticalMatchSelect');
            return select ? select.value : '';
        }

        function getSelectedTacticalMatch() {
            const matchId = getTacticalMatchSelectValue();
            if (!matchId) return null;
            return (window.activeMatches || []).find(m => m.id === matchId) || null;
        }

        window.isTacticalLiveMatchMode = function() {
            return Boolean(getTacticalMatchSelectValue());
        };

        function getTacticalLivePlayerRef(player) {
            if (!player) return '';
            return player.id || player.navn || '';
        }

        function getTacticalLivePlayerPhotoUrl(player) {
            return player?.photoUrl || player?.bildeUrl || player?.avatarUrl || player?.imageUrl || player?.photo || '';
        }

        function getTacticalLivePlayerLastName(player) {
            const parts = String(player?.navn || '').trim().split(/\s+/).filter(Boolean);
            return parts.length ? parts[parts.length - 1] : 'Spiller';
        }

        function getTacticalLivePosBadge(posId) {
            if (posId === 'VMS') return 'VS';
            if (posId === 'HMS') return 'HS';
            return posId;
        }

        function getTacticalLiveRoleLabel(slot) {
            return TACTICAL_LIVE_ROLE_LABELS[slot] || slot;
        }

        function syncLiveLineupToTactical() {
            window.tacticalLineup = { ...(window.liveLineup || {}) };
        }

        function matchHasSavedTacticalLineup(match) {
            if (!match) return false;
            if (match.lineupRefs && typeof match.lineupRefs === 'object' && Object.values(match.lineupRefs).some(Boolean)) return true;
            if (match.lineup && typeof match.lineup === 'object') {
                return Object.values(match.lineup).some(entry => {
                    if (!entry) return false;
                    if (typeof entry === 'string') return Boolean(entry.trim());
                    return Boolean(entry.id || entry.navn);
                });
            }
            return false;
        }

        function loadTacticalLineupFromMatch(match) {
            window.liveLineup = {};
            const savedLineup = match.lineup || {};
            const savedLineupRefs = match.lineupRefs || {};
            TACTICAL_POSITIONS.forEach(pos => {
                const refPlayer = savedLineupRefs[pos] && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(savedLineupRefs[pos])
                    : null;
                const savedPlayer = typeof savedLineup[pos] === 'string' && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(savedLineup[pos])
                    : savedLineup[pos];
                window.liveLineup[pos] = refPlayer || savedPlayer || null;
            });
            syncLiveLineupToTactical();
        }

        function loadLiveRolesFromMatch(match) {
            window.liveRoles = {};
            const plan = match && typeof match.rolePlanAssignments === 'object' && match.rolePlanAssignments
                ? match.rolePlanAssignments
                : {};

            TACTICAL_LIVE_ROLE_SLOTS.forEach(slot => {
                if (plan[slot]) window.liveRoles[slot] = plan[slot];
            });

            const hasPlanRoles = Object.values(window.liveRoles).some(Boolean);
            if (!hasPlanRoles && match?.roles) {
                if (match.roles.captain) window.liveRoles.K = match.roles.captain;
                if (match.roles.penalty) window.liveRoles.S = match.roles.penalty;
                if (match.roles.freekick) window.liveRoles.F = match.roles.freekick;
                if (match.roles.corners) window.liveRoles.Cv = match.roles.corners;
            }
        }

        function getRolesForPlayer(player) {
            if (!player) return [];
            return TACTICAL_LIVE_ROLE_SLOTS.filter(slot => {
                const ref = window.liveRoles?.[slot];
                return ref && typeof window.playerRefMatches === 'function'
                    ? window.playerRefMatches(ref, player)
                    : ref === getTacticalLivePlayerRef(player);
            });
        }

        function getSetPieceSlotsForPlayer(match, planKey, player) {
            const assignments = match && typeof match[planKey] === 'object' && match[planKey]
                ? match[planKey]
                : {};
            if (!player) return [];
            return Object.entries(assignments)
                .filter(([, value]) => {
                    if (!value) return false;
                    return typeof window.playerRefMatches === 'function'
                        ? window.playerRefMatches(value, player)
                        : value === getTacticalLivePlayerRef(player) || value === player.id || value === player.navn;
                })
                .map(([slot]) => String(slot))
                .sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b));
        }

        function getInheritancePreviewForOutPlayer(match, outPlayer) {
            return {
                roles: getRolesForPlayer(outPlayer),
                offc: getSetPieceSlotsForPlayer(match, 'offcAssignments', outPlayer),
                defc: getSetPieceSlotsForPlayer(match, 'defcAssignments', outPlayer)
            };
        }

        function buildInheritanceBadgesHtml(preview, options = {}) {
            const badges = [];
            (preview?.roles || []).forEach(slot => {
                badges.push({
                    key: `role-${slot}`,
                    label: TACTICAL_LIVE_ROLE_BADGE[slot] || slot,
                    title: getTacticalLiveRoleLabel(slot),
                    tone: 'role'
                });
            });
            (preview?.offc || []).forEach(slot => {
                badges.push({
                    key: `offc-${slot}`,
                    label: `OffC ${slot}`,
                    title: `Vis OffC ${slot} på hjørnebane`,
                    tone: 'offc',
                    planId: 'offc',
                    slot: String(slot)
                });
            });
            (preview?.defc || []).forEach(slot => {
                badges.push({
                    key: `defc-${slot}`,
                    label: `DefC ${slot}`,
                    title: `Vis DefC ${slot} på hjørnebane`,
                    tone: 'defc',
                    planId: 'defc',
                    slot: String(slot)
                });
            });
            if (!badges.length) {
                return options.emptyHtml || '';
            }
            const labelHtml = options.label
                ? `<span class="tactical-bench-inherit-label">${escapeTacticalHtml(options.label)}</span>`
                : '';
            const stateClass = options.state ? ` is-${options.state}` : '';
            return `
                <div class="tactical-bench-inherit${stateClass}">
                    ${labelHtml}
                    <div class="tactical-bench-inherit-badges">
                        ${badges.map(badge => {
                            if (badge.planId) {
                                return `<button
                                    type="button"
                                    class="bsk-btn bsk-btn-secondary tactical-bench-btn tactical-bench-setpiece-btn"
                                    data-live-setpiece="${escapeTacticalHtml(badge.planId)}"
                                    data-live-slot="${escapeTacticalHtml(badge.slot)}"
                                    title="${escapeTacticalHtml(badge.title)}"
                                ><span>${escapeTacticalHtml(badge.label)}</span></button>`;
                            }
                            return `<span class="tactical-live-card-role tactical-bench-role-chip" title="${escapeTacticalHtml(badge.title)}">${escapeTacticalHtml(badge.label)}</span>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        function findLatestAppliedLiveSubForPlayer(player, side = 'out') {
            if (!player) return null;
            const key = side === 'in' ? 'inId' : 'outId';
            const subs = window.tacticalAppliedLiveSubs || [];
            for (let i = subs.length - 1; i >= 0; i -= 1) {
                const sub = subs[i];
                const ref = sub?.[key];
                if (!ref) continue;
                const matches = typeof window.playerRefMatches === 'function'
                    ? window.playerRefMatches(ref, player)
                    : ref === getTacticalLivePlayerRef(player) || ref === player.id || ref === player.navn;
                if (matches) return sub;
            }
            return null;
        }

        function getBenchAssignmentFromMatch(match, playerRef) {
            const plan = match && typeof match.benchSubstitutionPlan === 'object' && match.benchSubstitutionPlan
                ? match.benchSubstitutionPlan
                : {};
            const assignment = plan[playerRef];
            if (!assignment) {
                // Also try matching by player identity across keys
                const player = typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(playerRef)
                    : null;
                if (player) {
                    const matched = Object.entries(plan).find(([ref]) => (
                        typeof window.playerRefMatches === 'function'
                            ? window.playerRefMatches(ref, player)
                            : ref === playerRef
                    ));
                    if (matched) {
                        const value = matched[1];
                        if (typeof value === 'string') return { minute: value, position: '' };
                        return { minute: value?.minute || '', position: value?.position || '' };
                    }
                }
                return { minute: '', position: '' };
            }
            if (typeof assignment === 'string') return { minute: assignment, position: '' };
            return {
                minute: assignment.minute || '',
                position: assignment.position || ''
            };
        }

        window.isTacticalLineupEditable = function() {
            return !getTacticalMatchSelectValue();
        };

        window.updateTacticalLineupControls = function() {
            const container = document.getElementById('tactical-lineup-controls');
            const sandboxTools = document.getElementById('tactical-sandbox-tools');
            if (!container) return;

            const matchId = getTacticalMatchSelectValue();
            if (sandboxTools) {
                sandboxTools.classList.toggle('hidden', Boolean(matchId));
            }
            if (!matchId) {
                container.classList.add('hidden');
                return;
            }

            const match = getSelectedTacticalMatch();
            if (!match) {
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            const hasSaved = matchHasSavedTacticalLineup(match);
            const statusEl = document.getElementById('tactical-lineup-status');
            const actionsEl = document.getElementById('tactical-lineup-actions');
            if (!statusEl || !actionsEl) return;

            if (hasSaved) {
                container.classList.add('hidden');
                statusEl.innerHTML = '';
                actionsEl.innerHTML = '';
                return;
            }

            statusEl.innerHTML = '<span class="tactical-lineup-status-badge is-locked"><i class="fa-solid fa-circle-info"></i> Ingen lagret 11er – sett opp i Kampdetaljer</span>';
            actionsEl.innerHTML = '';
        };

        window.applyTacticalLineupReadOnlyState = function() {
            const pitch = document.getElementById('full-pitch-container');
            const editable = window.isTacticalLineupEditable();
            const liveMatch = window.isTacticalLiveMatchMode();
            if (pitch) {
                pitch.classList.toggle('is-lineup-readonly', !editable && !liveMatch);
                pitch.classList.toggle('is-live-board', liveMatch);
                pitch.classList.toggle('is-sub-targeting', liveMatch && Boolean(window.tacticalPendingSubIn));
            }

            ['tactical-autofill-btn', 'tactical-clear-btn'].forEach(id => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.disabled = !editable;
                btn.classList.toggle('is-disabled', !editable);
            });

            document.querySelectorAll('.player-node').forEach(node => {
                node.classList.toggle('is-lineup-readonly', !editable && !liveMatch);
                node.classList.toggle('is-sub-target', liveMatch && Boolean(window.tacticalPendingSubIn));
            });
        };

        window.requestEditTacticalLineup = function() {};

        window.cancelTacticalLineupEdit = function() {};

        window.saveTacticalLineup = async function() {};

        window.getTacticalChemistryFilter = function() {
            const currentMatch = getSelectedTacticalMatch();

            if (currentMatch && currentMatch.matchGroup) {
                return { teamName: currentMatch.matchGroup, historicalOnly: true };
            }

            const filterLag = window.getPrimaryTeamName();
            if (filterLag) {
                return { teamName: filterLag, historicalOnly: true };
            }

            const lineupPlayers = Object.values(window.tacticalLineup || {}).filter(p => p && p.spillerLag);
            if (lineupPlayers.length > 0) {
                const lagCounts = {};
                lineupPlayers.forEach(p => { lagCounts[p.spillerLag] = (lagCounts[p.spillerLag] || 0) + 1; });
                const topLag = Object.entries(lagCounts).sort((a, b) => b[1] - a[1])[0];
                if (topLag) return { teamName: topLag[0], historicalOnly: true };
            }

            return { teamName: null, historicalOnly: true };
        };

        window.drawChemistryLines = function() {
            const svgLayer = document.getElementById('chemistry-lines-layer');
            const pitch = document.getElementById('full-pitch-container');
            if (!svgLayer) return;
            svgLayer.innerHTML = '';

            let labelLayer = pitch?.querySelector('[data-samspill-line-labels]');
            if (pitch && !labelLayer) {
                labelLayer = document.createElement('div');
                labelLayer.className = 'match-game-plan-samspill-line-labels tactical-samspill-line-labels';
                labelLayer.dataset.samspillLineLabels = '';
                labelLayer.setAttribute('aria-hidden', 'true');
                pitch.appendChild(labelLayer);
            }
            if (labelLayer) labelLayer.innerHTML = '';
            
            const connections = typeof window.getTacticalSamspillConnections === 'function'
                ? window.getTacticalSamspillConnections(
                    typeof window.getActiveTacticalSamspillPhase === 'function'
                        ? window.getActiveTacticalSamspillPhase()
                        : undefined
                )
                : [];
            const focusPos = typeof currentSelectPos !== 'undefined' ? currentSelectPos : null;
            const chemOptions = typeof window.getTacticalChemistryFilter === 'function'
                ? window.getTacticalChemistryFilter()
                : { historicalOnly: true };

            const pitchRect = pitch?.getBoundingClientRect();

            function getTacticalPairCoords(posA, posB, nodeA, nodeB) {
                const activePhase = typeof window.getActiveTacticalSamspillPhase === 'function'
                    ? window.getActiveTacticalSamspillPhase()
                    : (typeof currentTacticalPhase !== 'undefined' ? currentTacticalPhase : 'fase1');
                const isF1StopperPair = activePhase === 'fase1'
                    && ((posA === 'VMS' && posB === 'HMS') || (posA === 'HMS' && posB === 'VMS'));
                if (isF1StopperPair && pitchRect?.width && pitchRect?.height) {
                    const leftNode = posA === 'VMS' ? nodeA : nodeB;
                    const rightNode = posA === 'VMS' ? nodeB : nodeA;
                    const leftRect = leftNode.getBoundingClientRect();
                    const rightRect = rightNode.getBoundingClientRect();
                    // F1 only: top edge to top edge, inner corners
                    return {
                        x1: ((leftRect.right - pitchRect.left) / pitchRect.width) * 100,
                        y1: ((leftRect.top - pitchRect.top) / pitchRect.height) * 100,
                        x2: ((rightRect.left - pitchRect.left) / pitchRect.width) * 100,
                        y2: ((rightRect.top - pitchRect.top) / pitchRect.height) * 100
                    };
                }

                return {
                    x1: parseFloat(nodeA.style.left),
                    y1: parseFloat(nodeA.style.top),
                    x2: parseFloat(nodeB.style.left),
                    y2: parseFloat(nodeB.style.top)
                };
            }

            const pairResults = connections.map(pair => {
                const player1 = window.tacticalLineup[pair[0]];
                const player2 = window.tacticalLineup[pair[1]];
                if (!player1 || !player2) return null;

                const samspill = typeof window.getDuoSamspill === 'function'
                    ? window.getDuoSamspill(player1, player2, {
                        ...chemOptions,
                        posA: pair[0],
                        posB: pair[1]
                    })
                    : null;
                if (!samspill || !samspill.shouldDraw) return null;

                const node1 = document.getElementById('node-' + pair[0]);
                const node2 = document.getElementById('node-' + pair[1]);
                if (!node1 || !node2 || !node1.style.top || !node2.style.top) return null;

                return {
                    pair,
                    samspill,
                    coords: getTacticalPairCoords(pair[0], pair[1], node1, node2),
                    relevance: samspill.positionalRelevance,
                    focused: focusPos && (pair[0] === focusPos || pair[1] === focusPos)
                };
            }).filter(Boolean);

            const drawnPairs = pairResults
                .sort((a, b) => {
                    if (a.focused !== b.focused) return a.focused ? 1 : -1;
                    return b.relevance - a.relevance;
                })
                .slice(0, focusPos ? pairResults.length : 22);
            const labelPositions = typeof window.getSamspillScoreLabelPositions === 'function'
                ? window.getSamspillScoreLabelPositions(drawnPairs.map(entry => entry.coords))
                : [];

            drawnPairs.forEach((entry, index) => {
                if (typeof window.appendSamspillLine === 'function') {
                    window.appendSamspillLine(svgLayer, entry.coords, entry.samspill, {
                        context: 'match-plan',
                        showScoreLabel: false,
                        focused: entry.focused,
                        dimUnfocused: !!focusPos && !entry.focused,
                        coordUnit: '%'
                    });
                }

                if (!labelLayer) return;
                const point = labelPositions[index] || {
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
                if (focusPos && !entry.focused) label.style.opacity = '0.5';
                labelLayer.appendChild(label);
            });
        };

        window.setTacticalPhase = function(phaseId) {
            const previousPhase = typeof currentTacticalPhase !== 'undefined' ? currentTacticalPhase : 'fase1';
            currentTacticalPhase = phaseId; 
            
            document.querySelectorAll('.phase-btn').forEach(btn => {
                btn.classList.remove('portal-btn-primary'); 
                btn.classList.add('portal-btn-secondary');
            });
            
            const activeBtn = document.getElementById(`btn-${phaseId}`);
            if (activeBtn) {
                activeBtn.classList.remove('portal-btn-secondary');
                activeBtn.classList.add('portal-btn-primary');
            }

            const svgLayer = document.getElementById('chemistry-lines-layer');
            if (svgLayer) svgLayer.innerHTML = '';

            const pitch = document.getElementById('full-pitch-container');
            if (pitch) {
                pitch.querySelectorAll('.tactical-live-ghost').forEach(ghost => ghost.remove());
                const labelLayer = pitch.querySelector('[data-samspill-line-labels]');
                if (labelLayer) labelLayer.innerHTML = '';
            }

            const coords = tacticalPhases[phaseId] || {};
            const prevCoords = tacticalPhases[previousPhase] || coords;

            for (const [nodeId, pos] of Object.entries(coords)) {
                const node = document.getElementById('node-' + nodeId);
                if (!node) continue;

                const prev = prevCoords[nodeId];
                const moved = prev && (prev.top !== pos.top || prev.left !== pos.left);
                const hasPlayer = Boolean(window.tacticalLineup?.[nodeId]);

                if (pitch && moved && hasPlayer && previousPhase !== phaseId) {
                    const ghost = node.cloneNode(true);
                    ghost.removeAttribute('id');
                    ghost.removeAttribute('onclick');
                    ghost.classList.add('tactical-live-ghost');
                    ghost.classList.remove('is-phase-moving', 'is-sub-target');
                    ghost.style.top = prev.top;
                    ghost.style.left = prev.left;
                    pitch.appendChild(ghost);
                    requestAnimationFrame(() => ghost.classList.add('is-fading'));
                    setTimeout(() => ghost.remove(), 720);
                }

                node.classList.add('is-phase-moving');
                node.style.top = pos.top;
                node.style.left = pos.left;
            }

            setTimeout(() => {
                document.querySelectorAll('.player-node.is-phase-moving').forEach(node => {
                    node.classList.remove('is-phase-moving');
                });
                window.drawChemistryLines();
            }, 520);
        };

        window.syncTacticalSandboxButton = function() {
            const btn = document.getElementById('tactical-sandbox-btn');
            if (!btn) return;
            const isSandbox = !getTacticalMatchSelectValue();
            btn.classList.toggle('is-active', isSandbox);
            btn.setAttribute('aria-pressed', isSandbox ? 'true' : 'false');
        };

        window.enterTacticalSandbox = function() {
            const select = document.getElementById('tacticalMatchSelect');
            if (select) select.value = '';
            if (typeof window.loadMatchTactics === 'function') window.loadMatchTactics();
            window.syncTacticalSandboxButton();
        };

        window.onTacticalMatchSelectChange = function() {
            if (typeof window.loadMatchTactics === 'function') window.loadMatchTactics();
            window.syncTacticalSandboxButton();
        };

        window.updateTacticalMatchSelector = function() {
            const select = document.getElementById('tacticalMatchSelect');
            if (!select) return;
            const currentSelectedValue = select.value;
            
            select.innerHTML = '<option value="">Velg kamp</option>';

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const liveMatches = [...(window.activeMatches || [])]
                .filter(m => {
                    if (!m?.date) return false;
                    const matchDate = new Date(m.date);
                    if (Number.isNaN(matchDate.getTime())) return false;
                    matchDate.setHours(0, 0, 0, 0);
                    return matchDate >= today;
                })
                .sort((a, b) => String(a.date).localeCompare(String(b.date)));

            liveMatches.forEach((m, index) => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const dateLabel = new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
                const prefix = index === 0 ? 'Neste · ' : '';
                opt.innerText = `${prefix}${dateLabel} - vs ${m.opponent}`;
                select.appendChild(opt);
            });

            const stillAvailable = !currentSelectedValue
                || [...select.options].some(opt => opt.value === currentSelectedValue);
            if (stillAvailable && currentSelectedValue) {
                select.value = currentSelectedValue;
            } else if (currentSelectedValue && !stillAvailable) {
                select.value = '';
                if (typeof window.loadMatchTactics === 'function') window.loadMatchTactics();
            }

            window.syncTacticalSandboxButton();
        };

        function refreshTacticalLiveBoard() {
            TACTICAL_POSITIONS.forEach(pos => {
                window.renderNodeVisually(window.tacticalLineup[pos], pos);
            });
            window.drawChemistryLines();
            if (typeof window.renderBench === 'function') window.renderBench();
            if (typeof window.renderTacticalLiveRoles === 'function') window.renderTacticalLiveRoles();
            if (typeof window.updateTacticalBoardStats === 'function') window.updateTacticalBoardStats();
            window.updateTacticalLineupControls();
            window.applyTacticalLineupReadOnlyState();
        }

        window.resetTacticalLiveBoard = function() {
            const match = getSelectedTacticalMatch();
            if (!match) return;
            window.tacticalPendingSubIn = null;
            window.tacticalLiveDirty = false;
            window.tacticalAppliedLiveSubs = [];
            loadTacticalLineupFromMatch(match);
            loadLiveRolesFromMatch(match);
            const panel = document.getElementById('tactical-live-sub-panel');
            if (panel) {
                panel.classList.add('hidden');
                panel.innerHTML = '';
            }
            refreshTacticalLiveBoard();
        };

        window.loadMatchTactics = function() {
            const matchId = getTacticalMatchSelectValue();
            const rolesCard = document.getElementById('tactical-roles-card');
            const benchCard = document.getElementById('tactical-bench-card');
            const subPanel = document.getElementById('tactical-live-sub-panel');
            
            window.tacticalPendingSubIn = null;
            window.tacticalAppliedLiveSubs = [];
            window.tacticalLiveDirty = false;

            if (!matchId) {
                if (rolesCard) rolesCard.classList.add('hidden');
                if (benchCard) benchCard.classList.add('hidden');
                if (subPanel) {
                    subPanel.classList.add('hidden');
                    subPanel.innerHTML = '';
                }
                window.liveLineup = {};
                window.liveRoles = {};
                window.tacticalLineupIsEditing = true;
                window.clearTacticalBoard();
                window.updateTacticalLineupControls();
                window.applyTacticalLineupReadOnlyState();
                window.syncTacticalSandboxButton();
                return;
            }
            
            if (rolesCard) rolesCard.classList.remove('hidden');
            if (benchCard) benchCard.classList.remove('hidden');
            
            const match = getSelectedTacticalMatch();
            if (!match) return;

            window.tacticalLineupIsEditing = false;

            loadTacticalLineupFromMatch(match);
            loadLiveRolesFromMatch(match);
            refreshTacticalLiveBoard();
            window.syncTacticalSandboxButton();
        };

        window.saveMatchTactics = async function() {
            return;
        };

        window.renderTacticalLiveRoles = function() {
            const list = document.getElementById('tactical-live-roles-list');
            if (!list) return;

            if (!window.isTacticalLiveMatchMode()) {
                list.innerHTML = '';
                return;
            }

            list.innerHTML = TACTICAL_LIVE_ROLE_SLOTS.map(slot => {
                const ref = window.liveRoles?.[slot] || '';
                const player = ref && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(ref)
                    : null;
                const name = player?.navn || (ref ? String(ref) : '—');
                return `
                    <div class="tactical-live-role-row">
                        <span class="tactical-live-role-slot">${escapeTacticalHtml(getTacticalLiveRoleLabel(slot))}</span>
                        <span class="tactical-live-role-name">${escapeTacticalHtml(name)}</span>
                    </div>
                `;
            }).join('');
        };

        window.toggleTacticalLiveRolesPanel = function() {
            const card = document.getElementById('tactical-roles-card');
            const toggle = card?.querySelector('.tactical-live-roles-toggle');
            if (!card || !toggle) return;

            const willOpen = card.classList.contains('is-collapsed');
            card.classList.toggle('is-collapsed', !willOpen);
            toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            toggle.setAttribute('aria-label', willOpen ? 'Skjul roller' : 'Vis roller');
        };

        window.showTacticalLiveSubPanel = function({ outPlayer, inPlayer, posId, inheritedRoles, inheritedOffc = [], inheritedDefc = [] }) {
            const panel = document.getElementById('tactical-live-sub-panel');
            if (!panel) return;

            const transferred = {
                roles: inheritedRoles || [],
                offc: inheritedOffc || [],
                defc: inheritedDefc || []
            };
            const hadHtml = buildInheritanceBadgesHtml(transferred, {
                label: 'Hadde',
                state: 'had',
                emptyHtml: '<p class="tactical-live-inherit-empty m-0">Ingen roller eller corner-ansvar.</p>'
            });
            const inheritHtml = buildInheritanceBadgesHtml(transferred, {
                label: 'Overtar',
                state: 'takes',
                emptyHtml: '<p class="tactical-live-inherit-empty m-0">Ingen roller eller corner-ansvar å arve.</p>'
            });

            panel.classList.remove('hidden');
            panel.innerHTML = `
                <div class="tactical-live-panel-header">
                    <h3 class="tactical-live-panel-title m-0">
                        <i class="fa-solid fa-right-left" aria-hidden="true"></i>
                        <span>Innbytte · arv</span>
                    </h3>
                    <span class="tactical-live-panel-badge">Live</span>
                </div>
                <div class="tactical-live-sub-swap">
                    <div class="tactical-live-sub-side is-out">
                        <span class="tactical-live-sub-label">Ut</span>
                        <strong>${escapeTacticalHtml(outPlayer?.navn || '—')}</strong>
                        <span class="tactical-live-sub-pos">${escapeTacticalHtml(posId)}</span>
                        ${hadHtml}
                    </div>
                    <div class="tactical-live-sub-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></div>
                    <div class="tactical-live-sub-side is-in">
                        <span class="tactical-live-sub-label">Inn</span>
                        <strong>${escapeTacticalHtml(inPlayer?.navn || '—')}</strong>
                        <span class="tactical-live-sub-pos">${escapeTacticalHtml(posId)}</span>
                        ${inheritHtml}
                    </div>
                </div>
            `;
        };

        window.clearTacticalPendingSub = function() {
            window.tacticalPendingSubIn = null;
            window.applyTacticalLineupReadOnlyState();
            if (typeof window.renderBench === 'function') window.renderBench();
        };

        window.beginTacticalLiveSub = function(playerId) {
            if (!window.isTacticalLiveMatchMode()) return;
            const player = typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(playerId)
                : (window.activePlayers || []).find(p => p.id === playerId);
            if (!player) return;

            if (window.tacticalPendingSubIn?.id === player.id) {
                window.clearTacticalPendingSub();
                return;
            }

            window.tacticalPendingSubIn = player;
            window.applyTacticalLineupReadOnlyState();
            if (typeof window.renderBench === 'function') window.renderBench();
        };

        window.applyLiveSubstitution = function(posId, inPlayer, options = {}) {
            if (!window.isTacticalLiveMatchMode() || !posId || !inPlayer) return false;

            const outPlayer = window.liveLineup?.[posId] || null;
            if (!outPlayer) {
                alert(`Ingen spiller på ${posId} å bytte ut.`);
                return false;
            }

            const alreadyOnPitch = Object.entries(window.liveLineup || {}).some(([pos, player]) => (
                pos !== posId && player && (player.id === inPlayer.id || player.navn === inPlayer.navn)
            ));
            if (alreadyOnPitch) {
                alert(`${inPlayer.navn} er allerede på banen.`);
                return false;
            }

            const inheritedRoles = getRolesForPlayer(outPlayer);
            const match = getSelectedTacticalMatch();
            const inheritedOffc = getSetPieceSlotsForPlayer(match, 'offcAssignments', outPlayer);
            const inheritedDefc = getSetPieceSlotsForPlayer(match, 'defcAssignments', outPlayer);
            const inRef = getTacticalLivePlayerRef(inPlayer);

            inheritedRoles.forEach(slot => {
                window.liveRoles[slot] = inRef;
            });

            window.liveLineup[posId] = inPlayer;
            syncLiveLineupToTactical();
            window.tacticalLiveDirty = true;
            window.tacticalAppliedLiveSubs = [
                ...(window.tacticalAppliedLiveSubs || []),
                {
                    minute: options.minute || '',
                    posId,
                    outId: getTacticalLivePlayerRef(outPlayer),
                    inId: inRef,
                    outRoles: [...inheritedRoles],
                    outOffc: [...inheritedOffc],
                    outDefc: [...inheritedDefc]
                }
            ];
            window.tacticalPendingSubIn = null;

            window.showTacticalLiveSubPanel({
                outPlayer,
                inPlayer,
                posId,
                inheritedRoles,
                inheritedOffc,
                inheritedDefc
            });

            refreshTacticalLiveBoard();
            return true;
        };

        window.applyPlannedLiveSub = function(playerRef, posId) {
            const match = getSelectedTacticalMatch();
            if (!match) return;
            const player = typeof window.findPlayerByRef === 'function'
                ? window.findPlayerByRef(playerRef)
                : null;
            if (!player || !posId) return;
            const assignment = getBenchAssignmentFromMatch(match, playerRef);
            window.applyLiveSubstitution(posId, player, { minute: assignment.minute || '' });
        };

        window.renderBench = function() {
            const benchList = document.getElementById('tactical-bench-list');
            if (!benchList) return;
            benchList.innerHTML = '';

            const match = getSelectedTacticalMatch();
            if (!match) return;

            const suspData = typeof window.getDisciplineStatusForTeam === 'function'
                ? window.getDisciplineStatusForTeam(match.matchGroup, match.date)
                : {};

            const teamName = match.matchGroup;
            const players = Array.isArray(window.activePlayers) ? window.activePlayers : [];

            let teamPlayers = players.filter(p => p.spillerLag === teamName && p.status !== 'Passiv');
            if (teamPlayers.length === 0) teamPlayers = players.filter(p => p.status !== 'Passiv');
            teamPlayers = teamPlayers.filter(p => typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(p, match));

            const startingPlayerNames = Object.values(window.tacticalLineup || {}).filter(p => p !== null).map(p => p.navn);

            const benchPlayers = teamPlayers.filter(p => {
                const starterIKampen = startingPlayerNames.includes(p.navn);
                const erBekreftetKlar = window.isPlayerAttending(match.attendance, p);
                return !starterIKampen && erBekreftetKlar;
            });

            const plan = match.benchSubstitutionPlan && typeof match.benchSubstitutionPlan === 'object'
                ? match.benchSubstitutionPlan
                : {};
            const plannedByRef = new Map();
            Object.entries(plan).forEach(([playerRef, raw]) => {
                const assignment = typeof raw === 'string'
                    ? { minute: raw, position: '' }
                    : { minute: raw?.minute || '', position: raw?.position || '' };
                if (!assignment.minute && !assignment.position) return;
                const player = typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(playerRef)
                    : null;
                if (!player) return;
                if (startingPlayerNames.includes(player.navn)) return;
                if (window.tacticalAppliedLiveSubs?.some(sub => sub.inId === getTacticalLivePlayerRef(player))) return;
                plannedByRef.set(getTacticalLivePlayerRef(player), { playerRef, assignment });
            });

            if (benchPlayers.length === 0) {
                benchList.innerHTML = '<p class="text-xs text-slate-400 italic col-span-2 py-2">Ingen tilgjengelige innbyttere på benken.</p>';
                return;
            }

            const getChem = (p) => (
                typeof window.calculatePlayerPerformanceChemistry === 'function'
                    ? window.calculatePlayerPerformanceChemistry(p.navn)
                    : 0
            );

            benchPlayers.sort((a, b) => {
                const planA = plannedByRef.get(getTacticalLivePlayerRef(a));
                const planB = plannedByRef.get(getTacticalLivePlayerRef(b));
                const hasPlanA = Boolean(planA);
                const hasPlanB = Boolean(planB);
                if (hasPlanA !== hasPlanB) return hasPlanA ? -1 : 1;
                if (hasPlanA && hasPlanB) {
                    const minuteA = planA.assignment.minute ? Number(planA.assignment.minute) : 999;
                    const minuteB = planB.assignment.minute ? Number(planB.assignment.minute) : 999;
                    if (minuteA !== minuteB) return minuteA - minuteB;
                }
                return getChem(b) - getChem(a);
            });

            benchPlayers.forEach(p => {
                const playerRef = getTacticalLivePlayerRef(p);
                const planned = plannedByRef.get(playerRef) || null;
                const assignment = planned?.assignment || null;
                const playerChem = getChem(p);
                const chemColor = typeof window.getFormScoreTextClass === 'function'
                    ? window.getFormScoreTextClass(playerChem, p.spillerLag)
                    : 'text-slate-400';

                const kampbonus = typeof window.getPlayerKampbidragSnitt === 'function'
                    ? window.getPlayerKampbidragSnitt(p)
                    : 0;
                let bonusColor = 'text-slate-400';
                if (kampbonus > 15) bonusColor = 'text-emerald-500';
                else if (kampbonus >= 10) bonusColor = 'text-amber-500';
                else if (kampbonus > 0) bonusColor = 'text-rose-500';
                const bonusTekst = kampbonus > 0 ? kampbonus : '-';

                const pSusp = window.getDisciplineStatusForPlayer(suspData, p);
                let benchSuspBadge = '';
                let borderClass = '';
                if (pSusp.isSuspended) {
                    benchSuspBadge = `<span class="tactical-bench-status-badge is-suspension" title="${escapeTacticalHtml(pSusp.reason)}">KARANTENE</span>`;
                    borderClass = 'is-suspended';
                } else if (pSusp.isAtRisk) {
                    benchSuspBadge = `<span class="tactical-bench-status-badge is-risk" title="Faresone: ${escapeTacticalHtml(pSusp.yellows)} gule i serie. Karantene ved ${escapeTacticalHtml(pSusp.nextKaranteneAt || 4)}.">FARESONE</span>`;
                }

                const injuryInfo = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(p) : { isInjured: false };
                if (injuryInfo.isInjured) {
                    benchSuspBadge += `<span class="tactical-bench-status-badge ${injuryInfo.type === 'langvarig' ? 'is-injury-long' : 'is-injury-short'}" title="${escapeTacticalHtml(injuryInfo.label)}">${escapeTacticalHtml(injuryInfo.shortLabel)}</span>`;
                }

                const isPending = window.tacticalPendingSubIn && (
                    window.tacticalPendingSubIn.id === p.id || window.tacticalPendingSubIn.navn === p.navn
                );
                const photoUrl = getTacticalLivePlayerPhotoUrl(p);
                const canApplyPlanned = Boolean(assignment?.position && window.liveLineup?.[assignment.position]);
                const planDisabled = Boolean(assignment?.position) && !canApplyPlanned;
                const outPlayer = assignment?.position ? (window.liveLineup?.[assignment.position] || null) : null;
                const inheritPreview = outPlayer
                    ? getInheritancePreviewForOutPlayer(match, outPlayer)
                    : { roles: [], offc: [], defc: [] };
                const inheritHtml = buildInheritanceBadgesHtml(inheritPreview, {
                    state: 'takes'
                });
                const appliedOutSub = findLatestAppliedLiveSubForPlayer(p, 'out');
                const hadHtml = appliedOutSub
                    ? buildInheritanceBadgesHtml({
                        roles: appliedOutSub.outRoles || [],
                        offc: appliedOutSub.outOffc || [],
                        defc: appliedOutSub.outDefc || []
                    }, {
                        label: 'Hadde',
                        state: 'had'
                    })
                    : '';
                const roleMetaHtml = [hadHtml, inheritHtml].filter(Boolean).join('');
                const planTitle = !assignment
                    ? ''
                    : canApplyPlanned
                        ? `Bytt inn på ${assignment.position}${assignment.minute ? ` (${assignment.minute}')` : ''}`
                        : assignment.position
                            ? `Posisjon ${assignment.position} er tom`
                            : 'Mangler planlagt posisjon – bruk Fritt';
                const planLabelParts = [];
                if (assignment?.minute) planLabelParts.push(`${assignment.minute}'`);
                if (assignment?.position) planLabelParts.push(`→ ${assignment.position}`);
                else if (assignment) planLabelParts.push('→ velg pos');
                const planHtml = assignment
                    ? `<button
                            type="button"
                            class="bsk-btn bsk-btn-primary tactical-bench-btn"
                            data-bench-action="planned"
                            title="${escapeTacticalHtml(planTitle)}"
                            ${planDisabled ? 'disabled' : ''}
                       >${escapeTacticalHtml(planLabelParts.join(' ') || 'Bytt')}</button>`
                    : '';

                const div = document.createElement('div');
                div.className = `tactical-bench-player ${borderClass}${isPending ? ' is-pending-sub' : ''}${assignment ? ' has-plan' : ''}`;
                div.innerHTML = `
                    <div class="tactical-bench-player-main">
                        <span class="tactical-bench-avatar" aria-hidden="true">
                            ${photoUrl
                                ? `<img src="${escapeTacticalHtml(photoUrl)}" alt="">`
                                : '<i class="fa-solid fa-user"></i>'}
                        </span>
                        <div class="tactical-bench-player-copy min-w-0">
                            <div class="tactical-bench-player-name-row">
                                <span class="tactical-bench-player-name ${pSusp.isSuspended ? 'is-suspended' : ''}">${escapeTacticalHtml(p.navn)}</span>
                            </div>
                            ${benchSuspBadge
                                ? `<div class="tactical-bench-status-row">${benchSuspBadge}</div>`
                                : ''}
                            ${roleMetaHtml}
                            ${isPending ? '<span class="tactical-bench-pending">Velg posisjon på banen</span>' : ''}
                        </div>
                    </div>
                    <div class="tactical-bench-player-actions">
                        <div class="tactical-bench-buttons">
                            ${planHtml}
                            <button
                                type="button"
                                class="bsk-btn bsk-btn-secondary tactical-bench-btn${isPending ? ' is-active' : ''}"
                                data-bench-action="free"
                                aria-pressed="${isPending ? 'true' : 'false'}"
                                title="${isPending ? 'Avbryt fritt bytte' : 'Bytt inn fritt – velg posisjon på banen'}"
                            >${isPending ? 'Avbryt' : 'Fritt'}</button>
                        </div>
                        <div class="tactical-bench-scores">
                            <span class="font-black text-xs ${bonusColor}" title="Kampbidrag">${bonusTekst}</span>
                            <span class="tactical-bench-score-sep" aria-hidden="true"></span>
                            <span class="font-black text-xs ${chemColor}" title="Form">${playerChem}/100</span>
                        </div>
                    </div>
                `;

                const confirmSuspended = () => {
                    if (!pSusp.isSuspended) return true;
                    return confirm(`ADVARSEL! ${p.navn} har karantene (${pSusp.reason}). Vil du bytte inn likevel?`);
                };

                const plannedBtn = div.querySelector('[data-bench-action="planned"]');
                if (plannedBtn) {
                    plannedBtn.addEventListener('click', () => {
                        if (planDisabled) return;
                        if (!confirmSuspended()) return;
                        if (canApplyPlanned) {
                            window.applyPlannedLiveSub(planned.playerRef || playerRef, assignment.position);
                            return;
                        }
                        window.beginTacticalLiveSub(p.id || p.navn);
                    });
                }

                const freeBtn = div.querySelector('[data-bench-action="free"]');
                if (freeBtn) {
                    freeBtn.addEventListener('click', () => {
                        if (isPending) {
                            window.clearTacticalPendingSub();
                            return;
                        }
                        if (!confirmSuspended()) return;
                        window.beginTacticalLiveSub(p.id || p.navn);
                    });
                }

                benchList.appendChild(div);
            });
        };

        window.renderNodeVisually = function(playerObj, posId) {
            const node = document.getElementById('node-' + posId);
            if (!node) return;

            node.classList.add('tactical-live-card', 'player-node');
            node.classList.remove(
                'bg-bsk-yellow', 'text-bsk-blue', 'border-white', 'bg-bsk-blue', 'text-white',
                'border-2', 'border-[3px]', 'border-bsk-yellow/60', 'border-emerald-500',
                'border-yellow-500', 'border-amber-500', 'border-orange-500', 'border-rose-500',
                'border-slate-300', 'w-10', 'h-10', 'rounded-full'
            );

            const posBadge = getTacticalLivePosBadge(posId);

            if (playerObj === null || playerObj === undefined) {
                node.classList.add('is-empty');
                node.classList.remove('is-filled');
                node.innerHTML = `
                    <span class="tactical-live-card-visual" aria-hidden="true">
                        <span class="tactical-live-card-empty">
                            <span class="tactical-live-card-empty-add"></span>
                            <span class="tactical-live-card-pos">${escapeTacticalHtml(posBadge)}</span>
                        </span>
                        <strong></strong>
                    </span>
                `;
                return;
            }

            node.classList.add('is-filled');
            node.classList.remove('is-empty');

            const photoUrl = getTacticalLivePlayerPhotoUrl(playerObj);
            const lastName = getTacticalLivePlayerLastName(playerObj);
            const roleSlots = window.isTacticalLiveMatchMode()
                ? getRolesForPlayer(playerObj)
                : [];

            const roleBadges = roleSlots.map(slot => (
                `<span class="tactical-live-card-role" title="${escapeTacticalHtml(getTacticalLiveRoleLabel(slot))}">${escapeTacticalHtml(TACTICAL_LIVE_ROLE_BADGE[slot] || slot)}</span>`
            )).join('');

            node.innerHTML = `
                <span class="tactical-live-card-visual" aria-hidden="true">
                    <span class="tactical-live-card-photo-area">
                        <span class="tactical-live-card-photo">
                            ${photoUrl
                                ? `<img src="${escapeTacticalHtml(photoUrl)}" alt="">`
                                : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}
                            <span class="tactical-live-card-pos">${escapeTacticalHtml(posBadge)}</span>
                        </span>
                        ${roleBadges ? `<span class="tactical-live-card-roles">${roleBadges}</span>` : ''}
                    </span>
                    <strong>${escapeTacticalHtml(lastName)}</strong>
                </span>
            `;
        };

        window.choosePlayer = function(playerObj, posId) {
            if (window.isTacticalLiveMatchMode()) {
                window.liveLineup[posId] = playerObj;
                syncLiveLineupToTactical();
            } else {
                window.tacticalLineup[posId] = playerObj;
                window.liveLineup[posId] = playerObj;
            }
            window.renderNodeVisually(playerObj, posId);
            window.drawChemistryLines();
            window.updateTacticalBoardStats();
            window.closePlayerSelect();
        };

        window.openPlayerSelect = function(posId) {
            if (window.isTacticalLiveMatchMode()) {
                if (window.tacticalPendingSubIn) {
                    window.applyLiveSubstitution(posId, window.tacticalPendingSubIn);
                }
                return;
            }

            currentSelectPos = posId;
            window.drawChemistryLines();
            const modal = document.getElementById('tacticalPlayerModal');
            modal.classList.remove('match-game-plan-select-modal');
            modal.querySelector('[data-match-game-plan-clear-player]')?.remove();
            const title = modal.querySelector('h3');
            if (title) title.innerHTML = '<i class="fa-solid fa-shirt text-bsk-yellow"></i> Velg spiller';
            const list = document.getElementById('tactical-player-list');
            document.getElementById('tactical-pos-label').innerText = `Velger for: ${posId}`;
            list.innerHTML = '';

            const matchId = getTacticalMatchSelectValue() || null;
            const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
            const hasAttendance = currentMatch && window.hasRegisteredAttendance(currentMatch.attendance);

            const suspData = (typeof window.getDisciplineStatusForTeam === 'function' && currentMatch)
                ? window.getDisciplineStatusForTeam(currentMatch.matchGroup, currentMatch.date)
                : {};

            const sortedPlayers = [...(window.activePlayers || [])]
                .filter(p => p.status !== 'Passiv')
                .filter(p => !currentMatch || typeof window.isPlayerOnRosterForActivity !== 'function' || window.isPlayerOnRosterForActivity(p, currentMatch))
                .sort((a,b) => {
                    if (hasAttendance) {
                        const valA = window.isPlayerAttending(currentMatch.attendance, a) ? 2 : 0;
                        const valB = window.isPlayerAttending(currentMatch.attendance, b) ? 2 : 0;
                        if (valA !== valB) return valB - valA;
                    }
                    return a.navn.localeCompare(b.navn);
                });

            sortedPlayers.forEach(p => {
                const isPlaying = Object.values(window.tacticalLineup).some(player => player && player.id === p.id);
                let attStatusHtml = '', opacityClass = isPlaying ? 'opacity-40 bg-slate-50' : 'hover:bg-bsk-blue/5 border border-transparent hover:border-bsk-blue/20', needsAttendanceConfirm = false;

                const pSusp = window.getDisciplineStatusForPlayer(suspData, p);

                if (pSusp.isSuspended) {
                    attStatusHtml += `<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black ml-2 animate-pulse shadow-sm" title="${escapeTacticalHtml(pSusp.reason)}">🚫 KARANTENE</span>`;
                    opacityClass = 'opacity-60 bg-rose-50 border border-rose-200';
                } else if (pSusp.isAtRisk) {
                    attStatusHtml += `<span class="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-black ml-2 shadow-sm" title="Faresone: ${escapeTacticalHtml(pSusp.yellows)} gule i serie. Karantene ved ${escapeTacticalHtml(pSusp.nextKaranteneAt || 4)}.">⚠️ FARESONE</span>`;
                }

                const injuryInfo = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(p) : { isInjured: false };
                if (injuryInfo.isInjured) {
                    const injuryClass = injuryInfo.type === 'langvarig'
                        ? 'bg-rose-600 text-white'
                        : 'bg-orange-500 text-white';
                    attStatusHtml += `<span class="text-[9px] ${injuryClass} px-1.5 py-0.5 rounded font-black ml-2 shadow-sm" title="${escapeTacticalHtml(injuryInfo.label)}">🩹 ${escapeTacticalHtml(injuryInfo.shortLabel)}</span>`;
                }

                if (currentMatch && hasAttendance) {
                    if (window.isPlayerAttending(currentMatch.attendance, p) && !pSusp.isSuspended) {
                        attStatusHtml += '<span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold ml-2">✅ MED</span>';
                    } else if (!pSusp.isSuspended && !isPlaying) {
                        opacityClass = 'opacity-50 bg-slate-50';
                        needsAttendanceConfirm = true;
                    }
                }

                const playerChem = window.calculatePlayerPerformanceChemistry(p.navn);
                const chemColor = typeof window.getFormScoreTextClass === 'function'
                    ? window.getFormScoreTextClass(playerChem, p.spillerLag)
                    : 'text-slate-400';

                const kampbonus = typeof window.getPlayerKampbidragSnitt === 'function'
                    ? window.getPlayerKampbidragSnitt(p)
                    : 0;
                let bonusColor = 'text-slate-400';
                if (kampbonus > 15) bonusColor = 'text-emerald-500';
                else if (kampbonus >= 10) bonusColor = 'text-amber-500';
                else if (kampbonus > 0) bonusColor = 'text-rose-500';
                const bonusTekst = kampbonus > 0 ? kampbonus : '-';

                const div = document.createElement('div');
                div.className = `p-3 rounded-xl flex justify-between items-center cursor-pointer transition mb-1 ${opacityClass}`;
                div.onclick = () => {
                    if (pSusp.isSuspended && !confirm(`ADVARSEL! ${p.navn} har karantene (${pSusp.reason}). Vil du sette ham på banen likevel?`)) return;
                    else if (!pSusp.isSuspended && needsAttendanceConfirm && !confirm(`${p.navn} er ikke registrert med oppmøte. Vil du sette ham på banen likevel?`)) return;
                    if (!isPlaying) window.choosePlayer(p, posId); else alert(`${p.navn} er allerede plassert!`);
                };
                
                div.innerHTML = `
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="flex items-center flex-wrap gap-y-1">
                            <p class="font-bold text-slate-800 text-sm truncate mr-1">${escapeTacticalHtml(p.navn)}</p>
                            ${attStatusHtml}
                        </div>
                        <p class="text-[10px] text-slate-500 font-medium">${escapeTacticalHtml(p.pos1 || 'Ukjent pos')}${p.draktnummer ? ` | #${escapeTacticalHtml(p.draktnummer)}` : ''}</p>
                    </div>
                    <div class="flex items-center gap-3 shrink-0 mr-3">
                        <span class="font-black text-xs ${bonusColor}" title="Kampbidrag">${bonusTekst}</span>
                        <div class="w-px h-3 bg-slate-300"></div>
                        <span class="font-black text-xs ${chemColor}" title="Form">${playerChem}/100</span>
                    </div>
                    <div class="shrink-0">
                        ${isPlaying ? '<span class="text-[9px] bg-slate-200 text-slate-500 px-2 py-1 rounded font-bold">OPPTATT</span>' : '<i class="fa-solid fa-plus text-bsk-blue bg-bsk-yellow p-1.5 rounded-lg shadow-sm"></i>'}
                    </div>
                `;
                list.appendChild(div);
            });

            if (window.tacticalLineup[posId]) {
                const clearDiv = document.createElement('div');
                clearDiv.className = "p-3 mt-2 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs text-center cursor-pointer hover:bg-rose-100 transition rounded-xl flex justify-center items-center gap-2";
                clearDiv.onclick = () => window.choosePlayer(null, posId); 
                clearDiv.innerHTML = `<i class="fa-solid fa-user-minus"></i> Fjern spiller fra ${escapeTacticalHtml(posId)}`;
                list.appendChild(clearDiv);
            }
            modal.classList.remove('hidden'); modal.classList.add('flex');
        };

        window.closePlayerSelect = function() {
            document.getElementById('tacticalPlayerModal').classList.remove('match-game-plan-select-modal');
            document.getElementById('tacticalPlayerModal').querySelector('[data-match-game-plan-clear-player]')?.remove();
            const title = document.getElementById('tacticalPlayerModal').querySelector('h3');
            if (title) title.innerHTML = '<i class="fa-solid fa-shirt text-bsk-yellow"></i> Velg spiller';
            document.getElementById('tacticalPlayerModal').classList.add('hidden');
            document.getElementById('tacticalPlayerModal').classList.remove('flex');
            currentSelectPos = null;
            window.drawChemistryLines();
        }

        window.clearTacticalBoard = function() {
            if (!window.isTacticalLineupEditable()) return;
            window.tacticalLineup = {};
            window.liveLineup = {};
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => window.choosePlayer(null, pos));
            window.updateTacticalBoardStats();
        };

        window.openAutofillInfoModal = function() {
            const modal = document.getElementById('autofill-info-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        window.closeAutofillInfoModal = function() {
            const modal = document.getElementById('autofill-info-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        window.openLiveSetPiecePreview = function(planId, slot) {
            const modal = document.getElementById('live-setpiece-preview-modal');
            const titleEl = document.getElementById('live-setpiece-preview-title');
            const captionEl = document.getElementById('live-setpiece-preview-caption');
            const bodyEl = document.getElementById('live-setpiece-preview-body');
            if (!modal || !bodyEl) return;
            const normalizedPlanId = planId === 'defc' ? 'defc' : 'offc';
            const label = normalizedPlanId === 'defc' ? 'DefC' : 'OffC';
            const slotLabel = String(slot || '').trim();
            if (titleEl) titleEl.textContent = slotLabel ? `${label} ${slotLabel}` : label;
            if (captionEl) {
                captionEl.textContent = slotLabel
                    ? `Markert plassering for ${label} ${slotLabel} (samme som i Kampplan).`
                    : `Plasseringer for ${label} (samme som i Kampplan).`;
            }
            bodyEl.innerHTML = typeof window.buildMatchGamePlanSetPiecePreviewHtml === 'function'
                ? window.buildMatchGamePlanSetPiecePreviewHtml(normalizedPlanId, slotLabel)
                : '<p class="text-sm text-slate-400 m-0">Kunne ikke laste hjørnebane.</p>';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        window.closeLiveSetPiecePreview = function() {
            const modal = document.getElementById('live-setpiece-preview-modal');
            const bodyEl = document.getElementById('live-setpiece-preview-body');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if (bodyEl) bodyEl.innerHTML = '';
        };

        document.getElementById('view-taktikk')?.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-live-setpiece]');
            if (!btn || !document.getElementById('view-taktikk')?.contains(btn)) return;
            event.preventDefault();
            event.stopPropagation();
            window.openLiveSetPiecePreview(btn.dataset.liveSetpiece, btn.dataset.liveSlot);
        });

        window.autoFillTeam = function() {
            if (!window.isTacticalLineupEditable()) return;
            window.clearTacticalBoard(); 
            const matchId = getTacticalMatchSelectValue() || null;
            const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;

            let availablePlayers = [...(window.activePlayers || [])].filter(p => {
                if (p.status === 'Passiv') return false;
                if (currentMatch && typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(p, currentMatch)) return false;
                if (currentMatch && !window.isPlayerEligibleForMatch(currentMatch.attendance, p)) return false;
                return true;
            });

            const priorityOrder = [
                { id: 'GK',  pos: ['Keeper'], foot: null, requireFoot: false },
                { id: 'VMS', pos: ['Venstre stopper', 'Høyre stopper'], foot: 'Venstre', requireFoot: true },
                { id: 'HMS', pos: ['Høyre stopper', 'Venstre stopper'], foot: 'Høyre', requireFoot: true },
                { id: 'DM',  pos: ['Defensiv midtbane'], foot: null, requireFoot: false },
                { id: 'OM',  pos: ['Offensiv midtbane'], foot: null, requireFoot: false },
                { id: 'PM',  pos: ['Playmaker'], foot: null, requireFoot: false },
                { id: 'SP',  pos: ['Spiss'], foot: null, requireFoot: false },
                { id: 'VB',  pos: ['Venstre bekk'], foot: null, requireFoot: true },
                { id: 'HB',  pos: ['Høyre bekk'], foot: null, requireFoot: true },
                { id: 'VK',  pos: ['Venstre kant', 'Venstre bekk'], foot: null, requireFoot: false },
                { id: 'HK',  pos: ['Høyre kant', 'Høyre bekk'], foot: null, requireFoot: false }
            ];

            const getKampbonus = (pObj) => (
                typeof window.getPlayerKampbidragSnitt === 'function'
                    ? window.getPlayerKampbidragSnitt(pObj)
                    : 0
            );

            const getPositionFitScore = (player, req) => {
                const preferred = req.pos[0];
                const fallback = req.pos.slice(1);
                if (preferred && player.pos1 === preferred) return 100;
                if (preferred && player.pos2 === preferred) return 80;
                if (fallback.includes(player.pos1)) return 40;
                if (fallback.includes(player.pos2)) return 20;
                return 0;
            };

            priorityOrder.forEach(req => {
                const preferredPos = req.pos[0] ? [req.pos[0]] : req.pos;
                let candidates = availablePlayers.filter(p => (
                    preferredPos.includes(p.pos1) || preferredPos.includes(p.pos2)
                ));

                // Bruk reserveposisjoner (f.eks. bekk på kant) bare hvis ingen ekte match finnes.
                if (candidates.length === 0) {
                    candidates = availablePlayers.filter(p => (
                        req.pos.includes(p.pos1) || req.pos.includes(p.pos2)
                    ));
                }
                if (candidates.length === 0 && availablePlayers.length > 0) {
                    candidates = [...availablePlayers];
                }

                if (candidates.length > 0) {
                    candidates.sort((a, b) => {
                        const fitA = getPositionFitScore(a, req);
                        const fitB = getPositionFitScore(b, req);
                        if (fitA !== fitB) return fitB - fitA;

                        const penaltyA = (req.requireFoot && req.foot && a.fot !== req.foot && a.fot !== 'Begge') ? -5 : 0;
                        const penaltyB = (req.requireFoot && req.foot && b.fot !== req.foot && b.fot !== 'Begge') ? -5 : 0;

                        const scoreA = window.calculatePlayerPerformanceChemistry(a.navn) + getKampbonus(a) + penaltyA;
                        const scoreB = window.calculatePlayerPerformanceChemistry(b.navn) + getKampbonus(b) + penaltyB;
                        return scoreB - scoreA;
                    });
                    const selectedPlayer = candidates[0];
                    window.choosePlayer(selectedPlayer, req.id);
                    availablePlayers = availablePlayers.filter(p => p.id !== selectedPlayer.id);
                }
            });
        };

window.updateTacticalBoardStats = function() {
    const totalBonusEl = document.getElementById('stat-total-bonus');
    const avgChemEl = document.getElementById('stat-avg-chem');
    
    let realTotalBonus = 0;
    let realTotalChem = 0;
    let currentOnBoardCount = 0;
    
    Object.values(window.tacticalLineup).forEach(playerObj => {
        if (playerObj && playerObj.navn) {
            currentOnBoardCount++;
            
            const playerFormSnitt = typeof window.getPlayerKampbidragSnitt === 'function'
                ? window.getPlayerKampbidragSnitt(playerObj)
                : 0;
            
            realTotalBonus += playerFormSnitt;
            
            realTotalChem += typeof window.calculatePlayerPerformanceChemistry === 'function' 
                ? window.calculatePlayerPerformanceChemistry(playerObj.navn) 
                : 0;
        }
    });

    const realChemSnitt = currentOnBoardCount > 0 ? Math.round(realTotalChem / currentOnBoardCount) : 0;

    const matchId = getTacticalMatchSelectValue() || null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;

    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv') return false;
        if (currentMatch && typeof window.isPlayerOnRosterForActivity === 'function' && !window.isPlayerOnRosterForActivity(p, currentMatch)) return false;
        if (currentMatch && !window.isPlayerEligibleForMatch(currentMatch.attendance, p)) return false;
        return true;
    });

    const getPlayerFormSnitt = (pObj) => (
        typeof window.getPlayerKampbidragSnitt === 'function'
            ? window.getPlayerKampbidragSnitt(pObj)
            : 0
    );

    let keepere = availablePlayers.filter(p => p.pos1 === 'Keeper' || (p.pos1 && p.pos1.toLowerCase().includes('keeper')));
    let utespillere = availablePlayers.filter(p => p.pos1 !== 'Keeper' && !(p.pos1 && p.pos1.toLowerCase().includes('keeper')));

    let maxBonusSumPool = 0;
    
    if (keepere.length > 0) {
        const sortedKeepersByForm = [...keepere].sort((a, b) => getPlayerFormSnitt(b) - getPlayerFormSnitt(a));
        maxBonusSumPool += getPlayerFormSnitt(sortedKeepersByForm[0]);
    }
    
    const sortedOutfieldsByForm = [...utespillere].sort((a, b) => getPlayerFormSnitt(b) - getPlayerFormSnitt(a));
    let targetOutfieldBonusCount = keepere.length > 0 ? 10 : 11;
    
    sortedOutfieldsByForm.slice(0, targetOutfieldBonusCount).forEach(p => {
        maxBonusSumPool += getPlayerFormSnitt(p);
    });

    let maxChemSum = 0;
    let chemCount = 0;
    
    if (keepere.length > 0 && typeof window.calculatePlayerPerformanceChemistry === 'function') {
        const sortedKeepersByChem = [...keepere].sort((a, b) => window.calculatePlayerPerformanceChemistry(b.navn) - window.calculatePlayerPerformanceChemistry(a.navn));
        maxChemSum += window.calculatePlayerPerformanceChemistry(sortedKeepersByChem[0].navn);
        chemCount++;
    }
    
    if (typeof window.calculatePlayerPerformanceChemistry === 'function') {
        const sortedOutfieldsByChem = [...utespillere].sort((a, b) => window.calculatePlayerPerformanceChemistry(b.navn) - window.calculatePlayerPerformanceChemistry(a.navn));
        let totalTargetPlayers = Math.min(11, availablePlayers.length);
        const targetOutfieldChemCount = totalTargetPlayers - chemCount;
        
        sortedOutfieldsByChem.slice(0, targetOutfieldChemCount).forEach(p => {
            maxChemSum += window.calculatePlayerPerformanceChemistry(p.navn);
            chemCount++;
        });
    }
    
    const maxChemSnitt = chemCount > 0 ? Math.round(maxChemSum / chemCount) : 0;

    if (totalBonusEl) {
        totalBonusEl.innerText = currentOnBoardCount > 0 ? `${realTotalBonus}/${maxBonusSumPool}` : `0/${maxBonusSumPool}`;
    }
    if (avgChemEl) {
        avgChemEl.innerText = currentOnBoardCount > 0 ? `${realChemSnitt}/${maxChemSnitt}` : `0/${maxChemSnitt}`;
    }
};
