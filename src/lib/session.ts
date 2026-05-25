import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { getOrCreateSpreadsheet } from "./sheets";
import { logger } from "./logger";

// Resolved spreadsheet IDs by email
const spreadsheetCache = new Map<string, string>();

// In-flight promises — prevents duplicate API calls when multiple requests
// arrive simultaneously before the cache is populated (e.g. Promise.all on dashboard)
const inFlight = new Map<string, Promise<string>>();

export async function getSessionData(): Promise<{
  email: string;
  spreadsheetId: string;
} | null> {
  if (process.env.DEMO_MODE === "true") {
    return { email: "demo@flipbook.local", spreadsheetId: "__demo__" };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const email = session.user.email;
  const accessToken = session.accessToken ?? "";

  // Already resolved — return immediately
  if (spreadsheetCache.has(email)) {
    return { email, spreadsheetId: spreadsheetCache.get(email)! };
  }

  // Already in progress — join the existing promise instead of making a new call
  if (inFlight.has(email)) {
    try {
      const spreadsheetId = await inFlight.get(email)!;
      return { email, spreadsheetId };
    } catch {
      return null;
    }
  }

  // First caller — kick off the lookup/create and share the promise
  const promise = getOrCreateSpreadsheet(email, accessToken).then((id) => {
    spreadsheetCache.set(email, id);
    inFlight.delete(email);
    return id;
  }).catch((err) => {
    inFlight.delete(email);
    logger.error("Failed to get/create spreadsheet", { email, err });
    throw err;
  });

  inFlight.set(email, promise);

  try {
    const spreadsheetId = await promise;
    return { email, spreadsheetId };
  } catch {
    return null;
  }
}
