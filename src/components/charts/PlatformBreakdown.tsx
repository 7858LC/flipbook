"use client";

import type { SaleRow } from "@/types";
import { formatCurrency } from "@/lib/money";

interface Props {
  sales: SaleRow[];
}

const PLATFORM_COLORS: Record<string, string> = {
  eBay: "#f59e0b",
  Facebook: "#3b82f6",
  Poshmark: "#ec4899",
  Mercari: "#8b5cf6",
  Etsy: "#f97316",
  OfferUp: "#06b6d4",
  Amazon: "#22c55e",
  Other: "#a3a3a3",
};

export function PlatformBreakdown({ sales }: Props) {
  const sold = sales.filter((s) => s.status === "sold");

  if (sold.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#525252] text-sm">
        No sales yet
      </div>
    );
  }

  // Group by platform
  const byPlatform: Record<string, { revenue: number; count: number }> = {};
  for (const sale of sold) {
    const platform = sale.platform || "Other";
    if (!byPlatform[platform]) byPlatform[platform] = { revenue: 0, count: 0 };
    byPlatform[platform].revenue += sale.net_profit;
    byPlatform[platform].count += 1;
  }

  const entries = Object.entries(byPlatform)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const max = Math.max(...entries.map(([, v]) => v.revenue), 1);

  return (
    <div className="space-y-3">
      {entries.map(([platform, { revenue, count }]) => {
        const pct = Math.max(4, (revenue / max) * 100);
        const color = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.Other;
        return (
          <div key={platform}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[#f5f5f5] font-medium">{platform}</span>
              <span className="text-xs text-[#a3a3a3]">
                {formatCurrency(revenue)} · {count} sale{count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
