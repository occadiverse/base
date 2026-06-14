        // ==========================================
        // ===== TAKTIKK OG KJEMI (NY DEL) =====
        // ==========================================
        const tacticalPhases = {
            fase1: { 'GK': { top: '94%', left: '50%' }, 'VMS': { top: '95%', left: '34%' }, 'HMS': { top: '95%', left: '66%' }, 'VB': { top: '85%', left: '16%' }, 'HB': { top: '85%', left: '84%' }, 'DM': { top: '80%', left: '63%' }, 'OM': { top: '80%', left: '37%' }, 'PM': { top: '55%', left: '60%' }, 'VK': { top: '50%', left: '5%' }, 'HK': { top: '50%', left: '95%' }, 'SP': { top: '50%', left: '40%' } },
            fase2: { 'GK': { top: '88%', left: '50%' }, 'VMS': { top: '70%', left: '35%' }, 'HMS': { top: '70%', left: '65%' }, 'VB': { top: '58%', left: '20%' }, 'HB': { top: '58%', left: '80%' }, 'DM': { top: '58%', left: '50%' }, 'OM': { top: '45%', left: '35%' }, 'PM': { top: '45%', left: '65%' }, 'VK': { top: '35%', left: '5%' }, 'HK': { top: '35%', left: '95%' }, 'SP': { top: '30%', left: '50%' } },
            fase3: { 'GK': { top: '80%', left: '50%' }, 'VMS': { top: '50%', left: '33%' }, 'HMS': { top: '50%', left: '67%' }, 'VB': { top: '35%', left: '20%' }, 'HB': { top: '35%', left: '80%' }, 'DM': { top: '35%', left: '50%' }, 'OM': { top: '22%', left: '30%' }, 'PM': { top: '22%', left: '70%' }, 'VK': { top: '15%', left: '10%' }, 'HK': { top: '15%', left: '90%' }, 'SP': { top: '15%', left: '50%' } }
        };

        window.getDuoChemistry = function(playerA, playerB) {
            if (!playerA || !playerB) return 0;
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            let shared = 0, either = 0;
            allEvents.forEach(e => {
                if (e.attendance) {
                    const aPresent = window.isPlayerAttending(e.attendance, playerA);
                    const bPresent = window.isPlayerAttending(e.attendance, playerB);
                    if (aPresent || bPresent) either++; if (aPresent && bPresent) shared++;
                }
            });
            return either > 0 ? Math.round((shared / either) * 100) : 0;
        }

        window.drawChemistryLines = function() {
            const svgLayer = document.getElementById('chemistry-lines-layer');
            if (!svgLayer) return;
            svgLayer.innerHTML = '';
            
            const phaseConnections = {
                fase1: [ ['VMS', 'HMS'], ['VMS', 'VB'], ['HMS', 'HB'], ['VMS', 'OM'], ['HMS', 'DM'], ['VB', 'OM'], ['VB', 'VK'], ['DM', 'OM'], ['HB', 'DM'], ['HB', 'HK'], ['OM', 'VK'], ['OM', 'SP'], ['VK', 'SP'], ['SP', 'PM'], ['PM', 'DM'], ['HK', 'DM'], ['HK', 'PM'] ],
                fase2: [ ['VMS', 'HMS'], ['VMS', 'VB'], ['VMS', 'GK'], ['VMS', 'DM'], ['HMS', 'HB'], ['HMS', 'GK'], ['HMS', 'DM'], ['VB', 'VK'], ['VB', 'OM'], ['VB', 'DM'], ['HB', 'HK'], ['HB', 'PM'], ['HB', 'DM'], ['VK', 'SP'], ['VK', 'OM'], ['HK', 'PM'], ['HK', 'SP'], ['PM', 'SP'], ['PM', 'DM'], ['PM', 'OM'], ['SP', 'OM'], ['OM', 'DM'] ],
                fase3: [ ['VB', 'VK'], ['HB', 'HK'], ['VB', 'VMS'], ['HB', 'HMS'], ['GK', 'VMS'], ['GK', 'HMS'], ['VK', 'SP'], ['HK', 'SP'], ['HK', 'PM'], ['VK', 'OM'], ['OM', 'SP'], ['PM', 'SP'], ['OM', 'PM'], ['OM', 'VB'], ['PM', 'HB'], ['DM', 'OM'], ['DM', 'PM'], ['DM', 'VB'], ['DM', 'HB'], ['DM', 'VMS'], ['DM', 'HMS'], ['VMS', 'HMS'] ]
            };

            const connections = phaseConnections[currentTacticalPhase] || phaseConnections.fase2;

            connections.forEach(pair => {
                const player1 = window.tacticalLineup[pair[0]];
                const player2 = window.tacticalLineup[pair[1]];
                if (player1 && player2) {
                    const chemScore = window.getDuoChemistry(player1.navn, player2.navn);
                    const node1 = document.getElementById('node-' + pair[0]);
                    const node2 = document.getElementById('node-' + pair[1]);
                    
                    if (node1 && node2 && node1.style.top && node2.style.top) {
                        let strokeWidth = 3; 
                        let strokeColor = 'rgba(244, 63, 94, 0.8)'; // RØD (< 50%)               
                        if (chemScore >= 75) {
                            strokeColor = 'rgba(16, 185, 129, 0.9)'; // GRØNN (75 - 100%)
                        } else if (chemScore >= 50) {
                            strokeColor = 'rgba(255, 215, 0, 0.9)'; // GUL (50 - 74%)
                        } else if (chemScore === 0) { 
                            strokeColor = 'rgba(18, 63, 115, 0.28)'; // Svak BSK-blå stiplet
                            strokeWidth = 1.5; 
                        }

                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', parseFloat(node1.style.left) + '%'); line.setAttribute('y1', parseFloat(node1.style.top) + '%');
                        line.setAttribute('x2', parseFloat(node2.style.left) + '%'); line.setAttribute('y2', parseFloat(node2.style.top) + '%');
                        line.setAttribute('stroke', strokeColor); line.setAttribute('stroke-width', strokeWidth); line.setAttribute('stroke-linecap', 'round');
                        if (chemScore === 0) line.setAttribute('stroke-dasharray', '5,5');
                        line.setAttribute('class', 'transition-all duration-500'); 
                        svgLayer.appendChild(line);
                    }
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
        window.clearTacticalBoard();
        return;
    }
    
    if (rolesCard) rolesCard.classList.remove('hidden');
    if (benchCard) benchCard.classList.remove('hidden');
    
    const match = (window.activeMatches || []).find(m => m.id === matchId);
    const playedMatches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!match) return;
    
    window.tacticalLineup = {};
    const positions = ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'];
    const savedLineup = match.lineup || {};
    positions.forEach(pos => { window.tacticalLineup[pos] = savedLineup[pos] || null; });
    
    const roles = ['captain', 'penalty', 'freekick', 'corners'];
    const players = Array.isArray(window.activePlayers) ? [...window.activePlayers].filter(p => p.status !== 'Passiv') : [];
    const sortedPlayers = players.sort((a,b) => a.navn.localeCompare(b.navn));
    
    roles.forEach(roleId => {
        const roleSelect = document.getElementById(`role-${roleId}`);
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="">-- Velg spiller --</option>';
            sortedPlayers.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = p.navn;
                roleSelect.appendChild(opt);
            });
            const roleRef = match.roles ? match.roles[roleId] : '';
            roleSelect.value = window.findPlayerByRef(roleRef)?.id || roleRef || '';
        }
    });
    
    positions.forEach(pos => { window.renderNodeVisually(window.tacticalLineup[pos], pos); });
    window.drawChemistryLines();
    
    if (typeof window.renderBench === 'function') window.renderBench();
    
    // NYTT: Dette er linjen som fikser problemet ditt! Den tvinger koden 
    // til å oppdatere tallene øverst på banen i det kampen lastes inn.
    if (typeof window.updateTacticalBoardStats === 'function') window.updateTacticalBoardStats();
};

        window.saveMatchTactics = function() {
            const matchId = document.getElementById('tacticalMatchSelect').value;
            if (!matchId) return;
            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) return;
            
            match.lineup = window.tacticalLineup;
            match.roles = {
                captain: document.getElementById('role-captain') ? document.getElementById('role-captain').value : '',
                penalty: document.getElementById('role-penalty') ? document.getElementById('role-penalty').value : '',
                freekick: document.getElementById('role-freekick') ? document.getElementById('role-freekick').value : '',
                corners: document.getElementById('role-corners') ? document.getElementById('role-corners').value : ''
            };
            if (typeof window.saveMatchToDatabase === 'function') window.saveMatchToDatabase(match);
            
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

        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === p.spillerLag && window.isPlayerAttending(m.attendance, p)) {
                kamper++; 
                totalMatchPoints += window.calculatePlayerMatchPoints(m, p.navn);
            }
        });
        
        const kampbonus = kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
        let bonusColor = 'text-slate-400'; 
        if (kampbonus > 15) bonusColor = 'text-emerald-500'; 
        else if (kampbonus >= 10) bonusColor = 'text-amber-500'; 
        else if (kampbonus > 0) bonusColor = 'text-rose-500'; 
        const bonusTekst = kamper > 0 ? kampbonus : '-';

        const pSusp = window.getDisciplineStatusForPlayer(suspData, p);
        let benchSuspBadge = '';
        let borderClass = 'border-slate-200/60';
        if (pSusp.isSuspended) {
            benchSuspBadge = `<span class="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black ml-2 animate-pulse" title="${pSusp.reason}">KARANTENE</span>`;
            borderClass = 'border-rose-300 bg-rose-50';
        } else if (pSusp.isAtRisk) {
            benchSuspBadge = `<span class="text-[8px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full font-black ml-2" title="Faresone: ${pSusp.yellows} gule i serie. Karantene ved ${pSusp.nextKaranteneAt || 4}.">FARESONE</span>`;
        }

        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(p) : { isInjured: false };
        if (injuryInfo.isInjured) {
            benchSuspBadge += `<span class="text-[8px] ${injuryInfo.type === 'langvarig' ? 'bg-rose-600' : 'bg-orange-500'} text-white px-1.5 py-0.5 rounded-full font-black ml-2" title="${injuryInfo.label}">${injuryInfo.shortLabel}</span>`;
        }

        const div = document.createElement('div');
        div.className = `flex justify-between items-center bg-slate-50 border ${borderClass} p-2.5 rounded-xl shadow-sm`;
        div.innerHTML = `
            <div class="flex items-center min-w-0">
                <span class="font-bold ${pSusp.isSuspended ? 'text-rose-900' : 'text-slate-800'} truncate text-xs">${p.navn}</span>
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
        node.innerHTML = `<span class="text-[10px] font-bold">${posId}</span>`;
        node.classList.add('bg-bsk-blue', 'text-white', 'border-2', 'border-bsk-yellow/60');
    } else {
        // Henter fornavn og legger til initialen fra etternavnet (uten punktum) hvis det finnes
        const nameParts = playerObj.navn.split(' ');
        let displayBottomName = nameParts[0];
        if (nameParts.length > 1) {
            displayBottomName += ' ' + nameParts[nameParts.length - 1].charAt(0);
        }

        const playerChem = window.calculatePlayerPerformanceChemistry(playerObj.navn);
        
        // 1. BEREGN KAMPBIDRAG (tallet i midten av rundingen)
        let kamper = 0;
        let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === playerObj.spillerLag && window.isPlayerAttending(m.attendance, playerObj)) {
                kamper++;
                totalMatchPoints += window.calculatePlayerMatchPoints(m, playerObj.navn);
            }
        });
        
        const kampbonus = kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
        const bonusTekst = kamper > 0 ? kampbonus : '-';
        
        // Fargen på tallet i midten (Lyser opp mot den mørkeblå bakgrunnen)
        let bonusTextColor = 'text-slate-300';
        if (kamper > 0) {
            if (kampbonus > 15) bonusTextColor = 'text-emerald-400'; // Grønn form
            else if (kampbonus >= 10) bonusTextColor = 'text-amber-400'; // Gul/Stabil form
            else bonusTextColor = 'text-rose-400'; // Rød/Dårlig form
        }

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
            <span class="text-[14px] font-black tracking-tight z-10 ${bonusTextColor}" title="Kampbidrag">${bonusTekst}</span>
            <div class="absolute -bottom-5 flex flex-col items-center pointer-events-none z-10">
                <span class="text-[9px] font-bold text-bsk-blue whitespace-nowrap bg-white/90 border border-bsk-blue/10 shadow-sm px-1.5 py-0.5 rounded-md">${displayBottomName}</span>
            </div>
        `;
        node.classList.add('bg-bsk-blue', 'text-white', 'border-[3px]', borderClass);
    }
};

        window.choosePlayer = function(playerObj, posId) {
            window.tacticalLineup[posId] = playerObj;
            window.renderNodeVisually(playerObj, posId);
            window.drawChemistryLines();
            window.updateTacticalBoardStats();
            window.closePlayerSelect();

            if (document.getElementById('tacticalMatchSelect') && document.getElementById('tacticalMatchSelect').value) {
                if (typeof window.saveMatchTactics === 'function') window.saveMatchTactics();
            }
        };

        window.openPlayerSelect = function(posId) {
    currentSelectPos = posId;
    const modal = document.getElementById('tacticalPlayerModal');
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
            attStatusHtml += `<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black ml-2 animate-pulse shadow-sm" title="${pSusp.reason}">🚫 KARANTENE</span>`;
            opacityClass = 'opacity-60 bg-rose-50 border border-rose-200';
        } else if (pSusp.isAtRisk) {
            attStatusHtml += `<span class="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-black ml-2 shadow-sm" title="Faresone: ${pSusp.yellows} gule i serie. Karantene ved ${pSusp.nextKaranteneAt || 4}.">⚠️ FARESONE</span>`;
        }

        const injuryInfo = typeof window.getPlayerInjuryInfo === 'function' ? window.getPlayerInjuryInfo(p) : { isInjured: false };
        if (injuryInfo.isInjured) {
            const injuryClass = injuryInfo.type === 'langvarig'
                ? 'bg-rose-600 text-white'
                : 'bg-orange-500 text-white';
            attStatusHtml += `<span class="text-[9px] ${injuryClass} px-1.5 py-0.5 rounded font-black ml-2 shadow-sm" title="${injuryInfo.label}">🩹 ${injuryInfo.shortLabel}</span>`;
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

        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === p.spillerLag && window.isPlayerAttending(m.attendance, p)) {
                kamper++; 
                totalMatchPoints += window.calculatePlayerMatchPoints(m, p.navn);
            }
        });
        
        const kampbonus = kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
        let bonusColor = 'text-slate-400';
        if (kampbonus > 15) bonusColor = 'text-emerald-500';
        else if (kampbonus >= 10) bonusColor = 'text-amber-500';
        else if (kampbonus > 0) bonusColor = 'text-rose-500';
        const bonusTekst = kamper > 0 ? kampbonus : '-';

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
                    <p class="font-bold text-slate-800 text-sm truncate mr-1">${p.navn}</p>
                    ${attStatusHtml}
                </div>
                <p class="text-[10px] text-slate-500 font-medium">${p.pos1 || 'Ukjent pos'} ${p.draktnummer ? ' | #' + p.draktnummer : ''}</p>
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
        clearDiv.innerHTML = `<i class="fa-solid fa-user-minus"></i> Fjern spiller fra ${posId}`;
        list.appendChild(clearDiv);
    }
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

        window.closePlayerSelect = function() {
            document.getElementById('tacticalPlayerModal').classList.add('hidden');
            document.getElementById('tacticalPlayerModal').classList.remove('flex');
            currentSelectPos = null;
        }

        window.clearTacticalBoard = function() {
            window.tacticalLineup = {};
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => window.choosePlayer(null, pos));
            window.updateTacticalBoardStats();
        }

        window.autoFillTeam = function() {
    window.clearTacticalBoard(); 
    const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv' || (filterLag !== 'Alle' && p.spillerLag !== filterLag)) return false;
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

    // Hjelpefunksjon for å la tryllestaven beregne formen (kampbonus) til spillerne
    const getKampbonus = (pObj) => {
        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === pObj.spillerLag && window.isPlayerAttending(m.attendance, pObj)) {
                kamper++; 
                totalMatchPoints += window.calculatePlayerMatchPoints(m, pObj.navn);
            }
        });
        return kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
    };

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

    if (matchId && typeof window.saveMatchTactics === 'function') window.saveMatchTactics();
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
            
            // Kampbonus for denne spilleren (snitt per kamp)
            let kamper = 0;
            let totalMatchPoints = 0;
            (window.activeMatches || []).forEach(m => {
                if (m.matchGroup === playerObj.spillerLag && window.isPlayerAttending(m.attendance, playerObj)) {
                    kamper++;
                    totalMatchPoints += window.calculatePlayerMatchPoints(m, playerObj.navn);
                }
            });
            let playerFormSnitt = kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
            
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
    const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    // Hent alle tilgjengelige spillere til akkurat denne kampen/økten
    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv' || (filterLag !== 'Alle' && p.spillerLag !== filterLag)) return false;
        if (currentMatch && isAttendanceStarted && !window.isPlayerAttending(currentMatch.attendance, p)) return false;
        return true;
    });

    // Hjelpefunksjon for å hente en spillers kampsnitt
    const getPlayerFormSnitt = (pObj) => {
        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === pObj.spillerLag && window.isPlayerAttending(m.attendance, pObj)) {
                kamper++; 
                totalMatchPoints += window.calculatePlayerMatchPoints(m, pObj.navn);
            }
        });
        return kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
    };

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
