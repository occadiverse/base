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

function saveMatch(event) {
    event.preventDefault();
    
    const matchData = {
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        opponent: document.getElementById('opponent').value,
        pitch: document.getElementById('pitch').value,
        type: document.getElementById('matchType').value,
        group: document.getElementById('matchGroup').value,
        result: document.getElementById('result').value,
    };
    
    console.log('Saving match:', matchData);
    
    // TODO: Send to backend
    // localStorage.setItem('lastMatch', JSON.stringify(matchData));
    
    window.closeMatchModal();
    alert('Kamp lagret!');
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

function savePlayer(event) {
    event.preventDefault();
    
    const playerData = {
        name: document.getElementById('playerNameInput').value,
        jersey: document.getElementById('playerJerseyInput').value,
        birthYear: document.getElementById('playerBirthYearInput').value,
        status: document.getElementById('playerStatusInput').value,
        team: document.getElementById('playerTeamInput').value,
        position1: document.getElementById('playerPos1Input').value,
        position2: document.getElementById('playerPos2Input').value,
        foot: document.getElementById('playerFootInput').value,
    };
    
    console.log('Saving player:', playerData);
    
    window.closePlayerModal();
    alert('Spiller lagret!');
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

function saveTeam(event) {
    event.preventDefault();
    
    const teamData = {
        name: document.getElementById('teamName').value,
        coach: document.getElementById('teamCoach').value,
        contact: document.getElementById('teamCoachContact').value,
        description: document.getElementById('teamDesc').value,
    };
    
    console.log('Saving team:', teamData);
    
    window.closeTeamModal();
    alert('Lag lagret!');
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('OCCA - BSK Fotball application loaded');
    
    // Set initial tab
    switchTab('hjem');
    
    // Initialize stat tab
    switchStatTab('lag');
});
