import { db } from './firebase-config.js';
import { ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const attendanceHeader = document.getElementById('attendanceHeader');
const attendanceBody = document.getElementById('attendanceBody');
const attendanceForm = document.getElementById('attendanceForm');
const periodSelect = document.getElementById('statPeriodSelect');
const lagFilterSelect = document.getElementById('lagFilterSelect');
const scrollContainer = document.querySelector('.table-container');

let players = {};
let attendanceData = {};
let keys = []; 
let temporaryPlayers = new Set(); // Holder på spillere som er hentet inn manuelt i denne økten
let currentLagFilter = localStorage.getItem('currentLagFilter') || 'Alle';

// --- SESONGDATA FOR SPILLER ---
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

// Konverterer DB-nøkkel (DD-MM-YYYY) til standard ISO-streng (YYYY-MM-DD)
function getIsoDateFromKey(key, data) {
    const info = data[key]?.info || {};
    if (info.date) {
        return info.date.includes('-') ? info.date : info.date.split('.').reverse().join('-');
    }
    if (key.includes('-')) {
        const parts = key.split('-');
        if (parts[0].length === 2) { 
            return `${parts[2]}-${parts[1]}-${parts[0]}`; 
        }
    }
    return key; 
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

function processKeys() {
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();

    keys = Object.keys(attendanceData).filter(key => {
        const isoDate = getIsoDateFromKey(key, attendanceData);
        if (!isoDate.startsWith(valgtÅr)) return false;

        const info = attendanceData[key]?.info || {};
        const eventLag = info.lag || 'Felles';

        if (currentLagFilter !== 'Alle' && eventLag !== 'Felles' && eventLag !== currentLagFilter) {
            return false;
        }
        return true;
    }).sort((a, b) => {
        return new Date(getIsoDateFromKey(a, attendanceData)) - new Date(getIsoDateFromKey(b, attendanceData));
    });
    
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
        temporaryPlayers.clear(); // Nullstill midlertidige valg ved lagbytte
        processKeys();
    });
}

