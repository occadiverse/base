import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter');
const periodSelect = document.getElementById('statPeriodSelect');
const lagFilterSelect = document.getElementById('lagFilterSelect');
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let keys = []; 
let currentLagFilter = localStorage.getItem('currentLagFilter') || 'Alle';
const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

// --- NY HJELPEFUNKSJON: Henter en spillers sesongdata med fallbacks ---
function hentSpillerSesongData(spiller, valgtÅr) {
    if (spiller.historikk && spiller.historikk[valgtÅr]) {
        return {
            lag: spiller.historikk[valgtÅr].lag || 'Lag A',
            status: spiller.historikk[valgtÅr].status || 'Aktiv'
        };
    }
    return {
        lag: spiller.lag === 'B-lag' ? 'Lag B' : (spiller.lag || 'Lag A'),
        status: spiller.status || 'Aktiv'
    };
}

// Hjelpefunksjon for å hente ut ren ISO-dato (YYYY-MM-DD) uavhengig av nøkkeltype
function getIsoDateFromKey(key, data) {
    const info = data[key]?.info || {};
    if (info.date) {
        return info.date.includes('-') ? info.date : info.date.split('.').reverse().join('-');
    }
    if (key.includes('-') && key.split('-')[0].length === 2) {
        return key.split('-').reverse().join('-');
    }
    return '1970-01-01';
}

// --- HENT DATA FRA FIREBASE ---
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    genererSesongFilter();
    synkroniserLagDropdown();
    processKeys();
});

// Sorterer og behandler nøkler basert på gjeldende filtre
function processKeys() {
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();

    keys = Object.keys(attendanceData).filter(key => {
        const isoDate = getIsoDateFromKey(key, attendanceData);
        // 1. Sesongfilter (Sjekker om aktiviteten tilhører det valgte året)
        if (!isoDate.startsWith(valgtÅr)) return false;

        // 2. Lagfilter på aktivitet (Viser fellesøkter ELLER økter øremerket spesifikt lag)
        const info = attendanceData[key]?.info || {};
        const eventLag = info.lag || 'Felles';

        if (currentLagFilter !== 'Alle' && eventLag !== 'Felles' && eventLag !== currentLagFilter) {
            return false;
        }
        return true;
    }).sort((a, b) => {
        const dateA = new Date(getIsoDateFromKey(a, attendanceData));
        const dateB = new Date(getIsoDateFromKey(b, attendanceData));
        return dateA - dateB;
    });
    
    updateMonthDropdown();
    renderMatrix();
    updateHeroStats(); 
    
    setTimeout(scrollToCurrentDate, 300);
}

// --- GLOBALT SYNKRONISERT SESONGFILTER ---
function genererSesongFilter() {
    if (!periodSelect) return;
    
    const nåværendeÅr = new Date().getFullYear();
    const unikeSesonger = new Set([nåværendeÅr.toString(), (nåværendeÅr + 1).toString()]);
    
    let valgt = periodSelect.value || localStorage.getItem('currentSeasonFilter');
    if (!valgt) {
        valgt = nåværendeÅr.toString();
    }

    periodSelect.innerHTML = '';
    Array.from(unikeSesonger).sort().reverse().forEach(aar => {
        periodSelect.innerHTML += `<option value="${aar}">${aar}</option>`;
    });
    
    periodSelect.value = valgt;
    localStorage.setItem('currentSeasonFilter', valgt);
}

// --- SYNKRONISER OG LYTT PÅ DROPDOWNS ---
function synkroniserLagDropdown() {
    if (!lagFilterSelect) return;
    lagFilterSelect.value = currentLagFilter;
}

if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
        localStorage.setItem('currentSeasonFilter', e.target.value);
        processKeys();
    });
}

