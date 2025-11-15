import hre from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const { ethers, network } = hre;

/**
 * Check Deployment Wallet Balance
 *
 * Verifies that the deployment wallet has sufficient funds
 * for contract deployment on the current network.
 *
 * Usage:
 *   npx hardhat run scripts/check-balance.ts --network bsc
 *   npx hardhat run scripts/check-balance.ts --network bscTestnet
 */

// Minimum balances required for deployment (in native token)
const MINIMUM_BALANCES = {
  56: 0.02,      // BSC Mainnet - BNB
  97: 0.05,      // BSC Testnet - tBNB
  42161: 0.005,  // Arbitrum - ETH
  421614: 0.01,  // Arbitrum Sepolia - ETH
  8453: 0.005,   // Base - ETH
  84532: 0.01,   // Base Sepolia - ETH
};

const CHAIN_NAMES: Record<number, { name: string; symbol: string; faucet?: string }> = {
  56: { name: "BNB Smart Chain", symbol: "BNB" },
  97: { name: "BSC Testnet", symbol: "tBNB", faucet: "https://testnet.bnbchain.org/faucet-smart" },
  42161: { name: "Arbitrum One", symbol: "ETH" },
  421614: { name: "Arbitrum Sepolia", symbol: "ETH", faucet: "https://faucet.quicknode.com/arbitrum/sepolia" },
  8453: { name: "Base", symbol: "ETH" },
  84532: { name: "Base Sepolia", symbol: "ETH", faucet: "https://faucet.quicknode.com/base/sepolia" },
};

async function main() {
  const chainId = await ethers.provider.getNetwork().then(n => Number(n.chainId));
  const chainInfo = CHAIN_NAMES[chainId];
  const minBalance = MINIMUM_BALANCES[chainId] || 0.01;

  if (!chainInfo) {
    console.error(`❌ Unsupported chain ID: ${chainId}`);
    process.exit(1);
  }

  console.log("\n💰 Deployment Wallet Balance Check");
  console.log("====================================\n");
  console.log(`📡 Network: ${chainInfo.name} (Chain ${chainId})`);
  console.log(`💎 Native Token: ${chainInfo.symbol}\n`);

  // Get deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ No signers found!");
    console.error("   Please ensure PRIVATE_KEY is set in .env.local\n");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log("👤 Deployer Address:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceFormatted = parseFloat(ethers.formatEther(balance));

  console.log(`💰 Current Balance: ${balanceFormatted.toFixed(6)} ${chainInfo.symbol}`);
  console.log(`📊 Minimum Required: ${minBalance.toFixed(6)} ${chainInfo.symbol}\n`);

  // Check if sufficient
  if (balanceFormatted >= minBalance) {
    console.log("✅ Sufficient balance for deployment!");
    console.log(`   Available: ${balanceFormatted.toFixed(6)} ${chainInfo.symbol}`);
    console.log(`   Required:  ${minBalance.toFixed(6)} ${chainInfo.symbol}`);
    console.log(`   Buffer:    ${(balanceFormatted - minBalance).toFixed(6)} ${chainInfo.symbol}\n`);

    // Show estimated costs
    console.log("📝 Estimated Deployment Costs:");
    console.log("   DeterministicDeployer: ~0.002 BNB / 0.0005 ETH");
    console.log("   TokenFactory:          ~0.008 BNB / 0.002 ETH");
    console.log("   Gas fluctuations:      ~0.002 BNB / 0.0005 ETH");
    console.log("   ─────────────────────────────────────────────");
    console.log("   Total:                 ~0.012 BNB / 0.003 ETH\n");

    console.log("🚀 Ready to deploy!");
    process.exit(0);
  } else {
    const shortfall = minBalance - balanceFormatted;
    console.log(`❌ Insufficient balance for deployment!`);
    console.log(`   Need:     ${minBalance.toFixed(6)} ${chainInfo.symbol}`);
    console.log(`   Have:     ${balanceFormatted.toFixed(6)} ${chainInfo.symbol}`);
    console.log(`   Short:    ${shortfall.toFixed(6)} ${chainInfo.symbol}\n`);

    console.log("💡 How to get more tokens:");

    if (chainInfo.faucet) {
      console.log(`   1. Visit the faucet: ${chainInfo.faucet}`);
      console.log(`   2. Enter your address: ${deployer.address}`);
      console.log(`   3. Request tokens (usually takes 30-60 seconds)\n`);
    } else {
      console.log(`   1. Purchase ${chainInfo.symbol} on an exchange`);
      console.log(`   2. Send ${shortfall.toFixed(6)} ${chainInfo.symbol} (plus buffer) to:`);
      console.log(`      ${deployer.address}\n`);
    }

    console.log("⚠️  Cannot proceed with deployment until balance is sufficient.\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error checking balance:", error.message);
    process.exit(1);
  });
