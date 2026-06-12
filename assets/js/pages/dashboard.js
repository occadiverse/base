window.updateDashboard = function() {
    let upcoming = [], totalGoals = 0, wins = 0, played = 0, draws = 0, losses = 0;
    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    
    matches.forEach(m => {
        const score = window.parseScore(m.result);
        if (score !== null) {
            played++; totalGoals += score.bsk;
            if (score.bsk > score.opponent) wins++;
            else if (score.bsk === score.opponent) draws++;
            else losses++;
        } else upcoming.push(m);
    });

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    const heroContainer = document.getElementById('hjem-hero-match-container');
    const dangerZoneContainer = document.getElementById('hjem-suspensions-danger-zone');
    
    if (heroContainer) {
        if (upcoming.length > 0) {
            const nm = upcoming[0];
            const d = new Date(nm.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
            
            // Henter ut karantener
            const teamSuspensions = typeof window.getDisciplineStatusForTeam === 'function' ? window.getDisciplineStatusForTeam(nm.matchGroup, nm.date) : {};
            const suspendedPlayers = Object.keys(teamSuspensions).filter(p => teamSuspensions[p].isSuspended);
            
            // Henter meldte forfall
            const forfallPlayers = [];
            if (nm.attendance) {
                Object.entries(nm.attendance).forEach(([pName, isReady]) => {
                    if (isReady === false) forfallPlayers.push(pName);
                });
            }

            // Oppdaterer den dedikerte "Utilgjengelig"-boksen til høyre på forsiden
            if (dangerZoneContainer) {
                dangerZoneContainer.innerHTML = '';
                if (suspendedPlayers.length === 0 && forfallPlayers.length === 0) {
                    dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Alle mann er meldt klare og tilgjengelige! 🦅</p>`;
                } else {
                    suspendedPlayers.forEach(p => {
                        const s = teamSuspensions[p];
                        const badgeColor = s.cardType === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900';
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-rose-50 border border-rose-100 p-2 rounded-xl text-xs font-bold text-rose-900 shadow-sm">
                                <span class="truncate">🚨 ${p}</span>
                                <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-black shrink-0">KARANTENE</span>
                            </div>`;
                    });
                    forfallPlayers.forEach(p => {
                        dangerZoneContainer.innerHTML += `
                            <div class="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-500">
                                <span class="truncate">❌ ${p}</span>
                                <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black shrink-0">MELDT FORFALL</span>
                            </div>`;
                    });
                }
            }

            // --- OPPGRADERTE KLIKKBAR BADGE (Tar deg rett til kampen) ---
            let herosuspensionBadgeHtml = '';
            if (suspendedPlayers.length > 0) {
                // Vi har lagt til onclick, cursor-pointer og fjernet den gamle title-teksten
                herosuspensionBadgeHtml = `
                    <span onclick="event.stopPropagation(); switchTab('kamper'); showMatchDetails('${nm.id}')" 
                          class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse border border-white/20 cursor-pointer z-20 hover:bg-red-700 hover:scale-115 transition-all" 
                          title="Karantene registrert! Klikk for å se hvem.">
                        ${suspendedPlayers.length}
                    </span>
                `;
            }

            // HTML for det rendyrkede kampbanneret
            heroContainer.innerHTML = `
                <section class="dashboard-hero-card rounded-2xl p-6 md:p-8 text-slate-900 relative overflow-hidden border border-b-4 border-bsk-yellow group">
                    <div class="absolute right-0 bottom-0 translate-y-8 translate-x-8 opacity-5 pointer-events-none z-0 text-bsk-blue">
                        <i class="fa-solid fa-shield-halved text-[22rem]"></i>
                    </div>
                    
                    <div class="relative z-10 space-y-6 max-w-5xl mx-auto">
                        <div class="flex justify-between items-center border-b border-slate-200 pb-3">
                            <div class="flex items-center gap-2">
                                <div class="portal-status-label relative">
                                    <i class="fa-solid fa-futbol animate-spin" style="animation-duration: 4s;"></i>
                                    <span>NESTE KAMP</span>
                                    ${herosuspensionBadgeHtml}
                                </div>
                            </div>
                            
                            <button onclick="switchTab('kamper'); showMatchDetails('${nm.id}')" class="portal-btn portal-btn-secondary portal-btn-xs" title="Åpne kampdetaljer">
                                <span>Kampinfo</span> <i class="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
                            </button>
                        </div>

                        <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-2 max-w-4xl mx-auto">
                            <div class="dashboard-team-block is-home text-center md:text-right flex-1 w-full md:max-w-[270px] pb-1 md:pb-0">
                                <div class="min-w-0">
                                    <h2 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight truncate">BÆKKELAGETS SK</h2>
                                </div>
                                <div class="dashboard-team-badge is-bsk">
                                    <i class="fa-solid fa-shield-halved"></i>
                                </div>
                            </div>
                            
                            <div class="flex flex-col items-center shrink-0 my-2 md:my-0 px-6 min-w-[200px] text-center space-y-1">
                                <p class="text-xs font-black text-slate-800 capitalize pt-1">${d}</p>
                                <p class="text-[11px] font-bold text-slate-600">Kl. ${nm.time || 'TBA'}</p>
                                <p class="text-[10px] font-semibold text-slate-500 max-w-[180px] truncate" title="${nm.pitch || 'Ikke fastsatt'}">📍 ${nm.pitch || 'Ikke fastsatt'}</p>
                            </div>
                            
                            <div class="dashboard-team-block is-away text-center md:text-left flex-1 w-full md:max-w-[270px] pt-1 md:pt-0">
                                <div class="dashboard-team-badge">
                                    <i class="fa-solid fa-shield"></i>
                                </div>
                                <h2 onclick="switchTab('kamper'); showMatchDetails('${nm.id}')" class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight uppercase cursor-pointer hover:text-bsk-blueLight transition-colors inline-flex items-center gap-1.5 group/link" title="Klikk for å åpne kampdetaljer">
                                    <span>${nm.opponent}</span>
                                    <i class="fa-solid fa-circle-chevron-right text-xs opacity-40 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all text-bsk-blue"></i>
                                </h2>
                            </div>
                        </div>

                        <div class="flex flex-col items-center justify-center pt-2 border-t border-slate-150 text-center">
                            <span class="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Formkurve</span>
                            <div class="flex gap-1.5 min-h-5 items-center justify-center" id="hero-form-pills-container">
                            </div>
                        </div>

                    </div>
                </section>
            `;

            // DYTT DE ELEGANTE, SMÅ FORMPILLENE INN UNDER VS-TEGNET
            const formGuide = window.getFormGuide();
            setTimeout(() => {
                const heroFormContainer = document.getElementById('hero-form-pills-container');
                if (heroFormContainer) {
                    heroFormContainer.innerHTML = '';
                    if (formGuide.length === 0) {
                        heroFormContainer.innerHTML = `<span class="text-[9px] text-slate-500 px-2 py-0.5 italic">Ingen spilte kamper</span>`;
                    } else {
                        formGuide.forEach(item => {
                            const pill = document.createElement('div');
                            pill.className = `w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] cursor-help border border-white/60 shadow-sm transition hover:scale-110 ${item.class}`;
                            pill.title = item.tooltip; 
                            pill.innerHTML = `<span>${item.text}</span>`;
                            heroFormContainer.appendChild(pill);
                        });
                    }
                }
            }, 50);

        } else {
            heroContainer.innerHTML = `
                <div class="bg-slate-100 border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-inner">
                    <i class="fa-solid fa-futbol text-4xl mb-3 text-slate-300 animate-pulse"></i>
                    <h3 class="font-black text-slate-700 text-base">Ingen kommende kamper satt opp</h3>
                    <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Det er ikke ført noen kommende kamper i systemet akkurat nå.</p>
                </div>`;
            if (dangerZoneContainer) dangerZoneContainer.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Ingen aktiv kamp = Ingen karantener.</p>`;
        }
    }

    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
};

window.updateHjemWidget = function() {
    const bottomContainer = document.getElementById('hjem-bottom-widgets');
    if (!bottomContainer) return;

    // 1. FORBERED TRENINGSDATA (Venstre blokk - lys portalstil)
    const events = Array.isArray(window.activeEvents) ? window.activeEvents : [];
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const upcomingEvents = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    
    let leftWidgetHtml = '';
    if (upcomingEvents.length > 0) {
        const ne = upcomingEvents[0];
        const d = new Date(ne.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
        
        let påmeldtAntall = 0, forfallAntall = 0;
        if (ne.attendance) {
            Object.values(ne.attendance).forEach(status => {
                if (status === true) påmeldtAntall++;
                if (status === false) forfallAntall++;
            });
        }

        leftWidgetHtml = `
            <div class="dashboard-widget-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-blue/20">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-stopwatch text-[14rem] text-bsk-blue"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                        <div class="portal-status-label">
                            <i class="fa-solid fa-stopwatch"></i>
                            <span>Neste økt</span>
                        </div>
                        <span class="portal-status-label portal-status-label-sm animate-pulse">${d.split(' ')[0]} ${new Date(ne.date).getDate()}</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${ne.time || 'TBA'} | ${ne.location || 'Ikke oppgitt'}</p>
                            <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight uppercase truncate pb-1">${ne.title || 'TRENING'}</h4>
                        </div>
                        
                        <div onclick="switchTab('oppmote'); openAttendanceModal('${ne.id}')" class="bg-bsk-blue/5 border border-bsk-blue/15 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-all duration-500 cursor-pointer hover:scale-105">
                            <span class="text-2xl font-black text-bsk-blue leading-none">${påmeldtAntall}</span>
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Klar</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-100">
                        <button onclick="switchTab('oppmote'); openAttendanceModal('${ne.id}')" class="portal-btn portal-btn-primary portal-btn-sm">
                            <i class="fa-solid fa-user-check text-bsk-yellow text-[11px]"></i> Oppmøte
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        leftWidgetHtml = `
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[235px]">
                <div class="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3">
                    <i class="fa-solid fa-calendar-xmark text-xl text-slate-400"></i>
                </div>
                <h3 class="font-black text-slate-700 text-sm">Kalenderen er tom</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-[200px]">Det er ingen kommende aktiviteter planlagt.</p>
            </div>
        `;
    }

    // 2. FORBERED "UKENS MASKIN" (Høyre blokk)
    let topPlayer = null;
    let topScore = -1;
    
    (window.activePlayers || []).filter(p => p.status !== 'Passiv').forEach(p => {
        const score = typeof window.calculatePlayerPerformanceChemistry === 'function' ? window.calculatePlayerPerformanceChemistry(p.navn) : 0;
        if (score > topScore) { topScore = score; topPlayer = p; }
    });

    let rightWidgetHtml = '';
    if (topPlayer && topScore > 0) {
        let kamper = 0, mal = 0, assist = 0, attendedEvents = 0;
        
        const allEvents = [
    ...(window.activeEvents || []),
    ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))
];

        const todayForChemistry = new Date();
        todayForChemistry.setHours(0, 0, 0, 0);
        
        const teamEvents = allEvents.filter(e => {
            // RETTET: La til topPlayer. foran spillerLag
            if (e.team !== topPlayer.spillerLag) return false; 
        
            if (e.date) {
                const eventDate = new Date(e.date);
                eventDate.setHours(0, 0, 0, 0);
                if (eventDate > todayForChemistry) return false;
            }
        
            return true;
        });
        
        teamEvents.forEach(e => { 
            if (e.attendance && e.attendance[topPlayer.navn] === true) {
                attendedEvents++;
                if (e.type === 'Kamp') {
	                    kamper++;
	                    if (e.scorers && e.scorers[topPlayer.navn]) mal += e.scorers[topPlayer.navn];
	                    if (e.assists && e.assists[topPlayer.navn]) assist += e.assists[topPlayer.navn];
	                }
            } 
        });

        const oppmotePct = teamEvents.length > 0 ? Math.round((attendedEvents / teamEvents.length) * 100) : 0;

        rightWidgetHtml = `
            <div class="dashboard-widget-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-yellow/40">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-fire-flame-curved text-[14rem] text-bsk-yellow"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                        <div class="portal-status-label">
                            <i class="fa-solid fa-bolt"></i>
                            <span>Ukens Maskin</span>
                        </div>
                        <span class="portal-status-label portal-status-label-sm animate-pulse">Hot Streak</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${topPlayer.pos1}</p>
                            <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight uppercase truncate pb-1">${topPlayer.navn.split(' ')[0]}</h4>
                        </div>
                        
                        <div class="bg-bsk-yellow/15 border border-bsk-yellow/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-500">
                            <span class="text-lg font-black text-amber-700 leading-none">${topScore}/100</span>
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Form</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-100">
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="text-slate-900 text-base block font-black mb-0.5 leading-none">${kamper}</span> Kamper
                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
	                            <span class="text-slate-900 text-base block font-black mb-0.5 leading-none">${mal}</span> Mål
	                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
	                            <span class="text-sky-700 text-base block font-black mb-0.5 leading-none">${assist}</span> Assist
	                        </div>
	                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-l border-slate-200 pl-4">
                            <span class="text-amber-700 text-base block font-black mb-0.5 leading-none">${oppmotePct}%</span> Trening
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        rightWidgetHtml = `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[220px]">
                <div class="w-12 h-12 bg-white rounded-full border border-slate-100 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-bolt text-xl text-slate-300"></i>
                </div>
                <h3 class="font-black text-slate-700 text-sm">Ingen data enda</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-[200px]">Før oppmøte og karakterer for å kåre Ukens Maskin.</p>
            </div>
        `;
    }

    const playedMatches = (window.activeMatches || [])
        .map(m => ({ match: m, score: window.parseScore(m.result) }))
        .filter(item => item.score !== null);

    let tableWins = 0;
    let tableDraws = 0;
    let tableLosses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    playedMatches.forEach(({ score }) => {
        goalsFor += score.bsk;
        goalsAgainst += score.opponent;
        if (score.bsk > score.opponent) tableWins++;
        else if (score.bsk === score.opponent) tableDraws++;
        else tableLosses++;
    });

    const tablePoints = tableWins * 3 + tableDraws;
    const goalDiff = goalsFor - goalsAgainst;
    const goalDiffText = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;
    const formGuide = typeof window.getFormGuide === 'function' ? window.getFormGuide() : [];
    const escapeAttr = (value) => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const seriesWidgetHtml = `
        <div class="dashboard-widget-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-blue/20">
            <div class="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <i class="fa-solid fa-ranking-star text-[14rem] text-bsk-blue"></i>
            </div>

            <div class="relative z-10 flex flex-col h-full justify-between">
                <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                    <div class="portal-status-label">
                        <i class="fa-solid fa-table-list"></i>
                        <span>Seriestatus</span>
                    </div>
                    <span class="portal-status-label portal-status-label-sm">Lokal</span>
                </div>

                <div class="flex-1 flex items-center justify-between gap-5 mb-2">
                    <div class="min-w-0">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Basert på registrerte kamper</p>
                        <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight">${playedMatches.length ? `${tablePoints} poeng` : 'Ingen tabell ennå'}</h4>
                        <p class="text-xs text-slate-500 mt-1">${playedMatches.length ? `${tableWins}S · ${tableDraws}U · ${tableLosses}T` : 'Før resultater for å bygge seriebildet.'}</p>
                    </div>

                    <div class="bg-bsk-blue/5 border border-bsk-blue/15 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span class="text-xl font-black ${goalDiff >= 0 ? 'text-bsk-blue' : 'text-rose-600'} leading-none">${playedMatches.length ? goalDiffText : '-'}</span>
                        <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Mål diff</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-4 pt-3 mt-auto border-t border-slate-100">
                    <div class="flex gap-1.5 min-h-5 items-center">
                        ${
                            formGuide.length
                                ? formGuide.map(item => `<span class="w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] border border-white/60 shadow-sm ${item.class}" title="${escapeAttr(item.tooltip)}">${item.text}</span>`).join('')
                                : '<span class="text-[10px] text-slate-400 italic">Ingen formkurve</span>'
                        }
                    </div>
                    <button onclick="switchTab('statistikk')" class="portal-btn portal-btn-primary portal-btn-sm">Statistikk</button>
                </div>
            </div>
        </div>
    `;

    const activePlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
    const recruits = activePlayers.filter(p => p.status === 'Rekrutt').length;
    const keepers = activePlayers.filter(p => [p.pos1, p.pos2].some(pos => String(pos || '').toLowerCase().includes('keeper'))).length;
    const missingJersey = activePlayers.filter(p => !p.draktnummer).length;
    const nextMatch = (window.activeMatches || [])
        .filter(m => m.date >= todayStr && !window.parseScore(m.result))
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    let readyCount = 0;
    let unavailableCount = 0;

    if (nextMatch && nextMatch.attendance) {
        Object.values(nextMatch.attendance).forEach(status => {
            if (status === true) readyCount++;
            if (status === false) unavailableCount++;
        });
    }

    const squadWidgetHtml = `
        <div class="dashboard-widget-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group h-full transition border hover:border-bsk-yellow/40">
            <div class="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <i class="fa-solid fa-users-viewfinder text-[14rem] text-bsk-yellow"></i>
            </div>

            <div class="relative z-10 flex flex-col h-full justify-between">
                <div class="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                    <div class="portal-status-label">
                        <i class="fa-solid fa-users"></i>
                        <span>Troppstatus</span>
                    </div>
                    <span class="portal-status-label portal-status-label-sm">${activePlayers.length} aktive</span>
                </div>

                <div class="flex-1 flex items-center justify-between gap-5 mb-2">
                    <div class="min-w-0">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${nextMatch ? 'Neste kamp' : 'Spilleroversikt'}</p>
                        <h4 class="text-xl md:text-2xl font-black text-bsk-blue tracking-tight">${nextMatch ? `${readyCount} klare` : `${activePlayers.length} spillere`}</h4>
                        <p class="text-xs text-slate-500 mt-1">
                            ${nextMatch ? `${unavailableCount} forfall · ${Math.max(activePlayers.length - readyCount - unavailableCount, 0)} ikke svart` : `${recruits} rekrutter · ${keepers} keepere`}
                        </p>
                    </div>

                    <div class="bg-bsk-yellow/15 border border-bsk-yellow/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span class="text-xl font-black text-amber-700 leading-none">${missingJersey}</span>
                        <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-1">Uten nr</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-4 pt-3 mt-auto border-t border-slate-100">
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span class="text-slate-900 text-base block font-black mb-0.5 leading-none">${keepers}</span> Keepere
                    </div>
                    <button onclick="switchTab('tropp')" class="portal-btn portal-btn-primary portal-btn-sm">Tropp</button>
                </div>
            </div>
        </div>
    `;

    bottomContainer.innerHTML = leftWidgetHtml + rightWidgetHtml + seriesWidgetHtml + squadWidgetHtml;
};
