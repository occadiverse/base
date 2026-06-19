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

const MOBILE_TAB_ORDER = ['hjem', 'kamper', 'oppmote', 'statistikk', 'taktikk'];

function getMobileTabIndex(tabId) {
    return MOBILE_TAB_ORDER.indexOf(tabId);
}

function setMobileNavProgress(progress, isSwiping = false) {
    const mobileNav = document.querySelector('.portal-mobile-nav-shell');
    if (!mobileNav) return;

    const clampedProgress = Math.max(0, Math.min(MOBILE_TAB_ORDER.length - 1, progress));
    mobileNav.style.setProperty('--portal-mobile-nav-progress', String(clampedProgress));
    mobileNav.classList.toggle('portal-mobile-nav-swiping', isSwiping);
}

function setMobileNavSettling(isSettling) {
    const mobileNav = document.querySelector('.portal-mobile-nav-shell');
    if (!mobileNav) return;
    mobileNav.classList.toggle('portal-mobile-nav-settling', isSettling);
}

function setMobileNavTab(tabId) {
    const tabIndex = getMobileTabIndex(tabId);
    if (tabIndex === -1) return;
    setMobileNavProgress(tabIndex, false);
    setMobileNavSettling(false);
}

function switchTab(tabId, options = {}) {
    const previousTab = currentTab;
    currentTab = tabId;
    window.currentTab = tabId;
    if (typeof window.closeMobileToolsMenu === 'function') window.closeMobileToolsMenu();

    ['hjem', 'kamper', 'oppmote', 'tropp', 'statistikk', 'admin', 'taktikk', 'kampdetaljer'].forEach(id => {
        const el = document.getElementById(`view-${id}`);
        if (el) el.classList.add('hidden');
    });

    const activeEl = document.getElementById(`view-${tabId}`);
    if (activeEl) activeEl.classList.remove('hidden');

    const scrollHost = document.querySelector('.portal-main-shell');
    if (scrollHost) scrollHost.scrollTop = 0;

    if (tabId === 'oppmote') {
        const d = new Date();
        window.currentCalendarDate = d;
        window.selectedCalendarDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.updateDailySchedule === 'function') window.updateDailySchedule();
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

    const activeMobileBtn = document.querySelectorAll('.mobile-nav-btn')[getMobileTabIndex(tabId)];
    if (activeMobileBtn) activeMobileBtn.classList.add('active-nav', 'text-bsk-yellow');
    setMobileNavTab(tabId);

    const mobileToolsBtn = document.querySelector('.portal-mobile-admin-btn');
    if (mobileToolsBtn) {
        mobileToolsBtn.classList.toggle('is-active', tabId === 'tropp' || tabId === 'admin');
    }

    if (tabId === 'oppmote') {
        window.renderEvents();
        window.recalculateOppmoteAndKjemi();
    } else if (tabId === 'tropp') {
        window.renderPlayerRoster();
    } else if (tabId === 'statistikk') {
        if (typeof window.updateDynamicSelectors === 'function') window.updateDynamicSelectors();
        window.renderStatistikkSide();
        if (typeof window.switchStatTab === 'function') {
            const activeStatTab = document.querySelector('.stat-tab-btn.is-active');
            const tabName = activeStatTab && activeStatTab.id
                ? activeStatTab.id.replace('stat-tab-', '')
                : 'lag';
            window.switchStatTab(tabName);
        }
    } else if (tabId === 'admin' && isAdminUnlocked) {
        renderAdminTeamsList();
    } else if (tabId === 'hjem') {
        window.updateDashboard();
    } else if (tabId === 'taktikk') {
        if (typeof window.setTacticalPhase === 'function') window.setTacticalPhase('fase1');
        if (typeof window.updateTacticalMatchSelector === 'function') window.updateTacticalMatchSelector();
    }

    if (options.animate === 'swipe' && previousTab !== tabId) {
        animateMobileSwipeTab(tabId, options.direction);
    }
}

