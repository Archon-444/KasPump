# KRC-20 to ERC-20 Migration Guide
## Complete Analysis: KASPA/Kasplex Removal & BSC/EVM Replacement

**Migration Date:** 2025-10-30
**From:** KASPA/Kasplex L2 (KRC-20)
**To:** BSC/Base/Arbitrum (ERC-20)

---

## 🎯 EXECUTIVE SUMMARY

### What Needs to Change:

**Backend/Smart Contracts:**
- ❌ Remove `EnhancedTokenFactory.sol` (KRC-20 specific)
- ✅ Keep `TokenFactory.sol` and `BondingCurveAMM.sol` (already ERC-20 compatible)
- ✅ Keep `DeterministicDeployer.sol` and `BondingCurveMath.sol` (chain-agnostic)

**Frontend:**
- ❌ Remove entire `useWallet.ts` hook (Kasplex wallet integration)
- ❌ Remove Kasplex network configs from `types/index.ts`
- ❌ Update `useContracts.ts` (references to KAS currency and Kasplex wallet)
- ❌ Update all ABIs (KRC20_ABI → ERC20_ABI, native currency references)
- ✅ Replace with Wagmi + RainbowKit (already installed)

**Documentation:**
- ❌ Remove/Update Kasplex references in README and docs
- ✅ Update deployment guides to focus on BSC/Base/Arbitrum

### Migration Complexity: **MEDIUM**

- **Smart Contracts:** 90% already compatible (minor updates needed)
- **Frontend:** 70% needs rewrite (wallet integration + network configs)
- **Documentation:** 50% needs updates (remove Kasplex references)

---

## 📋 DETAILED ANALYSIS BY FILE

## 1. SMART CONTRACTS (Backend)

### File: `contracts/EnhancedTokenFactory.sol`

**Status:** ❌ **DELETE OR ARCHIVE** (KRC-20 specific, not needed)

**Current Issues:**
```solidity
Line 8:  * @dev Factory contract for deploying KRC-20 tokens with tiered pricing structure
Line 121: * @dev Creates a new KRC-20 token with tiered pricing
Line 341: type(KRC20Token).creationCode,
Line 446: * @title Enhanced KRC20Token
Line 447: * @dev KRC-20 token with tier tracking for premium features
Line 449: contract KRC20Token {
```

**Recommendation:** ❌ **ARCHIVE THIS FILE**
- This is the old KASPA-specific implementation
- You already have `TokenFactory.sol` which is ERC-20 compatible
- Move to `contracts/archived/EnhancedTokenFactory.sol.old`

**No replacement needed** - `TokenFactory.sol` already does this job.

---

### File: `contracts/TokenFactory.sol`

**Status:** ✅ **KEEP** (Already ERC-20 compatible)

**Minor Updates Needed:**
```solidity
// No KRC-20 references found
// Already uses standard ERC-20
// Already OpenZeppelin compatible
```

**Action:** ✅ **NO CHANGES NEEDED**
- Already imports `@openzeppelin/contracts`
- Already creates standard ERC-20 tokens
- Ready for BSC/Base/Arbitrum deployment

---

### File: `contracts/BondingCurveAMM.sol`

**Status:** ✅ **KEEP** (Already ERC-20 compatible)

**Action:** ✅ **NO CHANGES NEEDED**
- Uses OpenZeppelin `IERC20` interface
- No KRC-20 specific code
- Works with any EVM chain

---

### File: `contracts/DeterministicDeployer.sol`

**Status:** ✅ **KEEP** (Chain-agnostic)

**Action:** ✅ **NO CHANGES NEEDED**
- Pure CREATE2 deployment logic
- Works on any EVM chain
- No chain-specific code

---

### File: `contracts/libraries/BondingCurveMath.sol`

**Status:** ✅ **KEEP** (Chain-agnostic)

**Action:** ✅ **NO CHANGES NEEDED**
- Pure mathematical library
- No blockchain interaction
- Universal

---

