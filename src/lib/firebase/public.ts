import "server-only";

// Firebase Web SDK app instance for server-side, *unauthenticated* reads of publicly-readable
// Firestore data (published posts, public profile fields) — the same data firestore.rules already
// exposes to anyone via `allow get, list: if true` / `if resource.data.status == 'published'`.
//
// This deliberately does NOT use firebase-admin. Admin credentials only make sense when you need
// to bypass security rules or call privileged Auth Admin APIs (see functions/src/index.ts for the
// two places that's actually true — email verification). Server Components reading public data
// don't need that: the plain client SDK enforces the same rules a browser would, which is exactly
// what we want here, and it needs no service-account key at all, locally or once deployed.
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const APP_NAME = "nanuda-public-server";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let dbInstance: Firestore | null = null;

export function getPublicDb(): Firestore {
  if (dbInstance) return dbInstance;

  const existing = getApps().find((a) => a.name === APP_NAME);
  const app = existing ?? initializeApp(firebaseConfig, APP_NAME);

  try {
    // Node's fetch-based networking doesn't support the browser XHR streaming semantics the
    // default WebChannel transport expects; long-polling auto-detection is Firebase's documented
    // fix for using the Web SDK outside a browser (Server Components, scripts, etc).
    dbInstance = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    // Firestore was already initialized for this app (e.g. dev-mode HMR re-evaluating this
    // module) — reuse the existing instance instead of throwing.
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}
