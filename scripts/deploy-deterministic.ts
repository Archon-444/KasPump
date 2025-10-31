import hre from "hardhat";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const { ethers, network } = hre;

/**
 * Deterministic Multi-Chain Deployment Script
 *
 * CRITICAL: This script deploys contracts to the SAME ADDRESS on all chains
 *
 * Usage:
 *   npm run deploy:bsc -- --deterministic
 *   npm run deploy:arbitrum -- --deterministic
 *   npm run deploy:base -- --deterministic
 *
 * All three commands will deploy to the SAME factory address!
 */

// CRITICAL: This salt MUST be the same across all deployments
// Change this only if you want completely different addresses
const DEPLOYMENT_SALT = process.env.DEPLOYMENT_SALT ||
    "0x4b617350756d704d756c7469436861696e4c61756e636865723230323500"; // "KasPumpMultiChainLauncher2025"

const CHAIN_CONFIGS = {
    bsc: { chainId: 56, name: "BNB Smart Chain" },
    bscTestnet: { chainId: 97, name: "BSC Testnet" },
    arbitrum: { chainId: 42161, name: "Arbitrum One" },
    arbitrumSepolia: { chainId: 421614, name: "Arbitrum Sepolia" },
    base: { chainId: 8453, name: "Base" },
    baseSepolia: { chainId: 84532, name: "Base Sepolia" },
};

async function main() {
    const networkName = network.name;
    const chainConfig = CHAIN_CONFIGS[networkName as keyof typeof CHAIN_CONFIGS];

    if (!chainConfig) {
        throw new Error(`Unsupported network: ${networkName}`);
    }

    console.log("\n🔷 DETERMINISTIC MULTI-CHAIN DEPLOYMENT 🔷");
    console.log("============================================\n");
    console.log(`📡 Network: ${chainConfig.name} (${chainConfig.chainId})`);
    console.log(`🔑 Deployment Salt: ${DEPLOYMENT_SALT}\n`);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "\n");

    // ========== STEP 1: Deploy DeterministicDeployer ==========

    console.log("📄 Step 1: Deploying DeterministicDeployer...");

    const DeterministicDeployer = await ethers.getContractFactory("DeterministicDeployer");
    const deterministicDeployer = await DeterministicDeployer.deploy();
    await deterministicDeployer.waitForDeployment();

    const deployerAddress = await deterministicDeployer.getAddress();
    console.log("✅ DeterministicDeployer deployed to:", deployerAddress);

    // WARNING: DeterministicDeployer address will be DIFFERENT on each chain
    // because it's deployed normally (not via CREATE2)
    // Only TokenFactory will have the same address across chains

    // ========== STEP 2: Compute Expected Factory Address ==========

    console.log("\n📄 Step 2: Computing expected TokenFactory address...");

    const expectedFactoryAddress = await deterministicDeployer.computeTokenFactoryAddress(
        DEPLOYMENT_SALT,
        deployer.address // fee recipient
    );

    console.log("🎯 Expected TokenFactory address:", expectedFactoryAddress);
    console.log("   This address will be IDENTICAL on all chains!\n");

    // ========== STEP 3: Deploy TokenFactory Deterministically ==========

    console.log("📄 Step 3: Deploying TokenFactory via CREATE2...");

    const tx = await deterministicDeployer.deployTokenFactory(
        deployer.address, // fee recipient
        DEPLOYMENT_SALT
    );

    const receipt = await tx.wait();
    console.log("✅ TokenFactory deployed!");

    // ========== STEP 4: Verify Deployment ==========

    console.log("\n📄 Step 4: Verifying deployment...");

    const factoryAddress = await deterministicDeployer.deployedContracts(
        ethers.keccak256(
            ethers.solidityPacked(
                ["bytes32", "string", "string"],
                [DEPLOYMENT_SALT, "TokenFactory", "v1.0.0"]
            )
        )
    );

    if (factoryAddress !== expectedFactoryAddress) {
        throw new Error("Deployment verification failed! Address mismatch.");
    }

    console.log("✅ Verification passed!");
    console.log("   Deployed address:", factoryAddress);
    console.log("   Expected address:", expectedFactoryAddress);

    // ========== STEP 5: Test Factory ==========

    console.log("\n📄 Step 5: Testing TokenFactory...");

    const TokenFactory = await ethers.getContractAt("TokenFactory", factoryAddress);

    const owner = await TokenFactory.owner();
    const feeRecipient = await TokenFactory.feeRecipient();
    const isPaused = await TokenFactory.paused();

    console.log("   Owner:", owner);
    console.log("   Fee Recipient:", feeRecipient);
    console.log("   Paused:", isPaused);

    // ========== STEP 6: Save Deployment Info ==========

    console.log("\n📄 Step 6: Saving deployment info...");

    const deploymentsPath = "./deployments";
    if (!existsSync(deploymentsPath)) {
        mkdirSync(deploymentsPath, { recursive: true });
    }

    // Update global deployments.json
    const globalDeploymentsPath = "./deployments.json";
    let globalDeployments: any = {};

    if (existsSync(globalDeploymentsPath)) {
        globalDeployments = JSON.parse(readFileSync(globalDeploymentsPath, "utf-8"));
    }

    globalDeployments[chainConfig.chainId] = {
        name: chainConfig.name,
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

    writeFileSync(globalDeploymentsPath, JSON.stringify(globalDeployments, null, 2));

    // Save detailed deployment info
    const detailedInfo = {
        network: networkName,
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        timestamp: new Date().toISOString(),
        contracts: {
            DeterministicDeployer: {
                address: deployerAddress,
                note: "This address is DIFFERENT on each chain (normal deployment)"
            },
            TokenFactory: {
                address: factoryAddress,
                owner: owner,
                feeRecipient: feeRecipient,
                note: "This address is IDENTICAL on all chains (CREATE2 deployment)"
            }
        },
        deployer: {
            address: deployer.address,
            balance: ethers.formatEther(balance)
        },
        deployment: {
            salt: DEPLOYMENT_SALT,
            expectedAddress: expectedFactoryAddress,
            actualAddress: factoryAddress,
            verified: factoryAddress === expectedFactoryAddress,
        },
        gasUsed: receipt?.gasUsed.toString(),
        blockNumber: receipt?.blockNumber,
    };

    const detailedPath = `${deploymentsPath}/deployment-${networkName}-${Date.now()}.json`;
    writeFileSync(detailedPath, JSON.stringify(detailedInfo, null, 2));

    // ========== FINAL SUMMARY ==========

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("========================\n");
    console.log("📍 Addresses:");
    console.log(`   DeterministicDeployer: ${deployerAddress}`);
    console.log(`   TokenFactory: ${factoryAddress} ⭐ SAME ON ALL CHAINS`);
    console.log(`\n💾 Deployment info saved to:`);
    console.log(`   Global: ${globalDeploymentsPath}`);
    console.log(`   Detailed: ${detailedPath}`);

    console.log("\n📋 Next Steps:");
    console.log("1. Deploy to other chains with the SAME salt:");
    console.log(`   npm run deploy:arbitrum -- --deterministic`);
    console.log(`   npm run deploy:base -- --deterministic`);
    console.log("2. Verify factory address is identical on all chains");
    console.log("3. Update .env.local with factory addresses");
    console.log("\n⚠️  IMPORTANT: All deployments MUST use the same DEPLOYMENT_SALT!");
    console.log(`   Current salt: ${DEPLOYMENT_SALT}\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
