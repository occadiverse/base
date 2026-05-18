/**
 * BSK NAVIGATION SYSTEM - Ren menystyring uten titteloverskriving
 */
function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    const bottomNav = document.querySelector('.bottom-nav');
    
    // Finn ut hvilket filnavn vi er på akkurat nå
    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || 'index.html';

    // Definer alle menypunktene i appen
    const menuItems = [
        { href: 'index.html', icon: 'fa-house', text: 'Hjem' },
        { href: 'oppmote.html', icon: 'fa-calendar-check', text: 'Oppmøte' },
        { href: 'kamper.html', icon: 'fa-soccer-ball', text: 'Kamper' },
        { href: 'spillere.html', icon: 'fa-users', text: 'Tropp' },
        { href: 'statistikk.html', icon: 'fa-chart-line', text: 'Stats' }
    ];

    // HELPER: Sjekker om menypunktet skal lyse opp som aktivt (håndterer også testfiler)
    const erAktiv = (itemHref) => {
        if (currentPage === itemHref) return true;
        // Hvis vi tester oppmøtesiden og filen heter test.html, skal Oppmøte-knappen lyse
        if (itemHref === 'oppmote.html' && currentPage === 'test.html') return true;
        return false;
    };

    // 1. Bygg Sidebar for PC
    if (sidebar) {
        sidebar.innerHTML = `
            <div class="nav-links">
                ${menuItems.map(item => `
                    <a href="${item.href}" class="nav-item ${erAktiv(item.href) ? 'active' : ''}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.text}</span>
                    </a>
                `).join('')}
            </div>
        `;
    }

    // 2. Bygg Bottom-Nav for Mobil
    if (bottomNav) {
        bottomNav.innerHTML = menuItems.map(item => `
            <a href="${item.href}" class="nav-item ${erAktiv(item.href) ? 'active' : ''}">
                <i class="fa-solid ${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', loadNavigation);
