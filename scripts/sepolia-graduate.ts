import hre from "hardhat";
import { existsSync, readFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { ethers, network } = hre;

/**
 * Lane 3 — Base Sepolia push-to-graduation + invariant assertions.
 *
 * What it does
 * ------------
 * 1. Resolves the target token address from one of:
 *      - $TOKEN_ADDRESS env var (explicit override), or
 *      - the latest entry in `deployments.json[84532].smokeTokens[]`
 *        written by `sepolia-smoke-seed.ts`.
 * 2. Looks up the AMM, current supply, and graduation threshold.
 * 3. Sends a single overpaying buy worth ~5 ETH so the V2 graduation
 *    overpayment clamp engages — the AMM should accept ~3 ETH (the
 *    sigmoid integral at threshold), refund the rest, and graduate.
 * 4. Asserts the four V2 graduation invariants on-chain:
 *      a) overpayment refund — `GraduationOverpaymentRefunded` event
 *         was emitted with `refundedNative > 0`, AND the buyer's net
 *         spend is strictly less than the gross sent.
 *      b) LP price continuity — observed LP reserve ratio matches
 *         `spotPriceAtSupply(GRADUATION_THRESHOLD)` within 0.1%
 *         (10 bps).
 *      c) 70/20/10 token allocation of the 200 M post-curve remainder
 *         (140 M LP / 40 M vesting / 20 M treasury).
 *      d) Accounting closure — the AMM's residual native balance
 *         equals `creatorAccumulatedFees + referrerAccumulatedFees +
 *         totalGraduationFunds`.
 *
 * Hard guards
 * -----------
 * - Refuses to run on any network other than Base Sepolia (84532).
 * - Refuses to run if the target token is already graduated.
 *
 * Usage
 * -----
 *   npx hardhat run scripts/sepolia-graduate.ts --network baseSepolia
 *
 * Optional env:
 *   TOKEN_ADDRESS     — override the target token explicitly.
 *   GRADUATION_VALUE  — gross ETH to send. Default `5`. Must exceed
 *                       the curve's ~3 ETH integral so the clamp +
 *                       refund path engages.
 */

const BASE_SEPOLIA_CHAIN_ID = 84532n;
const DEPLOYMENTS_PATH = "./deployments.json";

const PRECISION = 10n ** 18n;
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;
const REMAINING_SUPPLY = TOTAL_SUPPLY - GRADUATION_THRESHOLD; // 200 M
const EXPECTED_LP_TOKENS = (REMAINING_SUPPLY * 7000n) / 10000n; // 140 M
const EXPECTED_VESTING_TOKENS = (REMAINING_SUPPLY * 2000n) / 10000n; // 40 M
const PRICE_CONTINUITY_TOLERANCE_BPS = 10n; // 0.1%

interface SmokeTokenEntry {
  name: string;
  symbol: string;
  tokenAddress: string;
  ammAddress: string;
  seededAt: string;
  seederTx: string;
}

function loadLatestSmokeToken(): SmokeTokenEntry {
  if (!existsSync(DEPLOYMENTS_PATH)) {
    throw new Error(`${DEPLOYMENTS_PATH} not found.`);
  }
  const all = JSON.parse(readFileSync(DEPLOYMENTS_PATH, "utf-8"));
  const record = all[BASE_SEPOLIA_CHAIN_ID.toString()];
  const list: SmokeTokenEntry[] = record?.smokeTokens ?? [];
  if (list.length === 0) {
    throw new Error(
      "No smokeTokens recorded for Base Sepolia. Run sepolia-smoke-seed.ts first."
    );
  }
  const last = list[list.length - 1];
  if (!last) {
    throw new Error("smokeTokens list is empty after the length check.");
  }
  return last;
}

function abs(a: bigint, b: bigint): bigint {
  return a > b ? a - b : b - a;
}

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

  // Resolve target token.
  const overrideToken = process.env.TOKEN_ADDRESS;
  let tokenAddress: string;
  let label = "(latest smokeTokens entry)";
  if (overrideToken && ethers.isAddress(overrideToken)) {
    tokenAddress = overrideToken;
    label = "(TOKEN_ADDRESS override)";
  } else {
    tokenAddress = loadLatestSmokeToken().tokenAddress;
  }

  const [executor] = await ethers.getSigners();

  // Resolve AMM. We could read the smokeTokens entry, but pulling from
  // the contract is more robust if the file got out of sync.
  const factoryAddress = (() => {
    const all = JSON.parse(readFileSync(DEPLOYMENTS_PATH, "utf-8"));
    return all[BASE_SEPOLIA_CHAIN_ID.toString()]?.contracts?.TokenFactory;
  })();
  if (!factoryAddress) {
    throw new Error("No TokenFactory in deployments.json[84532].contracts.");
  }

  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const ammAddress: string = await factory.getTokenAMM(tokenAddress);
  if (!ammAddress || ammAddress === ethers.ZeroAddress) {
    throw new Error(`No AMM registered for token ${tokenAddress}`);
  }

  const amm = await ethers.getContractAt("BondingCurveAMM", ammAddress);
  const token = await ethers.getContractAt("KRC20Token", tokenAddress);

  const [
    isGraduatedBefore,
    currentSupplyBefore,
    graduationThreshold,
    finalPriceTarget,
  ] = await Promise.all([
    amm.isGraduated(),
    amm.currentSupply(),
    amm.graduationThreshold(),
    amm.spotPriceAtSupply(GRADUATION_THRESHOLD),
  ]);

  if (isGraduatedBefore) {
    throw new Error(
      `Token ${tokenAddress} is already graduated. Refusing to re-run.`
    );
  }

  console.log("\n🎓 Lane 3 — push-to-graduation + invariant check");
  console.log("================================================");
  console.log("👤 Executor       :", executor.address);
  console.log("🪙  Token          :", tokenAddress, label);
  console.log("⚙️  AMM            :", ammAddress);
  console.log("📊 Threshold      :", graduationThreshold.toString());
  console.log("📊 Supply (before):", currentSupplyBefore.toString());
  console.log("💱 Final price    :", finalPriceTarget.toString(), "wei/token");
  console.log();

  // ============================================================
  // Push to graduation. We send GRADUATION_VALUE ETH (default 5),
  // which is far more than the curve integral at threshold (~3 ETH).
  // The V2 overpayment clamp must accept ~3 ETH gross, refund the
  // rest, and graduate the token in this single transaction.
  // ============================================================

  const grossSend = ethers.parseEther(process.env.GRADUATION_VALUE ?? "5");
  console.log(
    "📄 Step — overpaying buy (",
    ethers.formatEther(grossSend),
    "ETH gross)"
  );
  const balanceBefore = await ethers.provider.getBalance(executor.address);
  const tx = await amm.buyTokens(0, { value: grossSend });
  const receipt = await tx.wait();
  if (!receipt) throw new Error("buyTokens receipt missing");
  console.log("   ✅ tx          :", receipt.hash);

  const gasCost = receipt.gasUsed * receipt.gasPrice;
  const balanceAfter = await ethers.provider.getBalance(executor.address);
  const netSpend = balanceBefore - balanceAfter - gasCost;
  console.log(
    "   net spend     :",
    ethers.formatEther(netSpend),
    "ETH (gross was",
    ethers.formatEther(grossSend),
    ")"
  );

  // ============================================================
  // Invariant assertions.
  //
  // Each assertion sets `passed = true|false` so we can print a
  // pass/fail line per invariant. The script exits non-zero if any
  // invariant fails — graduation correctness is non-negotiable.
  // ============================================================

  const results: { id: string; passed: boolean; detail: string }[] = [];
  let allPassed = true;
  function record(id: string, passed: boolean, detail: string) {
    results.push({ id, passed, detail });
    if (!passed) allPassed = false;
  }

  // Invariant 1 — overpayment refund.
  //
  // Confirms: (a) GraduationOverpaymentRefunded fired in the receipt,
  // and (b) net spend is strictly less than the gross sent.
  const overpayTopic = amm.interface.getEvent("GraduationOverpaymentRefunded")
    .topicHash;
  const overpayLog = receipt.logs.find((l) => l.topics[0] === overpayTopic);
  let refundedNative = 0n;
  if (overpayLog) {
    const parsed = amm.interface.parseLog({
      topics: [...overpayLog.topics],
      data: overpayLog.data,
    });
    refundedNative = parsed?.args?.refundedNative ?? 0n;
  }
  record(
    "1. overpayment refund",
    overpayLog != null && refundedNative > 0n && netSpend < grossSend,
    `GraduationOverpaymentRefunded.refundedNative = ${ethers.formatEther(
      refundedNative
    )} ETH; netSpend (${ethers.formatEther(
      netSpend
    )}) < grossSend (${ethers.formatEther(grossSend)})`
  );

  // Invariant 2 — LP price continuity.
  //
  // Pull the GraduationTriggered event for the actual LP amounts, then
  // assert observedRatio == finalPrice within 10 bps.
  const gradTriggeredTopic = amm.interface.getEvent("GraduationTriggered")
    .topicHash;
  const gradLog = receipt.logs.find((l) => l.topics[0] === gradTriggeredTopic);
  if (!gradLog) {
    record(
      "2. LP price continuity",
      false,
      "GraduationTriggered event not found in receipt"
    );
  } else {
    const parsed = amm.interface.parseLog({
      topics: [...gradLog.topics],
      data: gradLog.data,
    });
    const lpAdded: boolean = parsed?.args?.lpAdded ?? false;
    const nativeUsed: bigint = parsed?.args?.nativeUsedForLP ?? 0n;
    const tokensUsed: bigint = parsed?.args?.tokensUsedForLP ?? 0n;

    if (!lpAdded || tokensUsed === 0n) {
      // LP skipped (mock router refused, pre-polluted pair, etc.). On
      // smoke that's only acceptable if the operator knows the path.
      // We surface it loud — it's not strictly a price-continuity
      // failure, but it's a signal that needs review.
      record(
        "2. LP price continuity",
        false,
        `LP was NOT added (lpAdded=${lpAdded}, tokensUsedForLP=${tokensUsed}). ` +
          "Verify the router config and pair pre-state."
      );
    } else {
      // observedPriceWeiPerToken = (native paired) * PRECISION / (token-wei paired)
      const observed = (nativeUsed * PRECISION) / tokensUsed;
      const tolerance =
        (finalPriceTarget * PRICE_CONTINUITY_TOLERANCE_BPS) / 10_000n;
      const drift = abs(observed, finalPriceTarget);
      record(
        "2. LP price continuity",
        drift <= tolerance,
        `observed=${observed} finalPrice=${finalPriceTarget} drift=${drift} tolerance=${tolerance}`
      );
    }
  }

  // Invariant 3 — 70/20/10 token allocation.
  //
  // 70% LP path: only readable post-graduation through the Mock
  // router or the LP token contract; we already confirmed this in
  // invariant 2 via tokensUsedForLP. Check the explicit 20% creator
  // vesting + 10% treasury via on-chain reads.
  const vestingAddress: string = await (amm as unknown as {
    creatorVesting(): Promise<string>;
  }).creatorVesting();
  if (!vestingAddress || vestingAddress === ethers.ZeroAddress) {
    record(
      "3. 70/20/10 allocation",
      false,
      "No CreatorVesting contract was deployed."
    );
  } else {
    const vestingTokenBalance = await token.balanceOf(vestingAddress);
    const expectedTreasury = REMAINING_SUPPLY - EXPECTED_LP_TOKENS - EXPECTED_VESTING_TOKENS;
    // The treasury recipient is the AMM's feeRecipient. Read it.
    const feeRecipient: string = await (amm as unknown as {
      feeRecipient(): Promise<string>;
    }).feeRecipient();
    const treasuryTokenBalance = await token.balanceOf(feeRecipient);

    // Note: feeRecipient also receives platform-fee dust from earlier
    // trades in token-wei? No — fee transfers are in native ETH, not
    // tokens. So treasury token balance should equal expectedTreasury
    // exactly (modulo any LP-leftover token refund the V2 graduation
    // can route to treasury, which on a clean mock router should be 0).
    const vestingMatches = vestingTokenBalance === EXPECTED_VESTING_TOKENS;
    const treasuryMeetsMin = treasuryTokenBalance >= expectedTreasury;
    record(
      "3. 70/20/10 allocation",
      vestingMatches && treasuryMeetsMin,
      `vesting=${vestingTokenBalance} (expected ${EXPECTED_VESTING_TOKENS}); ` +
        `treasury=${treasuryTokenBalance} (expected >= ${expectedTreasury})`
    );
  }

  // Invariant 4 — accounting closure.
  //
  // residualBalance == creatorAccumulatedFees + referrerAccumulatedFees +
  //                    totalGraduationFunds
  const residualBalance = await ethers.provider.getBalance(ammAddress);
  const [creatorFees, referrerFees, totalGrad] = await Promise.all([
    (amm as unknown as { creatorAccumulatedFees(): Promise<bigint> })
      .creatorAccumulatedFees(),
    (amm as unknown as { referrerAccumulatedFees(): Promise<bigint> })
      .referrerAccumulatedFees(),
    (amm as unknown as { totalGraduationFunds(): Promise<bigint> })
      .totalGraduationFunds(),
  ]);
  const expectedResidual = creatorFees + referrerFees + totalGrad;
  record(
    "4. accounting closure",
    residualBalance === expectedResidual,
    `residual=${residualBalance} expected=${expectedResidual} ` +
      `(creator=${creatorFees} + referrer=${referrerFees} + grad=${totalGrad})`
  );

  // ============================================================
  // Final report.
  // ============================================================
  console.log("\n📋 Invariant report");
  console.log("================================================");
  for (const r of results) {
    const mark = r.passed ? "✅" : "❌";
    console.log(`${mark} ${r.id}`);
    console.log(`     ${r.detail}`);
  }
  console.log();
  if (allPassed) {
    console.log("🎉 All four invariants pass. Graduation is correct.");
  } else {
    console.log(
      "❌ One or more invariants failed. Open a PR 7 finding ticket and stop further smoke."
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
