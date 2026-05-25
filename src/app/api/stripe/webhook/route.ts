import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { updateSettings } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.warn("Webhook signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        logger.info("Trial ending soon", {
          subscriptionId: sub.id,
          trialEnd: sub.trial_end,
        });
        break;
      }
      default:
        logger.debug("Unhandled Stripe event", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error", { type: event.type, err });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription
): Promise<void> {
  const spreadsheetId = getSpreadsheetIdFromSub(sub);
  if (!spreadsheetId) {
    logger.warn("No spreadsheetId in subscription metadata", { id: sub.id });
    return;
  }

  await updateSettings(spreadsheetId, {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    trial_end_date:
      sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : "",
  });

  logger.info("Updated subscription status", {
    spreadsheetId,
    status: sub.status,
  });
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const spreadsheetId = getSpreadsheetIdFromSub(sub);
  if (!spreadsheetId) return;

  await updateSettings(spreadsheetId, {
    subscription_status: "canceled",
    stripe_subscription_id: "",
  });

  logger.info("Subscription canceled", { spreadsheetId });
}

function getSpreadsheetIdFromSub(sub: Stripe.Subscription): string | null {
  const meta = sub.metadata as Record<string, string>;
  return meta["spreadsheetId"] ?? null;
}
