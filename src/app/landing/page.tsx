import Link from "next/link";

const FEATURES = [
  {
    emoji: "📦",
    title: "Track Every Item",
    desc: "Add items when you buy them. Mark them sold when they go. FlipBook does the math.",
  },
  {
    emoji: "💰",
    title: "See Real Profit",
    desc: "After fees, shipping, and your costs — know exactly what you made on every flip.",
  },
  {
    emoji: "📊",
    title: "Charts & Trends",
    desc: "See which months are hot, which platforms pay most, and where your money goes.",
  },
  {
    emoji: "🧾",
    title: "Tax Estimates",
    desc: "No surprise tax bills. FlipBook estimates what you owe every quarter automatically.",
  },
  {
    emoji: "📄",
    title: "PDF Reports",
    desc: "One tap generates a clean report for your accountant, a loan application, or your records.",
  },
  {
    emoji: "📷",
    title: "Barcode Scanner",
    desc: "Point your phone at any item. FlipBook looks up the product and fills in the details.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Buy something",
    desc: "Scan the barcode or type the item. Enter what you paid.",
  },
  {
    step: "2",
    title: "Sell it",
    desc: "Mark it sold, enter the sale price and platform. Done.",
  },
  {
    step: "3",
    title: "Watch the numbers",
    desc: "Your profit, tax estimate, and trends update instantly.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0f0f0f] min-h-screen text-[#f5f5f5]">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl">
          <span className="text-[#22c55e] text-2xl" aria-hidden="true">⇄</span>
          FlipBook
        </div>
        <Link
          href="/auth/signin"
          className="bg-[#22c55e] text-[#0f0f0f] font-semibold px-5 py-2 rounded-lg text-sm hover:bg-[#16a34a] transition-colors"
        >
          Get Started Free
        </Link>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-16 pb-20 max-w-3xl mx-auto">
        <div className="inline-block bg-[#22c55e]/10 text-[#22c55e] text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-[#22c55e]/20">
          Built for resellers, flippers &amp; side hustlers
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Know exactly what<br />
          <span className="text-[#22c55e]">every flip made you</span>
        </h1>
        <p className="text-lg text-[#a3a3a3] mb-10 max-w-xl mx-auto leading-relaxed">
          Track inventory, sales, expenses, and taxes in one place —
          no spreadsheet headaches, no accounting degree needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="bg-[#22c55e] text-[#0f0f0f] font-bold px-8 py-4 rounded-xl text-base hover:bg-[#16a34a] transition-colors"
          >
            Start Free — No Credit Card
          </Link>
          <a
            href="#how-it-works"
            className="border border-[#2a2a2a] text-[#f5f5f5] font-semibold px-8 py-4 rounded-xl text-base hover:bg-[#1a1a1a] transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-xs text-[#525252] mt-4">Free 30-day trial · No credit card required</p>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          Everything a flipper needs
        </h2>
        <p className="text-[#a3a3a3] text-center mb-12">Simple enough for a first sale. Powerful enough for a full-time hustle.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-bold text-[#f5f5f5] mb-2">{f.title}</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">How it works</h2>
        <p className="text-[#a3a3a3] text-center mb-12">Three steps. That&apos;s it.</p>
        <div className="flex flex-col md:flex-row gap-6">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.step} className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {h.step}
              </div>
              <h3 className="font-bold text-[#f5f5f5] mb-2">{h.title}</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Simple, honest pricing</h2>
        <p className="text-[#a3a3a3] text-center mb-3">30-day free trial on all plans. No credit card required to start.</p>

        {/* Early bird banner */}
        <div className="max-w-xl mx-auto mb-10 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-semibold text-[#f59e0b]">⚡ Founding Member Offer</p>
          <p className="text-xs text-[#a3a3a3] mt-0.5">First 25 subscribers on the Pro plan get <strong className="text-[#f5f5f5]">25% off</strong> — automatically applied at checkout.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Monthly */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col">
            <h3 className="font-bold text-lg mb-1 text-[#f5f5f5]">Monthly</h3>
            <div className="text-4xl font-bold mb-1">$10<span className="text-base font-normal text-[#a3a3a3]">/mo</span></div>
            <p className="text-xs text-[#525252] mb-6">Cancel anytime</p>
            <ul className="space-y-2 text-sm text-[#a3a3a3] mb-8 flex-1">
              {[
                "30-day free trial",
                "Unlimited inventory",
                "Sales & profit tracking",
                "Quarterly tax estimates",
                "Charts & trends",
                "CSV import & export",
                "Barcode scanner",
                "PDF reports",
                "Your data in your Google Drive",
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#22c55e] shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signin" className="block text-center border border-[#2a2a2a] text-[#f5f5f5] font-semibold py-3 rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors">
              Start Free Trial
            </Link>
          </div>

          {/* Pro 6-month — highlighted */}
          <div className="bg-[#1a1a1a] border-2 border-[#22c55e] rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="bg-[#22c55e] text-[#0f0f0f] text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
            </div>
            <h3 className="font-bold text-lg mb-1 text-[#f5f5f5]">Pro</h3>
            <div className="flex items-end gap-2 mb-0.5">
              <div className="text-4xl font-bold">$70</div>
              <div className="text-sm text-[#a3a3a3] mb-1.5">/ 6 months</div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs line-through text-[#525252]">$60</span>
              <span className="bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-bold px-2 py-0.5 rounded-full">First 25: $52.50</span>
            </div>
            <p className="text-xs text-[#22c55e] font-medium mb-6">Save vs monthly — ~$11.67/mo</p>
            <ul className="space-y-2 text-sm text-[#a3a3a3] mb-8 flex-1">
              {[
                "30-day free trial",
                "Everything in Monthly",
                "Priority support",
                "Founding member pricing locked in",
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#22c55e] shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signin" className="block text-center bg-[#22c55e] text-[#0f0f0f] font-bold py-3 rounded-xl text-sm hover:bg-[#16a34a] transition-colors">
              Start Free Trial
            </Link>
          </div>

          {/* Ultra annual */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-lg text-[#f5f5f5]">Ultra</h3>
              <span className="bg-[#7c3aed]/20 text-[#a78bfa] text-xs font-bold px-2 py-0.5 rounded-full">BEST VALUE</span>
            </div>
            <div className="text-4xl font-bold mb-0.5">$125<span className="text-base font-normal text-[#a3a3a3]">/yr</span></div>
            <p className="text-xs text-[#22c55e] font-medium mb-6">~$10.42/mo · Save $20 vs monthly</p>
            <ul className="space-y-2 text-sm text-[#a3a3a3] mb-8 flex-1">
              {[
                "30-day free trial",
                "Everything in Pro",
                "Annual tax summary report",
                "Early access to new features",
                "Cancel anytime",
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#22c55e] shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signin" className="block text-center border border-[#2a2a2a] text-[#f5f5f5] font-semibold py-3 rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
        <p className="text-xs text-center text-[#525252] mt-6">All plans include your data in your own Google Drive. Cancel anytime — your data stays yours.</p>
      </section>

      {/* Tutorial */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Works on any phone</h2>
        <p className="text-[#a3a3a3] text-center mb-8">No app to download. Open the website, sign in with Google, start tracking. iPhone, Android, tablet — all the same.</p>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
          {[
            { q: "Do I need to download an app?", a: "Nope. FlipBook runs in your web browser — just bookmark it and you're done." },
            { q: "Can I use my existing spreadsheet?", a: "Yes — import your CSV and all your old data comes with you." },
            { q: "What platforms does it support?", a: "eBay, Facebook Marketplace, Poshmark, Mercari, OfferUp, Etsy, Amazon — or type in your own." },
            { q: "Is my data safe?", a: "Your data lives in your own Google Drive. FlipBook never stores your sales data on our servers." },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-[#2a2a2a] last:border-0 pb-4 last:pb-0">
              <p className="font-semibold text-[#f5f5f5] mb-1">{q}</p>
              <p className="text-sm text-[#a3a3a3]">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer + Legal */}
      <section className="px-6 pb-12 max-w-3xl mx-auto text-center">
        <p className="text-xs text-[#525252] leading-relaxed mb-3">
          FlipBook is a record-keeping tool, not financial or tax advice.
          Tax estimates are for planning purposes only. Consult a qualified tax
          professional for advice specific to your situation.
          &copy; {new Date().getFullYear()} FlipBook. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link href="/legal/terms" className="text-[#525252] hover:text-[#a3a3a3] transition-colors">
            Terms of Service
          </Link>
          <span className="text-[#2a2a2a]">·</span>
          <Link href="/legal/privacy" className="text-[#525252] hover:text-[#a3a3a3] transition-colors">
            Privacy Policy
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 bg-[#1a1a1a] border-t border-[#2a2a2a] text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to know your numbers?</h2>
        <p className="text-[#a3a3a3] mb-8">Free to start. Takes 2 minutes to set up.</p>
        <Link
          href="/auth/signin"
          className="inline-block bg-[#22c55e] text-[#0f0f0f] font-bold px-10 py-4 rounded-xl text-base hover:bg-[#16a34a] transition-colors"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
