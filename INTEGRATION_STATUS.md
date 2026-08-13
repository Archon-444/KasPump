# KasPump AMM Integration Status

**Last updated:** 2026-08-13  
**Status:** Code on `master` is V2-complete. **BSC Testnet on-chain is stale (2025-10-31).** Mainnet not deployed.

This file used to be a November 2025 integration diary. That snapshot is wrong for current source (sigmoid-only, `AMMDeployer`, July 2026 security fixes). Use **[STATUS.md](./STATUS.md)** as the go-live tracker.

---

## What is true today

### Contracts (source)

`TokenFactory.createToken` deploys a `KRC20Token` and an AMM via `AMMDeployer` (which `transferOwnership`s the AMM to the platform admin). Pricing is the sigmoid table in `BondingCurveMath.sol`. Graduation adds V2 DEX liquidity, locks LP, deploys `CreatorVesting`, and uses pull-payments.

Deployed sizes (compiled 2026-08-13): TokenFactory 12.2 KB, AMMDeployer 20.8 KB, BondingCurveAMM 19.2 KB — all under EIP-170.

### Frontend

- `src/hooks/useContracts.ts` — factory + AMM via ethers 6 / TypeChain
- `src/components/features/QuickLaunchForm.tsx` — current launch UI
- `src/components/features/LaunchPad.tsx` — **legacy, unused**
- Trading, portfolio, leaderboard, comments (signed), onboarding, PWA banner — in tree

### On-chain

| Network | Fact |
|---------|------|
| BSC Testnet | `deployments.json` lists TokenFactory `0x7Af627Bf902549543701C58366d424eE59A4ee08` from 2025-10-31. **Does not include `AMMDeployer` or V2.** Do not use it to validate master. |
| BSC / Arbitrum / Base mainnet | Not deployed |

### Infra

| Piece | Status |
|-------|--------|
| Vercel frontend | GitHub integration (CLI `deploy.yml` was removed July 2026) |
| Subgraph | Code in `subgraph/`; not deployed; hosted Graph is dead |
| WebSocket `server/` | Code ready; not hosted; CSP has no production `wss://` origin |
| Comments | Vercel KV + EIP-191 |
| WalletConnect | Requires `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in env |

---

## Pre-mainnet (blocking)

1. Redeploy **current** contracts to BSC Testnet; update `deployments.json` + env
2. Gnosis Safe ownership + rehearsal (`scripts/transfer-ownership.ts`)
3. External audit + Foundry invariants
4. Full on-chain smoke on the new testnet
5. Subgraph + WS hosting
6. Mainnet deploy of audited bytecode

Details and checkboxes: [STATUS.md](./STATUS.md). Remaining debt: [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md). Contract findings: [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).
