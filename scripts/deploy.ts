import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Deploying KasPump contracts to Kasplex mainnet...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "KAS");

  // Deploy TokenFactory
  console.log("\n📄 Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  
  // Use deployer as initial fee recipient (can be changed later)
  const tokenFactory = await TokenFactory.deploy(deployer.address);
  await tokenFactory.waitForDeployment();
  
  const factoryAddress = await tokenFactory.getAddress();
  console.log("✅ TokenFactory deployed to:", factoryAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await tokenFactory.owner();
  const feeRecipient = await tokenFactory.feeRecipient();
  
  console.log("Factory owner:", owner);
  console.log("Fee recipient:", feeRecipient);

  // Save deployment addresses
  const deploymentInfo = {
    network: "kasplex",
    chainId: 167012,
    timestamp: new Date().toISOString(),
    contracts: {
      TokenFactory: {
        address: factoryAddress,
        owner: owner,
        feeRecipient: feeRecipient
      }
    },
    deployer: {
      address: deployer.address,
      balance: ethers.formatEther(balance)
    }
  };

  // Write to deployment file
  const deploymentFile = `deployment-${Date.now()}.json`;
  writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  
  // Create .env.local file for frontend
  const envContent = `# KasPump Contract Addresses - Kasplex Mainnet
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CHAIN_ID=167012
NEXT_PUBLIC_RPC_URL=https://rpc.kasplex.io
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${factoryAddress}
NEXT_PUBLIC_FEE_RECIPIENT=${feeRecipient}

# Add your private key for deployment (keep secret!)
# PRIVATE_KEY=your_private_key_here
`;
  
  writeFileSync('.env.local', envContent);
  console.log("✅ Environment file created: .env.local");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log(`   TokenFactory: ${factoryAddress}`);
  console.log(`   Network: Kasplex (${167012})`);
  console.log(`   Deployer: ${deployer.address}`);
  
  console.log("\n⚠️  Important:");
  console.log("1. Save the deployment file safely");
  console.log("2. Update your frontend environment variables");
  console.log("3. Consider setting up a proper fee recipient address");
  console.log("4. Test token creation on testnet first");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
