"use client";

import { useSession } from "next-auth/react";
import { isSubscriptionActive } from "@/lib/stripe";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { data: session } = useSession();

  if (!session) return null;

  const active = isSubscriptionActive(
    session.subscriptionStatus,
    session.trialEndDate
  );

  if (active) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-warning mb-4">
        <svg
          className="w-16 h-16 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">Trial Expired</h2>
      <p className="text-[#a3a3a3] mb-6 max-w-sm">
        Your 14-day free trial has ended. Subscribe to continue tracking your
        flipping business.
      </p>
      <Link href="/subscribe">
        <Button size="lg">View Plans</Button>
      </Link>
    </div>
  );
}
