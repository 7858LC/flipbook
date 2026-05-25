import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/auth",
  "/api/auth",
  "/subscribe",
  "/landing",
  "/legal",
  "/_next",
  "/favicon",
  "/manifest",
  "/robots",
  "/sitemap",
];

const ALWAYS_ALLOWED_WHEN_EXPIRED = ["/subscribe", "/settings", "/api/stripe"];

export async function middleware(request: NextRequest) {
  if (process.env.DEMO_MODE === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Unauthenticated users see the landing page at /
    if (pathname === "/") return NextResponse.redirect(new URL("/landing", request.url));
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const subscriptionStatus = (token.subscriptionStatus as string) ?? "";
  const trialEndDate = (token.trialEndDate as string) ?? "";

  // If no subscription status yet (new user / setup in progress) allow through
  if (!subscriptionStatus) {
    return NextResponse.next();
  }

  const isTrialActive =
    subscriptionStatus === "trialing" &&
    trialEndDate !== "" &&
    new Date(trialEndDate) > new Date();
  const isActiveSubscriber = subscriptionStatus === "active";

  if (!isTrialActive && !isActiveSubscriber) {
    const allowed = ALWAYS_ALLOWED_WHEN_EXPIRED.some((p) =>
      pathname.startsWith(p)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/subscribe", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
