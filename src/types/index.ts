export interface SaleRow {
  id: string;
  date: string;
  item_name: string;
  category: string;
  platform: string;
  buy_price: number;
  sell_price: number;
  platform_fee_pct: number;
  shipping_cost: number;
  other_costs: number;
  net_profit: number;
  days_to_sell: number;
  notes: string;
  status: "active" | "sold";
}

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  tax_deductible: "yes" | "no";
  receipt_url: string;
  notes: string;
}

export interface Settings {
  tax_rate: number;
  business_name: string;
  state: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_status: string;
  trial_end_date: string;
  spreadsheet_id: string;
}

export interface PlatformFee {
  name: string;
  fee_pct: number;
}

export const DEFAULT_PLATFORM_FEES: PlatformFee[] = [
  { name: "eBay", fee_pct: 12.9 },
  { name: "Etsy", fee_pct: 6.5 },
  { name: "Facebook Marketplace", fee_pct: 0 },
  { name: "Poshmark", fee_pct: 20 },
  { name: "Amazon", fee_pct: 15 },
  { name: "Other", fee_pct: 0 },
];

export const DEFAULT_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Tools",
  "Furniture",
  "Books",
  "Collectibles",
  "Sporting Goods",
  "Other",
];

export interface QuarterData {
  quarter: number;
  year: number;
  gross_revenue: number;
  deductible_expenses: number;
  estimated_taxable_income: number;
  estimated_tax_owed: number;
}

export interface DashboardMetrics {
  monthly_revenue: number;
  ytd_revenue: number;
  active_inventory_count: number;
  active_inventory_value: number;
  quarterly_tax_estimate: number;
}

export interface RecentTransaction {
  id: string;
  type: "sale" | "expense";
  date: string;
  description: string;
  amount: number;
  platform?: string;
}

export type ApiError = {
  error: string;
  code?: string;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface SubscriptionInfo {
  status: string;
  trialEndDate: string | null;
  isActive: boolean;
  isTrialing: boolean;
}

export type SortDirection = "asc" | "desc";

export interface TableSort<T> {
  key: keyof T;
  direction: SortDirection;
}
