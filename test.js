import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter'); 
const lagFilterSelect = document.getElementById('lagFilterSelect'); 
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let keys = []; 
const valgtÅr = new Date().getFullYear().toString(); // Sjekker automatisk hvilket år vi er i

// HELPER: Sjekker spillerens tilhørighet for sesongen
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

// Live-oppdatering fra Firebase
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    keys = Object.keys(attendanceData).sort((a, b) => {
        const dateA = new Date(getIsoDateFromKey(a, attendanceData));
        const dateB = new Date(getIsoDateFromKey(b, attendanceData));
        return dateA - dateB;
    });
    
    updateYearDropdown(); 
    renderMatrix();
    updateHeroStats(); 
    
    // Økt fra 300 til 600ms for å gi mobilnettlesere nok tid til å rendre ferdig
    setTimeout(scrollToCurrentDate, 600);
});

// Event listener for lagvelgeren i headeren
if (lagFilterSelect) {
    lagFilterSelect.addEventListener('change', () => {
        renderMatrix();
        updateHeroStats();
        // Økt fra 100 til 300ms så filterbytte ikke trigger for tidlig scroll på mobil
        setTimeout(scrollToCurrentDate, 300);
    });
}

// Event listener for årvelgeren
if (monthFilter) {
    monthFilter.addEventListener('change', () => {
        renderMatrix();
        updateHeroStats();
        // Økt fra 100 til 300ms så filterbytte ikke trigger for tidlig scroll på mobil
        setTimeout(scrollToCurrentDate, 300);
    });
}

// --- UPPDATERER TALLENE I HERO-BOKSEN ---
function updateHeroStats() {
    const valgtLag = lagFilterSelect ? lagFilterSelect.value : 'Alle';
    const selectedYear = monthFilter ? monthFilter.value : new Date().getFullYear().toString();

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};
    let antallAktiviteter = 0;

    keys.forEach(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        const aktivitetGruppe = info.gruppe || 'Lag A'; 
        
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 

        const matcherÅr = (parts[0] === selectedYear);
        const matcherLag = (valgtLag === 'Alle' || aktivitetGruppe === valgtLag || aktivitetGruppe === 'Alle');

        if (matcherÅr && matcherLag) {
            antallAktiviteter++;

            Object.entries(players).forEach(([id, p]) => {
                const sData = hentSpillerSesongData(p, valgtÅr);
                const spillerMatcherFilter = sData.status !== 'Passiv' && (valgtLag === 'Alle' || sData.lag === valgtLag);

                if (spillerMatcherFilter) {
                    potentialPoints++;
                    if (dayData[id] === 'K') {
                        totalAttendancePoints++;
                        playerAttendanceCounts[id] = (playerAttendanceCounts[id] || 0) + 1;
                    }
                }
            });
        }
    });

    const topAttendance = Math.max(...Object.values(playerAttendanceCounts), 0);
    const avgPercent = potentialPoints > 0 ? Math.round((totalAttendancePoints / potentialPoints) * 100) : 0;

    const elTotal = document.getElementById('stat-total-events');
    const elAvg = document.getElementById('stat-avg-attendance');
    const elTop = document.getElementById('stat-top-attendance');

    if (elTotal) elTotal.innerText = antallAktiviteter;
    if (elAvg) elAvg.innerText = avgPercent + '%';
    if (elTop) elTop.innerText = topAttendance;
}

// --- GENERERER ÅRENE I DROP-DOWN ---
function updateYearDropdown() {
    if (!monthFilter) return;
    
    const yearsFound = new Set();
    keys.forEach(key => {
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        if (parts.length === 3 && parts[0] !== '1970') {
            yearsFound.add(parts[0]); 
        }
    });

    const sortedYears = Array.from(yearsFound).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear().toString();
    const previousSelection = monthFilter.value;

    let filterHTML = '';
    sortedYears.forEach(year => {
        filterHTML += `<option value="${year}">${year}</option>`;
    });
    
    if (sortedYears.length === 0) {
        filterHTML = `<option value="${currentYear}">${currentYear}</option>`;
    }
    
    monthFilter.innerHTML = filterHTML;

    if (previousSelection && Array.from(monthFilter.options).some(opt => opt.value === previousSelection)) {
        monthFilter.value = previousSelection;
    } else if (yearsFound.has(currentYear)) {
        monthFilter.value = currentYear;
    }
}

