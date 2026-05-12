/**
 * BSK NAVIGATION SYSTEM - Optimalisert
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
        'statistikk.html': 'Statistikk'
    };

    // 1. Oppdater overskriften i Top-Bar
    const topBarTitle = document.querySelector('.top-bar .section-title');
    if (topBarTitle) {
        topBarTitle.innerText = pageTitles[currentPage] || 'BSK A-LAG';
    }

    // 2. Definer lenkene (likt for begge menyer)
    const menuItems = [
        { href: 'index.html', icon: 'fa-house', text: 'Hjem' },
        { href: 'oppmote.html', icon: 'fa-calendar-check', text: 'Oppmøte' },
        { href: 'kamper.html', icon: 'fa-soccer-ball', text: 'Kamper' },
        { href: 'spillere.html', icon: 'fa-users', text: 'Tropp' },
        { href: 'statistikk.html', icon: 'fa-chart-line', text: 'Stats' }
    ];

    // 3. Bygg Sidebar for PC
    if (sidebar) {
        sidebar.innerHTML = `
            <div class="nav-links">
                ${menuItems.map(item => `
                    <a href="${item.href}" class="nav-item ${currentPage === item.href ? 'active' : ''}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.text}</span>
                    </a>
                `).join('')}
            </div>
        `;
    }

    // 4. Bygg/Oppdater Bottom-Nav for Mobil
    if (bottomNav) {
        bottomNav.innerHTML = menuItems.map(item => `
            <a href="${item.href}" class="nav-item ${currentPage === item.href ? 'active' : ''}">
                <i class="fa-solid ${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', loadNavigation);
