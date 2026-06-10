// ============================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================

// Henter database-tilkoblingen fra din egen config-fil
import { db, auth } from './firestore-config.js';

// Hvis du trenger andre Firebase-funksjoner (som å hente data), legger vi dem til her:
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global data cache
let teamsCache = [];
let playersCache = [];
let matchesCache = [];
let eventsCache = []; // Husk å få med denne!

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
        
        // --- NY KODE: Oppdaterer forsiden når alt er ferdig lastet ---
        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard();
        }
        
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

// ============================================
// FORSIDE / DASHBOARD
// ============================================

// ============================================
// HJELPEFUNKSJONER FOR MATTE OG LOGIKK
// ============================================

window.parseScore = function(resultStr) {
    if (!resultStr || !resultStr.includes('-')) return null;
    const pts = resultStr.split('-').map(x => parseInt(x.trim()));
    if (pts.length !== 2 || isNaN(pts[0]) || isNaN(pts[1])) return null;
    return { bsk: pts[0], opponent: pts[1] };
};

window.getDisciplineStatusForTeam = function(teamName, upToDateStr) {
    const pastMatches = matchesCache
        .filter(m => m.group === teamName && m.type === 'Serie' && m.date < upToDateStr)
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    let playerStats = {}; 

    pastMatches.forEach(m => {
        Object.keys(playerStats).forEach(pName => {
            if (playerStats[pName].isSuspended) {
                if (!m.attendance || m.attendance[pName] !== true) {
                    playerStats[pName].isSuspended = false;
                    playerStats[pName].reason = '';
                }
            }
        });

        if (m.attendance) {
            Object.keys(m.attendance).forEach(pName => {
                if (m.attendance[pName] === true) {
                    if (!playerStats[pName]) playerStats[pName] = { yellows: 0, reds: 0, isSuspended: false, isAtRisk: false, reason: '', cardType: '', displayNum: 0 };
                    
                    const gotYellow = m.guleKort && m.guleKort.includes(pName);
                    const gotRed = m.rodeKort && m.rodeKort.includes(pName);

                    if (gotRed) {
                        playerStats[pName].reds++;
                        playerStats[pName].isSuspended = true;
                        playerStats[pName].reason = 'Rødt kort';
                        playerStats[pName].cardType = 'red';
                    }
                    
                    if (gotYellow) {
                        playerStats[pName].yellows++;
                        let y = playerStats[pName].yellows;
                        playerStats[pName].isAtRisk = (y === 3 || (y > 3 && y % 2 === 1));
                        
                        if (y === 4 || (y > 4 && y % 2 === 0)) {
                            playerStats[pName].isSuspended = true;
                            playerStats[pName].isAtRisk = false;
                            playerStats[pName].reason = `${y} gule kort`;
                            playerStats[pName].cardType = 'yellow';
                        }
                    }
                }
            });
        }
    });
    return playerStats;
};

window.calculatePlayerMatchPoints = function(m, playerName) {
    let base = 15, resultBonus = 0, ratingBonus = 0, bbBonus = 0;
    if (m.result && m.result.includes('-')) {
        const score = parseScore(m.result);
        if (score) {
            if (score.bsk > score.opponent) resultBonus += 5;
            else if (score.bsk === score.opponent) resultBonus += 2;
            else resultBonus -= 2;
            if (score.opponent === 0) resultBonus += 3;
            resultBonus += score.bsk * 1;
            resultBonus -= score.opponent * 1;
        }
    }
    if (m.ratings && m.ratings[playerName]) ratingBonus = (m.ratings[playerName] - 5) * 6;
    if (m.motm === playerName) bbBonus = 1;
    
    return base + resultBonus + ratingBonus + bbBonus;
};

