import hre from "hardhat";
import { readFileSync } from "fs";

const { ethers, network } = hre;

async function main() {
  console.log("\n🔍 Verifying KasPump Deployment");
  console.log("=".repeat(60));
  
  // Read deployment info
  let deployments: any = {};
  try {
    const deploymentData = readFileSync("./deployments.json", "utf-8");
    deployments = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Could not read deployments.json");
    console.error("   Run deployment first: npm run deploy:deterministic:bsc-testnet");
    process.exit(1);
  }

  const networkName = network.name;
  
  // Get chain ID from network config or hardcode based on network name
  let chainId: number;
  if (networkName === "bscTestnet") {
    chainId = 97;
  } else if (networkName === "bsc") {
    chainId = 56;
  } else if (networkName === "arbitrumSepolia") {
    chainId = 421614;
  } else if (networkName === "arbitrum") {
    chainId = 42161;
  } else if (networkName === "baseSepolia") {
    chainId = 84532;
  } else if (networkName === "base") {
    chainId = 8453;
  } else {
    console.error(`❌ Unknown network: ${networkName}`);
    process.exit(1);
  }
  
  if (!deployments[chainId.toString()]) {
    console.error(`❌ No deployment found for chain ID ${chainId}`);
    console.log("\nAvailable deployments:");
    Object.keys(deployments).forEach((id) => {
      console.log(`   Chain ${id}: ${deployments[id].name}`);
    });
    process.exit(1);
  }

  const deployment = deployments[chainId.toString()];
  const factoryAddress = deployment.contracts?.TokenFactory;

  if (!factoryAddress) {
    console.error("❌ TokenFactory address not found in deployment info");
    process.exit(1);
  }

  console.log(`\n📡 Network: ${deployment.name} (Chain ID: ${chainId})`);
  console.log(`📍 TokenFactory: ${factoryAddress}`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`📅 Deployed: ${deployment.deployedAt}`);

  let signer;
  try {
    const signers = await ethers.getSigners();
    signer = signers[0];
    console.log(`\n🔐 Verifying with account: ${signer.address}`);
  } catch (error) {
    console.log(`\n⚠️  No signer available (read-only verification)`);
  }

  if (signer) {
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ${networkName.includes("BSC") || networkName.includes("BNB") ? "BNB" : "ETH"}`);
  }

  // Test 1: Contract exists and is accessible
  console.log("\n📋 Test 1: Contract Accessibility");
  try {
    const provider = ethers.provider;
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const factory = TokenFactory.attach(factoryAddress).connect(provider);

    const owner = await factory.owner();
    const feeRecipient = await factory.feeRecipient();
    const isPaused = await factory.paused();
    
    console.log("   ✅ Contract is accessible");
    console.log(`   Owner: ${owner}`);
    console.log(`   Fee Recipient: ${feeRecipient}`);
    console.log(`   Paused: ${isPaused}`);

    // Test 2: Can read token count
    try {
      // Try getAllTokens first (newer version)
      try {
        const allTokens = await factory.getAllTokens();
        console.log(`\n   ✅ Token tracking works`);
        console.log(`   Token addresses: ${allTokens.length}`);
        if (allTokens.length > 0) {
          console.log(`   First token: ${allTokens[0]}`);
        }
      } catch (error: any) {
        // Fallback to getTotalTokens if getAllTokens doesn't exist
        try {
          const totalTokens = await factory.getTotalTokens();
          console.log(`\n   ✅ Token tracking works`);
          console.log(`   Total tokens: ${totalTokens.toString()}`);
        } catch (e: any) {
          console.log(`   ⚠️  Could not read token count: ${e.message}`);
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not read token count: ${error.message}`);
    }

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Check on block explorer
  console.log("\n📋 Test 2: Block Explorer Links");
  const explorerUrls: Record<number, string> = {
    97: `https://testnet.bscscan.com/address/${factoryAddress}`,
    56: `https://bscscan.com/address/${factoryAddress}`,
    421614: `https://sepolia.arbiscan.io/address/${factoryAddress}`,
    42161: `https://arbiscan.io/address/${factoryAddress}`,
    84532: `https://sepolia.basescan.org/address/${factoryAddress}`,
    8453: `https://basescan.org/address/${factoryAddress}`,
  };

  const explorerUrl = explorerUrls[chainId];
  if (explorerUrl) {
    console.log(`   🔗 View on explorer: ${explorerUrl}`);
  }

  // Test 3: Environment variables
  console.log("\n📋 Test 3: Environment Configuration");
  const envVars = {
    "NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY": factoryAddress,
    "NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT": deployment.contracts?.FeeRecipient || deployment.deployer,
  };

  console.log("   Add these to your .env.local:");
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      console.log(`   ${key}=${value}`);
    }
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Verification Complete!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Contract is deployed and accessible");
  console.log("   ✅ Contract functions are callable");
  console.log("   ✅ Ready for frontend integration");
  
  console.log("\n💡 Next Steps:");
  console.log("   1. Update .env.local with contract addresses (see above)");
  console.log("   2. Start frontend: npm run dev");
  console.log("   3. Test token creation through the UI");
  console.log("   4. Test trading functionality");
  
  if (deployment.isDeterministic) {
    console.log("\n🌐 Multi-Chain Note:");
    console.log("   This deployment uses deterministic addresses.");
    console.log("   Deploy to other chains to get the SAME TokenFactory address!");
    console.log("   Run: npm run deploy:deterministic:arbitrum-sepolia");
    console.log("   Run: npm run deploy:deterministic:base-sepolia");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });

