# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KasPump is a Pump.fun-style token launchpad **prototype** for EVM chains. Public launch is frozen until `STRATEGY.md` is decided. Users *would* deploy ERC-20s that trade on a bonding curve until graduation to a DEX — that is what the code does, not a go-to-market.

The repo contains four deployable pieces:

- **Root**: Next.js 16 (App Router) frontend + Hardhat smart contracts, sharing one `package.json`
- **`server/`**: standalone Socket.IO server (Express, ethers, Redis) for real-time price feeds — own `package.json`, runs on port 4000
- **`subgraph/`**: The Graph indexer (AssemblyScript) — own `package.json`
- **`tools/`**: standalone Vite/React dev tools (bonding-curve-simulator, etc.) — own `package.json` each

## Commands

```bash
npm install --legacy-peer-deps   # REQUIRED flag: React 19 peer-dep conflicts
npm run dev                      # Next.js dev server at localhost:3000 (uses --webpack flag)
npm run build                    # Next.js production build
npm run check-env                # Validate .env.local configuration

# Frontend tests (Vitest + jsdom, tests colocated in src/**/*.test.{ts,tsx})
npm run test:unit                # All frontend tests
npx vitest run src/hooks/useContracts.test.ts   # Single test file
npx vitest run -t "test name"    # Single test by name

# Contract tests (Hardhat + Mocha/Chai, in test/*.test.ts)
npm run test                     # All contract tests
npx hardhat test test/BondingCurveAMM.test.ts   # Single test file

# Static checks
npm run type-check               # tsc --noEmit — see caveat below
# NOTE: `npm run lint` is BROKEN — `next lint` was removed in Next 16, and
# eslint 8 cannot load eslint-config-next 16's flat configs. Until the repo
# migrates to eslint 9 + flat config, there is no working lint command.

# Contracts
npm run compile                  # Hardhat compile + regenerate typechain-types/
npm run deploy:bsc-testnet       # Deploy via scripts/deploy.ts (also :bsc, :arbitrum, :base)
npm run verify:auto-retry        # Verify on block explorer
npm run deployment:status        # Report deployed addresses (see deployments.json)

# WebSocket server (separate package)
cd server && npm install && npm run dev   # tsx watch, port 4000
cd server && npm test                     # Jest
```

Node 20+ is required (Next 16 needs >=20.9; Hardhat is unsupported on 18). CI uses Node 20.

### Type-check caveat

`next.config.js` sets `typescript.ignoreBuildErrors: true`, and CI runs `type-check` as **non-blocking** because of pre-existing type errors left behind by the V2 rework — **284 `error TS` lines** as of July 2026, concentrated in hooks and their tests. Plain `npx tsc --noEmit` works (`tsconfig.json` already sets `"ignoreDeprecations": "5.0"`); always `npm install --legacy-peer-deps` first, since measuring without `node_modules` makes npx fetch a different TypeScript and inflates the count wildly. A passing build does NOT mean the types are clean. Don't add new type errors; compare the error count against baseline rather than expecting zero. Use the `/type-debt` skill to burn errors down directory by directory.

## Architecture

### Contract layer (`contracts/`, Solidity 0.8.20)

`TokenFactory.sol` is the entry point: `createToken` deploys a `KRC20Token` (defined in the same file) plus a paired `BondingCurveAMM` through `AMMDeployer.sol` (the deployer `transferOwnership`s each AMM to the platform admin so emergency controls are callable). Each token gets its own AMM instance — there is no shared pool contract. `DeterministicDeployer` uses CREATE2 for the factory address, not for each AMM.

