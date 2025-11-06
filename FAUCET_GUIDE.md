# 🚰 Testnet Faucet Guide

## Current Deployment Status

✅ **BSC Testnet** - Deployed successfully!
- TokenFactory: `0x7Af627Bf902549543701C58366d424eE59A4ee08`
- Balance needed: 0.3 BNB ✅ (you have this)

⏳ **Arbitrum Sepolia** - Needs deployment
- Required: Testnet ETH (~0.1 ETH)
- Balance: 0 ETH ❌

⏳ **Base Sepolia** - Needs deployment  
- Required: Testnet ETH (~0.1 ETH)
- Balance: 0 ETH ❌

---

## Get Testnet Funds

### For Arbitrum Sepolia

**Faucet:** https://faucet.quicknode.com/arbitrum/sepolia

**Steps:**
1. Visit the faucet link above
2. Connect your wallet or enter your address: `0xEFec2Eddf5151c724B610B7e5fa148752674D667`
3. Request testnet ETH (request 0.1-0.2 ETH)
4. Wait a few minutes for the transaction to confirm

**Alternative Faucets:**
- Alchemy: https://faucet.quicknode.com/arbitrum/sepolia
- Chainlink: https://faucets.chain.link/

### For Base Sepolia

**Faucet:** https://faucet.quicknode.com/base/sepolia

**Steps:**
1. Visit the faucet link above
2. Connect your wallet or enter your address: `0xEFec2Eddf5151c724B610B7e5fa148752674D667`
3. Request testnet ETH (request 0.1-0.2 ETH)
4. Wait a few minutes for the transaction to confirm

**Alternative Faucets:**
- Coinbase Base Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

---

## Check Your Balance

After requesting funds, check your balance:

### Arbitrum Sepolia
```bash
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc'); provider.getBalance('0xEFec2Eddf5151c724B610B7e5fa148752674D667').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

### Base Sepolia
```bash
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia.base.org'); provider.getBalance('0xEFec2Eddf5151c724B610B7e5fa148752674D667').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

---

## Deploy After Getting Funds

Once you have testnet ETH:

### Deploy to Arbitrum Sepolia
```bash
npm run deploy:deterministic:arbitrum-sepolia
```

### Deploy to Base Sepolia
```bash
npm run deploy:deterministic:base-sepolia
```

**Important:** Both will deploy to the **SAME TokenFactory address** as BSC Testnet:
`0x7Af627Bf902549543701C58366d424eE59A4ee08`

---

## Why Same Address?

The deterministic deployment uses CREATE2 with the same salt across all chains:
- **Salt:** `0x5cd19fe5f28d6e25fa610706857dc91815daea7e10fabb6d757b91eb1942ec4f`
- This ensures the TokenFactory address is identical on all chains
- Simplifies multi-chain operations and user experience

---

## Estimated Costs

- **Arbitrum Sepolia:** ~0.0004 ETH (very cheap!)
- **Base Sepolia:** ~0.0004 ETH (very cheap!)
- **Total for both:** ~0.001 ETH (about $2-3 at current prices)

---

## Troubleshooting

### Faucet says "Rate Limited"
- Wait 24 hours and try again
- Use alternative faucets listed above
- Some faucets require Twitter/GitHub verification

### Funds not received
- Check the transaction on the block explorer:
  - Arbitrum: https://sepolia.arbiscan.io
  - Base: https://sepolia.basescan.org
- Some faucets take 5-15 minutes to process
- Make sure you're on the correct network in your wallet

### Still showing 0 balance
- Wait a few more minutes
- Check the block explorer for pending transactions
- Try a different faucet if one doesn't work

