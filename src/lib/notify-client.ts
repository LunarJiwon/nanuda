"use client";

// Writes a notification directly to another user's `notifications/{uid}/items` — for the three
// low-stakes, high-frequency event types (comment/reply/like) that don't need a Cloud Function's
// Admin SDK the way support/subscription events do (see firestore.rules for the narrow create
// rule this relies on, and functions/src/index.ts's writeNotification for the server-side ones).
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { NotificationType } from "@/lib/types";

type NotifiableEvent = "comment" | "reply" | "like";

export interface NotifyInput {
  recipientId: string;
  actorId: string;
  type: NotifiableEvent & NotificationType;
  title: string;
  body: string;
  link: string;
}

/** Best-effort — a failed notification (recipient's settings unreadable, rules rejection, etc.)
 * should never surface as an error to the person commenting/liking, so callers fire this without
 * awaiting/catching. Never notifies yourself, and honors the recipient's own opt-out in
 * `users/{uid}.notificationSettings` (absent/undefined means enabled). */
export async function notifyUser(input: NotifyInput): Promise<void> {
  if (input.actorId === input.recipientId) return;
  try {
    const recipientSnap = await getDoc(doc(db, "users", input.recipientId));
    if (!recipientSnap.exists()) return;
    const settings = recipientSnap.data().notificationSettings ?? {};
    const settingKey = input.type === "like" ? "like" : "comment"; // reply shares the comment toggle
    if (settings[settingKey] === false) return;

    await setDoc(doc(collection(db, "notifications", input.recipientId, "items")), {
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("[notify] failed to write notification", err);
  }
}
