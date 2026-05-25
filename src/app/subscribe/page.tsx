import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isSubscriptionActive } from "@/lib/stripe";
import { PlanCard } from "@/components/subscribe/PlanCard";

const ALL_FEATURES = [
  "Unlimited inventory tracking",
  "Sales & profit analytics",
  "Expense tracking with tax categorization",
  "Quarterly tax estimates",
  "Charts, trends & platform breakdown",
  "Barcode scanner for quick add",
  "CSV import & export",
  "PDF tax reports",
  "Your data lives in your Google Drive",
];

const ULTRA_EXTRAS = [
  ...ALL_FEATURES,
  "Annual tax summary report",
  "Early access to new features",
];

export default async function SubscribePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const active = isSubscriptionActive(
    session.subscriptionStatus,
    session.trialEndDate
  );
  if (active) redirect("/");

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
  const sixMonthPriceId = process.env.STRIPE_6MONTH_PRICE_ID ?? "";
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID ?? "";

  return (
    <div className="min-h-screen px-4 py-12 bg-background">
      <div className="w-full max-w-4xl mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f5f5f5] mb-3">
            Choose Your Plan
          </h1>
          <p className="text-[#a3a3a3]">
            30-day free trial on all plans. No card required to start.
          </p>
        </div>

        {/* Early bird banner */}
        <div className="mb-8 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl px-4 py-3 text-center max-w-xl mx-auto">
          <p className="text-sm font-semibold text-[#f59e0b]">⚡ Founding Member Offer</p>
          <p className="text-xs text-[#a3a3a3] mt-1">
            First <strong className="text-[#f5f5f5]">25 Pro subscribers</strong> get{" "}
            <strong className="text-[#f5f5f5]">25% off</strong> — $52.50 instead of $70.
            Applied automatically at checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <PlanCard
            name="Monthly"
            price="$10"
            period="mo"
            subtext="Cancel anytime"
            features={ALL_FEATURES}
            priceId={monthlyPriceId}
          />
          <PlanCard
            name="Pro"
            price="$70"
            period="6 mo"
            subtext="~$11.67/mo"
            savings="First 25 get 25% off → $52.50"
            features={ALL_FEATURES}
            priceId={sixMonthPriceId}
            earlyBird
            highlighted
          />
          <PlanCard
            name="Ultra"
            price="$125"
            period="yr"
            subtext="~$10.42/mo"
            savings="Save $20 vs monthly"
            features={ULTRA_EXTRAS}
            priceId={annualPriceId}
            badge="BEST VALUE"
          />
        </div>

        <p className="text-xs text-center text-[#525252]">
          Cancel anytime. Your data stays in your Google Sheet even after cancellation.
          Founding member pricing is locked in for life on the Pro plan.
        </p>
      </div>
    </div>
  );
}
