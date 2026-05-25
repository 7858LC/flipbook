import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/sheets";
import { addExpenseSchema, updateExpenseSchema } from "@/lib/validation";
import { dollarsToCents } from "@/lib/money";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const READ_LIMIT = 60;
const WRITE_LIMIT = 30;

export async function GET(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`expenses:read:${sessionData.email}`, READ_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, READ_LIMIT) }
      );
    }

    const expenses = await getExpenses(sessionData.spreadsheetId);
    return NextResponse.json({ data: expenses }, { headers: rateLimitHeaders(rl, READ_LIMIT) });
  } catch (err) {
    logger.error("GET /api/sheets/expenses error", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`expenses:write:${sessionData.email}`, WRITE_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, WRITE_LIMIT) }
      );
    }

    const body: unknown = await req.json();
    const parsed = addExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const expense = await addExpense(sessionData.spreadsheetId, {
      date: input.date,
      category: input.category,
      description: input.description,
      amount: dollarsToCents(input.amount),
      tax_deductible: input.tax_deductible,
      receipt_url: input.receipt_url,
      notes: input.notes,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/sheets/expenses error", err);
    return NextResponse.json<ApiError>({ error: "Failed to add expense" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`expenses:write:${sessionData.email}`, WRITE_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests — please slow down" },
        { status: 429, headers: rateLimitHeaders(rl, WRITE_LIMIT) }
      );
    }

    const body: unknown = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const centUpdates: Parameters<typeof updateExpense>[2] = {};
    if (updates.amount !== undefined)
      centUpdates.amount = dollarsToCents(updates.amount);
    if (updates.date !== undefined) centUpdates.date = updates.date;
    if (updates.category !== undefined) centUpdates.category = updates.category;
    if (updates.description !== undefined) centUpdates.description = updates.description;
    if (updates.tax_deductible !== undefined) centUpdates.tax_deductible = updates.tax_deductible;
    if (updates.receipt_url !== undefined) centUpdates.receipt_url = updates.receipt_url;
    if (updates.notes !== undefined) centUpdates.notes = updates.notes;

    const updated = await updateExpense(sessionData.spreadsheetId, id, centUpdates);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/expenses error", err);
    return NextResponse.json<ApiError>({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`expenses:write:${sessionData.email}`, WRITE_LIMIT);
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

    await deleteExpense(sessionData.spreadsheetId, id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    logger.error("DELETE /api/sheets/expenses error", err);
    return NextResponse.json<ApiError>({ error: "Failed to delete expense" }, { status: 500 });
  }
}
