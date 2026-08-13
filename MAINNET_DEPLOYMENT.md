# KasPump BSC Mainnet Deployment Guide

**Status:** Not ready for mainnet. Current source must first be redeployed to BSC Testnet, owned by a Gnosis Safe, audited, and smoke-tested. See [STATUS.md](./STATUS.md).

**Target Network:** BNB Smart Chain Mainnet (Chain ID: 56)  
**Deployment Method:** Deterministic CREATE2 (`scripts/deploy-deterministic.ts`)

---

## Overview

This guide walks through deploying KasPump smart contracts to BSC mainnet using deterministic CREATE2 deployment.

**What Gets Deployed:**
- `DeterministicDeployer` — CREATE2 factory (address differs per chain)
- `DexRouterRegistry` — per-chain V2 router
- `TokenFactory` — token creation and registry
- `AMMDeployer` — deploys each BondingCurveAMM and transfers ownership to the platform admin (**required**; without it `createToken` reverts)

`CreatorVesting` is created per token at graduation, not at factory deploy.

The October 2025 BSC Testnet factory in `deployments.json` does **not** match this bytecode. Do not skip a fresh testnet deploy.

**Estimated Costs (order of magnitude):** ~0.02–0.05 BNB plus buffer. Re-measure after compile; `AMMDeployer` was added after older cost estimates.

---

## Pre-Deployment Checklist

Do not run the mainnet script until every item is true.

### 1. Security / process

- [ ] External professional audit complete; Critical/High resolved
- [ ] Foundry invariants + Slither triaged
- [ ] **Current** contracts deployed to BSC Testnet and a full create/trade/graduate smoke recorded
- [ ] Gnosis Safe exists on BSC **mainnet**; testnet Safe rehearsal already done
- [ ] `SAFE_OWNER_ADDRESS` is the mainnet Safe (has code on chain 56)
- [ ] Fee recipient is Safe-controlled
- [ ] Emergency pause rehearsed (`EMERGENCY_RUNBOOK.md`)

### 2. Environment Setup

#### Required Files
- [ ] `.env.local` exists with required variables
- [ ] Private key has sufficient BNB for deployment (~0.05 BNB minimum)
- [ ] BSC mainnet RPC URL configured
- [ ] `BSCSCAN_API_KEY` for verification

```bash
PRIVATE_KEY=your_deployment_wallet_private_key_here
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSCSCAN_API_KEY=your_bscscan_api_key_here
SAFE_OWNER_ADDRESS=0xYourMainnetSafe
```

**Get BSCScan API Key:** https://bscscan.com/myapikey

### 3. Deployment Wallet

- [ ] Dedicated deployment wallet (not a personal hot wallet you keep using)
- [ ] Fund with 0.05+ BNB
- [ ] Confirm this address is **initial** owner only — ownership must move to the Safe in the same change window
- Never commit private keys

### 4. Network Verification

```bash
curl -X POST https://bsc-dataseed1.binance.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 5. Compilation Check

```bash
npm install --legacy-peer-deps
npm run compile
```

Confirm TokenFactory / AMMDeployer / BondingCurveAMM are all under 24,576 bytes (they were as of 2026-08-13).

---

## 🚀 Deployment Steps

### Step 1: Final Environment Verification

```bash
# Verify all environment variables
npm run check-env

# Should show:
# ✅ All checks passed
# ⚠️ BSC mainnet addresses not configured (expected before deployment)
```

### Step 2: Check Deployment Wallet Balance

```bash
# Check your deployment wallet has enough BNB
npx hardhat run scripts/check-balance.ts --network bsc

# Expected output:
# Deployer: 0xYourAddress
# Balance: X.XX BNB
# ✅ Sufficient balance for deployment
```

If balance is low, send BNB to your deployment wallet before proceeding.

### Step 3: Deploy to BSC Mainnet

**IMPORTANT:** This is irreversible. Double-check everything before running.

```bash
# Deploy with deterministic CREATE2
npx hardhat run scripts/deploy-deterministic.ts --network bsc

# OR use the npm script
npm run deploy:deterministic:bsc
```

**Expected Output:**
```
🔷 DETERMINISTIC MULTI-CHAIN DEPLOYMENT 🔷
============================================

📡 Network: BNB Smart Chain (56)
🔑 Deployment Salt: 0x5cd19fe5f28d6e25fa610706857dc91815daea7e10fabb6d757b91eb1942ec4f

👤 Deployer: 0xYourAddress
💰 Balance: X.XX BNB

📄 Step 1: Deploying DeterministicDeployer...
✅ DeterministicDeployer deployed to: 0xABC...

📄 Step 2: Computing expected TokenFactory address...
🎯 Expected TokenFactory address: 0xDEF...
   This address will be IDENTICAL on all chains!

📄 Step 3: Deploying TokenFactory via CREATE2...
✅ TokenFactory deployed!

📄 Step 4: Verifying deployment...
✅ Verification passed!

