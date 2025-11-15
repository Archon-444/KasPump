import hre from "hardhat";
import { readFileSync } from "fs";
import { execSync } from "child_process";

const { ethers } = hre;

interface DeploymentInfo {
  name: string;
  contracts: {
    TokenFactory?: string;
    FeeRecipient?: string;
    DeterministicDeployer?: string;
  };
  deployedAt: string | null;
  deployer?: string;
  blockNumber?: number;
  isDeterministic?: boolean;
}

interface VerificationResult {
  chainId: string;
  network: string;
  success: boolean;
  factoryDeployed: boolean;
  factoryAccessible: boolean;
  ownerVerified: boolean;
  explorerUrl: string;
  error?: string;
}

const NETWORK_NAMES: Record<string, string> = {
  "56": "bsc",
  "97": "bscTestnet",
  "8453": "base",
  "84532": "baseSepolia",
  "42161": "arbitrum",
  "421614": "arbitrumSepolia",
};

const EXPLORER_URLS: Record<string, string> = {
  "97": "https://testnet.bscscan.com/address",
  "56": "https://bscscan.com/address",
  "421614": "https://sepolia.arbiscan.io/address",
  "42161": "https://arbiscan.io/address",
  "84532": "https://sepolia.basescan.org/address",
  "8453": "https://basescan.org/address",
};

