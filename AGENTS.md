# AGENTS.md — KasPump

## Project Overview

KasPump is a Pump.fun-style token launchpad on EVM chains (starting with BNB Smart Chain). It provides instant ERC-20 token deployment, bonding curve pricing (linear, exponential, adaptive), and DEX graduation. The app targets BSC, Arbitrum, and Base networks.

## Repository Structure

```
/                          # Root — Next.js 16 app + Hardhat smart contracts
├── contracts/             # Solidity 0.8.20 smart contracts
├── scripts/               # Hardhat deployment & utility scripts
├── server/                # Standalone WebSocket server (Express + Socket.IO)
├── subgraph/              # The Graph protocol indexer (AssemblyScript)
├── src/                   # Next.js App Router frontend
│   ├── app/               # Pages (/, /launch, /analytics, /portfolio, etc.)
│   ├── components/        # React components (ui/, features/, trading/, mobile/, admin/, providers/)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Library code & utilities
│   ├── config/            # Chain & app configuration
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── test/              # Test setup (setup.ts)
├── tools/                 # Standalone Vite/React dev tools
│   ├── bonding-curve-simulator/
│   ├── token-launch-wizard/
│   └── portfolio-analytics/
├── typechain-types/       # Generated TypeScript bindings for contracts
├── public/                # Static assets
└── docs/                  # Documentation and archive
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI |
| Web3 | wagmi, RainbowKit, ethers 6, viem |
| State | Zustand, TanStack React Query |
| Realtime | Socket.IO (client + server) |
| Smart contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Indexing | The Graph (subgraph) |
| Server | Node.js, Express, Socket.IO, ioredis, winston |
| Testing | Vitest (frontend), Hardhat/Mocha/Chai (contracts), Jest (server) |
| CI/CD | GitHub Actions → Vercel |

## Development Environment Setup

### Prerequisites

- Node.js 18+
- npm

### Install and Run

```bash
# Root (Next.js frontend + Hardhat contracts)
npm install --legacy-peer-deps
cp .env.example .env.local  # Then fill in required values
npm run dev                  # http://localhost:3000

# WebSocket server (separate terminal)
cd server && npm install && npm run dev  # http://localhost:4000

# Standalone tools (separate terminal)
cd tools/bonding-curve-simulator && npm install && npm run dev
```

### Required Environment Variables

At minimum for local development, set in `.env.local`:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — from https://cloud.walletconnect.com
- `NEXT_PUBLIC_DEFAULT_CHAIN_ID` — `97` for BSC Testnet
- `NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY` — deployed contract address
- `NEXT_PUBLIC_BSC_TESTNET_RPC_URL` — BSC Testnet RPC endpoint

Run `npm run check-env` to validate environment configuration.

## Cursor Cloud Specific Instructions

### Running the Frontend Dev Server

```bash
npm install --legacy-peer-deps
npm run dev
```

The dev server starts at `http://localhost:3000`. Use `--legacy-peer-deps` because the project has peer dependency conflicts between React 19 and some packages.

### Running the WebSocket Server

```bash
cd server
npm install
npm run dev
```

Runs on port 4000. Requires `server/.env` (see `server/.env.example`).

## Code Conventions

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig)
- Path aliases: `@/*` maps to `src/*`, plus `@/components/*`, `@/hooks/*`, `@/types/*`, `@/utils/*`, `@/lib/*`
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `exactOptionalPropertyTypes` are all enabled
- Use `import` from `@/...` paths, never relative paths that escape `src/`

### React / Next.js

- App Router pattern (files in `src/app/`)
- Components organized by domain: `ui/` for base primitives (Radix), `features/` for business logic, `trading/` for trading UI, `mobile/` for mobile-optimized views
- Hooks in `src/hooks/`; prefix with `use`
- Providers in `src/components/providers/`

### Smart Contracts

- Solidity 0.8.20 with optimizer (200 runs)
- OpenZeppelin for access control, reentrancy guards
- TypeChain generates TypeScript types to `typechain-types/`

### Styling

- Tailwind CSS with Radix UI component library
- Custom theme defined in `tailwind.config.js`
- PostCSS with Autoprefixer

## Testing

### Frontend Unit Tests (Vitest)

```bash
npm run test:unit           # Single run
npm run test:unit:watch     # Watch mode
npm run test:unit:coverage  # With coverage report
```

- Framework: Vitest with jsdom
- Tests located in `src/**/*.{test,spec}.{ts,tsx}`
- Setup file: `src/test/setup.ts`
- Uses `@testing-library/react` and `@testing-library/jest-dom`

### Smart Contract Tests (Hardhat)

```bash
npm run test                # All contract tests
npm run test:bsc            # Test against BSC Testnet
```

- Tests in `test/*.test.ts`
- Uses Hardhat + Mocha + Chai

### Server Tests (Jest)

```bash
cd server && npm test
```

### Type Checking

```bash
npm run type-check          # tsc --noEmit
```

### When to Write Tests

- New React hooks or components with business logic should have Vitest tests
- New Solidity contracts or functions should have Hardhat tests in `test/`
- Follow existing test patterns in `src/components/features/__tests__/` and `src/hooks/*.test.ts`

## Linting

```bash
npm run lint                # ESLint via next lint (root app)
```

- Root app uses `eslint-config-next`
- Tools use ESLint 9 with flat config
- No Prettier configured; no Husky/lint-staged hooks

## Build

```bash
npm run build               # Compiles contracts + builds Next.js
npm run compile             # Hardhat compile only
```

- `next.config.js` has `ignoreBuildErrors: true` for TypeScript
- Vercel config in `vercel.json` with `--legacy-peer-deps` install

## Deployment

### Frontend (Vercel)

- CI/CD via `.github/workflows/deploy.yml`
- Pushes to `main` deploy to production; all other branches get preview URLs
- PR deployments auto-comment the preview URL

### Smart Contracts (Hardhat)

```bash
npm run deploy:bsc-testnet              # Standard deploy
npm run deploy:deterministic:bsc-testnet # Deterministic deploy
npm run verify:auto-retry               # Verify on explorer
npm run deployment:status               # Check deployment status
```

### Subgraph (The Graph)

```bash
cd subgraph
npm run codegen && npm run build
npm run deploy:testnet
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `hardhat.config.js` | Solidity compiler, networks, Etherscan keys |
| `next.config.js` | Next.js build config, image domains, webpack externals |
| `tailwind.config.js` | Theme, colors, animations, content paths |
| `vitest.config.ts` | Test environment, setup file, coverage |
| `vercel.json` | Deployment config, headers, regions |
| `deployments.json` | Deployed contract addresses per network |
| `.env.example` | Template for all environment variables |
| `sentry.*.config.ts` | Error monitoring configuration |

## Common Tasks

### Adding a New Page

Create `src/app/<route>/page.tsx` following the App Router convention. Use existing page files as reference.

### Adding a New Smart Contract

1. Create `contracts/NewContract.sol`
2. Add tests in `test/NewContract.test.ts`
3. Run `npm run compile` to generate TypeChain types
4. Add deployment script in `scripts/`

### Adding a New Hook

Create `src/hooks/useMyHook.ts`. Add tests in `src/hooks/useMyHook.test.ts`.

### Working with Contract ABIs

ABIs are in `server/src/abis/` for the WebSocket server and auto-generated via TypeChain for the frontend. After contract changes, run `npm run compile` to regenerate.
