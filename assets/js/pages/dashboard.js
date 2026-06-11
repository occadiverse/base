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
            const formGuide = window.getFormGuide();
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
};

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
        const score = typeof window.calculatePlayerPerformanceChemistry === 'function' ? window.calculatePlayerPerformanceChemistry(p.navn) : 0;
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
