import hre from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import * as readline from "readline";

const { network, ethers } = hre;

// Network configuration
const NETWORKS = {
  bscTestnet: {
    name: "BSC Testnet",
    chainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorer: "https://testnet.bscscan.com",
    faucet: "https://testnet.bnbchain.org/faucet-smart",
    symbol: "BNB"
  },
  bsc: {
    name: "BNB Smart Chain",
    chainId: 56,
    rpc: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com",
    symbol: "BNB"
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    faucet: "https://faucet.quicknode.com/arbitrum/sepolia",
    symbol: "ETH"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    symbol: "ETH"
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    faucet: "https://faucet.quicknode.com/base/sepolia",
    symbol: "ETH"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    symbol: "ETH"
  }
};

async function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log("\n🚀 KasPump Interactive Deployment");
  console.log("=".repeat(60));
  
  // Check if private key is set
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("\n⚠️  No PRIVATE_KEY found in environment variables.");
    console.log("\nPlease create a .env.local file with:");
    console.log("  PRIVATE_KEY=0x...\n");
    
    const proceed = await question("Do you want to continue anyway? (y/n): ");
    if (proceed.toLowerCase() !== 'y') {
      console.log("\nPlease set PRIVATE_KEY in .env.local and try again.");
      process.exit(1);
    }
  }

  // Get network
  const networkName = network.name;
  const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];

  if (!networkConfig) {
    console.error(`\n❌ Unsupported network: ${networkName}`);
    console.log("\nSupported networks:");
    Object.entries(NETWORKS).forEach(([key, config]) => {
      console.log(`  - ${key} (${config.name})`);
    });
    process.exit(1);
  }

  console.log(`\n📡 Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
  console.log(`🔍 Explorer: ${networkConfig.explorer}`);

  // Get deployer
  let deployer;
  try {
    [deployer] = await ethers.getSigners();
    console.log(`\n👤 Deployer Address: ${deployer.address}`);
  } catch (error: any) {
    console.error("\n❌ Error getting deployer account:", error.message);
    console.log("\nPlease ensure PRIVATE_KEY is set in .env.local");
    process.exit(1);
  }

  // Check balance
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceFormatted = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceFormatted} ${networkConfig.symbol}`);

    const minBalance = networkName.includes("testnet") || networkName.includes("Sepolia") ? 0.01 : 0.1;
    
    if (parseFloat(balanceFormatted) < minBalance) {
      console.log(`\n⚠️  WARNING: Low balance! You need at least ${minBalance} ${networkConfig.symbol} for deployment.`);
      if (networkConfig.faucet) {
        console.log(`\n🎁 Get testnet funds from: ${networkConfig.faucet}`);
        console.log(`   Enter your address: ${deployer.address}`);
      }
      
      const proceed = await question(`\nProceed anyway? (y/n): `);
      if (proceed.toLowerCase() !== 'y') {
        console.log("\nPlease fund your wallet and try again.");
        process.exit(1);
      }
    }

    // Check network connection
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`✅ Connected to network (Latest block: ${blockNumber})`);
  } catch (error: any) {
    console.error(`\n❌ Network error:`, error.message);
    process.exit(1);
  }

  // Ask deployment type
  console.log("\n" + "=".repeat(60));
  console.log("\n📋 Choose deployment type:");
  console.log("1. Standard Deployment (normal address)");
  console.log("2. Deterministic Deployment (same address across all chains) ⭐ Recommended");
  
  const deploymentType = await question("\nEnter choice (1 or 2, default: 2): ") || "2";

  if (deploymentType === "1") {
    console.log("\n🚀 Starting standard deployment...\n");
    // Standard deployment logic would go here
    console.log("Run: npm run deploy:bsc-testnet (or your chosen network)");
  } else {
    console.log("\n🚀 Starting deterministic deployment...\n");
    console.log("This will deploy TokenFactory to the SAME address across all chains!");
    
    const confirm = await question("\nConfirm deployment? (y/n): ");
    if (confirm.toLowerCase() !== 'y') {
      console.log("\nDeployment cancelled.");
      process.exit(0);
    }

    // Run deterministic deployment
    console.log("\n⏳ Deploying...\n");
    
    // Import and run the deterministic deployment script
    try {
      // We'll execute the deployment logic here
      const DeterministicDeployer = await ethers.getContractFactory("DeterministicDeployer");
      const DEPLOYMENT_SALT = process.env.DEPLOYMENT_SALT || 
        "0x4b617350756d704d756c7469436861696e4c61756e636865723230323500";

      console.log("📄 Step 1: Deploying DeterministicDeployer...");
      const deterministicDeployer = await DeterministicDeployer.deploy();
      await deterministicDeployer.waitForDeployment();
      const deployerAddress = await deterministicDeployer.getAddress();
      console.log("✅ DeterministicDeployer deployed to:", deployerAddress);

      console.log("\n📄 Step 2: Computing expected TokenFactory address...");
      const expectedFactoryAddress = await deterministicDeployer.computeTokenFactoryAddress(
        DEPLOYMENT_SALT,
        deployer.address
      );
      console.log("🎯 Expected TokenFactory address:", expectedFactoryAddress);

      console.log("\n📄 Step 3: Deploying TokenFactory via CREATE2...");
      const tx = await deterministicDeployer.deployTokenFactory(
        deployer.address,
        DEPLOYMENT_SALT
      );
      const receipt = await tx.wait();
      console.log("✅ TokenFactory deployed!");

      // Get deployed address
      const factoryAddress = await deterministicDeployer.deployedContracts(
        ethers.keccak256(
          ethers.solidityPacked(
            ["bytes32", "string", "string"],
            [DEPLOYMENT_SALT, "TokenFactory", "v1.0.0"]
          )
        )
      );

      // Verify
      const TokenFactory = await ethers.getContractAt("TokenFactory", factoryAddress);
      const owner = await TokenFactory.owner();
      const feeRecipient = await TokenFactory.feeRecipient();

      console.log("\n✅ Deployment verified!");
      console.log("   Factory Address:", factoryAddress);
      console.log("   Owner:", owner);
      console.log("   Fee Recipient:", feeRecipient);

      // Save deployment
      const deploymentsPath = "./deployments.json";
      let deployments: any = {};
      if (existsSync(deploymentsPath)) {
        deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
      }

      deployments[networkConfig.chainId] = {
        name: networkConfig.name,
        contracts: {
          DeterministicDeployer: deployerAddress,
          TokenFactory: factoryAddress,
          FeeRecipient: feeRecipient,
        },
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        blockNumber: receipt?.blockNumber,
        deterministicSalt: DEPLOYMENT_SALT,
        isDeterministic: true,
      };

      writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
      console.log("\n💾 Deployment info saved to deployments.json");

      console.log("\n🎉 DEPLOYMENT COMPLETE!");
      console.log("=".repeat(60));
      console.log(`📍 TokenFactory: ${factoryAddress}`);
      console.log(`🔍 View on explorer: ${networkConfig.explorer}/address/${factoryAddress}`);
      
    } catch (error: any) {
      console.error("\n❌ Deployment failed:", error.message);
      if (error.code === "INSUFFICIENT_FUNDS") {
        console.error("\n💡 You don't have enough balance for deployment.");
        if (networkConfig.faucet) {
          console.error(`   Get funds from: ${networkConfig.faucet}`);
        }
      }
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
