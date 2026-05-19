import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Endret fra firebase-database
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyULE6HGOINM6D8bqBZGbVMaGHAF3RkJg",
    authDomain: "base-49ce3.firebaseapp.com",
    projectId: "base-49ce3",
    storageBucket: "base-49ce3.firebasestorage.app",
    messagingSenderId: "4752321901",
    appId: "1:4752321901:web:089814e4faefbdeff9be64"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Nå er dette en Firestore-instans!
const auth = getAuth(app);

export { db, auth };