function animateMobileSwipeTab(tabId, direction) {
    if (window.innerWidth >= 768) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const activeEl = document.getElementById(`view-${tabId}`);
    if (!activeEl) return;

    activeEl.classList.remove('portal-view-swipe-enter-left', 'portal-view-swipe-enter-right');
    activeEl.style.setProperty('--portal-swipe-enter-distance', `${Math.min(118, Math.max(74, window.innerWidth * 0.24))}px`);
    // Restart the keyframe if the user swipes several tabs in quick succession.
    void activeEl.offsetWidth;
    activeEl.classList.add(direction === 'right' ? 'portal-view-swipe-enter-right' : 'portal-view-swipe-enter-left');

    window.setTimeout(() => {
        activeEl.classList.remove('portal-view-swipe-enter-left', 'portal-view-swipe-enter-right');
        activeEl.style.removeProperty('--portal-swipe-enter-distance');
    }, 760);
}

function setupMobileSwipeNavigation() {
    if (window.mobileSwipeNavigationReady) return;
    window.mobileSwipeNavigationReady = true;
    document.documentElement.dataset.mobileSwipeNavigation = 'ready';

    const swipeTabs = MOBILE_TAB_ORDER;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let activeSwipeEl = null;
    let nextSwipeEl = null;
    let preparedSwipeIndex = -1;
    let swipePageOffset = 0;
    let swipeLayout = null;
    let hasHorizontalIntent = false;
    let isTracking = false;
    let swipeCompletionTimer = null;

    const shouldIgnoreSwipe = (target) => {
        if (!target || !target.closest) return false;
        return Boolean(target.closest(
            'input, textarea, select, table, .overflow-x-auto, .stats-sort-scroller, .stats-player-sort-dock, .portal-segmented, .portal-mobile-nav-shell, .portal-mobile-tools, .modal-base, [role="dialog"], [data-no-swipe]'
        ));
    };

    const getSwipeTargetIndex = (deltaX) => {
        const currentIndex = swipeTabs.indexOf(currentTab);
        if (currentIndex === -1) return -1;

        const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= swipeTabs.length) return -1;
        return nextIndex;
    };

    const getSwipePageOffset = () => {
        if (swipePageOffset) return swipePageOffset;

        const layout = getSwipeLayout();
        const pageWidth = activeSwipeEl
            ? activeSwipeEl.getBoundingClientRect().width
            : window.innerWidth - layout.gap * 2;

        swipePageOffset = pageWidth + layout.gap;
        return swipePageOffset;
    };

    const getSwipeLayout = () => {
        if (swipeLayout) return swipeLayout;

        const mainView = document.getElementById('main-view');
        const mainRect = mainView ? mainView.getBoundingClientRect() : { left: 0, top: 0 };
        const activeRect = activeSwipeEl
            ? activeSwipeEl.getBoundingClientRect()
            : { left: 16, top: 16, width: window.innerWidth - 32 };
        const styles = mainView ? window.getComputedStyle(mainView) : null;
        const gap = styles ? parseFloat(styles.paddingLeft) || 16 : 16;

        swipeLayout = {
            gap,
            left: activeRect.left - mainRect.left,
            top: activeRect.top - mainRect.top,
            width: activeRect.width
        };

        return swipeLayout;
    };

    const cleanupNextSwipePreview = (hideNext = true) => {
        if (!nextSwipeEl) return;

        if (hideNext && nextSwipeEl.id !== `view-${currentTab}`) {
            nextSwipeEl.classList.add('hidden');
        }

        nextSwipeEl.classList.remove('portal-view-mobile-peek');
        nextSwipeEl.removeAttribute('aria-hidden');
        nextSwipeEl.inert = false;
        nextSwipeEl.style.transition = '';
        nextSwipeEl.style.transform = '';
        nextSwipeEl.style.opacity = '';
        nextSwipeEl.style.left = '';
        nextSwipeEl.style.top = '';
        nextSwipeEl.style.width = '';
        nextSwipeEl = null;
        preparedSwipeIndex = -1;
    };

    const cleanupSwipeDrag = (hideNext = true) => {
        if (swipeCompletionTimer) {
            window.clearTimeout(swipeCompletionTimer);
            swipeCompletionTimer = null;
        }

        const mainView = document.getElementById('main-view');
        if (mainView) mainView.classList.remove('portal-swipe-peeking');

        if (activeSwipeEl) {
            activeSwipeEl.classList.remove('portal-view-mobile-dragging');
            activeSwipeEl.style.transition = '';
            activeSwipeEl.style.transform = '';
            activeSwipeEl.style.opacity = '';
        }

        cleanupNextSwipePreview(hideNext);
        swipePageOffset = 0;
        swipeLayout = null;
        setMobileNavTab(currentTab);
    };

    const prepareNextSwipePreview = (nextIndex, direction) => {
        const nextEl = document.getElementById(`view-${swipeTabs[nextIndex]}`);
        if (!nextEl) return null;

        if (nextSwipeEl === nextEl && preparedSwipeIndex === nextIndex) return nextSwipeEl;
        if (nextSwipeEl && nextSwipeEl !== nextEl) cleanupNextSwipePreview(true);

        nextSwipeEl = nextEl;
        preparedSwipeIndex = nextIndex;
        nextSwipeEl.classList.remove('hidden');
        nextSwipeEl.classList.add('portal-view-mobile-peek');
        nextSwipeEl.setAttribute('aria-hidden', 'true');
        nextSwipeEl.inert = true;
        const layout = getSwipeLayout();
        nextSwipeEl.style.left = `${layout.left}px`;
        nextSwipeEl.style.top = `${layout.top}px`;
        nextSwipeEl.style.width = `${layout.width}px`;
        nextSwipeEl.style.transition = 'none';
        nextSwipeEl.style.transform = `translate3d(${direction * getSwipePageOffset()}px, 0, 0)`;
        nextSwipeEl.style.opacity = '1';

        const mainView = document.getElementById('main-view');
        if (mainView) mainView.classList.add('portal-swipe-peeking');

        return nextSwipeEl;
    };

    const resetSwipeDragStyles = (animateBack = false, direction = 0) => {
        if (!activeSwipeEl) return;
        const activeEl = activeSwipeEl;
        const nextEl = nextSwipeEl;
        const pageOffset = getSwipePageOffset();

        if (animateBack) {
            activeEl.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease';
            activeEl.style.transform = 'translate3d(0, 0, 0)';
            activeEl.style.opacity = '';

            if (nextEl) {
                nextEl.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease';
                nextEl.style.transform = `translate3d(${direction * pageOffset}px, 0, 0)`;
                nextEl.style.opacity = '0';
            }

            window.setTimeout(() => {
                const mainView = document.getElementById('main-view');
                if (mainView) mainView.classList.remove('portal-swipe-peeking');

                activeEl.classList.remove('portal-view-mobile-dragging');
                activeEl.style.transition = '';
                activeEl.style.transform = '';
                activeEl.style.opacity = '';

                if (nextEl) {
                    if (nextEl.id !== `view-${currentTab}`) nextEl.classList.add('hidden');
                    nextEl.classList.remove('portal-view-mobile-peek');
                    nextEl.removeAttribute('aria-hidden');
                    nextEl.inert = false;
                    nextEl.style.transition = '';
                    nextEl.style.transform = '';
                    nextEl.style.opacity = '';
                    nextEl.style.left = '';
                    nextEl.style.top = '';
                    nextEl.style.width = '';
                }

                if (activeSwipeEl === activeEl) activeSwipeEl = null;
                if (nextSwipeEl === nextEl) nextSwipeEl = null;
                preparedSwipeIndex = -1;
                swipePageOffset = 0;
                swipeLayout = null;
                setMobileNavTab(currentTab);
            }, 260);
            return;
        }

        cleanupSwipeDrag(true);
    };

    const finishSwipeToTab = (nextIndex, direction) => {
        if (!activeSwipeEl || !nextSwipeEl) return;

        const activeEl = activeSwipeEl;
        const nextEl = nextSwipeEl;
        const pageOffset = getSwipePageOffset();
        const transition = 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease';

        activeEl.style.transition = transition;
        activeEl.style.transform = `translate3d(${-direction * pageOffset}px, 0, 0)`;
        activeEl.style.opacity = '1';

        nextEl.style.transition = transition;
        nextEl.style.transform = 'translate3d(0, 0, 0)';
        nextEl.style.opacity = '1';
        setMobileNavSettling(true);
        setMobileNavProgress(nextIndex, false);

        swipeCompletionTimer = window.setTimeout(() => {
            const mainView = document.getElementById('main-view');
            if (mainView) mainView.classList.remove('portal-swipe-peeking');

            switchTab(swipeTabs[nextIndex]);

            activeEl.classList.remove('portal-view-mobile-dragging');
            activeEl.style.transition = '';
            activeEl.style.transform = '';
            activeEl.style.opacity = '';

            nextEl.classList.remove('portal-view-mobile-peek');
            nextEl.removeAttribute('aria-hidden');
            nextEl.inert = false;
            nextEl.style.transition = '';
            nextEl.style.transform = '';
            nextEl.style.opacity = '';
            nextEl.style.left = '';
            nextEl.style.top = '';
            nextEl.style.width = '';

            activeSwipeEl = null;
            nextSwipeEl = null;
            preparedSwipeIndex = -1;
            swipePageOffset = 0;
            swipeLayout = null;
            swipeCompletionTimer = null;
        }, 380);
    };

    document.addEventListener('touchstart', event => {
        if (window.innerWidth >= 768 || event.touches.length !== 1 || shouldIgnoreSwipe(event.target)) {
            isTracking = false;
            return;
        }

        cleanupSwipeDrag(true);
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        currentX = startX;
        activeSwipeEl = document.getElementById(`view-${currentTab}`);
        swipeLayout = null;
        const layout = getSwipeLayout();
        swipePageOffset = activeSwipeEl
            ? activeSwipeEl.getBoundingClientRect().width + layout.gap
            : 0;
        hasHorizontalIntent = false;
        isTracking = true;
    }, { passive: true });

    document.addEventListener('touchmove', event => {
        if (!isTracking || window.innerWidth >= 768 || event.touches.length !== 1 || !activeSwipeEl) return;

        currentX = event.touches[0].clientX;
        const deltaX = currentX - startX;
        const deltaY = event.touches[0].clientY - startY;

        if (!hasHorizontalIntent) {
            if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) return;
            if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
                isTracking = false;
                resetSwipeDragStyles(false);
                activeSwipeEl = null;
                return;
            }

            hasHorizontalIntent = true;
            activeSwipeEl.classList.add('portal-view-mobile-dragging');
        }

        event.preventDefault();

        const nextIndex = getSwipeTargetIndex(deltaX);
        const direction = deltaX < 0 ? 1 : -1;
        const hasNextTab = nextIndex !== -1;
        const maxDragDistance = hasNextTab ? window.innerWidth * 0.72 : window.innerWidth * 0.18;
        const dragResistance = hasNextTab ? 1 : 0.28;
        const dragDistance = Math.max(-maxDragDistance, Math.min(maxDragDistance, deltaX * dragResistance));
        const currentIndex = getMobileTabIndex(currentTab);

        activeSwipeEl.style.transition = 'none';
        activeSwipeEl.style.transform = `translate3d(${dragDistance}px, 0, 0)`;
        activeSwipeEl.style.opacity = '1';

        if (hasNextTab) {
            const nextEl = prepareNextSwipePreview(nextIndex, direction);
            if (nextEl) {
                const pageOffset = getSwipePageOffset();
                const nextDistance = Math.max(-pageOffset, Math.min(pageOffset, direction * pageOffset + dragDistance));
                const swipeProgress = Math.min(1, Math.abs(dragDistance) / Math.max(1, pageOffset * 0.48));

                nextEl.style.transform = `translate3d(${nextDistance}px, 0, 0)`;
                nextEl.style.opacity = '1';
                if (currentIndex !== -1) {
                    setMobileNavProgress(currentIndex + (nextIndex - currentIndex) * swipeProgress, true);
                }
            }
        } else {
            cleanupNextSwipePreview(true);
            if (currentIndex !== -1) {
                const edgePull = Math.min(0.16, Math.abs(dragDistance) / Math.max(1, window.innerWidth) * 0.35);
                setMobileNavProgress(currentIndex + (deltaX < 0 ? edgePull : -edgePull), true);
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', event => {
        if (!isTracking || window.innerWidth >= 768 || event.changedTouches.length !== 1) return;

        const deltaX = event.changedTouches[0].clientX - startX;
        const deltaY = event.changedTouches[0].clientY - startY;
        isTracking = false;

        const minSwipeDistance = Math.max(90, window.innerWidth * 0.24);
        const direction = deltaX < 0 ? 1 : -1;
        if (!hasHorizontalIntent || Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY) * 1.6) {
            resetSwipeDragStyles(hasHorizontalIntent, direction);
            activeSwipeEl = null;
            return;
        }

        const nextIndex = getSwipeTargetIndex(deltaX);
        if (nextIndex === -1) {
            resetSwipeDragStyles(hasHorizontalIntent, direction);
            activeSwipeEl = null;
            return;
        }

        if (!nextSwipeEl) prepareNextSwipePreview(nextIndex, direction);
        finishSwipeToTab(nextIndex, direction);
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        if (!isTracking) return;
        isTracking = false;
        const deltaX = currentX - startX;
        resetSwipeDragStyles(hasHorizontalIntent, deltaX < 0 ? 1 : -1);
        activeSwipeEl = null;
    }, { passive: true });
}

