import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyDKnLzUkP74lkrVoGKxSjD-tjuvmgplvco",
  authDomain: "newbillwhsales.firebaseapp.com",
  databaseURL: "https://newbillwhsales-default-rtdb.firebaseio.com",
  projectId: "newbillwhsales",
  storageBucket: "newbillwhsales.firebasestorage.app",
  messagingSenderId: "407110831342",
  appId: "1:407110831342:web:0c7ef31aacefbc5aa8b7ff"
};

// Retrieve config from localStorage if custom configured, otherwise use default
const getSavedConfig = () => {
  try {
    const saved = localStorage.getItem('firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse saved firebase config", e);
  }
  return null;
};

export const firebaseConfig = getSavedConfig() || defaultFirebaseConfig;

// Check if we are running with default configuration or user override
const isPlaceholder = firebaseConfig.apiKey.startsWith("YOUR_");

let app;
let auth: any = null;
let rtdb: any = null;

if (!isPlaceholder) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    rtdb = getDatabase(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const isMockMode = isPlaceholder || !auth || !rtdb;
export { auth, rtdb };

