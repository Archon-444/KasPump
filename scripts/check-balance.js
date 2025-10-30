const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

async function checkBalance() {
  try {
    // Connect to BSC Testnet
    const provider = new ethers.JsonRpcProvider("https://bsc-testnet.public.blastapi.io");

    // Get wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("📍 Wallet Address:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceBNB = ethers.formatEther(balance);

    console.log("💰 Balance:", balanceBNB, "BNB");

    if (parseFloat(balanceBNB) >= 0.01) {
      console.log("✅ Sufficient balance for deployment!");
      process.exit(0);
    } else {
      console.log("❌ Insufficient balance!");
      console.log("\n🎁 Get testnet BNB from:");
      console.log("   https://testnet.bnbchain.org/faucet-smart");
      console.log("\n   Enter your address:", wallet.address);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkBalance();
