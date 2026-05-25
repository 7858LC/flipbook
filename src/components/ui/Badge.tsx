import { clsx } from "clsx";

type BadgeVariant = "profit" | "loss" | "warning" | "neutral" | "active";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  profit: "bg-green-500/15 text-green-400 border-green-500/20",
  loss: "bg-red-500/15 text-red-400 border-red-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  neutral: "bg-[#ffffff10] text-[#a3a3a3] border-[#ffffff15]",
  active: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
