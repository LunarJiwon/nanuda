import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { AppUser } from "@/lib/types";

/** Shared row list for the following/followers pages — a user missing `handle` (pre-handle
 * account) renders as plain text instead of a broken /profile/undefined link. */
export function UserList({ users, emptyLabel }: { users: AppUser[]; emptyLabel: string }) {
  if (users.length === 0) {
    return <p className="text-center text-[#9a988f] text-[13px] py-10">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-[2px]">
      {users.map((u) => {
        const content = (
          <>
            <Avatar src={u.photoURL} name={u.displayName} size={40} />
            <span className="flex flex-col min-w-0">
              <span className="text-[14px] font-semibold text-[#0e0e0e] truncate">
                {u.displayName || "이름 없음"}
              </span>
              {u.handle && <span className="font-mono text-[12px] text-[#8a887f]">@{u.handle}</span>}
            </span>
          </>
        );
        return u.handle ? (
          <Link
            key={u.uid}
            href={`/profile/${u.handle}`}
            className="flex items-center gap-[12px] px-[10px] py-[10px] rounded-[6px] hover:bg-[#f4f2ee]"
          >
            {content}
          </Link>
        ) : (
          <span key={u.uid} className="flex items-center gap-[12px] px-[10px] py-[10px]">
            {content}
          </span>
        );
      })}
    </div>
  );
}
