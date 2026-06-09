// ============================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================

// Initialize Firebase (Update these with your Firebase config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global data cache
let teamsCache = [];
let playersCache = [];
let matchesCache = [];

// ============================================
// LOAD DATA FROM FIREBASE
// ============================================

async function loadAllData() {
    try {
        console.log('Loading data from Firebase...');
        await loadTeams();
        await loadPlayers();
        await loadMatches();
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Feil ved lasting av data fra database');
    }
}

async function loadTeams() {
    try {
        const snapshot = await db.collection('teams').get();
        teamsCache = [];
        snapshot.forEach(doc => {
            teamsCache.push({ id: doc.id, ...doc.data() });
        });
        console.log('Teams loaded:', teamsCache);
        updateTeamSelects();
        displayTeams();
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

async function loadPlayers() {
    try {
        const snapshot = await db.collection('players').get();
        playersCache = [];
        snapshot.forEach(doc => {
            playersCache.push({ id: doc.id, ...doc.data() });
        });
        console.log('Players loaded:', playersCache);
        displayPlayers();
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

async function loadMatches() {
    try {
        const snapshot = await db.collection('matches').get();
        matchesCache = [];
        snapshot.forEach(doc => {
            matchesCache.push({ id: doc.id, ...doc.data() });
        });
        console.log('Matches loaded:', matchesCache);
        displayMatches();
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
    // Hide all view sections
    document.querySelectorAll('[id^="view-"]').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`view-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Update action bar title
    const titleMap = {
        'hjem': 'Forside',
        'kamper': 'Kamper',
        'kampdetaljer': 'Kampdetaljer',
        'oppmote': 'Kalender',
        'tropp': 'Spillertropp',
        'statistikk': 'Statistikk',
        'taktikk': 'Taktikk',
        'admin': 'Administrasjon'
    };
    
    const titleEl = document.getElementById('current-tab-title');
    if (titleEl) {
        titleEl.textContent = titleMap[tabName] || 'OCCA';
    }
    
    // Update mobile nav active state
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        btn.classList.add('hover:text-white');
    });
    
    // Update sidebar active state
    document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('bg-bsk-blueLight');
        link.classList.add('hover:bg-bsk-blueLight/50', 'text-slate-300', 'hover:text-white');
    });
    
    // Mark current tab as active
    const activeLink = document.getElementById(`sidebar-${tabName}`);
    if (activeLink) {
        activeLink.classList.remove('hover:bg-bsk-blueLight/50', 'text-slate-300', 'hover:text-white');
        activeLink.classList.add('bg-bsk-blueLight', 'text-white');
    }
}

// ============================================
// MATCH MANAGEMENT
// ============================================

function openMatchModal() {
    document.getElementById('matchModal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = 'Registrer Kamp';
    document.getElementById('matchForm').reset();
    document.getElementById('editMatchId').value = '';
}

window.closeMatchModal = function() {
    document.getElementById('matchModal').classList.add('hidden');
};

async function saveMatch(event) {
    event.preventDefault();
    
    const matchData = {
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        opponent: document.getElementById('opponent').value,
        pitch: document.getElementById('pitch').value,
        type: document.getElementById('matchType').value,
        group: document.getElementById('matchGroup').value,
        result: document.getElementById('result').value,
        createdAt: new Date()
    };
    
    try {
        const editId = document.getElementById('editMatchId').value;
        if (editId) {
            // Update existing match
            await db.collection('matches').doc(editId).update(matchData);
            console.log('Match updated:', editId);
        } else {
            // Create new match
            await db.collection('matches').add(matchData);
            console.log('New match saved:', matchData);
        }
        
        await loadMatches();
        window.closeMatchModal();
        alert('Kamp lagret!');
    } catch (error) {
        console.error('Error saving match:', error);
        alert('Feil ved lagring av kamp');
    }
}

function displayMatches() {
    const tbody = document.getElementById('matchTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (matchesCache.length === 0) {
        document.getElementById('no-matches-view').classList.remove('hidden');
        return;
    }
    
    document.getElementById('no-matches-view').classList.add('hidden');
    
    matchesCache.forEach(match => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-100 hover:bg-slate-50 transition';
        
        const date = new Date(match.date);
        const formattedDate = date.toLocaleDateString('no-NO', { weekday: 'short', month: 'short', day: 'numeric' });
        
        row.innerHTML = `
            <td class="py-4 px-4 md:px-6 font-medium text-slate-900">${match.opponent}</td>
            <td class="py-4 px-4 text-center text-sm text-slate-600">${formattedDate}</td>
            <td class="py-4 px-2 text-center text-sm text-slate-600">${match.time || '-'}</td>
            <td class="py-4 px-4 text-center font-bold text-bsk-blue">${match.result || '-'}</td>
            <td class="py-4 px-6 text-sm text-slate-600 hidden lg:table-cell">${match.pitch || '-'}</td>
            <td class="py-4 px-6 text-sm text-slate-600 hidden lg:table-cell"><span class="bg-bsk-yellow/20 text-bsk-blue px-2 py-1 rounded-lg text-xs font-semibold">${match.type}</span></td>
            <td class="py-4 px-4 md:px-6 text-right">
                <button onclick="editMatch('${match.id}')" class="text-bsk-blue hover:text-bsk-blueLight mr-2 transition">
                    <i class="fa-solid fa-pen text-sm"></i>
                </button>
                <button onclick="deleteMatch('${match.id}')" class="text-rose-500 hover:text-rose-700 transition">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editMatch(matchId) {
    const match = matchesCache.find(m => m.id === matchId);
    if (!match) return;
    
    document.getElementById('editMatchId').value = matchId;
    document.getElementById('matchDate').value = match.date;
    document.getElementById('matchTime').value = match.time || '';
    document.getElementById('opponent').value = match.opponent;
    document.getElementById('pitch').value = match.pitch || '';
    document.getElementById('matchType').value = match.type;
    document.getElementById('matchGroup').value = match.group;
    document.getElementById('result').value = match.result || '';
    
    document.getElementById('modalTitle').textContent = 'Rediger Kamp';
    document.getElementById('matchModal').classList.remove('hidden');
}

async function deleteMatch(matchId) {
    if (!confirm('Er du sikker på at du vil slette denne kampen?')) return;
    
    try {
        await db.collection('matches').doc(matchId).delete();
        await loadMatches();
        alert('Kamp slettet!');
    } catch (error) {
        console.error('Error deleting match:', error);
        alert('Feil ved sletting av kamp');
    }
}

function setMatchTimeFilter(filter) {
    console.log('Filter matches by:', filter);
    
    document.getElementById('btn-filter-kommende').classList.remove('text-bsk-blue', 'bg-white', 'shadow-sm');
    document.getElementById('btn-filter-tidligere').classList.remove('text-bsk-blue', 'bg-white', 'shadow-sm');
    
    if (filter === 'kommende') {
        document.getElementById('btn-filter-kommende').classList.add('text-bsk-blue', 'bg-white', 'shadow-sm');
    } else {
        document.getElementById('btn-filter-tidligere').classList.add('text-bsk-blue', 'bg-white', 'shadow-sm');
    }
}

function applyFilters() {
    console.log('Applying filters...');
    // TODO: Filter logic
}

// ============================================
// PLAYER MANAGEMENT
// ============================================

function openPlayerModal() {
    document.getElementById('playerModal').classList.remove('hidden');
    document.getElementById('playerFormTitle').textContent = 'Registrer Spiller';
    document.getElementById('playerForm').reset();
    document.getElementById('editPlayerId').value = '';
}

window.closePlayerModal = function() {
    document.getElementById('playerModal').classList.add('hidden');
};

async function savePlayer(event) {
    event.preventDefault();
    
    const playerData = {
        name: document.getElementById('playerNameInput').value,
        jersey: document.getElementById('playerJerseyInput').value,
        birthYear: document.getElementById('playerBirthYearInput').value,
        status: document.getElementById('playerStatusInput').value,
        createdAt: new Date()
    };
    
    try {
        const editId = document.getElementById('editPlayerId').value;
        if (editId) {
            await db.collection('players').doc(editId).update(playerData);
            console.log('Player updated:', editId);
        } else {
            await db.collection('players').add(playerData);
            console.log('New player saved:', playerData);
        }
        
        await loadPlayers();
        window.closePlayerModal();
        alert('Spiller lagret!');
    } catch (error) {
        console.error('Error saving player:', error);
        alert('Feil ved lagring av spiller');
    }
}

function displayPlayers() {
    const tbody = document.getElementById('playerTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    playersCache.forEach(player => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-100 hover:bg-slate-50 transition';
        const age = new Date().getFullYear() - player.birthYear;
        
        row.innerHTML = `
            <td class="py-4 px-4 md:px-6 font-medium text-slate-900">${player.name}</td>
            <td class="py-4 px-4 text-center font-bold text-bsk-blue">#${player.jersey}</td>
            <td class="py-4 px-4 text-sm text-slate-600">-</td>
            <td class="py-4 px-4 text-center text-sm text-slate-600">-</td>
            <td class="py-4 px-4 text-center text-sm text-slate-600">${age} år</td>
            <td class="py-4 px-4 text-center">
                <span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-semibold">${player.status}</span>
            </td>
            <td class="py-4 px-6 text-right">
                <button onclick="editPlayer('${player.id}')" class="text-bsk-blue hover:text-bsk-blueLight mr-2 transition">
                    <i class="fa-solid fa-pen text-sm"></i>
                </button>
                <button onclick="deletePlayer('${player.id}')" class="text-rose-500 hover:text-rose-700 transition">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editPlayer(playerId) {
    const player = playersCache.find(p => p.id === playerId);
    if (!player) return;
    
    document.getElementById('editPlayerId').value = playerId;
    document.getElementById('playerNameInput').value = player.name;
    document.getElementById('playerJerseyInput').value = player.jersey;
    document.getElementById('playerBirthYearInput').value = player.birthYear;
    document.getElementById('playerStatusInput').value = player.status;
    
    document.getElementById('playerFormTitle').textContent = 'Rediger Spiller';
    document.getElementById('playerModal').classList.remove('hidden');
}

async function deletePlayer(playerId) {
    if (!confirm('Er du sikker på at du vil slette denne spilleren?')) return;
    
    try {
        await db.collection('players').doc(playerId).delete();
        await loadPlayers();
        alert('Spiller slettet!');
    } catch (error) {
        console.error('Error deleting player:', error);
        alert('Feil ved sletting av spiller');
    }
}

// ============================================
// TEAM MANAGEMENT
// ============================================

function openTeamModal() {
    document.getElementById('teamModal').classList.remove('hidden');
    document.getElementById('teamModalTitle').textContent = 'Opprett Lag';
    document.getElementById('teamForm').reset();
    document.getElementById('editTeamId').value = '';
}

window.closeTeamModal = function() {
    document.getElementById('teamModal').classList.add('hidden');
};

async function saveTeam(event) {
    event.preventDefault();
    
    const teamData = {
        name: document.getElementById('teamName').value,
        coach: document.getElementById('teamCoach').value,
        contact: document.getElementById('teamCoachContact').value,
        description: document.getElementById('teamDesc').value,
        createdAt: new Date()
    };
    
    try {
        const editId = document.getElementById('editTeamId').value;
        if (editId) {
            await db.collection('teams').doc(editId).update(teamData);
            console.log('Team updated:', editId);
        } else {
            await db.collection('teams').add(teamData);
            console.log('New team saved:', teamData);
        }
        
        await loadTeams();
        window.closeTeamModal();
        alert('Lag lagret!');
    } catch (error) {
        console.error('Error saving team:', error);
        alert('Feil ved lagring av lag');
    }
}

function displayTeams() {
    const container = document.getElementById('admin-teams-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    teamsCache.forEach(team => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 border border-slate-200 rounded-xl';
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-slate-900">${team.name}</h4>
                <div>
                    <button onclick="editTeam('${team.id}')" class="text-bsk-blue hover:text-bsk-blueLight mr-2 transition">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button onclick="deleteTeam('${team.id}')" class="text-rose-500 hover:text-rose-700 transition">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            <p class="text-xs text-slate-600 mb-1"><strong>Trener:</strong> ${team.coach}</p>
            <p class="text-xs text-slate-600"><strong>Kontakt:</strong> ${team.contact}</p>
        `;
        container.appendChild(div);
    });
}

function updateTeamSelects() {
    const matchGroupSelect = document.getElementById('matchGroup');
    if (matchGroupSelect) {
        matchGroupSelect.innerHTML = '';
        teamsCache.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            matchGroupSelect.appendChild(option);
        });
    }
}

function editTeam(teamId) {
    const team = teamsCache.find(t => t.id === teamId);
    if (!team) return;
    
    document.getElementById('editTeamId').value = teamId;
    document.getElementById('teamName').value = team.name;
    document.getElementById('teamCoach').value = team.coach;
    document.getElementById('teamCoachContact').value = team.contact;
    document.getElementById('teamDesc').value = team.description || '';
    
    document.getElementById('teamModalTitle').textContent = 'Rediger Lag';
    document.getElementById('teamModal').classList.remove('hidden');
}

async function deleteTeam(teamId) {
    if (!confirm('Er du sikker på at du vil slette dette laget?')) return;
    
    try {
        await db.collection('teams').doc(teamId).delete();
        await loadTeams();
        alert('Lag slettet!');
    } catch (error) {
        console.error('Error deleting team:', error);
        alert('Feil ved sletting av lag');
    }
}

// ============================================
// EVENT/ACTIVITY MANAGEMENT
// ============================================

function openEventModal() {
    document.getElementById('eventModal').classList.remove('hidden');
    document.getElementById('eventForm').reset();
}

function closeEventModal() {
    document.getElementById('eventModal').classList.add('hidden');
}

function saveEvent(event) {
    event.preventDefault();
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        type: document.getElementById('eventType').value,
        team: document.getElementById('eventTeam').value,
        date: document.getElementById('eventDate').value,
    };
    
    console.log('Saving event:', eventData);
    
    closeEventModal();
    alert('Event opprettet!');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.add('hidden');
}

function updateActivityTitlePlaceholder() {
    const type = document.getElementById('activityType').value;
    const titleInput = document.getElementById('activityTitle');
    
    const placeholders = {
        'Trening': 'F.eks. Tirsdagstrening, Onsdagstrening',
        'Kamp': 'F.eks. BSK vs KFUM',
        'Annet': 'F.eks. Lagfest, Dugnad'
    };
    
    titleInput.placeholder = placeholders[type] || 'Tittel (valgfritt)';
}

// ============================================
// ATTENDANCE MANAGEMENT
// ============================================

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.add('hidden');
}

function saveAttendanceRegistry() {
    console.log('Saving attendance...');
    alert('Oppmøte lagret!');
    closeAttendanceModal();
}

// ============================================
// ADMIN PANEL
// ============================================

function verifyAdminPin() {
    const pin = document.getElementById('adminPinInput').value;
    const correctPin = '1908'; // BSK founded in 1908
    
    if (pin === correctPin) {
        document.getElementById('admin-gate').classList.add('hidden');
        document.getElementById('admin-panel-content').classList.remove('hidden');
        alert('Admin tilgang gitt!');
    } else {
        alert('Feil PIN-kode. Prøv igjen.');
        document.getElementById('adminPinInput').value = '';
    }
}

// ============================================
// STATISTICS
// ============================================

function switchStatTab(tabName) {
    // Hide all stat views
    document.querySelectorAll('[id^="stat-view-"]').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected tab
    document.getElementById(`stat-view-${tabName}`)?.classList.remove('hidden');
    
    // Update button styles
    document.querySelectorAll('.stat-tab-btn').forEach(btn => {
        btn.classList.remove('text-bsk-blue', 'bg-white', 'shadow-sm');
        btn.classList.add('text-slate-500', 'hover:text-slate-800');
    });
    
    document.getElementById(`stat-tab-${tabName}`)?.classList.add('text-bsk-blue', 'bg-white', 'shadow-sm');
    document.getElementById(`stat-tab-${tabName}`)?.classList.remove('text-slate-500', 'hover:text-slate-800');
}

function sortStatsTable(column) {
    console.log('Sorting by:', column);
    // TODO: Implement sorting logic
}

// ============================================
// CALENDAR/SCHEDULE
// ============================================

function navigateCalendar(direction) {
    console.log('Navigate calendar:', direction > 0 ? 'next' : 'previous');
    // TODO: Implement calendar navigation
}

// ============================================
// TACTICAL BOARD
// ============================================

function setTacticalPhase(phase) {
    console.log('Setting tactical phase:', phase);
    
    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.classList.remove('bg-bsk-blue', 'text-white');
        btn.classList.add('bg-white', 'text-bsk-blue', 'border', 'border-slate-200');
    });
    
    document.getElementById(`btn-${phase}`)?.classList.add('bg-bsk-blue', 'text-white');
    document.getElementById(`btn-${phase}`)?.classList.remove('bg-white', 'text-bsk-blue', 'border', 'border-slate-200');
}

