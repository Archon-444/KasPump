# KasPump BSC Mainnet Deployment Guide

**Status:** Ready for Deployment
**Target Network:** BNB Smart Chain Mainnet (Chain ID: 56)
**Deployment Method:** Deterministic CREATE2

---

## 🎯 Overview

This guide walks through deploying KasPump smart contracts to BSC mainnet using deterministic CREATE2 deployment, ensuring consistent contract addresses across all EVM chains.

**What Gets Deployed:**
- `DeterministicDeployer` - CREATE2 factory contract
- `TokenFactory` - Main token creation and registry contract
- Configuration for PancakeSwap integration

**Estimated Costs:**
- Gas for DeterministicDeployer: ~0.002 BNB (~$1)
- Gas for TokenFactory: ~0.008 BNB (~$4)
- **Total: ~0.01 BNB (~$5)**

---

## ⚠️ Pre-Deployment Checklist

### 1. Security Review

- [ ] **Smart Contract Audit** - Recommended but not required for testnet-proven contracts
- [ ] **Code Review** - Verify no changes since testnet deployment
- [ ] **Access Control** - Confirm fee recipient address is correct
- [ ] **Emergency Controls** - Understand pause/unpause mechanisms

### 2. Environment Setup

#### Required Files
- [ ] `.env.local` file exists with required variables
- [ ] Private key has sufficient BNB for deployment (~0.02 BNB minimum)
- [ ] BSC mainnet RPC URL configured

#### Environment Variables Checklist

```bash
# Required for deployment
PRIVATE_KEY=your_deployment_wallet_private_key_here
BSC_RPC_URL=https://bsc-dataseed1.binance.org  # Or your private RPC

# Optional: For contract verification on BSCScan
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

**Get BSCScan API Key:**
1. Visit https://bscscan.com/myapikey
2. Sign up/login
3. Create new API key (free)
4. Add to `.env.local`

### 3. Deployment Wallet

**Recommended Setup:**
- [ ] Use a dedicated deployment wallet (not your personal wallet)
- [ ] Fund with 0.02-0.05 BNB for deployment + buffer
- [ ] Verify wallet address: Run `npm run deployment:check-wallet`
- [ ] Confirm this address will be the initial owner and fee recipient

**Security Best Practices:**
- Never commit private keys to version control
- Use hardware wallet for mainnet deployment (optional but recommended)
- Keep backup of private key in secure location

### 4. Network Verification

```bash
# Test RPC connectivity
curl -X POST https://bsc-dataseed1.binance.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should return current block number
```

### 5. Compilation Check

```bash
# Compile contracts to ensure no errors
npm run compile

# Should output: "Compilation successful"
```

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
✅ PancakeSwap router configured

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

**IMPORTANT:** This will cost real BNB (~0.025 BNB creation fee + gas)

1. Connect wallet to KasPump on localhost
2. Switch to BSC Mainnet (Chain ID 56)
3. Create a test token with minimal supply:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Total Supply: 1000
   - Base Price: 0.0001 BNB
4. Verify transaction on BSCScan
5. Confirm token appears in listings
6. Test buying small amount (0.001 BNB)
7. Test selling tokens back

**If all steps succeed:** ✅ Deployment is production-ready!

### 4. Monitor Initial Hours

- [ ] Watch for any transaction failures
- [ ] Monitor gas costs (should be reasonable)
- [ ] Check no one can exploit contracts
- [ ] Verify graduation mechanism works (if threshold reached)

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

```bash
# Transfer to new owner address
await factory.transferOwnership("0xNewOwnerAddress");

# New owner must accept
# (if using Ownable2Step pattern)
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

- [ ] Smart contracts deployed and verified
- [ ] Test token created and traded successfully
- [ ] Frontend pointing to mainnet contracts
- [ ] Environment variables configured
- [ ] Deployment info committed to git
- [ ] Emergency pause mechanism tested
- [ ] Fee recipient address confirmed correct
- [ ] Gas costs verified reasonable
- [ ] No critical bugs in 24-hour monitoring
- [ ] Legal disclaimers in place
- [ ] Terms of service published
- [ ] Privacy policy published
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

**Deployment prepared by:** Claude Code Agent
**Last updated:** 2025-11-15
**For support:** See INTEGRATION_STATUS.md
