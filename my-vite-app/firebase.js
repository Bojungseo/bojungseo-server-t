// src/firebase.js
import { initializeApp } from "firebase/app";       // Firebase 앱 초기화
import { getFirestore } from "firebase/firestore";  // Firestore DB
import { getAuth } from "firebase/auth";           // 인증(Auth) 기능

// Vite 환경변수 사용
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore DB 객체 export
export const db = getFirestore(app);

// Firebase Auth 객체 export
export const auth = getAuth(app);