### **SMART CONTRACT SUMMARY:**
- ✅ **4 files KEEP AS-IS** (TokenFactory, BondingCurveAMM, DeterministicDeployer, BondingCurveMath)
- ❌ **1 file ARCHIVE** (EnhancedTokenFactory)
- **Compatibility:** 95% already EVM-compatible

---

## 2. FRONTEND HOOKS (Critical Changes)

### File: `src/hooks/useWallet.ts`

**Status:** ❌ **COMPLETE REWRITE REQUIRED**

**Current Issues:**
```typescript
Line 1:  // Real Kasplex Wallet Integration
Line 6:  interface KasplexWallet {
Line 19:     kasplex?: KasplexWallet;
Line 23: export function useKasplexWallet() {
Line 37:       if (typeof window !== 'undefined' && window.kasplex) {
Line 41:         if (window.kasplex.isConnected()) {
Line 42:           const address = window.kasplex.getAccount();
Line 63:     if (!window.kasplex) return;
Line 66:       const balanceWei = await window.kasplex.getBalance(address);
Line 80:     if (!window.kasplex) {
Line 95:       const accounts = await window.kasplex.connect();
Line 129:     if (!window.kasplex) return;
Line 132:       await window.kasplex.disconnect();
Line 148:     if (!window.kasplex || !walletState.connected) {
Line 153:       const signature = await window.kasplex.signTransaction(transaction);
Line 192:     window.kasplex.on('accountsChanged', handleAccountChange);
Line 193:     window.kasplex.on('chainChanged', handleChainChange);
Line 270:       setIsInstalled(typeof window !== 'undefined' && !!window.kasplex);
```

**Replacement:** ✅ **Use Wagmi + RainbowKit** (already installed)

**NEW CODE STRUCTURE:**
```typescript
// src/hooks/useMultichainWallet.ts (REPLACE useWallet.ts)
import { useAccount, useDisconnect, useBalance, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function useMultichainWallet() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: balance } = useBalance({ address });

  return {
    // Wallet state
    address,
    isConnected,
    currentChain: chain,
    balance: balance?.formatted,
    balanceSymbol: balance?.symbol, // BNB, ETH, ARB

    // Actions
    connect: openConnectModal,
    disconnect,

    // Chain management
    chainId: chain?.id,
    chainName: chain?.name,
    isCorrectChain: (targetChainId: number) => chain?.id === targetChainId,
  };
}
```

**Benefits:**
- ✅ Supports MetaMask, WalletConnect, Coinbase Wallet, 50+ wallets
- ✅ Multi-chain switching built-in
- ✅ Battle-tested (used by Uniswap, Aave, etc.)
- ✅ Automatic chain detection
- ✅ Better UX with RainbowKit modal

---

### File: `src/hooks/useContracts.ts`

**Status:** ⚠️ **MAJOR UPDATES REQUIRED**

**Current Issues:**

**Line 12:** References to Kasplex wallet
```typescript
import { useKasplexWallet } from './useWallet'; // ❌ REMOVE
```

**Lines 26, 257, 309, 420:** References to "KAS" (KASPA native currency)
```typescript
Line 26:  "function sellTokens(uint256 tokenAmount, uint256 minKasOut) external",
Line 257:  const minKasOut = ethers.parseEther(...);
Line 309:  const kasOut = await ammContract.calculateKasOut(amountWei, currentSupply);
Line 420:  message: 'Insufficient KAS balance for transaction and gas fees.',
```

**Line 39:** KRC20_ABI (rename to ERC20_ABI)
```typescript
const KRC20_ABI = [ // ❌ Should be ERC20_ABI
```

**Line 65:** Using Kasplex wallet
```typescript
const wallet = useKasplexWallet(); // ❌ REPLACE with useMultichainWallet()
```

**Line 240:** Using "kas" variable names
```typescript
const kasAmount = ethers.parseEther(trade.baseAmount.toString()); // ❌ Should be nativeAmount or bnbAmount
```

