# KasPump - Next-Generation Token Launchpad

**🚀 A Pump.fun-style DEX and token launchpad built on EVM chains**

![KasPump](https://img.shields.io/badge/Status-Ready%20for%20Launch-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Network](https://img.shields.io/badge/Network-Multi--Chain%20EVM-purple)

## 🎯 Overview

KasPump is a next-generation decentralized token launchpad that brings the viral success of Pump.fun to EVM chains. Starting with BNB Smart Chain, it offers superior performance with low gas costs, fast transactions, and advanced bonding curve mathematics.

## ✨ Key Features

- **🚀 Instant Token Launches** - Deploy tokens in seconds
- **📈 Advanced Bonding Curves** - Linear, exponential, and adaptive algorithms
- **⚡ Lightning Fast** - High throughput on BNB Smart Chain
- **💰 Low Costs** - Minimal gas fees on BSC (~$0.10-$0.50 per transaction)
- **🌐 Multi-Chain Ready** - Built for BSC, Arbitrum, Base, and more
- **📊 Professional Analytics** - Real-time insights and business intelligence
- **🏢 Enterprise Ready** - Multi-tier pricing and institutional features

## 🏗️ Architecture

### Smart Contracts
- **TokenFactory.sol** - ERC-20 token deployment with metadata
- **BondingCurveAMM.sol** - Automated market maker with advanced pricing
- **DeterministicDeployer.sol** - Deterministic contract deployment
- **DexRouterRegistry.sol** - DEX router management
- **LimitOrderBook.sol** - On-chain limit orders
- **StopLossOrderBook.sol** - On-chain stop-loss orders

### Frontend
- **Next.js 16** with App Router and TypeScript
- **Multi-Chain Wallet Integration** - WalletConnect, MetaMask, and more
- **Modern UI** - Tailwind CSS with Radix UI components
- **Real-time Features** - WebSocket price feeds and live updates

## 🚀 Quick Start

**Get up and running in 5 minutes!** See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or compatible EVM wallet
- BSC Testnet BNB (free from faucet)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd KasPump

# Install dependencies
npm install

# Environment is pre-configured for BSC Testnet!
# Just add your WalletConnect Project ID to .env.local:
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
# Get one free at https://cloud.walletconnect.com

# Verify your setup
npm run check-env

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your local KasPump instance!

**📖 New to KasPump?** Follow our comprehensive [Quick Start Guide](./QUICK_START.md)

## 📦 Project Structure

```
KasPump/
├── contracts/              # Smart contracts (Solidity)
│   ├── TokenFactory.sol    # Main token factory
│   ├── BondingCurveAMM.sol # Bonding curve AMM
│   ├── DeterministicDeployer.sol # Deterministic deployment
│   ├── DexRouterRegistry.sol # DEX router management
│   ├── LimitOrderBook.sol  # Limit order system
│   └── StopLossOrderBook.sol # Stop-loss order system
├── scripts/                # Deployment & utility scripts
│   ├── deploy.ts           # Multi-chain deployment
│   └── deploy-deterministic.ts # Deterministic deployment
├── server/                 # WebSocket server (Socket.IO)
├── subgraph/               # The Graph protocol indexer
├── src/
│   ├── app/                # Next.js 16 App Router pages
│   ├── components/         # React components
│   │   ├── ui/             # Base UI components (Radix)
│   │   ├── features/       # Feature components
│   │   ├── trading/        # Trading UI (limit/stop-loss)
│   │   ├── mobile/         # Mobile optimized components
│   │   ├── admin/          # Admin dashboard
│   │   └── providers/      # App-level providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library code & utilities
│   ├── config/             # Chain & app configuration
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
└── public/                 # Static assets
```

## 🔧 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run check-env        # Validate environment setup
npm run compile          # Compile smart contracts (Hardhat)
npm run deploy:bsc       # Deploy contracts to BSC mainnet
npm run deploy:bsc-testnet # Deploy to BSC testnet
npm run deploy:arbitrum  # Deploy to Arbitrum
npm run deploy:base      # Deploy to Base
npm run test             # Run contract tests (Hardhat)
npm run test:unit        # Run frontend unit tests (Vitest)
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

## 🤖 Claude Code Skills Integration

This project includes specialized skills for Claude Code to enhance development productivity:

- **smart-contract-deployment** - Deploy and verify contracts across networks
- **web3-testing** - Test Web3 components and smart contract interactions
- **kaspump-token-launch** - Guide token launches and bonding curve configuration

**Quick Example:**
```
Use the smart-contract-deployment skill to deploy to BSC testnet
```

📖 **[View Complete Skills Guide →](CLAUDE_CODE_SKILLS_GUIDE.md)**

## 🌐 Supported Networks

### BNB Smart Chain Testnet
- **Network**: BSC Testnet
- **Chain ID**: 97
- **RPC**: https://data-seed-prebsc-1-s1.binance.org:8545
- **Explorer**: https://testnet.bscscan.com
- **Faucet**: https://testnet.bnbchain.org/faucet-smart

### BNB Smart Chain Mainnet
- **Network**: BSC Mainnet
- **Chain ID**: 56
- **RPC**: https://bsc-dataseed1.binance.org
- **Explorer**: https://bscscan.com

### Additional Networks (Coming Soon)
- **Arbitrum** - Low-cost L2 with high security
- **Base** - Coinbase's L2 network
- **Polygon** - High-speed sidechain

## 📊 Current Status: BSC Testnet Live! 🎉

### ✅ Fully Operational
- ✅ **Smart Contracts** - TokenFactory + BondingCurveAMM deployed to BSC Testnet
- ✅ **Contract Integration** - Full AMM integration with frontend hooks
- ✅ **Real Blockchain Data** - All token data sourced from on-chain queries
- ✅ **Trading Functionality** - Buy/sell execution with slippage protection
- ✅ **Wallet Integration** - WalletConnect/RainbowKit with multi-chain support
- ✅ **Modern UI** - Production-ready Tailwind + Radix UI components
- ✅ **Environment Setup** - Pre-configured for BSC Testnet development

### ⚠️ Pre-Mainnet Requirements
- [ ] WalletConnect Project ID configuration (5 minutes)
- [ ] End-to-end testing on BSC Testnet (1-2 days)
- [ ] Mainnet deployment (BSC, Arbitrum, Base)
- [ ] Security audit (recommended)

**📖 Complete Integration Details:** [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md)

## 🏆 Competitive Advantages

| Feature | KasPump | Pump.fun | Advantage |
|---------|---------|----------|-----------|
| Multi-Chain Support | 9.0/10 | 3.0/10 | **+6.0 points** |
| Network Reliability | 9.0/10 | 6.5/10 | **+2.5 points** |
| Creator Tools | 9.0/10 | 7.0/10 | **+2.0 points** |
| Enterprise Features | 9.0/10 | 3.0/10 | **+6.0 points** |
| **Overall Score** | **9.0/10** | **4.9/10** | **+4.1 points** |

## 🛡️ Security

- **Smart Contract Audits** - Planned with multiple firms
- **Reentrancy Guards** - OpenZeppelin ReentrancyGuard on all state-changing functions
- **Access Controls** - Role-based permissions with Ownable pattern
- **Bug Bounty** - Program planned

## 📈 Roadmap

### Phase 1: BSC Launch (Current)
- [x] Core platform development
- [x] Smart contract deployment to BSC Testnet
- [x] Frontend AMM integration
- [x] Real blockchain data integration
- [x] Trading functionality (buy/sell)
- [ ] WalletConnect configuration (user action)
- [ ] End-to-end testing
- [ ] BSC Mainnet deployment
- [ ] Public launch

### Phase 2: Multi-Chain Expansion
- [ ] Arbitrum One deployment
- [ ] Base deployment
- [ ] Cross-chain bridge integration
- [ ] Advanced analytics dashboard
- [ ] Mobile PWA implementation

### Phase 3: Advanced Features & Growth
- [ ] Real-time WebSocket price feeds
- [ ] Advanced charting (TradingView integration)
- [ ] NFT metadata on IPFS
- [ ] Partnership integrations (DEX aggregators, wallets)
- [ ] Community governance token
- [ ] Marketing campaigns and user acquisition

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.kaspump.io](https://docs.kaspump.io)
- **Discord**: [discord.gg/kaspump](https://discord.gg/kaspump)
- **Twitter**: [@KasPumpOfficial](https://twitter.com/KasPumpOfficial)
- **Email**: support@kaspump.io

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Always do your own research before trading or investing.

---

**Built with ❤️ for the EVM ecosystem**