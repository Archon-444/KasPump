# 🚀 Quick Start: Testnet Deployment

**You already have a deployment!** Let's verify it and get it working.

---

## ✅ Current Deployment Status

According to `deployments.json`, you have:

- **Network**: BSC Testnet (Chain ID: 97)
- **TokenFactory**: `0x7Af627Bf902549543701C58366d424eE59A4ee08`
- **Deployed**: October 31, 2025
- **Type**: Deterministic (can deploy to other chains with same address!)

---

## Step 1: Verify Your Deployment

Run the verification script:

```bash
npm run verify:deployment
```

This will:
- ✅ Check if the contract is accessible
- ✅ Verify contract functions work
- ✅ Show you the environment variables to add
- ✅ Provide block explorer links

---

## Step 2: Update Environment Variables

Add these to your `.env.local` file:

```bash
# BSC Testnet Contract Addresses
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x7Af627Bf902549543701C58366d424eE59A4ee08
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0xEFec2Eddf5151c724B610B7e5fa148752674D667

# Network Configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# WalletConnect (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: For contract interactions
PRIVATE_KEY=your_private_key_here
```

**Note**: The `verify:deployment` script will show you the exact values to use.

---

## Step 3: Test the Deployment

### Option A: Test via Script

```bash
npm run test:bsc
```

This will:
- Create a test token
- Verify token creation works
- Check token counting

### Option B: Test via Frontend

```bash
# Start the development server
npm run dev
```

Then:
1. Visit http://localhost:3000
2. Connect your wallet (MetaMask or WalletConnect)
3. Switch to BSC Testnet (Chain ID: 97)
4. Try creating a token
5. Try buying/selling tokens

---

## Step 4: View on Block Explorer

Check your deployment on BSCScan Testnet:

**TokenFactory**: https://testnet.bscscan.com/address/0x7Af627Bf902549543701C58366d424eE59A4ee08

You can:
- View contract code
- See all transactions
- Check token creation events
- Monitor contract activity

---

## Step 5: Deploy to Other Testnets (Optional)

Since you used deterministic deployment, you can get the **same TokenFactory address** on other chains!

### Arbitrum Sepolia

1. Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia
2. Deploy:
   ```bash
   npm run deploy:deterministic:arbitrum-sepolia
   ```
3. The TokenFactory address will be **identical** to BSC Testnet!

### Base Sepolia

1. Get testnet ETH from: https://faucet.quicknode.com/base/sepolia
2. Deploy:
   ```bash
   npm run deploy:deterministic:base-sepolia
   ```
3. Same address again!

---

## 🔧 Troubleshooting

### "Contract not found" error

**Solution**: Make sure `.env.local` has the correct `NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY` address.

### "Insufficient funds" error

**Solution**: Get testnet BNB from https://testnet.bnbchain.org/faucet-smart

### "Network not found" error

**Solution**: 
1. Add BSC Testnet to MetaMask:
   - Network Name: BSC Testnet
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   - Chain ID: 97
   - Currency Symbol: BNB
   - Block Explorer: https://testnet.bscscan.com

### Frontend shows "No contracts deployed"

**Solution**: 
1. Check `.env.local` has the contract addresses
2. Restart the dev server: `npm run dev`
3. Check browser console for errors

---

## 📋 What's Next?

Now that your testnet deployment is verified:

1. ✅ **Fix AMM Address Resolution** - Update frontend hooks to use deployed addresses
2. ✅ **Replace Mock Data** - Connect frontend to real blockchain queries
3. ✅ **Complete Trading** - Finish buy/sell functionality
4. ✅ **Test End-to-End** - Create tokens, trade, verify everything works

See `REMAINING_WORK_SUMMARY.md` for the full list of next steps.

---

## 🎯 Success Checklist

- [ ] Deployment verified with `npm run verify:deployment`
- [ ] `.env.local` updated with contract addresses
- [ ] Frontend can connect to contracts
- [ ] Can create tokens through UI
- [ ] Can buy/sell tokens
- [ ] All tests pass

---

**Ready to test? Run `npm run verify:deployment` first! 🚀**

