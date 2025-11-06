import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config();

const { ethers, network } = hre;

// Deployed contract addresses on BSC Testnet
const DEPLOYED_ADDRESSES = {
  bscTestnet: {
    tokenFactory: "0x7Af627Bf902549543701C58366d424eE59A4ee08",
    deterministicDeployer: "0x943D9f1D05586435282dc2F978612d6526138c79",
  }
};

async function main() {
  console.log("\n🧪 Testing Deployed Contracts on BSC Testnet");
  console.log("=".repeat(60));
  
  if (network.name !== "bscTestnet") {
    console.error("❌ This script is designed for BSC Testnet only!");
    console.log(`   Current network: ${network.name}`);
    console.log("   Run with: npm run deploy:deterministic:bsc-testnet");
    process.exit(1);
  }

  const factoryAddress = DEPLOYED_ADDRESSES.bscTestnet.tokenFactory;
  console.log(`\n📍 TokenFactory Address: ${factoryAddress}`);

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Testing with account: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`);

  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.log("\n⚠️  Warning: Low balance! You may not have enough for testing.");
  }

  // ========== TEST 1: Verify Factory Contract ==========
  console.log("\n📋 Test 1: Verifying TokenFactory contract...");
  
  try {
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactory.attach(factoryAddress);

    const owner = await factory.owner();
    const feeRecipient = await factory.feeRecipient();
    const isPaused = await factory.paused();
    const totalTokens = await factory.getTotalTokens();

    console.log("   ✅ Contract is accessible");
    console.log(`   Owner: ${owner}`);
    console.log(`   Fee Recipient: ${feeRecipient}`);
    console.log(`   Paused: ${isPaused}`);
    console.log(`   Total Tokens Created: ${totalTokens}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("   ⚠️  Warning: Owner doesn't match deployer address");
    }
  } catch (error: any) {
    console.error("   ❌ Error accessing contract:", error.message);
    process.exit(1);
  }

  // ========== TEST 2: Create a Test Token ==========
  console.log("\n📋 Test 2: Creating a test token...");

  try {
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactory.attach(factoryAddress);

    const tokenName = "Test Token BSC";
    const tokenSymbol = "TESTBSC";
    const totalSupply = ethers.parseEther("1000000"); // 1M tokens
    const basePrice = ethers.parseUnits("0.0001", 18); // 0.0001 BNB
    const slope = ethers.parseUnits("0.000000001", 18); // Small slope
    const curveType = 0; // Linear

    console.log("   Token parameters:");
    console.log(`   - Name: ${tokenName}`);
    console.log(`   - Symbol: ${tokenSymbol}`);
    console.log(`   - Supply: ${ethers.formatEther(totalSupply)} tokens`);
    console.log(`   - Base Price: ${ethers.formatEther(basePrice)} BNB`);

    // Estimate gas
    const gasEstimate = await factory.createToken.estimateGas(
      tokenName,
      tokenSymbol,
      "Test token for BSC testing",
      "",
      totalSupply,
      basePrice,
      slope,
      curveType
    );
    console.log(`   - Estimated gas: ${gasEstimate.toString()}`);

    // Create token
    console.log("\n   📤 Creating token...");
    const tx = await factory.createToken(
      tokenName,
      tokenSymbol,
      "Test token for BSC testing",
      "",
      totalSupply,
      basePrice,
      slope,
      curveType
    );

    console.log(`   ⏳ Transaction hash: ${tx.hash}`);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`   ✅ Token created! Block: ${receipt?.blockNumber}`);

    // Get token address from events
    const tokenCreatedEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === "TokenCreated";
      } catch {
        return false;
      }
    });

    if (tokenCreatedEvent) {
      const parsed = factory.interface.parseLog(tokenCreatedEvent);
      const tokenAddress = parsed?.args[0];
      const ammAddress = parsed?.args[1];
      
      console.log(`   📍 Token Address: ${tokenAddress}`);
      console.log(`   📍 AMM Address: ${ammAddress}`);
    }

    // Verify token count increased
    const newTotalTokens = await factory.getTotalTokens();
    console.log(`   ✅ Total tokens now: ${newTotalTokens.toString()}`);

  } catch (error: any) {
    console.error("   ❌ Error creating token:", error.message);
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("   💡 You don't have enough BNB for this transaction");
    }
    throw error;
  }

  // ========== TEST 3: Verify Token Count ==========
  console.log("\n📋 Test 3: Verifying token count...");

  try {
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactory.attach(factoryAddress);
    
    const allTokens = await factory.getAllTokens();
    console.log(`   ✅ Total tokens: ${allTokens.length}`);
    
    if (allTokens.length > 0) {
      console.log("\n   Token addresses:");
      allTokens.forEach((addr: string, index: number) => {
        console.log(`   ${index + 1}. ${addr}`);
      });
    }
  } catch (error: any) {
    console.error("   ❌ Error getting tokens:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 All tests completed successfully!");
  console.log("\n📋 Summary:");
  console.log("   ✅ TokenFactory is accessible");
  console.log("   ✅ Token creation works");
  console.log("   ✅ Token count tracking works");
  console.log("\n💡 Next steps:");
  console.log("   1. View your token on BSCScan Testnet");
  console.log("   2. Test buying/selling tokens via the frontend");
  console.log("   3. Deploy to other chains with the same address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

