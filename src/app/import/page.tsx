"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type ParsedRow = Record<string, string>;
type ImportType = "sales" | "expenses";

const SALES_COLUMNS = ["date", "item_name", "category", "platform", "buy_price", "sell_price", "platform_fee_pct", "shipping_cost", "other_costs", "notes", "status"];
const EXPENSE_COLUMNS = ["date", "category", "description", "amount", "tax_deductible", "notes"];

const SALES_ALIASES: Record<string, string> = {
  date: "date", "sale date": "date", "sold date": "date",
  item: "item_name", "item name": "item_name", title: "item_name", name: "item_name", description: "item_name",
  category: "category", type: "category",
  platform: "platform", marketplace: "platform", site: "platform",
  "buy price": "buy_price", cost: "buy_price", "purchase price": "buy_price", paid: "buy_price",
  "sell price": "sell_price", "sale price": "sell_price", sold: "sell_price", price: "sell_price",
  "fee %": "platform_fee_pct", "fee pct": "platform_fee_pct", fees: "platform_fee_pct",
  shipping: "shipping_cost", "shipping cost": "shipping_cost",
  "other costs": "other_costs", other: "other_costs",
  notes: "notes", note: "notes",
  status: "status",
};

const EXPENSE_ALIASES: Record<string, string> = {
  date: "date",
  category: "category", type: "category",
  description: "description", item: "description", name: "description",
  amount: "amount", cost: "amount", price: "amount",
  "tax deductible": "tax_deductible", deductible: "tax_deductible",
  notes: "notes",
};

function autoMap(headers: string[], type: ImportType): Record<string, string> {
  const aliases = type === "sales" ? SALES_ALIASES : EXPENSE_ALIASES;
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const match = aliases[h.toLowerCase().trim()];
    if (match) mapping[h] = match;
  }
  return mapping;
}

const TARGET_COLS = {
  sales: SALES_COLUMNS,
  expenses: EXPENSE_COLUMNS,
};

const COL_LABELS: Record<string, string> = {
  date: "Date *", item_name: "Item Name *", category: "Category",
  platform: "Platform", buy_price: "Buy Price ($)", sell_price: "Sell Price ($) *",
  platform_fee_pct: "Platform Fee %", shipping_cost: "Shipping ($)",
  other_costs: "Other Costs ($)", notes: "Notes", status: "Status (active/sold)",
  description: "Description *", amount: "Amount ($) *", tax_deductible: "Tax Deductible (yes/no)",
};

export default function ImportPage() {
  const [type, setType] = useState<ImportType>("sales");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError("");
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const hdrs = results.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(results.data);
        setMapping(autoMap(hdrs, type));
        setStep("map");
      },
      error: () => setError("Could not read file. Make sure it's a CSV."),
    });
  }, [type]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      const res = await fetch(`/api/sheets/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rows, mapping }),
      });
      const json = await res.json() as { data?: { imported: number; skipped: number }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setResult(json.data ?? { imported: 0, skipped: 0 });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setError("");
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-1">Import CSV</h1>
      <p className="text-sm text-[#525252] mb-6">
        Bring in data from your old spreadsheet or any platform export
      </p>

      {error && (
        <div className="bg-loss/10 border border-loss/20 text-loss text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {step === "upload" && (
        <Card>
          {/* Type selector */}
          <div className="flex gap-2 mb-6">
            {(["sales", "expenses"] as ImportType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors capitalize ${
                  type === t ? "bg-[#22c55e] text-[#0f0f0f]" : "bg-[#2a2a2a] text-[#a3a3a3] hover:bg-[#333]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              dragging ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#2a2a2a] hover:border-[#525252]"
            }`}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="text-[#f5f5f5] font-semibold mb-1">Drop your CSV file here</p>
            <p className="text-sm text-[#525252]">or tap to browse your files</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>

          <div className="mt-4 p-4 bg-[#2a2a2a]/50 rounded-xl">
            <p className="text-xs text-[#525252] font-medium mb-2">CSV tips:</p>
            <ul className="text-xs text-[#525252] space-y-1">
              <li>• First row must be column headers</li>
              <li>• Dates should be YYYY-MM-DD format (e.g. 2024-03-15)</li>
              <li>• Money values should be numbers without $ signs (e.g. 24.99)</li>
              <li>• You can use your own column names — you&apos;ll map them next</li>
            </ul>
          </div>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#f5f5f5]">Map your columns</h2>
              <p className="text-xs text-[#525252] mt-0.5">{rows.length} rows found — match your columns to FlipBook fields</p>
            </div>
            <button onClick={reset} className="text-xs text-[#525252] hover:text-[#a3a3a3]">Start over</button>
          </div>

          <div className="space-y-3 mb-6">
            {TARGET_COLS[type].map(target => (
              <div key={target} className="flex items-center gap-3">
                <span className="text-sm text-[#f5f5f5] w-44 shrink-0">{COL_LABELS[target] ?? target}</span>
                <select
                  value={Object.entries(mapping).find(([, v]) => v === target)?.[0] ?? ""}
                  onChange={e => {
                    const src = e.target.value;
                    setMapping(prev => {
                      const next = { ...prev };
                      // Remove any existing mapping to this target
                      for (const k of Object.keys(next)) {
                        if (next[k] === target) delete next[k];
                      }
                      if (src) next[src] = target;
                      return next;
                    });
                  }}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— skip this field —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <Button onClick={() => setStep("preview")} className="w-full">
            Preview Import →
          </Button>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#f5f5f5]">Preview</h2>
              <p className="text-xs text-[#525252] mt-0.5">First 5 rows — does this look right?</p>
            </div>
            <button onClick={() => setStep("map")} className="text-xs text-[#525252] hover:text-[#a3a3a3]">← Back</button>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {Object.values(mapping).map(v => (
                    <th key={v} className="text-left py-2 px-2 text-[#525252] font-medium whitespace-nowrap">{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-[#2a2a2a]/50">
                    {Object.entries(mapping).map(([src, tgt]) => (
                      <td key={tgt} className="py-2 px-2 text-[#a3a3a3] whitespace-nowrap max-w-[120px] truncate">
                        {row[src] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="flex-1"
            >
              {importing ? "Importing…" : `Import All ${rows.length} Rows`}
            </Button>
          </div>
        </Card>
      )}

      {step === "done" && result && (
        <Card className="text-center py-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-[#f5f5f5] mb-2">Import complete!</h2>
          <p className="text-[#a3a3a3] mb-1">{result.imported} rows imported successfully</p>
          {result.skipped > 0 && (
            <p className="text-[#525252] text-sm mb-4">{result.skipped} rows skipped (missing required fields)</p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={reset}>Import Another File</Button>
            <a
              href={type === "sales" ? "/sales" : "/expenses"}
              className="px-4 py-2 bg-[#22c55e] text-[#0f0f0f] font-semibold rounded-xl text-sm hover:bg-[#16a34a] transition-colors"
            >
              View {type === "sales" ? "Sales" : "Expenses"} →
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
