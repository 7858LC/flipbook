# FlipBook Setup Checklist

Complete these steps in order. Each step has zero assumed knowledge.

---

## PHASE 1 — Google Cloud (takes ~20 minutes)

### Step 1: Create Google Cloud Project
- [ ] Go to https://console.cloud.google.com
- [ ] Click the project dropdown at the top → "New Project"
- [ ] Name it `flipbook` → click Create
- [ ] Make sure the new project is selected in the dropdown

### Step 2: Enable Google Sheets API
- [ ] In left sidebar: APIs & Services → Library
- [ ] Search "Google Sheets API" → click it → click Enable
- [ ] Go back to Library, search "Google Drive API" → click it → click Enable

### Step 3: Configure OAuth Consent Screen
- [ ] APIs & Services → OAuth consent screen
- [ ] User Type: External → Create
- [ ] App name: `FlipBook`
- [ ] User support email: your email
- [ ] Developer contact: your email
- [ ] Click Save and Continue (through Scopes, skip adding scopes)
- [ ] Under Test Users → Add Users → add your Google email
- [ ] Save and Continue

### Step 4: Create OAuth Client ID
- [ ] APIs & Services → Credentials → Create Credentials → OAuth client ID
- [ ] Application type: Web application
- [ ] Name: `FlipBook Web`
- [ ] Authorized redirect URIs → Add URI:
  - `http://localhost:3000/api/auth/callback/google`
- [ ] Click Create
- [ ] Copy **Client ID** → this is `GOOGLE_CLIENT_ID`
- [ ] Copy **Client Secret** → this is `GOOGLE_CLIENT_SECRET`

### Step 5: Create Service Account
- [ ] APIs & Services → Credentials → Create Credentials → Service Account
- [ ] Service account name: `flipbook-sheets`
- [ ] Click Create and Continue
- [ ] Role: Select "Editor" → Continue → Done
- [ ] Click on the new service account in the list
- [ ] Click Keys tab → Add Key → Create New Key → JSON → Create
- [ ] A JSON file downloads automatically
- [ ] Open the JSON file in a text editor
- [ ] Copy `client_email` value → this is `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] Copy `private_key` value (the whole thing including BEGIN/END lines) → this is `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### Step 6: Create Master Registry Spreadsheet
- [ ] Go to https://sheets.google.com → Create a new blank spreadsheet
- [ ] Rename it: `FlipBook Registry`
- [ ] Click the tab at the bottom labeled "Sheet1" → rename it to `Users`
- [ ] In cell A1, type: `email`
- [ ] In cell B1, type: `spreadsheet_id`
- [ ] Click Share (top right) → paste your service account email (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) → set role to Editor → click Share
- [ ] Copy the spreadsheet ID from the browser URL bar:
  `https://docs.google.com/spreadsheets/d/[COPY_THIS_PART]/edit`
- [ ] This is `MASTER_SPREADSHEET_ID`

---

## PHASE 2 — Stripe (takes ~10 minutes)

### Step 7: Create Stripe Account
- [ ] Go to https://stripe.com → create account (or log in)
- [ ] Complete basic onboarding (or skip for test mode)

### Step 8: Create Product and Prices
- [ ] In Stripe dashboard → Products → + Add product
- [ ] Product name: `FlipBook`
- [ ] Under Pricing → Add a price:
  - Type: Recurring
  - Amount: $9.99
  - Billing period: Monthly
  - Click Add price
- [ ] Add another price:
  - Type: Recurring
  - Amount: $79.00
  - Billing period: Yearly
  - Click Add price
- [ ] Save the product
- [ ] Click on the Monthly price → copy the Price ID (starts with `price_`) → this is `STRIPE_MONTHLY_PRICE_ID`
- [ ] Click on the Annual price → copy the Price ID → this is `STRIPE_ANNUAL_PRICE_ID`

### Step 9: Get Stripe API Keys
- [ ] Stripe dashboard → Developers → API keys
- [ ] Copy **Publishable key** (`pk_test_...`) → this is `STRIPE_PUBLISHABLE_KEY`
- [ ] Copy **Secret key** (`sk_test_...`) → this is `STRIPE_SECRET_KEY`
- [ ] (Use `pk_live_` and `sk_live_` for production)

