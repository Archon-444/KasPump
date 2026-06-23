# Base Sepolia smoke test — runbook

**Audience**: ops / engineer running the V2 smoke test on Base Sepolia
before any mainnet thinking happens.

**Branch tip at time of writing**: `claude/improve-code-quality-D5FGD`,
post-Lane 1 + Lane 2 (PR 6 polish).

**Goal**: validate end-to-end — deploy → launch → trade → graduate →
observe vesting + indexer — on Base Sepolia, with the soft-launch cap
disabled and the mock router in place (per Lane 1B's
`scripts/deploy-mock-router-sepolia.ts`).

This is a checklist, not a script. Lane 3 will replace the manual
"create token + push to graduation" steps with two seed scripts; until
those land, those steps are placeholders pointed at the planned script
names so the runbook structure is stable.

---

## 0. Prerequisites

- `.env.local` populated with:
  - `PRIVATE_KEY` — funded Base Sepolia deployer (≥ 0.5 ETH testnet).
  - `BASE_SEPOLIA_RPC_URL` — a working RPC endpoint.
  - WalletConnect / IPFS keys if exercising the UI flow.
- `npm install --legacy-peer-deps` succeeded once.
- `node scripts/local-compile-check.js` reports `10 files: 0 errors, 0 warnings`.
- `npx tsc --noEmit` is at or below the **577** baseline (Lane 2 currently
  at 576).

---

## 1. Local verification gate

Run before anything touches Sepolia. If any of these fail, stop here.

```bash
node scripts/local-compile-check.js     # Solidity 0/0
node scripts/local-build-abis.js        # 9 files (3 contracts × 3 dests)
npx tsc --noEmit                         # ≤ 577
npx hardhat test test/BondingCurveAMM.test.ts
npx hardhat test test/BondingCurveSigmoid.test.ts
npx hardhat test test/Graduation.test.ts
```

Expected: all suites green. `test/DEXIntegration.test.ts` is intentionally
skipped (Lane 1A.1 quarantine — pending V2 rewrite in Lane 3).

---

## 2. Deploy contracts to Base Sepolia

```bash
npx hardhat run scripts/deploy-deterministic.ts --network baseSepolia
```

Expected stdout (key lines):

```
🔷 DETERMINISTIC MULTI-CHAIN DEPLOYMENT 🔷
📡 Network: Base Sepolia (84532)
✅ DeterministicDeployer deployed to: 0x...
✅ DexRouterRegistry deployed to:    0x...
✅ TokenFactory deployed!
   createToken selector: 0x........ (struct fields: 8, V2 expected: 8)
```

Capture for the next steps:
- `TOKEN_FACTORY` — printed under "TokenFactory deployed!"
- `REGISTRY_ADDRESS` — printed under "DexRouterRegistry deployed to:"

If the `(struct fields: N, V2 expected: 8)` line shows N ≠ 8, **stop**.
That's the Lane 1A.5 sanity log warning that `CreateTokenParams` has
drifted from V2; investigate before proceeding.

---

## 3. Seed the mock DEX router

The Base Sepolia entry in `DexConfig.sol` is intentionally
`enabled: false` (no verified V2 router on this chain). For smoke we
override at the registry level with the mocks from `test/mocks/`.

```bash
REGISTRY_ADDRESS=0x... \
  npx hardhat run scripts/deploy-mock-router-sepolia.ts --network baseSepolia
```

Expected:

```
🧪 Lane 1B — Base Sepolia mock-router smoke setup
✅ MockWETH:        0x...
✅ MockDEXFactory:  0x...
✅ MockDEXRouter:   0x...
✅ Registry seeded
```

Capture: `MOCK_ROUTER`, `MOCK_FACTORY`, `MOCK_WETH` for indexer / debug.

---

## 4. Update networks.json + frontend env

- `subgraph/networks.json` → set `base-sepolia.TokenFactory.address` to
  the address from step 2 and `startBlock` to the deploy block (visible
  on the explorer or in the deploy receipt).
- Frontend `.env.local` → set whichever env vars wire the factory address
  for chain 84532 (project-specific; see `src/config/contracts.ts`).

---

## 5. Build + deploy the subgraph

```bash
cd subgraph
npx graph codegen
npx graph build --network base-sepolia
npx graph deploy --network base-sepolia kaspump-subgraph
```

Expected:
- `graph codegen` succeeds against the new V2 entities (Lane 1A.3).
- `graph build` accepts every event signature (Lane 1A.3 wired all 7).
- `graph deploy` returns a query URL for the deployed subgraph.

If `graph build` rejects an event signature, the on-chain ABI and the
manifest disagree — re-run `node scripts/local-build-abis.js` first.

---

## 6. Launch a token via the UI (or seed via Lane 3 script)

### Option A — UI flow

Start the frontend against Base Sepolia:

```bash
npm run dev
```

Then in a wallet connected to chain 84532:

1. Navigate to `/launch`.
2. Fill: name (e.g. `Smoke Token`), ticker (`SMOKE`), optional image.
3. Confirm the wallet tx.
4. On success, the form redirects to `/token/<address>`.

### Option B — Lane 3 seed script (preferred for repeatable smoke)

```bash
npx hardhat run scripts/sepolia-smoke-seed.ts --network baseSepolia
```

