// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNlu9v3EpGBgtavoqo0CJfNgI5hw9twdY",
  authDomain: "my-vibe-aa638.firebaseapp.com",
  projectId: "my-vibe-aa638",
  storageBucket: "my-vibe-aa638.firebasestorage.app",
  messagingSenderId: "780105789523",
  appId: "1:780105789523:web:fe0c2aee7edac0ad0f16a6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
