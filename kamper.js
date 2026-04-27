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
        
        // Konverter 2026-04-29 (fra input) til 29-04-2026 (for Firebase)
        const parts = date.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        
        document.getElementById('infoTitle').innerText = `Kamp: ${opponent}`;
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Dato:</strong> ${formattedDate.replace(/-/g, '.')}</div>
            <div style="margin-bottom: 5px;"><strong>Tid:</strong> kl. ${time}</div>
            <div><strong>Bane:</strong> ${pitch}</div>
        `;

        playerListUl.innerHTML = '<li style="padding: 15px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Henter tropp...</li>';
        document.getElementById('matchInfoModal').style.display = 'flex';

        // Hent data fra den lovlige mappen (med bindestrek)
        const attendanceRef = window.dbRef(window.db, `attendance/${formattedDate}`);
        const playersRef = window.dbRef(window.db, 'players');

        // Vi henter data én gang (dbGet) for å være raske og effektive
        window.dbOnValue(attendanceRef, (snap) => {
            const enrolled = snap.val(); 
            
            window.dbOnValue(playersRef, (pSnap) => {
                const allPlayers = pSnap.val();
                playerListUl.innerHTML = '';
                let count = 0;

                if (enrolled && allPlayers) {
                    // Finn alle som har status "K"
                    const list = [];
                    Object.entries(enrolled).forEach(([pId, status]) => {
                        if (status === 'K' && allPlayers[pId]) {
                            list.push(allPlayers[pId].name);
                        }
                    });

                    // Sorter navnene
                    list.sort((a, b) => a.localeCompare(b, 'nb'));

                    list.forEach(name => {
                        count++;
                        const li = document.createElement('li');
                        li.style.padding = '12px 15px';
                        li.style.borderBottom = '1px solid #eee';
                        li.style.display = 'flex';
                        li.style.alignItems = 'center';
                        li.innerHTML = `<i class="fa-solid fa-user-check" style="color: #27ae60; margin-right: 12px;"></i> ${name}`;
                        playerListUl.appendChild(li);
                    });
                }

                countBadge.innerText = count;
                if (count === 0) {
                    playerListUl.innerHTML = '<li style="padding:25px; text-align:center; color:#888;">Ingen spillere er markert som klare (K) i oppmøte-fanen ennå.</li>';
                }
            }, { onlyOnce: true });
        }, { onlyOnce: true });
    };

    // --- REDIGERING OG SLETTING (Standard funksjonalitet) ---
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
            window.dbSet(window.dbRef(window.db, `matches/${matchId}`), matchData).then(() => closeMatchModal());
        } else {
            const matchRef = window.dbPush(window.dbRef(window.db, 'matches'));
            window.dbSet(matchRef, matchData).then(() => closeMatchModal());
        }
    });

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
                        <td><div style="font-weight:600;">${shortDate}</div><div style="font-size:0.8em; color:#666;">kl. ${match.time}</div></td>
                        <td class="text-left"><span style="font-weight:700; color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="showMatchInfo('${id}', '${match.date}', '${match.opponent}', '${match.time}', '${match.pitch}')">${match.opponent}</span></td>
                        <td><div style="background:#f0f2f5; padding:3px 8px; border-radius:4px; font-weight:800;">${match.result}</div></td>
                        <td style="font-size:0.9em; opacity:0.8;">${match.pitch}</td>
                        <td style="font-size:0.9em; opacity:0.8;">${match.type}</td>
                        <td>
                            <button onclick="openEditMatch('${id}', '${match.date}', '${match.time}', '${match.opponent}', '${match.pitch}', '${match.type}', '${match.result}')" style="background:none; border:none; color:var(--primary-color); cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="deleteMatch('${id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`;
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
