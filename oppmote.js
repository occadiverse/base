import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');

let players = {};
let attendanceData = {};
let dates = [];

// --- HENT DATA ---
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    // Hent datoer og sorter dem (nyeste først)
    dates = Object.keys(attendanceData).sort((a, b) => {
        const dateA = a.split('-').reverse().join('-');
        const dateB = b.split('-').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
    });
    
    renderMatrix();
});

// --- TEGN TABELL ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody) return;

    // Headere
    let headerRow = `<tr><th class="name-col">Spiller</th>`;
    dates.forEach(date => {
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

    // Rader
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => p.status !== 'Passiv')
        .sort((a, b) => a[1].navn.localeCompare(b[1].navn, 'nb'));

    let bodyHTML = '';
    sortedPlayers.forEach(([pId, pData]) => {
        let row = `<tr><td class="name-col text-left"><strong>${pData.navn}</strong></td>`;
        dates.forEach(date => {
            const status = attendanceData[date][pId] || '';
            row += `<td onclick="window.toggleStatus('${date}', '${pId}', '${status}')" style="cursor:pointer;">
                        ${getStatusIcon(status)}
                    </td>`;
        });
        row += `</tr>`;
        bodyHTML += row;
    });
    attendanceBody.innerHTML = bodyHTML;
}

function getStatusIcon(status) {
    switch(status) {
        case 'K': return '<i class="fa-solid fa-circle-check status-present"></i>';
        case 'F': return '<i class="fa-solid fa-circle-xmark status-absent"></i>';
        case 'S': return '<i class="fa-solid fa-circle-minus status-injured"></i>';
        default: return '<i class="fa-regular fa-circle status-none"></i>';
    }
}

// --- FUNKSJONER PÅ WINDOW (så HTML kan nå dem) ---
window.toggleStatus = (date, pId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === '') nextStatus = 'K';
    else if (currentStatus === 'K') nextStatus = 'F';
    else if (currentStatus === 'F') nextStatus = 'S';
    else if (currentStatus === 'S') nextStatus = '';

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
