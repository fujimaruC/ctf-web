// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCiwwfRG-YNvczeBBg93GtuxR2uYBoWck",
  authDomain: "ctf-daily.firebaseapp.com",
  projectId: "ctf-daily",
  storageBucket: "ctf-daily.firebasestorage.app",
  messagingSenderId: "513878659657",
  appId: "1:513878659657:web:4e6c59a9d76f784a48e598",
  measurementId: "G-1VY7EK4ZBM"
};

// Initialize Firebase
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === "failed-precondition") {
    console.warn("Multiple tabs open, persistence disabled");
  } else if (err.code === "unimplemented") {
    console.warn("Browser doesn't support persistence");
  }
});