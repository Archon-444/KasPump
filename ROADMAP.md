# KasPump Roadmap — BSC Mainnet Launch

**Last updated:** 2026-08-13  
Canonical go-live gates: `STATUS.md`. This file is the product backlog, not a sprint calendar.

---

## Shipped (code on master)

- Token creation (`QuickLaunchForm`: name / ticker / image), sigmoid bonding-curve trading, DEX graduation with 6-month LP lock and creator vesting
- Anti-sniper sliding fee on the AMM (time-based, configurable duration, default 60s)
- Creation fee `0.005` native; social-link fields on-chain (not yet in the launch form)
- Comments on Vercel KV with mandatory EIP-191 signatures
- OHLCV from on-chain trades (RPC), Moralis holder counts, trade feed
- Trending / King of the Hill, profiles, portfolio, leaderboard, in-tab alerts
- Socket.IO client with backoff; server package ready but **not hosted**
- UX: wrong-network banner, mobile confirm, reduced-motion, onboarding, PWA banner, honest quotes
- CI: Vitest, Hardhat (un-quarantined), Playwright E2E, production build
- Contract security: AMM ownership, emergency-withdraw reserves, pull-payment fees, graduation retry, EIP-170 split (`AMMDeployer`)

Not shipped, despite older docs: on-chain limit orders, on-chain stop-loss, live subgraph, hosted WS server, mainnet contracts, Safe ownership.

---

## Remaining — launch (P0)

These are the actual path to a public BSC mainnet. Detail in `STATUS.md`.

1. **Redeploy current contracts to BSC Testnet** — October 2025 factory does not match master
2. **Gnosis Safe** — ownership + fee recipient; testnet rehearsal
3. **External audit freeze** — `audit-package/`, Slither, Foundry invariants
4. **On-chain smoke** — create / trade / graduate / vesting / pause on the new testnet
5. **Subgraph** — Goldsky or Alchemy (hosted Graph is dead)
6. **WebSocket server hosting** — Render (or equivalent) + CSP pin
7. **Sentry + uptime** confirmed live
8. **Counsel review** of `/terms` `/privacy` `/disclaimer`
9. **BSC mainnet deploy** of audited bytecode; Vercel `NEXT_PUBLIC_DEFAULT_CHAIN_ID=56`

---

## Remaining — parity (P1, not a mainnet gate)

### Social links on the launch form

On-chain `twitterUrl` / `telegramUrl` / `websiteUrl` already exist. `QuickLaunchForm` does not collect them. Add optional fields and keep `safeUrl()` on display.

### Push notifications that survive a closed tab

`api/push/subscribe` must persist subscriptions.

---

## Post-launch (P2+)

### Multiple trading pairs (USDT / CAKE)

Would need a `basePairToken` on create and an oracle. Not in current AMM (native in / native out only).

### Limit orders / stop-loss

UI stubs only. Requires new contracts + keepers. Do not advertise as live.

### Trade history page (`/history`)

`useUserTrades` exists; no dedicated history route.

### Bot API + API keys

`src/app/api/docs` sketches this. Rate-limit tiers and keys are not built.

### Referral / rewards

Referrer address is already a `createToken` field and factory tracks referral stats. No UI program / payout productization.

### Arbitrum / Base mainnet

Frontend chain configs and `DexRouterRegistry` exist. Deploy after BSC is stable. CREATE2 can keep TokenFactory addresses aligned if the same salt/deployer is used.

---

## Competitive notes (honest)

KasPump's live differentiators in **code** are the sigmoid curve, anti-sniper fee, automated V2 graduation + LP lock, and the trading UI. It does **not** currently ship on-chain limit/stop-loss or creator ongoing trade-fee share. Those remain backlog, not advantages.

Priority vs competitors (unchanged as product bets, not launch blockers):

| Item | Launch blocker? |
|------|-----------------|
| Creator per-trade revenue share | No — post-launch differentiator |
| Dynamic market-cap fees | No — fees already decay 1.00% → 0.10% with supply |
| Referral program UI | No — on-chain hook exists |
| BSC mainnet | Yes — see P0 above |
