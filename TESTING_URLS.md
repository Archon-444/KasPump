# 🧪 KasPump Testing URLs & Setup

## ✅ Server Status

**Frontend & Backend:** ✅ Running

## 🌐 Access URLs

### Local Development
- **Frontend:** http://localhost:3000
- **API Route - Tokens:** http://localhost:3000/api/tokens
- **API Route - Analytics:** http://localhost:3000/api/analytics

### Deployed Contracts (BSC Testnet)

**TokenFactory Address:** `0x7Af627Bf902549543701C58366d424eE59A4ee08`

**View on Block Explorer:**
- https://testnet.bscscan.com/address/0x7Af627Bf902549543701C58366d424eE59A4ee08

**Test Token (created during testing):**
- Token: https://testnet.bscscan.com/address/0xb64b2b99018eC5Ee1A5444bdA84456A5322B5559
- AMM: https://testnet.bscscan.com/address/0x2456e11991728DECb7fA907b97991d9560B14c0b

---

## 🧪 Testing Checklist

### 1. Frontend Testing

1. **Open the app:**
   - Navigate to: http://localhost:3000
   - You should see the KasPump interface

2. **Connect Wallet:**
   - Click "Connect Wallet" button
   - Select MetaMask (or your preferred wallet)
   - Make sure you're connected to **BSC Testnet** (Chain ID: 97)
   - Verify your wallet has testnet BNB

3. **Network Configuration:**
   - The app should default to BSC Testnet
   - If needed, switch network in your wallet to BSC Testnet

### 2. Token Creation Testing

1. **Create a New Token:**
   - Click "Create Token" or navigate to token creation page
   - Fill in token details:
     - Name: "My Test Token"
     - Symbol: "MTT"
     - Description: "Testing KasPump"
     - Total Supply: 1,000,000 (or your preferred amount)
     - Base Price: 0.0001 BNB
     - Curve Type: Linear
   - Submit and confirm in wallet
   - Wait for transaction confirmation

2. **Verify Token Creation:**
   - Check transaction on BSCScan
   - Token should appear in your token list
   - Token count should increment

### 3. Token Trading Testing

1. **Buy Tokens:**
   - Navigate to a token's trading page
   - Enter amount of BNB to spend (e.g., 0.01 BNB)
   - Click "Buy"
   - Confirm transaction in wallet
   - Verify tokens received

2. **Sell Tokens:**
   - Enter amount of tokens to sell
   - Click "Sell"
   - Confirm transaction
   - Verify BNB received

### 4. API Testing

Test the API endpoints:

**Get All Tokens:**
```bash
curl http://localhost:3000/api/tokens
```

**Get Specific Token:**
```bash
curl "http://localhost:3000/api/tokens?address=0xb64b2b99018eC5Ee1A5444bdA84456A5322B5559"
```

**With Pagination:**
```bash
curl "http://localhost:3000/api/tokens?limit=10&offset=0"
```

---

## 🔧 Configuration

### Environment Variables (`.env.local`)

```env
# Contracts
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x7Af627Bf902549543701C58366d424eE59A4ee08
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0xEFec2Eddf5151c724B610B7e5fa148752674D667
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Default Network
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97

# API
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x7Af627Bf902549543701C58366d424eE59A4ee08
```

---

## 🛠️ Server Management

### Start Server
```bash
npm run dev
```

### Stop Server
Press `Ctrl+C` in the terminal or:
```bash
lsof -ti:3000 | xargs kill -9
```

### Check Server Status
```bash
curl http://localhost:3000
# Or visit http://localhost:3000 in browser
```

---

## 🐛 Troubleshooting

### Server Won't Start
1. Check if port 3000 is in use:
   ```bash
   lsof -ti:3000
   ```
2. Kill any process on port 3000:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```
3. Restart:
   ```bash
   npm run dev
   ```

### Wallet Not Connecting
1. Ensure MetaMask is installed
2. Make sure you're on BSC Testnet (Chain ID: 97)
3. Check browser console for errors
4. Try refreshing the page

### Contract Not Found
1. Verify `.env.local` has correct addresses
2. Ensure you're on BSC Testnet
3. Check that contracts are deployed:
   ```bash
   npm run test:bsc
   ```

### Transactions Failing
1. Check you have testnet BNB
2. Verify gas limits are sufficient
3. Check BSCScan for transaction errors
4. Try increasing gas price

---

## 📊 Current Status

- ✅ **TokenFactory:** Deployed and verified
- ✅ **Token Count:** 1 token created
- ✅ **Server:** Running on http://localhost:3000
- ✅ **Network:** BSC Testnet (Chain ID: 97)
- ✅ **Contract Address:** `0x7Af627Bf902549543701C58366d424eE59A4ee08`

---

## 🚀 Next Steps

1. **Test Token Creation** via the UI
2. **Test Trading** (buy/sell tokens)
3. **Check Analytics** on the dashboard
4. **Test Mobile Experience** (if applicable)
5. **Deploy to Other Chains** (Arbitrum, Base)

---

**Happy Testing!** 🎉

