import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | KasPump',
  description: 'KasPump platform terms of service and usage agreement.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using KasPump (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. The Platform is a decentralized application that facilitates token creation and trading via bonding curve automated market makers on supported blockchain networks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Eligibility</h2>
          <p>
            You must be at least 18 years old and legally permitted to use decentralized finance protocols in your jurisdiction. You are solely responsible for ensuring compliance with your local laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. No Investment Advice</h2>
          <p>
            The Platform does not provide financial, investment, tax, or legal advice. All trading decisions are your own. Token prices on bonding curves are determined algorithmically and may be highly volatile. You should conduct your own research before participating in any token launch or trade.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. User Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Maintaining the security of your wallet and private keys</li>
            <li>All gas fees, network fees, and platform trading fees incurred through your use</li>
            <li>Understanding the mechanics of bonding curves, slippage, and price impact before trading</li>
            <li>Ensuring that tokens you create do not infringe on third-party intellectual property</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Prohibited Activities</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Engage in market manipulation, wash trading, or artificial volume generation</li>
            <li>Create tokens that promote illegal activities, hate speech, or fraud</li>
            <li>Attempt to exploit smart contract vulnerabilities for unauthorized gain</li>
            <li>Use automated bots to front-run or sandwich other users&apos; transactions</li>
            <li>Circumvent any access control or rate limiting mechanisms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Smart Contract Risks</h2>
          <p>
            The Platform operates through smart contracts deployed on public blockchains. While contracts have been developed with security best practices (ReentrancyGuard, Pausable, Checks-Effects-Interactions pattern), smart contracts may contain undiscovered vulnerabilities. You acknowledge and accept the inherent risks of interacting with blockchain-based protocols.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. Platform Fees</h2>
          <p>
            The Platform charges trading fees on buy and sell transactions. Fees follow a supply-based schedule that decreases as a token matures along its bonding curve. A token creation fee is charged at launch. All fees are transparent and enforced by smart contract logic. Fee structures may be updated; changes take effect for future transactions only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">8. Graduation, Liquidity, and Vesting</h2>
          <p>
            When a token reaches its graduation threshold (80% of supply sold on the curve), the remaining token allocation is split automatically: a portion is paired with native currency as DEX liquidity (LP tokens locked for 6 months), a portion vests linearly to the token creator over 6 months, and a portion goes to the platform treasury. This process is enforced by the smart contract and is irreversible once triggered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, the Platform and its operators are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to trading losses, smart contract failures, network outages, or third-party actions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">10. Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms. Material changes will be communicated through the Platform interface.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">11. Governing Law</h2>
          <p>
            These terms are governed by the laws applicable in the jurisdiction of the Platform operators. Any disputes shall be resolved through binding arbitration.
          </p>
        </section>

        <div className="border-t border-white/10 pt-6 mt-10">
          <p className="text-gray-500 text-sm">
            See also: <Link href="/privacy" className="text-yellow-400 hover:text-yellow-300">Privacy Policy</Link> | <Link href="/disclaimer" className="text-yellow-400 hover:text-yellow-300">Risk Disclaimer</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
