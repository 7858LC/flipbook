import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { exportAllData } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    const spreadsheetId = sessionData?.spreadsheetId;
    if (!spreadsheetId) {
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    }

    const { sales, expenses } = await exportAllData(spreadsheetId);

    const combinedCsv = `=== SALES ===\n${sales}\n\n=== EXPENSES ===\n${expenses}`;

    return new NextResponse(combinedCsv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="flipbook-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    logger.error("GET /api/sheets/export error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
