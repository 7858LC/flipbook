import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";

export async function POST(): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.spreadsheetId) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({ data: { spreadsheetId: sessionData.spreadsheetId } });
  } catch (err) {
    logger.error("sheets/init error", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to initialize spreadsheet" },
      { status: 500 }
    );
  }
}
