        function updateDashboard() {
    let upcoming = [], totalGoals = 0, wins = 0, played = 0, draws = 0, losses = 0;
    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    
    matches.forEach(m => {
        const score = parseScore(m.result);
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

            // HTML for det oppdaterte, rene kjempebanneret
            heroContainer.innerHTML = `
                <section class="bg-gradient-to-br from-bsk-blue via-bsk-blueLight to-bsk-blueDark rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border-b-4 border-bsk-yellow group">
                    <div class="absolute right-0 bottom-0 translate-y-8 translate-x-8 opacity-5 pointer-events-none z-0">
                        <i class="fa-solid fa-shield-halved text-[22rem]"></i>
                    </div>
                    
                    <div class="relative z-10 space-y-6 max-w-5xl mx-auto">
                        <div class="flex justify-between items-center border-b border-white/10 pb-3">
                            <div class="flex items-center gap-2">
                                <!-- VI HAR LAGT TIL 'relative' HER SÅ BADGEN PASSER PERFEKT -->
                                <div class="relative inline-flex items-center space-x-2 bg-bsk-yellow text-bsk-blue font-black px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-md">
                                    <i class="fa-solid fa-futbol text-[9px] animate-spin" style="animation-duration: 4s;"></i>
                                    <span>NESTE KAMP SATT</span>
                                    ${herosuspensionBadgeHtml}
                                </div>
                            </div>
                            
                            <button onclick="switchTab('kamper'); showMatchDetails('${nm.id}')" class="text-slate-400 hover:text-bsk-yellow transition-colors text-xs font-bold flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl shadow-sm hover:bg-white/10" title="Åpne kampdetaljer">
                                <span>Kampinfo</span> <i class="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
                            </button>
                        </div>

                        <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-2 max-w-4xl mx-auto">
                            <div class="text-center md:text-right flex-1 w-full md:max-w-[280px]">
                                <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Hjemmelag</span>
                                <h2 class="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md truncate">BÆKKELAGETS SK</h2>
                            </div>
                            
                            <div class="flex flex-col items-center gap-3 shrink-0 my-2 md:my-0 px-4">
                                <div class="bg-bsk-yellow text-bsk-blue px-3 py-1 rounded-xl text-[11px] font-black shadow-md tracking-wider uppercase border border-amber-300">VS</div>
                                <div class="flex gap-1 bg-black/30 backdrop-blur-sm p-1 rounded-lg border border-white/5 shadow-inner" id="hero-form-pills-container">
                                    </div>
                            </div>
                            
                            <div class="text-center md:text-left flex-1 w-full md:max-w-[280px]">
                                <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Motstander</span>
                                <h2 onclick="switchTab('kamper'); showMatchDetails('${nm.id}')" class="text-xl md:text-2xl font-black text-bsk-yellow tracking-tight drop-shadow-md uppercase cursor-pointer hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 group/link" title="Klikk for å åpne kampdetaljer">
                                    <span>${nm.opponent}</span>
                                    <i class="fa-solid fa-circle-chevron-right text-xs opacity-40 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all text-white"></i>
                                </h2>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-4xl mx-auto text-xs">
                            <div class="bg-slate-900/40 border border-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 shadow-lg transition hover:bg-slate-900/50">
                                <div class="w-10 h-10 rounded-xl bg-bsk-yellow/10 border border-bsk-yellow/20 flex items-center justify-center shrink-0">
                                    <i class="fa-regular fa-calendar text-bsk-yellow text-lg"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kampdato</p>
                                    <p class="font-extrabold text-white text-sm capitalize truncate">${d}</p>
                                </div>
                            </div>

                            <div class="bg-slate-900/40 border border-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 shadow-lg transition hover:bg-slate-900/50">
                                <div class="w-10 h-10 rounded-xl bg-bsk-yellow/10 border border-bsk-yellow/20 flex items-center justify-center shrink-0">
                                    <i class="fa-regular fa-clock text-bsk-yellow text-lg"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Avspark</p>
                                    <p class="font-extrabold text-white text-sm tracking-wide">Kl. ${nm.time || 'TBA'}</p>
                                </div>
                            </div>

                            <div class="bg-slate-900/40 border border-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 shadow-lg transition hover:bg-slate-900/50">
                                <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-location-dot text-rose-400 text-lg"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Spillested</p>
                                    <p class="font-extrabold text-white text-sm truncate" title="${nm.pitch || 'Ikke fastsatt'}">${nm.pitch || 'Ikke fastsatt'}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            `;

            // DYTT DE ELEGANTE, SMÅ FORMPILLENE INN UNDER VS-TEGNET
            const formGuide = getFormGuide();
            setTimeout(() => {
                const heroFormContainer = document.getElementById('hero-form-pills-container');
                if (heroFormContainer) {
                    heroFormContainer.innerHTML = '';
                    if (formGuide.length === 0) {
                        heroFormContainer.innerHTML = `<span class="text-[9px] text-slate-400 px-2 py-0.5 italic">Ingen spilte kamper</span>`;
                    } else {
                        formGuide.forEach(item => {
                            const pill = document.createElement('div');
                            pill.className = `w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] cursor-help border border-white/10 shadow-sm transition hover:scale-110 ${item.class}`;
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
}

       window.updateHjemWidget = function() {
    const bottomContainer = document.getElementById('hjem-bottom-widgets');
    if (!bottomContainer) return;

    // 1. FORBERED TRENINGSDATA (Venstre blokk - NY MIDDELMØRK ELEGANT STIL)
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
            <div class="bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between group h-full transition hover:shadow-xl">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-stopwatch text-[14rem] text-blue-400"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                        <h3 class="font-black text-white text-sm flex items-center gap-2">
                            <i class="fa-solid fa-stopwatch text-blue-400"></i> Neste økt
                        </h3>
                        <span class="bg-blue-400/10 border border-blue-400/20 text-blue-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">${d.split(' ')[0]} ${new Date(ne.date).getDate()}</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${ne.time || 'TBA'} | ${ne.location || 'Ikke oppgitt'}</p>
                            <h4 class="font-black text-white text-2xl md:text-3xl truncate drop-shadow-md pb-1">${ne.title || 'TRENING'}</h4>
                        </div>
                        
                        <div onclick="switchTab('oppmote'); openAttendanceModal('${ne.id}')" class="bg-blue-500/10 border border-blue-500/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] transition-all duration-500 cursor-pointer hover:scale-105">
                            <span class="text-2xl font-black text-blue-400 leading-none">${påmeldtAntall}</span>
                            <span class="text-[8px] font-bold text-blue-200/70 uppercase tracking-wider mt-1">Klar</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-800/60">
                        <button onclick="switchTab('oppmote'); openAttendanceModal('${ne.id}')" class="bg-bsk-blue hover:bg-bsk-blueLight text-white font-black text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 border border-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
                            <i class="fa-solid fa-user-check text-bsk-yellow text-[11px]"></i> Oppmøte
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        leftWidgetHtml = `
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-full min-h-[235px] text-white">
                <div class="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3">
                    <i class="fa-solid fa-calendar-xmark text-xl text-slate-400"></i>
                </div>
                <h3 class="font-black text-slate-200 text-sm">Kalenderen er tom</h3>
                <p class="text-xs text-slate-400 mt-1 max-w-[200px]">Det er ingen kommende aktiviteter planlagt.</p>
            </div>
        `;
    }

    // 2. FORBERED "UKENS MASKIN" (Høyre blokk - STÅR NØYAKTIG SOM FØR)
    let topPlayer = null;
    let topScore = -1;
    
    (window.activePlayers || []).filter(p => p.status !== 'Passiv').forEach(p => {
        const score = typeof calculatePlayerPerformanceChemistry === 'function' ? calculatePlayerPerformanceChemistry(p.navn) : 0;
        if (score > topScore) { topScore = score; topPlayer = p; }
    });

    let rightWidgetHtml = '';
    if (topPlayer && topScore > 0) {
        let kamper = 0, mal = 0, attendedEvents = 0;
        
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
                }
            } 
        });

        const oppmotePct = teamEvents.length > 0 ? Math.round((attendedEvents / teamEvents.length) * 100) : 0;

        rightWidgetHtml = `
            <div class="bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between group h-full transition hover:shadow-xl">
                <div class="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <i class="fa-solid fa-fire-flame-curved text-[14rem] text-bsk-yellow"></i>
                </div>
                
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                        <h3 class="font-black text-white text-sm flex items-center gap-2">
                            <i class="fa-solid fa-bolt text-amber-400"></i> Ukens Maskin
                        </h3>
                        <span class="bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Hot Streak</span>
                    </div>
                    
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${topPlayer.pos1}</p>
                            <h4 class="font-black text-white text-2xl md:text-3xl truncate drop-shadow-md pb-1">${topPlayer.navn.split(' ')[0]}</h4>
                        </div>
                        
                        <div class="bg-bsk-yellow/10 border border-bsk-yellow/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.15)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.25)] transition-shadow duration-500">
                            <span class="text-2xl font-black text-bsk-yellow leading-none">${topScore}</span>
                            <span class="text-[8px] font-bold text-amber-200/70 uppercase tracking-wider mt-1">Form</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-5 pt-3 mt-auto border-t border-slate-800/60">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span class="text-white text-base block font-black mb-0.5 leading-none">${kamper}</span> Kamper
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span class="text-white text-base block font-black mb-0.5 leading-none">${mal}</span> Mål
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-l border-slate-700 pl-4">
                            <span class="text-bsk-yellow text-base block font-black mb-0.5 leading-none">${oppmotePct}%</span> Trening
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

    bottomContainer.innerHTML = leftWidgetHtml + rightWidgetHtml;
};
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

            const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, team: m.matchGroup }))];
            const teamPlayers = (window.activePlayers || []).filter(p => filterLag === 'Alle' || p.spillerLag === filterLag);

            let bestPartner = null, bestScore = -1, bestSharedCount = 0;

            teamPlayers.forEach(p => {
                if (p.navn === selectedPlayer) return;
                let sharedPresent = 0, eitherPresent = 0;
                allEvents.forEach(e => {
                    if (filterLag !== 'Alle' && e.team !== filterLag) return;
                    if (e.attendance) {
                        const p1Present = e.attendance[selectedPlayer] === true; const p2Present = e.attendance[p.navn] === true;
                        if (p1Present || p2Present) eitherPresent++;
                        if (p1Present && p2Present) sharedPresent++;
                    }
                });
                const score = eitherPresent > 0 ? Math.round((sharedPresent / eitherPresent) * 100) : 0;
                if (score > bestScore && sharedPresent > 0) { bestScore = score; bestPartner = p.navn; bestSharedCount = sharedPresent; }
            });

            if (bestPartner) {
                if (document.getElementById('individual-chem-pct')) document.getElementById('individual-chem-pct').innerText = `${bestScore}%`;
                if (document.getElementById('individual-partner-name')) document.getElementById('individual-partner-name').innerText = bestPartner;
                if (document.getElementById('individual-partner-desc')) document.getElementById('individual-partner-desc').innerText = `Har stilt opp sammen på ${bestSharedCount} økter.`;
                if (document.getElementById('chem-circle-progress')) document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2 - (251.2 * bestScore) / 100;
            } else {
                if (document.getElementById('individual-chem-pct')) document.getElementById('individual-chem-pct').innerText = `0%`;
                if (document.getElementById('individual-partner-name')) document.getElementById('individual-partner-name').innerText = "Ingen match";
                if (document.getElementById('individual-partner-desc')) document.getElementById('individual-partner-desc').innerText = "Ikke nok data registrert.";
                if (document.getElementById('chem-circle-progress')) document.getElementById('chem-circle-progress').style.strokeDashoffset = 251.2;
            }
        }

        window.renderStatistikkSide = function() {
            // 1. KAMP-STATISTIKK
            let wins = 0, draws = 0, losses = 0, goals = 0;
            (window.activeMatches || []).forEach(m => {
                const score = parseScore(m.result);
                if (score !== null) {
                    goals += score.bsk;
                    if (score.bsk > score.opponent) wins++; else if (score.bsk === score.opponent) draws++; else losses++;
                }
            });
            
            if (document.getElementById('stats-page-wins')) document.getElementById('stats-page-wins').innerText = wins;
            if (document.getElementById('stats-page-draws')) document.getElementById('stats-page-draws').innerText = draws;
            if (document.getElementById('stats-page-losses')) document.getElementById('stats-page-losses').innerText = losses;
            if (document.getElementById('stats-page-goals')) document.getElementById('stats-page-goals').innerText = goals;

            // 2. TROPPSTATISTIKK
            const activePlayers = (window.activePlayers || []).filter(p => p.status !== 'Passiv');
            let totalAge = 0;
            let recruits = 0;

            activePlayers.forEach(p => {
                if (p.fodselsaar) totalAge += (2026 - parseInt(p.fodselsaar));
                if (p.status === 'Rekrutt') recruits++;
            });

            const avgAge = activePlayers.length > 0 ? (totalAge / activePlayers.length).toFixed(1) : 0;

            // RIKTIG LOGIKK FOR OPPMØTE: Tar utgangspunkt i lagets faktiske størrelse
            let totalEventTicks = 0, totalPossibleTicks = 0;
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
            
            // NYTT: Hent dagens dato for å stoppe "fremtidsstraff"
            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            allEvents.forEach(e => {
                // NYTT: Sjekk om hendelsen ligger i fremtiden. Hvis ja, hopp over!
                if (e.date) {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    if (eventDate > todayForStats) return; 
                }

                const eventTeam = e.team || 'Lag A'; 
                const teamPlayers = activePlayers.filter(p => p.spillerLag === eventTeam); 
                
                if (teamPlayers.length > 0) {
                    totalPossibleTicks += teamPlayers.length;
                    if (e.attendance) {
                        teamPlayers.forEach(p => {
                            if (e.attendance[p.navn] === true) {
                                totalEventTicks++;
                            }
                        });
                    }
                }
            });
            
            const avgAttendance = totalPossibleTicks > 0 ? Math.round((totalEventTicks / totalPossibleTicks) * 100) : 0;

            // Oppdater de nye HTML-boksene
            if (document.getElementById('stats-page-players')) document.getElementById('stats-page-players').innerText = activePlayers.length;
            if (document.getElementById('stats-page-age')) document.getElementById('stats-page-age').innerText = avgAge;
            if (document.getElementById('stats-page-recruits')) document.getElementById('stats-page-recruits').innerText = recruits;
            if (document.getElementById('stats-page-attendance')) document.getElementById('stats-page-attendance').innerText = `${avgAttendance}%`;
        };

        window.onclick = function(event) {
            const modals = ['matchModal', 'teamModal', 'playerModal', 'matchInfoModal', 'eventModal', 'attendanceModal', 'confirmModal', 'kjemi-info-modal', 'activityModal', 'tacticalPlayerModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    if(modalId === 'matchModal') window.closeMatchModal();
                    if(modalId === 'teamModal') window.closeTeamModal();
                    if(modalId === 'playerModal') window.closePlayerModal();
                    if(modalId === 'matchInfoModal') window.closeMatchInfo();
                    if(modalId === 'eventModal') window.closeEventModal();
                    if(modalId === 'attendanceModal') window.closeAttendanceModal();
                    if(modalId === 'confirmModal') closeConfirmModal();
                    if(modalId === 'activityModal') window.closeActivityModal();
                    if(modalId === 'tacticalPlayerModal') closePlayerSelect();
                    if(modalId === 'kjemi-info-modal') { modal.classList.add('hidden'); modal.classList.remove('flex'); }
                }
            });
        };

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
                    const aPresent = e.attendance[playerA] === true; const bPresent = e.attendance[playerB] === true;
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
                    const chemScore = getDuoChemistry(player1.navn, player2.navn);
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
                            strokeColor = 'rgba(255, 255, 255, 0.25)'; // HVIT STIPLET
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
            
            // Nullstill alle fase-knapper til å se ut som "Tøm"-knappen
            document.querySelectorAll('.phase-btn').forEach(btn => {
                btn.classList.remove('bg-bsk-blue', 'text-white', 'border-bsk-blue', 'shadow-md'); 
                btn.classList.add('bg-white', 'text-slate-500', 'border-slate-200', 'hover:text-bsk-blue', 'hover:bg-slate-50', 'shadow-sm');
            });
            
            // Aktiver den valgte knappen (gjør den solid blå)
            const activeBtn = document.getElementById(`btn-${phaseId}`);
            if (activeBtn) {
                activeBtn.classList.remove('bg-white', 'text-slate-500', 'border-slate-200', 'hover:text-bsk-blue', 'hover:bg-slate-50', 'shadow-sm');
                activeBtn.classList.add('bg-bsk-blue', 'text-white', 'border-bsk-blue', 'shadow-md');
            }

            const svgLayer = document.getElementById('chemistry-lines-layer');
            if (svgLayer) svgLayer.innerHTML = '';

            const coords = tacticalPhases[phaseId];
            for (const [nodeId, pos] of Object.entries(coords)) {
                const node = document.getElementById('node-' + nodeId);
                if (node) { node.style.top = pos.top; node.style.left = pos.left; }
            }
            setTimeout(drawChemistryLines, 500); 
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
        clearTacticalBoard();
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
                const opt = document.createElement('option'); opt.value = p.navn; opt.innerText = p.navn; roleSelect.appendChild(opt);
            });
            roleSelect.value = match.roles ? (match.roles[roleId] || "") : "";
        }
    });
    
    positions.forEach(pos => { renderNodeVisually(window.tacticalLineup[pos], pos); });
    drawChemistryLines();
    
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
            
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => renderNodeVisually(window.tacticalLineup[pos], pos));
            
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
        const erBekreftetKlar = match.attendance && match.attendance[p.navn] === true;
        return !starterIKampen && erBekreftetKlar;
    });

    if (benchPlayers.length === 0) {
        benchList.innerHTML = '<p class="text-xs text-slate-400 italic col-span-2 py-2">Ingen tilgjengelige innbyttere på benken.</p>';
        return;
    }

    benchPlayers.sort((a, b) => calculatePlayerPerformanceChemistry(b.navn) - calculatePlayerPerformanceChemistry(a.navn));

    benchPlayers.forEach(p => {
        const playerChem = calculatePlayerPerformanceChemistry(p.navn);
        let chemColor = 'text-rose-500'; 
        if (playerChem >= 75) chemColor = 'text-emerald-500';
        else if (playerChem >= 50) chemColor = 'text-amber-500';
        else if (playerChem === 0) chemColor = 'text-slate-400';

        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === p.spillerLag && m.attendance && m.attendance[p.navn] === true) {
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

        const pSusp = suspData[p.navn] || { isSuspended: false, isAtRisk: false };
        let benchSuspBadge = '';
        let borderClass = 'border-slate-200/60';
        if (pSusp.isSuspended) {
            benchSuspBadge = `<span class="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black ml-2 animate-pulse" title="${pSusp.reason}">KARANTENE</span>`;
            borderClass = 'border-rose-300 bg-rose-50';
        } else if (pSusp.isAtRisk) {
            benchSuspBadge = `<span class="text-[8px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full font-black ml-2" title="Faresone: ${pSusp.yellows} gule">FARESONE</span>`;
        }

        const div = document.createElement('div');
        div.className = `flex justify-between items-center bg-slate-50 border ${borderClass} p-2.5 rounded-xl shadow-sm`;
        div.innerHTML = `
            <div class="flex items-center min-w-0">
                <span class="font-bold ${pSusp.isSuspended ? 'text-rose-900' : 'text-slate-800'} truncate text-xs">${p.navn}</span>
                ${benchSuspBadge}
            </div>
            <div class="flex items-center gap-3 shrink-0 ml-2">
                <span class="font-black text-xs ${bonusColor}" title="Kampsnitt">${bonusTekst}</span>
                <div class="w-px h-3 bg-slate-300"></div>
                <span class="font-black text-xs ${chemColor}" title="Kjemiscore">${playerChem}%</span>
            </div>
        `;
        benchList.appendChild(div);
    });
};

        window.renderNodeVisually = function(playerObj, posId) {
    const node = document.getElementById('node-' + posId);
    if (!node) return;
    
    // Fjerner gamle farger
    node.classList.remove('bg-bsk-yellow', 'text-bsk-blue', 'border-white', 'bg-bsk-blue', 'text-white', 'border-2', 'border-[3px]', 'border-bsk-yellow/60', 'border-emerald-500', 'border-yellow-500', 'border-amber-500', 'border-orange-500', 'border-rose-500');

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

        const playerChem = calculatePlayerPerformanceChemistry(playerObj.navn);
        
        // 1. BEREGN KAMPBONUS (Form i midten av rundingen)
        let kamper = 0;
        let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === playerObj.spillerLag && m.attendance && m.attendance[playerObj.navn] === true) {
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
            
            if (capValue === playerObj.navn || (!capValue && playerObj.isCaptain)) badgesHtml += `<span class="bg-amber-400 text-bsk-blue text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Kaptein">C</span>`;
            if (penValue === playerObj.navn) badgesHtml += `<span class="bg-emerald-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Straffer">P</span>`;
            if (fkValue === playerObj.navn) badgesHtml += `<span class="bg-blue-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Frispark">F</span>`;
            if (cornValue === playerObj.navn) badgesHtml += `<span class="bg-purple-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900" title="Cornere">📐</span>`;
        }

        // Viser advarsler (gule/røde kort osv.) uavhengig om det er sandkasse eller kamp
        let totalYellowCards = 0;
        (window.activeMatches || []).forEach(m => { if (m.guleKort && m.guleKort.includes(playerObj.navn)) totalYellowCards++; });
        if (totalYellowCards > 0 && totalYellowCards % 4 === 3) {
            badgesHtml += `<span class="bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm border border-slate-900 animate-pulse" title="Karantenefare! 3 gule kort.">⚠️</span>`;
        }
        badgesHtml += '</div>';

        // 2. BEREGN KJEMI (Fargen på rammen rundt rundingen)
        let borderClass = 'border-rose-500';
        if (playerChem >= 75) { 
            borderClass = 'border-emerald-500'; 
        } else if (playerChem >= 50) { 
            borderClass = 'border-amber-500'; 
        }

        node.innerHTML = `
            ${badgesHtml}
            <span class="text-[14px] font-black tracking-tight z-10 ${bonusTextColor}" title="Kampbonus (Form)">${bonusTekst}</span>
            <div class="absolute -bottom-5 flex flex-col items-center pointer-events-none z-10">
                <span class="text-[9px] font-bold text-white whitespace-nowrap drop-shadow-md bg-black/60 px-1.5 py-0.5 rounded-md">${displayBottomName}</span>
            </div>
        `;
        node.classList.add('bg-bsk-blue', 'text-white', 'border-[3px]', borderClass);
    }
};

        window.choosePlayer = function(playerObj, posId) {
            window.tacticalLineup[posId] = playerObj;
            renderNodeVisually(playerObj, posId);
            drawChemistryLines();
            window.updateTacticalBoardStats();
            closePlayerSelect();

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
                const valA = currentMatch.attendance[a.navn] === true ? 2 : (currentMatch.attendance[a.navn] === false ? 0 : 1);
                const valB = currentMatch.attendance[b.navn] === true ? 2 : (currentMatch.attendance[b.navn] === false ? 0 : 1);
                if (valA !== valB) return valB - valA;
            }
            return a.navn.localeCompare(b.navn);
        });

    sortedPlayers.forEach(p => {
        const isPlaying = Object.values(window.tacticalLineup).some(player => player && player.id === p.id);
        let attStatusHtml = '', opacityClass = isPlaying ? 'opacity-40 bg-slate-50' : 'hover:bg-bsk-blue/5 border border-transparent hover:border-bsk-blue/20', trengerBekreftelse = false;

        const pSusp = suspData[p.navn] || { isSuspended: false, isAtRisk: false };

        if (pSusp.isSuspended) {
            attStatusHtml += `<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black ml-2 animate-pulse shadow-sm" title="${pSusp.reason}">🚫 KARANTENE</span>`;
            opacityClass = 'opacity-60 bg-rose-50 border border-rose-200';
        } else if (pSusp.isAtRisk) {
            attStatusHtml += `<span class="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-black ml-2 shadow-sm" title="Faresone: ${pSusp.yellows} gule kort">⚠️ FARESONE</span>`;
        }

        if (currentMatch) {
            const att = currentMatch.attendance ? currentMatch.attendance[p.navn] : undefined;
            if (att === true && !pSusp.isSuspended) attStatusHtml += '<span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold ml-2">✅ KLAR</span>';
            else if (att === false) {
                attStatusHtml += '<span class="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold ml-2">❌ FORFALL</span>'; trengerBekreftelse = true;
                if (!isPlaying && !pSusp.isSuspended) opacityClass = 'opacity-50 grayscale bg-slate-50';
            } else if (isAttendanceStarted) {
                attStatusHtml += '<span class="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-2">❓ IKKE SVART</span>'; trengerBekreftelse = true;
                if (!isPlaying && !pSusp.isSuspended) opacityClass = 'opacity-50 bg-slate-50';
            }
        }

        const playerChem = calculatePlayerPerformanceChemistry(p.navn);
        let chemColor = 'text-rose-500'; 
        if (playerChem >= 75) chemColor = 'text-emerald-500';
        else if (playerChem >= 50) chemColor = 'text-amber-500';
        else if (playerChem === 0) chemColor = 'text-slate-400';

        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === p.spillerLag && m.attendance && m.attendance[p.navn] === true) {
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
            if (!isPlaying) choosePlayer(p, posId); else alert(`${p.navn} er allerede plassert!`);
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
                <span class="font-black text-xs ${bonusColor}" title="Kampbonus (Form)">${bonusTekst}</span>
                <div class="w-px h-3 bg-slate-300"></div>
                <span class="font-black text-xs ${chemColor}" title="Kjemiscore">${playerChem}%</span>
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
        clearDiv.onclick = () => choosePlayer(null, posId); 
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
            ['GK', 'VMS', 'HMS', 'VB', 'HB', 'DM', 'OM', 'PM', 'VK', 'HK', 'SP'].forEach(pos => choosePlayer(null, pos));
            window.updateTacticalBoardStats();
        }

        window.autoFillTeam = function() {
    clearTacticalBoard(); 
    const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv' || (filterLag !== 'Alle' && p.spillerLag !== filterLag)) return false;
        if (currentMatch && isAttendanceStarted && currentMatch.attendance[p.navn] !== true) return false;
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
            if (m.matchGroup === pObj.spillerLag && m.attendance && m.attendance[pObj.navn] === true) {
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

                    scoreA = calculatePlayerPerformanceChemistry(a.navn) + getKampbonus(a) + penaltyA;
                    scoreB = calculatePlayerPerformanceChemistry(b.navn) + getKampbonus(b) + penaltyB;
                return scoreB - scoreA; 
            });
            const selectedPlayer = candidates[0];
            choosePlayer(selectedPlayer, req.id);
            availablePlayers = availablePlayers.filter(p => p.id !== selectedPlayer.id);
        }
    });

    if (matchId && typeof window.saveMatchTactics === 'function') window.saveMatchTactics();
};

        window.calculatePlayerPerformanceChemistry = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return 0;
    const spillerLag = playerObj.spillerLag;
    const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];
    const teamEvents = allEvents.filter(e => e.team === spillerLag);
    
    let attendedEvents = 0;
    teamEvents.forEach(e => { if (e.attendance && e.attendance[playerName] === true) attendedEvents++; });

    let chemistryScore = (teamEvents.length > 0 ? (attendedEvents / teamEvents.length) : 0) * 25; 
    if (attendedEvents > 0) chemistryScore += 15; 
    
    let totalMatchPoints = 0, matchesPlayed = 0, disciplinePenalty = 0, totalYellowCards = 0; 
    
    (window.activeMatches || []).forEach(m => {
        if (m.matchGroup === spillerLag && m.attendance && m.attendance[playerName] === true) {
            matchesPlayed++;
            totalMatchPoints += window.calculatePlayerMatchPoints(m, playerName);
            if (m.guleKort && m.guleKort.includes(playerName)) totalYellowCards++;
            if (m.rodeKort && m.rodeKort.includes(playerName)) disciplinePenalty -= 10;
        }
    });
    
    if (matchesPlayed > 0) chemistryScore += (totalMatchPoints / matchesPlayed);
    
    // --- OPPDATERT NFF-LOGIKK FOR KJEMISTRAFF (MODELL 2: FIRST TIME FREE) ---
    let karantener = 0;
    if (totalYellowCards >= 4) {
        karantener = 1 + Math.floor((totalYellowCards - 4) / 2);
    }
    
    // Hvis karantener > 1, trekker vi for alle unntatt den første
    if (karantener > 1) {
        disciplinePenalty -= ((karantener - 1) * 5); 
    }
    // (Hvis karantener er nøyaktig 1, skjer ingenting - den er "gratis")
    
    chemistryScore += disciplinePenalty;
    return Math.max(0, Math.min(100, Math.round(chemistryScore)));
}

        window.switchStatTab = function(tabId) {
            // 1. Skjul alle de fire innholdscontainerne
            document.getElementById('stat-view-lag').className = "hidden";
            document.getElementById('stat-view-spillere').className = "hidden";
            document.getElementById('stat-view-poeng').className = "hidden";
            document.getElementById('stat-view-kampstat').className = "hidden";
            document.getElementById('stat-view-analyse').className = "hidden";
            
            // 2. Vis containeren som ble trykket på
            document.getElementById(`stat-view-${tabId}`).className = "block space-y-6";
            
            // 3. Nullstill alle knappene til passiv grå stil
            const inactiveClass = "stat-tab-btn px-4 py-2 rounded-lg transition-all text-slate-500 hover:text-slate-800";
            document.querySelectorAll('.stat-tab-btn').forEach(btn => {
                btn.className = inactiveClass;
            });
            
            // 4. Gi den aktive knappen hvit bakgrunn, skygge og blå tekst
            const activeBtn = document.getElementById(`stat-tab-${tabId}`);
            if (activeBtn) {
                activeBtn.className = "stat-tab-btn px-4 py-2 rounded-lg transition-all text-bsk-blue bg-white shadow-sm";
            }
            
            // 5. Kjør tilhørende funksjoner for den aktuelle fanen
            if (tabId === 'spillere') renderPlayerStatsTable();
            if (tabId === 'poeng') renderPointHistoryView();
            if (tabId === 'kampstat') renderMatchStatsView(); 
            if (tabId === 'analyse') renderAnalysisStatsView();
        };

        window.renderAnalysisStatsView = function() {
    const container = document.getElementById('stat-view-analyse');
    if (!container) return;
        container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-bsk-blue mb-3"></i>
            <h3 class="font-black text-slate-800 text-lg mb-1">Laster analyse</h3>
            <p class="text-sm text-slate-500">Regner ut form, BB, mål og poeng per kamp...</p>
        </div>
    `;

    const players = (window.activePlayers || []).filter(p => p.status !== 'Passiv');

    const matches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!players.length || !matches.length) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-chart-line text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Ikke nok data ennå</h3>
                <p class="text-sm text-slate-500">Registrer kamper, oppmøte, mål, BB og spillerbørs for å bygge analysebildet.</p>
            </div>
        `;
        return;
    }

    const playerStats = players.map(player => {
                const name = player.navn || player.name || player.fullName || player.spiller || '';
                if (!name) return null;

                const playerMatches = matches.filter(m =>
                    m.attendance && m.attendance[name] === true
                );

                let totalPoints = 0;
                let goals = 0;
                let bb = 0;
                let yellow = 0;
                let red = 0;
                let ratings = [];

                playerMatches.forEach(m => {
                    const points = typeof window.calculatePlayerMatchPoints === 'function'
                        ? window.calculatePlayerMatchPoints(m, name)
                        : 0;

                    totalPoints += points;

                    if (m.scorers && m.scorers[name]) goals += Number(m.scorers[name]) || 0;
                    if (m.motm === name) bb += 1;
                    if (m.guleKort && m.guleKort.includes(name)) yellow += 1;
                    if (m.rodeKort && m.rodeKort.includes(name)) red += 1;

                    if (m.ratings && m.ratings[name]) {
                        ratings.push({
                            date: m.date,
                            rating: Number(m.ratings[name]) || 0,
                            opponent: m.opponent || ''
                        });
                    }
                });

                const lastFiveRatings = ratings
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                const avgRating = ratings.length
                    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                    : 0;

                const formLastFive = lastFiveRatings.length
                    ? lastFiveRatings.reduce((sum, r) => sum + r.rating, 0) / lastFiveRatings.length
                    : 0;

                // Sørger for at vi alltid returnerer et tall, selv om ingen kamper er spilt
                const pointsPerMatch = (playerMatches.length > 0) 
                    ? (totalPoints / playerMatches.length) 
                    : 0;
        
                return {
                    name,
                    matches: playerMatches.length || 0,
                    totalPoints: totalPoints || 0,
                    pointsPerMatch: pointsPerMatch || 0,
                    goals: goals || 0,
                    bb: bb || 0,
                    yellow: yellow || 0,
                    red: red || 0,
                    avgRating: avgRating || 0,
                    formLastFive: formLastFive || 0
                };
            }).filter(Boolean);

    const activeStats = playerStats.filter(p => p.matches > 0);

    const topFormPlayer = [...activeStats].sort((a, b) => b.formLastFive - a.formLastFive)[0];
    const bbLeader = [...activeStats].sort((a, b) => b.bb - a.bb)[0];
    const topScorer = [...activeStats].sort((a, b) => b.goals - a.goals)[0];
    const pointsLeader = [...activeStats].sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)[0];

    const formTable = [...activeStats]
        .sort((a, b) => b.formLastFive - a.formLastFive)
        .slice(0, 8);

    const bbTable = [...activeStats]
        .filter(p => p.bb > 0)
        .sort((a, b) => b.bb - a.bb || b.formLastFive - a.formLastFive)
        .slice(0, 8);

    const scorerTable = [...activeStats]
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals || b.pointsPerMatch - a.pointsPerMatch)
        .slice(0, 8);

    const pointsTable = [...activeStats]
        .sort((a, b) => b.pointsPerMatch - a.pointsPerMatch)
        .slice(0, 8);

    const followUps = activeStats
        .filter(p => p.red > 0 || p.yellow >= 3 || p.formLastFive < 5.5 || p.matches <= 2)
        .map(p => {
            let reason = [];

            if (p.red > 0) reason.push('Rødt kort');
            if (p.yellow >= 3) reason.push('Mange gule kort');
            if (p.formLastFive > 0 && p.formLastFive < 5.5) reason.push('Lav form siste kamper');
            if (p.matches <= 2) reason.push('Få kamper registrert');

            return {
                name: p.name,
                reason: reason.join(', ')
            };
        })
        .slice(0, 8);

    const card = (label, value, sub, icon, colorClass) => `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${label}</span>
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <i class="fa-solid ${icon} ${colorClass} text-lg"></i>
                </div>
            </div>
            <div class="text-2xl font-black text-slate-900 leading-tight">${value || '-'}</div>
            <div class="text-xs text-slate-500 mt-1">${sub || ''}</div>
        </div>
    `;

    const smallTable = (title, subtitle, headers, rowsHtml) => `
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50">
                <h3 class="font-black text-slate-800 text-sm">${title}</h3>
                <p class="text-xs text-slate-500 mt-1">${subtitle}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                        <tr>${headers}</tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${rowsHtml || `
                            <tr>
                                <td colspan="5" class="p-5 text-center text-slate-400 italic text-xs">Ingen data ennå</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="space-y-6">

            <div class="bg-gradient-to-r from-bsk-blue to-bsk-blueLight rounded-2xl p-6 shadow-md text-white border border-bsk-blueDark">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p class="text-[10px] font-black text-bsk-yellow uppercase tracking-[0.25em] mb-2">Statistikk 2.0</p>
                        <h2 class="text-2xl font-black tracking-tight">Analyse og trenerinnsikt</h2>
                        <p class="text-sm text-slate-200 mt-1">Form, BB, mål, poeng per kamp og spillere som bør følges opp.</p>
                    </div>
                    <div class="shrink-0">
                        <div class="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center shadow-sm">
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-slate-300 tracking-wider leading-none">
                                Grunnlag
                            </p>
                            <p class="text-xl md:text-3xl font-black text-white leading-tight mt-1">
                                ${matches.length}
                            </p>
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-bsk-yellow tracking-wider leading-none">
                                kamper
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                ${card(
                    'Formspiller',
                    topFormPlayer ? topFormPlayer.name : '-',
                    topFormPlayer ? `Snitt siste 5: ${topFormPlayer.formLastFive.toFixed(1)}` : 'Ingen formdata',
                    'fa-fire',
                    'text-orange-500'
                )}

                ${card(
                    'BB-leder',
                    bbLeader ? bbLeader.name : '-',
                    bbLeader ? `${bbLeader.bb} BB-kåringer` : 'Ingen BB registrert',
                    'fa-crown',
                    'text-indigo-500'
                )}

                ${card(
                    'Toppscorer',
                    topScorer ? topScorer.name : '-',
                    topScorer ? `${topScorer.goals} mål` : 'Ingen mål registrert',
                    'fa-futbol',
                    'text-emerald-500'
                )}

                ${card(
                    'Poeng per kamp',
                    pointsLeader ? pointsLeader.name : '-',
                    pointsLeader ? `${pointsLeader.pointsPerMatch.toFixed(1)} poeng i snitt` : 'Ingen poengdata',
                    'fa-chart-line',
                    'text-bsk-blue'
                )}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                ${smallTable(
                    'Form siste 5 kamper',
                    'Sortert på snittbørs i spillerens siste registrerte kamper.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Kamper</th>
                        <th class="p-4 text-center">Snittbørs</th>
                        <th class="p-4 text-center">Mål</th>
                        <th class="p-4 text-center">BB</th>
                    `,
                    formTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">${p.matches}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black ${
                                    p.formLastFive >= 7 ? 'bg-orange-100 text-orange-700' :
                                    p.formLastFive >= 6 ? 'bg-emerald-100 text-emerald-700' :
                                    p.formLastFive > 0 ? 'bg-slate-100 text-slate-600' :
                                    'bg-slate-50 text-slate-300'
                                }">
                                    ${p.formLastFive.toFixed(1)}
                                </span>
                            </td>
                            <td class="p-4 text-center font-bold">${p.goals}</td>
                            <td class="p-4 text-center">
                                ${
                                    p.bb > 0
                                        ? `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">👑 +${p.bb}</span>`
                                        : `<span class="text-slate-300 font-bold">-</span>`
                                }
                            </td>
                        </tr>
                    `).join('')
                )}

                ${smallTable(
                    'Poeng per kamp',
                    'Viser hvem som leverer mest når de faktisk spiller.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Kamper</th>
                        <th class="p-4 text-center">Totalt</th>
                        <th class="p-4 text-right">Snitt</th>
                    `,
                    pointsTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">${p.matches}</td>
                            <td class="p-4 text-center">${Math.round(p.totalPoints)}</td>
                            <td class="p-4 text-right font-black text-bsk-blue">${p.pointsPerMatch.toFixed(1)}</td>
                        </tr>
                    `).join('')
                )}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                ${smallTable(
                    'BB-liga',
                    'Antall ganger spilleren er kåret til banens beste.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center text-indigo-600">BB</th>
                    `,
                    bbTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                                    👑 +${p.bb}
                                </span>
                            </td>
                        </tr>
                    `).join('')
                )}

                ${smallTable(
                    'Toppscorer',
                    'Mål registrert på kampdetaljene.',
                    `
                        <th class="p-4">Spiller</th>
                        <th class="p-4 text-center">Mål</th>
                        <th class="p-4 text-right">Mål/kamp</th>
                    `,
                    scorerTable.map(p => `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 font-bold text-slate-800">${p.name}</td>
                            <td class="p-4 text-center">
                                <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                                    ⚽ ${p.goals}
                                </span>
                            </td>
                            <td class="p-4 text-right">${p.matches ? (p.goals / p.matches).toFixed(2) : '0.00'}</td>
                        </tr>
                    `).join('')
                )}
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-black text-slate-800 text-sm">Oppfølging</h3>
                    <p class="text-xs text-slate-500 mt-1">Spillere som trenerteamet bør følge litt ekstra med på.</p>
                </div>
                <div class="divide-y divide-slate-100">
                    ${
                        followUps.length
                            ? followUps.map(p => `
                                <div class="p-4 hover:bg-amber-50/40 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                                            <i class="fa-solid fa-triangle-exclamation text-sm"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-black text-slate-800">${p.name}</div>
                                            <div class="text-xs text-slate-500 leading-snug">${p.reason}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')
                            : `
                                <div class="p-6 text-center text-slate-400 italic text-xs">
                                    Ingen tydelige varsler akkurat nå.
                                </div>
                            `
                    }
                </div>
            </div>

        </div>
    `;
};
        
       window.renderPointHistoryView = function() {
    const container = document.getElementById('stat-view-poeng');
    if (!container) return;
    
    const harSpiltMinstEnKamp = (playerName, spillerLag) => {
        return (window.activeMatches || []).some(m => 
            m.matchGroup === spillerLag && 
            m.attendance && 
            m.attendance[playerName] === true
        );
    };

    const playerOptions = (window.activePlayers || [])
    .filter(p => p.status !== 'Passiv')
    .sort((a, b) => a.navn.localeCompare(b.navn));

    const defaultPlayer = playerOptions
        .map(p => ({
            ...p,
            chemistry: typeof calculatePlayerPerformanceChemistry === 'function'
                ? calculatePlayerPerformanceChemistry(p.navn)
                : 0
        }))
        .sort((a, b) => b.chemistry - a.chemistry)[0];
    
    const defaultPlayerName = defaultPlayer ? defaultPlayer.navn : '';
    
    const optionsHtml = playerOptions
        .map(p => `
            <option 
                class="text-slate-900 bg-white" 
                value="${p.navn}"
                ${p.navn === defaultPlayerName ? 'selected' : ''}
            >
                ${p.navn}
            </option>
        `)
        .join('');
        
    let html = `
        <div class="space-y-6">

            <div class="bg-gradient-to-r from-bsk-blue to-bsk-blueLight rounded-2xl p-5 md:p-6 shadow-md text-white border border-bsk-blueDark">
                <div class="flex items-start justify-between gap-4">
                    
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-black text-bsk-yellow uppercase tracking-[0.25em] mb-2">
                            Spilleranalyse
                        </p>
                    
                        <div class="relative inline-block w-full max-w-[230px] sm:max-w-[290px] md:max-w-none md:w-auto">
                            <select 
                                id="poeng-player-select" 
                                onchange="showPlayerPointsTable()" 
                                class="w-full md:w-auto appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2 pr-9 text-sm md:text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-bsk-yellow/60 cursor-pointer [&>option]:text-slate-900 [&>option]:bg-white"
                            >
                                ${optionsHtml}
                            </select>
                    
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-bsk-yellow text-xs pointer-events-none"></i>
                        </div>
                    
                        <p class="text-xs md:text-sm text-slate-200 mt-3 leading-snug max-w-xl">
                            Se utvikling, form, matchpoeng og kampbidrag for valgt spiller.
                        </p>
                    </div>
            
                    <div class="shrink-0 pt-7 md:pt-0">
                        <div class="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center text-center shadow-sm">
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-slate-300 tracking-wider leading-none">
                                Snitt
                            </p>
                            <p id="player-banner-main" class="text-xl md:text-3xl font-black text-white leading-tight mt-1">
                                -
                            </p>
                            <p class="text-[8px] md:text-[9px] uppercase font-black text-bsk-yellow tracking-wider leading-none">
                                poeng
                            </p>
                        </div>
            
                        <p id="player-banner-sub" class="hidden md:block text-[10px] text-slate-300 mt-2 text-center">
                            valgt spiller
                        </p>
                    </div>
            
                </div>
            </div>

            <div id="poeng-table-container">
                <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                    <i class="fa-solid fa-user-chart text-4xl text-slate-300 mb-3"></i>
                    <h3 class="font-black text-slate-800 text-lg mb-1">Velg en spiller</h3>
                    <p class="text-sm text-slate-500">Da får du nøkkeltall og poenghistorikk for spilleren.</p>
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;

