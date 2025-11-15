# KasPump Quick Start Guide

Get KasPump running on BSC Testnet in 5 minutes.

---

## Prerequisites

- Node.js 18+ and npm installed
- MetaMask or compatible Web3 wallet
- BSC Testnet BNB (get from faucet)

---

## Step 1: Clone and Install

```bash
git clone https://github.com/Archon-444/KasPump.git
cd KasPump
npm install
```

---

## Step 2: Environment Setup

### Option A: Use Existing .env.local (Recommended)

If `.env.local` already exists in the project root, you're good to go! Skip to Step 3.

### Option B: Create .env.local from Example

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add the BSC Testnet addresses:

```env
# BSC Testnet - Active Deployment
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x7Af627Bf902549543701C58366d424eE59A4ee08
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0xEFec2Eddf5151c724B610B7e5fa148752674D667

# Network Configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# WalletConnect - GET YOUR OWN PROJECT ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Development Mode
NEXT_PUBLIC_DEBUG=true
NODE_ENV=development
```

---

## Step 3: Get WalletConnect Project ID

**This is required for wallet connections to work.**

1. Visit https://cloud.walletconnect.com
2. Sign up/login (free account)
3. Click "Create" → "New Project"
4. Name it "KasPump Local Dev"
5. Copy the **Project ID**
6. Update `.env.local`:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=paste_your_id_here
   ```

**Without this:** Wallet connection will fail with "Invalid Project ID" error.

---

## Step 4: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Step 5: Get Testnet BNB

1. Open MetaMask
2. Switch to **BSC Testnet** network
   - Network Name: `BSC Testnet`
   - RPC URL: `https://data-seed-prebsc-1-s1.binance.org:8545`
   - Chain ID: `97`
   - Symbol: `tBNB`
   - Explorer: `https://testnet.bscscan.com`

3. Visit https://testnet.bnbchain.org/faucet-smart
4. Enter your wallet address
5. Request 0.5 tBNB (takes ~30 seconds)

---

## Step 6: Test the Platform

### Connect Wallet
1. Click "Connect Wallet" button
2. Select MetaMask (or your wallet)
3. Approve the connection
4. Ensure you're on BSC Testnet

### Create a Token
1. Click "Create Token" button
2. Fill out the form:
   - Name: `Test Coin`
   - Symbol: `TEST`
   - Description: `My first test token`
   - Total Supply: `1000000`
   - Base Price: `0.0001` (BNB)
   - Upload an image (optional)
3. Click "Create Token"
4. Approve the transaction in MetaMask
5. Wait for confirmation (~3 seconds)
6. Your token should appear in the listings!

### Trade a Token
1. Click on any token in the listings
2. Enter a buy amount (e.g., `0.01` BNB)
3. Review the quote (tokens out, price impact)
4. Click "Buy"
5. Approve the transaction
6. Wait for confirmation
7. Your token balance should update!

### Sell Tokens
1. Switch to "Sell" tab
2. Enter amount of tokens to sell
3. First time: Approve token spending
4. Click "Sell"
5. Approve the transaction
6. Receive BNB back!

---

## Troubleshooting

### "Invalid Project ID" Error
- You haven't set up WalletConnect Project ID in `.env.local`
- Get one from https://cloud.walletconnect.com (it's free!)

### "Factory contract not deployed" Error
- Your `.env.local` is missing the contract addresses
- Copy the addresses from Step 2 above
- Restart the dev server: `npm run dev`

### Wallet Won't Connect
- Ensure you're on BSC Testnet (Chain ID: 97)
- Try disconnecting and reconnecting
- Clear browser cache and reload

### Transaction Fails
- Ensure you have enough tBNB for gas (~0.001 BNB per transaction)
- Check slippage tolerance (increase to 3-5% if needed)
- Wait a few seconds and try again

### Tokens Not Showing
- Wait ~5-10 seconds for blockchain confirmation
- Refresh the page
- Check BSCScan Testnet to verify the transaction went through

### TypeScript Errors
- Run `npm install` again
- Delete `node_modules` and `.next`, then reinstall:
  ```bash
  rm -rf node_modules .next
  npm install
  npm run dev
  ```

---

## Useful Links

- **BSC Testnet Faucet:** https://testnet.bnbchain.org/faucet-smart
- **BSCScan Testnet:** https://testnet.bscscan.com
- **TokenFactory Contract:** https://testnet.bscscan.com/address/0x7Af627Bf902549543701C58366d424eE59A4ee08
- **WalletConnect Cloud:** https://cloud.walletconnect.com
- **MetaMask:** https://metamask.io

---

## Verify Your Setup

Run this command to check if everything is configured correctly:

```bash
node scripts/check-env.js
```

This will verify:
- ✅ Node.js version
- ✅ Environment variables are set
- ✅ Contract addresses are valid
- ✅ RPC endpoint is reachable
- ✅ WalletConnect Project ID is configured

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

---

## Contract Deployment (Advanced)

If you want to deploy your own contracts to BSC Testnet:

```bash
# 1. Create a new wallet for deployment
# 2. Get testnet BNB
# 3. Create .env.local with your private key:
PRIVATE_KEY=your_private_key_here
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# 4. Deploy contracts
npx hardhat run scripts/deploy-testnet.ts --network bscTestnet

# 5. Update .env.local with the new addresses
# 6. Restart dev server
```

---

## Next Steps

Once you've tested on BSC Testnet:

1. **Deploy to Mainnet**
   - Deploy contracts to BSC, Arbitrum, Base mainnet
   - Update `.env.local` with mainnet addresses
   - Set `NEXT_PUBLIC_DEFAULT_CHAIN_ID=56` (BSC mainnet)

2. **Production Configuration**
   - Set `NODE_ENV=production`
   - Set `NEXT_PUBLIC_DEBUG=false`
   - Use private RPC endpoints for reliability

3. **Security**
   - Run security audit on smart contracts
   - Enable rate limiting in production
   - Set up error monitoring (Sentry)

4. **Launch**
   - Deploy to Vercel/AWS/your hosting
   - Announce on social media
   - Monitor analytics and user feedback

---

## Getting Help

- **Documentation:** See `INTEGRATION_STATUS.md` for complete technical details
- **Smart Contracts:** See `contracts/` directory
- **API Routes:** See `src/app/api/` directory
- **Frontend Components:** See `src/components/features/` directory

---

## Success Checklist

- [ ] Dependencies installed
- [ ] `.env.local` created with contract addresses
- [ ] WalletConnect Project ID configured
- [ ] Dev server running at localhost:3000
- [ ] BSC Testnet added to MetaMask
- [ ] Testnet BNB acquired
- [ ] Wallet connected successfully
- [ ] Created a test token
- [ ] Executed a buy trade
- [ ] Executed a sell trade

If all boxes are checked, you're ready to start building! 🚀

---

**Need More Help?**

Check the comprehensive integration guide: [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md)
