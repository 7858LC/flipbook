"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

const PRIMARY_NAV = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/sales",
    label: "Sales",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
];

const MORE_ITEMS = [
  { href: "/taxes", label: "🧾 Taxes", desc: "Quarterly tax estimates" },
  { href: "/reports", label: "📄 Reports", desc: "Download PDF reports" },
  { href: "/import", label: "📂 Import CSV", desc: "Bring in your old data" },
  { href: "/settings", label: "⚙️ Settings", desc: "Account & preferences" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const moreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-[60px] left-0 right-0 z-50 bg-surface border-t border-[#2a2a2a] rounded-t-2xl pb-2">
            <div className="w-10 h-1 bg-[#2a2a2a] rounded-full mx-auto mt-3 mb-4" />
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={clsx(
                  "flex items-center gap-3 px-5 py-3.5 transition-colors",
                  pathname.startsWith(item.href)
                    ? "text-profit"
                    : "text-[#f5f5f5] hover:bg-[#1a1a1a]"
                )}
              >
                <span className="text-lg w-6 text-center">{item.label.split(" ")[0]}</span>
                <div>
                  <p className="text-sm font-medium">{item.label.split(" ").slice(1).join(" ")}</p>
                  <p className="text-xs text-[#525252]">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-[#2a2a2a]"
        aria-label="Mobile navigation"
      >
        <div className="flex">
          {PRIMARY_NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[60px] transition-colors",
                  active ? "text-profit" : "text-[#525252]"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[60px] transition-colors",
              moreActive || showMore ? "text-profit" : "text-[#525252]"
            )}
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </>
  );
}
