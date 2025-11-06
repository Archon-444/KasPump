import hre from "hardhat";

const { network, ethers } = hre;

// Network configuration
const NETWORKS = {
  bscTestnet: {
    name: "BSC Testnet",
    chainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorer: "https://testnet.bscscan.com",
    faucet: "https://testnet.bnbchain.org/faucet-smart"
  },
  bsc: {
    name: "BNB Smart Chain",
    chainId: 56,
    rpc: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com"
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    faucet: "https://faucet.quicknode.com/arbitrum/sepolia"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io"
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    faucet: "https://faucet.quicknode.com/base/sepolia"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org"
  }
};

async function checkPrerequisites() {
  const networkName = network.name;
  const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];

  if (!networkConfig) {
    console.error(`❌ Unsupported network: ${networkName}`);
    console.log("\nSupported networks:");
    Object.keys(NETWORKS).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  console.log(`\n🔍 Deployment Pre-Check for ${networkConfig.name}`);
  console.log("=" .repeat(50));

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer Address: ${deployer.address}`);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  const balanceFormatted = ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceFormatted} ${networkConfig.name.includes("BSC") || networkConfig.name.includes("BNB") ? "BNB" : "ETH"}`);

  // Check if sufficient balance
  const minBalance = networkName.includes("testnet") || networkName.includes("Sepolia") ? 0.01 : 0.1;
  const isTestnet = networkName.includes("testnet") || networkName.includes("Sepolia");

  if (parseFloat(balanceFormatted) < minBalance) {
    console.log(`\n⚠️  WARNING: Low balance! You need at least ${minBalance} for deployment.`);
    if (isTestnet && 'faucet' in networkConfig && networkConfig.faucet) {
      console.log(`\n🎁 Get testnet funds from: ${networkConfig.faucet}`);
      console.log(`   Enter your address: ${deployer.address}`);
    }
    console.log("\n❌ Cannot proceed with deployment. Please fund your wallet first.");
    process.exit(1);
  }

  console.log(`✅ Balance sufficient for deployment`);
  console.log(`\n📡 Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
  console.log(`🔍 Explorer: ${networkConfig.explorer}`);

  // Check network connection
  try {
    const blockNumber = await deployer.provider.getBlockNumber();
    console.log(`✅ Connected to network (Latest block: ${blockNumber})`);
  } catch (error) {
    console.error(`❌ Cannot connect to network`);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All prerequisites met! Ready to deploy.\n");

  return { deployer, networkConfig };
}

async function main() {
  console.log("\n🚀 KasPump Deployment Helper");
  console.log("=".repeat(50));

  const { deployer, networkConfig } = await checkPrerequisites();

  console.log("📋 Deployment Options:");
  console.log("1. Standard Deployment (deploy.ts)");
  console.log("2. Deterministic Deployment (deploy-deterministic.ts) - Same address across chains");
  console.log("\n💡 Recommendation: Use deterministic deployment for multi-chain consistency");

  console.log("\n📝 To deploy, run one of:");
  console.log(`   npm run deploy:${network.name}`);
  console.log(`   npm run deploy:deterministic:${network.name}`);
  console.log("\nOr for a specific network:");
  console.log("   npm run deploy:bsc-testnet");
  console.log("   npm run deploy:deterministic:bsc-testnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

