function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Finn ut hvilken side vi er på nå for å sette "active"-klassen
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <i class="fa-solid fa-house" style="font-size: 1.2rem; color: var(--primary);"></i>
            <button class="menu-toggle" onclick="toggleMenu()">
                <i class="fa-solid fa-xmark"></i>
            </button>
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
            <div style="margin-top: auto; padding-top: 20px; font-size: 10px; color: #a0aec0; text-align: center;">
                <p>BSK Fotball © 2026</p>
            </div>
        </div>
    `;
}

// Funksjon for å styre åpning/lukking (felles for alle sider)
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    sidebar.classList.toggle('collapsed');
    
    if (openBtn) {
        openBtn.style.display = sidebar.classList.contains('collapsed') ? 'block' : 'none';
    }
}

// Kjør funksjonen når siden lastes
document.addEventListener('DOMContentLoaded', loadNavigation);
