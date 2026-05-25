import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { addSale, addExpense } from "@/lib/sheets";
import { dollarsToCents } from "@/lib/money";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const IMPORT_LIMIT = 5;   // imports per minute per user
const MAX_ROWS = 500;     // hard row cap to prevent Vercel timeout

type RawRow = Record<string, string>;

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[$,]/g, "")) || 0;
}

function parseDate(v: string | undefined): string {
  if (!v) return new Date().toISOString().split("T")[0]!;
  // Accept YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY
  const clean = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    if ((parts[2]?.length ?? 0) === 4) {
      // MM/DD/YYYY
      return `${parts[2]}-${(parts[0] ?? "01").padStart(2, "0")}-${(parts[1] ?? "01").padStart(2, "0")}`;
    }
  }
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]!;
  return new Date().toISOString().split("T")[0]!;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`import:${sessionData.email}`, IMPORT_LIMIT);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many import requests — please wait a moment" },
        { status: 429, headers: rateLimitHeaders(rl, IMPORT_LIMIT) }
      );
    }

    const body = await req.json() as {
      type: "sales" | "expenses";
      rows: RawRow[];
      mapping: Record<string, string>;
    };

    const { type, rows, mapping } = body;
    if (!type || !rows || !mapping) {
      return NextResponse.json<ApiError>({ error: "Missing required fields" }, { status: 400 });
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json<ApiError>(
        { error: `Too many rows — maximum is ${MAX_ROWS} per import. Split your CSV into smaller files.` },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;

    // Remap each raw row to our field names using the column mapping
    const mapped = rows.map(row => {
      const out: Record<string, string> = {};
      for (const [src, tgt] of Object.entries(mapping)) {
        out[tgt] = row[src] ?? "";
      }
      return out;
    });

    if (type === "sales") {
      for (const row of mapped) {
        if (!row.date && !row.sell_price) { skipped++; continue; }
        try {
          await addSale(sessionData.spreadsheetId, {
            date: parseDate(row.date),
            item_name: row.item_name || "Imported Item",
            category: row.category || "Other",
            platform: row.platform || "Other",
            buy_price: dollarsToCents(parseNum(row.buy_price)),
            sell_price: dollarsToCents(parseNum(row.sell_price)),
            platform_fee_pct: parseNum(row.platform_fee_pct),
            shipping_cost: dollarsToCents(parseNum(row.shipping_cost)),
            other_costs: dollarsToCents(parseNum(row.other_costs)),
            notes: row.notes || "",
            status: (row.status === "active" ? "active" : "sold") as "active" | "sold",
          });
          imported++;
        } catch {
          skipped++;
        }
      }
    } else {
      for (const row of mapped) {
        if (!row.amount && !row.description) { skipped++; continue; }
        try {
          await addExpense(sessionData.spreadsheetId, {
            date: parseDate(row.date),
            category: row.category || "Other",
            description: row.description || "Imported Expense",
            amount: dollarsToCents(parseNum(row.amount)),
            tax_deductible: (row.tax_deductible?.toLowerCase() === "yes" ? "yes" : "no") as "yes" | "no",
            receipt_url: "",
            notes: row.notes || "",
          });
          imported++;
        } catch {
          skipped++;
        }
      }
    }

    logger.info("CSV import complete", { email: sessionData.email, type, imported, skipped });
    return NextResponse.json({ data: { imported, skipped } });
  } catch (err) {
    logger.error("POST /api/sheets/import error", err);
    return NextResponse.json<ApiError>({ error: "Import failed" }, { status: 500 });
  }
}
