

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

        function syncMatches(matchesData) {
            window.activeMatches = matchesData;
            window.localStorage.setItem('bsk_local_matches', JSON.stringify(matchesData));
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
            window.activePlayers = playersData;
            window.localStorage.setItem('bsk_local_players', JSON.stringify(playersData));
            if (typeof window.renderPlayerRoster === 'function') window.renderPlayerRoster();
            if (typeof window.recalculateOppmoteAndKjemi === 'function') window.recalculateOppmoteAndKjemi();
        }

        function syncEvents(eventsData) {
            window.activeEvents = eventsData;
            window.localStorage.setItem('bsk_local_events', JSON.stringify(eventsData));
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
                snapshot.forEach((doc) => { fb.push({ id: doc.id, ...doc.data() }); });
                if (fb.length === 0) {
                    initialMockMatches.forEach(async (m) => { try { await setDoc(doc(activeMatchesCollectionRef, m.id), m); } catch(e){} });
                } else { 
