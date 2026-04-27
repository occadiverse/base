document.addEventListener('DOMContentLoaded', () => {
    const matchTableBody = document.getElementById('matchTableBody');
    const matchForm = document.getElementById('matchForm');

    // Åpne/Lukke modal for registrering
    window.openMatchModal = () => {
        document.getElementById('modalTitle').innerText = 'Registrer kamp';
        document.getElementById('matchModal').style.display = 'flex';
    };

    window.closeMatchModal = () => {
        document.getElementById('matchModal').style.display = 'none';
        matchForm.reset();
        document.getElementById('editMatchId').value = ''; 
    };

    // --- VIS KAMP-INFO OG SPILLERE ---
    window.showMatchInfo = (id, date, opponent, time, pitch) => {
    const playerListUl = document.getElementById('matchPlayerList');
    const countBadge = document.getElementById('playerCountBadge');
    const detailsDiv = document.getElementById('matchInfoDetails');
    
    // 1. Formater dato til DD.MM.YYYY
    const parts = date.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    
    document.getElementById('infoTitle').innerText = `Kampdetaljer: ${opponent}`;
    detailsDiv.innerHTML = `
        <div style="margin-bottom:5px;"><strong>Dato:</strong> ${formattedDate}</div>
        <div style="margin-bottom:5px;"><strong>Tid:</strong> kl. ${time}</div>
        <div><strong>Bane:</strong> ${pitch}</div>
    `;

    // Vis laste-status
    playerListUl.innerHTML = '<li style="padding: 15px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Sjekker database...</li>';
    countBadge.innerText = '0';
    document.getElementById('matchInfoModal').style.display = 'flex';

    // 2. Hent ALL attendance (vi henter hele for å være sikre på at vi får svar kjapt)
    const attendanceRef = window.dbRef(window.db, 'attendance');
    
    window.dbOnValue(attendanceRef, (snapshot) => {
        const allAttendance = snapshot.val();
        const attendanceForDate = allAttendance ? allAttendance[formattedDate] : null;

        // 3. Hent spillere
        const playersRef = window.dbRef(window.db, 'players');
        window.dbOnValue(playersRef, (playerSnapshot) => {
            const players = playerSnapshot.val();
            playerListUl.innerHTML = '';
            let count = 0;

            if (attendanceForDate && players) {
                // Lag en sortert liste over navn som har status "K"
                const enrolledNames = [];
                
                Object.entries(attendanceForDate).forEach(([pId, status]) => {
                    if (status === 'K' && players[pId]) {
                        enrolledNames.push(players[pId].name);
                    }
                });

                enrolledNames.sort((a, b) => a.localeCompare(b, 'nb'));

                enrolledNames.forEach(name => {
                    count++;
                    const li = document.createElement('li');
                    li.style.padding = '10px 15px';
                    li.style.borderBottom = '1px solid #eee';
                    li.innerHTML = `<i class="fa-solid fa-user-check" style="color: #27ae60; margin-right: 12px;"></i> ${name}`;
                    playerListUl.appendChild(li);
                });
            }

            countBadge.innerText = count;
            if (count === 0) {
                playerListUl.innerHTML = '<li style="padding: 20px; color: #666; text-align: center;">Ingen spillere er markert som klare (K) i oppmøte-fanen for denne datoen.</li>';
            }
        }, { onlyOnce: true });
    }, { onlyOnce: true });
};    
    // Funksjon for å fylle modalen med eksisterende data for redigering
    window.openEditMatch = (id, date, time, opponent, pitch, type, result) => {
        document.getElementById('modalTitle').innerText = 'Rediger kamp';
        document.getElementById('editMatchId').value = id;
        document.getElementById('matchDate').value = date;
        document.getElementById('matchTime').value = time === '--:--' ? '' : time;
        document.getElementById('opponent').value = opponent;
        document.getElementById('pitch').value = pitch === 'Ikke satt' ? '' : pitch;
        document.getElementById('matchType').value = type;
        document.getElementById('result').value = result === '-' ? '' : result;
        
        document.getElementById('matchModal').style.display = 'flex';
    };

    // Lagre eller Oppdatere kamp
    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const matchId = document.getElementById('editMatchId').value;
        const matchData = {
            date: document.getElementById('matchDate').value,
            time: document.getElementById('matchTime').value || '--:--',
            opponent: document.getElementById('opponent').value,
            pitch: document.getElementById('pitch').value || 'Ikke satt',
            type: document.getElementById('matchType').value,
            result: document.getElementById('result').value || '-'
        };

        if (matchId) {
            window.dbSet(window.dbRef(window.db, `matches/${matchId}`), matchData)
                .then(() => { closeMatchModal(); })
                .catch(error => console.error("Feil ved oppdatering:", error));
        } else {
            const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
            window.dbSet(matchRef, matchData)
                .then(() => { closeMatchModal(); })
                .catch(error => console.error("Feil ved lagring:", error));
        }
    });

    // Lese kamper fra Firebase og tegne tabell
    window.dbOnValue(window.dbRef(window.db, 'matches'), (snapshot) => {
        const data = snapshot.val();
        matchTableBody.innerHTML = '';
        
        if (data) {
            const sortedMatches = Object.entries(data).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
            
            sortedMatches.forEach(([id, match]) => {
                const d = new Date(match.date);
                const shortDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });

                const row = `
                    <tr>
                        <td>
                            <div style="font-weight: 600; text-transform: capitalize;">${shortDate}</div>
                            <div style="font-size: 0.85em; color: #666;">kl. ${match.time}</div>
                        </td>
                        <td class="text-left">
                            <span style="font-weight: 700; color: var(--primary-color); cursor: pointer; text-decoration: underline;" 
                                  onclick="showMatchInfo('${id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">
                                ${match.opponent}
                            </span>
                        </td>
                        <td>
                            <div style="display: inline-block; min-width: 60px; text-align: center; background: #f0f2f5; padding: 3px 6px; border-radius: 4px; font-weight: 800; color: var(--primary-color); font-family: 'Courier New', Courier, monospace; font-size: 0.9em;">
                                ${match.result}
                            </div>
                        </td>
                        <td style="font-size: 0.9em; opacity: 0.8;">${match.pitch}</td>
                        <td style="font-size: 0.9em; opacity: 0.8;">${match.type}</td>
                        <td>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button onclick="openEditMatch('${id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="deleteMatch('${id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                matchTableBody.innerHTML += row;
            });
        } else {
            matchTableBody.innerHTML = '<tr><td colspan="6">Ingen kamper registrert</td></tr>';
        }
    });

    window.deleteMatch = (id) => {
        if(confirm('Er du sikker på at du vil slette denne kampen?')) {
            window.dbRemove(window.dbRef(window.db, `matches/${id}`));
        }
    };
});