📄 Step 5: Testing TokenFactory...
   Owner: 0xYourAddress
   Fee Recipient: 0xYourAddress
   Paused: false

🔄 DEX Integration:
✅ Chain: BNB Smart Chain (Chain ID: 56)
✅ Automatic DEX liquidity provision enabled
✅ DexRouterRegistry configured (chain-specific router)

📄 Step 6: Saving deployment info...
✅ Saved to deployments.json
✅ Saved detailed info to deployments/deployment-bsc-<timestamp>.json

🎉 DEPLOYMENT COMPLETE!
```

### Step 4: Verify Contract on BSCScan

```bash
# Automatic verification with retry
npm run verify:auto-retry:bsc

# Manual verification if automatic fails
npx hardhat verify --network bsc <FACTORY_ADDRESS> <FEE_RECIPIENT_ADDRESS>
```

**Verification Success Indicators:**
- BSCScan shows green checkmark on contract page
- Source code is viewable on BSCScan
- Contract is marked as "Verified"

### Step 5: Update deployments.json

The deployment script automatically updates `deployments.json`. Verify it contains:

```json
{
  "56": {
    "name": "BNB Smart Chain",
    "contracts": {
      "DeterministicDeployer": "0x...",
      "TokenFactory": "0x...",
      "FeeRecipient": "0x..."
    },
    "deployedAt": "2025-XX-XX...",
    "deployer": "0x...",
    "blockNumber": XXXXX,
    "deterministicSalt": "0x...",
    "isDeterministic": true
  }
}
```

---

## 🔧 Post-Deployment Configuration

### Step 1: Update Environment Variables

Add deployed addresses to `.env.local`:

```bash
# BSC Mainnet - DEPLOYED
NEXT_PUBLIC_BSC_TOKEN_FACTORY=0xYourDeployedFactoryAddress
NEXT_PUBLIC_BSC_FEE_RECIPIENT=0xYourFeeRecipientAddress

# Switch default chain to mainnet
NEXT_PUBLIC_DEFAULT_CHAIN_ID=56

# Production settings
NODE_ENV=production
NEXT_PUBLIC_DEBUG=false
```

### Step 2: Update Production Environment

If deploying to Vercel/production hosting:

```bash
# Vercel CLI (if using Vercel)
vercel env add NEXT_PUBLIC_BSC_TOKEN_FACTORY
# Paste: 0xYourFactoryAddress

vercel env add NEXT_PUBLIC_BSC_FEE_RECIPIENT
# Paste: 0xYourFeeRecipientAddress

vercel env add NEXT_PUBLIC_DEFAULT_CHAIN_ID
# Paste: 56
```

Or update via hosting provider's dashboard.

### Step 3: Commit Deployment Info

```bash
# Stage deployment files
git add deployments.json deployments/deployment-bsc-*.json

# Commit
git commit -m "Deploy to BSC mainnet

- TokenFactory: 0xYourFactoryAddress
- FeeRecipient: 0xYourFeeRecipientAddress
- Block: XXXXX
- Verified on BSCScan"

# Push
git push origin main
```

**DO NOT commit `.env.local` - it contains private keys!**

---

## ✅ Post-Deployment Verification

### 1. Smart Contract Testing

```bash
# Run deployment verification script
npm run verify:deployment -- --network bsc

# Expected output:
# ✅ TokenFactory found at: 0x...
# ✅ Owner correct: 0x...
# ✅ Fee recipient correct: 0x...
# ✅ Contract is unpaused
# ✅ getAllTokens() works
```

### 2. Frontend Integration Test

```bash
# Start local dev server with mainnet config
npm run dev

# Should show:
# - No console errors
# - Wallet connects to BSC mainnet
# - Empty token list (normal for new deployment)
```

### 3. Create Test Token (Small Amount)

**IMPORTANT:** This costs real BNB. Creation fee is **0.005 BNB** (`CREATION_FEE`) plus gas — not 0.025.

1. Connect wallet; switch to BSC Mainnet (Chain ID 56)
2. Use `/launch` (`QuickLaunchForm`): name, ticker, optional image only. Supply, curve, and price are protocol-fixed (1B supply, sigmoid, graduates at 800M sold).
3. Verify `TokenCreated` on BscScan; confirm `AMMDeployer` was used (AMM owner is the platform admin / Safe)
4. Buy a small amount, then sell
5. Confirm the token appears in listings

This is a smoke test, not a launch announcement. Keep [STATUS.md](./STATUS.md) gates in view.

### 4. Monitor Initial Hours

- [ ] Watch for any transaction failures
- [ ] Monitor gas costs
- [ ] Confirm pause still works through the Safe
- [ ] Do not expect graduation on a tiny smoke token unless you deliberately fill the curve

---

## 🔄 Multi-Chain Deployment (Optional)

After successful BSC deployment, deploy to other chains using the **same process:**

### Arbitrum One

```bash
# Deploy
npm run deploy:deterministic:arbitrum

