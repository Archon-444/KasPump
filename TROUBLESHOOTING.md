# Troubleshooting Guide

## Webpack Module Loading Error with Next.js + Wagmi

### Error Signature
```
TypeError: Cannot read properties of undefined (reading 'call')
at RootLayout (src/app/layout.tsx:79:9)
```

### Root Causes Identified

1. **Circular Dependency in UI Components**
   - Components were re-exported through multiple files creating a circular dependency
   - Webpack failed to properly resolve the module graph during SSR

2. **SSR Evaluation of Web3Provider**
   - Static import of Web3Provider caused webpack to evaluate wagmi configuration during server-side rendering
   - Wagmi hooks (useAccount, useConnect, etc.) were called before WagmiProvider could mount
   - Result: `WagmiProviderNotFoundError: useConfig must be used within WagmiProvider`

3. **Build Cache Issues**
   - Stale webpack cache in `.next` directory
   - Browser cache holding old error state

### Solution Applied

#### 1. Fix Circular Dependencies in UI Components

**File: `src/components/ui/index.tsx`**

- Added `'use client'` directive at the top of the file
- Removed re-exports of Skeleton components from separate files
- Inlined Skeleton and SkeletonGroup components directly (lines 314-385)

```typescript
'use client';

// Inlined components instead of re-exporting
export const Skeleton: React.FC<SkeletonProps> = ({ ... }) => { ... };
export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({ ... }) => { ... };
```

#### 2. Implement Dynamic Web3Provider Import

**File: `src/components/providers/AppProviders.tsx`**

- Removed static import: `~~import { Web3Provider } from '../../providers/Web3Provider';~~`
- Added dynamic import in useEffect:

```typescript
const [Web3Provider, setWeb3Provider] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);

useEffect(() => {
  setIsMounted(true);

  // Dynamically import Web3Provider to prevent webpack from evaluating it during SSR
  import('../../providers/Web3Provider')
    .then((module) => {
      setWeb3Provider(() => module.Web3Provider);
    })
    .catch((error) => {
      console.error('Failed to load Web3Provider:', error);
    });
}, []);
```

#### 3. Prevent SSR Rendering of Children

**File: `src/components/providers/AppProviders.tsx`**

- Added guard to prevent children rendering during SSR:

```typescript
// Don't render children during SSR - prevents wagmi hook errors
if (!isMounted) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
    </div>
  );
}
```

#### 4. Clean Build and Browser Cache

```bash
# Clean all caches
rm -rf .next node_modules/.cache tsconfig.tsbuildinfo

# Restart dev server
npm run dev
```

**Important**: Users must also hard refresh their browser:
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

### Configuration Simplification (BSC Only)

**File: `src/config/wagmi.ts`**

Simplified to support only BSC chains:

```typescript
async function getChains() {
  const { bsc, bscTestnet } = await import('wagmi/chains');
  return [bsc, bscTestnet] as const;
}

async function createConnectors(): Promise<any[]> {
  const { injected, metaMask } = await import('wagmi/connectors');
  return [
    metaMask({ dappMetadata: { name: 'KasPump', url: origin } }),
    injected({ shimDisconnect: true }),
  ];
}
```

### Prevention Checklist

When adding new Web3/wagmi features:

- [ ] Use dynamic imports for wagmi-dependent components
- [ ] Add `'use client'` directive to all wagmi-using components
- [ ] Avoid circular dependencies in component exports
- [ ] Test SSR rendering (check `view-source:http://localhost:3000`)
- [ ] Ensure WagmiProvider wraps all components using wagmi hooks
- [ ] Clear caches after major structural changes

### Expected Warnings (Non-Breaking)

These warnings are handled by webpack fallbacks in `next.config.js`:

```
Module not found: Can't resolve '@react-native-async-storage/async-storage'
Module not found: Can't resolve 'pino-pretty'
```

These are cosmetic warnings from optional dependencies and do not affect functionality.

### Verification Steps

1. **Server-side**: Check dev server logs show HTTP 200 for all pages
2. **Client-side**: Open browser DevTools console - should be error-free
3. **Network**: All API calls and resources should load successfully
4. **Functionality**: Wallet connection should work (MetaMask, injected wallets)

### References

- [Wagmi SSR Documentation](https://wagmi.sh/react/guides/ssr)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
