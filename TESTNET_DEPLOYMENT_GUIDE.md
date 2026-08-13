# KasPump Testnet Deployment Guide

**Last updated:** 2026-08-13  
**Status:** Current **source** is ready to deploy to BSC Testnet. The factory in `deployments.json` (`0x7Af627…`, 2025-10-31) is **stale** and must not be treated as a V2 deployment.

Go-live gates after this deploy: [STATUS.md](./STATUS.md).

Never paste a private key into this (or any) markdown file.

---

## What gets deployed

`scripts/deploy.ts` and `scripts/deploy-deterministic.ts` both deploy and wire:

- `DeterministicDeployer` (CREATE2 helper; address differs per chain)
- `DexRouterRegistry`
- `TokenFactory` (CREATE2 in the deterministic script)
- `AMMDeployer` — **required**; `createToken` reverts with `AmmDeployerNotSet` without it

`CreatorVesting` is deployed per token at graduation, not at factory deploy.

---

## Prerequisites

- Node.js 20+
- `npm install --legacy-peer-deps`
- A **testnet-only** deployer key in `.env.local` (`PRIVATE_KEY`) — never commit it
- Testnet BNB for gas (~0.05–0.5 tBNB depending on how many retries)
- Optional: `BSCSCAN_API_KEY`, `SAFE_OWNER_ADDRESS` (Safe must already exist **on this chain**)

```bash
cp .env.example .env.local
# Set PRIVATE_KEY, BSC_TESTNET_RPC_URL, optional SAFE_OWNER_ADDRESS
npm run compile
npm run check-env
```

---

## Deploy

```bash
# Standard
npm run deploy:bsc-testnet

# Or CREATE2 (same TokenFactory address on other chains if salt + deployer match)
npm run deploy:deterministic:bsc-testnet
```

Confirm the log includes **AMMDeployer deployed + configured**. Then:

1. Copy addresses into `deployments.json` (the script should write this)
2. Set `NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY` (and related) in `.env.local` / Vercel
3. Verify on BscScan: `npm run verify:auto-retry` (testnet network)
4. If `SAFE_OWNER_ADDRESS` was not used at deploy time:  
   `npx hardhat run scripts/transfer-ownership.ts --network bscTestnet`

---

## Smoke (required)

Against the **new** addresses, not `0x7Af627…`:

1. Create a token via `/launch` (name, ticker, image)
2. Buy and sell through the sniper window and after it
3. Drive a token to graduation; confirm PancakeSwap testnet pair + vesting
4. From the Safe: `pause` / `unpause` on factory and an AMM; confirm EOA `onlyOwner` fails

---

## Do not

- Do not deploy mainnet until [STATUS.md](./STATUS.md) hard gates are checked
- Do not point production Vercel at the 2025-10-31 factory
- Do not skip `AMMDeployer` configuration
- Do not transfer ownership to an address with no code on this chain (bricks `onlyOwner`)
