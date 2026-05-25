"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ExpenseRow } from "@/types";
import { formatCurrency } from "@/lib/money";

interface Props {
  expenses: ExpenseRow[];
}

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ec4899",
  "#8b5cf6", "#f97316", "#06b6d4", "#a3a3a3",
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#f5f5f5] font-medium">{payload[0]?.name}</p>
      <p className="text-[#a3a3a3]">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

export function ExpensePieChart({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[#525252] text-sm">
        No expenses yet
      </div>
    );
  }

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || "Other";
    byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
  }

  const data = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={52}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-1.5 min-w-0">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-[#a3a3a3] truncate flex-1">{entry.name}</span>
            <span className="text-xs text-[#f5f5f5] font-medium shrink-0">
              {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
