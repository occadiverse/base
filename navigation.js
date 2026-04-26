function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    sidebar.innerHTML = `
        <div class="sidebar-header" style="height: 60px; border: none;"></div>

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

// Oppdatert toggle-funksjon som er mer stabil
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}
