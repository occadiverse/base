function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Tving menyen til å være lukket når vi laster en ny side
    sidebar.classList.add('collapsed');

    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || 'index.html';

    // --- AUTOMATISK OVERKRIFT LOGIKK ---
    const pageTitles = {
        'index.html': 'Hjem',
        'oppmote.html': 'Oppmøte',
        'kamper.html': 'Kamper',
        'spillere.html': 'Spillere',
        'statistikk.html': 'Statistikk',
        'test.html': 'Design-test'
    };

    // Finn h1-tittelen i top-bar og oppdater den
    const topBarTitle = document.querySelector('.top-bar .section-title');
    if (topBarTitle) {
        topBarTitle.innerText = pageTitles[currentPage] || 'BSK Fotball';
    }
    // ----------------------------------

    sidebar.innerHTML = `
        <nav class="nav-links">
            <a href="index.html" class="nav-item ${currentPage === 'index.html' ? 'active' : ''}">
                <i class="fa-solid fa-house"></i> Hjem
            </a>
            <a href="oppmote.html" class="nav-item ${currentPage === 'oppmote.html' ? 'active' : ''}">
                <i class="fa-solid fa-calendar-check"></i> Oppmøte
            </a>
            <a href="kamper.html" class="nav-item ${currentPage === 'kamper.html' ? 'active' : ''}">
                <i class="fa-solid fa-soccer-ball"></i> Kamper
            </a>
            <a href="spillere.html" class="nav-item ${currentPage === 'spillere.html' ? 'active' : ''}">
                <i class="fa-solid fa-users"></i> Spillere
            </a>
            <a href="statistikk.html" class="nav-item ${currentPage === 'statistikk.html' ? 'active' : ''}">
                <i class="fa-solid fa-chart-line"></i> Statistikk
            </a>
        </nav>
    `;

    // Lukk menyen når man trykker på en lenke (viktig for mobil)
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
                document.body.style.overflow = 'auto';
            }
        });
    });
}

// Funksjonen som åpner og lukker menyen
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        
        // Hindre scrolling på selve siden når menyen er åpen på mobil
        if (!sidebar.classList.contains('collapsed') && window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }
}

// Lukk menyen hvis man klikker utenfor den (på hovedinnholdet)
document.addEventListener('click', (event) => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (sidebar && !sidebar.classList.contains('collapsed')) {
        // Sjekk om klikket er utenfor både sidebar og toggle-knappen
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.add('collapsed');
            document.body.style.overflow = 'auto';
        }
    }
});

// KJØR funksjonen når siden er ferdig lastet
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
    loadNavigation();
}
