window.updateDynamicSelectors = function() {
    const filterSelect = document.getElementById('lagFilterSelect');
    const kamperFilterSelect = document.getElementById('kamperLagFilterSelect');
    const formSelect = document.getElementById('matchGroup');
    const playerTeamSelect = document.getElementById('playerTeamInput');
    const eventTeamSelect = document.getElementById('eventTeam');
    const activityTeamSelect = document.getElementById('activityTeam');

    if (filterSelect) filterSelect.innerHTML = `<option value="Alle">ALLE LAG</option>`;
    if (kamperFilterSelect) kamperFilterSelect.innerHTML = `<option value="Alle">ALLE LAG</option>`;
    if (formSelect) formSelect.innerHTML = '';
    if (playerTeamSelect) playerTeamSelect.innerHTML = '';
    if (eventTeamSelect) eventTeamSelect.innerHTML = '';
    if (activityTeamSelect) activityTeamSelect.innerHTML = '';

    const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];
    teams.forEach(t => {
        if (filterSelect) {
            const optFilter = document.createElement('option');
            optFilter.value = t.name;
            optFilter.innerText = t.name.toUpperCase();
            filterSelect.appendChild(optFilter);
        }

        if (kamperFilterSelect) {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.innerText = t.name.toUpperCase();
            kamperFilterSelect.appendChild(opt);
        }

        if (formSelect) {
            const optForm = document.createElement('option');
            optForm.value = t.name;
            optForm.innerText = t.name;
            formSelect.appendChild(optForm);
        }

        if (playerTeamSelect) {
            const optPlayer = document.createElement('option');
            optPlayer.value = t.name;
            optPlayer.innerText = t.name;
            playerTeamSelect.appendChild(optPlayer);
        }

        if (eventTeamSelect) {
            const optEvent = document.createElement('option');
            optEvent.value = t.name;
            optEvent.innerText = t.name;
            eventTeamSelect.appendChild(optEvent);
        }

        if (activityTeamSelect) {
            const optAct = document.createElement('option');
            optAct.value = t.name;
            optAct.innerText = t.name;
            activityTeamSelect.appendChild(optAct);
        }
    });
};

window.renderAdminTeamsList = function() {
    const listContainer = document.getElementById('admin-teams-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];

    if (teams.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-2 py-8 text-center text-slate-400 text-xs italic bg-slate-50 border border-dashed rounded-xl">
                Ingen lag opprettet ennå. Klikk på "Opprett nytt lag" for å begynne.
            </div>
        `;
        return;
    }

    teams.forEach(t => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-bsk-blueLight transition";
        card.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <h4 class="font-extrabold text-bsk-blue text-base">${t.name}</h4>
                    <div class="flex gap-1">
                        <button onclick="openTeamModal('${t.id}')" class="text-slate-500 hover:text-bsk-blue p-1" title="Rediger"><i class="fa-solid fa-pen-to-square text-sm"></i></button>
                        <button onclick="promptDeleteTeam('${t.id}')" class="text-slate-400 hover:text-rose-600 p-1" title="Slett"><i class="fa-solid fa-trash text-sm"></i></button>
                    </div>
                </div>
                <div class="space-y-1 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                    <p><strong class="text-slate-800">Trener:</strong> ${t.coachName || 'Uoppgitt'}</p>
                    <p><strong class="text-slate-800">Kontaktinfo:</strong> ${t.coachContact || 'Uoppgitt'}</p>
                </div>
                <p class="text-xs text-slate-500 italic line-clamp-2">${t.description || 'Ingen lagbeskrivelse.'}</p>
            </div>
        `;
        listContainer.appendChild(card);
    });
};

window.handleTeamFilterChange = function() {
    window.renderPlayerRoster();
    recalculateOppmoteAndKjemi();
};

