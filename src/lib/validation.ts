import { z } from "zod";

export const addSaleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  item_name: z.string().min(1, "Item name is required").max(200),
  category: z.string().min(1, "Category is required"),
  platform: z.string().min(1, "Platform is required"),
  buy_price: z.number().min(0, "Buy price must be >= 0"),
  sell_price: z.number().min(0).optional().default(0),
  platform_fee_pct: z.number().min(0).max(100),
  shipping_cost: z.number().min(0).optional().default(0),
  other_costs: z.number().min(0).optional().default(0),
  notes: z.string().max(500).optional().default(""),
  status: z.enum(["active", "sold"]).optional().default("active"),
});

export const updateSaleSchema = addSaleSchema.partial().extend({
  id: z.string().min(1),
});

export const markSoldSchema = z.object({
  id: z.string().min(1),
  sell_price: z.number().min(0, "Sell price must be >= 0"),
  platform: z.string().min(1, "Platform is required"),
  platform_fee_pct: z.number().min(0).max(100),
  shipping_cost: z.number().min(0).optional().default(0),
  other_costs: z.number().min(0).optional().default(0),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(500).optional().default(""),
});

export const addExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200),
  amount: z.number().min(0.01, "Amount must be > 0"),
  tax_deductible: z.enum(["yes", "no"]),
  receipt_url: z.string().url().optional().or(z.literal("")).default(""),
  notes: z.string().max(500).optional().default(""),
});

export const updateExpenseSchema = addExpenseSchema.partial().extend({
  id: z.string().min(1),
});

export const updateSettingsSchema = z.object({
  tax_rate: z.number().min(0).max(100).optional(),
  business_name: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  stripe_customer_id: z.string().optional(),
  stripe_subscription_id: z.string().optional(),
  subscription_status: z.string().optional(),
  trial_end_date: z.string().optional(),
});

export type AddSaleInput = z.infer<typeof addSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
export type MarkSoldInput = z.infer<typeof markSoldSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
