"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "홈",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11l9-7 9 7"></path>
        <path d="M5 10v9h14v-9"></path>
      </svg>
    ),
  },
  {
    href: "/daily",
    label: "일상",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <circle cx="8.5" cy="9" r="1.6"></circle>
        <path d="M21 15l-5-5-9 9"></path>
      </svg>
    ),
  },
  {
    href: "/info",
    label: "정보",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 8l-4 4 4 4"></path>
        <path d="M16 8l4 4-4 4"></path>
      </svg>
    ),
  },
  {
    href: "/art",
    label: "예술",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="3" width="16" height="18" rx="1"></rect>
        <path d="M9 3v18"></path>
      </svg>
    ),
  },
  {
    href: "/quote",
    label: "글귀",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 8h4v6H7z"></path>
        <path d="M7 11c0-2 1-3 3-3"></path>
        <path d="M14 8h4v6h-4z"></path>
        <path d="M14 11c0-2 1-3 3-3"></path>
      </svg>
    ),
  },
];

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex lg:hidden flex-none items-stretch border-t border-[#e8e7e3] bg-white z-20">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 text-[11px] pt-[9px] pb-[8px] flex flex-col items-center gap-[3px]"
            style={{ color: active ? "#0e0e0e" : "#b0aea6" }}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
