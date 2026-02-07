import admin from "firebase-admin";

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function readServiceAccount(): ServiceAccountJson {
  // Option A (recommandée): JSON complet encodé en base64
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json) as ServiceAccountJson;
  }

  // Option B: variables séparées
  const project_id = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const client_email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const private_key_raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!project_id || !client_email || !private_key_raw) {
    throw new Error(
      "Firebase Admin non configuré. Définissez FIREBASE_ADMIN_CREDENTIALS_B64 ou (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).",
    );
  }

  // La clé privée arrive souvent avec des \n
  const private_key = private_key_raw.replace(/\\n/g, "\n");

  return { project_id, client_email, private_key };
}

export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  const sa = readServiceAccount();
  const storageBucketRaw = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  let storageBucket = storageBucketRaw?.trim()?.replace(/^gs:\/\//, "");
  if (storageBucket) {
    const slashIdx = storageBucket.indexOf("/");
    if (slashIdx >= 0) storageBucket = storageBucket.slice(0, slashIdx);
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    ...(storageBucket ? { storageBucket } : {}),
  });

  return admin.app();
}

export function getFirebaseAdminAuth(): admin.auth.Auth {
  return getFirebaseAdminApp().auth();
}