function autoFillTeam() {
    console.log('Auto-filling team with 11 players...');
    alert('Elleven automatisk satt på banen!');
}

function clearTacticalBoard() {
    console.log('Clearing tactical board...');
    if (confirm('Er du sikker på at du vil tømme banen?')) {
        alert('Banen tømt!');
    }
}

function loadMatchTactics() {
    console.log('Loading match tactics...');
}

function saveMatchTactics() {
    console.log('Saving match tactics...');
    alert('Taktikk lagret!');
}

// ============================================
// MATCH DETAILS
// ============================================

function savePlayerMatchStats() {
    console.log('Saving player match statistics...');
    alert('Kampstatistikk lagret!');
}

// ============================================
// FLOATING ACTION BUTTON
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const floatingBtn = document.getElementById('floating-action-btn');
    
    if (floatingBtn) {
        floatingBtn.addEventListener('click', function() {
            // Check which tab is active and open relevant modal
            const activeTab = document.querySelector('[id^="view-"]:not(.hidden)');
            
            if (activeTab?.id === 'view-kamper') {
                openMatchModal();
            } else if (activeTab?.id === 'view-tropp') {
                openPlayerModal();
            } else if (activeTab?.id === 'view-oppmote') {
                document.getElementById('activityModal').classList.remove('hidden');
            } else {
                console.log('No action defined for this tab');
            }
        });
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showChemistryInfo() {
    alert('Kjemi viser hvor godt spillerne spiller sammen. Høyere kjemi = bedre samspill!');
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('OCCA - BSK Fotball application loaded');
    
    // Set initial tab
    switchTab('hjem');
    
    // Initialize stat tab
    switchStatTab('lag');
    
    // Load data from Firebase
    await loadAllData();
});
