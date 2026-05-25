import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSettings } from "@/lib/sheets";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const PORTAL_LIMIT = 10;

export async function POST(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`portal:${sessionData.email}`, PORTAL_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, PORTAL_LIMIT) }
      );
    }

    const settings = await getSettings(sessionData.spreadsheetId);
    if (!settings.stripe_customer_id) {
      return NextResponse.json<ApiError>(
        { error: "No Stripe customer found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: settings.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (err) {
    logger.error("POST /api/stripe/portal error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
