# KasPump - Token Launchpad for EVM Chains

**A Pump.fun-style token launchpad on BNB Smart Chain (Arbitrum and Base wired, not yet deployed).**

![KasPump](https://img.shields.io/badge/Status-Pre--Mainnet-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
![Network](https://img.shields.io/badge/Network-BSC%20Testnet%20(stale%20deploy)-orange)

**Strategy:** [STRATEGY.md](./STRATEGY.md) — public launch is frozen until a customer and wedge are written down.  
**Code inventory:** [STATUS.md](./STATUS.md) — V2 in repo; October 2025 testnet factory does **not** match source.

## Overview

KasPump lets anyone deploy an ERC-20 in one transaction. Tokens trade on a **fixed sigmoid bonding curve** until they hit the graduation threshold, then liquidity is seeded on a V2 DEX (PancakeSwap on BSC) with a 6-month LP lock and creator vesting.

## Key Features

- **30-second launch** — name, ticker, optional image (`QuickLaunchForm`)
- **Sigmoid bonding curve** — protocol-fixed; no per-token curve picker
- **Anti-sniper fee** — decaying surcharge in the first seconds after create
- **DEX graduation** — automated V2 liquidity, 70/20/10 split, pull-payments
- **Multi-chain frontend** — BSC, Arbitrum, Base configs; only a stale BSC testnet is on-chain today

## Architecture

### Smart contracts (`contracts/`, Solidity 0.8.20)

- **TokenFactory.sol** — create tokens, registry, creation fee `0.005` native
- **AMMDeployer.sol** — deploys each `BondingCurveAMM` and transfers ownership to the platform admin (keeps TokenFactory under the 24 KB EIP-170 limit)
- **BondingCurveAMM.sol** — buy/sell, sniper window, graduation
- **BondingCurveMath.sol** — 31-anchor piecewise-linear sigmoid
- **DexRouterRegistry.sol** / **DexConfig.sol** — per-chain V2 router
- **CreatorVesting.sol** — creator allocation after graduation
- **DeterministicDeployer.sol** — CREATE2 factory for TokenFactory

There are **no** `LimitOrderBook` / `StopLossOrderBook` contracts.

### Frontend

- **Next.js 16** App Router, React 19, TypeScript
- wagmi + RainbowKit for wallets; ethers 6 + TypeChain for contract calls
- Optional Socket.IO client (`server/` must be hosted separately)

## Quick Start

Node **20+** is required. Use `--legacy-peer-deps` (React 19 peer conflicts).

```bash
git clone https://github.com/Archon-444/KasPump.git
cd KasPump
npm install --legacy-peer-deps
cp .env.example .env.local
# Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (https://cloud.walletconnect.com)
npm run check-env
npm run dev
```

Visit `http://localhost:3000`. See [QUICK_START.md](./QUICK_START.md).

**Note:** `NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x7Af627…` is the 2025-10-31 factory. Master will not behave correctly against it (no `AMMDeployer`). Redeploy current contracts before relying on testnet.

## Project Structure

```
KasPump/
├── contracts/                 # Solidity 0.8.20
│   ├── TokenFactory.sol
│   ├── AMMDeployer.sol
│   ├── BondingCurveAMM.sol
│   ├── CreatorVesting.sol
│   ├── DeterministicDeployer.sol
│   └── DexRouterRegistry.sol
├── scripts/                   # Hardhat deploy / verify / ownership
├── server/                    # Socket.IO price server (not hosted)
├── subgraph/                  # The Graph indexer (not deployed)
├── src/                       # Next.js App Router
├── test/                      # Hardhat tests
├── e2e/                       # Playwright
└── docs/archive/              # Historical — not current
```

## Scripts

```bash
npm install --legacy-peer-deps
npm run dev
npm run build
npm run check-env
npm run compile              # Hardhat + typechain-types/
npm run test                 # Contract tests
npm run test:unit            # Vitest
npm run type-check           # tsc --noEmit (non-blocking in CI; ~284 pre-existing errors)
# npm run lint               # BROKEN on Next 16 until eslint 9 + flat config
```

## Networks

| Network | Chain ID | Contracts |
|---------|----------|-----------|
| BSC Testnet | 97 | Stale factory in `deployments.json` (2025-10-31) — **redeploy required** |
| BSC Mainnet | 56 | Not deployed |
| Arbitrum One / Base | 42161 / 8453 | Not deployed |
| Arbitrum Sepolia / Base Sepolia | 421614 / 84532 | Not deployed |

## Current Status

See [STATUS.md](./STATUS.md) for the code inventory and [STRATEGY.md](./STRATEGY.md) for whether we should ship at all.

**In code:** launch form, trade, graduate, comments, CI.  
**Not a product yet:** no named customer, no distribution, no mainnet, no reason to switch from Four.meme/Pump.fun. Launch is frozen.

## Security

- ReentrancyGuard + CEI on state-changing entrypoints
- Pull-payment platform fees; `emergencyWithdraw` reserves trader liquidity
- Professional audit in progress — **required before mainnet**
- Details: [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

## Documentation

| Doc | Use |
|-----|-----|
| [STATUS.md](./STATUS.md) | Go-live checklist (source of truth) |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Remaining engineering work |
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Contract findings reconciliation |
| [ROADMAP.md](./ROADMAP.md) | Product backlog |
| [CLAUDE.md](./CLAUDE.md) | Agent / architecture notes |
| `docs/archive/` | Historical only |

## Contributing

1. Fork and branch
2. `npm install --legacy-peer-deps`
3. Open a PR against `master` — CI must pass (unit, Hardhat, E2E, build)

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

Experimental software. Not audited for mainnet. Use at your own risk.