if (defaultPlayerName) {
    showPlayerPointsTable();
}
};

        window.showPlayerPointsTable = function() {
    const playerName = document.getElementById('poeng-player-select').value;
    const container = document.getElementById('poeng-table-container');
    
    if (!container) return;

    if (!playerName) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-user-chart text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Velg en spiller</h3>
                <p class="text-sm text-slate-500">Da får du nøkkeltall og poenghistorikk for spilleren.</p>
            </div>
        `;
        return;
    }
    
    const player = (window.activePlayers || []).find(p => p.navn === playerName);
    const history = typeof getPlayerMatchPointsHistory === 'function' ? getPlayerMatchPointsHistory(playerName) : [];
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <i class="fa-solid fa-circle-info text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-black text-slate-800 text-lg mb-1">Ingen spilte kamper</h3>
                <p class="text-sm text-slate-500">Ingen spilte kamper er registrert for denne spilleren ennå.</p>
            </div>
        `;
        return;
    }

    const chemistry = typeof calculatePlayerPerformanceChemistry === 'function'
        ? calculatePlayerPerformanceChemistry(playerName)
        : 0;

    const totalMatches = history.length;

    const ratings = history
        .map(h => Number(h.rating))
        .filter(r => !isNaN(r) && r > 0);

    const avgRating = ratings.length
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const totalPoints = history.reduce((sum, h) => sum + (Number(h.points) || 0), 0);
    const avgPoints = totalMatches ? totalPoints / totalMatches : 0;

    const bannerMain = document.getElementById('player-banner-main');
    const bannerSub = document.getElementById('player-banner-sub');
    
    if (bannerMain) {
        bannerMain.textContent = avgPoints ? avgPoints.toFixed(1) : '-';
    }
    
    if (bannerSub) {
        bannerSub.textContent = totalPoints + ' poeng totalt';
    }

    let totalGoals = 0;
    let totalYellow = 0;
    let totalRed = 0;
    let totalBb = 0;

    history.forEach(h => {
        const m = (window.activeMatches || []).find(match => match.id === h.matchId);
        if (!m) return;

        totalGoals += m.scorers && m.scorers[playerName] ? Number(m.scorers[playerName]) : 0;
        totalYellow += m.guleKort && m.guleKort.includes(playerName) ? 1 : 0;
        totalRed += m.rodeKort && m.rodeKort.includes(playerName) ? 1 : 0;
        totalBb += m.motm === playerName ? 1 : 0;
    });

    const card = (label, value, sub, icon, iconClass) => `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${label}</span>
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <i class="fa-solid ${icon} ${iconClass}"></i>
                </div>
            </div>
            <div class="text-2xl font-black text-slate-900">${value}</div>
            <div class="text-xs text-slate-500 mt-1">${sub}</div>
        </div>
    `;

    let tableHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            ${card('Kjemiscore', chemistry + '%', 'Total form og lojalitet', 'fa-heart-pulse', 'text-emerald-600')}
            ${card('Kamper', totalMatches, 'Registrerte kamper spilt', 'fa-futbol', 'text-bsk-blue')}
            ${card('Snittbørs', avgRating ? avgRating.toFixed(1) : '-', 'Gjennomsnittlig spillerbørs', 'fa-star', 'text-amber-500')}
            ${card('Mål / BB', `${totalGoals} / ${totalBb}`, `${totalYellow} gule · ${totalRed} røde`, 'fa-chart-line', 'text-indigo-600')}
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-black text-slate-800 text-sm">${playerName}</h3>
                        <p class="text-xs text-slate-500 mt-1 leading-snug">
                            Poenghistorikk per kamp. Nyeste kamp vises øverst.
                        </p>
                    </div>

                    <button 
                        onclick="document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');"
                        class="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 font-black text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-xl transition shadow-sm shrink-0 whitespace-nowrap"
                    >
                        <i class="fa-solid fa-circle-info"></i>
                        <span class="sm:hidden">Poeng</span>
                        <span class="hidden sm:inline">Slik regnes poengene</span>
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                        <tr>
                            <th class="p-4">Dato</th>
                            <th class="p-4">Motstander</th>
                            <th class="p-4 text-center">Poeng</th>
                            <th class="p-4 text-center">Børs</th>
                            <th class="p-4 text-center">Mål</th>
                            <th class="p-4 text-center text-indigo-600">BB</th>
                            <th class="p-4 text-center">Gult</th>
                            <th class="p-4 text-center">Rødt</th>
                            <th class="p-4 text-center">Res</th>
                            <th class="p-4 text-right">Rediger</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
    `;
    
    history.forEach(h => {
        const m = (window.activeMatches || []).find(match => match.id === h.matchId);

        let pointColor = 'text-slate-700';
        if (h.points >= 25) pointColor = 'text-emerald-600';
        else if (h.points >= 18) pointColor = 'text-bsk-blue';
        else if (h.points < 10) pointColor = 'text-rose-600';

        const goals = m && m.scorers && m.scorers[playerName] ? Number(m.scorers[playerName]) : 0;
        const yellow = m && m.guleKort && m.guleKort.includes(playerName);
        const red = m && m.rodeKort && m.rodeKort.includes(playerName);
        const bb = m && m.motm === playerName;

        const målVis = goals > 0
            ? `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black">⚽ ${goals}</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const bbVis = bb
            ? `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-black">👑 +1</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const yellowVis = yellow
            ? `<span class="text-amber-500 font-black">🟨</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const redVis = red
            ? `<span class="text-rose-600 font-black">🟥 -10</span>`
            : '<span class="text-slate-300 font-bold">-</span>';

        const dateText = h.date
            ? new Date(h.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })
            : '-';

        tableHtml += `
            <tr class="hover:bg-slate-50 transition" title="${h.breakdown}">
                <td class="p-4 text-slate-500 font-medium">${dateText}</td>
                <td class="p-4 font-black text-slate-800">${h.opponent}</td>
                <td class="p-4 text-center font-black text-lg ${pointColor}">${h.points}</td>
                <td class="p-4 text-center">
                    <span class="bg-bsk-blue text-white px-2 py-1 rounded text-[10px] font-black shadow-sm">${h.rating}</span>
                </td>
                <td class="p-4 text-center">${målVis}</td>
                <td class="p-4 text-center">${bbVis}</td>
                <td class="p-4 text-center">${yellowVis}</td>
                <td class="p-4 text-center">${redVis}</td>
                <td class="p-4 text-center font-semibold text-slate-600">${h.result}</td>
                <td class="p-4 text-right">
                    <button
                        onclick="openMatchStatsEditor('${h.matchId}')"
                        title="Rediger mål, kort og spillerbørs"
                        class="inline-flex items-center justify-center w-8 h-8 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-xl transition shadow-sm"
                    >
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = tableHtml;
};

        window.renderMatchStatsView = function() {
    const container = document.getElementById('stat-view-kampstat');
    if (!container) return;

    // Filtrer ut kamper som er spilt (som har et resultat)
    const playedMatches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Nyeste øverst

    // Bygg nedtrekksmenyen for kampene
    const optionsHtml = playedMatches.map(m => {
        const dateStr = new Date(m.date).toLocaleDateString('no-NO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const resultText = m.result ? ` · ${m.result}` : '';
        const groupText = m.matchGroup ? ` (${m.matchGroup})` : '';

        return `<option value="${m.id}">${m.opponent}${resultText}</option>`;
    }).join('');

let html = `
    <div class="space-y-6">
        <div id="kampstat-table-container">
            <div class="text-center py-10 text-slate-400 italic text-sm">
                ${playedMatches.length ? 'Laster siste spilte kamp...' : 'Ingen spilte kamper med resultat er registrert ennå.'}
            </div>
        </div>
    </div>