if (lagFilterSelect) {
    lagFilterSelect.addEventListener('change', (e) => {
        currentLagFilter = e.target.value;
        localStorage.setItem('currentLagFilter', currentLagFilter);
        
        // Oppdaterer Hero-teksten flytende med en gang
        const lagTekstSpan = document.getElementById('stat-lag-navn');
        if (lagTekstSpan) {
            lagTekstSpan.innerText = currentLagFilter === 'Alle' ? 'hele troppen' : currentLagFilter;
        }
        
        processKeys();
    });
}

if (monthFilter) {
    monthFilter.addEventListener('change', () => {
        renderMatrix();
        setTimeout(scrollToCurrentDate, 100);
    });
}

// --- DYNAMISK HERO-INFORMASJON ---
function updateHeroStats() {
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    const totalEvents = keys.length;

    // Oppdaterer årstall og lagnavn i teksten
    if (document.getElementById('stat-aar-tekst')) {
        document.getElementById('stat-aar-tekst').innerText = valgtÅr;
    }
    if (document.getElementById('stat-lag-navn')) {
        document.getElementById('stat-lag-navn').innerText = currentLagFilter === 'Alle' ? 'hele troppen' : currentLagFilter;
    }

    if (totalEvents === 0) {
        if (document.getElementById('stat-total-events')) document.getElementById('stat-total-events').innerText = '0';
        if (document.getElementById('stat-avg-attendance')) document.getElementById('stat-avg-attendance').innerText = '0%';
        if (document.getElementById('stat-top-attendance')) document.getElementById('stat-top-attendance').innerText = '0';
        return;
    }

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};

    // Sorterer ut spillere som er aktuelle for gjeldende sesong og lagfilter
    const relevanteSpillere = Object.entries(players).filter(([id, p]) => {
        const sData = hentSpillerSesongData(p, valgtÅr);
        if (sData.status === 'Passiv') return false;
        if (currentLagFilter !== 'Alle' && sData.lag !== currentLagFilter) return false;
        return true;
    });

    keys.forEach(key => {
        const dayData = attendanceData[key] || {};
        relevanteSpillere.forEach(([id, p]) => {
            potentialPoints++;
            if (dayData[id] === 'K') {
                totalAttendancePoints++;
                playerAttendanceCounts[id] = (playerAttendanceCounts[id] || 0) + 1;
            }
        });
    });

    const topAttendance = relevanteSpillere.length > 0 && Object.keys(playerAttendanceCounts).length > 0
        ? Math.max(...Object.values(playerAttendanceCounts), 0) 
        : 0;
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
    keys.forEach(key => {
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        if (parts.length === 3) {
            monthsFound.add(parts[1]); // Henter ut kun månedens nummer (MM)
        }
    });

    const previousSelection = monthFilter.value;
    let filterHTML = '<option value="Alle">HELE</option>';
    
    // Generer faste måneder, men vis bare de som faktisk har registrerte økter
    Array.from(monthsFound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(m => {
        filterHTML += `<option value="${m}">${monthNames[parseInt(m) - 1].toUpperCase().substring(0, 3)}</option>`;
    });
    
    monthFilter.innerHTML = filterHTML;

    if (previousSelection && Array.from(monthFilter.options).some(opt => opt.value === previousSelection)) {
        monthFilter.value = previousSelection;
    } else {
        monthFilter.value = "Alle";
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

    const selectedMonth = monthFilter.value;
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();

    // Endelig filtrering av økter som skal vises i kolonnene
    const filteredKeys = keys.filter(key => {
        if (selectedMonth === 'Alle') return true;
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        return parts[1] === selectedMonth;
    });

    let headerRow = `<tr><th class="name-col">SPILLER</th>`;
    
    filteredKeys.forEach(key => {
        const info = attendanceData[key]?.info || {};
        const type = info.type || 'Trening';
        const eventLag = info.lag || 'Felles';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        const isoDate = getIsoDateFromKey(key, attendanceData);
        
        const dParts = isoDate.split('-');
        const datoOverskrift = `${dParts[2]}.${dParts[1]}`;
        
        // Viser en liten diskret 'B' eller 'A' over datoen hvis man ser på "ALLE" og økten er lagspesifikk
        const lagSubBadge = (currentLagFilter === 'Alle' && eventLag !== 'Felles') 
            ? `<span style="font-size: 0.6rem; color: var(--text-muted); font-weight: 800;">(${eventLag.replace('Lag ', '')})</span>` 
            : '';

        headerRow += `
            <th data-date="${isoDate}">
                <div class="header-content">
                    <button class="btn-delete-header" onclick="window.deleteDate('${key}')" title="Slett dag">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <span class="header-date">${datoOverskrift} ${lagSubBadge}</span>
                    <div class="day-type ${typeClass}">${type.substring(0,1)}</div>
                </div>
            </th>`;
    });
    headerRow += `</tr>`;
    attendanceHeader.innerHTML = headerRow;

    // Filtrer ut og sorter spillere basert på hvem som tilhører valgt lag/status i valgt sesong
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => {
            const sData = hentSpillerSesongData(p, valgtÅr);
            if (sData.status === 'Passiv') return false;
            if (currentLagFilter !== 'Alle' && sData.lag !== currentLagFilter) return false;
            return true;
        })
        .map(([id, p]) => {
            // Regner ut totalt oppmøte KUN for de øktene som vises i gjeldende visning
            const totalCount = filteredKeys.reduce((acc, key) => {
                return acc + (attendanceData[key]?.[id] === 'K' ? 1 : 0);
            }, 0);

            return { id, navn: p.navn, totalCount };
        })
        .sort((a, b) => {
            if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
            return a.navn.localeCompare(b.navn, 'nb');
        });

    if (sortedPlayers.length === 0) {
        attendanceBody.innerHTML = `<tr><td class="name-col" style="padding:20px; color:var(--text-muted);">Ingen aktive spillere registrert på dette utvalget.</td></tr>`;
        return;
    }

    let bodyHTML = '';
    sortedPlayers.forEach((p) => {
        let row = `<tr>
            <td class="name-col">
                <div class="player-info-wrapper" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="player-name" style="font-weight:600;">${p.navn}</span>
                    <span class="attendance-badge">${p.totalCount}</span>
                </div>
            </td>`;
        
        filteredKeys.forEach(key => {
            const dateData = attendanceData[key] || {};
            const status = dateData[p.id] || '';
            row += `<td class="attendance-cell" data-date="${key}" data-player="${p.id}" onclick="window.toggleStatus('${key}', '${p.id}', '${status}')">
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

window.toggleStatus = (key, pId, currentStatus) => {
    const nextStatus = currentStatus === 'K' ? '' : 'K';
    const cell = document.querySelector(`[data-date="${key}"][data-player="${pId}"]`);
    
    if (cell) {
        cell.style.opacity = '0.5';
        cell.style.transform = 'scale(0.9)';
        cell.style.transition = '0.1s';
    }
    
    update(ref(db, `attendance/${key}`), { [pId]: nextStatus }).catch((error) => {
        console.error('Feil ved oppdatering:', error);
        if (cell) cell.style.opacity = '1';
    });
};

window.deleteDate = (key) => {
    if (confirm(`Vil du slette denne aktiviteten permanent fra systemet?`)) {
        remove(ref(db, `attendance/${key}`));
    }
};

attendanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawDate = document.getElementById('eventDate').value; 
    const eventLagValg = document.getElementById('eventLag').value; // Sjekker hvilket lag økten er tilskrevet
    if (!rawDate) return;

    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 

    set(ref(db, `attendance/${formattedDate}/info`), {
        type: 'Trening', // Standardisert eller utvidbart
        lag: eventLagValg,
        timestamp: Date.now()
    }).then(() => {
        if (window.closeAttendanceModal) window.closeAttendanceModal();
    });
});
