import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter'); // Beholder referansen til HTML-elementet
const lagFilterSelect = document.getElementById('lagFilterSelect'); // Henter den nye ID-en fra headeren
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let keys = []; 
const valgtÅr = new Date().getFullYear().toString(); //  sjekker hvilket år det er nå

// HELPER: Sjekker spillerens tilhørighet for sesongen 2026
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
    
    updateYearDropdown(); // OPPDATERT: Genererer årstall i stedet for måneder
    renderMatrix();
    updateHeroStats(); 
    
    setTimeout(scrollToCurrentDate, 300);
});

// Event listener for den nye lagvelgeren i headeren
if (lagFilterSelect) {
    lagFilterSelect.addEventListener('change', () => {
        renderMatrix();
        updateHeroStats();
        setTimeout(scrollToCurrentDate, 100);
    });
}

// Event listener for årvelgeren (bruker eksisterende HTML-element)
if (monthFilter) {
    monthFilter.addEventListener('change', () => {
        renderMatrix();
        updateHeroStats();
        setTimeout(scrollToCurrentDate, 100);
    });
}

// --- UPPDATERER TALLENE I HERO-BOKSEN ---
function updateHeroStats() {
    const valgtLag = lagFilterSelect ? lagFilterSelect.value : 'Alle';
    // OPPDATERT: Henter det valgte året fra dropdownen, setter inneværende år som fallback
    const selectedYear = monthFilter ? monthFilter.value : new Date().getFullYear().toString();

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};
    let antallAktiviteter = 0;

    keys.forEach(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        
        // OPPDATERT FALLBACK: Gammel historikk uten merking tolkes som 'Lag A'
        const aktivitetGruppe = info.gruppe || 'Lag A'; 
        
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); // parts[0] er årstallet (yyyy)

        // OPPDATERT: Sjekker om økten tilhører det valgte året
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

// --- GENERERER ÅRENE I DROP-DOWN (OPPDATERT) ---
function updateYearDropdown() {
    if (!monthFilter) return;
    
    const yearsFound = new Set();
    keys.forEach(key => {
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        if (parts.length === 3 && parts[0] !== '1970') {
            yearsFound.add(parts[0]); // Samler kun unike årstall (f.eks. "2026")
        }
    });

    // Sorterer årene kronologisk med nyeste år først
    const sortedYears = Array.from(yearsFound).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear().toString();
    const previousSelection = monthFilter.value;

    let filterHTML = '';
    sortedYears.forEach(year => {
        filterHTML += `<option value="${year}">SESONGEN ${year}</option>`;
    });
    
    // Fallback hvis databasen skulle være helt tom under oppstart
    if (sortedYears.length === 0) {
        filterHTML = `<option value="${currentYear}">SESONGEN ${currentYear}</option>`;
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

// --- RENDERING AV TABELLEN/MATRISEN ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody || !monthFilter || !lagFilterSelect) return;

    // OPPDATERT: selectedYear inneholder nå årstallet (f.eks. "2026")
    const selectedYear = monthFilter.value;
    const valgtLag = lagFilterSelect.value;

    // Filtrer øktene (kolonnene)
    const filteredKeys = keys.filter(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        
        // OPPDATERT FALLBACK: Hvis økten mangler gruppe (gammel historikk), tolker vi den som 'Lag A'
        const aktivitetGruppe = info.gruppe || 'Lag A';
        
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); // parts[0] er årstallet (yyyy)
        
        // OPPDATERT: Sjekker om øktens årstall matcher det valgte året i dropdownen
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

// --- INNSENDING AV NY AKTIVITET (MED NYTT TYPE- OG GRUPPEVALG) ---
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