### Step 10: Set Up Stripe Webhook (production)
- [ ] Stripe dashboard → Developers → Webhooks → + Add endpoint
- [ ] Endpoint URL: `https://YOUR_VERCEL_URL/api/stripe/webhook`
- [ ] Events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `customer.subscription.trial_will_end`
- [ ] Click Add endpoint
- [ ] Click "Reveal" under Signing secret → copy it → this is `STRIPE_WEBHOOK_SECRET`

---

## PHASE 3 — Local Setup (takes ~5 minutes)

### Step 11: Install Dependencies
```bash
cd flipbook
npm install
```

### Step 12: Create Environment File
```bash
cp .env.example .env.local
```

### Step 13: Fill In All Environment Variables

Open `.env.local` and fill in every value from the steps above:

```
GOOGLE_CLIENT_ID=         ← from Step 4
GOOGLE_CLIENT_SECRET=     ← from Step 4
GOOGLE_SERVICE_ACCOUNT_EMAIL=    ← from Step 5
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=  ← from Step 5 (paste the whole key)
MASTER_SPREADSHEET_ID=    ← from Step 6

NEXTAUTH_SECRET=          ← generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

STRIPE_SECRET_KEY=        ← from Step 9
STRIPE_PUBLISHABLE_KEY=   ← from Step 9
STRIPE_WEBHOOK_SECRET=    ← from Step 10 (or use Stripe CLI for local)
STRIPE_MONTHLY_PRICE_ID=  ← from Step 8
STRIPE_ANNUAL_PRICE_ID=   ← from Step 8

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note on private key:** The private key in the JSON file has literal `\n` characters. Paste the full key as-is into `.env.local`. The app handles the conversion.

### Step 14: Run Locally
```bash
npm run dev
```

Open http://localhost:3000 and sign in with your Google account (the one you added as a test user in Step 3).

### Step 15: Test Stripe Webhook Locally
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret printed by the CLI and put it in `STRIPE_WEBHOOK_SECRET` for local testing.

---

## PHASE 4 — Deploy to Vercel

### Step 16: Deploy
```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked "Override settings?" say No.

### Step 17: Add Environment Variables in Vercel
- [ ] Go to vercel.com → your project → Settings → Environment Variables
- [ ] Add every variable from your `.env.local` (all environments)
- [ ] For `NEXTAUTH_URL`: use your Vercel URL, e.g. `https://flipbook-abc.vercel.app`
- [ ] For `NEXT_PUBLIC_APP_URL`: same as above
- [ ] For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: paste the raw key including `-----BEGIN PRIVATE KEY-----`

### Step 18: Add Production Redirect URI
- [ ] Back in Google Cloud Console → APIs & Services → Credentials
- [ ] Click your OAuth client ID
- [ ] Add to Authorized redirect URIs:
  `https://YOUR_VERCEL_URL/api/auth/callback/google`
- [ ] Save

### Step 19: Update Stripe Webhook
- [ ] If you used localhost URL in Step 10, update the webhook endpoint URL to your Vercel URL
- [ ] Or create a new webhook for production

### Step 20: Redeploy
```bash
vercel --prod
```

### Step 21: Final Checks
- [ ] Sign in at your production URL
- [ ] App creates your Google spreadsheet automatically
- [ ] Navigate to each page: Dashboard, Inventory, Sales, Expenses, Taxes, Settings
- [ ] Test adding an inventory item
- [ ] Test marking it as sold
- [ ] Test the subscribe flow (use Stripe test card `4242 4242 4242 4242`)

---

## Troubleshooting

**"Google service account credentials not configured"**
→ Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are set

**"MASTER_SPREADSHEET_ID not configured"**
→ Check `MASTER_SPREADSHEET_ID` is set and the service account has editor access to that sheet

**"Invalid webhook signature"**
→ Check `STRIPE_WEBHOOK_SECRET` matches the webhook's signing secret in Stripe dashboard

**OAuth redirect mismatch**
→ Make sure the exact redirect URI `https://yourdomain.com/api/auth/callback/google` is added in Google Cloud OAuth settings

**Private key errors**
→ On Vercel, paste the raw private key value. On local, the app replaces `\n` with real newlines automatically.
