"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ExpensesEmptyIcon } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/money";
import type { ExpenseRow } from "@/types";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Suspense } from "react";

const DEDUCTIBLE_OPTIONS = [
  { value: "", label: "All" },
  { value: "yes", label: "Deductible Only" },
  { value: "no", label: "Non-Deductible" },
];

function ExpensesContent() {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [deductibleFilter, setDeductibleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<keyof ExpenseRow>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/expenses");
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { data: ExpenseRow[] };
      setExpenses(json.data ?? []);
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleSort(key: keyof ExpenseRow) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/sheets/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = expenses
    .filter((e) => !deductibleFilter || e.tax_deductible === deductibleFilter)
    .filter((e) => {
      if (!dateFrom && !dateTo) return true;
      try {
        const d = parseISO(e.date);
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

  const totalAll = filtered.reduce((s, e) => s + e.amount, 0);
  const totalDeductible = filtered
    .filter((e) => e.tax_deductible === "yes")
    .reduce((s, e) => s + e.amount, 0);

  function SortIcon({ col }: { col: keyof ExpenseRow }) {
    if (col !== sortKey) return <span className="text-[#3a3a3a] ml-1" aria-hidden="true">↕</span>;
    return <span className="text-profit ml-1" aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Expenses</h1>
          <p className="text-sm text-[#525252] mt-0.5">
            {filtered.length} expenses · {formatCurrency(totalAll)} total
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="md">
          + Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="flex flex-col">
          <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider mb-2">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-loss">{formatCurrency(totalAll)}</p>
        </Card>
        <Card className="flex flex-col">
          <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider mb-2">
            Tax Deductible
          </p>
          <p className="text-2xl font-bold text-profit">{formatCurrency(totalDeductible)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-44">
          <Select
            value={deductibleFilter}
            onChange={(e) => setDeductibleFilter(e.target.value)}
            options={DEDUCTIBLE_OPTIONS}
          />
        </div>
        <div className="w-36">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-36">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="text-loss text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ExpensesEmptyIcon />}
          title="No expenses yet"
          description="Track your business expenses to maximize tax deductions."
          action={{ label: "Add Expense", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="table-scroll rounded-xl border border-[#2a2a2a] sticky-header zebra">
          <table className="min-w-full text-sm" role="grid">
            <thead>
              <tr className="bg-surface">
                {(
                  [
                    { key: "date", label: "Date" },
                    { key: "category", label: "Category" },
                    { key: "description", label: "Description" },
                    { key: "amount", label: "Amount" },
                    { key: "tax_deductible", label: "Deductible" },
                  ] as { key: keyof ExpenseRow; label: string }[]
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
                <th className="px-4 py-3 text-right text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filtered.map((expense) => (
                <tr key={expense.id} className="hover:bg-[#ffffff04]">
                  <td className="px-4 py-3 text-[#a3a3a3] whitespace-nowrap">
                    {format(parseISO(expense.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="neutral">{expense.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#f5f5f5] max-w-[200px] truncate">
                    {expense.description}
                    {expense.notes && (
                      <span className="text-[#525252] text-xs ml-2">{expense.notes}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-loss whitespace-nowrap">
                    -{formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={expense.tax_deductible === "yes" ? "profit" : "neutral"}>
                      {expense.tax_deductible === "yes" ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#a3a3a3] hover:text-profit mr-3 transition-colors"
                      >
                        Receipt ↗
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-[#525252] hover:text-loss transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded"
                      aria-label={`Delete ${expense.description}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(expense) => setExpenses((prev) => [expense, ...prev])}
      />

      <div className="fixed bottom-20 right-4 md:hidden z-30">
        <button
          onClick={() => setAddOpen(true)}
          className="w-14 h-14 rounded-2xl bg-profit text-black flex items-center justify-center shadow-lg hover:bg-green-400 active:scale-95 transition-all"
          aria-label="Add expense"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6"><TableSkeleton rows={6} /></div>}>
      <ExpensesContent />
    </Suspense>
  );
}
