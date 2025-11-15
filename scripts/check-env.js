#!/usr/bin/env node

/**
 * KasPump Environment Validation Script
 *
 * This script checks if your local environment is properly configured
 * for running KasPump on BSC Testnet.
 *
 * Usage: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'bright');
}

// Load .env.local file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Validate Ethereum address format
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Check if RPC endpoint is reachable
function checkRpcEndpoint(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result) {
            const blockNumber = parseInt(json.result, 16);
            resolve({ success: true, blockNumber });
          } else {
            resolve({ success: false, error: 'Invalid response' });
          }
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(postData);
    req.end();
  });
}

// Main validation function
async function validateEnvironment() {
  logHeader('KasPump Environment Validation');

  let issues = 0;
  let warnings = 0;

  // Check Node.js version
  logHeader('Node.js Version');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    logSuccess(`Node.js ${nodeVersion} (Required: 18+)`);
  } else {
    logError(`Node.js ${nodeVersion} is too old. Required: 18+`);
    issues++;
  }

  // Check for .env.local file
  logHeader('Environment Configuration');
  const env = loadEnvFile();

  if (!env) {
    logError('.env.local file not found');
    logInfo('Create .env.local from .env.example and configure it');
    issues++;
    return; // Can't continue without env file
  } else {
    logSuccess('.env.local file found');
  }

  // Check WalletConnect Project ID
  logHeader('WalletConnect Configuration');
  const walletConnectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  if (!walletConnectId || walletConnectId === 'your_walletconnect_project_id_here') {
    logError('WalletConnect Project ID not configured');
    logInfo('Get one from https://cloud.walletconnect.com (free)');
    logInfo('Update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local');
    issues++;
  } else if (walletConnectId.length < 32) {
    logWarning('WalletConnect Project ID looks invalid (too short)');
    warnings++;
  } else {
    logSuccess(`WalletConnect Project ID configured: ${walletConnectId.substring(0, 8)}...`);
  }

  // Check BSC Testnet configuration
  logHeader('BSC Testnet Configuration');

  const factoryAddress = env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY;
  const feeRecipient = env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT;
  const rpcUrl = env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL;
  const chainId = env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;

  // Validate TokenFactory address
  if (!factoryAddress) {
    logError('TokenFactory address not set');
    logInfo('Set NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY in .env.local');
    issues++;
  } else if (!isValidAddress(factoryAddress)) {
    logError(`Invalid TokenFactory address: ${factoryAddress}`);
    issues++;
  } else if (factoryAddress === '0x7Af627Bf902549543701C58366d424eE59A4ee08') {
    logSuccess(`TokenFactory: ${factoryAddress} ✓ (Official BSC Testnet deployment)`);
  } else {
    logWarning(`TokenFactory: ${factoryAddress} (Custom deployment)`);
    warnings++;
  }

  // Validate FeeRecipient address
  if (!feeRecipient) {
    logError('FeeRecipient address not set');
    logInfo('Set NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT in .env.local');
    issues++;
  } else if (!isValidAddress(feeRecipient)) {
    logError(`Invalid FeeRecipient address: ${feeRecipient}`);
    issues++;
  } else {
    logSuccess(`FeeRecipient: ${feeRecipient}`);
  }

  // Validate Chain ID
  if (!chainId) {
    logError('Default Chain ID not set');
    issues++;
  } else if (chainId !== '97') {
    logWarning(`Chain ID is ${chainId} (BSC Testnet is 97)`);
    logInfo('For testnet development, use NEXT_PUBLIC_DEFAULT_CHAIN_ID=97');
    warnings++;
  } else {
    logSuccess('Default Chain ID: 97 (BSC Testnet)');
  }

  // Check RPC endpoint
  logHeader('RPC Endpoint Connectivity');

  if (!rpcUrl) {
    logError('BSC Testnet RPC URL not set');
    logInfo('Set NEXT_PUBLIC_BSC_TESTNET_RPC_URL in .env.local');
    issues++;
  } else {
    logInfo(`Testing RPC endpoint: ${rpcUrl}`);
    const rpcCheck = await checkRpcEndpoint(rpcUrl);

    if (rpcCheck.success) {
      logSuccess(`RPC endpoint is reachable (Current block: ${rpcCheck.blockNumber})`);
    } else {
      logError(`RPC endpoint unreachable: ${rpcCheck.error}`);
      logInfo('Try using: https://data-seed-prebsc-1-s1.binance.org:8545');
      issues++;
    }
  }

  // Check package.json dependencies
  logHeader('Project Dependencies');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    logSuccess('package.json found');

    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      logSuccess('node_modules directory exists');
      logInfo('Run "npm install" if you encounter dependency issues');
    } else {
      logError('node_modules directory not found');
      logInfo('Run "npm install" to install dependencies');
      issues++;
    }
  } else {
    logError('package.json not found - are you in the correct directory?');
    issues++;
  }

  // Check development mode settings
  logHeader('Development Settings');

  const nodeEnv = env.NODE_ENV;
  const debug = env.NEXT_PUBLIC_DEBUG;

  if (nodeEnv === 'development') {
    logSuccess('NODE_ENV: development');
  } else if (!nodeEnv) {
    logWarning('NODE_ENV not set (will default to production)');
    logInfo('For local dev, set NODE_ENV=development');
    warnings++;
  } else {
    logInfo(`NODE_ENV: ${nodeEnv}`);
  }

  if (debug === 'true') {
    logSuccess('Debug mode enabled');
  } else {
    logInfo('Debug mode disabled (set NEXT_PUBLIC_DEBUG=true for verbose logging)');
  }

  // Final summary
  logHeader('Validation Summary');

  if (issues === 0 && warnings === 0) {
    logSuccess('🎉 All checks passed! Your environment is ready.');
    log('\nNext steps:', 'bright');
    log('  1. Run "npm run dev" to start the development server');
    log('  2. Open http://localhost:3000 in your browser');
    log('  3. Connect your wallet and switch to BSC Testnet');
    log('  4. Get testnet BNB from https://testnet.bnbchain.org/faucet-smart');
    log('  5. Start creating and trading tokens!');
  } else {
    if (issues > 0) {
      logError(`Found ${issues} critical issue(s) that must be fixed`);
    }
    if (warnings > 0) {
      logWarning(`Found ${warnings} warning(s) that should be reviewed`);
    }
    log('\nPlease fix the issues above and run this script again.', 'yellow');
    log('See QUICK_START.md for detailed setup instructions.', 'cyan');
  }

  log(''); // Empty line at end

  // Exit with error code if there are critical issues
  process.exit(issues > 0 ? 1 : 0);
}

// Run validation
validateEnvironment().catch(error => {
  logError(`Validation failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
