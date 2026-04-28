import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter'); // Husk å ha denne ID-en i HTML

let players = {};
let attendanceData = {};
let dates = [];
const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

// --- HENT DATA ---
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    // Hent alle unike datoer og sorter dem (nyeste først)
    dates = Object.keys(attendanceData).sort((a, b) => {
        const dateA = a.split('-').reverse().join('-');
        const dateB = b.split('-').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
    });
    
    updateMonthDropdown();
    renderMatrix();
});

// --- LAG MÅNEDSVELGER ---
function updateMonthDropdown() {
    if (!monthFilter) return;
    
    const monthsFound = new Set();
    dates.forEach(date => {
        const parts = date.split('-');
        if (parts.length === 3) {
            monthsFound.add(`${parts[1]}-${parts[2]}`); // Lagrer "MM-YYYY"
        }
    });

    // Sorter månedene kronologisk (nyeste øverst)
    const sortedMonths = Array.from(monthsFound).sort((a, b) => {
        const [mA, yA] = a.split('-');
        const [mB, yB] = b.split('-');
        return new Date(yB, mB - 1) - new Date(yA, mA - 1);
    });

    // Lagre nåværende valg hvis det finnes
    const currentSelection = monthFilter.value;

    let filterHTML = '';
    sortedMonths.forEach(mY => {
        const [m, y] = mY.split('-');
        filterHTML += `<option value="${mY}">${monthNames[parseInt(m) - 1]} ${y}</option>`;
    });
    
    monthFilter.innerHTML = filterHTML;

    // Prøv å behold valget, eller velg den nyeste måneden som standard
    if (currentSelection && monthsFound.has(currentSelection)) {
        monthFilter.value = currentSelection;
    }
}

// --- TEGN TABELL ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody || !monthFilter) return;

    // Finn valgt måned fra dropdown (format MM-YYYY)
    const selectedMonthYear = monthFilter.value;

    // Filtrer datoene slik at vi bare viser de som tilhører valgt måned
    const filteredDates = dates.filter(date => {
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}` === selectedMonthYear;
    });

    // 1. Headere (Datoer)
    let headerRow = `<tr><th class="name-col">Spiller</th>`;
    filteredDates.forEach(date => {
        const info = attendanceData[date]?.info || {};
        const type = info.type || 'Trening';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        
        headerRow += `
            <th>
                <div style="font-size: 0.85rem; white-space: nowrap;">${date.substring(0, 5)}</div>
                <div class="day-type ${typeClass}">${type.charAt(0)}</div>
                <div style="margin-top: 8px;">
                    <button class="action-btn btn-delete" style="width: 24px; height: 24px; font-size: 0.7rem;" onclick="window.deleteDate('${date}')">
                        <i class="fa-solid fa-trash"></i>
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
            const status = attendanceData[date][pId] || '';
            row += `<td onclick="window.toggleStatus('${date}', '${pId}', '${status}')" 
                        style="cursor:pointer; transition: background 0.1s;"
                        onmouseover="this.style.background='#f8f9fa'" 
                        onmouseout="this.style.background='transparent'">
                        ${getStatusIcon(status)}
                    </td>`;
        });
        row += `</tr>`;
        bodyHTML += row;
    });
    attendanceBody.innerHTML = bodyHTML;
}

// --- GLOBALE FUNKSJONER ---
window.filterByMonth = () => {
    renderMatrix();
};

function getStatusIcon(status) {
    if (status === 'K') {
        return '<i class="fa-solid fa-circle-check status-present"></i>';
    } else {
        return '<i class="fa-regular fa-circle status-none"></i>';
    }
}

window.toggleStatus = (date, pId, currentStatus) => {
    const nextStatus = currentStatus === 'K' ? '' : 'K';
    update(ref(db, `attendance/${date}`), { [pId]: nextStatus });
};

window.deleteDate = (date) => {
    if (confirm(`Slette ${date}?`)) {
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
