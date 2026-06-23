import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | KasPump',
  description: 'KasPump privacy policy — how we handle your data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Overview</h2>
          <p>
            KasPump is a decentralized application. By design, we collect minimal personal data. This policy explains what information we process and why.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Information We Collect</h2>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Wallet Addresses</h3>
          <p>
            When you connect your wallet, your public blockchain address is used to facilitate transactions. Wallet addresses are public by nature of blockchain technology and are not considered private personal data.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">On-Chain Activity</h3>
          <p>
            All trades, token creations, and interactions with smart contracts are recorded on public blockchains. This data is inherently public, immutable, and not controlled by us.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Comments</h3>
          <p>
            If you post comments on token threads, your wallet address and comment text are stored in our database. Comments are public and visible to all users.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Usage Analytics</h3>
          <p>
            We may use privacy-respecting analytics services to understand aggregate usage patterns (page views, feature usage). No personally identifiable information is collected through analytics. We do not use advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Information We Do Not Collect</h2>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Names, email addresses, or phone numbers</li>
            <li>Private keys or seed phrases (never — we cannot access your wallet)</li>
            <li>IP addresses for tracking purposes</li>
            <li>Government-issued identification</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Third-Party Services</h2>
          <p>The Platform integrates with third-party services that have their own privacy policies:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>RPC Providers</strong> — process your blockchain transactions</li>
            <li><strong>WalletConnect</strong> — facilitates wallet connections for mobile and hardware wallets</li>
            <li><strong>Moralis</strong> — provides token analytics data (holder counts)</li>
            <li><strong>Vercel</strong> — hosts the Platform frontend and API routes</li>
            <li><strong>IPFS Pinning Services</strong> (Pinata) — store token images you upload</li>
            <li><strong>Block Explorers</strong> (BaseScan, BSCScan, Arbiscan) — linked for transaction verification</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Cookies</h2>
          <p>
            The Platform uses essential cookies only (e.g., wallet connection state, user preferences like theme settings). We do not use tracking cookies, advertising cookies, or share cookie data with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Data Retention</h2>
          <p>
            On-chain data is permanent and immutable by nature. Off-chain data (comments, preferences) is retained as long as the Platform operates. You may request deletion of off-chain data associated with your wallet address by contacting the Platform operators.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. Data Sales</h2>
          <p>
            We do not sell, rent, or share your data with third parties for marketing or advertising purposes. Period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this policy as the Platform evolves. Changes will be reflected by updating the date at the top of this page.
          </p>
        </section>

        <div className="border-t border-white/10 pt-6 mt-10">
          <p className="text-gray-500 text-sm">
            See also: <Link href="/terms" className="text-yellow-400 hover:text-yellow-300">Terms of Service</Link> | <Link href="/disclaimer" className="text-yellow-400 hover:text-yellow-300">Risk Disclaimer</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
