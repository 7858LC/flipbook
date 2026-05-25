import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSettings, updateSettings } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";
import { z } from "zod";

const CHECKOUT_LIMIT = 5;

// All valid price IDs — validated at runtime so we don't hard-code env values
// into a z.enum (which evaluates before env is populated in some runtimes)
function validPriceIds(): string[] {
  return [
    process.env.STRIPE_MONTHLY_PRICE_ID,
    process.env.STRIPE_6MONTH_PRICE_ID,
    process.env.STRIPE_ANNUAL_PRICE_ID,
  ].filter(Boolean) as string[];
}

const checkoutBodySchema = z.object({
  priceId: z.string().min(1),
  applyEarlyBird: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.email || !sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`checkout:${sessionData.email}`, CHECKOUT_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, CHECKOUT_LIMIT) }
      );
    }

    const body: unknown = await req.json();
    const parsed = checkoutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>({ error: "Invalid request" }, { status: 400 });
    }

    const { priceId, applyEarlyBird } = parsed.data;

    // Validate the priceId is one we actually own
    const allowed = validPriceIds();
    if (allowed.length > 0 && !allowed.includes(priceId)) {
      return NextResponse.json<ApiError>({ error: "Invalid price ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const stripe = getStripe();
    const settings = await getSettings(sessionData.spreadsheetId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

    // Create or reuse Stripe customer
    let customerId = settings.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: sessionData.email,
        name: session?.user?.name ?? undefined,
        metadata: {
          spreadsheetId: sessionData.spreadsheetId,
          email: sessionData.email,
        },
      });
      customerId = customer.id;
      await updateSettings(sessionData.spreadsheetId, {
        stripe_customer_id: customerId,
      });
    }

    // Build discounts — early bird coupon auto-applied for Pro (6-month) plan
    const discounts: { coupon: string }[] = [];
    const earlyBirdCouponId = process.env.STRIPE_EARLY_BIRD_COUPON_ID;
    if (applyEarlyBird && earlyBirdCouponId) {
      discounts.push({ coupon: earlyBirdCouponId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Only set discounts OR allow_promotion_codes — not both
      ...(discounts.length > 0
        ? { discounts }
        : { allow_promotion_codes: true }),
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          spreadsheetId: sessionData.spreadsheetId,
          email: sessionData.email,
        },
      },
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe`,
    });

    logger.info("Checkout session created", {
      email: sessionData.email,
      priceId,
      earlyBird: applyEarlyBird,
    });

    return NextResponse.json({ data: { url: checkoutSession.url } });
  } catch (err) {
    logger.error("POST /api/stripe/checkout error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
