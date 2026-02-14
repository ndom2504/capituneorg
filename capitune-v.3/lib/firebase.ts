import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const requiredFirebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
] as const;

const missingFirebaseKeys = requiredFirebaseKeys.filter(
  (key) => !firebaseConfig[key],
);

if (missingFirebaseKeys.length) {
  // Fail fast with a helpful message instead of Firebase's generic auth/invalid-api-key.
  // This typically happens in Vercel when env vars are not set for the project.
  // eslint-disable-next-line no-console
  console.error(
    `[Capitune] Configuration Firebase manquante: ${missingFirebaseKeys.join(
      ", ",
    )}. Configure les variables VITE_FIREBASE_* sur Vercel (Project Settings → Environment Variables).`,
  );
}

// Initialisation unique et sécurisée
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

googleProvider.setCustomParameters({ prompt: 'select_account' });
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  auth, 
  googleProvider, 
  microsoftProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
};
export type { FirebaseUser };