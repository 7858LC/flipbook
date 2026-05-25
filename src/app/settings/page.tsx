"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { Settings } from "@/types";
import { DEFAULT_PLATFORM_FEES } from "@/types";
import { isSubscriptionActive } from "@/lib/stripe";
import { format, parseISO } from "date-fns";

function SubscriptionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "profit" | "warning" | "loss" | "neutral" }> = {
    active: { label: "Active", variant: "profit" },
    trialing: { label: "Trial", variant: "warning" },
    canceled: { label: "Canceled", variant: "loss" },
    past_due: { label: "Past Due", variant: "loss" },
  };
  const v = map[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/sheets/settings")
      .then((r) => r.json())
      .then((j: { data: Settings }) => { setSettings(j.data); setLoading(false); })
      .catch(() => { setError("Failed to load settings"); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/sheets/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: settings.business_name,
          state: settings.state,
          tax_rate: settings.tax_rate,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccess("Settings saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (json.data?.url) window.location.href = json.data.url;
      else setError(json.error ?? "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  function handleExport() {
    window.location.href = "/api/sheets/export";
  }

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      "This will permanently delete ALL your data. This cannot be undone. Are you absolutely sure?"
    );
    if (!confirmed) return;
    const confirmed2 = window.confirm("Last chance — delete everything?");
    if (!confirmed2) return;

    // Delete all sales then expenses
    try {
      const [sRes, eRes] = await Promise.all([
        fetch("/api/sheets/sales"),
        fetch("/api/sheets/expenses"),
      ]);
      const [sJson, eJson] = await Promise.all([
        sRes.json() as Promise<{ data: { id: string }[] }>,
        eRes.json() as Promise<{ data: { id: string }[] }>,
      ]);
      await Promise.all([
        ...sJson.data.map((s) =>
          fetch(`/api/sheets/sales?id=${s.id}`, { method: "DELETE" })
        ),
        ...eJson.data.map((e) =>
          fetch(`/api/sheets/expenses?id=${e.id}`, { method: "DELETE" })
        ),
      ]);
      setSuccess("All data deleted.");
    } catch {
      setError("Failed to delete all data");
    }
  }

  async function handleDeleteAccount() {
    const step1 = window.confirm(
      "Delete your FlipBook account?\n\nThis will permanently erase ALL your sales, expenses, and settings. Your Google Sheet will remain in your Drive but all data will be wiped. This cannot be undone."
    );
    if (!step1) return;
    const step2 = window.confirm(
      "Final confirmation — permanently delete your FlipBook account and all data?"
    );
    if (!step2) return;

    setDeletingAccount(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Account deletion failed");
        return;
      }
      // Sign out and redirect to landing page
      await signOut({ callbackUrl: "/landing" });
    } catch {
      setError("Account deletion failed. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  }

  const isActive = isSubscriptionActive(
    settings.subscription_status ?? "",
    settings.trial_end_date ?? ""
  );

  const trialEnd = settings.trial_end_date
    ? (() => {
        try { return format(parseISO(settings.trial_end_date), "MMM d, yyyy"); }
        catch { return ""; }
      })()
    : "";

  if (loading)
    return (
      <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#f5f5f5]">Settings</h1>

      <form onSubmit={handleSave}>
        <Card>
          <h2 className="font-semibold text-[#f5f5f5] mb-4">Business Info</h2>
          <div className="space-y-4">
            <Input
              label="Business Name"
              value={settings.business_name ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, business_name: e.target.value }))
              }
              placeholder="My Reselling Business"
            />
            <Input
              label="State"
              value={settings.state ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, state: e.target.value }))
              }
              placeholder="CA"
              maxLength={2}
            />
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={settings.tax_rate ?? 25}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  tax_rate: parseFloat(e.target.value) || 25,
                }))
              }
              suffix="%"
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" loading={saving} size="md">
              Save Changes
            </Button>
            {success && <p className="text-profit text-sm">{success}</p>}
            {error && <p className="text-loss text-sm">{error}</p>}
          </div>
        </Card>
      </form>

      <Card>
        <h2 className="font-semibold text-[#f5f5f5] mb-4">
          Platform Fee Defaults
        </h2>
        <div className="space-y-2">
          {DEFAULT_PLATFORM_FEES.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
            >
              <span className="text-sm text-[#a3a3a3]">{p.name}</span>
              <span className="text-sm font-medium">{p.fee_pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#525252] mt-3">
          These are applied automatically when selecting a platform. Adjust
          per-sale in the Mark Sold modal.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-[#f5f5f5] mb-4">Subscription</h2>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#a3a3a3]">Status</span>
          <SubscriptionStatusBadge
            status={settings.subscription_status ?? "trialing"}
          />
        </div>
        {trialEnd && settings.subscription_status === "trialing" && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#a3a3a3]">Trial ends</span>
            <span className="text-sm">{trialEnd}</span>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          {isActive && (
            <Button
              variant="secondary"
              onClick={handleBillingPortal}
              loading={portalLoading}
            >
              Manage Billing
            </Button>
          )}
          {!isActive && (
            <a href="/subscribe">
              <Button variant="primary">Subscribe Now</Button>
            </a>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[#f5f5f5] mb-4">Data</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export All Data</p>
              <p className="text-xs text-[#525252]">
                Downloads a CSV of all sales and expenses
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Legal links */}
      <div className="flex gap-4 text-xs text-[#525252]">
        <a href="/legal/terms" className="hover:text-[#a3a3a3] transition-colors">Terms of Service</a>
        <span>·</span>
        <a href="/legal/privacy" className="hover:text-[#a3a3a3] transition-colors">Privacy Policy</a>
      </div>

      <Card className="border-loss/30">
        <h2 className="font-semibold text-loss mb-4">Danger Zone</h2>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#f5f5f5]">Delete All Data</p>
              <p className="text-xs text-[#525252] mt-0.5">
                Wipes all sales and expenses. Your account remains active.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleDeleteAll}>
              Delete Data
            </Button>
          </div>

          <div className="border-t border-[#2a2a2a] pt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#f5f5f5]">Delete Account</p>
              <p className="text-xs text-[#525252] mt-0.5">
                Permanently erases your account and all data, then signs you out. Cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              loading={deletingAccount}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
