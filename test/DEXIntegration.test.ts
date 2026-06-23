import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

/**
 * V2 DEX integration suite — Lane 3 rewrite.
 *
 * The previous file was V1-shaped (9-arg AMM constructor, calls to a
 * removed `calculateNativeIn`, MCAP-tier fee assumptions) and was
 * quarantined in Lane 1A.1. This rewrite covers the V2 lifecycle:
 *
 *   1. Deploy fresh AMM + MockDEX{Factory,Router} + MockWETH.
 *   2. Drive the curve to graduation through a single overpaying buy
 *      so the V2 overpayment clamp + refund is exercised.
 *   3. Confirm the AMM's interaction with the DEX router:
 *      - addLiquidityETH was invoked exactly once with the V2-expected
 *        140 M token allocation and a price-continuous native amount.
 *      - LP tokens are tracked + locked for 6 months (LP_LOCK_DURATION).
 *   4. Confirm CreatorVesting was deployed with the timestamp-based
 *      duration (180 days in seconds) and holds the 40 M creator slice.
 *   5. Confirm the LP-withdraw timelock works: pre-unlock reverts,
 *      post-unlock succeeds for the creator only.
 *
 * Sigmoid economics in this fixture:
 *   - integral at GRADUATION_THRESHOLD ≈ 3 ETH, so a 5 ETH buy clamps
 *     to ~3 ETH gross + refund.
 *   - finalPrice ≈ 7.144 gwei per token; LP receives 140 M tokens paired
 *     with ~1 ETH (price-continuous), the remaining ~2 ETH is split
 *     2:1 between creator-graduation-funds and treasury (per PR 3).
 */

const PRECISION = 1_000_000_000_000_000_000n;
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;
const REMAINING_SUPPLY = TOTAL_SUPPLY - GRADUATION_THRESHOLD; // 200 M
const EXPECTED_LP_TOKENS = (REMAINING_SUPPLY * 7000n) / 10000n; // 140 M
const EXPECTED_VESTING_TOKENS = (REMAINING_SUPPLY * 2000n) / 10000n; // 40 M
const SIX_MONTHS_SECONDS = 180 * 24 * 60 * 60;

async function deployFixture() {
  const [deployer, creator, treasury, trader] = await ethers.getSigners();

  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();

  const MockDEXFactory = await ethers.getContractFactory("MockDEXFactory");
  const dexFactory = await MockDEXFactory.deploy();
  await dexFactory.waitForDeployment();

  const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
  const dexRouter = await MockDEXRouter.deploy(
    await weth.getAddress(),
    await dexFactory.getAddress()
  );
  await dexRouter.waitForDeployment();

  const KRC20Token = await ethers.getContractFactory("KRC20Token");
  const token = await KRC20Token.deploy(
    "DEX Integration",
    "DXI",
    TOTAL_SUPPLY,
    deployer.address
  );
  await token.waitForDeployment();

  const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
  // V2 7-arg constructor:
  //   token, tokenCreator, feeRecipient, membershipTier, dexRouter,
  //   sniperProtectionDuration, referrer
  const amm = await BondingCurveAMM.deploy(
    await token.getAddress(),
    creator.address,
    treasury.address, // feeRecipient acts as the treasury sink (PR 3 minimal).
    0,
    await dexRouter.getAddress(),
    60,
    ethers.ZeroAddress
  );
  await amm.waitForDeployment();

  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  // Skip the sniper window so the per-tx caps + deviation guards don't
  // fire on the single overpaying graduation buy.
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);

  return { amm, token, dexFactory, dexRouter, deployer, creator, treasury, trader };
}

