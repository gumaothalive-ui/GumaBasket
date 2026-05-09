import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fcfcfc] text-neutral-900 selection:bg-black selection:text-white py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-12 md:p-20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] rounded-sm border border-neutral-100">
        <Link href="/" className="inline-block mb-12 text-sm font-black tracking-widest uppercase hover:opacity-70 transition-opacity">
          &larr; Back
        </Link>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">
          Elite Vendor Terms & Conditions
        </h1>
        <p className="text-sm font-bold tracking-widest text-neutral-400 uppercase mb-16">
          Last Updated: March 2024
        </p>
        
        <div className="space-y-12 text-neutral-600 leading-relaxed text-sm md:text-base">
          
          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By registering as a seller ("Vendor", "Seller", "You") on the GUMA BASKET BUSINESS Portal ("Platform", "We", "Us"), you enter into a legally binding master service agreement. These Terms & Conditions, along with our Privacy Policy and any other documents explicitly incorporated by reference, govern your use of the Platform and your relationship with GUMA BASKET.
            </p>
            <p>
              If you do not agree to these terms, you must immediately cease all use of the Business Portal and cancel your registration. GUMA BASKET reserves the right to modify these terms at any time without prior written notice, though significant changes will be communicated via the email address associated with your vendor account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">2. Membership, Subscriptions & Fees</h2>
            <p className="mb-4">
              <strong>2.1 Subscription Plan:</strong> GUMA BASKET operates as a premium, curated digital marketplace. To maintain this exclusivity, we charge a monthly platform access fee. Upon initial registration, all approved vendors receive a complimentary grace period of three (3) months ("Trial Period").
            </p>
            <p className="mb-4">
              <strong>2.2 Billing Cycle:</strong> Following the conclusion of your Trial Period, a mandatory, non-refundable membership fee of R120.00 ZAR (inclusive of VAT where applicable) will be assessed monthly. This fee covers platform maintenance, premium hosting, dedicated storefront curation, and technical support.
            </p>
            <p>
              <strong>2.3 Fee Deductions:</strong> By accepting these terms, you authorize GUMA BASKET to automatically deduct the R120.00 membership fee from your rolling settlement balance (Payouts) on the 1st of every calendar month. Should your settlement balance be insufficient, the fee will accumulate as a negative balance against future sales. GUMA BASKET reserves the right to suspend vendor accounts exhibiting consecutive months of negative balances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">3. Pricing Paradigm & Commission Structure</h2>
            <p className="mb-4">
              <strong>3.1 Base Price Guarantee:</strong> You retain the sole authority to determine the "Base Price" (wholesale price) of your products. The Base Price is the exact financial amount guaranteed to be credited to your vendor account upon the successful fulfillment and delivery of an order.
            </p>
            <p className="mb-4">
              <strong>3.2 Premium Markup logic:</strong> GUMA BASKET exercises absolute discretion over the final retail price presented to consumers. The Platform automatically algorithmically applies a "Premium Markup" over your Base Price. This markup typically ranges between 15% to 25%, encompassing variables such as delivery logistics, payment gateway processing fees, and platform profitability. 
            </p>
            <p>
              <strong>3.3 Profit Floor:</strong> The Platform guarantees a minimum algorithmic margin of R5.00 on all items with a Base Price equal to or exceeding R50.00 ZAR. You waive any right to claim a percentage of the retail markup above your specified Base Price.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">4. Product Quality, Exclusivity & Curation</h2>
            <p className="mb-4">
              <strong>4.1 Curation Standards:</strong> GUMA BASKET is positioned as South Africa's leading elite food and artisanal pantry marketplace. As such, all product listings are subject to rigorous internal audit and curation. We explicitly forbid the listing of prohibited items, expired goods, counterfeit products, or items lacking proper nutritional and origin labeling.
            </p>
            <p className="mb-4">
              <strong>4.2 Brand Integrity:</strong> Products must be visually presented according to the overarching aesthetic guidelines of the Platform. GUMA BASKET reserves the right to modify product imagery, rewrite product descriptions for SEO optimization, or unlist products that diminish the premium brand perception of the marketplace.
            </p>
            <p>
              <strong>4.3 Exclusivity Incentives:</strong> While GUMA BASKET does not demand absolute marketplace exclusivity, products offered at a lower retail price on competing platforms may be subject to algorithmic demotion in GUMA BASKET search results or complete removal from the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">5. Fulfillment, Inventory Management & Logistics</h2>
            <p className="mb-4">
              <strong>5.1 Live Synchronization:</strong> Vendors are contractually obligated to ensure the inventory metrics provided to the Business Portal are a factual representation of physical, dispatch-ready stock.
            </p>
            <p className="mb-4">
              <strong>5.2 Fulfillment Operations:</strong> Upon receiving an order notification, the Vendor must prepare the item(s) for dispatch within the agreed Service Level Agreement (SLA) timeframe, typically not exceeding twenty-four (24) hours. Failure to fulfill an order due to inventory mismanagement ("Stock-outs") profoundly damages consumer trust.
            </p>
            <p>
              <strong>5.3 Penalties for Non-Fulfillment:</strong> GUMA BASKET strictly monitors fulfillment metrics. Vendors exhibiting a cancellation rate exceeding 2.5% of total monthly orders may face financial penalties, temporary suspension, or permanent algorithmic banishment from the marketplace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">6. Payouts and Financial Settlement</h2>
            <p className="mb-4">
              <strong>6.1 Account Accuracy:</strong> Financial settlements are electronically transferred to the specific banking credentials (Bank Name, Branch Code, Account Number) provided during your onboarding phase. It is your sole responsibility to ensure this data remains completely accurate.
            </p>
            <p className="mb-4">
              <strong>6.2 Disbursement Schedule:</strong> Standard payouts of accumulated Base Price funds are initiated bi-weekly, subject to a clearing period of 3-5 business days depending on the receiving financial institution.
            </p>
            <p>
              <strong>6.3 Indemnification against Banking Errors:</strong> GUMA BASKET accepts absolutely zero liability, financial or otherwise, for delayed, vanished, or misrouted disbursements resulting from typographical errors, outdated banking information, or account closures on the part of the Vendor. Funds transferred to an incorrectly specified, but valid, account number are considered settled by GUMA BASKET.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">7. Intellectual Property Rights</h2>
            <p className="mb-4">
              By uploading logos, product imagery, brand copy, and trademarks ("Vendor IP") to the GUMA BASKET BUSINESS Portal, you grant GUMA BASKET a non-exclusive, worldwide, royalty-free, perpetual license to display, manipulate, reproduce, and distribute said Vendor IP for the explicit purposes of marketplace promotion, social media marketing, and platform operation.
            </p>
            <p>
              You warrant and represent that you hold the legal copyright to all Vendor IP uploaded to the platform, and agree to fully indemnify GUMA BASKET against any claims of copyright infringement brought by third parties regarding your listings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">8. Termination & Suspension</h2>
            <p className="mb-4">
              <strong>8.1 Vendor-Initiated Termination:</strong> You may close your vendor account at any time by issuing a thirty (30) day written notice to our vendor support division. Any outstanding membership fees or negative balances must be settled in full prior to account closure.
            </p>
            <p>
              <strong>8.2 Platform-Initiated Termination:</strong> GUMA BASKET retains the unilateral right to suspend, demote, or permanently terminate your vendor account, with or without notice, for direct violations of this agreement, fraudulent activity, excessive customer complaints, or extended periods of inactivity (greater than 90 days without a platform login).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">9. Limitation of Liability</h2>
            <p className="mb-4 uppercase text-xs tracking-widest font-black leading-relaxed">
              To the maximum extent permitted by applicable law, in no event shall GUMA BASKET, its directors, employees, or affiliates be liable for any indirect, punitive, incidental, special, or consequential damages, including without limitation damages for loss of profits, goodwill, data or other intangible losses, arising out of or relating to the use of, or inability to use, this service.
            </p>
            <p className="uppercase text-xs tracking-widest font-black leading-relaxed">
              Under no circumstances will GUMA BASKET be responsible for any damage, loss, or injury resulting from hacking, tampering, or other unauthorized access or use of the service or your account or the information contained therein. Our total liability for any claim arising out of these terms will not exceed the total membership fees you have paid to us over the preceding six (6) months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4 uppercase tracking-wider">10. Governing Law</h2>
            <p>
              These Terms & Conditions shall be governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts located in Cape Town, South Africa.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
