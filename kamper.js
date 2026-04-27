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
    
    // 1. Konverter dato
    const parts = date.split('-'); 
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    
    playerListUl.innerHTML = '<li style="padding: 15px;">Henter tropp...</li>';
    document.getElementById('matchInfoModal').style.display = 'flex';

    // 2. Hent attendance og spillere samtidig
    window.dbOnValue(window.dbRef(window.db, '/'), (snapshot) => {
        const root = snapshot.val();
        if (!root) return;

        const enrolled = root.attendance ? root.attendance[formattedDate] : null;
        const allPlayers = root.players;

        playerListUl.innerHTML = '';
        let count = 0;

        if (enrolled && allPlayers) {
            // Vi går gjennom alle ID-ene som er i kampspesifikk mappe
            Object.entries(enrolled).forEach(([pId, status]) => {
                if (status === 'K') {
                    // VIKTIG: Vi leter etter spilleren uavhengig av om ID-en er lang eller kort
                    // Først sjekker vi om ID-en matcher direkte
                    let player = allPlayers[pId];

                    // Hvis ikke, leter vi i hele spillerlista etter en spiller som har 
                    // denne lange ID-en lagret inni seg (hvis de har det)
                    if (!player) {
                        player = Object.values(allPlayers).find(p => p.id === pId);
                    }

                    if (player) {
                        count++;
                        const li = document.createElement('li');
                        li.style.padding = '10px';
                        li.style.borderBottom = '1px solid #eee';
                        li.innerHTML = `<i class="fa-solid fa-check" style="color:green"></i> ${player.name || player.navn}`;
                        playerListUl.appendChild(li);
                    } else {
                        // NØDLØSNING: Hvis vi fortsatt ikke finner navnet, viser vi at noen er klare
                        count++;
                        const li = document.createElement('li');
                        li.style.padding = '10px';
                        li.innerHTML = `✅ Spiller (ID: ${pId})`;
                        playerListUl.appendChild(li);
                    }
                }
            });
        }

        countBadge.innerText = count;
        if (count === 0) {
            playerListUl.innerHTML = '<li style="padding:20px; text-align:center;">Ingen spillere markert som klare for denne datoen.</li>';
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