`;

    container.innerHTML = html;

    // Vis siste spilte kamp automatisk
    if (playedMatches.length > 0 && typeof window.showMatchStatsTable === 'function') {
        window.showMatchStatsTable();
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

    const playedMatches = (window.activeMatches || [])
        .filter(m => m.result && m.result.includes('-'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const matchId = matchSelect && matchSelect.value
        ? matchSelect.value
        : (playedMatches[0] ? playedMatches[0].id : '');
    
    const container = document.getElementById('kampstat-table-container');

    if (!container) return;

    if (!matchId) {
        container.innerHTML = '<div class="text-center py-10 text-slate-400 italic text-sm">Velg en kamp for å se statistikk for spillerne som deltok.</div>';
        return;
    }

    const match = (window.activeMatches || []).find(m => m.id === matchId);

    if (!match) {
    container.innerHTML = '<div class="text-center py-10 text-slate-500 font-medium">Fant ikke valgt kamp.</div>';
    return;
        }
        
        const attendance = match.attendance || {};
        
        let attendingPlayers = Object.keys(attendance).filter(pName => attendance[pName] === true);
        
        // Fallback: hvis attendance mangler, men ratings/scorers finnes, bruk dem
        if (attendingPlayers.length === 0) {
            const ratingPlayers = match.ratings ? Object.keys(match.ratings) : [];
            const scorerPlayers = match.scorers ? Object.keys(match.scorers) : [];
            const bbPlayer = match.motm ? [match.motm] : [];
        
            attendingPlayers = [...new Set([
                ...ratingPlayers,
                ...scorerPlayers,
                ...bbPlayer
            ])];
        }
            
    if (attendingPlayers.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-slate-500 font-medium">Ingen spillere var registrert med oppmøte på denne kampen.</div>';
        return;
    }

    const stats = attendingPlayers.map(pName => {
        const rating = match.ratings && match.ratings[pName] ? Number(match.ratings[pName]) : 0;
        const goals = match.scorers && match.scorers[pName] ? Number(match.scorers[pName]) : 0;
        const yellow = match.guleKort && match.guleKort.includes(pName) ? 1 : 0;
        const red = match.rodeKort && match.rodeKort.includes(pName) ? 1 : 0;
        const isBbInMatch = match.motm === pName;

        const pointsDetails = typeof window.calculatePlayerMatchPoints === 'function'
            ? window.calculatePlayerMatchPoints(match, pName, true)
            : { total: 0, base: 0, resultBonus: 0, ratingBonus: 0, bbBonus: 0 };

        return {
            name: pName,
            rating,
            goals,
            yellow,
            red,
            isBbInMatch,
            points: pointsDetails.total || 0,
            base: pointsDetails.base || 0,
            resultBonus: pointsDetails.resultBonus || 0,
            ratingBonus: pointsDetails.ratingBonus || 0,
            bbBonus: pointsDetails.bbBonus || 0,
            breakdown: `Start: ${pointsDetails.base || 0} | Res/Mål: ${(pointsDetails.resultBonus || 0) > 0 ? '+' + pointsDetails.resultBonus : (pointsDetails.resultBonus || 0)} | Børs: ${(pointsDetails.ratingBonus || 0) > 0 ? '+' + pointsDetails.ratingBonus : (pointsDetails.ratingBonus || 0)} | BB: ${(pointsDetails.bbBonus || 0) > 0 ? '+' + pointsDetails.bbBonus : '-'}`
        };
    });

    stats.sort((a, b) => b.points - a.points || b.rating - a.rating || b.goals - a.goals);

    const dateStr = match.date
        ? new Date(match.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    const matchResult = match.result || '?';
    const matchType = match.type || match.matchType || 'Kamp';
    const matchGroup = match.matchGroup || match.team || '';
    const opponent = match.opponent || 'Motstander';
    const pitch = match.pitch || match.bane || '';

    const avgRating = stats.filter(s => s.rating > 0).length
        ? stats.filter(s => s.rating > 0).reduce((sum, s) => sum + s.rating, 0) / stats.filter(s => s.rating > 0).length
        : 0;

    const totalGoals = stats.reduce((sum, s) => sum + s.goals, 0);
    const totalYellow = stats.reduce((sum, s) => sum + s.yellow, 0);
    const totalRed = stats.reduce((sum, s) => sum + s.red, 0);

    const bbPlayer = stats.find(s => s.isBbInMatch);
    const topScorer = [...stats].sort((a, b) => b.goals - a.goals)[0];
    const pointsLeader = stats[0];

    const pointColor = (points) => {
        if (points >= 25) return 'text-emerald-600';
        if (points >= 18) return 'text-bsk-blue';
        if (points >= 10) return 'text-slate-700';
        return 'text-rose-600';
    };

    const scoreBadge = (value, type = 'neutral') => {
        const styles = {
            blue: 'bg-bsk-blue/10 text-bsk-blue border-bsk-blue/10',
            emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            amber: 'bg-amber-50 text-amber-700 border-amber-100',
            rose: 'bg-rose-50 text-rose-700 border-rose-100',
            indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            slate: 'bg-slate-50 text-slate-600 border-slate-100'
        };

        return `<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black border ${styles[type] || styles.slate}">${value}</span>`;
    };

    const topFiveHtml = stats.slice(0, 5).map((s, index) => `
        <div class="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-full ${index === 0 ? 'bg-bsk-yellow text-bsk-blue' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-black text-xs shrink-0">
                    ${index + 1}
                </div>
                <div class="min-w-0">
                    <div class="font-black text-slate-800 truncate">${s.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Børs ${s.rating || '-'} · Mål ${s.goals} · BB ${s.isBbInMatch ? '+1' : '-'}
                    </div>
                </div>
            </div>
            <div class="text-right font-black ${pointColor(s.points)}">${s.points}</div>
        </div>
    `).join('');

    const rowsHtml = stats.map(s => {
        const baseVis = scoreBadge(`+${s.base}`, 'slate');
        const resultVis = scoreBadge(`${s.resultBonus > 0 ? '+' : ''}${s.resultBonus}`, s.resultBonus >= 0 ? 'blue' : 'rose');
        const ratingVis = s.rating > 0
            ? scoreBadge(`${s.ratingBonus > 0 ? '+' : ''}${s.ratingBonus}`, s.ratingBonus >= 0 ? 'emerald' : 'rose')
            : '<span class="text-slate-300 font-bold">-</span>';

        const goalVis = s.goals > 0
            ? scoreBadge(`⚽ +${s.goals}`, 'emerald')
            : '<span class="text-slate-300 font-bold">-</span>';

       const yellowVis = s.yellow > 0
            ? scoreBadge('🟨 0', 'amber')
            : '<span class="text-slate-300 font-bold">-</span>';

        const redVis = s.red > 0
            ? scoreBadge('🟥 -10', 'rose')
            : '<span class="text-slate-300 font-bold">-</span>';

        const bbVis = s.isBbInMatch
            ? scoreBadge('👑 +1', 'indigo')
            : '<span class="text-slate-300 font-bold">-</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors" title="${s.breakdown}">
                <td class="p-4 font-black text-slate-800">${s.name}</td>
                <td class="p-4 text-center font-black text-lg ${pointColor(s.points)}">${s.points}</td>
                <td class="p-4 text-center">${ratingVis}</td>
                <td class="p-4 text-center">${goalVis}</td>
                <td class="p-4 text-center">${bbVis}</td>
                <td class="p-4 text-center">${yellowVis}</td>
                <td class="p-4 text-center">${redVis}</td>
                <td class="p-4 text-center">${resultVis}</td>
                <td class="p-4 text-center">${baseVis}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="space-y-6">

            <div class="bg-gradient-to-r from-bsk-blue to-bsk-blueLight rounded-2xl p-6 shadow-md text-white border border-bsk-blueDark">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div>
                        <p class="text-[10px] font-black text-bsk-yellow uppercase tracking-[0.25em] mb-2">Kampanalyse</p>
                        <h2 class="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 flex-nowrap">
                            <span>BSK -</span>
                            <span class="relative inline-block flex-1 min-w-0 max-w-[260px]">
                                <select 
                                    id="kampstat-match-select" 
                                    onfocus="expandKampSelectLabels()"
                                    onmousedown="expandKampSelectLabels()"
                                    onblur="collapseKampSelectLabel()"
                                    onchange="showMatchStatsTable()" 
                                    class="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2 pr-9 text-lg md:text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-bsk-yellow/60 cursor-pointer truncate"
                                >
                                    ${playedMatches.map(m => {
                                        const optionDate = m.date
                                            ? new Date(m.date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                            : '';
                                
                                        const shortText = m.opponent || 'Motstander';
                                        const fullText = `${m.opponent || 'Motstander'}${optionDate ? ' · ' + optionDate : ''}${m.result ? ' · ' + m.result : ''}`;
                                
                                        return `
                                            <option 
                                                class="text-slate-900" 
                                                value="${m.id}" 
                                                data-short="${shortText}" 
                                                data-full="${fullText}"
                                                ${m.id === matchId ? 'selected' : ''}
                                            >
                                                ${shortText}
                                            </option>
                                        `;
                                    }).join('')}
                                </select>
                                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-bsk-yellow text-xs pointer-events-none"></i>
                            </span>
                        </h2>
                        <p class="text-sm text-slate-200 mt-1">
                            ${matchType} ${matchGroup ? '· ' + matchGroup : ''} ${dateStr ? '· ' + dateStr : ''} ${pitch ? '· ' + pitch : ''}
                        </p>
                    </div>
                    <div class="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center min-w-[130px]">
                        <p class="text-[10px] uppercase font-black text-slate-300 mb-1">Resultat</p>
                        <p class="text-3xl font-black text-bsk-yellow">${matchResult}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Banens beste</span>
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">👑</div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${bbPlayer ? bbPlayer.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${bbPlayer ? '+1 BB-bonus' : 'Ingen BB registrert'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toppscorer</span>
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">⚽</div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${topScorer && topScorer.goals > 0 ? topScorer.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${topScorer && topScorer.goals > 0 ? topScorer.goals + ' mål' : 'Ingen mål registrert'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mest poeng</span>
                        <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <i class="fa-solid fa-chart-line text-bsk-blue"></i>
                        </div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${pointsLeader ? pointsLeader.name : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">${pointsLeader ? pointsLeader.points + ' matchpoeng' : 'Ingen poengdata'}</div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kampbildet</span>
                        <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                            <i class="fa-solid fa-clipboard-list text-amber-600"></i>
                        </div>
                    </div>
                    <div class="text-xl font-black text-slate-900">${avgRating ? avgRating.toFixed(1) : '-'}</div>
                    <div class="text-xs text-slate-500 mt-1">Snittbørs · ${totalGoals} mål · ${totalYellow}🟨 ${totalRed}🟥</div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-5 border-b border-slate-100 bg-slate-50">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="font-black text-slate-800 text-sm">Spillerstatistikk</h3>
                                <p class="text-xs text-slate-500 mt-1 leading-snug">
                                    Poengfordeling for spillerne som var registrert med oppmøte i kampen.
                                </p>
                            </div>
                        
                            <div class="flex items-center gap-2 shrink-0">
                                <button 
                                    onclick="document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');"
                                    class="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 font-black text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
                                >
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span class="sm:hidden">Poeng</span>
                                    <span class="hidden sm:inline">Slik regnes poengene</span>
                                </button>
                            
                                <button
                                    onclick="openMatchStatsEditor('${match.id}')"
                                    title="Rediger mål, kort og spillerbørs"
                                    class="inline-flex items-center justify-center w-9 h-9 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-xl transition shadow-sm"
                                >
                                    <i class="fa-solid fa-pen-to-square text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="bg-white text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                <tr>
                                    <th class="p-4">Spiller</th>
                                    <th class="p-4 text-center">Poeng</th>
                                    <th class="p-4 text-center">Børs</th>
                                    <th class="p-4 text-center">Mål</th>
                                    <th class="p-4 text-center text-indigo-600">BB</th>
                                    <th class="p-4 text-center">Gult</th>
                                    <th class="p-4 text-center">Rødt</th>
                                    <th class="p-4 text-center">Res/Mål</th>
                                    <th class="p-4 text-center">Start</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-5 border-b border-slate-100 bg-slate-50">
                        <h3 class="font-black text-slate-800 text-sm">Kampoppsummering</h3>
                        <p class="text-xs text-slate-500 mt-1">Kort bilde av kampen basert på registrerte data.</p>
                    </div>
                
                    <div class="p-5 space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Snittbørs</p>
                                <p class="text-xl font-black text-bsk-blue mt-1">${avgRating ? avgRating.toFixed(1) : '-'}</p>
                            </div>
                
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mål</p>
                                <p class="text-xl font-black text-emerald-600 mt-1">${totalGoals}</p>
                            </div>
                
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gule kort</p>
                                <p class="text-xl font-black text-amber-600 mt-1">${totalYellow}</p>
                            </div>
                
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Røde kort</p>
                                <p class="text-xl font-black text-rose-600 mt-1">${totalRed}</p>
                            </div>
                        </div>
                
                        <div class="border-t border-slate-100 pt-4 space-y-3">
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">👑 Banens beste</span>
                                <span class="text-xs font-black text-slate-800 text-right">${bbPlayer ? bbPlayer.name : '-'}</span>
                            </div>
                        
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">⚽ Toppscorer</span>
                                <span class="text-xs font-black text-slate-800 text-right">
                                    ${topScorer && topScorer.goals > 0 ? topScorer.name + ' · ' + topScorer.goals + ' mål' : '-'}
                                </span>
                            </div>
                        
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold text-slate-500">📈 Mest poeng</span>
                                <span class="text-xs font-black text-slate-800 text-right">
                                    ${pointsLeader ? pointsLeader.name + ' · ' + pointsLeader.points + ' p' : '-'}
                                </span>
                            </div>

                            <div class="border-t border-slate-100 pt-4 space-y-3">
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Positivt
                                    </label>
                                    <textarea
                                        id="match-note-positive"
                                        rows="2"
                                        placeholder="Hva fungerte bra i denne kampen?"
                                        onblur="saveMatchSummaryNotes('${match.id}')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-bsk-blue focus:ring-1 focus:ring-bsk-blue resize-none"
                                    >${match.notes?.positive || ''}</textarea>
                                </div>
                            
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Utfordring
                                    </label>
                                    <textarea
                                        id="match-note-challenge"
                                        rows="2"
                                        placeholder="Hva må vi forbedre eller følge opp?"
                                        onblur="saveMatchSummaryNotes('${match.id}')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-bsk-blue focus:ring-1 focus:ring-bsk-blue resize-none"
                                    >${match.notes?.challenge || ''}</textarea>
                                </div>
                            </div>
                            
                            <div class="pt-3">
                                <button 
                                    onclick="openTacticalPlanForMatch('${match.id}')"
                                    class="w-full bg-bsk-blue hover:bg-bsk-blueLight text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2 border border-bsk-blueDark"
                                >
                                    <i class="fa-solid fa-chess-board text-bsk-yellow"></i>
                                    Gå til kampplan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
    window.collapseKampSelectLabel();
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

        window.saveMatchSummaryNotes = async function(matchId) {
            const match = (window.activeMatches || []).find(m => m.id === matchId);
            if (!match) return;
        
            const positiveInput = document.getElementById('match-note-positive');
            const challengeInput = document.getElementById('match-note-challenge');
        
            match.notes = {
                ...(match.notes || {}),
                positive: positiveInput ? positiveInput.value.trim() : '',
                challenge: challengeInput ? challengeInput.value.trim() : ''
            };
        
            if (typeof window.saveMatchToDatabase === 'function') {
                await window.saveMatchToDatabase(match);
            }
        };
        
        window.sortStatsTable = function(column) {
            if (currentStatSortCol === column) currentStatSortDesc = !currentStatSortDesc; 
            else { currentStatSortCol = column; currentStatSortDesc = true; }
            renderPlayerStatsTable(); 
        };

        window.renderPlayerStatsTable = function() {
            const tableBody = document.getElementById('stats-player-table-body');
            const theadContainer = tableBody ? tableBody.previousElementSibling : null;
            if (!tableBody || !theadContainer) return;
            
            const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
            const allEvents = [...(window.activeEvents || []), ...(window.activeMatches || []).map(m => ({ ...m, type: 'Kamp', team: m.matchGroup }))];

            const todayForStats = new Date();
            todayForStats.setHours(0, 0, 0, 0);

            let statsData = (window.activePlayers || []).filter(p => filterLag === 'Alle' || p.spillerLag === filterLag).map(p => {
                const teamEvents = allEvents.filter(e => {
                    if (e.team !== p.spillerLag) return false;
                    if (e.date) {
                        const eventDate = new Date(e.date);
                        eventDate.setHours(0, 0, 0, 0);
                        if (eventDate > todayForStats) return false;
                    }
                    return true;
                });

                // NYTT: Lagt til 'bb' i tellingen
                let attended = 0, kamper = 0, yellow = 0, red = 0, mal = 0, totalMatchPoints = 0, bb = 0;

                teamEvents.forEach(e => {
                    if (e.attendance && e.attendance[p.navn] === true) {
                        attended++;
                        if (e.type === 'Kamp') {
                            kamper++; 
                            if (e.scorers && e.scorers[p.navn]) mal += e.scorers[p.navn];
                            totalMatchPoints += window.calculatePlayerMatchPoints(e, p.navn);
                            // NYTT: Sjekker om spilleren ble Banens Beste i denne kampen
                            if (e.motm === p.navn) bb++;
                        }
                    }
                    if (e.type === 'Kamp') {
                        if (e.guleKort && e.guleKort.includes(p.navn)) yellow++;
                        if (e.rodeKort && e.rodeKort.includes(p.navn)) red++;
                    }
                });

                return {
                    navn: p.navn, pos1: p.pos1 || '', oppmotePct: teamEvents.length > 0 ? Math.round((attended / teamEvents.length) * 100) : 0,
                    kamper: kamper, mal: mal, kampbonus: kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0,
                    gule: yellow, rode: red, kjemi: calculatePlayerPerformanceChemistry(p.navn),
                    bb: bb // NYTT: Sender bb-antallet videre til visningen
                };
            });

            statsData.sort((a, b) => {
                if (currentStatSortCol === 'navn') return currentStatSortDesc ? a.navn.localeCompare(b.navn) : b.navn.localeCompare(a.navn);
                return currentStatSortDesc ? b[currentStatSortCol] - a[currentStatSortCol] : a[currentStatSortCol] - b[currentStatSortCol];
            });

            // NYTT: Lagt til BB-kolonne i tabellhodet (mellom Mål og Bonus)
            theadContainer.className = "bg-slate-50 text-slate-500 text-xs uppercase font-bold cursor-pointer select-none border-b border-slate-200";
            theadContainer.innerHTML = `
                <tr>
                    <th class="p-4 hover:text-slate-800 transition-colors" onclick="sortStatsTable('navn')">Spiller <span id="sort-icon-navn"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('oppmotePct')">Oppmøte <span id="sort-icon-oppmotePct"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('kamper')">Kamper <span id="sort-icon-kamper"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('mal')">Mål <span id="sort-icon-mal"></span></th>
                    <th class="p-4 text-center text-indigo-600 hover:text-indigo-800 transition-colors" onclick="sortStatsTable('bb')">BB <span id="sort-icon-bb"></span></th>
                    <th class="p-4 text-center text-blue-500 hover:text-blue-700 transition-colors" onclick="sortStatsTable('kampbonus')">Bonus <span id="sort-icon-kampbonus"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('gule')">Gule <span id="sort-icon-gule"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors" onclick="sortStatsTable('rode')">Røde <span id="sort-icon-rode"></span></th>
                    <th class="p-4 text-center hover:text-slate-800 transition-colors">
                        <span onclick="sortStatsTable('kjemi')">Kjemi <span id="sort-icon-kjemi"></span></span>
                        <i class="fa-solid fa-circle-info text-emerald-500 hover:text-emerald-400 ml-2 cursor-pointer transition-colors" onclick="event.stopPropagation(); document.getElementById('kjemi-info-modal').classList.remove('hidden'); document.getElementById('kjemi-info-modal').classList.add('flex');" title="Les mer om Kjemiscore"></i>
                    </th>
                </tr>
            `;

            // NYTT: Lagt til 'bb' i listen over kolonne-ikoner som oppdateres
            ['navn', 'oppmotePct', 'kamper', 'mal', 'bb', 'kampbonus', 'gule', 'rode', 'kjemi'].forEach(col => {
                const iconEl = document.getElementById(`sort-icon-${col}`);
                if(iconEl) iconEl.innerHTML = col === currentStatSortCol ? (currentStatSortDesc ? '<i class="fa-solid fa-sort-down ml-1 text-bsk-blue"></i>' : '<i class="fa-solid fa-sort-up ml-1 text-bsk-blue"></i>') : '';
            });

            tableBody.className = "divide-y divide-slate-100 bg-white";

            tableBody.innerHTML = statsData.map(stat => {
                const isStarPlayer = stat.kjemi >= 75; 
                let chemColor = 'text-rose-500'; 
                if (stat.kjemi >= 75) chemColor = 'text-emerald-500'; 
                else if (stat.kjemi >= 50) chemColor = 'text-amber-500'; 
                else if (stat.kjemi === 0) chemColor = 'text-slate-400'; 

                let bonusColor = 'text-slate-400';
                if (stat.kampbonus > 15) bonusColor = 'text-emerald-500';
                else if (stat.kampbonus >= 10) bonusColor = 'text-amber-500';
                else if (stat.kampbonus > 0) bonusColor = 'text-rose-500';
                
                let bonusTekst = stat.kamper > 0 ? stat.kampbonus.toFixed(1) : '-';
                let malFarge = stat.mal > 0 ? 'text-slate-800 font-bold' : 'text-slate-300 font-bold';
                let gulFarge = stat.gule > 0 ? (stat.gule % 4 === 3 ? 'text-yellow-500 animate-pulse font-bold' : 'text-slate-800 font-bold') : 'text-slate-300 font-bold';
                let rodFarge = stat.rode > 0 ? 'text-rose-600 bg-rose-50 font-bold' : 'text-slate-300 font-bold';
                
                // NYTT: Fargestil for BB-kolonnen (Delikat lilla stil)
                let bbFarge = stat.bb > 0 ? 'text-indigo-600 font-black text-sm' : 'text-slate-300 font-bold';

                // NYTT: Lagt til <td>-cellen for BB i raden
                return `
                    <tr class="bg-white hover:bg-slate-50 transition-colors">
                        <td class="p-4"><div class="font-bold text-slate-800">${stat.navn}</div><div class="text-[10px] text-slate-500 uppercase tracking-wide">${stat.pos1}</div></td>
                        <td class="p-4 text-center font-bold text-slate-700">${stat.oppmotePct}%</td>
                        <td class="p-4 text-center font-bold text-slate-800">${stat.kamper}</td>
                        <td class="p-4 text-center ${malFarge}">${stat.mal > 0 ? stat.mal : '-'}</td>
                        <td class="p-4 text-center ${bbFarge}">${stat.bb > 0 ? stat.bb : '-'}</td>
                        <td class="p-4 text-center font-bold ${bonusColor}">${bonusTekst}</td>
                        <td class="p-4 text-center ${gulFarge}">${stat.gule > 0 ? stat.gule : '-'}</td>
                        <td class="p-4 text-center ${rodFarge}">${stat.rode > 0 ? stat.rode : '-'}</td>
                        <td class="p-4 text-center font-bold ${chemColor}">${stat.kjemi}% ${isStarPlayer ? '<span class="ml-1 text-xs text-amber-400">★</span>' : ''}</td>
                    </tr>`;
            }).join('');
        };

        // Oppstarts-timeren ligger helt til slutt i dokumentet
        setTimeout(() => {
            updateDynamicSelectors(); applyFilters(); updateDashboard(); renderPlayerRoster();
            recalculateOppmoteAndKjemi(); renderCalendar(); switchTab('hjem');
        }, 300);
        
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
                if (m.matchGroup === playerObj.spillerLag && m.attendance && m.attendance[playerObj.navn] === true) {
                    kamper++;
                    totalMatchPoints += window.calculatePlayerMatchPoints(m, playerObj.navn);
                }
            });
            let playerFormSnitt = kamper > 0 ? Math.round(totalMatchPoints / kamper) : 0;
            
            // NYTT: Summerer kampsnittet til alle som er valgt utpå banen
            realTotalBonus += playerFormSnitt;
            
            // Reell kjemi (0-100 per spiller)
            realTotalChem += typeof calculatePlayerPerformanceChemistry === 'function' 
                ? calculatePlayerPerformanceChemistry(playerObj.navn) 
                : 0;
        }
    });

    // Kjemiscoren vises fortsatt som et rent lag-snitt (f.eks. 42/46)
    const realChemSnitt = currentOnBoardCount > 0 ? Math.round(realTotalChem / currentOnBoardCount) : 0;

    // --- 2. BEREGN REELL MAKS FOR TROPPEN (GULLREKKA BASERT PÅ TILGJENGELIGHET) ---
    const filterLag = document.getElementById('lagFilterSelect') ? document.getElementById('lagFilterSelect').value : 'Alle';
    const matchId = document.getElementById('tacticalMatchSelect') ? document.getElementById('tacticalMatchSelect').value : null;
    const currentMatch = matchId ? (window.activeMatches || []).find(m => m.id === matchId) : null;
    const isAttendanceStarted = currentMatch && currentMatch.attendance && Object.values(currentMatch.attendance).some(v => v === true || v === false);

    // Hent alle tilgjengelige spillere til akkurat denne kampen/økten
    let availablePlayers = [...(window.activePlayers || [])].filter(p => {
        if (p.status === 'Passiv' || (filterLag !== 'Alle' && p.spillerLag !== filterLag)) return false;
        if (currentMatch && isAttendanceStarted && currentMatch.attendance[p.navn] !== true) return false;
        return true;
    });

    // Hjelpefunksjon for å hente en spillers kampsnitt
    const getPlayerFormSnitt = (pObj) => {
        let kamper = 0; let totalMatchPoints = 0;
        (window.activeMatches || []).forEach(m => {
            if (m.matchGroup === pObj.spillerLag && m.attendance && m.attendance[pObj.navn] === true) {
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
    
    if (keepere.length > 0 && typeof calculatePlayerPerformanceChemistry === 'function') {
        const sortedKeepersByChem = [...keepere].sort((a, b) => calculatePlayerPerformanceChemistry(b.navn) - calculatePlayerPerformanceChemistry(a.navn));
        maxChemSum += calculatePlayerPerformanceChemistry(sortedKeepersByChem[0].navn);
        chemCount++;
    }
    
    if (typeof calculatePlayerPerformanceChemistry === 'function') {
        const sortedOutfieldsByChem = [...utespillere].sort((a, b) => calculatePlayerPerformanceChemistry(b.navn) - calculatePlayerPerformanceChemistry(a.navn));
        let totalTargetPlayers = Math.min(11, availablePlayers.length);
        const targetOutfieldChemCount = totalTargetPlayers - chemCount;
        
        sortedOutfieldsByChem.slice(0, targetOutfieldChemCount).forEach(p => {
            maxChemSum += calculatePlayerPerformanceChemistry(p.navn);
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

   window.getPlayerMatchPointsHistory = function(playerName) {
    const playerObj = (window.activePlayers || []).find(p => p.navn === playerName);
    if (!playerObj) return [];
    
    const history = [];
    
    (window.activeMatches || []).forEach(m => {
        // Sjekker kun kamper der spilleren faktisk møtte opp
        if (m.matchGroup === playerObj.spillerLag && m.attendance && m.attendance[playerName] === true) {
            
            // Henter ut detaljert poengberegning fra motoren vår
            const ptsDetails = window.calculatePlayerMatchPoints(m, playerName, true);
            
            history.push({
                matchId: m.id,
                date: m.date,
                opponent: m.opponent,
                result: m.result || 'Ikke spilt',
                rating: m.ratings && m.ratings[playerName] ? m.ratings[playerName] : '-',
                points: ptsDetails.total,
                breakdown: `Start: ${ptsDetails.base} | Res/Mål: ${ptsDetails.resultBonus > 0 ? '+' + ptsDetails.resultBonus : ptsDetails.resultBonus} | Børs: ${ptsDetails.ratingBonus > 0 ? '+' + ptsDetails.ratingBonus : ptsDetails.ratingBonus}`
            });
        }
    });
    
    // Sorterer fra nyeste kamp til eldste
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};
