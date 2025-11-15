import hre from "hardhat";
import { readFileSync } from "fs";

const { ethers, network } = hre;

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 4,
  retryDelay: 2000,
  exponentialBackoff: true,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyContractWithRetry(
  factoryAddress: string,
  config: RetryConfig = DEFAULT_CONFIG
): Promise<boolean> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < config.maxRetries) {
    attempt++;
    const delay = config.exponentialBackoff
      ? config.retryDelay * Math.pow(2, attempt - 1)
      : config.retryDelay;

    try {
      console.log(`   Attempt ${attempt}/${config.maxRetries}...`);

      const TokenFactory = await ethers.getContractFactory("TokenFactory");
      const factory = TokenFactory.attach(factoryAddress);

      // Try to read basic info
      const owner = await factory.owner();
      const feeRecipient = await factory.feeRecipient();
      const isPaused = await factory.paused();

      console.log(`   ✅ Success! Contract is accessible`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Fee Recipient: ${feeRecipient}`);
      console.log(`   Paused: ${isPaused}`);

      // Try to get token count
      try {
        const allTokens = await factory.getAllTokens();
        console.log(`   Token count: ${allTokens.length}`);
      } catch (e: any) {
        try {
          const totalTokens = await factory.getTotalTokens();
          console.log(`   Total tokens: ${totalTokens.toString()}`);
        } catch (err) {
          console.log(`   ⚠️  Token count unavailable`);
        }
      }

      return true;
    } catch (error: any) {
      lastError = error;
      console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < config.maxRetries) {
        console.log(`   ⏳ Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }

  console.log(`\n   ❌ All ${config.maxRetries} attempts failed`);
  if (lastError) {
    console.log(`   Last error: ${lastError.message}`);
  }

  return false;
}

async function main() {
  console.log("\n🔄 Auto-Retry Contract Verification");
  console.log("=".repeat(60));

  // Read deployment info
  let deployments: any = {};
  try {
    const deploymentData = readFileSync("./deployments.json", "utf-8");
    deployments = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Could not read deployments.json");
    process.exit(1);
  }

  const networkName = network.name;

  // Get chain ID from network name
  let chainId: number;
  const chainIdMap: Record<string, number> = {
    bscTestnet: 97,
    bsc: 56,
    arbitrumSepolia: 421614,
    arbitrum: 42161,
    baseSepolia: 84532,
    base: 8453,
  };

  chainId = chainIdMap[networkName];

  if (!chainId) {
    console.error(`❌ Unknown network: ${networkName}`);
    console.log("\nSupported networks:");
    Object.keys(chainIdMap).forEach((name) => {
      console.log(`   - ${name}`);
    });
    process.exit(1);
  }

  if (!deployments[chainId.toString()]) {
    console.error(`❌ No deployment found for chain ID ${chainId}`);
    process.exit(1);
  }

  const deployment = deployments[chainId.toString()];
  const factoryAddress = deployment.contracts?.TokenFactory;

  if (!factoryAddress || factoryAddress === "") {
    console.error("❌ TokenFactory address not found or empty");
    console.log("\n💡 Deploy first:");
    console.log(`   npm run deploy:deterministic:${networkName}`);
    process.exit(1);
  }

  console.log(`\n📡 Network: ${deployment.name} (Chain ID: ${chainId})`);
  console.log(`📍 TokenFactory: ${factoryAddress}`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`📅 Deployed: ${deployment.deployedAt}`);

  // Check signer
  let signer;
  try {
    const signers = await ethers.getSigners();
    signer = signers[0];
    console.log(`\n🔐 Using account: ${signer.address}`);
    const balance = await ethers.provider.getBalance(signer.address);
    const nativeToken = networkName.includes("BSC") || networkName.includes("BNB")
      ? "BNB"
      : "ETH";
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ${nativeToken}`);
  } catch (error) {
    console.log(`\n⚠️  No signer available (read-only mode)`);
  }

  // Configure retry settings
  const config: RetryConfig = {
    maxRetries: parseInt(process.env.VERIFY_MAX_RETRIES || "4"),
    retryDelay: parseInt(process.env.VERIFY_RETRY_DELAY || "2000"),
    exponentialBackoff: process.env.VERIFY_BACKOFF !== "false",
  };

  console.log(`\n⚙️  Retry Configuration:`);
  console.log(`   Max Retries: ${config.maxRetries}`);
  console.log(`   Initial Delay: ${config.retryDelay}ms`);
  console.log(`   Exponential Backoff: ${config.exponentialBackoff}`);

  // Perform verification with retries
  console.log(`\n🔍 Starting Verification with Auto-Retry...`);
  const success = await verifyContractWithRetry(factoryAddress, config);

  // Explorer link
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
    console.log(`\n🔗 View on explorer: ${explorerUrl}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));

  if (success) {
    console.log("✅ Verification Successful!");
    console.log("\n💡 Next Steps:");
    console.log("   1. Update .env.local with contract address");
    console.log("   2. Verify on block explorer (optional)");
    console.log("   3. Test through frontend");

    process.exit(0);
  } else {
    console.log("❌ Verification Failed After All Retries");
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check RPC URL in hardhat.config.ts");
    console.log("   2. Verify network connection");
    console.log("   3. Check if contract is actually deployed on explorer");
    console.log("   4. Try increasing retry attempts: VERIFY_MAX_RETRIES=10");

    process.exit(1);
  }
}

main()
  .then(() => {})
  .catch((error) => {
    console.error("\n❌ Verification script failed:", error);
    process.exit(1);
  });
