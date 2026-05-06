import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter');
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let dates = [];
const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

// --- HENT DATA ---
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    dates = Object.keys(attendanceData).sort((a, b) => {
        const dateA = a.split('-').reverse().join('-');
        const dateB = b.split('-').reverse().join('-');
        return new Date(dateA) - new Date(dateB);
    });
    
    updateMonthDropdown();
    renderMatrix();
    
    setTimeout(scrollToCurrentDate, 300);
});

onValue(ref(db, 'attendance'), (snapshot) => {
    const attendanceUpdated = snapshot.val() || {};
    attendanceData = attendanceUpdated;
    renderMatrix();
});

// --- LAG MÅNEDSVELGER ---
function updateMonthDropdown() {
    if (!monthFilter) return;
    
    const monthsFound = new Set();
    dates.forEach(date => {
        const parts = date.split('-');
        if (parts.length === 3) {
            monthsFound.add(`${parts[1]}-${parts[2]}`); 
        }
    });

    const sortedMonths = Array.from(monthsFound).sort((a, b) => {
        const [mA, yA] = a.split('-');
        const [mB, yB] = b.split('-');
        return new Date(yA, mA - 1) - new Date(yB, mB - 1);
    });

    const currentMonthYear = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`;
    const previousSelection = monthFilter.value;

    let filterHTML = '<option value="Alle">Hele sesongen</option>';
    sortedMonths.forEach(mY => {
        const [m, y] = mY.split('-');
        filterHTML += `<option value="${mY}">${monthNames[parseInt(m) - 1]} ${y}</option>`;
    });
    
    monthFilter.innerHTML = filterHTML;

    if (previousSelection && Array.from(monthFilter.options).some(opt => opt.value === previousSelection)) {
        monthFilter.value = previousSelection;
    } else if (monthsFound.has(currentMonthYear)) {
        monthFilter.value = currentMonthYear;
    }
}

// --- AUTO-FOKUS (SCROLL) ---
function scrollToCurrentDate() {
    if (!scrollContainer) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const headers = document.querySelectorAll('#attendanceHeader th[data-date]');
    let target = null;

    for (let th of headers) {
        if (th.dataset.date >= todayISO) {
            target = th;
            break;
        }
    }

    if (target) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

// --- TEGN TABELL ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody || !monthFilter) return;

    const selectedMonthYear = monthFilter.value;

    const filteredDates = dates.filter(date => {
        if (selectedMonthYear === 'Alle') return true;
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}` === selectedMonthYear;
    });

    // 1. Headere (Oppdatert med stabel-design)
    let headerRow = `<tr><th class="name-col">Spiller</th>`;
    filteredDates.forEach(date => {
        const info = attendanceData[date]?.info || {};
        const type = info.type || 'Trening';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        const isoDate = date.split('-').reverse().join('-');
        
        headerRow += `
            <th data-date="${isoDate}">
                <div class="header-content">
                    <span class="header-date">${date.substring(0, 5)}</span>
                    <div class="day-type ${typeClass}">${type.charAt(0)}</div>
                    <button class="btn-delete-header" onclick="window.deleteDate('${date}')" title="Slett dag">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </th>`;
    });
    headerRow += `</tr>`;
    attendanceHeader.innerHTML = headerRow;

    // 2. Rader (Spillere)
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .sort((a, b) => a[1].navn.localeCompare(b[1].navn, 'nb'));

    let bodyHTML = '';
    sortedPlayers.forEach(([pId, pData]) => {
        let row = `<tr>
            <td class="name-col text-left">
                <span style="color: var(--text-main); font-weight: 600;">${pData.navn}</span>
            </td>`;
        
        filteredDates.forEach(date => {
            const dateData = attendanceData[date] || {};
            const status = dateData[pId] || '';
            row += `<td class="attendance-cell" data-date="${date}" data-player="${pId}" onclick="window.toggleStatus('${date}', '${pId}', '${status}')" 
                        style="cursor:pointer; transition: background 0.1s;">
                        ${getStatusIcon(status)}
                    </td>`;
        });
        row += `</tr>`;
        bodyHTML += row;
    });
    attendanceBody.innerHTML = bodyHTML;
}

// --- GLOBALE FUNKSJONER ---
window.filterByMonth = (monthValue) => {
    renderMatrix();
    setTimeout(scrollToCurrentDate, 100);
};

function getStatusIcon(status) {
    return status === 'K' 
        ? '<i class="fa-solid fa-circle-check status-present"></i>' 
        : '<i class="fa-regular fa-circle status-none"></i>';
}

window.toggleStatus = (date, pId, currentStatus) => {
    const nextStatus = currentStatus === 'K' ? '' : 'K';
    const cell = document.querySelector(`[data-date="${date}"][data-player="${pId}"]`);
    if (cell) {
        cell.style.opacity = '0.6';
        cell.style.transform = 'scale(0.95)';
    }
    
    update(ref(db, `attendance/${date}`), { [pId]: nextStatus }).then(() => {
        if (cell) {
            cell.style.opacity = '1';
            cell.style.transform = 'scale(1)';
        }
    }).catch((error) => {
        console.error('Feil ved oppdatering:', error);
        if (cell) {
            cell.style.opacity = '1';
            cell.style.transform = 'scale(1)';
        }
    });
};

window.deleteDate = (date) => {
    if (confirm(`Er du sikker på at du vil slette hele dagen ${date}?`)) {
        remove(ref(db, `attendance/${date}`));
    }
};

attendanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawDate = document.getElementById('eventDate').value; 
    const type = document.getElementById('eventType').value;
    if (!rawDate) return;

    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 

    set(ref(db, `attendance/${formattedDate}/info`), {
        type: type,
        timestamp: Date.now()
    }).then(() => {
        window.closeAttendanceModal();
    });
});
