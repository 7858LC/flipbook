"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
    void sessionId;
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        {loading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-profit/10 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-profit animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Loading"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <p className="text-[#a3a3a3]">Activating your subscription…</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-profit/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-profit"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#f5f5f5] mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-[#a3a3a3] mb-8">
              Your subscription is active. Start tracking your flips.
            </p>
            <Link href="/">
              <Button size="lg" fullWidth>
                Go to Dashboard
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
