"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  subtext?: string;
  savings?: string;
  features: string[];
  priceId: string;
  highlighted?: boolean;
  earlyBird?: boolean;
  badge?: string;
}

export function PlanCard({
  name,
  price,
  period,
  subtext,
  savings,
  features,
  priceId,
  highlighted = false,
  earlyBird = false,
  badge,
}: PlanCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    if (!priceId) {
      setError("This plan is not yet available. Check back soon.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, applyEarlyBird: earlyBird }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Failed to start checkout");
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={clsx(
        "relative flex flex-col",
        highlighted && "border-profit ring-1 ring-profit/30"
      )}
      padding="lg"
    >
      {/* Top badge */}
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-profit text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
            MOST POPULAR
          </span>
        </div>
      )}
      {badge && !highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-[#7c3aed] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-5">
        <p className="text-sm font-semibold text-[#a3a3a3] mb-2">{name}</p>
        <div className="flex items-end gap-1.5 mb-0.5">
          <span className="text-4xl font-bold text-[#f5f5f5]">{price}</span>
          <span className="text-[#a3a3a3] mb-1.5 text-sm">/{period}</span>
        </div>
        {subtext && (
          <p className="text-xs text-[#525252]">{subtext}</p>
        )}
        {savings && earlyBird && (
          <p className="text-xs font-semibold text-[#f59e0b] mt-1.5">
            ⚡ {savings}
          </p>
        )}
        {savings && !earlyBird && (
          <p className="text-xs font-medium text-profit mt-1.5">{savings}</p>
        )}
        <p className="text-xs text-[#525252] mt-2">30-day free trial included</p>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6" role="list">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <svg
              className="w-4 h-4 text-profit flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-[#a3a3a3]">{feature}</span>
          </li>
        ))}
      </ul>

      {error && <p className="text-loss text-sm mb-3">{error}</p>}

      <Button
        onClick={handleSubscribe}
        loading={loading}
        variant={highlighted ? "primary" : "secondary"}
        fullWidth
        size="lg"
      >
        Start 30-Day Free Trial
      </Button>
    </Card>
  );
}
