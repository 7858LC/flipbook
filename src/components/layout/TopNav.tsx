"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/expenses", label: "Expenses" },
  { href: "/taxes", label: "Taxes" },
  { href: "/reports", label: "Reports" },
  { href: "/import", label: "Import CSV" },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-[#2a2a2a] h-16 items-center px-6">
      <Link
        href="/"
        className="flex items-center gap-2 mr-8 font-bold text-lg text-[#f5f5f5]"
      >
        <span className="text-profit text-2xl" aria-hidden="true">
          &#x21C4;
        </span>
        FlipBook
      </Link>

      <nav className="flex items-center gap-1 flex-1" aria-label="Main navigation">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "text-[#f5f5f5] bg-[#ffffff12]"
                  : "text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#ffffff08]"
              )}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className={clsx(
            "px-3 py-2 rounded-lg text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "text-[#f5f5f5] bg-[#ffffff12]"
              : "text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#ffffff08]"
          )}
        >
          Settings
        </Link>

        {session?.user?.image ? (
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-[#ffffff08] px-2 transition-colors"
            aria-label="Sign out"
          >
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={28}
              height={28}
              className="rounded-full"
            />
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-sm text-[#a3a3a3] hover:text-[#f5f5f5] min-h-[44px] px-3 rounded-lg hover:bg-[#ffffff08] transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