async function verifyNetwork(
  chainId: string,
  deployment: DeploymentInfo
): Promise<VerificationResult> {
  const result: VerificationResult = {
    chainId,
    network: deployment.name,
    success: false,
    factoryDeployed: false,
    factoryAccessible: false,
    ownerVerified: false,
    explorerUrl: "",
  };

  try {
    const factoryAddress = deployment.contracts?.TokenFactory;

    if (!factoryAddress || factoryAddress === "") {
      result.error = "TokenFactory not deployed";
      return result;
    }

    result.factoryDeployed = true;
    result.explorerUrl = `${EXPLORER_URLS[chainId]}/${factoryAddress}`;

    // Check if we can access this network
    const networkName = NETWORK_NAMES[chainId];
    if (!networkName) {
      result.error = "Network configuration not found";
      return result;
    }

    // Try to get the contract instance
    try {
      const TokenFactory = await ethers.getContractFactory("TokenFactory");
      const factory = TokenFactory.attach(factoryAddress);

      // Try to read owner
      const owner = await factory.owner();
      result.factoryAccessible = true;
      result.ownerVerified = owner === deployment.deployer;

      result.success = true;
    } catch (error: any) {
      result.factoryAccessible = false;
      result.error = `Contract not accessible: ${error.message}`;
    }

    return result;
  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}

async function main() {
  console.log("\n🔍 Batch Verification: All KasPump Deployments");
  console.log("=".repeat(80));

  // Read deployments
  let deployments: Record<string, DeploymentInfo> = {};
  try {
    const deploymentData = readFileSync("./deployments.json", "utf-8");
    deployments = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Could not read deployments.json");
    process.exit(1);
  }

  const results: VerificationResult[] = [];

  // Verify each network
  for (const [chainId, deployment] of Object.entries(deployments)) {
    console.log(`\n📡 Verifying ${deployment.name} (Chain ID: ${chainId})...`);

    const result = await verifyNetwork(chainId, deployment);
    results.push(result);

    if (result.success) {
      console.log("   ✅ Verification successful");
      console.log(`   📍 Factory: ${deployment.contracts.TokenFactory}`);
      console.log(`   🔗 Explorer: ${result.explorerUrl}`);
    } else if (!result.factoryDeployed) {
      console.log("   ⏸️  Not deployed yet");
    } else {
      console.log(`   ❌ Verification failed: ${result.error}`);
    }
  }

  // Summary Report
  console.log("\n" + "=".repeat(80));
  console.log("📊 DEPLOYMENT STATUS SUMMARY");
  console.log("=".repeat(80));

  const deployed = results.filter((r) => r.factoryDeployed);
  const verified = results.filter((r) => r.success);
  const failed = results.filter((r) => r.factoryDeployed && !r.success);
  const notDeployed = results.filter((r) => !r.factoryDeployed);

  console.log(`\n📈 Overall Status:`);
  console.log(`   Total Networks: ${results.length}`);
  console.log(`   ✅ Deployed & Verified: ${verified.length}`);
  console.log(`   ❌ Deployed but Failed: ${failed.length}`);
  console.log(`   ⏸️  Not Deployed: ${notDeployed.length}`);

  // Mainnets vs Testnets
  const mainnets = ["56", "8453", "42161"];
  const mainnetDeployed = results.filter(
    (r) => mainnets.includes(r.chainId) && r.factoryDeployed
  );
  const testnetDeployed = results.filter(
    (r) => !mainnets.includes(r.chainId) && r.factoryDeployed
  );

  console.log(`\n🌐 Network Breakdown:`);
  console.log(`   Mainnets Deployed: ${mainnetDeployed.length}/3`);
  console.log(`   Testnets Deployed: ${testnetDeployed.length}/3`);

  // Detailed Results Table
  console.log(`\n📋 Detailed Results:`);
  console.log("─".repeat(80));
  console.log(
    "Chain ID".padEnd(10) +
      "Network".padEnd(20) +
      "Status".padEnd(12) +
      "Factory Address"
  );
  console.log("─".repeat(80));

  results.forEach((r) => {
    const status = r.success
      ? "✅ Verified"
      : r.factoryDeployed
      ? "❌ Failed"
      : "⏸️  Pending";
    const factory =
      deployments[r.chainId]?.contracts?.TokenFactory || "Not deployed";

    console.log(
      r.chainId.padEnd(10) +
        r.network.padEnd(20) +
        status.padEnd(12) +
        factory
    );
  });
  console.log("─".repeat(80));

  // Failed Deployments Details
  if (failed.length > 0) {
    console.log(`\n⚠️  Failed Verifications:`);
    failed.forEach((r) => {
      console.log(`   ${r.network} (${r.chainId}): ${r.error}`);
    });
  }

  // Pending Deployments
  if (notDeployed.length > 0) {
    console.log(`\n📝 Pending Deployments:`);
    notDeployed.forEach((r) => {
      const networkName = NETWORK_NAMES[r.chainId];
      console.log(`   ${r.network} (${r.chainId})`);
      if (networkName) {
        console.log(
          `      Run: npm run deploy:deterministic:${networkName.replace(
            /([A-Z])/g,
            "-$1"
          ).toLowerCase()}`
        );
      }
    });
  }

  // Success Recommendations
  console.log(`\n💡 Recommendations:`);

  if (verified.length === results.length) {
    console.log("   🎉 All deployments verified! System is ready for production.");
  } else if (verified.length > 0) {
    console.log(
      `   ✅ ${verified.length}/${results.length} networks verified and ready to use`
    );
    if (notDeployed.length > 0) {
      console.log(
        `   📝 Deploy to ${notDeployed.length} remaining network(s) for full multi-chain support`
      );
    }
    if (failed.length > 0) {
      console.log(
        `   🔧 Fix ${failed.length} failed deployment(s) by checking RPC connectivity`
      );
    }
  } else {
    console.log(
      "   🚀 Start by deploying to a testnet: npm run deploy:deterministic:bsc-testnet"
    );
  }

  // Explorer Links
  console.log(`\n🔗 Explorer Links:`);
  verified.forEach((r) => {
    console.log(`   ${r.network}: ${r.explorerUrl}`);
  });

  console.log("\n" + "=".repeat(80));

  // Exit code based on results
  if (failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main()
  .then(() => {})
  .catch((error) => {
    console.error("\n❌ Batch verification failed:", error);
    process.exit(1);
  });