// --- DYNAMISK HERO-STATS ---
function updateHeroStats() {
    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();
    const totalEvents = keys.length;

    if (document.getElementById('stat-aar-tekst')) document.getElementById('stat-aar-tekst').innerText = valgtÅr;
    if (document.getElementById('stat-lag-navn')) document.getElementById('stat-lag-navn').innerText = currentLagFilter === 'Alle' ? 'hele troppen' : currentLagFilter;

    if (totalEvents === 0) {
        if (document.getElementById('stat-total-events')) document.getElementById('stat-total-events').innerText = '0';
        if (document.getElementById('stat-avg-attendance')) document.getElementById('stat-avg-attendance').innerText = '0%';
        if (document.getElementById('stat-top-attendance')) document.getElementById('stat-top-attendance').innerText = '0';
        return;
    }

    let totalAttendancePoints = 0;
    let potentialPoints = 0;
    let playerAttendanceCounts = {};

    const relevanteSpillere = Object.entries(players).filter(([id, p]) => {
        const sData = hentSpillerSesongData(p, valgtÅr);
        if (sData.status === 'Passiv') return false;
        
        // Sjekk om spilleren tilhører laget, har hospitert tidligere (Alt A), eller er lagt til nå
        const harOppmøteGjeldendeVisning = keys.some(key => attendanceData[key]?.[id] === 'K');
        const erInnhentetNå = temporaryPlayers.has(id);
        
        if (currentLagFilter !== 'Alle' && sData.lag !== currentLagFilter && !harOppmøteGjeldendeVisning && !erInnhentetNå) {
            return false;
        }
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

    if (document.getElementById('stat-total-events')) document.getElementById('stat-total-events').innerText = totalEvents;
    if (document.getElementById('stat-avg-attendance')) document.getElementById('stat-avg-attendance').innerText = avgPercent + '%';
    if (document.getElementById('stat-top-attendance')) document.getElementById('stat-top-attendance').innerText = topAttendance;
}

// --- AUTO-FOKUS SCROLL ---
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

// --- TEGN TABELL-MATRISEN ---
function renderMatrix() {
    if (!attendanceHeader || !attendanceBody) return;

    let headerRow = `<tr><th class="name-col">SPILLER</th>`;
    
    keys.forEach(key => {
        const info = attendanceData[key]?.info || {};
        const type = info.type || 'Trening';
        const eventLag = info.lag || 'Felles';
        const typeClass = type === 'Kamp' ? 'day-type-match' : 'day-type-training';
        const isoDate = getIsoDateFromKey(key, attendanceData);
        
        const dParts = isoDate.split('-');
        const datoOverskrift = `${dParts[2]}.${dParts[1]}`;
        
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

    const valgtÅr = periodSelect ? periodSelect.value : new Date().getFullYear().toString();

    // 1. Filtrer ut hvilke spillere som skal vises på rader
    const sortedPlayers = Object.entries(players)
        .filter(([id, p]) => {
            const sData = hentSpillerSesongData(p, valgtÅr);
            if (sData.status === 'Passiv') return false;
            
            // Sjekk om spilleren har registrert kryss på minst én av de synlige øktene (Alternativ A)
            const harOppmøteGjeldendeVisning = keys.some(key => attendanceData[key]?.[id] === 'K');
            
            // Sjekk om spilleren nettopp ble valgt fra rullegardinen
            const erInnhentetNå = temporaryPlayers.has(id);

            if (currentLagFilter !== 'Alle' && sData.lag !== currentLagFilter && !harOppmøteGjeldendeVisning && !erInnhentetNå) {
                return false;
            }
            return true;
        })
        .map(([id, p]) => {
            const totalCount = keys.reduce((acc, key) => {
                return acc + (attendanceData[key]?.[id] === 'K' ? 1 : 0);
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
                    <span class="player-name" style="font-weight:600;">${p.navn}</span>
                    <span class="attendance-badge">${p.totalCount}</span>
                </div>
            </td>`;
        
        keys.forEach(key => {
            const dateData = attendanceData[key] || {};
            const status = dateData[p.id] || '';
            row += `<td class="attendance-cell" data-date="${key}" data-player="${p.id}" onclick="window.toggleStatus('${key}', '${p.id}', '${status}')">
                        ${getStatusIcon(status)}
                    </td>`;
        });
        row += `</tr>`;
        bodyHTML += row;
    });

    // 2. NYTT: LEGG TIL HOSPITANT-RADEN HELT NEDERST I SPILLERLISTEN (Alternativ 2)
    if (currentLagFilter !== 'Alle') {
        // Finn alle spillere fra det ANDRE laget som ikke vises i listen allerede
        const tilgjengeligeHospitanter = Object.entries(players).filter(([id, p]) => {
            const sData = hentSpillerSesongData(p, valgtÅr);
            const erAlleredeVist = sortedPlayers.some(sp => sp.id === id);
            return sData.status !== 'Passiv' && sData.lag !== currentLagFilter && !erAlleredeVist;
        }).map(([id, p]) => ({ id, navn: p.navn }));

        if (tilgjengeligeHospitanter.length > 0) {
            bodyHTML += `
                <tr>
                    <td class="name-col" style="background: #ffffff !important; padding: 10px 20px !important;">
                        <div id="hospitantToggleBtn" onclick="window.toggleHospitantList(event)" style="color: var(--bsk-blue); font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; -webkit-tap-highlight-color: transparent;">
                            <i class="fa-solid fa-chevron-right" id="hospitantChevron" style="font-size: 0.75rem; transition: transform 0.2s;"></i> Legg til spiller >
                        </div>
                        <div id="hospitantDropdownList" style="display: none; flex-direction: column; gap: 4px; margin-top: 10px; max-height: 180px; overflow-y: auto; padding-left: 5px;">
                            ${tilgjengeligeHospitanter.map(h => `
                                <div onclick="window.velgHospitant('${h.id}')" style="padding: 8px 10px; background: var(--bg-light); border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: var(--text-main); text-align: left; cursor: pointer; transition: background 0.1s;">
                                    ${h.navn.toUpperCase()}
                                </div>
                            `).join('')}
                        </div>
                    </td>
                    ${keys.map(() => `<td style="background: #fafafa; cursor: not-allowed;"></td>`).join('')}
                </tr>`;
        }
    }

    attendanceBody.innerHTML = bodyHTML;
}

// --- DROPDOWN LOGIKK FOR HOSPITANTER ---
window.toggleHospitantList = (e) => {
    e.stopPropagation();
    const list = document.getElementById('hospitantDropdownList');
    const chevron = document.getElementById('hospitantChevron');
    const btnText = document.getElementById('hospitantToggleBtn');
    
    if (list.style.display === 'none' || list.style.display === '') {
        list.style.display = 'flex';
        chevron.style.transform = 'rotate(90deg)';
        btnText.innerHTML = `<i class="fa-solid fa-chevron-right" id="hospitantChevron" style="font-size: 0.75rem; transform: rotate(90deg);"></i> Velg spiller v`;
    } else {
        list.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
        btnText.innerHTML = `<i class="fa-solid fa-chevron-right" id="hospitantChevron" style="font-size: 0.75rem;"></i> Legg til spiller >`;
    }
};

window.velgHospitant = (spillerId) => {
    temporaryPlayers.add(spillerId); // Legg til i listen over aktive rader for denne økten
    renderMatrix(); // Tegn tabellen på nytt umiddelbart
    updateHeroStats();
};

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
        // Hvis en midlertidig spiller får et kryss, vil Alternativ A overta, men vi beholder ham i temporary for sikkerhets skyld
        if (temporaryPlayers.has(pId) && nextStatus === '') {
            // Hvis man fjerner krysset igjen, og han ikke har flere kryss, kan han renses ut ved neste reload
        }
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

// --- LAGRING AV NY ØKT ---
if (attendanceForm) {
    attendanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawDate = document.getElementById('eventDate').value; 
        const type = document.getElementById('eventType').value; 
        const eventLagValg = document.getElementById('eventLag').value; 
        if (!rawDate) return;

        const parts = rawDate.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 

        set(ref(db, `attendance/${formattedDate}/info`), {
            type: type,
            lag: eventLagValg,
            timestamp: Date.now()
        }).then(() => {
            if (window.closeAttendanceModal) window.closeAttendanceModal();
        });
    });
}
