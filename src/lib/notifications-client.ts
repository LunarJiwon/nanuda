"use client";

// Client-side reads/writes for `notifications/{uid}/items/{id}` — always *written* by a Cloud
// Function (support/subscription events, new subscriber-only posts; see functions/src/index.ts),
// this module only ever reads them and toggles `read`, matching what firestore.rules allows.
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AppNotification, NotificationType } from "@/lib/types";

const NOTIFICATION_LIST_LIMIT = 30;

/** Live subscription to a user's most recent notifications, newest first — powers the header's
 * notification bell. Returns the unsubscribe function. */
export function subscribeToNotifications(
  uid: string,
  onChange: (notifications: AppNotification[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(NOTIFICATION_LIST_LIMIT)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type as NotificationType,
          title: data.title ?? "",
          body: data.body ?? "",
          link: data.link ?? "/",
          read: data.read ?? false,
          createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
        } satisfies AppNotification;
      });
      onChange(items);
    },
    onError
  );
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", uid, "items", notificationId), { read: true });
}
