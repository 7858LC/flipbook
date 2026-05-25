"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, signIn } from "next-auth/react";

export function SignInClient() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCsrfToken().then((token) => {
      setCsrfToken(token ?? null);
    });
  }, []);

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0f0f0f]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">&#x21C4;</div>
          <h1 className="text-3xl font-bold text-white mb-2">FlipBook</h1>
          <p className="text-[#a3a3a3]">
            Track your reselling business — inventory, sales, and taxes in one place.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Primary: JS button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#22c55e] hover:bg-green-400 text-black font-semibold rounded-xl px-4 py-3 min-h-[52px] text-base transition-colors disabled:opacity-70"
          >
            {loading ? (
              <span>Redirecting to Google…</span>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Fallback: plain form POST if JS sign-in fails */}
          {csrfToken && (
            <form method="POST" action="/api/auth/signin/google">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value="/" />
              <button
                type="submit"
                className="w-full text-sm text-[#525252] hover:text-[#a3a3a3] underline transition-colors py-1"
              >
                Not working? Click here instead
              </button>
            </form>
          )}

          <p className="text-xs text-[#525252] text-center leading-relaxed">
            Your Google account is only used for sign-in and to create your personal data spreadsheet.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Track Inventory", icon: "📦" },
            { label: "Log Sales", icon: "💰" },
            { label: "Estimate Taxes", icon: "📊" },
          ].map((item) => (
            <div key={item.label} className="text-xs text-[#525252]">
              <div className="text-2xl mb-1">{item.icon}</div>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