window.calculatePlayerPerformanceChemistry = function(playerName) {
    const playerObj = playersCache.find(p => p.name === playerName);
    if (!playerObj) return 0;
    const spillerLag = playerObj.spillerLag || playerObj.team; // Tilpass etter datamodellen din
    const allEvents = [...eventsCache, ...matchesCache.map(m => ({ ...m, type: 'Kamp', team: m.group }))];
    const teamEvents = allEvents.filter(e => e.team === spillerLag);
    
    let attendedEvents = 0;
    teamEvents.forEach(e => { if (e.attendance && e.attendance[playerName] === true) attendedEvents++; });

    let chemistryScore = (teamEvents.length > 0 ? (attendedEvents / teamEvents.length) : 0) * 25; 
    if (attendedEvents > 0) chemistryScore += 15; 
    
    let totalMatchPoints = 0, matchesPlayed = 0, disciplinePenalty = 0, totalYellowCards = 0; 
    matchesCache.forEach(m => {
        if (m.group === spillerLag && m.attendance && m.attendance[playerName] === true) {
            matchesPlayed++;
            totalMatchPoints += calculatePlayerMatchPoints(m, playerName);
            if (m.guleKort && m.guleKort.includes(playerName)) totalYellowCards++;
            if (m.rodeKort && m.rodeKort.includes(playerName)) disciplinePenalty -= 10;
        }
    });
    
    if (matchesPlayed > 0) chemistryScore += (totalMatchPoints / matchesPlayed);
    
    let karantener = 0;
    if (totalYellowCards >= 4) karantener = 1 + Math.floor((totalYellowCards - 4) / 2);
    if (karantener > 1) disciplinePenalty -= ((karantener - 1) * 5); 
    
    chemistryScore += disciplinePenalty;
    return Math.max(0, Math.min(100, Math.round(chemistryScore)));
}

// ============================================
// FORSIDE / DASHBOARD LOGIKK
// ============================================

