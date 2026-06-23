import hre from "hardhat";
import * as dotenv from "dotenv";

// Load env: prefer .env.local, fall back to .env.
dotenv.config({ path: ".env.local" });
dotenv.config();

const { ethers, network } = hre;

/**
 * Lane 1B — Base Sepolia smoke helper.
 *
 * Why this script exists
 * ----------------------
 * `contracts/libraries/DexConfig.sol` intentionally leaves the Base Sepolia
 * router unset (`router: address(0)`, `enabled: false`) — the previous author
 * refused to guess a real router on testnet, and that's the right call. The
 * V2 graduation flow needs *some* V2-clone router behind
 * `DexRouterRegistry.getRouterConfig(84532)` for `_addLiquidityToDEX` to
 * succeed, so for smoke we deploy the project's own `MockDEXRouter` /
 * `MockDEXFactory` / `MockWETH` (already used by `test/`) and seed the
 * registry post-deploy.
 *
 * What this script does NOT do
 * ----------------------------
 * - It does not modify `DexConfig.sol`. The defensive `enabled: false`
 *   stays. This script overrides at the registry level, never the
 *   library level.
 * - It does not run on mainnet. It guards on chainId 84532 explicitly.
 * - It does not produce a production-grade router. Mocks are smoke-only.
 *
 * Usage
 * -----
 *   # After deploy-deterministic.ts (or deploy-testnet.ts) has placed
 *   # TokenFactory + DexRouterRegistry on Base Sepolia:
 *   REGISTRY_ADDRESS=0x... \
 *     npx hardhat run scripts/deploy-mock-router-sepolia.ts --network baseSepolia
 *
 * The registry address comes from the prior deploy's stdout (or
 * `deployments.json`). The script then deploys the mocks and calls
 * `setRouterConfig(84532, V2, mockRouter, address(0), wrappedNative,
 * 0, enabled=true)`.
 *
 * When a verified Base Sepolia V2 router (Aerodrome / Uniswap / etc.)
 * shows up with public docs, swap this whole script for a one-line patch
 * to `DexConfig.sol` (set `router` and flip `enabled: true`).
 */

const BASE_SEPOLIA_CHAIN_ID = 84532n;
// Base Sepolia WETH predeploy (0x4200000000000000000000000000000000000006) is
// referenced in DexConfig.sol's `wrappedNative` field but the smoke flow
// uses our own MockWETH so the registry's `wrappedNative` points at the
// freshly deployed mock — keeps the smoke env internally consistent.
const ROUTER_TYPE_V2 = 0; // matches IDexRouterRegistry.RouterType.V2

async function main() {
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

  const registryAddress = process.env.REGISTRY_ADDRESS;
  if (!registryAddress || !ethers.isAddress(registryAddress)) {
    throw new Error(
      "REGISTRY_ADDRESS env var is required (the DexRouterRegistry deployed by deploy-deterministic.ts)."
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("\n🧪 Lane 1B — Base Sepolia mock-router smoke setup");
  console.log("================================================");
  console.log("👤 Deployer:", deployer.address);
  console.log("📋 Registry:", registryAddress);
  console.log();

  // 1) Deploy MockWETH (smoke uses our own predictable WETH; the canonical
  // 0x4200... predeploy works too but redeploying keeps the smoke env
  // self-contained).
  console.log("📄 Deploying MockWETH...");
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  const wethAddr = await weth.getAddress();
  console.log("✅ MockWETH:", wethAddr);

  // 2) Deploy MockDEXFactory.
  console.log("\n📄 Deploying MockDEXFactory...");
  const MockDEXFactory = await ethers.getContractFactory("MockDEXFactory");
  const factory = await MockDEXFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("✅ MockDEXFactory:", factoryAddr);

  // 3) Deploy MockDEXRouter wired to the factory + WETH above.
  console.log("\n📄 Deploying MockDEXRouter...");
  const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
  const router = await MockDEXRouter.deploy(wethAddr, factoryAddr);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("✅ MockDEXRouter:", routerAddr);

  // 4) Seed the registry. We override the library-level
  // `enabled: false` Base Sepolia entry by writing through
  // `setRouterConfig` directly — DexConfig.sol stays unchanged.
  console.log("\n🔧 Seeding DexRouterRegistry for chain 84532 (V2, mock)...");
  const registry = await ethers.getContractAt(
    "DexRouterRegistry",
    registryAddress
  );
  // Note: `wrappedNative` here intentionally points at our deployed
  // MockWETH, not Base Sepolia's canonical 0x4200... predeploy. Keeps
  // the smoke path internally consistent (the AMM hands ETH to the
  // mock router which mints / pulls against this WETH). For a real
  // testnet router we'd use the canonical address.
  const tx = await registry.setRouterConfig(
    BASE_SEPOLIA_CHAIN_ID,
    ROUTER_TYPE_V2,
    routerAddr,
    ethers.ZeroAddress, // positionManager — unused for V2
    wethAddr,
    0, // fee — unused for V2
    true // enabled
  );
  await tx.wait();
  console.log("✅ Registry seeded");

  console.log("\n📋 Smoke summary");
  console.log("================================================");
  console.log("Mock router    :", routerAddr);
  console.log("Mock factory   :", factoryAddr);
  console.log("Mock WETH      :", wethAddr);
  console.log("Registry        :", registryAddress);
  console.log(
    "\nGraduation will now use this mock router. Real-router migration is " +
      "a one-line DexConfig.sol patch when a verified Base Sepolia V2 " +
      "deployment is available — until then this script is the smoke surface."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