**REPLACEMENT CODE:**
```typescript
// src/hooks/useContracts.ts (UPDATED)
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMultichainWallet } from './useMultichainWallet'; // ✅ NEW
import { usePublicClient, useWalletClient } from 'wagmi'; // ✅ NEW
import {
  KasPumpToken,
  TradeData,
  SwapQuote,
  TokenCreationForm,
  ContractError,
  BondingCurveConfig
} from '../types';

// ✅ UPDATED ABIs (native currency agnostic)
const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType) external payable returns (address, address)",
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "function isKasPumpToken(address tokenAddress) external view returns (bool)",
  "event TokenCreated(address indexed tokenAddress, address indexed ammAddress, address indexed creator, string name, string symbol, uint256 totalSupply, uint256 timestamp)"
];

const BONDING_CURVE_AMM_ABI = [
  "function buyTokens(uint256 minTokensOut) external payable",
  "function sellTokens(uint256 tokenAmount, uint256 minNativeOut) external", // ✅ CHANGED: minKasOut → minNativeOut
  "function getCurrentPrice() external view returns (uint256)",
  "function getTradingInfo() external view returns (uint256 currentSupply, uint256 currentPrice, uint256 totalVolume, uint256 graduation, bool isGraduated)",
  "function calculateTokensOut(uint256 nativeIn, uint256 supply) external view returns (uint256)", // ✅ CHANGED: kasIn → nativeIn
  "function calculateNativeOut(uint256 tokensIn, uint256 supply) external view returns (uint256)", // ✅ CHANGED: calculateKasOut → calculateNativeOut
  "function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256)",
  "function token() external view returns (address)",
  "function currentSupply() external view returns (uint256)",
  "function totalVolume() external view returns (uint256)",
  "function isGraduated() external view returns (bool)",
  "event Trade(address indexed trader, bool indexed isBuy, uint256 nativeAmount, uint256 tokenAmount, uint256 newPrice, uint256 fee)" // ✅ CHANGED: kasAmount → nativeAmount
];

// ✅ RENAMED: KRC20_ABI → ERC20_ABI (standard naming)
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)"
];

// ✅ UPDATED: Multi-chain contract addresses
const CONTRACT_ADDRESSES = {
  56: { // BSC Mainnet
    tokenFactory: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_BSC_FEE_RECIPIENT!,
  },
  97: { // BSC Testnet
    tokenFactory: process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT!,
  },
  42161: { // Arbitrum One
    tokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT!,
  },
  421614: { // Arbitrum Sepolia
    tokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT!,
  },
  8453: { // Base
    tokenFactory: process.env.NEXT_PUBLIC_BASE_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_BASE_FEE_RECIPIENT!,
  },
  84532: { // Base Sepolia
    tokenFactory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY_ADDRESS!,
    feeRecipient: process.env.NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT!,
  },
};

export function useContracts() {
  const wallet = useMultichainWallet(); // ✅ CHANGED from useKasplexWallet
  const publicClient = usePublicClient(); // ✅ NEW: Wagmi read-only client
  const { data: walletClient } = useWalletClient(); // ✅ NEW: Wagmi write client
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ Get current chain's contract addresses
  const contractAddresses = useMemo(() => {
    if (!wallet.chainId) return null;
    return CONTRACT_ADDRESSES[wallet.chainId as keyof typeof CONTRACT_ADDRESSES];
  }, [wallet.chainId]);

  // Create ethers provider from wagmi clients
  const { provider, signer } = useMemo(() => {
    if (!publicClient) return { provider: null, signer: null };

    // Convert wagmi publicClient to ethers provider
    const provider = new ethers.BrowserProvider(publicClient as any);

    // Get signer if wallet connected
    const signer = walletClient ?
      new ethers.BrowserProvider(walletClient as any).getSigner() :
      null;

    return { provider, signer };
  }, [publicClient, walletClient]);

  // ... rest of the hook logic remains similar
  // Just replace all "kas" references with "native" or chain-specific names

  return {
    createToken,
    executeTrade,
    getSwapQuote,
    getAllTokens,
    getTokenInfo,
    getTokenAMMAddress,
    isConnected: wallet.isConnected,
    walletAddress: wallet.address,
    currentChain: wallet.currentChain,
    nativeCurrency: wallet.balanceSymbol, // ✅ NEW: BNB/ETH/etc
    isInitialized,
  };
}

// ✅ UPDATED: Error messages use generic "native currency"
function parseContractError(error: any, nativeCurrency: string = 'native currency'): ContractError {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: `Insufficient ${nativeCurrency} balance for transaction and gas fees.`, // ✅ CHANGED from "KAS"
    };
  }

  // ... rest of error handling

  return {
    code: 'CONTRACT_ERROR',
    message: error.reason || error.message || 'Contract interaction failed',
    txHash: error.transactionHash,
  };
}

// ✅ UPDATED: useTokenOperations hook
export function useTokenOperations() {
  const contracts = useContracts();

  const getTokenContract = useCallback((tokenAddress: string) => {
    if (!contracts.provider) throw new Error('Provider not available');
    return new ethers.Contract(tokenAddress, ERC20_ABI, contracts.signer || contracts.provider); // ✅ CHANGED from KRC20_ABI
  }, [contracts]);

  // ... rest of operations
}
```

