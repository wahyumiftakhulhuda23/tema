import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore Database with designated firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);

// Helper to ensure anonymous auth session if needed
export async function ensureAuthReady() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (err) {
    console.warn('Firebase Auth anonymous login note:', err);
  }
}

// Test connection on boot as required by skill guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'tema_data', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: Client currently offline.');
    }
  }
}

testFirestoreConnection();
