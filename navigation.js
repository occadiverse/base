function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Tving menyen til å være lukket når vi laster en ny side
    sidebar.classList.add('collapsed');

    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || 'index.html';

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
