import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBv8f-s3oHSSM2aShFKrVnxUI4tM8UpywI",
  authDomain: "capituneorg.firebaseapp.com",
  projectId: "capituneorg",
  storageBucket: "capituneorg.firebasestorage.app",
  messagingSenderId: "56121675635",
  appId: "1:56121675635:web:4cf0978982fb24e9553f06",
  measurementId: "G-3V7DRP9EYR"
};

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
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
};
export type { FirebaseUser };