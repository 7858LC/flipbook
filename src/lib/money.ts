export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number | string): number {
  const num = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(dollars);
  }
  return formatCurrency(cents);
}

export function calculateNetProfit(
  buyPrice: number,
  sellPrice: number,
  platformFeePct: number,
  shippingCost: number,
  otherCosts: number
): number {
  const platformFee = Math.round((sellPrice * platformFeePct) / 100);
  return sellPrice - buyPrice - platformFee - shippingCost - otherCosts;
}

export function calculateMarginPct(
  buyPrice: number,
  netProfit: number
): number {
  if (buyPrice === 0) return 0;
  return (netProfit / buyPrice) * 100;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