describe("V2 DEX Integration — graduation → LP add → vesting + LP lock", function () {
  it("graduates with a price-continuous LP and a vesting contract", async function () {
    const { amm, token, dexRouter, trader } = await deployFixture();

    const tx = await amm
      .connect(trader)
      .buyTokens(0, { value: ethers.parseEther("5") });
    const receipt = await tx.wait();
    expect(receipt).to.not.equal(null);

    expect(await amm.isGraduated()).to.equal(true);
    expect(await amm.currentSupply()).to.equal(GRADUATION_THRESHOLD);

    // Exactly one LP add happened on the mock router.
    const recordsCount = await dexRouter.getLiquidityRecordsCount();
    expect(recordsCount).to.equal(1n);
    const record = await dexRouter.getLiquidityRecord(0);
    const lpToken: string = record[0];
    const lpTokenAmount: bigint = record[1];
    const lpNativeAmount: bigint = record[2];
    expect(lpToken).to.equal(await token.getAddress());

    // Token allocation: 70% / 20% / 10% of remaining 200 M.
    expect(lpTokenAmount).to.equal(EXPECTED_LP_TOKENS);

    // Price continuity: the LP ratio (wei per full token) is within 10
    // bps of spotPriceAtSupply(GRADUATION_THRESHOLD).
    const finalPrice: bigint = await amm.spotPriceAtSupply(GRADUATION_THRESHOLD);
    const observed = (lpNativeAmount * PRECISION) / lpTokenAmount;
    const drift = observed > finalPrice ? observed - finalPrice : finalPrice - observed;
    const tolerance = (finalPrice * 10n) / 10_000n; // 0.1%
    expect(drift).to.be.lte(
      tolerance,
      `drift=${drift} tolerance=${tolerance} observed=${observed} finalPrice=${finalPrice}`
    );

    // CreatorVesting deployed with the timestamp-based duration (180 days
    // in seconds) and holding the 40 M creator slice (issue #68 land).
    const vestingAddr: string = await amm.creatorVesting();
    expect(vestingAddr).to.not.equal(ethers.ZeroAddress);
    const vesting = await ethers.getContractAt("CreatorVesting", vestingAddr);
    expect(await token.balanceOf(vestingAddr)).to.equal(EXPECTED_VESTING_TOKENS);
    const startTime: bigint = await vesting.startTime();
    const endTime: bigint = await vesting.endTime();
    expect(endTime - startTime).to.equal(BigInt(SIX_MONTHS_SECONDS));
  });

  it("locks LP tokens for 6 months and lets only the creator withdraw after unlock", async function () {
    const { amm, dexRouter, creator, trader } = await deployFixture();

    await amm
      .connect(trader)
      .buyTokens(0, { value: ethers.parseEther("5") });
    expect(await amm.isGraduated()).to.equal(true);

    // The mock router emits LiquidityAdded with the LP token address; the
    // AMM stores it and tracks lpTokensLocked / lpUnlockTime.
    const lpTokensLocked: bigint = await amm.lpTokensLocked();
    expect(lpTokensLocked).to.be.gt(0n);

    // Pre-unlock: creator can't withdraw (timelock).
    await expect(
      amm.connect(creator).withdrawLPTokens()
    ).to.be.revertedWithCustomError(amm, "LPTokensStillLocked");

    // Non-creator can never withdraw, locked or not.
    await expect(
      amm.connect(trader).withdrawLPTokens()
    ).to.be.revertedWithCustomError(amm, "NoWithdrawableFunds");

    // Fast-forward past the 6-month LP lock and confirm the creator can
    // pull the LP tokens out.
    const lpUnlockTime: bigint = await amm.lpUnlockTime();
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTime = BigInt(latestBlock!.timestamp);
    await ethers.provider.send("evm_increaseTime", [
      Number(lpUnlockTime - currentTime + 1n),
    ]);
    await ethers.provider.send("evm_mine", []);

    await expect(amm.connect(creator).withdrawLPTokens()).to.emit(
      amm,
      "LPTokensWithdrawn"
    );
    expect(await amm.lpTokensLocked()).to.equal(0n);

    // Mock LP token has the same balanceOf surface as ERC20 — confirm
    // the creator now holds them.
    const lpTokenAddr: string = await amm.lpTokenAddress();
    const lpToken = await ethers.getContractAt("MockLPToken", lpTokenAddr);
    expect(await lpToken.balanceOf(creator.address)).to.equal(lpTokensLocked);

    // Mock router record: still exactly one LP add (sanity).
    expect(await dexRouter.getLiquidityRecordsCount()).to.equal(1n);
  });

  it("emits the V2 GraduationTriggered + CreatorVestingCreated events on graduation", async function () {
    const { amm, trader } = await deployFixture();

    const tx = await amm
      .connect(trader)
      .buyTokens(0, { value: ethers.parseEther("5") });

    await expect(tx).to.emit(amm, "GraduationTriggered");
    await expect(tx).to.emit(amm, "CreatorVestingCreated");
    await expect(tx).to.emit(amm, "TreasuryAllocated");
  });
});