window.setupMobileSwipeNavigation = setupMobileSwipeNavigation;

function parseScore(resultStr) {
    if (!resultStr || !resultStr.includes('-')) return null;

    const pts = resultStr.split('-').map(x => parseInt(x.trim()));
    if (pts.length !== 2 || isNaN(pts[0]) || isNaN(pts[1])) return null;

    return { bsk: pts[0], opponent: pts[1] };
}

function getMatchVenue(match) {
    if (match && match.venue === 'Hjemme') return 'Hjemme';
    if (match && match.venue === 'Borte') return 'Borte';
    return 'Borte';
}

function formatMatchResultForDisplay(resultStr, venue) {
    if (!resultStr) return '-';

    const parsedScore = parseScore(resultStr);
    if (!parsedScore) return resultStr;

    if (venue === 'Hjemme') {
        return `${parsedScore.bsk}-${parsedScore.opponent}`;
    }

    return `${parsedScore.opponent}-${parsedScore.bsk}`;
}

function getMatchCardSides(match) {
    const venue = getMatchVenue(match);
    const opponentName = match && match.opponent ? match.opponent : 'Motstander';

    if (venue === 'Hjemme') {
        return {
            venue,
            venueLabel: 'Hjemme',
            left: { name: 'Bækkelaget', isBsk: true },
            right: { name: opponentName, isBsk: false }
        };
    }

    return {
        venue,
        venueLabel: 'Borte',
        left: { name: opponentName, isBsk: false },
        right: { name: 'Bækkelaget', isBsk: true }
    };
}

window.getMatchVenue = getMatchVenue;
window.formatMatchResultForDisplay = formatMatchResultForDisplay;
window.getMatchCardSides = getMatchCardSides;

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

window.getFormGuide = getFormGuide;
