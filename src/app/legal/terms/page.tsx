export default function TermsOfService() {
  const effectiveDate = "May 1, 2025";
  const appName = "FlipBook";
  const contactEmail = "support@flipbookapp.io";

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 text-[#a3a3a3] text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-2">Terms of Service</h1>
      <p className="text-xs text-[#525252] mb-8">Effective {effectiveDate}</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">1. Acceptance of Terms</h2>
        <p>
          By creating an account or using {appName} (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service and our Privacy Policy. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">2. Description of Service</h2>
        <p>
          {appName} is a reseller bookkeeping tool that helps you track inventory, sales, expenses,
          and estimate quarterly taxes. Your data is stored in a Google Spreadsheet in your own
          Google Drive account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">3. Not Financial or Tax Advice</h2>
        <p className="mb-2">
          <strong className="text-[#f5f5f5]">
            {appName} is a bookkeeping tool, not a tax advisor, accountant, or financial advisor.
          </strong>{" "}
          Tax estimates shown in the app are rough approximations based on the tax rate you enter.
          They do not account for deductions, credits, self-employment tax, state tax, business
          structure, or any other individual circumstances.
        </p>
        <p>
          You are solely responsible for filing accurate tax returns. We strongly recommend consulting
          a licensed CPA or tax professional for all tax-related decisions. We are not liable for any
          penalties, interest, or losses arising from reliance on figures shown in the app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">4. Your Account and Data</h2>
        <p className="mb-2">
          You retain full ownership of your data. Your data is stored in a Google Spreadsheet in your
          Google Drive. {appName} accesses your spreadsheet only to read and write your reselling records.
        </p>
        <p>
          You are responsible for maintaining the security of your Google account and for all activity
          that occurs under your {appName} account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">5. Subscription and Billing</h2>
        <p className="mb-2">
          {appName} offers paid subscription plans. Billing is handled by Stripe. By subscribing, you
          authorize us to charge your payment method on a recurring basis. You may cancel at any time
          through the billing portal in Settings.
        </p>
        <p>
          Refunds are not provided for partial billing periods. If you cancel, your subscription
          remains active until the end of the current billing period.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">6. Prohibited Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to reverse-engineer, scrape, or abuse the API</li>
          <li>Share your account credentials with others</li>
          <li>Use automated tools to generate excessive API requests</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">7. Disclaimer of Warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
          uptime, accuracy of calculations, or that the Service will be error-free. Use of the
          Service is at your own risk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">8. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, {appName} and its operators shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages arising out of your
          use of the Service, including but not limited to loss of data or financial losses.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">9. Changes to Terms</h2>
        <p>
          We may update these Terms at any time. Continued use of the Service after changes are
          posted constitutes acceptance of the revised Terms. We will make reasonable efforts to
          notify users of material changes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[#f5f5f5] mb-2">10. Contact</h2>
        <p>
          Questions about these Terms? Email us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-profit hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
