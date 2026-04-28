// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyULE6HGOINM6D8bqBZGbVMaGHAF3RkJg",
    authDomain: "base-49ce3.firebaseapp.com",
    databaseURL: "https://base-49ce3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "base-49ce3",
    storageBucket: "base-49ce3.firebasestorage.app",
    messagingSenderId: "4752321901",
    appId: "1:4752321901:web:089814e4faefbdeff9be64"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Eksporter db slik at andre filer (som index.html) kan bruke den
export { db };
