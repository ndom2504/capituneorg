import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type User,
} from "firebase/auth";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
};

function getFirebaseClientConfig(): FirebaseClientConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      "Firebase config manquante. Définissez NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / APP_ID.",
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }
  cachedApp = initializeApp(getFirebaseClientConfig());
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function getFirebaseErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export async function signInWithGooglePopup(): Promise<{ idToken: string; user: User }> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();

  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const idToken = await user.getIdToken();
  return { idToken, user };
}

export async function startGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();
  await signInWithRedirect(auth, provider);
}

export async function consumeGoogleRedirectResult(): Promise<{ idToken: string; user: User } | null> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  const user = result.user;
  const idToken = await user.getIdToken();
  return { idToken, user };
}

export function shouldFallbackToRedirect(err: unknown): boolean {
  const code = getFirebaseErrorCode(err);
  return (
    code === "auth/popup-blocked" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/operation-not-supported-in-this-environment"
  );
}

export function formatFirebaseAuthError(err: unknown): string {
  const code = getFirebaseErrorCode(err);
  if (code === "auth/operation-not-allowed") {
    return (
      "Opération non autorisée côté Firebase. " +
      "Pour la vérification SMS sur le web, activez le fournisseur Téléphone dans Firebase Authentication → Sign-in method → Phone. " +
      "Vérifiez aussi Authentication → Settings → Authorized domains (localhost/127.0.0.1 + domaine prod)."
    );
  }
  if (code === "auth/invalid-phone-number") {
    return "Numéro invalide. Utilisez le format international E.164 (ex: +15145551234).";
  }
  if (code === "auth/captcha-check-failed" || code === "auth/invalid-app-credential") {
    return (
      "Échec reCAPTCHA. Vérifiez que le domaine actuel est autorisé dans Firebase Authentication → Settings → Authorized domains, " +
      "et que votre clé API Firebase n'est pas restreinte à d'autres domaines dans Google Cloud (API key restrictions)."
    );
  }
  if (code === "auth/too-many-requests") {
    return "Trop de tentatives. Attendez quelques minutes puis réessayez.";
  }
  if (code === "auth/popup-closed-by-user") {
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const handlerUrl = authDomain ? `https://${authDomain}/__/auth/handler` : null;
    return (
      "La fenêtre Google s’est fermée. " +
      "Si elle se ferme immédiatement, autorisez les popups et vérifiez que le domaine actuel est autorisé dans Firebase Auth (localhost / 127.0.0.1). " +
      (handlerUrl
        ? `Si Edge affiche une erreur de certificat (NET::ERR_CERT_AUTHORITY_INVALID) sur ${handlerUrl}, c’est un problème de confiance TLS (proxy/antivirus/certificats Windows), pas un bug de l’application.`
        : "Si Edge affiche une erreur de certificat (NET::ERR_CERT_AUTHORITY_INVALID) sur le handler Firebase, c’est un problème de confiance TLS (proxy/antivirus/certificats Windows), pas un bug de l’application.")
    );
  }
  if (code === "auth/popup-blocked") {
    return "Popup Google bloquée par le navigateur. Autorisez les popups ou utilisez la connexion par redirection.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Domaine non autorisé côté Firebase Auth. Ajoutez ce domaine dans Authentication → Settings → Authorized domains.";
  }
  return err instanceof Error ? err.message : "Connexion Google impossible.";
}

// ============================================================================
// Microsoft (Azure AD)
// ============================================================================

function getMicrosoftProvider() {
  const provider = new OAuthProvider("microsoft.com");
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function signInWithMicrosoftPopup(): Promise<{ idToken: string; user: User }> {
  const auth = getFirebaseAuth();
  const provider = getMicrosoftProvider();

  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const idToken = await user.getIdToken();
  return { idToken, user };
}

export async function startMicrosoftRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = getMicrosoftProvider();
  await signInWithRedirect(auth, provider);
}

export async function consumeMicrosoftRedirectResult(): Promise<{ idToken: string; user: User } | null> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  const user = result.user;
  const idToken = await user.getIdToken();
  return { idToken, user };
}
