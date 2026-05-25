"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { QuickAddFAB } from "@/components/dashboard/QuickAddFAB";
import { Card } from "@/components/ui/Card";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { MonthlyProfitChart } from "@/components/charts/MonthlyProfitChart";
import { PlatformBreakdown } from "@/components/charts/PlatformBreakdown";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { SheetHealthBanner } from "@/components/dashboard/SheetHealthBanner";
import { formatCurrencyCompact } from "@/lib/money";
import type {
  SaleRow,
  ExpenseRow,
  DashboardMetrics,
  RecentTransaction,
  QuarterData,
} from "@/types";
import {
  startOfMonth,
  startOfYear,
  isWithinInterval,
  startOfQuarter,
  endOfQuarter,
  parseISO,
} from "date-fns";

function computeMetrics(
  sales: SaleRow[],
  expenses: ExpenseRow[],
  taxRate: number
): { metrics: DashboardMetrics; recent: RecentTransaction[]; quarters: QuarterData[] } {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const soldSales = sales.filter((s) => s.status === "sold");
  const activeSales = sales.filter((s) => s.status === "active");

  const monthlyRevenue = soldSales
    .filter((s) => parseISO(s.date) >= monthStart)
    .reduce((sum, s) => sum + s.net_profit, 0);

  const ytdRevenue = soldSales
    .filter((s) => parseISO(s.date) >= yearStart)
    .reduce((sum, s) => sum + s.net_profit, 0);

  const activeInventoryValue = activeSales.reduce(
    (sum, s) => sum + s.buy_price,
    0
  );

  // Quarterly tax estimate (current quarter)
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);
  const qRevenue = soldSales
    .filter((s) =>
      isWithinInterval(parseISO(s.date), { start: qStart, end: qEnd })
    )
    .reduce((sum, s) => sum + s.net_profit, 0);
  const qDeductible = expenses
    .filter(
      (e) =>
        e.tax_deductible === "yes" &&
        isWithinInterval(parseISO(e.date), { start: qStart, end: qEnd })
    )
    .reduce((sum, e) => sum + e.amount, 0);
  const qTaxable = Math.max(0, qRevenue - qDeductible);
  const qTaxEst = Math.round((qTaxable * taxRate) / 100);

  // Build quarters for tax page
  const year = now.getFullYear();
  const quarters: QuarterData[] = [1, 2, 3, 4].map((q) => {
    const qS = startOfQuarter(new Date(year, (q - 1) * 3, 1));
    const qE = endOfQuarter(new Date(year, (q - 1) * 3, 1));
    const rev = soldSales
      .filter((s) =>
        isWithinInterval(parseISO(s.date), { start: qS, end: qE })
      )
      .reduce((sum, s) => sum + s.net_profit, 0);
    const ded = expenses
      .filter(
        (e) =>
          e.tax_deductible === "yes" &&
          isWithinInterval(parseISO(e.date), { start: qS, end: qE })
      )
      .reduce((sum, e) => sum + e.amount, 0);
    const taxable = Math.max(0, rev - ded);
    return {
      quarter: q,
      year,
      gross_revenue: Math.max(0, rev),
      deductible_expenses: ded,
      estimated_taxable_income: taxable,
      estimated_tax_owed: Math.round((taxable * taxRate) / 100),
    };
  });

  const recentSales: RecentTransaction[] = soldSales
    .slice(-5)
    .map((s) => ({
      id: s.id,
      type: "sale" as const,
      date: s.date,
      description: s.item_name,
      amount: s.net_profit,
      platform: s.platform,
    }));

  const recentExpenses: RecentTransaction[] = expenses.slice(-5).map((e) => ({
    id: e.id,
    type: "expense" as const,
    date: e.date,
    description: e.description,
    amount: e.amount,
  }));

  const recent = [...recentSales, ...recentExpenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return {
    metrics: {
      monthly_revenue: monthlyRevenue,
      ytd_revenue: ytdRevenue,
      active_inventory_count: activeSales.length,
      active_inventory_value: activeInventoryValue,
      quarterly_tax_estimate: qTaxEst,
    },
    recent,
    quarters,
  };
}

export default function DashboardPage() {
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
        if (!sRes.ok || !eRes.ok || !stRes.ok) {
          setError("Failed to load dashboard data");
          return;
        }
        const [sJson, eJson, stJson] = await Promise.all([
          sRes.json() as Promise<{ data: SaleRow[] }>,
          eRes.json() as Promise<{ data: ExpenseRow[] }>,
          stRes.json() as Promise<{ data: { tax_rate: number } }>,
        ]);
        setSales(sJson.data ?? []);
        setExpenses(eJson.data ?? []);
        setTaxRate(stJson.data?.tax_rate ?? 25);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="px-4 md:px-6 py-6">
        <p className="text-loss text-sm">{error}</p>
      </div>
    );
  }

  const { metrics, recent } = computeMetrics(sales, expenses, taxRate);
  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const ytdProfitSign = metrics.ytd_revenue >= 0;

  return (
    <div className="max-w-5xl mx-auto">
      <SheetHealthBanner />
    <div className="px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
        <p className="text-sm text-[#525252] mt-0.5">{currentMonth}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          title="This Month"
          value={formatCurrencyCompact(metrics.monthly_revenue)}
          subtext="Net profit"
          accent={metrics.monthly_revenue >= 0 ? "profit" : "loss"}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          title="YTD Revenue"
          value={formatCurrencyCompact(metrics.ytd_revenue)}
          subtext="Year to date"
          accent={ytdProfitSign ? "profit" : "loss"}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <MetricCard
          title="Active Items"
          value={String(metrics.active_inventory_count)}
          subtext={`~${formatCurrencyCompact(metrics.active_inventory_value)} invested`}
          accent="neutral"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <MetricCard
          title="Q Tax Estimate"
          value={formatCurrencyCompact(metrics.quarterly_tax_estimate)}
          subtext={`At ${taxRate}% rate`}
          accent={metrics.quarterly_tax_estimate > 0 ? "warning" : "neutral"}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#f5f5f5]">Recent Activity</h2>
          <a href="/sales" className="text-xs text-[#a3a3a3] hover:text-profit transition-colors">
            View all →
          </a>
        </div>
        <RecentTransactions transactions={recent} />
      </Card>

      {/* Charts Section */}
      <Card>
        <h2 className="font-semibold text-[#f5f5f5] mb-1">Monthly Profit</h2>
        <p className="text-xs text-[#525252] mb-4">Last 6 months — green is profit, red is a loss</p>
        <MonthlyProfitChart sales={sales} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="font-semibold text-[#f5f5f5] mb-1">Sales by Platform</h2>
          <p className="text-xs text-[#525252] mb-4">Where your money is coming from</p>
          <PlatformBreakdown sales={sales} />
        </Card>

        <Card>
          <h2 className="font-semibold text-[#f5f5f5] mb-1">Expenses by Category</h2>
          <p className="text-xs text-[#525252] mb-4">Where your money is going</p>
          <ExpensePieChart expenses={expenses} />
        </Card>
      </div>

      <QuickAddFAB />
    </div>
    </div>
  );
}
