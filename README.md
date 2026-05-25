# FlipBook

A mobile-first web app for resellers to track inventory, sales, expenses, and quarterly tax estimates.

**Tech stack:** Next.js 14 · TypeScript · Google Sheets API · Google OAuth · Stripe · Tailwind CSS · Vercel

---

## Prerequisites

- Node.js 18+
- A Google account
- A Stripe account
- A Vercel account (free tier works)

---

## 1. Google Cloud Setup

### 1a. Create a Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project → New Project**
3. Name it `flipbook` and create it

### 1b. Enable APIs

1. In your project, go to **APIs & Services → Library**
2. Enable **Google Sheets API**
3. Enable **Google Drive API**

### 1c. OAuth 2.0 Credentials (for user sign-in)

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `FlipBook`
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)
5. Click **Create** — copy the **Client ID** and **Client Secret**

### 1d. Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External** (or Internal if a Google Workspace org)
3. App name: `FlipBook`, add your email as support contact
4. Scopes: add `email` and `profile`
5. Add yourself as a test user while in development
6. Publish when ready for production

### 1e. Service Account (for managing user spreadsheets)

1. Go to **APIs & Services → Credentials → Create Credentials → Service Account**
2. Name: `flipbook-sheets`, click **Create and Continue**
3. Role: **Editor** (for Drive/Sheets access), click **Done**
4. Click on the service account → **Keys → Add Key → Create New Key → JSON**
5. Download the JSON file
6. From the JSON, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 1f. Create the Master Registry Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it `FlipBook Registry`
3. Rename Sheet1 to `Users`
4. In row 1, add headers: `email` (A1), `spreadsheet_id` (B1)
5. Share the spreadsheet with your service account email (from 1e) as **Editor**
6. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/[THIS_IS_THE_ID]/edit`
7. Set this as `MASTER_SPREADSHEET_ID` in your env

---

## 2. Stripe Setup

### 2a. Create Products and Prices

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products → Add product**
3. Name: `FlipBook Subscription`
4. Add a **Monthly** price: $9.99/month recurring
5. Add an **Annual** price: $79.00/year recurring
6. Copy each Price ID (starts with `price_`) to:
   - `STRIPE_MONTHLY_PRICE_ID`
   - `STRIPE_ANNUAL_PRICE_ID`

### 2b. API Keys

1. Go to **Developers → API keys**
2. Copy **Publishable key** → `STRIPE_PUBLISHABLE_KEY`
3. Copy **Secret key** → `STRIPE_SECRET_KEY`

### 2c. Webhook

1. Go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

For local testing: install [Stripe CLI](https://stripe.com/docs/stripe-cli), then:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 3. Local Development

```bash
# Clone and install
git clone <your-repo>
cd flipbook
npm install

# Configure environment
cp .env.example .env.local
# Fill in all values in .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables (or use Vercel dashboard)
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
vercel env add MASTER_SPREADSHEET_ID
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_MONTHLY_PRICE_ID
vercel env add STRIPE_ANNUAL_PRICE_ID
vercel env add NEXT_PUBLIC_APP_URL

# Redeploy with production settings
vercel --prod
```

**Important:** Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL (e.g., `https://flipbook.vercel.app`).

**Important:** The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` contains newlines. In Vercel's dashboard, paste the raw value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel handles newlines correctly.

---

## 5. Environment Variables Reference

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID for user sign-in |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email (for Sheets management) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (with `\n` newlines) |
| `MASTER_SPREADSHEET_ID` | The registry spreadsheet ID (maps emails → sheets) |
| `NEXTAUTH_SECRET` | Random 32+ char string. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of your app (e.g., `https://flipbook.vercel.app`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `STRIPE_MONTHLY_PRICE_ID` | Monthly plan price ID (`price_...`) |
| `STRIPE_ANNUAL_PRICE_ID` | Annual plan price ID (`price_...`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (same as `NEXTAUTH_URL`) |
