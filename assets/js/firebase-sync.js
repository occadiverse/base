

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
        }

        function syncTeams(teamsData) {
            window.activeTeams = teamsData;
            window.localStorage.setItem('bsk_local_teams', JSON.stringify(teamsData));
            if (typeof window.updateDynamicSelectors === 'function') window.updateDynamicSelectors();
            if (typeof window.renderAdminTeamsList === 'function') window.renderAdminTeamsList();
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
                    initialMockPlayers.forEach(async (p) => { try { await setDoc(doc(activePlayersCollectionRef, p.id), p); } catch(e){} });
                } else { syncPlayers(fb); }
            }, (error) => handleSyncError('players', syncPlayers, initialMockPlayers, error));

            onSnapshot(activeEventsCollectionRef, (snapshot) => {
                const fb = [];
                snapshot.forEach((docSnap) => { fb.push({ ...docSnap.data(), id: docSnap.id }); });
                if (fb.length === 0) {
                    initialMockEvents.forEach(async (e) => { try { await setDoc(doc(activeEventsCollectionRef, e.id), e); } catch(e){} });
                } else { 
                    syncEvents(fb); 
                    if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
                    if (typeof window.updateHjemWidget === 'function') window.updateHjemWidget(); 
                    if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi(); 
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
                } catch (e) { console.error(e); }
            }
            const current = [...window.activePlayers];
            const idx = current.findIndex(p => p.id === playerObject.id);
            if (idx > -1) { current[idx] = playerObject; } else { current.push(playerObject); }
            syncPlayers(current);
            return true;
        };

        window.deletePlayerFromDatabase = async function(playerId) {
            if (firebaseEnabled && auth && auth.currentUser) {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', playerId));
                    return true;
                } catch (e) { console.error(e); }
            }
            const current = window.activePlayers.filter(p => p.id !== playerId);
            syncPlayers(current);
            return true;
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