# Verify
npm run verify:auto-retry:arbitrum

# Update .env.local
NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY=0x...
NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT=0x...
```

### Base

```bash
# Deploy
npm run deploy:deterministic:base

# Verify
npm run verify:auto-retry:base

# Update .env.local
NEXT_PUBLIC_BASE_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BASE_FEE_RECIPIENT=0x...
```

**Note:** TokenFactory address should be **identical** across all chains due to CREATE2!

---

## 🚨 Emergency Procedures

### Pause Contract (If Issues Found)

```bash
# Connect to factory contract
npx hardhat console --network bsc

# In console:
const factory = await ethers.getContractAt("TokenFactory", "0xYourFactoryAddress");
await factory.pause();

# Verify
await factory.paused(); // Should return true
```

### Unpause Contract

```bash
# Only owner can unpause
await factory.unpause();
await factory.paused(); // Should return false
```

### Transfer Ownership (If Needed)

Prefer `scripts/transfer-ownership.ts` (checks the target has code). Factory, DexRouterRegistry, and DeterministicDeployer use **one-step** OpenZeppelin `Ownable` — there is no `acceptOwnership`. Transferring to an EOA or a Safe that does not exist **on this chain** permanently bricks admin.

```bash
npx hardhat run scripts/transfer-ownership.ts --network bsc
```

---

## 📊 Success Metrics

After deployment, track these metrics:

### Technical Metrics
- [ ] Contract deployed successfully ✅
- [ ] Contract verified on BSCScan ✅
- [ ] Zero critical vulnerabilities ✅
- [ ] Gas costs within expected range ✅
- [ ] Frontend integration working ✅

### Business Metrics (Week 1)
- [ ] First token created successfully
- [ ] First trade executed successfully
- [ ] No critical bugs reported
- [ ] Positive user feedback

---

## 🆘 Troubleshooting

### "Insufficient funds for gas"
**Solution:** Send more BNB to deployment wallet. Need at least 0.02 BNB.

### "Nonce too high" or "Replacement transaction underpriced"
**Solution:**
```bash
# Reset nonce in Hardhat
npx hardhat clean
# Or wait for pending transaction to clear
```

### "Contract verification failed"
**Solution:**
```bash
# Try manual verification with constructor args
npx hardhat verify --network bsc \
  --constructor-args scripts/verify-args.js \
  <CONTRACT_ADDRESS>
```

### "Factory address doesn't match expected"
**Solution:** This shouldn't happen with CREATE2. If it does:
1. Check you're using the same DEPLOYMENT_SALT
2. Verify deployer address is the same
3. Contact development team

### Deployment script hangs
**Solution:**
1. Check RPC endpoint is responsive
2. Try alternative RPC (use private RPC if available)
3. Increase gas price in hardhat.config.ts

---

## 📚 Additional Resources

- **BSCScan:** https://bscscan.com
- **PancakeSwap Info:** https://pancakeswap.finance/info
- **BSC Docs:** https://docs.bnbchain.org
- **Hardhat Docs:** https://hardhat.org/docs
- **Contract Source:** `contracts/TokenFactory.sol`
- **Integration Guide:** `INTEGRATION_STATUS.md`

---

## ✅ Final Checklist

Before announcing mainnet launch:

- [ ] Ownership transferred to the mainnet Gnosis Safe; EOA can no longer call `onlyOwner`
- [ ] `AMMDeployer` configured on TokenFactory
- [ ] External audit report published / linked
- [ ] Smart contracts deployed and verified
- [ ] Test token created and traded successfully
- [ ] Frontend pointing to mainnet contracts (`NEXT_PUBLIC_DEFAULT_CHAIN_ID=56`)
- [ ] Environment variables configured (including `NEXT_PUBLIC_WS_URL` if the WS server is live)
- [ ] Deployment info committed to git (`deployments.json` includes AMMDeployer)
- [ ] Emergency pause mechanism tested through the Safe
- [ ] Fee recipient is Safe-controlled
- [ ] Gas costs verified reasonable
- [ ] No critical bugs in 24-hour monitoring
- [ ] Legal pages reviewed by counsel
- [ ] Terms of service / privacy / disclaimer published
- [ ] Marketing materials ready
- [ ] Social media accounts set up
- [ ] Community support channel ready

---

## 🎉 Launch Day

Once all checklists are complete:

1. **Soft Launch** (24-48 hours)
   - Share with limited audience
   - Monitor closely for issues
   - Gather initial feedback

2. **Public Launch**
   - Announce on social media
   - Submit to DeFi listing sites
   - Enable analytics tracking
   - Monitor user acquisition

3. **Post-Launch**
   - Daily monitoring for first week
   - Weekly updates to community
   - Continuous improvement based on feedback

---

**Last updated:** 2026-08-13  
**For support:** [STATUS.md](./STATUS.md), [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md)
