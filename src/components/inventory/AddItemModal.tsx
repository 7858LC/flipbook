"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { DEFAULT_CATEGORIES, DEFAULT_PLATFORM_FEES } from "@/types";
import type { SaleRow } from "@/types";
import { format } from "date-fns";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (sale: SaleRow) => void;
}

interface ScanResult {
  item_name: string;
  category: string;
  brand: string;
  low_price: number | null;
  high_price: number | null;
}

const PLATFORM_OPTIONS = DEFAULT_PLATFORM_FEES.map((p) => ({
  value: p.name,
  label: p.name,
}));

const CATEGORY_OPTIONS = DEFAULT_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

interface FormState {
  item_name: string;
  category: string;
  platform: string;
  buy_price: string;
  date: string;
  notes: string;
}

export function AddItemModal({ open, onClose, onAdded }: AddItemModalProps) {
  const [form, setForm] = useState<FormState>({
    item_name: "",
    category: DEFAULT_CATEGORIES[0] ?? "",
    platform: DEFAULT_PLATFORM_FEES[0]?.name ?? "",
    buy_price: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [upcInput, setUpcInput] = useState("");
  const [upcLoading, setUpcLoading] = useState(false);
  const [upcError, setUpcError] = useState("");

  async function handleUpcLookup() {
    const code = upcInput.trim();
    if (!code) return;
    setUpcLoading(true);
    setUpcError("");
    try {
      const res = await fetch(`/api/upc/${encodeURIComponent(code)}`);
      const json = await res.json() as { data: ScanResult | null; error?: string };
      if (json.data) {
        handleScanResult(json.data);
        setUpcInput("");
      } else {
        setUpcError("Barcode not found — fill in details below.");
      }
    } catch {
      setUpcError("Lookup failed. Check your connection.");
    } finally {
      setUpcLoading(false);
    }
  }

  function handleScanResult(result: ScanResult) {
    if (result.item_name) setForm(f => ({ ...f, item_name: result.item_name }));
    if (result.category && result.category !== "Other") setForm(f => ({ ...f, category: result.category }));
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.item_name.trim()) next.item_name = "Required";
    if (!form.buy_price || isNaN(parseFloat(form.buy_price)))
      next.buy_price = "Enter a valid price";
    if (parseFloat(form.buy_price) < 0) next.buy_price = "Must be >= 0";
    if (!form.date) next.date = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    const platformFee =
      DEFAULT_PLATFORM_FEES.find((p) => p.name === form.platform)?.fee_pct ??
      0;

    try {
      const res = await fetch("/api/sheets/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          item_name: form.item_name.trim(),
          category: form.category,
          platform: form.platform,
          buy_price: parseFloat(form.buy_price),
          sell_price: 0,
          platform_fee_pct: platformFee,
          shipping_cost: 0,
          other_costs: 0,
          notes: form.notes.trim(),
          status: "active",
        }),
      });
      const json = (await res.json()) as { data?: SaleRow; error?: string };
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Failed to add item");
        return;
      }
      onAdded(json.data!);
      onClose();
      setForm({
        item_name: "",
        category: DEFAULT_CATEGORIES[0] ?? "",
        platform: DEFAULT_PLATFORM_FEES[0]?.name ?? "",
        buy_price: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setErrors({});
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onResult={(result) => {
            setScanning(false);
            handleScanResult(result);
          }}
        />
      )}
    <Modal open={open} onClose={onClose} title="Add Inventory Item">
      <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>

        {/* UPC lookup — camera button + manual text input */}
        <div>
          <p className="text-xs text-[#525252] mb-1.5">Auto-fill from barcode</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="flex items-center gap-1.5 border border-[#2a2a2a] hover:border-[#22c55e] hover:bg-[#22c55e]/5 text-[#a3a3a3] hover:text-[#22c55e] rounded-xl px-3 py-2.5 text-sm font-medium transition-colors shrink-0"
              title="Open camera scanner"
            >
              <span>📷</span>
            </button>
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                value={upcInput}
                onChange={e => { setUpcInput(e.target.value); setUpcError(""); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleUpcLookup(); } }}
                placeholder="Type or paste UPC / EAN barcode…"
                inputMode="numeric"
                className="flex-1 bg-[#111] border border-[#2a2a2a] text-[#f5f5f5] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#22c55e] placeholder:text-[#525252]"
              />
              <button
                type="button"
                onClick={() => void handleUpcLookup()}
                disabled={!upcInput.trim() || upcLoading}
                className="bg-[#22c55e] disabled:bg-[#2a2a2a] disabled:text-[#525252] text-[#0f0f0f] font-semibold px-3 py-2.5 rounded-xl text-sm transition-colors shrink-0"
              >
                {upcLoading ? "…" : "Look up"}
              </button>
            </div>
          </div>
          {upcError && <p className="text-xs text-[#a3a3a3] mt-1.5">{upcError}</p>}
        </div>

        <Input
          label="Item Name"
          value={form.item_name}
          onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
          error={errors.item_name}
          placeholder="e.g. Vintage Levi's 501 Jeans"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Platform"
            value={form.platform}
            onChange={(e) =>
              setForm((f) => ({ ...f, platform: e.target.value }))
            }
            options={PLATFORM_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Buy Price"
            type="number"
            step="0.01"
            min="0"
            value={form.buy_price}
            onChange={(e) =>
              setForm((f) => ({ ...f, buy_price: e.target.value }))
            }
            error={errors.buy_price}
            prefix="$"
            placeholder="0.00"
          />
          <Input
            label="Date Purchased"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            error={errors.date}
          />
        </div>
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Condition, source, etc."
        />
        {serverError && (
          <p className="text-loss text-sm">{serverError}</p>
        )}
        <div className="flex gap-3 pt-2 pb-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            fullWidth
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Add Item
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
}
