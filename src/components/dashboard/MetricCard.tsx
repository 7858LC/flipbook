import { Card } from "@/components/ui/Card";
import { clsx } from "clsx";

interface MetricCardProps {
  title: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  accent?: "profit" | "loss" | "warning" | "neutral";
  icon?: React.ReactNode;
}

const accentColors = {
  profit: "text-profit",
  loss: "text-loss",
  warning: "text-warning",
  neutral: "text-[#f5f5f5]",
};

export function MetricCard({
  title,
  value,
  subtext,
  accent = "neutral",
  icon,
}: MetricCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
          {title}
        </p>
        {icon && <span className="text-[#3a3a3a]">{icon}</span>}
      </div>
      <p className={clsx("text-2xl font-bold tracking-tight", accentColors[accent])}>
        {value}
      </p>
      {subtext && <p className="text-xs text-[#525252]">{subtext}</p>}
    </Card>
  );
}
