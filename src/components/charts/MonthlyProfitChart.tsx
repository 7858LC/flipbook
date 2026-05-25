"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns";
import type { SaleRow } from "@/types";

interface Props {
  sales: SaleRow[];
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  const dollars = Math.abs(val / 100).toFixed(2);
  const isLoss = val < 0;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#a3a3a3] mb-0.5">{label}</p>
      <p className={isLoss ? "text-loss font-semibold" : "text-profit font-semibold"}>
        {isLoss ? "-" : ""}${dollars}
      </p>
    </div>
  );
}

export function MonthlyProfitChart({ sales }: Props) {
  const now = new Date();

  const data = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const profit = sales
      .filter(
        (s) =>
          s.status === "sold" &&
          isWithinInterval(parseISO(s.date), { start, end })
      )
      .reduce((sum, s) => sum + s.net_profit, 0);

    return {
      month: format(monthDate, "MMM"),
      profit,
    };
  });

  const hasData = data.some((d) => d.profit !== 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-40 text-[#525252] text-sm">
        No sales data yet — add your first sale to see your trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            `$${Math.abs(v / 100) >= 1000 ? (Math.abs(v) / 100000).toFixed(1) + "k" : Math.abs(v / 100)}`
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"}
              fillOpacity={entry.profit === 0 ? 0.2 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
