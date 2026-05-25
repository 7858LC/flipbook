export default function PrivacyPolicy() {
  const effectiveDate = "May 1, 2025";
  const appName = "FlipBook";
  const contactEmail = "support@flipbookapp.io";

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 text-[#a3a3a3] text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#525252] mb-8">Effective {effectiveDate}</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">1. Overview</h2>
        <p>
          {appName} takes your privacy seriously. This policy explains what data we collect, how we
          use it, and what rights you have. We collect the minimum data necessary to provide the
          Service and never sell your personal information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">2. Data We Collect</h2>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-[#f5f5f5]">From Google Sign-In</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Your email address (used as your account identifier)</li>
              <li>Your display name and profile photo (optional, used in the UI)</li>
              <li>An OAuth access token (to read/write your Google Sheet)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-[#f5f5f5]">Data You Enter</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Sales records (item name, price, platform, dates, notes)</li>
              <li>Expense records (category, amount, date, receipt URL)</li>
              <li>Settings (business name, state, tax rate)</li>
            </ul>
            <p className="mt-1">
              This data is stored directly in a Google Spreadsheet in your own Google Drive. We do
              not copy it to our servers.
            </p>
          </div>
          <div>
            <p className="font-medium text-[#f5f5f5]">Automatically Collected</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Error logs (via Sentry) — anonymized, no PII</li>
              <li>Standard server logs (IP address, request path, timestamp) — retained for 30 days</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">3. How We Use Your Data</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>To authenticate you and create your account</li>
          <li>To read and write your reselling data in your Google Sheet</li>
          <li>To calculate metrics, charts, and tax estimates shown in the app</li>
          <li>To process subscription payments via Stripe</li>
          <li>To diagnose bugs and improve the Service</li>
        </ul>
        <p className="mt-3">
          We do not use your data for advertising. We do not sell or share your data with third
          parties except as described in this policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">4. Google OAuth and Drive Access</h2>
        <p className="mb-2">
          We request the <code className="text-[#f5f5f5]">drive.file</code> OAuth scope, which grants
          access only to files created by {appName} — not your entire Google Drive. We use this
          permission solely to create and manage your FlipBook spreadsheet.
        </p>
        <p>
          Your Google refresh token is stored encrypted in a secure HTTP-only session cookie and is
          used only to maintain your session without requiring frequent re-login.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">5. Third-Party Services</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong className="text-[#f5f5f5]">Google</strong> — Sign-in and spreadsheet storage.
            Governed by Google's Privacy Policy.
          </li>
          <li>
            <strong className="text-[#f5f5f5]">Stripe</strong> — Payment processing. Governed by
            Stripe's Privacy Policy. We never see or store your full card number.
          </li>
          <li>
            <strong className="text-[#f5f5f5]">Sentry</strong> — Error tracking. Errors are
            anonymized before transmission; no PII is included.
          </li>
          <li>
            <strong className="text-[#f5f5f5]">Vercel</strong> — Hosting. Standard infrastructure
            logs apply.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">6. Data Retention</h2>
        <p>
          Your reselling data lives in your Google Drive and is retained until you delete it or your
          Google account. If you delete your {appName} account, we remove your records from our
          registry and clear your spreadsheet data. Your Google Sheet file remains in your Drive.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">7. Your Rights</h2>
        <p className="mb-2">You have the right to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong className="text-[#f5f5f5]">Access</strong> — Export all your data as CSV from
            Settings → Export CSV
          </li>
          <li>
            <strong className="text-[#f5f5f5]">Delete</strong> — Delete your account and all data
            from Settings → Danger Zone
          </li>
          <li>
            <strong className="text-[#f5f5f5]">Revoke access</strong> — Remove {appName}'s access
            to your Google account at any time via{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-profit hover:underline"
            >
              Google Account Permissions
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">8. Security</h2>
        <p>
          All data is transmitted over HTTPS. Session tokens are stored in encrypted HTTP-only
          cookies. We use rate limiting to prevent abuse. No system is perfectly secure, and we
          encourage you to protect your Google account with two-factor authentication.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">9. Children's Privacy</h2>
        <p>
          {appName} is not intended for users under 13. We do not knowingly collect personal
          information from children under 13.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes
          by posting a notice in the app. Continued use after changes constitutes acceptance of the
          revised policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">11. Contact</h2>
        <p>
          Privacy questions or data requests? Email us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-profit hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
