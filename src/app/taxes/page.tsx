"use client";

import { useEffect, useState } from "react";
import { TaxBreakdown } from "@/components/taxes/TaxBreakdown";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import type { SaleRow, ExpenseRow, QuarterData } from "@/types";
import {
  startOfQuarter,
  endOfQuarter,
  isWithinInterval,
  parseISO,
} from "date-fns";

function buildQuarters(
  sales: SaleRow[],
  expenses: ExpenseRow[],
  taxRate: number,
  year: number
): QuarterData[] {
  return [1, 2, 3, 4].map((q) => {
    const qStart = startOfQuarter(new Date(year, (q - 1) * 3, 1));
    const qEnd = endOfQuarter(new Date(year, (q - 1) * 3, 1));

    const revenue = sales
      .filter(
        (s) =>
          s.status === "sold" &&
          isWithinInterval(parseISO(s.date), { start: qStart, end: qEnd })
      )
      .reduce((sum, s) => sum + s.net_profit, 0);

    const deductible = expenses
      .filter(
        (e) =>
          e.tax_deductible === "yes" &&
          isWithinInterval(parseISO(e.date), { start: qStart, end: qEnd })
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const taxable = Math.max(0, revenue - deductible);

    return {
      quarter: q,
      year,
      gross_revenue: Math.max(0, revenue),
      deductible_expenses: deductible,
      estimated_taxable_income: taxable,
      estimated_tax_owed: Math.round((taxable * taxRate) / 100),
    };
  });
}

export default function TaxesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [taxRate, setTaxRate] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [sRes, eRes, stRes] = await Promise.all([
          fetch("/api/sheets/sales"),
          fetch("/api/sheets/expenses"),
          fetch("/api/sheets/settings"),
        ]);
        if (!sRes.ok || !eRes.ok || !stRes.ok) throw new Error("Failed");
        const [sJson, eJson, stJson] = await Promise.all([
          sRes.json() as Promise<{ data: SaleRow[] }>,
          eRes.json() as Promise<{ data: ExpenseRow[] }>,
          stRes.json() as Promise<{ data: { tax_rate: number } }>,
        ]);
        setSales(sJson.data ?? []);
        setExpenses(eJson.data ?? []);
        setTaxRate(stJson.data?.tax_rate ?? 25);
      } catch {
        setError("Failed to load tax data");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="px-4 py-6"><p className="text-loss text-sm">{error}</p></div>;

  const year = new Date().getFullYear();
  const quarters = buildQuarters(sales, expenses, taxRate, year);
  const totalTaxOwed = quarters.reduce((s, q) => s + q.estimated_tax_owed, 0);

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Tax Estimates</h1>
        <p className="text-sm text-[#525252] mt-0.5">
          {year} · {taxRate}% rate ·{" "}
          <a href="/settings" className="text-[#a3a3a3] hover:text-profit transition-colors">
            Adjust rate in Settings
          </a>
        </p>
      </div>

      <TaxBreakdown
        quarters={quarters}
        taxRate={taxRate}
        totalReserve={totalTaxOwed}
      />
    </div>
  );
}
