# 🚀 KasPump Testnet Deployment - Step by Step

**Quick Start Guide for Deploying to Testnet**

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] A wallet with testnet funds
- [ ] Network access (to download Solidity compiler)
- [ ] `.env.local` file with your `PRIVATE_KEY`

---

## Step 1: Verify Your Environment Setup

### 1.1 Check if `.env.local` exists

```bash
ls -la .env.local
```

If it doesn't exist, create it:

```bash
# Create .env.local file
cat > .env.local << 'EOF'
# Your wallet private key (keep this SECRET!)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: For deterministic deployments, set a custom salt
# DEPLOYMENT_SALT=0x4b617350756d704d756c7469436861696e4c61756e636865723230323500
EOF
```

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to git (it's already in .gitignore)
- Never share your private key
- Only use testnet keys for testing

### 1.2 Get Your Wallet Address

```bash
node scripts/get-wallet-address.js
```

This will show your wallet address. **Save this address** - you'll need it for the faucets!

---

## Step 2: Get Testnet Funds

You need testnet tokens to pay for gas fees. Here are the faucets:

### 2.1 BSC Testnet BNB (Recommended First)

**Faucet**: https://testnet.bnbchain.org/faucet-smart

1. Visit the faucet link
2. Enter your wallet address
3. Request testnet BNB
4. You'll need **~0.5 BNB** for deployment

**Check your balance:**
```bash
node scripts/check-balance.js
```

### 2.2 Arbitrum Sepolia ETH (Optional - for multi-chain)

**Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

1. Visit the faucet link
2. Enter your wallet address
3. Request testnet ETH
4. You'll need **~0.1 ETH** for deployment

### 2.3 Base Sepolia ETH (Optional - for multi-chain)

**Faucet**: https://faucet.quicknode.com/base/sepolia

1. Visit the faucet link
2. Enter your wallet address
3. Request testnet ETH
4. You'll need **~0.1 ETH** for deployment

---

## Step 3: Install Dependencies (if not done)

```bash
npm install
```

This installs all required packages including Hardhat, OpenZeppelin contracts, etc.

---

## Step 4: Compile Contracts

This step requires network access to download the Solidity 0.8.20 compiler.

```bash
npm run compile
```

**Expected output:**
```
Compiled 12 Solidity files successfully
```

If you get an error about downloading the compiler, you need network access. The compiler will be cached after the first download.

---

## Step 5: Run Deployment Pre-Check

Before deploying, verify everything is ready:

```bash
npx hardhat run scripts/deploy-helper.ts --network bscTestnet
```

This will check:
- ✅ Private key is configured
- ✅ Wallet has sufficient balance
- ✅ Network connection is working
- ✅ All prerequisites are met

---

## Step 6: Deploy to BSC Testnet

### Option A: Deterministic Deployment (Recommended)

This ensures the **same contract address** across all chains:

```bash
npm run deploy:deterministic:bsc-testnet
```

**What happens:**
1. Deploys `DeterministicDeployer` contract
2. Computes deterministic address for `TokenFactory`
3. Deploys `TokenFactory` using CREATE2
4. Verifies deployment
5. Saves addresses to `deployments.json`

**Expected output:**
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

### Option B: Standard Deployment (Simpler)

If you don't need deterministic addresses:

```bash
npm run deploy:bsc-testnet
```

**What happens:**
1. Deploys `TokenFactory` directly
2. Saves addresses to deployment file
3. Creates `.env.local` with contract addresses

---

## Step 7: Verify Deployment

### 7.1 Check Deployment File

```bash
cat deployments.json
```

You should see your deployment info with:
- TokenFactory address
- Network information
- Deployment timestamp

### 7.2 Check on Block Explorer

Visit BSCScan Testnet and search for your TokenFactory address:
```
https://testnet.bscscan.com/address/YOUR_FACTORY_ADDRESS
```

### 7.3 Test the Contract

Run a quick test to verify the contract works:

```bash
npm run test:bsc
```

Or manually test in Hardhat console:

```bash
npx hardhat console --network bscTestnet
```

Then in the console:
```javascript
const factory = await ethers.getContractAt("TokenFactory", "YOUR_FACTORY_ADDRESS");
const owner = await factory.owner();
console.log("Owner:", owner);
const allTokens = await factory.getAllTokens();
console.log("Tokens:", allTokens.length);
```

---

## Step 8: Update Frontend Environment

After deployment, update your frontend `.env.local` with the contract addresses:

```bash
# The deployment script should have already created/updated .env.local
# But verify it has the correct addresses:

cat .env.local | grep TOKEN_FACTORY
```

You should see:
```
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0x...
```

If not, add them manually:

```bash
# Add to .env.local
echo "NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0xYOUR_FACTORY_ADDRESS" >> .env.local
echo "NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0xYOUR_FEE_RECIPIENT_ADDRESS" >> .env.local
```

---

## Step 9: Deploy to Other Testnets (Multi-Chain)

If you want the **same address** on all chains, deploy to other testnets:

### 9.1 Arbitrum Sepolia

```bash
# First, get testnet ETH from faucet
# Then deploy:
npm run deploy:deterministic:arbitrum-sepolia
```

### 9.2 Base Sepolia

```bash
# First, get testnet ETH from faucet
# Then deploy:
npm run deploy:deterministic:base-sepolia
```

**Important**: The `TokenFactory` address will be **IDENTICAL** across all chains if you use deterministic deployment with the same salt!

---

## Step 10: Test Your Deployment

### 10.1 Start Frontend

```bash
npm run dev
```

Visit: http://localhost:3000

### 10.2 Test Token Creation

1. Connect your wallet
2. Go to Creator page
3. Create a test token
4. Verify it appears in the token list

### 10.3 Test Trading

1. Find your token in the list
2. Click "Trade"
3. Try buying some tokens
4. Try selling some tokens
5. Verify prices update correctly

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Contracts deployed without errors
- ✅ TokenFactory address visible on block explorer
- ✅ Can create tokens through frontend
- ✅ Can buy/sell tokens
- ✅ Prices update correctly
- ✅ (Multi-chain) Same address on all chains

---

## 🔧 Troubleshooting

### Issue: "Private key not found"

**Solution:**
```bash
# Check if .env.local exists
ls -la .env.local

# Verify PRIVATE_KEY is set
grep PRIVATE_KEY .env.local
```

### Issue: "Insufficient balance"

**Solution:**
1. Check your balance: `node scripts/check-balance.js`
2. Get more testnet funds from faucets
3. Wait a few minutes for funds to arrive

### Issue: "Cannot download compiler"

**Solution:**
- You need network access to download Solidity compiler
- The compiler will be cached after first download
- Try again when network is available

### Issue: "Network connection failed"

**Solution:**
- Check your internet connection
- Verify RPC URLs in `hardhat.config.ts` are correct
- Try a different RPC endpoint

### Issue: "Addresses don't match across chains"

**Solution:**
- Verify you're using deterministic deployment
- Check that `DEPLOYMENT_SALT` is the same for all deployments
- Re-deploy with the same salt

---

## 📊 Expected Gas Costs

Per deployment:
- DeterministicDeployer: ~500,000 gas
- TokenFactory: ~3,000,000 gas
- **Total: ~0.007 BNB** (or equivalent ETH)

---

## 📝 Next Steps After Deployment

1. ✅ **Test thoroughly** - Create tokens, trade, verify all features
2. ✅ **Monitor gas usage** - Check if costs are as expected
3. ✅ **Fix any bugs** - Document and fix issues found
4. ✅ **Update frontend** - Connect real contract addresses
5. ✅ **Prepare for mainnet** - When ready, deploy to mainnet

---

## 🚨 Important Reminders

- ⚠️ This is **TESTNET** - use test tokens only
- ⚠️ Never commit `.env.local` to git
- ⚠️ Never share your private key
- ⚠️ Test thoroughly before mainnet deployment
- ⚠️ Save deployment addresses for reference

---

## 📚 Additional Resources

- **Full Deployment Guide**: `TESTNET_DEPLOYMENT_GUIDE.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Multi-Chain Setup**: `MULTICHAIN_SETUP.md`
- **Testing Guide**: `TESTING_GUIDE.md`

---

**Ready to deploy? Start with Step 1! 🚀**

