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

    // A Gnosis Safe is always a contract, and Safe addresses are chain-specific.
    // All three contracts use one-step Ownable, so transferring to a codeless
    // address (e.g. a Safe that only exists on another chain) bricks admin
    // control permanently. Refuse unless code exists at the address.
    const safeCode = await ethers.provider.getCode(safeAddress);
    if (safeCode === "0x") {
        throw new Error(
            `SAFE_OWNER_ADDRESS ${safeAddress} has no code on ${network.name}. ` +
            "Safes are chain-specific — create/deploy the Safe on THIS network " +
            "and pass its address here. Refusing to transfer one-step ownership " +
            "to a codeless address."
        );
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

    // ========== Migrate ammAdmin + feeRecipient (must happen BEFORE the
    // ownership transfer — both setters are onlyOwner) ==========

    // ammAdmin owns every BondingCurveAMM the factory creates (pause/unpause/
    // setSoftLaunchCap/emergencyWithdraw). Leaving it on the deployer EOA
    // defeats the point of the Safe migration.
    const currentAmmAdmin = await TokenFactory.ammAdmin();
    if (currentAmmAdmin.toLowerCase() !== safeAddress.toLowerCase()) {
        console.log(`📤 Migrating ammAdmin (${currentAmmAdmin} → Safe)...`);
        const txAdmin = await TokenFactory.setAmmAdmin(safeAddress);
        await txAdmin.wait();
        console.log("✅ ammAdmin migrated — AMMs created from now on are Safe-owned");
        console.log(
            "⚠️  AMMs created BEFORE this migration are still owned by the old " +
            "ammAdmin; transfer each one individually from that key if any exist.\n"
        );
    } else {
        console.log("✅ ammAdmin already set to the Safe\n");
    }

    // Fees route to feeRecipient, snapshotted per-AMM at creation. Point new
    // AMMs at the Safe (or FEE_RECIPIENT_ADDRESS if a separate treasury is set).
    const desiredFeeRecipient = process.env.FEE_RECIPIENT_ADDRESS || safeAddress;
    const currentFeeRecipient = await TokenFactory.feeRecipient();
    if (currentFeeRecipient.toLowerCase() !== desiredFeeRecipient.toLowerCase()) {
        console.log(`📤 Migrating feeRecipient (${currentFeeRecipient} → ${desiredFeeRecipient})...`);
        const txFee = await TokenFactory.updateFeeRecipient(desiredFeeRecipient);
        await txFee.wait();
        console.log("✅ feeRecipient migrated — note AMMs created earlier keep the old recipient\n");
    } else {
        console.log("✅ feeRecipient already set correctly\n");
    }

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

    const [newTfOwner, newRegOwner, newDdOwner, newAmmAdmin] = await Promise.all([
        TokenFactory.owner(),
        DexRouterRegistry.owner(),
        DeterministicDeployer.owner(),
        TokenFactory.ammAdmin(),
    ]);

    const safeAddrLower = safeAddress.toLowerCase();
    const verifyErrors: string[] = [];
    if (newTfOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`TokenFactory owner is ${newTfOwner}`);
    if (newRegOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`DexRouterRegistry owner is ${newRegOwner}`);
    if (newDdOwner.toLowerCase() !== safeAddrLower) verifyErrors.push(`DeterministicDeployer owner is ${newDdOwner}`);
    if (newAmmAdmin.toLowerCase() !== safeAddrLower) verifyErrors.push(`TokenFactory ammAdmin is ${newAmmAdmin}`);

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
    console.log("5. Launch a token and confirm its AMM owner() is the Safe (ammAdmin path)");
    console.log("6. Transfer any pre-migration AMMs from the old ammAdmin key");
    console.log("7. Document results before mainnet deployment\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Ownership transfer failed:", error.message);
        process.exit(1);
    });