Reads the V2 deploy from `deployments.json[84532]`, calls
`createToken` with a unique name + symbol so re-runs don't collide,
performs a 0.001 ETH buy, and writes the new token + AMM addresses
back into `deployments.json[84532].smokeTokens[]`. Output ends with
the `TOKEN_ADDRESS=…` invocation line for step 8.

### Verify on the token detail page

- `<FeeBadge />` shows a percentage (likely high — sniper-window
  surcharge active for the first 60 s).
- `<GraduationHUD />` renders `<1%` with native-left ≈ 3 ETH.
- "Trading fee" sub-line reads `decreases as token grows`.
- No "Curve Type" badge (PR 5 removed it). The TokenCard back on `/`
  shows `Standard sigmoid`.

---

## 7. Buy + sell smoke

Use the UI:

1. Wait ≥ 60 s for the sniper window to expire (anti-sniper banner
   should disappear automatically — verifies Lane 2's live-AMM-state
   read + heuristic fallback).
2. Buy 0.1 ETH worth → confirms.
3. Verify FeeBadge updates after the trade (`refreshTrigger` fires).
4. Verify GraduationHUD bar advances and "native left to graduate"
   ticks down.
5. Sell half the tokens → confirms (advance one block before selling
   to avoid the same-block guard, or wait a few seconds for a fresh
   block).

---

## 8. Push to graduation

```bash
# Default: push the latest smoke token from deployments.json[84532].smokeTokens[]
npx hardhat run scripts/sepolia-graduate.ts --network baseSepolia

# Or pin a specific token:
TOKEN_ADDRESS=0x... npx hardhat run scripts/sepolia-graduate.ts --network baseSepolia
```

The script sends a single overpaying buy (default 5 ETH gross; the
sigmoid integral at threshold is ~3 ETH so the V2 overpayment clamp
engages), then asserts the four V2 invariants:

```
✅ 1. overpayment refund         GraduationOverpaymentRefunded fired,
                                 refundedNative > 0, netSpend < grossSend
✅ 2. LP price continuity        observed LP ratio matches
                                 spotPriceAtSupply(threshold) within 10 bps
✅ 3. 70/20/10 allocation        vesting holds 40 M, treasury holds ≥ 20 M
✅ 4. accounting closure         residualBalance == creatorFees +
                                 referrerFees + totalGraduationFunds
```

Exit code is non-zero if any invariant fails — that's the gate for
opening a PR 7 finding.

In the UI:
- `<GraduationHUD />` swaps to "Graduated — LP active" with a "View
  pair" link to the explorer.
- `<CreatorVestingPanel />` renders. As the creator wallet, the Claim
  button reads "Nothing claimable yet" (drip just started). As any
  other wallet, the button is disabled with "Only the creator can
  claim vested tokens."

---

## 9. Subgraph sanity

Query the new V2 entities:

```graphql
{
  tradeExecutedEvents(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    isBuy
    nativeGross
    nativeNet
    feeBps
    priceAfter
    timestamp
  }
  graduationTriggeredEvents(first: 5) {
    id
    finalSupply
    finalPrice
    lpAdded
    nativeUsedForLP
    tokensUsedForLP
  }
  creatorVestingCreatedEvents(first: 5) {
    id
    vestingContract
    totalAmount
    startTime
    endTime
  }
  treasuryAllocatedEvents(first: 5) {
    id
    recipient
    nativeAmount
    tokenAmount
  }
  softLaunchCapHitEvents(first: 5) {
    id
    requestedNative
    acceptedNative
    refundedNative
  }
}
```

Expected:
- At least one `TradeExecutedEvent` per buy/sell.
- Exactly one `GraduationTriggeredEvent` with `lpAdded: true` and
  `tokensUsedForLP > 0`.
- Exactly one `CreatorVestingCreatedEvent`; `endTime - startTime ==
  15_552_000` (180 days in seconds).
- Exactly one `TreasuryAllocatedEvent` with non-zero `nativeAmount` and
  `tokenAmount` ≥ 20 M (the 10 % token allocation).
- `softLaunchCapHitEvents` empty unless the smoke operator manually
  enabled the cap.

---

## 10. Triage + record findings

For every step that diverged from "expected", capture:

- Step number.
- Observed vs expected.
- Tx hash / log lines.
- Whether it blocks PR 7 or is a polish item.

Open a single GitHub issue (`Base Sepolia smoke findings — <date>`) and
list each finding as a checkbox. **PR 7 only fixes findings from this
list** — no scope creep, no Treasury vault, no BSC / Arbitrum re-enable,
no mainnet anything.

---

## Hard guardrails

Do not, during smoke:

- ❌ Re-enable BSC / Arbitrum in `wagmi.ts`.
- ❌ Hardcode a "real" Base Sepolia router in `DexConfig.sol`. The mock
  router is the smoke surface; a real one requires a verified deploy
  with public docs.
- ❌ Touch `Treasury.sol`, `BondingCurveMath.sol`, sigmoid anchors, or
  the graduation math.
- ❌ Push to mainnet, mainnet config, or any deployment script that
  targets chains other than `baseSepolia`.

Smoke surfaces problems; PR 7 patches them. That's the loop.
