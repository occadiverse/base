function customConfirm(title, message, callback) {
    customConfirmCallback = callback;
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;

    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

document.getElementById('confirmYesBtn').onclick = function() {
    if (customConfirmCallback) customConfirmCallback();
    closeConfirmModal();
};

document.getElementById('confirmNoBtn').onclick = function() {
    closeConfirmModal();
};

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    customConfirmCallback = null;
}

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
        hjem: "Forside",
        kamper: "Kamper",
        oppmote: "Kalender",
        tropp: "Spillertropp",
        statistikk: "Statistikk",
        taktikk: "Taktikk & Kjemi",
        admin: "Admin-panel",
        kampdetaljer: "Kampdetaljer"
    };

    document.getElementById('current-tab-title').innerText = titles[tabId] || "BSK Fotball";

    document.querySelectorAll('.tab-link').forEach(link => {
        link.classList.remove('bg-bsk-blueLight', 'text-white', 'font-semibold', 'shadow-md');
        link.classList.add('text-slate-300', 'hover:bg-bsk-blueLight/50', 'hover:text-white');

        const icon = link.querySelector('i');
        if (icon) icon.classList.remove('text-bsk-yellow');
    });

    const sidebarBtn = document.getElementById(`sidebar-${tabId}`);
    if (sidebarBtn) {
        sidebarBtn.classList.add('bg-bsk-blueLight', 'text-white', 'font-semibold', 'shadow-md');
        sidebarBtn.classList.remove('text-slate-300', 'hover:bg-bsk-blueLight/50', 'hover:text-white');

        const activeIcon = sidebarBtn.querySelector('i');
        if (activeIcon) activeIcon.classList.add('text-bsk-yellow');
    }

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active-nav', 'text-bsk-yellow'));

    const mobileBtnMap = { hjem: 0, kamper: 1, oppmote: 2, statistikk: 3, tropp: 4, taktikk: 5 };
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
        setTacticalPhase('fase1');
        if (typeof window.updateTacticalMatchSelector === 'function') window.updateTacticalMatchSelector();
    }
}

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
        if (!score) return { m, form: 'U', class: 'bg-amber-500', text: 'U', tooltip: `Registrert: ${m.result}` };
        if (score.bsk > score.opponent) return { m, form: 'S', class: 'bg-emerald-500 text-white', text: 'S', tooltip: `Seier vs ${m.opponent} (${m.result})` };
        if (score.bsk === score.opponent) return { m, form: 'U', class: 'bg-amber-500 text-white', text: 'U', tooltip: `Uavgjort vs ${m.opponent} (${m.result})` };
        return { m, form: 'T', class: 'bg-rose-500 text-white', text: 'T', tooltip: `Tap vs ${m.opponent} (${m.result})` };
    });
}
