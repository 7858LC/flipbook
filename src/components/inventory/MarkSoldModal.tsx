"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PLATFORM_FEES } from "@/types";
import { formatCurrency, dollarsToCents } from "@/lib/money";
import type { SaleRow } from "@/types";
import { format } from "date-fns";

interface MarkSoldModalProps {
  open: boolean;
  item: SaleRow | null;
  onClose: () => void;
  onSold: (updated: SaleRow) => void;
}

type FeeMode = "pct" | "dollars";

const PLATFORM_OPTIONS = DEFAULT_PLATFORM_FEES.map((p) => ({
  value: p.name,
  label: `${p.name} (${p.fee_pct}% est.)`,
}));

interface FormState {
  sell_price: string;
  platform: string;
  fee_mode: FeeMode;
  platform_fee_pct: string;   // used when fee_mode === "pct"
  platform_fee_dollars: string; // used when fee_mode === "dollars"
  shipping_cost: string;
  other_costs: string;
  date: string;
  notes: string;
}

export function MarkSoldModal({ open, item, onClose, onSold }: MarkSoldModalProps) {
  const [form, setForm] = useState<FormState>({
    sell_price: "",
    platform: item?.platform ?? DEFAULT_PLATFORM_FEES[0]?.name ?? "",
    fee_mode: "pct",
    platform_fee_pct: String(
      DEFAULT_PLATFORM_FEES.find((p) => p.name === item?.platform)?.fee_pct ?? 0
    ),
    platform_fee_dollars: "",
    shipping_cost: "",
    other_costs: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: item?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (item) {
      const fee =
        DEFAULT_PLATFORM_FEES.find((p) => p.name === item.platform)?.fee_pct ??
        item.platform_fee_pct;
      setForm({
        sell_price: "",
        platform: item.platform,
        fee_mode: "pct",
        platform_fee_pct: String(fee),
        platform_fee_dollars: "",
        shipping_cost: "",
        other_costs: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: item.notes,
      });
      setErrors({});
      setServerError("");
    }
  }, [item]);

  function handlePlatformChange(platform: string) {
    const fee = DEFAULT_PLATFORM_FEES.find((p) => p.name === platform)?.fee_pct ?? 0;
    setForm((f) => ({ ...f, platform, platform_fee_pct: String(fee) }));
  }

  // Compute net profit preview from whatever the user has entered
  const previewNetProfit = (() => {
    if (!form.sell_price || !item) return null;
    const sellCents = dollarsToCents(parseFloat(form.sell_price) || 0);
    const buyCents = item.buy_price;
    const shippingCents = dollarsToCents(parseFloat(form.shipping_cost) || 0);
    const otherCents = dollarsToCents(parseFloat(form.other_costs) || 0);

    let feeCents = 0;
    if (form.fee_mode === "pct") {
      const pct = parseFloat(form.platform_fee_pct) || 0;
      feeCents = Math.round((sellCents * pct) / 100);
    } else {
      feeCents = dollarsToCents(parseFloat(form.platform_fee_dollars) || 0);
    }

    return sellCents - buyCents - feeCents - shippingCents - otherCents;
  })();

  // When submitting with dollar-mode fee, convert to pct for storage
  function resolvedFeePct(): number {
    if (form.fee_mode === "pct") return parseFloat(form.platform_fee_pct) || 0;
    const sellPrice = parseFloat(form.sell_price) || 0;
    const feeDollars = parseFloat(form.platform_fee_dollars) || 0;
    if (sellPrice === 0) return 0;
    return (feeDollars / sellPrice) * 100;
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.sell_price || isNaN(parseFloat(form.sell_price)))
      next.sell_price = "Enter a valid sell price";
    if (parseFloat(form.sell_price) < 0) next.sell_price = "Must be >= 0";
    if (!form.date) next.date = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !item) return;
    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/sheets/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          date: form.date,
          sell_price: parseFloat(form.sell_price),
          platform: form.platform,
          platform_fee_pct: resolvedFeePct(),
          shipping_cost: parseFloat(form.shipping_cost) || 0,
          other_costs: parseFloat(form.other_costs) || 0,
          notes: form.notes.trim(),
          status: "sold",
        }),
      });
      const json = (await res.json()) as { data?: SaleRow; error?: string };
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Failed to mark as sold");
        return;
      }
      onSold(json.data!);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} title="Mark as Sold">
      <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>

        {/* Item summary */}
        <div className="bg-[#0f0f0f] rounded-xl p-3 text-sm">
          <p className="text-[#a3a3a3] mb-1">Item</p>
          <p className="font-medium text-[#f5f5f5]">{item.item_name}</p>
          <p className="text-[#525252] text-xs mt-0.5">
            Bought for {formatCurrency(item.buy_price)}
          </p>
        </div>

        <Input
          label="Sell Price"
          type="number"
          step="0.01"
          min="0"
          value={form.sell_price}
          onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
          error={errors.sell_price}
          prefix="$"
          placeholder="0.00"
          autoFocus
        />

        {/* Platform + fee mode toggle */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Platform"
            value={form.platform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            options={PLATFORM_OPTIONS}
          />
          <div>
            <p className="text-xs font-medium text-[#a3a3a3] mb-1.5">Fee Entry</p>
            <div className="flex rounded-lg border border-[#2a2a2a] overflow-hidden">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, fee_mode: "pct" }))}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  form.fee_mode === "pct"
                    ? "bg-[#22c55e] text-[#0f0f0f]"
                    : "text-[#525252] hover:text-[#a3a3a3]"
                }`}
              >
                Use %
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, fee_mode: "dollars" }))}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  form.fee_mode === "dollars"
                    ? "bg-[#22c55e] text-[#0f0f0f]"
                    : "text-[#525252] hover:text-[#a3a3a3]"
                }`}
              >
                Exact $
              </button>
            </div>
          </div>
        </div>

        {/* Fee input — switches based on mode */}
        {form.fee_mode === "pct" ? (
          <div>
            <Input
              label="Platform Fee % (estimated)"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.platform_fee_pct}
              onChange={(e) => setForm((f) => ({ ...f, platform_fee_pct: e.target.value }))}
              suffix="%"
            />
            <p className="text-xs text-[#525252] mt-1">
              Estimated — for exact profit use the actual fee from your eBay/platform transaction
            </p>
          </div>
        ) : (
          <div>
            <Input
              label="Actual Platform Fee (from transaction)"
              type="number"
              step="0.01"
              min="0"
              value={form.platform_fee_dollars}
              onChange={(e) => setForm((f) => ({ ...f, platform_fee_dollars: e.target.value }))}
              prefix="$"
              placeholder="0.00"
            />
            <p className="text-xs text-[#525252] mt-1">
              Copy the exact fee shown on your eBay/Poshmark/Mercari transaction page
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Shipping Cost"
            type="number"
            step="0.01"
            min="0"
            value={form.shipping_cost}
            onChange={(e) => setForm((f) => ({ ...f, shipping_cost: e.target.value }))}
            prefix="$"
            placeholder="0.00"
          />
          <Input
            label="Other Costs"
            type="number"
            step="0.01"
            min="0"
            value={form.other_costs}
            onChange={(e) => setForm((f) => ({ ...f, other_costs: e.target.value }))}
            prefix="$"
            placeholder="0.00"
          />
        </div>

        <Input
          label="Date Sold"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          error={errors.date}
        />

        {/* Live net profit preview */}
        {previewNetProfit !== null && (
          <div className={`rounded-xl p-3 text-sm flex items-center justify-between ${
            previewNetProfit >= 0
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}>
            <div>
              <span className="text-[#a3a3a3]">Net profit</span>
              {form.fee_mode === "pct" && (
                <p className="text-[10px] text-[#525252] mt-0.5">Based on estimated fee %</p>
              )}
            </div>
            <span className={`font-bold text-base ${
              previewNetProfit >= 0 ? "text-profit" : "text-loss"
            }`}>
              {previewNetProfit >= 0 ? "+" : ""}
              {formatCurrency(previewNetProfit)}
            </span>
          </div>
        )}

        {serverError && <p className="text-loss text-sm">{serverError}</p>}

        <div className="flex gap-3 pt-2 pb-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Mark Sold
          </Button>
        </div>
      </form>
    </Modal>
  );
}