window.renderPlayerRoster = function() {
    const tableBody = document.getElementById('playerTableBody');
    if (!tableBody) return;

    const filterLagEl = document.getElementById('lagFilterSelect');
    const filterLag = filterLagEl ? filterLagEl.value : 'Alle';
    const players = Array.isArray(window.activePlayers) ? window.activePlayers : [];
    const filteredPlayers = players.filter(p => filterLag === 'Alle' || p.spillerLag === filterLag);
    const currentYear = new Date().getFullYear();
    let totalAge = 0;
    let countRekrutt = 0;

    filteredPlayers.forEach(p => {
        const age = currentYear - parseInt(p.fodselsaar || 2000);
        totalAge += age;
        if (p.status === 'Rekrutt') countRekrutt++;
    });

    const avgAge = filteredPlayers.length > 0 ? (totalAge / filteredPlayers.length).toFixed(1) : 0;
    const statPlayersEl = document.getElementById('stat-total-players');
    const statAvgAgeEl = document.getElementById('stat-avg-age');
    const statRekruttEl = document.getElementById('stat-total-rekrutt');

    if (statPlayersEl) statPlayersEl.innerText = `${filteredPlayers.length} spillere`;
    if (statAvgAgeEl) statAvgAgeEl.innerText = `${avgAge} år`;
    if (statRekruttEl) statRekruttEl.innerText = `${countRekrutt} rekrutter`;

    tableBody.innerHTML = '';

    if (filteredPlayers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400"><i class="fa-solid fa-users text-4xl mb-2 block text-slate-200"></i>Ingen spillere funnet i dette laget.</td></tr>`;
        return;
    }

    const sorted = [...filteredPlayers].sort((a, b) => a.navn.localeCompare(b.navn));
    sorted.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/70 transition-all border-b border-slate-100";

        const age = currentYear - parseInt(p.fodselsaar || 2000);
        const jersey = p.draktnummer ? `#${p.draktnummer}` : '-';
        const posStr = p.pos2 && p.pos2 !== '-' ? `${p.pos1} / ${p.pos2}` : p.pos1;

        let statusBadge = `<span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">${p.status}</span>`;
        if (p.status === 'Aktiv') statusBadge = `<span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">${p.status}</span>`;
        else if (p.status === 'Rekrutt') statusBadge = `<span class="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">${p.status}</span>`;

        tr.innerHTML = `
            <td class="py-3.5 px-4 md:px-6 font-bold text-slate-900">${p.navn} ${p.isCaptain ? '⚓' : ''}</td>
            <td class="py-3.5 px-4 text-center font-semibold text-slate-600">${jersey}</td>
            <td class="py-3.5 px-4 text-slate-700 font-medium">${posStr}</td>
            <td class="py-3.5 px-4 text-center text-slate-600">${p.fot}</td>
            <td class="py-3.5 px-4 text-center font-bold text-slate-800">${age} år</td>
            <td class="py-3.5 px-4 text-center">${statusBadge}</td>
            <td class="py-3.5 px-6 text-right">
                <div class="flex justify-end gap-1">
                    <button onclick="window.openPlayerModal('${p.id}')" class="text-slate-500 hover:text-bsk-blue p-1.5" title="Rediger"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="promptDeletePlayer('${p.id}')" class="text-slate-400 hover:text-rose-600 p-1.5" title="Slett"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
};

window.openPlayerModal = function(editPlayerId = null) {
    const modal = document.getElementById('playerModal');
    document.getElementById('playerForm').reset();
    document.getElementById('editPlayerId').value = '';
    window.updateDynamicSelectors();

    if (editPlayerId) {
        const pObj = (window.activePlayers || []).find(p => p.id === editPlayerId);
        if (pObj) {
            document.getElementById('playerFormTitle').innerHTML = `<i class="fa-solid fa-user-pen text-bsk-yellow"></i> Rediger Spiller`;
            document.getElementById('editPlayerId').value = pObj.id;
            document.getElementById('playerNameInput').value = pObj.navn;
            document.getElementById('playerJerseyInput').value = pObj.draktnummer || '';
            document.getElementById('playerBirthYearInput').value = pObj.fodselsaar;
            document.getElementById('playerStatusInput').value = pObj.status;
            document.getElementById('playerTeamInput').value = pObj.spillerLag || 'Lag A';
            document.getElementById('playerPos1Input').value = pObj.pos1;
            document.getElementById('playerPos2Input').value = pObj.pos2 || '-';
            document.getElementById('playerFootInput').value = pObj.fot || 'Høyre';
        }
    } else {
        document.getElementById('playerFormTitle').innerHTML = `<i class="fa-solid fa-user-plus text-bsk-yellow"></i> Registrer Ny Spiller`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closePlayerModal = function() {
    document.getElementById('playerModal').classList.add('hidden');
    document.getElementById('playerModal').classList.remove('flex');
};

window.openTeamModal = function(editTeamId = null) {
    const modal = document.getElementById('teamModal');
    document.getElementById('teamForm').reset();
    document.getElementById('editTeamId').value = '';

    if (editTeamId) {
        const team = (window.activeTeams || []).find(t => t.id === editTeamId);
        if (team) {
            document.getElementById('teamModalTitle').innerHTML = `<i class="fa-solid fa-users text-bsk-yellow"></i> Rediger Lag`;
            document.getElementById('editTeamId').value = team.id;
            document.getElementById('teamName').value = team.name;
            document.getElementById('teamCoach').value = team.coachName || '';
            document.getElementById('teamCoachContact').value = team.coachContact || '';
            document.getElementById('teamDesc').value = team.description || '';
        }
    } else {
        document.getElementById('teamModalTitle').innerHTML = `<i class="fa-solid fa-users text-bsk-yellow"></i> Opprett Lag`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeTeamModal = function() {
    document.getElementById('teamModal').classList.add('hidden');
    document.getElementById('teamModal').classList.remove('flex');
};

window.saveTeam = async function(event) {
    event.preventDefault();

    const teamData = {
        id: document.getElementById('editTeamId').value || null,
        name: document.getElementById('teamName').value,
        coachName: document.getElementById('teamCoach').value,
        coachContact: document.getElementById('teamCoachContact').value,
        description: document.getElementById('teamDesc').value
    };

    await window.saveTeamToDatabase(teamData);
    window.closeTeamModal();
    window.updateDynamicSelectors();
    window.renderAdminTeamsList();
};

window.promptDeleteTeam = function(id) {
    window.customConfirm("Slette lag?", "Er du sikker på at du ønsker å slette dette laget permanent?", async () => {
        await window.deleteTeamFromDatabase(id);
        window.updateDynamicSelectors();
        window.renderAdminTeamsList();
    });
};

window.savePlayer = async function(event) {
    event.preventDefault();

    const playerData = {
        id: document.getElementById('editPlayerId').value || null,
        navn: document.getElementById('playerNameInput').value,
        draktnummer: document.getElementById('playerJerseyInput').value ? parseInt(document.getElementById('playerJerseyInput').value) : '',
        fodselsaar: parseInt(document.getElementById('playerBirthYearInput').value),
        status: document.getElementById('playerStatusInput').value,
        spillerLag: document.getElementById('playerTeamInput').value,
        pos1: document.getElementById('playerPos1Input').value,
        pos2: document.getElementById('playerPos2Input').value,
        fot: document.getElementById('playerFootInput').value
    };

    await window.savePlayerToDatabase(playerData);
    window.closePlayerModal();
    window.renderPlayerRoster();
};

window.promptDeletePlayer = function(id) {
    window.customConfirm("Slette spiller?", "Er du sikker på at du vil slette denne spilleren fra troppen permanent?", async () => {
        await window.deletePlayerFromDatabase(id);
        window.renderPlayerRoster();
    });
};
