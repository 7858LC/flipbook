import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/sheets";
import { updateSettingsSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";

async function getSpreadsheetId(): Promise<string | null> {
  const data = await getSessionData();
  return data?.spreadsheetId ?? null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const spreadsheetId = await getSpreadsheetId();
    if (!spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getSettings(spreadsheetId);
    // Never expose Stripe IDs to the client in full
    return NextResponse.json({
      data: {
        ...settings,
        stripe_customer_id: settings.stripe_customer_id ? "set" : "",
        stripe_subscription_id: settings.stripe_subscription_id ? "set" : "",
      },
    });
  } catch (err) {
    logger.error("GET /api/sheets/settings error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const spreadsheetId = await getSpreadsheetId();
    if (!spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Disallow client from updating Stripe fields directly
    const { stripe_customer_id, stripe_subscription_id, ...safeUpdates } =
      parsed.data;
    void stripe_customer_id;
    void stripe_subscription_id;

    await updateSettings(spreadsheetId, safeUpdates);
    const updated = await getSettings(spreadsheetId);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/settings error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
