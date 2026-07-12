import hre from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

const { ethers, network } = hre;

// Network names mapped to chain IDs
const NETWORK_CHAIN_IDS: Record<string, number> = {
  bsc: 56,
  bscTestnet: 97,
  arbitrum: 42161,
  arbitrumSepolia: 421614,
  base: 8453,
  baseSepolia: 84532,
};

// Network display names
const NETWORK_NAMES: Record<string, string> = {
  bsc: "BNB Smart Chain",
  bscTestnet: "BNB Smart Chain Testnet",
  arbitrum: "Arbitrum One",
  arbitrumSepolia: "Arbitrum Sepolia",
  base: "Base",
  baseSepolia: "Base Sepolia",
};

async function main() {
  const networkName = network.name;
  const chainId = NETWORK_CHAIN_IDS[networkName];
  const displayName = NETWORK_NAMES[networkName] || networkName;

  console.log(`🚀 Deploying KasPump contracts to ${displayName}...`);
  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // Deploy DexRouterRegistry
  console.log("\n📄 Deploying DexRouterRegistry...");
  const DexRouterRegistry = await ethers.getContractFactory("DexRouterRegistry");
  const dexRouterRegistry = await DexRouterRegistry.deploy();
  await dexRouterRegistry.waitForDeployment();
  const registryAddress = await dexRouterRegistry.getAddress();
  console.log("✅ DexRouterRegistry deployed to:", registryAddress);

  // Deploy TokenFactory
  console.log("\n📄 Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");

  // Use deployer as initial fee recipient (can be changed later)
  const tokenFactory = await TokenFactory.deploy(deployer.address);
  await tokenFactory.waitForDeployment();

  const factoryAddress = await tokenFactory.getAddress();
  console.log("✅ TokenFactory deployed to:", factoryAddress);

  // Deploy AMMDeployer (holds the BondingCurveAMM creation bytecode so the
  // factory stays under the EIP-170 24576-byte limit)
  console.log("\n📄 Deploying AMMDeployer...");
  const AMMDeployer = await ethers.getContractFactory("AMMDeployer");
  const ammDeployer = await AMMDeployer.deploy();
  await ammDeployer.waitForDeployment();
  const ammDeployerAddress = await ammDeployer.getAddress();
  console.log("✅ AMMDeployer deployed to:", ammDeployerAddress);

  // Configure registry + AMM deployer
  console.log("\n🔧 Configuring DexRouterRegistry on TokenFactory...");
  await tokenFactory.updateDexRouterRegistry(registryAddress);
  console.log("✅ DexRouterRegistry configured");

  console.log("\n🔧 Configuring AMMDeployer on TokenFactory...");
  await tokenFactory.setAmmDeployer(ammDeployerAddress);
  console.log("✅ AMMDeployer configured");

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await tokenFactory.owner();
  const feeRecipient = await tokenFactory.feeRecipient();

  console.log("Factory owner:", owner);
  console.log("Fee recipient:", feeRecipient);

  // DEX Integration info
  console.log("\n🔄 DEX Integration:");
  console.log(`✅ Chain: ${displayName} (Chain ID: ${chainId})`);
  console.log(`✅ Automatic DEX liquidity provision enabled`);
  console.log(`✅ Graduation split: 70% DEX liquidity, 20% creator, 10% platform`);
  console.log(`✅ LP tokens locked for 6 months after graduation`);
  console.log(`✅ Chain-specific DEX router auto-configured via DexRouterRegistry`);

  // Update deployments.json
  console.log("\n📝 Updating deployments.json...");
  const deploymentsPath = "./deployments.json";
  let deployments: any = {};

  if (existsSync(deploymentsPath)) {
    deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
  }

  deployments[chainId] = {
    name: displayName,
    contracts: {
      TokenFactory: factoryAddress,
      AMMDeployer: ammDeployerAddress,
      DexRouterRegistry: registryAddress,
      FeeRecipient: feeRecipient,
    },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ deployments.json updated");

  // Save detailed deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      TokenFactory: {
        address: factoryAddress,
        owner: owner,
        feeRecipient: feeRecipient
      },
      AMMDeployer: {
        address: ammDeployerAddress
      },
      DexRouterRegistry: {
        address: registryAddress
      }
    },
    deployer: {
      address: deployer.address,
      balance: ethers.formatEther(balance)
    }
  };

  const deploymentFile = `deployments/deployment-${networkName}-${Date.now()}.json`;
  writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log(`   Network: ${displayName} (${chainId})`);
  console.log(`   TokenFactory: ${factoryAddress}`);
  console.log(`   FeeRecipient: ${feeRecipient}`);
  console.log(`   Deployer: ${deployer.address}`);

  console.log("\n⚠️  Next steps:");
  console.log("1. Update your .env.local with the contract addresses");
  console.log(`2. Set NEXT_PUBLIC_${networkName.toUpperCase()}_TOKEN_FACTORY=${factoryAddress}`);
  console.log(`3. Set NEXT_PUBLIC_${networkName.toUpperCase()}_FEE_RECIPIENT=${feeRecipient}`);
  console.log("4. Verify contracts on block explorer if needed");
  console.log("5. Test token creation before going live");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
