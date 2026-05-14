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
    
    // Sorter datoer kronologisk
    dates = Object.keys(attendanceData).sort((a, b) => {
        const dateA = a.split('-').reverse().join('-');
        const dateB = b.split('-').reverse().join('-');
        return new Date(dateA) - new Date(dateB);
    });
    
    updateMonthDropdown();
    renderMatrix();
    updateHeroStats(); // Oppdaterer tallene i heroseksjonen
    
    // Auto-scroll til dagens dato etter lasting
    setTimeout(scrollToCurrentDate, 300);
});

// --- DYNAMISK HERO-INFORMASJON ---
function updateHeroStats() {
    const totalEvents = dates.length;
    if (totalEvents === 0) return;

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};

    dates.forEach(date => {
        const dayData = attendanceData[date] || {};
        Object.entries(players).forEach(([id, p]) => {
            if (p.status !== 'Passiv') {
                potentialPoints++;
                if (dayData[id] === 'K') {
                    totalAttendancePoints++;
                    playerAttendanceCounts[id] = (playerAttendanceCounts[id] || 0) + 1;
                }
            }
        });
    });

    const topAttendance = Math.max(...Object.values(playerAttendanceCounts), 0);
    const avgPercent = potentialPoints > 0 ? Math.round((totalAttendancePoints / potentialPoints) * 100) : 0;

    const elTotal = document.getElementById('stat-total-events');
    const elAvg = document.getElementById('stat-avg-attendance');
    const elTop = document.getElementById('stat-top-attendance');

    if (elTotal) elTotal.innerText = totalEvents;
    if (elAvg) elAvg.innerText = avgPercent + '%';
    if (elTop) elTop.innerText = topAttendance;
}

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

    let filterHTML = '<option value="Alle">SESONG 2026</option>';
    sortedMonths.forEach(mY => {
        const [m, y] = mY.split('-');
        filterHTML += `<option value="${mY}">${monthNames[parseInt(m) - 1].toUpperCase()} ${y}</option>`;
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
    const today = new Date();
    today.setHours(0,0,0,0);

    const headers = document.querySelectorAll('#attendanceHeader th[data-date]');
    let target = null;

    for (let th of headers) {
        const thDate = new Date(th.dataset.date);
        if (thDate >= today) {
            target = th;
            break;
        }
    }

    if (target) {
        const offset = target.offsetLeft - (scrollContainer.offsetWidth / 2) + (target.offsetWidth / 2);
        scrollContainer.scrollTo({ left: offset, behavior: 'smooth' });
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

    let headerRow = `<tr><th class="name-col">SPILLER</th>`;
    
    filteredDates.forEach(date => {
        const info = attendanceData[date]?.info || {};
        const type = info.type || 'Trening';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        const isoDate = date.split('-').reverse().join('-');
        
        const d = date.split('-');
        const datoOverskrift = `${d[0]}.${d[1]}`;
        
        headerRow += `
            <th data-date="${isoDate}">
                <div class="header-content">
                    <button class="btn-delete-header" onclick="window.deleteDate('${date}')" title="Slett dag">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <span class="header-date">${datoOverskrift}</span>
                    <div class="day-type ${typeClass}">${type}</div>
                </div>
            </th>`;
    });
    headerRow += `</tr>`;
    attendanceHeader.innerHTML = headerRow;

    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, p]) => {
            const totalCount = Object.values(attendanceData).reduce((acc, curr) => {
                return acc + (curr[id] === 'K' ? 1 : 0);
            }, 0);

            return { id, navn: p.navn, totalCount };
        })
        .sort((a, b) => {
            if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
            return a.navn.localeCompare(b.navn, 'nb');
        });

    let bodyHTML = '';
    sortedPlayers.forEach((p) => {
        let row = `<tr>
            <td class="name-col">
                <div class="player-info-wrapper" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="player-name">${p.navn}</span>
                    <span class="attendance-badge">${p.totalCount}</span>
                </div>
            </td>`;
        
        filteredDates.forEach(date => {
            const dateData = attendanceData[date] || {};
            const status = dateData[p.id] || '';
            row += `<td class="attendance-cell" data-date="${date}" data-player="${p.id}" onclick="window.toggleStatus('${date}', '${p.id}', '${status}')">
                        ${getStatusIcon(status)}
                    </td>`;
        });
        row += `</tr>`;
        bodyHTML += row;
    });
    attendanceBody.innerHTML = bodyHTML;
}

function getStatusIcon(status) {
    return status === 'K' 
        ? '<i class="fa-solid fa-check status-present"></i>' 
        : '<i class="fa-regular fa-circle status-none"></i>';
}

window.filterByMonth = (monthValue) => {
    renderMatrix();
    setTimeout(scrollToCurrentDate, 100);
};

window.toggleStatus = (date, pId, currentStatus) => {
    const nextStatus = currentStatus === 'K' ? '' : 'K';
    const cell = document.querySelector(`[data-date="${date}"][data-player="${pId}"]`);
    
    if (cell) {
        cell.style.opacity = '0.5';
        cell.style.transform = 'scale(0.9)';
        cell.style.transition = '0.1s';
    }
    
    update(ref(db, `attendance/${date}`), { [pId]: nextStatus }).catch((error) => {
        console.error('Feil ved oppdatering:', error);
        if (cell) cell.style.opacity = '1';
    });
};

window.deleteDate = (date) => {
    if (confirm(`Vil du slette ${date} permanent fra systemet?`)) {
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
        if (window.closeAttendanceModal) window.closeAttendanceModal();
    });
});
