/**
 * Deploy All KasPump Contracts
 *
 * Deploys the complete contract suite:
 * - TokenFactory (core)
 * - ReferralRegistry
 * - BadgeRegistry
 * - LPFarming
 * - CrossChainBridge
 * - LimitOrderBook
 * - StopLossOrderBook
 * - CopyTradeRegistry
 *
 * Usage:
 *   npx hardhat run scripts/deploy-all.ts --network bscTestnet
 *   npx hardhat run scripts/deploy-all.ts --network bsc
 */

import hre from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

const { ethers, network } = hre;

// Network configuration
const NETWORK_CONFIG: Record<string, { chainId: number; name: string }> = {
  bsc: { chainId: 56, name: "BNB Smart Chain" },
  bscTestnet: { chainId: 97, name: "BNB Smart Chain Testnet" },
  arbitrum: { chainId: 42161, name: "Arbitrum One" },
  arbitrumSepolia: { chainId: 421614, name: "Arbitrum Sepolia" },
  base: { chainId: 8453, name: "Base" },
  baseSepolia: { chainId: 84532, name: "Base Sepolia" },
};

interface DeployedContracts {
  TokenFactory?: string;
  ReferralRegistry?: string;
  BadgeRegistry?: string;
  LPFarming?: string;
  CrossChainBridge?: string;
  LimitOrderBook?: string;
  StopLossOrderBook?: string;
  CopyTradeRegistry?: string;
}

