// Simple script to get wallet address from private key
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || privateKey === 'your_private_key_here') {
    console.log('❌ Private key not configured in .env.local');
    process.exit(1);
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log('\n📍 Your Wallet Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Address:', wallet.address);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check BSC Testnet balance
    const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
    const balance = await provider.getBalance(wallet.address);
    const balanceInBNB = ethers.formatEther(balance);

    console.log('💰 BSC Testnet Balance:', balanceInBNB, 'BNB');

    if (parseFloat(balanceInBNB) === 0) {
      console.log('\n⚠️  You need testnet BNB to deploy contracts!');
      console.log('🔗 Get testnet BNB: https://testnet.bnbchain.org/faucet-smart');
      console.log('📋 Your address:', wallet.address);
    } else if (parseFloat(balanceInBNB) < 0.05) {
      console.log('\n⚠️  Balance is low. Recommended: 0.1 BNB for deployment');
      console.log('🔗 Get more: https://testnet.bnbchain.org/faucet-smart');
    } else {
      console.log('\n✅ Balance sufficient for deployment!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
