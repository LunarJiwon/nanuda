"use client";

// Client-side Firestore/Storage writes for user profiles (signup, onboarding, /profile/edit).
// firestore.rules / storage.rules enforce ownership; this module just calls the client SDK as
// the signed-in user, matching the split already used by src/lib/posts-client.ts.
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import type { AppUser, ProfileLinks } from "@/lib/types";

export class HandleTakenError extends Error {
  constructor() {
    super("이미 사용 중인 핸들입니다.");
    this.name = "HandleTakenError";
  }
}

/** Availability check for the live "사용 가능 / 이미 사용 중" feedback while typing. */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "handles", handle));
  return !snap.exists();
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-z0-9]{2,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType || "jpg";
}

/** Uploads to `users/{uid}/avatar.<ext>` (decision: fixed filename, so re-uploading overwrites). */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const path = `users/${uid}/avatar.${extensionOf(file)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Uploads to `users/{uid}/cover.<ext>`, same overwrite convention as the avatar. */
export async function uploadCover(uid: string, file: File): Promise<string> {
  const path = `users/${uid}/cover.${extensionOf(file)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export interface CreateProfileInput {
  uid: string;
  handle: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  bio: string;
}

/**
 * Reserves `handles/{handle}` and creates `users/{uid}` atomically, so two users racing for the
 * same handle can't both win: the transaction reads the handle doc first and fails the whole
 * write if it already exists.
 */
export async function reserveHandleAndCreateUser(input: CreateProfileInput): Promise<void> {
  const handleRef = doc(db, "handles", input.handle);
  const userRef = doc(db, "users", input.uid);

  await runTransaction(db, async (tx) => {
    const handleSnap = await tx.get(handleRef);
    if (handleSnap.exists()) throw new HandleTakenError();

    tx.set(handleRef, { uid: input.uid, createdAt: serverTimestamp() });
    tx.set(
      userRef,
      {
        displayName: input.displayName,
        photoURL: input.photoURL,
        coverURL: null,
        email: input.email,
        handle: input.handle,
        bio: input.bio,
        links: {},
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  photoURL?: string | null;
  coverURL?: string | null;
  links?: ProfileLinks;
}

/** Owner-only profile edit (`/profile/edit`). Handles are immutable for v1 — never written here. */
export async function updateUserProfile(uid: string, input: UpdateProfileInput): Promise<void> {
  await updateDoc(doc(db, "users", uid), { ...input });
}

/**
 * One-shot read of `users/{uid}`, used right after a Google sign-in to decide whether to route
 * into /onboarding (no handle yet) or straight into the app. `auth-context.tsx` also keeps a
 * live `profile` subscription for the rest of the app (header menu, etc.) — this is just for
 * that one synchronous decision point.
 */
export async function getUserProfileOnce(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName ?? "",
    photoURL: data.photoURL ?? null,
    coverURL: data.coverURL ?? null,
    email: data.email ?? null,
    handle: data.handle ?? undefined,
    bio: data.bio ?? "",
    links: data.links ?? {},
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
  };
}
