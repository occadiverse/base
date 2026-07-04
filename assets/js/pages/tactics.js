        // ==========================================
        // ===== TAKTIKK OG KJEMI (NY DEL) =====
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
            fase1: { 'GK': { top: '94%', left: '50%' }, 'VMS': { top: '95%', left: '34%' }, 'HMS': { top: '95%', left: '66%' }, 'VB': { top: '85%', left: '16%' }, 'HB': { top: '85%', left: '84%' }, 'DM': { top: '80%', left: '63%' }, 'OM': { top: '80%', left: '37%' }, 'PM': { top: '55%', left: '60%' }, 'VK': { top: '50%', left: '5%' }, 'HK': { top: '50%', left: '95%' }, 'SP': { top: '50%', left: '40%' } },
            fase2: { 'GK': { top: '88%', left: '50%' }, 'VMS': { top: '70%', left: '35%' }, 'HMS': { top: '70%', left: '65%' }, 'VB': { top: '58%', left: '20%' }, 'HB': { top: '58%', left: '80%' }, 'DM': { top: '58%', left: '50%' }, 'OM': { top: '45%', left: '35%' }, 'PM': { top: '45%', left: '65%' }, 'VK': { top: '35%', left: '5%' }, 'HK': { top: '35%', left: '95%' }, 'SP': { top: '30%', left: '50%' } },
            fase3: { 'GK': { top: '80%', left: '50%' }, 'VMS': { top: '50%', left: '33%' }, 'HMS': { top: '50%', left: '67%' }, 'VB': { top: '35%', left: '20%' }, 'HB': { top: '35%', left: '80%' }, 'DM': { top: '35%', left: '50%' }, 'OM': { top: '22%', left: '30%' }, 'PM': { top: '22%', left: '70%' }, 'VK': { top: '15%', left: '10%' }, 'HK': { top: '15%', left: '90%' }, 'SP': { top: '15%', left: '50%' } }
        };

        const TACTICAL_POSITIONS = ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'];
        window.tacticalLineupIsEditing = false;

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
            window.tacticalLineup = {};
            const savedLineup = match.lineup || {};
            const savedLineupRefs = match.lineupRefs || {};
            TACTICAL_POSITIONS.forEach(pos => {
                const refPlayer = savedLineupRefs[pos] && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(savedLineupRefs[pos])
                    : null;
                const savedPlayer = typeof savedLineup[pos] === 'string' && typeof window.findPlayerByRef === 'function'
                    ? window.findPlayerByRef(savedLineup[pos])
                    : savedLineup[pos];
                window.tacticalLineup[pos] = refPlayer || savedPlayer || null;
            });
        }

        function loadTacticalRolesFromMatch(match) {
            const roles = ['captain', 'penalty', 'freekick', 'corners'];
            const players = Array.isArray(window.activePlayers) ? [...window.activePlayers].filter(p => p.status !== 'Passiv') : [];
            const sortedPlayers = players.sort((a, b) => a.navn.localeCompare(b.navn));

            roles.forEach(roleId => {
                const roleSelect = document.getElementById(`role-${roleId}`);
                if (!roleSelect) return;
                roleSelect.innerHTML = '<option value="">-- Velg spiller --</option>';
                sortedPlayers.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.innerText = p.navn;
                    roleSelect.appendChild(opt);
                });
                const roleRef = match.roles ? match.roles[roleId] : '';
                roleSelect.value = window.findPlayerByRef(roleRef)?.id || roleRef || '';
            });
        }

        window.isTacticalLineupEditable = function() {
            const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : '';
            if (!matchId) return true;
            return window.tacticalLineupIsEditing === true;
        };

        window.updateTacticalLineupControls = function() {
            const container = document.getElementById('tactical-lineup-controls');
            if (!container) return;

            const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : '';
            if (!matchId) {
                container.classList.add('hidden');
                return;
            }

            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) {
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            const hasSaved = matchHasSavedTacticalLineup(match);
            const isEditing = window.tacticalLineupIsEditing === true;
            const statusEl = document.getElementById('tactical-lineup-status');
            const actionsEl = document.getElementById('tactical-lineup-actions');
            if (!statusEl || !actionsEl) return;

            if (hasSaved && !isEditing) {
                statusEl.innerHTML = '<span class="tactical-lineup-status-badge is-locked"><i class="fa-solid fa-lock"></i> Lagret startellever</span>';
                actionsEl.innerHTML = '<button type="button" class="bsk-btn bsk-btn-warning" onclick="window.requestEditTacticalLineup()">Rediger startellever</button>';
            } else if (isEditing) {
                statusEl.innerHTML = hasSaved
                    ? '<span class="tactical-lineup-status-badge is-editing"><i class="fa-solid fa-pen"></i> Redigerer startellever</span>'
                    : '<span class="tactical-lineup-status-badge is-editing"><i class="fa-solid fa-pen"></i> Ny startellever</span>';
                actionsEl.innerHTML = `
                    <button type="button" class="bsk-btn bsk-btn-primary" onclick="window.saveTacticalLineup()">${hasSaved ? 'Lagre endringer' : 'Lagre startellever'}</button>
                    ${hasSaved ? '<button type="button" class="bsk-btn bsk-btn-secondary" onclick="window.cancelTacticalLineupEdit()">Avbryt</button>' : ''}
                `;
            } else {
                statusEl.innerHTML = '';
                actionsEl.innerHTML = '';
            }
        };

        window.applyTacticalLineupReadOnlyState = function() {
            const pitch = document.getElementById('full-pitch-container');
            const editable = window.isTacticalLineupEditable();
            if (pitch) pitch.classList.toggle('is-lineup-readonly', !editable);

            ['tactical-autofill-btn', 'tactical-clear-btn'].forEach(id => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.disabled = !editable;
                btn.classList.toggle('is-disabled', !editable);
            });

            document.querySelectorAll('.player-node').forEach(node => {
                node.classList.toggle('is-lineup-readonly', !editable);
            });

            ['captain', 'penalty', 'freekick', 'corners'].forEach(roleId => {
                const roleSelect = document.getElementById(`role-${roleId}`);
                if (roleSelect) roleSelect.disabled = !editable;
            });
        };

        window.requestEditTacticalLineup = function() {
            const enterEditMode = () => {
                window.tacticalLineupIsEditing = true;
                window.updateTacticalLineupControls();
                window.applyTacticalLineupReadOnlyState();
            };

            if (typeof window.customConfirm === 'function') {
                window.customConfirm('Rediger startellever', 'Startelleveren er allerede lagret. Vil du redigere den?', enterEditMode);
            } else if (confirm('Startelleveren er allerede lagret. Vil du redigere den?')) {
                enterEditMode();
            }
        };

        window.cancelTacticalLineupEdit = function() {
            const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : '';
            if (!matchId) return;
            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) return;

            loadTacticalLineupFromMatch(match);
            loadTacticalRolesFromMatch(match);
            TACTICAL_POSITIONS.forEach(pos => window.renderNodeVisually(window.tacticalLineup[pos], pos));
            window.drawChemistryLines();
            if (typeof window.renderBench === 'function') window.renderBench();
            if (typeof window.updateTacticalBoardStats === 'function') window.updateTacticalBoardStats();

            window.tacticalLineupIsEditing = false;
            window.updateTacticalLineupControls();
            window.applyTacticalLineupReadOnlyState();
        };

        window.saveTacticalLineup = async function() {
            if (typeof window.saveMatchTactics !== 'function') return;
            await window.saveMatchTactics();
            window.tacticalLineupIsEditing = false;
            window.updateTacticalLineupControls();
            window.applyTacticalLineupReadOnlyState();
        };

        window.getTacticalChemistryFilter = function() {
            const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : '';
            const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;

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
            if (!svgLayer) return;
            svgLayer.innerHTML = '';
            
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
                    coords: {
                        x1: parseFloat(node1.style.left),
                        y1: parseFloat(node1.style.top),
                        x2: parseFloat(node2.style.left),
                        y2: parseFloat(node2.style.top)
                    },
                    relevance: samspill.positionalRelevance,
                    focused: focusPos && (pair[0] === focusPos || pair[1] === focusPos)
                };
            }).filter(Boolean);

            pairResults
                .sort((a, b) => {
                    if (a.focused !== b.focused) return a.focused ? 1 : -1;
                    return b.relevance - a.relevance;
                })
                .slice(0, focusPos ? pairResults.length : 14)
                .forEach(entry => {
                    if (typeof window.appendSamspillLine === 'function') {
                        window.appendSamspillLine(svgLayer, entry.coords, entry.samspill, {
                            focused: entry.focused,
                            dimUnfocused: !!focusPos && !entry.focused,
                            coordUnit: '%'
                        });
                    }
                });
        };

        window.setTacticalPhase = function(phaseId) {
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

            const coords = tacticalPhases[phaseId];
            for (const [nodeId, pos] of Object.entries(coords)) {
                const node = document.getElementById('node-' + nodeId);
                if (node) { node.style.top = pos.top; node.style.left = pos.left; }
            }
            setTimeout(window.drawChemistryLines, 500); 
        };

        window.updateTacticalMatchSelector = function() {
            const select = document.getElementById('tacticalMatchSelect');
            if (!select) return;
            const currentSelectedValue = select.value;
            
            // Endret her til bare "Sandkasse"
            select.innerHTML = '<option value="">Sandkasse</option>';
            
            const sortedMatches = [...(window.activeMatches || [])].sort((a,b) => a.date.localeCompare(b.date));
            sortedMatches.forEach(m => {
                const opt = document.createElement('option'); opt.value = m.id;
                opt.innerText = `${new Date(m.date).toLocaleDateString('no-NO', {day:'2-digit', month:'2-digit'})} - vs ${m.opponent} (${m.matchGroup || 'A-lag'})`;
                select.appendChild(opt);
            });
            if (currentSelectedValue) select.value = currentSelectedValue;
        };

        window.loadMatchTactics = function() {
    const matchId = document.getElementById('tacticalMatchSelect').value;
    const rolesCard = document.getElementById('tactical-roles-card');
    const benchCard = document.getElementById('tactical-bench-card');
    
    if (!matchId) {
        if (rolesCard) rolesCard.classList.add('hidden');
        if (benchCard) benchCard.classList.add('hidden');
        window.tacticalLineupIsEditing = true;
        window.clearTacticalBoard();
        window.updateTacticalLineupControls();
        window.applyTacticalLineupReadOnlyState();
        return;
    }
    
    if (rolesCard) rolesCard.classList.remove('hidden');
    if (benchCard) benchCard.classList.remove('hidden');
    
    const match = (window.activeMatches || []).find(m => m.id === matchId);
    if (!match) return;

    const hasSaved = matchHasSavedTacticalLineup(match);
    window.tacticalLineupIsEditing = !hasSaved;

    loadTacticalLineupFromMatch(match);
    loadTacticalRolesFromMatch(match);
    
    TACTICAL_POSITIONS.forEach(pos => { window.renderNodeVisually(window.tacticalLineup[pos], pos); });
    window.drawChemistryLines();
    
    if (typeof window.renderBench === 'function') window.renderBench();
    if (typeof window.updateTacticalBoardStats === 'function') window.updateTacticalBoardStats();
    window.updateTacticalLineupControls();
    window.applyTacticalLineupReadOnlyState();
};

        window.saveMatchTactics = async function() {
            const matchId = document.getElementById('tacticalMatchSelect').value;
            if (!matchId) return;
            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) return;
            
            match.lineup = window.tacticalLineup;
            match.lineupRefs = Object.fromEntries(
                Object.entries(window.tacticalLineup || {}).map(([pos, player]) => [
                    pos,
                    player ? (window.getPlayerStorageKey?.(player) || player.id || player.navn || '') : ''
                ])
            );
            match.roles = {
                captain: document.getElementById('role-captain') ? document.getElementById('role-captain').value : '',
                penalty: document.getElementById('role-penalty') ? document.getElementById('role-penalty').value : '',
                freekick: document.getElementById('role-freekick') ? document.getElementById('role-freekick').value : '',
                corners: document.getElementById('role-corners') ? document.getElementById('role-corners').value : ''
            };

            try {
                if (typeof window.saveMatchToDatabase === 'function') {
                    await window.saveMatchToDatabase(match);
                }
            } catch (error) {
                console.error(error);
                alert(error.message);
                return;
            }
            
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => window.renderNodeVisually(window.tacticalLineup[pos], pos));
            
            // NYTT: Oppdater benken live når lagoppstillingen endrer seg
            if (typeof window.renderBench === 'function') window.renderBench();
        };

        window.renderBench = function() {
    const benchList = document.getElementById('tactical-bench-list');
    if (!benchList) return;
    benchList.innerHTML = '';

    const matchId = document.getElementById('tacticalMatchSelect').value;
    if (!matchId) return; 

    const match = (window.activeMatches || []).find(m => m.id === matchId);
    if (!match) return;

    const suspData = typeof window.getDisciplineStatusForTeam === 'function' ? window.getDisciplineStatusForTeam(match.matchGroup, match.date) : {};

    const teamName = match.matchGroup;
    const players = Array.isArray(window.activePlayers) ? window.activePlayers : [];
    
    let teamPlayers = players.filter(p => p.spillerLag === teamName && p.status !== 'Passiv');
    if (teamPlayers.length === 0) teamPlayers = players.filter(p => p.status !== 'Passiv'); 

    const startingPlayerNames = Object.values(window.tacticalLineup).filter(p => p !== null).map(p => p.navn);

    const benchPlayers = teamPlayers.filter(p => {
        const starterIKampen = startingPlayerNames.includes(p.navn);
        const erBekreftetKlar = window.isPlayerAttending(match.attendance, p);
        return !starterIKampen && erBekreftetKlar;
    });

    if (benchPlayers.length === 0) {
        benchList.innerHTML = '<p class="text-xs text-slate-400 italic col-span-2 py-2">Ingen tilgjengelige innbyttere på benken.</p>';
        return;
    }

    benchPlayers.sort((a, b) => window.calculatePlayerPerformanceChemistry(b.navn) - window.calculatePlayerPerformanceChemistry(a.navn));

    benchPlayers.forEach(p => {
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

        const pSusp = window.getDisciplineStatusForPlayer(suspData, p);
        let benchSuspBadge = '';
        let borderClass = 'border-slate-200/60';
        if (pSusp.isSuspended) {
            benchSuspBadge = `<span class="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black ml-2 animate-pulse" title="${escapeTacticalHtml(pSusp.reason)}">KARANTENE</span>`;
            borderClass = 'border-rose-300 bg-rose-50';
        } else if (pSusp.isAtRisk) {
            benchSuspBadge = `<span class="text-[8px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full font-black ml-2" title="Faresone: ${escapeTacticalHtml(pSusp.yellows)} gule i serie. Karantene ved ${escapeTacticalHtml(pSusp.nextKaranteneAt || 4)}.">FARESONE</span>`;
        }

        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(p) : { isInjured: false };
        if (injuryInfo.isInjured) {
            benchSuspBadge += `<span class="text-[8px] ${injuryInfo.type === 'langvarig' ? 'bg-rose-600' : 'bg-orange-500'} text-white px-1.5 py-0.5 rounded-full font-black ml-2" title="${escapeTacticalHtml(injuryInfo.label)}">${escapeTacticalHtml(injuryInfo.shortLabel)}</span>`;
        }

        const div = document.createElement('div');
        div.className = `flex justify-between items-center bg-slate-50 border ${borderClass} p-2.5 rounded-xl shadow-sm`;
        div.innerHTML = `
            <div class="flex items-center min-w-0">
                <span class="font-bold ${pSusp.isSuspended ? 'text-rose-900' : 'text-slate-800'} truncate text-xs">${escapeTacticalHtml(p.navn)}</span>
                ${benchSuspBadge}
            </div>
            <div class="flex items-center gap-3 shrink-0 ml-2">
                <span class="font-black text-xs ${bonusColor}" title="Kampbidrag">${bonusTekst}</span>
                <div class="w-px h-3 bg-slate-300"></div>
                <span class="font-black text-xs ${chemColor}" title="Form">${playerChem}/100</span>
            </div>
        `;
        benchList.appendChild(div);
    });
};

        window.renderNodeVisually = function(playerObj, posId) {
    const node = document.getElementById('node-' + posId);
    if (!node) return;
    
    // Fjerner gamle farger
    node.classList.remove('bg-bsk-yellow', 'text-bsk-blue', 'border-white', 'bg-bsk-blue', 'text-white', 'border-2', 'border-[3px]', 'border-bsk-yellow/60', 'border-emerald-500', 'border-yellow-500', 'border-amber-500', 'border-orange-500', 'border-rose-500', 'border-slate-300');

    if (playerObj === null || playerObj === undefined) {
        node.innerHTML = `<span class="player-node-pos">${escapeTacticalHtml(posId)}</span>`;
        node.classList.add('bg-bsk-blue', 'text-white', 'border-2', 'border-bsk-yellow/60');
    } else {
        // Henter fornavn og legger til initialen fra etternavnet (uten punktum) hvis det finnes
        const nameParts = (playerObj.navn || '').split(' ');
        const displayBottomName = escapeTacticalHtml(nameParts[0] + (nameParts.length > 1 ? ' ' + nameParts[nameParts.length - 1].charAt(0) : ''));

        const playerChem = window.calculatePlayerPerformanceChemistry(playerObj.navn);
        
        const kampbonus = typeof window.getPlayerKampbidragSnitt === 'function'
            ? window.getPlayerKampbidragSnitt(playerObj)
            : 0;
        const bonusTekst = kampbonus > 0 ? kampbonus : '-';
        
        let bonusValueClass = 'player-node-value';
        if (kampbonus <= 0) bonusValueClass += ' is-muted';
        else if (kampbonus > 15) bonusValueClass += ' is-high';
        else if (kampbonus >= 10) bonusValueClass += ' is-mid';
        else bonusValueClass += ' is-low';

        // --- NYTT: Sjekk om vi er i sandkassen ---
        const matchSelect = document.getElementById('tacticalMatchSelect');
        const isSandbox = !matchSelect || matchSelect.value === '';

        let badgesHtml = '<div class="absolute -top-2 flex gap-0.5 justify-center z-20 pointer-events-none">';
        
        // Viser bare kaptein, straffe, frispark og corner hvis det ER en spesifikk kamp
        if (!isSandbox) {
            const capValue = document.getElementById('role-captain') ? document.getElementById('role-captain').value : '';
            const penValue = document.getElementById('role-penalty') ? document.getElementById('role-penalty').value : '';
            const fkValue = document.getElementById('role-freekick') ? document.getElementById('role-freekick').value : '';
            const cornValue = document.getElementById('role-corners') ? document.getElementById('role-corners').value : '';
            
            if (window.playerRefMatches(capValue, playerObj) || (!capValue && playerObj.isCaptain)) badgesHtml += `<span class="bg-amber-400 text-bsk-blue text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Kaptein">C</span>`;
            if (window.playerRefMatches(penValue, playerObj)) badgesHtml += `<span class="bg-emerald-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Straffer">P</span>`;
            if (window.playerRefMatches(fkValue, playerObj)) badgesHtml += `<span class="bg-blue-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Frispark">F</span>`;
            if (window.playerRefMatches(cornValue, playerObj)) badgesHtml += `<span class="bg-purple-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Cornere">📐</span>`;
        }

        // Viser advarsler (gule/røde kort osv.) uavhengig om det er sandkasse eller kamp
        const cardCounts = typeof window.getPlayerCardCounts === 'function'
            ? window.getPlayerCardCounts(playerObj.navn, playerObj.spillerLag)
            : { serie: { gule: 0 } };
        const serieHint = typeof window.getSerieYellowDisciplineHint === 'function'
            ? window.getSerieYellowDisciplineHint(cardCounts.serie.gule)
            : { isAtRisk: false };
        if (serieHint.isAtRisk) {
            badgesHtml += `<span class="bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900 animate-pulse" title="Faresone i serie: ${cardCounts.serie.gule} gule kort. Karantene ved ${serieHint.nextSuspensionAt}.">⚠️</span>`;
        }
        badgesHtml += '</div>';

        // 2. BEREGN FORM (Fargen på rammen rundt rundingen)
        const borderClass = typeof window.getFormScoreBorderClass === 'function'
            ? window.getFormScoreBorderClass(playerChem, playerObj.spillerLag)
            : 'border-slate-300';

        node.innerHTML = `
            ${badgesHtml}
            <span class="${bonusValueClass}" title="Kampbidrag">${bonusTekst}</span>
            <div class="absolute -bottom-5 flex flex-col items-center pointer-events-none z-10">
                <span class="player-node-name text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-md">${displayBottomName}</span>
            </div>
        `;
        node.classList.add('bg-bsk-blue', 'border-[3px]', borderClass);
    }
};

        window.choosePlayer = function(playerObj, posId) {
            window.tacticalLineup[posId] = playerObj;
            window.renderNodeVisually(playerObj, posId);
            window.drawChemistryLines();
            window.updateTacticalBoardStats();
            window.closePlayerSelect();
        };

        window.openPlayerSelect = function(posId) {
    if (!window.isTacticalLineupEditable()) return;
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

    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);
    
    // Hent disiplinærstatus for denne kampen
    const suspData = (typeof window.getDisciplineStatusForTeam === 'function' && currentMatch) ? window.getDisciplineStatusForTeam(currentMatch.matchGroup, currentMatch.date) : {};

   // Henter alle spillere, FJERNER de passive, og sorterer deretter
    const sortedPlayers = [...(window.activePlayers || [])]
        .filter(p => p.status !== 'Passiv')
        .sort((a,b) => {
            if (currentMatch && currentMatch.attendance) {
                const valA = window.getAttendanceForPlayer(currentMatch.attendance, a) === true ? 2 : (window.getAttendanceForPlayer(currentMatch.attendance, a) === false ? 0 : 1);
                const valB = window.getAttendanceForPlayer(currentMatch.attendance, b) === true ? 2 : (window.getAttendanceForPlayer(currentMatch.attendance, b) === false ? 0 : 1);
                if (valA !== valB) return valB - valA;
            }
            return a.navn.localeCompare(b.navn);
        });

    sortedPlayers.forEach(p => {
        const isPlaying = Object.values(window.tacticalLineup).some(player => player && player.id === p.id);
        let attStatusHtml = '', opacityClass = isPlaying ? 'opacity-40 bg-slate-50' : 'hover:bg-bsk-blue/5 border border-transparent hover:border-bsk-blue/20', trengerBekreftelse = false;

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

        if (currentMatch) {
            const att = window.getAttendanceForPlayer(currentMatch.attendance, p);
            if (att === true && !pSusp.isSuspended) attStatusHtml += '<span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold ml-2">✅ KLAR</span>';
            else if (att === false) {
                attStatusHtml += '<span class="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold ml-2">❌ FORFALL</span>'; trengerBekreftelse = true;
                if (!isPlaying && !pSusp.isSuspended) opacityClass = 'opacity-50 grayscale bg-slate-50';
            } else if (isAttendanceStarted) {
                attStatusHtml += '<span class="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-2">❓ IKKE SVART</span>'; trengerBekreftelse = true;
                if (!isPlaying && !pSusp.isSuspended) opacityClass = 'opacity-50 bg-slate-50';
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
            else if (!pSusp.isSuspended && trengerBekreftelse && !confirm(`${p.navn} er ikke bekreftet til denne kampen. Vil du sette ham på banen likevel?`)) return;
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
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => window.choosePlayer(null, pos));
            window.updateTacticalBoardStats();
        }

        window.autoFillTeam = function() {
    if (!window.isTacticalLineupEditable()) return;
    window.clearTacticalBoard(); 
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv') return false;
        if (currentMatch && isAttendanceStarted && !window.isPlayerAttending(currentMatch.attendance, p)) return false;
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

    priorityOrder.forEach(req => {
        let candidates = availablePlayers.filter(p => req.pos.includes(p.pos1) || req.pos.includes(p.pos2));
        if (candidates.length === 0 && availablePlayers.length > 0) candidates = [...availablePlayers];

        if (candidates.length > 0) {
            candidates.sort((a, b) => {
                // Gir -5 poeng i trekk hvis posisjonen krever en bestemt fot, og spilleren har feil fot (og ikke spiller med 'Begge')
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
    
    // --- 1. BEREGN FOR DE SOM FAKTISK STÅR PÅ BANEN NÅ ---
    let realTotalBonus = 0; // Dette blir nå en REN SUM av spillernes individuelle kampsnitt
    let realTotalChem = 0;
    let currentOnBoardCount = 0;
    
    Object.values(window.tacticalLineup).forEach(playerObj => {
        if (playerObj && playerObj.navn) {
            currentOnBoardCount++;
            
            const playerFormSnitt = typeof window.getPlayerKampbidragSnitt === 'function'
                ? window.getPlayerKampbidragSnitt(playerObj)
                : 0;
            
            // NYTT: Summerer kampsnittet til alle som er valgt utpå banen
            realTotalBonus += playerFormSnitt;
            
            // Reell form (0-100 per spiller)
            realTotalChem += typeof window.calculatePlayerPerformanceChemistry === 'function' 
                ? window.calculatePlayerPerformanceChemistry(playerObj.navn) 
                : 0;
        }
    });

    // Formscoren vises fortsatt som et rent lag-snitt (f.eks. 42/46)
    const realChemSnitt = currentOnBoardCount > 0 ? Math.round(realTotalChem / currentOnBoardCount) : 0;

    // --- 2. BEREGN REELL MAKS FOR TROPPEN (GULLREKKA BASERT PÅ TILGJENGELIGHET) ---
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    // Hent alle tilgjengelige spillere til akkurat denne kampen/økten
    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv') return false;
        if (currentMatch && isAttendanceStarted && !window.isPlayerAttending(currentMatch.attendance, p)) return false;
        return true;
    });

    // Hjelpefunksjon for å hente en spillers kampsnitt
    const getPlayerFormSnitt = (pObj) => (
        typeof window.getPlayerKampbidragSnitt === 'function'
            ? window.getPlayerKampbidragSnitt(pObj)
            : 0
    );

    // Splitt i keepere og utespillere for å låse keepervalget
    let keepere = availablePlayers.filter(p => p.pos1 === 'Keeper' || (p.pos1 && p.pos1.toLowerCase().includes('keeper')));
    let utespillere = availablePlayers.filter(p => p.pos1 !== 'Keeper' && !(p.pos1 && p.pos1.toLowerCase().includes('keeper')));

    // -- BEREGN MAKS KAMPBONUS (SUMMEN AV DE 11 BESTE ENKELT-SNITTENE) --
    let maxBonusSumPool = 0;
    
    // 1. Finn og legg til den beste keeperen
    if (keepere.length > 0) {
        const sortedKeepersByForm = [...keepere].sort((a, b) => getPlayerFormSnitt(b) - getPlayerFormSnitt(a));
        maxBonusSumPool += getPlayerFormSnitt(sortedKeepersByForm[0]);
    }
    
    // 2. Sorter utespillere etter kampsnitt og legg til de 10 beste
    const sortedOutfieldsByForm = [...utespillere].sort((a, b) => getPlayerFormSnitt(b) - getPlayerFormSnitt(a));
    let targetOutfieldBonusCount = keepere.length > 0 ? 10 : 11;
    
    sortedOutfieldsByForm.slice(0, targetOutfieldBonusCount).forEach(p => {
        maxBonusSumPool += getPlayerFormSnitt(p);
    });

    // -- BEREGN MAKS KJEMI-SNITT (FORTSATT SOM RENT LAGSNITT) --
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

    // --- 3. OPPDATER SKJERMEN ---
    if (totalBonusEl) {
        totalBonusEl.innerText = currentOnBoardCount > 0 ? `${realTotalBonus}/${maxBonusSumPool}` : `0/${maxBonusSumPool}`;
    }
    if (avgChemEl) {
        avgChemEl.innerText = currentOnBoardCount > 0 ? `${realChemSnitt}/${maxChemSnitt}` : `0/${maxChemSnitt}`;
    }
};
