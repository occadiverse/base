window.showMatchInfo = (id, date, opponent, time, pitch) => {
    const detailsDiv = document.getElementById('matchInfoDetails');
    const playerListUl = document.getElementById('matchPlayerList');
    const countBadge = document.getElementById('playerCountBadge');
    
    // --- KONVERTERING TIL STRENG DATO (DD.MM.YYYY) ---
    // Dette gjør om "2026-04-29" til "29.04.2026"
    const [year, month, day] = date.split('-');
    const formattedDateForAttendance = `${day}.${month}.${year}`;
    
    console.log("Søker i database-mappe:", `attendance/${formattedDateForAttendance}`);

    document.getElementById('infoTitle').innerText = `Kampdetaljer: ${opponent}`;
    detailsDiv.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>Dato:</strong> ${formattedDateForAttendance}</div>
        <div style="margin-bottom: 5px;"><strong>Tid:</strong> kl. ${time}</div>
        <div><strong>Bane:</strong> ${pitch}</div>
    `;

    playerListUl.innerHTML = '<li style="padding: 10px;">Laster spillerliste...</li>';
    document.getElementById('matchInfoModal').style.display = 'flex';

    // 1. Hent oppmøte-data
    window.dbOnValue(window.dbRef(window.db, `attendance/${formattedDateForAttendance}`), (snapshot) => {
        const attendanceData = snapshot.val();
        
        // 2. Hent spiller-navn
        window.dbOnValue(window.dbRef(window.db, 'players'), (playerSnapshot) => {
            const players = playerSnapshot.val();
            playerListUl.innerHTML = '';
            let count = 0;

            if (attendanceData && players) {
                // Sorter spillere alfabetisk på navn
                const playerEntries = Object.entries(players).sort((a, b) => a[1].name.localeCompare(b[1].name));
                
                playerEntries.forEach(([playerId, playerInfo]) => {
                    // Sjekker om denne spesifikke spilleren har status "K" på denne datoen
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
