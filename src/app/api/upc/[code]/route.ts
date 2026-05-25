import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

const UPC_LIMIT = 20; // lookups per minute per user

interface UPCItem {
  title?: string;
  category?: string;
  brand?: string;
  description?: string;
  lowest_recorded_price?: number;
  highest_recorded_price?: number;
}

interface UPCResponse {
  code?: string;
  total?: number;
  items?: UPCItem[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  const sessionData = await getSessionData();
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`upc:${sessionData.email}`, UPC_LIMIT);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many lookups — please slow down" },
      { status: 429, headers: rateLimitHeaders(rl, UPC_LIMIT) }
    );
  }

  const { code } = params;
  if (!code || !/^\d{8,14}$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!res.ok) {
      return NextResponse.json({ data: null });
    }

    const data = await res.json() as UPCResponse;
    const item = data.items?.[0];

    if (!item) {
      return NextResponse.json({ data: null });
    }

    // Map to our fields
    const result = {
      item_name: item.title ?? "",
      category: mapCategory(item.category ?? ""),
      brand: item.brand ?? "",
      low_price: item.lowest_recorded_price ?? null,
      high_price: item.highest_recorded_price ?? null,
    };

    return NextResponse.json({ data: result });
  } catch (err) {
    logger.error("UPC lookup error", { code, err });
    return NextResponse.json({ data: null });
  }
}

function mapCategory(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("electronic") || lower.includes("computer") || lower.includes("phone"))
    return "Electronics";
  if (lower.includes("clothing") || lower.includes("apparel") || lower.includes("shoe"))
    return "Clothing";
  if (lower.includes("toy") || lower.includes("game") || lower.includes("collectible"))
    return "Collectibles";
  if (lower.includes("book") || lower.includes("media") || lower.includes("music"))
    return "Books";
  if (lower.includes("tool") || lower.includes("hardware"))
    return "Tools";
  if (lower.includes("sport") || lower.includes("outdoor") || lower.includes("fitness"))
    return "Sporting Goods";
  if (lower.includes("furniture") || lower.includes("home") || lower.includes("kitchen"))
    return "Furniture";
  return "Other";
}
