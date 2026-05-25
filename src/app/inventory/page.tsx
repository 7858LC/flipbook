"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AddItemModal } from "@/components/inventory/AddItemModal";
import { MarkSoldModal } from "@/components/inventory/MarkSoldModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  EmptyState,
  InventoryEmptyIcon,
} from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/money";
import type { SaleRow } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_PLATFORM_FEES } from "@/types";
import { format, parseISO, differenceInDays } from "date-fns";
import { Suspense } from "react";

const ALL_OPTION = { value: "", label: "All" };
const CATEGORY_OPTIONS = [
  ALL_OPTION,
  ...DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c })),
];
const PLATFORM_OPTIONS = [
  ALL_OPTION,
  ...DEFAULT_PLATFORM_FEES.map((p) => ({ value: p.name, label: p.name })),
];

function InventoryContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [markSoldItem, setMarkSoldItem] = useState<SaleRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof SaleRow>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/sales");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as { data: SaleRow[] };
      setItems((json.data ?? []).filter((s) => s.status === "active"));
    } catch {
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSort(key: keyof SaleRow) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item permanently?")) return;
    const res = await fetch(`/api/sheets/sales?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  const filtered = items
    .filter((i) => !categoryFilter || i.category === categoryFilter)
    .filter((i) => !platformFilter || i.platform === platformFilter)
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalValue = filtered.reduce((s, i) => s + i.buy_price, 0);

  function SortIcon({ col }: { col: keyof SaleRow }) {
    if (col !== sortKey)
      return <span className="text-[#3a3a3a] ml-1" aria-hidden="true">↕</span>;
    return (
      <span className="text-profit ml-1" aria-hidden="true">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Inventory</h1>
          <p className="text-sm text-[#525252] mt-0.5">
            {filtered.length} items · {formatCurrency(totalValue)} invested
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="md">
          + Add Item
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="w-40">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORY_OPTIONS}
          />
        </div>
        <div className="w-44">
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            options={PLATFORM_OPTIONS}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="text-loss text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<InventoryEmptyIcon />}
          title="No active inventory"
          description="Add items you've purchased and are waiting to sell."
          action={{ label: "Add First Item", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="table-scroll rounded-xl border border-[#2a2a2a] sticky-header zebra">
          <table className="min-w-full text-sm" role="grid">
            <thead>
              <tr className="bg-surface">
                {(
                  [
                    { key: "item_name", label: "Item" },
                    { key: "category", label: "Category" },
                    { key: "platform", label: "Platform" },
                    { key: "buy_price", label: "Buy Price" },
                    { key: "date", label: "Listed" },
                    { key: "days_to_sell", label: "Days Active" },
                  ] as { key: keyof SaleRow; label: string }[]
                ).map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-[#a3a3a3] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#f5f5f5] transition-colors select-none"
                    onClick={() => handleSort(col.key)}
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-[#a3a3a3] uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filtered.map((item) => {
                const daysActive = differenceInDays(
                  new Date(),
                  parseISO(item.date)
                );
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#ffffff04] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#f5f5f5] whitespace-nowrap max-w-[200px] truncate">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="neutral">{item.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                      {item.platform}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatCurrency(item.buy_price)}
                    </td>
                    <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                      {format(parseISO(item.date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          daysActive > 30
                            ? "text-warning"
                            : "text-[#a3a3a3]"
                        }
                      >
                        {daysActive}d
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setMarkSoldItem(item)}
                        >
                          Mark Sold
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.item_name}`}
                        >
                          <svg
                            className="w-4 h-4 text-loss"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(sale) => setItems((prev) => [...prev, sale])}
      />
      <MarkSoldModal
        open={!!markSoldItem}
        item={markSoldItem}
        onClose={() => setMarkSoldItem(null)}
        onSold={(updated) =>
          setItems((prev) => prev.filter((i) => i.id !== updated.id))
        }
      />

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 md:hidden z-30">
        <button
          onClick={() => setAddOpen(true)}
          className="w-14 h-14 rounded-2xl bg-profit text-black flex items-center justify-center shadow-lg hover:bg-green-400 active:scale-95 transition-all"
          aria-label="Add inventory item"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6"><TableSkeleton rows={6} /></div>}>
      <InventoryContent />
    </Suspense>
  );
}
