"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { reserveHandleAndCreateUser, uploadAvatar } from "@/lib/profile-client";
import { sendVerificationEmailCall, VERIFICATION_SEND_FAILED_KEY } from "@/lib/emailVerification-client";
import type { AppUser } from "@/lib/types";

/** "Real" = not the anonymous fallback identity every visitor gets (see the effect below). */
export function isRealUser(user: User | null): boolean {
  return Boolean(user && !user.isAnonymous);
}

/**
 * A real, non-anonymous account whose email has also been verified (see functions/src/index.ts —
 * we set `emailVerified` ourselves via the Admin SDK after a custom Resend-based flow, never
 * Firebase's built-in verification email). Required for *creating* new content — posts, comments,
 * likes — mirroring `isVerifiedUser()` in firestore.rules; not required for deleting/editing
 * content the user already owns.
 */
export function isVerifiedUser(user: User | null): boolean {
  return isRealUser(user) && Boolean(user?.emailVerified);
}

export interface SignupProfileInput {
  handle: string;
  bio: string;
  avatarFile: File | null;
}

interface AuthContextValue {
  user: User | null;
  /**
   * Live `users/{uid}` Firestore doc for the current auth user (null while loading, while
   * signed out, or if the doc doesn't exist yet — e.g. a Google sign-up mid-/onboarding, or an
   * anonymous visitor). Missing `profile.handle` means "no public profile yet", not an error.
   */
  profile: AppUser | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string, profile: SignupProfileInput) => Promise<void>;
  /** No-op placeholder — see comment below. */
  signInApple: () => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Re-fetches the current user's Auth record (via `reload()`) and refreshes `user` with a new
   * object reference so components re-render with the latest `emailVerified` etc. without a full
   * re-login. Used by /verify-email after a successful verification in the same browser tab.
   */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function upsertBasicUserFields(user: User) {
  // Merge-only: never touches handle/bio/links/coverURL, so this is safe to call on every
  // Google login without clobbering a profile completed via /onboarding or edited later.
  await setDoc(
    doc(db, "users", user.uid),
    {
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? null,
      email: user.email ?? null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // No identity at all (fresh visitor, or just signed out): fall back to an anonymous
        // sign-in so every visitor — logged in or not — has a stable uid to key the view-count
        // dedup and like/comment gating off of. This fires onAuthStateChanged again with the
        // anonymous user, so we intentionally don't setLoading(false) on this branch.
        signInAnonymously(auth).catch((err) => {
          console.error("[auth] anonymous sign-in failed", err);
          setLoading(false);
        });
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    function clearProfile() {
      setProfile(null);
    }
    if (!user) {
      clearProfile();
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
          return;
        }
        const data = snap.data();
        setProfile({
          uid: user.uid,
          displayName: data.displayName ?? "",
          photoURL: data.photoURL ?? null,
          coverURL: data.coverURL ?? null,
          email: data.email ?? null,
          handle: data.handle ?? undefined,
          subscriptionPrice: data.subscriptionPrice || undefined,
          notificationSettings: data.notificationSettings ?? undefined,
          bio: data.bio ?? "",
          links: data.links ?? {},
          createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
        });
      },
      (err) => console.error("[auth] profile subscription failed", err)
    );
    return unsubscribe;
  }, [user]);

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await upsertBasicUserFields(cred.user);
  };

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpEmail = async (
    name: string,
    email: string,
    password: string,
    profile: SignupProfileInput
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    let photoURL: string | null = null;
    if (profile.avatarFile) {
      photoURL = await uploadAvatar(cred.user.uid, profile.avatarFile);
    }
    if (name || photoURL) {
      await updateProfile(cred.user, { displayName: name || undefined, photoURL: photoURL || undefined });
    }
    // Reserves the handle and creates users/{uid} in one transaction (see profile-client.ts) so
    // two people racing for the same @handle can't both win.
    await reserveHandleAndCreateUser({
      uid: cred.user.uid,
      handle: profile.handle,
      displayName: name,
      email,
      photoURL,
      bio: profile.bio,
    });
    // Fire-and-forget: don't block the signup flow on the verification email round-trip (Google
    // sign-ins skip this entirely — Google-verified addresses already come through with
    // `emailVerified: true`, see EmailVerificationBanner). On failure we can't show a message
    // ourselves since the login page navigates to "/" the instant this promise resolves, so we
    // flag it for the persistent verification banner to surface on its next mount instead.
    sendVerificationEmailCall().catch((err) => {
      console.error("[auth] failed to send verification email after signup", err);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(VERIFICATION_SEND_FAILED_KEY, "1");
      }
    });
  };

  // Apple Sign-In requires an Apple Developer Program membership (paid) to register a Services
  // ID, a Sign in with Apple key, and redirect URLs — none of which exist for this project yet.
  // The button is implemented visually (see /login) but wired to this no-op so we don't ship a
  // broken flow. Wiring it for real is documented as a manual follow-up step in SETUP.md.
  const signInApple = async () => {
    console.warn("[auth] Apple 로그인은 아직 구성되지 않았습니다. SETUP.md를 참고하세요.");
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    // Firebase mutates the existing User instance in place on reload(), so re-setting state with
    // the *same* object reference would be a no-op for React's re-render check. Cloning onto a
    // fresh object with the same prototype preserves all SDK methods (getIdToken, etc.) while
    // giving React a new reference to diff against.
    const refreshed = auth.currentUser;
    setUser(Object.assign(Object.create(Object.getPrototypeOf(refreshed)), refreshed));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInGoogle,
        signInEmail,
        signUpEmail,
        signInApple,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
