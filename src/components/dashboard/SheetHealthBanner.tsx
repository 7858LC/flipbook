"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "corrupted" | "repairing" | "repaired" | "error";

export function SheetHealthBanner() {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    fetch("/api/sheets/health")
      .then((r) => r.json())
      .then((json: { data?: { healthy: boolean; sheets: Array<{ sheet: string; status: string }> } }) => {
        if (json.data?.healthy) {
          setStatus("ok");
        } else {
          const bad = json.data?.sheets
            .filter((s) => s.status !== "ok")
            .map((s) => s.sheet)
            .join(", ");
          setDetail(bad ?? "unknown");
          setStatus("corrupted");
        }
      })
      .catch(() => setStatus("ok")); // fail silently — don't block the dashboard
  }, []);

  async function handleRepair() {
    setStatus("repairing");
    try {
      const res = await fetch("/api/sheets/health", { method: "POST" });
      if (res.ok) {
        setStatus("repaired");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  // Don't render anything when healthy or still checking
  if (status === "ok" || status === "checking") return null;

  if (status === "repaired") {
    return (
      <div className="mx-4 md:mx-6 mt-4 bg-profit/10 border border-profit/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-lg">✅</span>
        <p className="text-sm text-[#f5f5f5] flex-1">
          Spreadsheet headers repaired successfully. Your data is intact.
        </p>
      </div>
    );
  }

  if (status === "corrupted") {
    return (
      <div className="mx-4 md:mx-6 mt-4 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#f5f5f5] mb-0.5">
              Spreadsheet headers look off
            </p>
            <p className="text-xs text-[#a3a3a3] mb-3">
              The <strong>{detail}</strong> sheet header row may have been edited directly in Google Drive.
              This can cause the app to misread your data. Tap Repair to restore the headers —
              your data rows will not be changed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRepair}
                className="bg-[#f59e0b] text-[#0f0f0f] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-[#d97706] transition-colors"
              >
                Repair Headers
              </button>
              <button
                onClick={() => setStatus("ok")}
                className="text-xs text-[#525252] hover:text-[#a3a3a3] px-3 py-2 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "repairing") {
    return (
      <div className="mx-4 md:mx-6 mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-sm text-[#a3a3a3]">Repairing headers…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-4 md:mx-6 mt-4 bg-loss/10 border border-loss/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-lg">❌</span>
        <div>
          <p className="text-sm text-[#f5f5f5]">Repair failed.</p>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            Open your FlipBook spreadsheet in Google Drive and make sure the first row of the Sales and Expenses sheets matches the original headers.
            Contact support if this keeps happening.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
