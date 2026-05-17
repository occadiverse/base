import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const monthFilter = document.getElementById('monthFilter');
const lagFilter = document.getElementById('lagFilter');
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let keys = []; 
const valgtÅr = "2026";
const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

// HELPER: Henter ut lag og status for en spiller i et spesifikt år
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

// Henter live-data fra Firebase root
onValue(ref(db, '/'), (snapshot) => {
    const root = snapshot.val() || {};
    players = root.players || {};
    attendanceData = root.attendance || {};
    
    keys = Object.keys(attendanceData).sort((a, b) => {
        const dateA = new Date(getIsoDateFromKey(a, attendanceData));
        const dateB = new Date(getIsoDateFromKey(b, attendanceData));
        return dateA - dateB;
    });
    
    renderMatrix();
    updateHeroStats(); 
    
    setTimeout(scrollToCurrentDate, 300);
});

// --- DYNAMISK UTREGNING AV STATS BASERT PÅ VALGT FILTER ---
function updateHeroStats() {
    const valgtLag = lagFilter ? lagFilter.value : 'Alle';
    const valgtMåned = monthFilter ? monthFilter.value : 'Alle';

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};
    let antallAktiviteter = 0;

    keys.forEach(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        const aktivitetGruppe = info.gruppe || 'Begge';
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        const aktivitetMåned = parts[1]; // f.eks "05"

        // Sjekk om aktiviteten matcher måned- og lagfilteret
        const matcherMåned = (valgtMåned === 'Alle' || aktivitetMåned === valgtMåned);
        const matcherLag = (valgtLag === 'Alle' || aktivitetGruppe === 'Begge' || aktivitetGruppe === valgtLag);

        if (matcherMåned && matcherLag) {
            antallAktiviteter++;

            Object.entries(players).forEach(([id, p]) => {
                const sData = hentSpillerSesongData(p, valgtÅr);
                
                // Spilleren må være aktiv i klubben, og hvis vi har valgt et spesifikt lagfilter,
                // må spilleren tilhøre det laget for å telles med i statistikken
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

// --- RENDERING AV OPPMØTE-MATRISEN ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody || !monthFilter || !lagFilter) return;

    const valgtMåned = monthFilter.value;
    const valgtLag = lagFilter.value;

    // 1. Filtrer kolonnene (aktivitetene) ut fra lag og måned
    const filteredKeys = keys.filter(key => {
        const dayData = attendanceData[key] || {};
        const info = dayData.info || {};
        const aktivitetGruppe = info.gruppe || 'Begge'; // Gammel data faller tilbake på fellesøkten 'Begge'
        
        const isoDate = getIsoDateFromKey(key, attendanceData);
        const parts = isoDate.split('-'); 
        const aktivitetMåned = parts[1];

        const matcherMåned = (valgtMåned === 'Alle' || aktivitetMåned === valgtMåned);
        const matcherLag = (valgtLag === 'Alle' || aktivitetGruppe === 'Begge' || aktivitetGruppe === valgtLag);

        return matcherMåned && matcherLag;
    });

    // Tegn opp overskriftsraden (Datoer)
    let headerRow = `<tr><th class="name-col">SPILLER</th>`;
    filteredKeys.forEach(key => {
        const info = attendanceData[key]?.info || {};
        const type = info.type || 'Trening';
        
        // Dynamisk stylingklasse basert på aktivitetstype
        let typeClass = 'day-type-training';
        if (type === 'Kamp') typeClass = 'day-type-match';
        if (type === 'Annet') typeClass = 'day-type-other';

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

    // 2. Sorter og filtrer spillerne ALFABETISK i stedet for etter oppmøtepoeng
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => {
            const sData = hentSpillerSesongData(p, valgtÅr);
            if (sData.status === 'Passiv') return false; // Skjul passive spillere
            
            // Hvis vi har valgt et spesifikt lagfilter, vis kun spillerne som tilhører det laget
            if (valgtLag !== 'Alle') return sData.lag === valgtLag;
            return true;
        })
        .map(([id, p]) => {
            // Regner ut oppmøtepoeng (kun innenfor de synlige/filtrerte aktivitetene)
            const totalCount = filteredKeys.reduce((acc, key) => {
                return acc + (attendanceData[key][id] === 'K' ? 1 : 0);
            }, 0);

            return { id, navn: p.navn, totalCount };
        })
        .sort((a, b) => a.navn.localeCompare(b.navn, 'nb')); // Rent alfabetisk sortering

    // Tegn opp radene for spillerne
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

// Globale filterhandlinger koblet til HTML dropdown-menyene
window.filterByMonth = (monthValue) => {
    renderMatrix();
    updateHeroStats();
    setTimeout(scrollToCurrentDate, 100);
};

window.filterByLag = (lagValue) => {
    renderMatrix();
    updateHeroStats();
    setTimeout(scrollToCurrentDate, 100);
};

window.toggleStatus = (key, pId, currentStatus) => {
    const nextStatus = currentStatus === 'K' ? '' : 'K';
    const cell = document.querySelector(`[data-date="${key}"][data-player="${pId}"]`);
    
    if (cell) {
        cell.style.opacity = '0.5';
        cell.style.transform = 'scale(0.9)';
        cell.style.transition = '0.1s';
    }
    
    update(ref(db, `attendance/${key}`), { [pId]: nextStatus }).then(() => {
        updateHeroStats(); // Oppdaterer tallene i heroboksen live når du krysser av folk
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

// --- INNSENDING AV NY AKTIVITET (MED GRUPPE OG TYPE) ---
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
