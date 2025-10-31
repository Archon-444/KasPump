# KasPump Multichain Setup Guide

KasPump now supports multiple blockchain networks: **BNB Smart Chain**, **Arbitrum**, and **Base**.

## 🌐 Supported Networks

### Mainnets
- **BNB Smart Chain (BSC)** - Chain ID: 56
  - Low fees: $0.10 - $0.50
  - Fast 3-second blocks
  - Large DeFi ecosystem

- **Arbitrum One** - Chain ID: 42161
  - L2 Ethereum scaling
  - Very low fees: $0.05 - $0.30
  - Fast 0.25-second blocks

- **Base** - Chain ID: 8453
  - Coinbase L2
  - Low fees: $0.03 - $0.20
  - Growing ecosystem

### Testnets
- BNB Smart Chain Testnet (97)
- Arbitrum Sepolia (421614)
- Base Sepolia (84532)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `wagmi` - React hooks for Ethereum
- `viem` - TypeScript interface for Ethereum
- `@rainbow-me/rainbowkit` - Wallet connection UI (optional)
- `@tanstack/react-query` - Data fetching

### 2. Configure Environment

```bash
cp .env.example .env.local
```

**Required variables:**

```env
# Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Set default network (97 for BSC Testnet recommended for testing)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97

# Your deployer private key (for deployment only)
PRIVATE_KEY=your_private_key_here
```

### 3. Deploy Contracts

Deploy to BSC Testnet (recommended for testing):

```bash
npm run deploy:bsc-testnet
```

Or deploy to other networks:

```bash
# Mainnets
npm run deploy:bsc          # BNB Smart Chain
npm run deploy:arbitrum     # Arbitrum One
npm run deploy:base         # Base

# Testnets
npm run deploy:bsc-testnet  # BSC Testnet (recommended)
```

### 4. Update Environment with Contract Addresses

After deployment, the script will output contract addresses. Add them to `.env.local`:

```env
# Example for BSC Testnet
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=0x...
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=0x...
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and connect your wallet!

## 📦 Wallet Support

KasPump supports multiple wallet options:

- **MetaMask** - Most popular browser wallet
- **WalletConnect** - Mobile and desktop wallets
- **Coinbase Wallet** - Coinbase's native wallet
- **Any injected wallet** - Trust Wallet, Brave, etc.

## 🔧 Configuration Files

### Network Configuration
`src/config/chains.ts` - Defines all supported networks with metadata

### Wallet Configuration
`src/config/wagmi.ts` - Wagmi/wallet setup

### Contract Addresses
`src/config/contracts.ts` - Contract address registry per chain

### Deployments Tracking
`deployments.json` - Tracks deployed addresses across all chains

## 📝 Deployment Tracking

Contract deployments are automatically tracked in:

1. **`deployments.json`** - Main registry file
2. **`deployments/deployment-{network}-{timestamp}.json`** - Detailed logs

Example `deployments.json`:
```json
{
  "97": {
    "name": "BNB Smart Chain Testnet",
    "contracts": {
      "TokenFactory": "0x...",
      "FeeRecipient": "0x..."
    },
    "deployedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🏗️ Architecture Changes

### Old (Kasplex-only)
- Custom Kasplex wallet integration
- Single network support
- Hardcoded chain ID

### New (Multichain)
- Universal wallet support (Wagmi)
- Multiple networks
- Dynamic chain switching
- Network selector UI
- Per-chain contract registry

## 🧪 Testing Workflow

1. **Get Testnet Tokens**
   - BSC Testnet: https://testnet.binance.org/faucet-smart
   - Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
   - Base Sepolia: https://portal.cdp.coinbase.com/products/faucet

2. **Deploy Contracts**
   ```bash
   npm run deploy:bsc-testnet
   ```

3. **Update `.env.local`** with deployed addresses

4. **Test Features**
   - Connect wallet
   - Switch networks
   - Create token
   - Buy/sell tokens
   - Check bonding curve

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Contains private keys
2. **Use separate wallets** for testnet and mainnet
3. **Test thoroughly** on testnets before mainnet
4. **Verify contracts** on block explorers after deployment
5. **Audit smart contracts** before mainnet launch

## 🌟 Key Features

- ✅ Multi-wallet support
- ✅ Multi-chain support (BSC, Arbitrum, Base)
- ✅ Network switching in UI
- ✅ Per-chain contract management
- ✅ Automated deployment tracking
- ✅ Responsive wallet UI
- ✅ Balance display across chains

## 📚 Component Usage

### Wallet Connection

```tsx
import { MultichainWalletButton } from '@/components/features/MultichainWalletButton';

function MyComponent() {
  return <MultichainWalletButton />;
}
```

### Network Selector

```tsx
import { NetworkSelector } from '@/components/features/NetworkSelector';

function MyComponent() {
  return <NetworkSelector showTestnets={true} />;
}
```

### Using Wallet Hook

```tsx
import { useMultichainWallet } from '@/hooks/useMultichainWallet';

function MyComponent() {
  const wallet = useMultichainWallet();

  return (
    <div>
      {wallet.connected ? (
        <p>Connected to {wallet.chainName}</p>
      ) : (
        <button onClick={wallet.connectInjected}>Connect</button>
      )}
    </div>
  );
}
```

## 🚨 Troubleshooting

### Wallet won't connect
- Check if MetaMask/wallet is installed
- Verify WalletConnect project ID is set
- Clear browser cache and reload

### Wrong network
- Use NetworkSelector component
- Or manually switch in wallet

### Contracts not deployed
- Run deployment script for target network
- Update `.env.local` with addresses
- Restart dev server

### RPC errors
- Public RPCs may rate limit
- Add custom RPC URLs in `.env.local`
- Consider using Alchemy/Infura for production

## 📈 Next Steps

1. **Deploy to Testnet** - Test everything thoroughly
2. **Audit Contracts** - Security review before mainnet
3. **Deploy to Mainnet** - Start with one chain, expand gradually
4. **Monitor** - Set up analytics and error tracking
5. **Scale** - Add more chains as needed

## 🆘 Support

For issues or questions:
- Check `deployments/` folder for deployment logs
- Review Hardhat output for deployment errors
- Verify environment variables are set correctly
- Ensure wallet has sufficient funds for gas

## 🎯 Migration from Kasplex

If you had a previous Kasplex deployment:

1. Old files are archived in `archive/kasplex/`
2. Smart contracts are compatible (no changes needed)
3. Update frontend to use new wallet components
4. Deploy to new networks as needed
5. Update documentation and user guides

---

Built with ❤️ for the multichain future