async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🚀 KasPump Full Contract Deployment");
  console.log("=".repeat(60));
  console.log(`📡 Network: ${config.name} (Chain ID: ${config.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} native tokens`);

  if (balance === 0n) {
    throw new Error("Deployer has no funds! Please fund the wallet first.");
  }

  const deployed: DeployedContracts = {};
  let totalGasUsed = 0n;

  // ============ 1. Deploy TokenFactory (Core) ============
  console.log("\n📦 [1/8] Deploying TokenFactory...");
  try {
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(deployer.address);
    await tokenFactory.waitForDeployment();
    deployed.TokenFactory = await tokenFactory.getAddress();
    const receipt = await tokenFactory.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ TokenFactory: ${deployed.TokenFactory}`);
  } catch (error) {
    console.error("   ❌ TokenFactory deployment failed:", error);
    throw error;
  }

  // ============ 2. Deploy ReferralRegistry ============
  console.log("\n📦 [2/8] Deploying ReferralRegistry...");
  try {
    const ReferralRegistry = await ethers.getContractFactory("ReferralRegistry");
    const referralRegistry = await ReferralRegistry.deploy();
    await referralRegistry.waitForDeployment();
    deployed.ReferralRegistry = await referralRegistry.getAddress();
    const receipt = await referralRegistry.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ ReferralRegistry: ${deployed.ReferralRegistry}`);
  } catch (error) {
    console.error("   ❌ ReferralRegistry deployment failed:", error);
  }

  // ============ 3. Deploy BadgeRegistry ============
  console.log("\n📦 [3/8] Deploying BadgeRegistry...");
  try {
    const BadgeRegistry = await ethers.getContractFactory("BadgeRegistry");
    const badgeRegistry = await BadgeRegistry.deploy();
    await badgeRegistry.waitForDeployment();
    deployed.BadgeRegistry = await badgeRegistry.getAddress();
    const receipt = await badgeRegistry.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ BadgeRegistry: ${deployed.BadgeRegistry}`);
  } catch (error) {
    console.error("   ❌ BadgeRegistry deployment failed:", error);
  }

  // ============ 4. Deploy LPFarming ============
  console.log("\n📦 [4/8] Deploying LPFarming...");
  try {
    const LPFarming = await ethers.getContractFactory("LPFarming");
    const lpFarming = await LPFarming.deploy();
    await lpFarming.waitForDeployment();
    deployed.LPFarming = await lpFarming.getAddress();
    const receipt = await lpFarming.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ LPFarming: ${deployed.LPFarming}`);
  } catch (error) {
    console.error("   ❌ LPFarming deployment failed:", error);
  }

  // ============ 5. Deploy CrossChainBridge ============
  console.log("\n📦 [5/8] Deploying CrossChainBridge...");
  try {
    const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    const bridge = await CrossChainBridge.deploy(deployer.address);
    await bridge.waitForDeployment();
    deployed.CrossChainBridge = await bridge.getAddress();
    const receipt = await bridge.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ CrossChainBridge: ${deployed.CrossChainBridge}`);
  } catch (error) {
    console.error("   ❌ CrossChainBridge deployment failed:", error);
  }

  // ============ 6. Deploy LimitOrderBook ============
  console.log("\n📦 [6/8] Deploying LimitOrderBook...");
  try {
    const LimitOrderBook = await ethers.getContractFactory("LimitOrderBook");
    const limitOrderBook = await LimitOrderBook.deploy();
    await limitOrderBook.waitForDeployment();
    deployed.LimitOrderBook = await limitOrderBook.getAddress();
    const receipt = await limitOrderBook.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ LimitOrderBook: ${deployed.LimitOrderBook}`);
  } catch (error) {
    console.error("   ❌ LimitOrderBook deployment failed:", error);
  }

  // ============ 7. Deploy StopLossOrderBook ============
  console.log("\n📦 [7/8] Deploying StopLossOrderBook...");
  try {
    const StopLossOrderBook = await ethers.getContractFactory("StopLossOrderBook");
    const stopLossOrderBook = await StopLossOrderBook.deploy();
    await stopLossOrderBook.waitForDeployment();
    deployed.StopLossOrderBook = await stopLossOrderBook.getAddress();
    const receipt = await stopLossOrderBook.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ StopLossOrderBook: ${deployed.StopLossOrderBook}`);
  } catch (error) {
    console.error("   ❌ StopLossOrderBook deployment failed:", error);
  }

  // ============ 8. Deploy CopyTradeRegistry ============
  console.log("\n📦 [8/8] Deploying CopyTradeRegistry...");
  try {
    const CopyTradeRegistry = await ethers.getContractFactory("CopyTradeRegistry");
    const copyTradeRegistry = await CopyTradeRegistry.deploy();
    await copyTradeRegistry.waitForDeployment();
    deployed.CopyTradeRegistry = await copyTradeRegistry.getAddress();
    const receipt = await copyTradeRegistry.deploymentTransaction()?.wait();
    totalGasUsed += receipt?.gasUsed || 0n;
    console.log(`   ✅ CopyTradeRegistry: ${deployed.CopyTradeRegistry}`);
  } catch (error) {
    console.error("   ❌ CopyTradeRegistry deployment failed:", error);
  }

  // ============ Save Deployments ============
  console.log("\n📝 Saving deployment addresses...");
  const deploymentsPath = "./deployments.json";
  let deployments: Record<string, any> = {};

  if (existsSync(deploymentsPath)) {
    deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
  }

  deployments[config.chainId] = {
    name: config.name,
    network: networkName,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployed,
  };

  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`   ✅ Saved to ${deploymentsPath}`);

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${config.name}`);
  console.log(`Chain ID: ${config.chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
  console.log("\nDeployed Contracts:");

  Object.entries(deployed).forEach(([name, address]) => {
    if (address) {
      console.log(`  ${name}: ${address}`);
    }
  });

  const successCount = Object.values(deployed).filter(Boolean).length;
  console.log(`\n✅ Successfully deployed ${successCount}/8 contracts`);

  // ============ Next Steps ============
  console.log("\n" + "=".repeat(60));
  console.log("📋 NEXT STEPS");
  console.log("=".repeat(60));
  console.log("1. Verify contracts on block explorer:");
  console.log(`   npx hardhat verify --network ${networkName} <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>`);
  console.log("\n2. Update frontend environment variables:");
  console.log(`   NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${deployed.TokenFactory}`);
  console.log(`   NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS=${deployed.ReferralRegistry}`);
  console.log("\n3. Configure contract permissions if needed");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