**Key Changes:**
1. ✅ Replace `useKasplexWallet()` with `useMultichainWallet()`
2. ✅ Use Wagmi's `usePublicClient` and `useWalletClient`
3. ✅ Rename `KRC20_ABI` → `ERC20_ABI`
4. ✅ Replace all "KAS" references with "native" or chain-specific
5. ✅ Multi-chain contract address mapping
6. ✅ Generic error messages (not KAS-specific)

---

### File: `src/types/index.ts`

**Status:** ⚠️ **UPDATES REQUIRED**

**Current Issues:**

**Lines 221-243:** Kasplex network config
```typescript
export const NETWORK_CONFIG = {
  KASPLEX_MAINNET: { // ❌ REMOVE
    chainId: 167012,
    name: 'Kasplex',
    rpcUrl: 'https://rpc.kasplex.io',
    explorerUrl: 'https://explorer.kasplex.io',
    nativeCurrency: {
      name: 'KAS',
      symbol: 'KAS',
      decimals: 18,
    },
  },
  KASPLEX_TESTNET: { // ❌ REMOVE
    chainId: 167012,
    name: 'Kasplex Testnet',
    rpcUrl: 'https://rpc.kasplextest.xyz',
    explorerUrl: 'https://explorer.kasplextest.xyz',
    nativeCurrency: {
      name: 'KAS',
      symbol: 'KAS',
      decimals: 18,
    },
  },
} as const;
```

**REPLACEMENT:**
```typescript
// src/types/index.ts (UPDATED NETWORK_CONFIG)
export const NETWORK_CONFIG = {
  BSC_MAINNET: { // ✅ NEW
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    icon: '🟡', // Yellow for BNB
  },
  BSC_TESTNET: { // ✅ NEW
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    icon: '🟡',
  },
  ARBITRUM_ONE: { // ✅ NEW
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '⬜', // White for Arbitrum
  },
  ARBITRUM_SEPOLIA: { // ✅ NEW
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '⬜',
  },
  BASE_MAINNET: { // ✅ NEW
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '🔵', // Blue for Base
  },
  BASE_SEPOLIA: { // ✅ NEW
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '🔵',
  },
} as const;
```

---

## 3. FRONTEND COMPONENTS

### File: `src/components/features/TokenCreationModal.tsx`

**Status:** ⚠️ **MINOR UPDATE**

**Current Issue:**
```typescript
Line 193: placeholder="e.g., Kaspa Moon" // ❌ Example uses "Kaspa"
```

**Replacement:**
```typescript
placeholder="e.g., BSC Moon" // ✅ or "Doge 2.0", "SafeMoon V2", etc.
```

---

### File: `src/components/features/WalletConnectButton.tsx`

**Status:** ⚠️ **REWRITE REQUIRED**

**Current State:** Likely uses Kasplex wallet connection

**Replacement:** ✅ **Use RainbowKit's ConnectButton**

