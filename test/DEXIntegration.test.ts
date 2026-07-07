import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Current-API DEX integration coverage. The V1 suite here tested a removed
// constructor (basePrice/slope/linear curve) and removed functions
// (calculateNativeIn, lpPositionTokenId) — graduation/split/LP-price coverage
// now lives in Graduation.test.ts. This file keeps the coverage unique to it:
// LP-token locking (anti-rug) and the post-graduation trading guard.

const PRECISION = 1_000_000_000_000_000_000n;
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;
const LP_LOCK_DURATION = 180 * 24 * 60 * 60; // 180 days, matches contract

// Deploy an AMM and drive it straight to graduation (buying 100 native is
// clamped to the exact remaining curve and graduates in one tx). Mirrors
// Graduation.test.ts so the fixtures stay consistent.
async function graduatedFixture() {
  const [creator, trader, other, , treasury] = await ethers.getSigners();

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
  const token = await KRC20Token.deploy("DEX Test", "DEX", TOTAL_SUPPLY, creator.address);
  await token.waitForDeployment();

  const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveAMM.deploy(
    await token.getAddress(),
    creator.address, // tokenCreator
    treasury.address, // feeRecipient
    0,
    await dexRouter.getAddress(),
    60,
    ethers.ZeroAddress
  );
  await amm.waitForDeployment();
  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  // Skip the sniper window, then graduate.
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);
  await amm.connect(trader).buyTokens(0, { value: ethers.parseEther("100") });

  return { amm, token, dexRouter, creator, trader, other };
}

describe("DEX Integration — LP locking & post-graduation guards", function () {
  describe("LP token locking (anti-rug)", function () {
    it("locks LP tokens for 180 days on graduation", async function () {
      const { amm } = await graduatedFixture();
      expect(await amm.isGraduated()).to.equal(true);
      expect(await amm.lpTokensLocked()).to.be.gt(0n);

      const latest = await ethers.provider.getBlock("latest");
      const now = BigInt(latest!.timestamp);
      const unlock = await amm.lpUnlockTime();
      // Unlock is ~180 days out (allow a few seconds of block drift).
      expect(unlock).to.be.closeTo(now + BigInt(LP_LOCK_DURATION), 10n);
      expect(await amm.lpTokenAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("prevents LP withdrawal before the lock expires", async function () {
      const { amm, creator } = await graduatedFixture();
      await expect(
        amm.connect(creator).withdrawLPTokens()
      ).to.be.revertedWithCustomError(amm, "LPTokensStillLocked");
    });

    it("only the creator can withdraw LP tokens", async function () {
      const { amm, other } = await graduatedFixture();
      await ethers.provider.send("evm_increaseTime", [LP_LOCK_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        amm.connect(other).withdrawLPTokens()
      ).to.be.revertedWithCustomError(amm, "NoWithdrawableFunds");
    });

    it("lets the creator withdraw the locked LP after the lock expires", async function () {
      const { amm, creator } = await graduatedFixture();
      const locked = await amm.lpTokensLocked();
      const lpToken = await ethers.getContractAt("MockLPToken", await amm.lpTokenAddress());
      const before = await lpToken.balanceOf(creator.address);

      await ethers.provider.send("evm_increaseTime", [LP_LOCK_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(amm.connect(creator).withdrawLPTokens())
        .to.emit(amm, "LPTokensWithdrawn")
        .withArgs(creator.address, locked, await amm.lpTokenAddress());

      expect((await lpToken.balanceOf(creator.address)) - before).to.equal(locked);
      expect(await amm.lpTokensLocked()).to.equal(0n);
    });
  });

  describe("post-graduation trading guard", function () {
    it("reverts buys and sells once graduated", async function () {
      const { amm, token, trader, other } = await graduatedFixture();

      await expect(
        amm.connect(other).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(amm, "AlreadyGraduated");

      const traderBalance = await token.balanceOf(trader.address);
      await token.connect(trader).approve(await amm.getAddress(), traderBalance);
      await expect(
        amm.connect(trader).sellTokens(traderBalance, 0)
      ).to.be.revertedWithCustomError(amm, "AlreadyGraduated");
    });
  });

  describe("router configuration", function () {
    it("exposes the configured DEX router", async function () {
      const { amm, dexRouter } = await graduatedFixture();
      expect(await amm.dexRouter()).to.equal(await dexRouter.getAddress());
    });
  });
});
