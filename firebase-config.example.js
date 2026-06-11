// Kopier denne til firestore-config.js eller firestore.config.js og fyll inn dine Firebase-verdier.
// Appen faller tilbake til localStorage hvis config-filen ikke finnes.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