function scrollToCurrentDate() {
    if (!scrollContainer) return;
    const today = new Date();
    today.setHours(0,0,0,0);

    const headers = document.querySelectorAll('#attendanceHeader th[data-date]');
    let target = null;

    // Fjern gammel markering først
    headers.forEach(th => th.classList.remove('idag-fokus'));

    for (let th of headers) {
        const thDate = new Date(th.dataset.date);
        if (thDate >= today) {
            target = th;
            break;
        }
    }

    if (!target && headers.length > 0) {
        target = headers[headers.length - 1];
    }

    if (target) {
        // Legger på en klasse så vi kan se hvem den prøver å scrolle til
        target.classList.add('idag-fokus');

        // CSS-trikset som overstyrer alt av sticky-feil på mobil:
        target.scrollIntoView({
            behavior: 'auto', // 'auto' i stedet for 'smooth' fungerer 10 Heck-ganger bedre på mobil
            block: 'nearest',
            inline: 'start'   // 'start' i stedet for 'center' tvinger den til venstrekant (rett ved siden av spillerlisten)
        });
        
        // Siden 'inline: start' legger den helt til venstre under spillerlisten, 
        // dytter vi scrolleren bittelitt tilbake (150px) så den blir synlig:
        scrollContainer.scrollLeft -= 150;
    }
}

// --- RENDERING AV TABELLEN/MATRISEN ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody || !monthFilter || !lagFilterSelect) return;

    const selectedYear = monthFilter.value;
    const valgtLag = lagFilterSelect.value;

    // Filtrer øktene (kolonnene)
    const filteredKeys = keys.filter(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        const aktivitetGruppe = info.gruppe || 'Lag A';
        
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        
        const matcherÅr = (parts[0] === selectedYear);
        const matcherLag = (valgtLag === 'Alle' || aktivitetGruppe === valgtLag || aktivitetGruppe === 'Alle');

        return matcherÅr && matcherLag;
    });

    // Tegn header-raden
    let headerRow = `<tr><th class="name-col">SPILLER</th>`;
    filteredKeys.forEach(key => {
        const info = attendanceData[key]?.info || {};
        const type = info.type || 'Trening';
        const typeClass = type === 'Camp' ? 'day-type-match' : 'day-type-training';
        const isoDate = getIsoDateFromKey(key, attendanceData);
        
        const dParts = isoDate.split('-');
        const datoOverskrift = `${dParts[2]}.${dParts[1]}`;
        
        headerRow += `
            <th data-date="${isoDate}">
                <div class="header-content">
                    <button class="btn-delete-header" onclick="window.deleteDate('${key}')" title="Slett dag">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <span class="header-date">${datoOverskrift}</span>
                    <div class="day-type ${typeClass}">${type}</div>
                </div>
            </th>`;
    });
    headerRow += `</tr>`;
    attendanceHeader.innerHTML = headerRow;

    // Sorter og filtrer spiller-radene rent ALFABETISK
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => {
            const sData = hentSpillerSesongData(p, valgtÅr);
            if (sData.status === 'Passiv') return false;
            if (valgtLag !== 'Alle') return sData.lag === valgtLag;
            return true;
        })
        .map(([id, p]) => {
            const totalCount = filteredKeys.reduce((acc, key) => {
                return acc + (attendanceData[key][id] === 'K' ? 1 : 0);
            }, 0);

            return { id, navn: p.navn, totalCount };
        })
        .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));

    // Tegn radene for hver enkelt spiller
    let bodyHTML = '';
    sortedPlayers.forEach((p) => {
        let row = `<tr>
            <td class="name-col">
                <div class="player-info-wrapper" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="player-name">${p.navn}</span>
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
    
    update(ref(db, `attendance/${key}`), { [pId]: nextStatus }).then(() => {
        updateHeroStats();
    }).catch((error) => {
        console.error('Feil ved oppdatering:', error);
        if (cell) cell.style.opacity = '1';
    });
};

window.deleteDate = (key) => {
    if (confirm(`Vil du slette denne aktiviteten permanent fra systemet?`)) {
        remove(ref(db, `attendance/${key}`));
    }
};

// --- INNSENDING AV NY AKTIVITET ---
attendanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawDate = document.getElementById('eventDate').value; 
    const typeValg = document.getElementById('eventType').value;
    const gruppeValg = document.getElementById('eventGroup').value;
    
    if (!rawDate) return;

    const parts = rawDate.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 

    set(ref(db, `attendance/${formattedDate}/info`), {
        type: typeValg,
        gruppe: gruppeValg,
        timestamp: Date.now()
    }).then(() => {
        if (window.closeAttendanceModal) window.closeAttendanceModal();
    });
});
