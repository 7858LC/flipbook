# FlipBook — Architecture

## Data Flow

```
Browser (Next.js Client Components)
        │
        ▼ fetch()
Next.js API Routes (/api/*)
        │
        ├── getServerSession() ──► NextAuth JWT (spreadsheetId, subscriptionStatus)
        │
        ├── Google Sheets API ──► Service Account Auth ──► User's Spreadsheet
        │         │
        │         └── Exponential backoff on 429/5xx
        │
        └── Stripe API ──► Checkout / Portal / Webhook
```

## Auth Flow

```
1. User visits app
2. Middleware (src/middleware.ts) checks NextAuth JWT
3. If no JWT → redirect to /auth/signin
4. If JWT but trial expired + no active sub → redirect to /subscribe
5. User signs in with Google OAuth
6. NextAuth jwt() callback fires on first login:
   a. lookupUserSpreadsheet(email) in registry
   b. If not found: createSpreadsheet(email) + registerUserSpreadsheet()
   c. getSettings(spreadsheetId) to fetch subscription status
   d. Store spreadsheetId, subscriptionStatus, trialEndDate in JWT
7. Session available via useSession() (client) or getServerSession() (server)
```

## Subscription Gate Logic

```
Middleware checks:
  subscriptionStatus === "active"          → full access
  subscriptionStatus === "trialing"
    + trialEndDate > now                   → full access
  otherwise                                → redirect /subscribe
                                            (/settings always allowed)
```

## Google Sheets Schema

### Sales Sheet (tab: "Sales")

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | id | string | nanoid() |
| B | date | string | ISO 8601 |
| C | item_name | string | |
| D | category | string | |
| E | platform | string | |
| F | buy_price | number | **cents** |
| G | sell_price | number | **cents** (0 if active) |
| H | platform_fee_pct | number | percentage e.g. 12.9 |
| I | shipping_cost | number | **cents** |
| J | other_costs | number | **cents** |
| K | net_profit | number | **cents** (auto-calculated) |
| L | days_to_sell | number | calculated on mark-sold |
| M | notes | string | |
| N | status | string | "active" or "sold" |

Net profit formula: `sell_price - buy_price - (sell_price × fee_pct/100) - shipping - other`

### Expenses Sheet (tab: "Expenses")

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | id | string | nanoid() |
| B | date | string | ISO 8601 |
| C | category | string | |
| D | description | string | |
| E | amount | number | **cents** |
| F | tax_deductible | string | "yes" or "no" |
| G | receipt_url | string | optional URL |
| H | notes | string | |

### Settings Sheet (tab: "Settings")

| Key | Value |
|-----|-------|
| tax_rate | number (default: 25) |
| business_name | string |
| state | string (2-letter) |
| stripe_customer_id | string |
| stripe_subscription_id | string |
| subscription_status | "trialing" \| "active" \| "canceled" \| "past_due" |
| trial_end_date | ISO 8601 string |
| spreadsheet_id | string (self-referential) |

### Categories Sheet (tab: "Categories")

| Col | Field |
|-----|-------|
| A | category_name |

Pre-populated: Electronics, Clothing, Tools, Furniture, Books, Collectibles, Sporting Goods, Other

### Master Registry Spreadsheet (separate, service-account owned)

Tab: "Users"

| Col | Field |
|-----|-------|
| A | email |
| B | spreadsheet_id |

## API Routes Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/auth/[...nextauth] | — | NextAuth handler |
| POST | /api/auth/[...nextauth] | — | NextAuth handler |
| POST | /api/sheets/init | Session | Create user spreadsheet |
| GET | /api/sheets/sales | Session | List all sales |
| POST | /api/sheets/sales | Session | Add sale (dollars in, cents stored) |
| PUT | /api/sheets/sales | Session | Update sale by id |
| DELETE | /api/sheets/sales?id= | Session | Delete sale by id |
| GET | /api/sheets/expenses | Session | List all expenses |
| POST | /api/sheets/expenses | Session | Add expense (dollars in) |
| PUT | /api/sheets/expenses | Session | Update expense by id |
| DELETE | /api/sheets/expenses?id= | Session | Delete expense by id |
| GET | /api/sheets/settings | Session | Get settings (Stripe IDs masked) |
| PUT | /api/sheets/settings | Session | Update settings |
| GET | /api/sheets/export | Session | Download CSV of all data |
| POST | /api/stripe/checkout | Session | Create Stripe Checkout session |
| POST | /api/stripe/portal | Session | Create Stripe Billing Portal session |
| POST | /api/stripe/webhook | Stripe sig | Handle subscription events |

## Money Handling

All monetary values are stored as **integers in cents** in Google Sheets.

- Display: `formatCurrency(cents)` → `$12.99`
- Input: user enters dollars → `dollarsToCents(input)` → cents stored
- Calculation: all arithmetic done in cents to avoid floating-point drift

## File Structure

```
src/
├── app/
│   ├── api/                    API routes
│   │   ├── auth/[...nextauth]/ NextAuth
│   │   ├── sheets/             CRUD for sales, expenses, settings, export
│   │   └── stripe/             checkout, portal, webhook
│   ├── auth/                   signin + error pages
│   ├── inventory/              Active inventory management
│   ├── sales/                  Sold items table + CSV export
│   ├── expenses/               Expense tracking
│   ├── taxes/                  Quarterly tax estimates
│   ├── settings/               Business config + billing
│   ├── subscribe/              Stripe plan selection + success
│   ├── layout.tsx              Root layout (nav injection)
│   ├── page.tsx                Dashboard
│   └── providers.tsx           SessionProvider wrapper
├── components/
│   ├── ui/                     Button, Card, Input, Select, Modal, etc.
│   ├── layout/                 TopNav, BottomNav, SubscriptionGate
│   ├── dashboard/              MetricCard, RecentTransactions, QuickAddFAB
│   ├── inventory/              AddItemModal, MarkSoldModal
│   ├── expenses/               AddExpenseModal
│   ├── taxes/                  TaxBreakdown
│   ├── subscribe/              PlanCard
│   └── settings/               SettingsForm
├── lib/
│   ├── sheets.ts               Google Sheets CRUD + spreadsheet creation
│   ├── auth.ts                 NextAuth config + JWT callbacks
│   ├── stripe.ts               Stripe client singleton
│   ├── money.ts                Cents/dollars conversion + formatting
│   ├── backoff.ts              Exponential backoff for API calls
│   ├── logger.ts               Structured JSON logger (no console.log)
│   └── validation.ts           Zod schemas for all API inputs
├── middleware.ts               Auth gate + subscription check
└── types/
    ├── index.ts                SaleRow, ExpenseRow, Settings, etc.
    └── next-auth.d.ts          Session type augmentation
```

## Rate Limiting

Google Sheets API limits: 300 req/min per project, 60 req/min per user.

All Sheets calls are wrapped in `withExponentialBackoff()` from `src/lib/backoff.ts`:
- Initial delay: 1000ms
- Multiplier: 2×
- Max delay: 32000ms  
- Max retries: 5
- 10% jitter applied to prevent thundering herd
- Non-retryable: 400, 401, 403, 404 errors

## Stripe Webhook Security

All webhook requests are verified with `stripe.webhooks.constructEvent()` using the `STRIPE_WEBHOOK_SECRET`. Requests with invalid or missing signatures are rejected with HTTP 400.

The webhook handler updates subscription status directly in the user's Settings sheet, enabling real-time subscription state changes without requiring a session refresh.
