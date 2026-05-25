"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-3">
      {open && (
        <>
          <Link
            href="/expenses?add=1"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-surface border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm font-medium text-[#f5f5f5] hover:bg-[#252525] transition-all shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <span
              className="w-6 h-6 bg-red-500/15 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-3.5 h-3.5 text-loss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            Add Expense
          </Link>
          <Link
            href="/inventory?add=1"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-surface border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm font-medium text-[#f5f5f5] hover:bg-[#252525] transition-all shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 delay-75"
          >
            <span
              className="w-6 h-6 bg-green-500/15 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-3.5 h-3.5 text-profit" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            Add Item
          </Link>
        </>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
          "bg-profit text-black hover:bg-green-400 active:scale-95",
          open && "rotate-45"
        )}
        aria-label={open ? "Close quick add menu" : "Quick add"}
        aria-expanded={open}
      >
        <svg className="w-6 h-6 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
