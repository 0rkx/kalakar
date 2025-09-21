// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase project configuration - Use environment variables
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const functions = getFunctions(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Using production Firebase services
console.log('🔥 Using production Firebase services');

// Check if the Firebase configuration is missing
const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

// Firebase service exports
export { 
  app,
  functions, 
  db, 
  storage, 
  auth,
  isFirebaseConfigured 
};