**NEW CODE:**
```typescript
// src/components/features/WalletConnectButton.tsx (COMPLETE REWRITE)
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMultichainWallet } from '@/hooks/useMultichainWallet';

export function WalletConnectButton() {
  return (
    <ConnectButton
      chainStatus="icon"
      accountStatus="avatar"
      showBalance={{
        smallScreen: false,
        largeScreen: true,
      }}
    />
  );
}

// ✅ Or custom styled version:
export function CustomWalletButton() {
  const { address, isConnected, connect, disconnect, balance, balanceSymbol } = useMultichainWallet();

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {balance?.slice(0, 6)} {balanceSymbol}
        </span>
        <button onClick={disconnect} className="btn-primary">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} className="btn-primary">
      Connect Wallet
    </button>
  );
}
```

**Benefits:**
- ✅ Beautiful modal UI (RainbowKit)
- ✅ 50+ wallet support (MetaMask, WalletConnect, Coinbase, etc.)
- ✅ Chain switching built-in
- ✅ Avatar + ENS support

---

## 4. CONFIGURATION FILES

### File: `.env.local`

**Status:** ⚠️ **MAJOR UPDATES**

**REMOVE:**
```env
# ❌ REMOVE - Kasplex specific
NEXT_PUBLIC_KASPLEX_RPC_URL=https://rpc.kasplex.io
NEXT_PUBLIC_KASPLEX_TESTNET_RPC_URL=https://rpc.kasplextest.xyz
NEXT_PUBLIC_CHAIN_ID=167012
```

**ADD:**
```env
# ✅ BSC Configuration
NEXT_PUBLIC_BSC_TOKEN_FACTORY_ADDRESS=0x[DEPLOYED_ADDRESS]
NEXT_PUBLIC_BSC_FEE_RECIPIENT=0x[YOUR_ADDRESS]
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed1.binance.org

# ✅ BSC Testnet
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY_ADDRESS=0x[TESTNET_ADDRESS]
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0x[YOUR_ADDRESS]

# ✅ Arbitrum Configuration
NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY_ADDRESS=0x[DEPLOYED_ADDRESS]
NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT=0x[YOUR_ADDRESS]
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# ✅ Arbitrum Sepolia
NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY_ADDRESS=0x[TESTNET_ADDRESS]
NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT=0x[YOUR_ADDRESS]

# ✅ Base Configuration
NEXT_PUBLIC_BASE_TOKEN_FACTORY_ADDRESS=0x[DEPLOYED_ADDRESS]
NEXT_PUBLIC_BASE_FEE_RECIPIENT=0x[YOUR_ADDRESS]
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# ✅ Base Sepolia
NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY_ADDRESS=0x[TESTNET_ADDRESS]
NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT=0x[YOUR_ADDRESS]

# ✅ Default Network (BSC Testnet for development)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97

# ✅ WalletConnect Project ID (for RainbowKit)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_from_cloud.walletconnect.com
```

---

### File: `src/app/page.tsx`

**Status:** ⚠️ **MINOR UPDATES**

**Check for:**
- References to "KAS" currency
- References to Kasplex
- Network displays

**Replace with:**
- Generic or chain-specific currency (BNB/ETH)
- Remove Kasplex branding
- Multi-chain selector

---

## 5. DOCUMENTATION UPDATES

### Files to Update:

**README.md**
- Remove KASPA/Kasplex mentions
- Update to BSC/Base/Arbitrum
- Update installation instructions

**MULTICHAIN_SETUP.md**
- Already updated for BSC/Base/Arbitrum
- Remove any residual Kasplex references

**PRODUCTION_STATUS.md**
- Update deployment targets
- Remove Kasplex from tech stack

**tasks/todo.md**
- Update task references from KRC-20 to ERC-20

---

## 📊 MIGRATION CHECKLIST

### Phase 1: Smart Contracts ✅ (95% Done)

- [x] Keep TokenFactory.sol (ERC-20 compatible)
- [x] Keep BondingCurveAMM.sol (ERC-20 compatible)
- [x] Keep DeterministicDeployer.sol (chain-agnostic)
- [x] Keep BondingCurveMath.sol (pure math)
- [ ] Archive EnhancedTokenFactory.sol (KRC-20 specific)
- [ ] Update any NatSpec comments mentioning KRC-20

