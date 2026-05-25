import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/money";
import type { QuarterData } from "@/types";

interface TaxBreakdownProps {
  quarters: QuarterData[];
  taxRate: number;
  totalReserve: number;
}

const QUARTER_LABELS = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];

export function TaxBreakdown({ quarters, taxRate, totalReserve }: TaxBreakdownProps) {
  const totalGross = quarters.reduce((s, q) => s + q.gross_revenue, 0);
  const totalDeductible = quarters.reduce((s, q) => s + q.deductible_expenses, 0);
  const totalTaxable = quarters.reduce((s, q) => s + q.estimated_taxable_income, 0);
  const totalTax = quarters.reduce((s, q) => s + q.estimated_tax_owed, 0);

  return (
    <div className="space-y-4">
      {quarters.map((q) => (
        <Card key={q.quarter}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#f5f5f5]">
              {QUARTER_LABELS[q.quarter - 1]}
            </h3>
            <span
              className={`text-sm font-semibold ${
                q.estimated_tax_owed > 0 ? "text-warning" : "text-[#525252]"
              }`}
            >
              {q.estimated_tax_owed > 0
                ? `Est. ${formatCurrency(q.estimated_tax_owed)} owed`
                : "No tax owed"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[#525252] text-xs mb-0.5">Gross Revenue</p>
              <p className="font-medium text-profit">
                {formatCurrency(q.gross_revenue)}
              </p>
            </div>
            <div>
              <p className="text-[#525252] text-xs mb-0.5">Deductions</p>
              <p className="font-medium text-loss">
                -{formatCurrency(q.deductible_expenses)}
              </p>
            </div>
            <div>
              <p className="text-[#525252] text-xs mb-0.5">Taxable Income</p>
              <p className="font-medium">{formatCurrency(q.estimated_taxable_income)}</p>
            </div>
            <div>
              <p className="text-[#525252] text-xs mb-0.5">Est. Tax ({taxRate}%)</p>
              <p className={`font-bold ${q.estimated_tax_owed > 0 ? "text-warning" : "text-[#525252]"}`}>
                {formatCurrency(q.estimated_tax_owed)}
              </p>
            </div>
          </div>
        </Card>
      ))}

      <Card className="border-[#2a2a2a] bg-[#0f0f0f]">
        <h3 className="font-semibold mb-4 text-[#f5f5f5]">Annual Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[#525252] text-xs mb-0.5">Total Revenue</p>
            <p className="font-bold text-lg text-profit">
              {formatCurrency(totalGross)}
            </p>
          </div>
          <div>
            <p className="text-[#525252] text-xs mb-0.5">Total Deductions</p>
            <p className="font-bold text-lg text-loss">
              -{formatCurrency(totalDeductible)}
            </p>
          </div>
          <div>
            <p className="text-[#525252] text-xs mb-0.5">Taxable Income</p>
            <p className="font-bold text-lg">{formatCurrency(totalTaxable)}</p>
          </div>
          <div>
            <p className="text-[#525252] text-xs mb-0.5">Est. Tax Owed</p>
            <p className="font-bold text-lg text-warning">
              {formatCurrency(totalTax)}
            </p>
          </div>
        </div>
      </Card>

      {totalReserve > 0 && (
        <Card className="border-warning/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
              />
            </svg>
            <div>
              <p className="font-semibold text-warning">
                Set aside {formatCurrency(totalReserve)}
              </p>
              <p className="text-sm text-[#a3a3a3] mt-1">
                Based on your YTD income and {taxRate}% estimated tax rate. This
                is the total recommended reserve across all quarters.
              </p>
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-[#525252] text-center px-4">
        These are estimates only. Consult a qualified tax professional before
        filing. FlipBook does not provide tax advice.
      </p>
    </div>
  );
}
