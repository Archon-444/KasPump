# 🚀 KasPump Deployment Helper Guide

## Quick Start

### Step 1: Set Up Environment Variables

Create a `.env.local` file in the project root with your private key:

```bash
# Your wallet private key (keep this SECRET!)
PRIVATE_KEY=0x...

# Optional: For deterministic deployments, set a custom salt
DEPLOYMENT_SALT=0x4b617350756d704d756c7469436861696e4c61756e636865723230323500
```

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to git (it's already in .gitignore)
- Never share your private key
- Only use testnet keys for testing

### Step 2: Choose Your Deployment Network

#### Option A: Testnet (Recommended for Testing)
- **BSC Testnet**: `npm run deploy:deterministic:bsc-testnet`
- **Arbitrum Sepolia**: `npm run deploy:deterministic:arbitrum-sepolia`
- **Base Sepolia**: `npm run deploy:deterministic:base-sepolia`

#### Option B: Mainnet (Production)
- **BSC**: `npm run deploy:deterministic:bsc`
- **Arbitrum**: `npm run deploy:deterministic:arbitrum`
- **Base**: `npm run deploy:deterministic:base`

### Step 3: Get Testnet Funds (If Testing)

**For BSC Testnet:**
1. Visit: https://testnet.bnbchain.org/faucet-smart
2. Enter your wallet address
3. Request testnet BNB (you'll need ~0.5 BNB for deployment)

**For Arbitrum Sepolia:**
1. Visit: https://faucet.quicknode.com/arbitrum/sepolia
2. Enter your wallet address
3. Request testnet ETH (you'll need ~0.1 ETH)

**For Base Sepolia:**
1. Visit: https://faucet.quicknode.com/base/sepolia
2. Enter your wallet address
3. Request testnet ETH (you'll need ~0.1 ETH)

### Step 4: Check Your Setup

Run the deployment helper to verify everything is ready:

```bash
npx hardhat run scripts/deploy-helper.ts --network bscTestnet
```

This will check:
- ✅ Private key is configured
- ✅ Wallet has sufficient balance
- ✅ Network connection is working
- ✅ All prerequisites are met

### Step 5: Deploy!

Once prerequisites are met, deploy with:

```bash
# For BSC Testnet (recommended first deployment)
npm run deploy:deterministic:bsc-testnet
```

**What happens:**
1. Deploys `DeterministicDeployer` contract
2. Computes deterministic address for `TokenFactory`
3. Deploys `TokenFactory` using CREATE2
4. Verifies deployment
5. Saves addresses to `deployments.json`

**Expected Output:**
```
🔷 DETERMINISTIC MULTI-CHAIN DEPLOYMENT 🔷

📡 Network: BSC Testnet (97)
👤 Deployer: 0x...
💰 Balance: 0.5 BNB

📄 Step 1: Deploying DeterministicDeployer...
✅ DeterministicDeployer deployed to: 0x...

🎯 Step 2: Computing expected TokenFactory address...
Expected TokenFactory address: 0x...
   This address will be IDENTICAL on all chains!

📄 Step 3: Deploying TokenFactory via CREATE2...
✅ TokenFactory deployed!

🎉 DEPLOYMENT COMPLETE!
```

### Step 6: Verify Deployment

After deployment, check `deployments.json`:

```bash
cat deployments.json
```

You should see:
- Your `TokenFactory` address
- Deployment timestamp
- Network information

### Step 7: Deploy to Other Chains (Multi-Chain)

To get the **same address** on all chains:

```bash
# Deploy to Arbitrum Sepolia (same factory address!)
npm run deploy:deterministic:arbitrum-sepolia

# Deploy to Base Sepolia (same factory address!)
npm run deploy:deterministic:base-sepolia
```

✅ The `TokenFactory` address will be **IDENTICAL** across all chains!

### Step 8: Update Environment Variables

After deployment, update your frontend environment variables in `.env.local`:

```bash
# For BSC Testnet
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0x...

# For Arbitrum Sepolia
NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY=0x...
NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT=0x...

# For Base Sepolia
NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT=0x...
```

---

## Troubleshooting

### Issue: "Private key not found"
**Solution:** Create `.env.local` with your `PRIVATE_KEY`

### Issue: "Insufficient balance"
**Solution:** Get testnet funds from faucets (see Step 3)

### Issue: "Network error" or "Connection refused"
**Solution:** Check your internet connection and RPC endpoint

### Issue: "Contract already deployed"
**Solution:** The contract address already exists. Check `deployments.json` for existing addresses.

### Issue: "Deterministic addresses don't match"
**Solution:** Ensure you're using the same `DEPLOYMENT_SALT` across all chains

---

## What Gets Deployed?

### DeterministicDeployer
- **Purpose**: Helper contract for CREATE2 deployments
- **Address**: Different on each chain (normal deployment)
- **Gas Cost**: ~500k gas

### TokenFactory
- **Purpose**: Main contract for creating tokens
- **Address**: **SAME on all chains** (CREATE2)
- **Gas Cost**: ~3M gas
- **Features**:
  - Token creation
  - Bonding curve AMM
  - Platform fees
  - Rate limiting
  - Emergency pause

---

## Deployment Costs

### Testnet (Estimated)
- **BSC Testnet**: ~0.007 BNB per deployment
- **Arbitrum Sepolia**: ~0.0004 ETH per deployment
- **Base Sepolia**: ~0.0004 ETH per deployment

### Mainnet (Estimated)
- **BSC**: ~0.05 BNB per deployment
- **Arbitrum**: ~0.003 ETH per deployment
- **Base**: ~0.002 ETH per deployment

---

## Next Steps After Deployment

1. ✅ **Verify on Block Explorer**
   - BSC Testnet: https://testnet.bscscan.com
   - Arbitrum Sepolia: https://sepolia.arbiscan.io
   - Base Sepolia: https://sepolia.basescan.org

2. ✅ **Test Token Creation**
   - Use your frontend or Remix IDE
   - Create a test token
   - Verify it works correctly

3. ✅ **Update Frontend**
   - Set environment variables
   - Test token creation UI
   - Test trading interface

4. ✅ **Monitor**
   - Watch for any errors
   - Check gas usage
   - Monitor transaction success rates

---

## Need Help?

If you encounter issues:
1. Check the deployment output for error messages
2. Verify your wallet has sufficient balance
3. Ensure network connection is stable
4. Review `TESTNET_DEPLOYMENT_GUIDE.md` for detailed troubleshooting

---

**Ready to deploy? Run:**
```bash
npm run deploy:deterministic:bsc-testnet
```

