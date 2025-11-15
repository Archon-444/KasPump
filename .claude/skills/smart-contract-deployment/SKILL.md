---
name: smart-contract-deployment
description: Deploy and verify smart contracts on multiple blockchain networks (BSC, Arbitrum, Base) using Hardhat. Use this skill when deploying KasPump contracts, verifying deployments, or troubleshooting deployment issues.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Smart Contract Deployment Skill

This skill helps deploy and verify smart contracts on multiple networks for the KasPump project.

## Supported Networks

- **BSC Mainnet**: `bsc`
- **BSC Testnet**: `bscTestnet`
- **Arbitrum Mainnet**: `arbitrum`
- **Arbitrum Sepolia**: `arbitrumSepolia`
- **Base Mainnet**: `base`
- **Base Sepolia**: `baseSepolia`

## Deployment Commands

### Standard Deployment

```bash
npm run deploy:<network>
```

Example: `npm run deploy:bsc-testnet`

### Deterministic Deployment (CREATE2)

```bash
npm run deploy:deterministic:<network>
```

Example: `npm run deploy:deterministic:bsc-testnet`

## Deployment Verification Steps

1. **Pre-Deployment Checks**
   - Verify `.env` configuration contains necessary private keys and RPC URLs
   - Check hardhat.config.ts for correct network configuration
   - Ensure contracts are compiled: `npm run compile`
   - Verify sufficient native token balance for gas fees

2. **Execute Deployment**
   - Run appropriate deployment script
   - Monitor transaction hashes and contract addresses
   - Save deployment artifacts to `deployments.json`

3. **Post-Deployment Verification**
   - Run verification script: `npm run verify:deployment`
   - Test deployed contracts: `npm run test:bsc` (for BSC testnet)
   - Verify contract on block explorer (optional)

## Troubleshooting

### Common Issues

1. **Insufficient Funds**: Check wallet balance on target network
2. **Network RPC Issues**: Verify RPC URL in hardhat.config.ts
3. **Gas Price Too Low**: Adjust gas settings in deployment script
4. **Nonce Too Low**: Clear pending transactions or wait for confirmation

### Deployment File Locations

- Deployment scripts: `scripts/deploy.ts`, `scripts/deploy-deterministic.ts`
- Contract verification: `scripts/verify-deployment.ts`
- Network config: `hardhat.config.ts`
- Deployment records: `deployments.json`

## Best Practices

1. Always test on testnet before mainnet deployment
2. Use deterministic deployment for consistent addresses across chains
3. Verify contract source code on block explorers after deployment
4. Keep deployment records updated in `deployments.json`
5. Monitor gas prices to optimize deployment costs

## Example Workflow

```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to testnet
npm run deploy:deterministic:bsc-testnet

# 3. Verify deployment
npm run verify:deployment

# 4. Test deployed contracts
npm run test:bsc

# 5. If successful, deploy to mainnet
npm run deploy:deterministic:bsc
```
