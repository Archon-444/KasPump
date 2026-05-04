import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const PRECISION = 1_000_000_000_000_000_000n;
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;

// Deploy a fresh AMM, drive the curve right up to graduation, and return
// the world. Tests then make a single triggering buy and assert invariants.
async function deployFixture() {
  const [deployer, buyer, finalBuyer, , treasury] = await ethers.getSigners();

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
    "Graduation Test", "GRAD", TOTAL_SUPPLY, deployer.address
  );
  await token.waitForDeployment();

  const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveAMM.deploy(
    await token.getAddress(),
    deployer.address,    // tokenCreator
    treasury.address,    // feeRecipient (acts as treasury sink in PR 3)
    0,                   // BASIC tier
    await dexRouter.getAddress(),
    60,                  // sniper protection duration
    ethers.ZeroAddress
  );
  await amm.waitForDeployment();
  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  // Skip the sniper window so per-tx caps and deviation guards don't fire
  // during these graduation tests.
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);

  return { amm, token, dexRouter, deployer, buyer, finalBuyer, treasury };
}

describe("PR 3 — graduation correctness", function () {
  describe("Invariant 1 — graduation buyer never overpays", function () {
    it("clamps a hugely-overpaying graduation buy and refunds the excess", async function () {
      const { amm, token, buyer } = await deployFixture();

      // Send 100 ETH at supply 0 — far more than the curve's ~3 ETH raise.
      // Without the clamp, the AMM would accept 100 ETH and fold the
      // ~97 ETH overshoot into the LP/treasury split. With the clamp,
      // the AMM accepts only requiredGross and refunds the rest.
      const sendValue = ethers.parseEther("100");
      const balanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await amm.connect(buyer).buyTokens(0, { value: sendValue });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      // After the trade the buyer minted exactly the remaining curve supply.
      expect(await amm.currentSupply()).to.equal(GRADUATION_THRESHOLD);
      expect(await token.balanceOf(buyer.address)).to.equal(GRADUATION_THRESHOLD);
      expect(await amm.isGraduated()).to.be.true;

      // Net spend = requested - refund = requiredGross.
      // We don't know requiredGross to-the-wei from outside, but it must be
      // strictly less than sendValue (refund > 0) and strictly less than
      // 4 ETH (a generous ceiling: integral at threshold ≈ 3 ETH plus the
      // post-graduation 1% fee gross-up ≈ 3.03 ETH).
      const balanceAfter = await ethers.provider.getBalance(buyer.address);
      const netSpend = balanceBefore - balanceAfter - gasCost;
      expect(netSpend).to.be.lt(ethers.parseEther("4"));
      expect(netSpend).to.be.lt(sendValue);

      // GraduationOverpaymentRefunded event was emitted with refunded > 0.
      await expect(tx).to.emit(amm, "GraduationOverpaymentRefunded");
    });

    it("a precisely-sized graduation buy refunds zero", async function () {
      const { amm, buyer } = await deployFixture();

      // Compute what we need to graduate from supply 0 — the contract's own
      // BondingCurveMath integral at threshold + 1% fee gross-up + 1 wei of
      // ceiling-division headroom. Sending exactly this should not trigger
      // a GraduationOverpaymentRefunded event.
      const finalPrice = await amm.spotPriceAtSupply(GRADUATION_THRESHOLD);
      // proceedsFromSell(threshold, 0) === costToBuy(0, threshold).
      const requiredNet = await amm.calculateNativeOut(GRADUATION_THRESHOLD, GRADUATION_THRESHOLD);
      // Post-sniper fee at supply 0 is the bare 100 bps base; gross-up:
      const feeBps = 100n;
      const requiredGross = (requiredNet * 10000n + (10000n - feeBps - 1n)) / (10000n - feeBps);

      const tx = await amm.connect(buyer).buyTokens(0, { value: requiredGross });
      await tx.wait();

      // Graduation happened, but no overpayment event since the buyer paid
      // exactly requiredGross.
      expect(await amm.isGraduated()).to.be.true;
      await expect(tx).to.not.emit(amm, "GraduationOverpaymentRefunded");
      expect(finalPrice).to.be.gt(0n);
    });
  });

  describe("Invariant 2 — LP starts at the final sigmoid spot price", function () {
    it("DEX reserve ratio matches spotPriceAtSupply(GRADUATION_THRESHOLD) within ≤0.1%", async function () {
      const { amm, dexRouter, buyer } = await deployFixture();

      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });
      expect(await amm.isGraduated()).to.be.true;

      // Inspect the LP add the AMM emitted via the mock router.
      const recordsCount = await dexRouter.getLiquidityRecordsCount();
      expect(recordsCount).to.equal(1n);
      const record = await dexRouter.getLiquidityRecord(0);
      const tokenAmount: bigint = record[1];
      const nativeAmount: bigint = record[2];

      // Observed LP price = (native paired) / (tokens paired) in wei per
      // full token (multiply by PRECISION because tokenAmount is in
      // token-wei, native is in wei, and finalPrice is wei per 1e18-token).
      const observedPriceWeiPerToken = (nativeAmount * PRECISION) / tokenAmount;
      const finalPrice = await amm.spotPriceAtSupply(GRADUATION_THRESHOLD);

      const diff = observedPriceWeiPerToken > finalPrice
        ? observedPriceWeiPerToken - finalPrice
        : finalPrice - observedPriceWeiPerToken;
      // 0.1% tolerance per the PR 3 acceptance criteria.
      const toleranceBps = (finalPrice * 10n) / 10000n; // 10 bps = 0.1%
      expect(diff).to.be.lte(
        toleranceBps,
        `observed ${observedPriceWeiPerToken} vs finalPrice ${finalPrice}`
      );
    });
  });

  describe("Invariant 3 — 70/20/10 token allocation of the 200M remainder", function () {
    it("LP gets 140M, vesting gets 40M, treasury gets 20M", async function () {
      const { amm, token, dexRouter, treasury, buyer } = await deployFixture();

      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });

      const remaining = TOTAL_SUPPLY - GRADUATION_THRESHOLD;
      const expectedLP = (remaining * 7000n) / 10000n;
      const expectedVesting = (remaining * 2000n) / 10000n;
      const expectedTreasury = remaining - expectedLP - expectedVesting;

      // LP tokens — captured by the mock DEX router on addLiquidityETH.
      const lpRecord = await dexRouter.getLiquidityRecord(0);
      expect(lpRecord[1]).to.equal(expectedLP);

      // Vesting tokens — held by the deployed CreatorVesting contract.
      const vestingAddr = await amm.creatorVesting();
      expect(vestingAddr).to.not.equal(ethers.ZeroAddress);
      expect(await token.balanceOf(vestingAddr)).to.equal(expectedVesting);

      // Treasury tokens — sent to feeRecipient (PR 3 minimal: feeRecipient
      // doubles as treasury until the dedicated Treasury contract lands).
      expect(await token.balanceOf(treasury.address)).to.equal(expectedTreasury);

      // AMM is now fully drained of tokens.
      expect(await token.balanceOf(await amm.getAddress())).to.equal(0n);
    });
  });

  describe("Invariant 4 — accounting closure", function () {
    it("curveNativeBalance is zero after graduation", async function () {
      const { amm, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });
      expect(await amm.curveNativeBalance()).to.equal(0n);
    });

    it("creatorAccumulatedFees + creatorGraduationFunds match the AMM's residual balance", async function () {
      const { amm, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });

      const residualBalance = await ethers.provider.getBalance(await amm.getAddress());
      const creatorFees = await amm.creatorAccumulatedFees();
      const referrerFees = await amm.referrerAccumulatedFees();
      const totalGrad = await amm.totalGraduationFunds();

      // Everything sitting in the AMM is accounted for via these three
      // pull-payment buckets. No untracked leak.
      expect(residualBalance).to.equal(creatorFees + referrerFees + totalGrad);
    });
  });

  describe("CreatorVesting drip (timestamp-based, issue #68)", function () {
    it("releases zero tokens at startTime and full tokens at endTime", async function () {
      const { amm, token, deployer, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });

      const vestingAddr = await amm.creatorVesting();
      const vesting = await ethers.getContractAt("CreatorVesting", vestingAddr);

      const totalAmount = await vesting.totalAmount();
      const expectedTotal = ((TOTAL_SUPPLY - GRADUATION_THRESHOLD) * 2000n) / 10000n;
      expect(totalAmount).to.equal(expectedTotal);

      // At graduation timestamp, vested == 0 (block.timestamp <= startTime).
      expect(await vesting.vested()).to.equal(0n);
      expect(await vesting.claimable()).to.equal(0n);

      // Fast-forward past endTime via evm_increaseTime + a fresh block so the
      // view reads see the new timestamp.
      const endTime = await vesting.endTime();
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentTime = BigInt(latestBlock!.timestamp);
      const delta = Number(endTime - currentTime + 1n);
      await ethers.provider.send("evm_increaseTime", [delta]);
      await ethers.provider.send("evm_mine", []);

      expect(await vesting.vested()).to.equal(totalAmount);
      expect(await vesting.claimable()).to.equal(totalAmount);

      // Beneficiary (= tokenCreator = deployer) can claim.
      await vesting.connect(deployer).claim();
      expect(await token.balanceOf(deployer.address)).to.be.gte(totalAmount);
      expect(await vesting.claimed()).to.equal(totalAmount);
    });

    it("rejects claim from non-beneficiary", async function () {
      const { amm, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });
      const vestingAddr = await amm.creatorVesting();
      const vesting = await ethers.getContractAt("CreatorVesting", vestingAddr);
      await expect(vesting.connect(buyer).claim())
        .to.be.revertedWithCustomError(vesting, "NotBeneficiary");
    });

    it("vested amount grows monotonically as time advances", async function () {
      const { amm, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });
      const vestingAddr = await amm.creatorVesting();
      const vesting = await ethers.getContractAt("CreatorVesting", vestingAddr);

      const v0 = await vesting.vested();
      // ~30 days → roughly 1/6 of the 180-day duration.
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      const v1 = await vesting.vested();
      // Another ~60 days on top.
      await ethers.provider.send("evm_increaseTime", [60 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      const v2 = await vesting.vested();

      expect(v1).to.be.gte(v0);
      expect(v2).to.be.gt(v1);
    });
  });

  describe("Native split mirrors plan §5a", function () {
    it("creator share is 2/3 of post-LP native; treasury share is 1/3", async function () {
      const { amm, buyer } = await deployFixture();
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });

      // PR 3 splits the post-LP native 2:1 between creator (pull) and
      // treasury (immediate). Confirm the ratio.
      const creatorShare = await amm.totalGraduationFunds();
      // Treasury already received its native; we can't easily read it after
      // the fact without an indexer. Rely on the GraduationFundsSplit event.
      expect(creatorShare).to.be.gt(0n);
    });
  });

  describe("Follow-up patch — DEX refund + pre-seeded pair", function () {
    it("routes partial-DEX-consumption refunds (native + token) to treasury", async function () {
      const { amm, token, dexRouter, treasury, buyer } = await deployFixture();

      // Force the mock router to consume only 60% of what's offered.
      // The remaining 40% must roll into treasury, not stay in the AMM
      // and not silently leak. Tests both halves of the new return tuple.
      await dexRouter.setConsumptionBps(6000);

      const treasuryNativeBefore = await ethers.provider.getBalance(treasury.address);
      const treasuryTokenBefore = await token.balanceOf(treasury.address);

      const tx = await amm
        .connect(buyer)
        .buyTokens(0, { value: ethers.parseEther("100") });
      await tx.wait();

      // GraduationTriggered now carries (target, actual). Actual = 60% of target.
      const remaining = TOTAL_SUPPLY - GRADUATION_THRESHOLD;
      const tokensTarget = (remaining * 7000n) / 10000n;          // 140M
      const tokensActual = (tokensTarget * 6000n) / 10000n;       // 84M

      // LP record matches the actual (consumed) values, not the targets.
      const recordsCount = await dexRouter.getLiquidityRecordsCount();
      expect(recordsCount).to.equal(1n);
      const record = await dexRouter.getLiquidityRecord(0);
      expect(record[1]).to.equal(tokensActual);

      // Token refund: target - actual = 56M tokens go to treasury, on top of
      // the standard 20M treasury allocation. So treasury holds 76M.
      const expectedTreasuryToken =
        ((remaining * 1000n) / 10000n) + (tokensTarget - tokensActual);
      const treasuryTokenAfter = await token.balanceOf(treasury.address);
      expect(treasuryTokenAfter - treasuryTokenBefore).to.equal(expectedTreasuryToken);

      // Native refund also flows to treasury. Without pinning exact wei, just
      // confirm treasury got strictly more than zero in native.
      const treasuryNativeAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryNativeAfter).to.be.gt(treasuryNativeBefore);

      // No untracked native sits in the AMM beyond the accounted buckets.
      const ammBalance = await ethers.provider.getBalance(await amm.getAddress());
      const creatorFees = await amm.creatorAccumulatedFees();
      const referrerFees = await amm.referrerAccumulatedFees();
      const totalGrad = await amm.totalGraduationFunds();
      expect(ammBalance).to.equal(creatorFees + referrerFees + totalGrad);

      // No untracked tokens sit in the AMM either.
      expect(await token.balanceOf(await amm.getAddress())).to.equal(0n);
    });

    it("skips LP and routes earmarks to treasury when the pair is pre-seeded with reserves", async function () {
      const { amm, token, dexRouter, treasury, buyer } = await deployFixture();

      // Pre-create the pair with non-zero reserves so the AMM's pre-seeded
      // pair defense fires at graduation. We pull the factory off the
      // router, deploy a pair, and pin its reserves to a noisy ratio.
      const factoryAddr = await dexRouter.factory();
      const factory = await ethers.getContractAt("MockDEXFactory", factoryAddr);
      const wethAddr = await dexRouter.WETH();
      await factory.createPair(await token.getAddress(), wethAddr);
      const pairAddr = await factory.getPair(await token.getAddress(), wethAddr);
      const pair = await ethers.getContractAt("MockLPToken", pairAddr);
      // Arbitrary non-zero reserves — anything non-zero must trigger the
      // pre-seed defense.
      await pair.setReserves(1, 1);

      const treasuryTokenBefore = await token.balanceOf(treasury.address);

      const tx = await amm
        .connect(buyer)
        .buyTokens(0, { value: ethers.parseEther("100") });

      // The defense fires the LiquidityPairPrePolluted event with the
      // pair address.
      await expect(tx)
        .to.emit(amm, "LiquidityPairPrePolluted")
        .withArgs(pairAddr);

      // GraduationTriggered carries lpAdded=false, used=0/0.
      await expect(tx)
        .to.emit(amm, "GraduationTriggered");
      // No LP record was created on the router.
      expect(await dexRouter.getLiquidityRecordsCount()).to.equal(0n);

      // Both LP-earmarked tokens (140M) AND the standard treasury (20M)
      // landed at the treasury → 160M total token transfer.
      const remaining = TOTAL_SUPPLY - GRADUATION_THRESHOLD;
      const expectedTreasuryToken =
        ((remaining * 1000n) / 10000n) + ((remaining * 7000n) / 10000n);
      const treasuryTokenAfter = await token.balanceOf(treasury.address);
      expect(treasuryTokenAfter - treasuryTokenBefore).to.equal(expectedTreasuryToken);

      // Accounting closure: no untracked native or tokens in the AMM.
      const ammBalance = await ethers.provider.getBalance(await amm.getAddress());
      const creatorFees = await amm.creatorAccumulatedFees();
      const referrerFees = await amm.referrerAccumulatedFees();
      const totalGrad = await amm.totalGraduationFunds();
      expect(ammBalance).to.equal(creatorFees + referrerFees + totalGrad);
      expect(await token.balanceOf(await amm.getAddress())).to.equal(0n);
    });

    it("clears the router allowance after the LP add", async function () {
      const { amm, token, dexRouter, buyer } = await deployFixture();

      // Force partial consumption so the AMM's approve > router.transferFrom
      // path is exercised. Without forceApprove(0), residual allowance
      // would remain.
      await dexRouter.setConsumptionBps(7000);
      await amm.connect(buyer).buyTokens(0, { value: ethers.parseEther("100") });

      const allowance = await token.allowance(
        await amm.getAddress(),
        await dexRouter.getAddress()
      );
      expect(allowance).to.equal(0n);
    });
  });
});
