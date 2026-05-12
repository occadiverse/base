/**
 * BSK NAVIGATION SYSTEM
 * Håndterer både PC-Sidebar og Mobil-Bunnmeny
 */
function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    const bottomNav = document.querySelector('.bottom-nav');
    
    // Finn ut hvilken side vi er på
    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || 'index.html';

    const pageTitles = {
        'index.html': 'Hjem',
        'oppmote.html': 'Oppmøte',
        'kamper.html': 'Kamper',
        'spillere.html': 'Tropp',
        'statistikk.html': 'Statistikk',
        'test.html': 'Design-test'
    };

    // 1. Oppdater overskriften i Top-Bar
    const topBarTitle = document.querySelector('.top-bar .section-title');
    if (topBarTitle) {
        topBarTitle.innerText = pageTitles[currentPage] || 'BSK Fotball';
    }

    // 2. Bygg Sidebar for PC
    if (sidebar) {
        sidebar.innerHTML = `
            <div class="nav-links">
                <a href="index.html" class="nav-item ${currentPage === 'index.html' ? 'active' : ''}"><i class="fa-solid fa-house"></i><span>Hjem</span></a>
                <a href="oppmote.html" class="nav-item ${currentPage === 'oppmote.html' ? 'active' : ''}"><i class="fa-solid fa-calendar-check"></i><span>Oppmøte</span></a>
                <a href="kamper.html" class="nav-item ${currentPage === 'kamper.html' ? 'active' : ''}"><i class="fa-solid fa-soccer-ball"></i><span>Kamper</span></a>
                <a href="spillere.html" class="nav-item ${currentPage === 'spillere.html' ? 'active' : ''}"><i class="fa-solid fa-users"></i><span>Tropp</span></a>
                <a href="statistikk.html" class="nav-item ${currentPage === 'statistikk.html' || currentPage === 'test.html' ? 'active' : ''}"><i class="fa-solid fa-chart-line"></i><span>Stats</span></a>
            </div>
        `;
    }

    // 3. Marker aktiv knapp i Bottom-Nav for Mobil
    if (bottomNav) {
        const navLinks = bottomNav.querySelectorAll('.nav-item');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// Kjør når siden lastes
document.addEventListener('DOMContentLoaded', loadNavigation);
