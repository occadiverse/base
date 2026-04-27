// --- FORBEDRET SKY-SYNKRONISERING ---
    if (window.dbOnValue && window.dbRef && window.db) {
        console.log("Starter lytter på sky-data...");
        
        const attRef = window.dbRef(window.db, 'attendance/');
        window.dbOnValue(attRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("Nye data mottatt fra Firebase!", data);
                
                // Vi må "pakke ut" dataene fra skyen og legge dem i localStorage
                // Data-strukturen er: år -> måned -> spillerId -> dag -> status
                Object.keys(data).forEach(year => {
                    Object.keys(data[year]).forEach(month => {
                        Object.keys(data[year][month]).forEach(pId => {
                            Object.keys(data[year][month][pId]).forEach(day => {
                                const status = data[year][month][pId][day];
                                const storageKey = `att-base-${year}-${month}-${pId}-${day}`;
                                localStorage.setItem(storageKey, status);
                            });
                        });
                    });
                });

                // Tving tabellen til å tegne seg på nytt med de ferske dataene
                if (typeof renderAttendanceTable === 'function') {
                    renderAttendanceTable();
                }
            }
        });
    }
