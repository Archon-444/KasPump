---
name: type-debt
description: Burn down pre-existing TypeScript errors in a target directory or file, without behavior changes. Reports the before/after global error count. Usage - /type-debt src/hooks or /type-debt src/components/features/TokenCard.tsx
disable-model-invocation: true
---

# Type-debt burn-down

Incrementally fix the pre-existing TypeScript errors left behind by the V2 rework so `type-check` can eventually become a blocking CI step.

## Background

- `next.config.js` sets `typescript.ignoreBuildErrors: true` and `.github/workflows/ci.yml` runs `type-check` with `continue-on-error: true`. The ci.yml comment says "~470 pre-existing errors", but the real baseline is far larger: **~5,100 `error TS` lines** as of July 2026.
- `tsc` aborts on tsconfig deprecation errors (`moduleResolution: node10`, `baseUrl`) unless invoked with `--ignoreDeprecations 6.0`.
- Worst files (errors, descending): `src/components/features/LaunchPad.tsx` (legacy, orphaned — consider whether deleting beats fixing), `src/components/features/TokenCard.tsx`, `src/components/mobile/MobileTokenCard.tsx`, `src/components/features/MultichainWalletButton.tsx`, `src/components/admin/AdminDeploymentDashboard.tsx`, `src/app/settings/page.tsx`, `src/app/disclaimer/page.tsx`, `src/components/features/TokenTradingPage.tsx`, `src/components/features/TradingInterface.tsx`, `src/app/privacy/page.tsx`, `src/app/page.tsx`, `src/app/terms/page.tsx`.

## Workflow

1. **Scope**: use the argument as the target directory or file. With no argument, pick the worst not-yet-clean file from the list above (skip `LaunchPad.tsx` unless asked — it may be deleted instead).

2. **Baseline**:
   ```bash
   npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep -c "error TS"
   ```
   Also capture the per-file errors for the scope:
   ```bash
   npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "^<scope-path>"
   ```

3. **Fix** every error in scope. Rules:
   - No runtime behavior changes — types only. If a type error reveals a genuine bug, fix the types, flag the bug in the final report, and only change behavior if the user confirms.
   - No `any`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as` escapes — write real types. Reuse existing types from `src/types/` before defining new ones.
   - Never edit `typechain-types/` (generated — `npm run compile`) or add new type errors elsewhere.

4. **Verify**:
   ```bash
   npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep -c "error TS"   # must be lower
   npm run test:unit                                                     # must still pass
   ```

5. **Report**: global count before → after, files touched, and any genuine bugs the types uncovered.

## End goal

When the global count reaches 0: remove `continue-on-error: true` from the type-check step in `.github/workflows/ci.yml`, set `typescript.ignoreBuildErrors: false` in `next.config.js`, and clean up the tsconfig deprecations so the `--ignoreDeprecations` flag can be dropped.
