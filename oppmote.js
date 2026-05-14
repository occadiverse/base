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
    
    // Auto-scroll til dagens dato etter lasting
    setTimeout(scrollToCurrentDate, 300);
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

    let filterHTML = '<option value="Alle">HELE SESONGEN</option>';
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

    // 1. Headere (Nå fullstendig tilpasset den globale th-stilen med store, fargede bokstaver)
    let headerRow = `<tr><th class="name-col" style="vertical-align: middle; color: #64748b; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">SPILLER</th>`;
    
    filteredDates.forEach(date => {
        const info = attendanceData[date]?.info || {};
        const type = info.type || 'Trening';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        const isoDate = date.split('-').reverse().join('-');
        
        const d = date.split('-');
        const datoOverskrift = `${d[0]}.${d[1]}`;
        
        headerRow += `
            <th data-date="${isoDate}" style="color: #64748b; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;">
                <div class="header-content">
                    <button class="btn-delete-header" onclick="window.deleteDate('${date}')" title="Slett dag">Slett</button>
                    <span class="header-date" style="color: #64748b;">${datoOverskrift}</span>
                    <div class="day-type ${typeClass}">${type.charAt(0)}</div>
                </div>
            </th>`;
    });
    headerRow += `</tr>`;
    attendanceHeader.innerHTML = headerRow;

    // 2. Sortering og Navnehåndtering (Fulle navn bevares her)
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .map(([id, p]) => {
            // Tell totalt oppmøte (K) på tvers av sesongen
            const totalCount = Object.values(attendanceData).reduce((acc, curr) => {
                return acc + (curr[id] === 'K' ? 1 : 0);
            }, 0);

            // Beholder p.navn akkurat slik det er registrert i steden for å forkorte det
            return { id, navn: p.navn, totalCount };
        })
        .sort((a, b) => {
            if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
            return a.navn.localeCompare(b.navn, 'nb');
        });

    // 3. Rader
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

// --- HJELPEFUNKSJONER ---
function getStatusIcon(status) {
    return status === 'K' 
        ? '<i class="fa-solid fa-circle-check status-present"></i>' 
        : '<i class="fa-regular fa-circle status-none"></i>';
}

// --- GLOBALE FUNKSJONER (window) ---
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

// --- FORM HANDLING ---
attendanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawDate = document.getElementById('eventDate').value; 
    const type = document.getElementById('eventType').value;
    if (!rawDate) return;

    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Til DD-MM-YYYY format

    set(ref(db, `attendance/${formattedDate}/info`), {
        type: type,
        timestamp: Date.now()
    }).then(() => {
        if (window.closeAttendanceModal) window.closeAttendanceModal();
    });
});
