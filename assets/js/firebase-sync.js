

        const initialMockMatches = window.initialMockMatches || [];
        const initialMockTeams = window.initialMockTeams || [];
        const initialMockPlayers = window.initialMockPlayers || [];
        const initialMockEvents = window.initialMockEvents || [];
        
        const appId = "bsk-fotball-app";

        let db = null;
        let auth = null;
        let signInAnonymously = null;
        let doc = null;
        let setDoc = null;
        let onSnapshot = null;
        let collection = null;
        let deleteDoc = null;
        
        let activeMatchesCollectionRef = null;
        let activeTeamsCollectionRef = null;
        let activePlayersCollectionRef = null;
        let activeEventsCollectionRef = null;
        let firebaseEnabled = false;
        let hasHandledInitialPlayersSnapshot = false;


        async function loadFirestoreConfig() {
            try {
                return await import('../../firestore-config.js');
            } catch (firstError) {
                try {
                    return await import('../../firestore.config.js');
                } catch (secondError) {
                    return null;
                }
            }
        }

        try {
            ({ signInAnonymously } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'));
            ({ doc, setDoc, onSnapshot, collection, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'));
            const firestoreConfig = await loadFirestoreConfig();
            if (!firestoreConfig) throw new Error("Firestore-config mangler, bruker lokal lagring.");
            ({ db, auth } = firestoreConfig);
            await signInAnonymously(auth);
            if (!db) throw new Error("Database-objektet (db) er undefined!");

            activeMatchesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
            activeTeamsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
            activePlayersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'players');
            activeEventsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
            
            firebaseEnabled = true;
            console.log("Firebase lastet inn via firestore-config.js! 🎉");
        } catch (err) {
            console.warn("Firebase ikke aktivert:", err.message);
            firebaseEnabled = false;
            loadAllFromLocalStorage(); 
        }

        async function persistRepairedEvents(repairedEvents) {
            if (!repairedEvents.length || typeof window.saveEventToDatabase !== 'function') return;

            for (const event of repairedEvents) {
                try {
                    await window.saveEventToDatabase(event);
                } catch (error) {
                    console.warn('Kunne ikke rydde oppmøtedata for aktivitet:', event.id, error);
                }
            }
        }

        async function persistRepairedPlayers(repairedPlayers) {
            if (!repairedPlayers.length || typeof window.savePlayerToDatabase !== 'function') return;

            for (const player of repairedPlayers) {
                try {
                    await window.savePlayerToDatabase(player);
                } catch (error) {
                    console.warn('Kunne ikke tildele spiller-ID:', player.navn, error);
                }
            }
        }

        async function persistRepairedMatches(repairedMatches) {
            if (!repairedMatches.length || typeof window.saveMatchToDatabase !== 'function') return;

            for (const match of repairedMatches) {
                try {
                    await window.saveMatchToDatabase(match);
                } catch (error) {
                    console.warn('Kunne ikke gjenopprette oppmøte for kamp:', match.id, error);
                }
            }
        }

        function getCachedCollection(key) {
            const raw = window.localStorage.getItem('bsk_local_' + key);
            if (!raw) return [];

            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn(`Kunne ikke lese lokal cache for ${key}:`, error);
                return [];
            }
        }

        function getPlayerIdentityKeys(player) {
            const keys = [];
            if (window.isValidPlayerRefKey(player?.id)) keys.push(`id:${player.id}`);
            const normalizedName = (player?.navn || '').trim().toLowerCase();
            if (normalizedName) keys.push(`name:${normalizedName}`);
            return keys;
        }

        function mergeInitialPlayersWithLocalCache(firebasePlayers) {
            const cachedPlayers = getCachedCollection('players');
            if (cachedPlayers.length <= firebasePlayers.length) return firebasePlayers;

            const seenKeys = new Set();
            firebasePlayers.forEach(player => {
                getPlayerIdentityKeys(player).forEach(key => seenKeys.add(key));
            });

            const recoveredPlayers = [];
            const mergedPlayers = [...firebasePlayers];

            cachedPlayers.forEach(player => {
                const keys = getPlayerIdentityKeys(player);
                if (keys.some(key => seenKeys.has(key))) return;

                const recovered = typeof window.ensurePlayerId === 'function'
                    ? window.ensurePlayerId(player)
                    : { ...player, id: player.id || crypto.randomUUID() };

                recoveredPlayers.push(recovered);
                mergedPlayers.push(recovered);
                getPlayerIdentityKeys(recovered).forEach(key => seenKeys.add(key));
            });

            if (recoveredPlayers.length > 0) {
                console.warn(`Gjenopprettet ${recoveredPlayers.length} spillere fra lokal cache.`);
                setTimeout(() => persistRepairedPlayers(recoveredPlayers), 0);
            }

            return mergedPlayers;
        }

        function attendanceMapsEqual(left, right) {
            return JSON.stringify(left || {}) === JSON.stringify(right || {});
        }

        function syncMatches(matchesData) {
            const normalized = (matchesData || []).map(m => (
                typeof window.normalizeMatchPlayerRefs === 'function'
                    ? window.normalizeMatchPlayerRefs(m)
                    : m
            ));

            window.activeMatches = normalized;
            window.localStorage.setItem('bsk_local_matches', JSON.stringify(normalized));
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
            if (typeof window.applyFilters === 'function') window.applyFilters();
            refreshOpenMatchDetails();
            refreshVisibleStatistics();
        }

        function refreshOpenMatchDetails() {
            if (window.currentTab !== 'kampdetaljer') return;
            if (!window.activeDetailsId || typeof window.showMatchDetails !== 'function') return;
            const activeMatch = window.activeMatches?.find(match => match.id === window.activeDetailsId);
            if (!activeMatch) return;

            if (
                window.activeMatchGamePlanTab === 'bench'
                && typeof window.syncMatchGamePlanBenchPanel === 'function'
                && document.querySelector('[data-game-plan-page="bench"] .match-game-plan-bench-panel')
            ) {
                requestAnimationFrame(() => window.syncMatchGamePlanBenchPanel(activeMatch));
                return;
            }

            const activeElement = document.activeElement;
            const isEditing = activeElement && activeElement.closest && activeElement.closest(
                '#kampdetaljer-info input, #kampdetaljer-info textarea, #kampdetaljer-info select'
            );
            if (isEditing) return;

            requestAnimationFrame(() => window.showMatchDetails(window.activeDetailsId));
        }

        function syncTeams(teamsData) {
            window.activeTeams = teamsData;
            window.localStorage.setItem('bsk_local_teams', JSON.stringify(teamsData));
            if (typeof window.updateDynamicSelectors === 'function') window.updateDynamicSelectors();
            if (typeof window.renderAdminTeamsList === 'function') window.renderAdminTeamsList();
            refreshVisibleStatistics();
        }

        function syncPlayers(playersData) {
            const repairedPlayers = [];
            const seenIds = new Set();
            const normalized = (playersData || []).map(player => {
                let next = typeof window.ensurePlayerId === 'function'
                    ? window.ensurePlayerId(player)
                    : player;
                let needsRepair = !window.isValidPlayerRefKey(player.id);

                if (seenIds.has(next.id)) {
                    next = { ...next, id: crypto.randomUUID() };
                    needsRepair = true;
                }

                seenIds.add(next.id);
                if (needsRepair) repairedPlayers.push(next);
                return next;
            });

            window.activePlayers = normalized;
            window.localStorage.setItem('bsk_local_players', JSON.stringify(normalized));
            if (typeof window.renderPlayerRoster === 'function') window.renderPlayerRoster();
            if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi();
            refreshVisibleStatistics();

            if (repairedPlayers.length > 0) {
                persistRepairedPlayers(repairedPlayers);
            }

            if (Array.isArray(window.activeEvents) && window.activeEvents.length > 0) {
                syncEvents(window.activeEvents);
            }

            if (Array.isArray(window.activeMatches) && window.activeMatches.length > 0) {
                syncMatches(window.activeMatches);
            }
        }

        function syncEvents(eventsData) {
            const normalized = (eventsData || []).map(event => {
                const next = typeof window.normalizeEventPlayerRefs === 'function'
                    ? window.normalizeEventPlayerRefs(event)
                    : event;
                return next;
            });
            window.activeEvents = normalized;
            window.localStorage.setItem('bsk_local_events', JSON.stringify(normalized));
            if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi();
            if (typeof window.renderCalendar === 'function') window.renderCalendar();
            if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
            if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget();
            refreshVisibleStatistics();
        }

        function refreshVisibleStatistics() {
            if (window.currentTab !== 'statistikk') return;
            if (typeof window.switchStatTab !== 'function') return;

            if (typeof window.updateDynamicSelectors === 'function') {
                window.updateDynamicSelectors();
            }

            const activeStatTab = document.querySelector('.stat-tab-btn.is-active');
            const activeTab = activeStatTab && activeStatTab.id
                ? activeStatTab.id.replace('stat-tab-', '')
                : (document.getElementById('stat-view-spillere')?.classList.contains('block')
                    ? 'spillere'
                    : (document.getElementById('stat-view-kampstat')?.classList.contains('block') ? 'kampstat' : 'lag'));

            window.switchStatTab(activeTab);
        }

        if (firebaseEnabled && auth && auth.currentUser) {
            function handleSyncError(key, syncFn, mockData, error) {
                console.warn(`Database-tilgang avvist for ${key} (Faller tilbake til lokal lagring):`, error.message);
                const cached = window.localStorage.getItem('bsk_local_' + key);
                syncFn(cached ? JSON.parse(cached) : mockData);
            }

            onSnapshot(activeMatchesCollectionRef, (snapshot) => {
                const fb = [];
                snapshot.forEach((docSnap) => { fb.push({ ...docSnap.data(), id: docSnap.id }); });
                if (fb.length === 0) {
                    initialMockMatches.forEach(async (m) => { try { await setDoc(doc(activeMatchesCollectionRef, m.id), m); } catch(e){} });
                } else { 
                    syncMatches(fb); 
                    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
                }
            }, (error) => handleSyncError('matches', syncMatches, initialMockMatches, error));

            onSnapshot(activeTeamsCollectionRef, (snapshot) => {
                const fb = [];
                snapshot.forEach((docSnap) => { fb.push({ ...docSnap.data(), id: docSnap.id }); });
                if (fb.length === 0) {
                    initialMockTeams.forEach(async (t) => { try { await setDoc(doc(activeTeamsCollectionRef, t.id), t); } catch(e){} });
                } else { syncTeams(fb); }
            }, (error) => handleSyncError('teams', syncTeams, initialMockTeams, error));

            onSnapshot(activePlayersCollectionRef, (snapshot) => {
                const fb = [];
                snapshot.forEach((docSnap) => { fb.push({ ...docSnap.data(), id: docSnap.id }); });
                if (fb.length === 0) {
                    const cachedPlayers = getCachedCollection('players');
                    const seedPlayers = cachedPlayers.length > 0 ? cachedPlayers : initialMockPlayers;
                    const normalizedSeedPlayers = seedPlayers.map(player => (
                        typeof window.ensurePlayerId === 'function'
                            ? window.ensurePlayerId(player)
                            : { ...player, id: player.id || crypto.randomUUID() }
                    ));
                    hasHandledInitialPlayersSnapshot = true;
                    syncPlayers(normalizedSeedPlayers);
                    normalizedSeedPlayers.forEach(async (p) => { try { await setDoc(doc(activePlayersCollectionRef, p.id), p); } catch(e){} });
                } else {
                    const playersToSync = hasHandledInitialPlayersSnapshot
                        ? fb
                        : mergeInitialPlayersWithLocalCache(fb);
                    hasHandledInitialPlayersSnapshot = true;
                    syncPlayers(playersToSync);
                }
            }, (error) => handleSyncError('players', syncPlayers, initialMockPlayers, error));

            onSnapshot(activeEventsCollectionRef, (snapshot) => {
                const fb = [];
                snapshot.forEach((docSnap) => { fb.push({ ...docSnap.data(), id: docSnap.id }); });
                if (fb.length === 0) {
                    initialMockEvents.forEach(async (e) => { try { await setDoc(doc(activeEventsCollectionRef, e.id), e); } catch(e){} });
                } else { 
                    syncEvents(fb); 
                }
            }, (error) => handleSyncError('events', syncEvents, initialMockEvents, error));
        } else {
            loadAllFromLocalStorage();
        }

        function loadAllFromLocalStorage() {
            const cachedMatches = window.localStorage.getItem('bsk_local_matches');
            syncMatches(cachedMatches ? JSON.parse(cachedMatches) : initialMockMatches);
            const cachedTeams = window.localStorage.getItem('bsk_local_teams');
            syncTeams(cachedTeams ? JSON.parse(cachedTeams) : initialMockTeams);
            const cachedPlayers = window.localStorage.getItem('bsk_local_players');
            syncPlayers(cachedPlayers ? JSON.parse(cachedPlayers) : initialMockPlayers);
            const cachedEvents = window.localStorage.getItem('bsk_local_events');
            syncEvents(cachedEvents ? JSON.parse(cachedEvents) : initialMockEvents);
        }

        window.saveMatchToDatabase = async function(matchObject) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    const id = matchObject.id || crypto.randomUUID();
                    matchObject.id = id;
                    const current = [...(window.activeMatches || [])];
                    const idx = current.findIndex(m => m.id === id);
                    if (idx > -1) {
                        current[idx] = { ...current[idx], ...matchObject, id };
                    } else {
                        current.push(matchObject);
                    }
                    syncMatches(current);
                    if (typeof window.renderCalendar === 'function') window.renderCalendar();
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'matches', id), matchObject);
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = [...window.activeMatches];
            const idx = current.findIndex(m => m.id === matchObject.id);
            if (idx > -1) {
                current[idx] = { ...current[idx], ...matchObject, id: matchObject.id || current[idx].id };
            } else {
                matchObject.id = matchObject.id || crypto.randomUUID();
                current.push(matchObject);
            }
            syncMatches(current);
            if (typeof window.renderCalendar === 'function') window.renderCalendar();
            return true;
        };

        window.deleteMatchFromDatabase = async function(matchId) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'matches', matchId));
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = window.activeMatches.filter(m => m.id !== matchId);
            syncMatches(current);
            if (typeof window.renderCalendar === 'function') window.renderCalendar();
            return true;
        };

        window.saveTeamToDatabase = async function(teamObject) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    const id = teamObject.id || crypto.randomUUID();
                    teamObject.id = id;
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teams', id), teamObject);
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = [...window.activeTeams];
            const idx = current.findIndex(t => t.id === teamObject.id);
            if (idx > -1) { current[idx] = teamObject; } else { teamObject.id = teamObject.id || crypto.randomUUID(); current.push(teamObject); }
            syncTeams(current);
            return true;
        };

        window.deleteTeamFromDatabase = async function(teamId) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamId));
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = window.activeTeams.filter(t => t.id !== teamId);
            syncTeams(current);
            return true;
        };

        window.savePlayerToDatabase = async function(playerObject) {
            if (typeof window.ensurePlayerId === 'function') {
                const ensured = window.ensurePlayerId(playerObject);
                Object.assign(playerObject, ensured);
            } else if (!playerObject.id) {
                playerObject.id = crypto.randomUUID();
            }

            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', playerObject.id), playerObject);
                    return true;
                } catch (e) {
                    console.error('Kunne ikke lagre spiller i databasen:', e);
                    throw new Error('Kunne ikke lagre spiller i databasen. Prøv igjen, eller sjekk Firebase-tilgangen.');
                }
            }
            throw new Error('Database er ikke tilgjengelig. Spilleren ble ikke lagret.');
        };

        window.deletePlayerFromDatabase = async function(playerId) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', playerId));
                    return true;
                } catch (e) {
                    console.error('Kunne ikke slette spiller i databasen:', e);
                    throw new Error('Kunne ikke slette spiller i databasen. Prøv igjen, eller sjekk Firebase-tilgangen.');
                }
            }
            throw new Error('Database er ikke tilgjengelig. Spilleren ble ikke slettet.');
        };

        window.saveEventToDatabase = async function(eventObject) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    const id = eventObject.id || crypto.randomUUID();
                    eventObject.id = id;
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), eventObject);
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = [...window.activeEvents];
            const idx = current.findIndex(ev => ev.id === eventObject.id);
            if (idx > -1) {
                current[idx] = { ...current[idx], ...eventObject, id: eventObject.id || current[idx].id };
            } else {
                eventObject.id = eventObject.id || crypto.randomUUID();
                current.push(eventObject);
            }
            syncEvents(current);
            return true;
        };

        window.deleteEventFromDatabase = async function(eventId) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId));
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = window.activeEvents.filter(ev => ev.id !== eventId);
            syncEvents(current);
            return true;
        };
