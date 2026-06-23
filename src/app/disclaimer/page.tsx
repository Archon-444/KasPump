import Link from 'next/link';

export const metadata = {
  title: 'Risk Disclaimer | KasPump',
  description: 'Important risk warnings for KasPump token trading and DeFi participation.',
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Risk Disclaimer</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-4 mb-8">
        <p className="text-red-400 font-semibold text-sm">
          Trading tokens on bonding curves involves substantial risk of loss. Only trade with funds you can afford to lose entirely.
        </p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. General Risk Warning</h2>
          <p>
            Cryptocurrency and decentralized finance (DeFi) involve significant financial risk. Token prices are highly volatile and may drop to zero. Past performance is not indicative of future results. You should not invest more than you can afford to lose.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Bonding Curve Risks</h2>
          <p>
            Tokens on KasPump are priced by a sigmoid bonding curve. Key risks include:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Price Impact:</strong> Large trades relative to the curve&apos;s liquidity will experience significant slippage. The price you see may differ from the price you receive.</li>
            <li><strong>Liquidity Risk:</strong> Early in a token&apos;s life, bonding curve liquidity may be low. Selling a large position may result in substantial price impact.</li>
            <li><strong>Curve Dynamics:</strong> Sigmoid pricing accelerates around the curve midpoint — price can rise or fall rapidly in this zone.</li>
            <li><strong>First-Mover Disadvantage:</strong> Early buyers benefit from lower prices, but also face the risk that a token never gains traction and liquidity dries up.</li>
            <li><strong>Graduation Mechanics:</strong> When a token graduates to a DEX at 80% of supply, the liquidity split, creator vesting, and LP lock may affect token price dynamics in ways that are difficult to predict.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Smart Contract Risks</h2>
          <p>
            The Platform&apos;s smart contracts have been developed using industry best practices including OpenZeppelin security libraries, reentrancy guards, and the Checks-Effects-Interactions pattern. However:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>No smart contract is guaranteed to be free of bugs or vulnerabilities</li>
            <li>External dependencies (DEX routers, ERC20 implementations) introduce additional risk surface</li>
            <li>Blockchain consensus mechanisms may behave unexpectedly under adversarial conditions</li>
            <li>An external security audit is recommended but does not eliminate all risk</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Token Creator Risks</h2>
          <p>
            Anyone can create a token on KasPump. The Platform does not verify, endorse, or audit individual tokens or their creators. Tokens may be:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Created with misleading names, symbols, or descriptions</li>
            <li>Abandoned by their creators after launch</li>
            <li>Part of coordinated pump-and-dump schemes</li>
            <li>Impersonating established projects or brands</li>
          </ul>
          <p className="mt-2">Always conduct your own research (DYOR) before buying any token.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Network and Infrastructure Risks</h2>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Network Congestion:</strong> High gas fees or slow transaction confirmation during peak usage</li>
            <li><strong>RPC Failures:</strong> Temporary inability to read blockchain state or submit transactions</li>
            <li><strong>Frontend Downtime:</strong> The web interface may be temporarily unavailable; your funds remain on-chain and accessible through other means</li>
            <li><strong>Layer 2 Risks:</strong> Networks like Base depend on sequencer uptime and Ethereum L1 settlement</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Regulatory Uncertainty</h2>
          <p>
            The regulatory landscape for DeFi and token launches is evolving rapidly across jurisdictions. Laws and regulations may change in ways that affect the Platform, your ability to use it, or the legal status of tokens created on it. You are responsible for understanding and complying with your local regulations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-3">7. No Guarantees</h2>
          <p>
            The Platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uptime, accuracy of displayed data, or the safety of funds deposited into smart contracts. Use the Platform at your own risk.
          </p>
        </section>

        <div className="border-t border-white/10 pt-6 mt-10">
          <p className="text-gray-500 text-sm">
            See also: <Link href="/terms" className="text-yellow-400 hover:text-yellow-300">Terms of Service</Link> | <Link href="/privacy" className="text-yellow-400 hover:text-yellow-300">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
