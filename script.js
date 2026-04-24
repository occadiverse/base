// --- 1. INITIALISERING OG DATA-STRUKTUR ---

// Henter data fra localStorage hvis det finnes, ellers starter vi med tomme lister
let state = {
    names: [],
    dates: [],
    attendance: {} // Nøkkelformat: "Navn|Dato" -> true/false
};

// Denne funksjonen kjører med en gang filen lastes
function init() {
    const savedData = localStorage.getItem('oppmoteData');
    if (savedData) {
        state = JSON.parse(savedData);
    }
    renderTable();
}

// Lagrer nåværende state til maskinen
function saveData() {
    localStorage.setItem('oppmoteData', JSON.stringify(state));
}


// --- 2. MENY-STYRING ---

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openBtn');
    
    // Legger til eller fjerner "collapsed" klassen i CSS
    sidebar.classList.toggle('collapsed');
    
    // Viser eller skjuler hamburger-knappen i topplinjen
    if (sidebar.classList.contains('collapsed')) {
        openBtn.style.display = 'block';
    } else {
        openBtn.style.display = 'none';
    }
}


// --- 3. LOGIKK FOR Å LEGGE TIL DATA ---

function addName() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (name) {
        if (!state.names.includes(name)) {
            state.names.push(name);
            saveData();
            renderTable();
            nameInput.value = ''; // Tømmer feltet
        } else {
            alert("Dette navnet finnes allerede.");
        }
    }
}

function addDate() {
    const dateInput = document.getElementById('dateInput');
    const date = dateInput.value;
    
    if (date) {
        if (!state.dates.includes(date)) {
            state.dates.push(date);
            // Sorterer datoene slik at den nyeste kommer sist (eller først om du vil)
            state.dates.sort(); 
            saveData();
            renderTable();
        } else {
            alert("Denne datoen er allerede lagt til.");
        }
    }
}

function toggleAttendance(name, date, checked) {
    const key = `${name}|${date}`;
    state.attendance[key] = checked;
    saveData();
}

function clearData() {
    if (confirm("Er du sikker på at du vil slette alt? All historikk vil forsvinne.")) {
        state = { names: [], dates: [], attendance: {} };
        saveData();
        renderTable();
    }
}


// --- 4. VISUALISERING (TEGNE TABELLEN) ---

function renderTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    // Nullstiller tabellen før vi tegner den på nytt
    thead.innerHTML = '<th>Navn / Dato</th>';
    tbody.innerHTML = '';

    // Legg til dato-overskrifter
    state.dates.forEach(date => {
        const th = document.createElement('th');
        // Formaterer datoen til DD.MM (f.eks 24.04)
        const d = new Date(date);
        th.textContent = d.toLocaleDateString('no-NO', { day: '2.digit', month: '2.digit' });
        thead.appendChild(th);
    });

    // Legg til rader for hver person
    state.names.forEach(name => {
        const tr = document.createElement('tr');
        
        // Første kolonne: Navnet
        const tdName = document.createElement('td');
        tdName.textContent = name;
        tr.appendChild(tdName);

        // Kolonner for hver dato: Checkbox
        state.dates.forEach(date => {
            const td = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            
            // Sjekk om personen var tilstede
            const key = `${name}|${date}`;
            if (state.attendance[key]) {
                cb.checked = true;
            }

            cb.onchange = () => toggleAttendance(name, date, cb.checked);
            
            td.appendChild(cb);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// Starter appen
init();
