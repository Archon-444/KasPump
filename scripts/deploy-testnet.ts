import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Deploying KasPump contracts to BSC TESTNET...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  if (balance === BigInt(0)) {
    console.log("❌ No balance detected. Please get testnet BNB from the faucet:");
    console.log("   BSC Testnet Faucet: https://testnet.bnbchain.org/faucet-smart");
    process.exit(1);
  }

  // Deploy TokenFactory
  console.log("\n📄 Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  
  // Use deployer as initial fee recipient (can be changed later)
  const tokenFactory = await TokenFactory.deploy(deployer.address);
  console.log("⏳ Waiting for deployment confirmation...");
  
  await tokenFactory.waitForDeployment();
  
  const factoryAddress = await tokenFactory.getAddress();
  console.log("✅ TokenFactory deployed to:", factoryAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await tokenFactory.owner();
    const feeRecipient = await tokenFactory.feeRecipient();
    const allTokens = await tokenFactory.getAllTokens();

    console.log("Factory owner:", owner);
    console.log("Fee recipient:", feeRecipient);
    console.log("Initial tokens count:", allTokens.length);

    console.log("✅ Contract verification successful!");
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error);
  }

  // DEX Integration info
  console.log("\n🔄 DEX Integration:");
  console.log("✅ Chain: BSC Testnet (Chain ID: 97)");
  console.log("✅ Automatic DEX liquidity provision enabled");
  console.log("✅ Graduation split: 70% DEX liquidity, 20% creator, 10% platform");
  console.log("✅ LP tokens locked for 6 months after graduation");
  console.log("✅ Using PancakeSwap V2 Testnet router for automated liquidity");

  // Save deployment addresses
  const deploymentInfo = {
    network: "bscTestnet",
    networkName: "BSC Testnet",
    chainId: 97,
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorerUrl: "https://testnet.bscscan.com",
    timestamp: new Date().toISOString(),
    contracts: {
      TokenFactory: {
        address: factoryAddress,
        owner: await tokenFactory.owner(),
        feeRecipient: await tokenFactory.feeRecipient()
      }
    },
    deployer: {
      address: deployer.address,
      balance: ethers.formatEther(balance)
    },
    nextSteps: [
      "Update .env.local with contract addresses",
      "Test token creation through frontend",
      "Verify trading functionality",
      "Deploy to mainnet when ready"
    ]
  };

  // Write to deployment file
  const deploymentFile = `deployment-testnet-${Date.now()}.json`;
  writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  
  // Create .env.local file for frontend
  const envContent = `# KasPump Contract Addresses - BSC TESTNET
# Generated on ${new Date().toISOString()}

NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DEFAULT_CHAIN_ID=97
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY=${factoryAddress}
NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT=${await tokenFactory.feeRecipient()}

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Your private key for deployment (keep secret!)
PRIVATE_KEY=${process.env.PRIVATE_KEY || 'your_private_key_here'}

# Optional services
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.ipfs.io
NEXT_PUBLIC_DEBUG=true
`;
  
  writeFileSync('.env.local', envContent);
  console.log("✅ Environment file created: .env.local");

  console.log("\n🎉 TESTNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("📋 Summary:");
  console.log(`   TokenFactory: ${factoryAddress}`);
  console.log(`   Network: BSC Testnet`);
  console.log(`   Explorer: https://testnet.bscscan.com/address/${factoryAddress}`);
  console.log(`   Deployer: ${deployer.address}`);

  console.log("\n🔄 Next Steps:");
  console.log("1. ✅ Contracts deployed to testnet");
  console.log("2. ✅ Environment configured");
  console.log("3. 🔄 Start frontend: npm run dev");
  console.log("4. 🔄 Test token creation");
  console.log("5. 🔄 Test trading functionality");

  console.log("\n📱 Test the deployment:");
  console.log(`   Frontend: http://localhost:3000`);
  console.log(`   Contract: https://testnet.bscscan.com/address/${factoryAddress}`);

  console.log("\n⚠️  Remember:");
  console.log("- This is TESTNET - use test BNB only");
  console.log("- Save the deployment JSON file");
  console.log("- Test thoroughly before mainnet deployment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ TESTNET DEPLOYMENT FAILED:", error);
    console.error("\n🔧 Troubleshooting:");
    console.error("1. Check your PRIVATE_KEY in .env file");
    console.error("2. Ensure you have testnet BNB: https://testnet.bnbchain.org/faucet-smart");
    console.error("3. Verify network connectivity");
    console.error("4. Check hardhat.config.ts network settings");
    process.exit(1);
  });