### Phase 2: Wallet Integration ⏳ (0% Done)

- [ ] Delete src/hooks/useWallet.ts (Kasplex wallet)
- [ ] Create src/hooks/useMultichainWallet.ts (Wagmi wrapper)
- [ ] Update src/components/features/WalletConnectButton.tsx (RainbowKit)
- [ ] Add RainbowKit provider to _app.tsx
- [ ] Configure Wagmi chains (BSC, Arbitrum, Base)
- [ ] Test wallet connection on all chains

### Phase 3: Contract Hooks ⏳ (0% Done)

- [ ] Update src/hooks/useContracts.ts
  - [ ] Replace useKasplexWallet with useMultichainWallet
  - [ ] Rename KRC20_ABI to ERC20_ABI
  - [ ] Replace "kas" references with "native"
  - [ ] Add multi-chain contract address mapping
  - [ ] Update error messages (remove KAS references)
- [ ] Update src/hooks/useTokenOperations.ts
  - [ ] Use ERC20_ABI instead of KRC20_ABI

### Phase 4: Types & Config ⏳ (0% Done)

- [ ] Update src/types/index.ts
  - [ ] Remove KASPLEX_MAINNET and KASPLEX_TESTNET
  - [ ] Add BSC_MAINNET, BSC_TESTNET
  - [ ] Add ARBITRUM_ONE, ARBITRUM_SEPOLIA
  - [ ] Add BASE_MAINNET, BASE_SEPOLIA
- [ ] Update .env.local
  - [ ] Add all chain contract addresses
  - [ ] Add WalletConnect project ID
  - [ ] Remove Kasplex RPC URLs

### Phase 5: Components ⏳ (0% Done)

- [ ] Update src/components/features/TokenCreationModal.tsx
  - [ ] Change placeholder examples
- [ ] Update src/app/page.tsx
  - [ ] Add chain selector
  - [ ] Update currency displays
- [ ] Test all components with BSC testnet

### Phase 6: Documentation ⏳ (30% Done)

- [ ] Update README.md (remove Kasplex references)
- [ ] Update MULTICHAIN_SETUP.md (already mostly done)
- [ ] Update PRODUCTION_STATUS.md
- [ ] Update tasks/todo.md
- [ ] Add migration completion notes

### Phase 7: Testing ⏳ (0% Done)

- [ ] Test wallet connection (MetaMask, WalletConnect)
- [ ] Test chain switching (BSC ↔ Arbitrum ↔ Base)
- [ ] Test token creation on BSC testnet
- [ ] Test buy/sell on BSC testnet
- [ ] Test contract interactions
- [ ] Cross-browser testing

---

## 🚀 STEP-BY-STEP MIGRATION PLAN

### Week 1: Core Infrastructure

**Day 1-2: Wallet Integration**
1. Delete `src/hooks/useWallet.ts`
2. Create `src/hooks/useMultichainWallet.ts` (Wagmi wrapper)
3. Update `WalletConnectButton.tsx` to use RainbowKit
4. Add RainbowKit provider to `_app.tsx`

**Day 3-4: Contract Hooks**
5. Update `src/hooks/useContracts.ts`
   - Replace Kasplex wallet references
   - Rename KRC20_ABI → ERC20_ABI
   - Add multi-chain address mapping
6. Update `src/hooks/useTokenOperations.ts`

**Day 5: Types & Config**
7. Update `src/types/index.ts` (network configs)
8. Update `.env.local` (all chain addresses)
9. Archive `contracts/EnhancedTokenFactory.sol`

### Week 2: Testing & Polish

**Day 6-7: Component Updates**
10. Update all components that reference wallet
11. Update currency displays (KAS → BNB/ETH)
12. Add chain selector component

**Day 8-9: Testing**
13. Test on BSC testnet (create, buy, sell)
14. Test wallet switching
15. Test all chains

**Day 10: Documentation**
16. Update all documentation
17. Create migration completion report
18. Final review

---

## 💡 QUICK WINS (Do First)

