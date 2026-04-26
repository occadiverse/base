function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error("Fant ikke sidebar-elementet!");
        return;
    }

    // Finn ut hvilken side vi er på for å markere aktiv knapp
    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || 'index.html';

    sidebar.innerHTML = `
        <div class="sidebar-header" style="height: 60px;"></div>
        <div class="sidebar-content">
            <nav class="nav-links">
                <a href="index.html" class="nav-item ${currentPage === 'index.html' ? 'active' : ''}">
                    <i class="fa-solid fa-house-chimney"></i> Hjem
                </a>
                <a href="oppmote.html" class="nav-item ${currentPage === 'oppmote.html' ? 'active' : ''}">
                    <i class="fa-solid fa-calendar-check"></i> Oppmøte
                </a>
                <a href="spillere.html" class="nav-item ${currentPage === 'spillere.html' ? 'active' : ''}">
                    <i class="fa-solid fa-users"></i> Spillere
                </a>
                <a href="statistikk.html" class="nav-item ${currentPage === 'statistikk.html' ? 'active' : ''}">
                    <i class="fa-solid fa-chart-line"></i> Stats
                </a>
            </nav>
            <div class="nav-footer">
                <p>BSK Fotball © ${new Date().getFullYear()}</p>
            </div>
        </div>
    `;
}

// Funksjonen som åpner og lukker menyen
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// KJØR funksjonen når siden er ferdig lastet
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
    loadNavigation();
}