`BondingCurveAMM.sol` holds the trading logic: pricing comes from `contracts/libraries/BondingCurveMath.sol` (V2: sigmoid curve only — see the `project-conventions` skill for what's legacy), fees decay from MAX to MIN bps as supply approaches graduation. When a buy crosses `GRADUATION_THRESHOLD`, `_graduateToken` fires in the same transaction: ~70% of raised funds become DEX liquidity (router resolved per-chain via `DexRouterRegistry.sol`), a `CreatorVesting.sol` contract is deployed for the creator's allocation, and payouts use a pull-payment pattern. Graduation accounting is tracked explicitly rather than reading `address(this).balance` — preserve that invariant when touching AMM code.

Compiler settings in `hardhat.config.ts` matter: `viaIR: true` is required (`buyTokens` hits "stack too deep" under legacy codegen) with optimizer runs=100. Network RPC URLs and deployer key come from `.env.local` / `.env`.

Go-live status (what is actually shipped vs still blocking mainnet) lives in `STATUS.md`. The BSC Testnet addresses in `deployments.json` are a 2025-10-31 factory and do **not** match current source.

After any change to `contracts/**`, run the `solidity-security-reviewer` subagent (`.claude/agents/`) before merging.

### Frontend ↔ contract wiring

- Contract addresses are resolved per chain from `NEXT_PUBLIC_*` env vars in `src/config/contracts.ts`; deployed addresses are also recorded in `deployments.json`
- Chain definitions and wagmi/RainbowKit setup live in `src/config/chains.ts` and `src/config/wagmi.ts`
- `src/hooks/useContracts.ts` is the main contract-interaction hook. It uses **ethers 6 with TypeChain factories** imported from `typechain-types/` (regenerated by `npm run compile`) — wagmi/viem handle wallet connection while ethers handles contract calls. After any contract change, recompile before touching frontend code or types will be stale
- `useMultichainWallet` + `contracts/useContractProvider` supply chainId/provider/signer to everything else

### Data paths

Three parallel sources feed the UI:
1. **Direct RPC reads** via hooks (`useContracts`, `useTokenQuery`, ...) — canonical state
2. **WebSocket server** (`server/src/`) — watches chain events with ethers and pushes live prices over Socket.IO; consumed by `useWebSocket` / `useRealtimeTokenPrice` and `src/lib/websocket`
3. **Subgraph** — historical/aggregate queries via `useSubgraphTokens`, `useSubgraphUser`, `useSubgraphPlatform` and `src/lib/graphql`

Next.js API routes in `src/app/api/` (tokens, analytics, leaderboard, ipfs, push) do server-side RPC aggregation and IPFS uploads. The server's contract ABIs are hand-maintained copies in `server/src/abis/` — keep them in sync after contract changes (same for `src/abis/`; neither is auto-generated).

### Frontend conventions

- TypeScript strict mode plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- Path alias `@/*` → `src/*`; use it instead of deep relative imports
- Components by domain: `ui/` (Radix primitives), `features/` (business logic), `trading/`, `mobile/`, `admin/`, `providers/`
- State: Zustand + TanStack React Query; styling: Tailwind (theme in `tailwind.config.js`)
- Tests sit next to source (`src/hooks/useFoo.test.ts`), setup in `src/test/setup.ts`, Testing Library patterns
- The V2 rework left legacy patterns in the tree — the `project-conventions` skill (`.claude/skills/`) maps current vs deprecated (sigmoid-only curve, `QuickLaunchForm` vs orphaned `LaunchPad`, dead files, stale docs). Consult it before imitating existing code.

## CI / Deployment

PRs to master run (`.github/workflows/ci.yml`): install → type-check (non-blocking) → `test:unit` → `hardhat compile` → `hardhat test` → `build`. All except type-check must pass.

Deployment is handled entirely by the **Vercel GitHub integration**: every push gets a preview deployment, master deploys to production. (The old CLI-based `deploy.yml` workflow was removed in July 2026 — don't recreate it.)

## Claude Code setup

- `.mcp.json` provides **context7** (live docs for wagmi/viem/RainbowKit/Next — use it instead of guessing at fast-moving APIs) and **Sentry** (production error investigation; per-user OAuth on first use).
- Hooks (`.claude/hooks/`): edits to `.env*` and generated code (`typechain-types/`, Hardhat artifacts) are blocked; edited `src/**` files are auto-linted once lint is fixed.
- Subagents: `solidity-security-reviewer` for contract changes.
- Skills (`.claude/skills/`): `project-conventions` (current-vs-legacy map), `/type-debt` (type-error burn-down), plus smart-contract-deployment, web3-testing, kaspump-token-launch, webapp-testing.

## Reference docs

The repo has extensive markdown docs at the root. **Direction:** `STRATEGY.md` (launch frozen until the decision log is filled). **Code/ops inventory:** `STATUS.md`. Also useful: `AGENTS.md`, `CLAUDE.md` (this file), `TECHNICAL_DEBT.md`, `SECURITY_AUDIT.md`, `ROADMAP.md` (backlog, not a launch plan). `BONDING_CURVE_MATH.md` is **pre-V2** (linear/quadratic) — a banner at the top says so; current math is `contracts/libraries/BondingCurveMath.sol`. Everything under `docs/archive/` is historical — don't treat it as current state.
