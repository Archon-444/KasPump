---
name: type-debt
description: Burn down pre-existing TypeScript errors in a target directory or file, without behavior changes. Reports the before/after global error count. Usage - /type-debt src/hooks or /type-debt src/components/features/TokenCard.tsx
disable-model-invocation: true
---

# Type-debt burn-down

Incrementally fix the pre-existing TypeScript errors left behind by the V2 rework so `type-check` can eventually become a blocking CI step.

## Background

- `next.config.js` sets `typescript.ignoreBuildErrors: true` and `.github/workflows/ci.yml` runs `type-check` with `continue-on-error: true`.
- Baseline: **284 `error TS` lines** as of July 2026 (was 450 before the first burn-down pass fixed the jest-dom/Vitest matcher augmentation and the `features/__tests__/` files). Run `npm install --legacy-peer-deps` first — measuring with a missing `node_modules` makes npx fetch a different TypeScript and produces wildly inflated counts (an earlier audit got ~5,100 this way).
- Plain `npx tsc --noEmit` works: `tsconfig.json` already carries `"ignoreDeprecations": "5.0"`. Do NOT pass `--ignoreDeprecations` on the CLI (the installed TS 5.9 rejects `6.0`).
- Worst remaining files (errors, descending): `src/hooks/useCreatorTokens.test.ts` (22), `src/hooks/usePortfolio.test.ts` (18), `src/hooks/useContracts.ts` (17), `src/hooks/usePortfolio.ts` (13), `src/hooks/usePriceAlerts.test.ts` (12), `src/hooks/useCreatorTokens.ts` (12), `src/lib/ipfs.ts` (10), `src/integrations/PartnershipIntegration.ts` (8), `src/components/features/TradingChart.tsx` (8), `src/contexts/ToastContext.tsx` (7).

## Workflow

1. **Scope**: use the argument as the target directory or file. With no argument, pick the worst not-yet-clean file from the list above. When errors in a scope share one root cause (e.g. a missing type augmentation in `src/test/setup.ts` once accounted for 157 errors), fix the cause, not the symptoms.

2. **Baseline**:
   ```bash
   npx tsc --noEmit 2>&1 | grep -c "error TS"
   ```
   Also capture the per-file errors for the scope:
   ```bash
   npx tsc --noEmit 2>&1 | grep "^<scope-path>"
   ```

3. **Fix** every error in scope. Rules:
   - No runtime behavior changes — types only. If a type error reveals a genuine bug, fix the types, flag the bug in the final report, and only change behavior if the user confirms.
   - No `any`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as` escapes — write real types. Reuse existing types from `src/types/` before defining new ones.
   - Never edit `typechain-types/` (generated — `npm run compile`) or add new type errors elsewhere.

4. **Verify**:
   ```bash
   npx tsc --noEmit 2>&1 | grep -c "error TS"   # must be lower
   npm run test:unit                            # must still pass
   ```

5. **Report**: global count before → after, files touched, and any genuine bugs the types uncovered.

## End goal

When the global count reaches 0: remove `continue-on-error: true` from the type-check step in `.github/workflows/ci.yml`, set `typescript.ignoreBuildErrors: false` in `next.config.js`, and migrate `moduleResolution`/`baseUrl` off the deprecated settings so `"ignoreDeprecations"` can leave `tsconfig.json`.
