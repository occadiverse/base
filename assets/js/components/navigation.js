const NAV_ITEMS = [
    { id: 'hjem', label: 'Hjem', mobileLabel: 'Hjem', icon: 'fa-house' },
    { id: 'kamper', label: 'Kamper', mobileLabel: 'Kamper', icon: 'fa-calendar-days' },
    { id: 'oppmote', label: 'Kalender', mobileLabel: 'Kalender', icon: 'fa-calendar' },
    { id: 'tropp', label: 'Spillertropp', mobileLabel: 'Tropp', icon: 'fa-users' },
    { id: 'statistikk', label: 'Statistikk', mobileLabel: 'Stats', icon: 'fa-chart-simple' },
    { id: 'taktikk', label: 'Taktikk', mobileLabel: 'Taktikk', icon: 'fa-chess-board' }
];

const MOBILE_NAV_ITEMS = [
    NAV_ITEMS[0],
    NAV_ITEMS[1],
    NAV_ITEMS[2],
    NAV_ITEMS[4],
    NAV_ITEMS[3],
    NAV_ITEMS[5]
];

function renderSidebar() {
    return `
        <aside class="hidden md:flex flex-col w-64 bg-bsk-blue text-white p-6 justify-between shrink-0">
            <div>
                <div class="flex items-center space-x-3 mb-8 cursor-pointer hover:opacity-90 transition-opacity" onclick="switchTab('hjem')">
                    <div class="bg-bsk-yellow text-bsk-blue p-2.5 rounded-xl shadow-lg">
                        <i class="fa-solid fa-shield-halved text-xl"></i>
                    </div>
                    <div>
                        <h2 class="font-black text-lg tracking-tight leading-none">BSK <span class="text-bsk-yellow">FOTBALL</span></h2>
                        <span class="text-xs text-slate-300 font-medium">Kamp- & spillerportal</span>
                    </div>
                </div>

                <nav class="space-y-2">
                    ${NAV_ITEMS.map((item, index) => `
                        <a href="#" id="sidebar-${item.id}" onclick="switchTab('${item.id}')" class="tab-link flex items-center space-x-3 px-4 py-3 rounded-xl ${index === 0 ? 'bg-bsk-blueLight text-white font-semibold transition-all shadow-md' : 'hover:bg-bsk-blueLight/50 text-slate-300 hover:text-white transition-all'}">
                            <i class="fa-solid ${item.icon} ${index === 0 ? 'text-bsk-yellow ' : ''}w-5 text-center"></i>
                            <span>${item.label}</span>
                        </a>
                    `).join('')}
                </nav>
            </div>

            <div class="border-t border-slate-700 pt-4 text-xs text-slate-400">
                <p class="font-semibold">Bækkelagets Sportsklub</p>
                <p>© 2026 OCCA</p>
            </div>
        </aside>
    `;
}

function renderMobileHeader() {
    return `
        <header class="md:hidden bg-bsk-blue text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md h-14">
            <div class="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity" onclick="switchTab('hjem')">
                <div class="bg-bsk-yellow text-bsk-blue p-1.5 rounded-lg shadow-sm">
                    <i class="fa-solid fa-shield-halved text-sm"></i>
                </div>
                <span class="font-black text-base tracking-tight leading-none">BSK <span class="text-bsk-yellow">FOTBALL</span></span>
            </div>
            <button onclick="switchTab('admin')" class="text-slate-300 hover:text-white transition hover:rotate-90 duration-300" title="Innstillinger / Admin">
                <i class="fa-solid fa-gear text-xl"></i>
            </button>
        </header>
    `;
}

function renderActionBar() {
    return `
        <div id="action-bar-container" class="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-2.5 md:px-8 md:py-3 hidden md:flex justify-between items-center sticky top-0 z-30 shadow-sm transition-all">
            <div class="flex items-center gap-3">
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]" id="current-tab-title">Forside</h2>
                <span class="w-1.5 h-1.5 rounded-full bg-bsk-yellow"></span>
            </div>

            <div class="flex items-center justify-end gap-3">
                <button onclick="switchTab('admin')" class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-bsk-blue transition hover:rotate-90 duration-300 shadow-sm shrink-0" title="Admin / Innstillinger">
                    <i class="fa-solid fa-gear text-sm"></i>
                </button>
            </div>
        </div>
    `;
}

function renderMobileNav() {
    return `
        <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-bsk-blue text-slate-300 border-t border-slate-700 flex justify-around items-center h-20 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
            ${MOBILE_NAV_ITEMS.map((item, index) => `
                <button onclick="switchTab('${item.id}')" class="mobile-nav-btn flex flex-col items-center justify-center flex-1 h-full text-[11px] font-bold transition ${index === 0 ? 'active-nav text-bsk-yellow' : 'hover:text-white'}">
                    <i class="fa-solid ${item.icon} text-xl mb-1"></i>
                    <span>${item.mobileLabel}</span>
                </button>
            `).join('')}
        </nav>
    `;
}

function renderFloatingActionButton() {
    return `
        <button id="floating-action-btn" class="fixed right-6 bottom-20 md:bottom-8 w-14 h-14 bg-bsk-yellow hover:bg-bsk-yellowDark text-bsk-blue font-black rounded-full shadow-xl flex items-center justify-center text-xl transition active:scale-95 hover:scale-105 z-30 hidden" onclick="openActivityModal('Trening')" title="Registrer ny oppføring">
            <i id="floating-btn-icon" class="fa-solid fa-plus"></i>
        </button>
    `;
}

function mountHtml(id, html) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = html;
}

window.renderPortalNavigation = function renderPortalNavigation() {
    mountHtml('portal-sidebar', renderSidebar());
    mountHtml('portal-mobile-header', renderMobileHeader());
    mountHtml('portal-action-bar', renderActionBar());
    mountHtml('portal-mobile-nav', renderMobileNav());
    mountHtml('portal-floating-action', renderFloatingActionButton());
};

window.renderPortalNavigation();
