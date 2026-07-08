"use client";

// An author's own payout bank details (`payoutInfo/{uid}`) — real PII, owner-only in every
// direction per firestore.rules (no `list`, since the site operator reviews this collection
// directly in the Firebase Console when processing a manual settlement, not through the app).
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface PayoutInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export async function getPayoutInfo(uid: string): Promise<PayoutInfo | null> {
  const snap = await getDoc(doc(db, "payoutInfo", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    bankName: data.bankName ?? "",
    accountNumber: data.accountNumber ?? "",
    accountHolder: data.accountHolder ?? "",
  };
}

export async function savePayoutInfo(uid: string, input: PayoutInfo): Promise<void> {
  await setDoc(doc(db, "payoutInfo", uid), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}
