# Contract Configuration Guide

## Overview

KasPump requires deployed TokenFactory contracts on each chain you want to support. This guide explains how to configure contract addresses after deployment.

## Current Deployment Status

Based on `deployments.json`:

- ✅ **BSC Testnet (97)**: Contracts deployed
  - TokenFactory: `0x7Af627Bf902549543701C58366d424eE59A4ee08`
  - FeeRecipient: `0xEFec2Eddf5151c724B610B7e5fa148752674D667`

- ❌ **BSC Mainnet (56)**: Not deployed
- ❌ **Arbitrum One (42161)**: Not deployed
- ❌ **Base (8453)**: Not deployed
- ❌ **Arbitrum Sepolia (421614)**: Not deployed
- ❌ **Base Sepolia (84532)**: Not deployed

## Configuration Steps

### 1. Deploy Contracts

First, deploy your TokenFactory contract to the desired chain:

```bash
# For BSC Mainnet
npm run deploy:deterministic:bsc

# For BSC Testnet (already deployed)
npm run deploy:deterministic:bsc-testnet

# For other chains
npm run deploy:deterministic:arbitrum
npm run deploy:deterministic:base
```

### 2. Set Environment Variables

Create or update `.env.local` with the deployed contract addresses:

```bash
# BSC Mainnet (Chain ID: 56)
NEXT_PUBLIC_BSC_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_BSC_FEE_RECIPIENT=0xYourFeeRecipientAddress

# BSC Testnet (Chain ID: 97) - Already configured
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x7Af627Bf902549543701C58366d424eE59A4ee08
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0xEFec2Eddf5151c724B610B7e5fa148752674D667

# Arbitrum One (Chain ID: 42161)
NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT=0xYourFeeRecipientAddress

# Arbitrum Sepolia (Chain ID: 421614)
NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT=0xYourFeeRecipientAddress

# Base (Chain ID: 8453)
NEXT_PUBLIC_BASE_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_BASE_FEE_RECIPIENT=0xYourFeeRecipientAddress

# Base Sepolia (Chain ID: 84532)
NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT=0xYourFeeRecipientAddress
```

### 3. Restart Development Server

After updating environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## How It Works

The app reads contract addresses from environment variables in `src/config/contracts.ts`:

```typescript
export const contractAddresses: Record<number, ContractAddresses> = {
  56: {
    TokenFactory: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BSC_FEE_RECIPIENT || '',
  },
  // ... other chains
};
```

## Error Messages

If you see: **"Token factory not deployed on [Chain Name] (chain [ID])"**

This means:
1. The contract hasn't been deployed to that chain, OR
2. The environment variable isn't set, OR
3. The environment variable is empty

**Solution:**
- Deploy the contracts to that chain (see step 1)
- Set the environment variables (see step 2)
- Restart the dev server (see step 3)

## Supported Chains Helper

The app includes helper functions to check which chains are configured:

- `getSupportedChains()` - Returns array of chain IDs with deployed contracts
- `getChainName(chainId)` - Returns human-readable chain name
- `areContractsDeployed(chainId)` - Returns boolean if contracts are deployed

## Testing

After configuration, test by:

1. Connecting your wallet
2. Switching to the configured chain
3. Opening the token creation modal
4. You should see no "Contracts Not Deployed" warning

## Quick Reference

| Chain | Chain ID | Status | Factory Address |
|-------|----------|--------|----------------|
| BSC Mainnet | 56 | ❌ Not Deployed | Set `NEXT_PUBLIC_BSC_TOKEN_FACTORY` |
| BSC Testnet | 97 | ✅ Deployed | `0x7Af627Bf902549543701C58366d424eE59A4ee08` |
| Arbitrum One | 42161 | ❌ Not Deployed | Set `NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY` |
| Arbitrum Sepolia | 421614 | ❌ Not Deployed | Set `NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY` |
| Base | 8453 | ❌ Not Deployed | Set `NEXT_PUBLIC_BASE_TOKEN_FACTORY` |
| Base Sepolia | 84532 | ❌ Not Deployed | Set `NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY` |

## Need Help?

- Check `DEPLOYMENT_HELPER.md` for detailed deployment instructions
- Check `TESTNET_DEPLOYMENT_GUIDE.md` for testnet setup
- Review deployment logs in `deployments.json`

