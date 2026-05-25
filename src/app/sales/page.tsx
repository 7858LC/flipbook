"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, SalesEmptyIcon } from "@/components/ui/EmptyState";
import { formatCurrency, formatPercent, calculateMarginPct } from "@/lib/money";
import type { SaleRow } from "@/types";
import { DEFAULT_CATEGORIES, DEFAULT_PLATFORM_FEES } from "@/types";
import { format, parseISO, isWithinInterval } from "date-fns";

const ALL = { value: "", label: "All" };
const CATEGORY_OPTIONS = [ALL, ...DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))];
const PLATFORM_OPTIONS = [ALL, ...DEFAULT_PLATFORM_FEES.map((p) => ({ value: p.name, label: p.name }))];

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<keyof SaleRow>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/sales");
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { data: SaleRow[] };
      setSales((json.data ?? []).filter((s) => s.status === "sold"));
    } catch {
      setError("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleSort(key: keyof SaleRow) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function handleExport() {
    window.location.href = "/api/sheets/export";
  }

  const filtered = sales
    .filter((s) => !categoryFilter || s.category === categoryFilter)
    .filter((s) => !platformFilter || s.platform === platformFilter)
    .filter((s) => {
      if (!dateFrom && !dateTo) return true;
      try {
        const d = parseISO(s.date);
        const from = dateFrom ? parseISO(dateFrom) : new Date(0);
        const to = dateTo ? parseISO(dateTo) : new Date(8640000000000000);
        return isWithinInterval(d, { start: from, end: to });
      } catch { return true; }
    })
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totals = {
    buy: filtered.reduce((s, i) => s + i.buy_price, 0),
    sell: filtered.reduce((s, i) => s + i.sell_price, 0),
    profit: filtered.reduce((s, i) => s + i.net_profit, 0),
    avgDays: filtered.length
      ? Math.round(filtered.reduce((s, i) => s + i.days_to_sell, 0) / filtered.length)
      : 0,
  };

  function SortIcon({ col }: { col: keyof SaleRow }) {
    if (col !== sortKey) return <span className="text-[#3a3a3a] ml-1" aria-hidden="true">↕</span>;
    return <span className="text-profit ml-1" aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Sales</h1>
          <p className="text-sm text-[#525252] mt-0.5">
            {filtered.length} sales · {formatCurrency(totals.profit)} net profit
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-36">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={CATEGORY_OPTIONS} />
        </div>
        <div className="w-44">
          <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} options={PLATFORM_OPTIONS} />
        </div>
        <div className="w-36">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
        </div>
        <div className="w-36">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="text-loss text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SalesEmptyIcon />}
          title="No sales yet"
          description="Mark inventory items as sold to see them here."
          action={{ label: "Go to Inventory", onClick: () => { window.location.href = "/inventory"; } }}
        />
      ) : (
        <>
          <div className="table-scroll rounded-xl border border-[#2a2a2a] sticky-header zebra mb-4">
            <table className="min-w-full text-sm" role="grid">
              <thead>
                <tr className="bg-surface">
                  {(
                    [
                      { key: "date", label: "Date Sold" },
                      { key: "item_name", label: "Item" },
                      { key: "platform", label: "Platform" },
                      { key: "buy_price", label: "Buy" },
                      { key: "sell_price", label: "Sell" },
                      { key: "net_profit", label: "Net Profit" },
                      { key: "platform_fee_pct", label: "Margin %" },
                      { key: "days_to_sell", label: "Days to Sell" },
                    ] as { key: keyof SaleRow; label: string }[]
                  ).map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-[#a3a3a3] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#f5f5f5] select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filtered.map((sale) => {
                  const margin = calculateMarginPct(sale.buy_price, sale.net_profit);
                  return (
                    <tr key={sale.id} className="hover:bg-[#ffffff04]">
                      <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                        {format(parseISO(sale.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#f5f5f5] whitespace-nowrap max-w-[160px] truncate">
                        {sale.item_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="neutral">{sale.platform}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                        {formatCurrency(sale.buy_price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatCurrency(sale.sell_price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={sale.net_profit >= 0 ? "text-profit font-semibold" : "text-loss font-semibold"}>
                          {sale.net_profit >= 0 ? "+" : ""}
                          {formatCurrency(sale.net_profit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={margin >= 0 ? "text-profit" : "text-loss"}>
                          {formatPercent(margin)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                        {sale.days_to_sell}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-[#2a2a2a]">
                <tr className="bg-surface font-semibold">
                  <td className="px-4 py-3 text-xs text-[#a3a3a3] uppercase" colSpan={3}>
                    Totals / Avg
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(totals.buy)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(totals.sell)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={totals.profit >= 0 ? "text-profit" : "text-loss"}>
                      {totals.profit >= 0 ? "+" : ""}
                      {formatCurrency(totals.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={totals.profit >= 0 ? "text-profit" : "text-loss"}>
                      {formatPercent(calculateMarginPct(totals.buy, totals.profit))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                    avg {totals.avgDays}d
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-[#525252] text-right">
            {filtered.length} of {sales.length} sales shown
          </p>
        </>
      )}
    </div>
  );
}

