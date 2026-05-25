import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { google } from "googleapis";
import { withExponentialBackoff } from "@/lib/backoff";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/^["']|["'],?$/g, "")
    ?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

/**
 * DELETE /api/account/delete
 *
 * Wipes the user's Sales and Expenses data, removes them from the master
 * registry, and instructs the client to sign out.
 * The user's Google Sheet itself is left in their Drive — we only clear
 * the rows we own. (We cannot delete a file from the user's Drive using
 * the service account; they can do it manually.)
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId || !sessionData?.email) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    // Strict rate limit — one attempt per 10 minutes per user
    const rl = rateLimit(`account:delete:${sessionData.email}`, 2, 10 * 60_000);
    if (!rl.success) {
      return NextResponse.json<ApiError>(
        { error: "Too many deletion attempts — please wait 10 minutes" },
        { status: 429 }
      );
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const { spreadsheetId, email } = sessionData;

    // 1. Clear all data rows from Sales and Expenses (keep header row 1)
    await withExponentialBackoff(() =>
      sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: {
          ranges: ["Sales!A2:Z", "Expenses!A2:Z", "Settings!A2:Z"],
        },
      })
    );

    // 2. Remove the user from the master registry
    const masterSpreadsheetId = process.env.MASTER_SPREADSHEET_ID;
    if (masterSpreadsheetId) {
      try {
        const registry = await withExponentialBackoff(() =>
          sheets.spreadsheets.values.get({
            spreadsheetId: masterSpreadsheetId,
            range: "Users!A:B",
          })
        );
        const rows = registry.data.values ?? [];
        const rowIndex = rows.findIndex((r) => r[0] === email);
        if (rowIndex >= 0) {
          // Clear the row (row index is 0-based; Sheets rows are 1-based)
          await withExponentialBackoff(() =>
            sheets.spreadsheets.values.clear({
              spreadsheetId: masterSpreadsheetId,
              range: `Users!A${rowIndex + 1}:B${rowIndex + 1}`,
            })
          );
        }
      } catch (registryErr) {
        // Non-fatal — user data is already cleared
        logger.warn("Could not remove user from registry", { email, err: registryErr });
      }
    }

    logger.info("Account deleted", { email });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    logger.error("DELETE /api/account/delete error", err);
    return NextResponse.json<ApiError>({ error: "Account deletion failed" }, { status: 500 });
  }
}
