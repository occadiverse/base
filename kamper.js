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
    const infoTitle = document.getElementById('infoTitle');
    const detailsDiv = document.getElementById('matchInfoDetails');
    
    const parts = date.split('-'); 
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    
    // 1. Sett hovedtittel til motstanderen
    infoTitle.innerText = opponent;
    infoTitle.style.fontSize = '1.5em';
    infoTitle.style.fontWeight = '800';

    // 2. Lag et pent info-felt under tittelen
    detailsDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 20px; color: #555; font-size: 0.95em; border-bottom: 2px solid #eee; padding-bottom: 15px;">
            <div><i class="fa-regular fa-calendar"></i> ${formattedDate} kl. ${time}</div>
            <div><i class="fa-solid fa-location-dot"></i> ${pitch}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 1.1em; color: var(--primary-color);">Påmeldte spillere</h3>
            <span id="playerCountBadgeNew" style="background: var(--primary-color); color: white; padding: 3px 12px; border-radius: 12px; font-weight: 700; font-size: 0.9em;">0</span>
        </div>
    `;

    // 3. Klargjør spillerlisten (Grid-oppsett)
    playerListUl.style.display = 'grid';
    playerListUl.style.gridTemplateColumns = 'repeat(2, 1fr)'; // To kolonner
    playerListUl.style.gap = '8px';
    playerListUl.style.padding = '0';
    playerListUl.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px;">Henter tropp...</div>';

    document.getElementById('matchInfoModal').style.display = 'flex';

    // 4. Hent data fra Firebase
    window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
        const root = snapshot.val();
        const enrolled = root.attendance ? root.attendance[`${parts[2]}-${parts[1]}-${parts[0]}`] : null;
        const allPlayers = root.players;

        playerListUl.innerHTML = '';
        let list = [];

        if (enrolled && allPlayers) {
            Object.entries(enrolled).forEach(([pId, status]) => {
                if (status === 'K') {
                    let player = allPlayers[pId] || Object.values(allPlayers).find(p => p.id === pId);
                    if (player) list.push(player.name || player.navn);
                }
            });
            list.sort((a, b) => a.localeCompare(b, 'nb'));
        }

        // Oppdater antall-merket
        const badge = document.getElementById('playerCountBadgeNew');
        if (badge) badge.innerText = list.length;

        // 5. Tegn spillerkortene
        if (list.length > 0) {
            list.forEach(name => {
                const item = document.createElement('div');
                item.style.background = '#f9f9f9';
                item.style.border = '1px solid #e0e0e0';
                item.style.padding = '10px 5px';
                item.style.borderRadius = '4px';
                item.style.textAlign = 'center';
                item.style.fontSize = '0.95em';
                item.style.fontWeight = '500';
                item.style.color = '#222';
                item.innerText = name;
                playerListUl.appendChild(item);
            });
        } else {
            playerListUl.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:30px; color:#999; font-style:italic;">Ingen spillere er påmeldt ennå.</div>';
        }
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
