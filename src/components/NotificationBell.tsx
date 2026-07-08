"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { subscribeToNotifications, markNotificationRead } from "@/lib/notifications-client";
import { formatDate } from "@/lib/date";
import type { AppNotification } from "@/lib/types";

/** Bell icon + unread badge in the header, aggregating support/subscription/new-subscriber-post
 * notifications (see functions/src/index.ts's writeNotification calls) into one dropdown. Only
 * rendered for real, non-anonymous signed-in users — same gating as the profile avatar. */
export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Header only ever renders this component when `loggedIn` — a logout unmounts it entirely
    // rather than flipping this branch while mounted, so there's no stale-list case to reset here.
    if (!user || user.isAnonymous) return;
    const unsubscribe = subscribeToNotifications(
      user.uid,
      setNotifications,
      (err) => console.error("[notifications] subscription failed", err)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (!user || user.isAnonymous) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleSelect(notification: AppNotification) {
    setOpen(false);
    if (!notification.read) markNotificationRead(user!.uid, notification.id).catch(() => {});
    router.push(notification.link);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        className="relative w-[32px] h-[32px] flex items-center justify-center rounded-full text-[#54524c] hover:bg-[#f2f0ec] cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-[3px] right-[3px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-[#b64a3f] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-[42px] right-0 z-40 w-[320px] max-h-[420px] overflow-y-auto border border-[#e6e4de] bg-white rounded-[8px] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.3)] p-[8px]"
        >
          <div className="text-[11px] tracking-[0.06em] uppercase text-[#b8b6ad] px-[8px] pt-[4px] pb-[8px]">
            알림
          </div>
          {notifications.length === 0 ? (
            <p className="text-center text-[#9a988f] text-[12.5px] py-[24px] m-0">알림이 없습니다.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`block w-full text-left px-[10px] py-[10px] rounded-[5px] hover:bg-[#f4f2ee] cursor-pointer ${
                  n.read ? "" : "bg-[#faf7f0]"
                }`}
              >
                <span className="flex items-start gap-[6px]">
                  {!n.read && <span className="mt-[6px] w-[6px] h-[6px] rounded-full bg-[#b64a3f] flex-none" />}
                  <span className="flex flex-col gap-[2px] min-w-0">
                    <span className="text-[13px] font-semibold text-[#0e0e0e] truncate">{n.title}</span>
                    <span className="text-[12px] text-[#77756c] line-clamp-2">{n.body}</span>
                    <span className="text-[10.5px] text-[#b0aea6] mt-[2px]">{formatDate(n.createdAt)}</span>
                  </span>
                </span>
              </button>
            ))
          )}
          {notifications.length > 0 && (
            <Link
              href="/profile/edit"
              onClick={() => setOpen(false)}
              className="block text-center text-[11.5px] text-[#9a988f] mt-[4px] pt-[8px] border-t border-[#f0eee9]"
            >
              구독 관리
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
