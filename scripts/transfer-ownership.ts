/**
 * Transfer contract ownership to a Gnosis Safe.
 *
 * Run AFTER deployment to transfer all three contracts to the Safe.
 * This is MANDATORY before mainnet launch — see TECHNICAL_DEBT.md #1.
 *
 * Prerequisites:
 * 1. Create a Gnosis Safe at https://app.safe.global (2-of-3 or 3-of-5,
 *    hardware-backed keys distinct from the deployer EOA).
 * 2. Set SAFE_OWNER_ADDRESS in .env.local
 * 3. Ensure deployments.json exists from a prior deploy run (or set addresses manually below)
 *
 * Usage:
 *   npx hardhat run scripts/transfer-ownership.ts --network bscTestnet
 *   npx hardhat run scripts/transfer-ownership.ts --network bsc
 *
 * Mandatory testnet rehearsal before mainnet:
 *   1. Transfer ownership on testnet
 *   2. Verify EOA can NO LONGER call onlyOwner functions
 *   3. Execute pause/unpause/updateFeeRecipient through the Safe UI
 *   4. Document results before proceeding to mainnet
 */

import hre from "hardhat";
import { readFileSync, existsSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config();

const { ethers, network } = hre;

async function main() {
    const safeAddress = process.env.SAFE_OWNER_ADDRESS;
    if (!safeAddress) {
        throw new Error(
            "SAFE_OWNER_ADDRESS not set. " +
            "Create a Gnosis Safe at app.safe.global and set SAFE_OWNER_ADDRESS in .env.local"
        );
    }

    if (!ethers.isAddress(safeAddress)) {
        throw new Error(`SAFE_OWNER_ADDRESS is not a valid address: ${safeAddress}`);
    }

    const signers = await ethers.getSigners();
    if (signers.length === 0) {
        throw new Error("No signers found — ensure PRIVATE_KEY is set in .env.local");
    }
    const deployer = signers[0];

    console.log("\n🔑 Ownership Transfer to Gnosis Safe");
    console.log("=====================================\n");
    console.log(`📡 Network: ${network.name}`);
    console.log(`👤 Deployer (current owner): ${deployer.address}`);
    console.log(`🔐 Gnosis Safe (new owner):  ${safeAddress}\n`);

    // Load deployed addresses from deployments.json
    const deploymentsPath = "./deployments.json";
    if (!existsSync(deploymentsPath)) {
        throw new Error(
            "deployments.json not found. Run the deployment script first, " +
            "or manually provide contract addresses."
        );
    }

    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const chainDeployment = deployments[chainId.toString()];

    if (!chainDeployment) {
        throw new Error(
            `No deployment found for chain ${chainId} in deployments.json. ` +
            `Available chains: ${Object.keys(deployments).join(", ")}`
        );
    }

    const { TokenFactory: tokenFactoryAddress, DexRouterRegistry: registryAddress, DeterministicDeployer: deployerAddress } =
        chainDeployment.contracts;

    console.log("📍 Contract addresses:");
    console.log(`   TokenFactory:            ${tokenFactoryAddress}`);
    console.log(`   DexRouterRegistry:       ${registryAddress}`);
    console.log(`   DeterministicDeployer:   ${deployerAddress}\n`);

    // ========== Verify current ownership ==========

    const TokenFactory = await ethers.getContractAt("TokenFactory", tokenFactoryAddress);
    const DexRouterRegistry = await ethers.getContractAt("DexRouterRegistry", registryAddress);
    const DeterministicDeployer = await ethers.getContractAt("DeterministicDeployer", deployerAddress);

    const [tfOwner, regOwner, ddOwner] = await Promise.all([
        TokenFactory.owner(),
        DexRouterRegistry.owner(),
        DeterministicDeployer.owner(),
    ]);

    console.log("🔎 Current owners:");
    console.log(`   TokenFactory:            ${tfOwner}`);
    console.log(`   DexRouterRegistry:       ${regOwner}`);
    console.log(`   DeterministicDeployer:   ${ddOwner}\n`);

    const expectedOwner = deployer.address.toLowerCase();
    const errors: string[] = [];
    if (tfOwner.toLowerCase() !== expectedOwner) errors.push(`TokenFactory is owned by ${tfOwner}, not deployer`);
    if (regOwner.toLowerCase() !== expectedOwner) errors.push(`DexRouterRegistry is owned by ${regOwner}, not deployer`);
    if (ddOwner.toLowerCase() !== expectedOwner) errors.push(`DeterministicDeployer is owned by ${ddOwner}, not deployer`);

    if (errors.length > 0) {
        throw new Error("Ownership verification failed:\n" + errors.map(e => `  - ${e}`).join("\n"));
    }

    console.log("✅ All contracts are owned by deployer. Proceeding with transfer.\n");

    // ========== Transfer ownership ==========

    console.log("📤 Transferring TokenFactory ownership...");
    const tx1 = await TokenFactory.transferOwnership(safeAddress);
    await tx1.wait();
    console.log("✅ TokenFactory ownership transferred");

    console.log("📤 Transferring DexRouterRegistry ownership...");
    const tx2 = await DexRouterRegistry.transferOwnership(safeAddress);
    await tx2.wait();
    console.log("✅ DexRouterRegistry ownership transferred");

    console.log("📤 Transferring DeterministicDeployer ownership...");
    const tx3 = await DeterministicDeployer.transferOwnership(safeAddress);
    await tx3.wait();
    console.log("✅ DeterministicDeployer ownership transferred\n");

    // ========== Verify transfer ==========

    const [newTfOwner, newRegOwner, newDdOwner] = await Promise.all([
        TokenFactory.owner(),
        DexRouterRegistry.owner(),
        DeterministicDeployer.owner(),
    ]);

    const safeAddrLower = safeAddress.toLowerCase();
    const verifyErrors: string[] = [];
    if (newTfOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`TokenFactory owner is ${newTfOwner}`);
    if (newRegOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`DexRouterRegistry owner is ${newRegOwner}`);
    if (newDdOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`DeterministicDeployer owner is ${newDdOwner}`);

    if (verifyErrors.length > 0) {
        throw new Error("Post-transfer verification FAILED:\n" + verifyErrors.map(e => `  - ${e}`).join("\n"));
    }

    console.log("🎉 OWNERSHIP TRANSFER COMPLETE");
    console.log("================================\n");
    console.log(`All contracts now owned by Gnosis Safe: ${safeAddress}`);
    console.log("\n⚠️  NEXT STEPS (mandatory before mainnet):");
    console.log("1. Confirm EOA can no longer call onlyOwner functions");
    console.log("2. Execute 'pause' through the Safe UI — verify it works");
    console.log("3. Execute 'unpause' through the Safe UI — verify it works");
    console.log("4. Execute 'updateFeeRecipient' through the Safe UI — verify it works");
    console.log("5. Document results before mainnet deployment\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Ownership transfer failed:", error.message);
        process.exit(1);
    });
