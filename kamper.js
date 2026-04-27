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
        const detailsDiv = document.getElementById('matchInfoDetails');
        const playerListUl = document.getElementById('matchPlayerList');
        const countBadge = document.getElementById('playerCountBadge');
        
        // --- KONVERTERING AV DATO ---
        // Gjør om "2026-04-29" til "29.4.2026"
        const dateParts = date.split('-');
        const day = parseInt(dateParts[2]);
        const month = parseInt(dateParts[1]);
        const year = dateParts[0];
        const formattedDateForAttendance = `${day}.${month}.${year}`;
        
        console.log("Søker i oppmøte med dato:", formattedDateForAttendance);

        document.getElementById('infoTitle').innerText = `Kampdetaljer: ${opponent}`;
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Dato:</strong> ${formattedDateForAttendance}</div>
            <div style="margin-bottom: 5px;"><strong>Tid:</strong> kl. ${time}</div>
            <div><strong>Bane:</strong> ${pitch}</div>
        `;

        playerListUl.innerHTML = '<li style="padding: 10px;">Laster spillerliste...</li>';
        document.getElementById('matchInfoModal').style.display = 'flex';

        // 1. Hent oppmøte-data ved hjelp av den formaterte datoen
        window.dbOnValue(window.dbRef(window.db, `attendance/${formattedDateForAttendance}`), (snapshot) => {
            const attendanceData = snapshot.val();
            
            // 2. Hent spiller-navn
            window.dbOnValue(window.dbRef(window.db, 'players'), (playerSnapshot) => {
                const players = playerSnapshot.val();
                playerListUl.innerHTML = '';
                let count = 0;

                if (attendanceData && players) {
                    const playerEntries = Object.entries(players).sort((a, b) => a[1].name.localeCompare(b[1].name));
                    
                    playerEntries.forEach(([playerId, playerInfo]) => {
                        // Sjekker om status er "K"
                        if (attendanceData[playerId] === 'K') {
                            count++;
                            const li = document.createElement('li');
                            li.style.padding = '10px 15px';
                            li.style.borderBottom = '1px solid #eee';
                            li.style.display = 'flex';
                            li.style.alignItems = 'center';
                            li.innerHTML = `<i class="fa-solid fa-user-check" style="color: #27ae60; margin-right: 12px;"></i> ${playerInfo.name}`;
                            playerListUl.appendChild(li);
                        }
                    });
                }

                countBadge.innerText = count;
                if (count === 0) {
                    playerListUl.innerHTML = `
                        <li style="padding: 20px; color: #666; text-align: center;">
                            Ingen spillere er markert med "K" for datoen ${formattedDateForAttendance}.
                        </li>`;
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

    // Lese kamper fra Firebase
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
                            <div style="
                                display: inline-block;
                                min-width: 60px; 
                                text-align: center; 
                                background: #f0f2f5; 
                                padding: 3px 6px; 
                                border-radius: 4px; 
                                font-weight: 800; 
                                color: var(--primary-color);
                                font-family: 'Courier New', Courier, monospace;
                                font-size: 0.9em; 
                            ">
                                ${match.result}
                            </div>
                        </td>
                        <td style="font-size: 0.9em; opacity: 0.8;">${match.pitch}</td>
                        <td style="font-size: 0.9em; opacity: 0.8;">${match.type}</td>
                        <td>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button onclick="openEditMatch('${id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" 
                                        style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="deleteMatch('${id}')" 
                                        style="background:none; border:none; color:#e74c3c; cursor:pointer;">
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