window.updateDashboard = function() {
    let upcoming = [];
    matchesCache.forEach(m => {
        const score = parseScore(m.result);
        if (score === null) upcoming.push(m);
    });

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

    const heroContainer = document.getElementById('hjem-hero-match-container');
    const dangerZoneContainer = document.getElementById('hjem-suspensions-danger-zone');
    
    if (heroContainer) {
        if (upcoming.length > 0) {
            const nm = upcoming[0];
            const d = new Date(nm.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
            
            const teamSuspensions = getDisciplineStatusForTeam(nm.group, nm.date);
            const suspendedPlayers = Object.keys(teamSuspensions).filter(p => teamSuspensions[p].isSuspended);
            
            let herosuspensionBadgeHtml = '';
            if (suspendedPlayers.length > 0) {
                herosuspensionBadgeHtml = `
                    <span onclick="event.stopPropagation(); switchTab('kamper');" 
                          class="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse border border-white/20 cursor-pointer z-20 hover:bg-red-700 hover:scale-115 transition-all">
                        ${suspendedPlayers.length}
                    </span>
                `;
            }

            heroContainer.innerHTML = `
                <section class="bg-gradient-to-br from-bsk-blue via-bsk-blueLight to-bsk-blueDark rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border-b-4 border-bsk-yellow group">
                    <div class="absolute right-0 bottom-0 translate-y-8 translate-x-8 opacity-5 pointer-events-none z-0">
                        <i class="fa-solid fa-shield-halved text-[22rem]"></i>
                    </div>
                    
                    <div class="relative z-10 space-y-6 max-w-5xl mx-auto">
                        <div class="flex justify-between items-center border-b border-white/10 pb-3">
                            <div class="flex items-center gap-2">
                                <div class="relative inline-flex items-center space-x-2 bg-bsk-yellow text-bsk-blue font-black px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-md">
                                    <i class="fa-solid fa-futbol text-[9px] animate-spin" style="animation-duration: 4s;"></i>
                                    <span>NESTE KAMP SATT</span>
                                    ${herosuspensionBadgeHtml}
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-2 max-w-4xl mx-auto">
                            <div class="text-center md:text-right flex-1 w-full md:max-w-[280px]">
                                <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Hjemmelag</span>
                                <h2 class="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md truncate">BÆKKELAGETS SK</h2>
                            </div>
                            
                            <div class="flex flex-col items-center gap-3 shrink-0 my-2 md:my-0 px-4">
                                <div class="bg-bsk-yellow text-bsk-blue px-3 py-1 rounded-xl text-[11px] font-black shadow-md tracking-wider uppercase border border-amber-300">VS</div>
                            </div>
                            
                            <div class="text-center md:text-left flex-1 w-full md:max-w-[280px]">
                                <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Motstander</span>
                                <h2 class="text-xl md:text-2xl font-black text-bsk-yellow tracking-tight drop-shadow-md uppercase">
                                    <span>${nm.opponent}</span>
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
        } else {
            heroContainer.innerHTML = `
                <div class="bg-slate-100 border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-inner">
                    <i class="fa-solid fa-futbol text-4xl mb-3 text-slate-300 animate-pulse"></i>
                    <h3 class="font-black text-slate-700 text-base">Ingen kommende kamper satt opp</h3>
                    <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Det er ikke ført noen kommende kamper i systemet akkurat nå.</p>
                </div>`;
        }
    }
    
    updateHjemWidget();
};

window.updateHjemWidget = function() {
    const bottomContainer = document.getElementById('hjem-bottom-widgets');
    if (!bottomContainer) return;

    // --- VENSTRE BOKS: NESTE ØKT ---
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingEvents = eventsCache.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    
    let leftWidgetHtml = '';
    if (upcomingEvents.length > 0) {
        const ne = upcomingEvents[0];
        const d = new Date(ne.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
        
        let påmeldtAntall = 0;
        if (ne.attendance) {
            Object.values(ne.attendance).forEach(status => { if (status === true) påmeldtAntall++; });
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
                        <div class="bg-blue-500/10 border border-blue-500/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.15)] cursor-pointer hover:scale-105">
                            <span class="text-2xl font-black text-blue-400 leading-none">${påmeldtAntall}</span>
                            <span class="text-[8px] font-bold text-blue-200/70 uppercase tracking-wider mt-1">Klar</span>
                        </div>
                    </div>
                </div>
            </div>`;
    } else {
        leftWidgetHtml = `
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-full min-h-[235px] text-white">
                <h3 class="font-black text-slate-200 text-sm">Kalenderen er tom</h3>
                <p class="text-xs text-slate-400 mt-1">Ingen aktiviteter planlagt.</p>
            </div>`;
    }

    // --- HØYRE BOKS: UKENS MASKIN ---
    let topPlayer = null;
    let topScore = -1;
    
    playersCache.filter(p => p.status !== 'Passiv').forEach(p => {
        const score = calculatePlayerPerformanceChemistry(p.name);
        if (score > topScore) { topScore = score; topPlayer = p; }
    });

    let rightWidgetHtml = '';
    if (topPlayer && topScore > 0) {
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
                        <span class="bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Hot Streak</span>
                    </div>
                    <div class="flex-1 flex items-center justify-between mb-2">
                        <div class="space-y-1 min-w-0 pr-4">
                            <h4 class="font-black text-white text-2xl md:text-3xl truncate drop-shadow-md pb-1">${topPlayer.name.split(' ')[0]}</h4>
                        </div>
                        <div class="bg-bsk-yellow/10 border border-bsk-yellow/30 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                            <span class="text-2xl font-black text-bsk-yellow leading-none">${topScore}</span>
                            <span class="text-[8px] font-bold text-amber-200/70 uppercase tracking-wider mt-1">Form</span>
                        </div>
                    </div>
                </div>
            </div>`;
    } else {
        rightWidgetHtml = `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[220px]">
                <h3 class="font-black text-slate-700 text-sm">Ingen data enda</h3>
                <p class="text-xs text-slate-500 mt-1">Kalkulerer formsum når uken starter.</p>
            </div>`;
    }

    bottomContainer.innerHTML = leftWidgetHtml + rightWidgetHtml;
};
