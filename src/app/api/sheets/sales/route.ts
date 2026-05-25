import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getSales, addSale, updateSale, deleteSale } from "@/lib/sheets";
import { addSaleSchema, updateSaleSchema } from "@/lib/validation";
import { dollarsToCents } from "@/lib/money";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const READ_LIMIT = 60;   // GET requests per minute per user
const WRITE_LIMIT = 30;  // mutating requests per minute per user

export async function GET(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sales:read:${sessionData.email}`, READ_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, READ_LIMIT) }
      );
    }

    const sales = await getSales(sessionData.spreadsheetId);
    return NextResponse.json({ data: sales }, { headers: rateLimitHeaders(rl, READ_LIMIT) });
  } catch (err) {
    logger.error("GET /api/sheets/sales error", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sales:write:${sessionData.email}`, WRITE_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, WRITE_LIMIT) }
      );
    }

    const body: unknown = await req.json();
    const parsed = addSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const sale = await addSale(sessionData.spreadsheetId, {
      date: input.date,
      item_name: input.item_name,
      category: input.category,
      platform: input.platform,
      buy_price: dollarsToCents(input.buy_price),
      sell_price: dollarsToCents(input.sell_price),
      platform_fee_pct: input.platform_fee_pct,
      shipping_cost: dollarsToCents(input.shipping_cost),
      other_costs: dollarsToCents(input.other_costs),
      notes: input.notes,
      status: input.status,
    });

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/sheets/sales error", err);
    return NextResponse.json<ApiError>({ error: "Failed to add sale" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sales:write:${sessionData.email}`, WRITE_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, WRITE_LIMIT) }
      );
    }

    const body: unknown = await req.json();
    const parsed = updateSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const centUpdates: Parameters<typeof updateSale>[2] = {};
    if (updates.buy_price !== undefined)
      centUpdates.buy_price = dollarsToCents(updates.buy_price);
    if (updates.sell_price !== undefined)
      centUpdates.sell_price = dollarsToCents(updates.sell_price);
    if (updates.shipping_cost !== undefined)
      centUpdates.shipping_cost = dollarsToCents(updates.shipping_cost);
    if (updates.other_costs !== undefined)
      centUpdates.other_costs = dollarsToCents(updates.other_costs);
    if (updates.date !== undefined) centUpdates.date = updates.date;
    if (updates.item_name !== undefined) centUpdates.item_name = updates.item_name;
    if (updates.category !== undefined) centUpdates.category = updates.category;
    if (updates.platform !== undefined) centUpdates.platform = updates.platform;
    if (updates.platform_fee_pct !== undefined)
      centUpdates.platform_fee_pct = updates.platform_fee_pct;
    if (updates.notes !== undefined) centUpdates.notes = updates.notes;
    if (updates.status !== undefined) centUpdates.status = updates.status;

    const updated = await updateSale(sessionData.spreadsheetId, id, centUpdates);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/sales error", err);
    return NextResponse.json<ApiError>({ error: "Failed to update sale" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sales:write:${sessionData.email}`, WRITE_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, WRITE_LIMIT) }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json<ApiError>({ error: "Missing id parameter" }, { status: 400 });
    }

    await deleteSale(sessionData.spreadsheetId, id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    logger.error("DELETE /api/sheets/sales error", err);
    return NextResponse.json<ApiError>({ error: "Failed to delete sale" }, { status: 500 });
  }
}
