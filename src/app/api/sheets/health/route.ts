import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { google } from "googleapis";
import { withExponentialBackoff } from "@/lib/backoff";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const HEALTH_LIMIT = 10;
const REPAIR_LIMIT = 3;

const SALES_HEADERS = [
  "id", "date", "item_name", "category", "platform",
  "buy_price", "sell_price", "platform_fee_pct",
  "shipping_cost", "other_costs", "net_profit",
  "days_to_sell", "notes", "status",
];

const EXPENSE_HEADERS = [
  "id", "date", "category", "description",
  "amount", "tax_deductible", "receipt_url", "notes",
];

function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/^["']|["'],?$/g, "")
    ?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

type HealthStatus = "ok" | "corrupted" | "missing";

interface SheetHealth {
  sheet: string;
  status: HealthStatus;
  expected: string[];
  actual: string[];
}

// GET — check health of the user's spreadsheet schema
export async function GET(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }
    if (sessionData.spreadsheetId === "__demo__") {
      return NextResponse.json({ data: { healthy: true, issues: [] } });
    }

    const rl = rateLimit(`health:${sessionData.email}`, HEALTH_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl, HEALTH_LIMIT) }
      );
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const { spreadsheetId } = sessionData;

    const results: SheetHealth[] = [];

    for (const { name, expected } of [
      { name: "Sales", expected: SALES_HEADERS },
      { name: "Expenses", expected: EXPENSE_HEADERS },
    ]) {
      try {
        const res = await withExponentialBackoff(() =>
          sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${name}!1:1`,
          })
        );
        const actual = (res.data.values?.[0] ?? []) as string[];
        const isOk =
          actual.length === expected.length &&
          expected.every((h, i) => actual[i] === h);

        results.push({
          sheet: name,
          status: actual.length === 0 ? "missing" : isOk ? "ok" : "corrupted",
          expected,
          actual,
        });
      } catch {
        results.push({ sheet: name, status: "missing", expected, actual: [] });
      }
    }

    const healthy = results.every((r) => r.status === "ok");
    return NextResponse.json({ data: { healthy, sheets: results } });
  } catch (err) {
    logger.error("GET /api/sheets/health error", err);
    return NextResponse.json<ApiError>({ error: "Health check failed" }, { status: 500 });
  }
}

// POST — repair corrupted headers without touching data rows
export async function POST(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }
    if (sessionData.spreadsheetId === "__demo__") {
      return NextResponse.json({ data: { repaired: true } });
    }

    const rl = rateLimit(`health:repair:${sessionData.email}`, REPAIR_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many repair attempts" },
        { status: 429, headers: rateLimitHeaders(rl, REPAIR_LIMIT) }
      );
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const { spreadsheetId } = sessionData;

    // Only overwrite row 1 — data rows are untouched
    await withExponentialBackoff(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            { range: "Sales!A1:N1", values: [SALES_HEADERS] },
            { range: "Expenses!A1:H1", values: [EXPENSE_HEADERS] },
          ],
        },
      })
    );

    logger.info("Sheet headers repaired", { email: sessionData.email });
    return NextResponse.json({ data: { repaired: true } });
  } catch (err) {
    logger.error("POST /api/sheets/health error", err);
    return NextResponse.json<ApiError>({ error: "Repair failed" }, { status: 500 });
  }
}
