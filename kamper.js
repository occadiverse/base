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
    
    // Konverter dato til DD.MM.YYYY
    const parts = date.split('-'); 
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    
    // 1. Overskrift med luft på sidene
    infoTitle.innerText = opponent;
    infoTitle.style.padding = '0 20px'; 
    infoTitle.style.fontSize = '1.8em';
    infoTitle.style.fontWeight = '800';
    infoTitle.style.color = '#222';
    infoTitle.style.marginBottom = '10px';

    // 2. Info-seksjon med ikonene fra menyen (FontAwesome Solid)
    detailsDiv.style.padding = '0 20px';
    detailsDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; color: #555; font-size: 1em; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid fa-calendar-day" style="width: 20px; color: var(--primary-color); font-size: 1.1em;"></i> 
                <span style="font-weight: 500;">${formattedDate} kl. ${time}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid fa-location-dot" style="width: 20px; color: var(--primary-color); font-size: 1.1em;"></i> 
                <span style="font-weight: 500;">${pitch}</span>
            </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-weight: 700; font-size: 1.2em; color: #222;">Påmeldte spillere</span>
            <span id="pilleAntall" style="background: var(--primary-color); color: white; padding: 3px 14px; border-radius: 20px; font-weight: 800; font-size: 0.9em; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">0</span>
        </div>
    `;

    // 3. Spiller-grid med riktig padding
    playerListUl.style.padding = '0 20px 20px 20px'; 
    playerListUl.style.display = 'grid';
    playerListUl.style.gridTemplateColumns = 'repeat(2, 1fr)';
    playerListUl.style.gap = '12px';
    playerListUl.innerHTML = '<div style="grid-column: 1/-1; color:#999;">Henter tropp...</div>';

    document.getElementById('matchInfoModal').style.display = 'flex';

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

        const pille = document.getElementById('pilleAntall');
        if (pille) pille.innerText = list.length;

        if (list.length > 0) {
            list.forEach(name => {
                const item = document.createElement('div');
                item.style.background = '#fff';
                item.style.border = '1px solid #ddd';
                item.style.padding = '14px 5px';
                item.style.borderRadius = '8px';
                item.style.textAlign = 'center';
                item.style.fontWeight = '600';
                item.style.fontSize = '0.95em';
                item.style.color = '#333';
                item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)';
                item.innerText = name;
                playerListUl.appendChild(item);
            });
        } else {
            playerListUl.innerHTML = '<div style="grid-column: 1/-1; color:#999; font-style:italic; padding: 20px 0;">Ingen spillere er påmeldt ennå.</div>';
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
