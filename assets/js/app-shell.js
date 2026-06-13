function verifyAdminPin() {
    const input = document.getElementById('adminPinInput').value;

    if (input === '1908') {
        isAdminUnlocked = true;
        document.getElementById('admin-gate').classList.add('hidden');
        document.getElementById('admin-panel-content').classList.remove('hidden');
        renderAdminTeamsList();
        return;
    }

    document.getElementById('adminPinInput').value = '';
    document.getElementById('adminPinInput').placeholder = "FEIL!";
    document.getElementById('adminPinInput').classList.add('border-rose-500');

    setTimeout(() => {
        document.getElementById('adminPinInput').placeholder = "••••";
        document.getElementById('adminPinInput').classList.remove('border-rose-500');
    }, 1500);
}

function switchTab(tabId) {
    currentTab = tabId;
    if (typeof window.closeMobileToolsMenu === 'function') window.closeMobileToolsMenu();

    ['hjem', 'kamper', 'oppmote', 'tropp', 'statistikk', 'admin', 'taktikk', 'kampdetaljer'].forEach(id => {
        const el = document.getElementById(`view-${id}`);
        if (el) el.classList.add('hidden');
    });

    const activeEl = document.getElementById(`view-${tabId}`);
    if (activeEl) activeEl.classList.remove('hidden');

    const floatingBtn = document.getElementById('floating-action-btn');
    const floatingIcon = document.getElementById('floating-btn-icon');

    if (tabId === 'kamper') {
        floatingBtn.classList.remove('hidden');
        floatingIcon.className = "fa-solid fa-plus";
        floatingBtn.onclick = function() { window.openMatchModal(); };
    } else if (tabId === 'oppmote') {
        floatingBtn.classList.remove('hidden');
        floatingIcon.className = "fa-solid fa-calendar-plus";

        const d = new Date();
        window.currentCalendarDate = d;
        window.selectedCalendarDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();

        floatingBtn.onclick = function() { window.openActivityModal(); };
    } else if (tabId === 'tropp') {
        floatingBtn.classList.remove('hidden');
        floatingIcon.className = "fa-solid fa-user-plus";
        floatingBtn.onclick = function() { window.openPlayerModal(); };
    } else {
        floatingBtn.classList.add('hidden');
    }

    const titles = {
        hjem: "Hjem",
        kamper: "Kamper",
        oppmote: "Kalender",
        tropp: "Spillertropp",
        statistikk: "Statistikk",
        taktikk: "Taktikk",
        admin: "Admin",
        kampdetaljer: "Kampdetaljer"
    };

    const tabTitle = titles[tabId] || "BSK Fotball";
    const desktopTitle = document.getElementById('current-tab-title');

    if (desktopTitle) desktopTitle.innerText = tabTitle;

    document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('is-active');
    });

    const sidebarBtn = document.getElementById(`sidebar-${tabId}`);
    if (sidebarBtn) {
        sidebarBtn.classList.add('is-active');
    }

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active-nav', 'text-bsk-yellow'));

    const mobileBtnMap = { hjem: 0, kamper: 1, oppmote: 2, statistikk: 3, taktikk: 4 };
    const activeMobileBtn = document.querySelectorAll('.mobile-nav-btn')[mobileBtnMap[tabId]];
    if (activeMobileBtn) activeMobileBtn.classList.add('active-nav', 'text-bsk-yellow');

    if (tabId === 'oppmote') {
        window.renderEvents();
        window.recalculateOppmoteAndKjemi();
    } else if (tabId === 'tropp') {
        window.renderPlayerRoster();
    } else if (tabId === 'statistikk') {
        window.renderStatistikkSide();
    } else if (tabId === 'admin' && isAdminUnlocked) {
        renderAdminTeamsList();
    } else if (tabId === 'hjem') {
        window.updateDashboard();
    } else if (tabId === 'taktikk') {
        if (typeof window.setTacticalPhase === 'function') window.setTacticalPhase('fase1');
        if (typeof window.updateTacticalMatchSelector === 'function') window.updateTacticalMatchSelector();
    }
}

function setupMobileSwipeNavigation() {
    if (window.mobileSwipeNavigationReady) return;
    window.mobileSwipeNavigationReady = true;
    document.documentElement.dataset.mobileSwipeNavigation = 'ready';

    const swipeTabs = ['hjem', 'kamper', 'oppmote', 'statistikk', 'taktikk'];
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const shouldIgnoreSwipe = (target) => {
        if (!target || !target.closest) return false;
        return Boolean(target.closest(
            'button, a, input, textarea, select, label, table, .overflow-x-auto, .portal-segmented, .modal-base, [role="dialog"], [data-no-swipe]'
        ));
    };

    document.addEventListener('touchstart', event => {
        if (window.innerWidth >= 768 || event.touches.length !== 1 || shouldIgnoreSwipe(event.target)) {
            isTracking = false;
            return;
        }

        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        isTracking = true;
    }, { passive: true });

    document.addEventListener('touchend', event => {
        if (!isTracking || window.innerWidth >= 768 || event.changedTouches.length !== 1) return;

        const deltaX = event.changedTouches[0].clientX - startX;
        const deltaY = event.changedTouches[0].clientY - startY;
        isTracking = false;

        if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;

        const currentIndex = swipeTabs.indexOf(currentTab);
        if (currentIndex === -1) return;

        const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= swipeTabs.length) return;

        switchTab(swipeTabs[nextIndex]);
    }, { passive: true });
}

window.setupMobileSwipeNavigation = setupMobileSwipeNavigation;

function handleFloatingAction() {
    if (currentTab === 'kamper') window.openMatchModal();
    else if (currentTab === 'oppmote') window.openActivityModal();
    else if (currentTab === 'tropp') window.openPlayerModal();
}

function parseScore(resultStr) {
    if (!resultStr || !resultStr.includes('-')) return null;

    const pts = resultStr.split('-').map(x => parseInt(x.trim()));
    if (pts.length !== 2 || isNaN(pts[0]) || isNaN(pts[1])) return null;

    return { bsk: pts[0], opponent: pts[1] };
}

function getFormGuide() {
    const matches = Array.isArray(window.activeMatches) ? window.activeMatches : [];
    const playedMatches = matches.filter(m => m.result && m.result.includes('-'));

    playedMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

    const last5 = playedMatches.slice(0, 5).reverse();

    return last5.map(m => {
        const score = parseScore(m.result);
        if (!score) return { m, form: 'U', class: 'bg-amber-400 text-slate-900', text: 'U', tooltip: `Registrert: ${m.result}` };
        if (score.bsk > score.opponent) return { m, form: 'S', class: 'bg-emerald-500 text-white', text: 'S', tooltip: `Seier vs ${m.opponent} (${m.result})` };
        if (score.bsk === score.opponent) return { m, form: 'U', class: 'bg-amber-400 text-slate-900', text: 'U', tooltip: `Uavgjort vs ${m.opponent} (${m.result})` };
        return { m, form: 'T', class: 'bg-rose-500 text-white', text: 'T', tooltip: `Tap vs ${m.opponent} (${m.result})` };
    });
}
