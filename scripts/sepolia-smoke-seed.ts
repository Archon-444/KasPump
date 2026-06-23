import hre from "hardhat";
import { existsSync, readFileSync, writeFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { ethers, network } = hre;

/**
 * Lane 3 — Base Sepolia smoke seed.
 *
 * What it does
 * ------------
 * 1. Reads the V2 deploy from `deployments.json` (chainId 84532). If the
 *    factory address isn't filled in, it errors out — does NOT deploy a
 *    fresh factory. Deployment is `deploy-deterministic.ts`'s job; this
 *    script is the next step in the smoke runbook (§6 of
 *    docs/BASE_SEPOLIA_SMOKE.md).
 * 2. Calls `TokenFactory.createToken(...)` with a unique name + symbol
 *    so re-running the script doesn't collide with prior smoke tokens.
 * 3. Performs a small (~0.001 ETH net) buy through the freshly deployed
 *    AMM so the token shows up in the indexer with at least one trade.
 * 4. Prints every address the operator needs for the rest of the smoke
 *    runbook (token, AMM, factory, registry, mock router, deployer).
 *
 * What it does NOT do
 * -------------------
 * - Push to graduation. That's `sepolia-graduate.ts`.
 * - Deploy a factory / registry. That's `deploy-deterministic.ts`.
 * - Seed the mock router. That's `deploy-mock-router-sepolia.ts`.
 * - Touch any chain other than Base Sepolia (84532). Hard-guarded.
 *
 * Usage
 * -----
 *   npx hardhat run scripts/sepolia-smoke-seed.ts --network baseSepolia
 *
 * The output writes the new token + AMM addresses back into
 * `deployments.json` under `[84532].smokeTokens[]` so a follow-up
 * `sepolia-graduate.ts` invocation can pick the latest seed by default.
 */

const BASE_SEPOLIA_CHAIN_ID = 84532n;
const DEPLOYMENTS_PATH = "./deployments.json";

interface DeploymentRecord {
  contracts: {
    TokenFactory?: string;
    DexRouterRegistry?: string;
    DeterministicDeployer?: string;
    FeeRecipient?: string;
  };
  smokeTokens?: Array<{
    name: string;
    symbol: string;
    tokenAddress: string;
    ammAddress: string;
    seededAt: string;
    seederTx: string;
  }>;
  [k: string]: unknown;
}

function loadDeployments(): Record<string, DeploymentRecord> {
  if (!existsSync(DEPLOYMENTS_PATH)) {
    throw new Error(
      `${DEPLOYMENTS_PATH} not found. Run scripts/deploy-deterministic.ts first.`
    );
  }
  return JSON.parse(readFileSync(DEPLOYMENTS_PATH, "utf-8"));
}

function persistSmokeToken(
  chainId: string,
  entry: NonNullable<DeploymentRecord["smokeTokens"]>[number]
): void {
  const all = loadDeployments();
  const record = all[chainId] ?? { contracts: {} };
  const list = record.smokeTokens ?? [];
  list.push(entry);
  record.smokeTokens = list;
  all[chainId] = record;
  writeFileSync(DEPLOYMENTS_PATH, JSON.stringify(all, null, 2));
}

async function main() {
  // Hard guard — script is Base Sepolia only.
  if (network.name !== "baseSepolia") {
    throw new Error(
      `Refusing to run on network "${network.name}". This script is Base Sepolia only.`
    );
  }
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Refusing to run on chainId ${chainId}. Expected ${BASE_SEPOLIA_CHAIN_ID} (Base Sepolia).`
    );
  }

  const all = loadDeployments();
  const record = all[BASE_SEPOLIA_CHAIN_ID.toString()];
  if (!record) {
    throw new Error(
      `No deployments record for chainId ${BASE_SEPOLIA_CHAIN_ID}. ` +
        `Run scripts/deploy-deterministic.ts first.`
    );
  }
  const factoryAddress = record.contracts.TokenFactory;
  const registryAddress = record.contracts.DexRouterRegistry;
  if (!factoryAddress || factoryAddress === ethers.ZeroAddress) {
    throw new Error(
      `deployments.json[${BASE_SEPOLIA_CHAIN_ID}].contracts.TokenFactory is empty. ` +
        `Run scripts/deploy-deterministic.ts first.`
    );
  }

  const [seeder] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(seeder.address);

  console.log("\n🌱 Lane 3 — Base Sepolia smoke seed");
  console.log("================================================");
  console.log("👤 Seeder         :", seeder.address);
  console.log("💰 Seeder balance :", ethers.formatEther(balance), "ETH");
  console.log("🏭 TokenFactory   :", factoryAddress);
  if (registryAddress) {
    console.log("📋 DexRouterReg.   :", registryAddress);
  }
  console.log();

  // ============================================================
  // Step 1 — createToken
  // ============================================================

  // Suffix the name + symbol with a short timestamp so re-runs don't
  // collide on the rate-limit cooldown / CREATE2 nonce. The full V2
  // CreateTokenParams struct is the slim PR 2 shape (no totalSupply,
  // no basePrice, no slope, no curveType).
  const stamp = Math.floor(Date.now() / 1000) % 10_000_000;
  const params = {
    name: `Smoke Token ${stamp}`,
    symbol: `SMK${stamp.toString().slice(-4)}`,
    description: "Lane 3 smoke seed token — disposable, do not trade for value.",
    imageUrl: "",
    twitterUrl: "",
    telegramUrl: "",
    websiteUrl: "",
    referrer: ethers.ZeroAddress,
  };

  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const creationFee: bigint = await factory.CREATION_FEE();

  console.log("📄 Step 1 — createToken");
  console.log("   name        :", params.name);
  console.log("   symbol      :", params.symbol);
  console.log("   creation fee:", ethers.formatEther(creationFee), "ETH");

  const createTx = await factory.createToken(params, { value: creationFee });
  const createReceipt = await createTx.wait();
  if (!createReceipt) throw new Error("createToken receipt missing");

  // Parse the TokenCreated event to lift the new addresses.
  const tokenCreatedTopic = factory.interface.getEvent("TokenCreated").topicHash;
  const log = createReceipt.logs.find(
    (l) => l.topics[0] === tokenCreatedTopic
  );
  if (!log) throw new Error("TokenCreated event not found in receipt");
  const parsed = factory.interface.parseLog({
    topics: [...log.topics],
    data: log.data,
  });
  if (!parsed) throw new Error("TokenCreated decode failed");

  const tokenAddress: string = parsed.args.tokenAddress;
  const ammAddress: string = parsed.args.ammAddress;

  console.log("   ✅ token     :", tokenAddress);
  console.log("   ✅ AMM       :", ammAddress);
  console.log("   ✅ tx        :", createReceipt.hash);
  console.log();

  // ============================================================
  // Step 2 — small buy
  // ============================================================
  //
  // 0.001 ETH gross. The 60-second sniper window will be active right
  // after createToken (the AMM's launchTimestamp is the create-token
  // block timestamp), so the fee is in the surcharge regime — we use a
  // small enough amount that MAX_BUY_PER_TX_BPS (2% of remaining curve)
  // is never an issue.
  console.log("📄 Step 2 — small buy (0.001 ETH)");
  const amm = await ethers.getContractAt("BondingCurveAMM", ammAddress);
  const buyAmount = ethers.parseEther("0.001");
  const buyTx = await amm.buyTokens(0, { value: buyAmount });
  const buyReceipt = await buyTx.wait();
  if (!buyReceipt) throw new Error("buyTokens receipt missing");
  console.log("   ✅ buy tx    :", buyReceipt.hash);

  // Snapshot live state for the operator's smoke notes.
  const [currentSupply, getCurrentPrice, isGraduated] = await Promise.all([
    amm.currentSupply(),
    amm.getCurrentPrice(),
    amm.isGraduated(),
  ]);
  console.log("   currentSupply :", currentSupply.toString());
  console.log("   spot price    :", getCurrentPrice.toString(), "wei");
  console.log("   isGraduated   :", isGraduated);
  console.log();

  // ============================================================
  // Step 3 — persist + summary
  // ============================================================
  const entry = {
    name: params.name,
    symbol: params.symbol,
    tokenAddress,
    ammAddress,
    seededAt: new Date().toISOString(),
    seederTx: createReceipt.hash,
  };
  persistSmokeToken(BASE_SEPOLIA_CHAIN_ID.toString(), entry);
  console.log("💾 Saved to deployments.json[84532].smokeTokens[]");

  console.log("\n📋 Smoke summary");
  console.log("================================================");
  console.log("Seeder     :", seeder.address);
  console.log("Token      :", tokenAddress);
  console.log("AMM        :", ammAddress);
  console.log("Factory    :", factoryAddress);
  if (registryAddress) {
    console.log("Registry   :", registryAddress);
  }
  console.log(
    `\nNext: push this token to graduation with\n  ` +
      `TOKEN_ADDRESS=${tokenAddress} \\\n  npx hardhat run scripts/sepolia-graduate.ts --network baseSepolia\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
