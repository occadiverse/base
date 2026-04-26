function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    sidebar.innerHTML = `
        <div class="sidebar-header" style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 15px; height: auto; border-bottom: 1px solid var(--border-color);">
            <img src="https://upload.wikimedia.org/wikipedia/no/thumb/0/00/B%C3%A6kkelagets_Sportsklubb_logo.svg/1200px-B%C3%A6kkelagets_Sportsklubb_logo.svg.png" 
                 alt="BSK Logo" 
                 style="width: 70px; height: auto; margin-bottom: 5px;">
            <div style="display: flex; width: 100%; justify-content: space-between; align-items: center;">
                <i class="fa-solid fa-house nav-home-icon" style="color: var(--text-dark);"></i>
                <button class="menu-toggle" onclick="toggleMenu()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>

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

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    sidebar.classList.toggle('collapsed');

    if (openBtn) {
        openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', loadNavigation);
