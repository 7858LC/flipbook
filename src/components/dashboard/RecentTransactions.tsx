import { formatCurrency } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import type { RecentTransaction } from "@/types";
import { format, parseISO } from "date-fns";

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-[#525252] text-center py-8">
        No recent transactions
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#2a2a2a]" role="list">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                tx.type === "sale"
                  ? "bg-green-500/10"
                  : "bg-red-500/10"
              }`}
              aria-hidden="true"
            >
              {tx.type === "sale" ? (
                <svg className="w-4 h-4 text-profit" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-loss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#f5f5f5] truncate">
                {tx.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-[#525252]">
                  {format(parseISO(tx.date), "MMM d")}
                </p>
                {tx.platform && (
                  <Badge variant="neutral" className="text-[10px]">
                    {tx.platform}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <span
            className={`text-sm font-semibold flex-shrink-0 ${
              tx.type === "sale" && tx.amount >= 0
                ? "text-profit"
                : "text-loss"
            }`}
          >
            {tx.type === "sale"
              ? (tx.amount >= 0 ? "+" : "") + formatCurrency(tx.amount)
              : "-" + formatCurrency(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