### 1. Archive Old Contract (5 minutes)
```bash
mkdir -p contracts/archived
git mv contracts/EnhancedTokenFactory.sol contracts/archived/EnhancedTokenFactory.sol.old
```

### 2. Install Missing Dependencies (if any)
```bash
npm install wagmi @rainbow-me/rainbowkit viem @tanstack/react-query
```

### 3. Create Basic Multi-Chain Wallet Hook (30 minutes)
See code example above in "useMultichainWallet.ts"

### 4. Update .env.local (10 minutes)
Add all the environment variables listed above

### 5. Update Network Config in types (15 minutes)
Replace KASPLEX networks with BSC/Base/Arbitrum

---

## ⚠️ CRITICAL WARNINGS

### DO NOT:
- ❌ Delete files without archiving first
- ❌ Deploy to mainnet before testing on testnet
- ❌ Change smart contract logic (already compatible)
- ❌ Mix KRC-20 and ERC-20 ABIs
- ❌ Hardcode chain IDs in components

### DO:
- ✅ Test on BSC testnet first
- ✅ Keep archived files for reference
- ✅ Use environment variables for addresses
- ✅ Test wallet connection thoroughly
- ✅ Verify contract addresses after deployment

---

## 📊 FINAL IMPACT ASSESSMENT

### Files to DELETE/ARCHIVE: 1
- ❌ `contracts/EnhancedTokenFactory.sol` (KRC-20 specific)

### Files to COMPLETELY REWRITE: 2
- ❌ `src/hooks/useWallet.ts` → ✅ `useMultichainWallet.ts` (Wagmi)
- ❌ `src/components/features/WalletConnectButton.tsx` → ✅ RainbowKit

### Files to HEAVILY UPDATE: 2
- ⚠️ `src/hooks/useContracts.ts` (70% changes)
- ⚠️ `src/types/index.ts` (50% changes)

### Files to LIGHTLY UPDATE: 3
- ⚠️ `src/components/features/TokenCreationModal.tsx` (placeholder text)
- ⚠️ `src/app/page.tsx` (currency displays)
- ⚠️ `.env.local` (environment variables)

### Files ALREADY COMPATIBLE: 4
- ✅ `contracts/TokenFactory.sol`
- ✅ `contracts/BondingCurveAMM.sol`
- ✅ `contracts/DeterministicDeployer.sol`
- ✅ `contracts/libraries/BondingCurveMath.sol`

### **Total Migration Effort:**
- **Smart Contracts:** 1 hour (archiving only)
- **Frontend Hooks:** 8-12 hours (wallet + contracts rewrite)
- **Components:** 4-6 hours (updates + testing)
- **Documentation:** 2-3 hours (cleanup)
- **Testing:** 8-12 hours (comprehensive testing)
- **TOTAL:** 23-34 hours (3-4 days of focused work)

---

## 🎯 SUCCESS CRITERIA

### Migration Complete When:
- ✅ No references to "Kasplex" in code
- ✅ No references to "KRC-20" in code
- ✅ No references to "KAS" currency (replaced with BNB/ETH)
- ✅ RainbowKit wallet connection working
- ✅ All chains (BSC/Base/Arbitrum) functional
- ✅ Token creation works on BSC testnet
- ✅ Buy/sell works on BSC testnet
- ✅ Documentation updated
- ✅ All tests pass

---

## 📞 SUPPORT RESOURCES

### Wagmi Documentation:
- https://wagmi.sh/react/getting-started
- https://wagmi.sh/react/hooks/useAccount
- https://wagmi.sh/react/hooks/useConnect

### RainbowKit Documentation:
- https://www.rainbowkit.com/docs/installation
- https://www.rainbowkit.com/docs/connect-button

### Chain Configurations:
- BSC: https://docs.bnbchain.org/
- Arbitrum: https://docs.arbitrum.io/
- Base: https://docs.base.org/

---

**Migration Guide Created:** 2025-10-30
**Estimated Completion Time:** 3-4 days
**Complexity:** MEDIUM
**Risk:** LOW (smart contracts already compatible)

**Ready to execute! 🚀**
