import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const TOKEN_FACTORY_ABI = [
  "function getAllTokens() external view returns (address[])",
  "function getTotalTokens() external view returns (uint256)"
];

// Public RPC endpoints for supported chains
const CHAIN_RPC_URLS: Record<number, string> = {
  56: "https://bsc-dataseed1.binance.org", // BSC Mainnet
  97: "https://data-seed-prebsc-1-s1.binance.org:8545", // BSC Testnet
  42161: "https://arb1.arbitrum.io/rpc", // Arbitrum One
  421614: "https://sepolia-rollup.arbitrum.io/rpc", // Arbitrum Sepolia
  8453: "https://mainnet.base.org", // Base Mainnet
  84532: "https://sepolia.base.org", // Base Sepolia
};

const CHAIN_NAMES: Record<number, string> = {
  56: "BNB Smart Chain",
  97: "BSC Testnet",
  42161: "Arbitrum One",
  421614: "Arbitrum Sepolia",
  8453: "Base",
  84532: "Base Sepolia",
};

async function checkTokenCount(chainId: number, factoryAddress: string, rpcUrl?: string): Promise<number> {
  const providerRpcUrl = rpcUrl || CHAIN_RPC_URLS[chainId];
  if (!providerRpcUrl) {
    throw new Error(`No RPC URL available for chain ${chainId}`);
  }

  const provider = new ethers.JsonRpcProvider(providerRpcUrl);
  const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

  // Try getTotalTokens first (more efficient)
  try {
    const count = await factoryContract.getTotalTokens();
    return Number(count);
  } catch {
    // Fallback to getAllTokens().length if getTotalTokens doesn't exist
    const allTokens = await factoryContract.getAllTokens();
    return allTokens.length;
  }
}

async function main() {
  // Try to get from environment variables first
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  const factoryAddress = process.env.TOKEN_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

  // If single chain specified, check that
  if (rpcUrl && factoryAddress) {
    console.log("🔍 Querying TokenFactory contract...");
    console.log("   Factory Address:", factoryAddress);
    console.log("   RPC URL:", rpcUrl.replace(/\/\/.*@/, '//***@')); // Hide credentials in URL

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

      // Try getTotalTokens first (more efficient)
      let tokenCount: bigint;
      try {
        tokenCount = await factoryContract.getTotalTokens();
      } catch {
        // Fallback to getAllTokens().length if getTotalTokens doesn't exist
        const allTokens = await factoryContract.getAllTokens();
        tokenCount = BigInt(allTokens.length);
      }

      console.log("\n✅ Current Token Count:", tokenCount.toString());
      
      // Also get the actual list to show details
      try {
        const allTokens = await factoryContract.getAllTokens();
        console.log(`   Total tokens in array: ${allTokens.length}`);
        
        if (allTokens.length > 0) {
          console.log("\n📋 Token Addresses:");
          allTokens.forEach((address: string, index: number) => {
            console.log(`   ${index + 1}. ${address}`);
          });
        } else {
          console.log("\n   No tokens have been created yet.");
        }
      } catch (error) {
        console.log("   (Could not retrieve token list)");
      }

      return;
    } catch (error: any) {
      console.error("\n❌ Error querying contract:", error.message);
      if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
        console.error("   Check that your RPC URL is correct and accessible");
      } else if (error.code === "CALL_EXCEPTION") {
        console.error("   Check that the factory address is correct and the contract is deployed");
      }
      process.exit(1);
    }
  }

  // Otherwise, check all configured chains
  console.log("🔍 Checking token count across all configured chains...\n");

  let totalTokens = 0;
  let checkedChains = 0;

  // Read contract addresses from config
  let contractAddresses: Record<string, any> = {};
  try {
    const contractsPath = join(__dirname, "../src/config/contracts.ts");
    const contractsContent = readFileSync(contractsPath, "utf-8");
    // Extract contract addresses from the file (simple regex approach)
    // For now, let's check deployments.json instead
  } catch (e) {
    // Fallback: try deployments.json
  }

  // Try deployments.json
  try {
    const deploymentsPath = join(__dirname, "../deployments.json");
    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    contractAddresses = deployments;
  } catch (e) {
    // If that fails, use empty object
  }

  for (const [chainIdStr, data] of Object.entries(contractAddresses)) {
    const chainId = parseInt(chainIdStr);
    const factoryAddr = (data as any)?.contracts?.TokenFactory || (data as any)?.TokenFactory;

    if (!factoryAddr) {
      console.log(`⏭️  ${CHAIN_NAMES[chainId] || `Chain ${chainId}`}: No factory address configured`);
      continue;
    }

    try {
      const count = await checkTokenCount(chainId, factoryAddr);
      console.log(`✅ ${CHAIN_NAMES[chainId] || `Chain ${chainId}`}: ${count} tokens`);
      totalTokens += count;
      checkedChains++;
    } catch (error: any) {
      console.log(`❌ ${CHAIN_NAMES[chainId] || `Chain ${chainId}`}: Error - ${error.message}`);
    }
  }

  if (checkedChains === 0) {
    console.log("\n❌ No factory addresses found in configuration.");
    console.log("\nTo check a specific chain, use:");
    console.log("  RPC_URL=<rpc_url> TOKEN_FACTORY_ADDRESS=<factory_address> npx ts-node scripts/check-token-count.ts");
    console.log("\nOr set NEXT_PUBLIC_RPC_URL and NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS in your .env file");
    process.exit(1);
  }

  console.log(`\n📊 Total tokens across all chains: ${totalTokens}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

