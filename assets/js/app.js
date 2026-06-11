function customConfirm(title, message, callback) {
            customConfirmCallback = callback;
            document.getElementById('confirmTitle').innerText = title;
            document.getElementById('confirmMessage').innerText = message;
            const modal = document.getElementById('confirmModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        document.getElementById('confirmYesBtn').onclick = function() {
            if (customConfirmCallback) customConfirmCallback();
            closeConfirmModal();
        };

        document.getElementById('confirmNoBtn').onclick = function() {
            closeConfirmModal();
        };

        function closeConfirmModal() {
            const modal = document.getElementById('confirmModal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            customConfirmCallback = null;
        }

        function verifyAdminPin() {
            const input = document.getElementById('adminPinInput').value;
            if (input === '1908') {
                isAdminUnlocked = true;
                document.getElementById('admin-gate').classList.add('hidden');
                document.getElementById('admin-panel-content').classList.remove('hidden');
                renderAdminTeamsList();
            } else {
                document.getElementById('adminPinInput').value = '';
                document.getElementById('adminPinInput').placeholder = "FEIL!";
                document.getElementById('adminPinInput').classList.add('border-rose-500');
                setTimeout(() => {
                    document.getElementById('adminPinInput').placeholder = "••••";
                    document.getElementById('adminPinInput').classList.remove('border-rose-500');
                }, 1500);
            }
        }

        function updateDynamicSelectors() {
            const filterSelect = document.getElementById('lagFilterSelect');
            const kamperFilterSelect = document.getElementById('kamperLagFilterSelect'); // NY
            const formSelect = document.getElementById('matchGroup');
            const playerTeamSelect = document.getElementById('playerTeamInput');
            const eventTeamSelect = document.getElementById('eventTeam');
            const activityTeamSelect = document.getElementById('activityTeam');
            
            if (filterSelect) filterSelect.innerHTML = `<option value="Alle">ALLE LAG</option>`;
            if (kamperFilterSelect) kamperFilterSelect.innerHTML = `<option value="Alle">ALLE LAG</option>`; // NY
            if (formSelect) formSelect.innerHTML = '';
            if (playerTeamSelect) playerTeamSelect.innerHTML = '';
            if (eventTeamSelect) eventTeamSelect.innerHTML = '';
            if (activityTeamSelect) activityTeamSelect.innerHTML = ''; 

            const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];
            teams.forEach(t => {
                if (filterSelect) {
                    const optFilter = document.createElement('option');
                    optFilter.value = t.name; optFilter.innerText = t.name.toUpperCase();
                    filterSelect.appendChild(optFilter);
                }
                if (kamperFilterSelect) {
                const opt = document.createElement('option');
                opt.value = t.name; opt.innerText = t.name.toUpperCase();
                kamperFilterSelect.appendChild(opt);
                }
                if (formSelect) {
                    const optForm = document.createElement('option');
                    optForm.value = t.name; optForm.innerText = t.name;
                    formSelect.appendChild(optForm);
                }
                if (playerTeamSelect) {
                    const optPlayer = document.createElement('option');
                    optPlayer.value = t.name; optPlayer.innerText = t.name;
                    playerTeamSelect.appendChild(optPlayer);
                }
                if (eventTeamSelect) {
                    const optEvent = document.createElement('option');
                    optEvent.value = t.name; optEvent.innerText = t.name;
                    eventTeamSelect.appendChild(optEvent);
                }
                if (activityTeamSelect) {
                    const optAct = document.createElement('option');
                    optAct.value = t.name; optAct.innerText = t.name;
                    activityTeamSelect.appendChild(optAct);
                }
            });
        }

        function renderAdminTeamsList() {
            const listContainer = document.getElementById('admin-teams-list');
            if (!listContainer) return;
            listContainer.innerHTML = '';
            const teams = Array.isArray(window.activeTeams) ? window.activeTeams : [];

            if (teams.length === 0) {
