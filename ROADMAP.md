# KasPump Roadmap

**Last updated:** 2026-08-13  
**Direction:** [STRATEGY.md](./STRATEGY.md) — consumer launch mothballed.  
**Code inventory:** [STATUS.md](./STATUS.md).

This is not a path to mainnet. Feature ideas below are **inventory**, not commitments.

---

## Shipped (code on master)

- Token creation (`QuickLaunchForm`: name / ticker / image), sigmoid bonding-curve trading, DEX graduation with 6-month LP lock and creator vesting
- Anti-sniper sliding fee; creation fee `0.005` native; social fields on-chain (not in the form)
- Comments (KV + signatures), King of the Hill, portfolio, leaderboard, in-tab alerts
- CI: Vitest, Hardhat, Playwright E2E, production build
- Contract security items from 2026-07 (AMM ownership, pull-payment fees, graduation retry, `AMMDeployer`)

Not shipped: mainnet, Safe ownership, subgraph host, WS host, limit/stop-loss contracts.

---

## Parked engineering (after a wedge exists)

- Redeploy current contracts to a testnet (October 2025 factory ≠ master)
- Safe / audit / invariants — scale and safety, not strategy
- Subgraph / WS / Sentry — only if a live feed is part of the proof

## Not default work

Socials on the form, extra pairs, limit orders, Arbitrum/Base/Arc deploys — **mothballed**. See [STRATEGY.md](./STRATEGY.md). Creator per-trade fees already exist on-chain in this repo (`CREATOR_FEE_SHARE = 5000`); they are not a backlog item.

