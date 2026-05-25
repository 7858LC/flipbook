"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/money";
import {
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  isWithinInterval, parseISO, format,
} from "date-fns";
import type { SaleRow, ExpenseRow } from "@/types";

type Period = "q1" | "q2" | "q3" | "q4" | "year";

const PERIODS: { value: Period; label: string }[] = [
  { value: "q1", label: "Q1 (Jan – Mar)" },
  { value: "q2", label: "Q2 (Apr – Jun)" },
  { value: "q3", label: "Q3 (Jul – Sep)" },
  { value: "q4", label: "Q4 (Oct – Dec)" },
  { value: "year", label: "Full Year" },
];

function getPeriodRange(period: Period, year: number): { start: Date; end: Date } {
  if (period === "year") return { start: startOfYear(new Date(year, 0)), end: endOfYear(new Date(year, 0)) };
  const q = parseInt(period[1]) - 1;
  const d = new Date(year, q * 3, 1);
  return { start: startOfQuarter(d), end: endOfQuarter(d) };
}

export default function ReportsPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [taxRate, setTaxRate] = useState(25);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("q1");
  const [year, setYear] = useState(new Date().getFullYear());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sheets/sales").then(r => r.json()) as Promise<{ data: SaleRow[] }>,
      fetch("/api/sheets/expenses").then(r => r.json()) as Promise<{ data: ExpenseRow[] }>,
      fetch("/api/sheets/settings").then(r => r.json()) as Promise<{ data: { tax_rate: number } }>,
    ]).then(([s, e, st]) => {
      setSales(s.data ?? []);
      setExpenses(e.data ?? []);
      setTaxRate(st.data?.tax_rate ?? 25);
    }).finally(() => setLoading(false));
  }, []);

  const { start, end } = getPeriodRange(period, year);
  const label = period === "year" ? `${year} Full Year` : `${year} ${PERIODS.find(p => p.value === period)?.label}`;

  const periodSales = sales.filter(s =>
    s.status === "sold" && isWithinInterval(parseISO(s.date), { start, end })
  );
  const periodExpenses = expenses.filter(e =>
    isWithinInterval(parseISO(e.date), { start, end })
  );

  const grossRevenue = periodSales.reduce((s, r) => s + r.sell_price, 0);
  const totalFees = periodSales.reduce((s, r) => s + Math.round(r.sell_price * r.platform_fee_pct / 100), 0);
  const totalShipping = periodSales.reduce((s, r) => s + r.shipping_cost, 0);
  const totalCOGS = periodSales.reduce((s, r) => s + r.buy_price, 0);
  const totalOther = periodSales.reduce((s, r) => s + r.other_costs, 0);
  const netProfit = periodSales.reduce((s, r) => s + r.net_profit, 0);
  const deductibleExpenses = periodExpenses.filter(e => e.tax_deductible === "yes").reduce((s, e) => s + e.amount, 0);
  const taxableIncome = Math.max(0, netProfit - deductibleExpenses);
  const estimatedTax = Math.round(taxableIncome * taxRate / 100);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1a1a1a] rounded-lg w-48" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print styles injected globally */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report { position: fixed; inset: 0; padding: 24px; background: white; color: black; }
          .no-print { display: none !important; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .print-table th { background: #f3f4f6; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; }
          .print-table td { padding: 5px 8px; border: 1px solid #e5e7eb; }
        }
      `}</style>

      <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
        {/* Controls */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#f5f5f5]">PDF Reports</h1>
            <p className="text-sm text-[#525252] mt-0.5">Generate a report for your records or accountant</p>
          </div>
          <Button onClick={handlePrint} className="shrink-0">
            ⬇ Download PDF
          </Button>
        </div>

        <div className="no-print flex flex-wrap gap-3 mb-6">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 text-sm"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-[#22c55e] text-[#0f0f0f]"
                    : "bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Report */}
        <div id="print-report" ref={printRef}>
          {/* Header */}
          <Card className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[#f5f5f5]">FlipBook — Profit &amp; Loss Report</h2>
                <p className="text-sm text-[#a3a3a3] mt-1">{label}</p>
                <p className="text-xs text-[#525252] mt-0.5">Generated {format(new Date(), "MMMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#525252]">Tax Rate Used</p>
                <p className="text-lg font-bold text-[#f5f5f5]">{taxRate}%</p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="mb-4">
            <h3 className="font-semibold text-[#f5f5f5] mb-4">Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Gross Revenue", value: grossRevenue, color: "text-[#f5f5f5]" },
                { label: "Cost of Goods Sold", value: -totalCOGS, color: "text-loss" },
                { label: "Platform Fees", value: -totalFees, color: "text-loss" },
                { label: "Shipping Costs", value: -totalShipping, color: "text-loss" },
                { label: "Other Costs", value: -totalOther, color: "text-loss" },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm py-1 border-b border-[#2a2a2a]">
                  <span className="text-[#a3a3a3]">{row.label}</span>
                  <span className={row.color}>{row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2">
                <span className="text-[#f5f5f5]">Net Profit</span>
                <span className={netProfit >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(netProfit)}</span>
              </div>
            </div>
          </Card>

          {/* Tax Estimate */}
          <Card className="mb-4">
            <h3 className="font-semibold text-[#f5f5f5] mb-4">Tax Estimate</h3>
            <div className="space-y-2">
              {[
                { label: "Net Profit", value: netProfit },
                { label: "Deductible Expenses", value: -deductibleExpenses },
                { label: "Taxable Income", value: taxableIncome },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm py-1 border-b border-[#2a2a2a]">
                  <span className="text-[#a3a3a3]">{row.label}</span>
                  <span className="text-[#f5f5f5]">{row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2">
                <span className="text-[#f5f5f5]">Estimated Tax Owed</span>
                <span className="text-warning font-bold text-lg">{formatCurrency(estimatedTax)}</span>
              </div>
            </div>
            <p className="text-xs text-[#525252] mt-4">
              ⚠ This is an estimate only. Consult a tax professional for advice specific to your situation.
            </p>
          </Card>

          {/* Sales List */}
          {periodSales.length > 0 && (
            <Card className="mb-4">
              <h3 className="font-semibold text-[#f5f5f5] mb-4">Sales ({periodSales.length} items)</h3>
              <div className="overflow-x-auto">
                <table className="print-table w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      {["Date", "Item", "Platform", "Sold For", "Net Profit"].map(h => (
                        <th key={h} className="text-left py-2 px-1 text-[#525252] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodSales.map(s => (
                      <tr key={s.id} className="border-b border-[#2a2a2a]/50">
                        <td className="py-2 px-1 text-[#a3a3a3]">{s.date}</td>
                        <td className="py-2 px-1 text-[#f5f5f5]">{s.item_name}</td>
                        <td className="py-2 px-1 text-[#a3a3a3]">{s.platform}</td>
                        <td className="py-2 px-1 text-[#f5f5f5]">{formatCurrency(s.sell_price)}</td>
                        <td className={`py-2 px-1 font-medium ${s.net_profit >= 0 ? "text-profit" : "text-loss"}`}>
                          {formatCurrency(s.net_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Expenses List */}
          {periodExpenses.length > 0 && (
            <Card className="mb-4">
              <h3 className="font-semibold text-[#f5f5f5] mb-4">Expenses ({periodExpenses.length} items)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      {["Date", "Category", "Description", "Amount", "Tax Deductible"].map(h => (
                        <th key={h} className="text-left py-2 px-1 text-[#525252] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodExpenses.map(e => (
                      <tr key={e.id} className="border-b border-[#2a2a2a]/50">
                        <td className="py-2 px-1 text-[#a3a3a3]">{e.date}</td>
                        <td className="py-2 px-1 text-[#a3a3a3]">{e.category}</td>
                        <td className="py-2 px-1 text-[#f5f5f5]">{e.description}</td>
                        <td className="py-2 px-1 text-loss">{formatCurrency(e.amount)}</td>
                        <td className="py-2 px-1">
                          <span className={e.tax_deductible === "yes" ? "text-profit" : "text-[#525252]"}>
                            {e.tax_deductible === "yes" ? "✓ Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {periodSales.length === 0 && periodExpenses.length === 0 && (
            <Card>
              <p className="text-center text-[#525252] py-8">No data for this period. Add some sales or expenses first.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
